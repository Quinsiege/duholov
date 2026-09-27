// Рисунки духов картинками: art-new/<id>.png (1024+ px, прозрачный фон) → www/img/spirits/<id>.webp (400×400)
// и список готовых духов в www/js/art.js (строка «const PICS = …»). Духи без картинки рисуются как прежде (SVG).
// Запуск: node tools/art/spirit-pics.mjs   (нужен ffmpeg в PATH)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'art-new'), OUT = path.join(ROOT, 'www/img/spirits'), ART = path.join(ROOT, 'www/js/art.js');
const SIZE = 400, QUALITY = 82;

// id духов — из data.js (только настоящие, чтобы опечатка в имени файла не проскочила)
const data = fs.readFileSync(path.join(ROOT, 'www/js/data.js'), 'utf8');
const ids = new Set([...data.slice(data.indexOf('const SPECIES'), data.indexOf('const LANDS')).matchAll(/\{ id: '([a-z0-9]+)', name:/g)].map(m => m[1]));
fs.mkdirSync(OUT, { recursive: true });
const bad = [];
for (const f of fs.existsSync(SRC) ? fs.readdirSync(SRC) : []) {
  const m = f.match(/^([a-z0-9]+)\.png$/i);
  if (!m) continue;
  if (!ids.has(m[1])) { bad.push(f); continue; }
  const src = path.join(SRC, f), dst = path.join(OUT, m[1] + '.webp');
  if (fs.existsSync(dst) && fs.statSync(dst).mtimeMs >= fs.statSync(src).mtimeMs) continue;
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', src, '-vf', `scale=${SIZE}:${SIZE}:flags=lanczos`, '-c:v', 'libwebp', '-quality', String(QUALITY), '-compression_level', '6', dst]);
  console.log(`${f} → img/spirits/${m[1]}.webp (${Math.round(fs.statSync(dst).size / 1024)} КБ)`);
}
if (bad.length) console.log('Не духи игры (имя файла не совпало с id):', bad.join(', '));

// список: id → метка содержимого (цифры: service worker берёт такие файлы сразу из кэша, см. sw.js)
const pics = {};
for (const f of fs.readdirSync(OUT).sort()) {
  const m = f.match(/^([a-z0-9]+)\.webp$/);
  if (m && ids.has(m[1])) pics[m[1]] = String(parseInt(crypto.createHash('sha1').update(fs.readFileSync(path.join(OUT, f))).digest('hex').slice(0, 8), 16));
}
const line = `  const PICS = ${JSON.stringify(pics)}; // tools/art/spirit-pics.mjs`;
const art = fs.readFileSync(ART, 'utf8'), re = /^ {2}const PICS = .*; \/\/ tools\/art\/spirit-pics\.mjs$/m;
if (!re.test(art)) throw new Error('art.js: нет строки «const PICS = …»');
fs.writeFileSync(ART, art.replace(re, line));
console.log(`Картинок: ${Object.keys(pics).length} из ${ids.size}`);
