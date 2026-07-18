<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->

# CONFIGURAÇÃO TÉCNICA · NEØ:one

```text
========================================
       NEØ:One · TECHNICAL SETUP
========================================
Stack: Astro + ASI1 + Redis + Postgres
Environment: Node.js >=22.12.0
========================================
```

## ⧇ Pipeline de Dados

▓▓▓ FLUXO SERVER-SIDE (chat.ts)
────────────────────────────────────────

```text
       ┌──────────────────────────────┐
       │   1. SYSTEM PROMPT           │
       │   (system-prompt.md)         │
       └──────────────┬───────────────┘
                      │ (Persona + Regras)
       ┌──────────────▼───────────────┐
       │   2. CONTEXT                 │
       │   (CONTEXT.json)             │
       └──────────────┬───────────────┘
                      │ (Dados da Agência)
       ┌──────────────▼───────────────┐
       │   3. USER INPUT              │
       │   (Mensagem Atual)           │
       └──────────────┬───────────────┘
                      │ (ASI1 Streaming SSE)
       ┌──────────────▼───────────────┐
       │   4. NEØ:one RESPONSE        │
       │   + REGIS LEAD EXTRACTION    │
       │   (PostgreSQL upsert)        │
       └──────────────┬───────────────┘
                      │ (Persistência)
       ┌──────────────▼───────────────┐
       │   5. SESSION MEMORY          │
       │   (Gravação via Redis)       │
       └──────────────────────────────┘
```

────────────────────────────────────────

## ⨷ Stack Técnica

▓▓▓ INFRAESTRUTURA
────────────────────────────────────────
└─ Framework: Astro 7.x (SSR · Node Adapter)
└─ Runtime:   Node.js >=22.12.0
└─ LLM:       ASI1 AI (api.asi1.ai)
└─ Memory:    Redis Cloud externo via REDIS_URL
└─ Leads:     PostgreSQL (Railway)
└─ Notificações: Resend API
└─ Deploy:    Railway

────────────────────────────────────────

```mermaid
graph TD
    subgraph Frontend
        U[Visitor]
        ChatUI[Chat UI]
    end

    subgraph Backend
        Agent[NΞØ:One Agent Service]
        Router[Conversation Router]
        Summary[Summary Generator]
        Handoff[Handoff Builder]
    end

    subgraph DataStores
        R[(Redis - Conversation State)]
        P[(PostgreSQL - Conversations & Metadata)]
    end

    subgraph Email
        Resend[Resend Email Service]
    end

    U -->|Chat messages| ChatUI
    ChatUI -->|Send/receive messages| Agent

    Agent -->|Load/update session, context| R
    Agent -->|Persist conversation, routing, metadata| P

    Agent --> Router
    Router -->|Classification & routing results| Agent

    Agent --> Summary
    Summary -->|Conversation summary| Agent

    Agent -->|Trigger human handoff| Handoff
    Handoff -->|Build WhatsApp URL & context| Agent

    Agent -->|Send contact / notification emails| Resend

    R -.->|Cache support for routing & summaries| Router
    P -.->|Historical data for routing & reporting| Router
    P -.->|Historical data for summaries & context| Summary

```

## ◬ Operação

▓▓▓ COMANDOS (pnpm)
────────────────────────────────────────

### Instalação

```bash
pnpm install
```

### Desenvolvimento

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

────────────────────────────────────────

## ⍟ Variáveis de Ambiente

```text
ASI1_API_KEY=    # Chave ASI1 AI
ASI1_MODEL=asi1  # Modelo (padrão: asi1)
REDIS_URL=       # Redis Cloud externo (redis://default:***@host:port)
DATABASE_URL=    # PostgreSQL HA no Railway (${{ Postgres HA.DATABASE_URL }})
SITE_URL=        # Domínio oficial (https://chat.neoflowoff.agency)
RESEND_API_KEY=  # Chave da API do Resend (para disparos de Handoff)
PUBLIC_META_PIXEL_ID= # Meta Pixel no browser; requer consentimento prévio
META_CAPI_TOKEN=      # Meta CAPI server-side; segredo, nunca expor no cliente
```

Notas:
- `REDIS_URL` é a fonte ativa da memória server-side.
- O runtime não lê `REDIS_PASSWORD`; usuário e senha ficam incorporados em
  `REDIS_URL` quando o provedor exigir autenticação.
- Em 2026-06-02, produção validada com Redis Cloud externo (ex: Upstash ou Redis Cloud).
- O módulo nativo de Redis não está mais disponível por padrão no Railway, então manter o Redis hospedado externamente é a arquitetura correta e recomendada.
- `DATABASE_URL` utiliza o **Postgres HA** dentro do Railway para maior estabilidade e performance de banco relacional.
- A aplicação acessa o cluster por PgBouncer; topologia, réplicas e detalhes
  internos não devem ser expostos pelo agente ao visitante.
- GA4, Meta Pixel e Meta CAPI já possuem implementação. Analytics, pixels e
  CAPI só são ativados após consentimento explícito; a escolha pode ser
  recusada ou revogada em `/privacidade`.
- Query strings de páginas e campanhas seguem
  [`CAMPAIGN_ATTRIBUTION.md`](../CAMPAIGN_ATTRIBUTION.md).

────────────────────────────────────────

```text
▓▓▓ Neo Mello
────────────────────────────────────────
Fundador · NEO FlowOFF
neo@neoflowoff.agency

"Automação de marketing e infraestrutura
digital autônoma."

Security by design.
────────────────────────────────────────
```
