# CLAUDE.md // AGENT WORKSPACE INSTRUCTIONS

> Refer to the canonical root files [`../CLAUDE.md`](../CLAUDE.md) and [`../SKILL.md`](../SKILL.md) for full project commands and master guidelines.

## 📁 Arquitetura do Diretório `agents/`

Este diretório concentra a documentação operacional, contexto e regras soberanas para agentes AI (Claude Code, Gemini CLI, Cursor, Windsurf) atuando no repositório:

- **`AGENTS.md`**: Definição canônica do Agente NEØ:One, stack técnica atualizada, persona e regras de infraestrutura.
- **`CONTEXT.md`**: Diretrizes de injeção de contexto RAG, regras de ouro do chat e contratos de interface.
- **`MEMORY.md`**: Especificação da memória operacional, persistência híbrida (Redis Sliding Window + LocalStorage) e topologia.
- **`SOVEREIGN_DEV.md`**: Regras de desenvolvimento soberano e infraestrutura ferroviária (Railway/PWA).
- **`SECRETS.md`**: Diretrizes de segurança, carregamento de variáveis de ambiente e proteção de chaves.
- **`check-secrets.sh`**: Script utilitário para auditoria rápida de vazamento de credenciais.

## ⚡ Rotina Obrigatória Antes de Qualquer Alteração

1. Consultar a suíte de validação: `pnpm run test` e `pnpm run check`.
2. Verificar se a alteração impacta a fluidez CSS PWA (nunca transicionar propriedades abreviadas como `background` ou gradientes).
3. Respeitar o motor assíncrono de captação de leads (`Regis` + `PostgreSQL` + `Resend API`).
