'use strict';
/* Правила, общие для сервера и телефона. Сервер по ним принимает решения,
   телефон — показывает (цвет кольца, награды, подсказки). */

const Rules = {
  QUEST_BONUS: { charm: 10, honey: 3, incense: 1, sparks: 1000 },
  TUT_REWARD: { charm: 10, honey: 3, xp: 300 },
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
  ORDER_RULES: [
    ['Поимка духа', 1], ['Родник', 1], ['500 м пути', 1], ['Кокон', 3], ['Победа в капище', 3], ['Вторжение', 3], ['Разлом', 5],
  ],

  // Шанс поимки за один бросок. o: { mode, sid, lvl, item, honey, mul }
  catchChance(o) {
    const s = SP[o.sid];
    if (o.mode === 'tut') return 1; // учебного духа поймать можно всегда
    const base = o.mode === 'story' ? 0.5 : o.mode === 'raid' ? (s.legend ? 0.1 : 0.2) : RARITY[s.rar].base * U.clamp(1.15 - o.lvl / 60, 0.55, 1.15);
    const cm = o.mode === 'raid' ? 1.5 : ITEMS[o.item].mult;
    const mult = cm * (o.honey ? 1.5 : 1) * (o.mul || 1);
    return 1 - Math.pow(1 - U.clamp(base, 0.02, 0.95), mult);
  },
  // Бонус за попадание в кольцо: ring — размер кольца в момент броска (1 — большое, 0.2 — маленькое)
  ringBonus(ring) {
    if (ring == null) return { mul: 1, xp: 0, label: '', great: false };
    const r = U.clamp(+ring || 1, 0.2, 1);
    return r > 0.7 ? { mul: 1.2, xp: 10, label: 'Хорошо!', great: false } : r > 0.4 ? { mul: 1.5, xp: 50, label: 'Отлично!', great: true } : { mul: 1.8, xp: 100, label: 'Превосходно!', great: true };
  },
  // Награда за пойманного духа
  catchReward(o) {
    const s = SP[o.sid], special = o.mode !== 'wild' && o.mode !== 'tut';
    return {
      xp: (special ? 300 : 100) + (o.isNew ? 500 : 0) + (o.ringXp || 0) + (o.throws === 1 ? 50 : 0) + (o.shiny ? 500 : 0),
      ess: special ? 10 : s.stage === 3 ? 10 : s.stage === 2 ? 5 : 3,
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
};
