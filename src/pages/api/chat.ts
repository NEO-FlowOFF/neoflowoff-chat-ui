import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    console.log(`[NØX API] Gerando resposta para o usuário via Venice AI...`);

    const veniceApiKey = import.meta.env.VENICE_API_KEY;
    const veniceModel =
      import.meta.env.VENICE_MODEL || "venice-uncensored-role-play";

    if (!veniceApiKey) {
      return new Response(JSON.stringify({ error: "Venice API Key missing" }), {
        status: 500,
      });
    }

    const res = await fetch("https://api.venice.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${veniceApiKey}`,
      },
      body: JSON.stringify({
        model: veniceModel,
        messages: body.messages,
        stream: true,
      }),
    });

    return new Response(res.body, {
      status: res.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Critical for Railway streaming
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
};
