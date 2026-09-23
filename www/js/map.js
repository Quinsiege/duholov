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

    this.range = L.circle([this.pos.lat, this.pos.lng], { radius: W.INTERACT, className: 'range-circle', interactive: false }).addTo(this.map);
    this.player = L.marker([this.pos.lat, this.pos.lng], {
      interactive: false, zIndexOffset: 1000,
      icon: L.divIcon({ className: 'mk-player-wrap', iconSize: [64, 64], iconAnchor: [32, 32],
        html: '<div class="mk-player"><div class="pulse"></div><div class="arrow"></div><div class="dot"></div><div class="mk-buddy"></div></div>' }),
    }).addTo(this.map);
    this.updateBuddy();
    Bus.on('buddyChanged', () => this.updateBuddy());
    Bus.on('weather', () => { this.setWeatherFx(); this.refresh(true); });

    this.map.on('dragstart', () => { this.follow = false; U.$('#recenterBtn').classList.add('show'); });
    U.$('#recenterBtn').onclick = () => this.recenter();

    this.initJoystick();
    window.addEventListener('keydown', e => { this.keys[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });

    if (Cfg.s.demo && DEV) this.startDemo(); else this.startGPS();
    this.refresh();
    // в режиме экономии батареи карта обновляется вдвое реже
    document.body.classList.toggle('eco', !!Cfg.s.eco);
    let tickN = 0;
    setInterval(() => { if (!Cfg.s.eco || ++tickN % 2 === 0) this.refresh(); }, 1500);
    let last = performance.now();
    const loop = t => { this.tick(Math.min(0.1, (t - last) / 1000)); last = t; requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  },

  setTiles() {
    const theme = Cfg.s.mapTheme || 'auto';
    const night = theme === 'auto' ? U.isNight() : theme === 'dark';
    if (night === this.night) return;
    this.night = night;
    // Стандартные тайлы OSM; ночной вид делается CSS-фильтром (см. style.css)
    if (!this.tiles) {
      this.tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(this.map);
    }
    document.body.classList.toggle('night', night);
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

  moveTo(lat, lng, jump) {
    this.pos = { lat, lng };
    const ll = [lat, lng];
    this.player.setLatLng(ll);
    this.range.setLatLng(ll);
    if (this.follow) {
      if (jump) this.map.setView(ll, 17.5, { animate: false });
      else this.map.panTo(ll, { animate: false });
    }
    const el = this.player.getElement();
    if (el) el.querySelector('.arrow').style.transform = `rotate(${this.heading}deg)`;
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

  /* ---------------- ДЕМО-РЕЖИМ ---------------- */
  startDemo() {
    this.stopGPS();
    this.demo = true;
    U.$('#joystick').classList.remove('hidden');
    UI.setGps('demo');
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
        html: `<div class="mk-spring ${e.invaded ? 'invaded' : e.ready ? '' : 'used'}">${Art.springIcon(!e.ready, e.invaded)}</div>` });
    }
    if (e.type === 'shrine') {
      return L.divIcon({ className: 'mk', iconSize: [54, 76], iconAnchor: [27, 72],
        html: `<div class="mk-shrine ${e.won ? 'won' : ''}">${Art.shrineIcon(e.tier, e.won)}<div class="mk-tier">${'★'.repeat(e.tier)}</div></div>` });
    }
    return L.divIcon({ className: 'mk', iconSize: [84, 96], iconAnchor: [42, 86],
      html: `<div class="mk-rift t${e.tier} ${e.done ? 'done' : ''}">${Art.riftIcon(e.tier)}<div class="mk-boss">${Art.img(e.boss)}</div><div class="mk-tier">${'★'.repeat(e.tier)}</div></div>` });
  },
  refresh(rebuild) {
    if (!this.map) return;
    if (rebuild) { for (const m of this.markers.values()) m.remove(); this.markers.clear(); }
    const { lat, lng } = this.pos;
    const ents = [...W.riftsAround(lat, lng), ...W.shrinesAround(lat, lng), ...W.springsAround(lat, lng), ...W.spawnsAround(lat, lng)];
    const seen = new Set();
    ents.forEach(e => {
      seen.add(e.id);
      const key = e.type === 'spring' ? `${e.ready}${e.invaded}` : e.type === 'rift' ? e.done : e.type === 'shrine' ? e.won : 0;
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
    this.nearby = ents.filter(e => e.type === 'spirit').sort((a, b) => a.d - b.d);
    UI.updateNearby(this.nearby);
    if (this.tracking) this.updateTracker();
  },
  tap(e) {
    if (!e || UI.blocking()) return;
    Sfx.init(); Sfx.play('tap');
    const d = U.dist(this.pos.lat, this.pos.lng, e.lat, e.lng);
    const range = e.type === 'rift' || e.type === 'shrine' ? 100 : W.INTERACT;
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
    box.querySelector('.tr-arrow').style.transform = `rotate(${brg}deg)`;
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
