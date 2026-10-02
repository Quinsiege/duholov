'use strict';
/* 5.1.30: дома карты — объёмные, в настоящую высоту, в WebGL и в реальном времени: камеру крутят, наклоняют, карта движется
   и меняет масштаб — стены и крыши сразу в верной перспективе. Один холст WebGL в своём слое карты (между зоной Ловчего
   и подписями) лежит на земле, как плитки; дом рисуется на нём «тенью на землю» из точки зрения игрока — после наклона карты
   (CSS) каждая точка крыши оказывается ровно там, где была бы настоящая (MapView.camLayer). Высота — из данных карты
   (height, min_height), в масштабе самой карты. Дома — из тех же плиток z15 (Protomaps), что у Hazard: крыши разбиты на
   треугольники (earcut), стены — по рёбрам; на видеокарту — один раз на кусок плитки, дальше кадр — только новые числа
   камеры. Рисуются лишь куски в кадре; дома строятся порциями (не дольше BUDGET мс подряд) — без рывков.
   Нет WebGL — дома плоские, как их рисует сама карта. */

// многоугольник с дырами → треугольники; алгоритм earcut (© Mapbox, лицензия ISC), без z-порядка — у домов вершин немного
const Earcut = {
  run(data, holes) {
    const outerLen = holes && holes.length ? holes[0] * 2 : data.length;
    let outer = this.list(data, 0, outerLen, true);
    const tri = [];
    if (!outer || outer.next === outer.prev) return tri;
    if (holes && holes.length) outer = this.holes(data, holes, outer);
    this.cut(outer, tri, 0);
    return tri;
  },
  node(i, x, y) { return { i, x, y, prev: null, next: null, steiner: false }; },
  insert(i, x, y, last) {
    const p = this.node(i, x, y);
    if (!last) { p.prev = p; p.next = p; } else { p.next = last.next; p.prev = last; last.next.prev = p; last.next = p; }
    return p;
  },
  remove(p) { p.next.prev = p.prev; p.prev.next = p.next; },
  list(data, start, end, clockwise) {
    let last, sum = 0;
    for (let i = start, j = end - 2; i < end; i += 2) { sum += (data[j] - data[i]) * (data[i + 1] + data[j + 1]); j = i; }
    if (clockwise === (sum > 0)) for (let i = start; i < end; i += 2) last = this.insert(i / 2, data[i], data[i + 1], last);
    else for (let i = end - 2; i >= start; i -= 2) last = this.insert(i / 2, data[i], data[i + 1], last);
    if (last && this.eq(last, last.next)) { this.remove(last); last = last.next; }
    return last;
  },
  filter(start, end) {
    if (!start) return start;
    if (!end) end = start;
    let p = start, again;
    do {
      again = false;
      if (!p.steiner && (this.eq(p, p.next) || this.area(p.prev, p, p.next) === 0)) {
        this.remove(p);
        p = end = p.prev;
        if (p === p.next) break;
        again = true;
      } else p = p.next;
    } while (again || p !== end);
    return end;
  },
  cut(ear, tri, pass) {
    if (!ear) return;
    let stop = ear;
    while (ear.prev !== ear.next) {
      const prev = ear.prev, next = ear.next;
      if (this.isEar(ear)) {
        tri.push(prev.i, ear.i, next.i);
        this.remove(ear);
        ear = next.next; stop = next.next;
        continue;
      }
      ear = next;
      if (ear === stop) {
        if (!pass) this.cut(this.filter(ear), tri, 1);
        else if (pass === 1) this.cut(this.cure(this.filter(ear), tri), tri, 2);
        else if (pass === 2) this.split(ear, tri);
        break;
      }
    }
  },
  isEar(ear) {
    const a = ear.prev, b = ear, c = ear.next;
    if (this.area(a, b, c) >= 0) return false;
    const x0 = Math.min(a.x, b.x, c.x), y0 = Math.min(a.y, b.y, c.y), x1 = Math.max(a.x, b.x, c.x), y1 = Math.max(a.y, b.y, c.y);
    for (let p = c.next; p !== a; p = p.next) {
      if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && this.inTri(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) && this.area(p.prev, p, p.next) >= 0) return false;
    }
    return true;
  },
  cure(start, tri) {
    let p = start;
    do {
      const a = p.prev, b = p.next.next;
      if (!this.eq(a, b) && this.cross(a, p, p.next, b) && this.locIn(a, b) && this.locIn(b, a)) {
        tri.push(a.i, p.i, b.i);
        this.remove(p); this.remove(p.next);
        p = start = b;
      }
      p = p.next;
    } while (p !== start);
    return this.filter(p);
  },
  split(start, tri) {
    let a = start;
    do {
      for (let b = a.next.next; b !== a.prev; b = b.next) {
        if (a.i !== b.i && this.valid(a, b)) {
          let c = this.splitPoly(a, b);
          a = this.filter(a, a.next); c = this.filter(c, c.next);
          this.cut(a, tri, 0); this.cut(c, tri, 0);
          return;
        }
      }
      a = a.next;
    } while (a !== start);
  },
  holes(data, holes, outer) {
    const q = [];
    for (let i = 0; i < holes.length; i++) {
      const s = holes[i] * 2, e = i < holes.length - 1 ? holes[i + 1] * 2 : data.length, l = this.list(data, s, e, false);
      if (!l) continue;
      if (l === l.next) l.steiner = true;
      let p = l, m = l;
      do { if (p.x < m.x || (p.x === m.x && p.y < m.y)) m = p; p = p.next; } while (p !== l);
      q.push(m);
    }
    q.sort((a, b) => a.x - b.x);
    for (const h of q) {
      const br = this.bridge(h, outer);
      if (!br) continue;
      const rev = this.splitPoly(br, h);
      this.filter(rev, rev.next);
      outer = this.filter(br, br.next);
    }
    return outer;
  },
  bridge(hole, outer) {
    let p = outer, hx = hole.x, hy = hole.y, qx = -Infinity, m;
    do {
      if (hy <= p.y && hy >= p.next.y && p.next.y !== p.y) {
        const x = p.x + (hy - p.y) * (p.next.x - p.x) / (p.next.y - p.y);
        if (x <= hx && x > qx) { qx = x; m = p.x < p.next.x ? p : p.next; if (x === hx) return m; }
      }
      p = p.next;
    } while (p !== outer);
    if (!m) return null;
    const stop = m, mx = m.x, my = m.y;
    let tanMin = Infinity;
    p = m;
    do {
      if (hx >= p.x && p.x >= mx && hx !== p.x && this.inTri(hy < my ? hx : qx, hy, mx, my, hy < my ? qx : hx, hy, p.x, p.y)) {
        const tan = Math.abs(hy - p.y) / (hx - p.x);
        if (this.locIn(p, hole) && (tan < tanMin || (tan === tanMin && (p.x > m.x || (p.x === m.x && this.area(m.prev, m, p.prev) < 0 && this.area(p.next, m, m.next) < 0))))) { m = p; tanMin = tan; }
      }
      p = p.next;
    } while (p !== stop);
    return m;
  },
  inTri(ax, ay, bx, by, cx, cy, px, py) {
    return (cx - px) * (ay - py) >= (ax - px) * (cy - py) && (ax - px) * (by - py) >= (bx - px) * (ay - py) && (bx - px) * (cy - py) >= (cx - px) * (by - py);
  },
  valid(a, b) {
    return a.next.i !== b.i && a.prev.i !== b.i && !this.crossPoly(a, b) &&
      ((this.locIn(a, b) && this.locIn(b, a) && this.midIn(a, b) && (this.area(a.prev, a, b.prev) || this.area(a, b.prev, b))) ||
        (this.eq(a, b) && this.area(a.prev, a, a.next) > 0 && this.area(b.prev, b, b.next) > 0));
  },
  area(p, q, r) { return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y); },
  eq(a, b) { return a.x === b.x && a.y === b.y; },
  cross(p1, q1, p2, q2) {
    const sg = v => (v > 0 ? 1 : v < 0 ? -1 : 0), on = (p, q, r) => q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) && q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
    const o1 = sg(this.area(p1, q1, p2)), o2 = sg(this.area(p1, q1, q2)), o3 = sg(this.area(p2, q2, p1)), o4 = sg(this.area(p2, q2, q1));
    return (o1 !== o2 && o3 !== o4) || (o1 === 0 && on(p1, p2, q1)) || (o2 === 0 && on(p1, q2, q1)) || (o3 === 0 && on(p2, p1, q2)) || (o4 === 0 && on(p2, q1, q2));
  },
  crossPoly(a, b) {
    let p = a;
    do {
      if (p.i !== a.i && p.next.i !== a.i && p.i !== b.i && p.next.i !== b.i && this.cross(p, p.next, a, b)) return true;
      p = p.next;
    } while (p !== a);
    return false;
  },
  locIn(a, b) {
    return this.area(a.prev, a, a.next) < 0 ? this.area(a, b, a.next) >= 0 && this.area(a, a.prev, b) >= 0 : this.area(a, b, a.prev) < 0 || this.area(a, a.next, b) < 0;
  },
  midIn(a, b) {
    let p = a, inside = false;
    const px = (a.x + b.x) / 2, py = (a.y + b.y) / 2;
    do {
      if ((p.y > py) !== (p.next.y > py) && p.next.y !== p.y && px < (p.next.x - p.x) * (py - p.y) / (p.next.y - p.y) + p.x) inside = !inside;
      p = p.next;
    } while (p !== a);
    return inside;
  },
  splitPoly(a, b) {
    const a2 = this.node(a.i, a.x, a.y), b2 = this.node(b.i, b.x, b.y), an = a.next, bp = b.prev;
    a.next = b; b.prev = a; a2.next = an; an.prev = a2; b2.next = a2; a2.prev = b2; bp.next = b2; b2.prev = bp;
    return b2;
  },
};


