# NEXT STEPS (Roadmap & Tarefas Futuras)

Este documento registra as intenções de evolução e débito técnico planejado para a interface do **NØX**.

## PWA — Próximos poderes

- [ ] Background Sync (IndexedDB → retry offline)
- [ ] Web Push Notifications
      ⚠ iOS: requer instalação na home screen + iOS 16.4+
- [ ] Badging API
- [ ] Botão de instalação customizado (BeforeInstallPromptEvent)
      ⚠ iOS: não expõe esse evento — workaround: banner manual com detecção de standalone

## Restrições conhecidas
- Safari/iOS < 16.4: sem push, sem background sync
- Chrome Android: sem restrições

## 2. Migração de Estado para Redis
* Transição do armazenamento de histórico em `localStorage` para persistência segura server-side utilizando Redis, garantindo a memória de longo prazo da entidade.

## 3. Injeção Contextual via RAG
* Ler os manifestos (ex: `ecosystem.json`) do repositório root e injetar via RAG no system prompt da Azure AI Foundry para dar consciência de infraestrutura ao agente.
