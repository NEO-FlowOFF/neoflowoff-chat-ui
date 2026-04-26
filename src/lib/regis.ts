import { redis } from "./redis";

export interface UserLead {
  sessionId: string;
  name?: string;
  occupation?: string;
  goal?: string;
  interest?: string;
  timestamp: number;
}

/**
 * Sistema Regis - Extrator de Inteligência de CRM
 * Analisa as mensagens para identificar dados estruturados e salvar na base de CRM (Redis)
 */
export async function updateRegisLead(sessionId: string, messages: any[]) {
  if (!redis) return;

  const lead: Partial<UserLead> = {
    sessionId,
    timestamp: Date.now(),
  };

  // Lógica de extração simples baseada no histórico (Poderia ser melhorada com uma chamada de IA específica)
  // Por enquanto, vamos manter uma estrutura para receber os dados
  
  // Busca se já existe um lead parcial
  const existingRaw = await redis.get(`regis:lead:${sessionId}`);
  const existingLead = existingRaw ? JSON.parse(existingRaw) : {};

  // Aqui integraríamos uma chamada de IA para "resumir" os dados do usuário detectados no histórico
  // Como fallback, salvamos o histórico de intenção
  
  const updatedLead = { ...existingLead, ...lead };

  await redis.set(
    `regis:lead:${sessionId}`,
    JSON.stringify(updatedLead),
    "EX",
    60 * 60 * 24 * 30 // Leads duram 30 dias
  );

  console.log(`[REGIS] Lead atualizado para sessão ${sessionId}`);
}
