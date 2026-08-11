# Content Asset Type Refactor P0 Report

## 1. 为什么从平台稿件升级为内容资产

GEO Rewrite Workbench 原以「具体平台稿件」（官网文章 / 公众号 / 小红书 / 知乎问答）为一级生成目标。该模型存在三个问题：

1. **平台绑定过深**：生成目标与发布渠道强耦合，难以覆盖品牌真实需要的内容资产形态（如新闻通稿、行业垂媒稿、客户案例）。
2. **小红书不可控**：小红书内容类型复杂、事实保真风险高，P0 不适合作为一级生成目标。
3. **资产语义缺失**：「平台稿件」是渠道思维，而品牌真正需要的是「内容资产」——可复用、可多渠道分发、可被 AI 引用的信源资产。

升级为「内容资产类型」后，生成目标从渠道转为资产形态，覆盖官网、媒体、问答、案例、自媒体 5 大场景，更贴近品牌实际内容生产需求。

---

## 2. 修改了哪些文件

### 前端（已完成于上一窗口）

| 文件 | 改动 |
|---|---|
| `frontend/src/types/index.ts` | 新增 `ContentAssetType` + `PublishTarget` 类型 |
| `frontend/src/common/constants.ts` | 新增 `CONTENT_ASSET_TYPES` 常量（6 类） |
| `frontend/src/common/workspace.ts` | 新增 `getDefaultAssetTypesByWorkspaceType` / `mapPlatformToAssetType` / `isDeprecatedPlatform` / `DEPRECATED_PLATFORM_LABEL` |
| `frontend/src/pages/NewRewritePage.tsx` | 工作台从平台选择改为内容资产类型选择 |
| `frontend/src/components/rewrite/RewriteConfigPanel.tsx` | 资产类型 chip 选择 + workspace_type 默认值 |
| `frontend/src/lib/platformScorecard.ts` | 新增 3 个维度映射（PRESS / INDUSTRY / CASE）+ `getDimensionMap` |
| `frontend/src/pages/RewriteResultPage.tsx` | 平台标签 → 资产类型标签 |
| `frontend/src/pages/MultiPlatformResultPage.tsx` | 「多平台内容包」→「内容资产包」 |
| `frontend/src/pages/HistoryPage.tsx` | 平台筛选器 → 资产类型筛选器 |
| `frontend/src/pages/InboxPage.tsx` | 文案清理 |
| `frontend/src/pages/ProjectOverviewPage.tsx` | 文案清理 + 资产类型映射 |
| `frontend/src/pages/ProjectListPage.tsx` | 文案清理 |
| `frontend/src/components/layout/Sidebar.tsx` | 「生成内容包」→「生成内容资产」 |
| `frontend/src/components/projects/WorkspaceFormDialog.tsx` | 文案清理 |
| `frontend/src/components/rewrite/PlatformPublishGuideView.tsx` | 文案 + 文档注释 |
| `frontend/src/components/rewrite/ResultInspector.tsx` | 文档注释更新 |
| `frontend/src/components/common/PlatformScorecard.tsx` | 文档注释更新 |

### 后端（本轮完成）

| 文件 | 改动 |
|---|---|
| `backend/app/prompts/references/platforms.md` | 新增 6 类内容资产类型规则段落 |
| `backend/app/prompts/rewrite-package.md` | 新增「内容资产类型适配规则」E-J 分支 + 输出契约 + 更新 Schema 判断逻辑 + 更新注意事项 |
| `backend/app/prompts/score-and-diagnose.md` | 新增 6 类资产类型评分维度 + 评分名称 + 更新 Schema 就绪度评估规则 |
| `backend/app/services/export_service.py` | 「发布平台」→「内容资产类型」+ 新增资产类型专属字段渲染 + Schema 章节标题调整 |

---

## 3. 新增 / 启用哪些内容资产类型

P0 启用 6 类内容资产类型：

