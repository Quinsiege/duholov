'use strict';
/* Рабочий поток мира: ведёт своих игроков день за днём через настоящий сервер игры (GameCore).
   Общие данные мира (аукцион, подарки, друзья, Капища дружин, таблица Лиги, платежи) — в главном потоке,
   сюда приходят ответами на запросы env (как база у настоящего сервера). */
const { parentPort, workerData } = require('worker_threads');
const G = require('./engine.cjs').load();
const { GameCore, S, W, U, SP, SPECIES, Rules, Raid, Duel, League, SHRINE_TIERS, TUT, STORY, CLAN_LEVEL, ITEMS } = G;

// ---------- связь с главным потоком ----------
let rpcN = 0; const pending = new Map();
const rpc = (fn, uid, args) => new Promise(res => { const id = ++rpcN; pending.set(id, res); parentPort.postMessage({ t: 'rpc', id, fn, uid, now: SIM_T, args }); });
const POIS = new Map(workerData.pois.map(p => [p.id, p]));
const GRID = new Map(); const GC = 0.002;
for (const p of workerData.pois) { const k = Math.floor(p.lat / GC) + ':' + Math.floor(p.lng / GC); if (!GRID.has(k)) GRID.set(k, []); GRID.get(k).push(p); }
function poisNear(lat, lng, r) {
  const out = [], i0 = Math.floor(lat / GC), j0 = Math.floor(lng / GC);
  for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) for (const p of GRID.get(i + ':' + j) || []) { const d = U.dist(lat, lng, p.lat, p.lng); if (d <= r) out.push({ p, d }); }
  return out.sort((a, b) => a.d - b.d);
}
const ENVFN = ['registerPid', 'player', 'friendSave', 'briefByPid', 'link', 'linksTo', 'giftsTo', 'invitesTo', 'giftCreate', 'gift', 'giftTake', 'leagueScore', 'orderPut', 'orderStats',
  'holdGet', 'holdDefend', 'holdDefeat', 'myHolds', 'myHoldsList', 'clanCounts', 'lotCreate', 'lotsFind', 'lotsMine', 'lotsOpenCount', 'lotGet', 'lotBuy', 'lotCancel', 'lotsToSettle', 'lotsDone',
  'paidList', 'payCredited', 'leagueTop', 'tradeCreate', 'tradeTake', 'tradeReclaim', 'roomCreate', 'roomGet', 'roomJoin', 'roomStart', 'roomLeave', 'chatList', 'chatInsert', 'chatReport', 'deleteSave',
  'pvpFind', 'pvpCancel', 'pvpLive', 'pvpLoad', 'pvpPut', 'pvpPending', 'pvpSettled']; // 4.16: Лига — очередь и бои в главном потоке (как в базе)
function envFor(P) {
  const e = { poi: async id => POIS.get(id) || null, poiCovered: async () => true, mySubmissions: async () => [], weather: null };
  for (const fn of ENVFN) e[fn] = (...args) => rpc(fn, P.uid, args);
  return e;
}

// ---------- игрок ----------
const PL = workerData.players.map(pr => ({ ...pr, data: null, srv: {}, lat: pr.home.lat, lng: pr.home.lng, st: newStats(), pendingFriends: [] }));
function newStats() {
  return { xpBy: {}, lvlT: {}, catches: 0, tries: 0, fled: 0, shiny: 0, springs: 0, km: 0, raids: [0, 0], far: 0, duels: [0, 0], freed: 0, inv: [0, 0], league: [0, 0], tourn: 0,
    hatch: 0, evolve: 0, power: 0, released: 0, ko: 0, deadUsed: 0, heals: 0, tasks: 0, quests: 0, purified: 0, defend: 0, discarded: 0, play: 0, days: 0,
    rub: 0, zlatIn: 0, zlatSpent: {}, aucSold: 0, aucBought: 0, aucSparksIn: 0, aucZlatIn: 0, aucSparksOut: 0, aucZlatOut: 0, giftsSent: 0, giftsOpened: 0, friends: 0, exch: 0, fails: {} };
}
let P = null, D = null; // текущий игрок и его статистика
const adv = sec => { globalThis.SIM_T += Math.round(sec * 1000); D.play += sec; };
const me = fn => { const d = S.d, tz = U.tz; S.d = P.data; U.tz = 180; try { return fn(); } finally { S.d = d; U.tz = tz; } };
async function act(type, args = {}) {
  if (type === 'encThrow' && P.srv.enc && P.srv.enc.lastThrow) P.srv.enc.lastThrow -= 5000;
  const res = await GameCore.run({ a: [{ type, args }], tz: 180, wx: null, pos: { lat: P.lat, lng: P.lng, acc: 10 }, v: '4.15.1' }, { data: P.data, srv: P.srv }, envFor(P));
  if (!res.ok) {
    if (res.rl) P.srv = { ...P.srv, rl: res.rl };
    const k = `${type}: ${res.error}`; D.fails[k] = (D.fails[k] || 0) + 1; return null;
  }
  const lvl0 = P.data ? P.data.level : 0;
  P.data = res.data; P.srv = res.srv;
  for (const fn of res.after) await fn();
  if (P.data.level > lvl0) for (let l = lvl0 + 1; l <= P.data.level; l++) D.lvlT[l] = SIM_T;
  return res.results[0];
}
const pick = dist => { let x = Math.random(); for (const [v, w] of dist) { if ((x -= w) < 0) return v; } return dist[dist.length - 1][0]; };
const xpAdd = (src, before) => { const d = P.data.xp - before; if (d > 0) D.xpBy[src] = (D.xpBy[src] || 0) + d; };
const spend = (what, n) => { D.zlatSpent[what] = (D.zlatSpent[what] || 0) + n; };

