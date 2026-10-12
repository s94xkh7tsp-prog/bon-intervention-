import {gameRoute} from './game-api.js';
// =====================================================================
//  JM Express — Worker de synchronisation (v1)
//  Espace privé : un compte, plusieurs appareils (principal + secours).
//  Aucune donnée n'est jamais supprimée : une suppression est une version
//  marquée deleted=true (pierre tombale).
//  Secrets : uniquement dans les variables d'environnement du Worker
//  (SETUP_CODE). Rien dans le HTML ni sur GitHub Pages.
// =====================================================================

const CORS = {
  'Access-Control-Allow-Origin': '*',           // à restreindre à https://<ton-compte>.github.io si tu veux
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
const json = (obj, status) => new Response(JSON.stringify(obj), {status: status || 200, headers: {'Content-Type': 'application/json', ...CORS}});
const ACCOUNT = 'jmexpress';

async function sha256(s){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function aleatoire(n, alphabet){
  const a = alphabet || 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return [...bytes].map(b => a[b % a.length]).join('');
}

async function appareilDepuisJeton(req, env){
  const h = req.headers.get('Authorization') || '';
  const jeton = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if(!jeton) return null;
  const hash = await sha256(jeton);
  const d = await env.DB.prepare('SELECT id, nom, role, revoked FROM devices WHERE account=? AND token_hash=?').bind(ACCOUNT, hash).first();
  if(!d || d.revoked) return null;
  return d;
}

export default {
  async fetch(req, env){
    if(req.method === 'OPTIONS') return new Response(null, {headers: CORS});
    const url = new URL(req.url);
    const p = url.pathname.replace(/\/$/, '');
    try{
      const gameResponse=await gameRoute(req,env,ACCOUNT,appareilDepuisJeton);
      if(gameResponse)return gameResponse;
      // ---------- Initialisation du principal (code d'installation, usage unique par appareil) ----------
      if(p === '/setup' && req.method === 'POST'){
        const b = await req.json();
        if(!env.SETUP_CODE || b.setupCode !== env.SETUP_CODE) return json({error:'code refusé'}, 403);
        const existant = await env.DB.prepare('SELECT COUNT(*) AS n FROM devices WHERE account=? AND role=? AND revoked=0').bind(ACCOUNT, 'principal').first();
        if(existant && existant.n > 0 && !b.remplacer) return json({error:'un téléphone principal existe déjà'}, 409);
        // v261 — remplacement (nouveau téléphone) : l'ancien principal est révoqué, le nouveau reçoit un identifiant neuf
        // (il doit être différent de l'ancien pour récupérer les données que celui-ci a écrites).
        if(b.remplacer) await env.DB.prepare('UPDATE devices SET revoked=1 WHERE account=? AND role=?').bind(ACCOUNT, 'principal').run();
        return json(await creerAppareil(env, b.deviceNom || 'Téléphone principal', 'principal'));
      }
      // ---------- Association d'un secours ----------
      if(p === '/pair/complete' && req.method === 'POST'){
        const b = await req.json();
        const code = String(b.code || '').toUpperCase().trim();
        const pc = await env.DB.prepare('SELECT code, expires, used FROM pairing_codes WHERE account=? AND code=?').bind(ACCOUNT, code).first();
        if(!pc || pc.used || Date.now() > pc.expires) return json({error:'code inconnu ou expiré'}, 404);
        await env.DB.prepare('UPDATE pairing_codes SET used=1 WHERE account=? AND code=?').bind(ACCOUNT, code).run();
        return json(await creerAppareil(env, b.deviceNom || 'Téléphone de secours', 'secours'));
      }

      // ---------- Tout le reste est authentifié ----------
      const dev = await appareilDepuisJeton(req, env);
      if(!dev) return json({error:'non autorisé'}, 401);

      // v281 — coach commercial IA : la clé OpenAI reste un secret du Worker (jamais dans l'appli)
      if(p === '/ia/analyse' && req.method === 'POST'){
        if(!env.OPENAI_API_KEY) return json({error:'ia_non_configuree'}, 503);
        let b; try{ b = await req.json(); }catch(e){ return json({error:'json'}, 400); }
        const txt = (v, n) => String(v == null ? '' : v).slice(0, n);
        const ctx = b && typeof b.contexte === 'object' && b.contexte ? b.contexte : {};
        const entree = {contexte: {service: txt(ctx.service, 120), distanceKm: Number(ctx.distanceKm) || null, moment: txt(ctx.moment, 120), prixAnnonce: Number(ctx.prixAnnonce) || null, supplements: txt(ctx.supplements, 300), motifRefus: txt(ctx.motifRefus, 60), issue: txt(ctx.issue, 60)},
          messageClient: txt(b.messageClient, 2000), reponseJm: txt(b.reponseJm, 2000)};
        if(!entree.messageClient.trim() && !entree.reponseJm.trim()) return json({error:'vide'}, 400);
        const systeme = "Tu es conseiller commercial pour JM Express Auto Dépannage (dépannage et remorquage en Belgique, clients particuliers). Tu analyses les échanges clients pour améliorer la communication, la présentation du tarif et les arguments commerciaux. Le tarif fourni est décidé exclusivement par l'application JM Express : ne le recalcule pas, ne le conteste pas et ne propose pas de nouveau prix ni de remise. Sois professionnel, concis, respectueux et orienté amélioration. Ne dénigre jamais un concurrent. Distingue les faits, les hypothèses et les recommandations. Réponds en français, uniquement en JSON avec les clés : motif_probable, bien_fait, a_ameliorer, meilleure_reponse, argumentaire_alternatif, conseil_prochain_appel, messages_rapides (chaînes courtes, 3 phrases maximum chacune).";
        const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 25000);
        try{
          const r = await fetch('https://api.openai.com/v1/chat/completions', {method:'POST', signal: ctrl.signal, headers:{'Content-Type':'application/json', 'Authorization':'Bearer ' + env.OPENAI_API_KEY},
            body: JSON.stringify({model: env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0.4, max_tokens: 900, response_format:{type:'json_object'}, messages:[{role:'system', content: systeme}, {role:'user', content: JSON.stringify(entree)}]})});
          if(!r.ok) return json({error:'ia_indisponible', status: r.status}, 502);
          const data = await r.json(); let analyse = null;
          try{ analyse = JSON.parse(data.choices[0].message.content); }catch(e){ return json({error:'ia_reponse'}, 502); }
          const propre = {}; ['motif_probable','bien_fait','a_ameliorer','meilleure_reponse','argumentaire_alternatif','conseil_prochain_appel','messages_rapides'].forEach(k => { const v = analyse[k]; propre[k] = Array.isArray(v) ? v.map(x => txt(x, 400)).join('\n') : txt(v, 800); });
          return json({analyse: propre});
        }catch(e){ return json({error:'ia_indisponible'}, 504); }
        finally{ clearTimeout(t); }
      }
      // v282 — assistant terrain : question technique / aide appli (OpenAI) et localisation autoroute (OpenStreetMap)
      if(p === '/ia/assistant' && req.method === 'POST'){
        if(!env.OPENAI_API_KEY) return json({error:'ia_non_configuree'}, 503);
        let b; try{ b = await req.json(); }catch(e){ return json({error:'json'}, 400); }
        const t = (v, n) => String(v == null ? '' : v).slice(0, n), mode = ['vehicule','app'].includes(b && b.mode) ? b.mode : 'vehicule';
        const question = t(b && b.question, 1200); if(!question.trim()) return json({error:'vide'}, 400);
        const veh = b && typeof b.vehicule === 'object' && b.vehicule ? Object.fromEntries(Object.entries(b.vehicule).slice(0, 12).map(([k, v]) => [t(k, 30), t(v, 120)])) : {};
        const systeme = mode === 'app'
          ? "Tu es l'aide de l'application JM Express (PWA de dépannage en Belgique). Fonctions principales : Nouvelle intervention (service, adresses, km, calcul du prix par le moteur de l'appli, barre terrain Départ / Annuler / Terminer, ⋯ Plus), Devis rapide et devis vocal, Rendez-vous, Historique (Fait, Payé, Facture, Bon, Note de crédit), Intervention passée, À traiter, Gestion (tableau de bord, résumé mensuel, recettes et plafond de franchise, publicité, demandes perdues), Dépôt, Rachat / épave, Réglages (tarifs, rentabilité et charges, franchise TVA, synchronisation A/B, sauvegarde, diagnostics). Explique en 3 à 6 étapes courtes où trouver ou comment faire. Si tu ne sais pas, dis-le. Ne donne jamais de prix. Réponds en JSON : confiance (confirme|probable|a_verifier), reponse, precautions, recommandation."
          : "Tu es l'assistant technique d'un dépanneur professionnel en Belgique (plateau Mercedes Sprinter, dolly, treuil). Réponds de façon pratique, courte, orientée dépannage (6 étapes maximum). N'invente jamais une procédure précise si tu n'es pas sûr : classe ta réponse avec confiance = confirme (procédure documentée et générale pour ce modèle), probable (selon génération / modèle, à vérifier) ou a_verifier (information insuffisante). En cas de doute, écris « Procédure à confirmer dans la documentation constructeur ». Pour la boîte automatique, la transmission intégrale (xDrive, quattro, 4Motion, 4Matic…), les véhicules électriques ou hybrides, le frein de parking électrique et la batterie haute tension : sois prudent, ne recommande jamais de tracter roues motrices au sol en cas de doute, privilégie dolly ou plateau. Ne donne jamais de prix. Réponds en JSON : confiance, reponse, precautions, recommandation.";
        const ctrl = new AbortController(), to = setTimeout(() => ctrl.abort(), 25000);
        try{
          const r = await fetch('https://api.openai.com/v1/chat/completions', {method:'POST', signal: ctrl.signal, headers:{'Content-Type':'application/json', 'Authorization':'Bearer ' + env.OPENAI_API_KEY},
            body: JSON.stringify({model: env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0.2, max_tokens: 700, response_format:{type:'json_object'}, messages:[{role:'system', content: systeme}, {role:'user', content: JSON.stringify({vehicule: veh, question})}]})});
          if(!r.ok) return json({error:'ia_indisponible'}, 502);
          const data = await r.json(); let a; try{ a = JSON.parse(data.choices[0].message.content); }catch(e){ return json({error:'ia_reponse'}, 502); }
          const conf = ['confirme','probable','a_verifier'].includes(a.confiance) ? a.confiance : 'a_verifier';
          const s = v => Array.isArray(v) ? v.map(x => t(x, 300)).join('\n') : t(v, 1500);
          return json({reponse: {confiance: conf, reponse: s(a.reponse), precautions: s(a.precautions), recommandation: s(a.recommandation)}});
        }catch(e){ return json({error:'ia_indisponible'}, 504); }
        finally{ clearTimeout(to); }
      }
      if(p === '/ia/localiser' && req.method === 'POST'){
        let b; try{ b = await req.json(); }catch(e){ return json({error:'json'}, 400); }
        const texte = String((b && b.texte) || '').slice(0, 300).trim(); if(!texte) return json({error:'vide'}, 400);
        let q = analyserRepere(texte);
        if((!q.route || (!q.sortie && !q.borne && !q.nomSortie)) && env.OPENAI_API_KEY){
          try{
            const r = await fetch('https://api.openai.com/v1/chat/completions', {method:'POST', headers:{'Content-Type':'application/json', 'Authorization':'Bearer ' + env.OPENAI_API_KEY},
              body: JSON.stringify({model: env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0, max_tokens: 150, response_format:{type:'json_object'}, messages:[{role:'system', content:"Extrait d'une demande de localisation sur autoroute belge : route (ex. E42, A15, R3), sortie (numéro), nomSortie (nom de sortie), borne (kilomètre, nombre), direction (ville). N'invente rien : null si absent. JSON uniquement."}, {role:'user', content: texte}]})});
            if(r.ok){ const a = JSON.parse((await r.json()).choices[0].message.content);
              const nr = norm(a.route); if(!q.route && nr && !new RegExp('\\b' + nr.slice(1) + '\\b').test(texte)) q.routeDeduite = true;   // autoroute non écrite en chiffres : à confirmer
              q = {routeDeduite: q.routeDeduite, route: q.route || nr, sortie: q.sortie || (a.sortie ? String(a.sortie) : null), nomSortie: q.nomSortie || a.nomSortie || null, borne: q.borne || (a.borne != null ? String(a.borne).replace(',', '.') : null), direction: q.direction || a.direction || null}; }
          }catch(e){}
        }
        const manquant = []; if(!q.route) manquant.push('autoroute'); else if(q.routeDeduite) manquant.push('autoroute (déduite : ' + q.route + ', à confirmer)'); if(!q.sortie && !q.borne && !q.nomSortie) manquant.push('numéro de sortie, borne ou repère'); if(!q.direction) manquant.push('sens (direction)');
        if(!q.route || (!q.sortie && !q.borne && !q.nomSortie)) return json({demande: q, manquant, confiance: 'incomplet'});
        try{ return json(await localiserOSM(q, manquant)); }
        catch(e){ return json({demande: q, manquant, confiance: 'a_confirmer', erreur: 'source cartographique indisponible'}); }
      }
      // v283 — vérification d'adresse : l'IA propose des formulations, la cartographie (Nominatim) valide ; seules les adresses trouvées sont renvoyées
      if(p === '/ia/adresse' && req.method === 'POST'){
        let b; try{ b = await req.json(); }catch(e){ return json({error:'json'}, 400); }
        const texte = String((b && b.texte) || '').slice(0, 200).trim(); if(!texte) return json({error:'vide'}, 400);
        const requetes = [texte];
        if(env.OPENAI_API_KEY){
          try{
            const r = await fetch('https://api.openai.com/v1/chat/completions', {method:'POST', headers:{'Content-Type':'application/json', 'Authorization':'Bearer ' + env.OPENAI_API_KEY},
              body: JSON.stringify({model: env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0, max_tokens: 200, response_format:{type:'json_object'}, messages:[{role:'system', content:"Le texte est un lieu dicté en Belgique (région de Charleroi par défaut). Propose jusqu'à 3 requêtes de recherche cartographique, au format « nom ou rue numéro, commune ». N'invente ni numéro ni commune qui ne sont pas dans le texte ; si c'est un commerce, garde son nom (ex. « Louyet BMW, Route de Mons »). JSON : {\"requetes\":[...]}"}, {role:'user', content: texte}]})});
            if(r.ok){ const a = JSON.parse((await r.json()).choices[0].message.content); (Array.isArray(a.requetes) ? a.requetes : []).slice(0, 3).forEach(x => { const s = String(x || '').slice(0, 160).trim(); if(s && !requetes.includes(s)) requetes.push(s); }); }
          }catch(e){}
        }
        const vus = new Set(), candidats = [];
        for(let i = 0; i < requetes.length && candidats.length < 4; i++){
          if(i) await new Promise(r => setTimeout(r, 1100));   // limite du service : 1 requête / seconde
          try{
            const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=3&countrycodes=be,fr,lu&accept-language=fr&q=' + encodeURIComponent(requetes[i]), {headers:{'User-Agent':'JM-Express/1.0'}});
            for(const x of (r.ok ? await r.json() : [])){ const k = x.osm_type + x.osm_id; if(vus.has(k) || !x.lat) continue; vus.add(k);
              candidats.push({libelle: String(x.display_name || '').split(', ').slice(0, 4).join(', '), complet: x.display_name, lat: +(+x.lat).toFixed(6), lon: +(+x.lon).toFixed(6), requete: requetes[i]}); }
          }catch(e){}
        }
        return json({requetes, candidats: candidats.slice(0, 4), source: 'OpenStreetMap'});
      }
      // v294 — secours Claude pour les lieux : interprète la phrase ou le lieu, ne donne que des formulations à chercher sur la carte
      if(p === '/ia/lieux-claude' && req.method === 'POST'){
        if(!env.ANTHROPIC_API_KEY) return json({error:'claude_non_configure'}, 503);
        let b; try{ b = await req.json(); }catch(e){ return json({error:'json'}, 400); }
        const texte = String((b && b.texte) || '').slice(0, 400).trim(), mode = b && b.mode === 'phrase' ? 'phrase' : 'lieu';
        if(!texte) return json({error:'vide'}, 400);
        const systeme = "Tu aides l'application d'un dépanneur en Belgique (région de Charleroi) à comprendre des lieux dictés ou tapés. Réponds uniquement par un objet JSON, sans texte autour. N'invente jamais d'adresse, de numéro, de commune ni de coordonnées : reformule seulement ce que contient le texte, en corrigeant l'orthographe probable des noms de lieux (ex. « Ransard » → « Ransart », « Lernes » → « Leernes ») et en séparant le nom du lieu de la commune. Indique le pays seulement s'il est dit ou évident (code postal français à 5 chiffres). "
          + (mode === 'lieu'
            ? "Format : {\"requetes\": [jusqu'à 3 formulations de recherche cartographique, de la plus probable à la moins probable, au format « nom ou rue numéro, commune »], \"pays\": \"be\"|\"fr\"|\"lu\"|\"nl\"|\"de\"|null}."
            : "Le texte est une demande d'intervention. Format : {\"service\": \"remorquage\"|\"transfert\"|\"batterie\"|\"pneu\"|\"ouverture\"|\"carburant\"|\"autre\"|null, \"depart\": {\"requetes\": [...], \"pays\": ...}|null, \"arrivee\": {\"requetes\": [...], \"pays\": ...}|null}. Le départ est le lieu où se trouve le véhicule ; l'arrivée est la destination (null s'il n'y en a pas).");
        const ctrl = new AbortController(), to = setTimeout(() => ctrl.abort(), 20000);
        try{
          const r = await fetch('https://api.anthropic.com/v1/messages', {method:'POST', signal: ctrl.signal,
            headers:{'content-type':'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01'},
            body: JSON.stringify({model: env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001', max_tokens: 300, temperature: 0, system: systeme, messages:[{role:'user', content: texte}]})});
          if(!r.ok) return json({error:'claude_indisponible', status: r.status}, 502);
          const data = await r.json(), brut = String(((data.content || []).find(x => x.type === 'text') || {}).text || '');
          let a; try{ a = JSON.parse((brut.match(/\{[\s\S]*\}/) || ['{}'])[0]); }catch(e){ return json({error:'claude_reponse'}, 502); }
          const pays = v => ['be','fr','lu','nl','de'].includes(v) ? v : null;
          const req2 = o => o && Array.isArray(o.requetes) ? {requetes: o.requetes.map(x => String(x || '').slice(0, 150).trim()).filter(Boolean).slice(0, 3), pays: pays(o.pays)} : null;
          if(mode === 'lieu') return json({lieu: req2(a)});
          const services = ['remorquage','transfert','batterie','pneu','ouverture','carburant','autre'];
          return json({phrase: {service: services.includes(a.service) ? a.service : null, depart: req2(a.depart), arrivee: req2(a.arrivee)}});
        }catch(e){ return json({error:'claude_indisponible'}, 504); }
        finally{ clearTimeout(to); }
      }
      if(p === '/pair/start' && req.method === 'POST'){
        if(dev.role !== 'principal') return json({error:'réservé au principal'}, 403);
        const code = aleatoire(4) + '-' + aleatoire(4);
        await env.DB.prepare('INSERT INTO pairing_codes (account, code, expires, used) VALUES (?,?,?,0)').bind(ACCOUNT, code, Date.now() + 10 * 60 * 1000).run();
        return json({code, expiresIn: 600});
      }
      if(p === '/devices' && req.method === 'GET'){
        const r = await env.DB.prepare('SELECT id, nom, role, revoked, created FROM devices WHERE account=? ORDER BY created').bind(ACCOUNT).all();
        return json({devices: r.results || []});
      }
      if(p === '/devices/revoke' && req.method === 'POST'){
        if(dev.role !== 'principal') return json({error:'réservé au principal'}, 403);
        const b = await req.json();
        if(b.deviceId === dev.id) return json({error:'impossible de se révoquer soi-même'}, 400);
        await env.DB.prepare('UPDATE devices SET revoked=1 WHERE account=? AND id=?').bind(ACCOUNT, b.deviceId).run();
        return json({ok:true});
      }

      // ---------- Envoi : contrôle de révision, conflit si la base n'est plus la version serveur ----------
      if(p === '/push' && req.method === 'POST'){
        const b = await req.json();
        const results = [];
        for(const r of (b.records || [])){
          if(!r.key || typeof r.key !== 'string') continue;
          const cur = await env.DB.prepare('SELECT rev, seq, updated_at, device_id, deleted, data FROM records WHERE account=? AND key=?').bind(ACCOUNT, r.key).first();
          const baseRev = Number(r.baseRev || 0);
          if(cur && Number(cur.rev) !== baseRev && cur.device_id !== r.deviceId){
            // Quelqu'un d'autre a écrit depuis ma dernière lecture : conflit, on n'écrase pas
            results.push({key:r.key, conflict:true, server:{rev:cur.rev, updatedAt:cur.updated_at, deviceId:cur.device_id, deleted:!!cur.deleted, data: cur.data ? JSON.parse(cur.data) : null}});
            continue;
          }
          const nextRev = (cur ? Number(cur.rev) : 0) + 1;
          const seqRow = await env.DB.prepare('SELECT COALESCE(MAX(seq),0) AS m FROM records WHERE account=?').bind(ACCOUNT).first();
          const seq = Number(seqRow.m) + 1;
          const data = r.deleted ? (cur ? cur.data : null) : JSON.stringify(r.data);
          await env.DB.prepare(`INSERT INTO records (account, key, rev, seq, updated_at, device_id, deleted, data) VALUES (?,?,?,?,?,?,?,?)
                                ON CONFLICT(account, key) DO UPDATE SET rev=excluded.rev, seq=excluded.seq, updated_at=excluded.updated_at, device_id=excluded.device_id, deleted=excluded.deleted, data=excluded.data`)
            .bind(ACCOUNT, r.key, nextRev, seq, r.updatedAt || new Date().toISOString(), dev.id, r.deleted ? 1 : 0, data).run();
          // Historique des versions : rien n'est perdu, même en cas d'erreur humaine
          await env.DB.prepare('INSERT INTO history (account, key, rev, seq, updated_at, device_id, deleted, data) VALUES (?,?,?,?,?,?,?,?)')
            .bind(ACCOUNT, r.key, nextRev, seq, r.updatedAt || new Date().toISOString(), dev.id, r.deleted ? 1 : 0, data).run();
          results.push({key:r.key, rev:nextRev, seq});
        }
        return json({results});
      }
      // ---------- Réception : tout ce qui a changé depuis mon curseur ----------
      if(p === '/pull' && req.method === 'GET'){
        const since = Number(url.searchParams.get('since') || 0);
        const r = await env.DB.prepare('SELECT key, rev, seq, updated_at, device_id, deleted, data FROM records WHERE account=? AND seq>? ORDER BY seq LIMIT 500').bind(ACCOUNT, since).all();
        const records = (r.results || []).map(x => ({key:x.key, rev:x.rev, seq:x.seq, updatedAt:x.updated_at, deviceId:x.device_id, deleted:!!x.deleted, data: x.data ? JSON.parse(x.data) : null}));
        return json({records, seq: records.length ? records[records.length - 1].seq : since});
      }
      return json({error:'inconnu'}, 404);
    }catch(e){
      return json({error: String(e && e.message || e)}, 500);
    }
  }
};

async function creerAppareil(env, nom, role){
  let id = role === 'principal' ? 'A' : 'B' + aleatoire(3, '0123456789');
  // v261 — identifiant toujours libre (le « A » d'origine reste réservé à l'ancien principal révoqué)
  for(let i = 0; i < 20 && await env.DB.prepare('SELECT 1 AS x FROM devices WHERE account=? AND id=?').bind(ACCOUNT, id).first(); i++){
    id = (role === 'principal' ? 'A' : 'B') + aleatoire(3, '0123456789');
  }
  const token = aleatoire(48, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
  await env.DB.prepare('INSERT INTO devices (account, id, nom, role, token_hash, revoked, created) VALUES (?,?,?,?,?,0,?)')
    .bind(ACCOUNT, id, nom, role, await sha256(token), new Date().toISOString()).run();
  return {token, deviceId:id, role};
}

// v282 — localisation autoroute : lecture de la demande et confirmation par OpenStreetMap (jamais de coordonnées inventées)
function norm(r){ if(!r) return null; const m = String(r).toUpperCase().replace(/\s|-/g, '').match(/^([AER])(\d{1,3})$/); return m ? m[1] + m[2] : null; }
function analyserRepere(texte){
  const t = texte.replace(/\s+/g, ' ');
  const mr = t.match(/\b([AERaer])\s?-?\s?(\d{1,3})\b/); const route = mr ? (mr[1].toUpperCase() + mr[2]) : null;
  const ms = t.match(/sortie\s*(?:n[°o]\s*|num[ée]ro\s*|nr\s*)?(\d{1,3}[a-z]?)\b/i);
  const mn = !ms && t.match(/sortie\s+(?:de\s+|d['’])?([A-ZÀ-Ý][\p{L}'’ -]{2,40}?)(?=\s+(?:direction|vers|dir\.?)\b|,|$)/u);
  const mb = t.match(/(?:borne|bk|pk|km|kilom[eè]tre|rep[eè]re(?:\s+kilom[ée]trique)?)\s*(\d{1,3}(?:[.,]\d{1,2})?)/i);
  const md = t.match(/(?:direction|vers|dir\.?)\s+([\p{L}'’ -]{2,40}?)(?=,|\s+(?:borne|sortie|km)|$)/iu);
  return {route, sortie: ms ? ms[1].toLowerCase() : null, nomSortie: mn ? mn[1].trim() : null, borne: mb ? mb[1].replace(',', '.') : null, direction: md ? md[1].trim() : null};
}
async function overpass(requete){
  const r = await fetch('https://overpass-api.de/api/interpreter', {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded', 'User-Agent':'JM-Express/1.0'}, body: 'data=' + encodeURIComponent(requete)});
  if(!r.ok) throw new Error('overpass ' + r.status); return (await r.json()).elements || [];
}
const distM = (a, b) => { const R = 6371000, r = x => x * Math.PI / 180, dLa = r(b.lat - a.lat), dLo = r(b.lon - a.lon); const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
async function localiserOSM(q, manquant){
  const lettre = q.route[0], num = q.route.slice(1), refRe = lettre === 'E' ? 'E ?' + num + '([^0-9]|$)' : '(^|;) ?' + lettre + ' ?' + num + '(;|$)';
  const routes = 'area(3600052411)->.be;(way["highway"~"^(motorway|trunk|motorway_link)$"]["ref"~"' + refRe + '"](area.be);way["highway"~"^(motorway|trunk)$"]["int_ref"~"' + refRe + '"](area.be);)->.w;';
  let filtre, type;
  if(q.sortie){ filtre = 'node(w.w)["highway"="motorway_junction"]["ref"~"^' + q.sortie + '$",i];'; type = 'sortie'; }
  else if(q.nomSortie){ filtre = 'node(w.w)["highway"="motorway_junction"]["name"~"' + q.nomSortie.replace(/["\\]/g, '') + '",i];'; type = 'sortie'; }
  else { const [e, d] = q.borne.split('.'); filtre = 'node(w.w)["highway"="milestone"]["distance"~"^' + e + (d ? '[.,]' + d : '([.,]0+)?') + '$"];'; type = 'borne'; }
  const pts = (await overpass('[out:json][timeout:20];' + routes + filtre + 'out body;')).filter(x => x.lat);
  if(!pts.length) return {demande: q, manquant, confiance: 'a_confirmer', type, message: 'Repère non trouvé dans la cartographie'};
  const c = pts[0], groupe = pts.filter(x => distM(c, x) < 2500), dispersion = pts.length > groupe.length;
  const pos = {lat: groupe.reduce((s, x) => s + x.lat, 0) / groupe.length, lon: groupe.reduce((s, x) => s + x.lon, 0) / groupe.length};
  let commune = null, voisines = [];
  try{ const v = (await overpass('[out:json][timeout:15];' + routes + 'node(w.w)["highway"="motorway_junction"](around:12000,' + pos.lat + ',' + pos.lon + ');out body;')).filter(x => x.lat && (x.tags || {}).ref && x.tags.ref !== (c.tags || {}).ref);
    const vu = new Set(); voisines = v.map(x => ({ref: x.tags.ref, nom: x.tags.name || '', km: Math.round(distM(pos, x) / 100) / 10})).sort((a, b) => a.km - b.km).filter(x => !vu.has(x.ref) && vu.add(x.ref)).slice(0, 3); }catch(e){}
  try{ const r = await fetch('https://nominatim.openstreetmap.org/reverse?format=json&zoom=12&lat=' + pos.lat + '&lon=' + pos.lon, {headers:{'User-Agent':'JM-Express/1.0'}}); const a = (await r.json()).address || {}; commune = a.town || a.city || a.village || a.municipality || null; }catch(e){}
  return {demande: q, manquant, type, confiance: (dispersion || q.routeDeduite) ? 'a_confirmer' : (q.direction ? 'elevee' : 'moyenne'), position: {lat: Math.round(pos.lat * 1e6) / 1e6, lon: Math.round(pos.lon * 1e6) / 1e6},
    repere: type === 'sortie' ? ('Sortie ' + ((c.tags || {}).ref || '') + ((c.tags || {}).name ? ' — ' + c.tags.name : '')) : ('Borne ' + q.borne), commune, sortiesProches: voisines, candidats: pts.length, source: 'OpenStreetMap'};
}
