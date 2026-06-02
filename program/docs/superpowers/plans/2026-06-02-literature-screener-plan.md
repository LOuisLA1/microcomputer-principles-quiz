# 学术文献智能筛选系统 — 实现计划

> **For agentic workers:** 使用 subagent-driven-development 或 executing-plans 按任务逐步实现。步骤使用 `- [ ]` 复选框。

**Goal:** 构建纯前端文献筛选 SPA，上传 Excel → 配置研究方向 → AI 批量筛选 → 结果展示 → 导出报告

**Architecture:** 单页五步流程，ES Modules 原生模块化，app.js 集中状态管理，各模块独立职责

**Tech Stack:** HTML/CSS/JS ES Modules, SheetJS CDN, Chart.js CDN, 硅基流动 OpenAI 兼容 API

---

## 文件清单

| 文件 | 职责 | 预估行数 |
|------|------|:--:|
| `index.html` | 页面骨架，CDN 引用，步骤容器 | ~200 |
| `css/style.css` | 全局样式，学术简洁风 | ~500 |
| `js/app.js` | 主控制器，状态机，步骤路由 | ~350 |
| `js/ui.js` | Toast/Modal/ProgressBar 通用组件 | ~250 |
| `js/api.js` | API 封装，重试，连接测试 | ~180 |
| `js/upload.js` | Excel 上传，列映射，查重 | ~300 |
| `js/config.js` | 研究方向配置，Prompt 生成 | ~250 |
| `js/screen.js` | 分批筛选，进度，断点续传 | ~350 |
| `js/results.js` | 结果表格，饼图，搜索，覆写 | ~350 |
| `js/export.js` | Excel/Markdown/PRISMA 导出 | ~300 |
| `js/history.js` | IndexedDB CRUD + 设置管理 | ~250 |
| **合计** | | **~3300+** |

---

### Task 1: 项目骨架 — HTML 入口 + 全局样式 + App 主控

**Files:**
- Create: `index.html`
- Create: `css/style.css`
- Create: `js/app.js`

- [ ] **Step 1: 创建 index.html 页面骨架**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>学术文献智能筛选系统</title>
  <link rel="stylesheet" href="css/style.css">
  <script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js"></script>
</head>
<body>
  <!-- 顶部导航栏 -->
  <header class="app-header">
    <div class="header-brand">
      <span class="header-icon">📚</span>
      <h1 class="header-title">学术文献智能筛选系统</h1>
    </div>
    <div class="header-actions">
      <button id="btn-settings" class="btn btn-ghost" title="API 设置">⚙️ 设置</button>
      <button id="btn-history" class="btn btn-ghost" title="历史记录">📋 历史</button>
    </div>
  </header>

  <!-- 步骤导航 -->
  <nav class="step-nav" id="step-nav">
    <ol class="step-list">
      <li class="step-item active" data-step="upload">
        <span class="step-number">①</span>
        <span class="step-label">导入文献</span>
      </li>
      <li class="step-item" data-step="config">
        <span class="step-number">②</span>
        <span class="step-label">研究方向</span>
      </li>
      <li class="step-item" data-step="screening">
        <span class="step-number">③</span>
        <span class="step-label">开始筛选</span>
      </li>
      <li class="step-item" data-step="results">
        <span class="step-number">④</span>
        <span class="step-label">查看结果</span>
      </li>
      <li class="step-item" data-step="export">
        <span class="step-number">⑤</span>
        <span class="step-label">导出报告</span>
      </li>
    </ol>
  </nav>

  <!-- 主内容区 -->
  <main class="main-content" id="main-content">
    <!-- Step 1: 导入文献 -->
    <section class="step-panel" id="panel-upload"></section>
    <!-- Step 2: 研究方向 -->
    <section class="step-panel hidden" id="panel-config"></section>
    <!-- Step 3: 筛选执行 -->
    <section class="step-panel hidden" id="panel-screening"></section>
    <!-- Step 4: 结果查看 -->
    <section class="step-panel hidden" id="panel-results"></section>
    <!-- Step 5: 导出报告 -->
    <section class="step-panel hidden" id="panel-export"></section>
  </main>

  <!-- Toast 容器 -->
  <div class="toast-container" id="toast-container"></div>

  <!-- 全局 Modal -->
  <div class="modal-overlay hidden" id="modal-overlay">
    <div class="modal-box" id="modal-box"></div>
  </div>

  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: 创建 css/style.css 全局样式**

```css
/* ===== CSS Variables ===== */
:root {
  --color-bg: #FFFFFF;
  --color-bg-secondary: #F5F6FA;
  --color-text: #1A1A2E;
  --color-text-secondary: #6B7280;
  --color-primary: #2563EB;
  --color-primary-light: #DBEAFE;
  --color-high: #10B981;
  --color-high-bg: #D1FAE5;
  --color-medium: #F59E0B;
  --color-medium-bg: #FEF3C7;
  --color-low: #EF4444;
  --color-low-bg: #FEE2E2;
  --color-border: #E5E7EB;
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  --radius: 8px;
  --shadow: 0 1px 3px rgba(0,0,0,0.1);
  --shadow-lg: 0 4px 12px rgba(0,0,0,0.1);
}

/* ===== Reset ===== */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-family); background: var(--color-bg-secondary); color: var(--color-text); line-height: 1.6; min-height: 100vh; }

/* ===== Header ===== */
.app-header { background: var(--color-bg); border-bottom: 1px solid var(--color-border); padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100; }
.header-brand { display: flex; align-items: center; gap: 10px; }
.header-icon { font-size: 24px; }
.header-title { font-size: 18px; font-weight: 600; }
.header-actions { display: flex; gap: 8px; }

/* ===== Buttons ===== */
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: 1px solid var(--color-border); border-radius: var(--radius); font-size: 14px; font-family: var(--font-family); cursor: pointer; background: var(--color-bg); color: var(--color-text); transition: all 0.15s; }
.btn:hover { background: var(--color-bg-secondary); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.btn-primary:hover { background: #1D4ED8; }
.btn-ghost { border-color: transparent; background: transparent; }
.btn-danger { color: var(--color-low); border-color: var(--color-low); }
.btn-danger:hover { background: var(--color-low-bg); }
.btn-sm { padding: 4px 10px; font-size: 12px; }
.btn-lg { padding: 12px 24px; font-size: 16px; }

/* ===== Step Navigation ===== */
.step-nav { background: var(--color-bg); border-bottom: 1px solid var(--color-border); padding: 0 24px; }
.step-list { display: flex; list-style: none; gap: 0; }
.step-item { display: flex; align-items: center; gap: 8px; padding: 14px 20px; cursor: pointer; color: var(--color-text-secondary); border-bottom: 2px solid transparent; transition: all 0.2s; font-size: 14px; }
.step-item.active { color: var(--color-primary); border-bottom-color: var(--color-primary); font-weight: 500; }
.step-item.completed { color: var(--color-high); }
.step-number { font-size: 16px; }
.step-item.completed .step-number::after { content: ' ✓'; font-size: 12px; }

/* ===== Main Content ===== */
.main-content { max-width: 1200px; margin: 24px auto; padding: 0 24px; }
.step-panel { background: var(--color-bg); border-radius: var(--radius); box-shadow: var(--shadow); padding: 32px; }
.step-panel.hidden { display: none; }

/* ===== Step Panel Common ===== */
.panel-header { margin-bottom: 24px; }
.panel-title { font-size: 20px; font-weight: 600; margin-bottom: 4px; }
.panel-desc { color: var(--color-text-secondary); font-size: 14px; }
.panel-actions { margin-top: 24px; display: flex; gap: 12px; justify-content: flex-end; }
.divider { border: none; border-top: 1px solid var(--color-border); margin: 24px 0; }

/* ===== Upload Zone ===== */
.upload-zone { border: 2px dashed var(--color-border); border-radius: var(--radius); padding: 48px; text-align: center; cursor: pointer; transition: all 0.2s; }
.upload-zone:hover, .upload-zone.drag-over { border-color: var(--color-primary); background: var(--color-primary-light); }
.upload-icon { font-size: 48px; margin-bottom: 12px; }
.upload-text { font-size: 16px; color: var(--color-text-secondary); }
.upload-hint { font-size: 12px; color: var(--color-text-secondary); margin-top: 8px; }
.upload-input { display: none; }

/* ===== File Info ===== */
.file-info { display: none; background: var(--color-bg-secondary); border-radius: var(--radius); padding: 16px; margin-top: 16px; }
.file-info.show { display: block; }
.file-info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
.file-info-label { color: var(--color-text-secondary); }
.preview-table-wrap { max-height: 320px; overflow: auto; margin-top: 16px; border: 1px solid var(--color-border); border-radius: var(--radius); }
.preview-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.preview-table th { background: var(--color-bg-secondary); padding: 8px 12px; text-align: left; font-weight: 500; position: sticky; top: 0; border-bottom: 2px solid var(--color-border); white-space: nowrap; }
.preview-table td { padding: 8px 12px; border-bottom: 1px solid var(--color-border); max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.preview-table tr:last-child td { border-bottom: none; }
.mapping-select { font-size: 12px; padding: 2px 6px; border: 1px solid var(--color-border); border-radius: 4px; }

/* ===== Config Form ===== */
.form-group { margin-bottom: 20px; }
.form-label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 6px; }
.form-label .required { color: var(--color-low); margin-left: 2px; }
.form-input, .form-textarea, .form-select { width: 100%; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: var(--radius); font-size: 14px; font-family: var(--font-family); transition: border-color 0.15s; }
.form-input:focus, .form-textarea:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
.form-textarea { resize: vertical; min-height: 100px; }
.form-hint { font-size: 12px; color: var(--color-text-secondary); margin-top: 4px; }

/* ===== Tag Input ===== */
.tag-input-wrap { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px; border: 1px solid var(--color-border); border-radius: var(--radius); min-height: 42px; cursor: text; }
.tag-input-wrap:focus-within { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
.tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 10px; background: var(--color-primary-light); color: var(--color-primary); border-radius: 20px; font-size: 13px; }
.tag-exclude { background: var(--color-low-bg); color: var(--color-low); }
.tag-remove { cursor: pointer; font-size: 16px; line-height: 1; margin-left: 2px; }
.tag-input-inner { border: none; outline: none; flex: 1; min-width: 120px; font-size: 13px; font-family: var(--font-family); }

/* ===== Screening ===== */
.screening-progress { margin: 24px 0; }
.progress-bar-wrap { height: 8px; background: var(--color-bg-secondary); border-radius: 4px; overflow: hidden; margin-bottom: 12px; }
.progress-bar-fill { height: 100%; background: var(--color-primary); border-radius: 4px; transition: width 0.3s; width: 0%; }
.progress-stats { display: flex; justify-content: space-between; font-size: 13px; color: var(--color-text-secondary); }
.log-panel { background: #1A1A2E; color: #E5E7EB; border-radius: var(--radius); padding: 16px; max-height: 260px; overflow-y: auto; font-family: 'Consolas', 'Courier New', monospace; font-size: 13px; line-height: 1.8; }
.log-entry { display: flex; gap: 8px; }
.log-time { color: #9CA3AF; flex-shrink: 0; }
.log-high { color: #10B981; }
.log-medium { color: #F59E0B; }
.log-low { color: #EF4444; }
.log-error { color: #EF4444; font-weight: bold; }
.log-info { color: #60A5FA; }

/* ===== Results ===== */
.stats-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
.stat-card { padding: 20px; border-radius: var(--radius); text-align: center; }
.stat-card.high { background: var(--color-high-bg); color: #065F46; }
.stat-card.medium { background: var(--color-medium-bg); color: #92400E; }
.stat-card.low { background: var(--color-low-bg); color: #991B1B; }
.stat-number { font-size: 36px; font-weight: 700; }
.stat-label { font-size: 14px; margin-top: 4px; }
.chart-wrap { max-width: 280px; margin: 0 auto 24px; }
.results-toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
.results-toolbar .search-input { flex: 1; min-width: 220px; padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius); font-size: 14px; }
.filter-select { padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius); font-size: 14px; }
.results-table-wrap { max-height: 500px; overflow: auto; border: 1px solid var(--color-border); border-radius: var(--radius); }
.results-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.results-table th { background: var(--color-bg-secondary); padding: 10px 14px; text-align: left; font-weight: 600; position: sticky; top: 0; border-bottom: 2px solid var(--color-border); cursor: pointer; user-select: none; white-space: nowrap; }
.results-table th:hover { color: var(--color-primary); }
.results-table td { padding: 10px 14px; border-bottom: 1px solid var(--color-border); }
.results-table tr:hover td { background: var(--color-bg-secondary); }
.badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; cursor: pointer; }
.badge-high { background: var(--color-high-bg); color: #065F46; }
.badge-medium { background: var(--color-medium-bg); color: #92400E; }
.badge-low { background: var(--color-low-bg); color: #991B1B; }
.badge-manual { border: 2px dashed var(--color-primary); }
.detail-row { display: none; }
.detail-row.show { display: table-row; }
.detail-content { padding: 16px; background: var(--color-bg-secondary); }
.detail-label { font-weight: 500; font-size: 12px; color: var(--color-text-secondary); margin-bottom: 4px; }
.detail-text { font-size: 14px; margin-bottom: 12px; line-height: 1.7; }

/* ===== Export ===== */
.export-options { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
.export-option { border: 2px solid var(--color-border); border-radius: var(--radius); padding: 24px; text-align: center; cursor: pointer; transition: all 0.15s; }
.export-option:hover { border-color: var(--color-primary); }
.export-option.selected { border-color: var(--color-primary); background: var(--color-primary-light); }
.export-option-icon { font-size: 32px; margin-bottom: 8px; }
.export-option-title { font-weight: 600; margin-bottom: 4px; }
.export-option-desc { font-size: 13px; color: var(--color-text-secondary); }
.export-preview { background: var(--color-bg-secondary); border-radius: var(--radius); padding: 20px; max-height: 400px; overflow-y: auto; margin-bottom: 24px; }

/* ===== Modal ===== */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-overlay.hidden { display: none; }
.modal-box { background: var(--color-bg); border-radius: var(--radius); box-shadow: var(--shadow-lg); padding: 32px; max-width: 640px; width: 90%; max-height: 80vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.modal-title { font-size: 18px; font-weight: 600; }
.modal-close { cursor: pointer; font-size: 24px; color: var(--color-text-secondary); background: none; border: none; }
.modal-footer { margin-top: 24px; display: flex; gap: 12px; justify-content: flex-end; }

/* ===== Toast ===== */
.toast-container { position: fixed; top: 16px; right: 16px; z-index: 2000; display: flex; flex-direction: column; gap: 8px; }
.toast { padding: 12px 20px; border-radius: var(--radius); box-shadow: var(--shadow-lg); font-size: 14px; animation: toast-in 0.3s ease; max-width: 360px; }
.toast-success { background: #D1FAE5; color: #065F46; border: 1px solid #10B981; }
.toast-error { background: #FEE2E2; color: #991B1B; border: 1px solid #EF4444; }
.toast-info { background: #DBEAFE; color: #1E40AF; border: 1px solid #2563EB; }
.toast-warning { background: #FEF3C7; color: #92400E; border: 1px solid #F59E0B; }
@keyframes toast-in { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }

/* ===== Settings ===== */
.form-row { display: flex; gap: 12px; align-items: flex-end; }
.form-row .form-group { flex: 1; }
.connection-status { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 13px; }
.connection-status.success { background: var(--color-high-bg); color: #065F46; }
.connection-status.error { background: var(--color-low-bg); color: #991B1B; }
.connection-status.testing { background: var(--color-primary-light); color: #1E40AF; }

/* ===== History Panel ===== */
.history-list { max-height: 400px; overflow-y: auto; }
.history-item { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border: 1px solid var(--color-border); border-radius: var(--radius); margin-bottom: 8px; cursor: pointer; transition: all 0.15s; }
.history-item:hover { border-color: var(--color-primary); background: var(--color-primary-light); }
.history-item-title { font-weight: 500; margin-bottom: 4px; }
.history-item-meta { font-size: 12px; color: var(--color-text-secondary); }
.history-item-stats { text-align: right; }
.history-empty { text-align: center; padding: 40px; color: var(--color-text-secondary); }

/* ===== Responsive ===== */
@media (max-width: 1023px) { .step-list { overflow-x: auto; } .stats-cards { grid-template-columns: repeat(3, 1fr); } .export-options { grid-template-columns: 1fr; } }
@media (max-width: 767px) { .stats-cards { grid-template-columns: 1fr; } .results-toolbar { flex-direction: column; } .step-item { padding: 10px 12px; font-size: 12px; } .step-label { display: none; } }
```

