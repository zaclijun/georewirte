# Article Workbench MVP 实施报告

> 窗口：Article Workbench MVP Window
> 范围：将 `NewRewritePage` 从「表单式改写任务页」升级为「单篇文章工作台 Article Workbench」
> 日期：2026-06-29

---

## 1. 修改了哪些文件

本轮仅修改 **2 个前端文件**，未触碰任何后端 / 数据库 / Prompt 文件。

| 文件 | 改动类型 | 说明 |
| --- | --- | --- |
| `frontend/src/pages/NewRewritePage.tsx` | 重写 | 从单屏表单升级为三步骤文章工作台（导入 → 确认母稿 → 模式与平台） |
| `frontend/src/components/rewrite/RewriteConfigPanel.tsx` | 增量 | 新增 `hidePlatforms?: boolean` 可选 prop，用于在「高级设置」折叠态下隐藏平台多选区块（平台选择已上移到主流程） |

复用、未修改的关键文件：
- `frontend/src/lib/contentMetrics.ts`（内容规模统计，已有 `computeContentMetrics` / `formatMetricsLine`，直接复用）
- `frontend/src/components/common/MarkdownRenderer.tsx`（母稿预览渲染）
- `frontend/src/services/api.ts`、`frontend/src/hooks/useRewriteTasks.ts`（任务提交链路保持不变）
- `backend/**`（后端零改动）

---

## 2. NewRewritePage 如何从表单页升级为文章工作台

旧版 `NewRewritePage` 是单屏 65/35 双栏表单：左侧标题 + 正文 + 提交按钮，右侧 `RewriteConfigPanel`（平台 / 视角 / 来源策略 / 长度 / Schema / 品牌事实）一次性铺开。

新版改造为 **三步骤状态机**，核心用户心智为「先确认内容质量，再决定是否改写并生成多平台发稿包」：

```text
Step 1 导入文章  →  Step 2 确认母稿  →  Step 3 模式与平台
```

- **Step 1 导入文章**：导入方式分段切换（粘贴正文 / 上传文件 / 粘贴链接占位）+ 标题 + 正文 + 实时内容规模统计。点击「确认母稿」进入下一步，不再一粘贴就提交。
- **Step 2 确认母稿**：展示来源类型徽标、标题、内容规模摘要、Markdown 渲染预览。提供「编辑母稿」回退与「继续」推进，给用户一次「二次确认」机会。
- **Step 3 模式与平台**：任务模式卡片选择（先诊断评分 / 直接生成发稿包）+ 平台选择网格（含平台说明）+ 诊断面板（诊断模式下）+ 高级设置（默认折叠）+ 生成按钮。

顶部新增步骤指示器（1 → 2 → 3，含完成态 ✓），页面 H1 改为「文章工作台」，副标题置于内容区顶部。Sidebar 仍叫「生成发稿包」，未改动。

### 关键设计决策
- **不再一粘贴就生成**：旧版 `canSubmit` 直接驱动提交按钮，新版强制经过「确认母稿」步骤。
- **平台选择上移**：平台选择从右侧配置面板移到主流程 Step 3，并附带每平台说明文案；配置面板降级为「高级设置」折叠。
- **状态隔离**：`step` / `taskMode` / `diagnosis` 独立 state，切换模式会清空已诊断结果，避免脏数据。

---

## 3. 文章导入支持哪些方式

P0 支持三种导入方式，通过分段切换（`ImportTab`）：

| 方式 | 实现 | 说明 |
| --- | --- | --- |
| **粘贴正文** | 默认方式，`<Input>` 标题 + `<Textarea>` 正文 | 始终可编辑，是其它导入方式的回退目标 |
| **上传文件** | `<input type="file" hidden>` + 拖拽区域 + `FileReader.readAsText` | 支持 `.txt` / `.md` / `.markdown` / `.html` / `.htm`；HTML 会简单剥离标签并尝试提取 `<title>`；不支持 Word / PDF / OCR |
| **粘贴链接** | 仅入口与提示文案占位 | 提示「网页链接和公众号链接解析将在后续版本支持」，并提供「切回粘贴正文」按钮。**不做真实抓取** |

### 文件类型校验
- 白名单：扩展名 `.txt` / `.md` / `.markdown` / `.html` / `.htm`，或 MIME `text/plain` / `text/markdown` / `text/html`。
- 非 P0 类型（Word / PDF 等）：上传后给出「不支持该文件格式。请粘贴正文，或转为 TXT / Markdown / HTML 后上传。」提示，不写入正文。
- 满足验收点 5。

