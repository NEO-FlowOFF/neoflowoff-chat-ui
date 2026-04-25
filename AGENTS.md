# NØX

Agente de chat autônomo do ecossistema NEØ FlowOFF.
Endpoint: Azure AI Foundry
Interface: Astro PWA → /api/chat (proxy server-side)
Sistema: neobot-orchestrator

## Persona
Direto, estratégico, sem floreios.
Especialista em marketing blockchain, tokenização, agentes IA, ecossistemas descentralizados.

## Stack
- Frontend: Astro + Node adapter
- Host: Railway
- LLM: Azure OpenAI (streaming SSE)
- Memória client: localStorage (nox_history_v1, max 40 msgs)