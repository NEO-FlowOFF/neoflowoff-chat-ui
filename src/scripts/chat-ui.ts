import { enqueue, getPending, dequeue } from '@/lib/idb-queue';

try {
  const introSeen = sessionStorage.getItem("flow_intro_seen");
  if (!introSeen) {
    window.location.replace("/");
  }
} catch {}

const wrap    = document.getElementById('messagesWrap') as HTMLDivElement;
const input   = document.getElementById('msgInput') as HTMLTextAreaElement;
const sendBtn = document.getElementById('sendBtn') as HTMLButtonElement;
const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
const empty   = document.getElementById('emptyState');
const toastEl = document.getElementById('toast') as HTMLDivElement;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const STORAGE_KEY = 'flow_history_v1';
const SESSION_KEY = 'flow_session_id';
const ATTRIBUTION_KEY = 'neo_attribution_v1';
const MAX_HISTORY = 40;

function getAttribution() {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm_source = params.get('utm_source');
    const utm_medium = params.get('utm_medium');
    const utm_campaign = params.get('utm_campaign');
    const utm_term = params.get('utm_term');
    const utm_content = params.get('utm_content');
    const context = params.get('context') || params.get('ctx');
    const gclid = params.get('gclid');
    const fbclid = params.get('fbclid');

    const hasParams = utm_source || utm_medium || utm_campaign || utm_term || utm_content || context || gclid || fbclid;
    const referrer = document.referrer || null;
    const landing_path = window.location.pathname;

    if (hasParams || referrer) {
      const attr = {
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        context,
        gclid,
        fbclid,
        landing_path,
        referrer
      };
      localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attr));
      return attr;
    }

    const cached = localStorage.getItem(ATTRIBUTION_KEY);
    if (cached) return JSON.parse(cached);
  } catch (e) {
    console.error('[ATTRIBUTION] Error:', e);
  }
  return null;
}

function loadHistory() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } }
function saveHistory() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory.slice(-MAX_HISTORY))); } catch {} }
function pushHistory(role: string, content: string) { chatHistory.push({ role, content, ts: Date.now() }); }

