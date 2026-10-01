'use strict';
/* ==========================================================================
   ДУХОЛОВ — данные игры: стихии, духи, предметы, уровни, задания
   ========================================================================== */

const ELEMENTS = {
  fire:    { name: ru`Огонь`, color: '#ff7a3d', beats: ['forest', 'shadow'], fast: ru`Искра`,       charge: ru`Огненный вал` },
  water:   { name: ru`Вода`,  color: '#38bdf8', beats: ['fire', 'wind'],      fast: ru`Брызги`,      charge: ru`Омут` },
  forest:  { name: ru`Лес`,   color: '#84cc16', beats: ['water', 'current'],  fast: ru`Хлёст лозы`,  charge: ru`Корни земли` },
  wind:    { name: ru`Ветер`, color: '#a5b4fc', beats: ['shadow', 'fire'],    fast: ru`Порыв`,       charge: ru`Смерч` },
  current: { name: ru`Ток`,   color: '#facc15', beats: ['water', 'wind'],     fast: ru`Разряд`,      charge: ru`Короткое замыкание` },
  shadow:  { name: ru`Тень`,  color: '#c084fc', beats: ['current', 'forest'], fast: ru`Морок`,       charge: ru`Полночный ужас` },
};
const ELEMENT_KEYS = Object.keys(ELEMENTS);
// Второй особый приём (v1.6): дешевле и слабее основного
Object.assign(ELEMENTS.fire, { charge2: ru`Жар-вихрь` });
Object.assign(ELEMENTS.water, { charge2: ru`Ледяная стрела` });
Object.assign(ELEMENTS.forest, { charge2: ru`Колючий плющ` });
Object.assign(ELEMENTS.wind, { charge2: ru`Воздушный серп` });
Object.assign(ELEMENTS.current, { charge2: ru`Шаровая молния` });
Object.assign(ELEMENTS.shadow, { charge2: ru`Теневая петля` });
const MOVES = { charge: { cost: 50, power: 65 }, charge2: { cost: 35, power: 42 } };
const MOVE2_COST = { sparks: 4000, essence: 30 };
// 4.16: наивысший уровень духа — 40 и ещё по 2 уровня за каждую из пяти звёзд пробуждения (S.AWAKE)
const SPIRIT_MAX = 50;

