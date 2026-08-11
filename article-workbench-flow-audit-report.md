# 文章工作台流程审计报告

> 窗口：Article Workbench Flow Audit Window（只读审计，不改代码）
> 日期：2026-06-29
> 审计对象：`frontend/src/pages/NewRewritePage.tsx` 及其依赖
> 审计目标：判断当前生成路径是否过长、状态机是否过重、是否应压缩为更短流程

---

## 1. 当前流程还原

### 1.1 页面顶层结构（基于代码）

[NewRewritePage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/NewRewritePage.tsx) 是一个 **三步状态机 + 单列纵向布局**，外层 `max-w-3xl`（约 768px）单栏，无右侧 Inspector。步骤由 `step: 'import' | 'confirm' | 'configure'` 驱动，顶部有 `StepIndicator`（1/2/3 + ✓ 完成态）。

```text
进入 /projects/:projectId/rewrite/new
  ↓
顶部：面包屑 + H1「文章工作台」
副标题：「导入一篇文章，先确认母稿，再选择诊断或生成多平台内容包。」
步骤条：① 导入文章 → ② 确认母稿 → ③ 选择模式与平台
  ↓
草稿恢复横幅（条件渲染，localStorage 检测到未完成草稿时）
知识库提示横幅（常驻，按 workspace_type 切文案）
  ↓
Step 1 / Step 2 / Step 3 三选一渲染
```

### 1.2 三步内容

| 步骤 | 状态 | 主要内容 | 主操作 |
| --- | --- | --- | --- |
| Step 1 导入文章 | `step='import'` | 导入方式 Tab（粘贴正文 / 上传文件 / 粘贴链接）+ 标题 Input + 正文 Textarea（min-h 360px）+ 实时字数统计 + 取消/确认母稿 | 「确认母稿」按钮 → `setStep('confirm')` |
| Step 2 确认母稿 | `step='confirm'` | 来源徽标 + 标题 + 内容规模摘要 + Markdown 渲染预览（max-h 420px 滚动）+ 编辑母稿/继续 | 「继续」按钮 → `setStep('configure')` |
| Step 3 模式与平台 | `step='configure'` | 任务模式卡片（先诊断评分[推荐] / 直接生成内容包）+ 平台选择网格（4 平台卡片含说明）+ 诊断面板（仅 diagnose 模式）+ 高级设置（默认折叠，展开后嵌入 RewriteConfigPanel hidePlatforms）+ 底部生成按钮 | 「生成内容包 / 生成 N 个平台内容包」→ `handleSubmit` |

### 1.3 数据流

- 单平台：`useCreateTask` mutation → 跳转 `/tasks/:taskId/result`
- 多平台：`Promise.allSettled` 并行创建 → 跳转 `/multi-platform-result?taskIds=...`
- 草稿：`localStorage article_draft:{projectId}`，防抖 600ms 写入，提交成功后清除
- 诊断：前端启发式 `diagnoseArticle`（基于 metrics + kbEmpty），`setTimeout(200ms)` 模拟异步

---

## 2. 当前点击路径统计

### 路径 A：粘贴正文 → 直接生成内容包（最常见路径）

| # | 动作 | 界面状态 |
| --- | --- | --- |
| 1 | 进入页面 | Step 1，默认 importTab='paste' |
| 2 | 点击标题输入框，输入标题 | Step 1 |
| 3 | 点击正文 Textarea，粘贴正文 | Step 1，实时显示字数统计 |
| 4 | 点击「确认母稿」 | Step 2，显示母稿预览 |
| 5 | 点击「继续」 | Step 3，显示模式与平台 |
| 6 | （默认已选「先诊断评分」）若想直接生成，点击「直接生成内容包」卡片 | Step 3，诊断面板消失 |
| 7 | （平台默认官网文章）确认/调整平台 | Step 3 |
| 8 | 点击「生成内容包」 | 提交，跳转结果页 |

