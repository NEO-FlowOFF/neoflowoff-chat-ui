    try {
      const introSeen = sessionStorage.getItem("nox_intro_seen");
      if (!introSeen) {
        window.location.replace("/");
      }
    } catch {}

    const wrap    = document.getElementById('messagesWrap') as HTMLDivElement;

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const STORAGE_KEY = 'nox_history_v1';
    const SESSION_KEY = 'nox_session_id';
    const MAX_HISTORY = 40;
    const MAX_SESSION_MESSAGES = 10;
    let sessionCount = 0;

    // Identidade Única do Usuário
    let sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, sessionId);
    }

    let chatHistory = loadHistory();
    let isStreaming = false;

    const input   = document.getElementById('msgInput') as HTMLTextAreaElement;
    const sendBtn = document.getElementById('sendBtn') as HTMLButtonElement;
    const clearBtn= document.getElementById('clearBtn') as HTMLButtonElement;
    const themeBtn= document.getElementById('themeToggle') as HTMLButtonElement;
    const empty   = document.getElementById('emptyState');
    const toastEl = document.getElementById('toast') as HTMLDivElement;

    async function syncHistoryWithRedis() {
      try {
        const res = await fetch(`/api/history?sessionId=${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.history && data.history.length > 0) {
          chatHistory = data.history.map((m: any) => ({
            role: m.role === 'assistant' ? 'agent' : m.role,
            content: m.content
          }));
          saveHistory();
          renderAllMessages();
          showToast('Memória sincronizada');
        }
      } catch (err) {
        console.error('[SYNC ERROR]', err);
      }
    }

    function renderAllMessages() {
      if (chatHistory.length > 0) {
        empty?.classList.add('hidden');
        // Limpa apenas as bolhas de mensagem, mantém o emptyState no DOM
        wrap.querySelectorAll('.msg').forEach(m => m.remove());
        chatHistory.forEach((m: any) => renderBubble(m.role, m.content, false));
        scrollToBottom();
      } else {
        wrap.querySelectorAll('.msg').forEach(m => m.remove());
        empty?.classList.remove('hidden');
      }
    }

    // Inicialização
    renderAllMessages();
    syncHistoryWithRedis();

    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      sendBtn.disabled = !input.value.trim() || isStreaming;
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!sendBtn.disabled) handleSend(); }
    });

    sendBtn.addEventListener('click', handleSend);

    async function handleSend() {
      const text = input.value.trim();
      if (!text || isStreaming) return;
      
      // Esconde o empty state ao começar a digitar/enviar primeira msg
      empty?.classList.add('hidden');
      input.value = ''; input.style.height = 'auto';
      sendBtn.disabled = true; isStreaming = true;
      pushHistory('user', text);
      renderBubble('user', text, true);
      const typingEl = renderTyping();
      scrollToBottom();

      try {
        // Humanize: Pausa proporcional ao tamanho da mensagem (leitura) + reflexão
        const readingTime = Math.min(text.length * 15, 1200); 
        const thinkingTime = 600 + Math.random() * 1000;
        await sleep(readingTime + thinkingTime);

        sessionCount++;
        const reply = await streamProxy(text, typingEl);
        pushHistory('assistant', reply);
        saveHistory();

        if (sessionCount >= MAX_SESSION_MESSAGES) {
          renderBubble('agent', 'foi um prazer conversar! Para continuar ou receber uma proposta, entre em contato pelo e-mail neo@neoflowoff.agency ou WhatsApp (62) 98323-1110. 👋', true);
          sendBtn.disabled = true;
          input.disabled = true;
          input.placeholder = 'Sessão Beta finalizada.';
        }
      } catch (err: any) {
        typingEl.remove();
        renderBubble('agent', `⚠ Erro de conexão: ${err.message}`, true);
      } finally {
        isStreaming = false;
        sendBtn.disabled = !input.value.trim();
        input.focus();
      }
    }

    async function streamProxy(_userText: string, typingEl: HTMLElement) {
      const messages = [
        ...chatHistory.slice(-MAX_HISTORY).map((m: any) => ({ role: m.role === 'agent' ? 'assistant' : m.role, content: m.content }))
      ];
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages, 
          sessionId, // ID único para memória no Redis
          stream: true, 
          max_tokens: 1024, 
          temperature: 0.7 
        }),
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      typingEl.remove();
      
      const { el: agentMsg, textEl } = renderStreamingBubble();
      scrollToBottom();
      
      let fullText = '';
      if (!res.body) throw new Error('A resposta da API está vazia (res.body é null).');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const json = line.replace('data: ', '').trim();
            if (json === '[DONE]') break;
            try {
              const delta = JSON.parse(json).choices?.[0]?.delta?.content || '';
              fullText += delta; 
              textEl.textContent = fullText; 
              scrollToBottom();
              // Jitter humano no streaming
              if (delta.length > 0) await sleep(10 + Math.random() * 25);
            } catch {}
          }
        }
      }
      
      agentMsg.querySelector('.stream-cursor')?.remove();
      const meta = document.createElement('div');
      meta.className = 'msg-meta';
      meta.innerHTML = `<span style="font-size:8px; color:var(--text-muted); opacity:0.5; letter-spacing:0.05em;">${formatTime()}</span>`;
      agentMsg.querySelector('.bubble')?.after(meta);
      return fullText;
    }

    function renderBubble(role: string, text: string, animate: boolean) {
      const isUser = role === 'user';
      const tplId = isUser ? 'tpl-user' : 'tpl-agent';
      const tpl = document.getElementById(tplId);
      if (!tpl) return;

      const clone = tpl.firstElementChild?.cloneNode(true) as HTMLElement;
      if (!clone) return;

      // Injeta conteúdo e tempo
      const bubbleEl = clone.querySelector('.bubble');
      const timeEl = clone.querySelector('.timestamp');
      if (bubbleEl) bubbleEl.textContent = text;
      if (timeEl) timeEl.textContent = formatTime();

      if (!animate) clone.style.animation = 'none';
      wrap.appendChild(clone);
      scrollToBottom();
      return clone;
    }

    function renderStreamingBubble() {
      const tpl = document.getElementById('tpl-agent');
      if (!tpl) throw new Error('Template do agente não encontrado');
      const msg = tpl.firstElementChild?.cloneNode(true) as HTMLElement;
      if (!msg) throw new Error('Falha ao clonar template do agente');

      msg.classList.add('is-live');
      const bubble = msg.querySelector('.bubble') as HTMLElement | null;
      if (!bubble) throw new Error('Bolha do agente não encontrada');

      bubble.textContent = '';
      const textEl = document.createElement('span');
      const cursor = document.createElement('span');
      cursor.className = 'stream-cursor';
      bubble.appendChild(textEl);
      bubble.appendChild(cursor);

      wrap.appendChild(msg);
      return { el: msg, textEl };
    }

    function renderTyping() {
      const tpl = document.getElementById('tpl-agent');
      if (!tpl) throw new Error('Template do agente não encontrado');
      const msg = tpl.firstElementChild?.cloneNode(true) as HTMLElement;
      if (!msg) throw new Error('Falha ao clonar template do agente');

      msg.classList.add('is-live');
      msg.style.animation = 'none';
      const bubble = msg.querySelector('.bubble') as HTMLElement | null;
      if (!bubble) throw new Error('Bolha do agente não encontrada');

      bubble.innerHTML = '<span class="typing-dots"><span></span><span></span><span></span></span>';
      wrap.appendChild(msg);
      return msg;
    }

    clearBtn.addEventListener('click', () => {
      const shouldReset = window.confirm(
        'Isso vai limpar e reiniciar este chat. Deseja continuar?',
      );
      if (!shouldReset) return;

      // Rotação de Identidade: Gera um novo sessionId para "resetar" a mente do agente
      sessionId = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, sessionId);
      
      // Reseta contadores e histórico local
      chatHistory = [];
      sessionCount = 0;
      saveHistory();
      
      showEmptyState();
      renderAllMessages();
      
      input.value = '';
      input.style.height = 'auto';
      input.disabled = false;
      input.placeholder = 'Digite sua mensagem...';
      sendBtn.disabled = true;
      
      showToast('Nova sessão iniciada');
    });

    // Theme Toggle Logic
    const savedTheme = localStorage.getItem('nox_theme');
    if (savedTheme === 'dark') document.body.classList.add('dark-mode');
    themeBtn.setAttribute('aria-pressed', document.body.classList.contains('dark-mode') ? 'true' : 'false');
    
    themeBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      localStorage.setItem('nox_theme', isDark ? 'dark' : 'light');
      themeBtn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      showToast(isDark ? 'Modo Escuro Ativado' : 'Modo Claro Ativado');
    });

    function loadHistory() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } }
    function saveHistory() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory.slice(-MAX_HISTORY))); } catch {} }
    function pushHistory(role: string, content: string) { chatHistory.push({ role, content, ts: Date.now() }); }
    function scrollToBottom() { requestAnimationFrame(() => { wrap.scrollTop = wrap.scrollHeight; }); }
    function formatTime() { return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }

    let toastTimer: any;
    function showToast(msg: string) {
      toastEl.textContent = msg; toastEl.classList.add('show');
      clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
    }

    function showEmptyState() {
      empty?.classList.remove('hidden');
      scrollToBottom();
    }
