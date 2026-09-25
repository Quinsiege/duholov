// Сборка сайта для выкладки (CI, перед tools/stamp-version.sh): 45 своих скриптов из index.html склеиваются по порядку
// в один сжатый js/app.min.js, style.css сжимается. Игра — обычные скрипты с общими глобальными объектами (UI, S, Game…):
// склейка их не меняет, а esbuild не переименовывает имена верхнего уровня у скрипта без import/export.
// version.js остаётся отдельным файлом — его подключает и service worker. Исходники в репозитории не меняются:
// сборка правит только рабочую копию www/ в CI. Запуск: node tools/web/build.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { transform } from 'esbuild';

const www = new URL('../../www/', import.meta.url);
const read = p => readFile(new URL(p, www), 'utf8');
const KEEP = new Set(['js/version.js']);

let html = await read('index.html');
const tags = [...html.matchAll(/^\s*<script src="(js\/[a-z0-9]+\.js)\?v=dev"><\/script>\r?\n/gm)];
const files = tags.map(m => m[1]).filter(f => !KEEP.has(f));
if (files.length < 40) throw new Error(`нашлось только ${files.length} скриптов — разметка index.html изменилась?`);

// склейка: у каждого файла свой 'use strict' — оставляем только первый (весь склеенный скрипт и так строгий)
const parts = [];
for (const f of files) parts.push(`/* ${f} */\n` + (await read(f)).replace(/^﻿?'use strict';\s*/, ''));
const src = `'use strict';\n` + parts.join(';\n');
const js = await transform(src, { loader: 'js', minify: true, target: 'es2020', legalComments: 'none', charset: 'utf8' });
await writeFile(new URL('js/app.min.js', www), js.code);

// index.html: вместо отдельных тегов — один (на месте первого из склеенных)
let first = true;
html = html.replace(/^\s*<script src="(js\/[a-z0-9]+\.js)\?v=dev"><\/script>\r?\n/gm, (m, f) => {
  if (KEEP.has(f)) return m;
  if (!first) return '';
  first = false;
  return m.replace(f, 'js/app.min.js');
});
await writeFile(new URL('index.html', www), html);

// service worker: в кэш — склеенный файл вместо отдельных
let sw = await read('sw.js');
const re = f => new RegExp(`'\\./${f.replace(/[.]/g, '\\.')}\\?v=dev',[ \\t]*(\\r?\\n[ \\t]*)?`);
for (const f of files) sw = sw.replace(re(f), '');
sw = sw.replace(`'./js/version.js?v=dev'`, `'./js/version.js?v=dev', './js/app.min.js?v=dev'`);
if (files.some(f => sw.includes(`./${f}?`))) throw new Error('sw.js: остались отдельные скрипты');
await writeFile(new URL('sw.js', www), sw);

const css = await transform(await read('css/style.css'), { loader: 'css', minify: true, charset: 'utf8' });
await writeFile(new URL('css/style.css', www), css.code);

const kb = n => (n / 1024).toFixed(0) + ' КБ';
console.log(`app.min.js: ${files.length} файлов, ${kb(src.length)} → ${kb(Buffer.byteLength(js.code))}; style.css → ${kb(Buffer.byteLength(css.code))}`);
