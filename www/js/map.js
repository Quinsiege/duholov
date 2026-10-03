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
    if (typeof Bld3D === 'undefined' || !Bld3D.on) return 0; // 5.1.42: дома плоские — места стоят на земле, крыши не нужны
    const key = lat.toFixed(6) + ',' + lng.toFixed(6);
    if (this.at.has(key)) return this.at.get(key);
    const v = Hazard.view();
    if (!v) return 0;
    if (this.at.size > 2000) this.at.clear();
    this.at.set(key, null);
    const { tx, ty, px, py } = Hazard.tileOf(lat, lng);
    v.tileCache.get({ z: Hazard.Z, x: tx, y: ty }).then(data => {
      let h = 0;
      // 5.1.34: контур здания из частей не рисуется (Bld3D.outlines) — и крыша у места не его, а частей
      const fs = data.get('buildings') || [], skip = typeof Bld3D !== 'undefined' ? Bld3D.outlines(fs) : null;
      for (const f of fs) {
        if (f.geomType !== 3 || f.props.is_underground || (skip && skip.has(f))) continue;
        let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
        for (const r of f.geom) for (const p of r) { if (p.x < a) a = p.x; if (p.y < b) b = p.y; if (p.x > c) c = p.x; if (p.y > d) d = p.y; }
        if (px >= a && px <= c && py >= b && py <= d && Hazard.inside(f.geom, px, py)) h = Math.max(h, f.props.height > 0 ? f.props.height : 8);
      }
      this.at.set(key, h);
      if (h) MapView.roofSoon(); // 5.1.31: место встаёт на крышу — одним кадром на все пришедшие крыши, без полного обновления значков
    }).catch(() => this.at.set(key, 0));
    return null;
  },
};

