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
  // 4.13: вокруг Ловчего тумана нет никогда: зона досягаемости и ещё CLEAR м чисто, дальше до LIVE м он мягко нарастает
  CLEAR: 25, LIVE: 50, live: null,
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
    this.moveLive(lat, lng);
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
    map.createPane('fog').style.zIndex = 395; // над картой и домами, под стеной света, следом и значками
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
    // туман плывёт: раз в минуту — чуть дальше по ветру (в экономии батареи и в свёрнутой игре — стоит)
    setInterval(() => { if (!document.hidden && !Cfg.s.eco) this.redraw(); }, 60000);
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
    this.redraw();
  },
  // перерисовать плитки на месте (без мигания, как у GridLayer.redraw)
  redraw() {
    if (!this.lay || !this.lay._map) return;
    for (const t of Object.values(this.lay._tiles || {})) this.draw(t.el, t.coords);
  },

  /* Туман везде разный: густота, разрывы и оттенок — шум, привязанный к месту на Земле (а не к плитке), поэтому
     узор нигде не повторяется и плитки сходятся без швов. Туман медленно плывёт по ветру — раз в минуту
     чуть сдвигается, так что одно и то же место никогда не выглядит одинаково. */
  // значение 0…1 в узле решётки (ix, iy) — целочисленный хеш
  hash(ix, iy, k) {
    let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(k, 1274126177) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  },
  // плавный шум: значения в узлах, сглаженная интерполяция между ними
  noise(x, y, k) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = this.hash(ix, iy, k), b = this.hash(ix + 1, iy, k), c = this.hash(ix, iy + 1, k), d = this.hash(ix + 1, iy + 1, k);
    return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
  },
  // тонкие завитки (бесшовная текстура 256×256, белая с прозрачностью) — ложатся поверх крупного узора
  texture() {
    if (this.tex) return this.tex;
    const S = 256, c = document.createElement('canvas');
    c.width = c.height = S;
    const x = c.getContext('2d'), img = x.createImageData(S, S);
    let seed = 1234;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const oct = [8, 16, 32].map(n => ({ n, g: Array.from({ length: n * n }, rnd) }));
    const sm = t => t * t * (3 - 2 * t);
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
      let v = 0, w = 0, amp = 1;
      for (const { n, g } of oct) {
        const fx = px / S * n, fy = py / S * n, ix = Math.floor(fx), iy = Math.floor(fy), tx = sm(fx - ix), ty = sm(fy - iy);
        const at = (a, b) => g[((b % n) * n) + (a % n)];
        v += amp * ((at(ix, iy) * (1 - tx) + at(ix + 1, iy) * tx) * (1 - ty) + (at(ix, iy + 1) * (1 - tx) + at(ix + 1, iy + 1) * tx) * ty);
        w += amp; amp *= .55;
      }
      const t = Math.max(0, Math.min(1, (v / w - .45) * 2.6)), o = (py * S + px) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
      img.data[o + 3] = 255 * t * t;
    }
    x.putImageData(img, 0, 0);
    return (this.tex = c);
  },
  // крупный узор плитки: 64×64 отсчёта шума по координатам мира (масштаб 17-го уровня), растянутые с сглаживанием
  field(coords) {
    const N = 64, c = this._lo || (this._lo = document.createElement('canvas'));
    c.width = c.height = N;
    const x = c.getContext('2d'), img = x.createImageData(N, N), f = Math.pow(2, 17 - coords.z);
    const min = Math.floor(Date.now() / 60000), dx = min * 2.2, dy = min * .9; // ветер Нави: ~1,5 м в минуту
    const night = this.night;
    const base = night ? [20, 11, 44] : [150, 130, 200], tA = night ? [118, 84, 196] : [255, 252, 255], tB = night ? [56, 104, 180] : [226, 206, 250];
    const aLo = night ? .22 : .12, aHi = night ? .86 : .72;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const X = (coords.x * 256 + (i + .5) * 4) * f + dx, Y = (coords.y * 256 + (j + .5) * 4) * f + dy;
      // густота: облака (~160 м), клубы (~60 м) и клочья (~25 м) — у каждого места свои; оттенок — пятнами ~300 м
      let d = .5 * this.noise(X / 240, Y / 240, 1) + .32 * this.noise(X / 92, Y / 92, 2) + .18 * this.noise(X / 36, Y / 36, 3);
      d = Math.max(0, Math.min(1, (d - .3) * 2.5));
      const h = this.noise(X / 450, Y / 450, 4), o = (j * N + i) * 4, m = Math.pow(d, .7);
      for (let q = 0; q < 3; q++) { const tint = tA[q] + (tB[q] - tA[q]) * h; img.data[o + q] = base[q] + (tint - base[q]) * m; }
      img.data[o + 3] = 255 * (aLo + (aHi - aLo) * d);
    }
    x.putImageData(img, 0, 0);
    return c;
  },
  // живая прогалина вокруг игрока (не запоминается): при движении перерисовываются только плитки рядом
  liveR() { return (typeof W !== 'undefined' ? W.INTERACT : 70) + this.LIVE; },
  moveLive(lat, lng) {
    const prev = this.live;
    this.live = { lat, lng };
    if (prev && U.dist(prev.lat, prev.lng, lat, lng) < 2) return;
    if (!this._livePrev) this._livePrev = prev;
    if (this._liveT) return;
    this._liveT = setTimeout(() => {
      this._liveT = 0;
      const a = this._livePrev;
      this._livePrev = null;
      this.touch(this.live, this.liveR());
      if (a) this.touch(a, this.liveR());
    }, 200);
  },
  livePuff() {
    if (this._lp) return this._lp;
    const c = document.createElement('canvas'), x = c.getContext('2d'), k = 1 - (this.LIVE - this.CLEAR) / this.liveR();
    c.width = c.height = 256;
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(k, 'rgba(0,0,0,1)'); g.addColorStop(k + (1 - k) * .5, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    return (this._lp = c);
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
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    // отсчёты — в центрах клеток по 4 точки: растягиваем так, чтобы центры легли на свои места (край — за плиткой)
    x.drawImage(this.field(coords), -2, -2, 260, 260);
    x.globalCompositeOperation = 'source-atop';
    x.globalAlpha = this.night ? .18 : .22;
    x.drawImage(this.texture(), 0, 0, 256, 256);
    x.globalAlpha = 1;
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
    // живая прогалина вокруг игрока
    if (this.live) {
      const p = m.project([this.live.lat, this.live.lng], z), RL = MapView.pxR(this.live, this.liveR(), z);
      if (p.x + RL > ox && p.x - RL < ox + 256 && p.y + RL > oy && p.y - RL < oy + 256) x.drawImage(this.livePuff(), p.x - ox - RL, p.y - oy - RL, RL * 2, RL * 2);
    }
    x.globalCompositeOperation = 'source-over';
  },
  // новая клетка — перерисовать только плитки рядом с ней
  touch(c, rad = this.R * 2.2) {
    if (!this.lay || !this.lay._map) return;
    const pad = rad / 111320, pl = pad / Math.cos(c.lat * Math.PI / 180);
    for (const t of Object.values(this.lay._tiles || {})) {
      const b = this.bounds(t.coords);
      if (c.lat <= b.n + pad && c.lat >= b.s - pad && c.lng >= b.w - pl && c.lng <= b.e + pl) this.draw(t.el, t.coords);
    }
  },
};
