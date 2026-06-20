import { pool } from "./db";

export type SuspiciousCategory =
  | "prompt_injection"
  | "system_access"
  | "infrastructure_probe"
  | "social_engineering"
  | "code_execution"
  | "security_test";

const PATTERNS: Array<{ category: SuspiciousCategory; tests: RegExp[] }> = [
  {
    category: "prompt_injection",
    tests: [
      /ignore\s+(all\s+)?(previous|prior|above|your)?\s*instructions/i,
      /forget\s+(everything|all|your instructions|what you (were told|know))/i,
      /new (instructions|rules|system prompt|prompt|persona)/i,
      /você é agora|now you are|act as if|pretend (to be|you are|you're)/i,
      /jailbreak|DAN\b|do anything now/i,
      /override\s+(your\s+)?(instructions|rules|guidelines)/i,
    ],
  },
  {
    category: "system_access",
    tests: [
      /prompt\s+do\s+sistema|system\s+prompt|instrução\s+(original|interna)/i,
      /suas\s+instruções|your\s+(instructions|rules|guidelines|context)/i,
      /\.env\b|variáveis?\s+de\s+ambiente|environment\s+variables?/i,
      /código[\s-]fonte|source[\s-]code|codebase/i,
      /postgresql|postgres\b|banco\s+de\s+dados|database\s+schema/i,
      /\btabela\s+\w+|\bschema\b|\bSQL\b/i,
      /redis\b|session\s+stor|histórico\s+no\s+banco/i,
    ],
  },
  {
    category: "infrastructure_probe",
    tests: [
      /\bapi[\s_-]?key\b|\bapi[\s_-]?token\b|\bapi[\s_-]?secret\b/i,
      /\bresend\b|\brailway\b|\bvercel\b/i,
      /servidor\s+de\s+produção|production\s+server|deploy\s+config/i,
      /\bregis\b.*\bextract|\bcrm\b.*\binterno/i,
      /\bendpoint\b.*\binterno|\binternal\b.*\bendpoint/i,
      /ASI1|LLM\s+API|chave\s+da\s+(api|llm)/i,
    ],
  },
  {
    category: "social_engineering",
    tests: [
      /sou\s+(do\s+time|desenvolvedor|dev\b|admin\b|qa\b|parceiro\s+técnico|engenheiro)/i,
      /modo\s+(desenvolvedor|admin|debug|teste|deus)/i,
      /developer\s+mode|admin\s+mode|debug\s+mode|god\s+mode/i,
      /meu\s+chefe\s+pediu|my\s+boss\s+(asked|told)|authorized\s+by/i,
      /time\s+interno|internal\s+team|equipe\s+de\s+(dev|suporte|ti|tech)/i,
      /sou\s+o\s+(neo|neo\s+mello|founder|dono|criador)/i,
    ],
  },
  {
    category: "code_execution",
    tests: [
      /\bexecute\b.*\bcode|\brun\b.*\bcommand|\bshell\b|\bbash\b/i,
      /\beval\s*\(|\bexec\s*\(|\bfetch\s*\(.*http/i,
      /curl\s+http|wget\s+http/i,
      /process\.env|__dirname|require\s*\(/i,
    ],
  },
  {
    category: "security_test",
    tests: [
      /<script\b|javascript:|data:text\/html|on\w+\s*=/i,
      /\bSQL\s+injection|\bXSS\b|\bCSRF\b|\bpath\s+traversal/i,
      /\.\.[/\\]|\.\.[/\\]\.\.[/\\]/,
    ],
  },
];

export function detectSuspicious(message: string): SuspiciousCategory | null {
  for (const { category, tests } of PATTERNS) {
    for (const pattern of tests) {
      if (pattern.test(message)) return category;
    }
  }
  return null;
}

export async function logSuspiciousEvent(
  sessionId: string | undefined,
  category: SuspiciousCategory,
  message: string
): Promise<void> {
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO suspicious_events (session_id, categoria, mensagem) VALUES ($1, $2, $3)`,
      [sessionId ?? null, category, message.slice(0, 1000)]
    );
    console.warn(
      `[SENTINEL] Evento suspeito registrado — session: ${sessionId ?? "anon"} | categoria: ${category}`
    );
  } catch (err) {
    console.error("[SENTINEL] Falha ao registrar evento suspeito:", err);
  }
}
