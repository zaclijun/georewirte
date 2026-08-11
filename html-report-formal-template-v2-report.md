# HTML 报告正式模板 v2 改写说明

本文件记录将 `frontend/src/lib/exportHtml.ts` 从「网页风结果页」整体改写为「A4 风格正式交付报告（GEO 内容优化报告 / 内容质检报告）」的全部细节。本次为单文件改写，未触碰后端、数据库、Prompt、评分逻辑或结果页 UI。

---

## 1. 参考第二份报告做了哪些结构调整

整体从「卡片堆叠 + 渐变 Hero + 左右全文对比」的结构，重构为「单栏 A4 报告 + 分隔线分区 + 结论先行」的结构：

- 移除：`.report-shell` 外壳、`.report-cover` 渐变 Hero、`.eyebrow`、`.report-subtitle`、`.meta-pills`/`.meta-pill` 胶囊、`.section-card` 大圆角阴影卡、`.kpi-grid`/`.kpi-card`、`.article-compare-grid`/`.article-col` 左右对比、旧 `.dimension-item` 表格样式。
- 新增：`.report` 单容器、`.report-header` 报告头、`.section` 分隔线分区、`.summary-grid` 5 卡片摘要、`.score-hero` 评分英雄区、`.suggestion-item` 建议卡、合并后的「待补证据与风险」、带复制按钮的「终稿正文」、`.muted-article` 灰色「原始素材」。
- 区块顺序重排为：报告头 → 发布检查摘要 → 评分诊断 → 主要优化建议 → 待补证据与风险 → 终稿正文 → 原始素材 → FAQ/发布建议 → 免责声明 → Footer。
- 章节之间用 1px 分隔线（`.section` 的 `border-top`）区分，首段无分隔线（`.section:first-of-type`），不再用大阴影卡片包裹。

## 2. Header 如何改造

- 删除旧版渐变 Hero（`.report-cover` + eyebrow + subtitle + meta-pills）。
- 新建 `.report-header`：`display:flex; align-items:flex-start; justify-content:space-between; gap:24px; padding-bottom:18px; border-bottom:3px solid var(--report-accent)`。
- 左侧 `.report-header-left`：`.report-kicker`（蓝色、12px、760、大写字距 1.5px，文案「GEO 内容优化报告」）→ `<h1>` 标题（`output.title || task.title || '未命名任务'`）→ `.meta` 行（13px、#64748b，内容为「工作区 · 内容资产类型 · 生成日期」用 ` · ` 连接）。
- 右侧 `.logo-fallback`：18px、760、蓝色、字距 .02em，文案「GEO」。
- 已下线平台的 `.deprecated-note` 不再放头部，改放在 Footer 前；头部 meta 中 assetTypeDisplay 仍按原逻辑对已下线平台显示「历史内容资产」。

## 3. 发布检查摘要如何实现

- 作为首个内容区块（紧跟 Header），`h2`「发布检查摘要」。
- `.summary-grid`（`grid-template-columns: repeat(5,1fr); gap:12px`）渲染 5 张 `.summary-card`：
  1. 发布状态：`gateMeta.title`，文字着色用 `gateClass(gate)`（ready 绿 / review、degraded 琥珀 / blocked 红）。
  2. 终稿评分：`afterScore`，无则「—」。
  3. 评分变化：`delta`，正数带 `+`，按正/负/零分别用 `delta-up`/`delta-down`/`delta-flat` 着色（绿/红/灰），无则「—」。
  4. 待补来源：`missingSources.length`。
  5. 质量状态：`gateMeta.title`（与发布状态一致），同样着色。
- 每卡片含 `.summary-label`（11px、#64748b）与 `.summary-value`（20px、700、#0f172a）。
- 网格下方 `.two-col`（1fr 1fr）放两个 `.mini-panel`：
  - 左「为什么是这个状态」：按 gate 生成原因（ready→质量门禁通过可发布；review/degraded→存在待补来源或评分未达标建议复核；blocked/not_recommended→质量门禁未通过不建议发布）；若 `missingSources.length>0` 追加「仍有 N 项来源缺口」；若 `!hasScore` 追加「暂无评分数据」。
  - 右「主要优化点」：取 `optimizationStrategy` 前 5 条 `issue`，空则「暂无明显优化建议」。
