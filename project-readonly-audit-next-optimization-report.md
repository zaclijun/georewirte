# GEO Rewrite Workbench — 只读产品与代码审计报告

> 审计日期：2026-06-29
> 审计范围：前端 39 个文件 + 后端 27 个文件 + Prompt 8 个文件 + docs 1 个文件
> 审计原则：只读审计，不修改任何代码

---

## 1. Executive Summary

### 当前产品总体状态

GEO 内容改写工作台已形成完整的产品骨架：工作区 → 知识库 → 导入母稿 → 诊断/改写/多平台发稿包 → 结果页质量检查 → Markdown 导出。核心链路可跑通，前端构建无错误，后端 28 条路由正常加载，TypeScript 类型检查零错误。

平台化评分卡的前端架构（`PlatformScorecard` / `platformScorecard.ts`）已正确区分官网 GEO Web Scorecard 与自媒体发布就绪度，Schema 就绪度在非官网平台不再渲染。Prompt 层（`score-and-diagnose.md`）也已明确平台化维度定义。这是当前产品最大的结构性成果。

### 是否可继续开发

**可以继续开发。** 代码工程质量尚可，分层清晰，无阻塞性 bug。但存在一个严重的数据层断层（评分维度平台适配未落地）需要在下一轮修复。

### 是否建议进入 Beta

**暂不建议进入 Beta。** 当前有 2 个 P0 级问题会直接影响用户信任：

1. 自媒体平台评分数据失真——LLM 返回平台化维度（如"标题吸引力"），但后端 `ContentScore` ORM 只有 6 个固定列（事实密度/结构清晰度/.../Schema 就绪度），平台化维度全部落入 `dimension_comments` JSON 列，而 `score_summary_from_score` 重建时只读 6 个固定列，导致 API 返回的自媒体评分**维度名是标准 6 维、分数全为 0、comment 为 None**。
2. `workspace_type` 仅存 localStorage——用户换浏览器/清缓存后工作区类型丢失，默认视角、默认平台、知识库名称全部错位。

### 当前最大 5 个问题

| # | 问题 | 影响 | 涉及文件 |
|---|------|------|----------|
| 1 | 自媒体平台评分数据失真 | 公众号/小红书/知乎结果页展示的 6 维分数全为 0，用户看到的是假数据 | `scoring_service.py` L17-143, `content_score.py` L25-31 |
| 2 | workspace_type 仅存 localStorage | 工作区类型丢失后全站文案/默认值/知识库模板错位 | `workspace.ts` L107-128, `project.py` ORM 无此字段 |
| 3 | NewRewritePage 是表单而非文章工作台 | 用户"导入一篇文章"的心智无法满足，无字数统计/草稿确认/先诊断模式 | `NewRewritePage.tsx` 全文 |
| 4 | 导出后 review_status 不可逆变更为 exported | 导出后"建议检查"标签消失，用户无法回到复核状态 | `export.py` L37 |
| 5 | 知乎 final_article 开头与纯净性铁律冲突 | Prompt 内部矛盾，知乎文章要求 `## 一句话结论` 开头，但铁律要求 `## 内容摘要` 开头 | `rewrite-package.md` L381-403 vs L54-77 |

---

## 2. Current Product Map

### 当前已实现功能地图

| 模块 | 已实现 | 状态 |
|------|--------|------|
| 工作区启动台 `/projects` | 4 种 workspace_type 筛选、搜索、创建弹窗 | 可用，workspace_type 仅 localStorage |
| 工作区首页 `/projects/:id` | 三步工作流卡片、新手 Checklist、最近任务 | 可用，Checklist "导入素材" 项永远 false |
| 知识库 `/projects/:id/facts` | CRUD、分类筛选、按 workspace_type 动态文案、media 示例 | 可用，表单弹窗标题未动态化 |
| 素材箱 `/projects/:id/inbox` | 占位页 | 未实现，仅静态提示 |
| 生成发稿包 `/projects/:id/rewrite/new` | 单/多平台提交、配置面板、品牌事实选择 | 可用，表单式而非文章工作台 |
| 改写结果页 `/tasks/:taskId/result` | 评分对比、降分解释、内容规模、原文对比、FAQ、Schema/发布建议、来源缺口、导出、重新改写 | 可用，信息密度最高 |
| 多平台结果页 `/multi-platform-result` | 多任务卡片网格、独立重试、耗时统计 | 可用，无批量导出 |
| 历史任务 `/history` | 按项目分组、平台/状态筛选、删除 | 可用，无工作区筛选 |
| Enterprise 页 `/enterprise` | 静态销售页 | 纯展示，按钮无跳转 |

### 当前核心用户路径

```
/projects（选工作区）
  → /projects/:id（首页）
    → /projects/:id/facts（完善知识库）
    → /projects/:id/rewrite/new（粘贴母稿 + 选平台）
      → /tasks/:taskId/result（查看结果）
        → 导出 Markdown / 重新改写
      或 /multi-platform-result（多平台结果）
    → /history（查看所有任务）
```

### 当前页面 / 路由地图