| 资产类型 | 内部 key（复用 publish_platform 字段） | 对应旧平台 | 评分名称 |
|---|---|---|---|
| 自有官网内容 | `自有官网内容` | 官网文章 | GEO 信源就绪度 |
| 新闻通稿 / 权威背书稿 | `新闻通稿 / 权威背书稿` | （新增） | 权威传播就绪度 |
| 行业垂媒稿 | `行业垂媒稿` | （新增） | 行业语境适配度 |
| 问答型内容 | `问答型内容` | 知乎问答 | 问答覆盖度 |
| 案例 / 客户故事 | `案例 / 客户故事` | （新增） | 案例可信度 |
| 企业自媒体稿 | `企业自媒体稿` | 公众号 | 自媒体发布就绪度 |

---

## 4. 小红书如何移除

**用户可见产品中完全移除小红书**，具体措施：

1. **文章工作台**：`CONTENT_ASSET_TYPES` 常量不包含小红书，新建任务无法选择。
2. **默认选项**：`getDefaultAssetTypesByWorkspaceType` 不返回小红书。
3. **历史筛选**：`HistoryPage` 筛选器只渲染 `CONTENT_ASSET_TYPES`（6 类），不出现小红书。
4. **结果页**：`MultiPlatformResultPage` 对小红书旧任务显示「该资产类型已下线，无法重新生成」，不显示重试按钮。
5. **历史任务兼容**：`isDeprecatedPlatform('小红书')` 返回 `true`，`mapPlatformToAssetType('小红书')` 返回 `DEPRECATED_PLATFORM_LABEL = '已下线平台历史内容'`。
6. **不删除数据库历史数据**：小红书旧任务的 `publish_platform` 值保留，可查看但不允许重新生成。

**后端 Prompt 保留小红书分支（C. 小红书）**：仅用于历史任务兼容，新任务不会进入该分支。

---

## 5. 默认内容资产如何按 workspace_type 设置

通过前端辅助函数 `getDefaultAssetTypesByWorkspaceType(workspaceType)` 实现：

| workspace_type | 默认内容资产类型 |
|---|---|
| `brand` | 自有官网内容、企业自媒体稿 |
| `media` | 企业自媒体稿 |
| `professional` | 问答型内容、案例 / 客户故事、企业自媒体稿 |
| `agency` | 自有官网内容、新闻通稿 / 权威背书稿 |

实现位置：`frontend/src/common/workspace.ts`。未改数据库，未改 meta 配置。

---

## 6. Prompt 如何调整

### rewrite-package.md

1. **更新 `{{platform}}` 变量描述**：从「发布平台」改为「内容资产类型」，列出 P0 6 类 + 旧值兼容说明。
2. **更新 Schema / PlatformPublishGuide 判断逻辑**：自有官网内容生成 Schema JSON-LD，其他 5 类生成 PlatformPublishGuide。
3. **新增「内容资产类型适配规则」章节（E-J 分支）**：
   - E. 自有官网内容（对应旧 A）
   - F. 新闻通稿 / 权威背书稿（新增，含事实保真禁止项）
   - G. 行业垂媒稿（新增，含行业视角要求）
   - H. 问答型内容（对应旧 D）
   - I. 案例 / 客户故事（新增，含案例事实保真限制）
   - J. 企业自媒体稿（对应旧 B）
4. **每类资产定义专属输出契约**：资产类型专属字段（如 `headline_options` / `lead` / `key_facts` / `industry_angle` / `question_title` / `answer_summary` / `case_structure` / `missing_case_facts` / `opening_hook` / `cta`）写入 `schema_suggestions.json_ld`。
5. **保留旧 A-D 平台分支**：仅用于历史任务兼容，新任务走 E-J 分支。
6. **更新注意事项**：新增「内容资产类型优先」「案例事实保真」「新闻通稿事实保真」三条规则。

### score-and-diagnose.md

1. **更新 `{{platform}}` 变量描述**：同 rewrite-package.md。
2. **新增 6 类资产类型评分维度**：每类有专属 6 维评分名称和维度列表。
3. **更新 Schema 就绪度评估规则**：自有官网内容评估 Schema JSON-LD，其他 5 类评估 PlatformPublishGuide 就绪度。
4. **保留小红书评分维度**：仅用于历史任务兼容，标注「已下线，仅历史任务展示」。

### references/platforms.md

新增 6 类内容资产类型规则段落，每类包含用途说明、结构要求、限制项、输出契约。`get_platform_rules()` 可按资产类型名称精确提取规则文本。

---

## 7. 评分卡如何调整

