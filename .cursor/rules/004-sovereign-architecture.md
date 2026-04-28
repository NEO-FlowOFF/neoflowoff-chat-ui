<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->
# SOVEREIGN ARCHITECTURE
> Definição da infraestrutura e regras de persistência do sistema.
> Referência técnica para agentes de código neste projeto.

```text
========================================
    NEØ:One · PROJECT ARCHITECTURE
========================================
Framework: ASTRO 6.x (SSR · Node Adapter)
Deploy:    Railway
========================================
```

## ⟠ Objetivo

Garantir que a infraestrutura técnica e as regras de persistência
sejam implementadas de forma consistente e resiliente.

────────────────────────────────────────

## ⨷ Stack Técnica

1. **Astro 6.x** — SSR com `@astrojs/node` (standalone).
2. **ASI1 AI** — LLM via `https://api.asi1.ai/v1/chat/completions`.
   Compatível com OpenAI SDK. Modelo: `asi1`.
3. **Redis (Railway)** — Histórico de chat por `sessionId`.
   Variável: `REDIS_URL`. Limitado a 40 mensagens / 7 dias.
4. **PostgreSQL (Railway)** — Captura de leads via sistema Regis.
   Variável: `DATABASE_URL`. Tabela: `leads`.
5. **PWA** — Suporte offline e interface mobile-first (max 480px).

────────────────────────────────────────

## ⧉ Fluxo de Dados (chat.ts)

```
POST /api/chat
  ├── Lê system-prompt.md + CONTEXT.json
  ├── Chama ASI1 com streaming SSE
  ├── Salva histórico no Redis (saveChatHistory)
  └── Chama Regis em background:
        ├── ASI1 extrai: nome/email/tel/empresa/obs
        └── Salva/atualiza em PostgreSQL (upsertLead)
```

────────────────────────────────────────

## ⧉ Arquivos-Chave

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/system-prompt.md` | Prompt e comportamento do agente |
| `src/lib/CONTEXT.json` | Dados factuais da agência |
| `src/lib/db.ts` | Pool PostgreSQL + schema migration |
| `src/lib/leads.ts` | Upsert de leads no PostgreSQL |
| `src/lib/regis.ts` | Extração de dados via ASI1 |
| `src/lib/redis.ts` | Histórico de chat |
| `src/pages/api/chat.ts` | Endpoint principal SSE |

────────────────────────────────────────

## ⍟ Variáveis de Ambiente Necessárias

```
ASI1_API_KEY=   # Chave da API ASI1
ASI1_MODEL=asi1 # Modelo (padrão: asi1)
REDIS_URL=      # URL do Redis (Railway interno ou externo)
DATABASE_URL=   # URL do PostgreSQL (Railway)
```

────────────────────────────────────────

## ⧉ Restrições Operacionais

- Histórico: **40 mensagens** máximo (Redis).
- Parâmetros ASI1: `temperature: 0.7`, `max_tokens: 600`,
  `frequency_penalty: 0.4`, `presence_penalty: 0.3`.
- SSL obrigatório no PostgreSQL (`rejectUnauthorized: false`).
- Graceful degradation: sistema funciona sem Redis ou PostgreSQL,
  apenas sem persistência.

────────────────────────────────────────

```text
▓▓▓ NΞØ MELLØ
────────────────────────────────────────
Fundador · NEO FlowOFF
neo@neoflowoff.agency · (62) 98323-1110

"Automação de marketing e infraestrutura
digital autônoma."

Security by design.
────────────────────────────────────────
```
