/* v322 — Calcul visible et choix du retour accessible ; fonctions métier conservées. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const onSiteServices=['pneu_chg','pneu_rep','demarrage','test_batt','changement_batterie','moto_batterie','diag','erreur_carburant','ouverture_vehicule'];
 const onSite=()=>onSiteServices.includes($('type')?.value) && document.querySelector('#deposeMode .toggle.on')?.dataset.m!=='depose';
 function calculationWarnings(){
  const items=[];const km=$('km'),type=$('type')?.value;
  if(!type)items.push({id:'type',text:'Choisis le type d’intervention.',blocking:true});
  if(km){const raw=km.value.trim(),n=Number(raw.replace(',','.'));
   if(km.validity?.badInput||raw && (!Number.isFinite(n)||n<0))items.push({id:'km',text:'La distance doit être un nombre positif ou égal à 0.',blocking:true});
   else if(!raw)items.push({id:'km',text:'La distance est vide : le calcul utilisera 0 km.',blocking:false});
  }
  if(['changement_batterie','moto_batterie'].includes(type) && !Number($('battPrice')?.value))items.push({id:'battPrice',text:'Le prix d’achat de la batterie est vide ou à 0 : aucun achat ni marge ne sera ajouté.',blocking:false});
  if(!onSite() && $('tgRetour')?.classList.contains('on') && !$('addrTo')?.value.trim())items.push({id:'addrTo',text:'Le retour à vide est activé sans adresse de dépose : sa distance ne peut pas être vérifiée automatiquement.',blocking:false});
  return items;
 }
 function showCalculatedAmount(total){
  $('jmCalculationResult')?.remove();
  const bg=document.createElement('div');bg.id='jmCalculationResult';bg.className='modal-bg show';bg.setAttribute('role','dialog');bg.setAttribute('aria-modal','true');bg.setAttribute('aria-labelledby','jmCalculationResultTitle');
  const panel=document.createElement('div');panel.className='modal';const title=document.createElement('h2');title.id='jmCalculationResultTitle';title.textContent='Montant calculé';
  const amount=document.createElement('p');amount.className='jm-calculation-amount';amount.textContent=total.textContent;
  const service=document.createElement('p');service.textContent=onSite()?'Intervention sur place — à l’adresse indiquée.':'Calcul selon les informations renseignées.';
  panel.append(title,amount,service);
  if(onSite() && $('tgRetour')?.classList.contains('on') && typeof lastCalc!=='undefined' && !lastCalc?.kmRetourVerifie){const note=document.createElement('p');note.textContent='Retour à vide non vérifié : '+($('kmRetourVide')?.value||'0')+' km. Vérifie cette distance dans le détail avant d’enregistrer.';panel.append(note);}
  const close=document.createElement('button');close.type='button';close.className='primary';close.textContent='Voir le détail et enregistrer';close.onclick=()=>{bg.remove();total.scrollIntoView({behavior:'smooth',block:'center'});};panel.append(close);bg.append(panel);document.body.append(bg);close.focus();
 }
 function confirmCalculation(items){
  return new Promise(resolve=>{
   const bg=document.createElement('div');bg.id='jmCalculationCheck';bg.className='modal-bg show';bg.setAttribute('role','dialog');bg.setAttribute('aria-modal','true');bg.setAttribute('aria-labelledby','jmCalculationCheckTitle');
   const panel=document.createElement('div');panel.className='modal';
   const title=document.createElement('h2');title.id='jmCalculationCheckTitle';title.textContent='À vérifier avant le calcul';panel.append(title);
   const list=document.createElement('ul');for(const item of items){const li=document.createElement('li');li.textContent=item.text;list.append(li);}panel.append(list);
   const finish=value=>{bg.remove();resolve(value);};
   const edit=document.createElement('button');edit.type='button';edit.className='primary';edit.textContent='Compléter les champs';edit.onclick=()=>{finish(false);const field=$(items[0].id);field?.scrollIntoView({behavior:'smooth',block:'center'});field?.focus({preventScroll:true});};panel.append(edit);
   if(!items.some(i=>i.blocking)){const go=document.createElement('button');go.type='button';go.className='ghost';go.textContent='Calculer avec ces informations';go.onclick=()=>finish(true);panel.append(go);}
   bg.append(panel);document.body.append(bg);edit.focus();
  });
 }
 // v321 — diagnostic : aucune mesure de distance ne peut bloquer le calcul, et un calcul sans résultat est toujours expliqué.
 const toastLog=[];
 if(typeof showToast==='function'){const _t=showToast;showToast=function(msg){toastLog.push(String(msg));if(toastLog.length>6)toastLog.shift();return _t.apply(this,arguments);};}
 if(typeof rvMesurer==='function'){const _rv=rvMesurer;rvMesurer=function(ctx,forcer){const p=_rv.apply(this,arguments);if(!p||typeof p.then!=='function')return p;
  return Promise.race([p,new Promise(res=>setTimeout(()=>{if(ctx?.mesure?.enCours){ctx.mesure.enCours=null;try{rvFallback(ctx,'mesure trop longue');}catch(_){}}res();},15000))]);};}
 function showCalculationFailure(reason){
  $('jmCalculationResult')?.remove();
  const bg=document.createElement('div');bg.id='jmCalculationResult';bg.className='modal-bg show';bg.setAttribute('role','dialog');bg.setAttribute('aria-modal','true');
  const panel=document.createElement('div');panel.className='modal';const title=document.createElement('h2');title.textContent='Aucun montant calculé';
  const why=document.createElement('p');why.textContent=reason||toastLog[toastLog.length-1]||'Le calcul s’est arrêté sans message.';
  const diag=document.createElement('pre');diag.style.cssText='white-space:pre-wrap;font-size:12px;opacity:.8';
  const v=id=>($(id)?.value??'∅');
  diag.textContent=[APP_VERSION,'type='+v('type'),'km='+v('km')+(($('km')?.validity?.badInput)?' (illisible)':''),'de='+v('addrFrom'),'vers='+v('addrTo'),'retour='+($('tgRetour')?.classList.contains('on')?'oui '+v('kmRetourVide'):'non'),'ticket='+($('ticket')?.classList.contains('show')?'oui':'non'),'total='+(typeof lastCalc!=='undefined'&&lastCalc?lastCalc.total:'∅'),'messages='+toastLog.join(' | ')].join('\n');
  const close=document.createElement('button');close.type='button';close.className='primary';close.textContent='Fermer';close.onclick=()=>bg.remove();
  panel.append(title,why,diag,close);bg.append(panel);document.body.append(bg);close.focus();
 }
 // v323 — VSP : l'option « Remorquage VSP » règle le type de véhicule (intervention ET devis), et le quitter remet « Voiture ».
 function vspSync(selId,getType,setType){
  const sel=$(selId);if(!sel)return;
  sel.addEventListener('change',()=>{const vsp=sel.selectedOptions[0]?.dataset.vehicleType==='vsp';
   if(vsp&&getType()!=='vsp')setType('vsp');else if(!vsp&&sel.dataset.jmWasVsp==='1'&&getType()==='vsp')setType('normale');
   sel.dataset.jmWasVsp=vsp?'1':'';});
 }
 vspSync('type',()=>typeof VEHICLE_TYPE!=='undefined'?VEHICLE_TYPE:'',t=>{if(typeof setVehicleType==='function')setVehicleType(t);});
 vspSync('qqType',()=>typeof QQ_VEHICLE_TYPE!=='undefined'?QQ_VEHICLE_TYPE:'',t=>{if(typeof setQqVehicleType==='function')setQqVehicleType(t);});
 // v323 — Copie : jamais d'erreur silencieuse ; repli si le presse-papiers refuse.
 try{
  const cb=navigator.clipboard;
  if(cb&&typeof cb.writeText==='function'){
   const w=cb.writeText.bind(cb);
   const fallback=text=>{const ta=document.createElement('textarea');ta.value=String(text);ta.setAttribute('readonly','');ta.style.cssText='position:fixed;top:0;left:0;opacity:0';document.body.append(ta);ta.select();ta.setSelectionRange(0,ta.value.length);let ok=false;try{ok=document.execCommand('copy');}catch(_){}ta.remove();if(!ok&&typeof showToast==='function')showToast('Copie impossible : appuie longuement pour copier le texte');return ok;};
   cb.writeText=text=>w(text).catch(()=>{fallback(text);});
  }
 }catch(_){}
 // v323 — Nouvelle intervention VIERGE : rien de l'intervention précédente (plus d'options, garages, attentes, frais…) n'est repris.
 const IGNORE_DIRTY=new Set(['type','addrDepart','interventionDate','interventionTime']);
 const pristine=(()=>{const root=$('tabNouveau');if(!root)return null;const f=[],t=[];
  root.querySelectorAll('input,textarea,select').forEach(e=>{if(e.type==='file')return;f.push([e,e.type==='checkbox'||e.type==='radio'?e.checked:(e.tagName==='SELECT'?e.selectedIndex:e.value)]);});
  root.querySelectorAll('.toggle').forEach(e=>t.push([e,e.classList.contains('on')]));return {f,t};})();
 window.jmDirtyFields=()=>pristine?pristine.f.filter(([e,v])=>!IGNORE_DIRTY.has(e.id)&&e.type!=='hidden'&&String(e.type==='checkbox'||e.type==='radio'?e.checked:(e.tagName==='SELECT'?e.selectedIndex:e.value)).trim()!==String(v).trim()).map(([e,v])=>(e.id||e.name||e.className)+':'+v+'→'+(e.tagName==='SELECT'?e.selectedIndex:e.value)):[];
 function formDirty(){if(!pristine)return false;
  for(const [e,v] of pristine.f){if(IGNORE_DIRTY.has(e.id)||e.type==='hidden')continue;const cur=e.type==='checkbox'||e.type==='radio'?e.checked:(e.tagName==='SELECT'?e.selectedIndex:e.value);if(cur!==v && String(cur).trim()!==String(v).trim())return true;}
  return false;}
 window.jmNouvelleInterventionVierge=async function(silencieux){
  if(typeof editingKey!=='undefined'&&editingKey){editingKey=null;try{VERSION_EDITION=null;majBandeauVersion();}catch(_){}const b=$('editBanner');if(b)b.style.display='none';}
  if(pristine){for(const [e,v] of pristine.f){if(e.type==='checkbox'||e.type==='radio')e.checked=v;else if(e.tagName==='SELECT')e.selectedIndex=v;else e.value=v;}
   for(const [e,on] of pristine.t)e.classList.toggle('on',on);}
  document.querySelectorAll('#tabNouveau .extraCheck').forEach(c=>{c.checked=false;});
  try{jmResetFormulaireIntervention();}catch(e){console.error('[JM reset]',e);}
  for(const f of [()=>jmDeposeMode('surplace'),()=>setMateriel('longerons'),()=>updateExtrasSummary(),()=>updateAdvancedSummary(),()=>majBarreActionsContextuelle()]){try{f();}catch(_){}}
  try{if(typeof RV_CTX!=='undefined'){RV_CTX.form.longueDistance=false;RV_CTX.form.ldChoixFait=false;}}catch(_){}
  try{await effacerBrouillon();}catch(_){}
  document.body.classList.remove('jm-calculation-result');$('jmCalculationResult')?.remove();
  if(!silencieux&&typeof showToast==='function')showToast('Nouvelle intervention : formulaire vidé');
 };
 function demanderNouvelle(){
  return new Promise(resolve=>{$('jmNouvelleChoix')?.remove();
   const bg=document.createElement('div');bg.id='jmNouvelleChoix';bg.className='modal-bg show';bg.setAttribute('role','dialog');bg.setAttribute('aria-modal','true');
   const panel=document.createElement('div');panel.className='modal';const h=document.createElement('h2');h.textContent='Une saisie est en cours';
   const p=document.createElement('p');p.textContent='Commencer une nouvelle intervention vide, ou reprendre ce qui est déjà rempli ?';
   const done=v=>{bg.remove();resolve(v);};
   const neuf=document.createElement('button');neuf.type='button';neuf.className='primary';neuf.textContent='🧹 Nouvelle intervention (tout vider)';neuf.onclick=()=>done(true);
   const garder=document.createElement('button');garder.type='button';garder.className='ghost';garder.textContent='Reprendre la saisie en cours';garder.onclick=()=>done(false);
   [neuf,garder].forEach(b=>{b.style.width='100%';b.style.minHeight='50px';b.style.marginTop='10px';});
   panel.append(h,p,neuf,garder);bg.append(panel);document.body.append(bg);neuf.focus();});
 }
 // Bouton central « Nouvelle intervention » : proposer de vider si une ancienne saisie traîne.
 document.addEventListener('click',async ev=>{
  const fab=ev.target?.closest?.('.tab-fab');if(!fab)return;
  if(typeof editingKey!=='undefined'&&editingKey)return;
  if(typeof currentTab!=='undefined'&&currentTab==='tabNouveau'&&!formDirty())return;
  if(!formDirty())return;
  ev.preventDefault();ev.stopImmediatePropagation();
  const neuf=await demanderNouvelle();
  if(neuf)await jmNouvelleInterventionVierge();
  showTab('tabNouveau');
 },true);
 // Annuler une modification, partir d'un service ou d'un devis : formulaire vidé d'abord.
 if(typeof annulerEdition==='function'){const _ae=annulerEdition;annulerEdition=function(){const r=_ae.apply(this,arguments);jmNouvelleInterventionVierge(true);return r;};}
 if(typeof window.jmSvcNouvelle==='function'){const _sn=window.jmSvcNouvelle;window.jmSvcNouvelle=async function(){if(typeof editingKey!=='undefined'&&editingKey&&!confirm('Une intervention est en cours de modification.\nL\'abandonner pour préparer une nouvelle intervention ?'))return;await jmNouvelleInterventionVierge(true);return _sn.apply(this,arguments);};}
 if(typeof devisVersIntervention==='function'){const _dv=devisVersIntervention;devisVersIntervention=async function(){if(typeof editingKey!=='undefined'&&editingKey&&!confirm('Une intervention est en cours de modification.\nL\'abandonner pour reprendre ce devis ?'))return;const v=typeof lireParamsDevis==='function'?lireParamsDevis():null;await jmNouvelleInterventionVierge(true);if(v&&typeof lireParamsDevis==='function'){const _l=lireParamsDevis;lireParamsDevis=()=>v;try{return await _dv.apply(this,arguments);}finally{lireParamsDevis=_l;}}return _dv.apply(this,arguments);};}
 // Bouton visible en haut du formulaire.
 (()=>{const tab=$('tabNouveau');if(!tab||$('jmBtnVierge'))return;const b=document.createElement('button');b.type='button';b.id='jmBtnVierge';b.className='ghost';b.textContent='🧹 Nouvelle intervention vierge';b.style.cssText='width:100%;min-height:46px;margin:6px 0 12px';
  b.onclick=async()=>{if(formDirty()&&!confirm('Vider tout le formulaire (adresses, options, garages, frais…) ?'))return;await jmNouvelleInterventionVierge();window.scrollTo({top:0,behavior:'smooth'});};
  const prog=$('jmProgression');(prog&&prog.parentNode===tab)?prog.after(b):tab.prepend(b);})();
 // Present the existing calculation; never alter its input or tariff result.
 const calculateWithReturn=calculerAvecRetour;
 calculerAvecRetour=async function(){
  document.body.classList.remove('jm-calculation-result');
  try{
   const warnings=calculationWarnings();
   if(warnings.length && !await confirmCalculation(warnings))return;
   const result=await calculateWithReturn.apply(this,arguments);
   const ticket=$('ticket'),total=$('tkTotal');
   if(ticket?.classList.contains('show') && total && typeof lastCalc!=='undefined' && Number.isFinite(Number(lastCalc?.total))){
    document.body.classList.add('jm-calculation-result');
    setTimeout(()=>total.scrollIntoView({behavior:'smooth',block:'center'}),100);
    showToast('Montant calculé : '+total.textContent);
    showCalculatedAmount(total);
   } else showCalculationFailure();
   return result;
  }catch(error){
   console.error('[JM calcul]',error);
   showToast('Calcul non terminé : '+(error?.message||'réessaie après avoir vérifié les champs'));
   showCalculationFailure('Erreur : '+(error?.message||error));
   throw error;
  }
 };
 document.addEventListener('input',()=>document.body.classList.remove('jm-calculation-result'));
 document.addEventListener('change',()=>document.body.classList.remove('jm-calculation-result'));
 // Disable the legacy label-based regrouping before DOMContentLoaded.
 const sourceMenu=document.querySelector('#modalMenuBg .menu-grid');if(sourceMenu)sourceMenu.dataset.jmRange='1';
 let terrainKey=null, terrainBusy=false, previousFocus=null;
 const style=document.createElement('style');
 style.textContent=`
 #jmCalculationResult{z-index:13550!important;align-items:center!important;padding:20px!important;box-sizing:border-box}#jmCalculationResult .modal{max-height:85dvh;box-sizing:border-box}#jmCalculationResult .jm-calculation-amount{font-size:42px;font-weight:800;color:var(--orange);margin:18px 0}#jmCalculationResult button{width:100%;min-height:50px}
 #jmCalculationCheck{z-index:13550!important;align-items:center!important;box-sizing:border-box;padding:20px!important}
 #jmCalculationCheck .modal{max-height:85dvh;box-sizing:border-box}#jmCalculationCheck li{margin:12px 0;line-height:1.5}#jmCalculationCheck button{width:100%;margin-top:12px;min-height:48px}
 body.jm-calculation-result #barreActionsContextuelle{display:none!important}
 #modalRetourLDBg{z-index:13500!important;padding:12px 12px calc(12px + env(safe-area-inset-bottom))!important;align-items:center!important;box-sizing:border-box}
 #modalRetourLDBg .modal{max-height:calc(100dvh - 48px - env(safe-area-inset-top) - env(safe-area-inset-bottom));box-sizing:border-box}
 #tkTotal{scroll-margin-top:110px;scroll-margin-bottom:110px}
 #modalMenuBg .modal{max-width:720px;padding:24px 20px;background:var(--panel)}
 #modalMenuBg .menu-grid{display:block!important}
 .jm-nav-intro{color:var(--grey);font-size:14px;line-height:1.5;margin:8px 0 18px}
 .jm-nav-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:10px 0 22px}
 .jm-nav-card{position:relative;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:flex-start!important;grid-column:auto!important;gap:8px;min-height:108px;width:100%;padding:16px!important;border:1px solid var(--line)!important;border-radius:16px!important;background:var(--ink)!important;color:var(--white)!important;text-align:left!important;white-space:normal;font:inherit;cursor:pointer;box-sizing:border-box;line-height:1.35}
 .jm-nav-card .menu-ico{font-size:26px;width:auto;height:auto;flex:none}.jm-nav-card .menu-ico svg{width:25px;height:25px}
 .jm-nav-card .menu-lbl{font-size:16px;font-weight:750;display:block;flex:none}.jm-nav-card .menu-desc{font-size:12.5px;line-height:1.5;color:var(--grey);display:block;flex:none}
 .jm-nav-card:hover{border-color:var(--orange)!important}.jm-nav-card:focus-visible,.jm-nav-tab:focus-visible{outline:3px solid var(--orange);outline-offset:3px}
 .jm-nav-card:disabled{opacity:.45;cursor:default}.jm-nav-featured{border-color:var(--orange)!important;background:linear-gradient(140deg,rgba(232,115,12,.18),var(--ink))!important}
 .jm-nav-section{font-size:17px;color:var(--white);font-weight:750;margin:22px 0 6px;padding-left:10px;border-left:4px solid var(--orange)}
 .jm-nav-count{position:absolute;right:10px;top:10px;border-radius:20px;padding:3px 8px;background:var(--orange);color:#151b20;font-size:12px;font-weight:800}
 #tabbar{z-index:13000;display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:0;padding-bottom:env(safe-area-inset-bottom)}
 #tabbar .tab-btn{width:100%;min-width:0;min-height:58px;padding:7px 2px;font:inherit;background:transparent;border:0;color:var(--grey);cursor:pointer;box-sizing:border-box}
 #tabbar .tab-btn.active{color:var(--orange)}#tabbar .tab-lbl{font-size:11px;white-space:normal}#tabbar .jm-nav-terrain{color:var(--orange);background:rgba(232,115,12,.1);border-radius:14px}#tabbar .tab-ico{font-size:22px}
 #jmTerrainBg .modal{max-width:640px}#jmTerrainTitle{font-size:26px}#jmTerrainReference{font-size:18px;line-height:1.45;font-weight:700;overflow-wrap:anywhere}
 #jmOcrSuggestions label{display:flex;align-items:center;gap:12px;min-height:50px;padding:10px;margin:6px 0;border:1px solid var(--line);border-radius:12px;font-size:16px;line-height:1.4;font-family:inherit;text-transform:none;letter-spacing:normal;cursor:pointer}#jmOcrSuggestions input{width:24px;height:24px;flex:none}#jmTerrainSelect{min-height:50px;font-size:16px;width:100%}.jm-terrain-links{display:flex;flex-wrap:wrap;gap:10px}.jm-terrain-links a{padding:14px 20px;border:1px solid var(--line);border-radius:12px;color:var(--white);text-decoration:none;min-height:44px;box-sizing:border-box}
 #jmTerrainExtra textarea{min-height:120px;width:100%;box-sizing:border-box}.jm-terrain-note{font-size:13px;line-height:1.5;color:var(--grey)}
 @media(min-width:620px){#modalMenuBg .jm-nav-quick{grid-template-columns:repeat(3,minmax(0,1fr))}}
 @media(max-width:360px){.jm-nav-card{padding:12px!important}.jm-nav-card .menu-lbl{font-size:14px}.jm-nav-card .menu-desc{font-size:12px}}
 @media(prefers-reduced-motion:reduce){.jm-nav-card{transition:none!important}}
 #lockScreen,#splash{z-index:14000!important}.services-modal,.jm-service-picker-bg{padding-bottom:calc(95px + env(safe-area-inset-bottom))!important}
 #tabbar .jm-nav-new{background:var(--orange);color:#121c23!important;border-radius:18px;margin-top:-10px;min-height:68px;box-shadow:0 3px 14px #0004;font-weight:800}#tabbar .tab-ico svg{width:24px;height:24px}
 #jmNewTab .tab-lbl,#jmNewTab .tab-ico{color:#121c23!important}#jmNewTab .tab-lbl{font-size:10px!important;line-height:1.2}#jmHomeNew{display:flex;gap:14px;align-items:center;min-height:68px;margin:0 0 14px;padding:18px;background:var(--orange);color:#121c23;border-radius:18px}#jmHomeNew .gb-txt{font-size:20px;font-weight:800}#jmHomeNew .gb-ico{color:inherit}
 .modal-bg{padding-bottom:calc(90px + env(safe-area-inset-bottom))!important}#modalMenuBg .jm-nav-card .menu-ico svg{width:24px;height:24px}#modalMenuBg .jm-nav-card .menu-lbl,#modalMenuBg .jm-nav-card .menu-desc{align-self:flex-start!important}
 `; document.head.append(style);
 const icons={"plus": "<path d=\"M12 5v14M5 12h14\"/>", "home": "<path d=\"m3 10 9-7 9 7v10H3zM9 20v-7h6v7\"/>", "history": "<path d=\"M3 11a9 9 0 1 1 3 7M3 4v7h7M12 7v5l3 2\"/>", "truck": "<path d=\"M3 5h11v12H3zM14 10h4l3 4v3h-7\"/><circle cx=\"6\" cy=\"18\" r=\"2\"/><circle cx=\"18\" cy=\"18\" r=\"2\"/>", "menu": "<path d=\"M4 6h16M4 12h16M4 18h16\"/>", "wrench": "<path d=\"M15 7.5a3.5 3.5 0 1 0-4.6 3.3L4 17.2V20h2.8l6.4-6.4A3.5 3.5 0 0 0 15 7.5z\"/>", "money": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M15 9.5a3.5 3.5 0 1 0 0 5M9 12h4\"/>", "document": "<path d=\"M5 3h10l4 4v14H5zM14 3v5h5M8 12h8M8 16h8\"/>", "fuel": "<path d=\"M4 21V4h9v17M3 21h11M6 7h5M13 11h3v6a2 2 0 0 0 4 0V8l-3-3\"/>", "box": "<path d=\"m3 7 9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10\"/>", "save": "<path d=\"M3 3h16l2 2v16H3zM7 3v6h10V3M7 21v-7h10v7\"/>", "pin": "<path d=\"M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0z\"/><circle cx=\"12\" cy=\"10\" r=\"2\"/>", "phone": "<path d=\"m4 3 4 1 1 4-2 2a15 15 0 0 0 7 7l2-2 4 1 1 4c-8 3-20-9-17-17z\"/>", "message": "<path d=\"M3 4h18v13H8l-5 4zM7 8h10M7 12h7\"/>", "camera": "<path d=\"M3 7h4l2-3h6l2 3h4v14H3z\"/><circle cx=\"12\" cy=\"13\" r=\"4\"/>", "play": "<path d=\"m8 4 12 8-12 8z\"/>", "check": "<path d=\"m4 12 5 5L20 6\"/>", "flag": "<path d=\"M5 21V3h14l-3 5 3 5H5\"/>", "game": "<path d=\"M7 7h10c4 0 6 14 2 14l-4-4H9l-4 4c-4 0-2-14 2-14zM6 11h6M9 8v6M16 11h.01M18 14h.01\"/>", "more": "<circle cx=\"5\" cy=\"12\" r=\"1\"/><circle cx=\"12\" cy=\"12\" r=\"1\"/><circle cx=\"19\" cy=\"12\" r=\"1\"/>", "share": "<path d=\"M12 16V3m-5 5 5-5 5 5M5 13v8h14v-8\"/>", "video": "<rect x=\"3\" y=\"5\" width=\"12\" height=\"14\" rx=\"2\"/><path d=\"m15 10 6-4v12l-6-4\"/>"};
 function svg(key){return '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[key]||icons.document)+'</svg>';}
 function button(label,icon,desc,fn,parent,id){const b=document.createElement('button');b.type='button';b.className='jm-nav-card';if(id)b.dataset.menuId=id;const i=document.createElement('span');i.className='menu-ico';i.innerHTML=svg(icon);const t=document.createElement('span');t.className='menu-lbl';t.textContent=label;const d=document.createElement('span');d.className='menu-desc';d.textContent=desc;b.append(i,t,d);b.onclick=fn;if(parent)parent.append(b);return b;}
 function section(title,root,quick=false){const h=document.createElement('h2');h.className='jm-nav-section';h.textContent=title;root.append(h);const g=document.createElement('div');g.className='jm-nav-grid'+(quick?' jm-nav-quick':'');root.append(g);return g;}
 function closeTerrain(){ $('jmTerrainBg').classList.remove('show');$('jmTerrainTab').setAttribute('aria-expanded','false');previousFocus?.focus(); }
 window.jmTerrainFermer=closeTerrain;
 function closeThen(fn){return ()=>{closeMenu();return fn();};}
 let quickPending,quickUnpaid;
 async function badges(){try{const all=await toutesLesInterventions();for(const [b,n] of [[quickPending,all.filter(it=>estAFaire(it.data)).length],[quickUnpaid,all.filter(it=>statutPaiement(it.data)!=='paye').length]]){b.querySelector('.jm-nav-count')?.remove();if(n){const s=document.createElement('span');s.className='jm-nav-count';s.textContent=n;b.append(s);}}}catch(_){} }
 function buildMenu(){
  const modal=$('modalMenuBg'),root=modal.querySelector('.menu-grid'),old=[...root.querySelectorAll('.menu-item')];
  modal.querySelector('.page-title').textContent='Accès rapide';const intro=document.createElement('p');intro.className='jm-nav-intro';intro.textContent='Les actions du quotidien, puis les outils de gestion.';root.before(intro);
  const mapped=new Map();for(const el of old){const name=el.dataset.menuId;if(!name){console.warn('[JM Menu] data-menu-id absent',el);continue;}const b=document.createElement('button');b.type='button';b.className='menu-item jm-nav-card';b.dataset.menuId=name;b.onclick=el.onclick;while(el.firstChild)b.append(el.firstChild);mapped.set(name,b);b.querySelectorAll('svg').forEach(i=>{i.setAttribute('stroke-width','2');i.setAttribute('width','24');i.setAttribute('height','24');});}
  for(const id of ['rdv','rachat','publicite','recettes','a-traiter','assistant','estimation','telephone','passee','gestion','depot','paiement','avis','clients','trajets','recherche','bdc','resume','plein','whatsapp','frais','dashboard','reglages'])if(!mapped.has(id))console.warn('[JM Menu] Élément attendu absent : '+id);root.replaceChildren();const q=section('Au quotidien',root,true);
  button('Nouvelle intervention','plus','Créer et calculer une mission',closeThen(()=>showTab('tabNouveau')),q,'nouvelle').classList.add('jm-nav-featured');
  quickPending=button('En cours / à faire','wrench','Retrouver les missions à poursuivre',closeThen(()=>openFeuilleDeRoute()),q,'en-cours');
  const move=(name,parent,newName)=>{const b=mapped.get(name);if(!b){console.warn('[JM Menu] Élément attendu absent : '+name);return;}if(newName)b.querySelector('.menu-lbl').textContent=newName;const fn=b.onclick;b.onclick=()=>{closeMenu();fn?.call(b);};parent.append(b);mapped.delete(name);};
  move('rdv',q);quickUnpaid=button('Impayés','money','Consulter les paiements en attente',closeThen(()=>ouvrirImpayes()),q,'impayes');move('clients',q);move('passee',q,'Encoder une intervention passée');
  const docs=section('Documents & paiements',root);button('Historique & factures','document','Bons, factures et exports',closeThen(()=>showTab('tabHistorique')),docs,'historique');button('Devis','document','Préparer une estimation',closeThen(()=>openQuickQuote()),docs,'devis');['paiement','bdc','avis'].forEach(n=>move(n,docs));
  const compta=section('Comptabilité & gestion',root);button('Tickets carburant','fuel','Joindre les scans et exporter les frais',closeThen(()=>jmFuelOpen()),compta,'tickets');button('Dossier trimestriel','box','Factures, frais et justificatifs',closeThen(()=>jmComptaOuvrir()),compta,'comptabilite');['gestion','frais','plein'].forEach(n=>move(n,compta));
  const terrain=section('Véhicules & terrain',root);button('Actions terrain','truck','GPS, client, photos et étapes',closeThen(()=>jmTerrainOuvrir()),terrain,'terrain');['trajets','rachat','depot','estimation'].forEach(n=>move(n,terrain));
  const clients=section('Demandes & suivi',root);['a-traiter','recherche','assistant','whatsapp'].forEach(n=>move(n,clients));
  const settings=section('Réglages & sauvegarde',root);['reglages','telephone'].forEach(n=>move(n,settings));button('Sauvegarder mes données','save','Données, tickets, photos et vidéos',closeThen(()=>exporterSauvegarde()),settings,'sauvegarde');
  // Les écrans secondaires restent accessibles par Gestion, sans doublons.
  ['dashboard','resume','recettes','publicite'].forEach(n=>mapped.delete(n));
  if(mapped.size){const extra=section('Autres outils',root);for(const b of mapped.values())extra.append(b);}
  const box=modal.querySelector('.modal');box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','Accès rapide');
  const oldOpen=openMenu;openMenu=function(){if(!closeOverlays())return;oldOpen();modal.scrollTop=0;badges();q.querySelector('button')?.focus();};
 }
 function navButton(text,icon,fn){const b=document.createElement('button');b.type='button';b.className='tab-btn jm-nav-tab';const i=document.createElement('span');i.className='tab-ico';i.innerHTML=svg(icon);const l=document.createElement('span');l.className='tab-lbl';l.textContent=text;b.append(i,l);b.onclick=fn;return b;}
 function closeOverlays(){
  if($('lockScreen')&&getComputedStyle($('lockScreen')).display!=='none')return false;
  if($('modalInvoiceBg')?.classList.contains('show')&&typeof closeInvoice==='function')closeInvoice();
  if($('modalNoteCreditBg')?.classList.contains('show')&&typeof closeNoteCredit==='function')closeNoteCredit();
  if($('jmLivraisonBg')?.classList.contains('show')&&typeof jmLivraisonFermer==='function')jmLivraisonFermer();
  if(typeof jmCloseServicePicker==='function')jmCloseServicePicker();
  closeMenu();if($('jmTerrainBg')?.classList.contains('show'))closeTerrain();
  document.querySelectorAll('.photo-lightbox').forEach(e=>e.remove());
  document.querySelectorAll('.modal-bg.show').forEach(e=>e.classList.remove('show'));
  if(typeof fermerPresentationServices==='function')fermerPresentationServices();document.body.style.overflow='';
  return true;
 }
 function navigate(tab){if(closeOverlays())showTab(tab);}
 async function newIntervention(){if(!(typeof editingKey!=='undefined'&&editingKey)&&formDirty()&&await demanderNouvelle())await jmNouvelleInterventionVierge();navigate('tabNouveau');}
 function buildTabs(){const bar=$('tabbar');const home=navButton('Accueil','home',()=>navigate('tabAccueil'));home.dataset.tab='tabAccueil';home.classList.add('active');const history=navButton('Historique','history',()=>navigate('tabHistorique'));history.dataset.tab='tabHistorique';
  const add=navButton('Nouvelle intervention','plus',newIntervention);add.id='jmNewTab';add.dataset.tab='tabNouveau';add.classList.add('jm-nav-new');
  const terrain=navButton('Terrain','truck',()=>jmTerrainOuvrir());terrain.id='jmTerrainTab';terrain.setAttribute('aria-haspopup','dialog');terrain.setAttribute('aria-expanded','false');
  bar.replaceChildren(home,history,add,terrain,navButton('Menu','menu',()=>openMenu()));
  const card=document.querySelector('#tabAccueil .gros-bouton.principal');if(card){card.id='jmHomeNew';card.setAttribute('role','button');card.tabIndex=0;card.onclick=newIntervention;card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();newIntervention();}};card.querySelector('.gb-ico').innerHTML=svg('plus');$('tabAccueil').prepend(card);}
 }
 function buildTerrain(){const bg=document.createElement('div');bg.className='modal-bg';bg.id='jmTerrainBg';bg.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="jmTerrainTitle"><h1 id="jmTerrainTitle">Actions terrain</h1><p class="jm-terrain-note">À utiliser lorsque tu es à l’arrêt. Vérifie le dossier avant chaque action.</p><label for="jmTerrainSelect">Intervention concernée</label><select id="jmTerrainSelect"></select><p id="jmTerrainReference"></p><p id="jmTerrainStatus" role="status"></p><div class="jm-nav-grid" id="jmTerrainActions"></div><div id="jmTerrainExtra"></div><button class="ghost" id="jmTerrainClose">Fermer</button></div>`;document.body.append(bg);bg.addEventListener('click',e=>{if(e.target===bg)closeTerrain();});$('jmTerrainClose').onclick=closeTerrain;
  $('jmTerrainSelect').onchange=async()=>{terrainKey=$('jmTerrainSelect').value||null;$('jmTerrainExtra').replaceChildren();await renderTerrain();};
  const a=$('jmTerrainActions');button('Navigation','pin','Prise en charge ou dépose',()=>run('gps'),a);button('Appeler le client','phone','Ouvrir le téléphone',()=>run('call'),a);button('Message client','message','Préparer un message',()=>run('message'),a);button('Photos / vidéos','camera','Avant, plateau, livraison',()=>run('photos'),a);button('Départ','play','Enregistrer l’heure',()=>run('depart'),a);button('Arrivé sur place','pin','Enregistrer l’heure',()=>run('arrivee'),a);button('Véhicule chargé','truck','Enregistrer l’heure',()=>run('chargement'),a);button('Livraison','flag','Lieu, heure et signature',()=>run('livraison'),a);button('Terminer','check','Vérifier puis clôturer la mission',()=>run('finish'),a);button('Défi JM','game','QR et réponses du client',()=>run('game'),a);button('Plus d’actions','more','Ouvrir les options de la mission',()=>run('more'),a);
 }
 async function record(){if(!terrainKey)throw Error('Choisis une intervention enregistrée.');return JSON.parse((await window.storage.get(terrainKey)).value);}
 async function renderTerrain(){const status=$('jmTerrainStatus');try{const d=await record();$('jmTerrainReference').textContent=(d.numero||'Intervention')+' — '+(d.plaque||'Plaque non renseignée');status.textContent=[d.clientNom,d.from,d.to?'→ '+d.to:'',estAFaire(d)?'À poursuivre':'Terminée'].filter(Boolean).join(' · ');for(const b of $('jmTerrainActions').querySelectorAll('button'))b.disabled=false;}catch(e){$('jmTerrainReference').textContent=terrainKey?'Dossier indisponible':'Aucune intervention sélectionnée';const empty=!terrainKey&&$('jmTerrainSelect').options.length<=1;status.textContent=terrainKey?'Impossible de lire ce dossier. Ferme puis rouvre Terrain ; aucune donnée n’a été supprimée.':empty?'Aucune mission à faire enregistrée. Les interventions terminées restent dans Historique.':'Choisis une mission à faire dans la liste.';for(const b of $('jmTerrainActions').querySelectorAll('button'))b.disabled=true;if(empty){const extra=$('jmTerrainExtra');extra.replaceChildren();button('Nouvelle intervention','plus','Créer puis enregistrer une mission',newIntervention,extra);button('Voir l’historique','history','Retrouver les interventions terminées',()=>navigate('tabHistorique'),extra);}}}
 window.jmTerrainOuvrir=async function(){try{if(!closeOverlays())return;previousFocus=document.activeElement;let all=await toutesLesInterventions();const editing=typeof editingKey!=='undefined'&&currentTab==='tabNouveau'?editingKey:null;terrainKey=editing||(typeof DISPATCH_ACTIVE_KEY!=='undefined'?DISPATCH_ACTIVE_KEY:null);const pending=all.filter(it=>estAFaire(it.data));if(!terrainKey&&pending.length===1)terrainKey=pending[0].key;const choices=all.filter(it=>estAFaire(it.data)||it.key===terrainKey);if(!choices.some(it=>it.key===terrainKey))terrainKey=null;
  $('jmTerrainSelect').replaceChildren(new Option('Choisir une intervention…',''));choices.forEach(it=>$('jmTerrainSelect').append(new Option((it.data.numero||'Bon')+' — '+(it.data.plaque||it.data.clientNom||'Véhicule'),it.key)));$('jmTerrainSelect').value=terrainKey||'';$('jmTerrainExtra').replaceChildren();await renderTerrain();$('jmTerrainBg').classList.add('show');$('jmTerrainBg').scrollTop=0;$('jmTerrainTab').setAttribute('aria-expanded','true');$('jmTerrainSelect').focus();}catch(_){showToast('Impossible de lire les interventions.');}};
 function info(text){$('jmTerrainStatus').textContent=text;}
 function link(text,href,parent){const a=document.createElement('a');a.textContent=text;a.href=href;parent.append(a);return a;}
 async function run(action){if(terrainBusy)return;terrainBusy=true;try{const key=terrainKey,d=await record(),extra=$('jmTerrainExtra');extra.replaceChildren();
  if(['depart','arrivee','chargement'].includes(action)){
   if(!estAFaire(d))throw Error('Cette intervention est déjà terminée.');
   const now=new Date(),value=now.toLocaleTimeString('fr-BE',{hour:'2-digit',minute:'2-digit',hour12:false});
   if(d.horaires?.[action]&&!confirm('Cette étape a déjà une heure ('+d.horaires[action]+'). La remplacer par '+value+' ?'))return;
   const latest=await record();latest.horaires={...(latest.horaires||{}),[action]:value};await window.storage.set(key,JSON.stringify(latest));await dispatchSaveActive(key);if(typeof editingKey!=='undefined'&&editingKey===key){ecrireHoraires(latest.horaires);if(lastCalc)lastCalc.horaires=latest.horaires;}info('✓ Heure enregistrée : '+value);return;
  }
  if(action==='gps'){const group=document.createElement('div');group.className='jm-terrain-links';extra.append(group);for(const [label,address] of [['Prise en charge',d.from],['Dépose',jmLivraisonDestination(d)]])if(address&&address!=='—'){const p=document.createElement('p');p.textContent=label+' : '+address;extra.append(p);const g=document.createElement('div');g.className='jm-terrain-links';extra.append(g);for(const [name,app] of [['Plans','plans'],['Maps','gmaps'],['Waze','waze']]){const b=document.createElement('button');b.className='ghost';b.textContent=name;b.onclick=()=>ouvrirNavigation(app,address);g.append(b);}}return;}
  const phone=String(d.telClient||d.clientTel||d.factures?.at(-1)?.meta?.clientPhone||'').replace(/[^+0-9]/g,'');
  if(action==='call'){if(!phone)throw Error('Aucun numéro client dans ce dossier.');location.href='tel:'+phone;return;}
  if(action==='message'){const p=document.createElement('p');p.textContent='Message à vérifier avant envoi';const text=document.createElement('textarea');text.setAttribute('aria-label','Message au client');text.value='Bonjour, JM Express Auto Dépannage. Je vous contacte pour votre intervention'+(d.plaque?' concernant '+d.plaque:'')+'.';const g=document.createElement('div');g.className='jm-terrain-links';extra.append(p,text,g);if(!phone){info('Aucun numéro client renseigné. Tu peux copier ce message.');return;}const sms=link('Ouvrir SMS','#',g),wa=link('Ouvrir WhatsApp','#',g);const update=()=>{sms.href='sms:'+phone+'&body='+encodeURIComponent(text.value);let n=phone.replace(/\D/g,'');if(n.startsWith('00'))n=n.slice(2);else if(n.startsWith('0'))n='32'+n.slice(1);wa.href='https://wa.me/'+n+'?text='+encodeURIComponent(text.value);};text.addEventListener('input',update);update();return;}
  if(action==='photos'){button('Ajouter / consulter les photos','camera','Compléter le bon enregistré',()=>{closeTerrain();jmBonOuvrir(key);},extra);button('Partager les preuves','share','Photos et vidéos déjà enregistrées',()=>jmPreuvesPartager(key),extra);for(const [stage,title] of [['plateau','Sur le plateau'],['livraison','Après livraison']]){const input=document.createElement('input');input.type='file';input.accept='video/*';input.hidden=true;extra.append(input);button('Vidéo — '+title,'video','Court extrait de moins de 20 Mo',()=>input.click(),extra);input.onchange=async()=>{const f=input.files?.[0];if(!f)return;try{if(f.size>20*1024*1024||!f.type.startsWith('video/'))throw Error('Choisis une vidéo de moins de 20 Mo.');const id='video-'+crypto.randomUUID();await jmVideosOperation('put',id,f);const latest=JSON.parse((await window.storage.get(key)).value);latest.videosVehicule={...(latest.videosVehicule||{}),[stage]:{id,nom:f.name,type:f.type,taille:f.size,date:new Date().toISOString()}};await window.storage.set(key,JSON.stringify(latest));if(typeof editingKey!=='undefined'&&editingKey===key){JM_VIDEOS_VEHICULE=latest.videosVehicule;jmPreuvesRendre();}showToast('Vidéo enregistrée sur ce téléphone');}catch(e){showToast(e.message||'Vidéo non enregistrée');}finally{input.value='';}};}return;}
  if(action==='livraison'){closeTerrain();return jmLivraisonOuvrir(key);}
  if(action==='game'){closeTerrain();return jmDefiOuvrir(key);}
  if(action==='finish'){if(!estAFaire(d))throw Error('Cette intervention est déjà terminée.');const p=document.createElement('p');p.textContent='Clôturer '+(d.numero||'cette mission')+' — '+(d.plaque||'véhicule')+' ? Photos après livraison : '+(d.dechargPhotos?.length||0)+'. Paiement : '+statutPaiement(d)+'. La clôture ne marque pas le client comme payé.';extra.append(p);button('Confirmer la fin','check','Clôturer uniquement ce dossier',async()=>{const latest=JSON.parse((await window.storage.get(key)).value);if(!estAFaire(latest)){info('Déjà terminée');return;}await dispatchSaveActive(key);await dispatchTerminerEtSuivante(key);await renderTerrain();extra.replaceChildren();},extra);return;}
  if(action==='more'){if(typeof editingKey!=='undefined'&&editingKey!==key&&currentTab==='tabNouveau'&&(lastCalc||$('addrFrom').value||$('plaqueImmat').value)){if(!confirm('Un autre formulaire est ouvert. Ouvrir le dossier sélectionné dans le formulaire ?'))return;}closeTerrain();if(editingKey!==key)await chargerInterventionDepuisJournal(key);else showTab('tabNouveau');ouvrirPlusTerrain();}
 }catch(e){info(e.message||'Action indisponible');}finally{terrainBusy=false;}}
 const saveDelivery=jmLivraisonEnregistrer;jmLivraisonEnregistrer=async function(){const ctx=typeof JM_LIVRAISON_CTX!=='undefined'?JM_LIVRAISON_CTX:null;const key=ctx?.key;const before=key?(await window.storage.get(key)).value:null;const result=await saveDelivery.apply(this,arguments);if(key){const after=(await window.storage.get(key)).value;if(after!==before&&JSON.parse(after).remisePro?.recuPar)await dispatchSaveActive(key);}return result;};
 function init(){buildMenu();buildTabs();buildTerrain();document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='🎮 Défi JM — proposer / retrouver une partie')b.remove();});document.querySelectorAll('.gb-txt').forEach(e=>{if(e.textContent==='Passée')e.textContent='Intervention passée';});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('jmTerrainBg').classList.contains('show'))closeTerrain();});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
