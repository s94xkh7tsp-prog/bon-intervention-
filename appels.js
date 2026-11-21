// =====================================================================
//  JM Express — « Mes appels & rentabilité » (v347)
//  Notes vocales après appel → brouillons auto-sauvegardés → fiches
//  structurées (IA via le Worker, jamais d'invention) → appels validés,
//  rattachés aux interventions, rentabilité via jmRentabilite().
//  Stockage : clés appel:<id> via window.storage (synchronisées, texte +
//  fiche uniquement) ; audios dans IndexedDB « jm-express-appels »
//  (jamais synchronisés, jamais envoyés ailleurs qu'au Worker pour la
//  transcription, purgés après N jours).
//  Ne touche ni au moteur tarifaire, ni aux devis/factures.
// =====================================================================
(function(){
'use strict';
if(window.jmAppels) return;
const PREFIX = 'appel:';
const REGL_KEY = 'appelsReglages';
const DB_NAME = 'jm-express-appels', DB_STORE = 'audios';
const LIMITE_AUDIO_MO = 150;          // plafond total des audios conservés sur le téléphone
const CHAMPS = [['date',"Date de l'appel"],['tel','Numéro du client'],['vehicule','Véhicule'],['nature','Nature de la panne ou du transport'],['lieu','Lieu de prise en charge'],['destination','Destination'],['prix','Prix annoncé (€)'],['resultat','Résultat'],['motif','Motif de non-conversion'],['origine',"Origine de l'appel (si vérifiable)"]];
const RESULTATS = ['obtenue','refusée','annulée','en attente'];
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const toast = m => { if(typeof showToast === 'function') showToast(m); };
const hm = iso => { try{ return new Date(iso).toLocaleTimeString('fr-BE', {hour:'2-digit', minute:'2-digit'}); }catch(e){ return ''; } };
const dmy = iso => { try{ return new Date(iso).toLocaleDateString('fr-BE', {day:'2-digit', month:'2-digit'}); }catch(e){ return ''; } };
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const fmtE = n => (Math.round(n * 100) / 100).toLocaleString('fr-BE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';

// ---------- CSS (tokens de l'appli uniquement) ----------
const CSS = `
.ap-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
.ap-kpi{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:10px 6px;text-align:center}
.ap-kpi b{display:block;font-size:21px;color:var(--orange);font-variant-numeric:tabular-nums}
.ap-kpi span{font-size:11px;color:var(--grey)}
.ap-micwrap{display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 6px 6px}
.ap-mic{width:118px;height:118px;border-radius:50%;border:0;background:var(--orange);color:#fff;font-size:15px;font-weight:700;cursor:pointer;box-shadow:var(--shadow-orange,0 8px 24px rgba(242,140,0,.3));display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;transition:transform .12s}
.ap-mic:active{transform:scale(.96)}
.ap-mic.rec{background:var(--red);animation:apPulse 1.2s infinite}
.ap-mic.busy{background:var(--steel)}
.ap-mic svg{width:36px;height:36px}
@keyframes apPulse{0%,100%{box-shadow:0 0 0 6px rgba(201,74,50,.18)}50%{box-shadow:0 0 0 16px rgba(201,74,50,.04)}}
@media (prefers-reduced-motion:reduce){.ap-mic.rec{animation:none}}
.ap-hint{font-size:13px;color:var(--grey);text-align:center;min-height:18px}
.ap-timer{font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--grey)}
.ap-note{width:100%;min-height:96px;background:var(--ink);color:var(--white);border:1px solid var(--line);border-radius:12px;padding:10px;font:inherit;font-size:15px;resize:vertical}
.ap-note:focus{outline:2px solid var(--orange);outline-offset:1px}
.ap-save{font-size:12px;color:var(--grey);text-align:right;margin-top:4px}
.ap-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px}
.ap-row button{margin:0;width:auto;flex:1 1 calc(50% - 4px);min-width:120px}
.ap-list{display:flex;flex-direction:column;gap:10px}
.ap-item{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:12px}
.ap-item .t{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
.ap-item .t b{font-size:14px;color:var(--white)}
.ap-item .ex{color:var(--grey);font-size:13px;margin:6px 0 4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ap-meta{font-size:12px;color:var(--grey)}
.ap-chip{display:inline-block;font-size:11px;font-weight:700;padding:3px 8px;border-radius:999px;border:1px solid var(--line);color:var(--grey);white-space:nowrap}
.ap-chip.ok{color:var(--green);border-color:var(--green)}.ap-chip.ko{color:var(--red);border-color:var(--red)}.ap-chip.wait{color:#c9922a;border-color:#c9922a}.ap-chip.ai{color:var(--steel);border-color:var(--steel)}
.ap-fields{display:grid;grid-template-columns:1fr;gap:8px}
.ap-f label{display:block;font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:var(--grey);margin-bottom:3px}
.ap-f input,.ap-f select{width:100%;background:var(--ink);color:var(--white);border:1px solid var(--line);border-radius:10px;padding:10px;font:inherit;font-size:15px}
.ap-f .src{font-size:11px;color:var(--steel);margin-top:2px}
.ap-orig{background:var(--ink);border:1px dashed var(--line);border-radius:10px;padding:10px;font-size:13px;white-space:pre-wrap;color:var(--grey)}
.ap-alert{border:1px solid var(--red);color:var(--red);border-radius:10px;padding:10px;font-size:13px;margin-top:10px}
.ap-warn{background:var(--orange-soft);border:1px solid var(--orange-deep);border-radius:10px;padding:10px;font-size:13px;margin-top:10px;color:var(--white)}
.ap-empty{color:var(--grey);font-size:13px;padding:14px;text-align:center;border:1px dashed var(--line);border-radius:12px}
.ap-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 10px}
.ap-tab{border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-size:13px;cursor:pointer;color:var(--grey)}
.ap-tab.on{color:var(--orange);border-color:var(--orange);font-weight:700}
.ap-marge{font-family:'JetBrains Mono',monospace}.ap-marge.pos{color:var(--green)}.ap-marge.neg{color:var(--red)}
.ap-renta{font-size:12.5px;color:var(--grey);margin-top:6px;line-height:1.5}
.ap-audio{width:100%;margin-top:6px}
.ap-sel{width:100%;background:var(--ink);color:var(--white);border:1px solid var(--line);border-radius:10px;padding:10px;font:inherit;font-size:14px;flex:1 1 100%}
.ap-small{min-height:38px!important;padding:7px 10px!important;font-size:13px!important}
.ap-del{color:var(--red)!important;border-color:var(--red)!important}
.ap-rec-home{display:flex;align-items:center;gap:12px;background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:10px 12px;margin:0 0 12px;cursor:pointer;box-shadow:var(--shadow-sm)}
.ap-rec-home:active{transform:scale(.98);border-color:var(--orange)}
.ap-rec-home .ic{width:52px;height:52px;border-radius:50%;background:var(--orange);display:flex;align-items:center;justify-content:center;flex:0 0 52px;box-shadow:var(--shadow-orange,none)}
.ap-rec-home .ic svg{width:26px;height:26px;color:#fff}
.ap-rec-home b{font-size:15px;color:var(--white);display:block}
.ap-rec-home span{font-size:12px;color:var(--grey)}
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

// ---------- Réglages ----------
let REGL = {retentionJours: 30, transcriptionAuto: true};
async function chargerReglages(){ try{ REGL = Object.assign(REGL, JSON.parse((await window.storage.get(REGL_KEY)).value)); }catch(e){} }
async function sauverReglages(){ try{ await window.storage.set(REGL_KEY, JSON.stringify(REGL)); }catch(e){} }

// ---------- Fiches (window.storage, synchronisées) ----------
async function lireTous(){
  const out = [];
  try{
    const l = await window.storage.list(PREFIX);
    for(const k of (l.keys || [])){ try{ out.push(JSON.parse((await window.storage.get(k)).value)); }catch(e){} }
  }catch(e){}
  return out.sort((a, b) => String(b.maj || '').localeCompare(String(a.maj || '')));
}
async function sauver(a){ a.maj = new Date().toISOString(); await window.storage.set(PREFIX + a.id, JSON.stringify(a)); return a; }
async function supprimer(a){
  await window.storage.delete(PREFIX + a.id);
  if(a.audioId){ const autres = (await lireTous()).some(x => x.id !== a.id && x.audioId === a.audioId); if(!autres) await audioSupprimer(a.audioId); }
}

// ---------- Audios (IndexedDB locale, jamais synchronisée) ----------
function adb(){ return new Promise((ok, ko) => { try{ const r = indexedDB.open(DB_NAME, 1); r.onupgradeneeded = () => r.result.createObjectStore(DB_STORE); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); }catch(e){ ko(e); } }); }
async function audioEcrire(id, blob){ const db = await adb(); try{ await new Promise((ok, ko) => { const t = db.transaction(DB_STORE, 'readwrite'); t.objectStore(DB_STORE).put({blob, date: Date.now(), taille: blob.size, type: blob.type}, id); t.oncomplete = ok; t.onerror = () => ko(t.error); }); } finally{ db.close(); } }
async function audioLire(id){ try{ const db = await adb(); const v = await new Promise(ok => { const q = db.transaction(DB_STORE).objectStore(DB_STORE).get(id); q.onsuccess = () => ok(q.result || null); q.onerror = () => ok(null); }); db.close(); return v; }catch(e){ return null; } }
async function audioSupprimer(id){ try{ const db = await adb(); await new Promise(ok => { const t = db.transaction(DB_STORE, 'readwrite'); t.objectStore(DB_STORE).delete(id); t.oncomplete = ok; t.onerror = ok; }); db.close(); }catch(e){} }
async function audioListe(){ try{ const db = await adb(); const v = await new Promise(ok => { const out = []; const t = db.transaction(DB_STORE); const c = t.objectStore(DB_STORE).openCursor(); c.onsuccess = () => { const cur = c.result; if(cur){ const v = cur.value || {}; out.push({id: cur.key, date: v.date || 0, taille: v.taille || (v.blob && v.blob.size) || 0}); cur.continue(); } }; t.oncomplete = () => ok(out); t.onerror = () => ok(out); t.onabort = () => ok(out); }); db.close(); return v; }catch(e){ return []; } }
// Purge : au-delà de N jours, et au-delà du plafond total (les plus anciens d'abord). La transcription et la fiche restent.
async function purgerAudios(){
  const liste = await audioListe(); if(!liste.length) return;
  const lim = REGL.retentionJours * 864e5; let total = liste.reduce((s, a) => s + a.taille, 0);
  const aSupprimer = new Set();
  for(const a of liste) if(lim && Date.now() - a.date > lim) aSupprimer.add(a.id);
  for(const a of liste.slice().sort((x, y) => x.date - y.date)){ if(total <= LIMITE_AUDIO_MO * 1048576) break; if(!aSupprimer.has(a.id)){ aSupprimer.add(a.id); total -= a.taille; } }
  if(!aSupprimer.size) return;
  for(const id of aSupprimer) await audioSupprimer(id);
  for(const f of await lireTous()){ if(f.audioId && aSupprimer.has(f.audioId)){ f.audioPurge = true; await sauver(f); } }
}
async function espaceAudios(){ const l = await audioListe(); const t = l.reduce((s, a) => s + a.taille, 0); let q = ''; try{ if(navigator.storage && navigator.storage.estimate){ const e = await navigator.storage.estimate(); if(e.quota) q = ' · quota iPhone ≈ ' + Math.round(e.quota / 1048576) + ' Mo'; } }catch(e){} return l.length + ' audio(s), ' + (t / 1048576).toFixed(1) + ' Mo' + q + ' (plafond ' + LIMITE_AUDIO_MO + ' Mo)'; }

// ---------- Interventions existantes (lecture seule) ----------
async function interventions(){
  const out = [];
  try{ const l = await window.storage.list('intervention:'); for(const k of (l.keys || [])){ try{ const d = JSON.parse((await window.storage.get(k)).value); out.push({key: k, data: d}); }catch(e){} } }catch(e){}
  return out.sort((a, b) => String(b.data.date || '').localeCompare(String(a.data.date || '')));
}
function libelleMission(m){ const d = m.data; return (d.numero ? d.numero + ' · ' : '') + (d.date ? String(d.date).slice(0, 10) + ' · ' : '') + (d.from || '') + (d.to ? ' → ' + d.to : '') + (d.plaque ? ' · ' + d.plaque : '') + ' · ' + fmtE(Number(d.total) || 0); }
function rentabilite(m){ try{ if(typeof window.jmRentabilite !== 'function') return null; return window.jmRentabilite(m.data); }catch(e){ return null; } }

// ---------- État courant ----------
let cur = null, saveT = null, filtre = 'tous', sauvegardeEnCours = false;
async function sauverCourant(){ if(!cur) return; if(!(cur.texte || '').trim() && !cur.audioId) return; await sauver(cur); const s = $('apSave'); if(s) s.textContent = 'Enregistré ' + hm(cur.maj); }
function nouveau(){ cur = {id: newId(), statut: 'brouillon', texte: '', fiche: null, ficheSrc: null, audioId: null, cree: new Date().toISOString()}; $('apNote').value = ''; $('apSave').textContent = 'Nouveau brouillon'; $('apFiche').style.display = 'none'; $('apAudioBox').style.display = 'none'; $('apTransc').style.display = 'none'; }
async function charger(a){ cur = a; $('apNote').value = a.texte || ''; $('apSave').textContent = a.maj ? 'Enregistré ' + hm(a.maj) : 'Nouveau brouillon'; await afficherAudio(); afficherFiche(); $('apTransc').style.display = (a.audioId && !(a.texte || '').trim()) ? 'block' : 'none'; }

// ---------- Micro : enregistrement, puis transcription automatique (Worker) ----------
let rec = null, flux = null, chunks = [], recording = false, timerI = null, recStart = 0;
function microDispo(){ return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder); }
function mimeAudio(){ for(const m of ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg']){ try{ if(MediaRecorder.isTypeSupported(m)) return m; }catch(e){} } return ''; }
async function basculerMicro(){ if(recording) return arreter('bouton'); return demarrer(); }
async function demarrer(){
  if(!microDispo()){ $('apHint').textContent = 'Micro indisponible dans ce navigateur : utilisez le micro du clavier dans la zone de texte.'; return; }
  if(!cur) nouveau();
  try{ flux = await navigator.mediaDevices.getUserMedia({audio: true}); }
  catch(e){
    const refus = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
    $('apHint').textContent = refus ? 'Micro refusé. iPhone : Réglages › Safari › Micro (ou Réglages › JM Express si installée) → Autoriser. En attendant, micro du clavier.' : 'Micro inaccessible (' + (e && e.name || 'erreur') + '). Utilisez le micro du clavier.';
    return;
  }
  try{ const mime = mimeAudio(); rec = new MediaRecorder(flux, mime ? {mimeType: mime} : undefined); }
  catch(e){ flux.getTracks().forEach(t => t.stop()); $('apHint').textContent = 'Enregistrement impossible sur cet appareil. Utilisez le micro du clavier.'; return; }
  chunks = []; recording = true; recStart = Date.now();
  rec.ondataavailable = e => { if(e.data && e.data.size) chunks.push(e.data); };
  rec.onerror = () => { arreter('erreur'); };
  rec.onstop = finaliser;
  rec.start(1000);
  $('apMic').classList.add('rec'); $('apMicLbl').textContent = 'Terminer';
  $('apHint').textContent = 'Parlez… Appuyez pour terminer. Plusieurs appels possibles dans une même note.';
  timerI = setInterval(() => { const s = Math.floor((Date.now() - recStart) / 1000); $('apTimer').textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); if(s >= 600) arreter('limite'); }, 250);
}
function arreter(raison){
  if(!recording) return; recording = false; clearInterval(timerI);
  $('apMic').classList.remove('rec'); $('apMic').classList.add('busy'); $('apMicLbl').textContent = 'Sauvegarde…';
  if(raison === 'limite') toast('Note limitée à 10 minutes : enregistrement arrêté.');
  if(raison === 'interruption') toast('Enregistrement interrompu : la note est sauvegardée.');
  try{ if(rec && rec.state !== 'inactive') rec.stop(); else finaliser(); }catch(e){ finaliser(); }
}
async function finaliser(){
  try{ if(flux) flux.getTracks().forEach(t => t.stop()); }catch(e){}
  flux = null; const r = rec; rec = null;
  $('apMic').classList.remove('busy'); $('apMicLbl').textContent = 'Note vocale'; $('apTimer').textContent = '';
  if(!chunks.length){ $('apHint').textContent = 'Aucun son enregistré. Réessayez ou tapez votre note.'; return; }
  const blob = new Blob(chunks, {type: (r && r.mimeType) || 'audio/mp4'}); chunks = [];
  if(!cur) nouveau();
  const audioId = cur.audioId || newId();
  try{ await audioEcrire(audioId, blob); cur.audioId = audioId; cur.audioType = blob.type; cur.audioTaille = blob.size; cur.audioDuree = Math.round((Date.now() - recStart) / 1000); }
  catch(e){ $('apHint').textContent = 'Audio non conservé (stockage plein ?). Le texte sera quand même sauvegardé.'; }
  await sauverCourant(); await afficherAudio(); await rafraichir();
  if(REGL.transcriptionAuto) await transcrire(blob); else { $('apHint').textContent = 'Note sauvegardée. Appuyez sur « Transcrire » ou dictez au clavier.'; $('apTransc').style.display = 'block'; }
}
function blobEnBase64(blob){ return new Promise((ok, ko) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(',')[1] || ''); fr.onerror = () => ko(fr.error); fr.readAsDataURL(blob); }); }
async function transcrire(blob){
  if(!blob){ const au = cur && cur.audioId ? await audioLire(cur.audioId) : null; if(!au){ toast('Pas d\'audio à transcrire'); return; } blob = au.blob; }
  if(typeof syncActif !== 'function' || !syncActif()){ $('apHint').textContent = 'Transcription automatique indisponible (serveur de synchro non configuré). Audio conservé : tapez ou dictez au clavier.'; $('apTransc').style.display = 'block'; return; }
  if(!navigator.onLine){ $('apHint').textContent = 'Hors ligne : audio conservé, transcription à relancer plus tard (bouton « Transcrire »).'; $('apTransc').style.display = 'block'; return; }
  if(blob.size > 24 * 1048576){ $('apHint').textContent = 'Audio trop long pour la transcription (max ≈ 24 Mo). Dictez au clavier.'; $('apTransc').style.display = 'block'; return; }
  $('apHint').textContent = 'Transcription en cours…'; $('apMic').classList.add('busy'); $('apMic').disabled = true;
  try{
    const b64 = await blobEnBase64(blob);
    const r = await syncApi('/ia/appels/transcrire', {audioBase64: b64, mime: blob.type || 'audio/mp4', langue: 'fr'});
    const t = r && String(r.texte || '').trim();
    if(!t) throw new Error('vide');
    const avant = ($('apNote').value || '').trim();
    $('apNote').value = avant ? avant + '\n' + t : t; cur.texte = $('apNote').value; cur.transcription = 'serveur';
    await sauverCourant(); $('apTransc').style.display = 'none';
    $('apHint').textContent = 'Transcrit. Relisez, corrigez si besoin, puis « Analyser ».';
  }catch(e){
    const m = e && e.message || '';
    $('apHint').textContent = /503/.test(m) ? 'Transcription non configurée sur le serveur (clé absente). Audio conservé : dictez au clavier.' : /revoque/.test(m) ? 'Appareil non autorisé sur le serveur.' : 'Transcription impossible pour l\'instant (' + (m || 'erreur') + '). Audio conservé, réessayez plus tard.';
    $('apTransc').style.display = 'block';
  }finally{ $('apMic').classList.remove('busy'); $('apMic').disabled = false; await rafraichir(); }
}
async function afficherAudio(){
  const box = $('apAudioBox'); if(!cur || !cur.audioId){ box.style.display = 'none'; return; }
  const au = await audioLire(cur.audioId);
  if(!au){ box.style.display = 'block'; $('apAudio').removeAttribute('src'); $('apAudio').style.display = 'none'; $('apAudioNote').textContent = cur.audioPurge ? 'Audio original supprimé (conservation ' + REGL.retentionJours + ' j dépassée).' : 'Audio original absent sur ce téléphone (enregistré sur l\'autre appareil).'; return; }
  box.style.display = 'block'; $('apAudio').style.display = 'block';
  try{ $('apAudio').src = URL.createObjectURL(au.blob); }catch(e){}
  $('apAudioNote').textContent = 'Audio original (' + (au.taille / 1048576).toFixed(1) + ' Mo' + (cur.audioDuree ? ', ' + cur.audioDuree + ' s' : '') + ') conservé ' + REGL.retentionJours + ' j, uniquement sur ce téléphone.';
}

// ---------- Analyse (IA Worker ; repli règles locales), plusieurs appels par dictée ----------
const VILLES = ['Charleroi','Monceau-sur-Sambre','Marchienne-au-Pont','Gilly','Jumet','Gosselies','Montignies-sur-Sambre','Couillet','Marcinelle','Châtelet','Châtelineau','Fleurus','Courcelles',"Fontaine-l'Évêque",'Gerpinnes','Nivelles','La Louvière','Mons','Namur','Bruxelles','Liège','Wavre','Tournai','Dinant','Philippeville','Lille','Valenciennes','Maubeuge','Luxembourg','Arlon','Aéroport de Charleroi','Gare de Charleroi'];
const MARQUES = ['Peugeot','Renault','Citroën','Citroen','Volkswagen','VW','Golf','Polo','BMW','Mercedes','Audi','Opel','Ford','Fiat','Toyota','Hyundai','Kia','Skoda','Seat','Dacia','Nissan','Volvo','Tesla','Mini','Porsche','Jeep','Suzuki','Mazda','Honda','Clio','308','208','3008','Mégane','Megane','Twingo','Corsa','Astra','Fiesta','Focus','Yaris','Sprinter','Kangoo','Berlingo','Transit','Vito','Ducato','moto','scooter','camionnette','utilitaire'];
function decouperLocal(t){
  const parts = String(t).split(/\b(?:deuxième appel|troisième appel|quatrième appel|autre appel|un autre appel|ensuite un|après ça un|après cela un|puis un|second appel|appel suivant)\b/i).map(s => s.trim()).filter(Boolean);
  return parts.length ? parts : [String(t)];
}
function extraireLocal(t){
  const T = ' ' + String(t).replace(/\s+/g, ' ') + ' ', low = T.toLowerCase(), f = {}, src = {}, now = new Date(), d = new Date(now);
  if(/\bhier\b/.test(low)) d.setDate(d.getDate() - 1); else if(/avant-hier/.test(low)) d.setDate(d.getDate() - 2);
  const md = low.match(/\b(\d{1,2})[\/\.](\d{1,2})(?:[\/\.](\d{2,4}))?\b/);
  if(md){ const y = md[3] ? (md[3].length === 2 ? '20' + md[3] : md[3]) : now.getFullYear(); f.date = y + '-' + md[2].padStart(2, '0') + '-' + md[1].padStart(2, '0'); }
  else if(/\b(hier|avant-hier|aujourd'hui|ce matin|cet après-midi|ce soir|tout à l'heure|à l'instant)\b/.test(low)) f.date = d.toISOString().slice(0, 10);
  const tel = T.match(/(?:\+32\s?|0)4\d{2}[\s\.\/-]?\d{2}[\s\.\/-]?\d{2}[\s\.\/-]?\d{2}|(?:\+33\s?|0)[67](?:[\s\.]?\d{2}){4}/); if(tel) f.tel = tel[0].replace(/[\s\.\/-]/g, ' ').trim();
  const plaque = T.match(/\b[1-9]-?[A-Z]{3}-?\d{3}\b|\b[A-Z]{2}-?\d{3}-?[A-Z]{2}\b/);
  const marques = MARQUES.filter(m => new RegExp('\\b' + m.replace('.', '\\.') + '\\b', 'i').test(T));
  if(marques.length || plaque){ f.vehicule = (marques.slice(0, 3).join(' ') + (plaque ? ' ' + plaque[0] : '')).trim(); if(/électrique|electrique/.test(low)) f.vehicule += ' (électrique)'; }
  const natures = [[/\btransport\b|transférer|transfert|rapatri|convoy|ramener|amener/, 'Transport / transfert de véhicule'], [/remorqu|dépanneuse|depanneuse|plateau/, 'Remorquage'], [/batterie|démarre pas|demarre pas|booster/, 'Batterie / démarrage'], [/pneu|crev/, 'Pneu / crevaison'], [/accident|accroch|carross/, 'Véhicule accidenté'], [/boîte auto|boite auto|bloqué en p|bloquee en p/, 'Déblocage boîte automatique'], [/carburant|mauvais plein|essence au lieu|diesel au lieu/, 'Erreur de carburant'], [/\bclé\b|\bcle\b|ouverture|enferm/, 'Ouverture de véhicule'], [/embourb|treuil|fossé|fosse/, 'Désembourbement / treuillage'], [/contrôle technique|controle technique|\bct\b/, 'Transport au contrôle technique'], [/fourrière|fourriere|levée de saisie|levee de saisie|restitution/, 'Transport après restitution / levée de saisie'], [/panne/, 'Panne (à préciser)']];
  const nat = natures.filter(n => n[0].test(low)).map(n => n[1]); if(nat.length) f.nature = nat.slice(0, 2).join(' + ');
  const villes = []; for(const v of VILLES){ const re = new RegExp('(^|[^a-zà-ÿ])' + v.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '(?![a-zà-ÿ])', 'i'); const m = re.exec(T); if(m) villes.push({v, i: m.index}); } villes.sort((a, b) => a.i - b.i);
  if(villes.length){ f.lieu = villes[0].v; if(villes.length > 1) f.destination = villes[villes.length - 1].v; }
  if(f.lieu && f.destination && f.lieu === f.destination) delete f.destination;
  const prix = low.match(/(\d{2,4})(?:[,\.]\d{1,2})?\s?(?:€|euros?)/); if(prix) f.prix = prix[1];
  if(/accept|d'accord|c'est bon|on y va|je viens|rendez-vous|rdv|confirm|il prend|elle prend|ok pour|on fait|j'y vais|je passe/.test(low)) f.resultat = 'obtenue';
  else if(/annul/.test(low)) f.resultat = 'annulée';
  else if(/trop cher|refus|pas intéress|pas interess|il a dit non|laisse tomber|a trouvé quelqu'un|a trouve quelqu'un|ne veut pas|non merci|réorient|reorient|confrère|confrere/.test(low)) f.resultat = 'refusée';
  else if(/rappelle|rappeler|réfléchi|reflechi|va voir|en attente|revient vers/.test(low)) f.resultat = 'en attente';
  const motifs = [[/trop cher|prix trop|cher/, 'Prix jugé trop élevé'], [/trop loin|hors zone|pas ma zone|pas rentable/, 'Hors zone rentable'], [/délai|delai|trop long|pas dispo|indisponible|occupé/, 'Délai / indisponibilité'], [/confrère|confrere|réorient|reorient|quelqu'un d'autre/, 'Réorienté vers un confrère'], [/assistance|assurance/, 'Pris en charge par une assistance'], [/pas de réponse|messagerie|répond plus|repond plus/, 'Sans réponse']];
  const mot = motifs.filter(m => m[0].test(low)).map(m => m[1]); if(mot.length && f.resultat !== 'obtenue') f.motif = mot[0];
  if(/google ads|pub google|annonce google|via google|sur google|publicité|publicite/.test(low)) f.origine = 'Google (déclaré par le client)';
  else if(/site web|le site|site internet/.test(low)) f.origine = 'Site web (déclaré par le client)';
  else if(/bouche à oreille|bouche a oreille|recommand|un ami|collègue|collegue|connaissance/.test(low)) f.origine = 'Recommandation (déclaré)';
  else if(/avis google|les avis|fiche google|maps/.test(low)) f.origine = 'Fiche Google / avis (déclaré)';
  for(const k in f) src[k] = 'règles';
  return {fiche: f, src};
}
async function analyserTexte(texte){
  // Retourne [{extrait, fiche, src}] ; IA Worker si disponible, sinon règles locales.
  if(typeof syncActif === 'function' && syncActif() && navigator.onLine){
    try{
      const r = await syncApi('/ia/appels/analyser', {texte: String(texte).slice(0, 6000), aujourdhui: new Date().toISOString().slice(0, 10)});
      const liste = r && Array.isArray(r.appels) ? r.appels : null;
      if(liste && liste.length){
        return {moteur: 'IA', appels: liste.slice(0, 8).map(a => { const f = {}, src = {}; for(const [k] of CHAMPS){ let v = a[k]; if(v === null || v === undefined || v === '') continue; if(k === 'resultat' && !RESULTATS.includes(String(v))) continue; f[k] = String(v); src[k] = 'IA'; } return {extrait: String(a.extrait || texte).slice(0, 2000), fiche: f, src}; })};
      }
    }catch(e){ if(/503/.test(e && e.message)) toast('IA non configurée sur le serveur : règles locales utilisées'); }
  }
  return {moteur: 'règles locales', appels: decouperLocal(texte).map(ex => Object.assign({extrait: ex}, extraireLocal(ex)))};
}
async function analyser(){
  if(!cur) nouveau(); cur.texte = $('apNote').value; if(!cur.texte.trim()){ toast('Rien à analyser : dictez ou tapez une note'); return; }
  const b = $('apAnalyser'); b.disabled = true; b.textContent = 'Analyse…';
  try{
    const r = await analyserTexte(cur.texte); const texteOriginal = cur.texteOriginal || cur.texte;
    const manuel = cur.ficheSrc || {}, prev = cur.fiche || {};
    const premier = r.appels[0];
    for(const k in prev){ if(manuel[k] === 'manuel' && !premier.fiche[k]){ premier.fiche[k] = prev[k]; premier.src[k] = 'manuel'; } }
    cur.fiche = premier.fiche; cur.ficheSrc = premier.src; cur.moteur = r.moteur; cur.texteOriginal = texteOriginal;
    if(r.appels.length > 1){
      cur.texte = premier.extrait; $('apNote').value = cur.texte; cur.multi = r.appels.length;
      for(let i = 1; i < r.appels.length; i++){ const a = r.appels[i]; await sauver({id: newId(), statut: 'brouillon', texte: a.extrait, texteOriginal, fiche: a.fiche, ficheSrc: a.src, moteur: r.moteur, audioId: cur.audioId || null, audioType: cur.audioType, audioDuree: cur.audioDuree, multi: r.appels.length, cree: new Date().toISOString()}); }
      toast(r.appels.length + ' appels détectés : ' + (r.appels.length - 1) + ' brouillon(s) supplémentaire(s) créé(s)');
    } else toast('Fiche préparée (' + r.moteur + ')');
    await sauverCourant(); afficherFiche(); await rafraichir();
    $('apFiche').scrollIntoView({behavior: 'smooth', block: 'start'});
  }finally{ b.disabled = false; b.textContent = 'Analyser → fiche'; }
}
function afficherFiche(){
  const F = $('apFields'); if(!cur || !cur.fiche){ $('apFiche').style.display = 'none'; return; }
  $('apFiche').style.display = 'block'; $('apFicheSrc').textContent = cur.moteur || '—'; $('apOrig').textContent = cur.texteOriginal || cur.texte || '';
  $('apMulti').style.display = cur.multi > 1 ? 'block' : 'none'; if(cur.multi > 1) $('apMulti').textContent = 'Cette dictée contenait ' + cur.multi + ' appels : chacun a son brouillon, vérifiez-les un par un avant validation.';
  F.innerHTML = '';
  for(const [k, lbl] of CHAMPS){
    const w = document.createElement('div'); w.className = 'ap-f'; const v = cur.fiche[k] || '', s = cur.ficheSrc && cur.ficheSrc[k];
    let input; if(k === 'resultat'){ input = document.createElement('select'); input.innerHTML = '<option value="">non précisé</option>' + RESULTATS.map(r => '<option' + (r === v ? ' selected' : '') + '>' + r + '</option>').join(''); }
    else { input = document.createElement('input'); input.type = k === 'date' ? 'date' : (k === 'prix' ? 'number' : 'text'); if(k === 'prix') input.inputMode = 'decimal'; input.value = v; input.placeholder = 'non précisé'; }
    input.id = 'apF_' + k;
    input.addEventListener('change', async () => { const nv = input.value.trim(); if(nv){ cur.fiche[k] = nv; cur.ficheSrc[k] = 'manuel'; } else { delete cur.fiche[k]; delete cur.ficheSrc[k]; } await sauverCourant(); w.querySelector('.src').textContent = nv ? 'Source : saisie manuelle' : 'non précisé'; await verifierDoublon(); });
    w.innerHTML = '<label for="apF_' + k + '">' + lbl + '</label>'; w.appendChild(input);
    const sc = document.createElement('div'); sc.className = 'src'; sc.textContent = v ? ('Source : ' + (s === 'manuel' ? 'saisie manuelle' : s === 'IA' ? 'IA, à vérifier' : 'règles locales, à vérifier')) : 'non précisé'; w.appendChild(sc); F.appendChild(w);
  }
  verifierDoublon();
}
async function verifierDoublon(){
  const b = $('apDup'); b.style.display = 'none'; if(!cur || !cur.fiche) return;
  const tel = (cur.fiche.tel || '').replace(/\D/g, ''), date = cur.fiche.date || ''; if(!tel) return;
  const dup = (await lireTous()).find(a => a.id !== cur.id && a.statut === 'valide' && a.fiche && (a.fiche.tel || '').replace(/\D/g, '') === tel && (a.fiche.date || '') === date);
  if(dup){ b.style.display = 'block'; b.textContent = 'Doublon possible : un appel validé existe déjà pour ce numéro à cette date (' + resume(dup) + '). Validez uniquement s\'il s\'agit d\'un autre appel.'; }
}
async function valider(){ if(!cur || !cur.fiche){ toast('Analysez d\'abord la note'); return; } cur.statut = 'valide'; cur.valide = new Date().toISOString(); await sauver(cur); toast('Validé dans Appels & rentabilité'); nouveau(); await rafraichir(); }

// ---------- Listes & rentabilité ----------
function resume(a){ const f = a.fiche || {}; const p = [f.nature, f.lieu && f.destination ? f.lieu + ' → ' + f.destination : (f.lieu || f.destination), f.vehicule].filter(Boolean).join(' · '); return p || (a.texte || '').slice(0, 60) || '(audio sans texte)'; }
function chipRes(r){ if(!r) return '<span class="ap-chip">résultat non précisé</span>'; const c = r === 'obtenue' ? 'ok' : r === 'en attente' ? 'wait' : 'ko'; return '<span class="ap-chip ' + c + '">' + r + '</span>'; }
function bouton(txt, cls, fn){ const b = document.createElement('button'); b.type = 'button'; b.className = 'ghost ap-small ' + (cls || ''); b.textContent = txt; b.onclick = fn; return b; }
function boutonSuppr(a, el){ return bouton('Supprimer', 'ap-del', async () => { if(el.dataset.c){ await supprimer(a); if(cur && cur.id === a.id) nouveau(); await rafraichir(); toast('Supprimé (texte, fiche' + (a.audioId ? ', audio' : '') + ')'); } else { el.dataset.c = '1'; const b = el.querySelector('.ap-del'); b.textContent = 'Confirmer la suppression'; setTimeout(() => { delete el.dataset.c; b.textContent = 'Supprimer'; }, 3500); } }); }
async function rafraichir(){
  const all = await lireTous(); const br = all.filter(a => a.statut === 'brouillon'), va = all.filter(a => a.statut === 'valide');
  majBadges(br.length);
  const B = $('apBrouillons'); if(!B) return; B.innerHTML = ''; $('apNbBr').textContent = br.length;
  if(!br.length) B.innerHTML = '<div class="ap-empty">Aucun brouillon à traiter. Appuyez sur le micro après un appel.</div>';
  for(const a of br){
    const el = document.createElement('div'); el.className = 'ap-item'; el.dataset.id = a.id;
    const etat = !(a.texte || '').trim() && a.audioId ? 'à transcrire' : a.fiche ? 'fiche prête' : 'à analyser';
    el.innerHTML = '<div class="t"><b>' + esc(resume(a)) + '</b><span class="ap-chip">' + etat + (a.audioId ? ' · audio' : '') + '</span></div><div class="ex">' + esc(a.texte || '') + '</div><div class="ap-meta">' + (a.maj ? 'modifié ' + dmy(a.maj) + ' ' + hm(a.maj) : '') + (a.multi > 1 ? ' · dictée de ' + a.multi + ' appels' : '') + '</div><div class="ap-row"></div>';
    const row = el.querySelector('.ap-row');
    row.appendChild(bouton('Reprendre', '', async () => { await sauverCourant(); await charger(a); window.scrollTo({top: 0, behavior: 'smooth'}); }));
    row.appendChild(bouton(a.fiche ? 'Compléter' : 'Analyser', '', async () => { await sauverCourant(); await charger(a); if(!a.fiche) analyser(); else $('apFiche').scrollIntoView({behavior: 'smooth'}); }));
    if(a.fiche) row.appendChild(bouton('Valider', '', async () => { await sauverCourant(); await charger(a); valider(); }));
    row.appendChild(boutonSuppr(a, el)); B.appendChild(el);
  }
  const Fl = $('apFiltres'); Fl.innerHTML = '';
  for(const [k, l] of [['tous', 'Tous'], ['obtenue', 'Obtenus'], ['en attente', 'En attente'], ['refusée', 'Refusés'], ['annulée', 'Annulés'], ['sans', 'Obtenus sans mission']]){ const t = document.createElement('span'); t.className = 'ap-tab' + (filtre === k ? ' on' : ''); t.textContent = l; t.onclick = () => { filtre = k; rafraichir(); }; Fl.appendChild(t); }
  const miss = await interventions(); const V = $('apValides'); V.innerHTML = '';
  const list = va.filter(a => filtre === 'tous' || (filtre === 'sans' ? (!a.mission && (a.fiche || {}).resultat === 'obtenue') : (a.fiche || {}).resultat === filtre));
  if(!list.length) V.innerHTML = '<div class="ap-empty">Aucun appel validé' + (filtre !== 'tous' ? ' pour ce filtre' : '') + '.</div>';
  let caMois = 0, margeMois = 0; const mois = new Date().toISOString().slice(0, 7);
  for(const a of list){
    const f = a.fiche || {}; const el = document.createElement('div'); el.className = 'ap-item'; el.dataset.id = a.id; const m = a.mission ? miss.find(x => x.key === a.mission) : null; const r = m ? rentabilite(m) : null;
    let renta = '';
    if(m){ const d = m.data; renta = '<div class="ap-renta">Mission ' + esc(d.numero || m.key) + ' · ' + esc((d.from || '') + (d.to ? ' → ' + d.to : '')) + ' · facturé <b>' + fmtE(Number(d.total) || 0) + '</b>' + (r ? '<br>Coûts ' + fmtE(r.couts) + ' (gasoil, usure, temps' + (r.chargesFixes ? ', charges' : '') + ') → marge <span class="ap-marge ' + (r.marge >= 0 ? 'pos' : 'neg') + '">' + fmtE(r.marge) + '</span> (' + (r.pct || 0) + ' %)' : '<br>Rentabilité : ouvrez la mission pour la calculer') + '</div>'; }
    else if(f.resultat === 'obtenue') renta = '<div class="ap-warn">Transport obtenu mais aucune mission rattachée : rattachez l\'intervention pour la rentabilité.</div>';
    el.innerHTML = '<div class="t"><b>' + esc(resume(a)) + '</b>' + chipRes(f.resultat) + '</div><div class="ap-meta">' + (f.date || 'date non précisée') + (f.tel ? ' · ' + esc(f.tel) : '') + (f.prix ? ' · annoncé ' + esc(f.prix) + ' €' : '') + (f.motif ? ' · ' + esc(f.motif) : '') + (f.origine ? ' · ' + esc(f.origine) : ' · origine non vérifiable') + '</div>' + renta + '<div class="ap-row"></div>';
    const row = el.querySelector('.ap-row');
    if(f.resultat === 'obtenue' && !a.mission){
      const sel = document.createElement('select'); sel.className = 'ap-sel';
      const cand = miss.filter(x => !va.some(b => b.mission === x.key)).slice(0, 60);
      sel.innerHTML = '<option value="">Rattacher à une mission…</option>' + cand.map(x => '<option value="' + esc(x.key) + '">' + esc(libelleMission(x)) + '</option>').join('');
      sel.onchange = async () => { if(!sel.value) return; a.mission = sel.value; await sauver(a); await rafraichir(); toast('Mission rattachée'); }; row.appendChild(sel);
    }
    row.appendChild(bouton('Modifier', '', async () => { a.statut = 'brouillon'; await sauver(a); await charger(a); await rafraichir(); window.scrollTo({top: 0, behavior: 'smooth'}); }));
    if(a.mission) row.appendChild(bouton('Détacher', '', async () => { delete a.mission; await sauver(a); await rafraichir(); }));
    if(m && typeof ouvrirFicheHistorique === 'function') row.appendChild(bouton('Voir la mission', '', () => { try{ ouvrirFicheHistorique(m.key); }catch(e){ toast('Ouvrez-la depuis l\'Historique'); } }));
    row.appendChild(boutonSuppr(a, el)); V.appendChild(el);
    if(m && ((f.date || a.valide || '').startsWith(mois))){ caMois += Number(m.data.total) || 0; if(r) margeMois += r.marge; }
  }
  const mm = va.filter(a => ((a.fiche || {}).date || a.valide || '').startsWith(mois)), q = mm.filter(a => (a.fiche || {}).resultat !== 'annulée'), dev = mm.filter(a => (a.fiche || {}).prix), ob = mm.filter(a => (a.fiche || {}).resultat === 'obtenue');
  $('apKpis').innerHTML = [[mm.length, 'appels ce mois'], [dev.length, 'devis annoncés'], [ob.length, 'transports obtenus'], [q.length ? Math.round(ob.length / q.length * 100) + ' %' : '—', 'taux obtenu'], [caMois ? fmtE(caMois) : '—', 'CA missions liées'], [margeMois ? fmtE(margeMois) : '—', 'marge estimée (jmRentabilite)']].map(k => '<div class="ap-kpi"><b>' + k[0] + '</b><span>' + k[1] + '</span></div>').join('');
  $('apEspace').textContent = await espaceAudios();
}
function majBadges(n){ for(const id of ['gbAppelsBadge', 'apHomeBadge']){ const b = $(id); if(!b) continue; b.textContent = n; b.style.display = n ? '' : 'none'; } }

// ---------- Export CSV (colonnes du suivi lancement) ----------
async function exportCsv(){
  const va = (await lireTous()).filter(a => a.statut === 'valide'); const miss = await interventions();
  const H = 'Date;Heure;Source;N° appelant;Durée (s);Type;Trajet demandé;Km A/R;Véhicule;Prix annoncé (€);Transport obtenu;Date mission;Montant facturé (€);Gasoil;Péages;Temps (h);Coût du temps;Marge estimée (€);À importer Google Ads;Note';
  const rows = va.map(a => { const f = a.fiche || {}; const m = miss.find(x => x.key === a.mission); const r = m ? rentabilite(m) : null; return [f.date || '', a.valide ? hm(a.valide) : '', f.origine || 'indéterminée', f.tel || '', '', f.motif === 'Hors zone rentable' ? 'hors zone' : 'qualifié', (f.lieu || '') + (f.destination ? ' > ' + f.destination : ''), r ? r.kmParcourus : '', f.vehicule || '', f.prix || '', f.resultat === 'obtenue' ? 'oui' : f.resultat === 'en attente' ? 'en attente' : 'non', m ? String(m.data.date || '').slice(0, 10) : '', m ? (Number(m.data.total) || 0) : '', r ? r.carburant : '', '', r ? (r.minutes / 60).toFixed(2) : '', r ? r.temps : '', r ? r.marge : '', 'non', (f.motif || '') + (f.nature ? ' | ' + f.nature : '')].map(v => String(v).replace(/;/g, ',')).join(';'); });
  const csv = [H].concat(rows).join('\n');
  try{ await navigator.clipboard.writeText(csv); toast('CSV copié (' + rows.length + ' lignes)'); }
  catch(e){ try{ const blob = new Blob([csv], {type: 'text/csv'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'appels-jm-express.csv'; document.body.appendChild(a); a.click(); a.remove(); }catch(e2){ toast('Export impossible sur cet appareil'); } }
}

// ---------- Interruptions (appel entrant, changement d'appli, fermeture) ----------
document.addEventListener('visibilitychange', () => { if(document.hidden && recording) arreter('interruption'); else if(document.hidden) sauverCourant(); });
window.addEventListener('pagehide', () => { if(recording) arreter('interruption'); sauverCourant(); });

// ---------- Initialisation ----------
async function init(){
  if(!$('tabAppels')) return;
  await chargerReglages();
  $('apRetention').value = REGL.retentionJours; $('apTranscAuto').checked = !!REGL.transcriptionAuto;
  $('apMic').addEventListener('click', basculerMicro);
  $('apNote').addEventListener('input', () => { if(!cur) nouveau(); cur.texte = $('apNote').value; clearTimeout(saveT); $('apSave').textContent = 'Enregistrement…'; saveT = setTimeout(async () => { await sauverCourant(); if(!(cur.texte || '').trim() && !cur.audioId) $('apSave').textContent = 'Nouveau brouillon'; await rafraichir(); }, 500); });
  $('apAnalyser').addEventListener('click', analyser);
  $('apNouveau').addEventListener('click', async () => { await sauverCourant(); nouveau(); await rafraichir(); toast('Nouveau brouillon'); });
  $('apTranscBtn').addEventListener('click', () => transcrire(null));
  $('apValider').addEventListener('click', valider);
  $('apEnregistrer').addEventListener('click', async () => { await sauverCourant(); await rafraichir(); toast('Brouillon enregistré'); });
  $('apCsv').addEventListener('click', exportCsv);
  $('apRetention').addEventListener('change', async () => { REGL.retentionJours = Math.max(0, Number($('apRetention').value) || 0); await sauverReglages(); await purgerAudios(); await rafraichir(); toast('Conservation : ' + REGL.retentionJours + ' j'); });
  $('apTranscAuto').addEventListener('change', async () => { REGL.transcriptionAuto = $('apTranscAuto').checked; await sauverReglages(); });
  $('apHint').textContent = microDispo() ? 'Appuyez, parlez, appuyez pour terminer. La note est sauvegardée puis transcrite.' : 'Micro indisponible ici : utilisez le micro du clavier dans la zone de texte.';
  nouveau(); await purgerAudios(); await rafraichir();
}
window.jmAppels = {ouvrir: async function(){ if(typeof showTab === 'function') showTab('tabAppels'); await rafraichir(); }, enregistrerDepuisAccueil: async function(){ if(typeof showTab === 'function') showTab('tabAppels'); await rafraichir(); if(!recording) setTimeout(demarrer, 250); }, rafraichir, nouveau};
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
