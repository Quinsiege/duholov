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
    desc: ru`Грива из живого пламени. Говорят, в Тонкую ночь именно Жарогривы не дали городу замёрзнуть.`,
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
    desc: ru`Легенда. Бессмертный царь Нави. Именно он истончил границу миров в Тонкую ночь. Ищи его в тёмных разломах.`,
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

  // ---------- v3.9: легенда третьей книги Летописи (только награда, в разломах не встречается) ----------
  { id: 'indrik', name: ru`Индрик-зверь`, el: 'water', rar: 5, stage: 1, fam: 'indrik', legend: true, story: true, base: [292, 244, 256],
    desc: ru`Легенда. Всем зверям отец: ходит под землёй, как солнце по небу, и прочищает подземные реки, чтобы родники не иссякли.`,
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
  { id: 'svyatogor', name: ru`Святогор`, el: 'forest', rar: 5, stage: 1, fam: 'svyatogor', legend: true, story: true, base: [302, 252, 262],
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
SPECIES.forEach((s, i) => { s.num = i + 1; });
const SP = Object.fromEntries(SPECIES.map(s => [s.id, s]));

const ITEMS = {
  charm:   { name: ru`Оберег`,             desc: ru`Узелок с заговорённой травой. Бросай в духа, чтобы поймать.`, mult: 1,   throwable: true },
  charm2:  { name: ru`Серебряный оберег`,  desc: ru`Серебро держит духов крепче. Шанс поимки ×1,5.`,              mult: 1.5, throwable: true, unlock: 8 },
  charm3:  { name: ru`Золотой оберег`,     desc: ru`Лучший оберег Ордена. Шанс поимки ×2.`,                        mult: 2,   throwable: true, unlock: 16 },
  honey:   { name: ru`Мёд`,                desc: ru`Духи обожают мёд. Успокаивает духа: шанс поимки ×1,5 на один бросок.` },
  // 4.15: лечение духов (здоровье — общее на всю игру, см. Rules.HP): heal — сколько здоровья вернёт, revive — поднимает духа без сил
  herb:    { name: ru`Подорожник`,         desc: ru`Лист к ране — и полегчало. Возвращает духу четверть здоровья.`, heal: 0.25 },
  brew:    { name: ru`Целебный отвар`,     desc: ru`Травы Велеса, сваренные в родниковой воде. Возвращает духу 60% здоровья.`, heal: 0.6 },
  // 4.15.1: revive — на сколько часов раньше поднимется дух без сил (живых Мёртвая вода не лечит)
  deadwater: { name: ru`Мёртвая вода`,     desc: ru`Редкая сказочная вода, что сращивает самые тяжкие раны. Дух без сил поднимется на 4 часа раньше. Живых не лечит.`, revive: 4 },
  water:   { name: ru`Живая вода`,         desc: ru`Возвращает духу половину здоровья, а в разломе — лечит прямо в бою. Духа без сил не поднимет.`, heal: 0.5 },
  incense: { name: ru`Ладан`,              desc: ru`Дымок приманивает духов: 30 минут их вокруг вдвое больше.` },
  farpass: { name: ru`Дальний пропуск`,    desc: ru`Грамота Ордена: закрыть Разлом до 5 км от тебя, не подходя к нему. Один Орден дарит каждый день.` },
  gift:    { name: ru`Подарок`,           desc: ru`Узелок для друга: обереги, мёд, иногда кокон. Отправляется в «Меню → Друзья», раз в день каждому.` },
};
const GIFT_LIMIT = 25; // 4.16: было 10 при 50 друзьях — подарков социальному игроку не хватало

/* ---------- Дружба (v1.8) ---------- */
const FRIEND_LEVELS = [
  { name: ru`Знакомый`, pts: 0 },
  { name: ru`Приятель`, pts: 3, xp: 500 },
  { name: ru`Друг`, pts: 10, xp: 1500 },
  { name: ru`Лучший друг`, pts: 30, xp: 4000 },
  { name: ru`Побратим`, pts: 60, xp: 10000 },
];
const BAG_LIMIT = 350;

const COCOON_TIERS = {
  2:  { name: ru`Зелёный кокон`,  color: '#86efac', pool: { 1: 1 } },
  5:  { name: ru`Синий кокон`,    color: '#7dd3fc', pool: { 1: 3, 2: 4, 3: 1 } },
  10: { name: ru`Лиловый кокон`,  color: '#d8b4fe', pool: { 2: 2, 3: 3, 4: 2 } },
};
// Опыт на уровень n. До 10 уровня — прежняя пологая кривая (новичок растёт быстро), дальше каждый уровень
// на 17% дороже предыдущего: 20 ≈ 90 тыс., 30 ≈ 430 тыс., 40 ≈ 2,1 млн (3.19: раньше 40 уровень был за 243 тыс. —
// одна Летопись давала почти весь путь, игроки доходили до потолка за пару недель)
function levelXPOld(n) { return n <= 1 ? 0 : Math.round(400 * Math.pow(n - 1, 1.75) / 50) * 50; }
function levelXP(n) { return n <= 10 ? levelXPOld(n) : Math.round(levelXPOld(10) * Math.pow(1.17, n - 10) / 50) * 50; }
const MAX_LEVEL = 40;

const QUEST_TEMPLATES = [
  { t: 'catch',   min: 5, max: 10, text: n => ru.k`Поймай ${n} духов`,                 reward: { charm: 8, sparks: 300 } },
  { t: 'catchEl', min: 2, max: 3,  text: (n, el) => ru.k`Поймай ${n} духов стихии «${ELEMENTS[el].name}»`, reward: { honey: 3, sparks: 400 } },
  { t: 'spring',  min: 3, max: 5,  text: n => ru.k`Зачерпни силы из ${n} родников`,     reward: { charm: 5, herb: 2 } },
  { t: 'throw',   min: 2, max: 4,  text: n => ru.k`Сделай ${n} отличных бросков`,       reward: { honey: 2, sparks: 300 } },
  { t: 'walk',    min: 1, max: 2,  text: n => ru.k`Пройди ${n} км`,                     reward: { charm: 10, sparks: 500 } },
  { t: 'power',   min: 2, max: 4,  text: n => ru.k`Усиль духов ${n} ${U.plural(n, ru.k`раз`, ru.k`раза`, ru.k`раз`)}`,            reward: { herb: 2, sparks: 300 } },
  { t: 'evolve',  min: 1, max: 1,  text: () => ru.k`Преврати одного духа`,              reward: { honey: 2, sparks: 400 } }, // 4.16: ладан — реже
  { t: 'raid',    min: 1, max: 1,  text: () => ru.k`Закрой разлом`,                     reward: { charm2: 5, sparks: 800 } },
];

/* ---------- Поручения из родников (3.2): задание → встреча с духом ---------- */
// tier: 1 — лёгкое (обычные и необычные духи), 2 — среднее (необычные и редкие), 3 — трудное (редкие и эпические)
const TASK_TEMPLATES = [
  { t: 'catch',    tier: 1, min: 5, max: 8, text: n => ru.k`Поймай ${n} духов` },
  { t: 'spring',   tier: 1, min: 3, max: 5, text: n => ru.k`Зачерпни силы из ${n} родников` },
  { t: 'power',    tier: 1, min: 3, max: 5, text: n => ru.k`Усиль духов ${n} ${U.plural(n, ru.k`раз`, ru.k`раза`, ru.k`раз`)}` },
  { t: 'photo',    tier: 1, min: 1, max: 1, text: () => ru.k`Сфотографируй духа во время встречи` },
  { t: 'catchEl',  tier: 2, min: 3, max: 5, text: (n, el) => ru.k`Поймай ${n} духов стихии «${ELEMENTS[el].name}»` },
  { t: 'throw',    tier: 2, min: 3, max: 5, text: n => ru.k`Сделай ${n} отличных бросков` },
  { t: 'walk',     tier: 2, min: 1, max: 2, text: n => ru.k`Пройди ${n} км` },
  { t: 'evolve',   tier: 2, min: 1, max: 1, text: () => ru.k`Преврати духа` },
  { t: 'duel',     tier: 2, min: 1, max: 1, lvl: 3, text: () => ru.k`Победи хранителя капища` },
  { t: 'hatch',    tier: 3, min: 1, max: 1, text: () => ru.k`Выведи духа из кокона` },
  { t: 'invasion', tier: 3, min: 1, max: 1, lvl: 4, text: () => ru.k`Освободи родник от прислужников Нави` },
  { t: 'raid',     tier: 3, min: 1, max: 1, lvl: 5, text: () => ru.k`Закрой разлом` },
];
const TASK_TIERS = {
  1: { rar: [1, 2], lvl: 12, reward: { charm: 3 } },
  2: { rar: [2, 3], lvl: 18, reward: { charm: 5, honey: 1 } },
  3: { rar: [3, 4], lvl: 25, reward: { charm2: 3, honey: 2 } },
};
const TASK_LIMIT = 5;


const LORE = [
  ru`2031 год. Геомагнитная буря, которую потом назовут <b>Тонкой ночью</b>, истончила границу между Явью — нашим миром — и Навью, миром духов.`,
  ru`Теперь по улицам бродят духи. Древние — Леший, Водяной, Домовой. И новые, рождённые городом: Вайфайка, Трамвайник, Фонарник.`,
  ru`Древний <b>Орден Оберега</b> снова набирает Ловчих. Твоя задача — находить духов, ловить их оберегами, черпать силу из родников и закрывать разломы, откуда лезет всё самое опасное.`,
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
const MEDAL_TIERS = [
  { name: ru`Бронза`, color: '#d97706', xp: 500 },
  { name: ru`Серебро`, color: '#cbd5e1', xp: 1500 },
  { name: ru`Золото`, color: '#fbbf24', xp: 5000 },
];
const MEDALS = [
  { id: 'catcher', name: ru`Ловчий`,        desc: ru`Поймай духов`,                 stat: 'caught',      tiers: [10, 100, 1000] },
  { id: 'walker',  name: ru`Странник`,      desc: ru`Пройди километров`,            stat: 'km',          tiers: [10, 100, 1000] },
  { id: 'springs', name: ru`Водонос`,       desc: ru`Зачерпни силы из родников`,    stat: 'springs',     tiers: [30, 300, 2000] },
  { id: 'raids',   name: ru`Затворник`,     desc: ru`Закрой разломов`,              stat: 'raids',       tiers: [3, 30, 200] },
  { id: 'dex',     name: ru`Летописец`,     desc: ru`Видов духов в бестиарии`,      stat: 'dex',         tiers: [5, 20, SPECIES.length] },
  { id: 'purify',  name: ru`Очиститель`,    desc: ru`Победи прислужников Нави`,     stat: 'invasions',   tiers: [3, 30, 200] },
  { id: 'trade',   name: ru`Щедрая душа`,   desc: ru`Купи или продай духов на Аукционе`,     stat: 'traded',      tiers: [1, 10, 50] },
  { id: 'throws',  name: ru`Меткий глаз`,   desc: ru`Отличных бросков`,             stat: 'throwsGreat', tiers: [20, 200, 1000] },
  { id: 'hatch',   name: ru`Наседка`,       desc: ru`Вылупи духов из коконов`,      stat: 'hatched',     tiers: [3, 30, 200] },
  { id: 'evolve',  name: ru`Алхимик`,       desc: ru`Преврати духов`,               stat: 'evolved',     tiers: [3, 30, 200] },
  { id: 'shiny',   name: ru`Искатель сияния`, desc: ru`Поймай сияющих духов`,       stat: 'shiny',       tiers: [1, 10, 50] },
  { id: 'streak',  name: ru`Верность`,      desc: ru`Дней подряд в игре`,           stat: 'streakBest',  tiers: [7, 30, 100] },
  { id: 'order',   name: ru`Соратник`,      desc: ru`Очков в общем деле Ордена`,    stat: 'orderPts',    tiers: [100, 1000, 10000] },
  { id: 'lands',   name: ru`Землепроходец`, desc: ru`Поймай духов родных земель`,   stat: 'lands',       tiers: [1, 3, 7] },
  { id: 'el_fire',    name: ru`Истопник`,   desc: ru`Поймай духов Огня`,            stat: 'el:fire',     tiers: [10, 50, 200] },
  { id: 'el_water',   name: ru`Лодочник`,   desc: ru`Поймай духов Воды`,            stat: 'el:water',    tiers: [10, 50, 200] },
  { id: 'el_forest',  name: ru`Лесничий`,   desc: ru`Поймай духов Леса`,            stat: 'el:forest',   tiers: [10, 50, 200] },
  { id: 'el_wind',    name: ru`Мельник`,    desc: ru`Поймай духов Ветра`,           stat: 'el:wind',     tiers: [10, 50, 200] },
  { id: 'el_current', name: ru`Монтёр`,     desc: ru`Поймай духов Тока`,            stat: 'el:current',  tiers: [10, 50, 200] },
  { id: 'el_shadow',  name: ru`Полуночник`, desc: ru`Поймай духов Тени`,            stat: 'el:shadow',   tiers: [10, 50, 200] },
];

/* ---------- Летопись Ордена: сюжет ---------- */
function stepText(s) {
  switch (s.t) {
    case 'catch': return ru`Поймай духов: ${s.n}`;
    case 'catchEl': return ru`Поймай духов стихии «${ELEMENTS[s.el].name}»: ${s.n}`;
    case 'spring': return ru`Зачерпни силы из родников: ${s.n}`;
    case 'power': return ru`Усиль духа: ${s.n}`;
    case 'throw': return ru`Сделай отличных бросков: ${s.n}`;
    case 'walk': return ru`Пройди ${s.n} км`;
    case 'raid': return ru`Закрой разломов: ${s.n}`;
    case 'evolve': return ru`Преврати духа: ${s.n}`;
    case 'hatch': return ru`Вылупи духа из кокона: ${s.n}`;
    case 'duel': return ru`Победи хранителей капищ: ${s.n}`;
    case 'invasion': return ru`Отбей вторжения Нави: ${s.n}`;
    case 'purify': return ru`Очисти омрачённого духа: ${s.n}`;
    case 'photo': return ru`Сфотографируй духа: ${s.n}`;
    case 'league': return ru`Сразись в поединках Лиги: ${s.n}`; // 4.16: засчитывается каждый бой, не только победа
    case 'task': return ru`Выполни поручений родников: ${s.n}`;
    case 'defend': return ru`Поставь защитника на Капище: ${s.n}`;
    case 'land': return ru`Поймай духа родной земли: ${s.n}`;
    case 'spar': return ru`Победи друга в поединке: ${s.n}`;
    case 'coop': return ru`Закрой совместный разлом: ${s.n}`;
    case 'gift': return ru`Отправь подарков друзьям: ${s.n}`;
    case 'awaken': return ru`Пробуди духа: ${s.n}`;
  }
  return '';
}
// 4.16: подсказка к шагу Летописи — куда идти и что делать (новичок может не знать, где очищают духов или ставят защитника)
function stepHint(s) {
  switch (s.t) {
    case 'catch': return ru`Духи появляются на карте рядом с тобой: коснись духа и брось оберег. С ладаном духов вокруг вдвое больше.`;
    case 'catchEl': {
      const w = Object.values(WEATHER).filter(x => x.boost.includes(s.el)).map(x => x.name).join(', ');
      return ru`Духи стихии «${ELEMENTS[s.el].name}» чаще встречаются в погоду, которая её усиливает (${w}), и в неделю её стихии. Погода — на карте вверху.`;
    }
    case 'spring': return ru`Родники — синие колодцы у памятников, фонтанов и храмов. Подойди и коснись; стрелка вверху карты ведёт к ближайшему.`;
    case 'power': return ru`Открой «Духи», выбери духа и нажми «Усилить» — нужны искры и эссенция его семейства.`;
    case 'throw': return ru`Бросай оберег, когда цветное кольцо внутри маленькое, — выйдет «Отлично!» или «Превосходно!».`;
    case 'walk': return ru`Иди пешком с открытой игрой. Транспорт и скачки GPS не засчитываются.`;
    case 'raid': return ru`Разломы открываются у Капищ на час. «Меню → Разломы» покажет ближайшие, а Дальний пропуск позволит сразиться издалека.`;
    case 'evolve': return ru`Копи эссенцию семейства поимками. Когда её хватит, на карточке духа, во вкладке «Рост», нажми «Превратить».`;
    case 'hatch': return ru`Коконы выпадают из родников. Положи кокон греться в «Меню → Коконы» и пройди нужные километры.`;
    case 'duel': return ru`Капища — резные идолы у памятных мест. Подойди к Капищу, где сейчас нет Разлома, и победи хранителя.`;
    case 'invasion': return ru`Лиловые родники захвачены Навью. Подойди к такому роднику и победи прислужника.`;
    case 'purify': return ru`Победи прислужника Нави у лилового родника и поймай омрачённого духа, которого он оставит. Потом на карточке этого духа нажми «Очистить».`;
    case 'photo': return ru`Во время встречи с духом нажми кнопку с фотоаппаратом и сделай снимок.`;
    case 'league': return ru`Открой «Меню → Лига» (с ${League.LEVEL} уровня) и сражайся: засчитывается каждый бой — и победа, и поражение.`;
    case 'task': return ru`Поручения выдают родники. Выполни поручение и сдай его во вкладке «Задания дня».`;
    case 'defend': return ru`Вступи в дружину (с ${CLAN_LEVEL} уровня), победи на Капище и поставь своего духа защитником на Капище своей дружины.`;
    case 'land': return ru`У каждого края России свой дух-хранитель. Ищи его на карте: он эпический и встречается редко, помогут ладан и золотые обереги.`;
    case 'spar': return ru`Открой «Меню → Друзья», коснись взаимного друга и нажми «Поединок».`;
    case 'coop': return ru`Открой разлом, нажми «Позвать друзей — совместный бой» и отправь друзьям код разлома.`;
    case 'gift': return ru`Подарки выпадают из родников. Отправь их в «Меню → Друзья», каждому другу раз в день.`;
    case 'awaken': return ru`Усиль духа до предела уровня, открой на его карточке «Пробуждение» и пробуди его осколками Алатыря.`;
  }
  return '';
}
const STORY = [
  { title: ru`Посвящение`, lvl: 1,
    intro: ru`Старший Ловчий <b>Велимир</b> ждал тебя у старого родника. «Навь просочилась в город, — сказал он, не оборачиваясь. — Духи сами по себе не злые. Растерянные. Покажи, что умеешь с ними обращаться».`,
    steps: [{ t: 'catch', n: 3 }, { t: 'spring', n: 2 }, { t: 'power', n: 1 }],
    reward: { charm: 15, honey: 5, sparks: 500 },
    outro: ru`«Неплохо для новичка», — Велимир впервые улыбнулся и протянул тебе потёртый медный оберег. «Держи. Он видел больше духов, чем ты — трамваев».` },
  { title: ru`Голоса во дворах`, lvl: 2,
    intro: ru`По ночам жильцы слышат шорохи в подъездах, а Wi‑Fi пропадает без причины. Велимир уверен: город рождает новых духов — из проводов, фонарей и старых домов.`,
    steps: [{ t: 'catchEl', el: 'current', n: 2 }, { t: 'throw', n: 3 }, { t: 'walk', n: 1 }],
    reward: { incense: 2, water: 5, sparks: 1000 },
    outro: ru`«Вайфайки, Сетевики… — бормочет Велимир, листая Летопись. — В старых книгах о таких не писали. Значит, писать будем мы».` },
  { title: ru`Первый разлом`, lvl: 5,
    intro: ru`На окраине района небо пошло трещиной. Из разлома тянет холодом Нави, и оттуда выходят духи куда сильнее обычных. «Разломы нужно закрывать, — говорит Велимир. — Собери команду».`,
    steps: [{ t: 'raid', n: 1 }, { t: 'catch', n: 5 }, { t: 'evolve', n: 1 }],
    reward: { charm2: 10, water: 5, sparks: 1500 },
    outro: ru`Разлом схлопнулся с тихим звоном, на асфальте осталась горсть инея. «Кто-то открывает их нарочно», — мрачно замечает Велимир.` },
  { title: ru`Тропы Лешего`, lvl: 6,
    intro: ru`В парке пропадают люди — ненадолго, на час-другой. Выходят растерянные, с листьями в волосах. Похоже, Леший снова путает тропы. Нужно поговорить с ним — на его языке.`,
    steps: [{ t: 'catchEl', el: 'forest', n: 4 }, { t: 'hatch', n: 1 }, { t: 'walk', n: 3 }],
    reward: { honey: 10, incense: 1, sparks: 2000 },
    outro: ru`Леший вышел к тебе сам: огромный, мшистый, с глазами-светлячками. «Не я путаю, — проскрипел он. — Это граница дрожит. Костлявый царь шагает по ту сторону».` },
  { title: ru`Буря над крышами`, lvl: 8,
    intro: ru`Третий день над городом кружит гроза без дождя. Буревеи и Громовики сбились в стаи. Велимир хмурится: «Навь готовится. Нам нужно больше сил».`,
    steps: [{ t: 'catchEl', el: 'wind', n: 3 }, { t: 'catchEl', el: 'current', n: 3 }, { t: 'raid', n: 2 }],
    reward: { charm3: 5, water: 8, sparks: 2500 },
    outro: ru`Буря стихла так же внезапно, как началась. В Летописи сама собой проступила строка: «Игла в яйце, яйцо в утке, утка в зайце…»` },
  { title: ru`Тень Кощея`, lvl: 10,
    intro: ru`Это Кощей Бессмертный истончил границу в Тонкую ночь. Его смерть надёжно спрятана, а сила растёт с каждым открытым разломом. Орден объявляет общий сбор.`,
    steps: [{ t: 'catch', n: 25 }, { t: 'spring', n: 10 }, { t: 'raid', n: 3 }],
    reward: { charm3: 10, incense: 3, sparks: 5000 }, gift: 'zharptica',
    outro: ru`Когда третий разлом закрылся, небо вспыхнуло золотом. Из огненного пера родилась <b>Жар-птица</b> и опустилась прямо перед тобой. «Она пришла помочь, — шепчет Велимир. — Значит, мы ещё поборемся». <br><br><i>Конец первой книги. Далее — книга вторая: «Игла Кощея».</i>` },

  // ---------- Книга вторая: «Игла Кощея» ----------
  { title: ru`Утка в зайце`, lvl: 12,
    intro: ru`Велимир не спал три ночи над строкой из Летописи. «Смерть Кощея спрятана не в сундуке, — говорит он. — Сундук — это город. Заяц, утка, яйцо — это духи, которые её стерегут. Их надо найти».`,
    steps: [{ t: 'catch', n: 10 }, { t: 'walk', n: 3 }, { t: 'spring', n: 8 }],
    reward: { charm2: 10, honey: 5, sparks: 3000 },
    outro: ru`Из родника на окраине вынырнул Сквозняк с пёрышком утки в зубах. Перо было ледяным. «Кощей знает, что мы ищем, — хмурится Велимир. — Жди гостей».` },
  { title: ru`Прислужники Нави`, lvl: 13,
    intro: ru`Гости пришли: родники по всему району захвачены. Прислужники Кощея омрачают духов, чтобы те не выдали тайну иглы.`,
    steps: [{ t: 'invasion', n: 3 }, { t: 'purify', n: 1 }, { t: 'duel', n: 2 }],
    reward: { water: 10, charm3: 3, sparks: 3500 },
    outro: ru`Очищенный дух долго молчал, а потом прошептал: «Утка улетела к капищам предков. Туда прислужникам хода нет».` },
  { title: ru`Капища предков`, lvl: 14,
    intro: ru`Хранители капищ помнят времена, когда граница была прочной. Но просто так они с Ловчим говорить не станут — только с тем, кто докажет силу.`,
    steps: [{ t: 'duel', n: 5 }, { t: 'catchEl', el: 'shadow', n: 5 }, { t: 'photo', n: 1 }],
    reward: { incense: 2, charm3: 5, sparks: 4000 },
    outro: ru`Старейшина капища Велеса долго смотрел на твой снимок духа. «Утка — это Алконост, яйцо — в кладке Жар-птицы, — сказал он. — А игла… иглу охраняет сама Навь».` },
  { title: ru`Кладка Жар-птицы`, lvl: 15,
    intro: ru`Жар-птица согласилась показать своё гнездо — но только тому, кто умеет беречь новую жизнь. Велимир вручает тебе коконы: «Согрей их — и узнаешь, какое из яиц не простое».`,
    steps: [{ t: 'hatch', n: 2 }, { t: 'raid', n: 3 }, { t: 'power', n: 5 }],
    reward: { charm3: 6, water: 8, sparks: 5000 },
    outro: ru`Одно из яиц оказалось тяжёлым и холодным, как камень. Внутри что-то тикало — тонко, будто игла царапала скорлупу.` },
  { title: ru`Турнир Ордена`, lvl: 17,
    intro: ru`Чтобы расколоть яйцо Кощея, нужна сила всего Ордена. Лига созывает лучших Ловчих — и Велимир хочет видеть тебя среди них.`,
    steps: [{ t: 'league', n: 3 }, { t: 'evolve', n: 3 }, { t: 'catch', n: 30 }],
    reward: { incense: 3, charm3: 8, sparks: 6000 },
    outro: ru`На турнире Ловчие со всех районов положили руки на яйцо. Скорлупа треснула — и из неё выкатилась тонкая чёрная игла. Небо над городом потемнело.` },
  { title: ru`Игла Кощея`, lvl: 19,
    intro: ru`Кощей почувствовал, что игла найдена. Разломы открываются один за другим, прислужники штурмуют родники. Это последняя битва книги.`,
    steps: [{ t: 'raid', n: 5 }, { t: 'invasion', n: 5 }, { t: 'catchEl', el: 'shadow', n: 10 }],
    reward: { charm3: 15, incense: 3, sparks: 10000 }, gift: 'koschey', emblem: 'needle',
    outro: ru`Игла сломалась с тихим звоном. В последнем разломе стоял Кощей — не бессмертный царь, а уставший старик. «Ты сломал мою смерть, — сказал он. — Значит, теперь я могу просто жить». И шагнул к тебе в оберег. <br><br><i>Конец второй книги. Эмблема «Игла Кощея» открыта в облике Ловчего.</i>` },

  // ---------- Книга третья «Земли Руси» (v3.9) ----------
  { title: ru`Весть с окраин`, lvl: 20,
    intro: ru`Велимир разбирает груду писем: из Мурманска, Казани, Иркутска, из деревень, которых нет ни на одной туристической карте. «Тонкая ночь дошла до самых окраин, — говорит он. — Родники проснулись везде. Орден теперь — это вся страна».`,
    steps: [{ t: 'task', n: 3 }, { t: 'spring', n: 20 }, { t: 'walk', n: 5 }],
    reward: { charm2: 10, honey: 10, sparks: 5000, alatyr: 1, rod: 10 },
    outro: ru`«Родники раздают поручения — значит, они нас зовут, — Велимир складывает письма в Летопись. — Кто-то под землёй очень хочет, чтобы мы шли дальше».` },
  { title: ru`Знамя над капищем`, lvl: 21,
    intro: ru`Дружины Сокола, Медведя и Волка спорят за капища, как когда-то князья за города. Велимир хмурится: «Спорьте, но помните — капище стоит, пока его кто-то бережёт».`,
    steps: [{ t: 'duel', n: 5 }, { t: 'defend', n: 2 }, { t: 'throw', n: 15 }],
    reward: { charm3: 5, water: 10, sparks: 6000, alatyr: 1, rod: 10 },
    outro: ru`Над капищем, где стоит твой защитник, ветер треплет знамя дружины. «Хорошо, — говорит Велимир. — Теперь капище знает твоё имя».` },
  { title: ru`Дух родной земли`, lvl: 22,
    intro: ru`В старых записях Ордена сказано: у каждого края есть свой дух-хранитель — Берегиня, Сполох, Жигуль, Тур, Хозяйка Медной горы, Бабр и Кутх. «Найди своего, — говорит Велимир. — Земля должна тебя признать».`,
    steps: [{ t: 'land', n: 1 }, { t: 'catch', n: 50 }, { t: 'photo', n: 3 }],
    reward: { incense: 3, charm2: 15, sparks: 7000, alatyr: 1, rod: 15 },
    outro: ru`Дух родной земли посмотрел на тебя долго и серьёзно, будто сверял с кем-то давно знакомым. А потом позволил сфотографировать себя — в Летописи это считается знаком доверия.` },
  { title: ru`Долгая дорога`, lvl: 24,
    intro: ru`Родники шепчут одно и то же слово: «ниже». Велимир достаёт карту подземных рек — старую, ещё дореволюционную. «Они текут под всей страной. Чтобы услышать их, придётся много ходить».`,
    steps: [{ t: 'walk', n: 20 }, { t: 'hatch', n: 5 }, { t: 'task', n: 5 }],
    reward: { charm3: 8, sparks: 8000, alatyr: 2, rod: 15 },
    outro: ru`Коконы, что ты носил в пути, вылупились с каплями воды на крыльях. «Подземная вода, — шепчет Велимир. — Мы близко».` },
  { title: ru`Подземные реки`, lvl: 25,
    intro: ru`Прислужники Нави перекрывают родники: хотят, чтобы подземные реки остановились и Навь затопила Явь. Духи воды тревожатся и собираются у фонтанов.`,
    steps: [{ t: 'catchEl', el: 'water', n: 20 }, { t: 'invasion', n: 8 }, { t: 'purify', n: 3 }],
    reward: { water: 15, incense: 3, sparks: 10000, alatyr: 2, rod: 20 },
    outro: ru`Из-под земли донёсся гул, похожий на дыхание огромного зверя. Родники вздрогнули и снова забили ключом. «Он проснулся», — только и сказал Велимир.` },
  { title: ru`Индрик-зверь`, lvl: 27,
    intro: ru`«Индрик-зверь всем зверям отец, — читает Велимир из Голубиной книги. — Ходит под землёю, как солнце по небу, прочищает реки и ручьи». Чтобы он поднялся в Явь, нужны сила разломов, мастерство Лиги и знамёна дружин.`,
    steps: [{ t: 'raid', n: 8 }, { t: 'league', n: 6 }, { t: 'defend', n: 5 }],
    reward: { charm3: 15, incense: 3, sparks: 15000, alatyr: 3, rod: 25 }, gift: 'indrik', emblem: 'horn',
    outro: ru`Земля мягко качнулась, и у ближайшего родника поднялся зверь с единственным рогом, сияющим, как лёд на солнце. Он опустил голову, и родник под ним засмеялся звонко, по-весеннему. <br><br><i>Конец третьей книги. Эмблема «Рог Индрика» открыта в облике Ловчего.</i>` },

  // ---------- Книга четвёртая «Осень Нави» (4.0) ----------
  { title: ru`Дубовая роща`, lvl: 28,
    intro: ru`Индрик ушёл под землю, а в скверах вдруг зашуршали Желудки — сотни круглых духов в шапочках. «Они не просто так проросли, — говорит Велимир, пересчитывая жёлуди в ладони. — Старые дубы помнят богатырей. Кто-то их будит».`,
    steps: [{ t: 'catchEl', el: 'forest', n: 15 }, { t: 'evolve', n: 3 }, { t: 'walk', n: 10 }],
    reward: { charm2: 15, honey: 10, sparks: 8000, alatyr: 2, rod: 15 },
    outro: ru`Самый старый Дубыня в роще склонил перед тобой ветви. «Святогор ворочается во сне, — прогудел он. — Горы трещат. Скоро и в городе почувствуют».` },
  { title: ru`Покровские туманы`, lvl: 29,
    intro: ru`Над городом легли туманы — густые, как молоко. Листопадницы кружат над дворами, а прислужники Нави прячутся в тумане у самых родников. «Покров должен укрыть землю, а не Навь», — хмурится Велимир.`,
    steps: [{ t: 'spring', n: 30 }, { t: 'invasion', n: 6 }, { t: 'catch', n: 60 }],
    reward: { charm3: 8, water: 10, sparks: 10000, alatyr: 2, rod: 20 },
    outro: ru`Туман рассеялся к утру, и на каждой крыше лежал тонкий иней — ровный, как вышивка. «Первый снег, — улыбнулся Велимир. — Значит, Покров за нас».` },
  { title: ru`Святогор`, lvl: 30,
    intro: ru`«Святогора не держит земля, — читает Велимир из старой былины. — Но если весь Орден встанет рядом, он сможет подняться». Нужна сила разломов, капищ и Лиги — всего, чему ты научился.`,
    steps: [{ t: 'raid', n: 10 }, { t: 'duel', n: 10 }, { t: 'league', n: 8 }],
    reward: { charm3: 20, incense: 5, sparks: 20000, alatyr: 4, rod: 30 }, gift: 'svyatogor', emblem: 'oak',
    outro: ru`Земля загудела, как колокол, и над окраиной поднялся богатырь ростом с телебашню — а потом стал маленьким, как все духи, и шагнул к тебе. «Спасибо, что разбудил, Ловчий, — сказал Святогор. — Теперь я постою за Русь рядом с тобой».` },

  // ---------- 4.16: книга пятая «Калинов мост» — Летопись идёт до 40 уровня Ловчего ----------
  { title: ru`Бел-горюч камень`, lvl: 31,
    intro: ru`Святогор сидит у костра на окраине и чертит на земле руны. «Посреди моря-океяна, на острове Буяне, лежит бел-горюч камень Алатырь, — гудит он. — В Тонкую ночь от него откололись осколки и упали в разломы. Кто держит осколок в ладони, может разбудить в духе силу, что спит глубже любого уровня».`,
    steps: [{ t: 'raid', n: 6 }, { t: 'spring', n: 40 }, { t: 'awaken', n: 1 }],
    reward: { charm3: 10, sparks: 12000, alatyr: 3, rod: 20 },
    outro: ru`Осколок в твоей ладони потеплел, и дух рядом с тобой вспыхнул ярче, чем когда-либо. «Вот она, сила Алатыря, — кивает Велимир. — Только осколков мало, а Навь ищет их тоже».` },
  { title: ru`Смородина-река`, lvl: 32,
    intro: ru`За городом, где кончаются фонари, туман пахнет гарью. Велимир показывает на старой карте огненную реку Смородину — границу между Явью и Навью. «Пока граница была прочной, реку никто не видел. А теперь она течёт прямо под окраинами».`,
    steps: [{ t: 'catchEl', el: 'fire', n: 25 }, { t: 'walk', n: 25 }, { t: 'invasion', n: 10 }],
    reward: { water: 10, incense: 3, sparks: 12000, alatyr: 3, rod: 25 },
    outro: ru`Над рекой из огня и дыма проступил мост — багряный, будто раскалённый. «Калинов мост, — шепчет Велимир. — Значит, и тот, кто его сторожит, где-то рядом».` },
  { title: ru`Застава богатырская`, lvl: 33,
    intro: ru`У моста Орден ставит заставу, как в былинах. Велимир созывает Ловчих: «Духи должны быть сильнее, чем когда-либо. Кто пройдёт по мосту без спроса, тот принесёт Навь в каждый двор».`,
    steps: [{ t: 'power', n: 30 }, { t: 'duel', n: 12 }, { t: 'evolve', n: 5 }],
    reward: { charm3: 10, honey: 10, sparks: 15000, alatyr: 3, rod: 25 },
    outro: ru`К утру над заставой взвились знамёна всех трёх дружин разом. «Сокол, Медведь и Волк на одной заставе, — улыбается Велимир. — Такого Летопись ещё не видела».` },
  { title: ru`Три головы`, lvl: 34,
    intro: ru`Ночью с моста донёсся спор на три голоса: «Пропустим!» — «Пусть сперва докажет!» — «Да помолчите вы оба!» Змей Горыныч, хранитель моста, не пускает никого — ни Навь, ни Орден. И у каждой головы своё испытание.`,
    steps: [{ t: 'raid', n: 12 }, { t: 'league', n: 10 }, { t: 'purify', n: 3 }],
    reward: { incense: 3, charm3: 10, sparks: 15000, alatyr: 4, rod: 30 },
    outro: ru`Первая голова признала силу разломов, вторая — мастерство Лиги, третья — доброе сердце. «Мы подумаем», — сказали все три хором и тут же отвернулись друг от друга.` },
  { title: ru`Остров Буян`, lvl: 36,
    intro: ru`Осколки Алатыря тянутся друг к другу, как железо к магниту. Велимир подвешивает их на нитке над картой — и все они указывают за мост. «Там остров Буян, — говорит он. — Дойти туда помогут коконы, поручения родников и знамёна дружин».`,
    steps: [{ t: 'hatch', n: 8 }, { t: 'task', n: 10 }, { t: 'defend', n: 6 }],
    reward: { water: 15, charm2: 20, sparks: 18000, alatyr: 4, rod: 35 },
    outro: ru`На рассвете в тумане проступил остров, а на нём — белый камень, тёплый, как печь. Трещины на камне светились там, где когда-то были осколки.` },
  { title: ru`Ночь на мосту`, lvl: 38,
    intro: ru`Кощей давно живёт в Яви, но Навь не забыла Тонкую ночь. В самую тёмную ночь года её войско двинулось к Калинову мосту. «Держать мост, — коротко говорит Велимир. — До рассвета».`,
    steps: [{ t: 'invasion', n: 15 }, { t: 'raid', n: 15 }, { t: 'catch', n: 150 }],
    reward: { charm3: 15, incense: 4, sparks: 20000, alatyr: 5, rod: 40 },
    outro: ru`Когда небо посветлело, на мосту остались только иней и тишина. Змей Горыныч сложил крылья над заставой и впервые за тысячу лет не спорил сам с собой.` },
  { title: ru`Калинов мост`, lvl: 40,
    intro: ru`Змей Горыныч ждёт на середине моста, и три головы смотрят на тебя по очереди. «Ты держал мост вместе с нами», — говорит первая. «Ты вернул камню его силу», — вторая. «Ты сильнее, чем думаешь», — третья. «Последнее испытание — и мы решим».`,
    steps: [{ t: 'raid', n: 20 }, { t: 'duel', n: 20 }, { t: 'league', n: 12 }],
    reward: { charm3: 20, incense: 5, sparks: 30000, alatyr: 8, rod: 60 }, gift: 'gorynych',
    outro: ru`«Решено», — сказали все три головы разом, и это был первый раз, когда они согласились. Змей стал маленьким, как все духи, и шагнул к тебе в оберег. Над Калиновым мостом взошло солнце, и граница между Явью и Навью снова стала прочной. <br><br><i>Конец пятой книги. Летопись Ордена записана до последней строки — до новых глав.</i>` },
];
// 4.16: книги Летописи (с какой главы начинается каждая) — для Книги Ордена и Пути Ловчего
const STORY_BOOKS = [
  { from: 0, title: ru`Книга первая` }, { from: 6, title: ru`Книга вторая «Игла Кощея»` }, { from: 12, title: ru`Книга третья «Земли Руси»` },
  { from: 18, title: ru`Книга четвёртая «Осень Нави»` }, { from: 21, title: ru`Книга пятая «Калинов мост»` },
];

const SHINY_RATE = 1 / 128;

/* ---------- События недели (меняются каждый понедельник) ---------- */
const WEEK_EVENTS = [
  { id: 'fire',    name: ru`Неделя Огня`,       el: 'fire' },
  { id: 'stars',   name: ru`Звездопад`,         xp: 2,  desc: ru`Двойной опыт за всё: поимку, родники, разломы и поединки.` },
  { id: 'water',   name: ru`Неделя Воды`,       el: 'water' },
  { id: 'springs', name: ru`Родниковая неделя`, loot: 2, cooldown: 3, desc: ru`Родники дают вдвое больше предметов и восстанавливаются за 3 минуты.` },
  { id: 'forest',  name: ru`Неделя Леса`,       el: 'forest' },
  { id: 'nav',     name: ru`Навья неделя`,      el: 'shadow', shiny: 2, desc: ru`Духи Тени повсюду, а сияющие встречаются вдвое чаще.` },
  { id: 'duels',   name: ru`Неделя поединков`,  duel: 2, desc: ru`Хранители капищ дают двойную награду.` },
  { id: 'wind',    name: ru`Неделя Ветра`,      el: 'wind' },
  { id: 'cocoons', name: ru`Неделя коконов`,    km: 2, desc: ru`Шаги для коконов и спутника считаются вдвое, коконы в родниках попадаются вдвое чаще.` },
  { id: 'current', name: ru`Неделя Тока`,       el: 'current' },
  { id: 'rifts',   name: ru`Неделя разломов`,   rifts: true, desc: ru`Великие разломы открываются втрое чаще, за победу — +3 оберега разлома.` },
];
WEEK_EVENTS.forEach(e => { if (e.el && !e.desc) e.desc = ru`Духи стихии «${ELEMENTS[e.el].name}» встречаются в 2,5 раза чаще и чаще охраняют разломы.`; });

/* ---------- Капища и хранители ---------- */
const SHRINE_GODS = [ru`Перуна`, ru`Велеса`, ru`Мокоши`, ru`Сварога`, ru`Даждьбога`, ru`Стрибога`, ru`Ярилы`, ru`Лады`, ru`Хорса`, ru`Рода`];
const GUARDIANS = [ru`Ярослава`, ru`Мирон`, ru`Всеслав`, ru`Любава`, ru`Добрыня`, ru`Злата`, ru`Ратибор`, ru`Василиса`, ru`Святогор`, ru`Забава`, ru`Остромир`, ru`Милена`];
const GUARD_COLORS = ['#dc2626', '#2563eb', '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#ca8a04', '#db2777'];
/* ---------- Дружины (3.5): Капища под знаменем ---------- */
const CLANS = {
  sokol:  { name: ru`Дружина Сокола`,  short: ru`Сокол`,   color: '#ef4444', motto: ru`Быстрота и отвага` },
  medved: { name: ru`Дружина Медведя`, short: ru`Медведь`, color: '#3b82f6', motto: ru`Сила и стойкость` },
  volk:   { name: ru`Дружина Волка`,   short: ru`Волк`,    color: '#eab308', motto: ru`Верность и чутьё` },
};
const CLAN_LEVEL = 5;     // с какого уровня выбирается дружина
const HOLD_MAX = 6;       // защитников на одном Капище
const HOLD_MY_MAX = 10;   // Капищ с моими защитниками одновременно
const TRIBUTE = { sparks: 100, charm: 1 }; // дань в день за каждое Капище с моим защитником

const SHRINE_TIERS = {
  1: { title: ru`Ученик`,     lvl: -3, speed: 0.85, shield: 0.35, xp: 800,  sparks: 300 },
  2: { title: ru`Мастер`,     lvl: 0,  speed: 0.7,  shield: 0.6,  xp: 1500, sparks: 600 },
  3: { title: ru`Старейшина`, lvl: 2,  speed: 0.58, shield: 0.85, xp: 3000, sparks: 1200 },
};
/* ---------- Праздники (v1.4) ---------- */
const HOLIDAYS = {
  svyatki:     { name: ru`Святки`,          desc: ru`Зимние праздники: Морозко и Снегурка выходят к людям, духи Ветра и Воды встречаются чаще, в родниках — подарки.`, el: ['wind', 'water'], loot: 1.5, seasonal: ['morozko', 'snegurka'] },
  maslenitsa:  { name: ru`Масленица`,       desc: ru`Провожаем зиму! Духи Огня встречаются вдвое чаще, в родниках много мёда («блинов»), опыт ×1,5.`, el: ['fire'], honey: true, xp: 1.5 },
  kupala:      { name: ru`Купальская ночь`, desc: ru`Цветёт папоротник: Купалинка повсюду, духи Огня, Воды и Леса чаще, ночью сияющие — вдвое чаще.`, el: ['fire', 'water', 'forest'], shinyNight: 2, seasonal: ['kupalinka'] },
  pokrov:      { name: ru`Покров`, desc: ru`Первые туманы и иней: духи Ветра и Воды встречаются чаще, Листопадница — повсюду, в родниках больше добычи.`, el: ['wind', 'water'], loot: 1.5, seasonal: ['listopadnica'] },
  veles:       { name: ru`Велесова ночь`,   desc: ru`Граница миров тоньше всего: духи Тени втрое чаще, в великих разломах ждёт Кощей, сияющие Тени вдвое чаще.`, el: ['shadow'], elMul: 3, koschey: true, shiny: 2 },
};

/* ---------- Вторжения Нави (v1.4) ---------- */
const GRUNT_QUOTES = [
  ru`Этот родник теперь принадлежит Нави!`,
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
    // 3.12: из Лавки Ордена (за златники) и с Золотой тропы — открываются покупкой, а не уровнем
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
    { id: 'needle', name: ru`Игла Кощея`, lvl: 1, story: 12 },
    { id: 'horn', name: ru`Рог Индрика`, lvl: 1, story: 18 },
    { id: 'oak', name: ru`Дубовый венок`, lvl: 1, story: 21 }, // 4.0: за четвёртую книгу Летописи
    { id: 'trail', name: ru`Знак Тропы`, lvl: 1, pass: true },
  ],
  // 4.6: облики-скины — полный наряд Ловчего (рисунки — js/skins-art.js); покупаются в Гардеробе за златники.
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
  // 4.6: фон и рамка карточки Ловчего (её видят все) — тоже в Гардеробе (рисунки — js/looks-art.js). lvl — открывается уровнем, shop — цена в златниках
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

/* ---------- 4.0: «Посвящение в Ловчие» — обучение ----------
   Пропустить нельзя: шаги ведёт сервер (S.d.tut — номер текущего шага, 0 — пройдено), после перезахода игра
   продолжает с того же места. kind: talk — сцена с Велимиром; ui — открыть раздел; catch — поймать учебного
   духа (sid); spring — зачерпнуть из родника; power — усилить духа. За каждую главу — награда. */
const TUT_CHAPTERS = [
  { title: ru`Тонкая ночь`,     reward: { charm: 5, sparks: 200, xp: 100 } },
  { title: ru`Первый дух`,      reward: { charm: 10, honey: 3, sparks: 300, xp: 300 } },
  { title: ru`Твои духи`,       reward: { sparks: 500, xp: 300 } },
  { title: ru`Родники`,         reward: { charm: 15, water: 3, xp: 400 } },
  { title: ru`Дорога Ловчего`,  reward: { incense: 1, sparks: 500, xp: 400 } },
  { title: ru`Клятва Ордена`,   reward: { charm: 20, honey: 5, water: 3, sparks: 1000, zlat: 20, xp: 1000 } },
];
const TUT = [
  { ch: 0, kind: 'talk', id: 'meet', lines: [
    ['n', ru`Ночь. Пустой двор. Фонарь над подъездом мигает, хотя ветра нет.`],
    ['n', ru`В луже у бордюра что-то светится — и смотрит на тебя.`],
    ['v', ru`Не бойся. Раз ты их видишь — значит, ты из наших.`],
    ['v', ru`Меня зовут <b>Велимир</b>. Я старший Ловчий <b>Ордена Оберега</b>. Мы бережём границу между Явью — нашим миром — и Навью, миром духов.`],
    ['you', ru`Духов? Каких ещё духов?`],
    ['v', ru`Тех, что прячутся в проводах, лужах и старых фонарях. В <b>Тонкую ночь</b> граница истончилась — и они хлынули в город.`] ] },
  { ch: 0, kind: 'talk', id: 'lore', lines: [
    ['v', ru`Духи не злые. Они растерялись: Навь тянет их обратно, а здесь им холодно и страшно.`],
    ['v', ru`Ловчий ловит духа <b>оберегом</b> — узелком с заговорённой травой. С тобой дух окрепнет и станет другом.`],
    ['v', ru`Но есть и те, кого Навь уже омрачила. Они бродят в <b>разломах</b>. А за всем этим стоит <b>Кощей</b>…`],
    ['you', ru`И что мне делать?`],
    ['v', ru`Учиться. Посвящение займёт немного времени, но пропустить его нельзя — Орден не пускает на улицы неподготовленных.`],
    ['v', ru`Смотри: рядом с тобой уже появился дух. Начнём!`] ] },
  { ch: 1, kind: 'catch', id: 'catch1', sid: 'vayfayka', hint: ru`Рядом появился дух — видишь светящийся круг на карте? <b>Коснись духа</b>, а потом <b>смахни оберег вверх</b>, прямо в него.` },
  { ch: 1, kind: 'talk', id: 'ring', lines: [
    ['v', ru`Поймал! Для первого раза — отлично.`],
    ['v', ru`Видел кольцо вокруг духа? Оно сжимается. Бросай, когда кольцо <b>маленькое</b> — выйдет «Отлично!»: больше опыта и выше шанс поймать.`],
    ['v', ru`Цвет кольца — это нрав духа: <b>зелёный</b> — покладистый, <b>красный</b> — упрямый. Упрямым помогают мёд и серебряные обереги.`],
    ['v', ru`Ещё один дух ждёт неподалёку. Попробуй попасть в маленькое кольцо!`] ] },
  { ch: 1, kind: 'catch', id: 'catch2', sid: 'mshonok', hint: ru`Второй учебный дух рядом. Коснись его и <b>дождись, пока кольцо станет маленьким</b> — тогда бросай!` },
  { ch: 2, kind: 'ui', id: 'menu', info: ru`Это меню Ордена — здесь все разделы. Пока открыто не всё: разделы откроются по ходу посвящения, подсвеченный — следующий.`, hint: ru`Каждый пойманный дух — твой. Открой <b>меню</b> — золотой оберег внизу экрана.` },
  { ch: 2, kind: 'ui', id: 'spirits', info: ru`Это твоя коллекция — все пойманные духи. Сверху — сортировка по силе, новизне и имени и фильтр по стихиям.`, hint: ru`Это разделы Ордена. Открой <b>«Духи»</b> — там твоя коллекция.` },
  { ch: 2, kind: 'ui', id: 'card', info: ru`Это карточка духа: сила, стихия, приёмы и семейство. Ниже — кнопки «Усилить» и «Превратить», а ещё можно сделать духа спутником.`, hint: ru`Коснись любого духа, чтобы открыть его <b>карточку</b>.` },
  { ch: 2, kind: 'power', id: 'power', hint: ru`На карточке — сила духа. Нажми <b>«Усилить»</b>: за искры и эссенцию дух станет сильнее. Эссенцию приносят поимки духов того же семейства.` },
  { ch: 2, kind: 'ui', id: 'dex', info: ru`Бестиарий — все виды духов. Пойманные видны целиком, встреченные — тенью. Коснись вида, чтобы прочитать о нём.`, hint: ru`Теперь загляни в <b>«Бестиарий»</b> (меню) — там все виды духов. Сколько найдёшь ты?` },
  { ch: 3, kind: 'talk', id: 'springs', lines: [
    ['v', ru`Обереги тратятся быстро. Пополняют их <b>родники</b> — старые колодцы, где бьёт живая сила.`],
    ['v', ru`Родники стоят у настоящих мест: памятников, фонтанов, храмов, арт-объектов. На карте это синие колодцы со столбом света.`],
    ['v', ru`Из родника выпадают обереги, мёд, живая вода, а иногда — <b>коконы</b> с духами внутри.`],
    ['v', ru`Стрелка вверху экрана покажет дорогу к ближайшему. Пойдём, прогуляемся!`] ] },
  { ch: 3, kind: 'spring', id: 'spring', hint: ru`Иди к роднику по <b>стрелке вверху</b> и коснись его, когда подойдёшь. Родники есть почти в каждом районе — если рядом нет, прогуляйся.` },
  { ch: 3, kind: 'ui', id: 'bag', info: ru`Сумка: обереги, мёд, живая вода и ладан. Сверху видно, сколько ещё поместится; лишнее можно выбросить.`, hint: ru`Добыча уже в <b>Сумке</b>. Открой меню → «Сумка» и посмотри, что у тебя есть.` },
  { ch: 4, kind: 'talk', id: 'road', lines: [
    ['v', ru`Ловчий — это ходок. Каждый пройденный шаг идёт в дело.`],
    ['v', ru`Твой первый дух идёт рядом с тобой — это <b>спутник</b>. В пути он находит эссенцию.`],
    ['v', ru`<b>Коконы</b> греются шагами: пройдёшь нужное расстояние — и из кокона вылупится дух.`],
    ['v', ru`Каждый день Орден даёт <b>задания</b>, а в <b>Летописи</b> записана наша история — глава за главой.`] ] },
  { ch: 4, kind: 'ui', id: 'cocoons', info: ru`Коконы греются шагами — одновременно можно греть три. Готовый кокон вылупится одним касанием.`, hint: ru`Открой меню → <b>«Коконы»</b>. Первый кокон уже греется — пройди 2 км, и он вылупится.` },
  { ch: 4, kind: 'ui', id: 'quests', info: ru`Здесь задания дня — они обновляются в полночь. Вкладка «Летопись» — сюжет Ордена: главы с наградами и легендарными духами.`, hint: ru`Открой <b>«Задания»</b> — там задания дня и Летопись Ордена.` },
  { ch: 4, kind: 'ui', id: 'path', info: ru`Путь Ловчего: что откроется на каждом уровне и какие награды ждут. Звания растут: Послушник, Ловчий, Следопыт, Ведун, Хранитель.`, hint: ru`И последнее: открой <b>«Путь»</b> в меню — там видно, что откроется на каждом уровне Ловчего.` },
  { ch: 5, kind: 'talk', id: 'oath', lines: [
    ['v', ru`Ты поймал первых духов, нашёл родник и знаешь, куда идти дальше.`],
    ['v', ru`Впереди — капища предков, разломы с боссами, Лига и дружины. Всё откроется, когда будешь готов.`],
    ['v', ru`Повторяй за мной — это клятва Ордена.`],
    ['you', ru`<b>Беречь духов. Беречь границу. Беречь друг друга.</b>`],
    ['v', ru`Добро пожаловать в Орден Оберега, Ловчий. Держи — это твоё первое снаряжение.`] ] },
];
