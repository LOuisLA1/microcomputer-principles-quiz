// js/upload.js — Excel 上传 & 列映射

import { AppState, navigateTo, showToast } from './app.js';
import { openModal } from './ui.js';

const TITLE_PATTERNS = ['标题', '题目', '篇名', '论文名称', '文献标题', 'title', 'paper title', 'name'];
const ABSTRACT_PATTERNS = ['摘要', '内容摘要', '概要', 'abstract', 'summary', '内容', 'description'];

function jaccardSimilarity(a, b) {
  const setA = new Set(a.split(''));
  const setB = new Set(b.split(''));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

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

function showColumnMappingModal(headers, autoDetected, rawData) {
  return new Promise((resolve) => {
    // Values: -1=忽略, 0=标题列, 1=摘要列
    const options = ['-- 忽略 --', '标题列', '摘要列']
      .map((label, i) => `<option value="${i - 1}">${label}</option>`).join('');

    const rows = headers.map((h, i) => {
      const detected = autoDetected[i];
      // selected must match the option values: 0=标题列, 1=摘要列, -1=忽略
      const selected = detected === 'title' ? 0 : (detected === 'abstract' ? 1 : -1);
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
            if (val === 0) titleCol.push(colIdx);
            if (val === 1) abstractCol.push(colIdx);
          });
          if (titleCol.length === 0 || abstractCol.length === 0) {
            showToast('请至少指定一个标题列和一个摘要列', 'warning');
            return false;
          }
          resolve({ titleCol: titleCol[0], abstractCol: abstractCol[0] });
        }},
      ],
    });
  });
}

