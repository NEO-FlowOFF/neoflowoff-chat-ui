<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->

# PLANO DE TRACKING & MEDIÇÃO · NEØ:one

```text
========================================
     NEØ:One · MEASUREMENT MASTER PLAN
========================================
Status:  PARCIALMENTE IMPLEMENTADO
Escopo:  GA4 · Meta Ads · App/PWA · CRM
Autor:   Claude (sugestão técnica)
Data:    2026-06-07
========================================
```

> Estado confirmado no checkout: GA4, captura UTM, Meta Pixel e Meta CAPI
> possuem implementação. O documento separa abaixo o que está ativo do que
> ainda depende de validação operacional ou expansão.

---

## ⟠ 1. Princípio de arquitetura

A medição deve ser **híbrida (browser + servidor)** com **deduplicação por `event_id`**.
Motivo: pixels só no browser perdem 20–40% dos eventos (ad blockers, ITP/Safari,
iOS, falhas de rede). O servidor (`/api/chat`) já é o ponto soberano onde o lead se
materializa — é o lugar certo para a verdade da conversão.

```text
                ┌───────────────────────────────────────────┐
                │              BROWSER (cliente)            │
                │  GA4 gtag  ·  Meta Pixel  ·  UTM capture  │
                └───────────────┬───────────────────────────┘
                                │ event_id (uuid) + utm_* no payload
                ┌───────────────▼────────────────────────────┐
                │           /api/chat (servidor)             │
                │  - persiste utm no Redis + leads (PG)      │
                │  - dispara Conversions API (Meta) server   │
                │  - dispara GA4 Measurement Protocol server │
                │  - reusa o MESMO event_id → dedup          │
                └───────────────┬────────────────────────────┘
                                │
                ┌───────────────▼─────────────────────────────┐
                │  GA4  ·  Meta Events Manager  ·  Dashboard  │
                └─────────────────────────────────────────────┘
```

**Regra de ouro:** o `event_id` é gerado **uma vez** no browser por evento e
reaproveitado na chamada server-side. Sem isso, conversões contam em dobro.

---

## ⧉ 2. Camada de eventos (taxonomia única)

A taxonomia abaixo é o contrato-alvo. A implementação atual ainda não possui
um `src/scripts/tracking.ts` único; chamadas existentes devem ser consolidadas
somente em uma mudança específica e validada.

```text
▓▓▓ TAXONOMIA DE EVENTOS
────────────────────────────────────────
└─ page_view
   ├─ Dispara:   carga da página
   ├─ GA4 (en):  `page_view` (auto)
   └─ Meta:      `PageView`

└─ chat_started
   ├─ Dispara:   1ª mensagem
   ├─ GA4 (en):  `chat_started`
   └─ Meta:      `Lead` (custom)

└─ lead_created
   ├─ Dispara:   Regis grava lead
   ├─ GA4 (en):  `generate_lead`
   └─ Meta:      `Lead`

└─ qualified_lead
   ├─ Dispara:   lead vira `qualificado = true`
   ├─ GA4 (en):  `qualified_lead`
   └─ Meta:      `CompleteRegistration`

└─ handoff_clicked
   ├─ Dispara:   clique no contato liberado após qualificação server-side
   ├─ GA4 (en):  `handoff_clicked`
   └─ Meta:      `Contact`

└─ quote_requested
   ├─ Dispara:   intenção de orçamento detectada (Regis)
   ├─ GA4 (en):  `quote_requested`
   └─ Meta:      `InitiateCheckout`

└─ appointment_scheduled
   ├─ Dispara:   reunião marcada
   ├─ GA4 (en):  `appointment_scheduled`
   └─ Meta:      `Schedule`

└─ pwa_installed
   ├─ Dispara:   `appinstalled` do PWA
   ├─ GA4 (en):  `pwa_installed`
   └─ Meta:      — (custom opcional)
```

