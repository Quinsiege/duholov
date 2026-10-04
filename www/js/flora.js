/* 5.1.41: флора мира (выбор владельца: «камни, цветы и трава», деревья и кусты) — простые стилизованные модели (низкополигональные,
   цвет — по вершинам, строятся здесь же, без файлов) на рельефе вокруг Ловчего. Расстановка — по правилу от координат (у всех игроков
   одни и те же растения на тех же местах): сетка STEP метров, у каждой точки — свой хэш; в парках, лесах, на лугах (ZELEN) — деревья,
   кусты, цветы и трава гуще, на открытой земле — редкая трава, цветы и камни; на воде и на тропинках (ближе PATH к дороге) — ничего.
   Рисует слой MapLibre (custom, 3d — общая с рельефом глубина): каждый вид — один вызов на все его экземпляры (instancing, WebGL2).
   Сам по себе не перерисовывается (ветра нет): кадр — только когда движется камера. Размеры — «игровые», как у фигур (фигуры игры
   в ~40 раз крупнее настоящего масштаба карты): трава — треть роста Ловчего, деревья — выше него в несколько раз */
const Flora = {
  R: 320,        // радиус вокруг Ловчего, м
  STEP: 8,       // шаг сетки точек, м
  MOVE: 60,      // ушёл на столько от прошлой расстановки — новая
  PATH: 7,       // ближе к тропинке — пусто, м
  FADE: 0.8,     // с этой доли радиуса растения уменьшаются к краю (без резкой границы)
  ZELEN: /park|wood|forest|grass|meadow|nature|garden|scrub|cemetery|golf|village_green|farmland|allotments|orchard|recreation|heath/,
  BARE: /water|pedestrian|pier|parking|runway|aerodrome|industrial|railway|construction/,
  map: null, on: false, gl: null, prog: null, kinds: null, at: null, timer: 0,

  /* ---------- модели: треугольники в метрах (x, y — по земле, z — вверх), нормаль грани, цвет вершины ---------- */
  build() {
    const K = {}, rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);
    const mk = () => ({ p: [], n: [], c: [] });
    const tri = (g, a, b, c, ca, cb, cc) => {
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const l = Math.hypot(...n) || 1; n = n.map(x => x / l);
      g.p.push(...a, ...b, ...c); g.n.push(...n, ...n, ...n); g.c.push(...ca, ...(cb || ca), ...(cc || ca));
    };
    const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
    // многогранник «шар»: икосаэдр, вершины чуть сдвинуты (камень, крона)
    const ball = (g, cx, cy, cz, rx, ry, rz, col, jit) => {
      const t = (1 + Math.sqrt(5)) / 2, V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]]
        .map(v => { const l = Math.hypot(...v), j = 1 + (rnd() - 0.5) * jit; return [cx + v[0] / l * rx * j, cy + v[2] / l * ry * j, cz + v[1] / l * rz * j]; });
      const F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
      for (const [a, b, c] of F) tri(g, V[a], V[c], V[b], col.map(x => x * (0.9 + rnd() * 0.2)));
    };
    const prism = (g, cx, cy, z0, z1, r0, r1, sides, col, top) => { // ствол, конус кроны
      for (let i = 0; i < sides; i++) {
        const a0 = i / sides * 6.2832, a1 = (i + 1) / sides * 6.2832;
        const p = (a, r, z) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r, z];
        tri(g, p(a0, r0, z0), p(a1, r0, z0), p(a1, r1, z1), col); if (r1 > 0) tri(g, p(a0, r0, z0), p(a1, r1, z1), p(a0, r1, z1), col);
        if (top) tri(g, p(a0, r1, z1), p(a1, r1, z1), [cx, cy, z1], col);
      }
    };
    // трава: 5 травинок (от тёмного основания к светлому кончику), с двух сторон
    { const g = mk(), dark = hex('#3f8f3a'), lite = hex('#9be36a');
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * 6.2832 + rnd(), h = 3 + rnd() * 1.6, w = 0.45, lx = Math.cos(a) * 1.1, ly = Math.sin(a) * 1.1;
        const b0 = [Math.cos(a + 1.57) * w, Math.sin(a + 1.57) * w, 0], b1 = [-b0[0], -b0[1], 0], tip = [lx, ly, h];
        tri(g, b0, b1, tip, dark, dark, lite); tri(g, b1, b0, tip, dark, dark, lite);
      }
      K.grass = g; }
    // цветы трёх цветов: стебель и пять лепестков вокруг середины
    for (const [name, petal] of [['flower_r', '#ff6f91'], ['flower_y', '#ffd84a'], ['flower_b', '#86a8ff']]) {
      const g = mk(), stem = hex('#4f9a3e'), pc = hex(petal), mid = hex('#fff3b0'), h = 3.2;
      tri(g, [-0.15, 0, 0], [0.15, 0, 0], [0, 0, h], stem); tri(g, [0.15, 0, 0], [-0.15, 0, 0], [0, 0, h], stem);
      for (let i = 0; i < 5; i++) {
        const a0 = i / 5 * 6.2832, a1 = a0 + 0.9, r = 1.1;
        tri(g, [0, 0, h], [Math.cos(a0) * r, Math.sin(a0) * r, h + 0.25], [Math.cos(a1) * r, Math.sin(a1) * r, h + 0.25], mid, pc, pc);
      }
      ball(g, 0, 0, h + 0.35, 0.35, 0.35, 0.3, mid, 0);
      K[name] = g; }
    // камень: приплюснутый неровный многогранник
    { const g = mk(); ball(g, 0, 0, 1.2, 3, 2.4, 1.8, hex('#9aa0a8'), 0.45); K.rock = g; }
    // куст: две кроны рядом
    { const g = mk(), c = hex('#4fa046'); ball(g, -1.2, 0, 2.6, 3, 2.8, 2.6, c, 0.3); ball(g, 1.6, 0.6, 2.2, 2.4, 2.4, 2.2, c.map(x => x * 1.08), 0.3); K.bush = g; }
    // ель: ствол и три яруса конусов
    { const g = mk(), tr = hex('#7a5232'), nd = hex('#2f7a4a');
      prism(g, 0, 0, 0, 5, 1, 0.8, 5, tr, false);
      [[4, 16, 9], [12, 24, 7], [19, 32, 4.6]].forEach(([z0, z1, r], i) => prism(g, 0, 0, z0, z1, r, 0, 7, nd.map(x => x * (1 + i * 0.08)), false));
      K.pine = g; }
    // лиственное дерево: ствол и круглая крона
    { const g = mk(), tr = hex('#7a5232'), lf = hex('#5bb04a');
      prism(g, 0, 0, 0, 12, 1.3, 0.9, 5, tr, false);
      ball(g, 0, 0, 17, 9, 9, 8, lf, 0.25); ball(g, 3, 2, 21, 5.5, 5.5, 5, lf.map(x => x * 1.1), 0.25);
      K.tree = g; }
    for (const g of Object.values(K)) { g.p = new Float32Array(g.p); g.n = new Float32Array(g.n); g.c = new Float32Array(g.c); g.cnt = g.p.length / 3; }
    return K;
  },

  /* ---------- расстановка ---------- */
  // что растёт в точке: открытая земля, зелень (парк, лес, луг) или ничего (вода, площади)
  // h — хэш точки 0…1, z — зелень ли; ответ — вид или null
  pick(h, h2, green) {
    if (green) {
      if (h < 0.035) return h2 < 0.45 ? 'pine' : 'tree';
      if (h < 0.08) return 'bush';
      if (h < 0.2) return h2 < 0.34 ? 'flower_r' : h2 < 0.67 ? 'flower_y' : 'flower_b';
      if (h < 0.5) return 'grass';
      return null;
    }
    // 5.1.41: открытая земля — тоже живая (в центре города парков мало): кое-где деревья и кусты, камни, цветы, трава
    if (h < 0.012) return h2 < 0.5 ? 'tree' : 'pine';
    if (h < 0.04) return 'bush';
    if (h < 0.06) return 'rock';
    if (h < 0.13) return h2 < 0.34 ? 'flower_y' : h2 < 0.67 ? 'flower_r' : 'flower_b';
    if (h < 0.34) return 'grass';
    return null;
  },
  inPoly(x, y, rings) { // чётность пересечений по всем кольцам (дыры — тоже кольца)
    let ins = false;
    for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i], [xj, yj] = r[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins;
    }
    return ins;
  },
  polys(layer, test) { // многоугольники слоя карты, чей вид (kind) подходит, — с рамкой
    const out = [];
    for (const f of this.map.querySourceFeatures('pm', { sourceLayer: layer })) {
      const k = String((f.properties && (f.properties.kind || f.properties['pmap:kind'])) || layer);
      if (!test(k)) continue;
      const g = f.geometry, P = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
      for (const rings of P) {
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (const [x, y] of rings[0]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        out.push({ rings, x0, y0, x1, y1 });
      }
    }
    return out;
  },
  /* высота земли — как у MapLibre (map.queryTerrainElevation), но быстро: тот на каждый запрос заново перебирает видимые плитки,
     чтобы выбрать уровень плиток высот; здесь уровень выбирается один раз на расстановку (тот же, что выбрал бы MapLibre) */
  elevFn() {
    const m = this.map, t = m.terrain;
    if (!t) return () => 0;
    if (!t.getElevationForLngLatZoom || !t.getElevationForLngLat || !t.tileManager) return ll => m.queryTerrainElevation(ll) || 0;
    const c = m.getCenter(), want = t.getElevationForLngLat(c, m.transform);
    let z = t.tileManager.maxzoom;
    while (z > t.tileManager.minzoom && Math.abs(t.getElevationForLngLatZoom(c, z) - want) > 1e-6) z--;
    return ll => t.getElevationForLngLatZoom(new maplibregl.LngLat(ll[0], ll[1]), z) || 0;
  },
  // многоугольники — в клетки сетки по CELL м вокруг Ловчего (точка проверяется только по многоугольникам своей клетки)
  CELL: 40,
  index(list, lat, lng, kx, ky) {
    const C = this.CELL, R = this.R + C, g = new Map();
    const cx = x => Math.floor((x - lng) * kx / C), cy = y => Math.floor((y - lat) * ky / C);
    const lo = Math.floor(-R / C), hi = Math.floor(R / C);
    for (const p of list) {
      const x0 = Math.max(lo, cx(p.x0)), x1 = Math.min(hi, cx(p.x1)), y0 = Math.max(lo, cy(p.y0)), y1 = Math.min(hi, cy(p.y1));
      for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) { const k = i * 4096 + j; (g.get(k) || g.set(k, []).get(k)).push(p); }
    }
    return (x, y) => {
      const L = g.get(cx(x) * 4096 + cy(y));
      return !!L && L.some(p => x >= p.x0 && x <= p.x1 && y >= p.y0 && y <= p.y1 && this.inPoly(x, y, p.rings));
    };
  },
  // расстановка по шагам (генератор): place — целиком сразу, placeSoft — кусочками по SLICE мс между кадрами (ходьба не дёргается)
  * steps(lat, lng) {
    const m = this.map;
    if (!m || !m.getSource('pm')) return;
    const kx = 111320 * Math.cos(lat * Math.PI / 180), ky = 110540, C = 20, seg = new Map();
    const green = this.index(this.polys('landuse', k => this.ZELEN.test(k)).concat(this.polys('landcover', k => this.ZELEN.test(k))), lat, lng, kx, ky);
    yield;
    const bare = this.index(this.polys('water', () => true).concat(this.polys('landuse', k => this.BARE.test(k))), lat, lng, kx, ky);
    yield;
    // тропинки: отрезки — в клетки по 20 м (поиск ближних)
    const toM = (x, y) => [(x - lng) * kx, (y - lat) * ky];
    for (const f of m.querySourceFeatures('pm', { sourceLayer: 'roads' })) {
      const g = f.geometry, L = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : [];
      for (const line of L) for (let i = 1; i < line.length; i++) {
        const a = toM(...line[i - 1]), b = toM(...line[i]);
        if (Math.min(Math.abs(a[0]), Math.abs(b[0])) > this.R + 50 && a[0] * b[0] > 0) continue;
        const cx0 = Math.floor(Math.min(a[0], b[0]) / C), cx1 = Math.floor(Math.max(a[0], b[0]) / C), cy0 = Math.floor(Math.min(a[1], b[1]) / C), cy1 = Math.floor(Math.max(a[1], b[1]) / C);
        if ((cx1 - cx0 + 1) * (cy1 - cy0 + 1) > 400) continue;
        for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) { const key = cx + ':' + cy; (seg.get(key) || seg.set(key, []).get(key)).push([a, b]); }
      }
    }
    yield;
    const nearPath = (x, y) => {
      const s = seg.get(Math.floor(x / C) + ':' + Math.floor(y / C));
      if (!s) return false;
      for (const [a, b] of s) {
        const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l)) : 0;
        if (Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy) < this.PATH) return true;
      }
      return false;
    };
    const elev = this.elevFn();
    const S = this.STEP, dLat = S / ky, dLng = S / kx, out = {}, o0 = maplibregl.MercatorCoordinate.fromLngLat([lng, lat]);
    const i0 = Math.floor((lat - this.R / ky) / dLat), i1 = Math.ceil((lat + this.R / ky) / dLat);
    const j0 = Math.floor((lng - this.R / kx) / dLng), j1 = Math.ceil((lng + this.R / kx) / dLng);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const h = U.h('fl', i, j), h2 = U.h('fl2', i, j);
        if (h > 0.5) continue; // больше половины точек пусты при любом виде земли — не считаем дальше
        const la = (i + 0.2 + U.h('fy', i, j) * 0.6) * dLat, ln = (j + 0.2 + U.h('fx', i, j) * 0.6) * dLng;
        const [x, y] = toM(ln, la), d = Math.hypot(x, y);
        if (d > this.R) continue;
        if (bare(ln, la) || nearPath(x, y)) continue;
        const kind = this.pick(h, h2, green(ln, la));
        if (!kind) continue;
        const e = elev([ln, la]);
        const fade = d < this.R * this.FADE ? 1 : Math.max(0, (this.R - d) / (this.R * (1 - this.FADE)));
        const mc = maplibregl.MercatorCoordinate.fromLngLat([ln, la], e);
        // от точки отсчёта o0: числа малые — без дрожания (точность float)
        (out[kind] || (out[kind] = [])).push(mc.x - o0.x, mc.y - o0.y, mc.z, (0.8 + U.h('fs', i, j) * 0.45) * fade, U.h('fr', i, j) * 6.2832);
      }
      yield;
    }
    this.inst = out; this.o0 = o0;
    this.unit = maplibregl.MercatorCoordinate.fromLngLat([lng, lat]).meterInMercatorCoordinateUnits();
    this.at = { lat, lng };
    this.upload();
    m.triggerRepaint();
  },
  place(lat, lng) { for (const _ of this.steps(lat, lng)) { /* целиком */ } },
  SLICE: 6,
  placeSoft(lat, lng) {
    const run = this.run = this.steps(lat, lng); // новая расстановка отменяет начатую
    const tick = () => {
      if (this.run !== run) return;
      const t0 = performance.now();
      try {
        while (performance.now() - t0 < this.SLICE) if (run.next().done) { this.run = null; return; }
      } catch (e) { this.run = null; if (typeof Errors !== 'undefined') Errors.report('flora: ' + e.message, 'flora.js', 0); return; }
      setTimeout(tick, 0);
    };
    tick();
  },
  // Ловчий сдвинулся (MapView.drawAt) или пришли плитки карты — расставить заново, не чаще раза в полсекунды
  soon(force) {
    if (!this.on || !this.map) return;
    const p = MapView.shown || MapView.pos;
    if (!p) return;
    if (!force && this.at && U.dist(p.lat, p.lng, this.at.lat, this.at.lng) < this.MOVE) return;
    clearTimeout(this.timer);
    const wait = force ? Math.max(500, 2000 - (Date.now() - (this.t || 0))) : 50; // плитки ещё идут — не чаще раза в 2 с
    this.timer = setTimeout(() => { this.t = Date.now(); const q = MapView.shown || MapView.pos; this.placeSoft(q.lat, q.lng); }, wait);
  },

  /* ---------- отрисовка ---------- */
  VS: `#version 300 es
    in vec3 aPos; in vec3 aNrm; in vec3 aCol; in vec3 iPos; in vec2 iSR;
    uniform mat4 uMVP; uniform float uUnit; uniform vec3 uTint; out vec3 vCol;
    void main() {
      float c = cos(iSR.y), s = sin(iSR.y);
      vec3 p = vec3(c * aPos.x - s * aPos.y, s * aPos.x + c * aPos.y, aPos.z) * iSR.x;
      vec3 n = vec3(c * aNrm.x - s * aNrm.y, s * aNrm.x + c * aNrm.y, aNrm.z);
      float l = 0.62 + 0.38 * max(dot(n, normalize(vec3(-0.4, -0.55, 0.75))), 0.0) + 0.12 * abs(n.z);
      vCol = aCol * l * uTint;
      // метры → единицы меркатора; у меркатора y — вниз (к югу), у модели — на север
      gl_Position = uMVP * vec4(iPos + vec3(p.x, -p.y, p.z) * uUnit, 1.0);
    }`,
  FS: `#version 300 es
    precision mediump float; in vec3 vCol; out vec4 o;
    void main() { o = vec4(vCol, 1.0); }`,
  upload() {
    const gl = this.gl;
    if (!gl || !this.kinds) return;
    for (const [k, g] of Object.entries(this.kinds)) {
      const d = new Float32Array(this.inst && this.inst[k] ? this.inst[k] : []);
      g.n = d.length / 5;
      gl.bindBuffer(gl.ARRAY_BUFFER, g.bi); gl.bufferData(gl.ARRAY_BUFFER, d, gl.DYNAMIC_DRAW);
    }
  },
  layer() {
    const self = this;
    return {
      id: 'flora', type: 'custom', renderingMode: '3d',
      onAdd(map, gl) {
        if (!(typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext)) { self.gl = null; return; }
        self.gl = gl;
        const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
        const p = gl.createProgram();
        gl.attachShader(p, sh(gl.VERTEX_SHADER, self.VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, self.FS)); gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { self.gl = null; return; }
        self.prog = { p, mvp: gl.getUniformLocation(p, 'uMVP'), unit: gl.getUniformLocation(p, 'uUnit'), tint: gl.getUniformLocation(p, 'uTint') };
        const L = n => gl.getAttribLocation(p, n), at = { pos: L('aPos'), nrm: L('aNrm'), col: L('aCol'), ip: L('iPos'), isr: L('iSR') };
        self.kinds = self.kinds || self.build();
        for (const g of Object.values(self.kinds)) {
          g.vao = gl.createVertexArray(); gl.bindVertexArray(g.vao);
          const buf = (data, loc, n) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0); };
          buf(g.p, at.pos, 3); buf(g.n, at.nrm, 3); buf(g.c, at.col, 3);
          g.bi = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, g.bi);
          gl.enableVertexAttribArray(at.ip); gl.vertexAttribPointer(at.ip, 3, gl.FLOAT, false, 20, 0); gl.vertexAttribDivisor(at.ip, 1);
          gl.enableVertexAttribArray(at.isr); gl.vertexAttribPointer(at.isr, 2, gl.FLOAT, false, 20, 12); gl.vertexAttribDivisor(at.isr, 1);
          gl.bindVertexArray(null);
        }
        self.upload();
      },
      render(gl, o) {
        if (!self.gl || !self.prog || !self.unit || !self.o0) return;
        // матрица MapLibre для координат меркатора (0…1) с учётом рельефа (mainMatrix; modelViewProjectionMatrix рельефа не знает —
        // растения уходили под землю); наши позиции — от точки отсчёта o0: M · T(o0), в double
        const P = o.defaultProjectionData ? o.defaultProjectionData.mainMatrix : o, O = self.o0;
        const A = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, O.x, O.y, 0, 1], M = new Float32Array(16);
        for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let v = 0; for (let k = 0; k < 4; k++) v += P[k * 4 + r] * A[c * 4 + k]; M[c * 4 + r] = v; }
        gl.useProgram(self.prog.p);
        gl.uniformMatrix4fv(self.prog.mvp, false, M);
        gl.uniform1f(self.prog.unit, self.unit);
        gl.uniform3fv(self.prog.tint, MapView.night ? [0.55, 0.7, 0.82] : [1, 1, 1]);
        // глубина — только между растениями: глубина рельефа MapLibre с этим слоем несовместима (с ней пропадали даже верхушки деревьев);
        // холм не прячет растение за собой — флора лишь в R вокруг Ловчего, там это почти не бывает
        gl.depthMask(true); gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
        for (const g of Object.values(self.kinds)) if (g.n) { gl.bindVertexArray(g.vao); gl.drawArraysInstanced(gl.TRIANGLES, 0, g.cnt, g.n); }
        gl.bindVertexArray(null);
      },
    };
  },
  // карта готова или сменила стиль (день/ночь: setStyle убирает свои слои) — слой флоры на место, под подписи
  attach(map) {
    this.map = map; this.on = true;
    const add = () => {
      if (!MapView.WORLD || map.getLayer('flora') || !map.isStyleLoaded()) return;
      const lbl = (map.getStyle().layers || []).find(l => l.type === 'symbol');
      map.addLayer(this.layer(), lbl ? lbl.id : undefined);
      this.soon(true);
    };
    map.on('styledata', add);
    map.on('load', add);
    let wait = 0; // пришли плитки карты рядом — расставить с ними (лес, вода, тропинки)
    // и пришли плитки высот — растения на землю (до них высота неизвестна: стояли бы на нуле, под рельефом)
    map.on('sourcedata', e => { if ((e.sourceId === 'pm' || e.sourceId === 'dem') && e.isSourceLoaded) { clearTimeout(wait); wait = setTimeout(() => this.soon(true), 400); } });
  },
};
