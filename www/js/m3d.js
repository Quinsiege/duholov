/* 5.1.28: 3D-модели мест на карте — Источник, святилища и Разломы всех мифологий (www/models/*.m3d).
   Модели сделаны в Blender по рисункам игры (tools/models3d — скрипты моделей и выгрузка в этот формат).
   Рисует их свой маленький WebGL-рисователь, без библиотек: один общий холст WebGL, готовый кадр модели копируется
   в холст значка (canvas.mk3d) — касания, слои и порядок перекрытия значков остаются как были.
   Камера смотрит на модель сверху под ELEV°; модель повёрнута вместе с картой (MapView.rot) — у повёрнутой карты
   видна другая сторона места. Обводка — «вывернутой оболочкой» в шейдере (в файле модели её нет: вдвое меньше).
   Движется вихрь портала, пламя, огоньки и искры — до FPS кадров в секунду и только у видимых значков;
   в «Экономии батареи» и «Меньше движения» модель неподвижна. Нет WebGL или файл не загрузился — остаётся
   прежний рисунок места (SVG). */
const M3D = {
  VER: 1,            // метка файлов моделей (?v=): заменили файлы — увеличить (sw.js держит их в своём кэше между выпусками)
  BASE: 'models/',   // папка моделей (просмотрщик tools/models3d/preview.html берёт их из www/models)
  ELEV: 30,          // наклон камеры над моделью, градусы
  FPS: 20,           // до стольких кадров в секунду движется модель; дорого (слабый телефон) — реже, до 8
  PXM: { spring: 30, shrine: 20, rift: 19 }, // CSS-пикселей на метр модели — по виду места (значки разного размера)
  OUTLINE_PX: 1.25,  // толщина обводки на экране, CSS-пиксели (у модели — 0,03 м)
  OUTLINE: [0x1c / 255, 0x10 / 255, 0x30 / 255], // тёмно-фиолетовая, как у рисунков игры
  KINDS: ['spring', ...['slavic', 'greek', 'norse', 'celtic', 'egypt', 'china', 'aztec', 'japan'].flatMap(m => ['shrine_' + m, 'rift_' + m])],
  // свет — как у превью в Blender: ключевой слева спереди сверху, заполняющий справа, контровой сзади (сила / π — по Ламберту)
  LIGHTS: [[[-3, -4, 6], '#fff4e0', 3.2], [[5, -2, 3], '#c7d2fe', 1.1], [[1, 6, 4], '#f0abfc', 2.0]],
  AMBIENT: '#2a2340',
  on: false, gl: null, cv: null, P: null, O: null, gen: 0,
  models: {}, views: new Set(), rot: 0, raf: 0, last: 0, io: null, fps: 20, cost: 0,

  init() {
    if (this.gl || this.on === null) return this.on;
    try {
      const cv = document.createElement('canvas');
      const opt = { alpha: true, premultipliedAlpha: true, antialias: true, depth: true, stencil: false, preserveDrawingBuffer: false };
      const gl = cv.getContext('webgl', opt) || cv.getContext('experimental-webgl', opt);
      if (!gl) { this.on = null; return false; }
      this.cv = cv; this.gl = gl;
      if (!this.programs()) { this.on = null; return false; }
      // видеокарта сбросила контекст (телефон свернули, нехватка памяти) — вернётся: программы и буферы — заново
      cv.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; });
      cv.addEventListener('webglcontextrestored', () => { this.lost = false; this.gen++; this.programs(); this.redraw(); });
      this.tick = this.tick.bind(this);
      if ('IntersectionObserver' in window) {
        this.io = new IntersectionObserver(es => {
          for (const en of es) { const v = en.target._m3d; if (!v) continue; v.vis = en.isIntersecting; if (v.vis && v.ready) this.draw(v); }
          this.kick();
        });
      }
      document.addEventListener('visibilitychange', () => this.kick());
      if (typeof Stage !== 'undefined' && Stage.on) Stage.on(busy => { if (!busy) this.kick(); });
      this.lights = this.LIGHTS.map(([d, c, k]) => {
        const l = Math.hypot(...d), col = this.lin(c);
        return { d: d.map(x => x / l), c: col.map(x => x * k / Math.PI) };
      });
      this.amb = this.lin(this.AMBIENT);
      this.on = true;
    } catch (e) { this.on = null; }
    return !!this.on;
  },
  lin(hex) { return [1, 3, 5].map(i => Math.pow(parseInt(hex.slice(i, i + 2), 16) / 255, 2.2)); },

  /* ---------- шейдеры ---------- */
  VS: `attribute vec4 aPos; attribute vec4 aNrm; attribute vec4 aCol;
    uniform mat4 uM, uVP; uniform mat3 uN; uniform vec3 uQ0, uQs;
    varying vec3 vN; varying vec3 vC;
    void main() {
      vec3 p = uQ0 + (aPos.xyz + 32768.0) * uQs;
      vN = uN * aNrm.xyz;
      vC = pow(aCol.rgb, vec3(2.2));
      gl_Position = uVP * uM * vec4(p, 1.0);
    }`,
  FS: `precision mediump float;
    varying vec3 vN; varying vec3 vC;
    uniform vec3 uBase, uEmit, uAmb, uL0, uL1, uL2, uC0, uC1, uC2, uV;
    uniform float uAlpha, uRough, uMetal;
    void main() {
      vec3 n = normalize(vN);
      if (!gl_FrontFacing) n = -n;
      vec3 base = uBase * vC;
      vec3 d = uAmb + uC0 * max(dot(n, uL0), 0.0) + uC1 * max(dot(n, uL1), 0.0) + uC2 * max(dot(n, uL2), 0.0);
      float sp = pow(max(dot(n, normalize(uL0 + uV)), 0.0), mix(90.0, 8.0, uRough)) * mix(0.3, 1.2, uMetal) * (1.0 - 0.85 * uRough);
      vec3 c = base * d * (1.0 - 0.6 * uMetal) + uC0 * sp * mix(vec3(1.0), base * 1.6, uMetal) + uEmit * vC;
      gl_FragColor = vec4(pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2)) * uAlpha, uAlpha);
    }`,
  OVS: `attribute vec4 aPos; attribute vec4 aONrm;
    uniform mat4 uM, uVP; uniform vec3 uQ0, uQs; uniform float uOl;
    void main() { vec3 p = uQ0 + (aPos.xyz + 32768.0) * uQs; gl_Position = uVP * uM * vec4(p + aONrm.xyz * uOl, 1.0); }`,
  OFS: `precision mediump float; uniform vec3 uOC; void main() { gl_FragColor = vec4(uOC, 1.0); }`,
  programs() {
    const gl = this.gl;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    const prog = (vs, fs, attrs) => {
      const a = sh(gl.VERTEX_SHADER, vs), b = sh(gl.FRAGMENT_SHADER, fs);
      if (!a || !b) return null;
      const p = gl.createProgram();
      gl.attachShader(p, a); gl.attachShader(p, b);
      attrs.forEach((n, i) => gl.bindAttribLocation(p, i, n));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
      const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) { const nm = gl.getActiveUniform(p, i).name; u[nm] = gl.getUniformLocation(p, nm); }
      return { p, u };
    };
    this.P = prog(this.VS, this.FS, ['aPos', 'aNrm', 'aCol']);
    this.O = prog(this.OVS, this.OFS, ['aPos', 'aONrm']);
    return !!(this.P && this.O);
  },

  /* ---------- файлы моделей ---------- */
  // 'M3D1', длина JSON (u32), JSON (части, материалы, группы, рамка квантования), затем позиции int16×4, нормали int8×4,
  // цвета вершин u8×4 (только у частей с цветами — портал), индексы u16 (у каждой части — свои, от её первой вершины)
  parse(buf) {
    const dv = new DataView(buf);
    if (dv.getUint32(0, true) !== 0x3144334d) throw new Error('m3d: не тот файл');
    const jl = dv.getUint32(4, true), head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, jl)));
    const b0 = 8 + jl, B = head.buf;
    const pos = new Int16Array(buf, b0 + B.pos, (B.nrm - B.pos) / 2), nrm = new Int8Array(buf, b0 + B.nrm, B.col - B.nrm);
    const col = new Uint8Array(buf, b0 + B.col, B.idx - B.col), idx = new Uint16Array(buf, b0 + B.idx, (B.len - B.idx) / 2);
    // нормали обводки — средние по всем вершинам в той же точке группы: у плоских граней у каждой грани свои нормали,
    // и оболочка по ним рвалась бы на рёбрах
    const onr = new Int8Array(nrm.length), acc = new Map();
    const key = (g, i) => g + ':' + pos[i * 4] + ',' + pos[i * 4 + 1] + ',' + pos[i * 4 + 2];
    for (const p of head.prims) if (p.ol) for (let i = p.v[0]; i < p.v[0] + p.v[1]; i++) {
      const k = key(p.g, i); let a = acc.get(k);
      if (!a) acc.set(k, a = [0, 0, 0]);
      a[0] += nrm[i * 4]; a[1] += nrm[i * 4 + 1]; a[2] += nrm[i * 4 + 2];
    }
    for (const p of head.prims) if (p.ol) for (let i = p.v[0]; i < p.v[0] + p.v[1]; i++) {
      const a = acc.get(key(p.g, i)), l = Math.hypot(a[0], a[1], a[2]) || 1;
      for (let j = 0; j < 3; j++) onr[i * 4 + j] = Math.round(a[j] / l * 127);
    }
    for (const p of head.prims) p.blend = head.mats[p.m].a < 0.999; // цвета материалов в файле — уже линейные (как в Blender)
    // верх и низ модели на экране (без поворота карты), метры: над верхом встаёт хранитель Разлома, под низом — звёзды
    const e = this.ELEV * Math.PI / 180, sn = Math.sin(e), cs = Math.cos(e), q = head.q;
    let top = 0, low = 0;
    for (const p of head.prims) {
      const o = p.g ? head.groups[p.g].o : [0, 0, 0];
      for (let i = p.v[0]; i < p.v[0] + p.v[1]; i++) {
        const yv = (q[1] + (pos[i * 4 + 1] + 32768) * q[4] + o[1]) * sn + (q[2] + (pos[i * 4 + 2] + 32768) * q[5] + o[2]) * cs;
        if (yv > top) top = yv; else if (yv < low) low = yv;
      }
    }
    head.top = top; head.low = low;
    head.moving = head.groups.some(g => g.t !== 'static');
    return { head, pos, nrm, col, idx, onr, gen: -1 };
  },
  need(kind) {
    const m = this.models[kind];
    if (m) return m.wait;
    const it = this.models[kind] = { ready: false };
    it.wait = fetch(`${this.BASE}${kind}.m3d?v=${this.VER}`).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(buf => { Object.assign(it, this.parse(buf), { ready: true }); return true; })
      .catch(e => { it.fail = true; if (typeof Errors !== 'undefined') Errors.report('m3d ' + kind + ': ' + e.message, 'm3d.js', 0); return false; });
    return it.wait;
  },
  upload(m) {
    const gl = this.gl;
    const buf = (type, data) => { const b = gl.createBuffer(); gl.bindBuffer(type, b); gl.bufferData(type, data, gl.STATIC_DRAW); return b; };
    m.bp = buf(gl.ARRAY_BUFFER, m.pos); m.bn = buf(gl.ARRAY_BUFFER, m.nrm); m.bo = buf(gl.ARRAY_BUFFER, m.onr);
    m.bc = m.col.length ? buf(gl.ARRAY_BUFFER, m.col) : null;
    m.bi = buf(gl.ELEMENT_ARRAY_BUFFER, m.idx);
    m.gen = this.gen;
  },

  /* ---------- значки ---------- */
  has(kind) { return this.on === true && this.KINDS.includes(kind); },
  kindOf(e) { return e.type === 'spring' ? 'spring' : (e.type === 'shrine' ? 'shrine_' : 'rift_') + (e.myth || 'slavic'); },
  // холст модели в значке; (ax, ay) — точка привязки значка (iconAnchor): туда встаёт центр основания модели
  html(kind, ax, ay, hide) {
    return this.has(kind) ? `<canvas class="mk3d" data-m3d="${kind}" data-ax="${ax}" data-ay="${ay}"${hide ? ` data-hide="${hide}"` : ''}></canvas>` : '';
  },
  bind(root) {
    if (!this.on || !root) return;
    root.querySelectorAll('canvas.mk3d').forEach(c => this.add(c));
  },
  add(c) {
    if (c._m3d) return;
    const kind = c.dataset.m3d, type = kind.split('_')[0];
    const v = { c, ctx: c.getContext('2d'), kind, pxm: this.PXM[type] || 20, ax: +c.dataset.ax || 0, ay: +c.dataset.ay || 0,
      hide: c.dataset.hide ? new Set(c.dataset.hide.split(' ')) : null, vis: true, ready: false };
    if (!v.ctx) return;
    c._m3d = v;
    this.views.add(v);
    if (this.io) this.io.observe(c);
    this.need(kind).then(ok => {
      if (!ok || !c.isConnected) return;
      this.layout(v);
      v.ready = true;
      if (this.draw(v)) { c.classList.add('on'); if (c.parentElement) c.parentElement.classList.add('m3d'); }
      this.kick();
    });
  },
  // размер холста — чтобы модель помещалась при любом повороте карты: ширина — по самой дальней от центра точке
  layout(v) {
    const h0 = this.models[v.kind].head, e = this.ELEV * Math.PI / 180, S = v.pxm, sn = Math.sin(e), cs = Math.cos(e);
    const pad = this.OUTLINE_PX / S + 0.02, r = h0.r + pad, h = h0.h + pad;
    const w = Math.ceil(2 * r * S) + 2, hh = Math.ceil((h * cs + 2 * r * sn) * S) + 2, oy = hh - 1 - r * sn * S;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    v.pw = Math.round(w * dpr); v.ph = Math.round(hh * dpr);
    Object.assign(v.c, { width: v.pw, height: v.ph });
    Object.assign(v.c.style, { width: w + 'px', height: hh + 'px', left: (v.ax - w / 2).toFixed(1) + 'px', top: (v.ay - oy).toFixed(1) + 'px' });
    // экран: x — вправо, y — вверх (модель наклонена к камере), z — глубина; ортографическая проекция
    const sx = 2 * S / w, sy = 2 * S / hh, y0 = 1 - 2 * oy / hh, D = 12;
    v.vp = new Float32Array([sx, 0, 0, 0, 0, sy * sn, cs / D, 0, 0, sy * cs, -sn / D, 0, 0, y0, 0, 1]);
    v.ol = this.OUTLINE_PX / S / 0.03; // множитель толщины обводки модели (0,03 м → OUTLINE_PX на экране)
    // значку — где у модели верх и низ (CSS-пиксели от верха значка): туда встают хранитель, флаг клана и звёзды (style.css)
    const box = v.c.parentElement;
    if (box) { box.style.setProperty('--m3d-top', (v.ay - h0.top * S).toFixed(1) + 'px'); box.style.setProperty('--m3d-bot', (v.ay - h0.low * S).toFixed(1) + 'px'); }
  },

  /* ---------- кадр ---------- */
  // движение части модели (группы) к моменту t, в осях модели
  groupMat(g, i, t) {
    const o = g.o || [0, 0, 0], ph = i * 1.7;
    let c = 1, s = 0, sx = 1, sy = 1, sz = 1, dz = 0, ax = 'z';
    if (g.t === 'spin') { const a = -t * 0.9; c = Math.cos(a); s = Math.sin(a); ax = 'y'; }
    else if (g.t === 'flicker') { const f = Math.sin(t * 7.3 + ph) * 0.5 + Math.sin(t * 11.1 + ph * 2) * 0.3; sz = 1 + 0.07 * f; sx = sy = 1 - 0.035 * f; }
    else if (g.t === 'bob') dz = 0.05 * Math.sin(t * 2.1 + ph);
    else if (g.t === 'float') { dz = 0.04 * Math.sin(t * 1.6); const a = t * 0.7; c = Math.cos(a); s = Math.sin(a); }
    else if (g.t === 'twinkle') sx = sy = sz = 0.7 + 0.45 * (0.5 + 0.5 * Math.sin(t * 3.1 + ph));
    // вращение (вокруг y — вихрь портала, вокруг z — осколок), масштаб, сдвиг в опорную точку
    const R = ax === 'y' ? [c, 0, -s, 0, 1, 0, s, 0, c] : [c, s, 0, -s, c, 0, 0, 0, 1];
    return new Float32Array([R[0] * sx, R[1] * sx, R[2] * sx, 0, R[3] * sy, R[4] * sy, R[5] * sy, 0, R[6] * sz, R[7] * sz, R[8] * sz, 0, o[0], o[1], o[2] + dz, 1]);
  },
  mul(a, b) { // 4×4, по столбцам
    const r = new Float32Array(16);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      let x = 0;
      for (let k = 0; k < 4; k++) x += a[k * 4 + j] * b[i * 4 + k];
      r[i * 4 + j] = x;
    }
    return r;
  },
  draw(v, now) {
    const gl = this.gl, m = this.models[v.kind];
    if (!m || !m.ready || this.lost || !v.c.isConnected) return false;
    if (m.gen !== this.gen) this.upload(m);
    const t = (now || performance.now()) / 1000, W = v.pw, H = v.ph, cv = this.cv;
    if (cv.width < W || cv.height < H) { cv.width = Math.max(cv.width, W); cv.height = Math.max(cv.height, H); }
    gl.viewport(0, 0, W, H);
    gl.enable(gl.SCISSOR_TEST); gl.scissor(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0); gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    const h0 = m.head, a = -this.rot * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const Y = new Float32Array([ca, sa, 0, 0, -sa, ca, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); // поворот вместе с картой
    const Ms = h0.groups.map((g, i) => g.t === 'static' ? Y : this.mul(Y, this.groupMat(g, i, t)));
    const Ns = Ms.map(M => new Float32Array([M[0], M[1], M[2], M[4], M[5], M[6], M[8], M[9], M[10]]));
    const q = h0.q, vis = p => !(v.hide && p.tag && v.hide.has(p.tag));
    const bindAttr = (loc, b, type, norm, off) => { gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 4, type, norm, 0, off); };
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.bi);
    // 1) обводка: задние грани раздутой по нормалям оболочки
    let u = this.O.u;
    gl.useProgram(this.O.p);
    gl.disable(gl.BLEND); gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT);
    gl.uniformMatrix4fv(u.uVP, false, v.vp); gl.uniform3f(u.uQ0, q[0], q[1], q[2]); gl.uniform3f(u.uQs, q[3], q[4], q[5]); gl.uniform3fv(u.uOC, this.OUTLINE);
    gl.disableVertexAttribArray(2);
    for (const p of h0.prims) {
      if (!p.ol || p.blend || !vis(p)) continue;
      gl.uniformMatrix4fv(u.uM, false, Ms[p.g]); gl.uniform1f(u.uOl, p.ol * v.ol);
      bindAttr(0, m.bp, gl.SHORT, false, p.v[0] * 8); bindAttr(1, m.bo, gl.BYTE, true, p.v[0] * 4);
      gl.drawElements(gl.TRIANGLES, p.i[1], gl.UNSIGNED_SHORT, p.i[0] * 2);
    }
    // 2) сама модель: сначала непрозрачное, потом полупрозрачное (вода, пламя, туман) — без записи глубины
    u = this.P.u;
    gl.useProgram(this.P.p);
    gl.cullFace(gl.BACK);
    gl.uniformMatrix4fv(u.uVP, false, v.vp); gl.uniform3f(u.uQ0, q[0], q[1], q[2]); gl.uniform3f(u.uQs, q[3], q[4], q[5]);
    const L = this.lights, e = this.ELEV * Math.PI / 180;
    gl.uniform3fv(u.uL0, L[0].d); gl.uniform3fv(u.uL1, L[1].d); gl.uniform3fv(u.uL2, L[2].d);
    gl.uniform3fv(u.uC0, L[0].c); gl.uniform3fv(u.uC1, L[1].c); gl.uniform3fv(u.uC2, L[2].c);
    gl.uniform3fv(u.uAmb, this.amb); gl.uniform3f(u.uV, 0, -Math.cos(e), Math.sin(e));
    for (const pass of [false, true]) {
      if (pass) { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); }
      for (const p of h0.prims) {
        if (p.blend !== pass || !vis(p)) continue;
        const mt = h0.mats[p.m];
        if (mt.ds) gl.disable(gl.CULL_FACE); else gl.enable(gl.CULL_FACE);
        gl.uniformMatrix4fv(u.uM, false, Ms[p.g]); gl.uniformMatrix3fv(u.uN, false, Ns[p.g]);
        gl.uniform3fv(u.uBase, mt.c); gl.uniform3fv(u.uEmit, mt.e);
        gl.uniform1f(u.uAlpha, mt.a); gl.uniform1f(u.uRough, mt.ro); gl.uniform1f(u.uMetal, mt.mt);
        bindAttr(0, m.bp, gl.SHORT, false, p.v[0] * 8); bindAttr(1, m.bn, gl.BYTE, true, p.v[0] * 4);
        if (p.c != null && m.bc) bindAttr(2, m.bc, gl.UNSIGNED_BYTE, true, p.c * 4);
        else { gl.disableVertexAttribArray(2); gl.vertexAttrib4f(2, 1, 1, 1, 1); }
        gl.drawElements(gl.TRIANGLES, p.i[1], gl.UNSIGNED_SHORT, p.i[0] * 2);
      }
    }
    gl.depthMask(true); gl.disable(gl.BLEND);
    // кадр — в холст значка (WebGL рисует снизу вверх: нужная область — в нижнем левом углу общего холста)
    v.ctx.clearRect(0, 0, W, H);
    v.ctx.drawImage(cv, 0, cv.height - H, W, H, 0, 0, W, H);
    return true;
  },

  /* ---------- когда перерисовывать ---------- */
  prune() {
    for (const v of this.views) if (!v.c.isConnected) { this.views.delete(v); if (this.io) this.io.unobserve(v.c); v.c._m3d = null; }
  },
  // карта повернулась — модели тоже (MapView.setRot)
  setRot(r) {
    if (!this.on || r === this.rot) return;
    this.rot = r;
    this.redraw();
  },
  redraw() {
    if (!this.on) return;
    this.prune();
    const now = performance.now();
    for (const v of this.views) if (v.ready && v.vis) this.draw(v, now);
  },
  moving() {
    if (document.hidden || (typeof Stage !== 'undefined' && Stage.busy)) return false;
    const b = document.body.classList;
    if (b.contains('calm') || b.contains('eco')) return false;
    for (const v of this.views) if (this.live(v)) return true;
    return false;
  },
  // движется только видимая модель места, до которого можно дотянуться (у дальних значков — класс far): остальные — неподвижный кадр
  live(v) { return v.ready && v.vis && this.models[v.kind].head.moving && !v.c.closest('.far'); },
  kick() { if (this.on && !this.raf && this.moving()) this.raf = requestAnimationFrame(this.tick); },
  tick(now) {
    this.raf = 0;
    this.prune();
    if (!this.moving()) return;
    if (now - this.last >= 1000 / this.fps - 2) {
      this.last = now;
      const t0 = performance.now();
      for (const v of this.views) if (this.live(v)) this.draw(v, now);
      // кадр всех моделей дороже 8 мс (слабый телефон) — реже, до 8 кадров в секунду; дешевле 4 мс — снова чаще
      const dt = performance.now() - t0;
      this.cost = this.cost ? this.cost * 0.9 + dt * 0.1 : dt;
      this.fps = this.cost > 8 ? Math.max(8, this.fps - 1) : this.cost < 4 ? Math.min(this.FPS, this.fps + 1) : this.fps;
    }
    this.raf = requestAnimationFrame(this.tick);
  },
};
