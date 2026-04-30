const CACHE = "neoone-v1.0.3";

const SHELL = ["/", "/chat"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Ignora esquemas não suportados (ex: chrome-extension:, data:, blob:)
  if (!(url.protocol === "http:" || url.protocol === "https:")) return;

  // Apenas mesma origem
  if (url.origin !== self.location.origin) return;

  // API calls nunca vão para cache
  if (url.pathname.startsWith("/api/")) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      return (
        cached ||
        fetch(e.request).then((res) => {
          // Só cacheia respostas válidas
          if (!res || !res.ok || res.type === "opaque") return res;
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return res;
        })
      );
    }),
  );
});
