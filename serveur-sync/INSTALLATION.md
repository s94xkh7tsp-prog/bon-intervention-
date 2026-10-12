# Installer le serveur de synchronisation (une seule fois, ~10 minutes)

Prérequis : un compte Cloudflare (celui du projet WhatsApp) et Node.js sur l'ordinateur.

1. `npm install -g wrangler` puis `wrangler login`
2. Dans ce dossier : `wrangler d1 create jm-sync`
   → copier le `database_id` affiché dans `wrangler.toml`
3. `wrangler d1 execute jm-sync --remote --file=schema.sql`
4. Choisir un code d'initialisation (long, ex. 20 caractères) et le poser comme secret :
   `wrangler secret put SETUP_CODE`
5. `wrangler deploy` → note l'adresse `https://jm-sync.<compte>.workers.dev`

Dans l'appli, sur le téléphone principal : Réglages → ☁️ Synchronisation →
adresse du serveur + code d'initialisation → « Initialiser comme téléphone principal ».
Tout l'existant est envoyé dans ton espace privé.

Puis « Associer un téléphone de secours » → code affiché (10 min, usage unique)
→ sur le second téléphone : même adresse, saisir le code → « Associer comme téléphone de secours ».

Coût : niveau gratuit Cloudflare (Workers + D1) largement suffisant.
Le code SETUP_CODE n'apparaît jamais dans l'appli ni sur GitHub.

## Mise à jour v261 — remplacement du téléphone principal

Nécessaire une seule fois, pour que « Remplacer le téléphone principal » fonctionne.

1. Remplace le fichier `worker.js` par celui de ce dossier.
2. `wrangler deploy` (même commande qu'à l'installation), ou colle le contenu de `worker.js` dans l'éditeur du Worker sur le tableau de bord Cloudflare puis « Deploy ».
3. Rien d'autre : la base D1, le code d'initialisation et les téléphones associés restent tels quels.

Ce que change la mise à jour : lors d'un remplacement, l'ancien téléphone principal est révoqué et le nouveau reçoit un identifiant neuf (indispensable pour qu'il récupère les données écrites par l'ancien). Le fonctionnement normal A ↔ B est inchangé.

Garde le **code d'initialisation** (SETUP_CODE) en lieu sûr, hors du téléphone : c'est lui qui autorise le remplacement.


## Mise à jour v281 — coach commercial IA (facultatif)

1. Remplace `worker.js` par celui de ce dossier, puis `wrangler deploy` (ou colle-le dans l'éditeur du Worker sur Cloudflare → Deploy).
2. Ajoute la clé OpenAI **comme secret** (jamais dans l'appli ni sur GitHub) : `wrangler secret put OPENAI_API_KEY`, ou Cloudflare → ton Worker → Settings → Variables → « Add » → type **Secret**, nom `OPENAI_API_KEY`.
3. Facultatif : variable `OPENAI_MODEL` (par défaut `gpt-4o-mini`).

Sans clé, l'appli affiche « Assistant temporairement indisponible » ; tout le reste fonctionne normalement. Seuls les téléphones associés (A et B) peuvent appeler l'assistant.


## Mise à jour v282 — assistant terrain

Remplace `worker.js` et redéploie (comme en v281). Rien d'autre : la même clé `OPENAI_API_KEY` sert à l'assistant ; la localisation autoroute utilise OpenStreetMap (gratuit, sans clé). Sans clé OpenAI, la localisation des sorties fonctionne quand même pour les demandes claires (« E42 sortie 18 »).


## Mise à jour v283

Remplace `worker.js` et redéploie (ajout de la vérification d'adresse). Même clé ; sans clé, la vérification fonctionne aussi (recherche cartographique directe, sans reformulation).


## Mise à jour v294 — secours Claude pour les adresses (facultatif)

1. Crée un compte sur la Console Claude : https://platform.claude.com (distinct de ton abonnement Claude, même avec le même e-mail).
2. Settings → Organization : ajoute le numéro de TVA (BE0818.232.315) **avant** le premier paiement, pour des factures au nom de JM Express.
3. Billing : ajoute un petit crédit prépayé (5 à 10 € suffisent pour longtemps).
4. API Keys : crée une clé.
5. Cloudflare → ton Worker → Settings → Variables → Add → type **Secret**, nom `ANTHROPIC_API_KEY`, colle la clé. (Facultatif : `ANTHROPIC_MODEL`, par défaut `claude-haiku-4-5-20251001`.)
6. Remplace `worker.js` par celui de ce dossier et redéploie.

Claude n'est appelé que si l'appli ne trouve pas un lieu ou ne comprend pas la phrase vocale. Sans clé, tout le reste fonctionne normalement.
