'use strict';
/* Музыка — три мелодии-петли (www/audio, Suno, автор quinsis): «Сказочный лес» — карта днём,
   «Noche de cuentos» — карта ночью, «Мудрый старик» — сцены с наставником Велимиром.
   4.8.1: звучит фоном, как в Clash Royale — тихо, мягко (срез верхов и компрессор на общей шине);
   громкость — ползунок в настройках (Cfg.s.musicVol). Петли сведены бесшовно: конец плавно переходит в начало.
   Своей процедурной музыки больше нет: в боях и везде, кроме сцен с наставником, играет мелодия карты. */

const Music = {
  want: 'map', mode: null,
  FILES: { day: 'audio/day.mp3', night: 'audio/night.mp3', mentor: 'audio/mentor.mp3' },
  MAX: 0.35, FADE: 1.4,     // громкость при ползунке на 100% и длительность перехода, с
  tracks: {}, cur: null,

  init() {
    document.addEventListener('visibilitychange', () => this.apply());
  },
  play(mode) { this.want = mode; this.apply(); },
  // уровень из настроек: 0…1 (по умолчанию 0,6 — тихий фон)
  level() { const v = Cfg.s.musicVol; return (v == null ? 0.6 : Math.max(0, Math.min(1, +v))) * this.MAX; },
  // что должно звучать: у наставника — его мелодия, иначе — мелодия карты (днём или ночью)
  target() { return this.want === 'mentor' ? 'mentor' : document.body.classList.contains('night') ? 'night' : 'day'; },
  apply() {
    const ctx = Sfx.ctx, on = !!(Cfg.s.music && ctx && !document.hidden && !this.hold && this.level() > 0); // hold — трейлер играет свою музыку
    const mode = on ? this.target() : null;
    if (mode === this.mode) return;
    this.mode = mode;
    if (!ctx) return;
    if (mode && ctx.state === 'suspended') ctx.resume();
    for (const [k, t] of Object.entries(this.tracks)) if (k !== mode) this.fadeOut(t);
    if (mode) this.fadeIn(this.track(mode));
  },
  // ползунок в настройках: громкость меняется сразу, без перезапуска мелодии
  setVolume(v) {
    Cfg.s.musicVol = v;
    if (this.cur && this.level() > 0) this.ramp(this.cur, this.level(), 0.25);
    this.apply();
  },
  // общая шина: мягкий срез верхов и компрессор — ровный тихий фон, звуки игры поверх
  bus() {
    if (this._bus) return this._bus;
    const ctx = Sfx.ctx, lp = ctx.createBiquadFilter(), c = ctx.createDynamicsCompressor();
    lp.type = 'lowpass'; lp.frequency.value = 4200; lp.Q.value = 0.5;
    c.threshold.value = -26; c.knee.value = 18; c.ratio.value = 3.5; c.attack.value = 0.02; c.release.value = 0.4;
    lp.connect(c).connect(ctx.destination);
    return (this._bus = lp);
  },
  track(k) {
    if (this.tracks[k]) return this.tracks[k];
    const ctx = Sfx.ctx, a = new Audio(this.FILES[k]), g = ctx.createGain();
    a.loop = true; a.preload = 'auto';
    g.gain.value = 0;
    ctx.createMediaElementSource(a).connect(g).connect(this.bus());
    return (this.tracks[k] = { k, a, g });
  },
  ramp(t, v, sec) {
    const now = Sfx.ctx.currentTime, g = t.g.gain;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(v, now + sec);
  },
  fadeIn(t) {
    this.cur = t;
    const p = t.a.play();
    // автозапуск звука без касания запрещён — повторим после первого касания (main.js → Music.apply)
    if (p && p.catch) p.catch(() => { if (this.cur === t) this.mode = undefined; });
    this.ramp(t, this.level(), this.FADE);
  },
  fadeOut(t) {
    if (this.cur === t) this.cur = null;
    if (t.a.paused) return;
    this.ramp(t, 0, this.FADE);
    setTimeout(() => { if (this.cur !== t) t.a.pause(); }, this.FADE * 1000 + 100);
  },
};
