# Article Workbench 命名统一 + DOCX 上传 + 素材库边界收敛 实施报告

> 窗口：Article Workbench Naming + DOCX Upload + Inbox Boundary Cleanup Window
> 日期：2026-06-29
> 范围：命名统一（发稿包 → 内容包）、素材箱收敛为素材库、文章工作台支持单篇 .docx 上传

---

## 1. 修改了哪些文件

本轮共修改 **10 个前端文件 + 1 个类型声明文件 + package.json**，未触碰任何后端 / 数据库 / Prompt 文件。

| 文件 | 改动类型 | 说明 |
| --- | --- | --- |
| `frontend/src/pages/NewRewritePage.tsx` | 重写上传逻辑 + 文案 | 新增 .docx 解析（mammoth）、.doc/PDF 针对性提示、上传区文案统一、链接占位文案更新、所有「发稿包」→「内容包」 |
| `frontend/src/pages/InboxPage.tsx` | 重写 | 标题改为「素材库」、定位明确为未来批量素材管理、CTA 改为「去文章工作台」 |
| `frontend/src/components/layout/Sidebar.tsx` | 命名 | Sidebar「生成发稿包」→「生成内容包」、「素材箱」→「素材库」 |
| `frontend/src/pages/RewriteResultPage.tsx` | 文案 | 「AI 正在生成发稿包」→「AI 正在生成内容包」（2 处） |
| `frontend/src/pages/MultiPlatformResultPage.tsx` | 文案 | 标题与进度提示「发稿包」→「内容包」（2 处） |
| `frontend/src/pages/ProjectListPage.tsx` | 文案 | 空状态描述「发稿包」→「内容包」 |
| `frontend/src/pages/ProjectOverviewPage.tsx` | 文案 | HOME_COPY、Checklist、ActionCard、EmptyState、CTA 文案统一（5 处 + 1 处「打开素材箱」→「打开素材库」） |
| `frontend/src/pages/HistoryPage.tsx` | 文案 | 页面说明「发稿包」→「内容包」 |
| `frontend/src/components/projects/WorkspaceFormDialog.tsx` | 文案 | 创建工作区描述「发稿包」→「内容包」 |
| `frontend/src/components/rewrite/RewriteConfigPanel.tsx` | 文案 | 多平台提示「发稿包」→「内容包」 |
| `frontend/src/lib/platformScorecard.ts` | 文案 | 4 个平台 `afterLabel: '发稿包评分'` → `'内容包评分'` |
| `frontend/src/common/workspace.ts` | 文案 | agency 类型描述「发稿包」→「内容包」 |
| `frontend/src/App.tsx` | 注释 | 路由注释「发稿包」→「内容包」、「素材箱」→「素材库」 |
| `frontend/src/vite-env.d.ts` | 类型声明 | 新增 `mammoth` 与 `mammoth/mammoth.browser` 模块声明 |
| `frontend/package.json` | 依赖 | 新增 `mammoth ^1.12.0` |

后端、数据库、Prompt、路由名、`RewriteTask` 类型名均未改动。

---

## 2. 哪些「发稿包」文案改成了「内容包」

全量 grep 确认：改完后 `frontend/src` 下 **0 处**「发稿包」残留。主要替换点：

### Sidebar
- 「生成发稿包」→ **「生成内容包」**

### NewRewritePage（文章工作台）
- 副标题：「…再生成官网、公众号、小红书、知乎多平台发稿包。」→「导入一篇文章，先确认母稿，再选择诊断或生成多平台内容包。」
- 提交按钮：`生成发稿包` / `生成 N 个平台发稿包` → `生成内容包` / `生成 N 个平台内容包`
- 模式卡片：`直接生成发稿包` → `直接生成内容包`；描述「生成发稿包」→「生成内容包」
- 诊断建议动作：`建议生成发稿包` → `建议生成内容包`
- Textarea placeholder：「再生成多平台发稿包」→「再生成多平台内容包」
- 多平台提示横幅：「本次将生成 N 个平台发稿包」→「…内容包」
- 知识库提示：「你仍然可以先生成发稿包」→「…生成内容包」
- 诊断面板说明：「会在『生成发稿包』流程中」→「…『生成内容包』」

