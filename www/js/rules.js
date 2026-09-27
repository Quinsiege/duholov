'use strict';
/* Правила, общие для сервера и телефона. Сервер по ним принимает решения,
   телефон — показывает (цвет кольца, награды, подсказки). */

const Rules = {
  QUEST_BONUS: { charm: 10, honey: 3, incense: 1, sparks: 1000 },
  // 4.16: опыт за задание дня и за сундук дня (было 300 и 1000) — ежедневные цели заметнее для тех, кто играет понемногу
  QUEST_XP: 500, QUEST_BONUS_XP: 2500,
  PLACE_REWARD: { xp: 1000, sparks: 500, charm: 10 },
  SUPPLY: { charm: 15, honey: 2, water: 1 },
  THROWABLE: ['charm', 'charm2', 'charm3'],
  COUNTDOWN: 3.2, // секунды обратного отсчёта перед боем

  // Серия дней: награда за первый вход в игру за день, по кругу из 7 дней
  STREAK: [
    { charm: 5, xp: 200 },
    { honey: 3, xp: 300 },
    { charm: 8, water: 1, xp: 400 },
    { charm2: 3, gift: 1, xp: 500 },
    { incense: 1, honey: 2, xp: 600 },
    { charm2: 5, water: 2, xp: 800 },
    { charm3: 3, sparks: 1500, xp: 1500 }, // 7-й день — ещё и кокон 10 км
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
  /* ---------- 3.12: златники, Лавка Ордена, Сезонная тропа ---------- */
  // Златники — вторая валюта: за серию дней, сундук дня, уровни, главы Летописи, дань и Тропу
  ZLAT: { streak: 5, streak7: 30, questBonus: 10, level: 20, story: 50, tribute: 3 },
  BAG_STEP: 50, BAG_MAX_UP: 10,
  // 3.15: Казна — златники за рубли (оплата через ЮKassa; цену и число златников сервер берёт отсюда, а не с телефона)
  PAY: [
    { id: 'z100',  zlat: 100,  rub: 99 },
    { id: 'z330',  zlat: 330,  rub: 299,  bonus: 10 },
    { id: 'z575',  zlat: 575,  rub: 499,  bonus: 15 },
    { id: 'z1200', zlat: 1200, rub: 999,  bonus: 20, hot: true },
    { id: 'z2600', zlat: 2600, rub: 1990, bonus: 30 },
  ],
  // 3.20: дневные лимиты объектов карты (сутки — по часам игрока). Считаются только успехи: зачерпнутый родник,
  // победа в Разломе, на Капище и во вторжении, пойманный дикий дух. Обычной игре не мешают (20–40 поимок,
  // 10–20 родников в день), а бесконечный фарм и боты упираются в потолок
  DAILY: { springs: 30, raids: 6, duels: 8, invasions: 6, catches: 120 },
  DAILY_NAMES: { springs: ru`Родники`, raids: ru`Разломы`, duels: ru`Капища`, invasions: ru`Вторжения`, catches: ru`Поимки` },
  dayUsed(d, key) { return d && d.dayc && d.dayc.day === U.today() ? (d.dayc[key] || 0) : 0; },
  // строка «Родников сегодня: 12 из 30» для окон объектов
  dayLine(d, key, what) { const u = this.dayUsed(d, key), m = this.DAILY[key]; return `<div class="day-left ${u >= m ? 'out' : ''}">${u >= m ? ru`${what} сегодня: <b>${u}</b> из ${m} — завтра снова` : ru`${what} сегодня: <b>${u}</b> из ${m}`}</div>`; },
  // 3.18: Чат Ордена — писать с LEVEL уровня; не чаще раза в GAP мс и PER_DAY сообщений в сутки; до MAX символов
  CHAT: { LEVEL: 3, MAX: 200, GAP: 3000, PER_DAY: 300 },
  CHAT_CHANNELS: [['all', ru`Общий`], ['trade', ru`Торговля`], ['raid', ru`Разломы`], ['help', ru`Помощь`], ['clan', ru`Дружина`]],
  // 3.17: Аукцион духов — с LEVEL уровня (4.16: было 5); лот живёт HOURS часов; комиссия FEE с продажи (платит продавец)
  AUCTION: { LEVEL: 15, FEE: 0.1, HOURS: 72, MAX_OPEN: 5, PER_DAY: 20, MIN: { sparks: 100, zlat: 1 }, MAX: { sparks: 10000000, zlat: 100000 } },
  auctionFee(price) { return Math.max(1, Math.ceil(price * this.AUCTION.FEE)); },
  // 3.14: обменник — SPARKS искр → ZLAT златников за один обмен, не больше DAY обменов в день
  EXCHANGE: { SPARKS: 500, ZLAT: 10, DAY: 3 },
  // 3.13: Дальний пропуск — Разлом до R м от игрока; каждый день Орден дарит один, если их меньше KEEP
  FAR: { R: 5000, KEEP: 3 },
  // cur — валюта: sparks (искры) или zlat (златники). give — предметы; cocoon — кокон; amulet — случайный амулет
  SHOP: [
    { id: 'bag',      name: ru`Расширение сумки`,    desc: ru`+50 мест в сумке навсегда`,                cur: 'zlat', bag: true },
    { id: 'farpass',  name: ru`Дальний пропуск`,     desc: ru`Закрыть Разлом до 5 км, не подходя к нему`, cur: 'sparks', price: 1000, give: { farpass: 1 } },
    { id: 'farpass3', name: ru`Три дальних пропуска`, desc: ru`Три грамоты на дальние Разломы`,          cur: 'zlat', price: 45,  give: { farpass: 3 } }, // выгоднее трёх за искры (по курсу обменника 45 зл ≈ ✦ 2250)
    { id: 'charm20', name: ru`Связка оберегов`,     desc: ru`20 оберегов`,                              cur: 'sparks', price: 1500, give: { charm: 20 } },
    { id: 'honey5',   name: ru`Горшок мёда`,         desc: ru`5 мёда`,                                   cur: 'sparks', price: 1200, give: { honey: 5 } },
    { id: 'water5',   name: ru`Живая вода`,          desc: ru`5 флаконов: половина здоровья, в разломе — прямо в бою`, cur: 'sparks', price: 1500, give: { water: 5 } },
    { id: 'herb10',   name: ru`Пучок подорожника`,   desc: ru`10 листьев: четверть здоровья каждый`,     cur: 'sparks', price: 600,  give: { herb: 10 } },
    { id: 'brew5',    name: ru`Целебный отвар`,      desc: ru`5 горшочков: 60% здоровья каждый`,         cur: 'sparks', price: 1200, give: { brew: 5 } },
    // 4.15.1: Мёртвая вода — редкость: в Лавке один флакон в день (day — сколько раз в день можно купить), в товар дня не попадает
    { id: 'dead1',    name: ru`Мёртвая вода`,        desc: ru`Один флакон в день: дух без сил поднимется на 4 часа раньше`, cur: 'zlat', price: 60, give: { deadwater: 1 }, day: 1 },
    { id: 'charm2x',  name: ru`Серебряные обереги`,  desc: ru`10 серебряных оберегов`,                   cur: 'zlat', price: 60,  give: { charm2: 10 }, lvl: 8 },
    { id: 'charm3x',  name: ru`Золотые обереги`,     desc: ru`10 золотых оберегов`,                      cur: 'zlat', price: 120, give: { charm3: 10 }, lvl: 16 },
    { id: 'incense',  name: ru`Ладан`,               desc: ru`30 минут духов вокруг вдвое больше`,       cur: 'zlat', price: 50,  give: { incense: 1 } },
    { id: 'cocoon5',  name: ru`Кокон 5 км`,          desc: ru`Необычные и редкие духи`,                  cur: 'zlat', price: 80,  cocoon: 5 },
    { id: 'cocoon10', name: ru`Кокон 10 км`,         desc: ru`Редкие и эпические духи`,                  cur: 'zlat', price: 150, cocoon: 10 },
    { id: 'amulet',   name: ru`Случайный амулет`,    desc: ru`Перуна, Мокоши, Велеса, Сварога или Лады`, cur: 'zlat', price: 200, amulet: true },
  ],
  bagPrice(n) { return 150 + 50 * n; }, // n — сколько раз сумку уже расширяли
  // 4.15: здоровье духов — общее на всю игру. После боя раны остаются; раненый дух сам восстанавливает REGEN в час,
  // без сил (здоровье 0) — в бой не идёт и поднимается сам на BACK через KO_H часов (по редкости духа: от 2 до 24);
  // 4.15.1: Мёртвая вода сокращает ожидание на ITEMS.deadwater.revive часов, Живая вода духа без сил не поднимает
  HP: { REGEN: 0.1, KO_H: { 1: 2, 2: 5, 3: 9, 4: 15, 5: 24 }, BACK: 0.1 },
  koMs(sp) { return (this.HP.KO_H[(SP[sp.sid] || {}).rar] || 2) * 3600000; },
  // Товар дня: один из припасов со скидкой 40%, купить можно один раз в день
  shopDeal(day) {
    const pool = this.SHOP.filter(x => (x.give || x.cocoon) && !x.lvl && !x.day); // товар дня доступен любому уровню; редкое (day) — без скидки
    const it = pool[Math.floor(U.h('deal', day) * pool.length)];
    return { ...it, price: Math.max(1, Math.round(it.price * 0.6)), deal: true };
  },
  // Сезонная тропа: сезон — календарный месяц, 30 ступеней по 40 очков (очки — как в общем деле Ордена)
  PASS: { LEVELS: 30, PER: 40, GOLD: 600 },
  passLevel(pts) { return Math.min(this.PASS.LEVELS, Math.floor((pts || 0) / this.PASS.PER)); },
  // Награда ступени: free — всем, gold — на Золотой тропе
  passReward(track, lvl) {
    if (track === 'free') {
      if (lvl === 30) return { charm3: 5, zlat: 50 };
      if (lvl % 10 === 0) return { cocoon: 5, zlat: 20 };
      if (lvl % 5 === 0) return { incense: 1, zlat: 15 };
      return lvl % 2 ? { charm: 8 } : { honey: 3, sparks: 300 };
    }
    if (lvl === 30) return { look: 'trail', charm3: 10, cocoon: 10 };
    if (lvl === 15) return { look: '#065f46', zlat: 50 };
    if (lvl % 10 === 0) return { cocoon: 10, zlat: 40 };
    if (lvl % 5 === 0) return { amulet: 1, zlat: 30 };
    if (lvl % 3 === 0) return { charm3: 3, zlat: 15 };
    return lvl % 2 ? { charm2: 5, sparks: 500 } : { water: 3, sparks: 800 };
  },
  // Защитник вернулся с Капища: искры за время на посту (25 в час, не меньше 25 и не больше 1500)
  guardPay(hours) { return Math.min(1500, Math.max(25, Math.round(25 * (hours || 0)))); },
  ORDER_RULES: [
    [ru`Поимка духа`, 1], [ru`Родник`, 1], [ru`500 м пути`, 1], [ru`Кокон`, 3], [ru`Победа в капище`, 3], [ru`Вторжение`, 3], [ru`Разлом`, 5],
  ],

  // Шанс поимки за один бросок. o: { mode, sid, lvl, item, honey, mul }
  catchChance(o) {
    const s = SP[o.sid];
    if (o.mode === 'tut') return 1; // учебного духа поймать можно всегда
    const base = o.mode === 'story' ? 0.5 : o.mode === 'raid' ? (s.legend ? 0.1 : 0.2)
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
  duelWinnable(team, foe, speed) {
    if (!team.length || !foe.length) return false;
    const me = team.map(sp => ({ x: S.battle(sp), el: SP[sp.sid].el })), fo = foe.map(sp => ({ x: S.battle(sp), el: SP[sp.sid].el }));
    const hit = Math.min(...fo.flatMap(f => me.map(m => Raid.dmg(f.x.atk, m.x.def, Duel.FAST, f.el, m.el))));
    const foeDps = hit / ((+speed || 0.85) + 0.25), myDps = this.duelMaxDamage(team, foe, 1);
    const survive = me.reduce((a, m) => a + m.x.hp * Duel.HPX, 0) / foeDps; // дольше команда не проживёт
    const kill = this.duelFoeHp(foe) / myDps;                               // быстрее соперника не убить
    if (kill <= survive) return true;
    if (survive < Duel.TIME) return false;
    const meMax = Math.max(...me.map(m => m.x.hp * Duel.HPX)), foeMin = Math.min(...fo.map(f => f.x.hp * Duel.HPX));
    const meShare = Math.max(0, 1 - foeDps * Duel.TIME / (me.length * meMax));
    const foeShare = Math.max(0, 1 - myDps * Duel.TIME / (fo.length * foeMin));
    return meShare >= foeShare;
  },
};
