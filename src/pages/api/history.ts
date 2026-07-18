import type { APIContext, APIRoute } from "astro";
import { getChatHistory } from "@/lib/redis";
import { logger } from "@/lib/logger";

export const GET: APIRoute = async ({ request }: APIContext) => {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    logger.debug("HISTORY_API", "Loading session history");
    const history = await getChatHistory(sessionId);

    return new Response(JSON.stringify({ history }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: unknown) {
    logger.error("HISTORY_API", "Failed to load session history", error);
    return new Response(JSON.stringify({ history: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};
