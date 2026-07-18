<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->
# CAMPAIGN ATTRIBUTION

```text
========================================
    NEØ:ONE · CAMPAIGN ATTRIBUTION
========================================
Status: ACTIVE
Scope: PAGES · CAMPAIGNS · AGENT CONTEXT
========================================
```

## ⟠ Objetivo

Padronizar query strings enviadas para
`https://chat.neoflowoff.agency/chat`.

O contrato permite ao agente reconhecer origem, campanha,
peça, intenção e contexto comercial sem inferir dados ausentes.

────────────────────────────────────────

## ⨷ Contrato

```text
utm_source   origem estável do tráfego
utm_medium   tipo de canal
utm_campaign iniciativa comercial
utm_content  posição, CTA ou criativo
utm_term     segmento, intenção ou conjunto
context      contexto semântico para o agente
```

Regras:

- usar `snake_case`, minúsculas e sem acentos
- manter `context` em vocabulário controlado
- não incluir nome, e-mail, telefone ou mensagem do visitante
- não usar segredo, token ou identificador interno
- não trocar significado de um valor depois de publicado

────────────────────────────────────────

## ⧉ Contextos

```text
neo_growth_system_agent_sdr
neo_growth_system_diagnostic
business_commerce_catalog
meta_commerce_catalog
institutional_ecosystem
```

────────────────────────────────────────

## ⧇ Links Prontos

### SDR · CTA principal

```text
https://chat.neoflowoff.agency/chat?utm_source=sdr_neoflowoff_agency&utm_medium=owned_web&utm_campaign=agent_sdr_ia_active&utm_content=hero_primary_cta&utm_term=diagnostico_operacional&context=neo_growth_system_agent_sdr
```

### SDR · Página de oferta

```text
https://chat.neoflowoff.agency/chat?utm_source=sdr_neoflowoff_agency&utm_medium=owned_web&utm_campaign=agent_sdr_ia_active&utm_content=offer_primary_cta&utm_term=implementacao_agent_sdr&context=neo_growth_system_agent_sdr
```

### LP · Card do catálogo

```text
https://chat.neoflowoff.agency/chat?utm_source=lp_neoflowoff_agency&utm_medium=owned_catalog&utm_campaign=business_commerce_catalog&utm_content=agent_sdr_product_card&utm_term=implementacao_agent_sdr&context=neo_growth_system_agent_sdr
```

### Meta Ads · Campanha Agent SDR

```text
https://chat.neoflowoff.agency/chat?utm_source=meta&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}&context=neo_growth_system_agent_sdr
```

### Meta catálogo · Produto Agent SDR

```text
https://chat.neoflowoff.agency/chat?utm_source=meta&utm_medium=paid_catalog&utm_campaign={{campaign.name}}&utm_content={{product.name}}&utm_term={{adset.name}}&context=meta_commerce_catalog
```

────────────────────────────────────────

## ⍟ Interpretação

O browser preserva a atribuição em `neo_attribution_v1`
e a envia em cada `POST /api/chat`.

O backend transforma os parâmetros em contexto temporário
para o ASI1 e persiste os campos UTM no lead.

No PostgreSQL, os campos de campanha seguem first-touch:
valores já existentes não são sobrescritos pelo upsert.

```text
▓▓▓ NEO FLOWOFF
────────────────────────────────────────
Campaign signal → agent context → lead
────────────────────────────────────────
```
