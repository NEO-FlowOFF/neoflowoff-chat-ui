import Redis from "ioredis";

const redisUrl = import.meta.env.REDIS_URL || process.env.REDIS_URL;

if (!redisUrl) {
  console.warn(
    "[REDIS] REDIS_URL não encontrada. Memória server-side desativada.",
  );
}

import { type Message } from "../types/chat";

export const redis = redisUrl ? new Redis(redisUrl) : null;
if (redis) {
  redis.on("error", (err) => {
    console.error("[REDIS] Connection error:", err instanceof Error ? err.message : err);
  });
}

export async function getChatHistory(sessionId: string): Promise<Message[]> {
  if (!redis) return [];
  try {
    const data = await redis.get(`chat:${sessionId}`);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error("[REDIS] Failed to read chat history:", err instanceof Error ? err.message : err);
    return [];
  }
}

export async function saveChatHistory(sessionId: string, history: Message[]) {
  if (!redis) return;
  // Mantém apenas as últimas 40 mensagens para performance e custo
  const limitedHistory = history.slice(-40);
  try {
    await redis.set(
      `chat:${sessionId}`,
      JSON.stringify(limitedHistory),
      "EX",
      60 * 60 * 24 * 7,
    ); // Expira em 7 dias
  } catch (err) {
    console.error("[REDIS] Failed to persist chat history:", err instanceof Error ? err.message : err);
  }
}
