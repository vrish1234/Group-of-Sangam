const form = document.getElementById('scholarshipForm');
const steps = [...document.querySelectorAll('.step')];
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');
const message = document.getElementById('message');
const payBtn = document.getElementById('payBtn');
const paymentStatusLabel = document.getElementById('paymentStatus');
const hamburger = document.getElementById('hamburger');
const sidebar = document.getElementById('sidebar');

const openAuthBtn = document.getElementById('openAuthBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authModal = document.getElementById('authModal');
const closeAuthBtn = document.getElementById('closeAuthBtn');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const authName = document.getElementById('authName');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authRole = document.getElementById('authRole');
const roleField = document.getElementById('roleField');
const authMessage = document.getElementById('authMessage');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const toggleAuthModeBtn = document.getElementById('toggleAuthModeBtn');
const joinClassBtn = document.getElementById('joinClassBtn');
const applyScholarshipBtn = document.getElementById('applyScholarshipBtn');
const appSection = document.getElementById('appSection');
const protectedNotice = document.getElementById('protectedNotice');

let isRegisterMode = false;
let currentStep = 0;
let paymentStatus = 'pending';
let paymentReference = '';
let currentSession = null;

hamburger?.addEventListener('click', () => sidebar?.classList.toggle('open'));

function openModal() {
  authModal.style.display = 'flex';
}

function closeModal() {
  authModal.style.display = 'none';
}

function setAuthMode(registerMode) {
  isRegisterMode = registerMode;
  authTitle.textContent = registerMode ? 'Register' : 'Login';
  roleField.style.display = registerMode ? 'block' : 'none';
  authName.parentElement.style.display = registerMode ? 'block' : 'none';
  authSubmitBtn.textContent = registerMode ? 'Register' : 'Login';
  toggleAuthModeBtn.textContent = registerMode ? 'Already have account? Login' : 'New user? Register';
  authMessage.textContent = '';
}

function renderByRole() {
  const isLoggedIn = Boolean(currentSession);
  openAuthBtn.style.display = isLoggedIn ? 'none' : 'inline-block';
  logoutBtn.style.display = isLoggedIn ? 'inline-block' : 'none';

  if (!isLoggedIn) {
    appSection.style.display = 'none';
    protectedNotice.style.display = 'block';
    return;
  }

  if (currentSession.role === 'admin') {
    window.location.href = '/sangam-admin';
    return;
  }

  appSection.style.display = 'block';
  protectedNotice.style.display = 'none';
}

async function loadSession() {
  const response = await fetch('/api/auth/session');
  if (!response.ok) {
    currentSession = null;
    renderByRole();
    return;
  }
  const data = await response.json();
  currentSession = data.user;
  renderByRole();
}

openAuthBtn?.addEventListener('click', openModal);
closeAuthBtn?.addEventListener('click', closeModal);

toggleAuthModeBtn?.addEventListener('click', () => setAuthMode(!isRegisterMode));

joinClassBtn?.addEventListener('click', (event) => {
  event.preventDefault();
  if (!currentSession) {
    window.location.href = '/login';
    return;
  }
  if (currentSession.role === 'admin') {
    window.location.href = '/sangam-admin';
    return;
  }
  window.location.href = '/student-dashboard';
});

applyScholarshipBtn?.addEventListener('click', (event) => {
  event.preventDefault();
  if (!currentSession) {
    window.location.href = '/login';
    return;
  }
  if (currentSession.role === 'admin') {
    window.location.href = '/sangam-admin';
    return;
  }
  appSection.scrollIntoView({ behavior: 'smooth' });
});

logoutBtn?.addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  currentSession = null;
  renderByRole();
});

authForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
  const payload = isRegisterMode
    ? {
        name: authName.value.trim(),
        email: authEmail.value.trim(),
        password: authPassword.value,
        role: authRole.value,
      }
    : {
        email: authEmail.value.trim(),
        password: authPassword.value,
      };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();

  if (!response.ok) {
    authMessage.textContent = data.error || 'Authentication failed';
    return;
  }

  currentSession = data.user;
  authForm.reset();
  closeModal();
  renderByRole();

  if (currentSession.role === 'admin') {
    window.location.href = '/sangam-admin';
  }
});

function renderStep() {
  steps.forEach((step, index) => step.classList.toggle('active', index === currentStep));
  prevBtn.style.display = currentStep === 0 ? 'none' : 'inline-block';
  nextBtn.style.display = currentStep === steps.length - 1 ? 'none' : 'inline-block';
  submitBtn.style.display = currentStep === steps.length - 1 ? 'inline-block' : 'none';
  submitBtn.disabled = paymentStatus !== 'success';
}

function validateCurrentStep() {
  const currentFields = steps[currentStep].querySelectorAll('input[required], select[required], textarea[required]');
  for (const field of currentFields) {
    if (!field.value.trim()) {
      field.focus();
      return false;
    }
  }
  return true;
}

prevBtn.addEventListener('click', () => {
  if (currentStep > 0) {
    currentStep -= 1;
    renderStep();
  }
});

nextBtn.addEventListener('click', () => {
  if (!validateCurrentStep()) {
    message.textContent = 'Please complete required fields before moving ahead.';
    return;
  }
  message.textContent = '';
  if (currentStep < steps.length - 1) {
    currentStep += 1;
    renderStep();
  }
});

payBtn.addEventListener('click', () => {
  payBtn.disabled = true;
  paymentStatusLabel.textContent = 'Processing mock payment...';

  setTimeout(() => {
    paymentStatus = 'success';
    paymentReference = `MOCK-${Date.now()}`;
    paymentStatusLabel.textContent = `Payment success: ${paymentReference}`;
    renderStep();
  }, 1000);
});

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!currentSession || currentSession.role !== 'user') {
    message.textContent = 'Login as a user to submit scholarship form.';
    return;
  }

  if (paymentStatus !== 'success') {
    message.textContent = 'Submit is locked until payment succeeds.';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.classList.add('submit-loading');
  message.textContent = 'Submitting...';

  const file = document.getElementById('document').files[0];
  const payload = {
    fullName: document.getElementById('fullName').value,
    phone: document.getElementById('phone').value,
    email: document.getElementById('email').value,
    dateOfBirth: document.getElementById('dateOfBirth').value,
    address: document.getElementById('address').value,
    schoolName: document.getElementById('schoolName').value,
    board: document.getElementById('board').value,
    className: document.getElementById('className').value,
    paymentStatus,
    paymentReference,
    document: file
      ? {
          fileName: file.name,
          mimeType: file.type,
          base64: await fileToBase64(file),
        }
      : null,
  };

  const response = await fetch('/api/student/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    message.textContent = data.error || 'Submission failed';
    submitBtn.disabled = false;
    submitBtn.classList.remove('submit-loading');
    return;
  }

  message.textContent = `Form submitted successfully. Student ID: ${data.student.id}`;
  form.reset();
  paymentStatus = 'pending';
  paymentReference = '';
  payBtn.disabled = false;
  paymentStatusLabel.textContent = 'Payment pending';
  currentStep = 0;
  submitBtn.classList.remove('submit-loading');
  renderStep();
});

setAuthMode(false);
renderStep();
loadSession();
