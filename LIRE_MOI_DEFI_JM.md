# JM Express v311 — Défi JM

Version préparée depuis l’archive v310 (clients fidèles). Elle doit encore être publiée et testée sur un iPhone réel. Le ZIP original de Claude contenait des fonctions non implémentées et des exemples d’intégration : ne pas déployer son worker-integrated.js.

## Utilisation

1. Enregistrer une intervention. Ouvrir **⋯ Plus → Défi JM / résultat**, ou le bouton Défi JM en bas de l’application.
2. Choisir le bon et le montant maximal du cadeau (0 € par défaut = aucune remise). Créer/retrouver la partie.
3. Montrer le QR au passager ou partager le lien. Le QR est produit sur le téléphone, sans service externe. Le passager doit être connecté à Internet ; le partage de connexion peut lui fournir Internet.
4. Le client reçoit trois questions. Après avoir réellement déchargé le véhicule, appuyer dans le Défi JM sur **Véhicule déchargé : ouvrir les 2 dernières questions**. Ce bouton confirme la livraison pour le jeu, pas une signature du garage.
5. Le client répond aux deux dernières questions et termine. Le téléphone JM actualise le résultat toutes les 5 secondes lorsque la fenêtre du jeu est ouverte et visible. Si elle est fermée, rouvrir le Défi JM et retrouver le même bon/QR.
6. La remise reste manuelle sur une prochaine intervention. Chaque réponse vaut 20 points quelle que soit la réponse ; passer vaut 0. Le montant est proportionnel au score et au maximum choisi avant la partie. L’avis privé, le genre et les accords vidéo ne rapportent aucun point.
7. Pour un client fidèle déjà enregistré avec son accord, un petit repère indique la remise disponible lorsqu’on retrouve son téléphone. Après avoir effectivement appliqué la remise à une prochaine intervention, appuyer sur **Marquer cette remise utilisée**. Cette action est un suivi manuel ; aucune facture n’est modifiée automatiquement. Si aucune fiche client autorisée n’existe, le résultat reste dans le bon d’origine et dans le serveur ; on peut l’y retrouver sans créer de contact.

Les autorisations de filmer et de publier sont séparées, facultatives et décochées. Choisir les réseaux autorisés. Aucune prise de vue ni publication automatique. Réservé aux passagers, jamais au conducteur en circulation.

## Publication (serveur existant)

Conserver les secrets, le compte Cloudflare, la base D1 et le wrangler.toml déjà configurés. Le wrangler.toml du ZIP est un exemple avec un identifiant à remplir : NE PAS remplacer une configuration réelle par cet exemple. Ne pas créer un nouveau téléphone principal et ne pas réinitialiser l’application.

Depuis le répertoire serveur-sync configuré :

```sh
npx wrangler d1 execute jm-sync --remote --file=./schema_jeu.sql
npx wrangler deploy
```

Remplacer `jm-sync` par le nom de la base D1 existante s’il diffère. Le fichier schema_jeu.sql ajoute une seule table isolée. Ne pas exécuter schema.sql ni le schéma original de Claude pour cette mise à jour. Copier **worker.js**, **game-api.js** et **game-questions.js** ensemble : les imports sont intégrés par Wrangler. Avec l’éditeur Cloudflare sur téléphone, téléverser le worker autonome fourni dans `publication-mobile/worker-v311-autonome.js` à la place du script actuel, garder la liaison DB et les secrets ; ce fichier embarque les modules du jeu et conserve le worker v310. Copier uniquement le SQL du nouveau schema_jeu.sql dans la console de la même base D1.

Documentation des commandes :
- https://developers.cloudflare.com/workers/wrangler/commands/d1/
- https://developers.cloudflare.com/d1/tutorials/build-an-api-to-access-d1/

Sur GitHub Pages, publier ces fichiers à la racine du dépôt bon-intervention- (au même niveau que index.html) :

- index.html
- sw.js
- game.html
- game-client.js
- game-driver.js
- game-questions.js

Conserver toutes les autres ressources existantes. La page du jeu est hébergée sur GitHub Pages, pas sur le Worker. L’URL du serveur est reprise des réglages de synchronisation de JM ; aucun jeton d’appareil n’est placé dans le QR ni dans la page client. Le lien contient une clé aléatoire de partie valable 24 h, qui donne accès uniquement à cette partie : le partager seulement avec le passager.

Si la synchronisation n’est pas encore configurée, suivre d’abord le guide existant serveur-sync/INSTALLATION.md. Ne pas envoyer de jeton ou de code secret dans une conversation.

## Contrôles effectués

- Syntaxe des 52 scripts internes, nouveaux scripts, service worker et serveur.
- Serveur avec une base SQLite réelle : authentification conducteur, absence de coordonnées du client dans l’API publique, génération aléatoire 256 bits, expiration, ordre et plages des réponses, verrouillage livraison, calcul serveur, envois répétés, récompense et consentements.
- Parcours JavaScript client en DOM simulé : trois questions, attente, deux questions, envoi effectif, coupure réseau/reprise et réouverture du résultat.
- Écriture du résultat : conservation du numéro, montant, kilomètres, paiement, facture émise, signature et photos d’un bon archivé.
- Régressions existantes : 129 cas tarifaires, trajets B→C et C→D, prix saisi à zéro, retour depuis le dernier garage, manutention, intervention inachevée, bons et signatures.
- Comparaison du code v310 : moteur de prix et fonctions de facturation conservés. Extension du jeu dans des fichiers séparés.

Pas de test visuel dans un navigateur réel ni de test iPhone effectué ici. Le test de production reste nécessaire : scanner depuis un autre téléphone, parcourir les cinq questions et vérifier le résultat sur JM. Les tests locaux ne prouvent pas que le compte Cloudflare ou GitHub est correctement configuré.

## Limites et données

110 questions légères : 100 en route réparties en 10 thèmes et 10 d’arrivée. Tirage côté serveur, sans doublon au sein d’une partie. Il s’agit d’un jeu de participation, pas d’un contrôle technique ou d’une évaluation de satisfaction payée.

Session et réponses petites ; aucun enregistrement photo/vidéo dans le jeu. Les anciennes sessions sont supprimées 30 jours après expiration lors d’une nouvelle création. Le résultat enregistré sur le bon reste conservé. Maximum 10 repères de récompense par fiche client ; aucun accès automatique aux contacts iPhone. Le suivi des remises utilisées est synchronisé via la fiche client existante ; éviter de valider la même remise simultanément sur deux téléphones.

Retour arrière : remettre index.html et sw.js de la v310, sans effacer les données locales. La table du jeu peut rester en place. La sauvegarde des bons reste inchangée.

## Dépôt actuel

Le répertoire cloudflare-worker déjà présent concerne WhatsApp. Le serveur-sync ajouté pour le jeu et la synchronisation est distinct : ne pas remplacer whatsapp-worker.js et ne pas exécuter le SQL du jeu dans une base choisie au hasard. Utiliser la base DB du serveur de synchronisation JM, qui contient les tables devices et records. Si ce serveur n’existe pas encore, son installation reste nécessaire.
