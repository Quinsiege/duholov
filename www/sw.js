/* Service worker: игра работает офлайн (кроме тайлов карты, которые кэшируются по мере просмотра) */
const VERSION = 'duholov-v1.9';
const CORE = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/config.js', './js/data.js', './js/util.js', './js/art.js', './js/state.js', './js/events.js', './js/sky.js', './js/music.js', './js/world.js',
  './js/map.js', './js/encounter.js', './js/raid.js', './js/duel.js', './js/trade.js', './js/tutorial.js', './js/album.js', './js/league.js', './js/backup.js', './js/journal.js', './js/friends.js', './js/coop.js', './js/cloud.js', './js/ui.js', './js/main.js',
  './icons/icon-192.png', './icons/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
];
const TILE_CACHE = 'duholov-tiles';
const TILE_LIMIT = 1500;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
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
  // серверы (Supabase, PeerJS, погода) и APK — напрямую, без кэша
  const cacheable = (url.origin === location.origin && !url.pathname.endsWith('.apk')) ||
    url.hostname === 'cdnjs.cloudflare.com' || url.hostname === 'cdn.jsdelivr.net' || url.hostname.includes('fonts.g');
  if (!cacheable) return;
  // код игры: сеть с запасным кэшем (чтобы обновления приходили сразу)
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(e.request, copy));
    }
    return res;
  }).catch(() => caches.match(e.request)));
});
