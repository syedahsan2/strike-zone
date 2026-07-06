const CACHE_NAME = 'strike-zone-v4';
const ASSETS = [
  './',
  './index.html',
  './game.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install — pre-cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — drop old caches and take control immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network-first for our own files (so a normal reload always gets the
// latest deploy), falling back to cache only when offline. This fixes the
// "still shows the old version" issue that a pure cache-first strategy causes.
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)).catch(()=>{});
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
  );
});