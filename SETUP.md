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
└─ Framework: Astro 6.x (SSR · Node Adapter)
└─ Runtime:   Node.js >=22.12.0
└─ LLM:       ASI1 AI (api.asi1.ai)
└─ Memory:    Redis Cloud externo via REDIS_URL
└─ Leads:     PostgreSQL (Railway)
└─ Notificações: Resend API
└─ Deploy:    Railway

────────────────────────────────────────

```
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
DATABASE_URL=    # PostgreSQL Railway
SITE_URL=        # Domínio oficial (https://chat.neoflowoff.agency)
RESEND_API_KEY=  # Chave da API do Resend (para disparos de Handoff)
```

Notas:
- `REDIS_URL` é a fonte ativa da memória server-side.
- Em 2026-06-02, produção validada com Redis Cloud externo.
- O serviço Redis Railway pode permanecer como fallback temporário, mas não
  deve ser tratado como fonte ativa enquanto `REDIS_URL` aponta para o Redis
  Cloud.
- Hosts `*.railway.internal` só resolvem dentro da rede Railway.

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
