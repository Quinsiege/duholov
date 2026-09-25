'use strict';
/* 4.9: «Карта Нави» — своя отрисовка настоящей карты (Protomaps, данные OpenStreetMap): те же улицы, дома, парки,
   реки и названия, но в стиле игры. Ночью — лаковая тьма, золотые улицы, светящаяся вода, изумрудные парки
   с вышитыми ёлочками; днём — светлый лавандовый пергамент с золотой каймой дорог. Подписи — шрифтами игры.
   Цвета рисуются сразу в плитке — CSS-фильтр поверх карты больше не нужен. */

const NavMap = {
  P: {
    night: {
      bg: '#120b25', earth: '#120b25', urban: '#160e2c', plaza: '#1c1438', park: '#0f2c24', parkEdge: '#1d5a44', wood: '#0b261e', grass: '#11302a',
      sand: '#2f2519', water: '#0b3142', waterEdge: '#2dd4bf', river: '#1b8a8e', bld: '#221840', bldHi: '#2d2156', bldEdge: 'rgba(243,207,107,.26)',
      casing: '#06030d', major: '#e0b45a', majorHi: 'rgba(255, 246, 214, .55)', majorGlow: 'rgba(251,191,36,.14)', minor: '#3f3374', minorCase: '#0a0618', path: '#6d5ca6', rail: '#7a5d34',
      label: '#ece6ff', labelHalo: '#0b0620', labelMajor: '#fde6a8', place: '#f3cf6b', waterLabel: '#7fe8dc', poi: '#f3cf6b',
      tree: 'rgba(110, 231, 183, .2)', lattice: 'rgba(243, 207, 107, .045)',
    },
    day: {
      bg: '#ebe4f4', earth: '#ece5f5', urban: '#e4dcf0', plaza: '#e0d6ef', park: '#cfe7d6', parkEdge: '#8fc7a4', wood: '#bfdcc8', grass: '#d6ecdb',
      sand: '#efe2c7', water: '#a9dcdc', waterEdge: '#3fb5b0', river: '#6cc3c0', bld: '#d4c8ea', bldHi: '#c5b5e3', bldEdge: '#a592d4',
      casing: '#c9a24c', major: '#fffaf0', majorHi: 'rgba(233, 196, 106, .55)', majorGlow: 'rgba(217,178,92,.25)', minor: '#fbf8ff', minorCase: '#c8bade', path: '#9a86cc', rail: '#b08d57',
      label: '#3b2a6b', labelHalo: '#f7f3ff', labelMajor: '#5a3a0a', place: '#7a4c0e', waterLabel: '#1f7c78', poi: '#a86a18',
      tree: 'rgba(22, 101, 52, .16)', lattice: 'rgba(59, 42, 107, .045)',
    },
  },
  // ширина линий по масштабу (как у Protomaps: экспонента по опорным точкам)
  w: stops => protomapsL.exp(1.6, stops),
  kind: f => f.props.kind || '',
  det: f => f.props.kind_detail || '',
  // узор-холст s×s (s делит плитку 256 — без швов между плитками)
  pat(s, draw) { const c = document.createElement('canvas'); c.width = c.height = s; draw(c.getContext('2d')); return c; },
  // ромбическая решётка земли — как фон меню
  lattice(c) {
    return this.pat(32, x => {
      x.strokeStyle = c; x.lineWidth = 1;
      x.beginPath(); x.moveTo(16, 3); x.lineTo(29, 16); x.lineTo(16, 29); x.lineTo(3, 16); x.closePath(); x.stroke();
    });
  },
  // вышитые ёлочки для парков и лесов
  trees(c, dense) {
    const s = dense ? 24 : 32;
    return this.pat(s, x => {
      x.fillStyle = c;
      const tree = (cx, cy, k) => { x.beginPath(); x.moveTo(cx, cy - 5 * k); x.lineTo(cx + 3.6 * k, cy + 2 * k); x.lineTo(cx - 3.6 * k, cy + 2 * k); x.closePath(); x.fill(); x.fillRect(cx - .6 * k, cy + 2 * k, 1.2 * k, 2 * k); };
      tree(s * .3, s * .35, 1); if (dense) tree(s * .78, s * .8, .85); else tree(s * .8, s * .82, .75);
    });
  },
  theme(night) {
    const p = this.P[night ? 'night' : 'day'], S = protomapsL, w = this.w, kind = this.kind, det = this.det;
    const PARK = ['park', 'garden', 'playground', 'village_green', 'recreation_ground', 'cemetery', 'pitch', 'golf_course', 'dog_park', 'protected_area', 'nature_reserve', 'national_park'];
    const WOOD = ['wood', 'forest'], GRASS = ['grass', 'grassland', 'meadow', 'scrub', 'allotments', 'farmland'];
    const URBAN = ['residential', 'commercial', 'retail', 'industrial', 'university', 'college', 'school', 'hospital', 'military', 'railway'];
    const latt = this.lattice(p.lattice), tr = this.trees(p.tree, false), trD = this.trees(p.tree, true);
    const casing = (f, k) => k === 'highway' || k === 'major_road';
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
      { dataLayer: 'water', symbolizer: new S.PolygonSymbolizer({ fill: p.water, stroke: p.waterEdge, width: 1.4, opacity: 1 }), filter: (z, f) => f.geomType === 3 },
      { dataLayer: 'water', symbolizer: new S.LineSymbolizer({ color: p.river, opacity: .35, width: w([[9, 0], [12, 1.2], [18, 5]]) }), filter: (z, f) => f.geomType === 2 && kind(f) === 'river' },
      { dataLayer: 'water', symbolizer: new S.LineSymbolizer({ color: p.river, width: w([[13, .5], [18, 3]]) }), filter: (z, f) => f.geomType === 2 && ['stream', 'canal', 'ditch', 'drain'].includes(kind(f)) },
      // дороги: подложка-кайма, затем полотно; большие — золотые нити с мягким свечением
      { dataLayer: 'roads', symbolizer: new S.LineSymbolizer({ color: p.majorGlow, width: w([[12, 2], [15, 9], [18, 34]]) }), filter: (z, f) => casing(f, kind(f)) && !f.props.is_tunnel },
      { dataLayer: 'roads', symbolizer: new S.LineSymbolizer({ color: p.minorCase, width: w([[13, 0], [15, 2.2], [18, 9]]) }), filter: (z, f) => kind(f) === 'minor_road' && !f.props.is_tunnel },
      { dataLayer: 'roads', symbolizer: new S.LineSymbolizer({ color: p.casing, width: w([[11, 1.4], [15, 5.5], [18, 17]]) }), filter: (z, f) => casing(f, kind(f)) && !f.props.is_tunnel },
      { dataLayer: 'roads', symbolizer: new S.LineSymbolizer({ color: p.path, width: w([[15, .5], [18, 1.4]]), dash: [1.4, 2.6], dashColor: p.path, dashWidth: w([[15, .5], [18, 1.4]]) }), filter: (z, f) => kind(f) === 'path' && !['sidewalk', 'crossing'].includes(det(f)) && !f.props.is_tunnel },
      { dataLayer: 'roads', symbolizer: new S.LineSymbolizer({ color: p.minor, width: w([[13, 0], [15, 1.2], [18, 6]]) }), filter: (z, f) => kind(f) === 'minor_road' && !f.props.is_tunnel },
      { dataLayer: 'roads', symbolizer: new S.LineSymbolizer({ color: p.major, width: w([[11, .8], [15, 3.4], [18, 12.5]]) }), filter: (z, f) => casing(f, kind(f)) && !f.props.is_tunnel },
      { dataLayer: 'roads', symbolizer: new S.LineSymbolizer({ color: p.majorHi, width: w([[13, 0], [15, .8], [18, 2.6]]) }), filter: (z, f) => casing(f, kind(f)) && !f.props.is_tunnel },
      { dataLayer: 'roads', symbolizer: new S.LineSymbolizer({ color: p.rail, width: w([[13, .6], [18, 2.2]]), dash: [3, 3], dashColor: p.rail, dashWidth: w([[13, .6], [18, 2.2]]) }), filter: (z, f) => kind(f) === 'rail' && !f.props.is_tunnel && det(f) !== 'subway' },
      // дома: чем выше, тем светлее (объём), тонкая светлая кромка
      { dataLayer: 'buildings', symbolizer: new S.PolygonSymbolizer({ fill: (z, f) => (f && f.props.height > 24 ? p.bldHi : p.bld), stroke: p.bldEdge, width: (z) => (z >= 16 ? .8 : 0), opacity: (z) => (z < 14 ? .6 : 1) }) },
    ];
    const name = ['name:ru', 'name'], font = (w8, px, fam) => `${w8} ${px}px ${fam}`;
    const label = [
      { dataLayer: 'places', symbolizer: new S.CenteredTextSymbolizer({ labelProps: name, fill: p.place, stroke: p.labelHalo, width: 3, font: font(400, 15, "'Ruslan Display', serif"), textTransform: 'uppercase', letterSpacing: 2 }), filter: (z, f) => ['neighbourhood', 'macrohood', 'locality', 'suburb'].includes(kind(f)) },
      { dataLayer: 'water', symbolizer: new S.CenteredTextSymbolizer({ labelProps: name, fill: p.waterLabel, stroke: p.labelHalo, width: 2.5, font: font('italic 400', 13, "'Philosopher', serif"), letterSpacing: 1 }), filter: (z, f) => f.geomType === 1 },
      { dataLayer: 'water', symbolizer: new S.LineLabelSymbolizer({ labelProps: name, fill: p.waterLabel, stroke: p.labelHalo, width: 2.5, font: font('italic 400', 13, "'Philosopher', serif") }), filter: (z, f) => f.geomType === 2 && kind(f) === 'river' },
      { dataLayer: 'roads', minzoom: 13, symbolizer: new S.LineLabelSymbolizer({ labelProps: name, fill: p.labelMajor, stroke: p.labelHalo, width: 3, font: font(700, 13, "'Philosopher', serif") }), filter: (z, f) => ['highway', 'major_road'].includes(kind(f)) },
      { dataLayer: 'roads', minzoom: 16, symbolizer: new S.LineLabelSymbolizer({ labelProps: name, fill: p.label, stroke: p.labelHalo, width: 2.6, font: font(400, 12, "'Philosopher', serif") }), filter: (z, f) => ['minor_road', 'path'].includes(kind(f)) },
      // приметные места: золотой ромб и имя (храмы, музеи, театры, достопримечательности, станции)
      { dataLayer: 'pois', minzoom: 16, symbolizer: new S.GroupSymbolizer([
        new S.CircleSymbolizer({ radius: 2.6, fill: p.poi, stroke: p.labelHalo, width: 1.4 }),
        new S.OffsetTextSymbolizer({ labelProps: name, fill: p.poi, stroke: p.labelHalo, width: 2.4, offsetX: 6, offsetY: 4, font: font('italic 400', 11, "'Philosopher', serif") }),
      ]), filter: (z, f) => ['place_of_worship', 'museum', 'theatre', 'attraction', 'castle', 'station'].includes(kind(f)) && (f.props.min_zoom || 99) <= z - 1 },
    ];
    return { paintRules: paint, labelRules: label, backgroundColor: p.bg };
  },
};
