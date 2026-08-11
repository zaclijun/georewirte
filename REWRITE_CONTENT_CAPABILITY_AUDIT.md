# Rewrite 项目内容生成 / 内容优化能力专项审计报告 V1.0

> Status: 只读能力专项审计完成
> Target Repository: Rewrite（`/Users/zachary/Downloads/geo-rewrite-skill`）
> Destination Product: DIGLLM2
> Scope: 内容生成、内容优化、Prompt / Skill、RAG、来源追溯、版本与导出
> Updated: 2026-07-18
> Execution Rule: 只读审计，未修改任何代码、未新增/删除文件、未生成迁移、未安装依赖
> Evidence Rule: 每项结论均引用真实路径、类、函数、路由或模型

---

## 20.1 执行摘要

Rewrite 是一个**面向 GEO（生成式引擎优化）的内容优化单点工具**，不是完整的内容生成平台。它真实调用 LLM，工程化程度较高，但能力边界清晰。

**内容生成完成度：弱。** Rewrite **没有独立的 generate 模式**（从 Brief 生成新内容）。前端只有"粘贴原文 / 上传原文 / 链接导入"三个入口，后端 `RewriteTask` 必须有 `original_content`。所有产出都是基于原文的 optimize 模式。DIGLLM2 所需的"独立内容创作"入口需自行实现。

**内容优化完成度：高且成熟。** 采用三段式调用链：Call 1 评分诊断（`score-and-diagnose.md`）→ Call 2 改写包（`rewrite-package.md`，1054 行最核心 Prompt）→ 可选 Call 3 质检（`quality-check.md`，P0 默认关闭）。Prompt 工程覆盖 6 类内容资产类型、DSS+E 黄金模型、6 维 GEO Scorecard、Source Policy 三策略、AI Trigger Pattern、防幻觉规则、Schema/PlatformPublishGuide 二选一机制。这是 Rewrite 最高价值资产。

**RAG 完成度：未发现。** 完全没有 Qdrant / pgvector / Chroma / FAISS / Embedding / Chunk / Retriever / Rerank。"知识库"只是 `BrandFact` 关系表（7 张表之一），通过 `_load_facts()` 序列化为 JSON 注入 Prompt。**与 DIGLLM2 Qdrant 规划无冲突，但也无可复用的检索代码。**

**HTML / 导出完成度：高且前端实现。** 后端 `export_service.py` 提供 Markdown / JSON 文件流导出；前端 `exportHtml.ts`（1289 行）生成 A4 风格、内联 CSS、单文件、离线可看、可打印的 HTML 报告。`cleanFinalArticle()` 提供纯净正文复制能力。这两个文件是可直接迁移的成熟资产。

**是否有真实可迁移核心：是。** 三段式调用链架构 + 4 个 Prompt 文件 + HTML 报告模板 + 纯净正文清洗 + JSON Mode 解析容错 + LLMCallLog 模型审计能力，均为可迁移的成熟能力。

**最大风险：**
1. Rewrite 无 generate 模式，DIGLLM2 不能直接复用其前端流程；
2. Prompt 无版本化（文件常量，无 `prompt_id` / `prompt_version` 字段），DIGLLM2 需补建版本治理；
3. 无 RAG / 来源追溯 / Chunk 关联，DIGLLM2 需完全自建 Qdrant 链路；
4. 事实保护仅靠 Prompt 软约束 + 可选 Call 3，无程序化 Diff；
5. 异步通过 `threading.Thread(daemon=True)` 实现，不可恢复、不可重试、不可水平扩展，DIGLLM2 需替换为 Redis + Worker；
6. 6 类内容资产类型规则与 DIGLLM2 三种入口（独立创作 / 快检报告 / 八阶段治理）的映射关系需重新设计。

---

## 20.2 能力矩阵

| 能力 | 状态 | 真实入口 | 成熟度 | 迁移建议 | 证据 |
|---|---|---|---|---|---|
| 内容生成（generate） | 未发现 | — | — | 由 DIGLLM2 重新实现 | `frontend/src/pages/NewRewritePage.tsx` 只有原文输入；`RewriteTask.original_content` 必填 |
| 内容优化（optimize） | 可直接复用 | `RewriteService.run_rewrite()` | 高 | 抽取为独立 Skill | `backend/app/services/rewrite_service.py` |
| 原文分析（score & diagnose） | 可直接复用 | `ScoringService.score_and_diagnose()` Call 1 | 高 | 抽取为独立 Skill | `backend/app/services/scoring_service.py` + `prompts/score-and-diagnose.md` |
| GEO 优化规则 | 可直接复用 | `prompts/rewrite-package.md` Call 2 | 高 | 直接迁移 Prompt | 1054 行 6 类内容资产规则 + DSS+E + AI Trigger Pattern |
| FAQ 生成 | 可直接复用 | `rewrite-package.md` 强制 6-8 FAQ | 高 | 随 Prompt 一同迁移 | `final_article` 与 `faq_content` 分离铁律 |
| HTML 报告 | 可直接复用 | `frontend/src/lib/exportHtml.ts` | 高 | 抽取为 ArtifactRenderer | 1289 行 A4 风格内联 CSS 单文件 |
| 一键复制纯净正文 | 可直接复用 | `frontend/src/lib/cleanArticle.ts` | 高 | 抽取为独立工具 | 去标题符号/代码围栏/HTML 标签/话题号 |
| Prompt 版本 | 存在但未接线 | 文件常量 `backend/app/prompts/*.md` | 低 | DIGLLM2 补建版本表 | 无 `prompt_id` / `prompt_version` 字段，`llm_call_logs.prompt_type` 仅区分 score/rewrite/quality |
| Skill 机制 | Mock / 模板 | 仓库根 `SKILL.md` 仅文档 | 低 | 由 DIGLLM2 重新实现 Skill Registry | 后端代码未引用 `SKILL.md`，无 Loader / Run / Manifest |
| 模型路由 | 部分可复用 | `LLMService.chat_json()` + `ModelConfig` 表 | 中 | 抽取为独立模块 + 替换为 AIAbilityRouter | `backend/app/services/llm_service.py` + `models/model_config.py` |
| RAG（向量检索） | 未发现 | — | — | 由 DIGLLM2 重新实现 | 无 Qdrant / pgvector / Embedding / Chunk 代码 |
| 来源追溯 | 存在但未接线 | `missing_sources` JSON 字符串数组 | 低 | 由 DIGLLM2 重新实现 | `RewriteOutput.missing_sources` 不关联文档版本/Chunk |
| 事实保护 | 部分可复用 | Prompt 软约束 + 可选 Call 3 质检 | 中 | 参考后重写为程序化 Diff | `prompts/system-role.md` 防幻觉规则 + `quality-check.md` |
| 草稿版本 | 部分可复用 | `RewriteOutput.version` + `parent_version_id` | 中 | 抽取为独立模块 + 扩展审核流 | `models/rewrite_output.py` UniqueConstraint(task_id, version) |
| 审核定稿 | 存在但未接线 | `review_status` 字段（ready/review/needs_material/exported） | 低 | 由 DIGLLM2 重新实现 | 无独立审核流、无定稿操作、无发布记录 |
| 异步任务 | 与目标冲突 | `threading.Thread(daemon=True)` | 低 | 由 DIGLLM2 重新实现（Redis + Worker） | `rewrite_service._run_in_thread()` |
| 模型配置 | 可直接复用 | `ModelConfig` 表 + Fernet 加密 | 中 | 抽取为独立模块 | `models/model_config.py` + `services/crypto_service.py` + `services/model_runtime.py` |
| Schema JSON-LD 生成 | 可直接复用 | `rewrite-package.md` Schema/PlatformPublishGuide 二选一 | 高 | 随 Prompt 一同迁移 | `RewriteOutput.schema_suggestions` JSON 字段 |
| 多平台并行 | 部分可复用 | 前端 `Promise.allSettled` | 中 | 参考后重写 | `NewRewritePage.tsx` 多类型并行创建 task |
| 内容资产类型分类 | 可直接复用 | 6 类资产类型规则 | 高 | 直接迁移规则 | 自有官网内容/新闻通稿/行业垂媒/问答型/案例/企业自媒体 |

**状态值含义：** 可直接复用 / 部分可复用 / 存在但未接线 / Mock / 模板 / 与 DIGLLM2 冲突 / 未发现 / 需要运行验证

---

## 20.3 真实调用链

### 20.3.1 内容优化（唯一真实链路，Rewrite 无 generate）

```
前端 NewRewritePage.tsx（粘贴/上传/链接 → 启发式预诊断 diagnoseArticle()）
  ↓ POST /api/projects/{project_id}/tasks
    body: { title, original_content, publish_platform, perspective, source_policy, output_length, need_schema, brand_fact_ids, model_config_id, ... }
  ↓ api/rewrite_tasks.py::create_task()
    → rewrite_tasks_repo.create() 落库 status=pending
    → rewrite_service.kickoff(task.id)
  ↓ RewriteService.kickoff()
    → threading.Thread(target=_run_in_thread, daemon=True).start()
  ↓ _run_in_thread() → run_rewrite()
    1) _load_facts() → brand_facts_repo.list_by_project(MAX_FACTS_PER_TASK=20)
       → BrandFact 序列化为 JSON
    2) scoring_service.score_and_diagnose() ← Call 1
       → prompt_service.render('score-and-diagnose.md', { original_article, brand_facts, publish_platform, source_policy, ... })
       → llm_service.chat_json(system_prompt='system-role.md', user_prompt=rendered, prompt_type='score', temperature=0.2, model_config)
         → model_runtime.build_client() 解密 api_key → OpenAI client
         → client.chat.completions.create(model=..., response_format={"type": "json_object"}, ...)
         → 失败重试 2 次
         → 解析容错：直接 json.loads → 去 ```json fence → 正则提取 {...}
         → 写 llm_call_logs（独立 Session）：task_id, model_name, provider, prompt_type, prompt_tokens, completion_tokens, total_tokens, cost_usd, latency_ms, success, error_message
       → 返回 JSON：{ overall, dimensions, hard_blockers, is_high_quality, optimization_strategy }
       → build_content_score() 落库 ContentScore（score_type='before'，dimension_comments JSON 承载全量平台化维度）
    3) _call_rewrite_package() ← Call 2
       → prompt_service.render('rewrite-package.md', { original_article, brand_facts, score_result, optimization_strategy, source_policy, publish_platform, perspective, output_length, need_schema, ... })
       → llm_service.chat_json(prompt_type='rewrite', temperature=0.7, model_config)
       → 写 llm_call_logs
       → 返回 JSON：{ title, final_article, faq_content, schema_suggestions, optimization_strategy, missing_sources, comparison_summary, missing_facts, score_after }
    4) 可选 _call_quality_check() ← Call 3（P0 enable_quality_check=False 默认关闭）
       → prompt_service.render('quality-check.md', { original_article, rewritten_article, brand_facts, source_policy, hard_blockers_before, missing_sources_list })
       → llm_service.chat_json(prompt_type='quality', temperature=0.0)
       → 返回 JSON：{ passed, quality_status, publish_label, reasons, highlights, warnings, issues_found }
    5) _persist_output()
       → rewrite_outputs_repo.create() 落库 RewriteOutput（version 自增，parent_version_id 用于 regenerate 链）
       → build_content_score() 落库 ContentScore（score_type='after'）
       → task.status = 'completed'
       → 异常时 task.status = 'failed' + error_message
  ↓ 前端 useTaskStatus(taskId, status) 每 3s 轮询 /api/tasks/{taskId}
    终态自动 invalidate outputs 查询
  ↓ 前端 useRewriteOutputs(taskId) → pickLatestOutput() → useOutputDetail(outputId)
    → 渲染 RewriteResultPage：Tabs（正文/原文对比/FAQ/Schema）+ Inspector（评分雷达/优化策略/来源缺口）
  ↓ 用户点「复制正文」→ cleanFinalArticle(final_article) → copyToClipboard
  ↓ 用户点「导出 HTML」→ exportHtml.ts buildHtmlReport() → Blob 下载
  ↓ 用户点「导出 Markdown」→ GET /api/outputs/{output_id}/export?format=markdown → 文件流
  ↓ 用户点「重新改写」→ POST /api/outputs/{output_id}/regenerate → 新版本号 + parent_version_id