### 结果页
- RewriteResultPage：「AI 正在生成发稿包」→「AI 正在生成内容包」（2 处）
- MultiPlatformResultPage：标题「多平台发稿包（N 个）」→「多平台内容包（N 个）」；进度提示「AI 正在生成发稿包」→「…内容包」

### 工作区相关
- ProjectListPage 空状态：「并生成…多平台发稿包」→「…内容包」
- ProjectOverviewPage：HOME_COPY 5 种工作区类型描述、Checklist「生成第一个发稿包」→「生成第一个内容包」、ActionCard 标题「生成发稿包」→「生成内容包」+「多平台发稿包」→「多平台内容包」、EmptyState「生成多平台发稿包」→「…内容包」
- HistoryPage：「查看所有工作区下生成过的发稿包」→「…内容包」
- WorkspaceFormDialog：「并生成多平台发稿包」→「…内容包」
- workspace.ts（agency）：「并生成多平台发稿包」→「…内容包」
- RewriteConfigPanel：「将为每个平台分别生成独立发稿包」→「…内容包」
- platformScorecard：4 个平台 `afterLabel` 「发稿包评分」→「内容包评分」

### 素材库（原素材箱）
- Sidebar：「素材箱」→ **「素材库」**
- ProjectOverviewPage ActionCard CTA：「打开素材箱」→「打开素材库」

**注意：底层 API / task / route / `RewriteTask` 类型名未改名**，仅改用户可见文案。

---

## 3. 文章工作台与素材库的边界如何区分

| 维度 | 文章工作台（NewRewritePage） | 素材库（InboxPage） |
| --- | --- | --- |
| 定位 | 单篇文章即时处理 | 多篇素材长期管理与批量生成的未来能力 |
| 用户心智 | 我手里有一篇文章，想马上诊断、优化、生成多平台内容包 | 我有很多文章/报告/链接，想先存起来、管理起来，以后批量处理 |
| 当前能力 | 粘贴正文 / 上传单篇文件 / 确认母稿 / 诊断评分 / 选平台 / 生成内容包 | **仅占位**，不开放任何上传或解析 |
| 入口 | Sidebar「生成内容包」 | Sidebar「素材库」 |
| 路由 | `/projects/:projectId/rewrite/new` | `/projects/:projectId/inbox` |

**核心原则**：素材库不再与文章工作台抢入口。素材库页面明确声明当前版本不开放批量导入，所有单篇处理统一引导到文章工作台。

---

## 4. 素材库页面如何收敛

`InboxPage.tsx` 完全重写，收敛策略：

### 标题
- H1：「素材箱」→ **「素材库」**

### 副标题（新增）
> 用于后续管理多篇文章、报告和链接。当前版本请先在文章工作台处理单篇文章。

### 主卡片
- 标题：「未来你可以在这里」→ **「未来可在这里管理多篇素材」**
- 列表项保留（批量上传 Word/PDF/HTML/MD/TXT、保存网页链接、保存公众号链接、管理多篇正文）
- 底部说明：「并将素材批量生成…发稿包」→「…内容包」

### 警示文案
旧：「当前版本暂未开放批量导入与解析能力。公众号链接可能受访问、授权和版权限制影响…」

新：
> **当前版本暂未开放批量导入与解析。**
> 如果你只有一篇文章，请前往文章工作台处理。

### CTA
- 旧标题：「现在就生成内容？」→ **「现在要处理单篇文章？」**
- 旧按钮：「先生成单篇发稿包」→ **「去文章工作台」**
- 旧说明：暗示素材箱可处理单篇 → 新说明明确指向文章工作台能力（粘贴正文或上传 Word/TXT/HTML，先诊断再生成）

**不再出现**「现在就生成内容？」这类让用户以为素材箱也能处理单篇文章的文案。

---

