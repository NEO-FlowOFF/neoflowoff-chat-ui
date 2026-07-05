import { pool } from "./db";
import {
  sendHandoffNotification,
  sendVisitorConfirmation,
  sendConversationSummary,
} from "./emails";

type JsonRecord = Record<string, unknown>;

export interface Lead {
  sessionId: string;

  // Identificação
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  empresa?: string | null;
  cargo?: string | null;

  // Conversa / diagnóstico
  observacoes?: string | null;
  visitorIntent?: string | null;
  dorPrincipal?: string | null;
  necessidadeDetectada?: string | null;
  resumoConversa?: string | null;
  ultimaMensagem?: string | null;

  // Interesse comercial
  produtoInteresse?: string | null;
  codigoItemInteresse?: string | null;
  categoriaInteresse?: string | null;
  urgencia?: string | null;
  faixaOrcamento?: string | null;
  tamanhoEmpresa?: string | null;
  canalPreferido?: string | null;

  // Qualificação
  qualificado?: boolean;
  leadScore?: number;
  intentScore?: number;
  poiDetected?: boolean;
  lifecycleStage?: string | null;
  opportunityStatus?: string | null;

  // Tracking / atribuição
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  landingPath?: string | null;
  referrer?: string | null;

  // Signal Layer
  eventId?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  userAgent?: string | null;
  ipHash?: string | null;

  // Contextos estruturados
  commercialContext?: JsonRecord | null;
  signalContext?: JsonRecord | null;
  agentContext?: JsonRecord | null;

  // Consentimento
  consentStatus?: string | null;
  consentSource?: string | null;
  consentAt?: Date | string | null;
}

function cleanText(value?: string | null): string | null {
  const cleaned = value?.trim();
  return cleaned || null;
}

function hasJsonData(value?: JsonRecord | null): boolean {
  return !!value && Object.keys(value).length > 0;
}

function scoreNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function resolveLifecycleStage(input: {
  existingStage?: string;
  existingHandoffSent: boolean;
  isQualified: boolean;
  poiDetected: boolean;
  hasCommercialSignal: boolean;
}): string {
  const {
    existingStage,
    existingHandoffSent,
    isQualified,
    poiDetected,
    hasCommercialSignal,
  } = input;

  if (existingStage === "won" || existingStage === "lost") return existingStage;
  if (existingHandoffSent) return "handoff_sent";
  if (isQualified) return "handoff_ready";
  if (poiDetected) return "poi_detected";
  if (hasCommercialSignal) return "qualifying";

  return existingStage || "visitor";
}

/**
 * Insere ou atualiza um lead no PostgreSQL.
 * Apenas campos com valor não-nulo são sobrescritos.
 *
 * Nova lógica:
 * lead = contato + contexto + sinal + intenção + estágio comercial.
 */
