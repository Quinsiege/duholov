/* Service worker: офлайн-запуск и доставка обновлений.
   Код игры всегда перепроверяется на сервере (cache: 'no-cache' → быстрый ответ 304, если не менялся),
   кэш используется только без сети. Название кэша меняется вместе с версией из js/version.js. */
importScripts('js/version.js?v=dev');
// 4.7: к версии добавляется метка сборки (CI ставит короткий хэш коммита) — каждая выкладка сразу обновляет кэш,
// даже если номер версии не менялся (раньше телефон мог держать прошлую сборку той же версии)
const BUILD = 'dev';
const VERSION = 'duholov-v' + APP_VERSION + '-' + BUILD;
const CORE = [
  './', './index.html', './manifest.webmanifest', './css/style.css?v=dev',
  './vendor/maplibre/maplibre-gl-csp.js?v=dev', './vendor/maplibre/pmtiles.js?v=dev', './vendor/maplibre/basemaps.js?v=dev', './vendor/maplibre/maplibre-gl.css?v=dev', './vendor/maplibre/maplibre-gl-csp-worker.js', './vendor/leaflet/leaflet.min.js?v=dev', './vendor/protomaps/protomaps-leaflet.min.js?v=dev', './vendor/leaflet/leaflet.min.css?v=dev', './vendor/fonts/rubik.css?v=dev', './vendor/fonts/display.css?v=dev', './vendor/supabase.min.js',
  './js/version.js?v=dev', './js/i18n.js?v=dev', './js/config.js?v=dev', './js/move.js?v=dev', './js/errors.js?v=dev', './js/metrics.js?v=dev', './js/settings.js?v=dev', './js/myth-greek.js?v=dev', './js/myth-norse.js?v=dev', './js/myth-celtic.js?v=dev', './js/myth-egypt.js?v=dev', './js/myth-china.js?v=dev', './js/myth-aztec.js?v=dev', './js/myth-japan.js?v=dev', './js/data.js?v=dev', './js/util.js?v=dev', './js/diff.js?v=dev', './js/art.js?v=dev', './js/places-art.js?v=dev', './js/skins-art.js?v=dev', './js/looks-art.js?v=dev', './js/art-kit.js?v=dev', './js/sp-fire.js?v=dev', './js/sp-water.js?v=dev', './js/sp-forest.js?v=dev', './js/sp-forest2.js?v=dev', './js/sp-wind.js?v=dev', './js/sp-wind2.js?v=dev', './js/sp-current.js?v=dev', './js/sp-shadow.js?v=dev', './js/sp-shadow2.js?v=dev', './js/sp-greek.js?v=dev', './js/sp-norse.js?v=dev', './js/sp-celtic.js?v=dev', './js/sp-egypt.js?v=dev', './js/sp-china.js?v=dev', './js/sp-aztec.js?v=dev', './js/sp-japan.js?v=dev', './js/state.js?v=dev', './js/events.js?v=dev', './js/sky.js?v=dev', './js/music.js?v=dev', './js/world.js?v=dev',
  './js/stage.js?v=dev', './js/walk.js?v=dev', './js/m3d.js?v=dev', './js/bld3d.js?v=dev', './js/map.js?v=dev', './js/encounter.js?v=dev', './js/raid.js?v=dev', './js/duel.js?v=dev', './js/rules.js?v=dev', './js/trade.js?v=dev', './js/tutorial.js?v=dev', './js/album.js?v=dev', './js/league.js?v=dev', './js/league-battle.js?v=dev',
  './js/journal.js?v=dev', './js/friends.js?v=dev', './js/order.js?v=dev', './js/alatyr.js?v=dev', './js/season-rewards.js?v=dev','./js/clans.js?v=dev', './js/hints.js?v=dev', './js/shop.js?v=dev', './js/auction.js?v=dev', './js/chat.js?v=dev', './js/coop.js?v=dev', './js/cloud.js?v=dev', './js/game.js?v=dev', './js/login.js?v=dev', './js/exif.js?v=dev', './js/osm.js?v=dev', './js/pois.js?v=dev', './js/propose.js?v=dev', './js/updater.js?v=dev', './js/atlas.js?v=dev', './js/ui.js?v=dev', './js/ui-spirits.js?v=dev', './js/ui-player.js?v=dev', './js/scene.js?v=dev', './js/realms.js?v=dev', './js/loader.js?v=dev', './js/path.js?v=dev', './js/book.js?v=dev', './js/intro.js?v=dev', './js/main.js?v=dev',
  './icons/icon-192.png', // 5.0: значки лиг — SVG в коде (League.badge); 5.1.24: без icon-512.png (403 КБ — игре не нужен); 5.1.35: без картинки-логотипа
];
const TILE_CACHE = 'duholov-tiles';
const TILE_LIMIT = 1500;
// звуки (www/sfx) — свой кэш, он переживает выпуски: файлы не перекачиваются при каждой выкладке.
// Адрес с меткой ?v=N (SFX_VER в util.js): сменилась метка — старые записи удаляются при первой загрузке новой
const SFX_CACHE = 'duholov-sfx';
// 5.1.28: модели мест на карте (models/*.m3d, js/m3d.js) — тоже свой кэш, переживает выпуски; метка ?v= — M3D.VER
const MODEL_CACHE = 'duholov-models';

