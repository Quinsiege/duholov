'use strict';
/* Настройки этого устройства: звук, музыка, AR, экономия батареи, вид карты и доступность.
   Хранятся на телефоне (это не игровой прогресс), прогресс — на сервере. */

const Cfg = {
  KEY: 'duholov.settings',
  DEFAULTS: { demo: false, ar: false, sound: true, vibro: true, weather: true, music: true, musicVol: 0.6, cloud: true, eco: false,
    bigText: false, tapThrow: false, calm: null, mapTheme: 'auto', tilt3d: true },
  s: null,

  load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(this.KEY)); } catch (e) {}
    if (!s) { // до 3.0 настройки лежали в сохранении
      try { const old = JSON.parse(localStorage.getItem('duholov.save.v1')); s = old && old.settings; } catch (e) {}
    }
    this.s = Object.assign({}, this.DEFAULTS, s || {});
    if (this.s.calm == null) this.s.calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (!DEV) this.s.demo = false; // демо-режим (джойстик) — только для разработки
    return this.s;
  },
  save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.s)); } catch (e) {} },
};
Cfg.load();
