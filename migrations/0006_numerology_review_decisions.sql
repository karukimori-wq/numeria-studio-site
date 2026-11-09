CREATE TABLE IF NOT EXISTS numerology_review_decisions (
  decision_id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE REFERENCES numerology_review_requests(request_id),
  workspace_id TEXT NOT NULL,
  reviewer_user_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK(decision IN ('approved', 'returned')),
  note TEXT NOT NULL,
  approval_json TEXT,
  decided_at TEXT NOT NULL
);