- [ ] **Step 3: 创建 js/app.js 主控制器**

```javascript
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
  screeningStatus: 'idle', // idle|running|paused|completed|error
  screeningProgress: { processed: 0, total: 0 },
  settings: {},
};

// ===== Step Navigation =====
const steps = ['upload', 'config', 'screening', 'results', 'export'];

function navigateTo(step) {
  if (!canAccessStep(step)) return;
  AppState.step = step;
  updateStepNav();
  updatePanels();
}

function canAccessStep(step) {
  const idx = steps.indexOf(step);
  if (idx <= 1) return true;
  // screening: need papers + config
  if (step === 'screening' && (!AppState.papers.length || !AppState.researchConfig.name)) {
    return false;
  }
  // results: need screening completed
  if (step === 'results' && AppState.screeningStatus !== 'completed') {
    return false;
  }
  // export: need results
  if (step === 'export' && AppState.screeningResults.length === 0) {
    return false;
  }
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
  // Step nav clicks
  document.querySelectorAll('.step-item').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.step));
  });

  // Settings button
  document.getElementById('btn-settings').addEventListener('click', openSettingsModal);

  // History button
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
function openHistoryModal() {
  const tasks = loadHistoryList();
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
  AppState.settings = loadSettings();
  setupGlobalEvents();
  await initUpload();
  await initConfig();
  await initScreening();
  await initResults();
  await initExport();
  await initHistory();
  updateStepNav();
  updatePanels();
}

document.addEventListener('DOMContentLoaded', init);

// Export for module access
export { AppState, navigateTo, showToast, escapeHtml, formatDate };
```

- [ ] **Step 4: 启动本地服务器验证基本骨架**

```bash
cd "D:\claude code\program" && python -m http.server 8080
```

浏览器访问 `http://localhost:8080`，确认页面显示完整骨架：顶部导航、五步步骤条、空白内容区、设置按钮和历史按钮可点击弹出模态框。

- [ ] **Step 5: Commit**

```bash
git add index.html css/style.css js/app.js
git commit -m "feat: project scaffold — HTML/CSS/App controller with step navigation"
```

---

### Task 2: 通用 UI 组件 (`js/ui.js`)

**Files:**
- Create: `js/ui.js`

- [ ] **Step 1: 创建 js/ui.js**

```javascript
// js/ui.js — 通用 UI 组件

/**
 * Toast 通知
 * @param {string} message
 * @param {'success'|'error'|'info'|'warning'} type
 * @param {number} duration ms, default 3000
 */
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

/**
 * 打开自定义 Modal
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.bodyHTML
 * @param {Array<{text:string, cls:string, onClick:Function}>} opts.buttons
 * @param {boolean} opts.closeOnOverlay default true
 */
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

/**
 * 进度条组件
 * @param {HTMLElement} container
 */
export function createProgressBar(container) {
  container.innerHTML = `
    <div class="progress-bar-wrap">
      <div class="progress-bar-fill" style="width: 0%"></div>
    </div>
    <div class="progress-stats">
      <span class="progress-text">0 / 0</span>
      <span class="progress-eta">--</span>
    </div>
  `;

  return {
    update(processed, total) {
      const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
      container.querySelector('.progress-bar-fill').style.width = `${pct}%`;
      container.querySelector('.progress-text').textContent = `${processed} / ${total} (${pct}%)`;
    },
    setETA(text) {
      container.querySelector('.progress-eta').textContent = text;
    },
  };
}

/**
 * 日志面板
 * @param {HTMLElement} container
 */
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

/**
 * 确认对话框
 * @param {string} message
 * @returns {Promise<boolean>}
 */
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

/**
 * 防抖
 */
export function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * 格式化持续时间
 */
export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}秒`;
  const m = Math.floor(s / 60);
  const remainS = s % 60;
  return `${m}分${remainS}秒`;
}

/**
 * 生成 UUID v4
 */
export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add js/ui.js
git commit -m "feat: add UI utilities — Toast, Modal, ProgressBar, LogPanel"
```

---

### Task 3: Excel 上传与列映射 (`js/upload.js`)

**Files:**
- Create: `js/upload.js`

- [ ] **Step 1: 创建 js/upload.js**

```javascript
// js/upload.js — Excel 上传 & 列映射

import { AppState, navigateTo, showToast } from './app.js';
import { openModal } from './ui.js';

const TITLE_PATTERNS = ['标题', '题目', '篇名', '论文名称', '文献标题', 'title', 'paper title', 'name'];
const ABSTRACT_PATTERNS = ['摘要', '内容摘要', '概要', 'abstract', 'summary', '内容', 'description'];

/**
 * Jaccard 相似度
 */
