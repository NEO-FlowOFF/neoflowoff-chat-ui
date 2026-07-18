import { ensureLeadsTable, ensureSuspiciousEventsTable } from "@/lib/db";
import { getLeadBySessionId } from "@/lib/leads";
import { logger } from "@/lib/logger";
import { sendCapiEvent } from "@/lib/meta-capi";
import { getEcosystemContext } from "@/lib/rag";
import {
  checkChatRateLimit,
  getChatHistory,
  getSlidingWindow,
  saveChatHistory,
} from "@/lib/redis";
import { getOrCreateSessionId } from "@/lib/session";
import { SseContentParser } from "@/lib/sse";
import { type Message } from "@/types/chat";
import type { APIContext, APIRoute } from "astro";
import * as fs from "node:fs/promises";
import * as path from "node:path";

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

export const POST: APIRoute = async ({ request, cookies }: APIContext) => {
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
      message?: string;
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
      consent?: {
        status?: "granted" | "denied";
        source?: string;
        at?: string;
      } | null;
    };
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message || message.length > 2000) {
      return new Response(JSON.stringify({ error: "Invalid message" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const sessionId = getOrCreateSessionId(cookies, request.url);
    if (!(await checkChatRateLimit(sessionId))) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      });
    }
    const storedHistory = await getChatHistory(sessionId);
    const messages: Message[] = [
      ...storedHistory,
      { role: "user", content: message },
    ];
    const { eventId } = body;

    // Sentinel — detecta atividade suspeita no input antes de chamar o LLM
    if (message) {
      try {
        const { handleSuspiciousActivity } = await import("../../lib/sentinel");
        handleSuspiciousActivity(sessionId, message).catch(
          () => {},
        );
      } catch (err) {
        logger.error("SENTINEL", "Error handling suspicious activity", err);
      }
    }

    // Carrega o System Prompt e Contexto no Server-Side para evitar exposição
    const promptPath = path.join(process.cwd(), "src/lib/system-prompt.md");
    const contextPath = path.join(process.cwd(), "src/lib/CONTEXT.json");
    const humanizationSkillPath = path.join(
      process.cwd(),
      "src/lib/humanization-skill.md",
    );

    const [systemPromptRaw, ecosystemContext, humanizationSkill] =
      await Promise.all([
        fs.readFile(promptPath, "utf-8"),
        fs.readFile(contextPath, "utf-8"),
        fs.readFile(humanizationSkillPath, "utf-8"),
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
      let leadState = null;
      try {
        leadState = await getLeadBySessionId(sessionId);
      } catch (err) {
        logger.error(
          "API",
          "Erro ao buscar estado operacional em chat.ts",
          err,
        );
      }

      // Default state if lead does not exist in DB yet or if DB call failed
      const state = leadState || {
        nome: "",
        empresa: "",
        email: "",
        telefone: "",
        qualificado: false,
        handoffSent: false,
        lifecycleStage: "visitor",
        poiDetected: false,
        produtoInteresse: "",
        dorPrincipal: "",
      };

      const hasNome = !!state.nome;
      const hasEmail = !!state.email;
      const hasTelefone = !!state.telefone;
      const hasEmpresa = !!state.empresa;
      const handoffAlreadySent = state.handoffSent;
      const isReadyForHandoff = hasNome && hasTelefone;

      const optionalContactFields: string[] = [];
      if (state.produtoInteresse) {
        optionalContactFields.push(
          `- Produto de Interesse: ${state.produtoInteresse}`,
        );
      }
      if (state.dorPrincipal) {
        optionalContactFields.push(`- Dor Principal: ${state.dorPrincipal}`);
      }
      const optionalContactText =
        optionalContactFields.length > 0
          ? `\n${optionalContactFields.join("\n")}`
          : "";

      const handoffStatusText = handoffAlreadySent
        ? "HANDOFF JÁ ENVIADO AO COMERCIAL"
        : isReadyForHandoff
          ? "PRONTO PARA HANDOFF, AINDA NÃO ENVIADO"
          : "AGUARDANDO DADOS MÍNIMOS";
      const operationalLifecycle =
        state.lifecycleStage === "poi_detected"
          ? "commercial_signal"
          : state.lifecycleStage;

      operationalStatePrompt = `--- ESTADO OPERACIONAL DO CLIENTE (BACKEND AUTHORITY) ---
Este estado representa o último turno já persistido. Informações fornecidas na mensagem atual são mais recentes: reconheça-as imediatamente e nunca repita uma pergunta apenas porque o banco ainda mostra o campo como ausente.
Estágio no CRM (Lifecycle): ${operationalLifecycle}
Sinal comercial validado no Banco: ${state.poiDetected ? "SIM" : "NÃO"}
Qualificado no Banco: ${state.qualificado ? "SIM" : "NÃO"}
Handoff registrado no Banco: ${handoffAlreadySent ? "SIM" : "NÃO"}
Dados de Contato Capturados no Banco:
- Nome: ${hasNome ? `PREENCHIDO (${state.nome})` : "AUSENTE"}
- Empresa: ${hasEmpresa ? `PREENCHIDA (${state.empresa})` : "AUSENTE (OPCIONAL)"}
- Telefone/WhatsApp: ${hasTelefone ? `PREENCHIDO (${state.telefone})` : "AUSENTE (OBRIGATÓRIO PARA HANDOFF COMERCIAL)"}
- E-mail: ${hasEmail ? `PREENCHIDO (${state.email})` : "AUSENTE (Desejável para remarketing Meta)"}${optionalContactText}
Status do Handoff: ${handoffStatusText}

REGRAS ESTRITAS DE CONDUÇÃO (PROTOCOL ZERO-INVENTION & FLUID CAPTURE):
1. SE O CLIENTE DEMONSTRAR PRESSA/URGÊNCIA ("estou com pressa", "quero contratar logo") OU SE O SINAL COMERCIAL VALIDADO FOR "SIM":
   - VOCÊ ESTÁ PROIBIDO DE FAZER NOVAS PERGUNTAS SOBRE DORES, NECESSIDADES OU QUALIFICAÇÃO. INTERROMPA QUALQUER INVESTIGAÇÃO IMEDIATAMENTE.
2. REQUISITO COMERCIAL DE HANDOFF RÁPIDO (NOME + WHATSAPP):
   - O time comercial precisa apenas de NOME e WHATSAPP para contato imediato no cenário de pressa ou intenção de compra. O e-mail é um bônus para remarketing Meta, mas JAMAIS deve bloquear o encaminhamento.
   - SE O HANDOFF JÁ ESTIVER REGISTRADO COMO ENVIADO: Não anuncie um novo acionamento, não solicite novamente dados já capturados e apenas confirme que o contexto já foi encaminhado ao comercial.
   - SE NOME E WHATSAPP ESTIVEREM PREENCHIDOS E O HANDOFF AINDA NÃO TIVER SIDO ENVIADO: Confirme em uma única frase curta e humana que o contexto está pronto para encaminhamento imediato. Não afirme que o envio já ocorreu antes da confirmação do backend.
   - SE NOME OU WHATSAPP ESTIVEREM AUSENTES: Você DEVE solicitar apenas o que falta (dando preferência ao WhatsApp e Nome, e se possível e-mail junto).
   - EMPRESA É CONTEXTO OPCIONAL: use quando já estiver preenchida, mas nunca repita a pergunta nem bloqueie o handoff por ausência desse campo.
3. EXECUÇÃO NATURAL ("SEM PARECER CHATBOT SEM LLM"):
   - É PROIBIDO listar perguntas em formato de formulário ou bullet points ("1. Nome: 2. Telefone:").
   - É PROIBIDO enviar respostas longas, burocráticas ou repetitivas.
   - É OBRIGATÓRIO usar a fluência natural do LLM para acolher a urgência do visitante em 1 frase curta e empática, solicitando os dados faltantes em UMA ÚNICA PERGUNTA fluida e direta, explicando que isso serve justamente para agilizar a conexão imediata com o especialista no WhatsApp.
--- FIM DO ESTADO OPERACIONAL ---`;
    }

    const systemPromptBlocks = [
      systemPromptRaw.trim(),
      humanizationSkill.trim(),
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

    const upstreamReader = res.body?.getReader() ?? null;
    const stream = new ReadableStream({
      /**
       * Inicia o streaming da resposta do LLM para o cliente e gerencia o pós-processamento.
       * Lê o corpo SSE da resposta, retransmite os chunks para o cliente e acumula o conteúdo final para persistência e integrações.
       *
       * Args:
       *   controller: Controlador da `ReadableStream` responsável por enfileirar chunks e finalizar o stream.
       *
       * Returns:
       *   Não retorna valor; opera via efeitos colaterais (streaming, persistência em Redis, atualização de CRM e disparo de CAPI).
       */
      async start(controller) {
        const reader = upstreamReader;
        if (!reader) {
          controller.error(new Error("ASI1 response body is unavailable"));
          return;
        }

        let accumulatedResponse = "";
        const decoder = new TextDecoder();
        const sseParser = new SseContentParser();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(value);
            accumulatedResponse += sseParser.push(chunk).join("");
          }
        } catch (error) {
          await reader.cancel(error).catch(() => {});
          controller.error(error);
          return;
        }
        accumulatedResponse += sseParser
          .push(decoder.decode())
          .concat(sseParser.flush())
          .join("");

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
                  ...(body.consent && {
                    consentStatus: body.consent.status ?? null,
                    consentSource: body.consent.source ?? null,
                    consentAt: body.consent.at ?? null,
                  }),
                }
              : body.consent
                ? {
                    consentStatus: body.consent.status ?? null,
                    consentSource: body.consent.source ?? null,
                    consentAt: body.consent.at ?? null,
                  }
                : null;

            // Passa o histórico completo e a atribuição
            const transition = await updateRegisLead(
              sessionId,
              updatedHistory,
              attribution,
            );

            // Dispara CAPI: lead_created (fire-and-forget — não bloqueia SSE)
            const clientIp =
              request.headers.get("cf-connecting-ip") ??
              request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
              null;
            const clientUserAgent = request.headers.get("user-agent");

            if (body.consent?.status === "granted" && transition) {
              const userData = {
                clientIpAddress: clientIp,
                clientUserAgent: clientUserAgent ?? undefined,
                fbc: body.attribution?.fbclid
                  ? `fb.1.${Date.now()}.${body.attribution.fbclid}`
                  : undefined,
              };
              if (transition.becameLead) {
                sendCapiEvent({
                  event_name: "Lead",
                  event_time: Math.floor(Date.now() / 1000),
                  action_source: "website",
                  event_source_url: "https://chat.neoflowoff.agency/chat",
                  event_id: eventId ?? undefined,
                  user_data: userData,
                }).catch(() => {});
              }
              if (transition.becameQualified) {
                sendCapiEvent({
                  event_name: "qualified_lead",
                  event_time: Math.floor(Date.now() / 1000),
                  action_source: "website",
                  event_source_url: "https://chat.neoflowoff.agency/chat",
                  event_id: eventId ? `${eventId}:qualified` : undefined,
                  user_data: userData,
                }).catch(() => {});
              }
            }
          } catch (err) {
            logger.error("REGIS", "Error updating lead", err);
          }
        }

        controller.close();
      },
      async cancel(reason) {
        await upstreamReader?.cancel(reason).catch(() => {});
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
