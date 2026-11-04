// Service Worker for Basecamp Komunitas PWA
const CACHE_NAME = 'basecamp-cache-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './app.css',
  './teks.js',
  './hero.js',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Network-first for html/js/css to ensure live changes load immediately in normal browser mode
self.addEventListener('fetch', (e) => {
  // Never cache API requests
  if (e.request.url.includes('/api/')) {
    return;
  }

  // Network first, fallback to cache
  e.respondWith(
    fetch(e.request)
      .then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return networkRes;
      })
      .catch(() => {
        return caches.match(e.request);
      })
  );
});

