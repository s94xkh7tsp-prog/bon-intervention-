// =====================================================================
//  JM Express — « À mettre au calendrier » (v348)
//  Liste des rappels à encoder dans le Calendrier iPhone (bilans Ads,
//  budgets, maintenance…). Chaque ligne s'ajoute au Calendrier en un
//  appui (fichier .ics ouvert par Safari), puis se coche « encodé ».
//  Stockage : clés rappel:<id> via window.storage (synchronisées).
//  Indépendant des RDV clients et des rappels comptables existants.
// =====================================================================
(function(){
'use strict';
if(window.jmAgenda) return;
const PREFIX = 'rappel:';
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const toast = m => { if(typeof showToast === 'function') showToast(m); };
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const CSS = `
.ag-list{display:flex;flex-direction:column;gap:10px}
.ag-item{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:12px;border-left:4px solid var(--orange)}
.ag-item.fait{opacity:.55;border-left-color:var(--green)}
.ag-item.passe{border-left-color:var(--red)}
.ag-item b{color:var(--white);font-size:15px;display:block}
.ag-when{font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--orange);margin:3px 0}
.ag-item.fait .ag-when{color:var(--grey)}
.ag-meta{font-size:12.5px;color:var(--grey);white-space:pre-wrap}
.ag-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.ag-row button{margin:0;width:auto;flex:1 1 calc(50% - 4px);min-width:120px;min-height:40px;padding:8px 10px;font-size:13.5px}
.ag-chip{display:inline-block;font-size:11px;font-weight:700;padding:3px 8px;border-radius:999px;border:1px solid var(--line);color:var(--grey);margin-left:6px;vertical-align:middle}
.ag-empty{color:var(--grey);font-size:13px;padding:14px;text-align:center;border:1px dashed var(--line);border-radius:12px}
.ag-form input,.ag-form textarea,.ag-form select{width:100%;background:var(--ink);color:var(--white);border:1px solid var(--line);border-radius:10px;padding:10px;font:inherit;font-size:15px}
.ag-form label{display:block;font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:var(--grey);margin:8px 0 3px}
.ag-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ag-del{color:var(--red)!important;border-color:var(--red)!important}
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

async function lire(){ const out = []; try{ const l = await window.storage.list(PREFIX); for(const k of (l.keys || [])){ try{ out.push(JSON.parse((await window.storage.get(k)).value)); }catch(e){} } }catch(e){} return out.sort((a, b) => String(a.quand).localeCompare(String(b.quand))); }
async function sauver(r){ r.maj = new Date().toISOString(); await window.storage.set(PREFIX + r.id, JSON.stringify(r)); return r; }
async function supprimer(r){ await window.storage.delete(PREFIX + r.id); }

// ---------- Rappels déjà planifiés (pré-remplis une seule fois) ----------
const INITIAUX = [
  {quand: '2026-11-28T09:10', titre: 'Bilan J+7 — campagne Google Ads « JM Transport véhicules »', notes: 'Claude envoie le bilan (dépenses, termes facturés, appels). Préparer le suivi des appels (CSV) : appels qualifiés, devis, transports facturés.', origine: 'Claude', duree: 30},
  {quand: '2026-11-30T09:00', titre: 'Bilan Google Ads 14 jours (PMax + Recherche v2)', notes: 'Claude envoie le bilan 17 → 29 nov. Fournir le carnet d\'appels.', origine: 'Claude', duree: 30},
  {quand: '2026-12-01T09:00', titre: 'Google Ads — confirmer budgets décembre 8/2/3', notes: 'Répondre « applique 8/2/3 » ou « garde 7/2/3 » à Claude. Vérifier le coût net final de novembre (enveloppe 400 €).', origine: 'Claude', duree: 15, encode: true},
  {quand: '2026-12-01T08:47', titre: 'Resynchro avis Google (Trustindex) sur le site', notes: 'Se connecter à WordPress quand Claude le demande.', origine: 'Claude', duree: 15},
  {quand: '2026-12-05T09:10', titre: 'Bilan J+14 approfondi — campagne « JM Transport véhicules »', notes: 'Décision : continuer / exclusions / tester les génériques / veille. Fournir le CSV des appels.', origine: 'Claude', duree: 30},
  {quand: '2026-12-16T08:47', titre: 'Resynchro avis Google (Trustindex) sur le site', notes: '', origine: 'Claude', duree: 15}
];
async function preRemplir(){
  try{ if((await window.storage.get('rappelsInit')).value === '1') return; }catch(e){}
  const existants = await lire(); if(!existants.length){ for(const r of INITIAUX) await sauver(Object.assign({id: newId(), cree: new Date().toISOString()}, r)); }
  try{ await window.storage.set('rappelsInit', '1'); }catch(e){}
}

// ---------- Fichier .ics → Calendrier iPhone ----------
function icsDate(local){ const d = new Date(local); const p = n => String(n).padStart(2, '0'); return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + 'T' + p(d.getHours()) + p(d.getMinutes()) + '00'; }
function icsTexte(s){ return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;'); }
function ics(r){
  const debut = new Date(r.quand), fin = new Date(debut.getTime() + (Number(r.duree) || 30) * 60000);
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//JM Express//Rappels//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VTIMEZONE', 'TZID:Europe/Brussels', 'BEGIN:STANDARD', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'END:STANDARD', 'BEGIN:DAYLIGHT', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'END:DAYLIGHT', 'END:VTIMEZONE',
    'BEGIN:VEVENT', 'UID:jm-rappel-' + r.id + '@jm-express', 'DTSTAMP:' + icsDate(new Date().toISOString()) + 'Z', 'DTSTART;TZID=Europe/Brussels:' + icsDate(debut), 'DTEND;TZID=Europe/Brussels:' + icsDate(fin),
    'SUMMARY:' + icsTexte(r.titre), 'DESCRIPTION:' + icsTexte((r.notes ? r.notes + '\n' : '') + 'Origine : ' + (r.origine || 'JM Express')), 'BEGIN:VALARM', 'TRIGGER:-PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsTexte(r.titre), 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}
function ajouterAuCalendrier(r){
  const contenu = ics(r);
  try{
    const blob = new Blob([contenu], {type: 'text/calendar;charset=utf-8'}); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'rappel-jm-express.ics'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }catch(e){
    try{ window.location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(contenu); }catch(e2){ toast('Impossible d\'ouvrir le Calendrier ici'); return; }
  }
  toast('Fichier d\'événement ouvert : validez « Ajouter » dans le Calendrier, puis cochez « Encodé »');
}

// ---------- Collage rapide : "AAAA-MM-JJ HH:MM | Titre | notes" ----------
function parserColle(txt){
  const out = [];
  for(const ligne of String(txt).split(/\n+/)){
    const m = ligne.trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{1,2})[:h](\d{2})?\s*\|\s*([^|]+?)\s*(?:\|\s*(.*))?$/);
    if(!m) continue;
    out.push({quand: m[1] + 'T' + m[2].padStart(2, '0') + ':' + (m[3] || '00'), titre: m[4].trim(), notes: (m[5] || '').trim(), origine: 'Collé', duree: 30});
  }
  return out;
}

// ---------- Rendu ----------
let edit = null;
async function rafraichir(){
  const all = await lire(); const now = Date.now();
  const aFaire = all.filter(r => !r.encode); majBadge(aFaire.filter(r => new Date(r.quand).getTime() > now - 864e5).length);
  const L = $('agListe'); if(!L) return; L.innerHTML = '';
  if(!all.length) L.innerHTML = '<div class="ag-empty">Aucun rappel. Ajoutez-en un ou collez ceux que Claude ou ChatGPT vous donnent.</div>';
  for(const r of all){
    const d = new Date(r.quand); const passe = d.getTime() < now && !r.encode;
    const el = document.createElement('div'); el.className = 'ag-item' + (r.encode ? ' fait' : '') + (passe ? ' passe' : '');
    el.innerHTML = '<b>' + esc(r.titre) + (r.encode ? '<span class="ag-chip">encodé</span>' : passe ? '<span class="ag-chip" style="color:var(--red);border-color:var(--red)">passé</span>' : '<span class="ag-chip" style="color:var(--orange);border-color:var(--orange)">à encoder</span>') + '</b>' +
      '<div class="ag-when">' + d.toLocaleDateString('fr-BE', {weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'}) + ' · ' + d.toLocaleTimeString('fr-BE', {hour: '2-digit', minute: '2-digit'}) + '</div>' +
      (r.notes ? '<div class="ag-meta">' + esc(r.notes) + '</div>' : '') + '<div class="ag-meta">Origine : ' + esc(r.origine || '—') + '</div><div class="ag-row"></div>';
    const row = el.querySelector('.ag-row');
    if(!r.encode) row.appendChild(btn('Ajouter au Calendrier iPhone', 'primary', () => ajouterAuCalendrier(r)));
    row.appendChild(btn(r.encode ? 'Remettre à encoder' : 'Encodé ✓', 'ghost', async () => { r.encode = !r.encode; await sauver(r); await rafraichir(); }));
    row.appendChild(btn('Modifier', 'ghost', () => { edit = r; $('agTitre').value = r.titre; $('agDate').value = r.quand.slice(0, 10); $('agHeure').value = r.quand.slice(11, 16); $('agNotes').value = r.notes || ''; $('agOrigine').value = r.origine || 'Moi'; $('agFormTitre').textContent = 'Modifier le rappel'; $('agForm').scrollIntoView({behavior: 'smooth'}); }));
    row.appendChild(btn('Supprimer', 'ghost ag-del', async () => { if(el.dataset.c){ await supprimer(r); await rafraichir(); toast('Rappel supprimé'); } else { el.dataset.c = '1'; const b = el.querySelector('.ag-del'); b.textContent = 'Confirmer'; setTimeout(() => { delete el.dataset.c; b.textContent = 'Supprimer'; }, 3500); } }));
    L.appendChild(el);
  }
}
function btn(t, cls, fn){ const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = t; b.onclick = fn; return b; }
function majBadge(n){ for(const id of ['gbAgendaBadge']){ const b = $(id); if(!b) continue; b.textContent = n; b.style.display = n ? '' : 'none'; } }
async function enregistrerForm(){
  const titre = $('agTitre').value.trim(), date = $('agDate').value, heure = $('agHeure').value || '09:00';
  if(!titre || !date){ toast('Titre et date obligatoires'); return; }
  const r = edit || {id: newId(), cree: new Date().toISOString(), encode: false};
  r.titre = titre; r.quand = date + 'T' + heure; r.notes = $('agNotes').value.trim(); r.origine = $('agOrigine').value; r.duree = 30;
  await sauver(r); edit = null; $('agTitre').value = ''; $('agNotes').value = ''; $('agFormTitre').textContent = 'Ajouter un rappel'; await rafraichir(); toast('Rappel enregistré');
}
async function collerRappels(){
  const txt = $('agColle').value; const liste = parserColle(txt);
  if(!liste.length){ toast('Aucune ligne reconnue (format : 2026-12-05 09:10 | Titre | notes)'); return; }
  const existants = await lire(); let n = 0;
  for(const r of liste){ if(existants.some(e => e.quand === r.quand && e.titre === r.titre)) continue; await sauver(Object.assign({id: newId(), cree: new Date().toISOString(), encode: false}, r)); n++; }
  $('agColle').value = ''; await rafraichir(); toast(n + ' rappel(s) ajouté(s)' + (liste.length - n ? ', ' + (liste.length - n) + ' déjà présent(s)' : ''));
}
async function init(){
  if(!$('tabAgenda')) return;
  await preRemplir();
  $('agEnregistrer').addEventListener('click', enregistrerForm);
  $('agCollerBtn').addEventListener('click', collerRappels);
  $('agDate').value = new Date().toISOString().slice(0, 10); $('agHeure').value = '09:00';
  await rafraichir();
}
window.jmAgenda = {ouvrir: async function(){ if(typeof showTab === 'function') showTab('tabAgenda'); await rafraichir(); }, rafraichir};
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
