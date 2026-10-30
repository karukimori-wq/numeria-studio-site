-- NS-only canonical storage. Apply locally for verification; remote application requires release approval.
-- One CAS-protected aggregate makes quota checks and immutable version appends atomic.
CREATE TABLE IF NOT EXISTS character_collections (
  workspace_id TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  state_json TEXT NOT NULL CHECK (json_valid(state_json)),
  PRIMARY KEY (workspace_id, owner_user_id)
);
