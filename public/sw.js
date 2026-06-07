const CACHE_NAME = "neoflow-v4";

// Apenas shell estático sem hashes — assets Astro são servidos network-first
const SHELL_URLS = [
  "/",
  "/chat",
  "/manifest.json",
  "/favicon.ico",
  "/splash_chat.mp4",
  "https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300;400;500&family=Inter+Tight:wght@400;500;600;700&display=swap",
  "https://res.cloudinary.com/dgyocpguk/image/upload/v1769091295/flowoff/public/icon-512.webp",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
});

// Recebe sinal do cliente para assumir controle imediatamente
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// Assume controle de todas as abas abertas e limpa caches antigos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "neo-chat-sync") {
    event.waitUntil(
      self.clients
        .matchAll({ includeUncontrolled: true, type: "window" })
        .then((clients) =>
          clients.forEach((client) => client.postMessage({ type: "SYNC_READY" }))
        )
    );
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API e assets com hash do Astro: sempre network-first, sem cache
  if (
    (url.origin === self.location.origin && url.pathname.startsWith("/api/")) ||
    url.pathname.startsWith("/_astro/")
  ) return;

  // Shell e assets estáticos: cache-first com fallback de rede
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
