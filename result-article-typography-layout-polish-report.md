# 结果页正文排版与布局优化 实施报告

> 窗口：Result Article Typography & Layout Polish Window
> 日期：2026-06-29
> 范围：优化改写结果页正文阅读体验，让改写后文章更像正式可交付稿件

---

## 1. 修改了哪些文件

本轮共修改 **4 个前端文件**，未触碰任何后端 / 数据库 / Prompt / 评分逻辑文件。

| 文件 | 改动类型 | 说明 |
| --- | --- | --- |
| `frontend/src/index.css` | 样式优化 | 重写 `.prose-apple` 排版规则，新增 `.prose-apple-compact`（紧凑）与 `.prose-apple-faq`（问答）两档变体 |
| `frontend/src/components/common/MarkdownRenderer.tsx` | 增量 | 新增 `variant` prop（article / compact / faq），优化 blockquote / table 组件样式 |
| `frontend/src/pages/RewriteResultPage.tsx` | 重写 Tab 内容 | 改写正文 Tab 加 max-w-800 容器；原文对比 Tab 双栏 + 内容规模 + max-height 滚动 + 小屏堆叠；FAQ Tab 用 faq 变体；复制按钮文案改为「复制当前正文」 |
| `frontend/src/components/rewrite/PlatformPublishGuideView.tsx` | 样式优化 | FieldCard 改为交付清单风格（圆点标题 + 14px / 1.7 行距），小红书图文卡片改为网格分卡展示，文字稿加分区 |
| `frontend/src/components/rewrite/ResultInspector.tsx` | 视觉降噪 | 弱化边框、去阴影、eyebrow 字号收敛到 12px，让正文成为视觉主角 |

后端 API、数据库、Prompt、Quality Gate、任务状态、评分逻辑均未改动。

---

## 2. MarkdownRenderer 做了哪些样式优化

### 新增 `variant` prop
```tsx
variant?: 'article' | 'compact' | 'faq'
```
- `article`（默认）：正文阅读，16px / 行距 1.85
- `compact`：原文对比等紧凑场景，14.5px / 行距 1.75
- `faq`：问答模块，问题加粗 + 顶部分隔线

### `.prose-apple` 基础排版规范（index.css）

| 元素 | 旧值 | 新值 |
| --- | --- | --- |
| 正文字号 | 15px | **16px** |
| 正文行距 | 1.7 | **1.85** |
| 段落下间距 | 0.8em | **16px** |
| H2 字号 | 1.5em | **1.375em（~22px）** |
| H2 字重 | 600 | **700** |
| H2 行距 | 1.2 | **1.35** |
| H3 字号 | 1.25em | **1.125em（~18px）** |
| H3 字重 | 600 | **650** |
| 列表 padding-left | 1.4em | **22px** |
| li 间距 | 0.3em | **8px** |
| 列表行距 | 继承 | **1.8** |
| blockquote | 仅左边框 | **左边框 + 浅底 + 圆角 8px** |
| blockquote 内 p | 默认 | **my-0，仅段间 8px** |
| table 字号 | 0.9em | **14px** |
| table 滚动 | 无 | **外层 overflow-x-auto 横向滚动** |
| strong | 继承 | **字重 650 + 主文本色** |

### 组件级增强（MarkdownRenderer.tsx）
- `blockquote`：`border-l-2 border-primary/60 bg-primary/5` 圆角 + 浅底，更像核心结论卡片
- `table`：外层 `overflow-x-auto rounded-md border`，避免撑破页面
- 移除了 H2 顶部硬边框（改由 margin-top 控制章节间距，更自然）

---

## 3. 改写正文区域如何优化

[NewRewritePage → RewriteResultPage Tab 1](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/RewriteResultPage.tsx)

- **阅读宽度限制**：正文外层包 `<div className="mx-auto max-w-[800px]">`，不再横跨整个 65% 主区域
- **卡片内边距**：`p-6 sm:p-8`，大屏更舒展
- **头部条**：eyebrow + 「复制当前正文」按钮（轻量复制，位于正文卡片右上角，不重复顶部操作区的复制）
- **正文样式**：使用默认 `variant="article"`（16px / 1.85 行距 / H2 22px 700）
- **污染提示**：保留原有 `articlePolluted` 警告条，位置不变

满足验收：正文宽度 ≤ 820px、字号 ≥ 16px、行距舒适、H2/H3 层级明显、段落间距清晰。

---

## 4. 原文对比区域如何优化

[Tab 2 原文对比](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/RewriteResultPage.tsx)

### 双栏布局
- `grid grid-cols-1 gap-5 md:grid-cols-2`：小屏上下排列，md 以上左右双栏，栏间 gap 5（20px）
- 每栏独立 `Card`，`flex flex-col` 保证头部固定 + 正文滚动

### 标题区 + 内容规模
每栏头部展示：
- eyebrow（原文 / 改写后）+ 状态标记（「未改写」/ 复制按钮）
- 内容规模行：`formatMetricsLine`（字数 · 段落 · 标题数 · 预计阅读时长）
- 改写后栏额外显示字符变化百分比（`charDeltaPercent`，正数绿色）

### 正文滚动
- 每栏正文 `max-h-[640px] overflow-y-auto pr-1`，长文章不撑破页面，栏内独立滚动
- 使用 `variant="compact"`（14.5px / 1.75 行距），比正文略小但可读

### 改写摘要
保留底部独立 Card，与双栏分离，不再拥挤。

满足验收：两栏不拥挤、小屏上下排列、内容规模可见、字号可读。

---

## 5. FAQ / 发布建议区域如何优化

