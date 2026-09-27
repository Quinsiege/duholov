'use strict';
/* Мир из N Ловчих, играющих одновременно: node tools/sim/world/main.cjs [N] [дней] [потоков]
   Главный поток — «база» (аукцион, подарки, друзья, Капища дружин, таблица Лиги, платежи Казны),
   рабочие потоки ведут игроков через настоящий сервер игры. Итог — tools/sim/world/out/result.json */
const { Worker } = require('worker_threads');
const fs = require('fs'), path = require('path'), os = require('os');
const N = +process.argv[2] || 1000, MAX_DAYS = +process.argv[3] || 200, THREADS = +process.argv[4] || Math.max(1, os.cpus().length - 1);
const OUT = process.env.SIM_OUT || path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true }); // SIM_OUT — своя папка итогов (несколько прогонов сразу)
// mulberry32: целочисленный генератор (прежний LCG на обычных числах терял точность и повторялся каждые ~192 игрока)
let seed = 20261001; const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pickW = arr => { let x = rnd() * arr.reduce((a, [, w]) => a + w, 0); for (const [v, w] of arr) { if ((x -= w) < 0) return v; } return arr[0][0]; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += rnd(); return u / 6 - 0.5; };

// ---------- город: родники и Капища — общие для всех ----------
const C = { lat: 55.7558, lng: 37.6173 };
const pois = [], shrines = []; let pn = 500000;
for (let i = -37; i <= 37; i++) for (let j = -37; j <= 37; j++) {
  const shrine = i % 3 === 0 && j % 3 === 0;
  const p = { id: 'osm:n' + (++pn), lat: +(C.lat + i * 0.00135 + (rnd() - 0.5) * 0.0008).toFixed(6), lng: +(C.lng + j * 0.0024 + (rnd() - 0.5) * 0.0014).toFixed(6), kind: shrine ? 'shrine' : 'spring', active: true, imported: true };
  p.name = (shrine ? 'Капище ' : 'Родник ') + pn;
  pois.push(p); if (shrine) shrines.push(p);
}

