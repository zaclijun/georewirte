# GEO Rewrite Package 输出规范与 Prompt 调整计划

> 本文档基于 `rewrite-output-quality-audit.md` 的审计结论，结合最新产品决策（**Schema 按平台差异化**）制定。
> 范围：仅输出质量与结果页呈现，不改 API / 数据库 / Hooks / 业务逻辑。
> 核心原则：用现有字段承载「平台发布建议」，不新增表、不新增列、不新增接口。

---

## 一、平台与 Schema 的关系

### 1.1 决策矩阵

| 平台 | need_schema 默认 | Schema JSON-LD | 平台发布建议 | 说明 |
|------|------------------|----------------|--------------|------|
| 官网文章 | `true` | ✅ 生成 | ❌ 不生成 | Schema 是 GEO Rewrite Package 的一部分 |
| 官网服务页 | `true` | ✅ 生成 | ❌ 不生成 | 同上，类型可选 Service / LegalService |
| 公众号 | `false` | ❌ 不生成 | ✅ 生成 | 平台不支持结构化数据，转输出发布建议 |
| 知乎问答 / 知乎专栏 | `false` | ❌ 不生成 | ✅ 生成 | 同上 |
| 小红书 | `false` | ❌ 不生成 | ✅ 生成 | 同上 |
| 微博 / 抖音 / LinkedIn / X / YouTube / 行业媒体 / 新闻稿 | `false` | ❌ 不生成 | ✅ 生成 | 同上 |

### 1.2 优先级规则

1. **`need_schema=false` 是最高优先级**：无论平台是什么，只要用户显式关闭 `need_schema`，一律不生成 Schema，输出「平台发布建议」。
2. **平台规则次之**：当 `need_schema=true` 但平台是公众号/知乎/小红书等自媒体时，按平台规则执行——不生成 Schema，输出「平台发布建议」，并在 `comparison_summary` 中说明「该平台不支持 JSON-LD，已转为平台发布建议」。
3. **官网类平台 + need_schema=true**：正常生成 Schema。

### 1.3 字段承载策略（不改数据库）

当前 `RewriteOutput.schema_suggestions` 字段是 `JSON / nullable`，前端类型为 `SchemaSuggestion | null`：

```ts
interface SchemaSuggestion {
  type: string
  json_ld: Record<string, unknown>
}
```

**复用此字段承载「平台发布建议」**，不新增字段：

- 官网类平台：`schema_suggestions = { type: "Article + FAQPage", json_ld: {...} }`（保持现状）
- 自媒体平台：`schema_suggestions = { type: "PlatformPublishGuide", json_ld: {...} }`
  - `type` 固定为 `"PlatformPublishGuide"`
  - `json_ld` 字段名复用，但实际内容是「平台发布建议」结构化对象（见 1.4）

> 这样不改数据库 schema、不改 API 响应结构、不改前端类型定义，只改 Prompt 生成内容 + 前端按 `type` 分支渲染。

### 1.4 平台发布建议数据结构（复用 `schema_suggestions.json_ld`）

```json
{
  "type": "PlatformPublishGuide",
  "json_ld": {
    "platform": "公众号",
    "recommended_title": "推荐标题（平台适配版，区别于 final_article 的标题）",
    "opening_hook": "开头钩子，3 句话内，平台首屏可见",
    "paragraph_structure": ["段落1主题", "段落2主题", "段落3主题"],
    "tags": ["标签1", "标签2", "标签3"],
    "topics": ["#话题1#", "#话题2#"],
    "cover_suggestion": "封面建议：画面主体 / 文案 / 配色",
    "comment_prompt": "评论区引导话术",
    "platform_risks": ["平台风险提示1", "平台风险提示2"],
    "reusable_summary": "可复用摘要：80-120 字，供转发/描述/简介使用"
  }
}
```

> 所有字段均基于 `final_article` 内容生成，不引入新事实；如某字段不适用（如小红书无「话题」概念时可省略），保持字段集精简。

---

## 二、官网文章的 Rewrite Package 结构

### 2.1 Package 模块清单

