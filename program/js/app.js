// js/app.js — 主控制器

import { showToast } from './ui.js';
import { initUpload } from './upload.js';
import { initConfig } from './config.js';
import { initScreening } from './screen.js';
import { initResults } from './results.js';
import { initExport } from './export.js';
import { loadSettings, loadHistoryList, initHistory } from './history.js';

// ===== Global State =====
const AppState = {
  step: 'upload',
  papers: [],
  titleColumn: '',
  abstractColumn: '',
  researchConfig: {
    name: '',
    keywords: { include: [], exclude: [] },
    description: '',
    examples: [],
    mode: 'standard',
  },
  screeningResults: [],
  screeningStatus: 'idle',
  screeningProgress: { processed: 0, total: 0 },
  settings: {},
};

// ===== Step Navigation =====
const steps = ['upload', 'config', 'screening', 'results', 'export'];

async function navigateTo(step) {
  if (!canAccessStep(step)) return;
  AppState.step = step;
  updateStepNav();
  updatePanels();
  // Only re-render panels when NOT actively screening or when data is ready
  const isScreening = AppState.screeningStatus === 'running' || AppState.screeningStatus === 'paused';
  if (step === 'config' && !isScreening) await initConfig();
  if (step === 'screening' && !isScreening) await initScreening();
  if (step === 'results') { const m = await import('./results.js'); m.renderResults(); }
  if (step === 'export' && AppState.screeningResults.length > 0) await initExport();
}

function canAccessStep(step) {
  const idx = steps.indexOf(step);
  if (idx <= 1) return true;
  if (step === 'screening' && (!AppState.papers.length || !AppState.researchConfig.name)) return false;
  if (step === 'results' && AppState.screeningStatus !== 'completed') return false;
  if (step === 'export' && AppState.screeningResults.length === 0) return false;
  return true;
}

function updateStepNav() {
  document.querySelectorAll('.step-item').forEach((item) => {
    const s = item.dataset.step;
    item.classList.remove('active', 'completed');
    const currentIdx = steps.indexOf(AppState.step);
    const itemIdx = steps.indexOf(s);
    if (s === AppState.step) item.classList.add('active');
    else if (itemIdx < currentIdx) item.classList.add('completed');
    item.style.pointerEvents = canAccessStep(s) ? 'auto' : 'none';
    item.style.opacity = canAccessStep(s) ? '1' : '0.4';
  });
}

function updatePanels() {
  document.querySelectorAll('.step-panel').forEach(panel => panel.classList.add('hidden'));
  const panel = document.getElementById(`panel-${AppState.step}`);
  if (panel) panel.classList.remove('hidden');
}

// ===== Global Events =====
function setupGlobalEvents() {
  document.querySelectorAll('.step-item').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.step));
  });
  document.getElementById('btn-settings').addEventListener('click', openSettingsModal);
  document.getElementById('btn-history').addEventListener('click', openHistoryModal);
}

// ===== Settings Modal =====
function openSettingsModal() {
  const settings = loadSettings();
  const modal = document.getElementById('modal-overlay');
  const box = document.getElementById('modal-box');
  box.innerHTML = `
    <div class="modal-header">
      <h3 class="modal-title">⚙️ API 设置</h3>
      <button class="modal-close" id="modal-close">&times;</button>
    </div>
    <div class="form-group">
      <label class="form-label">API Key <span class="required">*</span></label>
      <input type="password" class="form-input" id="settings-apikey" value="${escapeHtml(settings.apiKey || '')}" placeholder="sk-...">
      <p class="form-hint">密钥仅保存在你的浏览器本地，不会上传</p>
    </div>
    <div class="form-group">
      <label class="form-label">Base URL</label>
      <input type="text" class="form-input" id="settings-baseurl" value="${escapeHtml(settings.baseURL || 'https://api.siliconflow.cn/v1')}">
    </div>
    <div class="form-group">
      <label class="form-label">模型名称</label>
      <input type="text" class="form-input" id="settings-model" value="${escapeHtml(settings.model || 'deepseek-ai/DeepSeek-V3.2')}">
    </div>
    <div id="settings-status"></div>
    <div class="modal-footer">
      <button class="btn" id="settings-test">🔌 测试连接</button>
      <button class="btn btn-primary" id="settings-save">保存设置</button>
    </div>
  `;
  modal.classList.remove('hidden');

  document.getElementById('modal-close').addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

  document.getElementById('settings-test').addEventListener('click', async () => {
    const statusEl = document.getElementById('settings-status');
    statusEl.innerHTML = '<span class="connection-status testing">⏳ 测试中...</span>';
    try {
      const { testConnection } = await import('./api.js');
      const ok = await testConnection({
        apiKey: document.getElementById('settings-apikey').value.trim(),
        baseURL: document.getElementById('settings-baseurl').value.trim(),
        model: document.getElementById('settings-model').value.trim(),
      });
      statusEl.innerHTML = ok
        ? '<span class="connection-status success">✅ 连接成功</span>'
        : '<span class="connection-status error">❌ 连接失败</span>';
    } catch (e) {
      statusEl.innerHTML = `<span class="connection-status error">❌ ${escapeHtml(e.message)}</span>`;
    }
  });

  document.getElementById('settings-save').addEventListener('click', () => {
    const newSettings = {
      apiKey: document.getElementById('settings-apikey').value.trim(),
      baseURL: document.getElementById('settings-baseurl').value.trim(),
      model: document.getElementById('settings-model').value.trim(),
    };
    localStorage.setItem('literature_screener_settings', JSON.stringify(newSettings));
    AppState.settings = newSettings;
    showToast('设置已保存', 'success');
    modal.classList.add('hidden');
  });
}

