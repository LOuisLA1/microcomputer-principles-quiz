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

function parseAIResponse(content) {
  try {
    return JSON.parse(content);
  } catch {}

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch {}
  }

  return null;
}

function validateResult(parsed, mode) {
  if (!parsed) return false;

  if (mode === 'simple') {
    return typeof parsed.relevant === 'boolean';
  }
  const validLevels = ['high', 'medium', 'low'];
  return validLevels.includes(parsed.level) && typeof parsed.reason === 'string';
}

async function processBatch(batch, config) {
  const systemPrompt = buildSystemPrompt(config);

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
    return [{ paperIndex: 0, result: { level: 'low', score: 0, reason: 'AI 响应解析失败' }, rawResponse: content, parseError: true }];
  }

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

  return batch.map((_, i) => ({
    paperIndex: i,
    result: { level: 'low', score: 0, reason: 'AI 响应解析失败' },
    rawResponse: content,
    parseError: true,
  }));
}

function estimateTime(completedBatches, totalBatches, batchDelay) {
  const remaining = totalBatches - completedBatches;
  const msPerBatch = batchDelay + 2000;
  return remaining * msPerBatch;
}

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
            _paperIdx: globalIdx,
            ...br.result,
            rawResponse: br.rawResponse,
            parseError: br.parseError || false,
            manualOverride: false,
          };
        }
      }

      batchResults.forEach(br => {
        const paper = papers[b * BATCH_SIZE + br.paperIndex];
        if (!paper) return;
        const prefix = br.result.level === 'high' ? '🟢' : br.result.level === 'medium' ? '🟡' : '🔴';
        const logFn = br.result.level === 'high' ? 'high' : br.result.level === 'medium' ? 'medium' : 'low';
        log[logFn](`${prefix} ${(paper.title || '').slice(0, 60)}... — ${(br.result.reason || '').slice(0, 60)}`);
      });
    } catch (err) {
      log.error(`第 ${batchNum} 批处理失败: ${err.message}`);
      for (let bi = 0; bi < batch.length; bi++) {
        const globalIdx = b * BATCH_SIZE + bi;
        if (globalIdx < papers.length) {
          results[globalIdx] = { _paperIdx: globalIdx, level: 'low', score: 0, reason: `处理失败: ${err.message}`, rawResponse: '', parseError: true, manualOverride: false };
        }
      }
    }

    const processed = results.filter(r => r !== null).length;
    AppState.screeningProgress.processed = processed;
    progress.update(processed, papers.length);

    const eta = estimateTime(b + 1, batches.length, BATCH_DELAY);
    progress.setETA(`预计剩余 ${formatDuration(eta)}`);

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

  const controlsEl = panel.querySelector('.screening-controls');
  controlsEl.innerHTML = `
    <button class="btn btn-primary" id="btn-view-results">查看结果 →</button>
  `;
  document.getElementById('btn-view-results').addEventListener('click', () => navigateTo('results'));
}

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
