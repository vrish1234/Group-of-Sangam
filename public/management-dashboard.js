const studentsTable = document.getElementById('studentsTable');
const publishNoticeBtn = document.getElementById('publishNoticeBtn');
const noticeMsg = document.getElementById('noticeMsg');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');

async function ensureAdmin() {
  const response = await fetch('/api/auth/session');
  if (!response.ok) {
    alert('Please Login');
    window.location.href = '/management-login';
    return false;
  }
  const data = await response.json();
  if (data.user.role !== 'admin') {
    window.location.href = '/student-dashboard';
    return false;
  }
  return true;
}

async function loadStudents() {
  const response = await fetch('/api/admin/students?page=1');
  const data = await response.json();
  if (!response.ok) {
    studentsTable.innerHTML = `<tr><td colspan="5">${data.error || 'Failed to load records'}</td></tr>`;
    return;
  }
  studentsTable.innerHTML = data.data.map((student) => `
    <tr>
      <td>${student.id}</td>
      <td>${student.full_name || ''}</td>
      <td>${student.school_name || ''}</td>
      <td>${student.class_name || ''}</td>
      <td>${student.payment_status || ''}</td>
    </tr>
  `).join('');
}

publishNoticeBtn.addEventListener('click', () => {
  noticeMsg.textContent = 'Notification posted successfully (UI placeholder).';
});

adminLogoutBtn.addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/management-login';
});

(async () => {
  const ok = await ensureAdmin();
  if (ok) await loadStudents();
})();
