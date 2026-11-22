const assets = /* PRECACHE_ASSETS */ [];
const cacheName = 'daily-brief-shell-__BUILD_HASH__';
const index = '/index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(assets.map((url) => new Request(url, { cache: 'reload' })))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('daily-brief-shell-') && key !== cacheName).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || /^\/api(?:\/|$)/.test(url.pathname)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(caches.open(cacheName).then((cache) => cache.match(index)).then((cached) => cached || fetch(event.request)));
  } else if (assets.includes(url.pathname)) {
    event.respondWith(caches.open(cacheName).then((cache) => cache.match(url.pathname)).then((cached) => cached || fetch(event.request)));
  }
});
