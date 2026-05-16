'use strict';

// ============ CONFIG ============
const API_BASE = 'https://ai-api-amber.vercel.app';
const SUPABASE_URL = 'https://dmtxfbzfbikynklkvjnw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_eOjnyehEY92gd_u6XhQZqA_7qJLWtT-';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let responseMode = 'text';
let conversationHistory = [];
let isGenerating = false;
let currentConversationId = null;

// ============ HEALTH CARD DATA ============
const CARD_IMAGE_BASE = 'https://www.zdenkafilipova.cz/wp-content/uploads/2025/09/Kreslici%E2%95%A0u-pla%E2%95%A0utno-1-kopie-';
const CARD_DATA = {
  1: { name: 'Anorexie', image: CARD_IMAGE_BASE + '2.webp' },
  2: { name: 'Astma, dýchání', image: CARD_IMAGE_BASE + '3.webp' },
  3: { name: 'Bolesti', image: CARD_IMAGE_BASE + '4.webp' },
  4: { name: 'Děloha', image: CARD_IMAGE_BASE + '5.webp' },
  5: { name: 'Dětské nemoci', image: CARD_IMAGE_BASE + '6.webp' },
  6: { name: 'Chrápání', image: CARD_IMAGE_BASE + '7.webp' },
  7: { name: 'Chudokrevnost', image: CARD_IMAGE_BASE + '8.webp' },
  8: { name: 'Imunitní systém', image: CARD_IMAGE_BASE + '9.webp' },
  9: { name: 'Infarkt', image: CARD_IMAGE_BASE + '10.webp' },
  10: { name: 'Játra', image: CARD_IMAGE_BASE + '11.webp' },
  11: { name: 'Jícen', image: CARD_IMAGE_BASE + '12.webp' },
  12: { name: 'Klouby', image: CARD_IMAGE_BASE + '13.webp' },
  13: { name: 'Kolena', image: CARD_IMAGE_BASE + '14.webp' },
  14: { name: 'Konečník', image: CARD_IMAGE_BASE + '15.webp' },
  15: { name: 'Krev', image: CARD_IMAGE_BASE + '16.webp' },
  16: { name: 'Křeče', image: CARD_IMAGE_BASE + '17.webp' },
  17: { name: 'Kůže', image: CARD_IMAGE_BASE + '18.webp' },
  18: { name: 'Kvasinky', image: CARD_IMAGE_BASE + '19.webp' },
  19: { name: 'Ledviny', image: CARD_IMAGE_BASE + '20.webp' },
  20: { name: 'Lokty', image: CARD_IMAGE_BASE + '21.webp' },
  21: { name: 'Mandle', image: CARD_IMAGE_BASE + '23.webp' },
  22: { name: 'Močové cesty', image: null },
  23: { name: 'Cukrovka', image: CARD_IMAGE_BASE + '24.webp' },
  24: { name: 'Mozková mrtvice', image: CARD_IMAGE_BASE + '25.webp' },
  25: { name: 'Nadváha', image: CARD_IMAGE_BASE + '26.webp' },
  26: { name: 'Nehty', image: CARD_IMAGE_BASE + '27.webp' },
  27: { name: 'Nechuť k jídlu', image: CARD_IMAGE_BASE + '28.webp' },
  28: { name: 'Nohy', image: CARD_IMAGE_BASE + '29.webp' },
  29: { name: 'Oči', image: CARD_IMAGE_BASE + '30.webp' },
  30: { name: 'Pálení žáhy', image: CARD_IMAGE_BASE + '31.webp' },
  31: { name: 'Plíce', image: CARD_IMAGE_BASE + '32.webp' },
  32: { name: 'Ploténky', image: CARD_IMAGE_BASE + '33.webp' },
  33: { name: 'Pohlavní orgány', image: CARD_IMAGE_BASE + '34.webp' },
  34: { name: 'Popraskané paty', image: CARD_IMAGE_BASE + '35.webp' },
  35: { name: 'Prostata', image: CARD_IMAGE_BASE + '36.webp' },
  36: { name: 'Rakovina', image: CARD_IMAGE_BASE + '37.webp' },
  37: { name: 'Revma', image: CARD_IMAGE_BASE + '38.webp' },
  38: { name: 'Ruce', image: CARD_IMAGE_BASE + '39.webp' },
  39: { name: 'Slepé střevo', image: CARD_IMAGE_BASE + '40.webp' },
  40: { name: 'Slezina', image: CARD_IMAGE_BASE + '41.webp' },
  41: { name: 'Slinivka', image: CARD_IMAGE_BASE + '42.webp' },
  42: { name: 'Srdce', image: CARD_IMAGE_BASE + '43.webp' },
  43: { name: 'Střevo', image: CARD_IMAGE_BASE + '44.webp' },
  44: { name: 'Štítná žláza', image: CARD_IMAGE_BASE + '45.webp' },
  45: { name: 'Uši', image: CARD_IMAGE_BASE + '46.webp' },
  46: { name: 'Úraz / Zranění', image: CARD_IMAGE_BASE + '47.webp' },
  47: { name: 'Vajíčka', image: CARD_IMAGE_BASE + '48.webp' },
  48: { name: 'Vlasy / Plešatost', image: CARD_IMAGE_BASE + '49.webp' },
  49: { name: 'Vrozené vady', image: CARD_IMAGE_BASE + '50.webp' },
  50: { name: 'Záda / Páteř', image: CARD_IMAGE_BASE + '51.webp' },
  51: { name: 'Závislost', image: CARD_IMAGE_BASE + '52.webp' },
  52: { name: 'Zuby', image: CARD_IMAGE_BASE + '53.webp' },
  53: { name: 'Žaludek', image: CARD_IMAGE_BASE + '55.webp' },
  54: { name: 'Žíly a žilní systém', image: null },
  55: { name: 'Žlučník', image: CARD_IMAGE_BASE + '55.webp' },
  56: { name: 'Žlázy', image: null },
  57: { name: 'Žučník', image: null },
};

