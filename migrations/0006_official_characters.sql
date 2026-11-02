-- NS canonical official catalog. No production seed or remote application.
CREATE TABLE IF NOT EXISTS official_character_versions (
  character_id TEXT NOT NULL,
  character_version TEXT NOT NULL,
  name TEXT NOT NULL,
  surface_json TEXT NOT NULL CHECK(json_valid(surface_json)),
  hidden_json TEXT NOT NULL CHECK(json_valid(hidden_json)),
  PRIMARY KEY(character_id, character_version)
);
CREATE TABLE IF NOT EXISTS official_character_publications (
  character_id TEXT PRIMARY KEY,
  character_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('published','stopped')),
  FOREIGN KEY(character_id, character_version) REFERENCES official_character_versions(character_id, character_version)
);
CREATE TRIGGER IF NOT EXISTS official_version_no_update BEFORE UPDATE ON official_character_versions
BEGIN SELECT RAISE(ABORT, 'official_version_immutable'); END;
CREATE TRIGGER IF NOT EXISTS official_version_no_delete BEFORE DELETE ON official_character_versions
BEGIN SELECT RAISE(ABORT, 'official_version_immutable'); END;
