'use strict';
/* События: неделя (с понедельника 00:00 UTC, по кругу из WEEK_EVENTS) и праздники по календарю.
   В разработке (localhost) праздник можно посмотреть заранее: ?hol=svyatki | maslenitsa | kupala | veles */

const Ev = {
  week(t = U.now()) { return Math.floor((t / 86400000 + 3) / 7); }, // 01.01.1970 — четверг
  get cur() { return WEEK_EVENTS[this.week() % WEEK_EVENTS.length]; },
  get next() { return WEEK_EVENTS[(this.week() + 1) % WEEK_EVENTS.length]; },
  endsAt() { return ((this.week() + 1) * 7 - 3) * 86400000; },
  // 4.28: неделя мифологии — по кругу все семь (параллельно с событием недели): её духи встречаются в MYTH_MUL раз чаще
  get myth() { return MYTH_KEYS[this.week() % MYTH_KEYS.length]; },
  get nextMyth() { return MYTH_KEYS[(this.week() + 1) % MYTH_KEYS.length]; },
  MYTH_MUL: 3,
  // 4.28: × событие дороги Алатыря (Rules.ALATYR_WORLD): пока дорога в мир мифологии m распутана, её духи в MUL раз чаще
  mythMul(m, t = U.now()) { return (m === this.myth ? this.MYTH_MUL : 1) * this.roadMul(m, t); },
  /* 4.28: распутанные дороги Алатыря — [{ n, road, from, to }] (n — номер грани, road — мифология, from/to — мс).
     Сервер берёт их из базы (serve.js, World), телефон — из ответов сервера (событие roads, alatyr.js): у обоих одни и те же */
  roads: [],
  road(m, t = U.now()) { return (this.roads || []).find(r => r && r.road === m && t >= r.from && t < r.to) || null; },
  roadMul(m, t = U.now()) { return this.road(m, t) ? Rules.ALATYR_WORLD.MUL : 1; }, // две дороги одного мира разом — всё равно ×MUL
  roadsNow(t = U.now()) { return (this.roads || []).filter(r => r && t >= r.from && t < r.to); },
  // подпись набора дорог (сервер помнит, какой набор уже отдал телефону)
  roadsKey() { return (this.roads || []).map(r => `${r.n}:${r.from}`).join(','); },
  // только нужное для отбора духов и значка на карте: дороги, что ещё идут или скоро начнутся
  roadsLive(t = U.now()) { return (this.roads || []).filter(r => r && r.to > t).map(r => ({ n: r.n, road: r.road, from: r.from, to: r.to })); },
  // проверка присланного сервером (телефон): только известные мифологии и числа
  roadsClean(list) {
    return (Array.isArray(list) ? list : []).filter(r => r && typeof r.road === 'string' && Object.prototype.hasOwnProperty.call(MYTHS, r.road) && Number.isFinite(+r.from) && Number.isFinite(+r.to) && Number.isFinite(+r.n))
      .slice(0, 30).map(r => ({ n: +r.n | 0, road: r.road, from: +r.from, to: +r.to }));
  },

  /* 4.28: сезон Алатыря (Rules.ALATYR_WORLD). s — сезон, from — когда он начался (мс), start — общий счёт осколков на его
     начало, fin — финал { from, to, kills, goal } (все грани собраны: во всех Разломах Кощей), brk — когда Кощей расколет
     камень (Орден одолел его goal раз; иначе — в конце финала fin.to). С момента раскола — сезон s + 1, даже если база ещё
     не записала его. Сервер берёт всё из базы (serve.js, World), телефон — из ответов сервера (событие ala, alatyr.js) */
  ala: { s: 1, from: 0, start: 0, fin: null, brk: null },
  alaEnd() { const A = this.ala || {}; return A.brk || (A.fin && A.fin.to) || 0; },
  alaSeason(t = U.now()) { const A = this.ala || {}, e = this.alaEnd(); return Math.max(1, Math.floor(+A.s) || 1) + (e && t >= e ? 1 : 0); },
  // финал идёт (в момент t): все грани собраны, Кощей ещё не расколол камень
  finale(t = U.now()) { const f = (this.ala || {}).fin; return f && t >= f.from && t < this.alaEnd() ? f : null; },
  // открыть мифологии сезона, что идёт в момент t (data.js, mythOpen) — перед отбором духов
  alaSync(t = U.now()) { if (typeof mythOpen === 'function') mythOpen(this.alaSeason(t)); },
  // где камень текущего сезона при общем счёте total (сезон уже сменился, а база не записала начало — с нуля)
  alaStage(total, t = U.now()) { const A = this.ala || {}, s = this.alaSeason(t); return Rules.alaStage(s, s === A.s ? (+total || 0) - (+A.start || 0) : 0); },
  // для телефона и проверка присланного сервером
  alaView() { const A = this.ala || {}; return { s: A.s, from: A.from, start: A.start, fin: A.fin ? { ...A.fin } : null, brk: A.brk || null }; },
  alaClean(x) {
    const num = v => (Number.isFinite(+v) && v !== null && v !== '' ? +v : 0);
    if (!x || typeof x !== 'object') return { s: 1, from: 0, start: 0, fin: null, brk: null };
    const f = x.fin && typeof x.fin === 'object' && num(x.fin.to) > num(x.fin.from) ? { from: num(x.fin.from), to: num(x.fin.to), kills: Math.max(0, num(x.fin.kills)), goal: Math.max(1, num(x.fin.goal) || Rules.ALATYR_WORLD.FINALE.GOAL) } : null;
    return { s: Math.max(1, Math.floor(num(x.s)) || 1), from: num(x.from), start: Math.max(0, num(x.start)), fin: f, brk: num(x.brk) || null };
  },
  // подпись сезона (сервер помнит, какую уже отдал телефону); победы над Кощеем в неё не входят — их телефон спрашивает сам
  alaKey() { const A = this.ala || {}; return `${A.s}:${A.start}:${A.fin ? A.fin.from + '-' + A.fin.to : ''}:${A.brk || ''}`; },

  // Православная Пасха (юлианский расчёт + 13 дней, верно для 1900–2099); дата в UTC
  easter(y) {
    const a = y % 4, b = y % 7, c = y % 19, d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
    const m = Math.floor((d + e + 114) / 31), day = ((d + e + 114) % 31) + 1;
    return new Date(Date.UTC(y, m - 1, day + 13));
  },
  // Праздник на местную дату игрока: { id, ...HOLIDAYS[id], start, end } или null.
  // now — «местная» дата (см. U.local): её UTC-поля — это местные дата и время.
  holiday(now = U.local()) {
    const forced = DEV && new URLSearchParams(location.search).get('hol');
    if (forced && HOLIDAYS[forced]) return { id: forced, ...HOLIDAYS[forced], end: new Date(now.getTime() + 86400000) };
    const y = now.getUTCFullYear();
    const day = (m, d, yy = y) => new Date(Date.UTC(yy, m - 1, d));
    const ranges = [
      ['svyatki', day(12, 25, y - 1), day(1, 15)],
      ['svyatki', day(12, 25), day(1, 15, y + 1)],
      ['kupala', day(7, 5), day(7, 9)],
      ['pokrov', day(10, 12), day(10, 17)], // 4.0: Покров день — 14 октября
      ['veles', day(10, 30), day(11, 3)],
    ];
    const e = this.easter(y);
    ranges.push(['maslenitsa', day(e.getUTCMonth() + 1, e.getUTCDate() - 55), day(e.getUTCMonth() + 1, e.getUTCDate() - 48)]);
    const hit = ranges.find(([, s, en]) => now >= s && now < en);
    return hit ? { id: hit[0], ...HOLIDAYS[hit[0]], start: hit[1], end: hit[2] } : null;
  },
  get hol() {
    const t = Math.floor(U.now() / 600000) + ':' + U.tzMin();
    if (this._holT !== t) { this._holT = t; this._hol = this.holiday(); }
    return this._hol;
  },
  month() { return U.local().getUTCMonth(); },
  season() { const m = this.month(); return m === 11 || m <= 1 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn'; },

  elMul(el) {
    const h = this.hol;
    return (this.cur.el === el ? 2.5 : 1) * (h && h.el.includes(el) ? (h.elMul || 2) : 1);
  },
  // опыт: события (Звездопад, праздники) × 4.16: Настой опыта игрока (Rules.XP_BREW, пока действует)
  evXpMul() { return (this.cur.xp || 1) * ((this.hol && this.hol.xp) || 1); },
  xpMul() { return this.evXpMul() * (typeof S !== 'undefined' && S.d && S.d.xpUntil > Date.now() ? Rules.XP_BREW.MUL : 1); },
  lootMul() { return (this.cur.loot || 1) * ((this.hol && this.hol.loot) || 1); },
  kmMul() { return this.cur.km || 1; },
  shinyMul() {
    const h = this.hol;
    return (this.cur.shiny || 1) * ((h && h.shiny) || 1) * (h && h.shinyNight && U.isNight() ? h.shinyNight : 1);
  },
  duelMul() { return this.cur.duel || 1; },
  springCooldown() { return (this.cur.cooldown || 5) * 60000; },

  // Сезонные духи: зимние — с декабря по февраль и на Святки, Купалинка — летом и на Купалу, осенние — с сентября по ноябрь
  seasonal(s) {
    if (!s.season) return 1;
    const h = this.hol, m = this.month();
    const boosted = h && h.seasonal && h.seasonal.includes(s.id);
    if (boosted) return 6;
    if (s.season === 'winter') return m === 11 || m <= 1 ? 1 : 0;
    if (s.season === 'kupala') return m === 5 || m === 6 ? 0.6 : 0;
    if (s.season === 'autumn') return m >= 8 && m <= 10 ? 0.6 : 0; // 4.0: Листопадница — с сентября по ноябрь
    return 0;
  },
};
