'use strict';
/* Процедурная музыка на WebAudio: на карте — спокойные «гусли» в ре миноре с эхом,
   в битвах — ритм с басом и ударными. Никаких аудиофайлов. */

const Music = {
  want: 'map', mode: null, timer: null, next: 0, step: 0, out: null, noiseBuf: null,
  CHORDS: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 48, 52]], // Dm – B♭ – C – Am
  MELODY: [62, 65, 67, 69, 72, 74, 77, 79, 81],                       // ре-минорная пентатоника

  init() {
    document.addEventListener('visibilitychange', () => this.apply());
  },
  play(mode) { this.want = mode; this.apply(); },
  apply() {
    const ctx = Sfx.ctx;
    const on = !!(S.d && Cfg.s.music && ctx && !document.hidden);
    const mode = on ? this.want : null;
    if (mode === this.mode) return;
    clearInterval(this.timer); this.timer = null;
    this.mode = mode;
    if (!ctx) return;
    this.graph();
    const now = ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setTargetAtTime(mode ? (mode === 'battle' ? 0.55 : 0.5) : 0, now, mode ? 0.8 : 0.2);
    if (!mode) return;
    if (ctx.state === 'suspended') ctx.resume();
    this.next = now + 0.15; this.step = 0;
    this.timer = setInterval(() => this.schedule(), 60);
  },
  graph() {
    if (this.out) return;
    const ctx = Sfx.ctx;
    this.out = ctx.createGain(); this.out.gain.value = 0;
    this.out.connect(ctx.destination);
    // эхо для «гуслей»
    this.echo = ctx.createDelay(1); this.echo.delayTime.value = 0.34;
    const fb = ctx.createGain(); fb.gain.value = 0.35;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    this.echo.connect(lp).connect(fb).connect(this.echo);
    lp.connect(this.out);
    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  },
  schedule() {
    const ctx = Sfx.ctx;
    if (!ctx || !this.mode) return;
    const battle = this.mode === 'battle';
    const dur = battle ? 60 / 132 / 2 : 60 / 68 / 2; // восьмые
    while (this.next < ctx.currentTime + 0.3) {
      this.tick(this.step, this.next, dur, battle);
      this.next += dur; this.step++;
    }
  },
  tick(step, t, dur, battle) {
    const bar = Math.floor(step / 8), beat = step % 8;
    const chord = this.CHORDS[Math.floor(bar / (battle ? 1 : 2)) % 4];
    const mel = () => {
      const pool = this.MELODY.filter(n => chord.some(c => (n - c) % 12 === 0) || Math.random() < 0.4);
      return pool[Math.floor(Math.random() * pool.length)];
    };
    if (!battle) {
      if (step % 16 === 0) { chord.forEach(n => this.pad(n, t, dur * 16, 0.028)); this.bass(chord[0] - 12, t, dur * 14, 0.05, 'sine'); }
      if (beat % 2 === 0 && Math.random() < 0.33) this.pluck(mel(), t, 0.05);
      else if (Math.random() < 0.06) this.pluck(mel() + 12, t, 0.025);
    } else {
      if (step % 8 === 0) chord.forEach(n => this.pad(n, t, dur * 8, 0.018));
      this.bass(chord[0] - 12 + (beat === 7 ? 7 : 0), t, dur * 0.9, 0.045, 'sawtooth');
      if (beat === 0 || beat === 4) this.kick(t);
      if (beat === 2 || beat === 6) this.noise(t, 1800, 0.05, 0.12);
      if (beat % 2 === 1) this.noise(t, 7000, 0.02, 0.04);
      if (Math.random() < 0.4) this.pluck(mel(), t, 0.04);
    }
  },

  hz: m => 440 * Math.pow(2, (m - 69) / 12),
  env(g, t, a, len, vol) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  },
  pad(m, t, len, vol) {
    const ctx = Sfx.ctx, g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 900;
    [0, 7].forEach(det => {
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = this.hz(m); o.detune.value = det;
      o.connect(f); o.start(t); o.stop(t + len + 0.1);
    });
    this.env(g, t, Math.min(1.5, len / 3), len, vol);
    f.connect(g).connect(this.out);
  },
  pluck(m, t, vol) {
    const ctx = Sfx.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = this.hz(m);
    this.env(g, t, 0.005, 0.9, vol);
    o.connect(g); g.connect(this.out); g.connect(this.echo);
    o.start(t); o.stop(t + 1);
  },
  bass(m, t, len, vol, type) {
    const ctx = Sfx.ctx, o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = type; o.frequency.value = this.hz(m);
    f.type = 'lowpass'; f.frequency.value = 400;
    this.env(g, t, 0.02, len, vol);
    o.connect(f).connect(g).connect(this.out);
    o.start(t); o.stop(t + len + 0.05);
  },
  kick(t) {
    const ctx = Sfx.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.15);
    this.env(g, t, 0.005, 0.25, 0.14);
    o.connect(g).connect(this.out); o.start(t); o.stop(t + 0.3);
  },
  noise(t, freq, len, vol) {
    const ctx = Sfx.ctx, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this.noiseBuf; f.type = 'highpass'; f.frequency.value = freq;
    this.env(g, t, 0.003, len, vol);
    s.connect(f).connect(g).connect(this.out); s.start(t); s.stop(t + len + 0.02);
  },
};
