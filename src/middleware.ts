import { defineMiddleware } from "astro:middleware";

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "media-src 'self' https://res.cloudinary.com",
  "connect-src 'self' wss: https://cloudflareinsights.com",
  "worker-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
];

export const onRequest = defineMiddleware(async (_ctx, next) => {
  const response = await next();

  const ct = response.headers.get("content-type") ?? "";
  if (ct.startsWith("text/html") && !ct.includes("charset")) {
    response.headers.set("content-type", "text/html; charset=utf-8");
  }

  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  );

  if (ct.startsWith("text/html")) {
    response.headers.set("Content-Security-Policy", CSP_DIRECTIVES.join("; "));
  }

  return response;
});