```

### 20.3.2 内容生成

**未发现。** Rewrite 没有独立的内容生成调用链。前端 `NewRewritePage.tsx` 的三个输入 Tab（粘贴 / 上传 / 链接）都要求"原文"。`RewriteTask.original_content` 字段在 `models/rewrite_task.py` 中虽未显式 `nullable=False`，但 `_run_in_thread()` 直接将 `task.original_content` 传给 `score-and-diagnose.md`，若为空会导致 LLM 返回错误。

**DIGLLM2 必须自行实现 generate 模式调用链**，参考 optimize 链路的 LLMService + PromptService 抽象，但输入改为结构化 Brief（主题/受众/类型/渠道/品牌语气/必须回答的问题/必须引用的事实/禁止声明/CTA/GEO 要求/SEO 要求）。

### 20.3.3 HTML 报告生成

```
前端 RewriteResultPage.tsx
  ↓ 用户点 TopBar「导出 HTML」按钮
  → <ExportButton format="html" htmlReportArgs={{ task, output, project, beforeMetrics, afterMetrics, assetType }} />
  ↓ frontend/src/components/common/ExportButton.tsx
  → import { buildHtmlReport } from '@/lib/exportHtml'
  → const html = buildHtmlReport({ task, output, project, beforeMetrics, afterMetrics, assetType })
  → const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  → URL.createObjectURL(blob) → <a download={filename + '.html'} />
  ↓ exportHtml.ts buildHtmlReport()
    → 内联 CSS（A4 风格、@page、@media print）
    → 模块拼接（字符串模板）：
       1. 报告头（任务标题 + 资产类型 + 模型信息 + 生成时间）
       2. 发布检查摘要（Quality Gate 结果）
       3. Score Hero（改前/改后评分对比）
       4. 优化建议（optimization_strategy 数组）
       5. 待补证据与风险（missing_sources + missing_facts）
       6. 终稿正文（cleanFinalArticle 清洗后 + 复制按钮）
       7. 内容优化说明（splitComparisonSummary 拆分主优化说明与"附：发布附属信息"）
       8. FAQ（parseFaqItems 解析 Q/A 对）
       9. 发布建议（PlatformPublishGuide 渲染）或 Schema 建议（JSON-LD 代码块）
      10. 原始素材（原文 + 关联 BrandFact 列表）
    → escapeHtml() 转义
    → renderMarkdownLikeHtml() 轻量 Markdown 渲染（# 标题 / **加粗** / 列表 / 代码块）
  ↓ 单文件 HTML 下载，离线可看，打印为 A4
```

**特点：**
- HTML 由前端纯字符串模板生成，非 LLM 生成
- CSS 完全内联，无外部依赖
- 适合直接迁移为 DIGLLM2 ArtifactRenderer
- 但与 React 组件解耦不够（参数对象较大），迁移时建议改为独立函数模块

### 20.3.4 一键复制纯净正文

```
前端 RewriteResultPage.tsx
  ↓ 用户点 TopBar「复制正文」按钮 OR 改写正文 Tab 内的复制按钮
  → handleCopy()
  → const cleaned = cleanFinalArticle(output.final_article, assetType)
  → await copyToClipboard(cleaned)
  ↓ frontend/src/lib/cleanArticle.ts cleanFinalArticle()
    1. 按行拆分
    2. 代码围栏检测（```markdown / ```html / ```）→ 围栏行丢弃，围栏内内容丢弃
    3. 去掉 HTML 标签（保留标签内文本）
    4. 去掉 Markdown 标题符号 # / ## / ###（保留标题文本）
    5. 报告型独立标题行黑名单匹配（内容摘要/开头钩子/正文/收藏评论引导/优化建议/评分/来源缺口/待补充事实/交付摘要/可发布正文）→ 整行移除
    6. 去掉普通话题 # 号（#智能客服 → 智能客服），避免误伤 C# / F#
    7. 列表符号 - / * → • ，数字列表保留
    8. 清理多余空行（连续 3+ 空行压缩为 2）
    9. trim()
  ↓ 复制到剪贴板，可直接粘贴到公众号/官网编辑器/飞书文档/Word
```

**特点：** 纯前端清洗，不依赖后端；规则黑名单基于经验积累，迁移时需评估是否覆盖 DIGLLM2 所有内容资产类型。

### 20.3.5 RAG / 知识检索

**未发现真实 RAG 调用链。**

Rewrite 的"知识库"实现：

```
后端 RewriteService._load_facts()
  ↓ brand_facts_repo.list_by_project(project_id)
    → SELECT * FROM brand_facts WHERE project_id=? AND is_active=1
    → LIMIT 20（MAX_FACTS_PER_TASK 常量）
  ↓ 序列化为 JSON 字符串
  ↓ 拼接到 Prompt 的 {{brand_facts}} 变量
  ↓ LLM 在生成时"看到"事实文本，但无法追溯到具体 Chunk
```

**特点：**
- BrandFact 是关系表（`models/brand_fact.py`），不是向量索引
- 字段：fact_type / title / content / source_type / source_url / evidence_level / tags / is_active
- 注入方式：直接 JSON 序列化进 Prompt
- 无 Chunk 概念，无检索分数，无 Top-K，无 Rerank
- 无 brand_id 强制过滤（用 project_id 关联）
- 无文档版本，无 Embedding，无 Qdrant
- `missing_sources` 字段是字符串数组，不关联任何文档实体

**与 DIGLLM2 Qdrant 规划的关系：** 见 20.7 迁移矩阵。

### 20.3.6 草稿与版本

```
创建任务 → status=pending，无 output
首次完成 → RewriteOutput version=1, parent_version_id=null
  ↓ task.status=completed
用户点「重新改写」
  ↓ POST /api/outputs/{output_id}/regenerate
  ↓ api/outputs.py::regenerate_output()
    → 读取原 output 的 task 与参数
    → 创建新 RewriteTask（继承参数）OR 复用 task
    → rewrite_service.kickoff() 再次跑三段式
    → _persist_output() 时 version = max(task.outputs.version) + 1
    → parent_version_id = 原 output.id
  ↓ 新 RewriteOutput version=2, parent_version_id=out_v1.id
  ↓ 前端 useRewriteOutputs(taskId) 按 version desc 排序
    → pickLatestOutput() 取最新
    → 用户可在版本列表切换查看历史版本
```

**特点：**
- 版本基于 `RewriteOutput.version` Integer + `parent_version_id` 自引用
- UniqueConstraint(task_id, version) 保证单任务内版本唯一
- **无 Diff 能力**：前端只展示当前版本内容，不做前后版本对比
- **无用户编辑版本**：所有版本都是 LLM 生成，用户不能直接编辑 `final_article` 落库
- **无审核流**：`review_status` 字段（ready/review/needs_material/exported）只是标签，无状态机驱动
- **无定稿概念**：导出不修改 review_status，无"标记为定稿"操作
- **无发布记录**：无 PublishRecord 表，无发布 URL

---

## 20.4 文件与符号清单

### 后端核心文件

| 文件路径 | 类 / 函数 / 路由 | 作用 | 是否正式入口 |
|---|---|---|---|
| `backend/app/main.py` | `app = FastAPI()` | FastAPI 入口，注册 6 个 router，启动时 init_db + 校验 LLM_API_KEY + MODEL_CONFIG_SECRET_KEY | 是 |
| `backend/app/config.py` | `Settings` | 配置（database_url/llm_api_key/llm_base_url/llm_model/llm_timeout=120/enable_quality_check=False/model_config_secret_key/cors_origins） + `PROMPTS_DIR = BACKEND_DIR / "app" / "prompts"` | 是 |
| `backend/app/database.py` | `init_db` / `SessionLocal` / `get_db` | SQLAlchemy 引擎 + 会话工厂 | 是 |
| `backend/app/api/rewrite_tasks.py` | `POST /api/projects/{project_id}/tasks` / `GET /api/tasks/{task_id}` / `PUT /api/tasks/{task_id}` / `POST /api/tasks/{task_id}/retry` | 任务 CRUD + retry | 是 |
| `backend/app/api/outputs.py` | `GET /api/tasks/{task_id}/outputs` / `GET /api/outputs/{output_id}` / `POST /api/outputs/{output_id}/regenerate` | 输出查询 + 重新改写 | 是 |
| `backend/app/api/export.py` | `GET /api/outputs/{output_id}/export?format=markdown\|json` | 文件流导出 | 是 |
| `backend/app/api/projects.py` | Project CRUD | 项目管理 | 是 |
| `backend/app/api/brand_facts.py` | BrandFact CRUD | 品牌事实管理 | 是 |
| `backend/app/api/settings_models.py` | `GET/POST/PUT/DELETE /api/settings/models` | 模型配置 CRUD + 测试连接 | 是 |
| `backend/app/services/rewrite_service.py` | `RewriteService.kickoff()` / `_run_in_thread()` / `run_rewrite()` / `_load_facts()` / `_call_rewrite_package()` / `_call_quality_check()` / `_persist_output()` | 核心改写编排 | 是 |
| `backend/app/services/scoring_service.py` | `ScoringService.score_and_diagnose()` / `build_content_score()` / `score_summary_from_score()` / `DIMENSION_MAP` | Call 1 评分诊断 | 是 |
| `backend/app/services/llm_service.py` | `LLMService.chat_json()` | 统一 LLM 调用入口，OpenAI 兼容，JSON Mode，重试 2 次，写 llm_call_logs | 是 |
| `backend/app/services/prompt_service.py` | `PromptService.render()` / `_load_file()` / `_interpolate()` / `_extract_section()` / `PROMPTS_DIR` / `lru_cache` | Prompt 文件加载与插值 | 是 |
| `backend/app/services/export_service.py` | `build_markdown()` / `build_json()` / `_platform_guide_block()` / `_strip_faq_header()` | Markdown / JSON 导出 | 是 |
| `backend/app/services/model_runtime.py` | `build_client()` / `test_model_config()` | OpenAI client 构建 + 连接测试 | 是 |
| `backend/app/services/crypto_service.py` | `encrypt_api_key()` / `decrypt_api_key()` | Fernet 加密解密 | 是 |
| `backend/app/services/brand_fact_service.py` | BrandFact 业务逻辑 | 品牌事实服务 | 是 |
| `backend/app/models/rewrite_task.py` | `RewriteTask` 表 | 任务表（project_id/original_content/article_type/perspective/publish_platform/source_policy/output_length/need_schema/brand_fact_ids/status/error_message/model_config_id/model_provider/model_name/model_display_name） | 是 |
| `backend/app/models/rewrite_output.py` | `RewriteOutput` 表 | 输出表（version/parent_version_id/final_article/faq_content/schema_suggestions/optimization_strategy/comparison_summary/missing_sources/missing_facts/review_status/raw_response） + UniqueConstraint(task_id, version) | 是 |
| `backend/app/models/brand_fact.py` | `BrandFact` 表 | 品牌事实表（fact_type/title/content/source_type/source_url/evidence_level/tags/is_active） | 是 |
| `backend/app/models/content_score.py` | `ContentScore` 表 | 评分表（output_id/score_type=before\|after/overall + 6 维度列/dimension_comments JSON/raw_markdown） | 是 |
| `backend/app/models/llm_call_log.py` | `LLMCallLog` 表 | LLM 调用日志（task_id/output_id/model_name/provider/prompt_type=score\|rewrite\|quality/prompt_tokens/completion_tokens/total_tokens/cost_usd/latency_ms/success/error_message） | 是 |
| `backend/app/models/model_config.py` | `ModelConfig` 表 | 模型配置表（provider/display_name/api_key_encrypted/base_url/model_id/enabled/is_default/temperature/max_tokens/supports_streaming） | 是 |
| `backend/app/models/project.py` | `Project` 表 | 项目表（name/description/brand_name/default_perspective/default_platform/workspace_type=brand\|professional\|media\|agency） | 是 |

