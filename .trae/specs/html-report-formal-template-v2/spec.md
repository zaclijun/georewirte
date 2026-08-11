# HTML Report Formal Template v2 Spec

## Why
当前 HTML 导出报告偏「网页结果页」（大渐变 Hero + 卡片堆叠 + 长文左右并排全文对比），不像正式客户交付的 GEO 内容优化报告。用户希望将其升级为 A4 报告感的「内容优化质检报告」，并在报告内「终稿正文」模块增加「复制终稿正文」按钮，复制内容必须是纯净可发布正文。

## What Changes
- 重写 `frontend/src/lib/exportHtml.ts`：从「网页卡片堆叠」改为「正式报告容器」
- 报告 Header 改为左右结构（报告类型 + 文章标题 + meta + 项目标识），底部蓝色强调线
- Section 改为分割线分隔的段落，不再满屏大圆角阴影卡片
- 报告顺序调整为：Header → 发布检查摘要 → 评分诊断 → 主要优化建议 → 待补证据与风险 → 终稿正文 → 原始素材 → FAQ/发布建议 → 免责声明 → Footer
- 新增「发布检查摘要」节：5 个摘要卡片（发布状态/终稿评分/评分变化/待补来源/质量状态）+ 两栏（为什么是这个状态 / 主要优化点）
- 评分诊断改用 Score Hero（总分大数字 + 等级 A-E + 维度评分条），同时展示初稿评分和终稿评分
- 「来源缺口」与「待补充事实」合并为「待补证据与风险」一节
- 终稿正文移到原始素材之前，不再使用左右并排全文对比作为主结构
- 终稿正文标题右侧新增「复制终稿正文」按钮（内置离线 JS，复用 `cleanFinalArticle`，file:// 环境 fallback textarea + execCommand）
- 主色统一为克制蓝色（`#2563eb` / `#1d4ed8` / `#eff6ff`），不使用红色主题
- 增加打印样式（A4、隐藏复制按钮、去除阴影圆角）
- 已下线平台在 Header meta 显示为「历史内容资产」，不在首屏强调

## Impact
- Affected specs: 无（首次为 HTML 导出模板建立 spec）
- Affected code:
  - `frontend/src/lib/exportHtml.ts`（主要重写）
  - `frontend/src/lib/cleanArticle.ts`（仅复用，不改动）
  - `frontend/src/components/common/ExportButton.tsx`（接口不变，不改动）
  - `frontend/src/pages/RewriteResultPage.tsx`（不改动）
  - `frontend/src/pages/MultiPlatformResultPage.tsx`（不改动）
- 不改后端 API、数据库、Prompt、评分逻辑、结果页主 UI、复制正文主功能

## ADDED Requirements

### Requirement: 正式报告容器与 Header
The system SHALL render the exported HTML as a compact A4-report-style container (max-width 980px, white background, subtle border) instead of a web-style hero with large gradient cards.

#### Scenario: 打开导出 HTML
- **WHEN** 用户点击「导出 HTML」并打开下载的 .html 文件
- **THEN** 顶部是正式 report-header（左侧：GEO 内容优化报告 kicker + 文章标题 + meta 行；右侧：项目标识 GEO），底部有 3px 蓝色强调线
- **AND** 主体是 `.report` 容器，Section 之间用 `border-top` 分割线分隔，不是大圆角阴影卡片堆叠

### Requirement: 发布检查摘要
The system SHALL render a「发布检查摘要」section as the first content section after Header, containing 5 summary cards and a two-column explanation.

#### Scenario: 有评分的任务
- **WHEN** 任务有 score_before 和 score_after
- **THEN** 摘要展示 5 个卡片：发布状态 / 终稿评分 / 评分变化 / 待补来源数 / 质量状态
- **AND** 下方两栏：「为什么是这个状态」+ 「主要优化点」

#### Scenario: 旧任务无评分
- **WHEN** 任务无评分
- **THEN** 评分相关卡片显示「—」，不报错

### Requirement: Score Hero 评分诊断
The system SHALL render score diagnosis as two Score Hero blocks (初稿评分 + 终稿评分), each with total score big number, A-E grade, and dimension score bars.

