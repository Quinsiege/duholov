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

  /* Время игры. Сервер и телефон должны считать одинаково: «сейчас» — по часам сервера
     (U.skew — поправка телефона), «сегодня» и «ночь» — в часовом поясе игрока (U.tz, минуты к UTC). */
  skew: 0,
  tz: null,
  now() { return Date.now() + this.skew; },
  tzMin() { return this.tz != null ? this.tz : -new Date().getTimezoneOffset(); },
  // Дата, у которой getUTC*() — это местные дата и время игрока
  local(t = this.now()) { return new Date(t + this.tzMin() * 60000); },
  hour(t) { return this.local(t).getUTCHours(); },
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp: (a, b, t) => a + (b - a) * t,

  dist(lat1, lng1, lat2, lng2) {
    const R = 6371000, toR = Math.PI / 180;
    const dLat = (lat2 - lat1) * toR, dLng = (lng2 - lng1) * toR;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toR) * Math.cos(lat2 * toR) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  },
  fmtDist(m) { return m < 1000 ? `${Math.round(m)} м` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} км`; },
  fmtTime(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(s / 60), ss = s % 60;
    if (m >= 48 * 60) return `${Math.floor(m / 1440)} дн ${Math.floor(m / 60) % 24} ч`;
    return m >= 60 ? `${Math.floor(m / 60)} ч ${m % 60} мин` : `${m}:${String(ss).padStart(2, '0')}`;
  },
  plural(n, one, few, many) {
    const a = Math.abs(n) % 100, b = a % 10;
    return a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many;
  },
  fmtNum(n) { return Math.round(n).toLocaleString('ru-RU'); },
  today(t) { const d = this.local(t); return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`; },
  isNight(t) { const h = this.hour(t); return h >= 20 || h < 6; },

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

/* ---------- Синтезированный звук (без файлов) ---------- */
const Sfx = {
  ctx: null,
  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  },
  tone(freq, dur, { type = 'sine', vol = 0.12, when = 0, to = null } = {}) {
    if (!this.ctx || !Cfg.s.sound) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const t0 = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
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
    src.connect(fl).connect(g).connect(ctx.destination);
    src.start(t0); src.stop(t0 + dur + 0.05);
  },
  // Голос стихии: особые приёмы и появление духа
  element(el, soft) {
    const T = (f, d, o) => this.tone(f, d, o), N = (d, o) => this.noise(d, o), k = soft ? 0.5 : 1;
    switch (el) {
      case 'fire':
        N(0.6, { vol: 0.12 * k, f: 2500, to: 300 });
        [0, 0.07, 0.15, 0.22].forEach(w => N(0.05, { vol: 0.08 * k, when: w, type: 'highpass', f: 3000 }));
        T(180, 0.5, { type: 'sawtooth', vol: 0.04 * k, to: 70 });
        break;
      case 'water':
        [0, 0.1, 0.18, 0.3].forEach((w, i) => T(500 + i * 120, 0.12, { vol: 0.07 * k, when: w, to: 1100 + i * 200 }));
        N(0.4, { vol: 0.04 * k, type: 'bandpass', f: 800, to: 400, q: 3 });
        break;
      case 'forest':
        [392, 330, 440].forEach((f, i) => T(f, 0.25, { type: 'triangle', vol: 0.07 * k, when: i * 0.09 }));
        N(0.35, { vol: 0.05 * k, type: 'highpass', f: 4000, when: 0.05 });
        break;
      case 'wind':
        N(0.8, { vol: 0.12 * k, type: 'bandpass', f: 300, to: 2400, q: 4 });
        T(900, 0.6, { vol: 0.02 * k, to: 1500 });
        break;
      case 'current':
        [0, 0.06, 0.12, 0.2].forEach(w => T(1200 + Math.random() * 600, 0.05, { type: 'square', vol: 0.045 * k, when: w, to: 300 }));
        N(0.3, { vol: 0.06 * k, type: 'highpass', f: 2000, when: 0.02 });
        break;
      case 'shadow':
        T(82, 0.8, { type: 'sawtooth', vol: 0.05 * k, to: 60 });
        T(85, 0.8, { type: 'sawtooth', vol: 0.05 * k, to: 58 });
        T(440, 0.6, { vol: 0.03 * k, when: 0.1, to: 110 });
        break;
    }
  },
  play(name) {
    const T = (f, d, o) => this.tone(f, d, o);
    switch (name) {
      case 'tap': T(660, 0.06, { type: 'triangle', vol: 0.06 }); break;
      case 'throw': T(300, 0.35, { type: 'sine', to: 900, vol: 0.08 }); break;
      case 'hit': T(180, 0.15, { type: 'square', vol: 0.06, to: 90 }); T(900, 0.2, { when: 0.05, vol: 0.05 }); break;
      case 'miss': T(400, 0.25, { type: 'triangle', to: 150, vol: 0.06 }); break;
      case 'wobble': T(220, 0.12, { type: 'triangle', vol: 0.08 }); break;
      case 'catch': [523, 659, 784, 1047].forEach((f, i) => T(f, 0.25, { type: 'triangle', when: i * 0.09, vol: 0.09 })); break;
      case 'escape': T(500, 0.3, { type: 'sawtooth', to: 120, vol: 0.05 }); break;
      case 'flee': T(700, 0.5, { type: 'sine', to: 2000, vol: 0.05 }); break;
      case 'spin': [880, 1175, 1397, 1760].forEach((f, i) => T(f, 0.3, { when: i * 0.06, vol: 0.05 })); break;
      case 'levelup': [392, 523, 659, 784, 1047, 1319].forEach((f, i) => T(f, 0.35, { type: 'triangle', when: i * 0.1, vol: 0.08 })); break;
      case 'hatch': [330, 440, 554, 659].forEach((f, i) => T(f, 0.3, { type: 'sine', when: i * 0.12, vol: 0.09 })); break;
      case 'attack': T(520, 0.07, { type: 'square', vol: 0.035, to: 260 }); break;
      case 'special': T(120, 0.5, { type: 'sawtooth', vol: 0.07, to: 600 }); T(900, 0.4, { when: 0.2, vol: 0.05, to: 200 }); break;
      case 'hurt': T(140, 0.2, { type: 'square', vol: 0.06, to: 70 }); break;
      case 'warn': T(1000, 0.08, { type: 'square', vol: 0.04 }); T(1000, 0.08, { type: 'square', vol: 0.04, when: 0.12 }); break;
      case 'win': [523, 659, 784, 1047, 784, 1047].forEach((f, i) => T(f, 0.3, { type: 'triangle', when: i * 0.12, vol: 0.08 })); break;
      case 'lose': [392, 330, 262, 196].forEach((f, i) => T(f, 0.35, { type: 'triangle', when: i * 0.15, vol: 0.07 })); break;
    }
  },
};
