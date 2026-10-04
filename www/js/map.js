'use strict';
/* Карта (MapLibre GL, 5.1.40; данные — Protomaps/OpenStreetMap), значок Ловчего (позиция — walk.js: джойстик и Атлас, 5.1), маркеры мира */

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

/* 5.1.40: карта — MapLibre GL. Земля, дороги, подписи улиц и объёмные дома рисуются одним проходом WebGL в одном холсте, наклон и поворот
   камеры — её собственные (раньше: Leaflet и Protomaps рисовали плитки в сотни холстов, а наклон давал CSS всему огромному слою карты —
   браузер на каждом кадре заново собирал этот слой, и телефон грелся). Значки мест, духов и Ловчего — маркеры MapLibre поверх карты:
   стоят прямо лицом к игроку и в размер расстояния до камеры (place); круги на земле (зона Ловчего, волны духов, земли кланов) лежат
   на земле (pitchAlignment: map). Масштабы MapLibre (плитка 512) — на единицу меньше прежних Leaflet (плитка 256) */
const MapView = {
  map: null, pos: null, follow: true, heading: 0, markers: new Map(), nearby: [], tiles: null, night: null,
  mks: new Set(), // все значки на карте (места, духи, Ловчий, круги) — им каждый кадр движения камеры — размер и порядок (place)
  // 5.1.31: размер окна — из запаса (vp): чтение innerWidth/innerHeight после записи стилей заставляет браузер тут же пересчитать
  // раскладку всей страницы — на каждом кадре жеста это фриз; обновляется по resize
  vw: typeof innerWidth !== 'undefined' ? innerWidth : 0, vh: typeof innerHeight !== 'undefined' ? innerHeight : 0,
  vp() { this.vw = innerWidth; this.vh = innerHeight; },

  init() {
    this.vp(); addEventListener('resize', () => { this.vp(); this.pad(); });
    if (!U.$('#mapBg')) { const b = document.createElement('div'); b.id = 'mapBg'; U.$('#map').before(b); } // 5.1.31: земля — позади карты (style.css)
    if (typeof M3D !== 'undefined') M3D.init(); // 5.1.28: 3D-модели мест (js/m3d.js) — до первых значков; нет WebGL — места остаются рисунками
    // 5.1: место Ловчего — Walk (телефон или прогресс); ещё нет (новичок до Атласа) — карта ждёт на Красной площади
    const start = Walk.load() || { lat: 55.7539, lng: 37.6208 };
    this.pos = { lat: start.lat, lng: start.lng };
    this.tilt = Cfg.s.tilt3d !== false ? this.tiltAt(this.Z0) : 0;
    this.pad();
    this.proto();
    maplibregl.setWorkerUrl(this.base() + 'vendor/maplibre/maplibre-gl-csp-worker.js');
    const lk = this.look(), F = this.pal(lk.night);
    this._look = lk.key; this.night = lk.night;
    try {
      this.map = new maplibregl.Map({ container: 'map', style: this.style(F), center: [this.pos.lng, this.pos.lat], zoom: this.Z0,
        minZoom: this.ZMIN, maxZoom: this.ZMAX, pitch: this.tilt, maxPitch: 85, bearing: 0, padding: { top: this._top || 0, bottom: 0, left: 0, right: 0 },
        pixelRatio: Gfx.dpr(), attributionControl: { compact: true }, renderWorldCopies: false, validateStyle: false, fadeDuration: 150,
        // жесты: одним пальцем — облёт камеры вокруг Ловчего (initOrbit), двумя — масштаб и поворот вокруг него; карта всегда за Ловчим
        dragPan: false, dragRotate: false, touchPitch: false, doubleClickZoom: false, boxZoom: false, keyboard: false,
        // 5.1.41: наклон и точка Ловчего на экране — за масштабом, на каждом шаге камеры (жест, плавное приближение, полёт) — не обрывая его
        transformCameraUpdate: tr => this.camUpdate(tr) });
    } catch (e) {
      // нет WebGL (очень старый телефон или он выключен) — карты нет, остальная игра работает
      console.warn('MapLibre:', e && e.message);
      this.map = null;
      this.theme(F);
      Walk.init();
      setTimeout(() => UI.toast(ru`Карта не загрузилась: телефон не поддерживает WebGL`), 3000);
      return;
    }
    this.map.touchZoomRotate.enable({ around: 'center' });
    this.map.scrollZoom.enable({ around: 'center' });
    U.$('#map').classList.add('vecmap');
    this.theme(F);
    // 4.19: опасные места и крыши (Hazard, Roofs) — из тех же плиток pmtiles, читает их Protomaps (он же рисует Атлас)
    if (typeof protomapsL !== 'undefined') this.tiles = { views: protomapsL.sourcesToViews({ url: this.tilesUrl() }) };
    setInterval(() => this.setTiles(), 60000);
    // 5.1.30: подписи мест — своим плоским слоем поверх карты (их не закрывают ни модели, ни дома): placeLabels
    this._lblBox = document.createElement('div'); this._lblBox.id = 'mapLbl'; U.$('#map').after(this._lblBox);

    // 4.8.1: зона досягаемости — круг Ловчего (свечение, кольцо рун, волна); размер — радиус взаимодействия на текущем масштабе
    this.range = this.mk(this.pos.lat, this.pos.lng, { cls: 'mk-range', w: 0, h: 0, ax: 0, ay: 0, flat: true, z: 2,
      html: '<div class="rz"><i class="rz-wave"></i></div>' }); // 5.1.41: под Ловчим — только расходящаяся волна (без рунного круга)
    this.fitRange();
    this.player = this.mk(this.pos.lat, this.pos.lng, { cls: 'mk-player-wrap', w: 64, h: 64, ax: 32, ay: 32, z: 1000,
      // 5.1.28: сам Ловчий — 3D-модель (js/m3d.js): шагает и бежит, смотрит туда, куда идёт, в цветах облика; нет WebGL — точка со стрелкой
      html: `<div class="mk-player">${typeof M3D !== 'undefined' ? M3D.html('catcher', 32, 32, '', 'me') : ''}<div class="pulse"></div><div class="arrow"></div><div class="dot"></div></div>` });
    if (typeof M3D !== 'undefined') { M3D.setMe({ heading: this.heading, gait: 0, look: S.d && S.d.look }); M3D.bind(this.player.getElement()); }
    this.map.on('move', () => this.reAim());
    this.map.on('zoomend', () => { this.fitRange(); this.fitZones(); });
    // 4.23.2: спутник на карте рядом с Ловчим не показывается
    Bus.on('weather', () => { this.setWeatherFx(); this.setTiles(); this.refresh(true); });

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
    this.map.resize(); // размер экрана мог смениться, пока карта не рисовалась
    this.setTiles();
    if (this._miss) this.refresh(this._miss === 2);
  },

  // 4.1: своя карта — векторные тайлы (Protomaps, данные OpenStreetMap) одним файлом; 4.28 — всего мира (в S3, отдаёт сервер игры)
  TILES: 'tiles/world-20260928.pmtiles', // 4.28: карта всего мира (Protomaps, в S3 — см. tools/server/duholov-world-tiles)
  COVER: [-180, -85.06, 180, 85.06], // 4.28: карта всего мира — рамка на весь мир (долгота, широта: юго-запад → северо-восток)
  covered(p) { const b = this.COVER; return !!p && p.lng >= b[0] && p.lng <= b[2] && p.lat >= b[1] && p.lat <= b[3]; },
  // 5.1.12: адрес карты мира — на duholov.ru рядом с игрой (APK открывает её же), с других адресов (тестовый контур, GitHub Pages,
  // локальный сервер разработки — файла карты мира у него нет) — с duholov.ru (CORS разрешён)
  tilesUrl() { return location.hostname === 'duholov.ru' ? this.TILES : 'https://duholov.ru/' + this.TILES; },
  base() { return location.href.split(/[?#]/)[0].replace(/[^/]*$/, ''); }, // папка игры (MapLibre берёт файлы по полным адресам)
  /* 5.1.40: плитки карты для MapLibre — протокол pmtiles://. Как у Protomaps (5.1.24): у каждого куска файла свой адрес (?r=начало-длина) —
     Chrome на Android ставит запросы Range к одному адресу в очередь HTTP-кэша, и плитки грузились бы по одной (сервер параметр не читает) */
  proto() {
    if (this._proto) return;
    class Src extends pmtiles.FetchSource {
      getBytes(o, l, sig, etag) { const u = this.url; this.url = `${u}${u.includes('?') ? '&' : '?'}r=${o}-${l}`; try { return super.getBytes(o, l, sig, etag); } finally { this.url = u; } }
    }
    const url = new URL(this.tilesUrl(), location.href).href;
    this._proto = new pmtiles.Protocol({ metadata: true });
    this._proto.add(new pmtiles.PMTiles(new Src(url)));
    this._pmUrl = 'pmtiles://' + url;
    maplibregl.addProtocol('pmtiles', this._proto.tile);
  },
  // 4.10: облик карты — время суток по настоящему солнцу над местом Ловчего (5.1.26: закрепить день или ночь нельзя);
  // 5.1.30: карта — по правилам стиля Protomaps в своей палитре (PALETTE), без своей отрисовки улиц, фонарей и цветов
  look() {
    const p = this.pos || { lat: 55.75, lng: 37.62 }, phase = U.phase(p.lat, p.lng), night = phase === 'night' || phase === 'dusk';
    return { phase, night, key: night ? 'night' : 'day' };
  },
  /* 5.1.30: палитра карты «Свежая» (выбор владельца из пяти, без Нави): днём — бело-зелёная с голубой водой и кремовыми улицами,
     ночью — тёмно-синяя. Цвета стиля — c (flavorOf; улицы — одного цвета, road); к ним — земля (фон карты под ещё не нарисованными
     плитками) и объёмные дома: крыша (их цвет; стены темнее — по свету light) */
  PALETTE: {
    day: { sky: '#8fc3ec', horizon: '#e4f0f8', earth: '#f1f3ee', roof: '#ecefe9', wall: '#b3b9b1', wall2: '#e0e5dd', light: 0.7, c: { bg: '#e7ebe5', earth: '#f1f3ee',
      park: '#cfe8c4', park2: '#b3dda3', wood: '#c7e1bb', wood2: '#a7d595', scrub: '#d8e8cc', water: '#9fd0f0', sand: '#f2ead2', ped: '#eceee8',
      urban: '#e8eae6', runway: '#f7f8fa', road: '#fdf2c6', rail: '#a8b1b7', bound: '#a7afa7', bld: '#e2e5df',
      lbl: '#5e6a65', halo: '#ffffff', city: '#2e3935', sub: '#7c8983', state: '#99a49e', ocean: '#4e8ec0',
      lc: ['#d6eccd', '#f5eeda', '#e8eae5', '#deeed2', '#ffffff', '#e2eed6', '#c4e2be'] } },
    night: { sky: '#070d1a', horizon: '#1f2b42', earth: '#131b27', roof: '#253145', wall: '#111926', wall2: '#334159', light: 0.55, c: { bg: '#0e1520', earth: '#131b27',
      park: '#13261f', park2: '#163024', wood: '#12221c', wood2: '#152a21', scrub: '#17231f', water: '#0a1626', sand: '#1c2228', ped: '#171f2b',
      urban: '#161e2a', runway: '#222c3a', road: '#3a4f73', rail: '#37435a', bound: '#46526a', bld: '#1a2332',
      lbl: '#9fb0cc', halo: '#0e1520', city: '#dbe5f5', sub: '#8a9ab4', state: '#6f7f99', ocean: '#6b8fc4',
      lc: ['#162620', '#1e2228', '#181f2b', '#162621', '#28303c', '#182420', '#13221c'] } },
  },
  pal(night) { return night ? this.PALETTE.night : this.PALETTE.day; },
  // цвета палитры → полный набор цветов стиля Protomaps (те же ключи у его light/dark; улицы, мосты и тоннели — цвета road)
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
  // правила рисования и подписей Protomaps для Leaflet (их рисует Атлас — atlas.js); подписей точек (pois) нет — у мест игры свои подписи
  flavorRules(P) {
    const f = this.flavorOf(P.c), noPois = rules => rules.filter(r => r.dataLayer !== 'pois');
    return { paint: protomapsL.paintRules(f), label: noPois(protomapsL.labelRules(f, I18N.lang)), bg: f.background };
  },
  /* 5.1.40: стиль MapLibre — слои Protomaps (basemaps) в цветах палитры P, без значков точек (pois); дома: плоские у плоской карты,
     объёмные (fill-extrusion, высота из данных карты, без высоты — 8 м) у наклонённой — после всей земли и дорог, под подписями.
     Шрифты подписей — свои (vendor/glyphs, Noto Sans); китайские, японские и корейские знаки браузер рисует сам */
  LANG: { zh: 'zh-Hans' },
  style(P) {
    const f = Object.assign(this.flavorOf(P.c), { regular: 'Noto Sans Regular', bold: 'Noto Sans Medium', italic: 'Noto Sans Italic' });
    const all = basemaps.layers('pm', f, { lang: this.LANG[I18N.lang] || I18N.lang })
      .filter(l => l['source-layer'] !== 'pois' && !(l.layout && l.layout['icon-image']));
    const t = !!this.tilt, ground = all.filter(l => l.type !== 'symbol'), lbl = all.filter(l => l.type === 'symbol');
    for (const l of ground) if (l.id === 'buildings') l.layout = Object.assign({}, l.layout, { visibility: t ? 'none' : 'visible' });
    const bld = { id: 'bld3d', type: 'fill-extrusion', source: 'pm', 'source-layer': 'buildings', minzoom: 14, filter: ['in', 'kind', 'building', 'building_part'],
      layout: { visibility: t ? 'visible' : 'none' },
      paint: { 'fill-extrusion-color': P.roof, 'fill-extrusion-height': ['case', ['>', ['coalesce', ['get', 'height'], 0], 0], ['get', 'height'], 8],
        'fill-extrusion-base': ['coalesce', ['get', 'min_height'], 0], 'fill-extrusion-vertical-gradient': true } };
    return { version: 8, glyphs: this.base() + 'vendor/glyphs/{fontstack}/{range}.pbf',
      sources: { pm: { type: 'vector', url: this._pmUrl, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://protomaps.com">Protomaps</a>' } },
      light: { anchor: 'viewport', color: '#ffffff', intensity: P.light, position: [1.15, 210, 30] },
      // 5.1.41: у наклона 75° горизонт — на экране: над ним небо, у горизонта даль тает в дымке цвета земли
      sky: { 'sky-color': P.sky, 'horizon-color': P.horizon, 'fog-color': P.earth, 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.5, 'fog-ground-blend': 0.6, 'atmosphere-blend': 0 },
      layers: [...ground, bld, ...lbl] };
  },
  // дома объёмные — у наклонённой карты, плоские — у плоской
  bldMode() {
    const m = this.map, t = !!this.tilt;
    if (!m || !m.getLayer('bld3d')) return;
    m.setLayoutProperty('bld3d', 'visibility', t ? 'visible' : 'none');
    m.setLayoutProperty('buildings', 'visibility', t ? 'none' : 'visible');
  },
  // 5.1.38: сменилось разрешение графики (Gfx): холст карты и 3D-модели — в новом размере
  applyRes() {
    if (this.map) this.map.setPixelRatio(Gfx.dpr());
    if (typeof M3D !== 'undefined' && M3D.relayout) M3D.relayout();
  },
  setTiles() {
    if (Stage.busy) return; // 5.2: под сценой карта не перерисовывается — облик сверится, когда она закроется (wake)
    const lk = this.look();
    if (lk.key === this._look) return;
    this._look = lk.key;
    this.night = lk.night;
    const F = this.pal(lk.night);
    if (this.map) this.map.setStyle(this.style(F), { diff: true }); // день сменился ночью (или наоборот) — другие цвета
    this.theme(F);
  },
  theme(F) {
    document.body.classList.toggle('night', this.night);
    const bg = U.$('#mapBg'); if (bg) bg.style.background = F.earth; // и земля под ещё не нарисованными плитками (5.1.31: слоем позади карты)
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
    if (quick || !this.map) return; // 5.1: пошёл джойстиком — карта догонит значок со следующего шага
    const p = this.shown || this.pos; // 4.24.1: туда, где значок сейчас на экране
    this.map.easeTo({ center: [p.lng, p.lat], zoom: Math.max(this.map.getZoom(), this.Z0 - 0.5), duration: 500 });
  },

  /* ---------------- 5.1.40: ЗНАЧКИ НА КАРТЕ ---------------- */
  /* значок — маркер MapLibre: box (его ставит MapLibre в точку карты) → sc (размер фигуры и подъём на крышу, place) → ic (сам значок:
     размер w × h, точка привязки ax, ay — как у прежних значков Leaflet). flat — лежит на земле (круги), иначе стоит лицом к игроку;
     z — добавка к порядку (ближние к камере — поверх дальних); click — нажатие */
  mk(lat, lng, o) {
    const box = document.createElement('div'), sc = document.createElement('div'), ic = document.createElement('div');
    box.className = 'mk-box'; sc.className = 'mk-sc'; ic.className = o.cls; ic.innerHTML = o.html;
    Object.assign(ic.style, { position: 'absolute', left: -o.ax + 'px', top: -o.ay + 'px', width: o.w + 'px', height: o.h + 'px' });
    sc.appendChild(ic); box.appendChild(sc);
    if (!o.click) box.style.pointerEvents = 'none';
    const self = this, flat = !!o.flat;
    const m = { box, sc, ic, o, lat, lng, flat, z: o.z || 0, S: 1, f: 1, g: 1, lift: 0, roof: 0, p: null, off: false,
      mk: new maplibregl.Marker({ element: box, anchor: 'top-left', pitchAlignment: flat ? 'map' : 'viewport', rotationAlignment: flat ? 'map' : 'viewport', subpixelPositioning: true }),
      getElement() { return ic; },
      getLatLng() { return { lat: m.lat, lng: m.lng }; },
      setLatLng(a, b) { m.lat = a; m.lng = b; m.mk.setLngLat([b, a]); },
      remove() { m.mk.remove(); self.mks.delete(m); },
    };
    box._mk = m;
    if (o.click) ic.addEventListener('click', e => { e.stopPropagation(); o.click(); });
    m.mk.setLngLat([lng, lat]).addTo(this.map);
    this.mks.add(m);
    this.place(m);
    return m;
  },
  // камера сейчас: наклон t (радианы), масштаб z, точка Ловчего на экране (cx, cy) и расстояние от камеры до неё dc (CSS-пиксели)
  ctx() {
    const m = this.map, t = m.getPitch() * Math.PI / 180, tr = m.transform;
    let fov = tr && tr.fov;
    if (!(fov > 0)) fov = 36.87; else if (fov < 3) fov *= 180 / Math.PI;
    return { t, tan: Math.tan(t), sin: Math.sin(t), cos: Math.cos(t), z: m.getZoom(), cx: this.vw / 2, cy: this._py || this.vh / 2, dc: 0.5 * this.vh / Math.tan(fov * Math.PI / 360) };
  },
  // метров в CSS-пикселе на широте lat, масштаб z (плитка MapLibre — 512)
  mpp(z, lat) { return 40075016.686 * Math.cos(lat * Math.PI / 180) / (512 * 2 ** z); },
  /* значок — в размер расстояния до камеры: у наклонённой карты точка земли на высоте y экрана видна в f раз крупнее, чем точка
     Ловчего (f = 1 + tg(наклона)·(y − cy)/dc); фигуре — ещё figScale (приблизили камеру — крупнее). Место в доме — на его крыше:
     поднято на высоту дома (на экране — высота × sin наклона × f). Ближние к камере — поверх дальних */
  place(m, c) {
    c = c || this.ctx();
    const p = m.p = this.map.project([m.lng, m.lat]);
    const f = c.t ? Math.max(0.05, 1 + c.tan * (p.y - c.cy) / c.dc) : 1;
    let S, lift = 0;
    if (m.flat) S = f * (m.zf != null ? 2 ** (c.z - m.zf) : 1); // круг на земле: его размер в точках — на масштабе zf (fitZone)
    else {
      const g = this.figScale(f, c.z) * (m === this.player ? this.meScale(c.z) : 1);
      S = f * g; m.g = m.box._g = g; m.box._f = f;
      if (m.roof && c.t) lift = m.roof / this.mpp(c.z, m.lat) * c.sin * f;
    }
    m.f = f; m.S = S; m.lift = lift;
    // 5.1.31: значок далеко за краем экрана (с запасом на высоту модели) — уже стоит, где стоял: переставим, когда подойдёт к экрану
    m.off = p.x < -320 || p.x > this.vw + 320 || p.y < -420 || p.y > this.vh + 320;
    if (m.off && m._tf) return;
    const tf = `translate3d(0, ${(-lift).toFixed(1)}px, 0) scale(${S.toFixed(4)})`;
    if (m._tf !== tf) { m.sc.style.transform = tf; m._tf = tf; }
    const zi = m.flat ? 1 + m.z : Math.round(3000 + p.y + m.z);
    if (m._zi !== zi) { m.box.style.zIndex = zi; m._zi = zi; }
  },
  // карта сдвинулась (игрок идёт, масштаб, наклон, поворот) — значки в новый размер, 3D-модели мест поворачиваются к игроку
  // той стороной, с которой он теперь на них смотрит, подписи — под свои места
  reAim() {
    if (!this.map) return;
    const c = this.ctx();
    for (const m of this.mks) this.place(m, c);
    if (typeof M3D !== 'undefined') M3D.aim();
    this.placeLabels();
  },
  /* 5.1.30: откуда игрок смотрит на значок (для 3D-модели места, js/m3d.js): высота взгляда над землёй e (градусы: у нижнего
     края экрана — почти сверху, у дальнего — сбоку) и поворот az (радианы: место правее середины видно чуть слева);
     у плоской карты — null (модель — под своим наклоном, как значки) */
  camOf(el) {
    const bx = this.tilt && el ? el.closest('.maplibregl-marker') : null, m = bx && bx._mk;
    if (!m || !m.p) return null;
    const c = this.ctx();
    if (!c.t) return null;
    const dx = m.p.x - c.cx, dy = m.p.y - m.lift - c.cy, ph = Math.min(c.t - Math.atan(dy / c.dc), 1.5), h = c.dc * c.cos;
    const hor = h * Math.tan(ph), u = dx / Math.max(0.05, 1 + c.tan * dy / c.dc);
    return { e: Math.atan2(h, Math.hypot(u, hor)) * 180 / Math.PI, az: Math.atan2(u, hor) };
  },

  // радиус круга Ловчего — радиус взаимодействия (W.INTERACT) на текущем масштабе
  fitRange() { if (this.range) this.fitZone(this.range, W.INTERACT); },
  pxR(lat, meters, z) { return meters / this.mpp(z, lat); },

  moveTo(lat, lng, jump) {
    this.pos = { lat, lng };
    this.drawAt(lat, lng, jump); // 5.2: точка приходит каждый кадр (Walk) — рисуем сразу, без плавной «езды» от точки к точке
    const el = this.player.getElement();
    if (el) el.querySelector('.arrow').style.transform = `rotate(${this.heading + this.rot}deg)`; // с учётом поворота карты
    if (typeof M3D !== 'undefined') M3D.setMe({ heading: this.heading }); // 5.1.28: 3D-Ловчий смотрит туда, куда идёт
    if (this.tracking) this.updateTracker();
  },
  // Значок Ловчего, круг и карта — в точке (lat, lng) на экране. Камера стоит над Ловчим; пока карту двигает жест двумя пальцами или
  // плавный перелёт — она не перебивается (догонит Ловчего следующим шагом)
  drawAt(lat, lng, jump) {
    const m = this.map;
    this.shown = { lat, lng };
    this.player.setLatLng(lat, lng);
    this.range.setLatLng(lat, lng);
    if (!this.follow) return;
    if (jump) { m.stop(); m.jumpTo({ center: [lng, lat], zoom: this.Z0 }); }
    else if (!m.isMoving()) m.jumpTo({ center: [lng, lat] });
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
  // Карту крутят двумя пальцами (MapLibre, вокруг Ловчего) и одним (initOrbit); компас слева внизу показывает север, касание — вернуть
  // север вверх. rot — поворот карты по часовой стрелке (у MapLibre bearing — наоборот)
  rot: 0,
  initRotate() {
    const m = this.map;
    m.on('rotate', () => { if (!this._ownRot) this.syncRot(-m.getBearing()); });
    m.on('rotateend', () => { if (!this._ownRot && this.rot && Math.abs(this.rot) < 6) this.northUp(); });
    // компас
    const c = U.$('#compassBtn');
    if (c) { c.innerHTML = this.compassSvg(); c.onclick = () => { Sfx.play('tap'); this.northUp(); }; }
    this.setTilt(this.tilt > 0);
  },
  /* 4.11: наклон камеры, как в Pokémon GO: карта ложится вдаль (перспектива). 5.1.41 (выбор владельца): наклон — за масштабом:
     исходный масштаб он же самый близкий (Z0, ближе нельзя) — TILT (75°, горизонт с небом на экране), отдалили до предела (ZMIN) —
     TILT_MIN (40°), между ними — плавно. Пальцем камеру только поворачивают и отдаляют-приближают */
  TILT: 75, TILT_MIN: 40, tilt: 0, _py: 0,
  tiltAt(z) { return this.TILT_MIN + (this.TILT - this.TILT_MIN) * Math.max(0, Math.min(1, (z - this.ZMIN) / (this.Z0 - this.ZMIN))); },
  /* точка Ловчего на экране — по центру по ширине, по высоте — за масштабом: отдалили до предела — посередине экрана, приблизили —
     ниже, у исходного (самого близкого) — чуть выше джойстика (он внизу, верх — в 212 px от низа), но не ниже. Это отступ сверху у камеры
     MapLibre (центр карты — середина того, что ниже отступа) */
  JOY_UP: 250,
  pyAt(z, H) {
    const k = Math.max(0, Math.min(1, (z - this.ZMIN) / (this.Z0 - this.ZMIN)));
    return H / 2 + (Math.max(H / 2, H - this.JOY_UP) - H / 2) * k;
  },
  // шаг камеры (transformCameraUpdate): наклон и отступ — из её масштаба; карта за Ловчим — центр ровно на нём (масштаб пальцами
  // идёт вокруг середины экрана, а отступ её сдвигает — без этого центр съезжал с Ловчего и возвращался только с его шагом)
  camUpdate(tr) {
    const H = this.vh || innerHeight, z = tr.zoom, py = this.pyAt(z, H), top = Math.round(2 * py - H), out = {};
    this._top = top; this._py = top + (H - top) / 2;
    tr.setPadding({ top, bottom: 0, left: 0, right: 0 });
    const p = this.follow && this.shown;
    if (p && typeof maplibregl !== 'undefined') out.center = new maplibregl.LngLat(p.lng, p.lat);
    if (this.tilt) out.pitch = this.tilt = this.tiltAt(z);
    return out;
  },
  pad() {
    const H = this.vh || innerHeight, top = Math.round(2 * this.pyAt(this.map ? this.map.getZoom() : this.Z0, H) - H);
    this._top = top; this._py = top + (H - top) / 2;
    if (this.map) this.map.setPadding({ top, bottom: 0, left: 0, right: 0 });
  },
  setTilt(on) {
    this.tilt = on ? this.tiltAt(this.map ? this.map.getZoom() : this.Z0) : 0;
    this.pad();
    if (!this.map) return;
    this.map.setPitch(this.tilt);
    document.body.classList.toggle('tilt', !!this.tilt);
    this.bldMode();
    this.reAim(); // 5.1.30: наклон включили или выключили — 3D-модели мест под новым углом
  },
  /* 5.1.30: камера одним пальцем (и мышью), как в Pokémon GO: влево-вправо — облёт вокруг Ловчего (земля под пальцем идёт за ним:
     над Ловчим и под ним — в разные стороны). 5.1.34: только облёт — наклон постоянный (TILT), вверх-вниз палец камеру не наклоняет.
     Карта всегда за Ловчим: ходят джойстиком и Атласом, сдвигать её пальцем не нужно. Два пальца — масштаб и поворот;
     лёгкое касание — нажатие на значок. */
  ORBIT: { yaw: 0.35 }, // градусов на CSS-пиксель пальца
  initOrbit() {
    const box = U.$('#map');
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
        // 5.1.31: мышь ведёт камеру — курсор «держится» за карту (не ищет на каждом движении, над каким значком он теперь)
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
  setRot(r) {
    r = ((r % 360) + 540) % 360 - 180;
    if (Math.abs(r) < 0.05) r = 0;
    this._ownRot = true;
    try { this.map.setBearing(-r); } finally { this._ownRot = false; }
    this.syncRot(r);
  },
  // карта повернулась (пальцем или setRot): 3D-модели мест, стрелка Ловчего, компас и Следопыт — вместе с ней
  syncRot(r) {
    r = ((r % 360) + 540) % 360 - 180;
    this.rot = r;
    if (typeof M3D !== 'undefined') M3D.setRot(r); // 5.1.28: 3D-модели мест поворачиваются вместе с картой
    const el = this.player && this.player.getElement();
    if (el) el.querySelector('.arrow').style.transform = `rotate(${this.heading + r}deg)`;
    const c = U.$('#compassBtn');
    if (c) { c.firstElementChild.style.transform = `rotate(${r}deg)`; c.classList.toggle('turned', !!r); }
    if (this.tracking) this.updateTracker();
  },
  /* 5.1.32: камера — как в Pokémon GO. Отдалить её можно до ZMIN, исходный масштаб — Z0 (5.1.40: у MapLibre — на единицу меньше
     прежних). Фигуры (места, духи, Ловчий) — в размер расстояния до камеры: приблизили камеру — крупнее, отдалили — мельче (ZK: размер
     ×2^(ZK·Δz)); у нижнего края экрана (ближе к камере) — крупнее, к горизонту — мельче (перспектива f, place). Размер на экране —
     не меньше FIG_MIN и не больше FIG_MAX от исходного */
  ZMIN: 15.75, Z0: 16.5, ZMAX: 16.5, ZK: 0.7, FIG: 0, FIG_MIN: 0.45, FIG_MAX: 1.8,
  // 5.1.41 (выбор владельца): сам Ловчий — у исходного масштаба (наклон 75°) вдвое крупнее, отдалили до предела (40°) — прежний
  // размер, между ними — плавно. Места и духи — как были
  ME_BIG: 2,
  meScale(z) { return 1 + (this.ME_BIG - 1) * Math.max(0, Math.min(1, (z - this.ZMIN) / (this.Z0 - this.ZMIN))); },
  // во сколько раз фигура на точке земли с перспективой f крупнее, чем её рисует сама перспектива карты
  figScale(f, z) {
    if (z == null) z = this.map.getZoom();
    const s = Math.pow(f, this.FIG) * Math.pow(2, (z - this.Z0) * this.ZK);
    return Math.max(this.FIG_MIN / f, Math.min(this.FIG_MAX / f, s));
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
  // модели встаёт в точку привязки значка (ax, ay). Пока модель не нарисована (или WebGL нет) — прежний рисунок
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
  // подписи — под моделью своего места (точка опоры значка, с крышей), в размер значка (дальше — мельче); ближние — поверх дальних.
  // Зовётся на каждом сдвиге карты (reAim) и когда модель встала (lblSoon)
  placeLabels() {
    if (!this.map || !this._lblBox) return;
    const W = this.vw, H = this.vh;
    const hide = lb => { if (!lb._hid) { lb.style.display = 'none'; lb._hid = true; } };
    for (const m of this.markers.values()) {
      const lb = m._lbl;
      if (!lb) continue;
      if (!m.p) { hide(lb); continue; }
      const box = m.ic.firstElementChild, ay = m.o.ay, f = m.f;
      const bot = box && (box._m3dBot != null ? box._m3dBot : parseFloat(box.style.getPropertyValue('--m3d-bot'))); // низ модели в значке (js/m3d.js), иначе — низ рисунка
      const off = Number.isFinite(bot) ? (bot - ay) * m.S + 13 * f : (m.o.h - ay) * m.S + 4 * f;
      const x = m.p.x, y = m.p.y - m.lift + off;
      if (x < -200 || x > W + 200 || y < -60 || y > H + 60) { hide(lb); continue; }
      if (lb._hid !== false) { lb.style.display = ''; lb._hid = false; }
      // 5.1.34: у нижнего края экрана подпись не крупнее LBL_MAX — иначе она шириной в экран
      const tf = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translateX(-50%) scale(${Math.min(f, this.LBL_MAX).toFixed(3)})`, zi = Math.round(1000 + y);
      if (lb._tf !== tf) { lb.style.transform = tf; lb._tf = tf; }
      if (lb._zi !== zi) { lb.style.zIndex = zi; lb._zi = zi; }
    }
  },
  LBL_MAX: 1.2,
  lblSoon() { if (!this._lblRaf) this._lblRaf = requestAnimationFrame(() => { this._lblRaf = 0; this.placeLabels(); }); },
  // 5.1.32: фигуры за домами — прозрачнее (было у своих объёмных домов); у MapLibre дома и значки — в разных слоях: не нужно
  seeThrough() {},
  seeSoon() {},
  // значок места или духа: размер w × h, точка привязки (ax, ay) — точка земли
  ico(w, h, ax, ay, html) { return { cls: 'mk', w, h, ax, ay, html }; },
  icon(e) {
    if (e.type === 'spirit') {
      const s = SP[e.sid], known = this.known(e.sid);
      return this.ico(68, 68, 34, 62,
        `<div class="mk-spirit r${s.rar}${known ? '' : ' unk'}${e.tut ? ' sp-tut' : ''}" style="--c:${known ? ELEMENTS[s.el].color : '#cbd5e1'}">${e.tut ? '<div class="tut-ring"></div>' : ''}<div class="mk-glow"></div>${known ? Art.img(e.sid) : '<span class="mk-q">?</span>'}${e.boost ? `<div class="mk-boost">${Art.wxIcon(Sky.w.key, 16)}</div>` : ''}</div>`);
    }
    if (e.type === 'spring') {
      return this.ico(46, 64, 23, 60,
        `<div class="mk-spring ${e.invaded ? 'invaded' : e.ready ? '' : 'used'}">${this.m3d(e, 23, 60, !e.ready && !e.invaded ? 'jet' : '')}${Art.asImg(Art.springIcon(!e.ready, e.invaded), `spring:${!e.ready}:${!!e.invaded}`, 'mk-spring')}</div>`);
    }
    if (e.type === 'shrine') {
      return this.ico(54, 76, 27, 72,
        `<div class="mk-shrine ${e.won ? 'won' : ''} ${e.clan ? 'held' : ''} ${S.d.level < DUEL_LEVEL ? 'locked' : ''}"${e.clan ? ` style="--cc:${CLANS[e.clan].color}"` : ''}>${e.clan ? '<div class="mk-flag"></div>' : ''}${this.m3d(e, 27, 72)}${Art.asImg(Art.shrineIcon(e.tier, e.won, e.myth), `shrine:${e.myth || 'slavic'}:${e.tier}:${!!e.won}`)}<div class="mk-tier">${'★'.repeat(e.tier)}</div></div>`);
    }
    return this.ico(84, 96, 42, 86,
      `<div class="mk-rift t${e.tier} ${e.done ? 'done' : ''} ${S.d.level < RAID_LEVEL && !e.camp ? 'locked' : ''} ${e.camp ? 'camp' : ''}">${this.m3d(e, 42, 86)}${Art.asImg(Art.riftIcon(e.tier, e.myth), `rift:${e.myth || 'slavic'}:${e.tier}`)}<div class="mk-boss">${Art.img(e.boss)}</div><div class="mk-tier">${'★'.repeat(e.tier)}</div></div>`);
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
        const mm = m = this.mk(e.lat, e.lng, Object.assign(this.icon(e), { z: e.type === 'spirit' ? 500 : 0, click: () => this.tap(mm._ent) }));
        if (typeof M3D !== 'undefined') M3D.bind(m.getElement());
        m._key = key;
        this.markers.set(e.id, m);
        if (fresh && !rebuild && e.type !== 'spirit') this.fadeIn(m);
      }
      m._ent = e;
      if (e.type !== 'spirit') { // 5.1.30: место внутри дома — на его крыше (place)
        const h = Roofs.height(e.lat, e.lng) || 0;
        if (h !== m.roof) { m.roof = h; this.place(m); }
      }
      const el = m.getElement();
      el.classList.toggle('far', e.d > (e.type === 'rift' || e.type === 'shrine' ? 100 : W.INTERACT));
      el.classList.toggle('tut-off', typeof Tut !== 'undefined' && !Tut.entOk(e)); // 5.2: фокус обучения — чужое приглушено
      if (e.type !== 'spirit') {
        this.lblFor(m, e);
        m._lbl.classList.toggle('far', el.classList.contains('far'));
        m._lbl.classList.toggle('tut-off', el.classList.contains('tut-off'));
      }
    });
    for (const [id, m] of this.markers) if (!seen.has(id)) { this.markers.delete(id); this.dropLbl(m); this.fadeOut(m, m._ent && m._ent.type !== 'spirit'); }
    this.aimSoon(); // 5.1.28: место стало досягаемым — его модель снова движется; 5.1.30: и видна с нужной стороны
    this.placeLabels();
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
        m.roof = Roofs.height(e.lat, e.lng) || 0;
      }
      this.reAim();
    });
  },
  // 5.2: место появляется и исчезает плавно (style.css: .pl-in, .pl-out); fade — false: сразу
  PLACE_HOLD: 20, FADE_MS: 450,
  fadeIn(m) {
    const el = m.getElement();
    el.classList.add('pl-in');
    setTimeout(() => el.classList.remove('pl-in'), this.FADE_MS + 100);
  },
  fadeOut(m, fade) {
    if (!fade) { m.remove(); return; }
    const el = m.getElement();
    m.box.style.pointerEvents = 'none';
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
  /* ---------------- 4.10: ЗЕМЛИ ДРУЖИН ---------------- */
  // земли кланов (сияние цвета клана вокруг Святилища); 4.24.1: под каждым духом — еле заметная волна, как от Ловчего, только
  // в разы меньше (SPIRIT_R м); у каждого духа — свой такт
  SPIRIT_R: 25,
  zones: new Map(),
  syncZones(ents) {
    const want = new Map();
    ents.forEach(e => {
      if (e.type === 'shrine' && e.clan && CLANS[e.clan]) want.set('z:' + e.id, { e, r: 100, cls: 'clan', css: `--cc:${CLANS[e.clan].color}`, inner: '<i class="zn-glow"></i><i class="zn-ring"></i><i class="zn-ring2"></i>' });
      // 5.2: у Разлома больше нет «провала» под ним (лиловая дымка с трещинами) — только сам значок
      if (e.type === 'spirit') want.set('s:' + e.id, { e, r: this.SPIRIT_R, cls: 'rz sp', css: `--wd:-${(U.h('wave', e.id) * 4.5).toFixed(2)}s`, inner: '<i class="sp-bg"></i><i class="rz-wave"></i>' });
    });
    for (const [id, z] of this.zones) if (!want.has(id) || want.get(id).css !== z.css) { this.fadeOut(z.m, z.cls === 'clan' && !want.has(id)); this.zones.delete(id); }
    for (const [id, w] of want) {
      if (this.zones.has(id)) continue;
      const m = this.mk(w.e.lat, w.e.lng, { cls: 'mk-zone', w: 0, h: 0, ax: 0, ay: 0, flat: true, z: w.cls === 'clan' ? 0 : 1, html: `<div class="zn ${w.cls}" style="${w.css}">${w.inner}</div>` });
      this.zones.set(id, { m, r: w.r, css: w.css, cls: w.cls });
      this.fitZone(m, w.r);
      if (w.cls === 'clan') this.fadeIn(m); // 5.2: земли клана — вместе со своим Святилищем
    }
  },
  // круг радиусом r м: размер в точках — на нынешнем масштабе (zf); пока масштаб меняется, круг растягивается (place), после — заново
  fitZone(m, r) {
    const box = m.getElement().firstElementChild;
    if (!box) return;
    const z = this.map.getZoom(), px = this.pxR(m.lat, r, z);
    box.style.width = box.style.height = px * 2 + 'px';
    box.style.margin = -px + 'px 0 0 ' + -px + 'px';
    m.zf = z;
    this.place(m);
  },
  fitZones() { for (const { m, r } of this.zones.values()) this.fitZone(m, r); },

  /* ---------------- СЛЕДОПЫТ ---------------- */
  // Стрелка в HUD указывает направление на цель
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
    if (!this.map) return;
    if (this._pin) this._pin.remove();
    this._pin = this.mk(lat, lng, { cls: 'mk', w: 40, h: 52, ax: 20, ay: 50, z: 900,
      html: `<div class="mk-pin"><svg viewBox="0 0 24 30"><path d="M12 29s-10-10-10-17a10 10 0 0 1 20 0c0 7-10 17-10 17z" fill="#fbbf24" stroke="#92400e" stroke-width="1.5"/><circle cx="12" cy="12" r="4" fill="#92400e"/></svg><span>${U.esc(label)}</span></div>` });
    this.flyTo({ lat, lng });
    clearTimeout(this._pinT);
    this._pinT = setTimeout(() => { if (this._pin) { this._pin.remove(); this._pin = null; } }, 30000);
  },

  flyTo(e) {
    if (!this.map) return;
    this.follow = false;
    U.$('#recenterBtn').classList.add('show');
    this.map.flyTo({ center: [e.lng, e.lat], zoom: this.Z0 + 1, duration: 800 });
  },
};