// ---------- игроки ----------
const ARCH = {
  hardcore: { share: 0.06, sessions: [[7, 2.5], [12, 1.5], [18, 4]], playP: 0.98, raids: 5, duels: 5, inv: 4, league: 6, friends: [20, 40], far: true, whale: 0.15, mid: 0.2, small: 0.2 },
  active: { share: 0.22, sessions: [[8, 1.5], [13, 1], [19, 2.5]], playP: 0.95, raids: 2, duels: 2, inv: 2, league: 3, friends: [10, 30], far: false, whale: 0.05, mid: 0.12, small: 0.2 },
  regular: { share: 0.42, sessions: [[18, 2.5]], playP: 0.85, raids: 1, duels: 1, inv: 1, league: 2, friends: [3, 18], far: false, whale: 0.015, mid: 0.08, small: 0.2 },
  casual: { share: 0.30, sessions: [[19, 1.2]], playP: 0.55, raids: 1, duels: 1, inv: 1, league: 1, friends: [0, 8], far: false, whale: 0.005, mid: 0.04, small: 0.2 },
};
const STARTERS = ['ugolek', 'kapelka', 'mshonok']; // сервер разрешает только этих (GameCore.STARTERS)
const CLANS = ['sokol', 'medved', 'volk'];
const PAY = {
  1: { packs: ['z100', 'z330'], every: [25, 40] },
  2: { packs: ['z575', 'z1200'], every: [8, 14] },
  3: { packs: ['z2600', 'z2600', 'z1200'], every: [2, 4] },
};
const NAMES1 = ['Ярослав', 'Мирон', 'Всеслав', 'Любава', 'Злата', 'Ратибор', 'Милена', 'Добрыня', 'Велимира', 'Светозар', 'Лада', 'Горислав', 'Забава', 'Тихомир', 'Веселина', 'Остромир', 'Дарина', 'Будимир', 'Радмила', 'Святогор'];
const players = [];
for (let k = 0; k < N; k++) {
  const isMe = k === 0;
  const arch = isMe ? 'active' : pickW(Object.entries(ARCH).map(([a, x]) => [a, x.share])), A = ARCH[arch];
  const don = isMe ? 0 : pickW([[3, A.whale], [2, A.mid], [1, A.small], [0, 1 - A.whale - A.mid - A.small]]);
  const exc = clamp(0.15 + gauss() * 0.3, 0.03, 0.3), great = clamp(0.35 + gauss() * 0.3, 0.15, 0.5);
  const pr = {
    sessions: A.sessions.map(([h, km]) => [h + Math.round(gauss() * 2), +(km * (0.8 + rnd() * 0.4)).toFixed(2)]),
    playP: isMe ? 0.95 : clamp(A.playP + gauss() * 0.1, 0.3, 1), raids: A.raids, duels: A.duels, inv: A.inv, league: A.league,
    eff: isMe ? 0.6 : clamp(0.6 + gauss() * 0.3, 0.42, 0.8), dodge: clamp(0.6 + gauss() * 0.4, 0.3, 0.85), hit: isMe ? 0.88 : clamp(0.88 + gauss() * 0.15, 0.78, 0.95),
    ring: isMe ? [[0.8, 0.5], [0.55, 0.35], [0.3, 0.15]] : [[0.8, 1 - great - exc], [0.55, great], [0.3, exc]],
    don, pay: don ? { ...PAY[don], next: 1 + Math.floor(rnd() * (don === 3 ? 2 : don === 2 ? 6 : 12)) } : null, far: A.far || don === 3,
  };
  const home = { lat: C.lat + (rnd() - 0.5) * 0.08, lng: C.lng + (rnd() - 0.5) * 0.14 };
  const name = isMe ? 'Claude' : NAMES1[k % NAMES1.length] + (1 + Math.floor(k / NAMES1.length));
  players.push({ uid: 'u' + k, name, starter: STARTERS[k % STARTERS.length], clan: CLANS[Math.floor(rnd() * 3)], arch, isMe, home, roam: 0.012 + rnd() * 0.01, pr, stopAt40: true,
    wantFriends: isMe ? 20 : A.friends[0] + Math.floor(rnd() * (A.friends[1] - A.friends[0] + 1)) });
}
// Проверка доната (SIM_DONTEST=1): все — «активные», тройки одинаковых игроков: без доната, средний, кит
if (process.env.SIM_DONTEST) players.forEach((p, k) => {
  const b = players[k - k % 3], don = [0, 2, 3][k % 3], A = ARCH.active;
  if (k % 3 === 0) Object.assign(b.pr, { sessions: A.sessions.map(([h, km]) => [h, km]), playP: 0.95, raids: A.raids, duels: A.duels, inv: A.inv, league: A.league });
  Object.assign(p, { arch: 'active', isMe: false, home: b.home, roam: b.roam, clan: b.clan, wantFriends: b.wantFriends });
  p.pr = { ...b.pr, don, pay: don ? { ...PAY[don], next: 1 } : null, far: don === 3 };
});
// друзья: из соседей по району и знакомых по игре, взаимно
const friendsOf = {}; players.forEach(p => { friendsOf[p.uid] = new Set(); });
for (const p of players) {
  const near = players.filter(q => q !== p && Math.hypot(q.home.lat - p.home.lat, (q.home.lng - p.home.lng) * 0.56) < 0.025).sort(() => rnd() - 0.5);
  for (const q of near) {
    if (friendsOf[p.uid].size >= p.wantFriends) break;
    if (friendsOf[q.uid].size >= q.wantFriends + 3 || friendsOf[p.uid].has(q.uid)) continue;
    friendsOf[p.uid].add(q.uid); friendsOf[q.uid].add(p.uid);
  }
}

