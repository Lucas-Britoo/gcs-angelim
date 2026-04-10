const CACHE_NAME = 'gcs-angelim-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // Estratégia de cache-first para estáticos e network-first para functions
  if (event.request.url.includes('/.netlify/functions/')) {
    event.respondWith(fetch(event.request)); // Sempre busca na rede (dinâmico)
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
