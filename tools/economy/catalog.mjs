// Справочник экономики: откуда приходит и куда уходит каждая валюта и ресурс — с числами из загруженной игры и ссылкой
// «файл:строка» (ref находит строку по тексту: правки кода ссылку не сломают, а пропавший текст — ошибка при запуске).
import { ref, chestEV } from './load.mjs';

const D = 'www/js/data.js', RU = 'www/js/rules.js', ST = 'www/js/state.js', CO = 'server/game/core.js', LG = 'www/js/league.js',
  SR = 'www/js/season-rewards.js', WO = 'www/js/world.js', EV = 'www/js/events.js', RA = 'www/js/raid.js';
const n = x => (typeof x === 'number' ? (Math.round(x * 100) / 100).toLocaleString('ru-RU') : x);
const rw = o => Object.entries(o || {}).filter(([, v]) => v).map(([k, v]) => `${NAMES[k] || k} ${n(v)}`).join(', ');
export const NAMES = {
  sparks: '✦', zlat: 'монет', xp: 'опыта', charm: 'оберег', charm2: 'серебр. оберег', charm3: 'золот. оберег', honey: 'мёд', herb: 'подорожник',
  brew: 'отвар', water: 'Живая вода', deadwater: 'Мёртвая вода', incense: 'ладан', farpass: 'Дальний пропуск', gate: 'Врата', xpbrew: 'настой опыта',
  gift: 'подарок', rod: 'эссенция Рода', alatyr: 'осколок Алатыря', cocoon: 'кокон, км', amulet: 'амулет', amuletPick: 'амулет на выбор', look: 'облик', ess: 'эссенция',
};
export const RES = [
  ['sparks', 'Искры ✦'], ['zlat', 'Монеты (златники)'], ['xp', 'Опыт'], ['charm', 'Обереги (все три вида)'], ['honey', 'Мёд'], ['incense', 'Ладан'],
  ['water', 'Живая вода'], ['deadwater', 'Мёртвая вода'], ['herb', 'Подорожник и Целебный отвар'], ['gate', 'Врата Перепутицы'], ['farpass', 'Дальний пропуск'],
  ['xpbrew', 'Настой опыта'], ['gift', 'Подарки'], ['amulet', 'Амулеты'], ['cocoon', 'Коконы'], ['ess', 'Эссенция семейств'], ['rod', 'Эссенция Рода'],
  ['alatyr', 'Осколки Алатыря'], ['look', 'Облики (косметика)'], ['bag', 'Места в сумке'], ['tickets', 'Жетоны Лиги'],
];

// сумма наград таблицы ступеней (Тропа)
function sum(list) { const o = {}; for (const x of list) for (const [k, v] of Object.entries(x)) if (typeof v === 'number') o[k] = (o[k] || 0) + v; return o; }

