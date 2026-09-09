-- Numeria Studio D1 persistence foundation.
-- The Worker currently falls back to runtime memory until NUMERIA_DB is bound.

CREATE TABLE IF NOT EXISTS usage_records (
  scope_key TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  billing_month TEXT NOT NULL,
  plan_id TEXT NOT NULL DEFAULT 'free',
  monthly_appraisals INTEGER NOT NULL DEFAULT 0,
  appraisal_clients INTEGER NOT NULL DEFAULT 0,
  in_progress_appraisals INTEGER NOT NULL DEFAULT 0,
  active_draft_json TEXT,
  completed_appraisal_ids_json TEXT NOT NULL DEFAULT '[]',
  completed_appraisals_json TEXT NOT NULL DEFAULT '[]',
  report_exports_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_usage_records_identity_month
  ON usage_records (workspace_id, user_id, billing_month);

CREATE TABLE IF NOT EXISTS report_events (
  event_id TEXT PRIMARY KEY,
  scope_key TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  appraisal_id TEXT,
  report_type TEXT NOT NULL,
  format TEXT NOT NULL,
  branding TEXT NOT NULL,
  event_name TEXT NOT NULL DEFAULT 'studio.report.generated.v1',
  generated_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_report_events_scope_generated
  ON report_events (scope_key, generated_at DESC);
