// @ts-nocheck
// Духолов: сервер игры (Supabase Edge Function «game»). ФАЙЛ СОБРАН АВТОМАТИЧЕСКИ tools/build-server.ps1
// из общих модулей игры (www/js) и server/game — не правьте его вручную.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { AsyncLocalStorage } from 'node:async_hooks';

// Заглушки браузерного окружения: на сервере нет карты, звука и окон
const DEV = false;
const APP_VERSION = '4.14.1';
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

  // ---------- 4.0 «Осень Нави»: дубовое семейство, Самоварник, осенняя Листопадница и легенда четвёртой книги ----------
  { id: 'zheludok', name: 'Желудок', el: 'forest', rar: 1, stage: 1, fam: 'zheludok', evo: 'dubovik', cost: 25, base: [110, 116, 118],
    desc: 'Скатился с дуба прямо в городской сквер. Мечтает вырасти большим и сильным, а пока катается по дорожкам и прячется в листве.',
    look: { shape: 'round', c1: '#d9a066', c2: '#7c4a1d', c3: '#a3e635', eyes: 'round', mouth: 'smile', back: [], feats: ['acorn', 'cheeks'] } },
  { id: 'dubovik', name: 'Дубовик', el: 'forest', rar: 2, stage: 2, fam: 'zheludok', evo: 'dubynya', cost: 100, base: [158, 170, 160],
    desc: 'Подросший Желудок. Кора у него крепкая, как кольчуга, а в дупле хранится запас желудей на чёрный день.',
    look: { shape: 'tall', c1: '#a16207', c2: '#422006', c3: '#84cc16', eyes: 'angry', mouth: 'smile', back: ['antlers'], feats: ['leaves', 'beard'] } },
  { id: 'dubynya', name: 'Дубыня', el: 'forest', rar: 3, stage: 3, fam: 'zheludok', base: [226, 232, 204],
    desc: 'Богатырь-дубодёр из былин. Выворачивает с корнем деревья, сломанные бурей, и сажает на их место новые.',
    look: { shape: 'robe', c1: '#854d0e', c2: '#3f2a14', c3: '#65a30d', eyes: 'angry', mouth: 'none', back: ['aura', 'antlers'], feats: ['beard', 'leaves', 'runes'] } },
  { id: 'samovarnik', name: 'Самоварник', el: 'fire', rar: 3, stage: 1, fam: 'samovarnik', base: [196, 192, 196],
    desc: 'Дух бабушкиного самовара. Где он пыхтит — там чай с пряниками и разговоры до полуночи. Не любит, когда пьют из пакетиков.',
    look: { shape: 'box', c1: '#fbbf24', c2: '#92400e', c3: '#ef4444', eyes: 'round', mouth: 'smile', back: ['steam', 'handles'], feats: ['cheeks'] } },
  { id: 'listopadnica', name: 'Листопадница', el: 'wind', rar: 3, stage: 1, fam: 'listopadnica', base: [198, 176, 188], season: 'autumn',
    desc: 'Осенний дух листопада. Кружит жёлтые листья над дворами, а на Покров укрывает землю первым инеем. Появляется только осенью.',
    look: { shape: 'ghost', c1: '#fdba74', c2: '#c2410c', c3: '#facc15', eyes: 'sleepy', mouth: 'smile', back: ['hair', 'aura'], feats: ['leaves', 'cheeks'] } },
  { id: 'svyatogor', name: 'Святогор', el: 'forest', rar: 5, stage: 1, fam: 'svyatogor', legend: true, story: true, base: [302, 252, 262],
    desc: 'Легенда. Богатырь, которого не держит мать сыра земля. Спит в Святых горах и встаёт, только когда Руси грозит беда.',
    look: { shape: 'robe', c1: '#94a3b8', c2: '#1e293b', c3: '#fbbf24', eye: '#fde047', eyes: 'glow', mouth: 'none', back: ['aura', 'halo'], feats: ['beard', 'crown', 'runes'] } },
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
// Опыт на уровень n. До 10 уровня — прежняя пологая кривая (новичок растёт быстро), дальше каждый уровень
// на 17% дороже предыдущего: 20 ≈ 90 тыс., 30 ≈ 430 тыс., 40 ≈ 2,1 млн (3.19: раньше 40 уровень был за 243 тыс. —
// одна Летопись давала почти весь путь, игроки доходили до потолка за пару недель)
function levelXPOld(n) { return n <= 1 ? 0 : Math.round(400 * Math.pow(n - 1, 1.75) / 50) * 50; }
function levelXP(n) { return n <= 10 ? levelXPOld(n) : Math.round(levelXPOld(10) * Math.pow(1.17, n - 10) / 50) * 50; }
const MAX_LEVEL = 40;

const QUEST_TEMPLATES = [
  { t: 'catch',   min: 5, max: 10, text: n => `Поймай ${n} духов`,                 reward: { charm: 8, sparks: 300 } },
  { t: 'catchEl', min: 2, max: 3,  text: (n, el) => `Поймай ${n} духов стихии «${ELEMENTS[el].name}»`, reward: { honey: 3, sparks: 400 } },
  { t: 'spring',  min: 3, max: 5,  text: n => `Зачерпни силы из ${n} родников`,     reward: { charm: 5, water: 2 } },
  { t: 'throw',   min: 2, max: 4,  text: n => `Сделай ${n} отличных бросков`,       reward: { honey: 2, sparks: 300 } },
  { t: 'walk',    min: 1, max: 2,  text: n => `Пройди ${n} км`,                     reward: { charm: 10, sparks: 500 } },
  { t: 'power',   min: 2, max: 4,  text: n => `Усиль духов ${n} ${U.plural(n, "раз", "раза", "раз")}`,            reward: { water: 3, sparks: 200 } },
  { t: 'evolve',  min: 1, max: 1,  text: () => `Преврати одного духа`,              reward: { incense: 1 } },
  { t: 'raid',    min: 1, max: 1,  text: () => `Закрой разлом`,                     reward: { charm2: 5, sparks: 800 } },
];

/* ---------- Поручения из родников (3.2): задание → встреча с духом ---------- */
// tier: 1 — лёгкое (обычные и необычные духи), 2 — среднее (необычные и редкие), 3 — трудное (редкие и эпические)
const TASK_TEMPLATES = [
  { t: 'catch',    tier: 1, min: 5, max: 8, text: n => `Поймай ${n} духов` },
  { t: 'spring',   tier: 1, min: 3, max: 5, text: n => `Зачерпни силы из ${n} родников` },
  { t: 'power',    tier: 1, min: 3, max: 5, text: n => `Усиль духов ${n} ${U.plural(n, "раз", "раза", "раз")}` },
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
  { id: 'trade',   name: 'Щедрая душа',   desc: 'Купи или продай духов на Аукционе',     stat: 'traded',      tiers: [1, 10, 50] },
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
    reward: { charm2: 10, honey: 10, sparks: 5000, xp: 15000 },
    outro: '«Родники раздают поручения — значит, они нас зовут, — Велимир складывает письма в Летопись. — Кто-то под землёй очень хочет, чтобы мы шли дальше».' },
  { title: 'Знамя над капищем',
    intro: 'Дружины Сокола, Медведя и Волка спорят за капища, как когда-то князья за города. Велимир хмурится: «Спорьте, но помните — капище стоит, пока его кто-то бережёт».',
    steps: [{ t: 'duel', n: 5 }, { t: 'defend', n: 2 }, { t: 'throw', n: 15 }],
    reward: { charm3: 5, water: 10, sparks: 6000, xp: 15000 },
    outro: 'Над капищем, где стоит твой защитник, ветер треплет знамя дружины. «Хорошо, — говорит Велимир. — Теперь капище знает твоё имя».' },
  { title: 'Дух родной земли',
    intro: 'В старых записях Ордена сказано: у каждого края есть свой дух-хранитель — Берегиня, Сполох, Жигуль, Тур, Хозяйка Медной горы, Бабр и Кутх. «Найди своего, — говорит Велимир. — Земля должна тебя признать».',
    steps: [{ t: 'land', n: 1 }, { t: 'catch', n: 50 }, { t: 'photo', n: 3 }],
    reward: { incense: 3, charm2: 15, sparks: 7000, xp: 20000 },
    outro: 'Дух родной земли посмотрел на тебя долго и серьёзно, будто сверял с кем-то давно знакомым. А потом позволил сфотографировать себя — в Летописи это считается знаком доверия.' },
  { title: 'Долгая дорога',
    intro: 'Родники шепчут одно и то же слово: «ниже». Велимир достаёт карту подземных рек — старую, ещё дореволюционную. «Они текут под всей страной. Чтобы услышать их, придётся много ходить».',
    steps: [{ t: 'walk', n: 20 }, { t: 'hatch', n: 5 }, { t: 'task', n: 5 }],
    reward: { charm3: 8, sparks: 8000, xp: 20000 },
    outro: 'Коконы, что ты носил в пути, вылупились с каплями воды на крыльях. «Подземная вода, — шепчет Велимир. — Мы близко».' },
  { title: 'Подземные реки',
    intro: 'Прислужники Нави перекрывают родники: хотят, чтобы подземные реки остановились и Навь затопила Явь. Духи воды тревожатся и собираются у фонтанов.',
    steps: [{ t: 'catchEl', el: 'water', n: 20 }, { t: 'invasion', n: 8 }, { t: 'purify', n: 3 }],
    reward: { water: 15, incense: 3, sparks: 10000, xp: 25000 },
    outro: 'Из-под земли донёсся гул, похожий на дыхание огромного зверя. Родники вздрогнули и снова забили ключом. «Он проснулся», — только и сказал Велимир.' },
  { title: 'Индрик-зверь',
    intro: '«Индрик-зверь всем зверям отец, — читает Велимир из Голубиной книги. — Ходит под землёю, как солнце по небу, прочищает реки и ручьи». Чтобы он поднялся в Явь, нужны сила разломов, мастерство Лиги и знамёна дружин.',
    steps: [{ t: 'raid', n: 8 }, { t: 'league', n: 6 }, { t: 'defend', n: 5 }],
    reward: { charm3: 15, incense: 3, sparks: 15000, xp: 30000 }, gift: 'indrik', emblem: 'horn',
    outro: 'Земля мягко качнулась, и у ближайшего родника поднялся зверь с единственным рогом, сияющим, как лёд на солнце. Он опустил голову, и родник под ним засмеялся звонко, по-весеннему. <br><br><i>Конец третьей книги. Эмблема «Рог Индрика» открыта в облике Ловчего.</i>' },

  // ---------- Книга четвёртая «Осень Нави» (4.0) ----------
  { title: 'Дубовая роща',
    intro: 'Индрик ушёл под землю, а в скверах вдруг зашуршали Желудки — сотни круглых духов в шапочках. «Они не просто так проросли, — говорит Велимир, пересчитывая жёлуди в ладони. — Старые дубы помнят богатырей. Кто-то их будит».',
    steps: [{ t: 'catchEl', el: 'forest', n: 15 }, { t: 'evolve', n: 3 }, { t: 'walk', n: 10 }],
    reward: { charm2: 15, honey: 10, sparks: 8000, xp: 20000 },
    outro: 'Самый старый Дубыня в роще склонил перед тобой ветви. «Святогор ворочается во сне, — прогудел он. — Горы трещат. Скоро и в городе почувствуют».' },
  { title: 'Покровские туманы',
    intro: 'Над городом легли туманы — густые, как молоко. Листопадницы кружат над дворами, а прислужники Нави прячутся в тумане у самых родников. «Покров должен укрыть землю, а не Навь», — хмурится Велимир.',
    steps: [{ t: 'spring', n: 30 }, { t: 'invasion', n: 6 }, { t: 'catch', n: 60 }],
    reward: { charm3: 8, water: 10, sparks: 10000, xp: 25000 },
    outro: 'Туман рассеялся к утру, и на каждой крыше лежал тонкий иней — ровный, как вышивка. «Первый снег, — улыбнулся Велимир. — Значит, Покров за нас».' },
  { title: 'Святогор',
    intro: '«Святогора не держит земля, — читает Велимир из старой былины. — Но если весь Орден встанет рядом, он сможет подняться». Нужна сила разломов, капищ и Лиги — всего, чему ты научился.',
    steps: [{ t: 'raid', n: 10 }, { t: 'duel', n: 10 }, { t: 'league', n: 8 }],
    reward: { charm3: 20, incense: 5, sparks: 20000, xp: 40000 }, gift: 'svyatogor', emblem: 'oak',
    outro: 'Земля загудела, как колокол, и над окраиной поднялся богатырь ростом с телебашню — а потом стал маленьким, как все духи, и шагнул к тебе. «Спасибо, что разбудил, Ловчий, — сказал Святогор. — Теперь я постою за Русь рядом с тобой».' },
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
  pokrov:      { name: 'Покров', desc: 'Первые туманы и иней: духи Ветра и Воды встречаются чаще, Листопадница — повсюду, в родниках больше добычи.', el: ['wind', 'water'], loot: 1.5, seasonal: ['listopadnica'] },
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
    // 3.12: из Лавки Ордена (за златники) и с Золотой тропы — открываются покупкой, а не уровнем
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
    { id: 'oak', name: 'Дубовый венок', lvl: 1, story: 21 }, // 4.0: за четвёртую книгу Летописи
    { id: 'trail', name: 'Знак Тропы', lvl: 1, pass: true },
  ],
  // 4.6: облики-скины — полный наряд Ловчего (рисунки — js/skins-art.js); покупаются в Гардеробе за златники.
  // rar: 0 — обычный, 1 — редкий, 2 — эпический, 3 — легендарный. Глаза и эмблема видны у всех обликов, цвет плаща — только у обычного
  skin: [
    { id: 'hood', name: 'Ловчий', rar: 0, desc: 'Плащ Ордена Оберега — с него начинает каждый Ловчий.' },
    { id: 'kupala', name: 'Купальский', rar: 1, shop: 300, desc: 'Венок с цветком папоротника, что расцветает лишь в Купальскую ночь.' },
    { id: 'leshiy', name: 'Лесной', rar: 1, shop: 300, desc: 'Капюшон из мха и оленьи рога — леса признают тебя своим.' },
    { id: 'moroz', name: 'Морозный', rar: 1, shop: 400, desc: 'Ледяной венец и иней на плаще. Подарок самого Морозко.' },
    { id: 'volhv', name: 'Волхв', rar: 2, shop: 450, desc: 'Шапка с рунами и посох с огоньком: мудрость старых волхвов.' },
    { id: 'bogatyr', name: 'Богатырь', rar: 2, shop: 500, desc: 'Шелом, кольчуга и алое корзно — хоть сейчас на заставу.' },
    { id: 'voron', name: 'Вороний', rar: 2, shop: 550, desc: 'Маска-клюв и плащ из чёрных перьев. Вороны Нави шепчут тебе вести.' },
    { id: 'navstrazh', name: 'Навий страж', rar: 2, shop: 650, desc: 'Рогатая личина и пламя Нави. Духи расступаются перед тобой.' },
    { id: 'zharpero', name: 'Жар-перо', rar: 3, shop: 900, desc: 'Убор из огненных перьев Жар-птицы. Светится даже в самую тёмную ночь.' },
    { id: 'knyaz', name: 'Княжий', rar: 3, shop: 1000, desc: 'Княжья шапка с соболем и самоцветами — наряд первых Ловчих Ордена.' },
  ],
  // 4.6: фон и рамка карточки Ловчего (её видят все) — тоже в Гардеробе (рисунки — js/looks-art.js). lvl — открывается уровнем, shop — цена в златниках
  bg: [
    { id: 'night', name: 'Ночь', rar: 0, lvl: 1 },
    { id: 'dusk', name: 'Сумерки', rar: 0, lvl: 5 },
    { id: 'stars', name: 'Звездопад', rar: 0, lvl: 12 },
    { id: 'aurora', name: 'Северное сияние', rar: 1, shop: 250 },
    { id: 'fern', name: 'Купальская ночь', rar: 1, shop: 300 },
    { id: 'embers', name: 'Жар', rar: 1, shop: 300 },
    { id: 'frost', name: 'Иней', rar: 1, shop: 300 },
    { id: 'moon', name: 'Навья луна', rar: 2, shop: 400 },
    { id: 'khokhloma', name: 'Золотая роспись', rar: 2, shop: 500 },
    { id: 'gate', name: 'Врата Нави', rar: 3, shop: 650 },
  ],
  frame: [
    { id: 'none', name: 'Без рамки', rar: 0, lvl: 1 },
    { id: 'ring', name: 'Золотая кайма', rar: 0, lvl: 3 },
    { id: 'rune', name: 'Рунная кайма', rar: 0, lvl: 15 },
    { id: 'oak', name: 'Дубовый венок', rar: 1, shop: 250 },
    { id: 'ice', name: 'Ледяной узор', rar: 1, shop: 300 },
    { id: 'flame', name: 'Огненная кайма', rar: 1, shop: 350 },
    { id: 'pearl', name: 'Жемчужная', rar: 2, shop: 350 },
    { id: 'serpent', name: 'Змей-уроборос', rar: 2, shop: 450 },
    { id: 'thorn', name: 'Навий шип', rar: 2, shop: 500 },
    { id: 'knyaz', name: 'Княжий оклад', rar: 3, shop: 800 },
  ],
};
const SKIN_RAR = [{ name: 'Обычный', c: '#c4b5fd' }, { name: 'Редкий', c: '#38bdf8' }, { name: 'Эпический', c: '#c084fc' }, { name: 'Легендарный', c: '#fbbf24' }];

MEDALS.splice(4, 0, { id: 'duels', name: 'Поединщик', desc: 'Победи хранителей капищ', stat: 'duels', tiers: [5, 50, 300] });
QUEST_TEMPLATES.push({ t: 'duel', min: 1, max: 2, text: n => `Победи хранителей капищ: ${n}`, reward: { charm2: 4, sparks: 600 } });

/* ---------- 4.0: «Посвящение в Ловчие» — обучение ----------
   Пропустить нельзя: шаги ведёт сервер (S.d.tut — номер текущего шага, 0 — пройдено), после перезахода игра
   продолжает с того же места. kind: talk — сцена с Велимиром; ui — открыть раздел; catch — поймать учебного
   духа (sid); spring — зачерпнуть из родника; power — усилить духа. За каждую главу — награда. */
