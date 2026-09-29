'use strict';
/* 4.28: духи и боги кельтской мифологии — данные (поля — как у SPECIES в data.js; мифология задаётся сама) */
(globalThis.MYTH_SP = globalThis.MYTH_SP || {}).celtic = [
  // ---------- огонь: блуждающий огонёк → Джек-фонарь ----------
  { id: 'ce_wisp', name: ru`Блуждающий огонёк`, el: 'fire', rar: 1, stage: 1, fam: 'ce_wisp', evo: 'ce_jack', cost: 25, base: [120, 92, 104], time: 'night',
    desc: ru`Когда-то водил путников кругами по болотам, а теперь мерцает над мокрыми газонами и зовёт срезать путь. Путь, конечно, выходит длиннее.`,
    look: { shape: 'wisp', c1: '#fde68a', c2: '#f97316', c3: '#fff7ed', eyes: 'big', mouth: 'smile', back: ['aura'], feats: ['flame', 'cheeks'] } },
  { id: 'ce_jack', name: ru`Джек-фонарь`, el: 'fire', rar: 2, stage: 2, fam: 'ce_wisp', base: [172, 132, 146],
    desc: ru`Хитрец Джек бродит с угольком в резной репе с тех пор, как перехитрил всех на свете. В ночь Самайна подмигивает с каждого крыльца.`,
    look: { shape: 'round', c1: '#fdba74', c2: '#c2410c', c3: '#fde047', eyes: 'glow', mouth: 'teeth', back: [], feats: ['flame', 'hat'] } },

  // ---------- вода: Тюленёк → Селки → Мерроу ----------
  { id: 'ce_seal', name: ru`Тюленёк`, el: 'water', rar: 1, stage: 1, fam: 'ce_seal', evo: 'ce_selkie', cost: 25, base: [104, 114, 122],
    desc: ru`Любопытный тюлений малыш с глазами-пуговками. Выныривает у набережных и прячет в ластах гладкие морские стёклышки.`,
    look: { shape: 'drop', c1: '#cbd5e1', c2: '#475569', c3: '#e0f2fe', eyes: 'big', mouth: 'cat', back: [], feats: ['whiskers', 'cheeks'] } },
  { id: 'ce_selkie', name: ru`Селки`, el: 'water', rar: 2, stage: 2, fam: 'ce_seal', evo: 'ce_merrow', cost: 100, base: [152, 160, 168],
    desc: ru`Сбрасывает тюленью шкурку и выходит на берег человеком. Гуляет по набережной со шкуркой через плечо: без неё в море не вернуться.`,
    look: { shape: 'ghost', c1: '#bae6fd', c2: '#334155', c3: '#94a3b8', eyes: 'big', mouth: 'smile', back: ['hair'], feats: ['bubbles'] } },
  { id: 'ce_merrow', name: ru`Мерроу`, el: 'water', rar: 3, stage: 3, fam: 'ce_seal', base: [210, 214, 232],
    desc: ru`Морская дева ирландских берегов в красной шапочке — без неё не нырнуть. Поёт перед штормом, и портовые краны сами разворачиваются по ветру.`,
    look: { shape: 'ghost', c1: '#99f6e4', c2: '#0f766e', c3: '#ef4444', eyes: 'round', mouth: 'smile', back: ['hair', 'ripples'], feats: ['hat', 'bubbles'] } },

  // ---------- лес: Клеверок → Лепрекон → Иубдан ----------
  { id: 'ce_clover', name: ru`Клеверок`, el: 'forest', rar: 1, stage: 1, fam: 'ce_clover', evo: 'ce_leprechaun', cost: 25, base: [106, 116, 118],
    desc: ru`Трилистник, проснувшийся на газоне в день святого Патрика. Найдёшь у него четвёртый листок — весь день будет везти.`,
    look: { shape: 'round', c1: '#86efac', c2: '#15803d', c3: '#fde047', eyes: 'round', mouth: 'smile', back: [], feats: ['sprout', 'cheeks'] } },
  { id: 'ce_leprechaun', name: ru`Лепрекон`, el: 'forest', rar: 2, stage: 2, fam: 'ce_clover', evo: 'ce_iubdan', cost: 100, base: [158, 164, 156],
    desc: ru`Сапожник волшебного народа: шьёт по одному башмаку, никогда — пару. Горшок золота прячет у конца радуги, а монетки роняет у банкоматов.`,
    look: { shape: 'round', c1: '#4ade80', c2: '#166534', c3: '#facc15', eyes: 'round', mouth: 'smile', back: [], feats: ['hat', 'beard'] } },
  { id: 'ce_iubdan', name: ru`Король Иубдан`, el: 'forest', rar: 3, stage: 3, fam: 'ce_clover', base: [218, 226, 206],
    desc: ru`Король лепреконов из древней саги: ростом с ладонь, а гордости — на великана. Правит крошечным королевством под клумбами и считает каждую радугу своей.`,
    look: { shape: 'robe', c1: '#22c55e', c2: '#14532d', c3: '#facc15', eyes: 'round', mouth: 'smile', back: ['aura'], feats: ['crown', 'beard'] } },

  // ---------- ветер: Пикси → Фея холмов → Королева Мэб ----------
  { id: 'ce_pixie', name: ru`Пикси`, el: 'wind', rar: 1, stage: 1, fam: 'ce_pixie', evo: 'ce_sidhe', cost: 25, base: [118, 94, 108],
    desc: ru`Крошечная фея корнуоллских холмов, катается на сквозняках. Если ты заблудился в трёх дворах — значит, тебя водили пикси.`,
    look: { shape: 'round', c1: '#bfdbfe', c2: '#6366f1', c3: '#f0abfc', eyes: 'big', mouth: 'smile', back: ['wings', 'ears'], feats: ['cheeks'] } },
  { id: 'ce_sidhe', name: ru`Фея холмов`, el: 'wind', rar: 2, stage: 2, fam: 'ce_pixie', evo: 'ce_mab', cost: 100, base: [170, 130, 146],
    desc: ru`Из народа ши, что живёт внутри зелёных холмов. Танцует в грибных кругах на газонах — не вставай в круг, а то протанцуешь до утра.`,
    look: { shape: 'ghost', c1: '#e0e7ff', c2: '#6366f1', c3: '#a7f3d0', eyes: 'round', mouth: 'smile', back: ['wings', 'hair'], feats: ['leaves'] } },
  { id: 'ce_mab', name: ru`Королева Мэб`, el: 'wind', rar: 3, stage: 3, fam: 'ce_pixie', base: [236, 172, 190],
    desc: ru`Королева фей и повелительница снов. Разъезжает в колеснице из ореховой скорлупки и нашёптывает спящему городу сны.`,
    look: { shape: 'robe', c1: '#c7d2fe', c2: '#4338ca', c3: '#f0abfc', eyes: 'sleepy', mouth: 'smile', back: ['wings', 'hair', 'aura'], feats: ['crown'] } },

  // ---------- ток: Брауни → Боггарт ----------
  { id: 'ce_brownie', name: ru`Брауни`, el: 'current', rar: 1, stage: 1, fam: 'ce_brownie', evo: 'ce_boggart', cost: 25, base: [110, 112, 112],
    desc: ru`Косматый шотландский домовичок. По ночам тихо чинит зарядки и лампочки, а в награду просит лишь миску сливок. Только не дари ему одежду — обидится!`,
    look: { shape: 'round', c1: '#d6a878', c2: '#7c4a1d', c3: '#fde047', eyes: 'round', mouth: 'smile', back: [], feats: ['beard', 'lamp'] } },
  { id: 'ce_boggart', name: ru`Боггарт`, el: 'current', rar: 2, stage: 2, fam: 'ce_brownie', base: [166, 142, 150],
    desc: ru`Брауни, которого обидели, — и он стал Боггартом. Щёлкает выключателями, выбивает пробки и прячет пульт, пока ему снова не нальют сливок.`,
    look: { shape: 'blob', c1: '#a8a29e', c2: '#44403c', c3: '#facc15', eyes: 'angry', mouth: 'teeth', back: ['ears'], feats: ['bolt', 'cables'] } },

  // ---------- тень: Пука → Пука-скакун ----------
  { id: 'ce_puca', name: ru`Пука`, el: 'shadow', rar: 1, stage: 1, fam: 'ce_puca', evo: 'ce_pucahorse', cost: 25, base: [120, 96, 104], time: 'night',
    desc: ru`Проказник-оборотень: то чёрный зайчонок, то козлёнок, то котёнок. После Самайна портит всю ежевику, поэтому в ноябре её не собирают.`,
    look: { shape: 'round', c1: '#475569', c2: '#0f172a', c3: '#fbbf24', eye: '#fbbf24', eyes: 'glow', mouth: 'cat', back: ['ears'], feats: ['horns'] } },
  { id: 'ce_pucahorse', name: ru`Пука-скакун`, el: 'shadow', rar: 2, stage: 2, fam: 'ce_puca', base: [174, 128, 144], time: 'night',
    desc: ru`Любимый облик Пуки — чёрный конь с золотыми глазами. Сажает на спину запоздалого прохожего и катает по ночному городу до рассвета.`,
    look: { shape: 'blob', c1: '#334155', c2: '#020617', c3: '#fbbf24', eye: '#fbbf24', eyes: 'glow', mouth: 'none', back: ['mane', 'tail'], feats: ['snout'] } },

  // ---------- редкие ----------
  { id: 'ce_draig', name: ru`Уэльский дракон`, el: 'fire', rar: 3, stage: 1, fam: 'ce_draig', base: [224, 164, 186],
    desc: ru`Красный дракон с флага Уэльса, что одолел белого дракона под горой. Теперь греется на крышах вокзалов и чихает искрами в туман.`,
    look: { shape: 'blob', c1: '#f87171', c2: '#991b1b', c3: '#fde047', eyes: 'angry', mouth: 'teeth', back: ['wings', 'tail'], feats: ['horns', 'flame'] } },
  { id: 'ce_banshee', name: ru`Банши`, el: 'wind', rar: 3, stage: 1, fam: 'ce_banshee', base: [210, 150, 176], time: 'night',
    desc: ru`Дева из холмов, чей плач над старыми улицами предупреждает о беде. Шумная, но добрая: расчёсывает серебряным гребнем волосы из тумана.`,
    look: { shape: 'ghost', c1: '#f1f5f9', c2: '#64748b', c3: '#cbd5e1', eye: '#a5f3fc', eyes: 'glow', mouth: 'o', back: ['hair'], feats: [] } },
  { id: 'ce_caitsith', name: ru`Кайт Ши`, el: 'shadow', rar: 3, stage: 1, fam: 'ce_caitsith', base: [200, 184, 196], time: 'night',
    desc: ru`Огромный чёрный кот фей с белым пятном на груди. В Самайн шотландцы оставляли ему блюдце молока — и он до сих пор обходит дворы, проверяя, не забыли ли.`,
    look: { shape: 'round', c1: '#374151', c2: '#030712', c3: '#f8fafc', eye: '#86efac', eyes: 'glow', mouth: 'cat', back: ['cattail', 'ears'], feats: ['whiskers'] } },

  // ---------- эпические боги ----------
  { id: 'ce_morrigan', name: ru`Морриган`, el: 'shadow', rar: 4, stage: 1, fam: 'ce_morrigan', base: [228, 180, 190],
    desc: ru`Великая королева-прорицательница, что оборачивается вороном. Глядит на город со шпилей и башен и заранее знает, чем кончится любой спор.`,
    look: { shape: 'robe', c1: '#475569', c2: '#0f172a', c3: '#dc2626', eye: '#f87171', eyes: 'glow', mouth: 'none', back: ['wings', 'hair'], feats: ['crown'] } },
  { id: 'ce_manannan', name: ru`Мананнан мак Лир`, el: 'water', rar: 4, stage: 1, fam: 'ce_manannan', base: [212, 208, 214],
    desc: ru`Бог моря и хозяин острова Мэн. Укрывает гавани плащом тумана, а по волнам скачет на коне Энбарр, как по полю.`,
    look: { shape: 'robe', c1: '#7dd3fc', c2: '#0c4a6e', c3: '#e0f2fe', eyes: 'round', mouth: 'none', back: ['aura', 'ripples'], feats: ['beard', 'crown'] } },

  // ---------- великие боги-легенды ----------
  { id: 'ce_dagda', name: ru`Дагда`, el: 'forest', rar: 5, stage: 1, fam: 'ce_dagda', legend: true, base: [288, 250, 262],
    desc: ru`Легенда. Добрый бог, отец ирландских богов: из его котла никто не уходит голодным, а арфа сама сменяет времена года. Встречается только в разломах.`,
    look: { shape: 'robe', c1: '#65a30d', c2: '#1a2e05', c3: '#b45309', eyes: 'round', mouth: 'smile', back: ['aura', 'halo'], feats: ['beard', 'leaves'] } },
  { id: 'ce_lugh', name: ru`Луг`, el: 'current', rar: 5, stage: 1, fam: 'ce_lugh', legend: true, base: [302, 224, 242],
    desc: ru`Легенда. Сияющий бог, мастер всех искусств — кузнец, поэт, воин и арфист разом. Его копьё само рвётся в бой и сверкает, как молния. Появляется только в разломах.`,
    look: { shape: 'robe', c1: '#fef08a', c2: '#ca8a04', c3: '#f8fafc', eye: '#fef9c3', eyes: 'glow', mouth: 'none', back: ['aura', 'halo'], feats: ['bolt', 'crown'] } },
];
