'use strict';
/* Карта (Leaflet + OSM/CARTO), значок Ловчего (позиция — walk.js: джойстик и Атлас, 5.1), маркеры мира */

/* 4.19: опасные места для духов — по данным той же карты (Protomaps, плитки z15 из pmtiles): вода, железная дорога и трамвайные
   пути, крупные трассы, стройки, ж/д зоны и платформы, болота, аэродромы, военные зоны, карьеры и свалки. Дух в таком месте
   на карте не показывается; рядом — можно (запасы небольшие: полотно дороги, ширина путей). Без векторной карты — проверки нет. */
const Hazard = {
  Z: 15, EXT: 512,          // уровень данных pmtiles и размер плитки в её координатах
  tiles: new Map(),         // 'x:y' → { st: 'wait' | 'ok' | 'fail', polys, lines }
  // запасы от линий, м (по середине объекта)
  RAIL: { rail: 14, light_rail: 12, narrow_gauge: 10, tram: 5, preserved: 8, disused: 6 },
  ROAD: { motorway: 24, motorway_link: 14, trunk: 20, trunk_link: 12, primary: 9, primary_link: 6, secondary: 7, secondary_link: 5, tertiary: 5 },
  WATERWAY: { river: 8, canal: 6, stream: 3, drain: 2, ditch: 2 },
  LAND: new Set(['railway', 'construction', 'military', 'quarry', 'landfill', 'platform', 'brownfield', 'aerodrome', 'runway', 'taxiway', 'apron', 'wetland', 'swamp', 'marsh', 'bog']),
  view() {
    if (this._view) return this._view;
    const t = typeof MapView !== 'undefined' && MapView.tiles; // карта ещё не готова — спросим в следующий раз
    return (this._view = t && t.views ? t.views.get('') || null : null);
  },
  tileOf(lat, lng) {
    const n = 2 ** this.Z, x = (lng + 180) / 360 * n, r = lat * Math.PI / 180, y = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n;
    const tx = Math.floor(x), ty = Math.floor(y);
    return { tx, ty, px: (x - tx) * this.EXT, py: (y - ty) * this.EXT };
  },
  // true — опасно, false — можно, null — данные ещё грузятся (дух пока не показываем)
  bad(lat, lng) {
    const v = this.view();
    if (!v) return false;
    const { tx, ty, px, py } = this.tileOf(lat, lng), key = tx + ':' + ty;
    let t = this.tiles.get(key);
    if (!t) { t = { st: 'wait' }; this.tiles.set(key, t); this.fetch(v, tx, ty, t, lat); }
    if (t.st === 'wait') return null;
    if (t.st === 'fail') return false;
    for (const p of t.polys) if (px >= p.b[0] && px <= p.b[2] && py >= p.b[1] && py <= p.b[3] && this.inside(p.rings, px, py)) return true;
    for (const l of t.lines) if (px >= l.b[0] - l.r && px <= l.b[2] + l.r && py >= l.b[1] - l.r && py <= l.b[3] + l.r && this.near(l.parts, px, py, l.r)) return true;
    return false;
  },
  async fetch(v, tx, ty, t, lat) {
    try {
      const data = await v.tileCache.get({ z: this.Z, x: tx, y: ty });
      const upm = this.EXT / (40075016.686 * Math.cos(lat * Math.PI / 180) / 2 ** this.Z); // единиц плитки на метр
      const polys = [], lines = [];
      const box = g => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; g.forEach(r => r.forEach(p => { if (p.x < a) a = p.x; if (p.y < b) b = p.y; if (p.x > c) c = p.x; if (p.y > d) d = p.y; })); return [a, b, c, d]; };
      const addLine = (f, m) => lines.push({ parts: f.geom, b: box(f.geom), r: m * upm });
      for (const f of data.get('water') || []) {
        const k = f.props.kind || '';
        if (f.geomType === 3 && k !== 'fountain') polys.push({ rings: f.geom, b: box(f.geom) });
        else if (f.geomType === 2 && this.WATERWAY[k]) addLine(f, this.WATERWAY[k]);
      }
      for (const f of data.get('roads') || []) {
        if (f.geomType !== 2 || f.props.is_tunnel) continue;
        const k = f.props.kind || '', d = f.props.kind_detail || '';
        if (k === 'rail' && this.RAIL[d]) addLine(f, this.RAIL[d]);
        else if ((k === 'major_road' || k === 'highway') && this.ROAD[d]) addLine(f, this.ROAD[d]);
      }
      for (const f of data.get('landuse') || []) if (f.geomType === 3 && this.LAND.has(f.props.kind)) polys.push({ rings: f.geom, b: box(f.geom) });
      Object.assign(t, { st: 'ok', polys, lines });
    } catch (e) { t.st = 'fail'; }
    MapView.refresh();
  },
  // точка внутри многоугольника (все кольца вместе — дыры учтены правилом чёт-нечет)
  inside(rings, x, y) {
    let c = false;
    for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const a = r[i], b = r[j];
      if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) c = !c;
    }
    return c;
  },
  // точка ближе r к линии
  near(parts, x, y, r) {
    const r2 = r * r;
    for (const p of parts) for (let i = 1; i < p.length; i++) {
      const a = p[i - 1], b = p[i], dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy;
      const t = l ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l)) : 0;
      const ex = a.x + t * dx - x, ey = a.y + t * dy - y;
      if (ex * ex + ey * ey <= r2) return true;
    }
    return false;
  },
};

/* 5.1.30: крыши — высота дома (м), в котором стоит место: модель места встаёт на его крышу (MapView.upright). Дома — из тех же
   плиток z15, что у Hazard; хранится только ответ на точку (сами дома плитки — у кэша Protomaps). 0 — не в доме (или карты домов
   нет), null — плитка ещё читается (карта перерисует значки, когда прочтёт) */
const Roofs = {
  at: new Map(), // 'lat,lng' → высота
  height(lat, lng) {
    const key = lat.toFixed(6) + ',' + lng.toFixed(6);
    if (this.at.has(key)) return this.at.get(key);
    const v = Hazard.view();
    if (!v) return 0;
    if (this.at.size > 2000) this.at.clear();
    this.at.set(key, null);
    const { tx, ty, px, py } = Hazard.tileOf(lat, lng);
    v.tileCache.get({ z: Hazard.Z, x: tx, y: ty }).then(data => {
      let h = 0;
      for (const f of data.get('buildings') || []) {
        if (f.geomType !== 3 || f.props.is_underground) continue;
        let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
        for (const r of f.geom) for (const p of r) { if (p.x < a) a = p.x; if (p.y < b) b = p.y; if (p.x > c) c = p.x; if (p.y > d) d = p.y; }
        if (px >= a && px <= c && py >= b && py <= d && Hazard.inside(f.geom, px, py)) h = Math.max(h, f.props.height > 0 ? f.props.height : 8);
      }
      this.at.set(key, h);
      if (h) MapView.refresh();
    }).catch(() => this.at.set(key, 0));
    return null;
  },
};

