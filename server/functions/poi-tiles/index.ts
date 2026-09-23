// Духолов: заполнение карты реальными объектами из OpenStreetMap.
// Клиент присылает квадраты карты (0.01° × 0.01°, ближние первыми), функция загружает их из Overpass API,
// отбирает заметные объекты (памятники, храмы, фонтаны, арт-объекты, парки…) и сохраняет в таблицу pois.
// Деплой: Supabase → Edge Functions → poi-tiles (код этого файла).
import { createClient } from 'npm:@supabase/supabase-js@2';

const TILE = 0.01;
const MAX_TILES = 30;          // квадратов в одном запросе
const MAX_FETCH = 1;           // из них загружаем из OSM за один вызов (публичные серверы Overpass перегружены)
const BUDGET = 45000;          // сколько функция готова ждать Overpass, мс
const REFRESH_DAYS = 60;       // через сколько дней обновлять квадрат
const MIN_GAP = 35;            // минимум метров между объектами
const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// категория объекта → название по умолчанию и может ли он стать Капищем
const CATS: Record<string, { name: string; shrine: boolean }> = {
  monument: { name: 'Памятник', shrine: true },
  memorial: { name: 'Памятный знак', shrine: false },
  castle: { name: 'Крепость', shrine: true },
  ruins: { name: 'Руины', shrine: true },
  archaeological_site: { name: 'Древнее место', shrine: true },
  manor: { name: 'Усадьба', shrine: true },
  city_gate: { name: 'Городские ворота', shrine: true },
  wayside_cross: { name: 'Поклонный крест', shrine: false },
  wayside_shrine: { name: 'Часовенка', shrine: false },
  boundary_stone: { name: 'Межевой камень', shrine: false },
  artwork: { name: 'Арт-объект', shrine: false },
  attraction: { name: 'Достопримечательность', shrine: true },
  viewpoint: { name: 'Смотровая площадка', shrine: true },
  museum: { name: 'Музей', shrine: true },
  place_of_worship: { name: 'Храм', shrine: false },
  fountain: { name: 'Фонтан', shrine: false },
  library: { name: 'Библиотека', shrine: false },
  theatre: { name: 'Театр', shrine: true },
  arts_centre: { name: 'Дом культуры', shrine: false },
  clock: { name: 'Часы', shrine: false },
  spring: { name: 'Родник', shrine: false },
  peak: { name: 'Вершина', shrine: true },
  park: { name: 'Парк', shrine: true },
  garden: { name: 'Сад', shrine: false },
  water_tower: { name: 'Водонапорная башня', shrine: true },
  lighthouse: { name: 'Маяк', shrine: true },
  windmill: { name: 'Мельница', shrine: true },
  watermill: { name: 'Водяная мельница', shrine: true },
};

function query(s: number, w: number, n: number, e: number) {
  const bb = `(${s},${w},${n},${e})`;
  return `[out:json][timeout:20];(
nwr["historic"~"^(monument|memorial|castle|ruins|archaeological_site|manor|city_gate|wayside_cross|wayside_shrine|boundary_stone)$"]${bb};
nwr["tourism"~"^(artwork|attraction|viewpoint|museum)$"]${bb};
nwr["amenity"~"^(place_of_worship|fountain|library|theatre|arts_centre|clock)$"]${bb};
nwr["natural"~"^(spring|peak)$"]${bb};
nwr["leisure"~"^(park|garden)$"]["name"]${bb};
nwr["man_made"~"^(water_tower|lighthouse|windmill|watermill)$"]${bb};
);out center tags 1500;`;
}

// детерминированный хеш строки → [0, 1)
function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}
function dist(a: number, b: number, c: number, d: number) {
  const R = 6371000, r = Math.PI / 180;
  const x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

type El = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };

function pick(elements: El[]) {
  const cand = [];
  for (const el of elements) {
    const t = el.tags || {};
    const lat = el.lat ?? el.center?.lat, lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;
    if (t.access === 'private' || t.disused === 'yes' || t['abandoned'] === 'yes') continue;
    const cat = [t.historic, t.tourism, t.amenity, t.natural, t.leisure, t.man_made].find(c => c && CATS[c]);
    if (!cat) continue;
    const named = t['name:ru'] || t.name;
    // безымянные мемориальные таблички и сады почти не видны на местности
    if (!named && (cat === 'garden' || cat === 'boundary_stone')) continue;
    const id = `osm:${el.type[0]}${el.id}`;
    const name = String(named || CATS[cat].name).slice(0, 80);
    const kind = CATS[cat].shrine && hash(id) < 0.45 ? 'shrine' : 'spring';
    // заметнее — важнее: именованные, будущие Капища, крупные объекты (ways/relations)
    const score = (named ? 2 : 0) + (kind === 'shrine' ? 1 : 0) + (el.type !== 'node' ? 0.5 : 0) + hash(id + 's') * 0.1;
    cand.push({ id, source: 'osm', name, kind, cat, lat, lng, score });
  }
  cand.sort((a, b) => b.score - a.score);
  const kept: typeof cand = [];
  for (const c of cand) if (!kept.some(k => dist(k.lat, k.lng, c.lat, c.lng) < MIN_GAP)) kept.push(c);
  return kept.map(({ score: _s, ...rest }) => rest);
}

