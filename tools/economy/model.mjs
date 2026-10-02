// Модель экономики «Духолова»: ожидаемый доход и траты по действиям (из настоящих формул игры), три типа игрока
// день за днём, сроки до целей. Числа игры берутся из загруженных модулей (load.mjs); то, что в коде сервера записано
// прямо в обработчике (награда разлома, Капища, вторжения…), повторено здесь — и сверяется с исходником (expectSrc):
// поменяли число в core.js — модель скажет, что разошлась с игрой.
import { loadGame, source, chestEV } from './load.mjs';

export const DAY = 86400000;

/* ---------- сверка с исходником: числа, которые модель повторяет руками ---------- */
export const DRIFT = [];
export function expectSrc(file, literal) {
  if (!source(file).includes(literal)) DRIFT.push(`${file}: нет «${literal}» — модель разошлась с игрой, поправь tools/economy/model.mjs`);
}
const CORE = 'server/game/core.js', STATE = 'www/js/state.js';
expectSrc(CORE, 'xp: Math.round(1000 * tier * (allies ? 1.25 : 1)), sparks: 350 * tier, charm: 5, honey: tier, herb: tier === 1 ? 1 : 0, water: tier >= 2 ? 1 : 0, charm2: tier >= 2 ? 3 : 0');
expectSrc(CORE, 'S.rollAmulet([0.05, 0.12, 0.3][tier - 1], b.rid)');
expectSrc(CORE, 'xp: T.xp * mul, sparks: T.sparks * mul, charm: 5 * mul, honey: (t - 1) * mul, herb: t < 3 ? 1 : 0, water: t === 3 ? 1 : 0, charm2: t >= 2 ? 3 * mul : 0, charm3: t === 3 ? 2 * mul : 0');
expectSrc(CORE, 'S.rollAmulet(0.04 * t, e.id)');
expectSrc(CORE, '{ xp: 1000, sparks: 400, charm: 6, honey: 1, herb: 1 }');
expectSrc(CORE, 'S.rollAmulet(0.04, b.invId)');
expectSrc(CORE, '{ xp: 800, sparks: 300, charm: 3, honey: 1 }');
expectSrc(CORE, 'xp: 250 * q.tier');
expectSrc(CORE, 'c = { charm: 3 + Math.floor(r() * 4) }');
expectSrc(CORE, 'if (r() < 0.12 + lv * 0.03) c.cocoon = 5;');
expectSrc(CORE, 'xp: 100 + (() => { let r = 0; FRIEND_LEVELS.forEach');
expectSrc(CORE, '{ ...loot, xp: 50 }');
expectSrc(CORE, 'Raid.TIER[tier].charms + bonus + (Ev.cur.rifts ? 3 : 0) + allies * 2');
expectSrc(STATE, 'this.addEssence(s.fam, c.km * 3);');
expectSrc(STATE, 'this.d.sparks += c.km * 150;');
expectSrc(STATE, 'this.addXP(c.km * 100 + (isNew ? 500 : 0));');
expectSrc(STATE, "U.weighted([['charm', 5], ['honey', 2], ['water', 1]], Math.random())");
expectSrc(STATE, 'this.addEssence(s.fam, 3);');
expectSrc(STATE, 'this.addXP(isNew ? 1000 : 200);');
expectSrc('www/js/world.js', 'cocoon = U.weighted([[2, 5], [5, 4], [10, 1]], r())');
expectSrc('www/js/world.js', 'const n = (4 + Math.floor(r() * 3)) * Ev.lootMul();');

/* ---------- сценарии ----------
   now — игра как есть. old — экономика 5.1.19, до правок 5.1.20–5.1.21: искры Лиги и сундука сезона ÷10, прежняя Тропа
   (формулой, с «поздней» Золотой с 25 уровня), опыт Знаков ÷10, обменник ✦ 1 000 → 10 монет всем, эссенция разлома —
   семейству босса (а не эссенция Рода). Значения — из истории git (e4e0316^ и f1b5dff^) */
// части отката: league — искры Лиги, pass — прежняя Тропа, medals — опыт Знаков, exchange — курс обменника, rift — эссенция разлома
export const OLD_PARTS = ['league', 'pass', 'medals', 'exchange', 'rift'];
export function patchOld(G, parts = OLD_PARTS) {
  const { LEAGUE_RANKS, League, Rules, MEDAL_TIERS } = G;
  if (parts.includes('league')) {
    const sp = [null, 500, 800, null, 1500, null, 3000, null, 5000, 8000];
    LEAGUE_RANKS.forEach((x, i) => { if (sp[i] != null && x.reward) x.reward.sparks = sp[i]; });
    League.prize = r => (r > 0 ? { sparks: 400 * r, charm2: 2 * r, charm3: Math.floor(r / 2) } : null);
  }
  if (parts.includes('medals')) { MEDAL_TIERS[0].xp = 500; MEDAL_TIERS[1].xp = 1500; MEDAL_TIERS[2].xp = 5000; }
  if (parts.includes('exchange')) { Rules.EXCHANGE.ZLAT = 10; Rules.EXCHANGE.CAMP = 10; }
  if (parts.includes('rift')) G.__riftFamily = true;
  if (!parts.includes('pass')) return;
  Rules.PASS.LATE = 25;
  Rules.passGoldLate = function (lvl) {
    if (lvl === 30) return { look: 'trail', charm3: 10, xpbrew: 1 };
    if (lvl === 15) return { look: '#065f46', zlat: 50, sparks: 3000 };
    if (lvl % 10 === 0) return { xpbrew: 1, zlat: 40, sparks: 3000 };
    if (lvl % 5 === 0) return { amulet: 1, zlat: 30 };
    if (lvl % 3 === 0) return { charm3: 5, zlat: 15 };
    return lvl % 2 ? { charm3: 3, sparks: 1500 } : { brew: 2, sparks: 2500 };
  };
  Rules.passReward = function (track, lvl, plvl) {
    if (track === 'gold' && plvl >= this.PASS.LATE) return this.passGoldLate(lvl);
    if (track === 'free') {
      if (lvl === 30) return { charm3: 5, deadwater: 1, zlat: 10 };
      if (lvl % 10 === 0) return { cocoon: 5, zlat: 5 };
      if (lvl % 5 === 0) return { incense: 1, zlat: 3 };
      return lvl % 2 ? { charm: 8 } : { honey: 3, sparks: 300 };
    }
    if (lvl === 30) return { look: 'trail', charm3: 10, cocoon: 10 };
    if (lvl === 15) return { look: '#065f46', zlat: 50 };
    if (lvl % 10 === 0) return { cocoon: 10, zlat: 40 };
    if (lvl % 5 === 0) return { amulet: 1, zlat: 30 };
    if (lvl % 3 === 0) return { charm3: 3, zlat: 15 };
    return lvl % 2 ? { charm2: 5, sparks: 500 } : { water: 3, sparks: 800 };
  };
}

/* ---------- сценарий «предложение» (только для модели: в игре ничего не меняется) ----------
   Что проверяем (раздел «Что бы я поменял» в отчёте). tropa и medals уже в игре с 5.1.21 (Тропа ужата, знаки 1 000 / 10 000 /
   20 000) — по умолчанию не применяются, иначе Тропа ужалась бы второй раз; оставлены для сравнения со старой таблицей:
   tropa — бесплатная Тропа: искры ÷3, обереги ÷3, мёд ÷4; на 10, 20 и 30-й ступени + осколок Алатыря; Золотая: искры ÷2,
           Живая вода ÷3, на 15 и 25-й + осколок Алатыря;
   medals — опыт Знаков серебро 10 000, золото 20 000;
   loot — источник: предметов 3–5 вместо 4–6 (W.springLoot), подорожник 2 → 1, отвар 0,8 → 0,3, Живая вода 0,6 → 0,3;
   track — в зачёт пути не больше 30 км в день (Rules.TRACK.DAY 60 000 → 30 000) — только для сравнения: путь — дело
           механики движения, а не экономики;
   per — ступень Тропы 60 очков вместо 40 (Rules.PASS.PER) — отдельно, для сравнения;
   ex2 — обменник ✦ 2 000 → 1 монета при тех же 5 обменах в день (Rules.EXCHANGE.SPARKS) — отдельно */
