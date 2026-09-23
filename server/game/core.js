'use strict';
/* Сервер игры «Духолов»: все действия игрока выполняются здесь, а не на телефоне.
   Телефон присылает намерение («бросил оберег», «зачерпнул родник», «усилил духа»), сервер проверяет его
   (расстояние до объекта, перезарядки, предметы в сумке, правдоподобие боя), сам бросает кубики
   и сохраняет результат. В ответ — изменения прогресса (diff.js) и события для окон и подсказок.
   Файл работает и в браузере (автотесты), и в Edge Function (см. build-server.ps1). */

class GameError extends Error {}

const GameCore = {
  MIN_CLIENT: '3.0.0',
  POI_ID: /^(osm:[nwr]\d{1,15}|usr:[0-9a-f-]{36})$/,
  PID: /^[a-z0-9]{8,40}$/,
  STARTERS: ['ugolek', 'kapelka', 'mshonok'],

  fail(msg) { throw new GameError(msg); },
  need(cond, msg) { if (!cond) this.fail(msg); },

  /* ---------- запуск запроса ----------
     req:  { a: [{ type, args }], tz, wx, pos: { lat, lng, acc }, v }
     save: { data, srv } — прогресс и служебные данные сервера (сессии встреч и боёв, позиция, лимиты)
     env:  доступ к общим таблицам (места, друзья, подарки, обмен, Лига) — см. serve.js / тесты */
  async run(req, save, env) {
    const ctx = { now: Date.now(), env, srv: JSON.parse(JSON.stringify(save.srv || {})), events: [], results: [], after: [], full: false, reset: false };
    const saved = { emit: Bus.emit, save: S.save, d: S.d, tz: U.tz, skew: U.skew, w: Sky.w, pos: MapView.pos };
    try {
      U.tz = Number.isFinite(+req.tz) ? U.clamp(Math.round(+req.tz), -840, 840) : 0;
      U.skew = 0;
      Sky.w = req.wx && WEATHER[req.wx] ? { key: req.wx } : null;
      const p = req.pos;
      ctx.pos = p && Number.isFinite(+p.lat) && Number.isFinite(+p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180
        ? { lat: +p.lat, lng: +p.lng, acc: U.clamp(+p.acc || 30, 1, 5000) } : null;
      MapView.pos = ctx.pos;
      Bus.emit = (ev, data) => ctx.events.push([ev, this.ser(ev, data)]);
      S.save = () => {};
      S.d = save.data ? JSON.parse(JSON.stringify(save.data)) : null;
      if (S.d) { S.migrate(); S.ensureQuests(); W.prune(); }
      this.track(ctx);

      const actions = Array.isArray(req.a) ? req.a.slice(0, 5) : [];
      this.need(actions.length, 'Пустой запрос');
      const stats0 = S.d ? JSON.parse(JSON.stringify(S.d.stats)) : null;
      for (const a of actions) {
        const h = this.H[a && a.type];
        this.need(h, 'Неизвестное действие');
        if (!['newGame', 'load'].includes(a.type)) this.need(S.d, 'Прогресс не найден');
        ctx.results.push(await h.call(this, a.args || {}, ctx));
      }
      if (S.d && stats0) this.orderAdd(ctx, Rules.orderPoints(stats0, S.d.stats, Ev.cur));
      if (S.d) { S.checkMedals(); S.ensureQuests(); }
      return { ok: true, data: S.d, srv: ctx.srv, results: ctx.results, events: ctx.events, after: ctx.after, full: ctx.full, reset: ctx.reset, now: ctx.now };
    } catch (e) {
      if (e instanceof GameError) return { ok: false, error: e.message };
      throw e;
    } finally {
      Bus.emit = saved.emit; S.save = saved.save; S.d = saved.d; U.tz = saved.tz; U.skew = saved.skew; Sky.w = saved.w; MapView.pos = saved.pos;
    }
  },
  // события — в виде, пригодном для JSON
  ser(ev, data) {
    if (ev === 'medal') return { m: data.m.id, tier: data.tier };
    return data === undefined ? null : JSON.parse(JSON.stringify(data));
  },

  /* ---------- проверки ---------- */
  // Позиция игрока: скачок быстрее ~200 км/ч включает паузу для действий на карте
  track(ctx) {
    const p = ctx.pos, last = ctx.srv.pos;
    if (!p) return;
    if (last && ctx.now - last.t < 10 * 60000) {
      const v = U.dist(last.lat, last.lng, p.lat, p.lng) / Math.max(1, (ctx.now - last.t) / 1000);
      if (v > 60 && U.dist(last.lat, last.lng, p.lat, p.lng) > 300) ctx.srv.fastUntil = ctx.now + 60000;
    }
    ctx.srv.pos = { lat: p.lat, lng: p.lng, t: ctx.now };
  },
  here(ctx) {
    this.need(ctx.pos, 'Нет данных о местоположении — включи GPS');
    this.need(!(ctx.srv.fastUntil > ctx.now), 'Похоже, GPS скачет — подожди минуту');
    return ctx.pos;
  },
  near(ctx, lat, lng, max) {
    const p = this.here(ctx), d = U.dist(p.lat, p.lng, lat, lng);
    this.need(d <= max + Math.min(p.acc, 30) + 10, 'Слишком далеко — подойди ближе');
    return d;
  },
  limit(ctx, key, max, windowMs) {
    const rl = ctx.srv.rl = ctx.srv.rl || {}, r = rl[key];
    if (!r || ctx.now - r[1] > windowMs) { rl[key] = [1, ctx.now]; return; }
    this.need(r[0] < max, 'Слишком часто — передохни немного');
    r[0]++;
  },
  spirit(uid) { const sp = S.findSpirit(String(uid)); this.need(sp, 'Дух не найден'); return sp; },
  // Объект карты из запроса. Места игроков и правки модераторов сверяются с сервером.
  async place(a, ctx, kind) {
    const p = a && typeof a === 'object' ? a : {};
    this.need(this.POI_ID.test(String(p.id)) && Number.isFinite(+p.lat) && Number.isFinite(+p.lng), 'Неизвестное место');
    const row = await ctx.env.poi(p.id);
    if (row) {
      this.need(row.active !== false, 'Этого места больше нет на карте');
      this.need(!kind || row.kind === kind, 'Здесь нет такого объекта');
      return { id: row.id, lat: row.lat, lng: row.lng, name: row.name, photo: row.photo || null };
    }
    this.need(p.id.startsWith('osm:'), 'Место не найдено');
    // там, где места загружены из OpenStreetMap в базу (вся Россия), других объектов нет
    this.need(!(await ctx.env.poiCovered(+p.lat, +p.lng)), 'Этого места нет на карте — обнови игру');
    return { id: p.id, lat: +p.lat, lng: +p.lng, name: String(p.name || 'Место').slice(0, 80), photo: null };
  },
  team(uids) { return (uids || []).map(u => S.findSpirit(u)).filter(Boolean); },
  battleTime(ctx, b) { return (ctx.now - b.start) / 1000 - Rules.COUNTDOWN; },
  endBattle(ctx, type) {
    const b = ctx.srv.battle;
    this.need(b && b.type === type, 'Бой не найден — начни его заново');
    ctx.srv.battle = null;
    return b;
  },
  // Одна встреча с духом за раз: вид, уровень и особенности — только с сервера
  openEnc(ctx, o) {
    const sp = S.makeSpirit(o.sid, o.lvl, o.seed + ':iv', { ivMin: o.mode === 'wild' ? 0 : 10 });
    if (o.shiny) sp.shiny = true;
    if (o.dark) sp.dark = true;
    ctx.srv.enc = { ...o, sp, throws: 0, honey: false, start: ctx.now };
    S.seen(o.sid);
    return { mode: o.mode, sid: o.sid, lvl: o.lvl, shiny: !!o.shiny, dark: !!o.dark, boost: !!o.boost, charms: o.charms || 0, power: S.power(sp) };
  },
  // Встреча закончилась без поимки: дух сбежал (text) или кончились обереги
  encLost(ctx, e, text, res) {
    if (e.spawnId && text) S.d.caught[e.spawnId] = ctx.now;
    if (text) J.add('flee', { sid: e.sid });
    ctx.srv.enc = null;
    return { ...res, fled: !!text, text, over: true };
  },
  // Победа засчитывается, если команда могла нанести столько урона за это время (или бой дошёл до таймера)
  plausibleDuel(ctx, b, foe) {
    const t = this.battleTime(ctx, b);
    this.need(t >= 5, 'Бой не засчитан: слишком быстрая победа');
    if (t >= Duel.TIME - 5) return;
    this.need(Rules.duelMaxDamage(this.team(b.team), foe, t) >= Rules.duelFoeHp(foe), 'Бой не засчитан: слишком быстрая победа');
  },
  friendPoint(f) {
    const lv = L => { let r = 0; FRIEND_LEVELS.forEach((x, i) => { if (L >= x.pts) r = i; }); return r; };
    const before = lv(f.pts);
    f.pts++;
    const after = lv(f.pts);
    if (after > before) {
      const L = FRIEND_LEVELS[after];
      S.addXP(L.xp);
      Bus.emit('toast', { text: `Дружба с ${f.name}: теперь «${L.name}»! +${U.fmtNum(L.xp * Ev.xpMul())} опыта`, cls: 'good' });
    }
  },

  // Общее дело Ордена: очки игрока за неделю; в общую таблицу — после сохранения прогресса
  orderAdd(ctx, pts) {
    if (!(pts > 0)) return;
    const w = Ev.week(ctx.now), O = S.d.order;
    const o = O[w] = O[w] || { n: 0, got: [] };
    o.n += pts;
    S.d.stats.orderPts += pts;
    Object.keys(O).forEach(k => { if (+k < w - 1) delete O[k]; }); // храним эту и прошлую неделю
    const row = { week: w, pid: S.d.pid, name: S.d.name, n: o.n };
    ctx.after.push(() => ctx.env.orderPut(row));
  },
  // Состояние недели w для экрана: общая сумма с учётом ещё не записанного вклада игрока
  async orderState(ctx, w) {
    const s = (await ctx.env.orderStats(w, S.d.pid)) || {};
    const mine = S.d.order[w] || { n: 0, got: [] }, dbMine = +s.mine || 0;
    const players = (+s.players || 0) + (mine.n > 0 && !(dbMine > 0) ? 1 : 0);
    const total = (+s.total || 0) - dbMine + mine.n;
    const top = (Array.isArray(s.top) ? s.top : []).map(r => ({ name: String(r.name || 'Ловчий').slice(0, 20), n: r.pid === S.d.pid ? mine.n : +r.n || 0, me: r.pid === S.d.pid }));
    return { week: w, total, players, goal: Rules.orderGoal(players), n: mine.n, got: mine.got.slice(), top, endsAt: ((w + 1) * 7 - 3) * 86400000 };
  },

  // Друг, который тоже добавил тебя: его запись у меня и его сохранение
  async mutual(ctx, pid, what) {
    const f = S.d.friends.find(x => x.id === pid);
    this.need(f, 'Такого друга нет');
    const s = await ctx.env.friendSave(f.id);
    this.need(s && s.data, 'Ловчий не найден');
    const d = s.data;
    this.need((d.friends || []).some(x => x.id === S.d.pid), `${what}, когда ${f.name} тоже добавит тебя в друзья`);
    return { f, d, s };
  },
  // Дух из чужого сохранения: только известные поля и допустимые значения
  cleanSpirit(x, i) {
    const iv = (Array.isArray(x.iv) ? x.iv : []).slice(0, 3).map(v => U.clamp(Math.floor(+v) || 0, 0, 15));
    while (iv.length < 3) iv.push(0);
    return { uid: 'foe' + i, sid: x.sid, lvl: U.clamp(Math.floor(+x.lvl) || 1, 1, 40), iv, shiny: !!x.shiny, dark: !!x.dark && !x.purified,
      purified: !!x.purified, move2: !!x.move2, amulet: AMULETS[x.amulet] ? x.amulet : null, nick: x.nick ? String(x.nick).slice(0, 16) : null };
  },
  // Три сильнейших духа друга
  topSpirits(d, n = 3) {
    const list = (Array.isArray(d.spirits) ? d.spirits : []).filter(x => x && SP[x.sid]).map((x, i) => this.cleanSpirit(x, i));
    return list.map(x => ({ x, p: S.power(x) })).sort((a, b) => b.p - a.p).slice(0, n).map(o => o.x);
  },

  /* ---------- действия ---------- */
  H: {
    async load(a, ctx) {
      ctx.full = true;
      if (!S.d) return { empty: true };
      const r = await ctx.env.registerPid(S.d.pid);
      if (r === 'taken') { S.d.pid = U.uid() + U.uid(); await ctx.env.registerPid(S.d.pid); }
      return { ok: true };
    },
    async newGame(a, ctx) {
      this.need(!S.d, 'Прогресс уже есть');
      const name = String(a.name || '').trim().replace(/\s+/g, ' ').slice(0, 16);
      this.need(name.length >= 1, 'Назови себя');
      this.need(this.STARTERS.includes(a.starter), 'Выбери первого духа');
      S.newGame(name, a.starter);
      await ctx.env.registerPid(S.d.pid);
      ctx.full = true;
      return { ok: true };
    },
    async reset(a, ctx) {
      await ctx.env.deleteSave();
      S.d = null; ctx.reset = true;
      return { ok: true };
    },
    tick() { return { ok: true }; },

    // Серия дней: первый вход за день (по часам игрока) — награда; пропуск дня начинает серию заново
    daily(a, ctx) {
      const st = S.d.streak, today = U.today(ctx.now);
      if (st.day === today) return { n: st.n, already: true };
      st.n = st.day === U.today(ctx.now - 86400000) ? st.n + 1 : 1;
      st.day = today;
      if (st.n > S.d.stats.streakBest) S.d.stats.streakBest = st.n;
      const i = (st.n - 1) % Rules.STREAK.length, got = S.giveRewards(Rules.STREAK[i]);
      if (i === Rules.STREAK.length - 1 && S.d.cocoons.length < 9) {
        S.d.cocoons.push({ id: U.uid(), km: 10, walked: 0, inc: S.incubating() < 3 });
        got.push({ k: 'cocoon', n: 1, label: 'Кокон 10 км' });
      }
      return { n: st.n, got };
    },

    // Общее дело Ордена: эта неделя и прошлая, если за неё осталась несобранная награда
    async order(a, ctx) {
      const w = Ev.week(ctx.now), cur = await this.orderState(ctx, w);
      const p = S.d.order[w - 1];
      const prev = p && Rules.ORDER.STEPS.some((s, i) => p.n >= s.need && !p.got.includes(i)) ? await this.orderState(ctx, w - 1) : null;
      return { cur, prev };
    },
    async orderClaim(a, ctx) {
      const w = a.week | 0, now = Ev.week(ctx.now), i = a.i | 0, step = Rules.ORDER.STEPS[i];
      this.need(step && (w === now || w === now - 1), 'Эта неделя уже закончилась');
      const mine = S.d.order[w];
      this.need(mine && mine.n >= step.need, `Для этой награды внеси в общее дело не меньше ${step.need} очков`);
      this.need(!mine.got.includes(i), 'Награда уже получена');
      const s = await this.orderState(ctx, w);
      this.need(s.total >= Math.ceil(step.at * s.goal), 'Орден ещё не дошёл до этой ступени');
      mine.got.push(i);
      const got = S.giveRewards(step.reward);
      if (i === Rules.ORDER.STEPS.length - 1 && S.d.cocoons.length < 9) {
        S.d.cocoons.push({ id: U.uid(), km: 10, walked: 0, inc: S.incubating() < 3 });
        got.push({ k: 'cocoon', n: 1, label: 'Кокон 10 км' });
      }
      J.add('order', { i });
      return { got };
    },

    // Пройденный путь: точки GPS с отметками времени. Быстрее 9 м/с (транспорт) не считается.
    move(a, ctx) {
      const pts = (Array.isArray(a.pts) ? a.pts : []).slice(0, 200)
        .filter(q => Array.isArray(q) && q.length >= 4 && [0, 1, 2, 3].every(i => Number.isFinite(+q[i])))
        .map(q => ({ lat: +q[0], lng: +q[1], t: +q[2], acc: +q[3] })).sort((x, y) => x.t - y.t);
      const last = ctx.srv.mv && ctx.now - ctx.srv.mv.t < 10 * 60000 ? ctx.srv.mv : null;
      let prev = last, m = 0;
      for (const q of pts) {
        if (q.acc > 40 || q.t > ctx.now + 5000 || (prev && q.t <= prev.t)) continue;
        if (!prev) { prev = q; continue; }
        const d = U.dist(prev.lat, prev.lng, q.lat, q.lng), dt = (q.t - prev.t) / 1000;
        if (d < 4) continue;
        if (dt > 0 && d / dt < 9) m += d;
        prev = q;
      }
      // не больше, чем можно пройти быстрым шагом с прошлой отметки
      const since = last ? (ctx.now - last.t) / 1000 : 60;
      m = Math.min(m, since * 9);
      if (prev) ctx.srv.mv = { lat: prev.lat, lng: prev.lng, t: Math.min(prev.t, ctx.now) };
      if (m > 0) S.addDistance(m);
      return { m };
    },

    /* ----- встреча с духом ----- */
    encStart(a, ctx) {
      const kind = a.kind;
      if (kind === 'wild') {
        this.need(Rules.THROWABLE.some(k => S.d.items[k] > 0), 'Обереги закончились! Загляни к роднику.');
        const p = this.here(ctx);
        const e = W.spawnsAround(p.lat, p.lng, W.INTERACT + 80).find(x => x.id === a.id && x.type === 'spirit' && !x.tut);
        this.need(e, 'Дух уже растворился в воздухе…');
        this.near(ctx, e.lat, e.lng, W.INTERACT);
        return this.openEnc(ctx, { mode: 'wild', sid: e.sid, lvl: e.lvl, shiny: e.shiny, boost: e.boost, seed: e.id, spawnId: e.id });
      }
      if (kind === 'tut') {
        this.need(S.d.tut === 1, 'Обучение уже пройдено');
        return this.openEnc(ctx, { mode: 'tut', sid: Tut.SID, lvl: 2, seed: 'tut' });
      }
      if (kind === 'raid') {
        const r = ctx.srv.raidWin;
        this.need(r, 'Разлом уже закрылся');
        ctx.srv.raidWin = null;
        return this.openEnc(ctx, { mode: 'raid', sid: r.sid, lvl: r.lvl, shiny: r.shiny, boost: r.boost, seed: r.rid, charms: r.charms });
      }
      if (kind === 'rescue') {
        const r = ctx.srv.rescue;
        this.need(r, 'Омрачённый дух уже ушёл');
        ctx.srv.rescue = null;
        return this.openEnc(ctx, { mode: 'rescue', sid: r.sid, lvl: r.lvl, dark: true, seed: r.seed });
      }
      if (kind === 'task') {
        const m = S.d.taskMeet.find(x => x.id === a.id);
        this.need(m, 'Встреча за поручение не найдена');
        return this.openEnc(ctx, { mode: 'task', sid: m.sid, lvl: m.lvl, seed: 'task:' + m.id, taskId: m.id });
      }
      if (kind === 'story') {
        this.need(S.d.storyGift && SP[S.d.storyGift], 'Встреча Летописи недоступна');
        return this.openEnc(ctx, { mode: 'story', sid: S.d.storyGift, lvl: 25, seed: 'gift' + S.d.created });
      }
      this.fail('Неизвестная встреча');
    },
    encHoney(a, ctx) {
      const e = ctx.srv.enc;
      this.need(e, 'Встреча закончилась');
      this.need(!e.honey, 'Дух уже лакомится мёдом');
      this.need(S.useItem('honey'), 'Мёда нет. Его можно найти у родников.');
      e.honey = true;
      return { ok: true };
    },
    // Бросок: попадание и кольцо — с телефона (это ловкость игрока), покачивания и побег — решает сервер
    encThrow(a, ctx) {
      const e = ctx.srv.enc;
      this.need(e, 'Встреча закончилась');
      const raid = e.mode === 'raid';
      let item = 'rift';
      if (raid) { this.need(e.charms > 0, 'Обереги разлома кончились'); e.charms--; }
      else {
        item = Rules.THROWABLE.includes(a.item) ? a.item : 'charm';
        this.need(S.useItem(item), 'Обереги этого вида закончились');
      }
      e.throws++;
      const left = () => raid ? e.charms : Rules.THROWABLE.reduce((n, k) => n + (S.d.items[k] || 0), 0);
      if (!a.hit) {
        if (!left()) return this.encLost(ctx, e, raid ? 'Обереги кончились — дух вернулся в Навь…' : null, { miss: true });
        return { miss: true, left: left() };
      }
      const bonus = Rules.ringBonus(a.ring);
      if (bonus.great) { S.progress('throw', 1); S.d.stats.throwsGreat++; }
      const chance = Rules.catchChance({ mode: e.mode, sid: e.sid, lvl: e.lvl, item, honey: e.honey, mul: bonus.mul });
      const q = Math.pow(chance, 1 / 3);
      e.honey = false;
      let wobbles = 0;
      while (wobbles < 3 && Math.random() < q) wobbles++;
      if (wobbles < 3) {
        const flee = e.mode !== 'wild' ? 0 : RARITY[SP[e.sid].rar].flee * (e.throws > 3 ? 1.5 : 1);
        if (Math.random() < flee) return this.encLost(ctx, e, 'Дух ускользнул в Навь…', { wobbles, label: bonus.label });
        if (!left()) return this.encLost(ctx, e, raid ? 'Обереги кончились — дух вернулся в Навь…' : null, { wobbles, label: bonus.label });
        return { wobbles, label: bonus.label, left: left() };
      }
      // пойман
      const sp = e.sp, s = SP[e.sid];
      if (e.spawnId) S.d.caught[e.spawnId] = ctx.now;
      const isNew = S.addSpirit(sp);
      J.add('catch', { sid: s.id, shiny: !!sp.shiny, dark: !!sp.dark, power: S.power(sp) });
      const rw = Rules.catchReward({ mode: e.mode, sid: e.sid, isNew, ringXp: bonus.xp, throws: e.throws, shiny: sp.shiny, boost: e.boost });
      S.addEssence(s.fam, rw.ess);
      S.d.sparks += rw.sparks;
      S.d.stats.caught++;
      S.addXP(rw.xp);
      S.progress('catch', 1); S.progress('catchEl', 1, { el: s.el });
      if (e.mode === 'tut' && S.d.tut === 1) S.d.tut = 2;
      if (e.mode === 'story') S.d.storyGift = null;
      if (e.mode === 'task') S.d.taskMeet = S.d.taskMeet.filter(x => x.id !== e.taskId); // сбежать не может — встреча ждёт, пока дух не пойман
      ctx.srv.enc = null;
      return { wobbles: 3, caught: true, label: bonus.label, uid: sp.uid, isNew, xp: Math.round(rw.xp * Ev.xpMul()), sparks: rw.sparks, ess: rw.ess };
    },
    encEnd(a, ctx) { ctx.srv.enc = null; return { ok: true }; },

    /* ----- родник ----- */
    async spring(a, ctx) {
      const p = await this.place(a.poi, ctx, 'spring');
      this.near(ctx, p.lat, p.lng, W.INTERACT);
      this.limit(ctx, 'spring', 60, 3600000);
      const e = W.springFor(p, 0);
      this.need(!e.invaded, 'Родник захвачен Навью');
      this.need(e.ready, 'Родник ещё набирает силу');
      S.d.springs[p.id] = ctx.now;
      const { loot, cocoon } = W.springLoot(p.id);
      const got = S.giveRewards({ ...loot, xp: 50 });
      S.d.stats.springs++;
      S.progress('spring', 1);
      let coc = null;
      if (cocoon) { coc = { id: U.uid(), km: cocoon, walked: 0, inc: S.incubating() < 3 }; S.d.cocoons.push(coc); }
      if (S.d.tut === 2) S.d.tut = 3;
      // поручение: первое за день — всегда, дальше — в каждом четвёртом роднике
      let task = null;
      if (!S.d.tut && S.d.tasks.length < TASK_LIMIT && (S.d.taskDay !== U.today(ctx.now) || Math.random() < 0.25)) {
        S.d.taskDay = U.today(ctx.now);
        task = S.makeTask();
        S.d.tasks.push(task);
      }
      return { got, cocoon: coc, task, full: S.bagCount() >= BAG_LIMIT };
    },
    incense(a, ctx) {
      this.need(!S.incenseActive(), 'Ладан ещё горит');
      this.need(S.useItem('incense'), 'Ладана нет');
      S.d.incenseUntil = ctx.now + 30 * 60000;
      return { until: S.d.incenseUntil };
    },
    supply(a, ctx) {
      this.need(S.d.supplyDay !== U.today(), 'Посылка сегодня уже была');
      S.d.supplyDay = U.today();
      return { got: S.giveRewards(Rules.SUPPLY) };
    },
    photo(a, ctx) { this.limit(ctx, 'photo', 20, 3600000); S.progress('photo', 1); return { ok: true }; },

    /* ----- коллекция ----- */
    fav(a) { const sp = this.spirit(a.uid); sp.fav = !!a.on; return { ok: true }; },
    nick(a) {
      const sp = this.spirit(a.uid), v = String(a.nick || '').trim().slice(0, 16);
      sp.nick = v && v !== SP[sp.sid].name ? v : null;
      return { ok: true };
    },
    release(a) {
      const uids = [...new Set((Array.isArray(a.uids) ? a.uids : [a.uid]).map(String))];
      uids.forEach(u => this.spirit(u));
      this.need(uids.length < S.d.spirits.length, 'Нельзя отпустить всех духов');
      uids.forEach(u => S.release(u));
      return { n: uids.length };
    },
    powerUp(a) { const sp = this.spirit(a.uid), err = S.canPowerUp(sp); this.need(!err, err); S.powerUp(sp); return { lvl: sp.lvl }; },
    evolve(a) {
      const sp = this.spirit(a.uid), err = S.canEvolve(sp); this.need(!err, err);
      const from = sp.sid, r = S.evolve(sp);
      return { from, to: sp.sid, isNew: r.isNew };
    },
    purify(a) { const sp = this.spirit(a.uid), err = S.canPurify(sp); this.need(!err, err); S.purify(sp); return { ok: true }; },
    move2(a) { const sp = this.spirit(a.uid), err = S.canLearnMove2(sp); this.need(!err, err); S.learnMove2(sp); return { ok: true }; },
    equip(a) {
      const sp = this.spirit(a.uid);
      this.need(AMULETS[a.k] && S.d.amulets[a.k] > 0, 'Такого амулета нет');
      S.equip(sp, a.k);
      return { ok: true };
    },
    unequip(a) { S.unequip(this.spirit(a.uid)); return { ok: true }; },
    buddy(a) { S.setBuddy(this.spirit(a.uid).uid); return { ok: true }; },
    team(a) {
      const uids = [...new Set((Array.isArray(a.uids) ? a.uids : []).map(String))].filter(u => S.findSpirit(u)).slice(0, 3);
      S.setTeam(uids);
      return { ok: true };
    },
    look(a) {
      const L = a.look || {}, lvl = S.d.level;
      const c = LOOK.cloak.find(x => x.c === L.cloak), e = LOOK.eyes.find(x => x.c === L.eyes), m = LOOK.emblem.find(x => x.id === L.emblem);
      this.need(c && e && m, 'Такого облика нет');
      this.need(c.lvl <= lvl && e.lvl <= lvl && m.lvl <= lvl, 'Этот облик ещё не открыт');
      this.need(!m.league || League.st().best >= m.league, 'Венец Лиги — награда за ранг «Хранитель Лиги»');
      this.need(!m.story || S.d.story.ch >= m.story, 'Эта эмблема — награда за вторую книгу Летописи');
      S.d.look = { cloak: c.c, eyes: e.c, emblem: m.id };
      return { ok: true };
    },

    /* ----- коконы ----- */
    warm(a) {
      const c = S.d.cocoons.find(x => x.id === a.id);
      this.need(c && !c.inc, 'Кокон не найден');
      this.need(S.incubating() < 3, 'Греть можно три кокона одновременно');
      c.inc = true;
      return { ok: true };
    },
    hatch(a) {
      const c = S.d.cocoons.find(x => x.id === a.id);
      this.need(c && c.inc && c.walked >= c.km, 'Кокон ещё не готов');
      const r = S.hatch(c);
      return { uid: r.sp.uid, sid: r.sp.sid, isNew: r.isNew, essence: r.essence, sparks: r.sparks, km: c.km };
    },

    /* ----- задания и Летопись ----- */
    questClaim(a) {
      const q = S.d.quests.list[a.i | 0];
      this.need(q && q.p >= q.n && !q.claimed, 'Задание ещё не выполнено');
      q.claimed = true;
      return { got: S.giveRewards({ ...q.reward, xp: 300 }) };
    },
    questBonus() {
      const Q = S.d.quests;
      this.need(Q.list.every(q => q.claimed) && !Q.bonus, 'Сундук ещё закрыт');
      Q.bonus = true;
      return { got: S.giveRewards({ ...Rules.QUEST_BONUS, xp: 1000 }) };
    },
    storyClaim() {
      const ch = S.d.story.ch, res = S.claimStory();
      this.need(res, 'Глава ещё не завершена');
      if (res.ch.gift) S.d.storyGift = res.ch.gift;
      J.add('story', { title: res.ch.title });
      return { ch, got: res.got };
    },
    // Поручение выполнено: предметы сразу, дух — во встрече (ждёт в «Заданиях», пока не пойман)
    taskClaim(a) {
      const q = S.d.tasks.find(x => x.id === a.id);
      this.need(q && q.p >= q.n, 'Поручение ещё не выполнено');
      this.need(S.d.taskMeet.length < TASK_LIMIT, 'Сначала встреть духов за прошлые поручения');
      S.d.tasks = S.d.tasks.filter(x => x !== q);
      const T = TASK_TIERS[q.tier];
      const got = S.giveRewards({ ...T.reward, xp: 250 * q.tier });
      const m = { id: q.id, sid: q.sid, lvl: Math.min(T.lvl, S.maxLvl()) };
      S.d.taskMeet.push(m);
      return { got, meet: m };
    },
    taskDrop(a) {
      const n = S.d.tasks.length;
      S.d.tasks = S.d.tasks.filter(x => x.id !== a.id);
      this.need(S.d.tasks.length < n, 'Поручение не найдено');
      return { ok: true };
    },
    tutFinish(a) {
      this.need(S.d.tut, 'Обучение уже пройдено');
      const done = !a.skip && S.d.tut === 3;
      S.d.tut = 0;
      return { got: done ? S.giveRewards(Rules.TUT_REWARD) : [] };
    },
    async placeRewards(a, ctx) {
      const rows = await ctx.env.mySubmissions();
      const out = [];
      rows.filter(r => r.status !== 'pending' && !S.d.props[r.id]).forEach(r => {
        S.d.props[r.id] = r.status;
        out.push({ name: r.name, status: r.status, reason: r.reason, got: r.status === 'approved' ? S.giveRewards(Rules.PLACE_REWARD) : [] });
      });
      return { list: out };
    },

    /* ----- бои: разлом ----- */
    async raidStart(a, ctx) {
      const coop = a.coop && typeof a.coop === 'object' ? { host: !!a.coop.host, allies: U.clamp(a.coop.allies | 0, 0, 3) } : null;
      const p = await this.place(a.rift, ctx, 'shrine');
      const hour = Math.floor(ctx.now / 3600000);
      // бой мог начаться за минуту до смены часа
      const r = W.riftFor(p, 0, hour) || (ctx.now % 3600000 < 90000 ? W.riftFor(p, 0, hour - 1) : null);
      this.need(r, 'Разлом уже закрылся');
      this.need(!S.d.rifts[r.id], 'Этот разлом ты уже закрыл');
      if (!coop || coop.host) this.near(ctx, p.lat, p.lng, W.BATTLE_R);
      const team = S.team();
      this.need(team.length, 'Нужна команда');
      this.limit(ctx, 'raid', 30, 3600000);
      ctx.srv.battle = { type: 'raid', rid: r.id, poi: p, tier: r.tier, boss: r.boss, start: ctx.now, team: team.map(x => x.uid), coop, waters: 0 };
      return { rid: r.id, tier: r.tier, boss: r.boss };
    },
    water(a, ctx) {
      const b = ctx.srv.battle;
      this.need(b && b.type === 'raid', 'Живая вода — только в бою');
      this.need(b.waters < 3, 'За бой можно выпить не больше 3 флаконов');
      this.need(S.useItem('water'), 'Живой воды нет');
      b.waters++;
      return { left: S.d.items.water || 0 };
    },
    raidEnd(a, ctx) {
      const b = this.endBattle(ctx, 'raid');
      if (!a.win) return { win: false };
      const t = Math.min(90, this.battleTime(ctx, b));
      const n = b.coop ? b.coop.allies + 1 : 1, hpMul = 1 + 0.8 * (n - 1);
      const need = Raid.TIER[b.tier].hp * hpMul / n;
      this.need(t >= 2 && Rules.raidMaxDamage(this.team(b.team), b, t) >= need, 'Бой не засчитан: слишком быстрая победа');
      S.d.rifts[b.rid] = true;
      const allies = b.coop ? b.coop.allies : 0, tier = b.tier;
      J.add('raid', { sid: b.boss, tier, coop: allies });
      S.d.stats.raids++;
      S.progress('raid', 1);
      const rw = S.giveRewards({ xp: Math.round(1000 * tier * (allies ? 1.25 : 1)), sparks: 400 * tier, charm: 5, honey: 2 + tier, water: 2, charm2: tier >= 2 ? 3 : 0 });
      const am = S.rollAmulet([0.25, 0.4, 0.7][tier - 1], b.rid);
      if (am) rw.push({ k: 'amulet', n: 1, label: AMULETS[am].name });
      const bonus = Math.max(0, Math.floor((90 - t) / 15));
      const charms = Raid.TIER[tier].charms + bonus + (Ev.cur.rifts ? 3 : 0) + allies * 2;
      const shiny = U.h('rshiny', b.rid, S.d.created) < Sky.shinyRate(1 / 20);
      ctx.srv.raidWin = { rid: b.rid, sid: b.boss, lvl: Raid.TIER[tier].lvl, charms, shiny, boost: Sky.boosted(SP[b.boss].el) };
      return { win: true, rw, charms, bonus, allies };
    },

    /* ----- бои: капище и вторжение ----- */
    async duelStart(a, ctx) {
      this.need(S.d.level >= 3, 'Капища открываются с 3 уровня Ловчего');
      const p = await this.place(a.shrine, ctx, 'shrine');
      this.need(!W.riftAt(p.id, Math.floor(ctx.now / 3600000)), 'Сейчас здесь открыт Разлом');
      const e = W.shrineFor(p, 0);
      this.need(!e.won, 'Сегодня ты уже победил здесь');
      this.near(ctx, p.lat, p.lng, W.BATTLE_R);
      const team = S.team();
      this.need(team.length, 'Нужна команда');
      this.limit(ctx, 'duel', 40, 3600000);
      ctx.srv.battle = { type: 'duel', id: e.id, tier: e.tier, name: e.name, start: ctx.now, team: team.map(x => x.uid) };
      return { id: e.id, tier: e.tier };
    },
    duelEnd(a, ctx) {
      const b = this.endBattle(ctx, 'duel');
      if (!a.win) return { win: false };
      const e = { id: b.id, tier: b.tier, name: b.name };
      this.plausibleDuel(ctx, b, W.guardian(e).team);
      const T = SHRINE_TIERS[e.tier], mul = Ev.duelMul(), t = e.tier;
      S.d.shrines[e.id] = U.today();
      J.add('duel', { name: e.name, guard: W.guardian(e).name, tier: t });
      S.d.stats.duels++;
      S.progress('duel', 1);
      const rw = S.giveRewards({ xp: T.xp * mul, sparks: T.sparks * mul, charm: 5 * mul, honey: t * mul, water: 2, charm2: t >= 2 ? 3 * mul : 0, charm3: t === 3 ? 2 * mul : 0 });
      const am = S.rollAmulet(0.15 * t, e.id);
      if (am) rw.push({ k: 'amulet', n: 1, label: AMULETS[am].name });
      return { win: true, rw };
    },
    async invStart(a, ctx) {
      const p = await this.place(a.spring, ctx, 'spring');
      const e = W.springFor(p, 0);
      this.need(e.invaded, 'Родник свободен');
      this.near(ctx, p.lat, p.lng, W.INTERACT);
      const team = S.team();
      this.need(team.length, 'Нужна команда');
      this.limit(ctx, 'inv', 40, 3600000);
      ctx.srv.battle = { type: 'inv', invId: e.invId, name: e.name, start: ctx.now, team: team.map(x => x.uid) };
      return { invId: e.invId };
    },
    invEnd(a, ctx) {
      const b = this.endBattle(ctx, 'inv');
      if (!a.win) return { win: false };
      const g = W.grunt({ invId: b.invId });
      this.plausibleDuel(ctx, b, g.team);
      S.d.freed[b.invId] = true;
      S.d.stats.invasions++;
      S.progress('invasion', 1);
      J.add('invasion', { name: b.name });
      const rw = S.giveRewards({ xp: 1000, sparks: 500, charm: 6, honey: 2, water: 2 });
      const am = S.rollAmulet(0.15, b.invId);
      if (am) rw.push({ k: 'amulet', n: 1, label: AMULETS[am].name });
      const rescue = g.team[Math.floor(U.h('rescue', b.invId) * g.team.length)];
      ctx.srv.rescue = { sid: rescue.sid, lvl: Math.min(rescue.lvl, S.maxLvl()), seed: b.invId + ':rescue' };
      return { win: true, rw, rescue: { sid: rescue.sid, lvl: ctx.srv.rescue.lvl } };
    },

    /* ----- Лига ----- */
    leagueStart(a, ctx) {
      const L = League.st(), team = S.team();
      this.need(S.d.level >= 5, 'Лига открывается с 5 уровня Ловчего');
      this.need(team.length === 3, 'Нужно три духа');
      this.need(L.tickets > 0, 'Жетоны кончились — приходи завтра');
      L.tickets--;
      L.run = { k: 0, won: 0, stars0: L.stars, rank0: League.rank(L.stars), seed: U.uid(), team: team.map(x => x.uid) };
      ctx.srv.battle = { type: 'league', k: 0, start: ctx.now, team: L.run.team };
      return { run: L.run };
    },
    leagueEnd(a, ctx) {
      const L = League.st(), run = L.run;
      this.need(run, 'Турнир не найден');
      const b = this.endBattle(ctx, 'league');
      this.need(b.k === run.k, 'Турнир не найден');
      const win = !!a.win;
      if (win) this.plausibleDuel(ctx, b, League.opponent(run.k).team);
      let gained = 0;
      if (win) { run.won++; gained++; S.progress('league', 1); }
      const last = !win || run.k >= 2;
      if (win && run.k === 2) gained++; // чистая победа
      L.stars += gained;
      const rNew = League.rank(L.stars), rewards = [];
      for (let i = 1; i <= rNew; i++) {
        if (L.got[i]) continue;
        L.got[i] = true;
        rewards.push(...S.giveRewards(LEAGUE_RANKS[i].reward));
        // на рангах 3, 6 и 9 — гарантированный амулет
        if (i % 3 === 0) { const am = S.rollAmulet(1, 'lg' + i); rewards.push({ k: 'amulet', n: 1, label: AMULETS[am].name }); }
      }
      if (rNew > L.best) L.best = rNew;
      S.addXP(win ? 400 + run.k * 200 : 100);
      const res = { win, gained, last, k: run.k, won: run.won, stars: L.stars, starsGot: L.stars - run.stars0, rNew, rank0: run.rank0, rewards };
      if (last) {
        J.add('league', { won: run.won, rank: LEAGUE_RANKS[rNew].name });
        L.run = null;
        if (a.board !== false) ctx.after.push(() => ctx.env.leagueScore({ season: L.season, name: S.d.name, stars: L.stars, rank: rNew, level: S.d.level, look: S.d.look }));
      } else {
        run.k++;
        ctx.srv.battle = { type: 'league', k: run.k, start: ctx.now, team: run.team };
      }
      return res;
    },

    /* ----- обмен духами ----- */
    async tradeGive(a, ctx) {
      const sp = this.spirit(a.uid);
      this.need(S.d.spirits.length > 1, 'Нельзя отдать последнего духа');
      this.limit(ctx, 'trade', 20, 86400000);
      if (sp.amulet) S.unequip(sp); // амулет остаётся у хозяина
      const code = Array.from({ length: 10 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
      await ctx.env.tradeCreate(code, S.d.pid, S.d.name, { s: sp.sid, l: sp.lvl, i: sp.iv, y: sp.shiny ? 1 : 0, d: sp.dark ? 1 : 0, n: sp.nick || '', p: sp.purified ? 1 : 0, m: sp.move2 ? 1 : 0 });
      S.d.spirits.splice(S.d.spirits.indexOf(sp), 1);
      if (S.d.buddy && S.d.buddy.uid === sp.uid) { S.d.buddy = null; Bus.emit('buddyChanged'); }
      S.d.team = S.d.team.filter(u => u !== sp.uid);
      S.d.sent.unshift({ code: 'DUH2.' + code, sid: sp.sid, shiny: !!sp.shiny, dark: !!sp.dark, t: ctx.now });
      S.d.sent = S.d.sent.slice(0, 20);
      S.d.stats.traded++;
      J.add('trade', { sid: sp.sid, dir: 'out' });
      return { code: 'DUH2.' + code };
    },
    async tradeReceive(a, ctx) {
      const m = String(a.code || '').toUpperCase().match(/DUH2\.([A-Z2-9]{10})/);
      this.need(m, /DUH1\./i.test(a.code || '') ? 'Это код старой версии игры — попроси друга упаковать духа заново' : 'Это не код посылки');
      const t = await ctx.env.tradeTake(m[1], S.d.pid);
      this.need(t, 'Посылка не найдена или её уже открыли');
      this.need(!t.own, 'Это твоя собственная посылка — отдай код другу');
      const p = t.spirit;
      this.need(SP[p.s], 'Посылка повреждена');
      const sp = { uid: U.uid(), sid: p.s, lvl: Math.min(p.l, S.maxLvl()), iv: p.i, t: ctx.now, fav: false, nick: p.n || null, from: String(t.from_name || '').slice(0, 20) };
      if (p.y) sp.shiny = true;
      if (p.d) sp.dark = true;
      if (p.p) sp.purified = true;
      if (p.m) sp.move2 = true;
      const isNew = S.addSpirit(sp);
      S.addEssence(SP[sp.sid].fam, 5);
      J.add('trade', { sid: sp.sid, dir: 'in', who: sp.from });
      S.d.stats.traded++;
      S.addXP(isNew ? 1000 : 300);
      return { uid: sp.uid, isNew };
    },

    /* ----- друзья и подарки ----- */
    async friendAdd(a, ctx) {
      const pid = String(a.pid || '');
      this.need(this.PID.test(pid), 'В коде ошибка');
      this.need(pid !== S.d.pid, 'Это твой собственный код дружбы');
      const who = await ctx.env.player(pid);
      this.need(who, 'Ловчий с таким кодом не найден — пусть он обновит игру');
      let f = S.d.friends.find(x => x.id === pid), isNew = false;
      if (!f) {
        this.need(S.d.friends.length < 50, 'Друзей уже 50 — это максимум');
        f = { id: pid, name: who.name, lvl: who.level, pts: 0, added: ctx.now, sent: '', recv: '' };
        S.d.friends.push(f);
        J.add('friend', { name: f.name });
        isNew = true;
      } else { f.name = who.name; f.lvl = who.level; }
      f.linked = true;
      await ctx.env.link(S.d.pid, pid, S.d.name, S.d.level);
      return { name: f.name, isNew };
    },
    // Профиль друга — только если дружба взаимная (он тоже добавил тебя)
    async friendProfile(a, ctx) {
      this.limit(ctx, 'profile', 60, 3600000);
      const { f, d, s } = await this.mutual(ctx, a.pid, 'Профиль откроется');
      // чужое сохранение могло быть записано ещё телефоном (до 3.0) — только числа и известные значения
      const num = (v, max) => U.clamp(Math.floor(+v) || 0, 0, max);
      f.name = String(d.name || f.name).slice(0, 20); f.lvl = num(d.level, MAX_LEVEL) || f.lvl;
      // облик — только из известных вариантов (он попадает в картинку)
      const lk = d.look || {}, look = LOOK.cloak.some(x => x.c === lk.cloak) && LOOK.eyes.some(x => x.c === lk.eyes) && LOOK.emblem.some(x => x.id === lk.emblem)
        ? { cloak: lk.cloak, eyes: lk.eyes, emblem: lk.emblem } : null;
      if (look) f.look = look;
      const st = d.stats || {}, spirits = Array.isArray(d.spirits) ? d.spirits.filter(x => x && SP[x.sid]) : [];
      const top = this.topSpirits(d).map(x => ({ ...x, power: S.power(x) }));
      const buddy = d.buddy && spirits.find(x => x.uid === d.buddy.uid);
      const L = d.league || {};
      return {
        name: f.name, level: num(d.level, MAX_LEVEL) || 1, look, seen: s.seen || null,
        dex: Object.values(d.dex || {}).filter(x => x && x.caught).length, caught: num(st.caught, 1e7), km: U.clamp(+st.km || 0, 0, 1e5),
        raids: num(st.raids, 1e6), duels: num(st.duels, 1e6), streak: num(d.streak && d.streak.n, 1e5),
        medals: Object.values(d.medals || {}).filter(t => t >= 3).length, rank: num(L.best, LEAGUE_RANKS.length - 1),
        buddy: buddy ? buddy.sid : null, top, pts: f.pts,
      };
    },
    // Поединок с другом: его три сильнейших духа под управлением игры. Награда — раз в день за каждого друга.
    async sparStart(a, ctx) {
      this.limit(ctx, 'spar', 30, 3600000);
      const { f, d } = await this.mutual(ctx, a.pid, 'Поединок откроется');
      const foe = this.topSpirits(d);
      this.need(foe.length, `У ${f.name} пока нет духов`);
      const team = S.team();
      this.need(team.length, 'Нужна команда');
      ctx.srv.battle = { type: 'spar', pid: f.id, foe, start: ctx.now, team: team.map(x => x.uid) };
      return { foe, name: f.name, look: f.look || null, rewarded: f.spar === U.today(ctx.now) };
    },
    sparEnd(a, ctx) {
      const b = this.endBattle(ctx, 'spar');
      if (!a.win) return { win: false };
      this.plausibleDuel(ctx, b, b.foe);
      const f = S.d.friends.find(x => x.id === b.pid);
      this.need(f, 'Такого друга нет');
      J.add('spar', { name: f.name });
      if (f.spar === U.today(ctx.now)) return { win: true, rw: S.giveRewards({ xp: 100 }), practice: true };
      f.spar = U.today(ctx.now);
      const rw = S.giveRewards({ xp: 800, sparks: 500, charm: 3, honey: 1 });
      this.friendPoint(f);
      return { win: true, rw, pts: f.pts };
    },
    friendRemove(a) { S.d.friends = S.d.friends.filter(f => f.id !== a.pid); return { ok: true }; },
    // Кто добавил меня (дружба взаимная) + подарки, которые ждут открытия
    async friendsSync(a, ctx) {
      for (const f of S.d.friends.filter(x => !x.linked && this.PID.test(x.id))) {
        try { await ctx.env.link(S.d.pid, f.id, S.d.name, S.d.level); f.linked = true; } catch (e) {}
      }
      const seen = S.d.friendLinks, added = [];
      (await ctx.env.linksTo(S.d.pid)).forEach(r => {
        if (!this.PID.test(r.from_pid) || r.from_pid === S.d.pid || seen[r.from_pid] === r.created_at) return;
        seen[r.from_pid] = r.created_at;
        const f = S.d.friends.find(x => x.id === r.from_pid);
        if (f) { f.name = String(r.from_name).slice(0, 20); f.lvl = r.from_level; return; }
        if (S.d.friends.length >= 50) return;
        S.d.friends.push({ id: r.from_pid, name: String(r.from_name).slice(0, 20), lvl: r.from_level || 1, pts: 0, added: ctx.now, sent: '', recv: '', linked: false });
        J.add('friend', { name: r.from_name });
        added.push(String(r.from_name).slice(0, 20));
      });
      const inbox = (await ctx.env.giftsTo(S.d.pid)).map(g => ({ id: g.id, from: g.from_pid, name: g.from_name, t: g.created_at }));
      return { added, inbox };
    },
    async giftSend(a, ctx) {
      const f = S.d.friends.find(x => x.id === a.pid);
      this.need(f, 'Такого друга нет');
      this.need(f.sent !== U.today(), 'Сегодня этому другу подарок уже отправлен');
      this.need(S.useItem('gift'), 'Подарков нет — они попадаются в родниках');
      const lv = (() => { let r = 0; FRIEND_LEVELS.forEach((x, i) => { if (f.pts >= x.pts) r = i; }); return r; })();
      const r = Math.random, c = { charm: 3 + Math.floor(r() * 4) };
      if (r() < 0.6) c.honey = 1 + Math.floor(r() * 2);
      if (r() < 0.4) c.water = 1;
      if (lv >= 2 && r() < 0.5) c.charm2 = 2;
      if (lv >= 3 && r() < 0.3) c.charm3 = 1;
      if (r() < 0.12 + lv * 0.03) c.cocoon = 5;
      await ctx.env.giftCreate(S.d.pid, f.id, S.d.name, c);
      f.sent = U.today();
      this.friendPoint(f);
      J.add('gift', { dir: 'out', name: f.name });
      return { ok: true };
    },
    async giftOpen(a, ctx) {
      const g = await ctx.env.gift(String(a.id || ''));
      this.need(g && g.to_pid === S.d.pid, 'Подарок не найден');
      this.need(!g.opened_at, 'Подарок уже открыт');
      const f = S.d.friends.find(x => x.id === g.from_pid);
      this.need(f, `Сначала добавь ${g.from_name || 'отправителя'} в друзья`);
      this.need(f.recv !== U.today(), 'Сегодня ты уже открывал подарок от этого друга — попробуй завтра');
      this.need(await ctx.env.giftTake(g.id, S.d.pid), 'Подарок уже открыт');
      f.recv = U.today();
      const { cocoon, ...items } = g.contents || {};
      const clean = {};
      for (const [k, n] of Object.entries(items)) if (ITEMS[k] && n > 0 && n <= 10) clean[k] = n | 0;
      const got = S.giveRewards({ ...clean, xp: 200 + (() => { let r = 0; FRIEND_LEVELS.forEach((x, i) => { if (f.pts >= x.pts) r = i; }); return r; })() * 100 });
      if (cocoon && S.d.cocoons.length < 9) { S.d.cocoons.push({ id: U.uid(), km: 5, walked: 0, inc: S.incubating() < 3 }); got.push({ k: 'cocoon', n: 1, label: 'Кокон 5 км' }); }
      this.friendPoint(f);
      J.add('gift', { dir: 'in', name: f.name });
      return { name: f.name, got, pts: f.pts };
    },
  },
};
