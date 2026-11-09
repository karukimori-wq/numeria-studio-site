export async function readCharacterBody(request, limit = 8192) {
  const declared = request.headers.get('content-length');
  const reject = code => { throw Object.assign(new Error(code), { code }); };
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > limit)) reject('BODY_TOO_LARGE');
  if (!request.body) return '';
  const reader = request.body.getReader(), decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0, text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { reader.cancel().catch(() => {}); reject('BODY_TOO_LARGE'); }
      try { text += decoder.decode(value, { stream: true }); } catch { reject('INVALID_JSON'); }
    }
    try { return text + decoder.decode(); } catch { reject('INVALID_JSON'); }
  } finally { reader.releaseLock(); }
}
