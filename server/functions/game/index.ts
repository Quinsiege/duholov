// @ts-nocheck
// Духолов: сервер игры (Supabase Edge Function «game»). ФАЙЛ СОБРАН АВТОМАТИЧЕСКИ tools/build-server.ps1
// из общих модулей игры (www/js) и server/game — не правьте его вручную.
import { createClient } from 'npm:@supabase/supabase-js@2';

// Заглушки браузерного окружения: на сервере нет карты, звука и окон
const DEV = false;
const APP_VERSION = '3.4.0';
const window = globalThis;
const location = { hostname: 'server', search: '' };
const MapView = { pos: null, refresh() {}, updateBuddy() {} };
const Poi = { near: () => [], nearest: () => null };
const Tut = { SID: 'vayfayka', spawn: () => null, step: () => 0 };
const UI = { toast() {}, refreshHud() {} };
const Sync = { touch() {} };
const Cloud = { configured: () => false };
const Cfg = { s: { sound: false, vibro: false } };

// ===== www/js/data.js =====
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
];
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
  gift:    { name: 'Подарок',            desc: 'Узелок для друга: обереги, мёд, иногда кокон. Отправляется в «Меню → Друзья», раз в день каждому.' },
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
  ],
};

MEDALS.splice(4, 0, { id: 'duels', name: 'Поединщик', desc: 'Победи хранителей капищ', stat: 'duels', tiers: [5, 50, 300] });
QUEST_TEMPLATES.push({ t: 'duel', min: 1, max: 2, text: n => `Победи хранителей капищ: ${n}`, reward: { charm2: 4, sparks: 600 } });

// ===== www/js/util.js =====
/* Утилиты: детерминированный хеш/ГСЧ, гео, DOM, звук, вибрация, события */

const U = {
  // cyrb53 — стабильный хеш строки → число в [0, 1)
  h(...parts) {
    const str = parts.join('|');
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)) / 9007199254740992;
  },
  // mulberry32
  rng(seed) {
    let a = Math.floor((typeof seed === 'number' ? seed : U.h(seed)) * 4294967296) >>> 0;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  weighted(entries, r) { // entries: [[value, weight], ...]
    const total = entries.reduce((s, e) => s + e[1], 0);
    let x = r * total;
    for (const [v, w] of entries) { if ((x -= w) < 0) return v; }
    return entries[entries.length - 1][0];
  },
  uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },

  /* Время игры. Сервер и телефон должны считать одинаково: «сейчас» — по часам сервера
     (U.skew — поправка телефона), «сегодня» и «ночь» — в часовом поясе игрока (U.tz, минуты к UTC). */
  skew: 0,
  tz: null,
  now() { return Date.now() + this.skew; },
  tzMin() { return this.tz != null ? this.tz : -new Date().getTimezoneOffset(); },
  // Дата, у которой getUTC*() — это местные дата и время игрока
  local(t = this.now()) { return new Date(t + this.tzMin() * 60000); },
  hour(t) { return this.local(t).getUTCHours(); },
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp: (a, b, t) => a + (b - a) * t,

  dist(lat1, lng1, lat2, lng2) {
    const R = 6371000, toR = Math.PI / 180;
    const dLat = (lat2 - lat1) * toR, dLng = (lng2 - lng1) * toR;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toR) * Math.cos(lat2 * toR) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  },
  fmtDist(m) { return m < 1000 ? `${Math.round(m)} м` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} км`; },
  fmtTime(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(s / 60), ss = s % 60;
    if (m >= 48 * 60) return `${Math.floor(m / 1440)} дн ${Math.floor(m / 60) % 24} ч`;
    return m >= 60 ? `${Math.floor(m / 60)} ч ${m % 60} мин` : `${m}:${String(ss).padStart(2, '0')}`;
  },
  plural(n, one, few, many) {
    const a = Math.abs(n) % 100, b = a % 10;
    return a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many;
  },
  fmtNum(n) { return Math.round(n).toLocaleString('ru-RU'); },
  today(t) { const d = this.local(t); return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`; },
  isNight(t) { const h = this.hour(t); return h >= 20 || h < 6; },

  $(sel, root = document) { return root.querySelector(sel); },
  $$(sel, root = document) { return [...root.querySelectorAll(sel)]; },
  el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; },
  esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
  wait: ms => new Promise(r => setTimeout(r, ms)),

  vibrate(p) {
    try {
      const active = !navigator.userActivation || navigator.userActivation.hasBeenActive;
      if (active && Cfg.s.vibro && navigator.vibrate) navigator.vibrate(p);
    } catch (e) {}
  },
};

/* ---------- Мини-шина событий (для заданий, HUD) ---------- */
const Bus = {
  map: {},
  on(ev, fn) { (this.map[ev] = this.map[ev] || []).push(fn); },
  emit(ev, data) { (this.map[ev] || []).forEach(fn => fn(data)); },
};

/* ---------- Синтезированный звук (без файлов) ---------- */
const Sfx = {
  ctx: null,
  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  },
  tone(freq, dur, { type = 'sine', vol = 0.12, when = 0, to = null } = {}) {
    if (!this.ctx || !Cfg.s.sound) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const t0 = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  },
  // Шум через фильтр — для треска огня, свиста ветра, шелеста листвы
  noise(dur, { vol = 0.1, when = 0, type = 'lowpass', f = 1000, to = null, q = 1 } = {}) {
    if (!this.ctx || !Cfg.s.sound) return;
    const ctx = this.ctx;
    if (!this.nbuf) {
      this.nbuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = this.nbuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t0 = ctx.currentTime + when;
    const src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = this.nbuf; src.loop = true;
    fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t0);
    if (to) fl.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.05, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(fl).connect(g).connect(ctx.destination);
    src.start(t0); src.stop(t0 + dur + 0.05);
  },
  // Голос стихии: особые приёмы и появление духа
  element(el, soft) {
    const T = (f, d, o) => this.tone(f, d, o), N = (d, o) => this.noise(d, o), k = soft ? 0.5 : 1;
    switch (el) {
      case 'fire':
        N(0.6, { vol: 0.12 * k, f: 2500, to: 300 });
        [0, 0.07, 0.15, 0.22].forEach(w => N(0.05, { vol: 0.08 * k, when: w, type: 'highpass', f: 3000 }));
        T(180, 0.5, { type: 'sawtooth', vol: 0.04 * k, to: 70 });
        break;
      case 'water':
        [0, 0.1, 0.18, 0.3].forEach((w, i) => T(500 + i * 120, 0.12, { vol: 0.07 * k, when: w, to: 1100 + i * 200 }));
        N(0.4, { vol: 0.04 * k, type: 'bandpass', f: 800, to: 400, q: 3 });
        break;
      case 'forest':
        [392, 330, 440].forEach((f, i) => T(f, 0.25, { type: 'triangle', vol: 0.07 * k, when: i * 0.09 }));
        N(0.35, { vol: 0.05 * k, type: 'highpass', f: 4000, when: 0.05 });
        break;
      case 'wind':
        N(0.8, { vol: 0.12 * k, type: 'bandpass', f: 300, to: 2400, q: 4 });
        T(900, 0.6, { vol: 0.02 * k, to: 1500 });
        break;
      case 'current':
        [0, 0.06, 0.12, 0.2].forEach(w => T(1200 + Math.random() * 600, 0.05, { type: 'square', vol: 0.045 * k, when: w, to: 300 }));
        N(0.3, { vol: 0.06 * k, type: 'highpass', f: 2000, when: 0.02 });
        break;
      case 'shadow':
        T(82, 0.8, { type: 'sawtooth', vol: 0.05 * k, to: 60 });
        T(85, 0.8, { type: 'sawtooth', vol: 0.05 * k, to: 58 });
        T(440, 0.6, { vol: 0.03 * k, when: 0.1, to: 110 });
        break;
    }
  },
  play(name) {
    const T = (f, d, o) => this.tone(f, d, o);
    switch (name) {
      case 'tap': T(660, 0.06, { type: 'triangle', vol: 0.06 }); break;
      case 'throw': T(300, 0.35, { type: 'sine', to: 900, vol: 0.08 }); break;
      case 'hit': T(180, 0.15, { type: 'square', vol: 0.06, to: 90 }); T(900, 0.2, { when: 0.05, vol: 0.05 }); break;
      case 'miss': T(400, 0.25, { type: 'triangle', to: 150, vol: 0.06 }); break;
      case 'wobble': T(220, 0.12, { type: 'triangle', vol: 0.08 }); break;
      case 'catch': [523, 659, 784, 1047].forEach((f, i) => T(f, 0.25, { type: 'triangle', when: i * 0.09, vol: 0.09 })); break;
      case 'escape': T(500, 0.3, { type: 'sawtooth', to: 120, vol: 0.05 }); break;
      case 'flee': T(700, 0.5, { type: 'sine', to: 2000, vol: 0.05 }); break;
      case 'spin': [880, 1175, 1397, 1760].forEach((f, i) => T(f, 0.3, { when: i * 0.06, vol: 0.05 })); break;
      case 'levelup': [392, 523, 659, 784, 1047, 1319].forEach((f, i) => T(f, 0.35, { type: 'triangle', when: i * 0.1, vol: 0.08 })); break;
      case 'hatch': [330, 440, 554, 659].forEach((f, i) => T(f, 0.3, { type: 'sine', when: i * 0.12, vol: 0.09 })); break;
      case 'attack': T(520, 0.07, { type: 'square', vol: 0.035, to: 260 }); break;
      case 'special': T(120, 0.5, { type: 'sawtooth', vol: 0.07, to: 600 }); T(900, 0.4, { when: 0.2, vol: 0.05, to: 200 }); break;
      case 'hurt': T(140, 0.2, { type: 'square', vol: 0.06, to: 70 }); break;
      case 'warn': T(1000, 0.08, { type: 'square', vol: 0.04 }); T(1000, 0.08, { type: 'square', vol: 0.04, when: 0.12 }); break;
      case 'win': [523, 659, 784, 1047, 784, 1047].forEach((f, i) => T(f, 0.3, { type: 'triangle', when: i * 0.12, vol: 0.08 })); break;
      case 'lose': [392, 330, 262, 196].forEach((f, i) => T(f, 0.35, { type: 'triangle', when: i * 0.15, vol: 0.07 })); break;
    }
  },
};

// ===== www/js/events.js =====
/* События: неделя (с понедельника 00:00 UTC, по кругу из WEEK_EVENTS) и праздники по календарю.
   В разработке (localhost) праздник можно посмотреть заранее: ?hol=svyatki | maslenitsa | kupala | veles */

