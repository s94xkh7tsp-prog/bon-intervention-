# Cloudflare Worker — intégration WhatsApp JM Express

Ce dossier prépare la réception sécurisée des webhooks WhatsApp. **Le Worker n’est pas déployé et l’envoi de messages est désactivé.**

## Fichiers

- `whatsapp-worker.js` : webhook Meta, extraction simple, accès D1.
- `d1-schema.sql` : schéma des trois tables D1.
- `wrangler.toml` : point d’entrée corrigé. L’identifiant D1 reste à renseigner.
- `PHASE1-DEPLOYMENT.md` : prérequis et procédure contrôlée.

## Sécurité en place dans cette branche

- Les POST du webhook sont vérifiés avec `X-Hub-Signature-256` et le secret d’application Meta.
- Les routes de lecture et de validation exigent `Authorization: Bearer <ADMIN_API_TOKEN>`.
- `POST /whatsapp/send` renvoie toujours 503 pendant cette étape.
- Aucun secret, ID de base D1 ni route publique réelle n’est inscrit dans la configuration.

## Mise en place ultérieure

Depuis ce dossier, avec accès au compte Cloudflare autorisé :

1. Créer la base D1 `jm-express` avec Wrangler et reporter l’ID retourné dans `wrangler.toml`.
2. Appliquer le schéma à la base distante :
   ```bash
   npx wrangler d1 execute jm-express --remote --file=./d1-schema.sql
   ```
3. Ajouter comme secrets Cloudflare `META_WEBHOOK_TOKEN`, `META_APP_SECRET` et `ADMIN_API_TOKEN`.
4. Vérifier d’abord le Worker localement et avec des requêtes de test signées.
5. N’ajouter l’URL webhook dans Meta qu’après revue et accord séparé.

Les secrets se configurent avec `npx wrangler secret put NOM_DU_SECRET`. Ne jamais mettre leurs valeurs dans le dépôt, le navigateur ou un fichier de configuration versionné.

## Routes

- `GET/POST /whatsapp/webhook` : vérification initiale Meta et réception signée des événements.
- `GET /whatsapp/messages` : liste les demandes en attente; accès protégé par le jeton administrateur.
- `POST /whatsapp/validate` : sauvegarde une réponse à valider; accès protégé.
- `POST /whatsapp/send` : désactivé (503) pendant la préparation.

L’interface actuelle n’est pas encore reliée à D1. Ne pas placer `ADMIN_API_TOKEN` dans `index.html` ou dans du JavaScript client.