**统计：**
- 界面状态切换：**3 次**（import → confirm → configure）
- 点击次数：**至少 5 次**（标题、正文、确认母稿、继续、生成；若切换模式或平台则更多）
- 需理解的选项：导入方式 Tab、标题、正文、字数统计、确认母稿、任务模式（2 选 1）、平台（4 选 N）、高级设置入口
- **必须进入确认母稿**：是（强制，无法跳过）
- **必须选择模式**：是（有默认值「先诊断评分」，但需用户认知「诊断 vs 直接」）
- **必须选择平台**：是（有默认值官网文章，但平台选择区始终展示）
- **高级设置干扰**：低（默认折叠），但 Step 3 同时展示 4 个区块（模式卡 / 平台卡 / 诊断面板 / 高级设置），视觉密度较高

**判断**：路径 A 对「我只想粘贴一篇文章立刻生成」的用户偏长，**确认母稿这一步是主要摩擦点**。

### 路径 B：上传 docx → 直接生成内容包

| # | 动作 | 界面状态 |
| --- | --- | --- |
| 1 | 进入页面 | Step 1 |
| 2 | 点击「上传文件」Tab | Step 1，显示上传区 |
| 3 | 点击上传区或拖拽 .docx | Step 1，mammoth 解析中（Loader2） |
| 4 | 解析完成：自动填入正文 + 首行作为标题候选（≤60 字） | Step 1，自动切回 paste Tab，显示「已导入文件」提示 |
| 5 | 检查标题是否识别正确，若错误需手动清空重输 | Step 1 |
| 6 | 点击「确认母稿」 | Step 2 |
| 7 | 点击「继续」 | Step 3 |
| 8 | 点击「直接生成内容包」卡片（若不想诊断） | Step 3 |
| 9 | 点击「生成内容包」 | 提交 |

**统计：**
- 上传后**自动填充**标题/正文：是（标题取首行 ≤60 字）
- **自动进入确认母稿**：否（仍停在 Step 1，需手动点「确认母稿」）
- 用户是否需返回编辑：**可能**（标题误识别时需手动修正，但当前无「返回编辑」按钮在 Step 2——只有「编辑母稿」回 Step 1）
- 标题误识别修正：**需手动清空 Input 重输**，无「标题识别有误」快捷修正
- 点击次数：**至少 6 次**（上传 Tab、选文件、确认母稿、继续、切换模式、生成）

**判断**：docx 路径比粘贴路径多 1 步（上传 + 可能的标题修正），且上传后**没有自动推进**，用户仍在 Step 1 看着已填好的正文还要点「确认母稿」。

### 路径 C：上传文章 → 先诊断评分 → 再生成内容包

| # | 动作 | 界面状态 |
| --- | --- | --- |
| 1-7 | 同路径 B 前 7 步（导入 → 确认 → 继续） | Step 3 |
| 8 | 默认「先诊断评分」已选，点击「开始诊断」 | Step 3，diagnosing=true（200ms） |
| 9 | 诊断结果展示：发布就绪度 / 主要问题 / 来源缺口 / 建议动作 | Step 3 |
| 10 | 点击「生成内容包」 | 提交 |

**统计：**
- 诊断是否真实执行：**部分**。前端 `diagnoseArticle` 是启发式（基于字数/段落/标题数/数据信号正则/来源信号正则/kbEmpty），**不是 LLM 深度诊断**。深度 6 维评分仍在生成时由后端执行。
- 诊断结果是否足以决策：**有限**。能给出「内容过短 / 缺标题 / 缺数据 / 缺来源 / 知识库为空」等定性提示，但无量化评分、无平台适配度、无改写策略。
- 诊断后是否能自然进入生成：**是**（诊断面板下方就是生成按钮）。
- 重复选择平台/模式：**否**（平台和模式在 Step 3 顶部已选，诊断不重置）。

**判断**：诊断入口存在但价值有限——前端预诊断信息密度低，用户看完仍需点「生成内容包」走后端深度诊断。**诊断与生成其实是同一后端流程的两段**，前端预诊断只是「锦上添花」，却占用了独立卡片和一步操作。

---

## 3. 当前状态机审计

### 3.1 状态变量清单（NewRewritePage.tsx L325-344）

