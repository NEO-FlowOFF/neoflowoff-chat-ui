import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.warn(
    "[REDIS] REDIS_URL não encontrada. Memória server-side desativada.",
  );
}

import { type Message } from "../types/chat";

export const redis = redisUrl ? new Redis(redisUrl) : null;

export async function getChatHistory(sessionId: string): Promise<Message[]> {
  if (!redis) return [];
  const data = await redis.get(`chat:${sessionId}`);
  return data ? JSON.parse(data) : [];
}

export async function saveChatHistory(sessionId: string, history: Message[]) {
  if (!redis) return;
  // Mantém apenas as últimas 40 mensagens para performance e custo
  const limitedHistory = history.slice(-40);
  await redis.set(
    `chat:${sessionId}`,
    JSON.stringify(limitedHistory),
    "EX",
    60 * 60 * 24 * 7,
  ); // Expira em 7 dias
}
