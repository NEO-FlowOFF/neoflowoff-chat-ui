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
  const apiKey = import.meta.env.ASI1_API_KEY || process.env.ASI1_API_KEY;
  const model = import.meta.env.ASI1_MODEL || process.env.ASI1_MODEL || "asi1";

  if (!apiKey) {
    console.warn("[REGIS] ASI1_API_KEY ausente. Extração de lead ignorada.");
    return;
  }

  // Formata o histórico como texto simples para o extractor
  const transcript = messages
    .map((m) => `${m.role === "user" ? "VISITANTE" : "AGENTE"}: ${m.content}`)
    .join("\n");

  const extractionPrompt = `Você é um sistema de extração de CRM. Analise a conversa abaixo e extraia os dados do visitante.
Retorne APENAS um JSON válido e absoluto nada mais.

Regras:
1. Extraia o "nome" completo do visitante.
2. Extraia "email" e "telefone".
3. Extraia "empresa" se mencionada.
4. "observacoes" deve ser um resumo de 1-2 frases do que o visitante deseja.
5. "visitor_intent" DEVE obrigatoriamente ser UMA destas tags: "orçamento", "parceria", "suporte", "projeto_webapp", "agents_empresa", "curioso" ou "outro".
6. Se o dado (nome, email, telefone, empresa, observacoes) não foi fornecido, o valor no JSON DEVE ser null (tipo primitivo).

Formato de Saída (JSON estrito):
{
  "nome": string | null,
  "email": string | null,
  "telefone": string | null,
  "empresa": string | null,
  "observacoes": string | null,
  "visitor_intent": string | null
}

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
        max_tokens: 350,
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

    // Função auxiliar para evitar strings 'null' vazando para o banco
    const sanitizeStr = (val: any) => {
      if (!val) return null;
      if (typeof val === "string") {
        const lower = val.trim().toLowerCase();
        if (lower === "null" || lower === "undefined" || lower === "none" || lower === "" || lower === "não informado" || lower === "não mencionado") {
          return null;
        }
        return val.trim();
      }
      return val;
    };

    await upsertLead({
      sessionId,
      nome: sanitizeStr(extracted.nome),
      email: sanitizeStr(extracted.email),
      telefone: sanitizeStr(extracted.telefone),
      empresa: sanitizeStr(extracted.empresa),
      observacoes: sanitizeStr(extracted.observacoes),
      visitorIntent: sanitizeStr(extracted.visitor_intent),
    });
  } catch (err) {
    console.error("[REGIS] Erro ao extrair/salvar lead:", err);
  }
}
