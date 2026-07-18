import { type Message } from "@/types/chat";
import { type LeadUpsertResult, upsertLead } from "./leads";
import {
  COMMERCIAL_INTENTS,
  type CommercialIntent,
} from "./lead-scoring";
import { logger } from "./logger";

/**
 * Sistema Regis — Extrator de dados de lead via IA.
 *
 * Faz uma chamada separada e leve à ASI1 para analisar o histórico
 * da conversa e extrair dados estruturados do visitante.
 * Salva no PostgreSQL via upsertLead.
 */

/** Allowed values for the visitor_intent enum column. */
const VALID_INTENTS = new Set([
  "orcamento",
  "parceria",
  "suporte",
  "projeto_webapp",
  "agents_empresa",
  "curioso",
  "outro",
]);

export interface AttributionData {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  landingPath?: string | null;
  referrer?: string | null;
  consentStatus?: string | null;
  consentSource?: string | null;
  consentAt?: string | null;
}

export async function updateRegisLead(
  sessionId: string,
  messages: Message[],
  attribution?: AttributionData | null,
): Promise<LeadUpsertResult | null> {
  const apiKey = import.meta.env.ASI1_API_KEY || process.env.ASI1_API_KEY;
  const model = import.meta.env.ASI1_MODEL || process.env.ASI1_MODEL || "asi1";

  if (!apiKey) {
    logger.warn("REGIS", "ASI1_API_KEY missing; lead extraction skipped");
    return null;
  }

  logger.debug("REGIS", "Starting extraction", { messageCount: messages.length });

  // Format the conversation history as plain text for the extractor
  const transcript = messages
    .map((m) => `${m.role === "user" ? "VISITOR" : "AGENT"}: ${m.content}`)
    .join("\n");

  const extractionPrompt = `You are a CRM data extraction system. Analyze the conversation below and extract structured visitor data.
Return ONLY a valid JSON object — nothing else, no markdown, no explanation.

Extraction rules:
1. "nome": full name of the visitor if mentioned, otherwise null.
2. "email": email address if mentioned, otherwise null.
3. "telefone": phone or WhatsApp number if mentioned, otherwise null.
4. "empresa": company name if mentioned, otherwise null.
5. "visitor_intent": one of "orcamento", "parceria", "suporte", "projeto_webapp", "agents_empresa", "curioso", "outro".
6. "resumo_conversa": factual 1-2 sentence summary, otherwise null.
7. "dor_principal": explicit business pain stated by the visitor, otherwise null.
8. "necessidade_detectada": explicit desired outcome, otherwise null.
9. "produto_interesse": specific service or product discussed, otherwise null.
10. "urgencia": explicit deadline or urgency, otherwise null.
11. "commercial_intent": exactly one of "no_signal", "curiosity", "problem_identified", "solution_interest", "commercial_interest", "action_request", "urgent_action".
12. "commercial_signal_detected": true only when the visitor explicitly demonstrates buying, proposal, pricing, meeting, implementation or immediate-action intent.
13. "commercial_signal_evidence": when commercial_signal_detected is true, copy one short exact excerpt from a VISITOR message that proves it. Otherwise null. Never infer evidence from an AGENT message.

Output format (strict JSON):
{
  "nome": string | null,
  "email": string | null,
  "telefone": string | null,
  "empresa": string | null,
  "visitor_intent": string,
  "resumo_conversa": string | null,
  "dor_principal": string | null,
  "necessidade_detectada": string | null,
  "produto_interesse": string | null,
  "urgencia": string | null,
  "commercial_intent": string,
  "commercial_signal_detected": boolean,
  "commercial_signal_evidence": string | null
}

Conversation:
${transcript}

JSON:`;

  try {
    const res = await fetch("https://api.asi1.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: extractionPrompt }],
        stream: false,
        temperature: 0.1,
        max_tokens: 700,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.warn("REGIS", "Extraction request failed", {
        status: res.status,
        response: body.slice(0, 200),
      });
      return null;
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content?.trim();

    if (!raw) {
      logger.warn("REGIS", "Empty response from LLM; extraction skipped");
      return null;
    }

    logger.debug("REGIS", "LLM extraction response received");

    // Strip possible markdown code fences (```json ... ```)
    const jsonStr = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    let extracted: Record<string, unknown>;
    try {
      extracted = JSON.parse(jsonStr);
    } catch (parseErr) {
      logger.error("REGIS", "Failed to parse extraction response", parseErr);
      return null;
    }

    // Helper: reject placeholder/empty strings and return null
    const sanitizeStr = (val: unknown): string | null => {
      if (!val || typeof val !== "string") return null;
      const trimmed = val.trim();
      const lower = trimmed.toLowerCase();
      if (
        lower === "null" ||
        lower === "undefined" ||
        lower === "none" ||
        lower === "" ||
        lower === "n/a" ||
        lower === "não informado" ||
        lower === "não mencionado" ||
        lower === "not provided" ||
        lower === "not mentioned" ||
        lower === "unknown"
      ) {
        return null;
      }
      return trimmed;
    };

    // Normalize diacritics so the LLM can return "orçamento" or "orcamento" interchangeably
    const normalizeIntent = (s: string) =>
      s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

    // Validate visitor_intent against the allowed enum values; fall back to "outro"
    const rawIntent = sanitizeStr(extracted.visitor_intent);
    const normalizedIntent = rawIntent ? normalizeIntent(rawIntent) : null;
    const visitorIntent =
      normalizedIntent && VALID_INTENTS.has(normalizedIntent) ? normalizedIntent : "outro";

    const rawCommercialIntent = sanitizeStr(extracted.commercial_intent);
    const commercialIntent = COMMERCIAL_INTENTS.includes(
      rawCommercialIntent as CommercialIntent,
    )
      ? (rawCommercialIntent as CommercialIntent)
      : "no_signal";
    const poiEvidence = sanitizeStr(extracted.commercial_signal_evidence);
    const normalizedTranscript = transcript.toLocaleLowerCase("pt-BR");
    const evidenceExists = !!(
      poiEvidence &&
      normalizedTranscript.includes(poiEvidence.toLocaleLowerCase("pt-BR"))
    );
    const poiDetected =
      extracted.commercial_signal_detected === true && evidenceExists;
    const ultimaMensagem =
      [...messages].reverse().find((message) => message.role === "user")
        ?.content ?? null;

    if (rawIntent && !VALID_INTENTS.has(normalizedIntent!)) {
      logger.warn("REGIS", "Invalid visitor intent; using fallback");
    }

    const leadData = {
      sessionId,
      nome: sanitizeStr(extracted.nome),
      email: sanitizeStr(extracted.email),
      telefone: sanitizeStr(extracted.telefone),
      empresa: sanitizeStr(extracted.empresa),
      observacoes: sanitizeStr(extracted.resumo_conversa),
      visitorIntent,
      resumoConversa: sanitizeStr(extracted.resumo_conversa),
      dorPrincipal: sanitizeStr(extracted.dor_principal),
      necessidadeDetectada: sanitizeStr(extracted.necessidade_detectada),
      produtoInteresse: sanitizeStr(extracted.produto_interesse),
      urgencia: sanitizeStr(extracted.urgencia),
      ultimaMensagem,
      commercialIntent,
      poiDetected,
      poiEvidence: evidenceExists ? poiEvidence : null,
      utmSource: attribution?.utmSource ?? null,
      utmMedium: attribution?.utmMedium ?? null,
      utmCampaign: attribution?.utmCampaign ?? null,
      utmTerm: attribution?.utmTerm ?? null,
      utmContent: attribution?.utmContent ?? null,
      gclid: attribution?.gclid ?? null,
      fbclid: attribution?.fbclid ?? null,
      landingPath: attribution?.landingPath ?? null,
      referrer: attribution?.referrer ?? null,
      consentStatus: attribution?.consentStatus ?? null,
      consentSource: attribution?.consentSource ?? null,
      consentAt: attribution?.consentAt ?? null,
    };

    const result = await upsertLead(leadData);
    logger.info("REGIS", "Lead upserted successfully");
    return result;
  } catch (err) {
    logger.error("REGIS", "Unexpected extraction or persistence error", err);
    return null;
  }
}