export async function upsertLead(lead: Lead): Promise<void> {
  if (!pool) return;

  const hasData =
    lead.nome ||
    lead.email ||
    lead.telefone ||
    lead.empresa ||
    lead.cargo ||
    lead.observacoes ||
    lead.visitorIntent ||
    lead.dorPrincipal ||
    lead.necessidadeDetectada ||
    lead.resumoConversa ||
    lead.ultimaMensagem ||
    lead.produtoInteresse ||
    lead.codigoItemInteresse ||
    lead.categoriaInteresse ||
    lead.urgencia ||
    lead.faixaOrcamento ||
    lead.tamanhoEmpresa ||
    lead.canalPreferido ||
    lead.utmSource ||
    lead.utmMedium ||
    lead.utmCampaign ||
    lead.utmTerm ||
    lead.utmContent ||
    lead.gclid ||
    lead.fbclid ||
    lead.landingPath ||
    lead.referrer ||
    lead.eventId ||
    lead.fbp ||
    lead.fbc ||
    lead.userAgent ||
    lead.ipHash ||
    hasJsonData(lead.commercialContext) ||
    hasJsonData(lead.signalContext) ||
    hasJsonData(lead.agentContext) ||
    lead.consentStatus ||
    lead.consentSource;

  if (!hasData) return;

  let existing = {
    nome: "",
    empresa: "",
    email: "",
    telefone: "",
    observacoes: "",
    visitorIntent: "",
    dorPrincipal: "",
    necessidadeDetectada: "",
    resumoConversa: "",
    produtoInteresse: "",
    codigoItemInteresse: "",
    qualificado: false,
    handoffSent: false,
    followupStatus: "",
    lifecycleStage: "",
    opportunityStatus: "",
    leadScore: 0,
    intentScore: 0,
    poiDetected: false,
  };

  try {
    const result = await pool.query(
      `SELECT nome, empresa, email, telefone, observacoes, visitor_intent, dor_principal, necessidade_detectada, resumo_conversa, produto_interesse, codigo_item_interesse, qualificado, handoff_sent, followup_status, lifecycle_stage, opportunity_status, lead_score, intent_score, poi_detected FROM leads WHERE session_id = $1`,
      [lead.sessionId],
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];

      existing = {
        nome: row.nome || "",
        empresa: row.empresa || "",
        email: row.email || "",
        telefone: row.telefone || "",
        observacoes: row.observacoes || "",
        visitorIntent: row.visitor_intent || "",
        dorPrincipal: row.dor_principal || "",
        necessidadeDetectada: row.necessidade_detectada || "",
        resumoConversa: row.resumo_conversa || "",
        produtoInteresse: row.produto_interesse || "",
        codigoItemInteresse: row.codigo_item_interesse || "",
        qualificado: !!row.qualificado,
        handoffSent: !!row.handoff_sent,
        followupStatus: row.followup_status || "",
        lifecycleStage: row.lifecycle_stage || "",
        opportunityStatus: row.opportunity_status || "",
        leadScore: scoreNumber(row.lead_score),
        intentScore: scoreNumber(row.intent_score),
        poiDetected: !!row.poi_detected,
      };
    }
  } catch (err) {
    console.log("[LEADS] Erro ao consultar lead existente:", err);
  }

  const finalNome = cleanText(lead.nome) || existing.nome;
  const finalEmpresa = cleanText(lead.empresa) || existing.empresa;
  const finalEmail = cleanText(lead.email) || existing.email;
  const finalTelefone = cleanText(lead.telefone) || existing.telefone;
  const finalObservacoes = cleanText(lead.observacoes) || existing.observacoes;
  const finalVisitorIntent =
    cleanText(lead.visitorIntent) || existing.visitorIntent;
  const finalDorPrincipal =
    cleanText(lead.dorPrincipal) || existing.dorPrincipal;
  const finalNecessidadeDetectada =
    cleanText(lead.necessidadeDetectada) || existing.necessidadeDetectada;
  const finalResumoConversa =
    cleanText(lead.resumoConversa) || existing.resumoConversa;
  const finalProdutoInteresse =
    cleanText(lead.produtoInteresse) || existing.produtoInteresse;
  const finalCodigoItemInteresse =
    cleanText(lead.codigoItemInteresse) || existing.codigoItemInteresse;

  const hasContact = !!(finalEmail || finalTelefone);
  const hasIdentity = !!(finalNome || finalEmpresa);

  const hasNeed = !!(
    finalObservacoes ||
    finalVisitorIntent ||
    finalDorPrincipal ||
    finalNecessidadeDetectada ||
    finalResumoConversa
  );

  const hasCommercialInterest = !!(
    finalProdutoInteresse ||
    finalCodigoItemInteresse ||
    cleanText(lead.categoriaInteresse) ||
    cleanText(lead.urgencia) ||
    cleanText(lead.faixaOrcamento)
  );

  const hasCommercialSignal = hasNeed || hasCommercialInterest;

  const poiDetected = !!(
    lead.poiDetected ||
    existing.poiDetected ||
    hasCommercialInterest ||
    finalDorPrincipal ||
    finalNecessidadeDetectada
  );

  /**
   * Regra atual:
   * Para qualificar, precisa ter contato + algum sinal mínimo:
   * - identidade;
   * - necessidade;
   * - interesse comercial;
   * - POI detectado.
   */
  const isQualified =
    lead.qualificado ??
    (existing.qualificado
      ? true
      : hasContact &&
        (hasIdentity || hasNeed || hasCommercialInterest || poiDetected));

  const leadScore = Math.max(
    existing.leadScore,
    scoreNumber(lead.leadScore),
    isQualified ? 70 : 0,
    poiDetected ? 50 : 0,
  );

  const intentScore = Math.max(
    existing.intentScore,
    scoreNumber(lead.intentScore),
    hasCommercialInterest ? 70 : 0,
    hasNeed ? 50 : 0,
  );

  const followupStatus =
    isQualified &&
    (!existing.followupStatus || existing.followupStatus === "pending")
      ? "ready"
      : existing.followupStatus || "pending";

  const lifecycleStage = resolveLifecycleStage({
    existingStage: existing.lifecycleStage,
    existingHandoffSent: existing.handoffSent,
    isQualified,
    poiDetected,
    hasCommercialSignal,
  });

  const opportunityStatus =
    existing.opportunityStatus === "won" ||
    existing.opportunityStatus === "lost"
      ? existing.opportunityStatus
      : isQualified
        ? "open"
        : existing.opportunityStatus || "new";

  const now = new Date();

  const insertColumns = [
    "session_id",
    "nome",
    "email",
    "telefone",
    "empresa",
    "cargo",

    "observacoes",
    "visitor_intent",
    "dor_principal",
    "necessidade_detectada",
    "resumo_conversa",
    "ultima_mensagem",

    "produto_interesse",
    "codigo_item_interesse",
    "categoria_interesse",
    "urgencia",
    "faixa_orcamento",
    "tamanho_empresa",
    "canal_preferido",

    "qualificado",
    "lead_score",
    "intent_score",
    "poi_detected",
    "lifecycle_stage",
    "opportunity_status",

    "handoff_sent",
    "followup_status",

    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "gclid",
    "fbclid",
    "landing_path",
    "referrer",

    "event_id",
    "fbp",
    "fbc",
    "user_agent",
    "ip_hash",
    "first_touch_at",
    "last_touch_at",

    "commercial_context",
    "signal_context",
    "agent_context",

    "consent_status",
    "consent_source",
    "consent_at",
  ];

  const values = [
    lead.sessionId,
    cleanText(lead.nome),
    cleanText(lead.email),
    cleanText(lead.telefone),
    cleanText(lead.empresa),
    cleanText(lead.cargo),

    cleanText(lead.observacoes),
    cleanText(lead.visitorIntent),
    cleanText(lead.dorPrincipal),
    cleanText(lead.necessidadeDetectada),
    cleanText(lead.resumoConversa),
    cleanText(lead.ultimaMensagem),

    cleanText(lead.produtoInteresse),
    cleanText(lead.codigoItemInteresse),
    cleanText(lead.categoriaInteresse),
    cleanText(lead.urgencia),
    cleanText(lead.faixaOrcamento),
    cleanText(lead.tamanhoEmpresa),
    cleanText(lead.canalPreferido),

    isQualified,
    leadScore,
    intentScore,
    poiDetected,
    lifecycleStage,
    opportunityStatus,

    existing.handoffSent,
    followupStatus,

    cleanText(lead.utmSource),
    cleanText(lead.utmMedium),
    cleanText(lead.utmCampaign),
    cleanText(lead.utmTerm),
    cleanText(lead.utmContent),
    cleanText(lead.gclid),
    cleanText(lead.fbclid),
    cleanText(lead.landingPath),
    cleanText(lead.referrer),

    cleanText(lead.eventId),
    cleanText(lead.fbp),
    cleanText(lead.fbc),
    cleanText(lead.userAgent),
    cleanText(lead.ipHash),
    now,
    now,

    JSON.stringify(lead.commercialContext || {}),
    JSON.stringify(lead.signalContext || {}),
    JSON.stringify(lead.agentContext || {}),

    cleanText(lead.consentStatus),
    cleanText(lead.consentSource),
    lead.consentAt || null,
  ];

  const placeholders = insertColumns
    .map((_, index) => `$${index + 1}`)
    .join(", ");

  await pool.query(
    `
    INSERT INTO leads (${insertColumns.join(", ")})
    VALUES (${placeholders})
    ON CONFLICT (session_id) DO UPDATE SET
      nome            = COALESCE(EXCLUDED.nome, leads.nome),
      email           = COALESCE(EXCLUDED.email, leads.email),
      telefone        = COALESCE(EXCLUDED.telefone, leads.telefone),
      empresa         = COALESCE(EXCLUDED.empresa, leads.empresa),
      cargo           = COALESCE(EXCLUDED.cargo, leads.cargo),

      observacoes             = COALESCE(EXCLUDED.observacoes, leads.observacoes),
      visitor_intent          = COALESCE(EXCLUDED.visitor_intent, leads.visitor_intent),
      dor_principal           = COALESCE(EXCLUDED.dor_principal, leads.dor_principal),
      necessidade_detectada   = COALESCE(EXCLUDED.necessidade_detectada, leads.necessidade_detectada),
      resumo_conversa         = COALESCE(EXCLUDED.resumo_conversa, leads.resumo_conversa),
      ultima_mensagem         = COALESCE(EXCLUDED.ultima_mensagem, leads.ultima_mensagem),

      produto_interesse       = COALESCE(EXCLUDED.produto_interesse, leads.produto_interesse),
      codigo_item_interesse   = COALESCE(EXCLUDED.codigo_item_interesse, leads.codigo_item_interesse),
      categoria_interesse     = COALESCE(EXCLUDED.categoria_interesse, leads.categoria_interesse),
      urgencia                = COALESCE(EXCLUDED.urgencia, leads.urgencia),
      faixa_orcamento         = COALESCE(EXCLUDED.faixa_orcamento, leads.faixa_orcamento),
      tamanho_empresa         = COALESCE(EXCLUDED.tamanho_empresa, leads.tamanho_empresa),
      canal_preferido         = COALESCE(EXCLUDED.canal_preferido, leads.canal_preferido),

      qualificado = CASE
        WHEN leads.qualificado = TRUE THEN TRUE
        ELSE EXCLUDED.qualificado
      END,

      lead_score = GREATEST(leads.lead_score, EXCLUDED.lead_score),
      intent_score = GREATEST(leads.intent_score, EXCLUDED.intent_score),

      poi_detected = CASE
        WHEN leads.poi_detected = TRUE THEN TRUE
        ELSE EXCLUDED.poi_detected
      END,

      lifecycle_stage = CASE
        WHEN leads.lifecycle_stage IN ('won', 'lost') THEN leads.lifecycle_stage
        WHEN leads.handoff_sent = TRUE THEN 'handoff_sent'
        WHEN EXCLUDED.lifecycle_stage = 'handoff_ready' THEN 'handoff_ready'
        WHEN EXCLUDED.lifecycle_stage = 'poi_detected'
          AND leads.lifecycle_stage NOT IN ('qualified', 'handoff_ready', 'handoff_sent')
          THEN 'poi_detected'
        WHEN EXCLUDED.lifecycle_stage = 'qualifying'
          AND leads.lifecycle_stage IN ('visitor', 'exploring')
          THEN 'qualifying'
        ELSE leads.lifecycle_stage
      END,

      opportunity_status = CASE
        WHEN leads.opportunity_status IN ('won', 'lost') THEN leads.opportunity_status
        WHEN EXCLUDED.opportunity_status = 'open' THEN 'open'
        ELSE leads.opportunity_status
      END,

      followup_status = CASE
        WHEN leads.followup_status = 'pending' AND EXCLUDED.qualificado = TRUE
          THEN 'ready'
        ELSE leads.followup_status
      END,

      utm_source      = COALESCE(leads.utm_source,   EXCLUDED.utm_source),
      utm_medium      = COALESCE(leads.utm_medium,   EXCLUDED.utm_medium),
      utm_campaign    = COALESCE(leads.utm_campaign, EXCLUDED.utm_campaign),
      utm_term        = COALESCE(leads.utm_term,     EXCLUDED.utm_term),
      utm_content     = COALESCE(leads.utm_content,  EXCLUDED.utm_content),
      gclid           = COALESCE(leads.gclid,        EXCLUDED.gclid),
      fbclid          = COALESCE(leads.fbclid,       EXCLUDED.fbclid),
      landing_path    = COALESCE(leads.landing_path, EXCLUDED.landing_path),
      referrer        = COALESCE(leads.referrer,     EXCLUDED.referrer),

      event_id        = COALESCE(EXCLUDED.event_id, leads.event_id),
      fbp             = COALESCE(EXCLUDED.fbp, leads.fbp),
      fbc             = COALESCE(EXCLUDED.fbc, leads.fbc),
      user_agent      = COALESCE(EXCLUDED.user_agent, leads.user_agent),
      ip_hash         = COALESCE(EXCLUDED.ip_hash, leads.ip_hash),
      first_touch_at  = COALESCE(leads.first_touch_at, EXCLUDED.first_touch_at),
      last_touch_at   = EXCLUDED.last_touch_at,

      commercial_context = COALESCE(leads.commercial_context, '{}'::jsonb)
        || COALESCE(EXCLUDED.commercial_context, '{}'::jsonb),

      signal_context = COALESCE(leads.signal_context, '{}'::jsonb)
        || COALESCE(EXCLUDED.signal_context, '{}'::jsonb),

      agent_context = COALESCE(leads.agent_context, '{}'::jsonb)
        || COALESCE(EXCLUDED.agent_context, '{}'::jsonb),

      consent_status = COALESCE(EXCLUDED.consent_status, leads.consent_status),
      consent_source = COALESCE(EXCLUDED.consent_source, leads.consent_source),
      consent_at     = COALESCE(EXCLUDED.consent_at, leads.consent_at),

      updated_at = NOW()
    `,
    values,
  );

  const qualReason = isQualified
    ? `qualified | contact=${hasContact}, identity=${hasIdentity}, need=${hasNeed}, poi=${poiDetected}, product=${!!finalProdutoInteresse}`
    : `not qualified | missing: ${!hasContact ? "contact " : ""}${
        !hasIdentity && !hasNeed && !hasCommercialInterest
          ? "identity/need/commercial-signal"
          : ""
      }`.trim();

  console.log(
    `[LEADS] Lead saved — session ${lead.sessionId} | stage=${lifecycleStage} | score=${leadScore}/${intentScore} | ${qualReason}`,
  );

  const mergedLead: Lead = {
    ...lead,
    nome: finalNome || null,
    empresa: finalEmpresa || null,
    email: finalEmail || null,
    telefone: finalTelefone || null,
    observacoes: finalObservacoes || null,
    visitorIntent: finalVisitorIntent || null,
    dorPrincipal: finalDorPrincipal || null,
    necessidadeDetectada: finalNecessidadeDetectada || null,
    resumoConversa: finalResumoConversa || null,
    produtoInteresse: finalProdutoInteresse || null,
    codigoItemInteresse: finalCodigoItemInteresse || null,
    qualificado: isQualified,
    leadScore,
    intentScore,
    poiDetected,
    lifecycleStage,
    opportunityStatus,
  };

  // Confirmação para o visitante quando e-mail é capturado pela primeira vez
  if (mergedLead.email && !existing.email) {
    sendVisitorConfirmation(mergedLead).catch((err) =>
      console.log("[LEADS] Falha ao enviar confirmação para visitante:", err),
    );
  }

  // Handoff + resumo quando lead qualifica pela primeira vez
  if (isQualified && !existing.handoffSent) {
    Promise.all([
      sendHandoffNotification(mergedLead),
      sendConversationSummary(mergedLead),
    ])
      .then(async () => {
        await pool?.query(
          `
          UPDATE leads
          SET
            handoff_sent = TRUE,
            handoff_sent_at = COALESCE(handoff_sent_at, NOW()),
            lifecycle_stage = 'handoff_sent',
            opportunity_status = CASE
              WHEN opportunity_status IN ('won', 'lost') THEN opportunity_status
              ELSE 'open'
            END,
            updated_at = NOW()
          WHERE session_id = $1
          `,
          [lead.sessionId],
        );
      })
      .catch((err) => {
        console.log("[LEADS] Falha ao enviar e-mails de handoff:", err);
      });
  }
}
