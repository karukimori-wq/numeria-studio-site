// Server-only foundation. Never serialize stored aggregates directly to a client.
// Authenticated scope/plan and official catalog must be resolved by a future HTTP adapter.
const LIMITS = Object.freeze({ free: 0, pro: 10, business: 30 });
const STATES = new Set(['draft', 'published', 'stopped', 'deleted']);
const fail = (code) => { throw Object.assign(new Error(code), { code }); };
const identifier = (value) => typeof value === 'string' && value.trim().length > 0;
const copy = (value) => structuredClone(value);

function parameters(value, count) {
  if (!Array.isArray(value) || value.length !== count ||
      Array.from(value).some((n) => !Number.isInteger(n) || n < 0 || n > 100 || n % 10 !== 0)) {
    fail('CHARACTER_PARAMETERS_INVALID');
  }
  return [...value];
}

function editable(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some((key) => !['name', 'surfaceParameters'].includes(key)) ||
      typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 120) {
    fail('CHARACTER_INPUT_INVALID');
  }
  return { name: input.name.trim(), surfaceParameters: parameters(input.surfaceParameters, 9) };
}

function scopeKey(scope) {
  if (!scope || !identifier(scope.workspaceId) || !identifier(scope.userId) ||
      !Object.hasOwn(LIMITS, scope.planId)) fail('CHARACTER_SCOPE_INVALID');
  return [scope.workspaceId, scope.userId];
}

// Explicit allowlist: no hidden settings or duplication provenance reaches user JSON.
function userView(character) {
  return {
    characterId: character.characterId,
    status: character.status,
    latestVersion: character.versions.length,
    publishedVersion: character.publishedVersion,
    versions: character.versions.map(({ version, name, surfaceParameters, savedAt }) =>
      ({ version, name, surfaceParameters: [...surfaceParameters], savedAt })),
  };
}

export class D1CharacterRepository {
  constructor(db) { this.db = db; }
  async read(scope) {
    const [workspaceId, userId] = scopeKey(scope);
    const row = await this.db.prepare('SELECT revision, state_json FROM character_collections WHERE workspace_id = ? AND owner_user_id = ?')
      .bind(workspaceId, userId).first();
    return row ? { revision: row.revision, state: JSON.parse(row.state_json) } : { revision: 0, state: [] };
  }
  async compareAndSwap(scope, revision, state) {
    const [workspaceId, userId] = scopeKey(scope);
    const sql = revision === 0
      ? 'INSERT INTO character_collections (workspace_id, owner_user_id, revision, state_json) VALUES (?, ?, 1, ?) ON CONFLICT DO NOTHING'
      : 'UPDATE character_collections SET revision = revision + 1, state_json = ? WHERE workspace_id = ? AND owner_user_id = ? AND revision = ?';
    const args = revision === 0 ? [workspaceId, userId, JSON.stringify(state)] : [JSON.stringify(state), workspaceId, userId, revision];
    const result = await this.db.prepare(sql).bind(...args).run();
    return result.meta.changes === 1;
  }
}

export class CharacterStore {
  constructor(repository, { now = () => new Date().toISOString(), id = () => crypto.randomUUID() } = {}) {
    this.repository = repository; this.now = now; this.id = id;
  }
  async list(scope) {
    scopeKey(scope);
    const { state } = await this.repository.read(scope);
    return state.filter((c) => c.status !== 'deleted').map(userView);
  }
  async mutate(scope, action) {
    scopeKey(scope);
    const { revision, state } = await this.repository.read(scope);
    const next = copy(state);
    const character = action(next);
    if (!await this.repository.compareAndSwap(scope, revision, next)) fail('CHARACTER_CONFLICT');
    return userView(character);
  }
  async create(scope, input, officialSource = null) {
    const fields = editable(input);
    // officialSource is server-resolved, never request-supplied.
    const inherited = officialSource === null ? null : (() => {
      if (officialSource.type !== 'preset' || officialSource.status !== 'published' ||
          !identifier(officialSource.characterId) || !identifier(officialSource.characterVersion)) fail('CHARACTER_SOURCE_INVALID');
      return { sourceCharacterId: officialSource.characterId, sourceVersion: officialSource.characterVersion,
        hiddenParameters: parameters(officialSource.hiddenParameters, 6),
        surfaceParameters: parameters(officialSource.surfaceParameters, 9) };
    })();
    return this.mutate(scope, (state) => {
      if (LIMITS[scope.planId] === 0) fail('CHARACTER_PLAN_REQUIRED');
      if (state.filter((c) => c.status !== 'deleted').length >= LIMITS[scope.planId]) fail('CHARACTER_LIMIT_REACHED');
      const characterId = this.id();
      if (!identifier(characterId) || state.some((c) => c.characterId === characterId)) fail('CHARACTER_ID_CONFLICT');
      const character = { characterId, status: 'draft', publishedVersion: null,
        versions: [{ version: 1, ...fields,
          surfaceParameters: inherited ? [...inherited.surfaceParameters] : fields.surfaceParameters,
          hiddenParameters: inherited?.hiddenParameters ?? null, savedAt: this.now() }],
        source: inherited ? { characterId: inherited.sourceCharacterId, version: inherited.sourceVersion } : null };
      state.push(character); return character;
    });
  }
  async save(scope, characterId, expectedVersion, input) {
    const fields = editable(input);
    return this.mutate(scope, (state) => {
      if (LIMITS[scope.planId] === 0) fail('CHARACTER_PLAN_REQUIRED');
      const c = state.find((item) => item.characterId === characterId && item.status !== 'deleted');
      if (!c) fail('CHARACTER_NOT_FOUND');
      if (!Number.isInteger(expectedVersion) || c.versions.length !== expectedVersion) fail('CHARACTER_CONFLICT');
      const previous = c.versions.at(-1);
      c.versions.push({ version: expectedVersion + 1, ...fields, hiddenParameters: copy(previous.hiddenParameters), savedAt: this.now() });
      if (c.status === 'published') c.publishedVersion = expectedVersion + 1;
      return c;
    });
  }
  async remove(scope, characterId, expectedVersion) {
    // Local soft deletion only. NP stop events and lifecycle endpoints are not connected yet.
    return this.mutate(scope, (state) => {
      const c = state.find((item) => item.characterId === characterId && item.status !== 'deleted');
      if (!c) fail('CHARACTER_NOT_FOUND');
      if (c.versions.length !== expectedVersion) fail('CHARACTER_CONFLICT');
      c.status = 'deleted'; c.publishedVersion = null; return c;
    });
  }
}

export const CHARACTER_STORAGE_STATES = Object.freeze([...STATES]);
