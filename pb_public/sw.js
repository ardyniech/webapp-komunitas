// Service Worker for Basecamp Komunitas PWA
const CACHE_NAME = 'basecamp-cache-v4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './app.css',
  './teks.js',
  './hero.js',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './js/auth.js',
  './js/markas.js',
  './js/kas.js',
  './js/wizard-kas.js',
  './js/koreksi-kas.js',
  './js/iuran.js',
  './js/astrologi.js',
  './js/profil.js',
  './js/profil-dokumen.js',
  './js/profil-publik.js',
  './js/pendaftaran.js',
  './js/anggota.js',
  './js/komunitas.js',
  './js/struktur-aturan.js',
  './js/event.js',
  './js/event-peta-dana.js',
  './js/event-lpj.js',
  './js/forum-panduan.js',
  './js/pelengkap.js',
  './js/kuesioner-dokumen.js',
  './js/konfigurasi.js',
  './js/progres.js',
  './js/core-events.js'
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

