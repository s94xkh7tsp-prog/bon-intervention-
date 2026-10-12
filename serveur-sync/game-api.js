import {GAME_QUESTIONS} from './game-questions.js';
const catalog = new Map(GAME_QUESTIONS.map(q=>[q.id,q]));
const response=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}});
function pick(phase,n){const a=GAME_QUESTIONS.filter(q=>q.phase===phase);const out=[];while(out.length<n){const v=new Uint32Array(1);crypto.getRandomValues(v);out.push(a.splice(v[0]%a.length,1)[0].id);}return out;}
function publicState(s){return {session_id:s.id,expires_at:s.expires_at,unlocked:s.unlocked,answers:s.answers.map(a=>({questionNum:a.num,answerIndex:a.index,skipped:a.skipped})),total_points:s.answers.reduce((n,a)=>n+a.points,0),questions:s.questions.slice(0,s.unlocked).map(id=>catalog.get(id)),completed:!!s.result,result:s.result||null,max_discount:s.max_discount};}
function fail(message,status=400){throw Object.assign(new Error(message),{status});}
export async function gameRoute(req,env,account,authenticate){
 const u=new URL(req.url), p=u.pathname;
 if(!p.startsWith('/api/game/'))return null;
 try{
  const action=p.slice('/api/game/'.length);const privateAction=['create','unlock','results'].includes(action);
  const dev=privateAction?await authenticate(req,env):null;
  if(privateAction&&!dev)fail('Téléphone non autorisé',401);
  if(!['create','session','answer','skip','unlock','complete','results'].includes(action))fail('Route inconnue',404);
  const isGet=['session','results'].includes(action);if(req.method!==(isGet?'GET':'POST'))fail('Méthode refusée',405);
  let b={};if(!isGet){if(Number(req.headers.get('Content-Length')||0)>8192)fail('Requête trop grande',413);const raw=await req.text();if(raw.length>8192)fail('Requête trop grande',413);try{b=JSON.parse(raw);}catch{fail('JSON invalide');}}
  if(action==='create'){
   const key=String(b.interventionKey||'').trim();if(!key||key.length>200)fail('Intervention manquante');
   const cap=Number(b.maxDiscount??0);if(!Number.isFinite(cap)||cap<0||cap>100)fail('Récompense invalide');
   // Une seule session active par intervention, même depuis le téléphone de secours.
   const old=await env.DB.prepare('SELECT data FROM jm_game_sessions WHERE account=? AND intervention_key=? AND expires>? ORDER BY expires DESC LIMIT 1').bind(account,key,Date.now()).first();
   if(old){const s=JSON.parse(old.data);return response({success:true,session:publicState(s)});}
   const bytes=crypto.getRandomValues(new Uint8Array(32));const id=Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
   const expires=Date.now()+86400000;
   const s={id,intervention_key:key,expires_at:new Date(expires).toISOString(),unlocked:3,questions:[...pick('route',3),...pick('delivery',2)],answers:[],max_discount:cap,result:null};
   const inserted=await env.DB.prepare('INSERT INTO jm_game_sessions(account,id,intervention_key,expires,revision,data) SELECT ?,?,?,?,0,? WHERE NOT EXISTS(SELECT 1 FROM jm_game_sessions WHERE account=? AND intervention_key=? AND expires>?)').bind(account,id,key,expires,JSON.stringify(s),account,key,Date.now()).run();
   if(inserted.meta?.changes!==1){const active=await env.DB.prepare('SELECT data FROM jm_game_sessions WHERE account=? AND intervention_key=? AND expires>? ORDER BY expires DESC LIMIT 1').bind(account,key,Date.now()).first();if(!active)fail('Réessaie la création de partie',409);return response({success:true,session:publicState(JSON.parse(active.data))});}
   // Suppression des anciennes sessions uniquement (30 jours). Aucun autre dossier n'est touché.
   await env.DB.prepare('DELETE FROM jm_game_sessions WHERE account=? AND expires<?').bind(account,Date.now()-30*86400000).run();
   return response({success:true,session:publicState(s)});
  }
  let row;
  if(action==='results'){
   const key=u.searchParams.get('interventionKey')||'';
   row=await env.DB.prepare('SELECT * FROM jm_game_sessions WHERE account=? AND intervention_key=? ORDER BY expires DESC LIMIT 1').bind(account,key).first();
  }else{
   const id=String(isGet?u.searchParams.get('s')||'':b.sessionId||'');if(!/^[a-f0-9]{64}$/.test(id))fail('Session invalide',404);
   row=await env.DB.prepare('SELECT * FROM jm_game_sessions WHERE account=? AND id=?').bind(account,id).first();
  }
  if(!row)fail('Aucune session trouvée',404);
  const s=JSON.parse(row.data);
  if(action==='results')return response({success:true,session:publicState(s),expired:row.expires<=Date.now()});
  if(row.expires<=Date.now())fail('Cette session a expiré',410);
  if(action==='session')return response({success:true,session:publicState(s)});
  if(action==='unlock'){
   if(b.interventionKey!==s.intervention_key)fail('Intervention différente',403);
   if(b.delivered!==true)fail('Confirme le déchargement avant de continuer');
   if(s.unlocked===5)return response({success:true,session:publicState(s)});
   s.unlocked=5;
  }else if(action==='answer'||action==='skip'){
   if(s.result)fail('Jeu déjà terminé',409);
   const num=b.questionNum;if(!Number.isInteger(num)||num<0||num>4)fail('Question invalide');
   if(num>=s.unlocked)fail('Attends la confirmation du déchargement',403);
   const q=catalog.get(s.questions[num]);const skipped=action==='skip';const index=skipped?null:b.answerIndex;
   if(!skipped&&(!Number.isInteger(index)||index<0||index>=q.answers.length))fail('Réponse invalide');
   const existing=s.answers.find(a=>a.num===num);
   if(existing){if(existing.index===index&&existing.skipped===skipped)return response({success:true,session:publicState(s)});fail('Réponse déjà enregistrée',409);}
   if(num!==s.answers.length)fail('Réponds aux questions dans l’ordre',409);
   // Points attribués côté serveur pour participer, pas pour donner un avis positif.
   s.answers.push({num,index,skipped,points:skipped?0:20});
  }else if(action==='complete'){
   if(s.result)return response({success:true,session:publicState(s)});
   if(s.unlocked!==5||s.answers.length!==5)fail('Les cinq questions doivent être terminées',409);
   const gender=['male','female','other'].includes(b.genderChoice)?b.genderChoice:null;
   const reward=['discount','dedication','none'].includes(b.rewardType)?b.rewardType:'none';
   const filmed=b.filmConsent===true;
   const platforms={};for(const name of ['tiktok','facebook','snapchat'])platforms[name]=filmed&&b.publicationConsent===true&&b.platforms?.[name]===true;
   const score=s.answers.reduce((n,a)=>n+a.points,0);
   s.result={score,feedback:String(b.feedback||'').slice(0,500),gender,reward_type:reward,discount_eur:reward==='discount'?Math.round(s.max_discount*score)/100:0,film_consent:filmed,publication_consent:Object.values(platforms).some(Boolean),platforms,completed_at:new Date().toISOString(),valid_until:new Date(Date.now()+90*86400000).toISOString()};
  }
  // Mise à jour conditionnelle atomique : retries/doubles clics ne doublent pas les points.
  const result=await env.DB.prepare('UPDATE jm_game_sessions SET data=?, revision=revision+1 WHERE account=? AND id=? AND revision=?').bind(JSON.stringify(s),account,s.id,row.revision).run();
  if(result.meta?.changes!==1)fail('Une réponse arrive en même temps. Actualise puis réessaie.',409);
  return response({success:true,session:publicState(s)});
 }catch(e){return response({success:false,error:e.status?e.message:'Jeu indisponible. Vérifie l’installation du serveur.'},e.status||503);}
}
