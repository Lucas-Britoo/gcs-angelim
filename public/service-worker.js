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
  // Estratégia "Network First, Falling Back to Cache" para a API do Supabase (Offline-First)
  if (event.request.url.includes('/.netlify/functions/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Deu certo! Clona a matriz e guarda escondida na galeria de caches
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Celular Sem Internet? Sem problema: Resgata a matriz de ontem
          return caches.match(event.request);
        })
    );
    return;
  }

  // Estratégia Stale-While-Revalidate Dinâmica pra assets Vitestáticos
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response; // Devolve do cache imediatamente
        
        return fetch(event.request).then(networkResponse => {
          if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
             return networkResponse;
          }
          // Acumula assets (JS, CSS) gerados dinamicamente no bolo de Cache
          if (event.request.url.match(/\.(js|css|png|svg)$/i)) {
             const responseToCache = networkResponse.clone();
             caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        }).catch(() => {
          // Se falhou carregar HTML ou CSS sem internet, silencia pacífica.
        });
      })
  );
});
