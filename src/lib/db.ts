import { logger } from "@/lib/logger";
import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

logger.debug("DB", "Inicializando módulo db.ts...");
logger.debug("DB", "DATABASE_URL definida?", { defined: !!databaseUrl });

if (!databaseUrl) {
  logger.warn(
    "DB",
    "DATABASE_URL não encontrada. Captura de leads desativada.",
  );
}

// Configuração de SSL direcionada por variável de ambiente (ex: DB_SSL_MODE="require" | "strict" | "false")
// Padrão: desativado (false), compatível com conexões HA internas (ex.: Railway HA).
const sslMode = process.env.DB_SSL_MODE?.toLowerCase();
const sslConfig =
  sslMode === "require" || sslMode === "true" || sslMode === "1"
    ? { rejectUnauthorized: false }
    : sslMode === "strict"
      ? true
      : false;

/**
 * Pool de conexões PostgreSQL.
 * Null quando DATABASE_URL não está configurada (dev sem banco).
 */
export const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: sslConfig,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    })
  : null;

// Captura erros de conexão emitidos pelo pool (ex: quedas de rede, reinicializações
// do banco, timeouts do PgBouncer). Sem este handler, o Node.js trata o evento
// 'error' como não tratado e encerra o processo.
if (pool) {
  pool.on("error", (err: Error) => {
    logger.error(
      "DB",
      "Erro inesperado no pool de conexões PostgreSQL — conexão será descartada e o pool tentará reconectar automaticamente",
      err,
    );
  });
}

logger.debug("DB", "Pool criado?", { created: !!pool });

/**
 * Garante que a tabela `leads` existe.
 * Chamada uma vez na inicialização do servidor.
 */