| 路由 | 组件 | AppShell variant | projectId |
|------|------|-------------------|-----------|
| `/` | LandingRedirect | — | — |
| `/projects` | ProjectListPage | wide | 无 |
| `/projects/:projectId` | ProjectOverviewPage | standard | 有 |
| `/projects/:projectId/facts` | BrandFactsPage | standard | 有 |
| `/projects/:projectId/inbox` | InboxPage | standard | 有 |
| `/projects/:projectId/rewrite/new` | NewRewritePage | standard | 有 |
| `/tasks/:taskId/result` | RewriteResultPage | standard/wide | 有/无（History Mode 无） |
| `/multi-platform-result` | MultiPlatformResultPage | wide | 无 |
| `/history` | HistoryPage | wide | 无 |
| `/enterprise` | EnterprisePage | bare | 无 |

---

## 3. Product Fit Audit

### 3.1 工作区

**结论：可用，但 workspace_type 持久化是硬伤。**

- `/projects` 已从旧 Dashboard 进化为"工作台启动器"（`ProjectListPage.tsx` L23-37 注释明确自述），移除了 KPI 卡片和 Enterprise 横幅，聚焦工作区选择与创建。
- 未选择工作区时，Sidebar 正确收口——仅显示"工作台 + 历史任务"（`Sidebar.tsx` L109-117），知识库/素材箱/生成发稿包路由回退到 `/projects`（L83-87）。**未暴露不该暴露的能力。**
- 文案"工作区 / 工作台 / 知识库 / 生成发稿包"层次清晰，未发现明显混乱。
- **最大 UX 问题**：`workspace_type` 仅存 localStorage（`workspace.ts` L107-128），不在后端 Project 表中。用户换浏览器/清缓存后，工作区回退为"通用"类型，默认视角、默认平台、知识库名称全部错位。
- **工作区卡片信息密度不足**：`ProjectCard.tsx` L48-50 仅显示 4-6 字徽标（"品牌"/"专业服务"/"自媒体"/"服务商"），无描述文案，用户首次使用时无法理解差异。
- **是否建议进入下一轮 Workspace 重构**：不需要大重构，但需要做两件事——workspace_type 持久化到后端 + 卡片增加类型描述。
- **是否必须改后端**：是，Project 表需要新增 `workspace_type` 字段或 `metadata` JSON 列。

### 3.2 知识库

**结论：可用，命名分层不彻底。**

- `BrandFactsPage.tsx` 按 workspace_type 动态调整文案（品牌/专业/账号/客户知识库），KB_COPY 覆盖 5 种类型（L45-71）。
- media 工作区空状态展示参考示例（9 个字段），但无法一键导入为草稿。
- `FactFormDialog` 弹窗标题硬编码"编辑事实/新增事实"（L370），未随工作区类型动态化——页面标题叫"品牌知识库"但弹窗仍叫"事实"，命名不一致。
- `BrandFact.fact_type` 是自由文本（`String(20)`），无枚举约束。`workspace.ts` 的 `buildKnowledgeSeeds` 把 category 拼成 `[${category}] ${title}` 塞进 title 字段（L460-469），是 hack 做法，后续检索困难。
- Prompt 仍把所有输入叫"品牌事实"，未区分账号知识/客户材料/专业知识。

### 3.3 单篇文章主流程

**结论：不符合"我有一篇文章要发好"的用户心智。当前是表单式改写任务页，不是文章导入工作台。**

| 特性 | 支持情况 | 位置 |
|------|----------|------|
| 标题与正文分离输入 | 部分——标题在配置面板，正文在主表单 | `NewRewritePage.tsx` |
| 字数统计 | 仅字符数，无段落数/标题数/阅读时长 | L194 |
| 草稿确认 | 不支持，刷新丢失 | 全文无 |
| 平台选择位置 | 右侧配置面板，非主流程 | L246-251 |
| 先诊断评分 / 直接改写 | 不支持二选一，只能直接改写 | — |
| 过早暴露复杂配置 | 是——视角、来源策略、输出长度、Schema 开关、品牌事实选择全部在初始表单 | `RewriteConfigPanel.tsx` |

**当前主流程不符合普通用户预期。** 用户手里有一篇长文章，期望的是"粘贴 → 看到字数 → 确认母稿 → 选平台 → 生成 → 查看结果"，当前是"粘贴 → 填一堆配置 → 提交"。

**建议优先做单篇长文章导入增强。**

### 3.4 评分诊断与改写关系

**结论：当前只有"直接改写"模式，不支持"只评分诊断不改写"。**

- 用户上传文章后**只能直接改写**，没有"先诊断评分"选项。
- `score_before` / `score_after` 在结果页有展示（`RewriteResultPage.tsx` L643-671），且有降分解释卡（`ScoreDeclineExplainer` L548-616，含 Top 3 下降维度）。
- Quality Gate 已实现（`qualityGate.ts`），但阈值不区分平台——硬编码 `8 / 3 / 2 / 85`（L130-148），官网和自媒体用同一套阈值。
- Quality Gate 文案已平台化（`getQualityGateMetaForPlatform` L70-96，自媒体用"发布就绪度下降"），但判断结果不受平台影响。
- **无"可使用 / 建议复核 / 分数下降 / 不建议发布"的显式交付状态**——Quality Gate 有 5 档（ready/review/degraded/not_recommended/blocked），但与 `RewriteOutput.review_status`（ready/review/needs_material/exported）是两套系统，不互通。
- 无"保留原文仅生成发布建议"的产品闭环（结果页 L597-599 有按钮但 disabled）。