## 5. docx 上传如何实现

### 依赖
新增 `mammoth ^1.12.0`（浏览器端 docx 解析库，纯前端，无需后端支持）。

### 解析流程（`parseDocxToText`）
1. `FileReader.readAsArrayBuffer(file)` 读取 .docx 为 ArrayBuffer
2. `mammoth.convertToHtml({ arrayBuffer })` 转为 HTML
3. 复用已有 `stripHtmlTags()` 剥离标签、保留段落换行
4. 取首行非空且长度 ≤ 60 的文本作为标题候选
5. 自动填入正文（与标题），`sourceType` 标记为 `'docx'`
6. 触发 `computeContentMetrics` 实时统计
7. 切回「粘贴正文」Tab 展示已填入内容，进入正常确认母稿流程

### 类型支持扩展
- `ACCEPTED_FILE_EXT` 新增 `.docx`
- `ACCEPTED_FILE_MIME` 新增 `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `ArticleSource` 类型新增 `'docx'`
- `SOURCE_LABEL['docx'] = 'Word'`（确认母稿步骤显示「来源：Word」）
- `<input accept>` 同步新增 .docx

### 上传交互
- 上传中显示 `Loader2` 旋转 + 「正在解析文件…」，禁用重复点击
- 解析成功：显示「已导入文件：xxx.docx（Word）」
- 解析后正文为空：提示「Word 文档解析后正文为空，请确认文档内容或直接粘贴正文。」

### 类型声明
mammoth 无官方 `@types`，在 `vite-env.d.ts` 新增 `declare module 'mammoth'` 与 `declare module 'mammoth/mammoth.browser'`，仅声明用到的 `convertToHtml` / `extractRawText` 接口。

---

## 6. 是否新增依赖

**是，新增 1 个前端依赖：`mammoth ^1.12.0`**。

- 用途：浏览器端解析 .docx 为 HTML/纯文本
- 体积影响：构建产物主 chunk 从约 1.48 MB 增至 1.56 MB（gzip 从约 446 KB 增至 452 KB）
- 无后端依赖，纯客户端解析
- 未引入 PDF / Word .doc / OCR 相关库

未新增其它依赖。

---

## 7. .doc / PDF / 链接如何提示

在 `handleFileUpload` 中按优先级判定（明确不支持的类型优先给出针对性提示）：

| 文件类型 | 提示文案 |
| --- | --- |
| `.doc`（旧版 Word） | 暂不支持 .doc 格式，请先另存为 .docx 后上传。 |
| `.pdf` | 当前版本暂不支持 PDF 解析，请复制正文粘贴，或转为 Word / TXT / HTML 后上传。 |
| 其它不支持的类型 | 不支持该文件格式。请上传 .docx / .txt / .md / .html，或直接粘贴正文。 |
| .docx 解析失败 | Word 文档解析失败，请复制正文后粘贴。 |
| .docx 解析为空 | Word 文档解析后正文为空，请确认文档内容或直接粘贴正文。 |

### 上传区常驻文案
- 主提示：「支持 .docx / .txt / .md / .html」
- 辅助提示：「适合上传单篇文章，不用于批量素材管理。」
- 限制说明：「暂不支持 .doc / PDF / 扫描件。PDF 内容请先复制正文后粘贴，或转为 Word / TXT / HTML 后上传。」

**不再写**「不支持 Word / PDF」（因为已支持 Word .docx）。

### 链接入口（占位）
「粘贴链接」Tab 仍只做占位，不做真实抓取。文案更新为：
> 网页链接和公众号链接解析将在后续版本支持。
> 当前请复制正文后粘贴，或上传 Word / TXT / HTML 文件。

按钮：「切回粘贴正文」。明确不暗示当前可解析公众号链接。

---

## 8. 是否改了后端 API

**否。** 本轮未触碰 `backend/**` 任何文件。`rewrite_tasks.py` / `rewrite_service.py` / `scoring_service.py` / `outputs.py` / `export_service.py` / Prompt 文件均保持原样。.docx 解析完全在前端完成，解析后的纯文本通过既有 `POST /api/projects/:projectId/tasks` 接口提交，接口契约不变。

---

## 9. 是否改了数据库

**否。** 未新增任何数据库字段，未新增 Alembic 迁移，未改 `models/**` / `schemas/**`。`sourceType` 仅是前端 state，不落库。

---

## 10. 验收结果

| # | 验收项 | 结果 |
| --- | --- | --- |
| 1 | Sidebar「生成发稿包」改为「生成内容包」 | ✅ |
| 2 | 文章工作台页面标题仍为「文章工作台」 | ✅ H1 未变 |
| 3 | 页面文案中不再出现「发稿包」主称呼，统一为「内容包」 | ✅ grep 0 处残留 |
| 4 | 文章工作台上传区显示支持 `.docx / .txt / .md / .html` | ✅ |
| 5 | 上传 `.docx` 后可解析正文并填入文章正文 | ✅ mammoth 解析 + 自动填入 |
| 6 | 上传 `.doc` 时提示另存为 `.docx` | ✅ 针对性提示 |
| 7 | 上传 PDF 时提示暂不支持 PDF | ✅ 针对性提示 |
| 8 | 素材箱页面改为「素材库」并明确为未来批量素材管理能力 | ✅ 标题+副标题+主卡片 |
| 9 | 素材库页面 CTA 指向文章工作台 | ✅「去文章工作台」 |
| 10 | 素材库不再让用户误以为当前可上传 Word/PDF/公众号链接并立即解析 | ✅ 警示文案明确「暂未开放」 |
| 11 | 不新增数据库字段 | ✅ |
| 12 | 不新增后端 API | ✅ |
| 13 | 多平台任务创建逻辑不受影响 | ✅ `handleSubmit` / `Promise.allSettled` 未改 |
| 14 | `npm run build` 通过 | ✅ 2877 modules，4.80s |
| 15 | `npx tsc --noEmit` 通过 | ✅ exit 0 |

---

## 11. 仍存在的问题

1. **主 chunk 体积增长**：引入 mammoth 后主 chunk 约 1.56 MB（gzip 452 KB），触发 vite 默认 500 KB 告警。可通过 `manualChunks` 或将 mammoth 改为动态 `import()` 懒加载优化（见下一步建议）。
2. **.docx 解析为纯文本丢失格式**：mammoth 输出 HTML 后用 `stripHtmlTags` 剥离为纯文本，Word 中的表格、图片、复杂样式会丢失。对结构化要求高的文档建议手动转 Markdown。
3. **标题识别较粗**：仅取首行非空且 ≤ 60 字符作为标题候选，可能误识别。用户可在确认母稿步骤手动修改。
4. **mammoth 类型声明为手写最小集**：仅覆盖 `convertToHtml` / `extractRawText`，未覆盖 `styleMap` 等高级选项。当前用法足够，未来扩展需补声明。
5. **素材库仍占位**：未实现任何批量能力，仅信息架构与文案收敛，符合本轮约束。

---

## 12. 下一步建议

### 优先级 P1
1. **mammoth 懒加载**：将 `import mammoth from 'mammoth/mammoth.browser'` 改为 `const mammoth = (await import('mammoth/mammoth.browser')).default`，仅在用户上传 .docx 时加载，可显著降低首屏体积。
2. **构建分包**：`rollupOptions.output.manualChunks` 拆分 `react-markdown` / `recharts` / `mammoth` 等大依赖。
3. **.docx 保留 Markdown 结构**：用 mammoth 的 styleMap 把 Word 标题样式映射为 Markdown `#`，保留层级结构以提升后续诊断准确度。

### 优先级 P2
4. **素材库批量上传 MVP**：实现多文件上传 + 列表管理（不解析），为后续批量生成做基础。
5. **PDF 文本提取**：引入 `pdfjs-dist` 支持非扫描 PDF 的文本提取（不做 OCR）。
6. **网页/公众号链接解析**：后端新增爬取服务，注意合规与反爬。
