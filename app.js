'use strict';

// ============ CONFIG ============
const API_BASE = 'https://ai-api-amber.vercel.app';
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Replace after creating project
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Replace after creating project

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let responseMode = 'text';
let conversationHistory = [];
let isGenerating = false;
let currentConversationId = null;

// ============ UUID GENERATION ============
function generateUUID() {
  return crypto.randomUUID();
}

// ============ AUTH ============
async function getAccessToken() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session?.access_token || null;
}

async function initAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    showChat(session.user);
  } else {
    showAuthScreen();
  }

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      showChat(session.user);
    } else if (event === 'SIGNED_OUT') {
      showAuthScreen();
    }
  });
}

async function handleLogin() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const errorEl = document.getElementById('authError');
  errorEl.textContent = '';

  if (!email || !password) {
    errorEl.textContent = 'Vyplňte email a heslo.';
    return;
  }

  setAuthLoading(true);
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  setAuthLoading(false);

  if (error) {
    errorEl.textContent = 'Neplatné přihlašovací údaje.';
  }
}

async function handleRegister() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const name = document.getElementById('authName').value.trim();
  const errorEl = document.getElementById('authError');
  errorEl.textContent = '';

  if (!email || !password) {
    errorEl.textContent = 'Vyplňte email a heslo.';
    return;
  }
  if (password.length < 6) {
    errorEl.textContent = 'Heslo musí mít alespoň 6 znaků.';
    return;
  }

  setAuthLoading(true);
  const { error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { display_name: name || email.split('@')[0] } },
  });
  setAuthLoading(false);

  if (error) {
    errorEl.textContent = 'Registrace selhala. Zkuste jiný email.';
  } else {
    errorEl.style.color = '#22c55e';
    errorEl.textContent = 'Registrace úspěšná! Zkontrolujte email pro potvrzení.';
  }
}

async function handleLogout() {
  await supabaseClient.auth.signOut();
}

async function handleForgotPassword() {
  const email = document.getElementById('authEmail').value.trim();
  const errorEl = document.getElementById('authError');
  if (!email) {
    errorEl.textContent = 'Zadejte email pro obnovení hesla.';
    return;
  }
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
  if (!error) {
    errorEl.style.color = '#22c55e';
    errorEl.textContent = 'Odkaz pro obnovení hesla byl odeslán na váš email.';
  } else {
    errorEl.textContent = 'Nepodařilo se odeslat odkaz.';
  }
}

function setAuthLoading(loading) {
  const btns = document.querySelectorAll('.auth-screen .btn-enter');
  btns.forEach(btn => { btn.disabled = loading; });
}

function toggleAuthMode() {
  const registerFields = document.getElementById('registerFields');
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const toggleLink = document.getElementById('authToggle');
  const isRegister = registerFields.classList.toggle('hidden');

  if (!isRegister) {
    loginBtn.classList.add('hidden');
    registerBtn.classList.remove('hidden');
    toggleLink.textContent = 'Již máte účet? Přihlásit se';
  } else {
    loginBtn.classList.remove('hidden');
    registerBtn.classList.add('hidden');
    toggleLink.textContent = 'Nemáte účet? Registrovat se';
  }
}

// ============ UI TRANSITIONS ============
function showAuthScreen() {
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('chatApp').classList.add('hidden');

  // Clear all user state to prevent data leak between sessions
  currentConversationId = null;
  conversationHistory = [];
  isGenerating = false;
  typewriterReset();

  // Clear DOM
  document.getElementById('chatMessages').innerHTML = '';
  const listEl = document.getElementById('conversationList');
  if (listEl) listEl.innerHTML = '';

  // Reset session stats
  sessionStats.totalInputTokens = 0;
  sessionStats.totalOutputTokens = 0;
  sessionStats.totalTtsChars = 0;
  sessionStats.messageCount = 0;
  sessionStats.anthropicBudget = null;
  sessionStats.anthropicRemaining = null;

  // Reset auth form
  document.getElementById('authError').textContent = '';
  document.getElementById('authError').style.color = '';
}

