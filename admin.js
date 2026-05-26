'use strict';

// ============================================================
// Zdenka AI — Admin Panel JavaScript
// ============================================================

const API_BASE = 'https://ai-api-amber.vercel.app';
const SUPABASE_URL = 'https://dmtxfbzfbikynklkvjnw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_eOjnyehEY92gd_u6XhQZqA_7qJLWtT-';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State
let currentSession = null;
let currentPage = 1;
let selectedUserId = null;
let searchTimeout = null;

// ============================================================
// DOM Helpers
// ============================================================
const $ = (id) => document.getElementById(id);

function show(element) {
  element.classList.remove('hidden');
}

function hide(element) {
  element.classList.add('hidden');
}

function formatDate(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return date.toLocaleDateString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return date.toLocaleDateString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================
// API Calls
// ============================================================
async function getToken() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session?.access_token;
}

async function adminFetch(action, params = {}, options = {}) {
  const token = await getToken();
  if (!token) {
    throw new Error('No session');
  }

  const url = new URL(`${API_BASE}/api/admin`);
  url.searchParams.set('action', action);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  }

  const fetchOptions = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    ...options,
  };

  const response = await fetch(url.toString(), fetchOptions);

  if (response.status === 403) {
    throw new Error('FORBIDDEN');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

async function adminPost(action, body) {
  const token = await getToken();
  if (!token) {
    throw new Error('No session');
  }

  const url = new URL(`${API_BASE}/api/admin`);
  url.searchParams.set('action', action);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (response.status === 403) {
    throw new Error('FORBIDDEN');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================
// Auth
// ============================================================
async function handleAdminLogin() {
  const email = $('authEmail').value.trim();
  const password = $('authPassword').value;
  const errorEl = $('authError');

  if (!email || !password) {
    errorEl.textContent = 'Vyplňte email a heslo.';
    return;
  }

  errorEl.textContent = '';
  $('loginBtn').disabled = true;
  $('loginBtn').textContent = 'Přihlašování...';

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
      errorEl.textContent = 'Nesprávný email nebo heslo.';
      $('loginBtn').disabled = false;
      $('loginBtn').textContent = 'Přihlásit se';
      return;
    }

    currentSession = data.session;
    await checkAdminAccess();
  } catch (loginError) {
    errorEl.textContent = 'Chyba při přihlašování.';
    console.error('Login error:', loginError);
    $('loginBtn').disabled = false;
    $('loginBtn').textContent = 'Přihlásit se';
  }
}

async function handleAdminLogout() {
  await supabaseClient.auth.signOut();
  currentSession = null;
  selectedUserId = null;
  hide($('adminApp'));
  hide($('accessDenied'));
  hide($('loadingScreen'));
  show($('authScreen'));
  $('loginBtn').disabled = false;
  $('loginBtn').textContent = 'Přihlásit se';
  $('authEmail').value = '';
  $('authPassword').value = '';
}

async function checkAdminAccess() {
  try {
    // Test admin access by calling stats — returns 403 if not admin
    await adminFetch('stats');
    showAdminDashboard();
  } catch (error) {
    hide($('loadingScreen'));
    if (error.message === 'FORBIDDEN') {
      hide($('authScreen'));
      show($('accessDenied'));
    } else {
      console.error('Admin check error:', error);
      show($('authScreen'));
      $('authError').textContent = 'Chyba při ověření přístupu.';
      $('loginBtn').disabled = false;
      $('loginBtn').textContent = 'Přihlásit se';
    }
  }
}

async function showAdminDashboard() {
  hide($('loadingScreen'));
  hide($('authScreen'));
  hide($('accessDenied'));
  show($('adminApp'));

  const { data: { session } } = await supabaseClient.auth.getSession();
  $('adminEmail').textContent = session?.user?.email || '';

  // Load data
  await Promise.all([loadStats(), loadUsers(), loadRevenue()]);
}

// ============================================================
// Stats
// ============================================================
async function loadStats() {
  try {
    const data = await adminFetch('stats');
    $('statUsers').textContent = data.totalUsers;
    $('statActive').textContent = data.activeUsers7d;
    $('statMessages').textContent = data.totalMessages.toLocaleString('cs-CZ');
    $('statCost').textContent = `$${data.totalCostUsd.toFixed(2)}`;
    $('statCredits').textContent = data.credits.totalBalance.toLocaleString('cs-CZ');
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

// ============================================================
// Revenue
// ============================================================
async function loadRevenue() {
  const days = $('revenuePeriod')?.value || '30';
  try {
    const data = await adminFetch('revenue', { days });
    $('statRevenue').textContent = data.totalRevenueCzk.toLocaleString('cs-CZ') + ' Kč';

    const summaryEl = $('revenueSummary');
    if (summaryEl) {
      const pkgs = Object.entries(data.byPackage || {}).map(([label, info]) =>
        `<span class="revenue-pkg">${label}: ${info.count}× (${info.czk.toLocaleString('cs-CZ')} Kč)</span>`
      ).join(' · ');

      summaryEl.innerHTML = `
        <div class="revenue-stats">
          <span><strong>${data.totalPurchases}</strong> nákupů</span> ·
          <span><strong>${data.uniqueBuyers}</strong> kupujících</span> ·
          <span><strong>${data.totalRevenueCzk.toLocaleString('cs-CZ')} Kč</strong> celkem</span>
        </div>
        ${pkgs ? `<div class="revenue-packages">${pkgs}</div>` : ''}`;
    }

    const tbody = $('revenueBody');
    if (tbody) {
      if (!data.recentPurchases || data.recentPurchases.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="admin-empty">Žádné nákupy v tomto období.</td></tr>';
      } else {
        tbody.innerHTML = data.recentPurchases.map(p => {
          const type = p.reason?.includes('subscription') ? 'Předplatné' : 'Jednorázový';
          return `
            <tr>
              <td>${formatDate(p.date)}</td>
              <td>${escapeHtml(p.email)}</td>
              <td>${p.credits}</td>
              <td>${p.priceCzk.toLocaleString('cs-CZ')} Kč</td>
              <td>${type}</td>
            </tr>`;
        }).join('');
      }
    }
  } catch (error) {
    console.error('Failed to load revenue:', error);
    $('statRevenue').textContent = '—';
  }
}

// ============================================================
// Users Table
// ============================================================
async function loadUsers(page = 1) {
  currentPage = page;
  const search = $('userSearch').value.trim();

  try {
    const data = await adminFetch('users', { page, limit: 50, search });
    renderUsersTable(data.users);
    renderPagination(data.total, data.page, data.limit);
  } catch (error) {
    console.error('Failed to load users:', error);
    $('usersBody').innerHTML = '<tr><td colspan="8" class="admin-empty">Chyba při načítání uživatelů.</td></tr>';
  }
}

function renderUsersTable(users) {
  const tbody = $('usersBody');

  if (!users || users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="admin-empty">Žádní uživatelé.</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(user => {
    const roleClass = user.role === 'admin' ? 'role-admin' : 'role-user';
    const roleLabel = user.role === 'admin' ? '🛡️ Admin' : 'Uživatel';
    return `
      <tr class="user-row" data-userid="${escapeHtml(user.id)}">
        <td class="user-email-cell">${escapeHtml(user.email)}</td>
        <td>${escapeHtml(user.displayName || '—')}</td>
        <td><span class="role-badge ${roleClass}">${roleLabel}</span></td>
        <td class="credit-cell">${user.credits}</td>
        <td>${user.conversationCount}</td>
        <td>${formatDate(user.lastSignIn)}</td>
        <td>${formatDateShort(user.createdAt)}</td>
        <td><button class="btn-detail" onclick="openUserDetail('${user.id}')">Detail</button></td>
      </tr>`;
  }).join('');
}

function renderPagination(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) {
    $('pagination').innerHTML = '';
    return;
  }

  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    const active = i === page ? 'active' : '';
    html += `<button class="page-btn ${active}" onclick="loadUsers(${i})">${i}</button>`;
  }
  $('pagination').innerHTML = html;
}

function debounceSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => loadUsers(1), 300);
}

