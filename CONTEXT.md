<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->
  
```text
========================================
       NEØ:One · SYSTEM CONTEXT
========================================
Status: ACTIVE
Version: v1.1.0
========================================
```

## ⟠ Objetivo

Definição arquitetural e contextual da interface soberana
do agente NEØ:One (núcleo de inteligência FlowOFF).

────────────────────────────────────────

## ⧉ Mapa Mental

Este repositório (`neoflowoff-chat-ui`) contém o front-end
e o proxy de comunicação do NEØ:One.

Opera como repositório soberano com runtime próprio,
mantendo histórico (git) e dependências de produto,
alinhado ao protocolo de segurança NΞØ.

────────────────────────────────────────

## ⨷ Design (Tactile HUD)

▓▓▓ ESTÉTICA CIBERNÉTICA
────────────────────────────────────────
└─ Cores: Fundo cinza oficial (#f2f2f2) vs HUDs (#111110).
└─ Acentos: Neon Green e Neon Pink (Strategic Highlights).
└─ Volume: Rim Lights, Inset Shadows e Gradientes 145°.
└─ Fontes: Codystar (LED Dot) e Geist Mono (Cognition).

────────────────────────────────────────

## ⧇ Arquitetura de Produção

▓▓▓ FLUXO DE DADOS (SSR)
────────────────────────────────────────
└─ Client (PWA) -> /api/chat (Astro POST)
└─ Middle: Redis History Sync + Memory Guard
└─ Backend: Venice AI (Uncensored / SSE Proxy)

────────────────────────────────────────

## ⍟ Pilares Técnicos

1. **Memória Soberana:** Redis (Railway) via sessionId.
2. **Venice AI:** Streaming SSE em tempo real (No Buffer).
3. **Strategic Guard:** Limite de sessão e extração Regis.

────────────────────────────────────────

## ◱ Navegação

- [MEMORY.md](./MEMORY.md) (Estrutura Redis)
- [README.md](./README.md) (Setup e Operação)
- [SKILL.md](./SKILL.md) (Manifesto de Capacidades)

```text
▓▓▓ NΞØ MELLØ
────────────────────────────────────────
Core Architect · NΞØ Protocol
neo@neoprotocol.space

"Code is law. Expand until 
chaos becomes protocol."

Security by design.
Exploits find no refuge here.
────────────────────────────────────────
```