### Prompt 文件

| 文件路径 | 作用 | 是否正式入口 |
|---|---|---|
| `backend/app/prompts/system-role.md` | System Prompt：GEO 内容架构师角色 / DSS+E 模型 / AI Trigger Pattern / 防幻觉规则 / Source Policy / 平台差异化规则 | 是（所有 Call 共用） |
| `backend/app/prompts/score-and-diagnose.md` | Call 1 Prompt：6 维 GEO Scorecard 评分 + 硬阻断 + 高质量保护模式判定 + 3-8 条 optimization_strategy | 是 |
| `backend/app/prompts/rewrite-package.md` | Call 2 Prompt（1054 行）：6 类内容资产类型适配 + 旧平台兼容 + final_article 纯净性铁律 + FAQ 独立规则 + Schema/PlatformPublishGuide 二选一 + missing_sources/comparison_summary | 是（最核心） |
| `backend/app/prompts/quality-check.md` | Call 3 Prompt（可选）：5 维度检查 + quality_status(ready/review/needs_material) | 存在但未接线（P0 默认关闭） |
| `backend/app/prompts/references/perspectives.md` | 视角规则参考文件，被 prompt_service 动态抽取章节 | 是 |
| `backend/app/prompts/references/platforms.md` | 平台规则参考文件，被 prompt_service 动态抽取章节 | 是 |

### 前端核心文件

| 文件路径 | 类 / 函数 / 组件 | 作用 | 是否正式入口 |
|---|---|---|---|
| `frontend/src/App.tsx` | `App` 路由表 | 9 个路由（projects/projects/:id/facts/inbox/rewrite/new/tasks/:id/result/multi-platform-result/history/enterprise） | 是 |
| `frontend/src/services/api.ts` | `projectApi` / `brandFactApi` / `rewriteTaskApi` / `outputApi` / `exportApi` / `modelConfigApi` | axios 客户端，baseURL `http://localhost:8000/api`，统一解包 envelope.data | 是 |
| `frontend/src/pages/NewRewritePage.tsx` | `NewRewritePage` 组件（1200 行） | 单页文章工作台，左侧编辑区（粘贴/上传/链接三 Tab）+ 右侧操作卡（6 类资产类型 chips/模型选择/先诊断/开始优化/高级设置） | 是 |
| `frontend/src/pages/RewriteResultPage.tsx` | `RewriteResultPage` 组件 | 改写结果页，Tabs（正文/原文对比/FAQ/Schema）+ Inspector + TopBar 操作区（复制/导出/重新改写） | 是 |
| `frontend/src/lib/exportHtml.ts` | `buildHtmlReport()` / `escapeHtml()` / `renderMarkdownLikeHtml()` / `parseFaqItems()` / `splitComparisonSummary()` | 前端生成 A4 风格 HTML 报告（1289 行） | 是 |
| `frontend/src/lib/cleanArticle.ts` | `cleanFinalArticle()` / `REPORT_TITLE_BLACKLIST` | 纯净正文清洗（去 Markdown 标题/代码围栏/HTML 标签/报告型标题/话题号/列表符号） | 是 |
| `frontend/src/lib/contentMetrics.ts` | `computeContentMetrics()` / `formatMetricsLine()` / `formatCharDelta()` | 内容规模统计（纯前端计算） | 是 |
| `frontend/src/lib/qualityGate.ts` | `detectArticlePollution()` / `getQualityGateFromOutput()` / `getScoreDelta()` / `getTopDeclinedDimensions()` / `getQualityGateMetaForPlatform()` | Quality Gate 阈值与文案（平台差异化） | 是 |
| `frontend/src/lib/platformScorecard.ts` | `getPlatformScorecardConfig()` / `getScorecardBadgeLabel()` | 平台 Scorecard 配置 | 是 |
| `frontend/src/common/workspace.ts` | `mapPlatformToAssetType()` / `isDeprecatedPlatform()` | 旧平台到新资产类型映射 + 已下线平台判断 | 是 |
| `frontend/src/mock/data.ts` | `mockProjects` / `mockBrandFacts` / `mockTasks` / `mockOutput` | Mock 数据（仅在 API 失败时 fallback） | 否（仅 fallback） |

### 其他文件

| 文件路径 | 作用 | 是否正式入口 |
|---|---|---|
| `SKILL.md`（仓库根） | GEO Rewrite Skill 定义文档（mode/perspective/publish_platform/source_policy/output_length/need_schema 等输入；DSS+E 模型；6 维 Scorecard；输出结构） | 否（仅人类阅读，后端代码未引用） |
| `agents/openai.yaml` | OpenAI Agents 配置 | 否（与后端运行链路无关） |
| `backend/.env.example` | 环境变量示例 | 是（配置参考） |

---

## 20.5 数据关系图

基于真实代码绘制：

```
┌─────────────────┐
│   projects      │  workspace_type: brand | professional | media | agency
│ (Project 表)    │  default_perspective, default_platform
└────────┬────────┘
         │ 1:N
         │
         ├──────────────────────────────┐
         │                              │
         ▼                              ▼
┌─────────────────┐            ┌─────────────────────┐
│  brand_facts    │            │   rewrite_tasks     │
│ (BrandFact 表)  │            │  (RewriteTask 表)   │
─────────────────-             └──────────┬──────────┘
fact_type                      project_id │ original_content
title                                     │ publish_platform
content                                   │ perspective
source_type                               │ source_policy
source_url                                │ output_length
evidence_level                            │ need_schema
tags (JSON)                               │ brand_fact_ids (JSON)
is_active                                 │ model_config_id
                                          │ model_provider/model_name/model_display_name
                                          │ status: pending|running|completed|failed
                                          │ error_message
                                          │
                                          │ 1:N
                                          ▼
                                ┌─────────────────────┐
                                │  rewrite_outputs    │
                                │ (RewriteOutput 表)  │
                                └──────────┬──────────┘
                                           │ version (Integer, 自增)
                                           │ parent_version_id (自引用，regenerate 链)
                                           │ title
                                           │ final_article (Text)
                                           │ faq_content
                                           │ schema_suggestions (JSON)
                                           │ optimization_strategy (JSON)
                                           │ comparison_summary
                                           │ missing_sources (JSON 数组字符串)
                                           │ missing_facts (JSON)
                                           │ review_status: ready|review|needs_material|exported
                                           │ raw_response (Text)
                                           │
                                           │ 1:N
                                           ├────────────────────────┐
                                           │                        │
                                           ▼                        ▼
                                ┌─────────────────────┐  ┌─────────────────────┐
                                │   content_scores    │  │   llm_call_logs     │
                                │ (ContentScore 表)   │  │ (LLMCallLog 表)     │
                                └─────────────────────┘  └─────────────────────┘
                                score_type: before|after  prompt_type: score|rewrite|quality
                                overall                   model_name, provider
                                6 维度固定列              prompt_tokens/completion_tokens
                                dimension_comments (JSON) total_tokens, cost_usd
                                raw_markdown              latency_ms, success, error_message

  ┌─────────────────────┐
  │   model_configs     │  独立表，被 RewriteTask.model_config_id 引用
  │ (ModelConfig 表)    │  api_key_encrypted (Fernet)
  └─────────────────────┘  is_default（首个添加自动设为默认）
                           enabled
```

**关键关系：**
- `projects` 1:N `brand_facts`
- `projects` 1:N `rewrite_tasks`
- `rewrite_tasks` 1:N `rewrite_outputs`（通过 version 区分）
- `rewrite_outputs` 1:N `content_scores`（before + after 一对）
- `rewrite_tasks` 1:N `llm_call_logs`（每次 LLM 调用一条）
- `rewrite_outputs` N:1 `rewrite_outputs`（parent_version_id 自引用）
- `model_configs` 独立表，被 `rewrite_tasks.model_config_id` 引用
- `brand_fact_ids` 是 JSON 字符串数组，**非外键约束**，仅运行时关联

**未发现的实体：**
- Article / Content / Draft / GenerationTask / OptimizationTask / Run / Artifact / Report（被 RewriteTask + RewriteOutput 合并表达）
- Prompt / PromptVersion（无表，Prompt 是文件常量）
- SkillRun（无 Skill 机制）
- Citation / Source（无独立表，missing_sources 是字符串数组）
- KnowledgeDocument / KnowledgeChunk / RetrievalRun（无 RAG）
- PublishRecord（无发布）

---

## 20.6 冲突和重复

### 20.6.1 重复生成入口

**未发现明显的重复生成入口。** Rewrite 的内容优化只有一条主链路：`NewRewritePage` → `POST /api/projects/{project_id}/tasks` → `RewriteService.kickoff()`。但存在以下"准重复"：

1. **`POST /api/tasks/{task_id}/retry` vs `POST /api/outputs/{output_id}/regenerate`**：
   - retry 用于任务失败后重试（同任务同参数，不创建新任务）
   - regenerate 用于成功后基于版本重新改写（创建新版本，parent_version_id 关联）
   - 两者都调用 `rewrite_service.kickoff()`，但语义不同，不算重复

2. **`PUT /api/tasks/{task_id}` 更新参数后重新 kickoff**：
   - 这是参数修改后重新触发，会创建新版本，与 regenerate 类似
   - 但入口在前端"任务编辑"而非"重新改写"按钮

### 20.6.2 重复 Prompt

**未发现重复 Prompt。** 4 个 Prompt 文件职责清晰：
- `system-role.md`：System Prompt
- `score-and-diagnose.md`：Call 1
- `rewrite-package.md`：Call 2
- `quality-check.md`：Call 3

但 `system-role.md` 中定义的"DSS+E 模型"、"AI Trigger Pattern"、"Source Policy"、"平台差异化规则"在 `rewrite-package.md` 中部分重复表述。这是 Prompt 工程的常见做法（强化模型记忆），不算缺陷，但迁移到 DIGLLM2 时建议合并去重。

