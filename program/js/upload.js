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

      const autoDetected = {};
      headers.forEach((h, i) => {
        const role = detectColumnRole(h);
        if (role) autoDetected[i] = role;
      });

      const mapping = await showColumnMappingModal(headers, autoDetected, rawData);
      if (!mapping) return;

      const titleKey = headers[mapping.titleCol];
      const abstractKey = headers[mapping.abstractCol];

      AppState.titleColumn = titleKey;
      AppState.abstractColumn = abstractKey;

      const papers = rawData.map((row, idx) => ({
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

      const anomalies = [];
      papers.forEach((p) => {
        if (!p.title) anomalies.push({ id: p.id, issue: '标题为空' });
        else if (p.title.length < 5) anomalies.push({ id: p.id, issue: '标题过短（<5字）' });
        if (!p.abstract) anomalies.push({ id: p.id, issue: '摘要为空' });
        else if (p.abstract.length < 20) anomalies.push({ id: p.id, issue: '摘要过短（<20字）' });
      });

      AppState.papers = papers;

      fileInfo.classList.add('show');
      document.getElementById('file-name').textContent = file.name;
      document.getElementById('file-count').textContent = `${papers.length} 篇`;
      document.getElementById('file-cols').textContent = `${headers.length} 列`;
      document.getElementById('file-dupes').textContent = dupes.length > 0
        ? `${dupes.length} 组重复` : '无';
      document.getElementById('file-anomalies').textContent = anomalies.length > 0
        ? `${anomalies.length} 条异常` : '无';

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
