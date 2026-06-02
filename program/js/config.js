// js/config.js — 研究方向配置

import { AppState, navigateTo, showToast } from './app.js';
import { openModal } from './ui.js';

const TEMPLATES_KEY = 'literature_screener_templates';

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

export function buildUserPrompt(paper) {
  return `标题：${paper.title}\n摘要：${paper.abstract}`;
}

function saveTemplates(templates) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

function loadTemplates() {
  try {
    return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]');
  } catch { return []; }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== Non-destructive updates =====

function updatePromptPreview() {
  const preview = document.getElementById('prompt-preview');
  if (!preview) return;
  const config = AppState.researchConfig;
  const prompt = config.name ? buildSystemPrompt(config) : '（填写研究方向后自动生成）';
  preview.textContent = prompt;
}

function updateTagDisplay(type) {
  const wrap = document.getElementById(type === 'include' ? 'tag-include' : 'tag-exclude');
  const input = wrap?.querySelector('.tag-input-inner');
  if (!wrap || !input) return;
  const config = AppState.researchConfig;
  const arr = type === 'include' ? config.keywords.include : config.keywords.exclude;
  const cls = type === 'include' ? 'tag' : 'tag tag-exclude';
  const tagHTML = arr.map((k, i) =>
    `<span class="${cls}">${escapeHtml(k)}<span class="tag-remove" data-type="${type}" data-idx="${i}">&times;</span></span>`
  ).join('');
  // Preserve the input element
  const existingInput = wrap.querySelector('.tag-input-inner');
  wrap.innerHTML = tagHTML;
  if (existingInput) wrap.appendChild(existingInput);
}

function updateExampleDisplay() {
  const container = document.getElementById('examples-container');
  if (!container) return;
  const config = AppState.researchConfig;
  if (config.examples.length === 0) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = config.examples.map((ex, i) => `
    <div style="background:var(--color-bg-secondary);padding:12px;border-radius:var(--radius);margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <strong>示例 ${i + 1}</strong>
        <span class="tag-remove" data-type="example" data-idx="${i}" style="cursor:pointer;font-size:18px;">&times;</span>
      </div>
      <div style="margin-bottom:6px;">
        <label style="font-size:12px;color:var(--color-text-secondary);">标题：</label>
        <input type="text" class="form-input example-title" data-idx="${i}" value="${escapeHtml(ex.title)}" placeholder="示例文献标题" style="font-size:13px;">
      </div>
      <div>
        <label style="font-size:12px;color:var(--color-text-secondary);">摘要：</label>
        <textarea class="form-textarea example-abstract" data-idx="${i}" rows="2" placeholder="示例文献摘要" style="font-size:13px;min-height:50px;">${escapeHtml(ex.abstract)}</textarea>
      </div>
    </div>
  `).join('');
}

// ===== Full render (only for structural changes) =====

