'use strict';
/* Карта (Leaflet + OSM/CARTO), позиция игрока по GPS или демо-джойстику, маркеры мира */

const MapView = {
  map: null, pos: null, follow: true, heading: 0, markers: new Map(), nearby: [],
  gpsOK: false, watchId: null, lastGps: null, demo: false, tiles: null, night: null,
  joy: { x: 0, y: 0 }, keys: {},

  init() {
    let start = null;
    try { start = JSON.parse(localStorage.getItem('duholov.lastPos')); } catch (e) {}
    if (!Array.isArray(start)) start = [55.7539, 37.6208];
    this.pos = { lat: start[0], lng: start[1] };
    this.map = L.map('map', { zoomControl: false, minZoom: 15, maxZoom: 19, zoomSnap: 0.25, tap: true })
      .setView([this.pos.lat, this.pos.lng], 17.5);
    this.map.attributionControl.setPrefix(false);
    this.setTiles();
    setInterval(() => this.setTiles(), 60000);

    // 4.8.1: зона досягаемости — круг Ловчего (свечение, кольцо рун, волна); размер — радиус взаимодействия на текущем масштабе
    this.range = L.marker([this.pos.lat, this.pos.lng], { interactive: false, keyboard: false, zIndexOffset: -5000, flat: true,
      icon: L.divIcon({ className: 'mk-range', iconSize: [0, 0], iconAnchor: [0, 0], html: '<div class="rz"><svg class="rz-vis" viewBox="-1 -1 2 2" preserveAspectRatio="none" aria-hidden="true"><path d="M-1 0A1 1 0 1 0 1 0A1 1 0 1 0 -1 0Z"/></svg><i class="rz-fill"></i><i class="rz-wave"></i><i class="rz-runes"></i><i class="rz-ring"></i><i class="rz-edge"></i></div><svg class="rz-beam" viewBox="-1 -1.25 2 2.25" preserveAspectRatio="none" aria-hidden="true"><g></g></svg>' }) }).addTo(this.map);
    this.map.on('zoomanim', e => { this.fitRange(e.zoom, true); this.fitZones(e.zoom, true); });
    this.map.on('zoomend viewreset resize', () => { this.fitRange(); this.fitZones(); this.shapeRange(); });
    this.fitRange();
    if (typeof Fog !== 'undefined') { Fog.init(this.map); Fog.setLook(this.night); Fog.visit(this.pos.lat, this.pos.lng); }
    this.player = L.marker([this.pos.lat, this.pos.lng], {
      interactive: false, zIndexOffset: 1000,
      icon: L.divIcon({ className: 'mk-player-wrap', iconSize: [64, 64], iconAnchor: [32, 32],
        html: '<div class="mk-player"><div class="pulse"></div><div class="arrow"></div><div class="dot"></div><div class="mk-buddy"></div></div>' }),
    }).addTo(this.map);
    this.updateBuddy();
    Bus.on('buddyChanged', () => this.updateBuddy());
    Bus.on('weather', () => { this.setWeatherFx(); this.setTiles(); this.refresh(true); });

    this.map.on('dragstart', () => { this.follow = false; U.$('#recenterBtn').classList.add('show'); });
    U.$('#recenterBtn').onclick = () => this.recenter();
    this.initRotate();

    this.initJoystick();
    window.addEventListener('keydown', e => { this.keys[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });

    if (Cfg.s.demo && DEV) this.startDemo(); else this.startGPS();
    // 4.1: свёрнутая игра не держит GPS (батарея); при возвращении — сразу свежая точка
    document.addEventListener('visibilitychange', () => {
      if (this.demo) return;
      if (document.hidden) this.stopGPS(); else if (this.watchId == null) this.startGPS();
    });
    this.refresh();
    // в режиме экономии батареи карта обновляется вдвое реже
    document.body.classList.toggle('eco', !!Cfg.s.eco);
    let tickN = 0;
    setInterval(() => { if (!document.hidden && (!Cfg.s.eco || ++tickN % 2 === 0)) this.refresh(); }, 1500);
  },
  // 4.6.3: цикл кадров нужен только демо-ходьбе (джойстик, клавиши) — без неё страница не просыпается 120 раз в секунду
  runLoop() {
    if (this._raf || !this.demo) return;
    let last = performance.now();
    const loop = t => { if (!this.demo) { this._raf = 0; return; } this.tick(Math.min(0.1, (t - last) / 1000)); last = t; this._raf = requestAnimationFrame(loop); };
    this._raf = requestAnimationFrame(loop);
  },

  // 4.1: своя карта — векторные тайлы России (Protomaps, данные OpenStreetMap) одним файлом на сервере игры;
  // за пределами вырезки — стандартные тайлы OSM. Ночной вид и тона Нави — CSS-фильтр слоя (style.css).
  TILES: 'tiles/russia-20260924.pmtiles',
  COVER: [19.5, 41.1, 180, 72], // рамка вырезки: долгота, широта (юго-запад → северо-восток)
  covered(p) { const b = this.COVER; return !!p && p.lng >= b[0] && p.lng <= b[2] && p.lat >= b[1] && p.lat <= b[3]; },
  // 4.10: облик карты — время суток по настоящему солнцу над игроком, время года и снег (зимой и в снегопад);
  // в настройках можно закрепить день или ночь
  look() {
    const theme = Cfg.s.mapTheme || 'auto', p = this.pos || { lat: 55.75, lng: 37.62 }, nav = typeof NavMap !== 'undefined';
    const phase = theme === 'light' ? 'day' : theme === 'dark' ? 'night' : nav ? NavMap.phase(p.lat, p.lng) : U.isNight() ? 'night' : 'day';
    const season = nav ? NavMap.season() : 'summer', snow = season === 'winter' || !!(Sky.w && Sky.w.key === 'snow');
    return { phase, season, snow, night: phase === 'night' || phase === 'dusk', key: [phase, season, snow].join(':') };
  },
  setTiles() {
    const lk = this.look();
    if (lk.key === this._look) return;
    this._look = lk.key;
    const night = this.night = lk.night;
    const nav = typeof NavMap !== 'undefined';
    if (!this.tiles) {
      const osm = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
      if (typeof protomapsL !== 'undefined' && this.covered(this.pos)) {
        // 4.9: «Карта Нави» — своя отрисовка (js/navmap.js); без неё — стандартная светлая с CSS-фильтром тонов Нави
        this.tiles = protomapsL.leafletLayer({
          url: ['duholov.ru', 'localhost', '127.0.0.1'].includes(location.hostname) ? this.TILES : 'https://duholov.ru/' + this.TILES,
          lang: 'ru', attribution: `${osm} · <a href="https://protomaps.com">Protomaps</a>`, ...(nav ? NavMap.theme(lk.phase, lk.season, lk.snow) : { flavor: 'light' }),
        }).addTo(this.map);
        if (nav) {
          U.$('#map').classList.add('navmap');
          // подписи — шрифтами игры: как только шрифты загрузились, перерисовать
          if (document.fonts) Promise.all(["400 12px 'Philosopher'", "700 12px 'Philosopher'", "400 12px 'Ruslan Display'"].map(f => document.fonts.load(f).catch(() => {})))
            .then(() => { this.tiles.clearLayout(); this.tiles.rerenderTiles(); });
        }
      } else {
        this.tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: osm }).addTo(this.map);
      }
    } else if (nav && this.tiles.rerenderTiles) {
      // сменилось время суток, сезон или пошёл снег — другая палитра: перерисовать плитки и подписи
      Object.assign(this.tiles, NavMap.theme(lk.phase, lk.season, lk.snow));
      this.tiles.clearLayout(); this.tiles.rerenderTiles();
    }
    document.body.classList.toggle('night', night);
    // 4.11: дымка горизонта у наклонённой карты — цвета земли этого часа
    const hz = nav ? (lk.snow && NavMap.SEASON.snow[night ? 'dark' : 'light'].bg) || NavMap.P[lk.phase].bg : night ? '#1b1b1f' : '#d9d3c7';
    document.body.style.setProperty('--haze', hz);
    if (typeof Fog !== 'undefined') Fog.setLook(night);
    if (typeof Music !== 'undefined') Music.apply(); // 4.8: днём и ночью — разные мелодии карты
  },

  updateBuddy() {
    const el = this.player && this.player.getElement();
    if (!el) return;
    const sp = S.buddySpirit();
    el.querySelector('.mk-buddy').innerHTML = sp ? Art.imgOf(sp) : '';
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

  recenter() {
    this.follow = true;
    U.$('#recenterBtn').classList.remove('show');
    this.map.setView([this.pos.lat, this.pos.lng], Math.max(this.map.getZoom(), 17), { animate: true });
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
    // стена света выше круга: её рамка поднята на четверть радиуса (см. viewBox в разметке)
    const beam = el.querySelector('.rz-beam');
    if (beam) {
      beam.style.transition = box.style.transition;
      beam.style.width = r * 2 + 'px'; beam.style.height = r * 2.25 + 'px';
      beam.style.margin = -r * 1.25 + 'px 0 0 ' + -r + 'px';
    }
  },

  /* 4.13: круг Ловчего лежит на земле. Из игрока во все стороны идут лучи и останавливаются у первой стены —
     за домом круг не продолжается, по пустому месту идёт до конца радиуса. Дома, стоящие перед кругом,
     заслоняют его стенами и крышами (те же высоты, что рисует NavMap.extrude). К краю круг слегка бледнеет.
     Всё это — маска (SVG) на самом круге в его собственных координатах: −1…1 от центра до края, поэтому при
     масштабировании маска растягивается вместе с кругом. Контуры домов берутся из уже загруженных плиток карты.
     Правило игры не меняется: поймать духа можно в пределах радиуса, как и раньше (это проверяет сервер). */
  shapeRange() {
    if (this._rzT) return; // не чаще раза в 120 мс, даже пока игрок идёт без остановки
    this._rzT = setTimeout(() => { this._rzT = 0; this._shapeRange(); }, 120);
  },
  _shapeRange() {
    const box = this.range && this.range.getElement() && this.range.getElement().firstElementChild;
    if (!box) return;
    const f3 = v => Math.round(v * 1000) / 1000;
    let vis = '', sil = '';
    const pts = [];
    const t = this.tiles, view = t && t.views && t.views.get(''), tc = view && view.tileCache;
    if (tc && typeof NavMap !== 'undefined') {
      const S = tc.tileSize, tz = t._tileZoom != null ? t._tileZoom : Math.round(this.map.getZoom());
      const dz = Math.max(0, Math.min(view.maxDataLevel, tz - view.levelDiff)), k = S / 256;
      const ll = this.range.getLatLng(), p0 = this.map.project(ll, dz), px = p0.x * k, py = p0.y * k;
      const rU = Math.abs(p0.y - this.map.project(L.latLng(ll.lat + W.INTERACT / 111320, ll.lng), dz).y) * k; // радиус в точках данных
      const zd = tz + Math.log2(256 / S), perData = 256 * Math.pow(2, tz - dz) / S; // как считает extrude
      const edges = [], blds = [];
      let missing = false;
      for (let tx = Math.floor((px - rU * 1.3) / S); tx <= Math.floor((px + rU * 1.3) / S); tx++)
        for (let ty = Math.floor((py - rU * 1.3) / S); ty <= Math.floor((py + rU * 1.6) / S); ty++) {
          const e = tc.cache.get(`${tx}:${ty}:${dz}`);
          if (!e) { missing = true; tc.get({ x: tx, y: ty, z: dz }).then(() => this.shapeRange(), () => {}); continue; }
          const list = e.data && e.data.get('buildings');
          if (!list) continue;
          const ox = tx * S - px, oy = ty * S - py;
          for (const f of list) {
            const dy = NavMap.lift(NavMap.height(f), zd) / perData, b = f.bbox;
            if (b.maxX + ox < -rU || b.minX + ox > rU || b.maxY + oy < -rU || b.minY + oy - dy > rU) continue;
            const rings = f.geom.map(r => r.map(q => ({ x: q.x + ox, y: q.y + oy, out: q.x <= .5 || q.x >= S - .5 || q.y <= .5 || q.y >= S - .5 })));
            // игрок внутри дома (неточный GPS) — этот дом не заслоняет
            let inside = false;
            const r0 = rings[0];
            for (let i = 0, j = r0.length - 1; i < r0.length; j = i++)
              if ((r0[i].y > 0) !== (r0[j].y > 0) && 0 < (r0[j].x - r0[i].x) * (0 - r0[i].y) / (r0[j].y - r0[i].y) + r0[i].x) inside = !inside;
            if (inside) continue;
            for (const r of rings) for (let i = 0; i < r.length; i++) {
              const a = r[i], c = r[(i + 1) % r.length];
              if (a.out && c.out) continue; // срез по краю плитки (дом лежит на двух плитках) — не настоящая стена
              edges.push(a.x, a.y, c.x, c.y);
            }
            blds.push({ rings, dy });
          }
        }
      if (missing && !edges.length) return; // плитки ещё грузятся — дорисуем, когда придут
      // лучи: до первой стены или до края
      const RAYS = 360;
      for (let i = 0; i < RAYS; i++) {
        const a = i / RAYS * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
        let tm = rU;
        for (let j = 0; j < edges.length; j += 4) {
          const ax = edges[j], ay = edges[j + 1], ex = edges[j + 2] - ax, ey = edges[j + 3] - ay, den = dx * ey - dy * ex;
          if (Math.abs(den) < 1e-9) continue;
          const tt = (ax * ey - ay * ex) / den, u = (ax * dy - ay * dx) / den;
          if (tt > 0 && tt < tm && u >= 0 && u <= 1) tm = tt;
        }
        vis += (i ? 'L' : 'M') + f3(dx * tm / rU) + ' ' + f3(dy * tm / rU);
        pts.push([dx * tm / rU, dy * tm / rU]);
      }
      vis += 'Z';
      // дома перед кругом заслоняют его: основание, крыша и стены между ними
      for (const { rings, dy } of blds) {
        const h = dy / rU;
        for (const r of rings) {
          const P = r.map(q => [q.x / rU, q.y / rU]);
          sil += 'M' + P.map(q => f3(q[0]) + ' ' + f3(q[1])).join('L') + 'Z';
          if (h > .002) {
            sil += 'M' + P.map(q => f3(q[0]) + ' ' + f3(q[1] - h)).join('L') + 'Z';
            for (let i = 0; i < P.length; i++) {
              const a = P[i], c = P[(i + 1) % P.length];
              sil += `M${f3(a[0])} ${f3(a[1])}L${f3(c[0])} ${f3(c[1])}L${f3(c[0])} ${f3(c[1] - h)}L${f3(a[0])} ${f3(a[1] - h)}Z`;
            }
          }
        }
      }
    }
    if (!vis) {
      vis = 'M-1 0A1 1 0 1 0 1 0A1 1 0 1 0 -1 0Z';
      for (let i = 0; i < 180; i++) pts.push([Math.cos(i / 90 * Math.PI), Math.sin(i / 90 * Math.PI)]);
    }
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 2 2"><defs><radialGradient id="g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse">'
      + '<stop offset=".6" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity=".6"/></radialGradient>'
      + `<mask id="m"><path d="${vis}" fill="url(#g)"/>${sil ? `<path d="${sil}" fill="#000"/>` : ''}</mask></defs>`
      + '<rect x="-1" y="-1" width="2" height="2" fill="#fff" mask="url(#m)"/></svg>';
    const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    box.style.webkitMaskImage = url; box.style.maskImage = url;
    // сама досягаемая земля: лёгкая заливка и золотая кромка вдоль стен (у края круга её продолжают руны)
    const vp = box.querySelector('.rz-vis path');
    if (vp) vp.setAttribute('d', vis);
    // 4.13: невысокая стена света по краю досягаемой земли — золото у земли тает кверху (как дома, «вверх» по экрану)
    const beam = this.range.getElement().querySelector('.rz-beam');
    if (beam) {
      // сплошные грани от основания вверх, каждая — с плавным градиентом (прямые участки стен — одной гранью)
      const H = .2, P = [];
      for (const q of pts) {
        const n = P.length;
        if (n >= 2) {
          const a = P[n - 2], b = P[n - 1];
          if (Math.abs((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0])) < 1e-5) { P[n - 1] = q; continue; }
        }
        P.push(q);
      }
      // слои: каждый — одна сплошная фигура (стены от земли до своей высоты), полупрозрачные; у земли их много,
      // вверху мало — стена плавно тает кверху, и между гранями нет швов
      const K = 16;
      let g = '';
      for (let k = 1; k <= K; k++) {
        const h = H * k / K;
        let d = '';
        for (let i = 0; i < P.length; i++) {
          const a = P[i], b = P[(i + 1) % P.length];
          d += 'M' + f3(a[0]) + ' ' + f3(a[1]) + 'L' + f3(b[0]) + ' ' + f3(b[1]) + 'L' + f3(b[0]) + ' ' + f3(b[1] - h) + 'L' + f3(a[0]) + ' ' + f3(a[1] - h) + 'Z';
        }
        g += '<path d="' + d + '"/>';
      }
      beam.querySelector('g').innerHTML = g;
      const bsvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1.25 2 2.25"><rect x="-1" y="-1.25" width="2" height="2.25" fill="#fff"/>'
        + (sil ? '<path d="' + sil + '" fill="#000"/>' : '') + '</svg>';
      const bu = 'url("data:image/svg+xml,' + encodeURIComponent(bsvg) + '")';
      // маска по яркости: чёрные дома — вырез
      beam.style.webkitMaskImage = bu; beam.style.maskImage = bu;
    }
  },

  moveTo(lat, lng, jump) {
    this.pos = { lat, lng };
    const ll = [lat, lng];
    this.player.setLatLng(ll);
    this.range.setLatLng(ll);
    this.drawTrail(lat, lng);
    this.shapeRange();
    if (typeof Fog !== 'undefined') Fog.visit(lat, lng); // 4.12: туман Нави рассеивается там, где прошёл Ловчий
    if (this.follow) {
      if (jump) this.map.setView(ll, 17.5, { animate: false });
      else this.map.panTo(ll, { animate: false });
    }
    const el = this.player.getElement();
    if (el) el.querySelector('.arrow').style.transform = `rotate(${this.heading + this.rot}deg)`; // с учётом поворота карты
    // последняя точка — только на этом телефоне, чтобы карта открывалась на привычном месте
    if (Date.now() - (this._lpT || 0) > 10000) { this._lpT = Date.now(); try { localStorage.setItem('duholov.lastPos', JSON.stringify([+lat.toFixed(5), +lng.toFixed(5)])); } catch (e) {} }
    if (this.tracking) this.updateTracker();
  },

  /* ---------------- GPS ---------------- */
  startGPS() {
    this.stopDemo();
    if (!('geolocation' in navigator)) { this.gpsFail(); return; }
    UI.setGps('search');
    if (this.watchId != null) navigator.geolocation.clearWatch(this.watchId);
    this.watchId = navigator.geolocation.watchPosition(p => this.onFix(p), e => this.gpsFail(e),
      { enableHighAccuracy: true, maximumAge: Cfg.s.eco ? 5000 : 1000, timeout: 30000 });
    clearTimeout(this._gpsTimer);
    this._gpsTimer = setTimeout(() => { if (!this.gpsOK && !this.demo) this.offerDemo(); }, 15000);
  },
  stopGPS() {
    if (this.watchId != null) navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
    clearTimeout(this._gpsTimer);
  },
  onFix(p) {
    if (this.demo) return;
    const { latitude: lat, longitude: lng, accuracy } = p.coords;
    const first = !this.gpsOK;
    this.gpsOK = true;
    this.acc = accuracy;
    Game.addPoint(lat, lng, accuracy); // путь считает сервер (быстрее ~32 км/ч — не засчитывается)
    UI.setGps(accuracy <= 40 ? 'ok' : 'weak', accuracy);
    if (this.lastGps && accuracy <= 40) {
      const d = U.dist(this.lastGps.lat, this.lastGps.lng, lat, lng);
      const dt = (p.timestamp - this.lastGps.t) / 1000;
      if (d >= 4 && dt > 0) {
        this.heading = Math.atan2((lng - this.lastGps.lng) * Math.cos(lat * Math.PI / 180), lat - this.lastGps.lat) * 180 / Math.PI;
        this.lastGps = { lat, lng, t: p.timestamp };
      }
    } else if (!this.lastGps || accuracy <= 40) this.lastGps = { lat, lng, t: p.timestamp };
    this.moveTo(lat, lng, first);
    if (first) { this.refresh(); Poi.ensure(); }
  },
  gpsFail(err) {
    if (this.demo) return;
    UI.setGps('off');
    if (!this.gpsOK) this.offerDemo(err && err.code === 1 ? 'Доступ к геолокации запрещён.' : 'Не удалось получить координаты.');
  },
  offerDemo(reason = 'GPS не отвечает.') {
    if (this._offered) return;
    this._offered = true;
    if (DEV) {
      UI.confirm('Нет сигнала GPS', `${reason} Включить демо-режим (джойстик)? Доступен только при разработке.`,
        'Демо-режим', () => { Cfg.s.demo = true; Cfg.save(); this.startDemo(); }, 'Ждать GPS');
      return;
    }
    // в проде — подсказка, как включить геолокацию
    UI.modal({
      title: 'Нет сигнала GPS',
      html: `<p>${reason}</p><ul class="gps-help">
        <li>Включи геолокацию (местоположение) в шторке уведомлений телефона.</li>
        <li>Разреши доступ к местоположению: в браузере — значок замка у адреса сайта, в приложении — Настройки → Приложения → Духолов → Разрешения.</li>
        <li>Выйди на открытое место: в помещении спутники ловятся хуже.</li></ul>`,
      buttons: [{ label: 'Позже' }, { label: 'Повторить', cls: 'primary', fn: () => { this._offered = false; this.startGPS(); } }],
    });
  },

  /* ---------------- 4.7: ПОВОРОТ КАРТЫ И КОМПАС ---------------- */
  // Карту крутят двумя пальцами; компас слева внизу показывает север, касание — вернуть север вверх.
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
    L.Marker.prototype._setPos = function (p) {
      setPos.call(this, p);
      const el = this._icon;
      if (!el || this._map !== self.map || (!self.rot && !self.tilt)) return;
      el.style.transformOrigin = `${-parseFloat(el.style.marginLeft) || 0}px ${-parseFloat(el.style.marginTop) || 0}px`;
      if (self.rot) el.style.transform += ` rotate(${-self.rot}deg)`;
      // и чуть приподняты над землёй: иначе нижняя половина значка ушла бы «под» плитки карты
      if (self.tilt && !this.options.flat) el.style.transform += ` rotateX(${-self.tilt}deg) translateZ(36px)`;
    };
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
      const t = this.tilt * Math.PI / 180, sn = Math.sin(t), cs = Math.cos(t), d = this.PD, py = this._py;
      const top = this.tilt ? py * d / (d * cs - py * sn) : py, bot = this.tilt ? (H - py) * d / (d * cs + (H - py) * sn) : H - py;
      const half = Math.max(top, bot), xw = this.tilt ? (W / 2) * (d + top * sn) / d : W / 2;
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
    // подпись OpenStreetMap остаётся видна: у повёрнутой карты — копия в углу экрана
    const at = U.$('#mapAttr');
    if (at) { at.classList.toggle('hidden', !on); if (on) at.innerHTML = this.map.attributionControl.getContainer().innerHTML; }
  },
  setTilt(on) {
    this.tilt = on ? this.TILT : 0;
    this.layout();
    this.zoomMode();
  },
  // при повороте и наклоне масштаб — вокруг игрока (точку между пальцами Leaflet у такого слоя считает неверно)
  zoomMode() { const o = this.map.options, c = this.rot || this.tilt; o.touchZoom = o.scrollWheelZoom = o.doubleClickZoom = c ? 'center' : true; },
  // точка экрана → точка на плоскости карты (относительно игрока, в осях ненаклонённой и неповёрнутой карты)
  plane(x, y) {
    let X = x - innerWidth / 2, Y = y - (this._py || innerHeight / 2);
    if (this.tilt) {
      const t = this.tilt * Math.PI / 180, sn = Math.sin(t), cs = Math.cos(t), d = this.PD;
      Y = Y * d / (cs * d + Y * sn); X = X * (d - Y * sn) / d;
    }
    if (this.rot) { const a = -this.rot * Math.PI / 180; [X, Y] = [X * Math.cos(a) - Y * Math.sin(a), X * Math.sin(a) + Y * Math.cos(a)]; }
    return { x: X, y: Y };
  },
  setRot(r) {
    r = ((r % 360) + 540) % 360 - 180;
    if (Math.abs(r) < 0.05) r = 0;
    const turned = !!r !== !!this.rot;
    this.rot = r;
    if (turned) this.layout();
    U.$('#map').style.setProperty('--mrot', r + 'deg');
    this.zoomMode();
    if (!turned) this.map.eachLayer(l => { if (l instanceof L.Marker) l.update(); });
    const el = this.player && this.player.getElement();
    if (el) el.querySelector('.arrow').style.transform = `rotate(${this.heading + r}deg)`;
    const c = U.$('#compassBtn');
    if (c) { c.firstElementChild.style.transform = `rotate(${r}deg)`; c.classList.toggle('turned', !!r); }
    if (this.tracking) this.updateTracker();
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
    const lt = [['С', 0, 'n'], ['В', 90, ''], ['Ю', 180, ''], ['З', 270, '']].map(([t, a, c]) => {
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

  /* ---------------- ДЕМО-РЕЖИМ ---------------- */
  startDemo() {
    this.stopGPS();
    this.demo = true;
    U.$('#joystick').classList.remove('hidden');
    UI.setGps('demo');
    this.runLoop();
  },
  stopDemo() {
    this.demo = false;
    U.$('#joystick').classList.add('hidden');
  },
  initJoystick() {
    const j = U.$('#joystick'), stick = j.querySelector('.stick');
    let id = null;
    const set = e => {
      const r = j.getBoundingClientRect(), R = r.width / 2 - 14;
      let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const m = Math.hypot(dx, dy);
      if (m > R) { dx *= R / m; dy *= R / m; }
      stick.style.transform = `translate(${dx}px, ${dy}px)`;
      this.joy = { x: dx / R, y: dy / R };
    };
    j.addEventListener('pointerdown', e => { id = e.pointerId; j.setPointerCapture(id); set(e); });
    j.addEventListener('pointermove', e => { if (e.pointerId === id) set(e); });
    const end = e => { if (e.pointerId !== id) return; id = null; stick.style.transform = ''; this.joy = { x: 0, y: 0 }; };
    j.addEventListener('pointerup', end);
    j.addEventListener('pointercancel', end);
  },
  tick(dt) {
    if (!this.demo || UI.blocking()) return;
    let { x, y } = this.joy;
    const k = this.keys;
    if (k.w || k.arrowup || k['ц']) y = -1;
    if (k.s || k.arrowdown || k['ы']) y = 1;
    if (k.a || k.arrowleft || k['ф']) x = -1;
    if (k.d || k.arrowright || k['в']) x = 1;
    const mag = Math.min(1, Math.hypot(x, y));
    if (mag < 0.08) return;
    const m = 8 * mag * dt; // до 8 м/с — быстрый шаг
    const n = Math.hypot(x, y);
    const lat = this.pos.lat - (y / n) * m / 111320;
    const lng = this.pos.lng + (x / n) * m / (111320 * Math.cos(this.pos.lat * Math.PI / 180));
    this.heading = Math.atan2(x, -y) * 180 / Math.PI;
    this._demoAcc = (this._demoAcc || 0) + m;
    if (this._demoAcc > 5) { Game.addPoint(lat, lng, 5); this._demoAcc = 0; }
    this.moveTo(lat, lng, false);
  },

  /* ---------------- МАРКЕРЫ ---------------- */
  icon(e) {
    if (e.type === 'spirit') {
      const s = SP[e.sid];
      return L.divIcon({ className: 'mk', iconSize: [68, 68], iconAnchor: [34, 62],
        html: `<div class="mk-spirit r${s.rar}" style="--c:${ELEMENTS[s.el].color}">${e.tut ? '<div class="tut-ring"></div>' : ''}<div class="mk-glow"></div>${Art.img(e.sid)}${e.boost ? `<div class="mk-boost">${Art.wxIcon(Sky.w.key, 16)}</div>` : ''}</div>` });
    }
    if (e.type === 'spring') {
      return L.divIcon({ className: 'mk', iconSize: [46, 64], iconAnchor: [23, 60],
        html: `<div class="mk-spring ${e.invaded ? 'invaded' : e.ready ? '' : 'used'}">${Art.asImg(Art.springIcon(!e.ready, e.invaded), `spring:${!e.ready}:${!!e.invaded}`, 'mk-spring')}</div>` });
    }
    if (e.type === 'shrine') {
      return L.divIcon({ className: 'mk', iconSize: [54, 76], iconAnchor: [27, 72],
        html: `<div class="mk-shrine ${e.won ? 'won' : ''} ${e.clan ? 'held' : ''}"${e.clan ? ` style="--cc:${CLANS[e.clan].color}"` : ''}>${e.clan ? '<div class="mk-flag"></div>' : ''}${Art.asImg(Art.shrineIcon(e.tier, e.won), `shrine:${e.tier}:${!!e.won}`)}<div class="mk-tier">${'★'.repeat(e.tier)}</div></div>` });
    }
    return L.divIcon({ className: 'mk', iconSize: [84, 96], iconAnchor: [42, 86],
      html: `<div class="mk-rift t${e.tier} ${e.done ? 'done' : ''}">${Art.asImg(Art.riftIcon(e.tier), `rift:${e.tier}`)}<div class="mk-boss">${Art.img(e.boss)}</div><div class="mk-tier">${'★'.repeat(e.tier)}</div></div>` });
  },
  refresh(rebuild) {
    if (!this.map) return;
    if (rebuild) { for (const m of this.markers.values()) m.remove(); this.markers.clear(); }
    const { lat, lng } = this.pos;
    const ents = [...W.riftsAround(lat, lng), ...W.shrinesAround(lat, lng), ...W.springsAround(lat, lng), ...W.spawnsAround(lat, lng)];
    const seen = new Set();
    ents.forEach(e => {
      seen.add(e.id);
      const key = e.type === 'spring' ? `${e.ready}${e.invaded}` : e.type === 'rift' ? e.done : e.type === 'shrine' ? `${e.won}${e.clan}` : 0;
      let m = this.markers.get(e.id);
      if (m && m._key !== key) { m.remove(); m = null; }
      if (!m) {
        m = L.marker([e.lat, e.lng], { icon: this.icon(e), zIndexOffset: e.type === 'spirit' ? 500 : 0 }).addTo(this.map);
        m.on('click', () => this.tap(m._ent));
        m._key = key;
        this.markers.set(e.id, m);
      }
      m._ent = e;
      const el = m.getElement();
      if (el) el.classList.toggle('far', e.d > (e.type === 'rift' || e.type === 'shrine' ? 100 : W.INTERACT));
    });
    for (const [id, m] of this.markers) if (!seen.has(id)) { m.remove(); this.markers.delete(id); }
    this.syncZones(ents);
    this.nearby = ents.filter(e => e.type === 'spirit').sort((a, b) => a.d - b.d);
    UI.updateNearby(this.nearby);
    if (this.tracking) this.updateTracker();
  },
  tap(e) {
    if (!e || UI.blocking()) return;
    Sfx.init(); Sfx.play('tap');
    const d = U.dist(this.pos.lat, this.pos.lng, e.lat, e.lng);
    const range = e.type === 'rift' || e.type === 'shrine' ? 100 : W.INTERACT;
    if (d > range && e.type === 'rift' && d <= Rules.FAR.R) { Raid.open(e); return; } // дальний бой по пропуску
    if (d > range) {
      const what = e.type === 'spirit' ? SP[e.sid].name : e.type === 'spring' || e.type === 'shrine' ? e.name : 'Разлом';
      UI.toast(`${U.esc(what)}: ${U.fmtDist(d)}. Подойди ближе — нужно ${range} м`);
      return;
    }
    if (this.tracking && this.tracking.id === e.id) this.untrack();
    if (e.type === 'spirit') {
      if (Date.now() > e.expires) { UI.toast('Дух уже растворился в воздухе…'); this.refresh(); return; }
      Encounter.start({ mode: 'wild', sid: e.sid, lvl: e.lvl, seed: e.id, spawnId: e.id, shiny: e.shiny, boost: e.boost, tut: e.tut });
    } else if (e.type === 'spring') e.invaded ? Duel.openInvasion(e) : UI.spring(e);
    else if (e.type === 'shrine') {
      if (S.d.level < 3) { UI.toast('Капища открываются с 3 уровня Ловчего'); return; }
      Duel.open(e);
    } else Raid.open(e);
  },
  /* ---------------- 4.10: СЛЕД ЛОВЧЕГО, ЗЕМЛИ ДРУЖИН, МАРЕВО РАЗЛОМОВ ---------------- */
  // радиус в пикселях: meters метров вокруг ll на масштабе z
  pxR(ll, meters, z) {
    return Math.abs(this.map.project(ll, z).y - this.map.project(L.latLng(ll.lat + meters / 111320, ll.lng), z).y);
  },
  // след Ловчего — тающая золотая нить пройденного пути (последние ~400 м): старые участки бледнее
  trail: [],
  drawTrail(lat, lng) {
    const t = this.trail, last = t[t.length - 1];
    if (last && U.dist(last[0], last[1], lat, lng) < 4) return;
    if (last && U.dist(last[0], last[1], lat, lng) > 300) t.length = 0; // прыжок (демо, перезаход) — нить заново
    t.push([lat, lng]);
    for (let i = t.length - 1, len = 0; i > 0; i--) {
      len += U.dist(t[i][0], t[i][1], t[i - 1][0], t[i - 1][1]);
      if (len > 400) { t.splice(0, i - 1); break; }
    }
    const N = 5, OP = [.14, .3, .5, .75, 1];
    if (!this._trail) {
      this._trail = OP.map(() => [
        L.polyline([], { className: 'trail-glow', color: '#fbbf24', weight: 9, opacity: 0, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(this.map),
        L.polyline([], { className: 'trail-core', color: '#fff1bf', weight: 2.6, opacity: 0, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(this.map),
      ]);
    }
    const per = Math.max(1, Math.ceil((t.length - 1) / N));
    this._trail.forEach(([glow, core], i) => {
      const part = t.slice(i * per, (i + 1) * per + 1);
      glow.setLatLngs(part); core.setLatLngs(part);
      glow.setStyle({ opacity: OP[i] * .22 }); core.setStyle({ opacity: OP[i] * .9 });
    });
  },
  // земли дружин (сияние цвета дружины вокруг Капища) и марево Нави вокруг открытых разломов
  zones: new Map(),
  syncZones(ents) {
    const want = new Map();
    ents.forEach(e => {
      if (e.type === 'shrine' && e.clan && CLANS[e.clan]) want.set('z:' + e.id, { e, r: 100, cls: 'clan', css: `--cc:${CLANS[e.clan].color}`, inner: '<i class="zn-glow"></i><i class="zn-ring"></i><i class="zn-ring2"></i>' });
      if (e.type === 'rift' && !e.done) want.set('z:' + e.id, { e, r: 90, cls: 'rift', css: '', inner: '<i class="zn-haze"></i><i class="zn-cracks"></i>' });
    });
    for (const [id, z] of this.zones) if (!want.has(id) || want.get(id).css !== z.css) { z.m.remove(); this.zones.delete(id); }
    for (const [id, w] of want) {
      if (this.zones.has(id)) continue;
      const m = L.marker([w.e.lat, w.e.lng], { interactive: false, keyboard: false, zIndexOffset: -4000, flat: true,
        icon: L.divIcon({ className: 'mk-zone', iconSize: [0, 0], iconAnchor: [0, 0], html: `<div class="zn ${w.cls}" style="${w.css}">${w.inner}</div>` }) }).addTo(this.map);
      this.zones.set(id, { m, r: w.r, css: w.css });
      this.fitZone(m, w.r);
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
    this.tracking = { id: e.id, type: e.type, lat: e.lat, lng: e.lng, sid: e.sid, name: e.type === 'spirit' ? SP[e.sid].name : e.name || 'Цель' };
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
      UI.toast(`${t.name} растворился — след потерян`);
      this.tracking = null; box.classList.add('hidden'); return;
    }
    this._trackedOnce = true;
    const { lat, lng } = this.pos;
    const d = U.dist(lat, lng, t.lat, t.lng);
    const brg = Math.atan2((t.lng - lng) * Math.cos(lat * Math.PI / 180), t.lat - lat) * 180 / Math.PI;
    const near = d <= (t.type === 'rift' || t.type === 'shrine' ? 100 : W.INTERACT);
    box.classList.remove('hidden');
    box.classList.toggle('near', near);
    const ico = t.type === 'spirit' ? Art.img(t.sid) : t.type === 'spring' ? Art.springIcon(false) : Art.shrineIcon(1, false);
    if (box._id !== t.id) { box._id = t.id; box.querySelector('.tr-ico').innerHTML = ico; }
    box.querySelector('.tr-arrow svg').style.transform = `rotate(${brg + this.rot}deg)`; // 4.7: вращается только стрелка; с учётом поворота карты
    box.querySelector('.tr-name').textContent = t.name;
    box.querySelector('.tr-dist').textContent = near ? 'Ты на месте — коснись цели!' : U.fmtDist(d);
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