> Os nomes da coluna "evento canônico" batem com o backlog do `NEXTSTEPS.md`
> ("page_viewed, chat_started, lead_created, appointment_scheduled, qualified_lead,
> quote_requested"). Mantê-los estáveis — são a chave do dashboard.

---

## ⨷ 3. Meta Ads (Pixel + Conversions API)

### 3.1 Browser — Meta Pixel
- O snippet já existe no `Base.astro`, guardado por
  **`PUBLIC_META_PIXEL_ID`**.
- O carregamento só ocorre após consentimento explícito do visitante.
- Eventos `track`/`trackCustom` saem da camada de eventos (§2), não soltos.

### 3.2 Servidor — Conversions API (CAPI)
- O módulo `src/lib/meta-capi.ts` já envia eventos server-side usando token
  secreto e é acionado por `/api/chat`.
- Cada evento server-side envia:
  - `event_id` (o mesmo do browser → dedup)
  - `event_name`, `event_time`, `action_source: "website"`
  - `user_data` **hasheado em SHA-256** (email/telefone normalizados) — o Meta
    exige hash; PII crua nunca trafega.
  - `custom_data` com `utm_*` e valor estimado, se houver.

### 3.3 Variáveis de ambiente

```text
PUBLIC_META_PIXEL_ID=   # ID do Pixel (público, vai pro browser)
META_CAPI_TOKEN=        # Conversions API token (SECRET, server-only)
META_TEST_EVENT_CODE=   # opcional, p/ validar no Events Manager (Test Events)
```

### 3.4 CSP

As origens do Meta já estão liberadas em `CSP_DIRECTIVES`
(`src/middleware.ts`):

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
- O estado inicial não autoriza medição. Scripts e eventos não essenciais só
  são ativados depois do opt-in explícito.
- Registrar `consent_status`, `consent_source` e `consent_at` no backend sem
  enviar a decisão junto com PII para plataformas de analytics.
- Oferecer recusa e revogação tão acessíveis quanto a aceitação; a aplicação
  principal deve continuar funcional sem consentimento de marketing.
- `gclid`/`fbclid` são identificadores de clique — tratar como sensível,
  não logar em claro nem expor em URL de terceiros.
- Respeitar `robots.txt`/Block AI Bots já configurado (não conflita).

---

## ◬ 7. Deduplicação (resumo prático)

```text
▓▓▓ DEDUPLICAÇÃO DE CONVERSÕES
────────────────────────────────────────
└─ Meta
   ├─ Browser:  Pixel `track`
   ├─ Servidor: CAPI `events`
   └─ Dedup:    `event_id` + `event_name`
└─ GA4
   ├─ Browser:  `gtag`
   ├─ Servidor: M. Protocol
   └─ Dedup:    `client_id` + `session_id` + name
```

Gerar `event_id = crypto.randomUUID()` no cliente, mandar no payload do `/api/chat`,
e reusar no disparo server-side. Validar no **Meta Test Events** e no **GA4 DebugView**.

---

## ✦ 8. Faseamento sugerido (ordem de execução)

```text
FASE 0 — FEITO
  └─ GA4 gtag.js + CSP.

FASE 1 — PARCIALMENTE FEITO
  └─ captura UTM/gclid/fbclid → localStorage → POST /api/chat
  └─ colunas de atribuição e consentimento em leads
  └─ pendente consolidar uma camada única de eventos

FASE 2 — IMPLEMENTADO
  └─ Meta Pixel atrás de PUBLIC_META_PIXEL_ID + CSP
  └─ carregamento bloqueado até consentimento explícito

FASE 3 — IMPLEMENTADO, VALIDAÇÃO OPERACIONAL PENDENTE
  └─ src/lib/meta-capi.ts + token server-only
  └─ hash SHA-256 + event_id para deduplicação
  └─ validar no Meta Test Events

FASE 4 — App/PWA + GA4 server-side
  └─ pwa_installed, standalone context
  └─ GA4 Measurement Protocol p/ eventos server (opcional, reforça dedup)

FASE 5 — Dashboard de aquisição
  └─ consolidar visitas → chat → lead → qualificado → reunião por campanha
  └─ fonte: tabela leads (utm_*) + GA4 + Meta Events Manager
```

---

## ⚙ 9. Estado por arquivo

```text
▓▓▓ ARQUIVOS A ALTERAR
────────────────────────────────────────
└─ src/scripts/chat-ui.ts
   └─ implementado — captura atribuição + event_id no POST
└─ src/pages/api/chat.ts
   └─ implementado — recebe attribution/event_id e aciona leads + CAPI
└─ src/lib/leads.ts
   └─ implementado — atribuição, sinal e consentimento no upsert
└─ src/lib/db.ts
   └─ implementado — migrações aditivas e idempotentes
└─ src/lib/meta-capi.ts
   └─ implementado — Conversions API server-side
└─ src/layouts/Base.astro
   └─ implementado — Meta Pixel com gate de consentimento
└─ src/middleware.ts
   └─ implementado — origens Meta no CSP
└─ .env.example
   └─ implementado — nomes das variáveis sem valores reais
└─ src/scripts/tracking.ts
   └─ pendente — camada única de eventos, se aprovada
```

---

## ⛔ 10. Restrições herdadas (não violar)

- **PWA intocável**: não instrumentar `sw.js`, manifest, splash ou registro do SW.
- **CSP**: todo recurso novo de terceiro exige entrada em `CSP_DIRECTIVES` ou é
  bloqueado (ver §3.4). Validar no preview (console sem violação) antes de subir.
- **Secrets**: `META_CAPI_TOKEN` e afins são server-only; apenas `PUBLIC_*` vai
  ao browser. Nunca commitar valores.
- **PII**: nada de dados pessoais em eventos de ads sem hash (Meta) ou nunca (GA4).
- **`packageManager`**: usar a versão exata fixada no `package.json` deste repo.

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