| # | 变量 | 类型 | 用途 | 必要性 |
| --- | --- | --- | --- | --- |
| 1 | `step` | `'import'\|'confirm'\|'configure'` | 当前步骤 | 必要但可压缩 |
| 2 | `importTab` | `'paste'\|'upload'\|'link'` | 导入方式 | 必要 |
| 3 | `title` | string | 文章标题 | 必要 |
| 4 | `content` | string | 文章正文 | 必要 |
| 5 | `sourceType` | ArticleSource | 来源标记 | 必要（展示用） |
| 6 | `config` | RewriteConfig | 平台/视角/策略/长度/Schema/facts | 必要 |
| 7 | `taskMode` | `'diagnose'\|'direct'` | 任务模式 | **冗余嫌疑**（见下） |
| 8 | `diagnosis` | DiagnosisResult\|null | 诊断结果 | 仅 diagnose 模式用 |
| 9 | `diagnosing` | boolean | 诊断中 | 仅 diagnose 模式用 |
| 10 | `errorMsg` | string\|null | 提交错误 | 必要 |
| 11 | `showAdvanced` | boolean | 高级设置展开 | 必要 |
| 12 | `draftBanner` | ArticleDraft\|null | 草稿恢复横幅 | 必要 |
| 13 | `fileMsg` | string\|null | 文件上传提示 | 必要 |
| 14 | `uploading` | boolean | 文件解析中 | 必要 |
| 15 | `metrics` | useMemo ContentMetrics | 实时统计 | 派生 |
| 16 | `hasArticle` | 派生 boolean | 标题+正文非空 | 派生 |

**共 14 个独立 state（+2 派生）**。对一个「单篇文章处理」页面偏多。

### 3.2 状态问题判断

1. **状态是否过多**：是。14 个 state 中，`taskMode` / `diagnosis` / `diagnosing` 三个围绕「先诊断评分」展开，但该功能本质是「生成内容包」流程的前置可选步骤，用 3 个 state 维护一个次级功能偏重。
2. **状态之间是否有重复**：部分。`step='confirm'` 与 `step='import'` 在内容上高度重复——confirm 只是 import 的只读预览，title/content/metrics 都已存在，没有新信息。
3. **「确认母稿」与「编辑正文」状态重复**：**是**。Step 2 纯粹是 Step 1 的只读镜像 + 两个按钮（编辑母稿回 Step 1 / 继续去 Step 3）。用户在 Step 1 已经能看到标题、正文、字数统计，Step 2 的 Markdown 预览是唯一新增价值，但代价是多一次点击和状态切换。
4. **「模式选择」与「平台选择」能否合并**：能。两者都是 Step 3 的「生成配置」，没有依赖关系（模式不依赖平台，平台不依赖模式），可以合并为同一操作区。
5. **无用或暂时不可用状态**：`taskMode='diagnose'` 下的前端诊断是「半成品」——深度诊断要等生成时后端执行，前端 `diagnosis` 结果对最终决策影响有限。若用户始终点「直接生成」，`diagnosis`/`diagnosing` 永远不会被触发。
6. **返回上一步状态丢失风险**：**无丢失风险**。所有 state 在组件级，`setStep('import')` 回退时 title/content/config 都保留。但 `diagnosis` 在切换 taskMode 时会被 `setDiagnosis(null)` 清空（L833/L843），这是合理的。

---

## 4. 三步流程是否过长的判断

**判断：是的，三步对当前产品阶段偏长。**

### 4.1 方案 A 评估：保留三步，每步更轻

- **是否仍偏长**：是。即使每步内容更轻，3 次状态切换 + 步骤条本身的认知负担仍在。
- 哪些可折叠：Step 3 的诊断面板可折叠进高级设置；平台说明文案可缩短。
- **是否适合当前产品阶段**：偏重。当前是 MVP，用户心智是「一篇文章马上处理」，向导式三步更像 onboarding 流程，不适合高频复用。

### 4.2 方案 B 评估：压缩为两步

结构：① 导入并确认文章（同屏）→ ② 选择目标并生成（模式+平台合并到右侧）。

