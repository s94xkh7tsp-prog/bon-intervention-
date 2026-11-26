# Phase 1 WhatsApp — préparation sécurisée

## État de cette branche

- Le point d’entrée Wrangler vise maintenant `whatsapp-worker.js`.
- Le webhook refuse les POST sans signature Meta valide.
- Les routes de lecture et de validation nécessitent un jeton administrateur.
- La route d’envoi est désactivée et répond 503.
- Aucun Worker n’est déployé par cette procédure.
- L’interface `index.html` n’est pas encore reliée à D1.

## Accès nécessaires avant configuration distante

- Accès au compte Cloudflare et au projet Workers/D1 voulu.
- Accès Meta Business avec l’application et le compte WhatsApp Business concernés.
- Secret d’application Meta (à saisir uniquement dans le gestionnaire de secrets Cloudflare).
- Choix du nom de domaine ou de l’URL Worker pour le webhook.

Ne colle pas les secrets dans le dépôt, dans le navigateur ou ici.

## Préparer D1

Depuis `cloudflare-worker/` avec Wrangler authentifié :

```bash
npx wrangler d1 create jm-express
```

Reporter l’identifiant retourné dans `wrangler.toml`, puis appliquer le schéma explicitement à la base distante :

```bash
npx wrangler d1 execute jm-express --remote --file=./d1-schema.sql
```

Vérifier ensuite les tables `whatsapp_messages`, `whatsapp_responses` et `whatsapp_conversations` dans D1.

## Ajouter les secrets Cloudflare

```bash
npx wrangler secret put META_WEBHOOK_TOKEN
npx wrangler secret put META_APP_SECRET
npx wrangler secret put ADMIN_API_TOKEN
```

Le jeton administrateur doit être long et aléatoire. Ne pas l’intégrer au JavaScript du site : l’interface n’a pas encore de relais serveur sécurisé.

## Étapes à faire seulement après revue

1. Exécuter `npx wrangler dev` localement.
2. Vérifier que le GET de validation Meta ne répond au challenge qu’avec le bon jeton.
3. Envoyer un événement fictif signé avec le secret de test et vérifier son insertion dans D1 local.
4. Vérifier qu’un POST sans signature est refusé et que les routes protégées répondent 401 sans jeton.
5. Vérifier que `POST /whatsapp/send` répond 503, même avec un jeton.
6. Examiner les logs et les données de test.
7. Après accord distinct, créer la base distante, configurer Meta et envisager un déploiement contrôlé.

Aucune réponse ne doit être envoyée à un client pendant cette phase. Aucun devis, tarif, remise ou engagement ne doit être calculé ou confirmé automatiquement.

## Limites connues à traiter ensuite

- Le tableau de bord de l’application lit encore `window.storage`; il n’interroge pas D1.
- L’assistant ne vérifie pas encore les clients existants dans l’application et n’utilise pas son moteur tarifaire.
- La boîte mail professionnelle n’est pas intégrée.
- L’accès Meta, le numéro, les abonnements webhook et la configuration Cloudflare restent à confirmer dans les comptes du propriétaire.
