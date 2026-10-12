// Défi JM v311 : interface isolée, aucune écriture dans le moteur tarifaire.
let JM_DEFI_CTX=null,JM_DEFI_TIMER=null,JM_DEFI_BUSY=false;
function jmDefiFermer(){clearTimeout(JM_DEFI_TIMER);JM_DEFI_CTX=null;document.getElementById('jmDefiBg')?.remove();}
function jmDefiElt(tag,text,parent){const e=document.createElement(tag);if(text!==null)e.textContent=text;if(parent)parent.appendChild(e);return e;}
function jmDefiBouton(text,fn,parent){const e=jmDefiElt('button',text,parent);e.type='button';e.className='ghost';e.onclick=()=>jmDefiOperation(fn);return e;}
async function jmDefiApi(action,body){
 if(typeof SYNC==='undefined'||!SYNC.url||!SYNC.jeton)throw Error('Configure d’abord la synchronisation dans Réglages → téléphone de secours.');
 const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),12000);
 try{const u=new URL(SYNC.url);if(u.protocol!=='https:')throw Error('Le serveur doit utiliser HTTPS.');const r=await fetch(SYNC.url.replace(/\/$/,'')+'/api/game/'+action,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','Authorization':'Bearer '+SYNC.jeton},cache:'no-store',body:body?JSON.stringify(body):undefined,signal:ctrl.signal});const j=await r.json();if(!r.ok)throw Object.assign(new Error(j.error||'Serveur du jeu non installé.'),{status:r.status});return j;}catch(e){if(e.name==='AbortError')throw Error('Connexion trop lente : réessaie.');throw e;}finally{clearTimeout(timeout);}
}
async function jmDefiOperation(fn){if(JM_DEFI_BUSY)return;const ctx=JM_DEFI_CTX;if(!ctx)return;JM_DEFI_BUSY=true;ctx.box.querySelectorAll('button').forEach(b=>b.disabled=true);ctx.message.textContent='';try{await fn(ctx);}catch(e){if(JM_DEFI_CTX===ctx)ctx.message.textContent=e.message||'Jeu indisponible.';}finally{JM_DEFI_BUSY=false;if(JM_DEFI_CTX===ctx)ctx.box.querySelectorAll('button').forEach(b=>b.disabled=false);}}
async function jmDefiOuvrir(key){
 jmDefiFermer();if(typeof fermerPlusTerrain==='function')fermerPlusTerrain();
 const bg=jmDefiElt('div',null,document.body);bg.id='jmDefiBg';bg.className='modal-bg show';const box=jmDefiElt('div',null,bg);box.className='modal';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','Défi JM');
 jmDefiElt('h3','🎮 Défi JM — le jeu passager',box);jmDefiElt('p','5 questions, un petit sourire et un cadeau choisi. À préparer lorsque tu es à l’arrêt. Le client peut utiliser ses données mobiles ou ton partage de connexion.',box);
 const select=jmDefiElt('select',null,box);select.setAttribute('aria-label','Intervention concernée');const chosen=key||(typeof editingKey!=='undefined'&&editingKey)||(typeof DISPATCH_ACTIVE_KEY!=='undefined'&&DISPATCH_ACTIVE_KEY)||'';
 const ctx={box,select,key:chosen,session:null};JM_DEFI_CTX=ctx;
 ctx.message=jmDefiElt('p','Chargement des interventions…',box);ctx.message.setAttribute('role','status');
 const capLabel=jmDefiElt('label','Remise maximale proposée (€) — 0 pour désactiver',box);const cap=jmDefiElt('input',null,box);cap.type='number';cap.min='0';cap.max='100';cap.step='1';cap.value=localStorage.getItem('jm_defi-cap')||'0';ctx.cap=cap;
 jmDefiBouton('Créer / retrouver le QR du client',async c=>{c.key=c.select.value;if(!c.key)throw Error('Enregistre d’abord ton intervention pour lui associer une partie.');const max=Number(c.cap.value);if(!Number.isFinite(max)||max<0||max>100)throw Error('Choisis un montant de 0 à 100 €.');const j=await jmDefiApi('create',{interventionKey:c.key,maxDiscount:max});if(JM_DEFI_CTX!==c)return;localStorage.setItem('jm_defi-cap',String(max));c.session=j.session;await jmDefiAfficher(c);jmDefiPlanifier(c);},box);
 ctx.content=jmDefiElt('div',null,box);jmDefiBouton('Fermer',()=>jmDefiFermer(),box);
 select.onchange=()=>{clearTimeout(JM_DEFI_TIMER);ctx.key=select.value;ctx.session=null;ctx.content.replaceChildren();ctx.message.textContent='';};
 try{const keys=(await window.storage.list('intervention:')).keys||[];const entries=await Promise.all(keys.map(async k=>{try{return {key:k,d:JSON.parse((await window.storage.get(k)).value)}}catch{return null}}));if(JM_DEFI_CTX!==ctx)return;for(const e of entries.filter(Boolean).sort((a,b)=>String(b.d.date||'').localeCompare(String(a.d.date||'')))){const option=jmDefiElt('option',(e.d.numero?'Bon '+e.d.numero+' — ':'')+(e.d.plaque||e.d.clientNom||e.d.from||'Intervention'),select);option.value=e.key;}if(chosen&&keys.includes(chosen))select.value=chosen;ctx.key=select.value;ctx.message.textContent=keys.length?'Choisis le bon concerné, puis crée ou retrouve sa partie.':'Aucune intervention enregistrée. Enregistre ton bon, puis ouvre le Défi JM.';}catch{ctx.message.textContent='Impossible de lire les interventions.';}
}
function jmDefiLien(s){const url=new URL('game.html',location.href);url.search='';url.hash=new URLSearchParams({s:s.session_id,api:SYNC.url.replace(/\/$/,'')}).toString();return url.href;}
async function jmDefiAfficher(ctx){
 if(JM_DEFI_CTX!==ctx)return;ctx.content.replaceChildren();const s=ctx.session;ctx.cap.disabled=true;ctx.select.disabled=true;
 ctx.message.textContent='Session valable jusqu’au '+new Date(s.expires_at).toLocaleString('fr-BE');
 if(!s.completed){
  const lien=jmDefiLien(s),qr=makeQrMatrix(lien),size=qr.getModuleCount(),scale=5,canvas=jmDefiElt('canvas',null,ctx.content);canvas.width=canvas.height=(size+8)*scale;canvas.style.cssText='display:block;width:min(100%,280px);height:auto;margin:16px auto;background:white';const g=canvas.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,canvas.width,canvas.height);g.fillStyle='#000';for(let r=0;r<size;r++)for(let c=0;c<size;c++)if(qr.isDark(r,c))g.fillRect((c+4)*scale,(r+4)*scale,scale,scale);
  const input=jmDefiElt('input',null,ctx.content);input.value=lien;input.readOnly=true;input.setAttribute('aria-label','Lien du jeu client');
  jmDefiBouton('Copier le lien',async()=>{await navigator.clipboard.writeText(lien);showToast('Lien du jeu copié');},ctx.content);
  jmDefiBouton('Partager le lien',async()=>{if(navigator.share)await navigator.share({title:'Défi JM',text:'Le petit jeu de ton trajet avec JM Express',url:lien});else{input.select();showToast('Copie le lien affiché');}},ctx.content);
  jmDefiElt('p',s.answers.length+'/5 réponses — '+s.total_points+' points',ctx.content);
  if(s.unlocked<5)jmDefiBouton('📦 Véhicule déchargé : ouvrir les 2 dernières questions',async c=>{const j=await jmDefiApi('unlock',{sessionId:s.session_id,interventionKey:c.key,delivered:true});if(JM_DEFI_CTX!==c)return;c.session=j.session;await jmDefiAfficher(c);},ctx.content);
  else jmDefiElt('p','Livraison confirmée pour le jeu. Le client peut répondre aux deux dernières questions.',ctx.content);
  jmDefiBouton('Actualiser le résultat',c=>jmDefiActualiser(c),ctx.content);
 }else{
  const r=s.result;jmDefiElt('h3','🏆 Résultat : '+r.score+'/100',ctx.content);
  jmDefiElt('p',r.reward_type==='discount'?'Remise choisie : '+r.discount_eur.toLocaleString('fr-BE')+' € — valable jusqu’au '+new Date(r.valid_until).toLocaleDateString('fr-BE')+'. À appliquer manuellement sur une prochaine intervention.':r.reward_type==='dedication'?'Dédicace choisie : à organiser avec le client.':'Le client n’a pas choisi de cadeau.',ctx.content);
  if(r.feedback)jmDefiElt('p','Petit mot du client : '+r.feedback,ctx.content);
  jmDefiElt('p','Accord pour filmer : '+(r.film_consent?'oui':'non')+'. Publication : '+(r.publication_consent?Object.keys(r.platforms).filter(k=>r.platforms[k]).join(', '):'non')+'.',ctx.content);
  await jmDefiSauverResultat(ctx.key,s);
  jmDefiElt('p','Résultat conservé avec ce bon. Aucun montant de facture n’a été changé.',ctx.content);
 }
}
async function jmDefiSauverResultat(key,s){const raw=await window.storage.get(key);if(!raw?.value)throw Error('Bon introuvable : résultat toujours disponible sur le serveur.');const d=JSON.parse(raw.value);const value={session_id:s.session_id,result:s.result};if(JSON.stringify(d.defiJM)===JSON.stringify(value))return;d.defiJM=value;await window.storage.set(key,JSON.stringify(d));}
async function jmDefiActualiser(ctx){if(JM_DEFI_CTX!==ctx||!ctx.key)return;const j=await jmDefiApi('results?interventionKey='+encodeURIComponent(ctx.key));if(JM_DEFI_CTX!==ctx)return;ctx.session=j.session;if(j.expired&&!j.session.completed){clearTimeout(JM_DEFI_TIMER);ctx.message.textContent='Cette partie a expiré. Ferme puis ouvre le jeu pour créer une nouvelle partie.';return;}await jmDefiAfficher(ctx);}
function jmDefiPlanifier(ctx){clearTimeout(JM_DEFI_TIMER);if(JM_DEFI_CTX!==ctx||ctx.session?.completed||document.hidden)return;JM_DEFI_TIMER=setTimeout(async()=>{try{if(!JM_DEFI_BUSY)await jmDefiOperation(()=>jmDefiActualiser(ctx));}finally{jmDefiPlanifier(ctx);}},5000);}
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(JM_DEFI_TIMER);else if(JM_DEFI_CTX)jmDefiPlanifier(JM_DEFI_CTX);});
// Petit repère sur une fiche client déjà autorisée ; aucune création de contact imposée.
async function jmDefiClientRepere(key,s){
 if(s.result.reward_type!=='discount'||s.result.discount_eur<=0)return;
 const d=JSON.parse((await window.storage.get(key)).value),clients=JSON.parse((await window.storage.get('clients')).value||'[]');
 const client=clients.find(c=>c.id===d.clientId)||(d.telClient?clients.find(c=>jmClientTel(c.tel)===jmClientTel(d.telClient)):null);
 if(!client||!jmClientFidele(client))return;
 client.defiRewards=(client.defiRewards||[]).filter(r=>new Date(r.valid_until)>new Date());
 if(client.defiRewards.some(r=>r.session_id===s.session_id))return;
 client.defiRewards.push({session_id:s.session_id,amount:s.result.discount_eur,valid_until:s.result.valid_until,intervention_key:key});client.defiRewards=client.defiRewards.slice(-10);
 await window.storage.set('clients',JSON.stringify(clients));CLIENTS=clients;jmClientReconnaissance();
}
const jmDefiSauverOriginal=jmDefiSauverResultat;
jmDefiSauverResultat=async function(key,s){await jmDefiSauverOriginal(key,s);try{await jmDefiClientRepere(key,s);}catch{/* Le résultat reste conservé même sans fiche de fidélité. */}};
const jmDefiReconnaissanceOriginal=jmClientReconnaissance;
jmClientReconnaissance=function(){const r=jmDefiReconnaissanceOriginal.apply(this,arguments);const n=jmClientTel(document.getElementById('telClient').value),c=CLIENTS.find(c=>n&&jmClientTel(c.tel)===n),b=document.getElementById('jmClientReconnu');if(b&&c&&jmClientFidele(c))for(const gift of c.defiRewards||[]){if(gift.used||new Date(gift.valid_until)<=new Date())continue;const p=jmDefiElt('p','🎮 Défi JM : remise disponible de '+gift.amount+' € jusqu’au '+new Date(gift.valid_until).toLocaleDateString('fr-BE')+' — à appliquer manuellement.',b);const btn=jmDefiElt('button','Marquer cette remise utilisée',b);btn.type='button';btn.className='ghost';btn.onclick=async()=>{try{const fresh=JSON.parse((await window.storage.get('clients')).value),fc=fresh.find(x=>x.id===c.id),reward=fc?.defiRewards?.find(x=>x.session_id===gift.session_id);if(!reward)return;reward.used=new Date().toISOString();await window.storage.set('clients',JSON.stringify(fresh));CLIENTS=fresh;jmClientReconnaissance();showToast('Remise marquée utilisée. Vérifie son montant sur la facture.');}catch{showToast('Impossible de marquer la remise utilisée');}};}return r;};

