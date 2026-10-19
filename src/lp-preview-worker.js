// Public, fully isolated LP preview Worker. Do not add app, D1, auth, payment, or API bindings.
function withHeaders(response, isHtml = false) {
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  if (isHtml) {
    headers.set("Content-Type", "text/html; charset=utf-8");
    headers.set("Cache-Control", "no-store, max-age=0");
    headers.set("Content-Security-Policy", "default-src 'none'; base-uri 'none'; object-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; frame-ancestors 'none'");
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { "Allow": "GET, HEAD", "X-Robots-Tag": "noindex" } });
    }
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "/welcome" || url.pathname === "/welcome/") {
      const source = new URL("/", request.url);
      const response = await env.ASSETS.fetch(new Request(source.toString(), request));
      return withHeaders(response, true);
    }
    if (url.pathname === "/favicon.svg" || url.pathname === "/assets/tarot-decks/cards/celestialcosmos-major-17.webp" || url.pathname === "/assets/divination-visuals/western-astrology-wheel-v1.png") {
      return withHeaders(await env.ASSETS.fetch(request));
    }
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  }
};
