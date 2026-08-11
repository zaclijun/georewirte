# Result Context + Quality Gate + Content Metrics 报告

> 本轮目标：修复结果页与历史任务之间的上下文逻辑、分数降低解释、字数统计和交付就绪度。
>
> 完成时间：2026-06-26
> 实现范围：纯前端改造，不动后端 API / 数据库 / Prompt / LLMService / 多平台发稿包逻辑。

---

## 1. 修改了哪些文件

### 新增文件

| 文件 | 作用 |
| --- | --- |
| `frontend/src/lib/contentMetrics.ts` | 内容规模统计库：字数 / 段落 / 标题 / 阅读时长 |
| `frontend/src/lib/qualityGate.ts` | 质量闸门判断 + 降分维度分析 + 文章污染检测 |
| `frontend/src/components/common/CopyButton.tsx` | 通用模块级复制按钮（成功反馈 1.8s） |

### 修改文件

| 文件 | 关键变更 |
| --- | --- |
| `frontend/src/pages/RewriteResultPage.tsx` | from=history 模式检测、TaskContextBar、ResultHeroBand 增加 Quality Gate + 内容规模、ScoreDeclineExplainer 降分解释卡、各 Tab 加 CopyButton |
| `frontend/src/pages/HistoryPage.tsx` | 查看 Link 加 `?from=history`、负分 pill 分级（<-3 destructive / -3~-0 warning）、completed 且 delta<0 显示「分数下降」小字 |
| `frontend/src/components/common/SourceGapList.tsx` | 加 `id="source-gap"` 锚点 + `scroll-mt-20`，供「查看来源缺口」跳转 |
| `frontend/src/components/common/index.ts` | 导出 CopyButton |

**总计**：3 新增 + 4 修改 = 7 个前端文件。零后端 / 数据库 / Prompt / 多平台核心逻辑改动。

---

## 2. 历史任务进入结果页的上下文逻辑如何调整

### 旧逻辑问题

用户从 `/history` 点击任务 → 跳 `/tasks/:taskId/result` → `RewriteResultPage` 把 `task.project_id` 传给 `AppShell projectId={task.project_id}` → Sidebar 显示该工作区 → 用户感觉「被自动切换了工作区」。

### 新逻辑：History Result Mode vs Workspace Result Mode

通过 URL query `?from=history` 区分两种模式：

```tsx
const [searchParams] = useSearchParams()
const isFromHistory = searchParams.get('from') === 'history'

// History Result Mode：不传 projectId 给 AppShell，Sidebar 显示「选择工作区」
// Workspace Result Mode：传 projectId，Sidebar 显示当前工作区
const shellProjectId = isFromHistory ? undefined : task?.project_id
```

### 两种模式对比

| 项目 | History Result Mode（from=history） | Workspace Result Mode（默认） |
| --- | --- | --- |
| Sidebar | 显示「选择工作区」引导卡 | 显示当前工作区 + 子菜单 |
| 面包屑 | ← 历史任务 | ← {工作区名} |
| 顶部任务来源行 | 显示「所属工作区：xxx」+「进入工作区」按钮 | 仅显示元信息 |
| 「进入工作区」按钮 | 有，跳 `/projects/:projectId` | 无（已在工作区内） |

### HistoryPage 改造

所有从 HistoryPage 跳转结果页的 Link 都加了 `?from=history`：

```tsx
// 标题点击
<Link to={`/tasks/${t.id}/result?from=history`}>
// 查看按钮
<Link to={`/tasks/${t.id}/result?from=history`}>
```

---

## 3. 是否避免自动切换 lastActiveProjectId

**是，已避免。**

### 根因分析

`useCurrentProjectId`（在 [projectContext.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/lib/projectContext.ts)）通过 `parseProjectIdFromPath(location.pathname)` 解析 URL，仅匹配 `/projects/:projectId` 模式：

```ts
const m = pathname.match(/^\/projects\/([^/]+)(?:\/.*)?$/)
```

结果页 URL 是 `/tasks/:taskId/result`，不匹配上述正则 → `parseProjectIdFromPath` 返回 `null` → `useEffect` 不写入 localStorage。

