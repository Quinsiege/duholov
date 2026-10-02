// Модель экономики «Духолова». Загружает настоящие модули игры (порядок — tools/build-server.ps1), считает источники и траты
// каждой валюты, прогоняет три типа игрока день за днём и печатает таблицы в Markdown.
//   node tools/economy/economy.mjs                     — всё: сейчас и «до правок 5.1.20–5.1.21», 365 дней
//   node tools/economy/economy.mjs --days 180 --profile regular --no-old
//   node tools/economy/economy.mjs --out economy.md --json economy.json
// Без зависимостей: только Node 18+. Числа игры не меняет — только читает.
import { writeFileSync } from 'node:fs';
import { setup, simulate, PROFILES, COMMON, DRIFT, OLD_PARTS, catchMC, spawnSample, specialCatchMC, springEV } from './model.mjs';
import { sources, sinks, RES, NAMES } from './catalog.mjs';
import { ref } from './load.mjs';

const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const DAYS = Math.max(30, +arg('days', 365)), ONLY = arg('profile', 'all'), OLD = !args.includes('--no-old');
const KEYS = ONLY === 'all' ? Object.keys(PROFILES) : ONLY.split(',');
const SNAP = [30, 90, 180, 365].filter(x => x <= DAYS);
const out = [], p = s => out.push(s);
const f0 = (x, d = 0) => (x == null || !Number.isFinite(x) ? '—' : Math.abs(x) < 0.5 / 10 ** d ? '0' : (Math.round(x * 10 ** d) / 10 ** d).toLocaleString('ru-RU'));
const table = (head, rows) => { p('| ' + head.join(' | ') + ' |'); p('|' + head.map(() => '---').join('|') + '|'); rows.forEach(r => p('| ' + r.join(' | ') + ' |')); p(''); };
const day = d => (d == null ? `не за ${DAYS} дн.` : String(d + 1));
const t0 = Date.now();

// ---------- прогоны ----------
const now = setup('now'), G = now.G;
const spawns = spawnSample(G, { start: now.start });
const CACHE = {}; // Монте-Карло поимок — общий для всех прогонов (правки экономики его не меняют)
const run = (Lg, k, extra = {}) => simulate(Lg, extra.profile || PROFILES[k], { days: DAYS, spawns, snap: SNAP, cache: CACHE, ...extra });
const R = {}, RG = {}, RO = {};
for (const k of KEYS) { R[k] = run(now, k); RG[k] = run(now, k, { gold: 'earned' }); }
let old = null;
if (OLD) { old = setup('old'); for (const k of KEYS) RO[k] = run(old, k); }

// потоки за период (a, b] дней: { ресурс: { источник: сумма } }
const FLOW_RES = ['sparks', 'zlat', 'xp', 'charm', 'charm2', 'charm3', 'honey', 'incense', 'water', 'deadwater', 'herb', 'brew', 'gate', 'farpass', 'xpbrew', 'gift', 'amulet', 'cocoon', 'ess', 'rod', 'alatyr'];
function period(r, a, b) {
  const A = a ? r.snaps[a].flow : {}, B = r.snaps[b].flow, o = {};
  for (const res of FLOW_RES) { const x = {}, fa = A[res] || {}, fb = B[res] || {}; for (const s of new Set([...Object.keys(fa), ...Object.keys(fb)])) { const v = (fb[s] || 0) - (fa[s] || 0); if (Math.abs(v) > 1e-9) x[s] = v; } o[res] = x; }
  return o;
}
const WASTE = 'выброшено (сумка полна)', CUT = 'срезано дневным потолком';
const inc = fl => Object.entries(fl || {}).filter(([s, v]) => v > 0).reduce((a, [, v]) => a + v, 0);
const spd = fl => -Object.entries(fl || {}).filter(([s, v]) => v < 0 && s !== WASTE && s !== CUT).reduce((a, [, v]) => a + v, 0);
const wst = fl => -((fl || {})[WASTE] || 0);
const merge = (...fls) => { const o = {}; for (const f of fls) for (const [s, v] of Object.entries(f || {})) o[s] = (o[s] || 0) + v; return o; };
const periods = SNAP.map((b, i) => [i ? SNAP[i - 1] : 0, b]);

// ---------- заголовок ----------
p(`# Модель экономики «Духолова» — версия игры ${now.version}`);
p('');
p(`Модель: \`node tools/economy/economy.mjs\` (${new Date().toLocaleDateString('ru-RU')}), горизонт ${DAYS} дней, старт — ${new Date(now.start).toISOString().slice(0, 10)} (понедельник). ` +
  `Модули игры загружены в Node в порядке сборки сервера (${ref('tools/build-server.ps1', '$files = @(')}), файлов: ${now.files.length}. ` +
  `Сверка чисел, повторённых в модели вручную: ${DRIFT.length ? '**РАСХОЖДЕНИЯ:** ' + DRIFT.join('; ') : 'всё совпадает с кодом'}.`);