// ============================================================
// User Detail Panel
// ============================================================
async function openUserDetail(userId) {
  selectedUserId = userId;
  show($('userDetail'));
  $('adjustAmount').value = '';
  $('adjustReason').value = '';
  hide($('adjustStatus'));
  hide($('messageViewer'));

  try {
    // Load user detail
    const detail = await adminFetch('user_detail', { userId });
    renderUserDetail(detail);

    // Load conversations
    const convData = await adminFetch('conversations', { userId });
    renderConversations(convData.conversations);

    // Load adjustment history
    const adjData = await adminFetch('adjustments', { userId });
    renderAdjustmentHistory(adjData.adjustments);

  } catch (error) {
    console.error('Failed to load user detail:', error);
  }
}

function renderUserDetail(detail) {
  const { user, credits, stats } = detail;
  $('detailTitle').textContent = `${user.email}`;

  $('detailInfo').innerHTML = `
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">Email</span>
        <span class="info-value">${escapeHtml(user.email)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Jméno</span>
        <span class="info-value">${escapeHtml(user.displayName || '—')}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Role</span>
        <span class="info-value">${user.role === 'admin' ? '🛡️ Admin' : 'Uživatel'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Kredity</span>
        <span class="info-value credit-highlight">${credits.balance} 💎</span>
      </div>
      <div class="info-item">
        <span class="info-label">Celkem získáno</span>
        <span class="info-value">${credits.total_earned}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Celkem utraceno</span>
        <span class="info-value">${credits.total_spent}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Konverzace</span>
        <span class="info-value">${stats.conversationCount}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Zprávy</span>
        <span class="info-value">${stats.messageCount}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Náklady (USD)</span>
        <span class="info-value">$${stats.totalCostUsd.toFixed(4)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Registrace</span>
        <span class="info-value">${formatDate(user.createdAt)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Poslední přihlášení</span>
        <span class="info-value">${formatDate(user.lastSignIn)}</span>
      </div>
    </div>`;

  // Role management
  renderRoleManagement(user);
}

