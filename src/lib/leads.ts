import { pool } from "./db";

export interface Lead {
  sessionId: string;
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  empresa?: string | null;
  observacoes?: string | null;
}

/**
 * Insere ou atualiza um lead no PostgreSQL.
 * Apenas campos com valor não-nulo são sobrescritos.
 */
export async function upsertLead(lead: Lead): Promise<void> {
  if (!pool) return;

  // Só salva se houver pelo menos um campo além do sessionId
  const hasData =
    lead.nome || lead.email || lead.telefone || lead.empresa || lead.observacoes;
  if (!hasData) return;

  await pool.query(
    `
    INSERT INTO leads (session_id, nome, email, telefone, empresa, observacoes)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (session_id) DO UPDATE SET
      nome        = COALESCE(EXCLUDED.nome,        leads.nome),
      email       = COALESCE(EXCLUDED.email,       leads.email),
      telefone    = COALESCE(EXCLUDED.telefone,    leads.telefone),
      empresa     = COALESCE(EXCLUDED.empresa,     leads.empresa),
      observacoes = CASE
                      WHEN EXCLUDED.observacoes IS NOT NULL
                      THEN EXCLUDED.observacoes
                      ELSE leads.observacoes
                    END,
      updated_at  = NOW()
    `,
    [
      lead.sessionId,
      lead.nome ?? null,
      lead.email ?? null,
      lead.telefone ?? null,
      lead.empresa ?? null,
      lead.observacoes ?? null,
    ],
  );

  console.log(`[LEADS] Lead salvo — sessão ${lead.sessionId}`);
}