p('');

// ---------- 1. допущения ----------
p('## 1. Допущения');
p('');
p('### 1.1. Типы игроков (на день, когда Ловчий играет)');
p('');
const PR = KEYS.map(k => PROFILES[k]), row = (name, fn) => [name, ...PR.map(fn)];
table(['Параметр', ...PR.map(x => `${x.name} (~${x.minutes} мин)`)], [
  row('Дней игры в неделю', x => x.week.reduce((a, b) => a + b, 0)),
  row('Поймано диких духов', x => x.catches), row('Источников', x => x.springs), row('Км пути в зачёт (джойстик)', x => x.km),
  row('Попадание оберегом / кольцо «Хорошо·Отлично·Превосходно»', x => `${x.hit} / ${x.ring.join('·')}`),
  row('Побед в разломах (ступени 1·2·3)', x => `${x.raids[1]}·${x.raids[2]}·${x.raids[3]}`),
  row('Побед на Капищах (ступени 1·2·3)', x => `${x.duels[1]}·${x.duels[2]}·${x.duels[3]}`),
  row('Побед над вторжениями', x => x.invasions), row('Боёв Лиги / доля побед', x => `${x.league} / ${x.leagueP}`),
  row('Заданий дня (из 3) / доля дней с сундуком', x => `${x.quests} / ${x.chest}`), row('Поручений источников', x => x.tasks),
  row('Друзей (подарки туда и обратно) / поединков', x => `${x.friends} / ${x.spar}`), row('Капищ под защитником', x => x.holds),
  row('Ладан / Врата / Дальний пропуск в день', x => `${x.incense} / ${x.gates} / ${x.farpass}`), row('Лечебных предметов на победу', x => x.heal), row('Живой воды в бою на победу в разломе 2–3 ст. / Мёртвой воды в день', x => `${x.raidWater} / ${x.dead}`),
  row('Доля эссенции дня: эволюции / переплавка в Род', x => `${x.evolve} / ${x.melt}`), row('Обменов искр в день', x => x.exchange), row('Сделок на аукционе в день', x => x.trades),
  row('Раскладка времени', x => x.time),
]);
p('Общие допущения: ' + [
  `сезон Алатыря (и Лиги) — ${COMMON.seasonDays} дней`, `Тропа — месяц ${COMMON.monthDays} дней`,
  'Орден каждую неделю доходит до трёх ступеней общего дела', `за быструю победу в разломе +${COMMON.raidSpeed} оберега`, `запас искр ${f0(COMMON.reserve)} (сверх — в обменник)`,
  'игрок без покупок в Казне', 'обучение и шаги 1–8 Кампании — в первый день, шаг 9 — когда пройдено 60 км',
  'команда — три духа: редкий из Кампании (A), «рабочие» B и C (их сменяют первый эпический и первая легенда)',
  'спутник — дух команды с самой большой нехваткой эссенции; эссенция Рода вливается туда же',
  `сумка ${G.BAG_LIMIT} + посылка Ордена ${G.Rules.PARCEL.MAX}: сверх — выбрасывается дешёвое (подорожник, отвар, мёд сверх 30, вода сверх 30, обереги сверх 150…)`,
  'праздники не учтены, события недели — по кругу WEEK_EVENTS', 'ожидаемые значения: дроби — нормально, «день N» — первый день, когда ожидаемое значение дошло до цели',
].join('; ') + '.');
p('');

// ---------- 2. поимка ----------
p('## 2. Поимка: Монте-Карло по настоящим формулам');
p('');
p(`${spawns.length.toLocaleString('ru-RU')} появлений через \`W.pickSpecies\` (${ref('www/js/world.js', 'pickSpecies(r, biome')}), поимка — как \`encThrow\` (${ref('server/game/core.js', 'encThrow(a, ctx)')}): \`Rules.catchChance\`, \`Rules.ringBonus\`, \`Rules.catchReward\` (${ref('www/js/rules.js', 'catchChance(o)')}). Навык — обычного игрока (попадание 0,88).`);
p('');
const sk = { hit: PROFILES.regular.hit, ring: PROFILES.regular.ring, honey: true };
const cms = [1, 5, 10, 20, 30, 35].map(L => catchMC(G, spawns, L, sk, { n: 8000 }));
table(['Ур. Ловчего', 'P(поймать)', 'P(сбежит)', 'Бросков на встречу', 'Обер. обычн/серебр/золот на встречу', 'Мёда на встречу', 'Опыт за поимку*', '✦ за поимку', 'Эссенции за поимку', 'Доли редкостей поймано 1·2·3·4'],
  cms.map(c => [c.L, f0(c.pCatch, 3), f0(c.pFlee, 3), f0(c.throws, 2), `${f0(c.perEnc.charm, 2)} / ${f0(c.perEnc.charm2, 2)} / ${f0(c.perEnc.charm3, 2)}`, f0(c.perEnc.honey, 2), f0(c.perCatch.xp), f0(c.perCatch.sparks), f0(c.perCatch.ess, 2),
    [1, 2, 3, 4].map(r => f0((c.rarShare[r] || 0) * 100, 1) + '%').join('·')]));
