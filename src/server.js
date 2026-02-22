const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  getStudents,
  createStudent,
  updateStudentById,
  uploadDocument,
  setGlobalResultPublished,
  getGlobalResultPublished,
  getAllStudentsForExport,
} = require('./services/supabaseClient');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const DB_FILE = path.join(__dirname, '..', 'data', 'app-db.json');

function ensureLocalDb() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const seed = {
      users: [{ id: '1', name: 'Super Admin', email: 'admin@sangam.local', password: 'admin123', role: 'admin', course: 'Management' }],
      liveState: { youtubeUrl: '', notification: 'Welcome to Gyan Setu. Stay tuned for scholarship updates.', chat: [] },
      scholarshipRequests: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2));
  }
}

const users = [{ id: '1', name: 'Super Admin', email: 'admin@sangam.local', password: 'admin123', role: 'admin', course: 'Management' }];
const sessions = new Map();
const liveState = { youtubeUrl: '', notification: 'Welcome to Gyan Setu. Stay tuned for scholarship updates.', chat: [] };
const sseClients = new Set();

const sendJson = (res, code, payload) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(payload)); };
const redirect = (res, location) => { res.writeHead(302, { Location: location }); res.end(); };

const sessions = new Map();
const sseClients = new Set();

const sendJson = (res, code, payload) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(payload)); };
const redirect = (res, location) => { res.writeHead(302, { Location: location }); res.end(); };

const sessions = new Map();
const sseClients = new Set();

const sendJson = (res, code, payload) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(payload)); };
const redirect = (res, location) => { res.writeHead(302, { Location: location }); res.end(); };

const sessions = new Map();
const sseClients = new Set();

const sendJson = (res, code, payload) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(payload)); };
const redirect = (res, location) => { res.writeHead(302, { Location: location }); res.end(); };

const sessions = new Map();
const sseClients = new Set();

const sendJson = (res, code, payload) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(payload)); };
const redirect = (res, location) => { res.writeHead(302, { Location: location }); res.end(); };

const sessions = new Map();
const sseClients = new Set();

const sendJson = (res, code, payload) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(payload)); };
const redirect = (res, location) => { res.writeHead(302, { Location: location }); res.end(); };

const sessions = new Map();
const sseClients = new Set();

const sendJson = (res, code, payload) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(payload)); };
const redirect = (res, location) => { res.writeHead(302, { Location: location }); res.end(); };

const sessions = new Map();
const sseClients = new Set();

const sendJson = (res, code, payload) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(payload)); };
const redirect = (res, location) => { res.writeHead(302, { Location: location }); res.end(); };

const sessions = new Map();
const sseClients = new Set();

const sendJson = (res, code, payload) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(payload)); };
const redirect = (res, location) => { res.writeHead(302, { Location: location }); res.end(); };

const sessions = new Map();
const sseClients = new Set();

const sendJson = (res, code, payload) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(payload)); };
const redirect = (res, location) => { res.writeHead(302, { Location: location }); res.end(); };

function getContentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  return 'text/plain; charset=utf-8';
}

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

function requireRole(req, role) {
  const user = getSessionUser(req);
  if (!user || (role && user.role !== role)) return null;
  return user;
}

