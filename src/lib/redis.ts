import Redis from 'ioredis';

const redisUrl = import.meta.env.REDIS_URL || process.env.REDIS_URL;

if (!redisUrl) {
  console.warn('[REDIS] REDIS_URL não encontrada. Memória server-side desativada.');
}

export const redis = redisUrl ? new Redis(redisUrl) : null;

export async function getChatHistory(sessionId: string) {
  if (!redis) return [];
  const data = await redis.get(`chat:${sessionId}`);
  return data ? JSON.parse(data) : [];
}

export async function saveChatHistory(sessionId: string, history: any[]) {
  if (!redis) return;
  // Mantém apenas as últimas 40 mensagens para performance e custo
  const limitedHistory = history.slice(-40);
  await redis.set(`chat:${sessionId}`, JSON.stringify(limitedHistory), 'EX', 60 * 60 * 24 * 7); // Expira em 7 dias
}
