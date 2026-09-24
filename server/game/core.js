'use strict';
/* Сервер игры «Духолов»: все действия игрока выполняются здесь, а не на телефоне.
   Телефон присылает намерение («бросил оберег», «зачерпнул родник», «усилил духа»), сервер проверяет его
   (расстояние до объекта, перезарядки, предметы в сумке, правдоподобие боя), сам бросает кубики
   и сохраняет результат. В ответ — изменения прогресса (diff.js) и события для окон и подсказок.
   Файл работает и в браузере (автотесты), и в Edge Function (см. build-server.ps1). */

class GameError extends Error {}

const GameCore = {
  MIN_CLIENT: '3.21.0', // 3.23: таблицу сезона клиент до 3.21 читал напрямую из базы — теперь это закрыто
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
        const h = a && typeof a.type === 'string' && Object.prototype.hasOwnProperty.call(this.H, a.type) ? this.H[a.type] : null; // только свои действия, без служебных полей объекта
        this.need(h, 'Неизвестное действие');
        if (!['newGame', 'load'].includes(a.type)) this.need(S.d, 'Прогресс не найден');
        ctx.results.push(await h.call(this, a.args || {}, ctx));
      }
      if (S.d && stats0) { const pts = Rules.orderPoints(stats0, S.d.stats, Ev.cur); this.orderAdd(ctx, pts); this.passAdd(ctx, pts); }
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
  // Сезонная тропа: сезон — календарный месяц по часам игрока
  passSeason(ctx) { const d = U.local(ctx.now); return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`; },
  passState(ctx) {
    const season = this.passSeason(ctx);
    if (!S.d.pass || S.d.pass.season !== season) S.d.pass = { season, pts: 0, gold: false, got: { free: [], gold: [] } };
    return S.d.pass;
  },
  passAdd(ctx, pts) { if (pts > 0) this.passState(ctx).pts += pts; },
  // Награда: предметы, искры, златники + кокон, случайный амулет, облик
  grant(rw) {
    const { cocoon, amulet, look, ...rest } = rw;
    const got = S.giveRewards(rest);
    if (cocoon) { S.d.cocoons.push({ id: U.uid(), km: cocoon, walked: 0, inc: S.incubating() < 3 }); got.push({ k: 'cocoon', n: 1, km: cocoon, label: `Кокон ${cocoon} км` }); }
    if (amulet) { const am = S.rollAmulet(1, 'gift' + U.uid()); got.push({ k: 'amulet', n: 1, id: am, label: AMULETS[am].name }); }
    if (look) {
      S.d.owned[look] = true;
      const x = LOOK.cloak.find(c => c.c === look) || LOOK.emblem.find(m => m.id === look);
      got.push({ k: 'look', n: 1, look, label: x ? `Облик: ${x.name}` : 'Облик' });
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
      purified: !!x.purified, move2: !!x.move2, amulet: AMULETS[x.amulet] ? x.amulet : null, nick: x.nick ? this.cleanText(x.nick, 16) || null : null };
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
      if (!r.spirit || !SP[r.spirit.s]) continue;
      if (r.status === 'sold') {
        if (A.paid[r.id]) continue;
        const cur = r.cur === 'zlat' ? 'zlat' : 'sparks', net = r.price - Rules.auctionFee(r.price);
        S.d[cur] = (S.d[cur] || 0) + net;
        A.paid[r.id] = ctx.now;
        S.d.stats.traded++;
        got.push({ type: 'sold', sid: r.spirit.s, cur, price: r.price, net, buyer: String(r.buyer_name || '').slice(0, 20) });
        J.add('auction', { sid: r.spirit.s, dir: 'sold', cur, price: net, who: r.buyer_name });
      } else {
        if (A.back[r.id]) continue;
        S.addSpirit(this.unpackSpirit(r.spirit, ctx));
        A.back[r.id] = ctx.now;
        got.push({ type: r.status, sid: r.spirit.s });
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
    springs: 'Сегодня ты уже зачерпнул силу из 30 родников — они снова откроются завтра',
    raids: 'Сегодня закрыто уже 6 Разломов — Навь затихла до завтра',
    duels: 'Сегодня уже 8 побед на Капищах — хранители ждут тебя завтра',
    invasions: 'Сегодня отбито уже 6 вторжений — Навь вернётся завтра',
    catches: 'Сегодня поймано уже 120 духов — обереги отдохнут до завтра',
  },
  dayNeed(ctx, key) { this.need((this.dayc(ctx)[key] || 0) < Rules.DAILY[key], this.DAY_MSG[key]); },
  dayAdd(ctx, key) { const c = this.dayc(ctx); c[key] = (c[key] || 0) + 1; },
  // Канал чата: общий, торговля, разломы, помощь или своя дружина
  chatChannel(ch) {
    if (ch === 'clan') { this.need(S.d.clan, 'Канал дружины — для тех, кто в дружине'); return 'clan:' + S.d.clan; }
    this.need(['all', 'trade', 'raid', 'help'].includes(ch), 'Такого канала нет');
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
  packSpirit(sp) { return { s: sp.sid, l: sp.lvl, i: sp.iv, y: sp.shiny ? 1 : 0, d: sp.dark ? 1 : 0, n: sp.nick || '', p: sp.purified ? 1 : 0, m: sp.move2 ? 1 : 0 }; },
  unpackSpirit(p, ctx, from) {
    this.need(p && SP[p.s], 'Посылка повреждена');
    const iv = (Array.isArray(p.i) ? p.i : []).slice(0, 3).map(v => U.clamp(Math.floor(+v) || 0, 0, 15));
    while (iv.length < 3) iv.push(0);
    const sp = { uid: U.uid(), sid: p.s, lvl: U.clamp(Math.min(+p.l || 1, S.maxLvl()), 1, 50), iv, t: ctx.now, fav: false, nick: this.cleanText(p.n, 16) || null };
    if (from) sp.from = this.cleanText(from, 20);
    if (p.y) sp.shiny = true;
    if (p.d) sp.dark = true;
    if (p.p) sp.purified = true;
    if (p.m) sp.move2 = true;
    return sp;
  },
  // Текст от игрока (имя, кличка духа): без управляющих символов и символов разметки, пробелы схлопнуты
  cleanText(s, max) { return String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/[<>"'`&\\]/g, '').trim().replace(/\s+/g, ' ').slice(0, max); },
  safeLook(lk) {
    lk = lk || {};
    return LOOK.cloak.some(x => x.c === lk.cloak) && LOOK.eyes.some(x => x.c === lk.eyes) && LOOK.emblem.some(x => x.id === lk.emblem)
      ? { cloak: lk.cloak, eyes: lk.eyes, emblem: lk.emblem } : null;
  },
  // 3.21: текущие данные Ловчего из его сохранения — только проверенные значения (попадают в разметку)
  brief(b) {
    if (!b) return null;
    return { name: this.cleanText(b.name, 20) || 'Ловчий', lvl: U.clamp(Math.floor(+b.level) || 1, 1, MAX_LEVEL), clan: CLANS[b.clan] ? b.clan : null, look: this.safeLook(b.look) };
  },
  roomMember() {
    const team = S.team();
    return { pid: S.d.pid, name: String(S.d.name).slice(0, 20), look: this.safeLook(S.d.look), lvl: S.d.level, power: team.reduce((a, x) => a + S.power(x), 0), sid: team[0] ? team[0].sid : null };
  },
  roomView(r) {
    return { code: r.code, status: r.status, rift: r.rift, isHost: r.host_pid === S.d.pid, hpMul: 1 + 0.8 * (r.members.length - 1),
      members: r.members.map((m, i) => ({ name: String(m.name || 'Ловчий').slice(0, 20), look: m.look, lvl: m.lvl, power: m.power, sid: m.sid, host: i === 0, me: m.pid === S.d.pid })) };
  },
  // Защитники Капища в бою — три сильнейших
  holdTeam(hold) {
    return hold.holders.filter(h => h && h.sp && SP[h.sp.sid]).map((h, i) => this.cleanSpirit(h.sp, i))
      .map(x => ({ x, p: S.power(x) })).sort((a, b) => b.p - a.p).slice(0, 3).map(o => o.x);
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
      if (!S.d.tradeClosed) await this.H.tradeReclaimAll.call(this, {}, ctx); // 3.18: вернуть неоткрытые посылки
      return { ok: true };
    },
    async newGame(a, ctx) {
      this.need(!S.d, 'Прогресс уже есть');
      const name = this.cleanText(a.name, 16);
      this.need(name.length >= 1, 'Назови себя');
      this.need(this.STARTERS.includes(a.starter), 'Выбери первого духа');
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
        got.push({ k: 'cocoon', n: 1, label: 'Кокон 10 км' });
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
        this.dayNeed(ctx, 'catches');
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
        return this.openEnc(ctx, { mode: 'story', sid: S.d.storyGift, lvl: Math.min(25, S.maxLvl()), seed: 'gift' + S.d.created });
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
      if (e.mode === 'wild') this.dayAdd(ctx, 'catches');
      const isNew = S.addSpirit(sp);
      J.add('catch', { sid: s.id, shiny: !!sp.shiny, dark: !!sp.dark, power: S.power(sp) });
      const rw = Rules.catchReward({ mode: e.mode, sid: e.sid, isNew, ringXp: bonus.xp, throws: e.throws, shiny: sp.shiny, boost: e.boost });
      S.addEssence(s.fam, rw.ess);
      S.d.sparks += rw.sparks;
      S.d.stats.caught++;
      S.addXP(rw.xp);
      S.progress('catch', 1); S.progress('catchEl', 1, { el: s.el });
      if (s.land) S.progress('land', 1); // дух родной земли — для Летописи
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
      this.dayNeed(ctx, 'springs');
      const e = W.springFor(p, 0);
      this.need(!e.invaded, 'Родник захвачен Навью');
      this.need(e.ready, 'Родник ещё набирает силу');
      S.d.springs[p.id] = ctx.now;
      this.dayAdd(ctx, 'springs');
      const { loot, cocoon } = W.springLoot(p.id);
      const got = S.giveRewards({ ...loot, xp: 50 }, false); // добыча родника соблюдает лимит сумки
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
      return { got, cocoon: coc, task, full: S.bagCount() >= S.bagLimit() };
    },
    incense(a, ctx) {
      this.need(!S.incenseActive(), 'Ладан ещё горит');
      this.need(S.useItem('incense'), 'Ладана нет');
      S.d.incenseUntil = ctx.now + 30 * 60000;
      return { until: S.d.incenseUntil };
    },
    // Выбросить предметы из сумки (освободить место)
    discard(a) {
      const k = String(a.k || ''), have = (ITEMS[k] && S.d.items[k]) || 0, n = Math.floor(+a.n);
      this.need(have > 0, 'Такого предмета в сумке нет');
      this.need(n >= 1 && n <= have, `Можно выбросить от 1 до ${have}`);
      S.d.items[k] -= n;
      return { k, n, left: S.d.items[k] };
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
      const sp = this.spirit(a.uid), v = this.cleanText(a.nick, 16);
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
      this.need(!m.story || S.d.story.ch >= m.story, 'Эта эмблема — награда за Летопись');
      this.need((!c.shop && !c.pass) || S.d.owned[c.c], c.shop ? 'Этот плащ продаётся в Лавке Ордена' : 'Этот плащ — награда Золотой тропы');
      this.need(!m.pass || S.d.owned[m.id], 'Знак Тропы — награда Золотой тропы');
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
      return { got: S.giveRewards({ ...Rules.QUEST_BONUS, xp: 1000, zlat: Rules.ZLAT.questBonus }) };
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
      S.progress('task', 1);
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
      // совместный бой: число союзников и место разлома — из комнаты на сервере, а не со слов телефона
      let coop = null, rift = a.rift;
      if (a.coop && a.coop.code) {
        const room = await ctx.env.roomGet(String(a.coop.code).toUpperCase());
        this.need(room && room.status === 'started' && ctx.now - Date.parse(room.started_at) < 10 * 60000, 'Совместный бой не найден — начните заново');
        this.need(room.members.some(m => m.pid === S.d.pid), 'Ты не в этом разломе');
        coop = { host: room.host_pid === S.d.pid, allies: U.clamp(room.members.length - 1, 0, 3), code: room.code };
        rift = { id: room.rift.poi, lat: room.rift.lat, lng: room.rift.lng, name: room.rift.place };
      }
      const p = await this.place(rift, ctx, 'shrine');
      const hour = Math.floor(ctx.now / 3600000);
      // бой мог начаться за минуту до смены часа
      const r = W.riftFor(p, 0, hour) || (ctx.now % 3600000 < 90000 ? W.riftFor(p, 0, hour - 1) : null);
      this.need(r, 'Разлом уже закрылся');
      this.need(!S.d.rifts[r.id], 'Этот разлом ты уже закрыл');
      // дальний бой: вместо того чтобы подойти — грамота Ордена (до Rules.FAR.R от игрока)
      const far = !coop && !!a.far;
      if (far) {
        this.near(ctx, p.lat, p.lng, Rules.FAR.R);
        this.need((S.d.items.farpass || 0) > 0, 'Нужен Дальний пропуск — его можно купить в Лавке');
      } else if (!coop || coop.host) this.near(ctx, p.lat, p.lng, W.BATTLE_R);
      const team = S.team();
      this.need(team.length, 'Нужна команда');
      this.dayNeed(ctx, 'raids'); // до списания Дальнего пропуска
      this.limit(ctx, 'raid', 30, 3600000);
      if (far) S.d.items.farpass--;
      ctx.srv.battle = { type: 'raid', rid: r.id, poi: p, tier: r.tier, boss: r.boss, start: ctx.now, team: team.map(x => x.uid), coop, waters: 0, far };
      return { rid: r.id, tier: r.tier, boss: r.boss, far };
    },
    /* ----- совместный разлом: комната на сервере ----- */
    async roomCreate(a, ctx) {
      const p = await this.place(a.rift, ctx, 'shrine');
      const r = W.riftFor(p, 0, Math.floor(ctx.now / 3600000));
      this.need(r, 'Разлом уже закрылся');
      this.need(!S.d.rifts[r.id], 'Этот разлом ты уже закрыл');
      this.near(ctx, p.lat, p.lng, W.BATTLE_R);
      this.limit(ctx, 'room', 20, 3600000);
      const rift = { id: r.id, tier: r.tier, boss: r.boss, endsAt: r.endsAt, poi: p.id, lat: p.lat, lng: p.lng, place: p.name }; // как у разлома на карте
      for (let i = 0; i < 5; i++) {
        const code = U.code(5, this.ROOM_ALPHA);
        const room = await ctx.env.roomCreate({ code, host_pid: S.d.pid, rift, members: [this.roomMember()] });
        if (room) return this.roomView(room);
      }
      this.fail('Не получилось создать разлом — попробуй ещё раз');
    },
    async roomJoin(a, ctx) {
      const code = String(a.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      this.need(code.length === 5, 'Код разлома — 5 символов');
      this.limit(ctx, 'roomJoin', 60, 3600000);
      const r = await ctx.env.roomJoin(code, this.roomMember());
      this.need(r && !r.error, (r && r.error) || 'Разлом с таким кодом не найден');
      return this.roomView(r);
    },
    async roomState(a, ctx) {
      const r = await ctx.env.roomGet(String(a.code || '').toUpperCase());
      this.need(r && r.status !== 'closed', 'Хозяин закрыл разлом');
      this.need(r.members.some(m => m.pid === S.d.pid), 'Ты больше не в этом разломе');
      return this.roomView(r);
    },
    async roomStart(a, ctx) {
      const code = String(a.code || '').toUpperCase(), r = await ctx.env.roomGet(code);
      this.need(r && r.host_pid === S.d.pid, 'Начать бой может только хозяин разлома');
      this.need(r.members.length >= 2, 'Ждём хотя бы одного друга');
      const s = await ctx.env.roomStart(code, S.d.pid);
      this.need(s, 'Бой уже начался');
      return this.roomView(s);
    },
    async roomLeave(a, ctx) {
      const code = String(a.code || '').toUpperCase();
      if (/^[A-Z0-9]{5}$/.test(code)) await ctx.env.roomLeave(code, S.d.pid);
      return { ok: true };
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
      this.dayAdd(ctx, 'raids');
      S.progress('raid', 1);
      if (b.coop && b.coop.allies > 0) S.progress('coop', 1);
      const rw = S.giveRewards({ xp: Math.round(1000 * tier * (allies ? 1.25 : 1)), sparks: 400 * tier, charm: 5, honey: 2 + tier, water: 2, charm2: tier >= 2 ? 3 : 0 });
      const am = S.rollAmulet([0.25, 0.4, 0.7][tier - 1], b.rid);
      if (am) rw.push({ k: 'amulet', n: 1, label: AMULETS[am].name });
      const bonus = Math.max(0, Math.floor((90 - t) / 15));
      const charms = Raid.TIER[tier].charms + bonus + (Ev.cur.rifts ? 3 : 0) + allies * 2;
      const shiny = U.h('rshiny', b.rid, S.d.created) < Sky.shinyRate(1 / 20);
      ctx.srv.raidWin = { rid: b.rid, sid: b.boss, lvl: Math.min(Raid.TIER[tier].lvl, S.maxLvl()), // не выше доступного игроку уровня
        charms, shiny, boost: Sky.boosted(SP[b.boss].el) };
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
      // Капище держит дружина — сражаться придётся с её защитниками (тремя сильнейшими)
      const hold = await ctx.env.holdGet(p.id);
      this.need(!hold || !S.d.clan || hold.clan !== S.d.clan, 'Капище держит твоя дружина — здесь можно поставить защитника');
      const ht = hold ? this.holdTeam(hold) : [], foe = ht.length ? ht : null;
      this.dayNeed(ctx, 'duels');
      this.limit(ctx, 'duel', 40, 3600000);
      ctx.srv.battle = { type: 'duel', id: e.id, tier: e.tier, name: e.name, start: ctx.now, team: team.map(x => x.uid),
        foe, hold: hold ? { clan: hold.clan, ver: hold.ver } : null };
      return { id: e.id, tier: e.tier, foe, clan: hold ? hold.clan : null, holders: hold ? hold.holders.map(h => String(h.name || 'Ловчий').slice(0, 20)) : null };
    },
    async duelEnd(a, ctx) {
      const b = this.endBattle(ctx, 'duel');
      if (!a.win) return { win: false };
      const e = { id: b.id, tier: b.tier, name: b.name };
      this.plausibleDuel(ctx, b, b.foe || W.guardian(e).team);
      const T = SHRINE_TIERS[e.tier], mul = Ev.duelMul(), t = e.tier;
      S.d.shrines[e.id] = U.today();
      let freed = false;
      if (b.hold) {
        freed = await ctx.env.holdDefeat(e.id, b.hold.ver); // защитники могли смениться за время боя — тогда Капище не освобождается
        if (freed) S.d.stats.freed = (S.d.stats.freed || 0) + 1;
      }
      J.add('duel', { name: e.name, guard: b.hold ? CLANS[b.hold.clan].name : W.guardian(e).name, tier: t });
      S.d.stats.duels++;
      this.dayAdd(ctx, 'duels');
      S.progress('duel', 1);
      const rw = S.giveRewards({ xp: T.xp * mul, sparks: T.sparks * mul, charm: 5 * mul, honey: t * mul, water: 2, charm2: t >= 2 ? 3 * mul : 0, charm3: t === 3 ? 2 * mul : 0 });
      const am = S.rollAmulet(0.15 * t, e.id);
      if (am) rw.push({ k: 'amulet', n: 1, label: AMULETS[am].name });
      return { win: true, rw, freed, clan: b.hold ? b.hold.clan : null };
    },

    /* ----- Лавка Ордена ----- */
    shopBuy(a, ctx) {
      const today = U.today(ctx.now), id = String(a.id || '');
      let it;
      if (a.deal) {
        it = Rules.shopDeal(today);
        this.need(S.d.shop.deal !== today, 'Товар дня уже куплен — завтра будет новый');
      } else if (id.startsWith('look:')) {
        const key = id.slice(5), x = LOOK.cloak.find(c => c.c === key && c.shop);
        this.need(x, 'Такого товара нет');
        this.need(!S.d.owned[key], 'Этот плащ уже твой');
        it = { id, name: `Плащ «${x.name}»`, cur: 'zlat', price: x.shop, look: key };
      } else {
        it = Rules.SHOP.find(x => x.id === id);
        this.need(it, 'Такого товара нет');
      }
      if (it.bag) {
        this.need(S.d.bagExtra < Rules.BAG_MAX_UP, 'Сумка уже расширена до предела');
        it = { ...it, price: Rules.bagPrice(S.d.bagExtra) };
      }
      this.need(!it.lvl || S.d.level >= it.lvl, `Откроется на ${it.lvl} уровне`);
      if (it.cocoon) this.need(S.d.cocoons.length < 9, 'Коконов уже девять — выведи кого-нибудь');
      if (it.give) {
        const n = Object.values(it.give).reduce((s, x) => s + x, 0);
        this.need(S.bagCount() + n <= S.bagLimit(), 'Сумка полна — освободи место или расширь её');
      }
      const key = it.cur === 'sparks' ? 'sparks' : 'zlat';
      this.need((S.d[key] || 0) >= it.price, key === 'sparks' ? 'Не хватает искр' : 'Не хватает златников');
      this.limit(ctx, 'shop', 120, 3600000);
      S.d[key] -= it.price;
      let got;
      if (it.bag) { S.d.bagExtra++; got = [{ k: 'bag', n: Rules.BAG_STEP, label: 'Мест в сумке' }]; }
      else got = this.grant({ ...(it.give || {}), cocoon: it.cocoon || 0, amulet: it.amulet ? 1 : 0, look: it.look || null });
      if (a.deal) S.d.shop.deal = today;
      J.add('shop', { name: it.name });
      return { got, price: it.price, cur: key };
    },

    // Казна: начислить оплаченные наборы златников. Номер оплаты запоминается в прогрессе (paid) —
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
        J.add('pay', { zlat });
      }
      if (rows.length) ctx.after.push(() => ctx.env.payCredited(rows.map(r => r.id)));
      return { zlat, n: packs.length };
    },
    // Обменник: искры → златники, по курсу Rules.EXCHANGE и не больше DAY обменов в день
    exchange(a, ctx) {
      const E = Rules.EXCHANGE, today = U.today(ctx.now), n = Math.floor(+a.n);
      const ex = S.d.shop.ex && S.d.shop.ex.day === today ? S.d.shop.ex : (S.d.shop.ex = { day: today, n: 0 });
      this.need(n >= 1 && ex.n + n <= E.DAY, ex.n >= E.DAY ? 'Обменник на сегодня закрыт — приходи завтра' : `Сегодня можно обменять ещё ${E.DAY - ex.n} раз`);
      this.need(S.d.sparks >= E.SPARKS * n, 'Не хватает искр');
      S.d.sparks -= E.SPARKS * n;
      S.d.zlat = (S.d.zlat || 0) + E.ZLAT * n;
      ex.n += n;
      J.add('exchange', { sparks: E.SPARKS * n, zlat: E.ZLAT * n });
      return { sparks: E.SPARKS * n, zlat: E.ZLAT * n, left: E.DAY - ex.n };
    },

    /* ----- Сезонная тропа ----- */
    passClaim(a, ctx) {
      const P = this.passState(ctx), lvl = a.lvl | 0, track = a.track === 'gold' ? 'gold' : 'free';
      this.need(lvl >= 1 && lvl <= Rules.PASS.LEVELS, 'Такой ступени нет');
      this.need(Rules.passLevel(P.pts) >= lvl, 'Ступень ещё не пройдена');
      this.need(track === 'free' || P.gold, 'Сначала открой Золотую тропу');
      this.need(!P.got[track].includes(lvl), 'Награда уже получена');
      P.got[track].push(lvl);
      let rw = Rules.passReward(track, lvl);
      if (rw.cocoon && S.d.cocoons.length >= 9) rw = { ...rw, cocoon: 0, zlat: (rw.zlat || 0) + 40 }; // коконов некуда класть — златниками
      return { got: this.grant(rw) };
    },
    passGold(a, ctx) {
      const P = this.passState(ctx);
      this.need(!P.gold, 'Золотая тропа уже открыта');
      this.need(S.d.zlat >= Rules.PASS.GOLD, `Нужно ${Rules.PASS.GOLD} златников`);
      S.d.zlat -= Rules.PASS.GOLD;
      P.gold = true;
      J.add('passGold', { season: P.season });
      return { ok: true };
    },

    /* ----- дружины ----- */
    clanJoin(a) {
      this.need(S.d.level >= CLAN_LEVEL, `Дружину можно выбрать с ${CLAN_LEVEL} уровня`);
      this.need(!S.d.clan, 'Дружина уже выбрана');
      this.need(CLANS[a.clan], 'Такой дружины нет');
      S.d.clan = a.clan;
      J.add('clan', { clan: a.clan });
      return { clan: a.clan };
    },
    // Поставить духа защищать Капище: свободное — после своей победы здесь сегодня, своей дружины — если есть место
    async shrineDefend(a, ctx) {
      this.need(S.d.clan, 'Сначала выбери дружину');
      const p = await this.place(a.shrine, ctx, 'shrine');
      this.near(ctx, p.lat, p.lng, W.BATTLE_R);
      const sp = this.spirit(a.uid);
      const hold = await ctx.env.holdGet(p.id);
      if (!hold) this.need(S.d.shrines[p.id] === U.today(ctx.now), 'Сначала победи на этом Капище');
      else {
        this.need(hold.clan === S.d.clan, 'Капище держит другая дружина — сначала победи её защитников');
        this.need(hold.holders.length < HOLD_MAX, `На Капище уже ${HOLD_MAX} защитников`);
        this.need(!hold.holders.some(h => h.pid === S.d.pid), 'Твой защитник уже стоит здесь');
      }
      this.need((await ctx.env.myHolds(S.d.pid)) < HOLD_MY_MAX, `Твои защитники уже стоят на ${HOLD_MY_MAX} Капищах`);
      this.limit(ctx, 'defend', 30, 3600000);
      const ok = await ctx.env.holdDefend(p.id, p.lat, p.lng, S.d.clan, { pid: S.d.pid, name: S.d.name, sp: this.cleanSpirit(sp, 0), t: ctx.now });
      this.need(ok, 'Капище только что изменилось — открой его заново');
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
        back.push({ ...g, hours: Math.round(Math.max(0, ctx.now - g.t) / 360000) / 10 });
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
    // Сколько Капищ держит каждая дружина: по всей России и в округе ~5 км
    async clanStats(a, ctx) {
      const p = ctx.pos;
      const box = p ? [p.lat - 0.045, p.lng - 0.045 / Math.max(0.2, Math.cos(p.lat * Math.PI / 180)), p.lat + 0.045, p.lng + 0.045 / Math.max(0.2, Math.cos(p.lat * Math.PI / 180))] : null;
      return { all: await ctx.env.clanCounts(null), near: box ? await ctx.env.clanCounts(box) : null };
    },
    // Дань: раз в день — за каждое Капище, где стоит мой защитник
    async tribute(a, ctx) {
      this.need(S.d.clan, 'Сначала выбери дружину');
      if (S.d.tributeDay === U.today(ctx.now)) return { n: 0, already: true };
      const n = Math.min(HOLD_MY_MAX, await ctx.env.myHolds(S.d.pid));
      S.d.tributeDay = U.today(ctx.now);
      if (!n) return { n: 0, got: [] };
      return { n, got: S.giveRewards({ sparks: TRIBUTE.sparks * n, charm: TRIBUTE.charm * n, zlat: Rules.ZLAT.tribute * n }) };
    },

    async invStart(a, ctx) {
      const p = await this.place(a.spring, ctx, 'spring');
      const e = W.springFor(p, 0);
      this.need(e.invaded, 'Родник свободен');
      this.near(ctx, p.lat, p.lng, W.INTERACT);
      const team = S.team();
      this.need(team.length, 'Нужна команда');
      this.dayNeed(ctx, 'invasions');
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
      this.dayAdd(ctx, 'invasions');
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
      // строка таблицы сезона — после каждой победы (3.21.1: писалась только в конце турнира, и звёзды брошенного турнира в неё не попадали)
      if (a.board !== false && (gained || last)) ctx.after.push(() => ctx.env.leagueScore({ season: L.season, name: S.d.name, stars: L.stars, rank: rNew, level: S.d.level, look: S.d.look }));
      if (last) {
        J.add('league', { won: run.won, rank: LEAGUE_RANKS[rNew].name });
        L.run = null;
      } else {
        run.k++;
        ctx.srv.battle = { type: 'league', k: run.k, start: ctx.now, team: run.team };
      }
      return res;
    },

    /* ----- обмен духами ----- */
    // 3.18: передача духов по коду закрыта — ею обходили аукцион (и его комиссию). Духов продают на аукционе
    async tradeGive() { this.need(false, 'Передача духов по коду закрыта — выставь духа на Аукцион'); },
    async tradeReceive() { this.need(false, 'Передача духов по коду закрыта — продавай и покупай духов на Аукционе'); },
    // Неоткрытые посылки, отправленные до 3.18, возвращаются отправителю (при загрузке игры, один раз)
    async tradeReclaimAll(a, ctx) {
      if (S.d.tradeClosed || !(S.d.sent || []).length) { S.d.tradeClosed = 1; return 0; }
      let n = 0;
      for (const s of S.d.sent) {
        const m = String(s.code || '').match(/DUH2\.([A-Z2-9]{10})/);
        if (!m) continue;
        const t = await ctx.env.tradeReclaim(m[1], S.d.pid);
        if (t && t.spirit && SP[t.spirit.s]) { S.addSpirit(this.unpackSpirit(t.spirit, ctx)); n++; }
      }
      S.d.sent = [];
      S.d.tradeClosed = 1;
      if (n) Bus.emit('toast', { text: `Неоткрытые посылки вернулись: духов — ${n}. Передача духов закрыта, теперь есть Аукцион.`, cls: 'good' });
      return n;
    },

    /* ----- аукцион духов ----- */
    // Поиск лотов: фильтры по виду, стихии, редкости, оценке Ордена и каждому показателю, силе, цене и валюте
    async auctionFind(a, ctx) {
      this.need(S.d.level >= Rules.AUCTION.LEVEL, `Аукцион открывается с ${Rules.AUCTION.LEVEL} уровня Ловчего`);
      this.limit(ctx, 'aucFind', 240, 3600000);
      const f = a.f || {}, n = (v, max) => U.clamp(Math.floor(+v) || 0, 0, max);
      const q = { from: n(a.from, 3000), sort: ['new', 'cheap', 'dear', 'power', 'iv'].includes(f.sort) ? f.sort : 'new', notPid: S.d.pid };
      const sids = Array.isArray(f.sids) ? f.sids.filter(s => SP[s]).slice(0, 60) : null;
      if (sids && sids.length) q.sids = sids;
      if (ELEMENTS[f.el]) q.el = f.el;
      if (RARITY[f.rar]) q.rar = +f.rar;
      if (f.cur === 'sparks' || f.cur === 'zlat') q.cur = f.cur;
      if (f.shiny) q.shiny = true;
      q.minIv = n(f.minIv, 100); q.minA = n(f.minA, 15); q.minD = n(f.minD, 15); q.minS = n(f.minS, 15);
      q.minPower = n(f.minPower, 1e6); q.minLvl = n(f.minLvl, 50); q.maxPrice = n(f.maxPrice, 1e9);
      const rows = await ctx.env.lotsFind(q);
      return { lots: rows.filter(r => r.spirit && SP[r.spirit.s]) };
    },
    // Мои лоты; заодно — выручка за проданные и возврат снятых и истёкших духов
    async auctionMine(a, ctx) {
      this.need(S.d.level >= Rules.AUCTION.LEVEL, `Аукцион открывается с ${Rules.AUCTION.LEVEL} уровня Ловчего`);
      const got = await this.auctionSettle(ctx);
      return { got, lots: await ctx.env.lotsMine(S.d.pid), open: await ctx.env.lotsOpenCount(S.d.pid) };
    },
    async auctionSell(a, ctx) {
      const A = Rules.AUCTION;
      this.need(S.d.level >= A.LEVEL, `Аукцион открывается с ${A.LEVEL} уровня Ловчего`);
      const sp = this.spirit(a.uid);
      this.need(S.d.spirits.length > 1, 'Нельзя продать последнего духа');
      this.need(!sp.fav, 'Сними с духа отметку «избранный», чтобы продать его');
      const cur = a.cur === 'zlat' ? 'zlat' : 'sparks', price = Math.floor(+a.price);
      this.need(price >= A.MIN[cur] && price <= A.MAX[cur], `Цена — от ${U.fmtNum(A.MIN[cur])} до ${U.fmtNum(A.MAX[cur])} ${cur === 'zlat' ? 'златников' : 'искр'}`);
      this.need(await ctx.env.lotsOpenCount(S.d.pid) < A.MAX_OPEN, `Одновременно можно выставить не больше ${A.MAX_OPEN} духов`);
      this.limit(ctx, 'aucSell', A.PER_DAY, 86400000);
      const iv = sp.iv, s = SP[sp.sid];
      const lot = await ctx.env.lotCreate({ seller_pid: S.d.pid, seller_name: S.d.name, spirit: this.packSpirit(sp), sid: sp.sid, el: s.el, rar: s.rar,
        lvl: sp.lvl, power: S.power(sp), iv_pct: S.ivPct(sp), iv_a: iv[0], iv_d: iv[1], iv_s: iv[2], shiny: !!sp.shiny, cur, price,
        expires_at: new Date(ctx.now + A.HOURS * 3600000).toISOString() });
      this.detachSpirit(sp);
      J.add('auction', { sid: sp.sid, dir: 'sell', cur, price });
      return { id: lot.id, fee: Rules.auctionFee(price) };
    },
    async auctionBuy(a, ctx) {
      this.need(S.d.level >= Rules.AUCTION.LEVEL, `Аукцион открывается с ${Rules.AUCTION.LEVEL} уровня Ловчего`);
      const id = String(a.id || '');
      const pre = await ctx.env.lotGet(id);
      this.need(pre, 'Лот не найден');
      this.need(pre.seller_pid !== S.d.pid, 'Это твой собственный лот');
      S.d.auc = S.d.auc || { got: {}, back: {}, paid: {} };
      this.need(!S.d.auc.got[id], 'Этот лот уже у тебя');
      // деньги проверяем ДО покупки, по цене из базы (цену с телефона не принимаем): иначе лот
      // пометился бы проданным, а покупатель ушёл бы ни с чем
      const cur = pre.cur === 'zlat' ? 'zlat' : 'sparks';
      this.need((S.d[cur] || 0) >= pre.price, cur === 'zlat' ? 'Не хватает златников' : 'Не хватает искр');
      this.limit(ctx, 'aucBuy', 60, 3600000);
      const lot = await ctx.env.lotBuy(id, S.d.pid, S.d.name);
      this.need(lot && lot.price === pre.price && lot.cur === pre.cur, 'Лот уже купили или сняли с продажи');
      S.d[cur] -= lot.price;
      const sp = this.unpackSpirit(lot.spirit, ctx, lot.seller_name);
      const isNew = S.addSpirit(sp);
      S.d.auc.got[lot.id] = ctx.now;
      S.d.stats.traded++; // знак «Щедрая душа»
      ctx.after.push(() => ctx.env.lotsDone([lot.id], 'delivered'));
      J.add('auction', { sid: sp.sid, dir: 'buy', cur, price: lot.price, who: sp.from });
      return { uid: sp.uid, isNew, cur, price: lot.price };
    },
    async auctionCancel(a, ctx) {
      const lot = await ctx.env.lotCancel(String(a.id || ''), S.d.pid);
      this.need(lot, 'Лот уже продан или снят');
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
      // 3.21: имя, уровень и дружина в сообщении — на момент отправки; отдаём текущие (a.who — Ловчие уже показанных сообщений)
      const ask = [...new Set(rows.map(m => m.pid).concat(Array.isArray(a.who) ? a.who.slice(0, 40).map(String) : []))].filter(p => this.PID.test(p)).slice(0, 90);
      const who = {};
      try { const cur = await ctx.env.briefByPid(ask); Object.keys(cur).forEach(p => { const w = this.brief(cur[p]); who[p] = { name: w.name, lvl: w.lvl, clan: w.clan }; }); } catch (e) { /* покажем данные из сообщений */ }
      return { ch: a.ch, who, msgs: rows.map(m => { const w = who[m.pid]; return { id: m.id, pid: m.pid, name: w ? w.name : m.name, lvl: w ? w.lvl : m.lvl, clan: w ? w.clan : m.clan, text: m.text, t: Date.parse(m.created_at), mine: m.pid === S.d.pid }; }) };
    },
    async chatSend(a, ctx) {
      const C = Rules.CHAT, ch = this.chatChannel(a.ch);
      this.need(S.d.level >= C.LEVEL, `Писать в чат можно с ${C.LEVEL} уровня Ловчего — читать можно уже сейчас`);
      const text = this.chatClean(a.text);
      this.need(text.length >= 1, 'Напиши сообщение');
      this.need(!/(https?:\/\/|www\.|t\.me\/|\b[a-z0-9-]{2,}\.(ru|com|net|org|me|io|su|xyz|рф)\b)/i.test(text), 'Ссылки в чате запрещены — так безопаснее для всех');
      const c = ctx.srv.chat = ctx.srv.chat || { t: 0, last: '' };
      this.need(ctx.now - c.t >= C.GAP, 'Не так быстро — подожди пару секунд');
      this.need(!(text === c.last && ctx.now - c.t < 60000), 'Это сообщение уже отправлено');
      this.limit(ctx, 'chat', C.PER_DAY, 86400000);
      c.t = ctx.now; c.last = text;
      const m = await ctx.env.chatInsert({ channel: ch, pid: S.d.pid, name: S.d.name, lvl: S.d.level, clan: S.d.clan || null, text });
      return { msg: { id: m.id, pid: m.pid, name: m.name, lvl: m.lvl, clan: m.clan, text: m.text, t: Date.parse(m.created_at), mine: true } };
    },
    async chatReport(a, ctx) {
      const id = Math.floor(+a.id);
      this.need(id > 0, 'Сообщение не найдено');
      this.limit(ctx, 'chatReport', 30, 86400000);
      await ctx.env.chatReport(id, S.d.pid);
      return { ok: true };
    },

    /* ----- карточка Ловчего и таблица Лиги (3.21) ----- */
    // Открытая карточка любого Ловчего (из чата или таблицы Лиги): облик, уровень, дружина, Лига, успехи, спутник
    async playerCard(a, ctx) {
      const pid = String(a.pid || '');
      this.need(this.PID.test(pid), 'Ловчий не найден');
      this.limit(ctx, 'card', 150, 3600000);
      const s = await ctx.env.friendSave(pid);
      this.need(s && s.data, 'Ловчий не найден — возможно, он давно не заходил в игру');
      const d = s.data, num = (v, max) => U.clamp(Math.floor(+v) || 0, 0, max);
      const b = this.brief(d), st = d.stats || {}, L = d.league || {};
      const spirits = Array.isArray(d.spirits) ? d.spirits.filter(x => x && SP[x.sid]) : [];
      const bud = d.buddy && spirits.find(x => x.uid === d.buddy.uid);
      const buddy = bud ? this.cleanSpirit(bud, 0) : null, best = this.topSpirits(d, 1)[0] || null;
      const stars = L.season === League.season() ? num(L.stars, 1000) : Math.floor(num(L.stars, 1000) / 2); // новый сезон — звёзды пополам
      const ago = s.seen ? ctx.now - Date.parse(s.seen) : Infinity;
      const mine = S.d.friends.some(x => x.id === pid), theirs = (Array.isArray(d.friends) ? d.friends : []).some(x => x && x.id === S.d.pid);
      const sp = x => x && { sid: x.sid, lvl: x.lvl, shiny: x.shiny, dark: x.dark, nick: x.nick, power: S.power(x) };
      return {
        pid, name: b.name, lvl: b.lvl, clan: b.clan, look: b.look, me: pid === S.d.pid,
        seen: ago < 15 * 60000 ? 'now' : ago < 86400000 ? 'today' : ago < 7 * 86400000 ? 'week' : 'long',
        days: +d.created > 0 ? Math.max(1, Math.ceil((ctx.now - Math.min(+d.created, ctx.now)) / 86400000)) : 0,
        dex: Object.values(d.dex || {}).filter(x => x && x.caught).length, caught: num(st.caught, 1e7), km: U.clamp(+st.km || 0, 0, 1e5),
        raids: num(st.raids, 1e6), duels: num(st.duels, 1e6), medals: Object.values(d.medals || {}).filter(t => t >= 3).length,
        league: { stars, rank: League.rank(stars), best: num(L.best, LEAGUE_RANKS.length - 1) },
        buddy: sp(buddy), best: sp(best),
        friend: mine && theirs ? 'mutual' : mine ? 'sent' : theirs ? 'wants' : null,
      };
    },
    // Таблица сезона Лиги с текущими уровнями, именами и обликами (user_id наружу не отдаём)
    // tier — тройка лучших в ранге игрока (пьедестал), rows — топ-50 сезона
    async leagueTop(a, ctx) {
      this.limit(ctx, 'leagueTop', 1500, 3600000);
      const L = League.st(), season = L.season, rank = League.rank(L.stars);
      let r = await ctx.env.leagueTop(season, rank);
      // своя строка отстала от звёзд (турниры, брошенные до 3.21.1) — поправить и перечитать
      const mine = r.rows.find(x => x.me), had = mine ? mine.stars : r.me ? r.me.stars : null;
      if (a.board !== false && L.stars > 0 && had !== L.stars) {
        await ctx.env.leagueScore({ season, name: S.d.name, stars: L.stars, rank, level: S.d.level, look: S.d.look });
        r = await ctx.env.leagueTop(season, rank);
      }
      const row = x => {
        const b = this.brief(x.cur) || this.brief({ name: x.name, level: x.level, look: x.look });
        return { pid: x.pid, name: b.name, lvl: b.lvl, clan: b.clan, look: b.look, stars: U.clamp(x.stars | 0, 0, 1000), rank: U.clamp(x.rank | 0, 0, LEAGUE_RANKS.length - 1), me: !!x.me };
      };
      return { season, total: r.total | 0, me: r.me ? { place: r.me.place | 0, stars: r.me.stars | 0 } : null, rows: r.rows.map(row), tier: { rank, rows: (r.tier || []).map(row) } };
    },

    /* ----- друзья и подарки ----- */
    async friendAdd(a, ctx) {
      const pid = String(a.pid || '');
      this.need(this.PID.test(pid), 'В коде ошибка');
      this.need(pid !== S.d.pid, 'Это твой собственный код дружбы');
      this.limit(ctx, 'friendAdd', 30, 3600000); // перебор кодов дружбы
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
      const look = this.safeLook(d.look);
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
      // полная награда — раз в день за каждого друга и не больше 3 раз в день всего (3.19: было без общего предела —
      // с 50 друзьями до 25 000 ✦ и 40 000 опыта в день)
      const sd = S.d.sparDay = S.d.sparDay && S.d.sparDay.day === U.today(ctx.now) ? S.d.sparDay : { day: U.today(ctx.now), n: 0 };
      if (f.spar === U.today(ctx.now) || sd.n >= 3) { f.spar = U.today(ctx.now); return { win: true, rw: S.giveRewards({ xp: 100 }), practice: true }; }
      sd.n++;
      f.spar = U.today(ctx.now);
      S.progress('spar', 1);
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
      const inbox = (await ctx.env.giftsTo(S.d.pid)).map(g => ({ id: g.id, from: g.from_pid, name: g.from_name, t: g.created_at, invite: !!g.invite }));
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
      S.progress('gift', 1);
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
