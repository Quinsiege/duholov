'use strict';
/* Прогон Ловчего с 1 по 40 уровень через настоящий сервер игры (server/game/core.js) с базой в памяти.
   Игрок — «активный»: каждый день ~5 км пешком в три выхода (утро, обед, вечер), ловит всех духов в радиусе,
   заходит во все родники по пути, 2 разлома, 2 Капища, до 2 вторжений, 3 боя Лиги в день (с живым соперником своего уровня); вечером — усиление,
   превращения, коконы, поручения, задания, Летопись. Исход боёв — своя модель: игрок выжимает EFF от максимального
   урона (сервер проверяет только верхнюю границу), раны — по ударам соперника. */

const CFG = {
  EFF: 0.6,             // доля от максимального урона, которую выжимает живой игрок
  DODGE: 0.6,           // доля ударов босса разлома, от которых увернулся
  HIT: 0.88,            // попадание оберегом
  RING: [[0.8, 0.5], [0.55, 0.35], [0.3, 0.15]], // кольцо: «хорошо» / «отлично» / «превосходно»
  SESSIONS: [[8, 1.5], [13, 1.0], [19, 2.5]],     // час выхода и километры
  STEP: 30,             // шаг, м
  SPEED: 1.4,           // м/с
  SPRING_EVERY: 250, SHRINE_EVERY: 700,
  RAIDS: 2, DUELS: 2, INVASIONS: 2, LEAGUE: 3,
  SPARK_RESERVE: 3000,  // искр оставить на обереги
  KEEP_PER_SPECIES: 2,
  MAX_DAYS: 400,
};

// ?p=casual — «обычный» игрок: один выход в день на 2 км, по одному бою каждого вида и один бой Лиги
if (/[?&]p=casual/.test(location.search)) Object.assign(CFG, { SESSIONS: [[18, 2.0]], RAIDS: 1, DUELS: 1, INVASIONS: 1, LEAGUE: 1 });

const P = { uid: 'sim', lat: 55.7558, lng: 37.6173, data: null, srv: {} };
const $log = document.getElementById('log');
const out = [];
const log = s => { out.push(s); $log.textContent = out.slice(-60).join('\n'); };
const adv = sec => { SIM_T += Math.round(sec * 1000); ST.play += sec; };
const me = fn => asPlayer(P, fn);
const fails = {};
async function act(type, args = {}) {
  const r = await call(P, type, args);
  if (!r.ok) { const k = `${type}: ${r.error}`; fails[k] = (fails[k] || 0) + 1; return null; }
  return r.results[0];
}
const pick = dist => { let x = Math.random(); for (const [v, w] of dist) { if ((x -= w) < 0) return v; } return dist[dist.length - 1][0]; };

// ---------- статистика ----------
const ST = {
  day: 0, play: 0, xpDay: 0, catches: 0, catchTry: 0, fled: 0, shiny: 0, springs: 0, km: 0,
  raids: [0, 0], duels: [0, 0], inv: [0, 0], league: [0, 0], tourn: 0, hatch: 0, evolve: 0, power: 0, released: 0,
  ko: 0, deadUsed: 0, heals: 0, tasks: 0, quests: 0, story: 0, levelDay: {}, xpBy: {}, days: [],
};
const xpAdd = (src, before) => { const d = P.data.xp - before; if (d > 0) ST.xpBy[src] = (ST.xpBy[src] || 0) + d; };

// ---------- карта: места по пути регистрируются в базе, как настоящие ----------
let poiN = 100000;
function poi(kind) {
  const id = 'osm:n' + (++poiN), p = { id, lat: P.lat + (Math.random() - 0.5) * 0.0004, lng: P.lng + (Math.random() - 0.5) * 0.0006, name: kind === 'spring' ? 'Родник' : 'Капище', kind, active: true, imported: true };
  DB.pois[id] = p;
  return { id, lat: p.lat, lng: p.lng, name: p.name };
}
let heading = Math.random() * Math.PI * 2;
function step() {
  heading += (Math.random() - 0.5) * 0.9;
  // держимся в городе: тянет обратно к центру
  const dLat = 55.7558 - P.lat, dLng = 37.6173 - P.lng;
  if (Math.hypot(dLat, dLng * 0.56) > 0.03) heading = Math.atan2(dLat, dLng * 0.56);
  P.lat += Math.sin(heading) * CFG.STEP / 111320;
  P.lng += Math.cos(heading) * CFG.STEP / (111320 * 0.564);
  adv(CFG.STEP / CFG.SPEED);
}

