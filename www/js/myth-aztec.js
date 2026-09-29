'use strict';
/* 4.28: духи и боги ацтекской мифологии — данные (поля — как у SPECIES в data.js; мифология задаётся сама) */
(globalThis.MYTH_SP = globalThis.MYTH_SP || {}).aztec = [
  // ---------- ОГОНЬ: Вулканчик → Дымогор → Попокатепетль ----------
  { id: 'az_vulkanchik', name: ru`Вулканчик`, el: 'fire', rar: 1, stage: 1, fam: 'az_vulkanchik', evo: 'az_dymogor', cost: 25, base: [118, 96, 108],
    desc: ru`Крошечный родственник великого Попокатепетля. Пыхает дымными колечками над клумбами и греет прохожим ладошки.`,
    look: { shape: 'round', c1: '#a07a64', c2: '#4a2f24', c3: '#ff9a1a', eyes: 'round', mouth: 'smile', back: [], feats: ['flame', 'cheeks'] } },
  { id: 'az_dymogor', name: ru`Дымогор`, el: 'fire', rar: 2, stage: 2, fam: 'az_vulkanchik', evo: 'az_popocatepetl', cost: 100, base: [172, 130, 146],
    desc: ru`Подросший Вулканчик. Когда сердится, пускает столб дыма выше телебашни, но сразу остывает, если угостить его горячим шоколадом.`,
    look: { shape: 'tall', c1: '#9a6a52', c2: '#3b2219', c3: '#ff7a1a', eyes: 'angry', mouth: 'teeth', back: ['steam'], feats: ['flame'] } },
  { id: 'az_popocatepetl', name: ru`Попокатепетль`, el: 'fire', rar: 3, stage: 3, fam: 'az_vulkanchik', base: [236, 180, 200],
    desc: ru`Курящаяся гора из старинного сказания: воин, который вечно стережёт сон своей любимой Истаксиуатль. Пыхает дымом над городом — тише, она спит.`,
    look: { shape: 'tall', c1: '#a8a29e', c2: '#44403c', c3: '#f8fafc', eyes: 'angry', mouth: 'none', back: ['aura', 'steam'], feats: ['flame', 'crown'] } },

  // ---------- ВОДА: Аксолотик → Аксолотль ----------
  { id: 'az_axolotik', name: ru`Аксолотик`, el: 'water', rar: 1, stage: 1, fam: 'az_axolotik', evo: 'az_axolotl', cost: 25, base: [104, 114, 122],
    desc: ru`Розовый малыш с пушистыми жабрами-веточками из каналов Шочимилько. Всегда улыбается и умеет отращивать потерянный хвостик.`,
    look: { shape: 'round', c1: '#fbcfe8', c2: '#f472b6', c3: '#f43f5e', eyes: 'big', mouth: 'smile', back: [], feats: ['cheeks', 'bubbles'] } },
  { id: 'az_axolotl', name: ru`Аксолотль`, el: 'water', rar: 2, stage: 2, fam: 'az_axolotik', base: [152, 166, 168],
    desc: ru`По преданию, в его облике бог Шолотль однажды спрятался в воде. Катается на расписных лодках-трахинерах и помнит все каналы старого Теночтитлана.`,
    look: { shape: 'blob', c1: '#f9a8d4', c2: '#db2777', c3: '#f43f5e', eyes: 'round', mouth: 'smile', back: ['ripples'], feats: ['bubbles', 'crown'] } },

  // ---------- ЛЕС: Початок → Маисовик → Сентеотль ----------
  { id: 'az_pochatok', name: ru`Початок`, el: 'forest', rar: 1, stage: 1, fam: 'az_pochatok', evo: 'az_maisovik', cost: 25, base: [108, 116, 118],
    desc: ru`Кукурузный малыш в зелёной обёртке. Прорастает у лотков с варёной кукурузой и мечтает о своей милпе — поле, где кукуруза, фасоль и тыква растут дружно.`,
    look: { shape: 'round', c1: '#fde047', c2: '#ca8a04', c3: '#65a30d', eyes: 'round', mouth: 'smile', back: [], feats: ['leaves', 'cheeks'] } },
  { id: 'az_maisovik', name: ru`Маисовик`, el: 'forest', rar: 2, stage: 2, fam: 'az_pochatok', evo: 'az_centeotl', cost: 100, base: [158, 168, 156],
    desc: ru`Дух кукурузного поля, обвитый фасолью, как шарфом. В городских огородах и на крышах следит, чтобы каждому зёрнышку хватило солнца.`,
    look: { shape: 'tall', c1: '#facc15', c2: '#a16207', c3: '#4d7c0f', eyes: 'round', mouth: 'smile', back: ['wheat'], feats: ['leaves', 'sprout'] } },
  { id: 'az_centeotl', name: ru`Сентеотль`, el: 'forest', rar: 3, stage: 3, fam: 'az_pochatok', base: [214, 228, 210],
    desc: ru`Юный бог молодой кукурузы с золотыми початками в уборе. Ацтеки верили, что от него пошли все злаки; в городе он будит скверы и огороды на крышах.`,
    look: { shape: 'robe', c1: '#fde68a', c2: '#15803d', c3: '#facc15', eyes: 'round', mouth: 'smile', back: ['aura', 'wheat'], feats: ['crown', 'leaves'] } },

  // ---------- ВЕТЕР: Колибрик → Уицицилин ----------
  { id: 'az_kolibrik', name: ru`Колибрик`, el: 'wind', rar: 1, stage: 1, fam: 'az_kolibrik', evo: 'az_uitsitsilin', cost: 25, base: [122, 92, 104],
    desc: ru`Крошечный колибри, который жужжит громче шмеля. Облетает все цветы на балконах и ни одного не пропускает.`,
    look: { shape: 'bird', c1: '#6ee7b7', c2: '#047857', c3: '#ef4444', eyes: 'round', mouth: 'beak', back: ['wings'], feats: [] } },
  { id: 'az_uitsitsilin', name: ru`Уицицилин`, el: 'wind', rar: 2, stage: 2, fam: 'az_kolibrik', base: [176, 126, 144],
    desc: ru`Так на языке ацтеков зовут колибри — посланца солнца. Зависает в воздухе перед витринами и сверкает бирюзовыми перьями ярче неоновых вывесок.`,
    look: { shape: 'bird', c1: '#5eead4', c2: '#0f766e', c3: '#e11d48', eyes: 'round', mouth: 'beak', back: ['wings', 'tail'], feats: ['crest'] } },

  // ---------- ТОК: Тлалокито → Тлалоке ----------
  { id: 'az_tlalokito', name: ru`Тлалокито`, el: 'current', rar: 1, stage: 1, fam: 'az_tlalokito', evo: 'az_tlaloque', cost: 25, base: [116, 100, 110],
    desc: ru`Маленький помощник бога дождя с глиняным кувшином. Если он уронит кувшин — над городом гремит гром и мигают фонари.`,
    look: { shape: 'round', c1: '#7dd3fc', c2: '#0369a1', c3: '#facc15', eyes: 'big', mouth: 'smile', back: [], feats: ['bolt', 'cheeks'] } },
  { id: 'az_tlaloque', name: ru`Тлалоке`, el: 'current', rar: 2, stage: 2, fam: 'az_tlalokito', base: [168, 140, 148],
    desc: ru`Подросший помощник Тлалока. Разбивает кувшины о тучи, и из них вырываются гром и молнии. После грозы старательно склеивает осколки.`,
    look: { shape: 'tall', c1: '#60a5fa', c2: '#1e3a8a', c3: '#facc15', eyes: 'angry', mouth: 'teeth', back: [], feats: ['bolt', 'drops'] } },

  // ---------- ТЕНЬ: Шоло → Шолоитцкуинтли → Шолотль ----------
  { id: 'az_sholo', name: ru`Шоло`, el: 'shadow', rar: 1, stage: 1, fam: 'az_sholo', evo: 'az_xoloitzcuintli', cost: 25, base: [114, 100, 106], time: 'night',
    desc: ru`Голая собачка-шолоитцкуинтли, тёплая, как грелка. Провожает запоздавших прохожих до подъезда и никогда не путает дорогу.`,
    look: { shape: 'round', c1: '#78716c', c2: '#292524', c3: '#fb923c', eyes: 'big', mouth: 'cat', back: ['ears'], feats: ['snout'] } },
  { id: 'az_xoloitzcuintli', name: ru`Шолоитцкуинтли`, el: 'shadow', rar: 2, stage: 2, fam: 'az_sholo', evo: 'az_xolotl', cost: 100, base: [170, 128, 144],
    desc: ru`Древний пёс-проводник: по поверьям ацтеков, такие собаки помогали душам перейти реку на пути в Миктлан. В городе знает все подземные переходы.`,
    look: { shape: 'tall', c1: '#57534e', c2: '#1c1917', c3: '#fb923c', eyes: 'round', mouth: 'none', back: ['ears'], feats: ['snout', 'lamp'] } },
  { id: 'az_xolotl', name: ru`Шолотль`, el: 'shadow', rar: 3, stage: 3, fam: 'az_sholo', base: [230, 168, 188],
    desc: ru`Бог вечерней звезды с собачьей головой, брат-близнец Кецалькоатля. Каждый вечер провожает солнце за горизонт и зажигает первую звезду над городом.`,
    look: { shape: 'robe', c1: '#6366f1', c2: '#1e1b4b', c3: '#fde68a', eye: '#fde68a', eyes: 'glow', mouth: 'none', back: ['ears', 'aura'], feats: ['snout', 'crown'] } },

  // ---------- редкие существа ----------
  { id: 'az_ahuizotl', name: ru`Ауисотль`, el: 'water', rar: 3, stage: 1, fam: 'az_ahuizotl', base: [214, 168, 190], time: 'night',
    desc: ru`Водяной пёс с ладошкой на кончике хвоста. Живёт в фонтанах и каналах и утаскивает на дно брошенные монетки — а заодно и уроненные телефоны.`,
    look: { shape: 'blob', c1: '#475569', c2: '#0f172a', c3: '#fbbf24', eye: '#fbbf24', eyes: 'glow', mouth: 'teeth', back: ['cattail', 'ears'], feats: ['drops'] } },
  { id: 'az_cipactli', name: ru`Сипактли`, el: 'forest', rar: 3, stage: 1, fam: 'az_cipactli', base: [184, 210, 206],
    desc: ru`Исполинский крокодил первоокеана: из его спины боги сделали землю — поэтому на ней и растут травы и деревья. Дремлет в городских прудах.`,
    look: { shape: 'blob', c1: '#6ee7b7', c2: '#065f46', c3: '#84cc16', eyes: 'round', mouth: 'teeth', back: ['sprout'], feats: ['snout', 'leaves'] } },
  { id: 'az_xiuhcoatl', name: ru`Шиукоатль`, el: 'current', rar: 3, stage: 1, fam: 'az_xiuhcoatl', base: [224, 148, 176],
    desc: ru`Бирюзовый огненный змей, оружие Уицилопочтли. Проносится молнией по проводам, а хвост у него искрит, как бенгальский огонь.`,
    look: { shape: 'wisp', c1: '#5eead4', c2: '#0f766e', c3: '#f97316', eye: '#fde047', eyes: 'glow', mouth: 'teeth', back: ['tail'], feats: ['bolt', 'flame'] } },

  // ---------- эпические боги ----------
  { id: 'az_tlaloc', name: ru`Тлалок`, el: 'water', rar: 4, stage: 1, fam: 'az_tlaloc', base: [206, 214, 218],
    desc: ru`Бог дождя и грома в маске с кругами у глаз. Живёт в горном саду Тлалокан и поливает город тёплыми ливнями — после них всё цветёт.`,
    look: { shape: 'robe', c1: '#7dd3fc', c2: '#0c4a6e', c3: '#e0f2fe', eyes: 'big', mouth: 'teeth', back: ['aura', 'ripples'], feats: ['crown', 'bolt'] } },
  { id: 'az_huitzilopochtli', name: ru`Уицилопочтли`, el: 'fire', rar: 4, stage: 1, fam: 'az_huitzilopochtli', base: [230, 186, 196], time: 'day',
    desc: ru`Бог солнца в шлеме-колибри. По преданию, он привёл ацтеков к озеру, где орёл сидел на кактусе, — там и вырос Теночтитлан. Выходит только днём.`,
    look: { shape: 'robe', c1: '#60a5fa', c2: '#1e3a8a', c3: '#fbbf24', eyes: 'angry', mouth: 'none', back: ['halo', 'wings'], feats: ['crest'] } },

  // ---------- великие боги-легенды ----------
  { id: 'az_quetzalcoatl', name: ru`Кецалькоатль`, el: 'wind', rar: 5, stage: 1, fam: 'az_quetzalcoatl', legend: true, base: [292, 238, 256],
    desc: ru`Легенда. Пернатый Змей, бог ветра и мудрости, подаривший людям кукурузу и календарь. Его ветер расчищает дорогу дождям. Встречается только в разломах.`,
    look: { shape: 'wisp', c1: '#34d399', c2: '#065f46', c3: '#fbbf24', eye: '#fde68a', eyes: 'glow', mouth: 'none', back: ['aura', 'wings', 'tail'], feats: ['crest', 'swirl'] } },
  { id: 'az_tezcatlipoca', name: ru`Тескатлипока`, el: 'shadow', rar: 5, stage: 1, fam: 'az_tezcatlipoca', legend: true, base: [298, 226, 244],
    desc: ru`Легенда. Дымящееся Зеркало, владыка ночного неба и вечный соперник Кецалькоатля. В его обсидиановом зеркале видно всё, что творится на свете. Ищи его в тёмных разломах.`,
    look: { shape: 'robe', c1: '#44403c', c2: '#0c0a09', c3: '#facc15', eye: '#facc15', eyes: 'glow', mouth: 'none', back: ['aura', 'cattail'], feats: ['crown', 'runes'] } },
];