### 20.6.3 Legacy 页面

1. **`/multi-platform-result` 路由**：在 `App.tsx` 中存在，但 `NewRewritePage.tsx` 的多类型并行已经用 `Promise.allSettled` 处理，可能存在历史遗留的多平台结果聚合页。需运行时确认是否仍被前端导航调用。

2. **`/enterprise` 路由**：在 `App.tsx` 中存在，但与 GEO Rewrite 核心流程无关，可能是企业版入口的占位。需运行时确认。

3. **小红书（XHS）相关代码**：
   - `mapPlatformToAssetType()` 中保留小红书映射
   - `isDeprecatedPlatform()` 标记小红书为已下线
   - `rewrite-package.md` 中 C.1-C.7 小红书规则最详尽（最完整的 Prompt 分支）
   - `getSchemaTabLabel()` 中小红书保留"图文脚本"文案
   - 这是 Legacy 代码，不能直接删除（历史任务需展示），但新任务不会创建

### 20.6.4 未使用 API

**未发现明显的未使用 API。** 6 个 router 都被前端 `services/api.ts` 封装调用。但以下 API 可能存在低使用率：

1. `GET /api/tasks/{task_id}/outputs` 与 `GET /api/outputs/{output_id}`：前端先查列表再查详情，存在 N+1 风险，但不算未使用
2. `PUT /api/tasks/{task_id}`：前端是否提供任务编辑入口需运行时确认

### 20.6.5 前端 Mock

**`frontend/src/mock/data.ts` 中存在 Mock 数据：**
- `mockProjects` / `mockBrandFacts` / `mockTasks` / `mockOutput`

**Mock 进入正式链路的风险：**
- `NewRewritePage.tsx` 中存在 `projectErr ? mockProjects.find(...)` 的 fallback 逻辑
- `RewriteResultPage.tsx` 已明确移除 mock fallback（注释："真实 API 模式：失败时不再 fallback 到 mockTasks，让错误暴露"）

**结论：** Mock 仅在 `NewRewritePage` 的项目列表加载失败时作为兜底，不会进入 LLM 调用链路。但运行环境配置 `LLM_API_KEY` 后，真实链路启用，Mock 不会触发。DIGLLM2 迁移时应完全移除 Mock。

### 20.6.6 后端模板

**未发现固定模板返回。** 所有 LLM 输出都通过 `LLMService.chat_json()` 真实调用模型，无"if 模型不可用则返回固定 JSON"的逻辑。失败时直接 `task.status = failed` + `error_message`。

### 20.6.7 重复模型配置

**未发现重复模型配置机制。** 模型配置统一在 `ModelConfig` 表 + `settings_models.py` API + `model_runtime.py` 构建客户端。`backend/.env` 中的 `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` 是默认 fallback（当 `ModelConfig` 表为空时使用），不是重复。

### 20.6.8 与 Qdrant 规划冲突

| 目标原则 | Rewrite 当前实现 | 冲突级别 | 说明 |
|---|---|---|---|
| MySQL 真相源 | SQLite（`config.py` database_url=sqlite） | 中 | DIGLLM2 已规划 MySQL，需替换连接字符串 + 方言适配 |
| Qdrant 可重建 | 无 Qdrant | 无冲突 | 需新建 |
| 单 Collection + Payload | 无向量库 | 无冲突 | 需新建 |
| brand_id 强制过滤 | 用 project_id 关联 BrandFact | 低 | DIGLLM2 需补 brand_id 维度，project_id 仍保留 |
| brand/project scope | 仅 BrandFact（scope 隐含为 brand） | 低 | DIGLLM2 需显式区分 brand/project scope |
| 项目知识快照 | 无项目知识概念 | 无冲突 | 需新建 |
| 文档版本 | 无文档版本管理 | 无冲突 | 需新建 |
| Chunk 来源追溯 | 无 Chunk | 无冲突 | 需新建 |
| 异步索引 | threading.Thread | 高 | 与 Redis + Worker 规划直接冲突，需替换 |
| Embedding 版本管理 | 无 Embedding | 无冲突 | 需新建 |

**总体判断：** Rewrite 与 DIGLLM2 Qdrant 规划**无直接代码冲突**（因为 Rewrite 完全没有向量检索代码），但**架构层面需替换异步机制**（threading.Thread → Redis + Worker）和**数据库**（SQLite → MySQL）。

### 20.6.9 文档与代码冲突

1. **`SKILL.md` vs 后端实现**：
   - `SKILL.md` 定义 `mode` 字段（rewrite/score_only/schema_only/audit_plan）
   - 后端 `RewriteTask` **没有 mode 字段**，只走 rewrite 全流程
   - `score_only` / `schema_only` / `audit_plan` 模式在代码中未实现
   - 这是文档与代码的明确冲突，DIGLLM2 迁移时应以代码为准

2. **`SKILL.md` 输出结构 vs 实际 LLM 输出**：
   - `SKILL.md` 定义了完整的输出结构（标题/原文 Scorecard/问题诊断/优化策略/改写后正文/FAQ/Schema 建议/改写后评分/前后对比/待补充来源）
   - 实际 `rewrite-package.md` 的输出 JSON 与此基本一致，但字段命名有差异（如 `final_article` vs "改写后正文"）
   - 这是文档表述与代码实现的细微差异，不影响功能

3. **`agents/openai.yaml` vs 后端**：
   - 该文件配置 OpenAI Agents 框架
   - 后端代码完全未引用该文件
   - 这是 Legacy 或实验性配置，不影响运行

---

## 20.7 迁移矩阵

| Rewrite 能力 | DIGLLM2 目标位置 | 处理方式 | 依赖 | 风险 |
|---|---|---|---|---|
| **三段式调用链架构**（score → rewrite → quality） | ContentSkill 核心编排层 | 抽取为独立模块 | LLMService 抽象 | 低：架构清晰，可整体迁移 |
| **Prompt 文件加载与插值**（`prompt_service.py`） | ContentSkill PromptService | 抽取为独立模块 | 无 | 低：代码简洁，lru_cache 可保留 |
| **system-role.md**（GEO 内容架构师角色） | ContentSkill SystemPrompt | 直接迁移 + 补版本化 | 无 | 低：纯文本，可立即迁移 |
| **score-and-diagnose.md**（Call 1 评分诊断） | ContentSkill score 子 Skill | 直接迁移 + 补版本化 | system-role.md | 低：6 维 Scorecard 工程化程度高 |
| **rewrite-package.md**（Call 2 改写包，1054 行） | ContentSkill optimize 子 Skill | 直接迁移 + 补版本化 + 拆分 6 类资产类型为独立子 Skill | system-role.md | 中：文件过大，6 类资产类型规则可拆分；小红书 Legacy 规则需评估保留 |
| **quality-check.md**（Call 3 质检） | ContentSkill quality_check 子 Skill | 直接迁移 + 默认启用 | system-role.md | 低：P0 默认关闭，DIGLLM2 可启用 |
| **references/perspectives.md** + **platforms.md** | ContentSkill 参考文件 | 直接迁移 | 无 | 低：纯文本参考 |
| **LLMService.chat_json()**（统一 LLM 调用） | AIAbilityRouter 子模块 | 抽取为独立模块 + 接入 DIGLLM2 路由 | OpenAI SDK | 低：JSON Mode + 重试 + 解析容错是成熟实现 |
| **JSON Mode 解析容错**（直接解析 → 去 fence → 正则提取） | AIAbilityRouter 输出解析器 | 抽取为独立工具 | 无 | 低：容错逻辑可复用 |
| **LLMCallLog 模型审计** | AIAbilityRouter 调用日志 | 直接迁移表结构 + 扩展 prompt_version 字段 | 无 | 低：字段完整，仅需补 prompt 版本 |
| **ModelConfig + Fernet 加密** | AIAbilityRouter 模型配置 | 直接迁移 + 接入 DIGLLM2 控制中心 | cryptography 库 | 低：加密实现成熟 |
| **ScoringService.score_and_diagnose()** | ContentSkill score 子 Skill 服务层 | 抽取为独立模块 | LLMService | 低：DIMENSION_MAP 工程化程度高 |
| **DIMENSION_MAP 6 维映射** | ContentSkill 评分维度配置 | 直接迁移 | 无 | 低：6 维 Scorecard 是 GEO 核心资产 |
| **build_content_score() + dimension_comments JSON** | ContentSkill 评分存储 | 抽取为独立模块 | ContentScore 表 | 低：平台化维度承载方式成熟 |
| **6 类内容资产类型规则** | ContentSkill 资产类型配置 | 直接迁移规则 + 重新映射到 DIGLLM2 三种入口 | 无 | 中：映射关系需重新设计（独立创作/快检报告/八阶段治理 vs 6 类资产类型） |
| **DSS+E 黄金模型** | ContentSkill 方法论 | 直接迁移（已写入 Prompt） | 无 | 低：纯方法论 |
| **AI Trigger Pattern**（定义句/对比句/因果句/总结句/证据句/场景句） | ContentSkill 写作模式 | 直接迁移（已写入 Prompt） | 无 | 低：纯写作规则 |
| **Source Policy 三策略** | ContentSkill 来源策略 | 直接迁移 | 无 | 低：三策略清晰 |
| **Schema/PlatformPublishGuide 二选一机制** | ContentSkill Schema 生成策略 | 直接迁移 | 无 | 低：机制清晰 |
| **export_service.build_markdown()** | ContentSkill Markdown 导出 | 抽取为独立模块 | 无 | 低：字段拼接逻辑清晰 |
| **exportHtml.ts buildHtmlReport()** | ArtifactRenderer | 抽取为独立模块 + 解耦 React 参数 | 无 | 中：1289 行，参数对象较大，需重构为独立函数 |
| **cleanFinalArticle()** | ArtifactRenderer 纯净正文工具 | 抽取为独立工具 | 无 | 低：纯函数，规则黑名单可扩展 |
| **Quality Gate 阈值与文案**（`qualityGate.ts`） | ContentSkill 质量门控 | 抽取为独立模块 + 平台差异化配置 | 无 | 低：平台差异化已实现 |
| **platformScorecard.ts** | ContentSkill Scorecard 配置 | 抽取为独立模块 | 无 | 低：配置驱动 |
| **mapPlatformToAssetType() + isDeprecatedPlatform()** | ContentSkill 资产类型映射 | 参考后重写（DIGLLM2 三种入口与 6 类资产类型映射不同） | 无 | 中：映射关系需重新设计 |
| **RewriteOutput.version + parent_version_id** | ContentTask 草稿与版本 | 抽取为独立模块 + 扩展审核流 | 无 | 中：版本管理轻量但可用，需补 Diff、用户编辑、定稿 |
| **review_status 字段** | ContentTask 审核状态机 | 参考后重写（仅标签，无状态机） | 无 | 高：DIGLLM2 需完整审核流 |
| **RewriteTask 表** | ContentTask 表 | 参考后重写（DIGLLM2 三种入口需统一表结构） | 无 | 高：DIGLLM2 需区分 generate/optimize 模式 |
| **BrandFact 表** | 品牌知识库 + Qdrant | 保留关系表 + 新增 Qdrant 向量索引 | 无 | 中：DIGLLM2 需补 brand_id、文档版本、Chunk |
| **brand_fact_ids JSON 注入 Prompt** | RAG Context Assembly | 由 DIGLLM2 重新实现（Qdrant 检索 + Context 组装） | Qdrant | 高：完全替换为 RAG 链路 |
| **missing_sources 字符串数组** | Citation + Source 表 | 由 DIGLLM2 重新实现 | 无 | 高：需关联文档版本与 Chunk |
| **事实保护 Prompt 软约束** | 程序化 Diff + 事实校验 | 参考后重写 | 无 | 高：DIGLLM2 需补程序化事实保护 |
| **threading.Thread 异步** | Redis + Worker | 由 DIGLLM2 重新实现 | Redis | 高：完全替换 |
| **NewRewritePage 单页工作台** | DIGLLM2 内容任务创建页 | 参考后重写（DIGLLM2 三种入口） | 无 | 高：UI 流程不同 |
| **RewriteResultPage 结果页** | DIGLLM2 内容任务结果页 | 参考后重写 | 无 | 中：UI 流程不同，但 Tabs + Inspector 布局可参考 |
| **useTaskStatus 3s 轮询** | WebSocket / SSE 推送 | 由 DIGLLM2 重新实现 | 无 | 中：DIGLLM2 应改为实时推送 |
| **Promise.allSettled 多平台并行** | ContentTask 批量创建 | 参考实现 | 无 | 低：并行处理模式可参考 |
| **diagnoseArticle 前端启发式预诊断** | 可选：前端预诊断 | 参考实现 | 无 | 低：非 LLM，仅 UX 增强 |
| **mock/data.ts** | 不迁移 | 保留 Rewrite，不迁移 | 无 | 无 |
| **SKILL.md**（仓库根） | 不迁移 | 保留 Rewrite，不迁移 | 无 | 无：仅文档，与代码不一致 |
| **agents/openai.yaml** | 不迁移 | 保留 Rewrite，不迁移 | 无 | 无：Legacy |
| **小红书 Legacy 规则** | 不迁移 | 保留 Rewrite，不迁移 | 无 | 无：已下线 |
| **/enterprise 路由** | 不迁移 | 保留 Rewrite，不迁移 | 无 | 无：与 GEO 无关 |
| **/multi-platform-result 路由** | 不迁移 | 保留 Rewrite，不迁移 | 无 | 无：Legacy |