- **是否更适合当前产品**：是。去掉独立的「确认母稿」步骤，把预览变成导入区的内联展开（用户可切换「编辑/预览」），路径缩短 1 步。
- 如何减少认知负担：导入即确认（标题+正文+字数已可见），模式与平台合并为「生成目标」一区。
- 是否破坏现有逻辑：**不破坏**。`handleSubmit` / `buildPayload` / `Promise.allSettled` 都不依赖 step，仅依赖 title/content/config。

### 4.3 方案 C 评估：单页工作台

结构：左侧文章编辑区（标题/正文/上传/字数）+ 右侧固定操作卡（平台/先诊断/生成/高级设置）。

- **是否最符合心智**：**最符合**。「我有一篇文章要马上处理」= 编辑器 + 一个生成按钮，无步骤条。
- 是否会让页面过复杂：**风险中等**。单页要同时承载导入、编辑、平台、模式、高级设置，若右栏不做 sticky 会与正文争空间。但当前 `max-w-3xl` 单栏改为左右双栏后，反而能更好利用宽屏。
- **是否适合渐进改造**：**适合**。当前代码已具备所有状态和组件，主要是重组 JSX 结构（从 step 条件渲染改为同屏分区），不改数据流。

**综合建议：方案 C（单页工作台）是最终目标，方案 B 是稳妥过渡。**

---

## 5. 确认母稿是否应独立存在

**判断：不应作为独立页面状态。**

### 5.1 理由

1. **信息无增量**：Step 2 展示的标题、正文、字数统计在 Step 1 已全部存在，Markdown 预览是唯一新增，但用户刚输入完正文，预览价值低。
2. **强制确认增加摩擦**：粘贴正文后用户已经「确认」了内容（他刚写的），再点一次「确认母稿」是冗余动作。
3. **docx 场景的真正需求**：上传 docx 后用户需要核对「标题是否识别正确 + 正文是否完整」，但这应该是**导入区的内联预览**，而非独立步骤。

### 5.2 建议改造

- **粘贴正文**：不需要强制确认。标题+正文+字数统计本身即「确认」。
- **上传 docx**：上传后在导入区原地展开「标题（可编辑）+ 正文预览（可切换编辑/预览）」，用户核对后直接点「生成」。
- **按钮文案**：从「确认母稿 → 继续」改为直接「生成内容包」或「先诊断」。
- **保留 Markdown 预览**：作为导入区的「预览」Tab（编辑/预览切换），而非独立步骤。

---

## 6. 先诊断评分入口应该如何放

**判断：取消「任务模式选择卡片」，改为两个并列 CTA 按钮。**

### 6.1 当前问题

- `taskMode` 占用一张独立卡片 + 2 个 ModeCard，但默认选中「先诊断评分」会让用户以为「必须先诊断」。
- 前端诊断是启发式，价值有限，却与「直接生成」平级展示，权重失衡。

### 6.2 建议

1. **不应默认选中「先诊断评分」**：大多数用户心智是「直接生成」，诊断是可选增强。
2. **改为次级按钮**：主 CTA「生成内容包」+ 次 CTA「先诊断」。
3. **文案简化**：「先诊断评分」→「先诊断」；「直接生成内容包」→「生成内容包」。
4. **取消模式卡片，改为两个 CTA**：
   - 主按钮：`生成内容包`（= 当前 direct 模式）
   - 次按钮：`先诊断`（= 当前 diagnose 模式，点击后展开诊断面板）
5. **后台评分不受影响**：无论用户点哪个，`handleSubmit` 都会创建 task，后端 `score-and-diagnose` 仍会在生成流程内执行 `score_before`/`score_after`。**不会影响结果页质量解释**。
6. **诊断面板位置**：点「先诊断」后在主区域上方展开诊断结果，或在右栏内嵌；生成按钮始终可见。

---

## 7. 平台选择应该如何放

**判断：移到右侧固定操作卡，按工作区类型设默认平台。**

### 7.1 当前问题

