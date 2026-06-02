# 学术文献智能筛选系统 — 设计方案

**日期：** 2026-06-02
**用途：** 软件著作权申请
**版本：** v1.0

---

## 一、项目概述

### 1.1 项目定位

面向学术研究者的文献筛选工具。上传 Excel 格式的文献列表（含标题和摘要），配置研究方向后，调用大模型 API 自动判断每篇文献与研究方向的匹配度，输出三级分类结果和详细判断理由，支持导出筛选报告和 PRISMA 流程图。

### 1.2 核心价值

- **自动化**：替代人工逐篇阅读摘要的低效流程
- **可解释**：每篇文献附带 AI 判断理由，不只给结论
- **可追溯**：完整保留筛选日志，支持人工复审
- **标准化**：输出符合学术规范的 PRISMA 流程图
- **在线可用**：部署为静态网站，浏览器打开即用，无需安装

### 1.3 部署架构

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  用户浏览器    │────▶│  静态托管平台     │────▶│  硅基流动 API │
│              │     │  GitHub Pages /   │     │  DeepSeek    │
│  API Key     │     │  Vercel / 服务器   │     │  V3.2        │
│  本地存储     │     │                  │     │              │
└──────────────┘     └──────────────────┘     └──────────────┘
      │                       │
      │                       ▼
      │              ┌──────────────────┐
      └──────────────┤  纯静态文件       │
                     │  HTML/CSS/JS      │
                     │  无需后端服务      │
                     └──────────────────┘

安全性说明：
- API Key 存储在用户浏览器 localStorage，不上传服务器
- API 调用从用户浏览器直接发往硅基流动，不经过中间服务器
- 文献数据全程在用户本地浏览器处理，隐私有保障
```

### 1.4 技术栈

| 层 | 选型 |
|------|------|
| 前端 | 原生 HTML/CSS/JS，ES Modules |
| Excel 解析 | SheetJS (xlsx) CDN |
| 图表 | Chart.js CDN |
| API 调用 | 硅基流动 OpenAI 兼容接口（DeepSeek V3.2） |
| 本地存储 | localStorage（设置）+ IndexedDB（历史记录） |
| 部署 | 静态文件，GitHub Pages / 本地服务器 |

---

## 二、架构设计

### 2.1 文件结构

```
literature-screener/
├── index.html              ← 入口页面
├── css/
│   └── style.css           ← 全局样式（学术简洁风）
├── js/
│   ├── app.js              ← 主控制器，状态机，步骤路由
│   ├── api.js              ← 硅基流动 API 封装
│   ├── upload.js           ← Excel 上传 & 列映射
│   ├── config.js           ← 研究方向配置模块
│   ├── screen.js           ← AI 筛选引擎（核心）
│   ├── results.js          ← 结果展示 & 交互
│   ├── export.js           ← 导出 Excel/报告/PRISMA
│   ├── history.js          ← IndexedDB 存储 & 历史管理
│   └── ui.js               ← 通用 UI 组件（进度条、弹窗、Toast）
├── lib/                    ← CDN 备用本地文件
└── README.md
```

### 2.2 页面结构

单页五步流程，顶部导航栏 + 主内容区：

```
┌──────────────────────────────────────────────────────┐
│  📚 学术文献智能筛选系统          ⚙️设置  📋历史     │
├──────────────────────────────────────────────────────┤
│  ① 导入文献 → ② 研究方向 → ③ 开始筛选 → ④ 查看结果 → ⑤ 导出报告 │
├──────────────────────────────────────────────────────┤
│                  当前步骤内容区                        │
└──────────────────────────────────────────────────────┘
```

### 2.3 状态管理

全局状态对象 `AppState`，由 `app.js` 管理：

```javascript
AppState = {
  step: 'upload',           // 当前步骤: upload|config|screening|results|export
  papers: [],               // 文献数组 [{id,title,abstract,author,year,...}]
  titleColumn: '',          // 标题列名
  abstractColumn: '',       // 摘要列名
  researchConfig: {         // 研究方向配置
    name: '',
    keywords: { include: [], exclude: [] },
    description: '',
    examples: [],
    mode: 'standard',       // simple|standard|detailed
  },
  screeningResults: [],     // 筛选结果
  screeningStatus: 'idle',  // idle|running|paused|completed|error
  screeningProgress: { processed: 0, total: 0 },
  settings: {},             // API 设置
}
```

### 2.4 状态机

```
IDLE → UPLOADED → CONFIGURED → SCREENING → COMPLETED
                            ↓         ↓
                         PAUSED ← → ERROR（可重试）
