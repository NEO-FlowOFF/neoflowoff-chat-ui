# Memory — NØX Chat

## Atual (Beta v1.1.0)

- **Storage:** Híbrido (Redis Server-Side + LocalStorage Client-Side).
- **Engine de Memória:** Redis (Railway) via `src/lib/redis.ts`.
- **Identidade:** `sessionId` (UUID) persistente por dispositivo, salvo no client e validado no server.
- **Expiração:** TTL de 7 dias de inatividade no Redis para cada sessão.
- **Sincronização:** O histórico é carregado do Redis e atualizado a cada conclusão de stream da IA.
- **Limite Histórico:** 40 mensagens (contexto enviado à IA).

## Próximo

- **Contexto RAG:** Injeção de conhecimento do repositório root organizacional.
- **Sentiment State:** Persistência do estado emocional do agente entre sessões baseado na análise do histórico.
- **Cross-Device Link:** Opção de vincular sessões via chave criptográfica manual.

---
> Status: Memória Soberana Ativa (Railway)
