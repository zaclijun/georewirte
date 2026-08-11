# GEO 内容改写工作台 — 产品化改造方案

> 方案版本：v1.0
> 生成日期：2026-06-26
> 基于文档：[rewrite-skill-capability-audit.md](file:///Users/zachary/Downloads/geo-rewrite-skill/rewrite-skill-capability-audit.md)
> 设计原则：快速落地、轻量架构、先闭环再优化

---

## 1. 当前可复用能力

以下能力直接来自现有 Skill，可完整复用到新产品中：

| 能力模块 | 来源 | 复用方式 | 价值评级 |
|----------|------|----------|----------|
| **DSS+E 改写方法论** | [SKILL.md L48-L57](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L48-L57) | 保留为核心改写框架，写入 Prompt 模板 | ⭐⭐⭐⭐⭐ |
| **6 维 GEO Scorecard** | [SKILL.md L59-L72](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L59-L72) | 评分维度 + 标准直接复用，独立为 Scoring Service | ⭐⭐⭐⭐⭐ |
| **8 步 Workflow** | [SKILL.md L74-L83](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L74-L83) | 改写流程逻辑直接复用，重构为代码 Pipeline | ⭐⭐⭐⭐⭐ |
| **9 种 Perspective 视角** | [references/perspectives.md](file:///Users/zachary/Downloads/geo-rewrite-skill/references/perspectives.md) | 视角规则结构化存入数据库，动态加载 | ⭐⭐⭐⭐ |
| **11 种 Platform 平台** | [references/platforms.md](file:///Users/zachary/Downloads/geo-rewrite-skill/references/platforms.md) | 平台规则结构化存入数据库，动态加载 | ⭐⭐⭐⭐ |
| **Output JSON Schema** | [references/output-schema.md](file:///Users/zachary/Downloads/geo-rewrite-skill/references/output-schema.md) | API 响应结构参考，字段粒度升级 | ⭐⭐⭐⭐ |
| **Source Policy 来源策略** | [SKILL.md L85-L91](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L85-L91) | 三种来源策略直接复用，防幻觉核心机制 | ⭐⭐⭐⭐⭐ |
| **防幻觉规则** | [SKILL.md L117-L121](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L117-L121) | 写入 QualityCheck 模块，严格执行 | ⭐⭐⭐⭐⭐ |
| **AI Trigger Pattern** | [SKILL.md L119](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L119) | 改写 Prompt 模板的重要组成部分 | ⭐⭐⭐⭐ |
| **高质量保护模式** | [SKILL.md L70-L71](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md#L70-L71) | 改写强度的智能判断逻辑 | ⭐⭐⭐ |

---

## 2. 产品化目标

### 2.1 产品定位

**产品名称**：GEO 内容改写工作台（GEO Rewrite Workbench）

**一句话描述**：面向内容运营与品牌团队的 GEO（生成式引擎优化）内容改写工作台，基于 DSS+E 方法论，帮助用户快速生成 AI 友好的高质量内容。

### 2.2 核心能力

| 能力模块 | 说明 | P 级 |
|----------|------|------|
| **品牌事实库** | 统一管理品牌、产品、案例、资质等事实，确保改写时实体一致、引用准确 | P0 |
| **Rewrite 任务管理** | 创建、查看、搜索改写任务，管理任务状态和进度 | P0 |
| **GEO 改写** | 基于 DSS+E 模型的核心改写能力，支持视角 + 平台适配 | P0 |
| **原文评分 / 改后评分** | 6 维 GEO Scorecard，改前改后对比，可视化展示 | P1 |
| **FAQ / Schema 建议** | 自动生成 FAQ 和结构化数据建议，提升 AI 引用概率 | P1 |
| **前后对比** | 改前改后内容对比、评分对比、改动点说明 | P1 |
| **历史版本** | 每次改写保存版本，支持版本回溯和对比 | P1 |
| **多平台版本** | 同一篇内容一键生成多平台适配版本 | P2 |
| **Rewrite Package 导出** | 一键导出 Markdown / JSON / HTML 报告包 | P3 |
| **用量统计** | Token 用量、成本统计、调用次数 | P3 |

### 2.3 不做什么（边界清晰）

- ❌ **不做自动发稿**：不直接对接 CMS 或社交媒体自动发布
- ❌ **不做完整 DIGLLM Monitor**：不做复杂的大模型调用监控平台
- ❌ **不做 MCP**：不做 Model Context Protocol 服务端
- ❌ **不做复杂权限**：P0-P2 不做 RBAC，仅简单项目级隔离
- ❌ **不做向量库（V1 不必选）**：品牌事实库先用关键词 + 标签检索，P3 再考虑向量增强
- ❌ **不做协作编辑**：多人实时协作不是 V1 目标

---

## 3. 推荐架构

### 3.1 整体架构图（文字版）

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ 项目首页  │ │ 品牌事实库│ │ 改写任务  │ │ 结果详情  │ ...   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST API
┌──────────────────────────────▼──────────────────────────────┐
│                       Backend (Node.js)                      │
│  ┌───────────────────────────────────────────────────────┐   │
│  │                     API Layer                         │   │
│  │  Project / BrandFact / RewriteTask / Output / Export  │   │
│  └───────────────────────────┬───────────────────────────┘   │
│                              │                               │
│  ┌───────────────────────────▼───────────────────────────┐   │
│  │                   Service Layer                       │   │
│  │                                                         │   │
│  │  RewriteService   ──  编排改写流程                      │   │
│  │  ScoringService   ──  GEO 评分计算                      │   │
│  │  BrandFactService ──  品牌事实管理                      │   │
│  │  PromptService    ──  Prompt 模板管理                   │   │
│  │  LLMService       ──  大模型调用封装                    │   │
│  │  ExportService    ──  导出服务                          │   │
│  │  QualityService   ──  质量检查 / 防幻觉                 │   │
│  └───────────────────────────┬───────────────────────────┘   │
│                              │                               │
│  ┌───────────────────────────▼───────────────────────────┐   │
│  │                    Data Access                        │   │
│  │  (Prisma ORM / SQLite → 可升级 PostgreSQL)             │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                       Database                               │
│  SQLite (P0)  →  PostgreSQL (P2+)                            │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 技术选型（轻量优先）

| 层级 | 技术选型 | 理由 |
|------|----------|------|
| 前端 | React + Vite + TailwindCSS | 生态成熟，开发效率高 |
| UI 组件库 | shadcn/ui 或 Ant Design | 快速搭建后台界面 |
| 后端 | Node.js + Express / Fastify | 前端团队可全栈，JSON 处理方便 |
| ORM | Prisma | Schema 清晰，迁移方便 |
| 数据库 | SQLite (P0) → PostgreSQL (P2+) | P0 零运维，后期可平滑升级 |
| LLM 调用 | OpenAI SDK（兼容多 Provider） | 统一接口，支持切换 |
| Markdown 渲染 | react-markdown + remark-gfm | 渲染改写结果 |
| 包管理 | pnpm | 快 |

### 3.3 目录结构建议

```
geo-rewrite-workbench/
├── frontend/
│   ├── src/
│   │   ├── pages/              # 页面
│   │   │   ├── projects/       # 项目首页
│   │   │   ├── brand-facts/    # 品牌事实库
│   │   │   ├── rewrite/        # 改写任务
│   │   │   └── history/        # 历史任务
│   │   ├── components/         # 组件
│   │   ├── services/           # API 调用
│   │   ├── store/              # 状态管理
│   │   └── types/              # TypeScript 类型
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── api/                # API 路由层
│   │   │   ├── projects.ts
│   │   │   ├── brand-facts.ts
│   │   │   ├── rewrite-tasks.ts
│   │   │   ├── outputs.ts
│   │   │   ├── export.ts
│   │   │   └── templates.ts
│   │   ├── services/           # 业务逻辑层
│   │   │   ├── RewriteService.ts
│   │   │   ├── ScoringService.ts
│   │   │   ├── BrandFactService.ts
│   │   │   ├── PromptService.ts
│   │   │   ├── LLMService.ts
│   │   │   ├── ExportService.ts
│   │   │   └── QualityService.ts
│   │   ├── prompts/            # Prompt 模板（Markdown 文件）
│   │   │   ├── system-role.md
│   │   │   ├── score-content.md
│   │   │   ├── analyze-original.md
│   │   │   ├── generate-strategy.md
│   │   │   ├── rewrite-content.md
│   │   │   ├── generate-faq.md
│   │   │   ├── generate-schema.md
│   │   │   ├── quality-check.md
│   │   │   └── output-json.md
│   │   ├── models/             # Prisma schema
│   │   ├── utils/              # 工具函数
│   │   └── index.ts            # 入口
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
│
└── README.md
```

---

## 4. 数据模型

### 4.1 projects（项目表）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | String (UUID) | 是 | 主键 |
| `name` | String | 是 | 项目名称 |
| `description` | String | 否 | 项目描述 |
| `brand_name` | String | 否 | 品牌名称（默认） |
| `default_perspective` | String | 否 | 默认视角 |
| `default_platform` | String | 否 | 默认平台 |
| `created_at` | DateTime | 是 | 创建时间 |
| `updated_at` | DateTime | 是 | 更新时间 |

### 4.2 brand_facts（品牌事实表）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | String (UUID) | 是 | 主键 |
| `project_id` | String | 是 | 所属项目 ID（外键 → projects） |
| `fact_type` | String | 是 | 事实类型：brand / product / case / certification / data / other |
| `title` | String | 是 | 事实标题 |
| `content` | Text | 是 | 事实内容（详细描述） |
| `source_url` | String | 否 | 来源链接 |
| `tags` | String[] | 否 | 标签数组（便于检索） |
| `is_active` | Boolean | 是 | 是否启用（默认 true） |
| `created_at` | DateTime | 是 | 创建时间 |
| `updated_at` | DateTime | 是 | 更新时间 |

### 4.3 rewrite_tasks（改写任务表）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | String (UUID) | 是 | 主键 |
| `project_id` | String | 是 | 所属项目 ID（外键 → projects） |
| `title` | String | 是 | 任务标题 |
| `original_content` | Text | 是 | 原文内容（Markdown） |
| `article_type` | String | 否 | 文章类型 |
| `perspective` | String | 是 | 视角（默认：第三方） |
| `publish_platform` | String | 是 | 发布平台（默认：官网文章） |
| `target_audience` | String | 否 | 目标受众 |
| `source_policy` | String | 是 | 来源策略（默认：mark_missing_sources） |
| `output_length` | String | 是 | 输出长度（默认：standard） |
| `need_schema` | Boolean | 是 | 是否生成 Schema（默认：true） |
| `status` | String | 是 | 状态：pending / running / completed / failed |
| `error_message` | Text | 否 | 错误信息（失败时） |
| `created_at` | DateTime | 是 | 创建时间 |
| `updated_at` | DateTime | 是 | 更新时间 |

### 4.4 rewrite_outputs（改写结果表）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | String (UUID) | 是 | 主键 |
| `task_id` | String | 是 | 任务 ID（外键 → rewrite_tasks） |
| `version` | Int | 是 | 版本号（从 1 开始） |
| `parent_version_id` | String | 否 | 父版本 ID（基于哪个版本改写） |
| `final_article` | Text | 是 | 改写后正文（Markdown） |
| `faq_content` | Text | 否 | FAQ 内容（Markdown） |
| `schema_suggestions` | Text | 否 | Schema 建议（JSON 字符串） |
| `optimization_strategy` | Text | 否 | 优化策略（JSON 数组字符串） |
| `comparison_summary` | Text | 否 | 前后对比摘要 |
| `missing_sources` | Text | 否 | 待补充来源（JSON 数组字符串） |
| `review_status` | String | 否 | 审核状态：ready / review / needs_material |
| `raw_response` | Text | 否 | LLM 原始响应（调试用） |
| `created_at` | DateTime | 是 | 创建时间 |

### 4.5 content_scores（内容评分表）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | String (UUID) | 是 | 主键 |
| `output_id` | String | 是 | 结果 ID（外键 → rewrite_outputs） |
| `score_type` | String | 是 | 评分类型：before / after |
| `overall` | Int | 是 | 总分（0-100） |
| `factual_density` | Int | 是 | 事实密度 |
| `structural_clarity` | Int | 是 | 结构清晰度 |
| `entity_consistency` | Int | 是 | 实体一致性 |
| `source_authority` | Int | 是 | 来源权威性 |
| `ai_trigger_coverage` | Int | 是 | AI 触发覆盖 |
| `schema_readiness` | Int | 是 | Schema 就绪度 |
| `dimension_comments` | Text | 否 | 各维度诊断说明（JSON） |
| `raw_markdown` | Text | 否 | 评分 Markdown 原文 |
| `created_at` | DateTime | 是 | 创建时间 |

### 4.6 prompt_templates（Prompt 模板表）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | String (UUID) | 是 | 主键 |
| `name` | String | 是 | 模板名称（唯一标识，如 rewrite-content） |
| `display_name` | String | 是 | 显示名称 |
| `description` | String | 否 | 模板说明 |
| `content` | Text | 是 | 模板内容（支持 {{variable}} 插值） |
| `version` | Int | 是 | 版本号 |
| `is_active` | Boolean | 是 | 是否启用 |
| `created_at` | DateTime | 是 | 创建时间 |
| `updated_at` | DateTime | 是 | 更新时间 |

### 4.7 llm_call_logs（大模型调用日志表）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | String (UUID) | 是 | 主键 |
| `task_id` | String | 否 | 关联任务 ID |
| `output_id` | String | 否 | 关联结果 ID |
| `model_name` | String | 是 | 模型名称 |
| `provider` | String | 是 | Provider：openai / deepseek / qwen / doubao |
| `prompt_type` | String | 是 | 调用类型：score / rewrite / faq / schema / quality |
| `prompt_tokens` | Int | 是 | 输入 Token 数 |
| `completion_tokens` | Int | 是 | 输出 Token 数 |
| `total_tokens` | Int | 是 | 总 Token 数 |
| `cost_usd` | Float | 否 | 预估成本（美元） |
| `latency_ms` | Int | 否 | 耗时（毫秒） |
| `success` | Boolean | 是 | 是否成功 |
| `error_message` | Text | 否 | 错误信息 |
| `created_at` | DateTime | 是 | 创建时间 |

---

## 5. API 设计

### 5.1 Project API

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/projects` | 获取项目列表 |
| `POST` | `/api/projects` | 创建项目 |
| `GET` | `/api/projects/:id` | 获取项目详情 |
| `PUT` | `/api/projects/:id` | 更新项目 |
| `DELETE` | `/api/projects/:id` | 删除项目 |

### 5.2 BrandFact API

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/projects/:projectId/brand-facts` | 获取事实列表（支持搜索、分页、类型筛选） |
| `POST` | `/api/projects/:projectId/brand-facts` | 新增品牌事实 |
| `GET` | `/api/brand-facts/:id` | 获取事实详情 |
| `PUT` | `/api/brand-facts/:id` | 更新品牌事实 |
| `DELETE` | `/api/brand-facts/:id` | 删除品牌事实 |
| `POST` | `/api/projects/:projectId/brand-facts/batch` | 批量导入事实 |

### 5.3 RewriteTask API

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/projects/:projectId/tasks` | 获取任务列表（支持分页、状态筛选、搜索） |
| `POST` | `/api/projects/:projectId/tasks` | 创建改写任务（触发改写） |
| `GET` | `/api/tasks/:id` | 获取任务详情 |
| `PUT` | `/api/tasks/:id` | 更新任务参数（重新改写） |
| `DELETE` | `/api/tasks/:id` | 删除任务 |
| `POST` | `/api/tasks/:id/retry` | 重试失败的任务 |
| `GET` | `/api/tasks/:id/status` | 轮询任务状态（SSE 或轮询） |

### 5.4 Output API

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/tasks/:taskId/outputs` | 获取任务的所有版本列表 |
| `GET` | `/api/outputs/:id` | 获取指定版本详情（含评分、FAQ、Schema 等） |
| `GET` | `/api/outputs/:id/scores` | 获取该版本的评分详情 |
| `POST` | `/api/outputs/:id/regenerate` | 基于该版本重新改写（生成新版本） |
| `GET` | `/api/outputs/:id/compare?with=:versionId` | 两个版本对比 |

### 5.5 Export API

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/outputs/:id/export?format=markdown` | 导出 Markdown 格式 |
| `GET` | `/api/outputs/:id/export?format=json` | 导出 JSON 格式 |
| `GET` | `/api/outputs/:id/export?format=html` | 导出 HTML 报告（P3） |
| `GET` | `/api/outputs/:id/export?format=package` | 导出完整 Package（P3，含正文+评分+FAQ+Schema 打包 zip） |

### 5.6 Template API

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/templates` | 获取所有 Prompt 模板列表 |
| `GET` | `/api/templates/:name` | 获取指定模板最新版本 |
| `PUT` | `/api/templates/:name` | 更新模板内容（生成新版本） |
| `GET` | `/api/templates/:name/versions` | 获取模板版本历史 |

---

## 6. Prompt 拆分方案

将当前 [SKILL.md](file:///Users/zachary/Downloads/geo-rewrite-skill/SKILL.md) 约 120 行的大 Prompt，拆分为 9 个独立模板，每个模板职责单一、可独立测试和优化。

### 6.1 system-role.md

**用途**：系统角色定义，作为所有对话的 system prompt 基础。

**输入变量**：无（固定内容）

**输出要求**：无（作为 system prompt 使用）

**内容要点**：
- GEO 内容架构师角色定义
- DSS+E 核心模型简介
- 基本行为准则（不编造事实、保持客观专业等）

---

### 6.2 score-content.md

**用途**：对文章进行 GEO 6 维评分。

**输入变量**：
- `{{article}}` — 待评分的文章内容
- `{{perspective}}` — 写作视角
- `{{publish_platform}}` — 发布平台

**输出要求**：JSON 格式
```json
{
  "overall": 75,
  "dimensions": [
    { "name": "事实密度", "score": 70, "comment": "..." },
    { "name": "结构清晰度", "score": 80, "comment": "..." },
    { "name": "实体一致性", "score": 75, "comment": "..." },
    { "name": "来源权威性", "score": 65, "comment": "..." },
    { "name": "AI 触发覆盖", "score": 72, "comment": "..." },
    { "name": "Schema 就绪度", "score": 68, "comment": "..." }
  ],
  "raw_markdown": "评分详情 Markdown..."
}
```

---

### 6.3 analyze-original.md

**用途**：诊断原文问题，识别硬阻断和来源缺口。

**输入变量**：
- `{{article}}` — 原文内容
- `{{brand_facts}}` — 品牌事实（JSON 数组字符串）
- `{{source_policy}}` — 来源策略
- `{{score_result}}` — 评分结果（JSON）

**输出要求**：JSON 格式
```json
{
  "hard_blockers": ["问题描述1", "问题描述2"],
  "issues": [
    { "type": "factual", "severity": "high", "description": "...", "location": "第3段" }
  ],
  "source_gaps": ["需补充数据来源", "需补充案例引用"],
  "is_high_quality": false,
  "recommended_intensity": "heavy"
}
```

---

### 6.4 generate-strategy.md

**用途**：生成具体的优化策略列表。

**输入变量**：
- `{{analysis_result}}` — 分析结果（JSON）
- `{{score_result}}` — 评分结果（JSON）
- `{{perspective}}` — 视角
- `{{platform}}` — 平台

**输出要求**：JSON 格式
```json
{
  "strategies": [
    {
      "issue": "事实密度不足",
      "action": "补充行业数据和具体案例",
      "priority": "high",
      "evidence": "品牌事实库中的 XYZ 数据"
    }
  ]
}
```

---

### 6.5 rewrite-content.md

**用途**：执行核心改写，生成优化后的正文。

**输入变量**：
- `{{article}}` — 原文
- `{{brand_facts}}` — 品牌事实（JSON 数组）
- `{{perspective_rules}}` — 视角规则
- `{{platform_rules}}` — 平台规则
- `{{source_policy}}` — 来源策略
- `{{optimization_strategy}}` — 优化策略（JSON）
- `{{is_high_quality}}` — 是否高质量（决定改写强度）
- `{{output_length}}` — 输出长度

**输出要求**：纯 Markdown（仅正文，不含评分、策略等过程内容）

---

### 6.6 generate-faq.md

**用途**：基于改写后的正文生成 FAQ。

**输入变量**：
- `{{rewritten_article}}` — 改写后正文
- `{{perspective}}` — 视角
- `{{platform}}` — 平台
- `{{faq_count}}` — FAQ 数量（默认 5-8 个）

**输出要求**：Markdown 格式（## FAQ + ### 问题 + 答案）

---

### 6.7 generate-schema.md

**用途**：生成 Schema 结构化数据建议。

**输入变量**：
- `{{rewritten_article}}` — 改写后正文
- `{{faq_content}}` — FAQ 内容
- `{{perspective}}` — 视角
- `{{platform}}` — 平台
- `{{brand_name}}` — 品牌名称
- `{{product_name}}` — 产品名称

**输出要求**：JSON-LD 格式（如 Article、FAQPage、Product 等）

---

### 6.8 quality-check.md

**用途**：最终质量检查，确保内容符合发布标准。

**输入变量**：
- `{{rewritten_article}}` — 改写后正文
- `{{original_article}}` — 原文
- `{{brand_facts}}` — 品牌事实
- `{{source_policy}}` — 来源策略
- `{{hard_blockers}}` — 硬阻断列表

**输出要求**：JSON 格式
```json
{
  "passed": true,
  "quality_status": "ready",
  "publish_label": "可发布",
  "reasons": ["事实准确", "实体一致", "无编造内容"],
  "highlights": ["事实密度提升 20%", "结构更清晰"],
  "warnings": ["部分数据建议补充来源"],
  "missing_sources": ["数据 XYZ 的出处"]
}
```

---

### 6.9 output-json.md

**用途**：将所有结果整合成标准 JSON 输出格式（参考 [output-schema.md](file:///Users/zachary/Downloads/geo-rewrite-skill/references/output-schema.md)）。

**输入变量**：
- `{{title}}` — 标题
- `{{original_article}}` — 原文
- `{{score_before}}` — 改前评分（JSON）
- `{{score_after}}` — 改后评分（JSON）
- `{{rewritten_article}}` — 改写后正文
- `{{faq_content}}` — FAQ 内容
- `{{schema_suggestions}}` — Schema 建议
- `{{optimization_strategy}}` — 优化策略
- `{{quality_check}}` — 质量检查结果
- `{{comparison_summary}}` — 前后对比摘要
- `{{missing_sources}}` — 待补充来源

**输出要求**：完整 JSON 对象（结构同 output-schema.md）

---

## 7. 前端页面设计

### 7.1 项目首页（Project Home）

**功能**：
- 展示项目列表
- 快速进入项目
- 新建项目
- 查看项目概览（任务数、平均 GEO 分等）

**核心组件**：
- 项目卡片列表
- 新建项目弹窗
- 项目搜索/筛选
- 统计概览卡片

**数据来源**：
- `GET /api/projects`

---

### 7.2 品牌事实库（Brand Facts Library）

**功能**：
- 管理品牌事实（增删改查）
- 按类型筛选（品牌/产品/案例/认证/数据）
- 标签检索
- 批量导入
- 事实详情查看

**核心组件**：
- 事实列表（表格 + 卡片切换）
- 筛选器（类型、标签、搜索）
- 新建/编辑事实表单
- 批量导入弹窗
- 事实详情侧栏

**数据来源**：
- `GET /api/projects/:projectId/brand-facts`
- `POST /api/projects/:projectId/brand-facts`
- `PUT /api/brand-facts/:id`

---

### 7.3 新建改写任务（New Rewrite Task）

**功能**：
- 粘贴原文
- 配置改写参数（视角、平台、文章类型、来源策略等）
- 选择关联的品牌事实（自动匹配 + 手动选择）
- 预览默认配置
- 提交任务并跳转结果页

**核心组件**：
- 原文编辑器（Markdown 编辑器）
- 参数配置表单（下拉选择 + 开关）
- 品牌事实选择器（可搜索、可多选）
- 提交按钮 + 预估耗时提示

**数据来源**：
- `POST /api/projects/:projectId/tasks`
- `GET /api/projects/:projectId/brand-facts`（用于选择关联事实）

---

### 7.4 改写结果页（Rewrite Result）

**功能**：
- 展示改写后正文
- 展示改前/改后评分对比（雷达图 + 分数）
- 展示 FAQ 和 Schema 建议
- 展示优化策略和待补充来源
- 原文/改写对比视图
- 重新改写（调整参数再生成）
- 复制 / 导出

**核心组件**：
- 双栏对比视图（原文 vs 改写）
- 评分雷达图
- Tab 切换（正文 / FAQ / Schema / 评分详情 / 优化策略）
- 版本切换器
- 操作栏（复制、导出、重新改写）
- 质量状态标签（可发布 / 建议检查 / 需补充材料）

**数据来源**：
- `GET /api/outputs/:id`
- `GET /api/outputs/:id/scores`
- `GET /api/tasks/:taskId/outputs`（版本列表）
- `POST /api/outputs/:id/regenerate`

---

### 7.5 历史任务页（Task History）

**功能**：
- 任务列表（时间倒序）
- 任务状态筛选（全部 / 进行中 / 已完成 / 失败）
- 任务搜索
- 查看任务详情（跳转结果页）
- 删除任务

**核心组件**：
- 任务列表（卡片或表格）
- 状态过滤器
- 搜索框
- 分页器
- 任务状态标签 + 进度指示

**数据来源**：
- `GET /api/projects/:projectId/tasks`
- `DELETE /api/tasks/:id`

---

## 8. MVP 开发顺序

### P0 — 核心闭环（2-3 周）

目标：跑通「品牌事实 → 创建任务 → 改写 → 查看结果」完整链路

| 序号 | 任务 | 前端 | 后端 |
|------|------|------|------|
| 1 | 项目脚手架搭建（前后端 + 数据库） | ✅ | ✅ |
| 2 | 项目管理 CRUD | ✅ | ✅ |
| 3 | 品牌事实库 CRUD | ✅ | ✅ |
| 4 | LLMService 封装（单 Provider） | — | ✅ |
| 5 | PromptService + 9 个 Prompt 模板 | — | ✅ |
| 6 | RewriteService 编排（核心 8 步） | — | ✅ |
| 7 | 创建改写任务 API | — | ✅ |
| 8 | 新建改写任务页面 | ✅ | — |
| 9 | 结果页（基础版：展示正文 + FAQ + Schema） | ✅ | — |
| 10 | 历史任务列表页 | ✅ | — |

**P0 完成标准**：用户可以创建项目、录入品牌事实、提交改写任务、查看改写结果（Markdown 正文 + FAQ + Schema）。

---

### P1 — 评分与对比（1-2 周）

目标：增强价值感知，可视化 GEO 提升效果

| 序号 | 任务 | 前端 | 后端 |
|------|------|------|------|
| 1 | ScoringService 独立评分逻辑 | — | ✅ |
| 2 | content_scores 表 + 评分存储 | — | ✅ |
| 3 | 改前改后评分对比 | — | ✅ |
| 4 | 评分雷达图组件 | ✅ | — |
| 5 | 结果页评分模块升级 | ✅ | — |
| 6 | 原文/改写双栏对比视图 | ✅ | — |
| 7 | 优化策略展示 | ✅ | — |
| 8 | 质量状态标签 + 待补充来源 | ✅ | — |
| 9 | 历史版本列表 + 版本切换 | ✅ | ✅ |

**P1 完成标准**：结果页展示完整的 GEO 评分对比、优化策略、双栏对比、质量状态。

---

### P2 — 多平台与体验优化（1-2 周）

目标：提升内容适配能力，优化用户体验

| 序号 | 任务 | 前端 | 后端 |
|------|------|------|------|
| 1 | 多平台版本生成（同一任务生成多平台） | — | ✅ |
| 2 | 平台切换器（结果页切换不同平台版本） | ✅ | — |
| 3 | 视角规则管理页面（可视化配置） | ✅ | ✅ |
| 4 | 平台规则管理页面（可视化配置） | ✅ | ✅ |
| 5 | 品牌事实自动关联（基于标签自动匹配） | — | ✅ |
| 6 | 任务状态实时更新（SSE 或轮询优化） | ✅ | ✅ |
| 7 | 失败任务重试 | ✅ | ✅ |
| 8 | 数据库升级为 PostgreSQL（可选） | — | ✅ |

**P2 完成标准**：支持一篇内容生成多平台版本，视角/平台规则可配置，任务状态实时反馈。

---

### P3 — 导出与增值功能（1-2 周）

目标：完善交付能力，增加数据洞察

| 序号 | 任务 | 前端 | 后端 |
|------|------|------|------|
| 1 | ExportService（Markdown / JSON 导出） | — | ✅ |
| 2 | HTML 报告导出（带样式的完整报告） | — | ✅ |
| 3 | Rewrite Package 打包导出（zip） | — | ✅ |
| 4 | 导出按钮（结果页） | ✅ | — |
| 5 | llm_call_logs 表 + 调用日志 | — | ✅ |
| 6 | 用量统计页面（Token、调用次数、成本趋势） | ✅ | ✅ |
| 7 | Prompt 模板管理页面 | ✅ | ✅ |
| 8 | Prompt 版本管理与 A/B 测试（基础） | ✅ | ✅ |

**P3 完成标准**：支持多种格式导出，有用量统计和成本监控，Prompt 可管理和迭代。

---

## 9. 风险与注意事项

### 9.1 产品边界（不要做什么）

| 风险 | 说明 | 应对策略 |
|------|------|----------|
| **自动发稿** | 不做 CMS 集成、不自动发布到公众号/小红书等平台 | 明确产品定位为「改写工作台」，而非「发布平台」；导出后用户手动发布 |
| **完整 DIGLLM Monitor** | 不做复杂的大模型监控平台（调用链、细粒度指标、告警等） | 只做基础的调用日志和用量统计，复杂监控用专业工具 |
| **MCP 服务** | 不做 Model Context Protocol 服务端 | V1 只做 Web 工作台，MCP 形态后续评估 |
| **复杂权限** | 不做 RBAC、不做组织层级、不做多租户 | P0-P2 仅项目级简单隔离，P3 以后再考虑 |
| **向量库（V1 不必选）** | 品牌事实库不一开始就上向量检索 | P0-P2 用关键词 + 标签检索足够，P3 评估后再加向量增强 |

### 9.2 技术风险

| 风险 | 说明 | 应对策略 |
|------|------|----------|
| **LLM 输出不稳定** | JSON 输出格式可能不稳定，导致解析失败 | 1. 使用 Function Calling / JSON Mode；2. 增加输出校验和重试；3. QualityCheck 兜底 |
| **Prompt 膨胀** | Prompt 越来越长，成本上升且效果下降 | 模块化拆分 + PromptService 版本管理 + 定期精简优化 |
| **品牌事实注入过长** | 大量品牌事实导致 Context 超限 | 1. 按标签智能筛选相关事实；2. 限制单次注入数量；3. 后续上向量检索 |
| **改写耗时长** | 8 步串行调用，用户等待时间长 | 1. P0 用轮询，P1 上 SSE；2. 考虑合并部分步骤减少调用次数 |
| **评分主观波动** | 同一篇内容两次评分结果不一致 | 1. 评分 Prompt 精细化 + Few-shot 示例；2. 温度设低（0.1-0.3）；3. 评分作为参考而非绝对标准 |

### 9.3 落地建议

1. **先保证 rewrite 工作台闭环**：P0 的核心是「输入 → 改写 → 输出」跑通，其他功能都是锦上添花
2. **Prompt 驱动快速迭代**：初期规则频繁变化，用 Prompt 模板 + 数据库存储，改 Prompt 比改代码快
3. **数据模型预留扩展**：P0 用 SQLite 但 Schema 设计要考虑 PostgreSQL 迁移
4. **LLM 调用抽象**：LLMService 封装好 Provider 切换，避免绑定单一模型
5. **先人工后自动**：品牌事实关联、内容审核等先用人工介入，验证后再自动化
6. **埋点要趁早**：P1 就加上调用日志和成本统计，否则后期不知道花了多少钱

---

## 附录：与现有 Skill 的对应关系

| 现有 Skill 元素 | 产品化后位置 |
|----------------|-------------|
| SKILL.md 全文 | 拆分到 9 个 Prompt 模板 + RewriteService 流程逻辑 |
| DSS+E 模型 | rewrite-content.md 模板核心指导 |
| Scorecard 6 维 | ScoringService + score-content.md 模板 |
| Workflow 8 步 | RewriteService.ts 代码编排 |
| perspectives.md | 数据库表 + PerspectiveService |
| platforms.md | 数据库表 + PlatformService |
| output-schema.md | output-json.md 模板 + API 响应结构 |
| source_policy | QualityService + 各 Prompt 模板中体现 |
| 防幻觉规则 | quality-check.md 模板 + QualityService |
| brand_facts 参数 | brand_facts 表 + BrandFactService |
| agents/openai.yaml | LLMService 配置 |

---

> 方案结束。下一步：确认技术选型和 P0 范围，开始脚手架搭建。
