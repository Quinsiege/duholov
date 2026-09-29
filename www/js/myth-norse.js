'use strict';
/* 4.28: духи и боги скандинавской мифологии — данные (поля — как у SPECIES в data.js; мифология задаётся сама) */
(globalThis.MYTH_SP = globalThis.MYTH_SP || {}).norse = [
  // ---------- ОГОНЬ: ниссе — домовой Севера ----------
  { id: 'no_nisse', name: ru`Ниссе`, el: 'fire', rar: 1, stage: 1, fam: 'no_nisse', evo: 'no_tomte', cost: 25, base: [112, 104, 116],
    desc: ru`Крошечный домовой в красном колпаке. Под Рождество ждёт миску каши с маслом — забудешь масло, и он спрячет твои варежки.`,
    look: { shape: 'round', c1: '#f1c7a0', c2: '#b91c1c', c3: '#f8fafc', eyes: 'round', mouth: 'smile', back: [], feats: ['hat', 'beard', 'cheeks'] } },
  { id: 'no_tomte', name: ru`Томте`, el: 'fire', rar: 2, stage: 2, fam: 'no_nisse', base: [164, 150, 158],
    desc: ru`Седой хранитель дома и двора. Обходит подъезды с фонарём, греет у батарей замёрзших котов, а в Йоль разносит подарки.`,
    look: { shape: 'robe', c1: '#ef4444', c2: '#7f1d1d', c3: '#f8fafc', eyes: 'sleepy', mouth: 'none', back: [], feats: ['hat', 'beard', 'lamp'] } },

  // ---------- ВОДА: инеистые великаны ----------
  { id: 'no_ineyonok', name: ru`Инеёнок`, el: 'water', rar: 1, stage: 1, fam: 'no_ineyonok', evo: 'no_jotun', cost: 25, base: [104, 114, 120],
    desc: ru`Малыш-ётун из вечных льдов Нифльхейма. Дышит на окна трамваев и рисует на них морозные руны.`,
    look: { shape: 'round', c1: '#e0f2fe', c2: '#38bdf8', c3: '#ffffff', eyes: 'big', mouth: 'o', back: [], feats: ['cheeks', 'horns'] } },
  { id: 'no_jotun', name: ru`Ётун`, el: 'water', rar: 2, stage: 2, fam: 'no_ineyonok', evo: 'no_hrimthurs', cost: 100, base: [160, 160, 168],
    desc: ru`Подросший ледяной великан. Обожает катки и сосульки, а весной ходит угрюмый и немного капает.`,
    look: { shape: 'tall', c1: '#bae6fd', c2: '#0369a1', c3: '#f0f9ff', eyes: 'angry', mouth: 'teeth', back: [], feats: ['horns', 'beard'] } },
  { id: 'no_hrimthurs', name: ru`Хримтурс`, el: 'water', rar: 3, stage: 3, fam: 'no_ineyonok', base: [220, 210, 236],
    desc: ru`Инеистый великан из древнего рода Имира. Когда он зевает, во всём городе замерзают лужи и фонтаны.`,
    look: { shape: 'robe', c1: '#bfdbfe', c2: '#1e3a8a', c3: '#e0f2fe', eye: '#67e8f9', eyes: 'glow', mouth: 'none', back: ['aura'], feats: ['beard', 'crown'] } },

  // ---------- ЛЕС: тролли ----------
  { id: 'no_trollenok', name: ru`Троллёнок`, el: 'forest', rar: 1, stage: 1, fam: 'no_trollenok', evo: 'no_troll', cost: 25, base: [108, 118, 122],
    desc: ru`Вылупился из замшелого валуна у фьорда. На солнце каменеет, поэтому днём прикидывается булыжником в сквере.`,
    look: { shape: 'round', c1: '#a8a29e', c2: '#57534e', c3: '#84cc16', eyes: 'round', mouth: 'smile', back: [], feats: ['sprout', 'cheeks'] } },
  { id: 'no_troll', name: ru`Тролль`, el: 'forest', rar: 2, stage: 2, fam: 'no_trollenok', evo: 'no_bergtroll', cost: 100, base: [156, 170, 166],
    desc: ru`Живёт под мостами и берёт с прохожих плату — обычно печеньем. На рассвете замирает и притворяется памятником.`,
    look: { shape: 'blob', c1: '#a3b18a', c2: '#3f4a2a', c3: '#78350f', eyes: 'round', mouth: 'teeth', back: [], feats: ['snout', 'leaves'] } },
  { id: 'no_bergtroll', name: ru`Горный тролль`, el: 'forest', rar: 3, stage: 3, fam: 'no_trollenok', base: [210, 232, 226],
    desc: ru`Древний великан скал, поросший мхом и ёлками. Говорят, половина гранитных набережных — это его задремавшая родня.`,
    look: { shape: 'tall', c1: '#9ca3af', c2: '#374151', c3: '#65a30d', eyes: 'sleepy', mouth: 'teeth', back: ['sprout'], feats: ['leaves', 'snout'] } },

  // ---------- ВЕТЕР: вороны Одина ----------
  { id: 'no_voronenok', name: ru`Воронёнок`, el: 'wind', rar: 1, stage: 1, fam: 'no_voronenok', evo: 'no_huginmunin', cost: 25, base: [118, 92, 106],
    desc: ru`Мечтает стать вестником Одина, а пока облетает город и собирает новости и всё блестящее: ключи, пуговицы, фантики.`,
    look: { shape: 'bird', c1: '#64748b', c2: '#1e293b', c3: '#fbbf24', eyes: 'big', mouth: 'beak', back: ['wings'], feats: ['crest'] } },
  { id: 'no_huginmunin', name: ru`Хугин и Мунин`, el: 'wind', rar: 2, stage: 2, fam: 'no_voronenok', base: [170, 136, 150],
    desc: ru`Мысль и Память — вороны Одина. Каждое утро облетают весь мир, а вечером пересказывают ему все новости, ничего не упустив.`,
    look: { shape: 'bird', c1: '#475569', c2: '#0f172a', c3: '#a5b4fc', eye: '#e0e7ff', eyes: 'glow', mouth: 'beak', back: ['wings', 'tail'], feats: ['runes'] } },

  // ---------- ТОК: козлы Тора ----------
  { id: 'no_gromushka', name: ru`Громушка`, el: 'current', rar: 1, stage: 1, fam: 'no_gromushka', evo: 'no_tanngnjost', cost: 25, base: [122, 94, 104],
    desc: ru`Козлёнок с искрящими рожками. Бодает электросамокаты — и те едут вдвое быстрее. Мечтает однажды возить колесницу Тора.`,
    look: { shape: 'round', c1: '#f5f5f4', c2: '#a8a29e', c3: '#facc15', eyes: 'big', mouth: 'smile', back: ['horns'], feats: ['bolt', 'cheeks'] } },
  { id: 'no_tanngnjost', name: ru`Тангниостр`, el: 'current', rar: 2, stage: 2, fam: 'no_gromushka', evo: 'no_tanngrisnir', cost: 100, base: [174, 130, 142],
    desc: ru`Козёл громовой колесницы, его имя значит «Скрежещущий зубами». В грозу грохочет копытами по крышам и жуёт провода.`,
    look: { shape: 'blob', c1: '#e7e5e4', c2: '#57534e', c3: '#facc15', eyes: 'angry', mouth: 'teeth', back: ['horns'], feats: ['bolt', 'beard'] } },
  { id: 'no_tanngrisnir', name: ru`Тангриснир`, el: 'current', rar: 3, stage: 3, fam: 'no_gromushka', base: [240, 164, 188],
    desc: ru`«Скалящий зубы» — старший козёл Тора. Когда он мчит колесницу по небу, над городом гремит гром и сверкают молнии.`,
    look: { shape: 'blob', c1: '#fef9c3', c2: '#78716c', c3: '#facc15', eyes: 'angry', mouth: 'teeth', back: ['horns', 'aura'], feats: ['bolt', 'beard'] } },

  // ---------- ТЕНЬ: курганные духи ----------
  { id: 'no_kurgannik', name: ru`Курганник`, el: 'shadow', rar: 1, stage: 1, fam: 'no_kurgannik', evo: 'no_draugr', cost: 25, base: [114, 108, 110], time: 'night',
    desc: ru`Дух старого кургана. Сторожит клад из трёх монеток и бутылочной крышки, а по ночам выглядывает из клумб.`,
    look: { shape: 'ghost', c1: '#94a3b8', c2: '#1e293b', c3: '#fbbf24', eye: '#67e8f9', eyes: 'glow', mouth: 'o', back: [], feats: ['hat'] } },
  { id: 'no_draugr', name: ru`Драугр`, el: 'shadow', rar: 2, stage: 2, fam: 'no_kurgannik', base: [168, 156, 146], time: 'night',
    desc: ru`Хранитель курганных сокровищ в старом шлеме. В городе заведует бюро находок и очень не любит отдавать вещи.`,
    look: { shape: 'tall', c1: '#94a3b8', c2: '#334155', c3: '#fbbf24', eye: '#67e8f9', eyes: 'glow', mouth: 'teeth', back: [], feats: ['horns', 'beard'] } },

  // ---------- редкие: знаменитые чудовища ----------
  { id: 'no_fenrir', name: ru`Фенрир`, el: 'shadow', rar: 3, stage: 1, fam: 'no_fenrir', base: [226, 150, 178], time: 'night',
    desc: ru`Исполинский волк, которого боги связали лентой Глейпнир. Лента соткана из шума кошачьих шагов — вот почему кошки ходят бесшумно.`,
    look: { shape: 'blob', c1: '#64748b', c2: '#1e293b', c3: '#fbbf24', eye: '#fbbf24', eyes: 'glow', mouth: 'teeth', back: ['ears', 'cattail'], feats: ['snout'] } },
  { id: 'no_sleipnir', name: ru`Слейпнир`, el: 'wind', rar: 3, stage: 1, fam: 'no_sleipnir', base: [196, 176, 200],
    desc: ru`Восьминогий конь Одина, быстрее любого ветра. Скачет по крышам и проводам, а на поворотах путается, с какой ноги начинать.`,
    look: { shape: 'blob', c1: '#e2e8f0', c2: '#64748b', c3: '#a5b4fc', eyes: 'round', mouth: 'none', back: ['mane', 'tail'], feats: ['snout'] } },
  { id: 'no_jormungand', name: ru`Ёрмунганд`, el: 'water', rar: 3, stage: 1, fam: 'no_jormungand', base: [184, 212, 214],
    desc: ru`Мировой змей, опоясавший всю землю и закусивший собственный хвост. Дремлет во фьордах и каналах, изредка показывая спину.`,
    look: { shape: 'blob', c1: '#5eead4', c2: '#115e59', c3: '#fde047', eyes: 'sleepy', mouth: 'teeth', back: ['ripples'], feats: ['bubbles'] } },

  // ---------- эпические: боги ----------
  { id: 'no_loki', name: ru`Локи`, el: 'fire', rar: 4, stage: 1, fam: 'no_loki', base: [224, 180, 190],
    desc: ru`Бог хитрости и огня, мастер превращений. Оборачивается лососем, кобылицей или прохожим — и шутит так, что смеются даже боги.`,
    look: { shape: 'robe', c1: '#4ade80', c2: '#14532d', c3: '#f97316', eyes: 'angry', mouth: 'smile', back: ['hair'], feats: ['horns', 'flame'] } },
  { id: 'no_freya', name: ru`Фрейя`, el: 'forest', rar: 4, stage: 1, fam: 'no_freya', base: [200, 206, 214],
    desc: ru`Богиня любви и весны. Ездит в колеснице, запряжённой кошками, и носит плащ из соколиных перьев. Где она пройдёт — зацветают дворы.`,
    look: { shape: 'robe', c1: '#fde68a', c2: '#15803d', c3: '#f472b6', eyes: 'sleepy', mouth: 'smile', back: ['hair', 'wings'], feats: ['crown', 'leaves'] } },

  // ---------- легенды: великие боги (только в разломах) ----------
  { id: 'no_thor', name: ru`Тор`, el: 'current', rar: 5, stage: 1, fam: 'no_thor', legend: true, base: [302, 236, 248],
    desc: ru`Легенда. Громовержец с молотом Мьёльниром, защитник богов и людей. Где он проезжает, там гремит гром. Появляется только в грозовых разломах.`,
    look: { shape: 'robe', c1: '#fca5a5', c2: '#991b1b', c3: '#facc15', eyes: 'angry', mouth: 'none', back: ['aura'], feats: ['beard', 'bolt', 'horns'] } },
  { id: 'no_odin', name: ru`Один`, el: 'wind', rar: 5, stage: 1, fam: 'no_odin', legend: true, base: [290, 248, 258],
    desc: ru`Легенда. Всеотец, отдавший глаз за мудрость. Два ворона приносят ему вести со всего света. Появляется только в ветряных разломах.`,
    look: { shape: 'robe', c1: '#94a3b8', c2: '#1e293b', c3: '#fbbf24', eyes: 'one', mouth: 'none', back: ['aura'], feats: ['beard', 'hat', 'runes'] } },
];
