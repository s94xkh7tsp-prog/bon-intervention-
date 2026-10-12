-- Extension isolée ; aucune modification des interventions, factures ou appareils.
CREATE TABLE IF NOT EXISTS jm_game_sessions (
 account TEXT NOT NULL, id TEXT NOT NULL, intervention_key TEXT NOT NULL,
 expires INTEGER NOT NULL, revision INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL,
 PRIMARY KEY(account,id)
);
CREATE INDEX IF NOT EXISTS jm_game_key ON jm_game_sessions(account,intervention_key);
