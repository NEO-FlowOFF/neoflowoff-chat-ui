# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⛔ REGRA CRÍTICA — Corepack / pnpm no build (Railway) — INTOCÁVEL sem autorização

**NUNCA usar `corepack@latest` com `corepack prepare --activate` (sem versão pinada) no build/deploy.**

`corepack prepare --activate` sem versão explícita resolve o pnpm para uma versão que **não existe no
registry** (ex.: `pnpm@13.0.0` → HTTP 404 em `registry.npmjs.org/pnpm/-/pnpm-13.0.0.tgz`), e o build do
Railway falha com:

```text
Internal Error: Server answered with HTTP 404 ... pnpm-13.0.0.tgz
Build Failed: ... "npm i -g corepack@latest && corepack enable && corepack prepare --activate" did not complete successfully: exit code: 1
```

Causa: `corepack@latest` traz um default de pnpm hardcoded mais novo que o publicado; `--activate` sem
versão usa esse default em vez do campo `packageManager`.

**Sempre pinar a versão exata do pnpm** que bate com `packageManager` da raiz do monorepo
(`/Users/nettomello/neomello/NEO-FlowOFF/package.json` → `pnpm@10.33.0`). Não confiar em resolução
automática de "latest". Este projeto é um package do monorepo `NEO-FlowOFF`; `install`/overrides são na raiz.

## Commands

```bash
pnpm run dev          # start dev server (localhost:4321)
pnpm run build        # production build → dist/
pnpm run check        # TypeScript check (astro check)
pnpm run start        # run production build (HOST=0.0.0.0)
pnpm run preview      # preview production build locally

make verify           # full pre-commit check: node version + audit + astro check + build
make commit           # verify + git add + interactive commit + push
make repair           # clean dist/.astro/ + rm node_modules + reinstall
```

There is no test suite. `astro check` is the primary correctness gate.

## Architecture

This is an **Astro SSR app** (Node standalone adapter) deployed on Railway. It serves a single-page chat UI at `/chat` where users interact with **NEØ:one**, an AI lead-qualification agent for the NEØ FlowOFF digital agency.

### Request flow

```bash
Browser (chat-ui.ts)
  → POST /api/chat          ← streams SSE from ASI1 LLM API
  → GET  /api/history       ← fetches session history from Redis
```

`src/pages/api/chat.ts` is the security gateway:

1. Validates `Origin` header against allowed origins
2. Reads `src/lib/system-prompt.md` and `src/lib/CONTEXT.json` from disk at runtime — these are **never bundled into the client**
3. Prepends a `role: "system"` message to the history before forwarding to ASI1
4. Streams the LLM response back as SSE
5. After stream ends: saves history to Redis and triggers Regis (lead extraction)

### Regis — silent CRM extractor

`src/lib/regis.ts` runs a second ASI1 call on every completed response, asking the LLM to extract structured lead data (name, email, phone, company, intent) from the conversation. Results are upserted into PostgreSQL via `src/lib/leads.ts`. **Never mention Regis to users — it is invisible.**

### Session and memory model

```bash
| Layer           | Storage                             | Scope                                             |
|---              |---                                  |---                                                |
| `sessionId`     | `localStorage`                      | Persists across page loads; reset on "clear chat" |
| Chat history    | `localStorage` (`flow_history_v1`)  | Up to 40 messages; synced from Redis on load      |
| Session history | Redis (`chat:{sessionId}`)          | 7-day TTL; source of truth for server             |
| Offline queue   | IndexedDB (`neo-offline-queue`)     | Messages queued when network is unavailable       |
```

### Handoff trigger

After **10 messages** in a session (`MAX_SESSION_MESSAGES`), `chat-ui.ts` dynamically imports `CONTEXT.json` client-side and renders a WhatsApp link to hand the user off to the real Neo Mello. Input is then disabled.

### PWA / offline

`public/sw.js` caches shell URLs and uses Background Sync (`neo-chat-sync` tag) to signal the page when connectivity returns. Offline messages are stored in IndexedDB via `src/lib/idb-queue.ts` and flushed on reconnect.

**⚠️ PWA is highly calibrated across multiple browsers.** Do NOT touch `public/sw.js`, service worker registration logic, manifest, splash screens, cache strategy, or any offline/install logic without explicit authorization from the operator. The balance between browsers took significant effort to achieve.

## Environment variables

```bash
| Variable        | Required  | Description                                         |
|---              |---        |---                                                  |
| `ASI1_API_KEY`  | Yes       | LLM API key for asi1.ai                             |
| `ASI1_MODEL`    | No        | Model name (default: `"asi1"`)                      |
| `REDIS_URL`     | No        | Redis Cloud connection; session memory disabled if absent |
| `DATABASE_URL`  | No        | PostgreSQL; Regis lead capture disabled if absent   |
```

See `.env.example` for format. Both Redis and PostgreSQL are optional for local development — the app degrades gracefully when they are absent.

## Key files

- `src/scripts/chat-ui.ts` — entire client-side runtime: rendering, streaming, and offline queue. All UI logic lives here.
- `src/pages/api/chat.ts` — the only backend endpoint that matters; proxies LLM + triggers Regis
- `src/middleware.ts` — security headers (HSTS, CSP, X-Frame-Options, etc.) + charset fix. CSP directives centralized in `CSP_DIRECTIVES`.
- `src/lib/system-prompt.md` — agent identity and guardrails (loaded server-side only)
- `src/lib/CONTEXT.json` — structured ground-truth data: contact info, handoff rules, pricing, guardrails
- `public/sw.js` — service worker; uses `skipWaiting` + `clients.claim()` for immediate activation
- `public/robots.txt` — permite Googlebot; bloqueia `/api/` e bots de treino de IA (GPTBot, ClaudeBot, CCBot, etc.)
- `astro.config.mjs` — inclui `@astrojs/sitemap`; gera `/sitemap.xml` no build

## Security headers

Todos os headers são aplicados em `src/middleware.ts`:

| Header | Valor |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | camera, mic, geo, payment, usb desabilitados |
| `Content-Security-Policy` | apenas em respostas HTML; ver `CSP_DIRECTIVES` |

O CSP usa `'unsafe-inline'` em `script-src` e `style-src` porque o Astro injeta scripts inline (View Transitions, tema, SW). Migração para nonces depende de suporte nativo do Astro — manter no backlog.

## SEO

- Canonical: `https://chat.neoflowoff.agency/chat`
- Sitemap: `https://chat.neoflowoff.agency/sitemap.xml` (gerado pelo `@astrojs/sitemap`)
- JSON-LD: `WebApplication` + `Organization` em `src/layouts/Base.astro`
- Conteúdo estático indexável em `EmptyState.astro` (visually hidden via CSS clip, legível por crawlers)

## Known issues

`chat-ui.ts` contains duplicate function definitions (`loadHistory`, `saveHistory`, `streamProxy`, `renderTyping`, `scrollToBottom`, etc.) because `handleSend` redeclares helpers that already exist in outer scope. This is a bug, not intentional — the inner declarations shadow the outer ones during `handleSend` execution.

## Security — resolved

`formatMarkdown` em `chat-ui.ts:45` valida scheme do href com `/^https?:\/\//i` antes de injetar via `innerHTML`. URIs `javascript:` são substituídas por `#`. **Vulnerabilidade resolvida.**
