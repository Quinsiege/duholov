'use strict';
/* Настройки этого устройства: звук, музыка, AR, экономия батареи, вид карты, сторона джойстика (5.1) и доступность.
   Хранятся на телефоне (это не игровой прогресс), прогресс — на сервере. */

const Cfg = {
  KEY: 'duholov.settings',
  DEFAULTS: { joySide: 'right', ar: false, sound: true, vibro: true, music: true, musicVol: 0.6, eco: false,
    bigText: false, tapThrow: false, calm: null, tilt3d: true, awake: false, res: 'auto', fps: 60, // 5.1.38: графика (Gfx)
    cool: true }, // 5.1.40: охлаждение (Heat)
  s: null,

  load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(this.KEY)); } catch (e) {}
    if (!s) { // до 3.0 настройки лежали в сохранении
      try { const old = JSON.parse(localStorage.getItem('duholov.save.v1')); s = old && old.settings; } catch (e) {}
    }
    this.s = Object.assign({}, this.DEFAULTS, s || {});
    if (this.s.calm == null) this.s.calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    delete this.s.demo; // 5.1: демо-режима больше нет — джойстик у всех (walk.js)
    delete this.s.fog; // 5.1.6: тумана Нави больше нет
    delete this.s.cloud; // 5.1.11: в таблице Лиги — все Ловчие (настройки «Общая таблица Лиги» больше нет)
    delete this.s.weather; // 5.2: настройки «Настоящая погода» больше нет — погоду решает сервер игры
    delete this.s.mapTheme; // 5.1.26: темы карты больше нет — день и ночь по солнцу там, где стоит Ловчий
    if (this.s.joySide !== 'left') this.s.joySide = 'right'; // 5.1: сторона джойстика на карте
    if (!['auto', 'max', 720, 1080, 1440].includes(this.s.res)) this.s.res = 'auto'; // 5.1.38: разрешение графики
    if (![30, 40, 60].includes(this.s.fps)) this.s.fps = 60; // 5.1.38: частота кадров
    if (typeof this.s.cool !== 'boolean') this.s.cool = true; // 5.1.40: охлаждение
    return this.s;
  },
  save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.s)); } catch (e) {} },
};
Cfg.load();

/* 5.1.38: графика (Настройки → Графика).
   Разрешение — у холстов игры: карта (плитки и подписи Protomaps), объёмные дома (Bld3D), 3D-модели мест и Ловчего (M3D),
   погода (Scene); меню и окна браузер всегда рисует в родном разрешении экрана. Cfg.s.res:
   'auto' — как подобрала игра: карта — в родном разрешении, у домов и моделей — свои потолки ради скорости (dpr(cap));
   720 / 1080 / 1440 — по короткой стороне экрана в точках (720p — 720 точек по ширине телефона), и не выше потолков «Авто»:
   ниже родного — легче, чем «Авто»; 'max' — родное разрешение телефона везде, без потолков (у домов — только предел холста
   по точкам, Bld3D.MAXPX). Выше родного разрешения телефона не бывает: такие ступени не показываются (options).
   Частота кадров (Cfg.s.fps: 30 / 40 / 60): все циклы кадров игры — ходьба, камера, дома, модели, бои, поимка, погода — идут
   через requestAnimationFrame, а он подменён ограничителем (installFps): лишние кадры браузера пропускаются, экраны 90 и 120 Гц
   тоже — не чаще выбранного. Leaflet и Protomaps загружены раньше и держат свой requestAnimationFrame — их короткие анимации
   масштаба не ограничиваются. */
