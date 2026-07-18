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

**Sempre usar a versão exata do pnpm** fixada no `packageManager` deste
repositório. Não confiar em resolução automática de `latest`.
`NEO-FlowOFF` é um control plane multi-repo; este child repo é soberano e
mantém seu próprio `package.json`, lockfile, instalação e runtime.

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

Vitest cobre os helpers de Redis e leads. A validação mínima é
`pnpm run test`, `pnpm run check` e `pnpm run build`.

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

O handoff é controlado no backend. Regis estrutura o lead e `leads.ts`
aciona Resend quando há contato e sinal comercial suficientes. Não existe
gatilho ativo de handoff no cliente baseado em dez mensagens.

### PWA / offline

`public/sw.js` caches shell URLs and uses Background Sync (`neo-chat-sync` tag) to signal the page when connectivity returns. Offline messages are stored in IndexedDB via `src/lib/idb-queue.ts` and flushed on reconnect.

**⚠️ PWA is highly calibrated across multiple browsers.** Do NOT touch `public/sw.js`, service worker registration logic, manifest, splash screens, cache strategy, or any offline/install logic without explicit authorization from the operator. The balance between browsers took significant effort to achieve.

## Environment variables

```bash
| Variable        | Required  | Description                                         |
|---              |---        |---                                                  |
| `ASI1_API_KEY`  | Yes       | LLM API key for asi1.ai                             |
| `ASI1_MODEL`    | No        | Model name (default: `"asi1"`)                      |
| `REDIS_URL`     | No        | Redis Cloud connection; session memory disabled if absent. Password is embedded in the URL (`redis://default:<pwd>@host:port`) — there is NO separate `REDIS_PASSWORD` var. Use `rediss://` if the provider requires TLS. |
| `DATABASE_URL`  | No        | Postgres HA no Railway via PgBouncer; Regis lead capture disabled if absent. |
| `RESEND_API_KEY`| No        | Resend API key; email handoff/summary disabled if absent |
| `RESEND_FROM`   | No        | Sender (default `neo@neoflowoff.agency`); domain must be verified in Resend |
| `RESEND_TO`     | No        | Handoff/summary recipient + `reply_to` to lead (default `neo@neoflowoff.agency`) |
| `PUBLIC_META_PIXEL_ID` | No | Meta Pixel ID exposed to the browser; Pixel loading requires visitor consent. |
| `META_CAPI_TOKEN` | No | Meta CAPI server-only token; never expose it to the browser or logs. |
```

See `.env.example` for format. Redis, PostgreSQL and Resend are all optional for local development — the app degrades gracefully when they are absent.

**Resend is called directly** over HTTPS (`https://api.resend.com/emails`, see `src/lib/emails.ts`) using only `RESEND_API_KEY`. It does NOT require a separate Railway service — a standalone "Resend Starter" service is redundant and was removed (2026-06-07).

GA4, Meta Pixel e Meta CAPI possuem implementação ativa. GA4 e Meta Pixel
só carregam após opt-in salvo em `neo_consent_v1`; a CAPI também exige
`consent.status === "granted"`. Revogação fica disponível em `/privacidade`.

## Key files

- `src/scripts/chat-ui.ts` — entire client-side runtime: rendering, streaming, and offline queue. All UI logic lives here.
- `src/pages/api/chat.ts` — the only backend endpoint that matters; proxies LLM + triggers Regis
- `src/middleware.ts` — security headers (HSTS, CSP, X-Frame-Options, etc.) + charset fix. CSP directives centralized in `CSP_DIRECTIVES`.
- `src/lib/system-prompt.md` — agent identity and guardrails (loaded server-side only)
- `src/lib/CONTEXT.json` — structured ground-truth data: contact info, handoff rules, pricing, guardrails
- `public/sw.js` — service worker; uses `skipWaiting` + `clients.claim()` for immediate activation
- `public/robots.txt` — permite Googlebot; bloqueia `/api/` e bots de treino de IA (GPTBot, ClaudeBot, CCBot, etc.)
- `astro.config.mjs` — inclui `@astrojs/sitemap`; gera `/sitemap-index.xml` no build

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

