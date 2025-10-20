const CONFIG = {
  appName: 'Wiremesh',
  endpoint: 'https://getform.io/f/aejemvdb',
  subjectPrefix: '[Wiremesh] Bug report',
  attachmentLimit: 6
};

const state = {
  attachments: [],
  attachmentCounter: 0,
  isSubmitting: false
};

const elements = {
  form: document.querySelector('#bug-report-form'),
  feedback: document.querySelector('#feedback'),
  title: document.querySelector('#bug-title'),
  description: document.querySelector('#bug-description'),
  email: document.querySelector('#bug-email'),
  version: document.querySelector('#bug-version'),
  browser: document.querySelector('#bug-browser'),
  fileInput: document.querySelector('#bug-attachments'),
  addButton: document.querySelector('[data-bug-report-add-attachment]'),
  hint: document.querySelector('[data-bug-report-attachment-hint]'),
  attachmentList: document.querySelector('[data-bug-report-attachment-list]'),
  submitButton: document.querySelector('[data-submit-button]'),
  successModal: document.querySelector('#success-modal'),
  submitAnotherButton: document.querySelector('[data-submit-another]'),
  closeTabButton: document.querySelector('[data-close-tab]')
};

const ensureElement = (el, name) => {
  if (!el) {
    throw new Error(`Bug report page expected ${name}`);
  }
  return el;
};

Object.entries(elements).forEach(([key, value]) => ensureElement(value, key));

const params = new URLSearchParams(window.location.search);
const requestedAppName = params.get('appName');
const brandName = (requestedAppName && requestedAppName.trim()) || CONFIG.appName;

CONFIG.appName = brandName;
CONFIG.subjectPrefix = `[${brandName}] Bug report`;
document.title = `${brandName} · Bug Report`;

const brandNodes = document.querySelectorAll('[data-bug-report-brand-text]');
brandNodes.forEach(node => {
  node.textContent = brandName;
});

elements.hint.textContent = `Optional – attach up to ${CONFIG.attachmentLimit} files.`;

elements.fileInput.addEventListener('change', event => {
  const files = Array.from(event.target.files ?? []);
  if (files.length === 0) {
    return;
  }

  const remaining = CONFIG.attachmentLimit - state.attachments.length;
  if (remaining <= 0) {
    elements.fileInput.value = '';
    updateAttachmentState();
    return;
  }

  const additions = files.slice(0, remaining).map(file => ({
    id: `attachment-${state.attachmentCounter++}`,
    file
  }));

  if (additions.length > 0) {
    state.attachments = [...state.attachments, ...additions];
    elements.fileInput.value = '';
    updateAttachmentState();
  }
});

elements.addButton.addEventListener('click', () => {
  if (state.attachments.length >= CONFIG.attachmentLimit || state.isSubmitting) {
    return;
  }
  elements.fileInput.click();
});

const handleRemoveAttachment = id => {
  state.attachments = state.attachments.filter(entry => entry.id !== id);
  updateAttachmentState();
};

const formatFileSize = size => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const updateAttachmentState = () => {
  elements.attachmentList.innerHTML = '';
  state.attachments.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'attachments__item';
    item.dataset.bugReportAttachmentItem = '';

    const details = document.createElement('div');
    details.className = 'attachments__details';

    const name = document.createElement('span');
    name.className = 'attachments__name';
    name.textContent = entry.file.name;
    name.title = entry.file.name;

    const meta = document.createElement('span');
    meta.className = 'attachments__meta';
    meta.textContent = formatFileSize(entry.file.size);

    details.appendChild(name);
    details.appendChild(meta);

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'attachments__remove';
    removeButton.dataset.bugReportRemoveAttachment = '';
    removeButton.setAttribute('aria-label', `Remove attachment ${entry.file.name}`);
    removeButton.textContent = '×';
    removeButton.addEventListener('click', () => handleRemoveAttachment(entry.id));

    item.appendChild(details);
    item.appendChild(removeButton);
    elements.attachmentList.appendChild(item);
  });

  const isAtLimit = state.attachments.length >= CONFIG.attachmentLimit;
  elements.addButton.disabled = isAtLimit || state.isSubmitting;
};

