// Service Worker for Basecamp Komunitas PWA — True Offline-First (Stale-While-Revalidate)
const CACHE_NAME = 'basecamp-cache-v25';
const API_CACHE_NAME = 'basecamp-api-v25';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './app.css',
  './teks.js',
  './hero.js',
  './app.js',
  './js/app-fetch.js',
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
  './js/profil-foto.js',
  './js/profil-form.js',
  './js/profil-aktivitas.js',
  './js/profil-dokumen.js',
  './js/profil-publik.js',
  './js/pendaftaran.js',
  './js/anggota.js',
  './js/anggota-aksi.js',
  './js/anggota-bidang.js',
  './js/komunitas.js',
  './js/struktur-aturan.js',
  './js/event.js',
  './js/event-peta-dana.js',
  './js/event-lpj.js',
  './js/event-detail.js',
  './js/forum-panduan.js',
  './js/pelengkap.js',
  './js/pelengkap-pengaduan.js',
  './js/pelengkap-kehadiran.js',
  './js/kuesioner-dokumen.js',
  './js/konfigurasi.js',
  './js/progres.js',
  './js/progres-bug.js',
  './js/notifikasi.js',
  './js/iuran-pengingat.js',
  './js/tren.js',
  './js/cari-global.js',
  './js/admin-alert.js',
  './js/ui-helpers.js',
  './js/sync-status.js',
  './js/sync-status-queue.js',
  './js/devtools.js',
  './js/devtools-git.js',
  './js/devtools-diagnose.js',
  './js/devtools-monitor.js',
  './js/devtools-info.js',
  './js/core-events.js',
  './js/scan-bugs.js',
  './js/loading.js',
  './js/panel-admin.js',
  './js/panel-admin-tambah.js',
  './panel-admin.html',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => Promise.resolve());
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key !== API_CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Stale-While-Revalidate untuk semua GET (HTML/JS/CSS/API sama-sama offline-first)
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Auth dengan token jangan di-cache API
  if (req.url.includes('/api/collections/users/auth-with-password') || req.url.includes('/api/admins/auth-with-password')) return;
  // Jangan cache file HTML secara dinamis — selalu ambil terbaru dari network
  if (req.url.endsWith('.html') || req.url.endsWith('/')) return;
  // Jangan cache laporan scan — selalu ambil terbaru dari network
  if (req.url.includes('/scan-report.json')) return;

  const cacheName = req.url.includes('/api/') ? API_CACHE_NAME : CACHE_NAME;

  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((networkRes) => {
        if (networkRes && networkRes.status === 200 && networkRes.ok) {
          const clone = networkRes.clone();
          caches.open(cacheName).then((cache) => cache.put(req, clone)).catch(() => {});
        } else if (networkRes && networkRes.status === 200) {
          // tetap cache walau ok false? tidak, skip
        }
        return networkRes;
      }).catch(() => {
        // Offline: fallback ke cache
        return cached || caches.match('./index.html');
      });
      // Kembalikan cache dulu jika ada (true offline-first), sambil refresh background
      return cached || network;
    })
  );
});

