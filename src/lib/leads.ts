import { pool } from "./db";
import { sendHandoffNotification, sendVisitorConfirmation, sendConversationSummary } from "./emails";

export interface Lead {
  sessionId: string;
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  empresa?: string | null;
  observacoes?: string | null;
  visitorIntent?: string | null;
  qualificado?: boolean;
}

/**
 * Insere ou atualiza um lead no PostgreSQL.
 * Apenas campos com valor não-nulo são sobrescritos.
 */
export async function upsertLead(lead: Lead): Promise<void> {
  if (!pool) return;

  // Só salva se houver pelo menos um campo além do sessionId
  const hasData =
    lead.nome || lead.email || lead.telefone || lead.empresa || lead.observacoes || lead.visitorIntent;
  if (!hasData) return;

  // 1. Verifica se o lead já existia e se já estava qualificado

  let existingNome = "";
  let existingEmpresa = "";
  let existingEmail = "";
  let existingTelefone = "";
  let existingObservacoes = "";
  let existingHandoffSent = false;

  try {
    const existing = await pool.query(
      `SELECT nome, empresa, email, telefone, observacoes, qualificado, handoff_sent FROM leads WHERE session_id = $1`,
      [lead.sessionId]
    );
    if (existing.rows.length > 0) {
      existingNome = existing.rows[0].nome || "";
      existingEmpresa = existing.rows[0].empresa || "";
      existingEmail = existing.rows[0].email || "";
      existingTelefone = existing.rows[0].telefone || "";
      existingObservacoes = existing.rows[0].observacoes || "";
      existingHandoffSent = !!existing.rows[0].handoff_sent;
    }
  } catch (err) {
    console.error("[LEADS] Erro ao consultar lead existente:", err);
  }

  // 2. Determina se o lead agora é qualificado
  const finalNome = (lead.nome || existingNome || "").trim();
  const finalEmpresa = (lead.empresa || existingEmpresa || "").trim();
  const finalEmail = (lead.email || existingEmail || "").trim();
  const finalTelefone = (lead.telefone || existingTelefone || "").trim();
  const finalObservacoes = (lead.observacoes || existingObservacoes || "").trim();

  const hasContact = !!(finalEmail || finalTelefone);
  const hasIdentity = !!(finalNome || finalEmpresa);
  const hasNeed = !!finalObservacoes;

  const isQualified = hasContact && hasIdentity && hasNeed;

  // 3. Insere ou atualiza no banco com a classificação correta
  await pool.query(
    `
    INSERT INTO leads (session_id, nome, email, telefone, empresa, observacoes, visitor_intent, qualificado, handoff_sent)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (session_id) DO UPDATE SET
      nome           = COALESCE(EXCLUDED.nome,           leads.nome),
      email          = COALESCE(EXCLUDED.email,          leads.email),
      telefone       = COALESCE(EXCLUDED.telefone,       leads.telefone),
      empresa        = COALESCE(EXCLUDED.empresa,        leads.empresa),
      observacoes    = COALESCE(EXCLUDED.observacoes,    leads.observacoes),
      visitor_intent = COALESCE(EXCLUDED.visitor_intent, leads.visitor_intent),
      qualificado    = EXCLUDED.qualificado,
      updated_at     = NOW()
    `,
    [
      lead.sessionId,
      lead.nome ?? null,
      lead.email ?? null,
      lead.telefone ?? null,
      lead.empresa ?? null,
      lead.observacoes ?? null,
      lead.visitorIntent ?? null,
      isQualified,
      existingHandoffSent, // Mantém o status anterior na inserção/update
    ],
  );

  console.log(
    `[LEADS] Lead salvo — sessão ${lead.sessionId} (Qualificado: ${isQualified})`
  );

  const mergedLead: Lead = {
    ...lead,
    nome: finalNome || null,
    empresa: finalEmpresa || null,
    email: finalEmail || null,
    telefone: finalTelefone || null,
    observacoes: finalObservacoes || null,
  };

  // 4a. Confirmação para o visitante quando e-mail é capturado pela primeira vez
  if (mergedLead.email && !existingEmail) {
    sendVisitorConfirmation(mergedLead).catch((err) =>
      console.error("[LEADS] Falha ao enviar confirmação para visitante:", err)
    );
  }

  // 4b. Handoff + resumo quando lead qualifica pela primeira vez
  if (isQualified && !existingHandoffSent) {
    Promise.all([
      sendHandoffNotification(mergedLead),
      sendConversationSummary(mergedLead),
    ])
      .then(async () => {
        await pool?.query(
          `UPDATE leads SET handoff_sent = TRUE WHERE session_id = $1`,
          [lead.sessionId]
        );
      })
      .catch((err) => {
        console.error("[LEADS] Falha ao enviar e-mails de handoff:", err);
      });
  }
}