const Gfx = {
  RES: [720, 1080, 1440],
  FPS: [30, 40, 60],
  nat() { return window.devicePixelRatio || 1; },
  // короткая сторона экрана в CSS-пикселях (игра — только вертикально)
  short() { const a = screen.width || 0, b = screen.height || 0, s = a && b ? Math.min(a, b) : Math.min(innerWidth || 0, innerHeight || 0); return s > 0 ? s : 360; },
  // родное разрешение: 1080 у экрана 1080 × 2400 (393 × 2,75 = 1080,75 — тоже 1080: близкое к обычному — обычное)
  native() { const n = Math.round(this.short() * this.nat()); return [720, 1080, 1440, 2160].find(x => Math.abs(n - x) <= x * 0.01) || n; },
  options() { const n = this.native(); return ['auto', ...this.RES.filter(r => r < n - 8), 'max']; },
  label(k) { return k === 'auto' ? ru`Авто` : k === 'max' ? ru`Макс.` : k + 'p'; },
  // точек холста на CSS-пиксель; cap — потолок слоя в «Авто» (у карты его нет, у домов — Bld3D.DPR, у моделей — 2,5).
  // 5.1.40: телефон нагрелся — не выше потолка охлаждения (Heat.res — точек по короткой стороне, бывает и ниже 720p)
  dpr(cap = Infinity) {
    const n = this.nat(), r = Cfg.s.res, h = Heat.res();
    let d = r === 'max' ? n : Math.min(r === 'auto' || !(+r > 0) ? n : Math.max(0.5, Math.min(n, +r / this.short())), cap);
    if (h) d = Math.min(d, Math.max(0.5, h / this.short()));
    return d;
  },
  // бюджет точек большого холста (дома: Bld3D.MAXPX): «Авто» — как есть, ниже родного — меньше по площади, «Макс.» — вдвое больше
  px(budget) {
    const r = Cfg.s.res, h = Heat.res();
    let k = r === 'max' ? 2 : r === 'auto' || !(+r > 0) ? 1 : Math.min(1, +r / this.native()) ** 2;
    if (h) k = Math.min(k, (h / this.native()) ** 2); // 5.1.40: охлаждение
    return budget * k;
  },
  // кадров в секунду: из настройки, а при нагреве — не больше ступени охлаждения (5.1.40)
  fps() { return Math.min(Cfg.s.fps || 60, Heat.fps() || 60); },
  // «Экономия батареи»: включена игроком или охлаждением (5.1.40)
  eco() { return !!Cfg.s.eco || Heat.eco(); },
  // разрешение сменилось — карта, дома и модели перерисовываются в новом (Heat._d — в каком разрешении нарисованы)
  apply() { Heat._d = this.dpr(); if (typeof MapView !== 'undefined' && MapView.applyRes) MapView.applyRes(); },
  // ограничитель кадров: не чаще Cfg.s.fps кадров в секунду; шаг — ровный в среднем (40 к/с на экране 60 Гц — кадр через раз
  // и подряд), опоздавший кадр не копит долг
  _raf: 0, _last: 0,
  installFps() {
    if (window.__gfxRaf || typeof window.requestAnimationFrame !== 'function') return;
    window.__gfxRaf = true;
    const native = window.requestAnimationFrame.bind(window), q = new Map();
    let id = 0;
    const frame = t => {
      this._raf = 0;
      const iv = 1000 / this.fps();
      if (this._last && t - this._last < iv - 5) { this._raf = native(frame); return; } // рано — ждём следующего кадра браузера
      this._last = this._last && t - this._last < iv * 2 ? this._last + iv : t;
      const run = [...q.values()]; q.clear();
      for (const cb of run) { try { cb(t); } catch (e) { setTimeout(() => { throw e; }); } } // ошибка одного — не мешает остальным
    };
    window.requestAnimationFrame = cb => { const k = ++id; q.set(k, cb); if (!this._raf) this._raf = native(frame); return k; };
    window.cancelAnimationFrame = k => { q.delete(k); };
  },
};
Gfx.installFps();

/* 5.1.40: Охлаждение (Настройки → Графика, Cfg.s.cool; по умолчанию включено). Чтобы телефон не грелся выше MAX (40°), с START
   (39°) игра ступенями (STEPS) снижает частоту кадров и разрешение — до LOW (360p), с 3-й ступени включает «Экономию батареи»;
   следующая ступень — не раньше чем через UP мс (в сильный нагрев — URGENT), а остыв до BACK, игра возвращает по ступени раз в DOWN мс.
   Температура — у приложения (DuholovNative.thermal, обёртка 16+): батарея, °C; оценка нагрева Android 10+ (0 — нет … 6 —
   отключение, «умеренная» 2 и выше — горячо) и запас до троттлинга через 10 с Android 11+ (1 — порог). На сайте температуры нет —
   только «давление» процессора (Compute Pressure API), где браузер его даёт: serious и critical — горячо */
