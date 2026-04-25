---
import type { APIRoute } from "astro";
import { getChatHistory } from "../../lib/redis";

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`[HISTORY API] Buscando histórico para sessão: ${sessionId}`);
    const history = await getChatHistory(sessionId);

    return new Response(JSON.stringify({ history }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      },
    });
  } catch (error: any) {
    console.error("[HISTORY API ERROR]", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
