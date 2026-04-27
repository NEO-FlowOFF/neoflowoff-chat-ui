# ⟠ NEØ:one · Arquitetura de Contexto e Defesa (Versão Expandida)

Este documento detalha a infraestrutura de inteligência do agente e as camadas de defesa técnica que garantem a integridade das respostas e a soberania do ecossistema.

## ▓▓▓ Estrutura de Injeção e Defesa (Backend)

O backend do Astro (`src/pages/api/chat.ts`) atua como um **Security Gateway**. Ele consolida os componentes de consciência em um ambiente isolado (Node.js) antes de despachar o payload para o LLM.

### 1. `src/lib/system-prompt.md` (A Alma / Master Rules)

* **Função:** Definição ontológica e restritiva.
* **Defesa Técnica (Prompt Injection Shield):**
  * Ao ser injetado no topo do array de mensagens como uma mensagem de sistema (`role: "system"`), ele possui maior peso hierárquico no modelo.
  * O backend garante que nenhuma instrução do usuário consiga sobrescrever estas regras, pois a consolidação ocorre fora do alcance do cliente (Client-Side).
* **Implementação:** O system-prompt é carregado como a primeira mensagem no array, precedendo qualquer input do usuário.

### 2. `src/lib/CONTEXT.json` (O Conhecimento / Ground Truth)

* **Função:** Repositório de fatos estruturados.
* **Defesa Técnica (Anti-Hallucination Guard):** Serve como o "Padrão Ouro" da informação. O agente é instruído a priorizar este JSON sobre qualquer informação pré-treinada. Isso mitiga ataques de **Context Poisoning**.

---

## ⧇ Camadas de Memória e Privacidade

A memória do NEØ:one é segmentada para evitar contaminação cruzada e garantir persistência soberana.

### 1. Isolamento de Sessão (Session Sandboxing)

Os dados no Redis são mapeados estritamente para o `sessionId`, impedindo vazamento de histórico entre usuários.

```typescript
// Exemplo de Mapeamento no Redis
await redis.set(`session:${sessionId}`, JSON.stringify({
  userId: 'unique-user-id',
  messages: [],
  lastAccessed: new Date().toISOString()
}), { EX: 3600 });
```

### 2. Soberania de Dados (Zero Client-Side Logic)

Toda a lógica de extração de leads (Regis) e sincronização de memória ocorre no servidor. O cliente recebe apenas a resposta final processada.

---

## ⨷ Protocolos de Segurança Adicionais

### 1. Sanitização de Inputs

```typescript
function sanitizeInput(input: string): string {
  const jailbreakPatterns = [
    /ignore (all )?(previous|above) instructions/gi,
    /forget (everything|all instructions)/gi,
    /you are now (a|an) (uncensored|unrestricted)/gi,
    /override (your|system) (programming|instructions)/gi
  ];
  let sanitized = input;
  for (const pattern of jailbreakPatterns) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
}
```

### 2. Validação de Respostas

Monitoramento para impedir que o agente vaze instruções do sistema ou chaves de API.

---

## ▓▓▓ Modelo de Contexto Expandido (O Ecossistema)

### Identidade do Agente: NEØ:one

* **Papel:** Agente de Primeiro Contato.
* **Missão:** Qualificação de leads, apresentação do NEØ Protocol e agendamento de reuniões.
* **Persona:** Profissional, direto, sem rodeios. #NEOOne.

### Serviços Principais

1. **Consultoria:** Arquitetura de ecossistemas digitais e redução de 85% no trabalho manual.
2. **Desenvolvimento:** Infraestruturas autônomas (ASI1 API, Agentverse, Blockchain).
3. **Estratégia:** Marketing autônomo e lealdade algorítmica.

### Regras de Escalonamento (Escalation)

O agente deve agendar reunião via Calendly ou coletar e-mail quando:

* O cliente solicita reunião com **NEØ MELLØ**.
* A pergunta requer conhecimento técnico especializado profundo.
* Há interesse claro em contratação ou proposta comercial.

---

## 📊 Métricas e Monitoramento

* **Segurança:** Tentativas de injection detectadas, taxa de sucesso de validação.
* **Performance:** Latência de resposta, uso de tokens (ASI1).
* **Qualidade:** Taxa de conversão de leads, satisfação do usuário.

---
*"Code is law. Context is sovereign. Defense is depth."*