```

---

## 三、核心数据流

```
Excel 文件
    │
    ▼
① 解析 → 文献数组 [{标题, 摘要, 作者, 年份, ...}]
    │
    ▼
② 列映射 → 确认哪列是标题、哪列是摘要
    │
    ▼
③ 研究方向配置 → 生成 System Prompt
    │
    ▼
④ 逐条/分批调用 API → 每条返回 {分级, 理由, 相关度评分}
    │
    ▼
⑤ 结果持久化到 IndexedDB → 进入结果面板
    │
    ▼
⑥ 导出 → Excel / PRISMA图 / 筛选报告
```

---

## 四、模块详细设计

### 4.1 文献导入中心 (`upload.js`)

| 功能 | 说明 |
|------|------|
| 拖拽上传 | 支持 .xlsx/.xls/.csv，单文件 ≤ 10MB |
| SheetJS 解析 | 读取第一个 Sheet，取前 2000 行 |
| 自动列识别 | 模糊匹配常见标题列名和摘要列名，分数字段设置 > 0.6 阈值 |
| 手动映射确认 | 弹出模态框，每列旁有下拉选择角色，自动识别结果高亮 |
| 文献预览表 | 确认后展示前 10 行，确认无误进入下一步 |
| 文献查重 | 标题相似度 > 90% 自动标记为重复 |
| 数据校验 | 检测空标题、空摘要、过短数据等异常 |

**自动列识别的匹配逻辑：**

```javascript
const TITLE_PATTERNS = ['标题', '题目', '篇名', '论文名称', 'title', 'paper title'];
const ABSTRACT_PATTERNS = ['摘要', '内容摘要', '概要', 'abstract', 'summary'];

function detectColumn(columnName, patterns) {
  const lower = columnName.toLowerCase().trim();
  for (const p of patterns) {
    if (lower.includes(p.toLowerCase())) return true;
    // 模糊匹配: Jaccard 相似度 > 0.6
    if (jaccardSimilarity(lower, p.toLowerCase()) > 0.6) return true;
  }
  return false;
}
```

### 4.2 研究方向配置 (`config.js`)

| 功能 | 说明 |
|------|------|
| 方向名称 | 命名研究方向，作为历史标识 |
| 关键词管理 | Tag 输入，包含词 + 排除词 |
| 自然语言描述 | Textarea，引导式占位 |
| 示例文献 | 最多 5 篇，手动输入标题+摘要 |
| 筛选粒度 | 单选：简单（二级） / 标准（三级） / 详细（三级+子主题） |
| 模板保存/加载 | 配置保存为模板，下次复用 |
| Prompt 预览 | 实时展示生成的 System Prompt，可手动编辑 |

**三种筛选模式的输出格式：**

- 简单模式：`{"relevant": true/false, "reason": "一句话理由"}`
- 标准模式：`{"level": "high/medium/low", "reason": "2-3句话", "score": 0-100}`
- 详细模式：标准模式 + `{"subtopics": ["子主题1"], "methodology_match": "匹配/不匹配/部分匹配", "priority": 1-5}`

### 4.3 AI 筛选引擎 (`screen.js` + `api.js`)

| 功能 | 说明 |
|------|------|
| API 封装 | 硅基流动 OpenAI 兼容格式：`POST /v1/chat/completions` |
| 分批策略 | 每批 10 条，批次间隔 500ms 防限流 |
| Prompt 构建 | System = 研究方向 + 关键词 + 示例；User = 标题 + 摘要 |
| 结构化输出 | 要求 AI 返回固定的 JSON 格式 |
| 解析校验 | JSON 解析 + 字段完整性校验；解析失败自动重试（最多 3 次） |
| 进度追踪 | 实时进度条 + 日志滚动 + 已处理/总数 + 预估剩余时间 |
| 断点续传 | 每批结果实时写入 IndexedDB，支持刷新后继续 |
| 控制按钮 | 暂停（当前批次完成后停）、继续、停止（丢弃未完成） |
| 错误处理 | 单条失败跳过并标记、限流自动降速、断网重连提示 |

**核心 API 调用 (`api.js`)：**

```javascript
// 硅基流动 API 配置
const API_CONFIG = {
  baseURL: 'https://api.siliconflow.cn/v1',
  model: 'deepseek-ai/DeepSeek-V3.2',
  maxTokens: 1024,
  temperature: 0.1,  // 低温度保证判断一致性
};

