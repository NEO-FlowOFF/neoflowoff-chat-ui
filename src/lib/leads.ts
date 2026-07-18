import { pool } from "./db";
import {
  sendHandoffNotification,
  sendVisitorConfirmation,
  sendConversationSummary,
} from "./emails";
import { logger } from "./logger";
import {
  type CommercialIntent,
  isValidEmail,
  isValidPhone,
  scoreLead,
} from "./lead-scoring";

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
  commercialIntent?: CommercialIntent | null;
  poiEvidence?: string | null;
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
export interface LeadUpsertResult {
  becameLead: boolean;
  becameQualified: boolean;
  becameHandoffReady: boolean;
  leadScore: number;
  intentScore: number;
  poiDetected: boolean;
}

export async function upsertLead(lead: Lead): Promise<LeadUpsertResult | null> {
  if (!pool) return null;

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
    lead.commercialIntent ||
    lead.poiEvidence ||
    lead.poiDetected ||
    hasJsonData(lead.commercialContext) ||
    hasJsonData(lead.signalContext) ||
    hasJsonData(lead.agentContext) ||
    lead.consentStatus ||
    lead.consentSource;

  if (!hasData) return null;

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
    commercialIntent: "no_signal" as CommercialIntent,
    poiEvidence: "",
    cargo: "",
    urgencia: "",
    utmSource: "",
    utmCampaign: "",
    scoringVersion: "",
  };

  try {
    const result = await pool.query(
      `SELECT nome, empresa, email, telefone, cargo, observacoes, visitor_intent, dor_principal, necessidade_detectada, resumo_conversa, produto_interesse, codigo_item_interesse, urgencia, utm_source, utm_campaign, qualificado, handoff_sent, followup_status, lifecycle_stage, opportunity_status, lead_score, intent_score, poi_detected, signal_context FROM leads WHERE session_id = $1`,
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
        commercialIntent:
          row.signal_context?.commercialIntent || "no_signal",
        poiEvidence: row.signal_context?.poiEvidence || "",
        cargo: row.cargo || "",
        urgencia: row.urgencia || "",
        utmSource: row.utm_source || "",
        utmCampaign: row.utm_campaign || "",
        scoringVersion: row.signal_context?.scoringVersion || "",
      };
    }
  } catch (err) {
    logger.error("LEADS", "Failed to query existing lead", err);
  }

  const {
    nome: leadNome,
    empresa: leadEmpresa,
    email: leadEmail,
    telefone: leadTelefone,
    observacoes: leadObservacoes,
    visitorIntent: leadVisitorIntent,
    dorPrincipal: leadDorPrincipal,
    necessidadeDetectada: leadNecessidadeDetectada,
    resumoConversa: leadResumoConversa,
    produtoInteresse: leadProdutoInteresse,
    codigoItemInteresse: leadCodigoItemInteresse,
    cargo: leadCargo,
    urgencia: leadUrgencia,
    utmSource: leadUtmSource,
    utmCampaign: leadUtmCampaign,
    commercialIntent: leadCommercialIntent,
    poiEvidence: leadPoiEvidence,
    poiDetected: leadPoiDetected,
  } = lead;

  const {
    nome: existingNome,
    empresa: existingEmpresa,
    email: existingEmail,
    telefone: existingTelefone,
    observacoes: existingObservacoes,
    visitorIntent: existingVisitorIntent,
    dorPrincipal: existingDorPrincipal,
    necessidadeDetectada: existingNecessidadeDetectada,
    resumoConversa: existingResumoConversa,
    produtoInteresse: existingProdutoInteresse,
    codigoItemInteresse: existingCodigoItemInteresse,
    cargo: existingCargo,
    urgencia: existingUrgencia,
    utmSource: existingUtmSource,
    utmCampaign: existingUtmCampaign,
    commercialIntent: existingCommercialIntent,
    poiEvidence: existingPoiEvidence,
    poiDetected: existingPoiDetected,
    qualificado: existingQualificado,
    handoffSent: existingHandoffSent,
    followupStatus: existingFollowupStatus,
    lifecycleStage: existingLifecycleStage,
    opportunityStatus: existingOpportunityStatus,
    scoringVersion: existingScoringVersion,
    leadScore: existingLeadScore,
    intentScore: existingIntentScore,
  } = existing;

  const finalNome = cleanText(leadNome) || existingNome;
  const finalEmpresa = cleanText(leadEmpresa) || existingEmpresa;
  const finalEmail = cleanText(leadEmail) || existingEmail;
  const finalTelefone = cleanText(leadTelefone) || existingTelefone;
  const finalObservacoes = cleanText(leadObservacoes) || existingObservacoes;
  const finalVisitorIntent = cleanText(leadVisitorIntent) || existingVisitorIntent;
  const finalDorPrincipal = cleanText(leadDorPrincipal) || existingDorPrincipal;
  const finalNecessidadeDetectada =
    cleanText(leadNecessidadeDetectada) || existingNecessidadeDetectada;
  const finalResumoConversa =
    cleanText(leadResumoConversa) || existingResumoConversa;
  const finalProdutoInteresse =
    cleanText(leadProdutoInteresse) || existingProdutoInteresse;
  const finalCodigoItemInteresse =
    cleanText(leadCodigoItemInteresse) || existingCodigoItemInteresse;
  const finalCargo = cleanText(leadCargo) || existingCargo;
  const finalUrgencia = cleanText(leadUrgencia) || existingUrgencia;
  const finalUtmSource = cleanText(leadUtmSource) || existingUtmSource;
  const finalUtmCampaign =
    cleanText(leadUtmCampaign) || existingUtmCampaign;
  const finalCommercialIntent =
    leadCommercialIntent || existingCommercialIntent;
  const finalPoiEvidence = cleanText(leadPoiEvidence) || existingPoiEvidence;

  const scoring = scoreLead({
    nome: finalNome,
    email: finalEmail,
    telefone: finalTelefone,
    empresa: finalEmpresa,
    cargo: finalCargo,
    dorPrincipal: finalDorPrincipal,
    necessidadeDetectada: finalNecessidadeDetectada,
    produtoInteresse: finalProdutoInteresse,
    urgencia: finalUrgencia,
    utmSource: finalUtmSource,
    utmCampaign: finalUtmCampaign,
    commercialIntent: finalCommercialIntent,
    poiDetected: leadPoiDetected || existingPoiDetected,
    poiEvidence: finalPoiEvidence,
  });
  const hasContact = isValidEmail(finalEmail) || isValidPhone(finalTelefone);
  const existingHasContact =
    isValidEmail(existingEmail) || isValidPhone(existingTelefone);
  const {
    poiDetected: scoringPoiDetected,
    qualified: scoringQualified,
    leadScore: scoringLeadScore,
    intentScore: scoringIntentScore,
    handoffReady,
  } = scoring;

  const poiDetected = existingPoiDetected || scoringPoiDetected;
  const isQualified = existingQualificado || scoringQualified;
  const isCurrentScoringVersion =
    existingScoringVersion === "2026-07-18.v1";
  const leadScore = isCurrentScoringVersion
    ? Math.max(existingLeadScore, scoringLeadScore)
    : scoringLeadScore;
  const intentScore = isCurrentScoringVersion
    ? Math.max(existingIntentScore, scoringIntentScore)
    : scoringIntentScore;
  const becameLead = !existingHasContact && hasContact;
  const becameQualified = !existingQualificado && isQualified;
  const becameHandoffReady = !existingHandoffSent && handoffReady;
  const hasCommercialSignal = intentScore >= 40 || poiDetected;

  const followupStatus =
    isQualified &&
    (!existingFollowupStatus || existingFollowupStatus === "pending")
      ? "ready"
      : existingFollowupStatus || "pending";

  const lifecycleStage = resolveLifecycleStage({
    existingStage: existingLifecycleStage,
    existingHandoffSent: existingHandoffSent,
    isQualified,
    poiDetected,
    hasCommercialSignal,
  });

  const opportunityStatus =
    existingOpportunityStatus === "won" ||
    existingOpportunityStatus === "lost"
      ? existingOpportunityStatus
      : isQualified
        ? "open"
        : existingOpportunityStatus || "new";

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
    JSON.stringify({
      ...(lead.signalContext || {}),
      commercialIntent: finalCommercialIntent,
      poiEvidence: finalPoiEvidence || null,
      scoreComponents: scoring.components,
      scoringVersion: "2026-07-18.v1",
    }),
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

      lead_score = CASE
        WHEN COALESCE(leads.signal_context->>'scoringVersion', '') <> '2026-07-18.v1'
          THEN EXCLUDED.lead_score
        ELSE GREATEST(leads.lead_score, EXCLUDED.lead_score)
      END,
      intent_score = CASE
        WHEN COALESCE(leads.signal_context->>'scoringVersion', '') <> '2026-07-18.v1'
          THEN EXCLUDED.intent_score
        ELSE GREATEST(leads.intent_score, EXCLUDED.intent_score)
      END,

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
    ? `qualified | leadScore=${leadScore}, intentScore=${intentScore}, poi=${poiDetected}`
    : `not qualified | leadScore=${leadScore}, intentScore=${intentScore}, contact=${hasContact}`;

  logger.info("LEADS", "Lead saved", {
    stage: lifecycleStage,
    leadScore,
    intentScore,
    qualification: qualReason,
  });

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
      logger.error("LEADS", "Failed to send visitor confirmation", err),
    );
  }

  // Handoff exige nome, WhatsApp válido e intenção comercial explícita.
  if (becameHandoffReady) {
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
        logger.error("LEADS", "Failed to send handoff emails", err);
      });
  }

  return {
    becameLead,
    becameQualified,
    becameHandoffReady,
    leadScore,
    intentScore,
    poiDetected,
  };
}