export const PROP_PARTS = ['loot'];
export function patchProposal(G, parts = PROP_PARTS) {
  const { Rules, MEDAL_TIERS, W } = G;
  const r100 = x => Math.round(x / 100) * 100;
  if (parts.includes('tropa')) {
    Rules.PASS_FREE = Rules.PASS_FREE.map((x, i) => {
      const o = { ...x };
      if (o.sparks) o.sparks = r100(o.sparks / 3);
      if (o.charm) o.charm = Math.round(o.charm / 3);
      if (o.honey) o.honey = Math.round(o.honey / 4);
      if ((i + 1) % 10 === 0) o.alatyr = 1;
      return o;
    });
    Rules.PASS_GOLD = Rules.PASS_GOLD.map((x, i) => {
      const o = { ...x };
      if (o.sparks) o.sparks = r100(o.sparks / 2);
      if (o.water) o.water = Math.round(o.water / 3);
      if (i + 1 === 15 || i + 1 === 25) o.alatyr = 1;
      return o;
    });
  }
  if (parts.includes('medals')) { MEDAL_TIERS[1].xp = 10000; MEDAL_TIERS[2].xp = 20000; }
  if (parts.includes('loot')) {
    const so = W.springOpts.bind(W);
    W.springOpts = lvl => so(lvl).map(([k, w]) => [k, k === 'herb' ? 1 : k === 'brew' ? 0.3 : k === 'water' ? 0.3 : w]);
    G.__springN = 4; // 3 + floor(r × 3): в среднем 4 предмета вместо 5
  }
  if (parts.includes('track')) Rules.TRACK.DAY = 30000;
  if (parts.includes('per')) Rules.PASS.PER = 60; // ступень Тропы — 60 очков вместо 40 (1 800 за 30 ступеней)
  if (parts.includes('ex2')) Rules.EXCHANGE.SPARKS = 2000; // обменник ✦ 2 000 → 1 монета: сток искр вдвое, монет столько же
}

// загрузить игру для сценария; start — первый день модели (понедельник 5 октября 2026, 12:00 по Москве).
// scenario: 'now', 'old' (откат всех правок), 'old:league,pass' — откат только этих частей, 'prop' / 'prop:tropa' — предложение
export function setup(scenario = 'now', start = Date.UTC(2026, 9, 5, 9)) {
  const L = loadGame({ now: start });
  if (scenario === 'old') patchOld(L.G);
  else if (scenario.startsWith('old:')) patchOld(L.G, scenario.slice(4).split(','));
  else if (scenario === 'prop') patchProposal(L.G);
  else if (scenario.startsWith('prop:')) patchProposal(L.G, scenario.slice(5).split(','));
  L.scenario = scenario; L.start = start;
  return L;
}

/* ---------- Монте-Карло появления духов: настоящий W.pickSpecies ----------
   Время — случайное в часы игры (8–23 по местному), день — в окне days от начала, погода — веса Sky.simulate (не зима),
   «район» — случайная стихия. Луна — без событий (полнолуние и новолуние — 7% времени, в среднем почти не влияют) */
export function spawnSample(G, { n = 40000, seed = 'spawn', start, days = 77 } = {}) {
  const { W, U, Sky, SP, ELEMENT_KEYS } = G, r = U.rng(seed), tz = U.tz * 60000;
  const wx = [['clear', 4], ['partly', 4], ['overcast', 3], ['rain', 2], ['fog', 1], ['windy', 1.5], ['storm', 0.6]];
  const save = U.skew, moon = Sky.moonEvent, out = [];
  Sky.moonEvent = () => null;
  const day0 = Math.floor((start + tz) / DAY) * DAY - tz;
  for (let i = 0; i < n; i++) {
    const t = day0 + Math.floor(r() * days) * DAY + (8 + r() * 16) * 3600000;
    U.skew = t - Date.now();
    Sky.w = { key: U.weighted(wx, r()) };
    const el = ELEMENT_KEYS[Math.floor(r() * ELEMENT_KEYS.length)];
    const sid = W.pickSpecies(r, el, U.isNight(), 37.6, 55.75);
    out.push({ sid, boost: Sky.boosted(SP[sid].el) });
  }
  U.skew = save; Sky.w = null; Sky.moonEvent = moon;
  return out;
}

/* ---------- Монте-Карло поимки дикого духа: как GameCore.H.encThrow ----------
   Уровень духа на карте — как W.spawnsAround; оберег — обычный, редким — серебряный (с 8 уровня), эпическим — золотой
   (с 16 уровня); мёд — один на встречу с редким и выше (skill.honey); промах — skill.hit; кольцо — skill.ring
   (доли «Хорошо» / «Отлично» / «Превосходно»); после 15 бросков Ловчий сдаётся. Шанс и награда — Rules.catchChance,
   Rules.ringBonus, Rules.catchReward; побег — RARITY.flee (×1,5 после третьего броска) */
const RING = [0.85, 0.55, 0.3];
const ringPick = (U, skill, r) => RING[U.weighted([[0, skill.ring[0]], [1, skill.ring[1]], [2, skill.ring[2]]], r())];
export function catchMC(G, spawns, L, skill, { n = 6000, seed } = {}) {
  const { Rules, RARITY, SP, U } = G, r = U.rng(seed || `catch:${L}:${skill.hit}:${skill.ring}`);
  const c2 = L >= 8, c3 = L >= 16;
  const A = { enc: 0, caught: 0, fled: 0, use: { charm: 0, charm2: 0, charm3: 0, honey: 0 }, great: 0, xp: 0, sparks: 0, ess: 0, encR: {}, caughtR: {}, el: {}, thr: 0 };
  for (let i = 0; i < n; i++) {
    const sp = spawns[Math.floor(r() * spawns.length)], s = SP[sp.sid];
    const maxL = Math.min(30 + (sp.boost ? 5 : 0), Math.max(1, Math.min(40, L)));
    const lvl = Math.max(sp.boost ? Math.min(6, maxL) : 1, Math.min(maxL, Math.round(1 + r() * maxL)));
    const item = s.rar >= 4 && c3 ? 'charm3' : s.rar >= 3 && c2 ? 'charm2' : 'charm';
    let honey = !!skill.honey && s.rar >= 3, throws = 0, done = null, bonus = null;
    if (honey) A.use.honey++;
    A.enc++; A.encR[s.rar] = (A.encR[s.rar] || 0) + 1;
    while (throws < 15 && !done) {
      throws++; A.use[item]++;
      if (r() >= skill.hit) continue;
      bonus = Rules.ringBonus(ringPick(U, skill, r));
      if (bonus.great) A.great++;
      const ch = Rules.catchChance({ mode: 'wild', sid: s.id, lvl, item, honey, mul: bonus.mul });
      honey = false;
      if (r() < ch) { done = 'caught'; break; }
      if (r() < RARITY[s.rar].flee * (throws > 3 ? 1.5 : 1)) done = 'fled';
    }
    A.thr += throws;
    if (done === 'caught') {
      const rw = Rules.catchReward({ mode: 'wild', sid: s.id, isNew: false, ringXp: bonus.xp, throws, shiny: false, boost: sp.boost });
      A.caught++; A.xp += rw.xp; A.sparks += rw.sparks; A.ess += rw.ess;
      A.caughtR[s.rar] = (A.caughtR[s.rar] || 0) + 1; A.el[s.el] = (A.el[s.el] || 0) + 1;
    } else if (done === 'fled') A.fled++;
  }
  const per = k => A.use[k] / A.enc, pR = {};
  for (const k of Object.keys(A.encR)) pR[k] = (A.caughtR[k] || 0) / A.encR[k];
  const el = {}; for (const k of Object.keys(A.el)) el[k] = A.el[k] / A.caught;
  return { L, pCatch: A.caught / A.enc, pFlee: A.fled / A.enc, throws: A.thr / A.enc,
    perEnc: { charm: per('charm'), charm2: per('charm2'), charm3: per('charm3'), honey: per('honey'), great: A.great / A.enc },
    perCatch: { xp: A.xp / A.caught, sparks: A.sparks / A.caught, ess: A.ess / A.caught }, pR, el,
    rarShare: Object.fromEntries(Object.keys(A.caughtR).map(k => [k, A.caughtR[k] / A.caught])) };
}

