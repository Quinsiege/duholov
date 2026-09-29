'use strict';
/* 4.28: духи и боги египетской мифологии — данные (поля — как у SPECIES в data.js; мифология задаётся сама) */
(globalThis.MYTH_SP = globalThis.MYTH_SP || {}).egypt = [
  // ---------- семейства младших духов: скарабей → Хепри (огонь), крокодильчик → Себек (вода), ибис (ток) ----------
  { id: 'eg_skarab', name: ru`Скарабейка`, el: 'fire', rar: 1, stage: 1, fam: 'eg_skarab', evo: 'eg_solncekat', cost: 25, base: [114, 104, 110],
    desc: ru`Каждое утро катит по тротуару крошечное солнышко — совсем как её предки на берегах Нила. Если солнышко закатилось под скамейку, жужжит на весь двор.`,
    look: { shape: 'round', c1: '#f2b845', c2: '#7c2d12', c3: '#fff0a0', eyes: 'big', mouth: 'smile', back: ['aura'], feats: ['cheeks'] } },
  { id: 'eg_solncekat', name: ru`Солнцекат`, el: 'fire', rar: 2, stage: 2, fam: 'eg_skarab', evo: 'eg_khepri', cost: 100, base: [162, 146, 150],
    desc: ru`Подросшая Скарабейка. Катит солнце уже размером с арбуз и греет им остановки холодным утром.`,
    look: { shape: 'blob', c1: '#f5c04a', c2: '#7a2a0c', c3: '#fde68a', eyes: 'angry', mouth: 'smile', back: ['wings'], feats: ['cheeks'] } },
  { id: 'eg_khepri', name: ru`Хепри`, el: 'fire', rar: 3, stage: 3, fam: 'eg_skarab', base: [224, 196, 204],
    desc: ru`Бог утреннего солнца с головой-скарабеем. Каждый рассвет выкатывает солнце из-за крыш — поэтому утро в городе всегда наступает вовремя.`,
    look: { shape: 'tall', c1: '#2dd4bf', c2: '#1e3a8a', c3: '#fbbf24', eyes: 'round', mouth: 'smile', back: ['wings', 'aura'], feats: ['crown'] } },

  { id: 'eg_kroko', name: ru`Крокодильчик`, el: 'water', rar: 1, stage: 1, fam: 'eg_kroko', evo: 'eg_nilozub', cost: 25, base: [118, 108, 106],
    desc: ru`Вылупился на берегу Нила и приплыл по трубам в городской фонтан. Улыбается во все зубы, но кусает только арбузы.`,
    look: { shape: 'round', c1: '#86efac', c2: '#0f766e', c3: '#ecfccb', eyes: 'big', mouth: 'smile', back: ['tail'], feats: ['cheeks'] } },
  { id: 'eg_nilozub', name: ru`Нилозуб`, el: 'water', rar: 2, stage: 2, fam: 'eg_kroko', evo: 'eg_sebek', cost: 100, base: [170, 150, 152],
    desc: ru`Дремлет у набережных, притворяясь бревном. Заранее знает, когда река разольётся, и оттаскивает лодки повыше.`,
    look: { shape: 'blob', c1: '#6ee7b7', c2: '#065f46', c3: '#bbf7d0', eyes: 'sleepy', mouth: 'teeth', back: ['ripples', 'tail'], feats: [] } },
  { id: 'eg_sebek', name: ru`Себек`, el: 'water', rar: 3, stage: 3, fam: 'eg_kroko', base: [214, 224, 230],
    desc: ru`Бог-крокодил, владыка Нила и его разливов. Следит, чтобы в каналах и фонтанах не кончалась вода, а рыбаки возвращались с уловом.`,
    look: { shape: 'tall', c1: '#6ee7b7', c2: '#065f46', c3: '#fbbf24', eyes: 'round', mouth: 'teeth', back: ['aura'], feats: ['crown'] } },

  { id: 'eg_ibisenok', name: ru`Ибисёнок`, el: 'current', rar: 1, stage: 1, fam: 'eg_ibisenok', evo: 'eg_ibis', cost: 25, base: [110, 102, 116],
    desc: ru`Пушистый птенец священного ибиса. Тычет клювом в экраны и кнопки лифтов, а там, где он прошёл, у телефонов прибавляется заряд.`,
    look: { shape: 'bird', c1: '#f8fafc', c2: '#94a3b8', c3: '#facc15', eyes: 'big', mouth: 'beak', back: [], feats: ['cheeks'] } },
  { id: 'eg_ibis', name: ru`Ибис-писец`, el: 'current', rar: 2, stage: 2, fam: 'eg_ibisenok', evo: 'eg_svibis', cost: 100, base: [158, 138, 164],
    desc: ru`Пишет клювом в воздухе светящиеся иероглифы. По ночам их принимают за неоновые вывески Каира.`,
    look: { shape: 'bird', c1: '#f1f5f9', c2: '#1f2937', c3: '#facc15', eyes: 'round', mouth: 'beak', back: ['tail'], feats: [] } },
  { id: 'eg_svibis', name: ru`Священный ибис`, el: 'current', rar: 3, stage: 3, fam: 'eg_ibisenok', base: [212, 190, 222],
    desc: ru`Посланник Тота, бога мудрости. Записывает всё, что случилось в городе за день, на свиток из чистого света.`,
    look: { shape: 'bird', c1: '#f8fafc', c2: '#1f2937', c3: '#fde68a', eyes: 'glow', mouth: 'beak', back: ['wings', 'aura'], feats: ['crown'] } },

  // ---------- семейства из двух стадий: кошка мау (лес), джинн пустыни (ветер), мумийка (тень) ----------
  { id: 'eg_kotmau', name: ru`Котёнок Мау`, el: 'forest', rar: 1, stage: 1, fam: 'eg_kotmau', evo: 'eg_mau', cost: 25, base: [122, 96, 108],
    desc: ru`Пятнистый котёнок из зарослей папируса. Сторожит клумбы от мышей и спит в цветочных горшках, свернувшись вокруг лотоса.`,
    look: { shape: 'round', c1: '#f3dfb0', c2: '#b7843a', c3: '#84cc16', eyes: 'big', mouth: 'cat', back: ['ears', 'cattail'], feats: ['whiskers'] } },
  { id: 'eg_mau', name: ru`Храмовая кошка`, el: 'forest', rar: 2, stage: 2, fam: 'eg_kotmau', base: [168, 132, 148],
    desc: ru`В древности кошки стерегли зерно в храмовых амбарах. Эта стережёт городские сады и огороды — за миску сметаны.`,
    look: { shape: 'tall', c1: '#f0d9a4', c2: '#a8742c', c3: '#2dd4bf', eyes: 'sleepy', mouth: 'cat', back: ['ears', 'cattail'], feats: ['whiskers'] } },

  { id: 'eg_peschinka', name: ru`Песчинка`, el: 'wind', rar: 1, stage: 1, fam: 'eg_peschinka', evo: 'eg_djinn', cost: 25, base: [116, 92, 120],
    desc: ru`Крошечный вихрь из песка пустыни. Прилетает в город с жарким ветром и прячется в кроссовках.`,
    look: { shape: 'wisp', c1: '#fde68a', c2: '#b45309', c3: '#fff7d6', eyes: 'big', mouth: 'o', back: [], feats: ['swirl'] } },
  { id: 'eg_djinn', name: ru`Джинн`, el: 'wind', rar: 2, stage: 2, fam: 'eg_peschinka', base: [174, 124, 146],
    desc: ru`Песчаный дух пустыни, свитый из горячего ветра. Исполняет желания, но только мелкие: найти ключи или поймать такси в дождь.`,
    look: { shape: 'wisp', c1: '#fcd07a', c2: '#b0621a', c3: '#0ea5e9', eyes: 'angry', mouth: 'smile', back: [], feats: ['swirl', 'ears'] } },

  { id: 'eg_mumiyka', name: ru`Мумийка`, el: 'shadow', rar: 1, stage: 1, fam: 'eg_mumiyka', evo: 'eg_mumiya', cost: 25, base: [104, 116, 118], time: 'night',
    desc: ru`Маленький дух в бинтах, проспавший три тысячи лет. Днём дремлет в музеях, а ночью бродит по залам и путается в собственных бинтиках.`,
    look: { shape: 'ghost', c1: '#f7efd9', c2: '#a8977a', c3: '#a78bfa', eyes: 'sleepy', mouth: 'o', back: [], feats: ['cheeks'] } },
  { id: 'eg_mumiya', name: ru`Мумия`, el: 'shadow', rar: 2, stage: 2, fam: 'eg_mumiyka', base: [156, 168, 160], time: 'night',
    desc: ru`Подросшая Мумийка. Добрая и немного рассеянная: раздаёт свои бинты всем, кто ободрал коленку.`,
    look: { shape: 'tall', c1: '#f3ead2', c2: '#9c8a6c', c3: '#2dd4bf', eyes: 'round', mouth: 'smile', back: [], feats: [] } },

  // ---------- редкие: знаменитые существа ----------
  { id: 'eg_sfinks', name: ru`Сфинкс`, el: 'wind', rar: 3, stage: 1, fam: 'eg_sfinks', base: [196, 212, 206],
    desc: ru`Каменный страж с телом льва и головой человека. Загадывает загадки у входа в метро и пропускает только тех, кто ответил.`,
    look: { shape: 'blob', c1: '#f3d9a0', c2: '#a8742c', c3: '#1e3a8a', eyes: 'sleepy', mouth: 'smile', back: ['mane'], feats: ['beard'] } },
  { id: 'eg_bennu', name: ru`Бенну`, el: 'fire', rar: 3, stage: 1, fam: 'eg_bennu', base: [218, 160, 180], time: 'day',
    desc: ru`Египетский феникс, солнечная цапля. На закате сгорает, а на рассвете рождается заново — поэтому всегда выглядит отдохнувшей.`,
    look: { shape: 'bird', c1: '#fed7aa', c2: '#c2410c', c3: '#fde68a', eyes: 'round', mouth: 'beak', back: ['wings', 'aura'], feats: ['crest'] } },
  { id: 'eg_apop', name: ru`Апоп`, el: 'shadow', rar: 3, stage: 1, fam: 'eg_apop', base: [226, 150, 176], time: 'night',
    desc: ru`Огромный змей тьмы, извечный враг солнца. Каждую ночь пытается проглотить солнечную ладью — и каждое утро остаётся ни с чем.`,
    look: { shape: 'blob', c1: '#8b5cf6', c2: '#1e0b36', c3: '#facc15', eye: '#facc15', eyes: 'glow', mouth: 'teeth', back: ['tail'], feats: [] } },

  // ---------- эпические боги ----------
  { id: 'eg_anubis', name: ru`Анубис`, el: 'shadow', rar: 4, stage: 1, fam: 'eg_anubis', base: [212, 206, 196], time: 'night',
    desc: ru`Бог с головой шакала, проводник душ и хранитель гробниц. Взвешивает сердца против пёрышка истины, а по ночам бережёт сон города.`,
    look: { shape: 'tall', c1: '#4b5563', c2: '#0b0f19', c3: '#fbbf24', eye: '#fbbf24', eyes: 'glow', mouth: 'none', back: ['ears', 'aura'], feats: ['snout'] } },
  { id: 'eg_isida', name: ru`Исида`, el: 'water', rar: 4, stage: 1, fam: 'eg_isida', base: [198, 212, 220],
    desc: ru`Великая богиня-чародейка с крыльями вместо рук. Говорят, это её слёзы каждое лето разливают Нил, а её заклинания оберегают детей.`,
    look: { shape: 'robe', c1: '#e0f2fe', c2: '#1d4ed8', c3: '#fbbf24', eyes: 'round', mouth: 'smile', back: ['wings', 'hair'], feats: ['crown'] } },

  // ---------- великие боги-легенды ----------
  { id: 'eg_ra', name: ru`Ра`, el: 'fire', rar: 5, stage: 1, fam: 'eg_ra', legend: true, base: [302, 226, 250],
    desc: ru`Легенда. Бог солнца с головой сокола и огненным диском над головой. Днём плывёт по небу в золотой ладье, а на землю спускается только через огненные разломы.`,
    look: { shape: 'robe', c1: '#fef3c7', c2: '#b45309', c3: '#ef4444', eyes: 'round', mouth: 'beak', back: ['aura', 'halo'], feats: ['crown'] } },
  { id: 'eg_osiris', name: ru`Осирис`, el: 'forest', rar: 5, stage: 1, fam: 'eg_osiris', legend: true, base: [288, 250, 262],
    desc: ru`Легенда. Зеленокожий владыка возрождения: где он ступит, прорастают зёрна и распускаются сады. В мир живых приходит только через разломы.`,
    look: { shape: 'robe', c1: '#f8fafc', c2: '#15803d', c3: '#fbbf24', eyes: 'sleepy', mouth: 'none', back: ['aura'], feats: ['crown', 'beard'] } },
];