**推荐方案**：在同一个文章入口里增加"先诊断评分"模式，不新建独立评分页。用户粘贴文章后，先展示"诊断评分"结果（Call 1），再决定是否改写。实施复杂度中等——后端已有 Call 1 独立能力，前端需新增评分结果展示组件。

### 3.5 多平台发稿包

**结论：是当前产品差异化能力，应继续保留。**

- 多平台通过多个独立 task 生成（`rewrite_service.py` 每次 kickoff 一个 task），不是超长 Prompt——设计正确。
- 官网：生成 Schema、FAQ、来源缺口——✅
- 公众号：生成标题、导语、封面摘要、金句、发布建议——✅（`rewrite-package.md` L167-275）
- 小红书：生成图文卡片脚本（6-8 张），不生成真实图片——✅（L276-380）
- 知乎：生成问题标题、结论、论证结构——✅（L381-426）
- 不同平台输出确实差异化，`PlatformPublishGuideView.tsx` 按平台分支渲染。
- **结果页未让用户理解"官网负责 AI 看懂，自媒体负责人看进去"**——没有显式的平台定位说明。

**不需要降级为平台适配层。** 但应避免继续扩展新平台（微博/抖音/LinkedIn 等已有 Prompt 规则但前端未暴露）。

### 3.6 结果页交付

**结论：信息密度高，基本可交付，但有几处缺失影响客户信任。**

| 信息项 | 是否包含 | 位置 |
|--------|----------|------|
| 所属工作区 | ✅ | `TaskContextBar` L303-304 |
| 输入来源 | 部分——原文对比 Tab 有，顶部无明确标签 | L361-389 |
| 平台 | ✅ | L273-275 |
| 视角 | ✅ | L305 |
| 版本 | ✅ | L307 |
| 改前/改后评分 | ✅ | L643-671 |
| 发布就绪度 | ✅ | L675-681 |
| 字数统计 | ✅ | L690-702 |
| 段落数 | ✅ | `computeContentMetrics` |
| 标题数 | ✅ | 同上 |
| 阅读时长 | ✅ | 同上 |
| 降分解释 | ✅ | L548-616 |
| 来源缺口 | ✅ | L600-610 |
| 待补充事实 | ✅ | `ResultInspector` |
| 本次改写做了什么 | ✅ | L382-388 `comparison_summary` |
| 模块级复制按钮 | ✅ | L354/377/396/419/444 |
| Markdown 导出 | ✅ | L285-290 |
| 重新优化一版 | ✅ | L291-294 |
| 篇幅变化告警 | ✅ | L703-714（-30% / +80%） |

**缺失项**：
- 自媒体平台评分维度失真（6 维分数全 0）——这是 P0 必须修。
- `onAddFact` 用 `window.location.href` 整页刷新（L467），非 SPA 路由，丢失页面状态。
- 错误提示暴露内部 API 路径（L196 "请检查后端 /api/tasks/{taskId}"）。

### 3.7 历史任务

**结论：可用，但缺少工作区筛选维度。**

- 从 `/history` 进入任务结果页**不会自动切换工作区**，不会覆盖 `lastActiveProjectId`——设计正确。
- 历史任务列表显示工作区来源（`HistoryPage.tsx` L310-314 显示 projectName）。
- 支持平台筛选、状态筛选，**不支持工作区筛选**（仅有全局搜索 + 平台 + 状态三个维度）。
- 负分**不会显示为绿色**——降分逻辑正确（L343-362：`delta > 0` 绿色，`delta < -3` 红色，`delta < 0` 黄色）。
- 操作列已做防重叠处理（L259-268 `min-w-[1210px]` + `overflow-x-auto`）。
- **未区分"任务完成状态"和"内容发布就绪状态"**——completed 任务可能 Quality Gate 判定为"不建议发布"，但列表只显示任务状态。

---

## 4. Platform Scorecard Audit

### 官网文章

- **展示 GEO Web Scorecard**：✅ `platformScorecard.ts` L62-71 `renderType: 'radar'`，`allowSchemaDimension: true`
- **6 维雷达**：事实密度 / 结构清晰度 / 实体一致性 / 来源权威性 / AI 触发覆盖 / Schema 就绪度——✅ 正确
- **评分数据准确**：后端 `DIMENSION_MAP` 6 维列名与官网维度一一对应——✅

### 公众号

- **展示公众号发布就绪度**：✅ `renderType: 'bars'`，标题"公众号发布就绪度"
- **不展示 Schema 就绪度**：✅ `allowSchemaDimension: false`
- **6 维定义**：标题吸引力 / 首屏导语 / 移动端可读性 / 结构节奏 / 转发收藏价值 / 表达风险控制——✅ Prompt 层正确
- **评分数据失真**：❌ 后端 `DIMENSION_MAP` 只有 6 个标准列，公众号平台维度全进 `dimension_comments`，`score_summary_from_score` 重建时丢弃——**分数全为 0**

### 小红书

