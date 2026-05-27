<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->
# LEADS TABLE REGISTROS
> Relatório operacional sanitizado da tabela `leads`.
> Não contém nome, email, telefone ou conversa bruta.

```text
========================================
       NEØ:One · LEADS REGISTRY
========================================
Source: PostgreSQL table `leads`
Status: estrutura e snapshot validados
Snapshot: 2026-05-27
Privacy: PII redacted
========================================
```

## ⟠ Objetivo

Documentar o que a aplicação registra na tabela `leads`.

Explicar como um lead é qualificado.

Manter uma leitura operacional dos registros atuais,
sem expor dados pessoais em arquivo versionado.

────────────────────────────────────────

## ⧉ Fonte

```text
▓▓▓ TECHNICAL SOURCE
────────────────────────────────────────
└─ Schema/migration     src/lib/db.ts
└─ Escrita/upsert       src/lib/leads.ts
└─ Extração Regis       src/lib/regis.ts
└─ Disparo runtime      src/pages/api/chat.ts
```

────────────────────────────────────────

## ⨷ Contrato

```text
▓▓▓ LEAD QUALIFICATION
────────────────────────────────────────
└─ contato      email ou telefone
└─ identidade   nome ou empresa
└─ necessidade  observacoes
└─ resultado    qualificado = true
```

Quando o lead qualifica pela primeira vez
e `handoff_sent = false`,
a aplicação tenta enviar:

- notificação de handoff para operação;
- resumo da conversa;
- confirmação para visitante quando email aparece pela primeira vez.

────────────────────────────────────────

## ◬ Schema

```text
┏━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━┳━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ COLUNA         ┃ TIPO        ┃ ORIGEM      ┃ NOTA                         ┃
┣━━━━━━━━━━━━━━━━╋━━━━━━━━━━━━━╋━━━━━━━━━━━━━╋━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ id             ┃ UUID        ┃ PostgreSQL  ┃ gen_random_uuid()            ┃
┃ session_id     ┃ TEXT        ┃ Chat UI     ┃ sessão única                 ┃
┃ nome           ┃ TEXT        ┃ Regis       ┃ extraído quando informado    ┃
┃ email          ┃ TEXT        ┃ Regis       ┃ extraído quando informado    ┃
┃ telefone       ┃ TEXT        ┃ Regis       ┃ telefone ou WhatsApp         ┃
┃ empresa        ┃ TEXT        ┃ Regis       ┃ extraído quando informado    ┃
┃ observacoes    ┃ TEXT        ┃ Regis       ┃ resumo da necessidade        ┃
┃ visitor_intent ┃ TEXT        ┃ Regis       ┃ intenção classificada        ┃
┃ qualificado    ┃ BOOLEAN     ┃ Aplicação   ┃ calculado no upsert          ┃
┃ handoff_sent   ┃ BOOLEAN     ┃ Aplicação   ┃ handoff já disparado         ┃
┃ followup_status┃ TEXT        ┃ Aplicação   ┃ pending ou ready inicial     ┃
┃ followup_due_at┃ TIMESTAMPTZ ┃ Operação    ┃ próxima janela de contato    ┃
┃ followup_attempts┃ INTEGER   ┃ Operação    ┃ tentativas registradas       ┃
┃ last_followup_at┃ TIMESTAMPTZ┃ Operação    ┃ último contato feito         ┃
┃ followup_notes ┃ TEXT        ┃ Operação    ┃ notas internas sanitizadas   ┃
┃ created_at     ┃ TIMESTAMPTZ ┃ PostgreSQL  ┃ criação do registro          ┃
┃ updated_at     ┃ TIMESTAMPTZ ┃ Trigger     ┃ update automático            ┃
┗━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━┻━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

────────────────────────────────────────

## ⍟ Snapshot

Consulta sanitizada executada em produção via PostgreSQL.

Nenhum nome,
email,
telefone
ou conversa bruta
foi registrado neste documento.

Este snapshot é o baseline operacional inicial.

Não tentar buscar novamente os dados reais da tabela
sem solicitação explícita de novo snapshot.

```text
▓▓▓ CURRENT STATE
────────────────────────────────────────
└─ total_leads          10
└─ leads_qualificados    1
└─ handoffs_enviados     0
└─ com_email             1
└─ com_telefone          0
└─ primeiro_registro     2026-04-28 05:33 UTC
└─ ultima_atualizacao    2026-05-23 15:29 UTC
```

────────────────────────────────────────

## ⧇ Leitura

```text
▓▓▓ OPERATIONAL READ
────────────────────────────────────────
└─ A tabela possui 10 registros.
└─ Os registros vão de 2026-04-28 a 2026-05-23.
└─ Existe 1 lead qualificado.
└─ O lead qualificado tem nome, email, empresa e observações.
└─ O lead qualificado não tem telefone.
└─ Todos os registros têm handoff_sent = false.
└─ Todos os registros têm visitor_intent = sem_intencao.
└─ 9 registros têm observações, mas não qualificam.
└─ Campos de follow-up foram adicionados após este snapshot.
```

────────────────────────────────────────

## ⧖ Atenção

```text
▓▓▓ FINDINGS
────────────────────────────────────────
└─ visitor_intent não está classificando intenção útil.
   Todos os 10 registros caíram em sem_intencao.

