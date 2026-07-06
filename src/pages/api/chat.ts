import { logger } from "@/lib/logger";
import type { APIContext, APIRoute } from "astro";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { ensureLeadsTable, ensureSuspiciousEventsTable } from "@/lib/db";
import { getEcosystemContext } from "@/lib/rag";
import { saveChatHistory, getSlidingWindow } from "@/lib/redis";
import { type Message } from "@/types/chat";
import { sendCapiEvent } from "@/lib/meta-capi";
import { getLeadBySessionId } from "@/lib/leads";

// Garante os schemas no primeiro request (idempotente)
ensureLeadsTable().catch((e) =>
  logger.error("DB", "Failed to ensure leads table", e),
);
ensureSuspiciousEventsTable().catch((e) =>
  logger.error("DB", "Failed to ensure suspicious_events table", e),
);

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
  if (
    hostname === "neoflowoff.agency" ||
    hostname.endsWith(".neoflowoff.agency")
  )
    return true;
  if (host && hostname === host.split(":")[0]) return true;
  return false;
}

export const POST: APIRoute = async ({ request }: APIContext) => {
  try {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    if (!isAllowedOrigin(origin, host)) {
      logger.warn("SECURITY", "Acesso bloqueado", {
        origin: origin ?? "(ausente)",
      });
      return new Response(JSON.stringify({ error: "Unauthorized Origin" }), {
        status: 403,
      });
    }

    const body = (await request.json()) as {
      messages: Message[];
      sessionId?: string;
      /** UUID gerado pelo browser Pixel — repassado ao CAPI para deduplicação */
      eventId?: string | null;
      attribution?: {
        utm_source?: string | null;
        utm_medium?: string | null;
        utm_campaign?: string | null;
        utm_term?: string | null;
        utm_content?: string | null;
        context?: string | null;
        gclid?: string | null;
        fbclid?: string | null;
        landing_path?: string | null;
        referrer?: string | null;
      } | null;
    };
    const { messages, sessionId, eventId } = body;

    // Sentinel — detecta atividade suspeita no input antes de chamar o LLM
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg?.content) {
      try {
        const { handleSuspiciousActivity } = await import("../../lib/sentinel");
        handleSuspiciousActivity(sessionId, lastUserMsg.content).catch(
          () => {},
        );
      } catch (err) {
        logger.error("SENTINEL", "Error handling suspicious activity", err);
      }
    }

    // Carrega o System Prompt e Contexto no Server-Side para evitar exposição
    const promptPath = path.join(process.cwd(), "src/lib/system-prompt.md");
    const contextPath = path.join(process.cwd(), "src/lib/CONTEXT.json");

    const [systemPromptRaw, ecosystemContext] = await Promise.all([
      fs.readFile(promptPath, "utf-8"),
      fs.readFile(contextPath, "utf-8"),
    ]);

    let attributionPrompt = "";
    if (body.attribution) {
      const attr = body.attribution;
      const attrParts = [];
      if (attr.utm_source)
        attrParts.push(`Origem (UTM Source): ${attr.utm_source}`);
      if (attr.utm_campaign) attrParts.push(`Campanha: ${attr.utm_campaign}`);
      if (attr.utm_medium) attrParts.push(`Mídia: ${attr.utm_medium}`);
      if (attr.utm_term) attrParts.push(`Termo: ${attr.utm_term}`);
      if (attr.utm_content) attrParts.push(`Conteúdo: ${attr.utm_content}`);
      if (attr.context) attrParts.push(`Contexto da URL: ${attr.context}`);
      if (attr.landing_path)
        attrParts.push(`Página de Entrada: ${attr.landing_path}`);

      if (attrParts.length > 0) {
        attributionPrompt = `--- DADOS DE ATRIBUIÇÃO E ORIGEM DO CLIENTE (UTMs) ---
O visitante chegou através dos seguintes canais/campanhas:
${attrParts.join("\n")}
INSTRUÇÃO DE ATENDIMENTO: Utilize o contexto da campanha ou origem do cliente para contextualizar sua saudação inicial e condução do atendimento, demonstrando alinhamento com o URL/campanha.
--- FIM ATRIBUIÇÃO ---`;
      }
    }

    let operationalStatePrompt = "";
    if (sessionId) {
      try {
        const leadState = await getLeadBySessionId(sessionId);
        if (leadState) {
          const hasNome = !!leadState.nome;
          const hasEmail = !!leadState.email;
          const hasTelefone = !!leadState.telefone;
          const isReadyForHandoff = hasNome && hasTelefone;

          const optionalContactFields: string[] = [];
          if (leadState.produtoInteresse) {
            optionalContactFields.push(
              `- Produto de Interesse: ${leadState.produtoInteresse}`,
            );
          }
          if (leadState.dorPrincipal) {
            optionalContactFields.push(
              `- Dor Principal: ${leadState.dorPrincipal}`,
            );
          }
          const optionalContactText =
            optionalContactFields.length > 0
              ? `\n${optionalContactFields.join("\n")}`
              : "";

          const handoffStatusText = isReadyForHandoff
            ? "ESTÃO PREENCHIDOS!"
            : "AÇÕES NECESSÁRIAS ABAIXO";

          operationalStatePrompt = `--- ESTADO OPERACIONAL DO CLIENTE (BACKEND AUTHORITY) ---
Estágio no CRM (Lifecycle): ${leadState.lifecycleStage}
POI (Intenção Comercial) Detectado no Banco: ${leadState.poiDetected ? "SIM" : "NÃO"}
Qualificado no Banco: ${leadState.qualificado ? "SIM" : "NÃO"}
Dados de Contato Capturados no Banco:
- Nome: ${hasNome ? `PREENCHIDO (${leadState.nome})` : "AUSENTE"}
- Telefone/WhatsApp: ${hasTelefone ? `PREENCHIDO (${leadState.telefone})` : "AUSENTE (OBRIGATÓRIO PARA HANDOFF COMERCIAL)"}
- E-mail: ${hasEmail ? `PREENCHIDO (${leadState.email})` : "AUSENTE (Desejável para remarketing Meta)"}${optionalContactText}

REGRAS ESTRITAS DE CONDUÇÃO (PROTOCOL ZERO-INVENTION & FLUID CAPTURE):
1. SE O CLIENTE DEMONSTRAR PRESSA/URGÊNCIA ("estou com pressa", "quero contratar logo") OU SE POI DETECTADO FOR "SIM":
   - VOCÊ ESTÁ PROIBIDO DE FAZER NOVAS PERGUNTAS SOBRE DORES, NECESSIDADES OU QUALIFICAÇÃO. INTERROMPA QUALQUER INVESTIGAÇÃO IMEDIATAMENTE.
2. REQUISITO COMERCIAL DE HANDOFF RÁPIDO (NOME + WHATSAPP):
   - O time comercial precisa apenas de NOME e WHATSAPP para contato imediato no cenário de pressa ou intenção de compra. O e-mail é um bônus para remarketing Meta, mas JAMAIS deve bloquear o encaminhamento.
   - SE NOME E WHATSAPP JÁ ESTIVEREM PREENCHIDOS (${handoffStatusText}): Confirme em uma única frase curta e humana que nosso especialista já está sendo acionado para contatá-lo no WhatsApp sem demora. Não peça e-mail se o cliente estiver com pressa!
   - SE NOME OU WHATSAPP ESTIVEREM AUSENTES: Você DEVE solicitar apenas o que falta (dando preferência ao WhatsApp e Nome, e se possível e-mail junto).
3. EXECUÇÃO NATURAL ("SEM PARECER CHATBOT SEM LLM"):
   - É PROIBIDO listar perguntas em formato de formulário ou bullet points ("1. Nome: 2. Telefone:").
   - É PROIBIDO enviar respostas longas, burocráticas ou repetitivas.
   - É OBRIGATÓRIO usar a fluência natural do LLM para acolher a urgência do visitante em 1 frase curta e empática, solicitando os dados faltantes em UMA ÚNICA PERGUNTA fluida e direta, explicando que isso serve justamente para agilizar a conexão imediata com o especialista no WhatsApp.
--- FIM DO ESTADO OPERACIONAL ---`;
        }
      } catch (err) {
        logger.error(
          "API",
          "Erro ao buscar estado operacional em chat.ts",
          err,
        );
      }
    }

    const systemPromptBlocks = [
      systemPromptRaw.trim(),
      `--- ECOSYSTEM CONTEXT ---\n${ecosystemContext.trim()}\n--- END CONTEXT ---`,
      getEcosystemContext().trim(),
      attributionPrompt.trim(),
      operationalStatePrompt.trim(),
    ].filter(Boolean);

    const systemPrompt = systemPromptBlocks.join("\n\n");

    // Aplica a Janela Deslizante (últimas 10 interações = 5 turnos) para economizar tokens e acelerar a resposta
    const slidingMessages = getSlidingWindow(messages, 10);

    // Constrói a lista final de mensagens com o prompt de sistema no topo
    const finalMessages = [
      { role: "system" as const, content: systemPrompt },
      ...slidingMessages,
    ];

    logger.info("API", "Gerando resposta para o usuário", {
      sessionId: sessionId || "anon",
    });

    const llmApiKey = import.meta.env.ASI1_API_KEY || process.env.ASI1_API_KEY;
    const llmModel =
      import.meta.env.ASI1_MODEL || process.env.ASI1_MODEL || "asi1";

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

            const attribution = body.attribution
              ? {
                  utmSource: body.attribution.utm_source ?? null,
                  utmMedium: body.attribution.utm_medium ?? null,
                  utmCampaign: body.attribution.utm_campaign ?? null,
                  utmTerm: body.attribution.utm_term ?? null,
                  utmContent: body.attribution.utm_content ?? null,
                  gclid: body.attribution.gclid ?? null,
                  fbclid: body.attribution.fbclid ?? null,
                  landingPath: body.attribution.landing_path ?? null,
                  referrer: body.attribution.referrer ?? null,
                }
              : null;

            // Passa o histórico completo e a atribuição
            await updateRegisLead(sessionId, updatedHistory, attribution);

            // Dispara CAPI: lead_created (fire-and-forget — não bloqueia SSE)
            const clientIp =
              request.headers.get("cf-connecting-ip") ??
              request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
              null;
            const clientUserAgent = request.headers.get("user-agent");

            sendCapiEvent({
              event_name: "Lead",
              event_time: Math.floor(Date.now() / 1000),
              action_source: "website",
              event_source_url: `https://chat.neoflowoff.agency/chat`,
              event_id: eventId ?? undefined,
              user_data: {
                clientIpAddress: clientIp,
                clientUserAgent: clientUserAgent ?? undefined,
                fbc: body.attribution?.fbclid
                  ? `fb.1.${Date.now()}.${body.attribution.fbclid}`
                  : undefined,
              },
            }).catch(() => {});
          } catch (err) {
            logger.error("REGIS", "Error updating lead", err);
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
    logger.error("API", "Error processing request", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
    });
  }
};