// ---------- команда, здоровье, лечение ----------
const team = () => me(() => S.team());
const alive = sp => me(() => S.alive(sp));
async function pickTeam() {
  const best = me(() => [...S.d.spirits].filter(sp => S.alive(sp) && S.hpNow(sp) >= 0.45).sort((a, b) => S.power(b) - S.power(a)).slice(0, 3).map(x => x.uid));
  const cur = me(() => S.d.team || []);
  if (best.join() !== (cur || []).join()) await act('team', { uids: best });
}
async function heal() {
  // своих бойцов: без сил — Мёртвая вода, если ждать больше 4 ч; раненых — подорожник/отвар/Живая вода
  const top = me(() => [...S.d.spirits].sort((a, b) => S.power(b) - S.power(a)).slice(0, 5));
  for (const sp of top) {
    const h = me(() => S.hpNow(sp)), items = P.data.items;
    if (h <= 0) {
      if ((items.deadwater || 0) > 0 && me(() => S.koLeft(sp)) > 4 * 3600000) { if (await act('heal', { uid: sp.uid, k: 'deadwater' })) ST.deadUsed++; }
      continue;
    }
    if (h < 0.7) {
      const k = h < 0.35 && items.brew > 0 ? 'brew' : items.water > 0 && h < 0.45 ? 'water' : items.herb > 0 ? 'herb' : items.brew > 0 ? 'brew' : items.water > 0 ? 'water' : null;
      if (k && await act('heal', { uid: sp.uid, k })) ST.heals++;
    }
  }
}

// ---------- поимка ----------
function throwItem(sid) {
  const it = P.data.items, rar = SP[sid].rar;
  if (rar >= 4 && it.charm3 > 0) return 'charm3';
  if (rar >= 3 && it.charm2 > 0) return 'charm2';
  if (it.charm > 0) return 'charm';
  if (it.charm2 > 0) return 'charm2';
  if (it.charm3 > 0) return 'charm3';
  return null;
}
async function encounter(start, sid) {
  const r = await act('encStart', start);
  if (!r) return false;
  ST.catchTry++;
  if (SP[sid].rar >= 3 && P.data.items.honey > 0) await act('encHoney');
  for (let k = 0; k < 15; k++) {
    const item = start.kind === 'raid' ? 'charm' : throwItem(sid);
    if (!item) { await act('encEnd'); return false; }
    adv(4);
    const xp0 = P.data.xp;
    const t = await act('encThrow', { item, hit: Math.random() < CFG.HIT, ring: pick(CFG.RING) });
    if (!t) { await act('encEnd'); return false; }
    if (t.caught) { xpAdd('поимка', xp0); ST.catches++; if (me(() => S.findSpirit(t.uid)).shiny) ST.shiny++; return true; }
    if (t.over) { if (t.fled) ST.fled++; return false; }
  }
  await act('encEnd');
  return false;
}
const KEEP_ITEMS = { honey: 30, water: 30, herb: 40, brew: 20, incense: 6, charm2: 120, charm3: 120, charm: 200, gift: 10 };
async function tidyBag() {
  const n = me(() => S.bagCount()), lim = me(() => S.bagLimit());
  if (n < lim - 40) return;
  for (const [k, keep] of Object.entries(KEEP_ITEMS)) {
    const have = P.data.items[k] || 0;
    if (have > keep && await act('discard', { k, n: have - keep })) ST.discarded = (ST.discarded || 0) + have - keep;
  }
}
async function buyCharms() {
  const it = P.data.items, n = (it.charm || 0) + (it.charm2 || 0) + (it.charm3 || 0);
  if (n < 15 && P.data.sparks >= 1500 + 500) await act('shopBuy', { id: 'charm20' });
}