/* Afficher seulement l'adresse publique ; ne jamais copier le jeton de synchronisation. */
function jmDefiServeurAfficher(){
 const anchor=document.getElementById('syncRole');if(!anchor)return;
 let box=document.getElementById('jmSyncAdressePublique');
 if(!box){
  box=document.createElement('div');box.id='jmSyncAdressePublique';box.style.marginTop='12px';
  const label=document.createElement('label');label.textContent='Adresse du serveur utilisé';box.appendChild(label);
  const input=document.createElement('input');input.id='jmSyncAdresseLecture';input.type='text';input.readOnly=true;input.style.width='100%';input.setAttribute('aria-label','Adresse publique du serveur');box.appendChild(input);
  const button=document.createElement('button');button.type='button';button.className='ghost';button.textContent='Copier l’adresse du serveur';button.style.marginTop='8px';
  button.onclick=async function(){const adresse=input.value;if(!adresse)return;try{await navigator.clipboard.writeText(adresse);showToast('Adresse du serveur copiée');}catch{input.focus();input.select();showToast('Sélectionne Copier sur le texte affiché');}};
  box.appendChild(button);anchor.parentNode.appendChild(box);
 }
 const adresse=typeof SYNC!=='undefined'?String(SYNC.url||''):'';
 document.getElementById('jmSyncAdresseLecture').value=adresse;
 box.style.display=adresse?'block':'none';
}
if(typeof syncMajEcranReglages==='function'){
 const jmDefiAncienSyncEcran=syncMajEcranReglages;
 syncMajEcranReglages=function(){const r=jmDefiAncienSyncEcran.apply(this,arguments);jmDefiServeurAfficher();return r;};
}
