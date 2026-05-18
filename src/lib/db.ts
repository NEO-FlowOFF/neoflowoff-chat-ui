import pg from "pg";

const { Pool } = pg;

const databaseUrl = import.meta.env.DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn(
    "[DB] DATABASE_URL não encontrada. Captura de leads desativada.",
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

/**
 * Garante que a tabela `leads` existe.
 * Chamada uma vez na inicialização do servidor.
 */
export async function ensureLeadsTable(): Promise<void> {
  if (!pool) return;

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
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE leads ADD COLUMN IF NOT EXISTS qualificado BOOLEAN NOT NULL DEFAULT FALSE;

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

  console.log("[DB] Tabela leads verificada/criada.");
}
