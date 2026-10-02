'use strict';
/* Мир: духи появляются детерминированно по реальным координатам (одна точка в одно время — одно и то же),
   а Источники, Капища и Разломы стоят у настоящих объектов (pois.js).
   Этот же код работает на сервере игры: он пересчитывает, был ли дух, источник или разлом там, где его нашёл игрок. */

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
  // t и lng — когда и где (5.1.26: час — местный, по солнцу над этим местом)
  timeBonus(el, t, lng) {
    const h = U.hour(t, lng);
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
  /* 5.1.26: дух водится только у себя на родине (MYTH_HOME, data.js). Где родина у нескольких мифологий, они встречаются
     поровну (у славянской видов втрое больше): сначала выбирается мифология, потом вид */
  // Разлом и святилище у места — одной из открытых мифологий, поровну (постоянно, по id места).
  // 4.28: сезоны — каждая новая мифология забирает себе места поровну у прежних: место переходит к ней с вероятностью
  // 1 / (сколько мифологий стало), остальные места своей мифологии не меняют (закрытые мифологии мест не получают)
  placeMyth(p) {
    const base = Rules.ALATYR_WORLD.ORDER;
    let m = base[Math.floor(U.h('pm', p.id) * base.length)], n = base.length;
    for (const x of MYTH_KEYS) if (!base.includes(x)) { n++; if (U.h('pm', x, p.id) < 1 / n) m = x; }
    return m;
  },
  // из списка — виды одной мифологии, выбранной из тех, что в списке есть (x — случайное число 0…1): поровну, но с весом
  // Ev.mythMul — 4.28: мифология недели втрое чаще
  evenMyth(list, x) {
    const ms = MYTH_KEYS.filter(m => list.some(s => s.myth === m));
    if (ms.length < 2) return list;
    const w = ms.map(m => Ev.mythMul(m));
    let t = x * w.reduce((a, b) => a + b, 0), i = 0;
    for (; i < ms.length - 1; i++) { t -= w[i]; if (t < 0) break; }
    return list.filter(s => s.myth === ms[i]);
  },
  // из списка — виды мифологии m (если их нет — весь список)
  ofMyth(list, m) { const h = list.filter(s => s.myth === m); return h.length ? h : list; },
  // Разлом: босс приходит через трещину из своего мира — ему родина не нужна (4.28: духи родных земель и вещие птицы — везде)
  local() { return true; },

  /* 5.1.26: родина места — мифологии ближайшей точки MYTH_HOME из открытых сезоном (MYTH_KEYS). Считается для клетки «района»
     (BIOME_CELL ≈ 650 м) по её середине — одинаково на телефоне и на сервере; точки — единичные векторы, ближайшая — с наибольшим
     скалярным произведением. Где у ближайшей точки две мифологии (одни координаты в двух списках), водятся обе */
  HOME_N: 4000,
  homes(lat, lng) {
    const i = Math.floor(lat / this.BIOME_CELL), j = Math.floor(lng / this.BIOME_CELL), key = MYTH_KEYS.length + ':' + i + ':' + j;
    const C = this._homes || (this._homes = new Map());
    let h = C.get(key);
    if (h) return h;
    const r = Math.PI / 180, vec = (la, ln) => [Math.cos(la * r) * Math.cos(ln * r), Math.cos(la * r) * Math.sin(ln * r), Math.sin(la * r)];
    if (!this._pts) {
      this._pts = [];
      for (const [m, list] of Object.entries(MYTH_HOME)) for (const p of list.split(',')) {
        const [la, ln] = p.trim().split(/\s+/).map(Number);
        if (Number.isFinite(la) && Number.isFinite(ln)) this._pts.push({ m, v: vec(la, ln) });
      }
    }
    const v = vec((i + 0.5) * this.BIOME_CELL, (j + 0.5) * this.BIOME_CELL);
    let best = -2;
    h = [];
    for (const p of this._pts) {
      if (!MYTH_KEYS.includes(p.m)) continue;
      const d = p.v[0] * v[0] + p.v[1] * v[1] + p.v[2] * v[2];
      if (d > best + 1e-12) { best = d; h = [p.m]; } else if (d >= best - 1e-12 && !h.includes(p.m)) h.push(p.m);
    }
    if (!h.length) h = MYTH_KEYS.slice(); // точек нет (данных не завезли) — как раньше, все
    if (C.size >= this.HOME_N) C.clear();
    C.set(key, h);
    return h;
  },
  home(s, lat, lng) { return this.homes(lat, lng).includes(s.myth || 'slavic'); },
  // 5.1.26: своё время суток: ночные — только ночью, дневные — только днём (ночь — по солнцу там, где дух, U.isNight)
  timeOk(s, t, lat, lng) { return !s.time || (s.time === 'night') === U.isNight(t, lat, lng); },

  // Вид духа в точке lat, lng; t — начало его жизни на карте: день или ночь, час — в этот момент и в этом месте, так что
  // дух не меняется, пока живёт. 5.1.26: только здешние (родина) и только своего времени суток; некого — null
  pickSpecies(r, biome, t, lat, lng) {
    const night = U.isNight(t, lat, lng), h = U.hour(t, lng), fullMoon = night && Sky.moonEvent() === 'full', home = this.homes(lat, lng);
    const RW = { 1: 60, 2: 24, 3: 8, 4: 2 };
    const wOf = s => {
      if (s.time === 'night' ? !night : s.time === 'day' && night) return 0;
      let w = RW[s.rar] || 0;
      if (s.stage === 3) w *= 0.3;
      if (s.time === 'night') w *= fullMoon ? 4 : 1.5;
      if (s.time === 'day') w *= h >= 11 && h < 15 ? 3 : 0.8;
      return w * Ev.seasonal(s);
    };
    const all = SPECIES.filter(s => !s.legend && home.includes(s.myth) && wOf(s) > 0);
    if (!all.length) return null;
    const els = ELEMENT_KEYS.filter(e => all.some(s => s.el === e));
    const el = U.weighted(els.map(e => {
      let w = (e === biome ? 3 : 1) * this.timeBonus(e, t, lng);
      if (Sky.boosted(e)) w *= 1.7;
      w *= Ev.elMul(e);
      if (fullMoon && (e === 'shadow' || e === 'water')) w *= 1.5;
      return [e, w];
    }), r());
    const pool = this.evenMyth(all.filter(s => s.el === el), r()).map(s => [s.id, wOf(s)]); // мифологии родины — поровну
    return U.weighted(pool, r());
  },

  spawnsAround(lat, lng, radius = this.VIEW) {
    const now = U.now(), out = [];
    Ev.alaSync(now); // 4.28: духи — только открытых в этом сезоне мифологий
    const P = S.incenseActive() ? 0.3 : 0.14;
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
      // 5.1.26: каким будет дух, решают место и начало его жизни (t0); рассвело — ночной ушёл, стемнело — дневной спрятался
      const t0 = slot * this.SLOT - phase, sid = this.pickSpecies(r, this.biome(pLat, pLng), t0, pLat, pLng);
      if (!sid || !this.timeOk(SP[sid], now, pLat, pLng)) return;
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

  /* ---------- 5.2: места спят и просыпаются по неделям (Rules.PLACES) ---------- */
  /* Источник, Капище и Разлом у места есть, только пока место «не спит»: каждую неделю (Ev.week — с понедельника, как события
     недели) бодрствует доля SHARE мест, остальные пустые. У каждого места своя фаза (хэш id), окно бодрствования каждую
     неделю сдвигается на SHARE: место бодрствует, если (фаза + неделя × SHARE) mod 1 < SHARE. При SHARE = 0,4 — две недели
     из пяти, и никогда две недели подряд: на следующей неделе просыпаются другие места. Места игроков (usr:) не спят;
     новичку на обучении открыты все Источники (первый Источник — рядом). Считается одинаково на телефоне и на сервере. */
  awake(p, kind, t = U.now()) {
    const id = String((p && p.id) || ''), P = Rules.PLACES;
    if (id.startsWith('usr:')) return true;
    if (kind === 'spring' && typeof S !== 'undefined' && S.d && S.d.tut) return true;
    return (U.h('wake', id) + Ev.week(t) * P.SHARE) % 1 < P.SHARE;
  },

  /* ---------- Источники: у реальных объектов (см. pois.js) ---------- */
  // p — объект карты { id, lat, lng, name, photo }; d — расстояние до игрока
  springFor(p, d) {
    const slot = Math.floor(U.now() / 7200000), id = p.id, last = S.d.springs[id] || 0;
    // вторжение Нави: ~12% источников захвачены на двухчасовое окно (с INVASION_LEVEL уровня)
    const invId = `${id}:${slot}`;
    const invaded = S.d.level >= INVASION_LEVEL &&U.h('inv', id, slot) < 0.12 && !S.d.freed[invId];
    return { type: 'spring', id, invId, invaded, lat: p.lat, lng: p.lng, d, name: p.name, photo: p.photo, cat: p.cat,
      ready: U.now() - last > this.SPRING_COOLDOWN, readyAt: last + this.SPRING_COOLDOWN };
  },
  springsAround(lat, lng, radius = this.VIEW + 150) {
    return Poi.near(lat, lng, radius, 'spring').filter(p => this.awake(p, 'spring')).map(p => this.springFor(p, p.d)); // 5.2: спящих нет
  },

  /* ---------- Разломы: каждый час открываются у части Капищ ---------- */
  riftAt(id, hour) { return U.h('rr', id, hour) < 0.35; },
  // Разлом у капища p в этот час (или null); 5.2: у спящего места Разломов нет — и Великих (Кощей) тоже
  riftFor(p, d, hour = Math.floor(U.now() / 3600000)) {
    if (!this.riftAt(p.id, hour) || !this.awake(p, 'shrine', hour * 3600000)) return null;
    const id = `${p.id}:${hour}`;
    const r = U.rng(id);
    const myth = this.placeMyth(p); // 4.28: босс — из мифологии Разлома
    // 4.28: финал сезона Алатыря — во всех Разломах мира великий босс Кощей (fin — номер сезона: победы идут в общий счёт)
    const t0 = hour * 3600000;
    if (Ev.finale(t0)) return { type: 'rift', id, poi: p.id, lat: p.lat, lng: p.lng, d, tier: 3, boss: 'koschey', myth, fin: Ev.alaSeason(t0), place: p.name, done: !!S.d.rifts[id], endsAt: (hour + 1) * 3600000 };
    const tier = U.weighted(Ev.cur.rifts ? [[1, 40], [2, 30], [3, 30]] : [[1, 60], [2, 30], [3, 10]], r());
    let pool;
    if (tier === 3) pool = this.ofMyth(SPECIES.filter(s => s.legend && (!Ev.hol || !Ev.hol.koschey || s.id === 'koschey')), myth);
    else if (tier === 2) pool = this.ofMyth(SPECIES.filter(s => !s.legend && s.rar >= 3 && this.local(s, p.lng, p.lat) && Ev.seasonal(s) > 0), myth);
    else pool = this.ofMyth(SPECIES.filter(s => s.rar === 2), myth);
    // в неделю стихии разломы чаще охраняют духи этой стихии
    const evPool = pool.filter(s => s.el === Ev.cur.el);
    if (evPool.length && r() < 0.6) pool = evPool;
    const boss = pool[Math.floor(r() * pool.length)].id;
    return { type: 'rift', id, poi: p.id, lat: p.lat, lng: p.lng, d, tier, boss, myth, place: p.name, done: !!S.d.rifts[id], endsAt: (hour + 1) * 3600000 };
  },
  riftsAround(lat, lng, radius = this.VIEW + 500) {
    Ev.alaSync();
    return Poi.near(lat, lng, radius, 'shrine').map(p => this.riftFor(p, p.d)).filter(Boolean);
  },

  // 4.19: что и с каким весом кладёт источник (на каждый из 4–6 бросков) — общее для добычи и вкладки «Добыча»
  SPRING_GIFT: 0.6, SPRING_COCOON: 0.12,
  springOpts(lvl) {
    // 4.15: лечебное; 4.16: мёда, Живой воды и ладана меньше (к 40 уровню копились сотнями и десятками),
    // Мёртвая вода — ~1 источник из 500 (раньше из 300, но при полной сумке источник не давал ничего)
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
    // подарок для друга — в трёх источниках из пяти (4.16: было в каждом втором), пока их меньше GIFT_LIMIT
    if ((S.d.items.gift || 0) < GIFT_LIMIT && r() < this.SPRING_GIFT) loot.gift = 1;
    let cocoon = null;
    if (S.d.cocoons.length < 9 && r() < this.SPRING_COCOON * Ev.kmMul()) cocoon = U.weighted([[2, 5], [5, 4], [10, 1]], r());
    return { loot, cocoon };
  },

  /* ---------- Капища ---------- */
  shrineFor(p, d) {
    const id = p.id;
    const tier = U.weighted([[1, 50], [2, 35], [3, 15]], U.h('kt', id));
    const myth = this.placeMyth(p), gods = MYTH_PLACES[myth].gods; // 4.28: святилище мифологии места
    const god = gods[Math.floor(U.h('kn', id) * gods.length)];
    const hold = typeof Clans !== 'undefined' ? Clans.info(id) : null; // на сервере сводки нет — он спрашивает базу сам
    return { type: 'shrine', id, tier, name: p.name, god, myth, photo: p.photo, lat: p.lat, lng: p.lng, d, won: S.d.shrines[id] === U.today(), clan: hold ? hold.clan : null };
  },
  // Капище у реального объекта; пока в нём открыт Разлом, поединок недоступен
  shrinesAround(lat, lng, radius = this.VIEW + 400) {
    const hour = Math.floor(U.now() / 3600000);
    Ev.alaSync();
    return Poi.near(lat, lng, radius, 'shrine').filter(p => this.awake(p, 'shrine') && !this.riftAt(p.id, hour)).map(p => this.shrineFor(p, p.d));
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

  // Прислужник Нави на захваченном источнике: трое омрачённых духов одной стихии (4.16: сила отряда — от силы духов игрока)
  // 5.1.26: e.lat, e.lng — где источник: отряд из духов его родины, без ночных и дневных (спасённого ловят сразу, в любое время)
  grunt(e) {
    const r = U.rng('grunt' + e.invId);
    const el = ELEMENT_KEYS[Math.floor(r() * ELEMENT_KEYS.length)];
    const base = SPECIES.filter(s => s.el === el && !s.legend && !s.season && s.rar <= 3);
    const home = e.lat != null && e.lng != null ? this.homes(+e.lat, +e.lng) : null; // бой начат до 5.1.26 — места нет, как раньше
    const here = home ? base.filter(s => home.includes(s.myth)) : base, calm = here.filter(s => !s.time);
    const pool = this.evenMyth(calm.length ? calm : here.length ? here : base, r()); // 4.28: мифология — поровну
    const strong = this.ofMyth(SPECIES.filter(s => s.el === el && !s.legend && !s.season && !s.evo), pool[0].myth);
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
    const myth = e.myth || this.placeMyth(e), gs = MYTH_PLACES[myth].guards; // 4.28: хранитель, его имя и духи — из мифологии святилища
    const name = gs[Math.floor(r() * gs.length)];
    const color = GUARD_COLORS[Math.floor(r() * GUARD_COLORS.length)];
    // Ученик — первые стадии, Мастер — до второй, Старейшина — любые, включая редких (слабый вид сильному Ловчему выходит уже превращённым)
    const rars = e.tier === 1 ? [1, 2] : e.tier === 2 ? [1, 2, 3] : [2, 3, 4];
    const maxStage = e.tier === 1 ? 1 : e.tier === 2 ? 2 : 3;
    const pool = this.ofMyth(SPECIES.filter(s => !s.legend && !s.season && rars.includes(s.rar) && s.stage <= maxStage), myth);
    const pw = this.topPower() * T.pow;
    const team = [];
    while (team.length < 3) {
      const s = pool[Math.floor(r() * pool.length)];
      if (team.some(x => SP[x.sid].fam === s.fam)) continue;
      // сильному Ловчему — сильнейшие виды (у Старейшины — и эпические), без повторов семейств
      const strong = this.ofMyth(SPECIES.filter(x => !x.legend && !x.season && !x.evo && x.rar >= 2 && x.rar <= (e.tier === 3 ? 4 : 3) && !team.some(y => SP[y.sid].fam === x.fam)), myth);
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