function showChat(user) {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('chatApp').classList.remove('hidden');

  const userNameEl = document.getElementById('userName');
  if (userNameEl) userNameEl.textContent = user.email;

  // Start fresh with welcome screen
  startNewConversation();

  fetchCredits();
  loadConversationList();

  document.getElementById('chatInput').focus();
}

// ============ CONVERSATIONS ============
async function loadConversationList() {
  const token = await getAccessToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/api/conversations`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    renderConversationList(data.conversations || []);
  } catch (err) {
    console.error('Failed to load conversations:', err);
  }
}

function renderConversationList(conversations) {
  const listEl = document.getElementById('conversationList');
  if (!listEl) return;

  listEl.innerHTML = '';
  for (const conv of conversations) {
    const item = document.createElement('div');
    item.className = 'conv-item';
    if (conv.id === currentConversationId) item.classList.add('active');
    item.dataset.id = conv.id;

    const titleSpan = document.createElement('span');
    titleSpan.className = 'conv-title';
    titleSpan.textContent = conv.title || 'Nová konzultace';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'conv-delete';
    deleteBtn.textContent = '✕';
    deleteBtn.onclick = (e) => { e.stopPropagation(); deleteConversation(conv.id); };

    item.appendChild(titleSpan);
    item.appendChild(deleteBtn);
    item.onclick = () => loadConversation(conv.id);
    listEl.appendChild(item);
  }
}

async function loadConversation(conversationId) {
  const token = await getAccessToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/api/conversations?id=${conversationId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();

    currentConversationId = conversationId;
    conversationHistory = (data.messages || []).map(m => ({ role: m.role, content: m.content }));

    // Re-render messages
    const container = document.getElementById('chatMessages');
    container.innerHTML = '';
    if (data.messages?.length) {
      for (const msg of data.messages) {
        addMessage(msg.role, msg.content);
      }
    } else {
      showWelcome();
    }

    // Update sidebar active state
    document.querySelectorAll('.conv-item').forEach(el => {
      el.classList.toggle('active', el.dataset.id === conversationId);
    });
  } catch (err) {
    console.error('Failed to load conversation:', err);
  }
}

async function deleteConversation(conversationId) {
  const token = await getAccessToken();
  if (!token) return;

  try {
    await fetch(`${API_BASE}/api/conversations?id=${conversationId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (conversationId === currentConversationId) {
      startNewConversation();
    }
    loadConversationList();
  } catch (err) {
    console.error('Failed to delete conversation:', err);
  }
}

function startNewConversation() {
  currentConversationId = generateUUID();
  conversationHistory = [];
  const container = document.getElementById('chatMessages');
  container.innerHTML = '';
  showWelcome();
  document.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'));
}

function showWelcome() {
  const container = document.getElementById('chatMessages');
  container.innerHTML = `
    <div class="welcome-msg">
      <div class="icon">✨</div>
      <h3>Vítejte u AI Zdenky</h3>
      <p>Jsem AI asistentka inspirovaná Zdenkou Filipovou. Mohu vám poskytnout duchovní vedení a podporu.</p>
      <div class="suggestions">
        <div class="suggestion" onclick="sendSuggestion(this)">Jak mohu změnit svůj život?</div>
        <div class="suggestion" onclick="sendSuggestion(this)">Potřebuji radu ohledně vztahu</div>
        <div class="suggestion" onclick="sendSuggestion(this)">Cítím se ztracená, co mi poradíte?</div>
        <div class="suggestion" onclick="sendSuggestion(this)">Jak najít vnitřní klid?</div>
      </div>
    </div>`;
}

// ============ SESSION TRACKING ============
const sessionStats = {
  totalInputTokens: 0, totalOutputTokens: 0, totalTtsChars: 0, messageCount: 0,
  anthropicBudget: null, anthropicRemaining: null,
};