### HTML 标签剥离
`stripHtmlTags()` 做最小化处理：去除 `<script>` / `<style>` 块 → 尝试提取 `<body>` → 块级标签转换行 → 剥离剩余标签 → 解码常见实体（`&nbsp;` `&amp;` 等）→ 压缩空白。不做完整 DOM 解析，符合「成本高时先直接提取 body text」的要求。

### 来源类型追踪
`sourceType: 'manual' | 'txt' | 'markdown' | 'html'`，上传后自动推断，在「确认母稿」步骤以徽标展示（如「来源：HTML」）。

---

## 4. 内容规模统计如何实现

直接复用已有的 `frontend/src/lib/contentMetrics.ts`，无需新增逻辑：

```ts
const metrics = useMemo(() => computeContentMetrics(content), [content])
```

统计维度（全部由 `computeContentMetrics` 提供）：
- `charCount`：去多余空白后的总字符数
- `chineseCharCount`：CJK 字符数
- `englishWordCount`：英文单词数
- `paragraphCount`：按空行分割的段落数
- `headingCount`：Markdown `#`~`######` 标题数
- `estimatedReadingMinutes`：中文 400 字/分 + 英文 200 词/分，最少 1 分钟

### 实时展示位置
- **Step 1**：正文输入区下方，格式 `2,846 字 · 18 段 · 6 个标题 · 预计 7 分钟`（`formatMetricsLine`）；空内容时显示引导文案。
- **Step 2**：母稿预览卡片中展示同一行摘要。
- 正文输入区右上角额外展示 `content.length` 原始字符数，便于编辑时快速参考。

满足验收点 3。

---

## 5. 草稿暂存如何实现

P0 仅做本地草稿，不改后端。

### 存储
- Key：`article_draft:{projectId}`（按项目隔离）
- Value（JSON）：`{ title, body, sourceType, updatedAt }`

### 写入时机
`useEffect` 监听 `[title, content, sourceType, draftKey]`，**防抖 600ms** 后写入 `localStorage`。标题与正文均为空时不写入，避免覆盖空草稿。写入失败（隐私模式等）静默忽略。

### 恢复时机
- 进入页面时（`useEffect` 依赖 `[projectId]`）检测一次：若存在非空草稿，置顶展示恢复横幅「检测到未完成草稿（最近更新：YYYY-MM-DD HH:MM）」，提供「恢复」/「丢弃」按钮。
- 不自动覆盖当前已有输入，避免 HMR 重载或误操作。
- 「恢复」回填 `title` / `body` / `sourceType`；「丢弃」清除 `localStorage` 并关闭横幅。

### 清除时机
任务提交成功后（单平台 `onSuccess` 与多平台 `createdIds.length > 0` 分支）主动 `localStorage.removeItem(draftKey)`，避免已提交内容残留为草稿。

满足验收点 6。

---

## 6. 任务模式如何设计

在 Step 3 提供「你想先做什么？」两卡片选择：

| 模式 | 默认 | 文案 |
| --- | --- | --- |
| **先诊断评分** | ✅ 默认选中（带「推荐」徽标） | 先查看文章的内容质量、平台适配度、来源缺口和改写建议，再决定是否生成发稿包。 |
| **直接生成发稿包** | | 跳过诊断，直接生成所选平台的发稿包。 |

### 行为差异
- **先诊断评分**：展示「内容诊断」卡片，提供「开始诊断」按钮 → 触发前端启发式预诊断 → 展示发布就绪度 / 主要问题 / 来源缺口 / 建议动作。诊断后底部仍保留「生成发稿包」主按钮，用户可基于诊断结果决定是否继续。
- **直接生成发稿包**：不展示诊断卡片，底部直接展示「生成发稿包」主按钮。
- 切换模式会清空 `diagnosis`，避免跨模式脏数据。

### 平台选择位置
平台选择放在「确认母稿」之后的 Step 3，不在初始第一屏暴露。4 个平台卡片含说明文案（与需求文档一致）：
- 官网文章：生成 GEO 友好的正文、FAQ 和 Schema。
- 公众号：生成适合移动端阅读的标题、导语、正文和发布建议。
- 小红书：生成图文卡片脚本、Caption、标签和评论引导，不生成真实图片。
- 知乎问答：生成问题式标题、结论先行的回答结构和事实依据。