- 平台选择是 Step 3 的独立大卡片（4 个平台卡片 + 说明文案），占主区域大量空间。
- 默认平台仅用 `project?.default_platform ?? '官网文章'`，**未根据 workspace_type 定制**（虽然 `useWorkspaceType` 的 `meta.defaultPlatform` 已存在但未被使用）。
- 平台说明文案偏长，4 张卡片视觉重。

### 7.2 建议

1. **不应一直显示在主区域**：移到右侧操作卡，4 个平台用 compact checkbox/chip 即可，不需要大卡片。
2. **应默认选中一个平台**：是，且按工作区类型定制：
   - `brand` → 官网文章 + 公众号
   - `media` → 公众号 + 小红书
   - `professional` → 公众号 + 知乎问答
   - `agency` → 默认全部不选或官网文章（让用户选）
   - 当前 `WORKSPACE_TYPES` 的 `defaultPlatform` 已有单值，可扩展为 `defaultPlatforms: Platform[]`。
3. **平台说明过长**：缩短为半句，或改为 hover tooltip。
4. **放右侧固定操作卡**：与生成按钮同区，sticky 跟随滚动。
5. **主按钮动态显示**：是，`生成内容包` / `生成 N 个平台内容包` 已实现，保持。

---

## 8. 高级设置应该如何收敛

**判断：当前默认折叠已对，但内部项仍过早暴露。**

### 8.1 现状

`RewriteConfigPanel` 在 `hidePlatforms` 后仍展示：视角 / 来源策略 / 输出长度 / Schema 开关 / 品牌事实选择器 + 一个空的「高级参数（P1 占位）」折叠块。

### 8.2 建议

1. **默认折叠**：已是（`showAdvanced=false`），保持。
2. **过早暴露的项**：视角、来源策略、输出长度对 MVP 用户认知负担重（需理解「视角=品牌方/第三方/媒体」「来源策略=标记缺失/严格/宽松」「输出长度=紧凑/标准/详尽」）。
3. **应隐藏的**：
   - 「高级参数（P1 占位）」空折叠块——应删除，纯占位无信息。
   - Schema 开关——应完全自动（官网=true，其它=false），用户不需要选。
4. **应自动默认的**：
   - 视角：按 `workspace_type.meta.defaultPerspective` 自动设（已有数据，未使用）。
   - 来源策略：默认 `mark_missing_sources`（已是这样），不展示。
   - 输出长度：默认 `standard`，不展示。
   - Schema：按平台自动（`resolveNeedSchema` 已实现），删除开关。
5. **只在点击后显示**：是，保持折叠。但展开后应只保留「品牌事实选择器」一项（可选高级用法），其余全部自动默认并隐藏。

---

## 9. 推荐最终流程

**推荐方案 C：单页工作台（编辑器 + 右侧操作卡）。**

### 9.1 页面结构

```text
┌─────────────────────────────────────────────────────┐
│ TopBar：面包屑 + H1「文章工作台」                     │
├──────────────────────────────┬──────────────────────┤
│ 左侧主区域（编辑器）           │ 右侧操作卡（sticky）  │
│                              │                      │
│ 导入方式 Tab：粘贴/上传/链接   │ 生成目标             │
│ ┌──────────────────────────┐ │  平台 chip 多选       │
│ │ 文章标题 Input            │ │  （按 wsType 默认）   │
│ ├──────────────────────────┤ │                      │
│ │ 正文 Textarea / 预览切换  │ │ [先诊断]  次按钮     │
│ │ （编辑/预览 Tab）         │ │ [生成内容包] 主按钮   │
│ │                          │ │                      │
│ │ 实时字数统计              │ │ 高级设置 ▼ 折叠      │
│ └──────────────────────────┘ │  （仅品牌事实选择器） │
│                              │                      │
│ 文件上传提示（条件）          │ 知识库提示（compact） │
└──────────────────────────────┴──────────────────────┘
```

### 9.2 交互细节

