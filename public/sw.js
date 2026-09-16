// Service worker mínimo do Broto PDF (PWA instalável).
// Estratégia conservadora: só faz cache de assets estáticos e imutáveis
// (/_next/static e ícones). NUNCA faz cache de navegações HTML nem de /api —
// o app é autenticado e o conteúdo é privado, então essas rotas vão sempre à
// rede para não servir dados velhos ou de outra sessão.
const CACHE = "broto-static-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) =>
      c.addAll(["/icon-192.png", "/icon-512.png", "/manifest.webmanifest"]).catch(() => {})
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const cacheable =
    url.pathname.startsWith("/_next/static/") ||
    /\.(png|svg|ico|webmanifest|woff2?)$/.test(url.pathname);

  if (!cacheable) return; // HTML e /api sempre pela rede (padrão do navegador)

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
  );
});
