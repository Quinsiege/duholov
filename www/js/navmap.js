'use strict';
/* 4.9: «Карта Нави» — своя отрисовка настоящей карты (Protomaps, данные OpenStreetMap): те же улицы, дома, парки,
   реки и названия, но в стиле игры. Цвета рисуются сразу в плитке — CSS-фильтр поверх карты не нужен.
   4.10: живое время суток — рассвет, день, закат и ночь по настоящему солнцу над игроком; времена года —
   весной цветение, осенью золото и багрянец, зимой снег и лёд (заснеженные крыши — зимой и в снегопад);
   ночью и на закате — тёплые окна в высоких домах и фонари вдоль улиц. */

const NavMap = {
  // палитры по времени суток
  P: {
    night: {
      bg: '#120b25', earth: '#120b25', urban: '#160e2c', plaza: '#1c1438', park: '#0f2c24', parkEdge: '#1d5a44', wood: '#0b261e', grass: '#11302a',
      sand: '#2f2519', water: '#0b3142', waterEdge: '#2dd4bf', river: '#1b8a8e', bld: '#221840', bldHi: '#2d2156', bldEdge: 'rgba(243,207,107,.26)',
      casing: '#06030d', major: '#e0b45a', majorHi: 'rgba(255, 246, 214, .55)', majorGlow: 'rgba(251,191,36,.14)', minor: '#3f3374', minorCase: '#0a0618', path: '#6d5ca6', rail: '#7a5d34',
      label: '#ece6ff', labelHalo: '#0b0620', labelMajor: '#fde6a8', place: '#f3cf6b', waterLabel: '#7fe8dc', poi: '#f3cf6b',
      tree: 'rgba(110, 231, 183, .2)', lattice: 'rgba(243, 207, 107, .045)', lamps: 1, windows: 'rgba(255, 196, 102, .55)',
    },
    dusk: {
      bg: '#24163a', earth: '#24163a', urban: '#2a1942', plaza: '#33204d', park: '#1c3530', parkEdge: '#3f6b52', wood: '#162d27', grass: '#213a33',
      sand: '#4a3526', water: '#1b3553', waterEdge: '#f5a38b', river: '#3b6a8a', bld: '#3a2554', bldHi: '#4a2f68', bldEdge: 'rgba(251, 191, 120, .4)',
      casing: '#12081f', major: '#f2a65a', majorHi: 'rgba(255, 236, 200, .6)', majorGlow: 'rgba(249, 115, 22, .16)', minor: '#5b4284', minorCase: '#170c26', path: '#8f76b8', rail: '#8a6035',
      label: '#ffe9d6', labelHalo: '#1a0e28', labelMajor: '#ffd9a8', place: '#fbbf7a', waterLabel: '#f8c4b0', poi: '#fbbf7a',
      tree: 'rgba(163, 230, 185, .18)', lattice: 'rgba(251, 191, 120, .05)', lamps: .7, windows: 'rgba(255, 196, 102, .4)',
    },
    dawn: {
      bg: '#f1dfe4', earth: '#f1dfe4', urban: '#ead3db', plaza: '#e6ccd6', park: '#d7e6d4', parkEdge: '#a8c9a8', wood: '#c7dcc3', grass: '#dcebd6',
      sand: '#f2dcc6', water: '#bcd8ea', waterEdge: '#e89ab0', river: '#9cc4dc', bld: '#dcc2d3', bldHi: '#d0b1c6', bldEdge: '#b98fae',
      casing: '#e0a46e', major: '#fff5ea', majorHi: 'rgba(240, 170, 110, .55)', majorGlow: 'rgba(236, 150, 100, .22)', minor: '#fdf6f7', minorCase: '#dcbfcd', path: '#b08aa6', rail: '#b98a66',
      label: '#5a2e4a', labelHalo: '#fbf1f4', labelMajor: '#6a3410', place: '#9a4e1c', waterLabel: '#3f6f8f', poi: '#b0602a',
      tree: 'rgba(40, 110, 70, .15)', lattice: 'rgba(120, 50, 90, .05)', lamps: 0, windows: '',
    },
    day: {
      bg: '#ebe4f4', earth: '#ece5f5', urban: '#e4dcf0', plaza: '#e0d6ef', park: '#cfe7d6', parkEdge: '#8fc7a4', wood: '#bfdcc8', grass: '#d6ecdb',
      sand: '#efe2c7', water: '#a9dcdc', waterEdge: '#3fb5b0', river: '#6cc3c0', bld: '#d4c8ea', bldHi: '#c5b5e3', bldEdge: '#a592d4',
      casing: '#c9a24c', major: '#fffaf0', majorHi: 'rgba(233, 196, 106, .55)', majorGlow: 'rgba(217,178,92,.25)', minor: '#fbf8ff', minorCase: '#c8bade', path: '#9a86cc', rail: '#b08d57',
      label: '#3b2a6b', labelHalo: '#f7f3ff', labelMajor: '#5a3a0a', place: '#7a4c0e', waterLabel: '#1f7c78', poi: '#a86a18',
      tree: 'rgba(22, 101, 52, .16)', lattice: 'rgba(59, 42, 107, .045)', lamps: 0, windows: '',
    },
  },
  // времена года: парки, деревья и вода; снег — крыши и земля светлее
  SEASON: {
    spring: { light: { park: '#d9edd6', tree2: 'rgba(236, 72, 153, .38)' }, dark: { park: '#15352a', tree2: 'rgba(244, 143, 177, .42)' } },
    summer: { light: {}, dark: {} },
    autumn: {
      light: { park: '#efdcb4', parkEdge: '#d4a35a', wood: '#e6c99a', grass: '#ece0bf', tree: 'rgba(194, 65, 12, .3)', tree2: 'rgba(202, 138, 4, .4)' },
      dark: { park: '#2e2413', parkEdge: '#8a5a1c', wood: '#261c0e', grass: '#2a2415', tree: 'rgba(251, 146, 60, .32)', tree2: 'rgba(250, 204, 21, .3)' },
    },
    winter: {
      light: { park: '#eef2fa', parkEdge: '#b9c6e3', wood: '#e3e9f6', grass: '#f0f3fa', water: '#d2e6f2', waterEdge: '#8fb8d6', river: '#b7d4e8', tree: 'rgba(71, 85, 125, .28)', tree2: 'rgba(255, 255, 255, .9)' },
      dark: { park: '#1c2340', parkEdge: '#46558a', wood: '#171d36', grass: '#1f2644', water: '#15304a', waterEdge: '#9ec5e6', river: '#3b5d80', tree: 'rgba(191, 219, 254, .3)', tree2: 'rgba(255, 255, 255, .55)' },
    },
    snow: {
      light: { earth: '#f3f5fb', bg: '#f3f5fb', urban: '#eef1f8', bld: '#f7f8fc', bldHi: '#eceff8', bldEdge: '#aab5d6', plaza: '#eef1f8' },
      dark: { earth: '#161a33', bg: '#161a33', urban: '#1a1f3a', bld: '#2e3458', bldHi: '#39406b', bldEdge: 'rgba(214, 228, 255, .45)', plaza: '#1f2542' },
    },
  },

  /* ---------- время суток и сезон ---------- */
  // высота солнца над горизонтом, градусы (приближённая формула — точности в пару градусов хватает)
  sun(lat, lng, t = Date.now()) {
    const r = Math.PI / 180, n = t / 86400000 - 10957.5;
    const L = (280.46 + 0.9856474 * n) % 360, g = (357.528 + 0.9856003 * n) % 360;
    const lam = (L + 1.915 * Math.sin(g * r) + 0.02 * Math.sin(2 * g * r)) * r, eps = (23.439 - 4e-7 * n) * r;
    const dec = Math.asin(Math.sin(eps) * Math.sin(lam)), ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam));
    let ha = (((18.697374558 + 24.06570982441908 * n) % 24) * 15 + lng) * r - ra;
    ha = Math.atan2(Math.sin(ha), Math.cos(ha));
    const alt = Math.asin(Math.sin(lat * r) * Math.sin(dec) + Math.cos(lat * r) * Math.cos(dec) * Math.cos(ha)) / r;
    return { alt, morning: ha < 0 };
  },
  // 'dawn' | 'day' | 'dusk' | 'night'
  phase(lat, lng, t) {
    const s = this.sun(lat, lng, t);
    return s.alt >= 6 ? 'day' : s.alt < -6 ? 'night' : s.morning ? 'dawn' : 'dusk';
  },
  season(t = Date.now()) {
    const m = new Date(t).getMonth();
    return m === 11 || m <= 1 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn';
  },

  /* ---------- узоры ---------- */
  // узор-холст s×s (s делит плитку 256 — без швов между плитками)
  pat(s, draw) { const c = document.createElement('canvas'); c.width = c.height = s; draw(c.getContext('2d')); return c; },
  // ромбическая решётка земли — как фон меню
  lattice(c) {
    return this.pat(32, x => {
      x.strokeStyle = c; x.lineWidth = 1;
      x.beginPath(); x.moveTo(16, 3); x.lineTo(29, 16); x.lineTo(16, 29); x.lineTo(3, 16); x.closePath(); x.stroke();
    });
  },
  // вышитые деревья: ёлочки; второй цвет — цветы весной, листва осенью, снежные шапки зимой
  trees(c, c2, dense) {
    const s = dense ? 24 : 32;
    return this.pat(s, x => {
      const tree = (cx, cy, k) => {
        x.fillStyle = c; x.beginPath(); x.moveTo(cx, cy - 5 * k); x.lineTo(cx + 3.6 * k, cy + 2 * k); x.lineTo(cx - 3.6 * k, cy + 2 * k); x.closePath(); x.fill();
        x.fillRect(cx - .6 * k, cy + 2 * k, 1.2 * k, 2 * k);
        if (c2) { x.fillStyle = c2; x.beginPath(); x.moveTo(cx, cy - 5 * k); x.lineTo(cx + 1.8 * k, cy - 1.5 * k); x.lineTo(cx - 1.8 * k, cy - 1.5 * k); x.closePath(); x.fill(); }
      };
      tree(s * .3, s * .35, 1); tree(s * .8, s * .82, dense ? .85 : .75);
      if (c2) { x.fillStyle = c2; [[.72, .22], [.18, .78]].forEach(([a, b]) => { x.beginPath(); x.arc(s * a, s * b, 1.1, 0, 7); x.fill(); }); }
    });
  },
  // тёплые окна: редкие огоньки по сетке (горят не все)
  windowsPat(c) {
    // 32×32: окна вразброс, разной яркости — одни горят ярко, другие едва тлеют
    const win = [[4, 5, 1], [9, 5, .5], [22, 4, .9], [27, 9, .35], [6, 15, .7], [17, 13, 1], [25, 18, .6], [3, 25, .45], [13, 23, .85], [19, 28, .4], [28, 27, 1]];
    return this.pat(32, x => { win.forEach(([a, b, k]) => { x.globalAlpha = k; x.fillStyle = c; x.fillRect(a, b, 1.8, 2.2); }); });
  },

  // тема карты: phase — время суток, season — время года, snow — снежный покров (зимой и в снегопад)
  theme(phase = 'night', season = 'summer', snow = false) {
    const dark = phase === 'night' || phase === 'dusk';
    const p = Object.assign({}, this.P[phase] || this.P.night, (this.SEASON[season] || {})[dark ? 'dark' : 'light']);
    if (snow) Object.assign(p, this.SEASON.snow[dark ? 'dark' : 'light']);
    const S = protomapsL, w = st => S.exp(1.6, st), kind = f => f.props.kind || '', det = f => f.props.kind_detail || '';
    const PARK = ['park', 'garden', 'playground', 'village_green', 'recreation_ground', 'cemetery', 'pitch', 'golf_course', 'dog_park', 'protected_area', 'nature_reserve', 'national_park'];
    const WOOD = ['wood', 'forest'], GRASS = ['grass', 'grassland', 'meadow', 'scrub', 'allotments', 'farmland'];
    const URBAN = ['residential', 'commercial', 'retail', 'industrial', 'university', 'college', 'school', 'hospital', 'military', 'railway'];
    const latt = this.lattice(p.lattice), tr = this.trees(p.tree, p.tree2, false), trD = this.trees(p.tree, p.tree2, true);
    const big = k => k === 'highway' || k === 'major_road', open = f => !f.props.is_tunnel;
    const paint = [
      { dataLayer: 'earth', symbolizer: new S.PolygonSymbolizer({ fill: p.earth }) },
      { dataLayer: 'earth', symbolizer: new S.PolygonSymbolizer({ pattern: latt }) },
      { dataLayer: 'landuse', symbolizer: new S.PolygonSymbolizer({ fill: p.urban }), filter: (z, f) => URBAN.includes(kind(f)) },
      { dataLayer: 'landuse', symbolizer: new S.PolygonSymbolizer({ fill: p.plaza }), filter: (z, f) => ['pedestrian', 'platform', 'square'].includes(kind(f)) },
      { dataLayer: 'landuse', symbolizer: new S.PolygonSymbolizer({ fill: p.sand }), filter: (z, f) => ['sand', 'beach'].includes(kind(f)) },
      { dataLayer: 'landuse', symbolizer: new S.PolygonSymbolizer({ fill: p.grass }), filter: (z, f) => GRASS.includes(kind(f)) },
      { dataLayer: 'landuse', symbolizer: new S.PolygonSymbolizer({ fill: p.park, stroke: p.parkEdge, width: 1 }), filter: (z, f) => PARK.includes(kind(f)) },
      { dataLayer: 'landuse', symbolizer: new S.PolygonSymbolizer({ pattern: tr }), filter: (z, f) => PARK.includes(kind(f)) },
      { dataLayer: 'landuse', symbolizer: new S.PolygonSymbolizer({ fill: p.wood, stroke: p.parkEdge, width: 1 }), filter: (z, f) => WOOD.includes(kind(f)) },
      { dataLayer: 'landuse', symbolizer: new S.PolygonSymbolizer({ pattern: trD }), filter: (z, f) => WOOD.includes(kind(f)) },
      { dataLayer: 'landcover', symbolizer: new S.PolygonSymbolizer({ fill: p.wood, opacity: .7 }), filter: (z, f) => kind(f) === 'forest' },
      // вода: глубина и светящаяся кромка
      { dataLayer: 'water', symbolizer: new S.PolygonSymbolizer({ fill: p.water, stroke: p.waterEdge, width: 1.4 }), filter: (z, f) => f.geomType === 3 },
      { dataLayer: 'water', symbolizer: new S.LineSymbolizer({ color: p.river, opacity: .35, width: w([[9, 0], [12, 1.2], [18, 5]]) }), filter: (z, f) => f.geomType === 2 && kind(f) === 'river' },
      { dataLayer: 'water', symbolizer: new S.LineSymbolizer({ color: p.river, width: w([[13, .5], [18, 3]]) }), filter: (z, f) => f.geomType === 2 && ['stream', 'canal', 'ditch', 'drain'].includes(kind(f)) },
      // дороги: кайма, затем полотно; большие — золотые нити с бликом и мягким свечением
      { dataLayer: 'roads', symbolizer: new S.LineSymbolizer({ color: p.majorGlow, width: w([[12, 2], [15, 9], [18, 34]]) }), filter: (z, f) => big(kind(f)) && open(f) },
      { dataLayer: 'roads', symbolizer: new S.LineSymbolizer({ color: p.minorCase, width: w([[13, 0], [15, 2.2], [18, 9]]) }), filter: (z, f) => kind(f) === 'minor_road' && open(f) },
      { dataLayer: 'roads', symbolizer: new S.LineSymbolizer({ color: p.casing, width: w([[11, 1.4], [15, 5.5], [18, 17]]) }), filter: (z, f) => big(kind(f)) && open(f) },
      { dataLayer: 'roads', symbolizer: new S.LineSymbolizer({ color: p.path, width: w([[15, .5], [18, 1.4]]), dash: [1.4, 2.6], dashColor: p.path, dashWidth: w([[15, .5], [18, 1.4]]) }), filter: (z, f) => kind(f) === 'path' && !['sidewalk', 'crossing'].includes(det(f)) && open(f) },
      { dataLayer: 'roads', symbolizer: new S.LineSymbolizer({ color: p.minor, width: w([[13, 0], [15, 1.2], [18, 6]]) }), filter: (z, f) => kind(f) === 'minor_road' && open(f) },
      { dataLayer: 'roads', symbolizer: new S.LineSymbolizer({ color: p.major, width: w([[11, .8], [15, 3.4], [18, 12.5]]) }), filter: (z, f) => big(kind(f)) && open(f) },
      { dataLayer: 'roads', symbolizer: new S.LineSymbolizer({ color: p.majorHi, width: w([[13, 0], [15, .8], [18, 2.6]]) }), filter: (z, f) => big(kind(f)) && open(f) },
      { dataLayer: 'roads', symbolizer: new S.LineSymbolizer({ color: p.rail, width: w([[13, .6], [18, 2.2]]), dash: [3, 3], dashColor: p.rail, dashWidth: w([[13, .6], [18, 2.2]]) }), filter: (z, f) => kind(f) === 'rail' && open(f) && det(f) !== 'subway' },
      // дома: чем выше, тем светлее (объём), тонкая кромка
      { dataLayer: 'buildings', symbolizer: new S.PolygonSymbolizer({ fill: (z, f) => (f && f.props.height > 24 ? p.bldHi : p.bld), stroke: p.bldEdge, width: z => (z >= 16 ? .8 : 0), opacity: z => (z < 14 ? .6 : 1) }) },
    ];
    // ночные огни: тёплые окна в домах выше 4 этажей, фонари вдоль улиц (кружок света и огонёк)
    if (p.windows) paint.push({ dataLayer: 'buildings', minzoom: 15, symbolizer: new S.PolygonSymbolizer({ pattern: this.windowsPat(p.windows) }), filter: (z, f) => (f.props.height || 0) >= 12 });
    if (p.lamps) {
      // пунктир в Protomaps рисуется цветом и толщиной самой линии: фонарь — круглый конец очень короткого штриха;
      // свет — два полупрозрачных круга побольше; на больших улицах фонари чаще, во дворах — реже и только вблизи
      const lamp = (minzoom, gap, kinds) => {
        const on = (z, f) => kinds.includes(kind(f)) && open(f) && !f.props.is_bridge;
        [[w([[16, 13], [18, 24]]), .07], [w([[16, 6], [18, 11]]), .16], [w([[16, 1.7], [18, 3]]), .95]].forEach(([width, a], i) =>
          paint.push({ dataLayer: 'roads', minzoom, symbolizer: new S.LineSymbolizer({ color: i === 2 ? `rgba(255, 240, 200, ${a * p.lamps})` : `rgba(255, 200, 110, ${a * p.lamps})`, width, lineCap: 'round', dash: [0.01, gap] }), filter: on }));
      };
      lamp(16, 34, ['major_road', 'highway']);
      lamp(17, 52, ['minor_road']);
    }
    const name = ['name:ru', 'name'], font = (w8, px, fam) => `${w8} ${px}px ${fam}`;
    const label = [
      { dataLayer: 'places', symbolizer: new S.CenteredTextSymbolizer({ labelProps: name, fill: p.place, stroke: p.labelHalo, width: 3, font: font(400, 15, "'Ruslan Display', serif"), textTransform: 'uppercase', letterSpacing: 2 }), filter: (z, f) => ['neighbourhood', 'macrohood', 'locality', 'suburb'].includes(kind(f)) },
      { dataLayer: 'water', symbolizer: new S.CenteredTextSymbolizer({ labelProps: name, fill: p.waterLabel, stroke: p.labelHalo, width: 2.5, font: font('italic 400', 13, "'Philosopher', serif"), letterSpacing: 1 }), filter: (z, f) => f.geomType === 1 },
      { dataLayer: 'water', symbolizer: new S.LineLabelSymbolizer({ labelProps: name, fill: p.waterLabel, stroke: p.labelHalo, width: 2.5, font: font('italic 400', 13, "'Philosopher', serif") }), filter: (z, f) => f.geomType === 2 && kind(f) === 'river' },
      { dataLayer: 'roads', minzoom: 13, symbolizer: new S.LineLabelSymbolizer({ labelProps: name, fill: p.labelMajor, stroke: p.labelHalo, width: 3, font: font(700, 13, "'Philosopher', serif") }), filter: (z, f) => ['highway', 'major_road'].includes(kind(f)) },
      { dataLayer: 'roads', minzoom: 16, symbolizer: new S.LineLabelSymbolizer({ labelProps: name, fill: p.label, stroke: p.labelHalo, width: 2.6, font: font(400, 12, "'Philosopher', serif") }), filter: (z, f) => ['minor_road', 'path'].includes(kind(f)) },
      // приметные места: золотая точка и имя (храмы, музеи, театры, достопримечательности, станции) — только значимые
      { dataLayer: 'pois', minzoom: 16, symbolizer: new S.GroupSymbolizer([
        new S.CircleSymbolizer({ radius: 2.6, fill: p.poi, stroke: p.labelHalo, width: 1.4 }),
        new S.OffsetTextSymbolizer({ labelProps: name, fill: p.poi, stroke: p.labelHalo, width: 2.4, offsetX: 6, offsetY: 4, font: font('italic 400', 11, "'Philosopher', serif") }),
      ]), filter: (z, f) => ['place_of_worship', 'museum', 'theatre', 'attraction', 'castle', 'station'].includes(kind(f)) && (f.props.min_zoom || 99) <= z - 1 },
    ];
    return { paintRules: paint, labelRules: label, backgroundColor: p.bg };
  },
};
