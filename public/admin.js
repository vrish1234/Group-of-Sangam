const csvInput = document.getElementById('csvInput');
const bulkUploadBtn = document.getElementById('bulkUploadBtn');
const bulkMsg = document.getElementById('bulkMsg');
const resultToggle = document.getElementById('resultToggle');
const resultMsg = document.getElementById('resultMsg');
const exportBtn = document.getElementById('exportBtn');
const studentsTable = document.getElementById('studentsTable');
const pageInfo = document.getElementById('pageInfo');
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');
const hamburger = document.getElementById('hamburger');
const sidebar = document.getElementById('sidebar');

let page = 1;
let totalPages = 1;

hamburger?.addEventListener('click', () => {
  sidebar?.classList.toggle('open');
});

function badge(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'success' || normalized === 'paid') {
    return '<span class="status-badge status-paid">PAID</span>';
  }
  if (normalized === 'pending') {
    return '<span class="status-badge status-pending">PENDING</span>';
  }
  return '<span class="status-badge status-verification">VERIFICATION</span>';
}

async function loadStudents() {
  const response = await fetch(`/api/admin/students?page=${page}`);
  const data = await response.json();
  if (!response.ok) {
    pageInfo.textContent = data.error || 'Failed to load students';
    return;
  }

  totalPages = data.totalPages;
  studentsTable.innerHTML = data.data.map((student) => `
    <tr>
      <td>${student.id}</td>
      <td>${student.full_name || ''}</td>
      <td>${student.school_name || ''}</td>
      <td>${student.class_name || ''}</td>
      <td>${badge(student.payment_status)}</td>
      <td>${student.roll_number || ''}</td>
      <td>${student.exam_center || ''}</td>
    </tr>
  `).join('');

  pageInfo.textContent = `Page ${data.page} of ${data.totalPages} | Total students: ${data.total} | Result published: ${data.resultPublished}`;
  resultToggle.checked = data.resultPublished;
  prevPage.disabled = page <= 1;
  nextPage.disabled = page >= totalPages;
}

bulkUploadBtn.addEventListener('click', async () => {
  const response = await fetch('/api/admin/bulk-assign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csv: csvInput.value }),
  });
  const data = await response.json();
  bulkMsg.textContent = response.ok
    ? `Bulk update complete. Updated ${data.updatedCount} records.`
    : (data.error || 'Bulk update failed');
  await loadStudents();
});

resultToggle.addEventListener('change', async () => {
  const response = await fetch('/api/admin/result-toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isPublished: resultToggle.checked }),
  });
  const data = await response.json();
  resultMsg.textContent = response.ok
    ? `Result publish status set to ${data.isPublished}`
    : (data.error || 'Failed to set publish switch');
  await loadStudents();
});

exportBtn.addEventListener('click', () => {
  window.location.href = '/api/admin/export';
});

prevPage.addEventListener('click', async () => {
  if (page > 1) {
    page -= 1;
    await loadStudents();
  }
});

nextPage.addEventListener('click', async () => {
  if (page < totalPages) {
    page += 1;
    await loadStudents();
  }
});

loadStudents();