export async function initUpload() {
  const panel = document.getElementById('panel-upload');
  const papers = AppState.papers;

  const anomalies = [];
  if (papers.length > 0) {
    papers.forEach((p, i) => {
      if (!p.title) anomalies.push({ idx: i, title: '(空)', issue: '标题为空' });
      else if (p.title.length < 5) anomalies.push({ idx: i, title: p.title, issue: '标题过短（<5字）' });
      if (!p.abstract) anomalies.push({ idx: i, title: p.title || '(空)', issue: '摘要为空' });
      else if (p.abstract.length < 20) anomalies.push({ idx: i, title: p.title, issue: '摘要过短（<20字）' });
    });
  }

  const imported = papers.length > 0;
  const anomalySummary = anomalies.length > 0
    ? `<span style="color:#EF4444;cursor:pointer;" id="anomaly-toggle">${anomalies.length} 条异常 ⚠️ 点击查看详情</span>`
    : '无';

  const anomalyDetailRows = anomalies.length > 0
    ? anomalies.map(a => `<tr><td>${a.idx + 1}</td><td>${escapeHtml(a.title.slice(0, 60))}</td><td style="color:#EF4444;">${a.issue}</td></tr>`).join('')
    : '';

  // Build dupe info from saved state
  const dupes = AppState._dupes || [];
  const dupeCount = dupes.length;
  const dupeSummary = dupeCount > 0
    ? `<span style="color:#F59E0B;cursor:pointer;" id="dupe-toggle">${dupeCount} 组重复 ⚠️ 点击查看详情</span>`
    : '无';

  const dupeDetailRows = dupes.length > 0
    ? dupes.map(d => `<tr><td>${d.i + 1}</td><td>${escapeHtml(d.title.slice(0, 50))}</td><td>${d.j + 1}</td></tr>`).join('')
    : '';

  panel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">① 导入文献</h2>
      <p class="panel-desc">上传包含文献标题和摘要的 Excel / CSV 文件</p>
    </div>
    <div class="upload-zone" id="upload-zone" style="${imported ? 'opacity:0.5;pointer-events:none;' : ''}">
      <div class="upload-icon">📁</div>
      <div class="upload-text">${imported ? '已导入文献，点击下方按钮重新上传' : '拖拽文件到此处，或点击选择文件'}</div>
      <div class="upload-hint">支持 .xlsx / .xls / .csv，单文件 ≤ 10MB，最多 2000 条</div>
      <input type="file" class="upload-input" id="upload-input" accept=".xlsx,.xls,.csv" ${imported ? 'disabled' : ''}>
    </div>
    <div class="file-info ${imported ? 'show' : ''}" id="file-info">
      <div class="file-info-row"><span class="file-info-label">文件名：</span><span id="file-name">${escapeHtml(AppState._fileName || '-')}</span></div>
      <div class="file-info-row"><span class="file-info-label">文献数量：</span><span id="file-count">${imported ? papers.length + ' 篇' : '-'}</span></div>
      <div class="file-info-row"><span class="file-info-label">列数：</span><span id="file-cols">${escapeHtml(AppState._fileCols || '-')}</span></div>
      <div class="file-info-row"><span class="file-info-label">重复文献：</span><span id="file-dupes">${dupeSummary}</span></div>
      <div class="file-info-row"><span class="file-info-label">数据异常：</span><span id="file-anomalies">${anomalySummary}</span></div>
      ${anomalies.length > 0 ? `
      <div id="anomaly-detail" style="display:none;margin-top:12px;">
        <div style="font-weight:500;margin-bottom:8px;font-size:13px;">异常文献列表：</div>
        <div class="preview-table-wrap" style="max-height:200px;">
          <table class="preview-table">
            <thead><tr><th style="width:40px;">序号</th><th>标题</th><th style="width:140px;">问题</th></tr></thead>
            <tbody>${anomalyDetailRows}</tbody>
          </table>
        </div>
      </div>` : ''}
      ${dupes.length > 0 ? `
      <div id="dupe-detail" style="display:none;margin-top:12px;">
        <div style="font-weight:500;margin-bottom:8px;font-size:13px;">重复文献组（标题相似度 >90%）：</div>
        <div class="preview-table-wrap" style="max-height:200px;">
          <table class="preview-table">
            <thead><tr><th style="width:40px;">序号</th><th>标题</th><th style="width:60px;">重复项</th></tr></thead>
            <tbody>${dupeDetailRows}</tbody>
          </table>
        </div>
        <p style="font-size:11px;color:var(--color-text-secondary);margin-top:6px;">第2列为原文，第3列为与原文重复的文献序号。筛选时会自动去重。</p>
      </div>` : ''}
    </div>
    ${imported ? `
    <div class="preview-table-wrap" id="preview-wrap" style="margin-top:16px;">
      <table class="preview-table">
        <thead><tr>${[AppState.titleColumn, AppState.abstractColumn].filter(Boolean).map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
        <tbody>
          ${papers.slice(0, 10).map(p => `<tr>
            ${[p.title, p.abstract].map(v => `<td title="${escapeHtml(v || '')}">${escapeHtml(String(v || '').slice(0, 100))}</td>`).join('')}
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : '<div class="preview-table-wrap" id="preview-wrap" style="display:none;"></div>'}
    <div class="panel-actions">
      ${imported ? '<button class="btn" id="btn-reupload">🔄 重新上传</button>' : ''}
      <button class="btn btn-primary btn-lg" id="btn-next-config" ${imported ? '' : 'disabled'}>下一步：配置研究方向 →</button>
    </div>
  `;

  const zone = document.getElementById('upload-zone');
  const input = document.getElementById('upload-input');
  const fileInfo = document.getElementById('file-info');
  const previewWrap = document.getElementById('preview-wrap');
  const btnNext = document.getElementById('btn-next-config');

  function handleFile(file) {
    if (file.size > 10 * 1024 * 1024) {
      showToast('文件大小超过 10MB，请压缩后重试', 'error');
      return;
    }

    parseExcelFile(file).then(async (data) => {
      const headers = Object.keys(data[0] || {});
      if (headers.length === 0) throw new Error('无法读取列名');

      const autoDetected = {};
      headers.forEach((h, i) => {
        const role = detectColumnRole(h);
        if (role) autoDetected[i] = role;
      });

      const mapping = await showColumnMappingModal(headers, autoDetected, data);
      if (!mapping) return;

      const titleKey = headers[mapping.titleCol];
      const abstractKey = headers[mapping.abstractCol];

      AppState.titleColumn = titleKey;
      AppState.abstractColumn = abstractKey;

      const paperList = data.map((row, idx) => ({
        id: `paper_${idx}`,
        title: String(row[titleKey] || '').trim(),
        abstract: String(row[abstractKey] || '').trim(),
        author: String(row['作者'] || row['Author'] || row['authors'] || '').trim(),
        year: String(row['年份'] || row['Year'] || row['year'] || '').trim(),
        source: String(row['来源'] || row['Source'] || row['journal'] || row['期刊'] || '').trim(),
        _row: idx,
      }));

      const dupes = [];
      const seen = new Set();
      for (let i = 0; i < paperList.length; i++) {
        if (seen.has(i)) continue;
        for (let j = i + 1; j < paperList.length; j++) {
          if (seen.has(j)) continue;
          if (titleSimilarity(paperList[i].title, paperList[j].title) > 0.9) {
            dupes.push({ i, j, title: paperList[i].title });
            seen.add(j);
          }
        }
      }

      AppState.papers = paperList;
      AppState._fileName = file.name;
      AppState._fileCols = headers.length + ' 列';
      AppState._dupes = dupes;

      showToast(`成功导入 ${paperList.length} 篇文献`, 'success');
      initUpload(); // Re-render with imported state
    }).catch(err => {
      showToast(err.message, 'error');
    });
  }

  function resetUpload() {
    AppState.papers = [];
    AppState.titleColumn = '';
    AppState.abstractColumn = '';
    AppState._fileName = '';
    AppState._fileCols = '';
    AppState._dupes = [];
    if (input) input.value = '';
    initUpload(); // Re-render fresh
  }

  // Re-upload button
  document.getElementById('btn-reupload')?.addEventListener('click', () => {
    if (confirm('重新上传将清除当前导入的文献数据，确定吗？')) {
      resetUpload();
    }
  });

  // Anomaly toggle
  document.getElementById('anomaly-toggle')?.addEventListener('click', () => {
    const detail = document.getElementById('anomaly-detail');
    if (detail) detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
  });

  // Dupe toggle
  document.getElementById('dupe-toggle')?.addEventListener('click', () => {
    const detail = document.getElementById('dupe-detail');
    if (detail) detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
  });

  // Drag & drop (only if not imported)
  if (!imported) {
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
  }

  btnNext?.addEventListener('click', () => {
    if (AppState.papers.length > 0) navigateTo('config');
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