- 移动端（max-width:860px）`.summary-grid` 变 2 列、`.two-col` 变 1 列。

## 4. Score Hero 如何实现

- 新增 `renderScoreHero(score, variant)` 辅助函数：
  - 无分数（null/undefined 或 overall 非数字）→ `<p class="empty">暂无评分数据</p>`。
  - 有分数 → `.score-hero`（带 `before`/`after` 类区分）：
    - `.score-hero-head`：`.score-big`（44px、800；before 用 #475569 灰，after 用 `var(--report-accent)` 蓝）显示 overall；`.score-grade` 徽章显示字母等级。
    - `.score-bars`：每个维度渲染 `.dim-item`，含 `.dim-head`（维度名 + 分数 + 小号字母等级徽章）、`.score-bar`（6px 高、#e5e7eb 底、999px 圆角）+ `.score-bar-fill`（宽度=分数%，before 用灰渐变 `#94a3b8→#475569`，after 用蓝渐变 `#60a5fa→var(--report-accent)`）、`.dim-comment`（12px、#64748b）。
- 新增 `gradeFor(score)`：90+→A、80-89→B、70-79→C、60-69→D、<60→E；`gradeClass(grade)` 返回 `grade-a`…`grade-e`，对应配色（A 绿 / B 蓝 / C 琥珀 / D 橙 / E 红）。
- 评分诊断区块：`h2`「评分诊断」+ `.section-desc`（`scoreConfig.title · scoreConfig.subtitle`，复用平台评分卡配置）。桌面端 `.score-hero-grid`（1fr 1fr）左右并排，左列标签「初稿评分」渲染 `renderScoreHero(output.score_before,'before')`，右列标签「终稿评分」渲染 `renderScoreHero(output.score_after,'after')`；两者都无分数时整段显示「暂无评分数据」。移动端变 1 列。

## 5. 优化建议如何提前

- 「主要优化建议」从原来的正文对比之后，提前到「评分诊断」之后、「待补证据与风险」之前。
- 渲染 `optimizationStrategy`，每条为 `.suggestion-item`（1px 边、10px 圆角）：`.suggestion-head` 含优先级 `.badge`（high→`badge-high` 红、medium→`badge-mid` 琥珀、low→`badge-low` 绿，文案 高/中/低）+ `.suggestion-issue`（15px、600）；`.suggestion-action`（14px）；有 evidence 时追加 `.suggestion-evidence`（13px、虚线上边框）。
- 空列表 → `<p class="empty">暂无优化建议</p>`。

## 6. 来源缺口和待补事实如何合并

- 合并为单个区块「待补证据与风险」（`h2`），下设两个 `h3` 子段。
- 「来源缺口」：有数据用 `<ul class="risk-list">`，每条 `<li>` 为 callout 风格（#fffbeb 底、4px 左边框 #f59e0b、8px 圆角、#92400e 文字）；空则「暂无明显来源缺口」。
- 「待补充事实」：有数据每条为 `.fact-item`（含 `.fact-title`、`.fact-meta` 类型、`.fact-content` 经 `renderMarkdownLikeHtml` 渲染、`.fact-reason` 琥珀色原因）；空则「暂无待补充事实」。
- 这样把原本两个独立卡片的「风险类信息」聚合成一处，便于客户一眼看到所有待补项。

## 7. 终稿正文 / 原始素材顺序如何调整