// ---------- бои: модель исхода ----------
const bat = sp => me(() => S.battle(sp));
function raidOutcome(tm, rift) {
  const b = { boss: rift.boss, tier: rift.tier }, T = Raid.TIER[rift.tier], bs = me(() => Raid.bossStats(b)), bel = SP[rift.boss].el;
  const dps = me(() => Rules.raidMaxDamage(tm, b, 1)) / 1.3 * CFG.EFF;
  // бойцы по очереди: каждый держится, пока его не выбьет босс
  let t = 0, dealt = 0; const hp = {};
  for (const sp of tm) {
    const x = bat(sp), max = x.hp * 5, cur0 = max * me(() => S.hpNow(sp));
    const hit = Raid.dmg(bs.atk, x.def, T.pw, bel, SP[sp.sid].el) * (CFG.DODGE * 0.2 + (1 - CFG.DODGE)); // средний удар с учётом уворотов
    const life = cur0 / (hit / 3.8); // секунд до падения
    const need = (T.hp - dealt) / dps, use = Math.min(life, need, 90 - t);
    t += use; dealt += dps * use;
    hp[sp.uid] = Math.max(0, (cur0 - hit / 3.8 * use) / max);
    if (dealt >= T.hp || t >= 90) break;
  }
  tm.forEach(sp => { if (!(sp.uid in hp)) hp[sp.uid] = me(() => S.hpNow(sp)); });
  return { win: dealt >= T.hp, t: Math.max(3, t), hp };
}
function duelOutcome(tm, foe, speed) {
  const myDps = me(() => Rules.duelMaxDamage(tm, foe, 1)) / 1.3 * CFG.EFF;
  const foeHp = me(() => Rules.duelFoeHp(foe));
  const fs = foe.map(f => ({ x: bat(f), el: SP[f.sid].el }));
  let t = 0, dealt = 0; const hp = {};
  for (const sp of tm) {
    const x = bat(sp), max = x.hp * Duel.HPX, cur0 = max * me(() => S.hpNow(sp)), el = SP[sp.sid].el;
    const hit = fs.reduce((a, f) => a + Raid.dmg(f.x.atk, x.def, Duel.FAST, f.el, el), 0) / fs.length * 1.35; // быстрые удары + приёмы
    const fdps = hit / (speed + 0.125);
    const life = cur0 / fdps, need = (foeHp - dealt) / myDps, use = Math.min(life, need, Duel.TIME - t);
    t += use; dealt += myDps * use;
    hp[sp.uid] = Math.max(0, (cur0 - fdps * use) / max);
    if (dealt >= foeHp || t >= Duel.TIME) break;
  }
  tm.forEach(sp => { if (!(sp.uid in hp)) hp[sp.uid] = me(() => S.hpNow(sp)); });
  let win = dealt >= foeHp;
  if (!win && t >= Duel.TIME) { const mine = tm.reduce((a, sp) => a + hp[sp.uid], 0) / tm.length; win = mine > 1 - dealt / foeHp; }
  return { win, t: Math.max(6, t), hp };
}
const koCount = hp => Object.values(hp).filter(v => v <= 0).length;
const ready = () => { const tm = team(); return tm.length === 3 && tm.every(alive); };

