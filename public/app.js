// Global login state requested
let isLoggedIn = false;

const state = {
  user: null,
  isRegister: false,
  currentMainView: 'landing',
  currentRoute: '/landing',
  recentApplications: [],
  currentStep: 1,
  paymentPaid: false,
};

const $ = (id) => document.getElementById(id);

function setDisplay(id, show, type = 'block') { $(id).style.display = show ? type : 'none'; }

function syncLoginState() {
  isLoggedIn = Boolean(state.user);
  setDisplay('publicActions', !isLoggedIn, 'flex');
  setDisplay('authActions', isLoggedIn, 'flex');
  if (isLoggedIn) {
    $('userPill').textContent = `User: ${state.user.name}`;
    $('dashboardGreeting').textContent = `Welcome, ${state.user.name}!`;
  }
}

function renderMainView() {
  setDisplay('viewLanding', state.currentMainView === 'landing');
  setDisplay('viewAuth', state.currentMainView === 'auth');
  setDisplay('viewDashboard', state.currentMainView === 'dashboard');
  syncLoginState();
}

function renderAuthMode() {
  $('authTitle').textContent = state.isRegister ? 'Register' : 'Login';
  setDisplay('nameField', state.isRegister);
  $('authSubmitBtn').textContent = state.isRegister ? 'Register' : 'Login';
  $('switchAuthModeBtn').textContent = state.isRegister ? 'Already have account? Login' : 'Create account';
}

function renderRecentApplications() {
  $('recentApplicationsList').innerHTML = state.recentApplications.length
    ? state.recentApplications.map((item) => `<li>${item}</li>`).join('')
    : '<li>No applications submitted yet.</li>';
}

function applyRouteGuard(route) {
  if (!isLoggedIn && ['/dashboard', '/apply', '/results'].includes(route)) {
    state.currentMainView = 'auth';
    state.currentRoute = '/login';
    history.replaceState({}, '', '/login');
    return false;
  }
  return true;
}

function setPanel(route) {
  const panels = { '/dashboard': 'panelDashboard', '/apply': 'panelApplications', '/results': 'panelResults' };
  Object.values(panels).forEach((id) => setDisplay(id, false));
  if (panels[route]) setDisplay(panels[route], true);
  document.querySelectorAll('[data-route]').forEach((a) => a.classList.remove('active'));
  document.querySelector(`[data-route="${route}"]`)?.classList.add('active');
}

function navigate(route, replace = false) {
  if (!applyRouteGuard(route)) return renderMainView();

  if (route === '/landing' || route === '/') state.currentMainView = 'landing';
  else if (route === '/login') state.currentMainView = 'auth';
  else {
    state.currentMainView = 'dashboard';
    setPanel(route);
  }

  state.currentRoute = route;
  if (replace) history.replaceState({}, '', route);
  else history.pushState({}, '', route);
  renderMainView();
}

function getStepFields(step) {
  if (step === 1) return ['fullName', 'phone'];
  if (step === 2) return ['schoolName', 'className'];
  return [];
}

function validateStep(step) {
  return getStepFields(step).every((id) => $(id).value.trim());
}

function renderStep() {
  [1, 2, 3].forEach((s) => setDisplay(`step${s}`, s === state.currentStep));
  setDisplay('prevBtn', state.currentStep > 1, 'inline-block');
  setDisplay('nextBtn', state.currentStep < 3, 'inline-block');
  setDisplay('submitFormBtn', state.currentStep === 3, 'inline-block');

  if (state.currentStep === 3) {
    $('submitFormBtn').disabled = !state.paymentPaid;
  }
}

function resetFormAndFlow() {
  ['fullName', 'phone', 'schoolName', 'className'].forEach((id) => ($(id).value = ''));
  state.currentStep = 1;
  state.paymentPaid = false;
  $('paymentStatus').textContent = 'Payment: Pending';
  setDisplay('paySpinner', false);
  $('stepMsg').textContent = '';
  $('submitFormBtn').disabled = true;
  renderStep();
}