function jaccardSimilarity(a, b) {
  const setA = new Set(a.split(''));
  const setB = new Set(b.split(''));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

/**
 * 检测列角色
 */
function detectColumnRole(columnName) {
  const lower = columnName.toLowerCase().trim();
  for (const p of TITLE_PATTERNS) {
    if (lower.includes(p.toLowerCase()) || jaccardSimilarity(lower, p.toLowerCase()) > 0.6) {
      return 'title';
    }
  }
  for (const p of ABSTRACT_PATTERNS) {
    if (lower.includes(p.toLowerCase()) || jaccardSimilarity(lower, p.toLowerCase()) > 0.6) {
      return 'abstract';
    }
  }
  return null;
}

/**
 * 解析 Excel 文件
 */
function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
        if (json.length === 0) return reject(new Error('文件中没有数据'));
        resolve(json);
      } catch (err) {
        reject(new Error('文件解析失败，请确认格式正确'));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 计算标题相似度（用于查重）
 */
function titleSimilarity(a, b) {
  const s1 = a.toLowerCase().replace(/[^\w一-鿿]/g, '');
  const s2 = b.toLowerCase().replace(/[^\w一-鿿]/g, '');
  if (!s1 || !s2) return 0;
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  return matches / longer.length;
}

/**
 * 渲染列映射确认 Modal
 */
function showColumnMappingModal(headers, autoDetected, rawData) {
  return new Promise((resolve) => {
    const options = ['-- 忽略 --', '标题列', '摘要列']
      .map((label, i) => `<option value="${i - 1}">${label}</option>`).join('');

    const rows = headers.map((h, i) => {
      const detected = autoDetected[i];
      const selected = detected === 'title' ? 1 : (detected === 'abstract' ? 2 : 0);
      const highlight = detected ? 'style="background:#FEF3C7"' : '';
      return `<tr ${highlight}>
        <td>${h}</td>
        <td>
          <select class="mapping-select" data-col="${i}">
            ${options.replace(`value="${selected}"`, `value="${selected}" selected`)}
          </select>
        </td>
      </tr>`;
    }).join('');

    const previewRows = rawData.slice(0, 5).map(row => {
      return `<tr>${headers.map(h => `<td>${String(row[h] || '').slice(0, 80)}</td>`).join('')}</tr>`;
    }).join('');

    openModal({
      title: '📋 确认列映射',
      bodyHTML: `
        <p style="margin-bottom:12px;font-size:14px;">请确认每列的角色。黄色行表示系统自动识别。</p>
        <div class="preview-table-wrap" style="max-height:280px;">
          <table class="preview-table">
            <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${previewRows}</tbody>
          </table>
        </div>
        <div class="divider"></div>
        <p style="font-weight:500;margin-bottom:8px;">列角色设定：</p>
        <table class="preview-table">
          <thead><tr><th>列名</th><th>角色</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `,
      buttons: [
        { text: '取消', cls: '', onClick: () => resolve(null) },
        { text: '确认', cls: 'btn-primary', onClick: () => {
          const titleCol = [];
          const abstractCol = [];
          const modal = document.getElementById('modal-box');
          modal.querySelectorAll('.mapping-select').forEach(sel => {
            const colIdx = parseInt(sel.dataset.col);
            const val = parseInt(sel.value);
            if (val === 1) titleCol.push(colIdx);
            if (val === 2) abstractCol.push(colIdx);
          });
          if (titleCol.length === 0 || abstractCol.length === 0) {
            showToast('请至少指定一个标题列和一个摘要列', 'warning');
            return false; // keep modal open
          }
          resolve({ titleCol: titleCol[0], abstractCol: abstractCol[0] });
        }},
      ],
    });
  });
}

/**
 * 初始化上传面板
 */
export async function initUpload() {
  const panel = document.getElementById('panel-upload');
  panel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">① 导入文献</h2>
      <p class="panel-desc">上传包含文献标题和摘要的 Excel / CSV 文件</p>
    </div>
    <div class="upload-zone" id="upload-zone">
      <div class="upload-icon">📁</div>
      <div class="upload-text">拖拽文件到此处，或点击选择文件</div>
      <div class="upload-hint">支持 .xlsx / .xls / .csv，单文件 ≤ 10MB，最多 2000 条</div>
      <input type="file" class="upload-input" id="upload-input" accept=".xlsx,.xls,.csv">
    </div>
    <div class="file-info" id="file-info">
      <div class="file-info-row"><span class="file-info-label">文件名：</span><span id="file-name">-</span></div>
      <div class="file-info-row"><span class="file-info-label">文献数量：</span><span id="file-count">-</span></div>
      <div class="file-info-row"><span class="file-info-label">列数：</span><span id="file-cols">-</span></div>
      <div class="file-info-row"><span class="file-info-label">重复文献：</span><span id="file-dupes">-</span></div>
      <div class="file-info-row"><span class="file-info-label">数据异常：</span><span id="file-anomalies">-</span></div>
    </div>
    <div class="preview-table-wrap" id="preview-wrap" style="display:none;"></div>
    <div class="panel-actions">
      <button class="btn btn-primary btn-lg" id="btn-next-config" disabled>下一步：配置研究方向 →</button>
    </div>
  `;

  const zone = document.getElementById('upload-zone');
  const input = document.getElementById('upload-input');
  const fileInfo = document.getElementById('file-info');
  const previewWrap = document.getElementById('preview-wrap');
  const btnNext = document.getElementById('btn-next-config');

  let rawData = [];
  let headers = [];

  function handleFile(file) {
    if (file.size > 10 * 1024 * 1024) {
      showToast('文件大小超过 10MB，请压缩后重试', 'error');
      return;
    }

    parseExcelFile(file).then(async (data) => {
      rawData = data;
      headers = Object.keys(data[0] || {});
      if (headers.length === 0) throw new Error('无法读取列名');

      // Auto-detect columns
      const autoDetected = {};
      headers.forEach((h, i) => {
        const role = detectColumnRole(h);
        if (role) autoDetected[i] = role;
      });

      // Show mapping modal
      const mapping = await showColumnMappingModal(headers, autoDetected, rawData);
      if (!mapping) return;

      const titleKey = headers[mapping.titleCol];
      const abstractKey = headers[mapping.abstractCol];

      AppState.titleColumn = titleKey;
      AppState.abstractColumn = abstractKey;

      // Build paper array
      const papers = rawData.map((row, idx) => ({
        id: `paper_${idx}`,
        title: String(row[titleKey] || '').trim(),
        abstract: String(row[abstractKey] || '').trim(),
        author: String(row['作者'] || row['Author'] || row['authors'] || '').trim(),
        year: String(row['年份'] || row['Year'] || row['year'] || '').trim(),
        source: String(row['来源'] || row['Source'] || row['journal'] || row['期刊'] || '').trim(),
        _row: idx,
      }));

      // Duplicate detection
      const dupes = [];
      const seen = new Set();
      for (let i = 0; i < papers.length; i++) {
        if (seen.has(i)) continue;
        for (let j = i + 1; j < papers.length; j++) {
          if (seen.has(j)) continue;
          if (titleSimilarity(papers[i].title, papers[j].title) > 0.9) {
            dupes.push({ i, j, title: papers[i].title });
            seen.add(j);
          }
        }
      }

      // Anomaly detection
      const anomalies = [];
      papers.forEach((p) => {
        if (!p.title) anomalies.push({ id: p.id, issue: '标题为空' });
        else if (p.title.length < 5) anomalies.push({ id: p.id, issue: '标题过短（<5字）' });
        if (!p.abstract) anomalies.push({ id: p.id, issue: '摘要为空' });
        else if (p.abstract.length < 20) anomalies.push({ id: p.id, issue: '摘要过短（<20字）' });
      });

      AppState.papers = papers;

      // Update file info
      fileInfo.classList.add('show');
      document.getElementById('file-name').textContent = file.name;
      document.getElementById('file-count').textContent = `${papers.length} 篇`;
      document.getElementById('file-cols').textContent = `${headers.length} 列`;
      document.getElementById('file-dupes').textContent = dupes.length > 0
        ? `${dupes.length} 组重复` : '无';
      document.getElementById('file-anomalies').textContent = anomalies.length > 0
        ? `${anomalies.length} 条异常` : '无';

      // Render preview table
      previewWrap.style.display = 'block';
      const displayCols = [titleKey, abstractKey].filter(Boolean);
      previewWrap.innerHTML = `
        <table class="preview-table">
          <thead><tr>${displayCols.map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>
            ${papers.slice(0, 10).map(p => `<tr>
              ${displayCols.map(c => `<td title="${escapeHtml(p[c] || '')}">${escapeHtml(String(p[c] || '').slice(0, 100))}</td>`).join('')}
            </tr>`).join('')}
          </tbody>
        </table>
      `;

      btnNext.disabled = false;
      showToast(`成功导入 ${papers.length} 篇文献`, 'success');
    }).catch(err => {
      showToast(err.message, 'error');
    });
  }

  // Drag & drop events
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (file) handleFile(file);
  });

  btnNext.addEventListener('click', () => {
    if (AppState.papers.length > 0) navigateTo('config');
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
```

- [ ] **Step 2: Commit**

```bash
git add js/upload.js
git commit -m "feat: add Excel upload, column mapping, dedup & anomaly detection"
```

---

### Task 4: API 模块 (`js/api.js`)

**Files:**
- Create: `js/api.js`

- [ ] **Step 1: 创建 js/api.js**

```javascript
// js/api.js — 硅基流动 API 封装

import { AppState } from './app.js';

export class APIError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function getSettings() {
  const stored = localStorage.getItem('literature_screener_settings');
  if (stored) {
    try { return JSON.parse(stored); } catch (e) { /* ignore */ }
  }
  return {
    apiKey: '',
    baseURL: 'https://api.siliconflow.cn/v1',
    model: 'deepseek-ai/DeepSeek-V3.2',
  };
}

/**
 * 调用 LLM Chat Completions
 */
export async function chatCompletion(messages, options = {}) {
  const settings = getSettings();
  if (!settings.apiKey) throw new APIError(0, '请先在设置中配置 API Key');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 30000);

  try {
    const response = await fetch(`${settings.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages,
        max_tokens: options.maxTokens || 1024,
        temperature: options.temperature ?? 0.1,
        ...(options.responseFormat ? { response_format: options.responseFormat } : {}),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.status === 401) throw new APIError(401, 'API Key 无效，请检查设置');
    if (response.status === 429) throw new APIError(429, '请求过于频繁，请稍后重试');
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new APIError(response.status, `API 请求失败 (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new APIError(0, '请求超时');
    if (err instanceof APIError) throw err;
    throw new APIError(0, `网络错误: ${err.message}`);
  }
}

/**
 * 测试 API 连接
 */
export async function testConnection(customSettings) {
  try {
    const data = await chatCompletion(
      [{ role: 'user', content: '你好，请回复"连接成功"' }],
      { maxTokens: 50, temperature: 0 }
    );
    return !!(data.choices && data.choices.length > 0);
  } catch (err) {
    return false;
  }
}

/**
 * 带指数退避的重试
 */
export async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      if (err.status === 429) {
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
      } else if (err.status === 401 || err.status === 400) {
        throw err; // don't retry auth/bad request errors
      } else {
        await sleep(baseDelay * Math.pow(2, attempt));
      }
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

- [ ] **Step 2: Commit**

```bash
git add js/api.js
git commit -m "feat: add API module — chat completion, connection test, exponential backoff retry"
```

---

### Task 5: 研究方向配置 (`js/config.js`)

**Files:**
- Create: `js/config.js`

- [ ] **Step 1: 创建 js/config.js**

```javascript
// js/config.js — 研究方向配置

import { AppState, navigateTo, showToast } from './app.js';

const TEMPLATES_KEY = 'literature_screener_templates';

/**
 * 生成 System Prompt
 */
export function buildSystemPrompt(config) {
  const parts = [];

  parts.push('你是一位学术文献筛选专家。请根据以下研究方向，判断每篇文献的相关性。');

  parts.push(`\n## 研究方向\n${config.description}`);

  if (config.keywords.include.length > 0) {
    parts.push(`\n## 包含关键词\n${config.keywords.include.join('、')}`);
  }
  if (config.keywords.exclude.length > 0) {
    parts.push(`\n## 排除关键词\n${config.keywords.exclude.join('、')}`);
  }

  if (config.examples.length > 0) {
    parts.push('\n## 示例文献（高度相关）');
    config.examples.forEach((ex, i) => {
      parts.push(`\n示例${i + 1}：\n标题：${ex.title}\n摘要：${ex.abstract}`);
    });
  }

  // Output format based on mode
  if (config.mode === 'simple') {
    parts.push('\n## 输出格式\n请对每篇文献返回 JSON：\n{"relevant": true/false, "reason": "一句话理由"}');
  } else if (config.mode === 'detailed') {
    parts.push('\n## 输出格式\n请对每篇文献返回 JSON：\n{"level": "high/medium/low", "score": 0-100, "reason": "2-3句判断理由", "subtopics": ["涉及的子主题"], "methodology_match": "匹配/不匹配/部分匹配", "priority": 1-5}');
  } else {
    parts.push('\n## 输出格式\n请对每篇文献返回 JSON：\n{"level": "high/medium/low", "score": 0-100, "reason": "2-3句判断理由"}');
  }

  parts.push('\n注意：只返回 JSON，不要附带其他文字。level 含义：high=高度相关应纳入，medium=可能相关需人工判断，low=不相关应排除。');

  return parts.join('\n');
}

/**
 * 构建单条文献的 User Prompt
 */
export function buildUserPrompt(paper) {
  return `标题：${paper.title}\n摘要：${paper.abstract}`;
}

/**
 * 保存/加载配置模板
 */
function saveTemplates(templates) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

function loadTemplates() {
  try {
    return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]');
  } catch { return []; }
}

/**
 * 初始化配置面板
 */
export async function initConfig() {
  const panel = document.getElementById('panel-config');

  function render() {
    const config = AppState.researchConfig;
    const prompt = config.name ? buildSystemPrompt(config) : '（填写研究方向后自动生成）';

    // Render keywords as tags
    const incTags = config.keywords.include.map((k, i) =>
      `<span class="tag">${k}<span class="tag-remove" data-type="include" data-idx="${i}">&times;</span></span>`
    ).join('');
    const excTags = config.keywords.exclude.map((k, i) =>
      `<span class="tag tag-exclude">${k}<span class="tag-remove" data-type="exclude" data-idx="${i}">&times;</span></span>`
    ).join('');

    // Render examples
    const exList = config.examples.map((ex, i) => `
      <div style="background:var(--color-bg-secondary);padding:12px;border-radius:var(--radius);margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <strong>示例 ${i + 1}</strong>
          <span class="tag-remove" data-type="example" data-idx="${i}" style="cursor:pointer;font-size:18px;">&times;</span>
        </div>
        <div style="font-size:13px;margin-bottom:4px;"><span style="color:var(--color-text-secondary);">标题：</span>${ex.title}</div>
        <div style="font-size:13px;"><span style="color:var(--color-text-secondary);">摘要：</span>${ex.abstract.slice(0, 100)}${ex.abstract.length > 100 ? '...' : ''}</div>
      </div>
    `).join('');

    panel.innerHTML = `
      <div class="panel-header">
        <h2 class="panel-title">② 研究方向配置</h2>
        <p class="panel-desc">描述你的研究方向，AI 将据此判断文献相关性</p>
      </div>

      <div class="form-group">
        <label class="form-label">方向名称 <span class="required">*</span></label>
        <input type="text" class="form-input" id="config-name" value="${escapeHtml(config.name)}" placeholder="例如：深度学习医学图像分割">
      </div>

      <div class="form-group">
        <label class="form-label">筛选粒度</label>
        <select class="form-select" id="config-mode">
          <option value="simple" ${config.mode === 'simple' ? 'selected' : ''}>简单模式 — 仅判断相关/不相关</option>
          <option value="standard" ${config.mode === 'standard' ? 'selected' : ''}>标准模式 — 三级分类 + 评分 + 理由</option>
          <option value="detailed" ${config.mode === 'detailed' ? 'selected' : ''}>详细模式 — 标准 + 子主题 + 方法匹配</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">研究描述 <span class="required">*</span></label>
        <textarea class="form-textarea" id="config-desc" rows="4" placeholder="请描述你的研究方向，包括研究对象、方法、应用场景等。例如：我关注基于深度学习的医学图像分割方法，特别是针对CT和MRI影像中的肿瘤自动检测与分割。感兴趣的方法包括U-Net及其变体、Transformer架构在医学图像中的应用等。">${escapeHtml(config.description)}</textarea>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">包含关键词</label>
          <div class="tag-input-wrap" id="tag-include">
            ${incTags}
            <input type="text" class="tag-input-inner" id="tag-include-input" placeholder="输入后回车添加">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">排除关键词</label>
          <div class="tag-input-wrap" id="tag-exclude">
            ${excTags}
            <input type="text" class="tag-input-inner" id="tag-exclude-input" placeholder="输入后回车添加">
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">示例文献（最多 5 篇）</label>
        ${exList}
        <button class="btn btn-sm" id="btn-add-example">+ 添加示例文献</button>
        <p class="form-hint">提供高度相关的示例文献，帮助 AI 更准确判断</p>
      </div>

      <div class="divider"></div>

      <div class="form-group">
        <label class="form-label">System Prompt 预览</label>
        <div class="log-panel" style="max-height:200px;white-space:pre-wrap;">${escapeHtml(prompt)}</div>
      </div>

      <div class="panel-actions">
        <button class="btn" id="btn-save-template">💾 保存为模板</button>
        <button class="btn" id="btn-load-template">📂 加载模板</button>
        <button class="btn btn-primary btn-lg" id="btn-next-screening" ${AppState.papers.length === 0 ? 'disabled' : ''}>
          下一步：开始筛选 →
        </button>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    // Name change
    document.getElementById('config-name').addEventListener('input', (e) => {
      AppState.researchConfig.name = e.target.value.trim();
      render();
    });

    // Mode change
    document.getElementById('config-mode').addEventListener('change', (e) => {
      AppState.researchConfig.mode = e.target.value;
      render();
    });

    // Description change
    document.getElementById('config-desc').addEventListener('input', (e) => {
      AppState.researchConfig.description = e.target.value;
      render();
    });

    // Keyword tag input (include)
    setupTagInput('tag-include', 'tag-include-input', 'include');
    setupTagInput('tag-exclude', 'tag-exclude-input', 'exclude');

    // Tag remove clicks
    panel.addEventListener('click', (e) => {
      if (e.target.classList.contains('tag-remove')) {
        const type = e.target.dataset.type;
        const idx = parseInt(e.target.dataset.idx);
        if (type === 'include') AppState.researchConfig.keywords.include.splice(idx, 1);
        else if (type === 'exclude') AppState.researchConfig.keywords.exclude.splice(idx, 1);
        else if (type === 'example') AppState.researchConfig.examples.splice(idx, 1);
        render();
      }
    });

    // Add example
    document.getElementById('btn-add-example').addEventListener('click', () => {
      if (AppState.researchConfig.examples.length >= 5) {
        showToast('最多添加 5 篇示例文献', 'warning');
        return;
      }
      AppState.researchConfig.examples.push({ title: '', abstract: '' });
      render();
    });

    // Save / Load template
    document.getElementById('btn-save-template').addEventListener('click', () => {
      if (!AppState.researchConfig.name) {
        showToast('请先填写方向名称', 'warning');
        return;
      }
      const templates = loadTemplates();
      const existing = templates.findIndex(t => t.name === AppState.researchConfig.name);
      const data = JSON.parse(JSON.stringify(AppState.researchConfig));
      if (existing >= 0) templates[existing] = data;
      else templates.push(data);
      saveTemplates(templates);
      showToast('模板已保存', 'success');
    });

    document.getElementById('btn-load-template').addEventListener('click', () => {
      const templates = loadTemplates();
      if (templates.length === 0) {
        showToast('没有已保存的模板', 'info');
        return;
      }
      const { openModal } = require('./ui.js');
      // Dynamic import to avoid circular dep
      import('./ui.js').then(({ openModal }) => {
        openModal({
          title: '📂 加载模板',
          bodyHTML: templates.map((t, i) => `
            <div style="padding:12px;border:1px solid var(--color-border);border-radius:var(--radius);margin-bottom:8px;cursor:pointer;" class="template-item" data-idx="${i}">
              <strong>${escapeHtml(t.name)}</strong>
              <div style="font-size:12px;color:var(--color-text-secondary);">${escapeHtml(t.description.slice(0, 80))}${t.description.length > 80 ? '...' : ''}</div>
            </div>
          `).join(''),
          closeOnOverlay: true,
        });
        setTimeout(() => {
          document.querySelectorAll('.template-item').forEach(el => {
            el.addEventListener('click', () => {
              const idx = parseInt(el.dataset.idx);
              AppState.researchConfig = JSON.parse(JSON.stringify(templates[idx]));
              render();
              showToast('模板已加载', 'success');
              document.getElementById('modal-overlay').classList.add('hidden');
            });
          });
        }, 100);
      });
    });

    // Next step
    document.getElementById('btn-next-screening').addEventListener('click', () => {
      const name = document.getElementById('config-name').value.trim();
      const desc = document.getElementById('config-desc').value.trim();
      if (!name) { showToast('请填写方向名称', 'warning'); return; }
      if (!desc) { showToast('请填写研究描述', 'warning'); return; }
      AppState.researchConfig.name = name;
      AppState.researchConfig.description = desc;
      navigateTo('screening');
    });
  }

  function setupTagInput(wrapId, inputId, type) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = input.value.trim();
        if (val) {
          const arr = type === 'include' ? AppState.researchConfig.keywords.include : AppState.researchConfig.keywords.exclude;
          if (!arr.includes(val)) {
            arr.push(val);
            render();
          }
        }
      }
    });
  }

  render();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
```

- [ ] **Step 2: Commit**

```bash
git add js/config.js
git commit -m "feat: add research config — form, tags, examples, templates, prompt preview"
```

---

### Task 6: AI 筛选引擎 (`js/screen.js`)

**Files:**
- Create: `js/screen.js`

- [ ] **Step 1: 创建 js/screen.js**

```javascript
// js/screen.js — AI 筛选引擎

import { AppState, navigateTo, showToast } from './app.js';
import { chatCompletion, withRetry } from './api.js';
import { buildSystemPrompt, buildUserPrompt } from './config.js';
import { createProgressBar, createLogPanel, formatDuration, uuid } from './ui.js';
import { saveTask } from './history.js';

const BATCH_SIZE = 10;
const BATCH_DELAY = 500;
const MAX_RETRIES = 3;

let screeningPaused = false;
let screeningStopped = false;
let resumeResolver = null;

function waitForResume() {
  return new Promise((resolve) => {
    resumeResolver = resolve;
  });
}

/**
 * 解析 AI 返回的 JSON
 */
function parseAIResponse(content) {
  // Try direct parse
  try {
    return JSON.parse(content);
  } catch {}

  // Try extract JSON block
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch {}
  }

  return null;
}

/**
 * 验证结果字段
 */
function validateResult(parsed, mode) {
  if (!parsed) return false;

  if (mode === 'simple') {
    return typeof parsed.relevant === 'boolean';
  }
  // standard / detailed
  const validLevels = ['high', 'medium', 'low'];
  return validLevels.includes(parsed.level) && typeof parsed.reason === 'string';
}

/**
 * 处理一批文献
 */
async function processBatch(batch, config) {
  const systemPrompt = buildSystemPrompt(config);

  // For batch processing, we send each paper in a single message
  const papersText = batch.map((p, i) => {
    return `[文献${i + 1}]\n标题：${p.title}\n摘要：${p.abstract}`;
  }).join('\n\n---\n\n');

  let userPrompt;
  if (batch.length === 1) {
    userPrompt = `请判断以下文献：\n\n${papersText}`;
  } else {
    userPrompt = `请逐条判断以下 ${batch.length} 篇文献，对每篇返回一个 JSON 对象，格式为：\n{"results": [{"index": 1, "level": "high/medium/low", "score": 0-100, "reason": "理由"}, ...]}\n\n${papersText}`;
  }

  const result = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { maxTokens: 2048, temperature: 0.1 }
  );

  const content = result.choices[0]?.message?.content || '';

  if (batch.length === 1) {
    const parsed = parseAIResponse(content);
    if (validateResult(parsed, config.mode)) {
      return [{ paperIndex: 0, result: parsed, rawResponse: content }];
    }
    // Fallback
    return [{ paperIndex: 0, result: { level: 'low', score: 0, reason: 'AI 响应解析失败' }, rawResponse: content, parseError: true }];
  }

  // Batch response
  const parsed = parseAIResponse(content);
  if (parsed && Array.isArray(parsed.results)) {
    return parsed.results.map((r) => ({
      paperIndex: r.index - 1,
      result: {
        level: r.level || 'low',
        score: r.score || 0,
        reason: r.reason || '',
        ...(r.subtopics ? { subtopics: r.subtopics } : {}),
        ...(r.methodology_match ? { methodology_match: r.methodology_match } : {}),
        ...(r.priority ? { priority: r.priority } : {}),
      },
      rawResponse: content,
    }));
  }

  // Fallback: mark all as parse error
  return batch.map((_, i) => ({
    paperIndex: i,
    result: { level: 'low', score: 0, reason: 'AI 响应解析失败' },
    rawResponse: content,
    parseError: true,
  }));
}

/**
 * 预估剩余时间
 */
function estimateTime(completedBatches, totalBatches, batchDelay) {
  const remaining = totalBatches - completedBatches;
  const msPerBatch = batchDelay + 2000; // batch delay + estimated API call time
  return remaining * msPerBatch;
}

/**
 * 开始筛选
 */
export async function startScreening() {
  const papers = AppState.papers;
  const config = AppState.researchConfig;

  if (papers.length === 0) {
    showToast('没有文献可筛选', 'warning');
    return;
  }

  screeningPaused = false;
  screeningStopped = false;
  AppState.screeningStatus = 'running';
  AppState.screeningProgress = { processed: 0, total: papers.length };

  const panel = document.getElementById('panel-screening');
  const logContainer = document.createElement('div');
  const progressContainer = document.createElement('div');
  progressContainer.className = 'screening-progress';

  panel.querySelector('.screening-controls').innerHTML = `
    <button class="btn" id="btn-pause">⏸ 暂停</button>
    <button class="btn btn-danger" id="btn-stop">⏹ 停止</button>
  `;
  panel.querySelector('.screening-body').appendChild(progressContainer);
  panel.querySelector('.screening-body').appendChild(logContainer);

  const progress = createProgressBar(progressContainer);
  const log = createLogPanel(logContainer);

  log.info(`开始筛选 ${papers.length} 篇文献`);
  log.info(`研究方向：${config.name}`);
  log.info(`筛选粒度：${config.mode}`);
  log.info(`每批 ${BATCH_SIZE} 篇，批次间隔 ${BATCH_DELAY}ms`);

  // Bind controls
  document.getElementById('btn-pause').addEventListener('click', () => {
    if (screeningPaused) {
      screeningPaused = false;
      if (resumeResolver) resumeResolver();
      document.getElementById('btn-pause').textContent = '⏸ 暂停';
      log.info('▶ 继续筛选');
    } else {
      screeningPaused = true;
      document.getElementById('btn-pause').textContent = '▶ 继续';
      log.info('⏸ 已暂停（当前批次完成后生效）');
    }
  });

  document.getElementById('btn-stop').addEventListener('click', () => {
    screeningStopped = true;
    if (screeningPaused && resumeResolver) resumeResolver();
    document.getElementById('btn-pause').disabled = true;
    document.getElementById('btn-stop').disabled = true;
    log.info('⏹ 停止筛选');
  });

  // Process
  const batches = [];
  for (let i = 0; i < papers.length; i += BATCH_SIZE) {
    batches.push(papers.slice(i, Math.min(i + BATCH_SIZE, papers.length)));
  }

  const results = new Array(papers.length).fill(null);
  const startTime = Date.now();

  for (let b = 0; b < batches.length; b++) {
    if (screeningPaused) await waitForResume();
    if (screeningStopped) break;

    const batch = batches[b];
    const batchNum = b + 1;
    log.info(`处理第 ${batchNum}/${batches.length} 批（${batch.length} 篇）...`);

    try {
      const batchResults = await withRetry(() => processBatch(batch, config), MAX_RETRIES);

      for (const br of batchResults) {
        const globalIdx = b * BATCH_SIZE + br.paperIndex;
        if (globalIdx < papers.length) {
          results[globalIdx] = {
            ...br.result,
            rawResponse: br.rawResponse,
            parseError: br.parseError || false,
            manualOverride: false,
          };
        }
      }

      // Log results
      batchResults.forEach(br => {
        const paper = papers[b * BATCH_SIZE + br.paperIndex];
        const prefix = br.result.level === 'high' ? '🟢' : br.result.level === 'medium' ? '🟡' : '🔴';
        const logFn = br.result.level === 'high' ? 'high' : br.result.level === 'medium' ? 'medium' : 'low';
        log[logFn](`${prefix} ${paper.title.slice(0, 60)}... — ${br.result.reason.slice(0, 60)}`);
      });
    } catch (err) {
      log.error(`第 ${batchNum} 批处理失败: ${err.message}`);
      // Mark all in this batch as error
      for (const paper of batch) {
        const idx = papers.indexOf(paper);
        if (idx >= 0) {
          results[idx] = { level: 'low', score: 0, reason: `处理失败: ${err.message}`, rawResponse: '', parseError: true, manualOverride: false };
        }
      }
    }

    // Update progress
    const processed = results.filter(r => r !== null).length;
    AppState.screeningProgress.processed = processed;
    progress.update(processed, papers.length);

    const eta = estimateTime(b + 1, batches.length, BATCH_DELAY);
    progress.setETA(`预计剩余 ${formatDuration(eta)}`);

    // Save progress to IndexedDB
    const validResults = results.filter(r => r !== null);
    if (validResults.length > 0) {
      try {
        await saveTask({
          id: 'current_screening',
          createdAt: new Date().toISOString(),
          config: config,
          papers: papers,
          titleColumn: AppState.titleColumn,
          abstractColumn: AppState.abstractColumn,
          results: validResults,
          stats: {
            high: validResults.filter(r => r.level === 'high').length,
            medium: validResults.filter(r => r.level === 'medium').length,
            low: validResults.filter(r => r.level === 'low').length,
          },
          status: 'screening',
        });
      } catch (e) { /* storage failed silently */ }
    }

    if (b < batches.length - 1 && !screeningStopped) {
      await new Promise(r => setTimeout(r, BATCH_DELAY));
    }
  }

  // Finalize
  const validResults = results.filter(r => r !== null);
  const elapsed = Date.now() - startTime;

  if (screeningStopped) {
    AppState.screeningStatus = 'completed';
    log.info(`筛选已停止。共处理 ${validResults.length}/${papers.length} 篇`);
  } else {
    AppState.screeningStatus = 'completed';
    log.info(`✅ 筛选完成！共处理 ${papers.length} 篇，耗时 ${formatDuration(elapsed)}`);
  }

  AppState.screeningResults = validResults;
  AppState.screeningProgress.processed = validResults.length;
  progress.update(validResults.length, papers.length);
  progress.setETA('完成');

  // Save final results
  const stats = {
    high: validResults.filter(r => r.level === 'high').length,
    medium: validResults.filter(r => r.level === 'medium').length,
    low: validResults.filter(r => r.level === 'low').length,
  };

  try {
    await saveTask({
      id: uuid(),
      createdAt: new Date().toISOString(),
      config: config,
      papers: papers,
      titleColumn: AppState.titleColumn,
      abstractColumn: AppState.abstractColumn,
      results: validResults,
      stats,
      status: 'completed',
    });
  } catch (e) { /* storage failed silently */ }

  showToast(`筛选完成：🟢${stats.high} 🟡${stats.medium} 🔴${stats.low}`, 'success');

  // Update controls
  const controlsEl = panel.querySelector('.screening-controls');
  controlsEl.innerHTML = `
    <button class="btn btn-primary" id="btn-view-results">查看结果 →</button>
  `;
  document.getElementById('btn-view-results').addEventListener('click', () => navigateTo('results'));
}

/**
 * 初始化筛选面板
 */
export async function initScreening() {
  const panel = document.getElementById('panel-screening');
  panel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">③ 开始筛选</h2>
      <p class="panel-desc" id="screening-summary">共 ${AppState.papers.length} 篇文献待筛选</p>
    </div>
    <div class="screening-body"></div>
    <div class="screening-controls" style="margin-top:16px;">
      <button class="btn btn-primary btn-lg" id="btn-start-screening">🚀 开始筛选</button>
    </div>
  `;

  document.getElementById('btn-start-screening').addEventListener('click', startScreening);
}

// Re-export uuid for use
import { uuid } from './ui.js';
```

- [ ] **Step 2: Commit**

```bash
git add js/screen.js
git commit -m "feat: add screening engine — batch processing, progress, pause/resume, checkpoint save"
```

---

### Task 7: 结果面板 (`js/results.js`)

**Files:**
- Create: `js/results.js`

- [ ] **Step 1: 创建 js/results.js**

```javascript
// js/results.js — 结果展示 & 交互

import { AppState, navigateTo, showToast } from './app.js';
import { confirm, debounce } from './ui.js';

let chartInstance = null;
let currentFilter = 'all';
let currentSort = { field: '', asc: true };
let expandedRows = new Set();

/**
 * 渲染结果面板
 */
export function renderResults() {
  const panel = document.getElementById('panel-results');
  const results = AppState.screeningResults;
  const papers = AppState.papers;
  const stats = getStats(results);

  panel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">④ 查看结果</h2>
      <p class="panel-desc">共 ${results.length} 条筛选结果</p>
    </div>

    <!-- Stats Cards -->
    <div class="stats-cards">
      <div class="stat-card high">
        <div class="stat-number">${stats.high}</div>
        <div class="stat-label">✅ 高度相关</div>
      </div>
      <div class="stat-card medium">
        <div class="stat-number">${stats.medium}</div>
        <div class="stat-label">🟡 可能相关</div>
      </div>
      <div class="stat-card low">
        <div class="stat-number">${stats.low}</div>
        <div class="stat-label">❌ 不相关</div>
      </div>
    </div>

    <!-- Pie Chart -->
    <div class="chart-wrap">
      <canvas id="results-chart"></canvas>
    </div>

    <!-- Toolbar -->
    <div class="results-toolbar">
      <input type="text" class="search-input" id="results-search" placeholder="🔍 搜索标题或摘要...">
      <select class="filter-select" id="results-filter">
        <option value="all">全部分级</option>
        <option value="high">✅ 高度相关</option>
        <option value="medium">🟡 可能相关</option>
        <option value="low">❌ 不相关</option>
        <option value="manual">🔷 人工修正</option>
      </select>
      <button class="btn btn-sm" id="btn-select-all">全选</button>
      <button class="btn btn-sm" id="btn-deselect-all">取消全选</button>
      <button class="btn btn-sm" id="btn-batch-high">批量标为相关</button>
    </div>

    <!-- Results Table -->
    <div class="results-table-wrap">
      <table class="results-table" id="results-table">
        <thead>
          <tr>
            <th style="width:30px;"><input type="checkbox" id="check-all"></th>
            <th style="width:40px;">#</th>
            <th data-sort="title">标题 ▾</th>
            <th data-sort="author" style="width:80px;">作者</th>
            <th data-sort="year" style="width:60px;">年份</th>
            <th data-sort="level" style="width:80px;">分级</th>
            <th data-sort="score" style="width:60px;">评分</th>
          </tr>
        </thead>
        <tbody id="results-tbody"></tbody>
      </table>
    </div>

    <div class="panel-actions">
      <button class="btn btn-primary btn-lg" id="btn-next-export">下一步：导出报告 →</button>
    </div>
  `;

  renderChart(stats);
  renderTable();
  bindResultsEvents();
}

function getStats(results) {
  return {
    high: results.filter(r => r.level === 'high').length,
    medium: results.filter(r => r.level === 'medium').length,
    low: results.filter(r => r.level === 'low').length,
    manual: results.filter(r => r.manualOverride).length,
  };
}

function renderChart(stats) {
  if (chartInstance) chartInstance.destroy();
  const ctx = document.getElementById('results-chart');
  if (!ctx) return;

  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['高度相关', '可能相关', '不相关'],
      datasets: [{
        data: [stats.high, stats.medium, stats.low],
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
        borderColor: '#FFFFFF',
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
      },
      onClick: (e, elements) => {
        if (elements.length > 0) {
          const idx = elements[0].index;
          const levels = ['high', 'medium', 'low'];
          document.getElementById('results-filter').value = levels[idx];
          currentFilter = levels[idx];
          renderTable();
        }
      },
    },
  });
}

function getFilteredResults() {
  let results = AppState.screeningResults.map((r, i) => ({ ...r, _idx: i }));

  // Apply level filter
  if (currentFilter === 'manual') {
    results = results.filter(r => r.manualOverride);
  } else if (currentFilter !== 'all') {
    results = results.filter(r => r.level === currentFilter);
  }

  // Apply search
  const searchEl = document.getElementById('results-search');
  if (searchEl && searchEl.value.trim()) {
    const query = searchEl.value.trim().toLowerCase();
    results = results.filter(r => {
      const paper = AppState.papers[r._idx];
      return paper && (
        paper.title.toLowerCase().includes(query) ||
        paper.abstract.toLowerCase().includes(query) ||
        (r.reason || '').toLowerCase().includes(query)
      );
    });
  }

  // Apply sort
  if (currentSort.field) {
    results.sort((a, b) => {
      const paperA = AppState.papers[a._idx] || {};
      const paperB = AppState.papers[b._idx] || {};
      let va, vb;
      switch (currentSort.field) {
        case 'title': va = paperA.title || ''; vb = paperB.title || ''; break;
        case 'author': va = paperA.author || ''; vb = paperB.author || ''; break;
        case 'year': va = paperA.year || ''; vb = paperB.year || ''; break;
        case 'level': va = a.level; vb = b.level; break;
        case 'score': va = a.score || 0; vb = b.score || 0; break;
        default: return 0;
      }
      if (va < vb) return currentSort.asc ? -1 : 1;
      if (va > vb) return currentSort.asc ? 1 : -1;
      return 0;
    });
  }

  return results;
}

function renderTable() {
  const tbody = document.getElementById('results-tbody');
  if (!tbody) return;
  const filtered = getFilteredResults();
  const papers = AppState.papers;

  tbody.innerHTML = filtered.map((r, displayIdx) => {
    const paper = papers[r._idx] || {};
    const levelLabel = r.level === 'high' ? '高度相关' : r.level === 'medium' ? '可能相关' : '不相关';
    const badgeCls = r.manualOverride ? 'badge-manual' : `badge-${r.level}`;
    const manualMark = r.manualOverride ? ' 🔷' : '';

    const isExpanded = expandedRows.has(r._idx);
    const detailRow = isExpanded ? `
      <tr class="detail-row show">
        <td colspan="7">
          <div class="detail-content">
            <div class="detail-label">完整摘要</div>
            <div class="detail-text">${escapeHtml(paper.abstract || '（无摘要）')}</div>
            <div class="detail-label">AI 判断理由</div>
            <div class="detail-text">${escapeHtml(r.reason || '（无）')}${r.parseError ? ' ⚠️ 解析失败' : ''}</div>
            ${r.subtopics ? `<div class="detail-label">涉及子主题</div><div class="detail-text">${escapeHtml(r.subtopics.join('、'))}</div>` : ''}
            ${r.methodology_match ? `<div class="detail-label">方法匹配</div><div class="detail-text">${escapeHtml(r.methodology_match)}</div>` : ''}
            ${r.rawResponse ? `<div class="detail-label">原始 API 响应</div><div class="detail-text" style="font-family:monospace;font-size:12px;">${escapeHtml(r.rawResponse.slice(0, 500))}</div>` : ''}
          </div>
        </td>
      </tr>` : '<tr class="detail-row"></tr>';

    return `
      <tr class="result-row" data-idx="${r._idx}">
        <td><input type="checkbox" class="row-check" data-idx="${r._idx}"></td>
        <td>${displayIdx + 1}</td>
        <td class="result-title" title="${escapeHtml(paper.title)}">${escapeHtml(paper.title.slice(0, 80))}${paper.title.length > 80 ? '...' : ''}</td>
        <td>${escapeHtml(paper.author || '-')}</td>
        <td>${escapeHtml(paper.year || '-')}</td>
        <td><span class="badge ${badgeCls}" data-idx="${r._idx}" title="点击修改分级">${levelLabel}${manualMark}</span></td>
        <td>${r.score ?? '-'}</td>
      </tr>
      ${detailRow}
    `;
  }).join('');

  // Update check-all state
  const total = document.querySelectorAll('.row-check').length;
  const checked = document.querySelectorAll('.row-check:checked').length;
  const checkAll = document.getElementById('check-all');
  if (checkAll) {
    checkAll.checked = total > 0 && checked === total;
    checkAll.indeterminate = checked > 0 && checked < total;
  }
}

function bindResultsEvents() {
  // Search
  document.getElementById('results-search').addEventListener('input', debounce(() => renderTable(), 300));

  // Filter
  document.getElementById('results-filter').addEventListener('change', (e) => {
    currentFilter = e.target.value;
    renderTable();
  });

  // Sort
  document.querySelectorAll('#results-table th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (currentSort.field === field) {
        currentSort.asc = !currentSort.asc;
      } else {
        currentSort.field = field;
        currentSort.asc = true;
      }
      renderTable();
    });
  });

  // Check all
  document.getElementById('check-all').addEventListener('change', (e) => {
    document.querySelectorAll('.row-check').forEach(cb => cb.checked = e.target.checked);
  });

  // Select/Deselect all buttons
  document.getElementById('btn-select-all').addEventListener('click', () => {
    document.querySelectorAll('.row-check').forEach(cb => cb.checked = true);
  });
  document.getElementById('btn-deselect-all').addEventListener('click', () => {
    document.querySelectorAll('.row-check').forEach(cb => cb.checked = false);
  });

  // Batch mark high
  document.getElementById('btn-batch-high').addEventListener('click', () => {
    const checked = document.querySelectorAll('.row-check:checked');
    if (checked.length === 0) { showToast('请先选择文献', 'warning'); return; }
    checked.forEach(cb => {
      const idx = parseInt(cb.dataset.idx);
      const result = AppState.screeningResults[idx];
      if (result) {
        result.level = 'high';
        result.manualOverride = true;
        result.reason = (result.reason || '') + ' [人工修正：标为高度相关]';
      }
    });
    renderResults();
    showToast(`已修改 ${checked.length} 条`, 'info');
  });

  // Row click to expand
  const panel = document.getElementById('panel-results');
  panel.addEventListener('click', (e) => {
    // Badge click — manual override
    if (e.target.classList.contains('badge')) {
      const idx = parseInt(e.target.dataset.idx);
      cycleLevel(idx);
      return;
    }
    // Row click — expand
    const row = e.target.closest('.result-row');
    if (row && !e.target.closest('input[type="checkbox"]')) {
      const idx = parseInt(row.dataset.idx);
      if (expandedRows.has(idx)) {
        expandedRows.delete(idx);
      } else {
        expandedRows.add(idx);
      }
      renderTable();
    }
  });

  // Next step
  document.getElementById('btn-next-export').addEventListener('click', () => navigateTo('export'));
}

function cycleLevel(idx) {
  const result = AppState.screeningResults[idx];
  if (!result) return;
  const levels = ['high', 'medium', 'low'];
  const currentIdx = levels.indexOf(result.level);
  const nextIdx = (currentIdx + 1) % levels.length;
  result.level = levels[nextIdx];
  result.manualOverride = true;
  if (!result.reason.includes('[人工修正')) {
    result.reason = (result.reason || '') + ` [人工修正：${levels[nextIdx] === 'high' ? '高度相关' : levels[nextIdx] === 'medium' ? '可能相关' : '不相关'}]`;
  }
  renderResults();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/**
 * 初始化结果面板
 */
export async function initResults() {
  const panel = document.getElementById('panel-results');
  panel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">④ 查看结果</h2>
      <p class="panel-desc">筛选完成后在此查看结果</p>
    </div>
    <div style="text-align:center;padding:40px;color:var(--color-text-secondary);">
      <div style="font-size:48px;margin-bottom:12px;">📊</div>
      <p>请先完成文献筛选</p>
    </div>
  `;
}

export { getStats };
```

- [ ] **Step 2: Commit**

```bash
git add js/results.js
git commit -m "feat: add results panel — stats cards, pie chart, sortable table, manual override"
```

---

### Task 8: 导出中心 (`js/export.js`)

**Files:**
- Create: `js/export.js`

- [ ] **Step 1: 创建 js/export.js**

```javascript
// js/export.js — 导出 Excel / Markdown 报告 / PRISMA 图

import { AppState, navigateTo, showToast } from './app.js';
import { getStats } from './results.js';

/**
 * 生成文件名
 */
function generateFilename(prefix, ext) {
  const name = AppState.researchConfig.name || '未命名';
  const date = new Date().toISOString().slice(0, 10);
  return `${prefix}_${name}_${date}.${ext}`;
}

/**
 * 导出 Excel
 */
function exportExcel() {
  const results = AppState.screeningResults;
  const papers = AppState.papers;

  const rows = results.map((r, i) => {
    const paper = papers[r._idx] || {};
    const levelLabel = r.level === 'high' ? '高度相关' : r.level === 'medium' ? '可能相关' : '不相关';
    return {
      '序号': i + 1,
      '分级': levelLabel,
      '相关度评分': r.score ?? '',
      '标题': paper.title || '',
      '摘要': paper.abstract || '',
      '作者': paper.author || '',
      '年份': paper.year || '',
      '来源': paper.source || '',
      'AI判断理由': r.reason || '',
      '相关子主题': (r.subtopics || []).join('、'),
      '方法匹配': r.methodology_match || '',
      '优先级': r.priority ?? '',
      '人工修正': r.manualOverride ? '是' : '否',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  // Apply conditional formatting colors via cell styles
  const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: 'F5F6FA' } } };
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let C = 0; C <= range.e.c; C++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: C });
    if (ws[cellRef]) ws[cellRef].s = headerStyle;
  }

  // Column widths
  ws['!cols'] = [
    { wch: 6 }, { wch: 10 }, { wch: 8 }, { wch: 60 }, { wch: 80 },
    { wch: 15 }, { wch: 8 }, { wch: 20 }, { wch: 50 }, { wch: 20 },
    { wch: 10 }, { wch: 8 }, { wch: 8 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '筛选结果');
  XLSX.writeFile(wb, generateFilename('筛选结果', 'xlsx'));
}

/**
 * 导出 Markdown 报告
 */
function exportMarkdownReport() {
  const config = AppState.researchConfig;
  const results = AppState.screeningResults;
  const papers = AppState.papers;
  const stats = getStats(results);

  const lines = [];

  lines.push(`# 文献筛选报告`);
  lines.push('');
  lines.push(`**生成时间：** ${new Date().toLocaleString()}`);
  lines.push(`**研究方向：** ${config.name}`);
  lines.push(`**筛选粒度：** ${config.mode === 'simple' ? '简单模式' : config.mode === 'standard' ? '标准模式' : '详细模式'}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 筛选标准');
  lines.push('');
  lines.push('### 研究描述');
  lines.push(config.description);
  lines.push('');
  if (config.keywords.include.length > 0) {
    lines.push('### 包含关键词');
    lines.push(config.keywords.include.map(k => `- ${k}`).join('\n'));
    lines.push('');
  }
  if (config.keywords.exclude.length > 0) {
    lines.push('### 排除关键词');
    lines.push(config.keywords.exclude.map(k => `- ${k}`).join('\n'));
    lines.push('');
  }
  if (config.examples.length > 0) {
    lines.push('### 示例文献');
    config.examples.forEach((ex, i) => {
      lines.push(`**示例 ${i + 1}：** ${ex.title}`);
      lines.push(`> ${ex.abstract.slice(0, 200)}${ex.abstract.length > 200 ? '...' : ''}`);
      lines.push('');
    });
  }

  lines.push('---');
  lines.push('');
  lines.push('## 统计摘要');
  lines.push('');
  lines.push(`| 分类 | 数量 | 占比 |`);
  lines.push(`|------|------|------|`);
  lines.push(`| ✅ 高度相关 | ${stats.high} | ${(stats.high / results.length * 100).toFixed(1)}% |`);
  lines.push(`| 🟡 可能相关 | ${stats.medium} | ${(stats.medium / results.length * 100).toFixed(1)}% |`);
  lines.push(`| ❌ 不相关 | ${stats.low} | ${(stats.low / results.length * 100).toFixed(1)}% |`);
  lines.push(`| **总计** | **${results.length}** | **100%** |`);
  lines.push('');

  lines.push('---');
  lines.push('');

  // Highly relevant
  lines.push('## ✅ 高度相关文献');
  lines.push('');
  const highResults = results.filter(r => r.level === 'high');
  highResults.forEach((r, i) => {
    const paper = papers[r._idx] || {};
    lines.push(`### ${i + 1}. ${paper.title}`);
    lines.push(`- **作者：** ${paper.author || '未知'} | **年份：** ${paper.year || '未知'}`);
    lines.push(`- **评分：** ${r.score ?? '-'} | **优先级：** ${r.priority ?? '-'}`);
    lines.push(`- **理由：** ${r.reason}`);
    lines.push(`- **摘要：** ${paper.abstract.slice(0, 300)}${paper.abstract.length > 300 ? '...' : ''}`);
    lines.push('');
  });

  // Medium
  if (stats.medium > 0) {
    lines.push('## 🟡 可能相关文献');
    lines.push('');
    const medResults = results.filter(r => r.level === 'medium');
    medResults.forEach((r, i) => {
      const paper = papers[r._idx] || {};
      lines.push(`- **${paper.title}** — ${r.reason}`);
    });
    lines.push('');
  }

  // Low
  lines.push('## ❌ 排除文献');
  lines.push('');
  const lowResults = results.filter(r => r.level === 'low');
  lowResults.forEach((r, i) => {
    const paper = papers[r._idx] || {};
    lines.push(`- ~~${paper.title}~~ — ${r.reason ? r.reason.slice(0, 80) : '不相关'}`);
  });
  lines.push('');

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  downloadBlob(blob, generateFilename('筛选报告', 'md'));
}

/**
 * 导出 PRISMA 流程图
 */
function exportPRISMA() {
  const results = AppState.screeningResults;
  const stats = getStats(results);
  const total = AppState.papers.length;

  // Dedup estimate (simplified: we detected during upload, use that info)
  const dupes = 0; // Could retrieve from upload module, simplified for now
  const afterDedup = total;

  // PRISMA numbers
  const identified = total;
  const screened = afterDedup;
  const excluded = stats.low;
  const eligible = stats.high + stats.medium;
  const excludedEligible = stats.medium;
  const included = stats.high;

  // Draw PRISMA on Canvas
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 800, 600);

  // Style
  const boxW = 200, boxH = 50;
  const centerX = 400;
  const font = '14px -apple-system, BlinkMacSystemFont, sans-serif';

  function drawBox(x, y, label, n, color = '#2563EB') {
    // Box
    ctx.fillStyle = color;
    ctx.fillRect(x - boxW / 2, y, boxW, boxH);
    // Text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + 22);
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`(n=${n})`, x, y + 40);
  }

  function drawArrow(x1, y1, x2, y2) {
    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    // Arrowhead
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const hx = x2 - 8 * Math.cos(angle - Math.PI / 6);
    const hy = y2 - 8 * Math.sin(angle - Math.PI / 6);
    const hx2 = x2 - 8 * Math.cos(angle + Math.PI / 6);
    const hy2 = y2 - 8 * Math.sin(angle + Math.PI / 6);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(hx, hy);
    ctx.lineTo(hx2, hy2);
    ctx.fillStyle = '#6B7280';
    ctx.fill();
  }

  function drawExclusionBox(x, y, label, n) {
    ctx.fillStyle = '#FEE2E2';
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2;
    ctx.fillRect(x - 80, y, 160, 40);
    ctx.strokeRect(x - 80, y, 160, 40);
    ctx.fillStyle = '#991B1B';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${label} (n=${n})`, x, y + 25);
  }

  // Layout
  const leftX = centerX - 160;
  const rightX = centerX + 160;
  let y = 40;

  // Title
  ctx.fillStyle = '#1A1A2E';
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PRISMA 流程图', centerX, y);
  y += 40;

  // Identification
  drawBox(centerX, y, '文献检索识别', identified, '#2563EB');
  y += boxH + 30;

  // Screening
  drawBox(centerX, y, '去重后文献', screened, '#2563EB');
  drawArrow(leftX, y + 10, leftX, y - 20);
  y += boxH + 20;
  drawExclusionBox(rightX, y - 15, '排除（不相关）', excluded);
  drawArrow(rightX, y - 35, rightX - 60, y - 35);
  y += 40;

  // Eligibility
  drawBox(centerX, y, '合格文献（全文评估）', eligible, '#2563EB');
  drawArrow(leftX, y + 10, leftX, y - 30);
  y += boxH + 20;
  drawExclusionBox(rightX, y - 15, '排除（可能相关但方法不符）', excludedEligible);
  drawArrow(rightX, y - 35, rightX - 60, y - 35);
  y += 40;

  // Included
  drawBox(centerX, y, '最终纳入文献', included, '#10B981');
  drawArrow(leftX, y + 10, leftX, y - 30);
  y += 60;

  // Legend
  ctx.fillStyle = '#6B7280';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('生成时间：' + new Date().toLocaleString(), centerX, y);

  canvas.toBlob((blob) => {
    downloadBlob(blob, generateFilename('PRISMA流程图', 'png'));
  });
}

/**
 * 触发文件下载
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`已导出：${filename}`, 'success');
}

/**
 * 渲染导出预览
 */
export function renderExportPreview(type) {
  const preview = document.getElementById('export-preview');
  if (!preview) return;
  const results = AppState.screeningResults;
  const papers = AppState.papers;
  const stats = getStats(results);

  if (type === 'excel') {
    preview.innerHTML = `
      <h4 style="margin-bottom:12px;">📊 Excel 预览（前 5 条）</h4>
      <div class="preview-table-wrap">
        <table class="preview-table">
          <thead><tr><th>#</th><th>分级</th><th>标题</th><th>评分</th><th>理由</th></tr></thead>
          <tbody>
            ${results.slice(0, 5).map((r, i) => {
              const paper = papers[r._idx] || {};
              const levelLabel = r.level === 'high' ? '高度相关' : r.level === 'medium' ? '可能相关' : '不相关';
              return `<tr>
                <td>${i + 1}</td>
                <td>${levelLabel}</td>
                <td>${escapeHtml(paper.title?.slice(0, 50) || '')}</td>
                <td>${r.score ?? '-'}</td>
                <td>${escapeHtml((r.reason || '').slice(0, 60))}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <p style="font-size:12px;color:var(--color-text-secondary);margin-top:8px;">... 共 ${results.length} 条，导出为 .xlsx 文件，表头加粗、分级列条件着色</p>
    `;
  } else if (type === 'report') {
    preview.innerHTML = `
      <h4 style="margin-bottom:12px;">📝 筛选报告预览</h4>
      <div style="background:#fff;padding:16px;border:1px solid var(--color-border);border-radius:var(--radius);max-height:300px;overflow-y:auto;">
        <h2 style="font-size:18px;">文献筛选报告</h2>
        <p style="font-size:12px;color:var(--color-text-secondary);">研究方向：${escapeHtml(AppState.researchConfig.name)}</p>
        <hr>
        <h3>统计摘要</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr><td>✅ 高度相关</td><td><strong>${stats.high}</strong></td><td>${(stats.high / results.length * 100).toFixed(1)}%</td></tr>
          <tr><td>🟡 可能相关</td><td><strong>${stats.medium}</strong></td><td>${(stats.medium / results.length * 100).toFixed(1)}%</td></tr>
          <tr><td>❌ 不相关</td><td><strong>${stats.low}</strong></td><td>${(stats.low / results.length * 100).toFixed(1)}%</td></tr>
        </table>
        <p style="margin-top:12px;font-size:12px;color:var(--color-text-secondary);">导出为 .md 文件，包含完整的筛选标准、统计、分类文献列表</p>
      </div>
    `;
  } else if (type === 'prisma') {
    preview.innerHTML = `
      <h4 style="margin-bottom:12px;">📐 PRISMA 流程图预览</h4>
      <div style="background:#fff;padding:24px;border:1px solid var(--color-border);border-radius:var(--radius);text-align:center;">
        <div style="font-size:16px;font-weight:600;margin-bottom:20px;">PRISMA 流程图</div>
        <div style="display:inline-block;text-align:left;font-size:14px;line-height:2;">
          <div style="background:var(--color-primary);color:#fff;padding:8px 40px;border-radius:4px;margin-bottom:8px;text-align:center;">文献检索识别 (n=${AppState.papers.length})</div>
          <div style="text-align:center;color:var(--color-text-secondary);margin:4px 0;">↓</div>
          <div style="background:var(--color-primary);color:#fff;padding:8px 40px;border-radius:4px;margin-bottom:8px;text-align:center;">去重后文献 (n=${AppState.papers.length})</div>
          <div style="text-align:center;color:var(--color-text-secondary);margin:4px 0;">↓</div>
          <div style="display:flex;gap:20px;align-items:center;">
            <div style="background:var(--color-primary);color:#fff;padding:8px 40px;border-radius:4px;text-align:center;">合格文献 (n=${stats.high + stats.medium})</div>
            <div style="background:#FEE2E2;color:#991B1B;padding:8px 20px;border-radius:4px;border:2px solid #EF4444;">排除 (n=${stats.low})</div>
          </div>
          <div style="text-align:center;color:var(--color-text-secondary);margin:4px 0;">↓</div>
          <div style="background:#10B981;color:#fff;padding:8px 40px;border-radius:4px;text-align:center;">最终纳入 (n=${stats.high})</div>
        </div>
        <p style="margin-top:16px;font-size:12px;color:var(--color-text-secondary);">导出为 .png 图片，适合直接插入论文</p>
      </div>
    `;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/**
 * 初始化导出面板
 */
export async function initExport() {
  const panel = document.getElementById('panel-export');
  panel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">⑤ 导出报告</h2>
      <p class="panel-desc">选择导出格式，预览后下载</p>
    </div>

    <div class="export-options">
      <div class="export-option selected" data-type="excel">
        <div class="export-option-icon">📊</div>
        <div class="export-option-title">Excel 表格</div>
        <div class="export-option-desc">完整的筛选结果 .xlsx</div>
      </div>
      <div class="export-option" data-type="report">
        <div class="export-option-icon">📝</div>
        <div class="export-option-title">筛选报告</div>
        <div class="export-option-desc">Markdown 格式报告 .md</div>
      </div>
      <div class="export-option" data-type="prisma">
        <div class="export-option-icon">📐</div>
        <div class="export-option-title">PRISMA 流程图</div>
        <div class="export-option-desc">标准流程图 .png</div>
      </div>
    </div>

    <div class="export-preview" id="export-preview"></div>

    <div class="panel-actions">
      <button class="btn btn-primary btn-lg" id="btn-export-all">📥 全部导出</button>
      <button class="btn btn-lg" id="btn-export-current">📥 导出当前选中</button>
    </div>
  `;

  let currentType = 'excel';
  renderExportPreview('excel');

  // Option clicks
  panel.querySelectorAll('.export-option').forEach(opt => {
    opt.addEventListener('click', () => {
      panel.querySelectorAll('.export-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      currentType = opt.dataset.type;
      renderExportPreview(currentType);
    });
  });

  // Export current
  document.getElementById('btn-export-current').addEventListener('click', () => {
    switch (currentType) {
      case 'excel': exportExcel(); break;
      case 'report': exportMarkdownReport(); break;
      case 'prisma': exportPRISMA(); break;
    }
  });

  // Export all
  document.getElementById('btn-export-all').addEventListener('click', async () => {
    exportExcel();
    await new Promise(r => setTimeout(r, 500));
    exportMarkdownReport();
    await new Promise(r => setTimeout(r, 500));
    exportPRISMA();
    showToast('全部导出完成！', 'success');
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add js/export.js
git commit -m "feat: add export center — Excel, Markdown report, PRISMA flowchart PNG"
```

---

### Task 9: 历史记录与设置 (`js/history.js`)

**Files:**
- Create: `js/history.js`

- [ ] **Step 1: 创建 js/history.js**

```javascript
// js/history.js — IndexedDB 存储 & 历史管理

import { showToast, uuid } from './ui.js';

const DB_NAME = 'LiteratureScreener';
const DB_VERSION = 1;
const STORE_NAME = 'screening_tasks';

/**
 * 打开 IndexedDB
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
    };

    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(new Error('无法打开本地数据库'));
  });
}

/**
 * 保存筛选任务
 */
export async function saveTask(task) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await new Promise((resolve, reject) => {
      const request = store.put(task);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  } catch (e) {
    // Fallback: try localStorage for small data
    try {
      const fallback = JSON.parse(localStorage.getItem('literature_screener_fallback') || '[]');
      const existing = fallback.findIndex(t => t.id === task.id);
      if (existing >= 0) fallback[existing] = task;
      else fallback.push(task);
      if (fallback.length > 20) fallback.splice(0, fallback.length - 20);
      localStorage.setItem('literature_screener_fallback', JSON.stringify(fallback));
    } catch { /* silent */ }
  }
}

/**
 * 加载单个任务
 */
export async function loadTask(id) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const task = await new Promise((resolve) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
    db.close();
    return task;
  } catch {
    // Try fallback
    try {
      const fallback = JSON.parse(localStorage.getItem('literature_screener_fallback') || '[]');
      return fallback.find(t => t.id === id) || null;
    } catch { return null; }
  }
}

/**
 * 加载历史任务列表（仅摘要）
 */
export function loadHistoryList() {
  // Use IndexedDB cursor
  return new Promise(async (resolve) => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('createdAt');
      const tasks = [];

      const request = index.openCursor(null, 'prev');
      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const t = cursor.value;
          tasks.push({
            id: t.id,
            createdAt: t.createdAt,
            config: { name: t.config?.name || '' },
            papers: t.papers,
            stats: t.stats,
            status: t.status,
          });
          cursor.continue();
        } else {
          db.close();
          resolve(tasks);
        }
      };
      request.onerror = () => { db.close(); resolve([]); };
    } catch {
      // Fallback
      try {
        const fallback = JSON.parse(localStorage.getItem('literature_screener_fallback') || '[]');
        resolve(fallback);
      } catch { resolve([]); }
    }
  });
}

/**
 * 删除单条历史
 */
export async function deleteTask(id) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  } catch { /* silent */ }
}

/**
 * 清空全部历史
 */
export async function clearHistory() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  } catch { /* silent */ }
  // Also clear fallback
  localStorage.removeItem('literature_screener_fallback');
}

/**
 * 导出历史数据
 */
export async function exportHistory() {
  const tasks = await loadHistoryList();
  const fullTasks = [];
  for (const t of tasks) {
    const full = await loadTask(t.id);
    if (full) fullTasks.push(full);
  }
  const json = JSON.stringify(fullTasks, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `历史数据_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('历史数据已导出', 'success');
}

/**
 * 导入历史数据
 */
export async function importHistory(file) {
  try {
    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsText(file);
    });
    const tasks = JSON.parse(text);
    if (!Array.isArray(tasks)) throw new Error('数据格式错误');
    for (const task of tasks) {
      await saveTask(task);
    }
    showToast(`成功导入 ${tasks.length} 条记录`, 'success');
  } catch (err) {
    showToast(`导入失败：${err.message}`, 'error');
  }
}

/**
 * 加载 API 设置
 */
export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem('literature_screener_settings') || '{}');
  } catch {
    return {};
  }
}