| 模块 | 字段 | 必含 | 说明 |
|------|------|------|------|
| 1. 标题 | `title` | ✅ | 语义完整、含核心观点 |
| 2. 可发布正文 | `final_article` | ✅ | 纯净 Markdown，含独立摘要模块 |
| 3. FAQ | `faq_content` | ✅ | 6-8 个多样化问题，独立交付 |
| 4. Schema 建议 | `schema_suggestions` | ✅ | Article / FAQPage / BreadcrumbList / Service / LegalService |
| 5. 改后评分 | `score_after`（+ content_scores 表） | ✅ | 6 维 GEO Scorecard |
| 6. 优化策略 | `optimization_strategy` | ✅ | 分 high/medium/low |
| 7. 来源缺口 | `missing_sources` | ✅ | 具体到原文位置 + 来源类型 |
| 8. 前后对比 | `comparison_summary` | ✅ | 保留/增强/删减/风险 四段式 |
| 9. 改前评分 | `score_before`（+ content_scores 表） | ✅ | 6 维 GEO Scorecard |
| 10. 待补充事实 | `missing_facts` | ⚪ 可空 | 建议加入事实库的事实 |
| 11. 质量状态 | `review_status` | ✅ | ready / review / needs_material |

### 2.2 `final_article` 内部结构（官网文章）

```markdown
## 内容摘要

3-5 句话概括核心结论 + 适用边界 + 主要依据。

## 核心结论（或正文主体第一段）

结论先行，3 条要点。

## 案件事实 / 背景说明
...

## 争议焦点 / 关键问题
...

## 法院查明 / 机制分析
...

## 裁判结果 / 结论
...

## 法律依据 / 证据支持
...

## 风险指引 / 操作建议
...
```

**严禁出现**：`## FAQ`、`## 律师简介`、`## 律所简介`、`## 免责声明`、`Q1/Q2/Q3`、评分、策略、来源标记。

---

## 三、自媒体平台的 Rewrite Package 结构

### 3.1 Package 模块清单

| 模块 | 字段 | 必含 | 说明 |
|------|------|------|------|
| 1. 标题 | `title` | ✅ | 全平台通用的语义完整标题 |
| 2. 可发布正文 | `final_article` | ✅ | 平台适配后的 Markdown 正文 |
| 3. FAQ | `faq_content` | ✅ | 平台用户可能问的问题 |
| 4. 平台发布建议 | `schema_suggestions`（复用） | ✅ | `type=PlatformPublishGuide` |
| 5-11 | 同官网文章 | ✅ | 评分、策略、来源、对比、状态 |

### 3.2 `final_article` 内部结构（自媒体平台）

按平台特性调整，以公众号为例：

```markdown
## 内容摘要

3 句话内，移动端首屏可见。

## 开篇（钩子段）
...

## 主体（分段清晰，每段单一主题）
...

## 收尾（CTA 或互动引导）
...
```

**小红书特化**：清单式、场景化、大白话。
**知乎特化**：问题开篇、明确结论、严密论证。
**公众号特化**：紧凑段落、过渡句、章节节奏感。

### 3.3 平台发布建议必含字段

- 推荐标题（与 `title` 可不同，平台适配版）
- 开头钩子
- 段落结构（3-5 个主题）
- 标签 / 话题
- 封面建议
- 评论区引导
- 平台风险提示
- 可复用摘要

---

## 四、`final_article` 纯净性规则

### 4.1 铁律（适用于所有平台）

`final_article` 字段**只允许**包含：

1. 独立摘要模块（`## 内容摘要` 或 `> **核心结论**：...`）
2. 正文主体（按平台规则组织）
3. 法律依据 / 证据支持 / 操作建议（如适用）

### 4.2 严禁清单（负面清单）

`final_article` **严禁出现**以下任何内容：

| 类型 | 严禁项 | 应去哪里 |
|------|--------|----------|
| FAQ | `## FAQ`、`## 常见问题`、`### 问题1？`、`Q1/Q2/Q3` | `faq_content` |
| 律师/品牌简介 | `## 律师简介`、`## 律所简介`、`## 品牌简介` | `comparison_summary` 附注 或 前端独立区块 |
| 免责声明 | `## 免责声明` | `comparison_summary` 附注 或 前端独立区块 |
| 评分 | 任何分数、维度诊断 | `score_after` / `content_scores` |
| 优化策略 | issue / action / priority | `optimization_strategy` |
| 来源标记 | `[需补充来源]`、`（待补）` | `missing_sources` |
| Schema | `## Schema`、JSON-LD 代码块 | `schema_suggestions` |
| 平台发布建议 | 推荐标题、标签、封面建议等 | `schema_suggestions`（type=PlatformPublishGuide） |
| 前后对比 | 改写摘要 | `comparison_summary` |
| 过程性文字 | 「好的」「以下是」「我来分析」 | 删除 |

