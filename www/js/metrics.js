'use strict';
/* 5.1.22: своя аналитика игры (server/035_analytics.sql) — без сторонних сервисов: события остаются на сервере игры.
   Игрок её не видит: ни строки на экране, ни ожидания; без сети и при любой ошибке — тишина (событие теряется, игра — нет).
   Телефон шлёт только своё (остальное пишет сам сервер игры — GameCore.anTrack): запуск (boot, f — первый на устройстве),
   карта готова (ready, ms — с начала загрузки страницы), шаги знакомства новичка (onb, k — шаг UI.onboarding) и сессию:
   номер, начало и сколько секунд игра была на экране (свёрнута дольше SPLIT — новая сессия). Ни имени, ни места, ни IP,
   ни User-Agent: платформу (сайт, PWA, приложение, магазин; Android, iOS, компьютер) грубо выводит сам сервер (pf).
   Отправка — пачкой (POST …/functions/v1/game/an) по таймеру и при сворачивании и закрытии игры: запрос «простой»
   (text/plain, без своих заголовков — без предварительного запроса CORS) с fetch keepalive уходит и из закрывающейся
   вкладки; вход — ключ входа игрока в теле (его проверяет сервер). Сервер ответил off (миграции ещё нет или аналитика
   выключена) — до перезапуска игры телефон молчит.
   Общая часть (имена, пределы, params, clean, pf) работает и на сервере игры (build-server.ps1): пачке он не верит. */
