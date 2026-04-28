<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->

# CONFIGURAÇÃO TÉCNICA · NEØ:one

```text
========================================
       NEØ:One · TECHNICAL SETUP
========================================
Stack: Astro + ASI1 + Redis + Postgres
Environment: Node.js v20+
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
└─ Runtime:   Node.js v20+
└─ LLM:       ASI1 AI (api.asi1.ai)
└─ Memory:    Redis (Railway)
└─ Leads:     PostgreSQL (Railway)
└─ Deploy:    Railway

────────────────────────────────────────

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
ASI1_API_KEY=   # Chave ASI1 AI
ASI1_MODEL=asi1 # Modelo (padrão: asi1)
REDIS_URL=      # Redis Railway (interno ou externo)
DATABASE_URL=   # PostgreSQL Railway
SITE_URL=       # Domínio oficial (https://chat.neoflowoff.agency)
```

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
