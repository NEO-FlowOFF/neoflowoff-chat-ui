# MEMORY.md // NODE NEØ MELLØ

Memória operacional curta do workspace `~/neomello`.

Leia este arquivo quando a pergunta for:
"o que já foi decidido?"

---

## Decisões Já Tomadas

- `~/neomello` é raiz local multi-repo, não monorepo.
- `NEO-PROTOCOL/` é hub local da organização NEO-PROTOCOL.
- `NEO-PROTOCOL/neobot-orchestrator/config/ecosystem.json`
  é a fonte canônica da topologia NEØ.
- FlowPay é parte integrante da stack NEØ.
- FlowPay é a capacidade financeira interna.
- Nexus é o event hub interno.
- Consumers comuns de pagamento entram por
  `nexusEvents.subscriptions[]`.
- Secrets ficam fora dos docs e fora do Git.

---

## Padrões Do Workspace

- Operar sempre no repo soberano correto.
- Ler o `AGENTS.md` mais próximo antes de editar.
- Preferir `pnpm` quando o projeto for Node.
- Usar `mise` para Python e runtimes fora de Node.
- Usar Azure como cloud preferencial.
- Preservar fronteiras entre organizações.

---

## Comandos Seguros

```bash
cd /Users/nettomello/neomello/NEO-PROTOCOL
pnpm run workspace:doctor
```

```bash
cd /Users/nettomello/neomello/NEO-PROTOCOL/neobot-orchestrator
pnpm analyze
```

```bash
cd /Users/nettomello/neomello/NEO-PROTOCOL/neo-nexus
pnpm build
pnpm lint
pnpm test
```

---

## Coisas Proibidas

- Escrever em `~/.config/secrets/*`.
- Escrever em `~/neomello/secrets/*`.
- Escrever direto em `~/.zshrc`.
- Instalar `nvm`, `asdf`, `pyenv` ou similares.
- Executar install/build no root `~/neomello`.
- Criar webhook externo por consumer quando Nexus resolve.

---

## Próximos Passos Validados

1. Propagar `CONTEXT.md`, `MEMORY.md`, `SKILL.md`
   nos hubs e repos com operação recorrente.
2. Padronizar FlowPay como capability interna.
3. Migrar consumers de pagamento para subscriptions declarativas.
4. Manter documentação operacional curta e auditável.

---

## Operação neoflowoff-chat-ui

- Em 2026-06-02, a memória server-side do chat foi validada com Redis Cloud
  externo via `REDIS_URL`; logs esperados no app:
  `[REDIS] Connection ready`.
- O serviço Redis Railway antigo pode permanecer como fallback temporário, mas
  não é a fonte ativa enquanto `REDIS_URL` aponta para Redis Cloud.
- A UI do chat é dark-only; não manter ramificações de modo claro ou theme
  toggle na superfície ativa.

---

## Operação PostgreSQL Railway

- Em 2026-05-27, o Railway CLI local estava linkado em:
  - Project: `neoflowoff-chat-ui`
  - Environment: `production`
  - Service: `Postgres`
- Logs `railway:dataui` marcados como `error` tinham causa real:
  `relation "pg_stat_statements" does not exist`.
- Correção aplicada no Postgres:
  `CREATE EXTENSION IF NOT EXISTS pg_stat_statements;`
- Saúde da tabela `leads` corrigida com:
  `VACUUM ANALYZE leads;`
- Validação pós-correção:
  `pg_stat_statements` presente em `pg_extension`;
  `leads.n_dead_tup = 0`;
  `last_vacuum` e `last_analyze` atualizados em
  `2026-05-27 20:56 UTC`.
- Schema operacional conhecido da tabela `leads`:
  `id uuid`, `session_id uuid`, `text text`.
- IDs de referência informados para rastreio:
  - `id`: `5c98ab59-bcc2-4415-8bcc-758b70d4c945`
  - `session_id`: `484c0e82-3248-4e79-8420-35274dc8e3c9`
- Não remover índices `leads_pkey` ou
  `leads_followup_status_due_at_idx` apenas por baixa contagem de scans
  enquanto a tabela estiver pequena.

---

## Próxima Leitura

Depois de `MEMORY.md`, leia `SKILL.md`.

## Stored Secrets Reference

### Available Keys
- ASI1 API: `~/.asi1-api-key`
- VoiceTune API: `~/.vt-api-key`
- MCP configs: `secrets/mcp/.env`

### Load in memory
```bash
source ~/neomello/load-secrets.sh
```