└─ O lead qualificado d1e69461... está com handoff_sent = false.
   Possíveis causas: email não configurado, falha de envio
   ou qualificação antes do fluxo de handoff estar completo.

└─ Captura de telefone está zerada.
   Pode ser comportamento real dos visitantes
   ou oportunidade de melhorar a pergunta de contato.

└─ A maior parte dos registros tem contexto em observacoes,
   mas não tem contato e identidade suficientes.
```

────────────────────────────────────────

## ◱ Registros

```text
┏━━━━━━━━━━━━━┳━━━━━━━━━━━━┳━━━━━━━━━━━━┳━━━━━━┳━━━━━━━┳━━━━━┳━━━━━━━━━┳━━━━━━┳━━━━━━━━━┳━━━━━━━━━━━━━━┳━━━━━━┓
┃ SESSAO      ┃ CRIADO UTC ┃ UPDATE UTC ┃ NOME ┃ EMAIL ┃ TEL ┃ EMPRESA ┃ QUAL ┃ HANDOFF ┃ INTENCAO     ┃ OBS  ┃
┣━━━━━━━━━━━━━╋━━━━━━━━━━━━╋━━━━━━━━━━━━╋━━━━━━╋━━━━━━━╋━━━━━╋━━━━━━━━━╋━━━━━━╋━━━━━━━━━╋━━━━━━━━━━━━━━╋━━━━━━┫
┃ d1e69461... ┃ 05-23 15:23┃ 05-23 15:29┃ sim  ┃ sim   ┃ não ┃ sim     ┃ sim  ┃ não     ┃ sem_intencao ┃ 141  ┃
┃ c8a4bafe... ┃ 05-23 14:31┃ 05-23 14:32┃ não  ┃ não   ┃ não ┃ não     ┃ não  ┃ não     ┃ sem_intencao ┃ 209  ┃
┃ 2f9b9020... ┃ 05-17 21:07┃ 05-17 21:07┃ não  ┃ não   ┃ não ┃ não     ┃ não  ┃ não     ┃ sem_intencao ┃ 134  ┃
┃ bf4d87c1... ┃ 05-06 20:02┃ 05-06 20:02┃ não  ┃ não   ┃ não ┃ não     ┃ não  ┃ não     ┃ sem_intencao ┃ 173  ┃
┃ e0197b76... ┃ 04-29 18:23┃ 04-29 18:23┃ não  ┃ não   ┃ não ┃ não     ┃ não  ┃ não     ┃ sem_intencao ┃  73  ┃
┃ 549a16ba... ┃ 04-28 14:20┃ 04-28 17:08┃ não  ┃ não   ┃ não ┃ não     ┃ não  ┃ não     ┃ sem_intencao ┃ 118  ┃
┃ e7e3be24... ┃ 04-28 14:23┃ 04-28 14:23┃ não  ┃ não   ┃ não ┃ não     ┃ não  ┃ não     ┃ sem_intencao ┃ 280  ┃
┃ 1eae109f... ┃ 04-28 10:33┃ 04-28 10:34┃ não  ┃ não   ┃ não ┃ não     ┃ não  ┃ não     ┃ sem_intencao ┃ 179  ┃
┃ 85ef2c45... ┃ 04-28 05:35┃ 04-28 05:38┃ não  ┃ não   ┃ não ┃ não     ┃ não  ┃ não     ┃ sem_intencao ┃ 158  ┃
┃ 484c0e82... ┃ 04-28 05:33┃ 04-28 05:33┃ não  ┃ não   ┃ não ┃ não     ┃ não  ┃ não     ┃ sem_intencao ┃ 169  ┃
┗━━━━━━━━━━━━━┻━━━━━━━━━━━━┻━━━━━━━━━━━━┻━━━━━━┻━━━━━━━┻━━━━━┻━━━━━━━━━┻━━━━━━┻━━━━━━━━━┻━━━━━━━━━━━━━━┻━━━━━━┛
```

────────────────────────────────────────

## ⨀ Intenção

```text
┏━━━━━━━━━━━━━━┳━━━━━━━┳━━━━━━━━━━━━━┓
┃ INTENCAO     ┃ TOTAL ┃ QUALIFICADOS┃
┣━━━━━━━━━━━━━━╋━━━━━━━╋━━━━━━━━━━━━━┫
┃ sem_intencao ┃ 10    ┃ 1           ┃
┗━━━━━━━━━━━━━━┻━━━━━━━┻━━━━━━━━━━━━━┛
```

────────────────────────────────────────

## ⧗ Próximas Ações

1. Verificar por que `d1e69461...` está com `handoff_sent = false`.
2. Validar se `followup_status` virou `ready` para leads qualificados.
3. Revisar `src/lib/regis.ts` para melhorar `visitor_intent`.
4. Ajustar o agente para pedir WhatsApp quando houver intenção comercial.
5. Manter auditoria sanitizada e sem PII em docs versionados.

────────────────────────────────────────

## ⦿ Queries

Resumo geral:

```sql
SELECT
  COUNT(*) AS total_leads,
  COUNT(*) FILTER (WHERE qualificado) AS leads_qualificados,
  COUNT(*) FILTER (WHERE handoff_sent) AS handoffs_enviados,
  COUNT(*) FILTER (WHERE email IS NOT NULL) AS com_email,
  COUNT(*) FILTER (WHERE telefone IS NOT NULL) AS com_telefone,
  MIN(created_at) AS primeiro_registro,
  MAX(updated_at) AS ultima_atualizacao