- **展示小红书图文就绪度**：✅ `renderType: 'checklist'`，基于 PlatformPublishGuide 字段完整度估算
- **不展示 Schema 就绪度**：✅
- **checklist 估算**：`buildXHSChecklist`（L273-321）基于 image_card_script 数量、caption 等字段——稳健

### 知乎

- **展示知乎回答就绪度**：✅ `renderType: 'bars'`，标题"知乎回答就绪度"
- **不展示 Schema 就绪度**：✅
- **评分数据失真**：❌ 与公众号相同问题

### Schema 维度是否误用

**前端：未误用。** `PlatformScorecard` 内部 `RadarView` 仅官网文章使用，维度经 `adaptDimensionsForPlatform` 适配，非官网平台不渲染 Schema 就绪度维度。

**后端：列名误导。** `ContentScore.schema_readiness` 列名仍叫 schema_readiness，但自媒体平台存的是"PlatformPublishGuide 就绪度"分数。

**潜在风险**：`ScoreRadarChart.tsx`（通用 6 维雷达组件）是平台无关的，会无差别渲染所有 6 维（含 Schema 就绪度）。当前无任何调用方（dead code），但若被后续开发者复用，会在公众号/小红书/知乎上误展示 Schema 就绪度。

### 六维雷达是否误用

**前端组件层：未误用。** `PlatformScorecard` 内部的 `RadarView` 仅官网文章触发。

**通用组件层：有隐患。** `ScoreRadarChart.tsx` 是 dead code，但组件本身平台无关，会渲染所有 6 维。建议删除或加防御。

### 历史任务列表文案

- `getScoreColumnLabel`（`platformScorecard.ts` L418-429）正确区分"GEO 评分"（官网）和"发布就绪度"（自媒体）——✅
- `getScorecardBadgeLabel` 同样正确——✅

### Quality Gate 文案

- `getQualityGateMetaForPlatform`（`qualityGate.ts` L70-96）正确区分"GEO 评分下降"（官网）和"发布就绪度下降"（自媒体）——✅
- 但**阈值不区分平台**（L130-148 硬编码 `8 / 3 / 2 / 85`），官网降 8 分和公众号降 8 分判定的严重度不同——❌

### 最小修复建议

1. **后端 `scoring_service.py`**：`score_summary_from_score` 重建时，若 6 个标准列全为 0，则从 `dimension_comments` 读取平台化维度数据。或者直接改为始终从 `dimension_comments` 重建（这是唯一存全量维度的地方）。
2. **前端 `qualityGate.ts`**：`getQualityGateFromOutput` 增加 platform 参数，按平台差异化阈值。
3. **前端 `ScoreRadarChart.tsx`**：删除（确认 dead code）或内部加 `shouldShowSchemaDimension` 防御。

---

## 5. UX Issues

| # | 问题 | 影响 | 严重度 | 建议 |
|---|------|------|--------|------|
| U1 | NewRewritePage 是表单而非文章工作台 | 用户"导入一篇文章"心智无法满足，无字数/段落/阅读时长统计，无草稿确认 | 高 | 升级为文章导入工作台，增加字数统计面板和确认母稿步骤 |
| U2 | 不支持"先诊断评分再改写" | 用户不确定文章是否需要改写就被迫提交改写任务 | 高 | 在文章入口增加"先诊断评分"模式，复用 Call 1 |
| U3 | workspace_type 仅存 localStorage | 换浏览器/清缓存后工作区类型丢失，全站文案/默认值错位 | 高 | 持久化到后端 Project 表 |
| U4 | 自媒体平台评分数据失真 | 公众号/小红书/知乎结果页展示 6 维分数全为 0 | 高 | 修复 `scoring_service.score_summary_from_score` |
| U5 | 多平台提交无事务性 | N 个平台串行创建，中途失败不回滚，已创建的任务残留 | 高 | 改为 `Promise.all` + 部分失败提示 |
| U6 | 导出后 review_status 不可逆变更 | 导出后"建议检查"标签消失，无法回到复核状态 | 中 | 导出动作不应改 review_status，或增加可逆机制 |
| U7 | ProjectOverviewPage Checklist "导入素材" 项永远 false | 新手 Checklist 永远显示，该项永远无法完成 | 中 | 改为基于"是否有 completed 任务"判断，或移除该项 |
| U8 | RewriteResultPage onAddFact 整页刷新 | `window.location.href` 跳转，丢失页面状态 | 中 | 改用 `useNavigate` |
| U9 | 降分视觉强度不统一 | HistoryPage `delta < -3` 红色，RewriteResultPage 降分始终黄色 | 中 | 统一阈值 |
| U10 | EnterprisePage 按钮无跳转 | "预约演示""查看技术方案"等按钮点击无响应 | 低 | 暂不处理（P0 不含销售流程） |
| U11 | InboxPage 占位文案"即将支持"误导用户 | P0 明确不含批量导入，但文案暗示即将上线 | 低 | 改为"未来规划" |
| U12 | BrandFactsPage 表单弹窗标题未动态化 | 页面叫"品牌知识库"但弹窗仍叫"事实" | 低 | 弹窗标题随 workspace_type 动态化 |
| U13 | RewriteConfigPanel Schema 开关在所有平台可见 | 公众号/小红书/知乎下开关可勾选但无效，用户困惑 | 低 | 非官网平台禁用或隐藏 Schema 开关 |
| U14 | 历史任务页缺少工作区筛选 | 项目多时无法快速定位某工作区的任务 | 低 | 增加工作区筛选维度 |
| U15 | 错误提示暴露内部 API 路径 | RewriteResultPage L196 "请检查后端 /api/tasks/{taskId}" | 低 | 改为用户友好文案 |

