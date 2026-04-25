import type { APIRoute } from "astro";
import { saveChatHistory } from "../../lib/redis";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { messages, sessionId } = body;
    
    console.log(`[NØX API] Gerando resposta para o usuário... Session: ${sessionId || 'anon'}`);

    const veniceApiKey = import.meta.env.VENICE_API_KEY;
    const veniceModel = import.meta.env.VENICE_MODEL || "venice-uncensored-role-play";

    if (!veniceApiKey) {
      return new Response(JSON.stringify({ error: "Venice API Key missing" }), { status: 500 });
    }

    const res = await fetch("https://api.venice.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${veniceApiKey}`,
      },
      body: JSON.stringify({
        model: veniceModel,
        messages: messages,
        stream: true,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: err }), { status: res.status });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = res.body?.getReader();
        if (!reader) return;

        let accumulatedResponse = "";
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          controller.enqueue(value);

          // Extrai o conteúdo para salvar no Redis depois
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.replace('data: ', '').trim();
              if (jsonStr === '[DONE]') continue;
              try {
                const data = JSON.parse(jsonStr);
                accumulatedResponse += data.choices?.[0]?.delta?.content || '';
              } catch {}
            }
          }
        }

        // Ao finalizar, salva no Redis se houver sessionId
        if (sessionId && accumulatedResponse) {
          const updatedHistory = [...messages, { role: 'assistant', content: accumulatedResponse }];
          await saveChatHistory(sessionId, updatedHistory);
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: any) {
    console.error("[API ERROR]", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