### FAQ Tab（Tab 3）
- 外层 `<div className="mx-auto max-w-[800px]">` 限制宽度
- 使用 `variant="faq"`，启用 `.prose-apple-faq` 样式：
  - H3（问题）字号 1.05em / 字重 700 / 主文本色
  - 每个 FAQ item 之间 `padding-top: 16px` + `border-top` 分隔线
  - 首个 item 无分隔线（`first-child`）
  - 问题与答案之间间距 8px
- P0 仅优化 Markdown 样式，未解析为结构化 FAQ 卡片（符合约束）

### 发布建议 / 小红书图文脚本（PlatformPublishGuideView）
[PlatformPublishGuideView.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/rewrite/PlatformPublishGuideView.tsx)

- **FieldCard 升级为交付清单风格**：标题前加圆点（`h-1 w-1 rounded-full bg-primary/60`）+ 字重 semibold + 字号 11px uppercase；正文 14px / 行距 1.7
- **小红书图文卡片**：从纵向 `space-y-2` 改为 `grid sm:grid-cols-2`，每张卡片独立边框 + hover 高亮，标题加粗 13px
- **图片文字稿合集**：加分区（`bg-secondary/20` + 左边框 + padding），每条独立块，不再挤在一起
- **所有模块标题**：统一圆点 + semibold uppercase 风格，与 FieldCard 一致
- Caption、标签、话题、风险提示各自独立 FieldCard，分区清晰

满足验收：FAQ 可读性提升、发布建议更像交付清单、小红书卡片单独显示。

---

## 6. 右侧评分面板是否调整

[ResultInspector.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/rewrite/ResultInspector.tsx)

**是，做了视觉降噪：**
- aside 容器加 `[&_.text-eyebrow]:text-[12px]`，统一所有子模块 eyebrow 字号到 12px（避免与正文 eyebrow 抢视觉）
- 待补充事实 Card：`border-border/60 bg-card shadow-none`，弱化边框 + 去阴影
- 待补充事实列表项：从 `bg-secondary/40` 改为 `border border-border/50 bg-background`，更克制
- 保留原有 PlatformScorecard / StrategyList / SourceGapList 组件，未改其内部逻辑

**目标达成**：正文是主角（16px / 800px / 强标题层级），评分面板是辅助（弱边框 / 无阴影 / 小字号）。

---

## 7. 是否改了后端 API

**否。** 本轮未触碰 `backend/**` 任何文件。仅修改前端样式与布局，所有数据流（useTaskDetail / useRewriteOutputs / useOutputDetail / useTaskStatus）不变。

---

## 8. 是否改了数据库

**否。** 未新增任何数据库字段，未改 `models/**` / `schemas/**`。

---

## 9. 是否影响复制 / 导出 / 重新优化

**否，均不受影响：**
- **复制正文**：顶部操作区 CopyButton + 正文 Tab 内「复制当前正文」按钮均正常，复制内容仍为 `output.final_article`
- **导出 Markdown**：ExportButton 未改动，导出逻辑不变
- **重新优化**：`handleRerewrite` / `regenerateMut` 未改动
- **多平台结果**：MultiPlatformResultPage 未改动（仅文案在上一轮已改为「内容包」）
- **任务状态轮询**：useTaskStatus 逻辑不变

所有功能逻辑零改动，仅排版与视觉调整。

---

## 10. 构建验证结果

| 验证项 | 结果 |
| --- | --- |
| `npx tsc --noEmit` | ✅ exit 0 |
| `npm run build` | ✅ 2877 modules，5.48s |
| CSS 体积 | 40.45 KB → 42.51 KB（+2 KB，新增 compact/faq 变体） |
| JS 体积 | 1,560 KB → 1,562 KB（+2 KB，variant prop + 容器 div） |
| 后端 API | 未改 ✅ |
| 数据库 | 未改 ✅ |

---

## 11. 仍存在的问题

1. **表格 `display: block` hack**：为让 table 横向滚动用了 `display:block + overflow-x:auto`，子元素 `display:revert` 恢复。对极宽表格有效，但在某些浏览器下表格宽度计算可能略有不一致。已用组件级 `overflow-x-auto` 外层容器作为更稳妥的兜底。
2. **FAQ 仍依赖 Markdown 结构**：若 LLM 输出的 FAQ 未用 H3 作为问题标题，faq 变体的分隔线样式不会生效。P0 未做结构化解析，符合约束。
3. **右侧 PlatformScorecard 未内部降噪**：本轮只调整了 ResultInspector 外层与待补充事实卡片，PlatformScorecard / StrategyList / SourceGapList 内部样式未深入调整，避免触动评分展示逻辑。
4. **正文 max-w-800 在超宽屏可能偏窄**：2560px 屏幕下 800px 居中会留大量白边，但符合「舒适阅读宽度」优先的原则。
5. **chunk 体积告警**：主 chunk 1.56 MB（与上一轮引入 mammoth 有关），本轮未恶化。

---

## 12. 下一步建议

### 优先级 P1
1. **PlatformScorecard 内部降噪**：统一雷达图 / 条形图高度，弱化卡片边框，与正文区域视觉权重进一步拉开。
2. **FAQ 结构化解析**：将 `faq_content` 解析为 `{ question, answer }[]` 结构化卡片，彻底脱离 Markdown 堆叠，支持折叠展开。
3. **正文目录侧边栏**：长文章（>2000 字）在正文左侧生成 H2/H3 锚点目录，点击跳转。

### 优先级 P2
4. **正文阅读模式**：增加「沉浸阅读」按钮，隐藏 Inspector 与 Tabs，正文全屏居中 800px。
5. **打印样式**：`@media print` 优化导出 PDF 时的分页与字号。
6. **代码块主题**：pre 增加 light/dark 主题切换，当前固定深色。
