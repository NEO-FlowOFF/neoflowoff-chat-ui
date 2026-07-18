import { defineMiddleware } from "astro:middleware";
import { ensureLeadsTable, ensureSuspiciousEventsTable } from "./lib/db";
import { logger } from "@/lib/logger";
import { timingSafeEqual } from "node:crypto";

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

function credentialsMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.url.pathname.startsWith("/admin")) {
    const dashboardUser = process.env.DASHBOARD_USER;
    const dashboardPassword = process.env.DASHBOARD_PASSWORD;

    if (!dashboardUser || !dashboardPassword) {
      return new Response("Dashboard indisponível: credenciais não configuradas.", {
        status: 503,
      });
    }

    const authorization = context.request.headers.get("authorization");
    const encodedCredentials = authorization?.startsWith("Basic ")
      ? authorization.slice(6)
      : "";

    let username = "";
    let password = "";
    try {
      [username, password] = Buffer.from(encodedCredentials, "base64")
        .toString("utf8")
        .split(":", 2);
    } catch {
      // Credencial inválida segue para o desafio HTTP abaixo.
    }

    if (
      !credentialsMatch(username, dashboardUser) ||
      !credentialsMatch(password, dashboardPassword)
    ) {
      return new Response("Autenticação necessária.", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="NEO Dashboard"' },
      });
    }
  }

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
    if (context.url.pathname.startsWith("/admin")) {
      response.headers.set("Cache-Control", "no-store, private");
      response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    }
  }

  return response;
});