const Bld3D = {
  Z: 15, EXT: 512, CELL: 4,  // плитки данных z15 (как у Hazard, единиц на плитку); каждая — CELL×CELL кусков: рисуются только куски в кадре
  DPR: 1.5,                  // разрешение холста домов (заливки на телефоне дорогие, а у домов — простые цвета)
  MAXPX: 2.2e6,              // и не больше стольких точек холста (у наклона к горизонту видимая земля большая)
  BUDGET: 6,                 // мс подряд на постройку домов — дальше доделается в следующей порции
  NEAR: 2,                   // плитки дальше стольких от кадра — выбрасываются (видеопамять)
  FLOAT: 7,                  // чисел на вершину: x, y (плитка), верх (0 — низ стены, 1 — верх), высота дома и низ (м), нормаль стены x, y
  PAD: 220,                  // запас вокруг видимой земли, точки: высокий дом за краем экрана своим верхом заходит в кадр
  TOP: 0.8,                  // выше стольких высот точки зрения дом не рисуется выше (у самой точки зрения перспектива уходит в бесконечность)
  on: false, gl: null, cv: null, map: null, P: null, pal: null, tiles: new Map(), raf: 0, lost: false,

  init(map) {
    if (this.map || typeof protomapsL === 'undefined') return false;
    try {
      const cv = document.createElement('canvas');
      const gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: true, stencil: false, preserveDrawingBuffer: false });
      if (!gl) return false;
      Object.assign(this, { cv, gl, map });
      if (!this.programs()) { this.cv = this.gl = this.map = null; return false; }
      cv.className = 'bld3d leaflet-zoom-animated';
      cv.style.transformOrigin = '0 0';
      const pane = map.createPane('bld3d');
      pane.style.zIndex = 385; // над зоной Ловчего (380), под подписями (390)
      pane.style.pointerEvents = 'none';
      pane.appendChild(cv);
      map.on('move zoom viewreset resize', () => this.dirty());
      map.on('zoomanim', e => this.animZoom(e));
      map.on('zoomend', () => this.dirty());
      // видеокарта сбросила контекст — программы заново, дома — заново из плиток
      cv.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; });
      cv.addEventListener('webglcontextrestored', () => { this.lost = false; this.tiles.clear(); this.programs(); this.dirty(); });
      this.on = true;
      return true;
    } catch (e) { return false; }
  },

  /* ---------- высота ---------- */
  height(f) { return f.props.height > 0 ? f.props.height : 8; }, // м; без данных — трёхэтажный
  // точек слоя на метр — на этом масштабе и этой широте (как у самой карты)
  mpx(m = this.map) { return 256 * 2 ** m.getZoom() / (40075016.686 * Math.cos(m.getCenter().lat * Math.PI / 180)); },
  // дом высотой H (м) — в точках слоя, как его рисует слой домов (выше TOP высоты точки зрения — не выше)
  hpx(H) { const m = this.map || (typeof MapView !== 'undefined' && MapView.map); return m ? Math.min(H * this.mpx(m), this.TOP * MapView.camLayer().w) : 0; },

  /* ---------- шейдеры ---------- */
  // вершина: точка плитки → точка слоя карты → «тень на землю» из точки зрения на высоте настоящего дома → в оси экрана на
  // плоскости карты (холст повёрнут вместе с экраном: только видимая земля); глубина — расстояние до точки зрения
  VS: `attribute vec2 aPos; attribute vec4 aB; attribute float aMin;
    uniform vec2 uOrig, uPiv, uRot; uniform float uSc, uMpx, uTop; uniform vec3 uCam; uniform vec4 uView;
    varying vec4 vB;
    void main() {
      vec2 p = uOrig + aPos * uSc, r;
      float h = min(mix(aMin, aB.y, aB.x) * uMpx, uTop * uCam.z);
      vec2 g = uCam.xy + (p - uCam.xy) * uCam.z / (uCam.z - h);
      r = g - uPiv;
      vec2 c = (vec2(r.x * uRot.x - r.y * uRot.y, r.x * uRot.y + r.y * uRot.x) - uView.xy) / uView.zw * 2.0 - 1.0;
      gl_Position = vec4(c.x, -c.y, length(vec3(p - uCam.xy, uCam.z - h)) / (uCam.z * 12.0) * 2.0 - 1.0, 1.0);
      vB = aB;
    }`,
  // цвет: крыша; стена — светлее со стороны солнца и темнее у земли
  FS: `precision mediump float;
    uniform vec3 uRoof, uWall, uWall2; uniform vec2 uSun; uniform float uLight;
    varying vec4 vB;
    void main() {
      if (vB.z == 0.0 && vB.w == 0.0) { gl_FragColor = vec4(uRoof, 1.0); return; }
      vec3 c = mix(uWall, uWall2, clamp(0.5 + 0.5 * dot(vB.zw, uSun) * uLight, 0.0, 1.0));
      gl_FragColor = vec4(c * mix(0.8, 1.0, vB.x), 1.0);
    }`,
  programs() {
    const gl = this.gl;
    const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    const a = sh(gl.VERTEX_SHADER, this.VS), b = sh(gl.FRAGMENT_SHADER, this.FS);
    if (!a || !b) return false;
    const p = gl.createProgram();
    gl.attachShader(p, a); gl.attachShader(p, b);
    ['aPos', 'aB', 'aMin'].forEach((n, i) => gl.bindAttribLocation(p, i, n));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return false;
    const u = {};
    for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) { const nm = gl.getActiveUniform(p, i).name; u[nm] = gl.getUniformLocation(p, nm); }
    this.P = { p, u };
    return true;
  },

  /* ---------- цвета (палитра карты MapView.pal: днём — дневные, ночью — ночные) ---------- */
  rgb(s) { return [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16) / 255); },
  theme(F) {
    this.pal = { roof: this.rgb(F.roof), wall: this.rgb(F.wall), wall2: this.rgb(F.wall2), light: F.light };
    this.dirty();
  },

  /* ---------- кадр ---------- */
  dirty() { if (this.on && !this.raf) this.raf = requestAnimationFrame(() => { this.raf = 0; this.draw(); }); },
  // масштаб с анимацией (колесо, двойное касание): до конца анимации холст тянется вместе с плитками — точка слоя p
  // уезжает в p·sc + (старое начало пикселей)·sc − новое начало (как у Leaflet), сам кадр — прежний
  animZoom(e) {
    const m = this.map, sc = m.getZoomScale(e.zoom, m.getZoom()), t = m.getPixelOrigin().multiplyBy(sc).subtract(m._getNewPixelOrigin(e.center, e.zoom));
    if (this.own) this.cv.style.transform = `translate3d(${t.x}px, ${t.y}px, 0px) scale(${sc}) ` + this.own;
  },
  draw() {
    const gl = this.gl, m = this.map;
    if (!this.on || this.lost || !m || !m._loaded || m._animatingZoom || typeof MapView === 'undefined' || !MapView.camLayer) return; // масштаб анимируется — холст тянется (animZoom)
    // холст — в осях экрана на плоскости карты (повёрнут вместе с экраном), во всю видимую землю: раз в 5–8 меньше слоя карты
    const t0 = performance.now(), z = m.getZoom(), uv = MapView.viewUV(24), cw = uv.u1 - uv.u0, ch = uv.v1 - uv.v0;
    const piv = m.containerPointToLayerPoint(m.getSize().divideBy(2)), rot = MapView.rot || 0, r = rot * Math.PI / 180;
    const dpr = Math.min(window.devicePixelRatio || 1, this.DPR, Math.sqrt(this.MAXPX / (cw * ch)));
    const W = Math.max(1, Math.round(cw * dpr)), H = Math.max(1, Math.round(ch * dpr)), cv = this.cv;
    // 5.1.31: буфер холста не пересоздаётся на каждом кадре жеста (наклон меняет видимую землю, а с ней — нужный размер): он
    // растёт с запасом и уменьшается, только когда стал намного больше нужного. Кадр — в левом верхнем углу буфера (остальное
    // прозрачно), точка буфера — та же доля CSS-пикселя, что и без запаса: картинка та же
    if (cv.width < W || cv.height < H || cv.width * cv.height > 2.2 * W * H) { cv.width = Math.ceil(W * 1.1); cv.height = Math.ceil(H * 1.1); }
    const css = (cv.width * cw / W).toFixed(2) + 'px ' + (cv.height * ch / H).toFixed(2) + 'px';
    if (this._css !== css) { const [a, b] = css.split(' '); cv.style.width = a; cv.style.height = b; this._css = css; }
    this.own = `translate3d(${piv.x}px, ${piv.y}px, 0px) rotate(${-rot}deg) translate(${uv.u0}px, ${uv.v0}px)`;
    cv.style.transform = 'translate3d(0px, 0px, 0px) scale(1) ' + this.own;
    gl.viewport(0, cv.height - H, W, H); // WebGL считает снизу: верх буфера
    gl.clearColor(0, 0, 0, 0); gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!this.pal) return;
    const k = 256 * 2 ** (z - this.Z), sc = k / this.EXT, po = m.getPixelOrigin(), cam = MapView.camLayer(), box = MapView.viewBox(this.PAD);
    const tiles = this.need(box, k, po);
    if (!tiles.length) return;
    const P = this.P, u = P.u, pal = this.pal;
    gl.useProgram(P.p);
    gl.uniform1f(u.uSc, sc); gl.uniform1f(u.uMpx, this.mpx(m)); gl.uniform1f(u.uTop, this.TOP);
    gl.uniform3f(u.uCam, cam.x, cam.y, cam.w);
    gl.uniform4f(u.uView, uv.u0, uv.v0, cw, ch); gl.uniform2f(u.uPiv, piv.x, piv.y); gl.uniform2f(u.uRot, Math.cos(r), Math.sin(r));
    gl.uniform3fv(u.uRoof, pal.roof); gl.uniform3fv(u.uWall, pal.wall); gl.uniform3fv(u.uWall2, pal.wall2);
    gl.uniform1f(u.uLight, pal.light); gl.uniform2f(u.uSun, 0.6, 0.8); // солнце — с юго-востока
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
    for (const t of tiles) {
      const ox = t.x * k - po.x, oy = t.y * k - po.y;
      for (const p of t.parts) {
        // кусок в кадре? рамка куска (в точках плитки) → точки слоя
        if (ox + p.bb[2] * sc < box.x0 || ox + p.bb[0] * sc > box.x1 || oy + p.bb[3] * sc < box.y0 || oy + p.bb[1] * sc > box.y1) continue;
        if (!p.vb) this.upload(p);
        gl.uniform2f(u.uOrig, ox, oy);
        gl.bindBuffer(gl.ARRAY_BUFFER, p.vb);
        gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, this.FLOAT * 4, 0);
        gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, this.FLOAT * 4, 8);
        gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, this.FLOAT * 4, 24);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, p.ib);
        gl.drawElements(gl.TRIANGLES, p.n, gl.UNSIGNED_SHORT, 0); // стены и крыши — одним вызовом
      }
    }
    this.cost = performance.now() - t0;
  },

  /* ---------- плитки домов ---------- */
  // плитки z15 под видимой землёй (box — точки слоя): готовые — в кадр, нет — в очередь; дальние — выбросить
  need(box, k, po) {
    const x0 = Math.floor((box.x0 + po.x) / k), x1 = Math.floor((box.x1 + po.x) / k), y0 = Math.floor((box.y0 + po.y) / k), y1 = Math.floor((box.y1 + po.y) / k);
    const out = [];
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      let t = this.tiles.get(x + ':' + y);
      if (!t) { t = this.load(x, y); if (!t) continue; }
      if (t.st === 'ok') out.push(t);
    }
    for (const [key, t] of this.tiles) {
      if (t.x < x0 - this.NEAR || t.x > x1 + this.NEAR || t.y < y0 - this.NEAR || t.y > y1 + this.NEAR) { this.drop(t); this.tiles.delete(key); }
    }
    return out;
  },
  load(x, y) {
    const v = typeof Hazard !== 'undefined' && Hazard.view();
    if (!v) return null; // карта ещё не готова — спросим в следующем кадре
    const t = { x, y, st: 'wait', parts: [] };
    this.tiles.set(x + ':' + y, t);
    v.tileCache.get({ z: this.Z, x, y }).then(data => this.build(t, data.get('buildings') || [])).catch(() => { t.st = 'fail'; });
    return t;
  },
  drop(t) {
    t.dead = true;
    const gl = this.gl;
    for (const p of t.parts) { if (p.vb) gl.deleteBuffer(p.vb); if (p.ib) gl.deleteBuffer(p.ib); }
    t.parts = [];
  },
  // дома плитки → куски (по клеткам CELL×CELL, у каждого — не больше 65 000 вершин): вершины и треугольники стен и крыш
  build(t, fs) {
    const cells = new Map(), lo = -1, hi = this.EXT + 1, cw = this.EXT / this.CELL, E = this.edges(fs);
    let i = 0;
    const step = () => {
      if (t.dead) return;
      const t0 = performance.now();
      for (; i < fs.length && performance.now() - t0 < this.BUDGET; i++) {
        const f = fs[i];
        if (f.geomType !== 3 || f.props.is_underground) continue;
        const r0 = f.geom[0];
        if (!r0 || r0.length < 3) continue;
        const ci = Math.max(0, Math.min(this.CELL - 1, Math.floor(r0[0].x / cw))) + this.CELL * Math.max(0, Math.min(this.CELL - 1, Math.floor(r0[0].y / cw)));
        let c = cells.get(ci);
        if (c && c.v.length / this.FLOAT > 55000) { t.parts.push(this.pack(c)); c = null; } // кусок полон (индексы — 16 бит) — следующий
        if (!c) { c = { v: [], idx: [], bb: [Infinity, Infinity, -Infinity, -Infinity] }; cells.set(ci, c); }
        this.house(c, f, lo, hi, E);
      }
      if (i < fs.length) { setTimeout(step, 0); return; }
      for (const c of cells.values()) if (c.idx.length) t.parts.push(this.pack(c));
      t.st = 'ok';
      this.dirty();
    };
    step();
  },
  // рёбра всех домов плитки и самый высокий дом у каждого: общая стена соседних частей дома, если сосед не ниже, не видна — её нет
  edges(fs) {
    const E = new Map();
    for (const f of fs) {
      if (f.geomType !== 3 || f.props.is_underground) continue;
      const H = this.height(f);
      for (const r of f.geom) for (let j = 0, n = r.length; j < n; j++) {
        const a = r[j], b = r[(j + 1) % n], k = a.x + ',' + a.y + ',' + b.x + ',' + b.y;
        if (!(E.get(k) >= H)) E.set(k, H);
      }
    }
    return E;
  },
  // один дом: кольца (внешние — по часовой на экране, дыры — против), крыша — earcut, стены — по рёбрам от низа дома
  // (min_height: арки, навесы) до крыши; кроме среза плитки и общих стен с соседом не ниже
  house(c, f, lo, hi, E) {
    const H = this.height(f), M = Math.min(H, Math.max(0, f.props.min_height || 0)), F = this.FLOAT, v = c.v;
    const ringA = r => { let A = 0; for (let i = 0, n = r.length; i < n; i++) { const a = r[i], b = r[(i + 1) % n]; A += a.x * b.y - b.x * a.y; } return A; };
    const polys = [];
    let A0 = 0;
    for (const r of f.geom) {
      if (r.length < 3) continue;
      const A = ringA(r);
      if (!polys.length) A0 = A;
      if (!polys.length || Math.sign(A) === Math.sign(A0)) polys.push([r]); else polys[polys.length - 1].push(r);
    }
    const sg = A0 >= 0 ? 1 : -1;
    const add = (x, y, top, nx, ny) => { const n = v.length / F; v.push(x, y, top, H, nx, ny, M); return n; };
    for (const rings of polys) {
      const flat = [], holes = [], base = v.length / F;
      for (const r of rings) {
        let n = r.length;
        if (n > 1 && r[0].x === r[n - 1].x && r[0].y === r[n - 1].y) n--;
        if (flat.length) holes.push(flat.length / 2);
        for (let j = 0; j < n; j++) {
          const p = r[j];
          flat.push(p.x, p.y); add(p.x, p.y, 1, 0, 0);
          if (p.x < c.bb[0]) c.bb[0] = p.x; if (p.y < c.bb[1]) c.bb[1] = p.y; if (p.x > c.bb[2]) c.bb[2] = p.x; if (p.y > c.bb[3]) c.bb[3] = p.y;
        }
      }
      for (const j of Earcut.run(flat, holes)) c.idx.push(base + j);
      for (const r of rings) {
        let n = r.length;
        if (n > 1 && r[0].x === r[n - 1].x && r[0].y === r[n - 1].y) n--;
        for (let j = 0; j < n; j++) {
          const a = r[j], b = r[(j + 1) % n], ex = b.x - a.x, ey = b.y - a.y, len = Math.hypot(ex, ey);
          if (len < 0.05) continue;
          // срез плитки (ребро по её краю или за ним) — не стена: соседняя плитка рисует этот дом дальше
          if ((a.x <= lo && b.x <= lo) || (a.x >= hi && b.x >= hi) || (a.y <= lo && b.y <= lo) || (a.y >= hi && b.y >= hi)) continue;
          if (E && E.get(b.x + ',' + b.y + ',' + a.x + ',' + a.y) >= H) continue; // за стеной — соседняя часть не ниже
          const nx = sg * ey / len, ny = -sg * ex / len;
          const i0 = add(a.x, a.y, 0, nx, ny), i1 = add(b.x, b.y, 0, nx, ny), i2 = add(b.x, b.y, 1, nx, ny), i3 = add(a.x, a.y, 1, nx, ny);
          c.idx.push(i0, i1, i2, i0, i2, i3);
        }
      }
    }
  },
  pack(c) { return { verts: new Float32Array(c.v), idx: new Uint16Array(c.idx), n: c.idx.length, bb: c.bb, vb: null, ib: null }; },
  // на видеокарту — при первом показе; копия в памяти больше не нужна
  upload(p) {
    const gl = this.gl;
    p.vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, p.vb); gl.bufferData(gl.ARRAY_BUFFER, p.verts, gl.STATIC_DRAW);
    p.ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, p.ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, p.idx, gl.STATIC_DRAW);
    p.verts = p.idx = null;
  },
};