async function callLLM(messages) {
  const response = await fetch(`${API_CONFIG.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: API_CONFIG.model,
      messages,
      max_tokens: API_CONFIG.maxTokens,
      temperature: API_CONFIG.temperature,
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) throw new APIError(response.status, await response.text());
  return response.json();
}
```

**批次处理核心逻辑 (`screen.js`)：**

```javascript
async function startScreening(papers, config, onProgress) {
  const BATCH_SIZE = 10;
  const BATCH_DELAY = 500; // ms
  const MAX_RETRIES = 3;

  const batches = chunkArray(papers, BATCH_SIZE);
  const results = [];

  for (let i = 0; i < batches.length; i++) {
    if (screeningPaused) await waitForResume();
    if (screeningStopped) break;

    const batch = batches[i];
    const batchResults = await processBatchWithRetry(batch, config, MAX_RETRIES);
    results.push(...batchResults);

    // 实时存 IndexedDB
    await saveProgress(results);

    onProgress({
      processed: results.length,
      total: papers.length,
      estimatedRemaining: estimateTime(i, batches.length, BATCH_DELAY),
    });

    if (i < batches.length - 1) await sleep(BATCH_DELAY);
  }

  return results;
}
```

### 4.4 结果面板 (`results.js`)

| 功能 | 说明 |
|------|------|
| 概览卡片 | 3 张统计卡片：高度相关 / 可能相关 / 不相关 |
| 分类饼图 | Chart.js 绘制，点击扇区过滤表格 |
| 结果表格 | 列：序号/标题/作者/年份/分级/评分/操作；支持排序和过滤 |
| 逐条详情 | 点击展开：完整摘要 + AI 判断理由 + 原始 API 响应 |
| 人工覆写 | 点击分级标签可修改（AI → 人工修正），修改项标蓝底 |
| 全文搜索 | 标题/摘要搜索 + 关键词高亮 |
| 批量操作 | 全选/反选/按分级选 → 批量改分级/导出选中 |

### 4.5 导出中心 (`export.js`)

| 功能 | 说明 |
|------|------|
| Excel 导出 | SheetJS 写 .xlsx，表头加粗、分级列条件着色（绿/黄/红） |
| 筛选报告 | Markdown 格式：筛选标准 → 方法 → 统计摘要 → 分类列表 |
| PRISMA 图 | Canvas 绘制标准流程图：识别 → 筛选 → 合格 → 纳入 |
| 导出前预览 | 弹出预览窗，确认内容后下载 |
| 文件命名 | 自动生成：`筛选结果_{方向名}_{日期}.xlsx` |

**PRISMA 流程图示例数据：**

```
识别 (n=200) → 去重后 (n=185)
筛选后 (n=185) → 排除 (n=120, 不相关)
合格 (n=65) → 排除 (n=20, 可能相关但方法不符)
纳入 (n=45, 高度相关)
```

### 4.6 设置 & 历史 (`history.js`)

| 功能 | 说明 |
|------|------|
| API 设置页面 | API Key（密码框）、Base URL、模型名，存 localStorage |
| 连接测试 | 填完 Key 后一键测试连接 |
| 历史记录 | IndexedDB 存储每次任务：时间/方向/文献数/结果统计 |
| 历史回看 | 点击历史条目加载到结果面板 |
| 历史删除 | 单条删除 / 批量删除 / 清空 |
| 数据导出 | 导出历史为 JSON，支持导入恢复 |

**IndexedDB 数据结构：**

```javascript
// 数据库名：LiteratureScreener
// 表：screening_tasks
{
  id: 'uuid',
  createdAt: '2026-06-02T10:30:00Z',
  config: { ... },           // 研究方向配置
  papers: [ ... ],           // 原始文献列表
  results: [ ... ],          // 筛选结果
  stats: { high: 45, medium: 20, low: 120 },
  status: 'completed',
}
```

---

## 五、UI 设计规范

### 5.1 配色方案（学术简洁风）

| 用途 | 颜色 | 色值 |
|------|------|------|
| 主背景 | 白色 | `#FFFFFF` |
| 次级背景 | 浅灰 | `#F5F6FA` |
| 主文字 | 深灰 | `#1A1A2E` |
| 次级文字 | 中灰 | `#6B7280` |
| 主色调 | 学术蓝 | `#2563EB` |
| 高度相关 | 绿色 | `#10B981` |
| 可能相关 | 琥珀 | `#F59E0B` |
| 不相关 | 红色 | `#EF4444` |
| 边框 | 浅灰 | `#E5E7EB` |

### 5.2 字体

```
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
             "Microsoft YaHei", "Noto Sans SC", sans-serif;
```

### 5.3 响应式

- 桌面端（≥1024px）：完整表格 + 侧边统计
- 平板端（768-1023px）：表格横向滚动
- 手机端（<768px）：卡片式布局，表格折叠

---

## 六、外部依赖（均通过 CDN 加载）

| 库 | 版本 | 用途 | CDN |
|------|------|------|------|
| SheetJS | latest | Excel 读写 | cdn.sheetjs.com |
| Chart.js | 4.x | 饼图/统计图 | cdn.jsdelivr.net |
| Marked | latest | Markdown 预览渲染 | cdn.jsdelivr.net |

---

## 七、错误处理策略

| 场景 | 处理方式 |
|------|------|
| Excel 解析失败 | Toast 提示 + 显示文件格式要求 |
| API Key 无效 | 连接测试时捕获 401，提示检查 Key |
| API 限流 (429) | 自动指数退避等待（1s → 2s → 4s → 8s） |
| API 超时 | 单条重试 3 次，仍失败则跳过并标记 |
| 网络断开 | 暂停筛选，提示重连后可继续 |
| JSON 解析失败 | 重试 3 次，仍失败则标记该条为"解析失败" |
| IndexedDB 不可用 | 降级到 localStorage，提示容量有限 |
| 浏览器不支持 ES Modules | 入口检测 + 提示升级浏览器 |

---

## 八、在线部署方案

### 8.1 部署平台

纯静态文件项目，兼容所有主流静态托管平台。

| 平台 | 部署方式 | 域名 | 国内访问 | 推荐度 |
|------|------|------|:--:|:--:|
| **GitHub Pages** | 推送代码，自动部署 | `*.github.io` | ⭐⭐⭐ | 🥇 首选 |
| **Vercel** | 连接 GitHub 仓库，自动部署 | `*.vercel.app` | ⭐⭐ | 🥈 |
| **Cloudflare Pages** | 连接 GitHub，自动部署 | `*.pages.dev` | ⭐⭐⭐ | 🥈 |
| **自建服务器** | Nginx/Apache 托管静态文件 | 自定义域名 | ⭐⭐⭐⭐⭐ | 🥇 有服务器 |
| **Netlify** | 拖拽部署 / 连 GitHub | `*.netlify.app` | ⭐ | 🥉 |

### 8.2 GitHub Pages 部署步骤（推荐）

```bash
# 1. 推送代码到 GitHub 仓库
git add .
git commit -m "学术文献智能筛选系统 v1.0"
git push origin master

# 2. 在 GitHub 仓库设置中启用 Pages
# Settings → Pages → Source: Deploy from a branch → master → / (root) → Save

# 3. 等待 1-2 分钟，访问 https://<用户名>.github.io/<仓库名>/
```

### 8.3 本地开发运行

ES Modules 需要 HTTP 协议，不能直接用 `file://` 打开。

```bash
# Python 方式（Windows 自带 Python）
python -m http.server 8080
# 浏览器访问 http://localhost:8080

# Node.js 方式
npx serve .
```

### 8.4 软著提交时的访问说明

软著申请材料中可提交：
- **源代码**：完整项目文件，压缩包或 GitHub 仓库链接
- **在线演示地址**：如 `https://xxx.github.io/literature-screener/`
- **本地运行说明**：README 中写明如何本地运行
- **使用说明书**：包含在线访问 + 本地运行的完整操作截图

---

## 九、开发计划

| 阶段 | 内容 | 预计 |
|------|------|------|
| Phase 1 | 项目骨架：index.html + app.js + style.css，步骤导航 | 先搭框架 |
| Phase 2 | upload.js — 上传解析 + 列映射 | |
| Phase 3 | api.js — API 封装 + 连接测试 | |
| Phase 4 | config.js — 研究方向配置 + Prompt 生成 | |
| Phase 5 | screen.js — 筛选引擎 + 进度 + 断点续传 | 核心 |
| Phase 6 | results.js — 结果面板 + 交互 | |
| Phase 7 | export.js — 导出 Excel + 报告 + PRISMA | |
| Phase 8 | history.js — IndexedDB + 历史管理 | |
| Phase 9 | 设置页 + 亮暗色切换（可选）+ 完善打磨 | 收尾 |
