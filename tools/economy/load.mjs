// Модель экономики «Духолова»: загрузка настоящих модулей игры в Node (без браузера и без сети).
// Файлы и их порядок — из tools/build-server.ps1 (как собирается сервер игры), кроме server/game/prelude.js (импорты Deno)
// и server/game/serve.js (HTTP-часть): вместо них — заглушки окружения, как в prelude.js. Всё выполняется одним скриптом
// в отдельном контексте vm; наружу отдаются все объявления верхнего уровня (Rules, S, SPECIES, LEAGUE_RANKS, MEDALS…).
// ref() находит строку в исходнике — у каждой цифры отчёта ссылка «файл:строка», которая не устаревает при правках.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKIP = ['server/game/prelude.js', 'server/game/serve.js'];

// список файлов сервера — из build-server.ps1 (порядок важен: myth-*.js до data.js, rules.js после state.js и т. д.)
export function buildFiles() {
  const ps = readFileSync(join(ROOT, 'tools/build-server.ps1'), 'utf8');
  const block = ps.slice(ps.indexOf('$files = @('), ps.indexOf(')', ps.indexOf('$files = @(') + 12) + 1);
  return [...block.matchAll(/'([^']+\.js)'/g)].map(m => m[1]);
}

const src = {};
export function source(f) { return (src[f] = src[f] || readFileSync(join(ROOT, f), 'utf8').replace(/\r\n/g, '\n')); }

// загрузить игру: { G — объявления верхнего уровня, files — что загружено, version }
export function loadGame({ now = Date.now(), seed = 1 } = {}) {
  const files = buildFiles().filter(f => !SKIP.includes(f));
  const names = new Set();
  let code = "'use strict';\n";
  for (const f of files) {
    const t = source(f).replace(/^'use strict';\n/m, '');
    for (const m of t.matchAll(/^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
    code += `\n// ===== ${f} =====\n` + t;
  }
  code += `\nglobalThis.__G = { ${[...names].join(', ')} };\n`;
  const version = (/APP_VERSION = '([\d.]+)'/.exec(source('www/js/version.js')) || [])[1] || '?';
  // детерминированный Math.random — модель воспроизводима (Монте-Карло внутри модулей игры)
  let a = seed >>> 0;
  const rnd = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const M = Object.create(Math); M.random = rnd;
  // заглушки браузерного окружения — как в server/game/prelude.js
  const ctx = {
    console, crypto: globalThis.crypto, Math: M, Date, JSON, Intl, setTimeout, clearTimeout, Promise,
    DEV: false, APP_VERSION: version,
    location: { hostname: 'server', search: '' },
    MapView: { pos: null, refresh() {}, updateBuddy() {} },
    Poi: { near: () => [], nearest: () => null },
    Tut: { SID: 'vayfayka', spawn: () => null, step: () => 0 },
    UI: { toast() {}, refreshHud() {} },
    Sync: { touch() {} },
    Cloud: { configured: () => false },
    Cfg: { s: { sound: false, vibro: false } },
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(code, ctx, { filename: 'duholov-server.js' });
  const G = ctx.__G;
  // сервер сам задаёт «сейчас» и часовой пояс; для модели — фиксированные (UTC+3, как у большинства игроков)
  G.U.tz = 180;
  G.U.skew = now - Date.now();
  return { G, files, version, ctx, rnd };
}

/* ---------- ссылки «файл:строка» ----------
   ref(file, pattern[, after]) — первая строка файла, где есть pattern (строка или RegExp), не раньше строки с after.
   Не нашлось — бросает ошибку: ссылка в отчёте не должна врать. */
export function ref(file, pattern, after) {
  const lines = source(file).split('\n');
  let from = 0;
  if (after) {
    const i = lines.findIndex(l => (after instanceof RegExp ? after.test(l) : l.includes(after)));
    if (i < 0) throw new Error(`ref: якорь «${after}» не найден в ${file}`);
    from = i;
  }
  for (let i = from; i < lines.length; i++) {
    const l = lines[i];
    if (pattern instanceof RegExp ? pattern.test(l) : l.includes(pattern)) return `${file}:${i + 1}`;
  }
  throw new Error(`ref: «${pattern}» не найдено в ${file}`);
}
