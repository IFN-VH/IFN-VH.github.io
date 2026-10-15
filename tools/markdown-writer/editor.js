const editor = document.querySelector('#editor');
const preview = document.querySelector('#preview');
const fileSelect = document.querySelector('#file-select');
const saveButton = document.querySelector('#save-button');
const newButton = document.querySelector('#new-button');
const documentState = document.querySelector('#document-state');
const editorCount = document.querySelector('#editor-count');
const newDialog = document.querySelector('#new-dialog');
const newForm = document.querySelector('#new-form');
const newTitle = document.querySelector('#new-title');
const newFilename = document.querySelector('#new-filename');

let currentPath = '';
let savedSource = '';
let blogCss = '';
let renderTimer;

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character]);
}

async function request(url, options) {
  const response = await fetch(url, options);
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || '操作失败');
  return value;
}

function isDirty() {
  return editor.value !== savedSource;
}

function updateState(message) {
  const dirty = isDirty();
  documentState.textContent = message || (dirty ? '未保存' : '已保存');
  saveButton.disabled = !currentPath || !dirty;
  const body = editor.value.replace(/^---\n[\s\S]*?\n---\n?/, '');
  editorCount.textContent = `${body.replace(/\s/g, '').length} 字`;
}

async function renderPreview() {
  const { title, html } = await request('/api/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: editor.value }),
  });
  const titleMarkup = title ? `<header class="post-header"><h1>${escapeHtml(title)}</h1></header>` : '';
  preview.srcdoc = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${blogCss}</style><style>body{padding:3rem 0 5rem}.post-header{margin-bottom:3.5rem}</style></head><body><main><article class="post">${titleMarkup}<div class="prose">${html}</div></article></main></body></html>`;
}

function schedulePreview() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => renderPreview().catch((error) => updateState(error.message)), 120);
}

async function loadFiles(preferredPath) {
  const { files } = await request('/api/files');
  fileSelect.replaceChildren(...files.map((file) => {
    const option = document.createElement('option');
    option.value = file.path;
    option.textContent = file.title;
    return option;
  }));
  const path = preferredPath || files[0]?.path;
  if (path) {
    fileSelect.value = path;
    await loadFile(path);
  }
}

async function loadFile(path) {
  const file = await request(`/api/file?path=${encodeURIComponent(path)}`);
  currentPath = file.path;
  savedSource = file.source;
  editor.value = file.source;
  updateState('已保存');
  await renderPreview();
}

async function saveFile() {
  if (!currentPath || !isDirty()) return;
  saveButton.disabled = true;
  updateState('保存中');
  await request('/api/file', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: currentPath, source: editor.value }),
  });
  savedSource = editor.value;
  updateState('已保存');
}

editor.addEventListener('input', () => {
  updateState();
  schedulePreview();
});

fileSelect.addEventListener('change', async () => {
  if (isDirty() && !confirm('当前修改尚未保存，仍要切换文章吗？')) {
    fileSelect.value = currentPath;
    return;
  }
  await loadFile(fileSelect.value);
});

saveButton.addEventListener('click', () => saveFile().catch((error) => updateState(error.message)));

window.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    saveFile().catch((error) => updateState(error.message));
  }
});

window.addEventListener('beforeunload', (event) => {
  if (!isDirty()) return;
  event.preventDefault();
});

newButton.addEventListener('click', () => {
  newForm.reset();
  newDialog.showModal();
  newTitle.focus();
});

document.querySelector('#cancel-new').addEventListener('click', () => newDialog.close());

newTitle.addEventListener('input', () => {
  if (newFilename.dataset.edited) return;
  newFilename.value = newTitle.value.trim().replace(/\s+/g, '-').replace(/[\\/:*?"<>|]/g, '').toLowerCase();
});

newFilename.addEventListener('input', () => { newFilename.dataset.edited = 'true'; });

newForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const filename = newFilename.value.trim().replace(/\.md$/i, '');
  if (!filename) return;
  const path = `${filename}.md`;
  try {
    const file = await request('/api/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, title: newTitle.value }),
    });
    newDialog.close();
    await loadFiles(file.path);
    editor.focus();
  } catch (error) {
    updateState(error.message);
  }
});

Promise.all([
  fetch('/blog.css').then((response) => response.text()),
  request('/api/files'),
]).then(async ([css, { files }]) => {
  blogCss = css;
  fileSelect.replaceChildren(...files.map((file) => {
    const option = document.createElement('option');
    option.value = file.path;
    option.textContent = file.title;
    return option;
  }));
  if (files[0]) await loadFile(files[0].path);
}).catch((error) => updateState(error.message));
