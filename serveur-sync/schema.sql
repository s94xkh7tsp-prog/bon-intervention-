-- JM Express — synchronisation (D1)
CREATE TABLE IF NOT EXISTS devices (
  account TEXT NOT NULL, id TEXT NOT NULL, nom TEXT, role TEXT NOT NULL,
  token_hash TEXT NOT NULL, revoked INTEGER NOT NULL DEFAULT 0, created TEXT,
  PRIMARY KEY (account, id)
);
CREATE INDEX IF NOT EXISTS idx_devices_token ON devices(account, token_hash);
CREATE TABLE IF NOT EXISTS pairing_codes (
  account TEXT NOT NULL, code TEXT NOT NULL, expires INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (account, code)
);
CREATE TABLE IF NOT EXISTS records (
  account TEXT NOT NULL, key TEXT NOT NULL, rev INTEGER NOT NULL, seq INTEGER NOT NULL,
  updated_at TEXT, device_id TEXT, deleted INTEGER NOT NULL DEFAULT 0, data TEXT,
  PRIMARY KEY (account, key)
);
CREATE INDEX IF NOT EXISTS idx_records_seq ON records(account, seq);
-- Toutes les versions successives : une erreur reste réparable
CREATE TABLE IF NOT EXISTS history (
  account TEXT NOT NULL, key TEXT NOT NULL, rev INTEGER NOT NULL, seq INTEGER NOT NULL,
  updated_at TEXT, device_id TEXT, deleted INTEGER NOT NULL DEFAULT 0, data TEXT
);