满足验收点 7、11。

---

## 7. 先诊断评分是否真实可用，如果不可用，需要说明后端缺口

**部分可用，存在后端缺口。**

### 当前实现
「先诊断评分」模式下的诊断是 **前端启发式预诊断（Heuristic Pre-diagnosis）**，基于 `computeContentMetrics` 与知识库状态，不调用任何后端 API：

- **发布就绪度**：`ready` / `review` / `needs_material`（由 high 级问题数决定）
- **主要问题**：内容过短、缺少标题层级、段落数少、未检测到数据信号（百分比/年份/万/亿）、未检测到来源信号、知识库为空
- **来源缺口**：原文缺少权威来源、知识库缺少品牌事实/产品/案例
- **建议动作**：建议生成发稿包（P0 最小文案）

诊断卡片明确标注「前端快速预诊断 · 深度诊断在生成时执行」，并对用户透明说明「深度 LLM 诊断（6 维评分 + 改写策略）会在『生成发稿包』流程中由后端执行」。

### 后端缺口
经核查 `backend/app/api/rewrite_tasks.py` 与 `backend/app/services/rewrite_service.py`：

- **后端不存在独立的 score / diagnose API**。评分诊断（`scoring_service.score_and_diagnose`）目前耦合在 `rewrite_service.run_rewrite` 内部，作为改写流程的 Call 1（评分 + 诊断 + 策略 → Call 2 改写出包）。
- 即「诊断」与「改写」在后端是一条原子流水线，无法仅诊断不改写。

按本轮约束「不要强行大改后端」「不要改数据库」「不要重构 Prompt 主流程」，未新增独立诊断 API。

### 建议的后端补齐方案（下一轮）
新增 `POST /api/projects/:projectId/diagnose`（只读，不创建 task、不改 DB）：
- 入参：`{ title, original_content, perspective?, brand_fact_ids? }`
- 内部仅调用 `scoring_service.score_and_diagnose`，返回 6 维评分 + 来源缺口 + 改写策略
- 前端 `runDiagnosis` 由 `setTimeout` 模拟替换为真实 `useMutation` 调用

在补齐前，当前前端预诊断已能给出有价值的快速判断，且不阻塞主流程。

---

## 8. 直接生成发稿包是否不受影响

**完全不受影响。**

`handleSubmit` 函数原样保留，逻辑未改动：

- **单平台**：走 `useCreateTask` mutation → 成功跳转 `/tasks/:taskId/result`。
- **多平台**：`Promise.allSettled` 并行创建 → 全部失败不跳转并提示 → 部分或全部成功跳转 `/multi-platform-result?taskIds=...` → 部分失败跳转后 `alert` 提示。
- `buildPayload` / `resolveNeedSchema` 逻辑不变：
  - 官网文章 `need_schema = config.needSchema`
  - 公众号 / 小红书 / 知乎问答 `need_schema = false`
- 平台规则未变：官网生成 Schema、公众号生成 PlatformPublishGuide、小红书生成图文脚本、知乎生成发布建议。

唯一新增的副作用：提交成功后主动清除本地草稿（`localStorage.removeItem(draftKey)`），这是纯前端增强，不影响后端契约。

满足验收点 8、9。

---

## 9. 高级设置如何收敛

旧版 `RewriteConfigPanel` 一次性展示：平台 / 视角 / 来源策略 / 输出长度 / Schema / 品牌事实。

新版收敛策略（**不删除任何功能**，仅弱化与折叠）：

1. **平台选择上移**：平台多选从配置面板移到 Step 3 主流程卡片（含说明文案）。
2. **配置面板降级为「高级设置」**：Step 3 底部新增可折叠区域，标题「高级设置」+ 摘要「视角 · 来源策略 · 输出长度 · Schema · 品牌事实」，**默认折叠**。
3. **`hidePlatforms` 复用**：给 `RewriteConfigPanel` 新增 `hidePlatforms` prop，折叠态下渲染该面板时传入 `hidePlatforms`，避免平台选择重复出现（主流程已是平台唯一来源）。
4. 首次使用时用户只看到：文章 → 任务模式 → 平台选择 → 生成按钮。

`RewriteConfigPanel` 内部原有的「高级参数」折叠块（P1 占位文案）保持不变。

满足验收点 10。

---

## 10. 是否改了后端 API

