<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->
# NEØ:one — NEO FlowOFF CHAT UI

![NEO FlowOFF Banner](./public/banner.svg)

[![Install Context7 MCP](https://img.shields.io/badge/Context7_MCP-Install_in_VS_Code_Insiders-24bfa5?style=for-the-badge&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect?url=vscode-insiders%3Amcp%2Finstall%3F%7B%22name%22%3A%22context7%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40upstash%2Fcontext7-mcp%40latest%22%5D%7D)

```text
========================================
       NEØ:One · CHAT INTERFACE
========================================
Status:  ACTIVE
Version: v1.2.0
Type:    PWA (Progressive Web App)
========================================
```

## ⟠ Objetivo

Interface de atendimento do agente NEØ:One — assistente de
primeiro contato da NEO FlowOFF, agência especializada em
automação de marketing e infraestrutura digital autônoma.

O sistema opera como um front-end direto (estilo ChatGPT), focado
em proporcionar uma experiência humana, consultiva e de alta
conversão para empresários e visionários.

```text
────────────────────────────────────────

## ⧉ Diferenciais

▓▓▓ CAPACIDADES
────────────────────────────────────────
└─ Respostas em tempo real e inteligentes.
└─ Memória de contexto para conversas fluidas.
└─ Captura automática de dados qualificados (CRM).
└─ Interface mobile-first ultra-rápida (PWA).
└─ Foco total em ROI e escala de negócios.

────────────────────────────────────────
```

```graph
graph TD
    Client[Browser /chat] -->|POST /api/chat| API[src/pages/api/chat.ts]
    API -->|Lê no Servidor| SP[src/lib/system-prompt.md]
    API -->|Lê no Servidor| CX[src/lib/CONTEXT.json]
    SP & CX -->|Concatena em 'systemPrompt'| FinalPrompt[Prompt do Sistema Completo]
    FinalPrompt -->|Injetado no topo das mensagens| LLM[API da LLM / Completions]
```

## ⬡ Segurança

```text
────────────────────────────────────────
▓▓▓ HEADERS HTTP (middleware.ts)
────────────────────────────────────────
└─ Strict-Transport-Security  max-age=31536000; includeSubDomains
└─ Content-Security-Policy    script/style/font/img/connect restritos
└─ X-Frame-Options            SAMEORIGIN
└─ X-Content-Type-Options     nosniff
└─ Referrer-Policy            strict-origin-when-cross-origin
└─ Permissions-Policy         camera/mic/geo/payment/usb desabilitados

▓▓▓ CLOUDFLARE (edge)
────────────────────────────────────────
└─ HSTS                       ativado (max-age=31536000)
└─ Block AI Bots              ativado — bloqueia crawlers de treino de IA
└─ AI Labyrinth               ativado — honeypot para bots não conformes
└─ Bot Fight Mode             desativado (evita falsos positivos)

▓▓▓ ROBOTS.TXT
────────────────────────────────────────
└─ Googlebot                  permitido
└─ /api/                      bloqueado para todos
└─ GPTBot, ClaudeBot, CCBot   bloqueados
└─ Google-Extended, Bytespider bloqueados

────────────────────────────────────────
```

## ◈ SEO

```text
────────────────────────────────────────
▓▓▓ INDEXAÇÃO
────────────────────────────────────────
└─ Canonical      https://chat.neoflowoff.agency/chat
└─ Sitemap        https://chat.neoflowoff.agency/sitemap.xml
└─ Open Graph     og:title, og:description, og:image (1200×630)
└─ Twitter Card   summary_large_image
└─ JSON-LD        WebApplication + Organization (schema.org)
└─ Meta keywords  automação de marketing, agentes de IA, CRM...

▓▓▓ CONTEÚDO ESTÁTICO (crawlável)
────────────────────────────────────────
└─ EmptyState.astro contém texto indexável via CSS clip
   (invisível ao usuário, legível pelo Googlebot)

────────────────────────────────────────
```

## ◬ Documentação

Para detalhes de infraestrutura, stack técnica e comandos de
desenvolvimento, consulte o arquivo:
👉 [**SETUP.md**](./SETUP.md)

```line
Requisito de runtime:
└─ Node.js `>=22.12.0`

────────────────────────────────────────
```

```text
▓▓▓ Neo Mello
────────────────────────────────────────
Fundador · NEO FlowOFF
neo@neoflowoff.agency

"Automação de marketing e infraestrutura
digital autônoma."

Security by design.
────────────────────────────────────────
```