/* ---------- Амулеты (v1.6): один на духа ---------- */
const AMULETS = {
  perun:  { name: ru`Амулет Перуна`,  desc: ru`Атака духа в битвах +12%`,               atk: 1.12,   color: '#facc15', glyph: 'M12 3l-5 9h4l-2 9 8-11h-5z' },
  mokosh: { name: ru`Амулет Мокоши`,  desc: ru`Защита духа в битвах +12%`,              def: 1.12,   color: '#c084fc', glyph: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z' },
  veles:  { name: ru`Амулет Велеса`,  desc: ru`Здоровье духа в битвах +15%`,            hp: 1.15,    color: '#84cc16', glyph: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z' },
  svarog: { name: ru`Амулет Сварога`, desc: ru`Энергия в битвах копится на 25% быстрее`, energy: 1.25, color: '#fb923c', glyph: 'M12 2c3 4 6 6 5 11a5 5 0 0 1-10 0c0-3 2-4 3-7 1 2 2 2 2-4z' },
  lada:   { name: ru`Амулет Лады`,    desc: ru`Если дух — спутник, находки вдвое чаще`,   buddy: 2,    color: '#f472b6', glyph: 'M12 4a8 8 0 1 0 0 16a6 6 0 1 1 0-16z' },
};
const AMULET_KEYS = Object.keys(AMULETS);

const RARITY = {
  1: { name: ru`Обычный`,     color: '#a8b3c7', base: 0.45, flee: 0.08 },
  2: { name: ru`Необычный`,   color: '#5eead4', base: 0.30, flee: 0.12 },
  3: { name: ru`Редкий`,      color: '#60a5fa', base: 0.18, flee: 0.15 },
  4: { name: ru`Эпический`,   color: '#c084fc', base: 0.10, flee: 0.20 },
  5: { name: ru`Легендарный`, color: '#fbbf24', base: 0.06, flee: 0.00 },
};

/* look: shape — форма тела; c1/c2 — цвета тела; c3 — акцент; eye — цвет свечения глаз;
   eyes/mouth — тип лица; back — детали позади тела; feats — детали поверх */
const SPECIES = [
  // ---------- ОГОНЬ ----------
  { id: 'ugolek', name: ru`Уголёк`, el: 'fire', rar: 1, stage: 1, fam: 'ugolek', evo: 'kostrovik', cost: 25, base: [118, 96, 110],
    desc: ru`Рождается в остывших кострах и печных трубах. Любит сидеть на тёплых люках и греть лапки.`,
    look: { shape: 'round', c1: '#ffb070', c2: '#e0531f', c3: '#ffd76a', eyes: 'round', mouth: 'smile', back: [], feats: ['flame', 'cheeks'] } },
  { id: 'kostrovik', name: ru`Костровик`, el: 'fire', rar: 2, stage: 2, fam: 'ugolek', evo: 'zharogriv', cost: 100, base: [168, 128, 150],
    desc: ru`Сторож ночных костров. Если костёр бросили без присмотра — Костровик обидится и разгорится.`,
    look: { shape: 'blob', c1: '#ff9a52', c2: '#c2330f', c3: '#ffd23f', eyes: 'angry', mouth: 'teeth', back: [], feats: ['flame', 'horns'] } },
  { id: 'zharogriv', name: ru`Жарогрив`, el: 'fire', rar: 3, stage: 3, fam: 'ugolek', base: [232, 176, 196],
    desc: ru`Грива из живого пламени. Говорят, в ночь Перепутицы Жарогривы до утра светили заблудившимся духам всех земель, чтобы те не потерялись совсем.`,
    look: { shape: 'tall', c1: '#ff8f4a', c2: '#a3260b', c3: '#ffcf40', eyes: 'angry', mouth: 'teeth', back: ['mane'], feats: ['horns', 'flame'] } },
  { id: 'domovoy', name: ru`Домовой`, el: 'fire', rar: 4, stage: 1, fam: 'domovoy', base: [190, 210, 220],
    desc: ru`Хранитель очага. В новостройках ему неуютно, поэтому он бродит по дворам в поисках старой печки.`,
    look: { shape: 'round', c1: '#c79a6b', c2: '#7a4b24', c3: '#f1f5f9', eyes: 'sleepy', mouth: 'none', back: [], feats: ['beard', 'hat'] } },
  { id: 'zharptica', name: ru`Жар-птица`, el: 'fire', rar: 5, stage: 1, fam: 'zharptica', legend: true, base: [286, 228, 250],
    desc: ru`Легенда. Одно перо Жар-птицы освещает целый квартал. Появляется только в огненных разломах.`,
    look: { shape: 'bird', c1: '#ffd166', c2: '#ef4444', c3: '#ff9f1c', eyes: 'round', mouth: 'beak', back: ['aura', 'tail', 'wings'], feats: ['crest'] } },

  // ---------- ВОДА ----------
  { id: 'kapelka', name: ru`Капелька`, el: 'water', rar: 1, stage: 1, fam: 'kapelka', evo: 'luzhnica', cost: 25, base: [102, 112, 124],
    desc: ru`Появляется после дождя в каждой второй луже. Очень любопытна и совсем не боится зонтиков.`,
    look: { shape: 'drop', c1: '#9be7ff', c2: '#2b8fd6', c3: '#e0f7ff', eyes: 'big', mouth: 'smile', back: [], feats: ['cheeks'] } },
  { id: 'luzhnica', name: ru`Лужница`, el: 'water', rar: 2, stage: 2, fam: 'kapelka', evo: 'vodyanoy', cost: 100, base: [150, 158, 170],
    desc: ru`Растекается по тротуарам и отражает небо. Прохожие, наступившие в неё, весь день ходят с мокрыми ногами.`,
    look: { shape: 'blob', c1: '#7dd3fc', c2: '#1d6fb8', c3: '#bae6fd', eyes: 'round', mouth: 'o', back: ['ripples'], feats: ['bubbles'] } },
  { id: 'vodyanoy', name: ru`Водяной`, el: 'water', rar: 3, stage: 3, fam: 'kapelka', base: [206, 214, 236],
    desc: ru`Хозяин прудов, фонтанов и городских каналов. Ворчлив, но справедлив: утопленные телефоны иногда возвращает.`,
    look: { shape: 'round', c1: '#6ee7b7', c2: '#0f766e', c3: '#a7f3d0', eyes: 'big', mouth: 'none', back: [], feats: ['beard', 'crown', 'whiskers'] } },
  { id: 'rusalka', name: ru`Русалка`, el: 'water', rar: 4, stage: 1, fam: 'rusalka', base: [214, 182, 196], time: 'night',
    desc: ru`Поёт у набережных в лунные ночи. Её песня заставляет забыть, куда ты шёл.`,
    look: { shape: 'ghost', c1: '#99f6e4', c2: '#0d9488', c3: '#34d399', eye: '#a5f3fc', eyes: 'glow', mouth: 'smile', back: ['hair'], feats: ['bubbles'] } },

  // ---------- ЛЕС ----------
  { id: 'mshonok', name: ru`Мшонок`, el: 'forest', rar: 1, stage: 1, fam: 'mshonok', evo: 'leshachok', cost: 25, base: [108, 118, 116],
    desc: ru`Прорастает в трещинах асфальта. Если его полить — будет ходить за тобой хвостиком.`,
    look: { shape: 'round', c1: '#a3e635', c2: '#4d7c0f', c3: '#86efac', eyes: 'round', mouth: 'smile', back: [], feats: ['sprout', 'cheeks'] } },
  { id: 'leshachok', name: ru`Лешачок`, el: 'forest', rar: 2, stage: 2, fam: 'mshonok', evo: 'leshiy', cost: 100, base: [156, 162, 150],
    desc: ru`Путает дорожки в парках. Если ты трижды прошёл мимо одной скамейки — это он.`,
    look: { shape: 'tall', c1: '#84cc16', c2: '#3f6212', c3: '#a16207', eyes: 'round', mouth: 'cat', back: [], feats: ['antlers', 'leaves'] } },
  { id: 'leshiy', name: ru`Леший`, el: 'forest', rar: 3, stage: 3, fam: 'mshonok', base: [214, 226, 210],
    desc: ru`Древний хозяин леса. Скверы и бульвары считает своими владениями и строго следит за каждым деревом.`,
    look: { shape: 'robe', c1: '#65a30d', c2: '#1a2e05', c3: '#78350f', eye: '#fde047', eyes: 'glow', mouth: 'none', back: [], feats: ['antlers', 'beard', 'leaves'] } },
  { id: 'kikimora', name: ru`Кикимора`, el: 'forest', rar: 3, stage: 1, fam: 'kikimora', base: [196, 150, 176], time: 'night',
    desc: ru`Болотная проказница. Прячет ключи, путает провода наушников и хихикает из подвалов.`,
    look: { shape: 'ghost', c1: '#bef264', c2: '#365314', c3: '#3f3a36', eye: '#f87171', eyes: 'many', mouth: 'teeth', back: ['hair'], feats: ['drops'] } },

  // ---------- ВЕТЕР ----------
  { id: 'skvoznyak', name: ru`Сквозняк`, el: 'wind', rar: 1, stage: 1, fam: 'skvoznyak', evo: 'vihrun', cost: 25, base: [122, 90, 104],
    desc: ru`Хлопает форточками и дверями подъездов. Совершенно не умеет сидеть на месте.`,
    look: { shape: 'wisp', c1: '#e0f2fe', c2: '#7dd3fc', c3: '#ffffff', eyes: 'sleepy', mouth: 'o', back: [], feats: ['swirl'] } },
  { id: 'vihrun', name: ru`Вихрун`, el: 'wind', rar: 2, stage: 2, fam: 'skvoznyak', evo: 'burevey', cost: 100, base: [176, 124, 140],
    desc: ru`Закручивает листья и пакеты в маленькие смерчи. Обожает выворачивать зонты.`,
    look: { shape: 'wisp', c1: '#bae6fd', c2: '#3b82f6', c3: '#f0f9ff', eyes: 'angry', mouth: 'smile', back: [], feats: ['swirl', 'ears'] } },
  { id: 'burevey', name: ru`Буревей`, el: 'wind', rar: 3, stage: 3, fam: 'skvoznyak', base: [240, 168, 188],
    desc: ru`Повелитель бурь. Когда Буревей расправляет крылья, в городе отключают аттракционы.`,
    look: { shape: 'bird', c1: '#93c5fd', c2: '#1e3a8a', c3: '#e0e7ff', eyes: 'angry', mouth: 'beak', back: ['tail', 'wings'], feats: ['crest', 'swirl'] } },
  { id: 'cherdachnik', name: ru`Чердачник`, el: 'wind', rar: 2, stage: 1, fam: 'cherdachnik', base: [150, 150, 160],
    desc: ru`Живёт на чердаках, среди старых чемоданов. Шуршит, вздыхает и собирает потерянные вещи.`,
    look: { shape: 'ghost', c1: '#d6d3d1', c2: '#57534e', c3: '#f5f5f4', eyes: 'sleepy', mouth: 'o', back: [], feats: ['cobweb', 'ears'] } },

  // ---------- ТОК ----------
  { id: 'vayfayka', name: ru`Вайфайка`, el: 'current', rar: 1, stage: 1, fam: 'vayfayka', evo: 'setevik', cost: 25, base: [116, 100, 108],
    desc: ru`Новый дух, рождённый из бесплатного Wi‑Fi. Там, где он сидит, связь ловит на одну палочку лучше.`,
    look: { shape: 'round', c1: '#c4b5fd', c2: '#6d28d9', c3: '#67e8f9', eyes: 'big', mouth: 'smile', back: [], feats: ['antenna', 'wifi', 'cheeks'] } },
  { id: 'setevik', name: ru`Сетевик`, el: 'current', rar: 2, stage: 2, fam: 'vayfayka', evo: 'gromovik', cost: 100, base: [166, 138, 144],
    desc: ru`Плетёт невидимые сети между домами. Иногда путает пароли — просто из вредности.`,
    look: { shape: 'box', c1: '#a78bfa', c2: '#4c1d95', c3: '#22d3ee', eyes: 'round', mouth: 'cat', back: [], feats: ['antenna', 'wifi', 'cables'] } },
  { id: 'gromovik', name: ru`Громовик`, el: 'current', rar: 3, stage: 3, fam: 'vayfayka', base: [236, 170, 186],
    desc: ru`Дух грозы и высоковольтных линий. Одним чихом способен обесточить целый район.`,
    look: { shape: 'tall', c1: '#fef08a', c2: '#ca8a04', c3: '#a78bfa', eyes: 'angry', mouth: 'teeth', back: [], feats: ['bolt', 'horns', 'antenna'] } },
  { id: 'tramvaynik', name: ru`Трамвайник`, el: 'current', rar: 3, stage: 1, fam: 'tramvaynik', base: [184, 206, 204],
    desc: ru`Дух последнего трамвая. Звенит на пустых остановках и подвозит тех, кто опоздал.`,
    look: { shape: 'box', c1: '#fca5a5', c2: '#b91c1c', c3: '#fde047', eyes: 'big', mouth: 'smile', back: [], feats: ['pantograph', 'stripe'] } },
  { id: 'fonarnik', name: ru`Фонарник`, el: 'current', rar: 2, stage: 1, fam: 'fonarnik', base: [148, 162, 150], time: 'night',
    desc: ru`Зажигает уличные фонари в сумерках. Мигающий фонарь — значит, Фонарник рядом и ему скучно.`,
    look: { shape: 'tall', c1: '#64748b', c2: '#1e293b', c3: '#fde047', eyes: 'glow', mouth: 'none', back: [], feats: ['lamp'] } },

  // ---------- ТЕНЬ ----------
  { id: 'shoroh', name: ru`Шорох`, el: 'shadow', rar: 1, stage: 1, fam: 'shoroh', evo: 'babayka', cost: 25, base: [120, 94, 102], time: 'night',
    desc: ru`Тот самый звук за спиной в пустом подъезде. На самом деле очень застенчив.`,
    look: { shape: 'ghost', c1: '#7e3bb8', c2: '#1e0b36', c3: '#e879f9', eyes: 'glow', mouth: 'none', back: [], feats: [] } },
  { id: 'babayka', name: ru`Бабайка`, el: 'shadow', rar: 2, stage: 2, fam: 'shoroh', evo: 'babay', cost: 100, base: [172, 126, 142],
    desc: ru`Прячется под кроватями и в тёмных арках. Питается страхами, но больше всего любит печенье.`,
    look: { shape: 'blob', c1: '#5b2aa8', c2: '#1a0b2e', c3: '#f472b6', eye: '#f472b6', eyes: 'many', mouth: 'teeth', back: [], feats: ['ears'] } },
  { id: 'babay', name: ru`Бабай`, el: 'shadow', rar: 3, stage: 3, fam: 'shoroh', base: [238, 160, 190],
    desc: ru`Ходит по ночным дворам с огромным мешком. Что в мешке — не знает даже Орден.`,
    look: { shape: 'robe', c1: '#4a1480', c2: '#0f0518', c3: '#f43f5e', eye: '#f43f5e', eyes: 'glow', mouth: 'teeth', back: [], feats: ['horns', 'bag'] } },
  { id: 'navka', name: ru`Навка`, el: 'shadow', rar: 4, stage: 1, fam: 'navka', base: [222, 176, 180], time: 'night',
    desc: ru`Вестница из Нави, мира по ту сторону. Приходит туда, где граница тоньше всего.`,
    look: { shape: 'ghost', c1: '#e2e8f0', c2: '#64748b', c3: '#cbd5e1', eye: '#67e8f9', eyes: 'glow', mouth: 'none', back: ['hair'], feats: [] } },
  { id: 'koschey', name: ru`Кощей`, el: 'shadow', rar: 5, stage: 1, fam: 'koschey', legend: true, base: [294, 232, 236],
    desc: ru`Легенда. Бессмертный царь Нави: это он расколол Алатырь-камень, пряча в нём иглу со своей смертью, и перепутал все миры. Ищи его в тёмных разломах.`,
    look: { shape: 'robe', c1: '#475569', c2: '#0f172a', c3: '#4ade80', eye: '#4ade80', eyes: 'glow', mouth: 'teeth', back: ['aura'], feats: ['crown', 'bones', 'runes'] } },

  // ---------- v1.3: новые духи ----------
  { id: 'bannik', name: ru`Банник`, el: 'water', rar: 3, stage: 1, fam: 'bannik', base: [178, 212, 214],
    desc: ru`Хозяин бань и саун. Любит пар погорячее и не терпит, когда парятся после полуночи.`,
    look: { shape: 'round', c1: '#f5b38b', c2: '#9a4a2a', c3: '#e5e7eb', eyes: 'sleepy', mouth: 'none', back: ['steam'], feats: ['beard', 'broom'] } },
  { id: 'poludnica', name: ru`Полудница`, el: 'fire', rar: 3, stage: 1, fam: 'poludnica', base: [220, 160, 170], time: 'day',
    desc: ru`Появляется в самый зной, около полудня. Спрашивает загадки и не любит, когда работают в жару.`,
    look: { shape: 'robe', c1: '#fde68a', c2: '#b45309', c3: '#fbbf24', eye: '#fff7ed', eyes: 'glow', mouth: 'none', back: ['halo', 'hair'], feats: [] } },
  { id: 'polevik', name: ru`Полевик`, el: 'forest', rar: 2, stage: 1, fam: 'polevik', base: [150, 158, 164],
    desc: ru`Дух полей и пустырей. В городе живёт на газонах и клумбах, считает каждый колосок.`,
    look: { shape: 'tall', c1: '#d9f99d', c2: '#65a30d', c3: '#eab308', eyes: 'round', mouth: 'smile', back: ['wheat'], feats: ['whiskers'] } },
  { id: 'yrka', name: ru`Ырка`, el: 'shadow', rar: 3, stage: 1, fam: 'yrka', base: [214, 140, 160], time: 'night',
    desc: ru`Ночной дух пустырей с горящими глазами. Боится огня и громких песен.`,
    look: { shape: 'ghost', c1: '#94a3b8', c2: '#1e293b', c3: '#f87171', eye: '#fb923c', eyes: 'glow', mouth: 'teeth', back: [], feats: ['runes'] } },
  { id: 'paketik', name: ru`Пакетик`, el: 'wind', rar: 1, stage: 1, fam: 'paketik', evo: 'shurshun', cost: 50, base: [112, 96, 118],
    desc: ru`Городской дух, рождённый из пакета, который ветер носит по дворам. Мечтает долететь до облаков.`,
    look: { shape: 'bag', c1: '#f8fafc', c2: '#94a3b8', c3: '#cbd5e1', eyes: 'big', mouth: 'o', back: ['handles'], feats: ['swirl'] } },
  { id: 'shurshun', name: ru`Шуршун`, el: 'wind', rar: 2, stage: 2, fam: 'paketik', base: [180, 138, 150],
    desc: ru`Выросший Пакетик. Шуршит так громко, что соседи думают, будто на чердаке кто-то живёт.`,
    look: { shape: 'bag', c1: '#e0f2fe', c2: '#475569', c3: '#7dd3fc', eyes: 'angry', mouth: 'cat', back: ['handles'], feats: ['swirl', 'bubbles'] } },
  { id: 'metrovik', name: ru`Метровик`, el: 'current', rar: 2, stage: 1, fam: 'metrovik', base: [160, 170, 158],
    desc: ru`Дух подземки. Знает все тоннели и первым слышит, что поезд подходит к станции.`,
    look: { shape: 'box', c1: '#93c5fd', c2: '#1e3a8a', c3: '#ef4444', eye: '#fde047', eyes: 'glow', mouth: 'none', back: ['sign'], feats: ['stripe'] } },
  { id: 'sirin', name: ru`Сирин`, el: 'shadow', rar: 4, stage: 1, fam: 'sirin', base: [226, 190, 196], region: 'west',
    desc: ru`Вещая птица с девичьим лицом. Её печальная песня слышна только на западе, до 40° в. д.`,
    look: { shape: 'bird', c1: '#e9d5ff', c2: '#6b21a8', c3: '#1e1b4b', eyes: 'sleepy', mouth: 'smile', back: ['tail', 'wings', 'hair'], feats: ['crown'] } },
  { id: 'alkonost', name: ru`Алконост`, el: 'water', rar: 4, stage: 1, fam: 'alkonost', base: [210, 206, 204], region: 'center',
    desc: ru`Райская птица радости. Вьёт гнёзда у тёплых морей, встречается между 40° и 90° в. д.`,
    look: { shape: 'bird', c1: '#a5f3fc', c2: '#0e7490', c3: '#fde047', eyes: 'round', mouth: 'smile', back: ['tail', 'wings', 'hair'], feats: ['crown'] } },
  { id: 'gamayun', name: ru`Гамаюн`, el: 'wind', rar: 4, stage: 1, fam: 'gamayun', base: [218, 196, 200], region: 'east',
    desc: ru`Птица-вестница, знающая всё на свете. Прилетает только на восток, дальше 90° в. д.`,
    look: { shape: 'bird', c1: '#c7d2fe', c2: '#3730a3', c3: '#f472b6', eye: '#f9a8d4', eyes: 'glow', mouth: 'none', back: ['tail', 'wings', 'hair'], feats: ['crest'] } },
  { id: 'gorynych', name: ru`Змей Горыныч`, el: 'fire', rar: 5, stage: 1, fam: 'gorynych', legend: true, base: [300, 220, 244],
    desc: ru`Легенда. Трёхголовый змей, хранитель Калинова моста. Головы вечно спорят, какая из них главная.`,
    look: { shape: 'blob', c1: '#4ade80', c2: '#14532d', c3: '#f97316', eyes: 'angry', mouth: 'teeth', back: ['aura', 'wings', 'heads3'], feats: ['horns'] } },

  // ---------- v1.4: сезонные духи ----------
  { id: 'morozko', name: ru`Морозко`, el: 'wind', rar: 4, stage: 1, fam: 'morozko', base: [224, 214, 206], season: 'winter',
    desc: ru`Зимний дух в инеевой шубе. Рисует узоры на окнах и проверяет, тепло ли тебе, девица. Появляется только зимой.`,
    look: { shape: 'robe', c1: '#e0f2fe', c2: '#1d4ed8', c3: '#f8fafc', eye: '#2563eb', eyes: 'glow', mouth: 'none', back: ['aura'], feats: ['beard', 'crown'] } },
  { id: 'snegurka', name: ru`Снегурка`, el: 'water', rar: 3, stage: 1, fam: 'snegurka', base: [190, 196, 202], season: 'winter',
    desc: ru`Девочка из снега. Боится костров и тёплых батарей, зато на катке ей нет равных. Появляется только зимой.`,
    look: { shape: 'ghost', c1: '#f0f9ff', c2: '#38bdf8', c3: '#bfdbfe', eyes: 'big', mouth: 'smile', back: ['hair'], feats: ['crown', 'cheeks'] } },
  { id: 'kupalinka', name: ru`Купалинка`, el: 'forest', rar: 3, stage: 1, fam: 'kupalinka', base: [196, 188, 194], season: 'kupala',
    desc: ru`Дух цветущего папоротника. Показывается летом, а в Купальскую ночь — повсюду.`,
    look: { shape: 'drop', c1: '#bbf7d0', c2: '#15803d', c3: '#f472b6', eyes: 'round', mouth: 'smile', back: ['aura'], feats: ['sprout', 'cheeks', 'leaves'] } },

  // ---------- v1.7 ----------
  { id: 'tenka', name: ru`Тенька`, el: 'shadow', rar: 1, stage: 1, fam: 'tenka', evo: 'sumrak', cost: 25, base: [114, 98, 108],
    desc: ru`Маленькая тень, которая отстала от хозяина. Прячется под скамейками и повторяет чужие движения.`,
    look: { shape: 'ghost', c1: '#475569', c2: '#0f172a', c3: '#a5b4fc', eye: '#e0e7ff', eyes: 'glow', mouth: 'o', back: [], feats: ['cheeks'] } },
  { id: 'sumrak', name: ru`Сумрак`, el: 'shadow', rar: 2, stage: 2, fam: 'tenka', evo: 'morok', cost: 100, base: [166, 132, 146],
    desc: ru`Приходит вместе с вечером и гасит краски улиц. Фонарники его недолюбливают.`,
    look: { shape: 'wisp', c1: '#6366f1', c2: '#1e1b4b', c3: '#c7d2fe', eye: '#a5b4fc', eyes: 'glow', mouth: 'none', back: [], feats: ['swirl'] } },
  { id: 'morok', name: ru`Морок`, el: 'shadow', rar: 3, stage: 3, fam: 'tenka', base: [234, 168, 184],
    desc: ru`Мастер наваждений. Может заставить весь двор увидеть один и тот же сон.`,
    look: { shape: 'robe', c1: '#4338ca', c2: '#0b0a1f', c3: '#818cf8', eye: '#c7d2fe', eyes: 'many', mouth: 'none', back: ['aura', 'hair'], feats: ['runes'] } },
  { id: 'bayun', name: ru`Кот Баюн`, el: 'shadow', rar: 4, stage: 1, fam: 'bayun', base: [216, 196, 210],
    desc: ru`Сказочный кот-сказитель. Мурлычет так, что засыпают даже Громовики. Живёт на высоких фонарях.`,
    look: { shape: 'round', c1: '#9ca3af', c2: '#374151', c3: '#f9a8d4', eye: '#86efac', eyes: 'glow', mouth: 'cat', back: ['cattail', 'ears'], feats: ['whiskers'] } },
  { id: 'volk', name: ru`Серый Волк`, el: 'forest', rar: 3, stage: 1, fam: 'volk', base: [220, 172, 190],
    desc: ru`Верный помощник царевичей. Бегает быстрее электрички и знает все короткие пути через парки.`,
    look: { shape: 'blob', c1: '#9ca3af', c2: '#4b5563', c3: '#e5e7eb', eyes: 'angry', mouth: 'none', back: ['ears', 'cattail'], feats: ['snout'] } },
  { id: 'liho', name: ru`Лихо Одноглазое`, el: 'shadow', rar: 3, stage: 1, fam: 'liho', base: [226, 150, 176], time: 'night',
    desc: ru`Не буди Лихо, пока оно тихо. Одним глазом видит все твои неудачи — и немного их подбрасывает.`,
    look: { shape: 'tall', c1: '#78716c', c2: '#292524', c3: '#fbbf24', eyes: 'one', mouth: 'teeth', back: ['horns'], feats: [] } },
  { id: 'samokatnik', name: ru`Самокатник`, el: 'current', rar: 2, stage: 1, fam: 'samokatnik', base: [170, 136, 146],
    desc: ru`Дух брошенных самокатов. Носится по тротуарам и звенит, когда его забывают зарядить.`,
    look: { shape: 'box', c1: '#6ee7b7', c2: '#047857', c3: '#fde047', eyes: 'big', mouth: 'smile', back: ['handlebar'], feats: ['wheels'] } },
  { id: 'kurernik', name: ru`Курьерник`, el: 'wind', rar: 2, stage: 1, fam: 'kurernik', base: [158, 150, 156],
    desc: ru`Дух доставки. Всегда «будет через 5 минут». Путает подъезды, зато никогда не опаздывает на встречу с Ловчим.`,
    look: { shape: 'round', c1: '#fdba74', c2: '#c2410c', c3: '#fef3c7', eyes: 'round', mouth: 'smile', back: ['backpack'], feats: ['hat', 'cheeks'] } },

  // ---------- v3.8: духи родных земель — у каждого края России свой ----------
  { id: 'bereginya', name: ru`Берегиня`, el: 'water', rar: 4, stage: 1, fam: 'bereginya', base: [206, 214, 208], land: 'center',
    desc: ru`Хранительница речных берегов и бродов. Живёт в Центре и на Северо-Западе — от Калининграда до Нижнего Новгорода.`,
    look: { shape: 'robe', c1: '#bae6fd', c2: '#0369a1', c3: '#fef08a', eyes: 'sleepy', mouth: 'smile', back: ['hair', 'halo'], feats: ['crown'] } },
  { id: 'spoloh', name: ru`Сполох`, el: 'wind', rar: 4, stage: 1, fam: 'spoloh', base: [222, 188, 196], land: 'north',
    desc: ru`Дух северного сияния. Пляшет над тундрой и Белым морем, а в полярную ночь спускается к самым крышам. Только на Севере.`,
    look: { shape: 'wisp', c1: '#86efac', c2: '#0f766e', c3: '#c084fc', eyes: 'glow', mouth: 'none', back: ['aura', 'ripples'], feats: ['swirl'] } },
  { id: 'zhigul', name: ru`Жигуль`, el: 'forest', rar: 4, stage: 1, fam: 'zhigul', base: [214, 216, 200], land: 'volga',
    desc: ru`Лесной великан Жигулёвских гор. Сторожит излучину Волги и гудит, как пароход. Водится в Поволжье.`,
    look: { shape: 'tall', c1: '#a3e635', c2: '#365314', c3: '#b45309', eyes: 'round', mouth: 'teeth', back: ['antlers', 'sprout'], feats: ['leaves'] } },
  { id: 'tur', name: ru`Горный Тур`, el: 'wind', rar: 4, stage: 1, fam: 'tur', base: [226, 200, 186], land: 'caucasus',
    desc: ru`Дух горных круч, скачет по скалам выше облаков. Встречается на Юге России и на Кавказе.`,
    look: { shape: 'round', c1: '#e7e5e4', c2: '#57534e', c3: '#a8a29e', eyes: 'angry', mouth: 'none', back: ['horns', 'mane'], feats: ['snout', 'beard'] } },
  { id: 'mednaya', name: ru`Хозяйка Медной горы`, el: 'current', rar: 4, stage: 1, fam: 'mednaya', base: [218, 204, 198], land: 'ural',
    desc: ru`Владычица уральских недр: хранит малахит, медь и самоцветы. Показывается только на Урале.`,
    look: { shape: 'robe', c1: '#34d399', c2: '#065f46', c3: '#f59e0b', eye: '#fde047', eyes: 'glow', mouth: 'smile', back: ['hair', 'aura'], feats: ['crown', 'runes'] } },
  { id: 'babr', name: ru`Бабр`, el: 'fire', rar: 4, stage: 1, fam: 'babr', base: [232, 180, 196], land: 'siberia',
    desc: ru`Огненный зверь сибирской тайги — тот самый, что держит соболя на гербе Иркутска. Водится в Сибири.`,
    look: { shape: 'round', c1: '#fb923c', c2: '#7c2d12', c3: '#1c1917', eyes: 'angry', mouth: 'teeth', back: ['cattail', 'ears'], feats: ['whiskers'] } },
  { id: 'kutkh', name: ru`Кутх`, el: 'shadow', rar: 4, stage: 1, fam: 'kutkh', base: [220, 190, 200], land: 'fareast',
    desc: ru`Ворон-творец из сказаний Камчатки: говорят, это он вытащил землю из моря. Прилетает только на Дальний Восток.`,
    look: { shape: 'bird', c1: '#64748b', c2: '#0f172a', c3: '#f59e0b', eye: '#fbbf24', eyes: 'glow', mouth: 'beak', back: ['wings', 'tail'], feats: ['crest'] } },

  // ---------- v3.9: легенда третьей книги (4.24: встречается в разломах) ----------
  { id: 'indrik', name: ru`Индрик-зверь`, el: 'water', rar: 5, stage: 1, fam: 'indrik', legend: true, base: [292, 244, 256],
    desc: ru`Легенда. Всем зверям отец: ходит под землёй, как солнце по небу, и прочищает подземные реки, чтобы источники не иссякли.`,
    look: { shape: 'blob', c1: '#e0e7ff', c2: '#4338ca', c3: '#67e8f9', eye: '#a5f3fc', eyes: 'glow', mouth: 'none', back: ['aura', 'mane', 'tail', 'unihorn'], feats: [] } },

  // ---------- 4.0 «Осень Нави»: дубовое семейство, Самоварник, осенняя Листопадница и легенда четвёртой книги ----------
  { id: 'zheludok', name: ru`Желудок`, el: 'forest', rar: 1, stage: 1, fam: 'zheludok', evo: 'dubovik', cost: 25, base: [110, 116, 118],
    desc: ru`Скатился с дуба прямо в городской сквер. Мечтает вырасти большим и сильным, а пока катается по дорожкам и прячется в листве.`,
    look: { shape: 'round', c1: '#d9a066', c2: '#7c4a1d', c3: '#a3e635', eyes: 'round', mouth: 'smile', back: [], feats: ['acorn', 'cheeks'] } },
  { id: 'dubovik', name: ru`Дубовик`, el: 'forest', rar: 2, stage: 2, fam: 'zheludok', evo: 'dubynya', cost: 100, base: [158, 170, 160],
    desc: ru`Подросший Желудок. Кора у него крепкая, как кольчуга, а в дупле хранится запас желудей на чёрный день.`,
    look: { shape: 'tall', c1: '#a16207', c2: '#422006', c3: '#84cc16', eyes: 'angry', mouth: 'smile', back: ['antlers'], feats: ['leaves', 'beard'] } },
  { id: 'dubynya', name: ru`Дубыня`, el: 'forest', rar: 3, stage: 3, fam: 'zheludok', base: [226, 232, 204],
    desc: ru`Богатырь-дубодёр из былин. Выворачивает с корнем деревья, сломанные бурей, и сажает на их место новые.`,
    look: { shape: 'robe', c1: '#854d0e', c2: '#3f2a14', c3: '#65a30d', eyes: 'angry', mouth: 'none', back: ['aura', 'antlers'], feats: ['beard', 'leaves', 'runes'] } },
  { id: 'samovarnik', name: ru`Самоварник`, el: 'fire', rar: 3, stage: 1, fam: 'samovarnik', base: [196, 192, 196],
    desc: ru`Дух бабушкиного самовара. Где он пыхтит — там чай с пряниками и разговоры до полуночи. Не любит, когда пьют из пакетиков.`,
    look: { shape: 'box', c1: '#fbbf24', c2: '#92400e', c3: '#ef4444', eyes: 'round', mouth: 'smile', back: ['steam', 'handles'], feats: ['cheeks'] } },
  { id: 'listopadnica', name: ru`Листопадница`, el: 'wind', rar: 3, stage: 1, fam: 'listopadnica', base: [198, 176, 188], season: 'autumn',
    desc: ru`Осенний дух листопада. Кружит жёлтые листья над дворами, а на Покров укрывает землю первым инеем. Появляется только осенью.`,
    look: { shape: 'ghost', c1: '#fdba74', c2: '#c2410c', c3: '#facc15', eyes: 'sleepy', mouth: 'smile', back: ['hair', 'aura'], feats: ['leaves', 'cheeks'] } },
  { id: 'svyatogor', name: ru`Святогор`, el: 'forest', rar: 5, stage: 1, fam: 'svyatogor', legend: true, base: [302, 252, 262],
    desc: ru`Легенда. Богатырь, которого не держит мать сыра земля. Спит в Святых горах и встаёт, только когда Руси грозит беда.`,
    look: { shape: 'robe', c1: '#94a3b8', c2: '#1e293b', c3: '#fbbf24', eye: '#fde047', eyes: 'glow', mouth: 'none', back: ['aura', 'halo'], feats: ['beard', 'crown', 'runes'] } },
];
// Земли России для духов родных земель (грубо, по широте и долготе)
const LANDS = {
  center:   { name: ru`Центр и Северо-Запад`, where: ru`западнее 44° в. д., от Кавказа до 64° с. ш.` },
  north:    { name: ru`Север`,                where: ru`севернее 64° с. ш.` },
  volga:    { name: ru`Поволжье`,             where: ru`44–55° в. д.` },
  caucasus: { name: ru`Юг и Кавказ`,          where: ru`южнее 46,5° с. ш., 36–55° в. д.` },
  ural:     { name: ru`Урал`,                 where: ru`55–66° в. д.` },
  siberia:  { name: ru`Сибирь`,               where: ru`66–105° в. д.` },
  fareast:  { name: ru`Дальний Восток`,       where: ru`восточнее 105° в. д.` },
};
const REGIONS = {
  west:   { name: ru`Запад`,  range: ru`до 40° в. д.` },
  center: { name: ru`Центр`,  range: ru`40–90° в. д.` },
  east:   { name: ru`Восток`, range: ru`от 90° в. д.` },
};
/* ---------- 4.28: мифологии мира ----------
   Духи и боги других мифологий — по файлу данных на мифологию (js/myth-<ключ>.js, подключается до data.js:
   globalThis.MYTH_SP[ключ] = [...виды]) и файлу рисунков (js/sp-<ключ>.js). Номера в Бестиарии — после славянских,
   в порядке MYTHS. После Перепутицы (сюжет — LORE) духи всех мифологий водятся по всему свету, мифология выпадает
   поровну (W.evenMyth); у Разлома и святилища — одна из семи мифологий (W.placeMyth). where — родина мифологии по легенде.
   4.28: сезоны Алатыря — season: с какого сезона мифология открыта (у первых семи — 1). Мифология следующих сезонов приходит
   своим файлом js/myth-<ключ>.js: globalThis.MYTH_SP[ключ] = [...виды] и globalThis.MYTH_META[ключ] = { name, where, color,
   season, rift, riftDesc, shrine, shrineOf, shrineDesc, gods, guards } (и по желанию world — куда ведёт её дорога, road —
   «Дорога в …», clan — её клан, см. CLANS). Пока её сезон не настал, она закрыта: её духов нет в SPECIES, её нет в MYTH_KEYS (mythOpen ниже). */
const MYTHS = {
  slavic: { name: ru`Славянская`,    where: ru`Россия, Восточная Европа, Кавказ и Средняя Азия`,          color: '#f59e0b', season: 1 },
  greek:  { name: ru`Греческая`,     where: ru`Средиземноморье: Греция, Италия, Испания, Турция`,         color: '#60a5fa', season: 1 },
  norse:  { name: ru`Скандинавская`, where: ru`Скандинавия, Исландия, Дания, Германия, Прибалтика`,       color: '#93c5fd', season: 1 },
  celtic: { name: ru`Кельтская`,     where: ru`Ирландия, Британия, Франция, Бельгия, Нидерланды`,          color: '#34d399', season: 1 },
  egypt:  { name: ru`Египетская`,    where: ru`Египет, Северная Африка, Аравия и Ближний Восток`,          color: '#fbbf24', season: 1 },
  china:  { name: ru`Китайская`,     where: ru`Китай, Корея, Япония и Юго-Восточная Азия`,                 color: '#ef4444', season: 1 },
  aztec:  { name: ru`Ацтекская`,     where: ru`Америка — от Аляски до Огненной Земли`,                     color: '#10b981', season: 1 },
};
// 4.28: мифологии следующих сезонов (MYTH_META) — после первых семи, по сезонам; ключ — только латиница
for (const [k, m] of Object.entries(globalThis.MYTH_META || {})) {
  if (MYTHS[k] || !/^[a-z]{2,16}$/.test(k) || !m || typeof m !== 'object') continue;
  MYTHS[k] = { name: m.name || k, where: m.where || '', color: m.color || '#fde68a', season: Math.max(2, Math.floor(+m.season) || 2), world: m.world || null, road: m.road || null };
}
// все мифологии игры (и закрытые) — по сезону, в сезоне — по порядку объявления
const MYTH_ALL = Object.keys(MYTHS).map((k, i) => [k, i]).sort((a, b) => MYTHS[a[0]].season - MYTHS[b[0]].season || a[1] - b[1]).map(x => x[0]);
const MYTH_KEYS = MYTH_ALL.slice(); // открытые сейчас (mythOpen); массив меняется на месте — ссылки на него живут
for (const m of MYTH_ALL) for (const x of (globalThis.MYTH_SP || {})[m] || []) SPECIES.push({ ...x, myth: m });
SPECIES.forEach(s => { if (!s.myth) s.myth = 'slavic'; });
SPECIES.forEach((s, i) => { s.num = i + 1; });
const SP = Object.fromEntries(SPECIES.map(s => [s.id, s])); // все виды, и закрытых мифологий: по нему узнают вид по id
const SPECIES_ALL = SPECIES.slice();
// 4.28: открыть мифологии сезона s: SPECIES и MYTH_KEYS меняются на месте — только открытые виды и мифологии. Сезон сейчас
// знают Ev.alaSeason (сервер — из базы, телефон — от сервера): Ev.alaSync зовёт mythOpen перед отбором духов
let MYTH_SEASON = 0;
function mythOpen(s, force) {
  s = Math.max(1, Math.floor(+s) || 1);
  if (s === MYTH_SEASON && !force) return false;
  MYTH_SEASON = s;
  const open = MYTH_ALL.filter(m => (MYTHS[m].season || 1) <= s);
  MYTH_KEYS.length = 0; MYTH_KEYS.push(...open);
  SPECIES.length = 0; SPECIES.push(...SPECIES_ALL.filter(x => open.includes(x.myth)));
  return true;
}
// мифология, что открывается в сезоне s (первая по порядку), или null — её ещё нет в игре
function mythOfSeason(s) { return MYTH_ALL.find(m => MYTHS[m].season === s && s > 1) || null; }
mythOpen(1);

const ITEMS = {
  charm:   { name: ru`Оберег`,             desc: ru`Узелок с заговорённой травой. Бросай в духа, чтобы поймать.`, mult: 1,   throwable: true },
  charm2:  { name: ru`Серебряный оберег`,  desc: ru`Серебро держит духов крепче. Шанс поимки ×1,5.`,              mult: 1.5, throwable: true, unlock: 8 },
  charm3:  { name: ru`Золотой оберег`,     desc: ru`Лучший оберег Ордена. Шанс поимки ×2.`,                        mult: 2,   throwable: true, unlock: 16 },
  honey:   { name: ru`Мёд`,                desc: ru`Духи обожают мёд. Успокаивает духа: шанс поимки ×1,5 на один бросок.` },
  // 4.15: лечение духов (здоровье — общее на всю игру, см. Rules.HP): heal — сколько здоровья вернёт, revive — поднимает духа без сил
  herb:    { name: ru`Подорожник`,         desc: ru`Лист к ране — и полегчало. Возвращает духу четверть здоровья.`, heal: 0.25 },
  brew:    { name: ru`Целебный отвар`,     desc: ru`Травы Велеса, сваренные в воде из источника. Возвращает духу 60% здоровья.`, heal: 0.6 },
  // 4.15.1: revive — на сколько часов раньше поднимется дух без сил (живых Мёртвая вода не лечит)
  deadwater: { name: ru`Мёртвая вода`,     desc: ru`Редкая сказочная вода, что сращивает самые тяжкие раны. Дух без сил поднимется на 4 часа раньше. Живых не лечит.`, revive: 4 },
  water:   { name: ru`Живая вода`,         desc: ru`Возвращает духу половину здоровья, а в разломе — лечит прямо в бою. Духа без сил не поднимет.`, heal: 0.5 },
  incense: { name: ru`Ладан`,              desc: ru`Дымок приманивает духов: 30 минут их вокруг вдвое больше.` },
  farpass: { name: ru`Дальний пропуск`,    desc: ru`Грамота Ордена: закрыть Разлом до 5 км от тебя, не подходя к нему. Один Орден дарит каждый день.` },
  // 5.1: телепорт через Атлас без перезарядки (Rules.MOVE.TP_ITEM)
  gate:    { name: ru`Врата Перепутицы`,   desc: ru`Кольцо Ордена с воронкой дорог: шагни в любое место Атласа мира сразу, не дожидаясь перезарядки. Одни Врата дарят на седьмой день серии.` },
  // 4.16: Настой опыта (Лавка, Золотая тропа) — пьётся из сумки, см. Rules.XP_BREW
  xpbrew:  { name: ru`Настой опыта`,       desc: ru`Медовый настой на травах Велеса: сутки опыта на четверть больше.` },
  gift:    { name: ru`Подарок`,           desc: ru`Узелок для друга: обереги, мёд, иногда кокон. Отправляется в «Меню → Друзья», раз в день каждому.` },
};
const GIFT_LIMIT = 25; // 4.16: было 10 при 50 друзьях — подарков социальному игроку не хватало

/* ---------- Дружба (v1.8) ---------- */
const FRIEND_LEVELS = [
  { name: ru`Знакомый`, pts: 0 },
  { name: ru`Приятель`, pts: 3, xp: 500 },
  { name: ru`Друг`, pts: 10, xp: 1000 },
  { name: ru`Лучший друг`, pts: 30, xp: 2000 },
  { name: ru`Побратим`, pts: 60, xp: 4000 },
]; // 4.16: опыт за ступени — 7 500 за друга (было 16 000: с 50 друзьями до 800 тыс., почти 40% пути до 40 уровня)
const BAG_LIMIT = 350;

const COCOON_TIERS = {
  2:  { name: ru`Зелёный кокон`,  color: '#86efac', pool: { 1: 1 } },
  5:  { name: ru`Синий кокон`,    color: '#7dd3fc', pool: { 1: 3, 2: 4, 3: 1 } },
  10: { name: ru`Лиловый кокон`,  color: '#d8b4fe', pool: { 2: 2, 3: 3, 4: 2 } },
};
// Кривые прошлых версий — только для переноса опыта (S.migrate): до 3.19 (levelXPOld) и 3.19–4.15 (levelXP2: до 10 уровня
// как прежде, дальше каждый уровень на 17% дороже: 20 ≈ 90 тыс., 40 ≈ 2,1 млн — 14-й уровень в первый день, стена после 30-го)
function levelXPOld(n) { return n <= 1 ? 0 : Math.round(400 * Math.pow(n - 1, 1.75) / 50) * 50; }
function levelXP2(n) { return n <= 10 ? levelXPOld(n) : Math.round(levelXPOld(10) * Math.pow(1.17, n - 10) / 50) * 50; }
// 4.16: опыт на уровень n (всего с начала игры). Цель — Ловчий, что играет около часа в день (~5 км): 10-й уровень на 3–4 день,
// 20-й — к двум неделям, 30-й — за два месяца, 40-й — за 5–6 месяцев; хардкор — 40-й за 3–3,5 месяца, играющий изредка — за год
// (с опытом отдыха). Цена уровня растёт плавно: в начале уровни частые, дальше рост цены замедляется (39→40 — 370 тыс.)
const LEVEL_XP = [0, 0, 1500, 4000, 7500, 12500, 19500, 30000, 42000, 56000, 73000, 92000, 114000, 139000, 167000, 197000, 230000, 270000, 315000, 360000,
  415000, 480000, 550000, 630000, 720000, 820000, 935000, 1060000, 1200000, 1360000, 1540000, 1730000, 1935000, 2155000, 2395000, 2660000, 2945000, 3250000, 3575000, 3920000, 4290000];
function levelXP(n) { return n <= 1 ? 0 : n <= 40 ? LEVEL_XP[n] : LEVEL_XP[40] + (n - 40) * (LEVEL_XP[40] - LEVEL_XP[39]); }
const MAX_LEVEL = 40;
// 4.16: опыт за день (S.xpGain): до FULL — полностью, дальше до HALF — вполовину, сверх — на четверть (мягкий потолок: хардкорный
// день не уводит далеко вперёд; разовые награды — главы Летописи, обучение, знаки — без потолка). Опыт отдыха: за каждый день
// без игры копится REST (не больше, чем за REST_DAYS дней); пока он есть, опыт вдвое — казуальный Ловчий не отстаёт навсегда
const XP_DAY = { FULL: 35000, HALF: 70000, REST: 15000, REST_DAYS: 7 };
// 4.16: разделы открываются постепенно — лестница открытий (раньше Капища — с 3, вторжения — с 4, Лига, дружины и Аукцион — с 5:
// всё открывалось в первые часы). Дружины — CLAN_LEVEL, Лига — League.LEVEL, Аукцион — Rules.AUCTION.LEVEL
const DUEL_LEVEL = 5;      // с какого уровня бои на Капищах
const INVASION_LEVEL = 7;  // с какого уровня Навь захватывает источники (вторжения)
const RAID_LEVEL = 4;      // 4.18: с какого уровня Разломы (раньше — с начала; первая глава Летописи с Разломом — на 5-м)
const MOVE2_LEVEL = 6;     // 4.18: с какого уровня в карточке духа показывается второй приём

const QUEST_TEMPLATES = [
  { t: 'catch',   min: 5, max: 10, text: n => ru.k`Поймай ${n} духов`,                 reward: { charm: 8, sparks: 300 } },
  { t: 'catchEl', min: 2, max: 3,  text: (n, el) => ru.k`Поймай ${n} духов стихии «${ELEMENTS[el].name}»`, reward: { honey: 3, sparks: 400 } },
  { t: 'spring',  min: 3, max: 5,  text: n => ru.k`Зачерпни силы из ${n} источников`,     reward: { charm: 5, herb: 2 } },
  { t: 'throw',   min: 2, max: 4,  text: n => ru.k`Сделай ${n} отличных бросков`,       reward: { honey: 2, sparks: 300 } },
  { t: 'walk',    min: 1, max: 2,  text: n => ru.k`Пройди ${n} км`,                     reward: { charm: 10, sparks: 500 } },
  { t: 'power',   min: 2, max: 4,  text: n => ru.k`Усиль духов ${n} ${U.plural(n, ru.k`раз`, ru.k`раза`, ru.k`раз`)}`,            reward: { herb: 2, sparks: 300 } },
  { t: 'evolve',  min: 1, max: 1,  text: () => ru.k`Преврати одного духа`,              reward: { honey: 2, sparks: 400 } }, // 4.16: ладан — реже
  { t: 'raid',    min: 1, max: 1,  text: () => ru.k`Закрой разлом`,                     reward: { charm2: 5, sparks: 800 } },
];

/* ---------- Поручения из источников (3.2): задание → встреча с духом ---------- */
// tier: 1 — лёгкое (обычные и необычные духи), 2 — среднее (необычные и редкие), 3 — трудное (редкие и эпические)
const TASK_TEMPLATES = [
  { t: 'catch',    tier: 1, min: 5, max: 8, text: n => ru.k`Поймай ${n} духов` },
  { t: 'spring',   tier: 1, min: 3, max: 5, text: n => ru.k`Зачерпни силы из ${n} источников` },
  { t: 'power',    tier: 1, min: 3, max: 5, text: n => ru.k`Усиль духов ${n} ${U.plural(n, ru.k`раз`, ru.k`раза`, ru.k`раз`)}` },
  { t: 'photo',    tier: 1, min: 1, max: 1, text: () => ru.k`Сфотографируй духа во время встречи` },
  { t: 'catchEl',  tier: 2, min: 3, max: 5, text: (n, el) => ru.k`Поймай ${n} духов стихии «${ELEMENTS[el].name}»` },
  { t: 'throw',    tier: 2, min: 3, max: 5, text: n => ru.k`Сделай ${n} отличных бросков` },
  { t: 'walk',     tier: 2, min: 1, max: 2, text: n => ru.k`Пройди ${n} км` },
  { t: 'evolve',   tier: 2, min: 1, max: 1, text: () => ru.k`Преврати духа` },
  { t: 'duel',     tier: 2, min: 1, max: 1, lvl: DUEL_LEVEL, text: () => ru.k`Победи хранителя капища` },
  { t: 'hatch',    tier: 3, min: 1, max: 1, text: () => ru.k`Выведи духа из кокона` },
  { t: 'invasion', tier: 3, min: 1, max: 1, lvl: INVASION_LEVEL, text: () => ru.k`Освободи источник от прислужников Нави` },
  { t: 'raid',     tier: 3, min: 1, max: 1, lvl: 5, text: () => ru.k`Закрой разлом` },
];
const TASK_TIERS = {
  1: { rar: [1, 2], lvl: 12, reward: { charm: 3 } },
  2: { rar: [2, 3], lvl: 18, reward: { charm: 5, honey: 1 } },
  3: { rar: [3, 4], lvl: 25, reward: { charm2: 3, honey: 2 } },
};
const TASK_LIMIT = 5;

/* ---------- 5.1.15: Кампания (раздел «Кампания» в «Заданиях» и строка на карте под Ловчим) ----------
   Главы из шагов. Шаги идут по порядку: следующий открывается, когда забрана награда прошлого (глава II — позже).
   obj — цели шага, выполняются в любом порядке: t — что считается (как в S.progress: catch, hatch, evolve, spring, walk (км),
   catchRar (r — редкость), spLvl — духи уровня l и выше (5.1.16: было «до предела уровня»), campRift — победа в Разломе кампании, leagueWin — победа
   в Лиге, clan — выбран клан, exchange — обмен в Обменнике, buyIncense — куплен ладан, gateLand — шаг через Врата в другую
   часть света), n — сколько. start — что Орден выдаёт, когда шаг открылся (evoEss — эссенция ровно на эволюцию, не меньше evoEss: S.campEvoTarget).
   reward: pick — редкий дух уровня Ловчего на выбор из трёх (сперва — стихий, которых у Ловчего нет), ess — эссенция
   выбранного духа, cocoon — кокон (км), lvl + xp — опыт до lvl уровня Ловчего, но не меньше xp, skin — случайный облик
   (CAMP_SKIN), прочее — как в S.giveRewards. Считает и выдаёт сервер (S.campProgress; core.js: campClaim, campPick, campRift) */
const CAMPAIGN = [
  { title: ru`Глава I. Путь Ловчего`, steps: [
    { id: 'c1s1', name: ru`Первая охота`, obj: [{ t: 'catch', n: 5 }, { t: 'spLvl', l: 7, n: 3 }, { t: 'campRift', n: 1 }],
      reward: { pick: 1, ess: 15, cocoon: 5, lvl: 4, xp: 2500 } },
    { id: 'c1s2', name: ru`Тепло кокона`, obj: [{ t: 'hatch', n: 1 }], reward: { lvl: 5, xp: 2500 } },
    { id: 'c1s3', name: ru`Вызов Лиги`, obj: [{ t: 'leagueWin', n: 3 }], reward: { pick: 1, lvl: 6, xp: 5000 } },
    { id: 'c1s4', name: ru`Знамя клана`, obj: [{ t: 'clan', n: 1 }], reward: { lvl: 7, xp: 2500 } },
    { id: 'c1s5', name: ru`Эволюция`, obj: [{ t: 'evolve', n: 1 }], start: { evoEss: 25 }, reward: { xp: 5000, sparks: 10000 } },
    { id: 'c1s6', name: ru`Искры и монеты`, obj: [{ t: 'exchange', n: 5 }], reward: { lvl: 8, xp: 5000, sparks: 10000 } },
    { id: 'c1s7', name: ru`Дымок ладана`, obj: [{ t: 'buyIncense', n: 1 }, { t: 'catch', n: 15 }], reward: { pick: 1, lvl: 9, xp: 10000, gate: 1 } },
    { id: 'c1s8', name: ru`Врата Перепутицы`, obj: [{ t: 'gateLand', n: 1 }], reward: { gate: 1, xp: 2500 } },
    { id: 'c1s9', name: ru`Дальний путь`, obj: [{ t: 'walk', n: 60 }, { t: 'catchRar', r: 3, n: 5 }, { t: 'catchRar', r: 2, n: 10 }, { t: 'catchRar', r: 1, n: 20 }, { t: 'spring', n: 10 }],
      reward: { skin: 1, sparks: 30000, zlat: 50, xp: 10000 } },
  ] },
];
// текст цели (на телефоне — на языке игрока)
const CAMP_OBJ = {
  catch: o => ru`Поймай духов: ${o.n}`,
  spLvl: o => ru`Усиль духов до ${o.l} уровня: ${o.n}`,
  campRift: () => ru`Победи духа из Разлома кампании`,
  hatch: () => ru`Нагрей любой кокон и выведи из него духа`,
  leagueWin: o => ru`Победи в боях Лиги: ${o.n}`,
  clan: () => ru`Выбери клан`,
  evolve: () => ru`Эволюционировать духа`,
  exchange: o => ru`Обменяй искры в Обменнике Лавки: ${o.n}`,
  buyIncense: () => ru`Купи ладан в Лавке`,
  gateLand: () => ru`Шагни через Врата в другую часть света`,
  walk: o => ru`Пройди ${o.n} км`,
  catchRar: o => o.r === 3 ? ru`Поймай редких духов: ${o.n}` : o.r === 2 ? ru`Поймай необычных духов: ${o.n}` : ru`Поймай обычных духов: ${o.n}`,
  spring: o => ru`Зачерпни силы из источников: ${o.n}`,
};
// коротко — для строки Кампании на карте (цель на несколько раз — с «сделано/нужно»)
const CAMP_SHORT = {
  campRift: () => ru`Разлом кампании`, hatch: () => ru`Выведи духа из кокона`, clan: () => ru`Выбери клан`, evolve: () => ru`Эволюционировать духа`,
  buyIncense: () => ru`Купи ладан в Лавке`, gateLand: () => ru`Врата в другую часть света`,
  catch: () => ru`Поймай духов`, spLvl: o => ru`Духи ${o.l} уровня`, leagueWin: () => ru`Победы в Лиге`, exchange: () => ru`Обмены в Обменнике`,
  walk: () => ru`Путь, км`, spring: () => ru`Источники`, catchRar: o => o.r === 3 ? ru`Редкие духи` : o.r === 2 ? ru`Необычные духи` : ru`Обычные духи`,
};
// случайный облик за Кампанию: [редкость облика (LOOK.skin rar), вес] — редкий 95%, эпический 4,9%, легендарный 0,1%
const CAMP_SKIN = [[1, 950], [2, 49], [3, 1]];

/* 5.1.15: части света Атласа мира — материки (Atlas.LANDS): label — точка подписи [долгота, широта], myths — мифологии, которые
   здесь «родом», polys — очертания «долгота,широта …». Общие для телефона и сервера: по ним сервер узнаёт, что Ловчий шагнул
   через Врата в другую часть света (Rules.land, шаг Кампании) */
const WORLD_LANDS = [
  { id: 'europe', name: ru`Европа`, label: [22, 53], myths: ['slavic', 'greek', 'norse', 'celtic'],
    text: ru`Здесь сходятся старые дороги Нави, Олимпа, Асгарда и холмов сидов — от Москвы до Дублина.`,
    polys: [
      '-5.6,36 -6.3,36.8 -7.4,37.2 -8.9,37 -8.8,38.7 -9.5,39.4 -8.9,41.8 -9.3,43 -8,43.7 -5.8,43.6 -3.8,43.45 -1.8,43.4 -1.2,44.6 -1.3,46.2 -2.2,47.1 -4.7,48 -4.5,48.6 -3,48.8 -1.6,48.7 -1.9,49.7 0.2,49.5 1.6,50.2 2.5,51.1 3.6,51.4 4.2,52.3 4.8,53 6.9,53.4 8.6,53.9 8.6,55.5 8.1,56.8 10.6,57.7 10.3,56.2 10,55 10.9,54.4 11,54 13.2,54.3 14.3,53.9 16.5,54.5 18.6,54.8 19.9,54.4 21.1,55.3 21.1,56.4 22,57.6 23.5,57 24.1,57 24.4,58.3 23.4,59 24.7,59.5 28,59.5 30.2,59.9 29,60.2 27,60.5 22.9,59.8 21.4,60.6 21.5,61.8 21.2,63 22.3,63.9 24.5,64.9 25.4,65 25.3,65.5 24.2,65.8 22.2,65.6 21,64.5 19,63.4 17.6,62.4 17.2,61 18.6,60.2 18.8,59.4 16.9,58.3 16.5,57 15.9,56.1 14.2,55.4 12.9,55.4 12.6,56.2 11.8,57.7 11.1,59 10.6,59.9 9.8,59 8,58.1 6.6,58.1 5.6,58.9 5,60.4 5,61.9 6.2,62.5 8.5,63.4 9.6,64.2 12.3,65.8 13.6,67.5 15.8,68.5 18.9,69.7 21.5,70.2 25.8,71.1 28.5,70.9 31,70.3 33,69.4 36.5,69.1 40.8,67.7 41.2,66.2 38,66.1 35,66.5 34.8,64.5 37,63.9 40.5,64.6 43.5,66.2 44.2,68.3 48,67.6 53.5,68.2 59,68.5 66,69 60,68 59.5,65 59,61 59.5,58 59.2,55 58.8,52 55,51.2 51.5,49.5 51.8,47 49.5,46.5 47.5,45.6 47,44.3 48.5,41.8 46,42.5 43.5,43.2 41.5,43.3 40,43.4 39.7,43.6 38,44.5 37.3,45 38.2,46.2 39.7,47.2 37.5,46.7 35.5,45.4 36.4,45.1 35.4,44.9 34.2,44.5 33.5,44.6 32.6,45.4 33.6,46.1 31.8,46.5 30.7,46.5 29.7,45.3 28.6,44.3 28,43.2 27.7,42.1 28.9,41.3 29.05,41.2 29,41 28.6,40.97 27.5,40.95 27,40.7 26.2,40.6 26,40.8 24,40.9 22.9,40.6 22.9,39.35 22.5,38.9 23.6,38.46 24,38.15 24.02,37.65 23.63,37.94 23.35,38 22.93,37.94 22.8,37.57 23.05,36.69 23.2,36.44 22.56,36.76 22.48,36.39 22.1,37.03 21.7,36.82 21.67,37.25 21.35,37.67 21.73,38.25 21.43,38.37 20.75,38.96 20.26,39.5 19.4,40.3 19.4,41.8 18.5,42.4 16.4,43.5 15.2,44.2 13.9,44.8 13.7,45.6 12.3,45.4 12.3,44.4 13.6,43.6 14.8,42.1 16.2,41.9 17.1,41.1 18.5,40.1 17.2,40.4 16.6,39 15.7,37.9 15.6,38.3 16,39.3 15.7,40.1 14.3,40.8 12.5,41.7 10.5,42.9 10.2,43.9 8.9,44.4 7.5,43.8 6,43.1 4.8,43.4 3,43 3.2,41.9 2.2,41.4 0.9,41 -0.3,39.5 0.2,38.8 -0.5,38.3 -0.9,37.6 -2.1,36.7 -4.4,36.7 -5.4,36.1',
      '-5.7,50.1 -3.5,50.4 -1.3,50.8 1.4,51.2 1.7,52.6 0.3,53.4 -0.1,54.1 -1.5,55 -2,55.8 -3.1,56.1 -1.8,57.5 -3.2,58.6 -5,58.6 -5.7,57.3 -6.2,56.5 -5.6,55.3 -4.9,54.8 -3.2,54.9 -3.4,54.2 -3,53.4 -4.6,53.3 -4.2,52.2 -5.3,51.8 -3.2,51.4 -4.2,51.2',
      '-6,52.2 -6.2,53.3 -6,54 -5.5,54.6 -6.2,55.3 -7.3,55.4 -8.5,55.1 -8.6,54.3 -10.1,54.2 -9.9,53.4 -9.4,52.6 -10.4,51.9 -9.8,51.5 -8.4,51.6 -7,52.1',
      '-24,65.5 -22,66.4 -18.5,66.2 -14.6,66.3 -13.6,65.1 -14.9,64.3 -18,63.4 -20.5,63.7 -22.7,63.8 -21.9,64.6 -24,64.9',
      '12.4,37.8 13.4,38.2 15.6,38.3 15.1,36.7 14.3,37 12.6,37.6',
      '8.4,39.1 8.2,40.9 9.2,41.2 9.7,40.1 9.6,39.1 8.9,39',
      '8.6,41.4 9.3,41.4 9.5,43 8.7,42.6',
      '23.5,35.3 26.3,35.3 26.2,35 24,35',
      '10.9,55.7 11,55.2 12.1,55 12.6,55.7 12.5,56.1 11.8,55.9',
    ] },
  { id: 'asia', name: ru`Азия`, label: [95, 50], myths: ['china', 'japan', 'slavic', 'egypt'],
    text: ru`От Уральских гор до Тихого океана. Отсюда родом небесные драконы Китая, а Сибирь и Средняя Азия — края славянских духов.`,
    polys: [
      '66,69 66.5,70.8 69,73 72,72.5 75,72.3 80,73.5 87,75 95,76 104,77.7 113,73.7 120,73 127,73.5 132,71.3 140,72.5 150,71.5 160,69.7 170,70 178,69.5 179.8,68.9 179.8,65 177.5,64.7 174,61.8 170,60 166,59.8 163.5,59.9 163.3,58 162,56.3 159.5,53 156.7,51 156.1,52.5 156.3,55.5 157.5,57.5 160,60.5 161,62 156,61.8 151,59.5 143,59.3 140.5,58 137,54.5 135,54.5 138.2,53.6 141.2,52.9 140.4,50.2 140,48.3 138,46 135,43.5 132,43 130.7,42.3 129.8,41.5 129.4,40 128.4,38.6 129.4,36 129.3,35.2 127.5,34.6 126.3,34.5 126.5,35.8 126.6,37.5 125.3,37.7 125.1,38.8 124.3,39.9 122.2,40.4 121.2,38.8 121.5,40.9 119.5,39.8 117.8,39 118.9,37.5 120.5,37.4 122.6,37.4 120.3,36 119.2,34.8 120.9,32.1 121.9,31.2 121.9,30.2 122,29 121,27.7 119.6,25.5 118.1,24.5 116.5,23.3 114.2,22.3 113.5,22.2 111,21.4 110.2,20.3 109.7,21.6 108,21.5 106.7,20.7 105.8,19 106.6,17.4 108.3,16.1 109.2,13.8 109.2,12 107.6,10.5 106.7,10.3 105,8.6 104.8,10.2 103.5,10.6 102.3,12.2 100.9,12.7 100.5,13.5 99.9,12.5 99.2,10.3 100.3,8.5 100.6,7 102.2,6.2 103.4,4.2 104.3,1.5 103.9,1.25 103.6,1.3 102,2.5 100.4,4.8 100.3,6.5 98.4,7.9 98.6,10 98.5,12.5 97.6,16.5 95,15.8 94.3,16 94.6,18.5 92.9,20.5 92.2,21.5 91.8,22.4 90.5,22 89,21.7 87.2,21.5 86.9,20.4 85.3,19.6 84,18.3 82.3,16.6 80.3,15.3 80.3,13.1 79.8,11 79.3,10.3 78.2,8.5 77.5,8.1 76.3,9.9 75,12.9 73.8,15.6 72.8,19 72.6,21.3 72.2,22.3 71,20.7 69,22.3 70.4,23 68.8,23.8 67.1,24.8 66.5,25.4 62,25.2 58.8,25.5 57.3,26.8 56.3,27.1 54.5,26.6 52,27.8 50.8,28.9 50,30 48,29.9 48,29.3 49.6,27 50.2,26.2 50.8,25.6 51.2,26.1 51.6,25.3 51,24.6 52.6,24.2 54.4,24.5 55.3,25.3 56.1,26.1 56.3,24.8 57.8,23.7 58.6,23.6 59.8,22.5 58.8,20.7 57.8,19 56.8,18.1 55,17 52.2,15.6 49.1,14.5 45,12.8 43.5,12.7 42.7,15 42.6,16.8 41,19.5 39.2,21.5 38.1,24.1 36.5,26 35,28.1 34.9,29.5 34.2,31.3 34.5,31.6 34.8,32.1 35.1,33.1 35.5,33.9 35.8,34.8 35.9,35.9 36.2,36.6 35.5,36.6 34.6,36.8 32.8,36.1 30.6,36.8 29.1,36.6 27.4,37 26.3,38.3 27.1,38.4 26.6,39.4 26.2,39.9 26.5,40.2 27.5,40.4 29,40.4 29.9,40.7 29.1,41 29.2,41.2 31,41.1 33,42 35.2,42 37,41.1 39.7,41 41.6,41.6 41.6,42.6 40,43.4 41.5,43.3 43.5,43.2 46,42.5 48.5,41.8 49.5,40.4 50.3,40.4 49,39 48.9,38.4 50,37.4 51.5,36.8 53.9,36.9 53.9,39 53,40 52.8,41.5 52.5,42.8 51.3,43.2 50.3,44.5 51.5,45.5 53,46.8 51.8,47 51.5,49.5 55,51.2 58.8,52 59.2,55 59.5,58 59,61 59.5,65 60,68',
      '130.9,34.3 132.5,35.4 135,35.7 136,36.3 136.8,37.3 138.5,37.4 139.5,38.3 140,39.8 140,40.8 141.4,41.4 141.9,39.9 141.6,38.3 141,37 140.8,35.7 139.8,35 139.1,35.2 138.9,34.6 137.3,34.6 136.8,34.3 135.8,33.4 135.1,34.3 135.3,34.6 133.5,34.4 132.2,33.9',
      '129.6,33.3 130.9,33.9 131.9,32.9 131.4,31.4 130.5,31 130.1,32.5 129.8,32.8',
      '132,33.3 132.6,32.8 134.2,33.3 134.7,34.2 133,34.2',
      '140,41.4 141.2,41.8 143.3,42 145.7,43.3 145.3,44.3 141.9,45.5 141.6,43.8 140.3,43.2 140,42.3',
      '142,46 143.5,46.8 143.1,49.2 144,51.5 143,54.3 142.2,53.5 142.2,51 141.9,48.5',
      '120.1,23 121,25.2 121.9,25 121.5,23 120.7,21.9',
      '108.6,19.2 110,20.1 111,19.6 109.6,18.2',
      '79.8,8 80.2,9.8 81.3,8.5 81.9,7 81,6 80.1,6.1',
      '120,16 120.6,18.5 122.2,18.5 122,16.3 124,13.8 123.3,13 121.7,13.9 120.6,14.2',
      '122,7 124,8.2 125.4,9.8 126.6,7 125.4,5.6 124,6.3 123.5,7.8',
      '109.6,2 109.6,-1 110.3,-2.9 114.5,-3.8 116.3,-3.9 116,-1.5 117.9,1 119,5.2 117,7 115.4,5 113,3.1 111,1.7',
      '95.3,5.6 98,4 100.4,2.1 103.7,-1 106,-3.2 105.8,-5.8 104.5,-5.9 101.4,-3 98.7,0 97,2.2',
      '105.2,-6.8 106.8,-6 108.3,-6.3 110.4,-6.9 112.6,-6.9 114.4,-7.8 114.4,-8.6 111,-8.2 108,-7.8 105.9,-6.9',
      '119.4,-5.6 120.5,-5.6 120.4,-2.9 121.3,-4.8 122.8,-4.5 121.4,-1.9 123.3,-0.9 121.8,-0.8 121,0.5 124.9,1.5 125,0.8 120.5,0.3 119.8,-0.6 119.4,-3.4',
      '32.3,34.7 33,34.6 34,35 34.6,35.7 33,35.4 32.3,35.1',
    ] },
  { id: 'africa', name: ru`Африка`, label: [21, 6], myths: ['egypt'],
    text: ru`Здесь, у Нила, стоят врата Дуата — родины египетских богов и духов пустыни.`,
    polys: [
      '34.2,31.3 32.3,31.3 29.9,31.2 28,31 25.2,31.6 23.9,32.1 22,32.9 20.1,32.1 19.5,30.3 17,31 15.3,32.3 13.2,32.9 11.1,33.2 10.1,34.2 11.1,35.2 10.6,36.4 11,37 10.2,37.2 9.8,37.3 8.6,36.9 5,36.8 3,36.8 -0.6,35.7 -2,35.1 -4,35.2 -5.4,35.9 -6,35.8 -6.8,34 -7.6,33.6 -9.2,32.5 -9.8,30.4 -11.5,28.2 -13,27.6 -14.8,26 -16,23.7 -17.1,21 -16.3,19.5 -16,18 -16.5,16 -17.5,14.7 -16.8,13.5 -16.7,12.4 -15,11 -13.7,9.5 -13.2,8.5 -11.5,6.9 -9.4,5.3 -7.5,4.4 -5,5.1 -2,4.8 0,5.5 1.2,6.1 2.4,6.35 3.4,6.4 4.9,6.3 6,4.3 7,4.4 8.5,4.5 9.2,3.9 9.8,2 9.4,0.4 8.8,-0.7 9.9,-2.9 11.8,-4.8 12.3,-6 13.2,-8.8 13.6,-12.4 12.3,-15 11.8,-17.3 12.6,-19 14.5,-22.9 15.2,-26.6 16.5,-28.6 17.9,-31.5 18.3,-33.3 18.4,-34.3 20,-34.8 22.1,-34.2 25.6,-34 27.9,-33 30,-31.3 31,-29.9 32.4,-28.6 32.9,-26 35.5,-24 35.5,-21.5 34.8,-19.8 36.9,-17.9 40,-16.2 40.7,-14.5 40.5,-10.5 39.3,-6.8 39.7,-4 41.6,-1.7 43.5,0.5 45.3,2 48,5 49.8,8.5 51.3,11.8 49,11.3 45,10.4 43.2,11.6 43.3,12.6 41.7,13.9 39.5,15.6 38.5,18 37.2,19.6 36.5,22 35.5,23.9 34,26.1 32.6,29.9 33.6,28.2 34.3,27.7 34.9,29.5',
      '49.3,-12 50.2,-14.5 50.5,-15.9 49.6,-17 48,-21 47,-25 45.2,-25.6 43.7,-23.4 43.6,-21 44.2,-19.5 44,-17 46.3,-15.6 47.8,-14 48.9,-12.3',
    ] },
  { id: 'namerica', name: ru`Северная Америка`, label: [-101, 47], myths: ['aztec'],
    text: ru`Земля пернатых змеев: из долины Мехико вышли ацтекские боги и духи.`,
    polys: [
      '-168,65.6 -166,68.9 -162,70.2 -156.8,71.3 -152,70.8 -145,70.1 -139,69.6 -133,69.4 -128,70.2 -120,69.3 -114,68.2 -108,68.3 -100,67.8 -95,68.5 -90,68.5 -85,69.8 -84,69.5 -81.5,68 -82,66.8 -86,64.5 -88.5,64 -93.5,61.5 -94.2,58.8 -92,57.1 -88.5,56.5 -85,55.3 -82.3,55.1 -82,53 -80.5,51.3 -79,51.5 -78.8,54 -77,55.5 -77.5,58.5 -78,60.8 -77.5,62.5 -74,62.2 -71,61.2 -69.5,59 -67,58.4 -64.5,60.3 -62,57.5 -60,55.3 -57.3,54 -55.8,52 -57.5,51.4 -60,50.3 -64,50.2 -66.5,49.8 -68.5,48.9 -70.5,47.3 -68,48.6 -64.2,48.8 -65,47.9 -64.7,46.3 -64,46 -61,45.5 -60,46 -61.5,45.1 -63.6,44.6 -65.7,43.5 -66,44.7 -67,44.8 -69,44 -70.3,43.6 -70.6,42.6 -70,41.8 -71.5,41.4 -73.5,40.9 -74,40.6 -74,39.7 -75,38.8 -75.5,37.9 -76,37 -75.5,35.3 -77,34.5 -78.9,33.7 -80,32.7 -81.2,31.5 -81.4,30.3 -80.5,28.4 -80.1,26.7 -80.2,25.7 -81.1,25.1 -81.8,26.1 -82.7,27.8 -83,29.1 -84.3,30 -85.4,29.7 -87.2,30.4 -88,30.4 -89.4,30.2 -89.4,29 -90.2,29.1 -91.5,29.4 -93.8,29.7 -94.8,29.3 -97.2,27.8 -97.4,26 -97.7,24 -97.8,22.2 -97.2,20.5 -96.1,19.2 -94.5,18.2 -92.4,18.6 -91.5,18.5 -90.7,19.8 -90.3,21 -88,21.5 -86.8,21.2 -87.4,19.5 -88.2,17.9 -88.3,16.3 -88.8,15.8 -86,15.9 -84,15.8 -83.2,15 -83.6,13 -83.8,11 -83,10 -81.5,9 -79.9,9.35 -78.5,9.4 -77.4,8.6 -77.9,7.2 -78.4,8 -79.5,8.9 -80.4,8 -80.4,7.3 -81.8,8.1 -83.6,8.4 -85.8,10 -85.7,11.1 -87.3,12.9 -89.8,13.5 -91.8,14.4 -93.5,15.8 -94.8,16.2 -96.5,15.7 -98.5,16.4 -99.9,16.8 -101.8,17.6 -104.3,19.1 -105.7,20.4 -105.3,21.6 -106.4,23.2 -108,25 -109.5,26.8 -111,27.9 -112.8,30 -114.8,31.8 -114.3,30 -112.9,28.5 -111.3,26 -110.3,24.2 -109.9,22.9 -111.8,24.5 -112.2,26 -114,27.7 -115,28.5 -116.1,30.5 -117.1,32.5 -118.4,33.8 -120.6,34.6 -121.9,36.6 -122.5,37.8 -123.8,39.4 -124.4,40.4 -124.2,43 -124,46.2 -124.7,48.4 -123,48.3 -122.8,49 -125,50.5 -127.9,51 -128,52 -130,54.3 -133,56.5 -135.5,58.2 -139,59.6 -144,60 -146.5,60.9 -149.9,61.2 -151.5,59.2 -154,58 -157,56.9 -162,55.1 -164.8,54.4 -161,56.5 -158.2,58.7 -162,58.6 -164.8,60.4 -165.4,62.2 -164.5,63.5 -161,64.6 -165.4,64.5',
      '-73,78 -66,76 -58,75.5 -55,71 -53.5,69 -51.5,65 -49,62 -45,60 -43,60.2 -40,64 -35,66 -26,68.5 -22,70.5 -21.5,73 -18.5,77 -12,81.5 -30,83.5 -50,82.5 -62,81.5 -68,80',
      '-80,73.7 -73,71.5 -67,69.4 -61.9,66.7 -65,63 -68.5,62.5 -72.5,63.8 -77.5,65.3 -73.5,67.6 -79,69.5 -86,70.5 -88.5,73.4',
      '-118,70 -110,68.8 -101,69 -101,72 -107,73.3 -115,73.3 -119,72',
      '-125,72 -120,71.5 -117,73 -120,74.3 -124,74',
      '-90,77 -78,76 -74,78.5 -62,82 -70,83 -90,82',
      '-84.95,21.86 -82.4,23.15 -80.2,23.15 -77.3,21.9 -74.2,20.25 -75.8,19.9 -77.7,19.85 -78.6,21.5 -81.6,22.2 -83.2,22',
      '-74.4,18.4 -72.8,19.9 -70,19.7 -68.3,18.6 -70,18.2 -71.7,17.8',
      '-78.3,18.4 -76.3,18.2 -76.8,17.9 -78.2,18.2',
      '-67.2,18.5 -65.6,18.4 -65.7,18 -67.2,18',
      '-128.4,50.8 -125,50 -123.3,48.4 -124.8,48.6 -126.5,49.5',
      '-59.3,47.6 -55.4,51.6 -53,49.5 -52.7,47.5 -54,46.8 -56,47.6',
    ] },
  { id: 'samerica', name: ru`Южная Америка`, label: [-60, -12], myths: ['aztec'],
    text: ru`Сельва, Анды и Амазонка. Ацтекские духи разлетелись и сюда — до самой Огненной Земли.`,
    polys: [
      '-77.4,8.6 -76,9.3 -75.5,10.4 -74.8,11 -73,11.5 -71.3,12.4 -71.6,10.8 -70.2,11.6 -68.4,10.5 -66.9,10.6 -64.2,10.6 -62,10.7 -61,9 -60.5,8.5 -58.2,6.8 -55.2,5.9 -52.3,4.9 -51,4 -50,1.8 -50,0 -48.5,-1.4 -44.3,-2.5 -41.5,-2.9 -38.5,-3.7 -35.2,-5.8 -34.8,-7.1 -35,-9 -37,-11 -38.5,-13 -39,-16 -40,-19.8 -41,-22 -42,-22.9 -43.2,-23 -45,-23.6 -46.3,-24 -48.5,-26.5 -48.6,-28.5 -50,-30.5 -51,-31.8 -52.1,-32.2 -53.4,-33.7 -54.9,-34.9 -56.2,-34.9 -57.8,-34.45 -58.5,-34.4 -58.33,-34.62 -58.2,-34.75 -57.1,-35.4 -56.7,-36.3 -57.5,-38 -60,-38.8 -62.3,-38.8 -62.2,-40.6 -65,-41 -65,-42.5 -64.2,-42.8 -65.5,-44.5 -67.5,-46 -67.5,-46.5 -65.8,-47.8 -68.3,-50.1 -69.2,-51.6 -68.4,-52.4 -68.6,-53 -66.5,-54.5 -68.3,-54.8 -67.3,-55.9 -71,-54.5 -73,-53 -75.5,-50 -75.5,-46.5 -74,-43.5 -74,-42 -73.6,-40 -73.5,-37 -71.7,-33 -71.5,-30 -70.6,-27 -70.4,-23.6 -70.2,-20.2 -70.3,-18.4 -71.4,-17.6 -74,-15.8 -76.3,-13.7 -77.1,-12 -78.8,-8.8 -79.9,-6.8 -81.3,-4.7 -80.4,-3.4 -80,-2.2 -81,-1 -80.1,0.8 -78.9,1.8 -77.4,3.9 -77.5,6 -77.9,7.2',
    ] },
  { id: 'oceania', name: ru`Австралия и Океания`, label: [134, -25], myths: [],
    text: ru`Своих мифологий у Ордена здесь пока нет: все духи Австралии и Океании — гости, которых занесла Перепутица.`,
    polys: [
      '114,-21.8 116.8,-20.6 118.6,-20.3 121.1,-19.4 122.2,-18 123.6,-16.5 125,-15 126.9,-13.9 128.1,-15.1 129.6,-14.9 130.3,-12.9 130.8,-12.4 132.6,-11.5 135.9,-12.2 136.8,-12.2 136,-13.4 135.4,-15 138,-16.8 140.8,-17.5 141.5,-15 141.6,-12.5 142.5,-10.7 143.5,-12.8 145.3,-15 145.8,-16.9 146.8,-19.2 148.8,-20.3 150.2,-22.2 151.3,-23.8 153.1,-25.3 153.2,-27.5 153.6,-28.6 152.9,-31.4 151.2,-33.9 150.2,-36 150,-37.5 147.5,-37.9 146.4,-39.1 144.9,-37.8 143.5,-38.8 140.9,-38.1 139.7,-37.2 138.1,-35.6 138.5,-34.9 138,-34.2 137.6,-35.1 137.4,-34 137.8,-32.5 136.3,-34 135.9,-34.8 134.2,-32.9 131.2,-31.5 128,-32.2 124,-33 121.9,-33.9 118,-35 115.1,-34.4 115.7,-33.3 115.8,-32 115,-29.5 113.5,-26.5 113.6,-24',
      '144.6,-40.7 148.3,-40.9 148.3,-42.2 147.3,-43.3 146,-43.6 145.2,-42.2',
      '172.7,-34.4 174.3,-35.9 175.9,-37.3 178.5,-37.7 177.9,-39.1 176.9,-39.6 176,-41.4 175.3,-41.6 174.6,-41.35 174.6,-39.9 173.8,-39.2 174.6,-37.3 173.5,-35.6',
      '172.7,-40.5 174.3,-41.7 173.3,-43 172.9,-43.8 171.2,-44.4 170.6,-45.9 169,-46.6 166.5,-46 168,-44.3 170.8,-42.7 172.1,-41.1',
      '131,-1.4 134,-0.9 136,-2.2 138,-1.6 141,-2.6 145.8,-4.9 147.5,-6.2 148,-8 150.2,-10.4 147.2,-9.5 144,-7.8 142.8,-9.2 141,-9.1 138.5,-8.3 137.5,-5 135,-4.4 132.8,-4 132,-2.8',
      '164,-20.2 165.5,-21 167,-22.3 166.4,-22.3 164.3,-20.8',
    ] },
  // шутка: сюда Врата не открываются
  { id: 'antarctica', name: ru`Антарктида`, label: [75, -76], myths: [], cold: true,
    text: ru`Здесь только пингвины и ледяные духи. Врата сюда не открываются — слишком холодно даже для Ловчих.`,
    polys: ['-180,-78 -160,-78 -150,-76.5 -130,-74.5 -110,-74 -95,-72.5 -80,-73 -75,-71 -68,-67 -65,-65 -57,-63.3 -60,-66 -62,-70 -60,-74 -45,-77.8 -30,-77.5 -20,-73.5 -10,-71 0,-70 20,-70 40,-69 55,-66.5 70,-68 75,-69.5 90,-66.5 110,-66.2 130,-66.2 150,-68.5 165,-71 170,-72 180,-78'] },
];


const LORE = [
  ru`Миров духов всегда было много — у каждого народа свой: Навь у славян, царство Аида у греков, Асгард у скандинавов, холмы сидов у кельтов, Дуат у египтян, Небеса у китайцев, Миктлан у ацтеков. На местах их держал <b>Алатырь</b> — бел-горюч камень в середине всех миров. Каждые врата вели в свою землю, и духи не путали дорог.`,
  ru`Однажды осенней ночью Кощей Бессмертный решил спрятать свою смерть понадёжнее — прямо в сердце Алатыря. Камень треснул и раскололся. Все врата распахнулись разом, дороги между мирами спутались в клубок, и духи и боги семи мифологий высыпали в наш мир — кто куда. Эту ночь назвали <b>Перепутицей</b>. Кощей уверяет, что камень треснул сам, но Локи и Сунь Укун при этих словах почему-то хихикают.`,
  ru`Теперь Гиппокамп плещется в московском фонтане, Леший гуляет по токийскому парку, а Ниссе греет котов в подъездах Каира. Любого духа можно встретить в любом уголке земли. Разломы — трещины от расколотого камня — открываются в каждом городе, а боги ставят святилища там, где осели: Капище по соседству с Пагодой, Храм через улицу от Пирамиды. Город рождает и своих, новых духов: Вайфайку, Трамвайника, Фонарника.`,
  ru`Первыми с гостями поладили не учёные, а бабушки со своими оберегами: оказалось, оберег, сделанный с заботой, успокаивает любого духа, откуда бы тот ни был. Так появился <b>Орден Оберега</b> — союз Ловчих всех земель. Твоя задача — находить духов, ловить их оберегами, черпать силу из источников, закрывать разломы и собирать осколки Алатыря. Кто знает — может, однажды их хватит, чтобы распутать дороги домой.`,
];

/* ---------- Погода: усиливает стихии ---------- */
const WEATHER = {
  clear:    { name: ru`Ясно`,                   boost: ['fire', 'forest'] },
  partly:   { name: ru`Переменная облачность`,  boost: ['wind', 'forest'] },
  overcast: { name: ru`Пасмурно`,               boost: ['shadow', 'current'] },
  fog:      { name: ru`Туман`,                  boost: ['shadow', 'water'], fx: 'fog' },
  rain:     { name: ru`Дождь`,                  boost: ['water', 'current'], fx: 'rain' },
  snow:     { name: ru`Снег`,                   boost: ['wind', 'water'], fx: 'snow' },
  storm:    { name: ru`Гроза`,                  boost: ['current', 'shadow'], fx: 'rain' },
  windy:    { name: ru`Ветрено`,                boost: ['wind', 'fire'], fx: 'wind' },
};
const MOON_EVENTS = {
  full: { name: ru`Полнолуние`, desc: ru`Ночью духи Тени и Воды встречаются чаще, а Русалки и Навки выходят к людям.` },
  new:  { name: ru`Новолуние`,  desc: ru`В безлунную ночь сияющие духи встречаются вдвое чаще.` },
};

/* ---------- Знаки Ордена (медали) ---------- */
// xp — разовая награда за ступень знака (без дневного потолка); 5.1.21: серебро и золото ×10, бронза ×2 (было 500 / 1 500 / 5 000):
// лёгкие бронзы (5 видов в бестиарии, 3 духа других мифологий, 10 поимок) по 5 000 поднимали новичка до 9-го уровня за 10 минут
const MEDAL_TIERS = [
  { name: ru`Бронза`, color: '#d97706', xp: 1000 },
  { name: ru`Серебро`, color: '#cbd5e1', xp: 15000 },
  { name: ru`Золото`, color: '#fbbf24', xp: 50000 },
];
const MEDALS = [
  { id: 'catcher', name: ru`Ловчий`,        desc: ru`Поймай духов`,                 stat: 'caught',      tiers: [10, 100, 1000] },
  { id: 'walker',  name: ru`Странник`,      desc: ru`Пройди километров`,            stat: 'km',          tiers: [10, 100, 1000] },
  { id: 'springs', name: ru`Водонос`,       desc: ru`Зачерпни силы из источников`,    stat: 'springs',     tiers: [30, 300, 2000] },
  { id: 'raids',   name: ru`Затворник`,     desc: ru`Закрой разломов`,              stat: 'raids',       tiers: [3, 30, 200] },
  { id: 'dex',     name: ru`Летописец`,     desc: ru`Видов духов в бестиарии`,      stat: 'dex',         tiers: [5, 20, SPECIES.filter(s => s.myth === 'slavic').length] },
  { id: 'myths',   name: ru`Странник миров`, desc: ru`Видов духов других мифологий`, stat: 'myths',       tiers: [3, 25, 80] }, // 4.28
  { id: 'purify',  name: ru`Очиститель`,    desc: ru`Победи прислужников Нави`,     stat: 'invasions',   tiers: [3, 30, 200] },
  { id: 'trade',   name: ru`Щедрая душа`,   desc: ru`Купи или продай духов на Аукционе`,     stat: 'traded',      tiers: [1, 10, 50] },
  { id: 'throws',  name: ru`Меткий глаз`,   desc: ru`Отличных бросков`,             stat: 'throwsGreat', tiers: [20, 200, 1000] },
  { id: 'hatch',   name: ru`Наседка`,       desc: ru`Вылупи духов из коконов`,      stat: 'hatched',     tiers: [3, 30, 200] },
  { id: 'evolve',  name: ru`Алхимик`,       desc: ru`Преврати духов`,               stat: 'evolved',     tiers: [3, 30, 200] },
  { id: 'shiny',   name: ru`Искатель сияния`, desc: ru`Поймай сияющих духов`,       stat: 'shiny',       tiers: [1, 10, 50] },
  { id: 'streak',  name: ru`Верность`,      desc: ru`Дней подряд в игре`,           stat: 'streakBest',  tiers: [7, 30, 100] },
  { id: 'order',   name: ru`Соратник`,      desc: ru`Очков в общем деле Ордена`,    stat: 'orderPts',    tiers: [100, 1000, 10000] },
  // 4.28: сезоны Алатыря, в которых Ловчий принёс в общий камень не меньше SeasonRewards.MEDAL_MIN осколков (считает SeasonRewards.grant)
  { id: 'alatyr',  name: ru`Хранитель Алатыря`, desc: ru`Сезонов Алатыря, где ты принёс 5+ осколков`, stat: 'alaSeasons', tiers: [1, 3, 10] },
  { id: 'lands',   name: ru`Землепроходец`, desc: ru`Поймай духов родных земель`,   stat: 'lands',       tiers: [1, 3, 7] },
  { id: 'el_fire',    name: ru`Истопник`,   desc: ru`Поймай духов Огня`,            stat: 'el:fire',     tiers: [10, 50, 200] },
  { id: 'el_water',   name: ru`Лодочник`,   desc: ru`Поймай духов Воды`,            stat: 'el:water',    tiers: [10, 50, 200] },
  { id: 'el_forest',  name: ru`Лесничий`,   desc: ru`Поймай духов Леса`,            stat: 'el:forest',   tiers: [10, 50, 200] },
  { id: 'el_wind',    name: ru`Мельник`,    desc: ru`Поймай духов Ветра`,           stat: 'el:wind',     tiers: [10, 50, 200] },
  { id: 'el_current', name: ru`Монтёр`,     desc: ru`Поймай духов Тока`,            stat: 'el:current',  tiers: [10, 50, 200] },
  { id: 'el_shadow',  name: ru`Полуночник`, desc: ru`Поймай духов Тени`,            stat: 'el:shadow',   tiers: [10, 50, 200] },
];


const SHINY_RATE = 1 / 128;

/* ---------- События недели (меняются каждый понедельник) ---------- */
const WEEK_EVENTS = [
  { id: 'fire',    name: ru`Неделя Огня`,       el: 'fire' },
  { id: 'stars',   name: ru`Звездопад`,         xp: 2,  desc: ru`Двойной опыт за всё: поимку, источники, разломы и поединки.` },
  { id: 'water',   name: ru`Неделя Воды`,       el: 'water' },
  { id: 'springs', name: ru`Неделя источников`, loot: 2, cooldown: 3, desc: ru`Источники дают вдвое больше предметов и восстанавливаются за 3 минуты.` },
  { id: 'forest',  name: ru`Неделя Леса`,       el: 'forest' },
  { id: 'nav',     name: ru`Навья неделя`,      el: 'shadow', shiny: 2, desc: ru`Духи Тени повсюду, а сияющие встречаются вдвое чаще.` },
  { id: 'duels',   name: ru`Неделя поединков`,  duel: 2, desc: ru`Хранители капищ дают двойную награду.` },
  { id: 'wind',    name: ru`Неделя Ветра`,      el: 'wind' },
  { id: 'cocoons', name: ru`Неделя коконов`,    km: 2, desc: ru`Шаги для коконов и спутника считаются вдвое, коконы в источниках попадаются вдвое чаще.` },
  { id: 'current', name: ru`Неделя Тока`,       el: 'current' },
  { id: 'rifts',   name: ru`Неделя разломов`,   rifts: true, desc: ru`Великие разломы открываются втрое чаще, за победу — +3 оберега разлома.` },
];
WEEK_EVENTS.forEach(e => { if (e.el && !e.desc) e.desc = ru`Духи стихии «${ELEMENTS[e.el].name}» встречаются в 2,5 раза чаще и чаще охраняют разломы.`; });

/* ---------- Капища и хранители ---------- */
const SHRINE_GODS = [ru`Перуна`, ru`Велеса`, ru`Мокоши`, ru`Сварога`, ru`Даждьбога`, ru`Стрибога`, ru`Ярилы`, ru`Лады`, ru`Хорса`, ru`Рода`];
const GUARDIANS = [ru`Ярослава`, ru`Мирон`, ru`Всеслав`, ru`Любава`, ru`Добрыня`, ru`Злата`, ru`Ратибор`, ru`Василиса`, ru`Святогор`, ru`Забава`, ru`Остромир`, ru`Милена`];
/* 4.28: Разломы и Капища других мифологий — интерфейс тот же, свои значок (js/places-art.js), название, описание и боги святилищ
   (имена богов — в родительном падеже: «Храм Зевса»). Мифология места — W.placeMyth */
const MYTH_PLACES = {
  slavic: { rift: ru`Разлом`, riftDesc: ru`Портал в Навь: из него вышел сильный дух. Закрой разлом, пока не прошёл час.`,
    shrine: ru`Капище`, shrineOf: g => ru`Капище ${g}`, shrineDesc: ru`Святилище древних богов. Победи хранителя — и твой клан сможет держать капище.`, gods: SHRINE_GODS, guards: GUARDIANS },
  greek: { rift: ru`Врата Аида`, riftDesc: ru`Трещина в подземное царство Аида: оттуда вырвался сильный дух. Закрой врата, пока не прошёл час.`,
    shrine: ru`Храм`, shrineOf: g => ru`Храм ${g}`, shrineDesc: ru`Мраморный храм богов Олимпа. Победи хранителя — и твой клан сможет держать храм.`,
    gods: [ru`Зевса`, ru`Геры`, ru`Афины`, ru`Аполлона`, ru`Артемиды`, ru`Гермеса`, ru`Посейдона`, ru`Деметры`, ru`Гефеста`, ru`Афродиты`],
    guards: [ru`Ариадна`, ru`Леонид`, ru`Елена`, ru`Ясон`, ru`Кассандра`, ru`Никос`] },
  norse: { rift: ru`Разлом Гиннунгагап`, riftDesc: ru`Трещина в первозданную бездну, где лёд встречает пламя: оттуда вышел могучий дух. Закрой разлом, пока не прошёл час.`,
    shrine: ru`Рунный камень`, shrineOf: g => ru`Рунный камень ${g}`, shrineDesc: ru`Резной камень с рунами в честь богов Асгарда. Победи хранителя — и твой клан сможет держать камень.`,
    gods: [ru`Одина`, ru`Тора`, ru`Фрейи`, ru`Фрейра`, ru`Бальдра`, ru`Тюра`, ru`Хеймдалля`, ru`богини Фригг`, ru`Браги`, ru`богини Идунн`],
    guards: [ru`Сигрид`, ru`Бьорн`, ru`Астрид`, ru`Лейф`, ru`Ингрид`, ru`Рагнар`] },
  celtic: { rift: ru`Холм сидов`, riftDesc: ru`Холм распахнулся в Иной мир волшебного народа: оттуда вышел сильный дух. Закрой проход, пока не прошёл час.`,
    shrine: ru`Каменный круг`, shrineOf: g => ru`Каменный круг ${g}`, shrineDesc: ru`Кольцо стоячих камней, где друиды встречали солнце. Победи хранителя — и твой клан сможет держать круг.`,
    gods: [ru`Дагды`, ru`Луга`, ru`Бригиты`, ru`богини Морриган`, ru`Мананнана`, ru`Цернунна`, ru`Эпоны`, ru`богини Дану`, ru`Огмы`],
    guards: [ru`Финн`, ru`Ниам`, ru`Кухулин`, ru`Мэйв`, ru`Эйдан`, ru`Бранвен`] },
  egypt: { rift: ru`Врата Дуата`, riftDesc: ru`Врата в Дуат, царство за закатом, открылись: из них вышел древний дух. Закрой врата, пока не прошёл час.`,
    shrine: ru`Обелиск`, shrineOf: g => ru`Обелиск ${g}`, shrineDesc: ru`Обелиск с иероглифами в честь богов Египта. Победи хранителя — и твой клан сможет держать обелиск.`,
    gods: [ru`бога Ра`, ru`Осириса`, ru`Исиды`, ru`Гора`, ru`Тота`, ru`Анубиса`, ru`богини Бастет`, ru`богини Хатхор`, ru`Птаха`, ru`богини Маат`],
    guards: [ru`Нефер`, ru`Аменхет`, ru`Мерит`, ru`Ками`, ru`Сенеб`, ru`Иси`] },
  china: { rift: ru`Небесные врата`, riftDesc: ru`Небесные врата приоткрылись среди облаков: с небес спустился сильный дух. Закрой врата, пока не прошёл час.`,
    shrine: ru`Пагода`, shrineOf: g => ru`Пагода ${g}`, shrineDesc: ru`Многоярусная пагода с фонарями в честь небесных стражей. Победи хранителя — и твой клан сможет держать пагоду.`,
    gods: [ru`Лазурного дракона`, ru`Белого тигра`, ru`Красной птицы`, ru`Чёрной черепахи`, ru`Цилиня`, ru`Фэнхуана`, ru`Нюйвы`, ru`Фуси`, ru`Пань-гу`],
    guards: [ru`Ли Мин`, ru`Мэйлин`, ru`Вэй`, ru`Лань`, ru`Чжан Юнь`, ru`Сяо Лун`] },
  aztec: { rift: ru`Врата Миктлана`, riftDesc: ru`Проход в Миктлан, подземное царство, открылся в камне: оттуда вышел сильный дух. Закрой врата, пока не прошёл час.`,
    shrine: ru`Пирамида`, shrineOf: g => ru`Пирамида ${g}`, shrineDesc: ru`Ступенчатая пирамида древних богов. Победи хранителя — и твой клан сможет держать пирамиду.`,
    gods: [ru`Кецалькоатля`, ru`Тлалока`, ru`бога Уицилопочтли`, ru`богини Шочикецаль`, ru`бога Тонатиу`, ru`Эекатля`, ru`богини Чальчиуитликуэ`, ru`Сентеотля`],
    guards: [ru`Ицель`, ru`Куаутемок`, ru`Шочитль`, ru`Тонали`, ru`Ситлали`, ru`Некали`] },
};
// 4.28: Разломы и святилища мифологий следующих сезонов — из MYTH_META (чего нет — как у славянских)
for (const [k, m] of Object.entries(globalThis.MYTH_META || {})) {
  if (MYTH_PLACES[k] || !MYTHS[k] || !m || typeof m !== 'object') continue;
  const S0 = MYTH_PLACES.slavic, list = (a, d) => (Array.isArray(a) && a.length ? a : d);
  MYTH_PLACES[k] = { rift: m.rift || S0.rift, riftDesc: m.riftDesc || S0.riftDesc, shrine: m.shrine || S0.shrine,
    shrineOf: typeof m.shrineOf === 'function' ? m.shrineOf : g => `${m.shrine || S0.shrine} ${g}`, shrineDesc: m.shrineDesc || S0.shrineDesc,
    gods: list(m.gods, S0.gods), guards: list(m.guards, S0.guards) };
}
const GUARD_COLORS = ['#dc2626', '#2563eb', '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#ca8a04', '#db2777'];
/* ---------- Кланы: Капища под знаменем ----------
   3.5: три дружины (сокол, медведь, волк). 4.28: клан — это мифология: ключ клана = ключ мифологии (MYTHS), открыт клан
   только открытой мифологии (MYTH_KEYS — mythOpen), клан следующего сезона показывается как «?». name — название,
   short — коротко (знак на карте, в списках; у прежних трёх — тот же зверь), member — звание участника, motto — девиз,
   desc — кто они в Перепутицу, crest — зверь на гербе (Art.clanCrest), color — цвет знамени (от цвета мифологии, но
   различимый на карте). Мифология следующих сезонов приносит свой клан в MYTH_META[ключ].clan = { name, short, member,
   motto, desc, crest, color } — чего нет, берётся по умолчанию. */
const CLAN_META = {
  slavic: { name: ru`Дружина Перуна`,   short: ru`Сокол`,    member: ru`дружинник`,  motto: ru`Быстрота и отвага`, crest: 'falcon', color: '#f97316',
    desc: ru`Наследники княжеских дружин под знаком сокола-Рарога. Когда Кощей расколол Алатырь, они первыми встали у Капищ и держат Навь громом Перуна.` },
  greek:  { name: ru`Фаланга Олимпа`,   short: ru`Сова`,     member: ru`гоплит`,     motto: ru`Щит к щиту`, crest: 'owl', color: '#3b82f6',
    desc: ru`Ловчие, что сомкнули щиты под знаком совы Афины. В Перепутицу они стерегут храмы, чтобы тени Аида не вышли к живым.` },
  norse:  { name: ru`Хирд Асгарда`,     short: ru`Волк`,     member: ru`хирдман`,    motto: ru`Верность и чутьё`, crest: 'wolf', color: '#a78bfa',
    desc: ru`Верные, как волки Одина. Хирд стоит у рунных камней, пока не затянутся трещины к Гиннунгагапу.` },
  celtic: { name: ru`Братство Дуба`,    short: ru`Медведь`,  member: ru`друид`,      motto: ru`Сила и стойкость`, crest: 'bear', color: '#22c55e',
    desc: ru`Друиды и воины священных рощ под рукой медведицы Артио. Братство держит каменные круги, чтобы холмы сидов не распахнулись навсегда.` },
  egypt:  { name: ru`Стражи Дуата`,     short: ru`Скарабей`, member: ru`страж`,      motto: ru`Солнце взойдёт снова`, crest: 'scarab', color: '#facc15',
    desc: ru`Хранители солнечной ладьи Ра. Пока Алатырь расколот, стражи стоят у обелисков, чтобы ночь Дуата не поглотила рассвет.` },
  china:  { name: ru`Небесная Гвардия`, short: ru`Дракон`,   member: ru`гвардеец`,   motto: ru`Небо и земля в равновесии`, crest: 'dragon', color: '#ef4444',
    desc: ru`Воины под знаменем Лазурного дракона. В Перепутицу гвардия держит пагоды, чтобы Небесные врата не остались распахнутыми.` },
  aztec:  { name: ru`Орден Ягуара`,     short: ru`Ягуар`,    member: ru`воин-ягуар`, motto: ru`Солнце не должно погаснуть`, crest: 'jaguar', color: '#06b6d4',
    desc: ru`Самые отважные воины древних городов Америки. Орден держит пирамиды, чтобы из Миктлана не пришла вечная ночь.` },
};
const CLANS = {};
for (const k of MYTH_ALL) {
  const m = MYTHS[k], x = CLAN_META[k] || ((globalThis.MYTH_META || {})[k] || {}).clan || {}, s = v => (typeof v === 'string' && v ? v : null);
  const place = m.world || m.name;
  CLANS[k] = { myth: k, name: s(x.name) || ru`Клан «${place}»`, short: s(x.short) || place, member: s(x.member) || ru`воин клана`,
    motto: s(x.motto) || ru`Вместе — за Алатырь`, desc: s(x.desc) || ru`Ловчие мифологии «${m.name}»: они держат её святилища, пока Алатырь расколот.`,
    crest: /^[a-z]{2,16}$/.test(x.crest || '') ? x.crest : 'star', color: /^#[0-9a-f]{6}$/i.test(x.color || '') ? x.color : m.color };
}
// 4.28: прежние дружины (до 4.28 в сохранениях, на Капищах и в чате) — к кланам мифологий. Сокол — славянский (сокол-Рарог,
// знак Рюриковичей), волк — скандинавский (волки Одина, ульфхеднары), медведь — кельтский (медведица Артио; имя Артура —
// «медведь»). Под старыми ключами — те же кланы, но не перечисляются (Object.keys / entries их не видят)
const CLAN_OLD = { sokol: 'slavic', medved: 'celtic', volk: 'norse' };
for (const [o, k] of Object.entries(CLAN_OLD)) Object.defineProperty(CLANS, o, { value: CLANS[k], enumerable: false });
// ключ клана по любому id (прежнему — его клан мифологии) или null, если такого клана нет
function clanOf(k) {
  k = String(k || '');
  if (Object.prototype.hasOwnProperty.call(CLAN_OLD, k)) return CLAN_OLD[k];
  return Object.prototype.hasOwnProperty.call(CLANS, k) && Object.prototype.propertyIsEnumerable.call(CLANS, k) ? k : null;
}
// клан открыт — его мифология открыта в этом сезоне Алатыря
function clanOpen(k) { return clanOf(k) === k && MYTH_KEYS.includes(k); }
// все id клана в базе: сам ключ и прежние, что к нему ведут (до миграции 032_myth_clans_data)
function clanIds(k) { return [k, ...Object.keys(CLAN_OLD).filter(o => CLAN_OLD[o] === k)]; }
const CLAN_LEVEL = 5;      // с какого уровня выбирается клан (4.16: было 12, 5.1.11: снова 5; см. DUEL_LEVEL)
const HOLD_MAX = 6;       // защитников на одном Капище
const HOLD_MY_MAX = 3;    // Капищ с моими защитниками одновременно (4.16: было 10 — дружины держали почти все Капища)
const TRIBUTE = { sparks: 100, charm: 1 }; // дань в день за каждое Капище с моим защитником

// 4.16: pow — сила каждого духа хранителя от средней силы трёх сильнейших духов игрока (W.guardian); speed — темп его
// ударов (был 0,85 / 0,7 / 0,58). Раньше хранитель брал уровень духов игрока, но виды у него были слабее, а бил он вдвое
// реже игрока — и сильный Ловчий не проигрывал (169:0). Ориентир побед живого игрока своей командой: Ученик и Мастер — ~70%, Старейшина — ~45%
const SHRINE_TIERS = {
  1: { title: ru`Ученик`,     pow: 1.4,  speed: 0.6,  shield: 0.35, xp: 800,  sparks: 300 },
  2: { title: ru`Мастер`,     pow: 1.2,  speed: 0.52, shield: 0.6,  xp: 1500, sparks: 600 },
  3: { title: ru`Старейшина`, pow: 1.3,  speed: 0.45, shield: 0.85, xp: 3000, sparks: 1200 },
};
/* ---------- Праздники (v1.4) ---------- */
const HOLIDAYS = {
  svyatki:     { name: ru`Святки`,          desc: ru`Зимние праздники: Морозко и Снегурка выходят к людям, духи Ветра и Воды встречаются чаще, в источниках — подарки.`, el: ['wind', 'water'], loot: 1.5, seasonal: ['morozko', 'snegurka'] },
  maslenitsa:  { name: ru`Масленица`,       desc: ru`Провожаем зиму! Духи Огня встречаются вдвое чаще, в источниках много мёда («блинов»), опыт ×1,5.`, el: ['fire'], honey: true, xp: 1.5 },
  kupala:      { name: ru`Купальская ночь`, desc: ru`Цветёт папоротник: Купалинка повсюду, духи Огня, Воды и Леса чаще, ночью сияющие — вдвое чаще.`, el: ['fire', 'water', 'forest'], shinyNight: 2, seasonal: ['kupalinka'] },
  pokrov:      { name: ru`Покров`, desc: ru`Первые туманы и иней: духи Ветра и Воды встречаются чаще, Листопадница — повсюду, в источниках больше добычи.`, el: ['wind', 'water'], loot: 1.5, seasonal: ['listopadnica'] },
  veles:       { name: ru`Велесова ночь`,   desc: ru`Граница миров тоньше всего: духи Тени втрое чаще, в великих разломах ждёт Кощей, сияющие Тени вдвое чаще.`, el: ['shadow'], elMul: 3, koschey: true, shiny: 2 },
};

/* ---------- Вторжения Нави (v1.4) ---------- */
const GRUNT_QUOTES = [
  ru`Этот источник теперь принадлежит Нави!`,
  ru`Твои духи будут служить Кощею!`,
  ru`Орден Оберега? Никогда о таком не слышал.`,
  ru`Граница рухнет, и мы заберём весь город!`,
  ru`Думаешь, оберегом меня остановишь?`,
  ru`Тьма уже здесь, Ловчий. Смирись.`,
];

/* ---------- Облик Ловчего (v1.4) ---------- */
const LOOK = {
  cloak: [
    { c: '#6d28d9', name: ru`Фиалковый`, lvl: 1 }, { c: '#1d4ed8', name: ru`Синий`, lvl: 1 }, { c: '#15803d', name: ru`Лесной`, lvl: 1 },
    { c: '#b91c1c', name: ru`Алый`, lvl: 5 }, { c: '#0f766e', name: ru`Бирюзовый`, lvl: 8 }, { c: '#a16207', name: ru`Охряный`, lvl: 10 },
    { c: '#1f2937', name: ru`Полночный`, lvl: 15 }, { c: '#e2e8f0', name: ru`Снежный`, lvl: 20 }, { c: '#be185d', name: ru`Малиновый`, lvl: 25 }, { c: '#ca8a04', name: ru`Золотой`, lvl: 30 },
    // 3.12: из Лавки Ордена (за монеты) и с Золотой тропы — открываются покупкой, а не уровнем
    { c: '#7c2d12', name: ru`Бронзовый`, lvl: 1, shop: 250 }, { c: '#0c4a6e', name: ru`Глубинный`, lvl: 1, shop: 250 }, { c: '#4a044e', name: ru`Навья ночь`, lvl: 1, shop: 400 },
    { c: '#065f46', name: ru`Сезонная тропа`, lvl: 1, pass: true },
  ],
  eyes: [
    { c: '#5eead4', name: ru`Бирюза`, lvl: 1 }, { c: '#fde047', name: ru`Янтарь`, lvl: 1 }, { c: '#f87171', name: ru`Жар`, lvl: 6 },
    { c: '#c084fc', name: ru`Аметист`, lvl: 12 }, { c: '#f8fafc', name: ru`Лунный свет`, lvl: 18 }, { c: '#4ade80', name: ru`Навий огонь`, lvl: 28 },
  ],
  emblem: [
    { id: 'charm', name: ru`Оберег`, lvl: 1 }, { id: 'sun', name: ru`Солнце`, lvl: 3 }, { id: 'moon', name: ru`Месяц`, lvl: 7 },
    { id: 'leaf', name: ru`Лист`, lvl: 11 }, { id: 'bolt', name: ru`Молния`, lvl: 16 }, { id: 'star', name: ru`Звезда`, lvl: 22 },
    { id: 'crown', name: ru`Венец Лиги`, lvl: 1, league: 9 },
    { id: 'needle', name: ru`Игла Кощея`, lvl: 20 },
    { id: 'horn', name: ru`Рог Индрика`, lvl: 28 },
    { id: 'oak', name: ru`Дубовый венок`, lvl: 31 },
    { id: 'trail', name: ru`Знак Тропы`, lvl: 1, pass: true },
  ],
  // 4.6: облики-скины — полный наряд Ловчего (рисунки — js/skins-art.js); покупаются в Гардеробе за монеты.
  // rar: 0 — обычный, 1 — редкий, 2 — эпический, 3 — легендарный. Глаза и эмблема видны у всех обликов, цвет плаща — только у обычного
  skin: [
    { id: 'hood', name: ru`Ловчий`, rar: 0, desc: ru`Плащ Ордена Оберега — с него начинает каждый Ловчий.` },
    { id: 'kupala', name: ru`Купальский`, rar: 1, shop: 300, desc: ru`Венок с цветком папоротника, что расцветает лишь в Купальскую ночь.` },
    { id: 'leshiy', name: ru`Лесной`, rar: 1, shop: 300, desc: ru`Капюшон из мха и оленьи рога — леса признают тебя своим.` },
    { id: 'moroz', name: ru`Морозный`, rar: 1, shop: 400, desc: ru`Ледяной венец и иней на плаще. Подарок самого Морозко.` },
    { id: 'volhv', name: ru`Волхв`, rar: 2, shop: 450, desc: ru`Шапка с рунами и посох с огоньком: мудрость старых волхвов.` },
    { id: 'bogatyr', name: ru`Богатырь`, rar: 2, shop: 500, desc: ru`Шелом, кольчуга и алое корзно — хоть сейчас на заставу.` },
    { id: 'voron', name: ru`Вороний`, rar: 2, shop: 550, desc: ru`Маска-клюв и плащ из чёрных перьев. Вороны Нави шепчут тебе вести.` },
    { id: 'navstrazh', name: ru`Навий страж`, rar: 2, shop: 650, desc: ru`Рогатая личина и пламя Нави. Духи расступаются перед тобой.` },
    { id: 'zharpero', name: ru`Жар-перо`, rar: 3, shop: 900, desc: ru`Убор из огненных перьев Жар-птицы. Светится даже в самую тёмную ночь.` },
    { id: 'knyaz', name: ru`Княжий`, rar: 3, shop: 1000, desc: ru`Княжья шапка с соболем и самоцветами — наряд первых Ловчих Ордена.` },
  ],
  // 4.6: фон и рамка карточки Ловчего (её видят все) — тоже в Гардеробе (рисунки — js/looks-art.js). lvl — открывается уровнем, shop — цена в монетах
  bg: [
    { id: 'night', name: ru`Ночь`, rar: 0, lvl: 1 },
    { id: 'dusk', name: ru`Сумерки`, rar: 0, lvl: 5 },
    { id: 'stars', name: ru`Звездопад`, rar: 0, lvl: 12 },
    { id: 'aurora', name: ru`Северное сияние`, rar: 1, shop: 250 },
    { id: 'fern', name: ru`Купальская ночь`, rar: 1, shop: 300 },
    { id: 'embers', name: ru`Жар`, rar: 1, shop: 300 },
    { id: 'frost', name: ru`Иней`, rar: 1, shop: 300 },
    { id: 'moon', name: ru`Навья луна`, rar: 2, shop: 400 },
    { id: 'khokhloma', name: ru`Золотая роспись`, rar: 2, shop: 500 },
    { id: 'gate', name: ru`Врата Нави`, rar: 3, shop: 650 },
  ],
  frame: [
    { id: 'none', name: ru`Без рамки`, rar: 0, lvl: 1 },
    { id: 'ring', name: ru`Золотая кайма`, rar: 0, lvl: 3 },
    { id: 'rune', name: ru`Рунная кайма`, rar: 0, lvl: 15 },
    { id: 'oak', name: ru`Дубовый венок`, rar: 1, shop: 250 },
    { id: 'ice', name: ru`Ледяной узор`, rar: 1, shop: 300 },
    { id: 'flame', name: ru`Огненная кайма`, rar: 1, shop: 350 },
    { id: 'pearl', name: ru`Жемчужная`, rar: 2, shop: 350 },
    { id: 'serpent', name: ru`Змей-уроборос`, rar: 2, shop: 450 },
    { id: 'thorn', name: ru`Навий шип`, rar: 2, shop: 500 },
    { id: 'knyaz', name: ru`Княжий оклад`, rar: 3, shop: 800 },
  ],
};
const SKIN_RAR = [{ name: ru`Обычный`, c: '#c4b5fd' }, { name: ru`Редкий`, c: '#38bdf8' }, { name: ru`Эпический`, c: '#c084fc' }, { name: ru`Легендарный`, c: '#fbbf24' }];

MEDALS.splice(4, 0, { id: 'duels', name: ru`Поединщик`, desc: ru`Победи хранителей капищ`, stat: 'duels', tiers: [5, 50, 300] });
QUEST_TEMPLATES.push({ t: 'duel', min: 1, max: 2, text: n => ru.k`Победи хранителей капищ: ${n}`, reward: { charm2: 4, sparks: 600 } });

/* ---------- 4.0: обучение новичка ----------
   Пропустить нельзя: шаги ведёт сервер (S.d.tut — номер текущего шага, 0 — пройдено), после перезахода игра
   продолжает с того же места. 4.24: без сцен и сюжета — только подсказки. kind: ui — открыть раздел; catch — поймать
   учебного духа (sid); spring — зачерпнуть из источника; power — усилить духа. За каждый этап — награда. */
const TUT_V = 5; // версия списка шагов: при смене — перевод S.d.tut в S.migrate
const TUT_CHAPTERS = [
  { title: ru`Первый дух`,  reward: { charm: 15, honey: 3, sparks: 500, xp: 400 } },
  { title: ru`Твои духи`,   reward: { sparks: 500, xp: 300 } },
  { title: ru`Источники`,     reward: { charm: 15, water: 3, xp: 400 } },
  { title: ru`Прогулки`,    reward: { charm: 20, honey: 5, water: 3, incense: 1, sparks: 10000, zlat: 20, xp: 1400 } }, // 5.1.16: ✦ 10 000 (было 1 500) — хватит усилить первых духов
];
const TUT = [
  { ch: 0, kind: 'catch', id: 'catch1', sid: 'vayfayka', hint: ru`Рядом появился дух — видишь светящийся круг на карте? <b>Коснись духа</b>, а потом <b>смахни оберег вверх</b>, прямо в него.` },
  { ch: 0, kind: 'catch', id: 'catch2', sid: 'mshonok', hint: ru`Второй учебный дух рядом. Кольцо вокруг духа сжимается: бросай, когда оно <b>маленькое</b>, — выйдет «Отлично!». Зелёное кольцо — дух покладистый, красное — упрямый.` },
  { ch: 1, kind: 'ui', id: 'menu', info: ru`Это меню — здесь все разделы. Пока открыто не всё: разделы откроются по ходу обучения, подсвеченный — следующий.`, hint: ru`Каждый пойманный дух — твой. Открой <b>меню</b> — золотой оберег внизу экрана.` },
  { ch: 1, kind: 'ui', id: 'spirits', info: ru`Это твоя коллекция — все пойманные духи. Сверху — сортировка по силе, новизне и имени и фильтр по стихиям.`, hint: ru`Это разделы Ордена. Открой <b>«Духи»</b> — там твоя коллекция.` },
  { ch: 1, kind: 'ui', id: 'card', info: ru`Это карточка духа: сила, стихия, приёмы и семейство. Ниже — кнопки «Усилить» и «Превратить», а ещё можно сделать духа спутником.`, hint: ru`Коснись любого духа, чтобы открыть его <b>карточку</b>.` },
  { ch: 1, kind: 'power', id: 'power', hint: ru`На карточке — сила духа. Нажми <b>«Усилить»</b>: за искры и эссенцию дух станет сильнее. Эссенцию приносят поимки духов того же семейства.` },
  { ch: 1, kind: 'ui', id: 'dex', info: ru`Бестиарий — все виды духов. Пойманные видны целиком, встреченные — тенью. Коснись вида, чтобы прочитать о нём.`, hint: ru`Теперь загляни в <b>«Бестиарий»</b> (меню) — там все виды духов. Сколько найдёшь ты?` },
  { ch: 2, kind: 'spring', id: 'spring', hint: ru`Обереги пополняют <b>источники</b> — светящиеся чаши у памятников, фонтанов и храмов. Дойди до ближайшего джойстиком по <b>стрелке вверху</b> и коснись его. Если рядом нет — прогуляйся по карте.` },
  { ch: 2, kind: 'ui', id: 'bag', info: ru`Сумка: обереги, мёд, живая вода и ладан. Сверху видно, сколько ещё поместится; лишнее можно выбросить.`, hint: ru`Добыча уже в <b>Сумке</b>. Открой меню → «Сумка» и посмотри, что у тебя есть.` },
  { ch: 3, kind: 'ui', id: 'cocoons', info: ru`Коконы греются шагами — одновременно можно греть три. Готовый кокон вылупится одним касанием. А твой первый дух идёт рядом — это спутник: в пути он находит эссенцию.`, hint: ru`Открой меню → <b>«Коконы»</b>. Первый кокон уже греется — пройди 2 км, и он вылупится.` },
  { ch: 3, kind: 'ui', id: 'quests', info: ru`Здесь задания дня — они обновляются в полночь. А источники иногда дают поручения: выполнишь — встретишь особого духа.`, hint: ru`Открой <b>«Задания»</b> — там задания дня.` },
  { ch: 3, kind: 'ui', id: 'path', info: ru`Путь Ловчего: что откроется на каждом уровне и какие награды ждут. Звания растут: Послушник, Ловчий, Следопыт, Ведун, Хранитель.`, hint: ru`И последнее: открой <b>«Путь»</b> в меню — там видно, что откроется на каждом уровне Ловчего.` },
];

