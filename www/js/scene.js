'use strict';
/* 4.4: фоны экрана входа и экрана загрузки.
   Настройки — www/scenes/scenes.json (формат — docs/scenes.md). Пока своих изображений нет — фон как во вкладках игры
   (лак с тонким узором). 4.6: фон неподвижен (без параллакса и парящих духов), над ним — светлячки.
   В спокойном режиме и при «уменьшить анимацию» светлячки замирают, в режиме экономии их нет. */

const Scene = {
  CFG: null,

  // scenes.json читается один раз; нет файла или он с ошибкой — встроенные сцены
  async config() {
    if (this.CFG) return this.CFG;
    try { const r = await fetch('scenes/scenes.json', { cache: 'no-cache' }); this.CFG = r.ok ? await r.json() : {}; }
    catch (e) { this.CFG = {}; }
    return this.CFG;
  },
  // сцена id («login», «loading»): общие настройки + первый подходящий вариант (праздник, сезон, ночь, даты)
  async pick(id) {
    const c = await this.config(), base = c[id] || {};
    const v = (Array.isArray(c.variants) ? c.variants : []).find(x => x && x[id] && this.fits(x.when || {}));
    return v ? { ...base, ...v[id] } : base;
  },
  fits(w) {
    try {
      if (w.holiday && !(Ev.hol && Ev.hol.id === w.holiday)) return false;
      if (w.season && Ev.season() !== w.season) return false;
      if (w.night != null && U.isNight() !== !!w.night) return false;
      if (w.from && w.to) { // «MM-DD», можно через Новый год: from 12-20, to 01-10
        const d = U.local(), md = (d.getUTCMonth() + 1) * 100 + d.getUTCDate(), n = s => +s.replace('-', '');
        const a = n(w.from), b = n(w.to);
        if (a <= b ? md < a || md > b : md < a && md > b) return false;
      }
    } catch (e) { return false; }
    return true;
  },
  calm() { return !!(Cfg.s.calm || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)); },

  /* ---------- экран загрузки: картинка из настроек поверх встроенного фона ---------- */
  async loading(el) {
    const s = await this.pick('loading'), list = Array.isArray(s.images) ? s.images.filter(Boolean) : [];
    if (!list.length || !el) return;
    const src = s.mode === 'daily' ? list[Math.floor(Date.now() / 86400000) % list.length] : list[Math.floor(Math.random() * list.length)];
    const img = new Image();
    img.onload = () => {
      const bg = el.querySelector('.ld-bg');
      if (!bg) return;
      bg.style.backgroundImage = `url("${encodeURI(src)}")`;
      if (s.position) bg.style.backgroundPosition = s.position;
      if (s.shade != null) el.style.setProperty('--ld-shade', U.clamp(+s.shade, 0, 1));
      bg.classList.add('on');
    };
    img.src = src;
  },

  /* ---------- экран входа: фон (картинки-слои из scenes.json или встроенный) и светлячки ---------- */
  async mount(el, id) {
    const s = await this.pick(id);
    if (!el.isConnected) return null;
    const imgs = Array.isArray(s.layers) ? s.layers.filter(l => l && l.src) : [];
    el.classList.add('scene');
    el.innerHTML = `<div class="sc-cam">${imgs.length ? imgs.map(l => this.imgLayer(l)).join('') : this.builtin()}</div>
      ${(s.particles || 'fireflies') !== 'none' && !Cfg.s.eco ? '<canvas class="sc-fx"></canvas>' : ''}<div class="sc-shade"></div>`;
    if (s.shade != null) el.style.setProperty('--sc-shade', U.clamp(+s.shade, 0, 1));
    return this.animate(el, s.particles || 'fireflies');
  },
  // слой-картинка: anim: sway | drift | float | pulse; fit: cover | contain | bottom (depth из старых настроек не используется)
  imgLayer(l) {
    const anim = ['sway', 'drift', 'float', 'pulse'].includes(l.anim) ? l.anim : '';
    const pos = l.fit === 'bottom' ? 'center bottom / 100% auto no-repeat' : l.fit === 'contain' ? 'center / contain no-repeat' : 'center / cover no-repeat';
    return `<div class="sc-l"${l.blend ? ` style="mix-blend-mode:${U.esc(l.blend)}"` : ''}><div class="sc-img ${anim ? 'sc-a-' + anim : ''}" style="background:url(&quot;${U.esc(encodeURI(l.src))}&quot;) ${pos};${l.opacity != null ? `opacity:${U.clamp(+l.opacity, 0, 1)};` : ''}"></div></div>`;
  },
  // 4.6: встроенный фон — тот же, что во вкладках игры: лак с тонким узором и мягким сиянием сверху
  builtin() { return '<div class="sc-l sc-lacq"></div>'; },

  /* ---------- светлячки ---------- */
  animate(el, particles) {
    const cv = el.querySelector('canvas.sc-fx'), fx = cv ? this.particles(cv, particles) : null;
    const st = { on: true, raf: 0 };
    const stop = () => { st.on = false; cancelAnimationFrame(st.raf); };
    if (!fx) return { stop };
    if (this.calm()) { fx(0, 0, 0); return { stop }; }
    const frame = t => {
      if (!st.on) return;
      if (!el.isConnected) { stop(); return; }
      if (!document.hidden) fx(t, 0, 0);
      st.raf = requestAnimationFrame(frame);
    };
    st.raf = requestAnimationFrame(frame);
    return { stop };
  },
  particles(cv, kind) {
    const ctx = cv.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1), N = kind === 'snow' ? 60 : 28;
    const col = kind === 'snow' ? '255,255,255' : kind === 'embers' ? '251,146,60' : '217,249,157';
    let w = 0, h = 0;
    const size = () => { w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size();
    const ps = Array.from({ length: N }, () => ({ x: Math.random(), y: 0.3 + Math.random() * 0.7, r: 1 + Math.random() * 2.2, p: Math.random() * 6.28, s: 0.3 + Math.random() * 0.7, d: 0.2 + Math.random() * 0.5 }));
    let prev = 0;
    return (t, cx, cy) => {
      const dt = prev ? Math.min(0.05, (t - prev) / 1000) : 0; prev = t;
      if (cv.clientWidth !== w || cv.clientHeight !== h) size(); // повернули телефон
      ctx.clearRect(0, 0, w, h);
      for (const q of ps) {
        if (kind === 'snow') { q.y += dt * q.s * 0.08; q.x += Math.sin(t / 1500 + q.p) * dt * 0.01; if (q.y > 1.02) { q.y = -0.02; q.x = Math.random(); } }
        else if (kind === 'embers') { q.y -= dt * q.s * 0.06; q.x += Math.sin(t / 900 + q.p) * dt * 0.02; if (q.y < 0.2) { q.y = 1.02; q.x = Math.random(); } }
        else { q.x += Math.sin(t / 2100 + q.p) * dt * 0.012 * q.s; q.y += Math.cos(t / 2700 + q.p * 1.3) * dt * 0.01 * q.s; }
        const a = kind === 'snow' ? 0.8 : 0.35 + 0.65 * Math.max(0, Math.sin(t / (700 + q.s * 900) + q.p));
        const x = q.x * w - cx * q.d * 46, y = q.y * h - cy * q.d * 30;
        const g = ctx.createRadialGradient(x, y, 0, x, y, q.r * 4);
        g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, q.r * 4, 0, 6.2832); ctx.fill();
      }
    };
  },
};
