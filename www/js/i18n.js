'use strict';
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
      // «Зачерпни силы из {0} родников» и задание выходило наполовину по-русски
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
