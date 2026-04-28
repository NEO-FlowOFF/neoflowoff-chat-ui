import type { APIContext, APIRoute } from "astro";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { saveChatHistory } from "../../lib/redis";
import { ensureLeadsTable } from "../../lib/db";
import { type Message } from "../../types/chat";

// Garante o schema no primeiro request (idempotente)
ensureLeadsTable().catch((e) => console.error("[DB INIT]", e));

export const POST: APIRoute = async ({ request }: APIContext) => {
  try {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    // Proteção de Origin (Permite localhost e o próprio host oficial)
    const isAllowedOrigin =
      !origin ||
      origin.includes(host || "") ||
      origin.includes("neoflowoff.agency");

    if (!isAllowedOrigin) {
      console.warn(`[SECURITY] Acesso bloqueado: ${origin}`);
      return new Response(JSON.stringify({ error: "Unauthorized Origin" }), {
        status: 403,
      });
    }

    const body = (await request.json()) as {
      messages: Message[];
      sessionId?: string;
    };
    const { messages, sessionId } = body;

    // Carrega o System Prompt e Contexto no Server-Side para evitar exposição
    const promptPath = path.join(process.cwd(), "src/lib/system-prompt.md");
    const contextPath = path.join(process.cwd(), "src/lib/CONTEXT.json");

    const [systemPromptRaw, ecosystemContext] = await Promise.all([
      fs.readFile(promptPath, "utf-8"),
      fs.readFile(contextPath, "utf-8"),
    ]);

    const systemPrompt = `${systemPromptRaw}\n\n--- ECOSYSTEM CONTEXT ---\n${ecosystemContext}\n--- END CONTEXT ---`;

    // Constrói a lista final de mensagens com o prompt de sistema no topo
    const finalMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages,
    ];

    console.log(
      `[NEOONE API] Gerando resposta para o usuário... Session: ${sessionId || "anon"}`,
    );

    const llmApiKey = process.env.ASI1_API_KEY;
    const llmModel = process.env.ASI1_MODEL || "asi1";

    if (!llmApiKey) {
      return new Response(
        JSON.stringify({ error: "LLM API Key missing (ASI1)" }),
        {
          status: 500,
        },
      );
    }

    const res = await fetch("https://api.asi1.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${llmApiKey}`,
      },
      body: JSON.stringify({
        model: llmModel,
        messages: finalMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 600,
        frequency_penalty: 0.4,
        presence_penalty: 0.3,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: err }), {
        status: res.status,
      });
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
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.replace("data: ", "").trim();
              if (jsonStr === "[DONE]") continue;
              try {
                const data = JSON.parse(jsonStr);
                accumulatedResponse += data.choices?.[0]?.delta?.content || "";
              } catch {}
            }
          }
        }

        // Ao finalizar, salva no Redis se houver sessionId
        if (sessionId && accumulatedResponse) {
          const updatedHistory: Message[] = [
            ...messages,
            { role: "assistant", content: accumulatedResponse },
          ];
          await saveChatHistory(sessionId, updatedHistory);

          // Tenta extrair dados para o CRM (Regis)
          try {
            const { updateRegisLead } = await import("../../lib/regis");
            // Passa o histórico completo — regis extrai nome/email/tel/empresa/obs
            await updateRegisLead(sessionId, updatedHistory);
          } catch (err) {
            console.error("[REGIS ERROR]", err);
          }
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[API ERROR]", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
    });
  }
};
