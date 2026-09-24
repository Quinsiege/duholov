/* Service worker: офлайн-запуск и доставка обновлений.
   Код игры всегда перепроверяется на сервере (cache: 'no-cache' → быстрый ответ 304, если не менялся),
   кэш используется только без сети. Название кэша меняется вместе с версией из js/version.js. */
importScripts('js/version.js?v=dev');
const VERSION = 'duholov-v' + APP_VERSION;
const CORE = [
  './', './index.html', './manifest.webmanifest', './css/style.css?v=dev',
  './js/version.js?v=dev', './js/config.js?v=dev', './js/settings.js?v=dev', './js/data.js?v=dev', './js/util.js?v=dev', './js/diff.js?v=dev', './js/art.js?v=dev', './js/state.js?v=dev', './js/events.js?v=dev', './js/sky.js?v=dev', './js/music.js?v=dev', './js/world.js?v=dev',
  './js/map.js?v=dev', './js/encounter.js?v=dev', './js/raid.js?v=dev', './js/duel.js?v=dev', './js/rules.js?v=dev', './js/trade.js?v=dev', './js/tutorial.js?v=dev', './js/album.js?v=dev', './js/league.js?v=dev',
  './js/journal.js?v=dev', './js/friends.js?v=dev', './js/order.js?v=dev', './js/clans.js?v=dev', './js/hints.js?v=dev', './js/shop.js?v=dev', './js/auction.js?v=dev', './js/chat.js?v=dev', './js/coop.js?v=dev', './js/cloud.js?v=dev', './js/game.js?v=dev', './js/login.js?v=dev', './js/exif.js?v=dev', './js/osm.js?v=dev', './js/pois.js?v=dev', './js/propose.js?v=dev', './js/updater.js?v=dev', './js/ui.js?v=dev', './js/loader.js?v=dev', './js/main.js?v=dev',
  './icons/icon-192.png', './icons/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
];
const TILE_CACHE = 'duholov-tiles';
const TILE_LIMIT = 1500;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== TILE_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
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
  const cdn = url.hostname === 'cdnjs.cloudflare.com' || url.hostname === 'cdn.jsdelivr.net' || url.hostname.includes('fonts.g');
  if (!sameOrigin && !cdn) return;
  // свой код перепроверяем на сервере при каждом запросе; CDN с версиями в адресе — обычным запросом
  const req = !sameOrigin ? e.request : e.request.mode === 'navigate' ? new Request(url.href, { cache: 'no-cache' }) : new Request(e.request, { cache: 'no-cache' });
  e.respondWith(fetch(req).then(res => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(e.request, copy));
    }
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: sameOrigin && e.request.mode === 'navigate' })));
});
