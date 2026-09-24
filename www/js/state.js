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
    // 3.19: новая кривая опыта — опыт переносится в то же место внутри текущего уровня (уровень не понижается)
    if (!d.xpv) {
      const L = d.level || 1;
      if (L >= MAX_LEVEL) d.xp = Math.max(d.xp || 0, levelXP(MAX_LEVEL));
      else if (L >= 10) {
        const o0 = levelXPOld(L), o1 = levelXPOld(L + 1), n0 = levelXP(L), n1 = levelXP(L + 1);
        const f = U.clamp(((d.xp || 0) - o0) / (o1 - o0), 0, 0.999);
        d.xp = Math.round(n0 + f * (n1 - n0));
      }
      d.xpv = 2;
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
    d.story = d.story || { ch: 0, p: [0, 0, 0] };
    // 4.0: обучение стало длиннее — шаги прежнего (1 поймать, 2 родник, 3 меню) переводятся в новые
    if (d.tut && d.tutV !== 4) { d.tut = { 1: 1, 2: TUT.findIndex(s => s.id === 'springs') + 1, 3: TUT.findIndex(s => s.id === 'road') + 1 }[d.tut] || 1; d.tutV = 4; }
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
    const sp = this.makeSpirit(starter, 5, 'starter' + Date.now(), { ivMin: 10 });
    this.addSpirit(sp, true);
    this.d.essence[SP[starter].fam] = 10;
    this.d.buddy = { uid: sp.uid, km: 0, finds: 0 };
    this.d.tut = 1; this.d.tutV = 4; // обучение «Посвящение в Ловчие» (4.0)
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
  canLearnMove2(sp) {
    if (sp.move2) return 'Приём уже выучен';
    if (this.d.sparks < MOVE2_COST.sparks) return `Нужно ✦ ${MOVE2_COST.sparks}`;
    if ((this.d.essence[SP[sp.sid].fam] || 0) < MOVE2_COST.essence) return `Нужно ${MOVE2_COST.essence} эссенции`;
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
    return { uid: U.uid(), sid, lvl, iv, t: Date.now(), fav: false, nick: null };
  },
  ivPct(sp) { return Math.round((sp.iv[0] + sp.iv[1] + sp.iv[2]) / 45 * 100); },
  maxLvl() { return Math.min(40, this.d.level + 5); },
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
      let extra = '';
      if (b.finds % 3 === 0) {
        const it = U.weighted([['charm', 5], ['honey', 2], ['water', 1]], Math.random());
        const n = it === 'charm' ? 3 : 1;
        if (this.addItem(it, n)) extra = ` и ${ITEMS[it].name.toLowerCase()} ×${n}`;
      }
      Bus.emit('buddyFind', `Спутник «${U.esc(sp.nick || s.name)}» принёс 3 эссенции${extra}!`);
    }
  },
  addEssence(fam, n) { this.d.essence[fam] = (this.d.essence[fam] || 0) + n; },
  powerUpCost(sp) { return { sparks: 200 + 200 * Math.floor((sp.lvl - 1) / 4), essence: 1 + Math.floor(sp.lvl / 10) }; },
  canPowerUp(sp) {
    const c = this.powerUpCost(sp), fam = SP[sp.sid].fam;
    if (sp.lvl >= this.maxLvl()) return 'Предел: уровень духа не может быть выше уровня Ловчего +5';
    if (this.d.sparks < c.sparks) return 'Не хватает искр';
    if ((this.d.essence[fam] || 0) < c.essence) return 'Не хватает эссенции';
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
  canPurify(sp) {
    if (!sp.dark) return 'Дух не омрачён';
    if (this.d.sparks < this.PURIFY.sparks) return `Нужно ✦ ${this.PURIFY.sparks}`;
    if ((this.d.essence[SP[sp.sid].fam] || 0) < this.PURIFY.essence) return `Нужно ${this.PURIFY.essence} эссенции`;
    return null;
  },
  purify(sp) {
    if (this.canPurify(sp)) return false;
    this.d.sparks -= this.PURIFY.sparks;
    this.d.essence[SP[sp.sid].fam] -= this.PURIFY.essence;
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
    if (!s.evo) return 'Этот дух не превращается';
    if ((this.d.essence[s.fam] || 0) < s.cost) return `Нужно ${s.cost} эссенции`;
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
    this.addXP(isNew ? 1000 : 500);
    this.progress('evolve', 1);
    this.save();
    return { isNew };
  },

  /* ---------- предметы ---------- */
  bagLimit() { return BAG_LIMIT + (this.d.bagExtra || 0) * Rules.BAG_STEP; },
  bagCount() { return Object.values(this.d.items).reduce((a, b) => a + b, 0); },
  // over — награда за достижение (уровень, серия дней, задание, Летопись, Тропа, бой): кладётся и сверх лимита сумки,
  // иначе она молча пропадала бы. Добыча родника и находки спутника лимит соблюдают
  addItem(k, n = 1, over = false) {
    const room = over ? n : this.bagLimit() - this.bagCount();
    const add = Math.max(0, Math.min(n, room));
    this.d.items[k] = (this.d.items[k] || 0) + add;
    this.save();
    return add;
  },
  useItem(k) { if ((this.d.items[k] || 0) <= 0) return false; this.d.items[k]--; this.save(); return true; },
  giveRewards(rw, over = true) { // { charm: 5, sparks: 300, xp: 100 ... } → массив строк для показа; over — см. addItem
    const out = [];
    for (const [k, n] of Object.entries(rw)) {
      if (!n) continue;
      if (k === 'sparks') { this.d.sparks += n; out.push({ k, n, label: 'Искры' }); }
      else if (k === 'zlat') { this.d.zlat = (this.d.zlat || 0) + n; out.push({ k, n, label: 'Златники' }); }
      else if (k === 'xp') { out.push({ k, n: Math.round(n * Ev.xpMul()), label: 'Опыт' }); this.addXP(n); }
      else if (ITEMS[k]) { const a = this.addItem(k, n, over); if (a) out.push({ k, n: a, label: ITEMS[k].name }); }
    }
    this.save();
    return out;
  },
  incenseActive() { return this.d.incenseUntil > Date.now(); },

  /* ---------- опыт ---------- */
  addXP(n) {
    n = Math.round(n * Ev.xpMul());
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
  },
  levelRewards(l) {
    const r = { charm: 10 + l, honey: 3, water: 3, zlat: Rules.ZLAT.level };
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
    let pool = SPECIES.filter(s => !s.legend && s.rar === rar && s.stage === 1 && W.local(s) && !s.season && !s.story);
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
    const pool = QUEST_TEMPLATES.filter(q => (q.t !== 'raid' || this.d.level >= 5) && (q.t !== 'duel' || this.d.level >= 3));
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
      if (q.p >= q.n) Bus.emit('toast', { text: `Поручение выполнено: ${q.text}`, cls: 'good' });
    });
    // Летопись
    const ch = STORY[this.d.story.ch];
    if (ch) ch.steps.forEach((s, i) => {
      if (s.t !== type || this.d.story.p[i] >= s.n) return;
      if (type === 'catchEl' && meta.el !== s.el) return;
      this.d.story.p[i] = Math.min(s.n, this.d.story.p[i] + amount);
      changed = true;
      if (this.d.story.p[i] >= s.n) Bus.emit('storyStep', s);
    });
    if (changed) { Bus.emit('quests'); this.save(); }
  },
  questsClaimable() {
    const daily = this.d.quests ? this.d.quests.list.filter(q => q.p >= q.n && !q.claimed).length : 0;
    return daily + (this.storyReady() ? 1 : 0) + this.d.tasks.filter(q => q.p >= q.n).length + this.d.taskMeet.length;
  },
  // Новое поручение (выдаёт сервер у родника): задание и дух, который встретится в награду
  makeTask() {
    const r = Math.random, pool = TASK_TEMPLATES.filter(q => !q.lvl || this.d.level >= q.lvl);
    const q = pool[Math.floor(r() * pool.length)], T = TASK_TIERS[q.tier];
    const n = q.min + Math.floor(r() * (q.max - q.min + 1)), el = ELEMENT_KEYS[Math.floor(r() * ELEMENT_KEYS.length)];
    const sps = SPECIES.filter(s => s.stage === 1 && !s.legend && !s.region && !s.land && !s.season && T.rar.includes(s.rar));
    return { id: U.uid(), t: q.t, n, el, p: 0, tier: q.tier, sid: sps[Math.floor(r() * sps.length)].id, text: q.text(n, el) };
  },


  /* ---------- 4.0: обучение «Посвящение в Ловчие» ---------- */
  tutAt() { return (this.d && this.d.tut && TUT[this.d.tut - 1]) || null; },
  // Шаг выполнен: kind — что сделал игрок, id — для сцен и разделов. В конце главы — её награда.
  tutAdvance(kind, id) {
    const st = this.tutAt();
    if (!st || st.kind !== kind || (id && st.id !== id)) return null;
    const next = TUT[this.d.tut], got = !next || next.ch !== st.ch ? this.giveRewards(TUT_CHAPTERS[st.ch].reward) : [];
    this.d.tut = next ? this.d.tut + 1 : 0;
    if (got.length) Bus.emit('tutChapter', { ch: st.ch, got, done: !next });
    this.save();
    return { got, done: !next };
  },
  /* ---------- Летопись ---------- */
  storyReady() {
    const ch = STORY[this.d.story.ch];
    return !!ch && ch.steps.every((s, i) => this.d.story.p[i] >= s.n);
  },
  claimStory() {
    const ch = STORY[this.d.story.ch];
    if (!ch || !this.storyReady()) return null;
    const got = this.giveRewards({ ...ch.reward, zlat: Rules.ZLAT.story });
    this.d.story = { ch: this.d.story.ch + 1, p: [0, 0, 0] };
    this.save();
    return { ch, got };
  },

  /* ---------- Знаки Ордена ---------- */
  medalValue(m) {
    const st = this.d.stats;
    if (m.stat === 'dex') return SPECIES.filter(s => this.d.dex[s.id] && this.d.dex[s.id].caught).length;
    if (m.stat === 'lands') return SPECIES.filter(s => s.land && this.d.dex[s.id] && this.d.dex[s.id].caught).length;
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
        for (let t = had; t < tier; t++) this.addXP(MEDAL_TIERS[t].xp);
        Bus.emit('medal', { m, tier });
        J.add('medal', { name: m.name, tier });
      }
    });
    this._medalBusy = false;
  },
};