const MapView = {
  map: null, pos: null, follow: true, heading: 0, markers: new Map(), nearby: [], tiles: null, night: null,

  init() {
    if (typeof M3D !== 'undefined') M3D.init(); // 5.1.28: 3D-модели мест (js/m3d.js) — до первых значков; нет WebGL — места остаются рисунками
    // 5.1: место Ловчего — Walk (телефон или прогресс); ещё нет (новичок до Атласа) — карта ждёт на Красной площади
    const start = Walk.load() || { lat: 55.7539, lng: 37.6208 };
    this.pos = { lat: start.lat, lng: start.lng };
    this.map = L.map('map', { zoomControl: false, minZoom: 15, maxZoom: 19, zoomSnap: 0.25, tap: true })
      .setView([this.pos.lat, this.pos.lng], 17.5);
    this.map.attributionControl.setPrefix(false);
    // 4.13: свои слои между плитками земли и значками (порядок — по z-index, см. orderPanes)
    [['zone', 380], ['bld', 390]].forEach(([n, z]) => { const p = this.map.createPane(n); p.style.zIndex = z; p.style.pointerEvents = 'none'; });
    if (typeof Bld3D !== 'undefined') Bld3D.init(this.map); // 5.1.30: дома — объёмные, в WebGL (свой слой между зоной и подписями)
    this.setTiles();
    setInterval(() => this.setTiles(), 60000);

    // 4.8.1: зона досягаемости — круг Ловчего (свечение, кольцо рун, волна); размер — радиус взаимодействия на текущем масштабе.
    // 4.13.1: круг лежит на земле — в своём слое под домами: дома рисуются поверх него
    this.range = L.marker([this.pos.lat, this.pos.lng], { interactive: false, keyboard: false, zIndexOffset: -5000, flat: true, pane: 'zone',
      icon: L.divIcon({ className: 'mk-range', iconSize: [0, 0], iconAnchor: [0, 0], html: '<div class="rz"><i class="rz-fill"></i><i class="rz-wave"></i><i class="rz-runes"></i><i class="rz-ring"></i><i class="rz-edge"></i></div>' }) }).addTo(this.map);
    this.map.on('zoomanim', e => { this.fitRange(e.zoom, true); this.fitZones(e.zoom, true); });
    this.map.on('zoomend viewreset resize', () => { this.fitRange(); this.fitZones(); });
    this.map.on('move zoomend viewreset resize', () => this.reAim());
    this.fitRange();
    this.orderPanes();
    this.player = L.marker([this.pos.lat, this.pos.lng], {
      interactive: false, zIndexOffset: 1000,
      icon: L.divIcon({ className: 'mk-player-wrap', iconSize: [64, 64], iconAnchor: [32, 32],
        // 5.1.28: сам Ловчий — 3D-модель (js/m3d.js): шагает и бежит, смотрит туда, куда идёт, в цветах облика; нет WebGL — точка со стрелкой
        html: `<div class="mk-player">${typeof M3D !== 'undefined' ? M3D.html('catcher', 32, 32, '', 'me') : ''}<div class="pulse"></div><div class="arrow"></div><div class="dot"></div></div>` }),
    }).addTo(this.map);
    if (typeof M3D !== 'undefined') { M3D.setMe({ heading: this.heading, gait: 0, look: S.d && S.d.look }); M3D.bind(this.player.getElement()); }
    // 4.23.2: спутник на карте рядом с Ловчим не показывается
    Bus.on('weather', () => { this.setWeatherFx(); this.setTiles(); this.refresh(true); });

    this.map.on('dragstart', () => { this.follow = false; U.$('#recenterBtn').classList.add('show'); });
    U.$('#recenterBtn').onclick = () => this.recenter();
    this.initRotate();
    this.initOrbit();

    Walk.init(); // 5.1: мини-джойстик вместо GPS
    this.refresh();
    // в режиме экономии батареи карта обновляется вдвое реже
    document.body.classList.toggle('eco', !!Cfg.s.eco);
    let tickN = 0;
    setInterval(() => { if (Stage.idle() && (!Cfg.s.eco || ++tickN % 2 === 0)) this.refresh(); }, 1500);
    // 5.2: одна активная сцена (stage.js) — пока открыта поимка, бой или экран, карта не пересчитывается и не перерисовывается;
    // сцена закрылась — облик карты, духи и места обновляются один раз
    Stage.on(busy => { if (!busy) this.wake(); });
  },
  wake() {
    if (!this.map) return;
    this.map.invalidateSize({ animate: false }); // размер экрана мог смениться, пока карта не рисовалась
    this.setTiles();
    if (this._miss) this.refresh(this._miss === 2);
  },

  // 4.1: своя карта — векторные тайлы (Protomaps, данные OpenStreetMap) одним файлом; 4.28 — всего мира (в S3, отдаёт сервер игры);
  // за пределами вырезки — стандартные тайлы OSM. Ночной вид и тона Нави — CSS-фильтр слоя (style.css).
  TILES: 'tiles/world-20260928.pmtiles', // 4.28: карта всего мира (Protomaps, в S3 — см. tools/server/duholov-world-tiles)
  COVER: [-180, -85.06, 180, 85.06], // 4.28: карта всего мира — рамка на весь мир (долгота, широта: юго-запад → северо-восток)
  covered(p) { const b = this.COVER; return !!p && p.lng >= b[0] && p.lng <= b[2] && p.lat >= b[1] && p.lat <= b[3]; },
  // 5.1.12: адрес карты мира — на duholov.ru рядом с игрой (APK открывает её же), с других адресов (тестовый контур, GitHub Pages,
  // локальный сервер разработки — файла карты мира у него нет) — с duholov.ru (CORS разрешён)
  tilesUrl() { return location.hostname === 'duholov.ru' ? this.TILES : 'https://duholov.ru/' + this.TILES; },
  // 4.10: облик карты — время суток по настоящему солнцу над местом Ловчего (5.1.26: закрепить день или ночь нельзя);
  // 5.1.30: карта — в стандартном стиле Protomaps (днём — светлом, ночью — тёмном), без своей отрисовки улиц, фонарей и цветов
  look() {
    const p = this.pos || { lat: 55.75, lng: 37.62 }, phase = U.phase(p.lat, p.lng), night = phase === 'night' || phase === 'dusk';
    return { phase, night, flavor: night ? 'dark' : 'light', key: night ? 'dark' : 'light' };
  },
  // цвета к стилю карты: земля (фон и дымка горизонта) и объёмные дома (Bld3D) — крыша, стены (в тени и на солнце), контраст
  FLAVOR: {
    light: { earth: '#e2dfda', roof: '#d7d3cd', wall: '#a8a39b', wall2: '#d3cec6', light: 0.7 },
    dark: { earth: '#1f1f1f', roof: '#2c2c31', wall: '#17171a', wall2: '#34343b', light: 0.6 },
  },
  // правила рисования и подписей стандартного стиля (Protomaps считает их сам по имени стиля); подписей мест на карте (pois) нет —
  // у мест игры свои подписи (MapView.label), у остальных точек — не нужны
  flavorRules(name, url) {
    const ref = protomapsL.leafletLayer({ url, flavor: name, lang: I18N.lang });
    return { paint: ref.paintRules, label: ref.labelRules.filter(r => r.dataLayer !== 'pois'), bg: ref.backgroundColor };
  },
  setTiles() {
    if (this.tiles && Stage.busy) return; // 5.2: под сценой плитки не перерисовываются — облик сверится, когда она закроется (wake)
    const lk = this.look();
    if (lk.key === this._look) return;
    this._look = lk.key;
    const night = this.night = lk.night, F = this.FLAVOR[lk.flavor];
    if (!this.tiles) {
      const osm = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
      if (typeof protomapsL !== 'undefined' && this.covered(this.pos)) {
        const url = this.tilesUrl(), st = this.flavorRules(lk.flavor, url);
        this.tiles = protomapsL.leafletLayer({ url, lang: I18N.lang, attribution: `${osm} · <a href="https://protomaps.com">Protomaps</a>`,
          paintRules: st.paint, labelRules: [], backgroundColor: st.bg }).addTo(this.map);
        U.$('#map').classList.add('vecmap');
        // 4.13: подписи — вторым слоем над зоной Ловчего и объёмными домами; плитки читаются один раз (общий кэш)
        this.bldTiles = protomapsL.leafletLayer({ url, lang: I18N.lang, attribution: '', pane: 'bld', paintRules: [], labelRules: st.label });
        this.bldTiles.views = this.tiles.views;
        this.bldTiles.addTo(this.map);
      } else {
        this.tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: osm }).addTo(this.map);
      }
    } else if (this.tiles.rerenderTiles) {
      // день сменился ночью (или наоборот) — другой стиль: перерисовать плитки и подписи
      const st = this.flavorRules(lk.flavor, this.tilesUrl());
      Object.assign(this.tiles, { paintRules: st.paint, backgroundColor: st.bg });
      this.tiles.rerenderTiles();
      if (this.bldTiles) { this.bldTiles.labelRules = st.label; this.bldTiles.clearLayout(); this.bldTiles.rerenderTiles(); }
    }
    if (typeof Bld3D !== 'undefined' && Bld3D.on) Bld3D.theme(F); // объёмные дома — в тон карте
    document.body.classList.toggle('night', night);
    document.body.style.setProperty('--haze', F.earth); // 4.11: дымка горизонта у наклонённой карты — цвета земли
    if (typeof Music !== 'undefined') Music.apply(); // 4.8: днём и ночью — разные мелодии карты
  },

  setWeatherFx() {
    const box = U.$('#wxfx'), w = Sky.w;
    const fx = w && WEATHER[w.key].fx;
    if (box._fx === fx) return;
    box._fx = fx;
    box.className = fx ? 'wx-' + fx : '';
    box.innerHTML = fx === 'rain' || fx === 'snow' ? '<i></i>'.repeat(fx === 'rain' ? 60 : 40) : fx === 'wind' ? '<i></i>'.repeat(8) : '';
    [...box.children].forEach(i => {
      i.style.left = Math.random() * 100 + '%';
      i.style.animationDelay = -Math.random() * 3 + 's';
      i.style.animationDuration = (fx === 'rain' ? 0.6 + Math.random() * 0.4 : fx === 'snow' ? 5 + Math.random() * 5 : 3 + Math.random() * 3) + 's';
      if (fx === 'wind') i.style.top = Math.random() * 100 + '%';
    });
  },

  recenter(quick) {
    this.follow = true;
    U.$('#recenterBtn').classList.remove('show');
    if (quick) return; // 5.1: пошёл джойстиком — карта догонит значок со следующего шага
    const p = this.shown || this.pos; // 4.24.1: туда, где значок сейчас на экране
    this.map.setView([p.lat, p.lng], Math.max(this.map.getZoom(), 17), { animate: true });
  },

  // радиус круга Ловчего в пикселях для масштаба z (во время анимации масштаба — плавно, в такт Leaflet)
  fitRange(z, anim) {
    const el = this.range && this.range.getElement(), box = el && el.firstElementChild;
    if (!box) return;
    const zz = z == null ? this.map.getZoom() : z, ll = this.range.getLatLng();
    const r = Math.abs(this.map.project(ll, zz).y - this.map.project(L.latLng(ll.lat + W.INTERACT / 111320, ll.lng), zz).y);
    box.style.transition = anim ? 'width .25s cubic-bezier(0,0,.25,1), height .25s cubic-bezier(0,0,.25,1), margin .25s cubic-bezier(0,0,.25,1)' : 'none';
    box.style.width = box.style.height = r * 2 + 'px';
    box.style.margin = -r + 'px 0 0 ' + -r + 'px';
  },
  // слои внутри карты — в порядке z-index и в разметке: у наклонённой (3D) карты плоские слои рисуются по порядку в DOM
  orderPanes() {
    const mp = this.map.getPane('mapPane');
    [...mp.children].map(el => [el, +getComputedStyle(el).zIndex || 0]).sort((x, y) => x[1] - y[1]).forEach(([el]) => mp.appendChild(el));
  },

  moveTo(lat, lng, jump) {
    this.pos = { lat, lng };
    this.drawAt(lat, lng, jump); // 5.2: точка приходит каждый кадр (Walk) — рисуем сразу, без плавной «езды» от точки к точке
    const el = this.player.getElement();
    if (el) el.querySelector('.arrow').style.transform = `rotate(${this.heading + this.rot}deg)`; // с учётом поворота карты
    if (typeof M3D !== 'undefined') M3D.setMe({ heading: this.heading }); // 5.1.28: 3D-Ловчий смотрит туда, куда идёт
    if (this.tracking) this.updateTracker();
  },

  // Значок Ловчего, круг и карта — в точке (lat, lng) на экране
  drawAt(lat, lng, jump) {
    const ll = L.latLng(lat, lng);
    this.shown = { lat, lng };
    this.player.setLatLng(ll);
    this.range.setLatLng(ll);
    if (this.follow) {
      if (jump) this.map.setView(ll, 17.5, { animate: false });
      else this.camTo(ll);
    }
  },
  /* 5.2: камера за Ловчим — без округления до целых пикселей. Leaflet (panTo) двигает карту целыми CSS-пикселями:
     на шаге (~3 px/с) земля под Ловчим дёргалась на пиксель (на телефоне это 3 точки экрана) раз в треть секунды,
     на бегу — чаще, и круг на земле «трясся». Теперь слой карты сдвигается ровно на пройденное (с точностью до точки
     экрана), а значок и круг ставятся точно в точку опоры — они стоят на экране неподвижно, карта плывёт под ними. */
  camTo(ll) {
    const m = this.map;
    if (!m._loaded || m._animatingZoom || (m._panAnim && m._panAnim._inProgress)) { m.panTo(ll, { animate: false }); return; }
    // плоская карта — до точки экрана (чёткие подписи); наклонённая или повёрнутая и так рисуется не по сетке точек — без округления
    const k = this.tilt || this.rot ? 1e3 : window.devicePixelRatio || 1, half = m.getSize().divideBy(2), pane = m._getMapPanePos();
    const lp = m.project(ll, m.getZoom()).subtract(m.getPixelOrigin()); // точка Ловчего в слое карты, без округления
    const want = L.point(Math.round((half.x - lp.x) * k) / k, Math.round((half.y - lp.y) * k) / k);
    const d = pane.subtract(want);
    if (Math.abs(d.x) > half.x || Math.abs(d.y) > half.y) { m.panTo(ll, { animate: false }); return; } // далёкий скачок — как раньше
    if (d.x || d.y) { m._rawPanBy(d); m.fire('move').fire('moveend'); }
    const at = half.subtract(want); // = точка Ловчего в слое, до точки экрана
    for (const mk of [this.player, this.range]) if (mk._icon) { L.DomUtil.setPosition(mk._icon, at); this.upright(mk); }
  },

  /* 5.1: Ловчий идёт джойстиком (walk.js): каждый кадр — новая точка; значок поворачивается по направлению, шагает или бежит */
  walkTo(lat, lng, heading) {
    this.heading = heading;
    if (!this.follow) this.recenter(true); // пошёл — карта снова за Ловчим
    this.moveTo(lat, lng, false);
  },
  // походка значка: 0 — стоит, 1 — шаг, 2 — бег (лёгкое покачивание, быстрее на бегу)
  setGait(m) {
    if (typeof M3D !== 'undefined') M3D.setMe({ gait: m }); // 5.1.28: 3D-Ловчий стоит, шагает или бежит
    const el = this.player && this.player.getElement(), p = el && el.querySelector('.mk-player');
    if (!p) return;
    p.classList.toggle('walk', m === 1); p.classList.toggle('run', m === 2);
  },
  // 5.1: телепорт (Walk.teleport): сразу в новую точку, карта — туда же, места и духи вокруг — заново
  jump(lat, lng) {
    this.follow = true;
    U.$('#recenterBtn').classList.remove('show');
    if (this.tracking) this.untrack();
    this.moveTo(lat, lng, true);
    this.setTiles(); // время суток и сезон — у нового места свои
    this.refresh(true);
    if (typeof Poi !== 'undefined') Poi.ensure();
    if (typeof Sky !== 'undefined' && Sky.update) Sky.update(true); // погода — нового места
    if (typeof Clans !== 'undefined' && Clans.refresh) setTimeout(() => Clans.refresh(true), 1500); // чьи Святилища вокруг
  },
  updateBuddy() {}, // 4.23.2: спутник на карте не показывается (ui-spirits.js зовёт после выбора спутника)

  /* ---------------- 4.7: ПОВОРОТ КАРТЫ И КОМПАС ---------------- */
  // Карту крутят двумя пальцами (5.1.30: и одним — initOrbit); компас слева внизу показывает север, касание — вернуть север вверх.
  // Leaflet поворот не умеет: пока карта повёрнута, её слой — квадрат с диагональю экрана (углы не пустеют),
  // повёрнутый CSS; значки на ней стоят прямо, а сдвиг пальца пересчитывается в оси повёрнутой карты.
  rot: 0,
  initRotate() {
    const self = this, box = U.$('#map');
    // перетаскивание: сдвиг пальца — в осях повёрнутой карты; масштаб слоя Leaflet под поворотом считает неверно
    const d = this.map.dragging && this.map.dragging._draggable;
    if (d) {
      const down = d._onDown, move = d._onMove;
      d.disable();
      d._onDown = function (e) { down.call(this, e); this._parentScale = { x: 1, y: 1 }; };
      d._onMove = function (e) {
        if ((!self.rot && !self.tilt) || (e.touches && e.touches.length > 1) || !this._startPoint) return move.call(this, e);
        const f = e.touches && e.touches.length === 1 ? e.touches[0] : e, s = this._startPoint;
        const a = self.plane(s.x, s.y), b = self.plane(f.clientX, f.clientY);
        const p = { clientX: s.x + b.x - a.x, clientY: s.y + b.y - a.y };
        const tg = e.target && e.target.nodeType === 1 ? e.target : this._element;
        return move.call(this, { type: e.type, target: tg, srcElement: tg, touches: e.touches ? [p] : undefined, clientX: p.clientX, clientY: p.clientY,
          preventDefault: () => e.preventDefault(), stopPropagation: () => e.stopPropagation() });
      };
      d.enable();
    }
    // значки на карте стоят прямо: поворот в обратную сторону вокруг точки привязки;
    // 4.11: при наклоне ещё и встают с земли лицом к игроку (плоские круги — зоны, круг Ловчего — лежат на земле)
    const setPos = L.Marker.prototype._setPos;
    L.Marker.prototype._setPos = function (p) { setPos.call(this, p); self.upright(this); };
    // жест: два пальца поворачиваются — карта за ними (с порогом, чтобы щипок-масштаб не крутил карту)
    let g = null;
    const ang = t => Math.atan2(t[1].clientY - t[0].clientY, t[1].clientX - t[0].clientX) * 180 / Math.PI;
    const norm = a => ((a % 360) + 540) % 360 - 180;
    box.addEventListener('touchstart', e => { g = e.touches.length === 2 ? { a: ang(e.touches), r: this.rot, on: false } : null; }, { passive: true });
    box.addEventListener('touchmove', e => {
      if (!g || e.touches.length !== 2) return;
      let da = norm(ang(e.touches) - g.a);
      if (!g.on) { if (Math.abs(da) < 14) return; g.on = true; g.a += Math.sign(da) * 14; da = norm(ang(e.touches) - g.a); }
      this.setRot(g.r + da);
    }, { passive: true });
    const end = e => { if (g && e.touches.length < 2) { const was = g.on; g = null; if (was && Math.abs(this.rot) < 6) this.northUp(); } };
    box.addEventListener('touchend', end, { passive: true });
    box.addEventListener('touchcancel', end, { passive: true });
    // компас
    const c = U.$('#compassBtn');
    if (c) { c.innerHTML = this.compassSvg(); c.onclick = () => { Sfx.play('tap'); this.northUp(); }; }
    addEventListener('resize', () => { if (this._sq) this.layout(); });
    if (!U.$('#mapHaze')) { const h = document.createElement('div'); h.id = 'mapHaze'; box.after(h); }
    this.setTilt(Cfg.s.tilt3d !== false);
  },
  /* 4.11: наклон камеры, как в Pokémon GO: карта ложится вдаль (перспектива), игрок — чуть ниже середины экрана,
     вдали — дымка горизонта. Слой карты становится больше экрана ровно настолько, чтобы закрыть его целиком:
     трапеция экрана, спроецированная на плоскость карты (а при повороте — описанный вокруг неё квадрат). */
  TILT: 32, PD: 1100, tilt: 0, _py: 0,
  layout() {
    const box = U.$('#map'), on = !!(this.tilt || this.rot), W = innerWidth, H = innerHeight;
    this._sq = on;
    this._py = this.tilt ? Math.round(H * .6) : H / 2;
    if (on) {
      // 5.1.30: наклон меняют пальцем — слой карты — с запасом в 6° (до ORBIT.max): не пересчитывать его на каждом кадре жеста
      const tf = this._tiltFor = this.tilt ? Math.min(this.ORBIT.max, this.tilt + 6) : 0;
      const t = tf * Math.PI / 180, sn = Math.sin(t), cs = Math.cos(t), d = this.PD, py = this._py;
      const top = tf ? py * d / (d * cs - py * sn) : py, bot = tf ? (H - py) * d / (d * cs + (H - py) * sn) : H - py;
      const half = Math.max(top, bot), xw = tf ? (W / 2) * (d + top * sn) / d : W / 2;
      const mw = this.rot ? 2 * Math.hypot(xw, half) : 2 * xw, mh = this.rot ? mw : 2 * half;
      box.style.setProperty('--mw', Math.ceil(mw) + 4 + 'px');
      box.style.setProperty('--mh', Math.ceil(mh) + 4 + 'px');
      box.style.setProperty('--py', this._py + 'px');
      box.style.setProperty('--tilt', this.tilt + 'deg');
      box.style.setProperty('--pd', this.PD + 'px');
    }
    box.classList.toggle('rot', on);
    box.classList.toggle('tilt', !!this.tilt);
    document.body.classList.toggle('tilt', !!this.tilt);
    this.map.invalidateSize({ animate: false });
    this.map.eachLayer(l => { if (l instanceof L.Marker) l.update(); });
    this.reAim(); // 5.1.30: наклон включили или выключили — 3D-модели мест под новым углом
    // подпись OpenStreetMap остаётся видна: у повёрнутой карты — копия в углу экрана
    const at = U.$('#mapAttr');
    if (at) { at.classList.toggle('hidden', !on); if (on) at.innerHTML = this.map.attributionControl.getContainer().innerHTML; }
  },
  setTilt(on) {
    this.tilt = on ? this.TILT : 0;
    this.layout();
    this.zoomMode();
  },
  /* 5.1.30: камера одним пальцем (и мышью) — по всем осям, как в Pokémon GO: влево-вправо — облёт вокруг Ловчего (земля под
     пальцем идёт за ним: над Ловчим и под ним — в разные стороны), вверх-вниз — наклон (ORBIT.min…max°; у плоской карты, если
     объём выключен в настройках, — только облёт). Карта всегда за Ловчим: ходят джойстиком и Атласом, сдвигать её пальцем не нужно.
     Два пальца — масштаб и поворот, как раньше; лёгкое касание — нажатие на значок. */
  ORBIT: { yaw: 0.35, pitch: 0.18, min: 14, max: 50 }, // градусов на CSS-пиксель пальца; пределы наклона
  initOrbit() {
    const box = U.$('#map');
    if (this.map.dragging) this.map.dragging.disable();
    let g = null, ate = 0, want = null, raf = 0;
    // палец двигается чаще, чем меняются кадры (на экранах 120 Гц — вдвое): поворот и наклон — один раз за кадр, по последней точке
    const apply = () => { raf = 0; const w = want; want = null; if (!w) return; this.setRot(w.rot); if (w.tilt != null) this.setPitch(w.tilt); };
    box.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (g) { g.multi = true; return; } // второй палец — жест двумя пальцами (масштаб, поворот)
      g = { id: e.pointerId, x: e.clientX, y: e.clientY, rot: this.rot, tilt: this.tilt, on: false, multi: false, sg: e.clientY < (this._py || innerHeight / 2) ? 1 : -1 };
    });
    addEventListener('pointermove', e => {
      if (!g || e.pointerId !== g.id || g.multi) return;
      const dx = e.clientX - g.x, dy = e.clientY - g.y;
      if (!g.on) { if (Math.hypot(dx, dy) < 8) return; g.on = true; }
      want = { rot: g.rot + g.sg * dx * this.ORBIT.yaw, tilt: this.tilt ? g.tilt - dy * this.ORBIT.pitch : null };
      if (!raf) raf = requestAnimationFrame(apply);
    });
    const end = e => {
      if (!g || e.pointerId !== g.id) return;
      if (raf) { cancelAnimationFrame(raf); apply(); } // последняя точка пальца — сразу
      if (g.on && !g.multi) { ate = performance.now(); if (Math.abs(this.rot) < 4) this.northUp(); this.fitPitch(); }
      g = null;
    };
    addEventListener('pointerup', end);
    addEventListener('pointercancel', end);
    // палец вёл камеру — значок под ним не нажимается
    box.addEventListener('click', e => { if (performance.now() - ate < 350) { e.stopPropagation(); e.preventDefault(); } }, true);
  },
  setPitch(t) {
    t = Math.max(this.ORBIT.min, Math.min(this.ORBIT.max, t));
    if (!this.tilt || Math.abs(t - this.tilt) < 0.05) return;
    this.tilt = t;
    if (t > (this._tiltFor || 0)) return this.layout(); // слою карты мало запаса для такого наклона — шире
    U.$('#map').style.setProperty('--tilt', t + 'deg');
    this.reAim();
  },
  // жест кончился, а наклон стал заметно меньше того, под который считан слой карты, — слой снова по размеру (меньше плиток)
  fitPitch() { if (this.tilt && (this._tiltFor || 0) - this.tilt > 9) this.layout(); },
  // при повороте и наклоне масштаб — вокруг игрока (точку между пальцами Leaflet у такого слоя считает неверно)
  zoomMode() { const o = this.map.options, c = this.rot || this.tilt; o.touchZoom = o.scrollWheelZoom = o.doubleClickZoom = c ? 'center' : true; },
  // точка экрана → точка на плоскости карты (относительно игрока, в осях ненаклонённой и неповёрнутой карты)
  plane(x, y) {
    let { x: X, y: Y } = this.planeUV(x, y);
    if (this.rot) { const a = -this.rot * Math.PI / 180; [X, Y] = [X * Math.cos(a) - Y * Math.sin(a), X * Math.sin(a) + Y * Math.cos(a)]; }
    return { x: X, y: Y };
  },
  // то же, но в осях экрана (без поворота карты): x — вправо, y — вниз по плоскости
  planeUV(x, y) {
    let X = x - innerWidth / 2, Y = y - (this._py || innerHeight / 2);
    if (this.tilt) {
      const t = this.tilt * Math.PI / 180, sn = Math.sin(t), cs = Math.cos(t), d = this.PD;
      Y = Y * d / (cs * d + Y * sn); X = X * (d - Y * sn) / d;
    }
    return { x: X, y: Y };
  },
  // 5.1.30: видимая земля в осях экрана на плоскости карты (от точки зрения), с запасом pad — холст объёмных домов (Bld3D)
  viewUV(pad = 0) {
    let u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity;
    for (const [x, y] of [[0, 0], [innerWidth, 0], [0, innerHeight], [innerWidth, innerHeight]]) {
      const q = this.planeUV(x, y);
      u0 = Math.min(u0, q.x); v0 = Math.min(v0, q.y); u1 = Math.max(u1, q.x); v1 = Math.max(v1, q.y);
    }
    return { u0: u0 - pad, v0: v0 - pad, u1: u1 + pad, v1: v1 + pad };
  },
  setRot(r) {
    r = ((r % 360) + 540) % 360 - 180;
    if (Math.abs(r) < 0.05) r = 0;
    const turned = !!r !== !!this.rot;
    this.rot = r;
    if (typeof M3D !== 'undefined') M3D.setRot(r); // 5.1.28: 3D-модели мест поворачиваются вместе с картой
    if (turned) this.layout();
    U.$('#map').style.setProperty('--mrot', r + 'deg');
    this.zoomMode();
    if (!turned) this.map.eachLayer(l => { if (l instanceof L.Marker) l.update(); });
    const el = this.player && this.player.getElement();
    if (el) el.querySelector('.arrow').style.transform = `rotate(${this.heading + r}deg)`;
    const c = U.$('#compassBtn');
    if (c) { c.firstElementChild.style.transform = `rotate(${r}deg)`; c.classList.toggle('turned', !!r); }
    if (this.tracking) this.updateTracker();
    if (typeof Bld3D !== 'undefined') Bld3D.dirty(); // 5.1.30: объёмные дома поворачиваются вместе с картой — в этом же кадре
  },
  // значок на повёрнутой/наклонённой карте стоит прямо (см. initRotate)
  LIFT_Z: 36, // насколько значок наклонённой карты выдвинут к игроку, CSS-пиксели: иначе нижняя половина ушла бы «под» плитки
  upright(mk) {
    const el = mk._icon, p = el && el._leaflet_pos;
    if (!p || mk._map !== this.map || (!this.rot && !this.tilt)) return;
    el.style.transformOrigin = `${-parseFloat(el.style.marginLeft) || 0}px ${-parseFloat(el.style.marginTop) || 0}px`;
    // 5.1.30: место в доме стоит на его крыше — там, где её видно из точки зрения (так рисует объёмные дома Bld3D; без WebGL
    // дома плоские — и место на земле)
    const h = this.tilt && mk._roofH && typeof Bld3D !== 'undefined' && Bld3D.on ? Bld3D.hpx(mk._roofH) : 0;
    const lift = el._lift = h ? this.roofShift(p, h) : { x: 0, y: 0 };
    let t = `translate3d(${p.x + lift.x}px, ${p.y + lift.y}px, 0px)`;
    if (this.rot) t += ` rotate(${-this.rot}deg)`;
    // встаёт с земли лицом к игроку и выдвинут к нему; 5.1.30: — по лучу взгляда, с уменьшением на ту же долю: на экране
    // значок стоит ровно на своей точке земли и не «плывёт» над ней, пока карта движется (раньше — сдвиг до 10–15 точек)
    if (this.tilt && !mk.options.flat) {
      const q = this.screen3d(L.point(p.x + lift.x, p.y + lift.y)), k = this.LIFT_Z / (this.PD - q.z);
      t += ` rotateX(${-this.tilt}deg) translate3d(${(-q.x * k).toFixed(2)}px, ${(-q.y * k).toFixed(2)}px, ${this.LIFT_Z}px) scale(${(1 - k).toFixed(4)})`;
    }
    el.style.transform = t;
  },
  // точка слоя карты → где её рисует наклонённая карта: в пространстве экрана от точки зрения (середина по ширине, высота
  // игрока; x — вправо, y — вниз, z — к игроку, CSS-пиксели) и на плоскости повёрнутой карты (u, v)
  screen3d(lp) {
    const cp = this.map.layerPointToContainerPoint(lp), s = this.map.getSize();
    const r = this.rot * Math.PI / 180, a = this.tilt * Math.PI / 180, u0 = cp.x - s.x / 2, v0 = cp.y - s.y / 2;
    const u = u0 * Math.cos(r) - v0 * Math.sin(r), v = u0 * Math.sin(r) + v0 * Math.cos(r);
    return { x: u, y: v * Math.cos(a), z: v * Math.sin(a), u, v };
  },
  // 5.1.30: откуда игрок смотрит на значок (для 3D-модели места, js/m3d.js): высота взгляда над землёй e (градусы: у нижнего
  // края экрана — почти сверху, у горизонта — сбоку) и поворот az (радианы: место правее середины видно чуть слева);
  // у плоской карты — null (модель — под своим наклоном, как значки)
  camOf(el) {
    const ic = this.tilt && el ? el.closest('.leaflet-marker-icon') : null, p = ic && ic._leaflet_pos;
    if (!p) return null;
    const lf = ic._lift || { x: 0, y: 0 }, q = this.screen3d(L.point(p.x + lf.x, p.y + lf.y)), a = this.tilt * Math.PI / 180, d = this.PD;
    return { e: Math.asin(Math.min(1, d * Math.cos(a) / Math.hypot(q.x, q.y, d - q.z))) * 180 / Math.PI, az: Math.atan2(q.u, d * Math.sin(a) - q.v) };
  },
  // 5.1.30: карта сдвинулась (игрок идёт, масштаб, наклон, поворот) — значки встают на свои точки земли заново,
  // 3D-модели мест поворачиваются к игроку той стороной, с которой он теперь на них смотрит, дома — в новой перспективе
  reAim() {
    if (!this.map) return;
    if (this.tilt) for (const m of [...this.markers.values(), this.player, this.range]) if (m) this.upright(m);
    if (typeof M3D !== 'undefined') M3D.aim();
    if (typeof Bld3D !== 'undefined') Bld3D.dirty();
  },
  // 5.1.30: точка зрения в точках слоя карты: (x, y) — над какой точкой земли (у наклонённой карты — ниже экрана: игрок смотрит
  // наискосок; у плоской — над серединой экрана), w — высота над землёй
  camLayer() {
    const m = this.map, c = m.containerPointToLayerPoint(m.getSize().divideBy(2)), r = this.rot * Math.PI / 180;
    const a = this.tilt * Math.PI / 180, d = this.PD * Math.sin(a);
    return { x: c.x + d * Math.sin(r), y: c.y + d * Math.cos(r), w: this.PD * Math.cos(a) };
  },
  // куда на земле ложится точка на высоте hp (точек) над точкой слоя p — там игрок видит крышу дома над p (так рисует Bld3D)
  roofShift(p, hp) {
    const c = this.camLayer(), k = hp / (c.w - hp);
    return { x: (p.x - c.x) * k, y: (p.y - c.y) * k };
  },
  // видимая земля — рамка в точках слоя: углы экрана, перенесённые на плоскость карты (с наклоном и поворотом), и запас pad
  viewBox(pad = 0) {
    const m = this.map, c = m.containerPointToLayerPoint(m.getSize().divideBy(2));
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of [[0, 0], [innerWidth, 0], [0, innerHeight], [innerWidth, innerHeight]]) {
      const q = this.plane(x, y);
      x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y);
    }
    return { x0: c.x + x0 - pad, y0: c.y + y0 - pad, x1: c.x + x1 + pad, y1: c.y + y1 + pad };
  },
  northUp() {
    const from = this.rot, t0 = performance.now();
    if (!from) return;
    const step = t => {
      const k = Math.min(1, (t - t0) / 350), e = 1 - Math.pow(1 - k, 3);
      this.setRot(from * (1 - e));
      if (k < 1) requestAnimationFrame(step); else this.setRot(0);
    };
    requestAnimationFrame(step);
  },
  // компас Нави без фона: золотая роза ветров, С — огненно-золотая, деления по кругу
  compassSvg() {
    let ticks = '';
    for (let i = 0; i < 72; i++) {
      const a = i * 5, big = a % 45 === 0, mid = a % 15 === 0;
      ticks += `<path d="M0 -46.5V${big ? -41 : mid ? -43 : -44.5}" transform="rotate(${a})" stroke="#f3cf6b" stroke-opacity="${big ? .95 : mid ? .6 : .35}" stroke-width="${big ? 1.4 : .8}"/>`;
    }
    const pt = (a, len, w, l, r) => `<g transform="rotate(${a})"><path d="M0 ${-len}L${-w} ${-w}L0 0Z" fill="${l}"/><path d="M0 ${-len}L${w} ${-w}L0 0Z" fill="${r}"/></g>`;
    const lt = [[ru`С`, 0, 'n'], [ru`В`, 90, ''], [ru`Ю`, 180, ''], [ru`З`, 270, '']].map(([t, a, c]) => {
      const x = (34 * Math.sin(a * Math.PI / 180)).toFixed(2), y = (-34 * Math.cos(a * Math.PI / 180)).toFixed(2);
      return `<text x="${x}" y="${y}" transform="rotate(${a} ${x} ${y})" class="${c}">${t}</text>`;
    }).join('');
    return `<svg viewBox="-50 -50 100 100" aria-hidden="true">
      <circle r="48" fill="none" stroke="#f3cf6b" stroke-opacity=".75" stroke-width="1.3"/>
      <circle r="39.5" fill="none" stroke="#f3cf6b" stroke-opacity=".28" stroke-width=".7" stroke-dasharray="1.2 2.6"/>
      ${ticks}
      ${[45, 135, 225, 315].map(a => pt(a, 20, 3.2, '#b98c3a', '#e9c874')).join('')}
      ${[90, 180, 270].map(a => pt(a, 27, 4.4, '#8f82c9', '#d9d1f5')).join('')}
      ${pt(0, 29, 4.8, '#fff1b8', '#d9480f')}
      <circle r="4.6" fill="#f3cf6b" stroke="#3a1d06" stroke-width=".9"/><circle r="1.9" fill="#231445"/>
      ${lt}</svg>`;
  },

  // 5.1.15: личный Разлом кампании (S.d.camp.rift) — как Разлом на карте, но свой: без часа, уровня и Дальнего пропуска (Raid.open — r.camp)
  campEnt() {
    const r = S.d && S.d.camp && S.d.camp.rift;
    if (!r || !SP[r.boss] || !S.campRiftOn()) return null;
    const d = this.pos ? U.dist(this.pos.lat, this.pos.lng, r.lat, r.lng) : 0;
    return { type: 'rift', camp: true, id: r.id, poi: null, lat: r.lat, lng: r.lng, tier: 1, boss: r.boss, myth: r.myth, d, done: false, endsAt: Infinity, place: null, name: ru`Разлом кампании` };
  },

  /* ---------------- МАРКЕРЫ ---------------- */
  // 4.24: дух уже в Бестиарии — встречался или пойман; иначе на карте он знак вопроса
  known(sid) { const x = S.d.dex[sid]; return !!(x && (x.seen || x.caught)); },
  // 5.1.28: холст 3D-модели места (js/m3d.js) — первым в значке (звёзды, хранитель и флаг клана — поверх); центр основания
  // модели встаёт в точку привязки значка (ax, ay = iconAnchor). Пока модель не нарисована (или WebGL нет) — прежний рисунок
  m3d(e, ax, ay, hide) { return typeof M3D !== 'undefined' ? M3D.html(M3D.kindOf(e), ax, ay, hide) : ''; },
  // 5.1.30: подпись места — что это (Источник, святилище своей мифологии, Разлом) и где (имя точки карты); под моделью (style.css),
  // у дальних мест — одно «что»
  label(e) {
    const P = MYTH_PLACES[e.myth] || MYTH_PLACES.slavic;
    const what = e.type === 'spring' ? ru`Источник` : e.type === 'shrine' ? (e.god ? P.shrineOf(e.god) : P.shrine) : e.camp ? ru`Разлом кампании` : P.rift;
    const where = e.type === 'rift' ? e.place : e.name;
    return `<div class="mk-lbl"><b><span>${U.esc(what)}</span></b>${where && where !== what ? `<i>${U.esc(where)}</i>` : ''}</div>`;
  },
  icon(e) {
    if (e.type === 'spirit') {
      const s = SP[e.sid], known = this.known(e.sid);
      return L.divIcon({ className: 'mk', iconSize: [68, 68], iconAnchor: [34, 62],
        html: `<div class="mk-spirit r${s.rar}${known ? '' : ' unk'}" style="--c:${known ? ELEMENTS[s.el].color : '#cbd5e1'}">${e.tut ? '<div class="tut-ring"></div>' : ''}<div class="mk-glow"></div>${known ? Art.img(e.sid) : '<span class="mk-q">?</span>'}${e.boost ? `<div class="mk-boost">${Art.wxIcon(Sky.w.key, 16)}</div>` : ''}</div>` });
    }
    if (e.type === 'spring') {
      return L.divIcon({ className: 'mk', iconSize: [46, 64], iconAnchor: [23, 60],
        html: `<div class="mk-spring ${e.invaded ? 'invaded' : e.ready ? '' : 'used'}">${this.m3d(e, 23, 60, !e.ready && !e.invaded ? 'jet' : '')}${Art.asImg(Art.springIcon(!e.ready, e.invaded), `spring:${!e.ready}:${!!e.invaded}`, 'mk-spring')}${this.label(e)}</div>` });
    }
    if (e.type === 'shrine') {
      return L.divIcon({ className: 'mk', iconSize: [54, 76], iconAnchor: [27, 72],
        html: `<div class="mk-shrine ${e.won ? 'won' : ''} ${e.clan ? 'held' : ''} ${S.d.level < DUEL_LEVEL ? 'locked' : ''}"${e.clan ? ` style="--cc:${CLANS[e.clan].color}"` : ''}>${e.clan ? '<div class="mk-flag"></div>' : ''}${this.m3d(e, 27, 72)}${Art.asImg(Art.shrineIcon(e.tier, e.won, e.myth), `shrine:${e.myth || 'slavic'}:${e.tier}:${!!e.won}`)}<div class="mk-tier">${'★'.repeat(e.tier)}</div>${this.label(e)}</div>` });
    }
    return L.divIcon({ className: 'mk', iconSize: [84, 96], iconAnchor: [42, 86],
      html: `<div class="mk-rift t${e.tier} ${e.done ? 'done' : ''} ${S.d.level < RAID_LEVEL && !e.camp ? 'locked' : ''} ${e.camp ? 'camp' : ''}">${this.m3d(e, 42, 86)}${Art.asImg(Art.riftIcon(e.tier, e.myth), `rift:${e.myth || 'slavic'}:${e.tier}`)}<div class="mk-boss">${Art.img(e.boss)}</div><div class="mk-tier">${'★'.repeat(e.tier)}</div>${this.label(e)}</div>` });
  },
  refresh(rebuild) {
    if (!this.map) return;
    // 5.2: под полноэкранной сценой духи и места не пересчитываются — один раз, когда она закроется (wake)
    if (Stage.busy) { this._miss = Math.max(this._miss || 0, rebuild ? 2 : 1); return; }
    if (rebuild || this._miss !== 2) this._miss = 0; // пропущенное догнали (сцена, закрываясь, сама позвала пересчёт)
    if (rebuild) { for (const m of this.markers.values()) m.remove(); this.markers.clear(); }
    const { lat, lng } = this.pos;
    // 4.21: Разломы видны с начала; до RAID_LEVEL — серые, с замком (нажатие скажет, с какого уровня)
    // 4.19: дух виден, только если он вне тумана Нави и не в опасном месте (вода, пути, трассы, стройки — см. Hazard)
    const spirits = W.spawnsAround(lat, lng).filter(e => e.tut || Hazard.bad(e.lat, e.lng) === false);
    // 5.2: Источники, Святилища и Разломы — только в радиусе Rules.PLACES.VIEW от Ловчего (уже показанное гаснет чуть дальше —
    // PLACE_HOLD м, чтобы значок на границе не мигал); Следопыт, «Рядом» и дальние Разломы по-прежнему берут места из данных
    const R = Rules.PLACES.VIEW, inView = e => e.d <= R || (e.d <= R + this.PLACE_HOLD && this.markers.has(e.id));
    const ce = this.campEnt(); // 5.1.15: личный Разлом кампании
    const places = [...(ce ? [ce] : []), ...W.riftsAround(lat, lng, R + this.PLACE_HOLD), ...W.shrinesAround(lat, lng, R + this.PLACE_HOLD), ...W.springsAround(lat, lng, R + this.PLACE_HOLD)].filter(inView);
    const ents = [...places, ...spirits];
    const seen = new Set();
    ents.forEach(e => {
      seen.add(e.id);
      const key = e.type === 'spring' ? `${e.ready}${e.invaded}` : e.type === 'rift' ? `${e.done}${S.d.level < RAID_LEVEL && !e.camp}` : e.type === 'shrine' ? `${e.won}${e.clan}${S.d.level < DUEL_LEVEL}` : e.type === 'spirit' ? this.known(e.sid) : 0;
      let m = this.markers.get(e.id);
      const fresh = !m; // появился впервые (а не сменил вид)
      if (m && m._key !== key) { m.remove(); m = null; }
      if (!m) {
        m = L.marker([e.lat, e.lng], { icon: this.icon(e), zIndexOffset: e.type === 'spirit' ? 500 : 0 }).addTo(this.map);
        m.on('click', () => this.tap(m._ent));
        if (typeof M3D !== 'undefined') M3D.bind(m.getElement());
        m._key = key;
        this.markers.set(e.id, m);
        if (fresh && !rebuild && e.type !== 'spirit') this.fadeIn(m);
      }
      m._ent = e;
      if (e.type !== 'spirit') { // 5.1.30: место внутри дома — на его крыше (upright)
        const h = Roofs.height(e.lat, e.lng) || 0;
        if (h !== (m._roofH || 0)) { m._roofH = h; this.upright(m); }
      }
      const el = m.getElement();
      if (el) {
        el.classList.toggle('far', e.d > (e.type === 'rift' || e.type === 'shrine' ? 100 : W.INTERACT));
        el.classList.toggle('tut-off', typeof Tut !== 'undefined' && !Tut.entOk(e)); // 5.2: фокус обучения — чужое приглушено
      }
    });
    for (const [id, m] of this.markers) if (!seen.has(id)) { this.markers.delete(id); this.fadeOut(m, m._ent && m._ent.type !== 'spirit'); }
    if (typeof M3D !== 'undefined') { M3D.aim(); M3D.kick(); } // 5.1.28: место стало досягаемым — его модель снова движется; 5.1.30: и видна с нужной стороны
    this.syncZones(ents);
    this.nearby = ents.filter(e => e.type === 'spirit').sort((a, b) => a.d - b.d);
    const ids = new Set(this.nearby.map(e => e.id));
    if (this._spIds && this.nearby.some(e => !this._spIds.has(e.id)) && Date.now() - (this._vibT || 0) > 3000) { this._vibT = Date.now(); U.vibrate([60, 90, 60]); } // 4.19: появился дух — двойная вибрация
    this._spIds = ids;
    UI.updateNearby(this.nearby);
    if (this.tracking) this.updateTracker();
  },
  // 5.2: место появляется и исчезает плавно (style.css: .pl-in, .pl-out); fade — false: сразу
  PLACE_HOLD: 20, FADE_MS: 450,
  fadeIn(m) {
    const el = m.getElement();
    if (!el) return;
    el.classList.add('pl-in');
    setTimeout(() => el.classList.remove('pl-in'), this.FADE_MS + 100);
  },
  fadeOut(m, fade) {
    const el = fade && m.getElement();
    if (!el) { m.remove(); return; }
    m.off('click');
    el.classList.remove('pl-in'); el.classList.add('pl-out');
    setTimeout(() => m.remove(), this.FADE_MS);
  },
  tap(e) {
    if (!e || UI.blocking()) return;
    Sfx.init();
    if (typeof Tut !== 'undefined' && !Tut.entOk(e)) { Tut.nudge(); return; } // 5.2: на обучении — только объект текущего шага
    Sfx.play('tap');
    const d = U.dist(this.pos.lat, this.pos.lng, e.lat, e.lng);
    const range = e.type === 'rift' || e.type === 'shrine' ? 100 : W.INTERACT;
    if (d > range && e.camp) { UI.toast(ru`Разлом кампании: ${U.fmtDist(d)}. Подойди ближе — нужно ${range} м`); return; } // 5.1.15: личный — только рядом
    if (d > range && e.type === 'rift' && d <= Rules.FAR.R) { Raid.open(e); return; } // дальний бой по пропуску
    if (d > range) {
      const what = e.type === 'spirit' ? SP[e.sid].name : e.type === 'spring' || e.type === 'shrine' ? e.name : ru`Разлом`;
      UI.toast(ru`${U.esc(what)}: ${U.fmtDist(d)}. Подойди ближе — нужно ${range} м`);
      return;
    }
    if (this.tracking && this.tracking.id === e.id) this.untrack();
    if (e.type === 'spirit') {
      if (Date.now() > e.expires) { UI.toast(ru`Дух уже растворился в воздухе…`); this.refresh(); return; }
      Encounter.start({ mode: 'wild', sid: e.sid, lvl: e.lvl, seed: e.id, spawnId: e.id, shiny: e.shiny, boost: e.boost, tut: e.tut });
    } else if (e.type === 'spring') UI.spring(e); // 4.19: захваченный — откроется на вкладке «Вторжение»
    else if (e.type === 'shrine') {
      if (S.d.level < DUEL_LEVEL) { UI.toast(ru`Святилища открываются с ${DUEL_LEVEL} уровня Ловчего`); return; }
      Duel.open(e);
    } else Raid.open(e);
  },
  /* ---------------- 4.10: ЗЕМЛИ ДРУЖИН, МАРЕВО РАЗЛОМОВ ---------------- */
  // радиус в пикселях: meters метров вокруг ll на масштабе z
  pxR(ll, meters, z) {
    return Math.abs(this.map.project(ll, z).y - this.map.project(L.latLng(ll.lat + meters / 111320, ll.lng), z).y);
  },
  // земли кланов (сияние цвета клана вокруг Святилища) и марево Нави вокруг открытых разломов;
  // 4.24.1: под каждым духом — еле заметная волна, как от Ловчего, только в разы меньше (SPIRIT_R м); у каждого духа — свой такт
  SPIRIT_R: 25,
  zones: new Map(),
  syncZones(ents) {
    const want = new Map();
    ents.forEach(e => {
      if (e.type === 'shrine' && e.clan && CLANS[e.clan]) want.set('z:' + e.id, { e, r: 100, cls: 'clan', css: `--cc:${CLANS[e.clan].color}`, inner: '<i class="zn-glow"></i><i class="zn-ring"></i><i class="zn-ring2"></i>' });
      // 5.2: у Разлома больше нет «провала» под ним (лиловая дымка с трещинами) — только сам значок
      if (e.type === 'spirit') want.set('s:' + e.id, { e, r: this.SPIRIT_R, cls: 'rz sp', css: `--wd:-${(U.h('wave', e.id) * 4.5).toFixed(2)}s`, pane: 'zone', inner: '<i class="sp-bg"></i><i class="rz-wave"></i>' });
    });
    for (const [id, z] of this.zones) if (!want.has(id) || want.get(id).css !== z.css) { this.fadeOut(z.m, z.cls === 'clan' && !want.has(id)); this.zones.delete(id); }
    for (const [id, w] of want) {
      if (this.zones.has(id)) continue;
      const m = L.marker([w.e.lat, w.e.lng], { interactive: false, keyboard: false, zIndexOffset: -4000, flat: true, ...(w.pane ? { pane: w.pane } : {}),
        icon: L.divIcon({ className: 'mk-zone', iconSize: [0, 0], iconAnchor: [0, 0], html: `<div class="zn ${w.cls}" style="${w.css}">${w.inner}</div>` }) }).addTo(this.map);
      this.zones.set(id, { m, r: w.r, css: w.css, cls: w.cls });
      this.fitZone(m, w.r);
      if (w.cls === 'clan') this.fadeIn(m); // 5.2: земли клана — вместе со своим Святилищем
    }
  },
  fitZone(m, r, z, anim) {
    const box = m.getElement() && m.getElement().firstElementChild;
    if (!box) return;
    const px = this.pxR(m.getLatLng(), r, z == null ? this.map.getZoom() : z);
    box.style.transition = anim ? 'width .25s cubic-bezier(0,0,.25,1), height .25s cubic-bezier(0,0,.25,1), margin .25s cubic-bezier(0,0,.25,1)' : 'none';
    box.style.width = box.style.height = px * 2 + 'px';
    box.style.margin = -px + 'px 0 0 ' + -px + 'px';
  },
  fitZones(z, anim) { for (const { m, r } of this.zones.values()) this.fitZone(m, r, z, anim); },

  /* ---------------- СЛЕДОПЫТ ---------------- */
  // Стрелка в HUD указывает направление на цель (карта всегда ориентирована на север)
  track(e) {
    this.tracking = { id: e.id, type: e.type, lat: e.lat, lng: e.lng, sid: e.sid, name: e.type === 'spirit' ? SP[e.sid].name : e.name || ru`Цель` };
    this._trackedOnce = false;
    this.updateTracker();
  },
  untrack() { this.tracking = null; this.updateTracker(); },
  nearest(type) {
    const { lat, lng } = this.pos;
    const list = type === 'spring' ? W.springsAround(lat, lng, 1500).filter(s => s.ready && !s.invaded)
      : type === 'shrine' ? W.shrinesAround(lat, lng, 2500).filter(s => !s.won) : [];
    return list.sort((a, b) => a.d - b.d)[0] || null;
  },
  updateTracker() {
    const box = U.$('#tracker'), t = this.tracking;
    if (!t) { box.classList.add('hidden'); return; }
    if (t.type === 'spirit' && !this.nearby.some(e => e.id === t.id) && this._trackedOnce) {
      UI.toast(ru`${t.name} растворился — след потерян`);
      this.tracking = null; box.classList.add('hidden'); return;
    }
    this._trackedOnce = true;
    const { lat, lng } = this.pos;
    const d = U.dist(lat, lng, t.lat, t.lng);
    const brg = Math.atan2((t.lng - lng) * Math.cos(lat * Math.PI / 180), t.lat - lat) * 180 / Math.PI;
    const near = d <= (t.type === 'rift' || t.type === 'shrine' ? 100 : W.INTERACT);
    box.classList.remove('hidden');
    box.classList.toggle('near', near);
    const ico = t.type === 'spirit' ? Art.img(t.sid) : t.type === 'spring' ? Art.springIcon(false) : Art.shrineIcon(1, false, t.myth);
    if (box._id !== t.id) { box._id = t.id; box.querySelector('.tr-ico').innerHTML = ico; }
    box.querySelector('.tr-arrow svg').style.transform = `rotate(${brg + this.rot}deg)`; // 4.7: вращается только стрелка; с учётом поворота карты
    box.querySelector('.tr-name').textContent = t.name;
    box.querySelector('.tr-dist').textContent = near ? ru`Ты на месте — коснись цели!` : U.fmtDist(d);
  },

  // Временная булавка на карте (для записей дневника)
  showPin(lat, lng, label) {
    if (this._pin) this._pin.remove();
    this._pin = L.marker([lat, lng], {
      interactive: false, zIndexOffset: 900,
      icon: L.divIcon({ className: 'mk', iconSize: [40, 52], iconAnchor: [20, 50],
        html: `<div class="mk-pin"><svg viewBox="0 0 24 30"><path d="M12 29s-10-10-10-17a10 10 0 0 1 20 0c0 7-10 17-10 17z" fill="#fbbf24" stroke="#92400e" stroke-width="1.5"/><circle cx="12" cy="12" r="4" fill="#92400e"/></svg><span>${U.esc(label)}</span></div>` }),
    }).addTo(this.map);
    this.flyTo({ lat, lng });
    clearTimeout(this._pinT);
    this._pinT = setTimeout(() => { if (this._pin) { this._pin.remove(); this._pin = null; } }, 30000);
  },

  flyTo(e) {
    this.follow = false;
    U.$('#recenterBtn').classList.add('show');
    this.map.flyTo([e.lat, e.lng], 18.5, { duration: 0.8 });
  },
};
