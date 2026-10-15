// v315 — fermeture des fenêtres lors du changement d’onglet.
const CACHE_NAME = 'jm-express-bon-v326';

// Seuls les fichiers indispensables doivent pouvoir bloquer l'installation.
const APP_SHELL_REQUIRED = [
  './',
  './index.html',
  './manifest.json',
  './fuel-receipts.js?v=326',
  './navigation.js?v=326',
  './operations.js?v=326'
];

// Un visuel ou une icône manquante ne doit jamais empêcher une mise à jour.
const APP_SHELL_OPTIONAL = [
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './services-hero.png',
  './game-driver.js',
  './game.html',
  './game-client.js',
  './game-questions.js'
];

// Lazy download after the user has seen the first-use size notice.
const OCR_CACHE='jm-ocr-v6-fra-v1';
const OCR_ASSETS={
 'pdf.min.mjs':'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs',
 'pdf.worker.min.mjs':'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs',
 'tesseract.min.js':'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js',
 'worker.min.js':'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js',
 'core/tesseract-core-lstm.wasm.js':'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0/tesseract-core-lstm.wasm.js',
 'core/tesseract-core-simd-lstm.wasm.js':'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0/tesseract-core-simd-lstm.wasm.js',
 'core/tesseract-core-lstm.wasm':'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0/tesseract-core-lstm.wasm',
 'core/tesseract-core-simd-lstm.wasm':'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0/tesseract-core-simd-lstm.wasm',
 'lang/fra.traineddata.gz':'https://cdn.jsdelivr.net/npm/@tesseract.js-data/fra@1.0.0/4.0.0_best_int/fra.traineddata.gz'
};
const ocrRoot=new URL('./ocr/',self.registration.scope).href;
let ocrPreparing;
async function ocrAsset(name){const cache=await caches.open(OCR_CACHE),key=ocrRoot+name,cached=await cache.match(key);if(cached)return cached;const res=await fetch(OCR_ASSETS[name],{mode:'cors',credentials:'omit'});if(!res.ok)throw Error('Lecteur non téléchargé : '+name);await cache.put(key,res.clone());return res;}
self.addEventListener('message',event=>{if(event.data?.type!=='JM_PREPARE_OCR')return;const port=event.ports[0];event.waitUntil((async()=>{try{if(!ocrPreparing)ocrPreparing=(async()=>{for(const name of Object.keys(OCR_ASSETS))await ocrAsset(name);})();await ocrPreparing;port?.postMessage({ok:true});}catch(e){port?.postMessage({ok:false,error:'Téléchargement du lecteur incomplet. Réessaie avec une connexion stable. '+e.message});}finally{ocrPreparing=null;}})());});
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // cache: 'reload' force un vrai téléchargement, en ignorant le cache HTTP du navigateur —
      // sans ça, une ancienne version mise en cache par Safari pouvait être réinstallée
      // même après suppression + réinstallation de l'icône.
      const cacheRequired = APP_SHELL_REQUIRED.map((url) =>
        fetch(url, {cache: 'reload'}).then((res) => {
          if (!res.ok) throw new Error(`Pré-cache indispensable impossible: ${url} (${res.status})`);
          return cache.put(url, res);
        })
      );

      const cacheOptional = APP_SHELL_OPTIONAL.map((url) =>
        fetch(url, {cache: 'reload'}).then((res) => {
          if (!res.ok) return;
          return cache.put(url, res);
        }).catch(() => undefined)
      );

      return Promise.all([...cacheRequired, ...cacheOptional]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME && !n.startsWith('jm-ocr-')).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if(url.href.startsWith(ocrRoot)){const name=url.href.slice(ocrRoot.length);if(OCR_ASSETS[name])event.respondWith(ocrAsset(name).catch(()=>new Response('Lecteur hors ligne absent : ouvre une lecture avec une connexion Internet.',{status:503})));return;}
  const isAppShell = url.origin === self.location.origin;

  if(url.pathname.includes('/api/game/')) return;
  if(isAppShell && /\/game(?:-client|-driver|-questions)?\.(?:html|js)$/.test(url.pathname)){
    event.respondWith(fetch(req,{cache:'no-store'}).then(res=>{if(!res.ok)throw Error('game');const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put(req,copy));return res;}).catch(()=>caches.match(req)));return;
  }
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
  } else if (isAppShell && url.pathname.endsWith('/services-hero.png')) {
    // Visuel de présentation : réseau d'abord pour récupérer une image nouvellement publiée,
    // puis copie locale pour continuer à l'afficher hors ligne.
    event.respondWith(
      fetch(req, {cache: 'reload'}).then((res) => {
        if (!res.ok) throw new Error(`Image indisponible (${res.status})`);
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      }).catch(() => caches.match(req))
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