p('\\* без +500 за новый вид и сияющего. Встречи по редкости (все уровни): ' + (() => { const c = {}; for (const x of spawns) { const r = G.SP[x.sid].rar; c[r] = (c[r] || 0) + 1; } return Object.entries(c).map(([r, v]) => `${G.RARITY[r].name.toLowerCase()} ${f0(v / spawns.length * 100, 1)}%`).join(', '); })() + `; видов на карте за 11 недель — ${new Set(spawns.map(x => x.sid)).size} из ${G.SPECIES.length} (легенды — только в разломах).`);
p('');
const raidRows = [1, 2, 3].map(t => { const boss = t === 1 ? 'kostrovik' : t === 2 ? 'domovoy' : 'zharptica', c = specialCatchMC(G, { mode: 'raid', sid: boss, charms: G.Raid.TIER[t].charms + COMMON.raidSpeed, skill: sk, n: 8000 }); return [t, G.Raid.TIER[t].charms + COMMON.raidSpeed, f0(c.p, 3), f0(c.throws, 1)]; });
table(['Разлом, ступень', 'Оберегов разлома', 'P(поймать босса)', 'Бросков'], raidRows);
const se = springEV(G, 20, {});
p(`Источник на 20 уровне (${ref('www/js/world.js', 'springLoot(id)')}): ` + Object.entries(se.items).map(([k, v]) => `${NAMES[k] || k} ${f0(v, 2)}`).join(', ') + `, подарок ${se.gift}, кокон ${se.cocoon} (2/5/10 км — 50/40/10%), опыт ${se.xp}.`);
p('');

// ---------- 3. источники ----------
p('## 3. Источники: откуда приходит каждая валюта и ресурс');
p('');
const SRC = sources(G), SNK = sinks(G);
for (const [res, title] of RES) {
  const rows = SRC.filter(x => x.res === res);
  if (!rows.length) continue;
  p(`### ${title}`);
  p('');
  table(['Источник', 'Сколько', 'Как часто / предел', 'Код'], rows.map(x => [x.src, x.amount, x.freq, '`' + x.ref + '`']));
}

// ---------- 4. траты ----------
p('## 4. Траты: куда уходит');
p('');
table(['Ресурс', 'На что', 'Цена', 'Условия', 'Код'], SNK.map(x => [(RES.find(r => r[0] === x.res) || [0, x.res])[1], x.what, x.cost, x.note, '`' + x.ref + '`']));

// ---------- 5. доход в день ----------
p('## 5. Доход и траты в день (среднее на календарный день)');
p('');
const RESD = [['sparks', 'Искры ✦'], ['zlat', 'Монеты'], ['xp', 'Опыт (после потолка)'], ['charm+', 'Обереги (все)'], ['honey', 'Мёд'], ['incense', 'Ладан'], ['water', 'Живая вода'],
  ['herb+', 'Подорожник + отвар'], ['deadwater', 'Мёртвая вода'], ['gate', 'Врата'], ['gift', 'Подарки'], ['amulet', 'Амулеты'], ['cocoon', 'Коконы (получено)'], ['ess', 'Эссенция семейств'], ['rod', 'Эссенция Рода'], ['alatyr', 'Осколки Алатыря']];
