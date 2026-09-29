'use strict';
/* 4.28: духи и боги японской мифологии — сезон 2 (данные: поля — как у SPECIES в data.js; мифология задаётся сама).
   До раскола Алатыря мифология скрыта; MYTH_META.japan — её описание, Разлом и святилища */
(globalThis.MYTH_SP = globalThis.MYTH_SP || {}).japan = [
  // ---------- младшие семейства ----------
  // Ветер: тэнгу — от листового коноха-тэнгу через воронового карасу-тэнгу к великому горному дайтэнгу с веером
  { id: 'jp_konoha', name: ru`Коноха-тэнгу`, el: 'wind', rar: 1, stage: 1, fam: 'jp_konoha', evo: 'jp_karasu', cost: 25, base: [120, 92, 104],
    desc: ru`Самый младший из тэнгу, лёгкий, как лист на ветру. Учится летать на сквозняках между высотками и пока приземляется в основном на козырьки остановок.`,
    look: { shape: 'bird', c1: '#e0e7ff', c2: '#4338ca', c3: '#84cc16', eyes: 'big', mouth: 'beak', back: ['wings'], feats: ['leaves', 'cheeks'] } },
  { id: 'jp_karasu', name: ru`Карасу-тэнгу`, el: 'wind', rar: 2, stage: 2, fam: 'jp_konoha', evo: 'jp_daitengu', cost: 100, base: [174, 128, 142],
    desc: ru`Тэнгу с вороньим клювом и чёрными крыльями, мастер горных троп. Сторожит храмовые лестницы и поднимает вихрь, если кто-нибудь мусорит на горе.`,
    look: { shape: 'bird', c1: '#475569', c2: '#0f172a', c3: '#f59e0b', eyes: 'angry', mouth: 'beak', back: ['wings'], feats: ['hat'] } },
  { id: 'jp_daitengu', name: ru`Дайтэнгу`, el: 'wind', rar: 3, stage: 3, fam: 'jp_konoha', base: [240, 176, 192],
    desc: ru`Великий горный тэнгу с длинным красным носом и веером из перьев. Одним взмахом веера поднимает бурю — и им же разгоняет тучи над городским праздником.`,
    look: { shape: 'robe', c1: '#f87171', c2: '#7f1d1d', c3: '#f8fafc', eyes: 'angry', mouth: 'none', back: ['wings', 'aura'], feats: ['beard', 'hat'] } },

  // Лес: тануки — стучит в живот-барабан «пон-поко» и превращается с помощью листика на голове
  { id: 'jp_tanuchok', name: ru`Танучок`, el: 'forest', rar: 1, stage: 1, fam: 'jp_tanuchok', evo: 'jp_tanuki', cost: 25, base: [104, 110, 124],
    desc: ru`Пушистый детёныш тануки учится превращаться: кладёт на голову листик — и становится… чуть более пушистым тануки. Зато в живот-барабан стучит уже отлично: пон-поко-пон!`,
    look: { shape: 'round', c1: '#d6a77a', c2: '#6b4423', c3: '#1c1917', eyes: 'big', mouth: 'cat', back: ['ears', 'tail'], feats: ['leaves', 'cheeks'] } },
  { id: 'jp_tanuki', name: ru`Тануки`, el: 'forest', rar: 2, stage: 2, fam: 'jp_tanuchok', evo: 'jp_ootanuki', cost: 100, base: [156, 150, 170],
    desc: ru`Весельчак в соломенной шляпе, с бутылочкой рамунэ и счётом за ужин — таким его ставят у дверей раменных на удачу. Превращается во что угодно, но хвост всегда его выдаёт.`,
    look: { shape: 'blob', c1: '#c8956a', c2: '#5b3a1e', c3: '#fde68a', eyes: 'round', mouth: 'smile', back: ['ears', 'tail'], feats: ['hat', 'leaves'] } },
  { id: 'jp_ootanuki', name: ru`Великий тануки`, el: 'forest', rar: 3, stage: 3, fam: 'jp_tanuchok', base: [214, 218, 236],
    desc: ru`Предводитель восьмисот восьми тануки из Мацуямы. Ударит в живот-барабан — и по всему парку кружится листопад, а превратиться может хоть в целый поезд.`,
    look: { shape: 'blob', c1: '#b98457', c2: '#3f2a14', c3: '#84cc16', eyes: 'angry', mouth: 'smile', back: ['aura', 'ears', 'tail'], feats: ['leaves', 'crown'] } },

  // Тень: кошка, прожившая много лет, становится бакэнэко, а потом нэкомата с раздвоенным хвостом
  { id: 'jp_tama', name: ru`Котёнок Тама`, el: 'shadow', rar: 1, stage: 1, fam: 'jp_tama', evo: 'jp_bakeneko', cost: 25, base: [112, 100, 110], time: 'night',
    desc: ru`С виду обычный котёнок с колокольчиком. Но кошка, прожившая много лет, становится духом — и Тама очень ждёт этого дня, тренируясь ходить на задних лапках.`,
    look: { shape: 'round', c1: '#f8fafc', c2: '#94a3b8', c3: '#f97316', eyes: 'big', mouth: 'cat', back: ['cattail', 'ears'], feats: ['whiskers', 'cheeks'] } },
  { id: 'jp_bakeneko', name: ru`Бакэнэко`, el: 'shadow', rar: 2, stage: 2, fam: 'jp_tama', evo: 'jp_nekomata', cost: 100, base: [166, 138, 150], time: 'night',
    desc: ru`Кошка-оборотень: по ночам танцует на задних лапах, повязав на голову полотенце. Раньше лакомилась маслом из старых фонарей, а теперь — сливками из круглосуточного магазина.`,
    look: { shape: 'tall', c1: '#e2e8f0', c2: '#475569', c3: '#a855f7', eyes: 'sleepy', mouth: 'cat', back: ['cattail', 'ears'], feats: ['whiskers'] } },
  { id: 'jp_nekomata', name: ru`Нэкомата`, el: 'shadow', rar: 3, stage: 3, fam: 'jp_tama', base: [232, 170, 196],
    desc: ru`Мудрая кошка с раздвоенным хвостом. Взмахнёт хвостами — и в переулке зажигаются блуждающие огоньки, провожая до дома тех, кто засиделся допоздна.`,
    look: { shape: 'tall', c1: '#f1f5f9', c2: '#6b21a8', c3: '#c084fc', eye: '#e9d5ff', eyes: 'glow', mouth: 'cat', back: ['aura', 'cattail', 'ears'], feats: ['whiskers'] } },

  // Вода: каппа с блюдцем воды на макушке
  { id: 'jp_kappyonok', name: ru`Каппёнок`, el: 'water', rar: 1, stage: 1, fam: 'jp_kappyonok', evo: 'jp_kappa', cost: 25, base: [114, 104, 112],
    desc: ru`Маленький каппа с блюдцем воды на макушке. Вежливо кланяется в ответ на поклон — и тут же бежит доливать блюдце из ближайшего фонтанчика.`,
    look: { shape: 'round', c1: '#86efac', c2: '#15803d', c3: '#7dd3fc', eyes: 'big', mouth: 'beak', back: [], feats: ['bubbles', 'cheeks'] } },
  { id: 'jp_kappa', name: ru`Каппа`, el: 'water', rar: 2, stage: 2, fam: 'jp_kappyonok', base: [168, 142, 154],
    desc: ru`Речной дух с панцирем и клювом, чемпион по сумо среди водяных. Обожает огурцы — роллы с огурцом так и называются: каппа-маки.`,
    look: { shape: 'tall', c1: '#4ade80', c2: '#166534', c3: '#fde68a', eyes: 'round', mouth: 'beak', back: ['ripples'], feats: ['bubbles'] } },

  // Огонь: дарума-неваляшка — второй глаз дорисовывают, когда сбудется желание
  { id: 'jp_darumka', name: ru`Дарумка`, el: 'fire', rar: 1, stage: 1, fam: 'jp_darumka', evo: 'jp_daruma', cost: 25, base: [106, 118, 120],
    desc: ru`Красная неваляшка-дарума с одним нарисованным глазом: второй ей дорисуют, когда сбудется загаданное желание. Толкни её — покачается и снова встанет: семь раз упади, восемь раз поднимись!`,
    look: { shape: 'round', c1: '#f87171', c2: '#b91c1c', c3: '#fde68a', eyes: 'round', mouth: 'smile', back: [], feats: ['cheeks'] } },
  { id: 'jp_daruma', name: ru`Дарума`, el: 'fire', rar: 2, stage: 2, fam: 'jp_darumka', base: [152, 170, 164],
    desc: ru`Желание сбылось — и дарума получила второй глаз. В Новый год старых дарум с благодарностью провожают в храмовом костре, и они выходят оттуда тёплыми огненными духами.`,
    look: { shape: 'round', c1: '#ef4444', c2: '#7f1d1d', c3: '#fbbf24', eyes: 'angry', mouth: 'none', back: ['aura'], feats: ['beard', 'flame'] } },

  // Ток: райдзю — громовой зверёк бога грома
  { id: 'jp_gromushka', name: ru`Громушка`, el: 'current', rar: 1, stage: 1, fam: 'jp_gromushka', evo: 'jp_raiju', cost: 25, base: [118, 96, 106],
    desc: ru`Детёныш райдзю, громового зверька. В грозу сворачивается клубком там, где потеплее, — например, в капюшоне у прохожего — и тихонько потрескивает.`,
    look: { shape: 'round', c1: '#fde68a', c2: '#ca8a04', c3: '#60a5fa', eyes: 'big', mouth: 'cat', back: ['cattail', 'ears'], feats: ['bolt', 'cheeks'] } },
  { id: 'jp_raiju', name: ru`Райдзю`, el: 'current', rar: 2, stage: 2, fam: 'jp_gromushka', base: [172, 132, 146],
    desc: ru`Громовой зверь, спутник бога грома. Спрыгивает на землю вместе с молнией, носится по проводам и оставляет на деревьях следы когтей.`,
    look: { shape: 'blob', c1: '#fef08a', c2: '#a16207', c3: '#3b82f6', eyes: 'angry', mouth: 'teeth', back: ['cattail', 'mane'], feats: ['bolt'] } },

  // ---------- знаменитые существа и герои ----------
  { id: 'jp_akaoni', name: ru`Ака-они`, el: 'fire', rar: 3, stage: 1, fam: 'jp_akaoni', base: [224, 180, 206],
    desc: ru`Красный великан-они с железной палицей. На праздник Сэцубун в него бросают жареные бобы с криком «Они — вон, счастье — в дом!», и он честно убегает — но недалеко.`,
    look: { shape: 'blob', c1: '#f87171', c2: '#991b1b', c3: '#fbbf24', eyes: 'angry', mouth: 'teeth', back: [], feats: ['horns'] } },
  { id: 'jp_yukionna', name: ru`Юки-онна`, el: 'water', rar: 3, stage: 1, fam: 'jp_yukionna', base: [200, 196, 204],
    desc: ru`Снежная дева в белом кимоно. Приходит с метелью и рисует иней на окнах трамваев; говорят, она щадит того, кто умеет держать слово.`,
    look: { shape: 'ghost', c1: '#f8fafc', c2: '#7dd3fc', c3: '#e0f2fe', eyes: 'sleepy', mouth: 'smile', back: ['hair'], feats: [] } },
  { id: 'jp_momotaro', name: ru`Момотаро`, el: 'forest', rar: 3, stage: 1, fam: 'jp_momotaro', base: [212, 176, 190],
    desc: ru`Мальчик, родившийся из огромного персика. С собакой, обезьяной и фазаном он отправился на остров они и вернулся с победой, а друзей угощал рисовыми колобками кибиданго.`,
    look: { shape: 'round', c1: '#fecdd3', c2: '#e11d48', c3: '#fde68a', eyes: 'round', mouth: 'smile', back: [], feats: ['hat', 'cheeks'] } },

  // ---------- эпические ----------
  { id: 'jp_raijin', name: ru`Райдзин`, el: 'current', rar: 4, stage: 1, fam: 'jp_raijin', base: [230, 180, 196],
    desc: ru`Бог грома с кольцом барабанов за спиной: ударит в них — и над городом раскатывается гроза. В Японии до сих пор советуют в грозу прикрывать пупок: Райдзин, говорят, большой до них охотник.`,
    look: { shape: 'robe', c1: '#60a5fa', c2: '#1e3a8a', c3: '#facc15', eyes: 'angry', mouth: 'teeth', back: ['aura'], feats: ['horns', 'bolt'] } },
  { id: 'jp_fujin', name: ru`Фудзин`, el: 'wind', rar: 4, stage: 1, fam: 'jp_fujin', base: [206, 206, 214],
    desc: ru`Бог ветра с огромным мешком за плечами, где хранятся все ветра мира. Приоткроет мешок — по улицам гуляет свежий бриз, развяжет совсем — берегите зонтики.`,
    look: { shape: 'robe', c1: '#86efac', c2: '#166534', c3: '#e0e7ff', eyes: 'angry', mouth: 'teeth', back: ['aura'], feats: ['swirl', 'horns'] } },

  // ---------- великие легенды ----------
  { id: 'jp_amaterasu', name: ru`Аматэрасу`, el: 'fire', rar: 5, stage: 1, fam: 'jp_amaterasu', legend: true, base: [298, 236, 250],
    desc: ru`Легенда. Богиня Солнца: когда она укрылась в небесной пещере, мир погрузился во тьму, и вернуть её сумели лишь смех богов и священное зеркало. Встречается только в разломах.`,
    look: { shape: 'robe', c1: '#fff7ed', c2: '#dc2626', c3: '#fbbf24', eyes: 'sleepy', mouth: 'smile', back: ['aura', 'halo', 'hair'], feats: ['crown'] } },
  { id: 'jp_susanoo', name: ru`Сусаноо`, el: 'water', rar: 5, stage: 1, fam: 'jp_susanoo', legend: true, base: [302, 226, 244],
    desc: ru`Легенда. Буйный брат Аматэрасу, бог бурь и морей: он одолел восьмиглавого змея Ямата-но Ороти и нашёл в его хвосте священный меч. Встречается только в разломах.`,
    look: { shape: 'robe', c1: '#93c5fd', c2: '#1e3a8a', c3: '#e5e7eb', eyes: 'angry', mouth: 'none', back: ['aura', 'hair'], feats: ['beard'] } },
];
(globalThis.MYTH_META = globalThis.MYTH_META || {}).japan = {
  name: ru`Японская`, where: ru`Япония — острова восходящего солнца`, color: '#f43f5e', season: 2,
  world: ru`Такамагахара`, road: ru`Дорога в Такамагахару`, // мир мифологии для экрана Алатыря — Равнина Высокого Неба, где живут ками
  rift: ru`Врата Ёми`, riftDesc: ru`Врата в Ёми, подземную страну мрака, приоткрылись в тумане: оттуда вышел сильный дух. Закрой врата, пока не прошёл час.`,
  shrine: ru`Святилище`, shrineOf: g => ru`Святилище ${g}`,
  shrineDesc: ru`Святилище ками за алыми воротами-тории. Победи хранителя — и твоя дружина сможет держать святилище.`,
  gods: [ru`Аматэрасу`, ru`Сусаноо`, ru`Цукуёми`, ru`Инари`, ru`Хатимана`, ru`Идзанаги`, ru`Идзанами`, ru`Эбису`, ru`Рюдзина`, ru`Тэндзина`],
  guards: [ru`Харуто`, ru`Сакура`, ru`Рэн`, ru`Аой`, ru`Кэйта`, ru`Хина`],
};