// ---------- база ----------
const DB = { players: {}, brief: {}, links: [], gifts: [], giftsById: new Map(), league: {}, order: {}, holds: {}, payments: [], lots: [], lotsById: new Map(), stats: { lotsSold: 0, lotsZlat: 0, lotsSparks: 0, payRub: 0 } };
let lotN = 0, giftN = 0, payN = 0;
// правила Капищ — присылают рабочие потоки (Rules.HOLD, HOLD_MAX из игры) вместе с «готов»
const K = { MAX_H: 72, HOLD_MAX: 6 };
const fresh = (x, now) => +x.t >= now - K.MAX_H * 3600000;
const soldBySid = {}; // 4.16: проданные лоты по виду — для подсказки цены (lotsRecent)
const H = {
  registerPid(uid, now, pid) { DB.players[pid] = uid; return 'ok'; },
  player(uid, now, pid) { const u = DB.players[pid], b = u && DB.brief[u]; return b ? { name: b.name, level: b.level } : null; },
  friendSave() { return null; },
  briefByPid(uid, now, pids) { const o = {}; pids.forEach(p => { const b = DB.brief[DB.players[p]]; if (b) o[p] = b; }); return o; },
  link(uid, now, from, to, name, level) { DB.links.push({ from_pid: from, to_pid: to, from_name: name, from_level: level }); },
  linksTo(uid, now, pid) { return DB.links.filter(l => l.to_pid === pid); },
  giftsTo(uid, now, pid) { return DB.gifts.filter(g => g.to_pid === pid && !g.opened_at).slice(0, 60).map(g => ({ ...g, invite: g.contents && g.contents.invite })); },
  invitesTo() { return 0; },
  giftCreate(uid, now, from, to, name, contents) { const g = { id: 'gift' + (++giftN), from_pid: from, to_pid: to, from_name: name, contents, created_at: now }; DB.gifts.push(g); DB.giftsById.set(g.id, g); },
  gift(uid, now, id) { return DB.giftsById.get(id) || null; },
  giftTake(uid, now, id, pid) { const g = DB.giftsById.get(id); if (!g || g.to_pid !== pid || g.opened_at) return false; g.opened_at = now; return true; },
  leagueScore(uid, now, x) { DB.league[uid] = { ...x, t: now }; },
  orderPut(uid, now, x) { DB.order[x.week + ':' + x.pid] = x; },
  orderStats(uid, now, week, pid) { return { players: 0, total: 0, mine: null, top: [] }; },
  holdGet(uid, now, poi) { const h = DB.holds[poi]; return h && h.holders.length ? JSON.parse(JSON.stringify(h)) : null; },
  // 4.16 (как shrine_defend в 023): защитники старше Rules.HOLD.MAX_H убираются перед проверками; на посту — не дольше срока
  holdDefend(uid, now, poi, lat, lng, clan, holder) {
    const h = DB.holds[poi] = DB.holds[poi] || { clan, holders: [], ver: 1, since: now };
    h.holders = h.holders.filter(x => fresh(x, now));
    if (h.holders.length && h.clan !== clan) return false;
    if (h.holders.length >= K.HOLD_MAX || h.holders.some(x => x.pid === holder.pid)) return false;
    if (!h.holders.length) h.since = now;
    h.clan = clan; h.holders.push(holder); h.ver++; return true;
  },
  holdDefeat(uid, now, poi, ver) { const h = DB.holds[poi]; if (!h || h.ver !== ver) return false; h.holders = []; h.ver++; DB.stats.freed = (DB.stats.freed || 0) + 1; return true; },
  myHolds(uid, now, pid) { let n = 0; for (const k in DB.holds) if (DB.holds[k].holders.some(x => x.pid === pid && fresh(x, now))) n++; return n; },
  myHoldsList(uid, now, pid) {
    const out = [];
    for (const k in DB.holds) { const h = DB.holds[k], x = h.holders.find(y => y.pid === pid && fresh(y, now)); if (x) out.push({ id: k, name: 'Капище', lat: 0, lng: 0, sid: x.sp.sid, sp: x.sp, t: x.t, n: h.holders.length }); }
    return out;
  },
  clanCounts(uid, now) { const o = { sokol: 0, medved: 0, volk: 0 }; for (const k in DB.holds) if (DB.holds[k].holders.some(x => fresh(x, now))) o[DB.holds[k].clan]++; return o; },
  lotCreate(uid, now, row) { const l = { id: 'lot' + (++lotN), status: 'open', delivered: false, settled: false, created_at: new Date(now).toISOString(), ...row }; l.exp = Date.parse(l.expires_at); DB.lots.push(l); DB.lotsById.set(l.id, l); return { ...l }; },
  lotsFind(uid, now, f) {
    const r = DB.lots.filter(l => l.status === 'open' && l.exp > now && (!f.sids || f.sids.includes(l.sid)) && (!f.el || l.el === f.el) && (!f.rar || l.rar === f.rar) && (!f.cur || l.cur === f.cur) && (!f.shiny || l.shiny)
      && l.iv_pct >= (f.minIv || 0) && l.power >= (f.minPower || 0) && (!f.maxPrice || l.price <= f.maxPrice) && (!f.maxLvl || l.lvl <= f.maxLvl) && l.seller_pid !== f.notPid);
    if (f.sort === 'cheap') r.sort((a, b) => a.price - b.price); else if (f.sort === 'power') r.sort((a, b) => b.power - a.power); else if (f.sort === 'iv') r.sort((a, b) => b.iv_pct - a.iv_pct); else r.reverse();
    return r.slice(f.from, f.from + 30).map(l => ({ ...l }));
  },
  lotsRecent(uid, now, sid, since) { return (soldBySid[sid] || []).filter(l => l.sold_at >= since).slice(-60).map(l => ({ cur: l.cur, price: l.price, lvl: l.lvl })); },
  lotsMine(uid, now, pid) { return DB.lots.filter(l => l.seller_pid === pid && !l.settled).map(l => ({ ...l })); },
  lotsOpenCount(uid, now, pid) { return DB.lots.filter(l => l.seller_pid === pid && l.status === 'open').length; },
  lotGet(uid, now, id) { const l = DB.lotsById.get(id); return l ? { ...l } : null; },
  lotBuy(uid, now, id, pid, name) {
    const l = DB.lotsById.get(id);
    if (l && l.status === 'open' && l.exp > now && l.seller_pid !== pid) {
      Object.assign(l, { status: 'sold', buyer_pid: pid, buyer_name: name, sold_at: now }); DB.stats.lotsSold++;
      (soldBySid[l.sid] = soldBySid[l.sid] || []).push(l);
      if (l.cur === 'zlat') DB.stats.lotsZlat += l.price; else DB.stats.lotsSparks += l.price;
      return { ...l };
    }
    return l && l.status === 'sold' && l.buyer_pid === pid && !l.delivered ? { ...l } : null;
  },
  lotCancel(uid, now, id, pid) { const l = DB.lotsById.get(id); if (l && l.seller_pid === pid && l.status === 'open') { l.status = 'cancelled'; return { ...l }; } return null; },
  lotsToSettle(uid, now, pid) {
    const out = [];
    for (const l of DB.lots) if (l.seller_pid === pid && !l.settled) { if (l.status === 'open' && l.exp < now) { l.status = 'expired'; DB.stats.lotsExp = (DB.stats.lotsExp || 0) + 1; } if (['sold', 'cancelled', 'expired'].includes(l.status)) out.push({ ...l }); }
    return out;
  },
  lotsDone(uid, now, ids, field) { ids.forEach(id => { const l = DB.lotsById.get(id); if (l) l[field] = true; }); },
  paidList(uid) { return DB.payments.filter(p => p.uid === uid && !p.credited).map(p => ({ id: p.id, pack: p.pack, zlat: p.zlat })); },
  payCredited(uid, now, ids) { DB.payments.forEach(p => { if (p.uid === uid && ids.includes(p.id)) p.credited = true; }); },
  pay(uid, now, x) { DB.payments.push({ id: 'pay' + (++payN), uid, pack: x.pack, zlat: x.zlat, rub: x.rub, t: now, credited: false }); DB.stats.payRub += x.rub; },
  leagueTop() { return { total: 0, me: null, rows: [], tier: [] }; },
};
const NOOP = ['tradeCreate', 'tradeTake', 'tradeReclaim', 'roomCreate', 'roomGet', 'roomJoin', 'roomStart', 'roomLeave', 'chatList', 'chatInsert', 'chatReport', 'deleteSave'];
NOOP.forEach(k => { H[k] = () => null; });

