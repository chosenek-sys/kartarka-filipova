'use strict';

// ============ CONFIG ============
const API_BASE = 'https://ai-api-amber.vercel.app';
const SUPABASE_URL = 'https://dmtxfbzfbikynklkvjnw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_eOjnyehEY92gd_u6XhQZqA_7qJLWtT-';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let responseMode = 'text';
let modeLockedForConversation = false;
let conversationHistory = [];
let isGenerating = false;
let currentConversationId = null;
let isAdmin = false;

// ============ HEALTH CARD DATA ============
const CARD_IMAGE_BASE = 'images/karty_zdravi/';
const CARD_DATA = {
  1: { name: 'Anorexie', image: CARD_IMAGE_BASE + '0.webp' },
  2: { name: 'Astma, dýchání', image: CARD_IMAGE_BASE + '1.webp' },
  3: { name: 'Bolesti', image: CARD_IMAGE_BASE + '2.webp' },
  4: { name: 'Děloha', image: CARD_IMAGE_BASE + '3.webp' },
  5: { name: 'Dětské nemoci', image: CARD_IMAGE_BASE + '4.webp' },
  6: { name: 'Chrápání', image: CARD_IMAGE_BASE + '5.webp' },
  7: { name: 'Chudokrevnost', image: CARD_IMAGE_BASE + '6.webp' },
  8: { name: 'Imunitní systém', image: CARD_IMAGE_BASE + '7.webp' },
  9: { name: 'Infarkt', image: CARD_IMAGE_BASE + '8.webp' },
  10: { name: 'Játra', image: CARD_IMAGE_BASE + '9.webp' },
  11: { name: 'Jícen', image: CARD_IMAGE_BASE + '10.webp' },
  12: { name: 'Klouby', image: CARD_IMAGE_BASE + '11.webp' },
  13: { name: 'Kolena', image: CARD_IMAGE_BASE + '12.webp' },
  14: { name: 'Konečník', image: CARD_IMAGE_BASE + '13.webp' },
  15: { name: 'Krev', image: CARD_IMAGE_BASE + '14.webp' },
  16: { name: 'Křeče', image: CARD_IMAGE_BASE + '15.webp' },
  17: { name: 'Kůže', image: CARD_IMAGE_BASE + '16.webp' },
  18: { name: 'Kvasinky', image: CARD_IMAGE_BASE + '17.webp' },
  19: { name: 'Ledviny', image: CARD_IMAGE_BASE + '18.webp' },
  20: { name: 'Lokty', image: CARD_IMAGE_BASE + '19.webp' },
  21: { name: 'Mandle', image: CARD_IMAGE_BASE + '20.webp' },
  22: { name: 'Močové cesty', image: CARD_IMAGE_BASE + '21.webp' },
  23: { name: 'Cukrovka', image: CARD_IMAGE_BASE + '22.webp' },
  24: { name: 'Mozková mrtvice', image: CARD_IMAGE_BASE + '23.webp' },
  25: { name: 'Nadváha', image: CARD_IMAGE_BASE + '24.webp' },
  26: { name: 'Nehty', image: CARD_IMAGE_BASE + '25.webp' },
  27: { name: 'Nechuť k jídlu', image: CARD_IMAGE_BASE + '26.webp' },
  28: { name: 'Nohy', image: CARD_IMAGE_BASE + '27.webp' },
  29: { name: 'Oči', image: CARD_IMAGE_BASE + '28.webp' },
  30: { name: 'Pálení žáhy', image: CARD_IMAGE_BASE + '29.webp' },
  31: { name: 'Plíce', image: CARD_IMAGE_BASE + '30.webp' },
  32: { name: 'Ploténky', image: CARD_IMAGE_BASE + '31.webp' },
  33: { name: 'Pohlavní orgány', image: CARD_IMAGE_BASE + '32.webp' },
  34: { name: 'Popraskané paty', image: CARD_IMAGE_BASE + '33.webp' },
  35: { name: 'Prostata', image: CARD_IMAGE_BASE + '34.webp' },
  36: { name: 'Rakovina', image: CARD_IMAGE_BASE + '35.webp' },
  37: { name: 'Revma', image: CARD_IMAGE_BASE + '36.webp' },
  38: { name: 'Ruce', image: CARD_IMAGE_BASE + '37.webp' },
  39: { name: 'Slepé střevo', image: CARD_IMAGE_BASE + '38.webp' },
  40: { name: 'Slezina', image: CARD_IMAGE_BASE + '39.webp' },
  41: { name: 'Slinivka', image: CARD_IMAGE_BASE + '40.webp' },
  42: { name: 'Srdce', image: CARD_IMAGE_BASE + '41.webp' },
  43: { name: 'Střevo', image: CARD_IMAGE_BASE + '42.webp' },
  44: { name: 'Štítná žláza', image: CARD_IMAGE_BASE + '43.webp' },
  45: { name: 'Uši', image: CARD_IMAGE_BASE + '44.webp' },
  46: { name: 'Úraz / Zranění', image: CARD_IMAGE_BASE + '45.webp' },
  47: { name: 'Vajíčka', image: CARD_IMAGE_BASE + '46.webp' },
  48: { name: 'Vlasy / Plešatost', image: CARD_IMAGE_BASE + '47.webp' },
  49: { name: 'Vrozené vady', image: CARD_IMAGE_BASE + '48.webp' },
  50: { name: 'Záda / Páteř', image: CARD_IMAGE_BASE + '49.webp' },
  51: { name: 'Závislost', image: CARD_IMAGE_BASE + '52.webp' },
  52: { name: 'Zuby', image: CARD_IMAGE_BASE + '53.webp' },
  53: { name: 'Žaludek', image: CARD_IMAGE_BASE + '57.webp' },
  54: { name: 'Žíly a žilní systém', image: CARD_IMAGE_BASE + '55.webp' },
  55: { name: 'Žlučník', image: CARD_IMAGE_BASE + '56.webp' },
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
// Supports both old format [CARD:N:name] and new [CARD:deck:N:name]
const CARD_MARKER_REGEX = /\[CARD:(?:(health|magic):)?(\d+):([^\]]+)\]/g;