async function raidAt(p) {
  const hour = Math.floor(SIM_T / 3600000), rift = me(() => W.riftFor(p, 0, hour));
  if (!rift || P.data.rifts[rift.id] || ST.today.raids >= CFG.RAIDS || me(() => Rules.dayUsed(S.d, 'raids')) >= 6) return;
  await heal(); await pickTeam();
  if (!ready()) return;
  const tm = team(), o = raidOutcome(tm, rift);
  if (!o.win && ST.today.raidTry >= 1) return; // не лезть в заведомо проигрышный второй раз за день
  const s = await act('raidStart', { rift: p });
  if (!s) return;
  ST.today.raidTry++;
  adv(o.t + Rules.COUNTDOWN);
  const xp0 = P.data.xp;
  const e = await act('raidEnd', { win: o.win, hp: o.hp });
  ST.ko += koCount(o.hp);
  if (e && e.win) { xpAdd('разлом', xp0); ST.raids[0]++; ST.today.raids++; await encounter({ kind: 'raid' }, rift.boss); }
  else ST.raids[1]++;
}
async function duelAt(p) {
  if (P.data.level < 3 || ST.today.duels >= CFG.DUELS) return;
  const e = me(() => W.shrineFor(p, 0));
  if (e.won || W.riftAt(p.id, Math.floor(SIM_T / 3600000))) return;
  await heal(); await pickTeam();
  if (!ready()) return;
  const g = me(() => W.guardian(e)), o = duelOutcome(team(), g.team, SHRINE_TIERS[e.tier].speed);
  if (!o.win) return; // слабая команда к Капищу не идёт — видно по силе хранителя
  if (!await act('duelStart', { shrine: p })) return;
  adv(o.t + Rules.COUNTDOWN);
  const xp0 = P.data.xp;
  const r = await act('duelEnd', { win: o.win, hp: o.hp });
  ST.ko += koCount(o.hp);
  if (r && r.win) {
    xpAdd('Капище', xp0); ST.duels[0]++; ST.today.duels++;
    if (P.data.clan) {
      const tm = new Set((P.data.team || [])), sp = me(() => [...S.d.spirits].filter(x => !tm.has(x.uid)).sort((a, b) => S.power(b) - S.power(a))[3]);
      if (sp && await act('shrineDefend', { shrine: p, uid: sp.uid })) ST.defend = (ST.defend || 0) + 1;
    }
  } else ST.duels[1]++;
}
async function invasionAt(p) {
  if (ST.today.inv >= CFG.INVASIONS) return false;
  await heal(); await pickTeam();
  if (!ready()) return false;
  const e = me(() => W.springFor(p, 0)), g = me(() => W.grunt(e)), o = duelOutcome(team(), g.team, Duel.FOE.invasion.speed);
  if (!await act('invStart', { spring: p })) return false;
  adv(o.t + Rules.COUNTDOWN);
  const xp0 = P.data.xp;
  const r = await act('invEnd', { win: o.win, hp: o.hp });
  ST.ko += koCount(o.hp);
  if (r && r.win) {
    xpAdd('вторжение', xp0); ST.inv[0]++; ST.today.inv++;
    const n0 = P.data.spirits.length;
    await encounter({ kind: 'rescue' }, r.rescue.sid);
    const dark = P.data.spirits.length > n0 ? P.data.spirits.find(x => x.dark && !x.purified) : null;
    if (dark && me(() => !S.canPurify(dark)) && await act('purify', { uid: dark.uid })) ST.purified = (ST.purified || 0) + 1;
  }
  else ST.inv[1]++;
  return true;
}
// 4.16: Лига — бои с живыми Ловчими. В одиночном прогоне соперник — «зеркальный» Ловчий: его уровень и команда —
// как у игрока, рейтинг — рядом; оба — живые игроки через настоящий сервер (pvpFind → бой GameCore.pvp → pvpResult)
// и выжимают EFF от предела: тапают в среднем EFF × 2 раза в секунду, приём — с EFF × 12 тапов, щит — с вероятностью DODGE
const R = { uid: 'rival', lat: 55.7558, lng: 37.6173, data: null, srv: {} };
async function rivalSync() {
  if (!R.data) { await call(R, 'newGame', { name: 'Соперник', starter: 'kapelka' }); R.data.tut = 0; }
  const L = me(() => League.view());
  R.data.level = P.data.level;
  R.data.spirits = JSON.parse(JSON.stringify(team())).map(x => ({ ...x, uid: 'r' + x.uid })); // и раны — те же
  R.data.team = R.data.spirits.map(x => x.uid);
  R.data.league = { season: L.season, pts: Math.max(0, L.pts + Math.round((Math.random() - 0.5) * 120)), best: L.best, peak: L.peak, tickets: League.TICKETS, n: 0, day: L.day, got: {} };
  R.lat = P.lat; R.lng = P.lng;
}
async function pvpBattle(id) {
  const sides = [P, R];
  let now = SIM_T;
  const s0 = await GameCore.pvp('state', { id }, envFor(P), now);
  if (!s0.ok) return;
  now = s0.st.t0 + 300;
  for (let step = 0; step < 600; step++) {
    for (const X of step % 2 ? [R, P] : sides) {
      const s = await GameCore.pvp('state', { id }, envFor(X), now);
      if (!s.ok || s.st.over) break;
      const v = PvP.view(s.st, s.seat, now), p = v.pause, my = v.me, f = my.team[my.idx], ins = [];
      if (p && p.k === 'charge' && !p.done) {
        if (p.by === 'me') { if (now - p.t >= PvP.MINI) ins.push({ t: 'taps', n: Math.round(12 * CFG.EFF) }); }
        else ins.push({ t: 'shield', on: my.sh > 0 && Math.random() < CFG.DODGE });
      } else if (p && p.k === 'switch' && p.who.includes('me')) {
        let best = -1; my.team.forEach((x, i) => { if (x.cur > 0 && (best < 0 || x.cur > my.team[best].cur)) best = i; });
        if (best >= 0) ins.push({ t: 'switch', i: best });
      } else if (!p && f) {
        const n = (Math.random() < CFG.EFF ? 1 : 0) + (Math.random() < CFG.EFF ? 1 : 0);
        if (n) ins.push({ t: 'hit', n });
        if (f.en + 7 * n * (s.st.s[s.seat].team[my.idx].emul || 1) >= MOVES.charge.cost && Math.random() < 0.85) ins.push({ t: 'charge', kind: 'charge' });
      }
      await GameCore.pvp(ins.length ? 'move' : 'state', { id, in: ins }, envFor(X), now);
    }
    const st = DB.pvpM[id].state;
    if (st.over) break;
    now = st.pause ? Math.max(now + 100, st.pause.t + (st.pause.k === 'charge' ? PvP.MINI + 100 : 1500)) : now + 1000;
  }
  adv(Math.max(0, now - SIM_T) / 1000);
}
async function league() {
  if (P.data.level < League.LEVEL) return;
  for (let n = 0; n < CFG.LEAGUE; n++) {
    await heal(); await pickTeam();
    if (!ready()) return;
    await rivalSync();
    // соперник один и тот же — сразу снова в пару не ставят; «ждём» 30 с, как в жизни при малом числе Ловчих
    R.srv.lq = { since: SIM_T - 31000, t: SIM_T }; P.srv.lq = { since: SIM_T - 31000, t: SIM_T };
    await call(R, 'pvpFind', {});
    const f = await act('pvpFind', {});
    if (!f || !f.match) return;
    ST.tourn++;
    await pvpBattle(f.match);
    const xp0 = P.data.xp, r = await act('pvpResult', {});
    xpAdd('Лига', xp0);
    for (const x of (r && r.done) || []) x.win ? ST.league[0]++ : ST.league[1]++;
    await call(R, 'pvpResult', {});
  }
}