function renderRoleManagement(user) {
  const isAdmin = user.role === 'admin';
  const buttonLabel = isAdmin ? 'Odebrat admin práva' : 'Povýšit na admina';
  const buttonClass = isAdmin ? 'btn-demote' : 'btn-promote';
  const newRole = isAdmin ? 'user' : 'admin';

  $('roleManage').innerHTML = `
    <p class="role-current">Aktuální role: <strong>${isAdmin ? '🛡️ Admin' : 'Uživatel'}</strong></p>
    <button class="${buttonClass}" onclick="changeUserRole('${user.id}', '${newRole}')">${buttonLabel}</button>
    <div class="role-status hidden" id="roleStatus"></div>`;
}

async function changeUserRole(userId, newRole) {
  const action = newRole === 'admin' ? 'povýšit na admina' : 'odebrat admin práva';
  if (!confirm(`Opravdu chcete ${action}?`)) {
    return;
  }

  const statusEl = $('roleStatus');
  show(statusEl);
  statusEl.className = 'role-status';
  statusEl.textContent = 'Probíhá...';

  try {
    const result = await adminPost('set_role', { userId, role: newRole });
    statusEl.className = 'role-status success';
    statusEl.textContent = `Role změněna na "${newRole}" pro ${result.email || userId}.`;

    // Refresh detail and table
    await openUserDetail(userId);
    await loadUsers(currentPage);
  } catch (error) {
    statusEl.className = 'role-status error';
    statusEl.textContent = error.message || 'Chyba při změně role.';
  }
}

// ============================================================
// Credit Adjustment
// ============================================================
async function submitCreditAdjustment() {
  const amount = parseInt($('adjustAmount').value, 10);
  const reason = $('adjustReason').value.trim();
  const statusEl = $('adjustStatus');

  if (isNaN(amount) || amount === 0) {
    show(statusEl);
    statusEl.className = 'adjust-status error';
    statusEl.textContent = 'Zadejte nenulový počet kreditů.';
    return;
  }

  show(statusEl);
  statusEl.className = 'adjust-status';
  statusEl.textContent = 'Probíhá...';

  try {
    const result = await adminPost('adjust_credits', {
      userId: selectedUserId,
      amount,
      reason,
    });

    statusEl.className = 'adjust-status success';
    statusEl.textContent = `Úspěšně upraveno. Nový zůstatek: ${result.newBalance} kreditů.`;
    $('adjustAmount').value = '';
    $('adjustReason').value = '';

    // Refresh data
    await openUserDetail(selectedUserId);
    await loadUsers(currentPage);
  } catch (error) {
    statusEl.className = 'adjust-status error';
    statusEl.textContent = error.message || 'Chyba při úpravě kreditů.';
  }
}

