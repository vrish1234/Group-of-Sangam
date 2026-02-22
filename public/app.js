// Standalone localStorage SPA logic
let isLoggedIn = false;

const state = {
  user: null,
  isSignupMode: false,
  route: '/landing',
  step: 1,
  paymentPaid: false,
  applications: [],
};

const $ = (id) => document.getElementById(id);
const LS_USERS = 'gyanSetuUsers';
const LS_SESSION = 'gyanSetuSession';
const LS_APPS = 'gyanSetuApplications';

// Hash a password using SHA-256 and encode it as a hex string.
async function hashPassword(password) {
  const enc = new TextEncoder();
  const data = enc.encode(password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    const byteHex = bytes[i].toString(16).padStart(2, '0');
    hex += byteHex;
  }
  return hex;
}

function getUsers() {
  return JSON.parse(localStorage.getItem(LS_USERS) || '[]');
}

function setUsers(users) {
  localStorage.setItem(LS_USERS, JSON.stringify(users));
}

function getSession() {
  return JSON.parse(localStorage.getItem(LS_SESSION) || 'null');
}

function setSession(user) {
  localStorage.setItem(LS_SESSION, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(LS_SESSION);
}

function getApps() {
  return JSON.parse(localStorage.getItem(LS_APPS) || '[]');
}

function setApps(apps) {
  localStorage.setItem(LS_APPS, JSON.stringify(apps));
}

function show(id, visible, type = 'block') {
  $(id).style.display = visible ? type : 'none';
}

function setRoute(route, replace = false) {
  const guarded = ['/dashboard', '/apply', '/results'];
  if (!isLoggedIn && guarded.includes(route)) route = '/login';

  state.route = route;
  if (replace) history.replaceState({}, '', route);
  else history.pushState({}, '', route);
  render();
}

function setAuthMode(signup) {
  state.isSignupMode = signup;
  $('authHeading').textContent = signup ? 'Create Account' : 'Login';
  $('authSubmitBtn').textContent = signup ? 'Sign up' : 'Login';
  $('authModeBtn').textContent = signup ? 'Back to Login' : 'Create account';
  show('nameField', signup);
  $('authMsg').textContent = '';
}

function setPanel(route) {
  document.querySelectorAll('#sidebar a[data-route]').forEach((a) => {
    a.classList.toggle('active', a.dataset.route === route);
  });

  show('panelDashboard', route === '/dashboard');
  show('panelApply', route === '/apply');
  show('panelResults', route === '/results');
}

function renderApplications() {
  const items = state.applications
    .filter((a) => a.email === state.user?.email)
    .map((a) => `<li>${a.fullName} • ${a.className} • ${a.paymentStatus}</li>`)
    .join('');
  $('applicationsList').innerHTML = items || '<li>No applications yet.</li>';
}

function requiredFieldsByStep(step) {
  if (step === 1) return ['fullName', 'phone'];
  if (step === 2) return ['schoolName', 'className'];
  return [];
}

function stepIsValid(step) {
  return requiredFieldsByStep(step).every((id) => $(id).value.trim());
}

function updateStepButtons() {
  show('step1', state.step === 1);
  show('step2', state.step === 2);
  show('step3', state.step === 3);

  show('prevBtn', state.step > 1, 'inline-block');
  show('nextBtn', state.step < 3, 'inline-block');
  show('submitBtn', state.step === 3, 'inline-block');

  $('nextBtn').disabled = !stepIsValid(state.step);
  $('submitBtn').disabled = !state.paymentPaid;
}

function resetForm() {
  ['fullName', 'phone', 'schoolName', 'className'].forEach((id) => ($(id).value = ''));
  state.step = 1;
  state.paymentPaid = false;
  $('paymentStatus').textContent = 'Payment: Pending';
  show('paySpinner', false, 'inline-block');
  $('payBtn').disabled = false;
  $('formMsg').textContent = '';
  updateStepButtons();
}

async function doAuth() {
  const email = $('authEmail').value.trim().toLowerCase();
  const password = $('authPassword').value;
  const name = $('authName').value.trim();

  if (!email || !password) {
    $('authMsg').textContent = 'Please fill email and password.';
    return;
  }

  const users = getUsers();

  if (state.isSignupMode) {
    if (!name) {
      $('authMsg').textContent = 'Please enter full name.';
      return;
    }
    if (users.find((u) => u.email === email)) {
      $('authMsg').textContent = 'Account already exists. Please login.';
      return;
    }
    const passwordHash = await hashPassword(password);
    users.push({ name, email, passwordHash });
    setUsers(users);
    $('authMsg').textContent = 'Account created. Please login now.';
    setAuthMode(false);
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = users.find((u) => u.email === email && u.passwordHash === passwordHash);
  if (!user) {
    $('authMsg').textContent = 'Invalid credentials.';
    return;
  }

  state.user = { name: user.name, email: user.email };
  setSession(state.user);
  isLoggedIn = true;
  setRoute('/dashboard', true);
}

function logout() {
  clearSession();
  isLoggedIn = false;
  state.user = null;
  resetForm();
  setRoute('/login', true);
}

function submitApplication() {
  if (!state.paymentPaid) return;

  const app = {
    fullName: $('fullName').value.trim(),
    phone: $('phone').value.trim(),
    schoolName: $('schoolName').value.trim(),
    className: $('className').value.trim(),
    paymentStatus: 'Paid',
    email: state.user.email,
    submittedAt: new Date().toISOString(),
  };

  state.applications.unshift(app);
  setApps(state.applications);
  renderApplications();

  alert(`Success!\n\n${JSON.stringify(app, null, 2)}`);
  resetForm();
  setRoute('/dashboard', true);
}

function render() {
  show('guestActions', !isLoggedIn, 'flex');
  show('userActions', isLoggedIn, 'flex');

  if (isLoggedIn) {
    $('userBadge').textContent = `${state.user.name}`;
    $('welcomeText').textContent = `Welcome, ${state.user.name}!`;
  }

  const route = state.route;
  const isAppView = ['/dashboard', '/apply', '/results'].includes(route);

  show('viewLanding', route === '/landing' || route === '/');
  show('viewAuth', route === '/login');
  show('viewApp', isAppView);

  if (isAppView) setPanel(route);

  const isMobile = window.innerWidth <= 900;
  show('sidebarToggleBtn', isAppView && isMobile, 'inline-block');

  if (!isMobile) {
    $('sidebar').classList.remove('collapsed');
  }

  updateStepButtons();
}

function bindEvents() {
  $('openLoginBtn').addEventListener('click', () => {
    setAuthMode(false);
    setRoute('/login');
  });

  $('openSignupBtn').addEventListener('click', () => {
    setAuthMode(true);
    setRoute('/login');
  });

  $('startNowBtn').addEventListener('click', () => {
    setAuthMode(false);
    setRoute('/login');
  });

  $('authModeBtn').addEventListener('click', () => setAuthMode(!state.isSignupMode));
  $('authSubmitBtn').addEventListener('click', doAuth);
  $('logoutBtn').addEventListener('click', logout);

  document.querySelectorAll('#sidebar a[data-route]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      setRoute(a.dataset.route);
    });
  });

  ['fullName', 'phone', 'schoolName', 'className'].forEach((id) => {
    $(id).addEventListener('input', updateStepButtons);
  });

  $('nextBtn').addEventListener('click', () => {
    if (!stepIsValid(state.step)) return;
    state.step += 1;
    updateStepButtons();
  });

  $('prevBtn').addEventListener('click', () => {
    state.step = Math.max(1, state.step - 1);
    updateStepButtons();
  });

  $('payBtn').addEventListener('click', () => {
    $('payBtn').disabled = true;
    show('paySpinner', true, 'inline-block');
    $('paymentStatus').textContent = 'Payment: Processing...';

    setTimeout(() => {
      state.paymentPaid = true;
      $('paymentStatus').textContent = 'Payment: Paid';
      show('paySpinner', false, 'inline-block');
      $('payBtn').disabled = false;
      updateStepButtons();
    }, 2000);
  });

  $('submitBtn').addEventListener('click', submitApplication);
  $('sidebarToggleBtn').addEventListener('click', () => $('sidebar').classList.toggle('collapsed'));

  window.addEventListener('resize', render);
  window.addEventListener('popstate', () => {
    const path = window.location.pathname || '/landing';
    state.route = path;
    render();
  });
}

(function init() {
  state.applications = getApps();
  state.user = getSession();
  isLoggedIn = Boolean(state.user);

  bindEvents();
  renderApplications();
  resetForm();

  const params = new URLSearchParams(window.location.search);
  const redirected = params.get('redirect');
  const initialPath = redirected || (window.location.pathname === '/index.html' ? '/landing' : (window.location.pathname || '/landing'));
  setRoute(initialPath, true);
})();