const pick = (fl, key) => key === 'charm+' ? merge(fl.charm, fl.charm2, fl.charm3) : key === 'herb+' ? merge(fl.herb, fl.brew) : fl[key];
for (const k of KEYS) {
  const r = R[k];
  p(`### ${PROFILES[k].name}`);
  p('');
  table(['Ресурс', ...periods.map(([a, b]) => `дни ${a + 1}–${b}: доход / трата`), `остаток на ${DAYS}-й день`, 'выброшено за всё время'], RESD.map(([key, name]) => {
    const cells = periods.map(([a, b]) => { const fl = pick(period(r, a, b), key) || {}, dd = b - a; return key === 'xp' ? f0((inc(fl) - spd(fl) + (fl[CUT] || 0)) / dd) : `${f0(inc(fl) / dd, inc(fl) / dd < 10 ? 1 : 0)} / ${f0(spd(fl) / dd, spd(fl) / dd < 10 ? 1 : 0)}`; });
    const st = r.st, bal = key === 'sparks' ? st.sparks : key === 'zlat' ? st.zlat : key === 'xp' ? st.xp : key === 'charm+' ? (st.items.charm || 0) + (st.items.charm2 || 0) + (st.items.charm3 || 0)
      : key === 'herb+' ? (st.items.herb || 0) + (st.items.brew || 0) : key === 'ess' ? st.essOther : key === 'rod' ? st.rod : key === 'alatyr' ? st.alatyr : key === 'amulet' ? st.amulets : key === 'cocoon' ? null : st.items[key] || 0;
    const w = key === 'charm+' ? ['charm', 'charm2', 'charm3'].reduce((a, x) => a + (st.waste[x] || 0), 0) : key === 'herb+' ? (st.waste.herb || 0) + (st.waste.brew || 0) : st.waste[key] || 0;
    return [name, ...cells, f0(bal), w ? f0(w) : '—'];
  }));
}
p('Опыт — сколько начислено после дневного потолка, с опытом отдыха и множителями. Амулеты в остатке — сколько получено всего (надеты три). Эссенция семейств в остатке — не потраченная и не переплавленная (лежит по сотням семейств).');
p('');
p('### 5.1. Откуда искры, монеты и опыт (дни 31–90, доля дохода)');
p('');
const share = (r, res, a, b) => { const fl = period(r, a, b)[res] || {}, tot = inc(fl); return Object.entries(fl).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1]).slice(0, 9).map(([s, v]) => `${s} ${f0(v / tot * 100)}%`).join(', '); };
const pa = SNAP.includes(90) ? [30, 90] : [0, SNAP[0]];
table(['Тип', 'Искры', 'Монеты', 'Опыт (до потолка)'], KEYS.map(k => [PROFILES[k].name, share(R[k], 'sparks', ...pa), share(R[k], 'zlat', ...pa), share(R[k], 'xp', ...pa)]));

// ---------- 6. сроки ----------
p('## 6. Сроки до целей (день, в который цель достигнута; 1 — первый день)');
p('');
const LR = G.LEAGUE_RANKS;
const passTxt = r => { const m = []; for (let i = 0; i * COMMON.monthDays < DAYS; i++) { const k = 'pass30:' + i; m.push(r.goals[k] != null ? r.goals[k] : null); } const ok = m.filter(x => x != null); if (ok.length) return `на ${f0(ok.reduce((a, b) => a + b, 0) / ok.length)}-й день месяца (${ok.length} из ${m.length} мес.)`; const lv = Math.max(...r.daily.slice(COMMON.monthDays, 2 * COMMON.monthDays).map(x => x.passLvl || 0)); return `не успевает: ${lv} ступеней за месяц`; };
const G2 = k => RG[k];
const goldTxt = k => { const r = G2(k); return r.st.goldMonths ? `${r.st.goldMonths} из ${Math.ceil(DAYS / COMMON.monthDays)} мес. (первая — день ${day(r.goals.goldBought)})` : `ни разу за ${DAYS} дн.`; };
const GOALS = [
  ['Первая эволюция', r => day(r.goals.evolve1)], ['Редкий дух (на выбор в Кампании)', r => day(r.goals.rare)], ['Первый эпический дух', r => day(r.goals.epic)], ['Первая легенда', r => day(r.goals.legend)],
  ['Уровень Ловчего 10', r => day(r.goals.level10)], ['Уровень 20', r => day(r.goals.level20)], ['Уровень 30', r => day(r.goals.level30)], ['Уровень 35', r => day(r.goals.level35)], ['Уровень 40', r => day(r.goals.level40)],
  ['Первая звезда пробуждения', r => day(r.goals.awaken1)],
  ['Редкий дух до 40 уровня', r => day(r.goals.rare40)], ['Эпический до 40', r => day(r.goals.epic40)], ['Легенда до 40', r => day(r.goals.legend40)],
  ['Редкий до максимума (50 ур., 5 звёзд)', r => day(r.goals.rareMax)], ['Эпический до максимума', r => day(r.goals.epicMax)], ['Легенда до максимума', r => day(r.goals.legendMax)],
  ['Кампания, глава I (шаг 9)', r => day(r.goals.campaign)],
  ['30 ступеней Тропы (бесплатная = Золотая: очки те же)', passTxt],
  ['600 монет на Золотую тропу (без трат)', r => day(r.goals.zlat600)],
  ...LR.slice(1).map((x, i) => [`Лига «${x.name}» (${x.pts})`, r => day(r.goals['league' + (i + 1)])]),
  ['Все 23 знака в бронзе', r => day(r.goals.medalsBronze)], ['Все 23 знака в золоте', r => day(r.goals.medalsGold)],
];
table(['Цель', ...KEYS.map(k => PROFILES[k].name)], [...GOALS.map(([name, fn]) => [name, ...KEYS.map(k => fn(R[k]))]), ['Золотая тропа за заработанные монеты (покупает, как только хватает)', ...KEYS.map(goldTxt)]]);
p('### 6.1. Знаки Ордена: день бронзы / золота');
p('');
table(['Знак', 'Ступени', ...KEYS.map(k => PROFILES[k].name)], G.MEDALS.map(m => [m.name, m.tiers.join(' / '), ...KEYS.map(k => `${day(R[k].goals['bronze:' + m.id])} / ${day(R[k].goals['gold:' + m.id])}`)]));

