'use strict';
/* 4.28: духи и боги китайской мифологии — данные (поля — как у SPECIES в data.js; мифология задаётся сама) */
(globalThis.MYTH_SP = globalThis.MYTH_SP || {}).china = [
  // ---------- младшие семейства ----------
  // Ток: лисий дух — хвостов прибавляется с каждой стадией (1 → 3 → 9), лисья жемчужина искрит, как шаровая молния
  { id: 'cn_huli', name: ru`Лисёнок Хули`, el: 'current', rar: 1, stage: 1, fam: 'cn_huli', evo: 'cn_hulijing', cost: 25, base: [116, 96, 106],
    desc: ru`Юный лисий дух с одним пушистым хвостом. Прячется за вывесками ночных рынков и тренирует свою жемчужинку — пока она только щёлкает, как статика.`,
    look: { shape: 'round', c1: '#fdba74', c2: '#ea580c', c3: '#fde047', eyes: 'big', mouth: 'cat', back: ['cattail', 'ears'], feats: ['cheeks', 'whiskers'] } },
  { id: 'cn_hulijing', name: ru`Хули-цзин`, el: 'current', rar: 2, stage: 2, fam: 'cn_huli', evo: 'cn_jiuweihu', cost: 100, base: [172, 130, 144],
    desc: ru`Лиса-оборотень с тремя хвостами. Может обернуться кем угодно, но всегда выдаёт себя хвостом, торчащим из-под плаща.`,
    look: { shape: 'tall', c1: '#fb923c', c2: '#c2410c', c3: '#facc15', eyes: 'sleepy', mouth: 'cat', back: ['cattail', 'ears'], feats: ['whiskers', 'bolt'] } },
  { id: 'cn_jiuweihu', name: ru`Девятихвостая лиса`, el: 'current', rar: 3, stage: 3, fam: 'cn_huli', base: [238, 168, 190],
    desc: ru`Каждый хвост — сто лет мудрости. Когда она взмахивает всеми девятью, в квартале на миг гаснут и снова вспыхивают все вывески.`,
    look: { shape: 'tall', c1: '#fef3c7', c2: '#f59e0b', c3: '#facc15', eye: '#fde047', eyes: 'glow', mouth: 'none', back: ['aura', 'cattail', 'ears'], feats: ['bolt', 'crown'] } },

  // Вода: карп, прыгнувший через Врата дракона, становится драконом
  { id: 'cn_karpik', name: ru`Карпик`, el: 'water', rar: 1, stage: 1, fam: 'cn_karpik', evo: 'cn_jinli', cost: 25, base: [102, 114, 122],
    desc: ru`Маленький карп из пруда в парке. Каждый день тренируется прыгать через фонтан — готовится к Вратам дракона.`,
    look: { shape: 'drop', c1: '#fdba74', c2: '#ea580c', c3: '#fff7ed', eyes: 'big', mouth: 'o', back: ['tail'], feats: ['bubbles'] } },
  { id: 'cn_jinli', name: ru`Золотой карп`, el: 'water', rar: 2, stage: 2, fam: 'cn_karpik', evo: 'cn_jiaolong', cost: 100, base: [152, 160, 168],
    desc: ru`Упрямо плывёт вверх по течению — хоть по водосточной трубе. До Врат дракона ему остался один прыжок.`,
    look: { shape: 'blob', c1: '#fde047', c2: '#d97706', c3: '#fff7ed', eyes: 'angry', mouth: 'o', back: ['tail', 'ripples'], feats: ['whiskers', 'bubbles'] } },
  { id: 'cn_jiaolong', name: ru`Цзяолун`, el: 'water', rar: 3, stage: 3, fam: 'cn_karpik', base: [224, 206, 226],
    desc: ru`Карп, который перепрыгнул Врата дракона и стал драконом. Рога ещё растут, а плавники он по старой привычке не прячет.`,
    look: { shape: 'tall', c1: '#fcd34d', c2: '#b45309', c3: '#38bdf8', eyes: 'angry', mouth: 'teeth', back: ['tail', 'mane'], feats: ['horns', 'whiskers'] } },

  // Ветер: пиксиу — крылатый зверь фэншуя («фэн» — ветер), глотает монеты и хранит удачу
  { id: 'cn_monetoed', name: ru`Монетоед`, el: 'wind', rar: 1, stage: 1, fam: 'cn_monetoed', evo: 'cn_pixiu', cost: 25, base: [108, 112, 118],
    desc: ru`Детёныш пиксиу. Вылавливает монетки из фонтанов и сразу их глотает — что попало ему в пасть, назад уже не вернётся.`,
    look: { shape: 'round', c1: '#fde68a', c2: '#ca8a04', c3: '#dc2626', eyes: 'big', mouth: 'smile', back: ['wings'], feats: ['cheeks', 'horns'] } },
  { id: 'cn_pixiu', name: ru`Пиксиу`, el: 'wind', rar: 2, stage: 2, fam: 'cn_monetoed', evo: 'cn_tianlu', cost: 100, base: [160, 166, 156],
    desc: ru`Крылатый зверь фэншуя. Сидит у дверей магазинов и банков и следит, чтобы ветер удачи не выдувал деньги за порог.`,
    look: { shape: 'blob', c1: '#fcd34d', c2: '#a16207', c3: '#dc2626', eyes: 'angry', mouth: 'teeth', back: ['wings', 'mane'], feats: ['horns'] } },
  { id: 'cn_tianlu', name: ru`Тяньлу`, el: 'wind', rar: 3, stage: 3, fam: 'cn_monetoed', base: [214, 228, 212],
    desc: ru`Небесный пиксиу с одним рогом. Когда он раскрывает крылья над кварталом, в тот день никто в округе не теряет кошелёк.`,
    look: { shape: 'blob', c1: '#fef3c7', c2: '#b45309', c3: '#10b981', eyes: 'angry', mouth: 'teeth', back: ['wings', 'mane', 'aura', 'unihorn'], feats: [] } },

  // Тень: цзянши — прыгающий дух в шапочке с талисманом (только смешной)
  { id: 'cn_prygun', name: ru`Прыгунчик`, el: 'shadow', rar: 1, stage: 1, fam: 'cn_prygun', evo: 'cn_jiangshi', cost: 25, base: [120, 92, 106], time: 'night',
    desc: ru`Маленький цзянши в шапочке с жёлтым талисманом. Ходить не умеет — только прыгает, вытянув ручки, и очень этим гордится.`,
    look: { shape: 'box', c1: '#a7f3d0', c2: '#047857', c3: '#facc15', eyes: 'sleepy', mouth: 'o', back: [], feats: ['hat', 'cheeks'] } },
  { id: 'cn_jiangshi', name: ru`Цзянши`, el: 'shadow', rar: 2, stage: 2, fam: 'cn_prygun', base: [174, 128, 146], time: 'night',
    desc: ru`Прыгающий дух в халате старинного чиновника. По поверью, если задержать дыхание, он тебя не заметит — вот Ловчие и ловят его красные от натуги.`,
    look: { shape: 'box', c1: '#6ee7b7', c2: '#1e3a8a', c3: '#facc15', eyes: 'sleepy', mouth: 'teeth', back: [], feats: ['hat', 'runes'] } },

  // Огонь: красный бумажный фонарик → фонарь желаний
  { id: 'cn_fonarik', name: ru`Фонарик`, el: 'fire', rar: 1, stage: 1, fam: 'cn_fonarik', evo: 'cn_kongming', cost: 25, base: [114, 102, 110],
    desc: ru`Красный бумажный фонарик с кисточкой, сбежавший с праздничной улицы. Светит тем, кто поздно возвращается домой.`,
    look: { shape: 'round', c1: '#f87171', c2: '#b91c1c', c3: '#facc15', eyes: 'round', mouth: 'smile', back: [], feats: ['flame', 'cheeks'] } },
  { id: 'cn_kongming', name: ru`Небесный фонарь`, el: 'fire', rar: 2, stage: 2, fam: 'cn_fonarik', base: [166, 142, 152],
    desc: ru`Фонарь желаний: в него вписывают мечты и отпускают в небо. Летает над крышами и проверяет, какие желания уже сбылись.`,
    look: { shape: 'tall', c1: '#fde68a', c2: '#ea580c', c3: '#dc2626', eyes: 'round', mouth: 'smile', back: ['aura'], feats: ['flame'] } },

  // Лес: нефритовый заяц с Луны толчёт в ступке травы бессмертия
  { id: 'cn_zaychonok', name: ru`Нефритовый зайчонок`, el: 'forest', rar: 1, stage: 1, fam: 'cn_zaychonok', evo: 'cn_yutu', cost: 25, base: [104, 116, 120],
    desc: ru`Скатился с Луны прямо в городской сквер. Собирает травки на газонах и толчёт их в крышечке от бутылки.`,
    look: { shape: 'round', c1: '#d1fae5', c2: '#10b981', c3: '#f9a8d4', eyes: 'big', mouth: 'cat', back: ['ears'], feats: ['cheeks', 'sprout'] } },
  { id: 'cn_yutu', name: ru`Нефритовый заяц`, el: 'forest', rar: 2, stage: 2, fam: 'cn_zaychonok', base: [150, 168, 162],
    desc: ru`Помощник лунной девы: толчёт в нефритовой ступке травы бессмертия. В полнолуние его стук слышно даже сквозь шум машин.`,
    look: { shape: 'tall', c1: '#ecfdf5', c2: '#059669', c3: '#f9a8d4', eyes: 'round', mouth: 'cat', back: ['ears'], feats: ['leaves'] } },

  // ---------- знаменитые существа ----------
  { id: 'cn_fenghuang', name: ru`Фэнхуан`, el: 'fire', rar: 3, stage: 1, fam: 'cn_fenghuang', base: [212, 178, 200],
    desc: ru`Птица-феникс, вестница мира и согласия. Садится только на дерево утун, поэтому над городом она подолгу кружит, выбирая ветку.`,
    look: { shape: 'bird', c1: '#fca5a5', c2: '#dc2626', c3: '#fbbf24', eyes: 'round', mouth: 'beak', back: ['tail', 'wings'], feats: ['crest'] } },
  { id: 'cn_qilin', name: ru`Цилинь`, el: 'forest', rar: 3, stage: 1, fam: 'cn_qilin', base: [186, 210, 212],
    desc: ru`Добрый зверь с драконьей чешуёй и оленьими рогами. Ступает так легко, что не сминает ни травинки — даже на газоне, где ходить нельзя.`,
    look: { shape: 'blob', c1: '#a7f3d0', c2: '#047857', c3: '#fbbf24', eyes: 'round', mouth: 'smile', back: ['mane', 'tail', 'antlers'], feats: [] } },
  { id: 'cn_baihu', name: ru`Белый тигр`, el: 'current', rar: 3, stage: 1, fam: 'cn_baihu', base: [226, 150, 176],
    desc: ru`Байху, страж Запада и повелитель металла. Когда он рычит, в проводах поднимается гул, а у прохожих волосы встают дыбом.`,
    look: { shape: 'round', c1: '#f8fafc', c2: '#94a3b8', c3: '#1e293b', eyes: 'angry', mouth: 'teeth', back: ['cattail', 'ears'], feats: ['whiskers', 'bolt'] } },

  // ---------- эпические ----------
  { id: 'cn_change', name: ru`Чанъэ`, el: 'shadow', rar: 4, stage: 1, fam: 'cn_change', base: [210, 200, 212], time: 'night',
    desc: ru`Лунная дева, что выпила эликсир бессмертия и поднялась на Луну. В Праздник середины осени спускается туда, где пекут лунные пряники.`,
    look: { shape: 'robe', c1: '#f5f3ff', c2: '#7c3aed', c3: '#fde68a', eyes: 'sleepy', mouth: 'smile', back: ['hair', 'halo'], feats: ['crown'] } },
  { id: 'cn_houyi', name: ru`Хоу И`, el: 'fire', rar: 4, stage: 1, fam: 'cn_houyi', base: [232, 180, 190],
    desc: ru`Великий лучник, сбивший девять солнц, когда их взошло десять и земля изнывала от зноя. До сих пор недоверчиво щурится на каждый прожектор.`,
    look: { shape: 'robe', c1: '#fca5a5', c2: '#991b1b', c3: '#fbbf24', eyes: 'angry', mouth: 'none', back: ['aura'], feats: ['beard', 'hat'] } },

  // ---------- великие легенды ----------
  { id: 'cn_qinglong', name: ru`Цинлун`, el: 'water', rar: 5, stage: 1, fam: 'cn_qinglong', legend: true, base: [296, 238, 250],
    desc: ru`Легенда. Лазурный дракон Востока, повелитель весенних дождей: где он пролетит, распускаются деревья. Встречается только в разломах.`,
    look: { shape: 'tall', c1: '#5eead4', c2: '#0f766e', c3: '#fbbf24', eyes: 'angry', mouth: 'teeth', back: ['aura', 'mane', 'tail'], feats: ['horns', 'whiskers'] } },
  { id: 'cn_wukong', name: ru`Сунь Укун`, el: 'wind', rar: 5, stage: 1, fam: 'cn_wukong', legend: true, base: [300, 224, 244],
    desc: ru`Легенда. Царь обезьян, Великий мудрец, равный Небу: одним кувырком на облаке пролетает сто восемь тысяч ли. Встречается только в разломах.`,
    look: { shape: 'round', c1: '#fcd34d', c2: '#92400e', c3: '#dc2626', eyes: 'angry', mouth: 'teeth', back: ['aura', 'cattail'], feats: ['crown'] } },
];