function scrollToBottom() { requestAnimationFrame(() => { wrap.scrollTop = wrap.scrollHeight; }); }
function formatTime() { return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Converts a subset of markdown to safe HTML.
 *
 * Security: input is run through escapeHtml() (encodes &, <, >, ", ') before
 * any processing. The only HTML emitted is from an explicit allowlist: <code>,
 * <pre>, <strong>, <em>, <a>, <ul>, <ol>, <li>, <h1-h6>, <blockquote>, <br>.
 * Link hrefs are validated against ^https?:// — any other scheme (javascript:,
 * data:, etc.) is replaced with "#" — then run through escapeAttribute() to
 * encode quotes and prevent attribute injection.
 *
 * Callers may assign the return value to .innerHTML without further sanitization.
 */
function formatMarkdown(text: string) {
  const escaped = escapeHtml(text);
  const lines = escaped.split('\n');
  let inCodeBlock = false;
  const codeLines: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let listItems: string[] = [];
  let paraLines: string[] = [];
  let output = '';
  const flushPara = () => {
    if (!paraLines.length) return '';
    const html = `<p>${paraLines.map(l => inlineMarkdown(l)).join(' ')}</p>`;
    paraLines = [];
    return html;
  };
  const inlineMarkdown = (value: string) => {
    const tokens: string[] = [];

    const preserve = (html: string) => {
      const index = tokens.push(html) - 1;
      return `\u0000${index}\u0000`;
    };

    let parsed = value;

    parsed = parsed.replace(/`([^`]+)`/g, (_, codeText) => {
      return preserve(`<code>${codeText}</code>`);
    });

    parsed = parsed.replace(/\[([^\]]+)]\(([^)\n]+)\)/g, (_, linkText, url) => {
      const cleanUrl = url.trim().replace(/\s+/g, '%20');
      const safe = /^https?:\/\//i.test(cleanUrl) ? escapeAttribute(cleanUrl) : '#';
      return preserve(
        `<a href="${safe}" target="_blank" rel="noreferrer noopener">${linkText}</a>`
      );
    });

    parsed = parsed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    parsed = parsed.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');

    parsed = parsed.replace(/\u0000(\d+)\u0000/g, (_, index) => {
      return tokens[Number(index)] ?? '';
    });

    return parsed;
  };
  const flushList = () => {
    if (!listType) return '';
    const tag = listType === 'ul' ? 'ul' : 'ol';
    const html = `<${tag}>${listItems.map(item => `<li>${inlineMarkdown(item.trim())}</li>`).join('')}</${tag}>`;
    listType = null; listItems = [];
    return html;
  };
  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) { output += `<pre><code>${codeLines.join('\n')}</code></pre>`; codeLines.length = 0; inCodeBlock = false; }
      else { inCodeBlock = true; }
      continue;
    }
    if (inCodeBlock) { codeLines.push(line); continue; }
    const headerMatch = line.match(/^\s{0,3}(#{1,6})\s+(.+)$/);
    const blockquoteMatch = line.match(/^\s{0,3}>\s?(.*)$/);
    const unorderedMatch = line.match(/^\s*[-*+]\s+(.+)$/);
    const orderedMatch = line.match(/^\s*(\d+)\.\s+(.+)$/);
    if (headerMatch) { output += flushPara(); output += flushList(); output += `<h${headerMatch[1].length}>${inlineMarkdown(headerMatch[2].trim())}</h${headerMatch[1].length}>`; continue; }
    if (blockquoteMatch) { output += flushPara(); output += flushList(); output += `<blockquote>${inlineMarkdown(blockquoteMatch[1].trim())}</blockquote>`; continue; }
    if (unorderedMatch) { output += flushPara(); if (listType === 'ol') output += flushList(); listType = 'ul'; listItems.push(unorderedMatch[1]); continue; }
    if (orderedMatch) { output += flushPara(); if (listType === 'ul') output += flushList(); listType = 'ol'; listItems.push(orderedMatch[2]); continue; }
    output += flushList();
    if (line.trim() === '') { output += flushPara(); } else { paraLines.push(line); }
  }
  output += flushPara();
  output += flushList();
  return output;
}

function renderBubble(role: string, text: string, animate: boolean) {
  const isUser = role === 'user';
  const tpl = document.getElementById(isUser ? 'tpl-user' : 'tpl-agent');
  if (!tpl) return;
  const clone = tpl.firstElementChild?.cloneNode(true) as HTMLElement;
  if (!clone) return;
  const bubbleEl = clone.querySelector('.bubble');
  const timeEl = clone.querySelector('.timestamp');
  const visitorLabelEl = clone.querySelector('.visitor-label');
  if (bubbleEl) bubbleEl.innerHTML = formatMarkdown(text); // safe — see formatMarkdown JSDoc // nosemgrep: javascript.browser.security.insecure-document-method,javascript.browser.security.insecure-innerhtml
  if (timeEl) timeEl.textContent = formatTime();
  if (visitorLabelEl && sessionId) {
    const code = sessionId.replace(/-/g, '').slice(0, 6).toUpperCase();
    visitorLabelEl.textContent = `VISITANTE: %${code}`;
  }
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

  bubble.innerHTML = '';
  const textEl = document.createElement('span');
  textEl.className = 'markdown-text';
  const cursor = document.createElement('span');
  cursor.className = 'stream-cursor';
  bubble.appendChild(textEl);
  bubble.appendChild(cursor);

  wrap.appendChild(msg);
  return { el: msg, textEl };
}

function renderTyping(): HTMLElement {
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

function clearMessages() {
  wrap.querySelectorAll('.msg-container, .msg').forEach(m => m.remove());
}

function renderAllMessages() {
  if (chatHistory.length > 0) {
    empty?.classList.add('hidden');
    clearMessages();
    chatHistory.forEach((m: any) => renderBubble(m.role, m.content, false));
    scrollToBottom();
  } else {
    clearMessages();
    empty?.classList.remove('hidden');
  }
}

function showToast(msg: string) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

function showEmptyState() {
  empty?.classList.remove('hidden');
  scrollToBottom();
}

let sessionId = localStorage.getItem(SESSION_KEY);
if (!sessionId) {
  sessionId = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, sessionId);
}

const attributionData = getAttribution();

let chatHistory = loadHistory();
let isStreaming = false;
let toastTimer: ReturnType<typeof setTimeout>;

async function syncHistoryWithRedis() {
  try {
    const res = await fetch(`/api/history?sessionId=${sessionId}`);
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.history) && data.history.length > 0) {
      chatHistory = data.history.map((m: { role?: string; content?: string }) => ({
        role: m.role === "assistant" ? "agent" : m.role === "user" ? "user" : "agent",
        content: typeof m.content === "string" ? m.content : ""
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory.slice(-MAX_HISTORY)));
      renderAllMessages();
      showToast("Memória sincronizada");
    }
  } catch {}
}

const streamProxy = async (
  _userText: string,
  typingEl: HTMLElement
): Promise<string> => {
  const messages = [
    ...chatHistory.slice(-MAX_HISTORY).map((m: any) => ({
      role: m.role === 'agent' ? 'assistant' : m.role,
      content: m.content
    }))
  ];
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      sessionId,
      stream: true,
      max_tokens: 1024,
      temperature: 0.7,
      attribution: attributionData
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  typingEl.remove();
  const { el: agentMsg, textEl } = renderStreamingBubble();
  scrollToBottom();
  let fullText = '';
  let renderScheduled = false;
  if (!res.body) throw new Error('A resposta da API está vazia (res.body é null).');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const json = line.replace('data: ', '').trim();
      if (json === '[DONE]') break;
      try {
        const delta = JSON.parse(json).choices?.[0]?.delta?.content || '';
        if (!delta) continue;
        fullText += delta;
        // Debounce: schedule one render per animation frame to avoid layout thrashing
        if (!renderScheduled) {
          renderScheduled = true;
          requestAnimationFrame(() => {
            textEl.innerHTML = formatMarkdown(fullText); // safe — see formatMarkdown JSDoc // nosemgrep: javascript.browser.security.insecure-document-method,javascript.browser.security.insecure-innerhtml
            scrollToBottom();
            renderScheduled = false;
          });
        }
        await sleep(10 + Math.random() * 25);
      } catch {}
    }
  }
  // Final render to ensure last chunk is displayed
  textEl.innerHTML = formatMarkdown(fullText); // safe — see formatMarkdown JSDoc // nosemgrep: javascript.browser.security.insecure-document-method,javascript.browser.security.insecure-innerhtml
  scrollToBottom();
  agentMsg.querySelector('.stream-cursor')?.remove();
  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  const timeSpan = document.createElement('span');
  timeSpan.className = 'msg-time';
  timeSpan.textContent = formatTime();
  meta.appendChild(timeSpan);
  agentMsg.querySelector('.bubble')?.after(meta);
  return fullText;
};

async function handleSend(queuedText?: string) {
  const text = queuedText ?? input.value.trim();
  if (!text || isStreaming) return;

  isStreaming = true;
  sendBtn.disabled = true;
  if (!queuedText) {
    input.value = '';
    input.style.height = 'auto';
  }

  empty?.classList.add('hidden');
  document.querySelector('.header')?.classList.add('chat-active');
  pushHistory('user', text);
  saveHistory();
  const userBubble = renderBubble('user', text, true);
  const typingEl = renderTyping();
  scrollToBottom();

  try {
    const readingTime = Math.min(text.length * 15, 1200);
    const thinkingTime = 600 + Math.random() * 1000;
    await sleep(readingTime + thinkingTime);

    const reply = await streamProxy(text, typingEl);
    pushHistory('agent', reply);
    saveHistory();
  } catch (err: unknown) {
    typingEl.remove();
    const isNetworkError = err instanceof TypeError;

    if (isNetworkError && !queuedText) {
      chatHistory.pop();
      saveHistory();
      userBubble?.remove();
      await enqueue({
        sessionId: sessionId!,
        text,
        timestamp: Date.now()
      }).catch(() => {});
      renderBubble(
        "agent",
        "⚡ Sem conexão. Sua mensagem foi salva e será reenviada automaticamente.",
        true
      );
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready
          .then(reg =>
            (reg as ServiceWorkerRegistration & {
              sync?: { register(t: string): Promise<void> };
            }).sync?.register("neo-chat-sync")
          )
          .catch(() => {});
      }
    } else {
      renderBubble(
        "agent",
        `⚠ Erro: ${err instanceof Error ? err.message : "desconhecido"}`,
        true
      );
    }
  } finally {
    isStreaming = false;
    sendBtn.disabled = !input.value.trim();
    input.focus();
  }
}

async function flushQueue() {
  const pending = await getPending().catch(() => []);
  if (pending.length === 0) return;
  showToast(`Reconectado. Reenviando ${pending.length} mensagem${pending.length > 1 ? 's' : ''}…`);
  for (const msg of pending) {
    if (msg.id != null) await dequeue(msg.id).catch(() => {});
    await handleSend(msg.text);
  }
}

const showConfirm = (msg: string) =>
  new Promise<boolean>((resolve) => {
    const backdrop = document.getElementById('confirm-backdrop') as HTMLElement;
    const msgEl = document.getElementById('confirm-msg') as HTMLElement;
    const okBtn = document.getElementById('confirm-ok') as HTMLButtonElement;
    const cancelBtn = document.getElementById('confirm-cancel') as HTMLButtonElement;

    msgEl.textContent = msg;
    backdrop.hidden = false;

    const close = (result: boolean) => {
      backdrop.hidden = true;
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      backdrop.removeEventListener('click', onBackdrop);
      resolve(result);
    };

    const onOk = () => close(true);
    const onCancel = () => close(false);
    const onBackdrop = (e: MouseEvent) => { if (e.target === backdrop) close(false); };

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    backdrop.addEventListener('click', onBackdrop);
  });

// Initialization
renderAllMessages();
syncHistoryWithRedis();

// Input / send event listeners
input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  sendBtn.disabled = !input.value.trim() || isStreaming;
});

input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!sendBtn.disabled) handleSend(); }
});

sendBtn.addEventListener('click', () => handleSend());

clearBtn.addEventListener('click', async () => {
  const shouldReset = await showConfirm('Limpar e reiniciar este chat?');
  if (!shouldReset) return;

  sessionId = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, sessionId);

  const queued = await getPending().catch(() => []);
  for (const msg of queued) {
    if (msg.id != null) await dequeue(msg.id).catch(() => {});
  }

  chatHistory = [];
  saveHistory();

  showEmptyState();
  renderAllMessages();

  input.value = '';
  input.style.height = 'auto';
  input.disabled = false;
  input.placeholder = 'Pergunte algo…';
  sendBtn.disabled = true;

  showToast('Nova sessão iniciada');
});

// Offline / SW sync
window.addEventListener('online', () => flushQueue());
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (e: MessageEvent) => {
    if ((e.data as { type?: string })?.type === 'SYNC_READY') flushQueue();
  });
}
flushQueue();
