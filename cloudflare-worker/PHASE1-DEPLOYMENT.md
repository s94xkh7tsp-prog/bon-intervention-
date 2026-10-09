# Phase 1 WhatsApp MVP — Guide de Déploiement

## 📋 Prérequis

1. **Compte Cloudflare existant** avec accès D1 (SQLite)
2. **Meta Business Account** avec:
   - WhatsApp Business Platform API activée
   - Numéro de téléphone WhatsApp enregistré
   - Tokens d'accès générés
3. **Domain** configuré sur Cloudflare (pour les webhooks)

## 🚀 Étapes de déploiement

### 1. Configurer la base de données D1

```bash
# Dans le dashboard Cloudflare D1 :
# 1. Créer une nouvelle base "jm-express"
# 2. Copier l'ID obtenu (format: xxxxxxxxxxxxxxxx)
# 3. Exécuter le schéma SQL

# Via wrangler CLI :
wrangler d1 execute jm-express --file=d1-schema.sql
```

### 2. Configurer les secrets Cloudflare

```bash
# Récupérer depuis Meta Business Manager → Settings → Tokens
wrangler secret put META_WEBHOOK_TOKEN          # Token de validation webhook (à choisir)
wrangler secret put META_PHONE_NUMBER_ID        # ID du numéro enregistré
wrangler secret put META_BUSINESS_ACCOUNT_ID    # ID du compte business
wrangler secret put META_ACCESS_TOKEN           # Access token (long-lived)
```

### 3. Configurer le webhook Meta

1. Aller dans Meta App Dashboard → WhatsApp → Configuration
2. **Webhook URL** : `https://your-domain.com/whatsapp/webhook`
3. **Verify Token** : la valeur de META_WEBHOOK_TOKEN
4. **Subscribe to events** : sélectionner `messages` 
5. Tester la connexion (Cloudflare va appeler GET /whatsapp/webhook)

### 4. Déployer le Worker

```bash
# Depuis le dossier cloudflare-worker/
npm install wrangler
npx wrangler deploy
```

### 5. Vérifier le déploiement

```bash
# Tester l'endpoint /whatsapp/messages
curl https://your-worker.workers.dev/whatsapp/messages

# Vérifier les logs
npx wrangler tail
```

### 6. Intégrer l'UI dans index.html

L'onglet "📱 WhatsApp — Demandes" doit afficher:
- ✅ Polling automatique toutes les 30 secondes
- ✅ Nombre de messages en attente
- ✅ Liste des messages avec confiance % et statut
- ✅ Modal de validation avec suggestion de réponse
- ✅ Bouton "Envoyer" (après validation)
- ✅ Bouton "Reporter" (rappel 30 min)

## 📊 États des messages

| Statut | Signification | Visible où |
|--------|--------------|-----------|
| PENDING | Reçu du client, en attente de validation | UI — onglet WhatsApp |
| DRAFT | Réponse en cours de rédaction | UI — modal |
| READY_TO_SEND | Validé, prêt à envoyer | UI — confirmation avant envoi |
| SENT | Envoyé au client ✅ | Historique |
| FAILED | Erreur d'envoi | Historique avec détail erreur |

## 🔐 Sécurité

- ✅ Tokens stockés dans les secrets Cloudflare (jamais en code)
- ✅ Signature Meta validée sur webhook (prevent spoofing)
- ✅ Aucun envoi automatique (validation manuelle obligatoire)
- ✅ Logging des actions (qui, quand, quoi)
- ✅ Rate limiting via Cloudflare (optionnel)

## 🧪 Test en dev

```javascript
// Dans console navigateur ou test node :
const testMessage = {
  entry: [{
    changes: [{
      value: {
        messages: [{
          id: "wamid.xxx",
          from: "33612345678",
          type: "text",
          text: { body: "Bonjour j'ai un problème de batterie à Charleroi urgent" },
          timestamp: Math.floor(Date.now() / 1000)
        }],
        contacts: [{
          profile: { name: "Jean Dupont" },
          wa_id: "33612345678"
        }]
      }
    }]
  }]
};

// Envoyer au webhook
fetch('/whatsapp/webhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testMessage)
});
```

## ⚠️ Notes importantes

1. **Tarifs Meta** : 
   - Messages entrants = gratuit
   - Messages sortants (business-initiated) = payant
   - Phase 1 : messages client-initiated uniquement

2. **Numéro client** : 
   - Format attendu : `33612345678` (sans +33)
   - Parser accepte `+33` et le convertit

3. **Confidence score** :
   - < 60% : demander tous les infos (adresse, véhicule)
   - 60-75% : suggérer corrections
   - > 75% : réponse auto-suggérée

4. **Sync A/B** :
   - WhatsApp messages = stockage D1 indépendant
   - Pas d'impact sur sync téléphones
   - Historique intervention restant inchangé

## 📱 Flow utilisateur Phase 1

1. **Client envoie message WhatsApp**
2. Meta → webhook Cloudflare → stockage D1
3. **App notifie Jamal** : "1 nouveau message en attente"
4. **Jamal ouvre onglet WhatsApp**
5. Voir message + parsing suggéré + confiance %
6. **Modifier si nécessaire** (adresse, type, urgence)
7. **Valider** → changement statut
8. **Envoyer** → appel Meta API → envoi
9. **Historique** : affiche messages SENT + FAILED

## 🎯 Phase 2 (à venir)

- Suggestions AI avancées (ChatGPT + Anthropic fallback)
- Création auto devis/intervention à partir du message validé
- Templates de réponse prédéfinis
- Analytics : temps de réponse, taux de conversion

## 🆘 Troubleshooting

**Webhook ne reçoit pas les messages**
→ Vérifier token, domaine HTTPS, signature Meta valide

**Messages stockés mais UI ne les affiche pas**
→ Vérifier GET /whatsapp/messages retourne JSON valide
→ Vérifier polling fréquence (30s)

**Erreur lors d'envoi**
→ Vérifier ACCESS_TOKEN valide + pas expiré
→ Vérifier PHONE_NUMBER_ID correct
→ Vérifier numéro client au bon format

