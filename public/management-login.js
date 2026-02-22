const form = document.getElementById('adminLoginForm');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value,
      expectedRole: 'admin',
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || 'Invalid Credentials');
    return;
  }
  window.location.href = '/management-dashboard';
});
