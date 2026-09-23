// Запуск автотестов в CI: статический сервер на корне репозитория + Chromium (Playwright).
// Плюс проверка, что версия одинаковая в www/js/version.js и www/version.json.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
let failed = 0;
const fail = msg => { console.error('✗ ' + msg); failed++; };

// 1. Версии совпадают
const vJs = (await readFile(join(root, 'www/js/version.js'), 'utf8')).match(/APP_VERSION = '([\d.]+)'/);
const vJson = JSON.parse(await readFile(join(root, 'www/version.json'), 'utf8'));
if (!vJs) fail('APP_VERSION не найден в www/js/version.js');
else if (vJs[1] !== vJson.version) fail(`версии не совпадают: version.js=${vJs[1]}, version.json=${vJson.version}`);
else console.log(`✓ версия ${vJson.version} одинакова в version.js и version.json`);

// 2. Тестовая страница в браузере
const server = createServer(async (req, res) => {
  try {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
    const body = await readFile(join(root, path));
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch (e) { res.writeHead(404); res.end(); }
}).listen(8123);

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', e => fail('ошибка на странице: ' + e.message));
await page.goto('http://localhost:8123/tests/index.html');
await page.waitForFunction(() => window.TEST_RESULTS, null, { timeout: 30000 });
const r = await page.evaluate(() => window.TEST_RESULTS);
r.failed.forEach(fail);
console.log(`✓ автотесты: ${r.total - r.failed.length} из ${r.total}`);

// 3. Игра загружается без ошибок JavaScript
const game = await browser.newPage();
game.on('pageerror', e => fail('ошибка в игре: ' + e.message));
await game.goto('http://localhost:8123/www/index.html');
await game.waitForTimeout(3000);
if (!(await game.$('.onb'))) fail('игра: не показан стартовый экран');
console.log('✓ игра открылась');

// 4. Панель модерации открывается (без входа — форма входа)
const admin = await browser.newPage();
admin.on('pageerror', e => fail('ошибка в панели модерации: ' + e.message));
await admin.goto('http://localhost:8123/www/admin.html');
await admin.waitForSelector('.login', { timeout: 15000 }).catch(() => fail('панель модерации: нет формы входа'));
console.log('✓ панель модерации открылась');

await browser.close();
server.close();
if (failed) { console.error(`Провалено проверок: ${failed}`); process.exit(1); }
