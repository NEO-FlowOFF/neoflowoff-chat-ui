import type { Lead } from "./leads";
import type { SuspiciousCategory } from "./sentinel";

const RESEND_API = "https://api.resend.com/emails";

const INTENT_LABELS: Record<string, string> = {
  orcamento:       "Solicitação de Orçamento",
  parceria:        "Proposta de Parceria",
  suporte:         "Suporte Técnico",
  projeto_webapp:  "Projeto de WebApp",
  agents_empresa:  "Agentes de IA para Empresa",
  curioso:         "Visitante Curioso",
  outro:           "Outro",
};

function getEnv(key: string) {
  return (import.meta.env?.[key] ?? process.env[key]) as string | undefined;
}

function config() {
  const apiKey  = getEnv("RESEND_API_KEY");
  const from    = getEnv("RESEND_FROM") || "neo@neoflowoff.agency";
  const toNeo   = getEnv("RESEND_TO")   || "neo@neoflowoff.agency";
  return { apiKey, from, toNeo };
}

async function dispatch(apiKey: string, payload: object): Promise<void> {
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Resend HTTP ${res.status}: ${await res.text()}`);
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function footer(year = new Date().getFullYear()) {
  return `<div style="font-size:11px;color:#aaa;text-align:center;margin-top:40px;border-top:1px solid #eee;padding-top:15px;">
    Enviado automaticamente pela inteligência NΞØ:One via Resend API.<br/>
    © ${year} NEØ FlowOFF. Todos os direitos reservados.
  </div>`;
}

function leadTable(lead: Lead) {
  const intent = lead.visitorIntent ? (INTENT_LABELS[lead.visitorIntent] ?? lead.visitorIntent) : "Não identificado";
  return `
  <table style="width:100%;border-collapse:collapse;">
    <tr style="border-bottom:1px solid #f0f0f0;">
      <td style="padding:10px 0;font-size:14px;color:#666;font-weight:500;width:130px;">Nome:</td>
      <td style="padding:10px 0;font-size:14px;color:#111;font-weight:600;">${lead.nome || "Não informado"}</td>
    </tr>
    <tr style="border-bottom:1px solid #f0f0f0;">
      <td style="padding:10px 0;font-size:14px;color:#666;font-weight:500;">E-mail:</td>
      <td style="padding:10px 0;font-size:14px;color:#111;font-weight:600;">
        ${lead.email ? `<a href="mailto:${lead.email}" style="color:#0066cc;text-decoration:none;">${lead.email}</a>` : "Não informado"}
      </td>
    </tr>
    <tr style="border-bottom:1px solid #f0f0f0;">
      <td style="padding:10px 0;font-size:14px;color:#666;font-weight:500;">WhatsApp:</td>
      <td style="padding:10px 0;font-size:14px;color:#111;font-weight:600;">
        ${lead.telefone ? `<a href="https://wa.me/${lead.telefone.replace(/\D/g,"")}" style="color:#25d366;text-decoration:none;">${lead.telefone}</a>` : "Não informado"}
      </td>
    </tr>
    <tr style="border-bottom:1px solid #f0f0f0;">
      <td style="padding:10px 0;font-size:14px;color:#666;font-weight:500;">Empresa:</td>
      <td style="padding:10px 0;font-size:14px;color:#111;">${lead.empresa || "Não informado"}</td>
    </tr>
    <tr style="border-bottom:1px solid #f0f0f0;">
      <td style="padding:10px 0;font-size:14px;color:#666;font-weight:500;vertical-align:top;">Intenção:</td>
      <td style="padding:10px 0;font-size:14px;color:#111;">${intent}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;font-size:14px;color:#666;font-weight:500;vertical-align:top;">Contexto:</td>
      <td style="padding:10px 0;font-size:14px;color:#333;line-height:1.5;">${lead.observacoes || "Nenhum"}</td>
    </tr>
  </table>`;
}

/**
 * Template 1 — Lead Qualificado (para Neo)
 * Disparo: lead tem nome + contato + contexto e ainda não recebeu handoff.
 */
export async function sendHandoffNotification(lead: Lead): Promise<void> {
  const { apiKey, from, toNeo } = config();
  if (!apiKey) { console.warn("[RESEND] API key ausente — handoff não enviado."); return; }

  const intent = lead.visitorIntent ? (INTENT_LABELS[lead.visitorIntent] ?? lead.visitorIntent) : "";
  const subject = `[LEAD] ${lead.nome || "Visitante"}${intent ? ` · ${intent}` : ""}`;

  const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;border:1px solid #eaeaea;border-radius:8px;background:#fff;">
    <h2 style="color:#000;font-size:20px;font-weight:700;letter-spacing:-0.5px;margin:0 0 6px;">NΞØ:One — Lead Qualificado</h2>
    <p style="font-size:13px;color:#888;margin:0 0 24px;">Um visitante qualificado está pronto para acompanhamento.</p>
    <div style="background:#f9f9f9;padding:20px;border-radius:6px;border:1px solid #f0f0f0;margin-bottom:24px;">
      ${leadTable(lead)}
    </div>
    <div style="background:#f1f7ff;border-left:4px solid #0066cc;padding:14px;border-radius:4px;margin-bottom:24px;">
      <p style="font-size:13px;color:#004499;margin:0;line-height:1.5;">
        <strong>ID da Sessão:</strong>
        <code style="font-family:monospace;font-size:12px;background:#e0edff;padding:2px 4px;border-radius:3px;">${lead.sessionId}</code>
      </p>
    </div>
    ${footer()}
  </div>`;

  console.log(`[RESEND] Enviando handoff para ${toNeo}...`);
  await dispatch(apiKey, { from: `NΞØ:One <${from}>`, to: toNeo, subject, html });
  console.log("[RESEND] Handoff enviado.");
}

