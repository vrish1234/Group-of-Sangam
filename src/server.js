const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  createStudent,
  getStudents,
  updateStudentById,
  setGlobalResultPublished,
  getGlobalResultPublished,
  uploadDocument,
  getAllStudentsForExport,
} = require('./services/supabaseClient');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const users = [
  { id: '1', name: 'Super Admin', email: 'admin@sangam.local', password: 'admin123', role: 'admin' },
];
const sessions = new Map();

const sendJson = (res, code, payload) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(payload)); };
const redirect = (res, location) => { res.writeHead(302, { Location: location }); res.end(); };
const getContentType = (filePath) => filePath.endsWith('.html') ? 'text/html; charset=utf-8' : filePath.endsWith('.css') ? 'text/css; charset=utf-8' : filePath.endsWith('.js') ? 'application/javascript; charset=utf-8' : filePath.endsWith('.svg') ? 'image/svg+xml' : 'text/plain; charset=utf-8';

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) return sendJson(res, 404, { error: 'Not found' });
    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    res.end(data);
  });
}

function parseCookies(req) {
  return (req.headers.cookie || '').split(';').reduce((acc, item) => {
    const [k, v] = item.split('=');
    if (k && v) acc[k.trim()] = decodeURIComponent(v.trim());
    return acc;
  }, {});
}

const setSessionCookie = (res, token) => res.setHeader('Set-Cookie', `session=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax`);
const clearSessionCookie = (res) => res.setHeader('Set-Cookie', 'session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
const getSessionUser = (req) => sessions.get(parseCookies(req).session) || null;

function requirePageSession(req, res, role) {
  const user = getSessionUser(req);
  if (!user || (role && user.role !== role)) return false;
  return true;
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk.toString(); });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error('Invalid JSON payload')); }
    });
    req.on('error', reject);
  });
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const row = {};
    headers.forEach((header, idx) => { row[header] = values[idx] || ''; });
    return row;
  });
}

function toExcelXml(rows) {
  const header = `<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Students"><Table>`;
  const footer = '</Table></Worksheet></Workbook>';
  const columns = ['id', 'full_name', 'phone', 'email', 'date_of_birth', 'address', 'school_name', 'board', 'class_name', 'payment_status', 'payment_reference', 'roll_number', 'exam_center', 'result_status', 'document_url', 'created_at'];
  const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const headerRow = `<Row>${columns.map((col) => `<Cell><Data ss:Type="String">${esc(col)}</Data></Cell>`).join('')}</Row>`;
  const rowsXml = rows.map((row) => `<Row>${columns.map((col) => `<Cell><Data ss:Type="String">${esc(row[col])}</Data></Cell>`).join('')}</Row>`).join('');
  return `${header}${headerRow}${rowsXml}${footer}`;
}

const sanitizeUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

