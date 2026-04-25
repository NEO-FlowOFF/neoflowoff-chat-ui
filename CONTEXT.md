<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->
# NEOFLOWOFF CHAT UI (NØX)

```text
========================================
      NEO-FLOWOFF CHAT UI · CONTEXT
========================================
Status: ACTIVE
Role: Interface Web/PWA do Agente NØX
Framework: Astro
========================================
```

## ⟠ Mapa Mental

Este repositório (`neoflowoff-chat-ui`) contém o front-end e a interface de comunicação do **NØX**, o agente autônomo do ecossistema NEØ FlowOFF.

Ele atua como um "child repository" dentro do workspace organizacional `NEO-FlowOFF`, mantendo total soberania sobre seu próprio runtime, histórico (git) e dependências de produto, conforme estipulado no modelo de control-plane do ecossistema.

────────────────────────────────────────

## ⧉ Identidade e Design

A interface foi projetada para ter um aspecto **premium, tático e "cyber-dashboard"**:
- **Cores:** Fundo extremamente escuro (`#0f0f0f` e `#1a1a1a`) contrastando com acentos em **Verde Acid/Neon** (glow principal, avatares) e **Rosa Neon/Pink** (status, indicadores secundários e bordas ativas).
- **Tipografia:** Uso da fonte `Codystar` (LED dot-matrix real) para dados críticos e nome do agente, combinada com fontes limpas (`Inter Tight` e `Geist Mono`) para legibilidade das mensagens.
- **Efeitos:** Fortes componentes de luz (glow), *inset shadows* simulando painéis escavados e glassmorphism sutil.

────────────────────────────────────────

## ⧇ Arquitetura Atual

O aplicativo foi construído com foco em segurança de chaves e performance de streaming:

```text
Client (UI) -> /api/chat (Astro Server Route) -> Azure AI Foundry (OpenAI)
```

1. **Proxy Server-Side:** Para não expor a chave `AZURE_API_KEY` ao usuário final, o cliente Astro chama a rota local `/api/chat.ts`.
2. **Streaming Real-Time:** A rota faz a ponte com a API do Azure e retorna os chunks de texto via **Server-Sent Events (SSE)**.
3. **Memória de Conversa:** Atualmente armazenada no `localStorage` do navegador do usuário (chave `nox_history_v1`), garantindo persistência rápida client-side.

────────────────────────────────────────

## ⍟ Pipeline Operacional (NΞØ Protocol)

A automação local é governada pelo `Makefile`, que implementa as regras de qualidade do ecossistema:
- `make verify`: Roda de forma combinada verificação de pacotes vulneráveis (`audit`), checagem de integridade de tipos do Astro (`check`) e um teste de compilação (`build`).
- `make push MESSAGE="feat: msg"`: Fluxo seguro que invoca o `verify` internamente antes de gerar o commit no padrão *Conventional Commits* e enviar ao repositório remoto.

────────────────────────────────────────

## ◯ Próximos Passos (Roadmap Local)

1. **Memória Distribuída:** Evoluir do `localStorage` para armazenamento server-side utilizando **Redis** (Railway).
2. **Injeção de Contexto (RAG/System Prompt):** Injetar no System Prompt o manifesto `ecosystem.json` do workspace para dar contexto situacional real ao agente.
3. **PWA Avançado:** Garantir que o Service Worker e cache estático operem impecavelmente offline ou em redes instáveis.
4. **Proteção de Rotas:** Adicionar autenticação à rota do chat caso seja exposto fora de canais seguros.

────────────────────────────────────────

## ◱ Próxima Leitura

Consulte `AGENTS.md` e `SKILL.md` deste repositório para regras duras de modificação de código e comportamento operacional do agente de IA que estiver ajudando na manutenção deste app.
