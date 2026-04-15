/**
 * Angelim PWA — Service Worker v2.0
 *
 * Estratégias:
 *   ● Network-First  → Supabase (dados sempre frescos, fallback offline para cache)
 *   ● Cache-First    → Assets estáticos (JS, CSS, imagens, fontes)
 *   ● Pre-cache      → App Shell instalado no evento 'install'
 */

const CACHE_NAME = 'angelim-pwa-v2';

const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './js/app.js',
  './js/supabase-client.js',
  './js/admin-dashboard.js',
  './public/logo.svg',
  './public/logo.jpeg',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap',
];

// ─── INSTALL: Pre-cache App Shell ─────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(err => console.warn('[SW] Pre-cache parcial (OK):', err)),
  );
});

// ─── ACTIVATE: Remove caches antigos ──────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

// ─── FETCH — Robust Error Handling v3.0 ───────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const urlStr = request.url;

  // ✅ Ignora requisições de desenvolvimento Vite e assets internos (Network Only)
  if (urlStr.includes('/@vite/') || urlStr.includes('/node_modules/') || urlStr.includes('localhost') || urlStr.includes('.hot-update.')) {
    event.respondWith(fetch(request));
    return;
  }

  // Ignore non-GET requests
  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  // Ignore chrome extensions
  try {
    if (new URL(request.url).protocol === 'chrome-extension:') return;
  } catch (e) { return; }

  const url = new URL(request.url);

  // 🔴 Network-First → Supabase REST & Auth (with robust error handling)
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        } catch (err) {
          console.warn('[SW] Supabase fetch failed:', err);
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(JSON.stringify({ error: 'Network unavailable' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      })()
    );
    return;
  }

  // 🟡 Network-First → External CDN (unpkg, jsdelivr)
  if (url.hostname.includes('cdn.jsdelivr.net') || url.hostname.includes('unpkg.com')) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        } catch (err) {
          const cached = await caches.match(request);
          if (cached) return cached;
          return fetch(request); // Re-throw to browser
        }
      })()
    );
    return;
  }

  // 🟢 Cache-First → App Shell + Static Assets
  event.respondWith(
    (async () => {
      try {
        // Try cache first
        const cached = await caches.match(request);
        if (cached) return cached;

        // Network fallback
        const response = await fetch(request);
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }

        // Cache static assets
        if (/\.(js|css|png|jpe?g|svg|woff2?|ttf|ico)$/i.test(url.pathname)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      } catch (err) {
        console.warn('[SW] Fetch failed:', err);
        // Fallback for navigation
        if (request.mode === 'navigate') {
          const cachedIndex = await caches.match('./index.html');
          if (cachedIndex) return cachedIndex;
        }
        // Return friendly error response
        return new Response('Service unavailable', { status: 503 });
      }
    })()
  );
});