// ---------- прогулка ----------
async function walk(km) {
  const steps = Math.round(km * 1000 / CFG.STEP);
  let pts = [], sinceSpring = 0, sinceShrine = 0;
  for (let i = 0; i < steps; i++) {
    step();
    pts.push([+P.lat.toFixed(6), +P.lng.toFixed(6), SIM_T, 10]);
    if (pts.length >= 5) { const xp0 = P.data.xp; await act('move', { pts }); xpAdd('коконы/прочее', xp0); pts = []; }
    ST.km += CFG.STEP / 1000;
    // духи в радиусе
    if (me(() => Rules.dayUsed(S.d, 'catches')) < 120) {
      const near = me(() => W.spawnsAround(P.lat, P.lng, W.INTERACT - 5).filter(s => s.type === 'spirit' && !s.tut && !S.d.caught[s.id]));
      for (const s of near) { await buyCharms(); await encounter({ kind: 'wild', id: s.id }, s.sid); }
    }
    sinceSpring += CFG.STEP; sinceShrine += CFG.STEP;
    if (sinceSpring >= CFG.SPRING_EVERY) {
      sinceSpring = 0;
      const p = poi('spring'), e = me(() => W.springFor(p, 0));
      await tidyBag();
      if (e.invaded) { if (P.data.level >= 3) await invasionAt(p); }
      else if (me(() => Rules.dayUsed(S.d, 'springs')) < 30) { const xp0 = P.data.xp; if (await act('spring', { poi: p })) { ST.springs++; xpAdd('родник', xp0); } }
    }
    if (sinceShrine >= CFG.SHRINE_EVERY) {
      sinceShrine = 0;
      const p = poi('shrine');
      if (me(() => W.riftAt(p.id, Math.floor(SIM_T / 3600000)))) await raidAt(p); else await duelAt(p);
    }
  }
  if (pts.length) await act('move', { pts });
}

