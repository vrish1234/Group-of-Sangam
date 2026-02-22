import React, { FormEvent, useMemo, useState } from 'react';
import './portal.css';

type Step = 1 | 2 | 3;

type PaymentState = {
  status: 'pending' | 'success';
  orderId: string;
  paymentId: string;
  signature: string;
  transactionId: string;
};

const defaultPayment: PaymentState = {
  status: 'pending',
  orderId: '',
  paymentId: '',
  signature: '',
  transactionId: '',
};

export default function App() {
  const [step, setStep] = useState<Step>(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [form, setForm] = useState({
    fullName: '', phone: '', email: '', dateOfBirth: '', address: '', schoolName: '', board: '', className: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [payment, setPayment] = useState<PaymentState>(defaultPayment);
  const [submitting, setSubmitting] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [message, setMessage] = useState('');
  const [submittedStudentId, setSubmittedStudentId] = useState('');

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

  async function startDummyPayment() {
    setProcessingPayment(true);
    setMessage('Creating payment order...');

    const orderRes = await fetch('/api/payment/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 19900, currency: 'INR' }),
    });
    const orderData = await orderRes.json();

    if (!orderRes.ok) {
      setMessage(orderData.error || 'Unable to create payment order.');
      setProcessingPayment(false);
      return;
    }

    await new Promise((r) => setTimeout(r, 900));
    const paymentId = `pay_${Date.now()}`;
    const signature = `dummy-sign-${orderData.orderId}-${paymentId}`;

    setMessage('Verifying payment signature...');
    const verifyRes = await fetch('/api/payment/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: orderData.orderId, paymentId, signature }),
    });
    const verifyData = await verifyRes.json();

    if (!verifyRes.ok || !verifyData.success) {
      setMessage(verifyData.error || 'Payment verification failed.');
      setProcessingPayment(false);
      return;
    }

    setPayment({
      status: 'success',
      orderId: orderData.orderId,
      paymentId,
      signature,
      transactionId: verifyData.transactionId,
    });
    setMessage(`Payment successful. Transaction ID: ${verifyData.transactionId}`);
    setProcessingPayment(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (payment.status !== 'success') {
      setMessage('Submission is locked until payment verification is successful.');
      return;
    }

    setSubmitting(true);
    const payload = {
      ...form,
      payment,
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

    setSubmittedStudentId(String(data.student.id));
    setMessage('');
    setSubmitting(false);
  }

  function resetForm() {
    setStep(1);
    setForm({
      fullName: '', phone: '', email: '', dateOfBirth: '', address: '', schoolName: '', board: '', className: '',
    });
    setFile(null);
    setPayment(defaultPayment);
    setSubmittedStudentId('');
    setMessage('');
  }

  if (submittedStudentId) {
    return (
      <>
        <header className="ems-topbar">
          <div className="ems-brand">
            <img className="ems-logo-image" src="/group-of-sangam-logo.svg" alt="Group of Sangam logo" />
            <div className="ems-brand-block">
              <span className="ems-brand-title">Gyan Setu • SBTE EMS</span>
              <span className="ems-brand-sub">Initiative by <span className="ems-parent-brand">Group of Sangam</span></span>
            </div>
          </div>
          <div className="ems-user">Application Complete</div>
        </header>
        <main className="ems-main" style={{ maxWidth: 920, margin: '0 auto' }}>
          <section className="ems-card success-screen">
            <h1 className="ems-title">Application Submitted Successfully!</h1>
            <p className="ems-subtitle">Your scholarship application has been securely saved to cloud records.</p>
            <div className="txn-block">
              <p><strong>Student ID:</strong> {submittedStudentId}</p>
              <p><strong>Mock Transaction ID:</strong> {payment.transactionId}</p>
              <p><strong>Payment Status:</strong> Success</p>
            </div>
            <div className="ems-actions">
              <button className="ems-btn" type="button" onClick={resetForm}>Submit Another Application</button>
            </div>
          </section>
          <footer className="ems-footer">
            <div className="ems-footer-brand">
              <img className="ems-logo-image" src="/group-of-sangam-logo.svg" alt="Group of Sangam logo" />
              <p>© 2026 <span className="ems-parent-brand">Group of Sangam</span> | Head Office: Aurangabad, Bihar. All scholarship branches are managed by Sangam Group.</p>
            </div>
          </footer>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="ems-topbar">
        <div className="ems-brand">
          <button className="ems-hamburger" onClick={() => setSidebarOpen((v) => !v)}>☰</button>
          <img className="ems-logo-image" src="/group-of-sangam-logo.svg" alt="Group of Sangam logo" />
          <div className="ems-brand-block">
            <span className="ems-brand-title">Gyan Setu • SBTE EMS</span>
            <span className="ems-brand-sub">Initiative by <span className="ems-parent-brand">Group of Sangam</span></span>
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
            <p className="ems-subtitle">3-step workflow with strict payment verification before cloud save.</p>

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
                    <button className={`ems-btn ${processingPayment ? 'loading' : ''}`} type="button" onClick={startDummyPayment} disabled={processingPayment || payment.status === 'success'}>Pay ₹199 (Dummy)</button>
                  </div>
                  <p className="ems-subtitle" style={{ marginTop: 10 }}>Payment: {payment.status === 'success' ? `Success (${payment.transactionId})` : 'Pending'}</p>
                </div>
              )}

              <div className="ems-actions">
                <button className="ems-btn" type="button" disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1) as Step)}>Previous</button>
                <button className="ems-btn" type="button" disabled={step === 3} onClick={() => canGoNext && setStep((s) => Math.min(3, s + 1) as Step)}>Next</button>
                <button className={`ems-btn ${submitting ? 'loading' : ''}`} type="submit" disabled={step !== 3 || payment.status !== 'success' || submitting}>Submit</button>
              </div>
            </form>

            <p className="ems-subtitle" style={{ marginTop: 12 }}>{message}</p>
          </section>

          <footer className="ems-footer">
            <div className="ems-footer-brand">
              <img className="ems-logo-image" src="/group-of-sangam-logo.svg" alt="Group of Sangam logo" />
              <p>© 2026 <span className="ems-parent-brand">Group of Sangam</span> | Head Office: Aurangabad, Bihar. All scholarship branches are managed by Sangam Group.</p>
            </div>
          </footer>
        </main>
      </div>
    </>
  );
}
