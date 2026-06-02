// js/ui.js — 通用 UI 组件

export function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function openModal({ title, bodyHTML, buttons = [], closeOnOverlay = true }) {
  const overlay = document.getElementById('modal-overlay');
  const box = document.getElementById('modal-box');

  box.innerHTML = `
    <div class="modal-header">
      <h3 class="modal-title">${title}</h3>
      <button class="modal-close" id="modal-close-btn">&times;</button>
    </div>
    <div class="modal-body">${bodyHTML}</div>
    ${buttons.length > 0 ? `<div class="modal-footer">${buttons.map((b, i) =>
      `<button class="btn ${b.cls || ''}" data-modal-btn="${i}">${b.text}</button>`
    ).join('')}</div>` : ''}
  `;

  overlay.classList.remove('hidden');

  const close = () => overlay.classList.add('hidden');
  document.getElementById('modal-close-btn').addEventListener('click', close);
  if (closeOnOverlay) {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  }

  buttons.forEach((b, i) => {
    const btn = box.querySelector(`[data-modal-btn="${i}"]`);
    if (btn) {
      btn.addEventListener('click', () => {
        const result = b.onClick();
        if (result !== false) close();
      });
    }
  });

  return { close };
}

export function createProgressBar(container) {
  container.innerHTML = `
    <div class="progress-bar-wrap">
      <div class="progress-bar-fill" style="width: 0%"></div>
    </div>
    <div class="progress-stats">
      <span class="progress-text">0 / 0</span>
      <span class="progress-eta">--</span>
    </div>
    <div class="progress-speed"></div>
  `;

  const fill = container.querySelector('.progress-bar-fill');
  const speedEl = container.querySelector('.progress-speed');

  return {
    update(processed, total) {
      const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
      fill.style.width = `${pct}%`;
      container.querySelector('.progress-text').textContent = `${processed} / ${total} (${pct}%)`;
    },
    setETA(text) {
      container.querySelector('.progress-eta').textContent = text;
    },
    pulse() {
      fill.classList.add('pulsing');
      speedEl.textContent = '⏳ 正在调用 AI 分析...';
    },
    unpulse(batchTime) {
      fill.classList.remove('pulsing');
      const perPaper = batchTime ? `${(batchTime / 1000).toFixed(1)}s` : '';
      speedEl.textContent = batchTime ? `上一批耗时 ${perPaper}（${BATCH_SIZE || 10} 篇）` : '';
    },
  };
}

// Re-export BATCH_SIZE for progress bar use
export const BATCH_SIZE = 10;

export function createLogPanel(container) {
  container.className = 'log-panel';
  container.innerHTML = '';
  const entries = [];

  function addEntry(text, type = 'info') {
    const time = new Date().toLocaleTimeString();
    entries.push({ time, text, type });
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-${type}">${text}</span>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  return {
    info(text) { addEntry(text, 'info'); },
    high(text) { addEntry(text, 'high'); },
    medium(text) { addEntry(text, 'medium'); },
    low(text) { addEntry(text, 'low'); },
    error(text) { addEntry(text, 'error'); },
    clear() { container.innerHTML = ''; },
    getEntries() { return entries; },
  };
}

export function confirm(message) {
  return new Promise((resolve) => {
    openModal({
      title: '确认操作',
      bodyHTML: `<p>${message}</p>`,
      buttons: [
        { text: '取消', cls: '', onClick: () => resolve(false) },
        { text: '确认', cls: 'btn-primary', onClick: () => resolve(true) },
      ],
    });
  });
}

export function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}秒`;
  const m = Math.floor(s / 60);
  const remainS = s % 60;
  return `${m}分${remainS}秒`;
}

export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