---

## 6. Code / Architecture Issues

### 6.1 前端问题

| # | 问题 | 文件 / 行号 | 严重度 |
|---|------|-------------|--------|
| F1 | `workspace_type` 完全依赖 localStorage，`getWorkspaceType` L116 `catch {}` 静默吞错 | `workspace.ts` L107-128 | 高 |
| F2 | Sidebar 在 `WorkspaceSwitcherDialog.renderRow` 中直读 localStorage，绕过 hook | `Sidebar.tsx` L306-316 | 中 |
| F3 | `AppShell` 同时接受 `projectId` prop 和 `useCurrentProjectId()` URL 解析，两个真理源 | `AppShell.tsx` L10 vs L55 | 中 |
| F4 | `ScoreRadarChart.tsx` 是 dead code，平台无关，会无差别渲染 6 维（含 Schema） | `ScoreRadarChart.tsx` 全文 | 中 |
| F5 | `qualityGate.ts` `getQualityGate` 阈值硬编码，不区分平台 | `qualityGate.ts` L130-148 | 中 |
| F6 | `qualityGate.ts` L109-111 `Q1`/`Q2`/`Q3` 污染检测过宽，误伤财报类正文 | `qualityGate.ts` L101-112 | 中 |
| F7 | `platformScorecard.ts` `WECHAT_DIMENSION_MAP` 把 Schema 就绪度映射到"转发收藏价值"——语义错配 | `platformScorecard.ts` L156-172 | 中 |
| F8 | `platformScorecard.ts` `ZHIHU_DIMENSION_MAP` 把"事实密度"和"来源权威性"都映射到 `evidence_support`——双重聚合 | `platformScorecard.ts` L166-169 | 中 |
| F9 | NewRewritePage 多平台提交串行 `for...of` + `await`，无回滚 | `NewRewritePage.tsx` L123-133 | 中 |
| F10 | `constants.ts` L125 `SCORE_DIMENSIONS` 与 `platformScorecard.ts` L73-80 重复定义 | `constants.ts` / `platformScorecard.ts` | 低 |
| F11 | `ReviewStatus`（types L108）与 `QualityGateStatus`（qualityGate L10）两套状态系统不互通 | `types/index.ts` / `qualityGate.ts` | 低 |
| F12 | `Platform` 类型 `'知乎问答'` 与 `PlatformPublishGuideView.tsx` L37 字符串匹配可能不一致 | `types/index.ts` L63 / `PlatformPublishGuideView.tsx` L37 | 低 |
| F13 | 全站路由无懒加载，首屏 bundle 1,039 KB | `App.tsx` L2-12 | 低 |
| F14 | `api.ts` L83-84 `list` 返回类型不固定 `Project[] | Paginated<Project>` | `api.ts` L83-84 | 低 |
| F15 | mock fallback 策略不一致——多数页面有 mock，RewriteResultPage 明确移除 | 多文件 | 低 |

### 6.2 后端问题

| # | 问题 | 文件 / 行号 | 严重度 |
|---|------|-------------|--------|
| B1 | `scoring_service.DIMENSION_MAP` 平台无感，6 个固定列；自媒体平台维度全进 `dimension_comments`，`score_summary_from_score` 重建时丢弃 | `scoring_service.py` L17-143 | 高 |
| B2 | `ContentScore` ORM 6 个固定维度列，`schema_readiness` 列名误导 | `content_score.py` L25-31 | 高 |
| B3 | Project 模型无 `workspace_type` / `metadata` 字段 | `project.py` ORM | 高 |
| B4 | 导出后 `review_status = "exported"` 不可逆 | `export.py` L37 | 中 |
| B5 | 状态机 TOCTOU 竞态——`if status == "running"` 检查与 `status = "running"` 提交之间有时间窗 | `rewrite_service.py` L68-74 | 中 |
| B6 | 无 `started_at` / `completed_at`，running 卡死无看门狗回收 | `rewrite_task.py` ORM / `rewrite_service.py` | 中 |
| B7 | `update_task` 任何字段更新都强制重写（无 diff 检查） | `rewrite_tasks.py` L153-174 | 中 |
| B8 | `llm_service` 调用时只传 `task_id`，`output_id` 永远 NULL | `llm_service.py` L157-163 | 中 |
| B9 | `LLMCallLog` 不存 prompt/response 文本，调试困难 | `llm_call_log.py` ORM | 中 |
| B10 | `config.py` `llm_model` 默认 `gpt-4o-mini`，与文档推荐 `deepseek-chat` 不一致 | `config.py` L30 | 低 |
| B11 | `rewrite_task.py` `need_schema` 默认 True，与文档"自媒体应 False"不一致 | `rewrite_task.py` L43-45 | 低 |
| B12 | `projects._to_out` N+1 查询（每个 project 3 次查询） | `projects.py` L21-53 | 低 |
| B13 | CORS `allow_origins=["*"]` + `allow_credentials=True` | `main.py` L30-36 | 低 |
| B14 | `init_db()` 不跑 Alembic 迁移，只 `create_all` | `database.py` L44-49 | 低 |
| B15 | `prompt_service` `lru_cache` 缓存 Prompt 文件，开发期改文件不生效 | `prompt_service.py` L28-33 | 低 |
| B16 | `export_service._platform_guide_block` 硬编码 16+9 字段，LLM 输出新字段不渲染 | `export_service.py` L244-321 | 低 |
| B17 | `export_service._strip_faq_header` 仅匹配 `## FAQ` / `# FAQ`，`### FAQ` 等变体不剥离 | `export_service.py` L175-189 | 低 |
| B18 | `fact_type` / `source_type` / `evidence_level` 无枚举约束 | `brand_fact.py` L24-29 | 低 |
| B19 | 死代码：`output-json.md`、`output-schema.md`、`RewriteTaskListItem`、`RewriteTaskStatus`、`ScorePairOut`、`SchemaSuggestion`、`OptimizationStrategyItem`、`MissingFactItem` | 多文件 | 低 |
| B20 | `e2e_test.py` 不做断言验证、不测试多平台、不清理测试数据、端口硬编码 | `e2e_test.py` | 低 |

