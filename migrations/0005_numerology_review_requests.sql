CREATE TABLE IF NOT EXISTS numerology_review_requests (
  request_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  calculation_version TEXT NOT NULL,
  scope_json TEXT NOT NULL,
  calculation_json TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  UNIQUE(workspace_id, user_id, session_id, input_hash)
);
