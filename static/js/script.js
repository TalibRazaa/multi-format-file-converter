'use strict';
// Keep user filenames as text, never HTML; the server validates contents too.
const byId = id => document.getElementById(id);
const picker = byId('file'), zone = byId('dropzone'), select = byId('conversion');
const convert = byId('convert');
const options = {
  pdf: [['pdf-jpeg', 'JPEG images (.jpg)'], ['pdf-docx', 'Word document (.docx)']],
  jpg: [['image-pdf', 'PDF document (.pdf)']],
  jpeg: [['image-pdf', 'PDF document (.pdf)']],
  png: [['image-pdf', 'PDF document (.pdf)']],
  docx: [['docx-pdf', 'PDF document (.pdf)']]
};
let file = null, busy = false;
function state(value) {
  document.body.dataset.state = value;
  byId('step-upload').className = value === 'empty' ? 'current' : 'done';
  byId('step-convert').className = value === 'converting' ? 'current' : value === 'done' ? 'done' : '';
  byId('step-download').className = value === 'done' ? 'current' : '';
}
function error(message) { byId('status').textContent = message; }
function resetResult() { state(file ? 'ready' : 'empty'); byId('result').hidden = true; byId('download').removeAttribute('href'); error(''); }
function showNote() {
  const mode = select.value;
  byId('format-note').textContent = mode === 'pdf-docx'
    ? 'Text extraction only. Scans need OCR; images, tables and layout are not preserved.'
    : mode === 'pdf-jpeg' ? 'One JPEG per page. Multi-page PDFs download as a ZIP file.'
    : mode === 'docx-pdf' ? 'Portable conversion reflows text, basic tables and images. Complex layouts, headers and footers are not preserved.'
    : 'Your image will become a single-page PDF.';
  byId('next-step').textContent = 'Convert, then your download starts automatically.';
  byId('source-format').textContent = file.name.split('.').pop().toUpperCase();
  byId('target-format').textContent = {'pdf-docx':'DOCX','pdf-jpeg':'JPEG','image-pdf':'PDF','docx-pdf':'PDF'}[mode];
}
function choose(candidate) {
  if (busy) return;
  resetResult();
  file = null;
  state('empty');
  byId('source-format').textContent = 'FILE';
  byId('target-format').textContent = 'NEW FORMAT';
  byId('selected').hidden = true;
  select.replaceChildren(new Option('Upload a file to see formats', ''));
  select.disabled = convert.disabled = true;
  byId('next-step').textContent = 'Add a file to get started.';
  byId('format-note').textContent = 'Available formats are matched to your file automatically.';
  if (!candidate) return;
  const ext = candidate.name.split('.').pop().toLowerCase();
  if (!Object.hasOwn(options, ext)) return error('Choose a PDF, JPEG, PNG or DOCX file.');
  if (!candidate.size) return error('This file is empty. Choose another file.');
  if (candidate.size > 10 * 1024 * 1024) return error('This file is too large. Maximum size is 10 MB.');
  file = candidate;
  state('ready');
  byId('filename').textContent = file.name;
  byId('filesize').textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
  byId('selected').hidden = false;
  select.replaceChildren(...options[ext].map(([value, label]) => new Option(label, value)));
  select.disabled = convert.disabled = false;
  showNote();
}
byId('browse').addEventListener('click', () => { picker.value = ''; picker.click(); });
picker.addEventListener('change', () => { if (picker.files[0]) choose(picker.files[0]); });
byId('remove').addEventListener('click', () => { picker.value = ''; choose(null); });
select.addEventListener('change', () => { resetResult(); showNote(); });
// Prevent files dropped outside the target from navigating away from the app.
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => e.preventDefault());
zone.addEventListener('dragover', e => { e.preventDefault(); if (!busy) zone.classList.add('dragging'); });
zone.addEventListener('dragleave', () => zone.classList.remove('dragging'));
zone.addEventListener('drop', e => {
  e.preventDefault(); zone.classList.remove('dragging');
  if (busy) return;
  if (e.dataTransfer.files.length !== 1) return error('Please choose one file at a time.');
  choose(e.dataTransfer.files[0]);
});
async function requestJSON(url, init) {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({error: 'The server returned an unexpected response. Please try again.'}));
  if (!response.ok) throw new Error(data.error || 'The conversion failed. Please try again.');
  return data;
}
convert.addEventListener('click', async () => {
  if (!file || busy) return;
  busy = true; resetResult(); state('converting');
  byId('convert-label').textContent = 'Working on it…';
  [convert, select, byId('browse'), byId('remove')].forEach(el => el.disabled = true);
  byId('progress').hidden = false;
  byId('progress-text').textContent = 'Uploading your file…';
  // Indeterminate progress deliberately avoids inventing a completion percentage.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 180000);
  try {
    const form = new FormData(); form.append('file', file);
    const uploaded = await requestJSON('/upload', {method: 'POST', body: form, signal: controller.signal});
    byId('progress-text').textContent = 'Converting your file…';
    const result = await requestJSON('/convert', {method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({id: uploaded.id, type: select.value}), signal: controller.signal});
    byId('download').href = result.download;
    byId('download').download = result.filename;
    byId('warning').textContent = result.warning || 'Your download is available for one hour.';
    byId('result').hidden = false;
    state('done');
    // The normal link stays available if the browser blocks automatic downloads.
    byId('download').click();
    byId('next-step').textContent = 'Done. Download your converted file below.';
  } catch (err) {
    state('ready');
    error(err.name === 'AbortError' ? 'The request timed out. Try again with a smaller file.'
      : err instanceof TypeError ? 'Could not reach the server. Check your connection and try again.' : err.message);
  } finally {
    clearTimeout(timer); busy = false;
    byId('convert-label').textContent = 'Convert & download';
    byId('progress').hidden = true;
    [convert, select, byId('browse'), byId('remove')].forEach(el => el.disabled = false);
  }
});