async function mockLoginOrRegister() {
  const endpoint = state.isRegister ? '/api/auth/register' : '/api/auth/login';
  const payload = state.isRegister
    ? { name: $('authName').value.trim(), email: $('authEmail').value.trim(), password: $('authPassword').value, role: 'user', course: 'Scholarship Program' }
    : { email: $('authEmail').value.trim(), password: $('authPassword').value, expectedRole: 'user' };

  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await response.json();
  if (!response.ok) return ($('authMsg').textContent = data.error || 'Authentication failed');

  if (state.isRegister) {
    $('authMsg').textContent = 'Registration successful. Please login now.';
    state.isRegister = false;
    renderAuthMode();
    return;
  }

  state.user = data.user;
  isLoggedIn = true;
  navigate('/dashboard', true);
  renderRecentApplications();
}

// events
$('openAuthBtn').addEventListener('click', () => navigate('/login'));
$('goAuthBtn').addEventListener('click', () => navigate('/login'));
$('switchAuthModeBtn').addEventListener('click', () => {
  state.isRegister = !state.isRegister;
  $('authMsg').textContent = '';
  renderAuthMode();
});
$('authSubmitBtn').addEventListener('click', mockLoginOrRegister);

$('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  state.user = null;
  isLoggedIn = false;
  state.recentApplications = [];
  resetFormAndFlow();
  navigate('/login', true);
});

document.querySelectorAll('[data-route]').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    navigate(a.dataset.route);
  });
});

$('sidebarToggleBtn').addEventListener('click', () => $('appSidebar').classList.toggle('collapsed'));
window.addEventListener('resize', () => {
  if (window.innerWidth > 900) $('appSidebar').classList.remove('collapsed');
});
window.addEventListener('popstate', () => navigate(window.location.pathname, true));

$('nextBtn').addEventListener('click', () => {
  if (!validateStep(state.currentStep)) {
    $('stepMsg').textContent = `Please fill all required fields in Step ${state.currentStep}.`;
    return;
  }
  $('stepMsg').textContent = '';
  state.currentStep += 1;
  renderStep();
});

$('prevBtn').addEventListener('click', () => {
  if (state.currentStep > 1) state.currentStep -= 1;
  renderStep();
});

$('payBtn').addEventListener('click', () => {
  setDisplay('paySpinner', true, 'inline-block');
  $('paymentStatus').textContent = 'Payment: Processing...';
  $('payBtn').disabled = true;
  setTimeout(() => {
    setDisplay('paySpinner', false);
    $('paymentStatus').textContent = 'Payment: Paid';
    state.paymentPaid = true;
    $('submitFormBtn').disabled = false;
    $('payBtn').disabled = false;
  }, 2000);
});

$('submitFormBtn').addEventListener('click', async () => {
  if (!state.paymentPaid) return;
  const formData = {
    fullName: $('fullName').value,
    phone: $('phone').value,
    schoolName: $('schoolName').value,
    className: $('className').value,
    paymentStatus: 'success',
  };

  const payload = {
    fullName: formData.fullName,
    phone: formData.phone,
    email: state.user.email,
    dateOfBirth: '2000-01-01',
    address: 'N/A',
    schoolName: formData.schoolName,
    board: 'State Board',
    className: formData.className,
    paymentStatus: 'success',
    paymentReference: `MOCK-${Date.now()}`,
  };

  const response = await fetch('/api/student/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await response.json();
  if (!response.ok) {
    $('stepMsg').textContent = data.error || 'Submission failed';
    return;
  }

  state.recentApplications.unshift(`Application ID ${data.student.id} submitted`);
  renderRecentApplications();
  alert(`Success! Submitted JSON:\n${JSON.stringify(formData, null, 2)}`);
  resetFormAndFlow();
  navigate('/dashboard', true);
});

(async function init() {
  const response = await fetch('/api/auth/session');
  if (response.ok) {
    const data = await response.json();
    state.user = data.user;
    isLoggedIn = true;
  }

  renderAuthMode();
  renderRecentApplications();
  resetFormAndFlow();

  const requested = window.location.pathname;
  if (!requested || requested === '/index.html') navigate('/landing', true);
  else navigate(requested, true);
  if (isLoggedIn && state.currentRoute === '/login') navigate('/dashboard', true);
})();