### 评分名称调整

| 资产类型 | 评分名称 |
|---|---|
| 自有官网内容 | GEO 信源就绪度 |
| 新闻通稿 / 权威背书稿 | 权威传播就绪度 |
| 行业垂媒稿 | 行业语境适配度 |
| 问答型内容 | 问答覆盖度 |
| 案例 / 客户故事 | 案例可信度 |
| 企业自媒体稿 | 自媒体发布就绪度 |

### 前端实现

- `platformScorecard.ts` 新增 3 个维度映射（`PRESS_DIMENSION_MAP` / `INDUSTRY_DIMENSION_MAP` / `CASE_DIMENSION_MAP`）。
- `getDimensionMap(type)` 辅助函数按 scorecard type 选择正确的维度映射。
- `PlatformScorecardConfig` 新增 6 条配置（6 类新资产 + 4 类旧平台兼容）。
- 渲染方式：自有官网内容用雷达图（含 Schema 就绪度），其他 5 类用条形卡，小红书用 checklist（仅历史任务）。
- 小红书评分彻底从新建任务入口移除。

### 后端实现

- `score-and-diagnose.md` 定义了 6 类资产类型的专属评分维度。
- 后端评分维度仍存入固定 6 列（`factual_density` 等）+ `dimension_comments` JSON（承载资产类型专属维度名）。
- `ContentScore.score_summary_from_score` 优先从 `dimension_comments` 重建维度，固定 6 列仅作为 fallback。

---

## 8. 历史任务如何兼容

### 兼容映射规则

| 旧 platform 值 | 映射后资产类型 |
|---|---|
| 官网文章 | 自有官网内容 |
| 公众号 | 企业自媒体稿 |
| 知乎问答 | 问答型内容 |
| 小红书 | 已下线平台历史内容 |

### 实现方式

- **前端展示**：`mapPlatformToAssetType(platform)` 函数统一映射，历史列表 / 结果页 / 项目概览页均使用该函数。
- **后端 Prompt**：旧 A-D 平台分支保留，历史任务走旧分支；新任务走 E-J 资产类型分支。
- **不崩溃保证**：所有涉及 `publish_platform` 的前端组件均通过 `mapPlatformToAssetType` 处理，不会因旧值导致渲染异常。
- **小红书旧任务**：可查看（显示为「已下线平台历史内容」），但不允许重新生成（`MultiPlatformResultPage` 隐藏重试按钮）。

---

## 9. 多类型内容资产包如何展示

- `MultiPlatformResultPage` 标题从「多平台内容包（N 个）」改为「内容资产包（N 类）」。
- 每个资产卡片标签从「平台：XXX」改为「资产类型：XXX」，使用 `mapPlatformToAssetType` 映射。
- 小红书旧任务卡片标签显示「已下线平台历史内容」，badge 用 `muted` 样式。
- 导出文件名使用映射后的资产类型标签。
- 新建多类型内容资产包时，只能包含 P0 6 类（小红书不可选）。

---

## 10. 是否复用了旧 platform 字段

**是，复用了 `publish_platform` 字段。**

- 数据库字段 `rewrite_tasks.publish_platform`（`String(20)`）未改。
- 前端将新的资产类型名称（如「自有官网内容」「新闻通稿 / 权威背书稿」）直接作为 `publish_platform` 值提交。
- 所有 6 类资产类型名称均 ≤ 12 字符，满足 `String(20)` 约束。
- 后端 `prompt_service.get_platform_rules(platform)` 按资产类型名称从 `platforms.md` 提取规则，无需别名映射。

---

## 11. 是否新增字段

**否，未新增数据库字段。**

- 未新增 `asset_type` 字段。
- 未新增任何数据库列。
- 资产类型信息完全复用 `publish_platform` 字段传递。

---

## 12. 是否改 API

**否，未改 API 接口结构。**

- API 路径、请求方法、响应格式均未变。
- `publish_platform` 字段的值域从旧 4 类扩展为新 6 类 + 旧 4 类兼容，但字段本身不变。
- 前端提交任务时 `publish_platform` 传新值，后端原样存储和处理。

---

## 13. 是否改数据库

**否，未改数据库。**

- 未新增表。
- 未新增列。
- 未改列类型或约束。
- 未做数据库迁移。
- 历史数据完整保留。

