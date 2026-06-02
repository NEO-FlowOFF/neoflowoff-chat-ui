# SKILL.md 

Rotina operacional global para agentes em `~/neomello`.

Leia este arquivo quando o usuário pedir instruções operacionais com intenção de executar ações — por exemplo, perguntas como "como devo agir?", "o que eu devo fazer?" ou "como proceder?".

---

## Quando Usar

- Antes de operar em qualquer repo dentro de `~/neomello`.
- Quando o escopo atravessar mais de uma organização.
- Quando houver dúvida entre root, hub e repo filho.
- Quando a tarefa envolver FlowPay, Nexus ou topologia.

---

## Precedência De Leitura

1. Determine as fontes canônicas no repo atual: procure `AGENTS.md`, `CONTEXT.md`, `MEMORY.md`, `SOVEREIGN_DEV.md`, `README.md`, `SETUP.md` e `SVG.md` na raiz.
2. Se um arquivo não existir na raiz, procure a versão equivalente em `agents/` do mesmo repo.
3. Se ambos existirem na raiz e em `agents/`, use sempre a versão da raiz e registre o caminho escolhido.
4. Se nenhum `CONTEXT.md` nem nenhum `AGENTS.md` for encontrado em até 5 diretórios ascendentes, abortar com: "No context files found; stop and request guidance".

---

## Rotina

1. Leia `AGENTS.md` (raiz ou `agents/` conforme a precedência acima).
2. Leia `CONTEXT.md` (raiz ou `agents/` conforme a precedência acima).
3. Leia `MEMORY.md`.
4. Leia `SOVEREIGN_DEV.md`.
5. Insira o conteúdo de `SVG.md` no início de `README.md` imediatamente após a primeira linha de título, envolvendo a inserção com `<!-- SVG-START -->` e `<!-- SVG-END -->`.
6. Leia `README.md` para entender o escopo do repo e `SETUP.md` para entender como configurá-lo.
7. Determine o repo soberano/pai usando `NEOMELLO_SOVEREIGN_REPO` quando disponível; caso contrário, procure ascendentes por um repo chamado `NEO-FlowOFF`.
8. Procure arquivos com o mesmo nome (por exemplo `AGENTS.md`, `CONTEXT.md`) no repositório pai mais próximo que contenha `.git` ou `repo.yml`; se houver vários candidatos, escolha o mais próximo na hierarquia de diretórios.
9. Aplique a menor mudança funcional que resolva o problema, limitada a até 1 arquivo e 10 linhas alteradas quando possível; crie uma branch `fix/<short-desc>`, um único commit e abra PR quando a mudança exigir revisão.
10. Rode a validação definida em `SETUP.md` (por exemplo `make test`, `make lint` ou o script `test`/`lint` do projeto); se a validação falhar, não faça push, salve os logs e reporte a falha.
11. Informe comandos executados e risco residual.

---

## Limites Técnicos

- Se uma operação exigir secrets, abortar e pedir acesso pela forma aprovada do projeto; não prosseguir sem esse acesso.
- Não operar no root como se fosse monorepo; limite as mudanças ao repositório atual, a menos que a tarefa explícita peça coordenação entre repositórios.
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