/**
 * Template 2 — Confirmação para o visitante (+ cópia para Neo)
 * Disparo: visitante fornece e-mail pela primeira vez.
 */
export async function sendVisitorConfirmation(lead: Lead): Promise<void> {
  const { apiKey, from, toNeo } = config();
  if (!apiKey || !lead.email) return;

  const nome = lead.nome ? `, ${lead.nome.split(" ")[0]}` : "";
  const subject = "Recebemos seu contato — NEØ FlowOFF";

  const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;border:1px solid #eaeaea;border-radius:8px;background:#fff;">
    <h2 style="color:#000;font-size:20px;font-weight:700;letter-spacing:-0.5px;margin:0 0 20px;">Contato registrado ✓</h2>
    <p style="font-size:15px;color:#444;line-height:1.7;margin-bottom:20px;">
      Olá${nome}.<br/><br/>
      Sua mensagem foi recebida pela NΞØ:One e seu contato foi registrado com sucesso.<br/>
      <strong>Neo Mello</strong> vai entrar em contato em breve pelo canal que você preferir.
    </p>
    <div style="background:#f9f9f9;padding:16px 20px;border-radius:6px;border:1px solid #f0f0f0;margin-bottom:24px;">
      <p style="font-size:13px;color:#555;margin:0;line-height:1.6;">
        Enquanto isso, conheça mais sobre a NEØ FlowOFF:<br/>
        <a href="https://lp.neoflowoff.agency" style="color:#ff077c;text-decoration:none;font-weight:600;">lp.neoflowoff.agency</a>
      </p>
    </div>
    ${footer()}
  </div>`;

  console.log(`[RESEND] Enviando confirmação para ${lead.email}...`);
  await dispatch(apiKey, {
    from: `NΞØ:One <${from}>`,
    to: lead.email,
    reply_to: toNeo,
    subject,
    html,
  });

  // Cópia interna para Neo
  await dispatch(apiKey, {
    from: `NΞØ:One <${from}>`,
    to: toNeo,
    subject: `[CÓPIA] Confirmação enviada para ${lead.email}`,
    html,
  });

  console.log("[RESEND] Confirmação enviada.");
}

/**
 * Template 3 — Alerta de segurança (para Neo)
 * Disparo: atividade suspeita detectada no input do visitante.
 */
export async function sendSuspiciousAlert(
  sessionId: string | undefined,
  category: SuspiciousCategory,
  message: string
): Promise<void> {
  const { apiKey, from, toNeo } = config();
  if (!apiKey) { console.warn("[RESEND] API key ausente — alerta de segurança não enviado."); return; }

  const categoryLabel = {
    prompt_injection:     "Injeção de Prompt",
    system_access:        "Acesso ao Sistema",
    infrastructure_probe: "Sondagem de Infraestrutura",
    social_engineering:   "Engenharia Social",
    code_execution:       "Tentativa de Execução de Código",
    security_test:        "Teste de Segurança",
  } satisfies Record<SuspiciousCategory, string>;

  const label = categoryLabel[category] ?? category;
  const subject = `[ALERTA SEGURANÇA] ${label}`;
  const ts = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;border:1px solid #eaeaea;border-radius:8px;background:#fff;">
    <h2 style="color:#c00;font-size:20px;font-weight:700;letter-spacing:-0.5px;margin:0 0 6px;">⚠ Atividade Suspeita Detectada</h2>
    <p style="font-size:13px;color:#888;margin:0 0 24px;">NΞØ:One — Sistema de Monitoramento</p>
    <div style="background:#fff5f5;padding:20px;border-radius:6px;border:1px solid #ffd0d0;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr style="border-bottom:1px solid #f0d0d0;">
          <td style="padding:10px 0;font-size:14px;color:#666;font-weight:500;width:130px;">Categoria:</td>
          <td style="padding:10px 0;font-size:14px;color:#c00;font-weight:700;">${label}</td>
        </tr>
        <tr style="border-bottom:1px solid #f0d0d0;">
          <td style="padding:10px 0;font-size:14px;color:#666;font-weight:500;">Sessão:</td>
          <td style="padding:10px 0;font-size:13px;color:#333;font-family:monospace;">${sessionId ?? "anônima"}</td>
        </tr>
        <tr style="border-bottom:1px solid #f0d0d0;">
          <td style="padding:10px 0;font-size:14px;color:#666;font-weight:500;">Horário:</td>
          <td style="padding:10px 0;font-size:14px;color:#333;">${ts}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#666;font-weight:500;vertical-align:top;">Mensagem:</td>
          <td style="padding:10px 0;font-size:13px;color:#333;font-family:monospace;line-height:1.5;word-break:break-all;">${escapeHtml(message.slice(0, 800))}</td>
        </tr>
      </table>
    </div>
    ${footer()}
  </div>`;

  console.log("[RESEND] Enviando alerta de segurança...");
  await dispatch(apiKey, { from: `NΞØ:One <${from}>`, to: toNeo, subject, html });
  console.log("[RESEND] Alerta de segurança enviado.");
}