// ---------- 7. диагностика ----------
p('## 7. Диагностика');
p('');
p('### 7.1. Что копится: остатки и доля потраченного');
p('');
const balRows = [];
for (const k of KEYS) {
  const r = R[k], at = d => r.daily[Math.min(DAYS, d) - 1];
  for (const [key, name, get] of [['sparks', 'Искры', x => x.sparks], ['zlat', 'Монеты', x => x.zlat], ['rod', 'Эссенция Рода', x => x.rod], ['ess', 'Эссенция семейств', x => x.essOther], ['alatyr', 'Осколки', x => x.alatyr]]) {
    const fl = period(r, 0, SNAP[SNAP.length - 1])[key] || {}, I = inc(fl), O = spd(fl);
    balRows.push([PROFILES[k].name, name, ...SNAP.map(d => f0(get(at(d)))), f0(I ? O / I * 100 : 0) + '%']);
  }
}
table(['Тип', 'Ресурс', ...SNAP.map(d => `день ${d}`), 'потрачено из полученного'], balRows);
if (OLD) {
  p('### 7.2. До и после правок 5.1.20–5.1.21 (тот же игрок, та же модель)');
  p('');
  p('«До» — экономика 5.1.19: искры Лиги и сундука сезона ÷10, прежняя Тропа (формулой, «поздняя» Золотая с 25 уровня), опыт Знаков ÷10, обменник ✦ 1 000 → 10 монет всем, эссенция разлома — семейству босса.');
  p('');
  const cmp = [];
  for (const k of KEYS) {
    const a = RO[k], b = R[k], pr = pa;
    const sI = r => inc(period(r, ...pr).sparks) / (pr[1] - pr[0]), zI = r => inc(period(r, ...pr).zlat) / (pr[1] - pr[0]);
    const medal = r => { const fl = period(r, 0, Math.min(90, DAYS)).xp || {}; return (fl['знаки Ордена'] || 0) / Math.max(1, inc(fl) + (fl[CUT] || 0)) * 100; };
    cmp.push([PROFILES[k].name, `${day(a.goals.level30)} → ${day(b.goals.level30)}`, `${day(a.goals.level40)} → ${day(b.goals.level40)}`, `${f0(sI(a))} → ${f0(sI(b))}`, `${f0(zI(a), 1)} → ${f0(zI(b), 1)}`,
      `${f0(a.daily[Math.min(90, DAYS) - 1].sparks)} → ${f0(b.daily[Math.min(90, DAYS) - 1].sparks)}`, `${f0(medal(a))}% → ${f0(medal(b))}%`, `${day(a.goals.rareMax)} → ${day(b.goals.rareMax)}`]);
  }
  table(['Тип', 'Уровень 30', 'Уровень 40', `✦ доход в день (дни ${pa[0] + 1}–${pa[1]})`, 'Монет в день', '✦ на счету, день 90', 'Опыт от Знаков (дни 1–90)', 'Редкий до максимума'], cmp);
}
p('### 7.3. Крупные награды против обычного дохода');
p('');
p('Обычный доход — то, что приносит каждый день игры: поимки, источники, коконы, бои, задания, поручения, серия, друзья, Капища (дни 31–90). Сколько дней такого дохода стоит одна награда:');
p('');
const ROUT = ['поимки', 'источники', 'коконы', 'разломы', 'Капища', 'вторжения', 'задания дня', 'сундук дня', 'поручения', 'поручения: дух встречи', 'серия дней', 'подарки друзей', 'поединки с друзьями', 'поимка босса', 'поимка омрачённого', 'Лига', 'дань Капищ', 'служба защитников', 'эволюции', 'ступени дружбы', 'спутник', 'вход дня'];
const routine = (r, res) => { const fl = period(r, ...pa)[res] || {}; return ROUT.reduce((a, s) => a + Math.max(0, fl[s] || 0), 0) / (pa[1] - pa[0]); };
const big = [
  ['✦', 'Лига «Легенда» (раз в сезон)', LR[9].reward.sparks, 'sparks'], ['✦', 'Все ранги Лиги до «Легенды» за сезон', LR.reduce((a, x) => a + ((x.reward || {}).sparks || 0), 0), 'sparks'],
  ['✦', 'Сундук Лиги за «Легенду»', G.League.prize(9).sparks, 'sparks'], ['✦', 'Бесплатная Тропа за месяц', G.Rules.PASS_FREE.reduce((a, x) => a + (x.sparks || 0), 0), 'sparks'],
  ['✦', 'Одна ступень Тропы (30-я)', G.Rules.PASS_FREE[29].sparks, 'sparks'], ['✦', 'Кампания, шаг 9', G.CAMPAIGN[0].steps[8].reward.sparks, 'sparks'], ['✦', 'Обучение, глава 4', G.TUT_CHAPTERS[3].reward.sparks, 'sparks'],
  ['опыт', 'Знак Ордена — золото', G.MEDAL_TIERS[2].xp, 'xp'], ['опыт', 'Все 23 знака × 3 ступени', G.MEDALS.length * G.MEDAL_TIERS.reduce((a, t) => a + t.xp, 0), 'xp'],
  ['монеты', 'Бесплатная Тропа за месяц', G.Rules.PASS_FREE.reduce((a, x) => a + (x.zlat || 0), 0), 'zlat'], ['монеты', 'Итоги сезона Алатыря (60+ осколков)', G.SeasonRewards.TIERS.reduce((a, t) => a + (t.rw.zlat || 0), 0), 'zlat'],
];
table(['Валюта', 'Награда', 'Сколько', ...KEYS.map(k => `${PROFILES[k].name}: дней обычного дохода`)], big.map(([cur, name, v, res]) => [cur, name, f0(v), ...KEYS.map(k => f0(v / Math.max(1e-9, routine(R[k], res)), 1))]));
p('Обычный доход в день: ' + KEYS.map(k => `${PROFILES[k].name.toLowerCase()} — ✦ ${f0(routine(R[k], 'sparks'))}, опыт ${f0(routine(R[k], 'xp'))}, монет ${f0(routine(R[k], 'zlat'), 1)}`).join('; ') + '.');
p('');
p('### 7.4. Выброшено из полной сумки за всё время (сумка + посылка Ордена полны)');
p('');
const WK = ['charm', 'charm2', 'charm3', 'honey', 'water', 'herb', 'brew', 'incense', 'gift', 'farpass', 'deadwater'];
table(['Тип', 'Дней с переполнением', ...WK.map(x => NAMES[x])], KEYS.map(k => [PROFILES[k].name, `${R[k].st.overflowDays} из ${DAYS}`, ...WK.map(x => f0(R[k].st.waste[x] || 0))]));
p(`Модель выбрасывает только то, что не помещается: в сумку ${G.BAG_LIMIT} мест (${ref('www/js/data.js', 'const BAG_LIMIT')}) и в посылку Ордена ${G.Rules.PARCEL.MAX} (${ref('www/js/rules.js', 'PARCEL: { MAX: 200 }')}); расширения сумки (до +500 за 3 750 монет) не покупаются.`);
p('');
p('### 7.5. Узкие места: цели дольше полугода');
p('');
const slow = [];
for (const [name, fn] of GOALS) for (const k of KEYS) { const v = fn(R[k]); if (/не успевает|^не за/.test(v) || (/^\d+$/.test(v) && +v > 180)) slow.push([PROFILES[k].name, name, v]); }
table(['Тип', 'Цель', 'День'], slow);