| 时机 | 用户看到什么 |
| --- | --- |
| **第一屏** | 左：空标题 + 空 Textarea + 导入 Tab + 字数「0 字」；右：平台（已按 wsType 默认勾选）+ 生成按钮（disabled，灰） |
| **粘贴文章后** | 左：实时字数统计出现；右：生成按钮 enabled 变主色 |
| **上传 docx 后** | 左：标题自动填入（可编辑）+ 正文填入 + 字数统计 + 「已导入文件」提示；右：生成按钮 enabled |
| **点「先诊断」** | 左侧正文区上方展开诊断结果面板（不离开当前页）；生成按钮始终可见 |
| **点「生成内容包」** | 直接提交，跳转结果页 |
| **字数统计** | 正文输入区下方常驻，实时更新 |
| **平台选择** | 右侧操作卡内常驻，chip 样式，hover 显示说明 |
| **高级设置** | 右侧操作卡底部折叠，默认收起，展开后仅品牌事实选择器 |

### 9.3 关键变化

- **无步骤条**：不再有 1/2/3 指示器。
- **无独立确认母稿步骤**：导入即确认，预览作为正文区的「预览」Tab。
- **无模式卡片**：诊断与生成是两个并列按钮。
- **平台在右侧**：不占主区域。
- **高级设置极简**：仅品牌事实选择器，其余全自动默认。

---

## 10. P0 最小改造方案

**不改后端、不改 API、不改数据库，仅前端交互压缩。**

| # | 改造项 | 说明 | 风险 |
| --- | --- | --- | --- |
| P0-1 | **合并「导入」与「确认母稿」** | 删除 `step='confirm'`，上传/粘贴后直接留在导入区，正文区增加「编辑/预览」Tab 切换 | 低，仅删状态 |
| P0-2 | **模式选择从独立卡片改为两按钮** | 删除 `taskMode` 卡片，改为右栏「先诊断」（次）+「生成内容包」（主）两个 CTA | 低，`taskMode` 逻辑保留但由按钮触发 |
| P0-3 | **平台选择移到右侧操作卡** | 从主区域大卡片改为右栏 chip 多选，缩短说明文案 | 低，仅 JSX 重组 |
| P0-4 | **按 workspace_type 设默认平台** | 用 `meta.defaultPlatform`（扩展为 `defaultPlatforms`）初始化 `config.platforms`，当前未使用该数据 | 低，数据已存在 |
| P0-5 | **删除冗余文案** | 删除「高级参数（P1 占位）」空折叠块；缩短平台说明；副标题简化 | 极低 |

**预期效果**：路径 A 从 5+ 点击降至 3 点击（粘贴 → 生成；可选先诊断）。

---

## 11. P1 进一步优化方案

**可涉及组件拆分，仍不改后端。**

| # | 改造项 | 说明 |
| --- | --- | --- |
| P1-1 | **单页工作台布局** | 从单栏 `max-w-3xl` 改为左右双栏（左编辑器 65% + 右操作卡 35% sticky），彻底去掉步骤条 |
| P1-2 | **右栏操作卡组件化** | 抽出 `WorkbenchActionCard`（平台 + 诊断 + 生成 + 高级设置），与 `RewriteConfigPanel` 解耦 |
| P1-3 | **docx 标题识别优化** | 上传后标题 Input 高亮提示「已自动识别标题，可修改」，而非静默填入 |
| P1-4 | **高级设置极简化** | Schema 开关删除（全自动），视角/来源策略/长度按 wsType 自动默认并隐藏，仅留品牌事实选择器 |
| P1-5 | **诊断面板内联** | 点「先诊断」后在正文区上方展开诊断结果，不跳转不遮挡生成按钮 |

---

## 12. P2 暂缓事项

**不应现在做：**

- 素材库批量导入（独立窗口，与单篇工作台无关）
- PDF 解析（依赖重，价值低）
- 公众号链接解析（合规与反爬风险）
- 自动发布（涉及平台 API 对接，复杂度高）
- 图片生成（小红书图文卡片目前是脚本，足够）
- 大规模重构（如 Project → Workspace 底层重构、RewriteTask 改名）
- 独立诊断后端 API（需新增 `POST /diagnose`，本轮约束禁止改后端）
- FAQ 结构化卡片解析（当前 Markdown 样式已够用）