**Analytics no CSP:** o CSP libera `https://www.googletagmanager.com` (script + img) e `https://*.google-analytics.com` / `https://*.analytics.google.com` (connect + img) para o GA4 (`gtag.js`). Ao adicionar qualquer analytics/pixel novo, atualizar `CSP_DIRECTIVES` no `middleware.ts` ou o recurso é bloqueado.

## SEO

- Canonical: `https://chat.neoflowoff.agency/chat`
- Sitemap: `https://chat.neoflowoff.agency/sitemap-index.xml` (gerado pelo `@astrojs/sitemap`; `robots.txt` aponta para ele). `/sitemap.xml` NÃO existe — não referenciar.
- JSON-LD: `WebApplication` + `Organization` em `src/layouts/Base.astro`
- Conteúdo estático indexável em `EmptyState.astro` (visually hidden via CSS clip, legível por crawlers)
- GA4 (`gtag.js`, ID `G-5VD6EVN3C4`) no `<head>` do `Base.astro` via `is:inline`, ao lado do Cloudflare Web Analytics.

## Security — resolved

`formatMarkdown` em `chat-ui.ts:45` valida scheme do href com `/^https?:\/\//i` antes de injetar via `innerHTML`. URIs `javascript:` são substituídas por `#`. **Vulnerabilidade resolvida.**

**Validação de Origin no `POST /api/chat` (2026-06-07):** a checagem antiga usava `origin.includes(host)` + `origin.includes("neoflowoff.agency")` e permitia requests **sem** Origin — três bypasses (no-Origin via curl/bots consumindo o ASI1 pago; sufixo forjado `...agency.evil.com`; substring `neoflowoff.agency.attacker.com`). Substituída por `isAllowedOrigin()` em `src/pages/api/chat.ts`: parse via `URL`, match **exato** de hostname contra `ALLOWED_HOSTS`, sufixo real `.neoflowoff.agency`, e bloqueio de no-Origin. **Resolvida.** Nota: `GET /api/history` não tem Origin-gate (navegador não envia Origin confiável em GET); o `sessionId` UUID é o guard.

## teaBASE — Autenticação e Dotfiles

O **teaBASE** é uma macOS Preference Pane instalada em `/Library/PreferencePanes/teaBASE.prefPane/` que atua como camada de autenticação e sincronização de configuração no nível do SO. É o gerenciador canônico de identidade neste ambiente.

**O que ele controla:**

- **SSH keys e GPG** — todos os commits são assinados e autenticados via teaBASE. `git push` via SSH funciona sem configuração adicional.
- **`~/.gitconfig`** — não alterar sem instrução explícita do operador. Sempre usar remotes SSH (`git@github.com:...`), nunca HTTPS.
- **`~/.zshrc`** — sincronizado a cada ~10 minutos para o repo privado `neomello/dotfiles`. Nunca editar diretamente; propor mudanças e o operador aplica.
- **npm auth para `@neo-protocol`** — o `.npmrc` do workspace delega auth ao teaBASE (`@neo-protocol:registry=https://npm.pkg.github.com`); não há token explícito no arquivo porque a autenticação é gerenciada no nível do SO.

**Por que `gh pr create` falha com HTTP 401:**

O `gh` CLI usa token OAuth próprio armazenado no keyring do macOS — independente do teaBASE. Esse token pode expirar ou pertencer à conta errada. Como o teaBASE não gerencia o token do `gh`, PRs devem ser criados manualmente no GitHub após o `git push` (que funciona via SSH gerenciado pelo teaBASE).

**Regra operacional:** `git push` → sempre funciona. `gh pr create` → falha com 401; criar PR pela UI do GitHub usando a URL impressa no output do push.