// ---------- 7.6. ёмкость трат: сколько духов в месяц можно довести на доход ----------
p('### 7.6. Ёмкость трат: на сколько духов в месяц хватает дохода (дни 31–90)');
p('');
{
  const S = G.S; let s40 = 0, s50 = 0, e40 = 0, e50 = 0;
  for (let l = 1; l < 50; l++) { const c = S.powerUpSparks(l), e = 1 + Math.floor(l / 10); if (l < 40) { s40 += c; e40 += e; } s50 += c; e50 += e; }
  const aw = { sp: S.AWAKE.SPARKS.reduce((a, b) => a + b, 0), al: S.AWAKE.ALATYR.reduce((a, b) => a + b, 0), es: S.AWAKE.ESS.reduce((a, b) => a + b, 0) };
  const rows = KEYS.map(k => {
    const fl = period(R[k], ...pa), dd = pa[1] - pa[0], sp = inc(fl.sparks) / dd * 30, rod = inc(fl.rod) / dd * 30, al = inc(fl.alatyr) / dd * 30, es = (inc(fl.ess) / dd) * 30;
    return [PROFILES[k].name, f0(sp), f0(sp / s40, 1), f0(sp / (s50 + aw.sp), 1), f0(rod), f0((rod + es / G.S.ESS.MELT) / (e50 + aw.es), 1), f0(al, 1), f0(al / aw.al, 2)];
  });
  table(['Тип', '✦ в месяц', 'духов 1→40 на ✦', 'духов 1→50 + 5 звёзд на ✦', 'Рода в месяц', 'духов до максимума на эссенцию (Род + переплавка всей)', 'осколков в месяц', 'духов до 5 звёзд на осколки'], rows);
  p(`Цена одного духа: с 1 до 40 уровня — ✦ ${f0(s40)} и ${e40} эссенции; с 1 до 50 и 5 звёзд — ✦ ${f0(s50 + aw.sp)}, ${e50 + aw.es} эссенции и ${aw.al} осколков (${ref('www/js/state.js', 'powerUpSparks(lvl)')}, ${ref('www/js/state.js', 'AWAKE: { MAX: 5')}).`);
  p('');
}

