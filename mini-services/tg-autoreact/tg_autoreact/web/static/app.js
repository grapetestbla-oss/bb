'use strict';

const $ = (id) => document.getElementById(id);
const STATE_LABELS = {
  running: 'работает',
  disabled: 'выключен',
  fatal: 'ошибка входа',
  starting: 'запускается',
};

let refreshTimer = null;
let loginId = null;

// --- транспорт --------------------------------------------------------

async function api(method, path, body) {
  const response = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'tg-autoreact' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = {};
  try { data = await response.json(); } catch (_) { /* пустой ответ — не беда */ }
  if (response.status === 401 && path !== '/api/session') {
    showLogin();
    throw new Error(data.error || 'Требуется вход');
  }
  if (!response.ok) throw new Error(data.error || `Ошибка ${response.status}`);
  return data;
}

function toast(message, isError) {
  const el = $('toast');
  el.textContent = message;
  el.classList.toggle('error', Boolean(isError));
  el.classList.remove('hidden');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.add('hidden'), 4000);
}

// --- экраны -----------------------------------------------------------

function showLogin() {
  clearInterval(refreshTimer);
  refreshTimer = null;
  $('app-screen').classList.add('hidden');
  $('login-screen').classList.remove('hidden');
  $('panel-password').focus();
}

function showApp() {
  $('login-screen').classList.add('hidden');
  $('app-screen').classList.remove('hidden');
  refresh();
  if (!refreshTimer) refreshTimer = setInterval(refresh, 5000);
}

// --- состояние --------------------------------------------------------

function uptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days) return `${days} д ${hours} ч`;
  if (hours) return `${hours} ч ${minutes} мин`;
  return `${minutes} мин`;
}

function renderTotals(state) {
  const t = state.totals;
  const cards = [
    ['Аккаунтов', state.accounts.length],
    ['Реакций', t.reacted],
    ['Пропущено', t.skipped],
    ['Ошибок', t.failed],
    ['FloodWait', t.flood_waits],
    ['Чатов в бане', t.blocked_chats],
  ];
  $('totals').innerHTML = cards
    .map(([label, value]) => `<div class="total"><div class="value">${value}</div><div class="label">${label}</div></div>`)
    .join('');
}

function renderAccounts(state) {
  const tbody = document.querySelector('#accounts tbody');
  tbody.innerHTML = '';
  $('accounts-empty').classList.toggle('hidden', state.accounts.length > 0);

  for (const account of state.accounts) {
    const row = document.createElement('tr');
    const stats = account.stats;
    const cells = [
      escape(account.name),
      account.kind === 'bot' ? 'бот' : 'юзер',
      `<span class="badge ${account.state}">${STATE_LABELS[account.state] || account.state}</span>`,
      stats.reacted,
      stats.skipped,
      stats.failed,
      stats.flood_waits,
      account.proxy ? escape(account.proxy) : '—',
    ];
    row.innerHTML = cells.map((value) => `<td>${value}</td>`).join('');

    const actions = document.createElement('td');
    actions.className = 'actions';

    const toggle = document.createElement('button');
    toggle.className = 'small';
    toggle.textContent = account.enabled ? 'Выключить' : 'Включить';
    toggle.onclick = () => guard(toggle, async () => {
      await api('POST', `/api/accounts/${encodeURIComponent(account.name)}/enabled`, { enabled: !account.enabled });
      toast(account.enabled ? `${account.name} выключен` : `${account.name} включён`);
      refresh();
    });

    const remove = document.createElement('button');
    remove.className = 'small danger';
    remove.textContent = 'Удалить';
    remove.onclick = () => {
      if (!confirm(`Удалить аккаунт ${account.name}? Сессия будет стёрта, вход придётся делать заново.`)) return;
      guard(remove, async () => {
        await api('DELETE', `/api/accounts/${encodeURIComponent(account.name)}`);
        toast(`${account.name} удалён`);
        refresh();
      });
    };

    actions.append(toggle, remove);
    row.append(actions);
    tbody.append(row);
  }
}

async function refresh() {
  try {
    const state = await api('GET', '/api/state');
    $('reaction-emoji').textContent = state.reaction;
    $('uptime').textContent =
      `в работе ${uptime(state.uptime_seconds)} · лимит ${state.limits.per_account_per_minute} реакций/мин на аккаунт`;
    renderTotals(state);
    renderAccounts(state);
  } catch (error) {
    if (error.message !== 'Требуется вход') toast(error.message, true);
  }
}