// 5.1.24: установка не качает заново то, что уже скачано. Файлы с меткой версии (?v=5.1.24-…) не меняются (сервер отдаёт их
// «immutable» на год) — берём из HTTP-кэша браузера: их только что загрузила страница. Остальное (страница, манифест,
// библиотека облака, значок, логотип) — сверяем с сервером (no-cache: 304, если не менялось). Раньше — cache: 'reload':
// в первый заход и при каждом обновлении всё качалось второй раз (≈1,7 МБ)
const installMode = u => /[?&]v=\d/.test(u) ? 'default' : 'no-cache';
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE.map(u => new Request(u, { cache: installMode(u) })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== TILE_CACHE && k !== SFX_CACHE && k !== MODEL_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname === 'tile.openstreetmap.org') {
    // тайлы: сеть (с учётом HTTP-кэша браузера), при обрыве связи — ранее просмотренные тайлы
    e.respondWith(fetch(e.request).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(TILE_CACHE).then(c => {
          c.put(e.request, copy);
          c.keys().then(k => { if (k.length > TILE_LIMIT) k.slice(0, k.length - TILE_LIMIT).forEach(r => c.delete(r)); });
        });
      }
      return res;
    }).catch(() => caches.open(TILE_CACHE).then(c => c.match(e.request))));
    return;
  }
  const sameOrigin = url.origin === location.origin;
  // version.json, APK и серверы (Supabase, погода) — всегда напрямую из сети
  if (sameOrigin && (url.pathname.endsWith('version.json') || url.pathname.endsWith('.apk'))) return;
  // 4.1: все библиотеки и шрифты — свои (vendor/), чужие адреса (Supabase, погода, Overpass) — всегда напрямую из сети
  if (!sameOrigin) return;
  // 4.26: ответ сервиса входа (auth.html?code=…) не кэшируем — одноразовый код не должен оседать в кэше
  if (url.pathname.endsWith('/auth.html') || url.searchParams.has('code')) return;
  // карта (tiles/*.pmtiles) читается кусками (Range, ответ 206) — такие ответы кэширует сам браузер, не service worker
  if (url.pathname.includes('/tiles/')) return;
  // 4.8: музыка (audio/*.mp3) тоже читается кусками — её кэширует браузер
  if (url.pathname.includes('/audio/')) return;
  // звуки (sfx/*.mp3) — целиком (Sfx.load), сначала из своего кэша; новая метка ?v= — старые записи удаляются.
  // 5.1.28: так же — модели мест (models/*.m3d)
  const own = url.pathname.includes('/sfx/') && url.pathname.endsWith('.mp3') ? SFX_CACHE
    : url.pathname.includes('/models/') && url.pathname.endsWith('.m3d') ? MODEL_CACHE : null;
  if (own) {
    const v = url.searchParams.get('v');
    e.respondWith(caches.open(own).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok) {
        c.put(e.request, res.clone());
        c.keys().then(ks => ks.forEach(r => { if (new URL(r.url).searchParams.get('v') !== v) c.delete(r); }));
      }
      return res;
    }))));
    return;
  }
  // файлы с меткой версии (?v=4.1.0) и vendor/ не меняются — сразу из кэша: быстрый запуск и меньше трафика
  if (/[?&]v=\d/.test(url.search) || url.pathname.includes('/vendor/')) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
      return res;
    })));
    return;
  }
  // остальное своё (страница, ?v=dev на localhost) перепроверяем на сервере при каждом запросе
  const req = e.request.mode === 'navigate' ? new Request(url.href, { cache: 'no-cache' }) : new Request(e.request, { cache: 'no-cache' });
  e.respondWith(fetch(req).then(res => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(e.request, copy));
    }
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: sameOrigin && e.request.mode === 'navigate' })));
});
