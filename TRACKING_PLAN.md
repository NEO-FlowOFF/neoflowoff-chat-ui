<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->
# PLANO DE TRACKING & MEDIÇÃO · NEØ:one

```text
========================================
     NEØ:One · MEASUREMENT MASTER PLAN
========================================
Status:  PROPOSTA (não implementado)
Escopo:  GA4 · Meta Ads · App/PWA · CRM
Autor:   Claude (sugestão técnica)
Data:    2026-06-07
========================================
```

> **Não implementar sem aprovação do operador.** Este documento é o desenho-alvo.
> O que JÁ está no ar: **apenas o GA4 (`gtag.js`, `G-5VD6EVN3C4`)** no `<head>` do
> `Base.astro`, com os domínios do Google liberados no CSP (`middleware.ts`).
> Tudo abaixo é proposta. Complementa o backlog de aquisição do `NEXTSTEPS.md`.

---

## ⟠ 1. Princípio de arquitetura

A medição deve ser **híbrida (browser + servidor)** com **deduplicação por `event_id`**.
Motivo: pixels só no browser perdem 20–40% dos eventos (ad blockers, ITP/Safari,
iOS, falhas de rede). O servidor (`/api/chat`) já é o ponto soberano onde o lead se
materializa — é o lugar certo para a verdade da conversão.

```text
                ┌─────────────────────────────────────────┐
                │              BROWSER (cliente)            │
                │  GA4 gtag  ·  Meta Pixel  ·  UTM capture  │
                └───────────────┬───────────────────────────┘
                                │ event_id (uuid) + utm_* no payload
                ┌───────────────▼───────────────────────────┐
                │           /api/chat (servidor)             │
                │  - persiste utm no Redis + leads (PG)      │
                │  - dispara Conversions API (Meta) server   │
                │  - dispara GA4 Measurement Protocol server │
                │  - reusa o MESMO event_id → dedup          │
                └───────────────┬───────────────────────────┘
                                │
                ┌───────────────▼───────────────────────────┐
                │  GA4  ·  Meta Events Manager  ·  Dashboard │
                └─────────────────────────────────────────────┘
```

**Regra de ouro:** o `event_id` é gerado **uma vez** no browser por evento e
reaproveitado na chamada server-side. Sem isso, conversões contam em dobro.

---

## ⧉ 2. Camada de eventos (taxonomia única)

Um único "event layer" no cliente (`src/scripts/tracking.ts`, a criar) que recebe
um evento canônico e faz fan-out para GA4, Meta e o backend. Nunca chamar `gtag()`
ou `fbq()` espalhado pelo código.

| Evento canônico        | Quando dispara                              | GA4 (`en`)              | Meta (event)        |
|---                     |---                                          |---                      |---                  |
| `page_view`            | carga da página                             | `page_view` (auto)      | `PageView`          |
| `chat_started`         | 1ª mensagem do usuário enviada              | `chat_started`          | `Lead` (custom)     |
| `lead_created`         | Regis grava lead com qualquer dado          | `generate_lead`         | `Lead`              |
| `qualified_lead`       | lead vira `qualificado = true`              | `qualified_lead`        | `CompleteRegistration` |
| `handoff_clicked`      | clique no link WhatsApp (após 10 msgs)      | `handoff_clicked`       | `Contact`           |
| `quote_requested`      | intenção de orçamento detectada (Regis)     | `quote_requested`       | `InitiateCheckout`  |
| `appointment_scheduled`| reunião marcada                             | `appointment_scheduled` | `Schedule`          |
| `pwa_installed`        | `appinstalled` do PWA                       | `pwa_installed`         | — (custom opcional) |

