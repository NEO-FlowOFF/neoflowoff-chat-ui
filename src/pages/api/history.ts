import type { APIContext, APIRoute } from "astro";
import { getChatHistory } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { getOrCreateSessionId } from "@/lib/session";

export const GET: APIRoute = async ({ request, cookies }: APIContext) => {
  try {
    const sessionId = getOrCreateSessionId(cookies, request.url);

    logger.debug("HISTORY_API", "Loading session history");
    const history = await getChatHistory(sessionId);

    return new Response(JSON.stringify({ history }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    logger.error("HISTORY_API", "Failed to load session history", error);
    return new Response(JSON.stringify({ error: "History unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
};
