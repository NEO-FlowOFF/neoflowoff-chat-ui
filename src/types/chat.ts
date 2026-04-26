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
  name?: string;
  occupation?: string;
  goal?: string;
  interest?: string;
  timestamp: number;
}