const TUT_CHAPTERS = [
  { title: 'Тонкая ночь',     reward: { charm: 5, sparks: 200, xp: 100 } },
  { title: 'Первый дух',      reward: { charm: 10, honey: 3, sparks: 300, xp: 300 } },
  { title: 'Твои духи',       reward: { sparks: 500, xp: 300 } },
  { title: 'Родники',         reward: { charm: 15, water: 3, xp: 400 } },
  { title: 'Дорога Ловчего',  reward: { incense: 1, sparks: 500, xp: 400 } },
  { title: 'Клятва Ордена',   reward: { charm: 20, honey: 5, water: 3, sparks: 1000, zlat: 20, xp: 1000 } },
];
const TUT = [
  { ch: 0, kind: 'talk', id: 'meet', lines: [
    ['n', 'Ночь. Пустой двор. Фонарь над подъездом мигает, хотя ветра нет.'],
    ['n', 'В луже у бордюра что-то светится — и смотрит на тебя.'],
    ['v', 'Не бойся. Раз ты их видишь — значит, ты из наших.'],
    ['v', 'Меня зовут <b>Велимир</b>. Я старший Ловчий <b>Ордена Оберега</b>. Мы бережём границу между Явью — нашим миром — и Навью, миром духов.'],
    ['you', 'Духов? Каких ещё духов?'],
    ['v', 'Тех, что прячутся в проводах, лужах и старых фонарях. В <b>Тонкую ночь</b> граница истончилась — и они хлынули в город.'] ] },
  { ch: 0, kind: 'talk', id: 'lore', lines: [
    ['v', 'Духи не злые. Они растерялись: Навь тянет их обратно, а здесь им холодно и страшно.'],
    ['v', 'Ловчий ловит духа <b>оберегом</b> — узелком с заговорённой травой. С тобой дух окрепнет и станет другом.'],
    ['v', 'Но есть и те, кого Навь уже омрачила. Они бродят в <b>разломах</b>. А за всем этим стоит <b>Кощей</b>…'],
    ['you', 'И что мне делать?'],
    ['v', 'Учиться. Посвящение займёт немного времени, но пропустить его нельзя — Орден не пускает на улицы неподготовленных.'],
    ['v', 'Смотри: рядом с тобой уже появился дух. Начнём!'] ] },
  { ch: 1, kind: 'catch', id: 'catch1', sid: 'vayfayka', hint: 'Рядом появился дух — видишь светящийся круг на карте? <b>Коснись духа</b>, а потом <b>смахни оберег вверх</b>, прямо в него.' },
  { ch: 1, kind: 'talk', id: 'ring', lines: [
    ['v', 'Поймал! Для первого раза — отлично.'],
    ['v', 'Видел кольцо вокруг духа? Оно сжимается. Бросай, когда кольцо <b>маленькое</b> — выйдет «Отлично!»: больше опыта и выше шанс поймать.'],
    ['v', 'Цвет кольца — это нрав духа: <b>зелёный</b> — покладистый, <b>красный</b> — упрямый. Упрямым помогают мёд и серебряные обереги.'],
    ['v', 'Ещё один дух ждёт неподалёку. Попробуй попасть в маленькое кольцо!'] ] },
  { ch: 1, kind: 'catch', id: 'catch2', sid: 'mshonok', hint: 'Второй учебный дух рядом. Коснись его и <b>дождись, пока кольцо станет маленьким</b> — тогда бросай!' },
  { ch: 2, kind: 'ui', id: 'menu', info: 'Это меню Ордена — здесь все разделы. Пока открыто не всё: разделы откроются по ходу посвящения, подсвеченный — следующий.', hint: 'Каждый пойманный дух — твой. Открой <b>меню</b> — золотой оберег внизу экрана.' },
  { ch: 2, kind: 'ui', id: 'spirits', info: 'Это твоя коллекция — все пойманные духи. Сверху — сортировка по силе, новизне и имени и фильтр по стихиям.', hint: 'Это разделы Ордена. Открой <b>«Духи»</b> — там твоя коллекция.' },
  { ch: 2, kind: 'ui', id: 'card', info: 'Это карточка духа: сила, стихия, приёмы и семейство. Ниже — кнопки «Усилить» и «Превратить», а ещё можно сделать духа спутником.', hint: 'Коснись любого духа, чтобы открыть его <b>карточку</b>.' },
  { ch: 2, kind: 'power', id: 'power', hint: 'На карточке — сила духа. Нажми <b>«Усилить»</b>: за искры и эссенцию дух станет сильнее. Эссенцию приносят поимки духов того же семейства.' },
  { ch: 2, kind: 'ui', id: 'dex', info: 'Бестиарий — все виды духов. Пойманные видны целиком, встреченные — тенью. Коснись вида, чтобы прочитать о нём.', hint: 'Теперь загляни в <b>«Бестиарий»</b> (меню) — там все виды духов. Сколько найдёшь ты?' },
  { ch: 3, kind: 'talk', id: 'springs', lines: [
    ['v', 'Обереги тратятся быстро. Пополняют их <b>родники</b> — старые колодцы, где бьёт живая сила.'],
    ['v', 'Родники стоят у настоящих мест: памятников, фонтанов, храмов, арт-объектов. На карте это синие колодцы со столбом света.'],
    ['v', 'Из родника выпадают обереги, мёд, живая вода, а иногда — <b>коконы</b> с духами внутри.'],
    ['v', 'Стрелка вверху экрана покажет дорогу к ближайшему. Пойдём, прогуляемся!'] ] },
  { ch: 3, kind: 'spring', id: 'spring', hint: 'Иди к роднику по <b>стрелке вверху</b> и коснись его, когда подойдёшь. Родники есть почти в каждом районе — если рядом нет, прогуляйся.' },
  { ch: 3, kind: 'ui', id: 'bag', info: 'Сумка: обереги, мёд, живая вода и ладан. Сверху видно, сколько ещё поместится; лишнее можно выбросить.', hint: 'Добыча уже в <b>Сумке</b>. Открой меню → «Сумка» и посмотри, что у тебя есть.' },
  { ch: 4, kind: 'talk', id: 'road', lines: [
    ['v', 'Ловчий — это ходок. Каждый пройденный шаг идёт в дело.'],
    ['v', 'Твой первый дух идёт рядом с тобой — это <b>спутник</b>. В пути он находит эссенцию.'],
    ['v', '<b>Коконы</b> греются шагами: пройдёшь нужное расстояние — и из кокона вылупится дух.'],
    ['v', 'Каждый день Орден даёт <b>задания</b>, а в <b>Летописи</b> записана наша история — глава за главой.'] ] },
  { ch: 4, kind: 'ui', id: 'cocoons', info: 'Коконы греются шагами — одновременно можно греть три. Готовый кокон вылупится одним касанием.', hint: 'Открой меню → <b>«Коконы»</b>. Первый кокон уже греется — пройди 2 км, и он вылупится.' },
  { ch: 4, kind: 'ui', id: 'quests', info: 'Здесь задания дня — они обновляются в полночь. Вкладка «Летопись» — сюжет Ордена: главы с наградами и легендарными духами.', hint: 'Открой <b>«Задания»</b> — там задания дня и Летопись Ордена.' },
  { ch: 4, kind: 'ui', id: 'path', info: 'Путь Ловчего: что откроется на каждом уровне и какие награды ждут. Звания растут: Послушник, Ловчий, Следопыт, Ведун, Хранитель.', hint: 'И последнее: открой <b>«Путь»</b> в меню — там видно, что откроется на каждом уровне Ловчего.' },
  { ch: 5, kind: 'talk', id: 'oath', lines: [
    ['v', 'Ты поймал первых духов, нашёл родник и знаешь, куда идти дальше.'],
    ['v', 'Впереди — капища предков, разломы с боссами, Лига и дружины. Всё откроется, когда будешь готов.'],
    ['v', 'Повторяй за мной — это клятва Ордена.'],
    ['you', '<b>Беречь духов. Беречь границу. Беречь друг друга.</b>'],
    ['v', 'Добро пожаловать в Орден Оберега, Ловчий. Держи — это твоё первое снаряжение.'] ] },
];

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
  // Случайный код из криптостойкого генератора (коды посылок и комнат нельзя предсказать по уже виденным). 32 символа алфавита делят 256 — без перекоса
  code(n, alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789') { const b = new Uint8Array(n); crypto.getRandomValues(b); return Array.from(b, x => alpha[x % alpha.length]).join(''); },

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
      ['pokrov', day(10, 12), day(10, 17)], // 4.0: Покров день — 14 октября
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

  // Сезонные духи: зимние — с декабря по февраль и на Святки, Купалинка — летом и на Купалу, осенние — с сентября по ноябрь
  seasonal(s) {
    if (!s.season) return 1;
    const h = this.hol, m = this.month();
    const boosted = h && h.seasonal && h.seasonal.includes(s.id);
    if (boosted) return 6;
    if (s.season === 'winter') return m === 11 || m <= 1 ? 1 : 0;
    if (s.season === 'kupala') return m === 5 || m === 6 ? 0.6 : 0;
    if (s.season === 'autumn') return m >= 8 && m <= 10 ? 0.6 : 0; // 4.0: Листопадница — с сентября по ноябрь
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
  // Край России (для духов родных земель) — грубо, по широте и долготе
  land(lat, lng) {
    if (lat >= 64) return 'north';
    if (lng >= 105) return 'fareast';
    if (lng >= 66) return 'siberia';
    if (lng >= 55) return 'ural';
    if (lat < 46.5 && lng >= 36) return 'caucasus';
    if (lng >= 44) return 'volga';
    return 'center';
  },
  // региональные духи водятся только в своей части света, духи земель — только в своём краю
  local(s, lng = MapView.pos ? MapView.pos.lng : 37, lat = MapView.pos ? MapView.pos.lat : 55.75) {
    return (!s.region || s.region === this.region(lng)) && (!s.land || s.land === this.land(lat, lng));
  },

  pickSpecies(r, biome, night, lng, lat) {
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
    const pool = SPECIES.filter(s => s.el === el && !s.legend && this.local(s, lng, lat)).map(s => {
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
      const sid = this.pickSpecies(r, this.biome(pLat, pLng), night, pLng, pLat);
      const boost = Sky.boosted(SP[sid].el);
      const maxL = Math.min(Math.min(30, S.d.level + 2) + (boost ? 5 : 0), S.maxLvl()); // погода: сильнее, но не выше доступного уровня
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
    if (tier === 3) pool = SPECIES.filter(s => s.legend && !s.story && (!Ev.hol || !Ev.hol.koschey || s.id === 'koschey')); // легенды Летописи — только в награду
    else if (tier === 2) pool = SPECIES.filter(s => !s.legend && s.rar >= 3 && this.local(s, p.lng, p.lat) && Ev.seasonal(s) > 0);
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
    const hold = typeof Clans !== 'undefined' ? Clans.info(id) : null; // на сервере сводки нет — он спрашивает базу сам
    return { type: 'shrine', id, tier, name: p.name, god, photo: p.photo, lat: p.lat, lng: p.lng, d, won: S.d.shrines[id] === U.today(), clan: hold ? hold.clan : null };
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
    const pool = SPECIES.filter(s => s.el === el && !s.legend && !s.region && !s.land && !s.season && s.rar <= 3);
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
    const pool = SPECIES.filter(s => !s.legend && !s.region && !s.land && !s.season && rars.includes(s.rar) && s.stage <= maxStage);
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
    d.guards = d.guards || []; // мои защитники на Капищах: { id, name, sid, t }
    // златники — вторая валюта (с 3.14; в 3.12–3.13 назывались гривнами — переносим один к одному)
    d.zlat = (d.zlat || 0) + (d.grivna || 0); delete d.grivna;
    // 3.19: новая кривая опыта — опыт переносится в то же место внутри текущего уровня (уровень не понижается)
    if (!d.xpv) {
      const L = d.level || 1;
      if (L >= MAX_LEVEL) d.xp = Math.max(d.xp || 0, levelXP(MAX_LEVEL));
      else if (L >= 10) {
        const o0 = levelXPOld(L), o1 = levelXPOld(L + 1), n0 = levelXP(L), n1 = levelXP(L + 1);
        const f = U.clamp(((d.xp || 0) - o0) / (o1 - o0), 0, 0.999);
        d.xp = Math.round(n0 + f * (n1 - n0));
      }
      d.xpv = 2;
    }
    d.bagExtra = d.bagExtra || 0; // расширения сумки из Лавки: +50 мест каждое
    d.owned = d.owned || {}; // купленный облик: цвет плаща или id эмблемы → true
    d.shop = d.shop || {}; // Лавка: { deal: день покупки товара дня }
    d.pass = d.pass || null; // Сезонная тропа: { season, pts, gold, got: { free: [], gold: [] } }
    if (!d.pid) d.pid = U.uid() + U.uid();
    d.look = Object.assign({ cloak: '#6d28d9', eyes: '#5eead4', emblem: 'charm' }, d.look || {});
    d.stats.byEl = d.stats.byEl || {};
    d.items = d.items || {}; d.essence = d.essence || {}; d.dex = d.dex || {};
    d.spirits = d.spirits || []; d.cocoons = d.cocoons || []; d.springs = d.springs || {}; d.rifts = d.rifts || {}; d.caught = d.caught || {};
    d.medals = d.medals || {};
    d.story = d.story || { ch: 0, p: [0, 0, 0] };
    // 4.0: обучение стало длиннее — шаги прежнего (1 поймать, 2 родник, 3 меню) переводятся в новые
    if (d.tut && d.tutV !== 4) { d.tut = { 1: 1, 2: TUT.findIndex(s => s.id === 'springs') + 1, 3: TUT.findIndex(s => s.id === 'road') + 1 }[d.tut] || 1; d.tutV = 4; }
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
    this.d.tut = 1; this.d.tutV = 4; // обучение «Посвящение в Ловчие» (4.0)
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
      Bus.emit('buddyFind', `Спутник «${U.esc(sp.nick || s.name)}» принёс 3 эссенции${extra}!`);
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
    this.tutAdvance('power'); // 4.0: шаг обучения «Усиль духа»
    this.save();
    return true;
  },
  PURIFY: { sparks: 3000, essence: 25 }, // 3.19: было 1000 и 10 — дешевле, чем усилить духа до 25 уровня (16 800 ✦)
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
  bagLimit() { return BAG_LIMIT + (this.d.bagExtra || 0) * Rules.BAG_STEP; },
  bagCount() { return Object.values(this.d.items).reduce((a, b) => a + b, 0); },
  // over — награда за достижение (уровень, серия дней, задание, Летопись, Тропа, бой): кладётся и сверх лимита сумки,
  // иначе она молча пропадала бы. Добыча родника и находки спутника лимит соблюдают
  addItem(k, n = 1, over = false) {
    const room = over ? n : this.bagLimit() - this.bagCount();
    const add = Math.max(0, Math.min(n, room));
    this.d.items[k] = (this.d.items[k] || 0) + add;
    this.save();
    return add;
  },
  useItem(k) { if ((this.d.items[k] || 0) <= 0) return false; this.d.items[k]--; this.save(); return true; },
  giveRewards(rw, over = true) { // { charm: 5, sparks: 300, xp: 100 ... } → массив строк для показа; over — см. addItem
    const out = [];
    for (const [k, n] of Object.entries(rw)) {
      if (!n) continue;
      if (k === 'sparks') { this.d.sparks += n; out.push({ k, n, label: 'Искры' }); }
      else if (k === 'zlat') { this.d.zlat = (this.d.zlat || 0) + n; out.push({ k, n, label: 'Златники' }); }
      else if (k === 'xp') { out.push({ k, n: Math.round(n * Ev.xpMul()), label: 'Опыт' }); this.addXP(n); }
      else if (ITEMS[k]) { const a = this.addItem(k, n, over); if (a) out.push({ k, n: a, label: ITEMS[k].name }); }
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
    const r = { charm: 10 + l, honey: 3, water: 3, zlat: Rules.ZLAT.level };
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
    // из кокона — только первая стадия (3.19: раньше редкие коконы давали сразу превращённых духов)
    let pool = SPECIES.filter(s => !s.legend && s.rar === rar && s.stage === 1 && W.local(s) && !s.season && !s.story);
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
    const sps = SPECIES.filter(s => s.stage === 1 && !s.legend && !s.region && !s.land && !s.season && T.rar.includes(s.rar));
    return { id: U.uid(), t: q.t, n, el, p: 0, tier: q.tier, sid: sps[Math.floor(r() * sps.length)].id, text: q.text(n, el) };
  },


  /* ---------- 4.0: обучение «Посвящение в Ловчие» ---------- */
  tutAt() { return (this.d && this.d.tut && TUT[this.d.tut - 1]) || null; },
  // Шаг выполнен: kind — что сделал игрок, id — для сцен и разделов. В конце главы — её награда.
  tutAdvance(kind, id) {
    const st = this.tutAt();
    if (!st || st.kind !== kind || (id && st.id !== id)) return null;
    const next = TUT[this.d.tut], got = !next || next.ch !== st.ch ? this.giveRewards(TUT_CHAPTERS[st.ch].reward) : [];
    this.d.tut = next ? this.d.tut + 1 : 0;
    if (got.length) Bus.emit('tutChapter', { ch: st.ch, got, done: !next });
    this.save();
    return { got, done: !next };
  },
  /* ---------- Летопись ---------- */
  storyReady() {
    const ch = STORY[this.d.story.ch];
    return !!ch && ch.steps.every((s, i) => this.d.story.p[i] >= s.n);
  },
  claimStory() {
    const ch = STORY[this.d.story.ch];
    if (!ch || !this.storyReady()) return null;
    const got = this.giveRewards({ ...ch.reward, zlat: Rules.ZLAT.story });
    this.d.story = { ch: this.d.story.ch + 1, p: [0, 0, 0] };
    this.save();
    return { ch, got };
  },

  /* ---------- Знаки Ордена ---------- */
  medalValue(m) {
    const st = this.d.stats;
    if (m.stat === 'dex') return SPECIES.filter(s => this.d.dex[s.id] && this.d.dex[s.id].caught).length;
    if (m.stat === 'lands') return SPECIES.filter(s => s.land && this.d.dex[s.id] && this.d.dex[s.id].caught).length;
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
      case 'clan': return { ico: glyph('⚑', 'gold'), title: `Вступление: ${CLANS[e.clan] ? CLANS[e.clan].name : 'дружина'}`, sub: '' };
      case 'guardBack': return { ico: icon(e.sid), title: 'Защитник вернулся с Капища', sub: `${e.name || ''} · стоял ${e.hours} ч` };
      case 'defend': return { ico: icon(e.sid), title: `Защитник на Капище`, sub: e.name || '' };
      case 'shop': return { ico: glyph('☉', 'gold'), title: `Покупка в Лавке: ${e.name || ''}`, sub: '' };
      case 'passGold': return { ico: glyph('★', 'gold'), title: 'Открыта Золотая тропа', sub: e.season || '' };
      case 'exchange': return { ico: glyph('⇄', 'gold'), title: 'Обмен в Лавке', sub: `✦ ${U.fmtNum(e.sparks || 0)} → ${e.zlat || 0} златников` };
      case 'pay': return { ico: glyph('☉', 'gold'), title: 'Казна Ордена', sub: `+${e.zlat || 0} златников` };
      case 'auction': return { ico: glyph('⚖', 'gold'), title: e.dir === 'buy' ? `Куплен на аукционе: ${SP[e.sid] ? SP[e.sid].name : ''}` : e.dir === 'sold' ? `Продан на аукционе: ${SP[e.sid] ? SP[e.sid].name : ''}` : `Выставлен на аукцион: ${SP[e.sid] ? SP[e.sid].name : ''}`, sub: `${e.cur === 'zlat' ? '' : '✦ '}${U.fmtNum(e.price || 0)}${e.cur === 'zlat' ? ' златников' : ''}${e.who ? ' · ' + e.who : ''}` };
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
   Жетоны, звёзды и награды ведёт сервер (leagueStart / leagueEnd), телефон показывает бои.
   Экран (3.21): герб ранга и место в таблице, вкладки «Турнир», «Таблица» (живая, с текущими уровнями — leagueTop)
   и «Ранги»; строка таблицы открывает карточку Ловчего. */

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
  LEVEL: 5,    // с какого уровня Ловчего открыта Лига (проверяет сервер)
  carry: null, // раны духов между боями турнира (только на телефоне)
  tab: 'play',
  TABS: ['play', 'table', 'ranks'],

  season(d = U.local()) { return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; },
  seasonName() { return U.local().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' }).replace(/\s*г\.?$/, ''); },
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
  rwLine(i) { const x = LEAGUE_RANKS[i]; return x.reward ? UI.rwText(x.reward) + (i % 3 === 0 ? ' + амулет' : '') + (i === 9 ? ' + эмблема «Венец»' : '') : ''; },

  // Соперник: сила растёт с рангом, ориентир — средний уровень твоих трёх сильнейших.
  // Одинаков на телефоне и сервере: зависит от звёзд, номера боя и зерна турнира.
  opponent(k, L = this.view()) {
    const r = this.rank(L.stars), seed = L.run ? L.run.seed : 0;
    const rng = U.rng(`league:${L.season}:${L.stars}:${k}:${seed}`);
    const maxStage = r <= 2 ? 1 : r <= 5 ? 2 : 3, maxRar = r <= 2 ? 2 : r <= 5 ? 3 : 4;
    const pool = SPECIES.filter(s => !s.legend && !s.region && !s.land && !s.season && s.rar <= maxRar && s.stage <= maxStage);
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

  // «6 дн 11 ч», «5 ч 12 мин», «12 мин 05 с»
  left(ms) {
    const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60;
    return d ? `${d} дн ${h} ч` : h ? `${h} ч ${m} мин` : `${m} мин ${String(s % 60).padStart(2, '0')} с`;
  },
  toMidnight() { return 86400000 - U.local().getTime() % 86400000; },

  // Таблица сезона — только с сервера игры (текущие уровни и имена, коды для карточки)
  async top() {
    return Game.act('leagueTop', { board: Cfg.s.cloud !== false }); // таблицу напрямую не читает никто (3.23): только через сервер игры
  },

  screen() {
    Sfx.init();
    let L = this.view(), r = this.rank(L.stars);
    const next = LEAGUE_RANKS[r + 1], base = LEAGUE_RANKS[r].stars;
    const pips = next ? Array.from({ length: next.stars - base }, (_, i) => `<i class="${i < L.stars - base ? 'on' : ''}"></i>`).join('') : '';
    const scr = UI.screen('Лига Ордена', `
      <section class="lgx-hero r${r}">
        <div class="lgx-top"><span class="lgx-chip">Сезон · ${this.seasonName()}</span><span class="lgx-chip" title="До конца сезона">⏳ <b class="lgx-ends"></b></span></div>
        <div class="lgx-crest"><div class="lgx-hex r${r}"><span>${r + 1}</span></div></div>
        <div class="lgx-rank">${LEAGUE_RANKS[r].name}</div>
        <div class="lgx-place">${Cloud.enabled() ? 'Ищу тебя в таблице…' : ''}</div>
        ${next ? `<div class="lgx-pips">${pips}</div><small class="lgx-next">★ ${L.stars} · до ранга «${next.name}» ещё ${next.stars - L.stars} ★</small>`
          : `<small class="lgx-next">★ ${L.stars} · высший ранг Лиги!</small>`}
      </section>
      <div class="seg lgx-tabs"><button data-tab="play">Турнир</button><button data-tab="table">Таблица</button><button data-tab="ranks">Ранги</button></div>
      <div class="lgx-pane"></div>`, 'league-screen');
    const body = scr.querySelector('.screen-body'), pane = scr.querySelector('.lgx-pane');
    let data = null, moves = {}, prevPos = null, loading = false;

    const tickets = () => `
      <div class="lgx-card lgx-tix">
        <div class="lgx-tokens">${Array.from({ length: this.TICKETS }, (_, i) => `<span class="${i < L.tickets ? 'on' : ''}"><svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.8z"/></svg></span>`).join('')}</div>
        <div class="row-main"><b>Жетоны турнира: ${L.tickets} из ${this.TICKETS}</b><small>${L.tickets < this.TICKETS ? `Новые через <span class="lgx-mid"></span>` : 'Один жетон — один турнир'}</small></div>
      </div>`;
    const renderPlay = () => {
      const team = S.team(), locked = S.d.level < this.LEVEL, power = team.reduce((a, x) => a + S.power(x), 0);
      const slots = UI.teamHtml(team).replace('<i>Нет духов</i>', '') + '<button class="mini lgx-slot team-slot" aria-label="Выбрать духа">+</button>'.repeat(Math.max(0, 3 - team.length));
      const btn = locked ? `Лига откроется на ${this.LEVEL} уровне` : team.length < 3 ? 'Нужно три духа' : L.tickets > 0 ? 'Начать турнир' : 'Жетоны кончились — приходи завтра';
      pane.innerHTML = `
        ${locked ? `<div class="lgx-card lgx-lock"><b>Лига откроется на ${this.LEVEL} уровне Ловчего</b><small>Сейчас у тебя ${S.d.level}-й. Лови духов, проходи родники и разломы — опыт придёт быстро.</small></div>` : ''}
        ${tickets()}
        <div class="lgx-card lgx-path">
          <div class="lgx-steps">
            ${[1, 2, 3].map(k => `<div class="lgx-step"><span>${k}</span><small>+1 ★</small></div><i></i>`).join('')}
            <div class="lgx-step bonus"><span>★</span><small>+1 ★ за 3 из 3</small></div>
          </div>
          <small class="lgx-rules">Три боя подряд с Ловчими Лиги. Раны духов между боями не лечатся, щиты восстанавливаются. Поражение звёзд не отнимает.</small>
        </div>
        <div class="lgx-team-head"><b>Команда на турнир</b>${power ? `<span>сила ${U.fmtNum(power)}</span>` : ''}<button class="btn small ghost team-edit">Изменить</button></div>
        <div class="rift-team my lgx-team">${slots}</div>
        ${next ? `<div class="lgx-card lgx-goal"><div class="lg-mini r${r + 1}">${r + 2}</div><div class="row-main"><small>Следующая награда · ещё ${next.stars - L.stars} ★</small><b>${next.name}: ${this.rwLine(r + 1)}</b></div></div>` : ''}
        <button class="btn primary wide lg-go" ${!locked && L.tickets > 0 && team.length === 3 ? '' : 'disabled'}>${btn}</button>`;
    };

    const who = x => `${U.esc(x.name)}${CLANS[x.clan] ? `<i class="lgx-clan" style="background:${CLANS[x.clan].color}" title="${CLANS[x.clan].name}"></i>` : ''}`;
    const move = x => { const d = x.pid && moves[x.pid]; return d && Date.now() - d.t < 20000 ? `<span class="lgx-move ${d.d > 0 ? 'up' : 'down'}">${d.d > 0 ? '▲' : '▼'}${Math.abs(d.d)}</span>` : ''; };
    const renderTable = () => {
      if (!Cloud.enabled()) { pane.innerHTML = '<div class="lgx-card"><small>Общая таблица всех Ловчих появится, когда к игре подключат облачный сервер.</small></div>'; return; }
      const head = `<div class="lgx-live"><i></i>Обновляется в реальном времени${data ? `<span>${data.total} ${U.plural(data.total, 'Ловчий', 'Ловчих', 'Ловчих')} в сезоне</span>` : ''}</div>`;
      if (!data) { pane.innerHTML = head + '<div class="lgx-card"><small>Загружаю таблицу…</small></div>'; return; }
      if (data.error) { pane.innerHTML = head + `<div class="lgx-card"><small>Таблица недоступна: ${U.esc(data.error)}</small></div>`; return; }
      const rows = data.rows, tier = data.tier || { rank: r, rows: [] };
      if (!rows.length) { pane.innerHTML = head + '<div class="lgx-card"><small>В этом сезоне ещё никто не сыграл турнир — будь первым!</small></div>'; return; }
      // пьедестал — тройка лучших в твоём ранге; ниже — остальные из топ-50 сезона (с их местом в сезоне)
      const key = x => x.pid || x.name, onPod = new Set(tier.rows.map(key));
      const seat = x => rows.findIndex(y => key(y) === key(x)) + 1;
      const pod = [1, 0, 2].filter(i => tier.rows[i]).map(i => { const x = tier.rows[i], p = seat(x); return `
        <button class="lgx-pod p${i + 1} ${x.me ? 'me' : ''}" data-pid="${U.esc(x.pid || '')}" data-name="${U.esc(x.name)}">
          <div class="lgx-pod-ava">${Art.avatar(x.look || undefined)}<span>${i + 1}</span></div>
          <b>${who(x)}</b><small>${p ? `${p}-е место · ` : ''}ур. ${x.lvl}</small>
          <div class="lgx-pod-base">★ ${x.stars}${move(x)}</div></button>`; }).join('');
      const list = rows.map((x, j) => ({ x, j })).filter(o => !onPod.has(key(o.x))).map(({ x, j }) => `
        <button class="lgx-row ${x.me ? 'me' : ''}" data-pid="${U.esc(x.pid || '')}" data-name="${U.esc(x.name)}">
          <b class="lgx-pos">${j + 1}</b><div class="fr-ava">${Art.avatar(x.look || undefined)}</div>
          <div class="row-main"><b>${who(x)}</b><small>${LEAGUE_RANKS[x.rank].name} · ур. ${x.lvl}</small></div>
          ${move(x)}<span class="lgx-stars">★ ${x.stars}</span></button>`).join('');
      const mine = !rows.some(x => x.me) && data.me ? `<div class="lgx-row me lgx-mine"><b class="lgx-pos">${data.me.place}</b><div class="row-main"><b>Ты</b><small>${LEAGUE_RANKS[r].name} · ур. ${S.d.level}</small></div><span class="lgx-stars">★ ${data.me.stars}</span></div>` : '';
      pane.innerHTML = head + (pod ? `<div class="lgx-sub"><div class="lg-mini r${tier.rank}">${tier.rank + 1}</div>Лучшие в ранге «${LEAGUE_RANKS[tier.rank].name}»</div><div class="lgx-podium">${pod}</div>` : '')
        + (list ? `<div class="lgx-sub">Топ-50 сезона</div><div class="list lgx-list">${list}</div>` : '') + mine
        + (Cfg.s.cloud === false ? '<div class="q-note">Тебя нет в таблице: так выбрано в Настройках.</div>' : '<div class="q-note">Нажми на Ловчего, чтобы открыть его карточку.</div>');
    };

    const renderRanks = () => {
      pane.innerHTML = `<div class="lgx-ladder">${LEAGUE_RANKS.map((x, i) => `
        <div class="lgx-rung ${i < r ? 'past' : i === r ? 'cur' : ''}">
          <div class="lg-mini r${i}">${i + 1}</div>
          <div class="row-main"><b>${x.name}${i === r ? ' <span class="lgx-you">ты здесь</span>' : ''}</b><small>★ ${x.stars}${x.reward ? ' · ' + this.rwLine(i) : ' · начало пути'}</small></div>
          ${L.got[i] ? '<span class="q-ok" title="Получено в этом сезоне">✓</span>' : i > r ? `<span class="lgx-need">ещё ${x.stars - L.stars} ★</span>` : ''}
        </div>`).join('')}</div>
        <div class="q-note">Награду за ранг дают один раз за сезон. В начале нового сезона звёзды делятся пополам — и награды можно получить снова. На рангах 4, 7 и 10 — ещё и амулет.</div>`;
    };

    const place = () => {
      const el = scr.querySelector('.lgx-place'); if (!el || !data || data.error) return;
      const i = data.rows.findIndex(x => x.me);
      el.innerHTML = i >= 0 ? `<b>${i + 1}-е место</b> из ${data.total} в сезоне` : data.me ? `<b>${data.me.place}-е место</b> из ${data.total} в сезоне`
        : Cfg.s.cloud === false ? 'Тебя нет в таблице (Настройки)' : 'Сыграй турнир, чтобы попасть в таблицу';
    };
    const render = () => {
      U.$$('[data-tab]', scr).forEach(b => b.classList.toggle('on', b.dataset.tab === this.tab));
      if (this.tab === 'table') renderTable(); else if (this.tab === 'ranks') renderRanks(); else renderPlay();
      tick();
    };
    const show = (t, dir) => { this.tab = t; render(); UI.slideIn(pane, dir); };
    // таблица — сразу и потом каждые 5 секунд, пока экран открыт; перерисовка — только если что-то изменилось
    const load = async () => {
      if (loading || !Cloud.enabled()) return;
      loading = true;
      let d;
      try { d = await this.top(); } catch (e) { d = data && !data.error ? data : { error: e.message }; }
      loading = false;
      if (!scr.isConnected) return;
      if (!d.error) {
        const pos = {}; d.rows.forEach((x, i) => { if (x.pid) pos[x.pid] = i; });
        if (prevPos) Object.keys(pos).forEach(p => { if (prevPos[p] != null && prevPos[p] !== pos[p]) moves[p] = { d: prevPos[p] - pos[p], t: Date.now() }; });
        prevPos = pos;
      }
      const changed = JSON.stringify(d) !== JSON.stringify(data) || Object.values(moves).some(m => Date.now() - m.t < 25000);
      data = d; place();
      if (changed && this.tab === 'table') renderTable();
    };
    const tick = () => {
      const e = scr.querySelector('.lgx-ends'); if (e) e.textContent = this.left(this.seasonEnds().getTime() - U.local().getTime());
      const m = scr.querySelector('.lgx-mid'); if (m) m.textContent = this.left(this.toMidnight());
    };

    scr.addEventListener('click', async e => {
      const tb = e.target.closest('[data-tab]');
      if (tb) { if (tb.dataset.tab !== this.tab) { Sfx.play('tap'); show(tb.dataset.tab, Math.sign(this.TABS.indexOf(tb.dataset.tab) - this.TABS.indexOf(this.tab))); } return; }
      if (e.target.closest('.team-edit, .team-slot')) { UI.pickTeam(() => { if (scr.isConnected && this.tab === 'play') renderPlay(); }); return; }
      const row = e.target.closest('[data-pid]');
      if (row) {
        const x = data && data.rows && data.rows.concat(data.tier ? data.tier.rows : []).find(y => y.pid && y.pid === row.dataset.pid);
        if (x) Friends.card(x.pid, { name: x.name, look: x.look }); else UI.toast('Карточка откроется после обновления сервера'); return; }
      const go = e.target.closest('.lg-go');
      if (go) {
        if (S.team().length < 3) return;
        go.disabled = true;
        const r0 = await Game.try('leagueStart');
        if (!r0) { go.disabled = false; return; }
        UI.closeScreen(scr);
        this.carry = null;
        this.next();
      }
    });
    UI.swipeTabs(body, this.TABS, () => this.tab, show);
    render(); load();
    let n = 0;
    const t = setInterval(() => {
      if (!scr.isConnected) { clearInterval(t); return; }
      tick();
      // жетоны вернулись в полночь — перерисовать вкладку турнира
      if (L.day !== U.today()) { L = this.view(); r = this.rank(L.stars); if (this.tab === 'play') renderPlay(); }
      if (++n % 5 === 0 && !document.hidden) load();
    }, 1000);
  },

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
    // до Разлома дальше 100 м — бой по Дальнему пропуску (совместный бой — только рядом)
    const d = MapView.pos ? U.dist(MapView.pos.lat, MapView.pos.lng, r.lat, r.lng) : 0;
    const far = d > W.BATTLE_R, passes = S.d.items.farpass || 0;
    const goBtn = !far ? `<button class="btn primary wide rift-go" ${team.length ? '' : 'disabled'}>Сразиться</button>`
      : passes ? `<button class="btn primary wide rift-go far" ${team.length ? '' : 'disabled'}>${Art.item('farpass')} Дальний бой · пропусков: ${passes}</button>`
      : `<button class="btn primary wide rift-shop">${Art.item('farpass')} Нужен Дальний пропуск — в Лавку</button>`;
    const html = `
      <div class="rift-view t${r.tier}">
        <div class="rift-portal">${Art.riftIcon(r.tier)}</div>
        <div class="rift-boss">${Art.spirit(r.boss)}</div>
        <div class="rift-title">${T.name} <span class="stars">${'★'.repeat(r.tier)}</span></div>
        <div class="rift-name">${Art.elIcon(s.el, 20)} ${s.name}</div>
        ${r.place ? `<div class="rift-meta">Разлом открылся у «${U.esc(r.place)}»</div>` : ''}
        <div class="rift-meta">Сила босса ≈ ${U.fmtNum(T.hp * 1.5)} · закроется через <b class="rift-left">${U.fmtTime(Math.max(0, r.endsAt - U.now()))}</b></div>
        <div class="rift-tip">Слабость: ${counters.map(e => `${Art.elIcon(e, 16)} ${ELEMENTS[e].name}`).join(' ')}</div>
        ${Sky.w ? `<div class="rift-tip">${Art.wxIcon(Sky.w.key, 16)} ${WEATHER[Sky.w.key].name}: урон +20% у ${WEATHER[Sky.w.key].boost.map(e => ELEMENTS[e].name).join(' и ')}</div>` : ''}
        ${r.done ? '<div class="rift-done">Этот разлом ты уже закрыл. Новый босс — в начале следующего часа.</div>' : `
        <div class="rift-team-title">Твоя команда <button class="btn small ghost team-edit">Изменить</button></div>
        <div class="rift-team">${UI.teamHtml(team)}</div>
        ${goBtn}
        ${Rules.dayLine(S.d, 'raids', 'Разломов закрыто')}
        ${far ? `<div class="rift-tip rift-far">До Разлома ${U.fmtDist(d)}. Дальний пропуск: один Орден дарит каждый день, ещё — в Лавке. Позвать друзей можно, только подойдя к Капищу.</div>`
          : '<button class="btn ghost wide rift-coop">Позвать друзей — совместный бой</button>'}`}
      </div>`;
    const scr = UI.screen('Разлом', html, 'rift-screen');
    scr._ended = !!r.done; // уже закрытый — сообщение есть в разметке
    const go = scr.querySelector('.rift-go');
    if (go) go.onclick = async () => { if (await this.battle(r, this.team(), null, far)) UI.closeScreen(scr); };
    const shop = scr.querySelector('.rift-shop');
    if (shop) shop.onclick = () => { UI.closeScreen(scr); Shop.screen(); };
    const cb = scr.querySelector('.rift-coop');
    if (cb) cb.onclick = () => { UI.closeScreen(scr); Coop.hostRift(r); };
    const edit = scr.querySelector('.team-edit');
    if (edit) edit.onclick = () => UI.pickTeam(() => { team = this.team(); scr.querySelector('.rift-team').innerHTML = UI.teamHtml(team); });
    // каждую секунду: таймер; разлом закрыт (победа) или его час прошёл — вместо кнопок сообщение
    const timer = setInterval(() => {
      if (!scr.isConnected) { clearInterval(timer); return; }
      const t = scr.querySelector('.rift-left'); if (t) t.textContent = U.fmtTime(Math.max(0, r.endsAt - U.now()));
      const done = !!S.d.rifts[r.id], gone = U.now() >= r.endsAt;
      if ((done || gone) && !scr._ended) {
        scr._ended = true;
        scr.querySelectorAll('.rift-go, .rift-shop, .rift-coop, .rift-far, .rift-team-title, .rift-team, .day-left').forEach(x => x.remove());
        scr.querySelector('.rift-view').insertAdjacentHTML('beforeend', `<div class="rift-done">${done ? 'Этот разлом ты уже закрыл. Новый босс — в начале следующего часа.' : 'Разлом схлопнулся — его час прошёл. Новые открываются в начале каждого часа.'}</div>`);
      }
    }, 1000);
  },

  // Разломы вокруг: все открытые в этот час Разломы до Rules.FAR.R от игрока
  async list() {
    Sfx.init(); Sfx.play('tap');
    const scr = UI.screen('Разломы вокруг', '<div class="rift-list"><div class="q-note">Ищу Разломы у Капищ вокруг…</div></div>', 'rifts-screen');
    const box = scr.querySelector('.rift-list'), pos = MapView.pos;
    if (!pos) { box.innerHTML = '<div class="q-note">Жду, когда найдётся твоё место на карте…</div>'; return; }
    const shrines = await Poi.shrinesFar(pos.lat, pos.lng, Rules.FAR.R);
    // Разломы часа: пересчитываются каждую секунду — закрытый только что помечается сразу, в начале часа приходят новые
    let hour = Math.floor(U.now() / 3600000), rifts = [], sig = '';
    const calc = () => {
      hour = Math.floor(U.now() / 3600000);
      rifts = shrines.map(p => W.riftFor(p, p.d, hour)).filter(Boolean).sort((a, b) => (a.done - b.done) || (a.d - b.d));
      return rifts.map(r => r.id + (r.done ? '+' : '')).join() + '|' + (S.d.items.farpass || 0);
    };
    let tier = 0; // 0 — все, иначе только разломы этой силы
    const left = () => U.fmtTime(Math.max(0, (hour + 1) * 3600000 - U.now()));
    const render = () => {
      const passes = S.d.items.farpass || 0;
      const shown = rifts.map((r, i) => ({ r, i })).filter(x => !tier || x.r.tier === tier), more = Math.max(0, shown.length - 40);
      box.innerHTML = `<div class="shop-wallet"><span class="zlat">${Art.item('farpass')} Пропусков: ${passes}</span><span>новые через <b class="rl-left">${left()}</b></span></div>
        <div class="chips rift-tiers">${[0, 1, 2, 3].map(t => `<button class="chip ${tier === t ? 'on' : ''}" data-t="${t}">${t ? '★'.repeat(t) : 'Все'} <small>${rifts.filter(r => (!t || r.tier === t) && !r.done).length}</small></button>`).join('')}</div>
        ${shown.length ? shown.slice(0, 40).map(({ r, i }) => `<button class="rift-row t${r.tier} ${r.done ? 'done' : ''}" data-i="${i}">
          <div class="rr-boss">${Art.spirit(r.boss)}</div>
          <div class="row-main"><b>${SP[r.boss].name} <span class="stars">${'★'.repeat(r.tier)}</span></b><small>${U.esc(r.place || 'Капище')}</small></div>
          <div class="rr-d">${r.done ? '✓ закрыт' : r.d <= W.BATTLE_R ? 'рядом' : U.fmtDist(r.d)}</div></button>`).join('')
          : '<div class="q-note">Сейчас вокруг нет открытых Разломов. Новые открываются в начале каждого часа.</div>'}
        ${more ? `<div class="q-note">…и ещё ${more} дальше</div>` : ''}
        <div class="q-note">Разломы открываются у Капищ каждый час. Подойди к Капищу на 100 м — или закрой Разлом издалека (до 5 км) по Дальнему пропуску.</div>`;
    };
    box.addEventListener('click', e => {
      const c = e.target.closest('.chip'); if (c) { tier = +c.dataset.t; render(); return; }
      const b = e.target.closest('.rift-row'); if (b) this.open(rifts[+b.dataset.i]);
    });
    sig = calc(); render();
    const timer = setInterval(() => {
      if (!scr.isConnected) { clearInterval(timer); return; }
      const s = calc();
      if (s !== sig) { sig = s; render(); } // сменился набор разломов или чей-то статус — перерисовать
      else { const t = box.querySelector('.rl-left'); if (t) t.textContent = left(); } // иначе — только таймер
    }, 1000);
  },
  // Разломов вокруг (незакрытых) — для значка в меню; считаем по уже загруженному списку
  openCount() {
    if (!Poi.far || !MapView.pos) return 0;
    const hour = Math.floor(U.now() / 3600000);
    return Poi.far.items.filter(p => U.dist(MapView.pos.lat, MapView.pos.lng, p.lat, p.lng) <= Rules.FAR.R).map(p => W.riftFor(p, 0, hour)).filter(r => r && !r.done).length;
  },

  // Сервер проверяет, что разлом открыт здесь и сейчас, и запоминает начало боя.
  // coop: { host, hpMul, allies, code } — совместный бой (см. coop.js), союзников сервер считает по комнате. Возвращает true, если бой начался.
  async battle(r, team, coop, far) {
    if (this.st || this._starting) return false;
    this._starting = true;
    const ok = await Game.try('raidStart', { rift: { id: r.poi, lat: r.lat, lng: r.lng, name: r.place }, coop: coop ? { code: coop.code } : null, far: !!far });
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
    Music.play('map'); // 4.8.1: в боях — та же мелодия карты
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
    st.$('.raid-mname').innerHTML = `${Art.elIcon(SP[m.sp.sid].el, 16)} ${U.esc(m.sp.nick || SP[m.sp.sid].name)} <small>СИЛА ${m.power}</small>`;
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
  remoteHit(name, n) { // у хозяина: урон союзника. Возвращает засчитанный урон.
    // 4.1: сообщение из открытого канала — только разумные числа: не больше 4% здоровья босса за удар и 12% за секунду от всех союзников
    const st = this.st; if (!st || st.over) return 0;
    n = Math.floor(+n);
    if (!Number.isFinite(n) || n <= 0) return 0;
    const max = st.bs.hp, now = Date.now(), w = st.allyWin || (st.allyWin = { t: now, n: 0 });
    n = Math.min(n, Math.ceil(max * 0.04));
    if (now - w.t > 1000) { w.t = now; w.n = 0; }
    if (w.n + n > max * 0.12) return 0;
    w.n += n;
    st.bossHp = Math.max(0, st.bossHp - n);
    const b = st.$('.raid-boss').getBoundingClientRect();
    this.float(`${n}`, b.left + b.width * (0.15 + Math.random() * 0.7), b.top + b.height * 0.55, 'ally');
    if (st.bossHp <= 0) this.finish(true);
    this.render();
    return n;
  },
  remoteState(hp, time) { // у гостя: состояние от хозяина
    const st = this.st; if (!st || st.over) return;
    if (!Number.isFinite(+hp) || !Number.isFinite(+time)) return; // сообщение из открытого канала — только числа
    st.bossHp = Math.max(+hp > 0 ? 1 : 0, Math.min(st.bossHp, +hp));
    st.time = +time;
    this.render();
  },
  remoteEnd(win) { const st = this.st; if (st && !st.over) { clearTimeout(st._wait); this.finish(win); } },
  renderAllies(list) {
    const st = this.st; if (!st || !st.coop) return;
    const box = st.$('.raid-allies'); if (!box) return;
    // список приходит по открытому каналу разлома — берём не больше 4 записей и только проверенные поля
    box.innerHTML = (Array.isArray(list) ? list.slice(0, 4) : []).filter(a => a && typeof a === 'object').map(a => `<span><i>${Art.avatar(a.look)}</i>${U.esc(String(a.name || '').slice(0, 20))} <b>${U.fmtNum(+a.n || 0)}</b></span>`).join('');
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
  // соперники без уровня Капища: скорость ударов и щиты (4.3: те же числа проверяет сервер — Rules.duelTimeoutOk)
  FOE: { invasion: { speed: 0.75, shield: 0.5 }, spar: { speed: 0.72, shield: 0.6 } },

  shieldSvg: '<svg viewBox="0 0 24 24" class="shd"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="#5eead4" stroke="#0f766e" stroke-width="1.5"/></svg>',

  open(e) {
    const hold = Clans.info(e.id), mine = !!(hold && S.d.clan && hold.clan === S.d.clan);
    const g = W.guardian(e), T = SHRINE_TIERS[e.tier], mul = Ev.duelMul();
    let team = S.team();
    const holders = hold ? hold.holders.filter(h => h.sp && SP[h.sp.sid]) : [];
    const who = hold
      ? `<div class="guard"><div class="guard-ava clan" style="--cc:${CLANS[hold.clan].color}">${Art.guardian(CLANS[hold.clan].color)}</div><div><b>${CLANS[hold.clan].name}</b><small>держит Капище с ${new Date(hold.since).toLocaleDateString('ru-RU')} · защитников: ${holders.length} из ${HOLD_MAX}</small></div></div>
         <div class="rift-team-title">Защитники</div>
         <div class="holders">${holders.map(h => `<div class="mini">${Art.imgOf(h.sp)}<b>${S.power(h.sp)}</b><small>${U.esc(h.name || 'Ловчий')}</small></div>`).join('')}</div>`
      : `<div class="guard"><div class="guard-ava">${Art.guardian(g.color)}</div><div><b>${g.name}</b><small>Хранитель · ${g.title}</small></div></div>
         <div class="rift-team-title">Духи хранителя</div>
         <div class="rift-team">${UI.teamHtml(g.team)}</div>`;
    const canClan = !S.d.clan && S.d.level >= CLAN_LEVEL;
    let action;
    if (mine) action = `<div class="rift-tip">Капище держит твоя дружина. Поставь сюда своего защитника — и получай дань каждый день.</div>
        <button class="btn primary wide defend-go" ${holders.length >= HOLD_MAX ? 'disabled' : ''}>Поставить защитника</button>`;
    else if (e.won) action = `<div class="rift-done">Сегодня ты уже победил здесь.${S.d.clan ? '' : ' Завтра будет новый бой.'}</div>
        ${S.d.clan && !hold ? '<button class="btn primary wide defend-go">Поставить защитника</button>' : ''}`;
    else action = `
        <div class="rift-team-title">Твоя команда <button class="btn small ghost team-edit">Изменить</button></div>
        <div class="rift-team my">${UI.teamHtml(team)}</div>
        <div class="rift-tip">${hold ? 'Победа освободит Капище от защитников. ' : ''}Награда: ${U.fmtNum(T.xp * mul)} опыта, ✦ ${U.fmtNum(T.sparks * mul)} и предметы${mul > 1 ? ' (Неделя поединков ×2)' : ''}</div>
        <button class="btn primary wide duel-go" ${team.length ? '' : 'disabled'}>Бросить вызов</button>${Rules.dayLine(S.d, 'duels', 'Побед на Капищах')}`;
    const html = `
      <div class="shrine-view t${e.tier}">
        ${Poi.photoUrl(e.photo) ? `<div class="place-photo" style="background-image:url('${Poi.photoUrl(e.photo)}')"></div>` : `<div class="shrine-idol">${Art.shrineIcon(e.tier, e.won)}</div>`}
        <div class="rift-title">${U.esc(e.name)} <span class="stars">${'★'.repeat(e.tier)}</span></div>
        <div class="rift-meta">Капище ${e.god}${hold ? ' · ' + Clans.badge(hold.clan, true) : ''}</div>
        ${who}
        ${action}
        ${canClan ? '<button class="btn ghost wide clan-go">Выбрать дружину</button>' : ''}
      </div>`;
    const scr = UI.screen('Капище', html, 'shrine-screen');
    const go = scr.querySelector('.duel-go');
    if (go) go.onclick = async () => {
      if (this.st || this._starting) return;
      this._starting = true;
      const r = await Game.try('duelStart', { shrine: { id: e.id, lat: e.lat, lng: e.lng, name: e.name } });
      this._starting = false;
      if (!r) return;
      UI.closeScreen(scr);
      // защитники дружины — вместо хранителя
      const foe = r.foe ? { name: CLANS[r.clan].name, color: CLANS[r.clan].color, title: 'Защитники Капища', team: r.foe } : g;
      this.start({ ...e, kind: 'shrine', held: r.clan || null }, foe, S.team());
    };
    const def = scr.querySelector('.defend-go');
    if (def) def.onclick = () => Clans.defend(e, () => { UI.closeScreen(scr); this.open(W.shrineFor(e, e.d)); });
    const cg = scr.querySelector('.clan-go');
    if (cg) cg.onclick = () => Clans.choose(() => { UI.closeScreen(scr); this.open(W.shrineFor(e, e.d)); });
    const edit = scr.querySelector('.team-edit');
    if (edit) edit.onclick = () => UI.pickTeam(() => { team = S.team(); scr.querySelector('.rift-team.my').innerHTML = UI.teamHtml(team); });
    Clans.refresh(); // сводка могла устареть
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
        ${Rules.dayLine(S.d, 'invasions', 'Вторжений отбито')}
      </div>`;
    const scr = UI.screen('Вторжение Нави', html, 'shrine-screen invasion-screen');
    scr.querySelector('.duel-go').onclick = async () => {
      if (!await this.begin('invStart', { spring: { id: e.id, lat: e.lat, lng: e.lng, name: e.name } })) return;
      UI.closeScreen(scr);
      this.start({ ...e, kind: 'invasion', tier: 1, T: this.FOE.invasion }, g, S.team());
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
      this.start({ kind: 'spar', name: f.name, T: this.FOE.spar }, { name: U.esc(r.name), color, team: r.foe }, S.team());
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
    Music.play('map'); // 4.8.1: в боях — та же мелодия карты
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
      const note = r.clan
        ? (r.freed ? `Защитники «${CLANS[r.clan].name}» отступили — Капище «${U.esc(st.e.name)}» свободно!` : `Победа засчитана, но пока шёл бой, на Капище сменились защитники.`)
        : `«Достойно, Ловчий», — ${st.g.name} склоняет голову. Капище «${U.esc(st.e.name)}» освящено тобой до конца дня.`;
      const canDefend = S.d.clan && (!r.clan || r.freed);
      html = `<div class="res-title">Победа!</div>
        <div class="res-art"><div class="guard-ava big">${Art.guardian(st.g.color)}</div></div>
        <div class="res-note">${note}${canDefend ? ' Поставь своего защитника — и Капище перейдёт твоей дружине.' : ''}</div>
        <div class="res-rw">${rw.map(x => `<div><b>+${U.fmtNum(x.n)}</b> ${x.label}</div>`).join('')}</div>
        ${canDefend ? '<button class="btn primary wide defend-now">Поставить защитника</button>' : ''}`;
      if (r.clan) Clans.refresh(true);
    } else {
      Sfx.play('lose');
      html = `<div class="res-title lose">Поражение</div>
        <div class="res-art"><div class="guard-ava big">${Art.guardian(st.g.color)}</div></div>
        <div class="res-note">«Приходи, когда окрепнешь», — говорит ${st.g.name}. Попробуй другую команду: смотри на стихии хранителя и береги щиты для его приёмов.</div>`;
    }
    const res = U.el(`<div class="raid-result"><div class="res-card">${html}<button class="btn ${html.includes('defend-now') ? 'ghost' : 'primary'} wide to-map">На карту</button></div></div>`);
    res.querySelector('.to-map').onclick = () => this.close();
    const dn = res.querySelector('.defend-now');
    if (dn) dn.onclick = () => { const e = st.e; this.close(); Clans.defend(e); };
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
  /* ---------- 3.12: златники, Лавка Ордена, Сезонная тропа ---------- */
  // Златники — вторая валюта: за серию дней, сундук дня, уровни, главы Летописи, дань и Тропу
  ZLAT: { streak: 5, streak7: 30, questBonus: 10, level: 20, story: 50, tribute: 3 },
  BAG_STEP: 50, BAG_MAX_UP: 10,
  // 3.15: Казна — златники за рубли (оплата через ЮKassa; цену и число златников сервер берёт отсюда, а не с телефона)
  PAY: [
    { id: 'z100',  zlat: 100,  rub: 99 },
    { id: 'z330',  zlat: 330,  rub: 299,  bonus: 10 },
    { id: 'z575',  zlat: 575,  rub: 499,  bonus: 15 },
    { id: 'z1200', zlat: 1200, rub: 999,  bonus: 20, hot: true },
    { id: 'z2600', zlat: 2600, rub: 1990, bonus: 30 },
  ],
  // 3.20: дневные лимиты объектов карты (сутки — по часам игрока). Считаются только успехи: зачерпнутый родник,
  // победа в Разломе, на Капище и во вторжении, пойманный дикий дух. Обычной игре не мешают (20–40 поимок,
  // 10–20 родников в день), а бесконечный фарм и боты упираются в потолок
  DAILY: { springs: 30, raids: 6, duels: 8, invasions: 6, catches: 120 },
  DAILY_NAMES: { springs: 'Родники', raids: 'Разломы', duels: 'Капища', invasions: 'Вторжения', catches: 'Поимки' },
  dayUsed(d, key) { return d && d.dayc && d.dayc.day === U.today() ? (d.dayc[key] || 0) : 0; },
  // строка «Родников сегодня: 12 из 30» для окон объектов
  dayLine(d, key, what) { const u = this.dayUsed(d, key), m = this.DAILY[key]; return `<div class="day-left ${u >= m ? 'out' : ''}">${what} сегодня: <b>${u}</b> из ${m}${u >= m ? ' — завтра снова' : ''}</div>`; },
  // 3.18: Чат Ордена — писать с LEVEL уровня; не чаще раза в GAP мс и PER_DAY сообщений в сутки; до MAX символов
  CHAT: { LEVEL: 3, MAX: 200, GAP: 3000, PER_DAY: 300 },
  CHAT_CHANNELS: [['all', 'Общий'], ['trade', 'Торговля'], ['raid', 'Разломы'], ['help', 'Помощь'], ['clan', 'Дружина']],
  // 3.17: Аукцион духов — с LEVEL уровня; лот живёт HOURS часов; комиссия FEE с продажи (платит продавец)
  AUCTION: { LEVEL: 5, FEE: 0.1, HOURS: 72, MAX_OPEN: 5, PER_DAY: 20, MIN: { sparks: 100, zlat: 1 }, MAX: { sparks: 10000000, zlat: 100000 } },
  auctionFee(price) { return Math.max(1, Math.ceil(price * this.AUCTION.FEE)); },
  // 3.14: обменник — SPARKS искр → ZLAT златников за один обмен, не больше DAY обменов в день
  EXCHANGE: { SPARKS: 500, ZLAT: 10, DAY: 10 },
  // 3.13: Дальний пропуск — Разлом до R м от игрока; каждый день Орден дарит один, если их меньше KEEP
  FAR: { R: 5000, KEEP: 3 },
  // cur — валюта: sparks (искры) или zlat (златники). give — предметы; cocoon — кокон; amulet — случайный амулет
  SHOP: [
    { id: 'bag',      name: 'Расширение сумки',    desc: '+50 мест в сумке навсегда',                cur: 'zlat', bag: true },
    { id: 'farpass',  name: 'Дальний пропуск',     desc: 'Закрыть Разлом до 5 км, не подходя к нему', cur: 'sparks', price: 1000, give: { farpass: 1 } },
    { id: 'farpass3', name: 'Три дальних пропуска', desc: 'Три грамоты на дальние Разломы',          cur: 'zlat', price: 45,  give: { farpass: 3 } }, // выгоднее трёх за искры (по курсу обменника 45 зл ≈ ✦ 2250)
    { id: 'charm20', name: 'Связка оберегов',     desc: '20 оберегов',                              cur: 'sparks', price: 1500, give: { charm: 20 } },
    { id: 'honey5',   name: 'Горшок мёда',         desc: '5 мёда',                                   cur: 'sparks', price: 1200, give: { honey: 5 } },
    { id: 'water5',   name: 'Живая вода',          desc: '5 флаконов',                               cur: 'sparks', price: 1500, give: { water: 5 } },
    { id: 'charm2x',  name: 'Серебряные обереги',  desc: '10 серебряных оберегов',                   cur: 'zlat', price: 60,  give: { charm2: 10 }, lvl: 8 },
    { id: 'charm3x',  name: 'Золотые обереги',     desc: '10 золотых оберегов',                      cur: 'zlat', price: 120, give: { charm3: 10 }, lvl: 16 },
    { id: 'incense',  name: 'Ладан',               desc: '30 минут духов вокруг вдвое больше',       cur: 'zlat', price: 50,  give: { incense: 1 } },
    { id: 'cocoon5',  name: 'Кокон 5 км',          desc: 'Необычные и редкие духи',                  cur: 'zlat', price: 80,  cocoon: 5 },
    { id: 'cocoon10', name: 'Кокон 10 км',         desc: 'Редкие и эпические духи',                  cur: 'zlat', price: 150, cocoon: 10 },
    { id: 'amulet',   name: 'Случайный амулет',    desc: 'Перуна, Мокоши, Велеса, Сварога или Лады', cur: 'zlat', price: 200, amulet: true },
  ],
  bagPrice(n) { return 150 + 50 * n; }, // n — сколько раз сумку уже расширяли
  // Товар дня: один из припасов со скидкой 40%, купить можно один раз в день
  shopDeal(day) {
    const pool = this.SHOP.filter(x => (x.give || x.cocoon) && !x.lvl); // товар дня доступен любому уровню
    const it = pool[Math.floor(U.h('deal', day) * pool.length)];
    return { ...it, price: Math.max(1, Math.round(it.price * 0.6)), deal: true };
  },
  // Сезонная тропа: сезон — календарный месяц, 30 ступеней по 40 очков (очки — как в общем деле Ордена)
  PASS: { LEVELS: 30, PER: 40, GOLD: 600 },
  passLevel(pts) { return Math.min(this.PASS.LEVELS, Math.floor((pts || 0) / this.PASS.PER)); },
  // Награда ступени: free — всем, gold — на Золотой тропе
  passReward(track, lvl) {
    if (track === 'free') {
      if (lvl === 30) return { charm3: 5, zlat: 50 };
      if (lvl % 10 === 0) return { cocoon: 5, zlat: 20 };
      if (lvl % 5 === 0) return { incense: 1, zlat: 15 };
      return lvl % 2 ? { charm: 8 } : { honey: 3, sparks: 300 };
    }
    if (lvl === 30) return { look: 'trail', charm3: 10, cocoon: 10 };
    if (lvl === 15) return { look: '#065f46', zlat: 50 };
    if (lvl % 10 === 0) return { cocoon: 10, zlat: 40 };
    if (lvl % 5 === 0) return { amulet: 1, zlat: 30 };
    if (lvl % 3 === 0) return { charm3: 3, zlat: 15 };
    return lvl % 2 ? { charm2: 5, sparks: 500 } : { water: 3, sparks: 800 };
  },
  // Защитник вернулся с Капища: искры за время на посту (25 в час, не меньше 25 и не больше 1500)
  guardPay(hours) { return Math.min(1500, Math.max(25, Math.round(25 * (hours || 0)))); },
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
      ess: (special ? 10 : s.stage === 3 ? 10 : s.stage === 2 ? 5 : 3) + (s.rar - 1) * 2, // редкие — больше эссенции (эпический 1-й стадии: 9 вместо 3)
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
  // 4.3: может ли эта команда вообще победить этого соперника. Соперник бьёт сам раз в speed…speed+0,25 с игрового
  // времени, увернуться нельзя. Победа — либо убить его команду раньше, чем он убьёт твою, либо дожить до таймера и
  // остаться «здоровее» (у кого больше доля здоровья). Всё считается в пользу игрока: его урон — максимальный (как в
  // duelMaxDamage), урон соперника — только быстрые удары, слабейшие из возможных; щиты и приёмы соперника не считаются.
  // Честный бой не отклоняется, а слабая команда против сильного соперника «победить» не может.
  duelWinnable(team, foe, speed) {
    if (!team.length || !foe.length) return false;
    const me = team.map(sp => ({ x: S.battle(sp), el: SP[sp.sid].el })), fo = foe.map(sp => ({ x: S.battle(sp), el: SP[sp.sid].el }));
    const hit = Math.min(...fo.flatMap(f => me.map(m => Raid.dmg(f.x.atk, m.x.def, Duel.FAST, f.el, m.el))));
    const foeDps = hit / ((+speed || 0.85) + 0.25), myDps = this.duelMaxDamage(team, foe, 1);
    const survive = me.reduce((a, m) => a + m.x.hp * Duel.HPX, 0) / foeDps; // дольше команда не проживёт
    const kill = this.duelFoeHp(foe) / myDps;                               // быстрее соперника не убить
    if (kill <= survive) return true;
    if (survive < Duel.TIME) return false;
    const meMax = Math.max(...me.map(m => m.x.hp * Duel.HPX)), foeMin = Math.min(...fo.map(f => f.x.hp * Duel.HPX));
    const meShare = Math.max(0, 1 - foeDps * Duel.TIME / (me.length * meMax));
    const foeShare = Math.max(0, 1 - myDps * Duel.TIME / (fo.length * foeMin));
    return meShare >= foeShare;
  },
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
  MIN_CLIENT: '4.0.0', // 4.0: новые духи меняют появление духов на карте, обучение ведёт сервер — старым клиентам нужно обновиться
  POI_ID: /^(osm:[nwr]\d{1,15}|usr:[0-9a-f-]{36})$/,
  PID: /^[a-z0-9]{8,40}$/,
  STARTERS: ['ugolek', 'kapelka', 'mshonok'],
  TZ_LOCK: 7 * 86400000, // часовой пояс игрока меняется не чаще раза в неделю

  fail(msg) { throw new GameError(msg); },
  need(cond, msg) { if (!cond) this.fail(msg); },

  /* ---------- запуск запроса ----------
     req:  { a: [{ type, args }], tz, wx, pos: { lat, lng, acc }, v }
     save: { data, srv } — прогресс и служебные данные сервера (сессии встреч и боёв, позиция, лимиты)
     env:  доступ к общим таблицам (места, друзья, подарки, обмен, Лига) — см. serve.js / тесты */
  /* 4.3: сервер выполняет запросы разных игроков одновременно. Игровой код работает с общими полями (S.d — прогресс,
     U.tz — часовой пояс, Sky.w — погода, MapView.pos — позиция, Bus.emit, S.save): на сервере у каждого запроса они
     свои — AsyncLocalStorage (serve.js → isolate) хранит их значения на всё время запроса, включая ожидание базы.
     В браузере (автотесты) — как раньше: запрос подменяет поля и возвращает их в finally. */
  isolate(als) {
    this.als = als;
    [[S, 'd'], [S, 'save'], [U, 'tz'], [U, 'skew'], [Sky, 'w'], [MapView, 'pos'], [Bus, 'emit']].forEach(([obj, key], i) => {
      let base = obj[key];
      Object.defineProperty(obj, key, {
        configurable: true, enumerable: true,
        get() { const s = als.getStore(); return s && i in s ? s[i] : base; },
        set(v) { const s = als.getStore(); if (s) s[i] = v; else base = v; },
      });
    });
  },
  async run(req, save, env) {
    if (this.als && !this.als.getStore()) return this.als.run({}, () => this.run(req, save, env));
    const ctx = { now: Date.now(), env, srv: JSON.parse(JSON.stringify(save.srv || {})), events: [], results: [], after: [], full: false, reset: false };
    const saved = { emit: Bus.emit, save: S.save, d: S.d, tz: U.tz, skew: U.skew, w: Sky.w, pos: MapView.pos };
    try {
      // 4.1: часовой пояс игрока запоминает сервер и меняет не чаще раза в неделю — иначе, переключая пояс
      // от запроса к запросу, можно было снова и снова «начинать новый день» (дневные лимиты, дань, награда за вход)
      const tz = Number.isFinite(+req.tz) ? U.clamp(Math.round(+req.tz), -840, 840) : 0, z = ctx.srv.tz;
      if (!z || (z.v !== tz && ctx.now - z.t >= this.TZ_LOCK)) ctx.srv.tz = { v: tz, t: ctx.now };
      U.tz = ctx.srv.tz.v;
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
        const h = a && typeof a.type === 'string' && Object.prototype.hasOwnProperty.call(this.H, a.type) ? this.H[a.type] : null; // только свои действия, без служебных полей объекта
        this.need(h, 'Неизвестное действие');
        if (!['newGame', 'load'].includes(a.type)) this.need(S.d, 'Прогресс не найден');
        ctx.results.push(await h.call(this, a.args || {}, ctx));
      }
      if (S.d && stats0) { const pts = Rules.orderPoints(stats0, S.d.stats, Ev.cur); this.orderAdd(ctx, pts); this.passAdd(ctx, pts); }
      if (S.d) { S.checkMedals(); S.ensureQuests(); }
      return { ok: true, data: S.d, srv: ctx.srv, results: ctx.results, events: ctx.events, after: ctx.after, full: ctx.full, reset: ctx.reset, now: ctx.now };
    } catch (e) {
      // при отказе сохраняются только счётчики частоты (rl): иначе неудачные попытки перебора не считались бы
      if (e instanceof GameError) return { ok: false, error: e.message, rl: ctx.srv.rl || null };
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
      return { id: row.id, lat: row.lat, lng: row.lng, name: row.name, photo: row.photo || null, verified: true };
    }
    this.need(p.id.startsWith('osm:'), 'Место не найдено');
    // там, где места загружены из OpenStreetMap в базу (вся Россия), других объектов нет
    this.need(!(await ctx.env.poiCovered(+p.lat, +p.lng)), 'Этого места нет на карте — обнови игру');
    // 4.1: такое место сервер проверить не может (id и координаты — от телефона): на нём нет легендарных разломов и удержания Капищ
    return { id: p.id, lat: +p.lat, lng: +p.lng, name: String(p.name || 'Место').slice(0, 80), photo: null, verified: false };
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
  // Победа засчитывается, если с такой командой против такого соперника (speed — скорость его ударов) она вообще
  // возможна (4.3) и команда могла нанести столько урона за это время (или бой дошёл до таймера)
  plausibleDuel(ctx, b, foe, speed) {
    const t = this.battleTime(ctx, b);
    this.need(t >= 5, 'Бой не засчитан: слишком быстрая победа');
    this.need(Rules.duelWinnable(this.team(b.team), foe, speed), 'Бой не засчитан: эта команда не могла победить такого соперника');
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
  // Сезонная тропа: сезон — календарный месяц по часам игрока
  passSeason(ctx) { const d = U.local(ctx.now); return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`; },
  passState(ctx) {
    const season = this.passSeason(ctx);
    if (!S.d.pass || S.d.pass.season !== season) S.d.pass = { season, pts: 0, gold: false, got: { free: [], gold: [] } };
    return S.d.pass;
  },
  passAdd(ctx, pts) { if (pts > 0) this.passState(ctx).pts += pts; },
  // Награда: предметы, искры, златники + кокон, случайный амулет, облик
  grant(rw) {
    const { cocoon, amulet, look, ...rest } = rw;
    const got = S.giveRewards(rest);
    if (cocoon) { S.d.cocoons.push({ id: U.uid(), km: cocoon, walked: 0, inc: S.incubating() < 3 }); got.push({ k: 'cocoon', n: 1, km: cocoon, label: `Кокон ${cocoon} км` }); }
    if (amulet) { const am = S.rollAmulet(1, 'gift' + U.uid()); got.push({ k: 'amulet', n: 1, id: am, label: AMULETS[am].name }); }
    if (look) {
      S.d.owned[look] = true;
      const x = LOOK.cloak.find(c => c.c === look) || LOOK.emblem.find(m => m.id === look) || LOOK.skin.find(k => `skin:${k.id}` === look) || LOOK.bg.find(k => `bg:${k.id}` === look) || LOOK.frame.find(k => `frame:${k.id}` === look);
      got.push({ k: 'look', n: 1, look, label: x ? `Облик: ${x.name}` : 'Облик' });
    }
    return got;
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
      purified: !!x.purified, move2: !!x.move2, amulet: AMULETS[x.amulet] ? x.amulet : null, nick: x.nick ? this.cleanText(x.nick, 16) || null : null };
  },
  // Приглашение: новичок по ссылке друга сразу в друзьях у него, оба получают подарки.
  // Пригласивший — подарком в «Друзья» (не больше INVITE_MAX за все приглашения, чтобы не накручивали).
  INVITE_MAX: 10,
  INVITE_GIFT: { charm2: 5, charm3: 2, incense: 1, invite: 1 },
  INVITE_WELCOME: { charm: 20, honey: 5, sparks: 1000 },
  async invite(ctx, ref) {
    if (!this.PID.test(ref) || ref === S.d.pid) return null;
    const who = await ctx.env.player(ref);
    if (!who) return null;
    S.d.friends.push({ id: ref, name: who.name, lvl: who.level, pts: 1, added: ctx.now, sent: '', recv: '', linked: true, invitedBy: true });
    await ctx.env.link(S.d.pid, ref, S.d.name, S.d.level); // пригласивший увидит новичка в друзьях
    S.giveRewards(this.INVITE_WELCOME);
    J.add('friend', { name: who.name });
    if ((await ctx.env.invitesTo(ref)) < this.INVITE_MAX) await ctx.env.giftCreate(S.d.pid, ref, S.d.name, this.INVITE_GIFT);
    return who.name;
  },
  // Совместный разлом: участник комнаты и то, что видит телефон (без кодов игроков)
  ROOM_ALPHA: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  // Облик — только из известных вариантов (он попадает в картинку у других игроков)
  // Аукцион: расчёт с продавцом — выручка за проданные (минус комиссия), духи снятых и истёкших лотов — обратно.
  // Номера рассчитанных лотов запоминаются в прогрессе (auc), поэтому расчёт ровно один, даже если отметка
  // settled в таблице не успела записаться
  async auctionSettle(ctx) {
    const A = S.d.auc = S.d.auc || { got: {}, back: {}, paid: {} };
    for (const m of [A.got, A.back, A.paid]) for (const k of Object.keys(m)) if (ctx.now - m[k] > 14 * 86400000) delete m[k];
    const rows = await ctx.env.lotsToSettle(S.d.pid), got = [];
    for (const r of rows) {
      if (!r.spirit || !SP[r.spirit.s]) continue;
      if (r.status === 'sold') {
        if (A.paid[r.id]) continue;
        const cur = r.cur === 'zlat' ? 'zlat' : 'sparks', net = r.price - Rules.auctionFee(r.price);
        S.d[cur] = (S.d[cur] || 0) + net;
        A.paid[r.id] = ctx.now;
        S.d.stats.traded++;
        got.push({ type: 'sold', sid: r.spirit.s, cur, price: r.price, net, buyer: String(r.buyer_name || '').slice(0, 20) });
        J.add('auction', { sid: r.spirit.s, dir: 'sold', cur, price: net, who: r.buyer_name });
      } else {
        if (A.back[r.id]) continue;
        S.addSpirit(this.unpackSpirit(r.spirit, ctx));
        A.back[r.id] = ctx.now;
        got.push({ type: r.status, sid: r.spirit.s });
      }
    }
    if (rows.length) ctx.after.push(() => ctx.env.lotsDone(rows.map(r => r.id), 'settled'));
    return got;
  },
  // Дневные лимиты (Rules.DAILY): счётчики за сегодняшний день игрока хранятся в прогрессе (dayc)
  dayc(ctx) {
    const today = U.today(ctx.now);
    if (!S.d.dayc || S.d.dayc.day !== today) S.d.dayc = { day: today };
    return S.d.dayc;
  },
  DAY_MSG: {
    springs: 'Сегодня ты уже зачерпнул силу из 30 родников — они снова откроются завтра',
    raids: 'Сегодня закрыто уже 6 Разломов — Навь затихла до завтра',
    duels: 'Сегодня уже 8 побед на Капищах — хранители ждут тебя завтра',
    invasions: 'Сегодня отбито уже 6 вторжений — Навь вернётся завтра',
    catches: 'Сегодня поймано уже 120 духов — обереги отдохнут до завтра',
  },
  dayNeed(ctx, key) { this.need((this.dayc(ctx)[key] || 0) < Rules.DAILY[key], this.DAY_MSG[key]); },
  dayAdd(ctx, key) { const c = this.dayc(ctx); c[key] = (c[key] || 0) + 1; },
  // Канал чата: общий, торговля, разломы, помощь или своя дружина
  chatChannel(ch) {
    if (ch === 'clan') { this.need(S.d.clan, 'Канал дружины — для тех, кто в дружине'); return 'clan:' + S.d.clan; }
    this.need(['all', 'trade', 'raid', 'help'].includes(ch), 'Такого канала нет');
    return ch;
  },
  // Текст сообщения: без разметки и управляющих символов; грубые слова — звёздочками
  chatClean(s) {
    const t = String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/[<>`\\]/g, '').trim().replace(/\s+/g, ' ').slice(0, Rules.CHAT.MAX);
    return t.replace(/[a-zа-яё]+/gi, w => (this.rude(w) ? '*'.repeat(Math.min(w.length, 6)) : w));
  },
  // Грубое слово: начинается с корня (или приставка + корень). Только начало слова — чтобы не задеть
  // «корабля», «ребус», «застрахуй», «себастьян»
  RUDE_ROOTS: ['хуй', 'хуе', 'хуя', 'хуи', 'хую', 'пизд', 'еба', 'ебу', 'ебл', 'ебн', 'бля', 'мудак', 'мудил', 'пидор', 'пидар', 'гандон', 'шлюх', 'залуп'],
  RUDE_PRE: ['', 'на', 'по', 'за', 'от', 'вы', 'до', 'рас', 'раз', 'у', 'об', 'при', 'пере', 'не'],
  rude(w) {
    const x = w.toLowerCase().replace(/ё/g, 'е');
    if (/^(сука|суки|суке|суку|сучка|сучара)$/.test(x)) return true;
    return this.RUDE_PRE.some(p => this.RUDE_ROOTS.some(r => x.startsWith(p + r)));
  },
  // Дух покидает коллекцию (посылка, аукцион): амулет — в сумку, из команды и спутников убирается
  detachSpirit(sp) {
    if (sp.amulet) S.unequip(sp);
    S.d.spirits.splice(S.d.spirits.indexOf(sp), 1);
    if (S.d.buddy && S.d.buddy.uid === sp.uid) { S.d.buddy = null; Bus.emit('buddyChanged'); }
    S.d.team = S.d.team.filter(u => u !== sp.uid);
  },
  // Упаковка духа для посылки и лота аукциона — и обратно (уровень — не выше доступного получателю)
  packSpirit(sp) { return { s: sp.sid, l: sp.lvl, i: sp.iv, y: sp.shiny ? 1 : 0, d: sp.dark ? 1 : 0, n: sp.nick || '', p: sp.purified ? 1 : 0, m: sp.move2 ? 1 : 0 }; },
  unpackSpirit(p, ctx, from) {
    this.need(p && SP[p.s], 'Посылка повреждена');
    const iv = (Array.isArray(p.i) ? p.i : []).slice(0, 3).map(v => U.clamp(Math.floor(+v) || 0, 0, 15));
    while (iv.length < 3) iv.push(0);
    const sp = { uid: U.uid(), sid: p.s, lvl: U.clamp(Math.min(+p.l || 1, S.maxLvl()), 1, 50), iv, t: ctx.now, fav: false, nick: this.cleanText(p.n, 16) || null };
    if (from) sp.from = this.cleanText(from, 20);
    if (p.y) sp.shiny = true;
    if (p.d) sp.dark = true;
    if (p.p) sp.purified = true;
    if (p.m) sp.move2 = true;
    return sp;
  },
  // Текст от игрока (имя, кличка духа): без управляющих символов и символов разметки, пробелы схлопнуты
  cleanText(s, max) { return String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/[<>"'`&\\]/g, '').trim().replace(/\s+/g, ' ').slice(0, max); },
  safeLook(lk) {
    lk = lk || {};
    if (!(LOOK.cloak.some(x => x.c === lk.cloak) && LOOK.eyes.some(x => x.c === lk.eyes) && LOOK.emblem.some(x => x.id === lk.emblem))) return null;
    const out = { cloak: lk.cloak, eyes: lk.eyes, emblem: lk.emblem };
    if (lk.skin !== 'hood' && LOOK.skin.some(x => x.id === lk.skin)) out.skin = lk.skin; // 4.6: облик-скин, фон, рамка
    if (lk.bg !== 'night' && LOOK.bg.some(x => x.id === lk.bg)) out.bg = lk.bg;
    if (lk.frame !== 'none' && LOOK.frame.some(x => x.id === lk.frame)) out.frame = lk.frame;
    return out;
  },
  // 3.21: текущие данные Ловчего из его сохранения — только проверенные значения (попадают в разметку)
  brief(b) {
    if (!b) return null;
    return { name: this.cleanText(b.name, 20) || 'Ловчий', lvl: U.clamp(Math.floor(+b.level) || 1, 1, MAX_LEVEL), clan: CLANS[b.clan] ? b.clan : null, look: this.safeLook(b.look) };
  },
  roomMember() {
    const team = S.team();
    return { pid: S.d.pid, name: String(S.d.name).slice(0, 20), look: this.safeLook(S.d.look), lvl: S.d.level, power: team.reduce((a, x) => a + S.power(x), 0), sid: team[0] ? team[0].sid : null };
  },
  roomView(r) {
    return { code: r.code, status: r.status, rift: r.rift, isHost: r.host_pid === S.d.pid, hpMul: 1 + 0.8 * (r.members.length - 1),
      members: r.members.map((m, i) => ({ name: String(m.name || 'Ловчий').slice(0, 20), look: m.look, lvl: m.lvl, power: m.power, sid: m.sid, host: i === 0, me: m.pid === S.d.pid })) };
  },
  // Защитники Капища в бою — три сильнейших
  holdTeam(hold) {
    return hold.holders.filter(h => h && h.sp && SP[h.sp.sid]).map((h, i) => this.cleanSpirit(h.sp, i))
      .map(x => ({ x, p: S.power(x) })).sort((a, b) => b.p - a.p).slice(0, 3).map(o => o.x);
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
      if (!S.d.tradeClosed) await this.H.tradeReclaimAll.call(this, {}, ctx); // 3.18: вернуть неоткрытые посылки
      return { ok: true };
    },
    async newGame(a, ctx) {
      this.need(!S.d, 'Прогресс уже есть');
      const name = this.cleanText(a.name, 16);
      this.need(name.length >= 1, 'Назови себя');
      this.need(this.STARTERS.includes(a.starter), 'Выбери первого духа');
      S.newGame(name, a.starter);
      await ctx.env.registerPid(S.d.pid);
      ctx.full = true;
      const invitedBy = await this.invite(ctx, String(a.ref || ''));
      return { ok: true, invitedBy };
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
      const i = (st.n - 1) % Rules.STREAK.length;
      const got = S.giveRewards({ ...Rules.STREAK[i], zlat: i === Rules.STREAK.length - 1 ? Rules.ZLAT.streak7 : Rules.ZLAT.streak });
      if (i === Rules.STREAK.length - 1 && S.d.cocoons.length < 9) {
        S.d.cocoons.push({ id: U.uid(), km: 10, walked: 0, inc: S.incubating() < 3 });
        got.push({ k: 'cocoon', n: 1, label: 'Кокон 10 км' });
      }
      // Дальний пропуск дня — чтобы Разломы были доступны и тем, кому до Капища далеко
      if ((S.d.items.farpass || 0) < Rules.FAR.KEEP) got.push(...S.giveRewards({ farpass: 1 }));
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
        this.dayNeed(ctx, 'catches');
        this.need(Rules.THROWABLE.some(k => S.d.items[k] > 0), 'Обереги закончились! Загляни к роднику.');
        const p = this.here(ctx);
        const e = W.spawnsAround(p.lat, p.lng, W.INTERACT + 80).find(x => x.id === a.id && x.type === 'spirit' && !x.tut);
        this.need(e, 'Дух уже растворился в воздухе…');
        this.near(ctx, e.lat, e.lng, W.INTERACT);
        return this.openEnc(ctx, { mode: 'wild', sid: e.sid, lvl: e.lvl, shiny: e.shiny, boost: e.boost, seed: e.id, spawnId: e.id });
      }
      if (kind === 'tut') {
        const st = S.tutAt(); // 4.0: учебный дух — тот, что нужен на текущем шаге обучения
        this.need(st && st.kind === 'catch', 'Учебный дух сейчас не нужен');
        return this.openEnc(ctx, { mode: 'tut', sid: st.sid, lvl: 2, seed: 'tut' + S.d.tut });
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
        return this.openEnc(ctx, { mode: 'story', sid: S.d.storyGift, lvl: Math.min(25, S.maxLvl()), seed: 'gift' + S.d.created });
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
      // 4.1: бросок с полётом занимает больше секунды — сильно чаще бросает только программа (запас — на скачки сети)
      this.need(!e.lastThrow || ctx.now - e.lastThrow >= 400, 'Слишком быстро — дух ещё не опомнился');
      e.lastThrow = ctx.now;
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
      // точность броска присылает телефон: если «отличные» броски подозрительно часты (больше 70% из 20+ последних) — без бонуса
      let bonus = Rules.ringBonus(a.ring);
      const th = ctx.srv.thr || (ctx.srv.thr = { n: 0, g: 0 });
      if (bonus.great && th.n >= 20 && th.g / th.n > 0.7) bonus = Rules.ringBonus(null);
      th.n++; if (bonus.great) th.g++;
      if (th.n >= 60) { th.n = Math.round(th.n / 2); th.g = Math.round(th.g / 2); }
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
      if (e.mode === 'wild') this.dayAdd(ctx, 'catches');
      const isNew = S.addSpirit(sp);
      J.add('catch', { sid: s.id, shiny: !!sp.shiny, dark: !!sp.dark, power: S.power(sp) });
      const rw = Rules.catchReward({ mode: e.mode, sid: e.sid, isNew, ringXp: bonus.xp, throws: e.throws, shiny: sp.shiny, boost: e.boost });
      S.addEssence(s.fam, rw.ess);
      S.d.sparks += rw.sparks;
      S.d.stats.caught++;
      S.addXP(rw.xp);
      S.progress('catch', 1); S.progress('catchEl', 1, { el: s.el });
      if (s.land) S.progress('land', 1); // дух родной земли — для Летописи
      if (e.mode === 'tut') S.tutAdvance('catch');
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
      this.dayNeed(ctx, 'springs');
      const e = W.springFor(p, 0);
      this.need(!e.invaded, 'Родник захвачен Навью');
      this.need(e.ready, 'Родник ещё набирает силу');
      S.d.springs[p.id] = ctx.now;
      this.dayAdd(ctx, 'springs');
      const { loot, cocoon } = W.springLoot(p.id);
      const got = S.giveRewards({ ...loot, xp: 50 }, false); // добыча родника соблюдает лимит сумки
      S.d.stats.springs++;
      S.progress('spring', 1);
      let coc = null;
      if (cocoon) { coc = { id: U.uid(), km: cocoon, walked: 0, inc: S.incubating() < 3 }; S.d.cocoons.push(coc); }
      S.tutAdvance('spring');
      // поручение: первое за день — всегда, дальше — в каждом четвёртом роднике
      let task = null;
      if (!S.d.tut && S.d.tasks.length < TASK_LIMIT && (S.d.taskDay !== U.today(ctx.now) || Math.random() < 0.25)) {
        S.d.taskDay = U.today(ctx.now);
        task = S.makeTask();
        S.d.tasks.push(task);
      }
      return { got, cocoon: coc, task, full: S.bagCount() >= S.bagLimit() };
    },
    incense(a, ctx) {
      this.need(!S.incenseActive(), 'Ладан ещё горит');
      this.need(S.useItem('incense'), 'Ладана нет');
      S.d.incenseUntil = ctx.now + 30 * 60000;
      return { until: S.d.incenseUntil };
    },
    // Выбросить предметы из сумки (освободить место)
    discard(a) {
      const k = String(a.k || ''), have = (ITEMS[k] && S.d.items[k]) || 0, n = Math.floor(+a.n);
      this.need(have > 0, 'Такого предмета в сумке нет');
      this.need(n >= 1 && n <= have, `Можно выбросить от 1 до ${have}`);
      S.d.items[k] -= n;
      return { k, n, left: S.d.items[k] };
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
      const sp = this.spirit(a.uid), v = this.cleanText(a.nick, 16);
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
      const k = LOOK.skin.find(x => x.id === (L.skin || 'hood')), g = LOOK.bg.find(x => x.id === (L.bg || 'night')), fr = LOOK.frame.find(x => x.id === (L.frame || 'none'));
      this.need(c && e && m && k && g && fr, 'Такого облика нет');
      this.need(!k.shop || S.d.owned[`skin:${k.id}`], 'Этот облик продаётся в Гардеробе');
      this.need(!g.shop || S.d.owned[`bg:${g.id}`], 'Этот фон продаётся в Гардеробе');
      this.need(!fr.shop || S.d.owned[`frame:${fr.id}`], 'Эта рамка продаётся в Гардеробе');
      this.need((g.lvl || 1) <= lvl && (fr.lvl || 1) <= lvl, 'Этот облик ещё не открыт');
      this.need(c.lvl <= lvl && e.lvl <= lvl && m.lvl <= lvl, 'Этот облик ещё не открыт');
      this.need(!m.league || League.st().best >= m.league, 'Венец Лиги — награда за ранг «Хранитель Лиги»');
      this.need(!m.story || S.d.story.ch >= m.story, 'Эта эмблема — награда за Летопись');
      this.need((!c.shop && !c.pass) || S.d.owned[c.c], c.shop ? 'Этот плащ продаётся в Лавке Ордена' : 'Этот плащ — награда Золотой тропы');
      this.need(!m.pass || S.d.owned[m.id], 'Знак Тропы — награда Золотой тропы');
      S.d.look = { cloak: c.c, eyes: e.c, emblem: m.id };
      if (k.id !== 'hood') S.d.look.skin = k.id;
      if (g.id !== 'night') S.d.look.bg = g.id;
      if (fr.id !== 'none') S.d.look.frame = fr.id;
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
      return { got: S.giveRewards({ ...Rules.QUEST_BONUS, xp: 1000, zlat: Rules.ZLAT.questBonus }) };
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
      S.progress('task', 1);
      S.d.taskMeet.push(m);
      return { got, meet: m };
    },
    taskDrop(a) {
      const n = S.d.tasks.length;
      S.d.tasks = S.d.tasks.filter(x => x.id !== a.id);
      this.need(S.d.tasks.length < n, 'Поручение не найдено');
      return { ok: true };
    },
    // 4.0: сцены и разделы обучения засчитываются строго по порядку; пропустить обучение нельзя
    tutNext(a) {
      const st = S.tutAt();
      this.need(st, 'Обучение уже пройдено');
      this.need((st.kind === 'talk' || st.kind === 'ui') && st.id === a.id, 'Сначала выполни текущий шаг обучения');
      return S.tutAdvance(st.kind, st.id);
    },
    tutFinish() { this.need(false, 'Обучение нельзя пропустить'); },
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
      // совместный бой: число союзников и место разлома — из комнаты на сервере, а не со слов телефона
      let coop = null, rift = a.rift;
      if (a.coop && a.coop.code) {
        const room = await ctx.env.roomGet(String(a.coop.code).toUpperCase());
        this.need(room && room.status === 'started' && ctx.now - Date.parse(room.started_at) < 10 * 60000, 'Совместный бой не найден — начните заново');
        this.need(room.members.some(m => m.pid === S.d.pid), 'Ты не в этом разломе');
        coop = { host: room.host_pid === S.d.pid, allies: U.clamp(room.members.length - 1, 0, 3), code: room.code };
        rift = { id: room.rift.poi, lat: room.rift.lat, lng: room.rift.lng, name: room.rift.place };
      }
      const p = await this.place(rift, ctx, 'shrine');
      const hour = Math.floor(ctx.now / 3600000);
      // бой мог начаться за минуту до смены часа
      const r = W.riftFor(p, 0, hour) || (ctx.now % 3600000 < 90000 ? W.riftFor(p, 0, hour - 1) : null);
      this.need(r, 'Разлом уже закрылся');
      this.need(p.verified || r.tier < 3, 'Легендарные разломы открываются только у мест, известных Ордену');
      this.need(!S.d.rifts[r.id], 'Этот разлом ты уже закрыл');
      // дальний бой: вместо того чтобы подойти — грамота Ордена (до Rules.FAR.R от игрока)
      const far = !coop && !!a.far;
      if (far) {
        this.near(ctx, p.lat, p.lng, Rules.FAR.R);
        this.need((S.d.items.farpass || 0) > 0, 'Нужен Дальний пропуск — его можно купить в Лавке');
      } else if (!coop || coop.host) this.near(ctx, p.lat, p.lng, W.BATTLE_R);
      const team = S.team();
      this.need(team.length, 'Нужна команда');
      this.dayNeed(ctx, 'raids'); // до списания Дальнего пропуска
      this.limit(ctx, 'raid', 30, 3600000);
      if (far) S.d.items.farpass--;
      ctx.srv.battle = { type: 'raid', rid: r.id, poi: p, tier: r.tier, boss: r.boss, start: ctx.now, team: team.map(x => x.uid), coop, waters: 0, far };
      return { rid: r.id, tier: r.tier, boss: r.boss, far };
    },
    /* ----- совместный разлом: комната на сервере ----- */
    async roomCreate(a, ctx) {
      const p = await this.place(a.rift, ctx, 'shrine');
      const r = W.riftFor(p, 0, Math.floor(ctx.now / 3600000));
      this.need(r, 'Разлом уже закрылся');
      this.need(p.verified || r.tier < 3, 'Легендарные разломы открываются только у мест, известных Ордену');
      this.need(!S.d.rifts[r.id], 'Этот разлом ты уже закрыл');
      this.near(ctx, p.lat, p.lng, W.BATTLE_R);
      this.limit(ctx, 'room', 20, 3600000);
      const rift = { id: r.id, tier: r.tier, boss: r.boss, endsAt: r.endsAt, poi: p.id, lat: p.lat, lng: p.lng, place: p.name }; // как у разлома на карте
      for (let i = 0; i < 5; i++) {
        const code = U.code(5, this.ROOM_ALPHA);
        const room = await ctx.env.roomCreate({ code, host_pid: S.d.pid, rift, members: [this.roomMember()] });
        if (room) return this.roomView(room);
      }
      this.fail('Не получилось создать разлом — попробуй ещё раз');
    },
    async roomJoin(a, ctx) {
      const code = String(a.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      this.need(code.length === 5, 'Код разлома — 5 символов');
      this.limit(ctx, 'roomJoin', 60, 3600000);
      const r = await ctx.env.roomJoin(code, this.roomMember());
      this.need(r && !r.error, (r && r.error) || 'Разлом с таким кодом не найден');
      return this.roomView(r);
    },
    async roomState(a, ctx) {
      const r = await ctx.env.roomGet(String(a.code || '').toUpperCase());
      this.need(r && r.status !== 'closed', 'Хозяин закрыл разлом');
      this.need(r.members.some(m => m.pid === S.d.pid), 'Ты больше не в этом разломе');
      return this.roomView(r);
    },
    async roomStart(a, ctx) {
      const code = String(a.code || '').toUpperCase(), r = await ctx.env.roomGet(code);
      this.need(r && r.host_pid === S.d.pid, 'Начать бой может только хозяин разлома');
      this.need(r.members.length >= 2, 'Ждём хотя бы одного друга');
      const s = await ctx.env.roomStart(code, S.d.pid);
      this.need(s, 'Бой уже начался');
      return this.roomView(s);
    },
    async roomLeave(a, ctx) {
      const code = String(a.code || '').toUpperCase();
      if (/^[A-Z0-9]{5}$/.test(code)) await ctx.env.roomLeave(code, S.d.pid);
      return { ok: true };
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
      this.dayAdd(ctx, 'raids');
      S.progress('raid', 1);
      if (b.coop && b.coop.allies > 0) S.progress('coop', 1);
      const rw = S.giveRewards({ xp: Math.round(1000 * tier * (allies ? 1.25 : 1)), sparks: 400 * tier, charm: 5, honey: 2 + tier, water: 2, charm2: tier >= 2 ? 3 : 0 });
      const am = S.rollAmulet([0.25, 0.4, 0.7][tier - 1], b.rid);
      if (am) rw.push({ k: 'amulet', n: 1, label: AMULETS[am].name });
      const bonus = Math.max(0, Math.floor((90 - t) / 15));
      const charms = Raid.TIER[tier].charms + bonus + (Ev.cur.rifts ? 3 : 0) + allies * 2;
      const shiny = U.h('rshiny', b.rid, S.d.created) < Sky.shinyRate(1 / 20);
      ctx.srv.raidWin = { rid: b.rid, sid: b.boss, lvl: Math.min(Raid.TIER[tier].lvl, S.maxLvl()), // не выше доступного игроку уровня
        charms, shiny, boost: Sky.boosted(SP[b.boss].el) };
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
      // Капище держит дружина — сражаться придётся с её защитниками (тремя сильнейшими)
      const hold = await ctx.env.holdGet(p.id);
      this.need(!hold || !S.d.clan || hold.clan !== S.d.clan, 'Капище держит твоя дружина — здесь можно поставить защитника');
      const ht = hold ? this.holdTeam(hold) : [], foe = ht.length ? ht : null;
      this.dayNeed(ctx, 'duels');
      this.limit(ctx, 'duel', 40, 3600000);
      ctx.srv.battle = { type: 'duel', id: e.id, tier: e.tier, name: e.name, start: ctx.now, team: team.map(x => x.uid),
        foe, hold: hold ? { clan: hold.clan, ver: hold.ver } : null };
      return { id: e.id, tier: e.tier, foe, clan: hold ? hold.clan : null, holders: hold ? hold.holders.map(h => String(h.name || 'Ловчий').slice(0, 20)) : null };
    },
    async duelEnd(a, ctx) {
      const b = this.endBattle(ctx, 'duel');
      if (!a.win) return { win: false };
      const e = { id: b.id, tier: b.tier, name: b.name };
      this.plausibleDuel(ctx, b, b.foe || W.guardian(e).team, SHRINE_TIERS[e.tier].speed);
      const T = SHRINE_TIERS[e.tier], mul = Ev.duelMul(), t = e.tier;
      S.d.shrines[e.id] = U.today();
      let freed = false;
      if (b.hold) {
        freed = await ctx.env.holdDefeat(e.id, b.hold.ver); // защитники могли смениться за время боя — тогда Капище не освобождается
        if (freed) S.d.stats.freed = (S.d.stats.freed || 0) + 1;
      }
      J.add('duel', { name: e.name, guard: b.hold ? CLANS[b.hold.clan].name : W.guardian(e).name, tier: t });
      S.d.stats.duels++;
      this.dayAdd(ctx, 'duels');
      S.progress('duel', 1);
      const rw = S.giveRewards({ xp: T.xp * mul, sparks: T.sparks * mul, charm: 5 * mul, honey: t * mul, water: 2, charm2: t >= 2 ? 3 * mul : 0, charm3: t === 3 ? 2 * mul : 0 });
      const am = S.rollAmulet(0.15 * t, e.id);
      if (am) rw.push({ k: 'amulet', n: 1, label: AMULETS[am].name });
      return { win: true, rw, freed, clan: b.hold ? b.hold.clan : null };
    },

    /* ----- Лавка Ордена ----- */
    shopBuy(a, ctx) {
      const today = U.today(ctx.now), id = String(a.id || '');
      let it;
      if (a.deal) {
        it = Rules.shopDeal(today);
        this.need(S.d.shop.deal !== today, 'Товар дня уже куплен — завтра будет новый');
      } else if (/^(skin|bg|frame):/.test(id)) { // 4.6: облик-скин, фон или рамка из Гардероба
        const [kind, key] = id.split(':'), x = LOOK[kind].find(k => k.id === key && k.shop);
        this.need(x, 'Такого облика нет');
        this.need(!S.d.owned[id], 'Это уже твоё');
        it = { id, name: `${{ skin: 'Облик', bg: 'Фон', frame: 'Рамка' }[kind]} «${x.name}»`, cur: 'zlat', price: x.shop, look: id };
      } else if (id.startsWith('look:')) {
        const key = id.slice(5), x = LOOK.cloak.find(c => c.c === key && c.shop);
        this.need(x, 'Такого товара нет');
        this.need(!S.d.owned[key], 'Этот плащ уже твой');
        it = { id, name: `Плащ «${x.name}»`, cur: 'zlat', price: x.shop, look: key };
      } else {
        it = Rules.SHOP.find(x => x.id === id);
        this.need(it, 'Такого товара нет');
      }
      if (it.bag) {
        this.need(S.d.bagExtra < Rules.BAG_MAX_UP, 'Сумка уже расширена до предела');
        it = { ...it, price: Rules.bagPrice(S.d.bagExtra) };
      }
      this.need(!it.lvl || S.d.level >= it.lvl, `Откроется на ${it.lvl} уровне`);
      if (it.cocoon) this.need(S.d.cocoons.length < 9, 'Коконов уже девять — выведи кого-нибудь');
      if (it.give) {
        const n = Object.values(it.give).reduce((s, x) => s + x, 0);
        this.need(S.bagCount() + n <= S.bagLimit(), 'Сумка полна — освободи место или расширь её');
      }
      const key = it.cur === 'sparks' ? 'sparks' : 'zlat';
      this.need((S.d[key] || 0) >= it.price, key === 'sparks' ? 'Не хватает искр' : 'Не хватает златников');
      this.limit(ctx, 'shop', 120, 3600000);
      S.d[key] -= it.price;
      let got;
      if (it.bag) { S.d.bagExtra++; got = [{ k: 'bag', n: Rules.BAG_STEP, label: 'Мест в сумке' }]; }
      else got = this.grant({ ...(it.give || {}), cocoon: it.cocoon || 0, amulet: it.amulet ? 1 : 0, look: it.look || null });
      if (a.deal) S.d.shop.deal = today;
      J.add('shop', { name: it.name });
      return { got, price: it.price, cur: key };
    },

    // Казна: начислить оплаченные наборы златников. Номер оплаты запоминается в прогрессе (paid) —
    // так начисление ровно одно, даже если отметка в таблице payments не успела записаться
    async payClaim(a, ctx) {
      const rows = await ctx.env.paidList();
      S.d.paid = S.d.paid || {};
      let zlat = 0;
      const packs = [];
      for (const r of rows) {
        if (S.d.paid[r.id]) continue;
        S.d.paid[r.id] = 1;
        zlat += r.zlat; packs.push(r.pack);
      }
      if (zlat) {
        S.d.zlat = (S.d.zlat || 0) + zlat;
        J.add('pay', { zlat });
      }
      if (rows.length) ctx.after.push(() => ctx.env.payCredited(rows.map(r => r.id)));
      return { zlat, n: packs.length };
    },
    // Обменник: искры → златники, по курсу Rules.EXCHANGE и не больше DAY обменов в день
    exchange(a, ctx) {
      const E = Rules.EXCHANGE, today = U.today(ctx.now), n = Math.floor(+a.n);
      const ex = S.d.shop.ex && S.d.shop.ex.day === today ? S.d.shop.ex : (S.d.shop.ex = { day: today, n: 0 });
      this.need(n >= 1 && ex.n + n <= E.DAY, ex.n >= E.DAY ? 'Обменник на сегодня закрыт — приходи завтра' : `Сегодня можно обменять ещё ${E.DAY - ex.n} раз`);
      this.need(S.d.sparks >= E.SPARKS * n, 'Не хватает искр');
      S.d.sparks -= E.SPARKS * n;
      S.d.zlat = (S.d.zlat || 0) + E.ZLAT * n;
      ex.n += n;
      J.add('exchange', { sparks: E.SPARKS * n, zlat: E.ZLAT * n });
      return { sparks: E.SPARKS * n, zlat: E.ZLAT * n, left: E.DAY - ex.n };
    },

    /* ----- Сезонная тропа ----- */
    passClaim(a, ctx) {
      const P = this.passState(ctx), lvl = a.lvl | 0, track = a.track === 'gold' ? 'gold' : 'free';
      this.need(lvl >= 1 && lvl <= Rules.PASS.LEVELS, 'Такой ступени нет');
      this.need(Rules.passLevel(P.pts) >= lvl, 'Ступень ещё не пройдена');
      this.need(track === 'free' || P.gold, 'Сначала открой Золотую тропу');
      this.need(!P.got[track].includes(lvl), 'Награда уже получена');
      P.got[track].push(lvl);
      let rw = Rules.passReward(track, lvl);
      if (rw.cocoon && S.d.cocoons.length >= 9) rw = { ...rw, cocoon: 0, zlat: (rw.zlat || 0) + 40 }; // коконов некуда класть — златниками
      return { got: this.grant(rw) };
    },
    passGold(a, ctx) {
      const P = this.passState(ctx);
      this.need(!P.gold, 'Золотая тропа уже открыта');
      this.need(S.d.zlat >= Rules.PASS.GOLD, `Нужно ${Rules.PASS.GOLD} златников`);
      S.d.zlat -= Rules.PASS.GOLD;
      P.gold = true;
      J.add('passGold', { season: P.season });
      return { ok: true };
    },

    /* ----- дружины ----- */
    clanJoin(a) {
      this.need(S.d.level >= CLAN_LEVEL, `Дружину можно выбрать с ${CLAN_LEVEL} уровня`);
      this.need(!S.d.clan, 'Дружина уже выбрана');
      this.need(CLANS[a.clan], 'Такой дружины нет');
      S.d.clan = a.clan;
      J.add('clan', { clan: a.clan });
      return { clan: a.clan };
    },
    // Поставить духа защищать Капище: свободное — после своей победы здесь сегодня, своей дружины — если есть место
    async shrineDefend(a, ctx) {
      this.need(S.d.clan, 'Сначала выбери дружину');
      const p = await this.place(a.shrine, ctx, 'shrine');
      this.need(p.verified, 'Защищать можно только Капища, известные Ордену');
      this.near(ctx, p.lat, p.lng, W.BATTLE_R);
      const sp = this.spirit(a.uid);
      const hold = await ctx.env.holdGet(p.id);
      if (!hold) this.need(S.d.shrines[p.id] === U.today(ctx.now), 'Сначала победи на этом Капище');
      else {
        this.need(hold.clan === S.d.clan, 'Капище держит другая дружина — сначала победи её защитников');
        this.need(hold.holders.length < HOLD_MAX, `На Капище уже ${HOLD_MAX} защитников`);
        this.need(!hold.holders.some(h => h.pid === S.d.pid), 'Твой защитник уже стоит здесь');
      }
      this.need((await ctx.env.myHolds(S.d.pid)) < HOLD_MY_MAX, `Твои защитники уже стоят на ${HOLD_MY_MAX} Капищах`);
      this.limit(ctx, 'defend', 30, 3600000);
      const ok = await ctx.env.holdDefend(p.id, p.lat, p.lng, S.d.clan, { pid: S.d.pid, name: S.d.name, sp: this.cleanSpirit(sp, 0), t: ctx.now });
      this.need(ok, 'Капище только что изменилось — открой его заново');
      S.d.stats.defends = (S.d.stats.defends || 0) + 1;
      S.d.guards.push({ id: p.id, name: String(p.name || 'Капище').slice(0, 80), sid: sp.sid, t: ctx.now });
      S.progress('defend', 1);
      J.add('defend', { name: p.name, sid: sp.sid });
      return { ok: true, clan: S.d.clan };
    },
    // Мои защитники: где стоят; кого прогнали — вернулись домой с искрами за время на посту
    async myGuards(a, ctx) {
      if (!S.d.clan) return { list: [], back: [], got: [] };
      const list = await ctx.env.myHoldsList(S.d.pid);
      const standing = new Set(list.map(x => x.id)), back = [];
      S.d.guards = S.d.guards.filter(g => {
        if (standing.has(g.id)) return true;
        back.push({ ...g, hours: Math.round(Math.max(0, ctx.now - g.t) / 360000) / 10 });
        return false;
      });
      // защитники, поставленные до 3.6, — тоже в список
      list.forEach(x => { if (!S.d.guards.some(g => g.id === x.id)) S.d.guards.push({ id: x.id, name: x.name, sid: x.sid, t: x.t || ctx.now }); });
      let got = [];
      if (back.length) {
        got = S.giveRewards({ sparks: back.reduce((s, g) => s + Rules.guardPay(g.hours), 0) });
        back.forEach(g => J.add('guardBack', { name: g.name, sid: g.sid, hours: g.hours }));
      }
      return { list, back, got };
    },
    // Сколько Капищ держит каждая дружина: по всей России и в округе ~5 км
    async clanStats(a, ctx) {
      const p = ctx.pos;
      const box = p ? [p.lat - 0.045, p.lng - 0.045 / Math.max(0.2, Math.cos(p.lat * Math.PI / 180)), p.lat + 0.045, p.lng + 0.045 / Math.max(0.2, Math.cos(p.lat * Math.PI / 180))] : null;
      return { all: await ctx.env.clanCounts(null), near: box ? await ctx.env.clanCounts(box) : null };
    },
    // Дань: раз в день — за каждое Капище, где стоит мой защитник
    async tribute(a, ctx) {
      this.need(S.d.clan, 'Сначала выбери дружину');
      if (S.d.tributeDay === U.today(ctx.now)) return { n: 0, already: true };
      const n = Math.min(HOLD_MY_MAX, await ctx.env.myHolds(S.d.pid));
      S.d.tributeDay = U.today(ctx.now);
      if (!n) return { n: 0, got: [] };
      return { n, got: S.giveRewards({ sparks: TRIBUTE.sparks * n, charm: TRIBUTE.charm * n, zlat: Rules.ZLAT.tribute * n }) };
    },

    async invStart(a, ctx) {
      const p = await this.place(a.spring, ctx, 'spring');
      const e = W.springFor(p, 0);
      this.need(e.invaded, 'Родник свободен');
      this.near(ctx, p.lat, p.lng, W.INTERACT);
      const team = S.team();
      this.need(team.length, 'Нужна команда');
      this.dayNeed(ctx, 'invasions');
      this.limit(ctx, 'inv', 40, 3600000);
      ctx.srv.battle = { type: 'inv', invId: e.invId, name: e.name, start: ctx.now, team: team.map(x => x.uid) };
      return { invId: e.invId };
    },
    invEnd(a, ctx) {
      const b = this.endBattle(ctx, 'inv');
      if (!a.win) return { win: false };
      const g = W.grunt({ invId: b.invId });
      this.plausibleDuel(ctx, b, g.team, Duel.FOE.invasion.speed);
      S.d.freed[b.invId] = true;
      S.d.stats.invasions++;
      this.dayAdd(ctx, 'invasions');
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
      if (win) { const o = League.opponent(run.k); this.plausibleDuel(ctx, b, o.team, o.T.speed); }
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
      // строка таблицы сезона — после каждой победы (3.21.1: писалась только в конце турнира, и звёзды брошенного турнира в неё не попадали)
      if (a.board !== false && (gained || last)) ctx.after.push(() => ctx.env.leagueScore({ season: L.season, name: S.d.name, stars: L.stars, rank: rNew, level: S.d.level, look: S.d.look }));
      if (last) {
        J.add('league', { won: run.won, rank: LEAGUE_RANKS[rNew].name });
        L.run = null;
      } else {
        run.k++;
        ctx.srv.battle = { type: 'league', k: run.k, start: ctx.now, team: run.team };
      }
      return res;
    },

    /* ----- обмен духами ----- */
    // 3.18: передача духов по коду закрыта — ею обходили аукцион (и его комиссию). Духов продают на аукционе
    async tradeGive() { this.need(false, 'Передача духов по коду закрыта — выставь духа на Аукцион'); },
    async tradeReceive() { this.need(false, 'Передача духов по коду закрыта — продавай и покупай духов на Аукционе'); },
    // Неоткрытые посылки, отправленные до 3.18, возвращаются отправителю (при загрузке игры, один раз)
    async tradeReclaimAll(a, ctx) {
      if (S.d.tradeClosed || !(S.d.sent || []).length) { S.d.tradeClosed = 1; return 0; }
      let n = 0;
      for (const s of S.d.sent) {
        const m = String(s.code || '').match(/DUH2\.([A-Z2-9]{10})/);
        if (!m) continue;
        const t = await ctx.env.tradeReclaim(m[1], S.d.pid);
        if (t && t.spirit && SP[t.spirit.s]) { S.addSpirit(this.unpackSpirit(t.spirit, ctx)); n++; }
      }
      S.d.sent = [];
      S.d.tradeClosed = 1;
      if (n) Bus.emit('toast', { text: `Неоткрытые посылки вернулись: духов — ${n}. Передача духов закрыта, теперь есть Аукцион.`, cls: 'good' });
      return n;
    },

    /* ----- аукцион духов ----- */
    // Поиск лотов: фильтры по виду, стихии, редкости, оценке Ордена и каждому показателю, силе, цене и валюте
    async auctionFind(a, ctx) {
      this.need(S.d.level >= Rules.AUCTION.LEVEL, `Аукцион открывается с ${Rules.AUCTION.LEVEL} уровня Ловчего`);
      this.limit(ctx, 'aucFind', 240, 3600000);
      const f = a.f || {}, n = (v, max) => U.clamp(Math.floor(+v) || 0, 0, max);
      const q = { from: n(a.from, 3000), sort: ['new', 'cheap', 'dear', 'power', 'iv'].includes(f.sort) ? f.sort : 'new', notPid: S.d.pid };
      const sids = Array.isArray(f.sids) ? f.sids.filter(s => SP[s]).slice(0, 60) : null;
      if (sids && sids.length) q.sids = sids;
      if (ELEMENTS[f.el]) q.el = f.el;
      if (RARITY[f.rar]) q.rar = +f.rar;
      if (f.cur === 'sparks' || f.cur === 'zlat') q.cur = f.cur;
      if (f.shiny) q.shiny = true;
      q.minIv = n(f.minIv, 100); q.minA = n(f.minA, 15); q.minD = n(f.minD, 15); q.minS = n(f.minS, 15);
      q.minPower = n(f.minPower, 1e6); q.minLvl = n(f.minLvl, 50); q.maxPrice = n(f.maxPrice, 1e9);
      const rows = await ctx.env.lotsFind(q);
      return { lots: rows.filter(r => r.spirit && SP[r.spirit.s]) };
    },
    // Мои лоты; заодно — выручка за проданные и возврат снятых и истёкших духов
    async auctionMine(a, ctx) {
      this.need(S.d.level >= Rules.AUCTION.LEVEL, `Аукцион открывается с ${Rules.AUCTION.LEVEL} уровня Ловчего`);
      const got = await this.auctionSettle(ctx);
      return { got, lots: await ctx.env.lotsMine(S.d.pid), open: await ctx.env.lotsOpenCount(S.d.pid) };
    },
    async auctionSell(a, ctx) {
      const A = Rules.AUCTION;
      this.need(S.d.level >= A.LEVEL, `Аукцион открывается с ${A.LEVEL} уровня Ловчего`);
      const sp = this.spirit(a.uid);
      this.need(S.d.spirits.length > 1, 'Нельзя продать последнего духа');
      this.need(!sp.fav, 'Сними с духа отметку «избранный», чтобы продать его');
      const cur = a.cur === 'zlat' ? 'zlat' : 'sparks', price = Math.floor(+a.price);
      this.need(price >= A.MIN[cur] && price <= A.MAX[cur], `Цена — от ${U.fmtNum(A.MIN[cur])} до ${U.fmtNum(A.MAX[cur])} ${cur === 'zlat' ? 'златников' : 'искр'}`);
      this.need(await ctx.env.lotsOpenCount(S.d.pid) < A.MAX_OPEN, `Одновременно можно выставить не больше ${A.MAX_OPEN} духов`);
      this.limit(ctx, 'aucSell', A.PER_DAY, 86400000);
      const iv = sp.iv, s = SP[sp.sid];
      const lot = await ctx.env.lotCreate({ seller_pid: S.d.pid, seller_name: S.d.name, spirit: this.packSpirit(sp), sid: sp.sid, el: s.el, rar: s.rar,
        lvl: sp.lvl, power: S.power(sp), iv_pct: S.ivPct(sp), iv_a: iv[0], iv_d: iv[1], iv_s: iv[2], shiny: !!sp.shiny, cur, price,
        expires_at: new Date(ctx.now + A.HOURS * 3600000).toISOString() });
      this.detachSpirit(sp);
      J.add('auction', { sid: sp.sid, dir: 'sell', cur, price });
      return { id: lot.id, fee: Rules.auctionFee(price) };
    },
    async auctionBuy(a, ctx) {
      this.need(S.d.level >= Rules.AUCTION.LEVEL, `Аукцион открывается с ${Rules.AUCTION.LEVEL} уровня Ловчего`);
      const id = String(a.id || '');
      const pre = await ctx.env.lotGet(id);
      this.need(pre, 'Лот не найден');
      this.need(pre.seller_pid !== S.d.pid, 'Это твой собственный лот');
      S.d.auc = S.d.auc || { got: {}, back: {}, paid: {} };
      this.need(!S.d.auc.got[id], 'Этот лот уже у тебя');
      // деньги проверяем ДО покупки, по цене из базы (цену с телефона не принимаем): иначе лот
      // пометился бы проданным, а покупатель ушёл бы ни с чем
      const cur = pre.cur === 'zlat' ? 'zlat' : 'sparks';
      this.need((S.d[cur] || 0) >= pre.price, cur === 'zlat' ? 'Не хватает златников' : 'Не хватает искр');
      this.limit(ctx, 'aucBuy', 60, 3600000);
      const lot = await ctx.env.lotBuy(id, S.d.pid, S.d.name);
      this.need(lot && lot.price === pre.price && lot.cur === pre.cur, 'Лот уже купили или сняли с продажи');
      S.d[cur] -= lot.price;
      const sp = this.unpackSpirit(lot.spirit, ctx, lot.seller_name);
      const isNew = S.addSpirit(sp);
      S.d.auc.got[lot.id] = ctx.now;
      S.d.stats.traded++; // знак «Щедрая душа»
      ctx.after.push(() => ctx.env.lotsDone([lot.id], 'delivered'));
      J.add('auction', { sid: sp.sid, dir: 'buy', cur, price: lot.price, who: sp.from });
      return { uid: sp.uid, isNew, cur, price: lot.price };
    },
    async auctionCancel(a, ctx) {
      const lot = await ctx.env.lotCancel(String(a.id || ''), S.d.pid);
      this.need(lot, 'Лот уже продан или снят');
      S.d.auc = S.d.auc || { got: {}, back: {}, paid: {} };
      if (!S.d.auc.back[lot.id]) { S.addSpirit(this.unpackSpirit(lot.spirit, ctx)); S.d.auc.back[lot.id] = ctx.now; }
      ctx.after.push(() => ctx.env.lotsDone([lot.id], 'settled'));
      return { sid: lot.spirit.s };
    },

    /* ----- чат Ордена ----- */
    async chatList(a, ctx) {
      const ch = this.chatChannel(a.ch);
      this.limit(ctx, 'chatRead', 1200, 3600000);
      const rows = await ctx.env.chatList(ch, Math.max(0, Math.floor(+a.after) || 0));
      // 3.21: имя, уровень и дружина в сообщении — на момент отправки; отдаём текущие (a.who — Ловчие уже показанных сообщений)
      const ask = [...new Set(rows.map(m => m.pid).concat(Array.isArray(a.who) ? a.who.slice(0, 40).map(String) : []))].filter(p => this.PID.test(p)).slice(0, 90);
      const who = {};
      try { const cur = await ctx.env.briefByPid(ask); Object.keys(cur).forEach(p => { const w = this.brief(cur[p]); who[p] = { name: w.name, lvl: w.lvl, clan: w.clan }; }); } catch (e) { /* покажем данные из сообщений */ }
      return { ch: a.ch, who, msgs: rows.map(m => { const w = who[m.pid]; return { id: m.id, pid: m.pid, name: w ? w.name : m.name, lvl: w ? w.lvl : m.lvl, clan: w ? w.clan : m.clan, text: m.text, t: Date.parse(m.created_at), mine: m.pid === S.d.pid }; }) };
    },
    async chatSend(a, ctx) {
      const C = Rules.CHAT, ch = this.chatChannel(a.ch);
      this.need(S.d.level >= C.LEVEL, `Писать в чат можно с ${C.LEVEL} уровня Ловчего — читать можно уже сейчас`);
      const text = this.chatClean(a.text);
      this.need(text.length >= 1, 'Напиши сообщение');
      this.need(!/(https?:\/\/|www\.|t\.me\/|\b[a-z0-9-]{2,}\.(ru|com|net|org|me|io|su|xyz|рф)\b)/i.test(text), 'Ссылки в чате запрещены — так безопаснее для всех');
      const c = ctx.srv.chat = ctx.srv.chat || { t: 0, last: '' };
      this.need(ctx.now - c.t >= C.GAP, 'Не так быстро — подожди пару секунд');
      this.need(!(text === c.last && ctx.now - c.t < 60000), 'Это сообщение уже отправлено');
      this.limit(ctx, 'chat', C.PER_DAY, 86400000);
      c.t = ctx.now; c.last = text;
      const m = await ctx.env.chatInsert({ channel: ch, pid: S.d.pid, name: S.d.name, lvl: S.d.level, clan: S.d.clan || null, text });
      return { msg: { id: m.id, pid: m.pid, name: m.name, lvl: m.lvl, clan: m.clan, text: m.text, t: Date.parse(m.created_at), mine: true } };
    },
    async chatReport(a, ctx) {
      const id = Math.floor(+a.id);
      this.need(id > 0, 'Сообщение не найдено');
      this.limit(ctx, 'chatReport', 30, 86400000);
      await ctx.env.chatReport(id, S.d.pid);
      return { ok: true };
    },

    /* ----- карточка Ловчего и таблица Лиги (3.21) ----- */
    // Открытая карточка любого Ловчего (из чата или таблицы Лиги): облик, уровень, дружина, Лига, успехи, спутник
    async playerCard(a, ctx) {
      const pid = String(a.pid || '');
      this.need(this.PID.test(pid), 'Ловчий не найден');
      this.limit(ctx, 'card', 150, 3600000);
      const s = await ctx.env.friendSave(pid);
      this.need(s && s.data, 'Ловчий не найден — возможно, он давно не заходил в игру');
      const d = s.data, num = (v, max) => U.clamp(Math.floor(+v) || 0, 0, max);
      const b = this.brief(d), st = d.stats || {}, L = d.league || {};
      const spirits = Array.isArray(d.spirits) ? d.spirits.filter(x => x && SP[x.sid]) : [];
      const bud = d.buddy && spirits.find(x => x.uid === d.buddy.uid);
      const buddy = bud ? this.cleanSpirit(bud, 0) : null, best = this.topSpirits(d, 1)[0] || null;
      const stars = L.season === League.season() ? num(L.stars, 1000) : Math.floor(num(L.stars, 1000) / 2); // новый сезон — звёзды пополам
      const ago = s.seen ? ctx.now - Date.parse(s.seen) : Infinity;
      const mine = S.d.friends.some(x => x.id === pid), theirs = (Array.isArray(d.friends) ? d.friends : []).some(x => x && x.id === S.d.pid);
      const sp = x => x && { sid: x.sid, lvl: x.lvl, shiny: x.shiny, dark: x.dark, nick: x.nick, power: S.power(x) };
      return {
        pid, name: b.name, lvl: b.lvl, clan: b.clan, look: b.look, me: pid === S.d.pid,
        seen: ago < 15 * 60000 ? 'now' : ago < 86400000 ? 'today' : ago < 7 * 86400000 ? 'week' : 'long',
        days: +d.created > 0 ? Math.max(1, Math.ceil((ctx.now - Math.min(+d.created, ctx.now)) / 86400000)) : 0,
        dex: Object.values(d.dex || {}).filter(x => x && x.caught).length, caught: num(st.caught, 1e7), km: U.clamp(+st.km || 0, 0, 1e5),
        raids: num(st.raids, 1e6), duels: num(st.duels, 1e6), medals: Object.values(d.medals || {}).filter(t => t >= 3).length,
        league: { stars, rank: League.rank(stars), best: num(L.best, LEAGUE_RANKS.length - 1) },
        buddy: sp(buddy), best: sp(best),
        friend: mine && theirs ? 'mutual' : mine ? 'sent' : theirs ? 'wants' : null,
      };
    },
    // Таблица сезона Лиги с текущими уровнями, именами и обликами (user_id наружу не отдаём)
    // tier — тройка лучших в ранге игрока (пьедестал), rows — топ-50 сезона
    async leagueTop(a, ctx) {
      this.limit(ctx, 'leagueTop', 1500, 3600000);
      const L = League.st(), season = L.season, rank = League.rank(L.stars);
      let r = await ctx.env.leagueTop(season, rank);
      // своя строка отстала от звёзд (турниры, брошенные до 3.21.1) — поправить и перечитать
      const mine = r.rows.find(x => x.me), had = mine ? mine.stars : r.me ? r.me.stars : null;
      if (a.board !== false && L.stars > 0 && had !== L.stars) {
        await ctx.env.leagueScore({ season, name: S.d.name, stars: L.stars, rank, level: S.d.level, look: S.d.look });
        r = await ctx.env.leagueTop(season, rank);
      }
      const row = x => {
        const b = this.brief(x.cur) || this.brief({ name: x.name, level: x.level, look: x.look });
        return { pid: x.pid, name: b.name, lvl: b.lvl, clan: b.clan, look: b.look, stars: U.clamp(x.stars | 0, 0, 1000), rank: U.clamp(x.rank | 0, 0, LEAGUE_RANKS.length - 1), me: !!x.me };
      };
      return { season, total: r.total | 0, me: r.me ? { place: r.me.place | 0, stars: r.me.stars | 0 } : null, rows: r.rows.map(row), tier: { rank, rows: (r.tier || []).map(row) } };
    },

    /* ----- друзья и подарки ----- */
    async friendAdd(a, ctx) {
      const pid = String(a.pid || '');
      this.need(this.PID.test(pid), 'В коде ошибка');
      this.need(pid !== S.d.pid, 'Это твой собственный код дружбы');
      this.limit(ctx, 'friendAdd', 30, 3600000); // перебор кодов дружбы
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
      const look = this.safeLook(d.look);
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
      this.plausibleDuel(ctx, b, b.foe, Duel.FOE.spar.speed);
      const f = S.d.friends.find(x => x.id === b.pid);
      this.need(f, 'Такого друга нет');
      J.add('spar', { name: f.name });
      // полная награда — раз в день за каждого друга и не больше 3 раз в день всего (3.19: было без общего предела —
      // с 50 друзьями до 25 000 ✦ и 40 000 опыта в день)
      const sd = S.d.sparDay = S.d.sparDay && S.d.sparDay.day === U.today(ctx.now) ? S.d.sparDay : { day: U.today(ctx.now), n: 0 };
      if (f.spar === U.today(ctx.now) || sd.n >= 3) { f.spar = U.today(ctx.now); return { win: true, rw: S.giveRewards({ xp: 100 }), practice: true }; }
      sd.n++;
      f.spar = U.today(ctx.now);
      S.progress('spar', 1);
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
      const inbox = (await ctx.env.giftsTo(S.d.pid)).map(g => ({ id: g.id, from: g.from_pid, name: g.from_name, t: g.created_at, invite: !!g.invite }));
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
      S.progress('gift', 1);
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
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-duholov-access',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
// 4.3: запросы разных игроков выполняются одновременно — у каждого свои поля игрового кода (GameCore.isolate)
GameCore.isolate(new AsyncLocalStorage());
const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
const verCmp = (a, b) => {
  const pa = String(a || '0').split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return Math.sign(d); }
  return 0;
};

/* ---------- Казна: покупка златников через ЮKassa ----------
   Секреты задаёт владелец в Supabase → Edge Functions → Secrets:
     YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY — магазин ЮKassa (для проверки — тестовый магазин);
     PAY_RECEIPT=on — передавать чек по 54-ФЗ (тогда игрок вводит почту);
     PAY_RETURN_URL — куда вернуть игрока после оплаты (по умолчанию paid.html сайта игры).
   Телефону не верим: пакет, сумма и число златников — из Rules.PAY; итог платежа сервер
   сам спрашивает у ЮKassa (sync), а начисляет его действие игры payClaim. */
const PAY = {
  shop: Deno.env.get('YOOKASSA_SHOP_ID') || '',
  key: Deno.env.get('YOOKASSA_SECRET_KEY') || '',
  receipt: Deno.env.get('PAY_RECEIPT') === 'on',
  ret: Deno.env.get('PAY_RETURN_URL') || 'https://duholov.ru/paid.html',
};
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;
async function yk(method, path, body, idem) {
  const r = await fetch('https://api.yookassa.ru/v3' + path, {
    method,
    headers: { Authorization: 'Basic ' + btoa(`${PAY.shop}:${PAY.key}`), 'Content-Type': 'application/json', ...(idem ? { 'Idempotence-Key': idem } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`ЮKassa ${r.status}: ${j.description || j.code || ''}`);
  return j;
}
const Pay = {
  on() { return !!(PAY.shop && PAY.key); },
  async handle(uid, op, a) {
    if (op === 'info') return { ok: true, on: this.on(), receipt: PAY.receipt };
    if (!this.on()) return { ok: false, error: 'Покупки пока не подключены' };
    try {
      if (op === 'create') return await this.create(uid, a || {});
      if (op === 'sync') return await this.sync(uid);
    } catch (e) {
      console.error('Казна:', String(e));
      return { ok: false, error: 'Платёжный сервис не ответил — попробуй чуть позже' };
    }
    return { ok: false, error: 'Неизвестная операция' };
  },
  async create(uid, a) {
    const pack = Rules.PAY.find(p => p.id === a.pack);
    if (!pack) return { ok: false, error: 'Такого набора нет' };
    const email = String(a.email || '').trim();
    if (PAY.receipt && !EMAIL.test(email)) return { ok: false, error: 'Укажи почту — на неё придёт чек' };
    const since = new Date(Date.now() - 3600000).toISOString();
    const { count } = await db.from('payments').select('id', { count: 'exact', head: true }).eq('user_id', uid).gte('created_at', since);
    if ((count || 0) >= 10) return { ok: false, error: 'Слишком много попыток оплаты — подожди немного' };
    const amount = pack.rub.toFixed(2), title = `${pack.zlat} златников — «Духолов»`;
    const row = must(await db.from('payments').insert({ user_id: uid, pack: pack.id, zlat: pack.zlat, amount }).select('id').single());
    const p = await yk('POST', '/payments', {
      amount: { value: amount, currency: 'RUB' },
      capture: true,
      confirmation: { type: 'redirect', return_url: PAY.ret },
      description: title,
      metadata: { order_id: row.id, user_id: uid, pack: pack.id },
      ...(PAY.receipt ? { receipt: { customer: { email }, items: [{ description: title, quantity: '1.00', amount: { value: amount, currency: 'RUB' },
        vat_code: 1, payment_mode: 'full_payment', payment_subject: 'service' }] } } : {}),
    }, row.id);
    must(await db.from('payments').update({ ext_id: p.id, status: p.status, updated_at: new Date().toISOString() }).eq('id', row.id));
    if (!p.confirmation || !p.confirmation.confirmation_url) return { ok: false, error: 'Платёжный сервис не выдал страницу оплаты' };
    return { ok: true, order: row.id, url: p.confirmation.confirmation_url };
  },
  // Спросить у ЮKassa итог незавершённых оплат игрока (за 3 дня); остальные доводит уведомление ЮKassa (notify)
  async sync(uid) {
    const since = new Date(Date.now() - 3 * 86400000).toISOString();
    const rows = must(await db.from('payments').select('id, ext_id, amount, status, credited').eq('user_id', uid)
      .in('status', ['pending', 'waiting_for_capture']).not('ext_id', 'is', null).gte('created_at', since).limit(20)) || [];
    for (const r of rows) await this.refresh(r);
    const { count } = await db.from('payments').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('status', 'succeeded').eq('credited', false);
    const { count: open } = await db.from('payments').select('id', { count: 'exact', head: true }).eq('user_id', uid).in('status', ['pending', 'waiting_for_capture']).gte('created_at', since);
    return { ok: true, paid: count || 0, open: open || 0 };
  },
  // Итог платежа — только из ответа ЮKassa (платёж должен быть именно этим заказом и на эту сумму)
  async refresh(r) {
    const p = await yk('GET', `/payments/${encodeURIComponent(r.ext_id)}`);
    const same = p.metadata && p.metadata.order_id === r.id && p.amount && (+p.amount.value).toFixed(2) === (+r.amount).toFixed(2) && p.amount.currency === 'RUB';
    let status = !same ? 'failed' : p.status === 'succeeded' && p.paid ? 'succeeded' : p.status;
    if (same && p.refunded_amount && +p.refunded_amount.value > 0) status = 'refunded';
    if (status === r.status) return status;
    // возврат уже начисленного платежа — владельцу видно в журнале (списывать златники вручную по обращению)
    if (status === 'refunded' && r.credited) console.error(`Казна: возврат начисленного платежа ${r.id}`);
    // вернувшийся платёж больше не начисляется; начисленный остаётся «начисленным»
    must(await db.from('payments').update({ status, method: p.payment_method ? String(p.payment_method.type).slice(0, 40) : null, updated_at: new Date().toISOString() }).eq('id', r.id));
    return status;
  },
  // 4.1: HTTP-уведомление ЮKassa (Интеграция → HTTP-уведомления: https://api.duholov.ru/functions/v1/game/yookassa).
  // Телу уведомления не верим — берём из него только номер платежа и сами спрашиваем ЮKassa.
  async notify(body) {
    if (!this.on() || !body || !body.object) return;
    const ext = String((String(body.event || '').startsWith('refund.') ? body.object.payment_id : body.object.id) || '').slice(0, 64);
    if (!/^[0-9a-f-]{20,64}$/i.test(ext)) return;
    const r = must(await db.from('payments').select('id, ext_id, amount, status, credited').eq('ext_id', ext).maybeSingle());
    if (r) await this.refresh(r);
  },
};

/* ---------- Вход через сервисы (3.27): Google, Яндекс, VK, Telegram ----------
   Игрок всегда сначала гость (анонимный вход Supabase). «Войти через …» — сервер сам проверяет вход у сервиса и:
   · если этот вход ещё ни к кому не привязан — привязывает его к текущему игроку (таблица auth_links) и превращает
     гостя в постоянную учётную запись (служебная почта в зоне .invalid — письма на неё доставить нельзя);
   · если привязан к другому игроку (новое устройство) — выдаёт одноразовый вход в его учётную запись (token_hash).
   Настройки владелец задаёт в Supabase → Edge Functions → Secrets (публичные номера приложений уходят клиенту, секреты — нет):
     GOOGLE_CLIENT_ID · YANDEX_CLIENT_ID · VK_CLIENT_ID · TELEGRAM_BOT_TOKEN. Не задан — сервиса нет в списке. */
const AUTHP = {
  google: Deno.env.get('GOOGLE_CLIENT_ID') || '',
  yandex: Deno.env.get('YANDEX_CLIENT_ID') || '',
  vk: Deno.env.get('VK_CLIENT_ID') || '',
  telegram: Deno.env.get('TELEGRAM_BOT_TOKEN') || '',
};
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const getJson = async (url, init) => {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(12000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error_description || j.error || `ответ ${r.status}`);
  return j;
};
const Auth = {
  // публичные параметры для кнопок входа: номера приложений (не секреты)
  providers() {
    const p = {};
    if (AUTHP.google) p.google = { client_id: AUTHP.google };
    if (AUTHP.yandex) p.yandex = { client_id: AUTHP.yandex };
    if (AUTHP.vk) p.vk = { client_id: AUTHP.vk };
    if (AUTHP.telegram) p.telegram = { bot_id: AUTHP.telegram.split(':')[0] };
    return p;
  },
  // Проверка входа у сервиса → { sub, name }
  async verify(provider, a) {
    if (provider === 'google') {
      const t = await getJson('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(String(a.id_token || '')));
      if (t.aud !== AUTHP.google || !['accounts.google.com', 'https://accounts.google.com'].includes(t.iss) || +t.exp * 1000 < Date.now()) throw new Error('вход Google не подтверждён');
      if (!a.nonce || t.nonce !== a.nonce) throw new Error('вход Google не подтверждён');
      return { sub: String(t.sub), name: t.name || t.email || 'Google' };
    }
    if (provider === 'yandex') {
      const t = await getJson('https://login.yandex.ru/info?format=json', { headers: { Authorization: 'OAuth ' + String(a.access_token || '') } });
      if (String(t.client_id) !== AUTHP.yandex || !t.id) throw new Error('вход Яндекса не подтверждён'); // токен выдан именно нашему приложению
      return { sub: String(t.id), name: t.display_name || t.real_name || t.login || 'Яндекс' };
    }
    if (provider === 'vk') {
      const form = new URLSearchParams({ grant_type: 'authorization_code', code: String(a.code || ''), code_verifier: String(a.code_verifier || ''),
        client_id: AUTHP.vk, device_id: String(a.device_id || ''), redirect_uri: String(a.redirect_uri || ''), state: String(a.state || '') });
      const t = await getJson('https://id.vk.com/oauth2/auth', { method: 'POST', body: form });
      if (!t.user_id || !t.access_token) throw new Error('вход VK не подтверждён');
      let name = 'VK';
      try {
        const u = await getJson('https://id.vk.com/oauth2/user_info', { method: 'POST', body: new URLSearchParams({ client_id: AUTHP.vk, access_token: t.access_token }) });
        if (u.user) name = [u.user.first_name, u.user.last_name].filter(Boolean).join(' ') || name;
      } catch { /* имя не обязательно */ }
      return { sub: String(t.user_id), name };
    }
    if (provider === 'telegram') {
      // подпись Telegram Login: HMAC-SHA256 от строк «ключ=значение» (по алфавиту, без hash) на ключе SHA256(токена бота)
      const d = a.data && typeof a.data === 'object' ? a.data : {};
      if (!d.id || !d.hash || !d.auth_date) throw new Error('вход Telegram не подтверждён');
      if (Date.now() / 1000 - +d.auth_date > 86400) throw new Error('вход Telegram устарел — попробуй ещё раз');
      const check = Object.keys(d).filter(k => k !== 'hash').sort().map(k => `${k}=${d[k]}`).join('\n');
      const secret = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(AUTHP.telegram));
      const key = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const sig = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(check)));
      if (sig !== String(d.hash)) throw new Error('вход Telegram не подтверждён');
      return { sub: String(d.id), name: [d.first_name, d.last_name].filter(Boolean).join(' ') || (d.username ? '@' + d.username : 'Telegram') };
    }
    throw new Error('Такого способа входа нет');
  },
  async handle(uid, op, a) {
    if (op === 'info') {
      const links = must(await db.from('auth_links').select('provider, name, created_at').eq('user_id', uid)) || [];
      return { ok: true, providers: this.providers(), links };
    }
    // 4.1: удалить учётную запись целиком (152-ФЗ): прогресс, способы входа, лоты, место в Лиге — всё, что связано
    // с ней в базе, удаляется вместе с ней; записи о платежах остаются без привязки (налоговый учёт, 018)
    if (op === 'delete') {
      if (a.confirm !== 'УДАЛИТЬ') return { ok: false, error: 'Нужно подтверждение' };
      const { error } = await db.auth.admin.deleteUser(uid);
      if (error) { console.error('Удаление учётной записи:', error.message); return { ok: false, error: 'Не получилось удалить — попробуй ещё раз' }; }
      return { ok: true };
    }
    if (op !== 'signin') return { ok: false, error: 'Неизвестная операция' };
    const provider = String(a.provider || '');
    if (!this.providers()[provider]) return { ok: false, error: 'Этот способ входа пока не подключён' };
    let who;
    try { who = await this.verify(provider, a.proof || {}); }
    catch (e) { console.warn('Вход:', provider, String(e)); return { ok: false, error: `Не удалось войти: ${String(e.message || e).slice(0, 120)}` }; }
    const name = String(who.name).slice(0, 60);
    const row = must(await db.from('auth_links').select('user_id').eq('provider', provider).eq('subject', who.sub).maybeSingle());
    if (row && row.user_id === uid) return { ok: true, linked: true, already: true };
    if (row) {
      // вход уже привязан к другому Ловчему — одноразовый вход в его учётную запись
      const { data: u, error } = await db.auth.admin.getUserById(row.user_id);
      if (error || !u || !u.user || !u.user.email) return { ok: false, error: 'Учётная запись не найдена' };
      const { data: link, error: le } = await db.auth.admin.generateLink({ type: 'magiclink', email: u.user.email });
      if (le || !link || !link.properties) return { ok: false, error: 'Не удалось войти — попробуй ещё раз' };
      const s = must(await db.from('saves').select('name:data->name, level:data->level').eq('user_id', row.user_id).maybeSingle());
      return { ok: true, switch: true, token_hash: link.properties.hashed_token, player: s ? { name: String(s.name || 'Ловчий').slice(0, 20), level: +s.level || 1 } : null };
    }
    // новый вход — привязываем к текущему игроку; гость становится постоянной учётной записью
    const { data: me } = await db.auth.admin.getUserById(uid);
    if (me && me.user && !me.user.email) {
      const { error } = await db.auth.admin.updateUserById(uid, { email: `u${uid.replace(/-/g, '')}@users.duholov.invalid`, email_confirm: true });
      if (error) { console.error('Вход: почта', String(error.message)); return { ok: false, error: 'Не удалось сохранить вход — попробуй ещё раз' }; }
    }
    const { error: ie } = await db.from('auth_links').insert({ provider, subject: who.sub, user_id: uid, name });
    if (ie) return { ok: false, error: /duplicate/i.test(ie.message) ? 'Этот вход уже привязан — попробуй ещё раз' : 'Не удалось сохранить вход' };
    return { ok: true, linked: true, name };
  },
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
      return must(await db.from('gifts').select('id, from_pid, from_name, created_at, invite:contents->invite').eq('to_pid', pid).is('opened_at', null).order('created_at').limit(50)) || [];
    },
    // Сколько подарков «за приглашение» уже получил игрок
    async invitesTo(pid) {
      const { count, error } = await db.from('gifts').select('id', { count: 'exact', head: true }).eq('to_pid', pid).eq('contents->>invite', '1');
      if (error) throw new Error(error.message);
      return count || 0;
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
    // Чат: последние 50 сообщений канала (или новые после after); отправка; жалоба (после 3 — сообщение скрыто)
    async chatList(channel, after) {
      let q = db.from('chat_messages').select('id, pid, name, lvl, clan, text, created_at').eq('channel', channel).eq('hidden', false);
      if (after) q = q.gt('id', after);
      const rows = must(await q.order('id', { ascending: false }).limit(50)) || [];
      return rows.reverse();
    },
    async chatInsert(row) {
      if (Math.random() < 0.02) await db.from('chat_messages').delete().lt('created_at', new Date(Date.now() - 7 * 86400000).toISOString()); // старше недели
      return must(await db.from('chat_messages').insert({ ...row, uid }).select('id, pid, name, lvl, clan, text, created_at').single());
    },
    async chatReport(id, pid) {
      const { error } = await db.from('chat_reports').insert({ message_id: id, reporter: pid });
      if (error && !/duplicate/i.test(error.message)) throw new Error(error.message);
      const { count } = await db.from('chat_reports').select('message_id', { count: 'exact', head: true }).eq('message_id', id);
      if ((count || 0) >= 3) must(await db.from('chat_messages').update({ hidden: true }).eq('id', id));
      return count || 0;
    },
    // 3.21: текущие имя, уровень, дружина и облик Ловчих — прямо из их сохранений (по user_id или по коду игрока)
    async briefByUid(uids) {
      const out = {};
      if (!uids.length) return out;
      const rows = must(await db.from('saves').select('user_id, name:data->name, level:data->level, clan:data->clan, look:data->look').in('user_id', uids)) || [];
      rows.forEach(r => { out[r.user_id] = { name: r.name, level: r.level, clan: r.clan, look: r.look }; });
      return out;
    },
    async briefByPid(pids) {
      const out = {};
      if (!pids.length) return out;
      const ps = must(await db.from('players').select('pid, user_id').in('pid', pids)) || [];
      const by = await this.briefByUid(ps.map(p => p.user_id));
      ps.forEach(p => { if (by[p.user_id]) out[p.pid] = by[p.user_id]; });
      return out;
    },
    // Таблица сезона: топ-50 с текущими данными Ловчих, сколько всего участников и место игрока, если он ниже
    // tier — тройка лучших в ранге rank (пьедестал)
    async leagueTop(season, rank) {
      const q = () => db.from('league_scores').select('user_id, name, stars, rank, level, look, updated_at').eq('season', season);
      const rows = must(await q().order('stars', { ascending: false }).order('updated_at', { ascending: true }).limit(50)) || [];
      const tier = must(await q().eq('rank', rank | 0).order('stars', { ascending: false }).order('updated_at', { ascending: true }).limit(3)) || [];
      const uids = [...new Set(rows.concat(tier).map(r => r.user_id))];
      const ps = uids.length ? must(await db.from('players').select('pid, user_id').in('user_id', uids)) || [] : [];
      const pid = {}; ps.forEach(p => { pid[p.user_id] = p.pid; });
      const cur = await this.briefByUid(uids);
      const view = r => ({ ...r, pid: pid[r.user_id] || null, me: r.user_id === uid, cur: cur[r.user_id] || null });
      const { count: total, error } = await db.from('league_scores').select('user_id', { count: 'exact', head: true }).eq('season', season);
      if (error) throw new Error(error.message);
      let me = null;
      if (!rows.some(r => r.user_id === uid)) {
        const my = must(await db.from('league_scores').select('stars, updated_at').eq('season', season).eq('user_id', uid).maybeSingle());
        if (my) {
          const { count } = await db.from('league_scores').select('user_id', { count: 'exact', head: true }).eq('season', season)
            .or(`stars.gt.${my.stars | 0},and(stars.eq.${my.stars | 0},updated_at.lt."${my.updated_at}")`);
          me = { place: (count || 0) + 1, stars: my.stars };
        }
      }
      return { rows: rows.map(view), tier: tier.map(view), total: total || 0, me };
    },
    // 3.18: неоткрытую посылку забирает сам отправитель (передача духов закрыта)
    async tradeReclaim(code, pid) {
      const rows = must(await db.from('trades').update({ taken_by: pid, taken_at: new Date().toISOString() }).eq('code', code).eq('from_pid', pid).is('taken_by', null).select('*'));
      return rows && rows[0] || null;
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
    // Дружины: кто держит Капище, поставить защитника, освободить после победы, сколько Капищ держит игрок
    async holdGet(poi) {
      const r = must(await db.from('shrine_holds').select('clan, holders, ver').eq('poi_id', poi).maybeSingle());
      return r && Array.isArray(r.holders) && r.holders.length ? r : null;
    },
    async holdDefend(poi, lat, lng, clan, holder) { return !!must(await db.rpc('shrine_defend', { p_poi: poi, p_lat: lat, p_lng: lng, p_clan: clan, p_holder: holder })); },
    async holdDefeat(poi, ver) { return !!must(await db.rpc('shrine_defeat', { p_poi: poi, p_ver: ver })); },
    async myHolds(pid) {
      const { count, error } = await db.from('shrine_holds').select('poi_id', { count: 'exact', head: true }).contains('holders', JSON.stringify([{ pid }]));
      if (error) throw new Error(error.message);
      return count || 0;
    },
    // Капища, где стоят защитники игрока: название — из таблицы мест
    async myHoldsList(pid) {
      const rows = must(await db.from('shrine_holds').select('poi_id, lat, lng, holders').contains('holders', JSON.stringify([{ pid }])).limit(HOLD_MY_MAX + 5)) || [];
      const ids = rows.map(r => r.poi_id);
      const names = ids.length ? must(await db.from('pois').select('id, name').in('id', ids)) || [] : [];
      return rows.map(r => {
        const h = (r.holders || []).find(x => x.pid === pid) || {};
        const p = names.find(x => x.id === r.poi_id);
        return { id: r.poi_id, name: p ? p.name : 'Капище', lat: r.lat, lng: r.lng, sid: h.sp && h.sp.sid, sp: h.sp || null, t: h.t || null, n: (r.holders || []).length };
      });
    },
    // Сколько Капищ держит каждая дружина (во всей стране или в прямоугольнике [s, w, n, e])
    async clanCounts(box) {
      const out = {};
      for (const k of Object.keys(CLANS)) {
        let q = db.from('shrine_holds').select('poi_id', { count: 'exact', head: true }).eq('clan', k).neq('holders', '[]');
        if (box) q = q.gte('lat', box[0]).lte('lat', box[2]).gte('lng', box[1]).lte('lng', box[3]);
        const { count, error } = await q;
        if (error) throw new Error(error.message);
        out[k] = count || 0;
      }
      return out;
    },
    // Совместные разломы: комнаты (код, участники, начало боя)
    async roomCreate(row) {
      await db.from('raid_rooms').delete().lt('created_at', new Date(Date.now() - 86400000).toISOString()); // старые комнаты
      const { data, error } = await db.from('raid_rooms').insert(row).select('*').maybeSingle();
      if (error) { if (/duplicate/i.test(error.message)) return null; throw new Error(error.message); }
      return data;
    },
    async roomGet(code) { return must(await db.from('raid_rooms').select('*').eq('code', code).maybeSingle()); },
    async roomJoin(code, member) { return must(await db.rpc('raid_room_join', { p_code: code, p_member: member })); },
    async roomStart(code, pid) {
      const rows = must(await db.from('raid_rooms').update({ status: 'started', started_at: new Date().toISOString() })
        .eq('code', code).eq('host_pid', pid).eq('status', 'lobby').select('*'));
      return rows && rows[0] || null;
    },
    async roomLeave(code, pid) { must(await db.rpc('raid_room_leave', { p_code: code, p_pid: pid })); },
    // Аукцион. Смена статуса — одним условным update (гонка двух покупателей невозможна);
    // если update ничего не нашёл, но лот уже «мой» и не выдан — возвращаем его (повтор запроса после сбоя сохранения)
    async lotCreate(row) { return must(await db.from('auction_lots').insert({ ...row, seller_uid: uid }).select('*').single()); },
    async lotsFind(f) {
      let q = db.from('auction_lots').select('id, seller_name, spirit, sid, lvl, power, iv_pct, iv_a, iv_d, iv_s, shiny, cur, price, expires_at')
        .eq('status', 'open').gt('expires_at', new Date().toISOString());
      if (f.sids) q = q.in('sid', f.sids);
      if (f.el) q = q.eq('el', f.el);
      if (f.rar) q = q.eq('rar', f.rar);
      if (f.cur) q = q.eq('cur', f.cur);
      if (f.shiny) q = q.eq('shiny', true);
      for (const [k, col] of [['minIv', 'iv_pct'], ['minA', 'iv_a'], ['minD', 'iv_d'], ['minS', 'iv_s'], ['minPower', 'power'], ['minLvl', 'lvl']]) if (f[k]) q = q.gte(col, f[k]);
      if (f.maxPrice) q = q.lte('price', f.maxPrice);
      if (f.notPid) q = q.neq('seller_pid', f.notPid);
      const [col, asc] = { new: ['created_at', false], cheap: ['price', true], dear: ['price', false], power: ['power', false], iv: ['iv_pct', false] }[f.sort] || ['created_at', false];
      return must(await q.order(col, { ascending: asc }).order('id').range(f.from, f.from + 29)) || [];
    },
    async lotsMine(pid) {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      return must(await db.from('auction_lots').select('id, spirit, sid, lvl, power, iv_pct, cur, price, status, buyer_name, created_at, expires_at, closed_at, settled')
        .eq('seller_pid', pid).or(`status.eq.open,created_at.gte."${since}"`).order('created_at', { ascending: false }).limit(40)) || [];
    },
    async lotsOpenCount(pid) {
      const { count, error } = await db.from('auction_lots').select('id', { count: 'exact', head: true }).eq('seller_pid', pid).eq('status', 'open');
      if (error) throw new Error(error.message);
      return count || 0;
    },
    async lotBuy(id, pid, name) {
      if (!UUID.test(id)) return null;
      const now = new Date().toISOString();
      const rows = must(await db.from('auction_lots').update({ status: 'sold', buyer_pid: pid, buyer_name: String(name).slice(0, 20), closed_at: now })
        .eq('id', id).eq('status', 'open').gt('expires_at', now).neq('seller_pid', pid).select('*'));
      if (rows && rows[0]) return rows[0];
      return must(await db.from('auction_lots').select('*').eq('id', id).eq('status', 'sold').eq('buyer_pid', pid).eq('delivered', false).maybeSingle());
    },
    async lotGet(id) { return UUID.test(id) ? must(await db.from('auction_lots').select('id, seller_pid, status, cur, price, expires_at').eq('id', id).maybeSingle()) : null; },
    async lotCancel(id, pid) {
      if (!UUID.test(id)) return null;
      const rows = must(await db.from('auction_lots').update({ status: 'cancelled', closed_at: new Date().toISOString() })
        .eq('id', id).eq('seller_pid', pid).eq('status', 'open').select('*'));
      if (rows && rows[0]) return rows[0];
      return must(await db.from('auction_lots').select('*').eq('id', id).eq('seller_pid', pid).eq('status', 'cancelled').eq('settled', false).maybeSingle());
    },
    // Итоги для продавца: истёкшие лоты закрываются; проданные, снятые и истёкшие — ещё не рассчитанные
    async lotsToSettle(pid) {
      const now = new Date().toISOString();
      must(await db.from('auction_lots').update({ status: 'expired', closed_at: now }).eq('seller_pid', pid).eq('status', 'open').lt('expires_at', now));
      return must(await db.from('auction_lots').select('*').eq('seller_pid', pid).eq('settled', false).in('status', ['sold', 'cancelled', 'expired']).limit(50)) || [];
    },
    async lotsDone(ids, field) { if (ids.length) must(await db.from('auction_lots').update({ [field]: true }).in('id', ids)); },
    // Казна: оплаченные, но ещё не начисленные наборы златников; отметка «начислено»
    async paidList() { return must(await db.from('payments').select('id, pack, zlat').eq('user_id', uid).eq('status', 'succeeded').eq('credited', false).limit(50)) || []; },
    async payCredited(ids) { must(await db.from('payments').update({ credited: true, updated_at: new Date().toISOString() }).eq('user_id', uid).in('id', ids)); },
    async deleteSave() {
      must(await db.from('saves').delete().eq('user_id', uid));
      must(await db.from('save_srv').delete().eq('user_id', uid));
    },
  };
}

// Защита от перебора и наводнения запросами: не больше FLOOD запросов в минуту от одного игрока
// и не больше BAD_TOKENS неверных входов в минуту с одного адреса (в пределах экземпляра функции)
const FLOOD = 150, BAD_TOKENS = 20;
// Замок игрока на время запроса: сам истекает через LOCK_MS (если функция упала); ждём его до LOCK_TRIES × 200 мс
const LOCK_MS = 30000, LOCK_TRIES = 25;
const hits = new Map(), badTokens = new Map(), errHits = new Map();
const tooMany = (map, key, max) => {
  const now = Date.now(), m = Math.floor(now / 60000);
  const h = map.get(key);
  if (!h || h.m !== m) { map.set(key, { m, n: 1 }); if (map.size > 20000) map.clear(); return false; }
  return ++h.n > max;
};

// Контуры (3.22.1): код функции один и тот же, а с каких страниц её можно вызывать — задаёт секрет проекта
// ALLOWED_ORIGINS (через запятую). Боевой проект — только сайт игры (так по умолчанию), тестовый — только localhost.
// Запросы не из браузера (без заголовка Origin) проверяются как обычно — по входу игрока.
const ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || 'https://duholov.ru,https://quinsiege.github.io').split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);
// Закрытый контур (тестовый проект): секрет ACCESS_KEY — без заголовка x-duholov-access с этим ключом запросы
// отклоняются (Origin подделывает любой скрипт, а адрес и публичный ключ проекта лежат в открытом репозитории).
// В боевом проекте секрет не задан — игра открыта всем.
const ACCESS = Deno.env.get('ACCESS_KEY') || '';
const sameKey = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };

Deno.serve(async req => {
  const origin = req.headers.get('origin');
  const allowed = !origin || ORIGINS.includes(origin);
  const headers = { ...CORS, 'Access-Control-Allow-Origin': allowed && origin ? origin : ORIGINS[0], Vary: 'Origin' };
  const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  // уведомление ЮKassa о платеже: итог проверяем сами (Pay.notify); при сбое — 500, и ЮKassa повторит уведомление позже
  if (req.method === 'POST' && new URL(req.url).pathname.endsWith('/yookassa')) {
    try { await Pay.notify(await req.json().catch(() => null)); return new Response('ok'); }
    catch (e) { console.error('Казна, уведомление:', String(e)); return new Response('retry', { status: 500 }); }
  }
  if (!allowed) return reply({ ok: false, error: 'Этот сервер игры не принимает запросы с этой страницы' }, 403);
  // 4.1: ошибка из браузера игрока (www/js/errors.js) — в client_errors; не больше 20 в минуту с адреса, хранится 14 дней
  if (req.method === 'POST' && new URL(req.url).pathname.endsWith('/log')) {
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    if (tooMany(errHits, ip, 20)) return reply({ ok: false }, 429);
    const b = await req.json().catch(() => null), s = (x, n) => String((x == null ? '' : x)).slice(0, n);
    if (b && b.msg) {
      const { error } = await db.from('client_errors').insert({ v: s(b.v, 20), page: s(b.page, 100), msg: s(b.msg, 500), src: s(b.src, 200),
        line: Number.isFinite(+b.line) ? +b.line | 0 : null, stack: s(b.stack, 2000), ua: s(req.headers.get('user-agent'), 300) });
      if (error) console.error('client_errors:', error.message);
      if (Math.random() < 0.01) await db.from('client_errors').delete().lt('at', new Date(Date.now() - 14 * 86400000).toISOString());
    }
    return reply({ ok: true });
  }
  if (ACCESS && !sameKey(req.headers.get('x-duholov-access') || '', ACCESS)) return reply({ ok: false, error: 'Закрытый контур: нужен ключ доступа' }, 403);
  if (req.method !== 'POST') return reply({ ok: false, error: 'POST only' }, 405);
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const bad = badTokens.get(ip);
  if (bad && bad.m === Math.floor(Date.now() / 60000) && bad.n > BAD_TOKENS) return reply({ ok: false, error: 'Слишком много попыток — подожди минуту' }, 429);
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const who = token ? (await db.auth.getUser(token)).data : null;
  if (!who || !who.user) { tooMany(badTokens, ip, BAD_TOKENS); return reply({ ok: false, error: 'Нужен вход в игру', auth: true }, 401); }
  const uid = who.user.id;
  if (tooMany(hits, uid, FLOOD)) return reply({ ok: false, error: 'Слишком много запросов — подожди минуту' }, 429);
  let body;
  try { body = await req.json(); } catch { return reply({ ok: false, error: 'Некорректный запрос' }, 400); }
  if (verCmp(body.v, GameCore.MIN_CLIENT) < 0) return reply({ ok: false, upgrade: true, error: 'Вышла новая версия игры — обнови её' });
  // Казна: создать оплату / узнать итог — вне очереди игровых действий (ждём ответа ЮKassa)
  if (body.pay) return reply(await Pay.handle(uid, String(body.pay), body.args));
  // Вход через сервисы: список, привязка и переключение учётной записи — тоже вне очереди игровых действий
  if (body.auth) { try { return reply(await Auth.handle(uid, String(body.auth), body.args || {})); } catch (e) { console.error('Вход:', String(e)); return reply({ ok: false, error: 'Ошибка входа — попробуй ещё раз' }, 500); } }
  const env = makeEnv(uid);

  // 4.1: действия одного игрока выполняются строго по очереди — на всех экземплярах функции (замок в базе, 017_request_lock.sql).
  // Прогресс и служебные данные сервера записываются одной транзакцией вместе со снятием замка.
  const tok = crypto.randomUUID();
  let locked = false;
  const release = async srv => {
    if (!locked) return;
    locked = false;
    const { error } = await db.rpc('game_release', { p_uid: uid, p_token: tok, p_srv: srv || null });
    if (error) console.error('Замок:', error.message);
  };
  try {
    let got = null;
    for (let i = 0; i < LOCK_TRIES; i++) {
      got = must(await db.rpc('game_begin', { p_uid: uid, p_token: tok, p_ms: LOCK_MS }));
      if (got && !got.locked) break;
      await new Promise(r => setTimeout(r, 200));
    }
    if (!got || got.locked) return reply({ ok: false, error: 'Предыдущее действие ещё выполняется — повтори' });
    locked = true;
    const row = got.row, srv = got.srv || {};
    if (row && row.moved_to) return reply({ ok: false, moved: true, error: 'Прогресс перенесён на другое устройство' });
    const res = await GameCore.run(body, { data: row ? row.data : null, srv }, env);
    if (!res.ok) {
      if (res.rl) await release({ ...srv, rl: res.rl });
      return reply({ ok: false, error: res.error, rev: row ? row.rev : 0 });
    }
    if (res.reset) return reply({ ok: true, reset: true, results: res.results, events: [], now: res.now });
    // 4.1: прогресс не изменился (чат, Лига, комната разлома, tick) — пишем только служебные данные, без перезаписи прогресса
    const ops = row && res.data ? Diff.make(row.data, res.data) : null;
    const rev = must(await db.rpc('game_commit', { p_uid: uid, p_token: tok, p_rev: row ? row.rev : 0, p_data: ops && !ops.length ? null : (res.data || null),
      p_srv: res.srv, p_ver: String(body.v || '').slice(0, 20) }));
    if (rev == null) return reply({ ok: false, error: 'Прогресс изменился на другом устройстве — повтори действие' });
    locked = false; // замок снят вместе с сохранением
    for (const fn of res.after) { try { await fn(); } catch (e) { console.error('после сохранения:', String(e)); } }
    // разница — только если телефон знает предыдущую версию прогресса
    const patch = !res.full && row && body.rev === row.rev ? ops : null;
    return reply({ ok: true, rev, patch, data: patch ? undefined : res.data, results: res.results, events: res.events, now: res.now });
  } catch (e) {
    console.error(String(e && e.stack || e));
    return reply({ ok: false, error: 'Ошибка сервера — попробуй ещё раз' }, 500);
  } finally {
    await release();
  }
});
