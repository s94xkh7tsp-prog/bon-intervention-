// v329 — cache distinct par livraison, réponses vérifiées, nettoyage limité à JM Express,
// retour rapide au document en cache quand le réseau tarde.
const CACHE_PREFIX = 'jm-express-bon-';
const CACHE_NAME = 'jm-express-bon-v334';
const NAV_TIMEOUT_MS = 4000;

// Seuls les fichiers indispensables doivent pouvoir bloquer l'installation.
const APP_SHELL_REQUIRED = [
  './',
  './index.html',
  './manifest.json',
  './fuel-receipts.js?v=329',
  './navigation.js?v=329',
  './operations.js?v=329',
  './game-driver.js?v=329'   // chargé par index.html au démarrage : même livraison obligatoire
];

// Un visuel ou une icône manquante ne doit jamais empêcher une mise à jour.
const APP_SHELL_OPTIONAL = [
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './services-hero.png',
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
// Une réponse n'est mise en cache que si elle est complète et de ce site.
function reponseValide(res){ return !!res && res.ok && res.status === 200 && (res.type === 'basic' || res.type === 'default'); }
const numeroCache = (n) => { const m = String(n).match(/-v(\d+)$/); return m ? Number(m[1]) : NaN; };

// Auto-réparation : si le cache de cette livraison a été vidé (ex. ancien bouton « Mettre à jour »
// de la v326 qui supprimait les caches pendant l'installation), on le complète dès que le réseau le permet.
let reparation = null;
function completerCache(){
  if (reparation) return reparation;
  reparation = (async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const url of APP_SHELL_REQUIRED) {
      if (await cache.match(url)) continue;
      try{
        const res = await fetch(url, {cache: 'reload'});
        if (!reponseValide(res)) continue;
        if ((url === './' || url === './index.html') && !(await res.clone().text()).includes(CACHE_NAME)) continue;
        await cache.put(url, res);
      }catch(e){ /* hors ligne : on réessaiera */ }
    }
  })().finally(() => { reparation = null; });
  return reparation;
}
// Recherche limitée aux caches JM Express, en URL exacte (le ?v= garantit des fichiers de la même livraison).
async function matchJm(req, opts){
  const own = await (await caches.open(CACHE_NAME)).match(req, opts);
  if (own) return own;
  const noms = (await caches.keys()).filter((n) => n.startsWith(CACHE_PREFIX) && n !== CACHE_NAME).sort((x, y) => numeroCache(y) - numeroCache(x));
  for (const n of noms) { const r = await (await caches.open(n)).match(req, opts); if (r) return r; }
  return undefined;
}