export function sources(G) {
  const { Rules, S, LEAGUE_RANKS, League, SeasonRewards, TUT_CHAPTERS, CAMPAIGN, QUEST_TEMPLATES, TASK_TIERS, SHRINE_TIERS, MEDAL_TIERS, MEDALS, FRIEND_LEVELS, TRIBUTE, Raid, XP_DAY, GameCore, COCOON_TIERS } = G;
  const free = sum(Rules.PASS_FREE), gold = sum(Rules.PASS_GOLD), steps = CAMPAIGN[0].steps, cr = (id, k) => steps.find(s => s.id === id).reward[k];
  const lr = k => LEAGUE_RANKS.map((x, i) => x.reward && x.reward[k] ? `${x.name} ${n(x.reward[k])}` : null).filter(Boolean).join(', ');
  const lrSum = k => LEAGUE_RANKS.reduce((a, x) => a + ((x.reward || {})[k] || 0), 0);
  const ala = k => SeasonRewards.TIERS.filter(t => t.rw[k]).map(t => `${t.n}+: ${n(t.rw[k])}`).join(', ');
  const q = k => QUEST_TEMPLATES.filter(t => t.reward[k]).map(t => `${t.t} ${t.reward[k]}`).join(', ');
  const streak = k => Rules.STREAK.map((x, i) => (x[k] ? `д${i + 1}: ${x[k]}` : null)).filter(Boolean).join(', ');
  const lvl = l => S.levelRewards(l);
  const shop = id => Rules.SHOP.find(x => x.id === id);
  const order = k => Rules.ORDER.STEPS.map((s, i) => (s.reward[k] ? `ступень ${i + 1}: ${s.reward[k]}` : null)).filter(Boolean).join(', ');
  const springW = (L, k) => { const o = G.W.springOpts(L), t = o.reduce((a, x) => a + x[1], 0), w = (o.find(x => x[0] === k) || [0, 0])[1]; return 5 * w / t; };
  const R = [];
  const add = (res, src, amount, freq, r) => R.push({ res, src, amount: String(amount), freq, ref: r });

  // ---------- искры ----------
  add('sparks', 'Старт новой игры', 500, 'разово', ref(ST, 'sparks: 500'));
  add('sparks', 'Обучение (4 главы)', TUT_CHAPTERS.map(c => c.reward.sparks || 0).join(' + '), 'разово', ref(D, "{ title: ru`Прогулки`"));
  add('sparks', 'Кампания, гл. I', `шаг 5: ${n(cr('c1s5', 'sparks'))}, шаг 6: ${n(cr('c1s6', 'sparks'))}, шаг 9: ${n(cr('c1s9', 'sparks'))}`, 'разово', ref(D, "id: 'c1s5'"));
  add('sparks', 'Поимка дикого духа', '100 (×1,25 — дух в свою погоду)', 'за поимку; до 120 поимок в день', ref(RU, 'sparks: Math.round((special ? 300 : 100)'));
  add('sparks', 'Поимка босса разлома, духа поручения, омрачённого', 300, 'за поимку', ref(RU, 'sparks: Math.round((special ? 300 : 100)'));
  add('sparks', 'Кокон', '150 × км (2 км — 300, 10 км — 1 500)', 'за кокон', ref(ST, 'this.d.sparks += c.km * 150'));
  add('sparks', 'Задания дня', q('sparks'), '3 задания в день', ref(D, 'const QUEST_TEMPLATES'));
  add('sparks', 'Сундук дня (все 3 задания)', `${Rules.CHEST.SPARKS.join('–')} (в среднем ${n(chestEV(Rules).sparks)})`, 'в день', ref(RU, 'CHEST: {'));
  add('sparks', 'Серия дней', streak('sparks'), 'на 7-й день серии', ref(RU, '{ charm3: 3, sparks: 1000, gate: 1, xp: 1500 }'));
  add('sparks', 'Разлом (победа)', '350 × ступень (350 / 700 / 1 050)', 'до 6 побед в день', ref(CO, 'sparks: 350 * tier'));
  add('sparks', 'Капище (победа над хранителем)', Object.values(SHRINE_TIERS).map(t => n(t.sparks)).join(' / ') + ' (×2 в Неделю поединков)', 'до 8 побед в день', ref(D, "1: { title: ru`Ученик`"));
  add('sparks', 'Вторжение Нави (победа)', 400, 'до 6 в день', ref(CO, '{ xp: 1000, sparks: 400, charm: 6, honey: 1, herb: 1 }'));
  add('sparks', 'Поединок с другом', 300, 'до 3 в день', ref(CO, '{ xp: 800, sparks: 300, charm: 3, honey: 1 }'));
  add('sparks', 'Дань Капищ клана', `${TRIBUTE.sparks} за Капище (×${Rules.HOLD.MYTH} — святилище своей мифологии)`, `в день, до ${G.HOLD_MY_MAX} Капищ`, ref(D, 'const TRIBUTE'));
  add('sparks', 'Защитник вернулся с Капища', '25 в час на посту (до 1 500)', 'за смену ≤ 72 ч', ref(RU, 'guardPay(hours)'));
  add('sparks', 'Общее дело Ордена', order('sparks'), 'в неделю (Орден дошёл до ступени, свой вклад ≥ 15 / 80)', ref(RU, '{ at: 1 / 3, need: 15'));
  add('sparks', 'Сезонная тропа (бесплатная)', `${n(Rules.PASS_FREE[0].sparks)}…${n(Rules.PASS_FREE[29].sparks)} за ступень; ${n(free.sparks)} за 30 ступеней`, 'в календарный месяц', ref(RU, 'PASS_FREE: ['));
  add('sparks', 'Золотая тропа', `${n(gold.sparks)} за 30 ступеней`, 'в месяц (за 600 монет)', ref(RU, 'PASS_GOLD: ['));
  add('sparks', 'Ранги Лиги', `${lr('sparks')}; всего ${n(lrSum('sparks'))}`, 'раз в сезон (сезон = сезон Алатыря)', ref(LG, "{ name: ru`Медь`"));
  add('sparks', 'Сундук Лиги за прошлый сезон', '4 000 × номер высшей лиги (Легенда — 36 000)', 'раз в сезон', ref(LG, 'prize(r)'));
  add('sparks', 'Итоги сезона Алатыря', ala('sparks'), 'раз в сезон', ref(SR, '{ n: 1,  name'));
  add('sparks', 'Приглашение друга (новичку)', GameCore.INVITE_WELCOME.sparks, 'разово', ref(CO, 'INVITE_WELCOME:'));
  add('sparks', 'Аукцион — продажа духа', 'цена − 10% комиссии (+ залог обратно)', 'перераспределение между игроками', ref(RU, 'AUCTION: {'));
  add('sparks', 'Промокод', 'до 1 000 000', 'по коду', ref(CO, "if (k === 'zlat' || k === 'sparks') rw[k] = Math.min(v, 1000000)"));

  // ---------- монеты ----------
  add('zlat', 'Обучение', TUT_CHAPTERS[3].reward.zlat, 'разово', ref(D, "{ title: ru`Прогулки`"));
  add('zlat', 'Кампания: шаг 9', cr('c1s9', 'zlat'), 'разово', ref(D, "id: 'c1s9'"));
  add('zlat', 'Обменник по курсу Кампании (шаг 6)', `✦ 1 000 → ${Rules.EXCHANGE.CAMP}, 5 обменов (50 монет)`, 'разово', ref(RU, 'EXCHANGE:'));
  add('zlat', 'Обменник', `✦ ${n(Rules.EXCHANGE.SPARKS)} → ${Rules.EXCHANGE.ZLAT}`, `до ${Rules.EXCHANGE.DAY} обменов в день`, ref(RU, 'EXCHANGE:'));
  add('zlat', 'Серия дней', `${Rules.ZLAT.streak} в день, ${Rules.ZLAT.streak7} на 7-й (11 за неделю)`, 'в день', ref(RU, 'ZLAT: {'));
  add('zlat', 'Сундук дня', `случайный приз, в среднем ${chestEV(Rules).zlat.toFixed(2)}`, 'в день', ref(RU, "['zlat', 18"));
  add('zlat', 'Новый уровень', `${Rules.ZLAT.level}, каждый 5-й — ${Rules.ZLAT.level5} (до 40-го: ${[...Array(39)].reduce((a, _, i) => a + (lvl(i + 2).zlat || 0), 0)})`, 'за уровень', ref(ST, 'zlat: l % 5 ? Rules.ZLAT.level : Rules.ZLAT.level5'));
  add('zlat', 'Дань Капищ', `${Rules.ZLAT.tribute} за Капище, не больше ${Rules.ZLAT.tributeMax}`, 'в день', ref(RU, 'ZLAT: {'));
  add('zlat', 'Сезонная тропа (бесплатная)', `${free.zlat} (ступени 10 и 30)`, 'в месяц', ref(RU, 'PASS_FREE: ['));
  add('zlat', 'Золотая тропа', `${gold.zlat || 0} (с 5.1.21 монет нет)`, 'в месяц', ref(RU, 'PASS_GOLD: ['));
  add('zlat', 'Кокон Тропы / Кампании, когда коконов 9', 10, 'вместо кокона', ref(CO, 'zlat: (rw.zlat || 0) + 10'));
  add('zlat', 'Облик Кампании, если все облики уже есть', 300, 'разово', ref(CO, 'S.giveRewards({ zlat: 300 })'));
  add('zlat', 'Итоги сезона Алатыря', `${ala('zlat')} (сумма до ${SeasonRewards.TIERS.reduce((a, t) => a + (t.rw.zlat || 0), 0)})`, 'раз в сезон', ref(SR, '{ n: 5,  name'));
  add('zlat', 'Казна (за рубли)', Rules.PAY.map(p => `${p.zlat} за ${p.rub} ₽`).join(', '), 'покупка', ref(RU, "{ id: 'z100'"));
  add('zlat', 'Аукцион — продажа за монеты', 'цена − 10%', 'между игроками', ref(RU, 'AUCTION: {'));
  add('zlat', 'Промокод', 'до 1 000 000', 'по коду', ref(CO, "if (k === 'zlat' || k === 'sparks') rw[k] = Math.min(v, 1000000)"));

  // ---------- опыт ----------
  add('xp', 'Поимка дикого духа', '100 + 500 новый вид + 10/50/100 кольцо + 50 с первого броска + 500 сияющий', 'за поимку', ref(RU, 'xp: (special ? 300 : 100) + (o.isNew ? 500 : 0)'));
  add('xp', 'Поимка босса / духа поручения / омрачённого', '300 (+500 новый вид)', 'за поимку', ref(RU, 'xp: (special ? 300 : 100) + (o.isNew ? 500 : 0)'));
  add('xp', 'Источник', 50, 'до 30 в день', ref(CO, '{ ...loot, xp: 50 }'));
  add('xp', 'Разлом', '1 000 × ступень (×1,25 совместный)', 'до 6 в день', ref(CO, 'xp: Math.round(1000 * tier'));
  add('xp', 'Капище', Object.values(SHRINE_TIERS).map(t => n(t.xp)).join(' / ') + ' (×2 в Неделю поединков)', 'до 8 в день', ref(D, "1: { title: ru`Ученик`"));
  add('xp', 'Вторжение / очищение', '1 000 / 1 000', 'до 6 в день', ref(CO, '{ xp: 1000, sparks: 400, charm: 6, honey: 1, herb: 1 }'));
  add('xp', 'Эволюция', '1 000 новый вид, 200 повтор', 'за эволюцию', ref(ST, 'this.addXP(isNew ? 1000 : 200)'));
  add('xp', 'Кокон', '100 × км (+500 новый вид)', 'за кокон', ref(ST, 'this.addXP(c.km * 100'));
  add('xp', 'Задание дня / сундук дня', `${Rules.QUEST_XP} / ${Rules.CHEST.XP.join('–')}`, 'в день', ref(RU, 'QUEST_XP: 500'));
  add('xp', 'Поручение источника', '250 × ступень + дух встречи (300)', 'до 5 открытых', ref(CO, 'xp: 250 * q.tier'));
  add('xp', 'Серия дней', Rules.STREAK.map(x => x.xp).join(' / '), 'в день', ref(RU, 'STREAK: ['));
  add('xp', 'Лига', `победа ${League.XP.win}, ничья ${League.XP.draw}, поражение ${League.XP.loss}`, `первые ${League.XP_RUNS} боёв дня`, ref(LG, 'XP: { win: 500'));
  add('xp', 'Поединок с другом', '800 (сверх 3 в день — 100)', 'до 3 в день', ref(CO, '{ xp: 800, sparks: 300, charm: 3, honey: 1 }'));
  add('xp', 'Подарок друга', '100 + 50 × ступень дружбы', 'по подарку от каждого друга в день', ref(CO, 'xp: 100 + (() => {'));
  add('xp', 'Ступени дружбы', FRIEND_LEVELS.filter(x => x.xp).map(x => `${x.name} ${n(x.xp)}`).join(', '), 'за друга', ref(D, 'const FRIEND_LEVELS'));
  add('xp', 'Знаки Ордена (23 знака × 3 ступени)', `${MEDAL_TIERS.map(t => n(t.xp)).join(' / ')}; всего ${n(MEDALS.length * MEDAL_TIERS.reduce((a, t) => a + t.xp, 0))}`, 'разово, без дневного потолка', ref(D, 'const MEDAL_TIERS'));
  add('xp', 'Обучение', TUT_CHAPTERS.map(c => c.reward.xp).join(' + '), 'разово', ref(D, 'const TUT_CHAPTERS'));
  add('xp', 'Кампания, гл. I', 'до уровней 4…9 + 2 500…10 000 за шаг', 'разово', ref(D, "id: 'c1s1'"));
  add('xp', 'Одобренное место', Rules.PLACE_REWARD.xp, 'за место', ref(RU, 'PLACE_REWARD:'));
  add('xp', 'Множители', `Звездопад ×2 (1 неделя из ${G.WEEK_EVENTS.length}), Масленица ×1,5, Настой ×${Rules.XP_BREW.MUL} на ${Rules.XP_BREW.H} ч, опыт отдыха ×2 (${n(XP_DAY.REST)} за день без игры)`, '', ref(D, 'const XP_DAY'));
  add('xp', 'Дневной потолок', `до ${n(XP_DAY.FULL)} — полностью, до ${n(XP_DAY.HALF)} — вполовину, дальше — четверть (разовые награды — без потолка)`, 'в день', ref(D, 'const XP_DAY'));

  // ---------- обереги ----------
  add('charm', 'Старт / обучение', `30 / ${TUT_CHAPTERS.map(c => c.reward.charm || 0).join(' + ')}`, 'разово', ref(ST, 'items: { charm: 30'));
  add('charm', 'Источник', `~${n(springW(20, 'charm'))} обычных, ${n(springW(20, 'charm2'))} серебр. (с 8 ур.), ${n(springW(20, 'charm3'))} золот. (с 16 ур.) из 4–6 предметов`, 'до 30 в день', ref(WO, 'springOpts(lvl)'));
  add('charm', 'Задания дня', q('charm') + '; серебр.: ' + q('charm2'), '3 в день', ref(D, 'const QUEST_TEMPLATES'));
  add('charm', 'Сундук дня', `случайный приз, в среднем ${chestEV(Rules).charm.toFixed(1)}; серебр. ${chestEV(Rules).charm2.toFixed(1)}; золот. ${chestEV(Rules).charm3.toFixed(2)}`, 'в день', ref(RU, "['charm', 24"));
  add('charm', 'Серия дней', `обычн. ${streak('charm')}; серебр. ${streak('charm2')}; золот. ${streak('charm3')}`, 'в день', ref(RU, 'STREAK: ['));
  add('charm', 'Новый уровень', `10 + уровень; серебр. 4 (на 8-м — 10); золот. 3 (на 16-м — 10)`, 'за уровень', ref(ST, 'const r = { charm: 10 + l'));
  add('charm', 'Разлом / Капище / вторжение', '5 (+3 серебр. со 2-й ступени) / 5 (+3 серебр., +2 золот. на 3-й) / 6', 'за победу', ref(CO, 'sparks: 350 * tier, charm: 5'));
  add('charm', 'Подарок друга', '3–6 (+2 серебр. с «Друга», +1 золот. с «Лучшего друга»)', 'в день от каждого друга', ref(CO, 'c = { charm: 3 + Math.floor(r() * 4) }'));
  add('charm', 'Спутник', '3 обереги в 5 из 8 «третьих» находок', 'по пути', ref(ST, "U.weighted([['charm', 5], ['honey', 2], ['water', 1]]"));
  add('charm', 'Поручение', Object.entries(TASK_TIERS).map(([t, x]) => `${t}-я: ${rw(x.reward)}`).join('; '), 'за поручение', ref(D, 'const TASK_TIERS'));
  add('charm', 'Общее дело Ордена', order('charm') + '; ' + order('charm2') + ' серебр.; ' + order('charm3') + ' золот.', 'в неделю', ref(RU, '{ at: 1 / 3, need: 15'));
  add('charm', 'Сезонная тропа', `бесплатная: ${free.charm} обычных; Золотая: ${gold.charm2} серебр. + ${gold.charm3} золот.`, 'в месяц', ref(RU, 'PASS_FREE: ['));
  add('charm', 'Ранги Лиги / сундук сезона', `${lr('charm')}; серебр. ${lr('charm2')}; золот. ${lr('charm3')}; сундук: 2 × лига серебр., лига/2 золот.`, 'раз в сезон', ref(LG, "{ name: ru`Медь`"));
  add('charm', 'Итоги сезона Алатыря', `серебр. ${ala('charm2')}; золот. ${ala('charm3')}`, 'раз в сезон', ref(SR, '{ n: 1,  name'));
  add('charm', 'Лавка', `20 за ✦ ${n(shop('charm20').price)}; 10 серебр. за ${shop('charm2x').price} монет; 10 золот. за ${shop('charm3x').price} монет`, 'без ограничений', ref(RU, "{ id: 'charm20'"));
  add('charm', 'Посылка Ордена (нет Источников рядом)', rw(Rules.SUPPLY), 'раз в день; сервер не проверяет, есть ли Источники', ref(CO, 'supply(a, ctx)'));

  // ---------- мёд ----------
  add('honey', 'Источник', `~${n(springW(20, 'honey'))} (на Масленицу вес ×8)`, 'за источник', ref(WO, "['honey', Ev.hol && Ev.hol.honey ? 8 : 1]"));
  add('honey', 'Задания дня / сундук', `${q('honey')} / в среднем ${chestEV(Rules).honey.toFixed(2)}`, 'в день', ref(D, 'const QUEST_TEMPLATES'));
  add('honey', 'Серия дней / уровень', `${streak('honey')} / 2 за уровень`, '', ref(RU, 'STREAK: ['));
  add('honey', 'Бои', 'разлом — ступень; Капище — (ступень − 1); вторжение — 1; поединок — 1', 'за победу', ref(CO, 'honey: tier'));
  add('honey', 'Сезонная тропа', `бесплатная: ${free.honey}`, 'в месяц', ref(RU, 'PASS_FREE: ['));
  add('honey', 'Прочее', `Орден (ступень 1): 3; Лига «Бронза»: 5; Алатырь 5+: 5; подарки 60% × 1–2; спутник; Лавка: 5 за ✦ ${n(shop('honey5').price)}`, '', ref(RU, "{ id: 'honey5'"));

  // ---------- ладан ----------
  add('incense', 'Источник (с 3 уровня)', `вес 0,08 — ~${n(springW(20, 'incense'))} за источник`, '', ref(WO, "opts.push(['incense', 0.08])"));
  add('incense', 'Серия (5-й день) / каждый 5-й уровень / обучение', '1 / 1 / 1', '', ref(ST, 'if (l % 5 === 0) r.incense = 1'));
  add('incense', 'Сезонная тропа (бесплатная)', `${free.incense} (по 5 на 5, 15, 25-й)`, 'в месяц', ref(RU, '{ incense: 5, sparks: 1300 }'));
  add('incense', 'Орден (ступень 2), Лига «Золото» 1 / «Алмаз» 3, Алатырь 15+: 1', '', '', ref(RU, '{ at: 2 / 3, need: 40'));
  add('incense', 'Лавка', `1 за ${shop('incense').price} монет; 5 за ${shop('incense5').price} (раз в день)`, '', ref(RU, "{ id: 'incense',"));

  // ---------- вода, лечение ----------
  add('water', 'Источник / уровень / разлом 2–3 ст. / Капище 3 ст.', `~${n(springW(20, 'water'))} / 1 / 1 / 1`, '', ref(WO, "['water', 0.6]"));
  add('water', 'Сезонная тропа', `бесплатная: ${free.water}; Золотая: ${gold.water}`, 'в месяц', ref(RU, '{ water: 10, sparks: 1700 }'));
  add('water', 'Прочее', `Орден (ступень 2): 2; Лига «Железо» 5, «Изумруд» 10; Алатырь 15+: 5; подарок 40%; Лавка: 5 за ✦ ${n(shop('water5').price)}`, '', ref(RU, "{ id: 'water5'"));
  add('deadwater', 'Источник', `вес 0,009 — ~1 на ${Math.round(1 / springW(20, 'deadwater'))} источников`, '', ref(WO, "['deadwater', 0.009]"));
  add('deadwater', 'Тропа (30-я ступень) / Алатырь 30+ и 60+ / Лавка', `${free.deadwater} в месяц / по 1 / 1 за ${shop('dead1').price} монет раз в неделю`, '', ref(RU, "{ id: 'dead1'"));
  add('herb', 'Подорожник: источник / задания / уровень / бои', `~${n(springW(20, 'herb'))} / 2 / 3 / 1 за разлом 1 ст., Капище 1–2 ст., вторжение`, '', ref(WO, "['herb', 2]"));
  add('herb', 'Отвар: источник / серия 6-й день / уровень / Алатырь 5+', `~${n(springW(20, 'brew'))} / 1 / 1 / 3`, '', ref(WO, "['brew', 0.8]"));

  // ---------- Врата, пропуски, настой, подарки ----------
  add('gate', 'Старт / серия (7-й день) / Кампания (шаги 7, 8)', '1 / 1 / 1 + 1', '', ref(RU, '{ charm3: 3, sparks: 1000, gate: 1, xp: 1500 }'));
  add('gate', 'Лавка', `1 за ✦ ${n(shop('gate').price)} (раз в день); 3 за ${shop('gate3').price} монет`, '', ref(RU, "{ id: 'gate',"));
  add('farpass', 'Вход дня (если пропусков меньше 3)', 1, 'в день', ref(CO, '(S.d.items.farpass || 0) < Rules.FAR.KEEP'));
  add('farpass', 'Лавка / Алатырь 60+', `1 за ✦ ${n(shop('farpass').price)}; 3 за ${shop('farpass3').price} монет / 3`, '', ref(RU, "{ id: 'farpass',"));
  add('xpbrew', 'Лавка / Алатырь 30+', `1 за ${shop('xpbrew').price} монет (1 в день, 2 в неделю) / 2`, '', ref(RU, "{ id: 'xpbrew'"));
  add('gift', 'Источник (пока подарков меньше 25) / серия 4-й день', `${G.W.SPRING_GIFT} / 1`, '', ref(WO, 'SPRING_GIFT: 0.6'));

  // ---------- амулеты, коконы ----------
  add('amulet', 'Разлом / Капище / вторжение', '5 / 12 / 30% по ступени; 4% × ступень; 4%', 'за победу', ref(CO, 'S.rollAmulet([0.05, 0.12, 0.3]'));
  add('amulet', 'Лига: ранги 3, 6, 9', '1 случайный', 'раз в сезон', ref(CO, 'if (i % 3 === 0)'));
  add('amulet', 'Сезонная тропа', `на выбор: бесплатная — ${free.amuletPick} (20-я), Золотая — ${gold.amuletPick} (каждая пятая)`, 'в месяц', ref(RU, '{ amuletPick: 1, sparks: 2300, alatyr: 1 }'));
  add('amulet', 'Лавка / переплавка', `случайный за ${shop('amulet').price} монет / 3 одинаковых + ✦ ${n(Rules.MELT.SPARKS)} → на выбор`, '', ref(RU, "{ id: 'amulet'"));
  add('cocoon', 'Источник', `${G.W.SPRING_COCOON * 100}%: 2 км (50%), 5 км (40%), 10 км (10%); в Неделю коконов ×2`, 'пока коконов < 9', ref(WO, 'SPRING_COCOON: 0.12'));
  add('cocoon', 'Серия (7-й день) / Орден (ступень 3) / Тропа Золотая (9, 19, 29)', '10 км / 10 км / 3 × 10 км', '', ref(CO, 'km: 10, walked: 0'));
  add('cocoon', 'Подарок друга / Кампания (шаг 1) / старт', '5 км (12% + 3% × ступень дружбы) / 5 км / 2 км', '', ref(CO, 'if (r() < 0.12 + lv * 0.03) c.cocoon = 5'));
  add('cocoon', 'Лавка', `5 км за ${shop('cocoon5').price}, 10 км за ${shop('cocoon10').price} монет`, '', ref(RU, "{ id: 'cocoon5'"));
  add('cocoon', 'Что внутри', Object.entries(COCOON_TIERS).map(([km, t]) => `${km} км: ` + Object.entries(t.pool).map(([r, w]) => `р${r}×${w}`).join(' ')).join('; ') + ' (р — редкость, ×вес)', 'вылупление: 3 сразу, за км пути', ref(D, 'const COCOON_TIERS'));

  // ---------- эссенция, Род, осколки ----------
  add('ess', 'Поимка', '3 / 5 / 10 по стадии + 2 × (редкость − 1); особая встреча — 10 + 2 × (редкость − 1)', 'семейству пойманного', ref(RU, 'ess: (special ? 10 : s.stage === 3 ? 10'));
  add('ess', 'Кокон', '3 × км', 'семейству вылупившегося', ref(ST, 'this.addEssence(s.fam, c.km * 3)'));
  add('ess', 'Спутник', '3 за 1 / 3 / 5 км (обычный / 2-я стадия или редкий+ / 3-я стадия или легенда), с амулетом Лады — вдвое чаще', 'по пути, до 60 км в день', ref(ST, 'buddyDist(sp)'));
  add('ess', 'Кампания', 'дух на выбор + 15 (шаг 1); эссенция ровно на эволюцию (шаг 5); старт — 10', 'разово', ref(ST, 'campEvoGift(st, c)'));
  add('ess', 'Отпустить духа / вливание Рода', '1 / 1 за 1 Рода (легенда — 3 Рода)', '', ref(ST, 'this.addEssence(SP[sp.sid].fam, 1)'));
  add('rod', 'Разлом (5.1.20)', `${S.RIFT_ESS[1]} / ${S.RIFT_ESS[2]} / ${S.RIFT_ESS[3]} по ступени`, 'за победу', ref(ST, 'RIFT_ESS: { 1: 2, 2: 4, 3: 6 }'));
  add('rod', 'Переплавка эссенции семейства', `${S.ESS.MELT} → 1 (легенды — нельзя)`, 'без ограничений', ref(ST, 'ESS: { MELT: 5, LEGEND: 3 }'));
  add('rod', 'Итоги сезона Алатыря', ala('rod'), 'раз в сезон', ref(SR, '{ n: 30, name'));
  add('alatyr', 'Разлом 2-й / 3-й ступени', `${S.ALATYR_DROP.rift[2] * 100}% / ${S.ALATYR_DROP.rift[3] * 100}%`, `за победу; в боях не больше ${S.ALATYR_DAY} в день`, ref(ST, 'ALATYR_DROP: { rift: { 2: 0.2, 3: 1 }'));
  add('alatyr', 'Хранитель-старейшина Капища', `${S.ALATYR_DROP.duel[3] * 100}%`, 'за победу (в тот же предел 2 в день)', ref(ST, 'ALATYR_DROP: { rift: { 2: 0.2, 3: 1 }'));

  // ---------- облики, сумка, жетоны ----------
  add('look', 'Уровни Ловчего', 'плащи, глаза, эмблемы, фоны, рамки с 1–31 уровня', 'за уровень', ref(D, 'const LOOK = {'));
  add('look', 'Гардероб / Лавка (монеты)', 'облики 300–1 000, фоны 250–650, рамки 250–800, плащи 250–400', 'покупка', ref(D, "{ id: 'kupala', name: ru`Купальский`"));
  add('look', 'Золотая тропа (15-я, 30-я), Лига «Легенда» (эмблема), Кампания (шаг 9 — случайный облик: 95% редкий)', '', '', ref(D, 'const CAMP_SKIN'));
  add('bag', 'Расширение сумки', `+${Rules.BAG_STEP} мест за ${Rules.bagPrice(0)}…${Rules.bagPrice(Rules.BAG_MAX_UP - 1)} монет (всего ${[...Array(Rules.BAG_MAX_UP)].reduce((a, _, i) => a + Rules.bagPrice(i), 0)})`, `до ${Rules.BAG_MAX_UP} раз; сумка ${G.BAG_LIMIT}, посылка Ордена ${Rules.PARCEL.MAX}`, ref(RU, 'bagPrice(n)'));
  add('tickets', 'Жетоны Лиги', `${League.TICKETS} в день; опыт — первые ${League.XP_RUNS} боёв`, 'в день', ref(LG, 'TICKETS: 10'));
  return R;
}

