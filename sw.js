const CACHE_NAME = 'jm-express-bon-v181';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // cache: 'reload' force un vrai téléchargement, en ignorant le cache HTTP du navigateur —
      // sans ça, une ancienne version mise en cache par Safari pouvait être réinstallée
      // même après suppression + réinstallation de l'icône.
      return Promise.all(
        APP_SHELL.map((url) => fetch(url, {cache: 'reload'}).then((res) => cache.put(url, res)))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isAppShell = url.origin === self.location.origin;

  // sw.js sert à détecter les mises à jour : il doit toujours venir du réseau,
  // sinon l'application comparerait sa version à une copie périmée d'elle-même.
  if (url.pathname.endsWith('/sw.js')) {
    event.respondWith(fetch(req, {cache: 'no-store'}).catch(() => new Response('', {status: 503})));
    return;
  }
  // La page principale (navigation) doit toujours privilégier une copie fraîche du réseau :
  // en cache-first, une copie en cache incomplète ou corrompue (ex: coupure réseau pendant
  // une mise à jour) serait servie à l'infini, provoquant un écran blanc permanent.
  const estDocumentPrincipal = req.mode === 'navigate' || req.destination === 'document';

  if (isAppShell && estDocumentPrincipal) {
    event.respondWith(
      fetch(req, {cache: 'no-store'}).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      }).catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
  } else if (isAppShell) {
    // Icônes, manifest : cache-first, ça fonctionne hors ligne et ça ne change presque jamais.
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      }).catch(() => cached))
    );
  } else {
    // Polices Google Fonts : réseau si dispo, sinon on laisse tomber sans casser l'app
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
  }
});
