'use strict';
/* 4.4: фоновые сцены экрана входа и экрана загрузки.
   Настройки — www/scenes/scenes.json (формат — docs/scenes.md). Пока своих изображений нет, рисуется встроенная сцена:
   «Ночь над Навью» (4.6): сияние, луна, деревня у озера, лес, берёзы, парящие духи, светлячки.
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

  // 4.6: встроенная сцена «Ночь над Навью»: сияние, луна, дальние горы, деревня с огнями и терем, озеро с лунной дорожкой, лес, берёзы.
  // Та же картинка — на экране загрузки (index.html, собирается tools/web/loader-art.mjs из art())
  art() {
    const r = U.rng('duholov-scene'), W = 600, H = 900, f = n => n.toFixed(1);
    const stars = Array.from({ length: 120 }, () => `<circle cx="${f(r() * W)}" cy="${f(r() * H * 0.5)}" r="${f(0.4 + r() * r() * 1.6)}" class="tw${1 + Math.floor(r() * 3)}"/>`).join('');
    const ridge = (base, amp, seed, step = 80) => {
      const q = U.rng(seed); let d = `M-40 ${base}`;
      for (let x = -40; x <= W + 40; x += step) d += ` Q${x + step / 2} ${f(base - amp * (0.4 + q()))} ${x + step} ${f(base - amp * 0.25 * q())}`;
      return d + ` V${H} H-40Z`;
    };
    const peaks = (base, seed) => { // зубчатые дальние горы
      const q = U.rng(seed); let d = `M-40 ${base}`, x = -40;
      while (x < W + 40) { const w = 50 + q() * 70, h = 40 + q() * 90; d += ` L${f(x + w * 0.5)} ${f(base - h)} L${f(x + w)} ${f(base - q() * 20)}`; x += w; }
      return d + ` V${H} H-40Z`;
    };
    const pines = (base, hMin, hMax, step, seed, keep) => {
      const q = U.rng(seed); let d = '';
      for (let x = -30; x < W + 30; x += step * (0.6 + q() * 0.8)) {
        const k = keep ? keep(x) : 1; if (k <= 0) { q(); q(); q(); continue; }
        const h = (hMin + q() * (hMax - hMin)) * k, w = h * (0.22 + q() * 0.08), y = base + q() * 8;
        for (let t = 0; t < 3; t++) { const ty = y - h * t * 0.28, tw = w * (1 - t * 0.22); d += `M${f(x - tw)} ${f(ty)}L${f(x)} ${f(ty - h * 0.46)}L${f(x + tw)} ${f(ty)}Z`; }
        d += `M${f(x - 2)} ${f(y)}h4v14h-4Z`;
      }
      return d;
    };
    // изба: сруб, двускатная крыша, труба, светящиеся окна
    const izba = (x, base, w, h, smoke) => {
      const roof = h * 0.85, win = [];
      for (let i = 0; i < (w > 36 ? 2 : 1); i++) win.push([x + w * (w > 36 ? 0.22 + i * 0.4 : 0.38), base - h * 0.68]);
      return { body: `M${x} ${base}V${base - h}H${x + w}V${base}Z M${x - 4} ${base - h + 1}L${f(x + w / 2)} ${f(base - h - roof)}L${x + w + 4} ${base - h + 1}Z M${f(x + w * 0.68)} ${f(base - h - roof * 0.45)}v-${f(roof * 0.5)}h5v${f(roof * 0.62)}Z`,
        win, smoke: smoke ? [x + w * 0.68 + 2.5, base - h - roof * 0.95] : null };
    };
    // терем: сруб, шатровая крыша со «бочкой» и шпилем
    const terem = (x, base) => ({ body: `M${x} ${base}V${base - 46}H${x + 30}V${base}Z M${x - 5} ${base - 45}L${x + 15} ${base - 118}L${x + 35} ${base - 45}Z M${x + 10} ${base - 104}q5 -12 10 0Z M${x + 14.4} ${base - 112}v-20h1.2v20Z M${x + 15.6} ${base - 131}l9 3.5-9 3.5Z M${x - 10} ${base}V${base - 26}H${x}V${base}Z M${x - 14} ${base - 25}L${x - 5} ${base - 40}L${x + 4} ${base - 25}Z`,
      win: [[x + 7, base - 36], [x + 19, base - 36], [x + 13, base - 18], [x + 13, base - 76]] });
    const village = [izba(165, 452, 40, 22, true), izba(214, 462, 30, 18, false), izba(252, 449, 44, 24, true), terem(398, 436), izba(345, 456, 34, 20, true)];
    const winGlow = village.flatMap(b => b.win).map(([x, y]) => `<circle cx="${f(x + 2.5)}" cy="${f(y + 3)}" r="11" fill="url(#scWinG)"/>`).join('');
    const wins = village.flatMap(b => b.win).map(([x, y], i) => `<rect x="${f(x)}" y="${f(y)}" width="5" height="6" rx=".8" class="sc-win w${i % 3}"/>`).join('');
    const smokes = village.filter(b => b.smoke).map(({ smoke: [x, y] }, i) => `<path class="sc-smoke s${i}" d="M${f(x)} ${f(y)}c-7 -12 7 -20 0 -34s7 -22 -2 -38" />`).join('');
    // лунная дорожка на озере
    const glints = Array.from({ length: 16 }, (_, i) => { const y = 505 + i * 2.7, w = (6 + i * 3.4) * (0.5 + r() * 0.7); return r() < 0.18 ? '' : `<rect x="${f(440 - w / 2 + (r() - 0.5) * 10)}" y="${f(y)}" width="${f(w)}" height="1.3" rx=".65" fill-opacity="${f(1 - i / 20)}" class="g${i % 3}"/>`; }).join('');
    // берёза: белый ствол с чёрными чёрточками, лёгкий изгиб
    const birch = (x, w, lean, top) => {
      const q = U.rng('b' + x); let marks = '';
      for (let y = H; y > top + 30; y -= 14 + q() * 20) { const t = (H - y) / (H - top), cx = x + lean * t * t; marks += `M${f(cx - w / 2 + (q() > 0.5 ? 0 : w * 0.4))} ${f(y)}h${f(w * (0.3 + q() * 0.3))}v${f(1.6 + q() * 2)}h-${f(w * 0.3)}Z`; }
      return { trunk: `M${x - w / 2} ${H}C${x - w / 2} ${f(H - (H - top) * 0.5)} ${f(x + lean * 0.4 - w * 0.35)} ${f(top + 60)} ${f(x + lean - w * 0.2)} ${top}L${f(x + lean + w * 0.2)} ${top}C${f(x + lean * 0.4 + w * 0.35)} ${f(top + 60)} ${x + w / 2} ${f(H - (H - top) * 0.5)} ${x + w / 2} ${H}Z`, marks };
    };
    const b1 = birch(158, 16, -16, -60), b2 = birch(192, 11, 12, -40);
    return {
      W, H,
      sky: `<defs><linearGradient id="scSkyG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#04021a"/><stop offset=".28" stop-color="#110735"/><stop offset=".46" stop-color="#2a1262"/><stop offset=".56" stop-color="#5b2d86"/><stop offset=".62" stop-color="#8a4a8f"/><stop offset=".7" stop-color="#2a1350"/></linearGradient>
          <radialGradient id="scMoon" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fffbeb"/><stop offset=".6" stop-color="#fde68a"/><stop offset="1" stop-color="#d6a84a"/></radialGradient>
          <radialGradient id="scHalo"><stop offset="0" stop-color="#fde68a" stop-opacity=".38"/><stop offset=".4" stop-color="#fde68a" stop-opacity=".12"/><stop offset="1" stop-color="#fde68a" stop-opacity="0"/></radialGradient>
          <linearGradient id="scAur1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5eead4" stop-opacity="0"/><stop offset=".55" stop-color="#5eead4" stop-opacity=".42"/><stop offset="1" stop-color="#a78bfa" stop-opacity="0"/></linearGradient>
          <linearGradient id="scAur2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0abfc" stop-opacity="0"/><stop offset=".6" stop-color="#c084fc" stop-opacity=".34"/><stop offset="1" stop-color="#818cf8" stop-opacity="0"/></linearGradient>
          <filter id="scBlur" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="7"/></filter></defs>
        <rect width="${W}" height="${H}" fill="url(#scSkyG)"/>
        <g class="sc-stars">${stars}</g>
        <g filter="url(#scBlur)"><path class="sc-aur a1" d="M-40 250C80 170 190 290 320 220S520 130 640 190V246C520 196 430 300 300 282S70 236 -40 312Z" fill="url(#scAur1)"/>
          <path class="sc-aur a2" d="M-40 190C110 140 210 220 330 170S520 90 640 130V170C520 136 420 246 320 226S100 190 -40 240Z" fill="url(#scAur2)"/></g>
        <g class="sc-moon"><circle cx="440" cy="150" r="130" fill="url(#scHalo)"/><circle cx="440" cy="150" r="27" fill="url(#scMoon)"/>
          <circle cx="431" cy="142" r="5" fill="#e4c67a" opacity=".5"/><circle cx="450" cy="159" r="3.4" fill="#e4c67a" opacity=".45"/><circle cx="446" cy="138" r="2" fill="#e4c67a" opacity=".4"/></g>
        <g class="sc-cloud" fill="#2a1a58" opacity=".75"><path d="M270 198c10-12 34-12 44 0 12-8 34-4 38 10 16 0 26 6 26 14H256c-4-12 2-22 14-24Z"/><path d="M470 214c8-9 26-9 33 0 10-6 26-3 29 8 10 1 16 5 16 10H458c-2-9 3-16 12-18Z"/></g>
        <g class="sc-cloud-rim" fill="none" stroke="#fde68a" stroke-opacity=".35" stroke-width="1.2"><path d="M270 198c10-12 34-12 44 0 12-8 34-4 38 10"/><path d="M470 214c8-9 26-9 33 0 10-6 26-3 29 8"/></g>
        <path class="sc-meteor" d="M330 60l-80 38" stroke="url(#scHalo)" stroke-width="2"/>`,
      layers: [
        { cls: 'sc-far', d: 0.05, body: `<path d="${peaks(430, 'p1')}" fill="#3a2275" opacity=".7"/><path d="${peaks(430, 'p1')}" fill="none" stroke="#9f7ae0" stroke-opacity=".35" stroke-width="1.5"/>` },
        { cls: 'sc-hills', d: 0.09, body: `<defs><radialGradient id="scWinG"><stop offset="0" stop-color="#fbbf24" stop-opacity=".55"/><stop offset="1" stop-color="#fbbf24" stop-opacity="0"/></radialGradient></defs>
          <path d="${ridge(468, 70, 'h1')}" fill="#2b1656"/><path d="${ridge(468, 70, 'h1')}" fill="none" stroke="#b794f4" stroke-opacity=".25" stroke-width="1.2"/>
          <g fill="#1d0e3e">${village.map(b => `<path d="${b.body}"/>`).join('')}</g><g class="sc-wins">${winGlow}${wins}</g><g class="sc-smokes">${smokes}</g>` },
        { cls: 'sc-lake', d: 0.12, body: `<defs><linearGradient id="scLakeG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a7ad8"/><stop offset=".35" stop-color="#5b3fa6"/><stop offset="1" stop-color="#2c1a66"/></linearGradient><radialGradient id="scLakeM" cx=".5" cy=".3" r=".5"><stop offset="0" stop-color="#fde68a" stop-opacity=".45"/><stop offset="1" stop-color="#fde68a" stop-opacity="0"/></radialGradient></defs>
          <path d="M-40 520 Q30 490 110 502 T300 498 T470 500 T640 508 V600 H-40Z" fill="#211046"/>
          <path d="M150 510 Q300 494 470 500 T600 512 Q560 540 470 548 T220 544 Q140 534 150 510Z" fill="url(#scLakeG)"/>
          <ellipse cx="440" cy="520" rx="70" ry="26" fill="url(#scLakeM)"/><path d="M150 510 Q300 494 470 500 T600 512" fill="none" stroke="#e9d5ff" stroke-opacity=".35" stroke-width="1.2"/><g class="sc-glint" fill="#fde68a">${glints}</g>` },
        { cls: 'sc-forest', d: 0.17, body: `<path d="${pines(580, 50, 120, 15, 'f1', x => x < 140 || x > 545 ? 1 : x < 200 || x > 505 ? 0.5 : 0.12)}" fill="#160a30"/><path d="${ridge(578, 16, 'h3')}" fill="#160a30"/>` },
        { cls: 'sc-mist', d: 0.22, mist: true },
        { cls: 'sc-near', d: 0.5, body: `<path d="${pines(900, 380, 640, 30, 'n1', x => x > 330 ? Math.max(0, 1 - (W - x) / (W * 0.34)) + 0.3 : 0)}" fill="#0a0518"/>
                    <path d="${b1.trunk}" fill="#d9d2ea"/><path d="${b1.marks}" fill="#140a2a"/><path d="${b2.trunk}" fill="#b9b0d2"/><path d="${b2.marks}" fill="#140a2a"/>
          <path d="${ridge(850, 34, 'h4')}" fill="#0a0518"/>` },
      ],
    };
  },
  builtin() {
    const a = this.art(), svg = (cls, d, body) => `<div class="sc-l ${cls}" data-d="${d}"><svg viewBox="0 0 ${a.W} ${a.H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${body}</svg></div>`;
    return `<div class="sc-l sc-sky" data-d="0.02"><svg viewBox="0 0 ${a.W} ${a.H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${a.sky}</svg></div>`
      + a.layers.map(l => l.mist ? `<div class="sc-l sc-mist" data-d="${l.d}"><i></i><i></i><i></i></div>` : svg(l.cls, l.d, l.body)).join('');
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