function updateSessionDisplay() {
  const el = document.getElementById('anthropicCredits');
  if (el && sessionStats.anthropicRemaining !== null) {
    el.textContent = `🔤 Claude: $${sessionStats.anthropicRemaining.toFixed(2)} / $${sessionStats.anthropicBudget.toFixed(2)}`;
    const pct = sessionStats.anthropicBudget > 0 ? (sessionStats.anthropicRemaining / sessionStats.anthropicBudget) * 100 : 0;
    el.classList.toggle('warn', pct < 25 && pct >= 10);
    el.classList.toggle('danger', pct < 10);
  }
}

// ============ TYPEWRITER ENGINE ============
const typewriterState = { buffer: '', rendered: '', animFrameId: null, bubbleEl: null };

function typewriterAppend(text) {
  typewriterState.buffer += text;
  if (!typewriterState.animFrameId) {
    typewriterState.animFrameId = requestAnimationFrame(typewriterDrain);
  }
}

function typewriterDrain() {
  const state = typewriterState;
  if (state.buffer.length === 0) { state.animFrameId = null; return; }
  const backlog = state.buffer.length;
  const chunkSize = backlog > 200 ? 150 : backlog > 50 ? 8 : 2;
  const chunk = state.buffer.slice(0, chunkSize);
  state.buffer = state.buffer.slice(chunkSize);
  state.rendered += chunk;
  if (state.bubbleEl) {
    state.bubbleEl.textContent = state.rendered;
    document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
  }
  state.animFrameId = requestAnimationFrame(typewriterDrain);
}

function typewriterReset() {
  if (typewriterState.animFrameId) cancelAnimationFrame(typewriterState.animFrameId);
  typewriterState.buffer = '';
  typewriterState.rendered = '';
  typewriterState.animFrameId = null;
  typewriterState.bubbleEl = null;
}

function typewriterFlush() {
  if (typewriterState.animFrameId) cancelAnimationFrame(typewriterState.animFrameId);
  typewriterState.rendered += typewriterState.buffer;
  typewriterState.buffer = '';
  typewriterState.animFrameId = null;
  if (typewriterState.bubbleEl) {
    typewriterState.bubbleEl.textContent = typewriterState.rendered;
    typewriterState.bubbleEl.classList.remove('streaming');
  }
}