const showFeedback = (message, kind = 'success') => {
  elements.feedback.textContent = message;
  elements.feedback.classList.remove('feedback--success', 'feedback--error');
  elements.feedback.classList.add(kind === 'success' ? 'feedback--success' : 'feedback--error');
  elements.feedback.hidden = false;
};

const clearFeedback = () => {
  elements.feedback.hidden = true;
  elements.feedback.textContent = '';
  elements.feedback.classList.remove('feedback--success', 'feedback--error');
};

const setFieldError = (fieldName, message) => {
  const field = document.querySelector(`.field[data-field="${fieldName}"]`);
  if (!field) return;
  const errorNode = field.querySelector('.field__error');
  if (errorNode) {
    errorNode.textContent = message ?? '';
  }
};

const validate = () => {
  let isValid = true;
  const title = elements.title.value.trim();
  const description = elements.description.value.trim();
  const email = elements.email.value.trim();

  setFieldError('title', title ? '' : 'Title is required.');
  setFieldError('description', description ? '' : 'Description is required.');

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setFieldError('email', 'Enter a valid email address.');
    isValid = false;
  } else {
    setFieldError('email', '');
  }

  if (!title || !description) {
    isValid = false;
  }

  return isValid;
};

const resetForm = () => {
  elements.title.value = '';
  elements.description.value = '';
  elements.email.value = '';
  state.attachments = [];
  state.attachmentCounter = 0;
  updateAttachmentState();
  setFieldError('title', '');
  setFieldError('description', '');
  setFieldError('email', '');
  clearFeedback();
};

const setSubmitting = flag => {
  state.isSubmitting = flag;
  elements.submitButton.disabled = flag;
  elements.addButton.disabled = flag || state.attachments.length >= CONFIG.attachmentLimit;
};

const showSuccessModal = () => {
  if (!elements.successModal) return;
  elements.successModal.hidden = false;
  elements.submitAnotherButton?.focus();
};

const hideSuccessModal = () => {
  if (!elements.successModal) return;
  elements.successModal.hidden = true;
};

const handleSubmit = async event => {
  event.preventDefault();
  clearFeedback();

  if (!validate()) {
    return;
  }

  setSubmitting(true);

  const formData = new FormData();
  formData.append('_subject', `${CONFIG.subjectPrefix}: ${elements.title.value.trim()}`);
  formData.append('title', elements.title.value.trim());
  formData.append('description', elements.description.value.trim());
  formData.append('version', elements.version.value.trim());
  formData.append('browser', elements.browser.value.trim());

  const email = elements.email.value.trim();
  if (email) {
    formData.append('email', email);
  }

  formData.append('page_url', window.location.href);
  state.attachments.forEach(entry => {
    formData.append('files[]', entry.file, entry.file.name);
  });

  try {
    const response = await fetch(CONFIG.endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json'
      },
      body: formData
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || (payload?.success === false)) {
      const message = payload?.message || 'Failed to submit the bug report. Please try again.';
      showFeedback(message, 'error');
      return;
    }

    resetForm();
    showSuccessModal();
  } catch (error) {
    console.error('Bug report submission failed', error);
    showFeedback('Network error while submitting the bug report. Please try again.', 'error');
  } finally {
    setSubmitting(false);
  }
};

elements.form.addEventListener('submit', handleSubmit);

elements.title.addEventListener('input', () => setFieldError('title', ''));

elements.description.addEventListener('input', () => setFieldError('description', ''));

elements.email.addEventListener('input', () => setFieldError('email', ''));

const applyQueryDefaults = () => {
  const version = params.get('version') || 'Unknown';
  const browser = params.get('browser') || 'Unknown';

  elements.version.value = version;
  elements.browser.value = browser;
};

applyQueryDefaults();
updateAttachmentState();

elements.submitAnotherButton?.addEventListener('click', () => {
  hideSuccessModal();
});

elements.closeTabButton?.addEventListener('click', () => {
  window.close();
});