### 4.3 摘要模块强制要求

`final_article` **必须**以摘要模块开头：

- 推荐格式：`## 内容摘要` + 3-5 句话
- 备选格式：`> **核心结论**：...` 引用块
- 摘要必须包含：核心结论 + 适用边界 + 主要依据
- 长度：80-200 字（官网文章）/ 50-120 字（自媒体，移动端首屏可见）

### 4.4 律师简介 / 免责声明的处理

这是当前真实 output 的硬伤。处理方案：

- **不放入 `final_article`**（铁律）
- **不放入 `faq_content`**
- **放入 `comparison_summary` 末尾**作为「附注」段，格式：

  ```markdown
  保留项：...
  增强项：...
  删减项：...
  风险处理：...
  
  ---
  
  **附：发布附属信息**
  
  - 律师简介：[原文简介内容]
  - 律所简介：[原文简介内容]
  - 免责声明：[原文免责声明]
  ```

- 前端在「原文对比」Tab 已有 comparison_summary 卡片，可渲染这段附注；不新增字段。

---

## 五、FAQ 是否应该进入正文

### 5.1 决策：FAQ 不进入正文

- `final_article` 严禁包含 FAQ 模块。
- FAQ 独立放在 `faq_content` 字段。
- 结果页「FAQ」Tab 独立展示。
- 导出 Markdown 里 FAQ 作为独立章节（`## FAQ`），不与正文混排。

### 5.2 理由

1. **AI 抽取效率**：生成式 AI 优先抽取「最容易结构化解析的内容块」。FAQ 作为独立结构（`### 问题` + 答案）被抽取的概率远高于混在正文里。
2. **交付清晰度**：客户拿到的 Package 应该是「正文 + 附件」的清晰分层，正文是可发布稿，FAQ 是辅助材料。
3. **避免重复**：当前真实 output 里 FAQ 在正文出现一次（Q1-Q3）、在 faq_content 又出现一次（6 个 `### 问题`），两份内容还不一致——这是 prompt 约束失效的直接后果。
4. **Schema 配合**：FAQ 独立后，可直接生成 `FAQPage` Schema（官网类平台）或作为平台发布建议的「评论区引导」素材（自媒体平台）。

### 5.3 FAQ 内容要求

6-8 个问题，必须包含至少：

- 1 个**对比型**（A 与 B 如何区分）
- 1 个**参数型**（需要哪些具体凭证 / 条件）
- 1 个**场景型**（在 XX 场景下如何处理）
- 答案必须引用法律条款编号或正文段落，禁止纯复述。
- 问题要真实，是读者可能会问的，不是凑数。

---

## 六、Schema / 平台发布建议如何二选一

### 6.1 判断流程

```
need_schema = false ?
  ├─ 是 → 输出「平台发布建议」（type=PlatformPublishGuide）
  └─ 否 → 平台 ∈ {官网文章, 官网服务页} ?
            ├─ 是 → 输出 Schema JSON-LD
            └─ 否 → 输出「平台发布建议」（type=PlatformPublishGuide）
```

### 6.2 字段承载

- **两种输出都放在 `schema_suggestions` 字段**（复用，不新增字段）
- 通过 `type` 字段区分：
  - Schema：`type = "Article + FAQPage"` / `"Service"` / `"LegalService"` 等
  - 平台发布建议：`type = "PlatformPublishGuide"`
- 前端按 `type` 分支渲染（见第七节）

### 6.3 comparison_summary 中的说明

当 `need_schema=true` 但平台是自媒体时，`comparison_summary` 必须包含一句：

> 「该平台（公众号/知乎/小红书）不支持 JSON-LD 结构化数据，已将 Schema 区块替换为平台发布建议，包含推荐标题、开头钩子、标签、封面建议等。」

---

## 七、需要修改哪些 Prompt

### 7.1 `system-role.md`（必改）

**新增**：

