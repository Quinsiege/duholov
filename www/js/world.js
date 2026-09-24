'use strict';
/* Мир: духи появляются детерминированно по реальным координатам (одна точка в одно время — одно и то же),
   а Родники, Капища и Разломы стоят у настоящих объектов (pois.js).
   Этот же код работает на сервере игры: он пересчитывает, был ли дух, родник или разлом там, где его нашёл игрок. */

const W = {
  SPAWN_CELL: 0.00055,   // ≈ 60 м
  BIOME_CELL: 0.006,     // ≈ 650 м — «район» с любимой стихией
  SLOT: 15 * 60 * 1000,  // дух живёт на карте 15 минут
  get SPRING_COOLDOWN() { return Ev.springCooldown(); },
  INTERACT: 70,          // радиус взаимодействия, м
  BATTLE_R: 100,         // радиус для капищ и разломов, м
  VIEW: 320,             // радиус видимости, м

  // Перебор клеток сетки в радиусе. Шаг по долготе подгоняется под широту, чтобы клетки были «квадратными».
  cells(lat, lng, size, radius, fn) {
    const dLat = radius / 111320;
    const i0 = Math.floor((lat - dLat) / size), i1 = Math.floor((lat + dLat) / size);
    for (let i = i0; i <= i1; i++) {
      const rowLat = (i + 0.5) * size;
      const lngSize = size / Math.max(0.2, Math.cos(rowLat * Math.PI / 180));
      const dLng = radius / (111320 * Math.max(0.2, Math.cos(lat * Math.PI / 180)));
      const j0 = Math.floor((lng - dLng) / lngSize), j1 = Math.floor((lng + dLng) / lngSize);
      for (let j = j0; j <= j1; j++) fn(i, j, i * size, j * lngSize, size, lngSize);
    }
  },

  biome(lat, lng) {
    const i = Math.floor(lat / this.BIOME_CELL), j = Math.floor(lng / this.BIOME_CELL);
    return ELEMENT_KEYS[Math.floor(U.h('biome', i, j) * ELEMENT_KEYS.length)];
  },
  timeBonus(el, t) {
    const h = U.hour(t);
    if (h >= 21 || h < 5) return el === 'shadow' || el === 'wind' ? 2 : 1;
    if (h >= 17) return el === 'current' || el === 'fire' ? 2 : 1;
    if (h < 10) return el === 'water' || el === 'forest' ? 2 : 1;
    return el === 'fire' || el === 'forest' ? 1.6 : 1;
  },

  region(lng) { return lng < 40 ? 'west' : lng < 90 ? 'center' : 'east'; },
  // Край России (для духов родных земель) — грубо, по широте и долготе
  land(lat, lng) {
    if (lat >= 64) return 'north';
    if (lng >= 105) return 'fareast';
    if (lng >= 66) return 'siberia';
    if (lng >= 55) return 'ural';
    if (lat < 46.5 && lng >= 36) return 'caucasus';
    if (lng >= 44) return 'volga';
    return 'center';
  },
  // региональные духи водятся только в своей части света, духи земель — только в своём краю
  local(s, lng = MapView.pos ? MapView.pos.lng : 37, lat = MapView.pos ? MapView.pos.lat : 55.75) {
    return (!s.region || s.region === this.region(lng)) && (!s.land || s.land === this.land(lat, lng));
  },

  pickSpecies(r, biome, night, lng, lat) {
    const fullMoon = night && Sky.moonEvent() === 'full';
    const el = U.weighted(ELEMENT_KEYS.map(e => {
      let w = (e === biome ? 3 : 1) * this.timeBonus(e);
      if (Sky.boosted(e)) w *= 1.7;
      w *= Ev.elMul(e);
      if (fullMoon && (e === 'shadow' || e === 'water')) w *= 1.5;
      return [e, w];
    }), r());
    const RW = { 1: 60, 2: 24, 3: 8, 4: 2 };
    const h = U.hour();
    const pool = SPECIES.filter(s => s.el === el && !s.legend && this.local(s, lng, lat)).map(s => {
      let w = RW[s.rar] || 0;
      if (s.stage === 3) w *= 0.3;
      if (s.time === 'night') w *= night ? (fullMoon ? 4 : 1.5) : 0.35;
      if (s.time === 'day') w *= night ? 0.05 : h >= 11 && h < 15 ? 3 : 0.8;
      w *= Ev.seasonal(s);
      return [s.id, w];
    });
    return U.weighted(pool, r());
  },

  spawnsAround(lat, lng, radius = this.VIEW) {
    const now = U.now(), out = [];
    const P = S.incenseActive() ? 0.3 : 0.14;
    const night = U.isNight();
    this.cells(lat, lng, this.SPAWN_CELL, radius, (i, j, la, ln, sz, lsz) => {
      const phase = U.h('ph', i, j) * this.SLOT;
      const slot = Math.floor((now + phase) / this.SLOT);
      if (U.h('sp', i, j, slot) > P) return;
      const id = `s:${i}:${j}:${slot}`;
      if (S.d.caught[id]) return;
      const r = U.rng(id);
      const pLat = la + (0.15 + r() * 0.7) * sz, pLng = ln + (0.15 + r() * 0.7) * lsz;
      const d = U.dist(lat, lng, pLat, pLng);
      if (d > radius) return;
      const sid = this.pickSpecies(r, this.biome(pLat, pLng), night, pLng, pLat);
      const boost = Sky.boosted(SP[sid].el);
      const maxL = Math.min(Math.min(30, S.d.level + 2) + (boost ? 5 : 0), S.maxLvl()); // погода: сильнее, но не выше доступного уровня
      const lvl = Math.max(boost ? 6 : 1, Math.min(maxL, Math.round(1 + r() * maxL)));
      const shiny = U.h('shiny', id) < Sky.shinyRate();
      out.push({ type: 'spirit', id, sid, lvl, boost, shiny, lat: pLat, lng: pLng, d, expires: (slot + 1) * this.SLOT - phase });
    });
    const tut = Tut.spawn(lat, lng);
    if (tut) out.push(tut);
    return out;
  },

  /* ---------- Родники: у реальных объектов (см. pois.js) ---------- */
  // p — объект карты { id, lat, lng, name, photo }; d — расстояние до игрока
  springFor(p, d) {
    const slot = Math.floor(U.now() / 7200000), id = p.id, last = S.d.springs[id] || 0;
    // вторжение Нави: ~12% родников захвачены на двухчасовое окно (с 4 уровня)
    const invId = `${id}:${slot}`;
    const invaded = S.d.level >= 4 && U.h('inv', id, slot) < 0.12 && !S.d.freed[invId];
    return { type: 'spring', id, invId, invaded, lat: p.lat, lng: p.lng, d, name: p.name, photo: p.photo,
      ready: U.now() - last > this.SPRING_COOLDOWN, readyAt: last + this.SPRING_COOLDOWN };
  },
  springsAround(lat, lng, radius = this.VIEW + 150) {
    return Poi.near(lat, lng, radius, 'spring').map(p => this.springFor(p, p.d));
  },

  /* ---------- Разломы: каждый час открываются у части Капищ ---------- */
  riftAt(id, hour) { return U.h('rr', id, hour) < 0.35; },
  // Разлом у капища p в этот час (или null)
  riftFor(p, d, hour = Math.floor(U.now() / 3600000)) {
    if (!this.riftAt(p.id, hour)) return null;
    const id = `${p.id}:${hour}`;
    const r = U.rng(id);
    const tier = U.weighted(Ev.cur.rifts ? [[1, 40], [2, 30], [3, 30]] : [[1, 60], [2, 30], [3, 10]], r());
    let pool;
    if (tier === 3) pool = SPECIES.filter(s => s.legend && !s.story && (!Ev.hol || !Ev.hol.koschey || s.id === 'koschey')); // легенды Летописи — только в награду
    else if (tier === 2) pool = SPECIES.filter(s => !s.legend && s.rar >= 3 && this.local(s, p.lng, p.lat) && Ev.seasonal(s) > 0);
    else pool = SPECIES.filter(s => s.rar === 2);
    // в неделю стихии разломы чаще охраняют духи этой стихии
    const evPool = pool.filter(s => s.el === Ev.cur.el);
    if (evPool.length && r() < 0.6) pool = evPool;
    const boss = pool[Math.floor(r() * pool.length)].id;
    return { type: 'rift', id, poi: p.id, lat: p.lat, lng: p.lng, d, tier, boss, place: p.name, done: !!S.d.rifts[id], endsAt: (hour + 1) * 3600000 };
  },
  riftsAround(lat, lng, radius = this.VIEW + 500) {
    return Poi.near(lat, lng, radius, 'shrine').map(p => this.riftFor(p, p.d)).filter(Boolean);
  },

  springLoot(id) {
    const r = U.rng(id + Math.random());
    const lvl = S.d.level, loot = {};
    const n = (4 + Math.floor(r() * 3)) * Ev.lootMul();
    for (let k = 0; k < n; k++) {
      const opts = [['charm', 12], ['honey', Ev.hol && Ev.hol.honey ? 8 : 2.5], ['water', 1.5]];
      if (lvl >= 8) opts.push(['charm2', 3]);
      if (lvl >= 16) opts.push(['charm3', 1.5]);
      if (lvl >= 3) opts.push(['incense', 0.25]);
      const it = U.weighted(opts, r());
      loot[it] = (loot[it] || 0) + 1;
    }
    // подарок для друга — примерно в каждом втором роднике, пока их меньше GIFT_LIMIT
    if ((S.d.items.gift || 0) < GIFT_LIMIT && r() < 0.5) loot.gift = 1;
    let cocoon = null;
    if (S.d.cocoons.length < 9 && r() < 0.12 * Ev.kmMul()) cocoon = U.weighted([[2, 5], [5, 4], [10, 1]], r());
    return { loot, cocoon };
  },

  /* ---------- Капища ---------- */
  shrineFor(p, d) {
    const id = p.id;
    const tier = U.weighted([[1, 50], [2, 35], [3, 15]], U.h('kt', id));
    const god = SHRINE_GODS[Math.floor(U.h('kn', id) * SHRINE_GODS.length)];
    const hold = typeof Clans !== 'undefined' ? Clans.info(id) : null; // на сервере сводки нет — он спрашивает базу сам
    return { type: 'shrine', id, tier, name: p.name, god, photo: p.photo, lat: p.lat, lng: p.lng, d, won: S.d.shrines[id] === U.today(), clan: hold ? hold.clan : null };
  },
  // Капище у реального объекта; пока в нём открыт Разлом, поединок недоступен
  shrinesAround(lat, lng, radius = this.VIEW + 400) {
    const hour = Math.floor(U.now() / 3600000);
    return Poi.near(lat, lng, radius, 'shrine').filter(p => !this.riftAt(p.id, hour)).map(p => this.shrineFor(p, p.d));
  },
  // Прислужник Нави на захваченном роднике: трое омрачённых духов одной стихии
  grunt(e) {
    const r = U.rng('grunt' + e.invId);
    const el = ELEMENT_KEYS[Math.floor(r() * ELEMENT_KEYS.length)];
    const pool = SPECIES.filter(s => s.el === el && !s.legend && !s.region && !s.land && !s.season && s.rar <= 3);
    const top = [...S.d.spirits].sort((a, b) => S.power(b) - S.power(a)).slice(0, 3);
    const avg = top.length ? top.reduce((a, x) => a + x.lvl, 0) / top.length : S.d.level;
    const lvl = U.clamp(Math.round(Math.min(avg, S.d.level + 2)) - 1, 3, 40);
    const team = [];
    for (let k = 0; k < 3; k++) {
      const s = pool[Math.floor(r() * pool.length)];
      const sp = S.makeSpirit(s.id, lvl, e.invId + k, { ivMin: 3 });
      sp.dark = true;
      team.push(sp);
    }
    return { name: 'Прислужник Нави', color: '#3b0764', title: `Отряд стихии «${ELEMENTS[el].name}»`, team, el, quote: GRUNT_QUOTES[Math.floor(r() * GRUNT_QUOTES.length)] };
  },

  // Хранитель меняется каждый день; уровень его духов подстраивается под уровень игрока
  guardian(e) {
    const r = U.rng(e.id + U.today());
    const T = SHRINE_TIERS[e.tier];
    const name = GUARDIANS[Math.floor(r() * GUARDIANS.length)];
    const color = GUARD_COLORS[Math.floor(r() * GUARD_COLORS.length)];
    // Ученик — только первые стадии, Мастер — до второй, Старейшина — любые, включая редких
    const rars = e.tier === 1 ? [1, 2] : e.tier === 2 ? [1, 2, 3] : [2, 3, 4];
    const maxStage = e.tier === 1 ? 1 : e.tier === 2 ? 2 : 3;
    const pool = SPECIES.filter(s => !s.legend && !s.region && !s.land && !s.season && rars.includes(s.rar) && s.stage <= maxStage);
    // ориентир — средний уровень трёх сильнейших духов игрока (но не выше уровня Ловчего +2)
    const top = [...S.d.spirits].sort((a, b) => S.power(b) - S.power(a)).slice(0, 3);
    const avg = top.length ? top.reduce((a, x) => a + x.lvl, 0) / top.length : S.d.level;
    const lvl = U.clamp(Math.round(Math.min(avg, S.d.level + 2)) + T.lvl, 3, 40);
    const team = [];
    while (team.length < 3) {
      const s = pool[Math.floor(r() * pool.length)];
      if (team.some(x => x.sid === s.id)) continue;
      const sp = S.makeSpirit(s.id, U.clamp(lvl + Math.floor(r() * 3) - 1, 3, 40), e.id + U.today() + team.length, { ivMin: e.tier * 4 });
      team.push(sp);
    }
    return { name, color, title: T.title, team };
  },

  // Уборка устаревших отметок (выполняется на сервере)
  prune() {
    const now = U.now(), hour = Math.floor(now / 3600000);
    for (const k in S.d.caught) if (now - S.d.caught[k] > 2 * this.SLOT) delete S.d.caught[k];
    for (const k in S.d.springs) if (now - S.d.springs[k] > this.SPRING_COOLDOWN * 2) delete S.d.springs[k];
    for (const k in S.d.rifts) if (+k.split(':').pop() < hour - 1) delete S.d.rifts[k];
    const day = U.today();
    for (const k in S.d.shrines) if (S.d.shrines[k] !== day) delete S.d.shrines[k];
    const slot = Math.floor(now / 7200000);
    for (const k in S.d.freed) if (+k.split(':').pop() < slot - 1) delete S.d.freed[k];
  },
};