const Metrics = {
  /* ---------- общее: телефон и сервер ---------- */
  NAMES: ['boot', 'ready', 'onb'], // события телефона — другие сервер не примет
  MAX_EV: 40,         // событий в пачке (остальные — следующей)
  MAX_Q: 200,         // очередь без связи: старые выпадают
  MAX_BODY: 16384,    // байт в запросе
  MAX_P: 6,           // полей у события
  AGE: 3 * 86400000,  // время события — не старше трёх суток (иначе — время приёма)
  SID: /^[A-Za-z0-9_-]{8,24}$/,
  KEY: /^[a-z][a-z0-9_]{0,15}$/,
  STR: /^[\w.:-]{1,32}$/,
  VER: /^\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  // параметры события: только числа, да/нет и короткие строки из латиницы, цифр и _.:- — никакого текста игрока
  params(p) {
    if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
    const out = {};
    let n = 0;
    for (const k of Object.keys(p)) {
      if (n >= this.MAX_P) break;
      const v = p[k];
      if (!this.KEY.test(k)) continue;
      if (typeof v === 'number' && Number.isFinite(v)) out[k] = Math.max(-1e9, Math.min(1e9, Math.round(v)));
      else if (typeof v === 'boolean') out[k] = v ? 1 : 0;
      else if (typeof v === 'string' && this.STR.test(v)) out[k] = v;
      else continue;
      n++;
    }
    return n ? out : null;
  },
  // пачка телефона → { v, sa, s, ev } или null (записывать нечего). Время — от телефона, но не старше AGE и не из будущего
  clean(b, now = Date.now()) {
    if (!b || typeof b !== 'object' || Array.isArray(b)) return null;
    const t = x => (typeof x === 'number' && x > now - this.AGE && x < now + 300000 ? Math.round(Math.min(x, now)) : now);
    const ev = [];
    for (const e of Array.isArray(b.ev) ? b.ev.slice(0, this.MAX_EV) : []) {
      if (!e || typeof e !== 'object' || !this.NAMES.includes(e.e)) continue;
      const row = { e: e.e, t: t(e.t) }, p = this.params(e.p);
      if (p) row.p = p;
      if (typeof e.s === 'string' && this.SID.test(e.s)) row.s = e.s;
      ev.push(row);
    }
    const s = b.s && typeof b.s === 'object' && typeof b.s.id === 'string' && this.SID.test(b.s.id)
      ? { id: b.s.id, t0: t(b.s.t0), d: Math.max(0, Math.min(86400, Math.round(+b.s.d) || 0)) } : null;
    if (!ev.length && !s) return null;
    return { v: typeof b.v === 'string' && this.VER.test(b.v) ? b.v : '', sa: b.sa === 1 || b.sa === true, s, ev };
  },
  // платформа по User-Agent — грубо (сам UA не хранится): канал (сайт, PWA, приложение с сайта, Google Play, RuStore) и система
  pf(ua, sa) {
    ua = String(ua || '');
    const ch = /store=play\b/.test(ua) ? 'play' : /store=rustore\b/.test(ua) ? 'rustore' : /DuholovApp\//.test(ua) ? 'apk' : sa ? 'pwa' : 'web';
    const os = /Android/i.test(ua) ? 'android' : /iPhone|iPad|iPod/i.test(ua) ? 'ios' : /Windows|Macintosh|Mac OS X|Linux|CrOS/i.test(ua) ? 'desktop' : 'other';
    return ch + '-' + os;
  },

  /* ---------- телефон ---------- */
  URL: '/functions/v1/game/an',
  EVERY: 30000,         // раз в 30 с — не пора ли отправить (пока игра на экране)
  SPLIT: 30 * 60000,    // свёрнута дольше — новая сессия
  FIRST: 'duholov.an1', // отметка «игру на этом устройстве уже запускали»
  q: [], sid: '', t0: 0, act: 0, vis: 0, hidAt: 0, sent: -1, tok: '', off: false, started: false,
  on() { return !this.off && typeof Cloud !== 'undefined' && Cloud.configured(); }, // автотесты (webdriver) — без аналитики
  clock() { return performance.now(); },                                        // время на экране — монотонные часы
  wall() { return Date.now(); },                                                // пауза — по настенным (монотонные во сне стоят)
  now() { return typeof U !== 'undefined' ? U.now() : Date.now(); },            // время событий — по серверу (U.skew)
  rid() { const a = new Uint8Array(9); crypto.getRandomValues(a); return btoa(String.fromCharCode(...a)).replace(/\+/g, '-').replace(/\//g, '_'); },
  standalone() { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } },
  // запуск игры (main.js): сессия, событие boot, сворачивание и закрытие, проверка очереди по таймеру
  init() {
    try {
      if (this.started || !this.on()) return;
      this.start();
      let f = 0;
      try { if (!localStorage.getItem(this.FIRST)) { localStorage.setItem(this.FIRST, '1'); f = 1; } } catch (e) { /* без хранилища — не знаем */ }
      this.ev('boot', f ? { f } : null);
      document.addEventListener('visibilitychange', () => (document.hidden ? this.hide() : this.show()));
      addEventListener('pagehide', () => this.hide());
      addEventListener('pageshow', () => this.show());
      setInterval(() => { if (!document.hidden) this.tick(); }, this.EVERY);
    } catch (e) { /* аналитика не мешает игре */ }
  },
  start() { this.started = true; this.off = false; this.q = []; this.tok = ''; this.session(); },
  session() { this.sid = this.rid(); this.t0 = Math.round(this.now()); this.act = 0; this.vis = this.clock(); this.hidAt = 0; this.sent = -1; },
  // секунд на экране в этой сессии
  dur() { return Math.max(0, Math.min(86400, Math.round((this.act + (this.vis ? this.clock() - this.vis : 0)) / 1000))); },
  ev(e, p) {
    try {
      if (!this.started || !this.NAMES.includes(e)) return;
      if (this.q.length >= this.MAX_Q) this.q.shift();
      const row = { e, t: Math.round(this.now()), s: this.sid }, pp = this.params(p);
      if (pp) row.p = pp;
      this.q.push(row);
    } catch (x) { /* аналитика не мешает игре */ }
  },
  // игру свернули или закрывают: время на экране — в копилку сессии, пачка — сейчас же (keepalive)
  hide() {
    try {
      if (!this.started) return;
      if (this.vis) { this.act += this.clock() - this.vis; this.vis = 0; this.hidAt = this.wall(); }
      this.flush(true);
    } catch (e) { /* молча */ }
  },
  // вернулись: после паузы дольше SPLIT — новая сессия
  show() {
    try {
      if (!this.started || this.vis) return;
      if (this.hidAt && this.wall() - this.hidAt > this.SPLIT) this.session(); else this.vis = this.clock();
      this.token();
    } catch (e) { /* молча */ }
  },
  // пора ли отправить: события ждут дольше 10 с (или их много) либо сессия заметно выросла — в начале чаще: короткие
  // сессии новичков видны точнее, долгие — реже нагружают сервер
  due() {
    const d = this.dur(), step = d < 300 ? 30 : d < 1800 ? 120 : 300;
    return this.q.length >= this.MAX_EV || (this.q.length > 0 && this.now() - this.q[0].t >= 10000) || this.sent < 0 || d - this.sent >= step;
  },
  async tick() { try { await this.token(); if (this.due()) this.flush(false); } catch (e) { /* молча */ } },
  // ключ входа — из облачной библиотеки, если игра уже вошла (Cloud.client); сама аналитика вход не начинает
  async token() {
    try {
      const sb = typeof Cloud !== 'undefined' ? Cloud.sb : null;
      if (!sb) return;
      const { data } = await sb.auth.getSession();
      this.tok = (data && data.session && data.session.access_token) || '';
    } catch (e) { /* молча */ }
  },
  // отправить пачку: final — игру сворачивают или закрывают (ответа можно не дождаться)
  flush(final) {
    try {
      if (!this.started || !this.on() || !this.tok) return false;
      const d = this.dur();
      if (!this.q.length && d === this.sent) return false;
      const n = Math.min(this.q.length, this.MAX_EV);
      const pack = ev => JSON.stringify({ tok: this.tok, v: APP_VERSION, sa: this.standalone() ? 1 : 0, s: { id: this.sid, t0: this.t0, d }, ev });
      let ev = this.q.slice(0, n), body = pack(ev);
      if (body.length > this.MAX_BODY) { ev = []; body = pack(ev); } // не влезло — события пропадают, сессия — нет
      this.q.splice(0, n);
      this.sent = d;
      this.send(body, final, ev);
      return true;
    } catch (e) { return false; }
  },
  send(body, final, ev) {
    fetch(CLOUD_CONFIG.url + this.URL, { method: 'POST', keepalive: true, credentials: 'omit', headers: { 'Content-Type': 'text/plain' }, body })
      .then(r => (r.ok ? r.json() : null), () => { if (!final) this.back(ev); return null; })
      .then(j => { if (j && j.off) this.off = true; })
      .catch(() => {});
  },
  // запрос не ушёл (нет связи) — события обратно в очередь (не больше MAX_Q), сессия обновится следующей пачкой
  back(ev) { this.q.unshift(...(ev || []).slice(0, Math.max(0, this.MAX_Q - this.q.length))); this.sent = -1; },
};