**否。** 本轮未触碰 `backend/**` 任何文件。`rewrite_tasks.py` / `rewrite_service.py` / `scoring_service.py` / `outputs.py` / `export_service.py` / Prompt 文件均保持原样。

---

## 11. 是否改了数据库

**否。** 未新增任何数据库字段，未新增 Alembic 迁移，未改 `models/**` / `schemas/**`。草稿暂存仅使用 `localStorage`，与后端 DB 完全无关。

---

## 12. 验收结果

| # | 验收项 | 结果 |
| --- | --- | --- |
| 1 | 进入 `/projects/:projectId/rewrite/new`，页面标题显示「文章工作台」 | ✅ TopBar H1 = 文章工作台 |
| 2 | 用户可以粘贴标题和正文 | ✅ Step 1 标题 Input + 正文 Textarea |
| 3 | 输入正文后实时显示字数、段落、标题数、预计阅读时长 | ✅ `formatMetricsLine` 实时展示 |
| 4 | 用户可以上传 `.txt` / `.md` / `.html` 并填入正文 | ✅ 文件上传 + `FileReader` + HTML 剥离 |
| 5 | 上传 Word / PDF 时给出「不支持」提示 | ✅ `isAcceptedFile` 白名单校验 + 提示文案 |
| 6 | 用户刷新页面后可以恢复草稿 | ✅ `article_draft:{projectId}` + 恢复横幅 |
| 7 | 用户确认母稿后可选择先诊断评分 / 直接生成发稿包 | ✅ Step 3 双模式卡片 |
| 8 | 直接生成发稿包仍能创建单平台 / 多平台任务 | ✅ `handleSubmit` 原样保留 |
| 9 | 多平台 Promise.allSettled 逻辑不受影响 | ✅ 未改动 |
| 10 | 高级设置默认折叠 | ✅ `showAdvanced` 默认 false |
| 11 | 官网 / 公众号 / 小红书 / 知乎平台说明正确 | ✅ `PLATFORM_DESCRIPTIONS` 与需求一致 |
| 12 | `npm run build` 通过 | ✅ `tsc -b && vite build` 成功（2874 modules，3.73s） |
| 13 | `npx tsc --noEmit` 通过 | ✅ exit code 0 |

---

## 13. 仍存在的问题

1. **诊断非深度 LLM 诊断**：当前「先诊断评分」是前端启发式预诊断，无法给出 6 维评分与改写策略。深度诊断依赖后端补齐独立 diagnose API（见第 7 节）。
2. **HTML 剥离较粗糙**：`stripHtmlTags` 基于正则，对复杂嵌套 / 非标准 HTML 可能残留多余空白或丢失结构。P0 已满足「提取 body text」要求，复杂 HTML 建议转 Markdown 后上传。
3. **草稿无多端同步**：`localStorage` 仅限当前浏览器，跨设备不同步（P0 约束，符合预期）。
4. **诊断建议动作单一**：P0 仅展示「建议生成发稿包」，未实现「完整改写 / 轻度优化 / 保留原文 / 先补充知识库」四类枚举的差异化推荐。
5. **构建包体积告警**：`vite build` 提示主 chunk > 500 kB（与本次改动无关，是既有状况），可通过 `manualChunks` 后续优化。

---

## 14. 下一步建议

### 优先级 P1
1. **补齐独立诊断 API**：新增 `POST /api/projects/:projectId/diagnose` 只读接口，解耦「诊断」与「改写」。前端 `runDiagnosis` 替换为真实调用，展示 6 维评分雷达图 + 改写策略列表。
2. **诊断建议动作枚举化**：基于诊断结果（评分阈值 / 来源缺口数 / 知识库状态）输出差异化建议：完整改写 / 轻度优化 / 保留原文仅生成发布建议 / 先补充知识库，并对应不同按钮行为。
3. **草稿多版本**：`localStorage` 存最近 N 份草稿快照，支持版本回滚。

### 优先级 P2
4. **网页 / 公众号链接解析**：替换「粘贴链接」占位为真实抓取（需后端爬取服务 + 正文提取，注意合规与反爬）。
5. **Word / PDF 解析**：支持 `.docx` / `.pdf` 文本提取（`mammoth` / `pdfjs-dist`）。
6. **构建分包优化**：`rollupOptions.output.manualChunks` 拆分 `react-markdown` / `recharts` / `tanstack-query` 等大依赖。
7. **诊断历史**：将每次诊断结果落到 `content_scores`（score_type 新增 `pre_diagnose`），形成文章质量趋势。