### 6.3 Prompt 问题

| # | 问题 | 文件 / 行号 | 严重度 |
|---|------|-------------|--------|
| P1 | 仍把所有输入叫"品牌事实"，未区分账号知识/客户材料/专业知识 | `system-role.md` / `rewrite-package.md` / `score-and-diagnose.md` / `quality-check.md` 全部 | 中 |
| P2 | 知乎 `final_article` 要求 `## 一句话结论` 开头，违反"必须 `## 内容摘要` 开头"铁律 | `rewrite-package.md` L381-403 vs L54-77 | 中 |
| P3 | `score-and-diagnose.md` Prompt 层平台感知，但 `scoring_service.py` 代码层平台无感——Prompt 与代码不一致 | `score-and-diagnose.md` L27-59 vs `scoring_service.py` L17-143 | 高 |
| P4 | `rewrite-package.md` FAQ "必须引用法律条款编号或正文段落"——对非法律类内容过度约束 | `rewrite-package.md` L80-103 | 低 |
| P5 | `perspectives.md` 9 个视角 vs `rewrite-package.md` 5 个视角适配，投资者/政府监管等无适配指引 | `perspectives.md` vs `rewrite-package.md` L432-440 | 低 |
| P6 | `output-json.md` / `output-schema.md` 字段命名与主流程不一致（`final_article_markdown` vs `final_article`）——备用参考未启用 | `output-json.md` / `output-schema.md` | 低 |
| P7 | 小红书 `image_card_script` 要求 6-8 张，但后端无校验，LLM 输出 4 张照单全收 | `rewrite-package.md` L315 | 低 |
| P8 | `quality-check.md` 接收 `hard_blockers_before` 但未接收 `source_gaps`，数据流失 | `quality-check.md` vs `score-and-diagnose.md` L232-237 | 低 |

### 6.4 数据结构问题

| # | 问题 | 严重度 |
|---|------|--------|
| D1 | `ContentScore` 6 个固定维度列无法承载平台化维度——自媒体平台维度全进 JSON | 高 |
| D2 | Project 无 `workspace_type` / `metadata` 字段，扩展配置无法持久化 | 高 |
| D3 | `RewriteTask` 无 `started_at` / `completed_at`，无法判断任务耗时和超时 | 中 |
| D4 | `RewriteOutput.missing_facts` 字段存在但 Prompt 未要求输出，永远 NULL | 低 |
| D5 | `LLMCallLog.output_id` 永远 NULL，`cost_usd` 永远 NULL | 低 |
| D6 | 所有 JSON 列用 `Optional[Any]`，LLM 输出结构完全不被 Pydantic 校验 | 低 |

### 6.5 状态管理问题

| # | 问题 | 严重度 |
|---|------|--------|
| S1 | localStorage 业务状态：`workspace_type:${projectId}`（高风险）+ `lastActiveProjectId`（中风险） | 高 |
| S2 | `ReviewStatus`（ready/review/needs_material/exported）与 `QualityGateStatus`（ready/review/degraded/not_recommended/blocked）两套并存 | 中 |
| S3 | `AppShell` 的 `projectId` prop 与 `useCurrentProjectId()` URL 解析双真理源 | 中 |
| S4 | `useWorkspaceType` hook 的 storage 事件监听仅跨窗口生效，同标签页内不自动刷新 | 低 |

---

## 7. Recommended Roadmap

### P0：必须立即修（最多 5 项）

#### P0-1. 修复自媒体平台评分数据失真