// встреча после победы (разлом), поручения или вторжения: бега нет; обереги — разлома (raid) или свои; P(поимки)
export function specialCatchMC(G, { mode, sid, lvl = 20, charms = 15, item = 'charm', skill, n = 4000, seed }) {
  const { Rules, U, SP } = G, r = U.rng(seed || `sp:${mode}:${sid}:${lvl}:${charms}`);
  let caught = 0, thrown = 0, honeyUsed = 0;
  for (let i = 0; i < n; i++) {
    let honey = !!skill.honey && SP[sid].rar >= 3, t = 0;
    if (honey) honeyUsed++;
    while (t < charms) {
      t++;
      if (r() >= skill.hit) continue;
      const b = Rules.ringBonus(ringPick(U, skill, r));
      const ch = Rules.catchChance({ mode, sid, lvl, item, honey, mul: b.mul });
      honey = false;
      if (r() < ch) { caught++; break; }
    }
    thrown += t;
  }
  return { p: caught / n, throws: thrown / n, honey: honeyUsed / n };
}

/* ---------- ожидаемая добыча источника на уровне L: W.springOpts, W.SPRING_GIFT, W.SPRING_COCOON ---------- */
export function springEV(G, L, ev = {}) {
  const { W } = G, opts = W.springOpts(L), tot = opts.reduce((a, x) => a + x[1], 0), n = (G.__springN || 5) * (ev.loot || 1); // 4 + floor(r × 3) → в среднем 5
  const items = {};
  for (const [k, w] of opts) items[k] = n * w / tot;
  return { items, gift: W.SPRING_GIFT, cocoon: W.SPRING_COCOON * (ev.km || 1), cocoonKm: { 2: 0.5, 5: 0.4, 10: 0.1 }, xp: 50 };
}

/* ---------- задания дня: среднее по шаблонам, доступным на уровне L (как S.ensureQuests) ---------- */
export function questEV(G, L) {
  const pool = G.QUEST_TEMPLATES.filter(q => (q.t !== 'raid' || L >= G.RAID_LEVEL) && (q.t !== 'duel' || L >= G.DUEL_LEVEL));
  const rw = {};
  for (const q of pool) for (const [k, v] of Object.entries(q.reward)) rw[k] = (rw[k] || 0) + v / pool.length;
  return rw;
}

/* ---------- поручения источников: ступень (по доступным шаблонам) и награда (TASK_TIERS, опыт 250 × ступень) ---------- */
export function taskEV(G, L) {
  const pool = G.TASK_TEMPLATES.filter(q => !q.lvl || L >= q.lvl), p = {};
  for (const q of pool) p[q.tier] = (p[q.tier] || 0) + 1 / pool.length;
  const rw = { xp: 0 };
  for (const [t, w] of Object.entries(p)) {
    for (const [k, v] of Object.entries(G.TASK_TIERS[t].reward)) rw[k] = (rw[k] || 0) + v * w;
    rw.xp += 250 * t * w;
  }
  // дух встречи: ступень → редкость (виды первой стадии без легенд и сезонных; мифология поровну — доли видов в мифологии)
  const sp = G.SPECIES.filter(s => s.stage === 1 && !s.legend && !s.season && s.myth === 'slavic');
  const rar = {};
  for (const [t, w] of Object.entries(p)) {
    const ok = sp.filter(s => G.TASK_TIERS[t].rar.includes(s.rar));
    for (const s of ok) rar[s.rar] = (rar[s.rar] || 0) + w / ok.length;
  }
  return { pTier: p, rw, rar };
}

/* ---------- Типы игроков: все допущения — здесь ----------
   Числа «в день» — на день, когда Ловчий играет; week — в какие дни недели играет (пн…вс).
   catches — пойманных диких духов (не встреч), springs — источников, km — засчитанного пути (джойстик: шаг 20 км/ч,
   бег 60 км/ч, Rules.MOVE; в зачёт не больше Rules.TRACK.DAY = 60 км в день). raids / duels — ПОБЕД по ступеням
   (разломы с 4 уровня, Капища с 5-го), invasions — побед над прислужниками (с 7-го), league — боёв Лиги (с 5-го),
   leagueP — доля побед (соперник — живой ±150 рейтинга или Ловчий Ордена). quests — забранных заданий дня из 3, chest —
   доля дней с сундуком, tasks — выполненных поручений, friends — друзей, с кем каждый день обмен подарками, spar —
   поединков с друзьями с наградой (до 3), holds — Капищ, где в среднем стоит защитник (дань и плата за службу),
   incense / gates / farpass — сколько ладана, Врат и Дальних пропусков тратит (если есть), heal — лечебных предметов
   на победу в бою, raidWater — Живой воды в бою на победу в разломе 2–3-й ступени, dead — Мёртвой воды в день, evolve / melt — доля дневной эссенции семейств, что идёт на эволюции / переплавку в эссенцию Рода,
   exchange — обменов искр на монеты в день (если искр с запасом), trades — сделок на аукционе в день */
export const PROFILES = {
  casual: {
    name: 'Казуальный', minutes: 20, week: [1, 1, 1, 1, 1, 1, 0],
    catches: 12, springs: 6, km: 4, hit: 0.85, ring: [0.6, 0.3, 0.1], honey: true,
    raids: { 1: 0.35, 2: 0.1, 3: 0.03 }, duels: { 1: 0.3, 2: 0.15, 3: 0.05 }, invasions: 0.1,
    league: 1, leagueP: 0.5, quests: 2, chest: 0.25, tasks: 0.6, friends: 1, spar: 0.2, holds: 0,
    incense: 0.3, gates: 0.05, farpass: 0.3, heal: 0.3, raidWater: 0.3, dead: 0.02, evolve: 0.3, melt: 0, exchange: 0, trades: 0,
    time: 'поимки 12 × 30 с = 6 мин, источники 6 × 20 с = 2, путь 4 км ≈ 4, Лига 1 бой ≈ 3, разлом и Капище ≈ 2, задания и меню ≈ 3',
  },
  regular: {
    name: 'Обычный', minutes: 60, week: [1, 1, 1, 1, 1, 1, 1],
    catches: 35, springs: 15, km: 15, hit: 0.88, ring: [0.5, 0.35, 0.15], honey: true,
    raids: { 1: 0.9, 2: 0.5, 3: 0.1 }, duels: { 1: 0.8, 2: 0.5, 3: 0.2 }, invasions: 0.5,
    league: 3, leagueP: 0.55, quests: 3, chest: 0.85, tasks: 2, friends: 4, spar: 1, holds: 1,
    incense: 1, gates: 0.3, farpass: 0.5, heal: 0.5, raidWater: 0.5, dead: 0.05, evolve: 0.5, melt: 0.5, exchange: 5, trades: 0.1,
    time: 'поимки 35 × 30 с ≈ 17 мин, источники 15 × 20 с = 5, путь 15 км ≈ 12, разломы и Капища 3 × 3 ≈ 10, Лига 3 боя ≈ 9, меню ≈ 7',
  },
  hardcore: {
    name: 'Хардкорный', minutes: 180, week: [1, 1, 1, 1, 1, 1, 1],
    catches: 120, springs: 30, km: 60, hit: 0.92, ring: [0.4, 0.4, 0.2], honey: true,
    raids: { 1: 3, 2: 2, 3: 1 }, duels: { 1: 3, 2: 2, 3: 1 }, invasions: 3,
    league: 10, leagueP: 0.6, quests: 3, chest: 1, tasks: 4, friends: 12, spar: 3, holds: 3,
    incense: 2, gates: 1, farpass: 1, heal: 0.7, raidWater: 0.8, dead: 0.15, evolve: 0.6, melt: 1, exchange: 5, trades: 0.3,
    time: 'поимки 120 × 30 с = 60 мин, источники 30 × 20 с = 10, путь 60 км ≈ 45, разломы и Капища 12 × 3 ≈ 36, Лига 10 боёв ≈ 30, меню ≈ 10',
  },
};
// общие допущения (не зависят от типа)
export const COMMON = {
  seasonDays: 30,      // длина сезона Алатыря (= сезон Лиги): зависит от всего Ордена; Rules.ALATYR_WORLD — «10–30 дней» для первого
  monthDays: 30,       // Сезонная тропа — календарный месяц (в модели — по 30 дней)
  orderAll: true,      // Орден каждую неделю доходит до всех трёх ступеней общего дела (нужно ~120 очков на участника)
  raidSpeed: 2,        // оберегов разлома за скорость (floor((90 − t) / 15)): победа за ~60 с
  reserve: 20000,      // искр Ловчий держит про запас (сверх — в обменник)
  // когда сумка и посылка Ордена полны — что выбрасывается первым и сколько каждого оставляется
  waste: [['herb', 0], ['brew', 0], ['honey', 30], ['water', 30], ['gift', 25], ['charm', 150], ['incense', 5], ['charm2', 60], ['farpass', 3], ['gate', 5], ['charm3', 60], ['xpbrew', 2], ['deadwater', 5]],
};

