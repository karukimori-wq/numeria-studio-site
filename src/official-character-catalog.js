export class D1OfficialCharacterCatalog {
  constructor(db) { this.db = db; }
  async list() {
    const rows = await this.db.prepare(`SELECT v.character_id, v.character_version, v.name, v.surface_json
      FROM official_character_publications p JOIN official_character_versions v
      ON p.character_id = v.character_id AND p.character_version = v.character_version
      WHERE p.status = 'published' ORDER BY v.character_id`).all();
    return rows.results.map(r => ({ characterId: r.character_id, characterVersion: r.character_version,
      name: r.name, surfaceParameters: JSON.parse(r.surface_json), type: 'preset' }));
  }
  async published(characterId, characterVersion) {
    const row = await this.db.prepare(`SELECT v.* FROM official_character_publications p
      JOIN official_character_versions v ON p.character_id = v.character_id AND p.character_version = v.character_version
      WHERE p.status = 'published' AND p.character_id = ? AND p.character_version = ?`).bind(characterId, characterVersion).first();
    return row ? { characterId: row.character_id, characterVersion: row.character_version, name: row.name,
      surfaceParameters: JSON.parse(row.surface_json), hiddenParameters: JSON.parse(row.hidden_json), type: 'preset', status: 'published' } : null;
  }
}
