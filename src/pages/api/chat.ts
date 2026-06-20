import type { APIContext, APIRoute } from "astro";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { saveChatHistory } from "../../lib/redis";
import { ensureLeadsTable, ensureSuspiciousEventsTable } from "../../lib/db";
import { type Message } from "../../types/chat";
import { getEcosystemContext } from "../../lib/rag";

// Garante os schemas no primeiro request (idempotente)
ensureLeadsTable().catch((e) => console.error("[DB INIT]", e));
ensureSuspiciousEventsTable().catch((e) => console.error("[DB INIT SENTINEL]", e));

// Hostnames autorizados a chamar a API (match EXATO de hostname, não substring).
const ALLOWED_HOSTS = new Set([
  "chat.neoflowoff.agency",
  "neoflowoff.agency",
  "www.neoflowoff.agency",
  "localhost",
  "127.0.0.1",
]);

// Valida o header Origin de forma estrita:
// - rejeita requisições sem Origin (curl/bots/server-to-server)
// - faz parse via URL e compara o hostname exato (evita bypass por substring,
//   ex.: "neoflowoff.agency.attacker.com" ou "...agency.evil.com")
// - permite subdomínios reais de neoflowoff.agency e o próprio host do request
function isAllowedOrigin(origin: string | null, host: string | null): boolean {
  if (!origin) return false;
  let hostname: string;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    return false;
  }
  if (ALLOWED_HOSTS.has(hostname)) return true;
  if (hostname === "neoflowoff.agency" || hostname.endsWith(".neoflowoff.agency"))
    return true;
  if (host && hostname === host.split(":")[0]) return true;
  return false;
}

export const POST: APIRoute = async ({ request }: APIContext) => {
  try {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    if (!isAllowedOrigin(origin, host)) {
      console.warn(`[SECURITY] Acesso bloqueado — origin: ${origin ?? "(ausente)"}`);
      return new Response(JSON.stringify({ error: "Unauthorized Origin" }), {
        status: 403,
      });
    }

    const body = (await request.json()) as {
      messages: Message[];
      sessionId?: string;
      attribution?: {
        utm_source?: string | null;
        utm_medium?: string | null;
        utm_campaign?: string | null;
        utm_term?: string | null;
        utm_content?: string | null;
        gclid?: string | null;
        fbclid?: string | null;
        landing_path?: string | null;
        referrer?: string | null;
      } | null;
    };
    const { messages, sessionId } = body;

    // Sentinel — detecta atividade suspeita no input antes de chamar o LLM
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg?.content) {
      try {
        const { handleSuspiciousActivity } = await import("../../lib/sentinel");
        handleSuspiciousActivity(sessionId, lastUserMsg.content).catch(() => {});
      } catch (err) {
        console.error("[SENTINEL ERROR]", err);
      }
    }

    // Carrega o System Prompt e Contexto no Server-Side para evitar exposição
    const promptPath = path.join(process.cwd(), "src/lib/system-prompt.md");
    const contextPath = path.join(process.cwd(), "src/lib/CONTEXT.json");

    const [systemPromptRaw, ecosystemContext] = await Promise.all([
      fs.readFile(promptPath, "utf-8"),
      fs.readFile(contextPath, "utf-8"),
    ]);

    const systemPrompt = `${systemPromptRaw}\n\n--- ECOSYSTEM CONTEXT ---\n${ecosystemContext}\n--- END CONTEXT ---\n${getEcosystemContext()}`;

    // Constrói a lista final de mensagens com o prompt de sistema no topo
    const finalMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages,
    ];

    console.log(
      `[NEOONE API] Gerando resposta para o usuário... Session: ${sessionId || "anon"}`,
    );

    const llmApiKey = import.meta.env.ASI1_API_KEY || process.env.ASI1_API_KEY;
    const llmModel = import.meta.env.ASI1_MODEL || process.env.ASI1_MODEL || "asi1";

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
            
            const attribution = body.attribution ? {
              utmSource: body.attribution.utm_source ?? null,
              utmMedium: body.attribution.utm_medium ?? null,
              utmCampaign: body.attribution.utm_campaign ?? null,
              utmTerm: body.attribution.utm_term ?? null,
              utmContent: body.attribution.utm_content ?? null,
              gclid: body.attribution.gclid ?? null,
              fbclid: body.attribution.fbclid ?? null,
              landingPath: body.attribution.landing_path ?? null,
              referrer: body.attribution.referrer ?? null,
            } : null;

            // Passa o histórico completo e a atribuição
            await updateRegisLead(sessionId, updatedHistory, attribution);
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
