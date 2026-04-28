/**
 * Sistema de Tipagem Centralizado - NEØ:One
 */

export type Role = "system" | "user" | "assistant";

export interface Message {
  role: Role;
  content: string;
}

export interface ChatSession {
  sessionId: string;
  history: Message[];
}

export interface UserLead {
  sessionId: string;
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  empresa?: string | null;
  observacoes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}