// ---------- вечерние дела ----------
async function chores() {
  let xp0 = P.data.xp;
  // коконы
  for (const c of [...P.data.cocoons]) if (c.inc && c.walked >= c.km) { if (await act('hatch', { id: c.id })) ST.hatch++; }
  xpAdd('коконы/прочее', xp0);
  // поручения и встречи за них
  xp0 = P.data.xp;
  for (const q of [...P.data.tasks]) if (q.p >= q.n) { if (await act('taskClaim', { id: q.id })) ST.tasks++; }
  for (const m of [...P.data.taskMeet]) await encounter({ kind: 'task', id: m.id }, m.sid);
  xpAdd('поручения', xp0);
  // задания дня и сундук
  xp0 = P.data.xp;
  const Q = P.data.quests;
  if (Q && Q.list) { for (let i = 0; i < Q.list.length; i++) { const q = Q.list[i]; if (q.p >= q.n && !q.claimed && await act('questClaim', { i })) ST.quests++; } if (Q.list.every(q => q.claimed) && !Q.bonus) await act('questBonus'); }
  xpAdd('задания дня', xp0);
  // Летопись
  xp0 = P.data.xp;
  while (me(() => S.storyReady && S.storyReady())) { if (!await act('storyClaim')) break; ST.story++; }
  if (P.data.storyGift) await encounter({ kind: 'story' }, P.data.storyGift);
  xpAdd('Летопись', xp0);
  // Сезонная тропа (бесплатная)
  if (P.data.pass) { const lv = Rules.passLevel(P.data.pass.pts); for (let l = 1; l <= lv; l++) if (!(P.data.pass.got.free || []).includes(l)) await act('passClaim', { lvl: l, track: 'free' }); }
  // превращения: лучший по IV в семье, если хватает эссенции
  xp0 = P.data.xp;
  for (let pass = 0; pass < 3; pass++) {
    const cand = me(() => S.d.spirits.filter(sp => SP[sp.sid].evo && !S.canEvolve(sp)).sort((a, b) => S.power(b) - S.power(a)));
    if (!cand.length) break;
    if (await act('evolve', { uid: cand[0].uid })) ST.evolve++;
  }
  xpAdd('превращения', xp0);
  // усиление: три сильнейших, пока есть искры сверх запаса
  // (духов берём заново после каждого действия: сервер возвращает новый прогресс)
  for (let n = 0; n < 300; n++) {
    const sp = me(() => [...S.d.spirits].sort((a, b) => S.power(b) - S.power(a)).slice(0, 6).find(x => !S.canPowerUp(x) && S.d.sparks - S.powerUpCost(x).sparks >= CFG.SPARK_RESERVE));
    if (!sp) break;
    if (!await act('powerUp', { uid: sp.uid })) break;
    ST.power++;
  }
  const top = me(() => [...S.d.spirits].sort((a, b) => S.power(b) - S.power(a)).slice(0, 3));
  // спутник — сильнейший
  if (!P.data.buddy && top[0]) await act('buddy', { uid: top[0].uid });
  // отпустить лишних: по видам оставить лучших
  if (P.data.spirits.length > 160) {
    const keep = new Set(me(() => { const by = {}; S.d.spirits.forEach(sp => (by[sp.sid] = by[sp.sid] || []).push(sp)); return Object.values(by).flatMap(a => a.sort((x, y) => S.power(y) - S.power(x) || S.ivPct(y) - S.ivPct(x)).slice(0, CFG.KEEP_PER_SPECIES)).concat(S.team(), S.d.spirits.filter(x => x.shiny || x.fav || SP[x.sid].legend)).map(x => x.uid); }));
    const rel = P.data.spirits.filter(sp => !keep.has(sp.uid) && !(P.data.buddy && P.data.buddy.uid === sp.uid)).map(sp => sp.uid).slice(0, 200);
    if (rel.length && await act('release', { uids: rel })) ST.released += rel.length;
  }
  await heal(); await pickTeam();
}

// ---------- обучение ----------
async function tutorial() {
  for (let n = 0; n < 60 && P.data.tut; n++) {
    const st = TUT[P.data.tut - 1];
    if (st.kind === 'talk' || st.kind === 'ui') await act('tutNext', { id: st.id });
    else if (st.kind === 'catch') await encounter({ kind: 'tut' }, st.sid);
    else if (st.kind === 'spring') { const p = poi('spring'); if (!await act('spring', { poi: p })) adv(60); }
    else if (st.kind === 'power') { const sp = P.data.spirits[0]; if (!await act('powerUp', { uid: sp.uid })) { log('обучение: не могу усилить'); break; } }
    else { log('обучение: неизвестный шаг ' + st.kind); break; }
  }
}

