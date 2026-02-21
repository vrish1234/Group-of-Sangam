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

const paymentOrders = new Map();
const verifiedTransactions = new Map();

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function sendFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function getContentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'text/plain; charset=utf-8';
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk.toString();
      if (raw.length > 20 * 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = (values[index] || '').trim();
    });
    return row;
  });
}

function splitCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function toExcelXml(rows) {
  const header = `<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Students"><Table>`;
  const footer = '</Table></Worksheet></Workbook>';

  const columns = [
    'id', 'full_name', 'phone', 'email', 'date_of_birth', 'address', 'school_name', 'board',
    'class_name', 'payment_status', 'payment_reference', 'roll_number', 'exam_center',
    'result_status', 'document_url', 'created_at',
  ];

  const escape = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const headerRow = `<Row>${columns.map((col) => `<Cell><Data ss:Type="String">${escape(col)}</Data></Cell>`).join('')}</Row>`;
  const dataRows = rows.map((row) => `<Row>${columns.map((col) => `<Cell><Data ss:Type="String">${escape(row[col])}</Data></Cell>`).join('')}</Row>`).join('');

  return `${header}${headerRow}${dataRows}${footer}`;
}

function createDummyOrder({ amount = 19900, currency = 'INR' }) {
  const orderId = `order_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  paymentOrders.set(orderId, { amount, currency, createdAt: Date.now() });
  return { orderId, amount, currency };
}

function verifyDummySignature({ orderId, paymentId, signature }) {
  const existingOrder = paymentOrders.get(orderId);
  if (!existingOrder) {
    return { ok: false, error: 'Invalid order id' };
  }

  const expectedSignature = `dummy-sign-${orderId}-${paymentId}`;
  if (signature !== expectedSignature) {
    return { ok: false, error: 'Invalid payment signature' };
  }

  const transactionId = `TXN-${Date.now()}-${paymentId.slice(-6)}`;
  verifiedTransactions.set(transactionId, {
    orderId,
    paymentId,
    amount: existingOrder.amount,
    currency: existingOrder.currency,
    verifiedAt: Date.now(),
  });

  return { ok: true, transactionId, amount: existingOrder.amount, currency: existingOrder.currency };
}

async function handleApi(req, res, pathname, query) {
  if (pathname === '/api/health' && req.method === 'GET') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname === '/api/payment/create-order' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const amount = Number(body.amount || 19900);
    const currency = body.currency || 'INR';
    const order = createDummyOrder({ amount, currency });
    sendJson(res, 200, { success: true, ...order });
    return;
  }

  if (pathname === '/api/payment/verify' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const check = verifyDummySignature({
      orderId: body.orderId,
      paymentId: body.paymentId,
      signature: body.signature,
    });

    if (!check.ok) {
      sendJson(res, 400, { success: false, error: check.error });
      return;
    }

    sendJson(res, 200, { success: true, transactionId: check.transactionId, amount: check.amount, currency: check.currency });
    return;
  }

  if (pathname === '/api/student/register' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const {
      fullName,
      phone,
      email,
      dateOfBirth,
      address,
      schoolName,
      board,
      className,
      document,
      payment,
    } = body;

    if (!payment || payment.status !== 'success' || !payment.transactionId) {
      sendJson(res, 400, { error: 'Payment verification is mandatory before submission.' });
      return;
    }

    const verified = verifiedTransactions.get(payment.transactionId);
    if (!verified || verified.orderId !== payment.orderId || verified.paymentId !== payment.paymentId) {
      sendJson(res, 400, { error: 'Payment transaction is not verified.' });
      return;
    }

    const createdRows = await createStudent({
      full_name: fullName,
      phone,
      email,
      date_of_birth: dateOfBirth,
      address,
      school_name: schoolName,
      board,
      class_name: className,
      payment_status: 'success',
      payment_reference: payment.transactionId,
      result_status: 'pending',
    });

    const created = createdRows[0];

    if (document && document.base64 && document.fileName) {
      const fileBuffer = Buffer.from(document.base64, 'base64');
      const uploaded = await uploadDocument({
        studentId: created.id,
        fileName: document.fileName,
        mimeType: document.mimeType,
        fileBuffer,
      });

      await updateStudentById(created.id, { document_url: uploaded.publicUrl });
      created.document_url = uploaded.publicUrl;
    }

    sendJson(res, 201, { student: created, transactionId: payment.transactionId });
    return;
  }

  if (pathname === '/api/admin/students' && req.method === 'GET') {
    const page = Number(query.get('page') || 1);
    const result = await getStudents({ page, pageSize: 50 });
    const resultPublished = await getGlobalResultPublished();
    sendJson(res, 200, { ...result, resultPublished });
    return;
  }

  if (pathname === '/api/admin/bulk-assign' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const records = parseCsv(body.csv || '');
    let updatedCount = 0;

    for (const record of records) {
      if (!record.id) {
        continue;
      }

      await updateStudentById(record.id, {
        roll_number: record.roll_number || null,
        exam_center: record.exam_center || null,
      });
      updatedCount += 1;
    }

    sendJson(res, 200, { updatedCount });
    return;
  }

  if (pathname === '/api/admin/result-toggle' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const isPublished = Boolean(body.isPublished);
    await setGlobalResultPublished(isPublished);
    sendJson(res, 200, { isPublished });
    return;
  }

  if (pathname === '/api/admin/export' && req.method === 'GET') {
    const rows = await getAllStudentsForExport();
    const xml = toExcelXml(rows);
    res.writeHead(200, {
      'Content-Type': 'application/vnd.ms-excel',
      'Content-Disposition': `attachment; filename="students-export-${Date.now()}.xls"`,
    });
    res.end(xml);
    return;
  }

  sendJson(res, 404, { error: 'API route not found' });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const { pathname } = url;

    if (pathname.startsWith('/api/')) {
      await handleApi(req, res, pathname, url.searchParams);
      return;
    }

    if (pathname === '/' || pathname === '/index.html') {
      sendFile(res, path.join(PUBLIC_DIR, 'index.html'), 'text/html; charset=utf-8');
      return;
    }

    if (pathname === '/management-login') {
      sendFile(res, path.join(PUBLIC_DIR, 'management-login.html'), 'text/html; charset=utf-8');
      return;
    }

    const requestedPath = path.join(PUBLIC_DIR, pathname);
    if (requestedPath.startsWith(PUBLIC_DIR) && fs.existsSync(requestedPath)) {
      sendFile(res, requestedPath, getContentType(requestedPath));
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Gyan Setu portal running on http://localhost:${PORT}`);
});