// ---------- 7.7. вклад каждой правки 5.1.20–5.1.21 ----------
if (OLD && !args.includes('--fast')) {
  p('### 7.7. Вклад каждой правки: откатываем по одной');
  p('');
  const PART = { league: 'искры Лиги ×10 (5.1.20)', pass: 'новая таблица Тропы (5.1.21)', medals: 'опыт Знаков ×10 (5.1.21)', exchange: 'обменник 1 000 → 1 (5.1.20)', rift: 'эссенция Рода в разломе (5.1.20)' };
  const rows = [];
  for (const part of OLD_PARTS) {
    const Lg = setup('old:' + part);
    for (const k of KEYS) {
      const a = run(Lg, k), b = R[k], dd = pa[1] - pa[0];
      const sI = r => inc(period(r, ...pa).sparks) / dd, zI = r => inc(period(r, ...pa).zlat) / dd, rI = r => inc(period(r, ...pa).rod) / dd;
      rows.push([PART[part], PROFILES[k].name, `${f0(sI(a))} → ${f0(sI(b))}`, `${f0(zI(a), 1)} → ${f0(zI(b), 1)}`, `${f0(rI(a), 1)} → ${f0(rI(b), 1)}`, `${day(a.goals.level30)} → ${day(b.goals.level30)}`, `${day(a.goals.level40)} → ${day(b.goals.level40)}`, `${day(a.goals.legendMax)} → ${day(b.goals.legendMax)}`]);
    }
  }
  table(['Правка (было → стало)', 'Тип', `✦ доход в день`, 'Монет в день', 'Рода в день', 'Уровень 30', 'Уровень 40', 'Легенда до максимума'], rows);
}

