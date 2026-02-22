const welcomeTitle = document.getElementById('welcomeTitle');
const profileEmail = document.getElementById('profileEmail');
const logoutBtn = document.getElementById('logoutBtn');

async function loadSession() {
  const response = await fetch('/api/auth/session');
  if (!response.ok) {
    alert('Please Login');
    window.location.href = '/student-login';
    return;
  }
  const data = await response.json();
  if (data.user.role !== 'user') {
    window.location.href = '/management-dashboard';
    return;
  }
  welcomeTitle.textContent = `Welcome, ${data.user.name}!`;
  profileEmail.textContent = `Email: ${data.user.email}`;
}

logoutBtn.addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/student-login';
});

loadSession();