function renderAdjustmentHistory(adjustments) {
  const container = $('adjustHistory');
  if (!adjustments || adjustments.length === 0) {
    container.innerHTML = '<p class="admin-empty-text">Zatím žádné úpravy.</p>';
    return;
  }

  container.innerHTML = `
    <h4>Historie úprav</h4>
    <table class="adj-table">
      <thead>
        <tr><th>Datum</th><th>Změna</th><th>Před</th><th>Po</th><th>Důvod</th></tr>
      </thead>
      <tbody>
        ${adjustments.map(adj => `
          <tr>
            <td>${formatDate(adj.created_at)}</td>
            <td class="${adj.amount > 0 ? 'adj-positive' : 'adj-negative'}">${adj.amount > 0 ? '+' : ''}${adj.amount}</td>
            <td>${adj.balance_before}</td>
            <td>${adj.balance_after}</td>
            <td>${escapeHtml(adj.reason || '—')}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

// ============================================================
// Conversations
// ============================================================
function renderConversations(conversations) {
  const container = $('detailConversations');

  if (!conversations || conversations.length === 0) {
    container.innerHTML = '<p class="admin-empty-text">Žádné konverzace.</p>';
    return;
  }

  container.innerHTML = conversations.map(conv => `
    <div class="detail-conv-item" onclick="loadConversationMessages('${conv.id}', '${escapeHtml(conv.title || 'Bez názvu')}')">
      <span class="conv-item-title">${escapeHtml(conv.title || 'Bez názvu')}</span>
      <span class="conv-item-meta">${conv.messageCount} zpráv · ${formatDateShort(conv.updated_at)}</span>
    </div>`).join('');
}

async function loadConversationMessages(conversationId, title) {
  show($('messageViewer'));
  $('msgViewerTitle').textContent = title;
  $('msgViewerBody').innerHTML = '<p class="admin-loading">Načítání zpráv...</p>';

  try {
    const data = await adminFetch('messages', { conversationId });
    renderMessages(data.messages);
  } catch (error) {
    $('msgViewerBody').innerHTML = '<p class="admin-error">Chyba při načítání zpráv.</p>';
    console.error('Failed to load messages:', error);
  }
}

function renderMessages(messages) {
  const container = $('msgViewerBody');

  if (!messages || messages.length === 0) {
    container.innerHTML = '<p class="admin-empty-text">Žádné zprávy.</p>';
    return;
  }

  container.innerHTML = messages.map(msg => {
    const roleClass = msg.role === 'user' ? 'msg-user' : 'msg-assistant';
    const roleLabel = msg.role === 'user' ? '👤 Uživatel' : '🔮 Zdenka';
    const tokenInfo = msg.role === 'assistant' && (msg.input_tokens || msg.output_tokens)
      ? `<span class="msg-tokens">↓${msg.input_tokens} ↑${msg.output_tokens}</span>`
      : '';

    // Use textContent-safe rendering — no innerHTML for message content
    const div = document.createElement('div');
    div.textContent = msg.content;
    const safeContent = div.innerHTML;

    return `
      <div class="viewer-msg ${roleClass}">
        <div class="viewer-msg-header">
          <span class="viewer-msg-role">${roleLabel}</span>
          <span class="viewer-msg-time">${formatDate(msg.created_at)}${tokenInfo}</span>
        </div>
        <div class="viewer-msg-content">${safeContent}</div>
      </div>`;
  }).join('');

  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

function closeMessageViewer() {
  hide($('messageViewer'));
}

function closeUserDetail() {
  hide($('userDetail'));
  selectedUserId = null;
}

// ============================================================
// Init — check existing session on page load
// ============================================================
async function initAdmin() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (session) {
    currentSession = session;
    await checkAdminAccess();
  } else {
    // No existing session — show login form
    hide($('loadingScreen'));
    show($('authScreen'));
  }

  // Listen for auth changes (token refresh etc.)
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      handleAdminLogout();
    }
  });
}

// Make functions globally accessible for onclick handlers
window.handleAdminLogin = handleAdminLogin;
window.handleAdminLogout = handleAdminLogout;
window.loadUsers = loadUsers;
window.openUserDetail = openUserDetail;
window.closeUserDetail = closeUserDetail;
window.submitCreditAdjustment = submitCreditAdjustment;
window.changeUserRole = changeUserRole;
window.loadConversationMessages = loadConversationMessages;
window.closeMessageViewer = closeMessageViewer;
window.debounceSearch = debounceSearch;
window.loadRevenue = loadRevenue;

// Start
initAdmin();
