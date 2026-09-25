// 4.6: проверка рисунков духов (js/sp-*.js) и витрина всех духов.
// node tools/web/spirits.mjs            — проверка: у кого нет рисунка, ошибки, NaN, незакрытые группы, размер
// node tools/web/spirits.mjs --gallery  — ещё и www/tiles/spirits.html (папка tiles не в git): открыть на локальном сервере
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const www = fileURLToPath(new URL('../../www/', import.meta.url));
const ctx = vm.createContext({ console });
const files = ['js/data.js', 'js/art-kit.js', ...readdirSync(www + 'js').filter(f => /^sp-[a-z0-9]+\.js$/.test(f)).map(f => 'js/' + f)];
for (const f of files) vm.runInContext(readFileSync(www + f, 'utf8').replace(/^const ([A-Za-z_]+) =/gm, 'globalThis.$1 ='), ctx, { filename: f });
const { SPECIES, ArtKit, SPIRIT_ART } = ctx;

let bad = 0, missing = [];
const out = [];
for (const sp of SPECIES) {
  if (!SPIRIT_ART[sp.id]) { missing.push(sp.id); continue; }
  let svg;
  try { svg = ArtKit.render(sp); } catch (e) { console.log(`✗ ${sp.id}: ошибка — ${e.message}`); bad++; continue; }
  const probs = [];
  if (/NaN|undefined|\[object/.test(svg)) probs.push('NaN/undefined в разметке');
  const open = (svg.match(/<g[\s>]/g) || []).length, close = (svg.match(/<\/g>/g) || []).length;
  if (open !== close) probs.push(`группы: <g> ${open}, </g> ${close}`);
  for (const t of ['path', 'ellipse', 'circle', 'rect']) { const o = (svg.match(new RegExp('<' + t + '[\\s>]', 'g')) || []).length, c = (svg.match(new RegExp('<' + t + '[^>]*/>|</' + t + '>', 'g')) || []).length; if (o !== c) probs.push(`${t}: не закрыт`); }
  const kb = (svg.length / 1024).toFixed(1);
  if (svg.length > 40000) probs.push(`тяжёлый: ${kb} КБ`);
  if (probs.length) { bad++; console.log(`✗ ${sp.id}: ${probs.join('; ')}`); }
  out.push({ sp, svg, kb });
}
console.log(`нарисовано ${out.length} из ${SPECIES.length}, с ошибками ${bad}${missing.length ? `; без рисунка: ${missing.join(', ')}` : ''}`);

if (process.argv.includes('--gallery')) {
  let n = 0;
  const cells = out.map(({ sp, svg, kb }) => `<figure><div class="a">${svg.replace(/__ID__/g, 'a' + (++n))}</div><figcaption>${sp.name}<small>${sp.el} · ${'★'.repeat(sp.rar)} · ${kb} КБ</small></figcaption></figure>`).join('');
  const css = readFileSync(www + 'css/style.css', 'utf8').split('/* ---------- карта ---------- */')[0];
  mkdirSync(www + 'tiles', { recursive: true });
  writeFileSync(www + 'tiles/spirits.html', `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Духи</title><link rel="stylesheet" href="../vendor/fonts/display.css">
<style>${css}body{overflow:auto;height:auto;background:radial-gradient(90% 40% at 50% 0,#3b2a7a,#0b0620) fixed;padding:10px;display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px}
figure{margin:0;text-align:center;background:rgba(255,255,255,.04);border-radius:14px;padding:6px}.a{width:160px;height:160px;margin:auto}figcaption{font:600 14px Philosopher,serif;color:#f3edff}small{display:block;color:#a99cc9;font:11px sans-serif}</style>${cells}`);
  console.log('витрина: www/tiles/spirits.html');
}
if (bad) process.exitCode = 1;
