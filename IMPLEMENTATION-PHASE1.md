# Implementation Phase 1 — Comptabilité + WhatsApp 📦

**Date:** 2026-10-09  
**Statut:** 🟢 Comptabilité COMPLÈTE / 🟡 WhatsApp PRÊT À DÉPLOYER

---

## 📍 Localisation des fichiers

### 1️⃣ Comptabilité — DANS index.html ✅

```
/home/claude/bon-intervention-appli/
├── index.html
│   ├── HTML (lignes 4750-4775): Modal #modalComptabiliteRappelBg
│   └── JS (lignes 20051-20119): Fonctions jmCompt*
└── ✅ 22,323 → 22,380 lignes (+57)
```

**Test immédiat :**
```javascript
// Console navigateur
await jmComptRappelAfficher();  // Affiche si date OK
localStorage.getItem('jm_comptabiliteReminders');  // Voir données
```

### 2️⃣ WhatsApp — DANS cloudflare-worker/ 🆕

```
/home/claude/bon-intervention-appli/cloudflare-worker/
├── whatsapp-worker.js      (314 lignes) — Endpoints Cloudflare
├── d1-schema.sql           (59 lignes)  — Schéma D1
├── wrangler.toml           (35 lignes)  — Config Cloudflare
├── PHASE1-DEPLOYMENT.md    (200 lignes) — Guide détaillé
└── README.md               (54 lignes)  — Quick start
```

---

## 🟢 COMPTABILITÉ — IMPLÉMENTATION COMPLÈTE

### Ce qui a été ajouté

#### HTML (Modal)
```html
<div class="modal-bg" id="modalComptabiliteRappelBg">
  <h3>📊 Rappel comptable trimestriel</h3>
  <input type="checkbox" id="comptChkFacturesVente">Factures de vente
  <input type="checkbox" id="comptChkFacturesAchat">Factures d'achat
  ...
  <button onclick="jmComptMarquerPret()">✓ Prêt à envoyer</button>
  <button onclick="jmComptMarquerEnvoye()">📤 Envoyé au comptable</button>
  <button onclick="jmComptReporterRappel()">Reporter de 7 jours</button>
</div>
```

#### JavaScript (7 fonctions)

| Fonction | Rôle |
|----------|------|
| `lireRappelCompt()` | Lit localStorage `jm_comptabiliteReminders` |
| `ecrireRappelCompt(o)` | Persiste JSON des rappels |
| `getTrimestrePrecedent()` | Calcule Q à afficher en fonction du mois |
| `jmComptRappelAfficher()` | Affiche modal si c'est le 5 du mois + conditions OK |
| `jmComptMarquerPret()` | Status = "Prêt à envoyer" + enregistre checklist |
| `jmComptMarquerEnvoye()` | Status = "Envoyé au comptable" + timestamp |
| `jmComptReporterRappel()` | Report +7j via localStorage |

#### Données (localStorage)
```json
{
  "jm_comptabiliteReminders": {
    "2025-Q1": {
      "status": "À préparer|Prêt à envoyer|Envoyé au comptable",
      "checklist": {
        "factures_vente": true/false,
        "factures_achat": true/false,
        "notes_frais": true/false,
        "justificatifs": true/false,
        "extraits": true/false
      },
      "datePrepa": "2025-01-05T10:30:00Z",
      "dateReport": null | "2025-01-12T10:30:00Z",
      "dateEnvoye": null | "2025-01-15T14:20:00Z"
    },
    "2025-Q2": {...},
    "2025-Q3": {...},
    "2025-Q4": {...}
  }
}
```

### Comportement

| Date | Trimestre | Affichage |
|------|-----------|-----------|
| **5 janvier** | Q4 (oct-déc année précédente) | ✅ Modal si pas envoyé + pas reporté |
| **5 avril** | Q1 (jan-mar) | ✅ Modal si pas envoyé + pas reporté |
| **5 juillet** | Q2 (avr-juin) | ✅ Modal si pas envoyé + pas reporté |
| **5 octobre** | Q3 (juil-sept) | ✅ Modal si pas envoyé + pas reporté |

### Actions utilisateur

1. **Reporter** → +7j via localStorage
2. **Prêt à envoyer** → Status + checklist enregistrée
3. **Marquer envoyé** → Status final + dateEnvoye

### ✅ Garanties

- ✅ Zéro impact sur Formule A (tarification inchangée)
- ✅ Zéro impact sur sync A/B (localStorage isolée)
- ✅ Zéro impact sur offline (service worker inchangé)
- ✅ Zéro impact sur interventions existantes
- ✅ localStorage key unique = `jm_comptabiliteReminders` (pas de collision)

---

## 🟡 WhatsApp PHASE 1 — PRÊT À DÉPLOYER

### Architecture

```
CLIENT WhatsApp
    ↓ (message entrant)
Meta Webhook Server
    ↓
POST /whatsapp/webhook (Cloudflare Worker)
    ↓
[Validation signature Meta]
[Parser: type, adresse, urgence, confidence]
    ↓
D1 Database (INSERT whatsapp_messages)
    ↓
GET /whatsapp/messages ← poll toutes les 30s
    ↓
UI App (affiche message + checklist + boutons)
    ↓
UTILISATEUR valide réponse
    ↓
POST /whatsapp/validate → UPDATE statut READY_TO_SEND
    ↓
POST /whatsapp/send → appel Meta API → ENVOI
    ↓
D1 (UPDATE statut SENT + meta_msg_id)
```

### Endpoints Cloudflare Worker

