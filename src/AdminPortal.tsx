import React, { useEffect, useState } from 'react';
import './portal.css';

type StudentRow = {
  id: number;
  full_name: string;
  school_name: string;
  class_name: string;
  payment_status: string;
  roll_number?: string;
  exam_center?: string;
};

export default function AdminPortal() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [csv, setCsv] = useState('id,roll_number,exam_center');
  const [resultPublished, setResultPublished] = useState(false);
  const [status, setStatus] = useState('');

  function badge(state: string) {
    const normalized = (state || '').toLowerCase();
    if (normalized === 'success' || normalized === 'paid') return <span className="badge paid">PAID</span>;
    if (normalized === 'pending') return <span className="badge pending">PENDING</span>;
    return <span className="badge verify">VERIFICATION</span>;
  }

  async function load(targetPage = page) {
    const response = await fetch(`/api/admin/students?page=${targetPage}`);
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || 'Unable to fetch data.');
      return;
    }

    setRows(data.data);
    setPage(data.page);
    setTotalPages(data.totalPages);
    setTotal(data.total);
    setResultPublished(data.resultPublished);
  }

  async function runBulk() {
    const response = await fetch('/api/admin/bulk-assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv }),
    });
    const data = await response.json();
    setStatus(response.ok ? `Bulk update complete: ${data.updatedCount} records.` : (data.error || 'Bulk update failed'));
    await load(page);
  }

  async function toggleResults(next: boolean) {
    setResultPublished(next);
    const response = await fetch('/api/admin/result-toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: next }),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || 'Failed to toggle results.');
      setResultPublished((v) => !v);
      return;
    }
    setStatus(`Result publish status: ${data.isPublished ? 'Published' : 'Hidden'}`);
  }

  useEffect(() => {
    load(1);
  }, []);

  return (
    <>
      <header className="ems-topbar">
        <div className="ems-brand">
          <button className="ems-hamburger" onClick={() => setSidebarOpen((v) => !v)}>☰</button>
          <div className="ems-logo-mark" aria-hidden="true" />
          <div className="ems-brand-block">
            <span className="ems-brand-title">Gyan Setu • SBTE EMS Administration</span>
            <span className="ems-brand-sub">
              Initiative by <span className="ems-parent-brand">Group of Sangam</span>
            </span>
          </div>
        </div>
        <div className="ems-user">Admin Profile ▾ Logout</div>
      </header>

      <div className="ems-layout">
        <aside className={`ems-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <button className="active">🏠 Dashboard</button>
          <button>🗂️ Applications</button>
          <button>🎫 Admit Cards</button>
          <button>💳 Payments</button>
          <button>📊 Results</button>
        </aside>

        <main className="ems-main">
          <section className="ems-card">
            <h2 className="ems-title">Bulk Roll/Center Management</h2>
            <p className="ems-subtitle">Upload CSV in format: <code>id,roll_number,exam_center</code>.</p>
            <div className="ems-field"><label>CSV Input</label><textarea rows={6} value={csv} onChange={(e) => setCsv(e.target.value)} /></div>
            <div className="ems-actions"><button className="ems-btn" onClick={runBulk}>Run Bulk Assignment</button></div>
          </section>

          <section className="ems-card">
            <h2 className="ems-title">System Controls</h2>
            <div className="ems-actions">
              <label><input type="checkbox" checked={resultPublished} style={{ width: 'auto' }} onChange={(e) => toggleResults(e.target.checked)} /> Publish Results Globally</label>
              <button className="ems-btn" onClick={() => { window.location.href = '/api/admin/export'; }}>Export to Excel</button>
            </div>
          </section>

          <section className="ems-card">
            <h2 className="ems-title">Applications (Server-Side Pagination: 50 per page)</h2>
            <p className="ems-subtitle">Page {page} / {totalPages} · Total {total.toLocaleString()} records</p>
            <div className="ems-actions">
              <button className="ems-btn" disabled={page <= 1} onClick={() => load(Math.max(1, page - 1))}>Previous</button>
              <button className="ems-btn" disabled={page >= totalPages} onClick={() => load(Math.min(totalPages, page + 1))}>Next</button>
            </div>
            <div className="ems-table-wrap">
              <table className="ems-table">
                <thead>
                  <tr>
                    <th>ID</th><th>Name</th><th>School</th><th>Class</th><th>Status</th><th>Roll</th><th>Center</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.id}</td>
                      <td>{row.full_name}</td>
                      <td>{row.school_name}</td>
                      <td>{row.class_name}</td>
                      <td>{badge(row.payment_status)}</td>
                      <td>{row.roll_number || '-'}</td>
                      <td>{row.exam_center || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="ems-subtitle">{status}</p>

          <footer className="ems-footer">
            © 2026 <span className="ems-parent-brand">Group of Sangam</span> | Head Office: Aurangabad, Bihar.
            {' '}All scholarship branches are managed by Sangam Group.
          </footer>
        </main>
      </div>
    </>
  );
}