- 旧版是左右并排对比（`.article-compare-grid`），新版完全移除该结构。
- 新顺序为纵向：先「终稿正文」，后「原始素材 / 初稿」。
- 「终稿正文」用 `.section-head`（flex、space-between）放 `h2` 与复制按钮；正文用 `.article-body` 渲染 `renderMarkdownLikeHtml(cleanedArticle)`。
- 「原始素材 / 初稿」用 `.article-body.muted-article`（#64748b 灰色）渲染 `renderMarkdownLikeHtml(task.original_content ?? '')`，弱化原文、突出终稿。

## 8. HTML 报告内「复制终稿正文」按钮如何实现

- 在「终稿正文」`.section-head` 内放 `<button class="copy-final-btn" data-copy-final type="button">复制终稿正文</button>`。
- 按钮样式：#bfdbfe 边、#eff6ff 底、#1d4ed8 字、999px 胶囊、12px、650 字重；hover 变 #dbeafe；`.copied` 态变绿（#bbf7d0 边、#ecfdf5 底、#047857 字）。
- 点击逻辑用内联 `<script>`（IIFE）实现：选中 `[data-copy-final]`，调用 `copyText(FINAL_ARTICLE_TEXT)`，成功后文案变「已复制」+ 加 `.copied` 类，1.6s 后恢复；失败则文案变「复制失败，请手动选择正文」，2s 后恢复。
- `copyText` 优先用 `navigator.clipboard.writeText`（需 `window.isSecureContext`），否则降级为创建临时 `textarea` + `document.execCommand('copy')` 兜底。

## 9. 复制内容是否复用 cleanFinalArticle

是。复制内容直接复用已计算好的 `cleanedArticle`（即 `cleanFinalArticle(output.final_article ?? '', rawAssetType)` 的结果），不重复计算。通过 `const FINAL_ARTICLE_JSON = JSON.stringify(cleanedArticle)` 安全转义后注入脚本。展示用的是 `renderMarkdownLikeHtml(cleanedArticle)`（渲染后的 HTML），复制用的是 JSON 注入的纯文本字符串，两者同源、互不干扰，复制不读取 DOM innerText。

## 10. 是否支持本地 HTML 离线复制

是。脚本是纯内联 IIFE，不依赖任何外部资源或网络。复制逻辑带双通道：安全上下文（https / localhost）走 `navigator.clipboard`；`file://` 打开时 `window.isSecureContext` 为 false，自动降级到 `textarea` + `execCommand('copy')` 兜底，离线双击 HTML 文件即可复制。CSS 也全部内联，整份报告无外部依赖。

## 11. 是否打印时隐藏复制按钮

是。打印样式 `@media print` 中明确 `.copy-final-btn { display: none; }`，打印为 A4 时按钮不出现，避免交互元素污染纸质交付物。

## 12. 发布建议 JSON 如何处理

- 当 `schemaSuggestion.type === 'PlatformPublishGuide'` 时，标题为「发布建议」，调用 `renderPublishGuide` 把 `json_ld` 按字段渲染为可读卡片（`.guide-grid` 双列），绝不展示原始 JSON。
- 当为其它 Schema 类型时，标题为「Schema 建议」，用 `<pre class="schema-pre">` 展示 `JSON.stringify(json_ld, null, 2)`（#f8fafc 底、1px 边、8px 圆角、横向滚动、13px）。
- FAQ 模块保留开头 `## FAQ` 标题剥离逻辑（`faqNormalized`），避免与模块标题重复。
- 该区块仅当 `comparisonSummary || faqNormalized || schemaSuggestion` 存在时才渲染。

## 13. 主题色如何处理

- 全局定义 CSS 变量：`--report-accent:#2563eb`、`--report-accent-dark:#1d4ed8`、`--report-accent-soft:#eff6ff`，统一蓝色调。
- 报告头底线、kicker、h2、Score Hero(after)、blockquote、标签等全部使用该蓝色系。
- 不使用红色主题。红/琥珀仅用于：优先级徽章（high 红 / mid 琥珀 / low 绿）、风险 callout（琥珀）、待补充事实原因（琥珀）、gate 状态着色（ready 绿 / review 琥珀 / blocked 红），符合语义警示用途。

