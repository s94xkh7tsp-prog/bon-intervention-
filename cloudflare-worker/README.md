# Cloudflare Worker — WhatsApp Business Integration Phase 1

Ce dossier contient l'infrastructure Cloudflare pour recevoir et gérer les messages WhatsApp entrants.

## 📦 Fichiers

| Fichier | Lignes | Description |
|---------|--------|-------------|
| `whatsapp-worker.js` | 314 | Code du Worker avec 4 endpoints |
| `d1-schema.sql` | 59 | Schéma D1 (3 tables) |
| `wrangler.toml` | 35 | Configuration Cloudflare |
| `PHASE1-DEPLOYMENT.md` | 200 | Guide détaillé de déploiement |

## ⚡ Quick Start

```bash
# 1. Cloner le repo
cd bon-intervention-appli/cloudflare-worker

# 2. Installer wrangler
npm install -g wrangler

# 3. Créer D1 database
wrangler d1 create jm-express

# 4. Récupérer l'ID et mettre à jour wrangler.toml
# ...

# 5. Exécuter le schéma
wrangler d1 execute jm-express --file=d1-schema.sql

# 6. Configurer les secrets
wrangler secret put META_WEBHOOK_TOKEN
wrangler secret put META_ACCESS_TOKEN
wrangler secret put META_PHONE_NUMBER_ID
wrangler secret put META_BUSINESS_ACCOUNT_ID

# 7. Déployer
wrangler deploy
```

## 🔌 Endpoints

- **POST /whatsapp/webhook** → reçoit messages Meta
- **GET /whatsapp/messages** → liste messages PENDING
- **POST /whatsapp/validate** → valide réponse
- **POST /whatsapp/send** → envoie via Meta API

## 📖 Documentation complète

Voir `PHASE1-DEPLOYMENT.md` pour:
- Configuration Meta Business Manager
- Configuration webhooks
- Tests en dev
- Troubleshooting
- Flow utilisateur complet

## ✅ Prérequis

- Cloudflare Account avec D1 active
- Meta Business Manager avec WhatsApp API
- Numéro téléphone WhatsApp enregistré
- 4 tokens Meta à récupérer