// ===== History Modal =====
async function openHistoryModal() {
  const tasks = await loadHistoryList();
  const modal = document.getElementById('modal-overlay');
  const box = document.getElementById('modal-box');
  box.innerHTML = `
    <div class="modal-header">
      <h3 class="modal-title">📋 历史记录</h3>
      <button class="modal-close" id="modal-close">&times;</button>
    </div>
    <div class="history-list">
      ${tasks.length === 0 ? '<div class="history-empty">暂无历史记录</div>' : ''}
      ${tasks.map((t, i) => `
        <div class="history-item" data-index="${i}">
          <div>
            <div class="history-item-title">${escapeHtml(t.config?.name || '未命名')}</div>
            <div class="history-item-meta">${formatDate(t.createdAt)} · ${t.papers?.length || 0} 篇文献</div>
          </div>
          <div class="history-item-stats">
            <span class="badge badge-high">${t.stats?.high || 0}</span>
            <span class="badge badge-medium">${t.stats?.medium || 0}</span>
            <span class="badge badge-low">${t.stats?.low || 0}</span>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="modal-footer">
      <button class="btn btn-danger btn-sm" id="history-clear" ${tasks.length === 0 ? 'disabled' : ''}>清空全部</button>
      <button class="btn" id="history-close">关闭</button>
    </div>
  `;
  modal.classList.remove('hidden');

  document.getElementById('modal-close').addEventListener('click', () => modal.classList.add('hidden'));
  document.getElementById('history-close').addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

  document.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', async () => {
      const idx = parseInt(item.dataset.index);
      const task = tasks[idx];
      if (task) {
        const { loadTask } = await import('./history.js');
        const fullTask = await loadTask(task.id);
        if (fullTask) {
          AppState.papers = fullTask.papers;
          AppState.researchConfig = fullTask.config;
          AppState.screeningResults = fullTask.results;
          AppState.titleColumn = fullTask.titleColumn || AppState.titleColumn;
          AppState.abstractColumn = fullTask.abstractColumn || AppState.abstractColumn;
          AppState.screeningStatus = 'completed';
          AppState.screeningProgress = { processed: fullTask.results.length, total: fullTask.papers.length };
          AppState.step = 'results';
          updateStepNav();
          updatePanels();
          const { renderResults } = await import('./results.js');
          renderResults();
          showToast('已加载历史记录', 'info');
          modal.classList.add('hidden');
        }
      }
    });
  });

  document.getElementById('history-clear').addEventListener('click', async () => {
    if (confirm('确定要清空所有历史记录吗？此操作不可恢复。')) {
      const { clearHistory } = await import('./history.js');
      await clearHistory();
      showToast('历史记录已清空', 'info');
      modal.classList.add('hidden');
    }
  });
}

// ===== Helpers =====
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// ===== Init =====
async function init() {
  // Check ES module support
  if (typeof import.meta === 'undefined') {
    document.body.innerHTML = '<div style="padding:40px;text-align:center;"><h2>浏览器不支持</h2><p>请使用现代浏览器（Chrome/Edge/Firefox）打开</p></div>';
    return;
  }

  AppState.settings = loadSettings();
  setupGlobalEvents();
  try {
    await initUpload();
    await initConfig();
    await initScreening();
    await initResults();
    await initExport();
    await initHistory();
  } catch (err) {
    console.error('Init error:', err);
    showToast('初始化失败：' + err.message, 'error');
  }
  updateStepNav();
  updatePanels();
}

document.addEventListener('DOMContentLoaded', init);

export { AppState, navigateTo, showToast, escapeHtml, formatDate };