const ITEM_KEYS = ['charm', 'charm2', 'charm3', 'honey', 'herb', 'brew', 'water', 'deadwater', 'incense', 'farpass', 'gate', 'xpbrew', 'gift'];
// средняя редкость босса Разлома 2-й ступени (редкие и эпические, кроме легенд) и доля эпических — по мифологии
function t2Boss(G) {
  const pool = G.SPECIES.filter(s => !s.legend && s.rar >= 3 && !s.season && s.myth === 'slavic');
  return { rar: pool.reduce((a, s) => a + s.rar, 0) / pool.length, epic: pool.filter(s => s.rar === 4).length / pool.length };
}
// вероятность, что набрано не меньше k из независимых «есть / нет» с вероятностями ps (k = все — точно, иначе — нормально)
function atLeast(ps, k) {
  if (k >= ps.length) return ps.reduce((a, p) => a * p, 1);
  const mu = ps.reduce((a, p) => a + p, 0), v = ps.reduce((a, p) => a + p * (1 - p), 0);
  if (v < 1e-9) return mu >= k ? 1 : 0;
  const z = (k - 0.5 - mu) / Math.sqrt(v);
  return 1 - 0.5 * (1 + erf(z / Math.SQRT2));
}
function erf(x) { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }

/* ---------- день за днём ----------
   Ожидаемые значения (дроби — нормально): каждый день Ловчий делает то, что записано в типе, а сервер платит, как в коде.
   Команда — три духа: A — первый редкий дух на выбор из Кампании (своя эссенция: спутник и эссенция Рода),
   B и C — «рабочие» духи (эссенция — из общей: Ловчий усиливает тех, на кого её хватает), B сменяет первый эпический,
   C — первая легенда (у них своя эссенция). Духи команды усиливаются до предела (S.maxLvl) и пробуждаются, как только можно
   (S.AWAKE). Спутник — дух команды со своей эссенцией, которому её больше всех не хватает; эссенция Рода вливается туда же.
   Искры сверх запаса — в обменник. opts.gold — когда покупать Золотую тропу: 'none' — никогда, 'earned' — как только
   хватает заработанных монет */
