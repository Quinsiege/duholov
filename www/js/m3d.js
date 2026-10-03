/* 5.1.28: 3D-модели на карте — Источник, святилища и Разломы всех мифологий и сам Ловчий (www/models/*.m3d).
   Модели сделаны в Blender по рисункам игры (tools/models3d — скрипты моделей и выгрузка в этот формат).
   Рисует их свой маленький WebGL-рисователь, без библиотек: один общий холст WebGL, готовый кадр модели копируется
   в холст значка (canvas.mk3d) — касания, слои и порядок перекрытия значков остаются как были.
   Камера смотрит на модель сверху под ELEV°; модель повёрнута вместе с картой (MapView.rot) — у повёрнутой карты
   видна другая сторона места. Обводка — «вывернутой оболочкой» в шейдере (в файле модели её нет: вдвое меньше).
   Движется вихрь портала, пламя, огоньки и искры — до FPS кадров в секунду и только у видимых значков;
   Ловчий шагает и бежит (ноги, руки, туловище — по шарнирам модели), смотрит туда, куда идёт, одет в цвета облика.
   В «Экономии батареи» и «Меньше движения» модели неподвижны. Нет WebGL или файл не загрузился — остаётся
   прежний рисунок (SVG). */
const M3D = {
  VER: 3,            // метка файлов моделей (?v=): заменили файлы — увеличить (sw.js держит их в своём кэше между выпусками); 2 — 5.1.29: оберег Ловчего на груди, облики; 3 — 5.1.40: Ловчий со скелетом и текстурой
  BASE: 'models/',   // папка моделей (просмотрщик tools/models3d/preview.html берёт их из www/models)
  ELEV: 30,          // наклон камеры над моделью, градусы
  FPS: 20,           // до стольких кадров в секунду движутся места; дорого (слабый телефон) — реже, до 8
  PXM: { spring: 30, shrine: 20, rift: 19, catcher: 40, spirit: 40 }, // CSS-пикселей на метр модели — по виду (значки разного размера)
  OUTLINE_PX: 1.25,  // толщина обводки на экране, CSS-пиксели (у модели — 0,03 м)
  OUTLINE: [0x1c / 255, 0x10 / 255, 0x30 / 255], // тёмно-фиолетовая, как у рисунков игры
  // 5.1.29: у каждого облика-скина (LOOK.skin) — свой наряд Ловчего (catcher_<скин>), у обычного — капюшон (catcher)
  SKINS: ['kupala', 'leshiy', 'moroz', 'volhv', 'bogatyr', 'voron', 'navstrazh', 'zharpero', 'knyaz'],
  // 5.1.41: spirit_* — духи со скелетом (модели владельца из генератора): парят, летят и мчатся по походке (gait), как Ловчий
  SPIRITS: ['blue'],
  get KINDS() { return ['spring', 'catcher', ...this.SPIRITS.map(s => 'spirit_' + s), ...this.SKINS.map(s => 'catcher_' + s), ...['slavic', 'greek', 'norse', 'celtic', 'egypt', 'china', 'aztec', 'japan'].flatMap(m => ['shrine_' + m, 'rift_' + m])]; },
  // свет — как у превью в Blender: ключевой слева спереди сверху, заполняющий справа, контровой сзади (сила / π — по Ламберту)
  LIGHTS: [[[-3, -4, 6], '#fff4e0', 3.2], [[5, -2, 3], '#c7d2fe', 1.1], [[1, 6, 4], '#f0abfc', 2.0]],
  AMBIENT: '#2a2340',
  // походка Ловчего: шагов (циклов) в секунду, размах ног и рук (радианы), подскок (м) и наклон вперёд — шаг / бег
  WALK: { hz: [1.6, 2.5], leg: [0.42, 0.8], arm: [0.35, 0.75], bob: [0.025, 0.065], lean: [0.06, 0.24] },
  on: false, gl: null, cv: null, P: null, O: null, gen: 0,
  models: {}, views: new Set(), rot: 0, raf: 0, tmo: 0, last: 0, io: null, fps: 20, cost: 0,
  me: { heading: 0, gait: 0, tint: null, kind: 'catcher' }, // Ловчий: куда смотрит (градусы от севера), походка (0 — стоит, 1 — идёт, 2 — бежит), цвета, наряд

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
          const show = [];
          for (const en of es) { const v = en.target._m3d; if (!v) continue; v.vis = en.isIntersecting; if (v.vis && v.ready) show.push(v); }
          if (show.length) this.drawSet(show);
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
  /* 5.1.40: модель со скелетом (Ловчий из генератора): вершина — сумма до 4 костей с весами, кость — матрица 3×4 (три строки vec4
     в uB), цвет — из текстуры; обводка — та же «вывернутая оболочка», но по коже после костей */
  MAXB: 32,
  get SKIN() {
    return `attribute vec4 aPos; attribute vec4 aJ; attribute vec4 aW;
    uniform vec4 uB[${this.MAXB * 3}]; uniform vec3 uQ0, uQs;
    vec3 xf(float j, vec4 p) { int k = int(j + 0.5) * 3; return vec3(dot(uB[k], p), dot(uB[k + 1], p), dot(uB[k + 2], p)); }
    vec3 sk(vec4 p) { return xf(aJ.x, p) * aW.x + xf(aJ.y, p) * aW.y + xf(aJ.z, p) * aW.z + xf(aJ.w, p) * aW.w; }`;
  },
  get SVS() {
    return this.SKIN + `
    attribute vec4 aNrm; attribute vec2 aUV; uniform mat4 uM, uVP; uniform mat3 uN; varying vec3 vN; varying vec2 vUV; varying vec3 vC;
    void main() {
      vec3 p = sk(vec4(uQ0 + (aPos.xyz + 32768.0) * uQs, 1.0));
      vN = uN * sk(vec4(aNrm.xyz, 0.0)); vUV = aUV; vC = vec3(1.0);
      gl_Position = uVP * uM * vec4(p, 1.0);
    }`;
  },
  get SOVS() {
    return this.SKIN + `
    attribute vec4 aONrm; uniform mat4 uM, uVP; uniform float uOl;
    void main() {
      vec3 p = sk(vec4(uQ0 + (aPos.xyz + 32768.0) * uQs, 1.0)), n = sk(vec4(aONrm.xyz, 0.0));
      gl_Position = uVP * uM * vec4(p + normalize(n) * uOl, 1.0);
    }`;
  },
  get SFS() {
    return this.FS.replace('varying vec3 vN; varying vec3 vC;', 'varying vec3 vN; varying vec3 vC; varying vec2 vUV; uniform sampler2D uTex;')
      .replace('vec3 base = uBase * vC;', 'vec3 base = uBase * pow(texture2D(uTex, vUV).rgb, vec3(2.2));');
  },
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
    // со скелетом: не собрались (старый телефон — мало uniform) — Ловчий остаётся рисунком, места — 3D
    this.SP = prog(this.SVS, this.SFS, ['aPos', 'aNrm', 'aUV', 'aJ', 'aW']);
    this.SO = prog(this.SOVS, this.OFS, ['aPos', 'aONrm', 'aJ', 'aW']);
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
    if (head.skin) return this.parseSkin(buf, head, b0);
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
    Object.assign(head, this.span(head, pos, this.ELEV));
    head.moving = head.groups.some(g => g.t !== 'static');
    head.walk = head.groups.some(g => g.t === 'body' || g.t === 'leg'); // у модели есть шарниры походки (Ловчий)
    return { head, pos, nrm, col, idx, onr, gen: -1 };
  },
  /* 5.1.40: модель со скелетом: позиции int16×4, нормали int8×4, UV u16×2, кости и веса u8×4 + u8×4, индексы u16, клипы — матрицы
     костей f32 (кадр за кадром, кость за костью, 3×4 по строкам), текстура цвета (WebP). Для рамки на экране (span) — поза «стоит» */
  parseSkin(buf, head, b0) {
    const B = head.buf, K = head.skin, nv = Math.max(...head.prims.map(p => p.v[0] + p.v[1])); // частей несколько, если вершин больше 65535
    const pos = new Int16Array(buf, b0 + B.pos, nv * 4), nrm = new Int8Array(buf, b0 + B.nrm, nv * 4);
    const uv = new Uint16Array(buf, b0 + K.uv, nv * 2), jw = new Uint8Array(buf, b0 + K.jw, nv * 8), idx = new Uint16Array(buf, b0 + B.idx, (B.len - B.idx) / 2);
    const clips = {};
    for (const [k, c] of Object.entries(K.clips)) clips[k] = { n: c.n, fps: c.fps, dur: c.n / c.fps, m: new Float32Array(buf, b0 + c.off, c.n * K.nb * 12) };
    // обводка: нормали, общие для вершин в одной точке (на швах развёртки вершины раздвоены)
    const onr = new Int8Array(nrm.length), acc = new Map(), key = i => pos[i * 4] + ',' + pos[i * 4 + 1] + ',' + pos[i * 4 + 2];
    for (let i = 0; i < nv; i++) { const k = key(i); let a = acc.get(k); if (!a) acc.set(k, a = [0, 0, 0]); a[0] += nrm[i * 4]; a[1] += nrm[i * 4 + 1]; a[2] += nrm[i * 4 + 2]; }
    for (let i = 0; i < nv; i++) { const a = acc.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1; for (let j = 0; j < 3; j++) onr[i * 4 + j] = Math.round(a[j] / l * 127); }
    // поза «стоит» (первый кадр) — в осях игры: по ней верх и низ модели на экране
    const q = head.q, M = clips.idle.m, rest = new Float32Array(nv * 3);
    for (let i = 0; i < nv; i++) {
      const x = q[0] + (pos[i * 4] + 32768) * q[3], y = q[1] + (pos[i * 4 + 1] + 32768) * q[4], z = q[2] + (pos[i * 4 + 2] + 32768) * q[5];
      for (let c = 0; c < 4; c++) {
        const w = jw[i * 8 + 4 + c] / 255;
        if (!w) continue;
        const o = jw[i * 8 + c] * 12;
        rest[i * 3] += w * (M[o] * x + M[o + 1] * y + M[o + 2] * z + M[o + 3]);
        rest[i * 3 + 1] += w * (M[o + 4] * x + M[o + 5] * y + M[o + 6] * z + M[o + 7]);
        rest[i * 3 + 2] += w * (M[o + 8] * x + M[o + 9] * y + M[o + 10] * z + M[o + 11]);
      }
    }
    for (const p of head.prims) p.blend = false;
    head.walk = true; head.moving = true; // не Ловчий (дух) — тоже живой: парит, пока виден и досягаем
    const m = { head, pos, nrm, uv, jw, idx, onr, col: new Uint8Array(0), clips, rest, gen: -1 };
    Object.assign(head, this.span(head, pos, this.ELEV, rest));
    m.img = new Blob([new Uint8Array(buf, b0 + K.tex.off, K.tex.len)], { type: K.tex.type });
    return m;
  },
  // текстура — картинкой (createImageBitmap, иначе <img>): до первой отрисовки
  decode(m) {
    if (!(m.img instanceof Blob)) return Promise.resolve();
    const b = m.img;
    const p = typeof createImageBitmap === 'function' ? createImageBitmap(b) : new Promise((res, rej) => {
      const u = URL.createObjectURL(b), im = new Image();
      im.onload = () => { URL.revokeObjectURL(u); res(im); };
      im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('текстура')); };
      im.src = u;
    });
    return p.then(im => { m.img = im; });
  },
  // верх и низ модели на экране под камерой с наклоном e° (без поворота карты), метры: над верхом встаёт хранитель Разлома,
  // под низом — звёзды; rest — у модели со скелетом: поза «стоит»
  span(head, pos, e, rest) {
    const a = e * Math.PI / 180, sn = Math.sin(a), cs = Math.cos(a), q = head.q;
    let top = 0, low = 0;
    if (rest) {
      for (let i = 0; i < rest.length; i += 3) { const yv = rest[i + 1] * sn + rest[i + 2] * cs; if (yv > top) top = yv; else if (yv < low) low = yv; }
      return { top, low };
    }
    for (const p of head.prims) {
      const o = p.g ? head.groups[p.g].o : [0, 0, 0];
      for (let i = p.v[0]; i < p.v[0] + p.v[1]; i++) {
        const yv = (q[1] + (pos[i * 4 + 1] + 32768) * q[4] + o[1]) * sn + (q[2] + (pos[i * 4 + 2] + 32768) * q[5] + o[2]) * cs;
        if (yv > top) top = yv; else if (yv < low) low = yv;
      }
    }
    return { top, low };
  },
  // то же для наклона камеры конкретного значка — по градусам, один раз на каждый
  extent(m, e) {
    const c = m.ext || (m.ext = new Map()), k = Math.round(e);
    let r = c.get(k);
    if (!r) c.set(k, r = this.span(m.head, m.pos, k, m.rest));
    return r;
  },
  need(kind) {
    const m = this.models[kind];
    if (m) return m.wait;
    const it = this.models[kind] = { ready: false };
    it.wait = fetch(`${this.BASE}${kind}.m3d?v=${this.VER}`).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(buf => {
        const m = this.parse(buf);
        if (m.head.skin && !(this.SP && this.SO)) throw new Error('нет шейдера со скелетом');
        return this.decode(m).then(() => { Object.assign(it, m, { ready: true }); return true; });
      })
      .catch(e => { it.fail = true; if (typeof Errors !== 'undefined') Errors.report('m3d ' + kind + ': ' + e.message, 'm3d.js', 0); return false; });
    return it.wait;
  },
  upload(m) {
    const gl = this.gl;
    const buf = (type, data) => { const b = gl.createBuffer(); gl.bindBuffer(type, b); gl.bufferData(type, data, gl.STATIC_DRAW); return b; };
    m.bp = buf(gl.ARRAY_BUFFER, m.pos); m.bn = buf(gl.ARRAY_BUFFER, m.nrm); m.bo = buf(gl.ARRAY_BUFFER, m.onr);
    m.bc = m.col.length ? buf(gl.ARRAY_BUFFER, m.col) : null;
    m.bi = buf(gl.ELEMENT_ARRAY_BUFFER, m.idx);
    if (m.head.skin) {
      m.bu = buf(gl.ARRAY_BUFFER, m.uv); m.bj = buf(gl.ARRAY_BUFFER, m.jw);
      m.tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, m.tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, m.img);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    m.gen = this.gen;
  },

  /* ---------- значки ---------- */
  has(kind) { return this.on === true && this.KINDS.includes(kind); },
  kindOf(e) { return e.type === 'spring' ? 'spring' : (e.type === 'shrine' ? 'shrine_' : 'rift_') + (e.myth || 'slavic'); },
  // холст модели в значке; (ax, ay) — точка привязки значка (iconAnchor): туда встаёт центр основания модели;
  // who = 'me' — это Ловчий игрока (поворот, походка и цвета — из setMe)
  html(kind, ax, ay, hide, who) {
    return this.has(kind) ? `<canvas class="mk3d" data-m3d="${kind}" data-ax="${ax}" data-ay="${ay}"${hide ? ` data-hide="${hide}"` : ''}${who ? ` data-who="${who}"` : ''}></canvas>` : '';
  },
  bind(root) {
    if (!this.on || !root) return;
    root.querySelectorAll('canvas.mk3d').forEach(c => this.add(c));
  },
  add(c) {
    if (c._m3d) return;
    const kind = c.dataset.m3d, type = kind.split('_')[0];
    const v = { c, ctx: c.getContext('2d'), kind, pxm: this.PXM[type] || 20, ax: +c.dataset.ax || 0, ay: +c.dataset.ay || 0,
      hide: c.dataset.hide ? new Set(c.dataset.hide.split(' ')) : null, vis: true, ready: false, player: c.dataset.who === 'me', e: this.ELEV, az: 0,
      ui: !!c.dataset.ui, fitH: +c.dataset.fit || 0 }; // 5.1.41: ui — модель в окне (stage): своя камера и поворот, не с картой
    if (v.ui) { v.e = +c.dataset.e || 8; v.yaw = +c.dataset.yaw || 0; }
    if (!v.ctx) return;
    c._m3d = v;
    this.views.add(v);
    if (this.io) this.io.observe(c);
    if (v.player) { this.applyMe(v); if (v.kind !== kind) return; } // наряд другого облика — грузит swap
    this.need(kind).then(ok => {
      if (!ok || !c.isConnected || v.kind !== kind) return;
      this.aimView(v);
      this.layout(v);
      v.ready = true;
      this.first(v);
    });
  },
  /* 5.1.31: первый кадр новой модели — в ближайшем кадре браузера, пачкой со всеми новыми: первая отрисовка в только что
     вставленный холст заставляет браузер тут же досчитать стили всей страницы — в задаче, где только что появились значки
     (MapView.refresh), это был отдельный рывок; в кадре браузера этот расчёт и так нужен. Кадр — до отрисовки страницы:
     модель видна в том же кадре, что и значок */
  fresh: [],
  first(v) {
    this.fresh.push(v);
    if (this.freshRaf) return;
    this.freshRaf = requestAnimationFrame(() => {
      this.freshRaf = 0;
      const vs = this.fresh.filter(v => v.ready && v.c.isConnected);
      this.fresh = [];
      this.drawSet(vs);
      for (const v of vs) if (v.t) { v.c.classList.add('on'); if (v.c.parentElement) v.c.parentElement.classList.add('m3d'); }
      this.kick();
      if (vs.length && typeof MapView !== 'undefined' && MapView.seeSoon) MapView.seeSoon(); // 5.1.32: не за домом ли новая модель (тот — прозрачнее)
    });
  },
  // 5.1.38: сменилось разрешение графики — холсты всех моделей в новом размере, кадр — сразу
  relayout() { for (const v of this.views) { this.layout(v); v.t = 0; } this.last = 0; this.kick(); },
  // размер холста — чтобы модель помещалась при любом повороте карты и любом наклоне камеры: ширина — по самой дальней
  // от центра точке, высота — по самому высокому виду (5.1.30: у наклонённой карты наклон камеры свой у каждого места и меняется,
  // пока карта движется, — холст при этом не пересоздаётся, сдвигается только сама модель в нём)
  layout(v) {
    const h0 = this.models[v.kind].head;
    if (v.fitH) v.pxm = v.fitH / Math.max(h0.h, 0.5); // модель окна — во всю высоту места под неё
    const S = v.pxm;
    const pad = this.OUTLINE_PX / S + (h0.walk ? 0.12 : 0.02), r = h0.r + pad, h = h0.h + pad; // Ловчему — запас на шаг и наклон
    const w = Math.ceil(2 * r * S) + 2, hh = Math.ceil(Math.hypot(h, 2 * r) * S) + 2;
    const dpr = Gfx.dpr(2.5) * (v.res || 1); // 5.1.32: крупная у камеры фигура — больше точек (sharp); 5.1.38: разрешение — Gfx
    Object.assign(v, { pw: Math.round(w * dpr), ph: Math.round(hh * dpr), w, hh, r });
    Object.assign(v.c, { width: v.pw, height: v.ph });
    Object.assign(v.c.style, { width: w + 'px', height: hh + 'px', left: (v.ax - w / 2).toFixed(1) + 'px' });
    v.ol = this.OUTLINE_PX / S / 0.03; // множитель толщины обводки модели (0,03 м → OUTLINE_PX на экране)
    this.place(v);
  },
  // камера под наклоном v.e°: где в холсте основание модели (точка привязки значка), проекция
  place(v) {
    const m = this.models[v.kind], S = v.pxm, a = v.e * Math.PI / 180, sn = Math.sin(a), cs = Math.cos(a);
    const w = v.w, hh = v.hh, oy = hh - 1 - v.r * sn * S;
    v.c.style.top = (v.ay - oy).toFixed(1) + 'px';
    // экран: x — вправо, y — вверх (модель наклонена к камере), z — глубина; ортографическая проекция
    const sx = 2 * S / w, sy = 2 * S / hh, y0 = 1 - 2 * oy / hh, D = 12;
    v.vp = new Float32Array([sx, 0, 0, 0, 0, sy * sn, cs / D, 0, 0, sy * cs, -sn / D, 0, 0, y0, 0, 1]);
    // значку — где у модели верх и низ (CSS-пиксели от верха значка): туда встают хранитель, флаг клана и звёзды (style.css)
    const ext = this.extent(m, v.e), box = v.c.parentElement;
    if (box) { box.style.setProperty('--m3d-top', (v.ay - ext.top * S).toFixed(1) + 'px'); box.style.setProperty('--m3d-bot', (v.ay - ext.low * S).toFixed(1) + 'px'); box._m3dBot = +(v.ay - ext.low * S).toFixed(1); }
    if (!v.player && !v.ui && typeof MapView !== 'undefined' && MapView.lblSoon) MapView.lblSoon(); // подпись места — под низ модели
  },
  /* 5.1.30: откуда игрок смотрит на место. Наклонённая карта видна в перспективе (MapView.camOf): место у нижнего края экрана —
     почти сверху, у горизонта — сбоку, левее и правее середины — чуть сбоку; модель рисуется с той же стороны — стоит на земле
     так же, как дома вокруг; и сам Ловчий. Плоская карта — как раньше, под ELEV°. Пересчёт — при каждом сдвиге карты (aim) */
  // 5.1.31: модели, которые и так рисуются кадрами движения (вихрь, пламя — до FPS в секунду), поворачиваются к игроку с ближайшим
  // своим кадром (не позже 1000/FPS мс) — новый угол и сдвиг в значке вместе с ним; остальные — сразу, одной пачкой
  aim() {
    if (!this.on) return;
    const busy = !!(this.raf || this.tmo), now = [];
    for (const v of this.views) {
      if (!v.ready) continue;
      const big = this.sharp(v), later = !big && busy && v.vis && !v.player && this.live(v); // холст новый (пустой) — кадр сразу
      if ((this.aimView(v, later) || big) && v.vis && !later) now.push(v);
    }
    if (now.length) this.drawSet(now);
  },
  /* 5.1.32: фигура у камеры крупнее (MapView.figScale — до FIG_MAX раз): холсту модели — больше точек, чтобы крупная модель
     не расплывалась (и меньше, когда снова мелкая; с запасом — без перескоков туда-обратно). true — холст новый: рисовать сразу */
  sharp(v) {
    const ic = v.ic || (v.ic = v.c.closest('.maplibregl-marker'));
    const S = ic && typeof MapView !== 'undefined' && MapView.tilt ? (ic._g || 1) * (ic._f || 1) : 1, r = v.res || 1;
    const up = S > 1.75 ? 2 : S > 1.2 ? 1.5 : 1, down = S < 1.05 ? 1 : S < 1.55 ? 1.5 : 2, want = up > r ? up : down < r ? down : r;
    if (want === r) return false;
    v.res = want;
    this.layout(v);
    return true;
  },
  // later — новый угол отложить до следующего кадра модели (render)
  aimView(v, later) {
    if (v.ui) return false; // модель окна — своя камера
    const c = typeof MapView !== 'undefined' && MapView.camOf ? MapView.camOf(v.c) : null;
    const e = c ? c.e : this.ELEV, az = c ? c.az : 0;
    if (Math.abs(e - v.e) < 0.5 && Math.abs(az - v.az) < 0.009) { v.pe = null; return false; } // меньше полуградуса — на экране не видно
    if (later) { v.pe = e; v.pa = az; return true; }
    v.e = e; v.az = az; v.pe = null;
    if (v.ready) this.place(v);
    return true;
  },

  /* ---------- Ловчий ---------- */
  // поворот (heading — градусы от севера по часовой), походка (gait) и облик (look) Ловчего игрока; карта зовёт на каждом шаге
  setMe(o) {
    if ('look' in o) { this.me.tint = this.tintOf(o.look); this.me.kind = this.kindOfLook(o.look); }
    if (Number.isFinite(o.heading)) this.me.heading = o.heading;
    if ('gait' in o) this.me.gait = o.gait | 0;
    for (const v of this.views) if (v.player) this.applyMe(v);
    // «Экономия батареи» и «Меньше движения»: Ловчий не шагает, но поворачивается и меняет цвета — кадр не чаще 5 раз в секунду
    if (this.on && this.still() && !document.hidden && !(typeof Stage !== 'undefined' && Stage.busy)) {
      const now = performance.now();
      for (const v of this.views) if (v.player && v.ready && v.vis && now - (v.t || 0) > 200) this.draw(v, now);
    }
    this.kick();
  },
  still() { const b = document.body.classList; return b.contains('calm') || b.contains('eco'); },
  applyMe(v) {
    v.yaw = Math.PI - this.me.heading * Math.PI / 180; v.gait = this.me.gait; v.tint = this.me.tint;
    if (v.kind !== this.me.kind && this.has(this.me.kind)) this.swap(v, this.me.kind);
  },
  // наряд Ловчего по облику: у скина — свой (если такой модели нет — обычный капюшон)
  // 5.1.41: облик снят с продажи (LOOK.skin off) — обычный; у облика-модели (m3d) — своя модель (Синий дух — spirit_blue)
  kindOfLook(look) {
    const s = look && look.skin;
    if (typeof s !== 'string' || s === 'hood') return 'catcher';
    const x = typeof LOOK !== 'undefined' ? LOOK.skin.find(k => k.id === s) : null;
    if (x && x.off) return 'catcher';
    if (x && x.m3d) return x.m3d;
    return this.SKINS.includes(s) ? 'catcher_' + s : s.startsWith('spirit_') && this.SPIRITS.includes(s.slice(7)) ? s : 'catcher';
  },
  /* 5.1.41: облик Ловчего моделью в окне (профиль, Гардероб, карточка друга): стоит и дышит, вполоборота к игроку, поворачивается
     пальцем; анимация — и под открытым окном (карта в это время стоит). Нет WebGL или модели — прежний рисунок (Art.avatar).
     o: { yaw — поворот (рад, 0 — лицом к игроку), e — наклон камеры (°), cls } */
  stage(look, o = {}) {
    const kind = this.kindOfLook(look), flat = typeof Art !== 'undefined' ? `<div class="m3d-flat">${Art.avatar(look)}</div>` : '';
    const cv = this.on && this.has(kind) ? `<canvas class="mk3d" data-m3d="${kind}" data-ui="1" data-yaw="${o.yaw == null ? -0.35 : o.yaw}" data-e="${o.e == null ? 8 : o.e}"></canvas>` : '';
    return `<div class="m3d-stage${o.cls ? ' ' + o.cls : ''}" data-kind="${kind}">${flat}${cv}</div>`;
  },
  // модели окон — когда окно уже на странице: размер берётся у места под модель (модель — во всю его высоту, ступни — у низа)
  mount(root, tries = 0) {
    if (!this.on || !root) return;
    requestAnimationFrame(() => root.querySelectorAll('.m3d-stage').forEach(st => {
      const c = st.querySelector('canvas.mk3d'), w = st.clientWidth, h = st.clientHeight;
      if (!c || c._m3d || !st.isConnected) return;
      if (!w || !h) { if (tries < 20) setTimeout(() => this.mount(root, tries + 1), 120); return; } // окно ещё раскладывается — позже
      Object.assign(c.dataset, { ax: (w / 2).toFixed(1), ay: (h * 0.97).toFixed(1), fit: (h * 0.88).toFixed(1) });
      this.add(c);
      let x0 = null, y0 = 0; // поворот пальцем (или мышью): влево-вправо — вокруг себя
      st.addEventListener('pointerdown', e => { const v = c._m3d; if (!v) return; x0 = e.clientX; y0 = v.yaw; try { st.setPointerCapture(e.pointerId); } catch (x) { /* нет — и ладно */ } });
      st.addEventListener('pointermove', e => { const v = c._m3d; if (x0 == null || !v) return; v.yaw = y0 + (e.clientX - x0) * 0.014; this.kick(); });
      const up = () => { x0 = null; };
      st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
    }));
  },
  // сменился облик — другая модель в том же холсте: пока она грузится, стоит прежний кадр
  swap(v, kind) {
    v.kind = kind; v.ready = false; v.c.dataset.m3d = kind;
    this.need(kind).then(ok => {
      if (!ok || !v.c.isConnected || v.kind !== kind) return;
      this.layout(v); v.ready = true; v.walk = null;
      if (this.draw(v)) { v.c.classList.add('on'); if (v.c.parentElement) v.c.parentElement.classList.add('m3d'); }
      this.kick();
      if (typeof MapView !== 'undefined' && MapView.seeSoon) MapView.seeSoon(); // другой наряд — другой размер: за домом ли он
    });
  },
  // цвета облика → материалы модели: плащ и его тень (только у обычного наряда — у скинов свои цвета), глаза — у всех
  tintOf(look) {
    look = look || {};
    const hex = x => typeof x === 'string' && /^#[0-9a-f]{6}$/i.test(x);
    const c = this.lin(hex(look.cloak) ? look.cloak : '#6d28d9'), e = this.lin(hex(look.eyes) ? look.eyes : '#5eead4');
    return { catcher_cloak: { c, e: [0, 0, 0] }, catcher_cloak_dark: { c: c.map(x => x * 0.27), e: [0, 0, 0] }, catcher_eyes: { c: e, e: e.map(x => x * 1.6) } };
  },
  // шаг походки к моменту now: фаза шага идёт со скоростью походки, размах плавно растёт и гаснет (остановился — руки и ноги
  // возвращаются, а не замирают на полушаге), бег — плавно из ходьбы. Куда смотрит: идёт — по ходу (разворачивается быстро);
  // постоял 3 с — не спеша поворачивается лицом к игроку (к низу экрана; при повороте карты — тоже)
  step(v, now) {
    const w = v.walk || (v.walk = { ph: 0, amp: 0, run: 0, t: 0, last: now, idle: 99, yaw: null });
    const dt = Math.min(0.1, Math.max(0, (now - w.last) / 1000)), k = Math.min(1, dt * 7), W = this.WALK;
    w.last = now; w.t += dt;
    w.amp += ((v.gait > 0 ? 1 : 0) - w.amp) * k;
    w.run += ((v.gait === 2 ? 1 : 0) - w.run) * k;
    if (w.amp > 0.01) w.ph = (w.ph + dt * 2 * Math.PI * (W.hz[0] + (W.hz[1] - W.hz[0]) * w.run)) % (2 * Math.PI * 64);
    w.idle = v.gait > 0 ? 0 : (w.idle || 0) + dt;
    const want = v.ui || v.gait > 0 || w.idle < 3 ? (v.yaw || 0) : this.rot * Math.PI / 180;
    if (w.yaw == null || v.ui) w.yaw = want; // в окне — сразу за пальцем
    let d = (want - w.yaw) % (2 * Math.PI);
    if (d > Math.PI) d -= 2 * Math.PI; else if (d < -Math.PI) d += 2 * Math.PI;
    w.yaw += d * Math.min(1, dt * (v.gait > 0 ? 14 : 4));
    w.turn = Math.abs(d) > 0.02;
    if (this.still()) Object.assign(w, { amp: 0, run: 0, yaw: want, turn: false }); // без шага и плавного разворота
    return w;
  },
  rot3(ax, a) { // поворот вокруг оси x или y, 4×4 по столбцам
    const c = Math.cos(a), s = Math.sin(a);
    return ax === 'x' ? new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]) : new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
  },
  at(M, x, y, z) { M[12] = x; M[13] = y; M[14] = z; return M; },
  // шарниры походки: туловище подскакивает дважды за шаг, наклоняется вперёд (сильнее на бегу) и покачивается с ноги на ногу;
  // ноги — от бёдер, левая и правая в противофазе; руки — от плеч, вместе с туловищем, против своей ноги
  walkMat(g, gs, G, w) {
    const W = this.WALK, A = w.amp, R = w.run, mix = a => a[0] + (a[1] - a[0]) * R, sp = Math.sin(w.ph);
    if (g.t === 'leg') return this.at(this.rot3('x', g.s * sp * mix(W.leg) * A), g.o[0], g.o[1], g.o[2]);
    if (g.t === 'body') {
      const breath = (1 - A) * 0.006 * Math.sin(w.t * 2.2);
      const dz = A * mix(W.bob) * (1 - Math.cos(2 * w.ph)) / 2 + breath;
      return this.at(this.mul(this.rot3('x', A * mix(W.lean)), this.rot3('y', A * 0.05 * sp)), g.o[0], g.o[1], g.o[2] + dz);
    }
    const ob = gs[g.pb].o, sway = (1 - A) * 0.03 * Math.sin(w.t * 2.2 + g.s);
    const arm = this.at(this.rot3('x', -g.s * sp * mix(W.arm) * A + sway), g.o[0] - ob[0], g.o[1] - ob[1], g.o[2] - ob[2]);
    return this.mul(G[g.pb], arm);
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
  draw(v, now) { return this.drawSet([v], now) > 0; },
  /* 5.1.31: модели — пачкой: каждая в своей клетке общего холста (CELLS), копии в холсты значков — после всех. Копия ждёт, пока
     видеокарта дорисует кадр; раньше так ждала каждая модель отдельно (на ходу — больше сотни раз в секунду), теперь — один раз
     на пачку. Каждая модель рисуется так же, как раньше, только в другом месте общего холста */
  CELLS: [3, 2],
  drawSet(list, now) {
    if (this.lost) return 0;
    const vs = list.filter(v => { const m = this.models[v.kind]; return m && m.ready && v.c.isConnected; });
    if (!vs.length) return 0;
    now = now || performance.now();
    const [C, R] = this.CELLS, N = C * R, cv = this.cv;
    let cw = 0, ch = 0;
    for (const v of vs) { cw = Math.max(cw, v.pw); ch = Math.max(ch, v.ph); }
    const cols = Math.min(C, vs.length), rows = Math.min(R, Math.ceil(vs.length / C));
    if (cv.width < cols * cw || cv.height < rows * ch) { cv.width = Math.max(cv.width, cols * cw); cv.height = Math.max(cv.height, rows * ch); }
    for (let i = 0; i < vs.length; i += N) {
      const pass = vs.slice(i, i + N);
      pass.forEach((v, j) => this.render(v, now, (j % C) * cw, Math.floor(j / C) * ch));
      // кадры — в холсты значков (WebGL считает снизу вверх: клетка (x, y) — от нижнего левого угла общего холста)
      for (const v of pass) {
        const W = v.pw, H = v.ph;
        v.ctx.clearRect(0, 0, W, H);
        v.ctx.drawImage(cv, v.slot[0], cv.height - v.slot[1] - H, W, H, 0, 0, W, H);
        v.t = now;
      }
    }
    return vs.length;
  },
  // кадр модели — в клетку (x, y) общего холста
  render(v, now, x, y) {
    const gl = this.gl, m = this.models[v.kind];
    if (m.gen !== this.gen) this.upload(m);
    if (v.pe != null) { v.e = v.pe; v.az = v.pa; v.pe = null; this.place(v); } // отложенный поворот к игроку (aim) — с этим кадром
    const t = now / 1000, W = v.pw, H = v.ph;
    v.slot = [x, y];
    gl.viewport(x, y, W, H);
    gl.enable(gl.SCISSOR_TEST); gl.scissor(x, y, W, H);
    gl.clearColor(0, 0, 0, 0); gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    // поворот вместе с картой (и у Ловчего — туда, куда он смотрит)
    const h0 = m.head, w = h0.walk ? this.step(v, now) : null, G = [];
    v.ya = v.ui ? 0 : -this.rot * Math.PI / 180 + (v.az || 0); // поворот модели на экране (без шага Ловчего) — для setRot; в окне — без карты
    const a = v.ya + (w ? w.yaw : 0), ca = Math.cos(a), sa = Math.sin(a);
    const Y = new Float32Array([ca, sa, 0, 0, -sa, ca, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    if (h0.skin) { this.renderSkin(v, m, w, Y); return; }
    h0.groups.forEach((g, i) => G.push(g.t === 'static' ? null : w && (g.t === 'body' || g.t === 'leg' || g.t === 'arm') ? this.walkMat(g, h0.groups, G, w) : this.groupMat(g, i, t)));
    const Ms = G.map(M => M ? this.mul(Y, M) : Y);
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
    // 2) сама модель: сначала непрозрачное, потом полупрозрачное (вода, пламя, туман, тень) — без записи глубины
    u = this.P.u;
    gl.useProgram(this.P.p);
    gl.cullFace(gl.BACK);
    gl.uniformMatrix4fv(u.uVP, false, v.vp); gl.uniform3f(u.uQ0, q[0], q[1], q[2]); gl.uniform3f(u.uQs, q[3], q[4], q[5]);
    const L = this.lights, e = v.e * Math.PI / 180;
    gl.uniform3fv(u.uL0, L[0].d); gl.uniform3fv(u.uL1, L[1].d); gl.uniform3fv(u.uL2, L[2].d);
    gl.uniform3fv(u.uC0, L[0].c); gl.uniform3fv(u.uC1, L[1].c); gl.uniform3fv(u.uC2, L[2].c);
    gl.uniform3fv(u.uAmb, this.amb); gl.uniform3f(u.uV, 0, -Math.cos(e), Math.sin(e));
    for (const pass of [false, true]) {
      if (pass) { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); }
      for (const p of h0.prims) {
        if (p.blend !== pass || !vis(p)) continue;
        const mt = h0.mats[p.m], tn = v.tint && v.tint[mt.n]; // цвета облика Ловчего — поверх цветов модели
        if (mt.ds) gl.disable(gl.CULL_FACE); else gl.enable(gl.CULL_FACE);
        gl.uniformMatrix4fv(u.uM, false, Ms[p.g]); gl.uniformMatrix3fv(u.uN, false, Ns[p.g]);
        gl.uniform3fv(u.uBase, tn ? tn.c : mt.c); gl.uniform3fv(u.uEmit, tn ? tn.e : mt.e);
        gl.uniform1f(u.uAlpha, mt.a); gl.uniform1f(u.uRough, mt.ro); gl.uniform1f(u.uMetal, mt.mt);
        bindAttr(0, m.bp, gl.SHORT, false, p.v[0] * 8); bindAttr(1, m.bn, gl.BYTE, true, p.v[0] * 4);
        if (p.c != null && m.bc) bindAttr(2, m.bc, gl.UNSIGNED_BYTE, true, p.c * 4);
        else { gl.disableVertexAttribArray(2); gl.vertexAttrib4f(2, 1, 1, 1, 1); }
        gl.drawElements(gl.TRIANGLES, p.i[1], gl.UNSIGNED_SHORT, p.i[0] * 2);
      }
    }
    gl.depthMask(true); gl.disable(gl.BLEND);
  },

  /* 5.1.40: позы клипов к этому кадру: стоит — своим временем; шаг и бег — общей фазой шага (переход из шага в бег — без рывка,
     ноги на той же фазе); веса — по плавным размаху (amp) и бегу (run) походки (step) */
  pose(v, m, w) {
    const nb = m.head.skin.nb, C = m.clips, n = nb * 12, out = v.bones || (v.bones = new Float32Array(this.MAXB * 12));
    const st = v.anim || (v.anim = { u: 0, t: w.t });
    const dur = C.walk.dur + (C.run.dur - C.walk.dur) * w.run, dt = Math.max(0, w.t - st.t);
    st.t = w.t;
    if (w.amp > 0.01) st.u = (st.u + dt / dur) % 1;
    out.fill(0, 0, n);
    const add = (c, u, k) => {
      if (k < 0.001) return;
      const f = u * c.n, f0 = Math.floor(f) % c.n, f1 = (f0 + 1) % c.n, s = f - Math.floor(f), A = c.m;
      for (let i = 0; i < n; i++) out[i] += k * (A[f0 * n + i] * (1 - s) + A[f1 * n + i] * s);
    };
    add(C.idle, (w.t / C.idle.dur) % 1, 1 - w.amp); add(C.walk, st.u, w.amp * (1 - w.run)); add(C.run, st.u, w.amp * w.run);
    return out;
  },
  renderSkin(v, m, w, Y) {
    const gl = this.gl, h0 = m.head, q = h0.q, P0 = h0.prims, mt = h0.mats[P0[0].m], B = this.pose(v, m, w);
    const N = new Float32Array([Y[0], Y[1], Y[2], Y[4], Y[5], Y[6], Y[8], Y[9], Y[10]]);
    const attr = (loc, b, size, type, norm, stride, off) => { gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, type, norm, stride, off); };
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.bi);
    // 1) обводка: задние грани раздутой по нормалям оболочки — после костей
    let u = this.SO.u;
    gl.useProgram(this.SO.p);
    gl.disable(gl.BLEND); gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT);
    gl.uniformMatrix4fv(u.uVP, false, v.vp); gl.uniformMatrix4fv(u.uM, false, Y); gl.uniform3f(u.uQ0, q[0], q[1], q[2]); gl.uniform3f(u.uQs, q[3], q[4], q[5]);
    gl.uniform3fv(u.uOC, this.OUTLINE); gl.uniform4fv(u['uB[0]'], B);
    for (const p of P0) { // части — каждая со своими вершинами (индексы — от первой вершины части)
      const o = p.v[0];
      gl.uniform1f(u.uOl, p.ol * v.ol);
      attr(0, m.bp, 4, gl.SHORT, false, 0, o * 8); attr(1, m.bo, 4, gl.BYTE, true, 0, o * 4);
      attr(2, m.bj, 4, gl.UNSIGNED_BYTE, false, 8, o * 8); attr(3, m.bj, 4, gl.UNSIGNED_BYTE, true, 8, o * 8 + 4);
      gl.drawElements(gl.TRIANGLES, p.i[1], gl.UNSIGNED_SHORT, p.i[0] * 2);
    }
    // 2) сама модель: цвет — из текстуры, свет — как у остальных моделей
    u = this.SP.u;
    gl.useProgram(this.SP.p);
    gl.cullFace(gl.BACK);
    if (mt.ds) gl.disable(gl.CULL_FACE); else gl.enable(gl.CULL_FACE);
    gl.uniformMatrix4fv(u.uVP, false, v.vp); gl.uniformMatrix4fv(u.uM, false, Y); gl.uniformMatrix3fv(u.uN, false, N);
    gl.uniform3f(u.uQ0, q[0], q[1], q[2]); gl.uniform3f(u.uQs, q[3], q[4], q[5]); gl.uniform4fv(u['uB[0]'], B);
    const L = this.lights, e = v.e * Math.PI / 180;
    gl.uniform3fv(u.uL0, L[0].d); gl.uniform3fv(u.uL1, L[1].d); gl.uniform3fv(u.uL2, L[2].d);
    gl.uniform3fv(u.uC0, L[0].c); gl.uniform3fv(u.uC1, L[1].c); gl.uniform3fv(u.uC2, L[2].c);
    gl.uniform3fv(u.uAmb, this.amb); gl.uniform3f(u.uV, 0, -Math.cos(e), Math.sin(e));
    gl.uniform3fv(u.uBase, mt.c); gl.uniform3fv(u.uEmit, mt.e); gl.uniform1f(u.uAlpha, 1); gl.uniform1f(u.uRough, mt.ro); gl.uniform1f(u.uMetal, mt.mt);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, m.tex); gl.uniform1i(u.uTex, 0);
    for (const p of P0) {
      const o = p.v[0];
      attr(0, m.bp, 4, gl.SHORT, false, 0, o * 8); attr(1, m.bn, 4, gl.BYTE, true, 0, o * 4); attr(2, m.bu, 2, gl.UNSIGNED_SHORT, true, 0, o * 4);
      attr(3, m.bj, 4, gl.UNSIGNED_BYTE, false, 8, o * 8); attr(4, m.bj, 4, gl.UNSIGNED_BYTE, true, 8, o * 8 + 4);
      gl.drawElements(gl.TRIANGLES, p.i[1], gl.UNSIGNED_SHORT, p.i[0] * 2);
    }
    for (let i = 2; i <= 4; i++) gl.disableVertexAttribArray(i);
  },

  /* ---------- когда перерисовывать ---------- */
  prune() {
    for (const v of this.views) if (!v.c.isConnected) { this.views.delete(v); if (this.io) this.io.unobserve(v.c); v.c._m3d = null; }
  },
  // карта повернулась — модели тоже (MapView.setRot)
  setRot(r) {
    if (!this.on || r === this.rot) return;
    this.rot = r;
    this.prune();
    const due = [];
    for (const v of this.views) {
      if (!v.ready || v.ui) continue;
      const big = this.sharp(v), moved = this.aimView(v); // места левее и правее — видны с другой стороны (и ближе или дальше от камеры)
      // 5.1.31: модель места — заново, только если её поворот на экране изменился хотя бы на полградуса (тот же порог, что у aim)
      if (v.vis && (big || moved || v.player || v.ya == null || Math.abs(-r * Math.PI / 180 + (v.az || 0) - v.ya) >= 0.009)) due.push(v);
    }
    this.drawSet(due);
  },
  redraw() {
    if (!this.on) return;
    this.prune();
    this.drawSet([...this.views].filter(v => v.ready && v.vis));
  },
  moving() {
    if (document.hidden || this.still()) return false;
    for (const v of this.views) if (this.live(v)) return true;
    return false;
  },
  // движется Ловчий (всегда: идёт — шагает, стоит — дышит) и видимая модель места, до которого можно дотянуться
  // (у дальних значков — класс far): остальные — неподвижный кадр
  // 5.1.41: под окном (Stage.busy) карта стоит — живы только модели окон
  live(v) {
    if (!v.ready || !v.vis) return false;
    if (v.ui) return true;
    if (typeof Stage !== 'undefined' && Stage.busy) return false;
    return v.player || (this.models[v.kind].head.moving && !v.c.closest('.far'));
  },
  going(v) { return v.gait > 0 || !!(v.walk && (v.walk.amp > 0.02 || v.walk.turn)); },
  kick() {
    if (!this.on || this.raf || !this.moving()) return;
    if (this.tmo) { clearTimeout(this.tmo); this.tmo = 0; } // ждали следующего кадра моделей — что-то изменилось: кадр сразу
    this.raf = requestAnimationFrame(this.tick);
  },
  tick(now) {
    this.raf = 0;
    this.prune();
    if (!this.moving()) return;
    // Ловчий — 30 кадров в секунду на ходу, 10 — когда стоит
    let next = Infinity, places = false;
    const due = [], gaps = new Map();
    for (const v of this.views) {
      if (!this.live(v)) continue;
      if (!v.player && !v.ui) { places = true; continue; }
      const gap = (this.going(v) || v.ui ? 33 : 100) - 2; // модель в окне — плавно, 30 кадров
      if (now - (v.t || 0) >= gap) due.push(v);
      gaps.set(v, gap);
    }
    let n = 0;
    if (places && now - this.last >= 1000 / this.fps - 2) {
      this.last = now;
      for (const v of this.views) if (!v.player && this.live(v)) { due.push(v); n++; }
    }
    if (due.length) {
      const t0 = performance.now();
      this.drawSet(due, now);
      // кадр всех мест дороже 8 мс (слабый телефон) — реже, до 8 кадров в секунду; дешевле 4 мс — снова чаще
      if (n) {
        const dt = performance.now() - t0;
        this.cost = this.cost ? this.cost * 0.9 + dt * 0.1 : dt;
        this.fps = this.cost > 8 ? Math.max(8, this.fps - 1) : this.cost < 4 ? Math.min(this.FPS, this.fps + 1) : this.fps;
      }
    }
    for (const [v, gap] of gaps) next = Math.min(next, (v.t || 0) + gap);
    if (places) next = Math.min(next, this.last + 1000 / this.fps - 2);
    // 5.1.31: следующий кадр браузера — к следующей отрисовке моделей, а не на каждом обновлении экрана: каждый кадр браузера
    // (даже пустой) — работа главному потоку (пересчёт CSS-анимаций значков, слои), а модели рисуются 10–30 раз в секунду
    const wait = next - performance.now();
    if (wait > 12) this.tmo = setTimeout(() => { this.tmo = 0; if (!this.raf) this.raf = requestAnimationFrame(this.tick); }, wait - 6);
    else this.raf = requestAnimationFrame(this.tick);
  },
};