// ---------- ходьба ----------
function step(stepM) {
  P.heading += (Math.random() - 0.5) * 0.9;
  const dLat = P.home.lat - P.lat, dLng = P.home.lng - P.lng;
  if (Math.hypot(dLat, dLng * 0.56) > P.roam) P.heading = Math.atan2(dLat, dLng * 0.56);
  P.lat += Math.sin(P.heading) * stepM / 111320;
  P.lng += Math.cos(P.heading) * stepM / (111320 * 0.564);
  adv(stepM / 1.4);
}

// ---------- команда и лечение ----------
const team = () => me(() => S.team());
const alive = sp => me(() => S.alive(sp));
const ready = () => { const tm = team(); return tm.length === 3 && tm.every(alive); };
async function pickTeam() {
  const best = me(() => [...S.d.spirits].filter(sp => S.alive(sp) && S.hpNow(sp) >= 0.45).sort((a, b) => S.power(b) - S.power(a)).slice(0, 3).map(x => x.uid));
  if (best.join() !== (P.data.team || []).join()) await act('team', { uids: best });
}
async function heal() {
  const top = me(() => [...S.d.spirits].sort((a, b) => S.power(b) - S.power(a)).slice(0, 5).map(x => x.uid));
  for (const uid of top) {
    const sp = me(() => S.findSpirit(uid)); if (!sp) continue;
    const h = me(() => S.hpNow(sp)), it = P.data.items;
    if (h <= 0) {
      if (me(() => S.koLeft(sp)) > 4 * 3600000) {
        if (!(it.deadwater > 0) && P.pr.don >= 3 && P.data.zlat >= 60 && await act('shopBuy', { id: 'dead1' })) spend('Мёртвая вода', 60);
        if (P.data.items.deadwater > 0 && await act('heal', { uid, k: 'deadwater' })) D.deadUsed++;
      }
      continue;
    }
    if (h < 0.7) {
      const k = h < 0.35 && it.brew > 0 ? 'brew' : it.water > 0 && h < 0.45 ? 'water' : it.herb > 0 ? 'herb' : it.brew > 0 ? 'brew' : it.water > 0 ? 'water' : null;
      if (k && await act('heal', { uid, k })) D.heals++;
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
  if (!await act('encStart', start)) return false;
  D.tries++;
  if (SP[sid].rar >= 3 && P.data.items.honey > 0) await act('encHoney');
  for (let k = 0; k < 15; k++) {
    const item = start.kind === 'raid' ? 'charm' : throwItem(sid);
    if (!item) { await act('encEnd'); return false; }
    adv(4);
    const xp0 = P.data.xp;
    const t = await act('encThrow', { item, hit: Math.random() < P.pr.hit, ring: pick(P.pr.ring) });
    if (!t) { await act('encEnd'); return false; }
    if (t.caught) { xpAdd('поимка', xp0); D.catches++; const sp = me(() => S.findSpirit(t.uid)); if (sp && sp.shiny) D.shiny++; return true; }
    if (t.over) { if (t.fled) D.fled++; return false; }
  }
  await act('encEnd');
  return false;
}
const KEEP_ITEMS = { honey: 30, water: 30, herb: 40, brew: 20, incense: 8, charm2: 120, charm3: 120, charm: 200, gift: 10 };
async function tidyBag() {
  if (me(() => S.bagCount()) < me(() => S.bagLimit()) - 40) return;
  if (P.pr.don >= 3 && P.data.bagExtra < 10 && P.data.zlat >= Rules.bagPrice(P.data.bagExtra) + 200) { const pr = Rules.bagPrice(P.data.bagExtra); if (await act('shopBuy', { id: 'bag' })) spend('Сумка', pr); }
  for (const [k, keep] of Object.entries(KEEP_ITEMS)) {
    const have = P.data.items[k] || 0;
    if (have > keep && await act('discard', { k, n: have - keep })) D.discarded += have - keep;
  }
}
async function buyCharms() {
  const it = P.data.items, n = (it.charm || 0) + (it.charm2 || 0) + (it.charm3 || 0);
  if (n >= 15) return;
  if (P.pr.don >= 3 && P.data.zlat >= 120 + 100) { if (await act('shopBuy', { id: 'charm3x' })) spend('Золотые обереги', 120); return; }
  if (P.data.sparks >= 2000) await act('shopBuy', { id: 'charm20' });
}

// ---------- бои: модель исхода (живой игрок выжимает EFF от максимального урона) ----------
const bat = sp => me(() => S.battle(sp));
function raidOutcome(tm, rift) {
  const b = { boss: rift.boss, tier: rift.tier }, T = Raid.TIER[rift.tier], bs = me(() => Raid.bossStats(b)), bel = SP[rift.boss].el;
  const dps = me(() => Rules.raidMaxDamage(tm, b, 1)) / 1.3 * P.pr.eff;
  let t = 0, dealt = 0; const hp = {};
  for (const sp of tm) {
    const x = bat(sp), max = x.hp * 5, cur0 = max * me(() => S.hpNow(sp));
    const hit = Raid.dmg(bs.atk, x.def, T.pw, bel, SP[sp.sid].el) * (P.pr.dodge * 0.2 + (1 - P.pr.dodge));
    const life = cur0 / (hit / 3.8), need = (T.hp - dealt) / dps, use = Math.min(life, need, 90 - t);
    t += use; dealt += dps * use;
    hp[sp.uid] = Math.max(0, (cur0 - hit / 3.8 * use) / max);
    if (dealt >= T.hp || t >= 90) break;
  }
  tm.forEach(sp => { if (!(sp.uid in hp)) hp[sp.uid] = me(() => S.hpNow(sp)); });
  return { win: dealt >= T.hp, t: Math.max(3, t), hp };
}
function duelOutcome(tm, foe, speed) {
  const myDps = me(() => Rules.duelMaxDamage(tm, foe, 1)) / 1.3 * P.pr.eff, foeHp = me(() => Rules.duelFoeHp(foe));
  const fs = foe.map(f => ({ x: bat(f), el: SP[f.sid].el }));
  let t = 0, dealt = 0; const hp = {};
  for (const sp of tm) {
    const x = bat(sp), max = x.hp * Duel.HPX, cur0 = max * me(() => S.hpNow(sp)), el = SP[sp.sid].el;
    const fdps = fs.reduce((a, f) => a + Raid.dmg(f.x.atk, x.def, Duel.FAST, f.el, el), 0) / fs.length * 1.35 / (speed + 0.125);
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

async function raidAt(p, far) {
  const rift = me(() => W.riftFor(p, 0, Math.floor(SIM_T / 3600000)));
  if (!rift || P.data.rifts[rift.id] || me(() => Rules.dayUsed(S.d, 'raids')) >= 6) return false;
  await heal(); await pickTeam();
  if (!ready()) return false;
  const o = raidOutcome(team(), rift);
  if (!o.win && P.today.raidTry >= 1) return false;
  if (!await act('raidStart', { rift: { id: p.id, lat: p.lat, lng: p.lng, name: p.name }, far: !!far })) return false;
  P.today.raidTry++; if (far) D.far++;
  adv(o.t + Rules.COUNTDOWN);
  const xp0 = P.data.xp, e = await act('raidEnd', { win: o.win, hp: o.hp });
  D.ko += koCount(o.hp);
  if (e && e.win) { xpAdd('разлом', xp0); D.raids[0]++; P.today.raids++; await encounter({ kind: 'raid' }, rift.boss); return true; }
  D.raids[1]++; return false;
}
async function duelAt(p) {
  if (P.data.level < 3 || P.today.duels >= P.pr.duels) return;
  const e = me(() => W.shrineFor(p, 0));
  if (e.won || W.riftAt(p.id, Math.floor(SIM_T / 3600000)) || me(() => Rules.dayUsed(S.d, 'duels')) >= 8) return;
  const hold = await rpc('holdGet', P.uid, [p.id]);
  if (hold && P.data.clan && hold.clan === P.data.clan) { // своё Капище — поставить защитника
    if (hold.holders.length < 6 && !hold.holders.some(h => h.pid === P.data.pid)) await defendAt(p);
    return;
  }
  await heal(); await pickTeam();
  if (!ready()) return;
  const foe = hold ? GameCore.holdTeam(hold) : me(() => W.guardian(e).team);
  const o = duelOutcome(team(), foe, SHRINE_TIERS[e.tier].speed);
  if (!o.win) return; // видно по силе соперника — к сильному не идёт
  if (!await act('duelStart', { shrine: { id: p.id, lat: p.lat, lng: p.lng, name: p.name } })) return;
  adv(o.t + Rules.COUNTDOWN);
  const xp0 = P.data.xp, r = await act('duelEnd', { win: o.win, hp: o.hp });
  D.ko += koCount(o.hp);
  if (r && r.win) { xpAdd('Капище', xp0); D.duels[0]++; P.today.duels++; if (r.freed) D.freed++; if (P.data.clan) await defendAt(p); }
  else D.duels[1]++;
}
async function defendAt(p) {
  const tm = new Set(P.data.team || []);
  const sp = me(() => [...S.d.spirits].filter(x => !tm.has(x.uid) && S.alive(x)).sort((a, b) => S.power(b) - S.power(a))[1]);
  if (sp && await act('shrineDefend', { shrine: { id: p.id, lat: p.lat, lng: p.lng, name: p.name }, uid: sp.uid })) D.defend++;
}
async function invasionAt(p) {
  if (P.today.inv >= P.pr.inv || me(() => Rules.dayUsed(S.d, 'invasions')) >= 6) return;
  await heal(); await pickTeam();
  if (!ready()) return;
  const e = me(() => W.springFor(p, 0)); if (!e.invaded) return;
  const g = me(() => W.grunt(e)), o = duelOutcome(team(), g.team, Duel.FOE.invasion.speed);
  if (!await act('invStart', { spring: { id: p.id, lat: p.lat, lng: p.lng, name: p.name } })) return;
  adv(o.t + Rules.COUNTDOWN);
  const xp0 = P.data.xp, r = await act('invEnd', { win: o.win, hp: o.hp });
  D.ko += koCount(o.hp);
  if (r && r.win) {
    xpAdd('вторжение', xp0); D.inv[0]++; P.today.inv++;
    const n0 = P.data.spirits.length;
    await encounter({ kind: 'rescue' }, r.rescue.sid);
    const dark = P.data.spirits.length > n0 ? P.data.spirits.find(x => x.dark && !x.purified) : null;
    if (dark && me(() => !S.canPurify(dark)) && await act('purify', { uid: dark.uid })) D.purified++;
  } else D.inv[1]++;
}
// 4.16: Лига — живые бои. Днём игрок только решает, сколько боёв сыграет вечером; вечером главный поток собирает
// всех желающих (lgFind — поиск через сервер игры, пара — в «базе» главного потока), сам проводит бои (GameCore.pvp —
// ходы обеих сторон) и просит засчитать итоги (lgSettle — pvpResult через сервер игры)
function leaguePlan() { P.lgWant = P.data.level >= League.LEVEL ? P.pr.league : 0; }

// ---------- прогулка ----------
async function walk(km) {
  const STEP = 35, steps = Math.round(km * 1000 / STEP);
  let pts = [];
  for (let i = 0; i < steps; i++) {
    step(STEP);
    pts.push([+P.lat.toFixed(6), +P.lng.toFixed(6), SIM_T, 10]);
    if (pts.length >= 5) { const xp0 = P.data.xp; await act('move', { pts }); xpAdd('коконы и прочее', xp0); pts = []; }
    D.km += STEP / 1000;
    if (me(() => Rules.dayUsed(S.d, 'catches')) < 120) {
      const near = me(() => W.spawnsAround(P.lat, P.lng, W.INTERACT - 5).filter(s => s.type === 'spirit' && !s.tut && !S.d.caught[s.id]));
      for (const s of near) { await buyCharms(); await encounter({ kind: 'wild', id: s.id }, s.sid); }
    }
    if (i % 2) continue;
    for (const { p } of poisNear(P.lat, P.lng, 60)) {
      if (P.visited.has(p.id)) continue;
      P.visited.add(p.id);
      if (p.kind === 'spring') {
        const e = me(() => W.springFor(p, 0));
        await tidyBag();
        if (e.invaded) { if (P.data.level >= 3) await invasionAt(p); }
        else if (e.ready && me(() => Rules.dayUsed(S.d, 'springs')) < 30) { const xp0 = P.data.xp; if (await act('spring', { poi: { id: p.id, lat: p.lat, lng: p.lng, name: p.name } })) { D.springs++; xpAdd('родник', xp0); } }
      } else if (p.kind === 'shrine') {
        if (P.today.raids < P.pr.raids && me(() => W.riftAt(p.id, Math.floor(SIM_T / 3600000)))) await raidAt(p);
        else await duelAt(p);
      }
    }
  }
  if (pts.length) await act('move', { pts });
}
// дальние разломы (Дальний пропуск): у Капищ в 5 км
async function farRaids() {
  const want = P.pr.raids - P.today.raids;
  if (want <= 0) return;
  for (let n = 0; n < want; n++) {
    if (!(P.data.items.farpass > 0)) {
      if (P.pr.don >= 3 && P.data.zlat >= 45 + 60) { if (await act('shopBuy', { id: 'farpass3' })) spend('Дальние пропуски', 45); } else return;
    }
    const list = [];
    for (const p of workerData.shrines) { if (U.dist(P.lat, P.lng, p.lat, p.lng) < 4800 && me(() => { const r = W.riftFor(p, 0, Math.floor(SIM_T / 3600000)); return r && !S.d.rifts[r.id]; })) list.push(p); if (list.length > 40) break; }
    // лучший разлом, который реально победить
    let best = null;
    for (const p of list) { const r = me(() => W.riftFor(p, 0, Math.floor(SIM_T / 3600000))); const o = raidOutcome(team(), r); if (o.win && (!best || r.tier > best.r.tier)) best = { p, r }; }
    if (!best || !await raidAt(best.p, true)) return;
  }
}

// ---------- донат и траты златников ----------
async function donate() {
  const plan = P.pr.pay; if (!plan) return;
  if (P.dayN < plan.next) return;
  const pack = plan.packs[Math.floor(Math.random() * plan.packs.length)], x = Rules.PAY.find(q => q.id === pack);
  await rpc('pay', P.uid, [{ pack: x.id, zlat: Math.round(x.zlat * (1 + (x.bonus || 0) / 100)), rub: x.rub }]);
  const r = await act('payClaim');
  if (r && r.zlat) { D.rub += x.rub; D.zlatIn += r.zlat; }
  plan.next = P.dayN + plan.every[0] + Math.floor(Math.random() * (plan.every[1] - plan.every[0] + 1));
}
async function spendZlat() {
  const d = P.data, don = P.pr.don;
  // Золотая тропа: у донатеров — в начале сезона
  if (don >= 2 && d.pass && !d.pass.gold && d.zlat >= Rules.PASS.GOLD + 50 && await act('passGold')) spend('Золотая тропа', Rules.PASS.GOLD);
  // ладан: киты — дважды в день, средние — раз в день, остальные — если златников скопилось много
  const inc = don >= 3 ? 2 : don === 2 ? 1 : P.data.zlat >= 600 ? 1 : 0;
  for (let i = 0; i < inc; i++) if ((P.data.items.incense || 0) < 2 && P.data.zlat >= 50 + 20 && await act('shopBuy', { id: 'incense' })) spend('Ладан', 50);
  // коконы и амулеты — киты
  if (don >= 3 && P.data.cocoons.length < 9 && P.data.zlat >= 150 + 100 && await act('shopBuy', { id: 'cocoon10' })) spend('Коконы', 150);
  if (don >= 3 && P.data.zlat >= 200 + 300 && Math.random() < 0.3 && await act('shopBuy', { id: 'amulet' })) spend('Амулеты', 200);
}

// ---------- аукцион ----------
async function auction() {
  if (P.data.level < Rules.AUCTION.LEVEL) return;
  const mine = await act('auctionMine');
  if (mine && mine.got) for (const g of mine.got) if (g.type === 'sold') { D.aucSold++; }
  const open = mine ? mine.open : 5;
  // продать: лишние редкие, легенды-дубли, сияющие дубли, высокий IV
  if (open < Rules.AUCTION.MAX_OPEN) {
    const keep = me(() => { const by = {}; S.d.spirits.forEach(sp => (by[sp.sid] = by[sp.sid] || []).push(sp)); return new Set(Object.values(by).flatMap(a => a.sort((x, y) => S.power(y) - S.power(x)).slice(0, 1)).map(x => x.uid).concat(S.d.team || [])); });
    const sell = me(() => S.d.spirits.filter(sp => !keep.has(sp.uid) && !sp.fav && !sp.dark && (SP[sp.sid].rar >= 3 || sp.shiny || S.ivPct(sp) >= 90) && !(S.d.buddy && S.d.buddy.uid === sp.uid)).sort((a, b) => S.power(b) - S.power(a)).slice(0, Rules.AUCTION.MAX_OPEN - open));
    for (const sp of sell) {
      const pow = me(() => S.power(sp)), zl = SP[sp.sid].rar >= 4 || sp.shiny;
      const price = zl ? Math.max(5, Math.round(pow / 10 * (0.8 + Math.random() * 0.6))) : Math.max(300, Math.round(pow * 6 * (0.8 + Math.random() * 0.6)));
      if (await act('auctionSell', { uid: sp.uid, cur: zl ? 'zlat' : 'sparks', price })) D.aucListed = (D.aucListed || 0) + 1;
    }
  }
  // купить: сильнее самого слабого в команде (с учётом, что уровень урежется до уровня Ловчего)
  const tm = team(); if (tm.length < 3) return;
  const weak = Math.min(...tm.map(x => me(() => S.power(x)))), cap = me(() => S.catchLvl());
  const budgetS = P.data.sparks - 20000, budgetZ = P.data.zlat - (P.pr.don >= 2 ? 100 : 400);
  if (budgetS < 500 && budgetZ < 5) return;
  const found = await act('auctionFind', { f: { sort: 'power' } });
  if (!found) return;
  const lots = found.lots.filter(l => l.lvl <= cap && l.power > weak * 1.12 && (l.cur === 'sparks' ? l.price <= budgetS : l.price <= budgetZ));
  const buys = P.pr.don >= 3 ? 3 : P.pr.don === 2 ? 2 : 1;
  for (const l of lots.slice(0, buys)) {
    const r = await act('auctionBuy', { id: l.id });
    if (r) { D.aucBought++; if (r.cur === 'zlat') { D.aucZlatOut += r.price; spend('Аукцион', r.price); } else D.aucSparksOut += r.price; }
  }
}

// ---------- друзья и подарки ----------
async function social() {
  if (P.pendingFriends.length) {
    for (const pid of P.pendingFriends.splice(0, 10)) if (await act('friendAdd', { pid })) D.friends++;
  }
  const inbox = await rpc('giftsTo', P.uid, [P.data.pid]);
  for (const g of inbox) { const xp0 = P.data.xp; if (await act('giftOpen', { id: g.id })) { D.giftsOpened++; xpAdd('друзья', xp0); } }
  const fr = [...P.data.friends].filter(f => f.linked !== false).sort(() => Math.random() - 0.5);
  for (const f of fr) { if (!(P.data.items.gift > 0)) break; const xp0 = P.data.xp; if (f.sent !== me(() => U.today()) && await act('giftSend', { pid: f.id })) { D.giftsSent++; xpAdd('друзья', xp0); } }
}

// ---------- вечерние дела ----------
async function chores() {
  let xp0 = P.data.xp;
  for (const c of [...P.data.cocoons]) if (c.inc && c.walked >= c.km) { if (await act('hatch', { id: c.id })) D.hatch++; }
  xpAdd('коконы и прочее', xp0);
  xp0 = P.data.xp;
  for (const q of [...P.data.tasks]) if (q.p >= q.n) { if (await act('taskClaim', { id: q.id })) D.tasks++; }
  for (const m of [...P.data.taskMeet]) await encounter({ kind: 'task', id: m.id }, m.sid);
  xpAdd('поручения', xp0);
  xp0 = P.data.xp;
  const Q = P.data.quests;
  if (Q && Q.list) { for (let i = 0; i < Q.list.length; i++) { const q = Q.list[i]; if (q.p >= q.n && !q.claimed && await act('questClaim', { i })) D.quests++; } if (Q.list.every(q => q.claimed) && !Q.bonus) await act('questBonus'); }
  xpAdd('задания дня', xp0);
  xp0 = P.data.xp;
  while (me(() => S.storyReady && S.storyReady())) { if (!await act('storyClaim')) break; }
  if (P.data.storyGift) await encounter({ kind: 'story' }, P.data.storyGift);
  xpAdd('Летопись', xp0);
  xp0 = P.data.xp;
  if (P.data.pass) { const lv = Rules.passLevel(P.data.pass.pts); for (let l = 1; l <= lv; l++) { if (!(P.data.pass.got.free || []).includes(l)) await act('passClaim', { lvl: l, track: 'free' }); if (P.data.pass.gold && !(P.data.pass.got.gold || []).includes(l)) await act('passClaim', { lvl: l, track: 'gold' }); } }
  xpAdd('Сезонная тропа', xp0);
  xp0 = P.data.xp;
  for (let n = 0; n < 4; n++) {
    const c = me(() => S.d.spirits.filter(sp => SP[sp.sid].evo && !S.canEvolve(sp)).sort((a, b) => S.power(b) - S.power(a))[0]);
    if (!c) break;
    if (await act('evolve', { uid: c.uid })) D.evolve++;
  }
  xpAdd('превращения', xp0);
  for (let n = 0; n < 300; n++) {
    const sp = me(() => [...S.d.spirits].sort((a, b) => S.power(b) - S.power(a)).slice(0, 6).find(x => !S.canPowerUp(x) && S.d.sparks - S.powerUpCost(x).sparks >= 3000));
    if (!sp || !await act('powerUp', { uid: sp.uid })) break;
    D.power++;
  }
  if (!P.data.buddy) { const t = me(() => [...S.d.spirits].sort((a, b) => S.power(b) - S.power(a))[0]); if (t) await act('buddy', { uid: t.uid }); }
  // обменник: лишние искры → златники
  if (P.data.sparks > 30000) { const ex = await act('exchange', { n: 3 }); if (ex) D.exch += 3; }
  await auction();
  await social();
  await spendZlat();
  if (P.data.spirits.length > 160) {
    const keep = new Set(me(() => { const by = {}; S.d.spirits.forEach(sp => (by[sp.sid] = by[sp.sid] || []).push(sp)); return Object.values(by).flatMap(a => a.sort((x, y) => S.power(y) - S.power(x) || S.ivPct(y) - S.ivPct(x)).slice(0, 2)).concat(S.team(), S.d.spirits.filter(x => x.shiny || x.fav || SP[x.sid].legend || x.dark)).map(x => x.uid); }));
    const rel = P.data.spirits.filter(sp => !keep.has(sp.uid) && !(P.data.buddy && P.data.buddy.uid === sp.uid)).map(sp => sp.uid).slice(0, 200);
    if (rel.length && await act('release', { uids: rel })) D.released += rel.length;
  }
  await heal(); await pickTeam();
}

async function tutorial() {
  for (let n = 0; n < 60 && P.data.tut; n++) {
    const st = TUT[P.data.tut - 1];
    if (st.kind === 'talk' || st.kind === 'ui') await act('tutNext', { id: st.id });
    else if (st.kind === 'catch') await encounter({ kind: 'tut' }, st.sid);
    else if (st.kind === 'spring') { const near = poisNear(P.lat, P.lng, 2000).find(x => x.p.kind === 'spring'); if (near) { adv(near.d / 1.4); P.lat = near.p.lat; P.lng = near.p.lng; } if (!await act('spring', { poi: near ? { id: near.p.id, lat: near.p.lat, lng: near.p.lng, name: near.p.name } : null })) adv(60); }
    else if (st.kind === 'power') { if (!await act('powerUp', { uid: P.data.spirits[0].uid })) break; }
    else break;
  }
}

// ---------- день игрока ----------
const MSK = 3 * 3600000, DAY = 86400000;
async function playerDay(pl, dayN, dayStart) {
  P = pl; D = pl.st; P.dayN = dayN;
  pl.lgWant = 0; pl.lgMatch = null;
  if (!P.data) {
    globalThis.SIM_T = dayStart + (7 + Math.random() * 2) * 3600000;
    const r = await act('newGame', { name: P.name, starter: P.starter });
    if (!r) return; await tutorial();
  }
  if (P.data.level >= 40 && P.stopAt40) return;
  if (Math.random() > P.pr.playP) return; // сегодня не играет
  D.days++;
  P.today = { raids: 0, raidTry: 0, duels: 0, inv: 0 };
  P.visited = new Set();
  globalThis.SIM_T = dayStart + (P.pr.sessions[0][0] + Math.random()) * 3600000; // у каждого игрока свой день — с его утра
  await act('tick'); await act('daily');
  await donate();
  if (!P.data.clan && P.data.level >= CLAN_LEVEL) await act('clanJoin', { clan: P.clan });
  if (P.data.clan) await act('tribute');
  if (Math.random() < 0.5) await act('photo');
  const last = P.pr.sessions.length - 1;
  for (let i = 0; i < P.pr.sessions.length; i++) {
    const [h, km] = P.pr.sessions[i];
    // до места прогулки — дорога (иначе сервер видит скачок GPS)
    const nl = P.home.lat + (Math.random() - 0.5) * 0.004, ng = P.home.lng + (Math.random() - 0.5) * 0.006, road = U.dist(P.lat, P.lng, nl, ng);
    globalThis.SIM_T = Math.max(SIM_T + (road > 300 ? 11 * 60000 : 0), dayStart + (h + Math.random() * 0.5) * 3600000);
    P.lat = nl; P.lng = ng; P.heading = Math.random() * 6.28;
    await heal(); await pickTeam();
    if (i === last && P.data.items.incense > 0 && me(() => !S.incenseActive())) await act('incense');
    else if (P.pr.don >= 3 && P.data.items.incense > 0 && me(() => !S.incenseActive())) await act('incense');
    await walk(km * (0.8 + Math.random() * 0.4));
    if (i === last) { if (P.pr.far) await farRaids(); leaguePlan(); }
  }
  await chores();
}

parentPort.on('message', async m => {
  if (m.t === 'rpcRes') { const f = pending.get(m.id); pending.delete(m.id); f(m.res); return; }
  if (m.t === 'day') {
    const out = [];
    for (const pl of PL) {
      try { await playerDay(pl, m.day, m.dayStart); }
      catch (e) { const k = 'EXC: ' + e.message; pl.st.fails[k] = (pl.st.fails[k] || 0) + 1; if (!pl.st.stack) pl.st.stack = e.stack; }
      if (pl.data) out.push({ uid: pl.uid, pid: pl.data.pid, name: pl.data.name, level: pl.data.level, xp: pl.data.xp, clan: pl.data.clan, look: pl.data.look, lvl40: pl.st.lvlT[40] || null });
    }
    parentPort.postMessage({ t: 'dayDone', day: m.day, out });
    return;
  }
  if (m.t === 'lgFind') {
    let n = 0;
    for (const pl of PL) {
      if (!pl.data || !(pl.lgWant > 0) || pl.lgMatch) continue;
      P = pl; D = pl.st; globalThis.SIM_T = m.now;
      try {
        if (m.j === 0) { await heal(); await pickTeam(); }
        if (!ready() || !(me(() => League.view().tickets) > 0)) { pl.lgWant = 0; continue; }
        const r = await act('pvpFind', {});
        if (!r) { pl.lgWant = 0; continue; }
        n++;
        if (r.match) pl.lgMatch = r.match;
      } catch (e) { const k = 'EXC: ' + e.message; pl.st.fails[k] = (pl.st.fails[k] || 0) + 1; pl.lgWant = 0; }
    }
    parentPort.postMessage({ t: 'lgFound', n });
    return;
  }
  if (m.t === 'lgSettle') {
    for (const pl of PL) {
      if (!pl.data || !pl.lgMatch) { if (pl.lgWant > 0 && m.last) pl.lgWant = 0; continue; }
      P = pl; D = pl.st; globalThis.SIM_T = m.now;
      try {
        const xp0 = P.data.xp, r = await act('pvpResult', {});
        xpAdd('Лига', xp0);
        for (const x of (r && r.done) || []) { D.tourn++; x.win ? D.league[0]++ : D.league[1]++; }
      } catch (e) { const k = 'EXC: ' + e.message; pl.st.fails[k] = (pl.st.fails[k] || 0) + 1; }
      pl.lgMatch = null; pl.lgWant--;
    }
    parentPort.postMessage({ t: 'lgSettled' });
    return;
  }
  if (m.t === 'friends') { for (const pl of PL) pl.pendingFriends = (m.map[pl.uid] || []); parentPort.postMessage({ t: 'ok' }); return; }
  if (m.t === 'final') {
    const out = PL.filter(pl => pl.data).map(pl => {
      P = pl;
      const s = me(() => {
        const byP = [...S.d.spirits].sort((a, b) => S.power(b) - S.power(a));
        return { lvl: S.d.level, xp: S.d.xp, sparks: S.d.sparks, zlat: S.d.zlat, spirits: S.d.spirits.length, dex: Object.values(S.d.dex).filter(x => x.caught > 0).length,
          top: byP.slice(0, 3).map(x => `${SP[x.sid].name} ${x.lvl} ур. · ${S.power(x)}`), topPow: byP[0] ? S.power(byP[0]) : 0, team3: byP.slice(0, 3).reduce((a, x) => a + S.power(x), 0),
          lgPts: League.view().pts, lgBest: (S.d.league && S.d.league.best) || 0, story: S.d.story ? S.d.story.ch : 0, medals: S.d.medals ? Object.keys(S.d.medals).length : 0,
          friends: S.d.friends.length, bestFriend: Math.max(0, ...S.d.friends.map(f => f.pts)), clan: S.d.clan, amulets: Object.values(S.d.amulets || {}).reduce((a, b) => a + b, 0), km: Math.round(S.d.stats.km || 0), shinyAll: S.d.stats.shiny };
      });
      return { uid: pl.uid, name: pl.name, pr: pl.pr, arch: pl.arch, isMe: !!pl.isMe, st: pl.st, s };
    });
    parentPort.postMessage({ t: 'final', out });
  }
});
parentPort.postMessage({ t: 'ready' });
