'use strict';
/* 4.4: фоновые сцены экрана входа и экрана загрузки.
   Настройки — www/scenes/scenes.json (формат — docs/scenes.md). Пока своих изображений нет, рисуется встроенная сцена:
   ночное небо с луной, холмы, еловый лес, туман, парящие духи, светлячки.
   Экран входа — «3D»: слои на разной глубине сдвигаются от наклона телефона (гироскоп) или мыши, без движения камера
   медленно «дышит». В спокойном режиме и при «уменьшить анимацию» сцена неподвижна, в режиме экономии — без частиц. */

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

  /* ---------- экран входа: слои с глубиной ---------- */
  // el — контейнер во весь экран; opts.spirits — какие духи парят (например, команда вернувшегося Ловчего)
  async mount(el, id, opts = {}) {
    const s = await this.pick(id);
    if (!el.isConnected) return null;
    const imgs = Array.isArray(s.layers) ? s.layers.filter(l => l && l.src) : [];
    const spirits = s.spirits === false ? [] : (Array.isArray(s.spirits) ? s.spirits : opts.spirits || ['kapelka', 'domovoy', 'fonarnik', 'leshachok']).filter(x => SP[x]).slice(0, 5);
    el.classList.add('scene');
    el.innerHTML = `<div class="sc-cam">${imgs.length ? imgs.map(l => this.imgLayer(l)).join('') : this.builtin()}
      ${spirits.length ? this.spiritsLayer(spirits) : ''}</div>
      ${(s.particles || 'fireflies') !== 'none' && !Cfg.s.eco ? '<canvas class="sc-fx"></canvas>' : ''}<div class="sc-shade"></div>`;
    if (s.shade != null) el.style.setProperty('--sc-shade', U.clamp(+s.shade, 0, 1));
    return this.animate(el, s.particles || 'fireflies');
  },
  // слой-картинка: depth 0 (даль) … 1 (передний план); anim: sway | drift | float | pulse; fit: cover | contain | bottom
  imgLayer(l) {
    const d = U.clamp(+l.depth || 0, 0, 1), anim = ['sway', 'drift', 'float', 'pulse'].includes(l.anim) ? l.anim : '';
    const pos = l.fit === 'bottom' ? 'center bottom / 100% auto no-repeat' : l.fit === 'contain' ? 'center / contain no-repeat' : 'center / cover no-repeat';
    // сдвиг от наклона — у слоя, своя анимация — у картинки внутри (иначе анимация CSS перебила бы сдвиг)
    return `<div class="sc-l" data-d="${d}"${l.blend ? ` style="mix-blend-mode:${U.esc(l.blend)}"` : ''}><div class="sc-img ${anim ? 'sc-a-' + anim : ''}" style="background:url(&quot;${U.esc(encodeURI(l.src))}&quot;) ${pos};${l.opacity != null ? `opacity:${U.clamp(+l.opacity, 0, 1)};` : ''}"></div></div>`;
  },
  spiritsLayer(ids) {
    const at = [[18, 33, 70], [80, 31, 84], [50, 41, 108], [27, 49, 60], [74, 50, 66]]; // x %, y %, размер px
    return `<div class="sc-l sc-sp-l" data-d="0.3">${ids.map((id, i) => {
      const [x, y, s] = at[i];
      return `<div class="sc-sp" style="left:${x}%;top:${y}%;width:${s}px;height:${s}px;margin:-${s / 2}px;animation-delay:${-i * 0.9}s">${Art.spirit(id)}</div>`;
    }).join('')}</div>`;
  },

  // встроенная сцена: небо, луна, звёзды → холмы → лес → туман → передний план
  builtin() {
    const r = U.rng('duholov-scene'), W = 600, H = 900, f = n => n.toFixed(1);
    const stars = Array.from({ length: 90 }, () => `<circle cx="${f(r() * W)}" cy="${f(r() * H * 0.55)}" r="${f(0.4 + r() * r() * 1.6)}" class="tw${1 + Math.floor(r() * 3)}"/>`).join('');
    const hills = (base, amp, seed) => {
      const q = U.rng(seed); let d = `M-40 ${base}`;
      for (let x = -40; x <= W + 40; x += 80) d += ` Q${x + 40} ${f(base - amp * (0.4 + q()))} ${x + 80} ${f(base - amp * 0.25 * q())}`;
      return d + ` V${H} H-40Z`;
    };
    const pines = (base, hMin, hMax, step, seed, edge) => {
      const q = U.rng(seed); let d = '';
      for (let x = -30; x < W + 30; x += step * (0.6 + q() * 0.8)) {
        const e = edge ? Math.max(0, 1 - Math.min(x, W - x) / (W * 0.3)) : 1; // по краям — выше (кадр)
        if (edge && e <= 0) continue;
        const h = (hMin + q() * (hMax - hMin)) * (edge ? 0.4 + e : 1), w = h * (0.22 + q() * 0.08), y = base + q() * 10;
        for (let t = 0; t < 3; t++) { const ty = y - h * t * 0.28, tw = w * (1 - t * 0.22); d += `M${f(x - tw)} ${f(ty)}L${f(x)} ${f(ty - h * 0.46)}L${f(x + tw)} ${f(ty)}Z`; }
        d += `M${f(x - 2)} ${f(y)}h4v14h-4Z`;
      }
      return d;
    };
    const svg = (cls, d, body) => `<div class="sc-l ${cls}" data-d="${d}"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${body}</svg></div>`;
    return `<div class="sc-l sc-sky" data-d="0.02"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs><radialGradient id="scMoon" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fffbeb"/><stop offset=".6" stop-color="#fde68a"/><stop offset="1" stop-color="#d6a84a"/></radialGradient>
          <radialGradient id="scHalo"><stop offset="0" stop-color="#fde68a" stop-opacity=".35"/><stop offset="1" stop-color="#fde68a" stop-opacity="0"/></radialGradient></defs>
        <g class="sc-stars">${stars}</g>
        <g class="sc-moon"><circle cx="478" cy="92" r="96" fill="url(#scHalo)"/><circle cx="478" cy="92" r="26" fill="url(#scMoon)"/>
          <circle cx="469" cy="84" r="5" fill="#e4c67a" opacity=".5"/><circle cx="487" cy="100" r="3" fill="#e4c67a" opacity=".45"/></g></svg></div>
      ${svg('sc-hills', 0.08, `<path d="${hills(470, 90, 'h1')}" fill="#2b1656"/><path d="${hills(520, 60, 'h2')}" fill="#211046"/>`)}
      ${svg('sc-forest', 0.16, `<path d="${pines(560, 50, 110, 16, 'f1')}" fill="#170b31"/><path d="${hills(570, 20, 'h3')}" fill="#170b31"/>`)}
      <div class="sc-l sc-mist" data-d="0.22"><i></i><i></i><i></i></div>
      ${svg('sc-near', 0.5, `<path d="${pines(900, 380, 640, 30, 'n1', true)}" fill="#0a0518"/><path d="${hills(845, 30, 'h4')}" fill="#0a0518"/>`)}`;
  },

  /* ---------- движение: наклон телефона, мышь, «дыхание» камеры, частицы ---------- */
  animate(el, particles) {
    const calm = this.calm(), layers = [...el.querySelectorAll('[data-d]')].map(n => ({ n, d: +n.dataset.d }));
    const cam = el.querySelector('.sc-cam'), cv = el.querySelector('canvas.sc-fx');
    const st = { x: 0, y: 0, tx: 0, ty: 0, last: 0, base: null, raf: 0, on: true };
    const now = () => performance.now();
    const onOri = e => {
      if (e.beta == null || e.gamma == null) return;
      if (!st.base) st.base = { b: e.beta, g: e.gamma };
      st.tx = U.clamp((e.gamma - st.base.g) / 18, -1, 1); st.ty = U.clamp((e.beta - st.base.b) / 18, -1, 1); st.last = now();
    };
    const onMove = e => { st.tx = U.clamp(e.clientX / innerWidth * 2 - 1, -1, 1); st.ty = U.clamp(e.clientY / innerHeight * 2 - 1, -1, 1); st.last = now(); };
    // iOS спрашивает разрешение на гироскоп только по касанию
    const ask = () => { try { if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) DeviceOrientationEvent.requestPermission().catch(() => {}); } catch (e) {} };
    if (!calm) {
      addEventListener('deviceorientation', onOri);
      addEventListener('pointermove', onMove);
      el.parentNode && el.parentNode.addEventListener('pointerdown', ask, { once: true });
    }
    // частицы: светлячки (по умолчанию), снег, искры
    const fx = cv ? this.particles(cv, particles) : null;
    const frame = t => {
      if (!st.on) return;
      if (!el.isConnected) { stop(); return; }
      if (!document.hidden) {
        if (t - st.last > 2500) { st.tx = Math.sin(t / 5200) * 0.35; st.ty = Math.cos(t / 7300) * 0.22; } // никто не трогает — камера «дышит»
        st.x += (st.tx - st.x) * 0.05; st.y += (st.ty - st.y) * 0.05;
        for (const l of layers) l.n.style.transform = `translate3d(${f2(-st.x * l.d * 46)}px,${f2(-st.y * l.d * 30)}px,0) scale(${1.08 + l.d * 0.1})`;
        cam.style.transform = `rotateX(${f2(st.y * 2.2)}deg) rotateY(${f2(-st.x * 3.2)}deg)`;
        if (fx) fx(t, st.x, st.y);
      }
      st.raf = requestAnimationFrame(frame);
    };
    const f2 = n => n.toFixed(2);
    const stop = () => {
      st.on = false; cancelAnimationFrame(st.raf);
      removeEventListener('deviceorientation', onOri); removeEventListener('pointermove', onMove);
    };
    if (calm) { for (const l of layers) l.n.style.transform = `scale(${1.08 + l.d * 0.1})`; if (fx) fx(0, 0, 0); }
    else st.raf = requestAnimationFrame(frame);
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