## 14. 打印样式如何处理

```css
@page { size: A4; margin: 0; }
@media print {
  body { background: #fff; }
  .report { max-width: none; margin: 0; border: 0; border-radius: 0; padding: 12mm; }
  .section { break-inside: avoid; }
  .copy-final-btn { display: none; }
}
```

- A4 纸张、零页边距（由 `.report` 的 12mm padding 控制内容边距）。
- 每个区块 `break-inside: avoid` 避免跨页割裂。
- 复制按钮打印时隐藏。
- 移动端 `max-width:860px`：摘要网格 2 列、双栏/评分/发布建议/图文卡片均 1 列、报告 padding 收窄、报告头改纵向。

## 15. 是否影响结果页复制正文

不影响。本次仅改写 `exportHtml.ts`（导出 HTML 报告的纯前端生成逻辑），结果页（RewriteResultPage / MultiPlatformResultPage）自身的「复制正文」按钮与 UI 完全未触碰。导出 HTML 内的复制按钮是独立新增的、仅存在于导出报告中的离线脚本。

## 16. 是否影响 Markdown 导出

不影响。Markdown 导出走 `ExportButton` 的 `format='markdown'` 分支（后端 API 或本地 fallback），与 `buildHtmlReport` 完全独立。本次只改 HTML 导出路径，Markdown / JSON 导出逻辑零改动。

## 17. 是否改后端 API

否。本次为纯前端单文件改写，`buildHtmlReport` 不走后端 API，复用结果页已加载的 task/output 数据。`BuildHtmlReportArgs`、`BuildHtmlReportResult` 接口与 `buildHtmlReport` 函数签名完全保持不变，`ExportButton.tsx` 调用方零改动。

## 18. 是否改数据库

否。未触碰任何数据库 schema、迁移、模型或 Prompt。评分逻辑（qualityGate / platformScorecard / cleanArticle）仅被读取调用，未修改。

## 19. 构建验证结果

- `npx tsc --noEmit`：退出码 0，无任何 TypeScript 错误。
- `npm run build`（`tsc -b && vite build`）：退出码 0，构建成功，2888 个模块转换通过，产物正常输出。仅有一条预存在的 chunk 体积超 500kB 警告（与本次改动无关，是全应用打包体积的既有提示）。

## 20. 仍存在的问题

- `fmtCount`、`beforeMetrics`、`afterMetrics` 在新模板中未被使用（新摘要卡片不再展示字数/阅读时长变化）。因 `tsconfig.app.json` 中 `noUnusedLocals:false`，不会报错；接口字段保留以兼容调用方，不影响功能。如后续需要可在摘要中恢复字数卡片。
- 导出报告中的「复制终稿正文」复制的是 `cleanFinalArticle` 清洗后的纯文本（去除 # 号、代码围栏、HTML 标签、报告型标题行），与结果页「复制正文」行为一致；若客户希望复制带 Markdown 符号的原文，需另开需求。
- 浏览器对 `file://` 下 `execCommand('copy')` 的支持取决于具体浏览器版本，极旧浏览器可能仍需手动选择正文（脚本已提供失败提示文案）。

## 21. 下一步建议

- 可考虑在「发布检查摘要」恢复「字数变化 / 阅读时长」卡片（复用 `beforeMetrics`/`afterMetrics`），让摘要更完整；当前 5 卡片布局为 `repeat(5,1fr)`，若加到 6 卡片可保持单行。
- 可为导出报告增加「页码 / 页眉页脚」的打印增强（`@page` 的 `@bottom-right` 计数器），进一步提升 A4 交付感。
- 可评估把导出报告的 Score Hero 与结果页的评分卡组件共享同一套配色常量，避免双份维护。
- 若后续要在导出报告内支持「复制 Markdown 原文」与「复制纯净正文」双按钮，可在 `.section-head` 放两个按钮，分别注入 `output.final_article` 与 `cleanedArticle`。