// ============ CREDITS ============
async function fetchCredits() {
  const token = await getAccessToken();
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE}/api/credits`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) return;
    const data = await response.json();

    if (data.elevenlabs && !data.elevenlabs.error) {
      const remaining = data.elevenlabs.remaining;
      const limit = data.elevenlabs.characterLimit;
      const pct = limit > 0 ? (remaining / limit) * 100 : 0;
      const elEl = document.getElementById('elCredits');
      elEl.textContent = `🔊 Hlas: ${remaining.toLocaleString('cs-CZ')} / ${limit.toLocaleString('cs-CZ')} znaků`;
      elEl.classList.toggle('warn', pct < 25 && pct >= 10);
      elEl.classList.toggle('danger', pct < 10);
    }

    if (data.anthropic) {
      sessionStats.anthropicBudget = data.anthropic.budget;
      sessionStats.anthropicRemaining = data.anthropic.balance;
      updateSessionDisplay();
    }
  } catch (err) {
    console.error('Credits fetch error:', err);
  }
}

// ============ RESPONSE MODE ============
function setMode(mode) {
  responseMode = mode;
  document.getElementById('toggleText').classList.toggle('active', mode === 'text');
  document.getElementById('toggleAudio').classList.toggle('active', mode === 'audio');
}

// ============ CHAT ============
function sendSuggestion(element) {
  document.getElementById('chatInput').value = element.textContent;
  sendMessage();
}

function handleKeyDown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

function autoResize(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

function formatTime() {
  const now = new Date();
  return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
}

function addMessage(role, content, withAudio = false) {
  const container = document.getElementById('chatMessages');
  const welcome = container.querySelector('.welcome-msg');
  if (welcome) welcome.remove();

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;

  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'msg-bubble';
  bubbleDiv.textContent = content; // textContent prevents XSS

  const timeDiv = document.createElement('div');
  timeDiv.className = 'msg-time';
  timeDiv.textContent = formatTime();

  messageDiv.appendChild(bubbleDiv);

  if (withAudio && role === 'assistant') {
    const audioContainer = document.createElement('div');
    audioContainer.id = 'audioContainer-' + Date.now();
    messageDiv.appendChild(audioContainer);
  }

  messageDiv.appendChild(timeDiv);
  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
  return messageDiv;
}

function showTyping() {
  const container = document.getElementById('chatMessages');
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message assistant';
  typingDiv.id = 'typingIndicator';
  typingDiv.innerHTML = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
  container.appendChild(typingDiv);
  container.scrollTop = container.scrollHeight;
}

function hideTyping() {
  const typing = document.getElementById('typingIndicator');
  if (typing) typing.remove();
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const userText = input.value.trim();
  if (!userText || isGenerating) return;

  isGenerating = true;
  document.getElementById('sendBtn').disabled = true;

  // Ensure we have a conversation ID
  if (!currentConversationId) {
    currentConversationId = generateUUID();
  }

  addMessage('user', userText);
  conversationHistory.push({ role: 'user', content: userText });
  input.value = '';
  autoResize(input);
  showTyping();

  const token = await getAccessToken();
  if (!token) {
    hideTyping();
    addMessage('assistant', '❌ Přihlášení vypršelo. Obnovte stránku.');
    isGenerating = false;
    document.getElementById('sendBtn').disabled = false;
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages: conversationHistory,
        conversation_id: currentConversationId,
      }),
    });

    hideTyping();

    if (response.status === 401) {
      addMessage('assistant', '❌ Přihlášení vypršelo. Obnovte stránku a přihlaste se znovu.');
      isGenerating = false;
      document.getElementById('sendBtn').disabled = false;
      return;
    }

    if (response.status === 429) {
      const errData = await response.json().catch(() => ({}));
      addMessage('assistant', errData.error || '⏳ Překročili jste limit zpráv. Zkuste to za chvíli.');
      isGenerating = false;
      document.getElementById('sendBtn').disabled = false;
      return;
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      addMessage('assistant', errData.error || 'Omlouvám se, něco se pokazilo.');
      isGenerating = false;
      document.getElementById('sendBtn').disabled = false;
      return;
    }

    // Parse SSE stream with typewriter
    typewriterReset();
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistantText = '';
    let messageDiv = null;
    let buffer = '';
    let msgInputTokens = 0;
    let msgOutputTokens = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'message_start' && parsed.message?.usage) {
            msgInputTokens = parsed.message.usage.input_tokens || 0;
          }
          if (parsed.type === 'message_delta' && parsed.usage) {
            msgOutputTokens = parsed.usage.output_tokens || 0;
          }
          if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
            const newText = parsed.delta.text;
            assistantText += newText;
            if (!messageDiv) {
              messageDiv = addMessage('assistant', '', responseMode === 'audio');
              const bubble = messageDiv.querySelector('.msg-bubble');
              bubble.classList.add('streaming');
              typewriterState.bubbleEl = bubble;
            }
            typewriterAppend(newText);
          }
        } catch (parseError) { /* skip */ }
      }
    }

    typewriterFlush();

    if (assistantText) {
      conversationHistory.push({ role: 'assistant', content: assistantText });
      sessionStats.totalInputTokens += msgInputTokens;
      sessionStats.totalOutputTokens += msgOutputTokens;
      sessionStats.messageCount++;

      // Per-message cost footer
      if (messageDiv && (msgInputTokens > 0 || msgOutputTokens > 0)) {
        const costDiv = document.createElement('div');
        costDiv.className = 'msg-cost';
        const totalTokens = msgInputTokens + msgOutputTokens;
        costDiv.innerHTML = `<span>🔤 ${totalTokens.toLocaleString('cs-CZ')} tokenů</span>`;
        const timeEl = messageDiv.querySelector('.msg-time');
        messageDiv.insertBefore(costDiv, timeEl);
        requestAnimationFrame(() => costDiv.classList.add('visible'));
      }

      // TTS
      if (responseMode === 'audio' && messageDiv) {
        const audioContainer = messageDiv.querySelector('[id^="audioContainer"]');
        if (audioContainer) {
          await generateAudio(assistantText, audioContainer);
          sessionStats.totalTtsChars += assistantText.length;
          const costDiv = messageDiv.querySelector('.msg-cost');
          if (costDiv) {
            const ttsSpan = document.createElement('span');
            ttsSpan.textContent = `🔊 ${assistantText.length.toLocaleString('cs-CZ')} znaků`;
            costDiv.appendChild(ttsSpan);
          }
        }
      }

      // Refresh credits and conversation list
      fetchCredits();
      loadConversationList();
    }
  } catch (error) {
    hideTyping();
    typewriterFlush();
    console.error('Chat error:', error);
    addMessage('assistant', 'Zdenka potřebuje chvíli na meditaci. Zkuste to prosím za okamžik. 🙏');
  }

  isGenerating = false;
  document.getElementById('sendBtn').disabled = false;
  document.getElementById('chatInput').focus();
}

// ============ AUDIO ============
async function generateAudio(text, container) {
  container.innerHTML = '<div class="audio-loading"><div class="spinner"></div> Připravuji hlasovou odpověď...</div>';
  const token = await getAccessToken();

  try {
    const response = await fetch(`${API_BASE}/api/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ text }),
    });

    if (response.status === 429) {
      container.innerHTML = '<div class="audio-loading" style="color:#f59e0b">⏳ Limit hlasových odpovědí překročen</div>';
      return;
    }

    if (!response.ok) {
      container.innerHTML = '<div class="audio-loading" style="color:#ef4444">❌ Hlasová odpověď není dostupná</div>';
      return;
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    container.innerHTML = `
      <div class="audio-player">
        <button class="audio-btn" onclick="toggleAudioPlay(this)" data-state="paused">▶</button>
        <div class="audio-progress"><div class="audio-progress-fill"></div></div>
        <span class="audio-time">0:00</span>
      </div>`;

    const playerEl = container.querySelector('.audio-player');
    const progressFill = playerEl.querySelector('.audio-progress-fill');
    const timeEl = playerEl.querySelector('.audio-time');
    const btn = playerEl.querySelector('.audio-btn');
    btn._audio = audio;

    audio.addEventListener('timeupdate', () => {
      if (audio.duration) {
        progressFill.style.width = (audio.currentTime / audio.duration) * 100 + '%';
        const remaining = audio.duration - audio.currentTime;
        timeEl.textContent = Math.floor(remaining / 60) + ':' + Math.floor(remaining % 60).toString().padStart(2, '0');
      }
    });
    audio.addEventListener('ended', () => { btn.textContent = '▶'; btn.dataset.state = 'paused'; progressFill.style.width = '0%'; });
    audio.addEventListener('loadedmetadata', () => {
      timeEl.textContent = Math.floor(audio.duration / 60) + ':' + Math.floor(audio.duration % 60).toString().padStart(2, '0');
    });

    fetchCredits();
  } catch (error) {
    console.error('TTS error:', error);
    container.innerHTML = '<div class="audio-loading" style="color:#ef4444">❌ Chyba při generování hlasu</div>';
  }
}

function toggleAudioPlay(btn) {
  const audio = btn._audio;
  if (!audio) return;
  if (btn.dataset.state === 'paused') {
    audio.play(); btn.textContent = '⏸'; btn.dataset.state = 'playing';
  } else {
    audio.pause(); btn.textContent = '▶'; btn.dataset.state = 'paused';
  }
}

// ============ INIT ============
document.getElementById('chatInput').addEventListener('input', function() { autoResize(this); });
document.getElementById('authEmail').addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('authPassword').focus(); });
document.getElementById('authPassword').addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLogin(); });

// Expose globals for onclick handlers
window.sendSuggestion = sendSuggestion;
window.handleKeyDown = handleKeyDown;
window.sendMessage = sendMessage;
window.setMode = setMode;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;
window.handleForgotPassword = handleForgotPassword;
window.toggleAuthMode = toggleAuthMode;
window.toggleAudioPlay = toggleAudioPlay;
window.startNewConversation = startNewConversation;

initAuth();