// ============ SIMPLE MARKDOWN RENDERER ============
// Converts **bold** and *italic* to HTML while escaping everything else (XSS-safe)
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderSimpleMarkdown(text) {
  let html = escapeHtml(text);
  // **bold** → <strong>bold</strong>
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // *italic* → <em>italic</em> (but not inside <strong> tags already)
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  return html;
}

const CARD_POSITIONS = ['Minulost', 'Přítomnost', 'Budoucnost'];
const CARD_MARKER_REGEX = /\[CARD:(\d+):([^\]]+)\]/g;

// ============ UUID GENERATION ============
function generateUUID() {
  return crypto.randomUUID();
}

// ============ AUTH ============
async function getAccessToken() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session?.access_token || null;
}

let chatInitialized = false;

async function initAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    showChat(session.user);
    chatInitialized = true;
  } else {
    showAuthScreen();
  }

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session && !chatInitialized) {
      showChat(session.user);
      chatInitialized = true;
    } else if (event === 'SIGNED_OUT') {
      chatInitialized = false;
      showAuthScreen();
    }
    // TOKEN_REFRESHED and repeat SIGNED_IN events are ignored
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
  const passwordConfirm = document.getElementById('authPasswordConfirm').value;
  const name = document.getElementById('authName').value.trim();
  const errorEl = document.getElementById('authError');
  errorEl.textContent = '';
  errorEl.style.color = '';

  if (!email || !password) {
    errorEl.textContent = 'Vyplňte email a heslo.';
    return;
  }
  if (password.length < 6) {
    errorEl.textContent = 'Heslo musí mít alespoň 6 znaků.';
    return;
  }
  if (password !== passwordConfirm) {
    errorEl.textContent = 'Hesla se neshodují.';
    return;
  }

  setAuthLoading(true);
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { display_name: name || email.split('@')[0] } },
  });
  setAuthLoading(false);

  console.log('SignUp result:', { data, error });

  if (error) {
    console.error('Registration error:', error.message, error.status, error);
    if (error.message?.includes('already registered') || error.message?.includes('already been registered')) {
      errorEl.textContent = 'Tento email je již zaregistrován. Zkuste se přihlásit.';
    } else if (error.message?.includes('rate limit') || error.status === 429) {
      errorEl.textContent = 'Příliš mnoho pokusů. Zkuste to za chvíli.';
    } else if (error.message?.includes('email') && error.message?.includes('not authorized')) {
      errorEl.textContent = 'Tento email nelze použít pro registraci.';
    } else {
      errorEl.textContent = `Registrace selhala: ${error.message || 'Neznámá chyba'}`;
    }
  } else if (data?.user?.identities?.length === 0) {
    // Supabase returns fake success with empty identities when user already exists
    errorEl.textContent = 'Tento email je již zaregistrován. Zkuste se přihlásit.';
  } else {
    errorEl.style.color = '#22c55e';
    errorEl.textContent = 'Registrace úspěšná! Zkontrolujte email pro potvrzení.';

    // Disable form to prevent re-submission
    document.getElementById('authName').disabled = true;
    document.getElementById('authEmail').disabled = true;
    document.getElementById('authPassword').disabled = true;
    document.getElementById('authPasswordConfirm').disabled = true;
    document.getElementById('registerBtn').disabled = true;
    document.getElementById('registerBtn').textContent = '✓ Registrováno';
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
  const confirmField = document.getElementById('authPasswordConfirm');
  const errorEl = document.getElementById('authError');

  // Re-enable all fields (may have been disabled after successful registration)
  document.getElementById('authName').disabled = false;
  document.getElementById('authEmail').disabled = false;
  document.getElementById('authPassword').disabled = false;
  confirmField.disabled = false;
  registerBtn.disabled = false;
  registerBtn.textContent = 'Registrovat se';
  errorEl.textContent = '';
  errorEl.style.color = '';

  const isRegister = registerFields.classList.toggle('hidden');

  if (!isRegister) {
    loginBtn.classList.add('hidden');
    registerBtn.classList.remove('hidden');
    confirmField.classList.remove('hidden');
    toggleLink.textContent = 'Již máte účet? Přihlásit se';
  } else {
    loginBtn.classList.remove('hidden');
    registerBtn.classList.add('hidden');
    confirmField.classList.add('hidden');
    confirmField.value = '';
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
  sessionStats.creditBalance = null;

  // Reset auth form
  document.getElementById('authError').textContent = '';
  document.getElementById('authError').style.color = '';
}

function showChat(user) {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('chatApp').classList.remove('hidden');

  const userNameEl = document.getElementById('userName');
  if (userNameEl) userNameEl.textContent = user.email;

  // Show admin link for admin users
  const adminLink = document.getElementById('adminLink');
  if (adminLink) {
    if (user.app_metadata?.role === 'admin') {
      adminLink.classList.remove('hidden');
    } else {
      adminLink.classList.add('hidden');
    }
  }

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

    // Update title bar
    updateTitleBar(data.conversation?.title || 'Nová konzultace');

    // Re-render messages
    const container = document.getElementById('chatMessages');
    container.innerHTML = '';
    if (data.messages?.length) {
      for (const msg of data.messages) {
        const msgDiv = addMessage(msg.role, msg.content);
        // Add replay button to historical assistant messages
        if (msg.role === 'assistant') {
          addReplayButton(msgDiv, msg.content);
        }
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
  updateTitleBar('Nová konzultace');
  document.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'));
}

function updateTitleBar(title) {
  const el = document.getElementById('convTitleText');
  if (el) el.textContent = title;
}

function addReplayButton(messageDiv, text) {
  const cleanText = stripCardMarkers(text);
  const btn = document.createElement('button');
  btn.className = 'btn-replay';
  btn.innerHTML = '🔊 Přehrát hlasem';
  btn.onclick = async () => {
    btn.disabled = true;
    btn.textContent = '⏳ Generuji...';
    const audioContainer = document.createElement('div');
    audioContainer.id = 'audioContainer-' + Date.now();
    messageDiv.insertBefore(audioContainer, messageDiv.querySelector('.msg-time'));
    await generateAudio(cleanText, audioContainer);
    btn.remove();
  };
  const timeEl = messageDiv.querySelector('.msg-time');
  if (timeEl) messageDiv.insertBefore(btn, timeEl);
}

async function autoTitleConversation(userText) {
  // Generate a short title from the first user message
  const title = userText.length > 50 ? userText.substring(0, 47) + '...' : userText;
  const token = await getAccessToken();
  if (!token || !currentConversationId) return;

  updateTitleBar(title);

  try {
    await fetch(`${API_BASE}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: currentConversationId,
        title: title,
      }),
    });
  } catch (err) {
    console.error('Failed to update conversation title:', err);
  }
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
        <div class="suggestion" onclick="sendSuggestion(this)">🃏 Vylož mi karty zdraví</div>
      </div>
    </div>`;
}

// ============ SESSION TRACKING ============
const sessionStats = {
  totalInputTokens: 0, totalOutputTokens: 0, totalTtsChars: 0, messageCount: 0,
  creditBalance: null,
};

function updateCreditDisplay() {
  const el = document.getElementById('userCredits');
  if (!el || sessionStats.creditBalance === null) return;
  const balance = sessionStats.creditBalance;
  el.textContent = `💎 Kredity: ${balance}`;
  // Warn/danger thresholds based on initial 30 credits
  el.classList.toggle('warn', balance <= 7 && balance > 3);
  el.classList.toggle('danger', balance <= 3);
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
    // Apply markdown formatting now that streaming is complete
    typewriterState.bubbleEl.innerHTML = renderSimpleMarkdown(typewriterState.rendered);
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

    // Virtual credit balance (primary display)
    if (data.userCredits) {
      sessionStats.creditBalance = data.userCredits.balance;
      updateCreditDisplay();
    } else {
      // Fallback for old backend that doesn't return userCredits yet
      const el = document.getElementById('userCredits');
      if (el) el.textContent = '💎 Kredity: —';
    }
  } catch (err) {
    console.error('Credits fetch error:', err);
  }
}

// ============ CREDIT PURCHASE ============
function openPurchaseModal() {
  const modal = document.getElementById('purchaseModal');
  if (modal) {
    modal.classList.remove('hidden');
    // Reset status message
    const status = document.getElementById('purchaseStatus');
    if (status) { status.classList.add('hidden'); status.textContent = ''; }
  }
}

function closePurchaseModal() {
  const modal = document.getElementById('purchaseModal');
  if (modal) modal.classList.add('hidden');
}

async function purchaseCredits(packageId) {
  const status = document.getElementById('purchaseStatus');
  const cards = document.querySelectorAll('.package-card');

  // Disable all cards during purchase
  cards.forEach(card => card.style.pointerEvents = 'none');
  if (status) {
    status.classList.remove('hidden');
    status.textContent = '⏳ Zpracovávám...';
    status.className = 'purchase-status';
  }

  const token = await getAccessToken();
  if (!token) {
    if (status) { status.textContent = '❌ Přihlášení vypršelo.'; status.classList.add('error'); }
    cards.forEach(card => card.style.pointerEvents = '');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ packageId }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (status) { status.textContent = `❌ ${data.error || 'Nákup se nezdařil.'}`; status.classList.add('error'); }
      cards.forEach(card => card.style.pointerEvents = '');
      return;
    }

    // Success — update balance immediately
    if (data.newBalance !== undefined) {
      sessionStats.creditBalance = data.newBalance;
      updateCreditDisplay();
    }

    if (status) {
      status.textContent = `✅ ${data.message}`;
      status.classList.add('success');
    }

    // Re-enable cards and close modal after delay
    setTimeout(() => {
      cards.forEach(card => card.style.pointerEvents = '');
      closePurchaseModal();
      fetchCredits(); // sync from server
    }, 1500);

  } catch (error) {
    console.error('Purchase error:', error);
    if (status) { status.textContent = '❌ Chyba připojení.'; status.classList.add('error'); }
    cards.forEach(card => card.style.pointerEvents = '');
  }
}

// Close modal on overlay click
document.addEventListener('click', (event) => {
  const modal = document.getElementById('purchaseModal');
  if (event.target === modal) closePurchaseModal();
});

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

  // Strip internal context (card_draw XML, --- separators) from assistant messages
  if (role === 'assistant') {
    content = stripInternalContext(content);
  }

  // For assistant messages with card markers, render cards + narration segments
  if (role === 'assistant' && CARD_MARKER_REGEX.test(content)) {
    CARD_MARKER_REGEX.lastIndex = 0; // reset regex state
    const segments = content.split(CARD_MARKER_REGEX);
    const markers = [...content.matchAll(CARD_MARKER_REGEX)];

    // Text before first card (if any)
    const preText = segments[0].trim();
    if (preText) {
      const preBubble = document.createElement('div');
      preBubble.className = 'msg-bubble';
      preBubble.innerHTML = renderSimpleMarkdown(preText);
      messageDiv.appendChild(preBubble);
    }

    // Render card spread container
    if (markers.length > 0) {
      const cardContainer = document.createElement('div');
      cardContainer.className = 'card-reading-container';
      const spreadLabel = document.createElement('div');
      spreadLabel.className = 'card-spread-label';
      spreadLabel.textContent = '✦ Karty zdraví ✦';
      cardContainer.appendChild(spreadLabel);

      markers.forEach((match, index) => {
        const cardId = parseInt(match[1], 10);
        const cardName = match[2];
        const cardEl = renderHealthCard(cardId, cardName, index, true);
        cardContainer.appendChild(cardEl);
      });
      messageDiv.appendChild(cardContainer);
    }

    // Narration text segments (text after each card marker)
    // segments layout: [pre, id1, name1, text1, id2, name2, text2, ...]
    for (let i = 0; i < markers.length; i++) {
      const narrationIdx = 1 + i * 3 + 2; // skip id + name groups
      const narration = (segments[narrationIdx] || '').trim();
      if (narration) {
        const narDiv = document.createElement('div');
        narDiv.className = 'card-narration';
        narDiv.innerHTML = renderSimpleMarkdown(narration);
        messageDiv.appendChild(narDiv);
      }
    }
  } else {
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'msg-bubble';
    if (role === 'assistant') {
      bubbleDiv.innerHTML = renderSimpleMarkdown(content);
    } else {
      bubbleDiv.textContent = content; // textContent prevents XSS for user input
    }
    messageDiv.appendChild(bubbleDiv);
  }

  const timeDiv = document.createElement('div');
  timeDiv.className = 'msg-time';
  timeDiv.textContent = formatTime();

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

// ============ CARD HELPERS ============
function stripInternalContext(text) {
  // Remove <card_draw>...</card_draw> blocks (may span multiple lines)
  let cleaned = text.replace(/<card_draw>[\s\S]*?<\/card_draw>\s*/gi, '');
  // Remove standalone --- separators (horizontal rules the AI may add)
  cleaned = cleaned.replace(/^---\s*$/gm, '');
  // Collapse excessive blank lines (3+ newlines → 2)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
}

function stripCardMarkers(text) {
  return stripInternalContext(text).replace(/\[CARD:\d+:[^\]]+\]\n?/g, '');
}

function renderHealthCard(cardId, cardName, positionIndex, preFlipped) {
  const card = document.createElement('div');
  card.className = 'health-card';
  if (preFlipped) card.classList.add('card-flipped');

  const posLabel = document.createElement('div');
  posLabel.className = 'card-position';
  posLabel.textContent = CARD_POSITIONS[positionIndex] || '';
  card.appendChild(posLabel);

  const inner = document.createElement('div');
  inner.className = 'card-inner';

  // Front face (shown after flip)
  const front = document.createElement('div');
  front.className = 'card-front';

  const cardData = CARD_DATA[cardId];
  if (cardData && cardData.image) {
    const img = document.createElement('img');
    img.src = cardData.image;
    img.alt = cardName;
    img.loading = 'lazy';
    img.onerror = function() {
      this.style.display = 'none';
      this.nextElementSibling.style.display = 'flex';
    };
    front.appendChild(img);
  }

  // Fallback (always present, hidden by default unless image fails)
  const fallback = document.createElement('div');
  fallback.className = 'card-fallback';
  if (!cardData || !cardData.image) fallback.style.display = 'flex';
  const fallbackIcon = document.createElement('div');
  fallbackIcon.className = 'card-fallback-icon';
  fallbackIcon.textContent = '🃏';
  const fallbackName = document.createElement('div');
  fallbackName.className = 'card-fallback-name';
  fallbackName.textContent = cardName; // textContent = XSS safe
  fallback.appendChild(fallbackIcon);
  fallback.appendChild(fallbackName);
  front.appendChild(fallback);

  // Label overlay
  const label = document.createElement('div');
  label.className = 'card-label';
  const labelText = document.createElement('div');
  labelText.className = 'card-label-text';
  labelText.textContent = cardName; // textContent = XSS safe
  label.appendChild(labelText);
  front.appendChild(label);

  // Shimmer effect on reveal
  if (preFlipped) {
    const shimmer = document.createElement('div');
    shimmer.className = 'card-shimmer';
    front.appendChild(shimmer);
  }

  // Back face (shown initially)
  const back = document.createElement('div');
  back.className = 'card-back';

  inner.appendChild(front);
  inner.appendChild(back);
  card.appendChild(inner);

  return card;
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
  // Client-side credit pre-check (server is the authority, this avoids wasted requests)
  if (sessionStats.creditBalance !== null) {
    const requiredCredits = responseMode === 'audio' ? 6 : 1;
    if (sessionStats.creditBalance < requiredCredits) {
      hideTyping();
      if (responseMode === 'audio') {
        addMessage('assistant', '💎 Nemáte dostatek kreditů pro hlasovou odpověď (vyžaduje 6 kreditů: 1 text + 5 hlas). Přepněte na textový režim nebo si doplňte kredity.');
      } else {
        addMessage('assistant', '💎 Nemáte dostatek kreditů. Kontaktujte nás pro doplnění.');
      }
      isGenerating = false;
      document.getElementById('sendBtn').disabled = false;
      return;
    }
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

    if (response.status === 402) {
      const errData = await response.json().catch(() => ({}));
      addMessage('assistant', errData.error || '💎 Nemáte dostatek kreditů. Kontaktujte nás pro doplnění.');
      sessionStats.creditBalance = 0;
      updateCreditDisplay();
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
    let cardMarkerBuffer = '';
    let cardRevealCount = 0;
    let contextFilterBuffer = '';
    let insideCardDraw = false;

    // Filter out <card_draw>...</card_draw> and standalone --- from streaming text
    function filterInternalContext(text) {
      contextFilterBuffer += text;
      let output = '';

      while (contextFilterBuffer.length > 0) {
        if (insideCardDraw) {
          // Look for closing tag
          const closeIdx = contextFilterBuffer.indexOf('</card_draw>');
          if (closeIdx !== -1) {
            // Skip everything up to and including </card_draw>
            contextFilterBuffer = contextFilterBuffer.slice(closeIdx + '</card_draw>'.length);
            insideCardDraw = false;
          } else if (contextFilterBuffer.length > 200) {
            // Safety: if buffer gets too large without closing tag, flush it
            contextFilterBuffer = '';
            insideCardDraw = false;
          } else {
            // Wait for more data
            break;
          }
        } else {
          // Look for opening tag
          const openIdx = contextFilterBuffer.indexOf('<card_draw>');
          const partialIdx = contextFilterBuffer.indexOf('<');

          if (openIdx !== -1) {
            // Output text before the tag, skip the tag content
            output += contextFilterBuffer.slice(0, openIdx);
            contextFilterBuffer = contextFilterBuffer.slice(openIdx + '<card_draw>'.length);
            insideCardDraw = true;
          } else if (partialIdx !== -1) {
            // Possible partial tag at end — check if it's a prefix of '<card_draw>'
            const tail = contextFilterBuffer.slice(partialIdx);
            if ('<card_draw>'.startsWith(tail)) {
              output += contextFilterBuffer.slice(0, partialIdx);
              contextFilterBuffer = contextFilterBuffer.slice(partialIdx);
              break;
            }
            // Not a prefix of card_draw — safe to flush
            output += contextFilterBuffer;
            contextFilterBuffer = '';
          } else {
            // No tag found — all text is safe
            output += contextFilterBuffer;
            contextFilterBuffer = '';
          }
        }
      }

      // Strip standalone --- lines from the output
      output = output.replace(/^---\s*$/gm, '');
      // Collapse 3+ newlines to 2
      output = output.replace(/\n{3,}/g, '\n\n');
      return output;
    }

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
            // Filter out internal context before processing card markers
            const filteredText = filterInternalContext(newText);
            if (!filteredText) continue;

            // Card marker lookahead buffer
            cardMarkerBuffer += filteredText;
            // Process the buffer for complete markers or safe text
            let safeText = '';
            while (cardMarkerBuffer.length > 0) {
              const bracketIdx = cardMarkerBuffer.indexOf('[');
              if (bracketIdx === -1) {
                // No bracket — all text is safe to render
                safeText += cardMarkerBuffer;
                cardMarkerBuffer = '';
              } else if (bracketIdx > 0) {
                // Text before the bracket is safe
                safeText += cardMarkerBuffer.slice(0, bracketIdx);
                cardMarkerBuffer = cardMarkerBuffer.slice(bracketIdx);
              } else {
                // Buffer starts with '['
                const closeBracketIdx = cardMarkerBuffer.indexOf(']');
                if (closeBracketIdx === -1) {
                  // Incomplete — wait for more data (unless buffer is huge)
                  if (cardMarkerBuffer.length > 60) {
                    // Not a marker, flush as text
                    safeText += cardMarkerBuffer;
                    cardMarkerBuffer = '';
                  }
                  break;
                }
                // Check if it's a card marker
                const candidate = cardMarkerBuffer.slice(0, closeBracketIdx + 1);
                const cardMatch = candidate.match(/^\[CARD:(\d+):([^\]]+)\]$/);
                if (cardMatch) {
                  const cardId = parseInt(cardMatch[1], 10);
                  const cardName = cardMatch[2];
                  // Flush any pending safe text first
                  if (safeText) {
                    typewriterAppend(safeText);
                    safeText = '';
                  }
                  // Flush typewriter before injecting card
                  typewriterFlush();
                  // Render the card component
                  const posIdx = cardRevealCount++;
                  if (posIdx === 0) {
                    // Create card container before first card
                    const cardContainer = document.createElement('div');
                    cardContainer.className = 'card-reading-container';
                    cardContainer.id = 'cardSpread-' + Date.now();
                    const spreadLabel = document.createElement('div');
                    spreadLabel.className = 'card-spread-label';
                    spreadLabel.textContent = '✦ Karty zdraví ✦';
                    cardContainer.appendChild(spreadLabel);
                    const timeEl = messageDiv.querySelector('.msg-time');
                    messageDiv.insertBefore(cardContainer, timeEl);
                  }
                  const cardContainer = messageDiv.querySelector('.card-reading-container');
                  const cardEl = renderHealthCard(cardId, cardName, posIdx, false);
                  cardContainer.appendChild(cardEl);
                  // Animate flip after delay
                  setTimeout(() => {
                    cardEl.classList.add('card-flipped');
                  }, 600 + posIdx * 400);
                  // Create new text bubble for narration after the card container
                  const newBubble = document.createElement('div');
                  newBubble.className = 'card-narration streaming';
                  const timeEl2 = messageDiv.querySelector('.msg-time');
                  messageDiv.insertBefore(newBubble, timeEl2);
                  typewriterState.bubbleEl = newBubble;
                  typewriterState.rendered = '';
                  typewriterState.buffer = '';
                } else {
                  // Not a card marker — flush the bracketed text
                  safeText += candidate;
                }
                cardMarkerBuffer = cardMarkerBuffer.slice(closeBracketIdx + 1);
              }
            }
            if (safeText) {
              typewriterAppend(safeText);
            }
          }
        } catch (parseError) { /* skip */ }
      }
    }

    // Flush any remaining context filter buffer
    if (contextFilterBuffer && !insideCardDraw) {
      const remainingFiltered = contextFilterBuffer.replace(/^---\s*$/gm, '').replace(/\n{3,}/g, '\n\n');
      if (remainingFiltered.trim()) {
        cardMarkerBuffer += remainingFiltered;
      }
      contextFilterBuffer = '';
    }
    // Flush any remaining card marker buffer as plain text
    if (cardMarkerBuffer) {
      typewriterAppend(cardMarkerBuffer);
      cardMarkerBuffer = '';
    }
    typewriterFlush();

    if (assistantText) {
      conversationHistory.push({ role: 'assistant', content: assistantText });
      sessionStats.totalInputTokens += msgInputTokens;
      sessionStats.totalOutputTokens += msgOutputTokens;
      sessionStats.messageCount++;

      // Auto-title on first message
      if (sessionStats.messageCount === 1) {
        autoTitleConversation(userText);
      }

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
          const ttsText = stripCardMarkers(assistantText);
          await generateAudio(ttsText, audioContainer);
          sessionStats.totalTtsChars += ttsText.length;
          const costDiv = messageDiv.querySelector('.msg-cost');
          if (costDiv) {
            const ttsSpan = document.createElement('span');
            ttsSpan.textContent = `🔊 ${assistantText.length.toLocaleString('cs-CZ')} znaků`;
            costDiv.appendChild(ttsSpan);
          }
        }
      }

      // Optimistic credit update — show deducted balance immediately
      if (sessionStats.creditBalance !== null) {
        sessionStats.creditBalance = Math.max(0, sessionStats.creditBalance - 1);
        updateCreditDisplay();
      }

      // Refresh credits from server (eventual consistency)
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

    if (response.status === 402) {
      container.innerHTML = '<div class="audio-loading" style="color:#f59e0b">💎 Nedostatek kreditů pro hlasovou odpověď (5 kreditů)</div>';
      sessionStats.creditBalance = Math.max(0, (sessionStats.creditBalance || 0));
      updateCreditDisplay();
      fetchCredits();
      return;
    }

    if (!response.ok) {
      container.innerHTML = '<div class="audio-loading" style="color:#ef4444">❌ Hlasová odpověď není dostupná</div>';
      return;
    }

    const audioBlob = await response.blob();

    // Optimistic credit update for TTS (5 credits)
    if (sessionStats.creditBalance !== null) {
      sessionStats.creditBalance = Math.max(0, sessionStats.creditBalance - 5);
      updateCreditDisplay();
    }
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
window.openPurchaseModal = openPurchaseModal;
window.closePurchaseModal = closePurchaseModal;
window.purchaseCredits = purchaseCredits;

initAuth();