async function handleApi(req, res, pathname, query) {
  if (pathname === '/api/health' && req.method === 'GET') return sendJson(res, 200, { ok: true });

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const expectedRole = body.expectedRole;
    const user = users.find((it) => it.email === email && it.password === password);
    if (!user) return sendJson(res, 401, { error: 'Invalid credentials' });
    if (expectedRole && user.role !== expectedRole) return sendJson(res, 403, { error: 'Role access denied' });
    const token = crypto.randomBytes(24).toString('hex');
    sessions.set(token, sanitizeUser(user));
    setSessionCookie(res, token);
    return sendJson(res, 200, { user: sanitizeUser(user) });
  }

  if (pathname === '/api/auth/register' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const role = body.role === 'admin' ? 'admin' : 'user';
    if (!name || !email || !password) return sendJson(res, 400, { error: 'Name, email and password are required.' });
    if (users.some((u) => u.email === email)) return sendJson(res, 409, { error: 'Email already registered.' });
    users.push({ id: String(users.length + 1), name, email, password, role });
    return sendJson(res, 201, { ok: true });
  }

  if (pathname === '/api/auth/session' && req.method === 'GET') {
    const user = getSessionUser(req);
    if (!user) return sendJson(res, 401, { error: 'No active session' });
    return sendJson(res, 200, { user });
  }

  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    const token = parseCookies(req).session;
    if (token) sessions.delete(token);
    clearSessionCookie(res);
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/student/register' && req.method === 'POST') {
    const user = getSessionUser(req);
    if (!user || user.role !== 'user') return sendJson(res, 401, { error: 'Authentication required' });
    const body = await parseJsonBody(req);
    if (body.paymentStatus !== 'success') return sendJson(res, 400, { error: 'Payment must be completed before submission.' });

    const createdRows = await createStudent({
      full_name: body.fullName,
      phone: body.phone,
      email: body.email,
      date_of_birth: body.dateOfBirth,
      address: body.address,
      school_name: body.schoolName,
      board: body.board,
      class_name: body.className,
      payment_status: body.paymentStatus,
      payment_reference: body.paymentReference,
      result_status: 'pending',
    });
    const created = createdRows[0];
    if (body.document && body.document.base64 && body.document.fileName) {
      const uploaded = await uploadDocument({
        studentId: created.id,
        fileName: body.document.fileName,
        mimeType: body.document.mimeType,
        fileBuffer: Buffer.from(body.document.base64, 'base64'),
      });
      await updateStudentById(created.id, { document_url: uploaded.publicUrl });
      created.document_url = uploaded.publicUrl;
    }
    return sendJson(res, 201, { student: created });
  }

  if (pathname === '/api/admin/students' && req.method === 'GET') {
    const user = getSessionUser(req);
    if (!user || user.role !== 'admin') return sendJson(res, 401, { error: 'Authentication required' });
    const page = Number(query.get('page') || 1);
    const result = await getStudents({ page, pageSize: 50 });
    const resultPublished = await getGlobalResultPublished();
    return sendJson(res, 200, { ...result, resultPublished });
  }

  if (pathname === '/api/admin/bulk-assign' && req.method === 'POST') {
    const user = getSessionUser(req);
    if (!user || user.role !== 'admin') return sendJson(res, 401, { error: 'Authentication required' });
    const records = parseCsv((await parseJsonBody(req)).csv || '');
    let updatedCount = 0;
    for (const record of records) {
      if (!record.id) continue;
      await updateStudentById(record.id, { roll_number: record.roll_number || null, exam_center: record.exam_center || null });
      updatedCount += 1;
    }
    return sendJson(res, 200, { updatedCount });
  }

  if (pathname === '/api/admin/result-toggle' && req.method === 'POST') {
    const user = getSessionUser(req);
    if (!user || user.role !== 'admin') return sendJson(res, 401, { error: 'Authentication required' });
    const isPublished = Boolean((await parseJsonBody(req)).isPublished);
    await setGlobalResultPublished(isPublished);
    return sendJson(res, 200, { isPublished });
  }

  if (pathname === '/api/admin/export' && req.method === 'GET') {
    const user = getSessionUser(req);
    if (!user || user.role !== 'admin') return sendJson(res, 401, { error: 'Authentication required' });
    const xml = toExcelXml(await getAllStudentsForExport());
    res.writeHead(200, { 'Content-Type': 'application/vnd.ms-excel', 'Content-Disposition': `attachment; filename="students-export-${Date.now()}.xls"` });
    res.end(xml);
    return;
  }

  return sendJson(res, 404, { error: 'API route not found' });
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    if (pathname.startsWith('/api/')) return await handleApi(req, res, pathname, url.searchParams);

    if (pathname === '/' || pathname === '/index.html') return sendFile(res, path.join(PUBLIC_DIR, 'index.html'));
    if (pathname === '/student-login') return sendFile(res, path.join(PUBLIC_DIR, 'student-login.html'));
    if (pathname === '/management-login') return sendFile(res, path.join(PUBLIC_DIR, 'management-login.html'));

    if (pathname === '/student-dashboard') {
      if (!requirePageSession(req, res, 'user')) return redirect(res, '/student-login');
      return sendFile(res, path.join(PUBLIC_DIR, 'student-dashboard.html'));
    }

    if (pathname === '/management-dashboard' || pathname === '/sangam-admin') {
      if (!requirePageSession(req, res, 'admin')) return redirect(res, '/management-login');
      return sendFile(res, path.join(PUBLIC_DIR, 'management-dashboard.html'));
    }

    const requestedPath = path.join(PUBLIC_DIR, pathname);
    if (requestedPath.startsWith(PUBLIC_DIR) && fs.existsSync(requestedPath)) return sendFile(res, requestedPath);

    return sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    return sendJson(res, 500, { error: error.message });
  }
}).listen(PORT, () => {
  console.log(`Sangam portal running on http://localhost:${PORT}`);
});