1. **「产出物定位」段**：你输出的不是一篇文章，而是一份**企业级 GEO Rewrite Package**，包含可发布正文、FAQ、Schema/平台发布建议、评分诊断、优化策略、来源缺口六大模块，每个模块独立交付、不得互相污染。
2. **「铁律：交付纯净性」段**：`final_article` 字段只允许出现正文主体（标题+摘要+正文+法律依据+风险指引），严禁混入 FAQ、律师简介、免责声明、评分、策略、来源标记等。FAQ 只能出现在 `faq_content`。
3. **「平台差异化」段**：
   - 官网类平台（官网文章 / 官网服务页）：生成 Schema JSON-LD
   - 自媒体平台（公众号 / 知乎 / 小红书 等）：不生成 Schema，输出平台发布建议
   - `need_schema=false` 时无论平台一律输出平台发布建议
4. **「高质量保护模式边界」段**：高质量原文（≥80）不等于「原样保留」，仍需补齐独立摘要、实体属性增强、Schema/平台建议补全、来源缺口识别四项交付包元信息。

### 7.2 `score-and-diagnose.md`（必改）

**调整**：

1. **强制量化诊断**：每个维度 comment 必须包含至少 1 个量化指标（数据声明数 / 缺来源数 / H2 模块数 / 标题语义完整度等）。
2. **高质量原文诊断策略**：overall≥80 时，诊断重点转向「交付包就绪度」——指出 2-3 个具体待补强点（如缺独立摘要、Schema 实体属性单薄、来源缺口未识别）。
3. **hard_blockers vs source_gaps 分离**：
   - hard_blockers = 必须修正才能发布（编造事实、过程文字混入终稿、事实矛盾）
   - source_gaps = 可补强但不阻断发布（原文有数据但缺可验证来源链接）
4. **降分必须解释**：任何维度 after < before，必须在 comment 里说明原因。
5. **Schema 就绪度维度按平台差异化**：
   - 官网类：评估 Article / FAQPage / BreadcrumbList 等结构化数据就绪度
   - 自媒体：评估「平台发布建议」就绪度（推荐标题、钩子、标签、封面等是否齐备）

### 7.3 `rewrite-package.md`（必改，最关键）

**调整**：

1. **final_article 纯净性负面清单**（最高优先级）：
   - 在 `final_article` 字段说明里，用负面清单列出严禁出现的内容：`## FAQ`、`## 常见问题`、`## 律师简介`、`## 律所简介`、`## 免责声明`、`Q1/Q2/Q3`、评分、策略、来源标记。
   - 律师简介 / 免责声明放入 `comparison_summary` 末尾「附：发布附属信息」段。

2. **强制独立摘要模块**：`final_article` 必须以 `## 内容摘要` 或 `> **核心结论**：...` 开头。

3. **FAQ 多样化**：6-8 个，必含对比型 / 参数型 / 场景型各 1 个，答案引用法律条款或正文段落。

4. **Schema / 平台发布建议二选一**：
   - 新增「平台判断」段：按 `need_schema` + 平台类型决定输出 Schema 还是平台发布建议
   - Schema 输出格式：保持现状（`type` + `json_ld`）
   - 平台发布建议输出格式：`type="PlatformPublishGuide"`，`json_ld` 承载结构化建议对象（见 1.4）

5. **Schema 实体属性增强**（官网类）：
   - `author` 必须含 `jobTitle`、`knowsAbout`（基于正文事实）
   - `publisher` 必须含 `areaServed`、`description`
   - `articleBody` 不得是压缩文本，改为分段结构或省略（用 `description` + `about` 代替）
   - 法律类内容考虑 `citation` 字段引用法条编号

6. **平台发布建议字段集**（自媒体）：
   - `recommended_title` / `opening_hook` / `paragraph_structure` / `tags` / `topics` / `cover_suggestion` / `comment_prompt` / `platform_risks` / `reusable_summary`
   - 所有内容基于 `final_article` 生成，不引入新事实

7. **missing_sources 具体化**：基于原文逐段扫描，列出所有「原文提到但缺可验证来源」的具体声明，格式为「[声明内容]（原文位置）— 建议补充 [来源类型]」。

8. **高质量保护模式细化**：is_high_quality=true 时，必须执行四项轻量增强（独立摘要、实体属性、Schema/平台建议补全、来源缺口），不得以「保留原文」为由跳过。

9. **comparison_summary 结构化**：拆成「保留项 / 增强项 / 删减项 / 风险处理」四段，每段 1-2 句；末尾可附「发布附属信息」（律师简介 / 免责声明等）。