---

## 14. 6 类内容资产的测试结果

### 后端规则提取测试

```
Backend imports OK
自有官网内容 rules: 225 chars
新闻通稿 rules: 394 chars
案例 rules: 290 chars
官网文章 (legacy) rules: 180 chars
```

所有 6 类资产类型 + 旧平台值的规则提取均正常。

### Prompt 契约覆盖

| 资产类型 | Prompt 分支 | 输出契约 | 评分维度 | 状态 |
|---|---|---|---|---|
| 自有官网内容 | E | Schema JSON-LD | GEO 信源就绪度 | ✓ |
| 新闻通稿 / 权威背书稿 | F | PlatformPublishGuide (Press) | 权威传播就绪度 | ✓ |
| 行业垂媒稿 | G | PlatformPublishGuide (Industry) | 行业语境适配度 | ✓ |
| 问答型内容 | H | PlatformPublishGuide (Q&A) | 问答覆盖度 | ✓ |
| 案例 / 客户故事 | I | PlatformPublishGuide (Case) | 案例可信度 | ✓ |
| 企业自媒体稿 | J | PlatformPublishGuide (WeChat) | 自媒体发布就绪度 | ✓ |

### 事实保真限制

- 新闻通稿：禁止假装媒体已报道 / 冒用官媒身份 / 编造采访和数据。
- 行业垂媒稿：禁止假装已被行业媒体报道 / 编造行业数据 / 虚构第三方评价。
- 案例 / 客户故事：禁止虚构客户名称、结果数据、合作细节；缺少事实时标注「待补充事实」。

---

## 15. 构建验证结果

| 验证项 | 命令 | 结果 |
|---|---|---|
| 后端 import | `.venv/bin/python -c "from app.services..."` | ✓ OK |
| 平台规则提取 | `get_platform_rules('自有官网内容')` 等 | ✓ 6 类 + 旧值均正常 |
| 前端类型检查 | `npx tsc --noEmit` | ✓ exit code 0 |
| 前端构建 | `npm run build` | ✓ built in 5.32s |

---

## 16. 仍存在的问题

1. **旧 PlatformPublishGuideView 组件**：仍按旧平台值（公众号 / 小红书 / 知乎问答）分支渲染。新资产类型的 PlatformPublishGuide 字段会走 `FallbackGuide`，虽然字段能显示但缺少专属卡片样式。P1 可扩展该组件支持新资产类型专属渲染。

2. **评分维度映射为示意性映射**：`PRESS_DIMENSION_MAP` / `INDUSTRY_DIMENSION_MAP` / `CASE_DIMENSION_MAP` 将旧 6 维后端列名映射为资产类型专属维度名，但后端 `ContentScore` 表结构未变。如果需要真正的资产类型专属评分存储，P1 需扩展 `dimension_comments` JSON 或新增评分表。

3. **后端 Prompt 未实测 LLM 生成**：本轮只验证了规则提取和构建，未实际调用 LLM 生成 6 类资产类型的内容。需要在真实 LLM 环境中验证 Prompt 契约的执行效果。

4. **小红书旧任务的 PlatformPublishGuideView**：仍保留小红书专属渲染分支（`XHSGuide`），用于历史任务展示。未删除，符合「不破坏旧任务读取」要求。

---

## 17. 下一步建议

### P1 优先

1. **扩展 PlatformPublishGuideView**：为 6 类新资产类型添加专属卡片渲染（如新闻通稿的 headline_options / lead / key_facts 独立卡片）。
2. **LLM 实测**：在真实 LLM 环境中测试 6 类资产类型的生成效果，验证 Prompt 契约执行率。
3. **评分维度真实化**：如果资产类型专属维度需要独立存储，扩展 `dimension_comments` JSON schema 或新增评分维度表。

### P2 可选

4. **暂不启用的高级资产类型**：专家观点 / 白皮书稿、对比 / 选型指南、视频 / 播客脚本、结构化资料 / AI 资料卡，可在 P2 按需启用。
5. **资产类型组合推荐**：根据 workspace_type 和原文类型，智能推荐适合的资产类型组合。
6. **多类型资产包导出**：支持一次性导出多类型内容资产包为合并文档。