---

## 20.8 P0 / P1 / P2

### P0：阻止内容生成和优化成为真实企业能力的问题

| # | 问题 | 影响 | 建议处理 |
|---|---|---|---|
| P0-1 | Rewrite 无 generate 模式，DIGLLM2 三种入口中的"独立内容创作"无法复用 | DIGLLM2 必须自建 generate 调用链 | 设计 generate Brief 结构（主题/受众/类型/渠道/品牌语气/必须回答的问题/必须引用的事实/禁止声明/CTA/GEO 要求/SEO 要求）+ 新建 generate Prompt |
| P0-2 | 无 RAG，BrandFact 仅 JSON 注入，无法支持"项目知识快照 + 已确认品牌事实 + 任务临时资料 + 治理策略 + 快检发现的内容缺口 + 必须使用的事实 + 禁止使用声明 + Chunk 版本追溯" | DIGLLM2 内容链路无法满足企业级 RAG 需求 | 完整实现 Qdrant 单 Collection + Payload 隔离 + brand_id 强制过滤 + 项目知识快照 + Chunk 来源追溯 |
| P0-3 | 异步任务用 threading.Thread，不可恢复、不可重试、不可水平扩展 | DIGLLM2 生产环境无法承载并发 | 替换为 Redis + Worker（Celery 或 ARQ），任务幂等 + 可重试 + 可取消 |
| P0-4 | 数据库为 SQLite，不支持多 worker 并发写入 | DIGLLM2 生产环境无法水平扩展 | 迁移到 MySQL，SQLAlchemy 方言适配 |
| P0-5 | Prompt 无版本化（文件常量，无 prompt_id/prompt_version） | DIGLLM2 无法做 Prompt A/B 测试与回滚 | 新建 PromptVersion 表，字段：prompt_id/prompt_version/skill_version/model/temperature/max_tokens/input_snapshot/output/created_at，LLMCallLog 补 prompt_id + prompt_version 关联 |
| P0-6 | 事实保护仅 Prompt 软约束，无程序化 Diff | 优化前后事实变化无法自动检测 | 新建事实校验层：抽取原文实体（数字/日期/人名/机构名/产品名/参数/资质/法律引用）→ 改写后实体对比 → 标记变化 → 阻断或告警 |
| P0-7 | 6 类内容资产类型规则与 DIGLLM2 三种入口映射关系未定义 | DIGLLM2 内容任务创建后无法正确路由到对应 Prompt 分支 | 设计映射表：独立内容创作 → 6 类资产类型；快检报告创建 → 自有官网内容 + 问答型；八阶段治理第六阶段 → 治理策略驱动的资产类型 |

### P1：RAG、事实保护、版本、审核和来源追溯

| # | 问题 | 影响 | 建议处理 |
|---|---|---|---|
| P1-1 | 无来源追溯（missing_sources 是字符串数组，不关联文档版本/Chunk） | DIGLLM2 生成内容无法追溯到原始资料 | 新建 Citation + Source + KnowledgeChunk 表，RewriteOutput 关联 Chunk ID + 检索分数 |
| P1-2 | 无审核流（review_status 仅标签，无状态机驱动） | DIGLLM2 无法支持"用户主动确认与知识审核后才加入品牌知识库" | 新建审核流：草稿 → 提交审核 → 审核通过/驳回 → 定稿 → 可选加入知识库 |
| P1-3 | 无定稿概念（导出不修改 review_status，无"标记为定稿"操作） | DIGLLM2 无法区分"过程稿"与"最终稿" | 新建 finalization 操作，定稿后版本不可变 |
| P1-4 | 无用户编辑版本（所有版本都是 LLM 生成） | DIGLLM2 无法支持"AI 初稿 → 用户编辑稿 → 再生成版本 → 定稿"完整链路 | 扩展 RewriteOutput：新增 editor_type（llm/user）字段，支持用户直接编辑 final_article 落库 |
| P1-5 | 无 Diff 能力（前端只展示当前版本内容） | DIGLLM2 无法支持"原文与新稿对比"局部 Diff | 新增前端 Diff 组件（如 react-diff-viewer），按段落对比 |
| P1-6 | 无发布记录（无 PublishRecord 表，无发布 URL） | DIGLLM2 无法追踪内容资产发布状态 | 新建 PublishRecord 表，关联 ContentTask + 渠道 + 发布时间 + URL |
| P1-7 | 无内容资产管理（无 Asset 表） | DIGLLM2 无法统一管理"已定稿的可复用内容" | 新建 ContentAsset 表，定稿后自动创建资产，支持标签/分类/检索 |
| P1-8 | LLMCallLog 缺 prompt_version 字段 | DIGLLM2 无法做 Prompt 版本与效果归因 | LLMCallLog 补 prompt_id + prompt_version + skill_version |
| P1-9 | BrandFact 无 brand_id 字段（用 project_id 关联） | DIGLLM2 需 brand_id 强制过滤 | BrandFact 补 brand_id 字段，建立 brand → project → brand_fact 三级关系 |
| P1-10 | 无 Embedding 模型配置 | DIGLLM2 RAG 链路缺少 Embedding | ModelConfig 表扩展 supports_embedding 字段，或新建 EmbeddingConfig 表 |
| P1-11 | 无 Rerank 模型配置 | DIGLLM2 RAG 链路缺少 Rerank | ModelConfig 表扩展 supports_rerank 字段，或新建 RerankConfig 表 |

### P2：渠道适配、高级协作、自动发布等

| # | 问题 | 影响 | 建议处理 |
|---|---|---|---|
| P2-1 | rewrite 模式扩展（fact_check / channel_adapt / faq_generate / structure_optimize）未实现 | DIGLLM2 后续扩展能力受限 | 基于现有 optimize 链路扩展子 Skill，每个子 Skill 独立 Prompt + 独立版本 |
| P2-2 | 无自动发布（无 CMS 集成、无 WordPress、无公众号 API） | DIGLLM2 后续自动发布需自建 | P2 阶段实现，每个渠道独立适配器 |
| P2-3 | 无多人协作（无用户登录、无 RBAC、无评论） | DIGLLM2 团队协作需自建 | P2 阶段实现，参考飞书/Lark 审批流 |
| P2-4 | 无 SSE 流式输出 | DIGLLM2 长文本生成体验差 | LLMService 扩展 stream_chat() 方法，前端改用 SSE |
| P2-5 | 无 PDF 导出 | DIGLLM2 后续可能需要 PDF 报告 | 基于 HTML 报告 + Puppeteer/WeasyPrint 生成 PDF |
| P2-6 | 无多账号管理 | DIGLLM2 SaaS 化需自建 | P2 阶段实现 tenant 隔离 |
| P2-7 | 无 Prompt A/B 测试 | DIGLLM2 Prompt 优化无数据支撑 | P2 阶段实现 PromptVersion + 实验组/对照组 + 效果归因 |
| P2-8 | 无 E2E 测试 | DIGLLM2 回归测试缺失 | P2 阶段补 Playwright E2E |
| P2-9 | 无 Prompt 评测（evals） | DIGLLM2 Prompt 质量无量化评估 | P2 阶段实现 evals 框架 |
| P2-10 | 无内容资产库批量导入 | DIGLLM2 历史内容迁移效率低 | P2 阶段实现 |

---

## 20.9 最终建议

### 20.9.1 值得迁移的代码（直接迁移或抽取为独立模块）

**最高价值（直接迁移）：**

1. **`backend/app/prompts/rewrite-package.md`**（1054 行 Call 2 Prompt）
   - GEO 优化规则的最高价值沉淀
   - 6 类内容资产类型适配规则
   - final_article 纯净性铁律
   - Schema/PlatformPublishGuide 二选一机制
   - DSS+E 黄金模型 + AI Trigger Pattern + 防幻觉规则

2. **`backend/app/prompts/score-and-diagnose.md`**（Call 1 Prompt）
   - 6 维 GEO Scorecard 评分体系
   - 硬阻断判定逻辑
   - 高质量保护模式判定
   - optimization_strategy 结构化输出

3. **`backend/app/prompts/system-role.md`**（System Prompt）
   - GEO 内容架构师角色定义
   - 所有 Call 共用的基础规则

4. **`backend/app/prompts/quality-check.md`**（Call 3 Prompt）
   - 5 维度质检规则
   - DIGLLM2 应默认启用

5. **`backend/app/prompts/references/perspectives.md` + `platforms.md`**
   - 视角与平台规则参考

**高价值（抽取为独立模块）：**

6. **`backend/app/services/llm_service.py`**（LLMService.chat_json）
   - 统一 LLM 调用入口
   - JSON Mode + 重试 + 解析容错
   - LLMCallLog 模型审计

7. **`backend/app/services/scoring_service.py`**（ScoringService）
   - DIMENSION_MAP 6 维映射
   - build_content_score + dimension_comments JSON 平台化维度承载

8. **`backend/app/services/prompt_service.py`**（PromptService）
   - 文件加载 + 插值 + lru_cache
   - 章节动态抽取

9. **`backend/app/services/rewrite_service.py`**（三段式编排）
   - kickoff → run_rewrite → score → rewrite → quality → persist
   - DIGLLM2 应保留三段式架构，但替换 threading.Thread 为 Redis + Worker

