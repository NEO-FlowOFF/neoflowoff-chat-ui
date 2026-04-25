# NØX — Cyber-Interface

![Version](https://img.shields.io/badge/version-1.1.0-ABED3A?style=flat-square)
![Status](https://img.shields.io/badge/status-active-ED3AE7?style=flat-square)
![Stack](https://img.shields.io/badge/stack-Astro%20%7C%20PWA%20%7C%20Node-111111?style=flat-square)

Interface soberana do agente **NØX**, o núcleo de inteligência de marketing e expansão de ecossistemas do **NEØ FlowOFF**. Esta aplicação é uma PWA de alto desempenho projetada para operar como um dashboard cibernético tátil e resiliente.

## ⚡ Core Features

- **Streaming de Resposta:** Integração via Proxy SSE com Venice AI para respostas em tempo real sem buffering.
- **Memória Soberana:** Utiliza **Redis** (Railway) para persistência server-side via `sessionId`.
- **Boot Coreografado:** Sequência de inicialização LED-wave com animações CSS precisas.
- **Dual-Theme:** Toggle 3D para alternância entre o modo High-Contrast (Dark) e o modo Oficial (Gray-Light).
- **Compliance:** Totalmente alinhado aos padrões de SEO, Metadados JSON-LD e políticas de dados do protocolo NΞØ.

## 🛠 Tech Stack

- **Framework:** Astro 6.x (SSR Mode)
- **Runtime:** Node.js v22+
- **Database:** Redis (Memory Store)
- **Deploy:** Railway / Node.js Adapter

## 🚀 Como Rodar

Este projeto utiliza o **Makefile** para automação de tarefas críticas.

### Instalação

```bash
make install
```

### Desenvolvimento

```bash
make dev
```

### Verificação (Audit + Build + Typecheck)

```bash
make verify
```

### Deploy (Railway)

O projeto está configurado para deploy automático via Railway. Certifique-se de configurar:
- `VENICE_API_KEY`
- `VENICE_MODEL`
- `REDIS_URL`

```bash
railway up
```

## 📂 Estrutura

- `/src/pages/chat.astro` — Interface principal do dashboard.
- `/src/lib/redis.ts` — Ponte de memória server-side.
- `/public/sw.js` — Lógica de persistência offline e cache.
- `CONTEXT.md` — Mapa mental e arquitetura de produto.

---

> **Protocolo NΞØ FlowOFF**  
> "A soberania digital não é pedida, é construída."
