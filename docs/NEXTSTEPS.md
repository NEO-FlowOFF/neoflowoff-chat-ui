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
- [x] Histórico limitado a 40 mensagens; handoff controlado por qualificação
  server-side, sem gatilho client-side por contagem de mensagens.
- [x] Background Sync (IndexedDB → retry offline).
<!-- - [ ] Web Push Notifications (iOS 16.4+) - Inútil para chat síncrono -->
- [x] Custom Install Trigger (Banner manual para iOS).
<!-- - [ ] Badging API para notificações pendentes - Inútil sem push -->

────────────────────────────────────────

## ◬ Infraestrutura & IA

▓▓▓ ESTRATÉGIA TÉCNICA
────────────────────────────────────────
- [x] RAG Logic: Injeção de manifestos organizacionais.
- [x] Regis Extraction: Estruturação de dados para CRM.
- [x] Type Safety: Eliminação total de 'any' (Strategic Typing). ✓ zero `any` em produção.
- [x] Testing: Suíte robusta para rotas de API e Redis. (Vitest/Mocks)
<!-- - [ ] SDK para identificação do user (Wallet/Redis/Postgres) -->
- [x] Direção visual dark-only consolidada; mudanças de tema por sentimento
  foram removidas e permanecem fora do contrato ativo.

────────────────────────────────────────

## ⧉ Aquisição, Mensuração & FlowPay

▓▓▓ BACKLOG FUTURO
────────────────────────────────────────
- [/] **Plano-mestre de medição em [`TRACKING_PLAN.md`](./TRACKING_PLAN.md)** —
  GA4, UTM -> CRM, Meta Pixel e Meta CAPI estão implementados. Permanecem
  pendentes a cobertura completa da taxonomia, validação operacional e dashboard.
- [x] Baseline sanitizado da tabela `leads` registrado em `LEADS_TABLE_REGISTROS.md` com snapshot de 2026-05-27.
- [x] Campos base de follow-up adicionados em `leads` para não perder oportunidade antes da automação.
- [ ] OpenAI Ads Measurement Pixel: instalar no `Base.astro` somente com `PUBLIC_OPENAI_ADS_PIXEL_ID` configurado e sem expor dados pessoais.
- [ ] Eventos de campanha: medir `page_viewed`, `chat_started`, `lead_created`, `appointment_scheduled`, `qualified_lead` e `quote_requested`.
- [ ] Privacidade: não enviar nome, email, telefone, mensagens do chat, prompts ou dados sensíveis para eventos de ads.
- [ ] Próximo snapshot de `leads`: executar somente sob demanda, usando query sanitizada e sem registrar PII.
- [x] Deduplicação Meta: `event_id` é compartilhado entre browser e servidor.
- [x] Consentimento/LGPD: GA4, Meta Pixel e CAPI exigem opt-in; status, fonte
  e instante são persistidos e a revogação fica disponível em `/privacidade`.
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

## ⬡ Segurança

▓▓▓ CONCLUÍDO
────────────────────────────────────────
- [x] Security headers em `src/middleware.ts`: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- [x] CSP_DIRECTIVES centralizado em constante — fácil manutenção.
- [x] `frame-ancestors 'self'` alinhado com `X-Frame-Options: SAMEORIGIN`.
- [x] CSP permite Google Fonts, Cloudflare Analytics e Cloudinary.
- [x] `formatMarkdown`: XSS `javascript:` corrigido — href validado com `^https?://`.
- [x] Cloudflare HSTS ativado (max-age=31536000).
- [x] Block AI Bots ativado no Cloudflare (bloqueia em nível de firewall).
- [x] AI Labyrinth ativado.

▓▓▓ BACKLOG
────────────────────────────────────────
- [ ] Migrar `script-src` e `style-src` de `'unsafe-inline'` para nonces — aguardar suporte nativo no Astro.

────────────────────────────────────────

## ⍟ SEO Nacional — Brasil

▓▓▓ CONCLUÍDO
────────────────────────────────────────
- [x] Keywords meta tag em Base.astro — escopo nacional.
- [x] JSON-LD atualizado para Organization com areaServed: BR.
- [x] Geo tags removidas (agência nacional, sem restrição geográfica).
- [x] Keywords definidas (B2B, foco em IA e automação empresarial).
- [x] `@astrojs/sitemap` instalado — `/sitemap-index.xml` gerado no build.
- [x] `<link rel="canonical">` apontando para `/chat`.
- [x] OG URL e Twitter URL corrigidos para `/chat`.
- [x] `<title>` descritivo com palavras-chave.
- [x] Conteúdo estático indexável em `EmptyState.astro` (CSS clip).
- [x] `public/robots.txt` sob controle do projeto — Googlebot permitido, bots de IA bloqueados.
- [x] Declaração de `/splash_chat.mp4` para o Google via `VideoObject`
  (JSON-LD) em `index.astro`.
- [x] Substituição de Cloudinary por assets locais (`/icon-512x512.webp`)
  no layout e no SW.

▓▓▓ BACKLOG
────────────────────────────────────────
- [ ] Desativar Cloudflare Managed robots.txt no dashboard para que `public/robots.txt` seja a única fonte.
- [ ] Submeter `https://chat.neoflowoff.agency/sitemap-index.xml` no
  Google Search Console.
- [ ] Criar backlinks: `neoflowoff.agency` linkando para `chat.neoflowoff.agency/chat`.

```text
▓▓▓ Neo Mello
────────────────────────────────────────
Fundador · NEO FlowOFF
neo@neoflowoff.agency 

"Automação de marketing e infraestrutura
digital autônoma."
────────────────────────────────────────
```
