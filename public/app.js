const state = {
  user: null,
  isRegister: false,
  step1Valid: false,
  currentMainView: 'landing',
};

const viewLanding = document.getElementById('viewLanding');
const viewAuth = document.getElementById('viewAuth');
const viewDashboard = document.getElementById('viewDashboard');
const publicActions = document.getElementById('publicActions');
const authActions = document.getElementById('authActions');
const userPill = document.getElementById('userPill');
const dashboardGreeting = document.getElementById('dashboardGreeting');

const authTitle = document.getElementById('authTitle');
const nameField = document.getElementById('nameField');
const authName = document.getElementById('authName');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authMsg = document.getElementById('authMsg');

const panelDashboard = document.getElementById('panelDashboard');
const panelApplications = document.getElementById('panelApplications');
const panelResults = document.getElementById('panelResults');

const step2 = document.getElementById('step2');
const step1Msg = document.getElementById('step1Msg');
const step2Msg = document.getElementById('step2Msg');

function renderMainView() {
  viewLanding.style.display = state.currentMainView === 'landing' ? 'block' : 'none';
  viewAuth.style.display = state.currentMainView === 'auth' ? 'block' : 'none';
  viewDashboard.style.display = state.currentMainView === 'dashboard' ? 'block' : 'none';

  const isLoggedIn = Boolean(state.user);
  publicActions.style.display = isLoggedIn ? 'none' : 'flex';
  authActions.style.display = isLoggedIn ? 'flex' : 'none';

  if (state.user) {
    userPill.textContent = `User: ${state.user.name}`;
    dashboardGreeting.textContent = `Welcome, ${state.user.name}!`;
  }
}

function renderAuthMode() {
  authTitle.textContent = state.isRegister ? 'Register' : 'Login';
  nameField.style.display = state.isRegister ? 'block' : 'none';
  document.getElementById('authSubmitBtn').textContent = state.isRegister ? 'Register' : 'Login';
  document.getElementById('switchAuthModeBtn').textContent = state.isRegister ? 'Already have account? Login' : 'Create account';
}

function setDashboardPanel(panel) {
  const map = { dashboard: panelDashboard, applications: panelApplications, results: panelResults };
  Object.values(map).forEach((el) => { el.style.display = 'none'; });
  map[panel].style.display = 'block';

  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.remove('active'));
  document.querySelector(`[data-nav="${panel}"]`)?.classList.add('active');
}

function unlockStep2() {
  step2.style.display = 'block';
  step2.style.opacity = '1';
  step2.style.pointerEvents = 'auto';
}

document.getElementById('openAuthBtn').addEventListener('click', () => {
  state.currentMainView = 'auth';
  renderMainView();
});

document.getElementById('goAuthBtn').addEventListener('click', () => {
  state.currentMainView = 'auth';
  renderMainView();
});

document.getElementById('switchAuthModeBtn').addEventListener('click', () => {
  state.isRegister = !state.isRegister;
  renderAuthMode();
  authMsg.textContent = '';
});

document.getElementById('authSubmitBtn').addEventListener('click', async () => {
  const endpoint = state.isRegister ? '/api/auth/register' : '/api/auth/login';
  const payload = state.isRegister
    ? { name: authName.value.trim(), email: authEmail.value.trim(), password: authPassword.value, role: 'user', course: 'Scholarship Program' }
    : { email: authEmail.value.trim(), password: authPassword.value, expectedRole: 'user' };

  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  const data = await response.json();

  if (!response.ok) {
    authMsg.textContent = data.error || 'Authentication failed';
    return;
  }

  if (state.isRegister) {
    authMsg.textContent = 'Registration successful. Please login now.';
    state.isRegister = false;
    renderAuthMode();
    return;
  }

  state.user = data.user;
  state.currentMainView = 'dashboard';
  renderMainView();
  setDashboardPanel('dashboard');
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  state.user = null;
  state.currentMainView = 'landing';
  renderMainView();
});

document.querySelectorAll('[data-nav]').forEach((a) => {
  a.addEventListener('click', (event) => {
    event.preventDefault();
    if (!state.user) {
      state.currentMainView = 'auth';
      renderMainView();
      return;
    }
    setDashboardPanel(a.dataset.nav);
  });
});

document.getElementById('toStep2Btn').addEventListener('click', () => {
  const fullName = document.getElementById('fullName').value.trim();
  const phone = document.getElementById('phone').value.trim();
  if (!fullName || !phone) {
    state.step1Valid = false;
    step1Msg.textContent = 'Step 1 complete kiye bina Step 2 open nahi hoga.';
    return;
  }
  state.step1Valid = true;
  step1Msg.textContent = 'Step 1 validated. Step 2 unlocked.';
  unlockStep2();
});

document.getElementById('submitFormBtn').addEventListener('click', async () => {
  if (!state.user) {
    state.currentMainView = 'auth';
    renderMainView();
    return;
  }
  if (!state.step1Valid) {
    step2Msg.textContent = 'Please complete Step 1 first.';
    return;
  }

  const payload = {
    fullName: document.getElementById('fullName').value,
    phone: document.getElementById('phone').value,
    email: state.user.email,
    dateOfBirth: '2000-01-01',
    address: 'N/A',
    schoolName: document.getElementById('schoolName').value,
    board: 'State Board',
    className: document.getElementById('className').value,
    paymentStatus: 'success',
    paymentReference: `MOCK-${Date.now()}`,
  };

  const response = await fetch('/api/student/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  const data = await response.json();
  step2Msg.textContent = response.ok ? `Application submitted. ID: ${data.student.id}` : (data.error || 'Submission failed');
});

(async function init() {
  const response = await fetch('/api/auth/session');
  if (response.ok) {
    const data = await response.json();
    state.user = data.user;
    state.currentMainView = 'dashboard';
    setDashboardPanel('dashboard');
  }
  renderAuthMode();
  renderMainView();
})();