> Os nomes da coluna "evento canônico" batem com o backlog do `NEXTSTEPS.md`
> ("page_viewed, chat_started, lead_created, appointment_scheduled, qualified_lead,
> quote_requested"). Mantê-los estáveis — são a chave do dashboard.

---

## ⨷ 3. Meta Ads (Pixel + Conversions API)

### 3.1 Browser — Meta Pixel
- Adicionar o snippet do Pixel no `<head>` do `Base.astro` via `is:inline`
  (mesmo padrão do gtag), guardado atrás de **`PUBLIC_META_PIXEL_ID`** —
  só carrega se a env var existir (não hardcodar o ID).
- Eventos `track`/`trackCustom` saem da camada de eventos (§2), não soltos.

### 3.2 Servidor — Conversions API (CAPI)
- Novo módulo `src/lib/meta-capi.ts`: `POST https://graph.facebook.com/v21.0/<PIXEL_ID>/events`
  com `META_CAPI_TOKEN` (secret, server-only — **nunca** no cliente).
- Cada evento server-side envia:
  - `event_id` (o mesmo do browser → dedup)
  - `event_name`, `event_time`, `action_source: "website"`
  - `user_data` **hasheado em SHA-256** (email/telefone normalizados) — o Meta
    exige hash; PII crua nunca trafega.
  - `custom_data` com `utm_*` e valor estimado, se houver.

### 3.3 Variáveis de ambiente (novas)
```text
PUBLIC_META_PIXEL_ID=   # ID do Pixel (público, vai pro browser)
META_CAPI_TOKEN=        # Conversions API token (SECRET, server-only)
META_TEST_EVENT_CODE=   # opcional, p/ validar no Events Manager (Test Events)
```

### 3.4 CSP (obrigatório, senão o Pixel é bloqueado)
Adicionar em `CSP_DIRECTIVES` (`src/middleware.ts`):
```text
script-src   ... https://connect.facebook.net
img-src      ... https://www.facebook.com https://*.facebook.com
connect-src  ... https://www.facebook.com https://graph.facebook.com
```
(A CAPI server-side não precisa de CSP — sai do Node, não do browser.)

---

## ⧇ 4. App / PWA tracking

- `pwa_installed`: ouvir o evento `appinstalled` (já existe lógica de install em
  `chat-ui.ts`/InstallBanner) e disparar pela camada de eventos.
- `display-mode: standalone`: detectar se está rodando como app instalado e
  marcar como `session_context: "pwa"` nos eventos — separa tráfego app vs web.
- Push (futuro, já no backlog): quando `Web Push` entrar, medir `notification_sent`,
  `notification_clicked`.
- **Não** instrumentar o `sw.js` (regra crítica: PWA intocável sem autorização).
  O tracking de app fica na página, não no service worker.

---

## ⍟ 5. Atribuição UTM → CRM (campanha → lead)

Este é o elo que falta para "campanha → chat → Regis → dashboard".

### 5.1 Captura (cliente)
- No load, ler `location.search`: `utm_source, utm_medium, utm_campaign, utm_term,
  utm_content` + cliques de anúncio: `gclid` (Google), `fbclid` (Meta).
- Persistir em `localStorage` (`neo_attribution_v1`) com **first-touch** (não
  sobrescrever se já existir) — a primeira campanha que trouxe o visitante.
- Anexar esse objeto ao corpo do `POST /api/chat`.

### 5.2 Persistência (servidor)
- `/api/chat` repassa o objeto de atribuição para `upsertLead`.
- Gravar no Redis junto da sessão e em **novas colunas** da tabela `leads`.

### 5.3 Schema (PostgreSQL) — `ALTER` aditivo e idempotente em `db.ts`
```sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_source   TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_medium   TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_term     TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_content  TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS gclid        TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fbclid       TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS landing_path TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS referrer     TEXT;
```
- No `INSERT ... ON CONFLICT`, usar `COALESCE` igual aos campos atuais, mas
  **first-touch** para UTM (não sobrescrever uma atribuição já gravada).
- Atualizar a interface `Lead` em `leads.ts` com os campos novos.

> Lembrete operacional (MEMORY.md): a tabela `leads` é pequena; não remover
> índices por baixa contagem de scans. Snapshots de `leads` só sob demanda e
> **sem registrar PII**.

---

## ⬡ 6. Privacidade, consentimento e LGPD

- **Nunca** enviar PII (nome, email, telefone, conteúdo do chat, prompts) como
  parâmetro de evento de ads em texto puro. Meta CAPI exige **SHA-256**; GA4 não
  deve receber PII de forma alguma.
- **UTMs não são PII** — podem ir para eventos normalmente.
- **Consent Mode v2 (Google)** e banner de consentimento: hoje não há banner.
  Decisão pendente do operador — se for exigir consentimento, os pixels só
  disparam após o opt-in (`consent: denied` → `granted`).
- `gclid`/`fbclid` são identificadores de clique — tratar como sensível,
  não logar em claro nem expor em URL de terceiros.
- Respeitar `robots.txt`/Block AI Bots já configurado (não conflita).

---

## ◬ 7. Deduplicação (resumo prático)

| Plataforma | Browser | Servidor | Chave de dedup |
|---         |---      |---       |---             |
| Meta       | Pixel `track` | CAPI `events` | `event_id` (mesmo nos dois) + `event_name` |
| GA4        | `gtag` | Measurement Protocol | `client_id` + `session_id` + nome do evento |

Gerar `event_id = crypto.randomUUID()` no cliente, mandar no payload do `/api/chat`,
e reusar no disparo server-side. Validar no **Meta Test Events** e no **GA4 DebugView**.

---

## ✦ 8. Faseamento sugerido (ordem de execução)

```text
FASE 0 — JÁ FEITO
  └─ GA4 gtag.js + CSP. UTMs capturados nativamente nos relatórios do Google.

FASE 1 — Camada de eventos + UTM→CRM (first-party, sem ads externos)
  └─ src/scripts/tracking.ts (event layer)
  └─ captura utm/gclid/fbclid → localStorage first-touch → POST /api/chat
  └─ colunas utm_* em leads (ALTER idempotente) + interface Lead
  └─ eventos chat_started / lead_created / qualified_lead

FASE 2 — Meta Pixel (browser)
  └─ snippet atrás de PUBLIC_META_PIXEL_ID + CSP facebook
  └─ mapear eventos canônicos → eventos Meta

FASE 3 — Meta Conversions API (servidor)
  └─ src/lib/meta-capi.ts + META_CAPI_TOKEN (secret)
  └─ hash SHA-256 de email/telefone + event_id dedup
  └─ validar no Test Events

FASE 4 — App/PWA + GA4 server-side
  └─ pwa_installed, standalone context
  └─ GA4 Measurement Protocol p/ eventos server (opcional, reforça dedup)

FASE 5 — Dashboard de aquisição
  └─ consolidar visitas → chat → lead → qualificado → reunião por campanha
  └─ fonte: tabela leads (utm_*) + GA4 + Meta Events Manager
```

---

## ⚙ 9. Checklist de arquivos a tocar (quando for implementar)

| Arquivo | Mudança |
|---      |---      |
| `src/scripts/tracking.ts` | **novo** — camada de eventos / fan-out |
| `src/scripts/chat-ui.ts`  | captura UTM, anexa attribution + event_id no POST |
| `src/pages/api/chat.ts`   | recebe attribution/event_id, repassa a leads + CAPI |
| `src/lib/leads.ts`        | interface `Lead` + colunas utm no upsert (first-touch) |
| `src/lib/db.ts`           | `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` utm_* |
| `src/lib/meta-capi.ts`    | **novo** — Conversions API server-side |
| `src/layouts/Base.astro`  | Meta Pixel `is:inline` atrás de `PUBLIC_META_PIXEL_ID` |
| `src/middleware.ts`       | CSP: liberar facebook.net / facebook.com / graph.facebook.com |
| `.env.example`            | documentar novas envs |

---

## ⛔ 10. Restrições herdadas (não violar)

- **PWA intocável**: não instrumentar `sw.js`, manifest, splash ou registro do SW.
- **CSP**: todo recurso novo de terceiro exige entrada em `CSP_DIRECTIVES` ou é
  bloqueado (ver §3.4). Validar no preview (console sem violação) antes de subir.
- **Secrets**: `META_CAPI_TOKEN` e afins são server-only; apenas `PUBLIC_*` vai
  ao browser. Nunca commitar valores.
- **PII**: nada de dados pessoais em eventos de ads sem hash (Meta) ou nunca (GA4).
- **`packageManager`**: manter `pnpm@10.33.0` pinado (regra crítica do build).

```text
────────────────────────────────────────
▓▓▓ Neo Mello
────────────────────────────────────────
Fundador · NEO FlowOFF
neo@neoflowoff.agency

"Campanha → chat → Regis → proposta →
 dashboard. Controle humano e auditável."
────────────────────────────────────────
```
