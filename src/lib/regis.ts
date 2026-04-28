import { type Message } from "../types/chat";
import { upsertLead } from "./leads";

/**
 * Sistema Regis — Extrator de dados de lead via IA.
 *
 * Faz uma chamada separada e leve à ASI1 para analisar o histórico
 * da conversa e extrair dados estruturados do visitante.
 * Salva no PostgreSQL via upsertLead.
 */
export async function updateRegisLead(
  sessionId: string,
  messages: Message[],
): Promise<void> {
  const apiKey = process.env.ASI1_API_KEY;
  const model = process.env.ASI1_MODEL || "asi1";

  if (!apiKey) {
    console.warn("[REGIS] ASI1_API_KEY ausente. Extração de lead ignorada.");
    return;
  }

  // Formata o histórico como texto simples para o extractor
  const transcript = messages
    .map((m) => `${m.role === "user" ? "VISITANTE" : "AGENTE"}: ${m.content}`)
    .join("\n");

  const extractionPrompt = `Analise esta conversa de atendimento e extraia dados do visitante.
Retorne APENAS um JSON válido, sem markdown, sem explicações.

Campos:
- nome: nome completo do visitante (null se não mencionado)
- email: endereço de e-mail (null se não mencionado)
- telefone: número de telefone com DDD (null se não mencionado)
- empresa: nome da empresa ou projeto (null se não mencionado)
- observacoes: resumo em 1-2 frases do objetivo/necessidade do visitante (null se não há conteúdo suficiente)

Conversa:
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
        max_tokens: 300,
      }),
    });

    if (!res.ok) {
      console.warn(`[REGIS] Extração falhou: HTTP ${res.status}`);
      return;
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content?.trim();
    if (!raw) return;

    // Sanitiza: remove possíveis blocos de markdown (```json ... ```)
    const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const extracted = JSON.parse(jsonStr);

    await upsertLead({
      sessionId,
      nome: extracted.nome ?? null,
      email: extracted.email ?? null,
      telefone: extracted.telefone ?? null,
      empresa: extracted.empresa ?? null,
      observacoes: extracted.observacoes ?? null,
    });
  } catch (err) {
    console.error("[REGIS] Erro ao extrair/salvar lead:", err);
  }
}
