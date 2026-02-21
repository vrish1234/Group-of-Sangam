import React, { FormEvent, useMemo, useState } from 'react';
import './portal.css';

type Step = 1 | 2 | 3;

export default function App() {
  const [step, setStep] = useState<Step>(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [form, setForm] = useState({
    fullName: '', phone: '', email: '', dateOfBirth: '', address: '', schoolName: '', board: '', className: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success'>('pending');
  const [paymentReference, setPaymentReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const canGoNext = useMemo(() => {
    if (step === 1) return !!(form.fullName && form.phone && form.email && form.dateOfBirth && form.address);
    if (step === 2) return !!(form.schoolName && form.board && form.className);
    return true;
  }, [step, form]);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function toBase64(f: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  }

  async function mockPay() {
    setMessage('Processing mock payment...');
    await new Promise((r) => setTimeout(r, 1000));
    const ref = `MOCK-${Date.now()}`;
    setPaymentStatus('success');
    setPaymentReference(ref);
    setMessage(`Payment successful: ${ref}`);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (paymentStatus !== 'success') {
      setMessage('Submission is locked until payment is successful.');
      return;
    }

    setSubmitting(true);
    const payload = {
      ...form,
      paymentStatus,
      paymentReference,
      document: file ? { fileName: file.name, mimeType: file.type, base64: await toBase64(file) } : null,
    };

    const response = await fetch('/api/student/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || 'Submission failed.');
      setSubmitting(false);
      return;
    }

    setMessage(`Application submitted successfully. Student ID: ${data.student.id}`);
    setSubmitting(false);
    setStep(1);
    setPaymentStatus('pending');
    setPaymentReference('');
  }

  return (
    <>
      <header className="ems-topbar">
        <div className="ems-brand">
          <button className="ems-hamburger" onClick={() => setSidebarOpen((v) => !v)}>☰</button>
          <div className="ems-logo-mark" aria-hidden="true" />
          <div className="ems-brand-block">
            <span className="ems-brand-title">Gyan Setu • SBTE EMS</span>
            <span className="ems-brand-sub">
              Initiative by <span className="ems-parent-brand">Group of Sangam</span>
            </span>
          </div>
        </div>
        <div className="ems-user">User Profile ▾ Logout</div>
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
            <h2 className="ems-title">Scholarship Application</h2>
            <p className="ems-subtitle">3-step workflow with payment-gated final submit and cloud persistence.</p>

            <div className="ems-steps">
              <div className={`ems-step-chip ${step === 1 ? 'active' : ''}`}>Step 1: Personal</div>
              <div className={`ems-step-chip ${step === 2 ? 'active' : ''}`}>Step 2: Academic</div>
              <div className={`ems-step-chip ${step === 3 ? 'active' : ''}`}>Step 3: Documents + Payment</div>
            </div>

            <form onSubmit={submit}>
              {step === 1 && (
                <div className="ems-grid-3">
                  <div className="ems-field"><label>Full Name</label><input value={form.fullName} onChange={(e) => update('fullName', e.target.value)} /></div>
                  <div className="ems-field"><label>Phone</label><input value={form.phone} onChange={(e) => update('phone', e.target.value)} /></div>
                  <div className="ems-field"><label>Email</label><input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} /></div>
                  <div className="ems-field"><label>Date of Birth</label><input type="date" value={form.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} /></div>
                  <div className="ems-field"><label>Address</label><input value={form.address} onChange={(e) => update('address', e.target.value)} /></div>
                </div>
              )}

              {step === 2 && (
                <div className="ems-grid-3">
                  <div className="ems-field"><label>School Name</label><input value={form.schoolName} onChange={(e) => update('schoolName', e.target.value)} /></div>
                  <div className="ems-field"><label>Board</label><input value={form.board} onChange={(e) => update('board', e.target.value)} /></div>
                  <div className="ems-field"><label>Class</label><input value={form.className} onChange={(e) => update('className', e.target.value)} /></div>
                </div>
              )}

              {step === 3 && (
                <div className="ems-card" style={{ marginBottom: 0 }}>
                  <div className="ems-grid-3">
                    <div className="ems-field"><label>Document Upload</label><input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
                  </div>
                  <div className="ems-actions">
                    <button className="ems-btn" type="button" onClick={mockPay} disabled={paymentStatus === 'success'}>Pay ₹199 (Mock)</button>
                  </div>
                  <p className="ems-subtitle" style={{ marginTop: 10 }}>Payment: {paymentStatus === 'success' ? paymentReference : 'Pending'}</p>
                </div>
              )}

              <div className="ems-actions">
                <button className="ems-btn" type="button" disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1) as Step)}>Previous</button>
                <button className="ems-btn" type="button" disabled={step === 3} onClick={() => canGoNext && setStep((s) => Math.min(3, s + 1) as Step)}>Next</button>
                <button className={`ems-btn ${submitting ? 'loading' : ''}`} type="submit" disabled={step !== 3 || paymentStatus !== 'success' || submitting}>Submit</button>
              </div>
            </form>

            <p className="ems-subtitle" style={{ marginTop: 12 }}>{message}</p>
          </section>

          <footer className="ems-footer">
            © 2026 <span className="ems-parent-brand">Group of Sangam</span> | Head Office: Aurangabad, Bihar.
            {' '}All scholarship branches are managed by Sangam Group.
          </footer>
        </main>
      </div>
    </>
  );
}
