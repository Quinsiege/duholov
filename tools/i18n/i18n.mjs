// 4.15: переводы игры. Русский текст в коде — ключ (ru`…`, ru.k`…`, ru('…'), см. www/js/i18n.js).
//   node tools/i18n/i18n.mjs extract   — собрать все ключи в tools/i18n/source.json (текст, файлы, строка кода, формы слова)
//   node tools/i18n/i18n.mjs check     — проверить словари www/i18n/<язык>.js: нет ли пропусков, лишних ключей,
//                                        потерянных {0} и тегов
//   node tools/i18n/i18n.mjs build <язык> <готовый.json> — записать www/i18n/<язык>.js из JSON { ключ: перевод }
// Без зависимостей: код разбирается простым сканером (строки, шаблоны с вложенными ${}, комментарии, регулярки).
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url);
const P = p => new URL(p, ROOT);
const LANGS = ['en', 'es', 'pt', 'fr', 'de', 'it', 'tr', 'id', 'zh', 'ja', 'ko', 'hi'];
const SKIP = /^(admin|i18n|sp-.*|.*art.*)\.js$/; // админка, само i18n и рисунки духов — без текста для игрока

// ---------- сканер ----------
// возвращает [{ key, kind: 'ru'|'k'|'call', line, plural: id|null }]
function scan(src) {
  const out = [];
  let i = 0, line = 1, plural = null, pluralDepth = 0, depth = 0, pid = 0;
  const n = src.length;
  const cook = raw => { try { return (0, eval)('`' + raw + '`'); } catch (e) { return raw; } };
  const prevSig = () => { let j = i - 1; while (j >= 0 && /\s/.test(src[j])) j--; return j >= 0 ? src[j] : ''; };
  const prevWord = () => { let j = i - 1; while (j >= 0 && /\s/.test(src[j])) j--; let e = j + 1; while (j >= 0 && /[\w$]/.test(src[j])) j--; return src.slice(j + 1, e); };
  // пропустить строку в кавычках, вернуть «сырое» содержимое
  const str = q => { let j = i + 1, s = ''; while (j < n && src[j] !== q) { if (src[j] === '\\') { s += src[j] + src[j + 1]; j += 2; continue; } if (src[j] === '\n') line++; s += src[j++]; } i = j + 1; return s; };
  // шаблон: вернуть части (сырые) и пройти выражения рекурсивно (там тоже могут быть ru`…`)
  function tpl() {
    const parts = []; let cur = ''; i++;
    while (i < n) {
      const c = src[i];
      if (c === '\\') { cur += c + src[i + 1]; i += 2; continue; }
      if (c === '`') { i++; parts.push(cur); return parts; }
      if (c === '$' && src[i + 1] === '{') { parts.push(cur); cur = ''; i += 2; code('}'); continue; }
      if (c === '\n') line++;
      cur += c; i++;
    }
    parts.push(cur); return parts;
  }
  // код до закрывающей скобки end (или до конца файла)
  function code(end) {
    let d = 0;
    while (i < n) {
      const c = src[i], c2 = src[i + 1];
      if (c === '\n') { line++; i++; continue; }
      if (c === '/' && c2 === '/') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && c2 === '*') { const e = src.indexOf('*/', i + 2); for (let j = i; j < (e < 0 ? n : e); j++) if (src[j] === '\n') line++; i = e < 0 ? n : e + 2; continue; }
      if (c === '/') { // регулярка или деление
        const p = prevSig(), w = prevWord();
        if (!p || '(,=:[!&|?{};+-*%<>~^'.includes(p) || /^(return|typeof|case|of|in|do|else|void|delete|throw)$/.test(w)) {
          let j = i + 1, cls = false;
          while (j < n && (src[j] !== '/' || cls) && src[j] !== '\n') { if (src[j] === '\\') j++; else if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false; j++; }
          i = j + 1; while (i < n && /[a-z]/.test(src[i])) i++; continue;
        }
        i++; continue;
      }
      if (c === "'" || c === '"') {
        const at = line, s = str(c);
        // ru('…') — вызов с одной строкой
        const q0 = i - s.length - 2, before = src.slice(Math.max(0, q0 - 4), q0);
        if (/(?:^|[^\w$.])ru\($/.test(before) && /[А-Яа-яЁё]/.test(s)) out.push({ key: cook(s.replace(/`/g, '\\`')), kind: 'call', line: at, plural });
        continue;
      }
      if (c === '`') {
        const at = line, w = prevWord(), tag = w === 'ru' && src[i - 1] === 'u' ? 'ru' : (w === 'k' && src.slice(i - 4, i) === 'ru.k') ? 'k' : null;
        const parts = tpl();
        if (tag) out.push({ key: parts.map(cook).reduce((a, p, j) => a + '{' + (j - 1) + '}' + p), kind: tag, line: at, plural });
        continue;
      }
      if (c === '(' || c === '{' || c === '[') {
        if (c === '(' && src.slice(i - 8, i) === 'U.plural' && plural === null) { plural = ++pid; pluralDepth = d + 1; }
        d++; i++; continue;
      }
      if (c === ')' || c === '}' || c === ']') {
        if (d === 0 && c === end) { i++; return; }
        if (c === ')' && plural !== null && d === pluralDepth) plural = null;
        d--; i++; continue;
      }
      i++;
    }
  }
  code(null);
  return out;
}

// статичный текст index.html (переводит I18N.page): тексты между тегами и подписи
function scanHtml(src) {
  const out = [];
  const body = src.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));
  const lineAt = k => src.slice(0, k).split('\n').length;
  for (const m of body.matchAll(/>([^<>]*[А-Яа-яЁё][^<>]*)</g)) out.push({ key: m[1].trim().replace(/\s+/g, ' '), kind: 'html', line: lineAt(m.index), plural: null });
  for (const m of body.matchAll(/\s(?:title|aria-label|placeholder|alt)="([^"]*[А-Яа-яЁё][^"]*)"/g)) out.push({ key: m[1].trim(), kind: 'html', line: lineAt(m.index), plural: null });
  const t = /<title>([^<]*)<\/title>/.exec(src); if (t) out.push({ key: t[1].trim(), kind: 'html', line: lineAt(t.index), plural: null });
  return out;
}

function files() {
  const js = readdirSync(P('www/js/')).filter(f => f.endsWith('.js') && !SKIP.test(f)).map(f => 'www/js/' + f);
  return js.concat(['server/game/core.js', 'server/game/serve.js']);
}

function extract() {
  const map = new Map();
  const add = (f, lines, r, plural) => {
    let e = map.get(r.key);
    if (!e) { e = { k: r.key, at: [], ctx: (lines[r.line - 1] || '').trim().slice(0, 220) }; map.set(r.key, e); }
    if (e.at.length < 4) e.at.push(`${f}:${r.line}`);
    if (plural) e.forms = plural;
  };
  for (const f of files()) {
    const src = readFileSync(P(f), 'utf8'), lines = src.split(/\r?\n/);
    const found = scan(src);
    // формы одного слова (три ru`…` внутри U.plural) — связываем
    const groups = {};
    found.forEach(r => { if (r.plural) (groups[r.plural] = groups[r.plural] || []).push(r.key); });
    found.forEach(r => add(f, lines, r, r.plural && groups[r.plural].length === 3 ? groups[r.plural] : null));
  }
  const html = readFileSync(P('www/index.html'), 'utf8'), hl = html.split(/\r?\n/);
  scanHtml(html).forEach(r => add('www/index.html', hl, r));
  const list = [...map.values()].filter(e => /[А-Яа-яЁё]/.test(e.k));
  writeFileSync(P('tools/i18n/source.json'), JSON.stringify(list, null, 1));
  const chars = list.reduce((s, e) => s + e.k.length, 0);
  console.log(`ключей: ${list.length}, знаков: ${chars}, форм слова: ${list.filter(e => e.forms).length}`);
  return list;
}

// ---------- словари ----------
const dictPath = l => P(`www/i18n/${l}.js`);
function loadDict(l) {
  if (!existsSync(dictPath(l))) return null;
  const I18N = {};
  new Function('I18N', readFileSync(dictPath(l), 'utf8'))(I18N);
  return I18N.dict;
}
const tags = s => (s.match(/<\/?[a-z][^>]*>/gi) || []).map(t => t.replace(/\s+/g, ' ')).sort().join('|');
const ph = s => (s.match(/\{\d+\}/g) || []).sort().join('');
function problems(k, v) {
  const p = [];
  if (typeof v !== 'string' || !v.trim()) p.push('пусто');
  else {
    if (ph(k) !== ph(v)) p.push(`подстановки ${ph(k)} → ${ph(v)}`);
    if (tags(k) !== tags(v)) p.push('теги');
    if (/[А-Яа-яЁё]/.test(v)) p.push('кириллица в переводе');
  }
  return p;
}
function check() {
  const src = JSON.parse(readFileSync(P('tools/i18n/source.json'), 'utf8'));
  let bad = 0;
  for (const l of LANGS) {
    const d = loadDict(l);
    if (!d) { console.log(`${l}: словаря нет`); continue; }
    const miss = src.filter(e => !(e.k in d)).length, extra = Object.keys(d).filter(k => !src.some(e => e.k === k)).length;
    const errs = src.filter(e => e.k in d).map(e => [e.k, problems(e.k, d[e.k])]).filter(x => x[1].length);
    console.log(`${l}: ${Object.keys(d).length} переводов, нет ${miss}, лишних ${extra}, ошибок ${errs.length}`);
    errs.slice(0, 8).forEach(([k, p]) => console.log(`   · ${p.join(', ')}: ${k.slice(0, 90)}`));
    bad += errs.length;
  }
  if (bad) process.exitCode = 1;
}
function build(l, json) {
  const src = JSON.parse(readFileSync(P('tools/i18n/source.json'), 'utf8'));
  const tr = JSON.parse(readFileSync(json, 'utf8'));
  const keys = src.map(e => e.k).filter(k => typeof tr[k] === 'string' && tr[k].trim());
  const body = keys.map(k => `${JSON.stringify(k)}:${JSON.stringify(tr[k])}`).join(',\n');
  writeFileSync(dictPath(l), `// Духолов — перевод: ${l}. Собрано tools/i18n/i18n.mjs (ключ — русский текст из кода)\nI18N.dict = {\n${body}\n};\n` +
    `// экран загрузки уже на странице — переводим сразу; остальное переведёт I18N.page после загрузки\nif (typeof document !== 'undefined' && document.body) I18N.page(document.body);\n`);
  console.log(`${l}: записано ${keys.length} из ${src.length}`);
}

// порции для переводчиков: dir/chunk-NN.json — [{ k, forms?, ctx, at }]
function split(dir, size = 220) {
  const src = JSON.parse(readFileSync(P('tools/i18n/source.json'), 'utf8'));
  let n = 0;
  for (let i = 0; i < src.length; i += size) {
    const part = src.slice(i, i + size).map(e => ({ k: e.k, ...(e.forms ? { forms: e.forms } : {}), ctx: e.ctx, at: e.at[0] }));
    writeFileSync(`${dir}/chunk-${String(++n).padStart(2, '0')}.json`, JSON.stringify(part, null, 1));
  }
  console.log(`порций: ${n} по ${size}`);
}
// склеить переводы порций dir/<язык>/chunk-NN.json ({ ключ: перевод }) и записать словарь
function merge(l, dir) {
  const all = {};
  for (const f of readdirSync(`${dir}/${l}`).filter(f => /^chunk-\d+\.json$/.test(f)).sort()) Object.assign(all, JSON.parse(readFileSync(`${dir}/${l}/${f}`, 'utf8')));
  const tmp = `${dir}/${l}.all.json`;
  writeFileSync(tmp, JSON.stringify(all));
  build(l, tmp);
}

// проверить переводы порций: dir/<язык>/chunk-NN.json против dir/chunk-NN.json
function verify(l, dir) {
  let bad = 0, done = 0, total = 0;
  for (const f of readdirSync(dir).filter(f => /^chunk-\d+\.json$/.test(f)).sort()) {
    const src = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')); total += src.length;
    const out = `${dir}/${l}/${f}`;
    if (!existsSync(out)) { console.log(`${f}: нет перевода`); bad++; continue; }
    let tr; try { tr = JSON.parse(readFileSync(out, 'utf8')); } catch (e) { console.log(`${f}: не JSON — ${e.message}`); bad++; continue; }
    const errs = [];
    src.forEach(e => { if (!(e.k in tr)) errs.push(`нет ключа: ${e.k.slice(0, 70)}`); else { const p = problems(e.k, tr[e.k]); if (p.length) errs.push(`${p.join(', ')}: ${e.k.slice(0, 70)}`); } });
    done += src.length - errs.filter(x => x.startsWith('нет ключа')).length;
    if (errs.length) { bad += errs.length; console.log(`${f}: ошибок ${errs.length}`); errs.slice(0, 12).forEach(x => console.log('   · ' + x)); }
  }
  console.log(`${l}: готово ${done} из ${total}, ошибок ${bad}`);
  if (bad) process.exitCode = 1;
}

const [cmd, a, b] = process.argv.slice(2);
if (cmd === 'extract') extract();
else if (cmd === 'check') check();
else if (cmd === 'build') build(a, b);
else if (cmd === 'split') split(a);
else if (cmd === 'merge') merge(a, b);
else if (cmd === 'verify') verify(a, b);
else console.log('node tools/i18n/i18n.mjs extract | check | split <папка> | merge <язык> <папка> | build <язык> <перевод.json>');