#### Scenario: 评分展示
- **WHEN** 渲染评分诊断
- **THEN** 初稿评分 Hero（蓝灰/深蓝调）和终稿评分 Hero（蓝色/绿色调）并排或上下展示
- **AND** 每个维度有名称、分数、进度条、等级
- **AND** 等级规则：90+ A，80-89 B，70-79 C，60-69 D，<60 E

### Requirement: 报告顺序
The system SHALL order report sections as: Header → 发布检查摘要 → 评分诊断 → 主要优化建议 → 待补证据与风险 → 终稿正文 → 原始素材/初稿 → FAQ/发布建议/Schema → 免责声明 → Footer.

#### Scenario: 终稿正文位置
- **WHEN** 渲染正文相关模块
- **THEN** 终稿正文在原始素材之前
- **AND** 不使用长文左右并排全文对比作为主结构

### Requirement: 待补证据与风险合并
The system SHALL merge「来源缺口」and「待补充事实」into one section titled「待补证据与风险」, with two subsections.

#### Scenario: 有来源缺口
- **WHEN** missing_sources 非空
- **THEN** 在「来源缺口」子块用风险列表/callout 展示
- **AND** 「待补充事实」子块独立展示 missing_facts

#### Scenario: 无缺口
- **WHEN** missing_sources 为空
- **THEN** 显示「暂无明显来源缺口」

### Requirement: HTML 报告内复制终稿正文按钮
The system SHALL render a「复制终稿正文」button on the right side of the 终稿正文 section header, which copies pure article text (not HTML, not Markdown, not the report).

#### Scenario: 点击复制
- **WHEN** 用户在导出的 HTML 中点击「复制终稿正文」
- **THEN** 复制内容为 `cleanFinalArticle(output.final_article, assetType)` 的结果
- **AND** 按钮短暂显示「已复制」约 1.6 秒后恢复
- **AND** 复制内容无 `#` / `##` / `###`、无 HTML 标签、无评分、无建议、无来源缺口、无报告元信息

#### Scenario: file:// 离线环境
- **WHEN** 浏览器在 file:// 协议下不支持 navigator.clipboard
- **THEN** fallback 到 textarea + execCommand('copy') 方案

#### Scenario: 打印时
- **WHEN** 浏览器打印报告
- **THEN** 复制按钮隐藏（`@media print { .copy-final-btn { display: none; } }`）

### Requirement: 离线复制安全注入
The system SHALL inject the cleaned article text into the HTML via `JSON.stringify` to safely escape newlines/quotes/backslashes, not via raw string concatenation.

#### Scenario: 正文含特殊字符
- **WHEN** final_article 含换行、引号、反斜杠
- **THEN** 通过 `JSON.stringify(cleanFinalArticle(...))` 注入 `<script>` 变量，不破坏 HTML 结构

### Requirement: 主题色与打印
The system SHALL use restrained blue as accent (`#2563eb` / `#1d4ed8` / `#eff6ff`), not red theme. Print styles SHALL apply A4 layout, hide copy button, remove heavy shadows/borders.

#### Scenario: 打印
- **WHEN** 用户浏览器打印
- **THEN** body 白底，`.report` 去除边框圆角阴影，Section break-inside avoid，复制按钮隐藏

## MODIFIED Requirements

### Requirement: 发布建议不展示原始 JSON
[基于上一轮已有逻辑，继续保留并强化] 当 `schema_suggestions.type === 'PlatformPublishGuide'` 时，渲染为可读字段卡片（推荐标题/封面文案/Caption/评论引导/标签/风险提示/图文卡片脚本等），不展示完整 JSON、`image_text_transcript`、`package_type`、`canonical_content_suggestion` 原始字段名。非 PlatformPublishGuide 的普通 Schema 仍可美化展示 JSON-LD。

### Requirement: 已下线平台处理
[基于上一轮已有逻辑] 已下线平台（小红书）在 Header meta 显示为「历史内容资产」，不在首屏强调；如需说明放到底部小提示。历史 score comment 中的「小红书」字样 P0 不改数据，但首屏不突出。

## REMOVED Requirements

### Requirement: 大渐变 Hero + 卡片堆叠 + 长文左右并排全文对比
**Reason**: 不符合正式报告交付感，长文并排拖沓
**Migration**: 改为正式报告容器 + Score Hero + 终稿正文/原始素材顺序展示，对比留待 P1 差异摘要