**结论**：即使不本轮改造，`lastActiveProjectId` 也不会因查看历史任务被覆盖。本轮改造的是**视觉层面**的「Sidebar 显示哪个工作区」—— 通过 `shellProjectId` 控制 AppShell 的 `projectId` prop，让 History Result Mode 下 Sidebar 不显示任务所属工作区，避免用户误以为被切换。

### 验证

- 进入 `/tasks/:taskId/result?from=history` → Sidebar 显示「选择工作区」引导卡
- `localStorage.getItem('lastActiveProjectId')` 保持原值不变
- 点击「进入工作区」→ 跳 `/projects/:projectId` → 此时 URL 匹配 → `useCurrentProjectId` 才同步 localStorage

---

## 4. Quality Gate 如何判断

### 判断函数

[qualityGate.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/lib/qualityGate.ts) 中 `getQualityGate`：

```ts
function getQualityGate(scoreBefore, scoreAfter, reviewStatus, missingSources, pollutionDetected) {
  if (pollutionDetected) return 'blocked'
  if (scoreAfter < scoreBefore - 8) return 'not_recommended'
  if (scoreAfter < scoreBefore - 3) return 'degraded'
  if (scoreAfter <= scoreBefore + 2) return 'review'
  if (missingSources?.length > 0 && scoreAfter < 85) return 'review'
  return 'ready'
}
```

### 五种状态

| 状态 | 标签 | 颜色 | 触发条件 |
| --- | --- | --- | --- |
| `ready` | 可使用 | success | after > before + 2 且无其他问题 |
| `review` | 建议复核 | warning | after ≤ before + 2，或 after<85 且有来源缺口 |
| `degraded` | 分数下降，需检查 | warning | after < before - 3 |
| `not_recommended` | 不建议直接发布 | destructive | after < before - 8 |
| `blocked` | 正文异常，需修复 | destructive | 检测到 FAQ/Schema/免责声明 混入正文 |

### 关键设计：task.status ≠ 交付质量

- `task.status === 'completed'` 仅代表任务执行完成
- `ready/review/degraded/not_recommended/blocked` 是交付质量状态
- 两者独立判断，即使 task completed 也可能显示「分数下降，需检查」

### 文章污染检测

`detectArticlePollution` 检测以下模式混入 `final_article`：

```ts
const POLLUTION_PATTERNS = [
  '## FAQ', '## 常见问题', '## 律师简介', '## 律所简介',
  '## 品牌简介', '## 免责声明', '## Schema', 'Q1', 'Q2', 'Q3',
]
```

---

## 5. 分数下降如何展示

### 降分解释卡 ScoreDeclineExplainer

当 `getScoreDelta(output) < 0` 时显示：

```
⚠ 为什么分数下降？

本次改写后综合评分下降 4 分。常见原因包括：
• 原文本身质量较高，改写空间有限；
• 改写为适配平台阅读，可能压缩了部分事实和来源信息；
• 部分关键实体、数据或来源在改写后弱化；
• 当前版本仍缺少可验证来源或结构化依据。

下降维度：（如 dimensions 存在）
• 事实密度：95 → 88（-7）
• 来源可信度：90 → 80（-10）
• AI 触发覆盖：92 → 86（-6）

[重新优化一版]  [保留原文，仅使用发布建议]  [查看来源缺口]
```

### 操作按钮

| 按钮 | 行为 | 状态 |
| --- | --- | --- |
| 重新优化一版 | 复用 `useRegenerateOutput`（与顶部「重新改写」同一接口） | 可用 |
| 保留原文，仅使用发布建议 | disabled，title="后续能力，本轮暂未实现" | 禁用 |
| 查看来源缺口 | 锚点跳转 `#source-gap`（SourceGapList 已加 id） | 可用 |

### 维度下降分析

`getTopDeclinedDimensions` 对比 `score_before.dimensions` 与 `score_after.dimensions`，返回下降最多的 3 个维度（按 delta 升序）。如后端未返回 dimensions，则不显示该区块，仅显示通用解释。

### Hero Band 评分 pill 颜色调整

