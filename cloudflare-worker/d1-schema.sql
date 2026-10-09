-- D1 Schema pour WhatsApp Business Integration — Phase 1

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  msg_id TEXT UNIQUE NOT NULL,           -- Meta Message ID
  from_number TEXT NOT NULL,              -- Format: 33612345678 (sans +)
  message_text TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',       -- text, image, document, etc.
  timestamp TEXT NOT NULL,                -- ISO 8601
  status TEXT DEFAULT 'PENDING',          -- PENDING, DRAFT, READY_TO_SEND, SENT, FAILED
  parsed_data TEXT,                       -- JSON: {type, urgency, missing, confidence}
  confidence_score REAL DEFAULT 0.5,
  response_draft TEXT,                    -- Réponse préparée (en attente de validation)
  validated_data TEXT,                    -- JSON: données validées/modifiées par l'utilisateur
  validated_at TEXT,                      -- Timestamp de validation
  sent_at TEXT,                           -- Timestamp d'envoi
  meta_msg_id TEXT,                       -- ID du message envoyé par Meta
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wa_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_wa_from ON whatsapp_messages(from_number);
CREATE INDEX IF NOT EXISTS idx_wa_timestamp ON whatsapp_messages(timestamp);

-- Table pour historique des réponses (optionnel mais bon pour traçabilité)
CREATE TABLE IF NOT EXISTS whatsapp_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL,
  from_number TEXT NOT NULL,
  response_text TEXT NOT NULL,
  sent_at TEXT NOT NULL,
  meta_msg_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES whatsapp_messages(id)
);

CREATE INDEX IF NOT EXISTS idx_wa_resp_from ON whatsapp_responses(from_number);

-- Table pour tracker les conversations (client → interventions)
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_number TEXT NOT NULL UNIQUE,
  client_name TEXT,
  vehicle_brand TEXT,
  vehicle_model TEXT,
  vehicle_plate TEXT,
  last_message_at TEXT,
  intervention_key TEXT,                  -- Lien vers une intervention existante
  status TEXT DEFAULT 'ACTIVE',           -- ACTIVE, ARCHIVED
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wa_conv_from ON whatsapp_conversations(from_number);