export async function ensureLeadsTable(): Promise<void> {
  logger.debug("DB", "ensureLeadsTable() chamada");
  if (!pool) {
    logger.debug("DB", "Pool é null, retornando");
    return;
  }

  try {
    logger.debug("DB", "Executando CREATE TABLE leads...");
    await pool.query(`
  CREATE EXTENSION IF NOT EXISTS pgcrypto;

  CREATE TABLE IF NOT EXISTS leads (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id   TEXT NOT NULL UNIQUE,

    -- Identificação básica
    nome         TEXT,
    email        TEXT,
    telefone     TEXT,
    empresa      TEXT,
    cargo        TEXT,

    -- Conversa / diagnóstico
    observacoes  TEXT,
    visitor_intent TEXT,
    dor_principal TEXT,
    necessidade_detectada TEXT,
    resumo_conversa TEXT,
    ultima_mensagem TEXT,

    -- Interesse comercial
    produto_interesse TEXT,
    codigo_item_interesse TEXT,
    categoria_interesse TEXT,
    urgencia TEXT,
    faixa_orcamento TEXT,
    tamanho_empresa TEXT,
    canal_preferido TEXT,

    -- Qualificação / ciclo comercial
    qualificado  BOOLEAN NOT NULL DEFAULT FALSE,
    lead_score INTEGER NOT NULL DEFAULT 0,
    intent_score INTEGER NOT NULL DEFAULT 0,
    poi_detected BOOLEAN NOT NULL DEFAULT FALSE,
    lifecycle_stage TEXT NOT NULL DEFAULT 'visitor',
    opportunity_status TEXT NOT NULL DEFAULT 'new',

    -- Handoff
    handoff_sent BOOLEAN NOT NULL DEFAULT FALSE,
    handoff_reason TEXT,
    handoff_channel TEXT,
    handoff_sent_at TIMESTAMPTZ,

    -- Follow-up
    followup_status TEXT NOT NULL DEFAULT 'pending',
    followup_due_at TIMESTAMPTZ,
    followup_attempts INTEGER NOT NULL DEFAULT 0,
    last_followup_at TIMESTAMPTZ,
    followup_notes TEXT,

    -- Atribuição e Tracking
    utm_source   TEXT,
    utm_medium   TEXT,
    utm_campaign TEXT,
    utm_term     TEXT,
    utm_content  TEXT,
    gclid        TEXT,
    fbclid       TEXT,
    landing_path TEXT,
    referrer     TEXT,

    -- Signal Layer / eventos
    event_id TEXT,
    fbp TEXT,
    fbc TEXT,
    user_agent TEXT,
    ip_hash TEXT,
    first_touch_at TIMESTAMPTZ,
    last_touch_at TIMESTAMPTZ,

    -- Contexto estruturado
    commercial_context JSONB NOT NULL DEFAULT '{}'::jsonb,
    signal_context JSONB NOT NULL DEFAULT '{}'::jsonb,
    agent_context JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Consentimento / governança
    consent_status TEXT,
    consent_source TEXT,
    consent_at TIMESTAMPTZ,

    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Migrações defensivas para bancos já existentes
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS cargo TEXT;

  ALTER TABLE leads ADD COLUMN IF NOT EXISTS visitor_intent TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS dor_principal TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS necessidade_detectada TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS resumo_conversa TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS ultima_mensagem TEXT;

  ALTER TABLE leads ADD COLUMN IF NOT EXISTS produto_interesse TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS codigo_item_interesse TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS categoria_interesse TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS urgencia TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS faixa_orcamento TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS tamanho_empresa TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS canal_preferido TEXT;

  ALTER TABLE leads ADD COLUMN IF NOT EXISTS qualificado BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS intent_score INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS poi_detected BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT NOT NULL DEFAULT 'visitor';
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS opportunity_status TEXT NOT NULL DEFAULT 'new';

  ALTER TABLE leads ADD COLUMN IF NOT EXISTS handoff_sent BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS handoff_reason TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS handoff_channel TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS handoff_sent_at TIMESTAMPTZ;

  ALTER TABLE leads ADD COLUMN IF NOT EXISTS followup_status TEXT NOT NULL DEFAULT 'pending';
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS followup_due_at TIMESTAMPTZ;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS followup_attempts INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_followup_at TIMESTAMPTZ;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS followup_notes TEXT;

  ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_source   TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_medium   TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_term     TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_content  TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS gclid        TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS fbclid       TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS landing_path TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS referrer     TEXT;

  ALTER TABLE leads ADD COLUMN IF NOT EXISTS event_id TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS fbp TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS fbc TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS user_agent TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS ip_hash TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS first_touch_at TIMESTAMPTZ;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_touch_at TIMESTAMPTZ;

  ALTER TABLE leads ADD COLUMN IF NOT EXISTS commercial_context JSONB NOT NULL DEFAULT '{}'::jsonb;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS signal_context JSONB NOT NULL DEFAULT '{}'::jsonb;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS agent_context JSONB NOT NULL DEFAULT '{}'::jsonb;

  ALTER TABLE leads ADD COLUMN IF NOT EXISTS consent_status TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS consent_source TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ;

  -- Compatibilidade com leads antigos
  UPDATE leads
  SET followup_status = 'ready'
  WHERE qualificado = TRUE
    AND followup_status = 'pending';

  UPDATE leads
  SET lifecycle_stage = 'qualified'
  WHERE qualificado = TRUE
    AND lifecycle_stage = 'visitor';

  UPDATE leads
  SET lifecycle_stage = 'handoff_ready'
  WHERE handoff_sent = TRUE
    AND lifecycle_stage IN ('visitor', 'qualified');

  -- Índices comerciais
  CREATE INDEX IF NOT EXISTS leads_followup_status_due_at_idx
    ON leads (followup_status, followup_due_at);

  CREATE INDEX IF NOT EXISTS leads_lifecycle_stage_idx
    ON leads (lifecycle_stage);

  CREATE INDEX IF NOT EXISTS leads_opportunity_status_idx
    ON leads (opportunity_status);

  CREATE INDEX IF NOT EXISTS leads_produto_interesse_idx
    ON leads (produto_interesse);

  CREATE INDEX IF NOT EXISTS leads_codigo_item_interesse_idx
    ON leads (codigo_item_interesse);

  CREATE INDEX IF NOT EXISTS leads_utm_source_campaign_idx
    ON leads (utm_source, utm_campaign);

  CREATE INDEX IF NOT EXISTS leads_created_at_idx
    ON leads (created_at DESC);

  CREATE INDEX IF NOT EXISTS leads_last_touch_at_idx
    ON leads (last_touch_at DESC);

  CREATE INDEX IF NOT EXISTS leads_score_idx
    ON leads (lead_score DESC, intent_score DESC);

  CREATE INDEX IF NOT EXISTS leads_poi_detected_idx
    ON leads (poi_detected);

  CREATE INDEX IF NOT EXISTS leads_commercial_context_gin_idx
    ON leads USING GIN (commercial_context);

  CREATE INDEX IF NOT EXISTS leads_signal_context_gin_idx
    ON leads USING GIN (signal_context);

  CREATE INDEX IF NOT EXISTS leads_agent_context_gin_idx
    ON leads USING GIN (agent_context);

  CREATE OR REPLACE FUNCTION update_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS leads_updated_at ON leads;
  CREATE TRIGGER leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
`);
    logger.info("DB", "Tabela leads verificada/criada.");
  } catch (error) {
    logger.error("DB", "Erro ao criar tabela leads", error);
    throw error;
  }
}

/**
 * Garante que a tabela `suspicious_events` existe.
 * Chamada uma vez na inicialização do servidor.
 */
export async function ensureSuspiciousEventsTable(): Promise<void> {
  logger.debug("DB", "ensureSuspiciousEventsTable() chamada");
  if (!pool) {
    logger.debug("DB", "Pool é null, retornando");
    return;
  }

  try {
    logger.debug("DB", "Executando CREATE TABLE suspicious_events...");
    await pool.query(`
    CREATE TABLE IF NOT EXISTS suspicious_events (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id  TEXT,
      categoria   TEXT NOT NULL,
      mensagem    TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS suspicious_events_created_at_idx
      ON suspicious_events (created_at DESC);
    CREATE INDEX IF NOT EXISTS suspicious_events_categoria_idx
      ON suspicious_events (categoria);
  `);
    logger.info("DB", "Tabela suspicious_events verificada/criada.");
  } catch (error) {
    logger.error("DB", "Erro ao criar tabela suspicious_events", error);
    throw error;
  }
}
