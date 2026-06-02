// js/export.js — 导出 Excel / Markdown 报告 / PRISMA 图

import { AppState, showToast } from './app.js';
import { getStats } from './results.js';

function generateFilename(prefix, ext) {
  const name = AppState.researchConfig.name || '未命名';
  const date = new Date().toISOString().slice(0, 10);
  return `${prefix}_${name}_${date}.${ext}`;
}

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

  const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: 'F5F6FA' } } };
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let C = 0; C <= range.e.c; C++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: C });
    if (ws[cellRef]) ws[cellRef].s = headerStyle;
  }

  ws['!cols'] = [
    { wch: 6 }, { wch: 10 }, { wch: 8 }, { wch: 60 }, { wch: 80 },
    { wch: 15 }, { wch: 8 }, { wch: 20 }, { wch: 50 }, { wch: 20 },
    { wch: 10 }, { wch: 8 }, { wch: 8 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '筛选结果');
  XLSX.writeFile(wb, generateFilename('筛选结果', 'xlsx'));
}

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

function exportPRISMA() {
  const results = AppState.screeningResults;
  const stats = getStats(results);
  const total = AppState.papers.length;

  const identified = total;
  const screened = total;
  const excluded = stats.low;
  const eligible = stats.high + stats.medium;
  const excludedEligible = stats.medium;
  const included = stats.high;

  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 800, 600);

  const boxW = 200, boxH = 50;
  const centerX = 400;

  function drawBox(x, y, label, n, color = '#2563EB') {
    ctx.fillStyle = color;
    ctx.fillRect(x - boxW / 2, y, boxW, boxH);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
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

  const leftX = centerX - 160;
  const rightX = centerX + 160;
  let y = 40;

  ctx.fillStyle = '#1A1A2E';
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PRISMA 流程图', centerX, y);
  y += 40;

  drawBox(centerX, y, '文献检索识别', identified, '#2563EB');
  y += boxH + 30;

  drawBox(centerX, y, '去重后文献', screened, '#2563EB');
  drawArrow(leftX, y + 10, leftX, y - 20);
  y += boxH + 20;
  drawExclusionBox(rightX, y - 15, '排除（不相关）', excluded);
  drawArrow(rightX, y - 35, rightX - 60, y - 35);
  y += 40;

  drawBox(centerX, y, '合格文献（全文评估）', eligible, '#2563EB');
  drawArrow(leftX, y + 10, leftX, y - 30);
  y += boxH + 20;
  drawExclusionBox(rightX, y - 15, '排除（可能相关但方法不符）', excludedEligible);
  drawArrow(rightX, y - 35, rightX - 60, y - 35);
  y += 40;

  drawBox(centerX, y, '最终纳入文献', included, '#10B981');
  drawArrow(leftX, y + 10, leftX, y - 30);
  y += 60;

  ctx.fillStyle = '#6B7280';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('生成时间：' + new Date().toLocaleString(), centerX, y);

  canvas.toBlob((blob) => {
    downloadBlob(blob, generateFilename('PRISMA流程图', 'png'));
  });
}

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

  panel.querySelectorAll('.export-option').forEach(opt => {
    opt.addEventListener('click', () => {
      panel.querySelectorAll('.export-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      currentType = opt.dataset.type;
      renderExportPreview(currentType);
    });
  });

  document.getElementById('btn-export-current').addEventListener('click', () => {
    switch (currentType) {
      case 'excel': exportExcel(); break;
      case 'report': exportMarkdownReport(); break;
      case 'prisma': exportPRISMA(); break;
    }
  });

  document.getElementById('btn-export-all').addEventListener('click', async () => {
    exportExcel();
    await new Promise(r => setTimeout(r, 500));
    exportMarkdownReport();
    await new Promise(r => setTimeout(r, 500));
    exportPRISMA();
    showToast('全部导出完成！', 'success');
  });
}
