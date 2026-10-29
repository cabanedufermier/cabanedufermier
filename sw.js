/* ============================================
   CABANE DU FERMIER — Service Worker (PWA)
   ============================================ */

const CACHE_NAME = 'cabane-fermier-v1';
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css?v=3',
    '/script.js',
    '/manifest.json',
    '/images/Logo.png',
    '/images/Logo.webp',
    '/images/icon-192.png',
    '/images/icon-512.png',
    '/images/icon-maskable-512.png',
    '/404.html'
];

// Installation : mise en cache initiale
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(PRECACHE_ASSETS).catch(err => {
                console.warn('[SW] Pre-caching warning:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            );
        }).then(() => self.clients.claim())
    );
});

// Interception des requêtes : Network First avec Fallback Cache
self.addEventListener('fetch', event => {
    const req = event.request;
    // Ne pas intercepter les requêtes hors GET ou vers Google Analytics/GTM/Leaflet tiles externes
    if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        fetch(req)
            .then(networkRes => {
                // Mettre à jour le cache dynamiquement si valide
                if (networkRes && networkRes.status === 200) {
                    const resClone = networkRes.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
                }
                return networkRes;
            })
            .catch(() => {
                // Hors ligne ou connexion défaillante : récupérer depuis le cache
                return caches.match(req).then(cachedRes => {
                    if (cachedRes) return cachedRes;
                    if (req.headers.get('accept')?.includes('text/html')) {
                        return caches.match('/index.html');
                    }
                });
            })
    );
});
