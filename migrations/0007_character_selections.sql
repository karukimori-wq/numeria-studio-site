CREATE TABLE IF NOT EXISTS character_selections (
  workspace_id TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  character_version TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK(revision > 0),
  PRIMARY KEY(workspace_id, owner_user_id)
);
