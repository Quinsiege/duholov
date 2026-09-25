'use strict';
/* 4.12: «Туман Нави» — неизведанные места карты скрыты клубящейся дымкой; там, где Ловчий прошёл, она рассеивается
   навсегда. Пройденные места запоминаются клетками по 20 м — только на этом телефоне (как и последняя точка карты).
   Разведанные «кварталы» (клетки по 100 м) считаются в профиле. Туман — слой плиток на земле: он наклоняется
   вместе с картой, а духи и значки стоят над ним. */

const Fog = {
  CELL: 20,        // м — шаг, с которым запоминаются пройденные места
  R: 70,           // м — сколько тумана рассеивает Ловчий вокруг себя
  BLOCK: 100,      // м — «квартал» для счёта разведанного
  MAX: 80000,      // клеток — предел памяти (≈ 1600 км пути); старые забываются первыми
  KEY: 'duholov.fog',
  cells: null, buckets: new Map(), blocks: new Set(), lay: null, tex: null, night: true,

  // клетка: ряд по широте, в ряду — по долготе с поправкой на широту ряда
  cell(lat, lng, step) {
    const dLat = step / 111320, i = Math.round(lat / dLat);
    const dLng = step / (111320 * Math.cos(i * dLat * Math.PI / 180)), j = Math.round(lng / dLng);
    return { key: i + ':' + j, lat: i * dLat, lng: j * dLng };
  },
  center(key) {
    const [i, j] = key.split(':').map(Number), dLat = this.CELL / 111320;
    return { lat: i * dLat, lng: j * this.CELL / (111320 * Math.cos(i * dLat * Math.PI / 180)) };
  },
  bkey(lat, lng) { return Math.floor(lat * 100) + ':' + Math.floor(lng * 100); }, // корзины по 0.01° — быстро найти клетки у плитки
  add(key) {
    const c = this.center(key), b = this.bkey(c.lat, c.lng);
    if (!this.buckets.has(b)) this.buckets.set(b, []);
    this.buckets.get(b).push(c);
    this.blocks.add(this.cell(c.lat, c.lng, this.BLOCK).key);
    return c;
  },
  load() {
    let list = [];
    try { list = (localStorage.getItem(this.KEY) || '').split(',').filter(Boolean); } catch (e) {}
    this.cells = new Set(list);
    this.buckets.clear(); this.blocks.clear();
    for (const k of this.cells) this.add(k);
  },
  save() {
    clearTimeout(this._st);
    this._st = setTimeout(() => {
      let list = [...this.cells];
      if (list.length > this.MAX) { list = list.slice(-this.MAX); this.cells = new Set(list); this.load(); }
      try { localStorage.setItem(this.KEY, list.join(',')); } catch (e) {}
    }, 4000);
  },
  // сколько кварталов Нави разведано
  explored() { if (!this.cells) this.load(); return this.blocks.size; },

  // Ловчий здесь: рассеять туман и запомнить место
  visit(lat, lng) {
    if (!this.cells) this.load();
    const c = this.cell(lat, lng, this.CELL);
    if (this.cells.has(c.key)) return;
    const before = this.blocks.size;
    this.cells.add(c.key);
    const p = this.add(c.key);
    this.save();
    this.touch(p);
    const n = this.blocks.size;
    if (n > before && n % 25 === 0 && typeof UI !== 'undefined' && UI.toast) UI.toast(`Туман Нави отступает: разведано кварталов — ${n}`);
  },

  /* ---------- слой на карте ---------- */
  init(map) {
    if (this.lay || !map) return;
    if (!this.cells) this.load();
    map.createPane('fog').style.zIndex = 350; // над плитками карты, под следом, зонами и значками
    map.getPane('fog').style.pointerEvents = 'none';
    const self = this;
    const Layer = L.GridLayer.extend({
      createTile(coords) {
        const t = document.createElement('canvas'), k = Math.min(2, window.devicePixelRatio || 1);
        t.width = t.height = 256 * k;
        self.draw(t, coords);
        return t;
      },
    });
    this.lay = new Layer({ pane: 'fog', tileSize: 256, updateWhenZooming: false, keepBuffer: 1, minZoom: 12 });
    this.apply();
  },
  // включить или выключить по настройке
  apply() {
    if (!this.lay || !MapView.map) return;
    const on = Cfg.s.fog !== false;
    if (on && !MapView.map.hasLayer(this.lay)) this.lay.addTo(MapView.map);
    if (!on && MapView.map.hasLayer(this.lay)) this.lay.remove();
  },
  // днём — сиреневая дымка, ночью — густой фиолетовый туман
  setLook(night) {
    if (this.night === night && this.tex) return;
    this.night = night; this.tex = null;
    if (this.lay && MapView.map && MapView.map.hasLayer(this.lay)) this.lay.redraw();
  },
  // бесшовная клубящаяся текстура 256×256 (шум из трёх октав на замкнутой решётке)
  texture() {
    if (this.tex) return this.tex;
    const S = 256, c = document.createElement('canvas');
    c.width = c.height = S;
    const x = c.getContext('2d'), img = x.createImageData(S, S);
    let seed = 1234;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const oct = [4, 8, 16].map(n => ({ n, g: Array.from({ length: n * n }, rnd) }));
    const sm = t => t * t * (3 - 2 * t);
    const [r0, g0, b0, a0] = this.night ? [22, 12, 46, .6] : [150, 128, 200, .5];
    const [r1, g1, b1, a1] = this.night ? [120, 86, 200, .72] : [255, 252, 255, .82];
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
      let v = 0, w = 0, amp = 1;
      for (const { n, g } of oct) {
        const fx = px / S * n, fy = py / S * n, ix = Math.floor(fx), iy = Math.floor(fy), tx = sm(fx - ix), ty = sm(fy - iy);
        const at = (a, b) => g[((b % n) * n) + (a % n)];
        v += amp * ((at(ix, iy) * (1 - tx) + at(ix + 1, iy) * tx) * (1 - ty) + (at(ix, iy + 1) * (1 - tx) + at(ix + 1, iy + 1) * tx) * ty);
        w += amp; amp *= .5;
      }
      const t = Math.max(0, Math.min(1, (v / w - .35) * 2.2)), o = (py * S + px) * 4;
      img.data[o] = r0 + (r1 - r0) * t; img.data[o + 1] = g0 + (g1 - g0) * t; img.data[o + 2] = b0 + (b1 - b0) * t;
      img.data[o + 3] = 255 * (a0 + (a1 - a0) * t);
    }
    x.putImageData(img, 0, 0);
    return (this.tex = c);
  },
  // пятно, которым Ловчий «стирает» туман: мягкий круг
  puff() {
    if (this._puff) return this._puff;
    const c = document.createElement('canvas'), x = c.getContext('2d');
    c.width = c.height = 128;
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.5, 'rgba(0,0,0,.9)'); g.addColorStop(.8, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return (this._puff = c);
  },
  // границы плитки в градусах
  bounds(coords) {
    const m = MapView.map, a = m.unproject([coords.x * 256, coords.y * 256], coords.z), b = m.unproject([(coords.x + 1) * 256, (coords.y + 1) * 256], coords.z);
    return { n: a.lat, w: a.lng, s: b.lat, e: b.lng };
  },
  draw(t, coords) {
    const x = t.getContext('2d'), k = t.width / 256, z = coords.z, m = MapView.map;
    x.setTransform(k, 0, 0, k, 0, 0);
    x.globalCompositeOperation = 'copy';
    x.drawImage(this.texture(), 0, 0, 256, 256);
    x.globalCompositeOperation = 'destination-out';
    const bd = this.bounds(coords), pad = this.R / 111320 * 2.2, pl = pad / Math.cos(bd.n * Math.PI / 180);
    const n = bd.n + pad, s = bd.s - pad, w = bd.w - pl, e = bd.e + pl;
    const R = MapView.pxR({ lat: (bd.n + bd.s) / 2, lng: bd.w }, this.R, z), puff = this.puff(), ox = coords.x * 256, oy = coords.y * 256;
    for (let bi = Math.floor(s * 100); bi <= Math.floor(n * 100); bi++) for (let bj = Math.floor(w * 100); bj <= Math.floor(e * 100); bj++) {
      const list = this.buckets.get(bi + ':' + bj);
      if (list) for (const c of list) {
        if (c.lat > n || c.lat < s || c.lng < w || c.lng > e) continue;
        const p = m.project([c.lat, c.lng], z);
        x.drawImage(puff, p.x - ox - R, p.y - oy - R, R * 2, R * 2);
      }
    }
    x.globalCompositeOperation = 'source-over';
  },
  // новая клетка — перерисовать только плитки рядом с ней
  touch(c) {
    if (!this.lay || !this.lay._map) return;
    const pad = this.R / 111320 * 2.2, pl = pad / Math.cos(c.lat * Math.PI / 180);
    for (const t of Object.values(this.lay._tiles || {})) {
      const b = this.bounds(t.coords);
      if (c.lat <= b.n + pad && c.lat >= b.s - pad && c.lng >= b.w - pl && c.lng <= b.e + pl) this.draw(t.el, t.coords);
    }
  },
};
