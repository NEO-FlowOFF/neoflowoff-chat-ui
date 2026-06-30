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

/**
 * Pool de conexões PostgreSQL.
 * Null quando DATABASE_URL não está configurada (dev sem banco).
 */
export const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }, // Railway exige SSL
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    })
  : null;

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
    CREATE TABLE IF NOT EXISTS leads (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id   TEXT NOT NULL UNIQUE,
      nome         TEXT,
      email        TEXT,
      telefone     TEXT,
      empresa      TEXT,
      observacoes  TEXT,
      qualificado  BOOLEAN NOT NULL DEFAULT FALSE,
      followup_status TEXT NOT NULL DEFAULT 'pending',
      followup_due_at TIMESTAMPTZ,
      followup_attempts INTEGER NOT NULL DEFAULT 0,
      last_followup_at TIMESTAMPTZ,
      followup_notes TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE leads ADD COLUMN IF NOT EXISTS qualificado BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS visitor_intent TEXT;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS handoff_sent BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS followup_status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS followup_due_at TIMESTAMPTZ;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS followup_attempts INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_followup_at TIMESTAMPTZ;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS followup_notes TEXT;

    -- Atribuição e Tracking (UTM -> CRM)
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_source   TEXT;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_medium   TEXT;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_term     TEXT;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_content  TEXT;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS gclid        TEXT;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS fbclid       TEXT;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS landing_path TEXT;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS referrer     TEXT;

    UPDATE leads
    SET followup_status = 'ready'
    WHERE qualificado = TRUE
      AND followup_status = 'pending';

    CREATE INDEX IF NOT EXISTS leads_followup_status_due_at_idx
      ON leads (followup_status, followup_due_at);

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
