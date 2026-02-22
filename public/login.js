const authForm = document.getElementById('authForm');
const roleWrap = document.getElementById('roleWrap');
const toggleBtn = document.getElementById('toggleBtn');
const submitBtn = document.getElementById('submitBtn');

let isRegister = false;

function updateMode() {
  roleWrap.style.display = isRegister ? 'block' : 'none';
  submitBtn.textContent = isRegister ? 'Register' : 'Login';
  toggleBtn.textContent = isRegister ? 'Already have account? Login' : 'Create account';
}

toggleBtn.addEventListener('click', () => {
  isRegister = !isRegister;
  updateMode();
});

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
  const payload = isRegister
    ? {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
        role: document.getElementById('role').value,
      }
    : {
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
      };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();

  if (!response.ok) {
    alert(data.error || 'Invalid Credentials');
    return;
  }

  if (data.user.role === 'admin') {
    window.location.href = '/sangam-admin';
  } else {
    window.location.href = '/student-dashboard';
  }
});

(async () => {
  const response = await fetch('/api/auth/session');
  if (!response.ok) return;
  const data = await response.json();
  window.location.href = data.user.role === 'admin' ? '/sangam-admin' : '/student-dashboard';
})();

updateMode();
