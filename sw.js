const CACHE_NAME = 'straw-collector-v2';

const ASSETS = [
  '/login.html',
  '/home.html',
  '/farmer-form.html',
  '/pickup-form.html',
  '/dashboard.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/offline-sync.js',
];

// ── INSTALL: cache all core assets ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ── ACTIVATE: delete old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: network first, fall back to cache ──
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Don't intercept API calls — always go to network for live data
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache a fresh copy of HTML pages and JS on every successful fetch
        if (response.ok && event.request.url.match(/\.(html|js)$/)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Network failed — serve from cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // If no cache for this page, fall back to login
          return caches.match('/login.html');
        });
      })
  );
});