const Ev = {
  week(t = U.now()) { return Math.floor((t / 86400000 + 3) / 7); }, // 01.01.1970 — четверг
  get cur() { return WEEK_EVENTS[this.week() % WEEK_EVENTS.length]; },
  get next() { return WEEK_EVENTS[(this.week() + 1) % WEEK_EVENTS.length]; },
  endsAt() { return ((this.week() + 1) * 7 - 3) * 86400000; },

  // Православная Пасха (юлианский расчёт + 13 дней, верно для 1900–2099); дата в UTC
  easter(y) {
    const a = y % 4, b = y % 7, c = y % 19, d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
    const m = Math.floor((d + e + 114) / 31), day = ((d + e + 114) % 31) + 1;
    return new Date(Date.UTC(y, m - 1, day + 13));
  },
  // Праздник на местную дату игрока: { id, ...HOLIDAYS[id], start, end } или null.
  // now — «местная» дата (см. U.local): её UTC-поля — это местные дата и время.
  holiday(now = U.local()) {
    const forced = DEV && new URLSearchParams(location.search).get('hol');
    if (forced && HOLIDAYS[forced]) return { id: forced, ...HOLIDAYS[forced], end: new Date(now.getTime() + 86400000) };
    const y = now.getUTCFullYear();
    const day = (m, d, yy = y) => new Date(Date.UTC(yy, m - 1, d));
    const ranges = [
      ['svyatki', day(12, 25, y - 1), day(1, 15)],
      ['svyatki', day(12, 25), day(1, 15, y + 1)],
      ['kupala', day(7, 5), day(7, 9)],
      ['veles', day(10, 30), day(11, 3)],
    ];
    const e = this.easter(y);
    ranges.push(['maslenitsa', day(e.getUTCMonth() + 1, e.getUTCDate() - 55), day(e.getUTCMonth() + 1, e.getUTCDate() - 48)]);
    const hit = ranges.find(([, s, en]) => now >= s && now < en);
    return hit ? { id: hit[0], ...HOLIDAYS[hit[0]], start: hit[1], end: hit[2] } : null;
  },
  get hol() {
    const t = Math.floor(U.now() / 600000) + ':' + U.tzMin();
    if (this._holT !== t) { this._holT = t; this._hol = this.holiday(); }
    return this._hol;
  },
  month() { return U.local().getUTCMonth(); },
  season() { const m = this.month(); return m === 11 || m <= 1 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn'; },

  elMul(el) {
    const h = this.hol;
    return (this.cur.el === el ? 2.5 : 1) * (h && h.el.includes(el) ? (h.elMul || 2) : 1);
  },
  xpMul() { return (this.cur.xp || 1) * ((this.hol && this.hol.xp) || 1); },
  lootMul() { return (this.cur.loot || 1) * ((this.hol && this.hol.loot) || 1); },
  kmMul() { return this.cur.km || 1; },
  shinyMul() {
    const h = this.hol;
    return (this.cur.shiny || 1) * ((h && h.shiny) || 1) * (h && h.shinyNight && U.isNight() ? h.shinyNight : 1);
  },
  duelMul() { return this.cur.duel || 1; },
  springCooldown() { return (this.cur.cooldown || 5) * 60000; },

  // Сезонные духи: зимние — с декабря по февраль и на Святки, Купалинка — летом и на Купалу
  seasonal(s) {
    if (!s.season) return 1;
    const h = this.hol, m = this.month();
    const boosted = h && h.seasonal && h.seasonal.includes(s.id);
    if (boosted) return 6;
    if (s.season === 'winter') return m === 11 || m <= 1 ? 1 : 0;
    if (s.season === 'kupala') return m === 5 || m === 6 ? 0.6 : 0;
    return 0;
  },
};

// ===== www/js/sky.js =====
/* Небо: реальная погода (Open-Meteo, без ключа) или смоделированная, и фазы Луны.
   Координаты округляются до ~1 км перед запросом. */

const Sky = {
  w: null, // { key, temp, src: 'real'|'sim', at, lat, lng }

  init() {
    this.update(true);
    setInterval(() => this.update(), 5 * 60000);
  },

  async update(force) {
    const p = MapView.pos;
    if (!p || !S.d) return;
    const stale = !this.w || Date.now() - this.w.at > 30 * 60000 || U.dist(p.lat, p.lng, this.w.lat, this.w.lng) > 5000;
    if (!stale && !force) return;
    let w = null;
    if (Cfg.s.weather) { try { w = await this.fetchReal(p); } catch (e) { w = null; } }
    if (!w) w = this.simulate(p);
    const changed = !this.w || this.w.key !== w.key;
    this.w = w;
    Bus.emit('weather', { w, changed });
  },

  async fetchReal(p) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat.toFixed(2)}&longitude=${p.lng.toFixed(2)}&current=weather_code,wind_speed_10m,temperature_2m`;
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) return null;
    const c = (await r.json()).current;
    if (!c) return null;
    return { key: this.fromCode(c.weather_code, c.wind_speed_10m), temp: Math.round(c.temperature_2m), src: 'real', at: Date.now(), lat: p.lat, lng: p.lng };
  },
  // Коды погоды WMO → тип погоды игры
  fromCode(code, wind) {
    if (code >= 95) return 'storm';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
    if (code === 45 || code === 48) return 'fog';
    if (wind >= 28) return 'windy';
    if (code === 3) return 'overcast';
    if (code === 2) return 'partly';
    return 'clear';
  },
  simulate(p) {
    const slot = Math.floor(U.now() / (2 * 3600000));
    const m = Ev.month();
    const winter = m >= 10 || m <= 2;
    const key = U.weighted([
      ['clear', 4], ['partly', 4], ['overcast', 3], ['rain', winter ? 0.5 : 2], ['fog', 1],
      ['windy', 1.5], ['snow', winter ? 2.5 : 0], ['storm', winter ? 0 : 0.6],
    ], U.h('wx', Math.floor(p.lat * 10), Math.floor(p.lng * 10), slot));
    return { key, temp: null, src: 'sim', at: Date.now(), lat: p.lat, lng: p.lng };
  },

  boosted(el) { return !!this.w && WEATHER[this.w.key].boost.includes(el); },

  // Фаза Луны 0..1 (0 — новолуние, 0.5 — полнолуние)
  moonPhase(t = Date.now()) {
    const syn = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14);
    const days = (t - ref) / 86400000;
    return (((days % syn) + syn) % syn) / syn;
  },
  moonEvent() {
    const ph = this.moonPhase();
    if (ph > 0.466 && ph < 0.534) return 'full';
    if (ph < 0.034 || ph > 0.966) return 'new';
    return null;
  },
  shinyRate(base = SHINY_RATE) { return base * (this.moonEvent() === 'new' ? 2 : 1) * Ev.shinyMul(); },
};

// ===== www/js/world.js =====
/* Мир: духи появляются детерминированно по реальным координатам (одна точка в одно время — одно и то же),
   а Родники, Капища и Разломы стоят у настоящих объектов (pois.js).
   Этот же код работает на сервере игры: он пересчитывает, был ли дух, родник или разлом там, где его нашёл игрок. */

const W = {
  SPAWN_CELL: 0.00055,   // ≈ 60 м
  BIOME_CELL: 0.006,     // ≈ 650 м — «район» с любимой стихией
  SLOT: 15 * 60 * 1000,  // дух живёт на карте 15 минут
  get SPRING_COOLDOWN() { return Ev.springCooldown(); },
  INTERACT: 70,          // радиус взаимодействия, м
  BATTLE_R: 100,         // радиус для капищ и разломов, м
  VIEW: 320,             // радиус видимости, м

  // Перебор клеток сетки в радиусе. Шаг по долготе подгоняется под широту, чтобы клетки были «квадратными».
  cells(lat, lng, size, radius, fn) {
    const dLat = radius / 111320;
    const i0 = Math.floor((lat - dLat) / size), i1 = Math.floor((lat + dLat) / size);
    for (let i = i0; i <= i1; i++) {
      const rowLat = (i + 0.5) * size;
      const lngSize = size / Math.max(0.2, Math.cos(rowLat * Math.PI / 180));
      const dLng = radius / (111320 * Math.max(0.2, Math.cos(lat * Math.PI / 180)));
      const j0 = Math.floor((lng - dLng) / lngSize), j1 = Math.floor((lng + dLng) / lngSize);
      for (let j = j0; j <= j1; j++) fn(i, j, i * size, j * lngSize, size, lngSize);
    }
  },

  biome(lat, lng) {
    const i = Math.floor(lat / this.BIOME_CELL), j = Math.floor(lng / this.BIOME_CELL);
    return ELEMENT_KEYS[Math.floor(U.h('biome', i, j) * ELEMENT_KEYS.length)];
  },
  timeBonus(el, t) {
    const h = U.hour(t);
    if (h >= 21 || h < 5) return el === 'shadow' || el === 'wind' ? 2 : 1;
    if (h >= 17) return el === 'current' || el === 'fire' ? 2 : 1;
    if (h < 10) return el === 'water' || el === 'forest' ? 2 : 1;
    return el === 'fire' || el === 'forest' ? 1.6 : 1;
  },

  region(lng) { return lng < 40 ? 'west' : lng < 90 ? 'center' : 'east'; },
  // региональные духи водятся только в своей части света
  local(s, lng = MapView.pos ? MapView.pos.lng : 37) { return !s.region || s.region === this.region(lng); },

  pickSpecies(r, biome, night, lng) {
    const fullMoon = night && Sky.moonEvent() === 'full';
    const el = U.weighted(ELEMENT_KEYS.map(e => {
      let w = (e === biome ? 3 : 1) * this.timeBonus(e);
      if (Sky.boosted(e)) w *= 1.7;
      w *= Ev.elMul(e);
      if (fullMoon && (e === 'shadow' || e === 'water')) w *= 1.5;
      return [e, w];
    }), r());
    const RW = { 1: 60, 2: 24, 3: 8, 4: 2 };
    const h = U.hour();
    const pool = SPECIES.filter(s => s.el === el && !s.legend && this.local(s, lng)).map(s => {
      let w = RW[s.rar] || 0;
      if (s.stage === 3) w *= 0.3;
      if (s.time === 'night') w *= night ? (fullMoon ? 4 : 1.5) : 0.35;
      if (s.time === 'day') w *= night ? 0.05 : h >= 11 && h < 15 ? 3 : 0.8;
      w *= Ev.seasonal(s);
      return [s.id, w];
    });
    return U.weighted(pool, r());
  },

  spawnsAround(lat, lng, radius = this.VIEW) {
    const now = U.now(), out = [];
    const P = S.incenseActive() ? 0.3 : 0.14;
    const night = U.isNight();
    this.cells(lat, lng, this.SPAWN_CELL, radius, (i, j, la, ln, sz, lsz) => {
      const phase = U.h('ph', i, j) * this.SLOT;
      const slot = Math.floor((now + phase) / this.SLOT);
      if (U.h('sp', i, j, slot) > P) return;
      const id = `s:${i}:${j}:${slot}`;
      if (S.d.caught[id]) return;
      const r = U.rng(id);
      const pLat = la + (0.15 + r() * 0.7) * sz, pLng = ln + (0.15 + r() * 0.7) * lsz;
      const d = U.dist(lat, lng, pLat, pLng);
      if (d > radius) return;
      const sid = this.pickSpecies(r, this.biome(pLat, pLng), night, pLng);
      const boost = Sky.boosted(SP[sid].el);
      const maxL = Math.min(30, S.d.level + 2) + (boost ? 5 : 0);
      const lvl = Math.max(boost ? 6 : 1, Math.min(maxL, Math.round(1 + r() * maxL)));
      const shiny = U.h('shiny', id) < Sky.shinyRate();
      out.push({ type: 'spirit', id, sid, lvl, boost, shiny, lat: pLat, lng: pLng, d, expires: (slot + 1) * this.SLOT - phase });
    });
    const tut = Tut.spawn(lat, lng);
    if (tut) out.push(tut);
    return out;
  },

  /* ---------- Родники: у реальных объектов (см. pois.js) ---------- */
  // p — объект карты { id, lat, lng, name, photo }; d — расстояние до игрока
  springFor(p, d) {
    const slot = Math.floor(U.now() / 7200000), id = p.id, last = S.d.springs[id] || 0;
    // вторжение Нави: ~12% родников захвачены на двухчасовое окно (с 4 уровня)
    const invId = `${id}:${slot}`;
    const invaded = S.d.level >= 4 && U.h('inv', id, slot) < 0.12 && !S.d.freed[invId];
    return { type: 'spring', id, invId, invaded, lat: p.lat, lng: p.lng, d, name: p.name, photo: p.photo,
      ready: U.now() - last > this.SPRING_COOLDOWN, readyAt: last + this.SPRING_COOLDOWN };
  },
  springsAround(lat, lng, radius = this.VIEW + 150) {
    return Poi.near(lat, lng, radius, 'spring').map(p => this.springFor(p, p.d));
  },

  /* ---------- Разломы: каждый час открываются у части Капищ ---------- */
  riftAt(id, hour) { return U.h('rr', id, hour) < 0.35; },
  // Разлом у капища p в этот час (или null)
  riftFor(p, d, hour = Math.floor(U.now() / 3600000)) {
    if (!this.riftAt(p.id, hour)) return null;
    const id = `${p.id}:${hour}`;
    const r = U.rng(id);
    const tier = U.weighted(Ev.cur.rifts ? [[1, 40], [2, 30], [3, 30]] : [[1, 60], [2, 30], [3, 10]], r());
    let pool;
    if (tier === 3) pool = SPECIES.filter(s => s.legend && (!Ev.hol || !Ev.hol.koschey || s.id === 'koschey'));
    else if (tier === 2) pool = SPECIES.filter(s => !s.legend && s.rar >= 3 && this.local(s, p.lng) && Ev.seasonal(s) > 0);
    else pool = SPECIES.filter(s => s.rar === 2);
    // в неделю стихии разломы чаще охраняют духи этой стихии
    const evPool = pool.filter(s => s.el === Ev.cur.el);
    if (evPool.length && r() < 0.6) pool = evPool;
    const boss = pool[Math.floor(r() * pool.length)].id;
    return { type: 'rift', id, poi: p.id, lat: p.lat, lng: p.lng, d, tier, boss, place: p.name, done: !!S.d.rifts[id], endsAt: (hour + 1) * 3600000 };
  },
  riftsAround(lat, lng, radius = this.VIEW + 500) {
    return Poi.near(lat, lng, radius, 'shrine').map(p => this.riftFor(p, p.d)).filter(Boolean);
  },

  springLoot(id) {
    const r = U.rng(id + Math.random());
    const lvl = S.d.level, loot = {};
    const n = (4 + Math.floor(r() * 3)) * Ev.lootMul();
    for (let k = 0; k < n; k++) {
      const opts = [['charm', 12], ['honey', Ev.hol && Ev.hol.honey ? 8 : 2.5], ['water', 1.5]];
      if (lvl >= 8) opts.push(['charm2', 3]);
      if (lvl >= 16) opts.push(['charm3', 1.5]);
      if (lvl >= 3) opts.push(['incense', 0.25]);
      const it = U.weighted(opts, r());
      loot[it] = (loot[it] || 0) + 1;
    }
    // подарок для друга — примерно в каждом втором роднике, пока их меньше GIFT_LIMIT
    if ((S.d.items.gift || 0) < GIFT_LIMIT && r() < 0.5) loot.gift = 1;
    let cocoon = null;
    if (S.d.cocoons.length < 9 && r() < 0.12 * Ev.kmMul()) cocoon = U.weighted([[2, 5], [5, 4], [10, 1]], r());
    return { loot, cocoon };
  },

  /* ---------- Капища ---------- */
  shrineFor(p, d) {
    const id = p.id;
    const tier = U.weighted([[1, 50], [2, 35], [3, 15]], U.h('kt', id));
    const god = SHRINE_GODS[Math.floor(U.h('kn', id) * SHRINE_GODS.length)];
    return { type: 'shrine', id, tier, name: p.name, god, photo: p.photo, lat: p.lat, lng: p.lng, d, won: S.d.shrines[id] === U.today() };
  },
  // Капище у реального объекта; пока в нём открыт Разлом, поединок недоступен
  shrinesAround(lat, lng, radius = this.VIEW + 400) {
    const hour = Math.floor(U.now() / 3600000);
    return Poi.near(lat, lng, radius, 'shrine').filter(p => !this.riftAt(p.id, hour)).map(p => this.shrineFor(p, p.d));
  },
  // Прислужник Нави на захваченном роднике: трое омрачённых духов одной стихии
  grunt(e) {
    const r = U.rng('grunt' + e.invId);
    const el = ELEMENT_KEYS[Math.floor(r() * ELEMENT_KEYS.length)];
    const pool = SPECIES.filter(s => s.el === el && !s.legend && !s.region && !s.season && s.rar <= 3);
    const top = [...S.d.spirits].sort((a, b) => S.power(b) - S.power(a)).slice(0, 3);
    const avg = top.length ? top.reduce((a, x) => a + x.lvl, 0) / top.length : S.d.level;
    const lvl = U.clamp(Math.round(Math.min(avg, S.d.level + 2)) - 1, 3, 40);
    const team = [];
    for (let k = 0; k < 3; k++) {
      const s = pool[Math.floor(r() * pool.length)];
      const sp = S.makeSpirit(s.id, lvl, e.invId + k, { ivMin: 3 });
      sp.dark = true;
      team.push(sp);
    }
    return { name: 'Прислужник Нави', color: '#3b0764', title: `Отряд стихии «${ELEMENTS[el].name}»`, team, el, quote: GRUNT_QUOTES[Math.floor(r() * GRUNT_QUOTES.length)] };
  },

  // Хранитель меняется каждый день; уровень его духов подстраивается под уровень игрока
  guardian(e) {
    const r = U.rng(e.id + U.today());
    const T = SHRINE_TIERS[e.tier];
    const name = GUARDIANS[Math.floor(r() * GUARDIANS.length)];
    const color = GUARD_COLORS[Math.floor(r() * GUARD_COLORS.length)];
    // Ученик — только первые стадии, Мастер — до второй, Старейшина — любые, включая редких
    const rars = e.tier === 1 ? [1, 2] : e.tier === 2 ? [1, 2, 3] : [2, 3, 4];
    const maxStage = e.tier === 1 ? 1 : e.tier === 2 ? 2 : 3;
    const pool = SPECIES.filter(s => !s.legend && !s.region && !s.season && rars.includes(s.rar) && s.stage <= maxStage);
    // ориентир — средний уровень трёх сильнейших духов игрока (но не выше уровня Ловчего +2)
    const top = [...S.d.spirits].sort((a, b) => S.power(b) - S.power(a)).slice(0, 3);
    const avg = top.length ? top.reduce((a, x) => a + x.lvl, 0) / top.length : S.d.level;
    const lvl = U.clamp(Math.round(Math.min(avg, S.d.level + 2)) + T.lvl, 3, 40);
    const team = [];
    while (team.length < 3) {
      const s = pool[Math.floor(r() * pool.length)];
      if (team.some(x => x.sid === s.id)) continue;
      const sp = S.makeSpirit(s.id, U.clamp(lvl + Math.floor(r() * 3) - 1, 3, 40), e.id + U.today() + team.length, { ivMin: e.tier * 4 });
      team.push(sp);
    }
    return { name, color, title: T.title, team };
  },

  // Уборка устаревших отметок (выполняется на сервере)
  prune() {
    const now = U.now(), hour = Math.floor(now / 3600000);
    for (const k in S.d.caught) if (now - S.d.caught[k] > 2 * this.SLOT) delete S.d.caught[k];
    for (const k in S.d.springs) if (now - S.d.springs[k] > this.SPRING_COOLDOWN * 2) delete S.d.springs[k];
    for (const k in S.d.rifts) if (+k.split(':').pop() < hour - 1) delete S.d.rifts[k];
    const day = U.today();
    for (const k in S.d.shrines) if (S.d.shrines[k] !== day) delete S.d.shrines[k];
    const slot = Math.floor(now / 7200000);
    for (const k in S.d.freed) if (+k.split(':').pop() < slot - 1) delete S.d.freed[k];
  },
};

// ===== www/js/state.js =====
/* Состояние игрока: сохранение, предметы, духи, опыт, задания, коконы */

const SAVE_KEY = 'duholov.save.v1';

/* Прогресс меняет только сервер игры (server/game/core.js запускает эти же функции у себя).
   На телефоне S.d — копия, присланная сервером; методы-изменения здесь вызываются только сервером. */
const S = {
  d: null,

  save() {}, // сохранением занимается сервер
  migrate() {
    const d = this.d;
    delete d.settings; delete d.lastPos; delete d.tutPos; // настройки и позиция — на телефоне (settings.js)
    d.stats = Object.assign({ caught: 0, springs: 0, raids: 0, evolved: 0, hatched: 0, km: 0, throwsGreat: 0, shiny: 0, duels: 0 }, d.stats || {});
    d.shrines = d.shrines || {};
    d.team = d.team || [];
    d.sent = d.sent || [];
    d.gifts = d.gifts || {};
    d.stats.traded = d.stats.traded || 0;
    d.stats.invasions = d.stats.invasions || 0;
    d.stats.purified = d.stats.purified || 0;
    d.freed = d.freed || {};
    d.amulets = d.amulets || {};
    d.journal = d.journal || [];
    d.friends = d.friends || [];
    d.giftsOpened = d.giftsOpened || {};
    d.props = d.props || {}; // решения по моим заявкам мест, о которых уже сообщили
    d.friendLinks = d.friendLinks || {}; // обработанные входящие дружбы: pid → время связи
    d.streak = d.streak || { n: 0, day: '' }; // серия дней: сколько дней подряд и последний день
    d.order = d.order || {}; // вклад в общее дело Ордена: неделя → { n, got: [ступени] }
    d.stats.streakBest = d.stats.streakBest || 0;
    d.stats.orderPts = d.stats.orderPts || 0;
    d.tasks = d.tasks || []; // поручения из родников
    d.taskMeet = d.taskMeet || []; // встречи за выполненные поручения: { id, sid, lvl }
    if (!d.pid) d.pid = U.uid() + U.uid();
    d.look = Object.assign({ cloak: '#6d28d9', eyes: '#5eead4', emblem: 'charm' }, d.look || {});
    d.stats.byEl = d.stats.byEl || {};
    d.items = d.items || {}; d.essence = d.essence || {}; d.dex = d.dex || {};
    d.spirits = d.spirits || []; d.cocoons = d.cocoons || []; d.springs = d.springs || {}; d.rifts = d.rifts || {}; d.caught = d.caught || {};
    d.medals = d.medals || {};
    d.story = d.story || { ch: 0, p: [0, 0, 0] };
    if (d.buddy === undefined) d.buddy = null;
  },

  newGame(name, starter) {
    this.d = {
      v: 1, name, level: 1, xp: 0, sparks: 500, created: Date.now(),
      items: { charm: 30, honey: 3, water: 3, incense: 1 },
      essence: {}, spirits: [], dex: {}, cocoons: [{ id: U.uid(), km: 2, walked: 0, inc: true }],
      springs: {}, rifts: {}, caught: {}, incenseUntil: 0, lastPos: null, quests: null,
    };
    this.migrate();
    const sp = this.makeSpirit(starter, 5, 'starter' + Date.now(), { ivMin: 10 });
    this.addSpirit(sp, true);
    this.d.essence[SP[starter].fam] = 10;
    this.d.buddy = { uid: sp.uid, km: 0, finds: 0 };
    this.d.tut = 1; // обучение для новых игроков
    this.ensureQuests();
    this.save(true);
  },

  /* ---------- духи ---------- */
  cpm(lvl) { return 0.094 + (0.7903 - 0.094) * Math.sqrt((lvl - 1) / 39); },
  stats(sp) {
    const b = SP[sp.sid].base, c = this.cpm(sp.lvl);
    // омрачённые духи бьют сильнее, но хуже держат удар
    const atk = (b[0] + sp.iv[0]) * c * (sp.dark ? 1.2 : 1), def = (b[1] + sp.iv[1]) * c * (sp.dark ? 0.83 : 1), sta = (b[2] + sp.iv[2]) * c;
    const power = Math.max(10, Math.floor((b[0] + sp.iv[0]) * Math.sqrt(b[1] + sp.iv[1]) * Math.sqrt(b[2] + sp.iv[2]) * c * c / 10));
    return { atk, def, sta, hp: Math.max(10, Math.floor(sta)), power };
  },
  power(sp) { return this.stats(sp).power; },
  // Показатели в битве: с учётом амулета
  battle(sp) {
    const x = this.stats(sp), a = sp.amulet && AMULETS[sp.amulet] || {};
    return { atk: x.atk * (a.atk || 1), def: x.def * (a.def || 1), hp: Math.floor(x.hp * (a.hp || 1)), power: x.power, energy: a.energy || 1 };
  },

  /* ---------- амулеты ---------- */
  addAmulet(id, n = 1) { this.d.amulets[id] = (this.d.amulets[id] || 0) + n; this.save(); },
  rollAmulet(chance, seed) {
    const r = U.rng(seed + Date.now());
    if (r() >= chance) return null;
    const id = AMULET_KEYS[Math.floor(r() * AMULET_KEYS.length)];
    this.addAmulet(id);
    return id;
  },
  equip(sp, id) {
    if (!(this.d.amulets[id] > 0)) return false;
    if (sp.amulet) this.unequip(sp);
    this.d.amulets[id]--;
    sp.amulet = id;
    if (this.d.buddy && this.d.buddy.uid === sp.uid) Bus.emit('buddyChanged');
    this.save();
    return true;
  },
  unequip(sp) {
    if (!sp.amulet) return;
    this.addAmulet(sp.amulet);
    sp.amulet = null;
    this.save();
  },
  canLearnMove2(sp) {
    if (sp.move2) return 'Приём уже выучен';
    if (this.d.sparks < MOVE2_COST.sparks) return `Нужно ✦ ${MOVE2_COST.sparks}`;
    if ((this.d.essence[SP[sp.sid].fam] || 0) < MOVE2_COST.essence) return `Нужно ${MOVE2_COST.essence} эссенции`;
    return null;
  },
  learnMove2(sp) {
    if (this.canLearnMove2(sp)) return false;
    this.d.sparks -= MOVE2_COST.sparks;
    this.d.essence[SP[sp.sid].fam] -= MOVE2_COST.essence;
    sp.move2 = true;
    this.save();
    return true;
  },
  makeSpirit(sid, lvl, seed, { ivMin = 0 } = {}) {
    const r = U.rng(seed);
    const iv = [0, 0, 0].map(() => ivMin + Math.floor(r() * (16 - ivMin)));
    return { uid: U.uid(), sid, lvl, iv, t: Date.now(), fav: false, nick: null };
  },
  ivPct(sp) { return Math.round((sp.iv[0] + sp.iv[1] + sp.iv[2]) / 45 * 100); },
  maxLvl() { return Math.min(40, this.d.level + 5); },
  addSpirit(sp, silent) {
    this.d.spirits.push(sp);
    const dx = this.d.dex[sp.sid] = this.d.dex[sp.sid] || { seen: 1, caught: 0 };
    const isNew = !dx.caught;
    dx.caught++;
    if (sp.shiny) { dx.shiny = (dx.shiny || 0) + 1; this.d.stats.shiny++; }
    if (!silent) {
      const el = SP[sp.sid].el;
      this.d.stats.byEl[el] = (this.d.stats.byEl[el] || 0) + 1;
      this.save();
    }
    return isNew;
  },
  seen(sid) { const dx = this.d.dex[sid] = this.d.dex[sid] || { seen: 0, caught: 0 }; dx.seen++; this.save(); },
  findSpirit(uid) { return this.d.spirits.find(s => s.uid === uid); },
  release(uid) {
    const i = this.d.spirits.findIndex(s => s.uid === uid);
    if (i < 0) return;
    const sp = this.d.spirits[i];
    if (sp.amulet) this.addAmulet(sp.amulet); // амулет возвращается в сумку
    this.d.spirits.splice(i, 1);
    this.addEssence(SP[sp.sid].fam, 1);
    if (this.d.buddy && this.d.buddy.uid === uid) { this.d.buddy = null; Bus.emit('buddyChanged'); }
    this.save();
  },

  /* ---------- команда для разломов и капищ ---------- */
  team() {
    const chosen = this.d.team.map(u => this.findSpirit(u)).filter(Boolean);
    if (chosen.length) return chosen.slice(0, 3);
    return [...this.d.spirits].sort((a, b) => this.power(b) - this.power(a)).slice(0, 3);
  },
  setTeam(uids) { this.d.team = uids.slice(0, 3); this.save(); },

  /* ---------- спутник ---------- */
  buddySpirit() { return this.d.buddy ? this.findSpirit(this.d.buddy.uid) : null; },
  buddyDist(sp) {
    const s = SP[sp.sid], d = s.legend || s.stage === 3 ? 5 : s.stage === 2 || s.rar >= 3 ? 3 : 1;
    return sp.amulet === 'lada' ? d / 2 : d;
  },
  setBuddy(uid) {
    this.d.buddy = { uid, km: 0, finds: 0 };
    Bus.emit('buddyChanged');
    this.save();
  },
  buddyWalk(km) {
    const b = this.d.buddy, sp = this.buddySpirit();
    if (!b || !sp) return;
    b.km += km;
    const need = this.buddyDist(sp);
    while (b.km >= need) {
      b.km -= need; b.finds++;
      const s = SP[sp.sid];
      this.addEssence(s.fam, 3);
      let extra = '';
      if (b.finds % 3 === 0) {
        const it = U.weighted([['charm', 5], ['honey', 2], ['water', 1]], Math.random());
        const n = it === 'charm' ? 3 : 1;
        if (this.addItem(it, n)) extra = ` и ${ITEMS[it].name.toLowerCase()} ×${n}`;
      }
      Bus.emit('buddyFind', `Спутник «${sp.nick || s.name}» принёс 3 эссенции${extra}!`);
    }
  },
  addEssence(fam, n) { this.d.essence[fam] = (this.d.essence[fam] || 0) + n; },
  powerUpCost(sp) { return { sparks: 200 + 200 * Math.floor((sp.lvl - 1) / 4), essence: 1 + Math.floor(sp.lvl / 10) }; },
  canPowerUp(sp) {
    const c = this.powerUpCost(sp), fam = SP[sp.sid].fam;
    if (sp.lvl >= this.maxLvl()) return 'Предел: уровень духа не может быть выше уровня Ловчего +5';
    if (this.d.sparks < c.sparks) return 'Не хватает искр';
    if ((this.d.essence[fam] || 0) < c.essence) return 'Не хватает эссенции';
    return null;
  },
  powerUp(sp) {
    if (this.canPowerUp(sp)) return false;
    const c = this.powerUpCost(sp);
    this.d.sparks -= c.sparks; this.d.essence[SP[sp.sid].fam] -= c.essence;
    sp.lvl++;
    this.progress('power', 1);
    this.save();
    return true;
  },
  PURIFY: { sparks: 1000, essence: 10 },
  canPurify(sp) {
    if (!sp.dark) return 'Дух не омрачён';
    if (this.d.sparks < this.PURIFY.sparks) return `Нужно ✦ ${this.PURIFY.sparks}`;
    if ((this.d.essence[SP[sp.sid].fam] || 0) < this.PURIFY.essence) return `Нужно ${this.PURIFY.essence} эссенции`;
    return null;
  },
  purify(sp) {
    if (this.canPurify(sp)) return false;
    this.d.sparks -= this.PURIFY.sparks;
    this.d.essence[SP[sp.sid].fam] -= this.PURIFY.essence;
    sp.dark = false;
    sp.purified = true;
    sp.iv = sp.iv.map(v => Math.min(15, v + 2));
    sp.lvl = Math.max(sp.lvl, Math.min(25, this.maxLvl()));
    this.d.stats.purified++;
    this.progress('purify', 1);
    this.addXP(1000);
    this.save();
    return true;
  },
  canEvolve(sp) {
    const s = SP[sp.sid];
    if (!s.evo) return 'Этот дух не превращается';
    if ((this.d.essence[s.fam] || 0) < s.cost) return `Нужно ${s.cost} эссенции`;
    return null;
  },
  evolve(sp) {
    if (this.canEvolve(sp)) return null;
    const s = SP[sp.sid];
    this.d.essence[s.fam] -= s.cost;
    sp.sid = s.evo;
    const dx = this.d.dex[sp.sid] = this.d.dex[sp.sid] || { seen: 0, caught: 0 };
    const isNew = !dx.caught;
    dx.seen++; dx.caught++;
    this.d.stats.evolved++;
    J.add('evolve', { from: s.id, to: sp.sid });
    if (this.d.buddy && this.d.buddy.uid === sp.uid) Bus.emit('buddyChanged');
    this.addXP(isNew ? 1000 : 500);
    this.progress('evolve', 1);
    this.save();
    return { isNew };
  },

  /* ---------- предметы ---------- */
  bagCount() { return Object.values(this.d.items).reduce((a, b) => a + b, 0); },
  addItem(k, n = 1) {
    const room = BAG_LIMIT - this.bagCount();
    const add = Math.max(0, Math.min(n, room));
    this.d.items[k] = (this.d.items[k] || 0) + add;
    this.save();
    return add;
  },
  useItem(k) { if ((this.d.items[k] || 0) <= 0) return false; this.d.items[k]--; this.save(); return true; },
  giveRewards(rw) { // { charm: 5, sparks: 300, xp: 100 ... } → массив строк для показа
    const out = [];
    for (const [k, n] of Object.entries(rw)) {
      if (!n) continue;
      if (k === 'sparks') { this.d.sparks += n; out.push({ k, n, label: 'Искры' }); }
      else if (k === 'xp') { out.push({ k, n: Math.round(n * Ev.xpMul()), label: 'Опыт' }); this.addXP(n); }
      else if (ITEMS[k]) { const a = this.addItem(k, n); if (a) out.push({ k, n: a, label: ITEMS[k].name }); }
    }
    this.save();
    return out;
  },
  incenseActive() { return this.d.incenseUntil > Date.now(); },

  /* ---------- опыт ---------- */
  addXP(n) {
    n = Math.round(n * Ev.xpMul());
    this.d.xp += n;
    let leveled = [];
    while (this.d.level < MAX_LEVEL && this.d.xp >= levelXP(this.d.level + 1)) {
      this.d.level++;
      leveled.push(this.d.level);
    }
    // награда за уровень выдаётся сразу (на сервере), телефон только показывает окно
    leveled.forEach(l => {
      const got = this.giveRewards(this.levelRewards(l));
      J.add('level', { l });
      Bus.emit('levelup', { l, got });
    });
    Bus.emit('xp');
    this.save();
  },
  levelRewards(l) {
    const r = { charm: 10 + l, honey: 3, water: 3 };
    if (l % 5 === 0) r.incense = 1;
    if (l >= 8) r.charm2 = l === 8 ? 10 : 4;
    if (l >= 16) r.charm3 = l === 16 ? 10 : 3;
    return r;
  },

  /* ---------- коконы ---------- */
  addDistance(m) {
    if (m <= 0) return;
    this.d.stats.km += m / 1000;
    const km = m / 1000 * Ev.kmMul(); // для коконов и спутника (в «Неделю коконов» — вдвое)
    this.d.cocoons.forEach(c => {
      if (!c.inc || c.walked >= c.km) return;
      c.walked = Math.min(c.km, c.walked + km);
      if (c.walked >= c.km) Bus.emit('cocoonReady', c);
    });
    this.buddyWalk(km);
    this.progress('walk', m / 1000);
    this.save();
  },
  incubating() { return this.d.cocoons.filter(c => c.inc).length; },
  readyCocoons() { return this.d.cocoons.filter(c => c.inc && c.walked >= c.km); },
  hatch(c) {
    const tier = COCOON_TIERS[c.km], r = U.rng(c.id + 'hatch');
    const rar = U.weighted(Object.entries(tier.pool).map(([k, w]) => [+k, w]), r());
    let pool = SPECIES.filter(s => !s.legend && s.rar === rar && (s.stage === 1 || rar >= 3) && W.local(s) && !s.season);
    if (!pool.length) pool = SPECIES.filter(s => s.stage === 1 && !s.legend);
    const s = pool[Math.floor(r() * pool.length)];
    const sp = this.makeSpirit(s.id, Math.min(this.d.level, 20), c.id, { ivMin: 10 });
    if (r() < Sky.shinyRate(1 / 64)) sp.shiny = true;
    this.d.cocoons = this.d.cocoons.filter(x => x !== c);
    const isNew = this.addSpirit(sp);
    this.addEssence(s.fam, c.km * 3);
    this.d.sparks += c.km * 150;
    this.d.stats.hatched++;
    J.add('hatch', { sid: s.id, km: c.km, shiny: !!sp.shiny });
    this.progress('hatch', 1);
    this.addXP(c.km * 100 + (isNew ? 500 : 0));
    this.save();
    return { sp, isNew, essence: c.km * 3, sparks: c.km * 150 };
  },

  /* ---------- задания дня ---------- */
  ensureQuests() {
    const day = U.today();
    if (this.d.quests && this.d.quests.day === day) return;
    const r = U.rng('quests' + day + this.d.name);
    const pool = QUEST_TEMPLATES.filter(q => (q.t !== 'raid' || this.d.level >= 5) && (q.t !== 'duel' || this.d.level >= 3));
    const picked = [];
    while (picked.length < 3) {
      const q = pool[Math.floor(r() * pool.length)];
      if (!picked.includes(q)) picked.push(q);
    }
    this.d.quests = {
      day, bonus: false,
      list: picked.map(q => {
        const n = q.min + Math.floor(r() * (q.max - q.min + 1));
        const el = ELEMENT_KEYS[Math.floor(r() * ELEMENT_KEYS.length)];
        return { t: q.t, n, el, p: 0, claimed: false, text: q.text(n, el), reward: q.reward };
      }),
    };
    this.save();
  },
  progress(type, amount = 1, meta = {}) {
    if (!this.d) return;
    this.ensureQuests();
    let changed = false;
    this.d.quests.list.forEach(q => {
      if (q.t !== type || q.p >= q.n) return;
      if (type === 'catchEl' && meta.el !== q.el) return;
      q.p = Math.min(q.n, q.p + amount);
      changed = true;
      if (q.p >= q.n) Bus.emit('questDone', q);
    });
    // поручения из родников
    this.d.tasks.forEach(q => {
      if (q.t !== type || q.p >= q.n) return;
      if (type === 'catchEl' && meta.el !== q.el) return;
      q.p = Math.min(q.n, q.p + amount);
      changed = true;
      if (q.p >= q.n) Bus.emit('toast', { text: `Поручение выполнено: ${q.text}`, cls: 'good' });
    });
    // Летопись
    const ch = STORY[this.d.story.ch];
    if (ch) ch.steps.forEach((s, i) => {
      if (s.t !== type || this.d.story.p[i] >= s.n) return;
      if (type === 'catchEl' && meta.el !== s.el) return;
      this.d.story.p[i] = Math.min(s.n, this.d.story.p[i] + amount);
      changed = true;
      if (this.d.story.p[i] >= s.n) Bus.emit('storyStep', s);
    });
    if (changed) { Bus.emit('quests'); this.save(); }
  },
  questsClaimable() {
    const daily = this.d.quests ? this.d.quests.list.filter(q => q.p >= q.n && !q.claimed).length : 0;
    return daily + (this.storyReady() ? 1 : 0) + this.d.tasks.filter(q => q.p >= q.n).length + this.d.taskMeet.length;
  },
  // Новое поручение (выдаёт сервер у родника): задание и дух, который встретится в награду
  makeTask() {
    const r = Math.random, pool = TASK_TEMPLATES.filter(q => !q.lvl || this.d.level >= q.lvl);
    const q = pool[Math.floor(r() * pool.length)], T = TASK_TIERS[q.tier];
    const n = q.min + Math.floor(r() * (q.max - q.min + 1)), el = ELEMENT_KEYS[Math.floor(r() * ELEMENT_KEYS.length)];
    const sps = SPECIES.filter(s => s.stage === 1 && !s.legend && !s.region && !s.season && T.rar.includes(s.rar));
    return { id: U.uid(), t: q.t, n, el, p: 0, tier: q.tier, sid: sps[Math.floor(r() * sps.length)].id, text: q.text(n, el) };
  },

  /* ---------- Летопись ---------- */
  storyReady() {
    const ch = STORY[this.d.story.ch];
    return !!ch && ch.steps.every((s, i) => this.d.story.p[i] >= s.n);
  },
  claimStory() {
    const ch = STORY[this.d.story.ch];
    if (!ch || !this.storyReady()) return null;
    const got = this.giveRewards(ch.reward);
    this.d.story = { ch: this.d.story.ch + 1, p: [0, 0, 0] };
    this.save();
    return { ch, got };
  },

  /* ---------- Знаки Ордена ---------- */
  medalValue(m) {
    const st = this.d.stats;
    if (m.stat === 'dex') return SPECIES.filter(s => this.d.dex[s.id] && this.d.dex[s.id].caught).length;
    if (m.stat.startsWith('el:')) return st.byEl[m.stat.slice(3)] || 0;
    return st[m.stat] || 0;
  },
  medalTier(m) { return m.tiers.filter(t => this.medalValue(m) >= t).length; },
  checkMedals() {
    if (!this.d || this._medalBusy) return;
    this._medalBusy = true;
    MEDALS.forEach(m => {
      const tier = this.medalTier(m), had = this.d.medals[m.id] || 0;
      if (tier > had) {
        this.d.medals[m.id] = tier;
        for (let t = had; t < tier; t++) this.addXP(MEDAL_TIERS[t].xp);
        Bus.emit('medal', { m, tier });
        J.add('medal', { name: m.name, tier });
      }
    });
    this._medalBusy = false;
  },
};

// ===== www/js/journal.js =====
/* Дневник Ловчего: хроника событий с местом и временем (последние 250 записей) */

const J = {
  MAX: 250,
  FILTERS: [['all', 'Всё'], ['catch', 'Поимки'], ['battle', 'Битвы'], ['other', 'Прочее']],
  GROUP: { catch: 'catch', flee: 'catch', hatch: 'catch', raid: 'battle', duel: 'battle', invasion: 'battle', league: 'battle', spar: 'battle' },
  filter: 'all',

  add(type, data = {}) {
    if (!S.d) return;
    const e = { t: Date.now(), type, ...data };
    if (MapView.pos && e.lat == null) { e.lat = +MapView.pos.lat.toFixed(5); e.lng = +MapView.pos.lng.toFixed(5); }
    S.d.journal.unshift(e);
    if (S.d.journal.length > this.MAX) S.d.journal.length = this.MAX;
    S.save();
  },

  // Иконка, заголовок и подпись записи
  view(e) {
    const sp = sid => SP[sid] ? SP[sid].name : '?';
    const icon = sid => `<div class="j-ico">${Art.img(sid, e.shiny, e.dark)}</div>`;
    const glyph = (g, cls = '') => `<div class="j-ico glyph ${cls}">${g}</div>`;
    switch (e.type) {
      case 'catch': return { ico: icon(e.sid), title: `Пойман ${e.shiny ? 'сияющий ' : ''}${e.dark ? 'омрачённый ' : ''}${sp(e.sid)}`, sub: e.power ? `СИЛА ${e.power}` : '' };
      case 'flee': return { ico: icon(e.sid), title: `${sp(e.sid)} ускользнул`, sub: 'Дух вернулся в Навь', cls: 'dim' };
      case 'hatch': return { ico: icon(e.sid), title: `Из кокона появился ${sp(e.sid)}`, sub: e.km ? `Кокон ${e.km} км` : '' };
      case 'evolve': return { ico: icon(e.to), title: `${sp(e.from)} превратился в ${sp(e.to)}`, sub: '' };
      case 'raid': return { ico: icon(e.sid), title: `Разлом закрыт: ${sp(e.sid)}`, sub: '★'.repeat(e.tier || 1) };
      case 'duel': return { ico: glyph('⛩'), title: `Победа: ${e.name}`, sub: `Хранитель ${e.guard || ''}` };
      case 'invasion': return { ico: glyph('☾', 'dark'), title: `Родник освобождён`, sub: e.name || '' };
      case 'league': return { ico: glyph('★', 'gold'), title: `Турнир Лиги: побед ${e.won} из 3`, sub: `Ранг: ${e.rank}` };
      case 'level': return { ico: glyph(e.l, 'gold'), title: `Новый уровень: ${e.l}`, sub: '' };
      case 'medal': return { ico: glyph('✦', 'gold'), title: `Знак «${e.name}»`, sub: MEDAL_TIERS[e.tier - 1] ? MEDAL_TIERS[e.tier - 1].name : '' };
      case 'story': return { ico: glyph('✎'), title: `Глава Летописи: «${e.title}»`, sub: 'Завершена' };
      case 'trade': return { ico: icon(e.sid), title: e.dir === 'out' ? `${sp(e.sid)} упакован для друга` : `${sp(e.sid)} получен от ${e.who || 'друга'}`, sub: 'Обмен' };
      case 'friend': return { ico: glyph('♥', 'pink'), title: `Новый друг: ${e.name}`, sub: '' };
      case 'spar': return { ico: glyph('⚔'), title: `Победа в поединке с другом`, sub: e.name || '' };
      case 'order': return { ico: glyph('⚑', 'gold'), title: 'Общее дело Ордена', sub: `Награда ${(e.i | 0) + 1}-й ступени` };
      case 'gift': return { ico: glyph('✉', 'pink'), title: e.dir === 'out' ? `Подарок отправлен: ${e.name}` : `Подарок от ${e.name}`, sub: '' };
    }
    return { ico: glyph('•'), title: e.type, sub: '' };
  },

  screen() {
    const scr = UI.screen('Дневник Ловчего', `
      <div class="chips j-filters">${this.FILTERS.map(([k, t]) => `<button data-f="${k}">${t}</button>`).join('')}</div>
      <div class="j-list"></div>`, 'journal-screen');
    const render = () => {
      U.$$('[data-f]', scr).forEach(b => b.classList.toggle('on', b.dataset.f === this.filter));
      const list = S.d.journal.filter(e => this.filter === 'all' || (this.GROUP[e.type] || 'other') === this.filter);
      let day = '', html = '';
      list.forEach((e, i) => {
        const d = new Date(e.t), ds = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });
        if (ds !== day) { day = ds; html += `<div class="j-day">${ds}</div>`; }
        const v = this.view(e);
        html += `<div class="j-row ${v.cls || ''}">${v.ico}<div class="row-main"><b>${U.esc(v.title)}</b><small>${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}${v.sub ? ' · ' + U.esc(v.sub) : ''}</small></div>
          ${e.lat != null ? `<button class="btn small ghost j-map" data-i="${S.d.journal.indexOf(e)}" title="На карте">${UI.I.pin}</button>` : ''}</div>`;
      });
      scr.querySelector('.j-list').innerHTML = html || '<div class="empty">Записей пока нет. Лови духов — дневник заполнится сам.</div>';
    };
    scr.addEventListener('click', ev => {
      const f = ev.target.closest('[data-f]');
      if (f) { this.filter = f.dataset.f; render(); return; }
      const m = ev.target.closest('.j-map');
      if (m) {
        const e = S.d.journal[+m.dataset.i];
        // закрываем все экраны и показываем место на карте
        for (let k = 0; k < 6 && UI.layers.length; k++) UI.back();
        setTimeout(() => MapView.showPin(e.lat, e.lng, this.view(e).title), 250);
      }
    });
    render();
  },
};

// ===== www/js/league.js =====
/* Лига Ордена: турнир — три поединка подряд с Ловчими Лиги, раны между боями не лечатся.
   Победа — звезда, три победы подряд — ещё одна. Сезон длится месяц, в начале нового звёзды делятся пополам.
   Жетоны, звёзды и награды ведёт сервер (leagueStart / leagueEnd), телефон показывает бои. */

const LEAGUE_RANKS = [
  { name: 'Новик', stars: 0 },
  { name: 'Отрок', stars: 3, reward: { charm: 10, sparks: 500 } },
  { name: 'Гридень', stars: 6, reward: { honey: 5, sparks: 800 } },
  { name: 'Кметь', stars: 10, reward: { charm2: 5, water: 5 } },
  { name: 'Витязь', stars: 15, reward: { charm2: 8, sparks: 1500 } },
  { name: 'Богатырь', stars: 21, reward: { charm3: 3, incense: 1 } },
  { name: 'Воевода', stars: 28, reward: { charm2: 10, sparks: 3000 } },
  { name: 'Волхв', stars: 36, reward: { charm3: 5, water: 10 } },
  { name: 'Сказитель', stars: 45, reward: { incense: 3, sparks: 5000 } },
  { name: 'Хранитель Лиги', stars: 55, reward: { charm3: 10, sparks: 8000 } },
];

const League = {
  TICKETS: 3,
  carry: null, // раны духов между боями турнира (только на телефоне)

  season(d = U.local()) { return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; },
  seasonName() { return U.local().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' }); },
  seasonEnds() { const d = U.local(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)); },
  // новый сезон — звёзды пополам, новый день — снова три жетона
  norm(L) {
    L = L || { season: this.season(), stars: 0, best: 0, tickets: this.TICKETS, day: U.today(), got: {}, run: null };
    if (L.season !== this.season()) { L.season = this.season(); L.stars = Math.floor(L.stars / 2); L.got = {}; L.run = null; }
    if (L.day !== U.today()) { L.day = U.today(); L.tickets = this.TICKETS; }
    return L;
  },
  st() { return (S.d.league = this.norm(S.d.league)); },                                      // сервер
  view() { return this.norm(S.d.league ? JSON.parse(JSON.stringify(S.d.league)) : null); },   // телефон
  rank(stars) { let r = 0; LEAGUE_RANKS.forEach((x, i) => { if (stars >= x.stars) r = i; }); return r; },

  // Соперник: сила растёт с рангом, ориентир — средний уровень твоих трёх сильнейших.
  // Одинаков на телефоне и сервере: зависит от звёзд, номера боя и зерна турнира.
  opponent(k, L = this.view()) {
    const r = this.rank(L.stars), seed = L.run ? L.run.seed : 0;
    const rng = U.rng(`league:${L.season}:${L.stars}:${k}:${seed}`);
    const maxStage = r <= 2 ? 1 : r <= 5 ? 2 : 3, maxRar = r <= 2 ? 2 : r <= 5 ? 3 : 4;
    const pool = SPECIES.filter(s => !s.legend && !s.region && !s.season && s.rar <= maxRar && s.stage <= maxStage);
    const top = [...S.d.spirits].sort((a, b) => S.power(b) - S.power(a)).slice(0, 3);
    const avg = top.length ? top.reduce((a, x) => a + x.lvl, 0) / top.length : S.d.level;
    const lvl = U.clamp(Math.round(Math.min(avg, S.d.level + 2) + (r - 3) * 0.8 + k), 3, 40);
    const team = [];
    while (team.length < 3) {
      const s = pool[Math.floor(rng() * pool.length)];
      if (team.some(x => x.sid === s.id)) continue;
      team.push(S.makeSpirit(s.id, lvl, `lg${L.stars}${k}${team.length}${seed || ''}`, { ivMin: Math.min(12, 3 + r) }));
    }
    // имена трёх соперников турнира не повторяются (сдвиг 5 по кругу из 12)
    const name = GUARDIANS[(Math.floor(U.h('lgname', seed || L.stars) * GUARDIANS.length) + k * 5) % GUARDIANS.length];
    return {
      name, color: GUARD_COLORS[Math.floor(rng() * GUARD_COLORS.length)], title: `Ловчий Лиги · ${LEAGUE_RANKS[r].name}`, team,
      T: { speed: Math.max(0.55, 0.86 - r * 0.033), shield: Math.min(0.9, 0.3 + r * 0.065) },
    };
  },

  screen() {
    const L = this.view(), r = this.rank(L.stars), next = LEAGUE_RANKS[r + 1];
    const team = S.team();
    const pct = next ? (L.stars - LEAGUE_RANKS[r].stars) / (next.stars - LEAGUE_RANKS[r].stars) * 100 : 100;
    const scr = UI.screen('Лига Ордена', `
      <div class="league">
        <div class="lg-badge r${Math.min(9, r)}"><span>${r + 1}</span></div>
        <div class="lg-rank">${LEAGUE_RANKS[r].name}</div>
        <div class="lg-season">Сезон: ${this.seasonName()} · до ${this.seasonEnds().toLocaleDateString('ru-RU', { timeZone: 'UTC' })}</div>
        <div class="pbar big"><i style="width:${pct}%"></i></div>
        <small>★ ${L.stars}${next ? ` / ${next.stars} до ранга «${next.name}»` : ' — высший ранг!'}</small>
        <div class="lg-tickets">${'<i class="on"></i>'.repeat(L.tickets)}${'<i></i>'.repeat(this.TICKETS - L.tickets)}<span>Жетоны турнира: ${L.tickets} из ${this.TICKETS} (обновятся завтра)</span></div>
        <div class="panel lg-rules"><b>Турнир</b><small>Три поединка подряд с Ловчими Лиги. Раны духов между боями не лечатся, щиты — восстанавливаются. Победа — ★, три победы подряд — ещё ★. Поражение звёзд не отнимает.</small></div>
        <div class="rift-team-title">Команда на турнир <button class="btn small ghost team-edit">Изменить</button></div>
        <div class="rift-team my">${UI.teamHtml(team)}</div>
        <button class="btn primary wide lg-go" ${L.tickets > 0 && team.length === 3 ? '' : 'disabled'}>${team.length < 3 ? 'Нужно три духа' : L.tickets > 0 ? 'Начать турнир' : 'Жетоны кончились — приходи завтра'}</button>
        <h3 class="prof-h">Таблица сезона</h3>
        <div class="list lg-top">${Cloud.enabled() ? '<div class="row"><div class="row-main"><small>Загружаю…</small></div></div>'
          : '<div class="row"><div class="row-main"><small>Общая таблица всех Ловчих появится, когда к игре подключат облачный сервер.</small></div></div>'}</div>
        <h3 class="prof-h">Награды за ранги</h3>
        <div class="list lg-rewards">${LEAGUE_RANKS.slice(1).map((x, i) => `
          <div class="row ${L.best >= i + 1 ? 'got' : ''}"><div class="lg-mini r${i + 1}">${i + 2}</div><div class="row-main"><b>${x.name}</b><small>★ ${x.stars} · ${UI.rwText(x.reward)}${(i + 1) % 3 === 0 ? ' + амулет' : ''}${i + 1 === 9 ? ' + эмблема «Венец»' : ''}</small></div>${L.got[i + 1] ? '<span class="q-ok">✓</span>' : ''}</div>`).join('')}</div>
      </div>`, 'league-screen');
    scr.querySelector('.team-edit').onclick = () => UI.pickTeam(() => { this.closeAndReopen(scr); });
    if (Cloud.enabled()) {
      Cloud.top(L.season).then(({ rows, me }) => {
        const box = scr.querySelector('.lg-top'); if (!box) return;
        box.innerHTML = rows.length ? rows.map((x, i) => `<div class="row ${x.user_id === me ? 'lg-me' : ''}"><b class="lg-pos">${i + 1}</b><div class="fr-ava">${Art.avatar(x.look || undefined)}</div>
          <div class="row-main"><b>${U.esc(x.name)}</b><small>${LEAGUE_RANKS[x.rank] ? LEAGUE_RANKS[x.rank].name : ''} · ур. ${x.level}</small></div><span class="cnt">★ ${x.stars}</span></div>`).join('')
          : '<div class="row"><div class="row-main"><small>В этом сезоне ещё никто не играл — будь первым!</small></div></div>';
      }).catch(e => { const box = scr.querySelector('.lg-top'); if (box) box.innerHTML = `<div class="row"><div class="row-main"><small>Таблица недоступна: ${U.esc(e.message)}</small></div></div>`; });
    }
    scr.querySelector('.lg-go').onclick = async () => {
      if (S.team().length < 3) return;
      const r0 = await Game.try('leagueStart');
      if (!r0) return;
      UI.closeScreen(scr);
      this.carry = null;
      this.next();
    };
  },
  closeAndReopen(scr) { UI.closeScreen(scr); setTimeout(() => this.screen(), 230); },

  next() {
    const run = this.view().run;
    if (!run) return;
    const g = this.opponent(run.k), team = run.team.map(u => S.findSpirit(u)).filter(Boolean);
    Duel.start({ kind: 'league', id: 'league', tier: 1, T: g.T, name: 'Лига', carry: this.carry }, g, team);
  },

  // Вызывается из Duel.finish: итог боя засчитывает сервер
  async afterDuel(win, st) {
    let r = null;
    try { r = await Game.act('leagueEnd', { win: !!win, board: Cfg.s.cloud !== false }); } catch (e) { UI.toast(U.esc(e.message)); }
    if (Duel.st !== st) return;
    if (!r) {
      const res = U.el(`<div class="raid-result"><div class="res-card"><div class="res-title lose">Бой не засчитан</div>
        <div class="res-note">Сервер не подтвердил итог боя. Проверь интернет.</div><button class="btn primary wide lg-done">К Лиге</button></div></div>`);
      st.root.appendChild(res);
      res.querySelector('.lg-done').onclick = () => { Duel.close(); this.carry = null; setTimeout(() => this.screen(), 150); };
      return;
    }
    this.carry = st.me.team;
    this.carry.forEach(f => { f.energy = 0; });
    Sfx.play(r.win ? 'win' : 'lose');
    const alive = this.carry.filter(f => f.cur > 0).length;
    let html;
    if (!r.last) {
      const nx = this.opponent(r.k + 1);
      html = `<div class="res-title">Победа ${r.k + 1} из 3</div>
        <div class="res-note">+★ ${r.gained}. Твои духи (в строю: ${alive}) не отдыхают — следующий соперник уже ждёт.</div>
        <div class="guard"><div class="guard-ava">${Art.guardian(nx.color)}</div><div><b>${nx.name}</b><small>${nx.title}</small></div></div>
        <div class="rift-team">${UI.teamHtml(nx.team)}</div>
        <button class="btn primary wide lg-next">Следующий бой</button>`;
    } else {
      html = `<div class="res-title ${r.won ? '' : 'lose'}">${r.won === 3 ? 'Чистая победа!' : r.won ? 'Турнир окончен' : 'Поражение'}</div>
        <div class="res-note">Побед: ${r.won} из 3 · звёзд получено: ${r.starsGot}<br>Ранг: <b>${LEAGUE_RANKS[r.rNew].name}</b> (★ ${r.stars})</div>
        ${r.rNew > r.rank0 ? `<div class="badge-new">Новый ранг — ${LEAGUE_RANKS[r.rNew].name}!</div>` : ''}
        ${r.rewards.length ? `<div class="res-rw">${r.rewards.map(x => `<div><b>+${U.fmtNum(x.n)}</b> ${x.label}</div>`).join('')}</div>` : ''}
        <button class="btn primary wide lg-done">К Лиге</button>`;
    }
    const res = U.el(`<div class="raid-result"><div class="res-card">${html}</div></div>`);
    st.root.appendChild(res);
    const nb = res.querySelector('.lg-next');
    if (nb) nb.onclick = () => { Duel.close(); setTimeout(() => this.next(), 150); };
    const db = res.querySelector('.lg-done');
    if (db) db.onclick = () => { Duel.close(); this.carry = null; setTimeout(() => this.screen(), 150); };
  },
};

// ===== www/js/raid.js =====
/* Разломы: битва с боссом (тап — атака, свайп/кнопка — уклон), затем поимка босса */

const Raid = {
  TIER: {
    // slvl — уровень, по которому считаются атака/защита босса; lvl — уровень пойманного босса
    1: { hp: 600,  slvl: 14, lvl: 15, pw: 10, charms: 6, name: 'Малый разлом' },
    2: { hp: 1800, slvl: 22, lvl: 22, pw: 16, charms: 7, name: 'Разлом' },
    3: { hp: 4500, slvl: 28, lvl: 30, pw: 24, charms: 9, name: 'Великий разлом' },
  },
  st: null,

  team() { return S.team(); },
  bossStats(r) {
    const T = this.TIER[r.tier], b = SP[r.boss].base, c = S.cpm(T.slvl);
    return { atk: (b[0] + 15) * c, def: (b[1] + 15) * c, hp: T.hp };
  },
  eff(att, def) {
    if (ELEMENTS[att].beats.includes(def)) return 1.6;
    if (ELEMENTS[def].beats.includes(att)) return 0.625;
    return 1;
  },

  open(r) {
    const s = SP[r.boss], T = this.TIER[r.tier];
    let team = this.team();
    const counters = SPECIES.filter(x => ELEMENTS[x.el].beats.includes(s.el)).map(x => x.el).filter((v, i, a) => a.indexOf(v) === i);
    const html = `
      <div class="rift-view t${r.tier}">
        <div class="rift-portal">${Art.riftIcon(r.tier)}</div>
        <div class="rift-boss">${Art.spirit(r.boss)}</div>
        <div class="rift-title">${T.name} <span class="stars">${'★'.repeat(r.tier)}</span></div>
        <div class="rift-name">${Art.elIcon(s.el, 20)} ${s.name}</div>
        ${r.place ? `<div class="rift-meta">Разлом открылся у «${U.esc(r.place)}»</div>` : ''}
        <div class="rift-meta">Сила босса ≈ ${U.fmtNum(T.hp * 1.5)} · закроется через ${U.fmtTime(r.endsAt - Date.now())}</div>
        <div class="rift-tip">Слабость: ${counters.map(e => `${Art.elIcon(e, 16)} ${ELEMENTS[e].name}`).join(' ')}</div>
        ${Sky.w ? `<div class="rift-tip">${Art.wxIcon(Sky.w.key, 16)} ${WEATHER[Sky.w.key].name}: урон +20% у ${WEATHER[Sky.w.key].boost.map(e => ELEMENTS[e].name).join(' и ')}</div>` : ''}
        ${r.done ? '<div class="rift-done">Этот разлом ты уже закрыл. Новый босс — в начале следующего часа.</div>' : `
        <div class="rift-team-title">Твоя команда <button class="btn small ghost team-edit">Изменить</button></div>
        <div class="rift-team">${UI.teamHtml(team)}</div>
        <button class="btn primary wide rift-go" ${team.length ? '' : 'disabled'}>Сразиться</button>
        <button class="btn ghost wide rift-coop">Позвать друзей — совместный бой</button>`}
      </div>`;
    const scr = UI.screen('Разлом', html, 'rift-screen');
    const go = scr.querySelector('.rift-go');
    if (go) go.onclick = async () => { if (await this.battle(r, this.team())) UI.closeScreen(scr); };
    const cb = scr.querySelector('.rift-coop');
    if (cb) cb.onclick = () => { UI.closeScreen(scr); Coop.hostRift(r); };
    const edit = scr.querySelector('.team-edit');
    if (edit) edit.onclick = () => UI.pickTeam(() => { team = this.team(); scr.querySelector('.rift-team').innerHTML = UI.teamHtml(team); });
  },

  // Сервер проверяет, что разлом открыт здесь и сейчас, и запоминает начало боя.
  // coop: { host, hpMul, allies } — совместный бой (см. coop.js). Возвращает true, если бой начался.
  async battle(r, team, coop) {
    if (this.st || this._starting) return false;
    this._starting = true;
    const ok = await Game.try('raidStart', { rift: { id: r.poi, lat: r.lat, lng: r.lng, name: r.place }, coop: coop ? { host: !!coop.host, allies: coop.allies || 0 } : null });
    this._starting = false;
    if (!ok) return false;
    this.start(r, team, coop);
    return true;
  },
  start(r, team, coop) {
    const s = SP[r.boss], T = this.TIER[r.tier], bs = this.bossStats(r);
    if (coop) bs.hp = Math.round(bs.hp * coop.hpMul);
    const root = U.el(`
      <div class="raid el-${s.el}">
        <div class="raid-bg"></div>
        <div class="raid-top">
          <div class="raid-timer">90</div>
          <div class="raid-bname">${Art.elIcon(s.el, 18)} ${s.name}</div>
          <div class="bar boss"><i></i></div>
          ${coop ? '<div class="raid-allies"></div>' : ''}
        </div>
        <div class="raid-boss"><div class="warn">!</div>${Art.spirit(r.boss)}</div>
        <div class="raid-me"></div>
        <div class="raid-fx"></div>
        <div class="raid-hud">
          <div class="raid-mname"></div>
          <div class="bar hp"><i></i></div>
          <div class="raid-team"></div>
        </div>
        <div class="raid-ctrl">
          <button class="raid-water">${Art.item('water')}<span></span></button>
          <button class="raid-special"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="bg"/><circle cx="50" cy="50" r="44" class="fill"/></svg><span>Приём</span></button>
          <button class="raid-dodge">Уклон</button>
        </div>
        <div class="raid-hint">Тапай по экрану — атака.<br>Когда босс замахивается (!) — жми «Уклон» или смахни в сторону.</div>
        <div class="raid-count">3</div>
      </div>`);
    document.body.appendChild(root);
    Music.play('battle');
    const $ = sel => root.querySelector(sel);
    const st = this.st = {
      r, s, bs, root, $, bossHp: bs.hp, time: 90, energy: 0, cool: 0, idx: 0, coop: coop || null, ko: false,
      team: team.map(sp => { const x = S.battle(sp); return { sp, ...x, max: x.hp * 5, cur: x.hp * 5 }; }),
      nextAtk: 3.2, tele: 0, dodgeT: -9, waters: 0, running: false, over: false,
    };
    UI.pushLayer(() => this.quit());
    this.showMine();
    $('.raid-water span').textContent = S.d.items.water || 0;

    const tapArea = root;
    let sx = 0, sy = 0, sid = null;
    tapArea.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      sid = e.pointerId; sx = e.clientX; sy = e.clientY;
    });
    tapArea.addEventListener('pointerup', e => {
      if (e.pointerId !== sid) return; sid = null;
      if (Math.abs(e.clientX - sx) > 50 && Math.abs(e.clientX - sx) > Math.abs(e.clientY - sy)) this.dodge(e.clientX > sx ? 1 : -1);
      else this.fast(e.clientX, e.clientY);
    });
    $('.raid-dodge').onclick = () => this.dodge(1);
    $('.raid-special').onclick = () => this.special();
    $('.raid-water').onclick = () => this.water();

    // обратный отсчёт
    (async () => {
      for (let i = 3; i > 0; i--) { $('.raid-count').textContent = i; Sfx.play('tap'); await U.wait(650); if (this.st !== st) return; }
      $('.raid-count').textContent = 'В бой!';
      await U.wait(500);
      $('.raid-count').remove();
      st.running = true;
      let last = performance.now();
      const loop = t => { if (this.st !== st || st.over) return; this.tick(Math.min(0.05, (t - last) / 1000)); last = t; requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    })();
    this.render();
  },

  cur() { return this.st.team[this.st.idx]; },
  showMine() {
    const st = this.st, m = this.cur();
    st.$('.raid-me').innerHTML = Art.of(m.sp);
    st.$('.raid-me').classList.remove('swap'); void st.$('.raid-me').offsetWidth; st.$('.raid-me').classList.add('swap');
    st.$('.raid-mname').innerHTML = `${Art.elIcon(SP[m.sp.sid].el, 16)} ${m.sp.nick || SP[m.sp.sid].name} <small>СИЛА ${m.power}</small>`;
    st.$('.raid-team').innerHTML = st.team.map((x, i) => `<i class="${x.cur <= 0 ? 'dead' : i === st.idx ? 'on' : ''}"></i>`).join('');
  },
  dmg(att, def, power, attEl, defEl) {
    const wx = Sky.boosted(attEl) ? 1.2 : 1;
    return Math.floor(0.5 * power * (att / def) * 1.2 * wx * this.eff(attEl, defEl)) + 1;
  },
  float(text, x, y, cls = '') {
    const f = U.el(`<div class="dmg ${cls}" style="left:${x}px;top:${y}px">${text}</div>`);
    this.st.$('.raid-fx').appendChild(f);
    setTimeout(() => f.remove(), 900);
  },
  hitBoss(n, special) {
    const st = this.st;
    st.bossHp = Math.max(0, st.bossHp - n);
    const b = st.$('.raid-boss');
    b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit');
    const r = b.getBoundingClientRect();
    this.float(n, r.left + r.width * (0.3 + Math.random() * 0.4), r.top + r.height * 0.3, special ? 'big' : '');
    if (st.coop && !st.coop.solo) {
      Coop.localHit(n);
      // гость ждёт подтверждения победы от хозяина (на всякий случай — не дольше 4 секунд)
      if (!st.coop.host) {
        if (st.bossHp <= 0 && !st._wait) { st.bossHp = 1; st._wait = setTimeout(() => this.finish(true), 4000); }
        return;
      }
    }
    if (st.bossHp <= 0) this.finish(true);
  },

  /* ---------- совместный бой ---------- */
  remoteHit(name, n) { // у хозяина: урон союзника
    const st = this.st; if (!st || st.over) return;
    st.bossHp = Math.max(0, st.bossHp - n);
    const b = st.$('.raid-boss').getBoundingClientRect();
    this.float(`${n}`, b.left + b.width * (0.15 + Math.random() * 0.7), b.top + b.height * 0.55, 'ally');
    if (st.bossHp <= 0) this.finish(true);
    this.render();
  },
  remoteState(hp, time) { // у гостя: состояние от хозяина
    const st = this.st; if (!st || st.over) return;
    st.bossHp = Math.max(hp > 0 ? 1 : 0, Math.min(st.bossHp, hp));
    st.time = time;
    this.render();
  },
  remoteEnd(win) { const st = this.st; if (st && !st.over) { clearTimeout(st._wait); this.finish(win); } },
  renderAllies(list) {
    const st = this.st; if (!st || !st.coop) return;
    const box = st.$('.raid-allies'); if (!box) return;
    box.innerHTML = (list || []).map(a => `<span><i>${Art.avatar(a.look)}</i>${U.esc(a.name)} <b>${U.fmtNum(a.n)}</b></span>`).join('');
  },
  fast(x, y) {
    const st = this.st;
    if (!st || !st.running || st.over || st.cool > 0 || st.ko) return;
    const m = this.cur();
    st.cool = 0.32;
    st.energy = Math.min(100, st.energy + 6 * (m.energy || 1));
    Sfx.play('attack');
    const me = st.$('.raid-me'); me.classList.remove('atk'); void me.offsetWidth; me.classList.add('atk');
    this.hitBoss(this.dmg(m.atk, st.bs.def, 12, SP[m.sp.sid].el, st.s.el));
    this.render();
  },
  special() {
    const st = this.st;
    if (!st || !st.running || st.over || st.energy < 50 || st.ko) return;
    const m = this.cur(), el = SP[m.sp.sid].el;
    st.energy -= 50;
    Sfx.element(el); U.vibrate(60);
    st.root.classList.remove('flash'); void st.root.offsetWidth; st.root.classList.add('flash');
    st.root.style.setProperty('--fx', ELEMENTS[el].color);
    this.float(ELEMENTS[el].charge, window.innerWidth / 2, window.innerHeight * 0.52, 'move');
    this.hitBoss(this.dmg(m.atk, st.bs.def, 75, el, st.s.el), true);
    this.render();
  },
  dodge(dir) {
    const st = this.st;
    if (!st || !st.running || st.over) return;
    st.dodgeT = 0.6;
    const me = st.$('.raid-me');
    me.style.setProperty('--dx', dir * 70 + 'px');
    me.classList.remove('dodge'); void me.offsetWidth; me.classList.add('dodge');
  },
  async water() {
    const st = this.st;
    if (!st || !st.running || st.over || st.drinking) return;
    const m = this.cur();
    if (st.waters >= 3) { UI.toast('За бой можно выпить не больше 3 флаконов'); return; }
    if (m.cur >= m.max) { UI.toast('Дух и так полон сил'); return; }
    if (!(S.d.items.water > 0)) { UI.toast('Живой воды нет'); return; }
    st.drinking = true;
    const ok = await Game.try('water');
    st.drinking = false;
    if (!ok || this.st !== st || st.over) return;
    st.waters++;
    m.cur = Math.min(m.max, m.cur + m.max / 2);
    Sfx.play('hatch');
    st.$('.raid-water span').textContent = S.d.items.water || 0;
    this.render();
  },
  tick(dt) {
    const st = this.st;
    st.time -= dt; st.cool -= dt; st.dodgeT -= dt;
    if (st.time <= 0) { st.time = 0; this.render(); return this.finish(false); }
    if (st.ko) return this.render(); // свои духи без сил — смотрим, как бьются союзники
    if (st.tele > 0) {
      st.tele -= dt;
      if (st.tele <= 0) this.bossStrike();
    } else {
      st.nextAtk -= dt;
      if (st.nextAtk <= 0) {
        st.tele = 0.9;
        st.$('.raid-boss').classList.add('charging');
        Sfx.play('warn'); U.vibrate(25);
      }
    }
    this.render();
  },
  bossStrike() {
    const st = this.st, m = this.cur();
    st.$('.raid-boss').classList.remove('charging');
    st.nextAtk = 2.2 + Math.random() * 1.4;
    const T = this.TIER[st.r.tier];
    let n = this.dmg(st.bs.atk, m.def, T.pw, st.s.el, SP[m.sp.sid].el);
    const dodged = st.dodgeT > 0;
    if (dodged) n = Math.max(1, Math.floor(n * 0.2));
    m.cur = Math.max(0, m.cur - n);
    const me = st.$('.raid-me').getBoundingClientRect();
    this.float(dodged ? `Уклон! −${n}` : `−${n}`, me.left + me.width / 2, me.top + 10, dodged ? 'dodged' : 'hurt');
    if (!dodged) {
      Sfx.play('hurt'); U.vibrate(80);
      st.root.classList.remove('shake'); void st.root.offsetWidth; st.root.classList.add('shake');
    }
    if (m.cur <= 0) {
      const next = st.team.findIndex(x => x.cur > 0);
      if (next < 0) {
        this.render();
        if (st.coop && !st.coop.solo) {
          st.ko = true;
          st.$('.raid-boss').classList.remove('charging');
          st.root.appendChild(U.el('<div class="raid-ko">Твои духи без сил.<br>Союзники ещё сражаются!</div>'));
          return;
        }
        return this.finish(false);
      }
      st.idx = next; st.energy = 0;
      this.showMine();
    }
    this.render();
  },
  render() {
    const st = this.st; if (!st) return;
    const m = this.cur();
    st.$('.raid-timer').textContent = Math.ceil(st.time);
    st.$('.bar.boss i').style.width = (st.bossHp / st.bs.hp * 100) + '%';
    st.$('.bar.hp i').style.width = (m.cur / m.max * 100) + '%';
    const circ = 2 * Math.PI * 44;
    const f = st.$('.raid-special .fill');
    f.style.strokeDasharray = circ;
    f.style.strokeDashoffset = circ * (1 - Math.min(1, st.energy / 50));
    st.$('.raid-special').classList.toggle('ready', st.energy >= 50);
  },
  async finish(win) {
    const st = this.st;
    if (!st || st.over) return;
    st.over = true;
    clearTimeout(st._wait);
    if (st.coop && st.coop.host) Coop.hostEnd(win);
    await U.wait(400);
    // итог боя проверяет сервер: победа засчитывается, если команда могла нанести столько урона за это время
    let r = null;
    try { r = await Game.act('raidEnd', { win: !!win }); } catch (e) { if (win) UI.toast(U.esc(e.message)); }
    if (this.st !== st) return;
    if (win && r && r.win) {
      Sfx.play('win'); U.vibrate([50, 50, 50, 50, 120]);
      const rw = r.rw, charms = r.charms, bonus = r.bonus, allies = r.allies;
      const res = U.el(`<div class="raid-result"><div class="res-card">
        <div class="res-title">Разлом закрыт!</div>
        <div class="res-art">${Art.spirit(st.s.id)}</div>
        <div class="res-rw">${rw.map(x => `<div><b>+${U.fmtNum(x.n)}</b> ${x.label}</div>`).join('')}</div>
        <div class="res-note">Ослабленный ${st.s.name} остался в нашем мире. У тебя <b>${charms}</b> оберегов разлома${bonus ? ` (+${bonus} за скорость)` : ''}${allies ? ` (+${allies * 2} за союзников)` : ''}.</div>
        <button class="btn primary wide">Ловить!</button></div></div>`);
      res.querySelector('button').onclick = () => {
        this.close();
        Encounter.start({ mode: 'raid', seed: st.r.id });
      };
      st.root.appendChild(res);
    } else if (win) {
      // сервер не засчитал победу (нет связи или неправдоподобный бой)
      const res = U.el(`<div class="raid-result"><div class="res-card"><div class="res-title lose">Победа не засчитана</div>
        <div class="res-note">Сервер не подтвердил этот бой. Проверь интернет и попробуй снова — разлом открыт до конца часа.</div>
        <button class="btn wide">На карту</button></div></div>`);
      res.querySelector('button').onclick = () => this.close();
      st.root.appendChild(res);
    } else {
      Sfx.play('lose');
      const res = U.el(`<div class="raid-result"><div class="res-card">
        <div class="res-title lose">Разлом устоял</div>
        <div class="res-art dim">${Art.spirit(st.s.id)}</div>
        <div class="res-note">Осталось сил у босса: ${Math.round(st.bossHp / st.bs.hp * 100)}%. Усиль духов, возьми стихию-противника и попробуй снова — разлом открыт до конца часа.</div>
        <button class="btn wide">На карту</button></div></div>`);
      res.querySelector('button').onclick = () => this.close();
      st.root.appendChild(res);
    }
    UI.refreshHud();
  },
  quit() {
    const st = this.st; if (!st) return;
    if (st.over) return this.close();
    UI.confirm('Покинуть битву?', 'Прогресс боя будет потерян.', 'Покинуть', () => this.close(), 'Остаться');
  },
  close() {
    const st = this.st; if (!st) return;
    if (!st.over) Game.act('raidEnd', { win: false }).catch(() => {}); // вышел из боя
    st.over = true;
    st.root.remove();
    this.st = null;
    UI.popLayer();
    if (st.coop) Coop.leave();
    Music.play('map');
    MapView.refresh();
    UI.flushLevelUps();
  },
};

// ===== www/js/duel.js =====
/* Капища Ордена: поединок 3 на 3 с хранителем.
   Тап — быстрая атака (копит энергию), «Приём» — особая атака с мини-игрой,
   у каждой стороны 2 щита, духа можно сменить (перезарядка 25 с). */

const Duel = {
  st: null,
  FAST: 6, CHARGE: 65, COST: 50, TIME: 180, HPX: 3, SWITCH_CD: 25,

  shieldSvg: '<svg viewBox="0 0 24 24" class="shd"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="#5eead4" stroke="#0f766e" stroke-width="1.5"/></svg>',

  open(e) {
    const g = W.guardian(e), T = SHRINE_TIERS[e.tier], mul = Ev.duelMul();
    let team = S.team();
    const html = `
      <div class="shrine-view t${e.tier}">
        ${e.photo ? `<div class="place-photo" style="background-image:url('${Poi.photoUrl(e.photo)}')"></div>` : `<div class="shrine-idol">${Art.shrineIcon(e.tier, e.won)}</div>`}
        <div class="rift-title">${U.esc(e.name)} <span class="stars">${'★'.repeat(e.tier)}</span></div>
        <div class="rift-meta">Капище ${e.god}</div>
        <div class="guard"><div class="guard-ava">${Art.guardian(g.color)}</div><div><b>${g.name}</b><small>Хранитель · ${g.title}</small></div></div>
        <div class="rift-team-title">Духи хранителя</div>
        <div class="rift-team">${UI.teamHtml(g.team)}</div>
        ${e.won ? '<div class="rift-done">Сегодня ты уже победил здесь. Завтра капище будет охранять новый хранитель.</div>' : `
        <div class="rift-team-title">Твоя команда <button class="btn small ghost team-edit">Изменить</button></div>
        <div class="rift-team my">${UI.teamHtml(team)}</div>
        <div class="rift-tip">Награда: ${U.fmtNum(T.xp * mul)} опыта, ✦ ${U.fmtNum(T.sparks * mul)} и предметы${mul > 1 ? ' (Неделя поединков ×2)' : ''}</div>
        <button class="btn primary wide duel-go" ${team.length ? '' : 'disabled'}>Бросить вызов</button>`}
      </div>`;
    const scr = UI.screen('Капище', html, 'shrine-screen');
    const go = scr.querySelector('.duel-go');
    if (go) go.onclick = async () => {
      if (!await this.begin('duelStart', { shrine: { id: e.id, lat: e.lat, lng: e.lng, name: e.name } })) return;
      UI.closeScreen(scr); this.start({ ...e, kind: 'shrine' }, g, S.team());
    };
    const edit = scr.querySelector('.team-edit');
    if (edit) edit.onclick = () => UI.pickTeam(() => { team = S.team(); scr.querySelector('.rift-team.my').innerHTML = UI.teamHtml(team); });
  },

  // Захваченный родник: поединок с прислужником Нави
  openInvasion(e) {
    const g = W.grunt(e);
    let team = S.team();
    const html = `
      <div class="shrine-view invasion">
        <div class="shrine-idol">${Art.springIcon(false, true)}</div>
        <div class="rift-title">Родник «${U.esc(e.name)}» захвачен Навью!</div>
        <div class="guard"><div class="guard-ava dark">${Art.guardian(g.color)}</div><div><b>${g.name}</b><small>${g.title}</small></div></div>
        <div class="grunt-quote">«${g.quote}»</div>
        <div class="rift-team-title">Омрачённые духи</div>
        <div class="rift-team">${UI.teamHtml(g.team)}</div>
        <div class="rift-team-title">Твоя команда <button class="btn small ghost team-edit">Изменить</button></div>
        <div class="rift-team my">${UI.teamHtml(team)}</div>
        <div class="rift-tip">Слабость отряда: ${ELEMENT_KEYS.filter(x => ELEMENTS[x].beats.includes(g.el)).map(x => `${Art.elIcon(x, 16)} ${ELEMENTS[x].name}`).join(' ')}</div>
        <div class="rift-tip">Победа освободит родник и позволит спасти одного из омрачённых духов.</div>
        <button class="btn primary wide duel-go" ${team.length ? '' : 'disabled'}>Сразиться</button>
      </div>`;
    const scr = UI.screen('Вторжение Нави', html, 'shrine-screen invasion-screen');
    scr.querySelector('.duel-go').onclick = async () => {
      if (!await this.begin('invStart', { spring: { id: e.id, lat: e.lat, lng: e.lng, name: e.name } })) return;
      UI.closeScreen(scr);
      this.start({ ...e, kind: 'invasion', tier: 1, T: { speed: 0.75, shield: 0.5 } }, g, S.team());
    };
    scr.querySelector('.team-edit').onclick = () => UI.pickTeam(() => { team = S.team(); scr.querySelector('.rift-team.my').innerHTML = UI.teamHtml(team); });
  },

  // Поединок с другом: его сильнейшие духи под управлением игры (команду присылает сервер)
  openSpar(f, top) {
    let team = S.team();
    const today = f.spar === U.today();
    const html = `
      <div class="shrine-view spar">
        <div class="guard"><div class="guard-ava">${Art.avatar(f.look || undefined)}</div><div><b>${U.esc(f.name)}</b><small>Дружеский поединок</small></div></div>
        <div class="rift-team-title">Сильнейшие духи друга</div>
        <div class="rift-team">${UI.teamHtml(top)}</div>
        <div class="rift-team-title">Твоя команда <button class="btn small ghost team-edit">Изменить</button></div>
        <div class="rift-team my">${UI.teamHtml(team)}</div>
        <div class="rift-tip">${today ? 'Награда за сегодня уже получена — сейчас это тренировка (+100 опыта за победу).' : 'Награда за первую победу за день: 800 опыта, ✦ 500, обереги и мёд, +1 ★ дружбы.'}</div>
        <button class="btn primary wide duel-go" ${team.length ? '' : 'disabled'}>Сразиться</button>
      </div>`;
    const scr = UI.screen('Поединок с другом', html, 'shrine-screen');
    scr.querySelector('.duel-go').onclick = async () => {
      if (this.st || this._starting) return;
      this._starting = true;
      const r = await Game.try('sparStart', { pid: f.id });
      this._starting = false;
      if (!r) return;
      UI.closeScreen(scr);
      const color = (r.look && r.look.cloak) || GUARD_COLORS[Math.floor(U.h(f.id) * GUARD_COLORS.length)];
      this.start({ kind: 'spar', name: f.name, T: { speed: 0.72, shield: 0.6 } }, { name: U.esc(r.name), color, team: r.foe }, S.team());
    };
    scr.querySelector('.team-edit').onclick = () => UI.pickTeam(() => {
      team = S.team();
      scr.querySelector('.rift-team.my').innerHTML = UI.teamHtml(team);
      scr.querySelector('.duel-go').disabled = !team.length;
    });
  },

  // Начало боя отмечает сервер (он же проверит правдоподобие победы в конце)
  async begin(type, args) {
    if (this.st || this._starting) return false;
    this._starting = true;
    const ok = await Game.try(type, args);
    this._starting = false;
    return !!ok;
  },
  endType(kind) { return kind === 'invasion' ? 'invEnd' : kind === 'league' ? 'leagueEnd' : kind === 'spar' ? 'sparEnd' : 'duelEnd'; },

  fighter(sp) {
    const x = S.battle(sp);
    return { sp, atk: x.atk, def: x.def, max: x.hp * this.HPX, cur: x.hp * this.HPX, energy: 0, emul: x.energy, el: SP[sp.sid].el, power: x.power };
  },

  start(e, g, team) {
    const root = U.el(`
      <div class="raid duel">
        <div class="raid-bg duel-bg"></div>
        <div class="raid-top duel-top">
          <div class="raid-timer">${this.TIME}</div>
          <div class="duel-foe-hud">
            <div class="duel-guard"><div class="guard-ava sm">${Art.guardian(g.color)}</div><b>${g.name}</b></div>
            <div class="duel-name foe-name"></div>
            <div class="bar boss"><i></i></div>
            <div class="duel-meta"><span class="shields foe-sh"></span><span class="raid-team foe-dots"></span></div>
          </div>
        </div>
        <div class="duel-foe"></div>
        <div class="raid-me duel-me"></div>
        <div class="raid-fx"></div>
        <div class="raid-hud">
          <div class="raid-mname"></div>
          <div class="bar hp"><i></i></div>
          <div class="duel-meta"><span class="shields my-sh"></span><span class="raid-team my-dots"></span></div>
        </div>
        <div class="raid-ctrl">
          <button class="duel-switch"><span>Смена</span><em></em></button>
          <button class="duel-special2 hidden"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="bg"/><circle cx="50" cy="50" r="44" class="fill"/></svg><span></span></button>
          <button class="raid-special"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="bg"/><circle cx="50" cy="50" r="44" class="fill"/></svg><span>Приём</span></button>
          <div class="duel-energy"></div>
        </div>
        <div class="raid-hint">Тапай — быстрая атака, она копит энергию.<br>Полная шкала — жми «Приём». Щиты берегут от приёмов хранителя.</div>
        <div class="duel-ov hidden"></div>
        <div class="raid-count">3</div>
      </div>`);
    document.body.appendChild(root);
    Music.play('battle');
    const $ = s => root.querySelector(s);
    const st = this.st = {
      e, g, T: e.T || SHRINE_TIERS[e.tier], root, $, time: this.TIME, paused: true, over: false,
      // e.carry — бойцы из прошлого боя турнира (раны не лечатся)
      me: { team: e.carry || team.map(sp => this.fighter(sp)), idx: Math.max(0, (e.carry || []).findIndex(f => f.cur > 0)), shields: 2, busy: 0, cd: 0 },
      foe: { team: g.team.map(sp => this.fighter(sp)), idx: 0, shields: 2, busy: 1.5 },
    };
    UI.pushLayer(() => this.quit());

    let sid = null;
    root.addEventListener('pointerdown', ev => {
      if (ev.target.closest('button') || ev.target.closest('.duel-ov')) return;
      sid = ev.pointerId;
    });
    root.addEventListener('pointerup', ev => {
      if (ev.pointerId !== sid) return;
      sid = null;
      this.fast();
    });
    $('.raid-special').onclick = () => this.myCharge('charge');
    $('.duel-special2').onclick = () => this.myCharge('charge2');
    $('.duel-switch').onclick = () => this.switchMenu(false);

    this.showSide('me'); this.showSide('foe');
    this.render();
    (async () => {
      for (let i = 3; i > 0; i--) { $('.raid-count').textContent = i; Sfx.play('tap'); await U.wait(650); if (this.st !== st) return; }
      $('.raid-count').textContent = 'Бой!';
      await U.wait(450);
      $('.raid-count').remove();
      st.paused = false;
      let last = performance.now();
      const loop = t => { if (this.st !== st || st.over) return; this.tick(Math.min(0.05, (t - last) / 1000)); last = t; requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    })();
  },

  cur(side) { const s = this.st[side]; return s.team[s.idx]; },
  showSide(side) {
    const st = this.st, f = this.cur(side);
    const box = st.$(side === 'me' ? '.duel-me' : '.duel-foe');
    box.innerHTML = Art.of(f.sp);
    box.classList.remove('swap'); void box.offsetWidth; box.classList.add('swap');
    const label = `${Art.elIcon(f.el, 16)} ${U.esc(f.sp.nick || SP[f.sp.sid].name)} <small>СИЛА ${f.power}</small>`;
    st.$(side === 'me' ? '.raid-mname' : '.foe-name').innerHTML = label;
  },

  tick(dt) {
    const st = this.st;
    if (st.paused || st.over) return;
    st.time -= dt; st.me.busy -= dt; st.me.cd -= dt; st.foe.busy -= dt;
    if (st.time <= 0) { st.time = 0; return this.finish(this.hpShare('me') >= this.hpShare('foe')); }
    if (st.foe.busy <= 0) {
      const f = this.cur('foe'), m = this.cur('me');
      if (f.energy >= this.COST && (Math.random() < 0.45 || m.cur < m.max * 0.35)) this.foeCharge();
      else { this.foeFast(); st.foe.busy = st.T.speed + Math.random() * 0.25; }
    }
    this.render();
  },
  hpShare(side) { const t = this.st[side].team; return t.reduce((a, f) => a + Math.max(0, f.cur) / f.max, 0) / t.length; },

  hit(side, n, cls) {
    const st = this.st, box = st.$(side === 'me' ? '.duel-me' : '.duel-foe');
    box.classList.remove('hit'); void box.offsetWidth; box.classList.add('hit');
    const r = box.getBoundingClientRect();
    const fl = U.el(`<div class="dmg ${cls || ''}" style="left:${r.left + r.width * (0.3 + Math.random() * 0.4)}px;top:${r.top + r.height * 0.25}px">${n}</div>`);
    st.$('.raid-fx').appendChild(fl);
    setTimeout(() => fl.remove(), 900);
  },

  fast() {
    const st = this.st;
    if (!st || st.paused || st.over || st.me.busy > 0) return;
    const m = this.cur('me'), f = this.cur('foe');
    st.me.busy = 0.5;
    m.energy = Math.min(100, m.energy + 7 * (m.emul || 1));
    const n = Raid.dmg(m.atk, f.def, this.FAST, m.el, f.el);
    f.cur -= n;
    Sfx.play('attack');
    const me = st.$('.duel-me'); me.classList.remove('atk'); void me.offsetWidth; me.classList.add('atk');
    this.hit('foe', n);
    if (f.cur <= 0) this.faint('foe');
    this.render();
  },
  foeFast() {
    const st = this.st, m = this.cur('me'), f = this.cur('foe');
    f.energy = Math.min(100, f.energy + 7);
    const n = Raid.dmg(f.atk, m.def, this.FAST, f.el, m.el);
    m.cur -= n;
    this.hit('me', `−${n}`, 'hurt');
    if (m.cur <= 0) this.faint('me');
  },

  overlay(html) {
    const ov = this.st.$('.duel-ov');
    ov.innerHTML = html; ov.classList.remove('hidden');
    return ov;
  },
  closeOverlay() { const ov = this.st.$('.duel-ov'); ov.classList.add('hidden'); ov.innerHTML = ''; },

  // Особый приём игрока: 2,2 секунды тапай по сфере — чем больше тапов, тем сильнее удар
  async myCharge(kind = 'charge') {
    const st = this.st;
    if (!st || st.paused || st.over) return;
    const m = this.cur('me'), f = this.cur('foe');
    const mv = MOVES[kind];
    if (kind === 'charge2' && !m.sp.move2) return;
    if (m.energy < mv.cost) { UI.toast('Мало энергии — атакуй тапами'); return; }
    m.energy -= mv.cost;
    st.paused = true;
    Sfx.play('special');
    const col = ELEMENTS[m.el].color;
    const ov = this.overlay(`<div class="charge-mini"><div class="charge-title">${ELEMENTS[m.el][kind]}</div><button class="charge-orb" style="--c:${col}"><span>Тапай!</span></button><div class="pbar"><i></i></div></div>`);
    let taps = 0;
    const orb = ov.querySelector('.charge-orb'), bar = ov.querySelector('.pbar i');
    orb.addEventListener('pointerdown', () => {
      taps++; Sfx.play('tap'); U.vibrate(8);
      orb.style.transform = `scale(${1 + Math.min(taps, 14) * 0.035})`;
      bar.style.width = Math.min(100, taps / 12 * 100) + '%';
    });
    await U.wait(2200);
    if (this.st !== st) return;
    const mult = 0.55 + 0.45 * Math.min(1, taps / 12);
    this.closeOverlay();
    const T = st.T;
    const shield = st.foe.shields > 0 && Math.random() < T.shield * (f.cur < f.max * 0.5 ? 1.2 : 0.9);
    let n;
    if (shield) {
      st.foe.shields--; n = 1;
      this.hit('foe', 'Щит!', 'dodged');
    } else {
      n = Raid.dmg(m.atk, f.def, mv.power * mult, m.el, f.el);
      st.root.style.setProperty('--fx', col);
      st.root.classList.remove('flash'); void st.root.offsetWidth; st.root.classList.add('flash');
      this.hit('foe', n, 'big');
      Sfx.element(m.el);
      U.vibrate(60);
    }
    f.cur -= n;
    st.paused = false;
    if (f.cur <= 0) this.faint('foe');
    this.render();
  },

  // Особый приём хранителя: 2,5 секунды на решение — ставить щит или нет
  foeCharge() {
    const st = this.st, f = this.cur('foe');
    f.energy -= this.COST;
    st.paused = true;
    Sfx.play('warn'); U.vibrate([30, 40, 30]);
    const has = st.me.shields > 0;
    const ov = this.overlay(`<div class="shield-q">
      <div class="charge-title">${st.g.name}: «${ELEMENTS[f.el].charge}»!</div>
      <div class="shield-timer"><i></i></div>
      <div class="shield-btns">
        <button class="btn primary sh-yes" ${has ? '' : 'disabled'}>${this.shieldSvg} Щит (${st.me.shields})</button>
        <button class="btn sh-no">Принять удар</button>
      </div></div>`);
    let done = false;
    const resolve = useShield => {
      if (done || this.st !== st) return;
      done = true;
      this.closeOverlay();
      const m = this.cur('me');
      let n;
      if (useShield && st.me.shields > 0) { st.me.shields--; n = 1; this.hit('me', 'Щит!', 'dodged'); Sfx.play('hit'); }
      else {
        n = Raid.dmg(f.atk, m.def, this.CHARGE, f.el, m.el);
        this.hit('me', `−${n}`, 'hurt');
        Sfx.play('hurt'); Sfx.element(f.el, true); U.vibrate(90);
        st.root.classList.remove('shake'); void st.root.offsetWidth; st.root.classList.add('shake');
      }
      m.cur -= n;
      st.foe.busy = st.T.speed;
      st.paused = false;
      if (m.cur <= 0) this.faint('me');
      this.render();
    };
    ov.querySelector('.sh-yes').onclick = () => resolve(true);
    ov.querySelector('.sh-no').onclick = () => resolve(false);
    setTimeout(() => resolve(false), 2500);
  },

  faint(side) {
    const st = this.st, s = st[side];
    const next = s.team.findIndex(x => x.cur > 0);
    if (next < 0) return this.finish(side === 'foe');
    if (side === 'foe') {
      st.paused = true;
      setTimeout(() => {
        if (this.st !== st || st.over) return;
        s.idx = next; s.busy = 1.2;
        this.showSide('foe');
        UI.toast(`${st.g.name} призывает: ${SP[this.cur('foe').sp.sid].name}`);
        st.paused = false;
        this.render();
      }, 900);
    } else {
      this.switchMenu(true);
    }
    this.render();
  },

  // Смена духа: добровольно (с перезарядкой) или после поражения текущего
  switchMenu(forced) {
    const st = this.st;
    if (!st || st.over || (st.paused && !forced)) return;
    if (!forced && st.me.cd > 0) { UI.toast(`Смена будет доступна через ${Math.ceil(st.me.cd)} с`); return; }
    const opts = st.me.team.map((f, i) => ({ f, i })).filter(x => x.f.cur > 0 && x.i !== st.me.idx);
    if (!opts.length) { if (!forced) UI.toast('Некого выпустить'); return; }
    st.paused = true;
    const ov = this.overlay(`<div class="switch-q"><div class="charge-title">${forced ? 'Дух без сил! Кого выпустить?' : 'Сменить духа'}</div>
      <div class="rift-team">${opts.map(x => `<button class="mini" data-i="${x.i}">${Art.of(x.f.sp)}<b>${Math.round(x.f.cur / x.f.max * 100)}%</b></button>`).join('')}</div>
      ${forced ? '' : '<button class="btn ghost sw-cancel">Отмена</button>'}</div>`);
    const pick = i => {
      if (this.st !== st) return;
      clearTimeout(timer);
      this.closeOverlay();
      st.me.idx = i;
      if (!forced) st.me.cd = this.SWITCH_CD;
      st.me.busy = 0.3;
      this.showSide('me');
      st.paused = false;
      this.render();
    };
    ov.querySelectorAll('[data-i]').forEach(b => b.onclick = () => pick(+b.dataset.i));
    const c = ov.querySelector('.sw-cancel');
    if (c) c.onclick = () => { clearTimeout(timer); this.closeOverlay(); st.paused = false; };
    const timer = forced ? setTimeout(() => pick(opts[0].i), 6000) : null;
  },

  render() {
    const st = this.st; if (!st) return;
    const m = this.cur('me'), f = this.cur('foe');
    st.$('.raid-timer').textContent = Math.ceil(st.time);
    st.$('.bar.boss i').style.width = Math.max(0, f.cur / f.max * 100) + '%';
    st.$('.bar.hp i').style.width = Math.max(0, m.cur / m.max * 100) + '%';
    const sh = n => this.shieldSvg.repeat(n) + '<i class="shd-empty"></i>'.repeat(2 - n);
    st.$('.my-sh').innerHTML = sh(st.me.shields);
    st.$('.foe-sh').innerHTML = sh(st.foe.shields);
    const dots = s => st[s].team.map((x, i) => `<i class="${x.cur <= 0 ? 'dead' : i === st[s].idx ? 'on' : ''}"></i>`).join('');
    st.$('.my-dots').innerHTML = dots('me');
    st.$('.foe-dots').innerHTML = dots('foe');
    const circ = 2 * Math.PI * 44, fill = st.$('.raid-special .fill');
    fill.style.strokeDasharray = circ;
    fill.style.strokeDashoffset = circ * (1 - Math.min(1, m.energy / this.COST));
    fill.style.stroke = ELEMENTS[m.el].color;
    st.$('.raid-special').classList.toggle('ready', m.energy >= this.COST);
    // второй приём (если выучен): дешевле, слабее
    const b2 = st.$('.duel-special2');
    b2.classList.toggle('hidden', !m.sp.move2);
    if (m.sp.move2) {
      const f2 = b2.querySelector('.fill');
      f2.style.strokeDasharray = circ;
      f2.style.strokeDashoffset = circ * (1 - Math.min(1, m.energy / MOVES.charge2.cost));
      f2.style.stroke = ELEMENTS[m.el].color;
      b2.classList.toggle('ready', m.energy >= MOVES.charge2.cost);
      b2.querySelector('span').textContent = ELEMENTS[m.el].charge2;
    }
    st.$('.duel-energy').textContent = `⚡ ${Math.floor(m.energy)}`;
    const sw = st.$('.duel-switch');
    sw.classList.toggle('cool', st.me.cd > 0);
    sw.querySelector('em').textContent = st.me.cd > 0 ? Math.ceil(st.me.cd) : '';
  },

  async finish(win) {
    const st = this.st;
    if (!st || st.over) return;
    st.over = true;
    this.closeOverlay();
    await U.wait(500);
    if (this.st !== st) return;
    let html;
    if (st.e.kind === 'league') return League.afterDuel(win, st);
    // итог боя проверяет сервер: победа засчитывается, если команда могла нанести столько урона за это время
    let r = null;
    try { r = await Game.act(this.endType(st.e.kind), { win: !!win }); } catch (e) { if (win) UI.toast(U.esc(e.message)); }
    if (this.st !== st) return;
    if (win && !(r && r.win)) {
      html = `<div class="res-title lose">Победа не засчитана</div>
        <div class="res-note">Сервер не подтвердил этот бой. Проверь интернет и попробуй снова.</div>`;
      const res = U.el(`<div class="raid-result"><div class="res-card">${html}<button class="btn wide">На карту</button></div></div>`);
      res.querySelector('button').onclick = () => this.close();
      st.root.appendChild(res);
      return;
    }
    if (st.e.kind === 'invasion') return this.finishInvasion(win, r);
    if (st.e.kind === 'spar') return this.finishSpar(win, r);
    if (win) {
      Sfx.play('win'); U.vibrate([50, 50, 50, 50, 120]);
      const rw = r.rw;
      html = `<div class="res-title">Победа!</div>
        <div class="res-art"><div class="guard-ava big">${Art.guardian(st.g.color)}</div></div>
        <div class="res-note">«Достойно, Ловчий», — ${st.g.name} склоняет голову. Капище «${U.esc(st.e.name)}» освящено тобой до конца дня.</div>
        <div class="res-rw">${rw.map(x => `<div><b>+${U.fmtNum(x.n)}</b> ${x.label}</div>`).join('')}</div>`;
    } else {
      Sfx.play('lose');
      html = `<div class="res-title lose">Поражение</div>
        <div class="res-art"><div class="guard-ava big">${Art.guardian(st.g.color)}</div></div>
        <div class="res-note">«Приходи, когда окрепнешь», — говорит ${st.g.name}. Попробуй другую команду: смотри на стихии хранителя и береги щиты для его приёмов.</div>`;
    }
    const res = U.el(`<div class="raid-result"><div class="res-card">${html}<button class="btn primary wide">На карту</button></div></div>`);
    res.querySelector('button').onclick = () => this.close();
    st.root.appendChild(res);
    UI.refreshHud();
  },
  finishSpar(win, r) {
    const st = this.st, g = st.g;
    let html;
    if (win) {
      Sfx.play('win'); U.vibrate([50, 50, 120]);
      html = `<div class="res-title">Победа!</div>
        <div class="res-art"><div class="guard-ava big">${Art.guardian(g.color)}</div></div>
        <div class="res-note">${r.practice ? `Хорошая тренировка! Награда за поединок с ${g.name} сегодня уже получена.` : `${g.name} жмёт тебе руку: «Честный бой!» Дружба крепнет.`}</div>
        <div class="res-rw">${r.rw.map(x => `<div><b>+${U.fmtNum(x.n)}</b> ${x.label}</div>`).join('')}${r.practice ? '' : '<div><b>+1 ★</b> дружбы</div>'}</div>`;
    } else {
      Sfx.play('lose');
      html = `<div class="res-title lose">Поражение</div>
        <div class="res-art"><div class="guard-ava big">${Art.guardian(g.color)}</div></div>
        <div class="res-note">Духи ${g.name} оказались сильнее. Подбери команду против их стихий и попробуй снова — поединки с другом не ограничены.</div>`;
    }
    const res = U.el(`<div class="raid-result"><div class="res-card">${html}<button class="btn primary wide">Готово</button></div></div>`);
    res.querySelector('button').onclick = () => this.close();
    st.root.appendChild(res);
    UI.refreshHud();
  },
  finishInvasion(win, r) {
    const st = this.st, e = st.e, g = st.g;
    let html, rescue = null;
    if (win) {
      Sfx.play('win'); U.vibrate([50, 50, 50, 50, 120]);
      const rw = r.rw;
      rescue = g.team.find(x => x.sid === r.rescue.sid) || g.team[0];
      html = `<div class="res-title">Родник освобождён!</div>
        <div class="res-art">${Art.of(rescue)}</div>
        <div class="res-note">Прислужник растворился в тумане. Один из его духов — омрачённый ${SP[rescue.sid].name} — остался рядом. Его ещё можно спасти!</div>
        <div class="res-rw">${rw.map(x => `<div><b>+${U.fmtNum(x.n)}</b> ${x.label}</div>`).join('')}</div>
        <button class="btn primary wide rescue">Спасти духа</button>`;
    } else {
      Sfx.play('lose');
      html = `<div class="res-title lose">Навь сильнее… пока</div>
        <div class="res-art"><div class="guard-ava big dark">${Art.guardian(g.color)}</div></div>
        <div class="res-note">«${GRUNT_QUOTES[0]}» — смеётся прислужник. Возьми духов, сильных против стихии «${ELEMENTS[g.el].name}», и возвращайся.</div>`;
    }
    const res = U.el(`<div class="raid-result"><div class="res-card">${html}<button class="btn wide to-map">На карту</button></div></div>`);
    res.querySelector('.to-map').onclick = () => this.close();
    const rb = res.querySelector('.rescue');
    if (rb) rb.onclick = () => {
      this.close();
      Encounter.start({ mode: 'rescue', seed: e.invId + ':rescue' });
    };
    st.root.appendChild(res);
    UI.refreshHud();
  },

  quit() {
    const st = this.st; if (!st) return;
    if (st.over) return this.close();
    UI.confirm('Сдаться?', 'Поединок будет проигран.', 'Сдаться', () => this.close(), 'Продолжить');
  },
  close() {
    const st = this.st; if (!st) return;
    // сдался или вышел до конца боя — это поражение
    if (!st.over) {
      Game.act(this.endType(st.e.kind), { win: false, board: Cfg.s.cloud !== false }).catch(() => {});
      if (st.e.kind === 'league') League.carry = null;
    }
    st.over = true;
    st.root.remove();
    this.st = null;
    UI.popLayer();
    Music.play('map');
    MapView.refresh();
    UI.flushLevelUps();
  },
};

// ===== www/js/rules.js =====
/* Правила, общие для сервера и телефона. Сервер по ним принимает решения,
   телефон — показывает (цвет кольца, награды, подсказки). */

const Rules = {
  QUEST_BONUS: { charm: 10, honey: 3, incense: 1, sparks: 1000 },
  TUT_REWARD: { charm: 10, honey: 3, xp: 300 },
  PLACE_REWARD: { xp: 1000, sparks: 500, charm: 10 },
  SUPPLY: { charm: 15, honey: 2, water: 1 },
  THROWABLE: ['charm', 'charm2', 'charm3'],
  COUNTDOWN: 3.2, // секунды обратного отсчёта перед боем

  // Серия дней: награда за первый вход в игру за день, по кругу из 7 дней
  STREAK: [
    { charm: 5, xp: 200 },
    { honey: 3, xp: 300 },
    { charm: 8, water: 1, xp: 400 },
    { charm2: 3, gift: 1, xp: 500 },
    { incense: 1, honey: 2, xp: 600 },
    { charm2: 5, water: 2, xp: 800 },
    { charm3: 3, sparks: 1500, xp: 1500 }, // 7-й день — ещё и кокон 10 км
  ],

  /* Общее дело Ордена: все Ловчие неделю вместе копят очки. Цель растёт с числом участников.
     Награда ступени — тем, кто сам внёс не меньше need очков, когда Орден дошёл до ступени. */
  ORDER: {
    PER: 120, MIN: 300, // цель = max(MIN, PER × участники)
    STEPS: [
      { at: 1 / 3, need: 15, reward: { charm: 10, honey: 3, sparks: 1000 } },
      { at: 2 / 3, need: 40, reward: { charm2: 5, water: 2, incense: 1 } },
      { at: 1,     need: 80, reward: { charm3: 3, sparks: 3000 } }, // и кокон 10 км
    ],
  },
  orderGoal(players) { return Math.max(this.ORDER.MIN, this.ORDER.PER * (players || 0)); },
  // Очки за изменения счётчиков (до → после). Задание недели удваивает очки своего дела.
  orderPoints(a, b, ev) {
    const d = k => Math.max(0, (b[k] || 0) - (a[k] || 0));
    const caught = d('caught');
    const elCatch = ev.el ? Math.min(caught, Math.max(0, ((b.byEl || {})[ev.el] || 0) - ((a.byEl || {})[ev.el] || 0))) : 0;
    const km = Math.max(0, Math.floor((b.km || 0) * 2) - Math.floor((a.km || 0) * 2)); // очко за каждые 500 м
    return caught + elCatch * 2
      + d('springs') * (ev.loot ? 2 : 1)
      + d('raids') * (ev.rifts ? 10 : 5)
      + d('duels') * (ev.duel ? 6 : 3)
      + d('invasions') * 3
      + d('hatched') * (ev.km ? 6 : 3)
      + km * (ev.km ? 2 : 1);
  },
  ORDER_RULES: [
    ['Поимка духа', 1], ['Родник', 1], ['500 м пути', 1], ['Кокон', 3], ['Победа в капище', 3], ['Вторжение', 3], ['Разлом', 5],
  ],

  // Шанс поимки за один бросок. o: { mode, sid, lvl, item, honey, mul }
  catchChance(o) {
    const s = SP[o.sid];
    if (o.mode === 'tut') return 1; // учебного духа поймать можно всегда
    const base = o.mode === 'story' ? 0.5 : o.mode === 'raid' ? (s.legend ? 0.1 : 0.2)
      : RARITY[s.rar].base * U.clamp(1.15 - o.lvl / 60, 0.55, 1.15) * (o.mode === 'task' ? 1.5 : 1); // дух за поручение ловится легче
    const cm = o.mode === 'raid' ? 1.5 : ITEMS[o.item].mult;
    const mult = cm * (o.honey ? 1.5 : 1) * (o.mul || 1);
    return 1 - Math.pow(1 - U.clamp(base, 0.02, 0.95), mult);
  },
  // Бонус за попадание в кольцо: ring — размер кольца в момент броска (1 — большое, 0.2 — маленькое)
  ringBonus(ring) {
    if (ring == null) return { mul: 1, xp: 0, label: '', great: false };
    const r = U.clamp(+ring || 1, 0.2, 1);
    return r > 0.7 ? { mul: 1.2, xp: 10, label: 'Хорошо!', great: false } : r > 0.4 ? { mul: 1.5, xp: 50, label: 'Отлично!', great: true } : { mul: 1.8, xp: 100, label: 'Превосходно!', great: true };
  },
  // Награда за пойманного духа
  catchReward(o) {
    const s = SP[o.sid], special = o.mode !== 'wild' && o.mode !== 'tut';
    return {
      xp: (special ? 300 : 100) + (o.isNew ? 500 : 0) + (o.ringXp || 0) + (o.throws === 1 ? 50 : 0) + (o.shiny ? 500 : 0),
      ess: special ? 10 : s.stage === 3 ? 10 : s.stage === 2 ? 5 : 3,
      sparks: Math.round((special ? 300 : 100) * (o.boost ? 1.25 : 1)),
    };
  },

  // Сколько урона команда может нанести боссу разлома за t секунд (верхняя оценка, с запасом)
  raidMaxDamage(team, boss, t) {
    const bs = Raid.bossStats(boss), bel = SP[boss.boss].el;
    const dps = team.map(sp => {
      const x = S.battle(sp), el = SP[sp.sid].el;
      const fast = Raid.dmg(x.atk, bs.def, 12, el, bel) / 0.32;
      const special = Raid.dmg(x.atk, bs.def, 75, el, bel) / (50 / (6 * (x.energy || 1) / 0.32));
      return fast + special;
    });
    return Math.max(0, ...dps) * Math.max(0, t) * 1.3;
  },
  // Сколько урона команда может нанести в поединке за t секунд
  duelMaxDamage(team, foe, t) {
    const dps = team.map(sp => {
      const x = S.battle(sp), el = SP[sp.sid].el;
      return Math.max(...foe.map(f => {
        const y = S.battle(f), fel = SP[f.sid].el;
        return Raid.dmg(x.atk, y.def, Duel.FAST, el, fel) / 0.5 + Raid.dmg(x.atk, y.def, Duel.CHARGE, el, fel) / (Duel.COST / (7 * (x.energy || 1) / 0.5));
      }));
    });
    return Math.max(0, ...dps) * Math.max(0, t) * 1.3;
  },
  duelFoeHp(foe) { return foe.reduce((a, f) => a + S.battle(f).hp * Duel.HPX, 0); },
};

// ===== www/js/diff.js =====
/* Изменения состояния: сервер после каждого действия присылает не весь прогресс, а разницу.
   Операция: { p: путь, v: значение } — записать; { p, del: 1 } — удалить;
   { p, push: [...] } — дописать в конец массива; { p, unshift: [...], len } — добавить в начало и обрезать. */

const Diff = {
  same(a, b) { return a === b || JSON.stringify(a) === JSON.stringify(b); },
  isObj(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); },

  make(a, b, p = [], out = []) {
    if (this.isObj(a) && this.isObj(b)) {
      for (const k of Object.keys(a)) if (!(k in b)) out.push({ p: [...p, k], del: 1 });
      for (const k of Object.keys(b)) if (!(k in a) || !this.same(a[k], b[k])) this.make(a[k], b[k], [...p, k], out);
      return out;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length === b.length) {
        for (let i = 0; i < b.length; i++) if (!this.same(a[i], b[i])) this.make(a[i], b[i], [...p, i], out);
        return out;
      }
      if (b.length > a.length && this.same(a, b.slice(0, a.length))) { out.push({ p, push: b.slice(a.length) }); return out; }
      // новые записи в начале (дневник, отправленные посылки), хвост обрезан
      for (let u = 1; u <= Math.min(5, b.length); u++) {
        if (this.same(b.slice(u), a.slice(0, b.length - u))) { out.push({ p, unshift: b.slice(0, u), len: b.length }); return out; }
      }
    }
    if (!this.same(a, b)) out.push({ p, v: b });
    return out;
  },

  apply(obj, ops) {
    for (const op of ops) {
      if (!op.p.length) { obj = op.v; continue; }
      let t = obj;
      for (let i = 0; i < op.p.length - 1; i++) {
        const k = op.p[i];
        if (t[k] == null) t[k] = typeof op.p[i + 1] === 'number' ? [] : {};
        t = t[k];
      }
      const k = op.p[op.p.length - 1];
      if (op.del) { if (Array.isArray(t)) t.splice(k, 1); else delete t[k]; }
      else if (op.push) t[k].push(...op.push);
      else if (op.unshift) { t[k].unshift(...op.unshift); t[k].length = op.len; }
      else t[k] = op.v;
    }
    return obj;
  },
};

// ===== server/game/core.js =====
/* Сервер игры «Духолов»: все действия игрока выполняются здесь, а не на телефоне.
   Телефон присылает намерение («бросил оберег», «зачерпнул родник», «усилил духа»), сервер проверяет его
   (расстояние до объекта, перезарядки, предметы в сумке, правдоподобие боя), сам бросает кубики
   и сохраняет результат. В ответ — изменения прогресса (diff.js) и события для окон и подсказок.
   Файл работает и в браузере (автотесты), и в Edge Function (см. build-server.ps1). */

class GameError extends Error {}

const GameCore = {
  MIN_CLIENT: '3.0.0',
  POI_ID: /^(osm:[nwr]\d{1,15}|usr:[0-9a-f-]{36})$/,
  PID: /^[a-z0-9]{8,40}$/,
  STARTERS: ['ugolek', 'kapelka', 'mshonok'],

  fail(msg) { throw new GameError(msg); },
  need(cond, msg) { if (!cond) this.fail(msg); },

  /* ---------- запуск запроса ----------
     req:  { a: [{ type, args }], tz, wx, pos: { lat, lng, acc }, v }
     save: { data, srv } — прогресс и служебные данные сервера (сессии встреч и боёв, позиция, лимиты)
     env:  доступ к общим таблицам (места, друзья, подарки, обмен, Лига) — см. serve.js / тесты */
  async run(req, save, env) {
    const ctx = { now: Date.now(), env, srv: JSON.parse(JSON.stringify(save.srv || {})), events: [], results: [], after: [], full: false, reset: false };
    const saved = { emit: Bus.emit, save: S.save, d: S.d, tz: U.tz, skew: U.skew, w: Sky.w, pos: MapView.pos };
    try {
      U.tz = Number.isFinite(+req.tz) ? U.clamp(Math.round(+req.tz), -840, 840) : 0;
      U.skew = 0;
      Sky.w = req.wx && WEATHER[req.wx] ? { key: req.wx } : null;
      const p = req.pos;
      ctx.pos = p && Number.isFinite(+p.lat) && Number.isFinite(+p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180
        ? { lat: +p.lat, lng: +p.lng, acc: U.clamp(+p.acc || 30, 1, 5000) } : null;
      MapView.pos = ctx.pos;
      Bus.emit = (ev, data) => ctx.events.push([ev, this.ser(ev, data)]);
      S.save = () => {};
      S.d = save.data ? JSON.parse(JSON.stringify(save.data)) : null;
      if (S.d) { S.migrate(); S.ensureQuests(); W.prune(); }
      this.track(ctx);

      const actions = Array.isArray(req.a) ? req.a.slice(0, 5) : [];
      this.need(actions.length, 'Пустой запрос');
      const stats0 = S.d ? JSON.parse(JSON.stringify(S.d.stats)) : null;
      for (const a of actions) {
        const h = this.H[a && a.type];
        this.need(h, 'Неизвестное действие');
        if (!['newGame', 'load'].includes(a.type)) this.need(S.d, 'Прогресс не найден');
        ctx.results.push(await h.call(this, a.args || {}, ctx));
      }
      if (S.d && stats0) this.orderAdd(ctx, Rules.orderPoints(stats0, S.d.stats, Ev.cur));
      if (S.d) { S.checkMedals(); S.ensureQuests(); }
      return { ok: true, data: S.d, srv: ctx.srv, results: ctx.results, events: ctx.events, after: ctx.after, full: ctx.full, reset: ctx.reset, now: ctx.now };
    } catch (e) {
      if (e instanceof GameError) return { ok: false, error: e.message };
      throw e;
    } finally {
      Bus.emit = saved.emit; S.save = saved.save; S.d = saved.d; U.tz = saved.tz; U.skew = saved.skew; Sky.w = saved.w; MapView.pos = saved.pos;
    }
  },
  // события — в виде, пригодном для JSON
  ser(ev, data) {
    if (ev === 'medal') return { m: data.m.id, tier: data.tier };
    return data === undefined ? null : JSON.parse(JSON.stringify(data));
  },

  /* ---------- проверки ---------- */
  // Позиция игрока: скачок быстрее ~200 км/ч включает паузу для действий на карте
  track(ctx) {
    const p = ctx.pos, last = ctx.srv.pos;
    if (!p) return;
    if (last && ctx.now - last.t < 10 * 60000) {
      const v = U.dist(last.lat, last.lng, p.lat, p.lng) / Math.max(1, (ctx.now - last.t) / 1000);
      if (v > 60 && U.dist(last.lat, last.lng, p.lat, p.lng) > 300) ctx.srv.fastUntil = ctx.now + 60000;
    }
    ctx.srv.pos = { lat: p.lat, lng: p.lng, t: ctx.now };
  },
  here(ctx) {
    this.need(ctx.pos, 'Нет данных о местоположении — включи GPS');
    this.need(!(ctx.srv.fastUntil > ctx.now), 'Похоже, GPS скачет — подожди минуту');
    return ctx.pos;
  },
  near(ctx, lat, lng, max) {
    const p = this.here(ctx), d = U.dist(p.lat, p.lng, lat, lng);
    this.need(d <= max + Math.min(p.acc, 30) + 10, 'Слишком далеко — подойди ближе');
    return d;
  },
  limit(ctx, key, max, windowMs) {
    const rl = ctx.srv.rl = ctx.srv.rl || {}, r = rl[key];
    if (!r || ctx.now - r[1] > windowMs) { rl[key] = [1, ctx.now]; return; }
    this.need(r[0] < max, 'Слишком часто — передохни немного');
    r[0]++;
  },
  spirit(uid) { const sp = S.findSpirit(String(uid)); this.need(sp, 'Дух не найден'); return sp; },
  // Объект карты из запроса. Места игроков и правки модераторов сверяются с сервером.
  async place(a, ctx, kind) {
    const p = a && typeof a === 'object' ? a : {};
    this.need(this.POI_ID.test(String(p.id)) && Number.isFinite(+p.lat) && Number.isFinite(+p.lng), 'Неизвестное место');
    const row = await ctx.env.poi(p.id);
    if (row) {
      this.need(row.active !== false, 'Этого места больше нет на карте');
      this.need(!kind || row.kind === kind, 'Здесь нет такого объекта');
      return { id: row.id, lat: row.lat, lng: row.lng, name: row.name, photo: row.photo || null };
    }
    this.need(p.id.startsWith('osm:'), 'Место не найдено');
    // там, где места загружены из OpenStreetMap в базу (вся Россия), других объектов нет
    this.need(!(await ctx.env.poiCovered(+p.lat, +p.lng)), 'Этого места нет на карте — обнови игру');
    return { id: p.id, lat: +p.lat, lng: +p.lng, name: String(p.name || 'Место').slice(0, 80), photo: null };
  },
  team(uids) { return (uids || []).map(u => S.findSpirit(u)).filter(Boolean); },
  battleTime(ctx, b) { return (ctx.now - b.start) / 1000 - Rules.COUNTDOWN; },
  endBattle(ctx, type) {
    const b = ctx.srv.battle;
    this.need(b && b.type === type, 'Бой не найден — начни его заново');
    ctx.srv.battle = null;
    return b;
  },
  // Одна встреча с духом за раз: вид, уровень и особенности — только с сервера
  openEnc(ctx, o) {
    const sp = S.makeSpirit(o.sid, o.lvl, o.seed + ':iv', { ivMin: o.mode === 'wild' ? 0 : 10 });
    if (o.shiny) sp.shiny = true;
    if (o.dark) sp.dark = true;
    ctx.srv.enc = { ...o, sp, throws: 0, honey: false, start: ctx.now };
    S.seen(o.sid);
    return { mode: o.mode, sid: o.sid, lvl: o.lvl, shiny: !!o.shiny, dark: !!o.dark, boost: !!o.boost, charms: o.charms || 0, power: S.power(sp) };
  },
  // Встреча закончилась без поимки: дух сбежал (text) или кончились обереги
  encLost(ctx, e, text, res) {
    if (e.spawnId && text) S.d.caught[e.spawnId] = ctx.now;
    if (text) J.add('flee', { sid: e.sid });
    ctx.srv.enc = null;
    return { ...res, fled: !!text, text, over: true };
  },
  // Победа засчитывается, если команда могла нанести столько урона за это время (или бой дошёл до таймера)
  plausibleDuel(ctx, b, foe) {
    const t = this.battleTime(ctx, b);
    this.need(t >= 5, 'Бой не засчитан: слишком быстрая победа');
    if (t >= Duel.TIME - 5) return;
    this.need(Rules.duelMaxDamage(this.team(b.team), foe, t) >= Rules.duelFoeHp(foe), 'Бой не засчитан: слишком быстрая победа');
  },
  friendPoint(f) {
    const lv = L => { let r = 0; FRIEND_LEVELS.forEach((x, i) => { if (L >= x.pts) r = i; }); return r; };
    const before = lv(f.pts);
    f.pts++;
    const after = lv(f.pts);
    if (after > before) {
      const L = FRIEND_LEVELS[after];
      S.addXP(L.xp);
      Bus.emit('toast', { text: `Дружба с ${f.name}: теперь «${L.name}»! +${U.fmtNum(L.xp * Ev.xpMul())} опыта`, cls: 'good' });
    }
  },

  // Общее дело Ордена: очки игрока за неделю; в общую таблицу — после сохранения прогресса
  orderAdd(ctx, pts) {
    if (!(pts > 0)) return;
    const w = Ev.week(ctx.now), O = S.d.order;
    const o = O[w] = O[w] || { n: 0, got: [] };
    o.n += pts;
    S.d.stats.orderPts += pts;
    Object.keys(O).forEach(k => { if (+k < w - 1) delete O[k]; }); // храним эту и прошлую неделю
    const row = { week: w, pid: S.d.pid, name: S.d.name, n: o.n };
    ctx.after.push(() => ctx.env.orderPut(row));
  },
  // Состояние недели w для экрана: общая сумма с учётом ещё не записанного вклада игрока
  async orderState(ctx, w) {
    const s = (await ctx.env.orderStats(w, S.d.pid)) || {};
    const mine = S.d.order[w] || { n: 0, got: [] }, dbMine = +s.mine || 0;
    const players = (+s.players || 0) + (mine.n > 0 && !(dbMine > 0) ? 1 : 0);
    const total = (+s.total || 0) - dbMine + mine.n;
    const top = (Array.isArray(s.top) ? s.top : []).map(r => ({ name: String(r.name || 'Ловчий').slice(0, 20), n: r.pid === S.d.pid ? mine.n : +r.n || 0, me: r.pid === S.d.pid }));
    return { week: w, total, players, goal: Rules.orderGoal(players), n: mine.n, got: mine.got.slice(), top, endsAt: ((w + 1) * 7 - 3) * 86400000 };
  },

  // Друг, который тоже добавил тебя: его запись у меня и его сохранение
  async mutual(ctx, pid, what) {
    const f = S.d.friends.find(x => x.id === pid);
    this.need(f, 'Такого друга нет');
    const s = await ctx.env.friendSave(f.id);
    this.need(s && s.data, 'Ловчий не найден');
    const d = s.data;
    this.need((d.friends || []).some(x => x.id === S.d.pid), `${what}, когда ${f.name} тоже добавит тебя в друзья`);
    return { f, d, s };
  },
  // Дух из чужого сохранения: только известные поля и допустимые значения
  cleanSpirit(x, i) {
    const iv = (Array.isArray(x.iv) ? x.iv : []).slice(0, 3).map(v => U.clamp(Math.floor(+v) || 0, 0, 15));
    while (iv.length < 3) iv.push(0);
    return { uid: 'foe' + i, sid: x.sid, lvl: U.clamp(Math.floor(+x.lvl) || 1, 1, 40), iv, shiny: !!x.shiny, dark: !!x.dark && !x.purified,
      purified: !!x.purified, move2: !!x.move2, amulet: AMULETS[x.amulet] ? x.amulet : null, nick: x.nick ? String(x.nick).slice(0, 16) : null };
  },
  // Три сильнейших духа друга
  topSpirits(d, n = 3) {
    const list = (Array.isArray(d.spirits) ? d.spirits : []).filter(x => x && SP[x.sid]).map((x, i) => this.cleanSpirit(x, i));
    return list.map(x => ({ x, p: S.power(x) })).sort((a, b) => b.p - a.p).slice(0, n).map(o => o.x);
  },

  /* ---------- действия ---------- */
  H: {
    async load(a, ctx) {
      ctx.full = true;
      if (!S.d) return { empty: true };
      const r = await ctx.env.registerPid(S.d.pid);
      if (r === 'taken') { S.d.pid = U.uid() + U.uid(); await ctx.env.registerPid(S.d.pid); }
      return { ok: true };
    },
    async newGame(a, ctx) {
      this.need(!S.d, 'Прогресс уже есть');
      const name = String(a.name || '').trim().replace(/\s+/g, ' ').slice(0, 16);
      this.need(name.length >= 1, 'Назови себя');
      this.need(this.STARTERS.includes(a.starter), 'Выбери первого духа');
      S.newGame(name, a.starter);
      await ctx.env.registerPid(S.d.pid);
      ctx.full = true;
      return { ok: true };
    },
    async reset(a, ctx) {
      await ctx.env.deleteSave();
      S.d = null; ctx.reset = true;
      return { ok: true };
    },
    tick() { return { ok: true }; },

    // Серия дней: первый вход за день (по часам игрока) — награда; пропуск дня начинает серию заново
    daily(a, ctx) {
      const st = S.d.streak, today = U.today(ctx.now);
      if (st.day === today) return { n: st.n, already: true };
      st.n = st.day === U.today(ctx.now - 86400000) ? st.n + 1 : 1;
      st.day = today;
      if (st.n > S.d.stats.streakBest) S.d.stats.streakBest = st.n;
      const i = (st.n - 1) % Rules.STREAK.length, got = S.giveRewards(Rules.STREAK[i]);
      if (i === Rules.STREAK.length - 1 && S.d.cocoons.length < 9) {
        S.d.cocoons.push({ id: U.uid(), km: 10, walked: 0, inc: S.incubating() < 3 });
        got.push({ k: 'cocoon', n: 1, label: 'Кокон 10 км' });
      }
      return { n: st.n, got };
    },

    // Общее дело Ордена: эта неделя и прошлая, если за неё осталась несобранная награда
    async order(a, ctx) {
      const w = Ev.week(ctx.now), cur = await this.orderState(ctx, w);
      const p = S.d.order[w - 1];
      const prev = p && Rules.ORDER.STEPS.some((s, i) => p.n >= s.need && !p.got.includes(i)) ? await this.orderState(ctx, w - 1) : null;
      return { cur, prev };
    },
    async orderClaim(a, ctx) {
      const w = a.week | 0, now = Ev.week(ctx.now), i = a.i | 0, step = Rules.ORDER.STEPS[i];
      this.need(step && (w === now || w === now - 1), 'Эта неделя уже закончилась');
      const mine = S.d.order[w];
      this.need(mine && mine.n >= step.need, `Для этой награды внеси в общее дело не меньше ${step.need} очков`);
      this.need(!mine.got.includes(i), 'Награда уже получена');
      const s = await this.orderState(ctx, w);
      this.need(s.total >= Math.ceil(step.at * s.goal), 'Орден ещё не дошёл до этой ступени');
      mine.got.push(i);
      const got = S.giveRewards(step.reward);
      if (i === Rules.ORDER.STEPS.length - 1 && S.d.cocoons.length < 9) {
        S.d.cocoons.push({ id: U.uid(), km: 10, walked: 0, inc: S.incubating() < 3 });
        got.push({ k: 'cocoon', n: 1, label: 'Кокон 10 км' });
      }
      J.add('order', { i });
      return { got };
    },

    // Пройденный путь: точки GPS с отметками времени. Быстрее 9 м/с (транспорт) не считается.
    move(a, ctx) {
      const pts = (Array.isArray(a.pts) ? a.pts : []).slice(0, 200)
        .filter(q => Array.isArray(q) && q.length >= 4 && [0, 1, 2, 3].every(i => Number.isFinite(+q[i])))
        .map(q => ({ lat: +q[0], lng: +q[1], t: +q[2], acc: +q[3] })).sort((x, y) => x.t - y.t);
      const last = ctx.srv.mv && ctx.now - ctx.srv.mv.t < 10 * 60000 ? ctx.srv.mv : null;
      let prev = last, m = 0;
      for (const q of pts) {
        if (q.acc > 40 || q.t > ctx.now + 5000 || (prev && q.t <= prev.t)) continue;
        if (!prev) { prev = q; continue; }
        const d = U.dist(prev.lat, prev.lng, q.lat, q.lng), dt = (q.t - prev.t) / 1000;
        if (d < 4) continue;
        if (dt > 0 && d / dt < 9) m += d;
        prev = q;
      }
      // не больше, чем можно пройти быстрым шагом с прошлой отметки
      const since = last ? (ctx.now - last.t) / 1000 : 60;
      m = Math.min(m, since * 9);
      if (prev) ctx.srv.mv = { lat: prev.lat, lng: prev.lng, t: Math.min(prev.t, ctx.now) };
      if (m > 0) S.addDistance(m);
      return { m };
    },

    /* ----- встреча с духом ----- */
    encStart(a, ctx) {
      const kind = a.kind;
      if (kind === 'wild') {
        this.need(Rules.THROWABLE.some(k => S.d.items[k] > 0), 'Обереги закончились! Загляни к роднику.');
        const p = this.here(ctx);
        const e = W.spawnsAround(p.lat, p.lng, W.INTERACT + 80).find(x => x.id === a.id && x.type === 'spirit' && !x.tut);
        this.need(e, 'Дух уже растворился в воздухе…');
        this.near(ctx, e.lat, e.lng, W.INTERACT);
        return this.openEnc(ctx, { mode: 'wild', sid: e.sid, lvl: e.lvl, shiny: e.shiny, boost: e.boost, seed: e.id, spawnId: e.id });
      }
      if (kind === 'tut') {
        this.need(S.d.tut === 1, 'Обучение уже пройдено');
        return this.openEnc(ctx, { mode: 'tut', sid: Tut.SID, lvl: 2, seed: 'tut' });
      }
      if (kind === 'raid') {
        const r = ctx.srv.raidWin;
        this.need(r, 'Разлом уже закрылся');
        ctx.srv.raidWin = null;
        return this.openEnc(ctx, { mode: 'raid', sid: r.sid, lvl: r.lvl, shiny: r.shiny, boost: r.boost, seed: r.rid, charms: r.charms });
      }
      if (kind === 'rescue') {
        const r = ctx.srv.rescue;
        this.need(r, 'Омрачённый дух уже ушёл');
        ctx.srv.rescue = null;
        return this.openEnc(ctx, { mode: 'rescue', sid: r.sid, lvl: r.lvl, dark: true, seed: r.seed });
      }
      if (kind === 'task') {
        const m = S.d.taskMeet.find(x => x.id === a.id);
        this.need(m, 'Встреча за поручение не найдена');
        return this.openEnc(ctx, { mode: 'task', sid: m.sid, lvl: m.lvl, seed: 'task:' + m.id, taskId: m.id });
      }
      if (kind === 'story') {
        this.need(S.d.storyGift && SP[S.d.storyGift], 'Встреча Летописи недоступна');
        return this.openEnc(ctx, { mode: 'story', sid: S.d.storyGift, lvl: 25, seed: 'gift' + S.d.created });
      }
      this.fail('Неизвестная встреча');
    },
    encHoney(a, ctx) {
      const e = ctx.srv.enc;
      this.need(e, 'Встреча закончилась');
      this.need(!e.honey, 'Дух уже лакомится мёдом');
      this.need(S.useItem('honey'), 'Мёда нет. Его можно найти у родников.');
      e.honey = true;
      return { ok: true };
    },
    // Бросок: попадание и кольцо — с телефона (это ловкость игрока), покачивания и побег — решает сервер
    encThrow(a, ctx) {
      const e = ctx.srv.enc;
      this.need(e, 'Встреча закончилась');
      const raid = e.mode === 'raid';
      let item = 'rift';
      if (raid) { this.need(e.charms > 0, 'Обереги разлома кончились'); e.charms--; }
      else {
        item = Rules.THROWABLE.includes(a.item) ? a.item : 'charm';
        this.need(S.useItem(item), 'Обереги этого вида закончились');
      }
      e.throws++;
      const left = () => raid ? e.charms : Rules.THROWABLE.reduce((n, k) => n + (S.d.items[k] || 0), 0);
      if (!a.hit) {
        if (!left()) return this.encLost(ctx, e, raid ? 'Обереги кончились — дух вернулся в Навь…' : null, { miss: true });
        return { miss: true, left: left() };
      }
      const bonus = Rules.ringBonus(a.ring);
      if (bonus.great) { S.progress('throw', 1); S.d.stats.throwsGreat++; }
      const chance = Rules.catchChance({ mode: e.mode, sid: e.sid, lvl: e.lvl, item, honey: e.honey, mul: bonus.mul });
      const q = Math.pow(chance, 1 / 3);
      e.honey = false;
      let wobbles = 0;
      while (wobbles < 3 && Math.random() < q) wobbles++;
      if (wobbles < 3) {
        const flee = e.mode !== 'wild' ? 0 : RARITY[SP[e.sid].rar].flee * (e.throws > 3 ? 1.5 : 1);
        if (Math.random() < flee) return this.encLost(ctx, e, 'Дух ускользнул в Навь…', { wobbles, label: bonus.label });
        if (!left()) return this.encLost(ctx, e, raid ? 'Обереги кончились — дух вернулся в Навь…' : null, { wobbles, label: bonus.label });
        return { wobbles, label: bonus.label, left: left() };
      }
      // пойман
      const sp = e.sp, s = SP[e.sid];
      if (e.spawnId) S.d.caught[e.spawnId] = ctx.now;
      const isNew = S.addSpirit(sp);
      J.add('catch', { sid: s.id, shiny: !!sp.shiny, dark: !!sp.dark, power: S.power(sp) });
      const rw = Rules.catchReward({ mode: e.mode, sid: e.sid, isNew, ringXp: bonus.xp, throws: e.throws, shiny: sp.shiny, boost: e.boost });
      S.addEssence(s.fam, rw.ess);
      S.d.sparks += rw.sparks;
      S.d.stats.caught++;
      S.addXP(rw.xp);
      S.progress('catch', 1); S.progress('catchEl', 1, { el: s.el });
      if (e.mode === 'tut' && S.d.tut === 1) S.d.tut = 2;
      if (e.mode === 'story') S.d.storyGift = null;
      if (e.mode === 'task') S.d.taskMeet = S.d.taskMeet.filter(x => x.id !== e.taskId); // сбежать не может — встреча ждёт, пока дух не пойман
      ctx.srv.enc = null;
      return { wobbles: 3, caught: true, label: bonus.label, uid: sp.uid, isNew, xp: Math.round(rw.xp * Ev.xpMul()), sparks: rw.sparks, ess: rw.ess };
    },
    encEnd(a, ctx) { ctx.srv.enc = null; return { ok: true }; },

    /* ----- родник ----- */
    async spring(a, ctx) {
      const p = await this.place(a.poi, ctx, 'spring');
      this.near(ctx, p.lat, p.lng, W.INTERACT);
      this.limit(ctx, 'spring', 60, 3600000);
      const e = W.springFor(p, 0);
      this.need(!e.invaded, 'Родник захвачен Навью');
      this.need(e.ready, 'Родник ещё набирает силу');
      S.d.springs[p.id] = ctx.now;
      const { loot, cocoon } = W.springLoot(p.id);
      const got = S.giveRewards({ ...loot, xp: 50 });
      S.d.stats.springs++;
      S.progress('spring', 1);
      let coc = null;
      if (cocoon) { coc = { id: U.uid(), km: cocoon, walked: 0, inc: S.incubating() < 3 }; S.d.cocoons.push(coc); }
      if (S.d.tut === 2) S.d.tut = 3;
      // поручение: первое за день — всегда, дальше — в каждом четвёртом роднике
      let task = null;
      if (!S.d.tut && S.d.tasks.length < TASK_LIMIT && (S.d.taskDay !== U.today(ctx.now) || Math.random() < 0.25)) {
        S.d.taskDay = U.today(ctx.now);
        task = S.makeTask();
        S.d.tasks.push(task);
      }
      return { got, cocoon: coc, task, full: S.bagCount() >= BAG_LIMIT };
    },
    incense(a, ctx) {
      this.need(!S.incenseActive(), 'Ладан ещё горит');
      this.need(S.useItem('incense'), 'Ладана нет');
      S.d.incenseUntil = ctx.now + 30 * 60000;
      return { until: S.d.incenseUntil };
    },
    supply(a, ctx) {
      this.need(S.d.supplyDay !== U.today(), 'Посылка сегодня уже была');
      S.d.supplyDay = U.today();
      return { got: S.giveRewards(Rules.SUPPLY) };
    },
    photo(a, ctx) { this.limit(ctx, 'photo', 20, 3600000); S.progress('photo', 1); return { ok: true }; },

    /* ----- коллекция ----- */
    fav(a) { const sp = this.spirit(a.uid); sp.fav = !!a.on; return { ok: true }; },
    nick(a) {
      const sp = this.spirit(a.uid), v = String(a.nick || '').trim().slice(0, 16);
      sp.nick = v && v !== SP[sp.sid].name ? v : null;
      return { ok: true };
    },
    release(a) {
      const uids = [...new Set((Array.isArray(a.uids) ? a.uids : [a.uid]).map(String))];
      uids.forEach(u => this.spirit(u));
      this.need(uids.length < S.d.spirits.length, 'Нельзя отпустить всех духов');
      uids.forEach(u => S.release(u));
      return { n: uids.length };
    },
    powerUp(a) { const sp = this.spirit(a.uid), err = S.canPowerUp(sp); this.need(!err, err); S.powerUp(sp); return { lvl: sp.lvl }; },
    evolve(a) {
      const sp = this.spirit(a.uid), err = S.canEvolve(sp); this.need(!err, err);
      const from = sp.sid, r = S.evolve(sp);
      return { from, to: sp.sid, isNew: r.isNew };
    },
    purify(a) { const sp = this.spirit(a.uid), err = S.canPurify(sp); this.need(!err, err); S.purify(sp); return { ok: true }; },
    move2(a) { const sp = this.spirit(a.uid), err = S.canLearnMove2(sp); this.need(!err, err); S.learnMove2(sp); return { ok: true }; },
    equip(a) {
      const sp = this.spirit(a.uid);
      this.need(AMULETS[a.k] && S.d.amulets[a.k] > 0, 'Такого амулета нет');
      S.equip(sp, a.k);
      return { ok: true };
    },
    unequip(a) { S.unequip(this.spirit(a.uid)); return { ok: true }; },
    buddy(a) { S.setBuddy(this.spirit(a.uid).uid); return { ok: true }; },
    team(a) {
      const uids = [...new Set((Array.isArray(a.uids) ? a.uids : []).map(String))].filter(u => S.findSpirit(u)).slice(0, 3);
      S.setTeam(uids);
      return { ok: true };
    },
    look(a) {
      const L = a.look || {}, lvl = S.d.level;
      const c = LOOK.cloak.find(x => x.c === L.cloak), e = LOOK.eyes.find(x => x.c === L.eyes), m = LOOK.emblem.find(x => x.id === L.emblem);
      this.need(c && e && m, 'Такого облика нет');
      this.need(c.lvl <= lvl && e.lvl <= lvl && m.lvl <= lvl, 'Этот облик ещё не открыт');
      this.need(!m.league || League.st().best >= m.league, 'Венец Лиги — награда за ранг «Хранитель Лиги»');
      this.need(!m.story || S.d.story.ch >= m.story, 'Эта эмблема — награда за вторую книгу Летописи');
      S.d.look = { cloak: c.c, eyes: e.c, emblem: m.id };
      return { ok: true };
    },

    /* ----- коконы ----- */
    warm(a) {
      const c = S.d.cocoons.find(x => x.id === a.id);
      this.need(c && !c.inc, 'Кокон не найден');
      this.need(S.incubating() < 3, 'Греть можно три кокона одновременно');
      c.inc = true;
      return { ok: true };
    },
    hatch(a) {
      const c = S.d.cocoons.find(x => x.id === a.id);
      this.need(c && c.inc && c.walked >= c.km, 'Кокон ещё не готов');
      const r = S.hatch(c);
      return { uid: r.sp.uid, sid: r.sp.sid, isNew: r.isNew, essence: r.essence, sparks: r.sparks, km: c.km };
    },

    /* ----- задания и Летопись ----- */
    questClaim(a) {
      const q = S.d.quests.list[a.i | 0];
      this.need(q && q.p >= q.n && !q.claimed, 'Задание ещё не выполнено');
      q.claimed = true;
      return { got: S.giveRewards({ ...q.reward, xp: 300 }) };
    },
    questBonus() {
      const Q = S.d.quests;
      this.need(Q.list.every(q => q.claimed) && !Q.bonus, 'Сундук ещё закрыт');
      Q.bonus = true;
      return { got: S.giveRewards({ ...Rules.QUEST_BONUS, xp: 1000 }) };
    },
    storyClaim() {
      const ch = S.d.story.ch, res = S.claimStory();
      this.need(res, 'Глава ещё не завершена');
      if (res.ch.gift) S.d.storyGift = res.ch.gift;
      J.add('story', { title: res.ch.title });
      return { ch, got: res.got };
    },
    // Поручение выполнено: предметы сразу, дух — во встрече (ждёт в «Заданиях», пока не пойман)
    taskClaim(a) {
      const q = S.d.tasks.find(x => x.id === a.id);
      this.need(q && q.p >= q.n, 'Поручение ещё не выполнено');
      this.need(S.d.taskMeet.length < TASK_LIMIT, 'Сначала встреть духов за прошлые поручения');
      S.d.tasks = S.d.tasks.filter(x => x !== q);
      const T = TASK_TIERS[q.tier];
      const got = S.giveRewards({ ...T.reward, xp: 250 * q.tier });
      const m = { id: q.id, sid: q.sid, lvl: Math.min(T.lvl, S.maxLvl()) };
      S.d.taskMeet.push(m);
      return { got, meet: m };
    },
    taskDrop(a) {
      const n = S.d.tasks.length;
      S.d.tasks = S.d.tasks.filter(x => x.id !== a.id);
      this.need(S.d.tasks.length < n, 'Поручение не найдено');
      return { ok: true };
    },
    tutFinish(a) {
      this.need(S.d.tut, 'Обучение уже пройдено');
      const done = !a.skip && S.d.tut === 3;
      S.d.tut = 0;
      return { got: done ? S.giveRewards(Rules.TUT_REWARD) : [] };
    },
    async placeRewards(a, ctx) {
      const rows = await ctx.env.mySubmissions();
      const out = [];
      rows.filter(r => r.status !== 'pending' && !S.d.props[r.id]).forEach(r => {
        S.d.props[r.id] = r.status;
        out.push({ name: r.name, status: r.status, reason: r.reason, got: r.status === 'approved' ? S.giveRewards(Rules.PLACE_REWARD) : [] });
      });
      return { list: out };
    },

    /* ----- бои: разлом ----- */
    async raidStart(a, ctx) {
      const coop = a.coop && typeof a.coop === 'object' ? { host: !!a.coop.host, allies: U.clamp(a.coop.allies | 0, 0, 3) } : null;
      const p = await this.place(a.rift, ctx, 'shrine');
      const hour = Math.floor(ctx.now / 3600000);
      // бой мог начаться за минуту до смены часа
      const r = W.riftFor(p, 0, hour) || (ctx.now % 3600000 < 90000 ? W.riftFor(p, 0, hour - 1) : null);
      this.need(r, 'Разлом уже закрылся');
      this.need(!S.d.rifts[r.id], 'Этот разлом ты уже закрыл');
      if (!coop || coop.host) this.near(ctx, p.lat, p.lng, W.BATTLE_R);
      const team = S.team();
      this.need(team.length, 'Нужна команда');
      this.limit(ctx, 'raid', 30, 3600000);
      ctx.srv.battle = { type: 'raid', rid: r.id, poi: p, tier: r.tier, boss: r.boss, start: ctx.now, team: team.map(x => x.uid), coop, waters: 0 };
      return { rid: r.id, tier: r.tier, boss: r.boss };
    },
    water(a, ctx) {
      const b = ctx.srv.battle;
      this.need(b && b.type === 'raid', 'Живая вода — только в бою');
      this.need(b.waters < 3, 'За бой можно выпить не больше 3 флаконов');
      this.need(S.useItem('water'), 'Живой воды нет');
      b.waters++;
      return { left: S.d.items.water || 0 };
    },
    raidEnd(a, ctx) {
      const b = this.endBattle(ctx, 'raid');
      if (!a.win) return { win: false };
      const t = Math.min(90, this.battleTime(ctx, b));
      const n = b.coop ? b.coop.allies + 1 : 1, hpMul = 1 + 0.8 * (n - 1);
      const need = Raid.TIER[b.tier].hp * hpMul / n;
      this.need(t >= 2 && Rules.raidMaxDamage(this.team(b.team), b, t) >= need, 'Бой не засчитан: слишком быстрая победа');
      S.d.rifts[b.rid] = true;
      const allies = b.coop ? b.coop.allies : 0, tier = b.tier;
      J.add('raid', { sid: b.boss, tier, coop: allies });
      S.d.stats.raids++;
      S.progress('raid', 1);
      const rw = S.giveRewards({ xp: Math.round(1000 * tier * (allies ? 1.25 : 1)), sparks: 400 * tier, charm: 5, honey: 2 + tier, water: 2, charm2: tier >= 2 ? 3 : 0 });
      const am = S.rollAmulet([0.25, 0.4, 0.7][tier - 1], b.rid);
      if (am) rw.push({ k: 'amulet', n: 1, label: AMULETS[am].name });
      const bonus = Math.max(0, Math.floor((90 - t) / 15));
      const charms = Raid.TIER[tier].charms + bonus + (Ev.cur.rifts ? 3 : 0) + allies * 2;
      const shiny = U.h('rshiny', b.rid, S.d.created) < Sky.shinyRate(1 / 20);
      ctx.srv.raidWin = { rid: b.rid, sid: b.boss, lvl: Raid.TIER[tier].lvl, charms, shiny, boost: Sky.boosted(SP[b.boss].el) };
      return { win: true, rw, charms, bonus, allies };
    },

    /* ----- бои: капище и вторжение ----- */
    async duelStart(a, ctx) {
      this.need(S.d.level >= 3, 'Капища открываются с 3 уровня Ловчего');
      const p = await this.place(a.shrine, ctx, 'shrine');
      this.need(!W.riftAt(p.id, Math.floor(ctx.now / 3600000)), 'Сейчас здесь открыт Разлом');
      const e = W.shrineFor(p, 0);
      this.need(!e.won, 'Сегодня ты уже победил здесь');
      this.near(ctx, p.lat, p.lng, W.BATTLE_R);
      const team = S.team();
      this.need(team.length, 'Нужна команда');
      this.limit(ctx, 'duel', 40, 3600000);
      ctx.srv.battle = { type: 'duel', id: e.id, tier: e.tier, name: e.name, start: ctx.now, team: team.map(x => x.uid) };
      return { id: e.id, tier: e.tier };
    },
    duelEnd(a, ctx) {
      const b = this.endBattle(ctx, 'duel');
      if (!a.win) return { win: false };
      const e = { id: b.id, tier: b.tier, name: b.name };
      this.plausibleDuel(ctx, b, W.guardian(e).team);
      const T = SHRINE_TIERS[e.tier], mul = Ev.duelMul(), t = e.tier;
      S.d.shrines[e.id] = U.today();
      J.add('duel', { name: e.name, guard: W.guardian(e).name, tier: t });
      S.d.stats.duels++;
      S.progress('duel', 1);
      const rw = S.giveRewards({ xp: T.xp * mul, sparks: T.sparks * mul, charm: 5 * mul, honey: t * mul, water: 2, charm2: t >= 2 ? 3 * mul : 0, charm3: t === 3 ? 2 * mul : 0 });
      const am = S.rollAmulet(0.15 * t, e.id);
      if (am) rw.push({ k: 'amulet', n: 1, label: AMULETS[am].name });
      return { win: true, rw };
    },
    async invStart(a, ctx) {
      const p = await this.place(a.spring, ctx, 'spring');
      const e = W.springFor(p, 0);
      this.need(e.invaded, 'Родник свободен');
      this.near(ctx, p.lat, p.lng, W.INTERACT);
      const team = S.team();
      this.need(team.length, 'Нужна команда');
      this.limit(ctx, 'inv', 40, 3600000);
      ctx.srv.battle = { type: 'inv', invId: e.invId, name: e.name, start: ctx.now, team: team.map(x => x.uid) };
      return { invId: e.invId };
    },
    invEnd(a, ctx) {
      const b = this.endBattle(ctx, 'inv');
      if (!a.win) return { win: false };
      const g = W.grunt({ invId: b.invId });
      this.plausibleDuel(ctx, b, g.team);
      S.d.freed[b.invId] = true;
      S.d.stats.invasions++;
      S.progress('invasion', 1);
      J.add('invasion', { name: b.name });
      const rw = S.giveRewards({ xp: 1000, sparks: 500, charm: 6, honey: 2, water: 2 });
      const am = S.rollAmulet(0.15, b.invId);
      if (am) rw.push({ k: 'amulet', n: 1, label: AMULETS[am].name });
      const rescue = g.team[Math.floor(U.h('rescue', b.invId) * g.team.length)];
      ctx.srv.rescue = { sid: rescue.sid, lvl: Math.min(rescue.lvl, S.maxLvl()), seed: b.invId + ':rescue' };
      return { win: true, rw, rescue: { sid: rescue.sid, lvl: ctx.srv.rescue.lvl } };
    },

    /* ----- Лига ----- */
    leagueStart(a, ctx) {
      const L = League.st(), team = S.team();
      this.need(S.d.level >= 5, 'Лига открывается с 5 уровня Ловчего');
      this.need(team.length === 3, 'Нужно три духа');
      this.need(L.tickets > 0, 'Жетоны кончились — приходи завтра');
      L.tickets--;
      L.run = { k: 0, won: 0, stars0: L.stars, rank0: League.rank(L.stars), seed: U.uid(), team: team.map(x => x.uid) };
      ctx.srv.battle = { type: 'league', k: 0, start: ctx.now, team: L.run.team };
      return { run: L.run };
    },
    leagueEnd(a, ctx) {
      const L = League.st(), run = L.run;
      this.need(run, 'Турнир не найден');
      const b = this.endBattle(ctx, 'league');
      this.need(b.k === run.k, 'Турнир не найден');
      const win = !!a.win;
      if (win) this.plausibleDuel(ctx, b, League.opponent(run.k).team);
      let gained = 0;
      if (win) { run.won++; gained++; S.progress('league', 1); }
      const last = !win || run.k >= 2;
      if (win && run.k === 2) gained++; // чистая победа
      L.stars += gained;
      const rNew = League.rank(L.stars), rewards = [];
      for (let i = 1; i <= rNew; i++) {
        if (L.got[i]) continue;
        L.got[i] = true;
        rewards.push(...S.giveRewards(LEAGUE_RANKS[i].reward));
        // на рангах 3, 6 и 9 — гарантированный амулет
        if (i % 3 === 0) { const am = S.rollAmulet(1, 'lg' + i); rewards.push({ k: 'amulet', n: 1, label: AMULETS[am].name }); }
      }
      if (rNew > L.best) L.best = rNew;
      S.addXP(win ? 400 + run.k * 200 : 100);
      const res = { win, gained, last, k: run.k, won: run.won, stars: L.stars, starsGot: L.stars - run.stars0, rNew, rank0: run.rank0, rewards };
      if (last) {
        J.add('league', { won: run.won, rank: LEAGUE_RANKS[rNew].name });
        L.run = null;
        if (a.board !== false) ctx.after.push(() => ctx.env.leagueScore({ season: L.season, name: S.d.name, stars: L.stars, rank: rNew, level: S.d.level, look: S.d.look }));
      } else {
        run.k++;
        ctx.srv.battle = { type: 'league', k: run.k, start: ctx.now, team: run.team };
      }
      return res;
    },

    /* ----- обмен духами ----- */
    async tradeGive(a, ctx) {
      const sp = this.spirit(a.uid);
      this.need(S.d.spirits.length > 1, 'Нельзя отдать последнего духа');
      this.limit(ctx, 'trade', 20, 86400000);
      if (sp.amulet) S.unequip(sp); // амулет остаётся у хозяина
      const code = Array.from({ length: 10 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
      await ctx.env.tradeCreate(code, S.d.pid, S.d.name, { s: sp.sid, l: sp.lvl, i: sp.iv, y: sp.shiny ? 1 : 0, d: sp.dark ? 1 : 0, n: sp.nick || '', p: sp.purified ? 1 : 0, m: sp.move2 ? 1 : 0 });
      S.d.spirits.splice(S.d.spirits.indexOf(sp), 1);
      if (S.d.buddy && S.d.buddy.uid === sp.uid) { S.d.buddy = null; Bus.emit('buddyChanged'); }
      S.d.team = S.d.team.filter(u => u !== sp.uid);
      S.d.sent.unshift({ code: 'DUH2.' + code, sid: sp.sid, shiny: !!sp.shiny, dark: !!sp.dark, t: ctx.now });
      S.d.sent = S.d.sent.slice(0, 20);
      S.d.stats.traded++;
      J.add('trade', { sid: sp.sid, dir: 'out' });
      return { code: 'DUH2.' + code };
    },
    async tradeReceive(a, ctx) {
      const m = String(a.code || '').toUpperCase().match(/DUH2\.([A-Z2-9]{10})/);
      this.need(m, /DUH1\./i.test(a.code || '') ? 'Это код старой версии игры — попроси друга упаковать духа заново' : 'Это не код посылки');
      const t = await ctx.env.tradeTake(m[1], S.d.pid);
      this.need(t, 'Посылка не найдена или её уже открыли');
      this.need(!t.own, 'Это твоя собственная посылка — отдай код другу');
      const p = t.spirit;
      this.need(SP[p.s], 'Посылка повреждена');
      const sp = { uid: U.uid(), sid: p.s, lvl: Math.min(p.l, S.maxLvl()), iv: p.i, t: ctx.now, fav: false, nick: p.n || null, from: String(t.from_name || '').slice(0, 20) };
      if (p.y) sp.shiny = true;
      if (p.d) sp.dark = true;
      if (p.p) sp.purified = true;
      if (p.m) sp.move2 = true;
      const isNew = S.addSpirit(sp);
      S.addEssence(SP[sp.sid].fam, 5);
      J.add('trade', { sid: sp.sid, dir: 'in', who: sp.from });
      S.d.stats.traded++;
      S.addXP(isNew ? 1000 : 300);
      return { uid: sp.uid, isNew };
    },

    /* ----- друзья и подарки ----- */
    async friendAdd(a, ctx) {
      const pid = String(a.pid || '');
      this.need(this.PID.test(pid), 'В коде ошибка');
      this.need(pid !== S.d.pid, 'Это твой собственный код дружбы');
      const who = await ctx.env.player(pid);
      this.need(who, 'Ловчий с таким кодом не найден — пусть он обновит игру');
      let f = S.d.friends.find(x => x.id === pid), isNew = false;
      if (!f) {
        this.need(S.d.friends.length < 50, 'Друзей уже 50 — это максимум');
        f = { id: pid, name: who.name, lvl: who.level, pts: 0, added: ctx.now, sent: '', recv: '' };
        S.d.friends.push(f);
        J.add('friend', { name: f.name });
        isNew = true;
      } else { f.name = who.name; f.lvl = who.level; }
      f.linked = true;
      await ctx.env.link(S.d.pid, pid, S.d.name, S.d.level);
      return { name: f.name, isNew };
    },
    // Профиль друга — только если дружба взаимная (он тоже добавил тебя)
    async friendProfile(a, ctx) {
      this.limit(ctx, 'profile', 60, 3600000);
      const { f, d, s } = await this.mutual(ctx, a.pid, 'Профиль откроется');
      // чужое сохранение могло быть записано ещё телефоном (до 3.0) — только числа и известные значения
      const num = (v, max) => U.clamp(Math.floor(+v) || 0, 0, max);
      f.name = String(d.name || f.name).slice(0, 20); f.lvl = num(d.level, MAX_LEVEL) || f.lvl;
      // облик — только из известных вариантов (он попадает в картинку)
      const lk = d.look || {}, look = LOOK.cloak.some(x => x.c === lk.cloak) && LOOK.eyes.some(x => x.c === lk.eyes) && LOOK.emblem.some(x => x.id === lk.emblem)
        ? { cloak: lk.cloak, eyes: lk.eyes, emblem: lk.emblem } : null;
      if (look) f.look = look;
      const st = d.stats || {}, spirits = Array.isArray(d.spirits) ? d.spirits.filter(x => x && SP[x.sid]) : [];
      const top = this.topSpirits(d).map(x => ({ ...x, power: S.power(x) }));
      const buddy = d.buddy && spirits.find(x => x.uid === d.buddy.uid);
      const L = d.league || {};
      return {
        name: f.name, level: num(d.level, MAX_LEVEL) || 1, look, seen: s.seen || null,
        dex: Object.values(d.dex || {}).filter(x => x && x.caught).length, caught: num(st.caught, 1e7), km: U.clamp(+st.km || 0, 0, 1e5),
        raids: num(st.raids, 1e6), duels: num(st.duels, 1e6), streak: num(d.streak && d.streak.n, 1e5),
        medals: Object.values(d.medals || {}).filter(t => t >= 3).length, rank: num(L.best, LEAGUE_RANKS.length - 1),
        buddy: buddy ? buddy.sid : null, top, pts: f.pts,
      };
    },
    // Поединок с другом: его три сильнейших духа под управлением игры. Награда — раз в день за каждого друга.
    async sparStart(a, ctx) {
      this.limit(ctx, 'spar', 30, 3600000);
      const { f, d } = await this.mutual(ctx, a.pid, 'Поединок откроется');
      const foe = this.topSpirits(d);
      this.need(foe.length, `У ${f.name} пока нет духов`);
      const team = S.team();
      this.need(team.length, 'Нужна команда');
      ctx.srv.battle = { type: 'spar', pid: f.id, foe, start: ctx.now, team: team.map(x => x.uid) };
      return { foe, name: f.name, look: f.look || null, rewarded: f.spar === U.today(ctx.now) };
    },
    sparEnd(a, ctx) {
      const b = this.endBattle(ctx, 'spar');
      if (!a.win) return { win: false };
      this.plausibleDuel(ctx, b, b.foe);
      const f = S.d.friends.find(x => x.id === b.pid);
      this.need(f, 'Такого друга нет');
      J.add('spar', { name: f.name });
      if (f.spar === U.today(ctx.now)) return { win: true, rw: S.giveRewards({ xp: 100 }), practice: true };
      f.spar = U.today(ctx.now);
      const rw = S.giveRewards({ xp: 800, sparks: 500, charm: 3, honey: 1 });
      this.friendPoint(f);
      return { win: true, rw, pts: f.pts };
    },
    friendRemove(a) { S.d.friends = S.d.friends.filter(f => f.id !== a.pid); return { ok: true }; },
    // Кто добавил меня (дружба взаимная) + подарки, которые ждут открытия
    async friendsSync(a, ctx) {
      for (const f of S.d.friends.filter(x => !x.linked && this.PID.test(x.id))) {
        try { await ctx.env.link(S.d.pid, f.id, S.d.name, S.d.level); f.linked = true; } catch (e) {}
      }
      const seen = S.d.friendLinks, added = [];
      (await ctx.env.linksTo(S.d.pid)).forEach(r => {
        if (!this.PID.test(r.from_pid) || r.from_pid === S.d.pid || seen[r.from_pid] === r.created_at) return;
        seen[r.from_pid] = r.created_at;
        const f = S.d.friends.find(x => x.id === r.from_pid);
        if (f) { f.name = String(r.from_name).slice(0, 20); f.lvl = r.from_level; return; }
        if (S.d.friends.length >= 50) return;
        S.d.friends.push({ id: r.from_pid, name: String(r.from_name).slice(0, 20), lvl: r.from_level || 1, pts: 0, added: ctx.now, sent: '', recv: '', linked: false });
        J.add('friend', { name: r.from_name });
        added.push(String(r.from_name).slice(0, 20));
      });
      const inbox = (await ctx.env.giftsTo(S.d.pid)).map(g => ({ id: g.id, from: g.from_pid, name: g.from_name, t: g.created_at }));
      return { added, inbox };
    },
    async giftSend(a, ctx) {
      const f = S.d.friends.find(x => x.id === a.pid);
      this.need(f, 'Такого друга нет');
      this.need(f.sent !== U.today(), 'Сегодня этому другу подарок уже отправлен');
      this.need(S.useItem('gift'), 'Подарков нет — они попадаются в родниках');
      const lv = (() => { let r = 0; FRIEND_LEVELS.forEach((x, i) => { if (f.pts >= x.pts) r = i; }); return r; })();
      const r = Math.random, c = { charm: 3 + Math.floor(r() * 4) };
      if (r() < 0.6) c.honey = 1 + Math.floor(r() * 2);
      if (r() < 0.4) c.water = 1;
      if (lv >= 2 && r() < 0.5) c.charm2 = 2;
      if (lv >= 3 && r() < 0.3) c.charm3 = 1;
      if (r() < 0.12 + lv * 0.03) c.cocoon = 5;
      await ctx.env.giftCreate(S.d.pid, f.id, S.d.name, c);
      f.sent = U.today();
      this.friendPoint(f);
      J.add('gift', { dir: 'out', name: f.name });
      return { ok: true };
    },
    async giftOpen(a, ctx) {
      const g = await ctx.env.gift(String(a.id || ''));
      this.need(g && g.to_pid === S.d.pid, 'Подарок не найден');
      this.need(!g.opened_at, 'Подарок уже открыт');
      const f = S.d.friends.find(x => x.id === g.from_pid);
      this.need(f, `Сначала добавь ${g.from_name || 'отправителя'} в друзья`);
      this.need(f.recv !== U.today(), 'Сегодня ты уже открывал подарок от этого друга — попробуй завтра');
      this.need(await ctx.env.giftTake(g.id, S.d.pid), 'Подарок уже открыт');
      f.recv = U.today();
      const { cocoon, ...items } = g.contents || {};
      const clean = {};
      for (const [k, n] of Object.entries(items)) if (ITEMS[k] && n > 0 && n <= 10) clean[k] = n | 0;
      const got = S.giveRewards({ ...clean, xp: 200 + (() => { let r = 0; FRIEND_LEVELS.forEach((x, i) => { if (f.pts >= x.pts) r = i; }); return r; })() * 100 });
      if (cocoon && S.d.cocoons.length < 9) { S.d.cocoons.push({ id: U.uid(), km: 5, walked: 0, inc: S.incubating() < 3 }); got.push({ k: 'cocoon', n: 1, label: 'Кокон 5 км' }); }
      this.friendPoint(f);
      J.add('gift', { dir: 'in', name: f.name });
      return { name: f.name, got, pts: f.pts };
    },
  },
};

// ===== server/game/serve.js =====
/* ---------- Edge Function: вход, загрузка и сохранение прогресса, общие таблицы ---------- */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// секретный ключ проекта (новая схема ключей Supabase, с запасным вариантом для старой)
function serviceKey() {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    const k = keys.default || Object.values(keys)[0];
    if (k) return String(k);
  } catch { /* старая схема */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
}
const db = createClient(Deno.env.get('SUPABASE_URL'), serviceKey(), { auth: { persistSession: false } });
const UUID = /^[0-9a-f-]{36}$/;
// Игровой код работает с общими переменными (S.d, часовой пояс, погода), поэтому запросы
// внутри одного экземпляра функции выполняются строго по очереди
let queue = Promise.resolve();
const exclusive = fn => { const p = queue.then(fn, fn); queue = p.catch(() => {}); return p; };
const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
const verCmp = (a, b) => {
  const pa = String(a || '0').split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return Math.sign(d); }
  return 0;
};

// Доступ к общим таблицам для GameCore (от имени сервера, в пределах одного игрока uid)
function makeEnv(uid) {
  return {
    async poi(id) { return must(await db.from('pois').select('id, kind, lat, lng, name, photo, active').eq('id', id).maybeSingle()); },
    // Есть ли в округе (~1 км) места, загруженные импортом OpenStreetMap
    async poiCovered(lat, lng) {
      const dLng = 0.011 / Math.max(0.2, Math.cos(lat * Math.PI / 180));
      const rows = must(await db.from('pois').select('id').eq('imported', true)
        .gte('lat', lat - 0.011).lte('lat', lat + 0.011).gte('lng', lng - dLng).lte('lng', lng + dLng).limit(1));
      return !!(rows && rows.length);
    },
    async registerPid(pid) {
      const row = must(await db.from('players').select('user_id').eq('pid', pid).maybeSingle());
      if (row && row.user_id === uid) return 'ok';
      if (row) return 'taken';
      must(await db.from('players').delete().eq('user_id', uid));
      must(await db.from('players').insert({ pid, user_id: uid }));
      return 'ok';
    },
    async player(pid) {
      const p = must(await db.from('players').select('user_id').eq('pid', pid).maybeSingle());
      if (!p) return null;
      const s = must(await db.from('saves').select('data->name, data->level').eq('user_id', p.user_id).maybeSingle());
      return s ? { name: String(s.name || 'Ловчий').slice(0, 20), level: +s.level || 1 } : null;
    },
    // Сохранение другого Ловчего (для профиля друга; взаимность проверяет GameCore)
    async friendSave(pid) {
      const p = must(await db.from('players').select('user_id').eq('pid', pid).maybeSingle());
      if (!p) return null;
      const s = must(await db.from('saves').select('data, updated_at').eq('user_id', p.user_id).maybeSingle());
      return s ? { data: s.data, seen: s.updated_at } : null;
    },
    async link(from, to, name, level) {
      must(await db.from('friend_links').upsert({ from_pid: from, to_pid: to, from_name: String(name).slice(0, 20), from_level: level, created_at: new Date().toISOString() }, { onConflict: 'from_pid,to_pid' }));
    },
    async linksTo(pid) { return must(await db.from('friend_links').select('from_pid, from_name, from_level, created_at').eq('to_pid', pid).limit(200)) || []; },
    async giftsTo(pid) {
      return must(await db.from('gifts').select('id, from_pid, from_name, created_at').eq('to_pid', pid).is('opened_at', null).order('created_at').limit(50)) || [];
    },
    async giftCreate(from, to, name, contents) { must(await db.from('gifts').insert({ from_pid: from, to_pid: to, from_name: String(name).slice(0, 20), contents })); },
    async gift(id) { return UUID.test(id) ? must(await db.from('gifts').select('*').eq('id', id).maybeSingle()) : null; },
    async giftTake(id, pid) {
      const rows = must(await db.from('gifts').update({ opened_at: new Date().toISOString() }).eq('id', id).eq('to_pid', pid).is('opened_at', null).select('id'));
      return rows && rows.length > 0;
    },
    async tradeCreate(code, pid, name, spirit) { must(await db.from('trades').insert({ code, from_pid: pid, from_name: String(name).slice(0, 20), spirit })); },
    async tradeTake(code, pid) {
      const t = must(await db.from('trades').select('*').eq('code', code).maybeSingle());
      if (!t || t.taken_by) return null;
      if (t.from_pid === pid) return { own: true };
      const rows = must(await db.from('trades').update({ taken_by: pid, taken_at: new Date().toISOString() }).eq('code', code).is('taken_by', null).select('code'));
      return rows && rows.length ? t : null;
    },
    async mySubmissions() {
      return must(await db.from('poi_submissions').select('id, name, status, reason').eq('user_id', uid).order('created_at', { ascending: false }).limit(50)) || [];
    },
    async leagueScore(x) {
      must(await db.from('league_scores').upsert({ user_id: uid, season: x.season, name: String(x.name).slice(0, 20), stars: Math.min(1000, x.stars), rank: x.rank,
        level: x.level, look: x.look, updated_at: new Date().toISOString() }, { onConflict: 'user_id,season' }));
    },
    // Общее дело Ордена: вклад игрока за неделю (n только растёт) и итоги недели
    async orderPut(x) {
      must(await db.from('order_players').upsert({ week: x.week, pid: x.pid, name: String(x.name).slice(0, 20), n: Math.min(1e6, x.n), updated_at: new Date().toISOString() }, { onConflict: 'week,pid' }));
    },
    async orderStats(week, pid) { return must(await db.rpc('order_stats', { p_week: week, p_pid: pid })); },
    async deleteSave() {
      must(await db.from('saves').delete().eq('user_id', uid));
      must(await db.from('save_srv').delete().eq('user_id', uid));
    },
  };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply({ ok: false, error: 'POST only' }, 405);
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const who = token ? (await db.auth.getUser(token)).data : null;
  if (!who || !who.user) return reply({ ok: false, error: 'Нужен вход в игру', auth: true }, 401);
  const uid = who.user.id;
  let body;
  try { body = await req.json(); } catch { return reply({ ok: false, error: 'Некорректный запрос' }, 400); }
  if (verCmp(body.v, GameCore.MIN_CLIENT) < 0) return reply({ ok: false, upgrade: true, error: 'Вышла новая версия игры — обнови её' });
  const env = makeEnv(uid);

  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const row = must(await db.from('saves').select('data, rev, moved_to').eq('user_id', uid).maybeSingle());
      if (row && row.moved_to) return reply({ ok: false, moved: true, error: 'Прогресс перенесён на другое устройство' });
      const srvRow = must(await db.from('save_srv').select('srv').eq('user_id', uid).maybeSingle());
      const res = await exclusive(() => GameCore.run(body, { data: row ? row.data : null, srv: srvRow ? srvRow.srv : {} }, env));
      if (!res.ok) return reply({ ok: false, error: res.error, rev: row ? row.rev : 0 });

      let rev = row ? row.rev : 0;
      if (res.reset) return reply({ ok: true, reset: true, results: res.results, events: [], now: res.now });
      if (res.data) {
        if (!row) {
          const ins = await db.from('saves').insert({ user_id: uid, data: res.data, rev: 1, app_version: String(body.v || '').slice(0, 20) });
          if (ins.error) { if (/duplicate/i.test(ins.error.message)) continue; throw new Error(ins.error.message); }
          rev = 1;
        } else {
          const upd = must(await db.from('saves').update({ data: res.data, rev: row.rev + 1, app_version: String(body.v || '').slice(0, 20), updated_at: new Date().toISOString() })
            .eq('user_id', uid).eq('rev', row.rev).select('rev'));
          if (!upd || !upd.length) continue; // прогресс изменился параллельно (второе устройство) — повторим
          rev = row.rev + 1;
        }
      }
      must(await db.from('save_srv').upsert({ user_id: uid, srv: res.srv, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }));
      for (const fn of res.after) { try { await fn(); } catch (e) { console.error('после сохранения:', String(e)); } }
      // разница — только если телефон знает предыдущую версию прогресса
      const patch = !res.full && row && body.rev === row.rev ? Diff.make(row.data, res.data) : null;
      return reply({ ok: true, rev, patch, data: patch ? undefined : res.data, results: res.results, events: res.events, now: res.now });
    }
    return reply({ ok: false, error: 'Сервер занят — повтори действие' });
  } catch (e) {
    console.error(String(e && e.stack || e));
    return reply({ ok: false, error: 'Ошибка сервера — попробуй ещё раз' }, 500);
  }
});
