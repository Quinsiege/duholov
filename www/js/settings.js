'use strict';
/* Настройки этого устройства: звук, музыка, AR, сторона джойстика (5.1), графика и доступность.
   Хранятся на телефоне (это не игровой прогресс), прогресс — на сервере. */

const Cfg = {
  KEY: 'duholov.settings',
  DEFAULTS: { joySide: 'right', ar: false, sound: true, vibro: true, music: true, musicVol: 0.6,
    bigText: false, tapThrow: false, awake: false, res: 'auto', fps: 60 }, // 5.1.38: графика (Gfx)
  s: null,
  // «Меньше движения» — по настройке телефона (уменьшить движение); 5.1.42: своей настройки в игре больше нет
  calm() { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); },

  load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(this.KEY)); } catch (e) {}
    if (!s) { // до 3.0 настройки лежали в сохранении
      try { const old = JSON.parse(localStorage.getItem('duholov.save.v1')); s = old && old.settings; } catch (e) {}
    }
    this.s = Object.assign({}, this.DEFAULTS, s || {});
    // 5.1.42: настроек «Объёмная карта» (наклон — всегда), «Меньше движения» (по телефону — Cfg.calm), «Экономия батареи» и
    // «Охлаждение» больше нет (охлаждение из игры убрано — по просьбе владельца)
    for (const k of ['tilt3d', 'calm', 'eco', 'cool']) delete this.s[k];
    delete this.s.demo; // 5.1: демо-режима больше нет — джойстик у всех (walk.js)
    delete this.s.fog; // 5.1.6: тумана Нави больше нет
    delete this.s.cloud; // 5.1.11: в таблице Лиги — все Ловчие (настройки «Общая таблица Лиги» больше нет)
    delete this.s.weather; // 5.2: настройки «Настоящая погода» больше нет — погоду решает сервер игры
    delete this.s.mapTheme; // 5.1.26: темы карты больше нет — день и ночь по солнцу там, где стоит Ловчий
    if (this.s.joySide !== 'left') this.s.joySide = 'right'; // 5.1: сторона джойстика на карте
    if (!['auto', 'max', 720, 1080, 1440].includes(this.s.res)) this.s.res = 'auto'; // 5.1.38: разрешение графики
    if (![30, 40, 60].includes(this.s.fps)) this.s.fps = 60; // 5.1.38: частота кадров
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
  // точек холста на CSS-пиксель; cap — потолок слоя в «Авто» (у карты его нет, у домов — Bld3D.DPR, у моделей — 2,5)
  dpr(cap = Infinity) {
    const n = this.nat(), r = Cfg.s.res;
    if (r === 'max') return n;
    const want = r === 'auto' || !(+r > 0) ? n : Math.max(0.5, Math.min(n, +r / this.short()));
    return Math.min(want, cap);
  },
  // бюджет точек большого холста (дома: Bld3D.MAXPX): «Авто» — как есть, ниже родного — меньше по площади, «Макс.» — вдвое больше
  px(budget) {
    const r = Cfg.s.res;
    if (r === 'max') return budget * 2;
    if (r === 'auto' || !(+r > 0)) return budget;
    const k = Math.min(1, +r / this.native());
    return budget * k * k;
  },
  // кадров в секунду — из настройки
  fps() { return Cfg.s.fps || 60; },
  // разрешение сменилось — карта, дома и модели перерисовываются в новом
  apply() { if (typeof MapView !== 'undefined' && MapView.applyRes) MapView.applyRes(); },
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
