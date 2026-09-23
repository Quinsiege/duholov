/* Service worker: офлайн-запуск и доставка обновлений.
   Код игры всегда перепроверяется на сервере (cache: 'no-cache' → быстрый ответ 304, если не менялся),
   кэш используется только без сети. Название кэша меняется вместе с версией из js/version.js. */
importScripts('js/version.js');
const VERSION = 'duholov-v' + APP_VERSION;
const CORE = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/version.js', './js/config.js', './js/data.js', './js/util.js', './js/art.js', './js/state.js', './js/events.js', './js/sky.js', './js/music.js', './js/world.js',
  './js/map.js', './js/encounter.js', './js/raid.js', './js/duel.js', './js/trade.js', './js/tutorial.js', './js/album.js', './js/league.js',
  './js/journal.js', './js/friends.js', './js/coop.js', './js/cloud.js', './js/sync.js', './js/exif.js', './js/osm.js', './js/pois.js', './js/propose.js', './js/updater.js', './js/ui.js', './js/main.js',
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
  // version.json, APK и серверы (Supabase, PeerJS, погода) — всегда напрямую из сети
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
