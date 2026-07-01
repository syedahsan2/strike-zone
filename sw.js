const CACHE = 'strikezone-v1';
const ASSETS = [
  './',
  './index.html',
  './game.js',
  './manifest.json',
  'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'
];

self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE).then(cache=> cache.addAll(ASSETS).catch(()=>{}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=> Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});

// Cache-first for our own files, network-first fallback to cache for everything else
self.addEventListener('fetch', e=>{
  e.respondWith(
    caches.match(e.request).then(cached=>{
      if(cached) return cached;
      return fetch(e.request).then(res=>{
        try{
          const clone = res.clone();
          caches.open(CACHE).then(cache=> cache.put(e.request, clone));
        }catch(err){}
        return res;
      }).catch(()=> cached);
    })
  );
});