/**
 * Template 4 — Resumo da conversa (para visitante + Neo)
 * Disparo: após handoff completo, quando visitante tem e-mail.
 */
export async function sendConversationSummary(lead: Lead): Promise<void> {
  const { apiKey, from, toNeo } = config();
  if (!apiKey || !lead.email) return;

  const nome = lead.nome ? lead.nome.split(" ")[0] : "visitante";
  const intent = lead.visitorIntent ? (INTENT_LABELS[lead.visitorIntent] ?? lead.visitorIntent) : null;
  const subject = "Resumo da sua conversa com NΞØ:One";

  const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;padding:30px;border:1px solid #eaeaea;border-radius:8px;background:#fff;">
    <h2 style="color:#000;font-size:20px;font-weight:700;letter-spacing:-0.5px;margin:0 0 20px;">Resumo da conversa</h2>
    <p style="font-size:15px;color:#444;line-height:1.7;margin-bottom:20px;">
      Olá, <strong>${nome}</strong>.<br/><br/>
      Aqui está um resumo do que discutimos e os próximos passos.
    </p>
    <div style="background:#f9f9f9;padding:20px;border-radius:6px;border:1px solid #f0f0f0;margin-bottom:20px;">
      ${intent ? `<p style="font-size:13px;color:#666;margin:0 0 12px;"><strong>Intenção identificada:</strong> ${intent}</p>` : ""}
      ${lead.observacoes ? `<p style="font-size:14px;color:#333;line-height:1.6;margin:0;"><strong>Contexto registrado:</strong><br/>${lead.observacoes}</p>` : ""}
    </div>
    <div style="background:#fff7ed;border-left:4px solid #ff077c;padding:14px 18px;border-radius:4px;margin-bottom:24px;">
      <p style="font-size:14px;color:#7c2d12;margin:0;line-height:1.6;">
        <strong>Próximo passo:</strong> Neo Mello entrará em contato${lead.email ? ` no e-mail <strong>${lead.email}</strong>` : ""}${lead.telefone ? ` ou WhatsApp <strong>${lead.telefone}</strong>` : ""} para dar sequência.
      </p>
    </div>
    ${footer()}
  </div>`;

  console.log(`[RESEND] Enviando resumo para ${lead.email} e ${toNeo}...`);
  await Promise.all([
    dispatch(apiKey, { from: `NΞØ:One <${from}>`, to: lead.email, reply_to: toNeo, subject, html }),
    dispatch(apiKey, { from: `NΞØ:One <${from}>`, to: toNeo, subject: `[RESUMO] Conversa com ${lead.nome || lead.email}`, html }),
  ]);
  console.log("[RESEND] Resumo enviado.");
}