// Magic map card images — hosted on GitHub Pages alongside health cards
const MAGIC_MAP_IMAGE_BASE = 'images/karty_mapy/';
const MAGIC_MAP_DATA = {
  1: { name: 'Sběratelka kostí', image: MAGIC_MAP_IMAGE_BASE + '1.jpg' },
  2: { name: 'Vlídná zahradnice', image: MAGIC_MAP_IMAGE_BASE + '2.jpg' },
  3: { name: 'Čaroděj vnímavosti', image: MAGIC_MAP_IMAGE_BASE + '3.jpg' },
  4: { name: 'Duch místa', image: MAGIC_MAP_IMAGE_BASE + '4.jpg' },
  5: { name: 'Skřítci', image: MAGIC_MAP_IMAGE_BASE + '5.jpg' },
  6: { name: 'Hora', image: MAGIC_MAP_IMAGE_BASE + '6.jpg' },
  7: { name: 'Do neznáma', image: MAGIC_MAP_IMAGE_BASE + '7.jpg' },
  8: { name: 'Setkání', image: MAGIC_MAP_IMAGE_BASE + '8.jpg' },
  9: { name: 'Bouře', image: MAGIC_MAP_IMAGE_BASE + '9.jpg' },
  10: { name: 'Kamenité dno', image: MAGIC_MAP_IMAGE_BASE + '10.jpg' },
  11: { name: 'Získání rovnováhy', image: MAGIC_MAP_IMAGE_BASE + '11.jpg' },
  12: { name: 'Pomalu, ale jistě', image: MAGIC_MAP_IMAGE_BASE + '12.jpg' },
  13: { name: 'Samota', image: MAGIC_MAP_IMAGE_BASE + '13.jpg' },
  14: { name: 'Svézt se na vlně', image: MAGIC_MAP_IMAGE_BASE + '14.jpg' },
  15: { name: 'Cirkus jedné manéže', image: MAGIC_MAP_IMAGE_BASE + '15.jpg' },
  16: { name: 'Záchrana', image: MAGIC_MAP_IMAGE_BASE + '16.jpg' },
  17: { name: 'Země duchů', image: MAGIC_MAP_IMAGE_BASE + '17.jpg' },
  18: { name: 'Zázračný pramen', image: MAGIC_MAP_IMAGE_BASE + '18.jpg' },
  19: { name: 'Dračí doupě', image: MAGIC_MAP_IMAGE_BASE + '19.jpg' },
  20: { name: 'Let', image: MAGIC_MAP_IMAGE_BASE + '20.jpg' },
  21: { name: 'Pole snů', image: MAGIC_MAP_IMAGE_BASE + '21.jpg' },
  22: { name: 'Úmysl', image: MAGIC_MAP_IMAGE_BASE + '22.jpg' },
  23: { name: 'Palác ze zlata', image: MAGIC_MAP_IMAGE_BASE + '23.jpg' },
  24: { name: 'Uvízlý v blátě', image: MAGIC_MAP_IMAGE_BASE + '24.jpg' },
  25: { name: 'Proměna', image: MAGIC_MAP_IMAGE_BASE + '25.jpg' },
  26: { name: 'Krutý mráz', image: MAGIC_MAP_IMAGE_BASE + '26.jpg' },
  27: { name: 'Domov', image: MAGIC_MAP_IMAGE_BASE + '27.jpg' },
  28: { name: 'Pohyb', image: MAGIC_MAP_IMAGE_BASE + '28.jpg' },
  29: { name: 'Vstup do života', image: MAGIC_MAP_IMAGE_BASE + '29.jpg' },
  30: { name: 'Volba', image: MAGIC_MAP_IMAGE_BASE + '30.jpg' },
  31: { name: 'Vypráhlá poušť', image: MAGIC_MAP_IMAGE_BASE + '31.jpg' },
  32: { name: 'Zázračná modlitba', image: MAGIC_MAP_IMAGE_BASE + '32.jpg' },
  33: { name: 'Vrcholky štěstí', image: MAGIC_MAP_IMAGE_BASE + '33.jpg' },
  34: { name: 'Jiskra', image: MAGIC_MAP_IMAGE_BASE + '34.jpg' },
  35: { name: 'Vzdělání', image: MAGIC_MAP_IMAGE_BASE + '35.jpg' },
  36: { name: 'Závazek', image: MAGIC_MAP_IMAGE_BASE + '36.jpg' },
  37: { name: 'Úklid domu', image: MAGIC_MAP_IMAGE_BASE + '37.jpg' },
  38: { name: 'Vyléčit zranění', image: MAGIC_MAP_IMAGE_BASE + '38.jpg' },
  39: { name: 'Chránit poklad', image: MAGIC_MAP_IMAGE_BASE + '39.jpg' },
  40: { name: 'Následuj vůdce', image: MAGIC_MAP_IMAGE_BASE + '40.jpg' },
  41: { name: 'Nečekaní hosté', image: MAGIC_MAP_IMAGE_BASE + '41.jpg' },
  42: { name: 'Otevřeno dokořán', image: MAGIC_MAP_IMAGE_BASE + '42.jpg' },
  43: { name: 'Detaily, detaily', image: MAGIC_MAP_IMAGE_BASE + '43.jpg' },
  44: { name: 'Síla', image: MAGIC_MAP_IMAGE_BASE + '44.jpg' },
  45: { name: 'Smutné objetí', image: MAGIC_MAP_IMAGE_BASE + '45.jpg' },
  46: { name: 'Rozchod', image: MAGIC_MAP_IMAGE_BASE + '46.jpg' },
  47: { name: 'Posvátné jezírko', image: MAGIC_MAP_IMAGE_BASE + '47.jpg' },
  48: { name: 'Studna přání', image: MAGIC_MAP_IMAGE_BASE + '48.jpg' },
  49: { name: 'Amulet', image: MAGIC_MAP_IMAGE_BASE + '49.jpg' },
  50: { name: 'Kompas', image: MAGIC_MAP_IMAGE_BASE + '50.jpg' },
  51: { name: 'Měsíční svit', image: MAGIC_MAP_IMAGE_BASE + '51.jpg' },
  52: { name: 'Magická hybná síla', image: MAGIC_MAP_IMAGE_BASE + '52.jpg' },
  53: { name: 'Naslouchání', image: MAGIC_MAP_IMAGE_BASE + '53.jpg' },
  54: { name: 'Povzbuzení', image: MAGIC_MAP_IMAGE_BASE + '54.jpg' },
};

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
  if (session && !chatInitialized) {
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
  const firstName = document.getElementById('authFirstName').value.trim();
  const lastName = document.getElementById('authLastName')?.value.trim() || '';
  const dob = document.getElementById('authDob')?.value || '';
  const gdprConsent = document.getElementById('authGdpr')?.checked || false;
  const errorEl = document.getElementById('authError');
  errorEl.textContent = '';
  errorEl.style.color = '';

  if (!firstName) {
    errorEl.textContent = 'Vyplňte prosím své křestní jméno.';
    return;
  }
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
  if (dob && !gdprConsent) {
    errorEl.textContent = 'Pro zpracování data narození je nutný souhlas s GDPR.';
    return;
  }

  setAuthLoading(true);
  const displayName = lastName ? `${firstName} ${lastName}` : firstName;
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        first_name: firstName,
        last_name: lastName || null,
        date_of_birth: dob || null,
      },
    },
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
    errorEl.textContent = 'Tento email je již zaregistrován. Zkuste se přihlásit.';
  } else {
    errorEl.style.color = '#22c55e';
    errorEl.textContent = 'Registrace úspěšná! Zkontrolujte email pro potvrzení.';

    // Disable form to prevent re-submission
    document.getElementById('authFirstName').disabled = true;
    const lastNameEl = document.getElementById('authLastName');
    if (lastNameEl) lastNameEl.disabled = true;
    const dobEl = document.getElementById('authDob');
    if (dobEl) dobEl.disabled = true;
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
  document.getElementById('authFirstName').disabled = false;
  const lastNameEl = document.getElementById('authLastName');
  if (lastNameEl) lastNameEl.disabled = false;
  const dobEl = document.getElementById('authDob');
  if (dobEl) dobEl.disabled = false;
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

// ============ MOBILE SIDEBAR ============
function toggleSidebar() {
  const sidebar = document.querySelector('.chat-sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!sidebar || !overlay) return;
  const isOpen = sidebar.classList.toggle('open');
  if (isOpen) {
    overlay.classList.add('active');
  } else {
    overlay.classList.remove('active');
  }
}

function closeSidebarIfMobile() {
  if (window.innerWidth <= 768) {
    const sidebar = document.querySelector('.chat-sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
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

  // Admin detection
  isAdmin = user.app_metadata?.role === 'admin';
  const adminLink = document.getElementById('adminLink');
  if (adminLink) {
    adminLink.classList.toggle('hidden', !isAdmin);
  }

  // Start fresh with welcome screen
  startNewConversation();

  fetchCredits();
  loadSubscription();
  loadConversationList();

  // Check if returning from Stripe checkout
  handlePurchaseReturn();
  handleSubscriptionReturn();

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
  closeSidebarIfMobile();
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
        if (msg.role === 'assistant') {
          if (msg.audio_path) {
            const audioContainer = document.createElement('div');
            audioContainer.id = 'audioContainer-' + msg.id;
            const timeEl = msgDiv.querySelector('.msg-time');
            msgDiv.insertBefore(audioContainer, timeEl);
            loadStoredAudio(audioContainer, msg.audio_path);
            msgDiv.classList.add('voice-only');
          }
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
  closeSidebarIfMobile();
  currentConversationId = generateUUID();
  conversationHistory = [];
  unlockMode();
  setMode('text');
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
      <p>Jsem AI asistentka inspirovaná Zdenkou Filipovou. Mohu vám poskytnout duchovní vedení, kartové výklady a podporu na vaší cestě.</p>

      <div class="welcome-section">
        <div class="welcome-section-title">🔮 Zeptejte se na cokoliv</div>
        <div class="suggestions">
          <div class="suggestion" onclick="sendSuggestion(this)">Jak mohu změnit svůj život?</div>
          <div class="suggestion" onclick="sendSuggestion(this)">Potřebuji radu ohledně vztahu</div>
          <div class="suggestion" onclick="sendSuggestion(this)">Cítím se ztracená, co mi poradíte?</div>
          <div class="suggestion" onclick="sendSuggestion(this)">Jak najít vnitřní klid?</div>
        </div>
      </div>

      <div class="welcome-section">
        <div class="welcome-section-title">🃏 Kartové výklady</div>
        <div class="suggestions card-suggestions">
          <div class="suggestion suggestion-card" onclick="sendSuggestion(this)">🗺️ Vylož mi kouzelné mapy</div>
          <div class="suggestion suggestion-card" onclick="sendSuggestion(this)">💊 Vylož mi karty zdraví</div>
          <div class="suggestion suggestion-card" onclick="sendSuggestion(this)">🃏 Vylož mi karty</div>
        </div>
      </div>
    </div>`;
}

// ============ SESSION TRACKING ============
const sessionStats = {
  totalInputTokens: 0, totalOutputTokens: 0, totalTtsChars: 0, messageCount: 0,
  creditBalance: null, totalEarned: null,
};

function updateCreditDisplay() {
  const el = document.getElementById('userCredits');
  if (!el || sessionStats.creditBalance === null) return;
  const balance = sessionStats.creditBalance;
  el.textContent = `💎 ${balance}`;
  // Warn/danger thresholds based on initial 30 credits
  el.classList.toggle('warn', balance <= 7 && balance > 3);
  el.classList.toggle('danger', balance <= 3);
}

function updateFreeCreditsGate() {
  const isFreeOnly = sessionStats.totalEarned !== null && sessionStats.totalEarned <= 10;
  const textBtn = document.getElementById('toggleText');
  if (textBtn) {
    if (isFreeOnly && responseMode !== 'text') {
      textBtn.disabled = true;
      textBtn.title = 'Pro textové zprávy si prosím zakupte kredity';
    } else if (isFreeOnly && responseMode === 'text') {
      setMode('audio');
      textBtn.disabled = true;
      textBtn.title = 'Pro textové zprávy si prosím zakupte kredity';
    } else {
      textBtn.disabled = false;
      textBtn.title = '';
    }
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
      sessionStats.totalEarned = data.userCredits.total_earned;
      updateCreditDisplay();
      updateFreeCreditsGate();
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
    // Refresh subscription status in modal
    updateSubscriptionUI();
  }
}

function closePurchaseModal() {
  const modal = document.getElementById('purchaseModal');
  if (modal) modal.classList.add('hidden');
}

function switchPurchaseTab(tab) {
  const subTab = document.getElementById('tabSubscription');
  const oneTimeTab = document.getElementById('tabOneTime');
  const subContent = document.getElementById('tabContentSubscription');
  const oneTimeContent = document.getElementById('tabContentOnetime');
  if (!subTab || !oneTimeTab || !subContent || !oneTimeContent) return;

  if (tab === 'subscription') {
    subTab.classList.add('active');
    oneTimeTab.classList.remove('active');
    subContent.classList.remove('hidden');
    oneTimeContent.classList.add('hidden');
  } else {
    subTab.classList.remove('active');
    oneTimeTab.classList.add('active');
    subContent.classList.add('hidden');
    oneTimeContent.classList.remove('hidden');
  }
}

async function purchaseCredits(packageId) {
  const status = document.getElementById('purchaseStatus');
  const cards = document.querySelectorAll('.package-card');

  // Disable all cards during redirect
  cards.forEach(card => card.style.pointerEvents = 'none');
  if (status) {
    status.classList.remove('hidden');
    status.textContent = '⏳ Přesměrování na platbu...';
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

    // Redirect to Stripe Checkout
    if (data.checkoutUrl) {
      sessionStorage.setItem('prePurchaseBalance', String(sessionStats.creditBalance));
      window.location.href = data.checkoutUrl;
    } else {
      if (status) { status.textContent = '❌ Chyba: chybí odkaz na platbu.'; status.classList.add('error'); }
      cards.forEach(card => card.style.pointerEvents = '');
    }

  } catch (error) {
    console.error('Purchase error:', error);
    if (status) { status.textContent = '❌ Chyba připojení.'; status.classList.add('error'); }
    cards.forEach(card => card.style.pointerEvents = '');
  }
}

// Handle return from Stripe Checkout
function handlePurchaseReturn() {
  const params = new URLSearchParams(window.location.search);
  const purchaseResult = params.get('purchase');
  if (!purchaseResult) return;

  // Clean URL params without reload
  const cleanUrl = window.location.pathname;
  window.history.replaceState({}, '', cleanUrl);

  if (purchaseResult === 'success') {
    showPurchaseToast('⏳ Zpracovávám platbu...', 'processing');
    // Read balance saved before Stripe redirect
    const previousBalance = parseInt(sessionStorage.getItem('prePurchaseBalance') || '0', 10);
    sessionStorage.removeItem('prePurchaseBalance');
    let attempts = 0;
    const maxAttempts = 5;
    const pollInterval = setInterval(async () => {
      attempts++;
      await fetchCredits();
      if (sessionStats.creditBalance > previousBalance || attempts >= maxAttempts) {
        clearInterval(pollInterval);
        if (sessionStats.creditBalance > previousBalance) {
          const added = sessionStats.creditBalance - previousBalance;
          showPurchaseToast(`✅ Přidáno ${added} kreditů! Děkujeme za nákup.`, 'success');
        } else {
          showPurchaseToast('✅ Platba přijata! Kredity budou přidány za okamžik.', 'success');
        }
      }
    }, 2000);
  } else if (purchaseResult === 'cancelled') {
    showPurchaseToast('Platba byla zrušena.', 'cancelled');
  }
}

// Handle return from Stripe Subscription Checkout
function handleSubscriptionReturn() {
  const params = new URLSearchParams(window.location.search);
  const subResult = params.get('subscription');
  if (!subResult) return;

  // Clean URL params without reload
  const cleanUrl = window.location.pathname;
  window.history.replaceState({}, '', cleanUrl);

  if (subResult === 'success') {
    showPurchaseToast('⏳ Zpracovávám předplatné...', 'processing');
    const previousBalance = parseInt(sessionStorage.getItem('prePurchaseBalance') || '0', 10);
    sessionStorage.removeItem('prePurchaseBalance');
    let attempts = 0;
    const maxAttempts = 8;
    const pollInterval = setInterval(async () => {
      attempts++;
      await fetchCredits();
      await loadSubscription();
      if (sessionStats.creditBalance > previousBalance || attempts >= maxAttempts) {
        clearInterval(pollInterval);
        if (sessionStats.creditBalance > previousBalance) {
          const added = sessionStats.creditBalance - previousBalance;
          showPurchaseToast(`✅ Předplatné aktivováno! Přidáno ${added} kreditů.`, 'success');
        } else {
          showPurchaseToast('✅ Předplatné aktivováno! Kredity budou přidány za okamžik.', 'success');
        }
      }
    }, 2500);
  } else if (subResult === 'cancelled') {
    showPurchaseToast('Objednávka předplatného byla zrušena.', 'cancelled');
  }
}

// Show a floating toast notification for purchase status
function showPurchaseToast(message, type) {
  // Remove existing toast
  const existing = document.getElementById('purchaseToast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'purchaseToast';
  toast.className = `purchase-toast purchase-toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Auto-remove after delay (longer for processing state)
  if (type !== 'processing') {
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 500); }, 4000);
  }
}

// Close modal on overlay click
document.addEventListener('click', (event) => {
  const modal = document.getElementById('purchaseModal');
  if (event.target === modal) closePurchaseModal();
});

// ============ SUBSCRIPTIONS ============
let cachedSubscription = null;

const TIER_LABELS = {
  basic: '⭐ Základní',
  guide: '⭐ Průvodce',
  master: '👑 Mistr',
};

async function loadSubscription() {
  const token = await getAccessToken();
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE}/api/subscription`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) return;
    const data = await response.json();
    cachedSubscription = data.subscription || null;
    updateSubscriptionBadge();
    updateSubscriptionUI();
  } catch (err) {
    console.error('Subscription fetch error:', err);
  }
}

function updateSubscriptionBadge() {
  const badge = document.getElementById('subscriptionBadge');
  if (!badge) return;

  if (cachedSubscription && cachedSubscription.status === 'active') {
    badge.textContent = TIER_LABELS[cachedSubscription.tier] || '⭐ Předplatné';
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function updateSubscriptionUI() {
  const banner = document.getElementById('activeSubBanner');
  const tierEl = document.getElementById('activeSubTier');
  const statusEl = document.getElementById('activeSubStatus');
  const subtitle = document.getElementById('subSubtitle');
  const cards = document.querySelectorAll('.sub-card');

  // Guard for cached HTML without subscription elements
  if (!banner) return;

  if (cachedSubscription && (cachedSubscription.status === 'active' || cachedSubscription.status === 'past_due')) {
    banner.classList.remove('hidden');
    if (tierEl) tierEl.textContent = TIER_LABELS[cachedSubscription.tier] || cachedSubscription.tier;

    // Build status + renewal info
    if (statusEl) {
      const periodEnd = cachedSubscription.current_period_end
        ? new Date(cachedSubscription.current_period_end).toLocaleDateString('cs-CZ')
        : '';

      if (cachedSubscription.cancel_at_period_end) {
        statusEl.textContent = `Zrušeno`;
        statusEl.className = 'active-sub-status canceling';
        // Add detail about when it expires
        let detailEl = document.getElementById('activeSubDetail');
        if (!detailEl) {
          detailEl = document.createElement('span');
          detailEl.id = 'activeSubDetail';
          detailEl.className = 'active-sub-detail';
          statusEl.parentElement.appendChild(detailEl);
        }
        detailEl.textContent = periodEnd ? `Platné do ${periodEnd}` : '';
      } else if (cachedSubscription.status === 'past_due') {
        statusEl.textContent = 'Platba po splatnosti';
        statusEl.className = 'active-sub-status past-due';
        removeSubDetail();
      } else {
        statusEl.textContent = 'Aktivní';
        statusEl.className = 'active-sub-status active';
        // Show next renewal date
        let detailEl = document.getElementById('activeSubDetail');
        if (!detailEl) {
          detailEl = document.createElement('span');
          detailEl.id = 'activeSubDetail';
          detailEl.className = 'active-sub-detail';
          statusEl.parentElement.appendChild(detailEl);
        }
        detailEl.textContent = periodEnd ? `Další obnova: ${periodEnd}` : '';
      }
    }


    if (subtitle) {
      if (cachedSubscription.cancel_at_period_end) {
        subtitle.textContent = 'P\u0159edplatn\u00e9 bylo zru\u0161eno. Klikn\u011bte na \u00farove\u0148 pro obnoven\u00ed.';
      } else {
        subtitle.textContent = 'Klikn\u011bte na jinou \u00farove\u0148 pro zm\u011bnu p\u0159edplatn\u00e9ho.';
      }
    }

    // Highlight current tier card, but allow clicking OTHER tiers for upgrade/downgrade
    cards.forEach(card => {
      card.classList.remove('current-tier');
      card.style.pointerEvents = '';
      card.style.opacity = '';
    });
    const currentCard = document.getElementById(`subCard${capitalize(cachedSubscription.tier)}`);
    if (currentCard) {
      currentCard.classList.add('current-tier');
      currentCard.style.pointerEvents = 'none';
    }
  } else {
    banner.classList.add('hidden');
    removeSubDetail();
    if (subtitle) subtitle.textContent = 'Získejte kredity levněji s měsíčním předplatným';
    cards.forEach(card => {
      card.classList.remove('current-tier');
      card.style.pointerEvents = '';
      card.style.opacity = '';
    });
  }
}

function removeSubDetail() {
  const el = document.getElementById('activeSubDetail');
  if (el) el.remove();
}

function capitalize(str) {
  const map = { basic: 'Basic', guide: 'Guide', master: 'Master' };
  return map[str] || str.charAt(0).toUpperCase() + str.slice(1);
}

async function subscribeTier(tier) {
  // If user already has an active subscription, do a tier change instead
  if (cachedSubscription && (cachedSubscription.status === 'active' || cachedSubscription.status === 'past_due')) {
    return await changeTier(tier);
  }

  const status = document.getElementById('purchaseStatus');
  if (status) {
    status.classList.remove('hidden');
    status.textContent = '⏳ Přesměrování na platbu...';
    status.className = 'purchase-status';
  }

  const token = await getAccessToken();
  if (!token) {
    if (status) { status.textContent = '❌ Přihlášení vypršelo.'; status.classList.add('error'); }
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'subscribe', tier }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (status) { status.textContent = `❌ ${data.error || 'Nákup se nezdařil.'}`; status.classList.add('error'); }
      return;
    }

    if (data.checkoutUrl) {
      sessionStorage.setItem('prePurchaseBalance', String(sessionStats.creditBalance));
      window.location.href = data.checkoutUrl;
    } else {
      if (status) { status.textContent = '❌ Chyba: chybí odkaz na platbu.'; status.classList.add('error'); }
    }
  } catch (error) {
    console.error('Subscribe error:', error);
    if (status) { status.textContent = '❌ Chyba připojení.'; status.classList.add('error'); }
  }
}

async function changeTier(newTier) {
  const tierLabels = { basic: 'Z\u00e1kladn\u00ed', guide: 'Pr\u016fvodce', master: 'Mistr' };
  const tierLabel = tierLabels[newTier] || newTier;

  if (!confirm(`Chcete zm\u011bnit p\u0159edplatn\u00e9 na \u00farove\u0148 \u201e${tierLabel}\u201c? Zm\u011bna se projev\u00ed okam\u017eit\u011b.`)) {
    return;
  }

  const status = document.getElementById('purchaseStatus');
  if (status) {
    status.classList.remove('hidden');
    status.textContent = '\u23f3 M\u011bn\u00edm p\u0159edplatn\u00e9...';
    status.className = 'purchase-status';
  }

  const token = await getAccessToken();
  if (!token) {
    if (status) { status.textContent = '\u274c P\u0159ihl\u00e1\u0161en\u00ed vypr\u0161elo.'; status.classList.add('error'); }
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'change_tier', tier: newTier }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (status) { status.textContent = `\u274c ${data.error || 'Zm\u011bna se nezda\u0159ila.'}`; status.classList.add('error'); }
      return;
    }

    // Success - refresh subscription data and show toast
    if (status) { status.classList.add('hidden'); }
    showPurchaseToast(`\u2705 ${data.message || 'P\u0159edplatn\u00e9 zm\u011bn\u011bno!'}`, 'success');
    await loadSubscription();
    closePurchaseModal();
  } catch (error) {
    console.error('Change tier error:', error);
    if (status) { status.textContent = '\u274c Chyba p\u0159ipojen\u00ed.'; status.classList.add('error'); }
  }
}

async function openBillingPortal() {
  const status = document.getElementById('purchaseStatus');
  if (status) {
    status.classList.remove('hidden');
    status.textContent = '⏳ Otevírám správu předplatného...';
    status.className = 'purchase-status';
  }

  const token = await getAccessToken();
  if (!token) {
    if (status) { status.textContent = '❌ Přihlášení vypršelo.'; status.classList.add('error'); }
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'portal' }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (status) { status.textContent = `❌ ${data.error || 'Nepodařilo se otevřít správu.'}`; status.classList.add('error'); }
      return;
    }

    if (data.portalUrl) {
      window.location.href = data.portalUrl;
    }
  } catch (error) {
    console.error('Portal error:', error);
    if (status) { status.textContent = '❌ Chyba připojení.'; status.classList.add('error'); }
  }
}

// ============ RESPONSE MODE ============
function setMode(mode) {
  if (modeLockedForConversation) return;
  responseMode = mode;
  document.getElementById('toggleText').classList.toggle('active', mode === 'text');
  document.getElementById('toggleAudio').classList.toggle('active', mode === 'audio');
}

function lockMode() {
  modeLockedForConversation = true;
  const textBtn = document.getElementById('toggleText');
  const audioBtn = document.getElementById('toggleAudio');
  if (textBtn) { textBtn.disabled = true; textBtn.style.opacity = '0.5'; }
  if (audioBtn) { audioBtn.disabled = true; audioBtn.style.opacity = '0.5'; }
}

function unlockMode() {
  modeLockedForConversation = false;
  const textBtn = document.getElementById('toggleText');
  const audioBtn = document.getElementById('toggleAudio');
  if (textBtn) { textBtn.disabled = false; textBtn.style.opacity = ''; }
  if (audioBtn) { audioBtn.disabled = false; audioBtn.style.opacity = ''; }
  updateFreeCreditsGate();
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

    // Determine deck type from markers (default to health for backward compat)
    const deckType = markers[0]?.[1] || 'health';

    // Render card spread container
    if (markers.length > 0) {
      const cardContainer = document.createElement('div');
      cardContainer.className = 'card-reading-container';
      const spreadLabel = document.createElement('div');
      spreadLabel.className = 'card-spread-label';
      spreadLabel.textContent = deckType === 'magic'
        ? '✦ Kouzelné mapy ✦'
        : '✦ Karty zdraví ✦';
      cardContainer.appendChild(spreadLabel);

      markers.forEach((match, index) => {
        const cardId = parseInt(match[2], 10);
        const cardName = match[3];
        const matchDeck = match[1] || 'health';
        const cardEl = renderHealthCard(cardId, cardName, index, true, matchDeck);
        cardContainer.appendChild(cardEl);
      });
      messageDiv.appendChild(cardContainer);
    }

    // Narration text segments — regex has 3 capture groups: (deck?)(id)(name)
    // segments layout: [pre, deck1, id1, name1, text1, deck2, id2, name2, text2, ...]
    for (let i = 0; i < markers.length; i++) {
      const narrationIdx = 1 + i * 4 + 3; // skip deck + id + name groups
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
  let cleaned = text.replace(/<card_draw[^>]*>[\s\S]*?<\/card_draw>\s*/gi, '');
  // Remove <deck_choice>...</deck_choice> internal markers
  cleaned = cleaned.replace(/<deck_choice>(?:health|magic)<\/deck_choice>/g, '');
  // Remove standalone --- separators (horizontal rules the AI may add)
  cleaned = cleaned.replace(/^---\s*$/gm, '');
  // Collapse excessive blank lines (3+ newlines → 2)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
}

function stripCardMarkers(text) {
  return stripInternalContext(text).replace(/\[CARD:(?:(?:health|magic):)?\d+:[^\]]+\]\n?/g, '');
}

function renderHealthCard(cardId, cardName, positionIndex, preFlipped, deckType = 'health') {
  const card = document.createElement('div');
  card.className = 'health-card';
  if (deckType === 'magic') card.classList.add('magic-card');
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

  // Pick correct data source based on deck type
  const cardData = deckType === 'magic'
    ? (MAGIC_MAP_DATA[cardId] || null)
    : (CARD_DATA[cardId] || null);

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
  fallbackIcon.textContent = deckType === 'magic' ? '🗺️' : '🃏';
  const fallbackName = document.createElement('div');
  fallbackName.className = 'card-fallback-name';
  fallbackName.textContent = cardName;
  fallback.appendChild(fallbackIcon);
  fallback.appendChild(fallbackName);
  front.appendChild(fallback);

  // Label overlay
  const label = document.createElement('div');
  label.className = 'card-label';
  const labelText = document.createElement('div');
  labelText.className = 'card-label-text';
  labelText.textContent = cardName;
  label.appendChild(labelText);
  const tagline = document.createElement('div');
  tagline.className = 'card-tagline';
  tagline.textContent = 'Změň svůj život';
  label.appendChild(tagline);
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
  if (deckType === 'magic') back.classList.add('magic-back');

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
  if (!modeLockedForConversation) lockMode();

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
        responseMode: responseMode,
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
    let streamingDeckType = null;
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
      // Strip <deck_choice>...</deck_choice> markers
      output = output.replace(/<deck_choice>(?:health|magic)<\/deck_choice>/g, '');
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
                // Check if it's a card marker — supports [CARD:N:name] and [CARD:deck:N:name]
                const candidate = cardMarkerBuffer.slice(0, closeBracketIdx + 1);
                const cardMatch = candidate.match(/^\[CARD:(?:(health|magic):)?(\d+):([^\]]+)\]$/);
                if (cardMatch) {
                  const matchDeck = cardMatch[1] || 'health';
                  const cardId = parseInt(cardMatch[2], 10);
                  const cardName = cardMatch[3];
                  // Track the deck type for the first card (used for spread label)
                  if (streamingDeckType === null) streamingDeckType = matchDeck;
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
                    spreadLabel.textContent = matchDeck === 'magic'
                      ? '✦ Kouzelné mapy ✦'
                      : '✦ Karty zdraví ✦';
                    cardContainer.appendChild(spreadLabel);
                    const timeEl = messageDiv.querySelector('.msg-time');
                    messageDiv.insertBefore(cardContainer, timeEl);
                  }
                  const cardContainer = messageDiv.querySelector('.card-reading-container');
                  const cardEl = renderHealthCard(cardId, cardName, posIdx, false, matchDeck);
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

      // Per-message cost footer (admin-only)
      if (isAdmin && messageDiv && (msgInputTokens > 0 || msgOutputTokens > 0)) {
        const costDiv = document.createElement('div');
        costDiv.className = 'msg-cost';
        const totalTokens = msgInputTokens + msgOutputTokens;
        costDiv.innerHTML = `<span>🔤 ${totalTokens.toLocaleString('cs-CZ')} tokenů</span>`;
        const timeEl = messageDiv.querySelector('.msg-time');
        messageDiv.insertBefore(costDiv, timeEl);
        requestAnimationFrame(() => costDiv.classList.add('visible'));
      }

      // TTS — voice-only mode hides text after audio is ready
      if (responseMode === 'audio' && messageDiv) {
        const audioContainer = messageDiv.querySelector('[id^="audioContainer"]');
        if (audioContainer) {
          const ttsText = stripCardMarkers(assistantText);
          await generateAudio(ttsText, audioContainer);
          sessionStats.totalTtsChars += ttsText.length;
          messageDiv.classList.add('voice-only');
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
      body: JSON.stringify({ text, conversation_id: currentConversationId }),
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
    renderAudioPlayer(container, audio);

    fetchCredits();
  } catch (error) {
    console.error('TTS error:', error);
    container.innerHTML = '<div class="audio-loading" style="color:#ef4444">❌ Chyba při generování hlasu</div>';
  }
}

async function loadStoredAudio(container, audioPath) {
  container.innerHTML = '<div class="audio-loading"><div class="spinner"></div> Načítám audio...</div>';
  const token = await getAccessToken();
  try {
    const res = await fetch(`${API_BASE}/api/tts-url?path=${encodeURIComponent(audioPath)}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) {
      container.innerHTML = '<div class="audio-loading" style="color:#999">🔊 Audio již není dostupné</div>';
      return;
    }
    const { url } = await res.json();
    const audio = new Audio(url);
    renderAudioPlayer(container, audio);
  } catch (err) {
    console.error('Stored audio load error:', err);
    container.innerHTML = '<div class="audio-loading" style="color:#999">🔊 Chyba při načítání audia</div>';
  }
}

function renderAudioPlayer(container, audio) {
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
window.switchPurchaseTab = switchPurchaseTab;
window.subscribeTier = subscribeTier;
window.openBillingPortal = openBillingPortal;

initAuth();
