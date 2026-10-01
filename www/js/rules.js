'use strict';
/* Правила, общие для сервера и телефона. Сервер по ним принимает решения,
   телефон — показывает (цвет кольца, награды, подсказки). */

const Rules = {
  QUEST_BONUS: { charm: 10, honey: 2, sparks: 500 }, // 4.16: без ладана (был каждый день — копился десятками) и меньше искр
  // 4.16: опыт за задание дня и за сундук дня (было 300 и 1000) — ежедневные цели заметнее для тех, кто играет понемногу
  QUEST_XP: 500, QUEST_BONUS_XP: 2500,
  PLACE_REWARD: { xp: 1000, sparks: 500, charm: 10 },
  SUPPLY: { charm: 15, honey: 2, water: 1 },
  THROWABLE: ['charm', 'charm2', 'charm3'],
  COUNTDOWN: 3.2, // секунды обратного отсчёта перед боем

  // Серия дней: награда за первый вход в игру за день, по кругу из 7 дней
  STREAK: [
    { charm: 5, xp: 200 },
    { honey: 2, xp: 300 },
    { charm: 8, herb: 2, xp: 400 },
    { charm2: 3, gift: 1, xp: 500 },
    { incense: 1, honey: 1, xp: 600 },
    { charm2: 5, brew: 1, xp: 800 },
    { charm3: 3, sparks: 1000, gate: 1, xp: 1500 }, // 7-й день — ещё и кокон 10 км; 5.1: и Врата Перепутицы
  ],

  /* Общее дело Ордена: все Ловчие неделю вместе копят очки. Цель растёт с числом участников.
     Награда ступени — тем, кто сам внёс не меньше need очков, когда Орден дошёл до ступени. */
  ORDER: {
    PER: 120, MIN: 300, // цель = max(MIN, PER × участники)
    STEPS: [
      { at: 1 / 3, need: 15, reward: { charm: 10, honey: 3, sparks: 1000 } },
      { at: 2 / 3, need: 40, reward: { charm2: 5, water: 2, incense: 1 } },
      { at: 1,     need: 80, reward: { charm3: 3, sparks: 3000 } }, // и кокон 10 км
    ],
  },
  orderGoal(players) { return Math.max(this.ORDER.MIN, this.ORDER.PER * (players || 0)); },
  // Очки за изменения счётчиков (до → после). Задание недели удваивает очки своего дела.
  orderPoints(a, b, ev) {
    const d = k => Math.max(0, (b[k] || 0) - (a[k] || 0));
    const caught = d('caught');
    const elCatch = ev.el ? Math.min(caught, Math.max(0, ((b.byEl || {})[ev.el] || 0) - ((a.byEl || {})[ev.el] || 0))) : 0;
    const km = Math.max(0, Math.floor((b.km || 0) * 2) - Math.floor((a.km || 0) * 2)); // очко за каждые 500 м
    return caught + elCatch * 2
      + d('springs') * (ev.loot ? 2 : 1)
      + d('raids') * (ev.rifts ? 10 : 5)
      + d('duels') * (ev.duel ? 6 : 3)
      + d('invasions') * 3
      + d('hatched') * (ev.km ? 6 : 3)
      + km * (ev.km ? 2 : 1);
  },
  /* 4.28: общий Алатырь. Каждый осколок Алатыря, найденный любым Ловчим (S.alatyrDrop), идёт ещё и в общий счёт Ордена
     (осколок остаётся у Ловчего). Собрана грань — дорога в её мир распутана: HOURS часов духи этой мифологии встречаются
     в MUL раз чаще (Ev.mythMul). Начало — с полного часа, не раньше чем через LEAD минут после вехи: телефоны и сервер
     успевают узнать о ней заранее и отбирают духов одинаково.
     Сезоны: в сезоне s камень — BASE + s граней, по одной на каждую открытую мифологию: семь первых (ORDER), дальше — мифологии
     сезонов 2…s, новая — последней гранью (alaFaces). Грань k сезона s стоит (FIRST + STEP × k) × SEASON^(s − 1) осколков,
     считая от счёта на начало сезона (start в базе). Собраны все грани — финал: с полного часа (как дорога) FINALE.DAYS дней во
     всех Разломах мира Кощей; Орден одолел его FINALE.GOAL раз — он раскалывает камень раньше (с ближайшего полного часа), нет —
     в конце финала всё равно. Раскол — начало сезона s + 1: открывается его мифология («?» на экране камня) и сезон Лиги.
     Грань мифологии, которой ещё нет в игре (файл не вышел), не закрывается — ждёт обновления.
     Номер грани n — сквозной по сезонам (alaBase): у первого сезона 0…6, как у граней 4.28 до сезонов.
     Калибровка: десятки–сотни Ловчих по 0,3–1 осколку в день — ~15–50 осколков в день на весь Орден: первая грань за 1–3 дня,
     первый сезон (490) — за 10–30 дней, второй (8 граней, 720) — за 2–7 недель, третий (9 граней, ~1040) — за 3–10 недель.
     Финал: у десятков Ловчих ~1–2 победы над Кощеем в день у каждого (великий разлом, совместно проще) — GOAL за 3–7 дней,
     у сотен — за день-два. KILL — сколько очков вклада сезона даёт победа над Кощеем (осколок — одно)
     5.x: цена грани растёт с числом активных Ловчих: базовая цена (alaGoal) × (1 + PER × N), N — Ловчие уровня LEVEL+, игравшие
     за последние DAYS дней; не дороже CAP × цены предыдущей грани (сквозной номер n − 1, и через границу сезона), не дешевле
     базовой. Цена фиксируется, когда грань открывается (собрана предыдущая или начался сезон): её записывает сервер в базу
     (033_alatyr_goals.sql, первый записавший побеждает), телефон получает цены граней от сервера (Ev.ala.goals) — оба считают
     камень по ним (alaStage с G = { goals, N }). Грани без записанной цены: старше первой записанной — по базовой цене (собраны
     до 5.x), дальше — ориентир по нынешнему множителю */
  ALATYR_WORLD: { ORDER: ['slavic', 'greek', 'norse', 'celtic', 'egypt', 'china', 'aztec'], BASE: 6, FIRST: 40, STEP: 10, SEASON: 1.2, MUL: 2, HOURS: 72, LEAD: 10,
    FINALE: { GOAL: 300, DAYS: 7, KILL: 3 }, GOALS: { LEVEL: 20, DAYS: 14, PER: 0.1, CAP: 2 } },
  // множитель Ордена при N активных Ловчих
  alaMul(N) { return Math.round((1 + Math.max(0, Math.floor(+N) || 0) * this.ALATYR_WORLD.GOALS.PER) * 1000) / 1000; },
  // цена грани n (сквозной номер), если она открывается сейчас: N активных Ловчих, prev — цена грани n − 1 (0 — без ограничения)
  alaPriceNew(n, N, prev) {
    const f = this.alaFace(n), b = this.alaGoal(f.s, f.k);
    let p = Math.round(b * this.alaMul(N));
    if (+prev > 0) p = Math.min(p, Math.round(+prev * this.ALATYR_WORLD.GOALS.CAP));
    return Math.max(b, p);
  },
  // цены граней 0…n: { p, kind } — kind: fixed (записана в базе), old (старше первой записанной — базовая), est (ориентир)
  alaPrices(n, G) {
    const goals = (G && G.goals) || {}, N = (G && G.N) || 0, out = [];
    const keys = Object.keys(goals).map(Number).filter(x => +goals[x] > 0), low = keys.length ? Math.min(...keys) : Infinity;
    let prev = 0;
    for (let i = 0; i <= n; i++) {
      let p, kind;
      if (+goals[i] > 0) { p = +goals[i]; kind = 'fixed'; }
      else if (i < low) { const f = this.alaFace(i); p = keys.length ? this.alaGoal(f.s, f.k) : this.alaPriceNew(i, N, prev); kind = keys.length ? 'old' : 'est'; }
      else { p = this.alaPriceNew(i, N, prev); kind = 'est'; }
      out.push({ p, kind }); prev = p;
    }
    return out;
  },
  // какую грань пора зафиксировать (сервер): первая грань сезона без записанной цены, до которой дошёл счёт, иначе −1.
  // Цен ещё нет совсем (первый запуск 5.x) — фиксируется та, что собирается сейчас (собранные до неё — по базовой цене)
  alaNextFix(s, have, G) {
    const goals = (G && G.goals) || {}, fresh = !Object.keys(goals).some(k => +goals[k] > 0);
    const st = this.alaStage(s, have, fresh ? { goals: {}, N: 0 } : G), t = st.total;
    let from = 0;
    for (let k = 0; k < st.K; k++) {
      const p = st.prices[k];
      if (p.kind === 'est' && !(fresh && t >= from + p.p && st.faces[k])) return st.base + k;
      if (!st.faces[k] || t < from + p.p) return -1;
      from += p.p;
    }
    return -1;
  },
  // сколько граней в сезоне s
  alaK(s) { return this.ALATYR_WORLD.BASE + Math.max(1, Math.floor(+s) || 1); },
  // мифологии граней сезона s по порядку; null — мифологии этого сезона ещё нет в игре
  alaFaces(s) {
    s = Math.max(1, Math.floor(+s) || 1);
    const out = this.ALATYR_WORLD.ORDER.slice(0, this.alaK(1));
    for (let j = 2; j <= s; j++) out.push(typeof mythOfSeason === 'function' ? mythOfSeason(j) : null);
    return out.slice(0, this.alaK(s));
  },
  // цена грани k сезона s
  alaGoal(s, k) {
    const A = this.ALATYR_WORLD;
    return Math.max(1, Math.round((A.FIRST + A.STEP * k) * Math.pow(A.SEASON, Math.max(1, Math.floor(+s) || 1) - 1)));
  },
  // весь камень сезона s (G — зафиксированные цены и N, см. alaPrices; нет — базовые цены)
  alaCost(s, G) { return this.alaSeasonPrices(s, G).reduce((a, x) => a + x.p, 0); },
  alaSeasonPrices(s, G) { const b = this.alaBase(s); return this.alaPrices(b + this.alaK(s) - 1, G).slice(b); },
  // сквозной номер первой грани сезона s и обратно: грань n → { s, k }
  alaBase(s) { s = Math.max(1, Math.floor(+s) || 1); return this.ALATYR_WORLD.BASE * (s - 1) + s * (s - 1) / 2; },
  alaFace(n) { n = Math.max(0, Math.floor(+n) || 0); let s = 1; while (s < 10000 && this.alaBase(s + 1) <= n) s++; return { s, k: n - this.alaBase(s) }; },
  // мифология и цена грани n (сквозной номер)
  alatyrRoad(n) { const f = this.alaFace(n); return this.alaFaces(f.s)[f.k] || null; },
  alatyrGoal(n) { const f = this.alaFace(n); return this.alaGoal(f.s, f.k); },
  /* где сезон s, если за него собрано have осколков: n — сколько граней собрано, done — все (финал), face — какая собирается,
     myth — её мифология (null — её нет в игре: locked, грань ждёт обновления), from/at — счёт сезона в начале и в конце этой
     грани, have/need — собрано и нужно на ней, base — сквозной номер первой грани сезона.
     5.x: G — { goals: { n: цена }, N } (Ev.ala): цены граней — зафиксированные, прочие — см. alaPrices; prices — цены граней
     сезона { p, kind }, est — цена текущей грани пока ориентир (сервер ещё не записал) */
  alaStage(s, have, G) {
    s = Math.max(1, Math.floor(+s) || 1);
    const K = this.alaK(s), faces = this.alaFaces(s), t = Math.max(0, Math.floor(+have || 0)), P = this.alaSeasonPrices(s, G), g = k => P[k].p;
    let n = 0, from = 0;
    while (n < K && faces[n] && t >= from + g(n)) { from += g(n); n++; }
    const done = n >= K, need = done ? g(K - 1) : g(n), h = done ? need : Math.min(t - from, need);
    return { s, K, faces, n, face: Math.min(n, K - 1), done, myth: done ? null : faces[n], locked: !done && !faces[n], prices: P, est: !done && P[n].kind === 'est',
      from: done ? from - need : from, at: done ? from : from + need, have: h, need, pct: h / need, total: t, base: this.alaBase(s) };
  },
  // очки вклада сезона: осколки и победы над Кощеем в финале (S.d.alaS — { s, n, k })
  alaPoints(a) { return a && typeof a === 'object' ? Math.max(0, Math.floor(+a.n) || 0) + Math.max(0, Math.floor(+a.k) || 0) * this.ALATYR_WORLD.FINALE.KILL : 0; },
  // когда начнётся и кончится событие дороги, если веха взята в момент t (мс): с полного часа, не раньше LEAD минут
  alatyrOpen(t) {
    const A = this.ALATYR_WORLD, from = this.alaHour(t);
    return { from, to: from + A.HOURS * 3600000 };
  },
  // ближайший полный час не раньше чем через LEAD минут после t — с него начинаются дороги, финал и раскол
  alaHour(t) { return Math.ceil((t + this.ALATYR_WORLD.LEAD * 60000) / 3600000) * 3600000; },
  // финал, если последняя грань собрана в момент t: с полного часа на FINALE.DAYS дней
  alaFinale(t) { const from = this.alaHour(t); return { from, to: from + this.ALATYR_WORLD.FINALE.DAYS * 86400000 }; },
  /* ---------- 3.12: монеты, Лавка Ордена, Сезонная тропа ---------- */
  // Монеты — вторая валюта: за серию дней, сундук дня, уровни, дань и Тропу.
  // 4.16: бесплатных монет было 60–80 в день у активного (к 40 уровню — 2–4 тыс. без покупок, Казна не нужна) — теперь ~5–10:
  // серия 1 в день и 10 на 7-й (было 5 и 30), сундук дня 2 (10), уровень 3, каждый пятый — 15 (всегда 20),
  // глава Летописи 15 (50), дань 1 за Капище, но не больше чем с tributeMax Капищ (было 3 за каждое, до 30 в день)
  // 4.16.0: бесплатных монет у активного игрока ~5–6 в день (было ~8 без учёта продаж на аукционе): 7-й день серии 10 → 5, глава Летописи 15 → 10
  ZLAT: { streak: 1, streak7: 5, questBonus: 2, level: 3, level5: 15, story: 10, tribute: 1, tributeMax: 3 },
  BAG_STEP: 50, BAG_MAX_UP: 10,
  // 3.15: Казна — монеты за рубли (оплата через ЮKassa; цену и число монет сервер берёт отсюда, а не с телефона)
  PAY: [
    { id: 'z100',  zlat: 100,  rub: 99 },
    { id: 'z330',  zlat: 330,  rub: 299,  bonus: 10 },
    { id: 'z575',  zlat: 575,  rub: 499,  bonus: 15 },
    { id: 'z1200', zlat: 1200, rub: 999,  bonus: 20, hot: true },
    { id: 'z2600', zlat: 2600, rub: 1990, bonus: 30 },
  ],
  // 3.20: дневные лимиты объектов карты (сутки — по часам игрока). Считаются только успехи: зачерпнутый источник,
  // победа в Разломе, на Капище и во вторжении, пойманный дикий дух. Обычной игре не мешают (20–40 поимок,
  // 10–20 источников в день), а бесконечный фарм и боты упираются в потолок
  DAILY: { springs: 30, raids: 6, duels: 8, invasions: 6, catches: 120 },
  DAILY_NAMES: { springs: ru`Источники`, raids: ru`Разломы`, duels: ru`Капища`, invasions: ru`Вторжения`, catches: ru`Поимки` },
  // 4.16: сколько раз товар Лавки с недельным пределом (week) куплен на этой неделе (неделя — как у событий, Ev.week)
  dayUsed(d, key) { return d && d.dayc && d.dayc.day === U.today() ? (d.dayc[key] || 0) : 0; },
  weekUsed(d, key) { return d && d.weekc && d.weekc.w === Ev.week() ? (d.weekc[key] || 0) : 0; }, // 4.16: за неделю (с понедельника)
  // строка «Источников сегодня: 12 из 30» для окон объектов
  dayLine(d, key, what) { const u = this.dayUsed(d, key), m = this.DAILY[key]; return `<div class="day-left ${u >= m ? 'out' : ''}">${u >= m ? ru`${what} сегодня: <b>${u}</b> из ${m} — завтра снова` : ru`${what} сегодня: <b>${u}</b> из ${m}`}</div>`; },
  // 3.18: Чат Ордена — писать с LEVEL уровня; не чаще раза в GAP мс и PER_DAY сообщений в сутки; до MAX символов
  CHAT: { LEVEL: 3, MAX: 200, GAP: 3000, PER_DAY: 300 },
  CHAT_CHANNELS: [['all', ru`Общий`], ['trade', ru`Торговля`], ['raid', ru`Разломы`], ['help', ru`Помощь`], ['clan', ru`Клан`]],
  // 3.17: Аукцион духов — с LEVEL уровня (4.16: было 5); лот живёт HOURS часов; комиссия FEE с продажи (платит продавец)
  // 4.16: лот живёт 48 ч (было 72), открытых лотов — до 3 (было 5), выставлять — до 10 в день (было 20);
  // залог DEPOSIT от цены (не меньше DEP_MIN) — вернётся при продаже, пропадёт, если лот истечёт или его снимут:
  // так на аукционе меньше залежалых лотов по несбыточной цене. RECENT — за сколько дней смотреть сделки для подсказки цены
  // 4.20: скорость Ловчего — только шагом или бегом. Шаг ≈ 5 км/ч, бег 8–12, быстрый бег до 16; быстрее (самокат, велосипед,
  // машина, метро) — действия на карте на COOL мс замирают, путь не засчитывается. Скорость — средняя за MIN_T…WIN с на MIN_D м и
  // больше (GPS «дрожит» на десятки метров — короткие скачки не в счёт); точки с точностью хуже ACC м не берутся
  // 4.24.1: скорость — по недавним точкам (не старше WIN с): средняя от самой свежей точки, что старше MIN_T с. Пауза COOL
  // снимается, как только Ловчий последние CALM с идёт шагом, бегом или стоит (раньше якорь держался минуту, и после остановки
  // игра ещё до двух минут считала, что он едет). STEP — точки в истории не чаще раза в STEP мс, MAX_PTS — не больше стольких точек
  SPEED: { MAX: 18, /* 5.1.12: джойстик быстрее — предел 65 км/ч (было 4,5 м/с) */ MIN_T: 15, WIN: 60, MIN_D: 60, ACC: 40, COOL: 60000, CALM: 8, STEP: 2000, MAX_PTS: 40 },
  // средняя скорость от a к b (м/с), если её можно честно измерить, иначе null; t — мс
  speedOf(a, b) {
    if (!a || !b) return null;
    const S2 = this.SPEED, dt = (b.t - a.t) / 1000;
    if (dt < S2.MIN_T || dt > S2.WIN * 3) return null;
    const d = U.dist(a.lat, a.lng, b.lat, b.lng);
    return d < S2.MIN_D ? null : d / dt;
  },
  // Новая точка q ({ lat, lng, t }) в счётчике скорости st ({ pts, until, kmh }): until — до какого времени (мс) Ловчий «едет».
  // Общий для телефона и сервера. Возвращает скорость (м/с), если её удалось честно измерить
  paceStep(st, q) {
    const S2 = this.SPEED;
    // точки могут прийти не по порядку (пачка пройденного пути — позже текущей позиции): история всегда по времени
    st.pts = (st.pts || []).filter(p => p && Number.isFinite(p.t));
    if (!st.pts.some(p => Math.abs(p.t - q.t) < S2.STEP)) st.pts.push({ lat: q.lat, lng: q.lng, t: q.t });
    st.pts.sort((x, y) => x.t - y.t);
    const N = st.pts[st.pts.length - 1];
    st.pts = st.pts.filter(p => N.t - p.t <= S2.WIN * 1000);
    if (st.pts.length > S2.MAX_PTS) st.pts.splice(0, st.pts.length - S2.MAX_PTS);
    // самая свежая точка, что старше точки b хотя бы на sec секунд
    const back = (b, sec) => { for (let i = st.pts.length - 1; i >= 0; i--) if (b.t - st.pts[i].t >= sec * 1000) return st.pts[i]; return null; };
    // идёт шагом, бегом или стоит — за последние CALM с до точки b (дрожь GPS тут не мешает: она «замедляет», а не ускоряет)
    const calm = b => { const c = back(b, S2.CALM); return !!c && U.dist(c.lat, c.lng, b.lat, b.lng) / ((b.t - c.t) / 1000) <= S2.MAX; };
    // быстро: средняя за MIN_T с и больше — быстрее бега, и последние CALM с до этой точки он тоже не шёл шагом
    // (иначе после остановки замеры, захватившие поездку, ещё секунд 15 продлевали бы паузу)
    const a = back(q, S2.MIN_T), v = a ? this.speedOf(a, q) : null;
    if (v != null && v > S2.MAX && !calm(q)) { st.until = Math.max(st.until || 0, q.t + S2.COOL); st.kmh = Math.round(v * 3.6); }
    // пауза снимается по самой свежей точке: последние CALM с — шагом, бегом или на месте
    if (st.until > N.t && calm(N)) st.until = 0;
    return v;
  },
  // 4.26: перезарядка после дальнего перемещения (как в Pokémon GO): от места последнего действия на карте до нового —
  // [км, минут]; между строками — плавно, дальше последней — MAX минут. Ближе MIN км — дрожь GPS, не в счёт
  JUMP: { MIN: 1, MAX: 120, T: [[1, 1], [5, 2], [10, 6], [25, 11], [30, 14], [65, 22], [81, 25], [100, 35], [250, 45], [500, 60], [750, 80], [1000, 100]] },
  jumpCool(km) {
    const J = this.JUMP, T = J.T;
    if (!(km >= J.MIN)) return 0;
    if (km > T[T.length - 1][0]) return J.MAX;
    for (let i = 1; i < T.length; i++) if (km <= T[i][0]) { const [a, x] = T[i - 1], [b, y] = T[i]; return x + (y - x) * (km - a) / (b - a); }
    return T[0][1];
  },
  // сколько ещё ждать (мс) в точке b ({ lat, lng }) в момент now после действия в точке a ({ lat, lng, t }): время с тех пор идёт в зачёт
  jumpWait(a, b, now) {
    if (!a || !b || !Number.isFinite(+a.t)) return 0;
    return Math.max(0, +a.t + this.jumpCool(U.dist(a.lat, a.lng, b.lat, b.lng) / 1000) * 60000 - now);
  },
  // 4.26: пройденный путь сверяется с тем, где сервер видел Ловчего: точка q ({ lat, lng, t }) не дальше, чем можно пробежать
  // от позиции ref ({ lat, lng, t, acc }) за время между ними (бег × K), но не меньше MIN м, плюс точность ref (до ACC м).
  // DAY — сколько метров пути в день идёт в зачёт (коконы, задания, Орден); дальше путь не засчитывается
  TRACK: { MIN: 200, K: 1.5, ACC: 300, DAY: 60000 },
  trackNear(q, ref) {
    if (!ref) return true;
    const T = this.TRACK, dt = Math.abs(q.t - ref.t) / 1000;
    return U.dist(ref.lat, ref.lng, q.lat, q.lng) <= Math.max(T.MIN, this.SPEED.MAX * T.K * (Number.isFinite(dt) ? dt : 0)) + U.clamp(+ref.acc || 0, 0, T.ACC);
  },
  /* ---------- 5.1: джойстик и Атлас ---------- */
  // Ловчий ходит мини-джойстиком (walk.js): лёгкий наклон — шаг WALK, до упора (от RUN_AT наклона) — бег RUN, м/с; бег медленнее
  // SPEED.MAX, поэтому путь засчитывается, а проверки скорости сервера (SPEED, TRACK, jumpWait) остаются защитой от накрутки.
  // SYNC_MS — как часто, пока Ловчий идёт, путь уходит серверу (действие move); PT_MS — точки пути не чаще раза в столько мс.
  // Телепорт через Атлас (действие teleport): первое появление — даром, дальше — раз в TP_CD или мгновенно за предмет TP_ITEM
  MOVE: { WALK: 20 / 3.6, RUN: 60 / 3.6, /* 5.1.12: шаг 20, бег 60 км/ч (было 5 и 15) */ RUN_AT: 0.8, DEAD: 0.12, SYNC_MS: 10000, PT_MS: 1000, TP_CD: 30 * 60000, TP_ITEM: 'gate', LAT: 85 },
  // сколько ещё ждать до телепорта даром (мс): tpAt — время прошлого телепорта (S.d.tpAt)
  tpWait(tpAt, now) { return Number.isFinite(+tpAt) && +tpAt > 0 ? Math.max(0, +tpAt + this.MOVE.TP_CD - now) : 0; },
  AUCTION: { LEVEL: 5, FEE: 0.1, HOURS: 48, MAX_OPEN: 3, PER_DAY: 10, DEPOSIT: 0.05, DEP_MIN: { sparks: 50, zlat: 1 }, RECENT: 14,
    MIN: { sparks: 100, zlat: 1 }, MAX: { sparks: 10000000, zlat: 100000 } },
  auctionFee(price) { return Math.max(1, Math.ceil(price * this.AUCTION.FEE)); },
  auctionDeposit(cur, price) { const A = this.AUCTION; return Math.max(A.DEP_MIN[cur === 'zlat' ? 'zlat' : 'sparks'], Math.ceil((price || 0) * A.DEPOSIT)); },
  // Подсказка цены по недавним сделкам с духом того же вида: rows — [{ cur, price, lvl }]. Для каждой валюты — число
  // сделок, медиана и «обычный» разброс (от четверти до трёх четвертей сделок). lvl — уровень духа: сделки с духами
  // ±5 уровней, если таких хотя бы 3, иначе все сделки вида
  auctionHint(rows, lvl) {
    const out = {};
    for (const cur of ['sparks', 'zlat']) {
      let r = (rows || []).filter(x => x && x.cur === cur && x.price > 0);
      if (lvl) { const near = r.filter(x => Math.abs((x.lvl || 0) - lvl) <= 5); if (near.length >= 3) r = near; }
      if (!r.length) continue;
      const p = r.map(x => x.price).sort((a, b) => a - b), q = f => p[Math.min(p.length - 1, Math.floor(f * p.length))];
      out[cur] = { n: p.length, med: q(0.5), lo: q(0.25), hi: q(0.75) };
    }
    return out;
  },
  // 3.14: обменник — SPARKS искр → ZLAT монет за один обмен, не больше DAY обменов в день
  // 4.16: был ✦ 500 → 10 монет трижды в день (30 монет в день почти даром) — теперь трата лишних искр:
  // ✦ 1 000 → 1 монета, до 5 обменов в день. 5.1.15: ✦ 1 000 → 10 монет (пять обменов дня — ладан из Лавки).
  // 5.1.20: снова ✦ 1 000 → 1 монета; ✦ 1 000 → CAMP монет — только на шаге Кампании «обмены», не больше его цели (S.campExLeft)
  EXCHANGE: { SPARKS: 1000, ZLAT: 1, CAMP: 10, DAY: 5 },
  // 5.1.15: Разлом кампании — личный, в DIST м от Ловчего (в пределах видимости на карте); ушёл дальше KEEP м
  // (или шагнул через Врата) — Разлом переносится к нему. Хранитель — по команде Ловчего (S.campBoss): здоровье — на T секунд
  // быстрых ударов первого бойца со скоростью TAPS в секунду (без приёмов), удар — такой, что первый боец выдерживает HITS ударов
  CAMP_RIFT: { DIST: [60, 95], KEEP: 600, T: 32, TAPS: 2, HITS: 16 },
  // 5.1.15: часть света (материк Атласа мира, WORLD_LANDS) для точки: внутри очертаний — он; в море и у берегов — материк
  // ближайшей вершины очертаний (долгота сжата к полюсам). Антарктида не в счёт: туда Врата не открываются
  land(lat, lng) {
    const L = this._lands || (this._lands = WORLD_LANDS.filter(l => !l.cold).map(l => ({ id: l.id, rings: l.polys.map(s => s.split(' ').map(p => p.split(',').map(Number))) })));
    const k = Math.cos(U.clamp(lat, -89, 89) * Math.PI / 180);
    let best = null, bd = Infinity;
    for (const l of L) for (const r of l.rings) {
      let c = false;
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > lat) !== (b[1] > lat) && lng < (b[0] - a[0]) * (lat - a[1]) / (b[1] - a[1]) + a[0]) c = !c; }
      if (c) return l.id;
      for (const [x, y] of r) { let dx = Math.abs(x - lng); if (dx > 180) dx = 360 - dx; const dd = (dx * k) ** 2 + (y - lat) ** 2; if (dd < bd) { bd = dd; best = l.id; } }
    }
    return best;
  },
  // 4.16: посылка Ордена — награда, которая не поместилась в сумку, ждёт здесь (не больше MAX вещей), пока не освободится место
  PARCEL: { MAX: 200 },
  // 4.16: переплавка — N одинаковых лишних амулетов и SPARKS искр → один амулет на выбор
  MELT: { N: 3, SPARKS: 3000 },
  // 3.13: Дальний пропуск — Разлом до R м от игрока; каждый день Орден дарит один, если их меньше KEEP
  FAR: { R: 5000, KEEP: 3 },
  // 5.2: места (Источники, Капища и Разломы у них): каждую неделю бодрствует доля SHARE, остальные спят (W.awake);
  // на карте места видны в радиусе VIEW м от Ловчего (подойти, чтобы открыть, — как раньше: W.INTERACT, W.BATTLE_R)
  PLACES: { SHARE: 0.4, VIEW: 200 },
  // cur — валюта: sparks (искры) или zlat (монеты). give — предметы; cocoon — кокон; amulet — случайный амулет
  SHOP: [
    { id: 'bag',      name: ru`Расширение сумки`,    desc: ru`+50 мест в сумке навсегда`,                cur: 'zlat', bag: true },
    { id: 'farpass',  name: ru`Дальний пропуск`,     desc: ru`Закрыть Разлом до 5 км, не подходя к нему`, cur: 'sparks', price: 1000, give: { farpass: 1 } },
    { id: 'farpass3', name: ru`Три дальних пропуска`, desc: ru`Три грамоты на дальние Разломы`,          cur: 'zlat', price: 45,  give: { farpass: 3 } }, // выгоднее трёх за искры (по курсу обменника 45 зл ≈ ✦ 2250)
    { id: 'charm20', name: ru`Связка оберегов`,     desc: ru`20 оберегов`,                              cur: 'sparks', price: 1500, give: { charm: 20 } },
    { id: 'honey5',   name: ru`Горшок мёда`,         desc: ru`5 мёда`,                                   cur: 'sparks', price: 1200, give: { honey: 5 } },
    { id: 'water5',   name: ru`Живая вода`,          desc: ru`5 флаконов: половина здоровья, в разломе — прямо в бою`, cur: 'sparks', price: 2000, give: { water: 5 } },
    { id: 'herb10',   name: ru`Пучок подорожника`,   desc: ru`10 листьев: четверть здоровья каждый`,     cur: 'sparks', price: 600,  give: { herb: 10 } },
    { id: 'brew5',    name: ru`Целебный отвар`,      desc: ru`5 горшочков: 60% здоровья каждый`,         cur: 'sparks', price: 1200, give: { brew: 5 } },
    // 4.15.1: Мёртвая вода — редкость, в товар дня не попадает. 4.16: один флакон в неделю (week — сколько раз за неделю
    // можно купить, day — за день), а не каждый день на бесплатные монеты
    { id: 'dead1',    name: ru`Мёртвая вода`,        desc: ru`Один флакон в неделю: дух без сил поднимется на 4 часа раньше`, cur: 'zlat', price: 80, give: { deadwater: 1 }, week: 1 },
    { id: 'charm2x',  name: ru`Серебряные обереги`,  desc: ru`10 серебряных оберегов`,                   cur: 'zlat', price: 60,  give: { charm2: 10 }, lvl: 8 },
    { id: 'charm3x',  name: ru`Золотые обереги`,     desc: ru`10 золотых оберегов`,                      cur: 'zlat', price: 120, give: { charm3: 10 }, lvl: 16 },
    // 5.1: Врата Перепутицы — телепорт через Атлас сразу, без перезарядки (за искры — один в день)
    { id: 'gate',     name: ru`Врата Перепутицы`,    desc: ru`Шагнуть в любое место Атласа сразу, без ожидания. Одни в день`, cur: 'sparks', price: 3000, give: { gate: 1 }, day: 1 },
    { id: 'gate3',    name: ru`Трое Врат Перепутицы`, desc: ru`Три мгновенных перехода через Атлас`,     cur: 'zlat', price: 75,  give: { gate: 3 } },
    { id: 'incense',  name: ru`Ладан`,              desc: ru`30 минут духов вокруг вдвое больше`,       cur: 'zlat', price: 50,  give: { incense: 1 } },
    { id: 'cocoon5',  name: ru`Кокон 5 км`,          desc: ru`Необычные и редкие духи`,                  cur: 'zlat', price: 80,  cocoon: 5 },
    { id: 'cocoon10', name: ru`Кокон 10 км`,         desc: ru`Редкие и эпические духи`,                  cur: 'zlat', price: 150, cocoon: 10 },
    { id: 'amulet',   name: ru`Случайный амулет`,    desc: ru`Перуна, Мокоши, Велеса, Сварога или Лады`, cur: 'zlat', price: 200, amulet: true },
    // 4.16: средние покупки — ощутимо, но не «плати и побеждай»: настой опыта на сутки (+25%) — не больше двух в неделю
    // (week: иначе кит пил бы его каждый день), связка ладана — раз в день
    { id: 'xpbrew',   name: ru`Настой опыта`,        desc: ru`Сутки опыта на четверть больше. До двух в неделю`, cur: 'zlat', price: 60, give: { xpbrew: 1 }, day: 1, week: 2 },
    { id: 'incense5', name: ru`Связка ладана`,       desc: ru`5 ладана дешевле, чем по одному. Одна в день`, cur: 'zlat', price: 200, give: { incense: 5 }, day: 1 },
  ],
  // 4.16: Настой опыта — MUL опыта на H часов (пьётся из сумки, пока действует — второй не выпить)
  XP_BREW: { MUL: 1.25, H: 24 },
  bagPrice(n) { return 150 + 50 * n; }, // n — сколько раз сумку уже расширяли
  // 4.15: здоровье духов — общее на всю игру. После боя раны остаются; раненый дух сам восстанавливает REGEN в час,
  // без сил (здоровье 0) — в бой не идёт и поднимается сам на BACK через KO_H часов (по редкости духа: от 2 до 24);
  // 4.15.1: Мёртвая вода сокращает ожидание на ITEMS.deadwater.revive часов, Живая вода духа без сил не поднимает
  // 4.16: усталость — каждый бой (разлом, Капище, вторжение) даёт духам команды очко; очко уходит за REST часов отдыха.
  // Первые FREE боёв подряд даются даром, дальше каждое очко срезает STEP от предела здоровья (не ниже MIN) — ни лечение,
  // ни время выше предела не поднимут: одной командой весь день не провоевать, нужны сменщики
  HP: { REGEN: 0.1, KO_H: { 1: 2, 2: 5, 3: 9, 4: 15, 5: 24 }, BACK: 0.1, TIRED: { FREE: 3, STEP: 0.15, MIN: 0.4, REST: 1 } },
  koMs(sp) { return (this.HP.KO_H[(SP[sp.sid] || {}).rar] || 2) * 3600000; },
  // Товар дня: один из припасов со скидкой 40%, купить можно один раз в день
  shopDeal(day) {
    const pool = this.SHOP.filter(x => (x.give || x.cocoon) && !x.lvl && !x.day && !x.week); // товар дня доступен любому уровню; редкое (day, week) — без скидки
    const it = pool[Math.floor(U.h('deal', day) * pool.length)];
    return { ...it, price: Math.max(1, Math.round(it.price * 0.6)), deal: true };
  },
  // Сезонная тропа: сезон — календарный месяц, 30 ступеней по 40 очков (очки — как в общем деле Ордена)
  PASS: { LEVELS: 30, PER: 40, GOLD: 600, LATE: 25 },
  passLevel(pts) { return Math.min(this.PASS.LEVELS, Math.floor((pts || 0) / this.PASS.PER)); },
  // Награда ступени: free — всем, gold — на Золотой тропе. plvl — уровень Ловчего (4.16: на поздних уровнях
  // Золотая тропа не должна давать то, что уже некуда девать, — см. passGoldLate)
  // 4.16: на бесплатной тропе 55 монет за сезон (было 135), зато на 30-й ступени — Мёртвая вода (редкая, раз в месяц)
  // 5.1.20: искры на Тропе (и на Золотой) — ×10
  passReward(track, lvl, plvl) {
    if (track === 'gold' && plvl >= this.PASS.LATE) return this.passGoldLate(lvl);
    if (track === 'free') {
      // 4.16.0: бесплатная тропа — 29 монет за сезон (было 55)
      if (lvl === 30) return { charm3: 5, deadwater: 1, zlat: 10 };
      if (lvl % 10 === 0) return { cocoon: 5, zlat: 5 };
      if (lvl % 5 === 0) return { incense: 1, zlat: 3 };
      return lvl % 2 ? { charm: 8 } : { honey: 3, sparks: 3000 };
    }
    if (lvl === 30) return { look: 'trail', charm3: 10, cocoon: 10 };
    if (lvl === 15) return { look: '#065f46', zlat: 50 };
    if (lvl % 10 === 0) return { cocoon: 10, zlat: 40 };
    if (lvl % 5 === 0) return { amulet: 1, zlat: 30 };
    if (lvl % 3 === 0) return { charm3: 3, zlat: 15 };
    return lvl % 2 ? { charm2: 5, sparks: 5000 } : { water: 3, sparks: 8000 };
  },
  // 4.16: Золотая тропа с LATE уровня: вместо серебряных оберегов и мелочи — то, что нужно на поздних уровнях:
  // искры на усиление (втрое больше), золотые обереги, целебный отвар, настои опыта; облик и Знак Тропы — как раньше
  passGoldLate(lvl) {
    if (lvl === 30) return { look: 'trail', charm3: 10, xpbrew: 1 };
    if (lvl === 15) return { look: '#065f46', zlat: 50, sparks: 30000 };
    if (lvl % 10 === 0) return { xpbrew: 1, zlat: 40, sparks: 30000 };
    if (lvl % 5 === 0) return { amulet: 1, zlat: 30 };
    if (lvl % 3 === 0) return { charm3: 5, zlat: 15 };
    return lvl % 2 ? { charm3: 3, sparks: 15000 } : { brew: 2, sparks: 25000 };
  },
  // Защитник вернулся с Капища: искры за время на посту (25 в час, не меньше 25 и не больше 1500)
  guardPay(hours) { return Math.min(1500, Math.max(25, Math.round(25 * (hours || 0)))); },
  /* 4.16: Капища не должны навсегда оставаться за кланами.
     Защитник первые FRESH_H часов на посту в полной силе, потом устаёт: к MAX_H часам его уровень падает до (1 − WEAK)
     от своего, а в MAX_H часов он уходит домой (с искрами за службу, как побеждённый). Дань (Rules.ZLAT.tribute и TRIBUTE) —
     только за защитников, которые простояли не меньше TRIBUTE_H часов и ещё на посту («активная защита»), и не больше чем
     за HOLD_MY_MAX Капищ. Доля FREE Капищ — вольные: их не держит ни один клан, там всегда бьётся хранитель.
     4.28: кланы — мифологии; защитник на святилище мифологии своего клана (W.placeMyth) приносит дань ×MYTH (искры и обереги;
     монеты — как с любого Капища). Кланов стало 7+ при тех же Ловчих — на удержание Капищ это не влияет: защитников на
     Капище и Капищ у Ловчего столько же, вольных — та же доля. */
  HOLD: { FRESH_H: 24, MAX_H: 72, WEAK: 0.5, TRIBUTE_H: 4, FREE: 0.25, MYTH: 1.5 },
  holdHours(t, now) { return Math.max(0, ((now == null ? Date.now() : now) - (+t || 0)) / 3600000); },
  holdFresh(h, now) { return !!h && this.holdHours(h.t, now) < this.HOLD.MAX_H; },
  // во сколько раз уменьшен уровень защитника (1 — в полной силе)
  holdK(t, now) { const H = this.HOLD, h = this.holdHours(t, now); return 1 - H.WEAK * U.clamp((h - H.FRESH_H) / (H.MAX_H - H.FRESH_H), 0, 1); },
  // отражение духа на посту: уровень — с учётом усталости
  holdSpirit(sp, t, now) { return { ...sp, lvl: Math.max(1, Math.round((sp.lvl || 1) * this.holdK(t, now))) }; },
  shrineFree(id) { return U.h('freeShrine', String(id)) < this.HOLD.FREE; },
  // 4.28: дань за n Капищ, из них own — святилища мифологии своего клана (там ×HOLD.MYTH; обереги — с округлением вверх)
  tributeFor(n, own) { const k = n + Math.min(own, n) * (this.HOLD.MYTH - 1); return { sparks: Math.round(TRIBUTE.sparks * k), charm: Math.ceil(TRIBUTE.charm * k - 1e-9) }; },
  ORDER_RULES: [
    [ru`Поимка духа`, 1], [ru`Источник`, 1], [ru`500 м пути`, 1], [ru`Кокон`, 3], [ru`Победа в капище`, 3], [ru`Вторжение`, 3], [ru`Разлом`, 5],
  ],

  // Шанс поимки за один бросок. o: { mode, sid, lvl, item, honey, mul }
  catchChance(o) {
    const s = SP[o.sid];
    if (o.mode === 'tut') return 1; // учебного духа поймать можно всегда
    const base = o.mode === 'raid' ? (s.legend ? 0.1 : 0.2)
      : RARITY[s.rar].base * U.clamp(1.15 - o.lvl / 60, 0.55, 1.15) * (o.mode === 'task' ? 1.5 : 1); // дух за поручение ловится легче
    const cm = o.mode === 'raid' ? 1.5 : ITEMS[o.item].mult;
    const mult = cm * (o.honey ? 1.5 : 1) * (o.mul || 1);
    return 1 - Math.pow(1 - U.clamp(base, 0.02, 0.95), mult);
  },
  // Бонус за попадание в кольцо: ring — размер кольца в момент броска (1 — большое, 0.2 — маленькое)
  ringBonus(ring) {
    if (ring == null) return { mul: 1, xp: 0, label: '', great: false };
    const r = U.clamp(+ring || 1, 0.2, 1);
    return r > 0.7 ? { mul: 1.2, xp: 10, label: ru`Хорошо!`, great: false } : r > 0.4 ? { mul: 1.5, xp: 50, label: ru`Отлично!`, great: true } : { mul: 1.8, xp: 100, label: ru`Превосходно!`, great: true };
  },
  // Награда за пойманного духа
  catchReward(o) {
    const s = SP[o.sid], special = o.mode !== 'wild' && o.mode !== 'tut';
    return {
      xp: (special ? 300 : 100) + (o.isNew ? 500 : 0) + (o.ringXp || 0) + (o.throws === 1 ? 50 : 0) + (o.shiny ? 500 : 0),
      ess: (special ? 10 : s.stage === 3 ? 10 : s.stage === 2 ? 5 : 3) + (s.rar - 1) * 2, // редкие — больше эссенции (эпический 1-й стадии: 9 вместо 3)
      sparks: Math.round((special ? 300 : 100) * (o.boost ? 1.25 : 1)),
    };
  },

  // Сколько урона команда может нанести боссу разлома за t секунд (верхняя оценка, с запасом)
  raidMaxDamage(team, boss, t) {
    const bs = Raid.bossStats(boss), bel = SP[boss.boss].el;
    const dps = team.map(sp => {
      const x = S.battle(sp), el = SP[sp.sid].el;
      const fast = Raid.dmg(x.atk, bs.def, 12, el, bel) / 0.32;
      const special = Raid.dmg(x.atk, bs.def, 75, el, bel) / (50 / (6 * (x.energy || 1) / 0.32));
      return fast + special;
    });
    return Math.max(0, ...dps) * Math.max(0, t) * 1.3;
  },
  /* 4.26: бой в разломе глазами сервера (как Raid.tick/bossStrike): первый удар босса — на FIRST с, дальше не реже раза в GAP с
     (замах 0,9 с + пауза до 3,6 с), уклон срезает удар до DODGE. Всё — в пользу игрока: каждый удар уклонён, погода боссу
     не помогает, урон духов — наибольший (как в raidMaxDamage), SLACK — запас сверху, LOSS — доля ран, которую сервер
     засчитает после победы наверняка */
  RAID_SIM: { FIRST: 4.1, GAP: 4.5, DODGE: 0.2, SLACK: 1.5, LOSS: 0.5 },
  // удар босса по духу sp с уклоном, без погоды; bs — Raid.bossStats, bel — стихия босса
  raidHit(bs, bel, sp) {
    const n = Math.floor(0.5 * bs.pw * (bs.atk / S.battle(sp).def) * 1.2 * Raid.eff(bel, SP[sp.sid].el)) + 1;
    return Math.max(1, Math.floor(n * this.RAID_SIM.DODGE));
  },
  // 4.26: может ли команда вообще выстоять, пока наносит нужный урон need (как duelWinnable для Капищ). Каждый дух живёт
  // не дольше, чем выдерживает уклонённые удары (здоровье на входе — hp0, { uid: доля }; нет — здоров), и бьёт с наибольшим
  // уроном; выпитая Живая вода (waters) — полфлакона здоровья тому, кому она выгоднее всего. В совместном бою need — своя доля
  raidWinnable(team, boss, need, hp0, waters = 0) {
    if (!team.length) return false;
    const R = this.RAID_SIM, bs = Raid.bossStats(boss), bel = SP[boss.boss].el;
    const h0 = sp => hp0 && Number.isFinite(+hp0[sp.uid]) ? U.clamp(+hp0[sp.uid], 0, 1) : 1;
    const me = team.map(sp => {
      const max = S.battle(sp).hp * 5, hit = this.raidHit(bs, bel, sp), dps = this.raidMaxDamage([sp], boss, 1) / 1.3;
      return { max, hit, dps, cap: dps * Math.ceil(Math.max(1, Math.round(max * h0(sp))) / hit) * R.GAP };
    });
    const water = Math.max(0, ...me.map(m => m.dps * Math.ceil(m.max / 2 / m.hit) * R.GAP)) * U.clamp(waters | 0, 0, 3);
    return (me.reduce((a, m) => a + m.cap, 0) + water) * R.SLACK >= need;
  },
  // 4.26: сколько здоровья (в единицах разлома: здоровье духа × 5) команда потеряла наверняка, победив: быстрее need / (наибольший
  // урон в секунду) не победить, а за это время босс ударил не меньше стольких раз — каждый удар не слабее уклонённого
  raidMinLoss(team, boss, need) {
    if (!team.length || !(need > 0)) return 0;
    const R = this.RAID_SIM, bs = Raid.bossStats(boss), bel = SP[boss.boss].el, dps = this.raidMaxDamage(team, boss, 1);
    const t = Math.min(90, need / Math.max(1e-9, dps)), strikes = t < R.FIRST ? 0 : Math.floor((t - R.FIRST) / R.GAP) + 1;
    return strikes * Math.min(...team.map(sp => this.raidHit(bs, bel, sp))) * R.LOSS;
  },
  // 4.26: то же на Капище и во вторжении (здоровье духа × Duel.HPX): быстрее, чем за duelFoeHp / наибольший урон, соперника не
  // победить; он бьёт раз в speed…speed+0,25 с игрового времени (первый удар — на 1,5 с, пауза после каждого побеждённого
  // бойца — 1,2 с); два удара могут уйти в щиты, остальные — не слабее быстрого удара без погоды
  duelMinLoss(team, foe, speed) {
    if (!team.length || !foe.length) return 0;
    const dps = this.duelMaxDamage(team, foe, 1);
    const t = Math.min(Duel.TIME, this.duelFoeHp(foe) / Math.max(1e-9, dps)) - 1.5 - 1.2 * (foe.length - 1);
    const acts = Math.max(0, Math.floor(t / ((+speed || 0.85) + 0.25)) - 2);
    const hit = Math.min(...foe.flatMap(f => team.map(m => {
      const y = S.battle(f), x = S.battle(m);
      return Math.floor(0.5 * Duel.FAST * (y.atk / x.def) * 1.2 * Raid.eff(SP[f.sid].el, SP[m.sid].el)) + 1;
    })));
    return acts * hit * this.RAID_SIM.LOSS;
  },
  // 4.26: нижняя граница ран: list — бойцы { max — здоровье в единицах боя, up — выше этой доли быть не может, rep — доля
  // по словам телефона }; команда потеряла не меньше loss единиц — недостающие раны снимаются с бойцов по порядку. Доли — после боя
  woundFloor(list, loss) {
    const out = list.map(x => U.clamp(Math.min(+x.rep, +x.up), 0, 1) || 0);
    let left = loss - list.reduce((a, x, i) => a + Math.max(0, x.up - out[i]) * x.max, 0);
    for (let i = 0; i < list.length && left > 0; i++) {
      const take = Math.min(out[i] * list[i].max, left);
      out[i] -= take / list[i].max; left -= take;
    }
    return out;
  },
  // Сколько урона команда может нанести в поединке за t секунд
  duelMaxDamage(team, foe, t) {
    const dps = team.map(sp => {
      const x = S.battle(sp), el = SP[sp.sid].el;
      return Math.max(...foe.map(f => {
        const y = S.battle(f), fel = SP[f.sid].el;
        return Raid.dmg(x.atk, y.def, Duel.FAST, el, fel) / 0.5 + Raid.dmg(x.atk, y.def, Duel.CHARGE, el, fel) / (Duel.COST / (7 * (x.energy || 1) / 0.5));
      }));
    });
    return Math.max(0, ...dps) * Math.max(0, t) * 1.3;
  },
  duelFoeHp(foe) { return foe.reduce((a, f) => a + S.battle(f).hp * Duel.HPX, 0); },
  // 4.3: может ли эта команда вообще победить этого соперника. Соперник бьёт сам раз в speed…speed+0,25 с игрового
  // времени, увернуться нельзя. Победа — либо убить его команду раньше, чем он убьёт твою, либо дожить до таймера и
  // остаться «здоровее» (у кого больше доля здоровья). Всё считается в пользу игрока: его урон — максимальный (как в
  // duelMaxDamage), урон соперника — только быстрые удары, слабейшие из возможных; щиты и приёмы соперника не считаются.
  // Честный бой не отклоняется, а слабая команда против сильного соперника «победить» не может.
  // 4.16: hp0 — здоровье духов на входе в бой ({ uid: доля }, с раной и усталостью); нет — считаем здоровыми
  duelWinnable(team, foe, speed, hp0) {
    if (!team.length || !foe.length) return false;
    const h0 = sp => hp0 && Number.isFinite(+hp0[sp.uid]) ? U.clamp(+hp0[sp.uid], 0, 1) : 1;
    const me = team.map(sp => ({ x: S.battle(sp), el: SP[sp.sid].el, h: h0(sp) })), fo = foe.map(sp => ({ x: S.battle(sp), el: SP[sp.sid].el }));
    const hit = Math.min(...fo.flatMap(f => me.map(m => Raid.dmg(f.x.atk, m.x.def, Duel.FAST, f.el, m.el))));
    const foeDps = hit / ((+speed || 0.85) + 0.25), myDps = this.duelMaxDamage(team, foe, 1);
    const survive = me.reduce((a, m) => a + m.x.hp * Duel.HPX * m.h, 0) / foeDps; // дольше команда не проживёт
    const kill = this.duelFoeHp(foe) / myDps;                               // быстрее соперника не убить
    if (kill <= survive) return true;
    if (survive < Duel.TIME) return false;
    const meMax = Math.max(...me.map(m => m.x.hp * Duel.HPX)), foeMin = Math.min(...fo.map(f => f.x.hp * Duel.HPX));
    const meShare = Math.max(0, me.reduce((a, m) => a + m.h, 0) / me.length - foeDps * Duel.TIME / (me.length * meMax));
    const foeShare = Math.max(0, 1 - myDps * Duel.TIME / (fo.length * foeMin));
    return meShare >= foeShare;
  },
};
