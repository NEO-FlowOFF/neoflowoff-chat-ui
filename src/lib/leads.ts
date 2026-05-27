import { pool } from "./db";

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

  // 4. Dispara e-mail via Resend somente se está qualificado e ainda não enviou
  if (isQualified && !existingHandoffSent) {
    const mergedLead: Lead = {
      ...lead,
      nome: finalNome || null,
      empresa: finalEmpresa || null,
      email: finalEmail || null,
      telefone: finalTelefone || null,
      observacoes: finalObservacoes || null,
    };
    sendResendNotification(mergedLead)
      .then(async () => {
        await pool?.query(
          `UPDATE leads SET handoff_sent = TRUE WHERE session_id = $1`,
          [lead.sessionId]
        );
      })
      .catch((err) => {
        console.error("[LEADS] Falha ao enviar notificação por e-mail:", err);
      });
  }
}

/**
 * Envia notificação por e-mail via API REST do Resend.
 */
async function sendResendNotification(lead: Lead): Promise<void> {
  const apiKey = import.meta.env.RESEND_API_KEY || process.env.RESEND_API_KEY;
  const fromEmail = import.meta.env.RESEND_FROM || process.env.RESEND_FROM || "neo@neoflowoff.agency";
  const toEmail = import.meta.env.RESEND_TO || process.env.RESEND_TO || "neo@neoflowoff.agency";
  if (!apiKey) {
    console.warn("[RESEND] RESEND_API_KEY não configurada no ambiente. E-mail de handoff não enviado.");
    return;
  }

  const subject = `[LEAD QUALIFICADO] Novo contato de ${lead.nome || "Visitante"}`;
  
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #000000; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; margin: 0; padding-bottom: 15px; border-bottom: 1px solid #eaeaea;">
          NΞØ:One — Lead Qualificado Capturado
        </h2>
      </div>
      
      <p style="font-size: 15px; color: #444444; line-height: 1.6; margin-bottom: 25px;">
        Olá, <strong>Neo Mello</strong>.<br />
        Um novo visitante preencheu os requisitos de qualificação mínimos (nome e pelo menos um canal de contato) na conversa do site e está pronto para o seu acompanhamento.
      </p>
      
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 6px; border: 1px solid #f0f0f0; margin-bottom: 30px;">
        <h3 style="font-size: 14px; font-weight: bold; text-transform: uppercase; color: #888888; margin-top: 0; margin-bottom: 15px; letter-spacing: 0.5px;">
          Ficha do Lead
        </h3>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #f0f0f0;">
            <td style="padding: 10px 0; font-size: 14px; color: #666666; font-weight: 500; width: 120px;">Nome:</td>
            <td style="padding: 10px 0; font-size: 14px; color: #111111; font-weight: 600;">${lead.nome || "Não informado"}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f0f0f0;">
            <td style="padding: 10px 0; font-size: 14px; color: #666666; font-weight: 500;">E-mail:</td>
            <td style="padding: 10px 0; font-size: 14px; color: #111111; font-weight: 600;">
              ${lead.email ? `<a href="mailto:${lead.email}" style="color: #0066cc; text-decoration: none;">${lead.email}</a>` : "Não informado"}
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #f0f0f0;">
            <td style="padding: 10px 0; font-size: 14px; color: #666666; font-weight: 500;">WhatsApp:</td>
            <td style="padding: 10px 0; font-size: 14px; color: #111111; font-weight: 600;">
              ${lead.telefone ? `<a href="https://wa.me/${lead.telefone.replace(/\D/g, "")}" style="color: #25d366; text-decoration: none;">${lead.telefone}</a>` : "Não informado"}
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #f0f0f0;">
            <td style="padding: 10px 0; font-size: 14px; color: #666666; font-weight: 500;">Empresa:</td>
            <td style="padding: 10px 0; font-size: 14px; color: #111111;">${lead.empresa || "Não informado"}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-size: 14px; color: #666666; font-weight: 500; vertical-align: top;">Observações:</td>
            <td style="padding: 10px 0; font-size: 14px; color: #333333; line-height: 1.5;">${lead.observacoes || "Nenhuma"}</td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #f1f7ff; border-left: 4px solid #0066cc; padding: 15px; border-radius: 4px; margin-bottom: 25px;">
        <p style="font-size: 13px; color: #004499; margin: 0; line-height: 1.5;">
          <strong>ID da Sessão:</strong> <code style="font-family: monospace; font-size: 12px; background: #e0edff; padding: 2px 4px; border-radius: 3px;">${lead.sessionId}</code><br />
          Você pode usar este ID para consultar o histórico completo de mensagens se necessário.
        </p>
      </div>

      <div style="font-size: 11px; color: #aaaaaa; text-align: center; margin-top: 40px; border-top: 1px solid #eee; padding-top: 15px;">
        Enviado automaticamente pela inteligência NΞØ:One via Resend API.<br />
        © ${new Date().getFullYear()} NEØ FlowOFF. Todos os direitos reservados.
      </div>
    </div>
  `;

  console.log(`[RESEND] Enviando e-mail de notificação para ${toEmail}...`);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: `NEO:One <${fromEmail}>`,
      to: toEmail,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend API retornou erro HTTP ${res.status}: ${errText}`);
  }

  console.log(`[RESEND] E-mail de notificação enviado com sucesso.`);
}
