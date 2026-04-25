<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->
# NEOFLOWOFF CHAT UI (NØX)

```text
========================================
      NEO-FLOWOFF CHAT UI · CONTEXT
========================================
Status: ACTIVE (v1.1.0-beta)
Role: Interface Web/PWA do Agente NØX
Framework: Astro 6 (SSR Mode)
Memory: Redis (Railway)
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

────────────────────────────────────────

## ⧇ Arquitetura de Produção

O aplicativo utiliza **Astro 6** em modo **Server-Side Rendering (SSR)** via adaptador Node:

```text
Client (PWA) -> /api/chat (Astro POST Route) -> Redis (History Sync)
                                           -> Venice AI (Proxy Streaming)
```

1. **Memória Soberana:** Utiliza **Redis** (Railway) para persistência server-side via `sessionId`. O `localStorage` atua como cache redundante e identificador de sessão.
2. **Venice AI Integration:** Respostas em tempo real via SSE (Server-Sent Events) utilizando o modelo `venice-uncensored-role-play`.
3. **Proxy Server-Side:** A rota `/api/chat.ts` protege a `VENICE_API_KEY` e sincroniza o histórico com o Redis antes e depois de cada interação.
4. **Beta Guard:** Limite de mensagens por sessão para controle de custos e experiência guiada de teste.

────────────────────────────────────────

## ◯ Roadmap Evolutivo

1. **Contexto RAG:** Injeção de conhecimento do repositório root organizacional.
2. **Sentiment State:** Persistência do estado emocional do agente entre sessões baseado no histórico do Redis.
3. **PWA Avançado:** Web Push Notifications e Background Sync.

────────────────────────────────────────

## ◱ Próxima Leitura

Consulte `MEMORY.md` para detalhes sobre a estrutura de dados no Redis e `README.md` para instruções de setup.

---
> **Protocolo NΞØ FlowOFF**  
> "A soberania digital não é pedida, é construída."