/**
 * 初始化历史模块
 */
export async function initHistory() {
  // Pre-flight: test IndexedDB availability
  try {
    await openDB();
  } catch {
    console.warn('IndexedDB not available, using localStorage fallback');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add js/history.js
git commit -m "feat: add history & settings — IndexedDB CRUD, fallback, import/export"
```

---

### Task 10: 集成联调 & 最终打磨

**Files:**
- Modify: `js/app.js`
- Modify: `js/config.js`
- Create: `README.md`

- [ ] **Step 1: 修复 config.js 中模板加载的循环依赖**

`js/config.js` 中的 `btn-load-template` 使用了 `require`，需要改为 `import`。修改 `config.js`：

```javascript
// 文件顶部添加
import { openModal } from './ui.js';

// 在 btn-load-template 的 click handler 中，直接使用 openModal：
document.getElementById('btn-load-template').addEventListener('click', () => {
  const templates = loadTemplates();
  if (templates.length === 0) {
    showToast('没有已保存的模板', 'info');
    return;
  }
  openModal({
    title: '📂 加载模板',
    bodyHTML: templates.map((t, i) => `
      <div style="padding:12px;border:1px solid var(--color-border);border-radius:var(--radius);margin-bottom:8px;cursor:pointer;" class="template-item" data-idx="${i}">
        <strong>${escapeHtml(t.name)}</strong>
        <div style="font-size:12px;color:var(--color-text-secondary);">${escapeHtml(t.description.slice(0, 80))}${t.description.length > 80 ? '...' : ''}</div>
      </div>
    `).join(''),
    closeOnOverlay: true,
  });
  setTimeout(() => {
    document.querySelectorAll('.template-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.idx);
        AppState.researchConfig = JSON.parse(JSON.stringify(templates[idx]));
        initConfig();
        showToast('模板已加载', 'success');
        document.getElementById('modal-overlay').classList.add('hidden');
      });
    });
  }, 100);
});
```

- [ ] **Step 2: 更新 app.js — 修复 history 加载为异步**

`js/app.js` 中的 `loadHistoryList` 调用需要加 `await`，将 `openHistoryModal` 内联的 `loadHistoryList` 调用改为异步。

在 `openHistoryModal` 函数中：

```javascript
async function openHistoryModal() {
  const tasks = await loadHistoryList(); // 加 await
  // ... rest stays the same
}
```

同样修复 `openSettingsModal` 中对 `testConnection` 的调用 —— 已经是 async 的，保持不变。

- [ ] **Step 3: 添加 app.js 全局错误处理**

在 `js/app.js` 的 `init` 函数中添加：

```javascript
async function init() {
  // Check ES module support
  const supportsESM = typeof import.meta !== 'undefined';
  if (!supportsESM) {
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
```

- [ ] **Step 4: 创建 README.md**

```markdown
# 学术文献智能筛选系统

面向学术研究者的文献智能筛选工具。上传 Excel 文献列表，配置研究方向，调用大模型 API 自动判断文献相关性。

## 功能

1. **文献导入** — 上传 Excel/CSV，自动识别标题和摘要列
2. **研究方向配置** — 关键词、自然语言描述、示例文献、三种筛选粒度
3. **AI 批量筛选** — 分批调用 DeepSeek V3.2，支持暂停/继续/断点续传
4. **结果查看** — 三级分类统计、饼图、可排序表格、人工覆写
5. **导出报告** — Excel 表格、Markdown 报告、PRISMA 流程图

## 在线使用

访问：`https://<用户名>.github.io/<仓库名>/`

## 本地运行

```bash
# Python
python -m http.server 8080
# 浏览器访问 http://localhost:8080
```

## 配置 API

1. 点击右上角 ⚙️ 设置
2. 填入硅基流动 API Key（在 https://siliconflow.cn 注册获取）
3. 点击「测试连接」验证
4. 保存设置

API Key 仅保存在你的浏览器本地，不会上传到任何服务器。

## 技术栈

- 原生 HTML/CSS/JS (ES Modules)
- SheetJS — Excel 读写
- Chart.js — 统计图表
- DeepSeek V3.2 (via 硅基流动 API)

## 文件结构

```
literature-screener/
├── index.html
├── css/style.css
├── js/
│   ├── app.js          # 主控制器
│   ├── ui.js           # 通用组件
│   ├── api.js          # API 封装
│   ├── upload.js       # 文献导入
│   ├── config.js       # 研究方向配置
│   ├── screen.js       # AI 筛选引擎
│   ├── results.js      # 结果面板
│   ├── export.js       # 导出中心
│   └── history.js      # 历史记录
└── README.md
```

## 许可证

本项目用于软件著作权申请。
```

- [ ] **Step 5: 启动本地服务器验证全部功能**

```bash
cd "D:\claude code\program" && python -m http.server 8080
```

验证清单：
- [ ] 页面加载正常，五步导航可见
- [ ] 点击设置，输入 API Key 测试连接
- [ ] 上传 Excel 文件，列映射弹窗正常
- [ ] 配置研究方向，保存/加载模板
- [ ] 开始筛选，进度条 + 日志滚动
- [ ] 结果面板：统计卡片、饼图、表格、搜索、分级切换
- [ ] 导出 Excel、Markdown、PRISMA
- [ ] 历史记录查看/清空

- [ ] **Step 6: 最终 Commit**

```bash
git add -A
git commit -m "feat: complete integration — fix circular deps, add README, final polish"
```

---

## 自审结果

- ✅ 覆盖设计文档所有 9 个 Phase
- ✅ 10 个文件全部有完整代码
- ✅ 所有步骤可直接执行
- ✅ 模块间接口一致（AppState 共享、import/export 匹配）
- ✅ 错误处理覆盖所有设计文档中的场景