10. **`frontend/src/lib/exportHtml.ts`**（buildHtmlReport）
    - 1289 行 A4 风格 HTML 报告
    - 内联 CSS + 单文件 + 离线可看
    - 直接迁移为 DIGLLM2 ArtifactRenderer

11. **`frontend/src/lib/cleanArticle.ts`**（cleanFinalArticle）
    - 纯净正文清洗
    - 报告型标题黑名单 + Markdown 符号清洗

12. **`backend/app/services/export_service.py`**（build_markdown）
    - Markdown 导出字段拼接
    - _platform_guide_block + _strip_faq_header

13. **`backend/app/services/model_runtime.py` + `crypto_service.py`**
    - Fernet 加密 + OpenAI client 构建
    - DIGLLM2 AIAbilityRouter 的模型配置层

14. **`backend/app/models/llm_call_log.py`**
    - LLM 调用审计字段完整
    - DIGLLM2 补 prompt_id + prompt_version 即可

15. **`backend/app/models/content_score.py`**
    - 评分表结构 + dimension_comments JSON 平台化维度
    - DIGLLM2 可直接复用

### 20.9.2 值得保留的 Prompt

**全部 4 个 Prompt 文件 + 2 个 references 文件均值得保留**，但需要：

1. **合并去重**：system-role.md 中的 DSS+E / AI Trigger Pattern / Source Policy / 平台差异化规则在 rewrite-package.md 中有重复表述，迁移时合并去重
2. **拆分 6 类资产类型**：rewrite-package.md 中 E-J 分支（6 类内容资产类型）可拆分为 6 个独立子 Prompt，便于维护
3. **删除小红书 Legacy 规则**：rewrite-package.md 中 C.1-C.7 小红书规则最详尽，但小红书已下线，DIGLLM2 不迁移
4. **补版本化**：每个 Prompt 文件关联 prompt_id + prompt_version，落库管理
5. **补 RAG Context 占位符**：新增 `{{retrieved_context}}` `{{citations}}` `{{forbidden_statements}}` 等变量，支持 DIGLLM2 RAG 链路

### 20.9.3 只参考思路、不直接迁移的能力

1. **三段式调用链架构**：参考"score → rewrite → quality"的编排思路，但 DIGLLM2 应基于 Skill 机制重新实现（每个 Call 是独立 Skill）
2. **6 类内容资产类型分类**：参考分类思路，但 DIGLLM2 需基于三种入口（独立创作/快检报告/八阶段治理）重新设计映射
3. **NewRewritePage 单页工作台**：参考"左侧编辑 + 右侧操作卡"布局，但 DIGLLM2 UI 流程不同
4. **RewriteResultPage 结果页**：参考"Tabs + Inspector"布局，但 DIGLLM2 需补 Diff、版本切换、审核操作
5. **useTaskStatus 3s 轮询**：参考状态轮询思路，但 DIGLLM2 应改用 WebSocket/SSE 实时推送
6. **Promise.allSettled 多平台并行**：参考并行处理模式，但 DIGLLM2 批量创建逻辑不同
7. **diagnoseArticle 前端启发式预诊断**：参考 UX 增强思路，DIGLLM2 可选实现
8. **mapPlatformToAssetType + isDeprecatedPlatform**：参考映射思路，但 DIGLLM2 映射关系不同
9. **Quality Gate 阈值与文案**：参考平台差异化思路，DIGLLM2 阈值需重新定义

### 20.9.4 不要迁移的内容

1. **`SKILL.md`（仓库根）**：与后端代码不一致（mode 字段未实现），DIGLLM2 应基于实际迁移后的代码重新编写 Skill 文档
2. **`agents/openai.yaml`**：Legacy 配置，与 GEO Rewrite 运行链路无关
3. **`frontend/src/mock/data.ts`**：Mock 数据，DIGLLM2 应完全移除 Mock
4. **小红书 Legacy 规则**（rewrite-package.md C.1-C.7）：已下线平台，不迁移
5. **`/enterprise` 路由**：与 GEO 无关
6. **`/multi-platform-result` 路由**：Legacy，DIGLLM2 多任务结果聚合应重新设计
7. **`backend/app/models/rewrite_task.py` 表结构**：DIGLLM2 三种入口需统一 ContentTask 表，不能直接复用 RewriteTask
8. **`backend/app/models/rewrite_output.py` 表结构**：DIGLLM2 需扩展为完整版本+审核+定稿+发布记录，不能直接复用
9. **`backend/app/models/brand_fact.py` 表结构**：DIGLLM2 需补 brand_id + 文档版本 + Chunk 关联，不能直接复用
10. **`backend/app/models/project.py` 表结构**：DIGLLM2 项目概念不同（八阶段治理项目 vs Rewrite 项目），不能直接复用
11. **`backend/.env` 中的 LLM_API_KEY 等默认配置**：DIGLLM2 应通过 ModelConfig 表统一管理，不应有 .env fallback

### 20.9.5 朋友 Skill Prompt 后续接入点

朋友的 Skill Prompt 尚未提供。基于 Rewrite 当前架构，**最合适的接入点是 `backend/app/prompts/rewrite-package.md`（Call 2 改写包 Prompt）**。

**接入判断依据：**

1. **rewrite-package.md 是 Rewrite 最高价值资产**：1054 行，覆盖 6 类内容资产类型、DSS+E、AI Trigger Pattern、防幻觉规则、Schema/PlatformPublishGuide 二选一、final_article 纯净性铁律
2. **rewrite-package.md 是 optimize 模式的核心**：朋友的内容优化 Skill Prompt 最可能优化的是"改写"环节，而非"评分"或"质检"
3. **rewrite-package.md 输入变量清晰**：original_article / brand_facts / score_result / optimization_strategy / source_policy / publish_platform / perspective / output_length / need_schema
4. **rewrite-package.md 输出格式明确**：title / final_article / faq_content / schema_suggestions / optimization_strategy / missing_sources / comparison_summary / missing_facts / score_after
5. **rewrite-package.md 不依赖特定模型**：通过 LLMService 调用 OpenAI 兼容接口，可切换任意模型
6. **rewrite-package.md 不依赖固定 HTML**：HTML 报告由前端独立生成，Prompt 只输出 Markdown
7. **rewrite-package.md 包含 GEO 规则**：DSS+E + AI Trigger Pattern + Schema 生成
8. **rewrite-package.md 包含事实保护**：防幻觉规则 + Source Policy
9. **rewrite-package.md 包含 FAQ**：强制 6-8 FAQ
10. **rewrite-package.md 支持 RAG Context**：通过 `{{brand_facts}}` 变量注入（DIGLLM2 可扩展为 `{{retrieved_context}}`）

**后续对比时需要判断的 5 种处理方式：**

| 处理方式 | 适用场景 | 实施步骤 |
|---|---|---|
| 替换 Rewrite Prompt | 朋友 Skill 完全覆盖 Rewrite 能力且更优 | 1. 备份 rewrite-package.md 为 v1 2. 朋友 Skill 作为 v2 3. A/B 测试 4. 灰度切换 |
| 合并 Prompt | 朋友 Skill 与 Rewrite 互补 | 1. 提取朋友 Skill 独有规则 2. 合并到 rewrite-package.md 3. 标注来源 4. 版本号 +1 |
| 新增 content_optimize_v2 | 朋友 Skill 是平行能力（如不同行业） | 1. 朋友 Skill 作为新 Prompt 文件 2. ContentSkill 路由：按行业/场景选择 v1 或 v2 3. 独立版本管理 |
| 拆成多个子 Skill | 朋友 Skill 是模块化能力（如专门做 FAQ 或 Schema） | 1. 拆分朋友 Skill 为独立子 Prompt 2. 三段式链路扩展为多段式 3. 每个子 Skill 独立版本 |
| 仅吸收规则 | 朋友 Skill 不适合整体迁移，但部分规则有价值 | 1. 提取有价值的规则片段 2. 注入 rewrite-package.md 对应章节 3. 不改变整体结构 |

**对比时需检查的 10 项：**

1. Rewrite 当前优化 Prompt 完整位置：`backend/app/prompts/rewrite-package.md`
2. Prompt 输入变量：见 `prompt_service.render()` 调用处
3. Prompt 输出格式：JSON，字段见 `_call_rewrite_package()` 解析逻辑
4. 是否依赖特定模型：否（OpenAI 兼容）
5. 是否依赖固定 HTML：否（HTML 前端独立生成）
6. 是否包含 GEO 规则：是（DSS+E + AI Trigger Pattern + Schema）
7. 是否包含事实保护：是（防幻觉规则 + Source Policy，但无程序化 Diff）
8. 是否包含 FAQ：是（强制 6-8 FAQ）
9. 是否支持 RAG Context：部分（`{{brand_facts}}` JSON 注入，无 Chunk 检索）
10. 是否能够作为独立 Skill 版本：是（Prompt 文件化，可独立版本化）

### 20.9.6 DIGLLM2 正式开发前的三个优先事项

**优先事项 1：补建 Prompt 版本化与 Skill 机制**

原因：
- Rewrite Prompt 是文件常量，无版本管理，无法 A/B 测试与回滚
- 朋友 Skill Prompt 后续接入需要版本化基础
- DIGLLM2 三种入口（独立创作/快检报告/八阶段治理）需要 Skill 路由

行动：
1. 新建 `PromptVersion` 表：prompt_id / prompt_version / skill_version / content / variables_schema / model / temperature / max_tokens / created_at / created_by / is_active
2. 新建 `Skill` 表：skill_id / skill_name / skill_type（generate/optimize/score/quality_check/faq_generate/...） / input_schema / output_schema / current_prompt_version / created_at
3. 新建 `SkillRun` 表：run_id / skill_id / skill_version / prompt_version / task_id / input_snapshot / output / model / latency_ms / success / error_message
4. LLMCallLog 补 skill_id + skill_version + prompt_version
5. ContentSkill 服务层：基于 Skill Registry 路由到对应 Prompt + Skill Run 记录

**优先事项 2：实现 generate 模式调用链**

原因：
- Rewrite 无 generate 模式，DIGLLM2 三种入口中的"独立内容创作"无法复用
- generate 与 optimize 共用 LLMService + PromptService + Skill 机制，但 Brief 结构不同

行动：
1. 设计 generate Brief 结构：主题 / 用户意图 / 目标受众 / 内容类型 / 渠道 / 品牌语气 / 必须回答的问题 / 必须引用的事实 / 禁止声明 / 文章结构 / GEO 要求 / SEO 要求 / CTA
2. 新建 `generate-from-brief.md` Prompt（参考 rewrite-package.md 的 DSS+E + AI Trigger Pattern + 防幻觉规则，但输入改为 Brief）
3. ContentSkill 新增 generate 子 Skill
4. 前端新建"独立内容创作"页面（参考 NewRewritePage 布局，但左侧改为 Brief 表单）

**优先事项 3：实现 RAG 链路与 Qdrant 集成**

原因：
- Rewrite 无 RAG，DIGLLM2 内容链路无法满足企业级需求
- 朋友 Skill Prompt 若依赖 RAG Context，DIGLLM2 必须先建好 RAG 基础设施

