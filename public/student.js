const form = document.getElementById('scholarshipForm');
const steps = [...document.querySelectorAll('.step')];
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');
const message = document.getElementById('message');
const payBtn = document.getElementById('payBtn');
const paymentStatusLabel = document.getElementById('paymentStatus');
const hamburger = document.getElementById('hamburger');
const sidebar = document.getElementById('sidebar');

let currentStep = 0;
let paymentStatus = 'pending';
let paymentReference = '';

hamburger?.addEventListener('click', () => {
  sidebar?.classList.toggle('open');
});

function renderStep() {
  steps.forEach((step, index) => step.classList.toggle('active', index === currentStep));
  prevBtn.style.display = currentStep === 0 ? 'none' : 'inline-block';
  nextBtn.style.display = currentStep === steps.length - 1 ? 'none' : 'inline-block';
  submitBtn.style.display = currentStep === steps.length - 1 ? 'inline-block' : 'none';
  submitBtn.disabled = paymentStatus !== 'success';
}

function validateCurrentStep() {
  const currentFields = steps[currentStep].querySelectorAll('input[required], select[required], textarea[required]');
  for (const field of currentFields) {
    if (!field.value.trim()) {
      field.focus();
      return false;
    }
  }
  return true;
}

prevBtn.addEventListener('click', () => {
  if (currentStep > 0) {
    currentStep -= 1;
    renderStep();
  }
});

nextBtn.addEventListener('click', () => {
  if (!validateCurrentStep()) {
    message.textContent = 'Please complete required fields before moving ahead.';
    return;
  }
  message.textContent = '';
  if (currentStep < steps.length - 1) {
    currentStep += 1;
    renderStep();
  }
});

payBtn.addEventListener('click', () => {
  payBtn.disabled = true;
  paymentStatusLabel.textContent = 'Processing mock payment...';

  setTimeout(() => {
    paymentStatus = 'success';
    paymentReference = `MOCK-${Date.now()}`;
    paymentStatusLabel.textContent = `Payment success: ${paymentReference}`;
    renderStep();
  }, 1000);
});

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (paymentStatus !== 'success') {
    message.textContent = 'Submit is locked until payment succeeds.';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.classList.add('submit-loading');
  message.textContent = 'Submitting...';

  const file = document.getElementById('document').files[0];
  const payload = {
    fullName: document.getElementById('fullName').value,
    phone: document.getElementById('phone').value,
    email: document.getElementById('email').value,
    dateOfBirth: document.getElementById('dateOfBirth').value,
    address: document.getElementById('address').value,
    schoolName: document.getElementById('schoolName').value,
    board: document.getElementById('board').value,
    className: document.getElementById('className').value,
    paymentStatus,
    paymentReference,
    document: file
      ? {
          fileName: file.name,
          mimeType: file.type,
          base64: await fileToBase64(file),
        }
      : null,
  };

  const response = await fetch('/api/student/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    message.textContent = data.error || 'Submission failed';
    submitBtn.disabled = false;
    submitBtn.classList.remove('submit-loading');
    return;
  }

  message.textContent = `Form submitted successfully. Student ID: ${data.student.id}`;
  form.reset();
  paymentStatus = 'pending';
  paymentReference = '';
  payBtn.disabled = false;
  paymentStatusLabel.textContent = 'Payment pending';
  currentStep = 0;
  submitBtn.classList.remove('submit-loading');
  renderStep();
});

renderStep();
