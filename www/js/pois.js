'use strict';
/* Реальные объекты на карте: Родники и Капища стоят у настоящих мест.
   Источники: OpenStreetMap (памятники, храмы, фонтаны, арт-объекты, парки…) и заявки игроков,
   одобренные модерацией. Сервер отдаёт объекты квадратами 0.02° × 0.02°; на телефоне хранится кэш. */

const Poi = {
  TILE: 0.02,
  KEY: 'duholov.pois.v1',
  LOAD_R: 1600,             // вокруг игрока держим объекты в этом радиусе, м
  TTL: 6 * 3600000,         // как часто перепроверять квадрат
  RETRY: 5 * 60000,         // повтор, если OSM не ответил
  CACHE_R: 6000,            // что хранить в кэше на телефоне, м
  list: new Map(),          // id → { id, name, kind, cat, lat, lng, photo, t }
  tiles: {},                // «x:y» → когда загружен
  busy: false,

  init() {
    try {
      const c = JSON.parse(localStorage.getItem(this.KEY));
      if (c && c.v === 1) { this.tiles = c.tiles || {}; (c.pois || []).forEach(p => { p.t = this.tileId(p.lat, p.lng); this.list.set(p.id, p); }); }
    } catch (e) {}
    this.ensure();
    setInterval(() => this.ensure(), 15000);
  },
  persist() {
    const pos = MapView.pos;
    const pois = [...this.list.values()].filter(p => !pos || U.dist(pos.lat, pos.lng, p.lat, p.lng) < this.CACHE_R)
      .map(({ id, name, kind, cat, lat, lng, photo }) => ({ id, name, kind, cat, lat, lng, photo }));
    const tiles = {};
    for (const [k, t] of Object.entries(this.tiles)) if (Date.now() - t < 7 * 86400000) tiles[k] = t;
    this.tiles = tiles;
    try { localStorage.setItem(this.KEY, JSON.stringify({ v: 1, tiles, pois })); } catch (e) {}
  },

  tileXY(lat, lng) { return [Math.floor(lng / this.TILE), Math.floor(lat / this.TILE)]; },
  tileId(lat, lng) { return this.tileXY(lat, lng).join(':'); },
  tilesAround(lat, lng, r) {
    const dLat = r / 111320, dLng = r / (111320 * Math.max(0.2, Math.cos(lat * Math.PI / 180)));
    const [x0, y0] = this.tileXY(lat - dLat, lng - dLng), [x1, y1] = this.tileXY(lat + dLat, lng + dLng);
    const out = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push([x, y]);
    return out;
  },
  photoUrl(path) { return path ? `${CLOUD_CONFIG.url}/storage/v1/object/public/poi-photos/${path}` : null; },

  // объекты в радиусе, с расстоянием
  near(lat, lng, r, kind) {
    const out = [];
    for (const p of this.list.values()) {
      if (kind && p.kind !== kind) continue;
      if (Math.abs(p.lat - lat) > r / 111000 + 0.001) continue;
      const d = U.dist(lat, lng, p.lat, p.lng);
      if (d <= r) out.push(Object.assign({ d }, p));
    }
    return out;
  },
  nearest(lat, lng, r = 100) { return this.near(lat, lng, r).sort((a, b) => a.d - b.d)[0] || null; },

  // Подгрузить недостающие квадраты вокруг игрока
  async ensure(force) {
    if (this.busy || !MapView.pos || !Cloud.configured()) return;
    const { lat, lng } = MapView.pos;
    const need = this.tilesAround(lat, lng, this.LOAD_R).filter(([x, y]) => force || Date.now() - (this.tiles[`${x}:${y}`] || 0) > this.TTL);
    if (!need.length) return;
    this.busy = true;
    try {
      const sb = await Cloud.client();
      // 1) сервер заполняет квадраты из OpenStreetMap (не больше трёх за вызов)
      let rest = need.slice(0, 12), ready = new Set(), failed = new Set();
      for (let round = 0; round < 5 && rest.length; round++) {
        const { data, error } = await sb.functions.invoke('poi-tiles', { body: { tiles: rest } });
        if (error) throw new Error(error.message);
        data.ready.forEach(id => ready.add(id));
        data.failed.forEach(id => failed.add(id));
        rest = rest.filter(([x, y]) => (data.pending || []).includes(`${x}:${y}`));
      }
      // 2) читаем объекты этих квадратов
      const ids = new Set(need.slice(0, 12).map(t => t.join(':')));
      const xs = need.map(t => t[0]), ys = need.map(t => t[1]);
      const s = Math.min(...ys) * this.TILE, n = (Math.max(...ys) + 1) * this.TILE;
      const w = Math.min(...xs) * this.TILE, e = (Math.max(...xs) + 1) * this.TILE;
      const rows = [];
      for (let from = 0; from < 10000; from += 1000) {
        const { data, error } = await sb.from('pois').select('id, name, kind, cat, lat, lng, photo')
          .gte('lat', s).lt('lat', n).gte('lng', w).lt('lng', e).order('id').range(from, from + 999);
        if (error) throw new Error(error.message);
        rows.push(...data);
        if (data.length < 1000) break;
      }
      for (const [id, p] of this.list) if (ids.has(p.t)) this.list.delete(id);
      rows.forEach(p => { p.t = this.tileId(p.lat, p.lng); if (ids.has(p.t)) this.list.set(p.id, p); });
      const now = Date.now();
      ids.forEach(id => { this.tiles[id] = ready.has(id) ? now : now - this.TTL + this.RETRY; });
      this.persist();
      MapView.refresh();
      this.checkSupply();
    } catch (e) {
      console.warn('Объекты карты:', e.message);
      need.forEach(([x, y]) => { const id = `${x}:${y}`; this.tiles[id] = Math.max(this.tiles[id] || 0, Date.now() - this.TTL + this.RETRY); });
    }
    this.busy = false;
  },

  // Если в округе совсем нет Родников — раз в сутки Орден присылает посылку, чтобы было чем ловить
  checkSupply() {
    const { lat, lng } = MapView.pos;
    const loaded = this.tilesAround(lat, lng, 1000).every(([x, y]) => Date.now() - (this.tiles[`${x}:${y}`] || 0) < this.TTL - this.RETRY);
    if (!loaded || this.near(lat, lng, 1000, 'spring').length || S.d.supplyDay === U.today()) return;
    S.d.supplyDay = U.today();
    const got = S.giveRewards({ charm: 15, honey: 2, water: 1 });
    UI.modal({
      title: 'Посылка из Ордена',
      html: `<p>Поблизости пока нет ни одного Родника, поэтому Орден раз в день присылает припасы: ${got.map(x => `${x.label} ×${x.n}`).join(', ')}.</p>
        <p>Знаешь интересное место рядом? Предложи его в «Меню → Места» — после проверки там появится Родник.</p>`,
      buttons: [{ label: 'Спасибо', cls: 'primary' }],
    });
  },
};
