const CACHE_NAME = "neoflow-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/_astro/chat.dBHaC-tx.css",
  "/_astro/chat.astro_astro_type_script_index_0_lang.BX59MJrt.js",
  "https://fonts.googleapis.com/css2?family=Codystar&family=Geist+Mono:wght@300;400;500&family=Inter+Tight:wght@500;600;700&display=swap",
  "https://res.cloudinary.com/dgyocpguk/image/upload/v1769091295/flowoff/public/icon-512.webp",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)),
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "neo-chat-sync") {
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: "SYNC_READY" }));
      })
    );
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) return;

  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request)),
  );
});