export interface LeadOperationalState {
  nome: string;
  empresa: string;
  email: string;
  telefone: string;
  qualificado: boolean;
  handoffSent: boolean;
  lifecycleStage: string;
  poiDetected: boolean;
  produtoInteresse: string;
  dorPrincipal: string;
}

/**
 * Consulta o estado operacional do lead em tempo real no PostgreSQL
 * para injeção de contexto (Backend Authority) antes da geração de resposta no chat.
 */
export async function getLeadBySessionId(
  sessionId: string,
): Promise<LeadOperationalState | null> {
  if (!pool || !sessionId) return null;

  try {
    const result = await pool.query(
      `SELECT nome, empresa, email, telefone, qualificado, handoff_sent, lifecycle_stage, poi_detected, produto_interesse, dor_principal FROM leads WHERE session_id = $1`,
      [sessionId],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      nome: row.nome || "",
      empresa: row.empresa || "",
      email: row.email || "",
      telefone: row.telefone || "",
      qualificado: !!row.qualificado,
      handoffSent: !!row.handoff_sent,
      lifecycleStage: row.lifecycle_stage || "visitor",
      poiDetected: !!row.poi_detected,
      produtoInteresse: row.produto_interesse || "",
      dorPrincipal: row.dor_principal || "",
    };
  } catch (err) {
    logger.error("LEADS", "Failed to query operational lead state", err);
    return null;
  }
}