// ---------- день ----------
function snapshot() {
  const d = P.data;
  return me(() => {
    const byP = [...d.spirits].sort((a, b) => S.power(b) - S.power(a));
    const dex = Object.values(d.dex).filter(x => x.caught > 0).length;
    return { lvl: d.level, xp: d.xp, sparks: d.sparks, zlat: d.zlat, spirits: d.spirits.length, dex, top: byP.slice(0, 3).map(x => `${SP[x.sid].name} ${x.lvl}ур ${S.power(x)}`), topPow: byP[0] ? S.power(byP[0]) : 0,
      league: League.rank(League.view().pts), pts: League.view().pts, items: { ...d.items }, amulets: Object.values(d.amulets || {}).reduce((a, b) => a + b, 0), km: Math.round(d.stats.km || 0), story: d.story ? d.story.ch : 0 };
  });
}
async function day(n) {
  ST.day = n;
  ST.today = { raids: 0, raidTry: 0, duels: 0, inv: 0 };
  const start = SIM_T, xpStart = P.data.xp, lvlStart = P.data.level, c0 = ST.catches;
  await act('tick'); await act('daily');
  // других дружин тоже кто-то водит: часть наших защитников за ночь сбивают
  for (const k in DB.holds) if (Math.random() < 0.4) { DB.holds[k].holders = []; DB.holds[k].ver++; }
  if (!P.data.clan && P.data.level >= CLAN_LEVEL) await act('clanJoin', { clan: 'sokol' });
  if (P.data.clan) await act('tribute');
  await act('photo');
  for (const [h, km] of CFG.SESSIONS) {
    const dayStart = Math.floor((start + 3 * 3600000) / 86400000) * 86400000 - 3 * 3600000; // полночь по Москве
    SIM_T = Math.max(SIM_T, dayStart + h * 3600000);
    await heal(); await pickTeam();
    if (h === CFG.SESSIONS[CFG.SESSIONS.length - 1][0] && P.data.items.incense > 0 && me(() => !S.incenseActive())) await act('incense');
    await walk(km);
    if (h === CFG.SESSIONS[CFG.SESSIONS.length - 1][0]) await league(); // Лига — в последний выход дня
  }
  await chores();
  const s = snapshot();
  for (let l = lvlStart + 1; l <= s.lvl; l++) ST.levelDay[l] = n;
  ST.days.push({ n, lvl: s.lvl, xp: s.xp - xpStart, catches: ST.catches - c0 });
  if (n % 5 === 0 || s.lvl !== lvlStart) log(`день ${String(n).padStart(3)} · ур. ${s.lvl} (${U.fmtNum(s.xp)} оп., +${U.fmtNum(s.xp - xpStart)}) · поймано ${ST.catches - c0} · ✦${U.fmtNum(s.sparks)} · зл ${s.zlat} · духов ${s.spirits} · видов ${s.dex} · Лига ${LEAGUE_RANKS[s.league].name} ${s.pts} · сильнейший: ${s.top[0]}`);
  // на следующее утро
  SIM_T = Math.floor((SIM_T + 3 * 3600000) / 86400000) * 86400000 + 86400000 - 3 * 3600000 + 7 * 3600000;
}

(async () => {
  try {
    await newPlayer.call(null, 'sim', P.lat, P.lng, 'Ловчий', 'ugolek').then(x => Object.assign(P, { data: x.data, srv: x.srv }));
    await tutorial();
    log(`обучение пройдено: ур. ${P.data.level}, духов ${P.data.spirits.length}`);
    const t0 = performance.now();
    for (let n = 1; n <= CFG.MAX_DAYS && P.data.level < 40; n++) await day(n);
    const s = snapshot();
    window.SIM = { cfg: CFG, st: ST, snap: s, fails, secs: Math.round((performance.now() - t0) / 1000), data: P.data };
    log(`ГОТОВО за ${window.SIM.secs} с: ${ST.day} дней, уровень ${s.lvl}`);
  } catch (e) { log('ОШИБКА: ' + e.stack); window.SIM = { error: e.stack, st: ST, fails }; }
})();