// Публичные серверы Overpass часто перегружены (504/429): пробуем по очереди, пока есть время
async function overpass(q: string, deadline: number) {
  const errs: string[] = [];
  const start = Math.floor(Math.random() * 2); // первые два сервера чередуем, чтобы делить нагрузку
  const order = [...OVERPASS.slice(start, 2), ...OVERPASS.slice(0, start), ...OVERPASS.slice(2)];
  for (const url of order) {
    const left = deadline - Date.now();
    if (left < 5000) break;
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Duholov/2.1 (github.com/Quinsiege/duholov)' },
        body: 'data=' + encodeURIComponent(q),
        signal: AbortSignal.timeout(Math.min(25000, left)),
      });
      if (r.ok) return (await r.json()).elements as El[];
      errs.push(`${new URL(url).host}: ${r.status}`);
    } catch (e) { errs.push(`${new URL(url).host}: ${(e as Error).name}`); }
  }
  throw new Error('Overpass недоступен — ' + errs.join('; '));
}

// секретный ключ проекта (новая схема ключей Supabase, с запасным вариантом для старой)
function serviceKey() {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    const k = keys.default || Object.values(keys)[0];
    if (k) return String(k);
  } catch { /* старая схема */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  let tiles: [number, number][];
  try {
    tiles = (await req.json()).tiles;
    if (!Array.isArray(tiles) || !tiles.length || tiles.length > MAX_TILES) throw 0;
    tiles = tiles.map(t => [Math.trunc(t[0]), Math.trunc(t[1])] as [number, number]);
    if (tiles.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y) || Math.abs(y * TILE) > 85 || Math.abs(x * TILE) > 180)) throw 0;
  } catch { return json({ error: 'Ожидается { tiles: [[x, y], …] }' }, 400); }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey(), { auth: { persistSession: false } });
  // только для вошедших игроков (анонимный вход игры тоже подходит)
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: who } = token ? await db.auth.getUser(token) : { data: null };
  if (!who?.user) return json({ error: 'Нужен вход в игру' }, 401);
  // в таблице квадраты хранятся с масштабом в имени: «100/x:y» — квадрат 0.01°
  const key = (x: number, y: number) => `${Math.round(1 / TILE)}/${x}:${y}`;
  const ids = tiles.map(([x, y]) => key(x, y));
  const { data: have, error } = await db.from('osm_tiles').select('id, fetched_at').in('id', ids);
  if (error) return json({ error: error.message }, 500);
  const fresh = new Set((have || []).filter(t => Date.now() - Date.parse(t.fetched_at) < REFRESH_DAYS * 864e5).map(t => t.id));

  const deadline = Date.now() + BUDGET;
  const todo = tiles.filter((_, i) => !fresh.has(ids[i]));
  const done: [number, number][] = [], failed: [number, number][] = [];
  for (const [x, y] of todo.slice(0, MAX_FETCH)) {
    try {
      const els = await overpass(query(y * TILE, x * TILE, (y + 1) * TILE, (x + 1) * TILE), deadline);
      const rows = pick(els);
      for (let i = 0; i < rows.length; i += 500) {
        // существующие объекты не трогаем: модератор мог их переименовать или скрыть
        const { error: e } = await db.from('pois').upsert(rows.slice(i, i + 500), { onConflict: 'id', ignoreDuplicates: true });
        if (e) throw new Error(e.message);
      }
      await db.from('osm_tiles').upsert({ id: key(x, y), count: rows.length, fetched_at: new Date().toISOString() });
      done.push([x, y]);
    } catch (e) {
      console.error(key(x, y), String(e));
      failed.push([x, y]);
    }
  }
  const name = ([x, y]: [number, number]) => `${x}:${y}`;
  return json({
    ready: [...tiles.filter((_, i) => fresh.has(ids[i])), ...done].map(name),
    failed: failed.map(name),
    pending: todo.slice(MAX_FETCH).map(name),
  });
});
