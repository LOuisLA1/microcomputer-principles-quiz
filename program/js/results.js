// js/results.js — 结果展示 & 交互

import { AppState, navigateTo, showToast } from './app.js';
import { debounce } from './ui.js';

let chartInstance = null;
let currentFilter = 'all';
let currentSort = { field: '', asc: true };
let expandedRows = new Set();

export function getStats(results) {
  return {
    high: results.filter(r => r.level === 'high').length,
    medium: results.filter(r => r.level === 'medium').length,
    low: results.filter(r => r.level === 'low').length,
    manual: results.filter(r => r.manualOverride).length,
  };
}

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

    <div class="chart-wrap">
      <canvas id="results-chart"></canvas>
    </div>

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

  if (currentFilter === 'manual') {
    results = results.filter(r => r.manualOverride);
  } else if (currentFilter !== 'all') {
    results = results.filter(r => r.level === currentFilter);
  }

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

  const total = document.querySelectorAll('.row-check').length;
  const checked = document.querySelectorAll('.row-check:checked').length;
  const checkAll = document.getElementById('check-all');
  if (checkAll) {
    checkAll.checked = total > 0 && checked === total;
    checkAll.indeterminate = checked > 0 && checked < total;
  }
}

function bindResultsEvents() {
  document.getElementById('results-search').addEventListener('input', debounce(() => renderTable(), 300));

  document.getElementById('results-filter').addEventListener('change', (e) => {
    currentFilter = e.target.value;
    renderTable();
  });

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

  document.getElementById('check-all').addEventListener('change', (e) => {
    document.querySelectorAll('.row-check').forEach(cb => cb.checked = e.target.checked);
  });

  document.getElementById('btn-select-all').addEventListener('click', () => {
    document.querySelectorAll('.row-check').forEach(cb => cb.checked = true);
  });
  document.getElementById('btn-deselect-all').addEventListener('click', () => {
    document.querySelectorAll('.row-check').forEach(cb => cb.checked = false);
  });

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

  const panel = document.getElementById('panel-results');
  panel.addEventListener('click', (e) => {
    if (e.target.classList.contains('badge')) {
      const idx = parseInt(e.target.dataset.idx);
      cycleLevel(idx);
      return;
    }
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
