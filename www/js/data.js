'use strict';
/* ==========================================================================
   ДУХОЛОВ — данные игры: стихии, духи, предметы, уровни, задания
   ========================================================================== */

const ELEMENTS = {
  fire:    { name: 'Огонь', color: '#ff7a3d', beats: ['forest', 'shadow'], fast: 'Искра',       charge: 'Огненный вал' },
  water:   { name: 'Вода',  color: '#38bdf8', beats: ['fire', 'wind'],      fast: 'Брызги',      charge: 'Омут' },
  forest:  { name: 'Лес',   color: '#84cc16', beats: ['water', 'current'],  fast: 'Хлёст лозы',  charge: 'Корни земли' },
  wind:    { name: 'Ветер', color: '#a5b4fc', beats: ['shadow', 'fire'],    fast: 'Порыв',       charge: 'Смерч' },
  current: { name: 'Ток',   color: '#facc15', beats: ['water', 'wind'],     fast: 'Разряд',      charge: 'Короткое замыкание' },
  shadow:  { name: 'Тень',  color: '#c084fc', beats: ['current', 'forest'], fast: 'Морок',       charge: 'Полночный ужас' },
};
const ELEMENT_KEYS = Object.keys(ELEMENTS);
// Второй особый приём (v1.6): дешевле и слабее основного
Object.assign(ELEMENTS.fire, { charge2: 'Жар-вихрь' });
Object.assign(ELEMENTS.water, { charge2: 'Ледяная стрела' });
Object.assign(ELEMENTS.forest, { charge2: 'Колючий плющ' });
Object.assign(ELEMENTS.wind, { charge2: 'Воздушный серп' });
Object.assign(ELEMENTS.current, { charge2: 'Шаровая молния' });
Object.assign(ELEMENTS.shadow, { charge2: 'Теневая петля' });
const MOVES = { charge: { cost: 50, power: 65 }, charge2: { cost: 35, power: 42 } };
const MOVE2_COST = { sparks: 4000, essence: 30 };