export function simulate(Lg, P, opts = {}) {
  const G = Lg.G, { Rules, S, SP, League, LEAGUE_RANKS, MEDALS, MEDAL_TIERS, XP_DAY, levelXP, MAX_LEVEL, CAMPAIGN, TUT_CHAPTERS, WEEK_EVENTS, Ev, Raid, SeasonRewards } = G;
  const days = opts.days || 365, C = { ...COMMON, ...(opts.common || {}) }, gold = opts.gold || 'none';
  const spawns = opts.spawns || spawnSample(G, { start: Lg.start });
  const skill = { hit: P.hit, ring: P.ring, honey: P.honey };
  // Монте-Карло поимок по уровням — общий кэш для прогонов с тем же навыком (opts.cache): правки экономики его не меняют
  const sk = `${P.hit}:${P.ring}:${P.honey}`, cache = opts.cache || {}, cmc = (cache[sk] = cache[sk] || {});
  const catchAt = L => { const k = Math.min(36, L); return (cmc[k] = cmc[k] || catchMC(G, spawns, k, skill, { n: opts.mcN || 6000 })); };
  // доли видов среди встреч: бестиарий, знаки и «новый вид»
  const freq = {}; for (const x of spawns) freq[x.sid] = (freq[x.sid] || 0) + 1 / spawns.length;
  const tb = t2Boss(G);
  const raidP = {}, raidPev = {};
  for (const t of [1, 2, 3]) {
    const boss = t === 1 ? 'kostrovik' : t === 2 ? 'domovoy' : 'zharptica', ch = Raid.TIER[t].charms + C.raidSpeed;
    raidP[t] = specialCatchMC(G, { mode: 'raid', sid: boss, charms: ch, skill });
    raidPev[t] = specialCatchMC(G, { mode: 'raid', sid: boss, charms: ch + 3, skill }); // неделя разломов: +3 оберега
  }
  const w0 = Ev.week(Lg.start);
  const slavic = G.SPECIES.filter(s => s.myth === 'slavic'), legendsSl = slavic.filter(s => s.legend), seasonalSl = slavic.filter(s => s.season);

  // ---------- состояние ----------
  const st = {
    level: 1, xp: 0, rest: 0, sparks: 500, zlat: 0, rod: 0, alatyr: 0,
    items: { charm: 30, honey: 3, water: 3, incense: 1, gate: 1 }, amulets: 0, amuletsRand: 0, amuletPick: 0,
    essOther: 10, cocoons: { 2: 1, 5: 0, 10: 0 }, inc: [],
    stats: { caught: 0, km: 0, springs: 0, raids: 0, duels: 0, invasions: 0, hatched: 0, evolved: 0, throwsGreat: 0, shiny: 0, streakBest: 0, orderPts: 0, alaSeasons: 0, traded: 0, byEl: {} },
    medals: {}, streak: 0, lastPlay: -2, league: { pts: 0, peak: 0, got: {} }, pass: { pts: 0, gold: false, got: { free: 0, gold: 0 } }, weekPts: 0,
    seasonShards: 0, encW: 0, epicCum: 0, legendCatch: 0, tier3Tasks: 0,
    team: [], camp: 0, campKm: 0, campR: { 1: 0, 2: 0, 3: 0 }, campSpr: 0, goldMonths: 0,
    flow: {}, waste: {}, overflowDays: 0, xpCut: 0,
  };
  const goals = {}, daily = [], snaps = {};
  const goal = (k, d) => { if (goals[k] == null) goals[k] = d; };
  // учёт потоков: flow[ресурс][откуда/куда] = сумма (+ доход, − трата)
  const flow = (k, why, v) => { if (!v) return; const f = st.flow[k] = st.flow[k] || {}; f[why] = (f[why] || 0) + v; };

  // ---------- выдача наград ----------
  let today = null; // учёт дня: опыт с потолком (raw), разовый (once), множитель события
  const give = (rw, src, once = false) => {
    for (const [k, v0] of Object.entries(rw || {})) {
      const v = +v0 || 0; if (!v) continue;
      if (k === 'sparks') st.sparks += v;
      else if (k === 'zlat') st.zlat += v;
      else if (k === 'xp') { if (once) today.once += v; else today.raw += v; flow('xp', src, v * today.mul); continue; }
      else if (k === 'rod' || k === 'alatyr') st[k] += v;
      else if (k === 'cocoon') { giveCocoon(+v0, 1, src); continue; }
      else if (k === 'amulet') { st.amulets += v; st.amuletsRand += v; }
      else if (k === 'amuletPick') { st.amulets += v; st.amuletPick += v; flow('amulet', src, v); continue; }
      else if (k === 'look' || k === 'skin') continue;
      else if (ITEM_KEYS.includes(k)) st.items[k] = (st.items[k] || 0) + v;
      else continue;
      flow(k === 'amulet' ? 'amulet' : k, src, v);
    }
  };
  const cocoonCount = () => st.cocoons[2] + st.cocoons[5] + st.cocoons[10] + st.inc.length;
  const giveCocoon = (km, n, src = 'прочее') => { const room = Math.max(0, 9 - cocoonCount()), a = Math.min(n, room); st.cocoons[km] += a; flow('cocoon', src, a); };
  const spend = (k, v, why) => {
    if (!(v > 0)) return 0;
    if (k === 'sparks' || k === 'zlat' || k === 'rod' || k === 'alatyr') st[k] -= v;
    else st.items[k] = (st.items[k] || 0) - v;
    flow(k, why, -v);
    return v;
  };
  const levelUp = d => {
    while (st.level < MAX_LEVEL && st.xp >= levelXP(st.level + 1)) {
      st.level++;
      give(S.levelRewards(st.level), 'награды за уровни');
      for (const l of [10, 15, 20, 25, 30, 35, 40]) if (st.level >= l) goal('level' + l, d);
    }
  };
  // опыт дня: потолок XP_DAY (FULL — полностью, до HALF — вполовину, дальше — четверть), опыт отдыха, множитель события
  const xpClose = () => {
    const x = today, F = XP_DAY.FULL * x.mul, H = XP_DAY.HALF * x.mul;
    const cap = T => Math.min(T, F) + Math.max(0, Math.min(T, H) - F) * 0.5 + Math.max(0, T - H) * 0.25;
    const T0 = (x.done || 0) * x.mul, T1 = ((x.done || 0) + x.raw) * x.mul;
    let got = cap(T1) - cap(T0);
    const bonus = Math.min(st.rest, got); st.rest -= bonus;
    st.xpCut += T1 - T0 - got; flow('xp', 'срезано дневным потолком', -(T1 - T0 - got)); flow('xp', 'опыт отдыха', bonus);
    got += bonus + x.once * x.mul;
    st.xp += got; x.got = (x.got || 0) + got; x.done = (x.done || 0) + x.raw; x.raw = 0; x.once = 0;
  };

  // ---------- команда ----------
  const spirit = (slot, sid, lvl, d, ess = 0, own = true) => ({ slot, sid, rar: SP[sid].rar, legend: !!SP[sid].legend, stage: SP[sid].stage, lvl, stars: 0, ess, own, day: d, move2: false });
  const maxLvl = sp => Math.min(40, st.level + 5) + S.AWAKE.STEP * Math.min(sp.stars, S.AWAKE.LVL.filter(l => st.level >= l).length);
  const essNeed = sp => { let e = 0; for (let l = sp.lvl; l < maxLvl(sp); l++) e += 1 + Math.floor(l / 10); return e; };
  const pourRate = sp => (sp.legend ? S.ESS.LEGEND : 1);
  const essOf = sp => (sp.own ? sp.ess : st.essOther);
  const essTake = (sp, n) => { if (sp.own) sp.ess -= n; else st.essOther -= n; };
  const pour = (sp, n) => { // влить эссенцию Рода до n эссенции (своя эссенция у легенд — 3 Рода за 1)
    if (!sp.own || sp.ess >= n) return;
    const want = n - sp.ess, can = Math.min(want, st.rod / pourRate(sp));
    if (can > 0) { spend('rod', can * pourRate(sp), 'вливание в духа'); sp.ess += can; flow('ess', 'эссенция Рода', can); }
  };
  const buddyOf = () => st.team.filter(x => x && x.own).sort((a, b) => (essNeed(b) - b.ess) - (essNeed(a) - a.ess))[0];
  const slotName = sp => (sp.legend ? 'legend' : sp.rar === 4 ? 'epic' : sp.slot === 'A' ? 'rare' : 'work' + sp.slot);

  for (let d = 0; d < days; d++) {
    const dow = d % 7, play = !!P.week[dow], ev = WEEK_EVENTS[(w0 + Math.floor(d / 7)) % WEEK_EVENTS.length];
    const evo = { loot: ev.loot || 1, km: ev.km || 1, xp: ev.xp || 1, duel: ev.duel || 1, rifts: !!ev.rifts, el: ev.el || null, shiny: ev.shiny || 1 };
    const xpbrew = play && (st.items.xpbrew || 0) >= 1;
    if (xpbrew) spend('xpbrew', 1, 'выпит');
    today = { raw: 0, once: 0, got: 0, mul: evo.xp * (xpbrew ? Rules.XP_BREW.MUL : 1) };
    const s0 = JSON.parse(JSON.stringify(st.stats));

    // ---------- сезоны: Тропа (месяц), Алатырь и Лига (seasonDays) ----------
    if (d % C.monthDays === 0) st.pass = { pts: 0, gold: false, got: { free: 0, gold: 0 } };
    if (d > 0 && d % C.seasonDays === 0) {
      // итоги сезона Алатыря (SeasonRewards.list по вкладу) и сундук Лиги за высшую лигу (League.prize), срез рейтинга (League.reset)
      for (const x of SeasonRewards.list(1, Math.floor(st.seasonShards))) { if (x.k === 'medal') st.stats.alaSeasons++; else give({ [x.k]: x.n }, 'итоги сезона Алатыря'); }
      st.seasonShards = 0;
      const pr = League.prize(st.league.peak); if (pr) give(pr, 'сундук Лиги за сезон');
      st.league.pts = League.reset(st.league.pts); st.league.got = {}; st.league.peak = League.rank(st.league.pts);
    }

    // день без игры: копится опыт отдыха (XP_DAY.REST в день, не больше чем за REST_DAYS дней), серия дней обрывается
    if (!play) st.rest = Math.min(XP_DAY.REST * XP_DAY.REST_DAYS, st.rest + XP_DAY.REST);
    if (play) {
      // ---------- первый день: обучение (TUT_CHAPTERS) и Кампания: шаги 1–8 — в первый же день ----------
      if (d === 0) {
        TUT_CHAPTERS.forEach(ch => give(ch.reward, 'обучение', true));
        xpClose(); levelUp(d);
        // шаг 1: три духа до 7 уровня — стартовый и два пойманных (искры и эссенция их семейств)
        for (let i = 0; i < 3; i++) for (let l = 1; l < 7; l++) { spend('sparks', S.powerUpSparks(l), 'усиление духов'); st.essOther -= 1 + Math.floor(l / 10); }
        for (const step of CAMPAIGN[0].steps.slice(0, 8)) {
          const R = step.reward;
          give({ xp: Math.max(R.xp || 0, R.lvl ? Math.max(0, levelXP(R.lvl) - st.xp) : 0) }, 'Кампания', true);
          xpClose(); levelUp(d);
          give({ sparks: R.sparks, zlat: R.zlat, gate: R.gate }, 'Кампания');
          if (R.cocoon) giveCocoon(R.cocoon, 1, 'Кампания');
          if (R.pick) {
            const i = st.team.length, sid = ['volk', 'kikimora', 'liho'][i];
            st.team.push(spirit('ABC'[i], sid, Math.min(40, st.level), d, R.ess || 0, i === 0));
            if (i === 0) goal('rare', d);
          }
          if (step.id === 'c1s5') { st.stats.evolved++; goal('evolve1', d); } // эволюция на эссенции от Ордена (start.evoEss)
          if (step.id === 'c1s6') { spend('sparks', 5 * Rules.EXCHANGE.SPARKS, 'обменник'); give({ zlat: 5 * Rules.EXCHANGE.CAMP }, 'обменник (курс Кампании)'); }
          if (step.id === 'c1s7') { spend('zlat', Rules.SHOP.find(x => x.id === 'incense').price, 'ладан (шаг Кампании)'); give({ incense: 1 }, 'Лавка'); }
          if (step.id === 'c1s8') spend('gate', 1, 'Врата (шаг Кампании)');
        }
        st.camp = 8; st.stats.raids++; // Разлом кампании
        st.cocoons[2] -= 1; st.stats.hatched++; give({ sparks: 2 * 150, xp: 2 * 100 + 500 }, 'коконы'); st.essOther += 6; // кокон 2 км (шаг 2)
      }

      // ---------- вход дня: серия (Rules.STREAK + монеты, на 7-й день — кокон 10 км), Дальний пропуск ----------
      st.streak = st.lastPlay === d - 1 ? st.streak + 1 : 1; st.lastPlay = d;
      st.stats.streakBest = Math.max(st.stats.streakBest, st.streak);
      const si = (st.streak - 1) % Rules.STREAK.length, last = si === Rules.STREAK.length - 1;
      give({ ...Rules.STREAK[si], zlat: last ? Rules.ZLAT.streak7 : Rules.ZLAT.streak }, 'серия дней');
      if (last) giveCocoon(10, 1, 'серия дней');
      if ((st.items.farpass || 0) < Rules.FAR.KEEP) give({ farpass: 1 }, 'вход дня');
      const L = st.level;

      // ---------- поимки ----------
      const cm = catchAt(L), catches = Math.min(P.catches, Rules.DAILY.catches), enc = catches / cm.pCatch;
      const needT = enc * (cm.perEnc.charm + cm.perEnc.charm2 + cm.perEnc.charm3), have = () => (st.items.charm || 0) + (st.items.charm2 || 0) + (st.items.charm3 || 0);
      if (have() < needT) { // обереги кончаются — связка оберегов в Лавке (Rules.SHOP charm20) за искры
        const it = Rules.SHOP.find(x => x.id === 'charm20'), packs = Math.min(Math.ceil((needT - have()) / it.give.charm), Math.floor(Math.max(0, st.sparks) / it.price));
        if (packs > 0) { spend('sparks', packs * it.price, 'обереги в Лавке'); give({ charm: packs * it.give.charm }, 'Лавка (за искры)'); }
      }
      const k = Math.min(1, have() / Math.max(1e-9, needT)), encD = enc * k, catchD = catches * k;
      let c1 = encD * cm.perEnc.charm, c2 = encD * cm.perEnc.charm2, c3 = encD * cm.perEnc.charm3;
      const m3 = Math.min(c3, st.items.charm3 || 0); c2 += c3 - m3; c3 = m3;
      const m2 = Math.min(c2, st.items.charm2 || 0); c1 += c2 - m2; c2 = m2;
      spend('charm', Math.min(c1, st.items.charm || 0), 'броски'); spend('charm2', c2, 'броски'); spend('charm3', c3, 'броски');
      spend('honey', Math.min(st.items.honey || 0, encD * cm.perEnc.honey), 'мёд при поимке');
      const before = dexAll(st, freq, cm.pR, SP);
      st.encW += encD;
      const newSp = dexAll(st, freq, cm.pR, SP) - before, shinyP = G.SHINY_RATE * evo.shiny;
      give({ xp: catchD * cm.perCatch.xp + newSp * 500 + catchD * shinyP * 500, sparks: catchD * cm.perCatch.sparks }, 'поимки');
      const essCatch = catchD * cm.perCatch.ess;
      st.stats.caught += catchD; st.stats.throwsGreat += encD * cm.perEnc.great; st.stats.shiny += catchD * shinyP;
      for (const [el, sh] of Object.entries(cm.el)) st.stats.byEl[el] = (st.stats.byEl[el] || 0) + catchD * sh;
      for (const r of [1, 2, 3]) st.campR[r] += catchD * (cm.rarShare[r] || 0);
      st.epicCum += catchD * (cm.rarShare[4] || 0);

      // ---------- источники ----------
      const springs = Math.min(P.springs, Rules.DAILY.springs), se = springEV(G, L, evo);
      for (const [it, v] of Object.entries(se.items)) give({ [it]: v * springs }, 'источники');
      give({ xp: se.xp * springs }, 'источники');
      if ((st.items.gift || 0) < G.GIFT_LIMIT) give({ gift: se.gift * springs }, 'источники');
      for (const [km, p] of Object.entries(se.cocoonKm)) giveCocoon(+km, springs * se.cocoon * p, 'источники');
      st.stats.springs += springs; st.campSpr += springs;

      // ---------- путь: коконы (греются по три, Ловчий выводит и кладёт новые прямо в пути), спутник ----------
      const km = Math.min(P.km, Rules.TRACK.DAY / 1000), kmC = km * evo.km;
      st.stats.km += km; st.campKm += km;
      let essHatch = 0;
      for (let slot = 0; slot < 3; slot++) {
        let left = kmC;
        for (let guard = 0; guard < 40 && left > 1e-9; guard++) {
          if (!st.inc[slot]) {
            const c = [2, 5, 10].find(x => st.cocoons[x] >= 1); if (!c) break;
            st.cocoons[c] -= 1; st.inc[slot] = { km: c, walked: 0 };
          }
          const cc = st.inc[slot], step = Math.min(left, cc.km - cc.walked);
          cc.walked += step; left -= step;
          if (cc.walked >= cc.km - 1e-9) {
            st.inc[slot] = null; st.stats.hatched++;
            give({ sparks: cc.km * 150, xp: cc.km * 100 + 250 }, 'коконы'); // + 500 за новый вид — примерно в каждом втором
            essHatch += cc.km * 3; flow('cocoon', 'выведено', -1);
            const pool = G.COCOON_TIERS[cc.km].pool, tot = Object.values(pool).reduce((a, b) => a + b, 0);
            if (pool[4]) st.epicCum += pool[4] / tot;
          }
        }
      }
      st.inc = st.inc.filter(Boolean);
      const bud = buddyOf();
      if (bud) { // 3 эссенции на каждые S.buddyDist км (Лада — вдвое чаще); каждая третья находка — предмет
        const lada = st.amuletPick > 0 || st.amuletsRand >= 3;
        const dist = (bud.legend || bud.stage === 3 ? 5 : bud.stage === 2 || bud.rar >= 3 ? 3 : 1) / (lada ? 2 : 1), finds = kmC / dist;
        bud.ess += finds * 3; flow('ess', 'спутник', finds * 3);
        give({ charm: finds / 3 * 5 / 8 * 3, honey: finds / 3 * 2 / 8, water: finds / 3 / 8 }, 'спутник');
      }

      // ---------- бои: разломы, Капища, вторжения ----------
      let battles = 0, shards = 0, essBattle = 0, bigRaids = 0;
      if (L >= G.RAID_LEVEL) {
        const raids = { ...P.raids };
        if (evo.rifts) { const x = Math.min(raids[1], raids[3]); raids[3] += x; raids[1] -= x; } // Неделя разломов: великих втрое больше
        let tot = raids[1] + raids[2] + raids[3];
        if (tot > Rules.DAILY.raids) { const f = Rules.DAILY.raids / tot; for (const t of [1, 2, 3]) raids[t] *= f; tot = Rules.DAILY.raids; }
        for (const t of [1, 2, 3]) {
          const n = raids[t]; if (!n) continue;
          give({ xp: 1000 * t * n, sparks: 350 * t * n, charm: 5 * n, honey: t * n, herb: t === 1 ? n : 0, water: t >= 2 ? n : 0, charm2: t >= 2 ? 3 * n : 0 }, 'разломы');
          give({ amulet: [0.05, 0.12, 0.3][t - 1] * n }, 'разломы');
          if (t >= 2) bigRaids += n;
          if (G.__riftFamily) essBattle += S.RIFT_ESS[t] * n; else give({ rod: S.RIFT_ESS[t] * n }, 'разломы');
          shards += ((S.ALATYR_DROP.rift || {})[t] || 0) * n;
          // поимка босса — особая встреча: опыт 300, ✦ 300, эссенция 10 + 2 × (редкость − 1) семейству босса
          const pc = (evo.rifts ? raidPev : raidP)[t].p;
          give({ xp: n * pc * 300, sparks: n * pc * 300 }, 'поимка босса');
          spend('honey', Math.min(st.items.honey || 0, n * raidP[t].honey), 'мёд при поимке');
          if (t === 1) essBattle += n * pc * 12;
          else if (t === 2) { essBattle += n * pc * (10 + 2 * (tb.rar - 1)); st.epicCum += n * pc * tb.epic; }
          else { if (!st.legendCatch && n * pc > 0) st.legendFirst = d; st.legendCatch += n * pc; }
        }
        st.stats.raids += tot; battles += tot;
        if (L >= G.DUEL_LEVEL) {
          const duels = { ...P.duels };
          let dt = duels[1] + duels[2] + duels[3];
          if (dt > Rules.DAILY.duels) { const f = Rules.DAILY.duels / dt; for (const t of [1, 2, 3]) duels[t] *= f; dt = Rules.DAILY.duels; }
          for (const t of [1, 2, 3]) {
            const n = duels[t], T = G.SHRINE_TIERS[t], mul = evo.duel; if (!n) continue;
            give({ xp: T.xp * mul * n, sparks: T.sparks * mul * n, charm: 5 * mul * n, honey: (t - 1) * mul * n, herb: t < 3 ? n : 0, water: t === 3 ? n : 0, charm2: t >= 2 ? 3 * mul * n : 0, charm3: t === 3 ? 2 * mul * n : 0 }, 'Капища');
            give({ amulet: 0.04 * t * n }, 'Капища');
            shards += ((S.ALATYR_DROP.duel || {})[t] || 0) * n;
          }
          st.stats.duels += dt; battles += dt;
        }
        shards = Math.min(S.ALATYR_DAY, shards);
        give({ alatyr: shards }, 'разломы и Капища'); st.seasonShards += shards;
      }
      if (L >= G.INVASION_LEVEL && P.invasions) {
        const n = Math.min(P.invasions, Rules.DAILY.invasions);
        give({ xp: 1000 * n, sparks: 400 * n, charm: 6 * n, honey: n, herb: n }, 'вторжения'); give({ amulet: 0.04 * n }, 'вторжения');
        give({ xp: 300 * n, sparks: 300 * n }, 'поимка омрачённого'); essBattle += n * 12;
        st.stats.invasions += n; battles += n;
      }
      let heal = battles * P.heal; // лечение после боя: подорожник → отвар → Живая вода
      for (const it of ['herb', 'brew', 'water']) { const u = Math.min(heal, st.items[it] || 0); spend(it, u, 'лечение'); heal -= u; }
      // Живая вода прямо в бою (разломы 2–3-й ступени, до 3 за бой — GameCore.H.water) и Мёртвая вода — поднять духа без сил
      spend('water', Math.min(st.items.water || 0, bigRaids * P.raidWater), 'в бою (разлом)');
      spend('deadwater', Math.min(st.items.deadwater || 0, P.dead), 'поднять духа без сил');

      // ---------- Лига (рейтинг — League.delta с равным соперником; награды за лиги — раз в сезон) ----------
      if (L >= League.LEVEL && P.league) {
        const n = Math.min(P.league, League.TICKETS), p = P.leagueP;
        give({ xp: Math.min(n, League.XP_RUNS) * (p * League.XP.win + (1 - p) * League.XP.loss) }, 'Лига');
        for (let i = 0; i < n; i++) {
          const up = League.delta(st.league.pts, st.league.pts, 1).d, dn = League.delta(st.league.pts, st.league.pts, 0).d;
          st.league.pts = Math.max(0, st.league.pts + p * up + (1 - p) * dn);
          const r = League.rank(st.league.pts);
          for (let j = 1; j <= r; j++) if (!st.league.got[j]) {
            st.league.got[j] = true; give(LEAGUE_RANKS[j].reward, 'ранги Лиги');
            if (j % 3 === 0) give({ amulet: 1 }, 'ранги Лиги');
            goal('league' + j, d);
          }
          st.league.peak = Math.max(st.league.peak, r);
        }
      }

      // ---------- задания дня, сундук, поручения ----------
      const qe = questEV(G, L), mulRw = (rw, m) => Object.fromEntries(Object.entries(rw).map(([k2, v]) => [k2, v * m]));
      give({ ...mulRw(qe, P.quests), xp: Rules.QUEST_XP * P.quests }, 'задания дня');
      { // 5.1.24: награда сундука случайная — средняя по Rules.CHEST (chestEV); кокон — вероятностью
        const { cocoon: ccP = 0, ...ce } = chestEV(Rules);
        give(mulRw(ce, P.chest), 'сундук дня');
        if (ccP) giveCocoon(5, ccP * P.chest, 'сундук дня');
      }
      const te = taskEV(G, L);
      give(mulRw(te.rw, P.tasks), 'поручения');
      give({ xp: P.tasks * 300, sparks: P.tasks * 300 }, 'поручения: дух встречи'); // дух встречи без побега — ловится наверняка
      let essTask = 0;
      for (const [r, w] of Object.entries(te.rar)) { essTask += P.tasks * w * (10 + 2 * (r - 1)); if (+r === 4) st.epicCum += P.tasks * w; }
      st.tier3Tasks += P.tasks * (te.pTier[3] || 0);

      // ---------- друзья: подарки туда и обратно, поединки, ступени дружбы ----------
      if (P.friends) {
        const f = P.friends, per = 2 + P.spar / f, lv = friendLv(G, (d + 1) * per), send = Math.min(f, st.items.gift || 0);
        spend('gift', send, 'подарки друзьям');
        give({ charm: f * 4.5, honey: f * 0.6 * 1.5, water: f * 0.4, charm2: lv >= 2 ? f * 0.5 * 2 : 0, charm3: lv >= 3 ? f * 0.3 : 0, xp: f * (100 + 50 * lv) }, 'подарки друзей');
        giveCocoon(5, f * (0.12 + 0.03 * lv), 'подарки друзей');
        const spar = Math.min(P.spar, 3);
        give({ xp: spar * 800, sparks: spar * 300, charm: spar * 3, honey: spar }, 'поединки с друзьями');
        let fx = 0; G.FRIEND_LEVELS.forEach(x => { if (x.xp && d * per < x.pts && (d + 1) * per >= x.pts) fx += x.xp; });
        give({ xp: fx * f }, 'ступени дружбы');
      }

      // ---------- Капища клана: дань (Rules.tributeFor, монеты — Rules.ZLAT.tribute) и плата за службу (Rules.guardPay) ----------
      if (L >= G.CLAN_LEVEL && P.holds) {
        const h = Math.min(P.holds, G.HOLD_MY_MAX), T = Rules.tributeFor(h, h / 7);
        give({ sparks: T.sparks, charm: T.charm, zlat: Rules.ZLAT.tribute * Math.min(h, Rules.ZLAT.tributeMax) }, 'дань Капищ');
        give({ sparks: h * Rules.guardPay(24) }, 'служба защитников');
      }

      // ---------- эссенция семейств (эволюции и переплавка — после усиления «рабочих» духов, ниже) ----------
      st.essDay = essCatch + essHatch + essBattle + essTask;
      st.essOther += st.essDay; flow('ess', 'поимки, коконы, бои, поручения', st.essDay);

      // ---------- Кампания, шаг 9 ----------
      if (st.camp === 8) {
        const s9 = CAMPAIGN[0].steps[8], ok = s9.obj.every(o => (o.t === 'walk' ? st.campKm >= o.n : o.t === 'spring' ? st.campSpr >= o.n : o.t === 'catchRar' ? st.campR[o.r] >= o.n : true));
        if (ok) { st.camp = 9; give({ sparks: s9.reward.sparks, zlat: s9.reward.zlat }, 'Кампания'); give({ xp: s9.reward.xp }, 'Кампания', true); goal('campaign', d); }
      }
    }

    // ---------- общее дело Ордена и Тропа (очки — Rules.orderPoints по счётчикам дня) ----------
    const pts = Rules.orderPoints(s0, st.stats, ev);
    st.stats.orderPts += pts; st.weekPts += pts;
    if (dow === 6) { // неделя кончилась: награды ступеней (Rules.ORDER), если свой вклад не меньше need
      if (C.orderAll) Rules.ORDER.STEPS.forEach((s, i) => { if (st.weekPts >= s.need) { give(s.reward, 'общее дело Ордена'); if (i === Rules.ORDER.STEPS.length - 1) giveCocoon(10, 1, 'общее дело Ордена'); } });
      st.weekPts = 0;
    }
    st.pass.pts += pts;
    const pl = Rules.passLevel(st.pass.pts);
    if (gold === 'earned' && !st.pass.gold && st.zlat >= Rules.PASS.GOLD) { spend('zlat', Rules.PASS.GOLD, 'Золотая тропа'); st.pass.gold = true; st.goldMonths++; goal('goldBought', d); }
    while (st.pass.got.free < pl) { st.pass.got.free++; passGive(G, st, 'free', st.pass.got.free, give, giveCocoon, cocoonCount); }
    while (st.pass.gold && st.pass.got.gold < pl) { st.pass.got.gold++; passGive(G, st, 'gold', st.pass.got.gold, give, giveCocoon, cocoonCount); }
    if (pl >= Rules.PASS.LEVELS) goal('pass30:' + Math.floor(d / C.monthDays), d % C.monthDays + 1);

    // ---------- новые духи команды: первый эпический (слот B) и первая легенда (слот C) ----------
    if (!st.team.find(x => x && x.rar === 4) && st.epicCum >= 1) { st.team[1] = spirit('B', 'domovoy', Math.min(st.level, 30), d, 9); goal('epic', d); }
    if (!st.team.find(x => x && x.legend) && st.legendCatch >= 1) { st.team[2] = spirit('C', 'zharptica', Math.min(Raid.TIER[3].lvl, st.level), d, 18); goal('legend', d); }

    // ---------- опыт дня, уровни; усиление, пробуждение, второй приём ----------
    xpClose(); levelUp(d);
    if (play) {
      for (let pass = 0; pass < 80; pass++) {
        let did = false;
        for (const sp of st.team) {
          if (!sp) continue;
          const ce = 1 + Math.floor(sp.lvl / 10), cs = S.powerUpSparks(sp.lvl);
          if (sp.lvl < maxLvl(sp) && st.sparks >= cs) {
            pour(sp, ce);
            if (essOf(sp) >= ce) { essTake(sp, ce); flow('ess', 'усиление духов', -ce); spend('sparks', cs, 'усиление духов'); sp.lvl++; did = true; }
          }
          const n = sp.stars;
          if (n < S.AWAKE.MAX && sp.lvl >= maxLvl(sp) && st.level >= S.AWAKE.LVL[n] && st.alatyr >= S.AWAKE.ALATYR[n] && st.sparks >= S.AWAKE.SPARKS[n]) {
            pour(sp, S.AWAKE.ESS[n]);
            if (essOf(sp) >= S.AWAKE.ESS[n]) {
              spend('alatyr', S.AWAKE.ALATYR[n], 'пробуждение'); essTake(sp, S.AWAKE.ESS[n]); flow('ess', 'пробуждение', -S.AWAKE.ESS[n]);
              spend('sparks', S.AWAKE.SPARKS[n], 'пробуждение'); sp.stars++; did = true; goal('awaken1', d);
            }
          }
          if (!sp.move2 && sp.lvl >= 20 && st.sparks >= G.MOVE2_COST.sparks + C.reserve && essOf(sp) >= G.MOVE2_COST.essence + 20) {
            sp.move2 = true; essTake(sp, G.MOVE2_COST.essence); flow('ess', 'второй приём', -G.MOVE2_COST.essence); spend('sparks', G.MOVE2_COST.sparks, 'второй приём');
          }
          if (sp.lvl >= 40) goal(slotName(sp) + '40', d);
          if (sp.lvl >= 50 && sp.stars >= 5) goal(slotName(sp) + 'Max', d);
        }
        if (!did) break;
      }

      // ---------- остаток эссенции дня: эволюции (в среднем ~60 эссенции: 25 — во вторую стадию, 100 — в третью)
      // и переплавка в эссенцию Рода (S.ESS.MELT → 1); что не ушло — копится по семействам ----------
      const essFree = Math.max(0, Math.min(st.essOther, st.essDay || 0));
      const evoN = essFree * P.evolve / 60;
      if (evoN > 0) { st.essOther -= evoN * 60; flow('ess', 'эволюции', -evoN * 60); st.stats.evolved += evoN; give({ xp: evoN * (st.stats.evolved < 60 ? 1000 : 200) }, 'эволюции'); }
      const melt = Math.max(0, Math.min(st.essOther, essFree * P.melt)) / S.ESS.MELT;
      if (melt > 0) { st.essOther -= melt * S.ESS.MELT; flow('ess', 'переплавка в Род', -melt * S.ESS.MELT); give({ rod: melt }, 'переплавка эссенции'); }
      st.essDay = 0;

      // ---------- предметы: ладан, Врата, Дальние пропуска, аукцион ----------
      spend('incense', Math.min(P.incense, st.items.incense || 0), 'зажжён');
      const g = Math.min(P.gates, st.items.gate || 0); spend('gate', g, 'телепорт');
      const gs = Rules.SHOP.find(x => x.id === 'gate');
      if (P.gates > g && st.sparks > C.reserve + gs.price) spend('sparks', Math.min(gs.day, P.gates - g) * gs.price, 'Врата в Лавке (телепорт)');
      spend('farpass', Math.min(P.farpass, st.items.farpass || 0), 'дальний бой');
      st.stats.traded += P.trades;

      // ---------- обменник: искры сверх запаса и нужного команде → монеты ----------
      let need = 0; for (const sp of st.team) if (sp) for (let l = sp.lvl; l < maxLvl(sp); l++) need += S.powerUpSparks(l);
      const exN = Math.min(P.exchange, Rules.EXCHANGE.DAY, Math.floor(Math.max(0, st.sparks - C.reserve - need) / Rules.EXCHANGE.SPARKS));
      if (exN > 0) { spend('sparks', exN * Rules.EXCHANGE.SPARKS, 'обменник'); give({ zlat: exN * Rules.EXCHANGE.ZLAT }, 'обменник'); }
    }

    // ---------- знаки Ордена: опыт за ступени — разовый, без потолка (но с множителем события) ----------
    const cmNow = catchAt(st.level), probs = dexProbs(st, freq, cmNow.pR, SP);
    const pHave = s => (s.legend ? 1 - Math.exp(-st.legendCatch / 7 / 5) : s.season ? Math.max(probs[s.id] || 0, 1 - Math.exp(-st.tier3Tasks * 0.3 / 4)) : (probs[s.id] || 0));
    const coll = (list, k) => atLeast(list.map(pHave), k) >= 0.5;
    for (const m of MEDALS) {
      let t = 0;
      for (let i = 0; i < 3; i++) {
        const need2 = m.tiers[i];
        const ok = m.stat === 'dex' ? coll(slavic, need2) : m.stat === 'myths' ? coll(G.SPECIES.filter(s => s.myth !== 'slavic' && !s.legend), need2)
          : m.stat === 'lands' ? coll(slavic.filter(s => s.land), need2) : (m.stat.startsWith('el:') ? st.stats.byEl[m.stat.slice(3)] || 0 : st.stats[m.stat] || 0) >= need2;
        if (ok) t = i + 1; else break;
      }
      const had = st.medals[m.id] || 0;
      for (let i = had; i < t; i++) give({ xp: MEDAL_TIERS[i].xp }, 'знаки Ордена', true);
      if (t > had) st.medals[m.id] = t;
      if (t >= 1) goal('bronze:' + m.id, d);
      if (t >= 3) goal('gold:' + m.id, d);
    }
    if (MEDALS.every(m => (st.medals[m.id] || 0) >= 1)) goal('medalsBronze', d);
    if (MEDALS.every(m => (st.medals[m.id] || 0) >= 3)) goal('medalsGold', d);
    xpClose(); levelUp(d);

    // ---------- сумка + посылка Ордена (BAG_LIMIT + PARCEL.MAX): лишнее выбрасывается, дешёвое первым ----------
    let over = ITEM_KEYS.reduce((a, it) => a + Math.max(0, st.items[it] || 0), 0) - (G.BAG_LIMIT + Rules.PARCEL.MAX);
    if (over > 0) st.overflowDays++;
    for (const [it, keep] of C.waste) {
      if (over <= 0) break;
      const x = Math.min(over, Math.max(0, (st.items[it] || 0) - keep));
      if (x > 0) { st.items[it] -= x; st.waste[it] = (st.waste[it] || 0) + x; flow(it, 'выброшено (сумка полна)', -x); over -= x; }
    }
    if (st.zlat >= Rules.PASS.GOLD) goal('zlat600', d);
    if ((opts.snap || []).includes(d + 1)) snaps[d + 1] = { flow: JSON.parse(JSON.stringify(st.flow)), waste: { ...st.waste }, xpCut: st.xpCut };
    daily.push({ d, play, level: st.level, xp: st.xp, xpDay: today.got, sparks: st.sparks, zlat: st.zlat, rod: st.rod, alatyr: st.alatyr, essOther: st.essOther,
      items: { ...st.items }, team: st.team.map(x => x && `${x.sid}:${Math.floor(x.lvl)}★${x.stars}`), league: st.league.pts, pts, passLvl: pl });
  }
  return { goals, daily, st, raidP, catchAt, freq, snaps };
}

