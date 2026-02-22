const studentsTable = document.getElementById('studentsTable');
const publishNoticeBtn = document.getElementById('publishNoticeBtn');
const noticeMsg = document.getElementById('noticeMsg');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');
const youtubeUrlInput = document.getElementById('youtubeUrl');
const broadcastBtn = document.getElementById('broadcastBtn');
const streamMsg = document.getElementById('streamMsg');
const chatLog = document.getElementById('chatLog');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');

function appendChat(item) {
  const div = document.createElement('div');
  div.style.marginBottom = '8px';
  div.innerHTML = `<strong>${item.sender}</strong> <span class="notice">(${item.role})</span><br/>${item.message}`;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

async function ensureAdmin() {
  const response = await fetch('/api/auth/session');
  if (!response.ok) {
    alert('Please Login');
    window.location.href = '/management-login';
    return null;
  }
  const data = await response.json();
  if (data.user.role !== 'admin') {
    window.location.href = '/student-dashboard';
    return null;
  }
  return data.user;
}

async function loadStudents() {
  const response = await fetch('/api/admin/students?page=1');
  const data = await response.json();
  if (!response.ok) {
    studentsTable.innerHTML = `<tr><td colspan="7">${data.error || 'Failed to load records'}</td></tr>`;
    return;
  }
  studentsTable.innerHTML = data.data.map((student) => {
    const status = student.result_status || 'pending';
    const canApprove = status !== 'approved';
    return `<tr>
      <td>${student.id}</td>
      <td>${student.full_name || ''}</td>
      <td>${student.school_name || ''}</td>
      <td>${student.class_name || ''}</td>
      <td>${student.payment_status || ''}</td>
      <td>${status}</td>
      <td>${canApprove ? `<button data-id="${student.id}" class="approve-btn">Approve</button>` : '<span class="notice">Approved</span>'}</td>
    </tr>`;
  }).join('');

  studentsTable.querySelectorAll('.approve-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const response = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: btn.dataset.id }),
      });
      const data = await response.json();
      noticeMsg.textContent = response.ok ? `Student ${data.studentId} approved.` : (data.error || 'Approval failed');
      await loadStudents();
    });
  });
}

broadcastBtn.addEventListener('click', async () => {
  const youtubeUrl = youtubeUrlInput.value.trim();
  const response = await fetch('/api/admin/live', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ youtubeUrl }) });
  const data = await response.json();
  streamMsg.textContent = response.ok ? `Live broadcast synced: ${data.youtubeUrl || 'Stream stopped'}` : (data.error || 'Failed to set stream');
});

publishNoticeBtn.addEventListener('click', async () => {
  const message = document.getElementById('newNotice').value.trim();
  const response = await fetch('/api/admin/notification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) });
  const data = await response.json();
  noticeMsg.textContent = response.ok ? `Notification sent: ${data.message}` : (data.error || 'Failed to publish');
});

sendChatBtn.addEventListener('click', async () => {
  const message = chatInput.value.trim();
  if (!message) return;
  const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) });
  if (response.ok) chatInput.value = '';
});

adminLogoutBtn.addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/management-login';
});

(async () => {
  const user = await ensureAdmin();
  if (!user) return;

  await loadStudents();
  const chatRes = await fetch('/api/chat');
  if (chatRes.ok) {
    const data = await chatRes.json();
    chatLog.innerHTML = '';
    data.items.forEach(appendChat);
  }

  const events = new EventSource('/api/events');
  events.addEventListener('chat', (event) => appendChat(JSON.parse(event.data)));
  events.addEventListener('snapshot', (event) => {
    const data = JSON.parse(event.data);
    if (data.liveState?.youtubeUrl) youtubeUrlInput.value = data.liveState.youtubeUrl;
  });
})();
