-- Move the legacy Numeria workspace cloud snapshot from Supabase to D1.
-- This stores Numeria-owned appraisal profiles/history, saved presets, feedback UI state,
-- and report/template settings. localStorage remains a recovery/import source only.

CREATE TABLE IF NOT EXISTS workspace_states (
  scope_key TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  workspace_state_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_workspace_states_identity
  ON workspace_states (workspace_id, user_id);