旧版：delta<0 一律 `destructive`（红）
新版：分级显示
- delta > 0：`success`（绿）
- delta < -3：`destructive`（红）
- -3 ≤ delta < 0：`warning`（橙）

---

## 6. 内容规模统计如何实现

### 统计库

[contentMetrics.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/lib/contentMetrics.ts)，纯前端实现，不依赖后端新增字段。

### 统计字段

```ts
interface ContentMetrics {
  charCount: number              // 去多余空白后总字符数
  chineseCharCount: number       // CJK 字符数
  englishWordCount: number       // 英文单词数
  paragraphCount: number         // 段落数（按空行分割）
  headingCount: number           // markdown 标题数（# ~ ######）
  estimatedReadingMinutes: number // 预计阅读时长（中文 400 字/min，英文 200 words/min，最少 1）
}
```

### 显示位置

**ResultHeroBand 内**（评分卡下方）：

```
内容规模
原文：1,842 字 · 12 段 · 4 个标题 · 预计 5 分钟
改写后：2,316 字 · 18 段 · 7 个标题 · 预计 6 分钟
变化：+474 字 · +25.7%
```

**原文对比 Tab 两栏顶部**：

```
原文 · 1,842 字 · 12 段          改写后 · 2,316 字 · 18 段  [复制]
```

### 篇幅异常提醒

- 字数减少 > 30%：「改写后篇幅减少较多，请检查是否删减了关键事实、数据或来源。」
- 字数增加 > 80%：「改写后篇幅增加较多，请检查是否存在冗余表达。」

---

## 7. 模块级复制如何实现

### CopyButton 组件

[CopyButton.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/common/CopyButton.tsx)：

- 使用 `navigator.clipboard.writeText`，失败 fallback 到 `execCommand`
- 成功后 1.8s 显示「已复制」反馈
- 不引入新依赖，复用 `lib/utils` 的 `copyToClipboard`

### 应用位置

| 模块 | 复制内容 | 位置 |
| --- | --- | --- |
| 改写正文 | `output.final_article` | 改写正文 Tab 卡片顶部 |
| FAQ | `stripFaqHeader(output.faq_content)` | FAQ Tab 卡片顶部 |
| Schema / 发布建议 | `schemaJson`（已有「复制 JSON」按钮） | Schema Tab 卡片顶部 |
| 原文对比 - 改写后 | `output.final_article` | 对比 Tab 右栏顶部 |
| 原文对比 - 原文 | 无（规范未要求） | — |

### 顶部「复制正文」保留

TopBar 右侧的「复制正文」按钮保留不变（复制整篇正文，与模块级复制互补）。

---

## 8. 历史任务列表负分如何展示

### 旧版

delta<0 一律 `destructive`（红色 pill），无额外提示。

### 新版

**提升列 pill 分级**：

```tsx
variant={
  delta > 0 ? 'success'          // 绿
  : delta < -3 ? 'destructive'   // 红（明显下降）
  : delta < 0 ? 'warning'        // 橙（轻微下降）
  : 'muted'                      // 灰（持平）
}
```

**状态列附加提示**：

当 `t.status === 'completed' && delta < 0` 时，在 RewriteStatusBadge 下方显示小字「分数下降」：

```tsx
<div className="flex flex-col gap-0.5">
  <RewriteStatusBadge status={t.status} />
  {t.status === 'completed' && delta !== null && delta < 0 && (
    <span className="text-[10px] text-warning">分数下降</span>
  )}
</div>
```

---

## 9. 是否改了后端 API

**否。**

本轮零后端改动。所有数据均来自现有 API：

| 数据 | 来源 API |
| --- | --- |
| 任务详情 | `GET /api/tasks/:taskId`（已有） |
| Output 详情 | `GET /api/outputs/:outputId`（已有） |
| Project 信息 | `GET /api/projects/:projectId`（已有） |
| 重新生成 | `POST /api/outputs/:id/regenerate`（已有） |
| 重试任务 | `POST /api/tasks/:id/retry`（已有） |

内容规模统计、Quality Gate 判断、维度下降分析全部在前端纯函数实现，不调用后端。

---