export function sinks(G) {
  const { Rules, S, MOVE2_COST, LOOK, SPECIES } = G, shop = id => Rules.SHOP.find(x => x.id === id), R = [];
  const add = (res, what, cost, note, r) => R.push({ res, what, cost: String(cost), note, ref: r });
  let s40 = 0, s50 = 0, e40 = 0, e50 = 0;
  for (let l = 1; l < 50; l++) { const c = S.powerUpSparks(l), e = 1 + Math.floor(l / 10); if (l < 40) { s40 += c; e40 += e; } s50 += c; e50 += e; }
  const A = S.AWAKE;
  add('sparks', 'Усиление духа (уровень за уровнем)', `${S.powerUpSparks(1)} … ${n(S.powerUpSparks(39))} … ${n(S.powerUpSparks(49))}; с 1 до 40 — ✦ ${n(s40)}, до 50 — ✦ ${n(s50)}`, 'предел — уровень Ловчего +5 (не выше 40) и +2 за звезду', ref(ST, 'powerUpSparks(lvl)'));
  add('ess', 'Усиление духа', `1 + уровень/10; с 1 до 40 — ${e40}, до 50 — ${e50}`, 'эссенция семейства духа', ref(ST, 'powerUpCost(sp)'));
  add('sparks', 'Пробуждение (5 звёзд)', `✦ ${A.SPARKS.map(n).join(' / ')} (всего ${n(A.SPARKS.reduce((a, b) => a + b, 0))})`, `звёзды открываются на ${A.LVL.join(', ')} уровне`, ref(ST, 'AWAKE: { MAX: 5'));
  add('alatyr', 'Пробуждение', `${A.ALATYR.join(' / ')} (всего ${A.ALATYR.reduce((a, b) => a + b, 0)} на духа)`, '', ref(ST, 'AWAKE: { MAX: 5'));
  add('ess', 'Пробуждение', `${A.ESS.join(' / ')} (всего ${A.ESS.reduce((a, b) => a + b, 0)})`, '', ref(ST, 'AWAKE: { MAX: 5'));
  add('ess', 'Эволюция', `${[...new Set(SPECIES.filter(s => s.cost).map(s => s.cost))].sort((a, b) => a - b).join(' / ')} эссенции`, '1-я → 2-я стадия обычно 25, 2-я → 3-я — 100', ref(D, "evo: 'kostrovik', cost: 25"));
  add('sparks', 'Второй приём', `✦ ${n(MOVE2_COST.sparks)} + ${MOVE2_COST.essence} эссенции`, 'раз на духа', ref(D, 'const MOVE2_COST'));
  add('sparks', 'Очищение омрачённого', `✦ ${Object.values(S.PURIFY_SPARKS).map(n).join(' / ')} по редкости + ${S.PURIFY.essence} эссенции`, '', ref(ST, 'PURIFY_SPARKS:'));
  add('sparks', 'Переплавка амулетов', `${Rules.MELT.N} одинаковых + ✦ ${n(Rules.MELT.SPARKS)} → 1 на выбор`, '', ref(RU, 'MELT: { N: 3'));
  add('rod', 'Вливание эссенции Рода', `1 → 1 эссенции семейства (легенды — ${S.ESS.LEGEND} → 1)`, '', ref(ST, 'ESS: { MELT: 5, LEGEND: 3 }'));
  add('sparks', 'Обменник', `✦ ${n(Rules.EXCHANGE.SPARKS)} → ${Rules.EXCHANGE.ZLAT} монета`, `до ${Rules.EXCHANGE.DAY} в день — не больше ✦ ${n(Rules.EXCHANGE.SPARKS * Rules.EXCHANGE.DAY)} в день`, ref(RU, 'EXCHANGE:'));
  for (const it of Rules.SHOP.filter(x => x.cur === 'sparks')) add('sparks', `Лавка: ${it.name}`, `✦ ${n(it.price)}`, it.day ? `${it.day} в день` : 'товар дня — скидка 40%', ref(RU, `{ id: '${it.id}'`));
  for (const it of Rules.SHOP.filter(x => x.cur === 'zlat')) add('zlat', `Лавка: ${it.name}`, it.bag ? `${Rules.bagPrice(0)} + 50 × n` : `${it.price} монет`, [it.lvl ? `с ${it.lvl} уровня` : '', it.day ? `${it.day} в день` : '', it.week ? `${it.week} в неделю` : ''].filter(Boolean).join(', '), ref(RU, `{ id: '${it.id}'`));
  const cos = k => LOOK[k].filter(x => x.shop).reduce((a, x) => a + x.shop, 0), cloaks = LOOK.cloak.filter(x => x.shop).reduce((a, x) => a + x.shop, 0);
  add('zlat', 'Гардероб: облики, фоны, рамки, плащи', `всего ${n(cos('skin') + cos('bg') + cos('frame') + cloaks)} монет (облики ${n(cos('skin'))}, фоны ${n(cos('bg'))}, рамки ${n(cos('frame'))}, плащи ${n(cloaks)})`, 'разово', ref(D, "{ id: 'kupala', name: ru`Купальский`"));
  add('zlat', 'Золотая тропа', `${Rules.PASS.GOLD} монет`, 'каждый календарный месяц', ref(RU, 'PASS: { LEVELS: 30'));
  add('zlat', 'Аукцион: комиссия и залог', `${Rules.AUCTION.FEE * 100}% с продажи; залог ${Rules.AUCTION.DEPOSIT * 100}% (не меньше ✦ 50 / 1 монеты) пропадает, если лот не продан`, 'платит продавец', ref(RU, 'AUCTION: {'));
  add('charm', 'Броски', '1 оберег за бросок', 'промах тоже тратит оберег', ref(CO, 'this.need(S.useItem(item)'));
  add('honey', 'Мёд при поимке', 'шанс ×1,5 на один бросок', '', ref(RU, 'o.honey ? 1.5 : 1'));
  add('incense', 'Ладан', '30 минут духов вокруг вдвое больше (P 0,14 → 0,3)', 'второй не зажечь, пока горит', ref(CO, 'S.d.incenseUntil = ctx.now + 30 * 60000'));
  add('water', 'Лечение', 'подорожник 25%, отвар 60%, Живая вода 50% (в разломе — в бою, до 3), Мёртвая вода — дух без сил на 4 ч раньше', 'раненый дух сам лечится 10% в час', ref(RU, 'HP: { REGEN: 0.1'));
  add('gate', 'Телепорт через Атлас без перезарядки', '1 Врата', `даром — раз в ${Rules.MOVE.TP_CD / 60000} мин`, ref(RU, 'TP_CD: 30 * 60000'));
  add('farpass', 'Разлом до 5 км, не подходя', '1 пропуск', '', ref(CO, 'if (far) S.d.items.farpass--'));
  add('gift', 'Подарок другу', '1 подарок', 'раз в день каждому', ref(CO, "this.need(S.useItem('gift')"));
  add('xpbrew', 'Настой опыта', `+${Math.round((Rules.XP_BREW.MUL - 1) * 100)}% опыта на ${Rules.XP_BREW.H} ч`, '', ref(CO, 'S.d.xpUntil = ctx.now + Rules.XP_BREW.H * 3600000'));
  add('charm', 'Выбросить из сумки', 'любое число', `сумка ${G.BAG_LIMIT} (+50 за расширение), посылка Ордена ${Rules.PARCEL.MAX}; сверх — пропадает`, ref(CO, 'discard(a)'));
  return R;
}