- **为什么必须修**：公众号/小红书/知乎结果页展示的 6 维分数全为 0，用户看到的是假数据，直接摧毁客户信任。
- **涉及文件**：`backend/app/services/scoring_service.py` L17-143、`backend/app/models/content_score.py` L25-31
- **是否需要改 API**：否——`score_summary_from_score` 返回结构不变，只是数据来源从固定列改为 `dimension_comments`
- **是否需要改数据库**：否——`dimension_comments` JSON 列已存全量维度数据
- **风险**：低——修改 `score_summary_from_score` 逻辑，优先从 `dimension_comments` 重建，固定列作为 fallback
- **最小修复**：`score_summary_from_score` 改为始终从 `dimension_comments` 重建 dimensions 数组，而非从 6 个固定列读

#### P0-2. workspace_type 持久化到后端

- **为什么必须修**：workspace_type 丢失后全站文案/默认值/知识库模板错位，用户换浏览器即触发。
- **涉及文件**：`backend/app/models/project.py`、`backend/app/schemas/project.py`、`backend/app/api/projects.py`、`frontend/src/common/workspace.ts`、`frontend/src/hooks/useWorkspaceType.ts`
- **是否需要改 API**：是——Project 的 create/update/response 需要包含 workspace_type
- **是否需要改数据库**：是——Project 表新增 `workspace_type` 列（或 `metadata` JSON 列）
- **风险**：中——需要 Alembic 迁移 + 前端从 API 读取而非 localStorage
- **最小修复**：Project 表新增 `workspace_type String(20) DEFAULT 'brand'`，前端创建工作区时传给后端，读取时从 API 取

#### P0-3. Quality Gate 阈值平台化

- **为什么必须修**：官网降 8 分和公众号降 8 分严重度不同，同一套阈值会导致自媒体平台频繁误判"不建议发布"。
- **涉及文件**：`frontend/src/lib/qualityGate.ts` L130-148、`frontend/src/pages/RewriteResultPage.tsx` L636
- **是否需要改 API**：否
- **是否需要改数据库**：否
- **风险**：低
- **最小修复**：`getQualityGate` 增加 `platform` 参数，官网 `-8/-3`，自媒体 `-5/-2`；`getQualityGateFromOutput` 传入 platform

#### P0-4. 导出后 review_status 不应不可逆变更

- **为什么必须修**：导出 Markdown 后 `review_status` 永久变为 `exported`，"建议检查"标签消失，用户无法回到复核状态。
- **涉及文件**：`backend/app/api/export.py` L37
- **是否需要改 API**：否
- **是否需要改数据库**：否
- **风险**：低
- **最小修复**：移除 `output.review_status = "exported"` 副作用，或改为仅在当前为 `ready` 时才标记（不降级已有状态）

#### P0-5. 多平台提交改为并行 + 部分失败处理

- **为什么必须修**：当前串行创建 N 个 task，中途失败不回滚，已创建的任务残留，用户跳转失败但任务已部分存在。
- **涉及文件**：`frontend/src/pages/NewRewritePage.tsx` L123-133
- **是否需要改 API**：否
- **是否需要改数据库**：否
- **风险**：低
- **最小修复**：改为 `Promise.allSettled`，全部完成后检查失败项，展示"N 个平台成功，M 个失败"提示

---

### P1：下一阶段增强（5-8 项）

| # | 增强项 | 涉及文件 | 复杂度 |
|---|--------|----------|--------|
| P1-1 | 单篇长文章导入增强——字数/段落/标题/阅读时长统计面板 + 草稿暂存 + 确认母稿步骤 | `NewRewritePage.tsx`、新增 `ArticleImportWorkbench` 组件 | 中 |
| P1-2 | 先诊断评分模式——在文章入口增加"仅评分诊断，不改写"选项，复用 Call 1，展示诊断结果后再决定是否改写 | `NewRewritePage.tsx`、`rewrite_service.py`、新增诊断结果展示组件 | 中 |
| P1-3 | 文章确认页——粘贴后展示字数/段落/标题/阅读时长，确认后再进入平台选择 | `NewRewritePage.tsx` | 中 |
| P1-4 | 轻量 Content Inbox——支持粘贴正文 + 上传 docx/html/txt，不做成完整批量系统 | `InboxPage.tsx` | 中 |
| P1-5 | workspace_type 持久化后的前端适配——从 API 读取而非 localStorage，`useWorkspaceType` 改为基于 API 数据 | `workspace.ts`、`useWorkspaceType.ts`、`Sidebar.tsx` | 低 |
| P1-6 | RewriteConfigPanel Schema 开关按平台禁用——非官网平台隐藏或禁用 Schema 开关 | `RewriteConfigPanel.tsx` L193-195 | 低 |
| P1-7 | 状态机加 `started_at` + 看门狗——task 卡 running 超过 5 分钟自动标记 failed | `rewrite_task.py` ORM、`rewrite_service.py` | 中 |
| P1-8 | `platformScorecard.ts` 维度映射语义修正——WECHAT_DIMENSION_MAP Schema→转发收藏价值错配改为丢弃 | `platformScorecard.ts` L156-172 | 低 |

---

### P2：暂缓

以下方向暂时不要做：

