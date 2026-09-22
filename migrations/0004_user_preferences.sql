CREATE TABLE IF NOT EXISTS user_preferences (
  scope_key TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  primary_divination TEXT NOT NULL DEFAULT 'numerology',
  enabled_divinations_json TEXT NOT NULL DEFAULT '["numerology"]',
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id
  ON user_preferences(user_id);