| Endpoint | Méthode | Entrée | Sortie |
|----------|---------|--------|--------|
| `/whatsapp/webhook` | GET | token validation | challenge |
| `/whatsapp/webhook` | POST | message Meta | 200 EVENT_RECEIVED |
| `/whatsapp/messages` | GET | ∅ | JSON [messages] |
| `/whatsapp/validate` | POST | {message_id, response_text} | {success: true} |
| `/whatsapp/send` | POST | {message_id} | {success, meta_id} |

### Parser

Détecte automatiquement:
- **Type** : battery, tire, towing, fuel, unlock (regex basique)
- **Urgence** : HIGH/NORMAL (keywords)
- **Adresse** : présence de "rue", "avenue", etc.
- **Véhicule** : marques communes (Renault, Peugeot, etc.)
- **Confidence** : score 0.0-1.0 basé sur combos

Exemple:
```
Message: "Bonjour j'ai une crevaison à Charleroi urgent"
Parsing: {
  type: "tire",
  urgency: "HIGH",
  missing: ["vehicle"],
  confidence: 0.85,
  original_text: "..."
}
```

### Base de données D1

**Tablescrées:**
1. `whatsapp_messages` — stockage messages + statuts
2. `whatsapp_responses` — historique envois
3. `whatsapp_conversations` — tracking client

**Colonnes principales:**
- msg_id, from_number, message_text, timestamp
- status (PENDING, DRAFT, READY_TO_SEND, SENT, FAILED)
- parsed_data (JSON), confidence_score
- response_draft, validated_data
- sent_at, meta_msg_id

### ✅ Garanties

- ✅ Tokens Meta en secrets Cloudflare (jamais en code)
- ✅ Webhook signature validée (prevent spoofing)
- ✅ **Aucun envoi automatique** (validation manuelle obligatoire)
- ✅ D1 indépendante = zéro impact sync A/B
- ✅ Architecture séparable (peut se déployer sans afficher UI app)

---

## 📋 Checklist avant déploiement

### Configuration

- [ ] Compte Cloudflare avec D1 active
- [ ] Account Meta Business Manager
- [ ] Numéro WhatsApp enregistré
- [ ] Domain sur Cloudflare (pour webhook)
- [ ] HTTPS configuré sur domain

### Déploiement

- [ ] D1 database créée (`jm-express`)
- [ ] Schéma SQL exécuté (3 tables créées)
- [ ] 4 secrets Cloudflare configurés
- [ ] Worker déployé via `wrangler deploy`
- [ ] Webhook Meta pointant vers Worker
- [ ] Webhook token = META_WEBHOOK_TOKEN

### Test

- [ ] GET /whatsapp/webhook → challenge OK
- [ ] Message test via WhatsApp → stocké en D1
- [ ] GET /whatsapp/messages → retourne JSON
- [ ] POST /whatsapp/validate → statut changé
- [ ] POST /whatsapp/send → message envoyé via Meta

### UI App

- [ ] Onglet "📱 WhatsApp — Demandes clients" créé
- [ ] Polling GET /whatsapp/messages (30s)
- [ ] Affichage messages avec confidence %
- [ ] Modal de validation + rédaction réponse
- [ ] Boutons Valider/Envoyer/Reporter

---

## 🎯 Questions en attente de réponse

**Avant de continuer vers UI + Phase 2:**

1. **Meta Business Manager configuré ?**
   - Compte actif avec WhatsApp API ?
   - Numéro téléphone enregistré ?

2. **Réponse par défaut ?**
   - Auto-suggérée (ex: "Merci, on revient rapidement") ?
   - Ou toujours modal vide en attente ta rédaction ?

3. **Template d'infos manquantes ?**
   - Template prédéfini ?
   - Ou libre ?

4. **Création intervention auto ?**
   - Créer automatiquement après validation message ?
   - Ou notification manuelle uniquement ?

5. **Notification ?**
   - Navigateur si app ouverte ?
   - SMS/push téléphone ?

---

## 📊 Résumé

| Feature | État | Fichiers | Risque |
|---------|------|----------|--------|
| **Comptabilité** | ✅ COMPLÈTE | index.html (+57 lignes) | TRÈS BAS |
| **WhatsApp Worker** | ✅ PRÊT | whatsapp-worker.js | BAS |
| **WhatsApp D1** | ✅ PRÊT | d1-schema.sql | BAS |
| **WhatsApp Config** | ✅ PRÊT | wrangler.toml | BAS |
| **WhatsApp UI** | ⏳ À FAIRE | index.html (à modifier) | MOYEN |
| **WhatsApp Notifications** | ⏳ À FAIRE | À spécifier | MOYEN |

---

## 📂 Prochaines étapes

### Immédiat
1. ✅ Code Comptabilité = prêt
2. ✅ Code WhatsApp Worker = prêt
3. ⏳ **Valider** : Réponses aux 5 questions
4. ⏳ **Valider** : Stratégie UI WhatsApp dans app

### Phase 1.5 (après validation)
- Ajouter onglet "📱 WhatsApp" dans index.html
- Impl polling GET /whatsapp/messages
- Affichage liste + modal validation
- Boutons Valider/Envoyer/Reporter

### Phase 2 (après Phase 1 stabilisée)
- Suggestions AI (ChatGPT + Anthropic)
- Création auto intervention/devis
- Templates prédéfinis
- Analytics temps réponse

---

**Documents à consulter:**

- 📖 **Comptabilité** : Voir `index.html` lignes 4750-4775 et 20051-20119
- 📖 **WhatsApp Détail** : `/cloudflare-worker/PHASE1-DEPLOYMENT.md`
- 📖 **WhatsApp Quick Start** : `/cloudflare-worker/README.md`

