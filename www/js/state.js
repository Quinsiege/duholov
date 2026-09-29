'use strict';
/* Состояние игрока: сохранение, предметы, духи, опыт, задания, коконы */

const SAVE_KEY = 'duholov.save.v1';

/* Прогресс меняет только сервер игры (server/game/core.js запускает эти же функции у себя).
   На телефоне S.d — копия, присланная сервером; методы-изменения здесь вызываются только сервером. */
const S = {
  d: null,

  save() {}, // сохранением занимается сервер
  migrate() {
    const d = this.d;
    delete d.settings; delete d.lastPos; delete d.tutPos; // настройки и позиция — на телефоне (settings.js)
    d.stats = Object.assign({ caught: 0, springs: 0, raids: 0, evolved: 0, hatched: 0, km: 0, throwsGreat: 0, shiny: 0, duels: 0 }, d.stats || {});
    d.shrines = d.shrines || {};
    d.team = d.team || [];
    d.sent = d.sent || [];
    d.gifts = d.gifts || {};
    d.stats.traded = d.stats.traded || 0;
    d.stats.invasions = d.stats.invasions || 0;
    d.stats.purified = d.stats.purified || 0;
    d.freed = d.freed || {};
    d.amulets = d.amulets || {};
    d.journal = d.journal || [];
    d.friends = d.friends || [];
    d.giftsOpened = d.giftsOpened || {};
    d.props = d.props || {}; // решения по моим заявкам мест, о которых уже сообщили
    d.friendLinks = d.friendLinks || {}; // обработанные входящие дружбы: pid → время связи
    d.streak = d.streak || { n: 0, day: '' }; // серия дней: сколько дней подряд и последний день
    d.order = d.order || {}; // вклад в общее дело Ордена: неделя → { n, got: [ступени] }
    d.stats.streakBest = d.stats.streakBest || 0;
    d.stats.orderPts = d.stats.orderPts || 0;
    d.tasks = d.tasks || []; // поручения из родников
    d.taskMeet = d.taskMeet || []; // встречи за выполненные поручения: { id, sid, lvl }
    d.guards = d.guards || []; // мои защитники на Капищах: { id, name, sid, t }
    // златники — вторая валюта (с 3.14; в 3.12–3.13 назывались гривнами — переносим один к одному)
    d.zlat = (d.zlat || 0) + (d.grivna || 0); delete d.grivna;
    // 3.19 и 4.16: новая кривая опыта — опыт переносится в то же место внутри текущего уровня (уровень не понижается).
    // xpv: нет — кривая до 3.19 (levelXPOld), 2 — кривая 3.19–4.15 (levelXP2), 3 — нынешняя (levelXP)
    if (d.xpv !== 3) {
      const L = d.level || 1, F = d.xpv === 2 ? levelXP2 : levelXPOld;
      if (L >= MAX_LEVEL) d.xp = Math.max(d.xp || 0, levelXP(MAX_LEVEL));
      else if (L > 1 || d.xp > 0) {
        const o0 = F(L), o1 = F(L + 1), n0 = levelXP(L), n1 = levelXP(L + 1);
        const f = U.clamp(((d.xp || 0) - o0) / (o1 - o0), 0, 0.999);
        d.xp = Math.round(n0 + f * (n1 - n0));
      }
      d.xpv = 3;
    }
    d.bagExtra = d.bagExtra || 0; // расширения сумки из Лавки: +50 мест каждое
    d.owned = d.owned || {}; // купленный облик: цвет плаща или id эмблемы → true
    d.shop = d.shop || {}; // Лавка: { deal: день покупки товара дня }
    d.pass = d.pass || null; // Сезонная тропа: { season, pts, gold, got: { free: [], gold: [] } }
    if (!d.pid) d.pid = U.uid() + U.uid();
    d.look = Object.assign({ cloak: '#6d28d9', eyes: '#5eead4', emblem: 'charm' }, d.look || {});
    d.stats.byEl = d.stats.byEl || {};
    d.items = d.items || {}; d.essence = d.essence || {}; d.dex = d.dex || {};
    d.spirits = d.spirits || []; d.cocoons = d.cocoons || []; d.springs = d.springs || {}; d.rifts = d.rifts || {}; d.caught = d.caught || {};
    d.medals = d.medals || {};
    // 4.16: осколки Алатыря (пробуждение духов) и эссенция Рода (подходит любому семейству)
    d.alatyr = d.alatyr || 0; d.rod = d.rod || 0; d.stats.awakened = d.stats.awakened || 0;
    // 4.24: обучение без сцен — шаг прежнего списка (4.0: tutV 4; 3.x: 1 поймать, 2 родник, 3 меню) переводится
    // на ближайший шаг нового, который ещё впереди; дальше последнего — обучение пройдено
    if (d.tut && d.tutV !== TUT_V) {
      const OLD = ['meet', 'lore', 'catch1', 'ring', 'catch2', 'menu', 'spirits', 'card', 'power', 'dex', 'springs', 'spring', 'bag', 'road', 'cocoons', 'quests', 'path', 'oath'];
      const from = d.tutV === 4 ? d.tut - 1 : Math.max(0, OLD.indexOf({ 1: 'catch1', 2: 'springs', 3: 'road' }[d.tut]));
      const next = OLD.slice(from).map(id => TUT.findIndex(x => x.id === id)).find(k => k >= 0);
      d.tut = next === undefined ? 0 : next + 1; d.tutV = TUT_V;
    }
    if (d.buddy === undefined) d.buddy = null;
  },

  newGame(name, starter) {
    this.d = {
      v: 1, name, level: 1, xp: 0, sparks: 500, created: Date.now(),
      items: { charm: 30, honey: 3, water: 3, incense: 1 },
      essence: {}, spirits: [], dex: {}, cocoons: [{ id: U.uid(), km: 2, walked: 0, inc: true }],
      springs: {}, rifts: {}, caught: {}, incenseUntil: 0, lastPos: null, quests: null,
    };
    this.migrate();
    const sp = this.makeSpirit(starter, Math.min(5, this.catchLvl()), 'starter' + Date.now(), { ivMin: 10 });
    this.addSpirit(sp, true);
    this.d.essence[SP[starter].fam] = 10;
    this.d.buddy = { uid: sp.uid, km: 0, finds: 0 };
    this.d.tut = 1; this.d.tutV = TUT_V; // обучение новичка (4.0; 4.24 — подсказками)
    this.ensureQuests();
    this.save(true);
  },

  /* ---------- духи ---------- */
  cpm(lvl) { return 0.094 + (0.7903 - 0.094) * Math.sqrt((lvl - 1) / 39); },
  stats(sp) {
    const b = SP[sp.sid].base, c = this.cpm(sp.lvl);
    // омрачённые духи бьют сильнее, но хуже держат удар
    const atk = (b[0] + sp.iv[0]) * c * (sp.dark ? 1.2 : 1), def = (b[1] + sp.iv[1]) * c * (sp.dark ? 0.83 : 1), sta = (b[2] + sp.iv[2]) * c;
    const power = Math.max(10, Math.floor((b[0] + sp.iv[0]) * Math.sqrt(b[1] + sp.iv[1]) * Math.sqrt(b[2] + sp.iv[2]) * c * c / 10));
    return { atk, def, sta, hp: Math.max(10, Math.floor(sta)), power };
  },
  power(sp) { return this.stats(sp).power; },
  // Показатели в битве: с учётом амулета
  battle(sp) {
    const x = this.stats(sp), a = sp.amulet && AMULETS[sp.amulet] || {};
    return { atk: x.atk * (a.atk || 1), def: x.def * (a.def || 1), hp: Math.floor(x.hp * (a.hp || 1)), power: x.power, energy: a.energy || 1 };
  },

  /* ---------- амулеты ---------- */
  addAmulet(id, n = 1) { this.d.amulets[id] = (this.d.amulets[id] || 0) + n; this.save(); },
  rollAmulet(chance, seed) {
    const r = U.rng(seed + Date.now());
    if (r() >= chance) return null;
    const id = AMULET_KEYS[Math.floor(r() * AMULET_KEYS.length)];
    this.addAmulet(id);
    return id;
  },
  equip(sp, id) {
    if (!(this.d.amulets[id] > 0)) return false;
    if (sp.amulet) this.unequip(sp);
    this.d.amulets[id]--;
    sp.amulet = id;
    if (this.d.buddy && this.d.buddy.uid === sp.uid) Bus.emit('buddyChanged');
    this.save();
    return true;
  },
  unequip(sp) {
    if (!sp.amulet) return;
    this.addAmulet(sp.amulet);
    sp.amulet = null;
    this.save();
  },
  // 4.16: переплавка — Rules.MELT.N одинаковых амулетов из сумки и искры → один амулет на выбор (лишние амулеты копились сотнями)
  canMeltAmulet(from, to) {
    const M = Rules.MELT;
    if (!AMULET_KEYS.includes(from) || !AMULET_KEYS.includes(to)) return ru`Такого амулета нет`;
    if (from === to) return ru`Выбери другой амулет`;
    if ((this.d.amulets[from] || 0) < M.N) return ru`Для переплавки нужно ${M.N} одинаковых амулета`;
    if (this.d.sparks < M.SPARKS) return ru`Нужно ✦ ${M.SPARKS}`;
    return null;
  },
  meltAmulet(from, to) {
    if (this.canMeltAmulet(from, to)) return false;
    this.d.amulets[from] -= Rules.MELT.N;
    this.d.sparks -= Rules.MELT.SPARKS;
    this.addAmulet(to);
    return true;
  },
  canLearnMove2(sp) {
    if (sp.move2) return ru`Приём уже выучен`;
    if (this.d.sparks < MOVE2_COST.sparks) return ru`Нужно ✦ ${MOVE2_COST.sparks}`;
    if ((this.d.essence[SP[sp.sid].fam] || 0) < MOVE2_COST.essence) return ru`Нужно ${MOVE2_COST.essence} эссенции`;
    return null;
  },
  learnMove2(sp) {
    if (this.canLearnMove2(sp)) return false;
    this.d.sparks -= MOVE2_COST.sparks;
    this.d.essence[SP[sp.sid].fam] -= MOVE2_COST.essence;
    sp.move2 = true;
    this.save();
    return true;
  },
  makeSpirit(sid, lvl, seed, { ivMin = 0 } = {}) {
    const r = U.rng(seed);
    const iv = [0, 0, 0].map(() => ivMin + Math.floor(r() * (16 - ivMin)));
    return { uid: U.uid(), sid, lvl, iv, t: Date.now(), fav: false, nick: null, code: this.newSpiritCode() };
  },
  // 4.17: код духа — 8 цифр, выбит точками на защитной плёнке стикера. Идёт с духом через аукцион; у духов до 4.17 — из uid
  newSpiritCode() { return String(1e7 + Math.floor(Math.random() * 9e7)); },
  spiritCode(sp) { return sp.code || String(1e7 + Math.floor(U.h('code', sp.uid) * 9e7)); },
  // 4.17: привязка — плёнка на обороте содрана (sp.bound — когда): дух остаётся у Ловчего навсегда, продать его нельзя
  isBound(sp) { return !!sp.bound; },
  ivPct(sp) { return Math.round((sp.iv[0] + sp.iv[1] + sp.iv[2]) / 45 * 100); },
  // Предел уровня духа: уровень Ловчего +5 (не выше 40) и ещё AWAKE.STEP за каждую звезду пробуждения,
  // открытую уровнем Ловчего (купленный или подаренный дух без звёзд — как раньше)
  maxLvl(sp) { return Math.min(40, this.d.level + 5) + (sp ? this.AWAKE.STEP * this.starsOn(sp) : 0); },

  /* ---------- 4.16: пробуждение — прогресс духа после предела уровня ----------
     Звезда n (1…5) открывается на уровне Ловчего LVL[n-1], стоит осколков Алатыря, эссенции семейства и искр
     и поднимает предел уровня духа на STEP (до SPIRIT_MAX = 50). Дух должен сначала дойти до своего предела. */
  AWAKE: { MAX: 5, STEP: 2, LVL: [20, 25, 30, 35, 40], ALATYR: [2, 3, 4, 5, 6], ESS: [10, 15, 20, 25, 30], SPARKS: [10000, 20000, 30000, 40000, 50000] },
  starsOn(sp) { return Math.min(sp.stars || 0, this.AWAKE.LVL.filter(l => this.d.level >= l).length); },
  awakenCost(sp) { const n = sp.stars || 0, A = this.AWAKE; return n >= A.MAX ? null : { lvl: A.LVL[n], alatyr: A.ALATYR[n], essence: A.ESS[n], sparks: A.SPARKS[n] }; },
  canAwaken(sp) {
    const c = this.awakenCost(sp);
    if (!c) return ru`Дух пробуждён полностью`;
    if (this.d.level < c.lvl) return ru`Следующая звезда откроется на ${c.lvl} уровне Ловчего`;
    if (sp.lvl < this.maxLvl(sp)) return ru`Сначала усиль духа до предела: уровень ${this.maxLvl(sp)}`;
    if ((this.d.alatyr || 0) < c.alatyr) return ru`Нужно осколков Алатыря: ${c.alatyr}`;
    if ((this.d.essence[SP[sp.sid].fam] || 0) < c.essence) return ru`Нужно ${c.essence} эссенции`;
    if (this.d.sparks < c.sparks) return ru`Нужно ✦ ${c.sparks}`;
    return null;
  },
  awaken(sp) {
    if (this.canAwaken(sp)) return false;
    const c = this.awakenCost(sp);
    this.d.alatyr -= c.alatyr; this.d.essence[SP[sp.sid].fam] -= c.essence; this.d.sparks -= c.sparks;
    sp.stars = (sp.stars || 0) + 1;
    this.d.stats.awakened++;
    J.add('awaken', { sid: sp.sid, stars: sp.stars });
    this.progress('awaken', 1);
    this.save();
    return true;
  },

  /* ---------- 4.16: эссенция Рода — общая для всех семейств ----------
     Лишнюю эссенцию семейства можно переплавить: MELT эссенции → 1 эссенция Рода. Эссенция Рода вливается
     в любое семейство: 1 → 1, а в семейство легенды — LEGEND → 1 (эссенции легенд иначе почти не добыть) */
  ESS: { MELT: 5, LEGEND: 3 },
  famOk(fam) { return !!(SP[fam] && SP[fam].fam === fam); },
  canMelt(fam, n) {
    if (!this.famOk(fam)) return ru`Нет такого семейства`;
    if (SP[fam].legend) return ru`Эссенцию легенд переплавить нельзя`;
    if (!(n >= 1 && n === Math.floor(n))) return ru`Сколько переплавить?`;
    if ((this.d.essence[fam] || 0) < n * this.ESS.MELT) return ru`Нужно ${n * this.ESS.MELT} эссенции`;
    return null;
  },
  melt(fam, n) { // n — сколько эссенции Рода получить
    if (this.canMelt(fam, n)) return false;
    this.d.essence[fam] -= n * this.ESS.MELT; this.d.rod = (this.d.rod || 0) + n;
    this.save();
    return true;
  },
  pourRate(fam) { return SP[fam] && SP[fam].legend ? this.ESS.LEGEND : 1; },
  canPour(fam, n) {
    if (!this.famOk(fam)) return ru`Нет такого семейства`;
    if (!(n >= 1 && n === Math.floor(n))) return ru`Сколько влить?`;
    if ((this.d.rod || 0) < n * this.pourRate(fam)) return ru`Нужно эссенции Рода: ${n * this.pourRate(fam)}`;
    return null;
  },
  pour(fam, n) { // n — сколько эссенции семейства получить
    if (this.canPour(fam, n)) return false;
    this.d.rod -= n * this.pourRate(fam); this.addEssence(fam, n);
    this.save();
    return true;
  },
  // Трофеи разлома сверх обычной награды: эссенция семейства босса (легенды — из великих разломов) и осколки Алатыря
  RIFT_ESS: { 1: 2, 2: 4, 3: 6 },
  ALATYR_DROP: { rift: { 2: 0.2, 3: 1 }, duel: { 3: 0.1 } }, ALATYR_DAY: 2, // в бою — не больше двух осколков в день (дальние великие разломы не фармятся)
  riftSpoils(boss, tier) {
    const out = [], fam = SP[boss].fam, n = this.RIFT_ESS[tier] || 0;
    if (n) { this.addEssence(fam, n); out.push({ k: 'ess', n, label: ru`Эссенция «${SP[fam].name}»` }); }
    return out.concat(this.alatyrDrop('rift', tier));
  },
  alatyrDrop(kind, tier) {
    const p = (this.ALATYR_DROP[kind] || {})[tier] || 0, day = U.today();
    if (this.d.alaDay && this.d.alaDay.day !== day) this.d.alaDay = null;
    if (!p || (this.d.alaDay && this.d.alaDay.n >= this.ALATYR_DAY) || Math.random() >= p) return [];
    this.d.alaDay = { day, n: (this.d.alaDay ? this.d.alaDay.n : 0) + 1 };
    this.d.alatyr = (this.d.alatyr || 0) + 1;
    this.d.alaGiven = (this.d.alaGiven || 0) + 1; // 4.28: и в общий счёт Ордена (осколок остаётся у Ловчего) — вклад за всё время
    this.alaMine().n++; // 4.28: и вклад за сезон Алатыря (награда в конце сезона — GameCore.alaTurn)
    return [{ k: 'alatyr', n: 1, label: ru`Осколки Алатыря` }];
  },
  // 4.28: вклад Ловчего в сезон Алатыря: { s — сезон, n — осколков, k — побед над Кощеем в финале }. Смену сезона
  // (награду за прошлый) делает сервер в начале запроса (GameCore.alaTurn) — здесь только запись текущего
  alaMine() {
    const s = typeof Ev !== 'undefined' && Ev.alaSeason ? Ev.alaSeason() : 1, a = this.d.alaS;
    if (!a || typeof a !== 'object' || !(a.s >= 1)) this.d.alaS = { s, n: 0, k: 0 };
    return this.d.alaS;
  },
  resName(k) { return k === 'alatyr' ? ru`Осколки Алатыря` : k === 'rod' ? ru`Эссенция Рода` : k === 'sparks' ? ru`Искры` : k === 'zlat' ? ru`Златники` : k === 'xp' ? ru`Опыт` : ITEMS[k] ? ITEMS[k].name : k; },
  /* 4.15: здоровье духа — доля от полного (1 — здоров). Храним долю, а не очки: усиление и превращение ран не сбивают.
     hpf — доля на момент hpt, дальше дух сам восстанавливает Rules.HP.REGEN в час; ko — когда упал без сил:
     до Rules.koMs (2–24 ч по редкости) в бой не идёт, потом поднимается сам на Rules.HP.BACK (10%) */
  hpNow(sp, now = U.now()) {
    const H = Rules.HP;
    if (!sp) return 0;
    const cap = this.hpCap(sp, now); // 4.16: усталый дух выше предела не поднимется
    if (sp.ko) { const t = now - sp.ko, ko = Rules.koMs(sp); return t < ko ? 0 : Math.min(cap, H.BACK + H.REGEN * (t - ko) / 3600000); }
    if (sp.hpf == null) return cap;
    return Math.min(cap, sp.hpf + H.REGEN * Math.max(0, now - (sp.hpt || now)) / 3600000);
  },
  /* 4.16: усталость — очки боёв (sp.tired на момент sp.tiredT), тают по очку за Rules.HP.TIRED.REST часов.
     Сверх FREE очков каждое срезает STEP от предела здоровья (hpCap), не ниже MIN */
  tired(sp, now = U.now()) { return sp && sp.tired ? Math.max(0, sp.tired - Math.max(0, now - (sp.tiredT || now)) / (Rules.HP.TIRED.REST * 3600000)) : 0; },
  hpCap(sp, now = U.now()) { const T = Rules.HP.TIRED; return Math.max(T.MIN, 1 - T.STEP * Math.max(0, this.tired(sp, now) - T.FREE)); },
  tire(sp, n = 1, now = U.now()) {
    const t = Math.round((this.tired(sp, now) + n) * 100) / 100;
    if (t > 0) { sp.tired = t; sp.tiredT = now; } else { delete sp.tired; delete sp.tiredT; }
  },
  // сколько отдыхать до полного предела здоровья, мс
  restLeft(sp, now = U.now()) { const T = Rules.HP.TIRED; return Math.max(0, this.tired(sp, now) - T.FREE) * T.REST * 3600000; },
  alive(sp) { return this.hpNow(sp) > 0; },
  koLeft(sp, now = U.now()) { return sp && sp.ko ? Math.max(0, Rules.koMs(sp) - (now - sp.ko)) : 0; },
  setHp(sp, f, now = U.now()) {
    f = Math.max(0, Math.min(1, +f || 0));
    delete sp.ko; delete sp.hpf; delete sp.hpt;
    if (f <= 0) { sp.ko = now; } else if (f < 0.999) { sp.hpf = Math.round(f * 1000) / 1000; sp.hpt = now; }
  },
  healItems() { return Object.keys(ITEMS).filter(k => ITEMS[k].heal || ITEMS[k].revive); },
  canHeal(sp, k) {
    const it = ITEMS[k], h = this.hpNow(sp);
    if (!sp) return ru`Дух не найден`;
    if (!it || !(it.heal || it.revive)) return ru`Этим не лечат`;
    if (!(this.d.items[k] > 0)) return ru`${it.name}: нет в сумке`;
    if (h <= 0 && !it.revive) return ru`Дух без сил — поможет только Мёртвая вода или время`;
    if (h > 0 && !it.heal) return ru`Мёртвая вода не лечит живых — только поднимает духов без сил`;
    if (h >= 1) return ru`Дух здоров`;
    if (h >= this.hpCap(sp) - 0.02) return ru`Дух устал — лечение не поможет, нужен отдых`; // 4.16
    return null;
  },
  heal(sp, k) {
    const err = this.canHeal(sp, k); if (err) return err;
    const it = ITEMS[k], h = this.hpNow(sp);
    this.useItem(k);
    // 4.15.1: Мёртвая вода сдвигает время падения на revive часов назад; срок вышел — дух поднимается ровно на BACK (10%)
    if (h <= 0) { sp.ko -= it.revive * 3600000; if (!this.koLeft(sp)) this.setHp(sp, Rules.HP.BACK); }
    else this.setHp(sp, Math.min(this.hpCap(sp), h + it.heal)); // 4.16: не выше предела усталого духа
    this.save();
    return null;
  },
  // здоровье бойцов после боя: { uid: доля }
  hpReport(fighters) { const o = {}; (fighters || []).forEach(f => { if (f && f.sp && f.sp.uid) o[f.sp.uid] = Math.round(Math.max(0, f.cur) / f.max * 1000) / 1000; }); return o; },
  // 4.15: пойманный дух — не выше уровня Ловчего (усиливать можно дальше, до уровня +5)
  catchLvl() { return Math.max(1, Math.min(40, this.d.level)); },
  addSpirit(sp, silent) {
    this.d.spirits.push(sp);
    const dx = this.d.dex[sp.sid] = this.d.dex[sp.sid] || { seen: 1, caught: 0 };
    const isNew = !dx.caught;
    dx.caught++;
    if (sp.shiny) { dx.shiny = (dx.shiny || 0) + 1; this.d.stats.shiny++; }
    if (!silent) {
      const el = SP[sp.sid].el;
      this.d.stats.byEl[el] = (this.d.stats.byEl[el] || 0) + 1;
      this.save();
    }
    return isNew;
  },
  seen(sid) { const dx = this.d.dex[sid] = this.d.dex[sid] || { seen: 0, caught: 0 }; dx.seen++; this.save(); },
  findSpirit(uid) { return this.d.spirits.find(s => s.uid === uid); },
  release(uid) {
    const i = this.d.spirits.findIndex(s => s.uid === uid);
    if (i < 0) return;
    const sp = this.d.spirits[i];
    if (sp.amulet) this.addAmulet(sp.amulet); // амулет возвращается в сумку
    this.d.spirits.splice(i, 1);
    this.addEssence(SP[sp.sid].fam, 1);
    if (this.d.buddy && this.d.buddy.uid === uid) { this.d.buddy = null; Bus.emit('buddyChanged'); }
    this.save();
  },

  /* ---------- команда для разломов и капищ ---------- */
  team() {
    const chosen = this.d.team.map(u => this.findSpirit(u)).filter(Boolean);
    if (chosen.length) return chosen.slice(0, 3);
    return [...this.d.spirits].sort((a, b) => this.power(b) - this.power(a)).slice(0, 3);
  },
  setTeam(uids) { this.d.team = uids.slice(0, 3); this.save(); },

  /* ---------- спутник ---------- */
  buddySpirit() { return this.d.buddy ? this.findSpirit(this.d.buddy.uid) : null; },
  buddyDist(sp) {
    const s = SP[sp.sid], d = s.legend || s.stage === 3 ? 5 : s.stage === 2 || s.rar >= 3 ? 3 : 1;
    return sp.amulet === 'lada' ? d / 2 : d;
  },
  setBuddy(uid) {
    this.d.buddy = { uid, km: 0, finds: 0 };
    Bus.emit('buddyChanged');
    this.save();
  },
  buddyWalk(km) {
    const b = this.d.buddy, sp = this.buddySpirit();
    if (!b || !sp) return;
    b.km += km;
    const need = this.buddyDist(sp);
    while (b.km >= need) {
      b.km -= need; b.finds++;
      const s = SP[sp.sid];
      this.addEssence(s.fam, 3);
      let extra = null;
      if (b.finds % 3 === 0) {
        const it = U.weighted([['charm', 5], ['honey', 2], ['water', 1]], Math.random());
        const n = it === 'charm' ? 3 : 1;
        if (this.addItem(it, n)) extra = [I18N.low(ITEMS[it].name), n];
      }
      const nm = U.esc(sp.nick || s.name);
      Bus.emit('buddyFind', extra ? ru`Спутник «${nm}» принёс 3 эссенции и ${extra[0]} ×${extra[1]}!` : ru`Спутник «${nm}» принёс 3 эссенции!`);
    }
  },
  addEssence(fam, n) { this.d.essence[fam] = (this.d.essence[fam] || 0) + n; },
  // 4.16: искр до 20 уровня — как раньше (200…1 200), выше — дороже на 15% за каждый уровень после 20-го (30 → ✦ 4 000,
  // 39 → ✦ 7 700): прежде усиление стоило 200–2 000, и к 40 уровню Ловчего копились сотни тысяч лишних искр
  powerUpSparks(lvl) {
    const base = 200 + 200 * Math.floor((lvl - 1) / 4);
    return lvl <= 20 ? base : Math.round(base * (1 + 0.15 * (lvl - 20)) / 50) * 50;
  },
  powerUpCost(sp) { return { sparks: this.powerUpSparks(sp.lvl), essence: 1 + Math.floor(sp.lvl / 10) }; },
  canPowerUp(sp) {
    const c = this.powerUpCost(sp), fam = SP[sp.sid].fam;
    if (sp.lvl >= this.maxLvl(sp)) {
      const a = this.awakenCost(sp);
      if (sp.lvl >= SPIRIT_MAX) return ru`Дух достиг наивысшего уровня`;
      if (a && this.d.level >= a.lvl) return ru`Предел уровня — пробуди духа, чтобы поднять его`;
      return sp.stars ? ru`Предел уровня растёт с уровнем Ловчего и пробуждением` : ru`Предел: уровень духа не может быть выше уровня Ловчего +5`;
    }
    if (this.d.sparks < c.sparks) return ru`Не хватает искр`;
    if ((this.d.essence[fam] || 0) < c.essence) return ru`Не хватает эссенции`;
    return null;
  },
  powerUp(sp) {
    if (this.canPowerUp(sp)) return false;
    const c = this.powerUpCost(sp);
    this.d.sparks -= c.sparks; this.d.essence[SP[sp.sid].fam] -= c.essence;
    sp.lvl++;
    this.progress('power', 1);
    this.tutAdvance('power'); // 4.0: шаг обучения «Усиль духа»
    this.save();
    return true;
  },
  PURIFY: { sparks: 3000, essence: 25 }, // 3.19: было 1000 и 10 — дешевле, чем усилить духа до 25 уровня (16 800 ✦)
  // 4.16: цена очищения растёт с редкостью духа (обычный ✦ 3 000 … легендарный ✦ 20 000) — при избытке искр оно было даровым
  PURIFY_SPARKS: { 1: 3000, 2: 5000, 3: 8000, 4: 12000, 5: 20000 },
  purifyCost(sp) { return { sparks: this.PURIFY_SPARKS[(SP[sp.sid] || {}).rar] || this.PURIFY.sparks, essence: this.PURIFY.essence }; },
  canPurify(sp) {
    const c = this.purifyCost(sp);
    if (!sp.dark) return ru`Дух не омрачён`;
    if (this.d.sparks < c.sparks) return ru`Нужно ✦ ${c.sparks}`;
    if ((this.d.essence[SP[sp.sid].fam] || 0) < c.essence) return ru`Нужно ${c.essence} эссенции`;
    return null;
  },
  purify(sp) {
    if (this.canPurify(sp)) return false;
    const c = this.purifyCost(sp);
    this.d.sparks -= c.sparks;
    this.d.essence[SP[sp.sid].fam] -= c.essence;
    sp.dark = false;
    sp.purified = true;
    sp.iv = sp.iv.map(v => Math.min(15, v + 2));
    sp.lvl = Math.max(sp.lvl, Math.min(25, this.maxLvl()));
    this.d.stats.purified++;
    this.progress('purify', 1);
    this.addXP(1000);
    this.save();
    return true;
  },
  canEvolve(sp) {
    const s = SP[sp.sid];
    if (!s.evo) return ru`Этот дух не превращается`;
    if ((this.d.essence[s.fam] || 0) < s.cost) return ru`Нужно ${s.cost} эссенции`;
    return null;
  },
  evolve(sp) {
    if (this.canEvolve(sp)) return null;
    const s = SP[sp.sid];
    this.d.essence[s.fam] -= s.cost;
    sp.sid = s.evo;
    const dx = this.d.dex[sp.sid] = this.d.dex[sp.sid] || { seen: 0, caught: 0 };
    const isNew = !dx.caught;
    dx.seen++; dx.caught++;
    this.d.stats.evolved++;
    J.add('evolve', { from: s.id, to: sp.sid });
    if (this.d.buddy && this.d.buddy.uid === sp.uid) Bus.emit('buddyChanged');
    // 4.16: опыт — за новый вид в бестиарии; повторные превращения в тот же вид дают немного (было 500 за каждое)
    this.addXP(isNew ? 1000 : 200);
    this.progress('evolve', 1);
    this.save();
    return { isNew };
  },

  /* ---------- предметы ---------- */
  bagLimit() { return BAG_LIMIT + (this.d.bagExtra || 0) * Rules.BAG_STEP; },
  bagCount() { return Object.values(this.d.items).reduce((a, b) => a + b, 0); },
  // 4.16: сумка больше не переполняется. over — награда (уровень, серия дней, задание, Летопись, Тропа, бой, родник):
  // что не поместилось — в посылку Ордена (Rules.PARCEL, забрать — parcelTake), а не сверх лимита (раньше сумка
  // раздувалась в разы, а родники при полной сумке молча ничего не давали). Без over (находки спутника) — только в сумку
  addItem(k, n = 1, over = false) {
    const add = Math.max(0, Math.min(n, this.bagLimit() - this.bagCount()));
    if (add) this.d.items[k] = (this.d.items[k] || 0) + add;
    const put = over ? this.parcelPut(k, n - add) : 0;
    this.save();
    return add + put;
  },
  parcelCount() { return Object.values((this.d.parcel && this.d.parcel.items) || {}).reduce((a, b) => a + b, 0); },
  // в посылку — сколько войдёт (не больше Rules.PARCEL.MAX вещей); остальное пропадает. Счёт — для сообщения игроку
  parcelPut(k, n) {
    if (!(n > 0)) return 0;
    const P = this.d.parcel = this.d.parcel || { items: {} };
    const m = Math.max(0, Math.min(n, Rules.PARCEL.MAX - this.parcelCount()));
    if (m) P.items[k] = (P.items[k] || 0) + m;
    const c = this._parcelNote = this._parcelNote || { put: 0, lost: 0 };
    c.put += m; c.lost += n - m;
    return m;
  },
  // забрать посылку: сколько влезет в сумку — сначала редкое и нужное
  PARCEL_ORDER: ['deadwater', 'gift', 'charm3', 'charm2', 'farpass', 'incense', 'brew', 'water', 'herb', 'honey', 'charm'],
  parcelTake() {
    const P = this.d.parcel, got = [];
    if (!P) return got;
    const keys = [...this.PARCEL_ORDER, ...Object.keys(P.items).filter(k => !this.PARCEL_ORDER.includes(k))];
    for (const k of keys) {
      const n = P.items[k] || 0, add = Math.min(n, Math.max(0, this.bagLimit() - this.bagCount()));
      if (!(add > 0) || !ITEMS[k]) continue;
      this.d.items[k] = (this.d.items[k] || 0) + add;
      P.items[k] = n - add;
      if (!P.items[k]) delete P.items[k];
      got.push({ k, n: add, label: ITEMS[k].name });
    }
    if (!Object.keys(P.items).length) this.d.parcel = null;
    this.save();
    return got;
  },
  useItem(k) { if ((this.d.items[k] || 0) <= 0) return false; this.d.items[k]--; this.save(); return true; },
  // over — см. addItem; once — разовая награда (глава Летописи, обучение, место): опыт без дневного потолка (см. addXP)
  giveRewards(rw, over = true, once = false) { // { charm: 5, sparks: 300, xp: 100 ... } → массив строк для показа
    const out = [], prev = this._parcelNote;
    this._parcelNote = { put: 0, lost: 0 }; // своя сводка: награда за уровень внутри (addXP) считает свою
    for (const [k, n] of Object.entries(rw)) {
      if (!n) continue;
      if (k === 'sparks') { this.d.sparks += n; out.push({ k, n, label: ru`Искры` }); }
      else if (k === 'zlat') { this.d.zlat = (this.d.zlat || 0) + n; out.push({ k, n, label: ru`Златники` }); }
      else if (k === 'xp') { const o = { k, n: 0, label: ru`Опыт` }; out.push(o); o.n = this.addXP(n, once); }
      else if (k === 'alatyr' || k === 'rod') { this.d[k] = (this.d[k] || 0) + n; out.push({ k, n, label: this.resName(k) }); } // 4.16: не вещи — в сумку не идут
      else if (ITEMS[k]) { const a = this.addItem(k, n, over); if (a) out.push({ k, n: a, label: ITEMS[k].name }); }
    }
    const c = this._parcelNote;
    this._parcelNote = prev;
    if (c && c.put) Bus.emit('toast', { text: ru`Сумка полна — в посылку Ордена ушло вещей: ${c.put}. Забери её в Сумке, когда освободится место` });
    if (c && c.lost) Bus.emit('toast', { text: ru`Сумка и посылка Ордена полны — не поместилось вещей: ${c.lost}. Освободи место в Сумке`, cls: 'bad' });
    this.save();
    return out;
  },
  incenseActive() { return this.d.incenseUntil > Date.now(); },

  /* ---------- опыт ---------- */
  /* 4.16: учёт опыта за день (d.xpd = { day, n, rest }): n — опыт за сегодня (для дневного потолка), rest — опыт отдыха.
     За каждый день без опыта копится XP_DAY.REST (не больше, чем за XP_DAY.REST_DAYS дней) */
  xpToday() { // учёт на сегодня, ничего не меняя (для показа на телефоне)
    const today = U.today(), x = this.d.xpd;
    if (x && x.day === today) return x;
    let rest = (x && x.rest) || 0;
    if (x && x.day) {
      const t = s => { const [y, m, d] = String(s).split('-').map(Number); return Date.UTC(y, m - 1, d); };
      const gap = Math.round((t(today) - t(x.day)) / 86400000) - 1; // полных дней без игры
      if (gap > 0) rest = Math.max(rest, Math.min(XP_DAY.REST * XP_DAY.REST_DAYS, rest + gap * XP_DAY.REST));
    }
    return { day: today, n: 0, rest };
  },
  xpDay() {
    const x = this.d.xpd, t = this.xpToday();
    if (t === x) return x;
    if (t.rest > ((x && x.rest) || 0)) Bus.emit('toast', { text: ru`Ты хорошо отдохнул: следующие ${U.fmtNum(t.rest)} опыта — вдвое!`, cls: 'good' });
    return (this.d.xpd = t);
  },
  // Сколько опыта даст n в этот раз: событие недели (Звездопад ×2), дневной потолок (XP_DAY.FULL за день — полностью,
  // дальше до XP_DAY.HALF — вполовину, сверх — четверть; разовые награды once — без потолка) и опыт отдыха (удваивает,
  // пока не кончится). mark — записать в учёт дня
  xpGain(n, once, mark) {
    const x = this.xpDay(), mul = Ev.xpMul();
    let raw = Math.max(0, +n || 0) * mul, got = raw;
    if (!once) {
      const F = XP_DAY.FULL * mul, H = XP_DAY.HALF * mul, a = x.n, b = a + raw;
      const part = (lo, hi) => Math.max(0, Math.min(b, hi) - Math.max(a, lo));
      got = part(0, F) + part(F, H) * 0.5 + part(H, Infinity) * 0.25;
    }
    got = Math.round(got);
    const bonus = once ? 0 : Math.min(x.rest, got);
    if (mark) { if (!once) x.n += raw; x.rest -= bonus; }
    return got + bonus;
  },
  // Начислить опыт; возвращает, сколько начислено на самом деле (см. xpGain). once — разовая награда
  addXP(n, once = false) {
    n = this.xpGain(n, once, true);
    this.d.xp += n;
    let leveled = [];
    while (this.d.level < MAX_LEVEL && this.d.xp >= levelXP(this.d.level + 1)) {
      this.d.level++;
      leveled.push(this.d.level);
    }
    // награда за уровень выдаётся сразу (на сервере), телефон только показывает окно
    leveled.forEach(l => {
      const got = this.giveRewards(this.levelRewards(l));
      J.add('level', { l });
      Bus.emit('levelup', { l, got });
    });
    Bus.emit('xp');
    this.save();
    return n;
  },
  levelRewards(l) {
    // 4.16: лечебного и мёда меньше (было мёда 3, Живой воды 3, подорожника 5, отвара 2); златники — 3, на каждом пятом — 15
    const r = { charm: 10 + l, honey: 2, water: 1, herb: 3, brew: 1, zlat: l % 5 ? Rules.ZLAT.level : Rules.ZLAT.level5 };
    if (l % 5 === 0) r.incense = 1;
    if (l >= 8) r.charm2 = l === 8 ? 10 : 4;
    if (l >= 16) r.charm3 = l === 16 ? 10 : 3;
    return r;
  },

  /* ---------- коконы ---------- */
  addDistance(m) {
    if (m <= 0) return;
    this.d.stats.km += m / 1000;
    const km = m / 1000 * Ev.kmMul(); // для коконов и спутника (в «Неделю коконов» — вдвое)
    this.d.cocoons.forEach(c => {
      if (!c.inc || c.walked >= c.km) return;
      c.walked = Math.min(c.km, c.walked + km);
      if (c.walked >= c.km) Bus.emit('cocoonReady', c);
    });
    this.buddyWalk(km);
    this.progress('walk', m / 1000);
    this.save();
  },
  incubating() { return this.d.cocoons.filter(c => c.inc).length; },
  readyCocoons() { return this.d.cocoons.filter(c => c.inc && c.walked >= c.km); },
  hatch(c) {
    const tier = COCOON_TIERS[c.km], r = U.rng(c.id + 'hatch');
    const rar = U.weighted(Object.entries(tier.pool).map(([k, w]) => [+k, w]), r());
    // из кокона — только первая стадия (3.19: раньше редкие коконы давали сразу превращённых духов)
    let pool = W.evenMyth(SPECIES.filter(s => !s.legend && s.rar === rar && s.stage === 1 && W.local(s) && !s.season), r()); // 4.28: мифология — поровну
    if (!pool.length) pool = SPECIES.filter(s => s.stage === 1 && !s.legend);
    const s = pool[Math.floor(r() * pool.length)];
    const sp = this.makeSpirit(s.id, Math.min(this.d.level, 20), c.id, { ivMin: 10 });
    if (r() < Sky.shinyRate(1 / 64)) sp.shiny = true;
    this.d.cocoons = this.d.cocoons.filter(x => x !== c);
    const isNew = this.addSpirit(sp);
    this.addEssence(s.fam, c.km * 3);
    this.d.sparks += c.km * 150;
    this.d.stats.hatched++;
    J.add('hatch', { sid: s.id, km: c.km, shiny: !!sp.shiny });
    this.progress('hatch', 1);
    this.addXP(c.km * 100 + (isNew ? 500 : 0));
    this.save();
    return { sp, isNew, essence: c.km * 3, sparks: c.km * 150 };
  },

  /* ---------- задания дня ---------- */
  ensureQuests() {
    const day = U.today();
    if (this.d.quests && this.d.quests.day === day) return;
    const r = U.rng('quests' + day + this.d.name);
    const pool = QUEST_TEMPLATES.filter(q => (q.t !== 'raid' || this.d.level >= RAID_LEVEL) && (q.t !== 'duel' || this.d.level >= DUEL_LEVEL)); // 4.18: только открытое (Капища были с 3-го, а открываются с 5-го)
    const picked = [];
    while (picked.length < 3) {
      const q = pool[Math.floor(r() * pool.length)];
      if (!picked.includes(q)) picked.push(q);
    }
    this.d.quests = {
      day, bonus: false,
      list: picked.map(q => {
        const n = q.min + Math.floor(r() * (q.max - q.min + 1));
        const el = ELEMENT_KEYS[Math.floor(r() * ELEMENT_KEYS.length)];
        return { t: q.t, n, el, p: 0, claimed: false, text: q.text(n, el), reward: q.reward };
      }),
    };
    this.save();
  },
  progress(type, amount = 1, meta = {}) {
    if (!this.d) return;
    this.ensureQuests();
    let changed = false;
    this.d.quests.list.forEach(q => {
      if (q.t !== type || q.p >= q.n) return;
      if (type === 'catchEl' && meta.el !== q.el) return;
      q.p = Math.min(q.n, q.p + amount);
      changed = true;
      if (q.p >= q.n) Bus.emit('questDone', q);
    });
    // поручения из родников
    this.d.tasks.forEach(q => {
      if (q.t !== type || q.p >= q.n) return;
      if (type === 'catchEl' && meta.el !== q.el) return;
      q.p = Math.min(q.n, q.p + amount);
      changed = true;
      if (q.p >= q.n) Bus.emit('toast', { text: ru`Поручение выполнено: ${I18N.back(q.text)}`, cls: 'good' });
    });
    if (changed) { Bus.emit('quests'); this.save(); }
  },
  questsClaimable() {
    const daily = this.d.quests ? this.d.quests.list.filter(q => q.p >= q.n && !q.claimed).length : 0;
    return daily + this.d.tasks.filter(q => q.p >= q.n).length + this.d.taskMeet.length;
  },
  // Новое поручение (выдаёт сервер у родника): задание и дух, который встретится в награду
  // pos — где выдано поручение: 4.16 — трудное поручение иногда зовёт «гостя издалека» (см. guests)
  makeTask(pos) {
    const r = Math.random, pool = TASK_TEMPLATES.filter(q => !q.lvl || this.d.level >= q.lvl);
    const q = pool[Math.floor(r() * pool.length)], T = TASK_TIERS[q.tier];
    const n = q.min + Math.floor(r() * (q.max - q.min + 1)), el = ELEMENT_KEYS[Math.floor(r() * ELEMENT_KEYS.length)];
    let sps = SPECIES.filter(s => s.stage === 1 && !s.legend && !s.season && T.rar.includes(s.rar)), guest = false;
    if (q.tier === 3 && pos && r() < this.GUEST) {
      const far = this.guests(pos.lat, pos.lng), fresh = far.filter(s => !(this.d.dex[s.id] && this.d.dex[s.id].caught));
      if (far.length) { sps = fresh.length ? fresh : far; guest = true; }
    }
    if (!guest) sps = W.evenMyth(sps, r()); // 4.28: мифология — поровну
    const t = { id: U.uid(), t: q.t, n, el, p: 0, tier: q.tier, sid: sps[Math.floor(r() * sps.length)].id, text: q.text(n, el) };
    if (guest) t.guest = true;
    return t;
  },
  /* 4.16: «гости издалека» — духи, которых здесь и сейчас не встретить: вещие птицы других частей света, духи чужих
     земель и сезонные не в свой сезон. Их приводят трудные поручения родников (шанс GUEST), так что поймать можно всех */
  GUEST: 0.3,
  guests(lat, lng) { return SPECIES.filter(s => s.stage === 1 && !s.legend && s.season && !(Ev.seasonal(s) > 0)); },


  /* ---------- 4.0: обучение новичка ---------- */
  tutAt() { return (this.d && this.d.tut && TUT[this.d.tut - 1]) || null; },
  // Шаг выполнен: kind — что сделал игрок, id — для разделов. В конце этапа — его награда.
  tutAdvance(kind, id) {
    const st = this.tutAt();
    if (!st || st.kind !== kind || (id && st.id !== id)) return null;
    const next = TUT[this.d.tut], got = !next || next.ch !== st.ch ? this.giveRewards(TUT_CHAPTERS[st.ch].reward, true, true) : [];
    this.d.tut = next ? this.d.tut + 1 : 0;
    if (got.length) Bus.emit('tutChapter', { ch: st.ch, got, done: !next });
    this.save();
    return { got, done: !next };
  },

  /* ---------- Знаки Ордена ---------- */
  medalValue(m) {
    const st = this.d.stats;
    if (m.stat === 'dex') return SPECIES.filter(s => this.d.dex[s.id] && this.d.dex[s.id].caught).length;
    if (m.stat === 'lands') return SPECIES.filter(s => s.land && this.d.dex[s.id] && this.d.dex[s.id].caught).length;
    if (m.stat === 'myths') return SPECIES.filter(s => s.myth !== 'slavic' && this.d.dex[s.id] && this.d.dex[s.id].caught).length; // 4.28
    if (m.stat.startsWith('el:')) return st.byEl[m.stat.slice(3)] || 0;
    return st[m.stat] || 0;
  },
  medalTier(m) { return m.tiers.filter(t => this.medalValue(m) >= t).length; },
  checkMedals() {
    if (!this.d || this._medalBusy) return;
    this._medalBusy = true;
    MEDALS.forEach(m => {
      const tier = this.medalTier(m), had = this.d.medals[m.id] || 0;
      if (tier > had) {
        this.d.medals[m.id] = tier;
        for (let t = had; t < tier; t++) this.addXP(MEDAL_TIERS[t].xp, true); // разовая награда — без дневного потолка
        Bus.emit('medal', { m, tier });
        J.add('medal', { name: m.name, tier });
      }
    });
    this._medalBusy = false;
  },
};
