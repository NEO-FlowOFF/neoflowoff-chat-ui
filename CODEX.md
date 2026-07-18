# CODEX.md

## Escopo

Este repositório soberano mantém a aplicação Astro SSR do NEØ:one.
O workspace pai `NEO-FlowOFF` coordena o ecossistema, mas não detém
o código nem as dependências deste produto.

## Leitura Obrigatória

Antes de alterar código, leia nesta ordem:

1. `../AGENTS.md` para o contrato do workspace.
2. `SKILL.md` e `CLAUDE.md` para as regras locais.
3. `agents/AGENTS.md`, `agents/CONTEXT.md`,
   `agents/MEMORY.md` e `agents/SOVEREIGN_DEV.md`.
4. `README.md` e `docs/SETUP.md`.

Nunca leia, altere ou exponha arquivos de segredos sem autorização.

## Contrato Técnico

- Runtime: Node.js `>=22.12.0`.
- Package manager: versão fixada em `package.json`.
- Framework: Astro SSR com adapter Node standalone.
- Deploy: Railway.
- Memória server-side: `REDIS_URL`; não existe contrato separado
  para `REDIS_PASSWORD`.
- Leads: Postgres HA no Railway via `DATABASE_URL` e PgBouncer.
- Handoff: Resend.
- Medição ativa: GA4, Meta Pixel e Meta CAPI.
- UI ativa: dark-only, sem tema orientado por sentimento.

## Restrições

- Não tocar em PWA, service worker, manifest, cache ou instalação
  sem autorização explícita.
- Não alterar `.env`, credenciais ou configuração do teaBASE.
- Não registrar PII, tokens, URLs com senha ou conteúdo de conversa.
- Preservar mudanças locais e usar staging explícito.
- Mudanças de produto ficam neste repo; padrões cross-repo ficam
  no workspace pai.

## Validação

```bash
pnpm run test
pnpm run check
pnpm run build
git diff --check
```

Atualize documentação somente quando mudar contrato, arquitetura
ou procedimento operacional.
