const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'student-documents';

function assertConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables.');
  }
}

async function supabaseRequest(path, { method = 'GET', body, headers = {}, accept = 'application/json' } = {}) {
  assertConfig();

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Accept: accept,
      'Content-Type': body && !(body instanceof Buffer) ? 'application/json' : headers['Content-Type'],
      ...headers,
    },
    body: body ? (body instanceof Buffer ? body : JSON.stringify(body)) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${text}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

async function createStudent(payload) {
  return supabaseRequest('/rest/v1/students', {
    method: 'POST',
    headers: {
      Prefer: 'return=representation',
    },
    body: payload,
  });
}

async function getStudents({ page = 1, pageSize = 50 }) {
  const offset = (page - 1) * pageSize;
  const end = offset + pageSize - 1;

  const query = `/rest/v1/students?select=id,full_name,phone,email,school_name,board,class_name,payment_status,roll_number,exam_center,result_status,created_at&order=created_at.desc`;

  assertConfig();
  const response = await fetch(`${SUPABASE_URL}${query}`, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Range: `${offset}-${end}`,
      Prefer: 'count=exact',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase getStudents failed (${response.status}): ${text}`);
  }

  const totalHeader = response.headers.get('content-range') || '';
  const total = Number(totalHeader.split('/')[1] || 0);
  const data = await response.json();

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

async function updateStudentById(id, patch) {
  return supabaseRequest(`/rest/v1/students?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      Prefer: 'return=representation',
    },
    body: patch,
  });
}

async function setGlobalResultPublished(isPublished) {
  const existing = await supabaseRequest('/rest/v1/system_settings?key=eq.result_published&select=id,key,value');
  if (existing.length) {
    return supabaseRequest('/rest/v1/system_settings?key=eq.result_published', {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: { value: String(isPublished) },
    });
  }

  return supabaseRequest('/rest/v1/system_settings', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: { key: 'result_published', value: String(isPublished) },
  });
}

async function getGlobalResultPublished() {
  const rows = await supabaseRequest('/rest/v1/system_settings?key=eq.result_published&select=value&limit=1');
  if (!rows.length) {
    return false;
  }
  return rows[0].value === 'true';
}

async function uploadDocument({ studentId, fileName, mimeType, fileBuffer }) {
  assertConfig();
  const safeName = `${studentId}-${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const path = `/storage/v1/object/${SUPABASE_BUCKET}/${safeName}`;

  await supabaseRequest(path, {
    method: 'POST',
    headers: {
      'Content-Type': mimeType || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: fileBuffer,
    accept: 'application/json',
  });

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${safeName}`;
  return { path: safeName, publicUrl };
}

async function getAllStudentsForExport() {
  return supabaseRequest('/rest/v1/students?select=id,full_name,phone,email,date_of_birth,address,school_name,board,class_name,payment_status,payment_reference,roll_number,exam_center,result_status,document_url,created_at&order=id.asc');
}

module.exports = {
  createStudent,
  getStudents,
  updateStudentById,
  setGlobalResultPublished,
  getGlobalResultPublished,
  uploadDocument,
  getAllStudentsForExport,
};
