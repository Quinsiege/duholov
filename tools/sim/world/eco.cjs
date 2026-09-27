'use strict';
// 4.16: сводка по экономике мира: node tools/sim/world/eco.cjs [result.json]
// Искры (приход, траты, запас), бесплатные златники в день и откуда они, предметы за 30 игровых дней, переполнение сумки
const fs = require('fs'), path = require('path');
const file = process.argv[2] || path.join(__dirname, 'out', 'result.json');
const r = JSON.parse(fs.readFileSync(file, 'utf8'));
const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const sum = o => Object.values(o || {}).reduce((a, b) => a + b, 0);
const DON = ['без доната', 'мелкий', 'средний', 'кит'];
const groups = {};
for (const p of r.players) {
  if (!p.st.eco) continue;
  const k = p.arch + (p.pr.don ? ' · ' + DON[p.pr.don] : '');
  (groups[k] = groups[k] || []).push(p);
}
const out = {};
for (const [k, ps] of Object.entries(groups).sort()) {
  const per = (p, v) => v / Math.max(1, p.st.days);
  const it = key => Math.round(avg(ps.map(p => per(p, (p.st.eco.itemsIn[key] || 0)) * 30)) * 10) / 10;
  const src = {}; ps.forEach(p => { for (const [s, v] of Object.entries(p.st.eco.zlatFree)) src[s] = (src[s] || 0) + per(p, v) / ps.length; });
  const sin = {}; ps.forEach(p => { for (const [s, v] of Object.entries(p.st.eco.sparksIn)) sin[s] = (sin[s] || 0) + per(p, v) / ps.length; });
  const sout = {}; ps.forEach(p => { for (const [s, v] of Object.entries(p.st.eco.sparksOut)) sout[s] = (sout[s] || 0) + per(p, v) / ps.length; });
  const r40 = ps.filter(p => p.st.lvlT && p.st.lvlT[40]);
  const top = o => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([a, b]) => [a, Math.round(b)]));
  out[k] = {
    n: ps.length, lvl: med(ps.map(p => p.s.lvl)), days: med(ps.map(p => p.st.days)),
    sparksNow: med(ps.map(p => p.s.sparks)), sparksAt40: r40.length ? med(r40.map(p => p.s.sparks)) : null, n40: r40.length,
    sparksInDay: Math.round(avg(ps.map(p => per(p, sum(p.st.eco.sparksIn))))), sparksOutDay: Math.round(avg(ps.map(p => per(p, sum(p.st.eco.sparksOut))))),
    sparksIn: top(sin), sparksOut: top(sout),
    zlatFreeDay: Math.round(avg(ps.map(p => per(p, sum(p.st.eco.zlatFree)))) * 10) / 10, zlatSrc: Object.fromEntries(Object.entries(src).sort((a, b) => b[1] - a[1]).map(([a, b]) => [a, Math.round(b * 10) / 10])),
    zlatNow: med(ps.map(p => p.s.zlat)),
    per30: { honey: it('honey'), water: it('water'), herb: it('herb'), brew: it('brew'), incense: it('incense'), deadwater: it('deadwater'), gift: it('gift'), charm: it('charm'), charm2: it('charm2'), charm3: it('charm3'),
      amulets: Math.round(avg(ps.map(p => per(p, p.st.eco.amuletsIn) * 30)) * 10) / 10 },
    deadUsed30: Math.round(avg(ps.map(p => per(p, p.st.deadUsed) * 30)) * 10) / 10, heals30: Math.round(avg(ps.map(p => per(p, p.st.heals) * 30))),
    bagOverMax: Math.max(...ps.map(p => p.st.eco.bagOverMax)), parcelMax: Math.max(...ps.map(p => p.st.eco.parcelMax || 0)),
    discarded30: Math.round(avg(ps.map(p => per(p, p.st.discarded) * 30))),
  };
}
fs.writeFileSync(path.join(path.dirname(file), 'eco.json'), JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) {
  console.log(`\n== ${k}: ${v.n} игр., ур. ${v.lvl}, дней ${v.days}, на 40-м ${v.n40}`);
  console.log(`искры: сейчас ${v.sparksNow}, на 40-м ${v.sparksAt40}, приход ${v.sparksInDay}/день, траты ${v.sparksOutDay}/день`);
  console.log('  приход:', JSON.stringify(v.sparksIn));
  console.log('  траты:', JSON.stringify(v.sparksOut));
  console.log(`златники бесплатно: ${v.zlatFreeDay}/день, на руках ${v.zlatNow}`, JSON.stringify(v.zlatSrc));
  console.log('за 30 дней:', JSON.stringify(v.per30), `Мёртвой воды выпито ${v.deadUsed30}, лечений ${v.heals30}, выброшено ${v.discarded30}`);
  console.log(`сумка сверх лимита (макс.): ${v.bagOverMax}, посылка (макс.): ${v.parcelMax}`);
}