10. **平台适配规则更新**：
    - 官网文章：知识库式稳定结构（定义→能力→场景→证据→FAQ）
    - 官网服务页：服务定义→能力→流程→案例→FAQ
    - 公众号：移动端叙事，紧凑段落，章节节奏
    - 知乎问答：问题开篇→明确结论→论证→选择标准→注意事项
    - 小红书：清单式、场景化、大白话

### 7.4 `quality-check.md`（必改，建议启用轻量自检）

**调整**：

1. **新增「交付纯净性」硬检查**：检测 `final_article` 是否混入 FAQ / 简介 / 免责声明 / 评分 / 策略，发现则 quality_status 强制降级为 `needs_material`。
2. **新增「摘要存在性」检查**：`final_article` 必须以摘要模块开头。
3. **新增「Schema/平台建议匹配性」检查**：
   - 官网类平台 + need_schema=true：必须有 Schema JSON-LD
   - 自媒体平台 或 need_schema=false：必须有 PlatformPublishGuide
4. **P0 轻量自检模式**：建议在 P0 把 quality-check 改为「轻量自检」，只跑纯净性 + 摘要存在性 + 实体一致性 + Schema/平台建议匹配性四项（成本可控），不跑全量防幻觉。
5. **降分合理性检查**：若 after < before 在任一维度，要求 quality-check 给出合理性判断。

### 7.5 `output-json.md`（不改）

P0 备用，后端用 `export_service.py` 代码组装，不调用此 prompt。

### 7.6 `references/platforms.md`（建议小改）

补充各自媒体平台的「发布建议字段集」提示，让 Prompt 在生成平台发布建议时有据可依。不改变平台规则本身，只补充字段提示。

---

## 八、是否需要修改前端页面展示

### 8.1 需要改（仅展示层，不改数据流）

| 组件 | 改动点 | 优先级 |
|------|--------|--------|
| `RewriteResultPage.tsx` | ① Schema Tab 改为动态：按 `schema_suggestions.type` 分支渲染（Schema JSON-LD / 平台发布建议）<br>② 正文 Tab 顶部增加「交付头条」区块（标题 + 元信息 + GEO 摘要）<br>③ HeroBand 移除「真实 API」Badge，增加发布建议文案 + GEO 摘要<br>④ 正文混入提示条（检测到 `## FAQ`/`## 律师`/`## 免责声明` 时提示） | P0 |
| `ResultInspector.tsx` | ① 顶部新增「交付包结构」卡片（6 大模块状态）<br>② 雷达图提升点高亮（after>before 主色 +N，after<before 警示色 -N）<br>③ 优化策略按 priority 分组<br>④ 待补充来源加类型标签<br>⑤ 待补充事实空态优化 | P0 |
| `MarkdownRenderer.tsx` | ① callout 支持（核心结论 / 风险提示 / 法律依据）<br>② 目录自动生成（H2 ≥ 4 时）<br>③ 数据高亮（案号 / 金额 / 法条编号）<br>④ 表格美化 | P0 |
| **新增组件**（可选） | `PlatformPublishGuideCard.tsx`：渲染平台发布建议（推荐标题 / 钩子 / 标签 / 封面等），替代 Schema Tab 在自媒体场景下的展示 | P1 |

### 8.2 Schema Tab 动态化方案

当前 Schema Tab 写死渲染 `schema_suggestions.json_ld`。改为：

```tsx
// 伪代码，仅说明思路
const suggestion = output.schema_suggestions
if (!suggestion) return <空态/>
if (suggestion.type === 'PlatformPublishGuide') {
  return <PlatformPublishGuideCard guide={suggestion.json_ld} />
}
return <SchemaJsonLdView jsonLd={suggestion.json_ld} type={suggestion.type} />
```

Tab 标签也动态化：
- 官网类：`Schema`
- 自媒体：`平台发布建议`

### 8.3 不改的部分

- AppShell / TopBar / Tabs 框架结构保留
- 所有 Hooks 不变
- 类型定义不变（`SchemaSuggestion` 接口已能承载两种形态）
- API 调用不变

---

## 九、是否需要修改后端字段

### 9.1 数据库：不改

`rewrite_outputs` 表的 `schema_suggestions` 字段已是 `JSON / nullable`，能承载 Schema JSON-LD 和 PlatformPublishGuide 两种内容。**不新增列**。

### 9.2 模型层：不改

`RewriteOutput` SQLAlchemy 模型字段定义不变。

### 9.3 API：不改