## 10. 是否改了数据库

**否。**

未新增表、字段、索引、迁移。所有改动均在 `frontend/src/` 目录内。

---

## 11. 验收结果

### A. 历史任务进入结果页

| 验收项 | 状态 | 说明 |
| --- | --- | --- |
| 1. 不自动切换当前工作区 | ✅ | `shellProjectId = isFromHistory ? undefined : task.project_id` |
| 2. 显示「所属工作区：xxx」 | ✅ | TaskContextBar 顶部信息行 |
| 3. 有「进入工作区」按钮 | ✅ | History Mode 专属，跳 `/projects/:projectId` |
| 4. 点击后才跳转工作区 | ✅ | 按钮才跳转，查看结果页本身不跳 |
| 5. lastActiveProjectId 不被覆盖 | ✅ | `useCurrentProjectId` 仅匹配 `/projects/:id` URL |

### B. 分数下降

| 验收项 | 状态 | 说明 |
| --- | --- | --- |
| 1. 顶部显示「发布就绪度：分数下降，需检查」 | ✅ | Quality Gate degraded 状态 |
| 2. 显示降分解释卡 | ✅ | ScoreDeclineExplainer |
| 3. delta=-4 不用绿色 | ✅ | 用 warning（橙），delta<-3 用 destructive（红） |
| 4. 提供「重新优化/查看来源缺口」操作 | ✅ | 三个按钮（含一个 disabled） |
| 5. 历史列表负分用橙/红 | ✅ | 分级 pill + 「分数下降」小字 |

### C. 内容规模统计

| 验收项 | 状态 | 说明 |
| --- | --- | --- |
| 1. 显示原文和改写后字数 | ✅ | ResultHeroBand 内容规模区 |
| 2. 显示段落、标题、阅读时长 | ✅ | `formatMetricsLine` |
| 3. 显示字数变化和百分比 | ✅ | `formatCharDelta` |
| 4. 原文对比 Tab 两栏显示字数 | ✅ | `formatMetricsShort` |
| 5. 减少>30% 显示提示 | ✅ | `charDeltaPercent < -30` |
| 6. 增加>80% 显示提示 | ✅ | `charDeltaPercent > 80` |

### D. 模块复制

| 验收项 | 状态 | 说明 |
| --- | --- | --- |
| 1. 改写正文可复制 | ✅ | 改写正文 Tab CopyButton |
| 2. FAQ 可复制 | ✅ | FAQ Tab CopyButton |
| 3. Schema/发布建议可复制 | ✅ | 已有「复制 JSON」按钮 |
| 4. 对比改写后可复制 | ✅ | 对比 Tab 右栏 CopyButton |
| 5. 复制成功有反馈 | ✅ | 1.8s「已复制」反馈 |

### E. 构建

| 验收项 | 状态 | 说明 |
| --- | --- | --- |
| 1. npm run build 通过 | ✅ | 3.04s，2872 modules，零错误 |
| 2. npx tsc --noEmit 通过 | ✅ | 零类型错误 |
| 3. 多平台发稿包逻辑不受影响 | ✅ | 零核心逻辑改动 |

---

## 12. 仍存在的问题

### 1. 「保留原文，仅使用发布建议」未实现

规范允许 P0 不实现真实操作。当前为 disabled 按钮 + title 提示「后续能力，本轮暂未实现」。

### 2. 维度下降分析依赖后端 dimensions 数据

`getTopDeclinedDimensions` 需要 `score_before.dimensions` 与 `score_after.dimensions` 都存在且 name 对齐。如后端未返回 dimensions 或 name 不一致，则不显示该区块，仅显示通用解释。

**影响**：取决于后端 LLM 是否稳定输出 dimensions。如后端偶尔不返回，降分解释卡仍可用，只是少一个区块。

### 3. 阅读时长估算为粗略值

中文 400 字/min、英文 200 words/min 是行业常用估算，但实际阅读速度因内容难度、读者背景差异较大。估算值仅作参考。

### 4. 字数统计含 markdown 语法字符

