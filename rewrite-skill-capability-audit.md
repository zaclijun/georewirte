# Rewrite Skill 能力盘点文档

> 审计日期：2026-06-26
> 审计范围：`/Users/zachary/Downloads/geo-rewrite-skill` 目录下所有代码与配置
> 审计方式：静态代码阅读，不修改任何文件

---

## 1. 当前功能概览

| 能力项 | 现状 | 说明 |
|--------|------|------|
| 输入内容类型 | 支持 | 接受自然语言或 YAML 结构化输入，包含原文、品牌、行业、视角等参数 |
| 输出内容类型 | 支持 | 默认输出 Markdown 格式；支持 JSON 结构化输出（供 API/产品集成） |
| GEO 改写 | ✅ 支持 | 基于 DSS+E 模型（Depth/Support/Sources/Entity）进行生成式引擎优化改写 |
| FAQ 生成 | ✅ 支持 | 输出包含 FAQ 章节，Schema 建议中含 FAQPage 结构 |
| 标题建议 | ✅ 支持 | 输出包含改写后标题，以及标题优化 |
| 摘要生成 | 当前未发现 | 输出结构中无独立摘要字段（正文改写包含完整内容） |
| 关键词提取 | 当前未发现 | 输入参数有关键词概念，但输出中无独立关键词字段 |
| 评分能力 | ✅ 支持 | 6 维 GEO Scorecard（0-100 分），支持改前/改后对比评分 |
| 多平台版本 | ✅ 支持 | 支持 11 种发布平台（官网文章/公众号/知乎/小红书/微博/抖音/LinkedIn/X/YouTube/行业媒体/新闻稿） |
| 品牌资料/事实库 | ⚠️ 部分支持 | 输入参数支持 `brand_facts` 品牌事实字段，但无持久化品牌知识库，每次需手动传入 |
| 历史记录 | 当前未发现 | 代码中无历史版本、任务记录相关逻辑 |
| 导出能力 | ⚠️ 部分支持 | 支持 JSON 结构化输出（可视为 API 导出），但无文件导出（PDF/Word/Markdown 文件下载）功能 |
| Schema 建议 | ✅ 支持 | 输出含 Schema 建议章节，支持 JSON-LD 或 Markdown 形式 |
| 来源策略 | ✅ 支持 | 三种 source_policy：`use_provided_only` / `allow_external_sources` / `mark_missing_sources` |
| 多视角切换 | ✅ 支持 | 9 种视角（品牌方/第三方/合作商/用户/投资者/政府/学术/媒体/内部） |
| 错误处理 | ⚠️ 基础 | 有硬性阻断（hard blockers）规则和缺失来源标记，但无系统级错误重试/降级机制 |
| 防幻觉 | ✅ 支持 | 明确禁止编造数据、案例、奖项、认证、日期、价格、客户名称、链接、法律声明等 |

---

## 2. 当前代码目录结构

```
geo-rewrite-skill/
├── SKILL.md                          # Skill 主定义文件（核心规则入口）
├── agents/
│   └── openai.yaml                   # Agent 配置（显示名称、默认 prompt、品牌色等）
└── references/
    ├── output-schema.md              # JSON 结构化输出 Schema 定义
    ├── perspectives.md               # 9 种视角的写作规则
    └── platforms.md                  # 11 种发布平台的写作规则
```

### 各文件作用说明

