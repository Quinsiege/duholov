'use strict';
// Сводка по итогам симуляции мира: node tools/sim/world/report.cjs → out/report.json (+ печать главного)
const fs = require('fs'), path = require('path');
const r = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'result.json'), 'utf8'));
const base = Date.UTC(2026, 9, 1) - 3 * 3600000;
const dayOf = t => (t - base) / 86400000 + 1; // дробный день (1.5 = полдень первого дня)
const hm = t => { const d = new Date(t + 3 * 3600000); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const DON = ['без доната', 'мелкий', 'средний', 'кит'];
const P = r.players.map(p => {
  const t40 = p.st.lvlT[40] || null, t30 = p.st.lvlT[30] || null, t20 = p.st.lvlT[20] || null;
  const xpTot = Object.values(p.st.xpBy).reduce((a, b) => a + b, 0);
  return { ...p, t40, d40: t40 ? dayOf(t40) : null, d30: t30 ? dayOf(t30) : null, d20: t20 ? dayOf(t20) : null, xpTot, hours: p.st.play / 3600,
    kmDay: p.st.days ? p.st.km / p.st.days : 0, don: p.pr.don, rub: p.st.rub };
});
const reached = P.filter(p => p.t40).sort((a, b) => a.t40 - b.t40);
const row = p => ({ place: reached.indexOf(p) + 1 || null, name: p.name, arch: p.arch, don: DON[p.don], rub: p.rub, d40: p.d40 && +p.d40.toFixed(2), day40: p.d40 && Math.floor(p.d40), time40: p.t40 && hm(p.t40),
  d20: p.d20 && Math.floor(p.d20), d30: p.d30 && Math.floor(p.d30), daysPlayed: p.st.days, hours: +p.hours.toFixed(1), hoursDay: +(p.hours / Math.max(1, p.st.days)).toFixed(2), km: Math.round(p.st.km), kmDay: +p.kmDay.toFixed(1),
  catches: p.st.catches, springs: p.st.springs, raids: p.st.raids, far: p.st.far, duels: p.st.duels, inv: p.st.inv, league: p.st.league, tourn: p.st.tourn, friends: p.s.friends, giftsSent: p.st.giftsSent, giftsOpened: p.st.giftsOpened,
  aucBought: p.st.aucBought, aucSold: p.st.aucSold, zlatIn: p.st.zlatIn, zlatSpent: p.st.zlatSpent, xpBy: p.st.xpBy, top: p.s.top, team3: p.s.team3, lgPts: p.s.lgPts, dex: p.s.dex, story: p.s.story, eff: p.pr.eff, playP: p.pr.playP, evolve: p.st.evolve, hatch: p.st.hatch, tasks: p.st.tasks });
const group = key => {
  const g = {};
  for (const p of P) { const k = key(p); (g[k] = g[k] || []).push(p); }
  return Object.fromEntries(Object.entries(g).map(([k, a]) => [k, { n: a.length, reached: a.filter(p => p.t40).length, medDay40: med(a.filter(p => p.t40).map(p => p.d40)), bestDay40: a.filter(p => p.t40).length ? Math.min(...a.filter(p => p.t40).map(p => p.d40)) : null,
    medLvl: med(a.map(p => p.s.lvl)), rubAvg: Math.round(avg(a.map(p => p.rub))), rubSum: a.reduce((x, p) => x + p.rub, 0), hoursDay: +avg(a.map(p => p.hours / Math.max(1, p.st.days))).toFixed(2), kmDay: +avg(a.map(p => p.kmDay)).toFixed(1),
    xpShare: (() => { const s = {}; let t = 0; a.forEach(p => { for (const [k2, v] of Object.entries(p.st.xpBy)) { s[k2] = (s[k2] || 0) + v; t += v; } }); return Object.fromEntries(Object.entries(s).sort((x, y) => y[1] - x[1]).map(([k2, v]) => [k2, Math.round(v / t * 1000) / 10])); })(),
    team3: Math.round(avg(a.map(p => p.s.team3))), aucBought: +avg(a.map(p => p.st.aucBought)).toFixed(1), friends: +avg(a.map(p => p.s.friends)).toFixed(1) }]));
};
const byArch = group(p => p.arch), byDon = group(p => DON[p.don]), byArchDon = group(p => p.arch + ' · ' + DON[p.don]);
const meP = P.find(p => p.isMe);
// сколько на 40-м к дню
const cum = r.daily.map(d => ({ day: d.day, n40: d.n40, n30: d.n30, n20: d.n20, median: d.median, p90: d.p90, max: d.max, lotsSold: d.lotsSold, rub: d.rub, holds: d.holds, byClan: d.byClan, me: d.meLvl }));
// златники: откуда и куда
const zl = { in: 0, spent: {} }; P.forEach(p => { zl.in += p.st.zlatIn; for (const [k, v] of Object.entries(p.st.zlatSpent)) zl.spent[k] = (zl.spent[k] || 0) + v; });
const fails = {}; P.forEach(p => Object.entries(p.st.fails).forEach(([k, v]) => { fails[k] = (fails[k] || 0) + v; }));
const out = {
  n: r.N, secs: r.secs, days: r.daily.length, reachedN: reached.length,
  top20: reached.slice(0, 20).map(row), me: row(meP), last: reached.length ? row(reached[reached.length - 1]) : null,
  byArch, byDon, byArchDon, cum, zl, db: r.db, league: r.league,
  fails: Object.entries(fails).sort((a, b) => b[1] - a[1]).slice(0, 15),
  corr: (() => { // вклад доната: сравнение с тем же типом игрока без доната
    const o = {}; for (const a of Object.keys(byArch)) o[a] = [0, 1, 2, 3].map(d => { const g = P.filter(p => p.arch === a && p.don === d); const rr = g.filter(p => p.t40); return { don: DON[d], n: g.length, reached: rr.length, medDay40: med(rr.map(p => p.d40)), best: rr.length ? Math.min(...rr.map(p => p.d40)) : null, rubAvg: Math.round(avg(g.map(p => p.rub))) }; });
    return o; })(),
  whales: P.filter(p => p.don === 3).sort((a, b) => (a.d40 || 999) - (b.d40 || 999)).slice(0, 15).map(row),
  notReached: P.filter(p => !p.t40).map(p => p.s.lvl).reduce((o, l) => { o[l] = (o[l] || 0) + 1; return o; }, {}),
  // 4.16: бои — доля побед по ступеням (Капища — только с хранителем, без защитников дружин), падения и лечение на игрока в день
  battles: (() => {
    const o = {}, pct = ([w, l]) => w + l ? `${Math.round(w / (w + l) * 100)}% из ${w + l}` : '—';
    for (const a of [...Object.keys(byArch), 'все']) {
      const g = P.filter(p => (a === 'все' || p.arch === a) && p.st.bt), sum = f => g.reduce((x, p) => [x[0] + f(p)[0], x[1] + f(p)[1]], [0, 0]), days = g.reduce((x, p) => x + p.st.days, 0) || 1;
      o[a] = { raid: [1, 2, 3].map(t => pct(sum(p => p.st.bt.raid[t]))), duel: [1, 2, 3].map(t => pct(sum(p => p.st.bt.duel[t]))), inv: pct(sum(p => p.st.bt.inv)),
        koDay: +(g.reduce((x, p) => x + p.st.ko, 0) / days).toFixed(2), healsDay: +(g.reduce((x, p) => x + p.st.heals, 0) / days).toFixed(2), deadDay: +(g.reduce((x, p) => x + p.st.deadUsed, 0) / days).toFixed(3), watersDay: +(g.reduce((x, p) => x + p.st.bt.waters, 0) / days).toFixed(2) };
    }
    return o;
  })(),
};
fs.writeFileSync(path.join(__dirname, 'out', 'report.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ reachedN: out.reachedN, top5: out.top20.slice(0, 5).map(x => [x.place, x.name, x.arch, x.don, x.rub, x.d40, x.time40]), me: [out.me.place, out.me.d40], byArch: Object.fromEntries(Object.entries(byArch).map(([k, v]) => [k, [v.n, v.reached, v.medDay40]])), byDon: Object.fromEntries(Object.entries(byDon).map(([k, v]) => [k, [v.n, v.reached, v.medDay40, v.rubAvg]])), battles: out.battles }, null, 1));