/* ---------- Амулеты (v1.6): один на духа ---------- */
const AMULETS = {
  perun:  { name: 'Амулет Перуна',  desc: 'Атака духа в битвах +12%',               atk: 1.12,   color: '#facc15', glyph: 'M12 3l-5 9h4l-2 9 8-11h-5z' },
  mokosh: { name: 'Амулет Мокоши',  desc: 'Защита духа в битвах +12%',              def: 1.12,   color: '#c084fc', glyph: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z' },
  veles:  { name: 'Амулет Велеса',  desc: 'Здоровье духа в битвах +15%',            hp: 1.15,    color: '#84cc16', glyph: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z' },
  svarog: { name: 'Амулет Сварога', desc: 'Энергия в битвах копится на 25% быстрее', energy: 1.25, color: '#fb923c', glyph: 'M12 2c3 4 6 6 5 11a5 5 0 0 1-10 0c0-3 2-4 3-7 1 2 2 2 2-4z' },
  lada:   { name: 'Амулет Лады',    desc: 'Если дух — спутник, находки вдвое чаще',   buddy: 2,    color: '#f472b6', glyph: 'M12 4a8 8 0 1 0 0 16a6 6 0 1 1 0-16z' },
};
const AMULET_KEYS = Object.keys(AMULETS);

const RARITY = {
  1: { name: 'Обычный',     color: '#a8b3c7', base: 0.45, flee: 0.08 },
  2: { name: 'Необычный',   color: '#5eead4', base: 0.30, flee: 0.12 },
  3: { name: 'Редкий',      color: '#60a5fa', base: 0.18, flee: 0.15 },
  4: { name: 'Эпический',   color: '#c084fc', base: 0.10, flee: 0.20 },
  5: { name: 'Легендарный', color: '#fbbf24', base: 0.06, flee: 0.00 },
};

/* look: shape — форма тела; c1/c2 — цвета тела; c3 — акцент; eye — цвет свечения глаз;
   eyes/mouth — тип лица; back — детали позади тела; feats — детали поверх */
const SPECIES = [
  // ---------- ОГОНЬ ----------
  { id: 'ugolek', name: 'Уголёк', el: 'fire', rar: 1, stage: 1, fam: 'ugolek', evo: 'kostrovik', cost: 25, base: [118, 96, 110],
    desc: 'Рождается в остывших кострах и печных трубах. Любит сидеть на тёплых люках и греть лапки.',
    look: { shape: 'round', c1: '#ffb070', c2: '#e0531f', c3: '#ffd76a', eyes: 'round', mouth: 'smile', back: [], feats: ['flame', 'cheeks'] } },
  { id: 'kostrovik', name: 'Костровик', el: 'fire', rar: 2, stage: 2, fam: 'ugolek', evo: 'zharogriv', cost: 100, base: [168, 128, 150],
    desc: 'Сторож ночных костров. Если костёр бросили без присмотра — Костровик обидится и разгорится.',
    look: { shape: 'blob', c1: '#ff9a52', c2: '#c2330f', c3: '#ffd23f', eyes: 'angry', mouth: 'teeth', back: [], feats: ['flame', 'horns'] } },
  { id: 'zharogriv', name: 'Жарогрив', el: 'fire', rar: 3, stage: 3, fam: 'ugolek', base: [232, 176, 196],
    desc: 'Грива из живого пламени. Говорят, в Тонкую ночь именно Жарогривы не дали городу замёрзнуть.',
    look: { shape: 'tall', c1: '#ff8f4a', c2: '#a3260b', c3: '#ffcf40', eyes: 'angry', mouth: 'teeth', back: ['mane'], feats: ['horns', 'flame'] } },
  { id: 'domovoy', name: 'Домовой', el: 'fire', rar: 4, stage: 1, fam: 'domovoy', base: [190, 210, 220],
    desc: 'Хранитель очага. В новостройках ему неуютно, поэтому он бродит по дворам в поисках старой печки.',
    look: { shape: 'round', c1: '#c79a6b', c2: '#7a4b24', c3: '#f1f5f9', eyes: 'sleepy', mouth: 'none', back: [], feats: ['beard', 'hat'] } },
  { id: 'zharptica', name: 'Жар-птица', el: 'fire', rar: 5, stage: 1, fam: 'zharptica', legend: true, base: [286, 228, 250],
    desc: 'Легенда. Одно перо Жар-птицы освещает целый квартал. Появляется только в огненных разломах.',
    look: { shape: 'bird', c1: '#ffd166', c2: '#ef4444', c3: '#ff9f1c', eyes: 'round', mouth: 'beak', back: ['aura', 'tail', 'wings'], feats: ['crest'] } },

  // ---------- ВОДА ----------
  { id: 'kapelka', name: 'Капелька', el: 'water', rar: 1, stage: 1, fam: 'kapelka', evo: 'luzhnica', cost: 25, base: [102, 112, 124],
    desc: 'Появляется после дождя в каждой второй луже. Очень любопытна и совсем не боится зонтиков.',
    look: { shape: 'drop', c1: '#9be7ff', c2: '#2b8fd6', c3: '#e0f7ff', eyes: 'big', mouth: 'smile', back: [], feats: ['cheeks'] } },
  { id: 'luzhnica', name: 'Лужница', el: 'water', rar: 2, stage: 2, fam: 'kapelka', evo: 'vodyanoy', cost: 100, base: [150, 158, 170],
    desc: 'Растекается по тротуарам и отражает небо. Прохожие, наступившие в неё, весь день ходят с мокрыми ногами.',
    look: { shape: 'blob', c1: '#7dd3fc', c2: '#1d6fb8', c3: '#bae6fd', eyes: 'round', mouth: 'o', back: ['ripples'], feats: ['bubbles'] } },
  { id: 'vodyanoy', name: 'Водяной', el: 'water', rar: 3, stage: 3, fam: 'kapelka', base: [206, 214, 236],
    desc: 'Хозяин прудов, фонтанов и городских каналов. Ворчлив, но справедлив: утопленные телефоны иногда возвращает.',
    look: { shape: 'round', c1: '#6ee7b7', c2: '#0f766e', c3: '#a7f3d0', eyes: 'big', mouth: 'none', back: [], feats: ['beard', 'crown', 'whiskers'] } },
  { id: 'rusalka', name: 'Русалка', el: 'water', rar: 4, stage: 1, fam: 'rusalka', base: [214, 182, 196], time: 'night',
    desc: 'Поёт у набережных в лунные ночи. Её песня заставляет забыть, куда ты шёл.',
    look: { shape: 'ghost', c1: '#99f6e4', c2: '#0d9488', c3: '#34d399', eye: '#a5f3fc', eyes: 'glow', mouth: 'smile', back: ['hair'], feats: ['bubbles'] } },

  // ---------- ЛЕС ----------
  { id: 'mshonok', name: 'Мшонок', el: 'forest', rar: 1, stage: 1, fam: 'mshonok', evo: 'leshachok', cost: 25, base: [108, 118, 116],
    desc: 'Прорастает в трещинах асфальта. Если его полить — будет ходить за тобой хвостиком.',
    look: { shape: 'round', c1: '#a3e635', c2: '#4d7c0f', c3: '#86efac', eyes: 'round', mouth: 'smile', back: [], feats: ['sprout', 'cheeks'] } },
  { id: 'leshachok', name: 'Лешачок', el: 'forest', rar: 2, stage: 2, fam: 'mshonok', evo: 'leshiy', cost: 100, base: [156, 162, 150],
    desc: 'Путает дорожки в парках. Если ты трижды прошёл мимо одной скамейки — это он.',
    look: { shape: 'tall', c1: '#84cc16', c2: '#3f6212', c3: '#a16207', eyes: 'round', mouth: 'cat', back: [], feats: ['antlers', 'leaves'] } },
  { id: 'leshiy', name: 'Леший', el: 'forest', rar: 3, stage: 3, fam: 'mshonok', base: [214, 226, 210],
    desc: 'Древний хозяин леса. Скверы и бульвары считает своими владениями и строго следит за каждым деревом.',
    look: { shape: 'robe', c1: '#65a30d', c2: '#1a2e05', c3: '#78350f', eye: '#fde047', eyes: 'glow', mouth: 'none', back: [], feats: ['antlers', 'beard', 'leaves'] } },
  { id: 'kikimora', name: 'Кикимора', el: 'forest', rar: 3, stage: 1, fam: 'kikimora', base: [196, 150, 176], time: 'night',
    desc: 'Болотная проказница. Прячет ключи, путает провода наушников и хихикает из подвалов.',
    look: { shape: 'ghost', c1: '#bef264', c2: '#365314', c3: '#3f3a36', eye: '#f87171', eyes: 'many', mouth: 'teeth', back: ['hair'], feats: ['drops'] } },

  // ---------- ВЕТЕР ----------
  { id: 'skvoznyak', name: 'Сквозняк', el: 'wind', rar: 1, stage: 1, fam: 'skvoznyak', evo: 'vihrun', cost: 25, base: [122, 90, 104],
    desc: 'Хлопает форточками и дверями подъездов. Совершенно не умеет сидеть на месте.',
    look: { shape: 'wisp', c1: '#e0f2fe', c2: '#7dd3fc', c3: '#ffffff', eyes: 'sleepy', mouth: 'o', back: [], feats: ['swirl'] } },
  { id: 'vihrun', name: 'Вихрун', el: 'wind', rar: 2, stage: 2, fam: 'skvoznyak', evo: 'burevey', cost: 100, base: [176, 124, 140],
    desc: 'Закручивает листья и пакеты в маленькие смерчи. Обожает выворачивать зонты.',
    look: { shape: 'wisp', c1: '#bae6fd', c2: '#3b82f6', c3: '#f0f9ff', eyes: 'angry', mouth: 'smile', back: [], feats: ['swirl', 'ears'] } },
  { id: 'burevey', name: 'Буревей', el: 'wind', rar: 3, stage: 3, fam: 'skvoznyak', base: [240, 168, 188],
    desc: 'Повелитель бурь. Когда Буревей расправляет крылья, в городе отключают аттракционы.',
    look: { shape: 'bird', c1: '#93c5fd', c2: '#1e3a8a', c3: '#e0e7ff', eyes: 'angry', mouth: 'beak', back: ['tail', 'wings'], feats: ['crest', 'swirl'] } },
  { id: 'cherdachnik', name: 'Чердачник', el: 'wind', rar: 2, stage: 1, fam: 'cherdachnik', base: [150, 150, 160],
    desc: 'Живёт на чердаках, среди старых чемоданов. Шуршит, вздыхает и собирает потерянные вещи.',
    look: { shape: 'ghost', c1: '#d6d3d1', c2: '#57534e', c3: '#f5f5f4', eyes: 'sleepy', mouth: 'o', back: [], feats: ['cobweb', 'ears'] } },

  // ---------- ТОК ----------
  { id: 'vayfayka', name: 'Вайфайка', el: 'current', rar: 1, stage: 1, fam: 'vayfayka', evo: 'setevik', cost: 25, base: [116, 100, 108],
    desc: 'Новый дух, рождённый из бесплатного Wi‑Fi. Там, где он сидит, связь ловит на одну палочку лучше.',
    look: { shape: 'round', c1: '#c4b5fd', c2: '#6d28d9', c3: '#67e8f9', eyes: 'big', mouth: 'smile', back: [], feats: ['antenna', 'wifi', 'cheeks'] } },
  { id: 'setevik', name: 'Сетевик', el: 'current', rar: 2, stage: 2, fam: 'vayfayka', evo: 'gromovik', cost: 100, base: [166, 138, 144],
    desc: 'Плетёт невидимые сети между домами. Иногда путает пароли — просто из вредности.',
    look: { shape: 'box', c1: '#a78bfa', c2: '#4c1d95', c3: '#22d3ee', eyes: 'round', mouth: 'cat', back: [], feats: ['antenna', 'wifi', 'cables'] } },
  { id: 'gromovik', name: 'Громовик', el: 'current', rar: 3, stage: 3, fam: 'vayfayka', base: [236, 170, 186],
    desc: 'Дух грозы и высоковольтных линий. Одним чихом способен обесточить целый район.',
    look: { shape: 'tall', c1: '#fef08a', c2: '#ca8a04', c3: '#a78bfa', eyes: 'angry', mouth: 'teeth', back: [], feats: ['bolt', 'horns', 'antenna'] } },
  { id: 'tramvaynik', name: 'Трамвайник', el: 'current', rar: 3, stage: 1, fam: 'tramvaynik', base: [184, 206, 204],
    desc: 'Дух последнего трамвая. Звенит на пустых остановках и подвозит тех, кто опоздал.',
    look: { shape: 'box', c1: '#fca5a5', c2: '#b91c1c', c3: '#fde047', eyes: 'big', mouth: 'smile', back: [], feats: ['pantograph', 'stripe'] } },
  { id: 'fonarnik', name: 'Фонарник', el: 'current', rar: 2, stage: 1, fam: 'fonarnik', base: [148, 162, 150], time: 'night',
    desc: 'Зажигает уличные фонари в сумерках. Мигающий фонарь — значит, Фонарник рядом и ему скучно.',
    look: { shape: 'tall', c1: '#64748b', c2: '#1e293b', c3: '#fde047', eyes: 'glow', mouth: 'none', back: [], feats: ['lamp'] } },

  // ---------- ТЕНЬ ----------
  { id: 'shoroh', name: 'Шорох', el: 'shadow', rar: 1, stage: 1, fam: 'shoroh', evo: 'babayka', cost: 25, base: [120, 94, 102], time: 'night',
    desc: 'Тот самый звук за спиной в пустом подъезде. На самом деле очень застенчив.',
    look: { shape: 'ghost', c1: '#7e3bb8', c2: '#1e0b36', c3: '#e879f9', eyes: 'glow', mouth: 'none', back: [], feats: [] } },
  { id: 'babayka', name: 'Бабайка', el: 'shadow', rar: 2, stage: 2, fam: 'shoroh', evo: 'babay', cost: 100, base: [172, 126, 142],
    desc: 'Прячется под кроватями и в тёмных арках. Питается страхами, но больше всего любит печенье.',
    look: { shape: 'blob', c1: '#5b2aa8', c2: '#1a0b2e', c3: '#f472b6', eye: '#f472b6', eyes: 'many', mouth: 'teeth', back: [], feats: ['ears'] } },
  { id: 'babay', name: 'Бабай', el: 'shadow', rar: 3, stage: 3, fam: 'shoroh', base: [238, 160, 190],
    desc: 'Ходит по ночным дворам с огромным мешком. Что в мешке — не знает даже Орден.',
    look: { shape: 'robe', c1: '#4a1480', c2: '#0f0518', c3: '#f43f5e', eye: '#f43f5e', eyes: 'glow', mouth: 'teeth', back: [], feats: ['horns', 'bag'] } },
  { id: 'navka', name: 'Навка', el: 'shadow', rar: 4, stage: 1, fam: 'navka', base: [222, 176, 180], time: 'night',
    desc: 'Вестница из Нави, мира по ту сторону. Приходит туда, где граница тоньше всего.',
    look: { shape: 'ghost', c1: '#e2e8f0', c2: '#64748b', c3: '#cbd5e1', eye: '#67e8f9', eyes: 'glow', mouth: 'none', back: ['hair'], feats: [] } },
  { id: 'koschey', name: 'Кощей', el: 'shadow', rar: 5, stage: 1, fam: 'koschey', legend: true, base: [294, 232, 236],
    desc: 'Легенда. Бессмертный царь Нави. Именно он истончил границу миров в Тонкую ночь. Ищи его в тёмных разломах.',
    look: { shape: 'robe', c1: '#475569', c2: '#0f172a', c3: '#4ade80', eye: '#4ade80', eyes: 'glow', mouth: 'teeth', back: ['aura'], feats: ['crown', 'bones', 'runes'] } },

  // ---------- v1.3: новые духи ----------
  { id: 'bannik', name: 'Банник', el: 'water', rar: 3, stage: 1, fam: 'bannik', base: [178, 212, 214],
    desc: 'Хозяин бань и саун. Любит пар погорячее и не терпит, когда парятся после полуночи.',
    look: { shape: 'round', c1: '#f5b38b', c2: '#9a4a2a', c3: '#e5e7eb', eyes: 'sleepy', mouth: 'none', back: ['steam'], feats: ['beard', 'broom'] } },
  { id: 'poludnica', name: 'Полудница', el: 'fire', rar: 3, stage: 1, fam: 'poludnica', base: [220, 160, 170], time: 'day',
    desc: 'Появляется в самый зной, около полудня. Спрашивает загадки и не любит, когда работают в жару.',
    look: { shape: 'robe', c1: '#fde68a', c2: '#b45309', c3: '#fbbf24', eye: '#fff7ed', eyes: 'glow', mouth: 'none', back: ['halo', 'hair'], feats: [] } },
  { id: 'polevik', name: 'Полевик', el: 'forest', rar: 2, stage: 1, fam: 'polevik', base: [150, 158, 164],
    desc: 'Дух полей и пустырей. В городе живёт на газонах и клумбах, считает каждый колосок.',
    look: { shape: 'tall', c1: '#d9f99d', c2: '#65a30d', c3: '#eab308', eyes: 'round', mouth: 'smile', back: ['wheat'], feats: ['whiskers'] } },
  { id: 'yrka', name: 'Ырка', el: 'shadow', rar: 3, stage: 1, fam: 'yrka', base: [214, 140, 160], time: 'night',
    desc: 'Ночной дух пустырей с горящими глазами. Боится огня и громких песен.',
    look: { shape: 'ghost', c1: '#94a3b8', c2: '#1e293b', c3: '#f87171', eye: '#fb923c', eyes: 'glow', mouth: 'teeth', back: [], feats: ['runes'] } },
  { id: 'paketik', name: 'Пакетик', el: 'wind', rar: 1, stage: 1, fam: 'paketik', evo: 'shurshun', cost: 50, base: [112, 96, 118],
    desc: 'Городской дух, рождённый из пакета, который ветер носит по дворам. Мечтает долететь до облаков.',
    look: { shape: 'bag', c1: '#f8fafc', c2: '#94a3b8', c3: '#cbd5e1', eyes: 'big', mouth: 'o', back: ['handles'], feats: ['swirl'] } },
  { id: 'shurshun', name: 'Шуршун', el: 'wind', rar: 2, stage: 2, fam: 'paketik', base: [180, 138, 150],
    desc: 'Выросший Пакетик. Шуршит так громко, что соседи думают, будто на чердаке кто-то живёт.',
    look: { shape: 'bag', c1: '#e0f2fe', c2: '#475569', c3: '#7dd3fc', eyes: 'angry', mouth: 'cat', back: ['handles'], feats: ['swirl', 'bubbles'] } },
  { id: 'metrovik', name: 'Метровик', el: 'current', rar: 2, stage: 1, fam: 'metrovik', base: [160, 170, 158],
    desc: 'Дух подземки. Знает все тоннели и первым слышит, что поезд подходит к станции.',
    look: { shape: 'box', c1: '#93c5fd', c2: '#1e3a8a', c3: '#ef4444', eye: '#fde047', eyes: 'glow', mouth: 'none', back: ['sign'], feats: ['stripe'] } },
  { id: 'sirin', name: 'Сирин', el: 'shadow', rar: 4, stage: 1, fam: 'sirin', base: [226, 190, 196], region: 'west',
    desc: 'Вещая птица с девичьим лицом. Её печальная песня слышна только на западе, до 40° в. д.',
    look: { shape: 'bird', c1: '#e9d5ff', c2: '#6b21a8', c3: '#1e1b4b', eyes: 'sleepy', mouth: 'smile', back: ['tail', 'wings', 'hair'], feats: ['crown'] } },
  { id: 'alkonost', name: 'Алконост', el: 'water', rar: 4, stage: 1, fam: 'alkonost', base: [210, 206, 204], region: 'center',
    desc: 'Райская птица радости. Вьёт гнёзда у тёплых морей, встречается между 40° и 90° в. д.',
    look: { shape: 'bird', c1: '#a5f3fc', c2: '#0e7490', c3: '#fde047', eyes: 'round', mouth: 'smile', back: ['tail', 'wings', 'hair'], feats: ['crown'] } },
  { id: 'gamayun', name: 'Гамаюн', el: 'wind', rar: 4, stage: 1, fam: 'gamayun', base: [218, 196, 200], region: 'east',
    desc: 'Птица-вестница, знающая всё на свете. Прилетает только на восток, дальше 90° в. д.',
    look: { shape: 'bird', c1: '#c7d2fe', c2: '#3730a3', c3: '#f472b6', eye: '#f9a8d4', eyes: 'glow', mouth: 'none', back: ['tail', 'wings', 'hair'], feats: ['crest'] } },
  { id: 'gorynych', name: 'Змей Горыныч', el: 'fire', rar: 5, stage: 1, fam: 'gorynych', legend: true, base: [300, 220, 244],
    desc: 'Легенда. Трёхголовый змей, хранитель Калинова моста. Головы вечно спорят, какая из них главная.',
    look: { shape: 'blob', c1: '#4ade80', c2: '#14532d', c3: '#f97316', eyes: 'angry', mouth: 'teeth', back: ['aura', 'wings', 'heads3'], feats: ['horns'] } },

  // ---------- v1.4: сезонные духи ----------
  { id: 'morozko', name: 'Морозко', el: 'wind', rar: 4, stage: 1, fam: 'morozko', base: [224, 214, 206], season: 'winter',
    desc: 'Зимний дух в инеевой шубе. Рисует узоры на окнах и проверяет, тепло ли тебе, девица. Появляется только зимой.',
    look: { shape: 'robe', c1: '#e0f2fe', c2: '#1d4ed8', c3: '#f8fafc', eye: '#2563eb', eyes: 'glow', mouth: 'none', back: ['aura'], feats: ['beard', 'crown'] } },
  { id: 'snegurka', name: 'Снегурка', el: 'water', rar: 3, stage: 1, fam: 'snegurka', base: [190, 196, 202], season: 'winter',
    desc: 'Девочка из снега. Боится костров и тёплых батарей, зато на катке ей нет равных. Появляется только зимой.',
    look: { shape: 'ghost', c1: '#f0f9ff', c2: '#38bdf8', c3: '#bfdbfe', eyes: 'big', mouth: 'smile', back: ['hair'], feats: ['crown', 'cheeks'] } },
  { id: 'kupalinka', name: 'Купалинка', el: 'forest', rar: 3, stage: 1, fam: 'kupalinka', base: [196, 188, 194], season: 'kupala',
    desc: 'Дух цветущего папоротника. Показывается летом, а в Купальскую ночь — повсюду.',
    look: { shape: 'drop', c1: '#bbf7d0', c2: '#15803d', c3: '#f472b6', eyes: 'round', mouth: 'smile', back: ['aura'], feats: ['sprout', 'cheeks', 'leaves'] } },

  // ---------- v1.7 ----------
  { id: 'tenka', name: 'Тенька', el: 'shadow', rar: 1, stage: 1, fam: 'tenka', evo: 'sumrak', cost: 25, base: [114, 98, 108],
    desc: 'Маленькая тень, которая отстала от хозяина. Прячется под скамейками и повторяет чужие движения.',
    look: { shape: 'ghost', c1: '#475569', c2: '#0f172a', c3: '#a5b4fc', eye: '#e0e7ff', eyes: 'glow', mouth: 'o', back: [], feats: ['cheeks'] } },
  { id: 'sumrak', name: 'Сумрак', el: 'shadow', rar: 2, stage: 2, fam: 'tenka', evo: 'morok', cost: 100, base: [166, 132, 146],
    desc: 'Приходит вместе с вечером и гасит краски улиц. Фонарники его недолюбливают.',
    look: { shape: 'wisp', c1: '#6366f1', c2: '#1e1b4b', c3: '#c7d2fe', eye: '#a5b4fc', eyes: 'glow', mouth: 'none', back: [], feats: ['swirl'] } },
  { id: 'morok', name: 'Морок', el: 'shadow', rar: 3, stage: 3, fam: 'tenka', base: [234, 168, 184],
    desc: 'Мастер наваждений. Может заставить весь двор увидеть один и тот же сон.',
    look: { shape: 'robe', c1: '#4338ca', c2: '#0b0a1f', c3: '#818cf8', eye: '#c7d2fe', eyes: 'many', mouth: 'none', back: ['aura', 'hair'], feats: ['runes'] } },
  { id: 'bayun', name: 'Кот Баюн', el: 'shadow', rar: 4, stage: 1, fam: 'bayun', base: [216, 196, 210],
    desc: 'Сказочный кот-сказитель. Мурлычет так, что засыпают даже Громовики. Живёт на высоких фонарях.',
    look: { shape: 'round', c1: '#9ca3af', c2: '#374151', c3: '#f9a8d4', eye: '#86efac', eyes: 'glow', mouth: 'cat', back: ['cattail', 'ears'], feats: ['whiskers'] } },
  { id: 'volk', name: 'Серый Волк', el: 'forest', rar: 3, stage: 1, fam: 'volk', base: [220, 172, 190],
    desc: 'Верный помощник царевичей. Бегает быстрее электрички и знает все короткие пути через парки.',
    look: { shape: 'blob', c1: '#9ca3af', c2: '#4b5563', c3: '#e5e7eb', eyes: 'angry', mouth: 'none', back: ['ears', 'cattail'], feats: ['snout'] } },
  { id: 'liho', name: 'Лихо Одноглазое', el: 'shadow', rar: 3, stage: 1, fam: 'liho', base: [226, 150, 176], time: 'night',
    desc: 'Не буди Лихо, пока оно тихо. Одним глазом видит все твои неудачи — и немного их подбрасывает.',
    look: { shape: 'tall', c1: '#78716c', c2: '#292524', c3: '#fbbf24', eyes: 'one', mouth: 'teeth', back: ['horns'], feats: [] } },
  { id: 'samokatnik', name: 'Самокатник', el: 'current', rar: 2, stage: 1, fam: 'samokatnik', base: [170, 136, 146],
    desc: 'Дух брошенных самокатов. Носится по тротуарам и звенит, когда его забывают зарядить.',
    look: { shape: 'box', c1: '#6ee7b7', c2: '#047857', c3: '#fde047', eyes: 'big', mouth: 'smile', back: ['handlebar'], feats: ['wheels'] } },
  { id: 'kurernik', name: 'Курьерник', el: 'wind', rar: 2, stage: 1, fam: 'kurernik', base: [158, 150, 156],
    desc: 'Дух доставки. Всегда «будет через 5 минут». Путает подъезды, зато никогда не опаздывает на встречу с Ловчим.',
    look: { shape: 'round', c1: '#fdba74', c2: '#c2410c', c3: '#fef3c7', eyes: 'round', mouth: 'smile', back: ['backpack'], feats: ['hat', 'cheeks'] } },

  // ---------- v3.8: духи родных земель — у каждого края России свой ----------
  { id: 'bereginya', name: 'Берегиня', el: 'water', rar: 4, stage: 1, fam: 'bereginya', base: [206, 214, 208], land: 'center',
    desc: 'Хранительница речных берегов и бродов. Живёт в Центре и на Северо-Западе — от Калининграда до Нижнего Новгорода.',
    look: { shape: 'robe', c1: '#bae6fd', c2: '#0369a1', c3: '#fef08a', eyes: 'sleepy', mouth: 'smile', back: ['hair', 'halo'], feats: ['crown'] } },
  { id: 'spoloh', name: 'Сполох', el: 'wind', rar: 4, stage: 1, fam: 'spoloh', base: [222, 188, 196], land: 'north',
    desc: 'Дух северного сияния. Пляшет над тундрой и Белым морем, а в полярную ночь спускается к самым крышам. Только на Севере.',
    look: { shape: 'wisp', c1: '#86efac', c2: '#0f766e', c3: '#c084fc', eyes: 'glow', mouth: 'none', back: ['aura', 'ripples'], feats: ['swirl'] } },
  { id: 'zhigul', name: 'Жигуль', el: 'forest', rar: 4, stage: 1, fam: 'zhigul', base: [214, 216, 200], land: 'volga',
    desc: 'Лесной великан Жигулёвских гор. Сторожит излучину Волги и гудит, как пароход. Водится в Поволжье.',
    look: { shape: 'tall', c1: '#a3e635', c2: '#365314', c3: '#b45309', eyes: 'round', mouth: 'teeth', back: ['antlers', 'sprout'], feats: ['leaves'] } },
  { id: 'tur', name: 'Горный Тур', el: 'wind', rar: 4, stage: 1, fam: 'tur', base: [226, 200, 186], land: 'caucasus',
    desc: 'Дух горных круч, скачет по скалам выше облаков. Встречается на Юге России и на Кавказе.',
    look: { shape: 'round', c1: '#e7e5e4', c2: '#57534e', c3: '#a8a29e', eyes: 'angry', mouth: 'none', back: ['horns', 'mane'], feats: ['snout', 'beard'] } },
  { id: 'mednaya', name: 'Хозяйка Медной горы', el: 'current', rar: 4, stage: 1, fam: 'mednaya', base: [218, 204, 198], land: 'ural',
    desc: 'Владычица уральских недр: хранит малахит, медь и самоцветы. Показывается только на Урале.',
    look: { shape: 'robe', c1: '#34d399', c2: '#065f46', c3: '#f59e0b', eye: '#fde047', eyes: 'glow', mouth: 'smile', back: ['hair', 'aura'], feats: ['crown', 'runes'] } },
  { id: 'babr', name: 'Бабр', el: 'fire', rar: 4, stage: 1, fam: 'babr', base: [232, 180, 196], land: 'siberia',
    desc: 'Огненный зверь сибирской тайги — тот самый, что держит соболя на гербе Иркутска. Водится в Сибири.',
    look: { shape: 'round', c1: '#fb923c', c2: '#7c2d12', c3: '#1c1917', eyes: 'angry', mouth: 'teeth', back: ['cattail', 'ears'], feats: ['whiskers'] } },
  { id: 'kutkh', name: 'Кутх', el: 'shadow', rar: 4, stage: 1, fam: 'kutkh', base: [220, 190, 200], land: 'fareast',
    desc: 'Ворон-творец из сказаний Камчатки: говорят, это он вытащил землю из моря. Прилетает только на Дальний Восток.',
    look: { shape: 'bird', c1: '#64748b', c2: '#0f172a', c3: '#f59e0b', eye: '#fbbf24', eyes: 'glow', mouth: 'beak', back: ['wings', 'tail'], feats: ['crest'] } },

  // ---------- v3.9: легенда третьей книги Летописи (только награда, в разломах не встречается) ----------
  { id: 'indrik', name: 'Индрик-зверь', el: 'water', rar: 5, stage: 1, fam: 'indrik', legend: true, story: true, base: [292, 244, 256],
    desc: 'Легенда. Всем зверям отец: ходит под землёй, как солнце по небу, и прочищает подземные реки, чтобы родники не иссякли.',
    look: { shape: 'blob', c1: '#e0e7ff', c2: '#4338ca', c3: '#67e8f9', eye: '#a5f3fc', eyes: 'glow', mouth: 'none', back: ['aura', 'mane', 'tail', 'unihorn'], feats: [] } },
];
// Земли России для духов родных земель (грубо, по широте и долготе)
const LANDS = {
  center:   { name: 'Центр и Северо-Запад', where: 'западнее 44° в. д., от Кавказа до 64° с. ш.' },
  north:    { name: 'Север',                where: 'севернее 64° с. ш.' },
  volga:    { name: 'Поволжье',             where: '44–55° в. д.' },
  caucasus: { name: 'Юг и Кавказ',          where: 'южнее 46,5° с. ш., 36–55° в. д.' },
  ural:     { name: 'Урал',                 where: '55–66° в. д.' },
  siberia:  { name: 'Сибирь',               where: '66–105° в. д.' },
  fareast:  { name: 'Дальний Восток',       where: 'восточнее 105° в. д.' },
};
const REGIONS = {
  west:   { name: 'Запад',  range: 'до 40° в. д.' },
  center: { name: 'Центр',  range: '40–90° в. д.' },
  east:   { name: 'Восток', range: 'от 90° в. д.' },
};
SPECIES.forEach((s, i) => { s.num = i + 1; });
const SP = Object.fromEntries(SPECIES.map(s => [s.id, s]));

const ITEMS = {
  charm:   { name: 'Оберег',             desc: 'Узелок с заговорённой травой. Бросай в духа, чтобы поймать.', mult: 1,   throwable: true },
  charm2:  { name: 'Серебряный оберег',  desc: 'Серебро держит духов крепче. Шанс поимки ×1,5.',              mult: 1.5, throwable: true, unlock: 8 },
  charm3:  { name: 'Золотой оберег',     desc: 'Лучший оберег Ордена. Шанс поимки ×2.',                        mult: 2,   throwable: true, unlock: 16 },
  honey:   { name: 'Мёд',                desc: 'Духи обожают мёд. Успокаивает духа: шанс поимки ×1,5 на один бросок.' },
  water:   { name: 'Живая вода',         desc: 'Восстанавливает половину сил духа прямо во время битвы в разломе.' },
  incense: { name: 'Ладан',              desc: 'Дымок приманивает духов: 30 минут их вокруг вдвое больше.' },
  farpass: { name: 'Дальний пропуск',    desc: 'Грамота Ордена: закрыть Разлом до 5 км от тебя, не подходя к нему. Один Орден дарит каждый день.' },
  gift:    { name: 'Подарок',           desc: 'Узелок для друга: обереги, мёд, иногда кокон. Отправляется в «Меню → Друзья», раз в день каждому.' },
};
const GIFT_LIMIT = 10;

/* ---------- Дружба (v1.8) ---------- */
const FRIEND_LEVELS = [
  { name: 'Знакомый', pts: 0 },
  { name: 'Приятель', pts: 3, xp: 500 },
  { name: 'Друг', pts: 10, xp: 1500 },
  { name: 'Лучший друг', pts: 30, xp: 4000 },
  { name: 'Побратим', pts: 60, xp: 10000 },
];
const BAG_LIMIT = 350;

const COCOON_TIERS = {
  2:  { name: 'Зелёный кокон',  color: '#86efac', pool: { 1: 1 } },
  5:  { name: 'Синий кокон',    color: '#7dd3fc', pool: { 1: 3, 2: 4, 3: 1 } },
  10: { name: 'Лиловый кокон',  color: '#d8b4fe', pool: { 2: 2, 3: 3, 4: 2 } },
};

function levelXP(n) { return n <= 1 ? 0 : Math.round(400 * Math.pow(n - 1, 1.75) / 50) * 50; }
const MAX_LEVEL = 40;

const QUEST_TEMPLATES = [
  { t: 'catch',   min: 5, max: 10, text: n => `Поймай ${n} духов`,                 reward: { charm: 8, sparks: 300 } },
  { t: 'catchEl', min: 2, max: 3,  text: (n, el) => `Поймай ${n} духов стихии «${ELEMENTS[el].name}»`, reward: { honey: 3, sparks: 400 } },
  { t: 'spring',  min: 3, max: 5,  text: n => `Зачерпни силы из ${n} родников`,     reward: { charm: 5, water: 2 } },
  { t: 'throw',   min: 2, max: 4,  text: n => `Сделай ${n} отличных бросков`,       reward: { honey: 2, sparks: 300 } },
  { t: 'walk',    min: 1, max: 2,  text: n => `Пройди ${n} км`,                     reward: { charm: 10, sparks: 500 } },
  { t: 'power',   min: 2, max: 4,  text: n => `Усиль духов ${n} раз(а)`,            reward: { water: 3, sparks: 200 } },
  { t: 'evolve',  min: 1, max: 1,  text: () => `Преврати одного духа`,              reward: { incense: 1 } },
  { t: 'raid',    min: 1, max: 1,  text: () => `Закрой разлом`,                     reward: { charm2: 5, sparks: 800 } },
];

/* ---------- Поручения из родников (3.2): задание → встреча с духом ---------- */
// tier: 1 — лёгкое (обычные и необычные духи), 2 — среднее (необычные и редкие), 3 — трудное (редкие и эпические)
const TASK_TEMPLATES = [
  { t: 'catch',    tier: 1, min: 5, max: 8, text: n => `Поймай ${n} духов` },
  { t: 'spring',   tier: 1, min: 3, max: 5, text: n => `Зачерпни силы из ${n} родников` },
  { t: 'power',    tier: 1, min: 3, max: 5, text: n => `Усиль духов ${n} раз(а)` },
  { t: 'photo',    tier: 1, min: 1, max: 1, text: () => 'Сфотографируй духа во время встречи' },
  { t: 'catchEl',  tier: 2, min: 3, max: 5, text: (n, el) => `Поймай ${n} духов стихии «${ELEMENTS[el].name}»` },
  { t: 'throw',    tier: 2, min: 3, max: 5, text: n => `Сделай ${n} отличных бросков` },
  { t: 'walk',     tier: 2, min: 1, max: 2, text: n => `Пройди ${n} км` },
  { t: 'evolve',   tier: 2, min: 1, max: 1, text: () => 'Преврати духа' },
  { t: 'duel',     tier: 2, min: 1, max: 1, lvl: 3, text: () => 'Победи хранителя капища' },
  { t: 'hatch',    tier: 3, min: 1, max: 1, text: () => 'Выведи духа из кокона' },
  { t: 'invasion', tier: 3, min: 1, max: 1, lvl: 4, text: () => 'Освободи родник от прислужников Нави' },
  { t: 'raid',     tier: 3, min: 1, max: 1, lvl: 5, text: () => 'Закрой разлом' },
];
const TASK_TIERS = {
  1: { rar: [1, 2], lvl: 12, reward: { charm: 3 } },
  2: { rar: [2, 3], lvl: 18, reward: { charm: 5, honey: 1 } },
  3: { rar: [3, 4], lvl: 25, reward: { charm2: 3, honey: 2 } },
};
const TASK_LIMIT = 5;


const LORE = [
  '2031 год. Геомагнитная буря, которую потом назовут <b>Тонкой ночью</b>, истончила границу между Явью — нашим миром — и Навью, миром духов.',
  'Теперь по улицам бродят духи. Древние — Леший, Водяной, Домовой. И новые, рождённые городом: Вайфайка, Трамвайник, Фонарник.',
  'Древний <b>Орден Оберега</b> снова набирает Ловчих. Твоя задача — находить духов, ловить их оберегами, черпать силу из родников и закрывать разломы, откуда лезет всё самое опасное.',
];

/* ---------- Погода: усиливает стихии ---------- */
const WEATHER = {
  clear:    { name: 'Ясно',                   boost: ['fire', 'forest'] },
  partly:   { name: 'Переменная облачность',  boost: ['wind', 'forest'] },
  overcast: { name: 'Пасмурно',               boost: ['shadow', 'current'] },
  fog:      { name: 'Туман',                  boost: ['shadow', 'water'], fx: 'fog' },
  rain:     { name: 'Дождь',                  boost: ['water', 'current'], fx: 'rain' },
  snow:     { name: 'Снег',                   boost: ['wind', 'water'], fx: 'snow' },
  storm:    { name: 'Гроза',                  boost: ['current', 'shadow'], fx: 'rain' },
  windy:    { name: 'Ветрено',                boost: ['wind', 'fire'], fx: 'wind' },
};
const MOON_EVENTS = {
  full: { name: 'Полнолуние', desc: 'Ночью духи Тени и Воды встречаются чаще, а Русалки и Навки выходят к людям.' },
  new:  { name: 'Новолуние',  desc: 'В безлунную ночь сияющие духи встречаются вдвое чаще.' },
};

/* ---------- Знаки Ордена (медали) ---------- */
const MEDAL_TIERS = [
  { name: 'Бронза', color: '#d97706', xp: 500 },
  { name: 'Серебро', color: '#cbd5e1', xp: 1500 },
  { name: 'Золото', color: '#fbbf24', xp: 5000 },
];
const MEDALS = [
  { id: 'catcher', name: 'Ловчий',        desc: 'Поймай духов',                 stat: 'caught',      tiers: [10, 100, 1000] },
  { id: 'walker',  name: 'Странник',      desc: 'Пройди километров',            stat: 'km',          tiers: [10, 100, 1000] },
  { id: 'springs', name: 'Водонос',       desc: 'Зачерпни силы из родников',    stat: 'springs',     tiers: [30, 300, 2000] },
  { id: 'raids',   name: 'Затворник',     desc: 'Закрой разломов',              stat: 'raids',       tiers: [3, 30, 200] },
  { id: 'dex',     name: 'Летописец',     desc: 'Видов духов в бестиарии',      stat: 'dex',         tiers: [5, 20, SPECIES.length] },
  { id: 'purify',  name: 'Очиститель',    desc: 'Победи прислужников Нави',     stat: 'invasions',   tiers: [3, 30, 200] },
  { id: 'trade',   name: 'Щедрая душа',   desc: 'Передай или получи духов',     stat: 'traded',      tiers: [1, 10, 50] },
  { id: 'throws',  name: 'Меткий глаз',   desc: 'Отличных бросков',             stat: 'throwsGreat', tiers: [20, 200, 1000] },
  { id: 'hatch',   name: 'Наседка',       desc: 'Вылупи духов из коконов',      stat: 'hatched',     tiers: [3, 30, 200] },
  { id: 'evolve',  name: 'Алхимик',       desc: 'Преврати духов',               stat: 'evolved',     tiers: [3, 30, 200] },
  { id: 'shiny',   name: 'Искатель сияния', desc: 'Поймай сияющих духов',       stat: 'shiny',       tiers: [1, 10, 50] },
  { id: 'streak',  name: 'Верность',      desc: 'Дней подряд в игре',           stat: 'streakBest',  tiers: [7, 30, 100] },
  { id: 'order',   name: 'Соратник',      desc: 'Очков в общем деле Ордена',    stat: 'orderPts',    tiers: [100, 1000, 10000] },
  { id: 'lands',   name: 'Землепроходец', desc: 'Поймай духов родных земель',   stat: 'lands',       tiers: [1, 3, 7] },
  { id: 'el_fire',    name: 'Истопник',   desc: 'Поймай духов Огня',            stat: 'el:fire',     tiers: [10, 50, 200] },
  { id: 'el_water',   name: 'Лодочник',   desc: 'Поймай духов Воды',            stat: 'el:water',    tiers: [10, 50, 200] },
  { id: 'el_forest',  name: 'Лесничий',   desc: 'Поймай духов Леса',            stat: 'el:forest',   tiers: [10, 50, 200] },
  { id: 'el_wind',    name: 'Мельник',    desc: 'Поймай духов Ветра',           stat: 'el:wind',     tiers: [10, 50, 200] },
  { id: 'el_current', name: 'Монтёр',     desc: 'Поймай духов Тока',            stat: 'el:current',  tiers: [10, 50, 200] },
  { id: 'el_shadow',  name: 'Полуночник', desc: 'Поймай духов Тени',            stat: 'el:shadow',   tiers: [10, 50, 200] },
];

/* ---------- Летопись Ордена: сюжет ---------- */
function stepText(s) {
  switch (s.t) {
    case 'catch': return `Поймай духов: ${s.n}`;
    case 'catchEl': return `Поймай духов стихии «${ELEMENTS[s.el].name}»: ${s.n}`;
    case 'spring': return `Зачерпни силы из родников: ${s.n}`;
    case 'power': return `Усиль духа: ${s.n}`;
    case 'throw': return `Сделай отличных бросков: ${s.n}`;
    case 'walk': return `Пройди ${s.n} км`;
    case 'raid': return `Закрой разломов: ${s.n}`;
    case 'evolve': return `Преврати духа: ${s.n}`;
    case 'hatch': return `Вылупи духа из кокона: ${s.n}`;
    case 'duel': return `Победи хранителей капищ: ${s.n}`;
    case 'invasion': return `Отбей вторжения Нави: ${s.n}`;
    case 'purify': return `Очисти омрачённого духа: ${s.n}`;
    case 'photo': return `Сфотографируй духа: ${s.n}`;
    case 'league': return `Выиграй поединков в Лиге: ${s.n}`;
    case 'task': return `Выполни поручений родников: ${s.n}`;
    case 'defend': return `Поставь защитника на Капище: ${s.n}`;
    case 'land': return `Поймай духа родной земли: ${s.n}`;
    case 'spar': return `Победи друга в поединке: ${s.n}`;
    case 'coop': return `Закрой совместный разлом: ${s.n}`;
    case 'gift': return `Отправь подарков друзьям: ${s.n}`;
  }
  return '';
}
const STORY = [
  { title: 'Посвящение',
    intro: 'Старший Ловчий <b>Велимир</b> ждал тебя у старого родника. «Навь просочилась в город, — сказал он, не оборачиваясь. — Духи сами по себе не злые. Растерянные. Покажи, что умеешь с ними обращаться».',
    steps: [{ t: 'catch', n: 3 }, { t: 'spring', n: 2 }, { t: 'power', n: 1 }],
    reward: { charm: 15, honey: 5, sparks: 500, xp: 1000 },
    outro: '«Неплохо для новичка», — Велимир впервые улыбнулся и протянул тебе потёртый медный оберег. «Держи. Он видел больше духов, чем ты — трамваев».' },
  { title: 'Голоса во дворах',
    intro: 'По ночам жильцы слышат шорохи в подъездах, а Wi‑Fi пропадает без причины. Велимир уверен: город рождает новых духов — из проводов, фонарей и старых домов.',
    steps: [{ t: 'catchEl', el: 'current', n: 2 }, { t: 'throw', n: 3 }, { t: 'walk', n: 1 }],
    reward: { incense: 2, water: 5, sparks: 1000, xp: 2000 },
    outro: '«Вайфайки, Сетевики… — бормочет Велимир, листая Летопись. — В старых книгах о таких не писали. Значит, писать будем мы».' },
  { title: 'Первый разлом',
    intro: 'На окраине района небо пошло трещиной. Из разлома тянет холодом Нави, и оттуда выходят духи куда сильнее обычных. «Разломы нужно закрывать, — говорит Велимир. — Собери команду».',
    steps: [{ t: 'raid', n: 1 }, { t: 'catch', n: 5 }, { t: 'evolve', n: 1 }],
    reward: { charm2: 10, water: 5, sparks: 1500, xp: 3000 },
    outro: 'Разлом схлопнулся с тихим звоном, на асфальте осталась горсть инея. «Кто-то открывает их нарочно», — мрачно замечает Велимир.' },
  { title: 'Тропы Лешего',
    intro: 'В парке пропадают люди — ненадолго, на час-другой. Выходят растерянные, с листьями в волосах. Похоже, Леший снова путает тропы. Нужно поговорить с ним — на его языке.',
    steps: [{ t: 'catchEl', el: 'forest', n: 4 }, { t: 'hatch', n: 1 }, { t: 'walk', n: 3 }],
    reward: { honey: 10, incense: 1, sparks: 2000, xp: 4000 },
    outro: 'Леший вышел к тебе сам: огромный, мшистый, с глазами-светлячками. «Не я путаю, — проскрипел он. — Это граница дрожит. Костлявый царь шагает по ту сторону».' },
  { title: 'Буря над крышами',
    intro: 'Третий день над городом кружит гроза без дождя. Буревеи и Громовики сбились в стаи. Велимир хмурится: «Навь готовится. Нам нужно больше сил».',
    steps: [{ t: 'catchEl', el: 'wind', n: 3 }, { t: 'catchEl', el: 'current', n: 3 }, { t: 'raid', n: 2 }],
    reward: { charm3: 5, water: 8, sparks: 2500, xp: 5000 },
    outro: 'Буря стихла так же внезапно, как началась. В Летописи сама собой проступила строка: «Игла в яйце, яйцо в утке, утка в зайце…»' },
  { title: 'Тень Кощея',
    intro: 'Это Кощей Бессмертный истончил границу в Тонкую ночь. Его смерть надёжно спрятана, а сила растёт с каждым открытым разломом. Орден объявляет общий сбор.',
    steps: [{ t: 'catch', n: 25 }, { t: 'spring', n: 10 }, { t: 'raid', n: 3 }],
    reward: { charm3: 10, incense: 3, sparks: 5000, xp: 10000 }, gift: 'zharptica',
    outro: 'Когда третий разлом закрылся, небо вспыхнуло золотом. Из огненного пера родилась <b>Жар-птица</b> и опустилась прямо перед тобой. «Она пришла помочь, — шепчет Велимир. — Значит, мы ещё поборемся». <br><br><i>Конец первой книги. Далее — книга вторая: «Игла Кощея».</i>' },

  // ---------- Книга вторая: «Игла Кощея» ----------
  { title: 'Утка в зайце',
    intro: 'Велимир не спал три ночи над строкой из Летописи. «Смерть Кощея спрятана не в сундуке, — говорит он. — Сундук — это город. Заяц, утка, яйцо — это духи, которые её стерегут. Их надо найти».',
    steps: [{ t: 'catch', n: 10 }, { t: 'walk', n: 3 }, { t: 'spring', n: 8 }],
    reward: { charm2: 10, honey: 5, sparks: 3000, xp: 6000 },
    outro: 'Из родника на окраине вынырнул Сквозняк с пёрышком утки в зубах. Перо было ледяным. «Кощей знает, что мы ищем, — хмурится Велимир. — Жди гостей».' },
  { title: 'Прислужники Нави',
    intro: 'Гости пришли: родники по всему району захвачены. Прислужники Кощея омрачают духов, чтобы те не выдали тайну иглы.',
    steps: [{ t: 'invasion', n: 3 }, { t: 'purify', n: 1 }, { t: 'duel', n: 2 }],
    reward: { water: 10, charm3: 3, sparks: 3500, xp: 7000 },
    outro: 'Очищенный дух долго молчал, а потом прошептал: «Утка улетела к капищам предков. Туда прислужникам хода нет».' },
  { title: 'Капища предков',
    intro: 'Хранители капищ помнят времена, когда граница была прочной. Но просто так они с Ловчим говорить не станут — только с тем, кто докажет силу.',
    steps: [{ t: 'duel', n: 5 }, { t: 'catchEl', el: 'shadow', n: 5 }, { t: 'photo', n: 1 }],
    reward: { incense: 2, charm3: 5, sparks: 4000, xp: 8000 },
    outro: 'Старейшина капища Велеса долго смотрел на твой снимок духа. «Утка — это Алконост, яйцо — в кладке Жар-птицы, — сказал он. — А игла… иглу охраняет сама Навь».' },
  { title: 'Кладка Жар-птицы',
    intro: 'Жар-птица согласилась показать своё гнездо — но только тому, кто умеет беречь новую жизнь. Велимир вручает тебе коконы: «Согрей их — и узнаешь, какое из яиц не простое».',
    steps: [{ t: 'hatch', n: 2 }, { t: 'raid', n: 3 }, { t: 'power', n: 5 }],
    reward: { charm3: 6, water: 8, sparks: 5000, xp: 9000 },
    outro: 'Одно из яиц оказалось тяжёлым и холодным, как камень. Внутри что-то тикало — тонко, будто игла царапала скорлупу.' },
  { title: 'Турнир Ордена',
    intro: 'Чтобы расколоть яйцо Кощея, нужна сила всего Ордена. Лига созывает лучших Ловчих — и Велимир хочет видеть тебя среди них.',
    steps: [{ t: 'league', n: 3 }, { t: 'evolve', n: 3 }, { t: 'catch', n: 30 }],
    reward: { incense: 3, charm3: 8, sparks: 6000, xp: 10000 },
    outro: 'На турнире Ловчие со всех районов положили руки на яйцо. Скорлупа треснула — и из неё выкатилась тонкая чёрная игла. Небо над городом потемнело.' },
  { title: 'Игла Кощея',
    intro: 'Кощей почувствовал, что игла найдена. Разломы открываются один за другим, прислужники штурмуют родники. Это последняя битва книги.',
    steps: [{ t: 'raid', n: 5 }, { t: 'invasion', n: 5 }, { t: 'catchEl', el: 'shadow', n: 10 }],
    reward: { charm3: 15, incense: 3, sparks: 10000, xp: 20000 }, gift: 'koschey', emblem: 'needle',
    outro: 'Игла сломалась с тихим звоном. В последнем разломе стоял Кощей — не бессмертный царь, а уставший старик. «Ты сломал мою смерть, — сказал он. — Значит, теперь я могу просто жить». И шагнул к тебе в оберег. <br><br><i>Конец второй книги. Эмблема «Игла Кощея» открыта в облике Ловчего.</i>' },

  // ---------- Книга третья «Земли Руси» (v3.9) ----------
  { title: 'Весть с окраин',
    intro: 'Велимир разбирает груду писем: из Мурманска, Казани, Иркутска, из деревень, которых нет ни на одной туристической карте. «Тонкая ночь дошла до самых окраин, — говорит он. — Родники проснулись везде. Орден теперь — это вся страна».',
    steps: [{ t: 'task', n: 3 }, { t: 'spring', n: 20 }, { t: 'walk', n: 5 }],
    reward: { charm2: 10, honey: 10, sparks: 3000, xp: 15000 },
    outro: '«Родники раздают поручения — значит, они нас зовут, — Велимир складывает письма в Летопись. — Кто-то под землёй очень хочет, чтобы мы шли дальше».' },
  { title: 'Знамя над капищем',
    intro: 'Дружины Сокола, Медведя и Волка спорят за капища, как когда-то князья за города. Велимир хмурится: «Спорьте, но помните — капище стоит, пока его кто-то бережёт».',
    steps: [{ t: 'duel', n: 5 }, { t: 'defend', n: 2 }, { t: 'throw', n: 15 }],
    reward: { charm3: 5, water: 10, sparks: 4000, xp: 15000 },
    outro: 'Над капищем, где стоит твой защитник, ветер треплет знамя дружины. «Хорошо, — говорит Велимир. — Теперь капище знает твоё имя».' },
  { title: 'Дух родной земли',
    intro: 'В старых записях Ордена сказано: у каждого края есть свой дух-хранитель — Берегиня, Сполох, Жигуль, Тур, Хозяйка Медной горы, Бабр и Кутх. «Найди своего, — говорит Велимир. — Земля должна тебя признать».',
    steps: [{ t: 'land', n: 1 }, { t: 'catch', n: 50 }, { t: 'photo', n: 3 }],
    reward: { incense: 3, charm2: 15, sparks: 5000, xp: 20000 },
    outro: 'Дух родной земли посмотрел на тебя долго и серьёзно, будто сверял с кем-то давно знакомым. А потом позволил сфотографировать себя — в Летописи это считается знаком доверия.' },
  { title: 'Долгая дорога',
    intro: 'Родники шепчут одно и то же слово: «ниже». Велимир достаёт карту подземных рек — старую, ещё дореволюционную. «Они текут под всей страной. Чтобы услышать их, придётся много ходить».',
    steps: [{ t: 'walk', n: 20 }, { t: 'hatch', n: 5 }, { t: 'task', n: 5 }],
    reward: { charm3: 8, sparks: 6000, xp: 20000 },
    outro: 'Коконы, что ты носил в пути, вылупились с каплями воды на крыльях. «Подземная вода, — шепчет Велимир. — Мы близко».' },
  { title: 'Подземные реки',
    intro: 'Прислужники Нави перекрывают родники: хотят, чтобы подземные реки остановились и Навь затопила Явь. Духи воды тревожатся и собираются у фонтанов.',
    steps: [{ t: 'catchEl', el: 'water', n: 20 }, { t: 'invasion', n: 8 }, { t: 'purify', n: 3 }],
    reward: { water: 15, incense: 3, sparks: 8000, xp: 25000 },
    outro: 'Из-под земли донёсся гул, похожий на дыхание огромного зверя. Родники вздрогнули и снова забили ключом. «Он проснулся», — только и сказал Велимир.' },
  { title: 'Индрик-зверь',
    intro: '«Индрик-зверь всем зверям отец, — читает Велимир из Голубиной книги. — Ходит под землёю, как солнце по небу, прочищает реки и ручьи». Чтобы он поднялся в Явь, нужны сила разломов, мастерство Лиги и знамёна дружин.',
    steps: [{ t: 'raid', n: 8 }, { t: 'league', n: 6 }, { t: 'defend', n: 5 }],
    reward: { charm3: 15, incense: 3, sparks: 12000, xp: 30000 }, gift: 'indrik', emblem: 'horn',
    outro: 'Земля мягко качнулась, и у ближайшего родника поднялся зверь с единственным рогом, сияющим, как лёд на солнце. Он опустил голову, и родник под ним засмеялся звонко, по-весеннему. <br><br><i>Конец третьей книги. Эмблема «Рог Индрика» открыта в облике Ловчего.</i>' },
];

const SHINY_RATE = 1 / 128;

/* ---------- События недели (меняются каждый понедельник) ---------- */
const WEEK_EVENTS = [
  { id: 'fire',    name: 'Неделя Огня',       el: 'fire' },
  { id: 'stars',   name: 'Звездопад',         xp: 2,  desc: 'Двойной опыт за всё: поимку, родники, разломы и поединки.' },
  { id: 'water',   name: 'Неделя Воды',       el: 'water' },
  { id: 'springs', name: 'Родниковая неделя', loot: 2, cooldown: 3, desc: 'Родники дают вдвое больше предметов и восстанавливаются за 3 минуты.' },
  { id: 'forest',  name: 'Неделя Леса',       el: 'forest' },
  { id: 'nav',     name: 'Навья неделя',      el: 'shadow', shiny: 2, desc: 'Духи Тени повсюду, а сияющие встречаются вдвое чаще.' },
  { id: 'duels',   name: 'Неделя поединков',  duel: 2, desc: 'Хранители капищ дают двойную награду.' },
  { id: 'wind',    name: 'Неделя Ветра',      el: 'wind' },
  { id: 'cocoons', name: 'Неделя коконов',    km: 2, desc: 'Шаги для коконов и спутника считаются вдвое, коконы в родниках попадаются вдвое чаще.' },
  { id: 'current', name: 'Неделя Тока',       el: 'current' },
  { id: 'rifts',   name: 'Неделя разломов',   rifts: true, desc: 'Великие разломы открываются втрое чаще, за победу — +3 оберега разлома.' },
];
WEEK_EVENTS.forEach(e => { if (e.el && !e.desc) e.desc = `Духи стихии «${ELEMENTS[e.el].name}» встречаются в 2,5 раза чаще и чаще охраняют разломы.`; });

/* ---------- Капища и хранители ---------- */
const SHRINE_GODS = ['Перуна', 'Велеса', 'Мокоши', 'Сварога', 'Даждьбога', 'Стрибога', 'Ярилы', 'Лады', 'Хорса', 'Рода'];
const GUARDIANS = ['Ярослава', 'Мирон', 'Всеслав', 'Любава', 'Добрыня', 'Злата', 'Ратибор', 'Василиса', 'Святогор', 'Забава', 'Остромир', 'Милена'];
const GUARD_COLORS = ['#dc2626', '#2563eb', '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#ca8a04', '#db2777'];
/* ---------- Дружины (3.5): Капища под знаменем ---------- */
const CLANS = {
  sokol:  { name: 'Дружина Сокола',  short: 'Сокол',   color: '#ef4444', motto: 'Быстрота и отвага' },
  medved: { name: 'Дружина Медведя', short: 'Медведь', color: '#3b82f6', motto: 'Сила и стойкость' },
  volk:   { name: 'Дружина Волка',   short: 'Волк',    color: '#eab308', motto: 'Верность и чутьё' },
};
const CLAN_LEVEL = 5;     // с какого уровня выбирается дружина
const HOLD_MAX = 6;       // защитников на одном Капище
const HOLD_MY_MAX = 10;   // Капищ с моими защитниками одновременно
const TRIBUTE = { sparks: 100, charm: 1 }; // дань в день за каждое Капище с моим защитником

const SHRINE_TIERS = {
  1: { title: 'Ученик',     lvl: -3, speed: 0.85, shield: 0.35, xp: 800,  sparks: 300 },
  2: { title: 'Мастер',     lvl: 0,  speed: 0.7,  shield: 0.6,  xp: 1500, sparks: 600 },
  3: { title: 'Старейшина', lvl: 2,  speed: 0.58, shield: 0.85, xp: 3000, sparks: 1200 },
};
/* ---------- Праздники (v1.4) ---------- */
const HOLIDAYS = {
  svyatki:     { name: 'Святки',          desc: 'Зимние праздники: Морозко и Снегурка выходят к людям, духи Ветра и Воды встречаются чаще, в родниках — подарки.', el: ['wind', 'water'], loot: 1.5, seasonal: ['morozko', 'snegurka'] },
  maslenitsa:  { name: 'Масленица',       desc: 'Провожаем зиму! Духи Огня встречаются вдвое чаще, в родниках много мёда («блинов»), опыт ×1,5.', el: ['fire'], honey: true, xp: 1.5 },
  kupala:      { name: 'Купальская ночь', desc: 'Цветёт папоротник: Купалинка повсюду, духи Огня, Воды и Леса чаще, ночью сияющие — вдвое чаще.', el: ['fire', 'water', 'forest'], shinyNight: 2, seasonal: ['kupalinka'] },
  veles:       { name: 'Велесова ночь',   desc: 'Граница миров тоньше всего: духи Тени втрое чаще, в великих разломах ждёт Кощей, сияющие Тени вдвое чаще.', el: ['shadow'], elMul: 3, koschey: true, shiny: 2 },
};

/* ---------- Вторжения Нави (v1.4) ---------- */
const GRUNT_QUOTES = [
  'Этот родник теперь принадлежит Нави!',
  'Твои духи будут служить Кощею!',
  'Орден Оберега? Никогда о таком не слышал.',
  'Граница рухнет, и мы заберём весь город!',
  'Думаешь, оберегом меня остановишь?',
  'Тьма уже здесь, Ловчий. Смирись.',
];

/* ---------- Облик Ловчего (v1.4) ---------- */
const LOOK = {
  cloak: [
    { c: '#6d28d9', name: 'Фиалковый', lvl: 1 }, { c: '#1d4ed8', name: 'Синий', lvl: 1 }, { c: '#15803d', name: 'Лесной', lvl: 1 },
    { c: '#b91c1c', name: 'Алый', lvl: 5 }, { c: '#0f766e', name: 'Бирюзовый', lvl: 8 }, { c: '#a16207', name: 'Охряный', lvl: 10 },
    { c: '#1f2937', name: 'Полночный', lvl: 15 }, { c: '#e2e8f0', name: 'Снежный', lvl: 20 }, { c: '#be185d', name: 'Малиновый', lvl: 25 }, { c: '#ca8a04', name: 'Золотой', lvl: 30 },
    // 3.12: из Лавки Ордена (за гривны) и с Золотой тропы — открываются покупкой, а не уровнем
    { c: '#7c2d12', name: 'Бронзовый', lvl: 1, shop: 250 }, { c: '#0c4a6e', name: 'Глубинный', lvl: 1, shop: 250 }, { c: '#4a044e', name: 'Навья ночь', lvl: 1, shop: 400 },
    { c: '#065f46', name: 'Сезонная тропа', lvl: 1, pass: true },
  ],
  eyes: [
    { c: '#5eead4', name: 'Бирюза', lvl: 1 }, { c: '#fde047', name: 'Янтарь', lvl: 1 }, { c: '#f87171', name: 'Жар', lvl: 6 },
    { c: '#c084fc', name: 'Аметист', lvl: 12 }, { c: '#f8fafc', name: 'Лунный свет', lvl: 18 }, { c: '#4ade80', name: 'Навий огонь', lvl: 28 },
  ],
  emblem: [
    { id: 'charm', name: 'Оберег', lvl: 1 }, { id: 'sun', name: 'Солнце', lvl: 3 }, { id: 'moon', name: 'Месяц', lvl: 7 },
    { id: 'leaf', name: 'Лист', lvl: 11 }, { id: 'bolt', name: 'Молния', lvl: 16 }, { id: 'star', name: 'Звезда', lvl: 22 },
    { id: 'crown', name: 'Венец Лиги', lvl: 1, league: 9 },
    { id: 'needle', name: 'Игла Кощея', lvl: 1, story: 12 },
    { id: 'horn', name: 'Рог Индрика', lvl: 1, story: 18 },
    { id: 'trail', name: 'Знак Тропы', lvl: 1, pass: true },
  ],
};

MEDALS.splice(4, 0, { id: 'duels', name: 'Поединщик', desc: 'Победи хранителей капищ', stat: 'duels', tiers: [5, 50, 300] });
QUEST_TEMPLATES.push({ t: 'duel', min: 1, max: 2, text: n => `Победи хранителей капищ: ${n}`, reward: { charm2: 4, sparks: 600 } });
