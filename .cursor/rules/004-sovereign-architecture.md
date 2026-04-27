<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->
# SOVEREIGN ARCHITECTURE
> Definição da infraestrutura e regras de persistência do sistema.
> Garante resiliência e soberania de dados no ecossistema.

```text
========================================
    NEØ:One · SOVEREIGN ARCHITECTURE
========================================
Framework: ASTRO 6.x (SSR)
Adapter: NODE (STANDALONE)
========================================
```

## ⟠ Objetivo

Garantir que a infraestrutura técnica e as regras de persistência
respeitem os pilares de soberania e resiliência do sistema.

────────────────────────────────────────

## ⨷ Pilares Técnicos

1. **Redis**: Persistência via Railway usando `sessionId`.
2. **Venice AI**: Proxy SSE para streaming em tempo real.
3. **PWA**: Suporte offline e interface tátil (HUD/3D).

────────────────────────────────────────

## ⧉ Restrições Operacionais

- Histórico limitado a **40 mensagens** (performance).
- Extração de dados via sistema Regis.
- Security by Design em todas as rotas de API.

────────────────────────────────────────

## ⍟ Referência Canônica

Consulte sempre para detalhes arquiteturais:
- [CONTEXT.md](../../docs/CONTEXT.md)
- [MEMORY.md](../../docs/MEMORY.md)

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