- 批量导入完整系统（多文件批量解析 + 批量改写队列）
- PDF OCR 解析
- 公众号链接稳定抓取（授权/访问/版权/解析失败风险未解决）
- 自动发布到各平台
- 真实图片生成（小红书图文卡片）
- 权限系统 / RBAC / 多账号
- 复杂数据 Dashboard（图表/趋势/对比）
- 继续扩展新平台（微博/抖音/LinkedIn 等已有 Prompt 但前端未暴露的平台）
- Content Inbox 作为主入口（应作为高级能力，不替代单篇导入主流程）
- 完整 Prompt 重构（"品牌事实"→可区分输入类型）——当前 Prompt 可用，延后到 P1-2 实现后再评估

---

## 8. Suggested Next Development Window

```text
建议窗口名称：评分数据修复 + 文章导入增强窗口

目标：
1. 修复自媒体平台评分数据失真（P0-1）——让公众号/小红书/知乎结果页展示真实平台化维度分数
2. workspace_type 持久化到后端（P0-2）——消除 localStorage 单点依赖
3. Quality Gate 阈值平台化（P0-3）——自媒体平台不再误判"不建议发布"
4. 导出副作用修复（P0-4）——导出不再不可逆改变 review_status
5. 多平台提交并行化（P0-5）——消除串行阻塞和部分失败残留
6. 单篇长文章导入增强（P1-1）——字数/段落/标题/阅读时长统计 + 草稿暂存 + 确认母稿步骤

不做：
- 不重构 Prompt（"品牌事实"→可区分输入类型延后）
- 不做批量导入系统
- 不做 PDF OCR / 公众号链接抓取
- 不做自动发布 / 图片生成
- 不做权限系统
- 不扩展新平台
- 不重构 Project→Workspace 命名分层
- 不删除 dead code（ScoreRadarChart 等）——标记即可

涉及文件：
- backend/app/services/scoring_service.py
- backend/app/models/project.py
- backend/app/schemas/project.py
- backend/app/api/projects.py
- backend/app/api/export.py
- backend/alembic/versions/（新增迁移）
- frontend/src/lib/qualityGate.ts
- frontend/src/pages/NewRewritePage.tsx
- frontend/src/pages/RewriteResultPage.tsx
- frontend/src/common/workspace.ts
- frontend/src/hooks/useWorkspaceType.ts
- frontend/src/components/rewrite/RewriteConfigPanel.tsx
- 新增：frontend/src/components/rewrite/ArticleStatsPanel.tsx（字数统计面板）

验收标准：
1. 公众号/小红书/知乎结果页评分卡展示真实平台化维度分数（非全 0）
2. 创建工作区后换浏览器打开，workspace_type 不丢失
3. 公众号降 5 分不触发"不建议发布"
4. 导出 Markdown 后 review_status 不变为 exported
5. 多平台提交全部失败时无残留 task
6. 粘贴文章后展示字数/段落/标题/阅读时长，刷新页面草稿不丢失
7. npm run build + npx tsc --noEmit 零错误
8. 后端 python -c "from app.main import app" 正常加载
```

---

## 9. Verification Results

| 命令 | 结果 | 详情 |
|------|------|------|
| `npm run build` | ✅ 成功 | 2874 modules transformed，dist/index-QZc3LMRG.js 1,039 KB（gzip 318 KB），有 chunk 过大警告但非阻塞 |
| `npx tsc --noEmit` | ✅ 成功 | 零类型错误 |
| `python -c "from app.main import app; print(len(app.routes))"` | ✅ 成功 | 28 条路由正常加载 |

**无失败。** 所有验证命令通过。

---

## 10. Final Recommendation

### 下一步最应该做什么

**修复评分数据失真（P0-1）+ workspace_type 持久化（P0-2）。** 这两项直接影响用户信任和产品可用性，是进入 Beta 前的硬性前提。P0-1 修复成本最低（改 `scoring_service.py` 一个函数），收益最高。

### 当前是否应该继续加功能

**不应该。** 当前应先修复 P0 的 5 项问题，再做 P1-1（单篇长文章导入增强）。不要在评分数据失真的基础上继续叠加新功能。

### 当前是否应该新开 Trae 窗口

**建议新开。** 本轮审计已完成，下一轮是开发窗口（涉及代码修改），应在新的 Trae 窗口中进行，以保持审计与开发的上下文隔离。新窗口的目标和验收标准见第 8 节。

### 哪些方向先不要碰

1. **Prompt 大重构**（"品牌事实"→可区分输入类型）——当前 Prompt 可用，且 P0-1 修复后评分数据不再失真，Prompt 重构应延后到 P1-2（先诊断评分模式）实现后再评估。
2. **批量导入系统**——用户第一心智是"我有一篇文章要发好"，不是"我要管理一批素材"。先做单篇导入增强。
3. **新平台扩展**——微博/抖音/LinkedIn 等已有 Prompt 规则但前端未暴露，在 4 个核心平台（官网/公众号/小红书/知乎）体验打磨好之前不要扩展。
4. **Project→Workspace 命名重构**——当前有意分层（API 层叫 Project，UI 层叫 Workspace），重构成本高收益低，延后。
5. **ScoreRadarChart 删除**——虽然是 dead code，但不影响功能，标记即可，不必在 P0 窗口处理。
6. **Content Inbox 作为主入口**——应作为高级能力，不替代单篇导入主流程。
7. **PDF OCR / 公众号链接抓取**——授权/访问/版权/解析失败风险未解决，先支持粘贴正文和上传 docx/html/txt。