`charCount` 是去多余空白后的总字符数，含 `#`、`*`、`-` 等 markdown 语法字符。如需纯正文字数，需进一步剥离 markdown 语法（本轮未做，避免过度工程）。

### 5. History Result Mode 下无法直接访问工作区子菜单

History Result Mode 下 Sidebar 显示「选择工作区」引导卡，用户无法直接点击「知识库 / 素材箱 / 生成发稿包」。需先点击「进入工作区」按钮跳转后才能访问。

**设计意图**：避免用户误以为查看历史任务 = 切换工作区。如需访问工作区子菜单，明确点击「进入工作区」是合理的设计选择。

### 6. 锚点跳转在 sticky 布局下可能被遮挡

「查看来源缺口」使用 `<a href="#source-gap">`，SourceGapList 加了 `scroll-mt-20` 缓解 sticky TopBar 遮挡。如 TopBar 高度变化，可能需调整 scroll-mt 值。

---

## 13. 下一步建议

### P1：实现「保留原文，仅使用发布建议」

可新增一个 output version，`final_article` 直接使用 `task.original_content`，但仍保留 `optimization_strategy` / `missing_sources` / `schema_suggestions` 等诊断信息。需后端支持或前端构造虚拟 output。

### P2：维度下降分析的稳定性

与后端约定 `score_before/after.dimensions` 的 name 规范，确保前后版本可对齐。如后端 LLM 输出不稳定，可考虑在前端做 name 归一化（如「事实密度」/「Fact Density」映射）。

### P3：纯正文字数统计

如客户反馈字数含 markdown 语法字符不准，可在 `contentMetrics.ts` 增加 `stripMarkdown` 函数，剥离 `#`/`*`/`-`/链接/图片等语法，统计纯文本字数。

### P4：History Result Mode 增加「返回历史」快捷入口

当前面包屑已是「← 历史任务」，但如用户在结果页停留较久，可在 TopBar 右侧增加一个「返回历史」按钮。

### P5：Quality Gate 配置化

当前 Quality Gate 阈值（-3 / -8 / 85）硬编码在 `qualityGate.ts`。如需按工作区类型或客户偏好调整，可抽取为配置。

---

## 附录：本轮关键文件清单

```
frontend/src/lib/contentMetrics.ts                       [新增]
frontend/src/lib/qualityGate.ts                          [新增]
frontend/src/components/common/CopyButton.tsx            [新增]
frontend/src/pages/RewriteResultPage.tsx                 [修改]
frontend/src/pages/HistoryPage.tsx                       [修改]
frontend/src/components/common/SourceGapList.tsx         [修改]
frontend/src/components/common/index.ts                  [修改]
```

**总计**：3 新增 + 4 修改 = 7 个前端文件。零后端改动。零数据库改动。零多平台发稿包逻辑改动。

---

## 验收清单对照

| 验收项 | 状态 |
| --- | --- |
| A.1 不自动切换工作区 | ✅ |
| A.2 显示所属工作区 | ✅ |
| A.3 有进入工作区按钮 | ✅ |
| A.4 点击后才跳转 | ✅ |
| A.5 lastActiveProjectId 不被覆盖 | ✅ |
| B.1 顶部显示分数下降需检查 | ✅ |
| B.2 降分解释卡 | ✅ |
| B.3 delta=-4 不用绿色 | ✅ |
| B.4 重新优化/查看来源缺口 | ✅ |
| B.5 历史列表负分橙/红 | ✅ |
| C.1 原文/改写后字数 | ✅ |
| C.2 段落/标题/阅读时长 | ✅ |
| C.3 字数变化和百分比 | ✅ |
| C.4 对比 Tab 两栏字数 | ✅ |
| C.5 减少>30% 提示 | ✅ |
| D.1 改写正文可复制 | ✅ |
| D.2 FAQ 可复制 | ✅ |
| D.3 Schema 可复制 | ✅ |
| D.4 对比改写后可复制 | ✅ |
| D.5 复制成功反馈 | ✅ |
| E.1 npm run build 通过 | ✅ |
| E.2 npx tsc --noEmit 通过 | ✅ |
| E.3 多平台发稿包不受影响 | ✅ |

**本轮交付完成。**