- `/api/outputs/{id}` 响应结构不变
- `/api/outputs/{id}/export` 仍返回文件流
- 统一响应格式 `{ code, message, data }` 不变

### 9.4 Service 层：小改（属展示层优化，不算改 API）

| 文件 | 改动 | 说明 |
|------|------|------|
| `export_service.py` | `build_markdown` 分区逻辑：<br>① 检测 `schema_suggestions.type`，渲染为「Schema 建议」或「平台发布建议」<br>② 调整模块顺序为「基本信息→交付摘要→改写正文→FAQ→Schema/平台建议→评分→策略→来源缺口→对比」<br>③ comparison_summary 末尾的「附：发布附属信息」单独成段 | 不改 API 路径，只改导出文件内容组织 |
| `scoring_service.py` | after 评分若低于 before，在 dimension_comments 里强制要求解释 | 配合 prompt 的降分解释 |

### 9.5 类型定义：不改

前端 `SchemaSuggestion` 接口已是 `{ type: string, json_ld: Record<string, unknown> }`，能承载两种形态。后端 Pydantic schema 同理。

---

## 十、最小执行方案

### 10.1 执行顺序（建议分三步）

#### Step 1：Prompt 改造（核心，无前端依赖）

| 文件 | 改动 | 验证 |
|------|------|------|
| `backend/app/prompts/system-role.md` | 交付包定位 + 纯净性铁律 + 平台差异化 + 高质量保护模式边界 | 重跑任务，检查 LLM 是否理解新角色 |
| `backend/app/prompts/score-and-diagnose.md` | 量化诊断 + 高质量原文策略 + hard_blockers/source_gaps 分离 + 降分解释 + Schema 就绪度按平台 | 检查 before 评分 comment 是否量化 |
| `backend/app/prompts/rewrite-package.md` | final_article 纯净性负面清单 + 强制摘要 + FAQ 多样化 + Schema/平台建议二选一 + Schema 实体增强 + 平台发布建议字段集 + missing_sources 具体化 + comparison_summary 结构化 | **重跑法律案例任务**，验证 10.3 验收清单 |
| `backend/app/prompts/quality-check.md` | 交付纯净性硬检查 + 摘要存在性 + Schema/平台建议匹配性 + P0 轻量自检 | 启用轻量自检，检查能否拦住纯净性问题 |
| `backend/app/prompts/references/platforms.md` | 补充自媒体平台发布建议字段提示 | 检查 Prompt 能否正确生成字段 |

#### Step 2：前端展示优化（依赖 Step 1 的新字段内容）

| 文件 | 改动 | 验证 |
|------|------|------|
| `frontend/src/components/common/MarkdownRenderer.tsx` | callout + 目录 + 数据高亮 + 表格美化 | 正文 Tab 视觉交付感提升 |
| `frontend/src/components/rewrite/ResultInspector.tsx` | 交付包结构卡 + 雷达提升高亮 + 策略分组 + 来源类型标签 + 空态优化 | 右侧面板有诊断专业感 |
| `frontend/src/pages/RewriteResultPage.tsx` | 交付头条 + HeroBand 优化 + 正文混入提示 + Schema Tab 动态化 | 首屏有交付包感，Schema/平台建议 Tab 自适应 |
| `frontend/src/components/rewrite/PlatformPublishGuideCard.tsx`（新增，可选） | 渲染平台发布建议 | 自媒体平台 Tab 内容正确 |

#### Step 3：后端 Service 层小改（可选，属交付物呈现优化）

| 文件 | 改动 | 验证 |
|------|------|------|
| `backend/app/services/export_service.py` | build_markdown 分区优化 + Schema/平台建议分支渲染 | 导出 Markdown 结构清晰 |
| `backend/app/services/scoring_service.py` | 降分解释强制 | 配合 prompt |

### 10.2 不做清单（明确边界）

- ❌ 不新增数据库表 / 列
- ❌ 不改 API 路径 / 请求响应结构
- ❌ 不改 Hooks（useTaskDetail / useRewriteOutputs / useOutputDetail 等）
- ❌ 不改 LLMService（调用方式 / 重试 / 日志不变）
- ❌ 不改 PromptService（文件加载 / 变量插值不变）
- ❌ 不改 `output-json.md` prompt（P0 备用）
- ❌ 不新增业务功能（版本对比 / 协作 / 发布队列 / SSE 流式 / 多账号等）
- ❌ 不重构 UI 框架（AppShell / TopBar / Tabs 结构保留）
- ❌ 不改前端类型定义（`SchemaSuggestion` 接口已能承载两种形态）
- ❌ 不改 `references/perspectives.md`（视角规则保持）

