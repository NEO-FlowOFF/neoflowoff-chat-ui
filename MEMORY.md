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

## Próxima Leitura

Depois de `MEMORY.md`, leia `SKILL.md`.

## Stored Secrets Reference

### Available Keys
- Venice API: `~/.venice-api-key`
- VoiceTune API: `~/.vt-api-key`
- MCP configs: `secrets/mcp/.env`

### Load in memory
```bash
source ~/neomello/load-secrets.sh
```