export async function initConfig() {
  const panel = document.getElementById('panel-config');
  const config = AppState.researchConfig;
  const prompt = config.name ? buildSystemPrompt(config) : '（填写研究方向后自动生成）';

  const incTagsHTML = config.keywords.include.map((k, i) =>
    `<span class="tag">${escapeHtml(k)}<span class="tag-remove" data-type="include" data-idx="${i}">&times;</span></span>`
  ).join('');

  const excTagsHTML = config.keywords.exclude.map((k, i) =>
    `<span class="tag tag-exclude">${escapeHtml(k)}<span class="tag-remove" data-type="exclude" data-idx="${i}">&times;</span></span>`
  ).join('');

  const exHTML = config.examples.length > 0 ? config.examples.map((ex, i) => `
    <div style="background:var(--color-bg-secondary);padding:12px;border-radius:var(--radius);margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <strong>示例 ${i + 1}</strong>
        <span class="tag-remove" data-type="example" data-idx="${i}" style="cursor:pointer;font-size:18px;">&times;</span>
      </div>
      <div style="margin-bottom:6px;">
        <label style="font-size:12px;color:var(--color-text-secondary);">标题：</label>
        <input type="text" class="form-input example-title" data-idx="${i}" value="${escapeHtml(ex.title)}" placeholder="示例文献标题" style="font-size:13px;">
      </div>
      <div>
        <label style="font-size:12px;color:var(--color-text-secondary);">摘要：</label>
        <textarea class="form-textarea example-abstract" data-idx="${i}" rows="2" placeholder="示例文献摘要" style="font-size:13px;min-height:50px;">${escapeHtml(ex.abstract)}</textarea>
      </div>
    </div>
  `).join('') : '';

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
          ${incTagsHTML}
          <input type="text" class="tag-input-inner" id="tag-include-input" placeholder="输入后回车添加">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">排除关键词</label>
        <div class="tag-input-wrap" id="tag-exclude">
          ${excTagsHTML}
          <input type="text" class="tag-input-inner" id="tag-exclude-input" placeholder="输入后回车添加">
        </div>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">示例文献（最多 5 篇）</label>
      <div id="examples-container">${exHTML}</div>
      <button class="btn btn-sm" id="btn-add-example" style="margin-top:8px;">+ 添加示例文献</button>
      <p class="form-hint">提供高度相关的示例文献，帮助 AI 更准确判断</p>
    </div>

    <div class="divider"></div>

    <div class="form-group">
      <label class="form-label">System Prompt 预览</label>
      <div class="log-panel" id="prompt-preview" style="max-height:200px;white-space:pre-wrap;">${prompt}</div>
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

// ===== Event binding (no re-render for text input) =====

function bindEvents() {
  // Text inputs: update AppState + prompt preview ONLY (no DOM replacement)
  const nameInput = document.getElementById('config-name');
  const descInput = document.getElementById('config-desc');
  const modeSelect = document.getElementById('config-mode');
  const panel = document.getElementById('panel-config');

  nameInput?.addEventListener('input', (e) => {
    AppState.researchConfig.name = e.target.value.trim();
    updatePromptPreview();
  });

  descInput?.addEventListener('input', (e) => {
    AppState.researchConfig.description = e.target.value;
    updatePromptPreview();
  });

  modeSelect?.addEventListener('change', (e) => {
    AppState.researchConfig.mode = e.target.value;
    updatePromptPreview();
  });

  // Tag inputs: Enter to add
  setupTagInput('tag-include', 'tag-include-input', 'include');
  setupTagInput('tag-exclude', 'tag-exclude-input', 'exclude');

  // Delegate click events on the panel (survives DOM updates)
  panel?.addEventListener('click', (e) => {
    // Tag remove
    if (e.target.classList.contains('tag-remove')) {
      const type = e.target.dataset.type;
      const idx = parseInt(e.target.dataset.idx);
      if (type === 'include') {
        AppState.researchConfig.keywords.include.splice(idx, 1);
        updateTagDisplay('include');
      } else if (type === 'exclude') {
        AppState.researchConfig.keywords.exclude.splice(idx, 1);
        updateTagDisplay('exclude');
      } else if (type === 'example') {
        AppState.researchConfig.examples.splice(idx, 1);
        updateExampleDisplay();
      }
      updatePromptPreview();
    }

    // Add example button
    if (e.target.id === 'btn-add-example') {
      if (AppState.researchConfig.examples.length >= 5) {
        showToast('最多添加 5 篇示例文献', 'warning');
        return;
      }
      AppState.researchConfig.examples.push({ title: '', abstract: '' });
      updateExampleDisplay();
    }

    // Save template
    if (e.target.id === 'btn-save-template') {
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
    }

    // Load template
    if (e.target.id === 'btn-load-template') {
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
    }

    // Next step
    if (e.target.id === 'btn-next-screening') {
      const nameVal = document.getElementById('config-name')?.value?.trim() || AppState.researchConfig.name;
      const descVal = document.getElementById('config-desc')?.value?.trim() || AppState.researchConfig.description;
      if (!nameVal) { showToast('请填写方向名称', 'warning'); return; }
      if (!descVal) { showToast('请填写研究描述', 'warning'); return; }
      AppState.researchConfig.name = nameVal;
      AppState.researchConfig.description = descVal;
      navigateTo('screening');
    }
  });

  // Example input changes
  panel?.addEventListener('input', (e) => {
    if (e.target.classList.contains('example-title')) {
      const idx = parseInt(e.target.dataset.idx);
      if (AppState.researchConfig.examples[idx]) {
        AppState.researchConfig.examples[idx].title = e.target.value;
        updatePromptPreview();
      }
    }
    if (e.target.classList.contains('example-abstract')) {
      const idx = parseInt(e.target.dataset.idx);
      if (AppState.researchConfig.examples[idx]) {
        AppState.researchConfig.examples[idx].abstract = e.target.value;
        updatePromptPreview();
      }
    }
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
          updateTagDisplay(type);
          updatePromptPreview();
          input.value = '';
        }
      }
    }
  });
}