self.addEventListener('install', (event) => {
  // Seuls les fichiers indispensables conditionnent l'installation. Ils sont téléchargés
  // dans le cache de CETTE livraison : une installation interrompue ne touche jamais le cache actif.
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try{
      await Promise.all(APP_SHELL_REQUIRED.map(async (url) => {
        // cache: 'reload' ignore le cache HTTP de Safari (évite de réinstaller une ancienne copie).
        const res = await fetch(url, {cache: 'reload'});
        if (!reponseValide(res)) throw new Error(`Pré-cache indispensable impossible: ${url} (${res.status})`);
        if ((url === './' || url === './index.html') && !(await res.clone().text()).includes(CACHE_NAME)) {
          throw new Error('index.html publié ne correspond pas à ' + CACHE_NAME);
        }
        await cache.put(url, res);
      }));
    }catch(e){
      await caches.delete(CACHE_NAME);   // pas de cache à moitié rempli
      throw e;                            // installation abandonnée : l'ancienne version reste active
    }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // On ne supprime que des caches JM Express plus anciens, en gardant la livraison précédente
    // (une page encore ouverte peut en avoir besoin jusqu'à son rechargement).
    const noms = (await caches.keys()).filter((n) => n.startsWith(CACHE_PREFIX) && n !== CACHE_NAME);
    const anciens = noms.filter((n) => Number.isFinite(numeroCache(n))).sort((x, y) => numeroCache(y) - numeroCache(x));
    const aGarder = new Set(anciens.filter((n) => numeroCache(n) < numeroCache(CACHE_NAME)).slice(0, 1));
    await Promise.all(noms.filter((n) => !aGarder.has(n)).map((n) => caches.delete(n)));
    await self.clients.claim();
    await completerCache().catch(() => undefined);
  })());
  // Ressources facultatives (icônes, jeu) : en arrière-plan, sans bloquer l'activation.
  caches.open(CACHE_NAME).then((cache) => Promise.all(APP_SHELL_OPTIONAL.map((url) =>
    cache.match(url).then((deja) => deja || fetch(url, {cache: 'reload'}).then((res) => reponseValide(res) ? cache.put(url, res) : undefined))
      .catch(() => undefined)))).catch(() => undefined);
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if(url.href.startsWith(ocrRoot)){const name=url.href.slice(ocrRoot.length);if(OCR_ASSETS[name])event.respondWith(ocrAsset(name).catch(()=>new Response('Lecteur hors ligne absent : ouvre une lecture avec une connexion Internet.',{status:503})));return;}
  const isAppShell = url.origin === self.location.origin;

  if(url.pathname.includes('/api/game/')) return;
  if(isAppShell && /\/game(?:-client|-questions)?\.(?:html|js)$/.test(url.pathname)){
    event.respondWith(fetch(req,{cache:'no-store'}).then(res=>{if(!reponseValide(res))throw Error('game');const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put(req,copy)).catch(()=>{});return res;}).catch(()=>caches.open(CACHE_NAME).then(c=>c.match(req)).then(r=>r||new Response('Jeu indisponible hors ligne',{status:503}))));return;
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
    // Réseau d'abord, mais si le réseau tarde (> 4 s) on affiche la copie de CETTE livraison :
    // son HTML et ses scripts viennent du même cache, donc toujours compatibles.
    const reseau = fetch(req, {cache: 'no-store'});
    // On ne remplace la copie locale que par un document complet de la même livraison :
    // un HTML plus récent appellerait des scripts absents de ce cache (écran blanc hors ligne).
    event.waitUntil(reseau.then((res) => {
      if (!reponseValide(res)) return;
      completerCache().catch(() => undefined);
      const copie = res.clone();
      return copie.text().then((t) => t.includes(CACHE_NAME)
        ? caches.open(CACHE_NAME).then((c) => c.put('./index.html', new Response(t, {headers: {'Content-Type': 'text/html; charset=utf-8'}})))
        : undefined);
    }).catch(() => undefined));
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const enCache = () => cache.match(req, {ignoreSearch: true}).then((r) => r || cache.match('./index.html')).then((r) => r || cache.match('./'));
      let local = await enCache();
      // Cache de cette livraison absent : copie complète d'une livraison précédente (HTML + scripts du même cache).
      if (!local) local = await matchJm('./index.html');
      if (!local) return reseau;   // première installation : il faut le réseau
      const delai = new Promise((ok) => setTimeout(() => ok(null), NAV_TIMEOUT_MS));
      try{
        const gagnant = await Promise.race([reseau.catch(() => null), delai]);
        if (gagnant && (gagnant.ok || gagnant.status === 304)) return gagnant;
      }catch(e){}
      return local;
    })());
  } else if (isAppShell && url.pathname.endsWith('/services-hero.png')) {
    // Visuel de présentation : réseau d'abord pour récupérer une image nouvellement publiée,
    // puis copie locale pour continuer à l'afficher hors ligne.
    event.respondWith(
      fetch(req, {cache: 'reload'}).then((res) => {
        if (!reponseValide(res)) throw new Error(`Image indisponible (${res.status})`);
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => {});
        return res;
      }).catch(() => caches.open(CACHE_NAME).then((c) => c.match(req)))
    );
  } else if (isAppShell) {
    // Icônes, manifest : cache-first, ça fonctionne hors ligne et ça ne change presque jamais.
    event.respondWith(
      matchJm(req).then((cached) => cached || fetch(req).then((res) => {
        // Jamais de page d'erreur (404, 500…) gardée comme si c'était le vrai fichier.
        if (reponseValide(res)) { const resClone = res.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => {}); }
        return res;
      }))
    );
  } else {
    // Polices Google Fonts : réseau si dispo, sinon on laisse tomber sans casser l'app
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
  }
});
