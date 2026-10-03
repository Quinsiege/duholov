'use strict';
/* Реальные объекты на карте: Источники и Святилища стоят у настоящих мест (5.2: не каждую неделю — см. W.awake).
   1) Сервер игры (таблица pois): объекты OpenStreetMap по всей России (раз в неделю их загружает импорт,
      tools/osm-import), места, предложенные игроками и одобренные модерацией, и правки модераторов.
      Телефон читает их квадратами 0.01° × 0.01° (≈ 1 км).
   2) Там, куда импорт не дотягивается (за пределами России), — 5.2: из слоя pois карты мира (Protomaps, те же данные
      OpenStreetMap; плитки z15 карта всё равно грузит): за доли секунды, без Overpass. Без векторной карты — как раньше,
      Overpass API (osm.js). Ответ хранится неделю.
   5.2: места появляются сразу: загрузка при запуске и после телепорта не ждёт прошлую (она прерывается и начинается от новой
   точки), ближние квадраты — первыми, сервер не держит дольше SRV_WAIT, значки перерисовываются по приходу каждой части. */

const Poi = {
  TILE: 0.01,
  KEY: 'duholov.pois.v4',   // 5.2: v4 — места вне России из карты мира (прежний кэш OSM из Overpass не берём, места с сервера — берём)
  LOAD_R: 1200,             // вокруг игрока держим объекты в этом радиусе, м
  OSM_TTL: 7 * 86400000,    // данные OSM обновляются раз в неделю
  SRV_TTL: 5 * 60000,       // места игроков и правки модераторов — каждые 5 минут и при каждом запуске
  RETRY: 30000,             // повтор, если сервер или OSM не ответили (5.2: было 2 мин)
  SRV_WAIT: 8000,           // 5.2: дольше сервер мест не ждём — дальше места из карты, сервер дозагрузится следующим разом
  CACHE_R: 6000,            // что хранить в кэше на телефоне, м
  osm: {},                  // «x:y» → { t, items }
  srv: {},                  // «x:y» → { t, items }
  list: new Map(),          // итог: id → { id, name, kind, cat, lat, lng, photo, t }
  busy: false,

  init() {
    try {
      ['duholov.pois.v1', 'duholov.pois.v2'].forEach(k => localStorage.removeItem(k));
      const c = JSON.parse(localStorage.getItem(this.KEY));
      if (c && c.v === 4) { this.osm = c.osm || {}; this.srv = c.srv || {}; }
      else { // 5.2: с v3 — только места сервера (их всё равно перечитаем), места Overpass заменит карта мира
        const o = JSON.parse(localStorage.getItem('duholov.pois.v3'));
        if (o && o.v === 3) this.srv = o.srv || {};
        localStorage.removeItem('duholov.pois.v3');
      }
    } catch (e) {}
    this.expireServer(); // кэш с сервера показываем сразу, но при запуске перечитываем
    this.rebuild();
    const tick = () => { if (document.hidden) return; this.ensure(); if (MapView.pos) this.shrinesFar(MapView.pos.lat, MapView.pos.lng, Rules.FAR.R); };
    // 5.2: места нужны карте — под полноэкранной сценой (stage.js) не подгружаем; сцена закрылась — догоняем один раз
    setInterval(() => { if (Stage.busy) this._miss = true; else tick(); }, 15000);
    Stage.on(busy => { if (!busy && this._miss) { this._miss = false; setTimeout(() => { if (!Stage.busy) tick(); }, 400); } });
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
    try { localStorage.setItem(this.KEY, JSON.stringify({ v: 4, osm: this.osm, srv: this.srv })); } catch (e) {}
  },
  // Места вокруг загружены импортом — телефону не нужно спрашивать OpenStreetMap самому
  covered() {
    const pos = MapView.pos;
    if (!pos) return false;
    return this.tilesAround(pos.lat, pos.lng, this.LOAD_R).some(([x, y]) => { const t = this.srv[`${x}:${y}`]; return t && (t.items || []).some(p => p.imported); });
  },
  // OSM + правки модераторов + места игроков → один список
  rebuild() {
    const m = new Map();
    if (!this.covered()) for (const tile of Object.values(this.osm)) (tile.items || []).forEach(p => m.set(p.id, p));
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
  // путь снимка — только «<id игрока>/<id>.jpg»: иначе строка из базы могла бы вырваться из атрибута разметки
  PHOTO: /^[0-9a-f-]{36}\/[A-Za-z0-9-]{6,64}\.jpg$/,
  photoUrl(path) { return path && this.PHOTO.test(path) ? `${CLOUD_CONFIG.url}/storage/v1/object/public/poi-photos/${path}` : null; },

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
  // Святилища в радиусе r (для дальних Разломов): с сервера одним запросом, кэш на 10 минут; вне России — что загружено
  far: null,
  async shrinesFar(lat, lng, r) {
    if (this._farBusy) await this._farBusy; // один запрос за раз
    const key = this.tilesAround(lat, lng, 0)[0].map(v => Math.floor(v / 2)).join(':');
    if (!this.far || this.far.key !== key || Date.now() - this.far.t > 600000) {
      this._farBusy = this.loadFar(lat, lng, r, key);
      try { await this._farBusy; } finally { this._farBusy = null; }
    }
    return this.far.items.map(p => Object.assign({}, p, { d: U.dist(lat, lng, p.lat, p.lng) })).filter(p => p.d <= r);
  },
  async loadFar(lat, lng, r, key) {
    const items = new Map(this.near(lat, lng, r, 'shrine').map(p => [p.id, p])); let fail = false;
    if (Cloud.configured()) {
      try {
        const sb = await Cloud.client(), dLat = r / 111320 + 0.02, dLng = dLat / Math.max(0.2, Math.cos(lat * Math.PI / 180));
        for (let from = 0; from < 3000; from += 1000) {
          const { data, error } = await sb.from('pois').select('id, name, kind, lat, lng, active').eq('kind', 'shrine')
            .gte('lat', lat - dLat).lt('lat', lat + dLat).gte('lng', lng - dLng).lt('lng', lng + dLng).order('id').range(from, from + 999);
          if (error) throw new Error(error.message);
          data.forEach(p => { if (p.active === false) items.delete(p.id); else items.set(p.id, p); });
          if (data.length < 1000) break;
        }
      } catch (e) { console.warn('Дальние Святилища:', e.message); fail = true; }
    }
    this.far = { key, t: Date.now() - (fail ? 540000 : 0), items: [...items.values()] }; // сервер не ответил — повторим через минуту
  },
  nearest(lat, lng, r = 100) { return this.near(lat, lng, r).sort((a, b) => a.d - b.d)[0] || null; },

  stale(store, id, ttl) { const t = store[id]; return !t || Date.now() - t.t > (t.fail ? this.RETRY : ttl); },

  // Подгрузить недостающие квадраты вокруг игрока.
  // 5.2: раньше, пока шла загрузка, новый вызов пропускался — а следующий был только по таймеру (15 с; после неудачи — 2 мин).
  // Теперь: то же место — повтор сразу после текущей загрузки; новое место (телепорт, перешёл в другой квадрат) — загрузка
  // от новой точки начинается сразу, прежняя бросается на следующей своей проверке (_gen)
  _gen: 0,
  async ensure() {
    if (!MapView.pos) return;
    const { lat, lng } = MapView.pos, [cx, cy] = this.tileXY(lat, lng), here = `${cx}:${cy}`;
    if (this.busy && this._here === here) { this._again = true; return; }
    this._again = false;
    const gen = ++this._gen;
    const moved = () => gen !== this._gen || !MapView.pos || this.tileId(MapView.pos.lat, MapView.pos.lng) !== here;
    const around = this.tilesAround(lat, lng, this.LOAD_R)
      .sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy));
    const needSrv = Cloud.configured() ? around.filter(t => this.stale(this.srv, t.join(':'), this.SRV_TTL)) : [];
    const needOsm = () => this.covered() ? [] : around.filter(t => this.stale(this.osm, t.join(':'), this.OSM_TTL));
    if (!needSrv.length && !needOsm().length) { this.busy = false; return; } // всё уже есть (прежняя загрузка, если шла, бросится)
    this.busy = true; this._here = here;
    if (!this.near(lat, lng, this.LOAD_R).length && !this._hinted) {
      this._hinted = true;
      UI.toast(ru`Ищу настоящие места вокруг — Источники и Святилища появятся через несколько секунд`);
    }
    const show = () => { this.rebuild(); MapView.refresh(); }; // значки — сразу по приходу каждой части
    const v = this.mapView(), isNear = t => Math.abs(t[0] - cx) <= 1 && Math.abs(t[1] - cy) <= 1;
    // плитки карты для ближних квадратов — сразу, пока отвечает сервер (карта их всё равно рисует; общий кэш)
    if (v && !this.covered()) around.filter(isNear).forEach(t => this.fromMap(v, t[0], t[1]).catch(() => {}));
    try {
      // 5.2: сначала квадрат игрока и соседние (3×3), потом остальные: в каждом круге — сервер игры одним запросом,
      // затем OpenStreetMap там, где мест из импорта нет (из карты мира — все квадраты круга разом, без векторной карты — Overpass по одному)
      for (const near of [true, false]) {
        const srvPart = needSrv.filter(t => isNear(t) === near);
        if (srvPart.length && !moved()) {
          const pull = this.pullServer(srvPart);
          try { await this.withTimeout(pull, this.SRV_WAIT); }
          catch (e) {
            console.warn('Места:', e.message); srvPart.forEach(t => { this.srv[t.join(':')] = { t: Date.now(), fail: true, items: (this.srv[t.join(':')] || {}).items || [] }; });
            pull.then(() => { this.rebuild(); MapView.refresh(); }, () => {}); // сервер ответил позже предела — места всё равно на карту
          }
          show();
        }
        const list = moved() ? [] : needOsm().filter(t => isNear(t) === near);
        const put = ([x, y], items, e) => {
          const id = `${x}:${y}`;
          if (e) console.warn('OpenStreetMap:', e.message);
          this.osm[id] = e ? { t: Date.now(), fail: true, items: (this.osm[id] || {}).items || [] } : { t: Date.now(), items };
        };
        if (v) {
          // из карты мира — все квадраты круга разом, каждый показывается, как только пришёл
          await Promise.all(list.map(t => this.fromMap(v, t[0], t[1]).then(items => put(t, items), e => put(t, null, e)).then(() => { if (!moved()) show(); })));
        } else {
          for (const t of list) { // Overpass — по одному; перегружен — попробуем позже (через RETRY)
            let e = null;
            try { put(t, await Osm.fetch(t[1] * this.TILE, t[0] * this.TILE, (t[1] + 1) * this.TILE, (t[0] + 1) * this.TILE)); } catch (x) { put(t, null, e = x); }
            show();
            if (e || moved()) break;
          }
        }
        if (moved()) break; // ушли — начнём от новой точки
      }
    } finally {
      this.persist();
      if (gen === this._gen) this.busy = false; // иначе уже идёт загрузка от новой точки — она и снимет «занято»
    }
    if (gen !== this._gen) return;
    if (this._again || moved()) { setTimeout(() => this.ensure(), 0); return; }
    this.checkSupply();
  },
  // обещание с пределом по времени: сервер не ответил за ms — дальше без него
  withTimeout(p, ms) {
    let t;
    return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error(ru`Сервер мест не ответил`)), ms); })]).finally(() => clearTimeout(t));
  },
  /* 5.2: места из карты мира. Слой pois векторной карты (Protomaps) — те же объекты OpenStreetMap, что отдаёт Overpass;
     id объекта в плитке — (тип << 44) | id в OSM (1 — точка, 2 — линия, 3 — отношение), то есть те же osm:n…/w…/r…,
     что у сервера и у Overpass. Отбор и названия — те же (Osm.pick), по квадрату 0.01°: у всех игроков одинаковые места. */
  MAP_Z: 15, MAP_EXT: 512, // уровень плиток и размер плитки в координатах объектов (как у Hazard)
  mapView() { const t = typeof MapView !== 'undefined' && MapView.tiles; return (t && t.views && t.views.get('')) || null; },
  async fromMap(v, x, y) {
    const s = y * this.TILE, w = x * this.TILE, n = s + this.TILE, e = w + this.TILE, Z = this.MAP_Z, N = 2 ** Z;
    const tx = g => (g + 180) / 360 * N, ty = a => { const r = a * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * N; };
    const jobs = [];
    for (let yy = Math.floor(ty(n)); yy <= Math.floor(ty(s)); yy++) for (let xx = Math.floor(tx(w)); xx <= Math.floor(tx(e)); xx++) {
      jobs.push(v.tileCache.get({ z: Z, x: xx, y: yy }).then(d => [xx, yy, d]));
    }
    const T44 = 2 ** 44, TYPE = { 1: 'node', 2: 'way', 3: 'relation' }, els = new Map();
    for (const [xx, yy, d] of await Promise.all(jobs)) {
      for (const f of d.get('pois') || []) {
        const k = f.props.kind, type = TYPE[Math.floor(f.id / T44)], p = f.geom && f.geom[0] && f.geom[0][0];
        if (!type || !p || !Osm.CATS[k] || els.has(f.id)) continue;
        const name = f.props['name:ru'] || f.props.name;
        if (!name && (k === 'park' || k === 'garden')) continue; // как в запросе Overpass: парки и сады — только с названием
        const lng = (xx + p.x / this.MAP_EXT) / N * 360 - 180, lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * (yy + p.y / this.MAP_EXT) / N))) * 180 / Math.PI;
        if (lat < s || lat >= n || lng < w || lng >= e) continue; // объект другого квадрата (запас плитки)
        els.set(f.id, { type, id: f.id - Math.floor(f.id / T44) * T44, lat: +lat.toFixed(7), lon: +lng.toFixed(7), tags: { tourism: k, name: f.props.name, 'name:ru': f.props['name:ru'] } });
      }
    }
    return Osm.pick([...els.values()]);
  },
  async pullServer(tiles) {
    const sb = await Cloud.client();
    const xs = tiles.map(t => t[0]), ys = tiles.map(t => t[1]);
    const s = Math.min(...ys) * this.TILE, n = (Math.max(...ys) + 1) * this.TILE;
    const w = Math.min(...xs) * this.TILE, e = (Math.max(...xs) + 1) * this.TILE;
    const rows = [];
    for (let from = 0; from < 20000; from += 1000) {
      const { data, error } = await sb.from('pois').select('id, name, kind, cat, lat, lng, photo, active, imported')
        .gte('lat', s).lt('lat', n).gte('lng', w).lt('lng', e).order('id').range(from, from + 999);
      if (error) throw new Error(error.message);
      rows.push(...data);
      if (data.length < 1000) break;
    }
    const now = Date.now();
    const fresh = new Set(tiles.map(t => t.join(':')));
    fresh.forEach(k => { this.srv[k] = { t: now, items: [] }; });
    rows.forEach(p => { const k = this.tileId(p.lat, p.lng); if (fresh.has(k)) this.srv[k].items.push(p); });
  },

  // Если в округе совсем нет Источников — раз в сутки Орден присылает посылку, чтобы было чем ловить
  checkSupply() {
    const { lat, lng } = MapView.pos;
    const store = this.covered() ? this.srv : this.osm;
    const loaded = this.tilesAround(lat, lng, 1000).every(([x, y]) => { const o = store[`${x}:${y}`]; return o && !o.fail; });
    // 5.2: спящие на этой неделе Источники не в счёт (W.awake)
    if (!loaded || this.near(lat, lng, 1000, 'spring').some(p => W.awake(p, 'spring')) || S.d.supplyDay === U.today() || this._supplying) return;
    this._supplying = true;
    Game.act('supply').then(r => { this._supplying = false; this.showSupply(r.got); }).catch(() => { this._supplying = false; });
  },
  showSupply(got) {
    UI.modal({
      title: ru`Посылка из Ордена`,
      html: `<p>${ru`Поблизости пока нет ни одного Источника, поэтому Орден раз в день присылает припасы: ${got.map(x => `${I18N.back(x.label)} ×${x.n}`).join(', ')}.`}</p>`,
      buttons: [{ label: ru`Спасибо`, cls: 'primary' }],
    });
  },
};
