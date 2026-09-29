'use strict';
/* 4.28: духи и боги греческой мифологии — данные (поля — как у SPECIES в data.js; мифология задаётся сама) */
(globalThis.MYTH_SP = globalThis.MYTH_SP || {}).greek = [
  // ---------- ОГОНЬ: Химерёнок → Химера ----------
  { id: 'gr_himerenok', name: ru`Химерёнок`, el: 'fire', rar: 1, stage: 1, fam: 'gr_himerenok', evo: 'gr_himera', cost: 25, base: [120, 94, 106],
    desc: ru`Львёнок с козьей головкой на спине и хвостом-змейкой — три характера в одном. Греется у жаровен с каштанами и чихает искрами.`,
    look: { shape: 'round', c1: '#ffc46b', c2: '#d9661f', c3: '#ff8a1a', eyes: 'big', mouth: 'cat', back: ['mane', 'cattail'], feats: ['horns', 'cheeks'] } },
  { id: 'gr_himera', name: ru`Химера`, el: 'fire', rar: 2, stage: 2, fam: 'gr_himerenok', base: [174, 132, 148],
    desc: ru`Подросший Химерёнок. Лев рычит, коза бодается, змея шипит — договориться им удаётся только насчёт гироса. Пышет огнём, как в древней Ликии.`,
    look: { shape: 'blob', c1: '#ffb04a', c2: '#b8410c', c3: '#ff6a1a', eyes: 'angry', mouth: 'teeth', back: ['mane', 'cattail', 'horns'], feats: ['flame'] } },

  // ---------- ВОДА: Гиппокампчик → Гиппокамп ----------
  { id: 'gr_gippokampik', name: ru`Гиппокампчик`, el: 'water', rar: 1, stage: 1, fam: 'gr_gippokampik', evo: 'gr_gippokamp', cost: 25, base: [104, 114, 122],
    desc: ru`Морской жеребёнок с рыбьим хвостом. Живёт в городских фонтанах и ловит монетки, которые бросают туристы, — на счастье.`,
    look: { shape: 'drop', c1: '#8ef0e6', c2: '#0e8a9a', c3: '#38bdf8', eyes: 'big', mouth: 'smile', back: ['mane', 'ripples'], feats: ['cheeks'] } },
  { id: 'gr_gippokamp', name: ru`Гиппокамп`, el: 'water', rar: 2, stage: 2, fam: 'gr_gippokampik', base: [154, 160, 168],
    desc: ru`Морской конь из упряжки Посейдона. Резвится в гаванях, обгоняет паромы и катает по волнам тех, кто угостит его яблоком.`,
    look: { shape: 'blob', c1: '#6ee7d8', c2: '#0f5f7a', c3: '#38bdf8', eyes: 'round', mouth: 'smile', back: ['mane', 'tail', 'ripples'], feats: ['bubbles'] } },

  // ---------- ЛЕС: Сатирёнок → Сатир → Пан ----------
  { id: 'gr_satirenok', name: ru`Сатирёнок`, el: 'forest', rar: 1, stage: 1, fam: 'gr_satirenok', evo: 'gr_satir', cost: 25, base: [110, 108, 118],
    desc: ru`Козлоногий малыш с рожками и кудряшками. Скачет по ступеням амфитеатров и дудит в свирель, пока его не прогонят.`,
    look: { shape: 'round', c1: '#e8b98a', c2: '#8a5a2e', c3: '#84cc16', eyes: 'big', mouth: 'smile', back: ['ears'], feats: ['horns', 'leaves', 'cheeks'] } },
  { id: 'gr_satir', name: ru`Сатир`, el: 'forest', rar: 2, stage: 2, fam: 'gr_satirenok', evo: 'gr_pan', cost: 100, base: [158, 150, 156],
    desc: ru`Весельчак из свиты Диониса. Обожает уличные праздники и виноград на балконах, а играет на свирели так, что прохожие пускаются в пляс.`,
    look: { shape: 'tall', c1: '#d9a577', c2: '#6b4220', c3: '#65a30d', eyes: 'round', mouth: 'smile', back: ['ears'], feats: ['horns', 'leaves'] } },
  { id: 'gr_pan', name: ru`Пан`, el: 'forest', rar: 3, stage: 3, fam: 'gr_satirenok', base: [218, 204, 222],
    desc: ru`Козлоногий бог лесов и пастбищ, мастер тростниковой свирели. Не буди его в полдень: крикнет так, что весь сквер охватит паника.`,
    look: { shape: 'robe', c1: '#b8834f', c2: '#4a2c14', c3: '#4d7c0f', eyes: 'angry', mouth: 'smile', back: ['horns'], feats: ['beard', 'leaves'] } },

  // ---------- ВЕТЕР: Гарпёнок → Гарпия → Аэлло ----------
  { id: 'gr_garpyonok', name: ru`Гарпёнок`, el: 'wind', rar: 1, stage: 1, fam: 'gr_garpyonok', evo: 'gr_garpiya', cost: 25, base: [122, 92, 104],
    desc: ru`Пушистый птенчик с девчачьим личиком. Выхватывает картошку фри из рук туристов быстрее любой чайки.`,
    look: { shape: 'bird', c1: '#dcd6fb', c2: '#7c6fcf', c3: '#fbcfe8', eyes: 'big', mouth: 'smile', back: ['wings', 'hair'], feats: ['cheeks'] } },
  { id: 'gr_garpiya', name: ru`Гарпия`, el: 'wind', rar: 2, stage: 2, fam: 'gr_garpyonok', evo: 'gr_aello', cost: 100, base: [172, 128, 144],
    desc: ru`Крылатая похитительница, быстрая, как порыв ветра. Уносит со столиков кафе всё, что плохо лежит, — от салфеток до шляп.`,
    look: { shape: 'bird', c1: '#c7c2f5', c2: '#4c3fa8', c3: '#f0abfc', eyes: 'angry', mouth: 'smile', back: ['wings', 'hair', 'tail'], feats: ['swirl'] } },
  { id: 'gr_aello', name: ru`Аэлло`, el: 'wind', rar: 3, stage: 3, fam: 'gr_garpyonok', base: [238, 164, 188],
    desc: ru`Старшая из гарпий, её имя значит «Вихрь». Когда она проносится над набережной, зонтики кафе взлетают, как стая чаек.`,
    look: { shape: 'bird', c1: '#a5b4fc', c2: '#312e81', c3: '#e0e7ff', eyes: 'angry', mouth: 'teeth', back: ['wings', 'hair', 'tail', 'aura'], feats: ['crest', 'swirl'] } },

  // ---------- ТОК: Циклопчик → Циклоп ----------
  { id: 'gr_ciklopchik', name: ru`Циклопчик`, el: 'current', rar: 1, stage: 1, fam: 'gr_ciklopchik', evo: 'gr_ciklop', cost: 25, base: [114, 110, 110],
    desc: ru`Одноглазый малыш-кузнец. Стучит молоточком по перилам и фонарным столбам, высекая искры, — учится ковать молнии, как старшие.`,
    look: { shape: 'round', c1: '#b4c2ee', c2: '#4b5a9a', c3: '#facc15', eyes: 'one', mouth: 'smile', back: [], feats: ['bolt', 'cheeks'] } },
  { id: 'gr_ciklop', name: ru`Циклоп`, el: 'current', rar: 2, stage: 2, fam: 'gr_ciklopchik', base: [162, 166, 152],
    desc: ru`Кузнец громовых стрел — такие, как он, выковали молнии для самого Зевса. Чинит оборванные провода одним ударом молота и ворчит, если его отвлекают.`,
    look: { shape: 'tall', c1: '#9fb0e4', c2: '#36407a', c3: '#facc15', eyes: 'one', mouth: 'teeth', back: [], feats: ['bolt', 'beard'] } },

  // ---------- ТЕНЬ: Онейрик → Онейр → Морфей ----------
  { id: 'gr_oneirik', name: ru`Онейрик`, el: 'shadow', rar: 1, stage: 1, fam: 'gr_oneirik', evo: 'gr_oneir', cost: 25, base: [116, 98, 108], time: 'night',
    desc: ru`Маленький сон, сбежавший из пещеры Гипноса. Прячется в подушках и показывает прохожим короткие смешные сны прямо на ходу.`,
    look: { shape: 'ghost', c1: '#b9a6f5', c2: '#4c2a8f', c3: '#f472b6', eye: '#e9d5ff', eyes: 'sleepy', mouth: 'o', back: ['wings'], feats: ['cheeks'] } },
  { id: 'gr_oneir', name: ru`Онейр`, el: 'shadow', rar: 2, stage: 2, fam: 'gr_oneirik', evo: 'gr_morfey', cost: 100, base: [166, 138, 150],
    desc: ru`Крылатый дух сновидений. Прилетает к окнам через ворота из рога или из слоновой кости — и сам не знает, вещий сегодня сон или нет.`,
    look: { shape: 'wisp', c1: '#9b87f5', c2: '#2e1a66', c3: '#fbcfe8', eye: '#e9d5ff', eyes: 'glow', mouth: 'none', back: ['wings', 'aura'], feats: ['swirl'] } },
  { id: 'gr_morfey', name: ru`Морфей`, el: 'shadow', rar: 3, stage: 3, fam: 'gr_oneirik', base: [228, 178, 196], time: 'night',
    desc: ru`Бог сновидений, сын Гипноса. Во сне может принять облик любого человека — чаще всего почему-то учителя перед контрольной.`,
    look: { shape: 'robe', c1: '#7c6cf0', c2: '#1b1147', c3: '#f87171', eye: '#e9d5ff', eyes: 'sleepy', mouth: 'none', back: ['wings', 'aura'], feats: ['runes'] } },

  // ---------- Редкие: знаменитые существа ----------
  { id: 'gr_kerber', name: ru`Цербер`, el: 'fire', rar: 3, stage: 1, fam: 'gr_kerber', base: [222, 180, 196],
    desc: ru`Трёхголовый пёс, страж ворот Аида. В городе сторожит подземные переходы: одна голова спит, другая ест, третья глядит в оба. Тает от медовых лепёшек.`,
    look: { shape: 'blob', c1: '#6b4a3a', c2: '#1f120c', c3: '#ff8a1a', eye: '#ffb020', eyes: 'glow', mouth: 'teeth', back: ['heads3', 'ears', 'cattail'], feats: ['flame'] } },
  { id: 'gr_pegas', name: ru`Пегас`, el: 'current', rar: 3, stage: 1, fam: 'gr_pegas', base: [208, 170, 186],
    desc: ru`Крылатый белый конь. Возит по небу молнии Зевса, а там, где ударит копытом о камень, пробивается источник.`,
    look: { shape: 'blob', c1: '#f8fafc', c2: '#94a3b8', c3: '#facc15', eyes: 'round', mouth: 'none', back: ['wings', 'mane', 'tail'], feats: ['snout', 'bolt'] } },
  { id: 'gr_meduza', name: ru`Медуза`, el: 'shadow', rar: 3, stage: 1, fam: 'gr_meduza', base: [216, 150, 178],
    desc: ru`Горгона со змеями вместо волос. Носит тёмные очки, чтобы ненароком не превратить кого-нибудь в статую, а городские скульптуры считает старыми знакомыми.`,
    look: { shape: 'robe', c1: '#86d0a4', c2: '#1f5a44', c3: '#a78bfa', eyes: 'glow', mouth: 'smile', back: ['hair'], feats: ['crown'] } },

  // ---------- Эпические: боги Олимпа ----------
  { id: 'gr_germes', name: ru`Гермес`, el: 'wind', rar: 4, stage: 1, fam: 'gr_germes', base: [226, 184, 190],
    desc: ru`Вестник богов в крылатых сандалиях и шляпе. Покровитель путников, торговцев и курьеров: посылку доставит раньше, чем её отправят.`,
    look: { shape: 'robe', c1: '#e0e7ff', c2: '#4f46e5', c3: '#fbbf24', eyes: 'round', mouth: 'smile', back: ['wings'], feats: ['hat'] } },
  { id: 'gr_artemida', name: ru`Артемида`, el: 'forest', rar: 4, stage: 1, fam: 'gr_artemida', base: [220, 196, 204],
    desc: ru`Богиня охоты и луны, хранительница лесного зверья. На рассвете бегает по паркам вместе с серебряной ланью и никогда не промахивается.`,
    look: { shape: 'robe', c1: '#d9f99d', c2: '#3f6212', c3: '#e2e8f0', eyes: 'round', mouth: 'smile', back: ['hair', 'halo'], feats: ['crown'] } },

  // ---------- Легенды: великие боги ----------
  { id: 'gr_zeus', name: ru`Зевс`, el: 'current', rar: 5, stage: 1, fam: 'gr_zeus', legend: true, base: [300, 228, 248],
    desc: ru`Легенда. Царь богов и владыка Олимпа, повелитель грома и молний. С высоты туч видит весь город разом. Встречают его только в разломах.`,
    look: { shape: 'robe', c1: '#f8fafc', c2: '#64748b', c3: '#facc15', eye: '#fde047', eyes: 'glow', mouth: 'none', back: ['aura', 'halo'], feats: ['beard', 'crown', 'bolt'] } },
  { id: 'gr_poseidon', name: ru`Посейдон`, el: 'water', rar: 5, stage: 1, fam: 'gr_poseidon', legend: true, base: [290, 246, 258],
    desc: ru`Легенда. Владыка морей и колебатель земли: ударом трезубца поднимает волны и выводит источники из скалы. Встречают его только в разломах.`,
    look: { shape: 'robe', c1: '#99f6e4', c2: '#0f5f7a', c3: '#fbbf24', eye: '#a5f3fc', eyes: 'glow', mouth: 'none', back: ['aura', 'ripples'], feats: ['beard', 'crown'] } },
];