// ---------- 8. чувствительность к допущениям ----------
if (!args.includes('--fast') && KEYS.includes('regular')) {
  p('## 8. Чувствительность: обычный игрок, меняем одно допущение');
  p('');
  const base = PROFILES.regular, V = [
    ['как есть', {}], ['путь 5 км/день (как пешком с GPS)', { km: 5 }], ['путь 40 км/день', { km: 40 }], ['поимок 20 в день', { catches: 20 }], ['поимок 60 в день', { catches: 60 }],
    ['Лига: доля побед 0,5', { leagueP: 0.5 }], ['Лига: доля побед 0,7', { leagueP: 0.7 }], ['не переплавляет эссенцию', { melt: 0 }], ['не меняет искры на монеты', { exchange: 0 }],
    ['побед в разломах 3-й ступени 0,3 в день', { raids: { 1: 0.9, 2: 0.5, 3: 0.3 } }], ['играет 5 дней в неделю', { week: [1, 1, 1, 1, 1, 0, 0] }],
  ];
  const rows = [];
  for (const [name, ch] of V) {
    const r = run(now, 'regular', { profile: { ...base, ...ch } }), dd = pa[1] - pa[0];
    rows.push([name, day(r.goals.level30), day(r.goals.level40), passTxt(r), day(r.goals.zlat600), day(r.goals.rareMax), day(r.goals.league5 || null), f0(inc(period(r, ...pa).sparks) / dd), f0(inc(period(r, ...pa).zlat) / dd, 1)]);
  }
  table(['Допущение', 'Уровень 30', 'Уровень 40', '30 ступеней Тропы', '600 монет', 'Редкий до максимума', 'Лига «Золото»', '✦ в день', 'монет в день'], rows);
  const S2 = [['сезон Алатыря 20 дней', { seasonDays: 20 }], ['сезон Алатыря 45 дней', { seasonDays: 45 }], ['Орден не доходит до ступеней', { orderAll: false }]];
  const rows2 = [];
  for (const [name, c] of S2) { const r = run(now, 'regular', { common: c }); rows2.push([name, day(r.goals.level40), day(r.goals.league5 || null), day(r.goals.medalsGold), f0(inc(period(r, ...pa).sparks) / (pa[1] - pa[0]))]); }
  table(['Общее допущение', 'Уровень 40', 'Лига «Золото»', 'Все знаки в золоте', '✦ в день'], rows2);
}
// ---------- 9. предложение (только модель) ----------
if (!args.includes('--fast')) {
  p('## 9. Предложение: что даст (модель; в игре ничего не меняется)');
  p('');
  p('Сценарий `prop` (tools/economy/model.mjs, `patchProposal`) = tropa + medals + loot. **tropa** — бесплатная Тропа: искры ÷3, обереги ÷3, мёд ÷4, на 10, 20 и 30-й ступени + осколок Алатыря; Золотая — искры ÷2, Живая вода ÷3, на 15 и 25-й + осколок. **medals** — опыт Знаков 5 000 / 10 000 / 20 000. **loot** — источник даёт 3–5 предметов вместо 4–6, подорожник 2 → 1, отвар 0,8 → 0,3, Живая вода 0,6 → 0,3. **track** (отдельно, для сравнения) — в зачёт пути не больше 30 км в день. **per** (отдельно) — ступень Тропы 60 очков вместо 40. **ex2** (отдельно) — обменник ✦ 2 000 → 1 монета при тех же 5 обменах в день.');
  p('');
  const waste = r => ['charm', 'charm2', 'charm3', 'honey', 'water', 'herb', 'brew'].reduce((a, x) => a + (r.st.waste[x] || 0), 0);
  const use = r => { const f = merge(r.st.flow.charm, r.st.flow.charm2, r.st.flow.charm3); return inc(f) ? spd(f) / inc(f) * 100 : 0; };
  const rows = [];
  for (const sc of ['prop', 'prop:tropa', 'prop:medals', 'prop:loot', 'prop:track', 'prop:per', 'prop:ex2', 'prop:tropa,ex2']) {
    const Lg = setup(sc);
    for (const k of KEYS) {
      const a = R[k], b = run(Lg, k), dd = pa[1] - pa[0], sI = r => inc(period(r, ...pa).sparks) / dd, al = r => inc(period(r, ...pa).alatyr) / dd * 30, zI = r => inc(period(r, ...pa).zlat) / dd;
      rows.push([sc === 'prop' ? 'всё вместе' : sc.slice(5), PROFILES[k].name, `${f0(sI(a))} → ${f0(sI(b))}`, `${f0(a.daily[DAYS - 1].sparks)} → ${f0(b.daily[DAYS - 1].sparks)}`, `${f0(zI(a), 1)} → ${f0(zI(b), 1)}`, `${f0(al(a), 1)} → ${f0(al(b), 1)}`,
        `${day(a.goals.level30)} → ${day(b.goals.level30)}`, `${day(a.goals.level40)} → ${day(b.goals.level40)}`, `${day(a.goals.rareMax)} → ${day(b.goals.rareMax)}`, `${day(a.goals.legendMax)} → ${day(b.goals.legendMax)}`,
        `${f0(waste(a))} → ${f0(waste(b))}`, `${f0(use(a))}% → ${f0(use(b))}%`, `${passTxt(a).replace(/ \(.*\)/, '')} → ${passTxt(b).replace(/ \(.*\)/, '')}`]);
    }
  }
  table(['Часть', 'Тип', '✦ доход в день', `✦ на счету, день ${DAYS}`, 'монет в день', 'осколков в месяц', 'Уровень 30', 'Уровень 40', 'Редкий до максимума', 'Легенда до максимума', 'выброшено расходников за год', 'обереги: брошено из полученного', '30 ступеней Тропы'], rows);
}
p(`Готово за ${((Date.now() - t0) / 1000).toFixed(1)} с.`);

const text = out.join('\n');
if (arg('out')) writeFileSync(arg('out'), text); else console.log(text);
if (arg('json')) writeFileSync(arg('json'), JSON.stringify({ version: now.version, days: DAYS, drift: DRIFT, goals: Object.fromEntries(KEYS.map(k => [k, R[k].goals])), goalsOld: OLD ? Object.fromEntries(KEYS.map(k => [k, RO[k].goals])) : null,
  flows: Object.fromEntries(KEYS.map(k => [k, Object.fromEntries(periods.map(([a, b]) => [`${a + 1}-${b}`, period(R[k], a, b)]))])),
  flowsOld: OLD ? Object.fromEntries(KEYS.map(k => [k, Object.fromEntries(periods.map(([a, b]) => [`${a + 1}-${b}`, period(RO[k], a, b)]))])) : null,
  waste: Object.fromEntries(KEYS.map(k => [k, R[k].st.waste])), gold: Object.fromEntries(KEYS.map(k => [k, { months: RG[k].st.goldMonths, first: RG[k].goals.goldBought }])),
  daily: Object.fromEntries(KEYS.map(k => [k, R[k].daily.filter((x, i) => i % 5 === 0 || i < 10).map(x => ({ d: x.d + 1, level: x.level, sparks: Math.round(x.sparks), zlat: Math.round(x.zlat), rod: Math.round(x.rod), alatyr: +x.alatyr.toFixed(2), team: x.team, passLvl: x.passLvl, league: Math.round(x.league) }))])),
}, null, 1));
