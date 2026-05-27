<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->
# CHAT UI EVOLUTION ROADMAP

```text
========================================
       NEØ:One · EVOLUTION ROADMAP
========================================
Focus: SOVEREIGNTY & CONTEXT
Version: v1.2.0
========================================
```

## ⟠ Objetivo

Planejamento de evolução técnica e resolução de débitos
da interface soberana NEØ:One.

────────────────────────────────────────

## ⧉ PWA Core

▓▓▓ PRÓXIMOS PODERES
────────────────────────────────────────
- [x] Limite de Sessão Beta (10 msgs).
- [x] Background Sync (IndexedDB → retry offline).
- [ ] Web Push Notifications (iOS 16.4+).
- [x] Custom Install Trigger (Banner manual para iOS).
- [ ] Badging API para notificações pendentes.

────────────────────────────────────────

## ◬ Infraestrutura & IA

▓▓▓ ESTRATÉGIA TÉCNICA
────────────────────────────────────────
- [x] RAG Logic: Injeção de manifestos organizacionais.
- [x] Regis Extraction: Estruturação de dados para CRM.
- [x] Type Safety: Eliminação total de 'any' (Strategic Typing). ✓ zero `any` em produção.
- [ ] Testing: Suíte robusta para rotas de API e Redis.
- [ ] SDK para identificação do user (Wallet Abstraction, Redis e PostgreSQL).
- [ ] Sentiment Analysis: Análise de tom emocional para mudanças dinâmicas na UI.

────────────────────────────────────────

## ⧉ Aquisição, Mensuração & FlowPay

▓▓▓ BACKLOG FUTURO
────────────────────────────────────────
- [x] Baseline sanitizado da tabela `leads` registrado em `LEADS_TABLE_REGISTROS.md` com snapshot de 2026-05-27.
- [x] Campos base de follow-up adicionados em `leads` para não perder oportunidade antes da automação.
- [ ] OpenAI Ads Measurement Pixel: instalar no `Base.astro` somente com `PUBLIC_OPENAI_ADS_PIXEL_ID` configurado e sem expor dados pessoais.
- [ ] Eventos de campanha: medir `page_viewed`, `chat_started`, `lead_created`, `appointment_scheduled`, `qualified_lead` e `quote_requested`.
- [ ] Privacidade: não enviar nome, email, telefone, mensagens do chat, prompts ou dados sensíveis para eventos de ads.
- [ ] Próximo snapshot de `leads`: executar somente sob demanda, usando query sanitizada e sem registrar PII.
- [ ] Deduplicação futura: gerar `event_id` interno quando houver envio browser + servidor, reaproveitando o mesmo ID no Pixel e na Conversions API.
- [ ] Dashboard de aquisição: consolidar visitas, conversas iniciadas, leads criados, leads qualificados, reuniões e origem de campanha.
- [ ] Dashboard operacional: acompanhar latência ASI1, erros de streaming, taxa de handoff, Regis/PostgreSQL e disponibilidade de Redis.
- [ ] FlowPay: mapear oferta de serviços, orçamento/proposta e cobrança recorrente como capability interna da stack NEØ.
- [ ] FlowPay + Nexus: quando houver eventos financeiros, preferir subscriptions declarativas em `nexusEvents.subscriptions[]` antes de criar webhook isolado.
- [ ] Funil futuro: conectar campanha → chat → Regis → proposta → FlowPay → dashboard, mantendo controle humano e auditabilidade.

────────────────────────────────────────

## ⨷ Restrições Conhecidas

> **iOS < 16.4:** Sem push e background sync.  
> **Standalone:** Requisito para notificações em Webkit.  
> **Memory:** Limitada a 40 mensagens por performance.

## ✦ UX & Design

▓▓▓ REFINAMENTOS APLICADOS
────────────────────────────────────────
- [x] Composer redesenhado: flex row, border-radius, botão neon pink ativo.
- [x] Confirm modal in-app substituindo window.confirm() (PWA-safe).
- [x] InstallBanner: iOS (share manual) e Android (beforeinstallprompt).
- [x] Online indicator movido para NEØ:one no EmptyState (dot pulsante).
- [x] agent-name: fonte Codystar → Geist Mono (minúsculo).
- [x] Header: avatar e box container removidos, layout limpo.
- [x] SW v2: skipWaiting + clients.claim + limpeza de cache antigo automática.

## ⍟ SEO Nacional — Brasil

▓▓▓ PESQUISA DE PALAVRAS-CHAVE PENDENTE
────────────────────────────────────────
- [x] Keywords meta tag em Base.astro — escopo nacional.
- [x] JSON-LD atualizado para Organization com areaServed: BR.
- [x] Geo tags removidas (agência nacional, sem restrição geográfica).
- [x] Keywords definidas (B2B, foco em IA e automação empresarial):
      "transformação digital com IA", "automação empresarial",
      "agentes inteligentes para empresas", "multiagent systems",
      "AI workflow automation", "CRM automation", "sales automation",
      "lead qualification automation", "enterprise AI implementation",
      "custom AI solutions", "digital ecosystem architecture"

```text
▓▓▓ Neo Mello
────────────────────────────────────────
Fundador · NEO FlowOFF
neo@neoflowoff.agency 

"Automação de marketing e infraestrutura
digital autônoma."
────────────────────────────────────────
```
