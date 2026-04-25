<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->
# NEOFLOWOFF CHAT UI (NØX)

```text
========================================
      NEO-FLOWOFF CHAT UI · CONTEXT
========================================
Status: ACTIVE (v1.0.0-beta)
Role: Interface Web/PWA do Agente NØX
Framework: Astro 6 (SSR Mode)
Engine: Venice AI (Uncensored)
========================================
```

## ⟠ Mapa Mental

Este repositório (`neoflowoff-chat-ui`) contém o front-end e a interface de comunicação do **NØX**, o agente autônomo do ecossistema NEØ FlowOFF.

Ele atua como um repositório soberano, mantendo seu próprio runtime, histórico (git) e dependências de produto, conectado ao GitHub organizacional sob o protocolo de segurança NΞØ.

────────────────────────────────────────

## ⧉ Identidade e Design (Tactile Cyber-Dashboard)

A interface segue o conceito **Tactile 3D Cyber-Dashboard**:
- **Cores:** Fundo cinza-claro oficial (`#f2f2f2`) em modo light, contrastando com HUDs e balões de mensagem escuros (`#111110`). Acentos em **Verde Neon** e **Rosa Neon**.
- **Volume:** Uso de *Rim Lights* (top highlights), *Inset Shadows* profundas e gradientes 145° para simular hardware físico.
- **Tipografia:** `Codystar` (LED dot-matrix) para nomes e dados táticos; `Geist Mono` para o stream de consciência da IA.
- **Coreografia:** Boot animado (Scale -> Title Fade -> LED Sweep) que reforça a "ignição" da entidade.

────────────────────────────────────────

## ⧇ Arquitetura de Produção

O aplicativo utiliza **Astro 6** em modo **Server-Side Rendering (SSR)** via adaptador Node:

```text
Client (PWA) -> /api/chat (Astro POST Route) -> Venice AI (Proxy Streaming)
```

1. **Proxy Server-Side:** A rota `/api/chat.ts` protege a `VENICE_API_KEY` e injeta headers críticos (`X-Accel-Buffering: no`) para streaming estável na Railway.
2. **Venice AI Integration:** Respostas em tempo real via SSE (Server-Sent Events) utilizando o modelo `venice-uncensored-role-play`.
3. **Beta Guard:** Limite de 10 mensagens por sessão (`MAX_SESSION_MESSAGES`) para controle de custos e experiência guiada de teste.
4. **Soberania de Dados:** Memória persiste em `localStorage` (cliente), preservando a privacidade até a futura migração para Redis.

────────────────────────────────────────

## ⍟ Pipeline Operacional (NΞØ Protocol)

A automação é governada pelo `Makefile`:
- `make verify`: Audit de segurança + Astro Check + Build de Produção.
- `make deploy`: Atalho para sincronização e deploy via Railway.
- `make commit`: Garante conformidade com Conventional Commits após verificação.

────────────────────────────────────────

## ◯ Roadmap Evolutivo

1. **Redis Persistence:** Transição para memória cross-device server-side.
2. **RAG Contextual:** Injeção dos manifestos da organização (`ecosystem.json`) no System Prompt.
3. **PWA Avançado:** Web Push Notifications e Background Sync (suporte iOS 16.4+).
4. **Sentimento Dinâmico:** Alteração da coreografia de boot baseada no "tom" da última interação.

────────────────────────────────────────

## ◱ Próxima Leitura

Consulte `NEXTSTEPS.md` para restrições técnicas conhecidas e `README.md` para instruções de setup rápido.

---
> **Protocolo NΞØ FlowOFF**  
> "A soberania digital não é pedida, é construída."
