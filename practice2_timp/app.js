const logEl = document.getElementById('log');
const clockPill = document.getElementById('clockPill');

const LS_KEY = 'physsec_log';
const MAX_ITEMS = 50;

function nowStr() {
  const d = new Date();
  return d.toLocaleString();
}

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
  catch { return []; }
}

function saveLocal(arr) {
  localStorage.setItem(LS_KEY, JSON.stringify(arr));
}

function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function render() {
  const items = loadLocal().slice(-MAX_ITEMS).reverse();
  logEl.innerHTML = items.map(x => {
    const zone = escapeHtml(x.zone);
    const note = escapeHtml(x.note || '');
    const noteText = note ? ` — ${note}` : '';
    return `
      <div class="item">
        <span class="tag">${x.type}</span>
        <span class="badge ${x.severity}">${x.severity}</span>
        <div><strong>${zone}</strong>${noteText}</div>
        <div class="meta">${x.time}</div>
      </div>
    `;
  }).join('');
}

document.getElementById('eventForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = {
    type: fd.get('type'),
    zone: fd.get('zone'),
    severity: fd.get('severity'),
    note: fd.get('note') || ''
  };

  const arr = loadLocal();
  arr.push({ ...payload, time: nowStr() });
  saveLocal(arr);
  render();
  e.target.reset();
});

document.getElementById('clearBtn').addEventListener('click', () => {
  saveLocal([]);
  render();
});

setInterval(() => clockPill.textContent = `Время: ${nowStr()}`, 1000);
render();