function protectedPage(req, res, role, loginPath) {
  const user = requireRole(req, role);
  if (!user) {
    redirect(res, loginPath);
    return null;
  }
  return user;
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

function publishEvent(type, payload) {
  const event = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  sseClients.forEach((res) => res.write(event));
}

async function handleApi(req, res, pathname, query) {
  if (pathname === '/api/health' && req.method === 'GET') return sendJson(res, 200, { ok: true });

  if (pathname === '/api/auth/register' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const role = body.role === 'admin' ? 'admin' : 'user';
    const course = role === 'admin' ? 'Management' : (String(body.course || 'Scholarship Program').trim() || 'Scholarship Program');
    if (!name || !email || !password) return sendJson(res, 400, { error: 'Name, email and password are required.' });
    if (users.some((u) => u.email === email)) return sendJson(res, 409, { error: 'Email already registered.' });
    users.push({ id: String(users.length + 1), name, email, password, role, course });
    return sendJson(res, 201, { ok: true });
  }

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const expectedRole = body.expectedRole;
    const user = users.find((u) => u.email === email && u.password === password);
    if (!user) return sendJson(res, 401, { error: 'Invalid credentials' });
    if (expectedRole && user.role !== expectedRole) return sendJson(res, 403, { error: 'Role access denied' });
    const token = crypto.randomBytes(24).toString('hex');
    const sessionUser = { id: user.id, name: user.name, email: user.email, role: user.role, course: user.course };
    sessions.set(token, sessionUser);
    setSessionCookie(res, token);
    return sendJson(res, 200, { user: sessionUser });
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

  if (pathname === '/api/events' && req.method === 'GET') {
    const user = getSessionUser(req);
    if (!user) return sendJson(res, 401, { error: 'Authentication required' });
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(`event: snapshot\ndata: ${JSON.stringify({ liveState })}\n\n`);
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  if (pathname === '/api/public-state' && req.method === 'GET') {
    return sendJson(res, 200, { notification: liveState.notification, isLive: Boolean(liveState.youtubeUrl) });
  }

  if (pathname === '/api/admin/live' && req.method === 'POST') {
    const user = requireRole(req, 'admin');
    if (!user) return sendJson(res, 401, { error: 'Authentication required' });
    const body = await parseJsonBody(req);
    liveState.youtubeUrl = String(body.youtubeUrl || '').trim();
    publishEvent('live', { youtubeUrl: liveState.youtubeUrl });
    return sendJson(res, 200, { youtubeUrl: liveState.youtubeUrl });
  }

  if (pathname === '/api/admin/notification' && req.method === 'POST') {
    const user = requireRole(req, 'admin');
    if (!user) return sendJson(res, 401, { error: 'Authentication required' });
    const body = await parseJsonBody(req);
    liveState.notification = String(body.message || '').trim() || liveState.notification;
    publishEvent('notification', { message: liveState.notification });
    return sendJson(res, 200, { message: liveState.notification });
  }

  if (pathname === '/api/chat' && req.method === 'POST') {
    const user = getSessionUser(req);
    if (!user) return sendJson(res, 401, { error: 'Authentication required' });
    const body = await parseJsonBody(req);
    const msg = String(body.message || '').trim();
    if (!msg) return sendJson(res, 400, { error: 'Message required' });
    const item = { id: Date.now(), sender: user.name, role: user.role, message: msg, time: new Date().toISOString() };
    liveState.chat.push(item);
    if (liveState.chat.length > 200) liveState.chat = liveState.chat.slice(-200);
    publishEvent('chat', item);
    return sendJson(res, 201, { item });
  }

  if (pathname === '/api/chat' && req.method === 'GET') {
    const user = getSessionUser(req);
    if (!user) return sendJson(res, 401, { error: 'Authentication required' });
    return sendJson(res, 200, { items: liveState.chat.slice(-50) });
  }


  if (pathname === '/api/admin/approve' && req.method === 'POST') {
    const user = requireRole(req, 'admin');
    if (!user) return sendJson(res, 401, { error: 'Authentication required' });
    const body = await parseJsonBody(req);
    const studentId = body.studentId;
    if (!studentId) return sendJson(res, 400, { error: 'studentId is required' });
    await updateStudentById(studentId, { result_status: 'approved' });
    return sendJson(res, 200, { studentId });
  }

  if (pathname === '/api/admin/students' && req.method === 'GET') {
    const user = requireRole(req, 'admin');
    if (!user) return sendJson(res, 401, { error: 'Authentication required' });
    const page = Number(query.get('page') || 1);
    const result = await getStudents({ page, pageSize: 50 });
    const resultPublished = await getGlobalResultPublished();
    return sendJson(res, 200, { ...result, resultPublished });
  }

  if (pathname === '/api/student/register' && req.method === 'POST') {
    const user = requireRole(req, 'user');
    if (!user) return sendJson(res, 401, { error: 'Authentication required' });
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
    if (body.document?.base64 && body.document?.fileName) {
      const uploaded = await uploadDocument({ studentId: created.id, fileName: body.document.fileName, mimeType: body.document.mimeType, fileBuffer: Buffer.from(body.document.base64, 'base64') });
      await updateStudentById(created.id, { document_url: uploaded.publicUrl });
      created.document_url = uploaded.publicUrl;
    }
    return sendJson(res, 201, { student: created });
  }

  if (pathname === '/api/admin/result-toggle' && req.method === 'POST') {
    const user = requireRole(req, 'admin');
    if (!user) return sendJson(res, 401, { error: 'Authentication required' });
    const isPublished = Boolean((await parseJsonBody(req)).isPublished);
    await setGlobalResultPublished(isPublished);
    return sendJson(res, 200, { isPublished });
  }

  if (pathname === '/api/admin/export' && req.method === 'GET') {
    const user = requireRole(req, 'admin');
    if (!user) return sendJson(res, 401, { error: 'Authentication required' });
    const rows = await getAllStudentsForExport();
    const xml = '<rows>' + rows.length + '</rows>';
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
      if (!protectedPage(req, res, 'user', '/student-login')) return;
      return sendFile(res, path.join(PUBLIC_DIR, 'student-dashboard.html'));
    }

    if (pathname === '/management-dashboard' || pathname === '/sangam-admin') {
      if (!protectedPage(req, res, 'admin', '/management-login')) return;
      return sendFile(res, path.join(PUBLIC_DIR, 'management-dashboard.html'));
    }

    const requestedPath = path.join(PUBLIC_DIR, pathname);
    if (requestedPath.startsWith(PUBLIC_DIR) && fs.existsSync(requestedPath)) return sendFile(res, requestedPath);

    return sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    return sendJson(res, 500, { error: error.message });
  }
});

server.listen(PORT, () => console.log(`Sangam portal running on http://localhost:${PORT}`));
