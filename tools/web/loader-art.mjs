// 4.6: картинка экрана загрузки = встроенная сцена экрана входа (Scene.art() в www/js/scene.js).
// Экран загрузки рисуется до загрузки скриптов, поэтому сцена вписана в index.html готовой разметкой
// между метками <!-- scene:start --> и <!-- scene:end -->. После правок art() запусти: node tools/web/loader-art.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const www = fileURLToPath(new URL('../../www/', import.meta.url));
const ctx = vm.createContext({ console });
for (const f of ['js/util.js', 'js/scene.js']) vm.runInContext(readFileSync(www + f, 'utf8').replace(/^const (U|Scene) =/m, 'globalThis.$1 ='), ctx, { filename: f });
const a = vm.runInContext('Scene.art()', ctx);

const land = a.layers.filter(l => !l.mist).map(l => `<g class="${l.cls}">${l.body}</g>`).join('');
const html = `<!-- scene:start -->
      <svg viewBox="0 0 ${a.W} ${a.H}" preserveAspectRatio="xMidYMid slice">${a.sky}</svg>
      <svg viewBox="0 0 ${a.W} ${a.H}" preserveAspectRatio="xMidYMax slice">${land}</svg>
      <i class="ld-mist m1"></i><i class="ld-mist m2"></i>
      <!-- scene:end -->`.replace(/\n\s{8,}(?=<)/g, '');

const file = www + 'index.html';
const src = readFileSync(file, 'utf8');
const out = src.replace(/<!-- scene:start -->[\s\S]*?<!-- scene:end -->/, html);
if (out === src && !src.includes('<!-- scene:start -->')) throw new Error('в index.html нет меток <!-- scene:start --> … <!-- scene:end -->');
writeFileSync(file, out);
console.log(`экран загрузки: сцена обновлена (${(html.length / 1024).toFixed(1)} КБ)`);