function passGive(G, st, track, lvl, give, giveCocoon, cocoonCount) {
  const { amuletPick, cocoon, amulet, ...rw } = G.Rules.passReward(track, lvl, st.level);
  const src = track === 'gold' ? 'Золотая тропа' : 'Сезонная тропа';
  give(rw, src);
  if (amuletPick) give({ amuletPick }, src);
  if (amulet) give({ amulet }, src);
  if (cocoon) { if (cocoonCount() >= 9) give({ zlat: 10 }, src); else { giveCocoon(cocoon, 1, src); } }
}
// бестиарий: вероятность, что вид уже пойман, после st.encW встреч (Пуассон: 1 − e^(−q·n))
function dexProbs(st, freq, pR, SP) {
  const o = {};
  for (const [sid, f] of Object.entries(freq)) o[sid] = 1 - Math.exp(-f * (pR[SP[sid].rar] || 0) * st.encW);
  return o;
}
function dexAll(st, freq, pR, SP) { let a = 0; for (const [sid, f] of Object.entries(freq)) a += 1 - Math.exp(-f * (pR[SP[sid].rar] || 0) * st.encW); return a; }
function friendLv(G, pts) { let r = 0; G.FRIEND_LEVELS.forEach((x, i) => { if (pts >= x.pts) r = i; }); return r; }
