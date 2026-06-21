import Redis from "ioredis";
import { type Message } from "@/types/chat";

const redisUrl = import.meta.env.REDIS_URL || process.env.REDIS_URL;

if (!redisUrl) {
  console.warn(
    "[REDIS] REDIS_URL não encontrada. Memória server-side desativada.",
  );
}

function describeRedisTarget(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}`;
  } catch {
    return "invalid-url";
  }
}

let redisErrorLogged = false;

export const redis = redisUrl
  ? new Redis(redisUrl, {
      connectTimeout: 5000,
      commandTimeout: 5000,
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 250, 1000);
      },
    })
  : null;

if (redis && redisUrl) {
  console.info(`[REDIS] Connecting to ${describeRedisTarget(redisUrl)}`);

  redis.on("ready", () => {
    redisErrorLogged = false;
    console.info("[REDIS] Connection ready");
  });

  redis.on("error", (err) => {
    if (redisErrorLogged) return;
    redisErrorLogged = true;
    console.error("[REDIS] Connection error:", err instanceof Error ? err.message : err);
  });

  redis.on("end", () => {
    console.warn("[REDIS] Connection ended. Server-side memory degraded.");
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