FROM leads;
```

Registros sanitizados recentes:

```sql
SELECT
  created_at,
  updated_at,
  LEFT(session_id, 8) || '...' AS session_ref,
  CASE WHEN nome IS NOT NULL THEN 'sim' ELSE 'não' END AS tem_nome,
  CASE WHEN email IS NOT NULL THEN 'sim' ELSE 'não' END AS tem_email,
  CASE WHEN telefone IS NOT NULL THEN 'sim' ELSE 'não' END AS tem_telefone,
  CASE WHEN empresa IS NOT NULL THEN 'sim' ELSE 'não' END AS tem_empresa,
  visitor_intent,
  qualificado,
  handoff_sent,
  followup_status,
  followup_due_at,
  followup_attempts,
  last_followup_at,
  LEFT(COALESCE(observacoes, ''), 160) AS observacoes_resumo
FROM leads
ORDER BY updated_at DESC
LIMIT 25;
```

Distribuição por intenção:

```sql
SELECT
  COALESCE(visitor_intent, 'sem_intencao') AS visitor_intent,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE qualificado) AS qualificados
FROM leads
GROUP BY COALESCE(visitor_intent, 'sem_intencao')
ORDER BY total DESC;
```

────────────────────────────────────────

## ◮ Próximo Ciclo

```text
▓▓▓ NEXT AUDIT
────────────────────────────────────────
└─ Não reconsultar dados reais automaticamente.
└─ Reexecutar query sanitizada apenas sob demanda.
└─ Comparar evolução de total_leads e leads_qualificados.
└─ Conferir distribuição de followup_status.
└─ Investigar handoffs pendentes antes de ativar campanhas.
└─ Validar se visitor_intent passou a classificar intenção real.
```

```text
▓▓▓ NEØ FLOWOFF
────────────────────────────────────────
Lead capture with human control.
Context is sovereign.
────────────────────────────────────────
```
