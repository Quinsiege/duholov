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
  /* 4.28: мифология места — чьи духи здесь водятся (грубые прямоугольники по широте и долготе, порядок проверок важен).
     'world' — Африка южнее Сахары, Индия, Океания: там встречаются духи всех мифологий */
  myth(lat, lng) {
    if (lng < -30) return 'aztec';                                                     // обе Америки
    if (lat >= 18 && lat < 48 && lng >= 97 && lng < 146
      && !(lng >= 130.5 && lng < 134 && lat >= 42.3) && !(lng >= 141 && lat >= 45.5)) return 'china'; // кроме Приморья и Сахалина
    if (lat >= 54.3 && lat < 55.3 && lng >= 19.6 && lng < 22.9) return 'slavic';        // Калининград
    if (lat >= 54 && lng >= -25 && lng < 28) return 'norse';                           // Скандинавия, Исландия, Дания, Прибалтика
    if (lat >= 47 && lat < 54 && lng >= 5 && lng < 14) return 'norse';                 // германский север: Германия
    if (lat >= 48 && lat < 61 && lng >= -11 && lng < 5) return 'celtic';               // Ирландия, Британия, север Франции, Бенилюкс
    if (lat >= 44.5 && lat < 48 && lng >= -5 && lng < 8) return 'celtic';              // Галлия
    if (lat >= 12 && lat < 37.5 && lng >= -18 && lng < 63) return 'egypt';             // Северная Африка, Аравия, Ближний Восток
    if (lat >= 34 && lat < 47 && lng >= -10 && lng < 45 && !(lng >= 19 && lat >= 42.3)) return 'greek'; // Средиземноморье, Турция
    if (lat >= 35 && lng >= 14) return 'slavic';                                        // Россия, Восточная Европа, Средняя Азия
    return 'world';
  },
  // дух своей мифологии в этом месте (или место «всего мира»)
  home(s, lat, lng) { const m = this.myth(lat, lng); return m === 'world' || s.myth === m; },
  // региональные духи водятся только в своей части света, духи земель — только в своём краю; 4.28 — и только в краях своей мифологии
  local(s, lng = MapView.pos ? MapView.pos.lng : 37, lat = MapView.pos ? MapView.pos.lat : 55.75) {
    return (!s.region || s.region === this.region(lng)) && (!s.land || s.land === this.land(lat, lng)) && this.home(s, lat, lng);
  },
  // 4.28: отбор по месту, если оно известно (хранители, прислужники, поручения)
  here(list, lat, lng) { if (lat == null || lng == null) return list; const h = list.filter(s => this.home(s, lat, lng)); return h.length ? h : list; },

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
      // 4.15: дух на карте — не выше уровня Ловчего; погода делает его сильнее (ближе к потолку), но не выше
      const maxL = Math.min(30 + (boost ? 5 : 0), S.catchLvl());
      const lvl = Math.max(boost ? Math.min(6, maxL) : 1, Math.min(maxL, Math.round(1 + r() * maxL)));
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
    // вторжение Нави: ~12% родников захвачены на двухчасовое окно (с INVASION_LEVEL уровня)
    const invId = `${id}:${slot}`;
    const invaded = S.d.level >= INVASION_LEVEL &&U.h('inv', id, slot) < 0.12 && !S.d.freed[invId];
    return { type: 'spring', id, invId, invaded, lat: p.lat, lng: p.lng, d, name: p.name, photo: p.photo, cat: p.cat,
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
    if (tier === 3) pool = this.here(SPECIES.filter(s => s.legend && (!Ev.hol || !Ev.hol.koschey || s.id === 'koschey')), p.lat, p.lng); // 4.28: легенды своей мифологии
    else if (tier === 2) pool = SPECIES.filter(s => !s.legend && s.rar >= 3 && this.local(s, p.lng, p.lat) && Ev.seasonal(s) > 0);
    else pool = this.here(SPECIES.filter(s => s.rar === 2), p.lat, p.lng);
    // в неделю стихии разломы чаще охраняют духи этой стихии
    const evPool = pool.filter(s => s.el === Ev.cur.el);
    if (evPool.length && r() < 0.6) pool = evPool;
    const boss = pool[Math.floor(r() * pool.length)].id;
    return { type: 'rift', id, poi: p.id, lat: p.lat, lng: p.lng, d, tier, boss, place: p.name, done: !!S.d.rifts[id], endsAt: (hour + 1) * 3600000 };
  },
  riftsAround(lat, lng, radius = this.VIEW + 500) {
    return Poi.near(lat, lng, radius, 'shrine').map(p => this.riftFor(p, p.d)).filter(Boolean);
  },

  // 4.19: что и с каким весом кладёт родник (на каждый из 4–6 бросков) — общее для добычи и вкладки «Добыча»
  SPRING_GIFT: 0.6, SPRING_COCOON: 0.12,
  springOpts(lvl) {
    // 4.15: лечебное; 4.16: мёда, Живой воды и ладана меньше (к 40 уровню копились сотнями и десятками),
    // Мёртвая вода — ~1 родник из 500 (раньше из 300, но при полной сумке родник не давал ничего)
    const opts = [['charm', 12], ['honey', Ev.hol && Ev.hol.honey ? 8 : 1], ['water', 0.6], ['herb', 2], ['brew', 0.8], ['deadwater', 0.009]];
    if (lvl >= 8) opts.push(['charm2', 3]);
    if (lvl >= 16) opts.push(['charm3', 1.5]);
    if (lvl >= 3) opts.push(['incense', 0.08]);
    return opts;
  },
  springLoot(id) {
    const r = U.rng(id + Math.random());
    const lvl = S.d.level, loot = {};
    const n = (4 + Math.floor(r() * 3)) * Ev.lootMul();
    const opts = this.springOpts(lvl);
    for (let k = 0; k < n; k++) {
      const it = U.weighted(opts, r());
      loot[it] = (loot[it] || 0) + 1;
    }
    // подарок для друга — в трёх родниках из пяти (4.16: было в каждом втором), пока их меньше GIFT_LIMIT
    if ((S.d.items.gift || 0) < GIFT_LIMIT && r() < this.SPRING_GIFT) loot.gift = 1;
    let cocoon = null;
    if (S.d.cocoons.length < 9 && r() < this.SPRING_COCOON * Ev.kmMul()) cocoon = U.weighted([[2, 5], [5, 4], [10, 1]], r());
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
  /* 4.16: соперники в Капищах и вторжениях подстраиваются под СИЛУ духов игрока, а не только под его уровень:
     раньше уровень хранителя равнялся уровню духов игрока, но виды у хранителя слабее — и сильный Ловчий не проигрывал.
     Ориентир — треть суммы сил трёх сильнейших духов игрока, которые могут биться (не выбранной команды: слабой командой
     соперника не ослабить; у новичка с одним-двумя духами пустые места считаются нулём — и хранитель ему по силам).
     Сильнейшие без сил — соперник слабеет вместе с командой, но не ниже 3/4 от силы по всем духам: падение всё же стоит сил */
  topPower() {
    const top3 = list => list.map(x => S.power(x)).sort((a, b) => b - a).slice(0, 3).reduce((a, x) => a + x, 0) / 3;
    return Math.max(10, top3(S.d.spirits.filter(x => S.alive(x))), top3(S.d.spirits) * 0.75);
  },
  // Уровень, на котором дух (его вид и качество) наберёт силу pw (обратная к S.stats формула)
  lvlFor(sp, pw) {
    const b = SP[sp.sid].base, A = b[0] + sp.iv[0], D = b[1] + sp.iv[1], St = b[2] + sp.iv[2];
    const c = Math.sqrt(Math.max(10, pw) * 10 / (A * Math.sqrt(D * St))), x = Math.max(0, (c - 0.094) / (0.7903 - 0.094));
    return Math.round(1 + 39 * x * x);
  },
  // Дух соперника силой около pw: вид и качество — из зерна, уровень — под силу; слабому виду не хватает 40 уровней — он
  // превращается, а если и так не дотянуть — выходит дух посильнее из strong (самый слабый из тех, кому хватает)
  foeSpirit(sid, pw, seed, ivMin, strong) {
    const sp = S.makeSpirit(sid, 1, seed, { ivMin });
    for (;;) {
      const lvl = this.lvlFor(sp, pw);
      if (lvl <= 40 || !SP[sp.sid].evo) { sp.lvl = U.clamp(lvl, 1, 40); break; }
      sp.sid = SP[sp.sid].evo;
    }
    if (strong && strong.length && S.power(sp) < pw * 0.9) {
      const alt = strong.map(s => ({ sid: s.id, p: S.power({ sid: s.id, lvl: 40, iv: sp.iv }) })).sort((a, b) => a.p - b.p);
      sp.sid = (alt.find(x => x.p >= pw) || alt[alt.length - 1]).sid;
      sp.lvl = U.clamp(this.lvlFor(sp, pw), 1, 40);
    }
    return sp;
  },
  // Не хватило силы (самые сильные виды и на 40 уровне слабее цели) — соперник бьёт чаще: темп × (сила / цель)³, но не больше чем вдвое
  foeSpeed(speed, team, pw) {
    const got = team.reduce((a, x) => a + S.power(x), 0) / (pw * team.length);
    return Math.round(speed * U.clamp(Math.pow(got / 0.95, 3), 0.5, 1) * 1000) / 1000; // разброс силы ±10% темп не меняет
  },

  // Прислужник Нави на захваченном роднике: трое омрачённых духов одной стихии (4.16: сила отряда — от силы духов игрока)
  grunt(e) {
    const r = U.rng('grunt' + e.invId);
    const el = ELEMENT_KEYS[Math.floor(r() * ELEMENT_KEYS.length)];
    const pool = this.here(SPECIES.filter(s => s.el === el && !s.legend && !s.region && !s.land && !s.season && s.rar <= 3), e.lat, e.lng);
    const strong = this.here(SPECIES.filter(s => s.el === el && !s.legend && !s.region && !s.land && !s.season && !s.evo), e.lat, e.lng);
    const pw = this.topPower() * Duel.FOE.invasion.pow;
    const team = [];
    for (let k = 0; k < 3; k++) {
      const s = pool[Math.floor(r() * pool.length)];
      const sp = this.foeSpirit(s.id, pw * (0.9 + r() * 0.2), e.invId + k, 3, strong);
      sp.dark = true;
      team.push(sp);
    }
    return { name: ru`Прислужник Нави`, color: '#3b0764', title: ru`Отряд стихии «${ELEMENTS[el].name}»`, team, el, quote: GRUNT_QUOTES[Math.floor(r() * GRUNT_QUOTES.length)],
      speed: this.foeSpeed(Duel.FOE.invasion.speed, team, pw) };
  },

  // Хранитель меняется каждый день; 4.16: сила его духов — доля SHRINE_TIERS.pow от силы духов игрока
  guardian(e) {
    const r = U.rng(e.id + U.today());
    const T = SHRINE_TIERS[e.tier];
    const name = GUARDIANS[Math.floor(r() * GUARDIANS.length)];
    const color = GUARD_COLORS[Math.floor(r() * GUARD_COLORS.length)];
    // Ученик — первые стадии, Мастер — до второй, Старейшина — любые, включая редких (слабый вид сильному Ловчему выходит уже превращённым)
    const rars = e.tier === 1 ? [1, 2] : e.tier === 2 ? [1, 2, 3] : [2, 3, 4];
    const maxStage = e.tier === 1 ? 1 : e.tier === 2 ? 2 : 3;
    const pool = this.here(SPECIES.filter(s => !s.legend && !s.region && !s.land && !s.season && rars.includes(s.rar) && s.stage <= maxStage), e.lat, e.lng);
    const pw = this.topPower() * T.pow;
    const team = [];
    while (team.length < 3) {
      const s = pool[Math.floor(r() * pool.length)];
      if (team.some(x => SP[x.sid].fam === s.fam)) continue;
      // сильному Ловчему — сильнейшие виды (у Старейшины — и эпические), без повторов семейств
      const strong = this.here(SPECIES.filter(x => !x.legend && !x.region && !x.land && !x.season && !x.evo && x.rar >= 2 && x.rar <= (e.tier === 3 ? 4 : 3) && !team.some(y => SP[y.sid].fam === x.fam)), e.lat, e.lng);
      team.push(this.foeSpirit(s.id, pw * (0.9 + r() * 0.2), e.id + U.today() + team.length, e.tier * 4, strong));
    }
    return { name, color, title: T.title, team, speed: this.foeSpeed(T.speed, team, pw) };
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
