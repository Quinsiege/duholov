// Проверка одновременных запросов (4.3), запускается в CI (шаг «Одновременные запросы»): этот файл дописывается к серверу
// игры без HTTP-части (serve.js) и выполняется в Deno. 12 игроков, по 15 запросов каждый, все вперемешку; «база» отвечает
// со случайной задержкой, поэтому запросы разных игроков переплетаются на каждом ожидании. Без изоляции тест падает.
GameCore.isolate(new AsyncLocalStorage());
const wait = () => new Promise(r => setTimeout(r, Math.random() * 15));
const env = new Proxy({}, { get: (_, k) => async () => { await wait(); return k === 'poiCovered' ? false : k === 'registerPid' ? 'ok' : k === 'player' ? null : k === 'lotsToSettle' || k === 'paidList' || k === 'giftsTo' || k === 'linksTo' ? [] : null; } });
const players = Array.from({ length: 12 }, (_, i) => ({ i, name: 'Игрок' + i, tz: -600 + i * 100, lat: 55 + i * 0.01, lng: 37 + i * 0.01, data: null, srv: {} }));
let bad = 0, calls = 0;
async function call(p, type, args = {}) {
  const res = await GameCore.run({ a: [{ type, args }], tz: p.tz, wx: null, pos: { lat: p.lat, lng: p.lng, acc: 10 }, v: APP_VERSION }, { data: p.data, srv: p.srv }, env);
  calls++;
  if (!res.ok) throw new Error(`${p.name} ${type}: ${res.error}`);
  p.data = res.data; p.srv = res.srv;
  // проверки изоляции: прогресс, пояс и позиция — именно этого игрока
  if (res.data && res.data.name !== p.name) { bad++; console.error(`ЧУЖОЙ ПРОГРЕСС: ${p.name} получил ${res.data.name}`); }
  if (p.srv.tz && p.srv.tz.v !== p.tz) { bad++; console.error(`ЧУЖОЙ ПОЯС: ${p.name}`); }
  if (p.srv.pos && Math.abs(p.srv.pos.lat - p.lat) > 1e-9) { bad++; console.error(`ЧУЖАЯ ПОЗИЦИЯ: ${p.name}`); }
  return res;
}
const t0 = performance.now();
await Promise.all(players.map(async p => {
  await call(p, 'newGame', { name: p.name, starter: 'ugolek' });
  for (let k = 0; k < 14; k++) await call(p, k % 3 ? 'tick' : 'daily');
}));
// после запросов общие поля вне запроса — прежние (ничего не «прилипло»)
if (S.d !== null && S.d !== undefined) { bad++; console.error('S.d остался заполненным вне запроса'); }
console.log(`запросов: ${calls}, ошибок изоляции: ${bad}, время: ${Math.round(performance.now() - t0)} мс`);
if (bad) Deno.exit(1);
