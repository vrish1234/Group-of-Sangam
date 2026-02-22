const welcomeTitle = document.getElementById('welcomeTitle');
const profileMeta = document.getElementById('profileMeta');
const liveContainer = document.getElementById('liveContainer');
const livePlaceholder = document.getElementById('livePlaceholder');
const chatLog = document.getElementById('chatLog');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const logoutBtn = document.getElementById('logoutBtn');

function appendChat(item) {
  const div = document.createElement('div');
  div.style.marginBottom = '8px';
  div.innerHTML = `<strong>${item.sender}</strong> <span class="notice">(${item.role})</span><br/>${item.message}`;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function renderLive(youtubeUrl) {
  if (!youtubeUrl) {
    liveContainer.innerHTML = '<p id="livePlaceholder" class="notice">Wait for the next live session.</p>';
    return;
  }
  const embed = youtubeUrl.includes('watch?v=') ? youtubeUrl.replace('watch?v=', 'embed/') : youtubeUrl;
  liveContainer.innerHTML = `<iframe title="Live Class" src="${embed}" style="width:100%;height:360px;border:0;border-radius:12px;" allowfullscreen></iframe>`;
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
  });
  events.addEventListener('live', (event) => {
    const data = JSON.parse(event.data);
    renderLive(data.youtubeUrl);
  });
  events.addEventListener('chat', (event) => appendChat(JSON.parse(event.data)));
}

sendChatBtn.addEventListener('click', async () => {
  const message = chatInput.value.trim();
  if (!message) return;
  const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) });
  if (response.ok) chatInput.value = '';
});

logoutBtn.addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/student-login';
});

boot();
