const welcomeTitle = document.getElementById('welcomeTitle');
const profileMeta = document.getElementById('profileMeta');
const liveContainer = document.getElementById('liveContainer');
const chatLog = document.getElementById('chatLog');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const logoutBtn = document.getElementById('logoutBtn');
const applicationSection = document.getElementById('applicationSection');
const scholarshipStatus = document.getElementById('scholarshipStatus');
const topNotice = document.getElementById('topNotice');
const submitApplicationBtn = document.getElementById('submitApplicationBtn');
const applicationMsg = document.getElementById('applicationMsg');

function appendChat(item) {
  const div = document.createElement('div');
  div.style.marginBottom = '8px';
  div.innerHTML = `<strong>${item.sender}</strong> <span class="notice">(${item.role})</span><br/>${item.message}`;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function renderLive(youtubeUrl) {
  if (!youtubeUrl) {
    liveContainer.innerHTML = '<p class="notice">Wait for the next live session.</p>';
    return;
  }
  const embed = youtubeUrl.includes('watch?v=') ? youtubeUrl.replace('watch?v=', 'embed/') : youtubeUrl;
  liveContainer.innerHTML = `<iframe title="Live Class" src="${embed}" style="width:100%;height:360px;border:0;border-radius:12px;" allowfullscreen></iframe>`;
}

function renderScholarship(isOpen) {
  applicationSection.style.display = isOpen ? 'block' : 'none';
  scholarshipStatus.textContent = isOpen ? 'Open by Management' : 'Closed by Management';
}

async function boot() {
  const sessionResponse = await fetch('/api/auth/session');
  if (!sessionResponse.ok) {
    alert('Please Login');
    window.location.href = '/student-login';
    return;
  }
  const { user } = await sessionResponse.json();
  if (user.role !== 'user') {
    window.location.href = '/management-dashboard';
    return;
  }

  welcomeTitle.textContent = `Welcome, ${user.name}!`;
  profileMeta.textContent = `Course: ${user.course || 'Scholarship Program'} | Scholarship: Eligible`;

  const stateResponse = await fetch('/api/public-state');
  if (stateResponse.ok) {
    const state = await stateResponse.json();
    renderScholarship(Boolean(state.scholarshipOpen));
    topNotice.textContent = state.notification || 'No notifications';
  }

  const chatRes = await fetch('/api/chat');
  if (chatRes.ok) {
    const data = await chatRes.json();
    chatLog.innerHTML = '';
    data.items.forEach(appendChat);
  }

  const events = new EventSource('/api/events');
  events.addEventListener('snapshot', (event) => {
    const data = JSON.parse(event.data);
    renderLive(data.liveState.youtubeUrl);
    renderScholarship(Boolean(data.liveState.scholarshipOpen));
    topNotice.textContent = data.liveState.notification || 'No notifications';
  });
  events.addEventListener('live', (event) => renderLive(JSON.parse(event.data).youtubeUrl));
  events.addEventListener('chat', (event) => appendChat(JSON.parse(event.data)));
  events.addEventListener('notification', (event) => {
    topNotice.textContent = JSON.parse(event.data).message || 'No notifications';
  });
  events.addEventListener('scholarship', (event) => {
    renderScholarship(Boolean(JSON.parse(event.data).isOpen));
  });
}

sendChatBtn.addEventListener('click', async () => {
  const message = chatInput.value.trim();
  if (!message) return;
  const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) });
  if (response.ok) chatInput.value = '';
});

submitApplicationBtn?.addEventListener('click', async () => {
  const payload = {
    fullName: document.getElementById('fullName').value,
    phone: document.getElementById('phone').value,
    email: 'student@local',
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
  applicationMsg.textContent = response.ok ? `Application submitted. ID: ${data.student.id}` : (data.error || 'Submission failed');
});

logoutBtn.addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/student-login';
});

boot();
