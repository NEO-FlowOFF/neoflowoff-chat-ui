import { defineMiddleware } from "astro:middleware";
import { ensureLeadsTable, ensureSuspiciousEventsTable } from "./lib/db";
import { logger } from "@/lib/logger";

// Flag para garantir que a inicialização só roda uma vez
let initialized = false;

// ─── Content Security Policy ────────────────────────────────────────────────
// Atualizar aqui quando adicionar recursos de terceiros.
// Facebook (connect.facebook.net, www.facebook.com, graph.facebook.com)
// é necessário para o Meta Pixel browser + Conversions API.
const CSP_DIRECTIVES = [
  "default-src 'self'",
  // Scripts: Astro inline + gtag + Cloudflare Analytics + Meta Pixel
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com https://connect.facebook.net",
  // Estilos: Astro inline + Google Fonts
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Fontes
  "font-src 'self' https://fonts.gstatic.com",
  // Imagens: próprio domínio + OG image + Facebook noscript pixel
  "img-src 'self' data: https://chat.neoflowoff.agency https://www.facebook.com https://*.facebook.com",
  // Conexões: LLM API + Redis (server-side apenas) + GA4 + Meta
  "connect-src 'self' https://api.asi1.ai https://www.google-analytics.com https://*.analytics.google.com https://www.facebook.com https://graph.facebook.com https://cloudflareinsights.com",
  // Mídia: vídeo local
  "media-src 'self'",
  // Frames: bloqueia embedding
  "frame-ancestors 'self'",
  // Manifesto PWA
  "manifest-src 'self'",
  // Workers (SW)
  "worker-src 'self'",
].join("; ");

export const onRequest = defineMiddleware(async (_context, next) => {
  // Inicializa as tables na primeira requisição
  if (!initialized) {
    initialized = true;
    logger.info("INIT", "Inicializando banco de dados...");

    try {
      await ensureLeadsTable();
      await ensureSuspiciousEventsTable();
      logger.info("INIT", "Banco de dados inicializado com sucesso!");
    } catch (error) {
      logger.error("INIT", "Erro ao inicializar banco de dados", error);
      // Continua mesmo com erro, para não bloquear o servidor
    }
  }

  const response = await next();

  // Aplica headers de segurança apenas em respostas HTML (não em API/SSE)
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
    response.headers.set("Content-Security-Policy", CSP_DIRECTIVES);
  }

  return response;
});
