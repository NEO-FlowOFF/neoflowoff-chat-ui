import { type Message } from "@/types/chat";
import { upsertLead } from "./leads";

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
}

export async function updateRegisLead(
  sessionId: string,
  messages: Message[],
  attribution?: AttributionData | null,
): Promise<void> {
  const apiKey = import.meta.env.ASI1_API_KEY || process.env.ASI1_API_KEY;
  const model = import.meta.env.ASI1_MODEL || process.env.ASI1_MODEL || "asi1";

  if (!apiKey) {
    console.warn("[REGIS] ASI1_API_KEY missing — lead extraction skipped.");
    return;
  }

  console.log(
    `[REGIS] Starting extraction for session ${sessionId} (${messages.length} messages)`,
  );

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
5. "observacoes": REQUIRED — write a 1-2 sentence summary of what the visitor wants or needs, based on the conversation. If the visitor said anything at all, summarize it here. Only use null if the conversation is completely empty.
6. "visitor_intent": MUST be exactly one of these values: "orcamento", "parceria", "suporte", "projeto_webapp", "agents_empresa", "curioso", "outro". Choose the best match based on the conversation context. Never return null for this field — default to "curioso" if unsure.

Output format (strict JSON):
{
  "nome": string | null,
  "email": string | null,
  "telefone": string | null,
  "empresa": string | null,
  "observacoes": string,
  "visitor_intent": string
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
        max_tokens: 400,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.log(`[REGIS] Extraction failed: HTTP ${res.status} — ${body}`);
      return;
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content?.trim();

    if (!raw) {
      console.warn("[REGIS] Empty response from LLM — nothing to extract.");
      return;
    }

    console.log(`[REGIS] Raw LLM response: ${raw.slice(0, 300)}`);

    // Strip possible markdown code fences (```json ... ```)
    const jsonStr = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    let extracted: Record<string, unknown>;
    try {
      extracted = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.log("[REGIS] JSON parse error:", parseErr);
      console.log("[REGIS] Attempted to parse:", jsonStr);
      return;
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

    if (rawIntent && !VALID_INTENTS.has(normalizedIntent!)) {
      console.warn(
        `[REGIS] Invalid visitor_intent "${rawIntent}" (normalized: "${normalizedIntent}") — falling back to "outro"`,
      );
    }

    const leadData = {
      sessionId,
      nome: sanitizeStr(extracted.nome),
      email: sanitizeStr(extracted.email),
      telefone: sanitizeStr(extracted.telefone),
      empresa: sanitizeStr(extracted.empresa),
      observacoes: sanitizeStr(extracted.observacoes),
      visitorIntent,
      utmSource: attribution?.utmSource ?? null,
      utmMedium: attribution?.utmMedium ?? null,
      utmCampaign: attribution?.utmCampaign ?? null,
      utmTerm: attribution?.utmTerm ?? null,
      utmContent: attribution?.utmContent ?? null,
      gclid: attribution?.gclid ?? null,
      fbclid: attribution?.fbclid ?? null,
      landingPath: attribution?.landingPath ?? null,
      referrer: attribution?.referrer ?? null,
    };

    console.log("[REGIS] Extracted lead data:", {
      ...leadData,
      sessionId: sessionId.slice(0, 8) + "…",
    });

    await upsertLead(leadData);
    console.log(`[REGIS] Lead upserted successfully for session ${sessionId}`);
  } catch (err) {
    console.warn("[REGIS] Unexpected error during extraction/save:", err);
  }
}