| 文件路径 | 类型 | 作用 |
|----------|------|------|
| [SKILL.md](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md) | 核心规则 / Prompt | Skill 的主入口文件，定义了：触发条件、输入参数、DSS+E 模型、GEO Scorecard、工作流、来源策略、输出格式、快速规则等。是整个 Skill 的"大脑"。 |
| [agents/openai.yaml](file:///Users/zachary/Downloads/geo-rewrite-skill/agents/openai.yaml) | Agent 配置 | Agent 元数据配置，包括显示名称、短描述、默认 prompt、品牌色、是否允许隐式调用等。 |
| [references/output-schema.md](file:///Users/zachary/Downloads/geo-rewrite-skill/references/output-schema.md) | 输出 Schema | 定义结构化 JSON 输出的完整字段结构，供 API/产品集成使用。包含改前评分、优化策略、终稿正文、改后评分、Schema 建议、前后对比、待补充来源、质量审核等字段。 |
| [references/perspectives.md](file:///Users/zachary/Downloads/geo-rewrite-skill/references/perspectives.md) | 视角规则模板 | 定义 9 种写作视角（品牌方、第三方、合作商、用户/客户、投资者、政府/监管、学术/科研、媒体/新闻、内部/员工）的语气、证据风格、实体侧重、推荐 Schema 类型等规则。 |
| [references/platforms.md](file:///Users/zachary/Downloads/geo-rewrite-skill/references/platforms.md) | 平台规则模板 | 定义 11 种发布平台（官网文章、公众号、知乎专栏、小红书、微博、抖音、LinkedIn、X/Twitter、YouTube、行业媒体、新闻稿）的内容结构、风格、长度等适配规则。 |

### 代码缺失模块（当前未发现）

| 模块 | 现状 |
|------|------|
| 前端页面 | 当前未发现（纯 Skill/Prompt 定义，无独立前端） |
| React/Vue 组件 | 当前未发现 |
| API 调用封装 | 当前未发现（依赖 Skill 运行时环境） |
| 后端接口 | 当前未发现 |
| 数据库模型 | 当前未发现 |
| 独立 LLM 调用逻辑 | 当前未发现（由 Skill 运行时统一管理） |
| 独立 Workflow/Agent 执行引擎 | 当前未发现（由 Skill 运行时统一管理） |
| 配置文件（环境变量等） | 当前未发现 |
| 工具函数库 | 当前未发现 |

---

## 3. 当前 Rewrite 执行流程

### 流程文字描述

```
用户输入（自然语言或 YAML）
    │
    ▼
[Step 1] 解析请求 + 补全默认值
    │  - 识别 mode（rewrite/score_only/schema_only/audit_plan）
    │  - 补全默认参数：mode=rewrite, perspective=第三方, 
    │    publish_platform=官网文章, source_policy=mark_missing_sources,
    │    output_length=standard, need_schema=true
    │  - 校验：原文少于 20 个有效字符则拒绝，请求用户提供完整材料
    │
    ▼
[Step 2] 识别视角与平台规则
    │  - 读取 references/perspectives.md 获取对应视角规则
    │  - 读取 references/platforms.md 获取对应平台规则
    │
    ▼
[Step 3] 原文 GEO 评分（Scorecard）
    │  - 6 维度评分：事实密度、结构清晰度、实体一致性、
    │    来源权威性、AI 触发覆盖、Schema 就绪度
    │  - 输出 0-100 总分 + 各维度分 + 诊断说明
    │
    ▼
[Step 4] 问题诊断 + 来源缺口识别
    │  - 识别内容中的硬阻断（hard blockers）：
    │    编造声明、数据/认证/价格/客户案例缺证据、
    │    法律合规风险、过程文字混入终稿、事实矛盾
    │  - 标记缺失来源，不将不确定声明转为确认事实
    │  - 若原始评分 ≥ 80 且无硬阻断 → 激活高质量保护模式
    │    （保留原结构/事实/实体/权威来源，仅轻量 GEO 增强）
    │
    ▼
[Step 5] GEO 改写（DSS+E 驱动）
    │  - 基于 DSS+E 模型进行改写
    │  - 遵循视角规则 + 平台规则 + 来源策略
    │  - 增加 AI Trigger Pattern：定义句、对比句、因果句、总结句
    │  - 替换空洞营销话术为具体属性/条件/机制/证明需求
    │
    ▼
[Step 6] 生成 FAQ + Schema 建议
    │  - 生成常见问题与答案（FAQ）
    │  - 生成 Schema 结构化数据建议（JSON-LD 或 Markdown）
    │
    ▼
[Step 7] 改写后评分 + 前后对比
    │  - 对改写后文章再次执行 6 维评分
    │  - 生成前后对比摘要（保留/增强/删减/风险处理）
    │
    ▼
[Step 8] 最终 QA 检查
    │  - 检查：无角色自我介绍、无执行过程叙述、无无依据声明
    │  - 确保终稿为纯净可发布 Markdown
    │
    ▼
输出结果
    ├── 默认输出：Markdown 格式（9 个章节）
    └── 结构化输出：JSON（按 references/output-schema.md）
```

### 关键位置说明

| 环节 | 位置 | 说明 |
|------|------|------|
| 入口函数 | [SKILL.md L13-L46](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L13-L46) | "When To Use" 和 "Inputs" 定义了 Skill 的触发条件和输入参数解析 |
| 核心处理逻辑 | [SKILL.md L74-L83](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L74-L83) | "Workflow" 章节定义了完整的 8 步执行流程 |
| Prompt / 规则集合 | [SKILL.md](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md) | 全文本即为 Skill 的 system prompt / 规则定义 |
| 模型调用 | 由 Skill 运行时环境管理 | 当前代码中未直接体现模型调用逻辑，依赖上层 Skill 执行器 |
| 输出解析 | [references/output-schema.md](file:///Users/zachary/Downloads/geo-rewrite-skill/references/output-schema.md) | 结构化输出的 JSON Schema 定义 |
| 错误处理 | [SKILL.md L70-L72](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L70-L72) | Hard blockers 规则 + 来源策略 + 最终 QA 检查 |

---

## 4. 当前输入参数

以下参数定义于 [SKILL.md L27-L42](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L27-L42) 的 YAML 输入规范中：

| 参数字段 | 类型 | 必填 | 默认值 | 说明 |
|----------|------|------|--------|------|
| `mode` | enum | 否 | `rewrite` | 运行模式：`rewrite`（完整改写）/ `score_only`（仅评分）/ `schema_only`（仅 Schema）/ `audit_plan`（审计方案） |
| `perspective` | enum | 否 | `第三方` | 写作视角：品牌方 / 第三方 / 合作商 / 用户/客户 / 投资者 / 政府/监管 / 学术/科研 / 媒体/新闻 / 内部/员工 |
| `publish_platform` | enum | 否 | `官网文章` | 发布平台：官网文章 / 公众号 / 知乎专栏 / 小红书 / 微博 / 抖音 / LinkedIn / X/Twitter / YouTube / 行业媒体 / 新闻稿 |
| `article_type` | string | 否 | — | 文章类型，如"行业分析"，用于调整内容结构侧重 |
| `brand` | string | 否 | — | 品牌名称，用于实体一致性优化 |
| `product` | string | 否 | — | 产品名称，用于实体一致性优化 |
| `audience` | string | 否 | — | 目标读者/受众描述 |
| `source_policy` | enum | 否 | `mark_missing_sources` | 来源策略：`use_provided_only`（仅用用户提供）/ `allow_external_sources`（允许外部来源）/ `mark_missing_sources`（标记缺失来源） |
| `output_length` | enum | 否 | `standard` | 输出长度：`short` / `standard` / `long` |
| `need_schema` | boolean | 否 | `true` | 是否生成 Schema 建议 |
| `brand_facts` | string | 否 | — | 品牌事实、产品事实、客户案例、资质、来源链接等补充材料 |
| `article` | string | 是 | — | 待评分或改写的原文（少于 20 个有效字符会被拒绝） |

### 暂不支持的输入参数

| 参数 | 现状 | 备注 |
|------|------|------|
| 关键词列表 | 当前未发现 | 无独立 `keywords` 输入字段 |
| 目标 GEO 评分 | 当前未发现 | 无目标分数设定 |
| 参考文章/竞品文章 | 当前未发现 | 无 reference_article 类输入 |
| 字数限制 | ⚠️ 间接支持 | 仅有 `output_length`（short/standard/long）三档，无精确字数控制 |
| 语言 | 当前未发现 | 无多语言输出选项（当前规则以中文为主） |
| 品牌风格指南 | 当前未发现 | 无 brand_style_guide 等品牌调性输入 |
| SEO 关键词 | 当前未发现 | 无传统 SEO 关键词输入（GEO ≠ SEO） |
| 用户画像/ Persona | 当前未发现 | 无详细受众画像输入 |
| 禁用词/敏感词 | 当前未发现 | 无自定义禁用词表 |
| 改写强度 | 当前未发现 | 仅有高分保护模式（≥80 分自动轻量改写），无手动强度调节 |
| 历史版本对比 | 当前未发现 | 无 previous_version 类输入 |

---

## 5. 当前输出结构

### 5.1 默认输出：Markdown 格式

定义于 [SKILL.md L95-L109](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L95-L109)，包含以下 9 个章节：

```markdown
# 标题

## 原文 GEO Scorecard        ← 改前 6 维评分
## 问题诊断                   ← 内容问题与硬阻断识别
## 优化策略                   ← 具体优化动作与优先级
## GEO 改写后正文             ← 可发布终稿（纯正文）
## FAQ                        ← 常见问题与答案
## Schema 建议                 ← 结构化数据建议
## 改写后评分                 ← 改后 6 维评分
## 前后对比                   ← 保留/增强/删减/风险处理说明
## 待补充来源                 ← 缺失证据列表
```

**输出格式**：Markdown 纯文本

### 5.2 结构化输出：JSON 格式

定义于 [references/output-schema.md](file:///Users/zachary/Downloads/geo-rewrite-skill/references/output-schema.md)，完整字段如下：

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 文章标题 |
| `draft_article_markdown` | string | 原文或初稿 Markdown（可为空） |
| `score_before` | object | 改前评分 |
| `score_before.overall` | number | 总分（0-100） |
| `score_before.dimensions` | array | 6 维度评分数组 |
| `score_before.dimensions[].name` | string | 维度名称 |
| `score_before.dimensions[].score` | number | 维度得分 |
| `score_before.dimensions[].comment` | string | 诊断说明 |
| `score_before.raw_markdown` | string | 优化前评分 Markdown 原文 |
| `optimization_strategy` | array | 优化策略列表 |
| `optimization_strategy[].issue` | string | 问题 |
| `optimization_strategy[].action` | string | 优化动作 |
| `optimization_strategy[].priority` | string | 优先级（高/中/低） |
| `optimization_strategy[].evidence` | string | 依据或需补充来源 |
| `final_article_markdown` | string | 可发布终稿正文 + FAQ（不含评分/策略/Schema/对比等过程内容） |
| `score_after` | object | 改后评分（结构同 score_before） |
| `schema_suggestions` | object | Schema 建议 |
| `schema_suggestions.raw` | string | JSON-LD 或 Markdown 形式的 Schema 建议 |
| `comparison` | string | 前后对比摘要 |
| `missing_sources` | array | 待补充来源列表（字符串数组） |
| `review` | object | 质量审核 |
| `review.quality_status` | string | `ready` / `review` / `needs_material` |
| `review.publish_label` | string | 可发布 / 建议检查 / 需补充材料 |
| `review.reasons` | array | 判断理由列表 |
| `review.highlights` | array | 主要提升点列表 |

**输出格式**：纯 JSON（不包裹在 Markdown 代码块中）

### 5.3 输出能力总结

| 输出项 | 支持情况 | 说明 |
|--------|----------|------|
| 改写正文 | ✅ | `final_article_markdown` / "GEO 改写后正文" 章节 |
| 标题建议 | ✅ | `title` 字段 / 标题章节 |
| 摘要 | 当前未发现 | 无独立摘要输出字段 |
| FAQ | ✅ | 包含在终稿中 / 独立 FAQ 章节 |
| 关键词 | 当前未发现 | 无独立关键词输出 |
| 结构化大纲 | 当前未发现 | 无独立 outline 输出（正文自带标题结构） |
| 优化建议 | ✅ | `optimization_strategy` / "优化策略" 章节 |
| 评分 | ✅ | 改前 + 改后 6 维评分 + 总分 |
| 风险提示 | ✅ | `missing_sources` + hard blockers 诊断 + `review.quality_status` |
| 引用/证据 | ✅ | `missing_sources` 列出待补证据，来源策略控制引用行为 |
| JSON 结构 | ✅ | 完整 JSON Schema 定义 |
| HTML 输出 | 当前未发现 | 无 HTML 格式输出 |
| 纯文本输出 | 当前未发现 | 默认 Markdown，无纯文本选项 |

---

## 6. Prompt / Skill 规则盘点

### 6.1 Prompt / 规则文件清单

| 文件 | 位置 | 用途 | 规则类型 |
|------|------|------|----------|
| [SKILL.md](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md) | Skill 根目录 | Skill 主规则文件，定义角色、触发条件、输入输出、核心模型、评分体系、工作流、来源策略、质量检查等 | System Prompt / 核心规则 |
| [agents/openai.yaml](file:///Users/zachary/Downloads/geo-rewrite-skill/agents/openai.yaml) | agents/ 目录 | Agent 元数据配置，包含默认 prompt 模板、显示名称、品牌色等 | Agent 配置 |
| [references/perspectives.md](file:///Users/zachary/Downloads/geo-rewrite-skill/references/perspectives.md) | references/ 目录 | 9 种写作视角的语气、证据风格、实体侧重、推荐 Schema 类型规则 | 视角模板 / 参考资料 |
| [references/platforms.md](file:///Users/zachary/Downloads/geo-rewrite-skill/references/platforms.md) | references/ 目录 | 11 种发布平台的内容结构、风格适配规则 | 平台模板 / 参考资料 |
| [references/output-schema.md](file:///Users/zachary/Downloads/geo-rewrite-skill/references/output-schema.md) | references/ 目录 | 结构化 JSON 输出的字段定义与规则 | 输出 Schema / 参考资料 |

### 6.2 规则维度盘点

| 规则维度 | 支持情况 | 说明 |
|----------|----------|------|
| **GEO / DSS+E 规则** | ✅ 完整支持 | DSS+E 模型（Depth/Support/Sources/Entity）是核心改写框架，贯穿整个 Skill |
| **Evidence / 来源规则** | ✅ 完整支持 | 三种来源策略（use_provided_only / allow_external_sources / mark_missing_sources），明确禁止编造事实，有 hard blockers 机制 |
| **Schema 规则** | ✅ 基础支持 | 有 Schema 建议输出，视角规则中推荐对应 Schema 类型（FAQPage / Article / Product / Organization 等），但无详细 Schema 模板生成规则 |
| **防幻觉规则** | ✅ 严格 | 明确禁止编造：数字、案例、奖项、认证、日期、价格、客户名称、链接、法律声明等；不将不确定声明转为确认事实 |
| **基于品牌事实改写** | ⚠️ 部分支持 | 支持 `brand_facts` 输入字段，要求保留用户提供的事实（除非有证据矛盾）；但无品牌事实库持久化管理，也无品牌实体一致性的深度校验规则 |
| **区分不同平台** | ✅ 支持 | 11 种平台规则，各平台有明确的结构、风格、长度适配要求 |
| **区分不同视角** | ✅ 支持 | 9 种视角规则，各视角有明确的语气、证据风格、Schema 推荐 |
| **AI Trigger Pattern** | ✅ 支持 | 明确要求使用定义句、对比句、场景句、因果句、证据句、FAQ 答案、稳定实体名 |
| **高质量保护模式** | ✅ 支持 | 原始评分 ≥ 80 且无硬阻断时，自动激活轻量增强模式，保留原文核心内容 |
| **评分规则** | ✅ 完整支持 | 6 维 GEO Scorecard（事实密度、结构清晰度、实体一致性、来源权威性、AI 触发覆盖、Schema 就绪度） |
| **角色/语气规则** | ✅ 支持 | GEO 内容架构师定位，清晰客观专业，类新闻报道风格，禁止夸张营销语气 |
| **输出格式规则** | ✅ 支持 | Markdown 默认输出 + JSON 结构化输出，格式规范明确 |

### 6.3 Prompt 结构特点

- **单文件大 Prompt 模式**：核心规则全部集中在 [SKILL.md](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md)，约 120 行
- **参考资料按需加载**：`perspectives.md` 和 `platforms.md` 为外部参考，工作流第 2 步"如有需要读取"
- **无变量插值语法**：Prompt 为纯自然语言规则，无 `{{variable}}` 类模板变量语法
- **无 Few-shot 示例**：当前规则中未包含具体的改写前后对比示例

---

## 7. LLM Provider 和模型调用

### 7.1 当前现状

| 项目 | 现状 | 说明 |
|------|------|------|
| 使用的模型 / Provider | 需要人工确认 | 当前代码中**未发现**具体的模型配置或 Provider 指定。Skill 的 LLM 调用由上层运行时环境管理。 |
| API 调用文件 | 当前未发现 | 无独立的 API 调用封装代码 |
| 模型切换 | 当前未发现 | 无模型选择参数或切换逻辑 |
| 流式输出 | 需要人工确认 | 代码中未明确说明是否支持流式输出，取决于 Skill 运行时 |
| 重试机制 | 当前未发现 | 代码中无重试逻辑定义 |
| 超时处理 | 当前未发现 | 代码中无超时处理逻辑 |
| Token / 成本控制 | 当前未发现 | 无 token 计数、成本预估、用量限制等机制 |

### 7.2 与模型调用相关的间接线索

- [agents/openai.yaml](file:///Users/zachary/Downloads/geo-rewrite-skill/agents/openai.yaml) 文件名暗示可能默认使用 OpenAI 兼容接口，但文件内容仅为元数据配置，无具体模型参数
- Skill 架构通常由运行时统一管理 LLM 调用，Skill 本身只定义规则和输入输出
- 输出支持 JSON 结构化格式，暗示模型需具备 Function Calling 或 JSON Mode 能力

> **结论**：当前 Skill 代码本身不包含 LLM 调用逻辑，模型选择、API 封装、重试、流式输出、成本控制等能力均依赖 Skill 运行时平台提供，无法从当前代码判断具体实现。

---

## 8. 数据存储情况

### 8.1 当前现状

| 数据类型 | 存储方式 | 说明 |
|----------|----------|------|
| Rewrite 任务 | 当前未发现 | 无任务记录持久化 |
| 原文 | 不保存 | 输入即处理，处理后无持久化 |
| 改写结果 | 不保存 | 输出即结束，无历史版本存储 |
| 用户项目 | 当前未发现 | 无项目/工作空间概念 |
| 品牌资料 | 不保存 | `brand_facts` 每次调用需手动传入，无品牌知识库 |
| Prompt 模板 | 文件存储 | 规则以 Markdown 文件形式存在于 Skill 包内 |
| 历史版本 | 当前未发现 | 无版本管理机制 |
| 评分结果 | 不保存 | 评分仅在当次输出中展示 |
| 用户偏好 | 当前未发现 | 无用户配置持久化 |

### 8.2 存储方式总结

当前为**纯 Skill 模式**，无独立的后端存储：

- ✅ **有文件存储**：Skill 规则、参考资料（Markdown 文件）
- ❌ **无数据库**：无任务、用户、项目、品牌事实等数据的持久化
- ❌ **无 localStorage**：无前端状态存储（无独立前端）
- ❌ **无缓存机制**：无中间结果缓存

> **注意**：Skill 运行时平台可能有自身的对话历史存储，但这属于平台能力，非 Skill 本身的能力。

---

## 9. 前端交互现状

### 9.1 当前现状

| 交互项 | 现状 | 说明 |
|--------|------|------|
| 用户输入方式 | 对话式输入 | 用户通过自然语言对话输入原文和参数 |
| 改写类型选择 | 隐式 / YAML 参数 | 通过 `mode` 参数控制（rewrite/score_only/schema_only/audit_plan），无可视化选择器 |
| 触发方式 | 对话触发 | 用户发送消息即触发 Skill 调用 |
| 结果展示 | Markdown 渲染 | 结果以 Markdown 形式展示在对话中 |
| 编辑能力 | 当前未发现 | 无内置编辑器，用户需复制后自行编辑 |
| 复制能力 | 依赖平台 | 取决于 Skill 运行时平台是否支持一键复制 |
| 导出能力 | ⚠️ 间接支持 | 支持 JSON 结构化输出（编程式导出），无文件导出按钮 |
| Loading 状态 | 依赖平台 | 取决于 Skill 运行时平台 |
| Error 状态 | ⚠️ 基础 | 有内容级错误检测（hard blockers、缺失来源），但无系统级错误 UI |
| History 状态 | 依赖平台 | 取决于 Skill 运行时平台的对话历史 |

### 9.2 前端缺失总结

当前 Skill **无独立前端页面**，所有交互依赖 Skill 运行时平台（如 IDE 插件、对话式 AI 界面等）：

- ❌ 无独立的 Rewrite 工作台页面
- ❌ 无可视化参数配置表单
- ❌ 无原文 / 改写结果对比视图
- ❌ 无历史记录列表
- ❌ 无品牌事实库管理界面
- ❌ 无任务进度 / 状态指示
- ❌ 无导出 / 下载功能

---

## 10. 当前能力缺口

基于代码现状，如果要产品化为「GEO 内容改写工作台」，以下能力存在明显缺口：

### 🔴 高优先级缺口（核心能力缺失）

| 缺口 | 影响 | 当前状态 |
|------|------|----------|
| **品牌事实库** | 无法建立长期品牌实体权威，每次改写需手动重复输入品牌信息 | 仅支持单次传入 `brand_facts`，无持久化管理 |
| **内容任务管理** | 无法追踪改写进度、管理多篇内容、团队协作 | 完全无任务概念 |
| **后端任务持久化** | 刷新即丢失，无法回溯历史，无法团队共享 | 完全无持久化存储 |
| **结果结构化程度不足** | 难以与其他系统集成，难以做进一步自动化处理 | 有 JSON Schema 但字段粒度较粗，无段落级标注 |
| **历史版本管理** | 无法对比多次改写效果，无法回滚 | 无版本管理机制 |

### 🟡 中优先级缺口（产品体验缺失）

| 缺口 | 影响 | 当前状态 |
|------|------|----------|
| **内容评分细化** | 6 维评分较粗，无法定位具体问题段落 | 仅整体 + 6 维评分，无段落级/句子级诊断 |
| **多平台批量改写** | 同一篇内容需手动多次调用适配不同平台 | 单次调用仅支持一个平台 |
| **导出 Rewrite Package** | 无法一键导出为可直接发布的完整包 | 仅 Markdown/JSON 输出，无文件导出 |
| **UI 工作台化** | 对话式交互效率低，不适合专业内容运营 | 无独立前端工作台 |
| **用户 / 项目权限** | 无法多团队、多品牌隔离使用 | 完全无用户/权限体系 |
| **成本控制** | 无法预估和控制 LLM 调用成本 | 无 token 计数、成本监控、用量限制 |

### 🟢 低优先级缺口（增强功能缺失）

| 缺口 | 影响 | 当前状态 |
|------|------|----------|
| **实时协作编辑** | 团队无法同时编辑同一篇内容 | 当前未发现 |
| **A/B 测试** | 无法验证不同改写版本的实际 GEO 效果 | 当前未发现 |
| **发布集成** | 无法一键发布到各平台 | 当前未发现 |
| **数据看板** | 无法统计改写效果、内容质量趋势 | 当前未发现 |
| **API 开放平台** | 无法供第三方系统调用 | 仅 Skill 模式，无独立 API 服务 |
| **自定义评分维度** | 无法根据行业/品牌定制评分标准 | 6 维评分固定 |
| **多语言支持** | 无法服务国际化内容 | 规则以中文为主 |
| **图片 / 多模态 GEO** | 无法优化图片、图表的 AI 可理解性 | 仅文本处理 |

---

## 11. 可复用能力

当前代码中以下内容可以直接复用到新产品架构中：

### ✅ 高可复用性（核心资产）

| 模块 | 位置 | 复用价值 |
|------|------|----------|
| **DSS+E 改写方法论** | [SKILL.md L48-L57](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L48-L57) | GEO 改写的核心理论框架，可直接作为产品核心逻辑 |
| **GEO Scorecard 6 维评分体系** | [SKILL.md L59-L72](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L59-L72) | 评分维度和标准可直接复用，作为产品评分模块基础 |
| **8 步改写工作流** | [SKILL.md L74-L83](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L74-L83) | 完整的改写流程设计，可映射为产品的处理 Pipeline |
| **9 种视角规则** | [references/perspectives.md](file:///Users/zachary/Downloads/geo-rewrite-skill/references/perspectives.md) | 视角适配逻辑可直接复用，扩展为产品的"内容视角"功能 |
| **11 种平台规则** | [references/platforms.md](file:///Users/zachary/Downloads/geo-rewrite-skill/references/platforms.md) | 平台适配逻辑可直接复用，扩展为产品的"多平台发布"功能 |
| **来源策略（Source Policy）** | [SKILL.md L85-L91](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L85-L91) | 三种来源策略是防幻觉的核心机制，可直接复用 |
| **JSON 输出 Schema** | [references/output-schema.md](file:///Users/zachary/Downloads/geo-rewrite-skill/references/output-schema.md) | 结构化输出定义可直接作为 API 响应格式参考 |
| **防幻觉规则** | [SKILL.md L117-L121](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L117-L121) | 严格的事实约束规则，是内容可信度的保障 |
| **AI Trigger Pattern 规则** | [SKILL.md L119](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L119) | 定义句、对比句、因果句等 AI 友好写作模式 |

### ⚠️ 中等可复用性（需调整）

| 模块 | 位置 | 调整建议 |
|------|------|----------|
| **输入参数定义** | [SKILL.md L27-L42](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L27-L42) | YAML 参数定义可参考，但产品化需要更丰富的参数体系和表单化配置 |
| **Markdown 输出格式** | [SKILL.md L95-L109](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L95-L109) | 输出章节结构可参考，但产品化需要更细粒度的结构化输出 |
| **Hard Blocker 规则** | [SKILL.md L72](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L72) | 内容安全检查逻辑可复用，但需扩展为更完善的审核体系 |
| **高质量保护模式** | [SKILL.md L70-L71](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L70-L71) | 智能改写强度判断逻辑可复用，但需增加手动控制选项 |

### ❌ 低可复用性（需重写）

| 模块 | 原因 |
|------|------|
| Skill 封装格式 | 产品化需要独立的服务/应用架构，Skill 包格式不再适用 |
| 单文件大 Prompt | 产品化需要将 Prompt 模板化、模块化、可配置 |
| 对话式交互 | 工作台产品需要更丰富的 UI 交互 |
| 无状态设计 | 产品化需要状态管理、持久化、用户体系 |

---

## 12. 建议的最小重构方向

> 以下仅为架构建议，不涉及具体代码修改。

### 12.1 模块保留

| 模块 | 保留方式 | 理由 |
|------|----------|------|
| **DSS+E 核心方法论** | 完整保留 | 这是产品的核心竞争力和差异化所在 |
| **6 维 GEO Scorecard** | 完整保留 | 评分体系成熟，可直接作为产品功能 |
| **9 视角 + 11 平台规则** | 完整保留 | 内容适配规则体系完整，复用价值极高 |
| **来源策略 + 防幻觉规则** | 完整保留 | 内容可信度是 GEO 的基石 |
| **8 步改写工作流** | 保留逻辑，重构实现 | 流程设计合理，但需要从 Prompt 驱动改为代码 Pipeline 驱动 |

### 12.2 模块拆分

| 当前状态 | 拆分建议 | 理由 |
|----------|----------|------|
| 单文件大 Prompt（SKILL.md） | 拆分为多个 Prompt 模板 | 便于维护、版本管理、A/B 测试；不同步骤使用不同 Prompt |
| 评分规则混在主 Prompt 中 | 独立为评分模块 | 评分可单独调用、单独优化、单独测试 |
| 视角/平台规则为 Markdown 文件 | 结构化存储（数据库/JSON） | 便于动态扩展、可视化配置、版本管理 |
| 改写逻辑与输出格式耦合 | 分离改写引擎与输出层 | 同一改写结果可输出为 Markdown/JSON/HTML/Word 等多种格式 |

### 12.3 抽象为 Service

| Service | 职责 | 对应当前模块 |
|---------|------|-------------|
| **RewriteService** | 改写编排，管理整个改写流程 | SKILL.md 中的 Workflow |
| **ScoringService** | GEO 评分计算与诊断 | SKILL.md 中的 Scorecard 规则 |
| **PromptService** | Prompt 模板管理、变量插值、版本控制 | SKILL.md + references/*.md |
| **LLMService** | 统一的 LLM 调用封装，支持多 Provider、重试、流式、成本统计 | 当前缺失，需新建 |
| **BrandFactService** | 品牌事实库管理、实体一致性校验 | 当前 `brand_facts` 参数的升级 |
| **PerspectiveService** | 视角规则管理与应用 | references/perspectives.md |
| **PlatformService** | 平台规则管理与适配 | references/platforms.md |
| **SchemaService** | Schema 生成与校验 | SKILL.md 中 Schema 相关规则 |
| **StorageService** | 任务、结果、版本的持久化存储 | 当前缺失，需新建 |
| **QualityCheckService** | 内容质量审核、防幻觉检查、合规检查 | SKILL.md 中 Hard Blocker + QA 规则 |

### 12.4 Prompt 模板化

建议将当前的大 Prompt 拆分为以下可配置模板：

| 模板名称 | 用途 | 当前来源 |
|----------|------|----------|
| `system-role.md` | 系统角色定义 | SKILL.md 开头部分 |
| `score-prompt.md` | 评分专用 Prompt | SKILL.md Scorecard 部分 |
| `rewrite-prompt.md` | 改写专用 Prompt | SKILL.md DSS+E + Workflow 部分 |
| `faq-prompt.md` | FAQ 生成专用 Prompt | SKILL.md 中 FAQ 相关 |
| `schema-prompt.md` | Schema 生成专用 Prompt | SKILL.md 中 Schema 相关 |
| `perspective-template.md` | 视角规则模板（变量：视角名） | references/perspectives.md |
| `platform-template.md` | 平台规则模板（变量：平台名） | references/platforms.md |
| `quality-check-prompt.md` | 质量检查专用 Prompt | SKILL.md Quick Rules + QA |

### 12.5 输出结构化升级

建议在当前 JSON Schema 基础上增加以下粒度：

| 增加字段 | 用途 |
|----------|------|
| `sections[]` | 段落级结构化数据（每段的主题、类型、事实密度评分、实体列表等） |
| `entities[]` | 提取出的实体列表（名称、类型、出现次数、一致性评分） |
| `facts[]` | 提取出的事实声明列表（内容、来源、可信度、是否需补充） |
| `ai_triggers[]` | AI 触发句识别（类型：定义/对比/因果/总结、位置、原文） |
| `version_info` | 版本信息（版本号、创建时间、修改时间、父版本 ID） |
| `usage` | Token 用量统计（prompt_tokens / completion_tokens / total_tokens / cost） |

### 12.6 数据持久化建议

| 数据类型 | 存储方式 | 理由 |
|----------|----------|------|
| 用户 / 组织 / 权限 | 关系型数据库 | 需要事务、一致性 |
| 品牌事实库 | 关系型数据库 + 向量数据库 | 结构化属性 + 语义检索 |
| 改写任务 / 历史版本 | 关系型数据库 | 需要查询、过滤、版本管理 |
| 原文 / 改写结果 | 对象存储 + DB 索引 | 内容可能较长，对象存储更经济 |
| Prompt 模板 | 数据库 + 版本控制 | 需要版本管理、A/B 测试 |
| 评分配置 | 数据库 | 可动态调整、可定制 |
| LLM 调用日志 | 日志系统 / 时序数据库 | 用于成本分析、质量监控 |

---

## 13. 关键代码索引

以下是最关键的 10 个文件 / 位置，按重要性排序：

| 序号 | 文件路径 | 关键行 | 重要性 | 说明 |
|------|----------|--------|--------|------|
| 1 | [SKILL.md](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md) | 全文 | ⭐⭐⭐⭐⭐ | Skill 核心规则文件，定义了 GEO 改写的所有核心逻辑、方法论、工作流、输入输出规范 |
| 2 | [SKILL.md L48-L57](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L48-L57) | DSS+E 模型 | ⭐⭐⭐⭐⭐ | GEO 改写的核心理论框架（Depth/Support/Sources/Entity），是整个 Skill 的灵魂 |
| 3 | [SKILL.md L59-L72](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L59-L72) | Scorecard | ⭐⭐⭐⭐⭐ | 6 维 GEO 评分体系定义，是内容质量评估的核心标准 |
| 4 | [SKILL.md L74-L83](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L74-L83) | Workflow | ⭐⭐⭐⭐⭐ | 8 步改写工作流，定义了从输入到输出的完整处理链路 |
| 5 | [references/output-schema.md](file:///Users/zachary/Downloads/geo-rewrite-skill/references/output-schema.md) | 全文 | ⭐⭐⭐⭐ | 结构化 JSON 输出的完整 Schema 定义，是 API 集成和产品化的基础 |
| 6 | [references/perspectives.md](file:///Users/zachary/Downloads/geo-rewrite-skill/references/perspectives.md) | 全文 | ⭐⭐⭐⭐ | 9 种写作视角的规则定义，是内容视角适配的核心参考 |
| 7 | [references/platforms.md](file:///Users/zachary/Downloads/geo-rewrite-skill/references/platforms.md) | 全文 | ⭐⭐⭐⭐ | 11 种发布平台的规则定义，是多平台内容适配的核心参考 |
| 8 | [SKILL.md L85-L91](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L85-L91) | Source Policy | ⭐⭐⭐⭐ | 三种来源策略，是防幻觉和内容可信度的核心机制 |
| 9 | [SKILL.md L27-L42](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L27-L42) | Inputs | ⭐⭐⭐ | 输入参数定义，理解 Skill 支持哪些配置项的入口 |
| 10 | [SKILL.md L115-L121](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L115-L121) | Quick Rules | ⭐⭐⭐ | 快速规则摘要，包含防幻觉、AI Trigger Pattern 等关键约束 |
| 11 | [agents/openai.yaml](file:///Users/zachary/Downloads/geo-rewrite-skill/agents/openai.yaml) | 全文 | ⭐⭐ | Agent 元数据配置，了解 Skill 的封装方式和默认触发 prompt |
| 12 | [SKILL.md L93-L113](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L93-L113) | Output | ⭐⭐⭐ | 输出格式定义，Markdown 和 JSON 两种输出模式的规范 |

---

## 附录：审计说明

### 审计范围
- ✅ 已覆盖：`/Users/zachary/Downloads/geo-rewrite-skill/` 目录下所有文件
- ✅ 已阅读：SKILL.md、agents/openai.yaml、references/ 下全部 3 个文件
- ❌ 未覆盖：Skill 运行时平台代码（不在当前目录）
- ❌ 未覆盖：任何后端服务、前端应用、数据库（当前目录不存在）

### 审计方法
- 纯静态代码阅读，未运行任何代码
- 未访问任何外部服务或 API
- 未读取或输出任何敏感信息（API Key、Token 等）

### 免责声明
- 部分结论标注"当前未发现"或"需要人工确认"，表示基于当前目录的代码无法确认，不代表该能力绝对不存在
- 建议结合 Skill 运行时平台的实际能力进行综合评估
