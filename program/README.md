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

或使用 Node.js：

```bash
npx serve .
```

## 配置 API

1. 点击右上角 ⚙️ 设置
2. 填入硅基流动 API Key（在 [硅基流动](https://siliconflow.cn) 注册获取）
3. 点击「测试连接」验证
4. 保存设置

> API Key 仅保存在你的浏览器本地，不会上传到任何服务器。

## 使用流程

1. **导入文献** — 上传包含标题和摘要列的 Excel/CSV 文件，系统自动识别列映射
2. **配置方向** — 用自然语言描述研究方向，添加关键词和示例文献
3. **开始筛选** — AI 逐批判断文献相关性，支持暂停/继续
4. **查看结果** — 三级分类统计、搜索、排序、人工修正
5. **导出报告** — 一键导出 Excel 结果表、Markdown 报告、PRISMA 流程图

## 技术栈

- 原生 HTML/CSS/JS (ES Modules)
- [SheetJS](https://sheetjs.com/) — Excel 读写
- [Chart.js](https://www.chartjs.org/) — 统计图表
- DeepSeek V3.2 (via 硅基流动 API)

## 文件结构

```
literature-screener/
├── index.html          # 入口页面
├── css/
│   └── style.css       # 全局样式（学术简洁风）
├── js/
│   ├── app.js          # 主控制器 & 状态管理
│   ├── ui.js           # 通用 UI 组件
│   ├── api.js          # 硅基流动 API 封装
│   ├── upload.js       # Excel 上传 & 列映射
│   ├── config.js       # 研究方向配置 & Prompt 生成
│   ├── screen.js       # AI 筛选引擎（核心）
│   ├── results.js      # 结果展示 & 交互
│   ├── export.js       # 导出中心
│   └── history.js      # IndexedDB 存储 & 历史管理
└── README.md
```

## 隐私说明

- 所有数据（文献、API Key、筛选结果）均存储在用户浏览器本地
- API 调用直接从浏览器发往硅基流动，不经中间服务器
- 不上传任何用户数据

## 许可证

本项目用于软件著作权申请。
