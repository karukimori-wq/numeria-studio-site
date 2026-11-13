export class D1CharacterSelection {
  constructor(db) { this.db = db; }
  async read(scope) {
    const r = await this.db.prepare(`SELECT s.character_id, s.character_version, s.revision,
      CASE WHEN p.status = 'published' AND p.character_version = s.character_version THEN 1 ELSE 0 END AS available
      FROM character_selections s LEFT JOIN official_character_publications p ON p.character_id = s.character_id
      WHERE s.workspace_id = ? AND s.owner_user_id = ?`).bind(scope.workspaceId, scope.userId).first();
    return r ? { characterId: r.character_id, characterVersion: r.character_version, revision: r.revision, available: r.available === 1 } : null;
  }
  async save(scope, input) {
    if (!input || Array.isArray(input) || Object.keys(input).some(k => !['characterId','characterVersion','expectedRevision'].includes(k)) ||
      !['characterId','characterVersion'].every(k => typeof input[k] === 'string' && input[k].trim()) || !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) {
      throw Object.assign(new Error('CHARACTER_INPUT_INVALID'), { code:'CHARACTER_INPUT_INVALID' });
    }
    // Publication validation and selection CAS occur in one SQLite statement.
    const r = await this.db.prepare(`INSERT INTO character_selections
      (workspace_id, owner_user_id, character_id, character_version, revision)
      SELECT ?, ?, p.character_id, p.character_version, 1 FROM official_character_publications p
      WHERE p.character_id = ? AND p.character_version = ? AND p.status = 'published'
      AND (? = 0 OR EXISTS (SELECT 1 FROM character_selections s WHERE s.workspace_id = ? AND s.owner_user_id = ?))
      ON CONFLICT(workspace_id, owner_user_id) DO UPDATE SET character_id = excluded.character_id,
      character_version = excluded.character_version, revision = character_selections.revision + 1
      WHERE character_selections.revision = ?`).bind(scope.workspaceId,scope.userId,input.characterId,input.characterVersion,input.expectedRevision,scope.workspaceId,scope.userId,input.expectedRevision).run();
    if (r.meta.changes !== 1) throw Object.assign(new Error('CHARACTER_CONFLICT'), { code:'CHARACTER_CONFLICT' });
    return { characterId:input.characterId, characterVersion:input.characterVersion, revision:input.expectedRevision+1 };
  }
}
