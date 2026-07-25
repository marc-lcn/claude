// Lot E : ce nom de cache n'est PAS lié au numéro de version de l'application
// (voir version.json / VERSION) — il ne change que lorsque la liste des
// fichiers pré-cachés change (comme ici, avec l'ajout de version.json).
// La fraîcheur du contenu est déjà garantie par la stratégie "réseau
// d'abord" ci-dessous ; ce cache n'est qu'un secours hors-ligne.
const CACHE_NAME = 'gemvap-pilotage-v3';
const FILES_TO_CACHE = [
  '/index.html',
  '/manifest.json',
  '/version.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Stratégie simple : réseau d'abord (pour les mises à jour), secours sur le cache
// L'application a de toute façon besoin d'internet pour parler à Supabase.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
