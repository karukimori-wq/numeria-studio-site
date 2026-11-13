import { CharacterStore, D1CharacterRepository } from './character-store.js';
import { fetchGrowthSubscriptionEntitlement } from './growth-subscription-source.js';
import { D1OfficialCharacterCatalog } from './official-character-catalog.js';
import { D1CharacterSelection } from './character-selection.js';
import { readCharacterBody } from './character-request-body.js';

const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
// Personal workspace only until verified organization membership is available.
// No request-provided identity, workspace, plan or official snapshot is trusted.
export function createCharacterApi({ coreWorker, entitlement = fetchGrowthSubscriptionEntitlement, repository, catalog } = {}) {
  return async (request, env, ctx) => {
    if (env.CHARACTER_API_ENABLED !== '1' || env.AUTH_ENFORCEMENT_MODE !== 'enforce') return reply(503, { errorCode: 'CHARACTER_API_UNAVAILABLE' });
    try {
      const authUrl = new URL(request.url); authUrl.pathname = '/auth/status'; authUrl.search = '';
      const authResponse = await coreWorker.fetch(new Request(authUrl, { headers: request.headers }), env, ctx);
      const auth = await authResponse.json();
      if (!authResponse.ok || auth.incomingRequestVerified !== true || typeof auth.incomingRequestUserId !== 'string' || !auth.incomingRequestUserId.trim() || auth.incomingRequestUserId === 'anonymous') return reply(401, { errorCode: 'AUTH_REQUIRED' });
      const workspaceId = 'ws_personal', userId = auth.incomingRequestUserId;
      const subscription = await entitlement(env, { workspaceId, ownerUserId: userId });
      const e = subscription.entitlement;
      if (!subscription.ok || !e || e.workspaceId !== workspaceId || e.ownerUserId !== userId || e.productCode !== 'numeria-studio' || e.source !== 'growth-engine' || !['free', 'pro'].includes(e.planId)) return reply(503, { errorCode: 'CHARACTER_ENTITLEMENT_UNAVAILABLE' });
      if (e.planId === 'pro' && (e.entitlementStatus !== 'active' || (e.validUntil !== null && (!Number.isFinite(Date.parse(e.validUntil)) || Date.parse(e.validUntil) <= Date.now())))) return reply(403, { errorCode: 'CHARACTER_ENTITLEMENT_INACTIVE' });
      const db = env.NUMERIA_DB || env.DB || env.D1;
      if (!repository && !db) return reply(503, { errorCode: 'CHARACTER_STORAGE_UNAVAILABLE' });
      const store = new CharacterStore(repository || new D1CharacterRepository(db));
      const scope = { workspaceId, userId, planId: e.planId };
      const url = new URL(request.url);
      if (url.search) return reply(400, { errorCode: 'CHARACTER_QUERY_NOT_SUPPORTED' });
      const historyMatch = url.pathname.match(/^\/api\/characters\/([A-Za-z0-9_-]+)\/versions$/);
      if (request.method === 'GET' && historyMatch) return reply(200, { character: await store.history(scope, historyMatch[1]) });
      if (request.method === 'GET' && url.pathname === '/api/characters/selection') return reply(200, { selection: await new D1CharacterSelection(db).read(scope) });
      if (request.method === 'GET' && url.pathname === '/api/characters/official') return reply(200, { characters: await (catalog || new D1OfficialCharacterCatalog(db)).list() });
      if (request.method === 'GET' && url.pathname === '/api/characters') return reply(200, { characters: await store.list(scope), capabilities: { canCreate: scope.planId === 'pro', customLimit: scope.planId === 'pro' ? 10 : 0 } });
      if (!['POST', 'PUT'].includes(request.method)) return reply(405, { errorCode: 'METHOD_NOT_ALLOWED' });
      if (!request.headers.get('content-type')?.startsWith('application/json')) return reply(415, { errorCode: 'JSON_REQUIRED' });
      // Bearer authentication is required for mutations; cookie-only requests cannot mutate.
      if (!/^Bearer\s+\S+$/i.test(request.headers.get('authorization') || '')) return reply(401, { errorCode: 'BEARER_REQUIRED' });
      const raw = await readCharacterBody(request);
      let body; try { body = JSON.parse(raw); } catch { return reply(400, { errorCode: 'INVALID_JSON' }); }
      if (request.method === 'PUT' && url.pathname === '/api/characters/selection') return reply(200, { selection: await new D1CharacterSelection(db).save(scope, body) });
      if (request.method === 'POST' && url.pathname === '/api/characters/duplicate') {
        if (!body || Array.isArray(body) || Object.keys(body).some(k => !['name', 'sourceCharacterId', 'sourceCharacterVersion'].includes(k)) || !['sourceCharacterId', 'sourceCharacterVersion'].every(k => typeof body[k] === 'string' && body[k].trim())) return reply(400, { errorCode: 'CHARACTER_INPUT_INVALID' });
        if (scope.planId === 'free') return reply(403, { errorCode: 'CHARACTER_PLAN_REQUIRED' });
        const source = await (catalog || new D1OfficialCharacterCatalog(db)).published(body.sourceCharacterId, body.sourceCharacterVersion);
        if (!source) return reply(409, { errorCode: 'CHARACTER_SOURCE_UNAVAILABLE' });
        return reply(201, { character: await store.create(scope, { name: body.name, surfaceParameters: source.surfaceParameters }, source) });
      }
      if (request.method === 'POST' && url.pathname === '/api/characters') return reply(201, { character: await store.create(scope, body) });
      const match = url.pathname.match(/^\/api\/characters\/([A-Za-z0-9_-]+)$/);
      if (request.method === 'PUT' && match) {
        if (!body || Object.keys(body).some(k => !['name', 'surfaceParameters', 'expectedVersion'].includes(k))) return reply(400, { errorCode: 'CHARACTER_INPUT_INVALID' });
        return reply(200, { character: await store.save(scope, match[1], body.expectedVersion, { name: body.name, surfaceParameters: body.surfaceParameters }) });
      }
      return reply(404, { errorCode: 'NOT_FOUND' });
    } catch (error) {
      const code = error?.code;
      if (code === 'BODY_TOO_LARGE') return reply(413, { errorCode: code });
      if (code === 'INVALID_JSON') return reply(400, { errorCode: code });
      const status = code === 'CHARACTER_NOT_FOUND' ? 404 : code === 'CHARACTER_CONFLICT' ? 409 : code === 'CHARACTER_PLAN_REQUIRED' ? 403 : code === 'CHARACTER_LIMIT_REACHED' ? 409 : ['CHARACTER_INPUT_INVALID', 'CHARACTER_PARAMETERS_INVALID'].includes(code) ? 400 : 503;
      return reply(status, { errorCode: status === 503 ? 'CHARACTER_SERVICE_UNAVAILABLE' : code });
    }
  };
}