// --- утилиты форм -----------------------------------------------------

function escape(value) {
  return String(value).replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

async function guard(button, action) {
  const label = button.textContent;
  button.disabled = true;
  try {
    await action();
  } catch (error) {
    toast(error.message, true);
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
}

function showStep(step) {
  const isUser = step === 'user' || step === 'code' || step === 'password';
  $('user-form').classList.toggle('hidden', step !== 'user');
  $('code-form').classList.toggle('hidden', step !== 'code');
  $('password-form').classList.toggle('hidden', step !== 'password');
  $('bot-form').classList.toggle('hidden', isUser);
  $('add-error').textContent = '';
}

function setAddError(error) {
  $('add-error').textContent = error.message;
}

async function finishAdd(name) {
  loginId = null;
  showStep('user');
  $('user-form').reset();
  toast(`Аккаунт ${name} добавлен и запущен`);
  refresh();
}

// --- обработчики ------------------------------------------------------

$('login-form').onsubmit = async (event) => {
  event.preventDefault();
  $('login-error').textContent = '';
  try {
    await api('POST', '/api/session', { password: $('panel-password').value });
    $('panel-password').value = '';
    showApp();
  } catch (error) {
    $('login-error').textContent = error.message;
  }
};

$('logout').onclick = async () => {
  try { await api('DELETE', '/api/session'); } catch (_) { /* всё равно уходим */ }
  showLogin();
};

document.querySelectorAll('.tab').forEach((tab) => {
  tab.onclick = () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
    if (loginId) api('POST', '/api/login/cancel', { login_id: loginId }).catch(() => {});
    loginId = null;
    showStep(tab.dataset.tab);
  };
});

$('user-form').onsubmit = (event) => {
  event.preventDefault();
  $('add-error').textContent = '';
  guard($('u-submit'), async () => {
    const payload = {
      name: $('u-name').value,
      api_id: $('u-api-id').value,
      api_hash: $('u-api-hash').value,
      phone: $('u-phone').value,
      proxy: $('u-proxy').value,
    };
    try {
      const result = await api('POST', '/api/login/start', payload);
      loginId = result.login_id;
      $('code-phone').textContent = payload.phone;
      showStep('code');
      $('u-code').focus();
    } catch (error) {
      setAddError(error);
      throw error;
    }
  });
};

$('code-form').onsubmit = async (event) => {
  event.preventDefault();
  $('add-error').textContent = '';
  const button = event.submitter || $('code-form').querySelector('.primary');
  guard(button, async () => {
    try {
      const result = await api('POST', '/api/login/code', { login_id: loginId, code: $('u-code').value });
      $('u-code').value = '';
      if (result.state === 'password') {
        showStep('password');
        $('u-2fa').focus();
      } else {
        await finishAdd(result.name);
      }
    } catch (error) {
      setAddError(error);
      throw error;
    }
  });
};

$('password-form').onsubmit = async (event) => {
  event.preventDefault();
  $('add-error').textContent = '';
  const button = event.submitter || $('password-form').querySelector('.primary');
  guard(button, async () => {
    try {
      const result = await api('POST', '/api/login/password', { login_id: loginId, password: $('u-2fa').value });
      $('u-2fa').value = '';
      await finishAdd(result.name);
    } catch (error) {
      setAddError(error);
      throw error;
    }
  });
};

const cancelLogin = () => {
  if (loginId) api('POST', '/api/login/cancel', { login_id: loginId }).catch(() => {});
  loginId = null;
  showStep('user');
};
$('code-cancel').onclick = cancelLogin;
$('password-cancel').onclick = cancelLogin;

$('bot-form').onsubmit = (event) => {
  event.preventDefault();
  $('add-error').textContent = '';
  guard(event.submitter || $('bot-form').querySelector('.primary'), async () => {
    try {
      const result = await api('POST', '/api/accounts/bot', {
        name: $('b-name').value,
        api_id: $('b-api-id').value,
        api_hash: $('b-api-hash').value,
        bot_token: $('b-token').value,
        proxy: $('b-proxy').value,
      });
      $('bot-form').reset();
      toast(`Бот ${result.name} добавлен и запущен`);
      refresh();
    } catch (error) {
      setAddError(error);
      throw error;
    }
  });
};

// --- старт ------------------------------------------------------------

api('GET', '/api/state').then(showApp).catch(showLogin);
