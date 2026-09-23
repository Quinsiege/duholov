'use strict';
/* Реальные объекты на карте: Родники и Капища стоят у настоящих мест.
   1) OpenStreetMap: памятники, храмы, фонтаны, арт-объекты, парки… Телефон сам запрашивает их у Overpass API
      квадратами 0.01° × 0.01° (≈ 1 км), ближние — первыми, и хранит неделю (см. osm.js).
   2) Сервер игры (таблица pois): места, предложенные игроками и одобренные модерацией,
      а также правки модераторов к объектам OSM (скрыть, переименовать, сменить тип). */

const Poi = {
  TILE: 0.01,
  KEY: 'duholov.pois.v3',
  LOAD_R: 1200,             // вокруг игрока держим объекты в этом радиусе, м
  OSM_TTL: 7 * 86400000,    // данные OSM обновляются раз в неделю
  SRV_TTL: 5 * 60000,       // места игроков и правки модераторов — каждые 5 минут и при каждом запуске
  RETRY: 2 * 60000,         // повтор, если сервер не ответил
  CACHE_R: 6000,            // что хранить в кэше на телефоне, м
  osm: {},                  // «x:y» → { t, items }
  srv: {},                  // «x:y» → { t, items }
  list: new Map(),          // итог: id → { id, name, kind, cat, lat, lng, photo, t }
  busy: false,

  init() {
    try {
      ['duholov.pois.v1', 'duholov.pois.v2'].forEach(k => localStorage.removeItem(k));
      const c = JSON.parse(localStorage.getItem(this.KEY));
      if (c && c.v === 3) { this.osm = c.osm || {}; this.srv = c.srv || {}; }
    } catch (e) {}
    this.expireServer(); // кэш с сервера показываем сразу, но при запуске перечитываем
    this.rebuild();
    setInterval(() => this.ensure(), 15000);
  },
  // Перечитать места игроков и правки модераторов (например, когда одобрили мою заявку)
  expireServer() { for (const t of Object.values(this.srv)) t.t = 0; },
  refreshServer() { this.expireServer(); this.ensure(); },
  persist() {
    const pos = MapView.pos;
    const keep = obj => {
      const out = {};
      for (const [k, v] of Object.entries(obj)) {
        const [x, y] = k.split(':').map(Number);
        if (!pos || U.dist(pos.lat, pos.lng, (y + 0.5) * this.TILE, (x + 0.5) * this.TILE) < this.CACHE_R) out[k] = v;
      }
      return out;
    };
    this.osm = keep(this.osm); this.srv = keep(this.srv);
    try { localStorage.setItem(this.KEY, JSON.stringify({ v: 3, osm: this.osm, srv: this.srv })); } catch (e) {}
  },
  // OSM + правки модераторов + места игроков → один список
  rebuild() {
    const m = new Map();
    for (const tile of Object.values(this.osm)) (tile.items || []).forEach(p => m.set(p.id, p));
    for (const tile of Object.values(this.srv)) (tile.items || []).forEach(p => { if (p.active === false) m.delete(p.id); else m.set(p.id, p); });
    for (const p of m.values()) p.t = this.tileId(p.lat, p.lng);
    this.list = m;
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

  stale(store, id, ttl) { const t = store[id]; return !t || Date.now() - t.t > (t.fail ? this.RETRY : ttl); },

  // Подгрузить недостающие квадраты вокруг игрока
  async ensure() {
    if (this.busy || !MapView.pos) return;
    const { lat, lng } = MapView.pos, [cx, cy] = this.tileXY(lat, lng);
    const around = this.tilesAround(lat, lng, this.LOAD_R)
      .sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy));
    const needSrv = Cloud.configured() ? around.filter(t => this.stale(this.srv, t.join(':'), this.SRV_TTL)) : [];
    const needOsm = around.filter(t => this.stale(this.osm, t.join(':'), this.OSM_TTL));
    if (!needSrv.length && !needOsm.length) return;
    this.busy = true;
    if (!this.near(lat, lng, this.LOAD_R).length && !this._hinted && needOsm.length) {
      this._hinted = true;
      UI.toast('Ищу настоящие места вокруг — Родники и Капища появятся через несколько секунд');
    }
    // 1) сервер игры: одним запросом на все квадраты
    if (needSrv.length) {
      try { await this.pullServer(needSrv); }
      catch (e) { console.warn('Места игроков:', e.message); needSrv.forEach(t => { this.srv[t.join(':')] = { t: Date.now(), fail: true, items: (this.srv[t.join(':')] || {}).items || [] }; }); }
      this.rebuild(); MapView.refresh();
    }
    // 2) OpenStreetMap: по одному квадрату, начиная с ближнего
    for (const [x, y] of needOsm) {
      const id = `${x}:${y}`;
      try {
        const items = await Osm.fetch(y * this.TILE, x * this.TILE, (y + 1) * this.TILE, (x + 1) * this.TILE);
        this.osm[id] = { t: Date.now(), items };
      } catch (e) {
        console.warn('OpenStreetMap:', e.message);
        this.osm[id] = { t: Date.now(), fail: true, items: (this.osm[id] || {}).items || [] };
        break; // серверы OSM перегружены — попробуем позже
      }
      this.rebuild(); MapView.refresh();
      if (MapView.pos && this.tileId(MapView.pos.lat, MapView.pos.lng) !== `${cx}:${cy}`) break; // ушли — начнём от новой точки
    }
    this.persist();
    this.busy = false;
    this.checkSupply();
  },
  async pullServer(tiles) {
    const sb = await Cloud.client();
    const xs = tiles.map(t => t[0]), ys = tiles.map(t => t[1]);
    const s = Math.min(...ys) * this.TILE, n = (Math.max(...ys) + 1) * this.TILE;
    const w = Math.min(...xs) * this.TILE, e = (Math.max(...xs) + 1) * this.TILE;
    const rows = [];
    for (let from = 0; from < 20000; from += 1000) {
      const { data, error } = await sb.from('pois').select('id, name, kind, cat, lat, lng, photo, active')
        .gte('lat', s).lt('lat', n).gte('lng', w).lt('lng', e).order('id').range(from, from + 999);
      if (error) throw new Error(error.message);
      rows.push(...data);
      if (data.length < 1000) break;
    }
    const now = Date.now();
    tiles.forEach(t => { this.srv[t.join(':')] = { t: now, items: [] }; });
    rows.forEach(p => { const k = this.tileId(p.lat, p.lng); if (this.srv[k]) this.srv[k].items.push(p); });
  },

  // Если в округе совсем нет Родников — раз в сутки Орден присылает посылку, чтобы было чем ловить
  checkSupply() {
    const { lat, lng } = MapView.pos;
    const loaded = this.tilesAround(lat, lng, 1000).every(([x, y]) => { const o = this.osm[`${x}:${y}`]; return o && !o.fail; });
    if (!loaded || this.near(lat, lng, 1000, 'spring').length || S.d.supplyDay === U.today() || this._supplying) return;
    this._supplying = true;
    Game.act('supply').then(r => { this._supplying = false; this.showSupply(r.got); }).catch(() => { this._supplying = false; });
  },
  showSupply(got) {
    UI.modal({
      title: 'Посылка из Ордена',
      html: `<p>Поблизости пока нет ни одного Родника, поэтому Орден раз в день присылает припасы: ${got.map(x => `${x.label} ×${x.n}`).join(', ')}.</p>
        <p>Знаешь интересное место рядом? Предложи его в «Меню → Места» — после проверки там появится Родник.</p>`,
      buttons: [{ label: 'Спасибо', cls: 'primary' }],
    });
  },
};