---

## 13. 是否建议马上开发

**建议马上开发 P0，但限定范围。**

### 13.1 理由

- 当前三步流程对 MVP 用户偏长，**确认母稿步骤是明确摩擦点**，P0-1 删除它收益最高、风险最低。
- `taskMode` 卡片与平台大卡片占主区域过多空间，P0-2/P0-3 重组后页面立刻「工作台化」。
- P0 全部是前端 JSX/state 重组，不改数据流、不改后端、不改数据库，可在 1 个窗口内完成并验证。

### 13.2 风险控制

- 保留 `handleSubmit` / `buildPayload` / `Promise.allSettled` / 草稿暂存 / 文件上传 / mammoth 解析等所有已验证逻辑，仅改 UI 编排。
- 保留 `taskMode` state（由按钮触发，而非卡片），后续若要恢复诊断卡片成本低。
- 验收以 `npm run build` + `npx tsc --noEmit` + 功能回归（复制/导出/多平台）为准。

---

## 14. 下一轮开发窗口建议

**窗口名：Article Workbench Single-Page Compression Window**

### 14.1 范围

- 执行 P0 全部 5 项
- 可选执行 P1-3（docx 标题识别优化）与 P1-4（高级设置极简化）作为附加项

### 14.2 验收标准

1. 进入页面无步骤条，左右双栏或单栏直接可见编辑区 + 操作区
2. 粘贴正文后生成按钮 enabled，无需「确认母稿」
3. 上传 docx 后标题/正文自动填入，正文区可切换「编辑/预览」
4. 平台选择在右侧操作卡，按 workspace_type 默认勾选
5. 「先诊断」为次按钮，「生成内容包」为主按钮
6. 高级设置默认折叠，展开后仅品牌事实选择器（或保留视角/长度但默认值已按 wsType 设好）
7. 单平台/多平台任务创建逻辑不受影响
8. `npm run build` + `npx tsc --noEmit` 通过
9. 后端 API 未改、数据库未改

### 14.3 不要做

- 不做 P2 任一项
- 不做独立诊断后端 API
- 不改 RewriteResultPage（上一轮已优化排版）
- 不改 InboxPage（已收敛为素材库占位）

---

## 附录：关键代码位置索引

| 关注点 | 文件:行 |
| --- | --- |
| 三步状态机定义 | [NewRewritePage.tsx:73](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/NewRewritePage.tsx#L73) `type WorkbenchStep` |
| 状态变量集中区 | [NewRewritePage.tsx:325-344](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/NewRewritePage.tsx#L325-L344) |
| 默认平台未用 wsType | [NewRewritePage.tsx:331](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/NewRewritePage.tsx#L331) `project?.default_platform ?? '官网文章'` |
| wsType 仅用于 hint | [NewRewritePage.tsx:310,320](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/NewRewritePage.tsx#L310-L320) |
| meta.defaultPlatform 已存在未用 | [workspace.ts:33](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/common/workspace.ts#L33) |
| 确认母稿步骤（建议删除） | [NewRewritePage.tsx:786-820](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/NewRewritePage.tsx#L786-L820) |
| 模式卡片（建议改按钮） | [NewRewritePage.tsx:826-851](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/NewRewritePage.tsx#L826-L851) |
| 平台大卡片（建议移右栏） | [NewRewritePage.tsx:854-895](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/NewRewritePage.tsx#L854-L895) |
| 高级设置折叠 | [NewRewritePage.tsx:938-969](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/NewRewritePage.tsx#L938-L969) |
| RewriteConfigPanel 高级参数空占位 | [RewriteConfigPanel.tsx:211-232](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/rewrite/RewriteConfigPanel.tsx#L211-L232) |
| handleSubmit（保持不变） | [NewRewritePage.tsx:484-547](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/NewRewritePage.tsx#L484-L547) |
| 前端启发式诊断 | [NewRewritePage.tsx:219-285](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/NewRewritePage.tsx#L219-L285) |
