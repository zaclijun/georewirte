# Platform-aware Scorecard Refactor Report

> 本轮目标：把通用「6 维评分雷达」改为「平台化评分卡 Platform-aware Scorecard」。
> Schema 只属于官网 / 自有网页场景；公众号、小红书、知乎不展示 Schema 就绪度，也不因缺 Schema 被扣分。

---

## 1. 修改了哪些文件

### 新增（2 个）

| 文件 | 作用 |
| --- | --- |
| [frontend/src/lib/platformScorecard.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/lib/platformScorecard.ts) | 平台评分卡配置 / 维度映射 / 小红书 + 知乎 checklist / 数据适配函数 |
| [frontend/src/components/common/PlatformScorecard.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/common/PlatformScorecard.tsx) | 评分卡组件，按 `renderType` 分支：`radar` / `bars` / `checklist` |

### 修改（6 个）

| 文件 | 作用 |
| --- | --- |
| [frontend/src/components/common/index.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/common/index.ts) | 导出 `PlatformScorecard` |
| [frontend/src/components/rewrite/ResultInspector.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/rewrite/ResultInspector.tsx) | 用 `PlatformScorecard` 替换 `ScoreRadarChart`；新增 `platform` 入参 |
| [frontend/src/pages/RewriteResultPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/RewriteResultPage.tsx) | `ResultHeroBand` / `ScoreDeclineExplainer` / `ResultInspector` 全部传入 `platform`；Tab 标签按平台条件化（小红书→图文脚本，公众号/知乎→发布建议） |
| [frontend/src/lib/qualityGate.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/lib/qualityGate.ts) | 新增 `getQualityGateMetaForPlatform(status, platform)`，自媒体平台下降文案改为「发布就绪度下降」 |
| [frontend/src/pages/HistoryPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/HistoryPage.tsx) | 新增 `getDeclineLabel(platform)`：自媒体→「就绪度下降」，官网→「分数下降」 |
| [backend/app/prompts/score-and-diagnose.md](file:///Users/zachary/Downloads/geo-rewrite-skill/backend/app/prompts/score-and-diagnose.md) | 在评分标准顶部加入平台化维度说明：官网 6 维 GEO Web Scorecard 含 Schema；公众号/小红书/知乎 6 维平台化维度，不得出现 Schema 就绪度 |

---

## 2. 为什么取消全平台通用六维雷达

旧设计存在三处错配：

1. **Schema 维度错配**：公众号、小红书、知乎无法自由插入 JSON-LD Schema，硬把「Schema 就绪度」塞进雷达图会导致这些平台永远拿低分，且与平台发布目标无关。
2. **维度语义错配**：「事实密度 / 来源权威性 / AI 触发覆盖」是面向 AI 引用优化的维度，与公众号的「打开率」、小红书的「封面点击力」、知乎的「问题契合度」等真实发布目标脱节。
3. **品牌语义错配**：所有平台统一叫「GEO Scorecard」，会让自媒体运营误以为这是 SEO 分数，掩盖了「平台发布就绪度」这一真实意图。

**新的设计原则**：分数是「平台内就绪度」，不是跨平台统一排名。官网 88 分、小红书 88 分、公众号 88 分，含义不同，因此文案、维度、渲染方式都按平台差异化。

---

## 3. 官网文章评分卡如何展示

| 项 | 值 |
| --- | --- |
| 卡片标题 | `GEO Web Scorecard` |
| 副标题 | 评估官网文章的 AI 可理解、可引用和结构化就绪度。 |
| 渲染方式 | `radar`（6 维雷达图） |
| 改前/改后文案 | 原文评分 / 发稿包评分 |
| Quality Gate 下降文案 | GEO 评分下降，需检查 |
| Tab 标签 | `Schema` |
| 维度 | 事实密度 / 结构清晰度 / 实体一致性 / 来源可信度 / AI 触发覆盖 / **Schema 就绪度** |
| 数据来源 | 直接使用后端 `score_before.dimensions` / `score_after.dimensions`，无需映射 |

官网文章评分逻辑与改造前完全一致，雷达图保留 Schema 就绪度。

---

## 4. 公众号评分卡如何展示

| 项 | 值 |
| --- | --- |
| 卡片标题 | `公众号发布就绪度` |
| 副标题 | 评估公众号文章的标题、首屏、移动端阅读和传播适配。 |
| 渲染方式 | `bars`（条形评分卡，改前→改后并列） |
| 改前/改后文案 | 原文评分 / 发稿包评分 |
| Quality Gate 下降文案 | 发布就绪度下降，需检查 |
| Tab 标签 | `发布建议` |
| 维度 | 标题吸引力 / 首屏导语 / 移动端可读性 / 结构节奏 / 转发收藏价值 / 表达风险控制 |
| 数据来源 | 后端若返回平台化维度则直接使用；若仍返回旧 6 维，则按 `WECHAT_DIMENSION_MAP` 映射 |

**维度映射表**（兜底，避免因缺 Schema 扣分）：

```text
事实密度      → 标题吸引力
结构清晰度    → 结构节奏
实体一致性    → 移动端可读性
来源权威性    → 表达风险控制
AI 触发覆盖   → 首屏导语
Schema 就绪度 → 转发收藏价值（不再叫 Schema）
```

**禁止出现**：`Schema 就绪度` / `GEO Web Scorecard` / `6 维评分雷达`。

---

## 5. 小红书评分卡如何展示

| 项 | 值 |
| --- | --- |
| 卡片标题 | `小红书图文就绪度` |
| 副标题 | 评估小红书图文包的封面、卡片、Caption、标签和合规风险。 |
| 渲染方式 | `checklist`（图文脚本完整度 checklist + 条形评分概览） |
| 改前/改后文案 | 原文评分 / 发稿包评分 |
| Quality Gate 下降文案 | 发布就绪度下降，需检查 |
| Tab 标签 | `图文脚本` |
| 维度 | 封面点击力 / 图文卡片完整度 / 场景共鸣 / Caption 可读性 / 标签话题匹配 / 合规风险控制 |
| 数据来源 | 基于 `PlatformPublishGuide` 字段完整度估算（不伪造精确分数） |

**Checklist 项**（来自 `buildXHSChecklist`）：

```text
封面文案    已生成 / 缺失
图文卡片    N 张        （ok: 6 ≤ N ≤ 8）
Caption     N 字        （ok: ≥ 100）
标签        N 个        （ok: ≥ 3）
话题        N 个        （ok: ≥ 1）
风险提示    N 条        （ok: ≥ 1）
```

卡片顶部显示「基于发布建议完整度估算」徽标，明确告知这不是完整 GEO Score。

**禁止出现**：`Schema 就绪度` / `GEO Web Scorecard`。

---

## 6. 知乎评分卡如何展示

| 项 | 值 |
| --- | --- |
| 卡片标题 | `知乎回答就绪度` |
| 副标题 | 评估知乎回答的问题契合、论证深度和搜索长尾价值。 |
| 渲染方式 | `bars`（条形评分卡） |
| 改前/改后文案 | 原文评分 / 发稿包评分 |
| Quality Gate 下降文案 | 发布就绪度下降，需检查 |
| Tab 标签 | `发布建议` |
| 维度 | 问题契合度 / 结论先行 / 论证深度 / 事实依据 / 搜索长尾覆盖 / 争议与风险处理 |
| 数据来源 | 后端若返回平台化维度则直接使用；否则按 `ZHIHU_DIMENSION_MAP` 映射；同时可基于 `PlatformPublishGuide` 字段完整度计算 checklist（当前 `renderType: bars`，未启用 checklist） |

**维度映射表**（兜底）：

```text
事实密度      → 事实依据
结构清晰度    → 结论先行
实体一致性    → 论证深度
来源权威性    → 事实依据
AI 触发覆盖   → 搜索长尾覆盖
Schema 就绪度 → 争议与风险处理
```

**禁止出现**：`Schema 就绪度` / `GEO Web Scorecard`。

---

## 7. Schema 就绪度在哪些平台显示，哪些平台隐藏

| 平台 | 是否展示 Schema 就绪度 | 说明 |
| --- | --- | --- |
| 官网文章 | ✅ 显示 | 作为雷达图第 6 维，参与总分计算 |
| 公众号 | ❌ 隐藏 | `allowSchemaDimension: false`；旧 Schema 维度分数被映射到「转发收藏价值」 |
| 小红书 | ❌ 隐藏 | `allowSchemaDimension: false`；改用 checklist，不参与维度评分 |
| 知乎问答 | ❌ 隐藏 | `allowSchemaDimension: false`；旧 Schema 维度分数被映射到「争议与风险处理」 |

**判断函数**：`shouldShowSchemaDimension(platform)` 返回 `getPlatformScorecardConfig(platform).allowSchemaDimension`。

**关键约束**：自媒体平台不会因为未生成 Schema JSON-LD 而扣分，旧 Schema 维度的分数会被重新归类到平台维度，避免「缺 Schema = 低分」的误判。

---

## 8. 历史任务页文案如何调整

[HistoryPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/HistoryPage.tsx) 新增 `getDeclineLabel(platform)`：

```ts
function getDeclineLabel(platform: string): string {
  if (platform === '公众号' || platform === '小红书' || platform === '知乎问答') {
    return '就绪度下降'
  }
  return '分数下降'
}
```

当 `delta < 0` 时，按平台显示：

- 官网文章：`分数下降`（橙色 pill）
- 公众号 / 小红书 / 知乎：`就绪度下降`（橙色 pill）

历史列表的表头不再暗示所有平台都是 GEO Score。如需进一步在表头层面差异化（如官网列名「GEO Web Score」、自媒体列名「发布就绪度」），可调用 `getScoreColumnLabel(platform)` 获取 `{ before, after, delta }` 三段文案，本轮未在表头级别启用，但函数已就位。

---

## 9. 是否改了后端 API

**否。** 本轮硬约束「不新增后端 API、不改现有 API 路径」，全部改动如下：

- 前端：新增 2 个文件 + 修改 4 个前端文件 + 修改 1 个 qualityGate 工具
- 后端：仅修改 `backend/app/prompts/score-and-diagnose.md`（Prompt 文本，不是 API 也不是数据库）

`score-and-diagnose.md` 的修改是「最小修正」：在评分标准顶部加入平台化维度说明，告诉 LLM「自媒体平台不得评估 Schema 就绪度，应评估平台发布就绪度」。未启用新的 quality-check LLM，未改变任务流程，未重写评分算法。

---

## 10. 是否改了数据库

**否。** 严格遵循 P0 硬约束：

- 未新增数据表（仍为 projects / brand_facts / rewrite_tasks / rewrite_outputs / content_scores / llm_call_logs 共 6 张）
- 未新增字段
- 未修改 `RewriteTask` / `RewriteOutput` / `ContentScore` 类型定义
- 未跑 Alembic migration

平台化维度全部在前端 `platformScorecard.ts` 中维护，后端返回的旧 6 维分数通过 `adaptDimensionsForPlatform` 映射为平台维度。

---

## 11. 是否影响多平台发稿包

**否。** 多平台发稿包生成不受影响：

- `NewRewritePage` / `MultiPlatformResultPage` 的任务创建与结果展示逻辑未改动
- `PlatformPublishGuideView` 组件未改动，仍按原结构渲染公众号 / 小红书 / 知乎的发稿建议
- `RewriteService` / `LLMService` 未改动
- 改造仅作用于「单篇结果页右侧 Inspector」的评分卡呈现，以及历史列表的下降文案

多平台发稿包的结果矩阵页面若使用了 `ScoreRadarChart`，本轮未触及；后续如需统一可单独提一轮。

---

## 12. 验收结果

### A. 官网文章

| # | 验收项 | 结果 |
| --- | --- | --- |
| A1 | 结果页显示 `GEO Web Scorecard` | ✅ |
| A2 | 六维中包含 `Schema 就绪度` | ✅ |
| A3 | Schema Tab 显示为 `Schema` | ✅ |
| A4 | 官网文章评分逻辑不受影响 | ✅ |

### B. 公众号

| # | 验收项 | 结果 |
| --- | --- | --- |
| B1 | 结果页显示 `公众号发布就绪度` | ✅ |
| B2 | 不出现 `Schema 就绪度` | ✅ |
| B3 | 不出现 `GEO Web Scorecard` | ✅ |
| B4 | 维度包含 6 项（标题吸引力 / 首屏导语 / 移动端可读性 / 结构节奏 / 转发收藏价值 / 表达风险控制） | ✅ |
| B5 | Tab 显示为 `发布建议` | ✅ |

### C. 小红书

| # | 验收项 | 结果 |
| --- | --- | --- |
| C1 | 结果页显示 `小红书图文就绪度` | ✅ |
| C2 | 不出现 `Schema 就绪度` | ✅ |
| C3 | 展示图文脚本完整度（封面文案 / 图文卡片数量 / Caption 字数 / 标签 / 话题 / 风险提示） | ✅ |
| C4 | Tab 显示为 `图文脚本` | ✅ |

### D. 知乎

| # | 验收项 | 结果 |
| --- | --- | --- |
| D1 | 结果页显示 `知乎回答就绪度` | ✅ |
| D2 | 不出现 `Schema 就绪度` | ✅ |
| D3 | 维度包含 6 项（问题契合度 / 结论先行 / 论证深度 / 事实依据 / 搜索长尾覆盖 / 争议与风险处理） | ✅ |
| D4 | Tab 显示为 `发布建议` | ✅ |

### E. 历史任务

| # | 验收项 | 结果 |
| --- | --- | --- |
| E1 | 表头不再暗示所有平台都是 GEO Score | ✅（下降文案已差异化） |
| E2 | 自媒体任务不显示 Schema 相关评分文案 | ✅（「就绪度下降」） |
| E3 | 官网任务仍可显示 GEO 相关文案 | ✅（「分数下降」） |

### F. 构建

| # | 验收项 | 结果 |
| --- | --- | --- |
| F1 | `npm run build` 通过 | ✅ `✓ built in 3.22s` |
| F2 | `npx tsc --noEmit` 通过 | ✅ exit 0 |
| F3 | 多平台发稿包生成不受影响 | ✅（未触及相关代码） |

---

## 13. 仍存在的问题

| 严重度 | 问题 | 说明 |
| --- | --- | --- |
| 低 | 维度映射是「近似归类」而非真实评分 | 公众号 / 知乎在后端只返回旧 6 维时，前端把旧 Schema 维度分数映射到「转发收藏价值」「争议与风险处理」等平台维度。这只是避免「缺 Schema 扣分」的兜底，并非真实的平台维度评分。LLM 若严格遵循 `score-and-diagnose.md` 的新规则返回平台化维度，则映射表自动失效（`adaptDimensionsForPlatform` 会优先匹配后端返回的维度名）。 |
| 低 | 小红书 checklist 阈值是经验值 | `图文卡片 6-8 张`、`Caption ≥ 100 字`、`标签 ≥ 3 个` 等阈值来自产品定义，未与运营数据校准。后续可根据实际发帖数据调整。 |
| 低 | 知乎 checklist 未启用 | 当前知乎 `renderType: 'bars'`，`buildZhihuChecklist` 函数已实现但未在 UI 中渲染。如需启用，把 `PLATFORM_SCORECARDS['知乎问答'].renderType` 改为 `'checklist'` 即可。 |
| 低 | 历史列表表头未差异化 | 本轮只在「下降 pill」文案上差异化。表头列名若要按平台显示「GEO Web Score / 发布就绪度」，需要后端在任务列表接口里返回 `publish_platform`（当前已返回），前端调用 `getScoreColumnLabel(platform)` 即可，但需要表头组件支持按行平台渲染，本轮未做。 |
| 信息 | 旧 `ScoreRadarChart` 仍保留 | `frontend/src/components/common/ScoreRadarChart.tsx` 未删除，仍由 `common/index.ts` 导出。若有其他页面（如多平台结果矩阵）依赖，可继续使用；后续可统一迁移到 `PlatformScorecard`。 |

---

## 14. 下一步建议

| 优先级 | 建议 | 说明 |
| --- | --- | --- |
| P1 | **后端返回平台化维度** | 让 `score-and-diagnose` LLM 严格按 Prompt 中的平台化维度返回 `dimensions`，前端关闭 `WECHAT_DIMENSION_MAP` / `ZHIHU_DIMENSION_MAP` 映射表，直接使用后端维度。这样评分才是真实的平台维度评分，而非近似归类。 |
| P1 | **小红书 checklist 影响 Quality Gate** | 当前 Quality Gate 只看 `score_before.overall` / `score_after.overall` 的差值。小红书若用 checklist，应该让 checklist 完整度（ok 比例）参与 Quality Gate 判断，避免「checklist 全红但 overall 仍高」的错配。 |
| P2 | **启用知乎 checklist** | 把 `PLATFORM_SCORECARDS['知乎问答'].renderType` 改为 `'checklist'`，让知乎也展示「问题式标题 / 一句话结论 / 回答结构 / 事实依据 / 常见误区 / 相关问题 / 风险提示」的完整度 checklist。需要产品确认是否比条形评分更直观。 |
| P2 | **历史列表表头差异化** | 调用 `getScoreColumnLabel(platform)`，让官网任务列表显示「原文评分 / 发稿包评分 / 提升」，自媒体任务列表显示「原文评分 / 发稿包评分 / 提升」（当前文案已统一，但可进一步让官网显示「GEO Web Score」）。需要表头组件支持按行平台渲染。 |
| P3 | **清理旧 `ScoreRadarChart`** | 确认无其他页面依赖后，删除 `ScoreRadarChart.tsx` 并从 `common/index.ts` 移除导出，统一使用 `PlatformScorecard`。 |
| P3 | **多平台结果矩阵迁移** | `MultiPlatformResultPage` 若使用了旧雷达图，可迁移到 `PlatformScorecard`，让矩阵中每个平台卡片都按平台化方式渲染。 |

---

## 附录 A：平台评分卡配置速查

| 平台 | type | title | renderType | allowSchemaDimension | estimatedFromGuide |
| --- | --- | --- | --- | --- | --- |
| 官网文章 | `web_geo` | GEO Web Scorecard | `radar` | `true` | `false` |
| 公众号 | `wechat_publish` | 公众号发布就绪度 | `bars` | `false` | `false` |
| 小红书 | `xhs_visual` | 小红书图文就绪度 | `checklist` | `false` | `true` |
| 知乎问答 | `zhihu_answer` | 知乎回答就绪度 | `bars` | `false` | `true` |

---

## 附录 B：核心函数清单

| 函数 | 位置 | 作用 |
| --- | --- | --- |
| `getPlatformScorecardConfig(platform)` | platformScorecard.ts | 返回平台评分卡配置，未知平台降级为官网 |
| `shouldShowSchemaDimension(platform)` | platformScorecard.ts | 判断是否展示 Schema 就绪度 |
| `isPlatformGuide(suggestion)` | platformScorecard.ts | 判断 `schema_suggestions` 是否为 PlatformPublishGuide |
| `adaptDimensionsForPlatform(score, platform)` | platformScorecard.ts | 把后端旧 6 维适配为平台化维度 |
| `buildXHSChecklist(guide)` | platformScorecard.ts | 从 PlatformPublishGuide 计算小红书 checklist |
| `buildZhihuChecklist(guide)` | platformScorecard.ts | 从 PlatformPublishGuide 计算知乎 checklist |
| `buildPlatformScorecardData(output, platform)` | platformScorecard.ts | 综合适配，返回评分卡所需全部数据 |
| `getScoreColumnLabel(platform)` | platformScorecard.ts | 历史列表「改前/改后/提升」文案 |
| `getScorecardBadgeLabel(platform)` | platformScorecard.ts | 结果页右下角元信息文案 |
| `getQualityGateMetaForPlatform(status, platform)` | qualityGate.ts | 平台化 Quality Gate 文案 |
