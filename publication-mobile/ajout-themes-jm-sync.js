
// DEFI JM — choix des thèmes (ajout à la fin, conserver tout ce qui précède).
(function(){
// Questions de participation : aucune bonne ou mauvaise réponse, aucun diagnostic.
const GAME_THEMES = {
  calm: '😮‍💨 Panne dehors, calme dedans',
  comedy: '😂 Ma voiture fait son cinéma',
  mind: '🧠 Mon cerveau en mode warning',
  jm: '🚛 Dans les coulisses de JM',
  mixed: '🎲 Surprends-moi !'
};
const bank = {
calm: {
route: [
['Quand la panne est arrivée, quelle inquiétude a pris le volant dans ta tête ?', 'Rester bloqué ici', 'La facture surprise', 'Mes projets chamboulés'],
['Qu’est-ce qui ferait baisser le volume du stress, même d’un cran ?', 'Savoir où on va', 'Comprendre les prochaines étapes', 'Un petit moment tranquille'],
['Le plus pénible dans cette pause non prévue, c’est…', 'Attendre sans savoir combien de temps', 'Prévenir tout le monde', 'Ne pas comprendre la panne'],
['Au téléphone, quelle phrase aurait été ton petit coussin anti-stress ?', 'Je t’explique la suite', 'On regarde les possibilités ensemble', 'Prends ton temps pour m’expliquer'],
['Ta jauge de sérénité préfère quel carburant aujourd’hui ?', 'Des infos claires', 'Un peu d’humour', 'Du calme, sans trop parler'],
['Si tu pouvais mettre une inquiétude sur pause pendant le trajet…', 'Le coût des réparations', 'L’organisation de ma journée', 'Le temps sans ma voiture'],
['Au moment de la panne, tu aurais surtout aimé…', 'Être accompagné', 'Avoir un plan concret', 'Avoir quelques minutes pour souffler'],
['Pour la suite, quelle petite information te serait la plus utile ?', 'Qui contacter au garage', 'Ce qui reste à organiser', 'Comment récupérer mon véhicule']
],
delivery: [
['Ta voiture est déposée. Ta tête a-t-elle trouvé une petite place de parking ?', 'Oui, je souffle un peu', 'Un peu, il reste la suite', 'Pas encore, et c’est OK'],
['Quel petit détail t’a aidé à traverser cette galère ?', 'Les explications', 'Le contact humain', 'Voir les choses avancer'],
['Maintenant, ce qui me ferait du bien, c’est…', 'Savoir à qui m’adresser', 'Un moment de calme', 'Reprendre mes projets doucement'],
['Pour clore ce chapitre, tu préfères…', 'Un récapitulatif clair', 'Une dernière question au garage', 'Dire merci et souffler']
]
},
comedy: {
route: [
['Ta voiture annonce sa pause. Quel message aurait-elle laissé ?', 'Congé moteur imprévu', 'Je prends le taxi aujourd’hui', 'Mise à jour : patience requise'],
['Cette aventure automobile mérite quel titre de film ?', 'Le moteur prend des vacances', 'Deux kilomètres, mille émotions', 'Retour vers le garage'],
['Si ta voiture avait un statut de messagerie…', 'Indisponible pour raisons mécaniques', 'En déplacement sur plateau', 'Merci de laisser un bidon après le bip'],
['Le voyant du tableau de bord joue quel rôle dans ton film ?', 'Le figurant qui insiste', 'Le suspense orange', 'Le réalisateur des imprévus'],
['Sur le plateau, ta voiture se prend pour…', 'Une star sur tapis roulant', 'Une passagère en première classe', 'Une princesse qui ne marche plus'],
['Pour raconter cette panne sans la revivre, tu choisis…', 'Un emoji qui soupire', 'Une comédie en trois actes', 'Une anecdote pour plus tard'],
['Ta voiture te doit quel petit geste symbolique ?', 'Une semaine sans voyant', 'Un démarrage du premier coup', 'Une lettre d’excuses du moteur'],
['Le slogan de ta journée, version sourire…', 'J’avais prévu autre chose', 'Même ma voiture réclame une pause', 'Le programme a changé de chauffeur']
],
delivery: [
['Le générique arrive : ta voiture est au garage. Tu mets quelle musique ?', 'Ouf, on est arrivés', 'À suivre au prochain épisode', 'Silence, le moteur se repose'],
['L’avis imaginaire de ta voiture sur son taxi plateau ?', 'Service porte-à-garage', 'Belle vue, zéro effort', 'Je préfère revenir en roulant'],
['Pour le prochain trajet, ta voiture promet…', 'De relire son contrat moteur', 'De prévenir avant sa pause', 'On attend la version du garage'],
['Cette galère devient quelle anecdote ?', 'Celle du taxi pour voiture', 'Celle du programme improvisé', 'Une histoire à raconter quand j’en aurai envie']
]
},
mind: {
route: [
['À la panne, ton cerveau a ouvert quel onglet en premier ?', 'Combien ça va coûter ?', 'Je vais être en retard !', 'Qui j’appelle maintenant ?'],
['La première notification dans ta tête disait…', 'Trouver une solution', 'Prévenir quelqu’un', 'Comprendre ce qui se passe'],
['Ton GPS intérieur recalculait surtout…', 'Mon budget', 'Mon emploi du temps', 'Mon plan pour rentrer'],
['Dans cette panne, ce qui m’a surpris le plus…', 'Elle est arrivée sans prévenir', 'Je ne savais pas quoi faire ensuite', 'Tout ce qu’il fallait réorganiser'],
['Si tes pensées avaient un bouton volume, aujourd’hui tu voudrais…', 'Baisser les scénarios sur le coût', 'Baisser les pensées sur le retard', 'Laisser juste une étape à la fois'],
['Ton cerveau préfère quel mode pendant ce trajet ?', 'Donne-moi les infos pratiques', 'Un peu de conversation légère', 'Mode silencieux, je récupère'],
['Quelle pensée tourne encore en arrière-plan ?', 'Quand ma voiture sera réparée', 'Comment je vais me déplacer', 'Ce que le garage va trouver'],
['Pour fermer un onglet mental, tu aimerais savoir…', 'Où le véhicule sera remis', 'Qui me donnera des nouvelles', 'Quelle est ma prochaine démarche']
],
delivery: [
['Après la dépose, ton cerveau affiche…', 'Une étape terminée', 'Encore quelques onglets ouverts', 'Besoin d’une petite pause'],
['Quelle pensée a un peu changé depuis le départ ?', 'Je sais mieux ce qui va suivre', 'Je me sens moins seul dans la galère', 'Pas vraiment, j’ai encore des questions'],
['Ton prochain onglet utile sera…', 'Contacter le garage', 'Organiser mes déplacements', 'Rentrer et me poser'],
['Pour la suite, tu préfères quel rythme ?', 'Une étape à la fois', 'Un petit plan d’ensemble', 'D’abord quelques minutes pour souffler']
]
},
jm: {
route: [
['Avant le chargement, qu’est-ce que tu voulais surtout comprendre ?', 'Comment le véhicule allait monter', 'Ce qui était inclus dans le service', 'Où il allait être déposé'],
['Quand JM t’explique la prise en charge, tu préfères…', 'Les grandes étapes', 'Un peu plus de détails', 'Je demande au fur et à mesure'],
['Les coulisses du remorquage qui t’intriguent le plus ?', 'Le chargement du véhicule', 'L’arrimage sur le plateau', 'La remise au garage'],
['Ton GPS client aimerait surtout voir…', 'La destination finale', 'Une estimation du temps de trajet', 'Les étapes après l’arrivée'],
['Pendant le chargement, ton rôle préféré serait…', 'Comprendre ce qui se passe', 'Poser une question si besoin', 'Laisser JM travailler et patienter'],
['Le mot “manutention” te fait penser à…', 'Du travail en plus pour charger', 'Un mot à m’expliquer simplement', 'Les coulisses que je ne connaissais pas'],
['La preuve de livraison qui te parlerait le mieux ?', 'Une photo du véhicule déposé', 'L’heure et le lieu sur le bon', 'La réception confirmée par le garage'],
['Pour une prise en charge facile à suivre, tu apprécies…', 'Un prix expliqué clairement', 'Des nouvelles aux étapes importantes', 'Un document récapitulatif']
],
delivery: [
['Au garage, la dernière pièce de ton puzzle serait…', 'Savoir qui reçoit la voiture', 'Comprendre la suite', 'Avoir mon document de prise en charge'],
['Le bon d’intervention, tu le vois comme…', 'Le résumé de cette aventure', 'La trace de la prise en charge', 'Un document à garder au chaud'],
['Une chose à mieux expliquer la prochaine fois ?', 'Le chargement et la manutention', 'Le tarif et les suppléments', 'La remise au garage'],
['Pour conclure le trajet, tu préfères…', 'Un résumé des étapes réalisées', 'Poser ma dernière question', 'Une petite touche d’humour et au revoir']
]
}
};
const THEME_QUESTIONS = Object.entries(bank).flatMap(([theme,phases])=>Object.entries(phases).flatMap(([phase,rows])=>rows.map((r,index)=>({id:theme+'-'+phase+'-'+index,theme,phase,text:r[0],answers:r.slice(1)}))));
function choose(theme,phase,n){const pool=THEME_QUESTIONS.filter(q=>q.theme===theme&&q.phase===phase),out=[];while(out.length<n){const v=crypto.getRandomValues(new Uint32Array(1))[0];out.push(pool.splice(v%pool.length,1)[0]);}return out;}
const jsonTheme=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}});
function applyGameTheme(session,s){
 session.themes_available=true;
 session.theme=s.game_theme||'mixed';
 session.theme_title=GAME_THEMES[session.theme]||GAME_THEMES.mixed;
 session.theme_chosen=!!s.game_theme;
 if(Array.isArray(s.themed_questions)&&s.themed_questions.length===5)session.questions=s.themed_questions.slice(0,session.unlocked);
 return session;
}
// Se greffe au serveur déjà installé. Les questions d'origine restent intactes
// pour les anciennes parties ; leurs trois choix servent aussi à valider les indices.
function wrapGameThemes(original,account){
 if(original.__jmThemesVersion===1)return original;
 return {...original,__jmThemesVersion:1,async fetch(req,env,ctx){
  const path=new URL(req.url).pathname;
  if(req.method==='OPTIONS'||!path.startsWith('/api/game/'))return original.fetch.call(original,req,env,ctx);
  if(path==='/api/game/theme'){
   if(req.method!=='POST')return jsonTheme({error:'Méthode refusée'},405);
   try{
    const raw=await req.text();if(raw.length>8192)return jsonTheme({error:'Requête trop grande'},413);
    let b;try{b=JSON.parse(raw);}catch{return jsonTheme({error:'JSON invalide'},400);}
    if(!b||typeof b!=='object')return jsonTheme({error:'JSON invalide'},400);
    const id=b.sessionId,theme=b.theme;
    if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))return jsonTheme({error:'Session invalide'},404);
    if(!Object.hasOwn(GAME_THEMES,theme))return jsonTheme({error:'Thème inconnu'},400);
    const row=await env.DB.prepare('SELECT * FROM jm_game_sessions WHERE account=? AND id=?').bind(account,id).first();
    if(!row)return jsonTheme({error:'Aucune session trouvée'},404);
    if(row.expires<=Date.now())return jsonTheme({error:'Cette session a expiré'},410);
    const s=JSON.parse(row.data);
    if(s.answers.length||s.result)return jsonTheme({error:'Le thème ne peut plus changer après la première réponse.'},409);
    if(s.game_theme!==theme){
     s.game_theme=theme;
     s.themed_questions=theme==='mixed'?null:[...choose(theme,'route',3),...choose(theme,'delivery',2)];
     const updated=await env.DB.prepare('UPDATE jm_game_sessions SET data=?, revision=revision+1 WHERE account=? AND id=? AND revision=?').bind(JSON.stringify(s),account,id,row.revision).run();
     if(updated.meta?.changes!==1)return jsonTheme({error:'Une autre action arrive en même temps. Réessaie.'},409);
    }
    const r=await original.fetch.call(original,new Request(new URL('/api/game/session?s='+id,req.url)),env,ctx);
    if(!r.ok)return r;
    const data=await r.json();applyGameTheme(data.session,s);return jsonTheme(data);
   }catch{return jsonTheme({error:'Le choix des thèmes est temporairement indisponible.'},503);}
  }
  const response=await original.fetch.call(original,req,env,ctx);
  if(!response.ok)return response;
  // Lecture seulement, après le traitement du serveur d'origine.
  try{
   const data=await response.clone().json(),session=data.session;
   if(!session?.session_id)return response;
   const row=await env.DB.prepare('SELECT data FROM jm_game_sessions WHERE account=? AND id=?').bind(account,session.session_id).first();
   if(!row)return response;
   applyGameTheme(session,JSON.parse(row.data));
   const headers=new Headers(response.headers);headers.delete('Content-Length');headers.set('Cache-Control','no-store');
   return new Response(JSON.stringify(data),{status:response.status,headers});
  }catch{return response;}
 }};
}

worker_default=wrapGameThemes(worker_default,ACCOUNT);
})();