const Heat = {
  MAX: 40, START: 39, BACK: 37, LOW: 360,
  STEPS: [null, { fps: 40, res: 1080 }, { fps: 30, res: 720 }, { fps: 30, res: 540, eco: true }, { fps: 24, res: 432, eco: true }, { fps: 20, res: 360, eco: true }],
  POLL: 10000, UP: 60000, URGENT: 30000, DOWN: 180000,
  level: 0, at: 0, t: null, s: -1, h: NaN, p: '', onChange: null,
  step() { return Cfg.s.cool ? this.STEPS[this.level] : null; },
  fps() { const s = this.step(); return s ? s.fps : 0; },
  res() { const s = this.step(); return s ? s.res : 0; },
  eco() { const s = this.step(); return !!(s && s.eco); },
  // датчики приложения; старая обёртка (без thermal) или ошибка — без них
  read() {
    const N = window.DuholovNative;
    if (!N || typeof N.thermal !== 'function') return;
    try {
      const o = JSON.parse(N.thermal() || '{}');
      this.t = Number.isFinite(+o.t) && +o.t > 0 ? +o.t : null;
      this.s = Number.isFinite(+o.s) ? +o.s : -1;
      this.h = Number.isFinite(+o.h) ? +o.h : NaN;
    } catch (e) { /* старая обёртка */ }
  },
  // игре известен нагрев: температура, оценка Android или давление процессора
  known() { return this.t != null || this.s >= 0 || !!this.p; },
  // строка в настройках: температура и что сейчас с графикой
  line() {
    const g = this.step() ? ru`снижено до ${Math.round(Gfx.dpr() * Gfx.short())}p и ${Gfx.fps()} к/с` : ru`графика как в настройках`;
    if (this.t != null) return ru`Сейчас ${Math.round(this.t)}°` + ' · ' + g;
    return this.known() ? g : ru`Температура телефона видна игре только в приложении для Android.`;
  },
  // игрок включил или выключил охлаждение: выключил — графика как в настройках, ступени — заново с нуля
  toggle() {
    const was = Cfg.s.cool ? null : this.STEPS[this.level];
    if (!Cfg.s.cool) this.level = 0;
    this.changed(was);
  },
  // раз в POLL, пока игра на экране и охлаждение включено: горячо — ступень ниже по графике, остыл — назад
  tick(now = Date.now()) {
    if (document.hidden || !Cfg.s.cool) return;
    this.read();
    const hot = this.t >= this.START || this.s >= 2 || this.h >= 0.95 || this.p === 'serious' || this.p === 'critical';
    const urgent = this.t >= this.MAX + 1 || this.s >= 3 || this.p === 'critical';
    const cool = !(this.t > this.BACK) && this.s <= 1 && !(this.h >= 0.8) && this.p !== 'serious' && this.p !== 'critical';
    const since = now - this.at;
    if (hot && this.level < this.STEPS.length - 1 && since >= (urgent ? this.URGENT : this.UP)) this.set(this.level + 1, now);
    else if (cool && this.level > 0 && since >= this.DOWN) this.set(this.level - 1, now);
  },
  set(level, now = Date.now()) {
    const was = this.step();
    this.level = level; this.at = now;
    this.changed(was);
    if (!was && this.step() && typeof UI !== 'undefined' && UI.toast) UI.toast(ru`Телефон нагрелся — графика снижена, пока он не остынет`);
  },
  // ступень сменилась или охлаждение выключили (was — прежняя ступень): кадры Gfx берёт сам; разрешение карты изменилось больше
  // чем на 1% (у экрана 1080p потолок 1080p — нет) — перерисовать холсты (под сценой боя или поимки — когда она закроется);
  // экономия — класс страницы
  changed(was) {
    const now = this.step(), d = Gfx.dpr();
    if (this._d == null) this._d = d;
    if (Math.abs(d - this._d) > this._d * 0.01) {
      if (typeof Stage !== 'undefined' && Stage.busy) {
        if (!this._hook) { this._hook = true; Stage.on(busy => { if (!busy && this._wait) { this._wait = false; Gfx.apply(); } }); }
        this._wait = true;
      } else Gfx.apply();
    }
    if (!!(was && was.eco) !== !!(now && now.eco) && document.body) document.body.classList.toggle('eco', Gfx.eco());
    if (this.onChange) this.onChange();
  },
  init() {
    if (this._iv) return;
    this._d = Gfx.dpr();
    this._iv = setInterval(() => this.tick(), this.POLL);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(() => this.tick(), 1000); });
    if ('PressureObserver' in window) {
      try { new PressureObserver(recs => { const r = recs[recs.length - 1]; if (r) this.p = r.state; }).observe('cpu', { sampleInterval: 2000 }).catch(() => {}); } catch (e) { /* браузер не дал */ }
    }
    setTimeout(() => this.tick(), 3000);
  },
};
Heat.init();

/* 4.21.1: «Не гасить экран» — по желанию игрока (приложение до версии 5 держало экран включённым всегда — телефон грелся).
   В приложении 5+ — через обёртку (DuholovNative), на сайте — Screen Wake Lock; свёрнутая игра экран не держит. */
const Awake = {
  lock: null,
  async apply() {
    const on = !!Cfg.s.awake && !document.hidden;
    if (window.DuholovNative && DuholovNative.keepScreenOn) { try { DuholovNative.keepScreenOn(on); } catch (e) { /* старая обёртка */ } return; }
    if (on && !this.lock && navigator.wakeLock) {
      try { this.lock = await navigator.wakeLock.request('screen'); this.lock.addEventListener('release', () => { this.lock = null; }); } catch (e) { /* браузер не дал */ }
    }
    if (!on && this.lock) { const l = this.lock; this.lock = null; l.release().catch(() => {}); }
  },
};
document.addEventListener('visibilitychange', () => Awake.apply());
Awake.apply();