const MapView = {
  map: null, pos: null, follow: true, heading: 0, markers: new Map(), nearby: [], tiles: null, night: null,
  // 5.1.31: размер окна — из запаса (vp): чтение innerWidth/innerHeight после записи стилей заставляет браузер тут же пересчитать
  // раскладку всей страницы — на каждом кадре жеста это фриз; обновляется по resize
  vw: typeof innerWidth !== 'undefined' ? innerWidth : 0, vh: typeof innerHeight !== 'undefined' ? innerHeight : 0,
  vp() { this.vw = innerWidth; this.vh = innerHeight; },

  init() {
    this.vp(); addEventListener('resize', () => this.vp()); // раньше всех, кто на resize пересчитывает слой карты (initRotate)
    if (!U.$('#mapBg')) { const b = document.createElement('div'); b.id = 'mapBg'; U.$('#map').before(b); } // 5.1.31: земля — позади карты (style.css)
    if (typeof M3D !== 'undefined') M3D.init(); // 5.1.28: 3D-модели мест (js/m3d.js) — до первых значков; нет WebGL — места остаются рисунками
    // 5.1: место Ловчего — Walk (телефон или прогресс); ещё нет (новичок до Атласа) — карта ждёт на Красной площади
    const start = Walk.load() || { lat: 55.7539, lng: 37.6208 };
    this.pos = { lat: start.lat, lng: start.lng };
    this.map = L.map('map', { zoomControl: false, minZoom: this.ZMIN, maxZoom: 19, zoomSnap: 0.25, tap: true })
      .setView([this.pos.lat, this.pos.lng], this.Z0);
    this.map.attributionControl.setPrefix(false);
    // 5.1.30: подписи мест — своим плоским слоем поверх карты (их не закрывают ни модели, ни дома): placeLabels
    this._lblBox = document.createElement('div'); this._lblBox.id = 'mapLbl'; U.$('#map').after(this._lblBox);
    // 4.13: свои слои между плитками земли и значками (порядок — по z-index, см. orderPanes)
    [['zone', 380], ['bld', 390]].forEach(([n, z]) => { const p = this.map.createPane(n); p.style.zIndex = z; p.style.pointerEvents = 'none'; });
    // 5.1.30: дома были объёмными (Bld3D, WebGL). 5.1.42: на карте всё плоское, кроме мест игры, Ловчего и духов (выбор владельца) —
    // объёмные дома не заводятся (Bld3D.on — нет), плоские дома рисует сама карта (слой buildings палитры)
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
    // 5.1.42: «Экономии батареи» больше нет (ни настройки, ни охлаждения) — карта обновляется раз в 1,5 с
    setInterval(() => { if (Stage.idle()) this.refresh(); }, 1500);
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
  // 5.1.30: карта — по правилам стиля Protomaps в своей палитре (PALETTE), без своей отрисовки улиц, фонарей и цветов
  look() {
    const p = this.pos || { lat: 55.75, lng: 37.62 }, phase = U.phase(p.lat, p.lng), night = phase === 'night' || phase === 'dusk';
    return { phase, night, key: night ? 'night' : 'day' };
  },
  /* 5.1.30: палитра карты «Свежая» (выбор владельца из пяти, без Нави). 5.1.42: палитра «Навья» (выбор владельца из четырёх:
     «Сказочная», «Яркие луга», «Навья», «Бирюзовая»): днём — лавандовая земля в тон игре, шалфейные парки, сиреневая вода, белые
     улицы и лиловые дома; ночью — тёмно-фиолетовая, улицы и дома светлее земли. Цвета стиля — c (flavorOf; улицы у Protomaps
     для Leaflet — одного цвета, road); к ним — земля (фон карты под ещё не нарисованными плитками; тот же — #mapBg в style.css) и
     объёмные дома (Bld3D, сейчас выключены — дома плоские, цвет bld): крыша, стены в тени и на солнце, контраст стен */
  PALETTE: {
    day: { earth: '#e6e1f1', roof: '#e3ddf0', wall: '#a59cc0', wall2: '#d6cfe8', light: 0.7, c: { bg: '#e6e1f1', earth: '#e6e1f1',
      park: '#cfe5d3', park2: '#b9dbc0', wood: '#c1dcc8', wood2: '#a7cfb2', scrub: '#d6e6dc', water: '#a6c3f0', sand: '#efe6d6', ped: '#ece8f5',
      urban: '#e1dbee', runway: '#f4f2fa', road: '#ffffff', rail: '#a59cbf', bound: '#a79fc0', bld: '#d0c7e6',
      lbl: '#564f73', halo: '#faf8ff', city: '#2d2647', sub: '#7a7299', state: '#9a92b6', ocean: '#4f6fb8',
      lc: ['#d7e8db', '#ebe4ef', '#e1dbee', '#dce9dd', '#ffffff', '#d9e7dc', '#bcd9c5'] } },
    night: { earth: '#1b1730', roof: '#2c2546', wall: '#15112a', wall2: '#3a3260', light: 0.55, c: { bg: '#1b1730', earth: '#1b1730',
      park: '#172a2b', park2: '#1a3030', wood: '#16262a', wood2: '#193131', scrub: '#1c2b2d', water: '#151f42', sand: '#272238', ped: '#221d3a',
      urban: '#1f1a36', runway: '#2b2642', road: '#463e72', rail: '#403a60', bound: '#4f4874', bld: '#2a2444',
      lbl: '#b6acd9', halo: '#16122a', city: '#e7e1fb', sub: '#9b91c0', state: '#7f76a6', ocean: '#8fa6e0',
      lc: ['#1a2b2b', '#242036', '#1f1a36', '#1b2c2a', '#2f2b44', '#1c2b2c', '#162728'] } },
  },
  pal(night) { return night ? this.PALETTE.night : this.PALETTE.day; },
  // цвета палитры → полный набор цветов стиля Protomaps (те же ключи, что у его light/dark; улицы, мосты и тоннели — цвета road)
  flavorOf(c) {
    const r = c.road, k = c.bg, u = c.urban;
    return { background: c.bg, earth: c.earth, park_a: c.park, park_b: c.park2, hospital: u, industrial: u, school: u, wood_a: c.wood, wood_b: c.wood2,
      pedestrian: c.ped, scrub_a: c.scrub, scrub_b: c.park2, glacier: c.lc[4], sand: c.sand, beach: c.sand, aerodrome: u, runway: c.runway, water: c.water,
      zoo: c.park, military: u, tunnel_other_casing: k, tunnel_minor_casing: k, tunnel_link_casing: k, tunnel_major_casing: k, tunnel_highway_casing: k,
      tunnel_other: r, tunnel_minor: r, tunnel_link: r, tunnel_major: r, tunnel_highway: r, pier: c.ped, buildings: c.bld,
      minor_service_casing: k, minor_casing: k, link_casing: k, major_casing_late: k, highway_casing_late: k, other: r, minor_service: r,
      minor_a: r, minor_b: r, link: r, major_casing_early: k, major: r, highway_casing_early: k, highway: r, railway: c.rail,
      boundaries: c.bound, bridges_other_casing: k, bridges_minor_casing: k, bridges_link_casing: k, bridges_major_casing: k, bridges_highway_casing: k,
      bridges_other: r, bridges_minor: r, bridges_link: r, bridges_major: r, bridges_highway: r,
      roads_label_minor: c.lbl, roads_label_minor_halo: c.halo, roads_label_major: c.lbl, roads_label_major_halo: c.halo, ocean_label: c.ocean,
      subplace_label: c.sub, subplace_label_halo: c.halo, city_label: c.city, city_label_halo: c.halo, state_label: c.state, state_label_halo: c.halo,
      country_label: c.state, address_label: c.lbl, address_label_halo: c.halo,
      pois: { blue: '#1A8CBD', green: '#20834D', lapis: '#315BCF', pink: '#EF56BA', red: '#F2567A', slategray: '#6A5B8F', tangerine: '#CB6704', turquoise: '#00C3D4' },
      landcover: { grassland: c.lc[0], barren: c.lc[1], urban_area: c.lc[2], farmland: c.lc[3], glacier: c.lc[4], scrub: c.lc[5], forest: c.lc[6] } };
  },
  // правила рисования и подписей для цветов палитры P; подписей точек (pois) нет — у мест игры свои подписи (MapView.label)
  flavorRules(P) {
    const f = this.flavorOf(P.c), noPois = rules => rules.filter(r => r.dataLayer !== 'pois');
    return { paint: protomapsL.paintRules(f), label: noPois(protomapsL.labelRules(f, I18N.lang)), bg: f.background };
  },
  // 5.1.38: сменилось разрешение графики (Gfx): слои Protomaps заводятся заново (разрешение у них — в размере плитки и в
  // подписях, на ходу его не сменить; данные плиток — из кэша PMTiles), дома и 3D-модели — в новом размере холстов
  applyRes() {
    if (this.map && this.tiles && this.tiles.rerenderTiles) {
      for (const l of [this.tiles, this.bldTiles]) if (l) this.map.removeLayer(l);
      this.tiles = this.bldTiles = null; this._look = null;
      this.setTiles();
    }
    if (typeof Bld3D !== 'undefined' && Bld3D.on) Bld3D.draw();
    if (typeof M3D !== 'undefined' && M3D.relayout) M3D.relayout();
  },
  setTiles() {
    if (this.tiles && Stage.busy) return; // 5.2: под сценой плитки не перерисовываются — облик сверится, когда она закроется (wake)
    const lk = this.look();
    if (lk.key === this._look) return;
    this._look = lk.key;
    const night = this.night = lk.night, F = this.pal(night);
    if (!this.tiles) {
      const osm = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
      if (typeof protomapsL !== 'undefined' && this.covered(this.pos)) {
        const url = this.tilesUrl(), st = this.flavorRules(F);
        this.tiles = this.cull(protomapsL.leafletLayer({ url, lang: I18N.lang, attribution: `${osm} · <a href="https://protomaps.com">Protomaps</a>`,
          paintRules: st.paint, labelRules: [], backgroundColor: st.bg, devicePixelRatio: Gfx.dpr() })).addTo(this.map); // 5.1.38: разрешение — Gfx
        U.$('#map').classList.add('vecmap');
        // 4.13: подписи — вторым слоем над зоной Ловчего и объёмными домами; плитки читаются один раз (общий кэш)
        this.bldTiles = this.cull(protomapsL.leafletLayer({ url, lang: I18N.lang, attribution: '', pane: 'bld', paintRules: [], labelRules: st.label, devicePixelRatio: Gfx.dpr() }));
        this.bldTiles.views = this.tiles.views;
        // 5.1.31: плитка подписей, на которую не попала ни одна подпись (каждая третья в городе), — скрыта: пустой холст — всё равно
        // свой слой видеокарты, а их число — главное в цене каждого кадра, пока карта движется
        const lr = this.bldTiles.renderTile.bind(this.bldTiles);
        this.bldTiles.renderTile = (c, el, key, done) => { const p = lr(c, el, key, done); if (p && p.then) p.then(() => this.lblTileVis(c, el)); return p; };
        this.bldTiles.addTo(this.map);
      } else {
        this.tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: osm }).addTo(this.map);
      }
    } else if (this.tiles.rerenderTiles) {
      // день сменился ночью (или наоборот) — другой стиль: перерисовать плитки и подписи
      const st = this.flavorRules(F);
      Object.assign(this.tiles, { paintRules: st.paint, backgroundColor: st.bg });
      this.tiles.rerenderTiles();
      if (this.bldTiles) { this.bldTiles.labelRules = st.label; this.bldTiles.clearLayout(); this.bldTiles.rerenderTiles(); }
    }
    if (typeof Bld3D !== 'undefined' && Bld3D.on) Bld3D.theme(F); // объёмные дома — в тон карте
    document.body.classList.toggle('night', night);
    const bg = U.$('#mapBg'); if (bg) bg.style.background = F.earth; // и земля под ещё не нарисованными плитками (5.1.31: слоем позади карты)
    if (typeof Music !== 'undefined') Music.apply(); // 4.8: днём и ночью — разные мелодии карты
  },

  /* 5.1.31: плитки карты — только под видимой землёй (с запасом TILE_PAD плиток), а не во весь слой карты. Слой больше экрана:
     у наклонённой карты его нижняя треть — под экраном, у повёрнутой это квадрат на любой поворот (в окне ПК — до 3700 точек), и
     видна из него от силы пятая часть. Лишние плитки рисовались (каждая перебирает все дома и дороги своего куска данных) и держали
     память видеокарты: местность долго прогружалась, при повороте камеры экран мерцал. Пока камера поворачивается — подгружаются
     на ходу (tilesSoon); ушедшая из виду плитка выбрасывается дальше TILE_KEEP плиток (поворот туда-обратно её не перерисовывает) */
  TILE_PAD: 1, TILE_KEEP: 2,
  cull(lay) {
    const self = this, bounds = lay._getTiledPixelBounds, valid = lay._isValidTile, upd = lay._update;
    // диапазон плиток — рамка видимой земли с запасом (в точках масштаба плиток), не шире слоя карты. Рамка — с серединой у игрока:
    // Leaflet заводит, а Protomaps рисует плитки от середины рамки — первой прогружается земля под ногами, даль — следом (лишние
    // клетки рамки отсеивает _isValidTile)
    lay._getTiledPixelBounds = function (center) {
      const b = bounds.call(this, center), m = this._map, P = self.seenPoly();
      if (!P || !m) return b;
      const z = m._animatingZoom ? Math.max(m._animateToZoom, m.getZoom()) : m.getZoom(), k = m.getZoomScale(z, this._tileZoom);
      const c = m.project(center, this._tileZoom).floor(), o = m.containerPointToLayerPoint(m.getSize().divideBy(2)), pad = 256 * self.TILE_PAD;
      let hx = 0, hy = 0;
      for (const [x, y] of P) { hx = Math.max(hx, Math.abs((x - o.x) / k)); hy = Math.max(hy, Math.abs((y - o.y) / k)); }
      hx += pad; hy += pad;
      return L.bounds([Math.max(b.min.x, c.x - hx), Math.max(b.min.y, c.y - hy)], [Math.min(b.max.x, c.x + hx), Math.min(b.max.y, c.y + hy)]);
    };
    // в рамке — только плитки, которые задевают саму видимую землю (у повёрнутой карты углы рамки — мимо)
    lay._isValidTile = function (co) { return valid.call(this, co) && self.tileSeen(this, co, self.TILE_PAD); };
    // ушедшие из виду дальше TILE_KEEP плиток — выбросить
    lay._update = function (center) {
      upd.call(this, center);
      if (!this._map || this._tileZoom == null) return;
      let drop = false;
      for (const key in this._tiles) {
        const t = this._tiles[key];
        if (t.current && t.coords.z === this._tileZoom && !self.tileSeen(this, t.coords, self.TILE_KEEP)) { t.current = false; drop = true; }
      }
      if (drop) this._pruneTiles();
    };
    // проявление новых плиток (как в Leaflet 1.9.4): прозрачность пишется, только если изменилась — Leaflet переписывал её всем
    // плиткам на каждом кадре, пока проявляется хоть одна, и браузер на каждом кадре пересчитывал стили сотен плиток
    lay._updateOpacity = function () {
      if (!this._map) return;
      const op = (el, v) => { if (el._op !== v) { el._op = v; L.DomUtil.setOpacity(el, v); } };
      op(this._container, this.options.opacity);
      const now = +new Date();
      let next = false, prune = false;
      for (const key in this._tiles) {
        const t = this._tiles[key];
        if (!t.current || !t.loaded) continue;
        const f = Math.min(1, (now - t.loaded) / 200);
        op(t.el, f);
        if (f < 1) next = true;
        else { if (t.active) prune = true; else this._onOpaqueTile(t); t.active = true; }
      }
      if (prune && !this._noPrune) this._pruneTiles();
      if (next) { L.Util.cancelAnimFrame(this._fadeFrame); this._fadeFrame = L.Util.requestAnimFrame(this._updateOpacity, this); }
    };
    return lay;
  },
  // видимая земля — углы экрана на плоскости карты, в точках слоя (5.1.34: сверху — не дальше дальнего края карты, topY)
  seenPoly() {
    const m = this.map;
    if (!m || !this.vw || !this.vh) return null;
    // один раз на положение карты (плиток в рамке — десятки, а карта между ними не двигается)
    const pp = m._getMapPanePos(), key = `${pp.x},${pp.y},${this.rot},${this.tilt},${m.getZoom()},${this.vw},${this.vh},${this._py}`;
    if (this._spKey === key) return this._sp;
    this._spKey = key;
    const c = m.containerPointToLayerPoint(m.getSize().divideBy(2)), W = this.vw, H = this.vh, T = this.topY();
    return (this._sp = [[0, T], [W, T], [W, H], [0, H]].map(([x, y]) => { const q = this.plane(x, y); return [c.x + q.x, c.y + q.y]; }));
  },
  // плитка co слоя lay задевает видимую землю с запасом pad плиток? (разделяющие оси: оси плитки и стороны четырёхугольника земли)
  tileSeen(lay, co, pad) {
    const m = lay._map, P = this.seenPoly();
    if (!P || !m) return true;
    const b = lay._tileCoordsToNwSe(co), nw = m.latLngToLayerPoint(b[0]), se = m.latLngToLayerPoint(b[1]), M = (se.x - nw.x) * pad;
    const R = [[nw.x - M, nw.y - M], [se.x + M, nw.y - M], [se.x + M, se.y + M], [nw.x - M, se.y + M]];
    const axes = [[1, 0], [0, 1]];
    for (let i = 0; i < 4; i++) { const a = P[i], q = P[(i + 1) % 4]; axes.push([q[1] - a[1], a[0] - q[0]]); }
    for (const [nx, ny] of axes) {
      let p0 = Infinity, p1 = -Infinity, r0 = Infinity, r1 = -Infinity;
      for (const [x, y] of P) { const d = x * nx + y * ny; if (d < p0) p0 = d; if (d > p1) p1 = d; }
      for (const [x, y] of R) { const d = x * nx + y * ny; if (d < r0) r0 = d; if (d > r1) r1 = d; }
      if (p1 < r0 || r1 < p0) return false;
    }
    return true;
  },
  // камера повернулась или наклонилась — плитки под новую видимую землю (на жесте — не чаще раза в 90 мс)
  tilesSoon() {
    if (this._tilesT) return;
    this._tilesT = setTimeout(() => { this._tilesT = 0; for (const l of [this.tiles, this.bldTiles]) if (l && l._map && l._update) l._update(); }, 90);
  },

  lblTileVis(c, el) {
    const idx = this.bldTiles && this.bldTiles.labelers && this.bldTiles.labelers.getIndex(c.z);
    if (!idx || !el) return;
    const g = 16, n = idx.searchBbox({ minX: 256 * c.x - g, minY: 256 * c.y - g, maxX: 256 * (c.x + 1) + g, maxY: 256 * (c.y + 1) + g }, Infinity).size;
    el.style.display = n ? '' : 'none';
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
      if (jump) this.map.setView(ll, this.Z0, { animate: false });
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
      // 5.1.31: касания приходят чаще кадров (экраны 90–120 Гц) — поворот раз за кадр, по последнему положению пальцев
      g.want = g.r + da;
      if (!g.raf) g.raf = requestAnimationFrame(() => { if (!g) return; g.raf = 0; this.setRot(g.want); });
    }, { passive: true });
    const end = e => { if (g && e.touches.length < 2) { const was = g.on; if (g.raf) { cancelAnimationFrame(g.raf); this.setRot(g.want); } g = null; if (was && Math.abs(this.rot) < 6) this.northUp(); } };
    box.addEventListener('touchend', end, { passive: true });
    box.addEventListener('touchcancel', end, { passive: true });
    // компас
    const c = U.$('#compassBtn');
    if (c) { c.innerHTML = this.compassSvg(); c.onclick = () => { Sfx.play('tap'); this.northUp(); }; }
    addEventListener('resize', () => { if (this._sq) this.layout(); });
    this.setTilt(true); // 5.1.42: наклон 50° всегда — настройки «Объёмная карта» больше нет
  },
  /* 4.11: наклон камеры, как в Pokémon GO: карта ложится вдаль (перспектива), игрок — чуть ниже середины экрана. Слой карты становится больше экрана ровно настолько, чтобы закрыть его целиком:
     трапеция экрана, спроецированная на плоскость карты (а при повороте — описанный вокруг неё квадрат).
     5.1.34: наклон постоянный — TILT (50°, выбор владельца; было 14–50° пальцем), пальцем камеру только поворачивают; дымки у верха
     экрана нет. Карта — не дальше FAR точек слоя впереди Ловчего: у наклона 50° это за верхом экрана (там ~1900), а у большего
     наклона горизонт пришёл бы на экран — слой карты и плитки ушли бы в бесконечность */
  TILT: 50, PD: 1100, FAR: 2400, tilt: 0, _py: 0,
  // дальний край карты на экране (y, CSS-пиксели; −∞ — у плоской карты): точка земли в FAR точках слоя впереди Ловчего
  farY() {
    if (!this.tilt) return -Infinity;
    const t = this.tilt * Math.PI / 180, py = this._py || this.vh / 2, F = this.FAR;
    return py - F * Math.cos(t) * this.PD / (this.PD + F * Math.sin(t));
  },
  // верх видимой земли на экране: дальний край карты или верх экрана, если край выше него
  topY() { return Math.max(0, this.farY()); },
  layout() {
    const box = U.$('#map'), on = !!(this.tilt || this.rot), W = this.vw || innerWidth, H = this.vh || innerHeight;
    this._sq = on;
    this._py = this.tilt ? Math.round(H * .6) : H / 2;
    if (on) {
      // слой карты — до дальнего края земли (не дальше FAR) и до нижнего края экрана, при повороте — квадрат вокруг этого
      const tf = this._tiltFor = this.tilt;
      const t = tf * Math.PI / 180, sn = Math.sin(t), cs = Math.cos(t), d = this.PD, py = this._py, den = d * cs - py * sn;
      const top = !tf ? py : den > 0 ? Math.min(this.FAR, py * d / den) : this.FAR, bot = tf ? (H - py) * d / (d * cs + (H - py) * sn) : H - py;
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
  /* 5.1.30: камера одним пальцем (и мышью), как в Pokémon GO: влево-вправо — облёт вокруг Ловчего (земля под пальцем идёт за ним:
     над Ловчим и под ним — в разные стороны). 5.1.34: только облёт — наклон постоянный (TILT), вверх-вниз палец камеру не наклоняет.
     Карта всегда за Ловчим: ходят джойстиком и Атласом, сдвигать её пальцем не нужно. Два пальца — масштаб и поворот, как раньше;
     лёгкое касание — нажатие на значок. */
  ORBIT: { yaw: 0.35 }, // градусов на CSS-пиксель пальца
  initOrbit() {
    const box = U.$('#map');
    if (this.map.dragging) this.map.dragging.disable();
    let g = null, ate = 0, want = null, raf = 0;
    // палец двигается чаще, чем меняются кадры (на экранах 120 Гц — вдвое): поворот — один раз за кадр, по последней точке
    const apply = () => { raf = 0; const w = want; want = null; if (w != null) this.setRot(w); };
    box.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (g) { g.multi = true; return; } // второй палец — жест двумя пальцами (масштаб, поворот)
      g = { id: e.pointerId, x: e.clientX, y: e.clientY, rot: this.rot, on: false, multi: false, sg: e.clientY < (this._py || this.vh / 2) ? 1 : -1 };
    });
    addEventListener('pointermove', e => {
      if (!g || e.pointerId !== g.id || g.multi) return;
      const dx = e.clientX - g.x, dy = e.clientY - g.y;
      if (!g.on) {
        if (Math.hypot(dx, dy) < 8) return;
        g.on = true;
        // 5.1.31: мышь ведёт камеру — курсор «держится» за карту: браузеру не нужно на каждом движении искать, над каким значком
        // или плиткой он теперь, и пересчитывать наведение (у пальца так и есть само по себе)
        if (e.pointerType !== 'touch') try { box.setPointerCapture(g.id); } catch (x) { /* не поддерживается */ }
      }
      want = g.rot + g.sg * dx * this.ORBIT.yaw;
      if (!raf) raf = requestAnimationFrame(apply);
    });
    const end = e => {
      if (!g || e.pointerId !== g.id) return;
      if (raf) { cancelAnimationFrame(raf); apply(); } // последняя точка пальца — сразу
      if (g.on && !g.multi) { ate = performance.now(); if (Math.abs(this.rot) < 4) this.northUp(); }
      g = null;
    };
    addEventListener('pointerup', end);
    addEventListener('pointercancel', end);
    // палец вёл камеру — значок под ним не нажимается
    box.addEventListener('click', e => { if (performance.now() - ate < 350) { e.stopPropagation(); e.preventDefault(); } }, true);
  },
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
    let X = x - this.vw / 2, Y = y - (this._py || this.vh / 2);
    if (this.tilt) {
      const t = this.tilt * Math.PI / 180, sn = Math.sin(t), cs = Math.cos(t), d = this.PD;
      Y = Y * d / (cs * d + Y * sn); X = X * (d - Y * sn) / d;
    }
    return { x: X, y: Y };
  },
  // 5.1.30: видимая земля в осях экрана на плоскости карты (от точки зрения), с запасом pad — холст объёмных домов (Bld3D)
  viewUV(pad = 0) {
    let u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity;
    const W = this.vw, H = this.vh, T = this.topY(); // 5.1.34: сверху — до дальнего края карты
    for (const [x, y] of [[0, T], [W, T], [0, H], [W, H]]) {
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
    // значки стоят прямо: им — только новый поворот (место на слое карты от поворота не меняется — без пересчёта Leaflet)
    if (!turned) this.map.eachLayer(l => { if (l instanceof L.Marker) this.upright(l); });
    const el = this.player && this.player.getElement();
    if (el) el.querySelector('.arrow').style.transform = `rotate(${this.heading + r}deg)`;
    const c = U.$('#compassBtn');
    if (c) { c.firstElementChild.style.transform = `rotate(${r}deg)`; c.classList.toggle('turned', !!r); }
    if (this.tracking) this.updateTracker();
    if (typeof Bld3D !== 'undefined') Bld3D.dirty(); // 5.1.30: объёмные дома поворачиваются вместе с картой — в этом же кадре
    this.placeLabels(); // 5.1.31: подписи — тоже в этом кадре (раньше догоняли значки кадром позже — дёргались)
    this.seeThrough(); // 5.1.32: дома, за которыми фигуры, — прозрачнее (с другой стороны — другие)
    this.tilesSoon();
  },
  // значок на повёрнутой/наклонённой карте стоит прямо (см. initRotate)
  LIFT_Z: 36, // насколько значок наклонённой карты выдвинут к игроку, CSS-пиксели: иначе нижняя половина ушла бы «под» плитки
  /* 5.1.32: камера — как в Pokémon GO. Отдалить её можно до ZMIN (раньше — до 15: полрайона, фигуры терялись), исходный масштаб — Z0.
     Фигуры (места, духи, Ловчий) — в размер расстояния до камеры: приблизили камеру — крупнее, отдалили — мельче (ZK: размер ×2^(ZK·Δz));
     у нижнего края экрана (ближе к камере) — крупнее, к горизонту — мельче. Земля наклонённой карты видна в перспективе, и значок на ней
     и так был в размер своей точки земли (f), но камера карты «длиннофокусная» (PD): у нижнего края экрана фигура была всего в 1,2 раза
     крупнее, чем у Ловчего, у верхнего — 0,7 его; теперь у фигур перспектива сильнее (FIG: размер f^(1+FIG)) — 1,4 и 0,5 (наклон 32°).
     Размер на экране — не меньше FIG_MIN и не больше FIG_MAX от исходного.
     5.1.34: у постоянного наклона 50° перспектива своя сильная (у нижнего края экрана — 1,4, у верхнего — 0,4) — добавки фигурам
     нет (FIG 0); с приближением камеры — не больше FIG_MAX */
  ZMIN: 16.75, Z0: 17.5, ZK: 0.7, FIG: 0, FIG_MIN: 0.45, FIG_MAX: 1.8,
  // во сколько раз фигура на точке земли с перспективой f крупнее, чем её рисует сама перспектива карты
  figScale(f) {
    const m = this.map, z = m._animatingZoom ? m._animateToZoom : m.getZoom(); // масштаб анимируется — сразу к новому (значок — плавно, style.css)
    const s = Math.pow(f, this.FIG) * Math.pow(2, (z - this.Z0) * this.ZK);
    return Math.max(this.FIG_MIN / f, Math.min(this.FIG_MAX / f, s));
  },
  upright(mk) {
    const el = mk._icon, p = el && el._leaflet_pos;
    if (!p || mk._map !== this.map || (!this.rot && !this.tilt)) return;
    const to = `${-parseFloat(el.style.marginLeft) || 0}px ${-parseFloat(el.style.marginTop) || 0}px`;
    if (el._to !== to) { el.style.transformOrigin = to; el._to = to; }
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
      // 5.1.31: значок далеко за краем экрана (с запасом на высоту модели) — уже стоит, где стоял: переставим, когда подойдёт к экрану
      const f = this.PD / (this.PD - q.z), sx = this.vw / 2 + q.x * f, sy = (this._py || this.vh / 2) + q.y * f;
      const off = sx < -320 || sx > this.vw + 320 || sy < -420 || sy > this.vh + 320;
      if (el._up === p && off) return;
      el._up = p; el._off = off;
      // 5.1.32: и в размер расстояния до камеры (figScale); _f, _g — перспектива точки земли и добавка фигуре (подписи, прозрачные дома, M3D)
      const g = el._g = this.figScale(f);
      el._f = f;
      t += ` rotateX(${-this.tilt}deg) translate3d(${(-q.x * k).toFixed(2)}px, ${(-q.y * k).toFixed(2)}px, ${this.LIFT_Z}px) scale(${((1 - k) * g).toFixed(4)})`;
    } else el._g = el._f = 1;
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
    this.placeLabels();
    this.seeThrough(); // 5.1.32: и какие дома теперь заслоняют фигуры (они — прозрачнее)
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
    const W = this.vw, H = this.vh, T = this.topY(); // 5.1.34: сверху — до дальнего края карты
    for (const [x, y] of [[0, T], [W, T], [0, H], [W, H]]) {
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
  // подпись значка места — в слое подписей (создать или обновить текст)
  lblFor(m, e) {
    const h = this.label(e);
    if (!m._lbl) { const t = document.createElement('div'); t.innerHTML = h; m._lbl = t.firstChild; this._lblBox.appendChild(m._lbl); m._lblH = h; }
    else if (m._lblH !== h) { const t = document.createElement('div'); t.innerHTML = h; m._lbl.innerHTML = t.firstChild.innerHTML; m._lblH = h; }
  },
  dropLbl(m) { if (m && m._lbl) { m._lbl.remove(); m._lbl = null; } },
  // подписи — под моделью своего места: точка опоры значка (с крышей) → на экран той же перспективой, что у карты; масштаб —
  // как у значка (дальше — мельче); ближние — поверх дальних. Зовётся на каждом сдвиге карты (reAim) и когда модель встала (lblSoon)
  placeLabels() {
    if (!this.map || !this._lblBox) return;
    const W = this.vw, H = this.vh, cx = W / 2, cy = this._py || H / 2, d = this.PD;
    const hide = lb => { if (!lb._hid) { lb.style.display = 'none'; lb._hid = true; } };
    for (const m of this.markers.values()) {
      const lb = m._lbl, ic = m._icon, p = ic && ic._leaflet_pos;
      if (!lb) continue;
      if (!p) { hide(lb); continue; }
      const lf = ic._lift || { x: 0, y: 0 }, q = this.screen3d(L.point(p.x + lf.x, p.y + lf.y)), f = this.tilt ? d / (d - q.z) : 1;
      const box = ic.firstElementChild, ay = m.options.icon.options.iconAnchor[1], g = this.tilt ? ic._g || 1 : 1; // 5.1.32: фигура — в размер расстояния до камеры (upright), подпись — под её низом
      const bot = box && (box._m3dBot != null ? box._m3dBot : parseFloat(box.style.getPropertyValue('--m3d-bot'))); // низ модели в значке (js/m3d.js), иначе — низ рисунка
      const off = (Number.isFinite(bot) ? (bot - ay) * g + 13 : (m.options.icon.options.iconSize[1] - ay) * g + 4) * f;
      const x = cx + q.x * f, y = cy + q.y * f + off;
      if (x < -200 || x > W + 200 || y < -60 || y > H + 60) { hide(lb); continue; }
      if (lb._hid !== false) { lb.style.display = ''; lb._hid = false; }
      // 5.1.34: у нижнего края экрана подпись не крупнее LBL_MAX — иначе она шириной в экран
      const tf = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translateX(-50%) scale(${Math.min(f, this.LBL_MAX).toFixed(3)})`, zi = Math.round(1000 + q.z);
      if (lb._tf !== tf) { lb.style.transform = tf; lb._tf = tf; }
      if (lb._zi !== zi) { lb.style.zIndex = zi; lb._zi = zi; }
    }
  },
  LBL_MAX: 1.2,
  lblSoon() { if (!this._lblRaf) this._lblRaf = requestAnimationFrame(() => { this._lblRaf = 0; this.placeLabels(); }); },
  /* 5.1.32: дом, за которым стоит фигура (место, дух, сам Ловчий), становится прозрачнее, а сама фигура — тусклее: её видно сквозь дом.
     Объёмные дома лежат на земле одним холстом (Bld3D), а значки стоят над ним: фигура за домом рисовалась поверх его стены, будто
     стоит перед ним. За домом ли фигура — по лучам взгляда, так же, как дома рисует Bld3D: из точки зрения к XR_N вертикалям по ширине
     фигуры — проходит ли луч сквозь дом ниже его крыши (Bld3D.hides); такие дома — полупрозрачные (Bld3D.setFade), фигура — с классом
     behind (style.css) */
  XR_N: 3,
  seeThrough() {
    if (typeof Bld3D === 'undefined' || !Bld3D.on) return;
    const ctx = this.map && this.tilt ? { cam: this.camLayer(), mpx: Bld3D.mpx(this.map), z: this.map.getZoom(), gen: Bld3D.gen } : null, set = new Set();
    if (ctx) ctx.hi = Bld3D.hiPx(ctx.mpx, ctx.cam);
    for (const m of [...this.markers.values(), this.player]) {
      if (!m || !m._icon) continue;
      const hid = ctx ? this.hiders(m, ctx) : []; // плоская карта — дома не заслоняют ничего
      for (const b of hid) set.add(b);
      const dim = hid.length > 0;
      if (m._dim !== dim || m._dimIc !== m._icon) { m._dim = dim; m._dimIc = m._icon; m._icon.classList.toggle('behind', dim); }
    }
    Bld3D.setFade(set);
  },
  seeSoon() { if (!this._seeRaf) this._seeRaf = requestAnimationFrame(() => { this._seeRaf = 0; this.seeThrough(); }); },
  // ширина фигуры значка (её точки): холст 3D-модели (место, Ловчий) — пока модели нет, 0; дух — значок
  figW(mk) {
    const ic = mk._icon;
    if (mk._figIc !== ic) { mk._figIc = ic; mk._xk = null; mk._fc = ic.querySelector('canvas.mk3d'); } // значок новый — где его фигура
    if (mk._fc) { const v = mk._fc._m3d; return v && v.ready ? v.w : 0; }
    const s = ic.firstElementChild;
    return s && s.classList.contains('mk-spirit') ? mk.options.icon.options.iconSize[0] : 0;
  },
  // дома, которые заслоняют от игрока хотя бы низ фигуры значка mk
  hiders(mk, ctx) {
    const ic = mk._icon, p = ic._leaflet_pos, W = p && !ic._off ? this.figW(mk) : 0; // далеко за экраном — не считать
    if (!W) { mk._xk = null; return (mk._hid = []); }
    /* фигура почти не сдвинулась ни по карте, ни относительно точки зрения (меньше ¾ точки; камера, масштаб и дома — те же) — дома те же:
       на ходу Ловчий проходит за кадр десятую долю точки, и фигуры пересчитываются раз в несколько кадров, а не на каждом. Проверять
       нужно оба сдвига: камера идёт за Ловчим, и относительно неё он стоит на месте, а по карте — идёт (5.1.32: без сдвига по карте
       дом, за который он зашёл, становился прозрачным только после поворота камеры) */
    const cam = ctx.cam, kx = cam.x - p.x, ky = cam.y - p.y, g = ic._g || 1, o = mk._xk;
    if (o && o.gen === ctx.gen && o.z === ctx.z && o.W === W && o.roof === mk._roofH && Math.abs(o.px - p.x) < 0.75 && Math.abs(o.py - p.y) < 0.75 &&
      Math.abs(o.kx - kx) < 0.75 && Math.abs(o.ky - ky) < 0.75 && Math.abs(o.w - cam.w) < 0.5 && Math.abs(o.g - g) < 0.004 * g && Math.abs(o.r - this.rot) < 0.2) return mk._hid;
    mk._xk = { gen: ctx.gen, z: ctx.z, W, roof: mk._roofH, px: p.x, py: p.y, kx, ky, w: cam.w, g, r: this.rot };
    const out = mk._hid = [], base = mk._roofH ? Bld3D.hpx(mk._roofH) : 0; // место на крыше: низ фигуры — на высоте крыши
    if (ctx.hi <= base) return out;
    // вертикали фигуры — середина и по краям (0,3 ширины от середины), «вправо по экрану» на плоскости карты; дома — у лучей взгляда
    // на них: рамка отрезков от крайних вертикалей к точке зрения — до доли пути, где луч уже выше самого высокого дома
    const r = this.rot * Math.PI / 180, ux = Math.cos(r), uy = -Math.sin(r), half = 0.3 * W * g, N = this.XR_N, s = Math.min(1, ctx.hi / cam.w), xs = [], ys = [];
    for (let i = 0; i < N; i++) { const d = (2 * i / (N - 1) - 1) * half; xs.push(p.x + ux * d); ys.push(p.y + uy * d); }
    const ex = [xs[0], xs[N - 1]].flatMap(x => [x, x + (cam.x - x) * s]), ey = [ys[0], ys[N - 1]].flatMap(y => [y, y + (cam.y - y) * s]);
    for (const c of Bld3D.occNear(Math.min(...ex), Math.min(...ey), Math.max(...ex), Math.max(...ey))) {
      for (let i = 0; i < N; i++) if (Bld3D.hides(c, xs[i], ys[i], cam, ctx.mpx, base)) { out.push(c.b); break; }
    }
    return out;
  },
  icon(e) {
    if (e.type === 'spirit') {
      const s = SP[e.sid], known = this.known(e.sid);
      return L.divIcon({ className: 'mk', iconSize: [68, 68], iconAnchor: [34, 62],
        html: `<div class="mk-spirit r${s.rar}${known ? '' : ' unk'}${e.tut ? ' sp-tut' : ''}" style="--c:${known ? ELEMENTS[s.el].color : '#cbd5e1'}">${e.tut ? '<div class="tut-ring"></div>' : ''}<div class="mk-glow"></div>${known ? Art.img(e.sid) : '<span class="mk-q">?</span>'}${e.boost ? `<div class="mk-boost">${Art.wxIcon(Sky.w.key, 16)}</div>` : ''}</div>` });
    }
    if (e.type === 'spring') {
      return L.divIcon({ className: 'mk', iconSize: [46, 64], iconAnchor: [23, 60],
        html: `<div class="mk-spring ${e.invaded ? 'invaded' : e.ready ? '' : 'used'}">${this.m3d(e, 23, 60, !e.ready && !e.invaded ? 'jet' : '')}${Art.asImg(Art.springIcon(!e.ready, e.invaded), `spring:${!e.ready}:${!!e.invaded}`, 'mk-spring')}</div>` });
    }
    if (e.type === 'shrine') {
      return L.divIcon({ className: 'mk', iconSize: [54, 76], iconAnchor: [27, 72],
        html: `<div class="mk-shrine ${e.won ? 'won' : ''} ${e.clan ? 'held' : ''} ${S.d.level < DUEL_LEVEL ? 'locked' : ''}"${e.clan ? ` style="--cc:${CLANS[e.clan].color}"` : ''}>${e.clan ? '<div class="mk-flag"></div>' : ''}${this.m3d(e, 27, 72)}${Art.asImg(Art.shrineIcon(e.tier, e.won, e.myth), `shrine:${e.myth || 'slavic'}:${e.tier}:${!!e.won}`)}<div class="mk-tier">${'★'.repeat(e.tier)}</div></div>` });
    }
    return L.divIcon({ className: 'mk', iconSize: [84, 96], iconAnchor: [42, 86],
      html: `<div class="mk-rift t${e.tier} ${e.done ? 'done' : ''} ${S.d.level < RAID_LEVEL && !e.camp ? 'locked' : ''} ${e.camp ? 'camp' : ''}">${this.m3d(e, 42, 86)}${Art.asImg(Art.riftIcon(e.tier, e.myth), `rift:${e.myth || 'slavic'}:${e.tier}`)}<div class="mk-boss">${Art.img(e.boss)}</div><div class="mk-tier">${'★'.repeat(e.tier)}</div></div>` });
  },
  refresh(rebuild) {
    if (!this.map) return;
    // 5.2: под полноэкранной сценой духи и места не пересчитываются — один раз, когда она закроется (wake)
    if (Stage.busy) { this._miss = Math.max(this._miss || 0, rebuild ? 2 : 1); return; }
    if (rebuild || this._miss !== 2) this._miss = 0; // пропущенное догнали (сцена, закрываясь, сама позвала пересчёт)
    if (rebuild) { for (const m of this.markers.values()) { this.dropLbl(m); m.remove(); } this.markers.clear(); }
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
      if (m && m._key !== key) { this.dropLbl(m); m.remove(); m = null; }
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
      if (e.type !== 'spirit') {
        this.lblFor(m, e);
        m._lbl.classList.toggle('far', !!(el && el.classList.contains('far')));
        m._lbl.classList.toggle('tut-off', !!(el && el.classList.contains('tut-off')));
      }
    });
    for (const [id, m] of this.markers) if (!seen.has(id)) { this.markers.delete(id); this.dropLbl(m); this.fadeOut(m, m._ent && m._ent.type !== 'spirit'); }
    this.aimSoon(); // 5.1.28: место стало досягаемым — его модель снова движется; 5.1.30: и видна с нужной стороны
    this.placeLabels();
    this.seeSoon(); // 5.1.32: новые духи и места — за домами ли они
    this.syncZones(ents);
    this.nearby = ents.filter(e => e.type === 'spirit').sort((a, b) => a.d - b.d);
    const ids = new Set(this.nearby.map(e => e.id));
    if (this._spIds && this.nearby.some(e => !this._spIds.has(e.id)) && Date.now() - (this._vibT || 0) > 3000) { this._vibT = Date.now(); U.vibrate([60, 90, 60]); } // 4.19: появился дух — двойная вибрация
    this._spIds = ids;
    UI.updateNearby(this.nearby);
    if (this.tracking) this.updateTracker();
  },
  /* 5.1.31: модели мест — к игроку в ближайшем кадре браузера, а не в задаче, где только что менялись значки: отрисовка модели
     в холст значка заставляет браузер тут же досчитать стили страницы (в кадре этот расчёт и так нужен — без лишнего прохода) */
  aimSoon() {
    if (typeof M3D === 'undefined' || this._aimRaf) return;
    this._aimRaf = requestAnimationFrame(() => { this._aimRaf = 0; M3D.aim(); M3D.kick(); });
  },
  // высоты крыш пришли (Roofs): места в домах — на крыши, одним кадром на все
  roofSoon() {
    if (this._roofRaf) return;
    this._roofRaf = requestAnimationFrame(() => {
      this._roofRaf = 0;
      for (const m of this.markers.values()) {
        const e = m._ent;
        if (!e || e.type === 'spirit') continue;
        const h = Roofs.height(e.lat, e.lng) || 0;
        if (h !== (m._roofH || 0)) { m._roofH = h; this.upright(m); }
      }
      this.reAim();
    });
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