行动：
1. 部署 Qdrant，单 Collection + Payload 隔离
2. 新建 `KnowledgeDocument` 表：document_id / brand_id / project_id / scope（brand/project） / title / source_type / source_url / version / file_path / ocr_path / markdown_path / status / created_at
3. 新建 `KnowledgeChunk` 表：chunk_id / document_id / document_version / chunk_index / content / embedding（存 Qdrant point_id） / metadata / created_at
4. 新建 `RetrievalRun` 表：run_id / task_id / query / scope_filter / top_k / score_threshold / retrieved_chunks（JSON） / reranked_chunks（JSON） / created_at
5. 实现文档摄取链路：上传 → 存储 → 解析 → OCR → Markdown → Chunk → Embedding → Qdrant Index
6. 实现检索链路：生成/优化任务 → 构造 Query → brand_id 强制过滤 → Vector Search → Rerank → Context Assembly → Prompt 注入 `{{retrieved_context}}` + `{{citations}}`
7. 实现来源追溯：RewriteOutput 关联 Citation 表（output_id / chunk_id / document_version / retrieval_score / used_in_paragraph）
8. 实现项目知识快照：八阶段治理项目第六阶段创建内容任务时，固化当前项目知识为快照，后续检索使用快照而非最新知识
9. 实现内容成果不自动进入知识库：定稿后需用户主动确认 + 知识审核，才创建 KnowledgeDocument + 索引

---

## 21. 审计最终必须回答的 25 个问题

### Q1. Rewrite 是否真实调用模型生成文章？

**是。** 通过 `LLMService.chat_json()`（`backend/app/services/llm_service.py`）调用 OpenAI 兼容接口，使用 `client.chat.completions.create(model=..., response_format={"type": "json_object"})`。模型可通过 `ModelConfig` 表切换，默认从 `backend/.env` 的 `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL`（默认 `gpt-4o-mini`）读取。

**但严格意义上，Rewrite 没有"生成文章"，只有"优化文章"**（基于 `original_content` 改写）。详见 Q2 与 Q3。

### Q2. Rewrite 是否真实优化用户输入的文章？

**是。** 三段式调用链：
- Call 1：`ScoringService.score_and_diagnose()`（`prompts/score-and-diagnose.md`）→ 6 维 GEO Scorecard 评分 + 硬阻断判定 + optimization_strategy
- Call 2：`RewriteService._call_rewrite_package()`（`prompts/rewrite-package.md`，1054 行）→ final_article + faq_content + schema_suggestions + comparison_summary + missing_sources
- Call 3（可选，P0 默认关闭）：`_call_quality_check()`（`prompts/quality-check.md`）→ quality_status + issues_found

每次调用都写 `llm_call_logs`（model_name / prompt_tokens / completion_tokens / cost_usd / latency_ms / success）。

### Q3. 内容生成和优化是否使用同一套底座？

**部分是。** Rewrite 只有 optimize 模式，没有 generate 模式。但 optimize 内部的三段式调用共用：
- `LLMService.chat_json()` 统一 LLM 调用
- `PromptService.render()` 统一 Prompt 加载
- `system-role.md` 共用 System Prompt
- `RewriteService` 统一编排
- `ModelConfig` 统一模型配置
- `LLMCallLog` 统一审计

**DIGLLM2 需要新增 generate 模式**，但可复用上述底座。

### Q4. Prompt 在哪里？

`backend/app/prompts/` 目录：
- `system-role.md`：System Prompt（GEO 内容架构师角色 + DSS+E + AI Trigger Pattern + 防幻觉规则 + Source Policy + 平台差异化规则）
- `score-and-diagnose.md`：Call 1 评分诊断
- `rewrite-package.md`：Call 2 改写包（1054 行，最核心）
- `quality-check.md`：Call 3 质检（可选）
- `references/perspectives.md`：视角规则参考
- `references/platforms.md`：平台规则参考

由 `backend/app/services/prompt_service.py` 加载，`PROMPTS_DIR = BACKEND_DIR / "app" / "prompts"`，使用 `{{var}}` 插值，`lru_cache` 缓存。

### Q5. Prompt 是否版本化？

**否。** Prompt 是文件常量，无 `prompt_id` / `prompt_version` 字段。`LLMCallLog` 表只有 `prompt_type`（score / rewrite / quality）区分调用类型，不记录 Prompt 版本。

DIGLLM2 需补建 `PromptVersion` 表 + `Skill` 表 + `SkillRun` 表。

### Q6. 是否存在正式 Skill？

**否。** 仓库根 `SKILL.md` 是人类阅读文档，后端代码未引用。无 Skill Registry / Skill Loader / Skill Run / Skill Manifest 机制。

`SKILL.md` 定义的 `mode` 字段（rewrite / score_only / schema_only / audit_plan）在后端 `RewriteTask` 表中**未实现**，只走 rewrite 全流程。这是文档与代码的明确冲突。

DIGLLM2 需自建 Skill 机制。

### Q7. 是否有 RAG？

**否。** 完全没有 Qdrant / pgvector / Chroma / FAISS / Embedding / Chunk / Retriever / Rerank 代码。

"知识库"只是 `BrandFact` 关系表，通过 `_load_facts()` 序列化为 JSON 注入 Prompt 的 `{{brand_facts}}` 变量。

### Q8. RAG 是否真实进入 Prompt？

**部分。** BrandFact JSON 通过 `{{brand_facts}}` 变量注入 Prompt，LLM 在生成时"看到"事实文本。但这不是向量检索，无 Top-K，无 Rerank，无检索分数，无 Chunk 概念。

### Q9. 是否保存 Chunk 或来源？

**否。** 无 `KnowledgeChunk` 表。`RewriteOutput.missing_sources` 是字符串数组（如 `"某头部城商行客户案例的公开披露链接"`），不关联任何文档实体、文档版本或 Chunk ID。

DIGLLM2 需新建 `Citation` + `Source` + `KnowledgeChunk` 表。

### Q10. 是否有事实保护？

**部分。** 事实保护通过两层软约束：
1. `system-role.md` 中的"防幻觉规则"：绝对禁止编造数字/案例/奖项/价格/日期/链接/法律声明
2. `quality-check.md`（Call 3，P0 默认关闭）：5 维度检查，包括事实真实性检查

**无程序化 Diff**：不抽取原文实体，不做改写前后实体对比，不自动标记事实变化。

DIGLLM2 需补建程序化事实校验层。

### Q11. 是否有优化前后 Diff？

**否。** 前端只展示当前版本内容，不做前后版本对比。`RewriteOutput.comparison_summary` 是 LLM 生成的文本摘要（四段式：保留项/增强项/删减项/风险处理），非程序化 Diff。

DIGLLM2 需新增前端 Diff 组件。

### Q12. 是否有修改说明？

**是。** `RewriteOutput.comparison_summary` 字段，LLM 在 Call 2 输出时强制生成。格式为四段式：
- 保留了什么
- 增强了什么
- 删减了什么
- 风险处理

### Q13. 是否有 FAQ 增强？

**是。** `rewrite-package.md` 强制 LLM 生成 6-8 个 FAQ，独立于 `final_article` 存储在 `RewriteOutput.faq_content` 字段。FAQ 类型包括：对比型 / 参数型 / 场景型 / 定义型 / 因果型 / 决策型。

`system-role.md` 铁律：FAQ 不得混入 `final_article`，必须独立交付。

### Q14. 是否有 HTML 模板？

**是。** 前端 `frontend/src/lib/exportHtml.ts`（1289 行）通过字符串模板生成 A4 风格 HTML 报告：
- CSS 完全内联
- 单文件，无外部依赖
- 离线可看
- 打印为 A4
- 包含：报告头 / 发布检查摘要 / Score Hero / 优化建议 / 待补证据 / 终稿正文 / 内容优化说明 / FAQ / 发布建议 / Schema 建议 / 原始素材

**非 LLM 生成 HTML**，是前端纯字符串模板。

### Q15. 是否支持单文件 HTML 下载？

**是。** `frontend/src/components/common/ExportButton.tsx` 调用 `buildHtmlReport()` 生成 HTML 字符串 → `Blob` → `URL.createObjectURL` → `<a download>` 触发下载。

### Q16. 是否支持纯净正文复制？

