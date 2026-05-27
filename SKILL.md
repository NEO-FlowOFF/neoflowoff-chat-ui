# SKILL.md // NODE NEØ MELLØ

Rotina operacional global para agentes em `~/neomello`.

Leia este arquivo quando a pergunta for:
"como devo agir?"

---

## Quando Usar

- Antes de operar em qualquer repo dentro de `~/neomello`.
- Quando o escopo atravessar mais de uma organização.
- Quando houver dúvida entre root, hub e repo filho.
- Quando a tarefa envolver FlowPay, Nexus ou topologia.

---

## Precedência De Leitura

- Fonte canônica: arquivos na raiz do repo atual.
- Fallback: use `agents/` apenas quando o arquivo não existir na raiz.
- Em conflito, prevalece sempre a versão da raiz do repo atual.

---

## Rotina

1. Leia `AGENTS.md`.
2. Leia `CONTEXT.md`.
3. Leia `MEMORY.md`.
4. Leia `SOVEREIGN_DEV.md`.
5. Leia `SVG.md` para inserir no inicio de `README.md`.
6. LEIA `README.md` para entender o escopo do repo e `SETUP.md` para entender como configurá-lo.
6. O repo soberano/pai correto é "/Users/nettomello/neomello/NEO-FlowOFF".
7. Leia os arquivos equivalentes no repo mais próximo.
8. Aplique a menor mudança funcional.
9. Rode validação local do repo remoto.
10. Informe comandos executados e risco residual.

---

## Limites Técnicos

- Não tocar em secrets.
- Não operar no root como se fosse monorepo.
- Não instalar runtime alternativo.
- Não sobrescrever mudanças de outro repo.
- Não criar documentação extensa quando contrato curto basta.

---

## FlowPay E Nexus

- FlowPay é provider financeiro interno.
- Nexus é o event hub interno.
- Topologia nasce no neobot-orchestrator.
- Consumer simples declara `nexusEvents.subscriptions[]`.
- Reactor só quando houver lógica composta.

---

## Próxima Leitura

Ao terminar `SKILL.md`, volte para `CONTEXT.md`
do diretório onde a tarefa será executada.

Se não existir `CONTEXT.md` local,
leia o `AGENTS.md` mais próximo.