// ---------- потоки ----------
const chunks = Array.from({ length: THREADS }, () => []);
players.forEach((p, i) => chunks[i % THREADS].push(p));
const workers = chunks.map(ch => new Worker(path.join(__dirname, 'worker.cjs'), { workerData: { players: ch, pois, shrines } }));
function onRpc(w, m) {
  let res = null;
  try { res = H[m.fn] ? H[m.fn](m.uid, m.now, ...(m.args || [])) : null; } catch (e) { console.error('rpc', m.fn, e.message); }
  w.postMessage({ t: 'rpcRes', id: m.id, res });
}
const ask = (w, msg, want) => new Promise(res => { const h = m => { if (m.t === 'rpc') return; if (m.t === want) { w.off('message', h); res(m); } }; w.on('message', h); w.postMessage(msg); });
workers.forEach(w => { w.on('message', m => { if (m.t === 'rpc') onRpc(w, m); }); w.on('error', e => console.error('worker', e)); });

(async () => {
  await Promise.all(workers.map(w => new Promise(r => { const h = m => { if (m.t === 'ready') { w.off('message', h); if (m.k) Object.assign(K, m.k); r(); } }; w.on('message', h); })));
  console.log(`мир: ${N} игроков, ${pois.length} мест (${shrines.length} Капищ), ${THREADS} потоков`);
  const base = Date.UTC(2026, 9, 1) - 3 * 3600000, t0 = Date.now(), daily = [];
  const reach = {}; // uid → момент 40 уровня
  for (let day = 1; day <= MAX_DAYS; day++) {
    const dayStart = base + (day - 1) * 86400000;
    const outs = await Promise.all(workers.map(w => ask(w, { t: 'day', day, dayStart }, 'dayDone')));
    const all = outs.flatMap(o => o.out);
    all.forEach(x => { DB.brief[x.uid] = { name: x.name, level: x.level, clan: x.clan, look: x.look, pid: x.pid }; if (x.lvl40 && !reach[x.uid]) reach[x.uid] = x.lvl40; });
    if (day === 1) {
      const pidOf = uid => DB.brief[uid] && DB.brief[uid].pid, map = {};
      for (const p of players) map[p.uid] = [...friendsOf[p.uid]].map(pidOf).filter(Boolean);
      await Promise.all(workers.map(w => ask(w, { t: 'friends', map }, 'ok')));
    }
    if (day === 1 && all.length < N) { console.error(`ОШИБКА: начали игру только ${all.length} из ${N}`); process.exit(1); }
    const lv = all.map(x => x.level).sort((a, b) => a - b), n40 = lv.filter(l => l >= 40).length;
    const dayEnd = dayStart + 86400000, holds = Object.values(DB.holds).filter(h => h.holders.some(x => fresh(x, dayEnd))), byClan = { sokol: 0, medved: 0, volk: 0 }; holds.forEach(h => byClan[h.clan]++);
    const row = { day, median: lv[Math.floor(lv.length / 2)], p90: lv[Math.floor(lv.length * 0.9)], max: lv[lv.length - 1], n40, n30: lv.filter(l => l >= 30).length, n20: lv.filter(l => l >= 20).length,
      lotsOpen: DB.lots.filter(l => l.status === 'open').length, lotsLive: DB.lots.filter(l => l.status === 'open' && l.exp > dayEnd).length, lotsAll: DB.lots.length, lotsExp: DB.stats.lotsExp || 0, lotsSold: DB.stats.lotsSold, rub: DB.stats.payRub, holds: holds.length, byClan, meLvl: (all.find(x => x.uid === 'u0') || {}).level };
    daily.push(row);
    console.log(`день ${day}: медиана ${row.median}, 90% ${row.p90}, макс ${row.max}, на 40-м ${n40}, я ${row.meLvl} · лотов ${row.lotsOpen} (живых ${row.lotsLive}, всего выставлено ${row.lotsAll})/${row.lotsSold} продано · донат ${row.rub} ₽ · Капищ у дружин ${row.holds} из ${shrines.length} · ${Math.round((Date.now() - t0) / 1000)} с`);
    fs.writeFileSync(path.join(OUT, 'progress.json'), JSON.stringify({ daily, reach }, null, 0));
    if (n40 >= N) break;
  }
  const finals = await Promise.all(workers.map(w => ask(w, { t: 'final' }, 'final')));
  const res = { N, THREADS, secs: Math.round((Date.now() - t0) / 1000), daily, reach, players: finals.flatMap(f => f.out), friends: Object.fromEntries(Object.entries(friendsOf).map(([k, v]) => [k, v.size])),
    db: { lots: DB.lots.length, lotsSold: DB.stats.lotsSold, lotsExp: DB.stats.lotsExp || 0, holdsEnd: daily.length ? daily[daily.length - 1].holds : 0, shrines: shrines.length, lotsZlat: DB.stats.lotsZlat, lotsSparks: DB.stats.lotsSparks, payRub: DB.stats.payRub, payments: DB.payments.length, gifts: DB.gifts.length, giftsOpened: DB.gifts.filter(g => g.opened_at).length, freed: DB.stats.freed || 0,
      lotsByRar: DB.lots.filter(l => l.status === 'sold').reduce((o, l) => { o[l.rar] = (o[l.rar] || 0) + 1; return o; }, {}), topLots: DB.lots.filter(l => l.status === 'sold').sort((a, b) => (b.cur === 'zlat' ? b.price * 50 : b.price) - (a.cur === 'zlat' ? a.price * 50 : a.price)).slice(0, 10).map(l => ({ sid: l.sid, lvl: l.lvl, power: l.power, price: l.price, cur: l.cur, seller: l.seller_name, buyer: l.buyer_name })) },
    league: Object.entries(DB.league).map(([uid, x]) => ({ uid, name: x.name, pts: x.pts, rank: x.rank, level: x.level })).sort((a, b) => b.pts - a.pts).slice(0, 20) };
  fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(res));
  console.log('ГОТОВО', res.secs, 'с');
  process.exit(0);
})();
