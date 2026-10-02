'use strict';
/* Утилиты: детерминированный хеш/ГСЧ, гео, DOM, звук, вибрация, события */

const U = {
  // cyrb53 — стабильный хеш строки → число в [0, 1)
  h(...parts) {
    const str = parts.join('|');
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)) / 9007199254740992;
  },
  // mulberry32
  rng(seed) {
    let a = Math.floor((typeof seed === 'number' ? seed : U.h(seed)) * 4294967296) >>> 0;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  weighted(entries, r) { // entries: [[value, weight], ...]
    const total = entries.reduce((s, e) => s + e[1], 0);
    let x = r * total;
    for (const [v, w] of entries) { if ((x -= w) < 0) return v; }
    return entries[entries.length - 1][0];
  },
  uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },
  // Случайный код из криптостойкого генератора (коды посылок и комнат нельзя предсказать по уже виденным). 32 символа алфавита делят 256 — без перекоса
  code(n, alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789') { const b = new Uint8Array(n); crypto.getRandomValues(b); return Array.from(b, x => alpha[x % alpha.length]).join(''); },

  /* Время игры. Сервер и телефон должны считать одинаково: «сейчас» — по часам сервера
     (U.skew — поправка телефона), «сегодня» — в часовом поясе игрока (U.tz, минуты к UTC).
     5.1.26: время суток (ночь, час) — по солнцу там, где стоит Ловчий на карте, а не по часам телефона: телепорт меняет и его.
     Календарь (сегодня, полночь, месяц) остаётся в поясе игрока — шаг во Врата не начинает новый день */
  skew: 0,
  tz: null,
  now() { return Date.now() + this.skew; },
  tzMin() { return this.tz != null ? this.tz : -new Date().getTimezoneOffset(); },
  // Дата, у которой getUTC*() — это местные дата и время игрока
  local(t = this.now()) { return new Date(t + this.tzMin() * 60000); },
  // где Ловчий: на телефоне — позиция на карте, на сервере — из запроса (MapView.pos у каждого запроса своя)
  here() { const p = typeof MapView !== 'undefined' && MapView.pos; return p && Number.isFinite(+p.lat) && Number.isFinite(+p.lng) ? p : null; },
  // местный солнечный час (0–23) на долготе lng (без места — по часам игрока)
  hour(t = this.now(), lng) {
    if (lng == null) { const p = this.here(); if (!p) return this.local(t).getUTCHours(); lng = +p.lng; }
    return Math.floor((((t / 3600000 + lng / 15) % 24) + 24) % 24);
  },
  // высота солнца над горизонтом, градусы (приближённая формула — точности в пару градусов хватает); morning — до полудня
  sun(lat, lng, t = this.now()) {
    const r = Math.PI / 180, n = t / 86400000 - 10957.5;
    const L = (280.46 + 0.9856474 * n) % 360, g = (357.528 + 0.9856003 * n) % 360;
    const lam = (L + 1.915 * Math.sin(g * r) + 0.02 * Math.sin(2 * g * r)) * r, eps = (23.439 - 4e-7 * n) * r;
    const dec = Math.asin(Math.sin(eps) * Math.sin(lam)), ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam));
    let ha = (((18.697374558 + 24.06570982441908 * n) % 24) * 15 + lng) * r - ra;
    ha = Math.atan2(Math.sin(ha), Math.cos(ha));
    const alt = Math.asin(Math.sin(lat * r) * Math.sin(dec) + Math.cos(lat * r) * Math.cos(dec) * Math.cos(ha)) / r;
    return { alt, morning: ha < 0 };
  },
  // 'dawn' | 'day' | 'dusk' | 'night' — по нему рисуется карта (MapView.look)
  phase(lat, lng, t) {
    const s = this.sun(lat, lng, t);
    return s.alt >= 6 ? 'day' : s.alt < -6 ? 'night' : s.morning ? 'dawn' : 'dusk';
  },
  // ночь игры — когда карта тёмная: вечерние сумерки и ночь. Тогда выходят ночные духи, а дневные прячутся
  isNight(t = this.now(), lat, lng) {
    if (lat == null) {
      const p = this.here();
      if (!p) { const h = this.local(t).getUTCHours(); return h >= 20 || h < 6; }
      lat = +p.lat; lng = +p.lng;
    }
    const ph = this.phase(lat, lng, t);
    return ph === 'night' || ph === 'dusk';
  },
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp: (a, b, t) => a + (b - a) * t,

  dist(lat1, lng1, lat2, lng2) {
    const R = 6371000, toR = Math.PI / 180;
    const dLat = (lat2 - lat1) * toR, dLng = (lng2 - lng1) * toR;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toR) * Math.cos(lat2 * toR) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  },
  fmtDist(m) { return m < 1000 ? ru`${Math.round(m)} м` : ru`${(m / 1000).toFixed(m < 10000 ? 1 : 0)} км`; },
  fmtTime(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(s / 60), ss = s % 60;
    if (m >= 48 * 60) return ru`${Math.floor(m / 1440)} дн ${Math.floor(m / 60) % 24} ч`;
    return m >= 60 ? ru`${Math.floor(m / 60)} ч ${m % 60} мин` : `${m}:${String(ss).padStart(2, '0')}`;
  },
  // 5.1.24: сколько осталось — с секундами, для тикающих таймеров: «5 ч 12 мин 33 с», меньше часа — «12 мин 33 с»
  fmtHms(ms) {
    const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60;
    return h ? ru`${h} ч ${m} мин ${x} с` : ru`${m} мин ${x} с`;
  },
  // 4.15: формы слова по правилам языка игры: one — «1 оберег», few — «2 оберега», many — «5 оберегов»
  // (в других языках few не бывает: в переводе few и many — обычно одна и та же форма множественного числа)
  plural(n, one, few, many) {
    const L = I18N.lang, x = Math.abs(n);
    if (L === 'ru') { const a = x % 100, b = a % 10; return a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many; }
    if (L === 'zh' || L === 'ja' || L === 'ko' || L === 'id' || L === 'tr') return many;
    if (L === 'fr' || L === 'pt' || L === 'hi') return x < 2 ? one : many;
    return x === 1 ? one : many;
  },
  fmtNum(n) { return Math.round(n).toLocaleString(I18N.locale); },
  today(t) { const d = this.local(t); return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`; },

  $(sel, root = document) { return root.querySelector(sel); },
  $$(sel, root = document) { return [...root.querySelectorAll(sel)]; },
  el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; },
  esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
  wait: ms => new Promise(r => setTimeout(r, ms)),

  vibrate(p) {
    try {
      const active = !navigator.userActivation || navigator.userActivation.hasBeenActive;
      if (active && Cfg.s.vibro && navigator.vibrate) navigator.vibrate(p);
    } catch (e) {}
  },
};

/* ---------- Мини-шина событий (для заданий, HUD) ---------- */
const Bus = {
  map: {},
  on(ev, fn) { (this.map[ev] = this.map[ev] || []).push(fn); },
  emit(ev, data) { (this.map[ev] || []).forEach(fn => fn(data)); },
};

/* ---------- Звук: сэмплы из www/sfx (AudioBuffer), запасной вариант — прежний синтез ---------- */
// Имя звука → файл sfx/<f>.mp3 (откуда файлы и их лицензии — www/sfx/LICENSES.md, сборка — tools/sfx/build.mjs).
// vol — громкость (по замерам: на 2 дБ громче прежнего синтеза — соотношение звуков и музыки прежнее);
// gap — тот же звук не чаще, с; vary — разброс высоты ±доля (частые звуки не звучат «пулемётом»);
// duck — на время мелодии приглушить музыку; fb — чей синтез играть, пока файл не скачан или не декодируется;
// synth — звук осознанно остаётся синтезом. Новое имя звука — сюда (тест проверяет, что у каждого вызова есть строка).
const SFX_VER = 1; // файлы заменили — увеличить: новые адреса, старые записи кэша (sw.js, duholov-sfx) удалятся сами
const SFX = {
  // интерфейс
  tap:        { f: 'tap', vol: 0.078, gap: 0.04, vary: 0.04 },
  count:      { f: 'count', vol: 0.122, fb: 'tap' },          // отсчёт 3-2-1 перед боем
  page:       { f: 'page', vol: 0.141, fb: 'tap' },           // страница книги и вступления
  hint:       { f: 'hint', vol: 0.2, fb: 'spin' },            // новый шаг обучения
  success:    { f: 'success', vol: 0.15, fb: 'catch' },       // спутник, новый друг, дух на страже
  send:       { f: 'send', vol: 0.133, fb: 'spin' },          // подарок, заявка отправлены
  // ошибки
  error:      { f: 'error', vol: 0.067, fb: 'miss', gap: 0.15 }, // ошибка действия (ответ сервера)
  locked:     { f: 'locked', vol: 0.132, fb: 'miss' },        // раздел ещё закрыт
  nudge:      { f: 'nudge', vol: 0.047, fb: 'miss', gap: 0.3 }, // обучение: коснулся не того
  sad:        { f: 'sad', vol: 0.123, fb: 'lose', duck: true }, // стражи вернулись
  // поимка и духи
  throw:      { f: 'throw', vol: 0.111 },
  hit:        { f: 'hit', vol: 0.172, vary: 0.04 },
  miss:       { f: 'miss', vol: 0.072 },                      // только промах оберегом
  wobble:     { f: 'wobble', vol: 0.12, vary: 0.06 },
  escape:     { f: 'escape', vol: 0.141 },
  crack:      { f: 'escape', vol: 0.155, fb: 'warn' },        // трещина стартового кокона
  flee:       { f: 'flee', vol: 0.158 },
  catch:      { f: 'catch', vol: 0.182, duck: true },
  shiny:      { f: 'shiny', vol: 0.188, fb: 'spin' },
  photo:      { f: 'photo', vol: 0.269, fb: 'hit' },
  heal:       { f: 'heal', vol: 0.176, fb: 'hatch' },         // лечение, живая вода
  hatch:      { f: 'hatch', vol: 0.221, duck: true },         // кокон раскрылся, подарок, дух Кампании
  use_item:   { f: 'use_item', vol: 0.153, fb: 'spin' },      // мёд, ладан, настой
  // бой
  attack:     { f: 'attack', vol: 0.036, gap: 0.05, vary: 0.06 },
  special:    { f: 'special', vol: 0.127 },
  charge:     { f: 'charge', vol: 0.117, gap: 0.03, fb: 'tap' }, // накачка приёма, выше с каждым касанием
  warn:       { f: 'warn', vol: 0.263 },
  shield:     { f: 'shield', vol: 0.124, fb: 'hit' },
  hurt:       { f: 'hurt', vol: 0.145, vary: 0.04 },
  ko:         { f: 'ko', vol: 0.108, fb: 'hit' },
  match:      { f: 'match', vol: 0.133, fb: 'warn' },         // Лига: соперник найден
  win:        { f: 'win', vol: 0.17, duck: true },
  lose:       { f: 'lose', vol: 0.14, duck: true },
  // голоса стихий — Sfx.element(стихия, тихо)
  'el:fire':    { f: 'el-fire', vol: 0.136 },
  'el:water':   { f: 'el-water', vol: 0.135 },
  'el:forest':  { f: 'el-forest', vol: 0.136 },
  'el:wind':    { f: 'el-wind', vol: 0.136 },
  'el:current': { f: 'el-current', vol: 0.133 },
  'el:shadow':  { synth: true },                              // в наборах «тень» почти вся ниже 250 Гц — телефон её не играет
  // награды и события
  spring:     { f: 'spring', vol: 0.16, fb: 'spin' },         // касание Источника
  bag:        { f: 'bag', vol: 0.124, fb: 'tap' },
  loot:       { f: 'loot', vol: 0.092, gap: 0.03, vary: 0.05, fb: 'tap' }, // предмет влетел в сумку
  reward:     { f: 'reward', vol: 0.164, fb: 'spin' },        // обычная награда
  reward_big: { f: 'reward_big', vol: 0.18, fb: 'levelup', duck: true }, // сундук, Кампания, серия, знак, промокод
  pay:        { f: 'pay', vol: 0.178, fb: 'levelup', duck: true }, // оплата прошла, Золотая тропа
  coins:      { f: 'coins', vol: 0.376, fb: 'spin' },         // покупка и обмен
  equip:      { f: 'equip', vol: 0.13, fb: 'spin' },
  notice:     { f: 'notice', vol: 0.158, fb: 'levelup', duck: true }, // Алатырь, клан
  portal:     { f: 'portal', vol: 0.16, fb: 'spin' },         // Врата Перепутицы
  // уровни и рост
  levelup:    { f: 'levelup', vol: 0.202, duck: true },       // уровень Ловчего, эволюция, пробуждение
  powerup:    { f: 'powerup', vol: 0.16, fb: 'spin' },        // усиление, новый приём, очищение
};

const Sfx = {
  ctx: null, out: null, BASE: 'sfx/', MAX: 8,
  buf: {}, bad: {}, wait: {}, last: {}, live: [],
  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    // общая шина: сэмплы и синтез идут через мягкий ограничитель — наложения не хрипят
    this.out = this.ctx.destination;
    try {
      const lim = this.ctx.createDynamicsCompressor();
      lim.threshold.value = -10; lim.knee.value = 6; lim.ratio.value = 8; lim.attack.value = 0.003; lim.release.value = 0.15;
      lim.connect(this.ctx.destination);
      this.out = lim;
    } catch (e) { /* без ограничителя */ }
    setTimeout(() => this.preload(), 600); // init — по первому касанию; файлы — в фоне, по два за раз
  },
  // все файлы таблицы; их хранит service worker (sfx/ — свой постоянный кэш), дальше звуки есть и без сети
  preload() {
    if (this.loading || !this.ctx) return;
    this.loading = true;
    const q = [...new Set(Object.values(SFX).map(d => d.f).filter(Boolean))];
    const next = () => (q.length ? this.load(q.shift()).then(next) : null);
    next(); next();
  },
  load(f) {
    if (this.buf[f] || this.bad[f] || !this.ctx || typeof fetch !== 'function') return Promise.resolve(this.buf[f] || null);
    return this.wait[f] || (this.wait[f] = fetch(`${this.BASE}${f}.mp3?v=${SFX_VER}`)
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
      .then(a => new Promise((ok, no) => {
        const p = this.ctx.decodeAudioData(a, ok, no); // колбэки — для старого Safari
        if (p && p.catch) p.catch(no);
      }))
      .then(b => (this.buf[f] = b), () => { this.bad[f] = true; return null; }) // не вышло — до перезапуска синтез
      .then(b => { delete this.wait[f]; return b; }));
  },
  ready() {
    if (!this.ctx || !Cfg.s.sound) return false;
    if (this.ctx.state !== 'running') { // suspended — до касания, interrupted — на iPhone после звонка
      try { const p = this.ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* закрыт */ }
    }
    return true;
  },
  // Sfx.play('catch'), Sfx.play('charge', { rate: 1.2 }): сэмпл, если загружен, иначе синтез
  play(name, o = {}) {
    if (!this.ready()) return;
    const d = SFX[name] || {}, now = this.ctx.currentTime;
    if (now - (this.last[name] == null ? -9 : this.last[name]) < (d.gap || 0.03)) return; // тот же звук слишком часто
    this.last[name] = now;
    this.room(now);
    const b = d.f && this.buf[d.f];
    if (b) { this.sample(b, d, o, now); return; }
    if (d.f) this.load(d.f); // ещё не скачан — сейчас синтез, к следующему разу будет сэмпл
    const el = String(name).startsWith('el:') && name.slice(3);
    this.voiceOf(now, () => (el ? this.synthElement(el, o.soft) : this.synth(d.fb || name)));
  },
  // Голос стихии: особые приёмы и появление духа; тихо — вдвое тише
  element(el, soft) { this.play('el:' + el, { vol: soft ? 0.5 : 1, soft }); },
  sample(b, d, o, now) {
    const ctx = this.ctx, src = ctx.createBufferSource(), g = ctx.createGain();
    const rate = (o.rate || 1) * (1 + (Math.random() * 2 - 1) * (d.vary || 0));
    src.buffer = b; src.playbackRate.value = rate;
    g.gain.value = d.vol * (o.vol == null ? 1 : o.vol);
    src.connect(g); g.connect(this.out);
    src.onended = () => { try { g.disconnect(); } catch (e) { /* уже отключён */ } };
    src.start(now);
    this.live.push({ end: now + b.duration / rate, stop: () => src.stop() });
    if (d.duck && typeof Music !== 'undefined' && Music.duck) Music.duck(b.duration / rate);
  },
  // не больше MAX звуков сразу: новому не хватает места — самый старый обрывается
  room(now) {
    this.live = this.live.filter(v => v.end > now);
    while (this.live.length >= this.MAX) { const v = this.live.shift(); try { v.stop(); } catch (e) { /* уже стих */ } }
  },
  // синтезированный звук — один «голос»: все его узлы обрываются вместе
  voiceOf(now, fn) {
    const nodes = this._grab = [];
    this._end = now;
    try { fn(); } finally { this._grab = null; }
    if (nodes.length) this.live.push({ end: this._end, stop: () => nodes.forEach(n => { try { n.stop(); } catch (e) { /* уже стих */ } }) });
  },
  grab(node, end) { if (this._grab) { this._grab.push(node); this._end = Math.max(this._end, end); } },
  tone(freq, dur, { type = 'sine', vol = 0.12, when = 0, to = null } = {}) {
    if (!this.ctx || !Cfg.s.sound) return;
    const t0 = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.out || this.ctx.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
    this.grab(o, t0 + dur + 0.05);
  },
  // Шум через фильтр — для треска огня, свиста ветра, шелеста листвы
  noise(dur, { vol = 0.1, when = 0, type = 'lowpass', f = 1000, to = null, q = 1 } = {}) {
    if (!this.ctx || !Cfg.s.sound) return;
    const ctx = this.ctx;
    if (!this.nbuf) {
      this.nbuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = this.nbuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t0 = ctx.currentTime + when;
    const src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = this.nbuf; src.loop = true;
    fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t0);
    if (to) fl.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.05, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(fl).connect(g).connect(this.out || ctx.destination);
    src.start(t0); src.stop(t0 + dur + 0.05);
    this.grab(src, t0 + dur + 0.05);
  },
  // Прежний синтез: запасной вариант, пока нет файла, и звуки, которые осознанно остались синтезом
  synthElement(el, soft) {
    const r = this.voices[el];
    if (r) r((f, d, o) => this.tone(f, d, o), (d, o) => this.noise(d, o), soft ? 0.5 : 1);
  },
  synth(name) {
    const r = this.recipes[name];
    if (r) r((f, d, o) => this.tone(f, d, o));
  },
  voices: {
    fire(T, N, k) {
      N(0.6, { vol: 0.12 * k, f: 2500, to: 300 });
      [0, 0.07, 0.15, 0.22].forEach(w => N(0.05, { vol: 0.08 * k, when: w, type: 'highpass', f: 3000 }));
      T(180, 0.5, { type: 'sawtooth', vol: 0.04 * k, to: 70 });
    },
    water(T, N, k) {
      [0, 0.1, 0.18, 0.3].forEach((w, i) => T(500 + i * 120, 0.12, { vol: 0.07 * k, when: w, to: 1100 + i * 200 }));
      N(0.4, { vol: 0.04 * k, type: 'bandpass', f: 800, to: 400, q: 3 });
    },
    forest(T, N, k) {
      [392, 330, 440].forEach((f, i) => T(f, 0.25, { type: 'triangle', vol: 0.07 * k, when: i * 0.09 }));
      N(0.35, { vol: 0.05 * k, type: 'highpass', f: 4000, when: 0.05 });
    },
    wind(T, N, k) {
      N(0.8, { vol: 0.12 * k, type: 'bandpass', f: 300, to: 2400, q: 4 });
      T(900, 0.6, { vol: 0.02 * k, to: 1500 });
    },
    current(T, N, k) {
      [0, 0.06, 0.12, 0.2].forEach(w => T(1200 + Math.random() * 600, 0.05, { type: 'square', vol: 0.045 * k, when: w, to: 300 }));
      N(0.3, { vol: 0.06 * k, type: 'highpass', f: 2000, when: 0.02 });
    },
    shadow(T, N, k) {
      T(82, 0.8, { type: 'sawtooth', vol: 0.05 * k, to: 60 });
      T(85, 0.8, { type: 'sawtooth', vol: 0.05 * k, to: 58 });
      T(440, 0.6, { vol: 0.03 * k, when: 0.1, to: 110 });
    },
  },
  recipes: {
    tap: T => T(660, 0.06, { type: 'triangle', vol: 0.06 }),
    throw: T => T(300, 0.35, { type: 'sine', to: 900, vol: 0.08 }),
    hit: T => { T(180, 0.15, { type: 'square', vol: 0.06, to: 90 }); T(900, 0.2, { when: 0.05, vol: 0.05 }); },
    miss: T => T(400, 0.25, { type: 'triangle', to: 150, vol: 0.06 }),
    wobble: T => T(220, 0.12, { type: 'triangle', vol: 0.08 }),
    catch: T => [523, 659, 784, 1047].forEach((f, i) => T(f, 0.25, { type: 'triangle', when: i * 0.09, vol: 0.09 })),
    escape: T => T(500, 0.3, { type: 'sawtooth', to: 120, vol: 0.05 }),
    flee: T => T(700, 0.5, { type: 'sine', to: 2000, vol: 0.05 }),
    spin: T => [880, 1175, 1397, 1760].forEach((f, i) => T(f, 0.3, { when: i * 0.06, vol: 0.05 })),
    levelup: T => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => T(f, 0.35, { type: 'triangle', when: i * 0.1, vol: 0.08 })),
    hatch: T => [330, 440, 554, 659].forEach((f, i) => T(f, 0.3, { type: 'sine', when: i * 0.12, vol: 0.09 })),
    attack: T => T(520, 0.07, { type: 'square', vol: 0.035, to: 260 }),
    special: T => { T(120, 0.5, { type: 'sawtooth', vol: 0.07, to: 600 }); T(900, 0.4, { when: 0.2, vol: 0.05, to: 200 }); },
    hurt: T => T(140, 0.2, { type: 'square', vol: 0.06, to: 70 }),
    warn: T => { T(1000, 0.08, { type: 'square', vol: 0.04 }); T(1000, 0.08, { type: 'square', vol: 0.04, when: 0.12 }); },
    win: T => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => T(f, 0.3, { type: 'triangle', when: i * 0.12, vol: 0.08 })),
    lose: T => [392, 330, 262, 196].forEach((f, i) => T(f, 0.35, { type: 'triangle', when: i * 0.15, vol: 0.07 })),
  },
};
