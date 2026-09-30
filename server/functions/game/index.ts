// @ts-nocheck
// Духолов: сервер игры (Supabase Edge Function «game»). ФАЙЛ СОБРАН АВТОМАТИЧЕСКИ tools/build-server.ps1
// из общих модулей игры (www/js) и server/game — не правьте его вручную.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { AsyncLocalStorage } from 'node:async_hooks';

// Заглушки браузерного окружения: на сервере нет карты, звука и окон
const DEV = false;
const APP_VERSION = '5.1.12';
const window = globalThis;
const location = { hostname: 'server', search: '' };
const MapView = { pos: null, refresh() {}, updateBuddy() {} };
const Poi = { near: () => [], nearest: () => null };
const Tut = { SID: 'vayfayka', spawn: () => null, step: () => 0 };
const UI = { toast() {}, refreshHud() {} };
const Sync = { touch() {} };
const Cloud = { configured: () => false };
const Cfg = { s: { sound: false, vibro: false } };

// ===== www/js/i18n.js =====
/* 4.15: языки игры. Русский — исходный: текст в коде пишется по-русски внутри ru`…` и сам служит ключом перевода:
     ru`Нужна команда`, ru`Сила ${n}` (ключ «Сила {0}»), ru('текст') — то же без шаблона.
   Переводы лежат в i18n/<язык>.js (I18N_DICT = { 'Сила {0}': 'Power {0}' }) и подключаются сразу после этого файла,
   до скриптов игры: названия духов и предметов в data.js переводятся при загрузке. Нет перевода — остаётся русский.
   Язык: выбранный в Настройках, иначе язык телефона (нет такого — английский); смена языка перезапускает игру.
   На сервере (общие data.js, state.js…) словаря нет — ru`…` просто собирает русский текст, а ошибки сервера
   телефон переводит сам (I18N.back) по тем же ключам. Этот файл не склеивается в app.min.js (tools/web/build.mjs). */
const I18N = {
  KEY: 'duholov.lang',
  // порядок — как в списке выбора
  LANGS: { ru: 'Русский', en: 'English', es: 'Español', pt: 'Português', fr: 'Français', de: 'Deutsch', it: 'Italiano',
    tr: 'Türkçe', id: 'Bahasa Indonesia', zh: '简体中文', ja: '日本語', ko: '한국어', hi: 'हिन्दी' },
  LOCALE: { ru: 'ru-RU', en: 'en-US', es: 'es-ES', pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE', it: 'it-IT',
    tr: 'tr-TR', id: 'id-ID', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', hi: 'hi-IN' },
  // языки, где русский понятнее английского
  NEAR_RU: ['ru', 'uk', 'be', 'kk', 'ky', 'uz', 'tg', 'tk', 'hy', 'az', 'ka', 'mn'],
  lang: 'ru',
  locale: 'ru-RU',
  dict: null,

  // выбранный язык: сохранённый, иначе — язык телефона
  pick() {
    // для проверки: ?lang=en в адресе; тесты задают русский (data-lang="ru" у тега скрипта)
    const cur = typeof document !== 'undefined' && document.currentScript, force = cur && cur.dataset && cur.dataset.lang;
    if (force && this.LANGS[force]) return force;
    const q = typeof location !== 'undefined' && /[?&]lang=([a-z]{2})\b/.exec(location.search);
    if (q && this.LANGS[q[1]]) return q[1];
    let saved = null;
    try { saved = localStorage.getItem(this.KEY); } catch (e) {}
    if (saved && this.LANGS[saved]) return saved;
    const list = (typeof navigator !== 'undefined' && (navigator.languages || [navigator.language])) || [];
    for (const l of list) {
      const b = String(l || '').toLowerCase().split(/[-_]/)[0];
      if (this.LANGS[b]) return b;
      if (this.NEAR_RU.includes(b)) return 'ru';
    }
    return list.length ? 'en' : 'ru';
  },
  // сменить язык: сохранить и перезапустить игру (переводы берутся при загрузке)
  set(l) {
    if (!this.LANGS[l]) return;
    try { localStorage.setItem(this.KEY, l); } catch (e) {}
    location.reload();
  },

  // перевод ключа с подстановкой {0}, {1}…
  t(k, v) {
    const d = this.dict;
    let s = d && Object.prototype.hasOwnProperty.call(d, k) ? d[k] : k;
    if (v && v.length) {
      s = s.replace(/\{(\d+)\}/g, (m, i) => v[i] === undefined ? m : v[i]);
      // в китайском и японском число пишется слитно со словом («3位好友», а не «3 位好友», как собирает код)
      if (this.cjk) s = s.replace(/(\d)[  ]+(?=[぀-ヿ㐀-鿿])/g, '$1');
    }
    return s;
  },

  // слово внутри фразы со строчной буквы — кроме немецкого, где существительные пишутся с заглавной
  low(s) { return this.lang === 'de' ? String(s) : String(s).toLowerCase(); },

  // ошибка или ответ сервера (по-русски) → на язык игрока: сперва точное совпадение, потом ключи с {0}
  back(msg) {
    if (!this.dict || typeof msg !== 'string' || !msg) return msg;
    if (Object.prototype.hasOwnProperty.call(this.dict, msg)) return this.dict[msg];
    if (!this._pats) {
      const esc = s => s.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&');
      this._pats = Object.keys(this.dict).filter(k => /\{\d+\}/.test(k)).map(k => ({
        k, re: new RegExp('^' + esc(k).replace(/\\\{(\d+)\\\}/g, '([\\s\\S]*?)') + '$'),
        ids: (k.match(/\{\d+\}/g) || []).map(x => +x.slice(1, -1)),
      })).sort((a, b) => b.k.replace(/\{\d+\}/g, '').length - a.k.replace(/\{\d+\}/g, '').length);
      // 4.27: сначала самые точные шаблоны (больше постоянного текста) — иначе общий «{0} из {1}» перехватывал
      // «Зачерпни силы из {0} источников» и задание выходило наполовину по-русски
    }
    for (const p of this._pats) {
      const m = msg.match(p.re);
      if (!m) continue;
      const v = [];
      p.ids.forEach((id, i) => { v[id] = this.back(m[i + 1]); }); // подставленные слова (имя духа, предмета) — тоже переводим
      return this.t(p.k, v);
    }
    return msg;
  },

  // статичный текст страницы (index.html): тексты и подписи элементов, у которых есть перевод
  page(root) {
    if (!this.dict || !root) return;
    const tr = s => { const k = s.trim(); return k && this.dict[k] ? s.replace(k, this.dict[k]) : s; };
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) if (/[А-Яа-яЁё]/.test(n.nodeValue)) n.nodeValue = tr(n.nodeValue);
    root.querySelectorAll('[title],[aria-label],[placeholder],[alt]').forEach(el => {
      ['title', 'aria-label', 'placeholder', 'alt'].forEach(a => { const v = el.getAttribute(a); if (v && /[А-Яа-яЁё]/.test(v)) el.setAttribute(a, tr(v)); });
    });
  },

  init() {
    if (typeof document === 'undefined') return; // сервер: только русский
    this.lang = this.pick();
    this.locale = this.LOCALE[this.lang] || 'ru-RU';
    this.cjk = this.lang === 'zh' || this.lang === 'ja';
    document.documentElement.lang = this.lang;
    if (this.lang === 'ru') return;
    // словарь — отдельным файлом с той же меткой версии, что у этого скрипта; document.write — чтобы он выполнился до игры
    const cur = document.currentScript, q = cur && cur.src.includes('?') ? cur.src.slice(cur.src.indexOf('?')) : '';
    const base = cur && cur.src ? cur.src.replace(/js\/i18n\.js.*$/, '') : '';
    document.write(`<script src="${base}i18n/${this.lang}.js${q}"><\/script>`);
    document.addEventListener('DOMContentLoaded', () => {
      this.page(document.body);
      if (this.dict && this.dict[document.title]) document.title = this.dict[document.title];
    });
  },
};

// ru`текст ${x}` — перевод по ключу «текст {0}»; ru('текст') — то же для обычной строки
const _ruKeys = new WeakMap();
function ru(s, ...v) {
  if (typeof s === 'string') return I18N.t(s, v);
  let k = _ruKeys.get(s);
  if (k === undefined) { k = s.reduce((a, p, i) => a + '{' + (i - 1) + '}' + p); _ruKeys.set(s, k); }
  return I18N.t(k, v);
}

// ru.k`…` — русский текст без перевода, но с ключом для словаря: для текста, который сохраняется (прогресс, сервер)
// и переводится уже при показе — I18N.back(текст)
ru.k = (s, ...v) => typeof s === 'string' ? s : s.reduce((a, p, i) => a + v[i - 1] + p);

I18N.init();

// ===== www/js/myth-greek.js =====
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

// ===== www/js/myth-norse.js =====
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

// ===== www/js/myth-celtic.js =====
/* 4.28: духи и боги кельтской мифологии — данные (поля — как у SPECIES в data.js; мифология задаётся сама) */
(globalThis.MYTH_SP = globalThis.MYTH_SP || {}).celtic = [
  // ---------- огонь: блуждающий огонёк → Джек-фонарь ----------
  { id: 'ce_wisp', name: ru`Блуждающий огонёк`, el: 'fire', rar: 1, stage: 1, fam: 'ce_wisp', evo: 'ce_jack', cost: 25, base: [120, 92, 104], time: 'night',
    desc: ru`Когда-то водил путников кругами по болотам, а теперь мерцает над мокрыми газонами и зовёт срезать путь. Путь, конечно, выходит длиннее.`,
    look: { shape: 'wisp', c1: '#fde68a', c2: '#f97316', c3: '#fff7ed', eyes: 'big', mouth: 'smile', back: ['aura'], feats: ['flame', 'cheeks'] } },
  { id: 'ce_jack', name: ru`Джек-фонарь`, el: 'fire', rar: 2, stage: 2, fam: 'ce_wisp', base: [172, 132, 146],
    desc: ru`Хитрец Джек бродит с угольком в резной репе с тех пор, как перехитрил всех на свете. В ночь Самайна подмигивает с каждого крыльца.`,
    look: { shape: 'round', c1: '#fdba74', c2: '#c2410c', c3: '#fde047', eyes: 'glow', mouth: 'teeth', back: [], feats: ['flame', 'hat'] } },

  // ---------- вода: Тюленёк → Селки → Мерроу ----------
  { id: 'ce_seal', name: ru`Тюленёк`, el: 'water', rar: 1, stage: 1, fam: 'ce_seal', evo: 'ce_selkie', cost: 25, base: [104, 114, 122],
    desc: ru`Любопытный тюлений малыш с глазами-пуговками. Выныривает у набережных и прячет в ластах гладкие морские стёклышки.`,
    look: { shape: 'drop', c1: '#cbd5e1', c2: '#475569', c3: '#e0f2fe', eyes: 'big', mouth: 'cat', back: [], feats: ['whiskers', 'cheeks'] } },
  { id: 'ce_selkie', name: ru`Селки`, el: 'water', rar: 2, stage: 2, fam: 'ce_seal', evo: 'ce_merrow', cost: 100, base: [152, 160, 168],
    desc: ru`Сбрасывает тюленью шкурку и выходит на берег человеком. Гуляет по набережной со шкуркой через плечо: без неё в море не вернуться.`,
    look: { shape: 'ghost', c1: '#bae6fd', c2: '#334155', c3: '#94a3b8', eyes: 'big', mouth: 'smile', back: ['hair'], feats: ['bubbles'] } },
  { id: 'ce_merrow', name: ru`Мерроу`, el: 'water', rar: 3, stage: 3, fam: 'ce_seal', base: [210, 214, 232],
    desc: ru`Морская дева ирландских берегов в красной шапочке — без неё не нырнуть. Поёт перед штормом, и портовые краны сами разворачиваются по ветру.`,
    look: { shape: 'ghost', c1: '#99f6e4', c2: '#0f766e', c3: '#ef4444', eyes: 'round', mouth: 'smile', back: ['hair', 'ripples'], feats: ['hat', 'bubbles'] } },

  // ---------- лес: Клеверок → Лепрекон → Иубдан ----------
  { id: 'ce_clover', name: ru`Клеверок`, el: 'forest', rar: 1, stage: 1, fam: 'ce_clover', evo: 'ce_leprechaun', cost: 25, base: [106, 116, 118],
    desc: ru`Трилистник, проснувшийся на газоне в день святого Патрика. Найдёшь у него четвёртый листок — весь день будет везти.`,
    look: { shape: 'round', c1: '#86efac', c2: '#15803d', c3: '#fde047', eyes: 'round', mouth: 'smile', back: [], feats: ['sprout', 'cheeks'] } },
  { id: 'ce_leprechaun', name: ru`Лепрекон`, el: 'forest', rar: 2, stage: 2, fam: 'ce_clover', evo: 'ce_iubdan', cost: 100, base: [158, 164, 156],
    desc: ru`Сапожник волшебного народа: шьёт по одному башмаку, никогда — пару. Горшок золота прячет у конца радуги, а монетки роняет у банкоматов.`,
    look: { shape: 'round', c1: '#4ade80', c2: '#166534', c3: '#facc15', eyes: 'round', mouth: 'smile', back: [], feats: ['hat', 'beard'] } },
  { id: 'ce_iubdan', name: ru`Король Иубдан`, el: 'forest', rar: 3, stage: 3, fam: 'ce_clover', base: [218, 226, 206],
    desc: ru`Король лепреконов из древней саги: ростом с ладонь, а гордости — на великана. Правит крошечным королевством под клумбами и считает каждую радугу своей.`,
    look: { shape: 'robe', c1: '#22c55e', c2: '#14532d', c3: '#facc15', eyes: 'round', mouth: 'smile', back: ['aura'], feats: ['crown', 'beard'] } },

  // ---------- ветер: Пикси → Фея холмов → Королева Мэб ----------
  { id: 'ce_pixie', name: ru`Пикси`, el: 'wind', rar: 1, stage: 1, fam: 'ce_pixie', evo: 'ce_sidhe', cost: 25, base: [118, 94, 108],
    desc: ru`Крошечная фея корнуоллских холмов, катается на сквозняках. Если ты заблудился в трёх дворах — значит, тебя водили пикси.`,
    look: { shape: 'round', c1: '#bfdbfe', c2: '#6366f1', c3: '#f0abfc', eyes: 'big', mouth: 'smile', back: ['wings', 'ears'], feats: ['cheeks'] } },
  { id: 'ce_sidhe', name: ru`Фея холмов`, el: 'wind', rar: 2, stage: 2, fam: 'ce_pixie', evo: 'ce_mab', cost: 100, base: [170, 130, 146],
    desc: ru`Из народа ши, что живёт внутри зелёных холмов. Танцует в грибных кругах на газонах — не вставай в круг, а то протанцуешь до утра.`,
    look: { shape: 'ghost', c1: '#e0e7ff', c2: '#6366f1', c3: '#a7f3d0', eyes: 'round', mouth: 'smile', back: ['wings', 'hair'], feats: ['leaves'] } },
  { id: 'ce_mab', name: ru`Королева Мэб`, el: 'wind', rar: 3, stage: 3, fam: 'ce_pixie', base: [236, 172, 190],
    desc: ru`Королева фей и повелительница снов. Разъезжает в колеснице из ореховой скорлупки и нашёптывает спящему городу сны.`,
    look: { shape: 'robe', c1: '#c7d2fe', c2: '#4338ca', c3: '#f0abfc', eyes: 'sleepy', mouth: 'smile', back: ['wings', 'hair', 'aura'], feats: ['crown'] } },

  // ---------- ток: Брауни → Боггарт ----------
  { id: 'ce_brownie', name: ru`Брауни`, el: 'current', rar: 1, stage: 1, fam: 'ce_brownie', evo: 'ce_boggart', cost: 25, base: [110, 112, 112],
    desc: ru`Косматый шотландский домовичок. По ночам тихо чинит зарядки и лампочки, а в награду просит лишь миску сливок. Только не дари ему одежду — обидится!`,
    look: { shape: 'round', c1: '#d6a878', c2: '#7c4a1d', c3: '#fde047', eyes: 'round', mouth: 'smile', back: [], feats: ['beard', 'lamp'] } },
  { id: 'ce_boggart', name: ru`Боггарт`, el: 'current', rar: 2, stage: 2, fam: 'ce_brownie', base: [166, 142, 150],
    desc: ru`Брауни, которого обидели, — и он стал Боггартом. Щёлкает выключателями, выбивает пробки и прячет пульт, пока ему снова не нальют сливок.`,
    look: { shape: 'blob', c1: '#a8a29e', c2: '#44403c', c3: '#facc15', eyes: 'angry', mouth: 'teeth', back: ['ears'], feats: ['bolt', 'cables'] } },

  // ---------- тень: Пука → Пука-скакун ----------
  { id: 'ce_puca', name: ru`Пука`, el: 'shadow', rar: 1, stage: 1, fam: 'ce_puca', evo: 'ce_pucahorse', cost: 25, base: [120, 96, 104], time: 'night',
    desc: ru`Проказник-оборотень: то чёрный зайчонок, то козлёнок, то котёнок. После Самайна портит всю ежевику, поэтому в ноябре её не собирают.`,
    look: { shape: 'round', c1: '#475569', c2: '#0f172a', c3: '#fbbf24', eye: '#fbbf24', eyes: 'glow', mouth: 'cat', back: ['ears'], feats: ['horns'] } },
  { id: 'ce_pucahorse', name: ru`Пука-скакун`, el: 'shadow', rar: 2, stage: 2, fam: 'ce_puca', base: [174, 128, 144], time: 'night',
    desc: ru`Любимый облик Пуки — чёрный конь с золотыми глазами. Сажает на спину запоздалого прохожего и катает по ночному городу до рассвета.`,
    look: { shape: 'blob', c1: '#334155', c2: '#020617', c3: '#fbbf24', eye: '#fbbf24', eyes: 'glow', mouth: 'none', back: ['mane', 'tail'], feats: ['snout'] } },

  // ---------- редкие ----------
  { id: 'ce_draig', name: ru`Уэльский дракон`, el: 'fire', rar: 3, stage: 1, fam: 'ce_draig', base: [224, 164, 186],
    desc: ru`Красный дракон с флага Уэльса, что одолел белого дракона под горой. Теперь греется на крышах вокзалов и чихает искрами в туман.`,
    look: { shape: 'blob', c1: '#f87171', c2: '#991b1b', c3: '#fde047', eyes: 'angry', mouth: 'teeth', back: ['wings', 'tail'], feats: ['horns', 'flame'] } },
  { id: 'ce_banshee', name: ru`Банши`, el: 'wind', rar: 3, stage: 1, fam: 'ce_banshee', base: [210, 150, 176], time: 'night',
    desc: ru`Дева из холмов, чей плач над старыми улицами предупреждает о беде. Шумная, но добрая: расчёсывает серебряным гребнем волосы из тумана.`,
    look: { shape: 'ghost', c1: '#f1f5f9', c2: '#64748b', c3: '#cbd5e1', eye: '#a5f3fc', eyes: 'glow', mouth: 'o', back: ['hair'], feats: [] } },
  { id: 'ce_caitsith', name: ru`Кайт Ши`, el: 'shadow', rar: 3, stage: 1, fam: 'ce_caitsith', base: [200, 184, 196], time: 'night',
    desc: ru`Огромный чёрный кот фей с белым пятном на груди. В Самайн шотландцы оставляли ему блюдце молока — и он до сих пор обходит дворы, проверяя, не забыли ли.`,
    look: { shape: 'round', c1: '#374151', c2: '#030712', c3: '#f8fafc', eye: '#86efac', eyes: 'glow', mouth: 'cat', back: ['cattail', 'ears'], feats: ['whiskers'] } },

  // ---------- эпические боги ----------
  { id: 'ce_morrigan', name: ru`Морриган`, el: 'shadow', rar: 4, stage: 1, fam: 'ce_morrigan', base: [228, 180, 190],
    desc: ru`Великая королева-прорицательница, что оборачивается вороном. Глядит на город со шпилей и башен и заранее знает, чем кончится любой спор.`,
    look: { shape: 'robe', c1: '#475569', c2: '#0f172a', c3: '#dc2626', eye: '#f87171', eyes: 'glow', mouth: 'none', back: ['wings', 'hair'], feats: ['crown'] } },
  { id: 'ce_manannan', name: ru`Мананнан мак Лир`, el: 'water', rar: 4, stage: 1, fam: 'ce_manannan', base: [212, 208, 214],
    desc: ru`Бог моря и хозяин острова Мэн. Укрывает гавани плащом тумана, а по волнам скачет на коне Энбарр, как по полю.`,
    look: { shape: 'robe', c1: '#7dd3fc', c2: '#0c4a6e', c3: '#e0f2fe', eyes: 'round', mouth: 'none', back: ['aura', 'ripples'], feats: ['beard', 'crown'] } },

  // ---------- великие боги-легенды ----------
  { id: 'ce_dagda', name: ru`Дагда`, el: 'forest', rar: 5, stage: 1, fam: 'ce_dagda', legend: true, base: [288, 250, 262],
    desc: ru`Легенда. Добрый бог, отец ирландских богов: из его котла никто не уходит голодным, а арфа сама сменяет времена года. Встречается только в разломах.`,
    look: { shape: 'robe', c1: '#65a30d', c2: '#1a2e05', c3: '#b45309', eyes: 'round', mouth: 'smile', back: ['aura', 'halo'], feats: ['beard', 'leaves'] } },
  { id: 'ce_lugh', name: ru`Луг`, el: 'current', rar: 5, stage: 1, fam: 'ce_lugh', legend: true, base: [302, 224, 242],
    desc: ru`Легенда. Сияющий бог, мастер всех искусств — кузнец, поэт, воин и арфист разом. Его копьё само рвётся в бой и сверкает, как молния. Появляется только в разломах.`,
    look: { shape: 'robe', c1: '#fef08a', c2: '#ca8a04', c3: '#f8fafc', eye: '#fef9c3', eyes: 'glow', mouth: 'none', back: ['aura', 'halo'], feats: ['bolt', 'crown'] } },
];

// ===== www/js/myth-egypt.js =====
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

// ===== www/js/myth-china.js =====
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

// ===== www/js/myth-aztec.js =====
/* 4.28: духи и боги ацтекской мифологии — данные (поля — как у SPECIES в data.js; мифология задаётся сама) */
(globalThis.MYTH_SP = globalThis.MYTH_SP || {}).aztec = [
  // ---------- ОГОНЬ: Вулканчик → Дымогор → Попокатепетль ----------
  { id: 'az_vulkanchik', name: ru`Вулканчик`, el: 'fire', rar: 1, stage: 1, fam: 'az_vulkanchik', evo: 'az_dymogor', cost: 25, base: [118, 96, 108],
    desc: ru`Крошечный родственник великого Попокатепетля. Пыхает дымными колечками над клумбами и греет прохожим ладошки.`,
    look: { shape: 'round', c1: '#a07a64', c2: '#4a2f24', c3: '#ff9a1a', eyes: 'round', mouth: 'smile', back: [], feats: ['flame', 'cheeks'] } },
  { id: 'az_dymogor', name: ru`Дымогор`, el: 'fire', rar: 2, stage: 2, fam: 'az_vulkanchik', evo: 'az_popocatepetl', cost: 100, base: [172, 130, 146],
    desc: ru`Подросший Вулканчик. Когда сердится, пускает столб дыма выше телебашни, но сразу остывает, если угостить его горячим шоколадом.`,
    look: { shape: 'tall', c1: '#9a6a52', c2: '#3b2219', c3: '#ff7a1a', eyes: 'angry', mouth: 'teeth', back: ['steam'], feats: ['flame'] } },
  { id: 'az_popocatepetl', name: ru`Попокатепетль`, el: 'fire', rar: 3, stage: 3, fam: 'az_vulkanchik', base: [236, 180, 200],
    desc: ru`Курящаяся гора из старинного сказания: воин, который вечно стережёт сон своей любимой Истаксиуатль. Пыхает дымом над городом — тише, она спит.`,
    look: { shape: 'tall', c1: '#a8a29e', c2: '#44403c', c3: '#f8fafc', eyes: 'angry', mouth: 'none', back: ['aura', 'steam'], feats: ['flame', 'crown'] } },

  // ---------- ВОДА: Аксолотик → Аксолотль ----------
  { id: 'az_axolotik', name: ru`Аксолотик`, el: 'water', rar: 1, stage: 1, fam: 'az_axolotik', evo: 'az_axolotl', cost: 25, base: [104, 114, 122],
    desc: ru`Розовый малыш с пушистыми жабрами-веточками из каналов Шочимилько. Всегда улыбается и умеет отращивать потерянный хвостик.`,
    look: { shape: 'round', c1: '#fbcfe8', c2: '#f472b6', c3: '#f43f5e', eyes: 'big', mouth: 'smile', back: [], feats: ['cheeks', 'bubbles'] } },
  { id: 'az_axolotl', name: ru`Аксолотль`, el: 'water', rar: 2, stage: 2, fam: 'az_axolotik', base: [152, 166, 168],
    desc: ru`По преданию, в его облике бог Шолотль однажды спрятался в воде. Катается на расписных лодках-трахинерах и помнит все каналы старого Теночтитлана.`,
    look: { shape: 'blob', c1: '#f9a8d4', c2: '#db2777', c3: '#f43f5e', eyes: 'round', mouth: 'smile', back: ['ripples'], feats: ['bubbles', 'crown'] } },

  // ---------- ЛЕС: Початок → Маисовик → Сентеотль ----------
  { id: 'az_pochatok', name: ru`Початок`, el: 'forest', rar: 1, stage: 1, fam: 'az_pochatok', evo: 'az_maisovik', cost: 25, base: [108, 116, 118],
    desc: ru`Кукурузный малыш в зелёной обёртке. Прорастает у лотков с варёной кукурузой и мечтает о своей милпе — поле, где кукуруза, фасоль и тыква растут дружно.`,
    look: { shape: 'round', c1: '#fde047', c2: '#ca8a04', c3: '#65a30d', eyes: 'round', mouth: 'smile', back: [], feats: ['leaves', 'cheeks'] } },
  { id: 'az_maisovik', name: ru`Маисовик`, el: 'forest', rar: 2, stage: 2, fam: 'az_pochatok', evo: 'az_centeotl', cost: 100, base: [158, 168, 156],
    desc: ru`Дух кукурузного поля, обвитый фасолью, как шарфом. В городских огородах и на крышах следит, чтобы каждому зёрнышку хватило солнца.`,
    look: { shape: 'tall', c1: '#facc15', c2: '#a16207', c3: '#4d7c0f', eyes: 'round', mouth: 'smile', back: ['wheat'], feats: ['leaves', 'sprout'] } },
  { id: 'az_centeotl', name: ru`Сентеотль`, el: 'forest', rar: 3, stage: 3, fam: 'az_pochatok', base: [214, 228, 210],
    desc: ru`Юный бог молодой кукурузы с золотыми початками в уборе. Ацтеки верили, что от него пошли все злаки; в городе он будит скверы и огороды на крышах.`,
    look: { shape: 'robe', c1: '#fde68a', c2: '#15803d', c3: '#facc15', eyes: 'round', mouth: 'smile', back: ['aura', 'wheat'], feats: ['crown', 'leaves'] } },

  // ---------- ВЕТЕР: Колибрик → Уицицилин ----------
  { id: 'az_kolibrik', name: ru`Колибрик`, el: 'wind', rar: 1, stage: 1, fam: 'az_kolibrik', evo: 'az_uitsitsilin', cost: 25, base: [122, 92, 104],
    desc: ru`Крошечный колибри, который жужжит громче шмеля. Облетает все цветы на балконах и ни одного не пропускает.`,
    look: { shape: 'bird', c1: '#6ee7b7', c2: '#047857', c3: '#ef4444', eyes: 'round', mouth: 'beak', back: ['wings'], feats: [] } },
  { id: 'az_uitsitsilin', name: ru`Уицицилин`, el: 'wind', rar: 2, stage: 2, fam: 'az_kolibrik', base: [176, 126, 144],
    desc: ru`Так на языке ацтеков зовут колибри — посланца солнца. Зависает в воздухе перед витринами и сверкает бирюзовыми перьями ярче неоновых вывесок.`,
    look: { shape: 'bird', c1: '#5eead4', c2: '#0f766e', c3: '#e11d48', eyes: 'round', mouth: 'beak', back: ['wings', 'tail'], feats: ['crest'] } },

  // ---------- ТОК: Тлалокито → Тлалоке ----------
  { id: 'az_tlalokito', name: ru`Тлалокито`, el: 'current', rar: 1, stage: 1, fam: 'az_tlalokito', evo: 'az_tlaloque', cost: 25, base: [116, 100, 110],
    desc: ru`Маленький помощник бога дождя с глиняным кувшином. Если он уронит кувшин — над городом гремит гром и мигают фонари.`,
    look: { shape: 'round', c1: '#7dd3fc', c2: '#0369a1', c3: '#facc15', eyes: 'big', mouth: 'smile', back: [], feats: ['bolt', 'cheeks'] } },
  { id: 'az_tlaloque', name: ru`Тлалоке`, el: 'current', rar: 2, stage: 2, fam: 'az_tlalokito', base: [168, 140, 148],
    desc: ru`Подросший помощник Тлалока. Разбивает кувшины о тучи, и из них вырываются гром и молнии. После грозы старательно склеивает осколки.`,
    look: { shape: 'tall', c1: '#60a5fa', c2: '#1e3a8a', c3: '#facc15', eyes: 'angry', mouth: 'teeth', back: [], feats: ['bolt', 'drops'] } },

  // ---------- ТЕНЬ: Шоло → Шолоитцкуинтли → Шолотль ----------
  { id: 'az_sholo', name: ru`Шоло`, el: 'shadow', rar: 1, stage: 1, fam: 'az_sholo', evo: 'az_xoloitzcuintli', cost: 25, base: [114, 100, 106], time: 'night',
    desc: ru`Голая собачка-шолоитцкуинтли, тёплая, как грелка. Провожает запоздавших прохожих до подъезда и никогда не путает дорогу.`,
    look: { shape: 'round', c1: '#78716c', c2: '#292524', c3: '#fb923c', eyes: 'big', mouth: 'cat', back: ['ears'], feats: ['snout'] } },
  { id: 'az_xoloitzcuintli', name: ru`Шолоитцкуинтли`, el: 'shadow', rar: 2, stage: 2, fam: 'az_sholo', evo: 'az_xolotl', cost: 100, base: [170, 128, 144],
    desc: ru`Древний пёс-проводник: по поверьям ацтеков, такие собаки помогали душам перейти реку на пути в Миктлан. В городе знает все подземные переходы.`,
    look: { shape: 'tall', c1: '#57534e', c2: '#1c1917', c3: '#fb923c', eyes: 'round', mouth: 'none', back: ['ears'], feats: ['snout', 'lamp'] } },
  { id: 'az_xolotl', name: ru`Шолотль`, el: 'shadow', rar: 3, stage: 3, fam: 'az_sholo', base: [230, 168, 188],
    desc: ru`Бог вечерней звезды с собачьей головой, брат-близнец Кецалькоатля. Каждый вечер провожает солнце за горизонт и зажигает первую звезду над городом.`,
    look: { shape: 'robe', c1: '#6366f1', c2: '#1e1b4b', c3: '#fde68a', eye: '#fde68a', eyes: 'glow', mouth: 'none', back: ['ears', 'aura'], feats: ['snout', 'crown'] } },

  // ---------- редкие существа ----------
  { id: 'az_ahuizotl', name: ru`Ауисотль`, el: 'water', rar: 3, stage: 1, fam: 'az_ahuizotl', base: [214, 168, 190], time: 'night',
    desc: ru`Водяной пёс с ладошкой на кончике хвоста. Живёт в фонтанах и каналах и утаскивает на дно брошенные монетки — а заодно и уроненные телефоны.`,
    look: { shape: 'blob', c1: '#475569', c2: '#0f172a', c3: '#fbbf24', eye: '#fbbf24', eyes: 'glow', mouth: 'teeth', back: ['cattail', 'ears'], feats: ['drops'] } },
  { id: 'az_cipactli', name: ru`Сипактли`, el: 'forest', rar: 3, stage: 1, fam: 'az_cipactli', base: [184, 210, 206],
    desc: ru`Исполинский крокодил первоокеана: из его спины боги сделали землю — поэтому на ней и растут травы и деревья. Дремлет в городских прудах.`,
    look: { shape: 'blob', c1: '#6ee7b7', c2: '#065f46', c3: '#84cc16', eyes: 'round', mouth: 'teeth', back: ['sprout'], feats: ['snout', 'leaves'] } },
  { id: 'az_xiuhcoatl', name: ru`Шиукоатль`, el: 'current', rar: 3, stage: 1, fam: 'az_xiuhcoatl', base: [224, 148, 176],
    desc: ru`Бирюзовый огненный змей, оружие Уицилопочтли. Проносится молнией по проводам, а хвост у него искрит, как бенгальский огонь.`,
    look: { shape: 'wisp', c1: '#5eead4', c2: '#0f766e', c3: '#f97316', eye: '#fde047', eyes: 'glow', mouth: 'teeth', back: ['tail'], feats: ['bolt', 'flame'] } },

  // ---------- эпические боги ----------
  { id: 'az_tlaloc', name: ru`Тлалок`, el: 'water', rar: 4, stage: 1, fam: 'az_tlaloc', base: [206, 214, 218],
    desc: ru`Бог дождя и грома в маске с кругами у глаз. Живёт в горном саду Тлалокан и поливает город тёплыми ливнями — после них всё цветёт.`,
    look: { shape: 'robe', c1: '#7dd3fc', c2: '#0c4a6e', c3: '#e0f2fe', eyes: 'big', mouth: 'teeth', back: ['aura', 'ripples'], feats: ['crown', 'bolt'] } },
  { id: 'az_huitzilopochtli', name: ru`Уицилопочтли`, el: 'fire', rar: 4, stage: 1, fam: 'az_huitzilopochtli', base: [230, 186, 196], time: 'day',
    desc: ru`Бог солнца в шлеме-колибри. По преданию, он привёл ацтеков к озеру, где орёл сидел на кактусе, — там и вырос Теночтитлан. Выходит только днём.`,
    look: { shape: 'robe', c1: '#60a5fa', c2: '#1e3a8a', c3: '#fbbf24', eyes: 'angry', mouth: 'none', back: ['halo', 'wings'], feats: ['crest'] } },

  // ---------- великие боги-легенды ----------
  { id: 'az_quetzalcoatl', name: ru`Кецалькоатль`, el: 'wind', rar: 5, stage: 1, fam: 'az_quetzalcoatl', legend: true, base: [292, 238, 256],
    desc: ru`Легенда. Пернатый Змей, бог ветра и мудрости, подаривший людям кукурузу и календарь. Его ветер расчищает дорогу дождям. Встречается только в разломах.`,
    look: { shape: 'wisp', c1: '#34d399', c2: '#065f46', c3: '#fbbf24', eye: '#fde68a', eyes: 'glow', mouth: 'none', back: ['aura', 'wings', 'tail'], feats: ['crest', 'swirl'] } },
  { id: 'az_tezcatlipoca', name: ru`Тескатлипока`, el: 'shadow', rar: 5, stage: 1, fam: 'az_tezcatlipoca', legend: true, base: [298, 226, 244],
    desc: ru`Легенда. Дымящееся Зеркало, владыка ночного неба и вечный соперник Кецалькоатля. В его обсидиановом зеркале видно всё, что творится на свете. Ищи его в тёмных разломах.`,
    look: { shape: 'robe', c1: '#44403c', c2: '#0c0a09', c3: '#facc15', eye: '#facc15', eyes: 'glow', mouth: 'none', back: ['aura', 'cattail'], feats: ['crown', 'runes'] } },
];

// ===== www/js/myth-japan.js =====
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
  shrineDesc: ru`Святилище ками за алыми воротами-тории. Победи хранителя — и твой клан сможет держать святилище.`,
  gods: [ru`Аматэрасу`, ru`Сусаноо`, ru`Цукуёми`, ru`Инари`, ru`Хатимана`, ru`Идзанаги`, ru`Идзанами`, ru`Эбису`, ru`Рюдзина`, ru`Тэндзина`],
  guards: [ru`Харуто`, ru`Сакура`, ru`Рэн`, ru`Аой`, ru`Кэйта`, ru`Хина`],
  // клан мифологии (data.js, CLANS): открывается вместе с ней
  clan: { name: ru`Клан Кицунэ`, short: ru`Кицунэ`, member: ru`самурай`, motto: ru`Упади семь раз — встань восемь`, crest: 'fox', color: '#f472b6',
    desc: ru`Самураи под покровительством белых лис богини Инари. Клан пришёл, когда Кощей снова расколол Алатырь, и держит святилища за алыми тории.` },
};

// ===== www/js/data.js =====
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
const MEDAL_TIERS = [
  { name: ru`Бронза`, color: '#d97706', xp: 500 },
  { name: ru`Серебро`, color: '#cbd5e1', xp: 1500 },
  { name: ru`Золото`, color: '#fbbf24', xp: 5000 },
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
    gods: [ru`Одина`, ru`Тора`, ru`Фрейи`, ru`Фрейра`, ru`Бальдра`, ru`Тюра`, ru`Хеймдалля`, ru`Фригг`, ru`Браги`, ru`Идунн`],
    guards: [ru`Сигрид`, ru`Бьорн`, ru`Астрид`, ru`Лейф`, ru`Ингрид`, ru`Рагнар`] },
  celtic: { rift: ru`Холм сидов`, riftDesc: ru`Холм распахнулся в Иной мир волшебного народа: оттуда вышел сильный дух. Закрой проход, пока не прошёл час.`,
    shrine: ru`Каменный круг`, shrineOf: g => ru`Каменный круг ${g}`, shrineDesc: ru`Кольцо стоячих камней, где друиды встречали солнце. Победи хранителя — и твой клан сможет держать круг.`,
    gods: [ru`Дагды`, ru`Луга`, ru`Бригиты`, ru`Морриган`, ru`Мананнана`, ru`Цернунна`, ru`Эпоны`, ru`Дану`, ru`Огмы`],
    guards: [ru`Финн`, ru`Ниам`, ru`Кухулин`, ru`Мэйв`, ru`Эйдан`, ru`Бранвен`] },
  egypt: { rift: ru`Врата Дуата`, riftDesc: ru`Врата в Дуат, царство за закатом, открылись: из них вышел древний дух. Закрой врата, пока не прошёл час.`,
    shrine: ru`Обелиск`, shrineOf: g => ru`Обелиск ${g}`, shrineDesc: ru`Обелиск с иероглифами в честь богов Египта. Победи хранителя — и твой клан сможет держать обелиск.`,
    gods: [ru`Ра`, ru`Осириса`, ru`Исиды`, ru`Гора`, ru`Тота`, ru`Анубиса`, ru`Бастет`, ru`Хатхор`, ru`Птаха`, ru`Маат`],
    guards: [ru`Нефер`, ru`Аменхет`, ru`Мерит`, ru`Ками`, ru`Сенеб`, ru`Иси`] },
  china: { rift: ru`Небесные врата`, riftDesc: ru`Небесные врата приоткрылись среди облаков: с небес спустился сильный дух. Закрой врата, пока не прошёл час.`,
    shrine: ru`Пагода`, shrineOf: g => ru`Пагода ${g}`, shrineDesc: ru`Многоярусная пагода с фонарями в честь небесных стражей. Победи хранителя — и твой клан сможет держать пагоду.`,
    gods: [ru`Лазурного дракона`, ru`Белого тигра`, ru`Красной птицы`, ru`Чёрной черепахи`, ru`Цилиня`, ru`Фэнхуана`, ru`Нюйвы`, ru`Фуси`, ru`Пань-гу`],
    guards: [ru`Ли Мин`, ru`Мэйлин`, ru`Вэй`, ru`Лань`, ru`Чжан Юнь`, ru`Сяо Лун`] },
  aztec: { rift: ru`Врата Миктлана`, riftDesc: ru`Проход в Миктлан, подземное царство, открылся в камне: оттуда вышел сильный дух. Закрой врата, пока не прошёл час.`,
    shrine: ru`Пирамида`, shrineOf: g => ru`Пирамида ${g}`, shrineDesc: ru`Ступенчатая пирамида древних богов. Победи хранителя — и твой клан сможет держать пирамиду.`,
    gods: [ru`Кецалькоатля`, ru`Тлалока`, ru`Уицилопочтли`, ru`Шочикецаль`, ru`Тонатиу`, ru`Эекатля`, ru`Чальчиуитликуэ`, ru`Сентеотля`],
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
  { title: ru`Прогулки`,    reward: { charm: 20, honey: 5, water: 3, incense: 1, sparks: 1500, zlat: 20, xp: 1400 } },
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
  fmtDist(m) { return m < 1000 ? ru`${Math.round(m)} м` : ru`${(m / 1000).toFixed(m < 10000 ? 1 : 0)} км`; },
  fmtTime(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(s / 60), ss = s % 60;
    if (m >= 48 * 60) return ru`${Math.floor(m / 1440)} дн ${Math.floor(m / 60) % 24} ч`;
    return m >= 60 ? ru`${Math.floor(m / 60)} ч ${m % 60} мин` : `${m}:${String(ss).padStart(2, '0')}`;
  },
  // 4.15: формы слова по правилам языка игры: one — «1 оберег», few — «2 оберега», many — «5 оберегов»
  // (в других языках few не бывает: в переводе few и many — обычно одна и та же форма множественного числа)
  plural(n, one, few, many) {
    const L = I18N.lang, x = Math.abs(n);
    if (L === 'ru') { const a = x % 100, b = a % 10; return a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many; }
    if (L === 'zh' || L === 'ja' || L === 'ko' || L === 'id' || L === 'tr') return many;
    if (L === 'fr' || L === 'pt' || L === 'hi') return x < 2 ? one : many;
    return x === 1 ? one : many;
  },
  fmtNum(n) { return Math.round(n).toLocaleString(I18N.locale); },
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
  // 4.28: неделя мифологии — по кругу все семь (параллельно с событием недели): её духи встречаются в MYTH_MUL раз чаще
  get myth() { return MYTH_KEYS[this.week() % MYTH_KEYS.length]; },
  get nextMyth() { return MYTH_KEYS[(this.week() + 1) % MYTH_KEYS.length]; },
  MYTH_MUL: 3,
  // 4.28: × событие дороги Алатыря (Rules.ALATYR_WORLD): пока дорога в мир мифологии m распутана, её духи в MUL раз чаще
  mythMul(m, t = U.now()) { return (m === this.myth ? this.MYTH_MUL : 1) * this.roadMul(m, t); },
  /* 4.28: распутанные дороги Алатыря — [{ n, road, from, to }] (n — номер грани, road — мифология, from/to — мс).
     Сервер берёт их из базы (serve.js, World), телефон — из ответов сервера (событие roads, alatyr.js): у обоих одни и те же */
  roads: [],
  road(m, t = U.now()) { return (this.roads || []).find(r => r && r.road === m && t >= r.from && t < r.to) || null; },
  roadMul(m, t = U.now()) { return this.road(m, t) ? Rules.ALATYR_WORLD.MUL : 1; }, // две дороги одного мира разом — всё равно ×MUL
  roadsNow(t = U.now()) { return (this.roads || []).filter(r => r && t >= r.from && t < r.to); },
  // подпись набора дорог (сервер помнит, какой набор уже отдал телефону)
  roadsKey() { return (this.roads || []).map(r => `${r.n}:${r.from}`).join(','); },
  // только нужное для отбора духов и значка на карте: дороги, что ещё идут или скоро начнутся
  roadsLive(t = U.now()) { return (this.roads || []).filter(r => r && r.to > t).map(r => ({ n: r.n, road: r.road, from: r.from, to: r.to })); },
  // проверка присланного сервером (телефон): только известные мифологии и числа
  roadsClean(list) {
    return (Array.isArray(list) ? list : []).filter(r => r && typeof r.road === 'string' && Object.prototype.hasOwnProperty.call(MYTHS, r.road) && Number.isFinite(+r.from) && Number.isFinite(+r.to) && Number.isFinite(+r.n))
      .slice(0, 30).map(r => ({ n: +r.n | 0, road: r.road, from: +r.from, to: +r.to }));
  },

  /* 4.28: сезон Алатыря (Rules.ALATYR_WORLD). s — сезон, from — когда он начался (мс), start — общий счёт осколков на его
     начало, fin — финал { from, to, kills, goal } (все грани собраны: во всех Разломах Кощей), brk — когда Кощей расколет
     камень (Орден одолел его goal раз; иначе — в конце финала fin.to). С момента раскола — сезон s + 1, даже если база ещё
     не записала его. Сервер берёт всё из базы (serve.js, World), телефон — из ответов сервера (событие ala, alatyr.js) */
  ala: { s: 1, from: 0, start: 0, fin: null, brk: null },
  alaEnd() { const A = this.ala || {}; return A.brk || (A.fin && A.fin.to) || 0; },
  alaSeason(t = U.now()) { const A = this.ala || {}, e = this.alaEnd(); return Math.max(1, Math.floor(+A.s) || 1) + (e && t >= e ? 1 : 0); },
  // финал идёт (в момент t): все грани собраны, Кощей ещё не расколол камень
  finale(t = U.now()) { const f = (this.ala || {}).fin; return f && t >= f.from && t < this.alaEnd() ? f : null; },
  // открыть мифологии сезона, что идёт в момент t (data.js, mythOpen) — перед отбором духов
  alaSync(t = U.now()) { if (typeof mythOpen === 'function') mythOpen(this.alaSeason(t)); },
  // где камень текущего сезона при общем счёте total (сезон уже сменился, а база не записала начало — с нуля)
  // 5.x: и по зафиксированным ценам граней (goals — { n: цена }) и числу активных Ловчих N (Rules.alaPrices)
  alaG() { const A = this.ala || {}; return { goals: A.goals || {}, N: A.N || 0 }; },
  alaStage(total, t = U.now()) { const A = this.ala || {}, s = this.alaSeason(t); return Rules.alaStage(s, s === A.s ? (+total || 0) - (+A.start || 0) : 0, this.alaG()); },
  // для телефона и проверка присланного сервером
  alaView() { const A = this.ala || {}; return { s: A.s, from: A.from, start: A.start, fin: A.fin ? { ...A.fin } : null, brk: A.brk || null, goals: { ...(A.goals || {}) }, N: A.N || 0 }; },
  alaClean(x) {
    const num = v => (Number.isFinite(+v) && v !== null && v !== '' ? +v : 0);
    if (!x || typeof x !== 'object') return { s: 1, from: 0, start: 0, fin: null, brk: null, goals: {}, N: 0 };
    const f = x.fin && typeof x.fin === 'object' && num(x.fin.to) > num(x.fin.from) ? { from: num(x.fin.from), to: num(x.fin.to), kills: Math.max(0, num(x.fin.kills)), goal: Math.max(1, num(x.fin.goal) || Rules.ALATYR_WORLD.FINALE.GOAL) } : null;
    const goals = {};
    if (x.goals && typeof x.goals === 'object') Object.keys(x.goals).slice(0, 300).forEach(k => { const n = +k, p = Math.floor(num(x.goals[k])); if (Number.isInteger(n) && n >= 0 && n < 1e6 && p > 0) goals[n] = p; });
    return { s: Math.max(1, Math.floor(num(x.s)) || 1), from: num(x.from), start: Math.max(0, num(x.start)), fin: f, brk: num(x.brk) || null, goals, N: Math.max(0, Math.floor(num(x.N))) };
  },
  // подпись сезона (сервер помнит, какую уже отдал телефону); победы над Кощеем в неё не входят — их телефон спрашивает сам
  alaKey() {
    const A = this.ala || {}, g = Object.keys(A.goals || {}).sort((a, b) => a - b).map(k => `${k}=${A.goals[k]}`).join(',');
    return `${A.s}:${A.start}:${A.fin ? A.fin.from + '-' + A.fin.to : ''}:${A.brk || ''}:${g}:${A.N || 0}`;
  },

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
  // опыт: события (Звездопад, праздники) × 4.16: Настой опыта игрока (Rules.XP_BREW, пока действует)
  evXpMul() { return (this.cur.xp || 1) * ((this.hol && this.hol.xp) || 1); },
  xpMul() { return this.evXpMul() * (typeof S !== 'undefined' && S.d && S.d.xpUntil > Date.now() ? Rules.XP_BREW.MUL : 1); },
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
/* Небо: погода и фазы Луны.
   5.2: погоду решает сервер игры (GameCore.weather) — настоящую (Open-Meteo по клетке ~0.1°) или смоделированную, одну
   для всех Ловчих в клетке в этот час, и присылает её в каждом ответе (Game.apply → Sky.set). Телефон сам в сервис погоды
   не ходит; пока ответа сервера нет (запуск, нет связи) — показывает смоделированную (Sky.simulate). */

const Sky = {
  w: null, // { key, temp, src: 'real'|'sim', srv: погода от сервера, at, lat, lng }
  SRV_TTL: 2 * 3600000, // погода от сервера без обновления дольше — считается устаревшей (сервер давно не отвечал)

  init() {
    this.update(true);
    // 5.2: погода нужна карте — под полноэкранной сценой (stage.js) не спрашиваем; сцена закрылась — сверим один раз
    setInterval(() => { if (Stage.busy) this._miss = true; else this.update(); }, 5 * 60000);
    Stage.on(busy => { if (!busy && this._miss) { this._miss = false; setTimeout(() => this.update(), 500); } });
  },

  // Запасной вариант: погода от сервера есть и свежая — она и остаётся (новое место сервер пришлёт с ответом на шаг/телепорт);
  // нет — смоделированная, как её посчитал бы сервер без сервиса погоды
  update(force) {
    const p = MapView.pos;
    if (!p || !S.d) return;
    if (this.w && this.w.srv && Date.now() - this.w.at < this.SRV_TTL) return;
    const stale = !this.w || Date.now() - this.w.at > 30 * 60000 || U.dist(p.lat, p.lng, this.w.lat, this.w.lng) > 5000;
    if (!stale && !force) return;
    const w = this.simulate(p), changed = !this.w || this.w.key !== w.key;
    this.w = w;
    Bus.emit('weather', { w, changed });
  },

  // Погода от сервера (ответ на любое действие). Плашка и эффекты обновляются, только если она изменилась;
  // замена запасной модели настоящей при запуске — без всплывашки «Погода: …»
  set(x) {
    if (!x || !Object.prototype.hasOwnProperty.call(WEATHER, x.key)) return;
    const p = MapView.pos, prev = this.w;
    const w = { key: x.key, temp: Number.isFinite(x.temp) ? x.temp : null, src: x.src === 'real' ? 'real' : 'sim', srv: true, at: Date.now(), lat: p ? p.lat : 0, lng: p ? p.lng : 0 };
    this.w = w;
    if (prev && prev.srv && prev.key === w.key && prev.temp === w.temp && prev.src === w.src) return;
    Bus.emit('weather', { w, changed: !!(prev && prev.srv && prev.key !== w.key) });
  },
  // Коды погоды WMO → тип погоды игры (сервер, serve.js)
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
   а Источники, Капища и Разломы стоят у настоящих объектов (pois.js).
   Этот же код работает на сервере игры: он пересчитывает, был ли дух, источник или разлом там, где его нашёл игрок. */

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
  /* 4.28: духи всех семи мифологий разлетелись по свету (сюжет — LORE): мифология к месту не привязана. Чтобы мифологии
     встречались поровну (у славянской видов втрое больше), сначала выбирается мифология, потом вид */
  // Разлом и святилище у места — одной из открытых мифологий, поровну (постоянно, по id места).
  // 4.28: сезоны — каждая новая мифология забирает себе места поровну у прежних: место переходит к ней с вероятностью
  // 1 / (сколько мифологий стало), остальные места своей мифологии не меняют (закрытые мифологии мест не получают)
  placeMyth(p) {
    const base = Rules.ALATYR_WORLD.ORDER;
    let m = base[Math.floor(U.h('pm', p.id) * base.length)], n = base.length;
    for (const x of MYTH_KEYS) if (!base.includes(x)) { n++; if (U.h('pm', x, p.id) < 1 / n) m = x; }
    return m;
  },
  // из списка — виды одной мифологии, выбранной из тех, что в списке есть (x — случайное число 0…1): поровну, но с весом
  // Ev.mythMul — 4.28: мифология недели втрое чаще
  evenMyth(list, x) {
    const ms = MYTH_KEYS.filter(m => list.some(s => s.myth === m));
    if (ms.length < 2) return list;
    const w = ms.map(m => Ev.mythMul(m));
    let t = x * w.reduce((a, b) => a + b, 0), i = 0;
    for (; i < ms.length - 1; i++) { t -= w[i]; if (t < 0) break; }
    return list.filter(s => s.myth === ms[i]);
  },
  // из списка — виды мифологии m (если их нет — весь список)
  ofMyth(list, m) { const h = list.filter(s => s.myth === m); return h.length ? h : list; },
  // 4.28: все духи водятся везде — и духи родных земель, и вещие птицы частей света (их край — родина по легенде)
  local() { return true; },

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
    const pool = this.evenMyth(SPECIES.filter(s => s.el === el && !s.legend && this.local(s, lng, lat)), r()).map(s => { // 4.28: мифология — поровну
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
    Ev.alaSync(now); // 4.28: духи — только открытых в этом сезоне мифологий
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
      // 4.15: дух на карте — не выше уровня Ловчего; погода делает его сильнее (ближе к потолку), но не выше
      const maxL = Math.min(30 + (boost ? 5 : 0), S.catchLvl());
      const lvl = Math.max(boost ? Math.min(6, maxL) : 1, Math.min(maxL, Math.round(1 + r() * maxL)));
      const shiny = U.h('shiny', id) < Sky.shinyRate();
      out.push({ type: 'spirit', id, sid, lvl, boost, shiny, lat: pLat, lng: pLng, d, expires: (slot + 1) * this.SLOT - phase });
    });
    const tut = Tut.spawn(lat, lng);
    if (tut) out.push(tut);
    return out;
  },

  /* ---------- 5.2: места спят и просыпаются по неделям (Rules.PLACES) ---------- */
  /* Источник, Капище и Разлом у места есть, только пока место «не спит»: каждую неделю (Ev.week — с понедельника, как события
     недели) бодрствует доля SHARE мест, остальные пустые. У каждого места своя фаза (хэш id), окно бодрствования каждую
     неделю сдвигается на SHARE: место бодрствует, если (фаза + неделя × SHARE) mod 1 < SHARE. При SHARE = 0,4 — две недели
     из пяти, и никогда две недели подряд: на следующей неделе просыпаются другие места. Места игроков (usr:) не спят;
     новичку на обучении открыты все Источники (первый Источник — рядом). Считается одинаково на телефоне и на сервере. */
  awake(p, kind, t = U.now()) {
    const id = String((p && p.id) || ''), P = Rules.PLACES;
    if (id.startsWith('usr:')) return true;
    if (kind === 'spring' && typeof S !== 'undefined' && S.d && S.d.tut) return true;
    return (U.h('wake', id) + Ev.week(t) * P.SHARE) % 1 < P.SHARE;
  },

  /* ---------- Источники: у реальных объектов (см. pois.js) ---------- */
  // p — объект карты { id, lat, lng, name, photo }; d — расстояние до игрока
  springFor(p, d) {
    const slot = Math.floor(U.now() / 7200000), id = p.id, last = S.d.springs[id] || 0;
    // вторжение Нави: ~12% источников захвачены на двухчасовое окно (с INVASION_LEVEL уровня)
    const invId = `${id}:${slot}`;
    const invaded = S.d.level >= INVASION_LEVEL &&U.h('inv', id, slot) < 0.12 && !S.d.freed[invId];
    return { type: 'spring', id, invId, invaded, lat: p.lat, lng: p.lng, d, name: p.name, photo: p.photo, cat: p.cat,
      ready: U.now() - last > this.SPRING_COOLDOWN, readyAt: last + this.SPRING_COOLDOWN };
  },
  springsAround(lat, lng, radius = this.VIEW + 150) {
    return Poi.near(lat, lng, radius, 'spring').filter(p => this.awake(p, 'spring')).map(p => this.springFor(p, p.d)); // 5.2: спящих нет
  },

  /* ---------- Разломы: каждый час открываются у части Капищ ---------- */
  riftAt(id, hour) { return U.h('rr', id, hour) < 0.35; },
  // Разлом у капища p в этот час (или null); 5.2: у спящего места Разломов нет — и Великих (Кощей) тоже
  riftFor(p, d, hour = Math.floor(U.now() / 3600000)) {
    if (!this.riftAt(p.id, hour) || !this.awake(p, 'shrine', hour * 3600000)) return null;
    const id = `${p.id}:${hour}`;
    const r = U.rng(id);
    const myth = this.placeMyth(p); // 4.28: босс — из мифологии Разлома
    // 4.28: финал сезона Алатыря — во всех Разломах мира великий босс Кощей (fin — номер сезона: победы идут в общий счёт)
    const t0 = hour * 3600000;
    if (Ev.finale(t0)) return { type: 'rift', id, poi: p.id, lat: p.lat, lng: p.lng, d, tier: 3, boss: 'koschey', myth, fin: Ev.alaSeason(t0), place: p.name, done: !!S.d.rifts[id], endsAt: (hour + 1) * 3600000 };
    const tier = U.weighted(Ev.cur.rifts ? [[1, 40], [2, 30], [3, 30]] : [[1, 60], [2, 30], [3, 10]], r());
    let pool;
    if (tier === 3) pool = this.ofMyth(SPECIES.filter(s => s.legend && (!Ev.hol || !Ev.hol.koschey || s.id === 'koschey')), myth);
    else if (tier === 2) pool = this.ofMyth(SPECIES.filter(s => !s.legend && s.rar >= 3 && this.local(s, p.lng, p.lat) && Ev.seasonal(s) > 0), myth);
    else pool = this.ofMyth(SPECIES.filter(s => s.rar === 2), myth);
    // в неделю стихии разломы чаще охраняют духи этой стихии
    const evPool = pool.filter(s => s.el === Ev.cur.el);
    if (evPool.length && r() < 0.6) pool = evPool;
    const boss = pool[Math.floor(r() * pool.length)].id;
    return { type: 'rift', id, poi: p.id, lat: p.lat, lng: p.lng, d, tier, boss, myth, place: p.name, done: !!S.d.rifts[id], endsAt: (hour + 1) * 3600000 };
  },
  riftsAround(lat, lng, radius = this.VIEW + 500) {
    Ev.alaSync();
    return Poi.near(lat, lng, radius, 'shrine').map(p => this.riftFor(p, p.d)).filter(Boolean);
  },

  // 4.19: что и с каким весом кладёт источник (на каждый из 4–6 бросков) — общее для добычи и вкладки «Добыча»
  SPRING_GIFT: 0.6, SPRING_COCOON: 0.12,
  springOpts(lvl) {
    // 4.15: лечебное; 4.16: мёда, Живой воды и ладана меньше (к 40 уровню копились сотнями и десятками),
    // Мёртвая вода — ~1 источник из 500 (раньше из 300, но при полной сумке источник не давал ничего)
    const opts = [['charm', 12], ['honey', Ev.hol && Ev.hol.honey ? 8 : 1], ['water', 0.6], ['herb', 2], ['brew', 0.8], ['deadwater', 0.009]];
    if (lvl >= 8) opts.push(['charm2', 3]);
    if (lvl >= 16) opts.push(['charm3', 1.5]);
    if (lvl >= 3) opts.push(['incense', 0.08]);
    return opts;
  },
  springLoot(id) {
    const r = U.rng(id + Math.random());
    const lvl = S.d.level, loot = {};
    const n = (4 + Math.floor(r() * 3)) * Ev.lootMul();
    const opts = this.springOpts(lvl);
    for (let k = 0; k < n; k++) {
      const it = U.weighted(opts, r());
      loot[it] = (loot[it] || 0) + 1;
    }
    // подарок для друга — в трёх источниках из пяти (4.16: было в каждом втором), пока их меньше GIFT_LIMIT
    if ((S.d.items.gift || 0) < GIFT_LIMIT && r() < this.SPRING_GIFT) loot.gift = 1;
    let cocoon = null;
    if (S.d.cocoons.length < 9 && r() < this.SPRING_COCOON * Ev.kmMul()) cocoon = U.weighted([[2, 5], [5, 4], [10, 1]], r());
    return { loot, cocoon };
  },

  /* ---------- Капища ---------- */
  shrineFor(p, d) {
    const id = p.id;
    const tier = U.weighted([[1, 50], [2, 35], [3, 15]], U.h('kt', id));
    const myth = this.placeMyth(p), gods = MYTH_PLACES[myth].gods; // 4.28: святилище мифологии места
    const god = gods[Math.floor(U.h('kn', id) * gods.length)];
    const hold = typeof Clans !== 'undefined' ? Clans.info(id) : null; // на сервере сводки нет — он спрашивает базу сам
    return { type: 'shrine', id, tier, name: p.name, god, myth, photo: p.photo, lat: p.lat, lng: p.lng, d, won: S.d.shrines[id] === U.today(), clan: hold ? hold.clan : null };
  },
  // Капище у реального объекта; пока в нём открыт Разлом, поединок недоступен
  shrinesAround(lat, lng, radius = this.VIEW + 400) {
    const hour = Math.floor(U.now() / 3600000);
    Ev.alaSync();
    return Poi.near(lat, lng, radius, 'shrine').filter(p => this.awake(p, 'shrine') && !this.riftAt(p.id, hour)).map(p => this.shrineFor(p, p.d));
  },
  /* 4.16: соперники в Капищах и вторжениях подстраиваются под СИЛУ духов игрока, а не только под его уровень:
     раньше уровень хранителя равнялся уровню духов игрока, но виды у хранителя слабее — и сильный Ловчий не проигрывал.
     Ориентир — треть суммы сил трёх сильнейших духов игрока, которые могут биться (не выбранной команды: слабой командой
     соперника не ослабить; у новичка с одним-двумя духами пустые места считаются нулём — и хранитель ему по силам).
     Сильнейшие без сил — соперник слабеет вместе с командой, но не ниже 3/4 от силы по всем духам: падение всё же стоит сил */
  topPower() {
    const top3 = list => list.map(x => S.power(x)).sort((a, b) => b - a).slice(0, 3).reduce((a, x) => a + x, 0) / 3;
    return Math.max(10, top3(S.d.spirits.filter(x => S.alive(x))), top3(S.d.spirits) * 0.75);
  },
  // Уровень, на котором дух (его вид и качество) наберёт силу pw (обратная к S.stats формула)
  lvlFor(sp, pw) {
    const b = SP[sp.sid].base, A = b[0] + sp.iv[0], D = b[1] + sp.iv[1], St = b[2] + sp.iv[2];
    const c = Math.sqrt(Math.max(10, pw) * 10 / (A * Math.sqrt(D * St))), x = Math.max(0, (c - 0.094) / (0.7903 - 0.094));
    return Math.round(1 + 39 * x * x);
  },
  // Дух соперника силой около pw: вид и качество — из зерна, уровень — под силу; слабому виду не хватает 40 уровней — он
  // превращается, а если и так не дотянуть — выходит дух посильнее из strong (самый слабый из тех, кому хватает)
  foeSpirit(sid, pw, seed, ivMin, strong) {
    const sp = S.makeSpirit(sid, 1, seed, { ivMin });
    for (;;) {
      const lvl = this.lvlFor(sp, pw);
      if (lvl <= 40 || !SP[sp.sid].evo) { sp.lvl = U.clamp(lvl, 1, 40); break; }
      sp.sid = SP[sp.sid].evo;
    }
    if (strong && strong.length && S.power(sp) < pw * 0.9) {
      const alt = strong.map(s => ({ sid: s.id, p: S.power({ sid: s.id, lvl: 40, iv: sp.iv }) })).sort((a, b) => a.p - b.p);
      sp.sid = (alt.find(x => x.p >= pw) || alt[alt.length - 1]).sid;
      sp.lvl = U.clamp(this.lvlFor(sp, pw), 1, 40);
    }
    return sp;
  },
  // Не хватило силы (самые сильные виды и на 40 уровне слабее цели) — соперник бьёт чаще: темп × (сила / цель)³, но не больше чем вдвое
  foeSpeed(speed, team, pw) {
    const got = team.reduce((a, x) => a + S.power(x), 0) / (pw * team.length);
    return Math.round(speed * U.clamp(Math.pow(got / 0.95, 3), 0.5, 1) * 1000) / 1000; // разброс силы ±10% темп не меняет
  },

  // Прислужник Нави на захваченном источнике: трое омрачённых духов одной стихии (4.16: сила отряда — от силы духов игрока)
  grunt(e) {
    const r = U.rng('grunt' + e.invId);
    const el = ELEMENT_KEYS[Math.floor(r() * ELEMENT_KEYS.length)];
    const pool = this.evenMyth(SPECIES.filter(s => s.el === el && !s.legend && !s.season && s.rar <= 3), r()); // 4.28: мифология — поровну
    const strong = this.ofMyth(SPECIES.filter(s => s.el === el && !s.legend && !s.season && !s.evo), pool[0].myth);
    const pw = this.topPower() * Duel.FOE.invasion.pow;
    const team = [];
    for (let k = 0; k < 3; k++) {
      const s = pool[Math.floor(r() * pool.length)];
      const sp = this.foeSpirit(s.id, pw * (0.9 + r() * 0.2), e.invId + k, 3, strong);
      sp.dark = true;
      team.push(sp);
    }
    return { name: ru`Прислужник Нави`, color: '#3b0764', title: ru`Отряд стихии «${ELEMENTS[el].name}»`, team, el, quote: GRUNT_QUOTES[Math.floor(r() * GRUNT_QUOTES.length)],
      speed: this.foeSpeed(Duel.FOE.invasion.speed, team, pw) };
  },

  // Хранитель меняется каждый день; 4.16: сила его духов — доля SHRINE_TIERS.pow от силы духов игрока
  guardian(e) {
    const r = U.rng(e.id + U.today());
    const T = SHRINE_TIERS[e.tier];
    const myth = e.myth || this.placeMyth(e), gs = MYTH_PLACES[myth].guards; // 4.28: хранитель, его имя и духи — из мифологии святилища
    const name = gs[Math.floor(r() * gs.length)];
    const color = GUARD_COLORS[Math.floor(r() * GUARD_COLORS.length)];
    // Ученик — первые стадии, Мастер — до второй, Старейшина — любые, включая редких (слабый вид сильному Ловчему выходит уже превращённым)
    const rars = e.tier === 1 ? [1, 2] : e.tier === 2 ? [1, 2, 3] : [2, 3, 4];
    const maxStage = e.tier === 1 ? 1 : e.tier === 2 ? 2 : 3;
    const pool = this.ofMyth(SPECIES.filter(s => !s.legend && !s.season && rars.includes(s.rar) && s.stage <= maxStage), myth);
    const pw = this.topPower() * T.pow;
    const team = [];
    while (team.length < 3) {
      const s = pool[Math.floor(r() * pool.length)];
      if (team.some(x => SP[x.sid].fam === s.fam)) continue;
      // сильному Ловчему — сильнейшие виды (у Старейшины — и эпические), без повторов семейств
      const strong = this.ofMyth(SPECIES.filter(x => !x.legend && !x.season && !x.evo && x.rar >= 2 && x.rar <= (e.tier === 3 ? 4 : 3) && !team.some(y => SP[y.sid].fam === x.fam)), myth);
      team.push(this.foeSpirit(s.id, pw * (0.9 + r() * 0.2), e.id + U.today() + team.length, e.tier * 4, strong));
    }
    return { name, color, title: T.title, team, speed: this.foeSpeed(T.speed, team, pw) };
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
    d.tasks = d.tasks || []; // поручения из источников
    d.taskMeet = d.taskMeet || []; // встречи за выполненные поручения: { id, sid, lvl }
    d.guards = d.guards || []; // мои защитники на Капищах: { id, name, sid, t }
    // монеты — вторая валюта (с 3.14; в 3.12–3.13 назывались гривнами — переносим один к одному)
    d.zlat = (d.zlat || 0) + (d.grivna || 0); delete d.grivna;
    // 3.19 и 4.16: новая кривая опыта — опыт переносится в то же место внутри текущего уровня (уровень не понижается).
    // xpv: нет — кривая до 3.19 (levelXPOld), 2 — кривая 3.19–4.15 (levelXP2), 3 — нынешняя (levelXP)
    if (d.xpv !== 3) {
      const L = d.level || 1, F = d.xpv === 2 ? levelXP2 : levelXPOld;
      if (L >= MAX_LEVEL) d.xp = Math.max(d.xp || 0, levelXP(MAX_LEVEL));
      else if (L > 1 || d.xp > 0) {
        const o0 = F(L), o1 = F(L + 1), n0 = levelXP(L), n1 = levelXP(L + 1);
        const f = U.clamp(((d.xp || 0) - o0) / (o1 - o0), 0, 0.999);
        d.xp = Math.round(n0 + f * (n1 - n0));
      }
      d.xpv = 3;
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
    // 4.16: осколки Алатыря (пробуждение духов) и эссенция Рода (подходит любому семейству)
    d.alatyr = d.alatyr || 0; d.rod = d.rod || 0; d.stats.awakened = d.stats.awakened || 0;
    // 4.24: обучение без сцен — шаг прежнего списка (4.0: tutV 4; 3.x: 1 поймать, 2 источник, 3 меню) переводится
    // на ближайший шаг нового, который ещё впереди; дальше последнего — обучение пройдено
    if (d.tut && d.tutV !== TUT_V) {
      const OLD = ['meet', 'lore', 'catch1', 'ring', 'catch2', 'menu', 'spirits', 'card', 'power', 'dex', 'springs', 'spring', 'bag', 'road', 'cocoons', 'quests', 'path', 'oath'];
      const from = d.tutV === 4 ? d.tut - 1 : Math.max(0, OLD.indexOf({ 1: 'catch1', 2: 'springs', 3: 'road' }[d.tut]));
      const next = OLD.slice(from).map(id => TUT.findIndex(x => x.id === id)).find(k => k >= 0);
      d.tut = next === undefined ? 0 : next + 1; d.tutV = TUT_V;
    }
    if (d.buddy === undefined) d.buddy = null;
    // 4.28: дружины стали кланами мифологий (CLAN_OLD): прежняя дружина — её клан, и один бесплатный переход в любой
    // открытый клан (clanFree) — тем, кто был в дружине до обновления. clanV 2 — перенос сделан (и у новых Ловчих)
    if (d.clanV !== 2) {
      if (d.clan) { d.clan = clanOf(d.clan); if (d.clan) d.clanFree = 1; }
      d.clanV = 2;
    }
    if (d.clan && clanOf(d.clan) !== d.clan) d.clan = clanOf(d.clan);
  },

  newGame(name, starter) {
    this.d = {
      v: 1, name, level: 1, xp: 0, sparks: 500, created: Date.now(),
      items: { charm: 30, honey: 3, water: 3, incense: 1, gate: 1 }, // 5.1: и одни Врата Перепутицы — сменить место через Атлас сразу
      essence: {}, spirits: [], dex: {}, cocoons: [{ id: U.uid(), km: 2, walked: 0, inc: true }],
      springs: {}, rifts: {}, caught: {}, incenseUntil: 0, lastPos: null, quests: null,
    };
    this.migrate();
    const sp = this.makeSpirit(starter, Math.min(5, this.catchLvl()), 'starter' + Date.now(), { ivMin: 10 });
    this.addSpirit(sp, true);
    this.d.essence[SP[starter].fam] = 10;
    this.d.buddy = { uid: sp.uid, km: 0, finds: 0 };
    this.d.tut = 1; this.d.tutV = TUT_V; // обучение новичка (4.0; 4.24 — подсказками)
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
  // 4.16: переплавка — Rules.MELT.N одинаковых амулетов из сумки и искры → один амулет на выбор (лишние амулеты копились сотнями)
  canMeltAmulet(from, to) {
    const M = Rules.MELT;
    if (!AMULET_KEYS.includes(from) || !AMULET_KEYS.includes(to)) return ru`Такого амулета нет`;
    if (from === to) return ru`Выбери другой амулет`;
    if ((this.d.amulets[from] || 0) < M.N) return ru`Для переплавки нужно ${M.N} одинаковых амулета`;
    if (this.d.sparks < M.SPARKS) return ru`Нужно ✦ ${M.SPARKS}`;
    return null;
  },
  meltAmulet(from, to) {
    if (this.canMeltAmulet(from, to)) return false;
    this.d.amulets[from] -= Rules.MELT.N;
    this.d.sparks -= Rules.MELT.SPARKS;
    this.addAmulet(to);
    return true;
  },
  canLearnMove2(sp) {
    if (sp.move2) return ru`Приём уже выучен`;
    if (this.d.sparks < MOVE2_COST.sparks) return ru`Нужно ✦ ${MOVE2_COST.sparks}`;
    if ((this.d.essence[SP[sp.sid].fam] || 0) < MOVE2_COST.essence) return ru`Нужно ${MOVE2_COST.essence} эссенции`;
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
    return { uid: U.uid(), sid, lvl, iv, t: Date.now(), fav: false, nick: null, code: this.newSpiritCode() };
  },
  // 4.17: код духа — 8 цифр, выбит точками на защитной плёнке стикера. Идёт с духом через аукцион; у духов до 4.17 — из uid
  newSpiritCode() { return String(1e7 + Math.floor(Math.random() * 9e7)); },
  spiritCode(sp) { return sp.code || String(1e7 + Math.floor(U.h('code', sp.uid) * 9e7)); },
  // 4.17: привязка — плёнка на обороте содрана (sp.bound — когда): дух остаётся у Ловчего навсегда, продать его нельзя
  isBound(sp) { return !!sp.bound; },
  ivPct(sp) { return Math.round((sp.iv[0] + sp.iv[1] + sp.iv[2]) / 45 * 100); },
  // Предел уровня духа: уровень Ловчего +5 (не выше 40) и ещё AWAKE.STEP за каждую звезду пробуждения,
  // открытую уровнем Ловчего (купленный или подаренный дух без звёзд — как раньше)
  maxLvl(sp) { return Math.min(40, this.d.level + 5) + (sp ? this.AWAKE.STEP * this.starsOn(sp) : 0); },

  /* ---------- 4.16: пробуждение — прогресс духа после предела уровня ----------
     Звезда n (1…5) открывается на уровне Ловчего LVL[n-1], стоит осколков Алатыря, эссенции семейства и искр
     и поднимает предел уровня духа на STEP (до SPIRIT_MAX = 50). Дух должен сначала дойти до своего предела. */
  AWAKE: { MAX: 5, STEP: 2, LVL: [20, 25, 30, 35, 40], ALATYR: [2, 3, 4, 5, 6], ESS: [10, 15, 20, 25, 30], SPARKS: [10000, 20000, 30000, 40000, 50000] },
  starsOn(sp) { return Math.min(sp.stars || 0, this.AWAKE.LVL.filter(l => this.d.level >= l).length); },
  awakenCost(sp) { const n = sp.stars || 0, A = this.AWAKE; return n >= A.MAX ? null : { lvl: A.LVL[n], alatyr: A.ALATYR[n], essence: A.ESS[n], sparks: A.SPARKS[n] }; },
  canAwaken(sp) {
    const c = this.awakenCost(sp);
    if (!c) return ru`Дух пробуждён полностью`;
    if (this.d.level < c.lvl) return ru`Следующая звезда откроется на ${c.lvl} уровне Ловчего`;
    if (sp.lvl < this.maxLvl(sp)) return ru`Сначала усиль духа до предела: уровень ${this.maxLvl(sp)}`;
    if ((this.d.alatyr || 0) < c.alatyr) return ru`Нужно осколков Алатыря: ${c.alatyr}`;
    if ((this.d.essence[SP[sp.sid].fam] || 0) < c.essence) return ru`Нужно ${c.essence} эссенции`;
    if (this.d.sparks < c.sparks) return ru`Нужно ✦ ${c.sparks}`;
    return null;
  },
  awaken(sp) {
    if (this.canAwaken(sp)) return false;
    const c = this.awakenCost(sp);
    this.d.alatyr -= c.alatyr; this.d.essence[SP[sp.sid].fam] -= c.essence; this.d.sparks -= c.sparks;
    sp.stars = (sp.stars || 0) + 1;
    this.d.stats.awakened++;
    J.add('awaken', { sid: sp.sid, stars: sp.stars });
    this.progress('awaken', 1);
    this.save();
    return true;
  },

  /* ---------- 4.16: эссенция Рода — общая для всех семейств ----------
     Лишнюю эссенцию семейства можно переплавить: MELT эссенции → 1 эссенция Рода. Эссенция Рода вливается
     в любое семейство: 1 → 1, а в семейство легенды — LEGEND → 1 (эссенции легенд иначе почти не добыть) */
  ESS: { MELT: 5, LEGEND: 3 },
  famOk(fam) { return !!(SP[fam] && SP[fam].fam === fam); },
  canMelt(fam, n) {
    if (!this.famOk(fam)) return ru`Нет такого семейства`;
    if (SP[fam].legend) return ru`Эссенцию легенд переплавить нельзя`;
    if (!(n >= 1 && n === Math.floor(n))) return ru`Сколько переплавить?`;
    if ((this.d.essence[fam] || 0) < n * this.ESS.MELT) return ru`Нужно ${n * this.ESS.MELT} эссенции`;
    return null;
  },
  melt(fam, n) { // n — сколько эссенции Рода получить
    if (this.canMelt(fam, n)) return false;
    this.d.essence[fam] -= n * this.ESS.MELT; this.d.rod = (this.d.rod || 0) + n;
    this.save();
    return true;
  },
  pourRate(fam) { return SP[fam] && SP[fam].legend ? this.ESS.LEGEND : 1; },
  canPour(fam, n) {
    if (!this.famOk(fam)) return ru`Нет такого семейства`;
    if (!(n >= 1 && n === Math.floor(n))) return ru`Сколько влить?`;
    if ((this.d.rod || 0) < n * this.pourRate(fam)) return ru`Нужно эссенции Рода: ${n * this.pourRate(fam)}`;
    return null;
  },
  pour(fam, n) { // n — сколько эссенции семейства получить
    if (this.canPour(fam, n)) return false;
    this.d.rod -= n * this.pourRate(fam); this.addEssence(fam, n);
    this.save();
    return true;
  },
  // Трофеи разлома сверх обычной награды: эссенция семейства босса (легенды — из великих разломов) и осколки Алатыря
  RIFT_ESS: { 1: 2, 2: 4, 3: 6 },
  ALATYR_DROP: { rift: { 2: 0.2, 3: 1 }, duel: { 3: 0.1 } }, ALATYR_DAY: 2, // в бою — не больше двух осколков в день (дальние великие разломы не фармятся)
  riftSpoils(boss, tier) {
    const out = [], fam = SP[boss].fam, n = this.RIFT_ESS[tier] || 0;
    if (n) { this.addEssence(fam, n); out.push({ k: 'ess', n, label: ru`Эссенция «${SP[fam].name}»` }); }
    return out.concat(this.alatyrDrop('rift', tier));
  },
  alatyrDrop(kind, tier) {
    const p = (this.ALATYR_DROP[kind] || {})[tier] || 0, day = U.today();
    if (this.d.alaDay && this.d.alaDay.day !== day) this.d.alaDay = null;
    if (!p || (this.d.alaDay && this.d.alaDay.n >= this.ALATYR_DAY) || Math.random() >= p) return [];
    this.d.alaDay = { day, n: (this.d.alaDay ? this.d.alaDay.n : 0) + 1 };
    this.d.alatyr = (this.d.alatyr || 0) + 1;
    this.d.alaGiven = (this.d.alaGiven || 0) + 1; // 4.28: и в общий счёт Ордена (осколок остаётся у Ловчего) — вклад за всё время
    this.alaMine().n++; // 4.28: и вклад за сезон Алатыря (награда в конце сезона — GameCore.alaTurn)
    return [{ k: 'alatyr', n: 1, label: ru`Осколки Алатыря` }];
  },
  // 4.28: вклад Ловчего в сезон Алатыря: { s — сезон, n — осколков, k — побед над Кощеем в финале }. Смену сезона
  // (награду за прошлый) делает сервер в начале запроса (GameCore.alaTurn) — здесь только запись текущего
  alaMine() {
    const s = typeof Ev !== 'undefined' && Ev.alaSeason ? Ev.alaSeason() : 1, a = this.d.alaS;
    if (!a || typeof a !== 'object' || !(a.s >= 1)) this.d.alaS = { s, n: 0, k: 0 };
    return this.d.alaS;
  },
  resName(k) { return k === 'alatyr' ? ru`Осколки Алатыря` : k === 'rod' ? ru`Эссенция Рода` : k === 'sparks' ? ru`Искры` : k === 'zlat' ? ru`Монеты` : k === 'xp' ? ru`Опыт` : ITEMS[k] ? ITEMS[k].name : k; },
  /* 4.15: здоровье духа — доля от полного (1 — здоров). Храним долю, а не очки: усиление и превращение ран не сбивают.
     hpf — доля на момент hpt, дальше дух сам восстанавливает Rules.HP.REGEN в час; ko — когда упал без сил:
     до Rules.koMs (2–24 ч по редкости) в бой не идёт, потом поднимается сам на Rules.HP.BACK (10%) */
  hpNow(sp, now = U.now()) {
    const H = Rules.HP;
    if (!sp) return 0;
    const cap = this.hpCap(sp, now); // 4.16: усталый дух выше предела не поднимется
    if (sp.ko) { const t = now - sp.ko, ko = Rules.koMs(sp); return t < ko ? 0 : Math.min(cap, H.BACK + H.REGEN * (t - ko) / 3600000); }
    if (sp.hpf == null) return cap;
    return Math.min(cap, sp.hpf + H.REGEN * Math.max(0, now - (sp.hpt || now)) / 3600000);
  },
  /* 4.16: усталость — очки боёв (sp.tired на момент sp.tiredT), тают по очку за Rules.HP.TIRED.REST часов.
     Сверх FREE очков каждое срезает STEP от предела здоровья (hpCap), не ниже MIN */
  tired(sp, now = U.now()) { return sp && sp.tired ? Math.max(0, sp.tired - Math.max(0, now - (sp.tiredT || now)) / (Rules.HP.TIRED.REST * 3600000)) : 0; },
  hpCap(sp, now = U.now()) { const T = Rules.HP.TIRED; return Math.max(T.MIN, 1 - T.STEP * Math.max(0, this.tired(sp, now) - T.FREE)); },
  tire(sp, n = 1, now = U.now()) {
    const t = Math.round((this.tired(sp, now) + n) * 100) / 100;
    if (t > 0) { sp.tired = t; sp.tiredT = now; } else { delete sp.tired; delete sp.tiredT; }
  },
  // сколько отдыхать до полного предела здоровья, мс
  restLeft(sp, now = U.now()) { const T = Rules.HP.TIRED; return Math.max(0, this.tired(sp, now) - T.FREE) * T.REST * 3600000; },
  alive(sp) { return this.hpNow(sp) > 0; },
  koLeft(sp, now = U.now()) { return sp && sp.ko ? Math.max(0, Rules.koMs(sp) - (now - sp.ko)) : 0; },
  setHp(sp, f, now = U.now()) {
    f = Math.max(0, Math.min(1, +f || 0));
    delete sp.ko; delete sp.hpf; delete sp.hpt;
    if (f <= 0) { sp.ko = now; } else if (f < 0.999) { sp.hpf = Math.round(f * 1000) / 1000; sp.hpt = now; }
  },
  healItems() { return Object.keys(ITEMS).filter(k => ITEMS[k].heal || ITEMS[k].revive); },
  canHeal(sp, k) {
    const it = ITEMS[k], h = this.hpNow(sp);
    if (!sp) return ru`Дух не найден`;
    if (!it || !(it.heal || it.revive)) return ru`Этим не лечат`;
    if (!(this.d.items[k] > 0)) return ru`${it.name}: нет в сумке`;
    if (h <= 0 && !it.revive) return ru`Дух без сил — поможет только Мёртвая вода или время`;
    if (h > 0 && !it.heal) return ru`Мёртвая вода не лечит живых — только поднимает духов без сил`;
    if (h >= 1) return ru`Дух здоров`;
    if (h >= this.hpCap(sp) - 0.02) return ru`Дух устал — лечение не поможет, нужен отдых`; // 4.16
    return null;
  },
  heal(sp, k) {
    const err = this.canHeal(sp, k); if (err) return err;
    const it = ITEMS[k], h = this.hpNow(sp);
    this.useItem(k);
    // 4.15.1: Мёртвая вода сдвигает время падения на revive часов назад; срок вышел — дух поднимается ровно на BACK (10%)
    if (h <= 0) { sp.ko -= it.revive * 3600000; if (!this.koLeft(sp)) this.setHp(sp, Rules.HP.BACK); }
    else this.setHp(sp, Math.min(this.hpCap(sp), h + it.heal)); // 4.16: не выше предела усталого духа
    this.save();
    return null;
  },
  // здоровье бойцов после боя: { uid: доля }
  hpReport(fighters) { const o = {}; (fighters || []).forEach(f => { if (f && f.sp && f.sp.uid) o[f.sp.uid] = Math.round(Math.max(0, f.cur) / f.max * 1000) / 1000; }); return o; },
  // 4.15: пойманный дух — не выше уровня Ловчего (усиливать можно дальше, до уровня +5)
  catchLvl() { return Math.max(1, Math.min(40, this.d.level)); },
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
      let extra = null;
      if (b.finds % 3 === 0) {
        const it = U.weighted([['charm', 5], ['honey', 2], ['water', 1]], Math.random());
        const n = it === 'charm' ? 3 : 1;
        if (this.addItem(it, n)) extra = [I18N.low(ITEMS[it].name), n];
      }
      const nm = U.esc(sp.nick || s.name);
      Bus.emit('buddyFind', extra ? ru`Спутник «${nm}» принёс 3 эссенции и ${extra[0]} ×${extra[1]}!` : ru`Спутник «${nm}» принёс 3 эссенции!`);
    }
  },
  addEssence(fam, n) { this.d.essence[fam] = (this.d.essence[fam] || 0) + n; },
  // 4.16: искр до 20 уровня — как раньше (200…1 200), выше — дороже на 15% за каждый уровень после 20-го (30 → ✦ 4 000,
  // 39 → ✦ 7 700): прежде усиление стоило 200–2 000, и к 40 уровню Ловчего копились сотни тысяч лишних искр
  powerUpSparks(lvl) {
    const base = 200 + 200 * Math.floor((lvl - 1) / 4);
    return lvl <= 20 ? base : Math.round(base * (1 + 0.15 * (lvl - 20)) / 50) * 50;
  },
  powerUpCost(sp) { return { sparks: this.powerUpSparks(sp.lvl), essence: 1 + Math.floor(sp.lvl / 10) }; },
  canPowerUp(sp) {
    const c = this.powerUpCost(sp), fam = SP[sp.sid].fam;
    if (sp.lvl >= this.maxLvl(sp)) {
      const a = this.awakenCost(sp);
      if (sp.lvl >= SPIRIT_MAX) return ru`Дух достиг наивысшего уровня`;
      if (a && this.d.level >= a.lvl) return ru`Предел уровня — пробуди духа, чтобы поднять его`;
      return sp.stars ? ru`Предел уровня растёт с уровнем Ловчего и пробуждением` : ru`Предел: уровень духа не может быть выше уровня Ловчего +5`;
    }
    if (this.d.sparks < c.sparks) return ru`Не хватает искр`;
    if ((this.d.essence[fam] || 0) < c.essence) return ru`Не хватает эссенции`;
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
  // 4.16: цена очищения растёт с редкостью духа (обычный ✦ 3 000 … легендарный ✦ 20 000) — при избытке искр оно было даровым
  PURIFY_SPARKS: { 1: 3000, 2: 5000, 3: 8000, 4: 12000, 5: 20000 },
  purifyCost(sp) { return { sparks: this.PURIFY_SPARKS[(SP[sp.sid] || {}).rar] || this.PURIFY.sparks, essence: this.PURIFY.essence }; },
  canPurify(sp) {
    const c = this.purifyCost(sp);
    if (!sp.dark) return ru`Дух не омрачён`;
    if (this.d.sparks < c.sparks) return ru`Нужно ✦ ${c.sparks}`;
    if ((this.d.essence[SP[sp.sid].fam] || 0) < c.essence) return ru`Нужно ${c.essence} эссенции`;
    return null;
  },
  purify(sp) {
    if (this.canPurify(sp)) return false;
    const c = this.purifyCost(sp);
    this.d.sparks -= c.sparks;
    this.d.essence[SP[sp.sid].fam] -= c.essence;
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
    if (!s.evo) return ru`Этот дух не превращается`;
    if ((this.d.essence[s.fam] || 0) < s.cost) return ru`Нужно ${s.cost} эссенции`;
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
    // 4.16: опыт — за новый вид в бестиарии; повторные превращения в тот же вид дают немного (было 500 за каждое)
    this.addXP(isNew ? 1000 : 200);
    this.progress('evolve', 1);
    this.save();
    return { isNew };
  },

  /* ---------- предметы ---------- */
  bagLimit() { return BAG_LIMIT + (this.d.bagExtra || 0) * Rules.BAG_STEP; },
  bagCount() { return Object.values(this.d.items).reduce((a, b) => a + b, 0); },
  // 4.16: сумка больше не переполняется. over — награда (уровень, серия дней, задание, Летопись, Тропа, бой, источник):
  // что не поместилось — в посылку Ордена (Rules.PARCEL, забрать — parcelTake), а не сверх лимита (раньше сумка
  // раздувалась в разы, а источники при полной сумке молча ничего не давали). Без over (находки спутника) — только в сумку
  addItem(k, n = 1, over = false) {
    const add = Math.max(0, Math.min(n, this.bagLimit() - this.bagCount()));
    if (add) this.d.items[k] = (this.d.items[k] || 0) + add;
    const put = over ? this.parcelPut(k, n - add) : 0;
    this.save();
    return add + put;
  },
  parcelCount() { return Object.values((this.d.parcel && this.d.parcel.items) || {}).reduce((a, b) => a + b, 0); },
  // в посылку — сколько войдёт (не больше Rules.PARCEL.MAX вещей); остальное пропадает. Счёт — для сообщения игроку
  parcelPut(k, n) {
    if (!(n > 0)) return 0;
    const P = this.d.parcel = this.d.parcel || { items: {} };
    const m = Math.max(0, Math.min(n, Rules.PARCEL.MAX - this.parcelCount()));
    if (m) P.items[k] = (P.items[k] || 0) + m;
    const c = this._parcelNote = this._parcelNote || { put: 0, lost: 0 };
    c.put += m; c.lost += n - m;
    return m;
  },
  // забрать посылку: сколько влезет в сумку — сначала редкое и нужное
  PARCEL_ORDER: ['deadwater', 'gift', 'charm3', 'charm2', 'gate', 'farpass', 'incense', 'brew', 'water', 'herb', 'honey', 'charm'],
  parcelTake() {
    const P = this.d.parcel, got = [];
    if (!P) return got;
    const keys = [...this.PARCEL_ORDER, ...Object.keys(P.items).filter(k => !this.PARCEL_ORDER.includes(k))];
    for (const k of keys) {
      const n = P.items[k] || 0, add = Math.min(n, Math.max(0, this.bagLimit() - this.bagCount()));
      if (!(add > 0) || !ITEMS[k]) continue;
      this.d.items[k] = (this.d.items[k] || 0) + add;
      P.items[k] = n - add;
      if (!P.items[k]) delete P.items[k];
      got.push({ k, n: add, label: ITEMS[k].name });
    }
    if (!Object.keys(P.items).length) this.d.parcel = null;
    this.save();
    return got;
  },
  useItem(k) { if ((this.d.items[k] || 0) <= 0) return false; this.d.items[k]--; this.save(); return true; },
  // over — см. addItem; once — разовая награда (глава Летописи, обучение, место): опыт без дневного потолка (см. addXP)
  giveRewards(rw, over = true, once = false) { // { charm: 5, sparks: 300, xp: 100 ... } → массив строк для показа
    const out = [], prev = this._parcelNote;
    this._parcelNote = { put: 0, lost: 0 }; // своя сводка: награда за уровень внутри (addXP) считает свою
    for (const [k, n] of Object.entries(rw)) {
      if (!n) continue;
      if (k === 'sparks') { this.d.sparks += n; out.push({ k, n, label: ru`Искры` }); }
      else if (k === 'zlat') { this.d.zlat = (this.d.zlat || 0) + n; out.push({ k, n, label: ru`Монеты` }); }
      else if (k === 'xp') { const o = { k, n: 0, label: ru`Опыт` }; out.push(o); o.n = this.addXP(n, once); }
      else if (k === 'alatyr' || k === 'rod') { this.d[k] = (this.d[k] || 0) + n; out.push({ k, n, label: this.resName(k) }); } // 4.16: не вещи — в сумку не идут
      else if (ITEMS[k]) { const a = this.addItem(k, n, over); if (a) out.push({ k, n: a, label: ITEMS[k].name }); }
    }
    const c = this._parcelNote;
    this._parcelNote = prev;
    if (c && c.put) Bus.emit('toast', { text: ru`Сумка полна — в посылку Ордена ушло вещей: ${c.put}. Забери её в Сумке, когда освободится место` });
    if (c && c.lost) Bus.emit('toast', { text: ru`Сумка и посылка Ордена полны — не поместилось вещей: ${c.lost}. Освободи место в Сумке`, cls: 'bad' });
    this.save();
    return out;
  },
  incenseActive() { return this.d.incenseUntil > Date.now(); },

  /* ---------- опыт ---------- */
  /* 4.16: учёт опыта за день (d.xpd = { day, n, rest }): n — опыт за сегодня (для дневного потолка), rest — опыт отдыха.
     За каждый день без опыта копится XP_DAY.REST (не больше, чем за XP_DAY.REST_DAYS дней) */
  xpToday() { // учёт на сегодня, ничего не меняя (для показа на телефоне)
    const today = U.today(), x = this.d.xpd;
    if (x && x.day === today) return x;
    let rest = (x && x.rest) || 0;
    if (x && x.day) {
      const t = s => { const [y, m, d] = String(s).split('-').map(Number); return Date.UTC(y, m - 1, d); };
      const gap = Math.round((t(today) - t(x.day)) / 86400000) - 1; // полных дней без игры
      if (gap > 0) rest = Math.max(rest, Math.min(XP_DAY.REST * XP_DAY.REST_DAYS, rest + gap * XP_DAY.REST));
    }
    return { day: today, n: 0, rest };
  },
  xpDay() {
    const x = this.d.xpd, t = this.xpToday();
    if (t === x) return x;
    if (t.rest > ((x && x.rest) || 0)) Bus.emit('toast', { text: ru`Ты хорошо отдохнул: следующие ${U.fmtNum(t.rest)} опыта — вдвое!`, cls: 'good' });
    return (this.d.xpd = t);
  },
  // Сколько опыта даст n в этот раз: событие недели (Звездопад ×2), дневной потолок (XP_DAY.FULL за день — полностью,
  // дальше до XP_DAY.HALF — вполовину, сверх — четверть; разовые награды once — без потолка) и опыт отдыха (удваивает,
  // пока не кончится). mark — записать в учёт дня
  xpGain(n, once, mark) {
    const x = this.xpDay(), mul = Ev.xpMul();
    let raw = Math.max(0, +n || 0) * mul, got = raw;
    if (!once) {
      const F = XP_DAY.FULL * mul, H = XP_DAY.HALF * mul, a = x.n, b = a + raw;
      const part = (lo, hi) => Math.max(0, Math.min(b, hi) - Math.max(a, lo));
      got = part(0, F) + part(F, H) * 0.5 + part(H, Infinity) * 0.25;
    }
    got = Math.round(got);
    const bonus = once ? 0 : Math.min(x.rest, got);
    if (mark) { if (!once) x.n += raw; x.rest -= bonus; }
    return got + bonus;
  },
  // Начислить опыт; возвращает, сколько начислено на самом деле (см. xpGain). once — разовая награда
  addXP(n, once = false) {
    n = this.xpGain(n, once, true);
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
    return n;
  },
  levelRewards(l) {
    // 4.16: лечебного и мёда меньше (было мёда 3, Живой воды 3, подорожника 5, отвара 2); монеты — 3, на каждом пятом — 15
    const r = { charm: 10 + l, honey: 2, water: 1, herb: 3, brew: 1, zlat: l % 5 ? Rules.ZLAT.level : Rules.ZLAT.level5 };
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
    let pool = W.evenMyth(SPECIES.filter(s => !s.legend && s.rar === rar && s.stage === 1 && W.local(s) && !s.season), r()); // 4.28: мифология — поровну
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
    const pool = QUEST_TEMPLATES.filter(q => (q.t !== 'raid' || this.d.level >= RAID_LEVEL) && (q.t !== 'duel' || this.d.level >= DUEL_LEVEL)); // 4.18: только открытое (Капища были с 3-го, а открываются с 5-го)
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
    // поручения из источников
    this.d.tasks.forEach(q => {
      if (q.t !== type || q.p >= q.n) return;
      if (type === 'catchEl' && meta.el !== q.el) return;
      q.p = Math.min(q.n, q.p + amount);
      changed = true;
      if (q.p >= q.n) Bus.emit('toast', { text: ru`Поручение выполнено: ${I18N.back(q.text)}`, cls: 'good' });
    });
    if (changed) { Bus.emit('quests'); this.save(); }
  },
  questsClaimable() {
    const daily = this.d.quests ? this.d.quests.list.filter(q => q.p >= q.n && !q.claimed).length : 0;
    return daily + this.d.tasks.filter(q => q.p >= q.n).length + this.d.taskMeet.length;
  },
  // Новое поручение (выдаёт сервер у источника): задание и дух, который встретится в награду
  // pos — где выдано поручение: 4.16 — трудное поручение иногда зовёт «гостя издалека» (см. guests)
  makeTask(pos) {
    const r = Math.random, pool = TASK_TEMPLATES.filter(q => !q.lvl || this.d.level >= q.lvl);
    const q = pool[Math.floor(r() * pool.length)], T = TASK_TIERS[q.tier];
    const n = q.min + Math.floor(r() * (q.max - q.min + 1)), el = ELEMENT_KEYS[Math.floor(r() * ELEMENT_KEYS.length)];
    let sps = SPECIES.filter(s => s.stage === 1 && !s.legend && !s.season && T.rar.includes(s.rar)), guest = false;
    if (q.tier === 3 && pos && r() < this.GUEST) {
      const far = this.guests(pos.lat, pos.lng), fresh = far.filter(s => !(this.d.dex[s.id] && this.d.dex[s.id].caught));
      if (far.length) { sps = fresh.length ? fresh : far; guest = true; }
    }
    if (!guest) sps = W.evenMyth(sps, r()); // 4.28: мифология — поровну
    const t = { id: U.uid(), t: q.t, n, el, p: 0, tier: q.tier, sid: sps[Math.floor(r() * sps.length)].id, text: q.text(n, el) };
    if (guest) t.guest = true;
    return t;
  },
  /* 4.16: «гости издалека» — духи, которых здесь и сейчас не встретить: вещие птицы других частей света, духи чужих
     земель и сезонные не в свой сезон. Их приводят трудные поручения источников (шанс GUEST), так что поймать можно всех */
  GUEST: 0.3,
  guests(lat, lng) { return SPECIES.filter(s => s.stage === 1 && !s.legend && s.season && !(Ev.seasonal(s) > 0)); },


  /* ---------- 4.0: обучение новичка ---------- */
  tutAt() { return (this.d && this.d.tut && TUT[this.d.tut - 1]) || null; },
  // Шаг выполнен: kind — что сделал игрок, id — для разделов. В конце этапа — его награда.
  tutAdvance(kind, id) {
    const st = this.tutAt();
    if (!st || st.kind !== kind || (id && st.id !== id)) return null;
    const next = TUT[this.d.tut], got = !next || next.ch !== st.ch ? this.giveRewards(TUT_CHAPTERS[st.ch].reward, true, true) : [];
    this.d.tut = next ? this.d.tut + 1 : 0;
    if (got.length) Bus.emit('tutChapter', { ch: st.ch, got, done: !next });
    this.save();
    return { got, done: !next };
  },

  /* ---------- Знаки Ордена ---------- */
  medalValue(m) {
    const st = this.d.stats;
    if (m.stat === 'dex') return SPECIES.filter(s => this.d.dex[s.id] && this.d.dex[s.id].caught).length;
    if (m.stat === 'lands') return SPECIES.filter(s => s.land && this.d.dex[s.id] && this.d.dex[s.id].caught).length;
    if (m.stat === 'myths') return SPECIES.filter(s => s.myth !== 'slavic' && this.d.dex[s.id] && this.d.dex[s.id].caught).length; // 4.28
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
        for (let t = had; t < tier; t++) this.addXP(MEDAL_TIERS[t].xp, true); // разовая награда — без дневного потолка
        Bus.emit('medal', { m, tier });
        J.add('medal', { name: m.name, tier });
      }
    });
    this._medalBusy = false;
  },
};

// ===== www/js/season-rewards.js =====
/* 4.28: награды сезонов Алатыря. Все Ловчие вместе собирают Алатырь-камень (js/alatyr.js); камень собран — Кощей раскалывает
   его, и начинается новый сезон. По итогам сезона Ловчий получает награды по вкладу n — сколько осколков он принёс в общий
   счёт за этот сезон. Ступени TIERS суммируются: принёс 30 — награды ступеней 1+, 5+, 15+ и 30+.
   Калибровка: у Ловчего ~0,3–1 осколка в день (Rules: разломы и старейшины Капищ, не больше двух в день), сезон — недели:
   1+ — заглянул в сезон, 5+ — играл, 15+ — играл регулярно, 30+ — почти каждый день, 60+ — весь сезон без перерыва.
   Награды — валюта и предметы (обликов у сезонов нет). Знак «Хранитель Алатыря» (MEDALS, stat alaSeasons) —
   число сезонов, где принесено не меньше MEDAL_MIN осколков: он про постоянство, а общий вклад и так виден на экране Алатыря.
   grant выдаёт на сервере (общие S, U, ITEMS, MEDALS, без DOM) — один раз на сезон: отметка S.d.alaRw[сезон] = n.
   html — окно «Итоги сезона Алатыря» на телефоне: UI.modal({ title: SeasonRewards.title(s), html: SeasonRewards.html(s, n) }). */
const SeasonRewards = {
  TIERS: [
    { n: 1,  name: ru`Причастный`,         rw: { sparks: 1500, charm2: 10 } },
    { n: 5,  name: ru`Искатель осколков`,  rw: { zlat: 10, honey: 5, brew: 3 }, medal: true },
    { n: 15, name: ru`Собиратель Алатыря`, rw: { zlat: 20, charm3: 5, incense: 1, water: 5 } },
    { n: 30, name: ru`Хранитель камня`,    rw: { zlat: 40, xpbrew: 2, rod: 15, deadwater: 1 } },
    { n: 60, name: ru`Сердце Алатыря`,     rw: { zlat: 50, deadwater: 1, rod: 20, farpass: 3 } },
  ],
  MEDAL_MIN: 5, // сезон засчитывается в знак «Хранитель Алатыря» (ступень с medal: true)
  ORDER: ['zlat', 'sparks', 'rod'], // порядок показа: сначала валюта, потом предметы

  roman(n) {
    n = Math.floor(+n) || 0;
    return [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
      .reduce((s, [v, r]) => { while (n >= v) { s += r; n -= v; } return s; }, '');
  },
  // номер последней достигнутой ступени (−1 — ни одной)
  tierOf(n) { let t = -1; this.TIERS.forEach((x, i) => { if (n >= x.n) t = i; }); return t; },
  medal() { return MEDALS.find(m => m.id === 'alatyr') || null; },
  label(k) { return typeof S !== 'undefined' && S.resName ? S.resName(k) : ITEMS[k] ? ITEMS[k].name : k; },
  norm(s, n) { return [Math.floor(+s) || 0, Math.max(0, Math.floor(+n) || 0)]; },

  // награды за вклад n в сезоне s (без картинок — годится и для сервера): [{ k, n, label, tier }]
  list(s, n) {
    [s, n] = this.norm(s, n);
    const out = [], sum = {}, tier = {};
    if (s < 1) return out;
    this.TIERS.forEach((t, i) => {
      if (n < t.n) return;
      if (t.medal && this.medal()) out.push({ k: 'medal', n: 1, label: ru`Сезон засчитан в знак «${this.medal().name}»`, tier: i });
      for (const [k, v] of Object.entries(t.rw)) { sum[k] = (sum[k] || 0) + v; if (!(k in tier)) tier[k] = i; }
    });
    const keys = Object.keys(sum).sort((a, b) => (this.ORDER.includes(b) - this.ORDER.includes(a)) || (this.ORDER.indexOf(a) - this.ORDER.indexOf(b)));
    keys.forEach(k => out.push({ k, n: sum[k], label: this.label(k), tier: tier[k] }));
    return out;
  },
  // то же для показа — с иконкой (разметка; на телефоне)
  forContribution(s, n) {
    return this.list(s, n).map(x => ({ ...x, icon: this.icon(x) }));
  },
  icon(x) {
    if (typeof Art === 'undefined') return '';
    if (x.k === 'medal') { const m = this.medal(); return Art.medal(m, Math.max(1, (S.d && S.d.medals && S.d.medals[m.id]) || 0)); }
    return Art.item(x.k);
  },

  // выдать награды сезона s за вклад n в прогресс S.d — один раз на сезон; → что выдано [{ k, n, label }] (для окна итогов)
  grant(St, s, n) {
    [s, n] = this.norm(s, n);
    const d = St && St.d;
    if (!d || s < 1) return [];
    if (!d.alaRw || typeof d.alaRw !== 'object' || Array.isArray(d.alaRw)) d.alaRw = {};
    if (Object.prototype.hasOwnProperty.call(d.alaRw, String(s))) return []; // уже выдано
    d.alaRw[s] = n;
    const out = [], rw = {};
    let medal = false;
    for (const x of this.list(s, n)) {
      if (x.k === 'medal') { d.stats = d.stats || {}; d.stats.alaSeasons = (d.stats.alaSeasons || 0) + 1; medal = true; out.push({ k: 'medal', n: 1, label: x.label }); }
      else rw[x.k] = x.n;
    }
    if (Object.keys(rw).length) out.push(...St.giveRewards(rw, true, true));
    if (medal && St.checkMedals) St.checkMedals();
    if (St.save) St.save();
    return out;
  },

  /* ---------- окно «Итоги сезона Алатыря» (только телефон) ---------- */
  title(s) { return ru`Итоги сезона Алатыря ${this.roman(s)}`.replace(/ (?=[IVXLCDM]+$)/, ' '); }, // номер не отрывается от слова
  html(s, n) {
    [s, n] = this.norm(s, n);
    const T = this.TIERS, t = this.tierOf(n), next = T[t + 1], rows = this.forContribution(s, n);
    const word = U.plural(n, ru`осколок`, ru`осколка`, ru`осколков`);
    const lead = n > 0
      ? ru`Орден собрал Алатырь-камень — и Кощей снова расколол его. Твой вклад за сезон: <b>${U.fmtNum(n)} ${word}</b>.`
      : ru`Орден собрал Алатырь-камень — и Кощей снова расколол его. В этом сезоне ты не принёс осколков: они выпадают в разломах и у старейшин Капищ.`;
    const ladder = T.map((x, i) => `<i class="sr-step ${i <= t ? 'on' : ''} ${i === t ? 'cur' : ''}">${x.n}+</i>`).join('');
    // знак — строкой во всю ширину, валюта и предметы — плитками в две колонки
    const row = x => `<div class="sr-rw sr-k-${x.k}"><span class="sr-ic">${x.icon}</span><span class="sr-t"><b>${U.esc(x.label)}</b>${x.k === 'medal' ? '' : `<em>+${U.fmtNum(x.n)}</em>`}</span></div>`;
    const big = rows.filter(x => x.k === 'medal').map(row).join(''), small = rows.filter(x => x.k !== 'medal').map(row).join('');
    const list = big + (small ? `<div class="sr-grid">${small}</div>` : '');
    const tail = next ? `<p class="sr-next">${ru`До ступени «${next.name}» не хватило ${U.fmtNum(next.n - n)} — в новом сезоне камень снова ждёт осколков.`}</p>`
      : `<p class="sr-next">${ru`Высшая ступень сезона — ты среди главных собирателей Ордена!`}</p>`;
    return `<div class="sr">
      <div class="sr-hero"><span class="sr-stone">${Art.item('alatyr')}</span><div class="sr-num">${ru`Сезон ${this.roman(s)}`}</div></div>
      <p class="sr-lead">${lead}</p>
      <div class="sr-ladder">${ladder}</div>
      ${t >= 0 ? `<div class="sr-rank">${ru`Твоя ступень — «${T[t].name}»`}</div>` : ''}
      ${list ? `<div class="sr-list">${list}</div>` : ''}
      ${tail}</div>`;
  },
};

// ===== www/js/journal.js =====
/* Дневник Ловчего: хроника событий с местом и временем (последние 250 записей) */

const J = {
  MAX: 250,
  FILTERS: [['all', ru`Всё`], ['catch', ru`Поимки`], ['battle', ru`Битвы`], ['other', ru`Прочее`]],
  GROUP: { catch: 'catch', flee: 'catch', hatch: 'catch', raid: 'battle', duel: 'battle', invasion: 'battle', league: 'battle', pvp: 'battle', spar: 'battle' },
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
      // целые фразы на каждый вариант (сияющий/омрачённый) — чтобы перевод не собирался из кусков
      case 'catch': { const n = sp(e.sid);
        return { ico: icon(e.sid), title: e.shiny && e.dark ? ru`Пойман сияющий омрачённый ${n}` : e.shiny ? ru`Пойман сияющий ${n}` : e.dark ? ru`Пойман омрачённый ${n}` : ru`Пойман ${n}`, sub: e.power ? ru`СИЛА ${e.power}` : '' }; }
      case 'flee': return { ico: icon(e.sid), title: ru`${sp(e.sid)} ускользнул`, sub: ru`Дух вернулся в Навь`, cls: 'dim' };
      case 'hatch': return { ico: icon(e.sid), title: ru`Из кокона появился ${sp(e.sid)}`, sub: e.km ? ru`Кокон ${e.km} км` : '' };
      case 'evolve': return { ico: icon(e.to), title: ru`${sp(e.from)} превратился в ${sp(e.to)}`, sub: '' };
      case 'awaken': return { ico: icon(e.sid), title: ru`${sp(e.sid)} пробуждён`, sub: '★'.repeat(e.stars || 1) };
      case 'raid': return { ico: icon(e.sid), title: ru`Разлом закрыт: ${sp(e.sid)}`, sub: '★'.repeat(e.tier || 1) };
      // e.name — название Капища с карты; e.guard / e.rank / e.name знака, лавки, e.title главы — русские названия из данных (сохранены сервером), переводим при показе
      case 'duel': return { ico: glyph('⛩'), title: ru`Победа: ${e.name}`, sub: ru`Хранитель ${I18N.back(e.guard || '')}` };
      case 'invasion': return { ico: glyph('☾', 'dark'), title: ru`Источник освобождён`, sub: e.name || '' };
      case 'league': return { ico: glyph('★', 'gold'), title: ru`Турнир Лиги: побед ${e.won} из 3`, sub: ru`Ранг: ${I18N.back(e.rank)}` };
      // 4.16: бой Лиги с живым Ловчим (e.name — имя соперника, e.d — изменение рейтинга)
      case 'pvp': return { ico: glyph('★', 'gold'), title: e.win === 1 ? ru`Лига: победа над ${e.name}` : e.win ? ru`Лига: ничья с ${e.name}` : ru`Лига: поражение от ${e.name}`, sub: ru`Лига «${I18N.back(e.rank)}» · рейтинг ${e.d > 0 ? '+' : e.d < 0 ? '−' : '±'}${Math.abs(e.d || 0)}` };
      case 'level': return { ico: glyph(e.l, 'gold'), title: ru`Новый уровень: ${e.l}`, sub: '' };
      case 'medal': return { ico: glyph('✦', 'gold'), title: ru`Знак «${I18N.back(e.name)}»`, sub: MEDAL_TIERS[e.tier - 1] ? MEDAL_TIERS[e.tier - 1].name : '' };
      case 'story': return { ico: glyph('✎'), title: ru`Глава Летописи: «${I18N.back(e.title)}»`, sub: ru`Завершена` };
      case 'trade': return { ico: icon(e.sid), title: e.dir === 'out' ? ru`${sp(e.sid)} упакован для друга` : e.who ? ru`${sp(e.sid)} получен от ${e.who}` : ru`${sp(e.sid)} получен от друга`, sub: ru`Обмен` };
      case 'friend': return { ico: glyph('♥', 'pink'), title: ru`Новый друг: ${e.name}`, sub: '' };
      case 'spar': return { ico: glyph('⚔'), title: ru`Победа в поединке с другом`, sub: e.name || '' };
      case 'clan': return { ico: glyph('⚑', 'gold'), title: e.move ? ru`Переход в клан: ${CLANS[e.clan] ? CLANS[e.clan].name : ru`клан`}` : ru`Вступление: ${CLANS[e.clan] ? CLANS[e.clan].name : ru`клан`}`, sub: '' };
      case 'guardBack': return { ico: icon(e.sid), title: ru`Защитник вернулся с Капища`, sub: `${e.name || ''} · ${ru`стоял ${e.hours} ч`}` };
      case 'defend': return { ico: icon(e.sid), title: ru`Защитник на Капище`, sub: e.name || '' };
      case 'shop': return { ico: glyph('☉', 'gold'), title: ru`Покупка в Лавке: ${I18N.back(e.name || '')}`, sub: '' };
      case 'passGold': return { ico: glyph('★', 'gold'), title: ru`Открыта Золотая тропа`, sub: e.season || '' };
      case 'exchange': return { ico: glyph('⇄', 'gold'), title: ru`Обмен в Лавке`, sub: `✦ ${U.fmtNum(e.sparks || 0)} → ${ru`${e.zlat || 0} монет`}` };
      case 'pay': return { ico: glyph('☉', 'gold'), title: ru`Казна Ордена`, sub: ru`+${e.zlat || 0} монет` };
      case 'promo': return { ico: glyph('✦', 'gold'), title: ru`Промокод ${U.esc(String(e.code || ''))}`, sub: e.zlat ? ru`+${e.zlat} монет` : ru`Награда получена` };
      case 'auction': { const n = SP[e.sid] ? SP[e.sid].name : '', p = U.fmtNum(e.price || 0);
        return { ico: glyph('⚖', 'gold'), title: e.dir === 'buy' ? ru`Куплен на аукционе: ${n}` : e.dir === 'sold' ? ru`Продан на аукционе: ${n}` : ru`Выставлен на аукцион: ${n}`, sub: `${e.cur === 'zlat' ? ru`${p} монет` : '✦ ' + p}${e.who ? ' · ' + e.who : ''}` }; }
      case 'order': return { ico: glyph('⚑', 'gold'), title: ru`Общее дело Ордена`, sub: ru`Награда ${(e.i | 0) + 1}-й ступени` };
      case 'gift': return { ico: glyph('✉', 'pink'), title: e.dir === 'out' ? ru`Подарок отправлен: ${e.name}` : ru`Подарок от ${e.name}`, sub: '' };
      case 'melt': return { ico: glyph('♁', 'gold'), title: ru`Переплавка амулетов`, sub: AMULETS[e.from] && AMULETS[e.to] ? `${AMULETS[e.from].name} ×${Rules.MELT.N} → ${AMULETS[e.to].name}` : '' };
    }
    return { ico: glyph('•'), title: e.type, sub: '' };
  },

  screen() {
    const scr = UI.screen(ru`Дневник Ловчего`, `
      <div class="chips j-filters">${this.FILTERS.map(([k, t]) => `<button data-f="${k}">${t}</button>`).join('')}</div>
      <div class="j-list"></div>`, 'journal-screen');
    const render = () => {
      U.$$('[data-f]', scr).forEach(b => b.classList.toggle('on', b.dataset.f === this.filter));
      const list = S.d.journal.filter(e => this.filter === 'all' || (this.GROUP[e.type] || 'other') === this.filter);
      let day = '', html = '';
      list.forEach((e, i) => {
        const d = new Date(e.t), ds = d.toLocaleDateString(I18N.locale, { day: 'numeric', month: 'long', weekday: 'short' });
        if (ds !== day) { day = ds; html += `<div class="j-day">${ds}</div>`; }
        const v = this.view(e);
        html += `<div class="j-row ${v.cls || ''}">${v.ico}<div class="row-main"><b>${U.esc(v.title)}</b><small>${d.toLocaleTimeString(I18N.locale, { hour: '2-digit', minute: '2-digit' })}${v.sub ? ' · ' + U.esc(v.sub) : ''}</small></div>
          ${e.lat != null ? `<button class="btn small ghost j-map" data-i="${S.d.journal.indexOf(e)}" title="${ru`На карте`}">${UI.I.pin}</button>` : ''}</div>`;
      });
      scr.querySelector('.j-list').innerHTML = html || `<div class="empty">${ru`Записей пока нет. Лови духов — дневник заполнится сам.`}</div>`;
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
/* Лига Ордена. 4.16: бои с ЖИВЫМИ Ловчими в реальном времени — соперников-машин в Лиге больше нет.
   Поиск — среди Ловчих своей лиги; кто у самой границы («осталось чуть-чуть»), ищет и в соседней; чем дольше ждёшь,
   тем шире круг (League.window). Пару составляет база атомарно (league_find, SKIP LOCKED — 022_league_pvp.sql).
   Бой целиком ведёт сервер игры (PvP ниже + GameCore.pvp): телефон присылает только намерения — удар, приём, щит,
   смена духа; сервер проверяет частоту, энергию и перезарядки, двигает время боя, хранит его в базе и рассылает
   обоим через Supabase Realtime (запасной путь — опрос). Итог — рейтинг обоим по разнице рейтингов (как Эло;
   на верхних лигах медленнее), опыт, награды за лиги и раны — засчитывает сервер ровно один раз (GameCore.leagueSettle).
   Сезон — 4.28: сезон Алатыря (до 4.28 — календарный месяц); в новом рейтинг сверх SOFT срезается наполовину, за высшую
   лигу прошлого сезона — сундук.
   Звёзды старых сохранений переводятся в рейтинг ×100.
   Экран (3.21): герб ранга и место в таблице, вкладки «Бой», «Таблица» (живая, с текущими уровнями — leagueTop)
   и «Лиги»; строка таблицы открывает карточку Ловчего. Поиск и сам бой — league-battle.js. */

// pts — с какого рейтинга начинается лига
const LEAGUE_RANKS = [
  { name: ru`Дерево`, pts: 0 },
  { name: ru`Медь`, pts: 300, reward: { charm: 10, sparks: 500 } },
  { name: ru`Бронза`, pts: 600, reward: { honey: 5, sparks: 800 } },
  { name: ru`Железо`, pts: 1000, reward: { charm2: 5, water: 5 } },
  { name: ru`Серебро`, pts: 1500, reward: { charm2: 8, sparks: 1500 } },
  { name: ru`Золото`, pts: 2100, reward: { charm3: 3, incense: 1 } },
  { name: ru`Платина`, pts: 2800, reward: { charm2: 10, sparks: 3000 } },
  { name: ru`Изумруд`, pts: 3600, reward: { charm3: 5, water: 10 } },
  { name: ru`Алмаз`, pts: 4500, reward: { incense: 3, sparks: 5000 } },
  { name: ru`Легенда`, pts: 5500, reward: { charm3: 10, sparks: 8000 } },
];

/* 5.0: значок лиги — медальон: кольцо-оправа из материала лиги, в центре огранённый кристалл Алатыря (общий для всех
   мифологий). Чем выше лига, тем богаче: гладкое кольцо (Дерево, Медь) → бусины и зубцы (Бронза, Железо) → лучи-звезда
   за кольцом (4 у Серебра, 8 у Золота) → лавры (Платина, Изумруд) → крылья (Алмаз, Легенда) → венец и сияние (Легенда);
   кристалл растёт от осколка до полного камня, граней всё больше. id градиентов у каждого значка свои (seq). */
const LeagueBadge = (() => {
  let seq = 0;
  const CX = 170, CY = 212, R = 118, r = 90, RAD = Math.PI / 180;
  const f = n => +n.toFixed(1);
  const P = (d, a) => [f(CX + d * Math.sin(a * RAD)), f(CY - d * Math.cos(a * RAD))]; // угол a — от 12 часов по часовой
  const pts = a => a.map(p => p.join(',')).join(' ');
  const mix = (a, b, t) => '#' + [1, 3, 5].map(k => Math.round(parseInt(a.slice(k, k + 2), 16) * (1 - t) + parseInt(b.slice(k, k + 2), 16) * t).toString(16).padStart(2, '0')).join('');
  const GOLD = ['#fff6c8', '#fbd34d', '#d99a17', '#8a5206'];
  // m — металл оправы (свет → тень), fld — поле (центр, край), o — контур, g — отблеск, cs — тень граней кристалла
  const MAT = [
    { m: ['#f4c088', '#c9813f', '#8f4e1f', '#58290b'], fld: ['#6a3d18', '#1e0f04'], o: '#2a1405', g: '#f59e0b' }, // Дерево
    { m: ['#ffdcc6', '#f39664', '#c65c2e', '#702a10'], fld: ['#6b2c14', '#1f0904'], o: '#2e0f04', g: '#fb923c' }, // Медь
    { m: ['#f6da9c', '#c99545', '#8a5a22', '#442806'], fld: ['#4d3514', '#140d03'], o: '#1f1203', g: '#e0a650' }, // Бронза
    { m: ['#dfe3ea', '#8f97a3', '#4f5663', '#23272e'], fld: ['#39404c', '#0d1014'], o: '#090b0e', g: '#94a3b8', cs: '#646b78' }, // Железо
    { m: ['#ffffff', '#e4eaf2', '#a9b5c6', '#65728a'], fld: ['#3a4d6e', '#111a2b'], o: '#172033', g: '#dbe4f0', cs: '#76839a' }, // Серебро
    { m: GOLD, fld: ['#8a4c08', '#2a1402'], o: '#3a1f02', g: '#fbbf24' }, // Золото
    { m: ['#ffffff', '#eaf3fc', '#b7cae0', '#6f86a6'], fld: ['#2b5282', '#0b1830'], o: '#122038', g: '#bae6fd', cs: '#7890b4' }, // Платина
    { m: GOLD, fld: ['#19c48d', '#053d2c'], o: '#2f1a02', g: '#34d399', gem: ['#bbf7d0', '#10b981', '#064e3b'] }, // Изумруд
    { m: ['#f2fcff', '#a5e9fc', '#38bdf8', '#0c4a6e'], fld: ['#1f6fb0', '#061631'], o: '#051a33', g: '#67e8f9', cs: '#4f8fc4' }, // Алмаз
    { m: GOLD, fld: ['#8b46f0', '#1b0540'], o: '#2a0a45', g: '#e9b8ff', cs: '#8e74b8', gem: ['#f3e8ff', '#a855f7', '#3b0764'] }, // Легенда
  ];
  const lin = (id, c, x2 = .35, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${c.map((s, k) => `<stop offset="${f(k / (c.length - 1))}" stop-color="${s}"/>`).join('')}</linearGradient>`;
  const circ = (d, a) => `<circle cx="${CX}" cy="${CY}" r="${d}" ${a}/>`;
  const star = (x, y, s, o = 1) => `<path d="M${x} ${f(y - s)}L${f(x + s * .2)} ${f(y - s * .2)}L${f(x + s)} ${y}L${f(x + s * .2)} ${f(y + s * .2)}L${x} ${f(y + s)}L${f(x - s * .2)} ${f(y + s * .2)}L${f(x - s)} ${y}L${f(x - s * .2)} ${f(y - s * .2)}Z" fill="#fff" opacity="${o}"/>`;
  const gem = (p, s, id, o) => { const q = [...Array(8)].map((_, k) => [f(p[0] + s * Math.cos((k * 45 + 22.5) * RAD)), f(p[1] + s * Math.sin((k * 45 + 22.5) * RAD))]);
    return `<polygon points="${pts(q)}" fill="url(#${id}j)" stroke="${o}" stroke-width="2.2" stroke-linejoin="round"/><circle cx="${f(p[0] - s * .3)}" cy="${f(p[1] - s * .32)}" r="${f(s * .28)}" fill="#fff" opacity=".85"/>`; };
  // лучи за кольцом: n лучей, длинные L1 и короткие L2 через один, w — полуширина у основания (градусы); свет — одна сторона
  const rays = (n, L1, L2, w, lite, dark, o, off = 0) => {
    let s = '';
    for (let k = 0; k < n; k++) {
      const a = off + k * 360 / n, L = k % 2 ? L2 : L1, ww = k % 2 ? w * .8 : w, c = P(R - 30, a), t = P(L, a), b1 = P(R + 2, a - ww), b2 = P(R + 2, a + ww);
      s += `<polygon points="${pts([c, b1, t, b2])}" fill="none" stroke="${o}" stroke-width="7" stroke-linejoin="round"/><polygon points="${pts([c, b1, t])}" fill="${lite}"/><polygon points="${pts([c, b2, t])}" fill="${dark}"/>`;
    }
    return s;
  };
  // лавровая ветвь слева (от низа к 10 часам), справа — зеркально
  const laurel = (fill, o) => {
    const Rl = R + 11, leaf = (p, rot, L) => { const W = L * .32;
      return `<g transform="translate(${p}) rotate(${f(rot)})"><path d="M0 0C${f(L * .3)} ${f(-W)} ${f(L * .75)} ${f(-W * .8)} ${L} 0C${f(L * .75)} ${f(W * .8)} ${f(L * .3)} ${f(W)} 0 0Z" fill="${fill}" stroke="${o}" stroke-width="3" stroke-linejoin="round"/><path d="M3 0H${f(L * .78)}" stroke="${o}" stroke-width="1.6" opacity=".45"/></g>`; };
    let s = `<path d="M${P(Rl, 188)}A${Rl} ${Rl} 0 0 1 ${P(Rl, 302)}" fill="none" stroke="${o}" stroke-width="7" stroke-linecap="round"/><path d="M${P(Rl, 188)}A${Rl} ${Rl} 0 0 1 ${P(Rl, 302)}" fill="none" stroke="${fill}" stroke-width="3.5" stroke-linecap="round"/>`;
    for (let k = 0; k < 7; k++) { const a = 192 + 108 * k / 6, L = 40 - k * 1.8; s += leaf(P(Rl + 1, a), a - 42, L) + leaf(P(Rl - 2, a + 6), a + 6, L * .82); }
    s += leaf(P(Rl, 302), 300, 30);
    return s + `<g transform="translate(${2 * CX} 0) scale(-1 1)">${s}</g>`;
  };
  // крылья: перья (Легенда) или кристаллические осколки (Алмаз), от спины медальона наружу и вверх
  const wings = (kind, id, o) => {
    const one = (th, L, W, fill, dark) => `<g transform="translate(${CX - 50} ${CY - 26}) rotate(${th})">` + (kind === 'feather'
      ? `<path d="M0 ${f(-W)}C${f(L * .45)} ${f(-W * 1.35)} ${f(L * .88)} ${f(-W * .95)} ${L} 0C${f(L * .8)} ${f(W * .6)} ${f(L * .4)} ${f(W)} 0 ${f(W)}Z" fill="${fill}" stroke="${o}" stroke-width="4.5" stroke-linejoin="round"/><path d="M8 0H${f(L * .84)}" stroke="${o}" stroke-width="2.4" opacity=".45" stroke-linecap="round"/><path d="M${f(L * .22)} ${f(-W * .6)}C${f(L * .5)} ${f(-W * .9)} ${f(L * .75)} ${f(-W * .55)} ${f(L * .88)} ${f(-W * .2)}" stroke="#fff" stroke-width="2.6" fill="none" opacity=".6" stroke-linecap="round"/>`
      : `<polygon points="0,${f(-W * .45)} ${f(L * .34)},${f(-W)} ${L},0 ${f(L * .34)},${f(W)} 0,${f(W * .45)}" fill="none" stroke="${o}" stroke-width="7" stroke-linejoin="round"/><polygon points="0,${f(-W * .45)} ${f(L * .34)},${f(-W)} ${L},0 ${f(L * .34)},0" fill="${fill}"/><polygon points="0,${f(W * .45)} ${f(L * .34)},${f(W)} ${L},0 ${f(L * .34)},0" fill="${dark}"/><path d="M${f(L * .34)} ${f(-W)}L${f(L * .34)} ${f(W)}M${f(L * .34)} 0H${f(L * .9)}" stroke="#fff" stroke-width="1.8" opacity=".6"/>`) + '</g>';
    let s = '';
    // маховые — веером вверх к углам, поверх — кроющие покороче
    [[256, 112], [237, 124], [217, 124], [197, 112], [177, 98], [158, 82]].forEach(([th, L]) => { s += one(th, L, 15, `url(#${id}w)`, '#1f86c9'); });
    [[246, 66], [224, 70], [202, 64], [180, 56]].forEach(([th, L]) => { s += one(th, L, 13, kind === 'feather' ? `url(#${id}m)` : '#ffffff', '#7dd3fc'); });
    return s + `<g transform="translate(${2 * CX} 0) scale(-1 1)">${s}</g>`;
  };
  // кристалл Алатыря: 1 — вытянутый осколок, дальше больше граней и площадка сверху; на Легенде — знак Алатыря на площадке
  const crystal = (i, id, M) => {
    const N = [4, 5, 6, 6, 8, 8, 10, 10, 12, 12][i], s = [38, 43, 46, 50, 53, 55, 57, 59, 61, 63][i];
    const st = [1.5, 1.36, 1.3, 1.26, 1.22, 1.2, 1.19, 1.18, 1.17, 1.16][i], tilt = [16, -10, 0, 0, 0, 0, 0, 0, 0, 0][i];
    const cy = CY + 2, jit = i === 0 ? [1, .7, 1, .78] : i === 1 ? [1, .86, .96, .92, .84] : null;
    const V = (d, a) => [f(CX + d * Math.sin(a * RAD)), f(cy - d * Math.cos(a * RAD) * st)];
    const out = [...Array(N)].map((_, k) => V(s * (jit ? jit[k] : 1), k * 360 / N));
    const tr = i < 2 ? 0 : i < 4 ? .42 : .48, inn = tr ? out.map((_, k) => V(s * tr, k * 360 / N)) : null, apex = [CX - 3, cy - 8];
    const sh = M.cs || mix('#6f6252', M.g, .4), light = a => .5 + .5 * Math.cos((a - 315) * RAD);
    let faces = '', seams = '';
    for (let k = 0; k < N; k++) {
      const k1 = (k + 1) % N, am = (k + .5) * 360 / N, t = Math.min(1, .1 + .88 * light(am) + (k % 2 ? 0 : .07));
      faces += `<polygon points="${pts(inn ? [inn[k], out[k], out[k1], inn[k1]] : [apex, out[k], out[k1]])}" fill="${mix(sh, '#ffffff', t)}"/>`;
      seams += `M${inn ? inn[k] : apex}L${out[k]}`;
      if (i >= 5) { const mo = [f((out[k][0] + out[k1][0]) / 2), f((out[k][1] + out[k1][1]) / 2)]; seams += `M${inn[k]}L${mo}L${inn[k1]}`; }
    }
    const e0 = out[N - 1], e1 = out[0], ins = (p, t) => [f(p[0] + (CX - p[0]) * t), f(p[1] + (cy - p[1]) * t)];
    // звезда Алатыря на площадке Легенды
    const rune = i === 9 ? `<polygon points="${pts([...Array(16)].map((_, k) => V(k % 2 ? 7.5 : 19, k * 22.5)))}" fill="url(#${id}m)" stroke="#6b3a05" stroke-width="2.4" stroke-linejoin="round"/><circle cx="${CX}" cy="${cy}" r="4" fill="#fff6c8" stroke="#6b3a05" stroke-width="1.6"/>` : '';
    return `<g transform="rotate(${tilt} ${CX} ${cy})">
      <polygon points="${pts(out)}" fill="#000" opacity=".4" transform="translate(4 8)"/>${faces}
      ${inn ? `<polygon points="${pts(inn)}" fill="url(#${id}t)"/>` : ''}
      <path d="${seams}" fill="none" stroke="${mix(sh, '#000000', .35)}" stroke-width="1.6" opacity=".6" stroke-linecap="round"/>
      ${inn ? `<polygon points="${pts(inn)}" fill="none" stroke="${mix(sh, '#000000', .3)}" stroke-width="1.8" opacity=".6" stroke-linejoin="round"/>` : ''}${rune}
      <polygon points="${pts(out)}" fill="none" stroke="#221833" stroke-width="5" stroke-linejoin="round"/>
      <path d="M${ins(e0, .14)}L${ins(e1, .14)}" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".9"/>
      ${i >= 3 ? star(e1[0], f(e1[1] + 3), 12 + i * 1.5) : ''}</g>`;
  };

  return i => {
    const M = MAT[i], id = 'lb' + (++seq), o = M.o;
    const defs = lin(id + 'm', M.m) + `<linearGradient id="${id}n" x1="0" y1="1" x2=".2" y2="0"><stop offset="0" stop-color="${M.m[0]}"/><stop offset=".55" stop-color="${M.m[2]}"/><stop offset="1" stop-color="${M.m[3]}"/></linearGradient>`
      + `<radialGradient id="${id}f" cx=".42" cy=".36" r=".72"><stop offset="0" stop-color="${M.fld[0]}"/><stop offset="1" stop-color="${M.fld[1]}"/></radialGradient>`
      + `<radialGradient id="${id}h"><stop offset=".35" stop-color="${M.g}" stop-opacity="${i === 9 ? .9 : .6}"/><stop offset="1" stop-color="${M.g}" stop-opacity="0"/></radialGradient>`
      + `<radialGradient id="${id}c"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".4" stop-color="${M.g}" stop-opacity=".45"/><stop offset="1" stop-color="${M.g}" stop-opacity="0"/></radialGradient>`
      + `<radialGradient id="${id}t" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${mix('#e9dfc8', M.g, .25)}"/></radialGradient>`
      + (M.gem ? `<radialGradient id="${id}j" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="${M.gem[0]}"/><stop offset=".45" stop-color="${M.gem[1]}"/><stop offset="1" stop-color="${M.gem[2]}"/></radialGradient>` : '')
      + (i === 9 ? lin(id + 'w', ['#fff6c8', '#fbd34d', '#d99a17', '#9333ea'], 1, 0) + lin(id + 'v', ['#e9d5ff', '#8b5cf6', '#3b0764'], .2) : i === 8 ? lin(id + 'w', ['#ffffff', '#bff0ff', '#5cc9f5'], 1, .3) : '');
    let back = '', rim = '', deco = '', field = '', front = '';
    const M_ = `url(#${id}m)`;
    // сияние и лучи
    if (i >= 5) back += circ(i === 9 ? 170 : 166, `fill="url(#${id}h)"`);
    if (i === 9) back += rays(8, 174, 150, 10, '#fde68a', '#a855f7', o);
    else if (i === 8) back += rays(8, 170, 150, 11, '#e0f7ff', '#38bdf8', o);
    else if (i >= 5) back += rays(8, i === 5 ? 170 : 160, i === 5 ? 144 : 134, i === 5 ? 13 : 11, i === 6 ? '#ffffff' : '#fff1b0', i === 6 ? '#8ea4c2' : '#c98a12', o);
    else if (i === 4) back += rays(4, 168, 168, 13, '#ffffff', '#8d9ab0', o);
    // лавры и крылья
    if (i === 6) back += laurel(M_, o);
    if (i === 7) back += laurel(`url(#${id}m)`, o);
    if (i === 8) back += wings('shard', id, o);
    if (i === 9) back += wings('feather', id, o);
    // край оправы: бусины (Бронза), зубцы (Железо)
    if (i === 2) for (let k = 0; k < 20; k++) { const p = P(R + 1, k * 18); rim += `<circle cx="${p[0]}" cy="${p[1]}" r="11" fill="${M_}" stroke="${o}" stroke-width="4.5"/>`; }
    if (i === 3) for (let k = 0; k < 12; k++) { const a = k * 30; rim += `<polygon points="${pts([P(R - 4, a - 9), P(R + 17, a - 6), P(R + 17, a + 6), P(R - 4, a + 9)])}" fill="${M_}" stroke="${o}" stroke-width="4.5" stroke-linejoin="round"/>`; }
    // кольцо: объём — сверху светлее, у поля обратный скос; Алмаз — из граней
    let ring = circ(R, `fill="${M_}" stroke="${o}" stroke-width="6"`);
    if (i === 8) {
      ring = circ(R, `fill="${M.m[2]}" stroke="${o}" stroke-width="6"`);
      for (let k = 0; k < 24; k++) {
        const a0 = k * 15, a1 = a0 + 15, am = a0 + 7.5, O0 = P(R - 2, a0), O1 = P(R - 2, a1), I0 = P(r + 2, a0), I1 = P(r + 2, a1), Mp = P((R + r) / 2, am);
        const L = d => mix(M.m[3], M.m[0], Math.max(0, Math.min(1, .5 + .5 * Math.cos((d - 315) * RAD))));
        ring += `<polygon points="${pts([O0, O1, Mp])}" fill="${L(am)}"/><polygon points="${pts([O1, I1, Mp])}" fill="${L(am + 90)}"/><polygon points="${pts([I1, I0, Mp])}" fill="${L(am + 180)}"/><polygon points="${pts([I0, O0, Mp])}" fill="${L(am - 90)}"/>`;
      }
      ring += circ(R, `fill="none" stroke="${o}" stroke-width="6"`);
    } else ring += circ(r + 10, `fill="url(#${id}n)"`) + circ(r + 10, `fill="none" stroke="${o}" stroke-width="1.6" opacity=".4"`);
    ring += `<path d="M${P(R - 7, 250)}A${R - 7} ${R - 7} 0 0 1 ${P(R - 7, 350)}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".55"/>`;
    // узор оправы
    if (i === 0) { // дерево: волокна, сучки, кованые уголки
      deco += [112, 106.5, 101].map((d, k) => circ(d, `fill="none" stroke="#4a2208" stroke-width="2" opacity=".5" stroke-dasharray="${['70 9 34 14 96 7', '40 12 88 6 52 16', '110 10 30 8 64 12'][k]}"`)).join('');
      [70, 205, 300].forEach(a => { const p = P(106, a); deco += `<ellipse cx="${p[0]}" cy="${p[1]}" rx="8" ry="4.5" transform="rotate(${a} ${p[0]} ${p[1]})" fill="#5a2c0e" stroke="#2a1405" stroke-width="1.6"/><ellipse cx="${p[0]}" cy="${p[1]}" rx="13" ry="7.5" transform="rotate(${a} ${p[0]} ${p[1]})" fill="none" stroke="#4a2208" stroke-width="1.4" opacity=".6"/>`; });
      [45, 135, 225, 315].forEach(a => { deco += `<g transform="translate(${P(R - 14, a)}) rotate(${a})"><rect x="-13" y="-25" width="26" height="42" rx="5" fill="url(#${id}i)" stroke="${o}" stroke-width="3.5"/><circle cy="-12" r="4" fill="#cbd2dc" stroke="#16191e" stroke-width="1.8"/><circle cy="5" r="4" fill="#cbd2dc" stroke="#16191e" stroke-width="1.8"/></g>`; });
    }
    if (i === 1) { // медь: патина и заклёпки
      [[25, 16], [118, 12], [168, 18], [242, 14], [300, 10], [338, 12]].forEach(([a, w]) => { const p = P(104, a); deco += `<ellipse cx="${p[0]}" cy="${p[1]}" rx="${w}" ry="6" transform="rotate(${a} ${p[0]} ${p[1]})" fill="#5cc2a4" opacity=".6"/><ellipse cx="${f(p[0] + 2)}" cy="${f(p[1] + 1)}" rx="${f(w * .45)}" ry="2.5" transform="rotate(${a} ${p[0]} ${p[1]})" fill="#a7f3d0" opacity=".55"/>`; });
      for (let k = 0; k < 8; k++) { const p = P(104, k * 45 + 22.5); deco += `<circle cx="${p[0]}" cy="${p[1]}" r="5.5" fill="#ffc8a8" stroke="${o}" stroke-width="2.2"/><circle cx="${f(p[0] - 1.5)}" cy="${f(p[1] - 1.5)}" r="1.8" fill="#fff"/>`; }
    }
    if (i === 2) { // бронза: литой поясок
      deco += circ(104, `fill="none" stroke="${o}" stroke-width="2" opacity=".45" stroke-dasharray="14 7"`);
      for (let k = 0; k < 10; k++) { const p = P(104, k * 36); deco += `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="#f6da9c" stroke="${o}" stroke-width="2"/>`; }
    }
    if (i === 3) for (let k = 0; k < 12; k++) { const p = P(104, k * 30 + 15); deco += `<circle cx="${p[0]}" cy="${p[1]}" r="5.5" fill="#6b7280" stroke="${o}" stroke-width="2.2"/><circle cx="${f(p[0] - 1.6)}" cy="${f(p[1] - 1.6)}" r="1.8" fill="#e5e7eb"/>`; }
    if (i === 4 || i === 6) { // серебро и платина: гравировка
      deco += circ(110, `fill="none" stroke="${o}" stroke-width="1.4" opacity=".4"`) + circ(104, `fill="none" stroke="${o}" stroke-width="2" opacity=".35" stroke-dasharray="2 6" stroke-linecap="round"`);
      for (let k = 0; k < 4; k++) { const p = P(104, k * 90 + 45); deco += `<path d="M${p[0]} ${f(p[1] - 7)}L${f(p[0] + 7)} ${p[1]}L${p[0]} ${f(p[1] + 7)}L${f(p[0] - 7)} ${p[1]}Z" fill="${i === 6 ? '#e0f2fe' : '#ffffff'}" stroke="${o}" stroke-width="2"/>`; }
    }
    if (i === 5) for (let k = 0; k < 24; k++) { const p = P(104, k * 15); deco += `<circle cx="${p[0]}" cy="${p[1]}" r="3.4" fill="#fff3b8" stroke="${o}" stroke-width="1.4"/>`; }
    if (i === 7) for (let k = 0; k < 8; k++) deco += gem(P(104, k * 45), 9, id, o);
    if (i === 9) {
      deco += circ(104, `fill="none" stroke="${o}" stroke-width="17"`) + circ(104, `fill="none" stroke="url(#${id}v)" stroke-width="12"`);
      for (let k = 0; k < 16; k++) { const p = P(104, k * 22.5 + 11.25); deco += `<circle cx="${p[0]}" cy="${p[1]}" r="2.6" fill="#fde68a"/>`; }
      [90, 180, 270].forEach(a => { deco += gem(P(104, a), 9, id, o); });
    }
    // поле: у Изумруда, Алмаза и Легенды — огранка
    field = circ(r, `fill="url(#${id}f)" stroke="${o}" stroke-width="4.5"`);
    if (i >= 7) { const n = i === 7 ? 8 : 12; for (let k = 0; k < n; k++) field += `<polygon points="${pts([[CX, CY], P(r - 3, k * 360 / n), P(r - 3, (k + 1) * 360 / n)])}" fill="${k % 2 ? '#fff' : '#000'}" opacity="${k % 2 ? .08 : .14}"/>`; }
    field += circ(r - 3, `fill="none" stroke="#000" stroke-width="6" opacity=".25"`);
    if (i >= 2) field += circ(i >= 7 ? 82 : 30 + i * 5, `fill="url(#${id}c)" opacity="${f(.3 + i * .06)}"`);
    // искры
    if (i >= 5) [[CX - 118, CY - 104, 12], [CX + 124, CY - 88, 9], [CX + 112, CY + 118, 10], [CX - 60, CY + 50, 6], [CX + 52, CY - 56, 5]].slice(0, i >= 8 ? 5 : 3).forEach(([x, y, s]) => { front += star(f(x), f(y), s + (i - 5) * 1.5, .95); });
    // венец Легенды
    if (i === 9) front += `<path d="M116 110L119 60L137 84L148 46L160 80L170 26L180 80L192 46L203 84L221 60L224 110Q170 98 116 110Z" fill="url(#${id}m)" stroke="${o}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M118 104Q170 92 222 104" fill="none" stroke="#fff6c8" stroke-width="3" opacity=".7"/>
      ${[[119, 60, 6], [148, 46, 6.5], [170, 26, 8], [192, 46, 6.5], [221, 60, 6]].map(([x, y, s]) => `<circle cx="${x}" cy="${y}" r="${s}" fill="#fff6c8" stroke="${o}" stroke-width="3"/>`).join('')}
      ${gem([170, 78], 9, id, o)}${gem([141, 90], 6, id, o)}${gem([199, 90], 6, id, o)}`;
    // у крылатых (Алмаз, Легенда) медальон чуть меньше — крыльям нужно место по бокам
    const sc = s => i >= 8 ? `<g transform="translate(${CX} ${CY}) scale(.86) translate(${-CX} ${-CY})">${s}</g>` : s;
    const iron = i === 0 ? lin(id + 'i', ['#d1d5db', '#6b7280', '#2b2f36']) : '';
    return `<svg class="lg-badge-pic" viewBox="0 0 340 400" aria-hidden="true"><defs>${defs}${iron}</defs>${back}${rim}${sc(ring + deco + field + crystal(i, id, M) + front)}</svg>`;
  };
})();

const League = {
  TICKETS: 10, // 4.16: боёв в день — жетон тратится за сыгранный бой
  XP_RUNS: 5,  // опыт дают первые пять боёв дня; дальше — только рейтинг
  XP: { win: 500, draw: 300, loss: 150 }, // сдавшийся или пропавший из боя опыта не получает
  SAME: 3,     // с одним и тем же соперником рейтинг меняют только первые три боя за день (против сговора)
  // 4.16: рейтинг — как у Эло: изменение = K × (итог − ожидаемый итог), ожидание — по разнице рейтингов (шкала 400).
  // Победа над равным: +KW/2, поражение от равного: −KL/2. На нижних лигах победа весит больше поражения (подъём
  // идёт и при половине побед), с «Платины» — поровну и всё медленнее: наверх пробиваются только сильнейшие.
  KW: [60, 60, 56, 52, 48, 44, 40, 36, 32, 28],
  KL: [20, 28, 34, 40, 42, 42, 40, 36, 32, 28],
  SOFT: 1500,        // 4.16: в новом сезоне рейтинг сверх этого (лига «Серебро») срезается наполовину
  MAXPTS: 20000,
  LEVEL: 5,    // с какого уровня Ловчего открыта Лига (проверяет сервер; 4.16: было 10, 5.1.11: снова 5)
  tab: 'play',
  TABS: ['play', 'table', 'ranks'],

  /* 4.28: сезон Лиги — сезон Алатыря (Ev.alaSeason): начинается, когда Кощей раскалывает камень. Ключ — 'A<номер>'
     (до 4.28 сезон был календарным месяцем, 'ГГГГ-ММ': первый ключ 'A1' закрывает последний месячный сезон — с наградой) */
  season(t = U.now()) { return 'A' + (typeof Ev !== 'undefined' && Ev.alaSeason ? Ev.alaSeason(t) : 1); },
  seasonNum(key) { const m = /^A(\d+)$/.exec(String(key || '')); return m ? +m[1] : 0; },
  seasonName(key = this.season()) { const n = this.seasonNum(key); return n ? ru`Сезон ${n}` : String(key || ''); },
  // что осталось до конца сезона: раскол назначен — через сколько; финал — «финал: Кощей»; иначе — грани камня
  seasonLeft() {
    const now = U.now(), e = Ev.alaEnd(), fin = Ev.finale(now), I = typeof Alatyr !== 'undefined' ? Alatyr.info : null;
    if (fin) return (Ev.ala.brk ? ru`раскол через ${this.left(e - now)}` : ru`финал: Кощей · ещё ${this.left(e - now)}`);
    if (!I) return ru`до раскола Алатыря`;
    const st = Ev.alaStage(I.total, now);
    return ru`грани ${st.n}/${st.K} до раскола`;
  },
  reset(p) { return p > this.SOFT ? this.SOFT + Math.floor((p - this.SOFT) / 2) : p; },
  // 4.15: звёзды старого сохранения — в рейтинг ×100; 4.16: новый сезон — срез и сундук за высшую лигу прошлого;
  // новый день — снова жетоны; турнир с машинами (run) больше не нужен
  norm(L) {
    L = L || { season: this.season(), pts: 0, best: 0, peak: 0, tickets: this.TICKETS, n: 0, day: U.today(), got: {} };
    if (L.pts == null) {
      L.pts = U.clamp(Math.floor((+L.stars || 0) * 100), 0, this.MAXPTS); delete L.stars;
      L.tickets = Math.max(+L.tickets || 0, this.TICKETS);
    }
    if ('run' in L) delete L.run;
    if (L.peak == null) L.peak = this.rank(L.pts);
    if (L.n == null) L.n = Math.max(0, this.TICKETS - (+L.tickets || 0));
    if (L.season !== this.season()) {
      if (L.peak > 0) L.prize = { season: L.season, rank: L.peak }; // сундук за прошлый сезон забирает сервер (leaguePrize)
      L.season = this.season(); L.pts = this.reset(L.pts); L.got = {}; L.peak = this.rank(L.pts);
    }
    if (L.day !== U.today()) { L.day = U.today(); L.tickets = this.TICKETS; L.n = 0; }
    return L;
  },
  st() { return (S.d.league = this.norm(S.d.league)); },                                      // сервер
  view() { return this.norm(S.d.league ? JSON.parse(JSON.stringify(S.d.league)) : null); },   // телефон
  rank(pts) { let r = 0; LEAGUE_RANKS.forEach((x, i) => { if (pts >= x.pts) r = i; }); return r; },
  // рейтинг из чужого сохранения (карточка Ловчего): старые звёзды ×100, прошлый сезон — со срезом
  ratingOf(L) {
    if (!L || typeof L !== 'object') return 0;
    let p = L.pts != null ? +L.pts || 0 : (+L.stars || 0) * 100;
    if (L.season !== this.season()) p = this.reset(p);
    return U.clamp(Math.floor(p), 0, this.MAXPTS);
  },
  // 4.16: изменение рейтинга: me, opp — рейтинги до боя, score — 1 победа, 0.5 ничья, 0 поражение
  delta(me, opp, score) {
    const r = this.rank(me), E = 1 / (1 + Math.pow(10, (opp - me) / 400));
    let d = Math.round((score >= E ? this.KW[r] : this.KL[r]) * (score - E));
    if (score === 1) d = Math.max(1, d);
    if (score === 0) d = Math.min(-1, d);
    const pts = U.clamp(me + d, 0, this.MAXPTS);
    return { d: pts - me, pts, rank: this.rank(pts) };
  },
  // 4.16: кого ищем. Своя лига; у границы (ближе NEAR) — и соседняя; после 15 с — ±1 лига, после 30 с — ±2, после 60 с — все
  // 5.1.11: соперник — в пределах ±RANGE очков рейтинга от Ловчего (независимо от лиг и времени ожидания); пара — взаимная
  RANGE: 150,
  window(pts) {
    pts = Math.max(0, Math.round(+pts || 0));
    const lo = Math.max(0, pts - this.RANGE), hi = Math.min(this.MAXPTS, pts + this.RANGE);
    return { a: this.rank(lo), b: this.rank(hi), w: 0, lo, hi };
  },
  // сундук за высшую лигу прошлого сезона
  prize(r) { return r > 0 ? { sparks: 400 * r, charm2: 2 * r, charm3: Math.floor(r / 2) } : null; },

  // 5.0: значок лиги — медальон из материала лиги с кристаллом Алатыря в центре (инлайн-SVG 340×400, LeagueBadge)
  badge(i) { return LeagueBadge(U.clamp(i | 0, 0, LEAGUE_RANKS.length - 1)); },
  // значок рейтинга — кубок
  cup() { return '<svg class="lg-cup" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v3.5a5 5 0 0 1-10 0z" fill="#fcd34d" stroke="#92400e" stroke-width="1.2"/><path d="M7 5.5H4.5a3 3 0 0 0 3 4M17 5.5h2.5a3 3 0 0 1-3 4" fill="none" stroke="#fcd34d" stroke-width="1.6"/><path d="M12 12.5v3.5M8.5 20h7l-.8-3.5H9.3z" fill="#f59e0b" stroke="#92400e" stroke-width="1.1"/></svg>'; },
  rwLine(i) { const x = LEAGUE_RANKS[i]; return x.reward ? UI.rwText(x.reward) + (i % 3 === 0 ? ' + ' + ru`амулет` : '') + (i === 9 ? ' + ' + ru`эмблема «Венец»` : '') : ''; },

  // «6 дн 11 ч», «5 ч 12 мин», «12 мин 05 с»
  left(ms) {
    const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60;
    return d ? ru`${d} дн ${h} ч` : h ? ru`${h} ч ${m} мин` : ru`${m} мин ${String(s % 60).padStart(2, '0')} с`;
  },
  toMidnight() { return 86400000 - U.local().getTime() % 86400000; },

  // Таблица сезона — только с сервера игры (текущие уровни и имена, коды для карточки)
  async top() {
    return Game.act('leagueTop', { board: true }); // таблицу напрямую не читает никто (3.23): только через сервер игры
  },

  // 4.16: итоги боёв, которые сервер засчитал без экрана (телефон закрылся посреди боя), и сундук за прошлый сезон
  showDone(r) {
    if (!r) return;
    if (r.prize) UI.modal({ title: ru`Итоги сезона`, html: `<div class="lg-prize"><span class="lg-badge">${this.badge(r.prize.rank)}</span><p>${ru`В прошлом сезоне ты дошёл до лиги «${LEAGUE_RANKS[r.prize.rank].name}». Награда Ордена:`}</p><div class="res-rw">${r.prize.got.map(x => `<div><b>+${U.fmtNum(x.n)}</b> ${I18N.back(x.label)}</div>`).join('')}</div></div>`, buttons: [{ label: ru`Забрать`, cls: 'primary' }] });
    (r.done || []).forEach(x => UI.toast(x.win ? ru`Бой с ${U.esc(x.foe.name)} засчитан: победа, рейтинг +${x.d}` : x.draw ? ru`Бой с ${U.esc(x.foe.name)} засчитан: ничья` : ru`Бой с ${U.esc(x.foe.name)} засчитан: поражение, рейтинг −${Math.abs(x.d)}`, x.win ? 'good' : ''));
  },

  screen() {
    Sfx.init();
    let L = this.view(), r = this.rank(L.pts);
    const next = LEAGUE_RANKS[r + 1], base = LEAGUE_RANKS[r].pts, cup = this.cup();
    const prog = next ? Math.min(100, (L.pts - base) / (next.pts - base) * 100) : 100;
    // 4.14.1: Лига — в композиции карточки духа: сверху (≤30%) знак ранга в волшебном круге, справа сезон, ранг, «ЗВЁЗДЫ ··· N»,
    // путь до следующего ранга отдельным блоком и место в таблице; ниже вкладки, содержимое вкладки листается внутри панели
    const scr = UI.screen(ru`Лига Ордена`, `
      <div class="det det2 lg2 r${r}">
        <div class="dt-hero">
          <div class="det-art lg2-crest">${this.badge(r)}</div>
          <div class="dt-info">
            <div class="det-hp">${this.seasonName()} · <b class="lgx-ends"></b></div>
            <div class="lg2-rank${LEAGUE_RANKS[r].name.length > 10 ? ' long' : ''}">${LEAGUE_RANKS[r].name}</div>
            <div class="det-power"><small>${ru`РЕЙТИНГ`}</small><b>${cup}${U.fmtNum(L.pts)}</b></div>
            <div class="det-lvl"><span>${next ? ru`до лиги «${next.name}» — <b>${U.fmtNum(next.pts)}</b>, ещё ${U.fmtNum(next.pts - L.pts)}` : ru`высшая лига!`}</span><div class="arc"><i style="width:${prog}%"></i></div></div>
            <div class="lgx-place">${Cloud.enabled() ? ru`Ищу тебя в таблице…` : ''}</div>
          </div>
        </div>
        <div class="seg dt-tabs lgx-tabs"><button data-tab="play">${ru`Бой`}</button><button data-tab="table">${ru`Таблица`}</button><button data-tab="ranks">${ru`Лиги`}</button></div>
        <div class="dt-panel"><div class="lgx-pane"></div></div>
      </div>`, 'league-screen det-screen');
    const body = scr.querySelector('.screen-body'), pane = scr.querySelector('.lgx-pane');
    let data = null, moves = {}, prevPos = null, loading = false, live = null;

    // 4.16: вкладка «Бой» — команда, жетоны и поиск живого соперника; идущий бой (телефон закрывали) — «Вернуться в бой»
    const renderPlay = () => {
      const team = S.team(), locked = S.d.level < this.LEVEL, power = team.reduce((a, x) => a + S.power(x), 0);
      const cards = UI.teamCards(team); // 5.1.5: три карточки в ряд, пустые места — «+ Выбрать духа»
      const ko = team.some(x => !S.alive(x));
      const btn = locked ? ru`Лига откроется на ${this.LEVEL} уровне` : team.length < 3 ? ru`Нужно три духа` : ko ? ru`В команде дух без сил` : L.tickets > 0 ? ru`Найти соперника` : ru`Жетоны кончились — приходи завтра`;
      pane.innerHTML = `
        ${locked ? `<div class="lgx-card lgx-lock"><b>${ru`Лига откроется на ${this.LEVEL} уровне Ловчего`}</b><small>${ru`Сейчас у тебя ${S.d.level}-й. Лови духов, проходи источники и разломы — опыт придёт быстро.`}</small></div>` : ''}
        ${live ? `<div class="lgx-card lgx-livebout"><div class="row-main"><b>${ru`Бой ещё идёт!`}</b><small>${ru`Соперник ждёт. Не вернёшься — через ${PvP.IDLE / 1000} с тебе засчитают поражение.`}</small></div><button class="btn primary small lg-back">${ru`В бой`}</button></div>` : ''}
        <div class="lg2-tix"><span>${ru`Жетоны`}</span><i class="lg2-pips">${Array.from({ length: this.TICKETS }, (_, i) => `<i class="${i < L.tickets ? 'on' : ''}"></i>`).join('')}</i><b>${L.tickets} / ${this.TICKETS}</b></div>
        <div class="lg2-tix-s">${ru`жетоны обновятся через ${'<b class="lgx-mid"></b>'}`}</div>
        <div class="pf-mh lg2-th"><span>${ru`Команда на бой`}</span>${power ? `<b>${ru`сила ${U.fmtNum(power)}`}</b>` : ''}<button class="lg2-edit team-edit">${ru`Изменить`}</button></div>
        <div class="lg2-team">${cards}</div>
        <div class="lg2-rule">${ru`Соперник — живой Ловчий с рейтингом ±${this.RANGE} от твоего. Рейтинг зависит от силы соперника · опыт — за первые ${this.XP_RUNS} боёв дня`}</div>
        <button class="btn primary wide lg-go" ${!locked && !ko && L.tickets > 0 && team.length === 3 ? '' : 'disabled'}>${btn}</button>`;
    };

    const who = x => `${U.esc(x.name)}${CLANS[x.clan] ? `<i class="lgx-clan" style="background:${CLANS[x.clan].color}" title="${CLANS[x.clan].name}"></i>` : ''}`;
    const move = x => { const d = x.pid && moves[x.pid]; return d && Date.now() - d.t < 20000 ? `<span class="lgx-move ${d.d > 0 ? 'up' : 'down'}">${d.d > 0 ? '▲' : '▼'}${Math.abs(d.d)}</span>` : ''; };
    const renderTable = () => {
      if (!Cloud.enabled()) { pane.innerHTML = `<div class="lgx-card"><small>${ru`Общая таблица всех Ловчих появится, когда к игре подключат облачный сервер.`}</small></div>`; return; }
      const head = `<div class="lgx-live"><i></i>${ru`Обновляется в реальном времени`}${data ? `<span>${ru`${data.total} ${U.plural(data.total, ru`Ловчий`, ru`Ловчих`, ru`Ловчих`)} в сезоне`}</span>` : ''}</div>`;
      if (!data) { pane.innerHTML = head + `<div class="lgx-card"><small>${ru`Загружаю таблицу…`}</small></div>`; return; }
      if (data.error) { pane.innerHTML = head + `<div class="lgx-card"><small>${ru`Таблица недоступна: ${U.esc(data.error)}`}</small></div>`; return; }
      const rows = data.rows, tier = data.tier || { rank: r, rows: [] };
      if (!rows.length) { pane.innerHTML = head + `<div class="lgx-card"><small>${ru`В этом сезоне ещё никто не сыграл в Лиге — будь первым!`}</small></div>`; return; }
      // пьедестал — тройка лучших в твоём ранге; ниже — остальные из топ-50 сезона (с их местом в сезоне)
      const key = x => x.pid || x.name, onPod = new Set(tier.rows.map(key));
      const seat = x => rows.findIndex(y => key(y) === key(x)) + 1;
      const pod = [1, 0, 2].filter(i => tier.rows[i]).map(i => { const x = tier.rows[i], p = seat(x); return `
        <button class="lgx-pod p${i + 1} ${x.me ? 'me' : ''}" data-pid="${U.esc(x.pid || '')}" data-name="${U.esc(x.name)}">
          <div class="lgx-pod-ava">${Art.avatar(x.look || undefined)}<span>${i + 1}</span></div>
          <b>${who(x)}</b><small>${p ? ru`${p}-е место` + ' · ' : ''}${ru`ур. ${x.lvl}`}</small>
          <div class="lgx-pod-base">${cup}${U.fmtNum(x.pts)}${move(x)}</div></button>`; }).join('');
      const list = rows.map((x, j) => ({ x, j })).filter(o => !onPod.has(key(o.x))).map(({ x, j }) => `
        <button class="lgx-row ${x.me ? 'me' : ''}" data-pid="${U.esc(x.pid || '')}" data-name="${U.esc(x.name)}">
          <b class="lgx-pos">${j + 1}</b><div class="fr-ava">${Art.avatar(x.look || undefined)}</div>
          <div class="row-main"><b>${who(x)}</b><small>${LEAGUE_RANKS[x.rank].name} · ${ru`ур. ${x.lvl}`}</small></div>
          ${move(x)}<span class="lgx-stars">${cup}${U.fmtNum(x.pts)}</span></button>`).join('');
      const mine = !rows.some(x => x.me) && data.me ? `<div class="lgx-row me lgx-mine"><b class="lgx-pos">${data.me.place}</b><div class="row-main"><b>${ru`Ты`}</b><small>${LEAGUE_RANKS[r].name} · ${ru`ур. ${S.d.level}`}</small></div><span class="lgx-stars">${cup}${U.fmtNum(data.me.pts)}</span></div>` : '';
      pane.innerHTML = head + (pod ? `<div class="lgx-sub"><span class="lg-badge sm">${this.badge(tier.rank)}</span>${ru`Лучшие в лиге «${LEAGUE_RANKS[tier.rank].name}»`}</div><div class="lgx-podium">${pod}</div>` : '')
        + (list ? `<div class="lgx-sub">${ru`Топ-50 сезона`}</div><div class="list lgx-list">${list}</div>` : '') + mine
        + `<div class="q-note">${ru`Нажми на Ловчего, чтобы открыть его карточку.`}</div>`;
    };

    const renderRanks = () => {
      pane.innerHTML = `<div class="lgx-ladder">${LEAGUE_RANKS.map((x, i) => `
        <div class="lgx-rung ${i < r ? 'past' : i === r ? 'cur' : ''}">
          <span class="lg-badge">${this.badge(i)}</span>
          <div class="row-main"><b>${x.name}${i === r ? ` <span class="lgx-you">${ru`ты здесь`}</span>` : ''}</b><small>${ru`от ${U.fmtNum(x.pts)}`}${x.reward ? ' · ' + this.rwLine(i) : ' · ' + ru`начало пути`}</small></div>
          ${L.got[i] ? `<span class="q-ok" title="${ru`Получено в этом сезоне`}">✓</span>` : i > r ? `<span class="lgx-need">${ru`ещё ${U.fmtNum(x.pts - L.pts)}`}</span>` : ''}
        </div>`).join('')}</div>
        <div class="q-note">${ru`Рейтинг зависит от соперника: победа над сильным даёт много, над слабым — мало; поражение от слабого стоит дороже. В твоей лиге победа над равным — +${Math.round(this.KW[r] / 2)}, поражение — −${Math.round(this.KL[r] / 2)}; чем выше лига, тем медленнее подъём. Из лиги можно выпасть. Награду за лигу дают один раз за сезон. В начале нового сезона рейтинг сверх ${U.fmtNum(this.SOFT)} срезается наполовину, а за высшую лигу прошлого сезона Орден дарит сундук. В лигах «${LEAGUE_RANKS[3].name}», «${LEAGUE_RANKS[6].name}» и «${LEAGUE_RANKS[9].name}» — ещё и амулет.`}</div>`;
    };

    const place = () => {
      const el = scr.querySelector('.lgx-place'); if (!el || !data || data.error) return;
      const i = data.rows.findIndex(x => x.me);
      el.innerHTML = i >= 0 ? ru`<b>${i + 1}-е место</b> из ${data.total} в сезоне` : data.me ? ru`<b>${data.me.place}-е место</b> из ${data.total} в сезоне`
        : ru`Сыграй бой, чтобы попасть в таблицу`;
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
      const e = scr.querySelector('.lgx-ends'); if (e) e.textContent = this.seasonLeft();
      const m = scr.querySelector('.lgx-mid'); if (m) m.textContent = this.left(this.toMidnight());
    };
    // 4.16: при входе — засчитать бои, закончившиеся без экрана, сундук сезона и идущий бой
    const state = async () => {
      if (!Game.on() || S.d.level < this.LEVEL) return;
      const st = await Game.act('leagueState', { board: true }).catch(() => null);
      if (!st || !scr.isConnected) return;
      this.showDone(st);
      live = st.live;
      L = this.view(); r = this.rank(L.pts);
      if (this.tab === 'play') renderPlay();
    };

    scr.addEventListener('click', async e => {
      const tb = e.target.closest('[data-tab]');
      if (tb) { if (tb.dataset.tab !== this.tab) { Sfx.play('tap'); show(tb.dataset.tab, Math.sign(this.TABS.indexOf(tb.dataset.tab) - this.TABS.indexOf(this.tab))); } return; }
      if (e.target.closest('.team-edit, .team-slot')) { UI.pickTeam(() => { if (scr.isConnected && this.tab === 'play') renderPlay(); }); return; }
      const row = e.target.closest('[data-pid]');
      if (row) {
        const x = data && data.rows && data.rows.concat(data.tier ? data.tier.rows : []).find(y => y.pid && y.pid === row.dataset.pid);
        if (x) Friends.card(x.pid, { name: x.name, look: x.look }); else UI.toast(ru`Карточка откроется после обновления сервера`); return; }
      if (e.target.closest('.lg-back')) { UI.closeScreen(scr); LeagueBattle.resume(live); return; }
      if (e.target.closest('.lg-go')) { if (S.team().length < 3) return; UI.closeScreen(scr); LeagueBattle.search(); }
    });
    UI.swipeTabs(body, this.TABS, () => this.tab, show);
    render(); load(); state();
    if (typeof Alatyr !== 'undefined') Alatyr.refresh().then(() => { if (scr.isConnected) tick(); }); // 4.28: грани камня — до конца сезона
    let n = 0;
    const t = setInterval(() => {
      if (!scr.isConnected) { clearInterval(t); return; }
      tick();
      // жетоны вернулись в полночь — перерисовать вкладку боя
      if (L.day !== U.today()) { L = this.view(); r = this.rank(L.pts); if (this.tab === 'play') renderPlay(); }
      if (++n % 5 === 0 && !document.hidden) load();
    }, 1000);
  },
};

/* ---------- 4.16: бой Лиги — движок сервера ----------
   Состояние боя — простой объект (хранится в базе, league_matches.state); меняет его только сервер игры.
   Время — «ленивое»: сервер не тикает сам, а при каждом запросе любого из двух Ловчих досчитывает бой до текущего
   момента (advance): истёкшие решения о щите и о смене духа — автоходом, время боя, пропавший Ловчий.
   s.a / s.b — стороны: имя, облик, рейтинг, бойцы (сила и здоровье — с сервера, из сохранения), щиты, перезарядка
   смены (cd), «ведро» быстрых ударов (tok — не чаще RATE в секунду), когда последний раз был на связи (seen).
   pause — приём (k: 'charge': мини-игра атакующего и решение защитника о щите) или вынужденная смена духа (k: 'switch').
   log — последние события (удары, приёмы, щиты, смены) — по ним телефон соперника показывает, что происходит. */
const PvP = {
  COUNT: 5000,        // мс от подбора до начала боя: оба телефона успевают узнать о бое
  TIME: 150,          // секунд боя (паузы на приёмы и смену не считаются)
  CAP_MS: 6 * 60000,  // и не дольше 6 минут по часам
  FAST: 6,            // сила быстрого удара (как в поединках)
  RATE: 2, BURST: 3,  // быстрые удары: не чаще двух в секунду, запас — на неровную сеть
  MAX_TAPS: 6,        // больше ударов в одном ходе телефон не присылает — это подделка
  MINI: 2200,         // мс мини-игры приёма
  DECIDE: 3000,       // мс на решение о щите; потом приём срабатывает сам
  TAPS_PER_S: 7, TAPS_MAX: 12,
  SWITCH_CD: 25000,   // перезарядка добровольной смены
  SWITCH_T: 6000,     // мс на выбор духа после поражения бойца; потом — первый живой
  IDLE: 20000,        // нет вестей 20 с — поражение
  SEEN_EVERY: 5000,   // отметку «на связи» пишем не чаще раза в 5 с
  LOG: 16,

  other(s) { return s === 'a' ? 'b' : 'a'; },
  r3(x) { return Math.round(x * 1000) / 1000; },
  // урон — как в поединках, но без погоды: у двух Ловчих она разная
  dmg(att, def, power, ae, de) { return Math.floor(0.5 * power * (att / def) * 1.2 * Raid.eff(ae, de)) + 1; },
  // боец из духа Ловчего (сервер, при постановке в очередь): здоровье — текущее (раны общие на всю игру)
  fighter(sp) {
    const x = S.battle(sp), max = Math.round(x.hp * Duel.HPX);
    return { uid: sp.uid, sid: sp.sid, lvl: sp.lvl, nick: sp.nick || null, shiny: !!sp.shiny, dark: !!(sp.dark && !sp.purified), move2: !!sp.move2,
      el: SP[sp.sid].el, atk: this.r3(x.atk), def: this.r3(x.def), max, cur: Math.max(1, Math.round(max * S.hpNow(sp))), en: 0, emul: x.energy || 1, power: x.power };
  },
  // новая запись боя (league_find кладёт { init, a, b, at, season }) → полное состояние
  ensure(x) {
    if (!x || !x.init) return x;
    const t0 = x.at + this.COUNT;
    const side = i => ({ pid: i.pid, name: i.name, look: i.look || null, lvl: i.lvl, pts: i.pts, rank: i.rank, clan: i.clan || null, power: i.power,
      team: i.team.map(f => ({ ...f, cur: Math.min(f.cur, f.max), en: 0 })), idx: 0, sh: 2, cd: 0, tok: this.BURST, tokAt: t0, seen: x.at, hits: 0, rej: 0 });
    return { v: 1, season: x.season, t0, at: t0, clock: 0, pause: null, over: null, n: 0, log: [], s: { a: side(x.a), b: side(x.b) } };
  },
  cur(st, side) { const x = st.s[side]; return x.team[x.idx]; },
  log(st, e) { st.n++; st.log.push({ n: st.n, ...e }); if (st.log.length > this.LOG) st.log.splice(0, st.log.length - this.LOG); },
  share(x) { return x.team.reduce((a, f) => a + Math.max(0, f.cur) / f.max, 0) / x.team.length; },

  // досчитать бой до момента now (только сервер)
  advance(st, now) {
    for (let g = 0; g < 20 && !st.over; g++) {
      if (now < st.t0) return;
      const ia = now - st.s.a.seen > this.IDLE, ib = now - st.s.b.seen > this.IDLE;
      if (ia || ib) { const lost = ia && ib ? (st.s.a.seen <= st.s.b.seen ? 'a' : 'b') : ia ? 'a' : 'b'; return this.end(st, this.other(lost), 'idle', now); }
      if (st.pause) {
        if (now < st.pause.until) return;
        const t = st.pause.until;
        if (st.pause.k === 'charge') this.resolve(st, t);
        else { st.pause.who.forEach(s => { const x = st.s[s]; x.idx = Math.max(0, x.team.findIndex(f => f.cur > 0)); this.log(st, { t, s, e: 'switch', i: x.idx, auto: 1 }); }); st.pause = null; st.at = t; }
        continue;
      }
      const dt = Math.max(0, now - st.at) / 1000;
      if (st.clock + dt >= this.TIME || now - st.t0 >= this.CAP_MS) {
        st.clock = Math.min(this.TIME, st.clock + dt); st.at = now;
        const a = this.share(st.s.a), b = this.share(st.s.b);
        return this.end(st, Math.abs(a - b) < 0.001 ? null : a > b ? 'a' : 'b', 'time', now);
      }
      st.clock += dt; st.at = now;
      return;
    }
  },
  end(st, win, why, now) {
    const a = st.s.a, b = st.s.b, sc = s => (win === s ? 1 : win ? 0 : 0.5);
    st.pause = null;
    // рейтинг обоим — в той же записи, что и итог (атомарно): от рейтингов на момент подбора
    st.over = { win, why, t: now, d: { a: League.delta(a.pts, b.pts, sc('a')), b: League.delta(b.pts, a.pts, sc('b')) } };
    this.log(st, { t: now, e: 'end', s: win, why });
  },
  refill(x, now) { x.tok = Math.min(this.BURST, x.tok + Math.max(0, now - x.tokAt) / 1000 * this.RATE); x.tokAt = now; },
  fast(st, me, now) {
    const foe = this.other(me), m = this.cur(st, me), f = this.cur(st, foe);
    m.en = Math.min(100, m.en + 7 * (m.emul || 1));
    const d = this.dmg(m.atk, f.def, this.FAST, m.el, f.el);
    f.cur -= d;
    st.s[me].hits++;
    this.log(st, { t: now, s: me, e: 'hit', d });
    if (f.cur <= 0) this.faint(st, foe, now);
  },
  resolve(st, now) {
    const p = st.pause, att = st.s[p.by], dfn = st.s[this.other(p.by)], m = att.team[att.idx], f = dfn.team[dfn.idx];
    const mult = 0.55 + 0.45 * Math.min(1, (p.taps || 0) / this.TAPS_MAX);
    const sh = !!p.sh && dfn.sh > 0;
    const d = sh ? 1 : this.dmg(m.atk, f.def, MOVES[p.kind].power * mult, m.el, f.el);
    if (sh) dfn.sh--;
    f.cur -= d;
    st.pause = null; st.at = now;
    this.log(st, { t: now, s: p.by, e: 'charged', kind: p.kind, d, sh: sh ? 1 : 0 });
    if (f.cur <= 0) this.faint(st, this.other(p.by), now);
  },
  faint(st, side, now) {
    const x = st.s[side];
    x.team[x.idx].cur = 0;
    this.log(st, { t: now, s: side, e: 'ko', i: x.idx });
    if (!x.team.some(f => f.cur > 0)) return this.end(st, this.other(side), 'ko', now);
    if (st.pause && st.pause.k === 'switch') { if (!st.pause.who.includes(side)) st.pause.who.push(side); }
    else st.pause = { k: 'switch', who: [side], t: now, until: now + this.SWITCH_T };
  },

  /* Ход Ловчего. { ok } — применён, { ign } — не ко времени (бой на паузе, мало энергии, перезарядка: на неровной сети
     так бывает у честного телефона — ход просто не засчитан), { bad } — такого честный телефон не присылает (подделка):
     сервер отклоняет весь запрос. */
  act(st, me, x, now) {
    const bad = m => ({ bad: m }), ign = m => ({ ign: m });
    if (!x || typeof x !== 'object' || typeof x.t !== 'string') return bad(ru`Неизвестный ход`);
    const my = st.s[me], p = st.pause, busy = !!st.over || now < st.t0;
    switch (x.t) {
      case 'sync': return { ok: 1 };
      case 'hit': {
        const n = x.n;
        if (!Number.isInteger(n) || n < 1 || n > this.MAX_TAPS) return bad(ru`Слишком много ударов сразу`);
        if (busy || p) { my.rej += n; return ign('pause'); }
        this.refill(my, now);
        const k = Math.min(n, Math.floor(my.tok + 1e-9));
        my.tok -= k; my.rej += n - k;
        let i = 0;
        for (; i < k && !st.pause && !st.over; i++) this.fast(st, me, now);
        my.rej += k - i; // бой встал на паузу посреди пачки — остальные удары не засчитаны
        return { ok: 1, got: i };
      }
      case 'charge': {
        const kind = x.kind === 'charge' || x.kind === 'charge2' ? x.kind : null;
        if (!kind) return bad(ru`Неизвестный приём`);
        const m = this.cur(st, me);
        if (kind === 'charge2' && !m.move2) return bad(ru`Этот приём не выучен`);
        if (busy || p) return ign('pause');
        if (m.en < MOVES[kind].cost) return ign('energy');
        m.en -= MOVES[kind].cost;
        st.pause = { k: 'charge', by: me, kind, t: now, until: now + this.DECIDE, taps: null, sh: null };
        this.log(st, { t: now, s: me, e: 'charge', kind });
        return { ok: 1 };
      }
      case 'taps': {
        const n = x.n;
        if (!Number.isInteger(n) || n < 0 || n > this.TAPS_MAX) return bad(ru`Неверный приём`);
        if (!p || p.k !== 'charge' || p.by !== me || p.taps != null) return ign('late');
        p.taps = Math.min(n, Math.floor((now - p.t) / 1000 * this.TAPS_PER_S)); // быстрее человеческой руки не бывает
        if (p.sh != null) this.resolve(st, now);
        return { ok: 1 };
      }
      case 'shield': {
        if (!p || p.k !== 'charge' || p.by === me || p.sh != null) return ign('late');
        p.sh = !!x.on && my.sh > 0;
        if (p.taps != null) this.resolve(st, now);
        return { ok: 1 };
      }
      case 'switch': {
        const i = x.i;
        if (!Number.isInteger(i) || i < 0 || i >= my.team.length || my.team[i].cur <= 0) return bad(ru`Этого духа не выпустить`);
        if (p && p.k === 'switch' && p.who.includes(me)) {
          my.idx = i;
          p.who = p.who.filter(s => s !== me);
          this.log(st, { t: now, s: me, e: 'switch', i });
          if (!p.who.length) { st.pause = null; st.at = now; }
          return { ok: 1 };
        }
        if (busy || p || i === my.idx) return ign('pause');
        if (now < my.cd) return ign('cd');
        my.idx = i; my.cd = now + this.SWITCH_CD;
        this.log(st, { t: now, s: me, e: 'switch', i });
        return { ok: 1 };
      }
      case 'quit':
        if (st.over) return ign('over');
        this.end(st, this.other(me), 'quit', now);
        return { ok: 1 };
    }
    return bad(ru`Неизвестный ход`);
  },

  // 4.26: бой для телефона Ловчего seat (ответы сервера) — в том же виде, что в базе, но без скрытого: энергии, атаки, второго
  // приёма и перезарядок духов соперника, его счётчиков ударов, а в паузе приёма — чужого решения (щит у атакующего, сила
  // приёма у защищающегося), пока оно не раскрыто. Защита духа (def) остаётся: по ней телефон заранее показывает свой урон
  mask(st, seat) {
    if (!st || !st.s || !st.s[seat]) return st;
    const x = JSON.parse(JSON.stringify(st)), foe = x.s[this.other(seat)], p = x.pause;
    if (foe) {
      foe.team = (foe.team || []).map(f => { const { atk, emul, ...o } = f; return { ...o, en: 0, move2: false }; });
      Object.assign(foe, { cd: 0, tok: 0, tokAt: 0, hits: 0, rej: 0 });
    }
    if (p && p.k === 'charge') { if (p.by === seat) p.sh = null; else p.taps = null; }
    return x;
  },
  // Бой глазами Ловчего seat: «я» и «соперник»; энергию и показатели духов соперника не показываем
  view(st, seat, now) {
    const rel = s => (s === seat ? 'me' : s ? 'foe' : null), p = st.pause, o = st.over;
    const active = !o && !p && now >= st.t0;
    const side = (x, mine) => ({ name: x.name, look: x.look, lvl: x.lvl, pts: x.pts, rank: x.rank, clan: x.clan, power: x.power, idx: x.idx, sh: x.sh, cd: mine ? x.cd : 0,
      recv: mine ? x.hits + x.rej : 0, // сколько быстрых ударов сервер уже получил (засчитал или отклонил) — для подсказки телефона
      team: x.team.map(f => ({ sid: f.sid, lvl: f.lvl, nick: f.nick, shiny: f.shiny, dark: f.dark, el: f.el, max: f.max, cur: Math.max(0, f.cur), power: f.power, move2: mine ? f.move2 : false, en: mine ? f.en : 0 })) });
    return {
      seat, n: st.n, t0: st.t0, left: Math.max(0, this.TIME - st.clock - (active ? Math.max(0, now - st.at) / 1000 : 0)),
      pause: p ? { k: p.k, by: rel(p.by), kind: p.kind, t: p.t, until: p.until, done: p.k === 'charge' ? (p.by === seat ? p.taps != null : p.sh != null) : false, who: p.who ? p.who.map(rel) : null } : null,
      over: o ? { win: rel(o.win), why: o.why, d: o.d ? o.d[seat] : null } : null,
      me: side(st.s[seat], true), foe: side(st.s[this.other(seat)], false),
      log: st.log.map(e => ({ ...e, s: rel(e.s) })),
    };
  },
};

// ===== www/js/raid.js =====
/* Разломы: битва с боссом (тап — атака, свайп/кнопка — уклон), затем поимка босса */

const Raid = {
  /* 4.16: босс — по уровню Ловчего (rl; в совместном бою — средний уровень Ловчих комнаты): атака и защита — как у духа
     уровня rl, умноженные на k; здоровье hp и сила удара pw — для Ловчего 20-го уровня, с уровнем растут вместе с силой
     духов (Raid.grow). Раньше босс был один на все уровни (hp 600 / 1800 / 4500, атака и защита — как у духа 14 / 22 / 28
     уровня): новичку не по силам, сильный закрывал 9 из 10, и легенды тоже. Ориентир побед живого игрока своей командой:
     малый — ~85%, средний — ~55–60%, великий (легенды) — в одиночку ~25%, втроём ~70%. lvl — уровень пойманного босса */
  TIER: {
    1: { hp: 3000, k: 1.35, lvl: 15, pw: 10, charms: 6, name: ru`Малый разлом` },
    2: { hp: 4500, k: 1,    lvl: 22, pw: 16, charms: 7, name: ru`Разлом` },
    3: { hp: 6000, k: 0.72, lvl: 30, pw: 24, charms: 9, name: ru`Великий разлом` },
  },
  // здоровье босса в совместном бою: +COOP за каждого союзника (раньше +80% — втроём было почти как в одиночку)
  COOP: 0.6,
  coopHp(n) { return 1 + this.COOP * Math.max(0, (n | 0) - 1); },
  st: null,

  team() { return S.team(); },
  // во сколько раз сильнее «опорного» (20-го уровня) дух уровня rl: здоровье босса растёт как урон духов, удар — как их здоровье
  // после 30-го уровня босс растёт вдвое медленнее: сила духов там упирается в предел уровня
  grow(rl) { const x = S.cpm(this.bossLvl(rl)) / S.cpm(20); return { hp: Math.pow(x, 1.2), pw: x }; },
  bossLvl(rl) { return rl <= 30 ? rl : 30 + (rl - 30) / 2; },
  bossStats(r) {
    const T = this.TIER[r.tier], b = SP[r.boss].base, rl = U.clamp(Math.round(+r.rl || S.catchLvl()), 1, 40), c = S.cpm(this.bossLvl(rl)) * T.k, g = this.grow(rl);
    return { atk: (b[0] + 15) * c, def: (b[1] + 15) * c, hp: Math.round(T.hp * g.hp), pw: T.pw * g.pw, rl };
  },
  eff(att, def) {
    if (ELEMENTS[att].beats.includes(def)) return 1.6;
    if (ELEMENTS[def].beats.includes(att)) return 0.625;
    return 1;
  },

  open(r) {
    if (S.d.level < RAID_LEVEL) { UI.toast(ru`Разломы открываются с ${RAID_LEVEL} уровня Ловчего`); return; } // 4.18
    const s = SP[r.boss], T = this.TIER[r.tier];
    let team = this.team();
    const counters = SPECIES.filter(x => ELEMENTS[x.el].beats.includes(s.el)).map(x => x.el).filter((v, i, a) => a.indexOf(v) === i);
    // до Разлома дальше 100 м — бой по Дальнему пропуску (совместный бой — только рядом)
    const d = MapView.pos ? U.dist(MapView.pos.lat, MapView.pos.lng, r.lat, r.lng) : 0;
    const far = d > W.BATTLE_R, passes = S.d.items.farpass || 0;
    const goBtn = !far ? `<button class="btn primary wide rift-go" ${team.length ? '' : 'disabled'}>${ru`Сразиться`}</button>`
      : passes ? `<button class="btn primary wide rift-go far" ${team.length ? '' : 'disabled'}>${Art.item('farpass')} ${ru`Дальний бой · пропусков: ${passes}`}</button>`
      : `<button class="btn primary wide rift-shop">${Art.item('farpass')} ${ru`Нужен Дальний пропуск — в Лавку`}</button>`;
    // 4.22.2: в композиции карточки духа и Лиги: сверху портал с боссом, справа ступень, босс, сила и таймер;
    // вкладки «Бой» (команда и кнопки — закреплены внизу), «Босс» (слабость, погода, как бить), «Награда»
    const st = this.bossStats(r), el = s.el, w = Sky.w ? WEATHER[Sky.w.key] : null;
    const teamHtml = t => UI.teamCards(t); // 5.1.5: три карточки в ряд, пустые места — «+ Выбрать духа»
    const power = t => t.reduce((a, x) => a + S.power(x), 0);
    const row = (t, v) => `<div class="dt-row"><span>${t}</span><b>${v}</b></div>`;
    const it = (k, n) => `<span class="cur">${Art.item(k)}</span> ${n}`;
    const T2 = r.tier; // 4.25: место Разлома — значком булавки, без «у «…»» (название места не склоняется)
    const html = `
      <div class="det det2 rift2 t${T2}">
        <div class="dt-hero">
          <div class="det-art rift2-art"><div class="rift-portal">${Art.riftIcon(T2, r.myth)}</div><div class="rift-boss">${Art.spirit(r.boss)}</div></div>
          <div class="dt-info">
            <div class="det-hp">${T.name} <span class="stars">${'★'.repeat(T2)}</span></div>
            <div class="rift2-name">${Art.elIcon(el, 18)} ${s.name}</div>
            <div class="det-power"><small>${ru`СИЛА БОССА`}</small><b>${U.fmtNum(st.hp * 1.5)}</b></div>
            <div class="rift2-left">${ru`закроется через ${`<b class="rift-left">${U.fmtTime(Math.max(0, r.endsAt - U.now()))}</b>`}`}</div>
            ${r.place ? `<div class="rift2-place">${UI.I.pin}${U.esc(r.place)}</div>` : ''}
            <div class="rift2-place place-kind">${MYTH_PLACES[r.myth || 'slavic'].rift}</div>
          </div>
        </div>
        <div class="seg dt-tabs"><button data-tab="fight" class="on">${ru`Бой`}</button><button data-tab="boss">${ru`Босс`}</button><button data-tab="loot">${ru`Награда`}</button></div>
        <div class="dt-panel">
          <div class="dt-pane on" data-pane="fight">
            ${r.done ? `<div class="rift-done">${ru`Этот разлом ты уже закрыл. Новый босс — в начале следующего часа.`}</div>` : `
            <div class="dt-scroll rift2-fight">
              <div class="pf-mh lg2-th"><span>${ru`Твоя команда`}</span><b class="rift2-pw">${team.length ? ru`сила ${U.fmtNum(power(team))}` : ''}</b><button class="lg2-edit team-edit">${ru`Изменить`}</button></div>
              <div class="lg2-team rift-team">${teamHtml(team)}</div>
              ${far ? `<div class="rift-tip rift-far">${ru`До Разлома ${U.fmtDist(d)}. Дальний пропуск: один Орден дарит каждый день, ещё — в Лавке. Позвать друзей можно, только подойдя к Капищу.`}</div>` : ''}
              ${Rules.dayLine(S.d, 'raids', ru`Разломов закрыто`)}
            </div>
            <div class="rift2-acts">${goBtn}${far ? '' : `<button class="btn ghost wide rift-coop">${ru`Позвать друзей`}</button>`}</div>`}
          </div>
          <div class="dt-pane" data-pane="boss">
            <p class="det-desc place-desc">${MYTH_PLACES[r.myth || 'slavic'].riftDesc}</p>
            <div class="dt-scroll dt-rows">
              ${row(ru`Стихия`, `${Art.elIcon(el, 16)} ${ELEMENTS[el].name}`)}
              ${row(ru`Слабость`, counters.map(e => `${Art.elIcon(e, 16)} ${ELEMENTS[e].name}`).join(' '))}
              ${w ? row(`${Art.wxIcon(Sky.w.key, 16)} ${w.name}`, ru`урон +20% у ${w.boost.map(e => ELEMENTS[e].name).join(` ${ru`и`} `)}`) : ''}
              ${row(ru`Уровень босса`, ru`растёт с уровнем Ловчего`)}
              <p class="rift2-note">${T2 === 3 ? ru`Великий разлом в одиночку по силам немногим — позови друзей: втроём его закрыть куда легче.` : ru`Бей в слабость: духи этих стихий наносят больше урона. Тап — атака, смахни в сторону — уклон от удара босса.`}</p>
            </div>
          </div>
          <div class="dt-pane" data-pane="loot">
            <div class="dt-scroll dt-rows">
              ${row(ru`Опыт`, U.fmtNum(1000 * T2) + (far ? '' : ru` · с друзьями +25%`))}
              ${row(ru`Искры`, it('sparks', U.fmtNum(350 * T2)))}
              ${row(ru`Обереги`, it('charm', 5) + (T2 >= 2 ? ' · ' + it('charm2', 3) : ''))}
              ${row(ru`Припасы`, it('honey', T2) + ' · ' + (T2 === 1 ? it('herb', 1) : it('water', 1)))}
              ${row(ru`Эссенция «${SP[s.fam].name}»`, S.RIFT_ESS[T2] || 0)}
              ${S.ALATYR_DROP.rift[T2] ? row(ru`Осколок Алатыря`, S.ALATYR_DROP.rift[T2] >= 1 ? ru`точно` : ru`шанс ${Math.round(S.ALATYR_DROP.rift[T2] * 100)}%`) : ''}
              ${row(ru`Амулет`, ru`шанс ${[5, 12, 30][T2 - 1]}%`)}
              ${row(ru`Поимка босса`, ru`${T.charms} ${U.plural(T.charms, ru`оберег`, ru`оберега`, ru`оберегов`)}`)}
              <p class="rift2-note">${ru`После победы босса можно поймать. Оберегов на поимку больше за быструю победу (+1 за каждые 15 с быстрее 90 с) и за друзей (+2 за каждого). Уровень пойманного духа — не выше твоего, сияющий — примерно 1 из 20.`}</p>
            </div>
          </div>
        </div>
      </div>`;
    const scr = UI.screen(MYTH_PLACES[r.myth || 'slavic'].rift, html, 'rift-screen det-screen'); // 4.28: свой у каждой мифологии
    scr._ended = !!r.done; // уже закрытый — сообщение есть в разметке
    scr.querySelector('.dt-tabs').addEventListener('click', e => {
      const b = e.target.closest('[data-tab]'); if (!b) return;
      Sfx.play('tap');
      U.$$('.dt-tabs button', scr).forEach(x => x.classList.toggle('on', x === b));
      U.$$('.dt-pane', scr).forEach(p => p.classList.toggle('on', p.dataset.pane === b.dataset.tab));
    });
    const go = scr.querySelector('.rift-go');
    if (go) go.onclick = async () => { if (await this.battle(r, this.team(), null, far)) UI.closeScreen(scr); };
    const shop = scr.querySelector('.rift-shop');
    if (shop) shop.onclick = () => { UI.closeScreen(scr); Shop.screen(); };
    const cb = scr.querySelector('.rift-coop');
    if (cb) cb.onclick = () => { UI.closeScreen(scr); Coop.hostRift(r); };
    const edit = () => UI.pickTeam(() => {
      team = this.team();
      const box = scr.querySelector('.rift-team'); if (box) box.innerHTML = teamHtml(team);
      const pw = scr.querySelector('.rift2-pw'); if (pw) pw.textContent = team.length ? ru`сила ${U.fmtNum(power(team))}` : '';
      const g = scr.querySelector('.rift-go'); if (g) g.disabled = !team.length;
    });
    scr.querySelector('.dt-panel').addEventListener('click', e => { if (e.target.closest('.team-edit')) edit(); });
    // каждую секунду: таймер; разлом закрыт (победа) или его час прошёл — вместо команды и кнопок сообщение
    const timer = setInterval(() => {
      if (!scr.isConnected) { clearInterval(timer); return; }
      const t = scr.querySelector('.rift-left'); if (t) t.textContent = U.fmtTime(Math.max(0, r.endsAt - U.now()));
      const done = !!S.d.rifts[r.id], gone = U.now() >= r.endsAt;
      if ((done || gone) && !scr._ended) {
        scr._ended = true;
        scr.querySelector('[data-pane="fight"]').innerHTML = `<div class="rift-done">${done ? ru`Этот разлом ты уже закрыл. Новый босс — в начале следующего часа.` : ru`Разлом схлопнулся — его час прошёл. Новые открываются в начале каждого часа.`}</div>`;
      }
    }, 1000);
  },

  // Разломы вокруг: все открытые в этот час Разломы до Rules.FAR.R от игрока
  async list() {
    Sfx.init(); Sfx.play('tap');
    if (S.d.level < RAID_LEVEL) { UI.toast(ru`Разломы открываются с ${RAID_LEVEL} уровня Ловчего`); return; } // 4.18
    const scr = UI.screen(ru`Разломы вокруг`, `<div class="rift-list"><div class="q-note">${ru`Ищу Разломы у Капищ вокруг…`}</div></div>`, 'rifts-screen');
    const box = scr.querySelector('.rift-list'), pos = MapView.pos;
    if (!pos) { box.innerHTML = `<div class="q-note">${ru`Жду, когда найдётся твоё место на карте…`}</div>`; return; }
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
      box.innerHTML = `<div class="shop-wallet"><span class="zlat">${Art.item('farpass')} ${ru`Пропусков: ${passes}`}</span><span>${ru`новые через ${`<b class="rl-left">${left()}</b>`}`}</span></div>
        <div class="chips rift-tiers">${[0, 1, 2, 3].map(t => `<button class="chip ${tier === t ? 'on' : ''}" data-t="${t}">${t ? '★'.repeat(t) : ru`Все`} <small>${rifts.filter(r => (!t || r.tier === t) && !r.done).length}</small></button>`).join('')}</div>
        ${shown.length ? shown.slice(0, 40).map(({ r, i }) => `<button class="rift-row t${r.tier} ${r.done ? 'done' : ''}" data-i="${i}">
          <div class="rr-boss">${Art.spirit(r.boss)}</div>
          <div class="row-main"><b>${SP[r.boss].name} <span class="stars">${'★'.repeat(r.tier)}</span></b><small>${U.esc(r.place || MYTH_PLACES[r.myth || 'slavic'].shrine)}</small></div>
          <div class="rr-d">${r.done ? `✓ ${ru`закрыт`}` : r.d <= W.BATTLE_R ? ru`рядом` : U.fmtDist(r.d)}</div></button>`).join('')
          : `<div class="q-note">${ru`Сейчас вокруг нет открытых Разломов. Новые открываются в начале каждого часа.`}</div>`}
        ${more ? `<div class="q-note">${ru`…и ещё ${more} дальше`}</div>` : ''}
        <div class="q-note">${ru`Разломы открываются у Капищ каждый час. Подойди к Капищу на 100 м — или закрой Разлом издалека (до 5 км) по Дальнему пропуску.`}</div>`;
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
          <button class="raid-special"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="bg"/><circle cx="50" cy="50" r="44" class="fill"/></svg><span>${ru`Приём`}</span></button>
          <button class="raid-dodge">${ru`Уклон`}</button>
        </div>
        <div class="raid-hint">${ru`Тапай по экрану — атака.<br>Когда босс замахивается (!) — жми «Уклон» или смахни в сторону.`}</div>
        <div class="raid-count">3</div>
      </div>`);
    document.body.appendChild(root);
    Music.play('map'); // 4.8.1: в боях — та же мелодия карты
    const $ = sel => root.querySelector(sel);
    const st = this.st = {
      r, s, bs, root, $, bossHp: bs.hp, time: 90, energy: 0, cool: 0, idx: 0, coop: coop || null, ko: false,
      team: team.map(sp => { const x = S.battle(sp); return { sp, ...x, max: x.hp * 5, lim: Math.round(x.hp * 5 * S.hpCap(sp)), cur: Math.max(1, Math.round(x.hp * 5 * S.hpNow(sp))) }; }), // 4.15: с тем здоровьем, что есть; 4.16: lim — предел усталого
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
      $('.raid-count').textContent = ru`В бой!`;
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
    st.$('.raid-mname').innerHTML = `${Art.elIcon(SP[m.sp.sid].el, 16)} ${U.esc(m.sp.nick || SP[m.sp.sid].name)} <small>${ru`СИЛА ${m.power}`}</small>`;
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
    if (st.waters >= 3) { UI.toast(ru`За бой можно выпить не больше 3 флаконов`); return; }
    if (m.cur >= m.lim) { UI.toast(m.lim < m.max ? ru`Дух устал — выше не поднять, нужен отдых` : ru`Дух и так полон сил`); return; }
    if (!(S.d.items.water > 0)) { UI.toast(ru`Живой воды нет`); return; }
    st.drinking = true;
    const ok = await Game.try('water');
    st.drinking = false;
    if (!ok || this.st !== st || st.over) return;
    st.waters++;
    m.cur = Math.min(m.lim, m.cur + m.max / 2);
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
    let n = this.dmg(st.bs.atk, m.def, st.bs.pw, st.s.el, SP[m.sp.sid].el);
    const dodged = st.dodgeT > 0;
    if (dodged) n = Math.max(1, Math.floor(n * 0.2));
    m.cur = Math.max(0, m.cur - n);
    const me = st.$('.raid-me').getBoundingClientRect();
    this.float(dodged ? ru`Уклон! −${n}` : `−${n}`, me.left + me.width / 2, me.top + 10, dodged ? 'dodged' : 'hurt');
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
          st.root.appendChild(U.el(`<div class="raid-ko">${ru`Твои духи без сил.<br>Союзники ещё сражаются!`}</div>`));
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
    try { r = await Game.act('raidEnd', { win: !!win, hp: S.hpReport(st.team) }); } catch (e) { if (win) UI.toast(U.esc(e.message)); }
    if (this.st !== st) return;
    if (win && r && r.win) {
      Sfx.play('win'); U.vibrate([50, 50, 50, 50, 120]);
      const rw = r.rw, charms = r.charms, bonus = r.bonus, allies = r.allies;
      const res = U.el(`<div class="raid-result"><div class="res-card">
        <div class="res-title">${ru`Разлом закрыт!`}</div>
        <div class="res-art">${Art.spirit(st.s.id)}</div>
        <div class="res-rw">${rw.map(x => `<div><b>+${U.fmtNum(x.n)}</b> ${I18N.back(x.label)}</div>`).join('')}</div>
        <div class="res-note">${ru`Ослабленный ${st.s.name} остался в нашем мире. У тебя <b>${charms}</b> оберегов разлома${bonus ? ru` (+${bonus} за скорость)` : ''}${allies ? ru` (+${allies * 2} за союзников)` : ''}.`}</div>
        <button class="btn primary wide">${ru`Ловить!`}</button></div></div>`);
      res.querySelector('button').onclick = () => {
        this.close();
        Encounter.start({ mode: 'raid', seed: st.r.id });
      };
      st.root.appendChild(res);
    } else if (win) {
      // сервер не засчитал победу (нет связи или неправдоподобный бой)
      const res = U.el(`<div class="raid-result"><div class="res-card"><div class="res-title lose">${ru`Победа не засчитана`}</div>
        <div class="res-note">${ru`Сервер не подтвердил этот бой. Проверь интернет и попробуй снова — разлом открыт до конца часа.`}</div>
        <button class="btn wide">${ru`На карту`}</button></div></div>`);
      res.querySelector('button').onclick = () => this.close();
      st.root.appendChild(res);
    } else {
      Sfx.play('lose');
      const res = U.el(`<div class="raid-result"><div class="res-card">
        <div class="res-title lose">${ru`Разлом устоял`}</div>
        <div class="res-art dim">${Art.spirit(st.s.id)}</div>
        <div class="res-note">${ru`Осталось сил у босса: ${Math.round(st.bossHp / st.bs.hp * 100)}%. Усиль духов, возьми стихию-противника и попробуй снова — разлом открыт до конца часа.`}</div>
        <button class="btn wide">${ru`На карту`}</button></div></div>`);
      res.querySelector('button').onclick = () => this.close();
      st.root.appendChild(res);
    }
    UI.refreshHud();
  },
  quit() {
    const st = this.st; if (!st) return;
    if (st.over) return this.close();
    UI.confirm(ru`Покинуть битву?`, ru`Прогресс боя будет потерян.`, ru`Покинуть`, () => this.close(), ru`Остаться`, true); // 4.25: потеря боя — красной кнопкой
  },
  close() {
    const st = this.st; if (!st) return;
    if (!st.over) Game.act('raidEnd', { win: false, hp: S.hpReport(st.team) }).catch(() => {}); // вышел из боя
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
  // 4.16: прислужник Нави — pow: сила его омрачённых духов от силы духов игрока (W.grunt), темп ударов 0,52 (был 0,75,
  // вторжения выигрывались 99 из 100); ориентир — ~70% побед
  FOE: { invasion: { speed: 0.52, shield: 0.5, pow: 1.2 }, spar: { speed: 0.72, shield: 0.6 } },

  shieldSvg: '<svg viewBox="0 0 24 24" class="shd"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="#5eead4" stroke="#0f766e" stroke-width="1.5"/></svg>',

  open(e) {
    // 4.16: вольное Капище кланы не держат; защитники, чей срок вышел, ушли; уставшие — слабее (Rules.HOLD)
    const free = Rules.shrineFree(e.id), now = U.now();
    const holders0 = !free && Clans.info(e.id) ? Clans.info(e.id).holders.filter(h => h.sp && SP[h.sp.sid] && Rules.holdFresh(h, now)) : [];
    const hold = holders0.length ? Clans.info(e.id) : null, mine = !!(hold && S.d.clan && hold.clan === S.d.clan);
    const g = W.guardian(e), T = SHRINE_TIERS[e.tier], mul = Ev.duelMul();
    let team = S.team();
    const holders = holders0.map(h => ({ ...h, sp: Rules.holdSpirit(h.sp, h.t, now) }));
    const who = hold
      ? `<div class="guard"><div class="guard-ava clan" style="--cc:${CLANS[hold.clan].color}">${Art.guardian(CLANS[hold.clan].color)}</div><div><b>${CLANS[hold.clan].name}</b><small>${hold.since && !isNaN(new Date(hold.since)) ? ru`держит Капище с ${new Date(hold.since).toLocaleDateString(I18N.locale)} · защитников: ${holders.length} из ${HOLD_MAX}` : ru`держит Капище · защитников: ${holders.length} из ${HOLD_MAX}`}</small></div></div>
         <div class="rift-team-title">${ru`Защитники`}</div>
         <div class="holders">${holders.map(h => `<div class="mini">${Art.imgOf(h.sp)}<b>${S.power(h.sp)}</b><small>${U.esc(h.name || ru`Ловчий`)}</small></div>`).join('')}</div>`
      : `<div class="guard"><div class="guard-ava">${Art.guardian(g.color)}</div><div><b>${g.name}</b><small>${ru`Хранитель · ${g.title}`}</small></div></div>
         <div class="rift-team-title">${ru`Духи хранителя`}</div>
         <div class="lg2-team tm-row">${UI.teamCards(g.team, true)}</div>`;
    const canClan = !S.d.clan && S.d.level >= CLAN_LEVEL;
    let action;
    if (mine) action = `<div class="rift-tip">${ru`Капище держит твой клан. Поставь сюда своего защитника — и получай дань каждый день.`}</div>
        <button class="btn primary wide defend-go" ${holders.length >= HOLD_MAX ? 'disabled' : ''}>${ru`Поставить защитника`}</button>`;
    else if (e.won) action = `<div class="rift-done">${ru`Сегодня ты уже победил здесь.`}${S.d.clan ? '' : ` ${ru`Завтра будет новый бой.`}`}</div>
        ${S.d.clan && !hold && !free ? `<button class="btn primary wide defend-go">${ru`Поставить защитника`}</button>` : ''}`;
    else action = `
        <div class="rift-team-title">${ru`Твоя команда`} <button class="btn small ghost team-edit">${ru`Изменить`}</button></div>
        <div class="lg2-team tm-row tm-my">${UI.teamCards(team)}</div>
        <div class="rift-tip">${hold ? `${ru`Победа освободит Капище от защитников.`} ` : ''}${ru`Награда: ${U.fmtNum(T.xp * mul)} опыта, ✦ ${U.fmtNum(T.sparks * mul)} и предметы`}${mul > 1 ? ` ${ru`(Неделя поединков ×2)`}` : ''}</div>
        <button class="btn primary wide duel-go" ${team.length ? '' : 'disabled'}>${ru`Бросить вызов`}</button>${Rules.dayLine(S.d, 'duels', ru`Побед на Капищах`)}`;
    const html = `
      <div class="shrine-view t${e.tier}">
        ${Poi.photoUrl(e.photo) ? `<div class="place-photo" style="background-image:url('${Poi.photoUrl(e.photo)}')"></div>` : `<div class="shrine-idol">${Art.shrineIcon(e.tier, e.won, e.myth)}</div>`}
        <div class="rift-title">${U.esc(e.name)} <span class="stars">${'★'.repeat(e.tier)}</span></div>
        <div class="rift-meta">${MYTH_PLACES[e.myth || 'slavic'].shrineOf(e.god)}${hold ? ' · ' + Clans.badge(hold.clan, true) : ''}${free ? ' · ' + ru`вольное: кланы его не держат` : ''}</div>
        <div class="q-note place-desc">${MYTH_PLACES[e.myth || 'slavic'].shrineDesc}</div>
        ${!free && S.d.clan && (e.myth || 'slavic') === S.d.clan ? `<div class="rift-tip own-myth" style="--cc:${CLANS[S.d.clan].color}">${ru`Святилище мифологии твоего клана: защитник здесь приносит дань ${Clans.mythX()}.`}</div>` : ''}
        ${who}
        ${action}
        ${canClan ? `<button class="btn ghost wide clan-go">${ru`Выбрать клан`}</button>` : ''}
      </div>`;
    const scr = UI.screen(MYTH_PLACES[e.myth || 'slavic'].shrine, html, 'shrine-screen'); // 4.28: своё у каждой мифологии
    const go = scr.querySelector('.duel-go');
    if (go) go.onclick = async () => {
      if (this.st || this._starting) return;
      this._starting = true;
      const r = await Game.try('duelStart', { shrine: { id: e.id, lat: e.lat, lng: e.lng, name: e.name } });
      this._starting = false;
      if (!r) return;
      UI.closeScreen(scr);
      // защитники клана — вместо хранителя
      const foe = r.foe ? { name: CLANS[r.clan].name, color: CLANS[r.clan].color, title: ru`Защитники Капища`, team: r.foe } : g;
      // 4.16: темп хранителя — свой (W.foeSpeed), у защитников клана — обычный для ступени
      this.start({ ...e, kind: 'shrine', held: r.clan || null, T: r.foe ? T : { ...T, speed: g.speed } }, foe, S.team());
    };
    const def = scr.querySelector('.defend-go');
    if (def) def.onclick = () => Clans.defend(e, () => { UI.closeScreen(scr); this.open(W.shrineFor(e, e.d)); });
    const cg = scr.querySelector('.clan-go');
    if (cg) cg.onclick = () => Clans.choose(() => { UI.closeScreen(scr); this.open(W.shrineFor(e, e.d)); });
    // 5.1.5: «Изменить», карточка духа и пустое место — выбор команды
    scr.addEventListener('click', ev => {
      if (!ev.target.closest('.team-edit, .team-slot')) return;
      UI.pickTeam(() => {
        team = S.team();
        const box = scr.querySelector('.tm-my'); if (box) box.innerHTML = UI.teamCards(team);
        const b = scr.querySelector('.duel-go'); if (b) b.disabled = !team.length;
      });
    });
    Clans.refresh(); // сводка могла устареть
  },

  // Захваченный источник: поединок с прислужником Нави
  openInvasion(e) {
    // 4.15.1: в композиции карточки духа — сверху захваченный источник в тёмном круге Нави, справа «Захвачен Навью»,
    // сила отряда, прислужник и слабость отряда; ниже — омрачённые духи против твоей команды, внизу — «Сразиться»
    const g = W.grunt(e);
    const pw = t => t.reduce((a, x) => a + S.power(x), 0);
    const weak = ELEMENT_KEYS.filter(x => ELEMENTS[x].beats.includes(g.el));
    const scr = UI.screen(ru`Вторжение Нави`, `
      <div class="det det2 inv2 el-${g.el}">
        <div class="dt-hero">
          <div class="det-art inv2-art"><i class="inv2-mist"></i>${Art.springIcon(false, true)}</div>
          <div class="dt-info">
            <div class="det-hp inv2-place">${ru`Источник «${U.esc(e.name)}»`}</div>
            <div class="inv2-title">${ru`Захвачен Навью`}</div>
            <div class="det-power"><small>${ru`СИЛА ОТРЯДА`}</small><b>${U.fmtNum(pw(g.team))}</b></div>
            <div class="inv2-grunt"><span class="inv2-ava">${Art.guardian(g.color)}</span><span><b>${g.name}</b><small>${g.title}</small></span></div>
          </div>
        </div>
        <div class="inv2-quote">«${g.quote}»</div>
        <div class="dt-panel inv2-body"></div>
        <div class="inv2-foot"></div>
      </div>`, 'invasion-screen det-screen');
    const body = scr.querySelector('.inv2-body'), foot = scr.querySelector('.inv2-foot');
    const render = () => {
      const team = S.team(), ko = team.some(x => !S.alive(x)), mine = pw(team);
      const slots = UI.teamCards(team); // 5.1.5: три карточки в ряд, пустые места — «+ Выбрать духа»
      body.innerHTML = `
        <div class="pf-mh lg2-th"><span>${ru`Омрачённые духи`}</span><em class="inv2-weak">${ru`слабость`}${weak.map(x => `<i>${Art.elIcon(x, 15)} ${ELEMENTS[x].name}</i>`).join('')}</em></div>
        <div class="lg2-team">${UI.teamCards(g.team, 'inv2-dark')}</div>
        <div class="inv2-vs"><i></i><b>${mine >= pw(g.team) ? ru`силы на твоей стороне` : ru`отряд сильнее — бей в слабость`}</b><i></i></div>
        <div class="pf-mh lg2-th"><span>${ru`Твоя команда`}</span>${mine ? `<b>${ru`сила ${U.fmtNum(mine)}`}</b>` : ''}<button class="lg2-edit team-edit">${ru`Изменить`}</button></div>
        <div class="lg2-team">${slots}</div>`;
      foot.innerHTML = `
        <div class="lg2-rule">${ru`Победа освободит источник и позволит спасти одного из омрачённых духов.`}</div>
        ${Rules.dayLine(S.d, 'invasions', ru`Вторжений отбито`)}
        <button class="btn primary wide duel-go" ${team.length && !ko ? '' : 'disabled'}>${ko ? ru`В команде дух без сил` : team.length ? ru`Сразиться` : ru`Нужна команда`}</button>`;
    };
    render();
    scr.addEventListener('click', async e2 => {
      if (e2.target.closest('.team-edit, .team-slot')) { UI.pickTeam(() => { if (scr.isConnected) render(); }); return; }
      if (!e2.target.closest('.duel-go')) return;
      if (!await this.begin('invStart', { spring: { id: e.id, lat: e.lat, lng: e.lng, name: e.name } })) return;
      UI.closeScreen(scr);
      this.start({ ...e, kind: 'invasion', tier: 1, T: { ...this.FOE.invasion, speed: g.speed } }, g, S.team());
    });
  },

  // Поединок с другом: его сильнейшие духи под управлением игры (команду присылает сервер)
  openSpar(f, top) {
    let team = S.team();
    const today = f.spar === U.today();
    const html = `
      <div class="shrine-view spar">
        <div class="guard"><div class="guard-ava">${Art.avatar(f.look || undefined)}</div><div><b>${U.esc(f.name)}</b><small>${ru`Дружеский поединок`}</small></div></div>
        <div class="rift-team-title">${ru`Сильнейшие духи друга`}</div>
        <div class="lg2-team tm-row">${UI.teamCards(top, true)}</div>
        <div class="rift-team-title">${ru`Твоя команда`} <button class="btn small ghost team-edit">${ru`Изменить`}</button></div>
        <div class="lg2-team tm-row tm-my">${UI.teamCards(team)}</div>
        <div class="rift-tip">${today ? ru`Награда за сегодня уже получена — сейчас это тренировка (+100 опыта за победу).` : ru`Награда за первую победу за день: 800 опыта, ✦ 500, обереги и мёд, +1 ★ дружбы.`}</div>
        <button class="btn primary wide duel-go" ${team.length ? '' : 'disabled'}>${ru`Сразиться`}</button>
      </div>`;
    const scr = UI.screen(ru`Поединок с другом`, html, 'shrine-screen');
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
    scr.addEventListener('click', ev => { // 5.1.5: «Изменить», карточка духа и пустое место — выбор команды
      if (!ev.target.closest('.team-edit, .team-slot')) return;
      UI.pickTeam(() => {
        team = S.team();
        scr.querySelector('.tm-my').innerHTML = UI.teamCards(team);
        scr.querySelector('.duel-go').disabled = !team.length;
      });
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
  endType(kind) { return kind === 'invasion' ? 'invEnd' : kind === 'spar' ? 'sparEnd' : 'duelEnd'; },

  // 4.15: боец выходит с тем здоровьем, что есть у духа (раны общие на всю игру); в поединке с другом — с полным
  fighter(sp, full) {
    const x = S.battle(sp), max = x.hp * this.HPX;
    return { sp, atk: x.atk, def: x.def, max, cur: Math.max(1, Math.round(max * (full ? 1 : S.hpNow(sp)))), energy: 0, emul: x.energy, el: SP[sp.sid].el, power: x.power };
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
          <button class="duel-switch"><span>${ru`Смена`}</span><em></em></button>
          <button class="duel-special2 hidden"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="bg"/><circle cx="50" cy="50" r="44" class="fill"/></svg><span></span></button>
          <button class="raid-special"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="bg"/><circle cx="50" cy="50" r="44" class="fill"/></svg><span>${ru`Приём`}</span></button>
          <div class="duel-energy"></div>
        </div>
        <div class="raid-hint">${ru`Тапай — быстрая атака, она копит энергию.<br>Полная шкала — жми «Приём». Щиты берегут от приёмов хранителя.`}</div>
        <div class="duel-ov hidden"></div>
        <div class="raid-count">3</div>
      </div>`);
    document.body.appendChild(root);
    Music.play('map'); // 4.8.1: в боях — та же мелодия карты
    const $ = s => root.querySelector(s);
    const st = this.st = {
      e, g, T: e.T || SHRINE_TIERS[e.tier], root, $, time: this.TIME, paused: true, over: false,
      me: { team: team.map(sp => this.fighter(sp, e.kind === 'spar')), idx: 0, shields: 2, busy: 0, cd: 0 },
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
      $('.raid-count').textContent = ru`Бой!`;
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
    const label = `${Art.elIcon(f.el, 16)} ${U.esc(f.sp.nick || SP[f.sp.sid].name)} <small>${ru`СИЛА ${f.power}`}</small>`;
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
    if (m.energy < mv.cost) { UI.toast(ru`Мало энергии — атакуй тапами`); return; }
    m.energy -= mv.cost;
    st.paused = true;
    Sfx.play('special');
    const col = ELEMENTS[m.el].color;
    const ov = this.overlay(`<div class="charge-mini"><div class="charge-title">${ELEMENTS[m.el][kind]}</div><button class="charge-orb" style="--c:${col}"><span>${ru`Тапай!`}</span></button><div class="pbar"><i></i></div></div>`);
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
      this.hit('foe', ru`Щит!`, 'dodged');
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
        <button class="btn primary sh-yes" ${has ? '' : 'disabled'}>${this.shieldSvg} ${ru`Щит (${st.me.shields})`}</button>
        <button class="btn sh-no">${ru`Принять удар`}</button>
      </div></div>`);
    let done = false;
    const resolve = useShield => {
      if (done || this.st !== st) return;
      done = true;
      this.closeOverlay();
      const m = this.cur('me');
      let n;
      if (useShield && st.me.shields > 0) { st.me.shields--; n = 1; this.hit('me', ru`Щит!`, 'dodged'); Sfx.play('hit'); }
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
        UI.toast(ru`${st.g.name} призывает: ${SP[this.cur('foe').sp.sid].name}`);
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
    if (!forced && st.me.cd > 0) { UI.toast(ru`Смена будет доступна через ${Math.ceil(st.me.cd)} с`); return; }
    const opts = st.me.team.map((f, i) => ({ f, i })).filter(x => x.f.cur > 0 && x.i !== st.me.idx);
    if (!opts.length) { if (!forced) UI.toast(ru`Некого выпустить`); return; }
    st.paused = true;
    const ov = this.overlay(`<div class="switch-q"><div class="charge-title">${forced ? ru`Дух без сил! Кого выпустить?` : ru`Сменить духа`}</div>
      <div class="rift-team">${opts.map(x => `<button class="mini" data-i="${x.i}">${Art.of(x.f.sp)}<b>${Math.round(x.f.cur / x.f.max * 100)}%</b></button>`).join('')}</div>
      ${forced ? '' : `<button class="btn ghost sw-cancel">${ru`Отмена`}</button>`}</div>`);
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
    // итог боя проверяет сервер: победа засчитывается, если команда могла нанести столько урона за это время
    let r = null;
    try { r = await Game.act(this.endType(st.e.kind), { win: !!win, hp: S.hpReport(st.me.team) }); } catch (e) { if (win) UI.toast(U.esc(e.message)); }
    if (this.st !== st) return;
    if (win && !(r && r.win)) {
      html = `<div class="res-title lose">${ru`Победа не засчитана`}</div>
        <div class="res-note">${ru`Сервер не подтвердил этот бой. Проверь интернет и попробуй снова.`}</div>`;
      const res = U.el(`<div class="raid-result"><div class="res-card">${html}<button class="btn wide">${ru`На карту`}</button></div></div>`);
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
        ? (r.freed ? ru`Защитники «${CLANS[r.clan].name}» отступили — Капище «${U.esc(st.e.name)}» свободно!` : ru`Победа засчитана, но пока шёл бой, на Капище сменились защитники.`)
        : ru`«Достойно, Ловчий», — ${st.g.name} склоняет голову. Капище «${U.esc(st.e.name)}» освящено тобой до конца дня.`;
      const canDefend = S.d.clan && (!r.clan || r.freed);
      html = `<div class="res-title">${ru`Победа!`}</div>
        <div class="res-art"><div class="guard-ava big">${Art.guardian(st.g.color)}</div></div>
        <div class="res-note">${note}${canDefend ? ` ${ru`Поставь своего защитника — и Капище перейдёт твоему клану.`}` : ''}</div>
        <div class="res-rw">${rw.map(x => `<div><b>+${U.fmtNum(x.n)}</b> ${I18N.back(x.label)}</div>`).join('')}</div>
        ${canDefend ? `<button class="btn primary wide defend-now">${ru`Поставить защитника`}</button>` : ''}`;
      if (r.clan) Clans.refresh(true);
    } else {
      Sfx.play('lose');
      html = `<div class="res-title lose">${ru`Поражение`}</div>
        <div class="res-art"><div class="guard-ava big">${Art.guardian(st.g.color)}</div></div>
        <div class="res-note">${ru`«Приходи, когда окрепнешь», — говорит ${st.g.name}. Попробуй другую команду: смотри на стихии хранителя и береги щиты для его приёмов.`}</div>`;
    }
    const res = U.el(`<div class="raid-result"><div class="res-card">${html}<button class="btn ${html.includes('defend-now') ? 'ghost' : 'primary'} wide to-map">${ru`На карту`}</button></div></div>`);
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
      html = `<div class="res-title">${ru`Победа!`}</div>
        <div class="res-art"><div class="guard-ava big">${Art.guardian(g.color)}</div></div>
        <div class="res-note">${r.practice ? ru`Хорошая тренировка! Награда за поединок с ${g.name} сегодня уже получена.` : ru`${g.name} жмёт тебе руку: «Честный бой!» Дружба крепнет.`}</div>
        <div class="res-rw">${r.rw.map(x => `<div><b>+${U.fmtNum(x.n)}</b> ${I18N.back(x.label)}</div>`).join('')}${r.practice ? '' : `<div>${ru`<b>+1 ★</b> дружбы`}</div>`}</div>`;
    } else {
      Sfx.play('lose');
      html = `<div class="res-title lose">${ru`Поражение`}</div>
        <div class="res-art"><div class="guard-ava big">${Art.guardian(g.color)}</div></div>
        <div class="res-note">${ru`Духи ${g.name} оказались сильнее. Подбери команду против их стихий и попробуй снова — поединки с другом не ограничены.`}</div>`;
    }
    const res = U.el(`<div class="raid-result"><div class="res-card">${html}<button class="btn primary wide">${ru`Готово`}</button></div></div>`);
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
      html = `<div class="res-title">${ru`Источник освобождён!`}</div>
        <div class="res-art">${Art.of(rescue)}</div>
        <div class="res-note">${ru`Прислужник растворился в тумане. Один из его духов — омрачённый ${SP[rescue.sid].name} — остался рядом. Его ещё можно спасти!`}</div>
        <div class="res-rw">${rw.map(x => `<div><b>+${U.fmtNum(x.n)}</b> ${I18N.back(x.label)}</div>`).join('')}</div>
        <button class="btn primary wide rescue">${ru`Спасти духа`}</button>`;
    } else {
      Sfx.play('lose');
      html = `<div class="res-title lose">${ru`Навь сильнее… пока`}</div>
        <div class="res-art"><div class="guard-ava big dark">${Art.guardian(g.color)}</div></div>
        <div class="res-note">${ru`«${GRUNT_QUOTES[0]}» — смеётся прислужник. Возьми духов, сильных против стихии «${ELEMENTS[g.el].name}», и возвращайся.`}</div>`;
    }
    const res = U.el(`<div class="raid-result"><div class="res-card">${html}<button class="btn wide to-map">${ru`На карту`}</button></div></div>`);
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
    UI.confirm(ru`Сдаться?`, ru`Поединок будет проигран.`, ru`Сдаться`, () => this.close(), ru`Продолжить`, true); // 4.25: сдаться — красной кнопкой
  },
  close() {
    const st = this.st; if (!st) return;
    // сдался или вышел до конца боя — это поражение
    if (!st.over) {
      Game.act(this.endType(st.e.kind), { win: false, board: true, hp: S.hpReport(st.me.team) }).catch(() => {});
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
  QUEST_BONUS: { charm: 10, honey: 2, sparks: 500 }, // 4.16: без ладана (был каждый день — копился десятками) и меньше искр
  // 4.16: опыт за задание дня и за сундук дня (было 300 и 1000) — ежедневные цели заметнее для тех, кто играет понемногу
  QUEST_XP: 500, QUEST_BONUS_XP: 2500,
  PLACE_REWARD: { xp: 1000, sparks: 500, charm: 10 },
  SUPPLY: { charm: 15, honey: 2, water: 1 },
  THROWABLE: ['charm', 'charm2', 'charm3'],
  COUNTDOWN: 3.2, // секунды обратного отсчёта перед боем

  // Серия дней: награда за первый вход в игру за день, по кругу из 7 дней
  STREAK: [
    { charm: 5, xp: 200 },
    { honey: 2, xp: 300 },
    { charm: 8, herb: 2, xp: 400 },
    { charm2: 3, gift: 1, xp: 500 },
    { incense: 1, honey: 1, xp: 600 },
    { charm2: 5, brew: 1, xp: 800 },
    { charm3: 3, sparks: 1000, gate: 1, xp: 1500 }, // 7-й день — ещё и кокон 10 км; 5.1: и Врата Перепутицы
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
  /* 4.28: общий Алатырь. Каждый осколок Алатыря, найденный любым Ловчим (S.alatyrDrop), идёт ещё и в общий счёт Ордена
     (осколок остаётся у Ловчего). Собрана грань — дорога в её мир распутана: HOURS часов духи этой мифологии встречаются
     в MUL раз чаще (Ev.mythMul). Начало — с полного часа, не раньше чем через LEAD минут после вехи: телефоны и сервер
     успевают узнать о ней заранее и отбирают духов одинаково.
     Сезоны: в сезоне s камень — BASE + s граней, по одной на каждую открытую мифологию: семь первых (ORDER), дальше — мифологии
     сезонов 2…s, новая — последней гранью (alaFaces). Грань k сезона s стоит (FIRST + STEP × k) × SEASON^(s − 1) осколков,
     считая от счёта на начало сезона (start в базе). Собраны все грани — финал: с полного часа (как дорога) FINALE.DAYS дней во
     всех Разломах мира Кощей; Орден одолел его FINALE.GOAL раз — он раскалывает камень раньше (с ближайшего полного часа), нет —
     в конце финала всё равно. Раскол — начало сезона s + 1: открывается его мифология («?» на экране камня) и сезон Лиги.
     Грань мифологии, которой ещё нет в игре (файл не вышел), не закрывается — ждёт обновления.
     Номер грани n — сквозной по сезонам (alaBase): у первого сезона 0…6, как у граней 4.28 до сезонов.
     Калибровка: десятки–сотни Ловчих по 0,3–1 осколку в день — ~15–50 осколков в день на весь Орден: первая грань за 1–3 дня,
     первый сезон (490) — за 10–30 дней, второй (8 граней, 720) — за 2–7 недель, третий (9 граней, ~1040) — за 3–10 недель.
     Финал: у десятков Ловчих ~1–2 победы над Кощеем в день у каждого (великий разлом, совместно проще) — GOAL за 3–7 дней,
     у сотен — за день-два. KILL — сколько очков вклада сезона даёт победа над Кощеем (осколок — одно)
     5.x: цена грани растёт с числом активных Ловчих: базовая цена (alaGoal) × (1 + PER × N), N — Ловчие уровня LEVEL+, игравшие
     за последние DAYS дней; не дороже CAP × цены предыдущей грани (сквозной номер n − 1, и через границу сезона), не дешевле
     базовой. Цена фиксируется, когда грань открывается (собрана предыдущая или начался сезон): её записывает сервер в базу
     (033_alatyr_goals.sql, первый записавший побеждает), телефон получает цены граней от сервера (Ev.ala.goals) — оба считают
     камень по ним (alaStage с G = { goals, N }). Грани без записанной цены: старше первой записанной — по базовой цене (собраны
     до 5.x), дальше — ориентир по нынешнему множителю */
  ALATYR_WORLD: { ORDER: ['slavic', 'greek', 'norse', 'celtic', 'egypt', 'china', 'aztec'], BASE: 6, FIRST: 40, STEP: 10, SEASON: 1.2, MUL: 2, HOURS: 72, LEAD: 10,
    FINALE: { GOAL: 300, DAYS: 7, KILL: 3 }, GOALS: { LEVEL: 20, DAYS: 14, PER: 0.1, CAP: 2 } },
  // множитель Ордена при N активных Ловчих
  alaMul(N) { return Math.round((1 + Math.max(0, Math.floor(+N) || 0) * this.ALATYR_WORLD.GOALS.PER) * 1000) / 1000; },
  // цена грани n (сквозной номер), если она открывается сейчас: N активных Ловчих, prev — цена грани n − 1 (0 — без ограничения)
  alaPriceNew(n, N, prev) {
    const f = this.alaFace(n), b = this.alaGoal(f.s, f.k);
    let p = Math.round(b * this.alaMul(N));
    if (+prev > 0) p = Math.min(p, Math.round(+prev * this.ALATYR_WORLD.GOALS.CAP));
    return Math.max(b, p);
  },
  // цены граней 0…n: { p, kind } — kind: fixed (записана в базе), old (старше первой записанной — базовая), est (ориентир)
  alaPrices(n, G) {
    const goals = (G && G.goals) || {}, N = (G && G.N) || 0, out = [];
    const keys = Object.keys(goals).map(Number).filter(x => +goals[x] > 0), low = keys.length ? Math.min(...keys) : Infinity;
    let prev = 0;
    for (let i = 0; i <= n; i++) {
      let p, kind;
      if (+goals[i] > 0) { p = +goals[i]; kind = 'fixed'; }
      else if (i < low) { const f = this.alaFace(i); p = keys.length ? this.alaGoal(f.s, f.k) : this.alaPriceNew(i, N, prev); kind = keys.length ? 'old' : 'est'; }
      else { p = this.alaPriceNew(i, N, prev); kind = 'est'; }
      out.push({ p, kind }); prev = p;
    }
    return out;
  },
  // какую грань пора зафиксировать (сервер): первая грань сезона без записанной цены, до которой дошёл счёт, иначе −1.
  // Цен ещё нет совсем (первый запуск 5.x) — фиксируется та, что собирается сейчас (собранные до неё — по базовой цене)
  alaNextFix(s, have, G) {
    const goals = (G && G.goals) || {}, fresh = !Object.keys(goals).some(k => +goals[k] > 0);
    const st = this.alaStage(s, have, fresh ? { goals: {}, N: 0 } : G), t = st.total;
    let from = 0;
    for (let k = 0; k < st.K; k++) {
      const p = st.prices[k];
      if (p.kind === 'est' && !(fresh && t >= from + p.p && st.faces[k])) return st.base + k;
      if (!st.faces[k] || t < from + p.p) return -1;
      from += p.p;
    }
    return -1;
  },
  // сколько граней в сезоне s
  alaK(s) { return this.ALATYR_WORLD.BASE + Math.max(1, Math.floor(+s) || 1); },
  // мифологии граней сезона s по порядку; null — мифологии этого сезона ещё нет в игре
  alaFaces(s) {
    s = Math.max(1, Math.floor(+s) || 1);
    const out = this.ALATYR_WORLD.ORDER.slice(0, this.alaK(1));
    for (let j = 2; j <= s; j++) out.push(typeof mythOfSeason === 'function' ? mythOfSeason(j) : null);
    return out.slice(0, this.alaK(s));
  },
  // цена грани k сезона s
  alaGoal(s, k) {
    const A = this.ALATYR_WORLD;
    return Math.max(1, Math.round((A.FIRST + A.STEP * k) * Math.pow(A.SEASON, Math.max(1, Math.floor(+s) || 1) - 1)));
  },
  // весь камень сезона s (G — зафиксированные цены и N, см. alaPrices; нет — базовые цены)
  alaCost(s, G) { return this.alaSeasonPrices(s, G).reduce((a, x) => a + x.p, 0); },
  alaSeasonPrices(s, G) { const b = this.alaBase(s); return this.alaPrices(b + this.alaK(s) - 1, G).slice(b); },
  // сквозной номер первой грани сезона s и обратно: грань n → { s, k }
  alaBase(s) { s = Math.max(1, Math.floor(+s) || 1); return this.ALATYR_WORLD.BASE * (s - 1) + s * (s - 1) / 2; },
  alaFace(n) { n = Math.max(0, Math.floor(+n) || 0); let s = 1; while (s < 10000 && this.alaBase(s + 1) <= n) s++; return { s, k: n - this.alaBase(s) }; },
  // мифология и цена грани n (сквозной номер)
  alatyrRoad(n) { const f = this.alaFace(n); return this.alaFaces(f.s)[f.k] || null; },
  alatyrGoal(n) { const f = this.alaFace(n); return this.alaGoal(f.s, f.k); },
  /* где сезон s, если за него собрано have осколков: n — сколько граней собрано, done — все (финал), face — какая собирается,
     myth — её мифология (null — её нет в игре: locked, грань ждёт обновления), from/at — счёт сезона в начале и в конце этой
     грани, have/need — собрано и нужно на ней, base — сквозной номер первой грани сезона.
     5.x: G — { goals: { n: цена }, N } (Ev.ala): цены граней — зафиксированные, прочие — см. alaPrices; prices — цены граней
     сезона { p, kind }, est — цена текущей грани пока ориентир (сервер ещё не записал) */
  alaStage(s, have, G) {
    s = Math.max(1, Math.floor(+s) || 1);
    const K = this.alaK(s), faces = this.alaFaces(s), t = Math.max(0, Math.floor(+have || 0)), P = this.alaSeasonPrices(s, G), g = k => P[k].p;
    let n = 0, from = 0;
    while (n < K && faces[n] && t >= from + g(n)) { from += g(n); n++; }
    const done = n >= K, need = done ? g(K - 1) : g(n), h = done ? need : Math.min(t - from, need);
    return { s, K, faces, n, face: Math.min(n, K - 1), done, myth: done ? null : faces[n], locked: !done && !faces[n], prices: P, est: !done && P[n].kind === 'est',
      from: done ? from - need : from, at: done ? from : from + need, have: h, need, pct: h / need, total: t, base: this.alaBase(s) };
  },
  // очки вклада сезона: осколки и победы над Кощеем в финале (S.d.alaS — { s, n, k })
  alaPoints(a) { return a && typeof a === 'object' ? Math.max(0, Math.floor(+a.n) || 0) + Math.max(0, Math.floor(+a.k) || 0) * this.ALATYR_WORLD.FINALE.KILL : 0; },
  // когда начнётся и кончится событие дороги, если веха взята в момент t (мс): с полного часа, не раньше LEAD минут
  alatyrOpen(t) {
    const A = this.ALATYR_WORLD, from = this.alaHour(t);
    return { from, to: from + A.HOURS * 3600000 };
  },
  // ближайший полный час не раньше чем через LEAD минут после t — с него начинаются дороги, финал и раскол
  alaHour(t) { return Math.ceil((t + this.ALATYR_WORLD.LEAD * 60000) / 3600000) * 3600000; },
  // финал, если последняя грань собрана в момент t: с полного часа на FINALE.DAYS дней
  alaFinale(t) { const from = this.alaHour(t); return { from, to: from + this.ALATYR_WORLD.FINALE.DAYS * 86400000 }; },
  /* ---------- 3.12: монеты, Лавка Ордена, Сезонная тропа ---------- */
  // Монеты — вторая валюта: за серию дней, сундук дня, уровни, дань и Тропу.
  // 4.16: бесплатных монет было 60–80 в день у активного (к 40 уровню — 2–4 тыс. без покупок, Казна не нужна) — теперь ~5–10:
  // серия 1 в день и 10 на 7-й (было 5 и 30), сундук дня 2 (10), уровень 3, каждый пятый — 15 (всегда 20),
  // глава Летописи 15 (50), дань 1 за Капище, но не больше чем с tributeMax Капищ (было 3 за каждое, до 30 в день)
  // 4.16.0: бесплатных монет у активного игрока ~5–6 в день (было ~8 без учёта продаж на аукционе): 7-й день серии 10 → 5, глава Летописи 15 → 10
  ZLAT: { streak: 1, streak7: 5, questBonus: 2, level: 3, level5: 15, story: 10, tribute: 1, tributeMax: 3 },
  BAG_STEP: 50, BAG_MAX_UP: 10,
  // 3.15: Казна — монеты за рубли (оплата через ЮKassa; цену и число монет сервер берёт отсюда, а не с телефона)
  PAY: [
    { id: 'z100',  zlat: 100,  rub: 99 },
    { id: 'z330',  zlat: 330,  rub: 299,  bonus: 10 },
    { id: 'z575',  zlat: 575,  rub: 499,  bonus: 15 },
    { id: 'z1200', zlat: 1200, rub: 999,  bonus: 20, hot: true },
    { id: 'z2600', zlat: 2600, rub: 1990, bonus: 30 },
  ],
  // 3.20: дневные лимиты объектов карты (сутки — по часам игрока). Считаются только успехи: зачерпнутый источник,
  // победа в Разломе, на Капище и во вторжении, пойманный дикий дух. Обычной игре не мешают (20–40 поимок,
  // 10–20 источников в день), а бесконечный фарм и боты упираются в потолок
  DAILY: { springs: 30, raids: 6, duels: 8, invasions: 6, catches: 120 },
  DAILY_NAMES: { springs: ru`Источники`, raids: ru`Разломы`, duels: ru`Капища`, invasions: ru`Вторжения`, catches: ru`Поимки` },
  // 4.16: сколько раз товар Лавки с недельным пределом (week) куплен на этой неделе (неделя — как у событий, Ev.week)
  dayUsed(d, key) { return d && d.dayc && d.dayc.day === U.today() ? (d.dayc[key] || 0) : 0; },
  weekUsed(d, key) { return d && d.weekc && d.weekc.w === Ev.week() ? (d.weekc[key] || 0) : 0; }, // 4.16: за неделю (с понедельника)
  // строка «Источников сегодня: 12 из 30» для окон объектов
  dayLine(d, key, what) { const u = this.dayUsed(d, key), m = this.DAILY[key]; return `<div class="day-left ${u >= m ? 'out' : ''}">${u >= m ? ru`${what} сегодня: <b>${u}</b> из ${m} — завтра снова` : ru`${what} сегодня: <b>${u}</b> из ${m}`}</div>`; },
  // 3.18: Чат Ордена — писать с LEVEL уровня; не чаще раза в GAP мс и PER_DAY сообщений в сутки; до MAX символов
  CHAT: { LEVEL: 3, MAX: 200, GAP: 3000, PER_DAY: 300 },
  CHAT_CHANNELS: [['all', ru`Общий`], ['trade', ru`Торговля`], ['raid', ru`Разломы`], ['help', ru`Помощь`], ['clan', ru`Клан`]],
  // 3.17: Аукцион духов — с LEVEL уровня (4.16: было 5); лот живёт HOURS часов; комиссия FEE с продажи (платит продавец)
  // 4.16: лот живёт 48 ч (было 72), открытых лотов — до 3 (было 5), выставлять — до 10 в день (было 20);
  // залог DEPOSIT от цены (не меньше DEP_MIN) — вернётся при продаже, пропадёт, если лот истечёт или его снимут:
  // так на аукционе меньше залежалых лотов по несбыточной цене. RECENT — за сколько дней смотреть сделки для подсказки цены
  // 4.20: скорость Ловчего — только шагом или бегом. Шаг ≈ 5 км/ч, бег 8–12, быстрый бег до 16; быстрее (самокат, велосипед,
  // машина, метро) — действия на карте на COOL мс замирают, путь не засчитывается. Скорость — средняя за MIN_T…WIN с на MIN_D м и
  // больше (GPS «дрожит» на десятки метров — короткие скачки не в счёт); точки с точностью хуже ACC м не берутся
  // 4.24.1: скорость — по недавним точкам (не старше WIN с): средняя от самой свежей точки, что старше MIN_T с. Пауза COOL
  // снимается, как только Ловчий последние CALM с идёт шагом, бегом или стоит (раньше якорь держался минуту, и после остановки
  // игра ещё до двух минут считала, что он едет). STEP — точки в истории не чаще раза в STEP мс, MAX_PTS — не больше стольких точек
  SPEED: { MAX: 18, /* 5.1.12: джойстик быстрее — предел 65 км/ч (было 4,5 м/с) */ MIN_T: 15, WIN: 60, MIN_D: 60, ACC: 40, COOL: 60000, CALM: 8, STEP: 2000, MAX_PTS: 40 },
  // средняя скорость от a к b (м/с), если её можно честно измерить, иначе null; t — мс
  speedOf(a, b) {
    if (!a || !b) return null;
    const S2 = this.SPEED, dt = (b.t - a.t) / 1000;
    if (dt < S2.MIN_T || dt > S2.WIN * 3) return null;
    const d = U.dist(a.lat, a.lng, b.lat, b.lng);
    return d < S2.MIN_D ? null : d / dt;
  },
  // Новая точка q ({ lat, lng, t }) в счётчике скорости st ({ pts, until, kmh }): until — до какого времени (мс) Ловчий «едет».
  // Общий для телефона и сервера. Возвращает скорость (м/с), если её удалось честно измерить
  paceStep(st, q) {
    const S2 = this.SPEED;
    // точки могут прийти не по порядку (пачка пройденного пути — позже текущей позиции): история всегда по времени
    st.pts = (st.pts || []).filter(p => p && Number.isFinite(p.t));
    if (!st.pts.some(p => Math.abs(p.t - q.t) < S2.STEP)) st.pts.push({ lat: q.lat, lng: q.lng, t: q.t });
    st.pts.sort((x, y) => x.t - y.t);
    const N = st.pts[st.pts.length - 1];
    st.pts = st.pts.filter(p => N.t - p.t <= S2.WIN * 1000);
    if (st.pts.length > S2.MAX_PTS) st.pts.splice(0, st.pts.length - S2.MAX_PTS);
    // самая свежая точка, что старше точки b хотя бы на sec секунд
    const back = (b, sec) => { for (let i = st.pts.length - 1; i >= 0; i--) if (b.t - st.pts[i].t >= sec * 1000) return st.pts[i]; return null; };
    // идёт шагом, бегом или стоит — за последние CALM с до точки b (дрожь GPS тут не мешает: она «замедляет», а не ускоряет)
    const calm = b => { const c = back(b, S2.CALM); return !!c && U.dist(c.lat, c.lng, b.lat, b.lng) / ((b.t - c.t) / 1000) <= S2.MAX; };
    // быстро: средняя за MIN_T с и больше — быстрее бега, и последние CALM с до этой точки он тоже не шёл шагом
    // (иначе после остановки замеры, захватившие поездку, ещё секунд 15 продлевали бы паузу)
    const a = back(q, S2.MIN_T), v = a ? this.speedOf(a, q) : null;
    if (v != null && v > S2.MAX && !calm(q)) { st.until = Math.max(st.until || 0, q.t + S2.COOL); st.kmh = Math.round(v * 3.6); }
    // пауза снимается по самой свежей точке: последние CALM с — шагом, бегом или на месте
    if (st.until > N.t && calm(N)) st.until = 0;
    return v;
  },
  // 4.26: перезарядка после дальнего перемещения (как в Pokémon GO): от места последнего действия на карте до нового —
  // [км, минут]; между строками — плавно, дальше последней — MAX минут. Ближе MIN км — дрожь GPS, не в счёт
  JUMP: { MIN: 1, MAX: 120, T: [[1, 1], [5, 2], [10, 6], [25, 11], [30, 14], [65, 22], [81, 25], [100, 35], [250, 45], [500, 60], [750, 80], [1000, 100]] },
  jumpCool(km) {
    const J = this.JUMP, T = J.T;
    if (!(km >= J.MIN)) return 0;
    if (km > T[T.length - 1][0]) return J.MAX;
    for (let i = 1; i < T.length; i++) if (km <= T[i][0]) { const [a, x] = T[i - 1], [b, y] = T[i]; return x + (y - x) * (km - a) / (b - a); }
    return T[0][1];
  },
  // сколько ещё ждать (мс) в точке b ({ lat, lng }) в момент now после действия в точке a ({ lat, lng, t }): время с тех пор идёт в зачёт
  jumpWait(a, b, now) {
    if (!a || !b || !Number.isFinite(+a.t)) return 0;
    return Math.max(0, +a.t + this.jumpCool(U.dist(a.lat, a.lng, b.lat, b.lng) / 1000) * 60000 - now);
  },
  // 4.26: пройденный путь сверяется с тем, где сервер видел Ловчего: точка q ({ lat, lng, t }) не дальше, чем можно пробежать
  // от позиции ref ({ lat, lng, t, acc }) за время между ними (бег × K), но не меньше MIN м, плюс точность ref (до ACC м).
  // DAY — сколько метров пути в день идёт в зачёт (коконы, задания, Орден); дальше путь не засчитывается
  TRACK: { MIN: 200, K: 1.5, ACC: 300, DAY: 60000 },
  trackNear(q, ref) {
    if (!ref) return true;
    const T = this.TRACK, dt = Math.abs(q.t - ref.t) / 1000;
    return U.dist(ref.lat, ref.lng, q.lat, q.lng) <= Math.max(T.MIN, this.SPEED.MAX * T.K * (Number.isFinite(dt) ? dt : 0)) + U.clamp(+ref.acc || 0, 0, T.ACC);
  },
  /* ---------- 5.1: джойстик и Атлас ---------- */
  // Ловчий ходит мини-джойстиком (walk.js): лёгкий наклон — шаг WALK, до упора (от RUN_AT наклона) — бег RUN, м/с; бег медленнее
  // SPEED.MAX, поэтому путь засчитывается, а проверки скорости сервера (SPEED, TRACK, jumpWait) остаются защитой от накрутки.
  // SYNC_MS — как часто, пока Ловчий идёт, путь уходит серверу (действие move); PT_MS — точки пути не чаще раза в столько мс.
  // Телепорт через Атлас (действие teleport): первое появление — даром, дальше — раз в TP_CD или мгновенно за предмет TP_ITEM
  MOVE: { WALK: 20 / 3.6, RUN: 60 / 3.6, /* 5.1.12: шаг 20, бег 60 км/ч (было 5 и 15) */ RUN_AT: 0.8, DEAD: 0.12, SYNC_MS: 10000, PT_MS: 1000, TP_CD: 30 * 60000, TP_ITEM: 'gate', LAT: 85 },
  // сколько ещё ждать до телепорта даром (мс): tpAt — время прошлого телепорта (S.d.tpAt)
  tpWait(tpAt, now) { return Number.isFinite(+tpAt) && +tpAt > 0 ? Math.max(0, +tpAt + this.MOVE.TP_CD - now) : 0; },
  AUCTION: { LEVEL: 5, FEE: 0.1, HOURS: 48, MAX_OPEN: 3, PER_DAY: 10, DEPOSIT: 0.05, DEP_MIN: { sparks: 50, zlat: 1 }, RECENT: 14,
    MIN: { sparks: 100, zlat: 1 }, MAX: { sparks: 10000000, zlat: 100000 } },
  auctionFee(price) { return Math.max(1, Math.ceil(price * this.AUCTION.FEE)); },
  auctionDeposit(cur, price) { const A = this.AUCTION; return Math.max(A.DEP_MIN[cur === 'zlat' ? 'zlat' : 'sparks'], Math.ceil((price || 0) * A.DEPOSIT)); },
  // Подсказка цены по недавним сделкам с духом того же вида: rows — [{ cur, price, lvl }]. Для каждой валюты — число
  // сделок, медиана и «обычный» разброс (от четверти до трёх четвертей сделок). lvl — уровень духа: сделки с духами
  // ±5 уровней, если таких хотя бы 3, иначе все сделки вида
  auctionHint(rows, lvl) {
    const out = {};
    for (const cur of ['sparks', 'zlat']) {
      let r = (rows || []).filter(x => x && x.cur === cur && x.price > 0);
      if (lvl) { const near = r.filter(x => Math.abs((x.lvl || 0) - lvl) <= 5); if (near.length >= 3) r = near; }
      if (!r.length) continue;
      const p = r.map(x => x.price).sort((a, b) => a - b), q = f => p[Math.min(p.length - 1, Math.floor(f * p.length))];
      out[cur] = { n: p.length, med: q(0.5), lo: q(0.25), hi: q(0.75) };
    }
    return out;
  },
  // 3.14: обменник — SPARKS искр → ZLAT монет за один обмен, не больше DAY обменов в день
  // 4.16: был ✦ 500 → 10 монет трижды в день (30 монет в день почти даром) — теперь трата лишних искр:
  // ✦ 1 000 → 1 монета, до 5 обменов в день
  EXCHANGE: { SPARKS: 1000, ZLAT: 1, DAY: 5 },
  // 4.16: посылка Ордена — награда, которая не поместилась в сумку, ждёт здесь (не больше MAX вещей), пока не освободится место
  PARCEL: { MAX: 200 },
  // 4.16: переплавка — N одинаковых лишних амулетов и SPARKS искр → один амулет на выбор
  MELT: { N: 3, SPARKS: 3000 },
  // 3.13: Дальний пропуск — Разлом до R м от игрока; каждый день Орден дарит один, если их меньше KEEP
  FAR: { R: 5000, KEEP: 3 },
  // 5.2: места (Источники, Капища и Разломы у них): каждую неделю бодрствует доля SHARE, остальные спят (W.awake);
  // на карте места видны в радиусе VIEW м от Ловчего (подойти, чтобы открыть, — как раньше: W.INTERACT, W.BATTLE_R)
  PLACES: { SHARE: 0.4, VIEW: 200 },
  // cur — валюта: sparks (искры) или zlat (монеты). give — предметы; cocoon — кокон; amulet — случайный амулет
  SHOP: [
    { id: 'bag',      name: ru`Расширение сумки`,    desc: ru`+50 мест в сумке навсегда`,                cur: 'zlat', bag: true },
    { id: 'farpass',  name: ru`Дальний пропуск`,     desc: ru`Закрыть Разлом до 5 км, не подходя к нему`, cur: 'sparks', price: 1000, give: { farpass: 1 } },
    { id: 'farpass3', name: ru`Три дальних пропуска`, desc: ru`Три грамоты на дальние Разломы`,          cur: 'zlat', price: 45,  give: { farpass: 3 } }, // выгоднее трёх за искры (по курсу обменника 45 зл ≈ ✦ 2250)
    { id: 'charm20', name: ru`Связка оберегов`,     desc: ru`20 оберегов`,                              cur: 'sparks', price: 1500, give: { charm: 20 } },
    { id: 'honey5',   name: ru`Горшок мёда`,         desc: ru`5 мёда`,                                   cur: 'sparks', price: 1200, give: { honey: 5 } },
    { id: 'water5',   name: ru`Живая вода`,          desc: ru`5 флаконов: половина здоровья, в разломе — прямо в бою`, cur: 'sparks', price: 2000, give: { water: 5 } },
    { id: 'herb10',   name: ru`Пучок подорожника`,   desc: ru`10 листьев: четверть здоровья каждый`,     cur: 'sparks', price: 600,  give: { herb: 10 } },
    { id: 'brew5',    name: ru`Целебный отвар`,      desc: ru`5 горшочков: 60% здоровья каждый`,         cur: 'sparks', price: 1200, give: { brew: 5 } },
    // 4.15.1: Мёртвая вода — редкость, в товар дня не попадает. 4.16: один флакон в неделю (week — сколько раз за неделю
    // можно купить, day — за день), а не каждый день на бесплатные монеты
    { id: 'dead1',    name: ru`Мёртвая вода`,        desc: ru`Один флакон в неделю: дух без сил поднимется на 4 часа раньше`, cur: 'zlat', price: 80, give: { deadwater: 1 }, week: 1 },
    { id: 'charm2x',  name: ru`Серебряные обереги`,  desc: ru`10 серебряных оберегов`,                   cur: 'zlat', price: 60,  give: { charm2: 10 }, lvl: 8 },
    { id: 'charm3x',  name: ru`Золотые обереги`,     desc: ru`10 золотых оберегов`,                      cur: 'zlat', price: 120, give: { charm3: 10 }, lvl: 16 },
    // 5.1: Врата Перепутицы — телепорт через Атлас сразу, без перезарядки (за искры — один в день)
    { id: 'gate',     name: ru`Врата Перепутицы`,    desc: ru`Шагнуть в любое место Атласа сразу, без ожидания. Одни в день`, cur: 'sparks', price: 3000, give: { gate: 1 }, day: 1 },
    { id: 'gate3',    name: ru`Трое Врат Перепутицы`, desc: ru`Три мгновенных перехода через Атлас`,     cur: 'zlat', price: 75,  give: { gate: 3 } },
    { id: 'incense',  name: ru`Ладан`,              desc: ru`30 минут духов вокруг вдвое больше`,       cur: 'zlat', price: 50,  give: { incense: 1 } },
    { id: 'cocoon5',  name: ru`Кокон 5 км`,          desc: ru`Необычные и редкие духи`,                  cur: 'zlat', price: 80,  cocoon: 5 },
    { id: 'cocoon10', name: ru`Кокон 10 км`,         desc: ru`Редкие и эпические духи`,                  cur: 'zlat', price: 150, cocoon: 10 },
    { id: 'amulet',   name: ru`Случайный амулет`,    desc: ru`Перуна, Мокоши, Велеса, Сварога или Лады`, cur: 'zlat', price: 200, amulet: true },
    // 4.16: средние покупки — ощутимо, но не «плати и побеждай»: настой опыта на сутки (+25%) — не больше двух в неделю
    // (week: иначе кит пил бы его каждый день), связка ладана — раз в день
    { id: 'xpbrew',   name: ru`Настой опыта`,        desc: ru`Сутки опыта на четверть больше. До двух в неделю`, cur: 'zlat', price: 60, give: { xpbrew: 1 }, day: 1, week: 2 },
    { id: 'incense5', name: ru`Связка ладана`,       desc: ru`5 ладана дешевле, чем по одному. Одна в день`, cur: 'zlat', price: 200, give: { incense: 5 }, day: 1 },
  ],
  // 4.16: Настой опыта — MUL опыта на H часов (пьётся из сумки, пока действует — второй не выпить)
  XP_BREW: { MUL: 1.25, H: 24 },
  bagPrice(n) { return 150 + 50 * n; }, // n — сколько раз сумку уже расширяли
  // 4.15: здоровье духов — общее на всю игру. После боя раны остаются; раненый дух сам восстанавливает REGEN в час,
  // без сил (здоровье 0) — в бой не идёт и поднимается сам на BACK через KO_H часов (по редкости духа: от 2 до 24);
  // 4.15.1: Мёртвая вода сокращает ожидание на ITEMS.deadwater.revive часов, Живая вода духа без сил не поднимает
  // 4.16: усталость — каждый бой (разлом, Капище, вторжение) даёт духам команды очко; очко уходит за REST часов отдыха.
  // Первые FREE боёв подряд даются даром, дальше каждое очко срезает STEP от предела здоровья (не ниже MIN) — ни лечение,
  // ни время выше предела не поднимут: одной командой весь день не провоевать, нужны сменщики
  HP: { REGEN: 0.1, KO_H: { 1: 2, 2: 5, 3: 9, 4: 15, 5: 24 }, BACK: 0.1, TIRED: { FREE: 3, STEP: 0.15, MIN: 0.4, REST: 1 } },
  koMs(sp) { return (this.HP.KO_H[(SP[sp.sid] || {}).rar] || 2) * 3600000; },
  // Товар дня: один из припасов со скидкой 40%, купить можно один раз в день
  shopDeal(day) {
    const pool = this.SHOP.filter(x => (x.give || x.cocoon) && !x.lvl && !x.day && !x.week); // товар дня доступен любому уровню; редкое (day, week) — без скидки
    const it = pool[Math.floor(U.h('deal', day) * pool.length)];
    return { ...it, price: Math.max(1, Math.round(it.price * 0.6)), deal: true };
  },
  // Сезонная тропа: сезон — календарный месяц, 30 ступеней по 40 очков (очки — как в общем деле Ордена)
  PASS: { LEVELS: 30, PER: 40, GOLD: 600, LATE: 25 },
  passLevel(pts) { return Math.min(this.PASS.LEVELS, Math.floor((pts || 0) / this.PASS.PER)); },
  // Награда ступени: free — всем, gold — на Золотой тропе. plvl — уровень Ловчего (4.16: на поздних уровнях
  // Золотая тропа не должна давать то, что уже некуда девать, — см. passGoldLate)
  // 4.16: на бесплатной тропе 55 монет за сезон (было 135), зато на 30-й ступени — Мёртвая вода (редкая, раз в месяц)
  passReward(track, lvl, plvl) {
    if (track === 'gold' && plvl >= this.PASS.LATE) return this.passGoldLate(lvl);
    if (track === 'free') {
      // 4.16.0: бесплатная тропа — 29 монет за сезон (было 55)
      if (lvl === 30) return { charm3: 5, deadwater: 1, zlat: 10 };
      if (lvl % 10 === 0) return { cocoon: 5, zlat: 5 };
      if (lvl % 5 === 0) return { incense: 1, zlat: 3 };
      return lvl % 2 ? { charm: 8 } : { honey: 3, sparks: 300 };
    }
    if (lvl === 30) return { look: 'trail', charm3: 10, cocoon: 10 };
    if (lvl === 15) return { look: '#065f46', zlat: 50 };
    if (lvl % 10 === 0) return { cocoon: 10, zlat: 40 };
    if (lvl % 5 === 0) return { amulet: 1, zlat: 30 };
    if (lvl % 3 === 0) return { charm3: 3, zlat: 15 };
    return lvl % 2 ? { charm2: 5, sparks: 500 } : { water: 3, sparks: 800 };
  },
  // 4.16: Золотая тропа с LATE уровня: вместо серебряных оберегов и мелочи — то, что нужно на поздних уровнях:
  // искры на усиление (втрое больше), золотые обереги, целебный отвар, настои опыта; облик и Знак Тропы — как раньше
  passGoldLate(lvl) {
    if (lvl === 30) return { look: 'trail', charm3: 10, xpbrew: 1 };
    if (lvl === 15) return { look: '#065f46', zlat: 50, sparks: 3000 };
    if (lvl % 10 === 0) return { xpbrew: 1, zlat: 40, sparks: 3000 };
    if (lvl % 5 === 0) return { amulet: 1, zlat: 30 };
    if (lvl % 3 === 0) return { charm3: 5, zlat: 15 };
    return lvl % 2 ? { charm3: 3, sparks: 1500 } : { brew: 2, sparks: 2500 };
  },
  // Защитник вернулся с Капища: искры за время на посту (25 в час, не меньше 25 и не больше 1500)
  guardPay(hours) { return Math.min(1500, Math.max(25, Math.round(25 * (hours || 0)))); },
  /* 4.16: Капища не должны навсегда оставаться за кланами.
     Защитник первые FRESH_H часов на посту в полной силе, потом устаёт: к MAX_H часам его уровень падает до (1 − WEAK)
     от своего, а в MAX_H часов он уходит домой (с искрами за службу, как побеждённый). Дань (Rules.ZLAT.tribute и TRIBUTE) —
     только за защитников, которые простояли не меньше TRIBUTE_H часов и ещё на посту («активная защита»), и не больше чем
     за HOLD_MY_MAX Капищ. Доля FREE Капищ — вольные: их не держит ни один клан, там всегда бьётся хранитель.
     4.28: кланы — мифологии; защитник на святилище мифологии своего клана (W.placeMyth) приносит дань ×MYTH (искры и обереги;
     монеты — как с любого Капища). Кланов стало 7+ при тех же Ловчих — на удержание Капищ это не влияет: защитников на
     Капище и Капищ у Ловчего столько же, вольных — та же доля. */
  HOLD: { FRESH_H: 24, MAX_H: 72, WEAK: 0.5, TRIBUTE_H: 4, FREE: 0.25, MYTH: 1.5 },
  holdHours(t, now) { return Math.max(0, ((now == null ? Date.now() : now) - (+t || 0)) / 3600000); },
  holdFresh(h, now) { return !!h && this.holdHours(h.t, now) < this.HOLD.MAX_H; },
  // во сколько раз уменьшен уровень защитника (1 — в полной силе)
  holdK(t, now) { const H = this.HOLD, h = this.holdHours(t, now); return 1 - H.WEAK * U.clamp((h - H.FRESH_H) / (H.MAX_H - H.FRESH_H), 0, 1); },
  // отражение духа на посту: уровень — с учётом усталости
  holdSpirit(sp, t, now) { return { ...sp, lvl: Math.max(1, Math.round((sp.lvl || 1) * this.holdK(t, now))) }; },
  shrineFree(id) { return U.h('freeShrine', String(id)) < this.HOLD.FREE; },
  // 4.28: дань за n Капищ, из них own — святилища мифологии своего клана (там ×HOLD.MYTH; обереги — с округлением вверх)
  tributeFor(n, own) { const k = n + Math.min(own, n) * (this.HOLD.MYTH - 1); return { sparks: Math.round(TRIBUTE.sparks * k), charm: Math.ceil(TRIBUTE.charm * k - 1e-9) }; },
  ORDER_RULES: [
    [ru`Поимка духа`, 1], [ru`Источник`, 1], [ru`500 м пути`, 1], [ru`Кокон`, 3], [ru`Победа в капище`, 3], [ru`Вторжение`, 3], [ru`Разлом`, 5],
  ],

  // Шанс поимки за один бросок. o: { mode, sid, lvl, item, honey, mul }
  catchChance(o) {
    const s = SP[o.sid];
    if (o.mode === 'tut') return 1; // учебного духа поймать можно всегда
    const base = o.mode === 'raid' ? (s.legend ? 0.1 : 0.2)
      : RARITY[s.rar].base * U.clamp(1.15 - o.lvl / 60, 0.55, 1.15) * (o.mode === 'task' ? 1.5 : 1); // дух за поручение ловится легче
    const cm = o.mode === 'raid' ? 1.5 : ITEMS[o.item].mult;
    const mult = cm * (o.honey ? 1.5 : 1) * (o.mul || 1);
    return 1 - Math.pow(1 - U.clamp(base, 0.02, 0.95), mult);
  },
  // Бонус за попадание в кольцо: ring — размер кольца в момент броска (1 — большое, 0.2 — маленькое)
  ringBonus(ring) {
    if (ring == null) return { mul: 1, xp: 0, label: '', great: false };
    const r = U.clamp(+ring || 1, 0.2, 1);
    return r > 0.7 ? { mul: 1.2, xp: 10, label: ru`Хорошо!`, great: false } : r > 0.4 ? { mul: 1.5, xp: 50, label: ru`Отлично!`, great: true } : { mul: 1.8, xp: 100, label: ru`Превосходно!`, great: true };
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
  /* 4.26: бой в разломе глазами сервера (как Raid.tick/bossStrike): первый удар босса — на FIRST с, дальше не реже раза в GAP с
     (замах 0,9 с + пауза до 3,6 с), уклон срезает удар до DODGE. Всё — в пользу игрока: каждый удар уклонён, погода боссу
     не помогает, урон духов — наибольший (как в raidMaxDamage), SLACK — запас сверху, LOSS — доля ран, которую сервер
     засчитает после победы наверняка */
  RAID_SIM: { FIRST: 4.1, GAP: 4.5, DODGE: 0.2, SLACK: 1.5, LOSS: 0.5 },
  // удар босса по духу sp с уклоном, без погоды; bs — Raid.bossStats, bel — стихия босса
  raidHit(bs, bel, sp) {
    const n = Math.floor(0.5 * bs.pw * (bs.atk / S.battle(sp).def) * 1.2 * Raid.eff(bel, SP[sp.sid].el)) + 1;
    return Math.max(1, Math.floor(n * this.RAID_SIM.DODGE));
  },
  // 4.26: может ли команда вообще выстоять, пока наносит нужный урон need (как duelWinnable для Капищ). Каждый дух живёт
  // не дольше, чем выдерживает уклонённые удары (здоровье на входе — hp0, { uid: доля }; нет — здоров), и бьёт с наибольшим
  // уроном; выпитая Живая вода (waters) — полфлакона здоровья тому, кому она выгоднее всего. В совместном бою need — своя доля
  raidWinnable(team, boss, need, hp0, waters = 0) {
    if (!team.length) return false;
    const R = this.RAID_SIM, bs = Raid.bossStats(boss), bel = SP[boss.boss].el;
    const h0 = sp => hp0 && Number.isFinite(+hp0[sp.uid]) ? U.clamp(+hp0[sp.uid], 0, 1) : 1;
    const me = team.map(sp => {
      const max = S.battle(sp).hp * 5, hit = this.raidHit(bs, bel, sp), dps = this.raidMaxDamage([sp], boss, 1) / 1.3;
      return { max, hit, dps, cap: dps * Math.ceil(Math.max(1, Math.round(max * h0(sp))) / hit) * R.GAP };
    });
    const water = Math.max(0, ...me.map(m => m.dps * Math.ceil(m.max / 2 / m.hit) * R.GAP)) * U.clamp(waters | 0, 0, 3);
    return (me.reduce((a, m) => a + m.cap, 0) + water) * R.SLACK >= need;
  },
  // 4.26: сколько здоровья (в единицах разлома: здоровье духа × 5) команда потеряла наверняка, победив: быстрее need / (наибольший
  // урон в секунду) не победить, а за это время босс ударил не меньше стольких раз — каждый удар не слабее уклонённого
  raidMinLoss(team, boss, need) {
    if (!team.length || !(need > 0)) return 0;
    const R = this.RAID_SIM, bs = Raid.bossStats(boss), bel = SP[boss.boss].el, dps = this.raidMaxDamage(team, boss, 1);
    const t = Math.min(90, need / Math.max(1e-9, dps)), strikes = t < R.FIRST ? 0 : Math.floor((t - R.FIRST) / R.GAP) + 1;
    return strikes * Math.min(...team.map(sp => this.raidHit(bs, bel, sp))) * R.LOSS;
  },
  // 4.26: то же на Капище и во вторжении (здоровье духа × Duel.HPX): быстрее, чем за duelFoeHp / наибольший урон, соперника не
  // победить; он бьёт раз в speed…speed+0,25 с игрового времени (первый удар — на 1,5 с, пауза после каждого побеждённого
  // бойца — 1,2 с); два удара могут уйти в щиты, остальные — не слабее быстрого удара без погоды
  duelMinLoss(team, foe, speed) {
    if (!team.length || !foe.length) return 0;
    const dps = this.duelMaxDamage(team, foe, 1);
    const t = Math.min(Duel.TIME, this.duelFoeHp(foe) / Math.max(1e-9, dps)) - 1.5 - 1.2 * (foe.length - 1);
    const acts = Math.max(0, Math.floor(t / ((+speed || 0.85) + 0.25)) - 2);
    const hit = Math.min(...foe.flatMap(f => team.map(m => {
      const y = S.battle(f), x = S.battle(m);
      return Math.floor(0.5 * Duel.FAST * (y.atk / x.def) * 1.2 * Raid.eff(SP[f.sid].el, SP[m.sid].el)) + 1;
    })));
    return acts * hit * this.RAID_SIM.LOSS;
  },
  // 4.26: нижняя граница ран: list — бойцы { max — здоровье в единицах боя, up — выше этой доли быть не может, rep — доля
  // по словам телефона }; команда потеряла не меньше loss единиц — недостающие раны снимаются с бойцов по порядку. Доли — после боя
  woundFloor(list, loss) {
    const out = list.map(x => U.clamp(Math.min(+x.rep, +x.up), 0, 1) || 0);
    let left = loss - list.reduce((a, x, i) => a + Math.max(0, x.up - out[i]) * x.max, 0);
    for (let i = 0; i < list.length && left > 0; i++) {
      const take = Math.min(out[i] * list[i].max, left);
      out[i] -= take / list[i].max; left -= take;
    }
    return out;
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
  // 4.16: hp0 — здоровье духов на входе в бой ({ uid: доля }, с раной и усталостью); нет — считаем здоровыми
  duelWinnable(team, foe, speed, hp0) {
    if (!team.length || !foe.length) return false;
    const h0 = sp => hp0 && Number.isFinite(+hp0[sp.uid]) ? U.clamp(+hp0[sp.uid], 0, 1) : 1;
    const me = team.map(sp => ({ x: S.battle(sp), el: SP[sp.sid].el, h: h0(sp) })), fo = foe.map(sp => ({ x: S.battle(sp), el: SP[sp.sid].el }));
    const hit = Math.min(...fo.flatMap(f => me.map(m => Raid.dmg(f.x.atk, m.x.def, Duel.FAST, f.el, m.el))));
    const foeDps = hit / ((+speed || 0.85) + 0.25), myDps = this.duelMaxDamage(team, foe, 1);
    const survive = me.reduce((a, m) => a + m.x.hp * Duel.HPX * m.h, 0) / foeDps; // дольше команда не проживёт
    const kill = this.duelFoeHp(foe) / myDps;                               // быстрее соперника не убить
    if (kill <= survive) return true;
    if (survive < Duel.TIME) return false;
    const meMax = Math.max(...me.map(m => m.x.hp * Duel.HPX)), foeMin = Math.min(...fo.map(f => f.x.hp * Duel.HPX));
    const meShare = Math.max(0, me.reduce((a, m) => a + m.h, 0) / me.length - foeDps * Duel.TIME / (me.length * meMax));
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
   Телефон присылает намерение («бросил оберег», «зачерпнул источник», «усилил духа»), сервер проверяет его
   (расстояние до объекта, перезарядки, предметы в сумке, правдоподобие боя), сам бросает кубики
   и сохраняет результат. В ответ — изменения прогресса (diff.js) и события для окон и подсказок.
   Файл работает и в браузере (автотесты), и в Edge Function (см. build-server.ps1). */

class GameError extends Error {}

const GameCore = {
  MIN_CLIENT: '5.1.0', // 5.1: джойстик и Атлас вместо GPS; 5.0: мифологии мира и сезоны Алатыря меняют появление духов на карте — старым клиентам нужно обновиться
  POI_ID: /^(osm:[nwr]\d{1,15}|usr:[0-9a-f-]{36})$/,
  PID: /^[a-z0-9]{8,40}$/,
  STARTERS: ['ugolek', 'kapelka', 'mshonok'],
  TZ_LOCK: 7 * 86400000, // часовой пояс игрока меняется не чаще раза в неделю

  fail(msg) { throw new GameError(msg); },
  need(cond, msg) { if (!cond) this.fail(msg); },

  /* ---------- запуск запроса ----------
     req:  { a: [{ type, args }], tz, pos: { lat, lng, acc }, v } (5.2: погоду решает сервер — см. weather)
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
  /* 5.2: погоду решает сервер — телефон её больше не присылает (раньше присылал, и сервер сверял: выбор погоды был лазейкой).
     Погода одна для всех Ловчих в клетке ~0.1° (как у Sky.simulate) в этот час: настоящая (env.weather — Open-Meteo по центру
     клетки, serve.js), а если сервис погоды не ответил — смоделированная Sky.simulate. Кэш экземпляра — по клетке и часу:
     один запрос к сервису на клетку в час; одновременные запросы ждут один и тот же ответ; неудача помнится 5 минут
     (не ждать таймаут на каждое действие). Из нескольких ответов сервиса берётся первый. Окружение без env.weather
     (автотесты старых сценариев) — без погоды, как раньше без погоды телефона */
  WX: new Map(),
  WX_FAIL: 5 * 60000,
  wxCell(pos) { return Math.floor(pos.lat * 10) + ',' + Math.floor(pos.lng * 10); },
  async weather(pos, env, now = Date.now()) {
    if (!pos || !env || typeof env.weather !== 'function') return null;
    const hour = Math.floor(now / 3600000), k = this.wxCell(pos) + ',' + hour;
    let c = this.WX.get(k);
    if (c && c.fail && now - c.at >= this.WX_FAIL) c = null;
    if (!c) {
      if (this.WX.size > 5000) this.WX.clear();
      const lat = +((Math.floor(pos.lat * 10) + 0.5) / 10).toFixed(2), lng = +((Math.floor(pos.lng * 10) + 0.5) / 10).toFixed(2);
      c = { at: now, fail: false };
      c.p = Promise.resolve().then(() => env.weather(lat, lng)).catch(() => null).then(r => {
        const w = Array.isArray(r) ? (r.length ? { key: r[0] } : null) : r; // старый ответ — список, новый — { key, temp }
        if (w && Object.prototype.hasOwnProperty.call(WEATHER, w.key)) return { key: w.key, temp: Number.isFinite(+w.temp) && w.temp !== null ? Math.round(+w.temp) : null, src: 'real' };
        c.fail = true; // неудача помнится WX_FAIL с момента запроса
        return null;
      });
      this.WX.set(k, c);
    }
    const w = await c.p;
    return w ? { ...w } : { key: Sky.simulate(pos).key, temp: null, src: 'sim' };
  },
  // погода для телефона — в каждом ответе (несколько байт): телефон показывает её и по ней же видит духов на карте
  wxOut(w) { return w ? { key: w.key, temp: w.temp != null ? w.temp : null, src: w.src === 'real' ? 'real' : 'sim' } : null; },
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
      const p = req.pos;
      ctx.pos = p && Number.isFinite(+p.lat) && Number.isFinite(+p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180
        ? { lat: +p.lat, lng: +p.lng, acc: U.clamp(+p.acc || 30, 1, 5000) } : null;
      ctx.wxCell = ctx.pos ? this.wxCell(ctx.pos) : null;
      Sky.w = await this.weather(ctx.pos, env, ctx.now); // 5.2: req.wx (погода телефона) не читается
      MapView.pos = ctx.pos;
      Bus.emit = (ev, data) => ctx.events.push([ev, this.ser(ev, data)]);
      S.save = () => {};
      S.d = save.data ? JSON.parse(JSON.stringify(save.data)) : null;
      Ev.alaSync(ctx.now); // 4.28: мифологии, открытые в этом сезоне Алатыря (сезон — из базы, serve.js)
      if (S.d) { S.migrate(); S.ensureQuests(); W.prune(); this.alaTurn(ctx); }
      this.track(ctx);

      const actions = Array.isArray(req.a) ? req.a.slice(0, 5) : [];
      this.need(actions.length, ru`Пустой запрос`);
      const stats0 = S.d ? JSON.parse(JSON.stringify(S.d.stats)) : null;
      const ala0 = S.d ? S.d.alaGiven || 0 : 0; // 4.28: осколки Алатыря, отданные в общий счёт Ордена
      for (const a of actions) {
        const h = a && typeof a.type === 'string' && Object.prototype.hasOwnProperty.call(this.H, a.type) ? this.H[a.type] : null; // только свои действия, без служебных полей объекта
        this.need(h, ru`Неизвестное действие`);
        if (!['newGame', 'load'].includes(a.type)) this.need(S.d, ru`Прогресс не найден`);
        ctx.results.push(await h.call(this, a.args || {}, ctx));
      }
      if (S.d && stats0) { const pts = Rules.orderPoints(stats0, S.d.stats, Ev.cur); this.orderAdd(ctx, pts); this.passAdd(ctx, pts); }
      if (S.d) this.alatyrSync(ctx, (S.d.alaGiven || 0) - ala0, actions.some(a => a && a.type === 'load'));
      if (S.d) { S.checkMedals(); S.ensureQuests(); }
      // 5.2: Ловчий перенёсся в другую клетку (телепорт) — телефону погода уже нового места
      if (ctx.pos && this.wxCell(ctx.pos) !== ctx.wxCell) Sky.w = await this.weather(ctx.pos, env, ctx.now);
      return { ok: true, data: S.d, srv: ctx.srv, results: ctx.results, events: ctx.events, after: ctx.after, full: ctx.full, reset: ctx.reset, now: ctx.now, wx: this.wxOut(Sky.w) };
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
    ctx.prevPos = last && Number.isFinite(+last.t) ? last : null; // 4.26: где сервер видел Ловчего до этого запроса (сверка пути в move)
    if (!p) return;
    if (last && ctx.now - last.t < 10 * 60000) {
      const v = U.dist(last.lat, last.lng, p.lat, p.lng) / Math.max(1, (ctx.now - last.t) / 1000);
      if (v > 60 && U.dist(last.lat, last.lng, p.lat, p.lng) > 300) ctx.srv.fastUntil = ctx.now + 60000;
    }
    ctx.srv.pos = { lat: p.lat, lng: p.lng, t: ctx.now, acc: Math.round(p.acc) };
    if (!(p.acc > Rules.SPEED.ACC)) this.pace(ctx, { lat: p.lat, lng: p.lng, t: ctx.now });
    this.keepPos(p);
  },
  // 5.1: место Ловчего в мире игры (выбрано в Атласе, дальше — джойстиком) — в прогрессе: на новом устройстве и после
  // долгого перерыва Ловчий там же (srv.pos через сутки без входа стирается — 028). Пишется, если сдвинулся дальше 25 м
  keepPos(p) {
    if (!S.d || !p) return;
    const w = S.d.wpos;
    if (!w || !(U.dist(w.lat, w.lng, p.lat, p.lng) <= 25)) S.d.wpos = { lat: +(+p.lat).toFixed(5), lng: +(+p.lng).toFixed(5) };
  },
  // 4.20: скорость Ловчего; быстрее бега — пауза на COOL. 4.24.1: по недавним точкам (Rules.paceStep) — после остановки
  // пауза снимается, как только Ловчий полминуты идёт шагом или стоит
  pace(ctx, q) {
    const st = ctx.srv.spd = ctx.srv.spd || { pts: [], until: ctx.srv.speedUntil || 0, kmh: ctx.srv.kmh || 0 };
    delete ctx.srv.pace; delete ctx.srv.speedUntil; // прежний счётчик (якорь раз в минуту)
    Rules.paceStep(st, q);
  },
  speedUntil(ctx) { return (ctx.srv.spd && ctx.srv.spd.until) || ctx.srv.speedUntil || 0; },
  here(ctx) {
    // 5.1: GPS больше нет — позицию двигает джойстик (walk.js), место выбирают в Атласе; проверки скорости — защита от накрутки
    this.need(ctx.pos, ru`Ловчий ещё не на карте — выбери место в Атласе мира`);
    this.need(!(ctx.srv.fastUntil > ctx.now), ru`Ловчий слишком резко сменил место — подожди минуту`);
    this.need(!(this.speedUntil(ctx) > ctx.now), ru`Слишком быстро — подожди минуту`);
    // 4.26: после дальнего перемещения — перезарядка (Rules.jumpWait) от места и времени последнего действия на карте,
    // сколько бы ни прошло с последней точки. Позиция при этом принимается как обычно; место действия запоминается
    const wait = Rules.jumpWait(ctx.srv.at, ctx.pos, ctx.now);
    this.need(!(wait > 0), ru`Слишком быстрое перемещение — подожди ${Math.ceil(wait / 60000)} мин`);
    ctx.srv.at = { lat: ctx.pos.lat, lng: ctx.pos.lng, t: ctx.now };
    return ctx.pos;
  },
  near(ctx, lat, lng, max) {
    const p = this.here(ctx), d = U.dist(p.lat, p.lng, lat, lng);
    this.need(d <= max + Math.min(p.acc, 30) + 10, ru`Слишком далеко — подойди ближе`);
    return d;
  },
  limit(ctx, key, max, windowMs, msg) {
    const rl = ctx.srv.rl = ctx.srv.rl || {}, r = rl[key];
    if (!r || ctx.now - r[1] > windowMs) { rl[key] = [1, ctx.now]; return; }
    this.need(r[0] < max, msg || ru`Слишком часто — передохни немного`);
    r[0]++;
  },
  // 4.26: ключ из запроса или чужих данных — только собственный ключ таблицы (не __proto__, constructor и т. п.)
  own(o, k) { return (typeof k === 'string' || typeof k === 'number') && Object.prototype.hasOwnProperty.call(o, k); },
  // 4.26: общие таблицы (аукцион, подарки, друзья, Капища, комнаты, чат) обработчики пишут до сохранения прогресса — только
  // пока замок игрока точно держится (serve.js: env.lockAt — когда взят, env.LOCK_MS — на сколько; LOCK_SPARE — запас на
  // сохранение). Иначе другой запрос того же игрока мог уже взять замок — и запись разошлась бы с прогрессом.
  // Нет данных о замке (автотесты) — не проверяем
  LOCK_SPARE: 8000,
  shared(ctx) {
    const e = ctx.env || {}, at = +e.lockAt, ms = +e.LOCK_MS;
    if (!(at > 0) || !(ms > 0)) return;
    this.need(Date.now() - at <= ms - this.LOCK_SPARE, ru`Сервер не успел — повтори действие`);
  },
  spirit(uid) { const sp = S.findSpirit(String(uid)); this.need(sp, ru`Дух не найден`); return sp; },
  // Объект карты из запроса. Места игроков и правки модераторов сверяются с сервером.
  async place(a, ctx, kind) {
    const p = a && typeof a === 'object' ? a : {};
    this.need(this.POI_ID.test(String(p.id)) && Number.isFinite(+p.lat) && Number.isFinite(+p.lng), ru`Неизвестное место`);
    const row = await ctx.env.poi(p.id);
    if (row) {
      this.need(row.active !== false, ru`Этого места больше нет на карте`);
      this.need(!kind || row.kind === kind, ru`Здесь нет такого объекта`);
      return { id: row.id, lat: row.lat, lng: row.lng, name: row.name, photo: row.photo || null, verified: true };
    }
    this.need(p.id.startsWith('osm:'), ru`Место не найдено`);
    // там, где места загружены из OpenStreetMap в базу (вся Россия), других объектов нет
    this.need(!(await ctx.env.poiCovered(+p.lat, +p.lng)), ru`Этого места нет на карте — обнови игру`);
    // 4.1: такое место сервер проверить не может (id и координаты — от телефона): на нём нет легендарных разломов и удержания Капищ
    return { id: p.id, lat: +p.lat, lng: +p.lng, name: String(p.name || 'Место').slice(0, 80), photo: null, verified: false };
  },
  // 5.2: место спит на этой неделе (W.awake, Rules.PLACES) — ни Источника, ни Капища, ни Разлома здесь нет
  placeAwake(p, kind, t) { this.need(W.awake(p, kind, t), ru`Это место сейчас спит — на этой неделе здесь ничего нет`); },
  team(uids) { return (uids || []).map(u => S.findSpirit(u)).filter(Boolean); },
  battleTime(ctx, b) { return (ctx.now - b.start) / 1000 - Rules.COUNTDOWN; },
  endBattle(ctx, type) {
    const b = ctx.srv.battle;
    this.need(b && b.type === type, ru`Бой не найден — начни его заново`);
    ctx.srv.battle = null;
    return b;
  },
  // 4.15: раны после боя — общие на всю игру. Телефон присылает долю здоровья каждого бойца (hp: { uid: 0..1 });
  // выше той, с какой дух вошёл в бой, она не станет (в разломе — плюс выпитая Живая вода). Нет данных — здоровье не меняется
  // 4.16: и усталость — каждый бой (разлом, Капище, вторжение) прибавляет духам команды по очку (см. Rules.HP.TIRED)
  // 4.26: после победы — и не ниже, чем посчитал сервер: команда потеряла не меньше loss единиц здоровья (Rules.raidMinLoss,
  // duelMinLoss; mul — здоровье духа в единицах боя: 5 в разломе, Duel.HPX на Капище) — даже если телефон ран не прислал
  woundTeam(b, hp, loss = 0, mul = 5) {
    const now = U.now(), team = this.team(b.team), rep = hp && typeof hp === 'object' ? hp : {};
    const up = sp => Math.min(S.hpCap(sp, now), S.hpNow(sp, now) + (b.waters || 0) * ITEMS.water.heal);
    let out = team.map(sp => (Number.isFinite(+rep[sp.uid]) ? Math.min(+rep[sp.uid], up(sp)) : null));
    if (loss > 0) out = Rules.woundFloor(team.map((sp, i) => ({ max: S.battle(sp).hp * mul, up: up(sp), rep: out[i] != null ? out[i] : S.hpNow(sp, now) })), loss);
    team.forEach((sp, i) => { if (out[i] != null) S.setHp(sp, out[i], now); });
    if (b.tire) team.forEach(sp => S.tire(sp, 1, now));
  },
  // здоровье бойцов на входе в бой: { uid: доля } — по нему сервер судит, могла ли команда победить (Rules.duelWinnable)
  hpMap(team) { const o = {}; team.forEach(sp => { o[sp.uid] = S.hpNow(sp); }); return o; },
  readyTeam(team) { this.need(team.every(sp => S.alive(sp)), ru`В команде дух без сил — вылечи его или замени`); },
  // Одна встреча с духом за раз: вид, уровень и особенности — только с сервера
  openEnc(ctx, o) {
    o = { ...o, lvl: U.clamp(o.lvl | 0, 1, S.catchLvl()) }; // 4.15: пойманный дух — не выше уровня Ловчего, откуда бы ни пришёл
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
    this.need(t >= 5, ru`Бой не засчитан: слишком быстрая победа`);
    this.need(Rules.duelWinnable(this.team(b.team), foe, speed, b.hp0), ru`Бой не засчитан: эта команда не могла победить такого соперника`);
    if (t >= Duel.TIME - 5) return;
    this.need(Rules.duelMaxDamage(this.team(b.team), foe, t) >= Rules.duelFoeHp(foe), ru`Бой не засчитан: слишком быстрая победа`);
  },
  friendPoint(f) {
    const lv = L => { let r = 0; FRIEND_LEVELS.forEach((x, i) => { if (L >= x.pts) r = i; }); return r; };
    const before = lv(f.pts);
    f.pts++;
    const after = lv(f.pts);
    if (after > before) {
      const L = FRIEND_LEVELS[after];
      const xp = S.addXP(L.xp); // 4.16: обычный опыт — под дневным потолком (друзья «дозревают» волнами)
      Bus.emit('toast', { text: ru`Дружба с ${f.name}: теперь «${L.name}»! +${U.fmtNum(xp)} опыта`, cls: 'good' });
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
  /* 4.28: общий Алатырь. n осколков, выпавших за запрос, — в общий счёт Ордена после сохранения прогресса (serve.js →
     alatyr_add; веху и событие дороги сервер отмечает там же). Дороги (Ev.roads — сервер держит их из базы) телефон
     получает событием roads: при входе и когда набор дорог изменился с прошлого раза (ctx.srv.alaV) */
  alatyrSync(ctx, n, load) {
    if (n > 0 && typeof ctx.env.alatyrAdd === 'function') { const k = Math.min(n, 10); ctx.after.push(() => ctx.env.alatyrAdd(k)); }
    const key = Ev.roadsKey();
    if ((load && key) || (ctx.srv.alaV || '') !== key) Bus.emit('roads', Ev.roadsLive(ctx.now));
    if (key || ctx.srv.alaV) ctx.srv.alaV = key;
    // 4.28: сезон Алатыря (финал, раскол) — событием ala: при входе и когда он изменился
    const sk = Ev.alaKey();
    if (load || (ctx.srv.alaW || '') !== sk) Bus.emit('ala', Ev.alaView());
    ctx.srv.alaW = sk;
  },
  /* 4.28: сезон Алатыря сменился (Кощей расколол камень) — награда за вклад в прошлый сезон (S.d.alaS: осколки и победы над
     Кощеем, Rules.alaPoints) из SeasonRewards (season-rewards.js; нет — без наград) и итоги для окна «Итоги сезона»
     (S.d.alaSum — телефон показывает его один раз, alatyr.js). Вклад нового сезона — с нуля. Первый раз (сохранение до
     сезонов) вклад первого сезона — всё, что Ловчий отдал в общий камень (alaGiven) */
  alaTurn(ctx) {
    const s = Ev.alaSeason(ctx.now), a = S.d.alaS;
    if (!a || typeof a !== 'object' || !(a.s >= 1)) { S.d.alaS = { s, n: s === 1 ? Math.max(0, S.d.alaGiven | 0) : 0, k: 0 }; return; }
    if (a.s >= s) return;
    const pts = Rules.alaPoints(a);
    let got = [];
    if (pts > 0 && typeof SeasonRewards !== 'undefined' && SeasonRewards && typeof SeasonRewards.grant === 'function') {
      try { const g = SeasonRewards.grant(S, a.s, pts); got = Array.isArray(g) ? g : []; } catch (e) { console.error('Награды сезона:', String(e && e.stack || e)); }
    }
    S.d.alaS = { s, n: 0, k: 0 };
    if (pts > 0 || got.length) {
      S.d.alaSum = { s: a.s, n: Math.max(0, a.n | 0), k: Math.max(0, a.k | 0), pts,
        got: got.slice(0, 12).map(x => (x && typeof x === 'object' ? { label: String(x.label || x.name || '').slice(0, 120), n: Math.max(1, +x.n || 1) } : { label: String(x).slice(0, 120), n: 1 })) };
    }
  },
  // Сезонная тропа: сезон — календарный месяц по часам игрока
  passSeason(ctx) { const d = U.local(ctx.now); return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`; },
  passState(ctx) {
    const season = this.passSeason(ctx);
    if (!S.d.pass || S.d.pass.season !== season) S.d.pass = { season, pts: 0, gold: false, got: { free: [], gold: [] } };
    return S.d.pass;
  },
  passAdd(ctx, pts) { if (pts > 0) this.passState(ctx).pts += pts; },
  // Награда: предметы, искры, монеты + кокон, случайный амулет, облик
  grant(rw) {
    const { cocoon, amulet, look, ...rest } = rw;
    const got = S.giveRewards(rest);
    if (cocoon) { S.d.cocoons.push({ id: U.uid(), km: cocoon, walked: 0, inc: S.incubating() < 3 }); got.push({ k: 'cocoon', n: 1, km: cocoon, label: ru`Кокон ${cocoon} км` }); }
    if (amulet) { const am = S.rollAmulet(1, 'gift' + U.uid()); got.push({ k: 'amulet', n: 1, id: am, label: AMULETS[am].name }); }
    if (look) {
      S.d.owned[look] = true;
      const x = LOOK.cloak.find(c => c.c === look) || LOOK.emblem.find(m => m.id === look) || LOOK.skin.find(k => `skin:${k.id}` === look) || LOOK.bg.find(k => `bg:${k.id}` === look) || LOOK.frame.find(k => `frame:${k.id}` === look);
      got.push({ k: 'look', n: 1, look, label: x ? ru`Облик: ${x.name}` : ru`Облик` });
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
    this.need(f, ru`Такого друга нет`);
    const s = await ctx.env.friendSave(f.id);
    this.need(s && s.data, ru`Ловчий не найден`);
    const d = s.data;
    this.need((d.friends || []).some(x => x.id === S.d.pid), what === 'duel' ? ru`Поединок откроется, когда ${f.name} тоже добавит тебя в друзья` : ru`Профиль откроется, когда ${f.name} тоже добавит тебя в друзья`);
    return { f, d, s };
  },
  // Дух из чужого сохранения: только известные поля и допустимые значения
  cleanSpirit(x, i) {
    const iv = (Array.isArray(x.iv) ? x.iv : []).slice(0, 3).map(v => U.clamp(Math.floor(+v) || 0, 0, 15));
    while (iv.length < 3) iv.push(0);
    return { uid: 'foe' + i, sid: x.sid, lvl: U.clamp(Math.floor(+x.lvl) || 1, 1, SPIRIT_MAX), iv, shiny: !!x.shiny, dark: !!x.dark && !x.purified,
      purified: !!x.purified, move2: !!x.move2, amulet: this.own(AMULETS, x.amulet) ? x.amulet : null, nick: x.nick ? this.cleanText(x.nick, 16) || null : null };
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
    this.shared(ctx);
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
      if (!r.spirit || !this.own(SP, r.spirit.s)) continue;
      if (r.status === 'sold') {
        if (A.paid[r.id]) continue;
        const cur = r.cur === 'zlat' ? 'zlat' : 'sparks', net = r.price - Rules.auctionFee(r.price);
        const dep = U.clamp(Math.floor(+r.deposit) || 0, 0, Rules.auctionDeposit(cur, r.price)); // 4.16: залог — обратно (не больше, чем положено за эту цену)
        S.d[cur] = (S.d[cur] || 0) + net + dep;
        A.paid[r.id] = ctx.now;
        S.d.stats.traded++;
        got.push({ type: 'sold', sid: r.spirit.s, cur, price: r.price, net, dep, buyer: String(r.buyer_name || '').slice(0, 20) });
        J.add('auction', { sid: r.spirit.s, dir: 'sold', cur, price: net, who: r.buyer_name });
      } else {
        if (A.back[r.id]) continue;
        S.addSpirit(this.unpackSpirit(r.spirit, ctx));
        A.back[r.id] = ctx.now;
        got.push({ type: r.status, sid: r.spirit.s, lost: Math.max(0, Math.floor(+r.deposit) || 0), cur: r.cur === 'zlat' ? 'zlat' : 'sparks' });
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
    springs: ru`Сегодня ты уже зачерпнул силу из 30 источников — они снова откроются завтра`,
    raids: ru`Сегодня закрыто уже 6 Разломов — Навь затихла до завтра`,
    duels: ru`Сегодня уже 8 побед на Капищах — хранители ждут тебя завтра`,
    invasions: ru`Сегодня отбито уже 6 вторжений — Навь вернётся завтра`,
    catches: ru`Сегодня поймано уже 120 духов — обереги отдохнут до завтра`,
  },
  // 5.x: промокоды (034_promo_codes.sql): причины отказа базы → текст для игрока
  PROMO_MSG: {
    not_found: ru`Такого промокода нет`,
    inactive: ru`Промокод больше не действует`,
    expired: ru`Промокод больше не действует`,
    not_started: ru`Промокод ещё не начал действовать`,
    exhausted: ru`Промокоды закончились`,
    already: ru`Ты уже вводил этот промокод`,
    off: ru`Промокоды пока недоступны — попробуй позже`,
  },
  PROMO_RE: /^[A-Z0-9-]{3,32}$/,
  // Код, как его ввёл игрок → вид в базе: без пробелов, в верхнем регистре; русские буквы, похожие на латинские
  // (набрал на русской раскладке), — латинскими. Не годится — null
  promoCode(s) {
    const c = String(s == null ? '' : s).slice(0, 64).replace(/\s+/g, '').toUpperCase()
      .replace(/[АВЕКМНОРСТУХ]/g, x => 'ABEKMHOPCTYX'['АВЕКМНОРСТУХ'.indexOf(x)]).replace(/[‐-―−]/g, '-');
    return this.PROMO_RE.test(c) ? c : null;
  },
  // Награда из базы → только известные ключи и разумные числа (база проверяет то же — promo_reward_ok)
  promoReward(r) {
    const rw = {};
    for (const [k, n] of Object.entries(r && typeof r === 'object' ? r : {})) {
      const v = Math.floor(+n);
      if (!(v > 0)) continue;
      if (k === 'zlat' || k === 'sparks') rw[k] = Math.min(v, 1000000);
      else if (this.own(ITEMS, k)) rw[k] = Math.min(v, 1000);
    }
    return rw;
  },
  dayNeed(ctx, key) { this.need((this.dayc(ctx)[key] || 0) < Rules.DAILY[key], this.DAY_MSG[key]); },
  dayAdd(ctx, key) { const c = this.dayc(ctx); c[key] = (c[key] || 0) + 1; },
  // 4.16: недельные счётчики (неделя — как у общего дела Ордена, с понедельника) — в прогрессе (weekc)
  weekc(ctx) {
    const w = Ev.week(ctx.now);
    if (!S.d.weekc || S.d.weekc.w !== w) S.d.weekc = { w };
    return S.d.weekc;
  },
  weekUsed(ctx, key) { return this.weekc(ctx)[key] || 0; },
  weekAdd(ctx, key) { const c = this.weekc(ctx); c[key] = (c[key] || 0) + 1; },
  // Канал чата: общий, торговля, разломы, помощь или свой клан (4.28: clan:<ключ мифологии>; до миграции 032 в базе ещё
  // есть сообщения прежних дружин clan:sokol… — их читает serve.js вместе с каналом клана, clanIds)
  chatChannel(ch) {
    if (ch === 'clan') { this.need(clanOf(S.d.clan), ru`Канал клана — для тех, кто в клане`); return 'clan:' + clanOf(S.d.clan); }
    this.need(['all', 'trade', 'raid', 'help'].includes(ch), ru`Такого канала нет`);
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
  // 4.16: a — звёзды пробуждения (действуют у получателя по его уровню Ловчего, S.starsOn)
  // 4.17: c — код духа (плёнка стикера): переходит к новому хозяину вместе с духом
  packSpirit(sp) { return { s: sp.sid, l: sp.lvl, i: sp.iv, y: sp.shiny ? 1 : 0, d: sp.dark ? 1 : 0, n: sp.nick || '', p: sp.purified ? 1 : 0, m: sp.move2 ? 1 : 0, a: sp.stars || 0, c: S.spiritCode(sp) }; },
  unpackSpirit(p, ctx, from, cap = S.maxLvl()) {
    this.need(p && this.own(SP, p.s), ru`Посылка повреждена`);
    const iv = (Array.isArray(p.i) ? p.i : []).slice(0, 3).map(v => U.clamp(Math.floor(+v) || 0, 0, 15));
    while (iv.length < 3) iv.push(0);
    const sp = { uid: U.uid(), sid: p.s, lvl: U.clamp(Math.min(+p.l || 1, cap), 1, 50), iv, t: ctx.now, fav: false, nick: this.cleanText(p.n, 16) || null };
    if (from) sp.from = this.cleanText(from, 20);
    if (p.y) sp.shiny = true;
    if (p.d) sp.dark = true;
    if (p.p) sp.purified = true;
    if (p.m) sp.move2 = true;
    if (p.a) sp.stars = U.clamp(Math.floor(+p.a) || 0, 0, S.AWAKE.MAX);
    if (/^[1-9]\d{7}$/.test(String(p.c || ''))) sp.code = String(p.c);
    return sp;
  },
  // Текст от игрока (имя, кличка духа): без управляющих символов и символов разметки, пробелы схлопнуты
  cleanText(s, max) { return String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/[<>"'`&\\]/g, '').trim().replace(/\s+/g, ' ').slice(0, max); },
  safeLook(lk) {
    lk = lk && typeof lk === 'object' ? lk : {}; // 4.26: только объект
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
    return { name: this.cleanText(b.name, 20) || 'Ловчий', lvl: U.clamp(Math.floor(+b.level) || 1, 1, MAX_LEVEL), clan: clanOf(b.clan), look: this.safeLook(b.look) }; // 4.28: прежняя дружина — её клан
  },
  // 4.28: клан для вступления и перехода: известный (не прежний id дружины) и открытый в этом сезоне Алатыря
  clanCheck(k) {
    this.need(typeof k === 'string' && clanOf(k) === k, ru`Такого клана нет`);
    this.need(clanOpen(k), ru`Этот клан ещё закрыт — он откроется в новом сезоне Алатыря`);
  },
  roomMember() {
    const team = S.team();
    return { pid: S.d.pid, name: String(S.d.name).slice(0, 20), look: this.safeLook(S.d.look), lvl: S.d.level, power: team.reduce((a, x) => a + S.power(x), 0), sid: team[0] ? team[0].sid : null };
  },
  // 4.16: уровень босса совместного разлома — средний уровень Ловчих комнаты (уровни в комнату пишет сервер)
  roomRl(r) { const l = (r.members || []).map(m => U.clamp(Math.floor(+m.lvl) || 1, 1, MAX_LEVEL)); return l.length ? Math.round(l.reduce((a, x) => a + x, 0) / l.length) : 1; },
  roomView(r) {
    return { code: r.code, status: r.status, rift: { ...r.rift, rl: this.roomRl(r) }, isHost: r.host_pid === S.d.pid, hpMul: Raid.coopHp(r.members.length),
      members: r.members.map((m, i) => ({ name: String(m.name || 'Ловчий').slice(0, 20), look: m.look, lvl: m.lvl, power: m.power, sid: m.sid, host: i === 0, me: m.pid === S.d.pid })) };
  },
  // 4.26: союзники в совместном бою — участники комнаты, которые сами вступили в бой (отметка f ставится в raidStart);
  // «мёртвые души» в комнате не уменьшают долю урона. Комнаты не прочитать — как раньше, по комнате на старте
  async coopAllies(ctx, b) {
    const c = b.coop;
    if (!c) return 0;
    const room = c.code ? await ctx.env.roomGet(c.code) : null;
    if (!room || !Array.isArray(room.members)) return c.allies;
    return U.clamp(room.members.filter(m => m && m.pid !== S.d.pid && +m.f > 0).length, 0, c.allies);
  },
  // Защитники Капища в бою — три сильнейших (4.16: только те, кто ещё на посту, и с учётом усталости — Rules.HOLD)
  holdTeam(hold, now = Date.now()) {
    return hold.holders.filter(h => h && h.sp && this.own(SP, h.sp.sid) && Rules.holdFresh(h, now)).map((h, i) => Rules.holdSpirit(this.cleanSpirit(h.sp, i), h.t, now))
      .map(x => ({ x, p: S.power(x) })).sort((a, b) => b.p - a.p).slice(0, 3).map(o => o.x);
  },
  // 4.16: Капище «сейчас»: защитники, чей срок вышел (Rules.HOLD.MAX_H), уже ушли; на вольном Капище кланов нет.
  // null — Капище свободно (бьётся хранитель). 4.28: clan — ключ клана мифологии (до миграции 032 в базе бывают прежние
  // sokol / medved / volk — clanOf); неизвестный клан — Капище как свободное
  liveHold(hold, now, id) {
    if (!hold || Rules.shrineFree(id) || !clanOf(hold.clan)) return null;
    const holders = (hold.holders || []).filter(h => Rules.holdFresh(h, now));
    return holders.length ? { ...hold, clan: clanOf(hold.clan), holders } : null;
  },
  // Три сильнейших духа друга
  topSpirits(d, n = 3) {
    const list = (Array.isArray(d.spirits) ? d.spirits : []).filter(x => x && this.own(SP, x.sid)).map((x, i) => this.cleanSpirit(x, i));
    return list.map(x => ({ x, p: S.power(x) })).sort((a, b) => b.p - a.p).slice(0, n).map(o => o.x);
  },

  /* ---------- Лига: бои с живыми Ловчими (4.16) ---------- */
  // Ход в бою Лиги — вне очереди запросов игрока и без его прогресса (serve.js: body.pvp): бой хранится в базе
  // (league_matches), сторону a/b база определяет по входу игрока — телефон присылает только номер боя и намерения.
  // Запись — с проверкой версии: два Ловчих ходят одновременно, проигравший гонку перечитывает бой и повторяет ход.
  // peek — только досчитать бой (экран Лиги): отметку «на связи» не ставить
  async pvp(op, a, env, now = Date.now(), peek = false) {
    try {
      this.need(op === 'state' || op === 'move', ru`Неизвестное действие`);
      a = a && typeof a === 'object' ? a : {};
      const ins = op === 'move' ? (Array.isArray(a.in) ? a.in.slice(0, 4) : []) : [];
      this.need(op === 'state' || ins.length, ru`Пустой ход`);
      for (let k = 0; k < 6; k++) {
        const m = await env.pvpLoad(String(a.id || ''));
        this.need(m && m.seat && m.state, ru`Бой не найден`);
        const me = m.seat, st = PvP.ensure(m.state), n0 = st.n, res = [];
        let dirty = st !== m.state;
        PvP.advance(st, now);
        if (!st.over && !peek) {
          const x = st.s[me];
          if (ins.length || now - x.seen >= PvP.SEEN_EVERY) { x.seen = now; dirty = true; }
          for (const i of ins) { const r = PvP.act(st, me, i, now); this.need(!r.bad, r.bad); res.push(r.ok ? { ok: 1, got: r.got } : { ign: r.ign }); }
        } else ins.forEach(() => res.push({ ign: 'over' }));
        if (st.n !== n0) dirty = true;
        let ver = m.ver;
        if (dirty) { ver = await env.pvpPut(m.id, m.ver, st, !!st.over); if (ver == null) continue; }
        return { ok: true, id: m.id, seat: me, ver, st: PvP.mask(st, me), res, now }; // 4.26: без скрытого от соперника
      }
      this.fail(ru`Бой занят — повтори`);
    } catch (e) {
      if (e instanceof GameError) return { ok: false, error: e.message, now };
      throw e;
    }
  },
  // Идущий бой игрока (номер) — заодно досчитанный: брошенный обоими бой здесь и закончится
  async leagueLive(ctx) {
    const m = await ctx.env.pvpLive();
    if (!m) return null;
    const r = await this.pvp('state', { id: m.id }, ctx.env, ctx.now, true);
    return r.ok && !r.st.over ? m.id : null;
  },
  // Итоги законченных боёв — в прогресс, ровно один раз (номер боя запоминается в L.done, как расчёты аукциона):
  // жетон, рейтинг (посчитан в самом бою — от рейтингов обоих на момент подбора), награды за лиги, опыт и раны
  async leagueSettle(ctx, board) {
    const L = League.st(), out = [], today = U.today(ctx.now);
    L.done = L.done || {};
    Object.keys(L.done).forEach(k => { if (ctx.now - L.done[k] > 7 * 86400000) delete L.done[k]; });
    for (const m of (await ctx.env.pvpPending()) || []) {
      const st = m.state, me = m.seat;
      if (!st || !st.over || !st.s || !st.s[me]) continue;
      ctx.after.push(() => ctx.env.pvpSettled(m.id));
      if (L.done[m.id]) continue;
      L.done[m.id] = ctx.now;
      const o = st.over, my = st.s[me], foe = st.s[PvP.other(me)], score = o.win === me ? 1 : o.win ? 0 : 0.5;
      L.tickets = Math.max(0, L.tickets - 1); L.n++;
      // с одним и тем же соперником рейтинг меняют первые League.SAME боёв за день; бой прошлого сезона рейтинг не меняет
      const vs = L.vs = L.vs && L.vs.day === today ? L.vs : { day: today, m: {} };
      vs.m[foe.pid] = (vs.m[foe.pid] || 0) + 1;
      const d = m.season === L.season && vs.m[foe.pid] <= League.SAME && o.d && o.d[me] ? +o.d[me].d || 0 : 0;
      const was = L.pts, rank0 = League.rank(was);
      L.pts = U.clamp(L.pts + d, 0, League.MAXPTS);
      const rNew = League.rank(L.pts), rewards = [];
      for (let i = 1; i <= rNew; i++) {
        if (L.got[i]) continue;
        L.got[i] = true;
        rewards.push(...S.giveRewards(LEAGUE_RANKS[i].reward));
        // на рангах 3, 6 и 9 — гарантированный амулет
        if (i % 3 === 0) { const am = S.rollAmulet(1, 'lg' + i); rewards.push({ k: 'amulet', n: 1, label: AMULETS[am].name }); }
      }
      if (rNew > L.best) L.best = rNew;
      if (rNew > (L.peak || 0)) L.peak = rNew;
      // опыт — за первые League.XP_RUNS боёв дня; сдавшемуся и пропавшему из боя — нет
      const fled = score === 0 && (o.why === 'quit' || o.why === 'idle');
      // шаг Летописи «Сразись в поединках Лиги» — за каждый честно сыгранный бой (не только за победу: соперники живые)
      if (!fled) S.progress('league', 1);
      const xp = L.n <= League.XP_RUNS && !fled ? (score === 1 ? League.XP.win : score ? League.XP.draw : League.XP.loss) : 0;
      if (xp) S.addXP(xp);
      // раны: здоровье бойцов после боя посчитал сервер — выше того, что у духа сейчас, оно не станет
      my.team.forEach(f => { const sp = S.findSpirit(f.uid); if (sp) S.setHp(sp, Math.min(S.hpNow(sp, ctx.now), Math.max(0, f.cur) / f.max), ctx.now); });
      L.last = foe.pid;
      J.add('pvp', { win: score, name: String(foe.name || '').slice(0, 20), rank: LEAGUE_RANKS[rNew].name, d: L.pts - was });
      if (board !== false) { const row = { season: L.season, name: S.d.name, pts: L.pts, rank: rNew, level: S.d.level, look: S.d.look }; ctx.after.push(() => ctx.env.leagueScore(row)); }
      out.push({ id: m.id, win: score === 1, draw: score === 0.5, why: o.why, d: L.pts - was, pts: L.pts, rank0, rNew, rewards, xp: Math.round(xp * Ev.xpMul()),
        foe: { name: String(foe.name || '').slice(0, 20), pts: foe.pts | 0, rank: U.clamp(foe.rank | 0, 0, LEAGUE_RANKS.length - 1), look: this.safeLook(foe.look) } });
    }
    return out;
  },
  // Сундук за высшую лигу прошлого сезона (League.norm отметил его при смене сезона)
  leaguePrize() {
    const L = League.st(), p = L.prize;
    if (!p) return null;
    delete L.prize;
    const rw = League.prize(p.rank);
    return rw ? { season: p.season, rank: p.rank, got: S.giveRewards(rw) } : null;
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
      this.need(!S.d, ru`Прогресс уже есть`);
      const name = this.cleanText(a.name, 16);
      this.need(name.length >= 1, ru`Назови себя`);
      this.need(this.STARTERS.includes(a.starter), ru`Выбери первого духа`);
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
        got.push({ k: 'cocoon', n: 1, label: ru`Кокон ${10} км` });
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
      this.need(step && (w === now || w === now - 1), ru`Эта неделя уже закончилась`);
      const mine = S.d.order[w];
      this.need(mine && mine.n >= step.need, ru`Для этой награды внеси в общее дело не меньше ${step.need} очков`);
      this.need(!mine.got.includes(i), ru`Награда уже получена`);
      const s = await this.orderState(ctx, w);
      this.need(s.total >= Math.ceil(step.at * s.goal), ru`Орден ещё не дошёл до этой ступени`);
      mine.got.push(i);
      const got = S.giveRewards(step.reward);
      if (i === Rules.ORDER.STEPS.length - 1 && S.d.cocoons.length < 9) {
        S.d.cocoons.push({ id: U.uid(), km: 10, walked: 0, inc: S.incubating() < 3 });
        got.push({ k: 'cocoon', n: 1, label: ru`Кокон ${10} км` });
      }
      J.add('order', { i });
      return { got };
    },
    // 4.28: общий Алатырь — счёт Ордена, распутанные дороги (последние, для истории) и вклад Ловчего. Грани и вехи
    // телефон считает сам по Rules.alaStage (счёт — из кэша сервера, не старше ~15 с). Сезоны: текущий (season — с числом
    // побед над Кощеем в финале), прошлые (seasons — для летописи: финалы и расколы), вклад Ловчего в сезон (my)
    async alatyr(a, ctx) {
      this.limit(ctx, 'alatyr', 30, 60000);
      const w = typeof ctx.env.alatyrState === 'function' ? await ctx.env.alatyrState() : null;
      const total = Math.max(0, Math.floor(+(w && w.total) || 0));
      const roads = Ev.roadsClean(w && w.roads).sort((x, y) => y.n - x.n);
      const seasons = (Array.isArray(w && w.seasons) ? w.seasons : []).slice(0, 12).map(x => ({ ...Ev.alaClean(x), s: Math.max(1, x.s | 0) }));
      const my = S.alaMine();
      return { total, roads, mine: S.d.alaGiven || 0, now: ctx.now, season: Ev.alaView(), seasons,
        my: { s: my.s, n: my.n | 0, k: my.k | 0, pts: Rules.alaPoints(my) } };
    },

    // 5.1: телепорт через Атлас мира. Первое появление (first и ещё нет S.d.atlasV: новичок или первый вход после 5.1) — даром
    // и без перезарядки; дальше — раз в Rules.MOVE.TP_CD даром или сразу за Врата Перепутицы (Rules.MOVE.TP_ITEM).
    // Врата тратятся только с согласия Ловчего (item: true — Атлас спрашивает). Позиция, место последнего действия (jumpWait), начало отрезка пути и счётчик скорости переставляются в новую точку:
    // без «Слишком быстро», без перезарядки дальнего перемещения и без засчитанных километров
    teleport(a, ctx) {
      const M = Rules.MOVE, lat = +a.lat, lng = +a.lng;
      this.need(typeof a.lat === 'number' && typeof a.lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= M.LAT && Math.abs(lng) <= 180, ru`Такого места нет на карте`);
      this.limit(ctx, 'tp', 30, 3600000);
      const first = a.first === true && !S.d.atlasV;
      let used = null;
      if (!first) {
        const wait = Rules.tpWait(S.d.tpAt, ctx.now);
        if (wait > 0) {
          this.need(a.item === true, ru`Врата откроются через ${Math.ceil(wait / 60000)} мин — или шагни сразу через Врата Перепутицы`);
          this.need((S.d.items[M.TP_ITEM] || 0) > 0, ru`Нет Врат Перепутицы — их можно купить в Лавке`);
          S.d.items[M.TP_ITEM]--; used = M.TP_ITEM;
        } else S.d.tpAt = ctx.now;
      }
      S.d.atlasV = 1;
      ctx.srv.enc = null; // встреча с духом не переезжает вместе с Ловчим
      const p = { lat: +lat.toFixed(6), lng: +lng.toFixed(6) };
      ctx.srv.pos = { ...p, t: ctx.now, acc: 5 };
      ctx.srv.at = { ...p, t: ctx.now };
      ctx.srv.mv = { ...p, t: ctx.now };
      ctx.srv.spd = { pts: [], until: 0, kmh: 0 };
      delete ctx.srv.fastUntil; delete ctx.srv.speedUntil; delete ctx.srv.kmh; delete ctx.srv.pace;
      ctx.pos = { ...p, acc: 5 }; ctx.prevPos = ctx.srv.pos; MapView.pos = ctx.pos;
      S.d.wpos = null; this.keepPos(p);
      return { ok: true, lat: p.lat, lng: p.lng, first, used, cd: Rules.tpWait(S.d.tpAt, ctx.now) };
    },

    // Пройденный путь: точки с отметками времени (5.1: их кладёт джойстик, walk.js). Быстрее бега (Rules.SPEED.MAX) не считается.
    move(a, ctx) {
      const pts = (Array.isArray(a.pts) ? a.pts : []).slice(0, 200)
        .filter(q => Array.isArray(q) && q.length >= 4 && [0, 1, 2, 3].every(i => Number.isFinite(+q[i])))
        .map(q => ({ lat: +q[0], lng: +q[1], t: +q[2], acc: +q[3] })).sort((x, y) => x.t - y.t);
      const last = ctx.srv.mv && ctx.now - ctx.srv.mv.t < 10 * 60000 ? ctx.srv.mv : null;
      // 4.26: точки не старше уже засчитанных (любой давности: повтор той же пачки не засчитается дважды) и рядом с тем,
      // где сервер видел Ловчего до запроса и видит сейчас (Rules.trackNear); отрезок с далёкой точкой не засчитывается
      const floor = ctx.srv.mv ? +ctx.srv.mv.t || 0 : 0, refs = [ctx.prevPos, ctx.pos && { ...ctx.pos, t: ctx.now }].filter(Boolean);
      let prev = last, prevOk = true, m = 0;
      for (const q of pts) {
        if (q.acc > 40 || q.t > ctx.now + 5000 || q.t <= floor || (prev && q.t <= prev.t)) continue;
        const ok = refs.every(r => Rules.trackNear(q, r));
        if (!prev) { prev = q; prevOk = ok; continue; }
        const d = U.dist(prev.lat, prev.lng, q.lat, q.lng), dt = (q.t - prev.t) / 1000;
        if (d < 4) continue;
        if (ok && prevOk && dt > 0 && d / dt <= Rules.SPEED.MAX) m += d; // 4.20: только шагом или бегом (было < 32 км/ч)
        this.pace(ctx, q);
        prev = q; prevOk = ok;
      }
      // не больше, чем можно пробежать с прошлой отметки
      const since = last ? (ctx.now - last.t) / 1000 : 60;
      m = Math.min(m, since * Rules.SPEED.MAX);
      if (prev) ctx.srv.mv = { lat: prev.lat, lng: prev.lng, t: Math.min(prev.t, ctx.now) };
      // 4.26: в зачёт — не больше Rules.TRACK.DAY метров в день (по часам игрока)
      if (m > 0) { const c = this.dayc(ctx); m = Math.min(m, Math.max(0, Rules.TRACK.DAY - (c.walk || 0))); c.walk = (c.walk || 0) + m; }
      if (m > 0) S.addDistance(m);
      return { m, fast: this.speedUntil(ctx) > ctx.now ? (ctx.srv.spd && ctx.srv.spd.kmh) || ctx.srv.kmh || 20 : 0 };
    },

    /* ----- встреча с духом ----- */
    encStart(a, ctx) {
      const kind = a.kind;
      if (kind === 'wild') {
        this.dayNeed(ctx, 'catches');
        this.need(Rules.THROWABLE.some(k => S.d.items[k] > 0), ru`Обереги закончились! Загляни к источнику.`);
        const p = this.here(ctx);
        const e = W.spawnsAround(p.lat, p.lng, W.INTERACT + 80).find(x => x.id === a.id && x.type === 'spirit' && !x.tut);
        this.need(e, ru`Дух уже растворился в воздухе…`);
        this.near(ctx, e.lat, e.lng, W.INTERACT);
        return this.openEnc(ctx, { mode: 'wild', sid: e.sid, lvl: e.lvl, shiny: e.shiny, boost: e.boost, seed: e.id, spawnId: e.id });
      }
      if (kind === 'tut') {
        const st = S.tutAt(); // 4.0: учебный дух — тот, что нужен на текущем шаге обучения
        this.need(st && st.kind === 'catch', ru`Учебный дух сейчас не нужен`);
        return this.openEnc(ctx, { mode: 'tut', sid: st.sid, lvl: Math.min(2, S.catchLvl()), seed: 'tut' + S.d.tut });
      }
      if (kind === 'raid') {
        const r = ctx.srv.raidWin;
        this.need(r, ru`Разлом уже закрылся`);
        ctx.srv.raidWin = null;
        return this.openEnc(ctx, { mode: 'raid', sid: r.sid, lvl: r.lvl, shiny: r.shiny, boost: r.boost, seed: r.rid, charms: r.charms });
      }
      if (kind === 'rescue') {
        const r = ctx.srv.rescue;
        this.need(r, ru`Омрачённый дух уже ушёл`);
        ctx.srv.rescue = null;
        return this.openEnc(ctx, { mode: 'rescue', sid: r.sid, lvl: r.lvl, dark: true, seed: r.seed });
      }
      if (kind === 'task') {
        const m = S.d.taskMeet.find(x => x.id === a.id);
        this.need(m, ru`Встреча за поручение не найдена`);
        return this.openEnc(ctx, { mode: 'task', sid: m.sid, lvl: m.lvl, seed: 'task:' + m.id, taskId: m.id });
      }
      this.fail(ru`Неизвестная встреча`);
    },
    encHoney(a, ctx) {
      const e = ctx.srv.enc;
      this.need(e, ru`Встреча закончилась`);
      this.need(!e.honey, ru`Дух уже лакомится мёдом`);
      this.need(S.useItem('honey'), ru`Мёда нет. Его можно найти у источников.`);
      e.honey = true;
      return { ok: true };
    },
    // Бросок: попадание и кольцо — с телефона (это ловкость игрока), покачивания и побег — решает сервер
    encThrow(a, ctx) {
      const e = ctx.srv.enc;
      this.need(e, ru`Встреча закончилась`);
      // 4.1: бросок с полётом занимает больше секунды — сильно чаще бросает только программа (запас — на скачки сети)
      this.need(!e.lastThrow || ctx.now - e.lastThrow >= 400, ru`Слишком быстро — дух ещё не опомнился`);
      e.lastThrow = ctx.now;
      const raid = e.mode === 'raid';
      let item = 'rift';
      if (raid) { this.need(e.charms > 0, ru`Обереги разлома кончились`); e.charms--; }
      else {
        item = Rules.THROWABLE.includes(a.item) ? a.item : 'charm';
        this.need(S.useItem(item), ru`Обереги этого вида закончились`);
      }
      e.throws++;
      const left = () => raid ? e.charms : Rules.THROWABLE.reduce((n, k) => n + (S.d.items[k] || 0), 0);
      if (!a.hit) {
        if (!left()) return this.encLost(ctx, e, raid ? ru`Обереги кончились — дух вернулся в Навь…` : null, { miss: true });
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
        if (Math.random() < flee) return this.encLost(ctx, e, ru`Дух ускользнул в Навь…`, { wobbles, label: bonus.label });
        if (!left()) return this.encLost(ctx, e, raid ? ru`Обереги кончились — дух вернулся в Навь…` : null, { wobbles, label: bonus.label });
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
      const xp = S.addXP(rw.xp);
      S.progress('catch', 1); S.progress('catchEl', 1, { el: s.el });
      if (e.mode === 'tut') S.tutAdvance('catch');
      if (e.mode === 'task') S.d.taskMeet = S.d.taskMeet.filter(x => x.id !== e.taskId); // сбежать не может — встреча ждёт, пока дух не пойман
      ctx.srv.enc = null;
      return { wobbles: 3, caught: true, label: bonus.label, uid: sp.uid, isNew, xp, sparks: rw.sparks, ess: rw.ess };
    },
    encEnd(a, ctx) { ctx.srv.enc = null; return { ok: true }; },

    /* ----- источник ----- */
    async spring(a, ctx) {
      const p = await this.place(a.poi, ctx, 'spring');
      this.placeAwake(p, 'spring', ctx.now);
      this.near(ctx, p.lat, p.lng, W.INTERACT);
      this.limit(ctx, 'spring', 60, 3600000);
      this.dayNeed(ctx, 'springs');
      const e = W.springFor(p, 0);
      this.need(!e.invaded, ru`Источник захвачен Навью`);
      this.need(e.ready, ru`Источник ещё набирает силу`);
      S.d.springs[p.id] = ctx.now;
      this.dayAdd(ctx, 'springs');
      const sl = W.springLoot(p.id), loot = { ...sl.loot };
      // 4.26: место, которого нет в базе (id и координаты — от телефона, вне загруженных мест): добыча вполовину, без кокона
      if (!p.verified) Object.keys(loot).forEach(k => { loot[k] = Math.ceil(loot[k] / 2); });
      const cocoon = p.verified ? sl.cocoon : 0;
      // 4.16: источник открывается и при полной сумке — опыт, кокон и поручение сразу, а вещи, которым нет места, ждут в посылке Ордена
      const got = S.giveRewards({ ...loot, xp: 50 }); // не поместилось — в посылку Ордена
      S.d.stats.springs++;
      S.progress('spring', 1);
      let coc = null;
      if (cocoon) { coc = { id: U.uid(), km: cocoon, walked: 0, inc: S.incubating() < 3 }; S.d.cocoons.push(coc); }
      S.tutAdvance('spring');
      // поручение: первое за день — всегда, дальше — в каждом четвёртом источнике
      let task = null;
      if (!S.d.tut && S.d.tasks.length < TASK_LIMIT && (S.d.taskDay !== U.today(ctx.now) || Math.random() < 0.25)) {
        S.d.taskDay = U.today(ctx.now);
        task = S.makeTask(p); // 4.16: трудное поручение может позвать «гостя издалека» — духа, которого здесь не встретить
        S.d.tasks.push(task);
      }
      return { got, cocoon: coc, task, full: S.bagCount() >= S.bagLimit() };
    },
    // 4.15: вылечить духа предметом из сумки (Подорожник, Целебный отвар, Мёртвая вода, Живая вода)
    heal(a, ctx) {
      const sp = S.findSpirit(a.uid);
      this.need(sp, ru`Дух не найден`);
      const k = String(a.k || ''), err = S.heal(sp, k);
      this.need(!err, err);
      return { uid: sp.uid, hp: S.hpNow(sp), ko: S.koLeft(sp), left: S.d.items[k] || 0 };
    },
    incense(a, ctx) {
      this.need(!S.incenseActive(), ru`Ладан ещё горит`);
      this.need(S.useItem('incense'), ru`Ладана нет`);
      S.d.incenseUntil = ctx.now + 30 * 60000;
      return { until: S.d.incenseUntil };
    },
    // 4.16: Настой опыта — Rules.XP_BREW.MUL опыта на XP_BREW.H часов (множитель — в Ev.xpMul)
    xpBrew(a, ctx) {
      this.need(!(S.d.xpUntil > ctx.now), ru`Настой опыта ещё действует`);
      this.need(S.useItem('xpbrew'), ru`Настоя опыта нет`);
      S.d.xpUntil = ctx.now + Rules.XP_BREW.H * 3600000;
      return { until: S.d.xpUntil };
    },
    // Выбросить предметы из сумки (освободить место)
    discard(a) {
      const k = String(a.k || ''), have = (this.own(ITEMS, k) && S.d.items[k]) || 0, n = Math.floor(+a.n);
      this.need(have > 0, ru`Такого предмета в сумке нет`);
      this.need(n >= 1 && n <= have, ru`Можно выбросить от 1 до ${have}`);
      S.d.items[k] -= n;
      return { k, n, left: S.d.items[k] };
    },
    // 4.16: забрать из посылки Ордена то, что влезет в сумку; drop — выбросить посылку целиком
    parcelTake(a) {
      this.need(S.parcelCount() > 0, ru`Посылка Ордена пуста`);
      if (a.drop) { const n = S.parcelCount(); S.d.parcel = null; return { got: [], dropped: n, left: 0 }; }
      this.need(S.bagCount() < S.bagLimit(), ru`Сумка полна — освободи место, чтобы забрать посылку`);
      const got = S.parcelTake();
      return { got, left: S.parcelCount() };
    },
    // 4.16: переплавка амулетов: три одинаковых → один на выбор (за искры)
    amuletMelt(a) {
      const from = String(a.from || ''), to = String(a.to || ''), err = S.canMeltAmulet(from, to);
      this.need(!err, err);
      S.meltAmulet(from, to);
      J.add('melt', { from, to });
      return { from, to, left: S.d.amulets[from] || 0, have: S.d.amulets[to] || 0 };
    },
    supply(a, ctx) {
      this.need(S.d.supplyDay !== U.today(), ru`Посылка сегодня уже была`);
      S.d.supplyDay = U.today();
      return { got: S.giveRewards(Rules.SUPPLY) };
    },
    photo(a, ctx) { this.limit(ctx, 'photo', 20, 3600000); S.progress('photo', 1); return { ok: true }; },

    /* ----- коллекция ----- */
    fav(a) { const sp = this.spirit(a.uid); sp.fav = !!a.on; return { ok: true }; },
    // 4.17: содрать плёнку с оборота стикера — дух привязан к Ловчему навсегда (на аукцион его уже не выставить)
    spiritBind(a, ctx) {
      const sp = this.spirit(a.uid);
      this.need(!sp.bound, ru`Плёнка уже содрана — дух и так привязан к тебе`);
      sp.bound = ctx.now;
      S.d.stats.bound = (S.d.stats.bound || 0) + 1;
      return { ok: true };
    },
    nick(a) {
      const sp = this.spirit(a.uid), v = this.cleanText(a.nick, 16);
      sp.nick = v && v !== SP[sp.sid].name ? v : null;
      return { ok: true };
    },
    release(a) {
      const uids = [...new Set((Array.isArray(a.uids) ? a.uids : [a.uid]).map(String))];
      uids.forEach(u => this.spirit(u));
      this.need(uids.length < S.d.spirits.length, ru`Нельзя отпустить всех духов`);
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
    // 4.16: пробуждение (звезда поднимает предел уровня духа) и эссенция Рода (переплавка лишней эссенции и вливание в любое семейство)
    awaken(a) { const sp = this.spirit(a.uid), err = S.canAwaken(sp); this.need(!err, err); S.awaken(sp); return { stars: sp.stars, max: S.maxLvl(sp) }; },
    essMelt(a) { const fam = String(a.fam || ''), n = Math.floor(+a.n), err = S.canMelt(fam, n); this.need(!err, err); S.melt(fam, n); return { rod: S.d.rod, left: S.d.essence[fam] }; },
    essPour(a) { const fam = String(a.fam || ''), n = Math.floor(+a.n), err = S.canPour(fam, n); this.need(!err, err); S.pour(fam, n); return { rod: S.d.rod, ess: S.d.essence[fam] }; },
    equip(a) {
      const sp = this.spirit(a.uid);
      this.need(this.own(AMULETS, a.k) && S.d.amulets[a.k] > 0, ru`Такого амулета нет`);
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
      this.need(c && e && m && k && g && fr, ru`Такого облика нет`);
      this.need(!k.shop || S.d.owned[`skin:${k.id}`], ru`Этот облик продаётся в Гардеробе`);
      this.need(!g.shop || S.d.owned[`bg:${g.id}`], ru`Этот фон продаётся в Гардеробе`);
      this.need(!fr.shop || S.d.owned[`frame:${fr.id}`], ru`Эта рамка продаётся в Гардеробе`);
      this.need((g.lvl || 1) <= lvl && (fr.lvl || 1) <= lvl, ru`Этот облик ещё не открыт`);
      this.need(c.lvl <= lvl && e.lvl <= lvl && m.lvl <= lvl, ru`Этот облик ещё не открыт`);
      this.need(!m.league || League.st().best >= m.league, ru`Венец Лиги — награда за ранг «Хранитель Лиги»`);
      this.need((!c.shop && !c.pass) || S.d.owned[c.c], c.shop ? ru`Этот плащ продаётся в Лавке Ордена` : ru`Этот плащ — награда Золотой тропы`);
      this.need(!m.pass || S.d.owned[m.id], ru`Знак Тропы — награда Золотой тропы`);
      S.d.look = { cloak: c.c, eyes: e.c, emblem: m.id };
      if (k.id !== 'hood') S.d.look.skin = k.id;
      if (g.id !== 'night') S.d.look.bg = g.id;
      if (fr.id !== 'none') S.d.look.frame = fr.id;
      return { ok: true };
    },

    /* ----- коконы ----- */
    warm(a) {
      const c = S.d.cocoons.find(x => x.id === a.id);
      this.need(c && !c.inc, ru`Кокон не найден`);
      this.need(S.incubating() < 3, ru`Греть можно три кокона одновременно`);
      c.inc = true;
      return { ok: true };
    },
    hatch(a) {
      const c = S.d.cocoons.find(x => x.id === a.id);
      this.need(c && c.inc && c.walked >= c.km, ru`Кокон ещё не готов`);
      const r = S.hatch(c);
      return { uid: r.sp.uid, sid: r.sp.sid, isNew: r.isNew, essence: r.essence, sparks: r.sparks, km: c.km };
    },

    /* ----- задания и Летопись ----- */
    questClaim(a) {
      const q = S.d.quests.list[a.i | 0];
      this.need(q && q.p >= q.n && !q.claimed, ru`Задание ещё не выполнено`);
      q.claimed = true;
      return { got: S.giveRewards({ ...q.reward, xp: Rules.QUEST_XP }) };
    },
    questBonus() {
      const Q = S.d.quests;
      this.need(Q.list.every(q => q.claimed) && !Q.bonus, ru`Сундук ещё закрыт`);
      Q.bonus = true;
      return { got: S.giveRewards({ ...Rules.QUEST_BONUS, xp: Rules.QUEST_BONUS_XP, zlat: Rules.ZLAT.questBonus }) };
    },
    // 4.0: разделы обучения засчитываются строго по порядку; пропустить обучение нельзя
    tutNext(a) {
      const st = S.tutAt();
      this.need(st, ru`Обучение уже пройдено`);
      this.need(st.kind === 'ui' && st.id === a.id, ru`Сначала выполни текущий шаг обучения`);
      return S.tutAdvance(st.kind, st.id);
    },
    tutFinish() { this.need(false, ru`Обучение нельзя пропустить`); },
    // Поручение выполнено: предметы сразу, дух — во встрече (ждёт в «Заданиях», пока не пойман)
    taskClaim(a) {
      const q = S.d.tasks.find(x => x.id === a.id);
      this.need(q && q.p >= q.n, ru`Поручение ещё не выполнено`);
      this.need(S.d.taskMeet.length < TASK_LIMIT, ru`Сначала встреть духов за прошлые поручения`);
      S.d.tasks = S.d.tasks.filter(x => x !== q);
      const T = TASK_TIERS[q.tier];
      const got = S.giveRewards({ ...T.reward, xp: 250 * q.tier });
      const m = { id: q.id, sid: q.sid, lvl: Math.min(T.lvl, S.catchLvl()) };
      S.progress('task', 1);
      S.d.taskMeet.push(m);
      return { got, meet: m };
    },
    taskDrop(a) {
      const n = S.d.tasks.length;
      S.d.tasks = S.d.tasks.filter(x => x.id !== a.id);
      this.need(S.d.tasks.length < n, ru`Поручение не найдено`);
      return { ok: true };
    },
    async placeRewards(a, ctx) {
      const rows = await ctx.env.mySubmissions();
      const out = [];
      rows.filter(r => r.status !== 'pending' && !S.d.props[r.id]).forEach(r => {
        S.d.props[r.id] = r.status;
        out.push({ name: r.name, status: r.status, reason: r.reason, got: r.status === 'approved' ? S.giveRewards(Rules.PLACE_REWARD, true, true) : [] });
      });
      return { list: out };
    },

    /* ----- бои: разлом ----- */
    async raidStart(a, ctx) {
      this.need(S.d.level >= RAID_LEVEL, ru`Разломы открываются с ${RAID_LEVEL} уровня Ловчего`); // 4.18
      // совместный бой: число союзников и место разлома — из комнаты на сервере, а не со слов телефона
      let coop = null, rift = a.rift;
      if (a.coop && a.coop.code) {
        const room = await ctx.env.roomGet(String(a.coop.code).toUpperCase());
        this.need(room && room.status === 'started' && ctx.now - Date.parse(room.started_at) < 10 * 60000, ru`Совместный бой не найден — начните заново`);
        this.need(room.members.some(m => m.pid === S.d.pid), ru`Ты не в этом разломе`);
        coop = { host: room.host_pid === S.d.pid, allies: U.clamp(room.members.length - 1, 0, 3), code: room.code, rl: this.roomRl(room) };
        rift = { id: room.rift.poi, lat: room.rift.lat, lng: room.rift.lng, name: room.rift.place };
      }
      const p = await this.place(rift, ctx, 'shrine');
      const hour = Math.floor(ctx.now / 3600000);
      // бой мог начаться за минуту до смены часа
      const r = W.riftFor(p, 0, hour) || (ctx.now % 3600000 < 90000 ? W.riftFor(p, 0, hour - 1) : null);
      if (!r) this.placeAwake(p, 'shrine', ctx.now); // 5.2: место уснуло — так и сказать
      this.need(r, ru`Разлом уже закрылся`);
      this.need(p.verified || r.tier < 3, ru`Легендарные разломы открываются только у мест, известных Ордену`);
      this.need(!S.d.rifts[r.id], ru`Этот разлом ты уже закрыл`);
      // дальний бой: вместо того чтобы подойти — грамота Ордена (до Rules.FAR.R от игрока)
      let far = !coop && !!a.far;
      // 4.26: гость совместного боя — тоже у Разлома (раньше мог вступить откуда угодно), а дальше W.BATTLE_R — по Дальнему пропуску
      if (coop && !coop.host) { const me = this.here(ctx); far = U.dist(me.lat, me.lng, p.lat, p.lng) > W.BATTLE_R + Math.min(me.acc, 30) + 10; }
      if (far) {
        this.near(ctx, p.lat, p.lng, Rules.FAR.R);
        this.need((S.d.items.farpass || 0) > 0, ru`Нужен Дальний пропуск — его можно купить в Лавке`);
      } else this.near(ctx, p.lat, p.lng, W.BATTLE_R);
      const team = S.team();
      this.need(team.length, ru`Нужна команда`);
      this.readyTeam(team);
      this.dayNeed(ctx, 'raids'); // до списания Дальнего пропуска
      // 4.26: у места, которого нет в базе, — только малые Разломы (легендарные — см. выше)
      this.need(p.verified || r.tier < 2, ru`Здесь только малые бои — место неизвестно Ордену`);
      this.limit(ctx, 'raid', 30, 3600000);
      // 4.26: отметка в комнате «я в бою» — союзником в raidEnd считается только тот, кто сам вступил в бой
      if (coop) { this.shared(ctx); await ctx.env.roomJoin(coop.code, { ...this.roomMember(), f: ctx.now }); }
      if (far) S.d.items.farpass--;
      // 4.16: босс — по уровню Ловчего (в совместном — по среднему уровню комнаты); rl телефон считает так же (Raid.bossStats)
      const rl = coop ? coop.rl : S.catchLvl();
      // 4.26: hp0 — здоровье бойцов на входе (Rules.raidWinnable)
      // 4.28: fin — Разлом финала сезона Алатыря (Кощей): победа идёт в общий счёт побед над ним
      ctx.srv.battle = { type: 'raid', rid: r.id, poi: p, tier: r.tier, boss: r.boss, rl, start: ctx.now, team: team.map(x => x.uid), hp0: this.hpMap(team), coop, waters: 0, far, tire: true, fin: r.fin || 0 };
      return { rid: r.id, tier: r.tier, boss: r.boss, rl, far, fin: r.fin || 0 };
    },
    /* ----- совместный разлом: комната на сервере ----- */
    async roomCreate(a, ctx) {
      this.need(S.d.level >= RAID_LEVEL, ru`Разломы открываются с ${RAID_LEVEL} уровня Ловчего`);
      const p = await this.place(a.rift, ctx, 'shrine');
      this.placeAwake(p, 'shrine', ctx.now);
      const r = W.riftFor(p, 0, Math.floor(ctx.now / 3600000));
      this.need(r, ru`Разлом уже закрылся`);
      this.need(p.verified || r.tier < 3, ru`Легендарные разломы открываются только у мест, известных Ордену`);
      this.need(!S.d.rifts[r.id], ru`Этот разлом ты уже закрыл`);
      this.near(ctx, p.lat, p.lng, W.BATTLE_R);
      this.need(p.verified || r.tier < 2, ru`Здесь только малые бои — место неизвестно Ордену`); // 4.26
      this.limit(ctx, 'room', 20, 3600000);
      const rift = { id: r.id, tier: r.tier, boss: r.boss, endsAt: r.endsAt, poi: p.id, lat: p.lat, lng: p.lng, place: p.name }; // как у разлома на карте
      this.shared(ctx);
      for (let i = 0; i < 5; i++) {
        const code = U.code(5, this.ROOM_ALPHA);
        const room = await ctx.env.roomCreate({ code, host_pid: S.d.pid, rift, members: [this.roomMember()] });
        if (room) return this.roomView(room);
      }
      this.fail(ru`Не получилось создать разлом — попробуй ещё раз`);
    },
    async roomJoin(a, ctx) {
      this.need(S.d.level >= RAID_LEVEL, ru`Разломы открываются с ${RAID_LEVEL} уровня Ловчего`);
      const code = String(a.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      this.need(code.length === 5, ru`Код разлома — 5 символов`);
      this.limit(ctx, 'roomJoin', 60, 3600000);
      this.shared(ctx);
      const r = await ctx.env.roomJoin(code, this.roomMember());
      this.need(r && !r.error, (r && r.error) || ru`Разлом с таким кодом не найден`);
      return this.roomView(r);
    },
    async roomState(a, ctx) {
      const r = await ctx.env.roomGet(String(a.code || '').toUpperCase());
      this.need(r && r.status !== 'closed', ru`Хозяин закрыл разлом`);
      this.need(r.members.some(m => m.pid === S.d.pid), ru`Ты больше не в этом разломе`);
      return this.roomView(r);
    },
    async roomStart(a, ctx) {
      const code = String(a.code || '').toUpperCase(), r = await ctx.env.roomGet(code);
      this.need(r && r.host_pid === S.d.pid, ru`Начать бой может только хозяин разлома`);
      this.need(r.members.length >= 2, ru`Ждём хотя бы одного друга`);
      this.shared(ctx);
      const s = await ctx.env.roomStart(code, S.d.pid);
      this.need(s, ru`Бой уже начался`);
      return this.roomView(s);
    },
    async roomLeave(a, ctx) {
      const code = String(a.code || '').toUpperCase();
      if (/^[A-Z0-9]{5}$/.test(code)) await ctx.env.roomLeave(code, S.d.pid);
      return { ok: true };
    },

    water(a, ctx) {
      const b = ctx.srv.battle;
      this.need(b && b.type === 'raid', ru`Живая вода — только в бою`);
      this.need(b.waters < 3, ru`За бой можно выпить не больше 3 флаконов`);
      this.need(S.useItem('water'), ru`Живой воды нет`);
      b.waters++;
      return { left: S.d.items.water || 0 };
    },
    async raidEnd(a, ctx) {
      const b = this.endBattle(ctx, 'raid');
      if (!a.win) { this.woundTeam(b, a.hp); return { win: false }; }
      const t = Math.min(90, this.battleTime(ctx, b)), team = this.team(b.team);
      // 4.16: в совместном бою урон союзников сервер не видит — от каждого нужна хотя бы половина своей доли.
      // 4.26: здоровье босса — по числу Ловчих в комнате на старте, а доля — только на тех, кто сам вступил в бой (coopAllies)
      const allies = await this.coopAllies(ctx, b), n = allies + 1, hpMul = b.coop ? Raid.coopHp(b.coop.allies + 1) : 1;
      const need = Raid.bossStats(b).hp * hpMul / n * (n > 1 ? 0.5 : 1);
      this.woundTeam(b, a.hp, Rules.raidMinLoss(team, b, need), 5); // 4.26: раны после победы — не меньше, чем наверняка нанёс босс
      this.need(t >= 2 && Rules.raidMaxDamage(team, b, t) >= need, ru`Бой не засчитан: слишком быстрая победа`);
      // 4.26: и команда могла выстоять, пока наносила этот урон (как Rules.duelWinnable на Капищах)
      this.need(Rules.raidWinnable(team, b, need, b.hp0, b.waters), ru`Бой не засчитан: эта команда не могла победить такого соперника`);
      S.d.rifts[b.rid] = true;
      const tier = b.tier;
      J.add('raid', { sid: b.boss, tier, coop: allies });
      S.d.stats.raids++;
      this.dayAdd(ctx, 'raids');
      S.progress('raid', 1);
      if (allies > 0) S.progress('coop', 1);
      // 4.16: меньше лечебного, мёда и амулетов (было ✦ 400 × ступень, мёда 2 + ступень, Живой воды 2 за каждую победу,
      // амулет с шансом 25/40/70%) — к 40 уровню копились сотни флаконов и амулетов
      const rw = S.giveRewards({ xp: Math.round(1000 * tier * (allies ? 1.25 : 1)), sparks: 350 * tier, charm: 5, honey: tier, herb: tier === 1 ? 1 : 0, water: tier >= 2 ? 1 : 0, charm2: tier >= 2 ? 3 : 0 });
      const am = S.rollAmulet([0.05, 0.12, 0.3][tier - 1], b.rid);
      rw.push(...S.riftSpoils(b.boss, tier)); // 4.16: эссенция семейства босса (и легенд) и осколки Алатыря
      if (am) rw.push({ k: 'amulet', n: 1, label: AMULETS[am].name });
      // 4.28: финал сезона Алатыря — победа над Кощеем: в вклад Ловчего за сезон и (после сохранения) в общий счёт побед
      let fin = 0;
      if (b.fin && b.boss === 'koschey') {
        const my = S.alaMine();
        if (my.s === b.fin) { my.k = (my.k | 0) + 1; fin = b.fin; }
        if (fin && typeof ctx.env.alatyrKill === 'function') ctx.after.push(() => ctx.env.alatyrKill(fin));
      }
      const bonus = Math.max(0, Math.floor((90 - t) / 15));
      const charms = Raid.TIER[tier].charms + bonus + (Ev.cur.rifts ? 3 : 0) + allies * 2;
      const shiny = U.h('rshiny', b.rid, S.d.created) < Sky.shinyRate(1 / 20);
      ctx.srv.raidWin = { rid: b.rid, sid: b.boss, lvl: Math.min(Raid.TIER[tier].lvl, S.catchLvl()), // 4.15: пойманный дух — не выше уровня Ловчего
        charms, shiny, boost: Sky.boosted(SP[b.boss].el) };
      return { win: true, rw, charms, bonus, allies, fin };
    },

    /* ----- бои: капище и вторжение ----- */
    async duelStart(a, ctx) {
      this.need(S.d.level >= DUEL_LEVEL, ru`Капища открываются с ${DUEL_LEVEL} уровня Ловчего`);
      const p = await this.place(a.shrine, ctx, 'shrine');
      this.placeAwake(p, 'shrine', ctx.now);
      this.need(!W.riftAt(p.id, Math.floor(ctx.now / 3600000)), ru`Сейчас здесь открыт Разлом`);
      const e = W.shrineFor(p, 0);
      this.need(!e.won, ru`Сегодня ты уже победил здесь`);
      this.near(ctx, p.lat, p.lng, W.BATTLE_R);
      const team = S.team();
      this.need(team.length, ru`Нужна команда`);
      this.readyTeam(team);
      // Капище держит клан — сражаться придётся с его защитниками (тремя сильнейшими)
      const hold = this.liveHold(await ctx.env.holdGet(p.id), ctx.now, p.id);
      this.need(!hold || !S.d.clan || hold.clan !== S.d.clan, ru`Капище держит твой клан — здесь можно поставить защитника`);
      const ht = hold ? this.holdTeam(hold, ctx.now) : [], foe = ht.length ? ht : null;
      this.dayNeed(ctx, 'duels');
      this.need(p.verified || e.tier < 2, ru`Здесь только малые бои — место неизвестно Ордену`); // 4.26: у места не из базы — только Капища «Ученика»
      this.limit(ctx, 'duel', 40, 3600000);
      ctx.srv.battle = { type: 'duel', id: e.id, tier: e.tier, name: e.name, start: ctx.now, team: team.map(x => x.uid), hp0: this.hpMap(team), tire: true,
        foe, hold: hold ? { clan: hold.clan, ver: hold.ver } : null };
      return { id: e.id, tier: e.tier, foe, clan: hold ? hold.clan : null, holders: hold ? hold.holders.map(h => String(h.name || 'Ловчий').slice(0, 20)) : null };
    },
    async duelEnd(a, ctx) {
      const b = this.endBattle(ctx, 'duel');
      if (!a.win) { this.woundTeam(b, a.hp); return { win: false }; }
      const e = { id: b.id, tier: b.tier, name: b.name };
      const g = b.foe ? null : W.guardian(e); // 4.16: у хранителя свой темп (W.foeSpeed)
      const foe = b.foe || g.team, speed = g ? g.speed : SHRINE_TIERS[e.tier].speed;
      this.woundTeam(b, a.hp, Rules.duelMinLoss(this.team(b.team), foe, speed), Duel.HPX); // 4.26: раны после победы — не меньше наверняка нанесённых
      this.plausibleDuel(ctx, b, foe, speed);
      const T = SHRINE_TIERS[e.tier], mul = Ev.duelMul(), t = e.tier;
      S.d.shrines[e.id] = U.today();
      let freed = false;
      if (b.hold) {
        this.shared(ctx);
        freed = await ctx.env.holdDefeat(e.id, b.hold.ver); // защитники могли смениться за время боя — тогда Капище не освобождается
        if (freed) S.d.stats.freed = (S.d.stats.freed || 0) + 1;
      }
      J.add('duel', { name: e.name, guard: b.hold ? CLANS[b.hold.clan].name : W.guardian(e).name, tier: t });
      S.d.stats.duels++;
      this.dayAdd(ctx, 'duels');
      S.progress('duel', 1);
      // 4.16: вместо 2 Живой воды за каждую победу — подорожник (на 3 ступени — Живая вода), мёда меньше, амулет реже (было 15% × ступень)
      const rw = S.giveRewards({ xp: T.xp * mul, sparks: T.sparks * mul, charm: 5 * mul, honey: (t - 1) * mul, herb: t < 3 ? 1 : 0, water: t === 3 ? 1 : 0, charm2: t >= 2 ? 3 * mul : 0, charm3: t === 3 ? 2 * mul : 0 });
      const am = S.rollAmulet(0.04 * t, e.id);
      rw.push(...S.alatyrDrop('duel', t)); // 4.16: хранитель-старейшина иногда отдаёт осколок Алатыря
      if (am) rw.push({ k: 'amulet', n: 1, label: AMULETS[am].name });
      return { win: true, rw, freed, clan: b.hold ? b.hold.clan : null };
    },

    /* ----- Лавка Ордена ----- */
    shopBuy(a, ctx) {
      const today = U.today(ctx.now), id = String(a.id || '');
      let it;
      if (a.deal) {
        it = Rules.shopDeal(today);
        this.need(S.d.shop.deal !== today, ru`Товар дня уже куплен — завтра будет новый`);
      } else if (/^(skin|bg|frame):/.test(id)) { // 4.6: облик-скин, фон или рамка из Гардероба
        const [kind, key] = id.split(':'), x = LOOK[kind].find(k => k.id === key && k.shop);
        this.need(x, ru`Такого облика нет`);
        this.need(!S.d.owned[id], ru`Это уже твоё`);
        it = { id, name: kind === 'skin' ? ru.k`Облик «${x.name}»` : kind === 'bg' ? ru.k`Фон «${x.name}»` : ru.k`Рамка «${x.name}»`, cur: 'zlat', price: x.shop, look: id };
      } else if (id.startsWith('look:')) {
        const key = id.slice(5), x = LOOK.cloak.find(c => c.c === key && c.shop);
        this.need(x, ru`Такого товара нет`);
        this.need(!S.d.owned[key], ru`Этот плащ уже твой`);
        it = { id, name: ru.k`Плащ «${x.name}»`, cur: 'zlat', price: x.shop, look: key };
      } else {
        it = Rules.SHOP.find(x => x.id === id);
        this.need(it, ru`Такого товара нет`);
      }
      if (it.bag) {
        this.need(S.d.bagExtra < Rules.BAG_MAX_UP, ru`Сумка уже расширена до предела`);
        it = { ...it, price: Rules.bagPrice(S.d.bagExtra) };
      }
      this.need(!it.lvl || S.d.level >= it.lvl, ru`Откроется на ${it.lvl} уровне`);
      if (it.day) this.need((this.dayc(ctx)['shop:' + it.id] || 0) < it.day, ru`Сегодня уже куплено — приходи завтра`); // 4.15.1: редкий товар — сколько-то раз в день
      if (it.week) this.need(this.weekUsed(ctx, 'shop:' + it.id) < it.week, ru`На этой неделе уже куплено — приходи в понедельник`); // 4.16: и сколько-то раз в неделю
      if (it.cocoon) this.need(S.d.cocoons.length < 9, ru`Коконов уже девять — выведи кого-нибудь`);
      if (it.give) {
        const n = Object.values(it.give).reduce((s, x) => s + x, 0);
        this.need(S.bagCount() + n <= S.bagLimit(), ru`Сумка полна — освободи место или расширь её`);
      }
      const key = it.cur === 'sparks' ? 'sparks' : 'zlat';
      this.need((S.d[key] || 0) >= it.price, key === 'sparks' ? ru`Не хватает искр` : ru`Не хватает монет`);
      this.limit(ctx, 'shop', 120, 3600000);
      S.d[key] -= it.price;
      let got;
      if (it.bag) { S.d.bagExtra++; got = [{ k: 'bag', n: Rules.BAG_STEP, label: ru`Мест в сумке` }]; }
      else got = this.grant({ ...(it.give || {}), cocoon: it.cocoon || 0, amulet: it.amulet ? 1 : 0, look: it.look || null });
      if (a.deal) S.d.shop.deal = today;
      if (it.day) this.dayAdd(ctx, 'shop:' + it.id);
      if (it.week) this.weekAdd(ctx, 'shop:' + it.id);
      J.add('shop', { name: it.name });
      return { got, price: it.price, cur: key };
    },

    // Казна: начислить оплаченные наборы монет. Номер оплаты запоминается в прогрессе (paid) —
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
        S.d.payNew = (S.d.payNew || 0) + zlat; // 4.22: игра покажет «+N монет» при входе (начислить мог и сам сервер)
        J.add('pay', { zlat });
      }
      if (rows.length) ctx.after.push(() => ctx.env.payCredited(rows.map(r => r.id)));
      return { zlat, n: packs.length };
    },
    // 4.26: оплату вернули (refunded) — начисленные по ней монеты списываются; счёт может уйти в минус (тратить нечего,
    // пока не пополнится). Зовёт сам сервер по уведомлению ЮKassa; список — только из базы, повтор безопасен
    async payRefund(a, ctx) {
      const rows = ctx.env.refundList ? await ctx.env.refundList() : [];
      S.d.refunded = S.d.refunded || {};
      let zlat = 0;
      for (const r of rows) {
        if (S.d.refunded[r.id]) continue;
        S.d.refunded[r.id] = 1;
        zlat += r.zlat;
      }
      if (zlat) S.d.zlat = (S.d.zlat || 0) - zlat;
      if (rows.length) ctx.after.push(() => ctx.env.payDebited(rows.map(r => r.id)));
      return { zlat: -zlat };
    },
    // 4.22: игрок увидел «+N монет» из Казны
    payAck() { delete S.d.payNew; return {}; },
    // 5.x: промокод — награда один раз на учётную запись. Код гасит база (promo_redeem: есть ли, включён, сроки, лимит,
    // не вводил ли этот игрок — одной транзакцией), награда пишется в прогресс, а после сохранения база отмечает её выданной
    // (promo_done). Введённые коды помнит и прогресс (promo): не сохранилось — повторный ввод выдаст награду («again»),
    // сохранилось, а отметка не дошла до базы, — «уже вводил». Перебор кодов — не больше 10 попыток в час
    async promo(a, ctx) {
      const code = this.promoCode(a.code);
      this.need(code, ru`Такого промокода нет`);
      this.limit(ctx, 'promo', 10, 3600000, ru`Слишком много попыток — попробуй через час`);
      const mine = S.d.promo = S.d.promo && typeof S.d.promo === 'object' ? S.d.promo : {};
      if (this.own(mine, code)) {
        // отказ не сохраняет прогресс и не выполняет after — отметку в базе (если прошлая не дошла) ставим сразу
        if (ctx.env && typeof ctx.env.promoDone === 'function') { try { await ctx.env.promoDone(code); } catch (e) {} }
        this.fail(this.PROMO_MSG.already);
      }
      this.need(ctx.env && typeof ctx.env.promo === 'function', this.PROMO_MSG.off);
      this.shared(ctx);
      const r = (await ctx.env.promo(code)) || { error: 'not_found' };
      if (r.error) this.fail(this.own(this.PROMO_MSG, r.error) ? this.PROMO_MSG[r.error] : this.PROMO_MSG.not_found);
      const got = S.giveRewards(this.promoReward(r.reward));
      mine[code] = ctx.now;
      J.add('promo', { code, zlat: (got.find(x => x.k === 'zlat') || {}).n || 0 });
      ctx.after.push(() => ctx.env.promoDone(code));
      Bus.emit('promo', { code, got });
      return { code, got };
    },
    // Обменник: искры → монеты, по курсу Rules.EXCHANGE и не больше DAY обменов в день
    exchange(a, ctx) {
      const E = Rules.EXCHANGE, today = U.today(ctx.now), n = Math.floor(+a.n);
      const ex = S.d.shop.ex && S.d.shop.ex.day === today ? S.d.shop.ex : (S.d.shop.ex = { day: today, n: 0 });
      this.need(n >= 1 && ex.n + n <= E.DAY, ex.n >= E.DAY ? ru`Обменник на сегодня закрыт — приходи завтра` : ru`Сегодня можно обменять ещё ${E.DAY - ex.n} раз`);
      this.need(S.d.sparks >= E.SPARKS * n, ru`Не хватает искр`);
      S.d.sparks -= E.SPARKS * n;
      S.d.zlat = (S.d.zlat || 0) + E.ZLAT * n;
      ex.n += n;
      J.add('exchange', { sparks: E.SPARKS * n, zlat: E.ZLAT * n });
      return { sparks: E.SPARKS * n, zlat: E.ZLAT * n, left: E.DAY - ex.n };
    },

    /* ----- Сезонная тропа ----- */
    passClaim(a, ctx) {
      const P = this.passState(ctx), lvl = a.lvl | 0, track = a.track === 'gold' ? 'gold' : 'free';
      this.need(lvl >= 1 && lvl <= Rules.PASS.LEVELS, ru`Такой ступени нет`);
      this.need(Rules.passLevel(P.pts) >= lvl, ru`Ступень ещё не пройдена`);
      this.need(track === 'free' || P.gold, ru`Сначала открой Золотую тропу`);
      this.need(!P.got[track].includes(lvl), ru`Награда уже получена`);
      P.got[track].push(lvl);
      let rw = Rules.passReward(track, lvl, S.d.level);
      if (rw.cocoon && S.d.cocoons.length >= 9) rw = { ...rw, cocoon: 0, zlat: (rw.zlat || 0) + 10 }; // коконов некуда класть — монетами (4.16: было 40)
      return { got: this.grant(rw) };
    },
    passGold(a, ctx) {
      const P = this.passState(ctx);
      this.need(!P.gold, ru`Золотая тропа уже открыта`);
      this.need(S.d.zlat >= Rules.PASS.GOLD, ru`Нужно ${Rules.PASS.GOLD} монет`);
      S.d.zlat -= Rules.PASS.GOLD;
      P.gold = true;
      J.add('passGold', { season: P.season });
      return { ok: true };
    },

    /* ----- кланы (4.28: клан — мифология; открыт, пока открыта мифология — clanOpen) ----- */
    clanJoin(a) {
      this.need(S.d.level >= CLAN_LEVEL, ru`Клан можно выбрать с ${CLAN_LEVEL} уровня`);
      this.need(!S.d.clan, ru`Клан уже выбран`);
      this.clanCheck(a.clan);
      S.d.clan = a.clan;
      J.add('clan', { clan: a.clan });
      return { clan: a.clan };
    },
    // 4.28: один бесплатный переход в другой открытый клан — у тех, кто был в дружине до кланов мифологий (S.migrate,
    // clanFree; предложение не сгорает, пока не использовано). Защитники достаивают свой срок на Капищах прежнего клана,
    // чат — уже нового
    clanMove(a) {
      this.need(S.d.clan, ru`Сначала выбери клан`);
      this.need(S.d.clanFree > 0, ru`Бесплатный переход уже использован`);
      this.clanCheck(a.clan);
      this.need(a.clan !== S.d.clan, ru`Ты уже в этом клане`);
      const from = S.d.clan;
      S.d.clan = a.clan; S.d.clanFree = 0;
      J.add('clan', { clan: a.clan, from, move: 1 });
      return { clan: a.clan };
    },
    // Поставить духа защищать Капище: свободное — после своей победы здесь сегодня, своего клана — если есть место
    async shrineDefend(a, ctx) {
      this.need(S.d.clan, ru`Сначала выбери клан`);
      const p = await this.place(a.shrine, ctx, 'shrine');
      this.need(p.verified, ru`Защищать можно только Капища, известные Ордену`);
      // 5.2: на уснувшее Капище новых защитников не ставят; стоящие достаивают свой срок (Rules.HOLD) и возвращаются, как обычно
      this.placeAwake(p, 'shrine', ctx.now);
      this.need(!Rules.shrineFree(p.id), ru`Это вольное Капище — его не держит ни один клан`);
      this.near(ctx, p.lat, p.lng, W.BATTLE_R);
      const sp = this.spirit(a.uid);
      const hold = this.liveHold(await ctx.env.holdGet(p.id), ctx.now, p.id);
      if (!hold) this.need(S.d.shrines[p.id] === U.today(ctx.now), ru`Сначала победи на этом Капище`);
      else {
        this.need(hold.clan === S.d.clan, ru`Капище держит другой клан — сначала победи его защитников`);
        this.need(hold.holders.length < HOLD_MAX, ru`На Капище уже ${HOLD_MAX} защитников`);
        this.need(!hold.holders.some(h => h.pid === S.d.pid), ru`Твой защитник уже стоит здесь`);
      }
      this.need((await ctx.env.myHolds(S.d.pid)) < HOLD_MY_MAX, ru`Твои защитники уже стоят на ${HOLD_MY_MAX} Капищах`);
      this.limit(ctx, 'defend', 30, 3600000);
      this.shared(ctx);
      const ok = await ctx.env.holdDefend(p.id, p.lat, p.lng, S.d.clan, { pid: S.d.pid, name: S.d.name, sp: this.cleanSpirit(sp, 0), t: ctx.now });
      this.need(ok, ru`Капище только что изменилось — открой его заново`);
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
        // 4.16: срок на посту вышел (Rules.HOLD.MAX_H) — защитник ушёл сам, а не побеждён; служба — до срока
        const tired = !Rules.holdFresh(g, ctx.now), ms = tired ? Rules.HOLD.MAX_H * 3600000 : Math.max(0, ctx.now - g.t);
        back.push({ ...g, hours: Math.round(ms / 360000) / 10, tired });
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
    // Сколько Капищ держит каждый открытый клан: по всему свету и в округе ~5 км
    async clanStats(a, ctx) {
      const p = ctx.pos;
      const box = p ? [p.lat - 0.045, p.lng - 0.045 / Math.max(0.2, Math.cos(p.lat * Math.PI / 180)), p.lat + 0.045, p.lng + 0.045 / Math.max(0.2, Math.cos(p.lat * Math.PI / 180))] : null;
      return { all: await ctx.env.clanCounts(null), near: box ? await ctx.env.clanCounts(box) : null };
    },
    // Дань: раз в день — за каждое Капище, где мой защитник на посту (4.16: «активная защита» — стоит не меньше
    // Rules.HOLD.TRIBUTE_H часов и срок ещё не вышел; не больше HOLD_MY_MAX Капищ). Если защитники есть, но ещё не
    // отстояли своё, день не закрывается — дань можно забрать позже (next — когда)
    async tribute(a, ctx) {
      this.need(S.d.clan, ru`Сначала выбери клан`);
      if (S.d.tributeDay === U.today(ctx.now)) return { n: 0, already: true };
      const H = Rules.HOLD, list = (await ctx.env.myHoldsList(S.d.pid)).filter(x => Rules.holdFresh(x, ctx.now));
      const n = Math.min(HOLD_MY_MAX, list.filter(x => Rules.holdHours(x.t, ctx.now) >= H.TRIBUTE_H).length);
      if (!n) {
        if (!list.length) { S.d.tributeDay = U.today(ctx.now); return { n: 0, got: [] }; }
        S.d.tributeNext = Math.min(...list.map(x => (+x.t || 0) + H.TRIBUTE_H * 3600000));
        return { n: 0, got: [], next: S.d.tributeNext };
      }
      S.d.tributeDay = U.today(ctx.now);
      if (!n) return { n: 0, got: [] };
      // 4.16: монеты — не больше чем с Rules.ZLAT.tributeMax Капищ (было 3 монеты с каждого, до 30 в день)
      // 4.28: с святилищ мифологии своего клана — искры и обереги ×Rules.HOLD.MYTH (Rules.tributeFor); сначала — они
      const mine = list.filter(x => Rules.holdHours(x.t, ctx.now) >= H.TRIBUTE_H && W.placeMyth({ id: x.id }) === S.d.clan).length;
      const T = Rules.tributeFor(n, mine);
      return { n, own: Math.min(n, mine), got: S.giveRewards({ sparks: T.sparks, charm: T.charm, zlat: Rules.ZLAT.tribute * Math.min(n, Rules.ZLAT.tributeMax) }) };
    },

    async invStart(a, ctx) {
      const p = await this.place(a.spring, ctx, 'spring');
      this.placeAwake(p, 'spring', ctx.now);
      const e = W.springFor(p, 0);
      this.need(e.invaded, ru`Источник свободен`);
      this.near(ctx, p.lat, p.lng, W.INTERACT);
      const team = S.team();
      this.need(team.length, ru`Нужна команда`);
      this.readyTeam(team);
      this.dayNeed(ctx, 'invasions');
      this.limit(ctx, 'inv', 40, 3600000);
      ctx.srv.battle = { type: 'inv', invId: e.invId, name: e.name, start: ctx.now, team: team.map(x => x.uid), hp0: this.hpMap(team), tire: true };
      return { invId: e.invId };
    },
    invEnd(a, ctx) {
      const b = this.endBattle(ctx, 'inv');
      if (!a.win) { this.woundTeam(b, a.hp); return { win: false }; }
      const g = W.grunt({ invId: b.invId });
      this.woundTeam(b, a.hp, Rules.duelMinLoss(this.team(b.team), g.team, g.speed), Duel.HPX); // 4.26: как на Капище
      this.plausibleDuel(ctx, b, g.team, g.speed);
      S.d.freed[b.invId] = true;
      S.d.stats.invasions++;
      this.dayAdd(ctx, 'invasions');
      S.progress('invasion', 1);
      J.add('invasion', { name: b.name });
      const rw = S.giveRewards({ xp: 1000, sparks: 400, charm: 6, honey: 1, herb: 1 }); // 4.16: было ✦ 500, мёда 2, Живой воды 2
      const am = S.rollAmulet(0.04, b.invId); // 4.16: было 15%
      if (am) rw.push({ k: 'amulet', n: 1, label: AMULETS[am].name });
      const rescue = g.team[Math.floor(U.h('rescue', b.invId) * g.team.length)];
      ctx.srv.rescue = { sid: rescue.sid, lvl: Math.min(rescue.lvl, S.catchLvl()), seed: b.invId + ':rescue' };
      return { win: true, rw, rescue: { sid: rescue.sid, lvl: ctx.srv.rescue.lvl } };
    },

    /* ----- Лига: бои с живыми Ловчими (4.16) ----- */
    // прежний турнир с машинами закрыт: старый телефон узнаёт, что пора обновиться
    leagueStart() { this.fail(ru`Лига теперь — бои с живыми Ловчими. Обнови игру`); },
    leagueEnd() { this.fail(ru`Лига теперь — бои с живыми Ловчими. Обнови игру`); },
    // Экран Лиги: засчитать бои, закончившиеся без экрана; сундук сезона; идущий бой (вернуться в него)
    async leagueState(a, ctx) {
      League.st();
      const live = await this.leagueLive(ctx); // брошенный бой досчитывается здесь — и сразу засчитывается ниже
      const done = await this.leagueSettle(ctx, a.board), prize = this.leaguePrize();
      return { done, prize, live };
    },
    // Поиск соперника: телефон спрашивает раз в 2–3 секунды, пока не найдётся пара (или игрок не отменит поиск).
    // Круг поиска считает сервер — по времени ожидания, которое помнит он сам (srv.lq), а не телефон
    async pvpFind(a, ctx) {
      this.need(S.d.level >= League.LEVEL, ru`Лига открывается с ${League.LEVEL} уровня Ловчего`);
      const L = League.st();
      const live = await this.leagueLive(ctx);
      if (live) { ctx.srv.lq = null; return { match: live, done: [] }; }
      // прошлые бои — до нового поиска (жетоны, рейтинг, раны); засчитали — ответ сразу, чтобы итог сохранился,
      // даже если после боя в команде дух без сил (тогда следующий запрос поиска откажет)
      const done = await this.leagueSettle(ctx, a.board);
      if (done.length) { const r = League.rank(L.pts); return { wait: 0, n: 0, a: r, b: r, done }; }
      const team = S.team();
      this.need(team.length === 3, ru`Нужно три духа`);
      this.readyTeam(team);
      this.need(L.tickets > 0, ru`Жетоны кончились — приходи завтра`);
      this.limit(ctx, 'pvpFind', 3000, 3600000);
      const q = ctx.srv.lq && ctx.now - ctx.srv.lq.t < 15000 ? ctx.srv.lq : { since: ctx.now };
      q.t = ctx.now; ctx.srv.lq = q;
      const waited = (ctx.now - q.since) / 1000, w = League.window(L.pts, waited);
      const info = { pid: S.d.pid, name: S.d.name, look: this.safeLook(S.d.look), lvl: S.d.level, pts: L.pts, rank: League.rank(L.pts), clan: clanOf(S.d.clan),
        power: team.reduce((s, x) => s + S.power(x), 0), team: team.map(sp => PvP.fighter(sp)) };
      const r = await ctx.env.pvpFind({ season: L.season, pts: L.pts, lo: w.lo, hi: w.hi, info, avoid: L.last || null, wide: waited >= 30 });
      if (r && r.match) { ctx.srv.lq = null; return { match: r.match, done: [] }; }
      return { wait: Math.round(waited), n: r ? r.n | 0 : 0, a: w.a, b: w.b, done: [] };
    },
    async pvpCancel(a, ctx) {
      ctx.srv.lq = null;
      const r = await ctx.env.pvpCancel();
      return { match: r && r.match ? r.match : null }; // пара уже составлена — отменять поздно, бой начинается
    },
    // Итог боя: рейтинг, опыт, награды, раны — один раз (по номеру боя)
    async pvpResult(a, ctx) {
      League.st();
      return { done: await this.leagueSettle(ctx, a.board), prize: this.leaguePrize() };
    },

    /* ----- обмен духами ----- */
    // 3.18: передача духов по коду закрыта — ею обходили аукцион (и его комиссию). Духов продают на аукционе
    async tradeGive() { this.need(false, ru`Передача духов по коду закрыта — выставь духа на Аукцион`); },
    async tradeReceive() { this.need(false, ru`Передача духов по коду закрыта — продавай и покупай духов на Аукционе`); },
    // Неоткрытые посылки, отправленные до 3.18, возвращаются отправителю (при загрузке игры, один раз)
    async tradeReclaimAll(a, ctx) {
      if (S.d.tradeClosed || !(S.d.sent || []).length) { S.d.tradeClosed = 1; return 0; }
      let n = 0;
      for (const s of S.d.sent) {
        const m = String(s.code || '').match(/DUH2\.([A-Z2-9]{10})/);
        if (!m) continue;
        this.shared(ctx);
        const t = await ctx.env.tradeReclaim(m[1], S.d.pid);
        if (t && t.spirit && this.own(SP, t.spirit.s)) { S.addSpirit(this.unpackSpirit(t.spirit, ctx)); n++; }
      }
      S.d.sent = [];
      S.d.tradeClosed = 1;
      if (n) Bus.emit('toast', { text: ru`Неоткрытые посылки вернулись: духов — ${n}. Передача духов закрыта, теперь есть Аукцион.`, cls: 'good' });
      return n;
    },

    /* ----- аукцион духов ----- */
    // Поиск лотов: фильтры по виду, стихии, редкости, оценке Ордена и каждому показателю, силе, цене и валюте
    async auctionFind(a, ctx) {
      this.need(S.d.level >= Rules.AUCTION.LEVEL, ru`Аукцион открывается с ${Rules.AUCTION.LEVEL} уровня Ловчего`);
      this.limit(ctx, 'aucFind', 240, 3600000);
      const f = a.f || {}, n = (v, max) => U.clamp(Math.floor(+v) || 0, 0, max);
      const q = { from: n(a.from, 3000), sort: ['new', 'cheap', 'dear', 'power', 'iv'].includes(f.sort) ? f.sort : 'new', notPid: S.d.pid };
      const sids = Array.isArray(f.sids) ? f.sids.filter(s => this.own(SP, s)).slice(0, 60) : null;
      if (sids && sids.length) q.sids = sids;
      if (this.own(ELEMENTS, f.el)) q.el = f.el;
      if (this.own(RARITY, f.rar)) q.rar = +f.rar;
      if (f.cur === 'sparks' || f.cur === 'zlat') q.cur = f.cur;
      if (f.shiny) q.shiny = true;
      q.minIv = n(f.minIv, 100); q.minA = n(f.minA, 15); q.minD = n(f.minD, 15); q.minS = n(f.minS, 15);
      q.minPower = n(f.minPower, 1e6); q.minLvl = n(f.minLvl, 50); q.maxPrice = n(f.maxPrice, 1e9);
      const cap = S.catchLvl();
      if (f.mine) q.maxLvl = cap; // 4.16: «не выше моего уровня» — только духи, которые не урежутся при покупке
      const rows = (await ctx.env.lotsFind(q)).filter(r => r.spirit && this.own(SP, r.spirit.s));
      // 4.16: какой дух станет у покупателя — уровень не выше его уровня Ловчего, сила после урезания
      rows.forEach(r => { const sp = this.unpackSpirit(r.spirit, ctx, null, cap); r.myLvl = sp.lvl; r.myPower = S.power(sp); });
      return { lots: rows, cap };
    },
    // 4.16: подсказка цены — недавние сделки (Rules.AUCTION.RECENT дней) с духом того же вида, для уровня lvl
    async auctionPrice(a, ctx) {
      this.need(S.d.level >= Rules.AUCTION.LEVEL, ru`Аукцион открывается с ${Rules.AUCTION.LEVEL} уровня Ловчего`);
      this.need(typeof a.sid === 'string' && Object.prototype.hasOwnProperty.call(SP, a.sid), ru`Такого духа нет`);
      this.limit(ctx, 'aucPrice', 240, 3600000);
      const rows = await ctx.env.lotsRecent(a.sid, ctx.now - Rules.AUCTION.RECENT * 86400000);
      return { sid: a.sid, hint: Rules.auctionHint(rows, U.clamp(Math.floor(+a.lvl) || 0, 0, 50)) };
    },
    // Мои лоты; заодно — выручка за проданные и возврат снятых и истёкших духов
    async auctionMine(a, ctx) {
      this.need(S.d.level >= Rules.AUCTION.LEVEL, ru`Аукцион открывается с ${Rules.AUCTION.LEVEL} уровня Ловчего`);
      const got = await this.auctionSettle(ctx);
      return { got, lots: await ctx.env.lotsMine(S.d.pid), open: await ctx.env.lotsOpenCount(S.d.pid) };
    },
    async auctionSell(a, ctx) {
      const A = Rules.AUCTION;
      this.need(S.d.level >= A.LEVEL, ru`Аукцион открывается с ${A.LEVEL} уровня Ловчего`);
      const sp = this.spirit(a.uid);
      this.need(S.d.spirits.length > 1, ru`Нельзя продать последнего духа`);
      this.need(!sp.fav, ru`Сними с духа отметку «избранный», чтобы продать его`);
      this.need(!sp.bound, ru`Дух привязан к тебе: плёнка на обороте содрана — продать его нельзя`);
      const cur = a.cur === 'zlat' ? 'zlat' : 'sparks', price = Math.floor(+a.price);
      this.need(price >= A.MIN[cur] && price <= A.MAX[cur], cur === 'zlat' ? ru`Цена — от ${U.fmtNum(A.MIN[cur])} до ${U.fmtNum(A.MAX[cur])} монет` : ru`Цена — от ${U.fmtNum(A.MIN[cur])} до ${U.fmtNum(A.MAX[cur])} искр`);
      this.need(await ctx.env.lotsOpenCount(S.d.pid) < A.MAX_OPEN, ru`Одновременно можно выставить не больше ${A.MAX_OPEN} духов`);
      // 4.16: залог — списывается сразу, возвращается вместе с выручкой, если духа купят
      const deposit = Rules.auctionDeposit(cur, price);
      this.need((S.d[cur] || 0) >= deposit, cur === 'zlat' ? ru`Залог — ${deposit} ${U.plural(deposit, ru`монета`, ru`монеты`, ru`монет`)}: не хватает` : ru`Залог — ✦ ${U.fmtNum(deposit)}: не хватает искр`);
      this.limit(ctx, 'aucSell', A.PER_DAY, 86400000);
      const iv = sp.iv, s = SP[sp.sid];
      this.shared(ctx);
      const lot = await ctx.env.lotCreate({ seller_pid: S.d.pid, seller_name: S.d.name, spirit: this.packSpirit(sp), sid: sp.sid, el: s.el, rar: s.rar,
        lvl: sp.lvl, power: S.power(sp), iv_pct: S.ivPct(sp), iv_a: iv[0], iv_d: iv[1], iv_s: iv[2], shiny: !!sp.shiny, cur, price, deposit,
        expires_at: new Date(ctx.now + A.HOURS * 3600000).toISOString() });
      S.d[cur] -= deposit;
      this.detachSpirit(sp);
      J.add('auction', { sid: sp.sid, dir: 'sell', cur, price });
      return { id: lot.id, fee: Rules.auctionFee(price), deposit };
    },
    async auctionBuy(a, ctx) {
      this.need(S.d.level >= Rules.AUCTION.LEVEL, ru`Аукцион открывается с ${Rules.AUCTION.LEVEL} уровня Ловчего`);
      const id = String(a.id || '');
      const pre = await ctx.env.lotGet(id);
      this.need(pre, ru`Лот не найден`);
      this.need(pre.seller_pid !== S.d.pid, ru`Это твой собственный лот`);
      S.d.auc = S.d.auc || { got: {}, back: {}, paid: {} };
      this.need(!S.d.auc.got[id], ru`Этот лот уже у тебя`);
      // деньги проверяем ДО покупки, по цене из базы (цену с телефона не принимаем): иначе лот
      // пометился бы проданным, а покупатель ушёл бы ни с чем
      const cur = pre.cur === 'zlat' ? 'zlat' : 'sparks';
      this.need((S.d[cur] || 0) >= pre.price, cur === 'zlat' ? ru`Не хватает монет` : ru`Не хватает искр`);
      this.limit(ctx, 'aucBuy', 60, 3600000);
      this.shared(ctx);
      const lot = await ctx.env.lotBuy(id, S.d.pid, S.d.name);
      this.need(lot && lot.price === pre.price && lot.cur === pre.cur, ru`Лот уже купили или сняли с продажи`);
      S.d[cur] -= lot.price;
      const sp = this.unpackSpirit(lot.spirit, ctx, lot.seller_name, S.catchLvl());
      const isNew = S.addSpirit(sp);
      S.d.auc.got[lot.id] = ctx.now;
      S.d.stats.traded++; // знак «Щедрая душа»
      ctx.after.push(() => ctx.env.lotsDone([lot.id], 'delivered'));
      J.add('auction', { sid: sp.sid, dir: 'buy', cur, price: lot.price, who: sp.from });
      return { uid: sp.uid, isNew, cur, price: lot.price };
    },
    async auctionCancel(a, ctx) {
      this.shared(ctx);
      const lot = await ctx.env.lotCancel(String(a.id || ''), S.d.pid);
      this.need(lot, ru`Лот уже продан или снят`);
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
      // 3.21: имя, уровень и клан в сообщении — на момент отправки; отдаём текущие (a.who — Ловчие уже показанных сообщений)
      const ask = [...new Set(rows.map(m => m.pid).concat(Array.isArray(a.who) ? a.who.slice(0, 40).map(String) : []))].filter(p => this.PID.test(p)).slice(0, 90);
      const who = {};
      try { const cur = await ctx.env.briefByPid(ask); Object.keys(cur).forEach(p => { const w = this.brief(cur[p]); who[p] = { name: w.name, lvl: w.lvl, clan: w.clan }; }); } catch (e) { /* покажем данные из сообщений */ }
      return { ch: a.ch, who, msgs: rows.map(m => { const w = who[m.pid]; return { id: m.id, pid: m.pid, name: w ? w.name : m.name, lvl: w ? w.lvl : m.lvl, clan: w ? w.clan : clanOf(m.clan), text: m.text, t: Date.parse(m.created_at), mine: m.pid === S.d.pid }; }) };
    },
    async chatSend(a, ctx) {
      const C = Rules.CHAT, ch = this.chatChannel(a.ch);
      this.need(S.d.level >= C.LEVEL, ru`Писать в чат можно с ${C.LEVEL} уровня Ловчего — читать можно уже сейчас`);
      const text = this.chatClean(a.text);
      this.need(text.length >= 1, ru`Напиши сообщение`);
      this.need(!/(https?:\/\/|www\.|t\.me\/|\b[a-z0-9-]{2,}\.(ru|com|net|org|me|io|su|xyz|рф)\b)/i.test(text), ru`Ссылки в чате запрещены — так безопаснее для всех`);
      const c = ctx.srv.chat = ctx.srv.chat || { t: 0, last: '' };
      this.need(ctx.now - c.t >= C.GAP, ru`Не так быстро — подожди пару секунд`);
      this.need(!(text === c.last && ctx.now - c.t < 60000), ru`Это сообщение уже отправлено`);
      this.limit(ctx, 'chat', C.PER_DAY, 86400000);
      c.t = ctx.now; c.last = text;
      this.shared(ctx);
      const m = await ctx.env.chatInsert({ channel: ch, pid: S.d.pid, name: S.d.name, lvl: S.d.level, clan: S.d.clan || null, text });
      return { msg: { id: m.id, pid: m.pid, name: m.name, lvl: m.lvl, clan: m.clan, text: m.text, t: Date.parse(m.created_at), mine: true } };
    },
    async chatReport(a, ctx) {
      const id = Math.floor(+a.id);
      this.need(id > 0, ru`Сообщение не найдено`);
      // 4.26: жалобы — как и сообщения, с Rules.CHAT.LEVEL уровня и не раньше 3 дней в игре: иначе три свежих Ловчих скрывали бы чужие сообщения
      const age = +S.d.created > 0 ? ctx.now - S.d.created : Infinity;
      this.need(S.d.level >= Rules.CHAT.LEVEL && age >= 3 * 86400000, ru`Жаловаться можно с ${Rules.CHAT.LEVEL} уровня и после 3 дней в игре`);
      this.limit(ctx, 'chatReport', 30, 86400000);
      this.shared(ctx);
      await ctx.env.chatReport(id, S.d.pid);
      return { ok: true };
    },

    /* ----- карточка Ловчего и таблица Лиги (3.21) ----- */
    // Открытая карточка любого Ловчего (из чата или таблицы Лиги): облик, уровень, клан, Лига, успехи, спутник
    async playerCard(a, ctx) {
      const pid = String(a.pid || '');
      this.need(this.PID.test(pid), ru`Ловчий не найден`);
      this.limit(ctx, 'card', 150, 3600000);
      const s = await ctx.env.friendSave(pid);
      this.need(s && s.data, ru`Ловчий не найден — возможно, он давно не заходил в игру`);
      const d = s.data, num = (v, max) => U.clamp(Math.floor(+v) || 0, 0, max);
      const b = this.brief(d), st = d.stats || {}, L = d.league || {};
      const spirits = Array.isArray(d.spirits) ? d.spirits.filter(x => x && this.own(SP, x.sid)) : [];
      const bud = d.buddy && spirits.find(x => x.uid === d.buddy.uid);
      const buddy = bud ? this.cleanSpirit(bud, 0) : null, best = this.topSpirits(d, 1)[0] || null;
      const pts = League.ratingOf(L); // 4.15: рейтинг (старые звёзды ×100; прошлый сезон — со срезом)
      const ago = s.seen ? ctx.now - Date.parse(s.seen) : Infinity;
      const mine = S.d.friends.some(x => x.id === pid), theirs = (Array.isArray(d.friends) ? d.friends : []).some(x => x && x.id === S.d.pid);
      const sp = x => x && { sid: x.sid, lvl: x.lvl, shiny: x.shiny, dark: x.dark, nick: x.nick, power: S.power(x) };
      return {
        pid, name: b.name, lvl: b.lvl, clan: b.clan, look: b.look, me: pid === S.d.pid,
        seen: ago < 15 * 60000 ? 'now' : ago < 86400000 ? 'today' : ago < 7 * 86400000 ? 'week' : 'long',
        days: +d.created > 0 ? Math.max(1, Math.ceil((ctx.now - Math.min(+d.created, ctx.now)) / 86400000)) : 0,
        dex: Object.values(d.dex || {}).filter(x => x && x.caught).length, caught: num(st.caught, 1e7), km: U.clamp(+st.km || 0, 0, 1e5),
        raids: num(st.raids, 1e6), duels: num(st.duels, 1e6), medals: Object.values(d.medals || {}).filter(t => t >= 3).length,
        league: { pts, rank: League.rank(pts), best: num(L.best, LEAGUE_RANKS.length - 1) },
        buddy: sp(buddy), best: sp(best),
        friend: mine && theirs ? 'mutual' : mine ? 'sent' : theirs ? 'wants' : null,
      };
    },
    // Таблица сезона Лиги с текущими уровнями, именами и обликами (user_id наружу не отдаём)
    // tier — тройка лучших в ранге игрока (пьедестал), rows — топ-50 сезона
    async leagueTop(a, ctx) {
      this.limit(ctx, 'leagueTop', 1500, 3600000);
      const L = League.st(), season = L.season, rank = League.rank(L.pts);
      let r = await ctx.env.leagueTop(season, rank);
      // своя строка отстала от рейтинга (перевод звёзд в рейтинг, брошенные турниры) — поправить и перечитать
      const mine = r.rows.find(x => x.me), had = mine ? mine.pts : r.me ? r.me.pts : null;
      if (a.board !== false && (L.pts > 0 || had != null) && had !== L.pts) {
        this.shared(ctx);
        await ctx.env.leagueScore({ season, name: S.d.name, pts: L.pts, rank, level: S.d.level, look: S.d.look });
        r = await ctx.env.leagueTop(season, rank);
      }
      const row = x => {
        const b = this.brief(x.cur) || this.brief({ name: x.name, level: x.level, look: x.look });
        return { pid: x.pid, name: b.name, lvl: b.lvl, clan: b.clan, look: b.look, pts: U.clamp(x.pts | 0, 0, League.MAXPTS), rank: U.clamp(x.rank | 0, 0, LEAGUE_RANKS.length - 1), me: !!x.me };
      };
      return { season, total: r.total | 0, me: r.me ? { place: r.me.place | 0, pts: r.me.pts | 0 } : null, rows: r.rows.map(row), tier: { rank, rows: (r.tier || []).map(row) } };
    },

    /* ----- друзья и подарки ----- */
    async friendAdd(a, ctx) {
      const pid = String(a.pid || '');
      this.need(this.PID.test(pid), ru`В коде ошибка`);
      this.need(pid !== S.d.pid, ru`Это твой собственный код дружбы`);
      this.limit(ctx, 'friendAdd', 30, 3600000); // перебор кодов дружбы
      const who = await ctx.env.player(pid);
      this.need(who, ru`Ловчий с таким кодом не найден — пусть он обновит игру`);
      let f = S.d.friends.find(x => x.id === pid), isNew = false;
      if (!f) {
        this.need(S.d.friends.length < 50, ru`Друзей уже 50 — это максимум`);
        f = { id: pid, name: who.name, lvl: who.level, pts: 0, added: ctx.now, sent: '', recv: '' };
        S.d.friends.push(f);
        J.add('friend', { name: f.name });
        isNew = true;
      } else { f.name = who.name; f.lvl = who.level; }
      f.linked = true;
      this.shared(ctx);
      await ctx.env.link(S.d.pid, pid, S.d.name, S.d.level);
      return { name: f.name, isNew };
    },
    // Профиль друга — только если дружба взаимная (он тоже добавил тебя)
    async friendProfile(a, ctx) {
      this.limit(ctx, 'profile', 60, 3600000);
      const { f, d, s } = await this.mutual(ctx, a.pid, 'profile');
      // чужое сохранение могло быть записано ещё телефоном (до 3.0) — только числа и известные значения
      const num = (v, max) => U.clamp(Math.floor(+v) || 0, 0, max);
      f.name = String(d.name || f.name).slice(0, 20); f.lvl = num(d.level, MAX_LEVEL) || f.lvl;
      // облик — только из известных вариантов (он попадает в картинку)
      const look = this.safeLook(d.look);
      if (look) f.look = look;
      const st = d.stats || {}, spirits = Array.isArray(d.spirits) ? d.spirits.filter(x => x && this.own(SP, x.sid)) : [];
      const top = this.topSpirits(d).map(x => ({ ...x, power: S.power(x) }));
      const buddy = d.buddy && spirits.find(x => x.uid === d.buddy.uid);
      const L = d.league || {};
      // 4.26: когда друг был в игре — не точное время: «сейчас» (меньше 10 минут назад) или с точностью до часа
      const seenT = s.seen ? Date.parse(s.seen) : NaN, seen = !Number.isFinite(seenT) ? null
        : ctx.now - seenT < 10 * 60000 ? 'now' : new Date(Math.floor(seenT / 3600000) * 3600000).toISOString();
      return {
        name: f.name, level: num(d.level, MAX_LEVEL) || 1, look, seen,
        dex: Object.values(d.dex || {}).filter(x => x && x.caught).length, caught: num(st.caught, 1e7), km: U.clamp(+st.km || 0, 0, 1e5),
        raids: num(st.raids, 1e6), duels: num(st.duels, 1e6), streak: num(d.streak && d.streak.n, 1e5),
        medals: Object.values(d.medals || {}).filter(t => t >= 3).length, rank: num(L.best, LEAGUE_RANKS.length - 1),
        buddy: buddy ? buddy.sid : null, top, pts: f.pts,
      };
    },
    // Поединок с другом: его три сильнейших духа под управлением игры. Награда — раз в день за каждого друга.
    async sparStart(a, ctx) {
      this.limit(ctx, 'spar', 30, 3600000);
      const { f, d } = await this.mutual(ctx, a.pid, 'duel');
      const foe = this.topSpirits(d);
      this.need(foe.length, ru`У ${f.name} пока нет духов`);
      const team = S.team();
      this.need(team.length, ru`Нужна команда`);
      ctx.srv.battle = { type: 'spar', pid: f.id, foe, start: ctx.now, team: team.map(x => x.uid) };
      return { foe, name: f.name, look: f.look || null, rewarded: f.spar === U.today(ctx.now) };
    },
    sparEnd(a, ctx) {
      const b = this.endBattle(ctx, 'spar');
      if (!a.win) return { win: false };
      this.plausibleDuel(ctx, b, b.foe, Duel.FOE.spar.speed);
      const f = S.d.friends.find(x => x.id === b.pid);
      this.need(f, ru`Такого друга нет`);
      J.add('spar', { name: f.name });
      // полная награда — раз в день за каждого друга и не больше 3 раз в день всего (3.19: было без общего предела —
      // с 50 друзьями до 25 000 ✦ и 40 000 опыта в день)
      const sd = S.d.sparDay = S.d.sparDay && S.d.sparDay.day === U.today(ctx.now) ? S.d.sparDay : { day: U.today(ctx.now), n: 0 };
      if (f.spar === U.today(ctx.now) || sd.n >= 3) { f.spar = U.today(ctx.now); return { win: true, rw: S.giveRewards({ xp: 100 }), practice: true }; }
      sd.n++;
      f.spar = U.today(ctx.now);
      S.progress('spar', 1);
      const rw = S.giveRewards({ xp: 800, sparks: 300, charm: 3, honey: 1 }); // 4.16: было ✦ 500
      this.friendPoint(f);
      return { win: true, rw, pts: f.pts };
    },
    friendRemove(a) { S.d.friends = S.d.friends.filter(f => f.id !== a.pid); return { ok: true }; },
    // Кто добавил меня (дружба взаимная) + подарки, которые ждут открытия
    async friendsSync(a, ctx) {
      const unlinked = S.d.friends.filter(x => !x.linked && this.PID.test(x.id));
      if (unlinked.length) this.shared(ctx);
      for (const f of unlinked) {
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
      this.need(f, ru`Такого друга нет`);
      this.need(f.sent !== U.today(), ru`Сегодня этому другу подарок уже отправлен`);
      this.need(S.useItem('gift'), ru`Подарков нет — они попадаются в источниках`);
      const lv = (() => { let r = 0; FRIEND_LEVELS.forEach((x, i) => { if (f.pts >= x.pts) r = i; }); return r; })();
      const r = Math.random, c = { charm: 3 + Math.floor(r() * 4) };
      if (r() < 0.6) c.honey = 1 + Math.floor(r() * 2);
      if (r() < 0.4) c.water = 1;
      if (lv >= 2 && r() < 0.5) c.charm2 = 2;
      if (lv >= 3 && r() < 0.3) c.charm3 = 1;
      if (r() < 0.12 + lv * 0.03) c.cocoon = 5;
      this.shared(ctx);
      await ctx.env.giftCreate(S.d.pid, f.id, S.d.name, c);
      f.sent = U.today();
      S.progress('gift', 1);
      this.friendPoint(f);
      J.add('gift', { dir: 'out', name: f.name });
      return { ok: true };
    },
    async giftOpen(a, ctx) {
      const g = await ctx.env.gift(String(a.id || ''));
      this.need(g && g.to_pid === S.d.pid, ru`Подарок не найден`);
      this.need(!g.opened_at, ru`Подарок уже открыт`);
      const f = S.d.friends.find(x => x.id === g.from_pid);
      this.need(f, g.from_name ? ru`Сначала добавь ${g.from_name} в друзья` : ru`Сначала добавь отправителя в друзья`);
      this.need(f.recv !== U.today(), ru`Сегодня ты уже открывал подарок от этого друга — попробуй завтра`);
      this.shared(ctx);
      this.need(await ctx.env.giftTake(g.id, S.d.pid), ru`Подарок уже открыт`);
      f.recv = U.today();
      const { cocoon, ...items } = g.contents || {};
      const clean = {};
      for (const [k, n] of Object.entries(items)) if (this.own(ITEMS, k) && n > 0 && n <= 10) clean[k] = n | 0;
      // 4.16: опыт за открытый подарок — 100 + 50 за каждую ступень дружбы (было 200 + 100: до 600 за подарок)
      const got = S.giveRewards({ ...clean, xp: 100 + (() => { let r = 0; FRIEND_LEVELS.forEach((x, i) => { if (f.pts >= x.pts) r = i; }); return r; })() * 50 });
      if (cocoon && S.d.cocoons.length < 9) { S.d.cocoons.push({ id: U.uid(), km: 5, walked: 0, inc: S.incubating() < 3 }); got.push({ k: 'cocoon', n: 1, label: ru`Кокон ${5} км` }); }
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
// 4.16: защитник Капища на посту не дольше Rules.HOLD.MAX_H часов — раньше этого момента (мс) он уже ушёл
const holdCutoff = () => Date.now() - Rules.HOLD.MAX_H * 3600000;
const verCmp = (a, b) => {
  const pa = String(a || '0').split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return Math.sign(d); }
  return 0;
};

/* ---------- Казна: покупка монет через ЮKassa ----------
   Секреты задаёт владелец в Supabase → Edge Functions → Secrets:
     YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY — магазин ЮKassa (для проверки — тестовый магазин);
     PAY_RECEIPT=on — передавать чек по 54-ФЗ (тогда игрок вводит почту);
     PAY_RETURN_URL — куда вернуть игрока после оплаты (по умолчанию paid.html сайта игры).
   Телефону не верим: пакет, сумма и число монет — из Rules.PAY; итог платежа сервер
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
/* ---------- 4.27: Казна в версии для Google Play — покупки через Google Play Billing ----------
   Секрет GOOGLE_PLAY_SA — ключ сервисного аккаунта Google Cloud (JSON одной строкой, вписывает duholov-secrets), которому
   в Play Console выданы права на приложение («Просмотр финансовых данных», «Управление заказами и подписками»).
   Телефону не верим: сервер сам спрашивает Google Play Developer API о покупке — набор, состояние и владельца
   (obfuscatedExternalAccountId = хэш id игрока, его задаёт приложение при покупке), — начисляет (payClaim) и «потребляет» её.
   Возвраты: раз в час сервер смотрит отменённые покупки (voidedpurchases) и списывает начисленное (payRefund). */
const GPLAY = { pkg: 'ru.duholov.game', sa: null, tok: '', exp: 0, voidAt: 0 };
try { GPLAY.sa = JSON.parse(Deno.env.get('GOOGLE_PLAY_SA') || 'null'); } catch { console.error('GOOGLE_PLAY_SA: не JSON'); }
const b64u = bytes => btoa(typeof bytes === 'string' ? unescape(encodeURIComponent(bytes)) : String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
// вход сервисного аккаунта: подписанный RS256 JWT → токен доступа (живёт час)
async function gpToken() {
  if (GPLAY.tok && Date.now() < GPLAY.exp) return GPLAY.tok;
  const sa = GPLAY.sa, now = Math.floor(Date.now() / 1000);
  const body = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) + '.' + b64u(JSON.stringify({ iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const der = Uint8Array.from(atob(String(sa.private_key).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(body)));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', signal: AbortSignal.timeout(12000),
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: body + '.' + b64u(sig) }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error('Google OAuth ' + r.status + ': ' + (j.error_description || j.error || ''));
  GPLAY.tok = j.access_token; GPLAY.exp = Date.now() + (Math.max(300, +j.expires_in || 3600) - 120) * 1000;
  return GPLAY.tok;
}
async function gp(method, path) {
  const r = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${GPLAY.pkg}${path}`,
    { method, headers: { Authorization: 'Bearer ' + await gpToken() }, signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Google Play ${r.status}: ${(j.error && j.error.message) || ''}`);
  return j;
}
// владелец покупки — хэш id игрока (сам id Google не отдаём)
const gpAcct = async uid => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('gplay:' + uid))).slice(0, 64);

const Pay = {
  on() { return !!(PAY.shop && PAY.key); },
  async handle(uid, op, a) {
    if (op === 'info') {
      if (GPLAY.sa && Date.now() - GPLAY.voidAt > 3600000) { GPLAY.voidAt = Date.now(); this.gplayVoided().catch(e => console.error('Google Play, возвраты:', String(e))); }
      return { ok: true, on: this.on(), receipt: PAY.receipt, gplay: GPLAY.sa ? { acct: await gpAcct(uid) } : null };
    }
    if (op === 'gplay') {
      if (!GPLAY.sa) return { ok: false, error: ru`Покупки через Google Play пока не подключены` };
      try { return await this.gplay(uid, a || {}); }
      catch (e) { console.error('Казна, Google Play:', String(e)); return { ok: false, error: ru`Google Play не ответил — покупка не пропадёт, проверим её позже` }; }
    }
    if (!this.on()) return { ok: false, error: ru`Покупки пока не подключены` };
    try {
      if (op === 'create') return await this.create(uid, a || {});
      if (op === 'sync') return await this.sync(uid);
      if (op === 'list') return await this.list(uid);
    } catch (e) {
      console.error('Казна:', String(e));
      return { ok: false, error: ru`Платёжный сервис не ответил — попробуй чуть позже` };
    }
    return { ok: false, error: ru`Неизвестная операция` };
  },
  async create(uid, a) {
    const pack = Rules.PAY.find(p => p.id === a.pack);
    if (!pack) return { ok: false, error: ru`Такого набора нет` };
    const email = String(a.email || '').trim();
    if (PAY.receipt && !EMAIL.test(email)) return { ok: false, error: ru`Укажи почту — на неё придёт чек` };
    const since = new Date(Date.now() - 3600000).toISOString();
    const { count } = await db.from('payments').select('id', { count: 'exact', head: true }).eq('user_id', uid).gte('created_at', since);
    if ((count || 0) >= 10) return { ok: false, error: ru`Слишком много попыток оплаты — подожди немного` };
    const amount = pack.rub.toFixed(2), title = `${pack.zlat} монет — «Духолов»`;
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
    if (!p.confirmation || !p.confirmation.confirmation_url) return { ok: false, error: ru`Платёжный сервис не выдал страницу оплаты` };
    return { ok: true, order: row.id, url: p.confirmation.confirmation_url };
  },
  // 4.27: покупка через Google Play — проверить у Google, записать (номер заказа Google — ext_id «gp:…»), начислить, потребить
  async gplay(uid, a) {
    const pack = Rules.PAY.find(p => p.id === a.product), token = String(a.token || '');
    if (!pack || !/^[A-Za-z0-9._:-]{20,1000}$/.test(token)) return { ok: false, error: ru`Такого набора нет` };
    const path = `/purchases/products/${encodeURIComponent(pack.id)}/tokens/${encodeURIComponent(token)}`;
    const p = await gp('GET', path);
    if (p.obfuscatedExternalAccountId !== await gpAcct(uid)) return { ok: false, error: ru`Эту покупку сделал другой Ловчий` };
    if (p.purchaseState === 2) return { ok: true, pending: true }; // отложенная оплата — засчитаем, когда пройдёт
    if (p.purchaseState !== 0) return { ok: false, error: ru`Покупка отменена` };
    const ext = 'gp:' + String(p.orderId || token.slice(0, 64)).slice(0, 80);
    let row = must(await db.from('payments').select('id, credited, status').eq('ext_id', ext).maybeSingle());
    if (!row) {
      const ins = await db.from('payments').insert({ user_id: uid, pack: pack.id, zlat: pack.zlat, amount: pack.rub.toFixed(2), provider: 'gplay',
        ext_id: ext, status: 'succeeded', method: 'google_play', paid_at: new Date(+p.purchaseTimeMillis || Date.now()).toISOString() }).select('id, credited, status').single();
      row = ins.data || must(await db.from('payments').select('id, credited, status').eq('ext_id', ext).maybeSingle()); // гонка двух запросов — запись одна
      if (!row) throw new Error(ins.error ? ins.error.message : 'нет записи');
    }
    if (row.status === 'succeeded' && !row.credited) await this.credit(uid);
    if (p.consumptionState !== 1) { try { await gp('POST', path + ':consume'); } catch (e) { console.error('Google Play, consume:', String(e)); } }
    return { ok: true, credited: row.status === 'succeeded' };
  },
  // 4.27: отменённые и возвращённые покупки Google Play за 30 дней → статус refunded и списание начисленного
  async gplayVoided() {
    const r = await gp('GET', `/purchases/voidedpurchases?startTime=${Date.now() - 30 * 86400000}&maxResults=1000`);
    for (const v of r.voidedPurchases || []) {
      if (!v.orderId) continue;
      const row = must(await db.from('payments').select('id, user_id, credited, status').eq('ext_id', 'gp:' + String(v.orderId).slice(0, 80)).maybeSingle());
      if (!row || row.status === 'refunded') continue;
      must(await db.from('payments').update({ status: 'refunded', updated_at: new Date().toISOString() }).eq('id', row.id));
      console.error(`Казна: возврат Google Play ${row.id}`);
      if (row.credited && row.user_id) await this.credit(row.user_id, 'payRefund');
    }
  },
  // Спросить у ЮKassa итог незавершённых оплат игрока (за 3 дня); остальные доводит уведомление ЮKassa (notify)
  async sync(uid) {
    const since = new Date(Date.now() - 3 * 86400000).toISOString();
    const rows = must(await db.from('payments').select('id, user_id, ext_id, amount, status, credited').eq('user_id', uid)
      .in('status', ['pending', 'waiting_for_capture']).not('ext_id', 'is', null).gte('created_at', since).limit(20)) || [];
    let credited = 0;
    for (const r of rows) if (await this.refresh(r) === 'succeeded' && !r.credited) credited++;
    const { count } = await db.from('payments').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('status', 'succeeded').eq('credited', false);
    const { count: open } = await db.from('payments').select('id', { count: 'exact', head: true }).eq('user_id', uid).in('status', ['pending', 'waiting_for_capture']).gte('created_at', since);
    return { ok: true, paid: count || 0, open: open || 0, credited };
  },
  // 4.22.1: мои покупки — для Казны: когда, что, сколько, ссылка на чек «Мой налог» (пробивает tools/server/duholov-payments)
  async list(uid) {
    const rows = must(await db.from('payments').select('zlat, amount, status, paid_at, created_at, npd_url, provider').eq('user_id', uid)
      .in('status', ['succeeded', 'refunded']).order('created_at', { ascending: false }).limit(30)) || [];
    const RC = /^https:\/\/lknpd\.nalog\.ru\/api\/v1\/receipt\/\d{10,12}\/[A-Za-z0-9-]+\/print$/;
    return { ok: true, list: rows.map(r => ({ t: Date.parse(r.paid_at || r.created_at), zlat: r.zlat, rub: +r.amount, refunded: r.status === 'refunded', gp: r.provider === 'gplay',
      receipt: r.npd_url && RC.test(r.npd_url) ? r.npd_url : null })) };
  },
  // Итог платежа — только из ответа ЮKassa (платёж должен быть именно этим заказом и на эту сумму)
  async refresh(r) {
    const p = await yk('GET', `/payments/${encodeURIComponent(r.ext_id)}`);
    const same = p.metadata && p.metadata.order_id === r.id && p.amount && (+p.amount.value).toFixed(2) === (+r.amount).toFixed(2) && p.amount.currency === 'RUB';
    let status = !same ? 'failed' : p.status === 'succeeded' && p.paid ? 'succeeded' : p.status;
    if (same && p.refunded_amount && +p.refunded_amount.value > 0) status = 'refunded';
    if (status === r.status) return status;
    // 4.26: возврат уже начисленного платежа — монеты списываются (действие payRefund; может уйти в минус — Казна и аукцион
    // закрыты до погашения). Владельцу — в журнале
    if (status === 'refunded' && r.credited) console.error(`Казна: возврат начисленного платежа ${r.id}`);
    // вернувшийся платёж больше не начисляется; начисленный остаётся «начисленным»
    // 4.22.1: paid_at — когда ЮKassa приняла оплату: время продажи в чеке «Мой налог» (tools/server/duholov-payments)
    const paidAt = status === 'succeeded' ? { paid_at: p.captured_at || new Date().toISOString() } : {};
    must(await db.from('payments').update({ status, method: p.payment_method ? String(p.payment_method.type).slice(0, 40) : null, ...paidAt, updated_at: new Date().toISOString() }).eq('id', r.id));
    if (status === 'succeeded' && !r.credited && r.user_id) await this.credit(r.user_id);
    if (status === 'refunded' && r.credited && r.user_id) await this.credit(r.user_id, 'payRefund');
    return status;
  },
  // 4.22: начислить оплаченное сразу — действие игры payClaim от имени игрока, в общей очереди его действий (замок);
  // игра покажет «+N монет», когда игрок откроет её (S.d.payNew). Повтор безопасен: заказ отмечается в прогрессе и в базе
  async credit(uid, type = 'payClaim') {
    const { data: sv } = await db.from('saves').select('app_version').eq('user_id', uid).maybeSingle(); // версия игры игрока — прежняя
    const out = await play(uid, { a: [{ type }], sys: true, v: (sv && sv.app_version) || '' }, makeEnv(uid));
    if (!out.body.ok && !/Прогресс не найден/.test(out.body.error || '')) throw new Error('начисление: ' + (out.body.error || out.status));
  },
  // 4.1: HTTP-уведомление ЮKassa (Интеграция → HTTP-уведомления: https://api.duholov.ru/functions/v1/game/yookassa).
  // Телу уведомления не верим — берём из него только номер платежа и сами спрашиваем ЮKassa.
  async notify(body) {
    if (!this.on() || !body || !body.object) return;
    const ext = String((String(body.event || '').startsWith('refund.') ? body.object.payment_id : body.object.id) || '').slice(0, 64);
    if (!/^[0-9a-f-]{20,64}$/i.test(ext)) return;
    const r = must(await db.from('payments').select('id, user_id, ext_id, amount, status, credited').eq('ext_id', ext).maybeSingle());
    if (r) await this.refresh(r);
    // оплачен, но не начислен (например, прошлая попытка не взяла замок) — начислить; ошибка → 500, ЮKassa повторит уведомление
    if (r && !r.credited && (await db.from('payments').select('status, credited').eq('id', r.id).single()).data?.status === 'succeeded') await this.credit(r.user_id);
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
// 4.23: вход через бота Telegram — на телефоне открывается приложение Telegram: игрок жмёт «Запустить» у бота,
// бот (приёмник сообщений …/game/tg) отмечает код входа подтверждённым, игра завершает вход. Имя бота — из getMe
const TG = {
  bot: '', at: 0,
  TTL: 10 * 60000, // 4.26: код входа через бота живёт 10 минут (было 15)
  // 4.23.1: имя бота — из базы (tg_meta: его пишет служба duholov-tg-poll). Сам сервер игры до Telegram не достучится —
  // запрос getMe висел до обрыва по времени, и вместе с ним — вход и привязки у всех игроков
  async name() {
    if (!AUTHP.telegram) return '';
    if (this.bot && Date.now() - this.at < 10 * 60000) return this.bot;
    const { data } = await db.from('tg_meta').select('v').eq('k', 'bot').maybeSingle();
    this.bot = (data && data.v) || ''; this.at = Date.now();
    return this.bot;
  },
  // секрет заголовка X-Telegram-Bot-Api-Secret-Token: sha256("tgwh:" + токен), 48 знаков (так же считает duholov-tg-poll)
  async secret() { return AUTHP.telegram ? hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('tgwh:' + AUTHP.telegram))).slice(0, 48) : ''; },
  // сообщение боту → ответ { chat_id, text } (отправит служба) или null
  async update(u) {
    if (u && u._meta && typeof u._meta.bot === 'string' && /^[A-Za-z0-9_]{3,64}$/.test(u._meta.bot)) { // служба сообщает имя бота
      await db.from('tg_meta').upsert({ k: 'bot', v: u._meta.bot }); this.bot = u._meta.bot; this.at = Date.now();
      return null;
    }
    const tgName = f => [f.first_name, f.last_name].filter(Boolean).join(' ') || (f.username ? '@' + f.username : 'Telegram');
    const since = () => new Date(Date.now() - this.TTL).toISOString();
    // 4.26: ответ кнопкой «Да, это я» / «Нет» — только тот, кто нажимал «Запустить» (tg_id), и только свежий код
    const cq = u && u.callback_query;
    if (cq) {
      const k = /^(ok|no):([A-Za-z0-9_-]{8,64})$/.exec(String(cq.data || '')), msg = cq.message;
      if (!k || !cq.from || !msg || !msg.chat || msg.chat.type !== 'private') return { answer: { callback_query_id: cq.id } };
      let text;
      if (k[1] === 'no') {
        await db.from('tg_login').delete().eq('code', k[2]).is('confirmed_at', null);
        text = '✖ Вход отменён. Если ссылку тебе прислал кто-то другой — не переходи по таким ссылкам: так пытаются получить доступ к чужому Ловчему.';
      } else {
        const { data } = await db.from('tg_login').update({ tg_id: cq.from.id, tg_name: tgName(cq.from).slice(0, 80), confirmed_at: new Date().toISOString() })
          .eq('code', k[2]).eq('asked_tg', cq.from.id).is('confirmed_at', null).gte('created_at', since()).select('code');
        text = data && data.length ? '✅ Вход в «Духолов» подтверждён — возвращайся в игру.' : 'Ссылка для входа устарела — начни вход в игре заново.';
      }
      return { answer: { callback_query_id: cq.id }, edit: { chat_id: msg.chat.id, message_id: msg.message_id, text } };
    }
    const m = u && (u.message || u.edited_message);
    if (!m || !m.chat || m.chat.type !== 'private' || !m.from) return null;
    const name = tgName(m.from);
    await db.from('tg_chats').upsert({ chat_id: m.chat.id, name: name.slice(0, 80), username: String(m.from.username || '').slice(0, 64), last_at: new Date().toISOString() });
    const code = /^\/start login_([A-Za-z0-9_-]{8,64})$/.exec(String(m.text || '').trim());
    if (code) {
      if (Math.random() < 0.05) await db.from('tg_login').delete().lt('created_at', new Date(Date.now() - 86400000).toISOString());
      const { data } = await db.from('tg_login').update({ asked_tg: m.from.id }).eq('code', code[1]).is('confirmed_at', null).gte('created_at', since()).select('code');
      if (!data || !data.length) return { chat_id: m.chat.id, text: 'Ссылка для входа устарела — начни вход в игре заново.' };
      // к этому Telegram уже привязан Ловчий — назовём его: вход откроет именно его
      const { data: link } = await db.from('auth_links').select('user_id').eq('provider', 'telegram').eq('subject', String(m.from.id)).maybeSingle();
      const sv = link ? (await db.from('saves').select('name:data->name').eq('user_id', link.user_id).maybeSingle()).data : null;
      const who = sv && sv.name ? ` — в твоего Ловчего «${String(sv.name).slice(0, 20)}»` : '';
      return { chat_id: m.chat.id, text: `🔐 Вход в «Духолов» через твой Telegram${who}.\n\nНажми «Да, это я», только если ты сам сейчас входишь в игру. Если ссылку тебе прислал кто-то другой — это обман: не нажимай, иначе чужой человек получит доступ к твоему Ловчему.`,
        reply_markup: { inline_keyboard: [[{ text: '✅ Да, это я', callback_data: 'ok:' + code[1] }], [{ text: '✖ Нет, это не я', callback_data: 'no:' + code[1] }]] } };
    }
    if (/^\/start\b/.test(String(m.text || ''))) return { chat_id: m.chat.id, text: 'Это бот игры «Духолов» — лови духов Нави по всему свету: https://duholov.ru' };
    return null;
  },
};
const getJson = async (url, init) => {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(12000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error_description || j.error || ru`ответ ${r.status}`);
  return j;
};
const Auth = {
  // публичные параметры для кнопок входа: номера приложений (не секреты)
  providers() {
    const p = {};
    if (AUTHP.google) p.google = { client_id: AUTHP.google };
    if (AUTHP.yandex) p.yandex = { client_id: AUTHP.yandex };
    if (AUTHP.vk) p.vk = { client_id: AUTHP.vk };
    if (AUTHP.telegram) p.telegram = { bot_id: AUTHP.telegram.split(':')[0], bot: TG.bot || null };
    return p;
  },
  // Проверка входа у сервиса → { sub, name }
  async verify(provider, a, uid) {
    if (provider === 'google') {
      const t = await getJson('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(String(a.id_token || '')));
      if (t.aud !== AUTHP.google || !['accounts.google.com', 'https://accounts.google.com'].includes(t.iss) || +t.exp * 1000 < Date.now()) throw new Error(ru`вход Google не подтверждён`);
      // 4.26: nonce — подписанный сервером билет этого игрока (op 'gnonce'), а не случайная строка телефона
      const nt = a.nonce && t.nonce === a.nonce ? await this.ticket(null, a.nonce) : null;
      if (!nt || nt.g !== uid) throw new Error(ru`вход Google не подтверждён`);
      return { sub: String(t.sub), name: t.name || t.email || 'Google' };
    }
    if (provider === 'yandex') {
      const t = await getJson('https://login.yandex.ru/info?format=json', { headers: { Authorization: 'OAuth ' + String(a.access_token || '') } });
      if (String(t.client_id) !== AUTHP.yandex || !t.id) throw new Error(ru`вход Яндекса не подтверждён`); // токен выдан именно нашему приложению
      return { sub: String(t.id), name: t.display_name || t.real_name || t.login || 'Яндекс' };
    }
    if (provider === 'vk') {
      const form = new URLSearchParams({ grant_type: 'authorization_code', code: String(a.code || ''), code_verifier: String(a.code_verifier || ''),
        client_id: AUTHP.vk, device_id: String(a.device_id || ''), redirect_uri: String(a.redirect_uri || ''), state: String(a.state || '') });
      const t = await getJson('https://id.vk.com/oauth2/auth', { method: 'POST', body: form });
      if (!t.user_id || !t.access_token) throw new Error(ru`вход VK не подтверждён`);
      let name = 'VK';
      try {
        const u = await getJson('https://id.vk.com/oauth2/user_info', { method: 'POST', body: new URLSearchParams({ client_id: AUTHP.vk, access_token: t.access_token }) });
        if (u.user) name = [u.user.first_name, u.user.last_name].filter(Boolean).join(' ') || name;
      } catch { /* имя не обязательно */ }
      return { sub: String(t.user_id), name };
    }
    if (provider === 'telegram' && a.code) {
      // 4.23: вход через бота — код одноразовый, только того игрока, который его получил, и не старше 15 минут
      const { data: row } = await db.from('tg_login').select('tg_id, tg_name, confirmed_at, created_at').eq('code', String(a.code)).eq('user_id', uid).maybeSingle();
      if (!row || !row.confirmed_at || !row.tg_id || Date.parse(row.created_at) < Date.now() - TG.TTL) throw new Error(ru`вход Telegram не подтверждён`);
      await db.from('tg_login').delete().eq('code', String(a.code));
      return { sub: String(row.tg_id), name: row.tg_name || 'Telegram' };
    }
    if (provider === 'telegram') {
      // подпись Telegram Login: HMAC-SHA256 от строк «ключ=значение» (по алфавиту, без hash) на ключе SHA256(токена бота)
      const d = a.data && typeof a.data === 'object' ? a.data : {};
      if (!d.id || !d.hash || !d.auth_date) throw new Error(ru`вход Telegram не подтверждён`);
      if (Date.now() / 1000 - +d.auth_date > 600) throw new Error(ru`вход Telegram устарел — попробуй ещё раз`); // 4.26: 10 минут (было сутки)
      const check = Object.keys(d).filter(k => k !== 'hash').sort().map(k => `${k}=${d[k]}`).join('\n');
      const secret = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(AUTHP.telegram));
      const key = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const sig = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(check)));
      if (!sameKey(sig, String(d.hash))) throw new Error(ru`вход Telegram не подтверждён`);
      return { sub: String(d.id), name: [d.first_name, d.last_name].filter(Boolean).join(' ') || (d.username ? '@' + d.username : 'Telegram') };
    }
    throw new Error(ru`Такого способа входа нет`);
  },
  // 4.22.1: подписанный билет «перенести вход» (15 минут): ticket(data) — выдать, ticket(null, str) — проверить и вернуть data
  async ticket(data, str) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('relink:' + serviceKey()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sign = async body => hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
    if (data) { const body = btoa(unescape(encodeURIComponent(JSON.stringify({ ...data, exp: Date.now() + 15 * 60000 })))); return body + '.' + await sign(body); }
    const [body, sig] = String(str || '').split('.');
    if (!body || !sig || !sameKey(sig, await sign(body))) return null;
    try { const t = JSON.parse(decodeURIComponent(escape(atob(body)))); return t.exp > Date.now() ? t : null; } catch { return null; }
  },
  async handle(uid, op, a) {
    if (op === 'info' && AUTHP.telegram) await TG.name(); // из базы — быстро
    // 4.23: вход через бота Telegram — выдать код; проверить, подтвердил ли бот
    if (op === 'tgstart') {
      if (!AUTHP.telegram || !(await TG.name())) return { ok: false, error: ru`Вход через Telegram сейчас недоступен` };
      const b = new Uint8Array(18); crypto.getRandomValues(b);
      const code = btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const { error } = await db.from('tg_login').insert({ code, user_id: uid });
      if (error) return { ok: false, error: ru`Не удалось начать вход — попробуй ещё раз` };
      return { ok: true, code, bot: TG.bot };
    }
    if (op === 'gnonce') { const b = new Uint8Array(12); crypto.getRandomValues(b); return { ok: true, nonce: await this.ticket({ g: uid, r: hex(b) }) }; }
    if (op === 'tgcheck') {
      const { data: row } = await db.from('tg_login').select('confirmed_at').eq('code', String(a.code || '')).eq('user_id', uid).maybeSingle();
      return { ok: true, ready: !!(row && row.confirmed_at) };
    }
    if (op === 'info') {
      const links = must(await db.from('auth_links').select('provider, name, created_at').eq('user_id', uid)) || [];
      return { ok: true, providers: this.providers(), links };
    }
    // 4.1: удалить учётную запись целиком (152-ФЗ): прогресс, способы входа, лоты, место в Лиге — всё, что связано
    // с ней в базе, удаляется вместе с ней; записи о платежах остаются без привязки (налоговый учёт, 018)
    if (op === 'delete') {
      if (a.confirm !== 'УДАЛИТЬ') return { ok: false, error: ru`Нужно подтверждение` };
      // 4.26: снимки предложенных мест — файлы хранилища (папка <uid>/) удаляются отдельно
      try {
        const { data: files } = await db.storage.from('poi-photos').list(uid, { limit: 1000 });
        if (files && files.length) await db.storage.from('poi-photos').remove(files.map(f => `${uid}/${f.name}`));
      } catch (e) { console.error('Удаление снимков:', String(e)); }
      const { error } = await db.auth.admin.deleteUser(uid);
      if (error) { console.error('Удаление учётной записи:', error.message); return { ok: false, error: ru`Не получилось удалить — попробуй ещё раз` }; }
      return { ok: true };
    }
    // 4.22.1: вход был привязан к другому Ловчему, игрок выбрал «привязать сюда» — переносим по билету из signin
    if (op === 'relink') {
      const t = await this.ticket(null, a.ticket);
      if (!t || t.to !== uid) return { ok: false, error: ru`Вход устарел — попробуй ещё раз` };
      const { data: me } = await db.auth.admin.getUserById(uid);
      if (me && me.user && !me.user.email) {
        const { error } = await db.auth.admin.updateUserById(uid, { email: `u${uid.replace(/-/g, '')}@users.duholov.invalid`, email_confirm: true });
        if (error) { console.error('Вход: почта', String(error.message)); return { ok: false, error: ru`Не удалось сохранить вход — попробуй ещё раз` }; }
      }
      const moved = must(await db.from('auth_links').update({ user_id: uid, name: t.name }).eq('provider', t.p).eq('subject', t.s).eq('user_id', t.from).select('provider')) || [];
      if (!moved.length) return { ok: false, error: ru`Вход уже изменился — попробуй ещё раз` };
      console.warn('Вход перенесён:', t.p, t.from, '→', uid);
      return { ok: true, linked: true, moved: true, name: t.name };
    }
    if (op !== 'signin') return { ok: false, error: ru`Неизвестная операция` };
    const provider = String(a.provider || '');
    if (!this.providers()[provider]) return { ok: false, error: ru`Этот способ входа пока не подключён` };
    let who;
    try { who = await this.verify(provider, a.proof || {}, uid); }
    catch (e) { console.warn('Вход:', provider, String(e)); return { ok: false, error: ru`Не удалось войти: ${String(e.message || e).slice(0, 120)}` }; }
    const name = String(who.name).slice(0, 60);
    const row = must(await db.from('auth_links').select('user_id').eq('provider', provider).eq('subject', who.sub).maybeSingle());
    if (row && row.user_id === uid) return { ok: true, linked: true, already: true };
    if (row) {
      // вход уже привязан к другому Ловчему — одноразовый вход в его учётную запись
      const { data: u, error } = await db.auth.admin.getUserById(row.user_id);
      if (error || !u || !u.user || !u.user.email) return { ok: false, error: ru`Учётная запись не найдена` };
      const { data: link, error: le } = await db.auth.admin.generateLink({ type: 'magiclink', email: u.user.email });
      if (le || !link || !link.properties) return { ok: false, error: ru`Не удалось войти — попробуй ещё раз` };
      const s = must(await db.from('saves').select('name:data->name, level:data->level').eq('user_id', row.user_id).maybeSingle());
      // 4.22.1: или перенести этот вход к текущему Ловчему — билет на 15 минут; у старого останутся ли другие способы входа
      const others = (must(await db.from('auth_links').select('provider').eq('user_id', row.user_id)) || []).length - 1 + (/\.invalid$/i.test(u.user.email) ? 0 : 1);
      return { ok: true, switch: true, token_hash: link.properties.hashed_token, relink: await this.ticket({ p: provider, s: who.sub, from: row.user_id, to: uid, name }),
        others: Math.max(0, others), player: s ? { name: String(s.name || 'Ловчий').slice(0, 20), level: +s.level || 1 } : null };
    }
    // новый вход — привязываем к текущему игроку; гость становится постоянной учётной записью
    const { data: me } = await db.auth.admin.getUserById(uid);
    if (me && me.user && !me.user.email) {
      const { error } = await db.auth.admin.updateUserById(uid, { email: `u${uid.replace(/-/g, '')}@users.duholov.invalid`, email_confirm: true });
      if (error) { console.error('Вход: почта', String(error.message)); return { ok: false, error: ru`Не удалось сохранить вход — попробуй ещё раз` }; }
    }
    const { error: ie } = await db.from('auth_links').insert({ provider, subject: who.sub, user_id: uid, name });
    if (ie) return { ok: false, error: /duplicate/i.test(ie.message) ? ru`Этот вход уже привязан — попробуй ещё раз` : ru`Не удалось сохранить вход` };
    return { ok: true, linked: true, name };
  },
};

// Доступ к общим таблицам для GameCore (от имени сервера, в пределах одного игрока uid)
// 5.2: настоящая погода — её решает сервер (телефон в Open-Meteo больше не ходит). Координаты — центр клетки ~0.1°
// (GameCore.weather: там же кэш по клетке и часу, один запрос на клетку в час). Нет ответа за 3 с — null (модель)
async function realWeather(lat, lng) {
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 3000);
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lng.toFixed(2)}&current=weather_code,wind_speed_10m,temperature_2m`, { signal: ctrl.signal });
    if (!r.ok) return null;
    const cur = (await r.json()).current;
    if (!cur || cur.weather_code == null || !Number.isFinite(+cur.weather_code)) return null;
    return { key: Sky.fromCode(+cur.weather_code, +cur.wind_speed_10m || 0), temp: Number.isFinite(+cur.temperature_2m) && cur.temperature_2m !== null ? Math.round(+cur.temperature_2m) : null };
  } catch (e) { return null; } finally { clearTimeout(t); }
}

/* ---------- 4.28: общий Алатырь (029_alatyr_world.sql) ----------
   alatyr_world — общий счёт осколков Ордена (одна строка), alatyr_roads — распутанные дороги (грань n, мифология, начало
   и конец события в мс). Счёт прибавляет alatyr_add атомарно и возвращает счёт до и после — вехи между ними (Rules.alaStage)
   отмечает только тот запрос, что их перешагнул; дорогу записывает alatyr_open (повтор той же грани ничего не меняет).
   Состояние кэшируется в экземпляре на TTL и кладётся в Ev.roads — по нему сервер отбирает духов (Ev.mythMul), а телефон
   получает те же дороги событием roads (core.js, alatyrSync). Событие начинается не раньше чем через Rules.ALATYR_WORLD.LEAD
   минут после вехи — за это время о нём узнают все экземпляры сервера и телефоны */
/* 4.28: сезоны Алатыря (030_alatyr_seasons.sql): alatyr_seasons — строка на сезон: счёт на его начало (start_total), начало
   (from_ms — момент раскола прошлого), финал (finale_from/to, kills — победы над Кощеем, goal) и раскол (broken_ms — с него
   идёт следующий сезон; строку следующего сезона пишет тот же alatyr_break). Кто первым заметил, что пора, — пишет:
   собраны все грани — финал (alatyr_finale), Орден одолел Кощея goal раз — раскол с ближайшего полного часа (alatyr_break
   в World.kill), финал кончился — раскол в его конце (здесь, в load). Повтор ничего не меняет. Нет таблицы (миграция ещё
   не применена) — первый сезон с нуля, без финала */
const World = {
  st: null, at: 0, p: null, TTL: 60000,
  Nc: null, // 5.x: число активных Ловчих { v, at } (active)
  season(rows, now) {
    const [top, prev] = rows;
    if (!top) return { s: 1, from: 0, start: 0, fin: null, brk: null };
    const cur = top.from_ms > now && prev ? prev : top; // раскол назначен, но ещё не настал — идёт прошлый сезон
    return this.row(cur, cur === prev ? +top.from_ms : null);
  },
  row(r, brk) {
    const fin = r.finale_from != null && r.finale_to != null ? { from: +r.finale_from, to: +r.finale_to, kills: +r.kills || 0, goal: +r.goal || Rules.ALATYR_WORLD.FINALE.GOAL } : null;
    return { s: +r.season, from: +r.from_ms || 0, start: +r.start_total || 0, fin, brk: brk || (r.broken_ms != null ? +r.broken_ms : null) };
  },
  async load(depth = 0) {
    const now = Date.now();
    const w = must(await db.from('alatyr_world').select('total').eq('id', 1).maybeSingle());
    const rows = must(await db.from('alatyr_roads').select('n, road, from_ms, to_ms').order('n', { ascending: false }).limit(30)) || [];
    const sq = await db.from('alatyr_seasons').select('season, start_total, from_ms, finale_from, finale_to, kills, goal, broken_ms').order('season', { ascending: false }).limit(8);
    if (sq.error && depth === 0) console.warn('Алатырь: сезоны недоступны —', sq.error.message);
    const srows = sq.error ? [] : sq.data || [];
    // 5.x: зафиксированные цены граней (033_alatyr_goals.sql) и число активных Ловчих; нет таблицы — базовые цены, без фиксации
    const gq = await db.from('alatyr_goals').select('n, goal').order('n', { ascending: false }).limit(120);
    if (gq.error && depth === 0) console.warn('Алатырь: цены граней недоступны —', gq.error.message);
    const goals = {};
    (gq.error ? [] : gq.data || []).forEach(r => { if (+r.goal > 0) goals[r.n] = +r.goal; });
    const st = { total: +(w && w.total) || 0, roads: rows.map(r => ({ n: r.n, road: r.road, from: +r.from_ms, to: +r.to_ms })), ...this.season(srows, now),
      seasons: srows.map(r => this.row(r)), db: !sq.error, gdb: !gq.error, goals, N: gq.error ? 0 : await this.active() };
    if (depth > 3) return st;
    // финал кончился, а Орден не одолел Кощея — раскол в конце финала
    if (st.db && st.fin && !st.brk && now >= st.fin.to) { if (await this.brk(st.s, st.fin.to)) return this.load(depth + 1); }
    // 5.x: грань открылась (собрана предыдущая, начался сезон, первый запуск 5.x), а её цена ещё не записана — записать сейчас
    const end = st.brk || (st.fin && st.fin.to) || 0; // раскол уже настал, а строки нового сезона нет — подождём её
    if (st.gdb && !(end && now >= end)) {
      const nf = Rules.alaNextFix(st.s, st.total - st.start, st);
      if (nf >= 0 && await this.fix(nf, st)) return this.load(depth + 1);
    }
    const stg = Rules.alaStage(st.s, st.total - st.start, st);
    // запрос, перешагнувший веху, упал до записи дороги — дорога последней собранной грани записывается сейчас
    const n = stg.base + stg.n - 1;
    if (stg.n > 0 && !st.roads.some(r => r.n === n) && !(st.roads.length && st.roads[0].n > n)) {
      if (await this.open(n, now, st)) return this.load(depth + 1);
    }
    // все грани собраны, а финала нет (запрос, собравший последнюю грань, упал) — финал сейчас
    if (st.db && stg.done && !st.fin && !st.brk) { if (await this.finale(st.s, now)) return this.load(depth + 1); }
    return st;
  },
  apply(st) {
    this.st = st; this.at = Date.now();
    const cut = Date.now() - 86400000;
    Ev.roads = st.roads.filter(r => r.to > cut).sort((a, b) => a.n - b.n);
    // 5.x: цены граней — текущего сезона и последней грани прошлого (от неё ограничение ×CAP для первой грани сезона)
    const low = Rules.alaBase(st.s) - 1, goals = {};
    Object.keys(st.goals || {}).forEach(k => { if (+k >= low) goals[k] = st.goals[k]; });
    Ev.ala = { s: st.s, from: st.from, start: st.start, fin: st.fin, brk: st.brk, goals, N: st.N || 0 };
    Ev.alaSync();
    return st;
  },
  // 5.x: сколько Ловчих уровня GOALS.LEVEL+ играли за GOALS.DAYS дней (alatyr_active) — не чаще раза в 10 минут
  async active() {
    const c = this.Nc, G = Rules.ALATYR_WORLD.GOALS;
    if (c && Date.now() - c.at < 600000) return c.v;
    const r = await db.rpc('alatyr_active', { p_level: G.LEVEL, p_days: G.DAYS });
    if (r.error) console.warn('Алатырь: число активных Ловчих —', r.error.message);
    const v = r.error ? (c ? c.v : 0) : Math.max(0, Math.floor(+r.data) || 0);
    this.Nc = { v, at: Date.now() };
    return v;
  },
  // 5.x: записать цену открывшейся грани n (G — { goals, N } сервера); в базе уже есть — берём её (первый записавший побеждает)
  async fix(n, G) {
    const N = await this.active(), fresh = !Object.keys(G.goals || {}).length;
    const prev = n > 0 ? Rules.alaPrices(n - 1, fresh ? { goals: {}, N: 0 } : G)[n - 1].p : 0; // до 5.x грани стоили базовую цену
    const p = Rules.alaPriceNew(n, N, prev);
    const got = +must(await db.rpc('alatyr_goal', { p_n: n, p_goal: p, p_players: N, p_mul: Rules.alaMul(N) })) || 0;
    if (got > 0) { G.goals = G.goals || {}; G.goals[n] = got; G.N = N; if (got === p) console.warn(`Алатырь: цена грани ${n} — ${p} (активных Ловчих ${N}, ×${Rules.alaMul(N)})`); }
    return got > 0;
  },
  async finale(s, now) {
    const f = Rules.alaFinale(now);
    const ok = !!must(await db.rpc('alatyr_finale', { p_season: s, p_from: f.from, p_to: f.to, p_goal: Rules.ALATYR_WORLD.FINALE.GOAL }));
    if (ok) console.warn(`Алатырь: сезон ${s} — все грани собраны, финал с ${new Date(f.from).toISOString()}`);
    return ok;
  },
  async brk(s, at) {
    const ok = !!must(await db.rpc('alatyr_break', { p_season: s, p_at: at }));
    if (ok) console.warn(`Алатырь: Кощей раскалывает камень — сезон ${s + 1} с ${new Date(at).toISOString()}`);
    return ok;
  },
  // победа над Кощеем в финале сезона s; Орден одолел его goal раз — раскол с ближайшего полного часа
  async kill(s) {
    if (!(s >= 1)) return;
    const now = Date.now(), r = must(await db.rpc('alatyr_kill', { p_season: s, p_n: 1, p_now: now }));
    if (!r) return;
    if (+r.prev < +r.goal && +r.kills >= +r.goal) { await this.brk(s, Rules.alaHour(now)); this.at = 0; await this.get(); }
    else if (this.st && this.st.s === s && this.st.fin) this.st.fin.kills = Math.max(this.st.fin.kills, +r.kills || 0);
  },
  // состояние не старше ttl мс; база не ответила — прежнее (дороги не пропадают из-за сбоя)
  async get(ttl = this.TTL) {
    if (this.st && Date.now() - this.at < ttl) return this.st;
    if (!this.p) this.p = this.load().then(st => this.apply(st)).catch(e => { console.error('Алатырь:', String(e)); return this.st; }).finally(() => { this.p = null; });
    return this.p;
  },
  // дорога грани n (сквозной номер); goal — общий счёт, на котором грань собрана (st — сезон этой грани)
  async open(n, now, st) {
    const road = Rules.alatyrRoad(n), f = Rules.alaFace(n);
    if (!road) return false; // мифологии этой грани ещё нет в игре — грань ждёт обновления
    let at = st && st.s === f.s ? st.start : 0;
    const P = Rules.alaSeasonPrices(f.s, st); // 5.x: по зафиксированным ценам граней
    for (let k = 0; k <= f.k; k++) at += P[k].p;
    const t = Rules.alatyrOpen(now);
    return !!must(await db.rpc('alatyr_open', { p_n: n, p_road: road, p_goal: at, p_from: t.from, p_to: t.to }));
  },
  // +n осколков в общий счёт; перешагнули веху сезона — записать дорогу, собрали все грани — финал (и сразу обновить кэш)
  async add(n) {
    const r = must(await db.rpc('alatyr_add', { p_n: n }));
    if (!r) return;
    const now = Date.now(), st = this.st;
    // сезон сменился, а кэш об этом ещё не знает — вехи отметит load по свежему состоянию
    if (!st || Ev.alaSeason(now) !== st.s) { this.at = 0; await this.get(); return; }
    let changed = false;
    // 5.x: собрана грань — цена следующей фиксируется сейчас, до того как считать, не собрана ли и она
    for (let i = 0; st.gdb && i < 12; i++) {
      const nf = Rules.alaNextFix(st.s, (+r.total || 0) - st.start, st);
      if (nf < 0 || !(await this.fix(nf, st))) break;
      changed = true;
    }
    const A = Rules.alaStage(st.s, (+r.prev || 0) - st.start, st), B = Rules.alaStage(st.s, (+r.total || 0) - st.start, st);
    for (let k = Math.max(A.n, B.n - 3); k < B.n; k++) {
      if (await this.open(B.base + k, now, st)) { changed = true; console.warn(`Алатырь: сезон ${st.s}, грань ${k + 1} из ${B.K} собрана — ${B.faces[k]}`); }
    }
    if (st.db && B.done && !A.done && !st.fin && !st.brk && await this.finale(st.s, now)) changed = true;
    if (changed) { this.at = 0; await this.get(); } else st.total = Math.max(st.total, +r.total || 0);
  },
};

function makeEnv(uid) {
  return {
    weather: (lat, lng) => realWeather(lat, lng),
    // 4.28: общий Алатырь — осколки в общий счёт (после сохранения прогресса) и состояние для экрана (не старше 15 с)
    async alatyrAdd(n) { await World.add(Math.max(1, Math.min(10, n | 0))); },
    async alatyrState() { return World.get(15000); },
    // 4.28: победа над Кощеем в финале сезона s — в общий счёт (после сохранения прогресса)
    async alatyrKill(s) { await World.kill(s | 0); },
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
    // 4.28: канал клана clan:<мифология> читается вместе с каналом прежней дружины (clan:sokol…), пока миграция 032 их не перенесла
    async chatList(channel, after) {
      const chs = /^clan:/.test(channel) ? clanIds(channel.slice(5)).map(k => 'clan:' + k) : [channel];
      let q = db.from('chat_messages').select('id, pid, name, lvl, clan, text, created_at').in('channel', chs).eq('hidden', false);
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
    // 3.21: текущие имя, уровень, клан и облик Ловчих — прямо из их сохранений (по user_id или по коду игрока)
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
      // 4.15: порядок и место — по рейтингу (колонка rating, миграция 021)
      const q = () => db.from('league_scores').select('user_id, name, rating, rank, level, look, updated_at').eq('season', season);
      const rows = must(await q().order('rating', { ascending: false }).order('updated_at', { ascending: true }).limit(50)) || [];
      const tier = must(await q().eq('rank', rank | 0).order('rating', { ascending: false }).order('updated_at', { ascending: true }).limit(3)) || [];
      const uids = [...new Set(rows.concat(tier).map(r => r.user_id))];
      const ps = uids.length ? must(await db.from('players').select('pid, user_id').in('user_id', uids)) || [] : [];
      const pid = {}; ps.forEach(p => { pid[p.user_id] = p.pid; });
      const cur = await this.briefByUid(uids);
      const view = r => ({ ...r, pts: r.rating, pid: pid[r.user_id] || null, me: r.user_id === uid, cur: cur[r.user_id] || null });
      const { count: total, error } = await db.from('league_scores').select('user_id', { count: 'exact', head: true }).eq('season', season);
      if (error) throw new Error(error.message);
      let me = null;
      if (!rows.some(r => r.user_id === uid)) {
        const my = must(await db.from('league_scores').select('rating, updated_at').eq('season', season).eq('user_id', uid).maybeSingle());
        if (my) {
          const { count } = await db.from('league_scores').select('user_id', { count: 'exact', head: true }).eq('season', season)
            .or(`rating.gt.${my.rating | 0},and(rating.eq.${my.rating | 0},updated_at.lt."${my.updated_at}")`);
          me = { place: (count || 0) + 1, pts: my.rating };
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
      // 4.15: рейтинг — в колонке rating; stars — для совместимости (рейтинг / 100)
      const pts = Math.max(0, Math.min(20000, x.pts | 0));
      must(await db.from('league_scores').upsert({ user_id: uid, season: x.season, name: String(x.name).slice(0, 20), rating: pts, stars: Math.min(1000, Math.floor(pts / 100)), rank: x.rank,
        level: x.level, look: x.look, updated_at: new Date().toISOString() }, { onConflict: 'user_id,season' }));
    },
    // 4.16: Лига — бои с живыми Ловчими (022_league_pvp.sql). Очередь поиска и пара — атомарно в базе (league_find,
    // SKIP LOCKED); бой — строка league_matches (state ведёт GameCore.pvp, запись — с проверкой версии, league_put);
    // обновления боя база сама рассылает обоим в их личные каналы Realtime (league:<user_id>).
    // Коды входа (user_id) наружу не уходят: сторону a/b считаем здесь
    async pvpFind(t) {
      return must(await db.rpc('league_find', { p_uid: uid, p_pid: t.info.pid, p_season: t.season, p_rating: t.pts | 0, p_lo: t.lo | 0, p_hi: t.hi | 0,
        p_info: t.info, p_avoid: t.avoid || null, p_wide: !!t.wide, p_now: Date.now() }));
    },
    async pvpCancel() { return must(await db.rpc('league_cancel', { p_uid: uid })); },
    async pvpLive() {
      const rows = must(await db.from('league_matches').select('id').eq('status', 'live').or(`a_uid.eq.${uid},b_uid.eq.${uid}`).order('created_at', { ascending: false }).limit(1)) || [];
      return rows[0] ? { id: rows[0].id } : null;
    },
    async pvpLoad(id) {
      if (!UUID.test(id)) return null;
      const r = must(await db.from('league_matches').select('id, ver, state, season, a_uid, b_uid').eq('id', id).maybeSingle());
      if (!r) return null;
      return { id: r.id, ver: r.ver, state: r.state, season: r.season, seat: r.a_uid === uid ? 'a' : r.b_uid === uid ? 'b' : null };
    },
    // новая версия боя или null — бой успел измениться (ход соперника) или уже закончен
    async pvpPut(id, ver, state, done) { return must(await db.rpc('league_put', { p_id: id, p_ver: ver, p_state: state, p_done: !!done })); },
    // законченные бои игрока, ещё не засчитанные в его прогресс
    async pvpPending() {
      const rows = must(await db.from('league_matches').select('id, state, season, a_uid, b_uid').eq('status', 'done')
        .or(`and(a_uid.eq.${uid},a_settled.eq.false),and(b_uid.eq.${uid},b_settled.eq.false)`).order('updated_at').limit(10)) || [];
      return rows.map(r => ({ id: r.id, state: r.state, season: r.season, seat: r.a_uid === uid ? 'a' : 'b' }));
    },
    async pvpSettled(id) { must(await db.rpc('league_settled', { p_id: id, p_uid: uid })); },
    // Общее дело Ордена: вклад игрока за неделю (n только растёт) и итоги недели
    async orderPut(x) {
      must(await db.from('order_players').upsert({ week: x.week, pid: x.pid, name: String(x.name).slice(0, 20), n: Math.min(1e6, x.n), updated_at: new Date().toISOString() }, { onConflict: 'week,pid' }));
    },
    async orderStats(week, pid) { return must(await db.rpc('order_stats', { p_week: week, p_pid: pid })); },
    // Кланы: кто держит Капище, поставить защитника, освободить после победы, сколько Капищ держит игрок
    async holdGet(poi) {
      const r = must(await db.from('shrine_holds').select('clan, holders, ver').eq('poi_id', poi).maybeSingle());
      return r && Array.isArray(r.holders) && r.holders.length ? r : null;
    },
    // 4.16: защитники старше Rules.HOLD.MAX_H часов уже ушли — shrine_defend (023) убирает их перед проверками
    async holdDefend(poi, lat, lng, clan, holder) {
      return !!must(await db.rpc('shrine_defend', { p_poi: poi, p_lat: lat, p_lng: lng, p_clan: clan, p_holder: holder, p_cutoff: holdCutoff(), p_max: HOLD_MAX }));
    },
    async holdDefeat(poi, ver) { return !!must(await db.rpc('shrine_defeat', { p_poi: poi, p_ver: ver })); },
    // 4.16: считаются только защитники, которые ещё на посту (ушедшие по сроку остаются в строке до уборки)
    async myHolds(pid) {
      const rows = must(await db.from('shrine_holds').select('holders').contains('holders', JSON.stringify([{ pid }])).limit(200)) || [];
      const cut = holdCutoff();
      return rows.filter(r => (r.holders || []).some(h => h.pid === pid && +h.t >= cut)).length;
    },
    // Капища, где стоят защитники игрока: название — из таблицы мест
    async myHoldsList(pid) {
      const cut = holdCutoff();
      const rows = (must(await db.from('shrine_holds').select('poi_id, lat, lng, holders').contains('holders', JSON.stringify([{ pid }])).limit(200)) || [])
        .filter(r => (r.holders || []).some(h => h.pid === pid && +h.t >= cut)).slice(0, HOLD_MY_MAX + 5);
      const ids = rows.map(r => r.poi_id);
      const names = ids.length ? must(await db.from('pois').select('id, name').in('id', ids)) || [] : [];
      return rows.map(r => {
        const h = (r.holders || []).find(x => x.pid === pid) || {};
        const p = names.find(x => x.id === r.poi_id);
        return { id: r.poi_id, name: p ? p.name : 'Капище', lat: r.lat, lng: r.lng, sid: h.sp && h.sp.sid, sp: h.sp || null, t: h.t || null, n: (r.holders || []).length };
      });
    },
    // Сколько Капищ держит каждый открытый клан (по всему свету или в прямоугольнике [s, w, n, e]).
    // 4.28: кланы — мифологии (MYTH_KEYS), считаются параллельно; до миграции 032 — вместе с прежними дружинами (clanIds)
    async clanCounts(box) {
      const out = {};
      await Promise.all(MYTH_KEYS.map(async k => {
        let q = db.from('shrine_holds').select('poi_id', { count: 'exact', head: true }).in('clan', clanIds(k)).neq('holders', '[]');
        if (box) q = q.gte('lat', box[0]).lte('lat', box[2]).gte('lng', box[1]).lte('lng', box[3]);
        const { count, error } = await q;
        if (error) throw new Error(error.message);
        out[k] = count || 0;
      }));
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
      if (f.maxLvl) q = q.lte('lvl', f.maxLvl); // 4.16: «не выше моего уровня»
      if (f.notPid) q = q.neq('seller_pid', f.notPid);
      const [col, asc] = { new: ['created_at', false], cheap: ['price', true], dear: ['price', false], power: ['power', false], iv: ['iv_pct', false] }[f.sort] || ['created_at', false];
      return must(await q.order(col, { ascending: asc }).order('id').range(f.from, f.from + 29)) || [];
    },
    // 4.16: недавние сделки с духом вида sid (для подсказки цены) — индекс auction_sold_idx (023)
    async lotsRecent(sid, since) {
      return must(await db.from('auction_lots').select('cur, price, lvl').eq('sid', sid).eq('status', 'sold').gte('closed_at', new Date(since).toISOString())
        .order('closed_at', { ascending: false }).limit(60)) || [];
    },
    async lotsMine(pid) {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      return must(await db.from('auction_lots').select('id, spirit, sid, lvl, power, iv_pct, cur, price, deposit, status, buyer_name, created_at, expires_at, closed_at, settled')
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
    // Казна: оплаченные, но ещё не начисленные наборы монет; отметка «начислено»
    async paidList() { return must(await db.from('payments').select('id, pack, zlat').eq('user_id', uid).eq('status', 'succeeded').eq('credited', false).limit(50)) || []; },
    async payCredited(ids) { must(await db.from('payments').update({ credited: true, updated_at: new Date().toISOString() }).eq('user_id', uid).in('id', ids)); },
    // 4.26: возвращённые (refunded) и уже начисленные, но ещё не списанные платежи; отметка «списано»
    async refundList() { return must(await db.from('payments').select('id, zlat').eq('user_id', uid).eq('status', 'refunded').eq('credited', true).eq('debited', false).limit(50)) || []; },
    async payDebited(ids) { must(await db.from('payments').update({ debited: true, updated_at: new Date().toISOString() }).eq('user_id', uid).in('id', ids)); },
    // 5.x: промокод (034_promo_codes.sql): погасить → { reward[, again] } | { error }; награда сохранена в прогрессе.
    // Миграции ещё нет в базе — «промокоды пока недоступны», а не ошибка сервера
    async promo(code) {
      const { data, error } = await db.rpc('promo_redeem', { p_code: code, p_user: uid });
      if (error) { if (error.code === 'PGRST202' || /promo_redeem/.test(error.message)) return { error: 'off' }; throw new Error(error.message); }
      return data;
    },
    async promoDone(code) { must(await db.rpc('promo_done', { p_code: code, p_user: uid })); },
    async deleteSave() {
      must(await db.from('saves').delete().eq('user_id', uid));
      must(await db.from('save_srv').delete().eq('user_id', uid));
    },
  };
}

// Защита от перебора и наводнения запросами: не больше FLOOD запросов в минуту от одного игрока
// и не больше BAD_TOKENS неверных входов в минуту с одного адреса (в пределах экземпляра функции)
const FLOOD = 150, BAD_TOKENS = 20;
// 4.16: ходы в бою Лиги: телефон шлёт их не чаще ~3 в секунду (удары — пачками) и раз в 2 с — «я на связи»
const PVP_FLOOD = 360;
const pvpHits = new Map();
// Замок игрока на время запроса: сам истекает через LOCK_MS (если функция упала); ждём его до LOCK_TRIES × 200 мс
const LOCK_MS = 30000, LOCK_TRIES = 25;
const hits = new Map(), badTokens = new Map(), errHits = new Map(), pingHits = new Map(), ykHits = new Map();
// 4.26: тело запроса — не больше MAX_BODY байт (перед сервером — ещё и Caddy, 256 КБ)
const MAX_BODY = 128 * 1024;
let dbCheck = { at: 0, p: null };
const dbHealth = () => {
  if (dbCheck.p && Date.now() - dbCheck.at < 5000) return dbCheck.p;
  const t0 = Date.now();
  const q = db.from('saves').select('user_id').limit(1).then(r => r.error ? -1 : Date.now() - t0, () => -1);
  dbCheck = { at: t0, p: Promise.race([q, new Promise(res => setTimeout(() => res(-1), 3000))]) };
  return dbCheck.p;
};
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

/* Действия игрока — строго по очереди (замок в базе): запрос из игры или сам сервер (4.22: начисление оплаты) */
async function play(uid, body, env) {
  const R = (b, status = 200) => ({ body: b, status });
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
    await World.get(); // 4.28: дороги Алатыря (Ev.roads) — до отбора духов; из кэша экземпляра, база — не чаще раза в минуту
    let got = null;
    for (let i = 0; i < LOCK_TRIES; i++) {
      got = must(await db.rpc('game_begin', { p_uid: uid, p_token: tok, p_ms: LOCK_MS }));
      if (got && !got.locked) break;
      await new Promise(r => setTimeout(r, 200));
    }
    if (!got || got.locked) return R({ ok: false, error: ru`Предыдущее действие ещё выполняется — повтори` });
    locked = true;
    env.lockAt = Date.now(); env.LOCK_MS = LOCK_MS; // 4.26: core.js не пишет в общие таблицы, если замок вот-вот истечёт
    const row = got.row, srv = got.srv || {};
    if (row && row.moved_to) return R({ ok: false, moved: true, error: ru`Прогресс перенесён на другое устройство` });
    // от имени сервера (начисление оплаты): часовой пояс — тот, что сервер помнит у игрока
    if (body.sys) body.tz = srv.tz ? srv.tz.v : 180;
    const res = await GameCore.run(body, { data: row ? row.data : null, srv }, env);
    if (!res.ok) {
      if (res.rl) await release({ ...srv, rl: res.rl });
      return R({ ok: false, error: res.error, rev: row ? row.rev : 0 });
    }
    if (res.reset) return R({ ok: true, reset: true, results: res.results, events: [], now: res.now, wx: res.wx || null });
    // 4.1: прогресс не изменился (чат, Лига, комната разлома, tick) — пишем только служебные данные, без перезаписи прогресса
    const ops = row && res.data ? Diff.make(row.data, res.data) : null;
    const rev = must(await db.rpc('game_commit', { p_uid: uid, p_token: tok, p_rev: row ? row.rev : 0, p_data: ops && !ops.length ? null : (res.data || null),
      p_srv: res.srv, p_ver: String(body.v || '').slice(0, 20) }));
    if (rev == null) return R({ ok: false, error: ru`Прогресс изменился на другом устройстве — повтори действие` });
    locked = false; // замок снят вместе с сохранением
    for (const fn of res.after) { try { await fn(); } catch (e) { console.error('после сохранения:', String(e)); } }
    // разница — только если телефон знает предыдущую версию прогресса
    const patch = !res.full && row && body.rev === row.rev ? ops : null;
    return R({ ok: true, rev, patch, data: patch ? undefined : res.data, results: res.results, events: res.events, now: res.now, wx: res.wx || null });
  } catch (e) {
    console.error(String(e && e.stack || e));
    return R({ ok: false, error: ru`Ошибка сервера — попробуй ещё раз` }, 500);
  } finally {
    await release();
  }
}

Deno.serve(async req => {
  const origin = req.headers.get('origin');
  const allowed = !origin || ORIGINS.includes(origin);
  const headers = { ...CORS, 'Access-Control-Allow-Origin': allowed && origin ? origin : ORIGINS[0], Vary: 'Origin' };
  const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (+(req.headers.get('content-length') || 0) > MAX_BODY) return reply({ ok: false, error: ru`Слишком большой запрос` }, 413);
  // уведомление ЮKassa о платеже: итог проверяем сами (Pay.notify); при сбое — 500, и ЮKassa повторит уведомление позже
  if (req.method === 'POST' && new URL(req.url).pathname.endsWith('/tg')) {
    const sec = await TG.secret();
    if (!sec || !sameKey(req.headers.get('x-telegram-bot-api-secret-token') || '', sec)) return new Response('forbidden', { status: 403 });
    let reply = null;
    try { reply = await TG.update(await req.json().catch(() => null)); } catch (e) { console.error('Telegram:', String(e)); }
    return new Response(JSON.stringify({ ok: true, reply }), { headers: { 'Content-Type': 'application/json' } }); // ответ боту отправит служба
  }
  if (req.method === 'POST' && new URL(req.url).pathname.endsWith('/yookassa')) {
    if (tooMany(ykHits, (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown', 120)) return new Response('slow down', { status: 429 });
    try { await Pay.notify(await req.json().catch(() => null)); return new Response('ok'); }
    catch (e) { console.error('Казна, уведомление:', String(e)); return new Response('retry', { status: 500 }); }
  }
  if (!allowed) return reply({ ok: false, error: ru`Этот сервер игры не принимает запросы с этой страницы` }, 403);
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
  // 4.21: состояние сервера для экрана входа — отвечает сразу; база проверяется не чаще раза в 5 с (db: мс ответа, -1 — не ответила за 3 с)
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/ping')) {
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    if (tooMany(pingHits, ip, 60)) return reply({ ok: false }, 429);
    return reply({ ok: true, db: await dbHealth() });
  }
  if (ACCESS && !sameKey(req.headers.get('x-duholov-access') || '', ACCESS)) return reply({ ok: false, error: ru`Закрытый контур: нужен ключ доступа` }, 403);
  if (req.method !== 'POST') return reply({ ok: false, error: 'POST only' }, 405);
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const bad = badTokens.get(ip);
  if (bad && bad.m === Math.floor(Date.now() / 60000) && bad.n > BAD_TOKENS) return reply({ ok: false, error: ru`Слишком много попыток — подожди минуту` }, 429);
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const who = token ? (await db.auth.getUser(token)).data : null;
  if (!who || !who.user) { tooMany(badTokens, ip, BAD_TOKENS); return reply({ ok: false, error: ru`Нужен вход в игру`, auth: true }, 401); }
  const uid = who.user.id;
  let body;
  try { body = await req.json(); } catch { return reply({ ok: false, error: ru`Некорректный запрос` }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return reply({ ok: false, error: ru`Некорректный запрос` }, 400);
  // 4.16: ходы в бою Лиги идут чаще обычных действий — у них своя граница частоты (саму частоту ударов проверяет PvP)
  if (body && body.pvp) {
    if (tooMany(pvpHits, uid, PVP_FLOOD)) return reply({ ok: false, error: ru`Слишком много запросов — подожди минуту` }, 429);
    try { return reply(await GameCore.pvp(String(body.pvp), body.args || {}, makeEnv(uid))); }
    catch (e) { console.error('Лига:', String(e && e.stack || e)); return reply({ ok: false, error: ru`Ошибка сервера — попробуй ещё раз` }, 500); }
  }
  if (tooMany(hits, uid, FLOOD)) return reply({ ok: false, error: ru`Слишком много запросов — подожди минуту` }, 429);
  if (verCmp(body.v, GameCore.MIN_CLIENT) < 0) return reply({ ok: false, upgrade: true, error: ru`Вышла новая версия игры — обнови её` });
  // Казна: создать оплату / узнать итог — вне очереди игровых действий (ждём ответа ЮKassa)
  if (body.pay) return reply(await Pay.handle(uid, String(body.pay), body.args));
  // Вход через сервисы: список, привязка и переключение учётной записи — тоже вне очереди игровых действий
  if (body.auth) { try { return reply(await Auth.handle(uid, String(body.auth), body.args || {})); } catch (e) { console.error('Вход:', String(e)); return reply({ ok: false, error: ru`Ошибка входа — попробуй ещё раз` }, 500); } }
  const out = await play(uid, body, makeEnv(uid));
  return reply(out.body, out.status);
});
