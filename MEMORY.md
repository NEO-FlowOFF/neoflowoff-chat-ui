# Memory — NØX Chat

## Atual (Beta v1.0.0)

- **Storage:** `localStorage` (client-side único).
- **Chave:** `nox_history_v1`.
- **Limite Histórico:** 40 mensagens (contexto enviado à IA).
- **Limite Sessão Beta:** 10 mensagens (trava de custo/segurança).
- **Engine:** Venice AI (Model: `venice-uncensored-role-play`).

## Próximo

- **Redis (Railway):** Persistência server-side para sincronização entre dispositivos.
- **Contexto RAG:** Injeção de conhecimento do repositório root organizacional.
- **Sentiment State:** Persistência do estado emocional do agente entre sessões.

---
> Status: Produção Estável (Railway)
