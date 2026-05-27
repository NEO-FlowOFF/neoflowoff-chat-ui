# CHECKLIST.md // OPERACAO RAPIDA (1 MIN)

1. Confirmar contexto: `pwd` + repo atual (`git rev-parse --show-toplevel`).
2. Confirmar branch/remoto: `git branch --show-current` + `git remote -v`.
3. Ler `SKILL.md` da raiz do repo atual (fonte canonica).
4. Descobrir docs locais: `rg --files | rg '(AGENTS|CONTEXT|MEMORY|SETUP)\\.md$'`.
5. Prioridade de leitura: raiz do repo -> `agents/` (fallback).
6. Definir alvo unico e aplicar menor patch funcional possivel.
7. Nao tocar em `.env`, secrets ou credenciais.
8. Validar com os comandos disponiveis no projeto (lint/typecheck/teste).
9. Reportar: causa provavel, arquivos afetados, comandos rodados, risco residual.
10. Encerrar com proximo comando objetivo (uma acao por vez).