### 10.3 验收清单

改写后重新跑法律案例任务（官网文章平台），需满足：

1. `final_article` 不再包含 `## FAQ` / `## 律师` / `## 免责声明` / `Q1` 等非正文模块。
2. `final_article` 以 `## 内容摘要` 或 `> **核心结论**` 开头。
3. `missing_sources` 至少 4 条，每条指向原文具体声明 + 建议来源类型。
4. `schema_suggestions.json_ld` 的 `author` 含 `jobTitle` + `knowsAbout`，`articleBody` 不再是压缩文本。
5. `faq_content` 含至少 1 个对比型 + 1 个参数型 + 1 个场景型问题。
6. `comparison_summary` 拆成「保留项 / 增强项 / 删减项 / 风险处理」四段。
7. 律师简介 / 免责声明出现在 `comparison_summary` 末尾「附：发布附属信息」段。
8. 任何 after < before 的维度在 comment 里有降分解释。

再跑一次自媒体平台任务（如公众号），需满足：

9. `schema_suggestions.type === "PlatformPublishGuide"`。
10. `schema_suggestions.json_ld` 含 `recommended_title` / `opening_hook` / `tags` / `cover_suggestion` / `comment_prompt` / `platform_risks` / `reusable_summary` 等字段。
11. `comparison_summary` 含一句「该平台不支持 JSON-LD，已转为平台发布建议」。
12. 前端 Schema Tab 在自媒体任务下显示为「平台发布建议」，内容为结构化卡片。

### 10.4 风险与回滚

| 风险 | 应对 |
|------|------|
| Prompt 改造后 LLM 不遵守纯净性约束 | 启用 quality-check 轻量自检作为兜底；必要时在 LLMService 后处理时检测 `## FAQ` 等关键词并告警 |
| 平台发布建议字段不完整 | Prompt 里明确字段集 + 必填项；前端对缺失字段做空态处理 |
| 前端 Schema Tab 动态化后类型推断失败 | `SchemaSuggestion.json_ld` 保持 `Record<string, unknown>`，前端按 `type` 分支后做类型断言 |
| 历史数据（已生成的 output）schema_suggestions 是旧格式 | 前端兼容旧数据：`type` 非 `PlatformPublishGuide` 时走 Schema 渲染分支 |
| export_service 改动影响导出文件 | 改动前保留旧版本，灰度切换；导出文件不参与 API 契约，可快速回滚 |

---

## 附：字段承载映射表（一图看清）

| Package 模块 | 数据库字段 | 前端类型 | 官网类平台内容 | 自媒体平台内容 |
|--------------|-----------|----------|----------------|----------------|
| 标题 | `title` | `string` | 语义完整标题 | 语义完整标题 |
| 可发布正文 | `final_article` | `string` | 摘要 + 正文 + 法律依据 + 风险指引 | 摘要 + 平台适配正文 |
| FAQ | `faq_content` | `string` | 6-8 个多样化问题 | 6-8 个平台用户问题 |
| Schema / 平台建议 | `schema_suggestions` | `SchemaSuggestion` | `{type:"Article+FAQPage", json_ld:{...}}` | `{type:"PlatformPublishGuide", json_ld:{...}}` |
| 改前评分 | `content_scores` (score_type=before) | `ContentScore` | 6 维 GEO Scorecard | 6 维 GEO Scorecard |
| 改后评分 | `content_scores` (score_type=after) | `ContentScore` | 6 维 GEO Scorecard | 6 维 GEO Scorecard |
| 优化策略 | `optimization_strategy` | `OptimizationStrategyItem[]` | 分 high/medium/low | 分 high/medium/low |
| 来源缺口 | `missing_sources` | `string[]` | 具体到原文位置 + 来源类型 | 具体到原文位置 + 来源类型 |
| 前后对比 | `comparison_summary` | `string` | 四段式 + 附：发布附属信息 | 四段式 + 平台说明 |
| 待补充事实 | `missing_facts` | `MissingFactSuggestion[]` | 建议加入事实库 | 建议加入事实库 |
| 质量状态 | `review_status` | `ReviewStatus` | ready / review / needs_material | ready / review / needs_material |