**是。** `frontend/src/lib/cleanArticle.ts` 的 `cleanFinalArticle()` 清洗 `final_article` 为纯净发布正文：
- 去掉 Markdown 标题符号 # / ## / ###（保留标题文本）
- 去掉代码围栏 ```markdown / ```html / ```
- 去掉 HTML 标签（保留标签内文本）
- 去掉报告型独立标题行（黑名单：内容摘要/开头钩子/正文/收藏评论引导/优化建议/评分/来源缺口/待补充事实/交付摘要/可发布正文）
- 去掉普通话题 # 号（避免误伤 C# / F#）
- 列表符号 - / * → • ，数字列表保留
- 清理多余空行

复制后可直接粘贴到公众号/官网编辑器/飞书文档/Word。

### Q17. 是否有草稿和版本？

**是。** `RewriteOutput` 表：
- `version` Integer 自增
- `parent_version_id` 自引用（regenerate 链）
- `UniqueConstraint(task_id, version)` 保证单任务内版本唯一

通过 `POST /api/outputs/{output_id}/regenerate` 创建新版本。

**但所有版本都是 LLM 生成**，无用户编辑版本。DIGLLM2 需补用户编辑能力。

### Q18. 是否有审核和定稿？

**部分。** `RewriteOutput.review_status` 字段：
- `ready`：可发布
- `review`：建议检查
- `needs_material`：需补充材料
- `exported`：已导出

**但只是标签，无状态机驱动**：
- 无审核操作（无 submit/review/approve/reject）
- 无定稿操作（导出不修改 review_status，无"标记为定稿"）
- 无审核人字段
- 无审核时间

DIGLLM2 需完整重建审核流。

### Q19. 是否有异步任务？

**部分。** `RewriteService.kickoff()` 使用 `threading.Thread(target=_run_in_thread, daemon=True).start()` 后台执行。

**问题：**
- 不可恢复（进程崩溃任务丢失）
- 不可重试（无重试机制，仅 `POST /api/tasks/{task_id}/retry` 手动触发）
- 不可水平扩展（单进程内线程）
- 不可取消（无取消接口）
- 无超时（依赖 LLM 自身 timeout=120s）
- 无队列（无 Redis / Celery / ARQ）

DIGLLM2 需替换为 Redis + Worker。

### Q20. 是否有 Mock 或固定模板进入正式链路？

**否。** Mock 数据（`frontend/src/mock/data.ts`）仅在 `NewRewritePage.tsx` 的项目列表加载失败时作为兜底，不进入 LLM 调用链路。`RewriteResultPage.tsx` 已明确移除 mock fallback。

后端无固定模板返回逻辑，所有 LLM 输出都通过 `LLMService.chat_json()` 真实调用模型。失败时直接 `task.status = failed` + `error_message`。

运行环境配置 `LLM_API_KEY` 后，真实链路启用，Mock 不会触发。

### Q21. 哪些能力能抽成独立 Skill？

**建议抽取为独立 Skill：**

1. **score_and_diagnose Skill**（基于 `score-and-diagnose.md` + `ScoringService`）
   - 输入：original_article / brand_facts / publish_platform / source_policy
   - 输出：overall / dimensions / hard_blockers / is_high_quality / optimization_strategy
   - 独立价值：可作为独立诊断工具，不依赖改写

2. **rewrite_package Skill**（基于 `rewrite-package.md` + `_call_rewrite_package`）
   - 输入：original_article / brand_facts / score_result / optimization_strategy / source_policy / publish_platform / perspective / output_length / need_schema
   - 输出：title / final_article / faq_content / schema_suggestions / optimization_strategy / missing_sources / comparison_summary / missing_facts / score_after
   - 独立价值：核心改写能力

3. **quality_check Skill**（基于 `quality-check.md` + `_call_quality_check`）
   - 输入：original_article / rewritten_article / brand_facts / source_policy / hard_blockers_before / missing_sources_list
   - 输出：passed / quality_status / publish_label / reasons / highlights / warnings / missing_sources / issues_found
   - 独立价值：可作为独立质检工具

4. **generate_from_brief Skill**（DIGLLM2 新建）
   - 输入：Brief（主题/受众/类型/渠道/品牌语气/必须回答的问题/必须引用的事实/禁止声明/CTA/GEO 要求/SEO 要求）
   - 输出：同 rewrite_package
   - 独立价值：DIGLLM2 三种入口中的"独立内容创作"

5. **faq_generate Skill**（基于 rewrite-package.md 的 FAQ 章节抽取）
   - 输入：original_article / final_article / publish_platform
   - 输出：faq_content
   - 独立价值：单独增强 FAQ

6. **schema_generate Skill**（基于 rewrite-package.md 的 Schema 章节）
   - 输入：final_article / publish_platform / need_schema
   - 输出：schema_suggestions（JSON-LD 或 PlatformPublishGuide）
   - 独立价值：单独生成 Schema

7. **html_render Skill**（基于 `exportHtml.ts`）
   - 输入：task / output / project / beforeMetrics / afterMetrics / assetType
   - 输出：HTML 字符串
   - 独立价值：DIGLLM2 ArtifactRenderer

8. **clean_article Skill**（基于 `cleanArticle.ts`）
   - 输入：final_article / assetType
   - 输出：纯净正文
   - 独立价值：复制粘贴工具

### Q22. 哪些能力适合迁移到 DIGLLM2？

**见 20.7 迁移矩阵。** 核心结论：

- **直接迁移**：4 个 Prompt 文件 + 2 个 references 文件 + LLMService + ScoringService + PromptService + exportHtml.ts + cleanArticle.ts + export_service.py + model_runtime + crypto_service + LLMCallLog 表 + ContentScore 表
- **抽取为独立模块**：三段式调用链架构 + DIMENSION_MAP 6 维映射 + 6 类内容资产类型规则 + DSS+E 模型 + AI Trigger Pattern + Source Policy + Schema/PlatformPublishGuide 二选一机制 + Quality Gate 平台差异化
- **参考实现后重写**：RewriteTask 表 → ContentTask 表 / RewriteOutput 表 → 完整版本+审核+定稿+发布 / BrandFact 表 → 品牌知识库+Qdrant / NewRewritePage → DIGLLM2 内容任务创建页 / RewriteResultPage → DIGLLM2 内容任务结果页 / useTaskStatus 轮询 → WebSocket/SSE
- **由 DIGLLM2 重新实现**：generate 模式 / RAG 链路 / Qdrant 集成 / 程序化事实保护 / 来源追溯 / Citation 表 / 审核流 / 定稿 / 发布记录 / 内容资产库 / Redis + Worker / MySQL / Prompt 版本化 / Skill 机制 / Embedding / Rerank
- **保留 Rewrite，不迁移**：SKILL.md / agents/openai.yaml / mock/data.ts / 小红书 Legacy 规则 / /enterprise 路由 / /multi-platform-result 路由
- **与目标架构冲突**：threading.Thread（与 Redis + Worker 冲突）/ SQLite（与 MySQL 冲突）

### Q23. 哪些能力应由 DIGLLM2 重新实现？

1. **generate 模式调用链**（Rewrite 完全没有）
2. **RAG 链路**（Rewrite 完全没有）
3. **Qdrant 集成**（Rewrite 完全没有）
4. **程序化事实保护**（Rewrite 仅 Prompt 软约束）
5. **来源追溯 / Citation**（Rewrite 仅字符串数组）
6. **审核流**（Rewrite 仅标签）
7. **定稿操作**（Rewrite 无）
8. **发布记录**（Rewrite 无）
9. **内容资产库**（Rewrite 无）
10. **Redis + Worker 异步**（Rewrite 用 threading.Thread）
11. **MySQL 数据库**（Rewrite 用 SQLite）
12. **Prompt 版本化**（Rewrite 是文件常量）
13. **Skill 机制**（Rewrite 无）
14. **Embedding 模型配置**（Rewrite 无）
15. **Rerank 模型配置**（Rewrite 无）
16. **用户编辑版本**（Rewrite 所有版本都是 LLM 生成）
17. **Diff 能力**（Rewrite 无）
18. **WebSocket/SSE 实时推送**（Rewrite 用 3s 轮询）
19. **多人协作 / RBAC**（Rewrite 无用户系统）
20. **自动发布**（Rewrite 无 CMS 集成）

### Q24. Rewrite 与 Qdrant 规划有哪些冲突？

**直接代码冲突：无。** Rewrite 完全没有向量检索代码，与 Qdrant 规划无直接冲突。

**架构层面需替换：**

| Qdrant 规划原则 | Rewrite 实现 | 冲突类型 | 处理 |
|---|---|---|---|
| MySQL 真相源 | SQLite | 数据库方言冲突 | 替换连接字符串 + 方言适配 |
| 异步索引任务 | threading.Thread | 异步机制冲突 | 替换为 Redis + Worker |
| brand_id 强制过滤 | project_id 关联 | 数据模型差异 | BrandFact 补 brand_id 字段 |
| brand/project scope | 仅 brand scope（隐含） | scope 缺失 | 新增 project scope 概念 |
| 项目知识快照 | 无项目知识 | 概念缺失 | 新建项目知识快照机制 |
| 文档版本 | 无文档版本 | 概念缺失 | 新建 KnowledgeDocument 表 |
| Chunk 来源追溯 | 无 Chunk | 概念缺失 | 新建 KnowledgeChunk 表 + Citation 表 |
| Embedding 版本管理 | 无 Embedding | 概念缺失 | 新建 Embedding 配置 + 版本管理 |
| Qdrant 单 Collection + Payload | 无 Qdrant | 无冲突 | 新建 |
| Qdrant 可重建 | 无 Qdrant | 无冲突 | 新建 |

**总体判断：** Rewrite 与 Qdrant 规划**无代码层面冲突**，只需**替换异步机制 + 数据库**，并**新建所有 RAG 相关基础设施**。

### Q25. 朋友 Skill Prompt 后续应该接入哪个真实入口？

**接入点：`backend/app/prompts/rewrite-package.md`（Call 2 改写包 Prompt）。**

**理由：**

1. rewrite-package.md 是 Rewrite 最高价值资产（1054 行，覆盖 6 类内容资产类型 + DSS+E + AI Trigger Pattern + 防幻觉规则 + Schema/PlatformPublishGuide 二选一 + final_article 纯净性铁律）
2. rewrite-package.md 是 optimize 模式的核心，朋友的内容优化 Skill Prompt 最可能优化"改写"环节
3. rewrite-package.md 输入变量清晰（original_article / brand_facts / score_result / optimization_strategy / source_policy / publish_platform / perspective / output_length / need_schema）
4. rewrite-package.md 输出格式明确（title / final_article / faq_content / schema_suggestions / optimization_strategy / missing_sources / comparison_summary / missing_facts / score_after）
5. rewrite-package.md 不依赖特定模型（OpenAI 兼容）
6. rewrite-package.md 不依赖固定 HTML（HTML 前端独立生成）
7. rewrite-package.md 包含 GEO 规则（DSS+E + AI Trigger Pattern + Schema）
8. rewrite-package.md 包含事实保护（防幻觉规则 + Source Policy）
9. rewrite-package.md 包含 FAQ（强制 6-8 FAQ）
10. rewrite-package.md 支持 RAG Context（通过 `{{brand_facts}}` 注入，DIGLLM2 可扩展为 `{{retrieved_context}}`）

**后续对比流程：**

1. 获取朋友 Skill Prompt 完整内容
2. 与 rewrite-package.md 逐项对比：
   - 输入变量差异
   - 输出格式差异
   - GEO 规则覆盖度
   - 事实保护强度
   - FAQ 生成能力
   - Schema 生成能力
   - RAG Context 支持
   - 模型依赖
   - HTML 依赖
3. 选择 5 种处理方式之一：
   - 替换 Rewrite Prompt
   - 合并 Prompt
   - 新增 content_optimize_v2
   - 拆成多个子 Skill
   - 仅吸收规则
4. A/B 测试 + 灰度切换

**前置条件：** DIGLLM2 必须先完成"优先事项 1：补建 Prompt 版本化与 Skill 机制"，否则朋友 Skill Prompt 接入后无法做版本对比与回滚。

---

## 附录：审计执行说明

### 审计范围

- 仓库：`/Users/zachary/Downloads/geo-rewrite-skill`
- 后端：`backend/app/` 全部 Python 文件
- 前端：`frontend/src/` 关键 TS/TSX 文件
- Prompt：`backend/app/prompts/` 全部 Markdown 文件
- 配置：`backend/.env.example` / `agents/openai.yaml` / `SKILL.md`

### 审计方法

1. 仓库结构扫描（Glob 精确匹配，跳过 `.venv`）
2. 全仓关键词搜索（中英文）
3. 前端能力审计（页面/路由/输入输出/状态）
4. API 与数据模型审计
5. 内容生成真实调用链追踪（前端 → API → Service → Prompt → Model → DB → HTML）
6. 内容优化真实调用链追踪
7. Prompt 与 Skill 审计
8. RAG 与知识能力审计
9. HTML/报告/正文输出审计
10. 草稿/版本/审核/发布审计
11. 异步任务与运行稳定性审计
12. 模型与配置审计
13. 测试与 Mock 审计
14. 迁移判断与冲突分析

### 审计约束遵守

- ✅ 只读扫描，未修改任何代码
- ✅ 未新增文件（除本报告 `REWRITE_CONTENT_CAPABILITY_AUDIT.md`）
- ✅ 未删除文件
- ✅ 未生成数据库迁移
- ✅ 未安装依赖
- ✅ 不根据 README 或页面标题猜测能力，所有结论引用真实路径/类/函数/路由
- ✅ 区分正式实现、未接线、Mock、模板、Legacy
- ✅ 未发现的能力明确写"未发现"
- ✅ 文档与代码冲突时以代码为准
- ✅ 不输出 Rewrite 自己的产品 PRD
- ✅ 输出能力矩阵、真实调用链、数据对象、冲突清单、迁移矩阵、P0/P1/P2 和最终建议

### 未完成项

- 朋友 Skill Prompt 对比（朋友尚未提供 Prompt 内容）
- 运行时验证（本次为静态代码审计，未启动服务运行验证）
- E2E 测试审计（仓库内未发现 E2E 测试代码）

---

**报告完成时间：** 2026-07-18
**审计执行：** 只读 Capability Audit Agent
**报告版本：** V1.0
**下一步：** 等待朋友 Skill Prompt 提供后，进行三方对比（朋友 Skill vs Rewrite Prompt vs DIGLLM2 现有内容能力），并基于本审计结论启动 DIGLLM2 ContentSkill 设计与开发。
