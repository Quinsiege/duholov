'use strict';
/* Сервер игры «Духолов»: все действия игрока выполняются здесь, а не на телефоне.
   Телефон присылает намерение («бросил оберег», «зачерпнул родник», «усилил духа»), сервер проверяет его
   (расстояние до объекта, перезарядки, предметы в сумке, правдоподобие боя), сам бросает кубики
   и сохраняет результат. В ответ — изменения прогресса (diff.js) и события для окон и подсказок.
   Файл работает и в браузере (автотесты), и в Edge Function (см. build-server.ps1). */

class GameError extends Error {}

const GameCore = {
  MIN_CLIENT: '4.28.0', // 4.28: мифологии мира и сезоны Алатыря меняют появление духов на карте — старым клиентам нужно обновиться
  POI_ID: /^(osm:[nwr]\d{1,15}|usr:[0-9a-f-]{36})$/,
  PID: /^[a-z0-9]{8,40}$/,
  STARTERS: ['ugolek', 'kapelka', 'mshonok'],
  TZ_LOCK: 7 * 86400000, // часовой пояс игрока меняется не чаще раза в неделю

  fail(msg) { throw new GameError(msg); },
  need(cond, msg) { if (!cond) this.fail(msg); },

  /* ---------- запуск запроса ----------
     req:  { a: [{ type, args }], tz, wx, pos: { lat, lng, acc }, v }
     save: { data, srv } — прогресс и служебные данные сервера (сессии встреч и боёв, позиция, лимиты)
     env:  доступ к общим таблицам (места, друзья, подарки, обмен, Лига) — см. serve.js / тесты */
  /* 4.3: сервер выполняет запросы разных игроков одновременно. Игровой код работает с общими полями (S.d — прогресс,
     U.tz — часовой пояс, Sky.w — погода, MapView.pos — позиция, Bus.emit, S.save): на сервере у каждого запроса они
     свои — AsyncLocalStorage (serve.js → isolate) хранит их значения на всё время запроса, включая ожидание базы.
     В браузере (автотесты) — как раньше: запрос подменяет поля и возвращает их в finally. */
  isolate(als) {
    this.als = als;
    [[S, 'd'], [S, 'save'], [U, 'tz'], [U, 'skew'], [Sky, 'w'], [MapView, 'pos'], [Bus, 'emit']].forEach(([obj, key], i) => {
      let base = obj[key];
      Object.defineProperty(obj, key, {
        configurable: true, enumerable: true,
        get() { const s = als.getStore(); return s && i in s ? s[i] : base; },
        set(v) { const s = als.getStore(); if (s) s[i] = v; else base = v; },
      });
    });
  },
  // 4.15: погоде от телефона сервер не верит на слово. Годится настоящая погода этой точки (текущая или прошлая —
  // телефон мог запросить её чуть раньше) и смоделированная (у кого «настоящая погода» выключена или нет сети).
  // Иначе — смоделированная: её нельзя подделать, духи на карте у честного игрока от этого не меняются.
  // 4.26: нет ответа от сервиса погоды — тоже смоделированная (раньше верили телефону — погоду можно было выбрать)
  async checkWx(key, pos, env) {
    if (!key || !pos) return key ? { key } : null;
    const sim = Sky.simulate(pos).key;
    if (key === sim) return { key };
    let real = null;
    if (env && typeof env.weather === 'function') { try { real = await env.weather(pos.lat, pos.lng); } catch (e) { real = null; } }
    return { key: real && real.length && real.includes(key) ? key : sim };
  },
  async run(req, save, env) {
    if (this.als && !this.als.getStore()) return this.als.run({}, () => this.run(req, save, env));
    const ctx = { now: Date.now(), env, srv: JSON.parse(JSON.stringify(save.srv || {})), events: [], results: [], after: [], full: false, reset: false };
    const saved = { emit: Bus.emit, save: S.save, d: S.d, tz: U.tz, skew: U.skew, w: Sky.w, pos: MapView.pos };
    try {
      // 4.1: часовой пояс игрока запоминает сервер и меняет не чаще раза в неделю — иначе, переключая пояс
      // от запроса к запросу, можно было снова и снова «начинать новый день» (дневные лимиты, дань, награда за вход)
      const tz = Number.isFinite(+req.tz) ? U.clamp(Math.round(+req.tz), -840, 840) : 0, z = ctx.srv.tz;
      if (!z || (z.v !== tz && ctx.now - z.t >= this.TZ_LOCK)) ctx.srv.tz = { v: tz, t: ctx.now };
      U.tz = ctx.srv.tz.v;
      U.skew = 0;
      const p = req.pos;
      ctx.pos = p && Number.isFinite(+p.lat) && Number.isFinite(+p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180
        ? { lat: +p.lat, lng: +p.lng, acc: U.clamp(+p.acc || 30, 1, 5000) } : null;
      Sky.w = await this.checkWx(this.own(WEATHER, req.wx) ? req.wx : null, ctx.pos, env);
      MapView.pos = ctx.pos;
      Bus.emit = (ev, data) => ctx.events.push([ev, this.ser(ev, data)]);
      S.save = () => {};
      S.d = save.data ? JSON.parse(JSON.stringify(save.data)) : null;
      Ev.alaSync(ctx.now); // 4.28: мифологии, открытые в этом сезоне Алатыря (сезон — из базы, serve.js)
      if (S.d) { S.migrate(); S.ensureQuests(); W.prune(); this.alaTurn(ctx); }
      this.track(ctx);

      const actions = Array.isArray(req.a) ? req.a.slice(0, 5) : [];
      this.need(actions.length, ru`Пустой запрос`);
      const stats0 = S.d ? JSON.parse(JSON.stringify(S.d.stats)) : null;
      const ala0 = S.d ? S.d.alaGiven || 0 : 0; // 4.28: осколки Алатыря, отданные в общий счёт Ордена
      for (const a of actions) {
        const h = a && typeof a.type === 'string' && Object.prototype.hasOwnProperty.call(this.H, a.type) ? this.H[a.type] : null; // только свои действия, без служебных полей объекта
        this.need(h, ru`Неизвестное действие`);
        if (!['newGame', 'load'].includes(a.type)) this.need(S.d, ru`Прогресс не найден`);
        ctx.results.push(await h.call(this, a.args || {}, ctx));
      }
      if (S.d && stats0) { const pts = Rules.orderPoints(stats0, S.d.stats, Ev.cur); this.orderAdd(ctx, pts); this.passAdd(ctx, pts); }
      if (S.d) this.alatyrSync(ctx, (S.d.alaGiven || 0) - ala0, actions.some(a => a && a.type === 'load'));
      if (S.d) { S.checkMedals(); S.ensureQuests(); }
      return { ok: true, data: S.d, srv: ctx.srv, results: ctx.results, events: ctx.events, after: ctx.after, full: ctx.full, reset: ctx.reset, now: ctx.now };
    } catch (e) {
      // при отказе сохраняются только счётчики частоты (rl): иначе неудачные попытки перебора не считались бы
      if (e instanceof GameError) return { ok: false, error: e.message, rl: ctx.srv.rl || null };
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
    ctx.prevPos = last && Number.isFinite(+last.t) ? last : null; // 4.26: где сервер видел Ловчего до этого запроса (сверка пути в move)
    if (!p) return;
    if (last && ctx.now - last.t < 10 * 60000) {
      const v = U.dist(last.lat, last.lng, p.lat, p.lng) / Math.max(1, (ctx.now - last.t) / 1000);
      if (v > 60 && U.dist(last.lat, last.lng, p.lat, p.lng) > 300) ctx.srv.fastUntil = ctx.now + 60000;
    }
    ctx.srv.pos = { lat: p.lat, lng: p.lng, t: ctx.now, acc: Math.round(p.acc) };
    if (!(p.acc > Rules.SPEED.ACC)) this.pace(ctx, { lat: p.lat, lng: p.lng, t: ctx.now });
  },
  // 4.20: скорость Ловчего; быстрее бега — пауза на COOL. 4.24.1: по недавним точкам (Rules.paceStep) — после остановки
  // пауза снимается, как только Ловчий полминуты идёт шагом или стоит
  pace(ctx, q) {
    const st = ctx.srv.spd = ctx.srv.spd || { pts: [], until: ctx.srv.speedUntil || 0, kmh: ctx.srv.kmh || 0 };
    delete ctx.srv.pace; delete ctx.srv.speedUntil; // прежний счётчик (якорь раз в минуту)
    Rules.paceStep(st, q);
  },
  speedUntil(ctx) { return (ctx.srv.spd && ctx.srv.spd.until) || ctx.srv.speedUntil || 0; },
  here(ctx) {
    this.need(ctx.pos, ru`Нет данных о местоположении — включи GPS`);
    this.need(!(ctx.srv.fastUntil > ctx.now), ru`Похоже, GPS скачет — подожди минуту`);
    this.need(!(this.speedUntil(ctx) > ctx.now), ru`Слишком быстро — около ${(ctx.srv.spd && ctx.srv.spd.kmh) || ctx.srv.kmh || 20} км/ч. Духолов — игра для пешеходов: сбавь скорость до шага или бега`);
    // 4.26: после дальнего перемещения — перезарядка (Rules.jumpWait) от места и времени последнего действия на карте,
    // сколько бы ни прошло с последней точки. Позиция при этом принимается как обычно; место действия запоминается
    const wait = Rules.jumpWait(ctx.srv.at, ctx.pos, ctx.now);
    this.need(!(wait > 0), ru`Слишком быстрое перемещение — подожди ${Math.ceil(wait / 60000)} мин`);
    ctx.srv.at = { lat: ctx.pos.lat, lng: ctx.pos.lng, t: ctx.now };
    return ctx.pos;
  },
  near(ctx, lat, lng, max) {
    const p = this.here(ctx), d = U.dist(p.lat, p.lng, lat, lng);
    this.need(d <= max + Math.min(p.acc, 30) + 10, ru`Слишком далеко — подойди ближе`);
    return d;
  },
  limit(ctx, key, max, windowMs) {
    const rl = ctx.srv.rl = ctx.srv.rl || {}, r = rl[key];
    if (!r || ctx.now - r[1] > windowMs) { rl[key] = [1, ctx.now]; return; }
    this.need(r[0] < max, ru`Слишком часто — передохни немного`);
    r[0]++;
  },
  // 4.26: ключ из запроса или чужих данных — только собственный ключ таблицы (не __proto__, constructor и т. п.)
  own(o, k) { return (typeof k === 'string' || typeof k === 'number') && Object.prototype.hasOwnProperty.call(o, k); },
  // 4.26: общие таблицы (аукцион, подарки, друзья, Капища, комнаты, чат) обработчики пишут до сохранения прогресса — только
  // пока замок игрока точно держится (serve.js: env.lockAt — когда взят, env.LOCK_MS — на сколько; LOCK_SPARE — запас на
  // сохранение). Иначе другой запрос того же игрока мог уже взять замок — и запись разошлась бы с прогрессом.
  // Нет данных о замке (автотесты) — не проверяем
  LOCK_SPARE: 8000,
  shared(ctx) {
    const e = ctx.env || {}, at = +e.lockAt, ms = +e.LOCK_MS;
    if (!(at > 0) || !(ms > 0)) return;
    this.need(Date.now() - at <= ms - this.LOCK_SPARE, ru`Сервер не успел — повтори действие`);
  },
  spirit(uid) { const sp = S.findSpirit(String(uid)); this.need(sp, ru`Дух не найден`); return sp; },
  // Объект карты из запроса. Места игроков и правки модераторов сверяются с сервером.
  async place(a, ctx, kind) {
    const p = a && typeof a === 'object' ? a : {};
    this.need(this.POI_ID.test(String(p.id)) && Number.isFinite(+p.lat) && Number.isFinite(+p.lng), ru`Неизвестное место`);
    const row = await ctx.env.poi(p.id);
    if (row) {
      this.need(row.active !== false, ru`Этого места больше нет на карте`);
      this.need(!kind || row.kind === kind, ru`Здесь нет такого объекта`);
      return { id: row.id, lat: row.lat, lng: row.lng, name: row.name, photo: row.photo || null, verified: true };
    }
    this.need(p.id.startsWith('osm:'), ru`Место не найдено`);
    // там, где места загружены из OpenStreetMap в базу (вся Россия), других объектов нет
    this.need(!(await ctx.env.poiCovered(+p.lat, +p.lng)), ru`Этого места нет на карте — обнови игру`);
    // 4.1: такое место сервер проверить не может (id и координаты — от телефона): на нём нет легендарных разломов и удержания Капищ
    return { id: p.id, lat: +p.lat, lng: +p.lng, name: String(p.name || 'Место').slice(0, 80), photo: null, verified: false };
  },
  team(uids) { return (uids || []).map(u => S.findSpirit(u)).filter(Boolean); },
  battleTime(ctx, b) { return (ctx.now - b.start) / 1000 - Rules.COUNTDOWN; },
  endBattle(ctx, type) {
    const b = ctx.srv.battle;
    this.need(b && b.type === type, ru`Бой не найден — начни его заново`);
    ctx.srv.battle = null;
    return b;
  },
  // 4.15: раны после боя — общие на всю игру. Телефон присылает долю здоровья каждого бойца (hp: { uid: 0..1 });
  // выше той, с какой дух вошёл в бой, она не станет (в разломе — плюс выпитая Живая вода). Нет данных — здоровье не меняется
  // 4.16: и усталость — каждый бой (разлом, Капище, вторжение) прибавляет духам команды по очку (см. Rules.HP.TIRED)
  // 4.26: после победы — и не ниже, чем посчитал сервер: команда потеряла не меньше loss единиц здоровья (Rules.raidMinLoss,
  // duelMinLoss; mul — здоровье духа в единицах боя: 5 в разломе, Duel.HPX на Капище) — даже если телефон ран не прислал
  woundTeam(b, hp, loss = 0, mul = 5) {
    const now = U.now(), team = this.team(b.team), rep = hp && typeof hp === 'object' ? hp : {};
    const up = sp => Math.min(S.hpCap(sp, now), S.hpNow(sp, now) + (b.waters || 0) * ITEMS.water.heal);
    let out = team.map(sp => (Number.isFinite(+rep[sp.uid]) ? Math.min(+rep[sp.uid], up(sp)) : null));
    if (loss > 0) out = Rules.woundFloor(team.map((sp, i) => ({ max: S.battle(sp).hp * mul, up: up(sp), rep: out[i] != null ? out[i] : S.hpNow(sp, now) })), loss);
    team.forEach((sp, i) => { if (out[i] != null) S.setHp(sp, out[i], now); });
    if (b.tire) team.forEach(sp => S.tire(sp, 1, now));
  },
  // здоровье бойцов на входе в бой: { uid: доля } — по нему сервер судит, могла ли команда победить (Rules.duelWinnable)
  hpMap(team) { const o = {}; team.forEach(sp => { o[sp.uid] = S.hpNow(sp); }); return o; },
  readyTeam(team) { this.need(team.every(sp => S.alive(sp)), ru`В команде дух без сил — вылечи его или замени`); },
  // Одна встреча с духом за раз: вид, уровень и особенности — только с сервера
  openEnc(ctx, o) {
    o = { ...o, lvl: U.clamp(o.lvl | 0, 1, S.catchLvl()) }; // 4.15: пойманный дух — не выше уровня Ловчего, откуда бы ни пришёл
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
  // Победа засчитывается, если с такой командой против такого соперника (speed — скорость его ударов) она вообще
  // возможна (4.3) и команда могла нанести столько урона за это время (или бой дошёл до таймера)
  plausibleDuel(ctx, b, foe, speed) {
    const t = this.battleTime(ctx, b);
    this.need(t >= 5, ru`Бой не засчитан: слишком быстрая победа`);
    this.need(Rules.duelWinnable(this.team(b.team), foe, speed, b.hp0), ru`Бой не засчитан: эта команда не могла победить такого соперника`);
    if (t >= Duel.TIME - 5) return;
    this.need(Rules.duelMaxDamage(this.team(b.team), foe, t) >= Rules.duelFoeHp(foe), ru`Бой не засчитан: слишком быстрая победа`);
  },
  friendPoint(f) {
    const lv = L => { let r = 0; FRIEND_LEVELS.forEach((x, i) => { if (L >= x.pts) r = i; }); return r; };
    const before = lv(f.pts);
    f.pts++;
    const after = lv(f.pts);
    if (after > before) {
      const L = FRIEND_LEVELS[after];
      const xp = S.addXP(L.xp); // 4.16: обычный опыт — под дневным потолком (друзья «дозревают» волнами)
      Bus.emit('toast', { text: ru`Дружба с ${f.name}: теперь «${L.name}»! +${U.fmtNum(xp)} опыта`, cls: 'good' });
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
  /* 4.28: общий Алатырь. n осколков, выпавших за запрос, — в общий счёт Ордена после сохранения прогресса (serve.js →
     alatyr_add; веху и событие дороги сервер отмечает там же). Дороги (Ev.roads — сервер держит их из базы) телефон
     получает событием roads: при входе и когда набор дорог изменился с прошлого раза (ctx.srv.alaV) */
  alatyrSync(ctx, n, load) {
    if (n > 0 && typeof ctx.env.alatyrAdd === 'function') { const k = Math.min(n, 10); ctx.after.push(() => ctx.env.alatyrAdd(k)); }
    const key = Ev.roadsKey();
    if ((load && key) || (ctx.srv.alaV || '') !== key) Bus.emit('roads', Ev.roadsLive(ctx.now));
    if (key || ctx.srv.alaV) ctx.srv.alaV = key;
    // 4.28: сезон Алатыря (финал, раскол) — событием ala: при входе и когда он изменился
    const sk = Ev.alaKey();
    if (load || (ctx.srv.alaW || '') !== sk) Bus.emit('ala', Ev.alaView());
    ctx.srv.alaW = sk;
  },
  /* 4.28: сезон Алатыря сменился (Кощей расколол камень) — награда за вклад в прошлый сезон (S.d.alaS: осколки и победы над
     Кощеем, Rules.alaPoints) из SeasonRewards (season-rewards.js; нет — без наград) и итоги для окна «Итоги сезона»
     (S.d.alaSum — телефон показывает его один раз, alatyr.js). Вклад нового сезона — с нуля. Первый раз (сохранение до
     сезонов) вклад первого сезона — всё, что Ловчий отдал в общий камень (alaGiven) */
  alaTurn(ctx) {
    const s = Ev.alaSeason(ctx.now), a = S.d.alaS;
    if (!a || typeof a !== 'object' || !(a.s >= 1)) { S.d.alaS = { s, n: s === 1 ? Math.max(0, S.d.alaGiven | 0) : 0, k: 0 }; return; }
    if (a.s >= s) return;
    const pts = Rules.alaPoints(a);
    let got = [];
    if (pts > 0 && typeof SeasonRewards !== 'undefined' && SeasonRewards && typeof SeasonRewards.grant === 'function') {
      try { const g = SeasonRewards.grant(S, a.s, pts); got = Array.isArray(g) ? g : []; } catch (e) { console.error('Награды сезона:', String(e && e.stack || e)); }
    }
    S.d.alaS = { s, n: 0, k: 0 };
    if (pts > 0 || got.length) {
      S.d.alaSum = { s: a.s, n: Math.max(0, a.n | 0), k: Math.max(0, a.k | 0), pts,
        got: got.slice(0, 12).map(x => (x && typeof x === 'object' ? { label: String(x.label || x.name || '').slice(0, 120), n: Math.max(1, +x.n || 1) } : { label: String(x).slice(0, 120), n: 1 })) };
    }
  },
  // Сезонная тропа: сезон — календарный месяц по часам игрока
  passSeason(ctx) { const d = U.local(ctx.now); return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`; },
  passState(ctx) {
    const season = this.passSeason(ctx);
    if (!S.d.pass || S.d.pass.season !== season) S.d.pass = { season, pts: 0, gold: false, got: { free: [], gold: [] } };
    return S.d.pass;
  },
  passAdd(ctx, pts) { if (pts > 0) this.passState(ctx).pts += pts; },
  // Награда: предметы, искры, монеты + кокон, случайный амулет, облик
  grant(rw) {
    const { cocoon, amulet, look, ...rest } = rw;
    const got = S.giveRewards(rest);
    if (cocoon) { S.d.cocoons.push({ id: U.uid(), km: cocoon, walked: 0, inc: S.incubating() < 3 }); got.push({ k: 'cocoon', n: 1, km: cocoon, label: ru`Кокон ${cocoon} км` }); }
    if (amulet) { const am = S.rollAmulet(1, 'gift' + U.uid()); got.push({ k: 'amulet', n: 1, id: am, label: AMULETS[am].name }); }
    if (look) {
      S.d.owned[look] = true;
      const x = LOOK.cloak.find(c => c.c === look) || LOOK.emblem.find(m => m.id === look) || LOOK.skin.find(k => `skin:${k.id}` === look) || LOOK.bg.find(k => `bg:${k.id}` === look) || LOOK.frame.find(k => `frame:${k.id}` === look);
      got.push({ k: 'look', n: 1, look, label: x ? ru`Облик: ${x.name}` : ru`Облик` });
    }
    return got;
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
    this.need(f, ru`Такого друга нет`);
    const s = await ctx.env.friendSave(f.id);
    this.need(s && s.data, ru`Ловчий не найден`);
    const d = s.data;
    this.need((d.friends || []).some(x => x.id === S.d.pid), what === 'duel' ? ru`Поединок откроется, когда ${f.name} тоже добавит тебя в друзья` : ru`Профиль откроется, когда ${f.name} тоже добавит тебя в друзья`);
    return { f, d, s };
  },
  // Дух из чужого сохранения: только известные поля и допустимые значения
  cleanSpirit(x, i) {
    const iv = (Array.isArray(x.iv) ? x.iv : []).slice(0, 3).map(v => U.clamp(Math.floor(+v) || 0, 0, 15));
    while (iv.length < 3) iv.push(0);
    return { uid: 'foe' + i, sid: x.sid, lvl: U.clamp(Math.floor(+x.lvl) || 1, 1, SPIRIT_MAX), iv, shiny: !!x.shiny, dark: !!x.dark && !x.purified,
      purified: !!x.purified, move2: !!x.move2, amulet: this.own(AMULETS, x.amulet) ? x.amulet : null, nick: x.nick ? this.cleanText(x.nick, 16) || null : null };
  },
  // Приглашение: новичок по ссылке друга сразу в друзьях у него, оба получают подарки.
  // Пригласивший — подарком в «Друзья» (не больше INVITE_MAX за все приглашения, чтобы не накручивали).
  INVITE_MAX: 10,
  INVITE_GIFT: { charm2: 5, charm3: 2, incense: 1, invite: 1 },
  INVITE_WELCOME: { charm: 20, honey: 5, sparks: 1000 },
  async invite(ctx, ref) {
    if (!this.PID.test(ref) || ref === S.d.pid) return null;
    const who = await ctx.env.player(ref);
    if (!who) return null;
    S.d.friends.push({ id: ref, name: who.name, lvl: who.level, pts: 1, added: ctx.now, sent: '', recv: '', linked: true, invitedBy: true });
    this.shared(ctx);
    await ctx.env.link(S.d.pid, ref, S.d.name, S.d.level); // пригласивший увидит новичка в друзьях
    S.giveRewards(this.INVITE_WELCOME);
    J.add('friend', { name: who.name });
    if ((await ctx.env.invitesTo(ref)) < this.INVITE_MAX) await ctx.env.giftCreate(S.d.pid, ref, S.d.name, this.INVITE_GIFT);
    return who.name;
  },
  // Совместный разлом: участник комнаты и то, что видит телефон (без кодов игроков)
  ROOM_ALPHA: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  // Облик — только из известных вариантов (он попадает в картинку у других игроков)
  // Аукцион: расчёт с продавцом — выручка за проданные (минус комиссия), духи снятых и истёкших лотов — обратно.
  // Номера рассчитанных лотов запоминаются в прогрессе (auc), поэтому расчёт ровно один, даже если отметка
  // settled в таблице не успела записаться
  async auctionSettle(ctx) {
    const A = S.d.auc = S.d.auc || { got: {}, back: {}, paid: {} };
    for (const m of [A.got, A.back, A.paid]) for (const k of Object.keys(m)) if (ctx.now - m[k] > 14 * 86400000) delete m[k];
    const rows = await ctx.env.lotsToSettle(S.d.pid), got = [];
    for (const r of rows) {
      if (!r.spirit || !this.own(SP, r.spirit.s)) continue;
      if (r.status === 'sold') {
        if (A.paid[r.id]) continue;
        const cur = r.cur === 'zlat' ? 'zlat' : 'sparks', net = r.price - Rules.auctionFee(r.price);
        const dep = U.clamp(Math.floor(+r.deposit) || 0, 0, Rules.auctionDeposit(cur, r.price)); // 4.16: залог — обратно (не больше, чем положено за эту цену)
        S.d[cur] = (S.d[cur] || 0) + net + dep;
        A.paid[r.id] = ctx.now;
        S.d.stats.traded++;
        got.push({ type: 'sold', sid: r.spirit.s, cur, price: r.price, net, dep, buyer: String(r.buyer_name || '').slice(0, 20) });
        J.add('auction', { sid: r.spirit.s, dir: 'sold', cur, price: net, who: r.buyer_name });
      } else {
        if (A.back[r.id]) continue;
        S.addSpirit(this.unpackSpirit(r.spirit, ctx));
        A.back[r.id] = ctx.now;
        got.push({ type: r.status, sid: r.spirit.s, lost: Math.max(0, Math.floor(+r.deposit) || 0), cur: r.cur === 'zlat' ? 'zlat' : 'sparks' });
      }
    }
    if (rows.length) ctx.after.push(() => ctx.env.lotsDone(rows.map(r => r.id), 'settled'));
    return got;
  },
  // Дневные лимиты (Rules.DAILY): счётчики за сегодняшний день игрока хранятся в прогрессе (dayc)
  dayc(ctx) {
    const today = U.today(ctx.now);
    if (!S.d.dayc || S.d.dayc.day !== today) S.d.dayc = { day: today };
    return S.d.dayc;
  },
  DAY_MSG: {
    springs: ru`Сегодня ты уже зачерпнул силу из 30 родников — они снова откроются завтра`,
    raids: ru`Сегодня закрыто уже 6 Разломов — Навь затихла до завтра`,
    duels: ru`Сегодня уже 8 побед на Капищах — хранители ждут тебя завтра`,
    invasions: ru`Сегодня отбито уже 6 вторжений — Навь вернётся завтра`,
    catches: ru`Сегодня поймано уже 120 духов — обереги отдохнут до завтра`,
  },
  dayNeed(ctx, key) { this.need((this.dayc(ctx)[key] || 0) < Rules.DAILY[key], this.DAY_MSG[key]); },
  dayAdd(ctx, key) { const c = this.dayc(ctx); c[key] = (c[key] || 0) + 1; },
  // 4.16: недельные счётчики (неделя — как у общего дела Ордена, с понедельника) — в прогрессе (weekc)
  weekc(ctx) {
    const w = Ev.week(ctx.now);
    if (!S.d.weekc || S.d.weekc.w !== w) S.d.weekc = { w };
    return S.d.weekc;
  },
  weekUsed(ctx, key) { return this.weekc(ctx)[key] || 0; },
  weekAdd(ctx, key) { const c = this.weekc(ctx); c[key] = (c[key] || 0) + 1; },
  // Канал чата: общий, торговля, разломы, помощь или свой клан (4.28: clan:<ключ мифологии>; до миграции 032 в базе ещё
  // есть сообщения прежних дружин clan:sokol… — их читает serve.js вместе с каналом клана, clanIds)
  chatChannel(ch) {
    if (ch === 'clan') { this.need(clanOf(S.d.clan), ru`Канал клана — для тех, кто в клане`); return 'clan:' + clanOf(S.d.clan); }
    this.need(['all', 'trade', 'raid', 'help'].includes(ch), ru`Такого канала нет`);
    return ch;
  },
  // Текст сообщения: без разметки и управляющих символов; грубые слова — звёздочками
  chatClean(s) {
    const t = String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/[<>`\\]/g, '').trim().replace(/\s+/g, ' ').slice(0, Rules.CHAT.MAX);
    return t.replace(/[a-zа-яё]+/gi, w => (this.rude(w) ? '*'.repeat(Math.min(w.length, 6)) : w));
  },
  // Грубое слово: начинается с корня (или приставка + корень). Только начало слова — чтобы не задеть
  // «корабля», «ребус», «застрахуй», «себастьян»
  RUDE_ROOTS: ['хуй', 'хуе', 'хуя', 'хуи', 'хую', 'пизд', 'еба', 'ебу', 'ебл', 'ебн', 'бля', 'мудак', 'мудил', 'пидор', 'пидар', 'гандон', 'шлюх', 'залуп'],
  RUDE_PRE: ['', 'на', 'по', 'за', 'от', 'вы', 'до', 'рас', 'раз', 'у', 'об', 'при', 'пере', 'не'],
  rude(w) {
    const x = w.toLowerCase().replace(/ё/g, 'е');
    if (/^(сука|суки|суке|суку|сучка|сучара)$/.test(x)) return true;
    return this.RUDE_PRE.some(p => this.RUDE_ROOTS.some(r => x.startsWith(p + r)));
  },
  // Дух покидает коллекцию (посылка, аукцион): амулет — в сумку, из команды и спутников убирается
  detachSpirit(sp) {
    if (sp.amulet) S.unequip(sp);
    S.d.spirits.splice(S.d.spirits.indexOf(sp), 1);
    if (S.d.buddy && S.d.buddy.uid === sp.uid) { S.d.buddy = null; Bus.emit('buddyChanged'); }
    S.d.team = S.d.team.filter(u => u !== sp.uid);
  },
  // Упаковка духа для посылки и лота аукциона — и обратно (уровень — не выше доступного получателю)
  // 4.16: a — звёзды пробуждения (действуют у получателя по его уровню Ловчего, S.starsOn)
  // 4.17: c — код духа (плёнка стикера): переходит к новому хозяину вместе с духом
  packSpirit(sp) { return { s: sp.sid, l: sp.lvl, i: sp.iv, y: sp.shiny ? 1 : 0, d: sp.dark ? 1 : 0, n: sp.nick || '', p: sp.purified ? 1 : 0, m: sp.move2 ? 1 : 0, a: sp.stars || 0, c: S.spiritCode(sp) }; },
  unpackSpirit(p, ctx, from, cap = S.maxLvl()) {
    this.need(p && this.own(SP, p.s), ru`Посылка повреждена`);
    const iv = (Array.isArray(p.i) ? p.i : []).slice(0, 3).map(v => U.clamp(Math.floor(+v) || 0, 0, 15));
    while (iv.length < 3) iv.push(0);
    const sp = { uid: U.uid(), sid: p.s, lvl: U.clamp(Math.min(+p.l || 1, cap), 1, 50), iv, t: ctx.now, fav: false, nick: this.cleanText(p.n, 16) || null };
    if (from) sp.from = this.cleanText(from, 20);
    if (p.y) sp.shiny = true;
    if (p.d) sp.dark = true;
    if (p.p) sp.purified = true;
    if (p.m) sp.move2 = true;
    if (p.a) sp.stars = U.clamp(Math.floor(+p.a) || 0, 0, S.AWAKE.MAX);
    if (/^[1-9]\d{7}$/.test(String(p.c || ''))) sp.code = String(p.c);
    return sp;
  },
  // Текст от игрока (имя, кличка духа): без управляющих символов и символов разметки, пробелы схлопнуты
  cleanText(s, max) { return String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/[<>"'`&\\]/g, '').trim().replace(/\s+/g, ' ').slice(0, max); },
  safeLook(lk) {
    lk = lk && typeof lk === 'object' ? lk : {}; // 4.26: только объект
    if (!(LOOK.cloak.some(x => x.c === lk.cloak) && LOOK.eyes.some(x => x.c === lk.eyes) && LOOK.emblem.some(x => x.id === lk.emblem))) return null;
    const out = { cloak: lk.cloak, eyes: lk.eyes, emblem: lk.emblem };
    if (lk.skin !== 'hood' && LOOK.skin.some(x => x.id === lk.skin)) out.skin = lk.skin; // 4.6: облик-скин, фон, рамка
    if (lk.bg !== 'night' && LOOK.bg.some(x => x.id === lk.bg)) out.bg = lk.bg;
    if (lk.frame !== 'none' && LOOK.frame.some(x => x.id === lk.frame)) out.frame = lk.frame;
    return out;
  },
  // 3.21: текущие данные Ловчего из его сохранения — только проверенные значения (попадают в разметку)
  brief(b) {
    if (!b) return null;
    return { name: this.cleanText(b.name, 20) || 'Ловчий', lvl: U.clamp(Math.floor(+b.level) || 1, 1, MAX_LEVEL), clan: clanOf(b.clan), look: this.safeLook(b.look) }; // 4.28: прежняя дружина — её клан
  },
  // 4.28: клан для вступления и перехода: известный (не прежний id дружины) и открытый в этом сезоне Алатыря
  clanCheck(k) {
    this.need(typeof k === 'string' && clanOf(k) === k, ru`Такого клана нет`);
    this.need(clanOpen(k), ru`Этот клан ещё закрыт — он откроется в новом сезоне Алатыря`);
  },
  roomMember() {
    const team = S.team();
    return { pid: S.d.pid, name: String(S.d.name).slice(0, 20), look: this.safeLook(S.d.look), lvl: S.d.level, power: team.reduce((a, x) => a + S.power(x), 0), sid: team[0] ? team[0].sid : null };
  },
  // 4.16: уровень босса совместного разлома — средний уровень Ловчих комнаты (уровни в комнату пишет сервер)
  roomRl(r) { const l = (r.members || []).map(m => U.clamp(Math.floor(+m.lvl) || 1, 1, MAX_LEVEL)); return l.length ? Math.round(l.reduce((a, x) => a + x, 0) / l.length) : 1; },
  roomView(r) {
    return { code: r.code, status: r.status, rift: { ...r.rift, rl: this.roomRl(r) }, isHost: r.host_pid === S.d.pid, hpMul: Raid.coopHp(r.members.length),
      members: r.members.map((m, i) => ({ name: String(m.name || 'Ловчий').slice(0, 20), look: m.look, lvl: m.lvl, power: m.power, sid: m.sid, host: i === 0, me: m.pid === S.d.pid })) };
  },
  // 4.26: союзники в совместном бою — участники комнаты, которые сами вступили в бой (отметка f ставится в raidStart);
  // «мёртвые души» в комнате не уменьшают долю урона. Комнаты не прочитать — как раньше, по комнате на старте
  async coopAllies(ctx, b) {
    const c = b.coop;
    if (!c) return 0;
    const room = c.code ? await ctx.env.roomGet(c.code) : null;
    if (!room || !Array.isArray(room.members)) return c.allies;
    return U.clamp(room.members.filter(m => m && m.pid !== S.d.pid && +m.f > 0).length, 0, c.allies);
  },
  // Защитники Капища в бою — три сильнейших (4.16: только те, кто ещё на посту, и с учётом усталости — Rules.HOLD)
  holdTeam(hold, now = Date.now()) {
    return hold.holders.filter(h => h && h.sp && this.own(SP, h.sp.sid) && Rules.holdFresh(h, now)).map((h, i) => Rules.holdSpirit(this.cleanSpirit(h.sp, i), h.t, now))
      .map(x => ({ x, p: S.power(x) })).sort((a, b) => b.p - a.p).slice(0, 3).map(o => o.x);
  },
  // 4.16: Капище «сейчас»: защитники, чей срок вышел (Rules.HOLD.MAX_H), уже ушли; на вольном Капище кланов нет.
  // null — Капище свободно (бьётся хранитель). 4.28: clan — ключ клана мифологии (до миграции 032 в базе бывают прежние
  // sokol / medved / volk — clanOf); неизвестный клан — Капище как свободное
  liveHold(hold, now, id) {
    if (!hold || Rules.shrineFree(id) || !clanOf(hold.clan)) return null;
    const holders = (hold.holders || []).filter(h => Rules.holdFresh(h, now));
    return holders.length ? { ...hold, clan: clanOf(hold.clan), holders } : null;
  },
  // Три сильнейших духа друга
  topSpirits(d, n = 3) {
    const list = (Array.isArray(d.spirits) ? d.spirits : []).filter(x => x && this.own(SP, x.sid)).map((x, i) => this.cleanSpirit(x, i));
    return list.map(x => ({ x, p: S.power(x) })).sort((a, b) => b.p - a.p).slice(0, n).map(o => o.x);
  },

  /* ---------- Лига: бои с живыми Ловчими (4.16) ---------- */
  // Ход в бою Лиги — вне очереди запросов игрока и без его прогресса (serve.js: body.pvp): бой хранится в базе
  // (league_matches), сторону a/b база определяет по входу игрока — телефон присылает только номер боя и намерения.
  // Запись — с проверкой версии: два Ловчих ходят одновременно, проигравший гонку перечитывает бой и повторяет ход.
  // peek — только досчитать бой (экран Лиги): отметку «на связи» не ставить
  async pvp(op, a, env, now = Date.now(), peek = false) {
    try {
      this.need(op === 'state' || op === 'move', ru`Неизвестное действие`);
      a = a && typeof a === 'object' ? a : {};
      const ins = op === 'move' ? (Array.isArray(a.in) ? a.in.slice(0, 4) : []) : [];
      this.need(op === 'state' || ins.length, ru`Пустой ход`);
      for (let k = 0; k < 6; k++) {
        const m = await env.pvpLoad(String(a.id || ''));
        this.need(m && m.seat && m.state, ru`Бой не найден`);
        const me = m.seat, st = PvP.ensure(m.state), n0 = st.n, res = [];
        let dirty = st !== m.state;
        PvP.advance(st, now);
        if (!st.over && !peek) {
          const x = st.s[me];
          if (ins.length || now - x.seen >= PvP.SEEN_EVERY) { x.seen = now; dirty = true; }
          for (const i of ins) { const r = PvP.act(st, me, i, now); this.need(!r.bad, r.bad); res.push(r.ok ? { ok: 1, got: r.got } : { ign: r.ign }); }
        } else ins.forEach(() => res.push({ ign: 'over' }));
        if (st.n !== n0) dirty = true;
        let ver = m.ver;
        if (dirty) { ver = await env.pvpPut(m.id, m.ver, st, !!st.over); if (ver == null) continue; }
        return { ok: true, id: m.id, seat: me, ver, st: PvP.mask(st, me), res, now }; // 4.26: без скрытого от соперника
      }
      this.fail(ru`Бой занят — повтори`);
    } catch (e) {
      if (e instanceof GameError) return { ok: false, error: e.message, now };
      throw e;
    }
  },
  // Идущий бой игрока (номер) — заодно досчитанный: брошенный обоими бой здесь и закончится
  async leagueLive(ctx) {
    const m = await ctx.env.pvpLive();
    if (!m) return null;
    const r = await this.pvp('state', { id: m.id }, ctx.env, ctx.now, true);
    return r.ok && !r.st.over ? m.id : null;
  },
  // Итоги законченных боёв — в прогресс, ровно один раз (номер боя запоминается в L.done, как расчёты аукциона):
  // жетон, рейтинг (посчитан в самом бою — от рейтингов обоих на момент подбора), награды за лиги, опыт и раны
  async leagueSettle(ctx, board) {
    const L = League.st(), out = [], today = U.today(ctx.now);
    L.done = L.done || {};
    Object.keys(L.done).forEach(k => { if (ctx.now - L.done[k] > 7 * 86400000) delete L.done[k]; });
    for (const m of (await ctx.env.pvpPending()) || []) {
      const st = m.state, me = m.seat;
      if (!st || !st.over || !st.s || !st.s[me]) continue;
      ctx.after.push(() => ctx.env.pvpSettled(m.id));
      if (L.done[m.id]) continue;
      L.done[m.id] = ctx.now;
      const o = st.over, my = st.s[me], foe = st.s[PvP.other(me)], score = o.win === me ? 1 : o.win ? 0 : 0.5;
      L.tickets = Math.max(0, L.tickets - 1); L.n++;
      // с одним и тем же соперником рейтинг меняют первые League.SAME боёв за день; бой прошлого сезона рейтинг не меняет
      const vs = L.vs = L.vs && L.vs.day === today ? L.vs : { day: today, m: {} };
      vs.m[foe.pid] = (vs.m[foe.pid] || 0) + 1;
      const d = m.season === L.season && vs.m[foe.pid] <= League.SAME && o.d && o.d[me] ? +o.d[me].d || 0 : 0;
      const was = L.pts, rank0 = League.rank(was);
      L.pts = U.clamp(L.pts + d, 0, League.MAXPTS);
      const rNew = League.rank(L.pts), rewards = [];
      for (let i = 1; i <= rNew; i++) {
        if (L.got[i]) continue;
        L.got[i] = true;
        rewards.push(...S.giveRewards(LEAGUE_RANKS[i].reward));
        // на рангах 3, 6 и 9 — гарантированный амулет
        if (i % 3 === 0) { const am = S.rollAmulet(1, 'lg' + i); rewards.push({ k: 'amulet', n: 1, label: AMULETS[am].name }); }
      }
      if (rNew > L.best) L.best = rNew;
      if (rNew > (L.peak || 0)) L.peak = rNew;
      // опыт — за первые League.XP_RUNS боёв дня; сдавшемуся и пропавшему из боя — нет
      const fled = score === 0 && (o.why === 'quit' || o.why === 'idle');
      // шаг Летописи «Сразись в поединках Лиги» — за каждый честно сыгранный бой (не только за победу: соперники живые)
      if (!fled) S.progress('league', 1);
      const xp = L.n <= League.XP_RUNS && !fled ? (score === 1 ? League.XP.win : score ? League.XP.draw : League.XP.loss) : 0;
      if (xp) S.addXP(xp);
      // раны: здоровье бойцов после боя посчитал сервер — выше того, что у духа сейчас, оно не станет
      my.team.forEach(f => { const sp = S.findSpirit(f.uid); if (sp) S.setHp(sp, Math.min(S.hpNow(sp, ctx.now), Math.max(0, f.cur) / f.max), ctx.now); });
      L.last = foe.pid;
      J.add('pvp', { win: score, name: String(foe.name || '').slice(0, 20), rank: LEAGUE_RANKS[rNew].name, d: L.pts - was });
      if (board !== false) { const row = { season: L.season, name: S.d.name, pts: L.pts, rank: rNew, level: S.d.level, look: S.d.look }; ctx.after.push(() => ctx.env.leagueScore(row)); }
      out.push({ id: m.id, win: score === 1, draw: score === 0.5, why: o.why, d: L.pts - was, pts: L.pts, rank0, rNew, rewards, xp: Math.round(xp * Ev.xpMul()),
        foe: { name: String(foe.name || '').slice(0, 20), pts: foe.pts | 0, rank: U.clamp(foe.rank | 0, 0, LEAGUE_RANKS.length - 1), look: this.safeLook(foe.look) } });
    }
    return out;
  },
  // Сундук за высшую лигу прошлого сезона (League.norm отметил его при смене сезона)
  leaguePrize() {
    const L = League.st(), p = L.prize;
    if (!p) return null;
    delete L.prize;
    const rw = League.prize(p.rank);
    return rw ? { season: p.season, rank: p.rank, got: S.giveRewards(rw) } : null;
  },

  /* ---------- действия ---------- */
  H: {
    async load(a, ctx) {
      ctx.full = true;
      if (!S.d) return { empty: true };
      const r = await ctx.env.registerPid(S.d.pid);
      if (r === 'taken') { S.d.pid = U.uid() + U.uid(); await ctx.env.registerPid(S.d.pid); }
      if (!S.d.tradeClosed) await this.H.tradeReclaimAll.call(this, {}, ctx); // 3.18: вернуть неоткрытые посылки
      return { ok: true };
    },
    async newGame(a, ctx) {
      this.need(!S.d, ru`Прогресс уже есть`);
      const name = this.cleanText(a.name, 16);
      this.need(name.length >= 1, ru`Назови себя`);
      this.need(this.STARTERS.includes(a.starter), ru`Выбери первого духа`);
      S.newGame(name, a.starter);
      await ctx.env.registerPid(S.d.pid);
      ctx.full = true;
      const invitedBy = await this.invite(ctx, String(a.ref || ''));
      return { ok: true, invitedBy };
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
      const i = (st.n - 1) % Rules.STREAK.length;
      const got = S.giveRewards({ ...Rules.STREAK[i], zlat: i === Rules.STREAK.length - 1 ? Rules.ZLAT.streak7 : Rules.ZLAT.streak });
      if (i === Rules.STREAK.length - 1 && S.d.cocoons.length < 9) {
        S.d.cocoons.push({ id: U.uid(), km: 10, walked: 0, inc: S.incubating() < 3 });
        got.push({ k: 'cocoon', n: 1, label: ru`Кокон ${10} км` });
      }
      // Дальний пропуск дня — чтобы Разломы были доступны и тем, кому до Капища далеко
      if ((S.d.items.farpass || 0) < Rules.FAR.KEEP) got.push(...S.giveRewards({ farpass: 1 }));
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
      this.need(step && (w === now || w === now - 1), ru`Эта неделя уже закончилась`);
      const mine = S.d.order[w];
      this.need(mine && mine.n >= step.need, ru`Для этой награды внеси в общее дело не меньше ${step.need} очков`);
      this.need(!mine.got.includes(i), ru`Награда уже получена`);
      const s = await this.orderState(ctx, w);
      this.need(s.total >= Math.ceil(step.at * s.goal), ru`Орден ещё не дошёл до этой ступени`);
      mine.got.push(i);
      const got = S.giveRewards(step.reward);
      if (i === Rules.ORDER.STEPS.length - 1 && S.d.cocoons.length < 9) {
        S.d.cocoons.push({ id: U.uid(), km: 10, walked: 0, inc: S.incubating() < 3 });
        got.push({ k: 'cocoon', n: 1, label: ru`Кокон ${10} км` });
      }
      J.add('order', { i });
      return { got };
    },
    // 4.28: общий Алатырь — счёт Ордена, распутанные дороги (последние, для истории) и вклад Ловчего. Грани и вехи
    // телефон считает сам по Rules.alaStage (счёт — из кэша сервера, не старше ~15 с). Сезоны: текущий (season — с числом
    // побед над Кощеем в финале), прошлые (seasons — для летописи: финалы и расколы), вклад Ловчего в сезон (my)
    async alatyr(a, ctx) {
      this.limit(ctx, 'alatyr', 30, 60000);
      const w = typeof ctx.env.alatyrState === 'function' ? await ctx.env.alatyrState() : null;
      const total = Math.max(0, Math.floor(+(w && w.total) || 0));
      const roads = Ev.roadsClean(w && w.roads).sort((x, y) => y.n - x.n);
      const seasons = (Array.isArray(w && w.seasons) ? w.seasons : []).slice(0, 12).map(x => ({ ...Ev.alaClean(x), s: Math.max(1, x.s | 0) }));
      const my = S.alaMine();
      return { total, roads, mine: S.d.alaGiven || 0, now: ctx.now, season: Ev.alaView(), seasons,
        my: { s: my.s, n: my.n | 0, k: my.k | 0, pts: Rules.alaPoints(my) } };
    },

    // Пройденный путь: точки GPS с отметками времени. Быстрее 9 м/с (транспорт) не считается.
    move(a, ctx) {
      const pts = (Array.isArray(a.pts) ? a.pts : []).slice(0, 200)
        .filter(q => Array.isArray(q) && q.length >= 4 && [0, 1, 2, 3].every(i => Number.isFinite(+q[i])))
        .map(q => ({ lat: +q[0], lng: +q[1], t: +q[2], acc: +q[3] })).sort((x, y) => x.t - y.t);
      const last = ctx.srv.mv && ctx.now - ctx.srv.mv.t < 10 * 60000 ? ctx.srv.mv : null;
      // 4.26: точки не старше уже засчитанных (любой давности: повтор той же пачки не засчитается дважды) и рядом с тем,
      // где сервер видел Ловчего до запроса и видит сейчас (Rules.trackNear); отрезок с далёкой точкой не засчитывается
      const floor = ctx.srv.mv ? +ctx.srv.mv.t || 0 : 0, refs = [ctx.prevPos, ctx.pos && { ...ctx.pos, t: ctx.now }].filter(Boolean);
      let prev = last, prevOk = true, m = 0;
      for (const q of pts) {
        if (q.acc > 40 || q.t > ctx.now + 5000 || q.t <= floor || (prev && q.t <= prev.t)) continue;
        const ok = refs.every(r => Rules.trackNear(q, r));
        if (!prev) { prev = q; prevOk = ok; continue; }
        const d = U.dist(prev.lat, prev.lng, q.lat, q.lng), dt = (q.t - prev.t) / 1000;
        if (d < 4) continue;
        if (ok && prevOk && dt > 0 && d / dt <= Rules.SPEED.MAX) m += d; // 4.20: только шагом или бегом (было < 32 км/ч)
        this.pace(ctx, q);
        prev = q; prevOk = ok;
      }
      // не больше, чем можно пробежать с прошлой отметки
      const since = last ? (ctx.now - last.t) / 1000 : 60;
      m = Math.min(m, since * Rules.SPEED.MAX);
      if (prev) ctx.srv.mv = { lat: prev.lat, lng: prev.lng, t: Math.min(prev.t, ctx.now) };
      // 4.26: в зачёт — не больше Rules.TRACK.DAY метров в день (по часам игрока)
      if (m > 0) { const c = this.dayc(ctx); m = Math.min(m, Math.max(0, Rules.TRACK.DAY - (c.walk || 0))); c.walk = (c.walk || 0) + m; }
      if (m > 0) S.addDistance(m);
      return { m, fast: this.speedUntil(ctx) > ctx.now ? (ctx.srv.spd && ctx.srv.spd.kmh) || ctx.srv.kmh || 20 : 0 };
    },

    /* ----- встреча с духом ----- */
    encStart(a, ctx) {
      const kind = a.kind;
      if (kind === 'wild') {
        this.dayNeed(ctx, 'catches');
        this.need(Rules.THROWABLE.some(k => S.d.items[k] > 0), ru`Обереги закончились! Загляни к роднику.`);
        const p = this.here(ctx);
        const e = W.spawnsAround(p.lat, p.lng, W.INTERACT + 80).find(x => x.id === a.id && x.type === 'spirit' && !x.tut);
        this.need(e, ru`Дух уже растворился в воздухе…`);
        this.near(ctx, e.lat, e.lng, W.INTERACT);
        return this.openEnc(ctx, { mode: 'wild', sid: e.sid, lvl: e.lvl, shiny: e.shiny, boost: e.boost, seed: e.id, spawnId: e.id });
      }
      if (kind === 'tut') {
        const st = S.tutAt(); // 4.0: учебный дух — тот, что нужен на текущем шаге обучения
        this.need(st && st.kind === 'catch', ru`Учебный дух сейчас не нужен`);
        return this.openEnc(ctx, { mode: 'tut', sid: st.sid, lvl: Math.min(2, S.catchLvl()), seed: 'tut' + S.d.tut });
      }
      if (kind === 'raid') {
        const r = ctx.srv.raidWin;
        this.need(r, ru`Разлом уже закрылся`);
        ctx.srv.raidWin = null;
        return this.openEnc(ctx, { mode: 'raid', sid: r.sid, lvl: r.lvl, shiny: r.shiny, boost: r.boost, seed: r.rid, charms: r.charms });
      }
      if (kind === 'rescue') {
        const r = ctx.srv.rescue;
        this.need(r, ru`Омрачённый дух уже ушёл`);
        ctx.srv.rescue = null;
        return this.openEnc(ctx, { mode: 'rescue', sid: r.sid, lvl: r.lvl, dark: true, seed: r.seed });
      }
      if (kind === 'task') {
        const m = S.d.taskMeet.find(x => x.id === a.id);
        this.need(m, ru`Встреча за поручение не найдена`);
        return this.openEnc(ctx, { mode: 'task', sid: m.sid, lvl: m.lvl, seed: 'task:' + m.id, taskId: m.id });
      }
      this.fail(ru`Неизвестная встреча`);
    },
    encHoney(a, ctx) {
      const e = ctx.srv.enc;
      this.need(e, ru`Встреча закончилась`);
      this.need(!e.honey, ru`Дух уже лакомится мёдом`);
      this.need(S.useItem('honey'), ru`Мёда нет. Его можно найти у родников.`);
      e.honey = true;
      return { ok: true };
    },
    // Бросок: попадание и кольцо — с телефона (это ловкость игрока), покачивания и побег — решает сервер
    encThrow(a, ctx) {
      const e = ctx.srv.enc;
      this.need(e, ru`Встреча закончилась`);
      // 4.1: бросок с полётом занимает больше секунды — сильно чаще бросает только программа (запас — на скачки сети)
      this.need(!e.lastThrow || ctx.now - e.lastThrow >= 400, ru`Слишком быстро — дух ещё не опомнился`);
      e.lastThrow = ctx.now;
      const raid = e.mode === 'raid';
      let item = 'rift';
      if (raid) { this.need(e.charms > 0, ru`Обереги разлома кончились`); e.charms--; }
      else {
        item = Rules.THROWABLE.includes(a.item) ? a.item : 'charm';
        this.need(S.useItem(item), ru`Обереги этого вида закончились`);
      }
      e.throws++;
      const left = () => raid ? e.charms : Rules.THROWABLE.reduce((n, k) => n + (S.d.items[k] || 0), 0);
      if (!a.hit) {
        if (!left()) return this.encLost(ctx, e, raid ? ru`Обереги кончились — дух вернулся в Навь…` : null, { miss: true });
        return { miss: true, left: left() };
      }
      // точность броска присылает телефон: если «отличные» броски подозрительно часты (больше 70% из 20+ последних) — без бонуса
      let bonus = Rules.ringBonus(a.ring);
      const th = ctx.srv.thr || (ctx.srv.thr = { n: 0, g: 0 });
      if (bonus.great && th.n >= 20 && th.g / th.n > 0.7) bonus = Rules.ringBonus(null);
      th.n++; if (bonus.great) th.g++;
      if (th.n >= 60) { th.n = Math.round(th.n / 2); th.g = Math.round(th.g / 2); }
      if (bonus.great) { S.progress('throw', 1); S.d.stats.throwsGreat++; }
      const chance = Rules.catchChance({ mode: e.mode, sid: e.sid, lvl: e.lvl, item, honey: e.honey, mul: bonus.mul });
      const q = Math.pow(chance, 1 / 3);
      e.honey = false;
      let wobbles = 0;
      while (wobbles < 3 && Math.random() < q) wobbles++;
      if (wobbles < 3) {
        const flee = e.mode !== 'wild' ? 0 : RARITY[SP[e.sid].rar].flee * (e.throws > 3 ? 1.5 : 1);
        if (Math.random() < flee) return this.encLost(ctx, e, ru`Дух ускользнул в Навь…`, { wobbles, label: bonus.label });
        if (!left()) return this.encLost(ctx, e, raid ? ru`Обереги кончились — дух вернулся в Навь…` : null, { wobbles, label: bonus.label });
        return { wobbles, label: bonus.label, left: left() };
      }
      // пойман
      const sp = e.sp, s = SP[e.sid];
      if (e.spawnId) S.d.caught[e.spawnId] = ctx.now;
      if (e.mode === 'wild') this.dayAdd(ctx, 'catches');
      const isNew = S.addSpirit(sp);
      J.add('catch', { sid: s.id, shiny: !!sp.shiny, dark: !!sp.dark, power: S.power(sp) });
      const rw = Rules.catchReward({ mode: e.mode, sid: e.sid, isNew, ringXp: bonus.xp, throws: e.throws, shiny: sp.shiny, boost: e.boost });
      S.addEssence(s.fam, rw.ess);
      S.d.sparks += rw.sparks;
      S.d.stats.caught++;
      const xp = S.addXP(rw.xp);
      S.progress('catch', 1); S.progress('catchEl', 1, { el: s.el });
      if (e.mode === 'tut') S.tutAdvance('catch');
      if (e.mode === 'task') S.d.taskMeet = S.d.taskMeet.filter(x => x.id !== e.taskId); // сбежать не может — встреча ждёт, пока дух не пойман
      ctx.srv.enc = null;
      return { wobbles: 3, caught: true, label: bonus.label, uid: sp.uid, isNew, xp, sparks: rw.sparks, ess: rw.ess };
    },
    encEnd(a, ctx) { ctx.srv.enc = null; return { ok: true }; },

    /* ----- родник ----- */
    async spring(a, ctx) {
      const p = await this.place(a.poi, ctx, 'spring');
      this.near(ctx, p.lat, p.lng, W.INTERACT);
      this.limit(ctx, 'spring', 60, 3600000);
      this.dayNeed(ctx, 'springs');
      const e = W.springFor(p, 0);
      this.need(!e.invaded, ru`Родник захвачен Навью`);
      this.need(e.ready, ru`Родник ещё набирает силу`);
      S.d.springs[p.id] = ctx.now;
      this.dayAdd(ctx, 'springs');
      const sl = W.springLoot(p.id), loot = { ...sl.loot };
      // 4.26: место, которого нет в базе (id и координаты — от телефона, вне загруженных мест): добыча вполовину, без кокона
      if (!p.verified) Object.keys(loot).forEach(k => { loot[k] = Math.ceil(loot[k] / 2); });
      const cocoon = p.verified ? sl.cocoon : 0;
      // 4.16: родник открывается и при полной сумке — опыт, кокон и поручение сразу, а вещи, которым нет места, ждут в посылке Ордена
      const got = S.giveRewards({ ...loot, xp: 50 }); // не поместилось — в посылку Ордена
      S.d.stats.springs++;
      S.progress('spring', 1);
      let coc = null;
      if (cocoon) { coc = { id: U.uid(), km: cocoon, walked: 0, inc: S.incubating() < 3 }; S.d.cocoons.push(coc); }
      S.tutAdvance('spring');
      // поручение: первое за день — всегда, дальше — в каждом четвёртом роднике
      let task = null;
      if (!S.d.tut && S.d.tasks.length < TASK_LIMIT && (S.d.taskDay !== U.today(ctx.now) || Math.random() < 0.25)) {
        S.d.taskDay = U.today(ctx.now);
        task = S.makeTask(p); // 4.16: трудное поручение может позвать «гостя издалека» — духа, которого здесь не встретить
        S.d.tasks.push(task);
      }
      return { got, cocoon: coc, task, full: S.bagCount() >= S.bagLimit() };
    },
    // 4.15: вылечить духа предметом из сумки (Подорожник, Целебный отвар, Мёртвая вода, Живая вода)
    heal(a, ctx) {
      const sp = S.findSpirit(a.uid);
      this.need(sp, ru`Дух не найден`);
      const k = String(a.k || ''), err = S.heal(sp, k);
      this.need(!err, err);
      return { uid: sp.uid, hp: S.hpNow(sp), ko: S.koLeft(sp), left: S.d.items[k] || 0 };
    },
    incense(a, ctx) {
      this.need(!S.incenseActive(), ru`Ладан ещё горит`);
      this.need(S.useItem('incense'), ru`Ладана нет`);
      S.d.incenseUntil = ctx.now + 30 * 60000;
      return { until: S.d.incenseUntil };
    },
    // 4.16: Настой опыта — Rules.XP_BREW.MUL опыта на XP_BREW.H часов (множитель — в Ev.xpMul)
    xpBrew(a, ctx) {
      this.need(!(S.d.xpUntil > ctx.now), ru`Настой опыта ещё действует`);
      this.need(S.useItem('xpbrew'), ru`Настоя опыта нет`);
      S.d.xpUntil = ctx.now + Rules.XP_BREW.H * 3600000;
      return { until: S.d.xpUntil };
    },
    // Выбросить предметы из сумки (освободить место)
    discard(a) {
      const k = String(a.k || ''), have = (this.own(ITEMS, k) && S.d.items[k]) || 0, n = Math.floor(+a.n);
      this.need(have > 0, ru`Такого предмета в сумке нет`);
      this.need(n >= 1 && n <= have, ru`Можно выбросить от 1 до ${have}`);
      S.d.items[k] -= n;
      return { k, n, left: S.d.items[k] };
    },
    // 4.16: забрать из посылки Ордена то, что влезет в сумку; drop — выбросить посылку целиком
    parcelTake(a) {
      this.need(S.parcelCount() > 0, ru`Посылка Ордена пуста`);
      if (a.drop) { const n = S.parcelCount(); S.d.parcel = null; return { got: [], dropped: n, left: 0 }; }
      this.need(S.bagCount() < S.bagLimit(), ru`Сумка полна — освободи место, чтобы забрать посылку`);
      const got = S.parcelTake();
      return { got, left: S.parcelCount() };
    },
    // 4.16: переплавка амулетов: три одинаковых → один на выбор (за искры)
    amuletMelt(a) {
      const from = String(a.from || ''), to = String(a.to || ''), err = S.canMeltAmulet(from, to);
      this.need(!err, err);
      S.meltAmulet(from, to);
      J.add('melt', { from, to });
      return { from, to, left: S.d.amulets[from] || 0, have: S.d.amulets[to] || 0 };
    },
    supply(a, ctx) {
      this.need(S.d.supplyDay !== U.today(), ru`Посылка сегодня уже была`);
      S.d.supplyDay = U.today();
      return { got: S.giveRewards(Rules.SUPPLY) };
    },
    photo(a, ctx) { this.limit(ctx, 'photo', 20, 3600000); S.progress('photo', 1); return { ok: true }; },

    /* ----- коллекция ----- */
    fav(a) { const sp = this.spirit(a.uid); sp.fav = !!a.on; return { ok: true }; },
    // 4.17: содрать плёнку с оборота стикера — дух привязан к Ловчему навсегда (на аукцион его уже не выставить)
    spiritBind(a, ctx) {
      const sp = this.spirit(a.uid);
      this.need(!sp.bound, ru`Плёнка уже содрана — дух и так привязан к тебе`);
      sp.bound = ctx.now;
      S.d.stats.bound = (S.d.stats.bound || 0) + 1;
      return { ok: true };
    },
    nick(a) {
      const sp = this.spirit(a.uid), v = this.cleanText(a.nick, 16);
      sp.nick = v && v !== SP[sp.sid].name ? v : null;
      return { ok: true };
    },
    release(a) {
      const uids = [...new Set((Array.isArray(a.uids) ? a.uids : [a.uid]).map(String))];
      uids.forEach(u => this.spirit(u));
      this.need(uids.length < S.d.spirits.length, ru`Нельзя отпустить всех духов`);
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
    // 4.16: пробуждение (звезда поднимает предел уровня духа) и эссенция Рода (переплавка лишней эссенции и вливание в любое семейство)
    awaken(a) { const sp = this.spirit(a.uid), err = S.canAwaken(sp); this.need(!err, err); S.awaken(sp); return { stars: sp.stars, max: S.maxLvl(sp) }; },
    essMelt(a) { const fam = String(a.fam || ''), n = Math.floor(+a.n), err = S.canMelt(fam, n); this.need(!err, err); S.melt(fam, n); return { rod: S.d.rod, left: S.d.essence[fam] }; },
    essPour(a) { const fam = String(a.fam || ''), n = Math.floor(+a.n), err = S.canPour(fam, n); this.need(!err, err); S.pour(fam, n); return { rod: S.d.rod, ess: S.d.essence[fam] }; },
    equip(a) {
      const sp = this.spirit(a.uid);
      this.need(this.own(AMULETS, a.k) && S.d.amulets[a.k] > 0, ru`Такого амулета нет`);
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
      const k = LOOK.skin.find(x => x.id === (L.skin || 'hood')), g = LOOK.bg.find(x => x.id === (L.bg || 'night')), fr = LOOK.frame.find(x => x.id === (L.frame || 'none'));
      this.need(c && e && m && k && g && fr, ru`Такого облика нет`);
      this.need(!k.shop || S.d.owned[`skin:${k.id}`], ru`Этот облик продаётся в Гардеробе`);
      this.need(!g.shop || S.d.owned[`bg:${g.id}`], ru`Этот фон продаётся в Гардеробе`);
      this.need(!fr.shop || S.d.owned[`frame:${fr.id}`], ru`Эта рамка продаётся в Гардеробе`);
      this.need((g.lvl || 1) <= lvl && (fr.lvl || 1) <= lvl, ru`Этот облик ещё не открыт`);
      this.need(c.lvl <= lvl && e.lvl <= lvl && m.lvl <= lvl, ru`Этот облик ещё не открыт`);
      this.need(!m.league || League.st().best >= m.league, ru`Венец Лиги — награда за ранг «Хранитель Лиги»`);
      this.need((!c.shop && !c.pass) || S.d.owned[c.c], c.shop ? ru`Этот плащ продаётся в Лавке Ордена` : ru`Этот плащ — награда Золотой тропы`);
      this.need(!m.pass || S.d.owned[m.id], ru`Знак Тропы — награда Золотой тропы`);
      S.d.look = { cloak: c.c, eyes: e.c, emblem: m.id };
      if (k.id !== 'hood') S.d.look.skin = k.id;
      if (g.id !== 'night') S.d.look.bg = g.id;
      if (fr.id !== 'none') S.d.look.frame = fr.id;
      return { ok: true };
    },

    /* ----- коконы ----- */
    warm(a) {
      const c = S.d.cocoons.find(x => x.id === a.id);
      this.need(c && !c.inc, ru`Кокон не найден`);
      this.need(S.incubating() < 3, ru`Греть можно три кокона одновременно`);
      c.inc = true;
      return { ok: true };
    },
    hatch(a) {
      const c = S.d.cocoons.find(x => x.id === a.id);
      this.need(c && c.inc && c.walked >= c.km, ru`Кокон ещё не готов`);
      const r = S.hatch(c);
      return { uid: r.sp.uid, sid: r.sp.sid, isNew: r.isNew, essence: r.essence, sparks: r.sparks, km: c.km };
    },

    /* ----- задания и Летопись ----- */
    questClaim(a) {
      const q = S.d.quests.list[a.i | 0];
      this.need(q && q.p >= q.n && !q.claimed, ru`Задание ещё не выполнено`);
      q.claimed = true;
      return { got: S.giveRewards({ ...q.reward, xp: Rules.QUEST_XP }) };
    },
    questBonus() {
      const Q = S.d.quests;
      this.need(Q.list.every(q => q.claimed) && !Q.bonus, ru`Сундук ещё закрыт`);
      Q.bonus = true;
      return { got: S.giveRewards({ ...Rules.QUEST_BONUS, xp: Rules.QUEST_BONUS_XP, zlat: Rules.ZLAT.questBonus }) };
    },
    // 4.0: разделы обучения засчитываются строго по порядку; пропустить обучение нельзя
    tutNext(a) {
      const st = S.tutAt();
      this.need(st, ru`Обучение уже пройдено`);
      this.need(st.kind === 'ui' && st.id === a.id, ru`Сначала выполни текущий шаг обучения`);
      return S.tutAdvance(st.kind, st.id);
    },
    tutFinish() { this.need(false, ru`Обучение нельзя пропустить`); },
    // Поручение выполнено: предметы сразу, дух — во встрече (ждёт в «Заданиях», пока не пойман)
    taskClaim(a) {
      const q = S.d.tasks.find(x => x.id === a.id);
      this.need(q && q.p >= q.n, ru`Поручение ещё не выполнено`);
      this.need(S.d.taskMeet.length < TASK_LIMIT, ru`Сначала встреть духов за прошлые поручения`);
      S.d.tasks = S.d.tasks.filter(x => x !== q);
      const T = TASK_TIERS[q.tier];
      const got = S.giveRewards({ ...T.reward, xp: 250 * q.tier });
      const m = { id: q.id, sid: q.sid, lvl: Math.min(T.lvl, S.catchLvl()) };
      S.progress('task', 1);
      S.d.taskMeet.push(m);
      return { got, meet: m };
    },
    taskDrop(a) {
      const n = S.d.tasks.length;
      S.d.tasks = S.d.tasks.filter(x => x.id !== a.id);
      this.need(S.d.tasks.length < n, ru`Поручение не найдено`);
      return { ok: true };
    },
    async placeRewards(a, ctx) {
      const rows = await ctx.env.mySubmissions();
      const out = [];
      rows.filter(r => r.status !== 'pending' && !S.d.props[r.id]).forEach(r => {
        S.d.props[r.id] = r.status;
        out.push({ name: r.name, status: r.status, reason: r.reason, got: r.status === 'approved' ? S.giveRewards(Rules.PLACE_REWARD, true, true) : [] });
      });
      return { list: out };
    },

    /* ----- бои: разлом ----- */
    async raidStart(a, ctx) {
      this.need(S.d.level >= RAID_LEVEL, ru`Разломы открываются с ${RAID_LEVEL} уровня Ловчего`); // 4.18
      // совместный бой: число союзников и место разлома — из комнаты на сервере, а не со слов телефона
      let coop = null, rift = a.rift;
      if (a.coop && a.coop.code) {
        const room = await ctx.env.roomGet(String(a.coop.code).toUpperCase());
        this.need(room && room.status === 'started' && ctx.now - Date.parse(room.started_at) < 10 * 60000, ru`Совместный бой не найден — начните заново`);
        this.need(room.members.some(m => m.pid === S.d.pid), ru`Ты не в этом разломе`);
        coop = { host: room.host_pid === S.d.pid, allies: U.clamp(room.members.length - 1, 0, 3), code: room.code, rl: this.roomRl(room) };
        rift = { id: room.rift.poi, lat: room.rift.lat, lng: room.rift.lng, name: room.rift.place };
      }
      const p = await this.place(rift, ctx, 'shrine');
      const hour = Math.floor(ctx.now / 3600000);
      // бой мог начаться за минуту до смены часа
      const r = W.riftFor(p, 0, hour) || (ctx.now % 3600000 < 90000 ? W.riftFor(p, 0, hour - 1) : null);
      this.need(r, ru`Разлом уже закрылся`);
      this.need(p.verified || r.tier < 3, ru`Легендарные разломы открываются только у мест, известных Ордену`);
      this.need(!S.d.rifts[r.id], ru`Этот разлом ты уже закрыл`);
      // дальний бой: вместо того чтобы подойти — грамота Ордена (до Rules.FAR.R от игрока)
      let far = !coop && !!a.far;
      // 4.26: гость совместного боя — тоже у Разлома (раньше мог вступить откуда угодно), а дальше W.BATTLE_R — по Дальнему пропуску
      if (coop && !coop.host) { const me = this.here(ctx); far = U.dist(me.lat, me.lng, p.lat, p.lng) > W.BATTLE_R + Math.min(me.acc, 30) + 10; }
      if (far) {
        this.near(ctx, p.lat, p.lng, Rules.FAR.R);
        this.need((S.d.items.farpass || 0) > 0, ru`Нужен Дальний пропуск — его можно купить в Лавке`);
      } else this.near(ctx, p.lat, p.lng, W.BATTLE_R);
      const team = S.team();
      this.need(team.length, ru`Нужна команда`);
      this.readyTeam(team);
      this.dayNeed(ctx, 'raids'); // до списания Дальнего пропуска
      // 4.26: у места, которого нет в базе, — только малые Разломы (легендарные — см. выше)
      this.need(p.verified || r.tier < 2, ru`Здесь только малые бои — место неизвестно Ордену`);
      this.limit(ctx, 'raid', 30, 3600000);
      // 4.26: отметка в комнате «я в бою» — союзником в raidEnd считается только тот, кто сам вступил в бой
      if (coop) { this.shared(ctx); await ctx.env.roomJoin(coop.code, { ...this.roomMember(), f: ctx.now }); }
      if (far) S.d.items.farpass--;
      // 4.16: босс — по уровню Ловчего (в совместном — по среднему уровню комнаты); rl телефон считает так же (Raid.bossStats)
      const rl = coop ? coop.rl : S.catchLvl();
      // 4.26: hp0 — здоровье бойцов на входе (Rules.raidWinnable)
      // 4.28: fin — Разлом финала сезона Алатыря (Кощей): победа идёт в общий счёт побед над ним
      ctx.srv.battle = { type: 'raid', rid: r.id, poi: p, tier: r.tier, boss: r.boss, rl, start: ctx.now, team: team.map(x => x.uid), hp0: this.hpMap(team), coop, waters: 0, far, tire: true, fin: r.fin || 0 };
      return { rid: r.id, tier: r.tier, boss: r.boss, rl, far, fin: r.fin || 0 };
    },
    /* ----- совместный разлом: комната на сервере ----- */
    async roomCreate(a, ctx) {
      this.need(S.d.level >= RAID_LEVEL, ru`Разломы открываются с ${RAID_LEVEL} уровня Ловчего`);
      const p = await this.place(a.rift, ctx, 'shrine');
      const r = W.riftFor(p, 0, Math.floor(ctx.now / 3600000));
      this.need(r, ru`Разлом уже закрылся`);
      this.need(p.verified || r.tier < 3, ru`Легендарные разломы открываются только у мест, известных Ордену`);
      this.need(!S.d.rifts[r.id], ru`Этот разлом ты уже закрыл`);
      this.near(ctx, p.lat, p.lng, W.BATTLE_R);
      this.need(p.verified || r.tier < 2, ru`Здесь только малые бои — место неизвестно Ордену`); // 4.26
      this.limit(ctx, 'room', 20, 3600000);
      const rift = { id: r.id, tier: r.tier, boss: r.boss, endsAt: r.endsAt, poi: p.id, lat: p.lat, lng: p.lng, place: p.name }; // как у разлома на карте
      this.shared(ctx);
      for (let i = 0; i < 5; i++) {
        const code = U.code(5, this.ROOM_ALPHA);
        const room = await ctx.env.roomCreate({ code, host_pid: S.d.pid, rift, members: [this.roomMember()] });
        if (room) return this.roomView(room);
      }
      this.fail(ru`Не получилось создать разлом — попробуй ещё раз`);
    },
    async roomJoin(a, ctx) {
      this.need(S.d.level >= RAID_LEVEL, ru`Разломы открываются с ${RAID_LEVEL} уровня Ловчего`);
      const code = String(a.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      this.need(code.length === 5, ru`Код разлома — 5 символов`);
      this.limit(ctx, 'roomJoin', 60, 3600000);
      this.shared(ctx);
      const r = await ctx.env.roomJoin(code, this.roomMember());
      this.need(r && !r.error, (r && r.error) || ru`Разлом с таким кодом не найден`);
      return this.roomView(r);
    },
    async roomState(a, ctx) {
      const r = await ctx.env.roomGet(String(a.code || '').toUpperCase());
      this.need(r && r.status !== 'closed', ru`Хозяин закрыл разлом`);
      this.need(r.members.some(m => m.pid === S.d.pid), ru`Ты больше не в этом разломе`);
      return this.roomView(r);
    },
    async roomStart(a, ctx) {
      const code = String(a.code || '').toUpperCase(), r = await ctx.env.roomGet(code);
      this.need(r && r.host_pid === S.d.pid, ru`Начать бой может только хозяин разлома`);
      this.need(r.members.length >= 2, ru`Ждём хотя бы одного друга`);
      this.shared(ctx);
      const s = await ctx.env.roomStart(code, S.d.pid);
      this.need(s, ru`Бой уже начался`);
      return this.roomView(s);
    },
    async roomLeave(a, ctx) {
      const code = String(a.code || '').toUpperCase();
      if (/^[A-Z0-9]{5}$/.test(code)) await ctx.env.roomLeave(code, S.d.pid);
      return { ok: true };
    },

    water(a, ctx) {
      const b = ctx.srv.battle;
      this.need(b && b.type === 'raid', ru`Живая вода — только в бою`);
      this.need(b.waters < 3, ru`За бой можно выпить не больше 3 флаконов`);
      this.need(S.useItem('water'), ru`Живой воды нет`);
      b.waters++;
      return { left: S.d.items.water || 0 };
    },
    async raidEnd(a, ctx) {
      const b = this.endBattle(ctx, 'raid');
      if (!a.win) { this.woundTeam(b, a.hp); return { win: false }; }
      const t = Math.min(90, this.battleTime(ctx, b)), team = this.team(b.team);
      // 4.16: в совместном бою урон союзников сервер не видит — от каждого нужна хотя бы половина своей доли.
      // 4.26: здоровье босса — по числу Ловчих в комнате на старте, а доля — только на тех, кто сам вступил в бой (coopAllies)
      const allies = await this.coopAllies(ctx, b), n = allies + 1, hpMul = b.coop ? Raid.coopHp(b.coop.allies + 1) : 1;
      const need = Raid.bossStats(b).hp * hpMul / n * (n > 1 ? 0.5 : 1);
      this.woundTeam(b, a.hp, Rules.raidMinLoss(team, b, need), 5); // 4.26: раны после победы — не меньше, чем наверняка нанёс босс
      this.need(t >= 2 && Rules.raidMaxDamage(team, b, t) >= need, ru`Бой не засчитан: слишком быстрая победа`);
      // 4.26: и команда могла выстоять, пока наносила этот урон (как Rules.duelWinnable на Капищах)
      this.need(Rules.raidWinnable(team, b, need, b.hp0, b.waters), ru`Бой не засчитан: эта команда не могла победить такого соперника`);
      S.d.rifts[b.rid] = true;
      const tier = b.tier;
      J.add('raid', { sid: b.boss, tier, coop: allies });
      S.d.stats.raids++;
      this.dayAdd(ctx, 'raids');
      S.progress('raid', 1);
      if (allies > 0) S.progress('coop', 1);
      // 4.16: меньше лечебного, мёда и амулетов (было ✦ 400 × ступень, мёда 2 + ступень, Живой воды 2 за каждую победу,
      // амулет с шансом 25/40/70%) — к 40 уровню копились сотни флаконов и амулетов
      const rw = S.giveRewards({ xp: Math.round(1000 * tier * (allies ? 1.25 : 1)), sparks: 350 * tier, charm: 5, honey: tier, herb: tier === 1 ? 1 : 0, water: tier >= 2 ? 1 : 0, charm2: tier >= 2 ? 3 : 0 });
      const am = S.rollAmulet([0.05, 0.12, 0.3][tier - 1], b.rid);
      rw.push(...S.riftSpoils(b.boss, tier)); // 4.16: эссенция семейства босса (и легенд) и осколки Алатыря
      if (am) rw.push({ k: 'amulet', n: 1, label: AMULETS[am].name });
      // 4.28: финал сезона Алатыря — победа над Кощеем: в вклад Ловчего за сезон и (после сохранения) в общий счёт побед
      let fin = 0;
      if (b.fin && b.boss === 'koschey') {
        const my = S.alaMine();
        if (my.s === b.fin) { my.k = (my.k | 0) + 1; fin = b.fin; }
        if (fin && typeof ctx.env.alatyrKill === 'function') ctx.after.push(() => ctx.env.alatyrKill(fin));
      }
      const bonus = Math.max(0, Math.floor((90 - t) / 15));
      const charms = Raid.TIER[tier].charms + bonus + (Ev.cur.rifts ? 3 : 0) + allies * 2;
      const shiny = U.h('rshiny', b.rid, S.d.created) < Sky.shinyRate(1 / 20);
      ctx.srv.raidWin = { rid: b.rid, sid: b.boss, lvl: Math.min(Raid.TIER[tier].lvl, S.catchLvl()), // 4.15: пойманный дух — не выше уровня Ловчего
        charms, shiny, boost: Sky.boosted(SP[b.boss].el) };
      return { win: true, rw, charms, bonus, allies, fin };
    },

    /* ----- бои: капище и вторжение ----- */
    async duelStart(a, ctx) {
      this.need(S.d.level >= DUEL_LEVEL, ru`Капища открываются с ${DUEL_LEVEL} уровня Ловчего`);
      const p = await this.place(a.shrine, ctx, 'shrine');
      this.need(!W.riftAt(p.id, Math.floor(ctx.now / 3600000)), ru`Сейчас здесь открыт Разлом`);
      const e = W.shrineFor(p, 0);
      this.need(!e.won, ru`Сегодня ты уже победил здесь`);
      this.near(ctx, p.lat, p.lng, W.BATTLE_R);
      const team = S.team();
      this.need(team.length, ru`Нужна команда`);
      this.readyTeam(team);
      // Капище держит клан — сражаться придётся с его защитниками (тремя сильнейшими)
      const hold = this.liveHold(await ctx.env.holdGet(p.id), ctx.now, p.id);
      this.need(!hold || !S.d.clan || hold.clan !== S.d.clan, ru`Капище держит твой клан — здесь можно поставить защитника`);
      const ht = hold ? this.holdTeam(hold, ctx.now) : [], foe = ht.length ? ht : null;
      this.dayNeed(ctx, 'duels');
      this.need(p.verified || e.tier < 2, ru`Здесь только малые бои — место неизвестно Ордену`); // 4.26: у места не из базы — только Капища «Ученика»
      this.limit(ctx, 'duel', 40, 3600000);
      ctx.srv.battle = { type: 'duel', id: e.id, tier: e.tier, name: e.name, start: ctx.now, team: team.map(x => x.uid), hp0: this.hpMap(team), tire: true,
        foe, hold: hold ? { clan: hold.clan, ver: hold.ver } : null };
      return { id: e.id, tier: e.tier, foe, clan: hold ? hold.clan : null, holders: hold ? hold.holders.map(h => String(h.name || 'Ловчий').slice(0, 20)) : null };
    },
    async duelEnd(a, ctx) {
      const b = this.endBattle(ctx, 'duel');
      if (!a.win) { this.woundTeam(b, a.hp); return { win: false }; }
      const e = { id: b.id, tier: b.tier, name: b.name };
      const g = b.foe ? null : W.guardian(e); // 4.16: у хранителя свой темп (W.foeSpeed)
      const foe = b.foe || g.team, speed = g ? g.speed : SHRINE_TIERS[e.tier].speed;
      this.woundTeam(b, a.hp, Rules.duelMinLoss(this.team(b.team), foe, speed), Duel.HPX); // 4.26: раны после победы — не меньше наверняка нанесённых
      this.plausibleDuel(ctx, b, foe, speed);
      const T = SHRINE_TIERS[e.tier], mul = Ev.duelMul(), t = e.tier;
      S.d.shrines[e.id] = U.today();
      let freed = false;
      if (b.hold) {
        this.shared(ctx);
        freed = await ctx.env.holdDefeat(e.id, b.hold.ver); // защитники могли смениться за время боя — тогда Капище не освобождается
        if (freed) S.d.stats.freed = (S.d.stats.freed || 0) + 1;
      }
      J.add('duel', { name: e.name, guard: b.hold ? CLANS[b.hold.clan].name : W.guardian(e).name, tier: t });
      S.d.stats.duels++;
      this.dayAdd(ctx, 'duels');
      S.progress('duel', 1);
      // 4.16: вместо 2 Живой воды за каждую победу — подорожник (на 3 ступени — Живая вода), мёда меньше, амулет реже (было 15% × ступень)
      const rw = S.giveRewards({ xp: T.xp * mul, sparks: T.sparks * mul, charm: 5 * mul, honey: (t - 1) * mul, herb: t < 3 ? 1 : 0, water: t === 3 ? 1 : 0, charm2: t >= 2 ? 3 * mul : 0, charm3: t === 3 ? 2 * mul : 0 });
      const am = S.rollAmulet(0.04 * t, e.id);
      rw.push(...S.alatyrDrop('duel', t)); // 4.16: хранитель-старейшина иногда отдаёт осколок Алатыря
      if (am) rw.push({ k: 'amulet', n: 1, label: AMULETS[am].name });
      return { win: true, rw, freed, clan: b.hold ? b.hold.clan : null };
    },

    /* ----- Лавка Ордена ----- */
    shopBuy(a, ctx) {
      const today = U.today(ctx.now), id = String(a.id || '');
      let it;
      if (a.deal) {
        it = Rules.shopDeal(today);
        this.need(S.d.shop.deal !== today, ru`Товар дня уже куплен — завтра будет новый`);
      } else if (/^(skin|bg|frame):/.test(id)) { // 4.6: облик-скин, фон или рамка из Гардероба
        const [kind, key] = id.split(':'), x = LOOK[kind].find(k => k.id === key && k.shop);
        this.need(x, ru`Такого облика нет`);
        this.need(!S.d.owned[id], ru`Это уже твоё`);
        it = { id, name: kind === 'skin' ? ru.k`Облик «${x.name}»` : kind === 'bg' ? ru.k`Фон «${x.name}»` : ru.k`Рамка «${x.name}»`, cur: 'zlat', price: x.shop, look: id };
      } else if (id.startsWith('look:')) {
        const key = id.slice(5), x = LOOK.cloak.find(c => c.c === key && c.shop);
        this.need(x, ru`Такого товара нет`);
        this.need(!S.d.owned[key], ru`Этот плащ уже твой`);
        it = { id, name: ru.k`Плащ «${x.name}»`, cur: 'zlat', price: x.shop, look: key };
      } else {
        it = Rules.SHOP.find(x => x.id === id);
        this.need(it, ru`Такого товара нет`);
      }
      if (it.bag) {
        this.need(S.d.bagExtra < Rules.BAG_MAX_UP, ru`Сумка уже расширена до предела`);
        it = { ...it, price: Rules.bagPrice(S.d.bagExtra) };
      }
      this.need(!it.lvl || S.d.level >= it.lvl, ru`Откроется на ${it.lvl} уровне`);
      if (it.day) this.need((this.dayc(ctx)['shop:' + it.id] || 0) < it.day, ru`Сегодня уже куплено — приходи завтра`); // 4.15.1: редкий товар — сколько-то раз в день
      if (it.week) this.need(this.weekUsed(ctx, 'shop:' + it.id) < it.week, ru`На этой неделе уже куплено — приходи в понедельник`); // 4.16: и сколько-то раз в неделю
      if (it.cocoon) this.need(S.d.cocoons.length < 9, ru`Коконов уже девять — выведи кого-нибудь`);
      if (it.give) {
        const n = Object.values(it.give).reduce((s, x) => s + x, 0);
        this.need(S.bagCount() + n <= S.bagLimit(), ru`Сумка полна — освободи место или расширь её`);
      }
      const key = it.cur === 'sparks' ? 'sparks' : 'zlat';
      this.need((S.d[key] || 0) >= it.price, key === 'sparks' ? ru`Не хватает искр` : ru`Не хватает монет`);
      this.limit(ctx, 'shop', 120, 3600000);
      S.d[key] -= it.price;
      let got;
      if (it.bag) { S.d.bagExtra++; got = [{ k: 'bag', n: Rules.BAG_STEP, label: ru`Мест в сумке` }]; }
      else got = this.grant({ ...(it.give || {}), cocoon: it.cocoon || 0, amulet: it.amulet ? 1 : 0, look: it.look || null });
      if (a.deal) S.d.shop.deal = today;
      if (it.day) this.dayAdd(ctx, 'shop:' + it.id);
      if (it.week) this.weekAdd(ctx, 'shop:' + it.id);
      J.add('shop', { name: it.name });
      return { got, price: it.price, cur: key };
    },

    // Казна: начислить оплаченные наборы монет. Номер оплаты запоминается в прогрессе (paid) —
    // так начисление ровно одно, даже если отметка в таблице payments не успела записаться
    async payClaim(a, ctx) {
      const rows = await ctx.env.paidList();
      S.d.paid = S.d.paid || {};
      let zlat = 0;
      const packs = [];
      for (const r of rows) {
        if (S.d.paid[r.id]) continue;
        S.d.paid[r.id] = 1;
        zlat += r.zlat; packs.push(r.pack);
      }
      if (zlat) {
        S.d.zlat = (S.d.zlat || 0) + zlat;
        S.d.payNew = (S.d.payNew || 0) + zlat; // 4.22: игра покажет «+N монет» при входе (начислить мог и сам сервер)
        J.add('pay', { zlat });
      }
      if (rows.length) ctx.after.push(() => ctx.env.payCredited(rows.map(r => r.id)));
      return { zlat, n: packs.length };
    },
    // 4.26: оплату вернули (refunded) — начисленные по ней монеты списываются; счёт может уйти в минус (тратить нечего,
    // пока не пополнится). Зовёт сам сервер по уведомлению ЮKassa; список — только из базы, повтор безопасен
    async payRefund(a, ctx) {
      const rows = ctx.env.refundList ? await ctx.env.refundList() : [];
      S.d.refunded = S.d.refunded || {};
      let zlat = 0;
      for (const r of rows) {
        if (S.d.refunded[r.id]) continue;
        S.d.refunded[r.id] = 1;
        zlat += r.zlat;
      }
      if (zlat) S.d.zlat = (S.d.zlat || 0) - zlat;
      if (rows.length) ctx.after.push(() => ctx.env.payDebited(rows.map(r => r.id)));
      return { zlat: -zlat };
    },
    // 4.22: игрок увидел «+N монет» из Казны
    payAck() { delete S.d.payNew; return {}; },
    // Обменник: искры → монеты, по курсу Rules.EXCHANGE и не больше DAY обменов в день
    exchange(a, ctx) {
      const E = Rules.EXCHANGE, today = U.today(ctx.now), n = Math.floor(+a.n);
      const ex = S.d.shop.ex && S.d.shop.ex.day === today ? S.d.shop.ex : (S.d.shop.ex = { day: today, n: 0 });
      this.need(n >= 1 && ex.n + n <= E.DAY, ex.n >= E.DAY ? ru`Обменник на сегодня закрыт — приходи завтра` : ru`Сегодня можно обменять ещё ${E.DAY - ex.n} раз`);
      this.need(S.d.sparks >= E.SPARKS * n, ru`Не хватает искр`);
      S.d.sparks -= E.SPARKS * n;
      S.d.zlat = (S.d.zlat || 0) + E.ZLAT * n;
      ex.n += n;
      J.add('exchange', { sparks: E.SPARKS * n, zlat: E.ZLAT * n });
      return { sparks: E.SPARKS * n, zlat: E.ZLAT * n, left: E.DAY - ex.n };
    },

    /* ----- Сезонная тропа ----- */
    passClaim(a, ctx) {
      const P = this.passState(ctx), lvl = a.lvl | 0, track = a.track === 'gold' ? 'gold' : 'free';
      this.need(lvl >= 1 && lvl <= Rules.PASS.LEVELS, ru`Такой ступени нет`);
      this.need(Rules.passLevel(P.pts) >= lvl, ru`Ступень ещё не пройдена`);
      this.need(track === 'free' || P.gold, ru`Сначала открой Золотую тропу`);
      this.need(!P.got[track].includes(lvl), ru`Награда уже получена`);
      P.got[track].push(lvl);
      let rw = Rules.passReward(track, lvl, S.d.level);
      if (rw.cocoon && S.d.cocoons.length >= 9) rw = { ...rw, cocoon: 0, zlat: (rw.zlat || 0) + 10 }; // коконов некуда класть — монетами (4.16: было 40)
      return { got: this.grant(rw) };
    },
    passGold(a, ctx) {
      const P = this.passState(ctx);
      this.need(!P.gold, ru`Золотая тропа уже открыта`);
      this.need(S.d.zlat >= Rules.PASS.GOLD, ru`Нужно ${Rules.PASS.GOLD} монет`);
      S.d.zlat -= Rules.PASS.GOLD;
      P.gold = true;
      J.add('passGold', { season: P.season });
      return { ok: true };
    },

    /* ----- кланы (4.28: клан — мифология; открыт, пока открыта мифология — clanOpen) ----- */
    clanJoin(a) {
      this.need(S.d.level >= CLAN_LEVEL, ru`Клан можно выбрать с ${CLAN_LEVEL} уровня`);
      this.need(!S.d.clan, ru`Клан уже выбран`);
      this.clanCheck(a.clan);
      S.d.clan = a.clan;
      J.add('clan', { clan: a.clan });
      return { clan: a.clan };
    },
    // 4.28: один бесплатный переход в другой открытый клан — у тех, кто был в дружине до кланов мифологий (S.migrate,
    // clanFree; предложение не сгорает, пока не использовано). Защитники достаивают свой срок на Капищах прежнего клана,
    // чат — уже нового
    clanMove(a) {
      this.need(S.d.clan, ru`Сначала выбери клан`);
      this.need(S.d.clanFree > 0, ru`Бесплатный переход уже использован`);
      this.clanCheck(a.clan);
      this.need(a.clan !== S.d.clan, ru`Ты уже в этом клане`);
      const from = S.d.clan;
      S.d.clan = a.clan; S.d.clanFree = 0;
      J.add('clan', { clan: a.clan, from, move: 1 });
      return { clan: a.clan };
    },
    // Поставить духа защищать Капище: свободное — после своей победы здесь сегодня, своего клана — если есть место
    async shrineDefend(a, ctx) {
      this.need(S.d.clan, ru`Сначала выбери клан`);
      const p = await this.place(a.shrine, ctx, 'shrine');
      this.need(p.verified, ru`Защищать можно только Капища, известные Ордену`);
      this.need(!Rules.shrineFree(p.id), ru`Это вольное Капище — его не держит ни один клан`);
      this.near(ctx, p.lat, p.lng, W.BATTLE_R);
      const sp = this.spirit(a.uid);
      const hold = this.liveHold(await ctx.env.holdGet(p.id), ctx.now, p.id);
      if (!hold) this.need(S.d.shrines[p.id] === U.today(ctx.now), ru`Сначала победи на этом Капище`);
      else {
        this.need(hold.clan === S.d.clan, ru`Капище держит другой клан — сначала победи его защитников`);
        this.need(hold.holders.length < HOLD_MAX, ru`На Капище уже ${HOLD_MAX} защитников`);
        this.need(!hold.holders.some(h => h.pid === S.d.pid), ru`Твой защитник уже стоит здесь`);
      }
      this.need((await ctx.env.myHolds(S.d.pid)) < HOLD_MY_MAX, ru`Твои защитники уже стоят на ${HOLD_MY_MAX} Капищах`);
      this.limit(ctx, 'defend', 30, 3600000);
      this.shared(ctx);
      const ok = await ctx.env.holdDefend(p.id, p.lat, p.lng, S.d.clan, { pid: S.d.pid, name: S.d.name, sp: this.cleanSpirit(sp, 0), t: ctx.now });
      this.need(ok, ru`Капище только что изменилось — открой его заново`);
      S.d.stats.defends = (S.d.stats.defends || 0) + 1;
      S.d.guards.push({ id: p.id, name: String(p.name || 'Капище').slice(0, 80), sid: sp.sid, t: ctx.now });
      S.progress('defend', 1);
      J.add('defend', { name: p.name, sid: sp.sid });
      return { ok: true, clan: S.d.clan };
    },
    // Мои защитники: где стоят; кого прогнали — вернулись домой с искрами за время на посту
    async myGuards(a, ctx) {
      if (!S.d.clan) return { list: [], back: [], got: [] };
      const list = await ctx.env.myHoldsList(S.d.pid);
      const standing = new Set(list.map(x => x.id)), back = [];
      S.d.guards = S.d.guards.filter(g => {
        if (standing.has(g.id)) return true;
        // 4.16: срок на посту вышел (Rules.HOLD.MAX_H) — защитник ушёл сам, а не побеждён; служба — до срока
        const tired = !Rules.holdFresh(g, ctx.now), ms = tired ? Rules.HOLD.MAX_H * 3600000 : Math.max(0, ctx.now - g.t);
        back.push({ ...g, hours: Math.round(ms / 360000) / 10, tired });
        return false;
      });
      // защитники, поставленные до 3.6, — тоже в список
      list.forEach(x => { if (!S.d.guards.some(g => g.id === x.id)) S.d.guards.push({ id: x.id, name: x.name, sid: x.sid, t: x.t || ctx.now }); });
      let got = [];
      if (back.length) {
        got = S.giveRewards({ sparks: back.reduce((s, g) => s + Rules.guardPay(g.hours), 0) });
        back.forEach(g => J.add('guardBack', { name: g.name, sid: g.sid, hours: g.hours }));
      }
      return { list, back, got };
    },
    // Сколько Капищ держит каждый открытый клан: по всему свету и в округе ~5 км
    async clanStats(a, ctx) {
      const p = ctx.pos;
      const box = p ? [p.lat - 0.045, p.lng - 0.045 / Math.max(0.2, Math.cos(p.lat * Math.PI / 180)), p.lat + 0.045, p.lng + 0.045 / Math.max(0.2, Math.cos(p.lat * Math.PI / 180))] : null;
      return { all: await ctx.env.clanCounts(null), near: box ? await ctx.env.clanCounts(box) : null };
    },
    // Дань: раз в день — за каждое Капище, где мой защитник на посту (4.16: «активная защита» — стоит не меньше
    // Rules.HOLD.TRIBUTE_H часов и срок ещё не вышел; не больше HOLD_MY_MAX Капищ). Если защитники есть, но ещё не
    // отстояли своё, день не закрывается — дань можно забрать позже (next — когда)
    async tribute(a, ctx) {
      this.need(S.d.clan, ru`Сначала выбери клан`);
      if (S.d.tributeDay === U.today(ctx.now)) return { n: 0, already: true };
      const H = Rules.HOLD, list = (await ctx.env.myHoldsList(S.d.pid)).filter(x => Rules.holdFresh(x, ctx.now));
      const n = Math.min(HOLD_MY_MAX, list.filter(x => Rules.holdHours(x.t, ctx.now) >= H.TRIBUTE_H).length);
      if (!n) {
        if (!list.length) { S.d.tributeDay = U.today(ctx.now); return { n: 0, got: [] }; }
        S.d.tributeNext = Math.min(...list.map(x => (+x.t || 0) + H.TRIBUTE_H * 3600000));
        return { n: 0, got: [], next: S.d.tributeNext };
      }
      S.d.tributeDay = U.today(ctx.now);
      if (!n) return { n: 0, got: [] };
      // 4.16: монеты — не больше чем с Rules.ZLAT.tributeMax Капищ (было 3 монеты с каждого, до 30 в день)
      // 4.28: с святилищ мифологии своего клана — искры и обереги ×Rules.HOLD.MYTH (Rules.tributeFor); сначала — они
      const mine = list.filter(x => Rules.holdHours(x.t, ctx.now) >= H.TRIBUTE_H && W.placeMyth({ id: x.id }) === S.d.clan).length;
      const T = Rules.tributeFor(n, mine);
      return { n, own: Math.min(n, mine), got: S.giveRewards({ sparks: T.sparks, charm: T.charm, zlat: Rules.ZLAT.tribute * Math.min(n, Rules.ZLAT.tributeMax) }) };
    },

    async invStart(a, ctx) {
      const p = await this.place(a.spring, ctx, 'spring');
      const e = W.springFor(p, 0);
      this.need(e.invaded, ru`Родник свободен`);
      this.near(ctx, p.lat, p.lng, W.INTERACT);
      const team = S.team();
      this.need(team.length, ru`Нужна команда`);
      this.readyTeam(team);
      this.dayNeed(ctx, 'invasions');
      this.limit(ctx, 'inv', 40, 3600000);
      ctx.srv.battle = { type: 'inv', invId: e.invId, name: e.name, start: ctx.now, team: team.map(x => x.uid), hp0: this.hpMap(team), tire: true };
      return { invId: e.invId };
    },
    invEnd(a, ctx) {
      const b = this.endBattle(ctx, 'inv');
      if (!a.win) { this.woundTeam(b, a.hp); return { win: false }; }
      const g = W.grunt({ invId: b.invId });
      this.woundTeam(b, a.hp, Rules.duelMinLoss(this.team(b.team), g.team, g.speed), Duel.HPX); // 4.26: как на Капище
      this.plausibleDuel(ctx, b, g.team, g.speed);
      S.d.freed[b.invId] = true;
      S.d.stats.invasions++;
      this.dayAdd(ctx, 'invasions');
      S.progress('invasion', 1);
      J.add('invasion', { name: b.name });
      const rw = S.giveRewards({ xp: 1000, sparks: 400, charm: 6, honey: 1, herb: 1 }); // 4.16: было ✦ 500, мёда 2, Живой воды 2
      const am = S.rollAmulet(0.04, b.invId); // 4.16: было 15%
      if (am) rw.push({ k: 'amulet', n: 1, label: AMULETS[am].name });
      const rescue = g.team[Math.floor(U.h('rescue', b.invId) * g.team.length)];
      ctx.srv.rescue = { sid: rescue.sid, lvl: Math.min(rescue.lvl, S.catchLvl()), seed: b.invId + ':rescue' };
      return { win: true, rw, rescue: { sid: rescue.sid, lvl: ctx.srv.rescue.lvl } };
    },

    /* ----- Лига: бои с живыми Ловчими (4.16) ----- */
    // прежний турнир с машинами закрыт: старый телефон узнаёт, что пора обновиться
    leagueStart() { this.fail(ru`Лига теперь — бои с живыми Ловчими. Обнови игру`); },
    leagueEnd() { this.fail(ru`Лига теперь — бои с живыми Ловчими. Обнови игру`); },
    // Экран Лиги: засчитать бои, закончившиеся без экрана; сундук сезона; идущий бой (вернуться в него)
    async leagueState(a, ctx) {
      League.st();
      const live = await this.leagueLive(ctx); // брошенный бой досчитывается здесь — и сразу засчитывается ниже
      const done = await this.leagueSettle(ctx, a.board), prize = this.leaguePrize();
      return { done, prize, live };
    },
    // Поиск соперника: телефон спрашивает раз в 2–3 секунды, пока не найдётся пара (или игрок не отменит поиск).
    // Круг поиска считает сервер — по времени ожидания, которое помнит он сам (srv.lq), а не телефон
    async pvpFind(a, ctx) {
      this.need(S.d.level >= League.LEVEL, ru`Лига открывается с ${League.LEVEL} уровня Ловчего`);
      const L = League.st();
      const live = await this.leagueLive(ctx);
      if (live) { ctx.srv.lq = null; return { match: live, done: [] }; }
      // прошлые бои — до нового поиска (жетоны, рейтинг, раны); засчитали — ответ сразу, чтобы итог сохранился,
      // даже если после боя в команде дух без сил (тогда следующий запрос поиска откажет)
      const done = await this.leagueSettle(ctx, a.board);
      if (done.length) { const r = League.rank(L.pts); return { wait: 0, n: 0, a: r, b: r, done }; }
      const team = S.team();
      this.need(team.length === 3, ru`Нужно три духа`);
      this.readyTeam(team);
      this.need(L.tickets > 0, ru`Жетоны кончились — приходи завтра`);
      this.limit(ctx, 'pvpFind', 3000, 3600000);
      const q = ctx.srv.lq && ctx.now - ctx.srv.lq.t < 15000 ? ctx.srv.lq : { since: ctx.now };
      q.t = ctx.now; ctx.srv.lq = q;
      const waited = (ctx.now - q.since) / 1000, w = League.window(L.pts, waited);
      const info = { pid: S.d.pid, name: S.d.name, look: this.safeLook(S.d.look), lvl: S.d.level, pts: L.pts, rank: League.rank(L.pts), clan: clanOf(S.d.clan),
        power: team.reduce((s, x) => s + S.power(x), 0), team: team.map(sp => PvP.fighter(sp)) };
      const r = await ctx.env.pvpFind({ season: L.season, pts: L.pts, lo: w.lo, hi: w.hi, info, avoid: L.last || null, wide: waited >= 30 });
      if (r && r.match) { ctx.srv.lq = null; return { match: r.match, done: [] }; }
      return { wait: Math.round(waited), n: r ? r.n | 0 : 0, a: w.a, b: w.b, done: [] };
    },
    async pvpCancel(a, ctx) {
      ctx.srv.lq = null;
      const r = await ctx.env.pvpCancel();
      return { match: r && r.match ? r.match : null }; // пара уже составлена — отменять поздно, бой начинается
    },
    // Итог боя: рейтинг, опыт, награды, раны — один раз (по номеру боя)
    async pvpResult(a, ctx) {
      League.st();
      return { done: await this.leagueSettle(ctx, a.board), prize: this.leaguePrize() };
    },

    /* ----- обмен духами ----- */
    // 3.18: передача духов по коду закрыта — ею обходили аукцион (и его комиссию). Духов продают на аукционе
    async tradeGive() { this.need(false, ru`Передача духов по коду закрыта — выставь духа на Аукцион`); },
    async tradeReceive() { this.need(false, ru`Передача духов по коду закрыта — продавай и покупай духов на Аукционе`); },
    // Неоткрытые посылки, отправленные до 3.18, возвращаются отправителю (при загрузке игры, один раз)
    async tradeReclaimAll(a, ctx) {
      if (S.d.tradeClosed || !(S.d.sent || []).length) { S.d.tradeClosed = 1; return 0; }
      let n = 0;
      for (const s of S.d.sent) {
        const m = String(s.code || '').match(/DUH2\.([A-Z2-9]{10})/);
        if (!m) continue;
        this.shared(ctx);
        const t = await ctx.env.tradeReclaim(m[1], S.d.pid);
        if (t && t.spirit && this.own(SP, t.spirit.s)) { S.addSpirit(this.unpackSpirit(t.spirit, ctx)); n++; }
      }
      S.d.sent = [];
      S.d.tradeClosed = 1;
      if (n) Bus.emit('toast', { text: ru`Неоткрытые посылки вернулись: духов — ${n}. Передача духов закрыта, теперь есть Аукцион.`, cls: 'good' });
      return n;
    },

    /* ----- аукцион духов ----- */
    // Поиск лотов: фильтры по виду, стихии, редкости, оценке Ордена и каждому показателю, силе, цене и валюте
    async auctionFind(a, ctx) {
      this.need(S.d.level >= Rules.AUCTION.LEVEL, ru`Аукцион открывается с ${Rules.AUCTION.LEVEL} уровня Ловчего`);
      this.limit(ctx, 'aucFind', 240, 3600000);
      const f = a.f || {}, n = (v, max) => U.clamp(Math.floor(+v) || 0, 0, max);
      const q = { from: n(a.from, 3000), sort: ['new', 'cheap', 'dear', 'power', 'iv'].includes(f.sort) ? f.sort : 'new', notPid: S.d.pid };
      const sids = Array.isArray(f.sids) ? f.sids.filter(s => this.own(SP, s)).slice(0, 60) : null;
      if (sids && sids.length) q.sids = sids;
      if (this.own(ELEMENTS, f.el)) q.el = f.el;
      if (this.own(RARITY, f.rar)) q.rar = +f.rar;
      if (f.cur === 'sparks' || f.cur === 'zlat') q.cur = f.cur;
      if (f.shiny) q.shiny = true;
      q.minIv = n(f.minIv, 100); q.minA = n(f.minA, 15); q.minD = n(f.minD, 15); q.minS = n(f.minS, 15);
      q.minPower = n(f.minPower, 1e6); q.minLvl = n(f.minLvl, 50); q.maxPrice = n(f.maxPrice, 1e9);
      const cap = S.catchLvl();
      if (f.mine) q.maxLvl = cap; // 4.16: «не выше моего уровня» — только духи, которые не урежутся при покупке
      const rows = (await ctx.env.lotsFind(q)).filter(r => r.spirit && this.own(SP, r.spirit.s));
      // 4.16: какой дух станет у покупателя — уровень не выше его уровня Ловчего, сила после урезания
      rows.forEach(r => { const sp = this.unpackSpirit(r.spirit, ctx, null, cap); r.myLvl = sp.lvl; r.myPower = S.power(sp); });
      return { lots: rows, cap };
    },
    // 4.16: подсказка цены — недавние сделки (Rules.AUCTION.RECENT дней) с духом того же вида, для уровня lvl
    async auctionPrice(a, ctx) {
      this.need(S.d.level >= Rules.AUCTION.LEVEL, ru`Аукцион открывается с ${Rules.AUCTION.LEVEL} уровня Ловчего`);
      this.need(typeof a.sid === 'string' && Object.prototype.hasOwnProperty.call(SP, a.sid), ru`Такого духа нет`);
      this.limit(ctx, 'aucPrice', 240, 3600000);
      const rows = await ctx.env.lotsRecent(a.sid, ctx.now - Rules.AUCTION.RECENT * 86400000);
      return { sid: a.sid, hint: Rules.auctionHint(rows, U.clamp(Math.floor(+a.lvl) || 0, 0, 50)) };
    },
    // Мои лоты; заодно — выручка за проданные и возврат снятых и истёкших духов
    async auctionMine(a, ctx) {
      this.need(S.d.level >= Rules.AUCTION.LEVEL, ru`Аукцион открывается с ${Rules.AUCTION.LEVEL} уровня Ловчего`);
      const got = await this.auctionSettle(ctx);
      return { got, lots: await ctx.env.lotsMine(S.d.pid), open: await ctx.env.lotsOpenCount(S.d.pid) };
    },
    async auctionSell(a, ctx) {
      const A = Rules.AUCTION;
      this.need(S.d.level >= A.LEVEL, ru`Аукцион открывается с ${A.LEVEL} уровня Ловчего`);
      const sp = this.spirit(a.uid);
      this.need(S.d.spirits.length > 1, ru`Нельзя продать последнего духа`);
      this.need(!sp.fav, ru`Сними с духа отметку «избранный», чтобы продать его`);
      this.need(!sp.bound, ru`Дух привязан к тебе: плёнка на обороте содрана — продать его нельзя`);
      const cur = a.cur === 'zlat' ? 'zlat' : 'sparks', price = Math.floor(+a.price);
      this.need(price >= A.MIN[cur] && price <= A.MAX[cur], cur === 'zlat' ? ru`Цена — от ${U.fmtNum(A.MIN[cur])} до ${U.fmtNum(A.MAX[cur])} монет` : ru`Цена — от ${U.fmtNum(A.MIN[cur])} до ${U.fmtNum(A.MAX[cur])} искр`);
      this.need(await ctx.env.lotsOpenCount(S.d.pid) < A.MAX_OPEN, ru`Одновременно можно выставить не больше ${A.MAX_OPEN} духов`);
      // 4.16: залог — списывается сразу, возвращается вместе с выручкой, если духа купят
      const deposit = Rules.auctionDeposit(cur, price);
      this.need((S.d[cur] || 0) >= deposit, cur === 'zlat' ? ru`Залог — ${deposit} ${U.plural(deposit, ru`монета`, ru`монеты`, ru`монет`)}: не хватает` : ru`Залог — ✦ ${U.fmtNum(deposit)}: не хватает искр`);
      this.limit(ctx, 'aucSell', A.PER_DAY, 86400000);
      const iv = sp.iv, s = SP[sp.sid];
      this.shared(ctx);
      const lot = await ctx.env.lotCreate({ seller_pid: S.d.pid, seller_name: S.d.name, spirit: this.packSpirit(sp), sid: sp.sid, el: s.el, rar: s.rar,
        lvl: sp.lvl, power: S.power(sp), iv_pct: S.ivPct(sp), iv_a: iv[0], iv_d: iv[1], iv_s: iv[2], shiny: !!sp.shiny, cur, price, deposit,
        expires_at: new Date(ctx.now + A.HOURS * 3600000).toISOString() });
      S.d[cur] -= deposit;
      this.detachSpirit(sp);
      J.add('auction', { sid: sp.sid, dir: 'sell', cur, price });
      return { id: lot.id, fee: Rules.auctionFee(price), deposit };
    },
    async auctionBuy(a, ctx) {
      this.need(S.d.level >= Rules.AUCTION.LEVEL, ru`Аукцион открывается с ${Rules.AUCTION.LEVEL} уровня Ловчего`);
      const id = String(a.id || '');
      const pre = await ctx.env.lotGet(id);
      this.need(pre, ru`Лот не найден`);
      this.need(pre.seller_pid !== S.d.pid, ru`Это твой собственный лот`);
      S.d.auc = S.d.auc || { got: {}, back: {}, paid: {} };
      this.need(!S.d.auc.got[id], ru`Этот лот уже у тебя`);
      // деньги проверяем ДО покупки, по цене из базы (цену с телефона не принимаем): иначе лот
      // пометился бы проданным, а покупатель ушёл бы ни с чем
      const cur = pre.cur === 'zlat' ? 'zlat' : 'sparks';
      this.need((S.d[cur] || 0) >= pre.price, cur === 'zlat' ? ru`Не хватает монет` : ru`Не хватает искр`);
      this.limit(ctx, 'aucBuy', 60, 3600000);
      this.shared(ctx);
      const lot = await ctx.env.lotBuy(id, S.d.pid, S.d.name);
      this.need(lot && lot.price === pre.price && lot.cur === pre.cur, ru`Лот уже купили или сняли с продажи`);
      S.d[cur] -= lot.price;
      const sp = this.unpackSpirit(lot.spirit, ctx, lot.seller_name, S.catchLvl());
      const isNew = S.addSpirit(sp);
      S.d.auc.got[lot.id] = ctx.now;
      S.d.stats.traded++; // знак «Щедрая душа»
      ctx.after.push(() => ctx.env.lotsDone([lot.id], 'delivered'));
      J.add('auction', { sid: sp.sid, dir: 'buy', cur, price: lot.price, who: sp.from });
      return { uid: sp.uid, isNew, cur, price: lot.price };
    },
    async auctionCancel(a, ctx) {
      this.shared(ctx);
      const lot = await ctx.env.lotCancel(String(a.id || ''), S.d.pid);
      this.need(lot, ru`Лот уже продан или снят`);
      S.d.auc = S.d.auc || { got: {}, back: {}, paid: {} };
      if (!S.d.auc.back[lot.id]) { S.addSpirit(this.unpackSpirit(lot.spirit, ctx)); S.d.auc.back[lot.id] = ctx.now; }
      ctx.after.push(() => ctx.env.lotsDone([lot.id], 'settled'));
      return { sid: lot.spirit.s };
    },

    /* ----- чат Ордена ----- */
    async chatList(a, ctx) {
      const ch = this.chatChannel(a.ch);
      this.limit(ctx, 'chatRead', 1200, 3600000);
      const rows = await ctx.env.chatList(ch, Math.max(0, Math.floor(+a.after) || 0));
      // 3.21: имя, уровень и клан в сообщении — на момент отправки; отдаём текущие (a.who — Ловчие уже показанных сообщений)
      const ask = [...new Set(rows.map(m => m.pid).concat(Array.isArray(a.who) ? a.who.slice(0, 40).map(String) : []))].filter(p => this.PID.test(p)).slice(0, 90);
      const who = {};
      try { const cur = await ctx.env.briefByPid(ask); Object.keys(cur).forEach(p => { const w = this.brief(cur[p]); who[p] = { name: w.name, lvl: w.lvl, clan: w.clan }; }); } catch (e) { /* покажем данные из сообщений */ }
      return { ch: a.ch, who, msgs: rows.map(m => { const w = who[m.pid]; return { id: m.id, pid: m.pid, name: w ? w.name : m.name, lvl: w ? w.lvl : m.lvl, clan: w ? w.clan : clanOf(m.clan), text: m.text, t: Date.parse(m.created_at), mine: m.pid === S.d.pid }; }) };
    },
    async chatSend(a, ctx) {
      const C = Rules.CHAT, ch = this.chatChannel(a.ch);
      this.need(S.d.level >= C.LEVEL, ru`Писать в чат можно с ${C.LEVEL} уровня Ловчего — читать можно уже сейчас`);
      const text = this.chatClean(a.text);
      this.need(text.length >= 1, ru`Напиши сообщение`);
      this.need(!/(https?:\/\/|www\.|t\.me\/|\b[a-z0-9-]{2,}\.(ru|com|net|org|me|io|su|xyz|рф)\b)/i.test(text), ru`Ссылки в чате запрещены — так безопаснее для всех`);
      const c = ctx.srv.chat = ctx.srv.chat || { t: 0, last: '' };
      this.need(ctx.now - c.t >= C.GAP, ru`Не так быстро — подожди пару секунд`);
      this.need(!(text === c.last && ctx.now - c.t < 60000), ru`Это сообщение уже отправлено`);
      this.limit(ctx, 'chat', C.PER_DAY, 86400000);
      c.t = ctx.now; c.last = text;
      this.shared(ctx);
      const m = await ctx.env.chatInsert({ channel: ch, pid: S.d.pid, name: S.d.name, lvl: S.d.level, clan: S.d.clan || null, text });
      return { msg: { id: m.id, pid: m.pid, name: m.name, lvl: m.lvl, clan: m.clan, text: m.text, t: Date.parse(m.created_at), mine: true } };
    },
    async chatReport(a, ctx) {
      const id = Math.floor(+a.id);
      this.need(id > 0, ru`Сообщение не найдено`);
      // 4.26: жалобы — как и сообщения, с Rules.CHAT.LEVEL уровня и не раньше 3 дней в игре: иначе три свежих Ловчих скрывали бы чужие сообщения
      const age = +S.d.created > 0 ? ctx.now - S.d.created : Infinity;
      this.need(S.d.level >= Rules.CHAT.LEVEL && age >= 3 * 86400000, ru`Жаловаться можно с ${Rules.CHAT.LEVEL} уровня и после 3 дней в игре`);
      this.limit(ctx, 'chatReport', 30, 86400000);
      this.shared(ctx);
      await ctx.env.chatReport(id, S.d.pid);
      return { ok: true };
    },

    /* ----- карточка Ловчего и таблица Лиги (3.21) ----- */
    // Открытая карточка любого Ловчего (из чата или таблицы Лиги): облик, уровень, клан, Лига, успехи, спутник
    async playerCard(a, ctx) {
      const pid = String(a.pid || '');
      this.need(this.PID.test(pid), ru`Ловчий не найден`);
      this.limit(ctx, 'card', 150, 3600000);
      const s = await ctx.env.friendSave(pid);
      this.need(s && s.data, ru`Ловчий не найден — возможно, он давно не заходил в игру`);
      const d = s.data, num = (v, max) => U.clamp(Math.floor(+v) || 0, 0, max);
      const b = this.brief(d), st = d.stats || {}, L = d.league || {};
      const spirits = Array.isArray(d.spirits) ? d.spirits.filter(x => x && this.own(SP, x.sid)) : [];
      const bud = d.buddy && spirits.find(x => x.uid === d.buddy.uid);
      const buddy = bud ? this.cleanSpirit(bud, 0) : null, best = this.topSpirits(d, 1)[0] || null;
      const pts = League.ratingOf(L); // 4.15: рейтинг (старые звёзды ×100; прошлый сезон — со срезом)
      const ago = s.seen ? ctx.now - Date.parse(s.seen) : Infinity;
      const mine = S.d.friends.some(x => x.id === pid), theirs = (Array.isArray(d.friends) ? d.friends : []).some(x => x && x.id === S.d.pid);
      const sp = x => x && { sid: x.sid, lvl: x.lvl, shiny: x.shiny, dark: x.dark, nick: x.nick, power: S.power(x) };
      return {
        pid, name: b.name, lvl: b.lvl, clan: b.clan, look: b.look, me: pid === S.d.pid,
        seen: ago < 15 * 60000 ? 'now' : ago < 86400000 ? 'today' : ago < 7 * 86400000 ? 'week' : 'long',
        days: +d.created > 0 ? Math.max(1, Math.ceil((ctx.now - Math.min(+d.created, ctx.now)) / 86400000)) : 0,
        dex: Object.values(d.dex || {}).filter(x => x && x.caught).length, caught: num(st.caught, 1e7), km: U.clamp(+st.km || 0, 0, 1e5),
        raids: num(st.raids, 1e6), duels: num(st.duels, 1e6), medals: Object.values(d.medals || {}).filter(t => t >= 3).length,
        league: { pts, rank: League.rank(pts), best: num(L.best, LEAGUE_RANKS.length - 1) },
        buddy: sp(buddy), best: sp(best),
        friend: mine && theirs ? 'mutual' : mine ? 'sent' : theirs ? 'wants' : null,
      };
    },
    // Таблица сезона Лиги с текущими уровнями, именами и обликами (user_id наружу не отдаём)
    // tier — тройка лучших в ранге игрока (пьедестал), rows — топ-50 сезона
    async leagueTop(a, ctx) {
      this.limit(ctx, 'leagueTop', 1500, 3600000);
      const L = League.st(), season = L.season, rank = League.rank(L.pts);
      let r = await ctx.env.leagueTop(season, rank);
      // своя строка отстала от рейтинга (перевод звёзд в рейтинг, брошенные турниры) — поправить и перечитать
      const mine = r.rows.find(x => x.me), had = mine ? mine.pts : r.me ? r.me.pts : null;
      if (a.board !== false && (L.pts > 0 || had != null) && had !== L.pts) {
        this.shared(ctx);
        await ctx.env.leagueScore({ season, name: S.d.name, pts: L.pts, rank, level: S.d.level, look: S.d.look });
        r = await ctx.env.leagueTop(season, rank);
      }
      const row = x => {
        const b = this.brief(x.cur) || this.brief({ name: x.name, level: x.level, look: x.look });
        return { pid: x.pid, name: b.name, lvl: b.lvl, clan: b.clan, look: b.look, pts: U.clamp(x.pts | 0, 0, League.MAXPTS), rank: U.clamp(x.rank | 0, 0, LEAGUE_RANKS.length - 1), me: !!x.me };
      };
      return { season, total: r.total | 0, me: r.me ? { place: r.me.place | 0, pts: r.me.pts | 0 } : null, rows: r.rows.map(row), tier: { rank, rows: (r.tier || []).map(row) } };
    },

    /* ----- друзья и подарки ----- */
    async friendAdd(a, ctx) {
      const pid = String(a.pid || '');
      this.need(this.PID.test(pid), ru`В коде ошибка`);
      this.need(pid !== S.d.pid, ru`Это твой собственный код дружбы`);
      this.limit(ctx, 'friendAdd', 30, 3600000); // перебор кодов дружбы
      const who = await ctx.env.player(pid);
      this.need(who, ru`Ловчий с таким кодом не найден — пусть он обновит игру`);
      let f = S.d.friends.find(x => x.id === pid), isNew = false;
      if (!f) {
        this.need(S.d.friends.length < 50, ru`Друзей уже 50 — это максимум`);
        f = { id: pid, name: who.name, lvl: who.level, pts: 0, added: ctx.now, sent: '', recv: '' };
        S.d.friends.push(f);
        J.add('friend', { name: f.name });
        isNew = true;
      } else { f.name = who.name; f.lvl = who.level; }
      f.linked = true;
      this.shared(ctx);
      await ctx.env.link(S.d.pid, pid, S.d.name, S.d.level);
      return { name: f.name, isNew };
    },
    // Профиль друга — только если дружба взаимная (он тоже добавил тебя)
    async friendProfile(a, ctx) {
      this.limit(ctx, 'profile', 60, 3600000);
      const { f, d, s } = await this.mutual(ctx, a.pid, 'profile');
      // чужое сохранение могло быть записано ещё телефоном (до 3.0) — только числа и известные значения
      const num = (v, max) => U.clamp(Math.floor(+v) || 0, 0, max);
      f.name = String(d.name || f.name).slice(0, 20); f.lvl = num(d.level, MAX_LEVEL) || f.lvl;
      // облик — только из известных вариантов (он попадает в картинку)
      const look = this.safeLook(d.look);
      if (look) f.look = look;
      const st = d.stats || {}, spirits = Array.isArray(d.spirits) ? d.spirits.filter(x => x && this.own(SP, x.sid)) : [];
      const top = this.topSpirits(d).map(x => ({ ...x, power: S.power(x) }));
      const buddy = d.buddy && spirits.find(x => x.uid === d.buddy.uid);
      const L = d.league || {};
      // 4.26: когда друг был в игре — не точное время: «сейчас» (меньше 10 минут назад) или с точностью до часа
      const seenT = s.seen ? Date.parse(s.seen) : NaN, seen = !Number.isFinite(seenT) ? null
        : ctx.now - seenT < 10 * 60000 ? 'now' : new Date(Math.floor(seenT / 3600000) * 3600000).toISOString();
      return {
        name: f.name, level: num(d.level, MAX_LEVEL) || 1, look, seen,
        dex: Object.values(d.dex || {}).filter(x => x && x.caught).length, caught: num(st.caught, 1e7), km: U.clamp(+st.km || 0, 0, 1e5),
        raids: num(st.raids, 1e6), duels: num(st.duels, 1e6), streak: num(d.streak && d.streak.n, 1e5),
        medals: Object.values(d.medals || {}).filter(t => t >= 3).length, rank: num(L.best, LEAGUE_RANKS.length - 1),
        buddy: buddy ? buddy.sid : null, top, pts: f.pts,
      };
    },
    // Поединок с другом: его три сильнейших духа под управлением игры. Награда — раз в день за каждого друга.
    async sparStart(a, ctx) {
      this.limit(ctx, 'spar', 30, 3600000);
      const { f, d } = await this.mutual(ctx, a.pid, 'duel');
      const foe = this.topSpirits(d);
      this.need(foe.length, ru`У ${f.name} пока нет духов`);
      const team = S.team();
      this.need(team.length, ru`Нужна команда`);
      ctx.srv.battle = { type: 'spar', pid: f.id, foe, start: ctx.now, team: team.map(x => x.uid) };
      return { foe, name: f.name, look: f.look || null, rewarded: f.spar === U.today(ctx.now) };
    },
    sparEnd(a, ctx) {
      const b = this.endBattle(ctx, 'spar');
      if (!a.win) return { win: false };
      this.plausibleDuel(ctx, b, b.foe, Duel.FOE.spar.speed);
      const f = S.d.friends.find(x => x.id === b.pid);
      this.need(f, ru`Такого друга нет`);
      J.add('spar', { name: f.name });
      // полная награда — раз в день за каждого друга и не больше 3 раз в день всего (3.19: было без общего предела —
      // с 50 друзьями до 25 000 ✦ и 40 000 опыта в день)
      const sd = S.d.sparDay = S.d.sparDay && S.d.sparDay.day === U.today(ctx.now) ? S.d.sparDay : { day: U.today(ctx.now), n: 0 };
      if (f.spar === U.today(ctx.now) || sd.n >= 3) { f.spar = U.today(ctx.now); return { win: true, rw: S.giveRewards({ xp: 100 }), practice: true }; }
      sd.n++;
      f.spar = U.today(ctx.now);
      S.progress('spar', 1);
      const rw = S.giveRewards({ xp: 800, sparks: 300, charm: 3, honey: 1 }); // 4.16: было ✦ 500
      this.friendPoint(f);
      return { win: true, rw, pts: f.pts };
    },
    friendRemove(a) { S.d.friends = S.d.friends.filter(f => f.id !== a.pid); return { ok: true }; },
    // Кто добавил меня (дружба взаимная) + подарки, которые ждут открытия
    async friendsSync(a, ctx) {
      const unlinked = S.d.friends.filter(x => !x.linked && this.PID.test(x.id));
      if (unlinked.length) this.shared(ctx);
      for (const f of unlinked) {
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
      const inbox = (await ctx.env.giftsTo(S.d.pid)).map(g => ({ id: g.id, from: g.from_pid, name: g.from_name, t: g.created_at, invite: !!g.invite }));
      return { added, inbox };
    },
    async giftSend(a, ctx) {
      const f = S.d.friends.find(x => x.id === a.pid);
      this.need(f, ru`Такого друга нет`);
      this.need(f.sent !== U.today(), ru`Сегодня этому другу подарок уже отправлен`);
      this.need(S.useItem('gift'), ru`Подарков нет — они попадаются в родниках`);
      const lv = (() => { let r = 0; FRIEND_LEVELS.forEach((x, i) => { if (f.pts >= x.pts) r = i; }); return r; })();
      const r = Math.random, c = { charm: 3 + Math.floor(r() * 4) };
      if (r() < 0.6) c.honey = 1 + Math.floor(r() * 2);
      if (r() < 0.4) c.water = 1;
      if (lv >= 2 && r() < 0.5) c.charm2 = 2;
      if (lv >= 3 && r() < 0.3) c.charm3 = 1;
      if (r() < 0.12 + lv * 0.03) c.cocoon = 5;
      this.shared(ctx);
      await ctx.env.giftCreate(S.d.pid, f.id, S.d.name, c);
      f.sent = U.today();
      S.progress('gift', 1);
      this.friendPoint(f);
      J.add('gift', { dir: 'out', name: f.name });
      return { ok: true };
    },
    async giftOpen(a, ctx) {
      const g = await ctx.env.gift(String(a.id || ''));
      this.need(g && g.to_pid === S.d.pid, ru`Подарок не найден`);
      this.need(!g.opened_at, ru`Подарок уже открыт`);
      const f = S.d.friends.find(x => x.id === g.from_pid);
      this.need(f, g.from_name ? ru`Сначала добавь ${g.from_name} в друзья` : ru`Сначала добавь отправителя в друзья`);
      this.need(f.recv !== U.today(), ru`Сегодня ты уже открывал подарок от этого друга — попробуй завтра`);
      this.shared(ctx);
      this.need(await ctx.env.giftTake(g.id, S.d.pid), ru`Подарок уже открыт`);
      f.recv = U.today();
      const { cocoon, ...items } = g.contents || {};
      const clean = {};
      for (const [k, n] of Object.entries(items)) if (this.own(ITEMS, k) && n > 0 && n <= 10) clean[k] = n | 0;
      // 4.16: опыт за открытый подарок — 100 + 50 за каждую ступень дружбы (было 200 + 100: до 600 за подарок)
      const got = S.giveRewards({ ...clean, xp: 100 + (() => { let r = 0; FRIEND_LEVELS.forEach((x, i) => { if (f.pts >= x.pts) r = i; }); return r; })() * 50 });
      if (cocoon && S.d.cocoons.length < 9) { S.d.cocoons.push({ id: U.uid(), km: 5, walked: 0, inc: S.incubating() < 3 }); got.push({ k: 'cocoon', n: 1, label: ru`Кокон ${5} км` }); }
      this.friendPoint(f);
      J.add('gift', { dir: 'in', name: f.name });
      return { name: f.name, got, pts: f.pts };
    },
  },
};
