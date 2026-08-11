# Multi-platform Content Package 实施交付报告

> 范围：将单平台 GEO Rewrite 升级为多平台发稿包生成（官网文章 / 公众号 / 小红书 / 知乎问答）
> 阶段：P0 代码实现 + 静态构建验证
> 交付时间：2026-06-26

---

## 1. 修改了哪些 Prompt

三个核心 Prompt 文件均同步修改了两份（`backend/app/prompts/` 与项目根 `prompts/`），保证运行时与文档源一致。

### 1.1 `rewrite-package.md`（最关键）

| 改动点 | 内容 |
| --- | --- |
| 产出物定位 | 新增"你不是在写一篇普通文章，你在生成一份可以直接交付客户的 GEO Rewrite Package / Platform Publish Package"段落，强调每个模块独立交付 |
| final_article 纯净性铁律 | 明确禁止 FAQ / Schema / JSON-LD / 律师简介 / 律所简介 / 品牌简介 / 免责声明 / 评分 / 优化策略 / 来源缺口 / 平台发布建议 / Q1/Q2/Q3 / "以下是" / "我来分析" 出现在 final_article |
| FAQ 独立规则 | FAQ 只能进入 `faq_content`；要求 6-8 个问题；必须包含至少 1 个对比型 + 1 个参数型 + 1 个场景型；答案必须基于原文与品牌事实，不得编造 |
| Schema / 平台发布建议二选一 | 明确判断规则：官网文章且 `need_schema=true` → Schema；其他 → PlatformPublishGuide；`need_schema=false` 时无论平台都输出 PlatformPublishGuide |
| 平台分支 A/B/C/D | 官网文章（Schema + 结构化正文）/ 公众号（PlatformPublishGuide + 可发布正文）/ 小红书（XHS Visual Publish Brief + Caption）/ 知乎问答（PlatformPublishGuide + 问答正文）四套独立模板，每套含 final_article 结构建议与 schema_suggestions JSON 示例 |
| comparison_summary 结构化 | 改为四段式：保留项 / 增强项 / 删减项 / 风险处理；自媒体平台必须说明"该平台不支持 JSON-LD 结构化数据，已将 Schema 区块替换为平台发布建议"；原文若含律师简介等可放入末尾"附：发布附属信息" |
| missing_sources 具体化 | 强制格式：`[具体声明]（原文位置）— 建议补充 [来源类型]` |
| 高质量保护模式 | 即使 overall≥80，仍需补齐摘要、平台适配、来源缺口、发布建议四项 |

### 1.2 `system-role.md`

新增段落：
- 企业级 GEO Rewrite Package 定位（非普通文章）
- 每个模块独立交付，不得互相污染
- final_article 是可发布正文，FAQ / Schema / 平台建议 / 评分 / 策略不能混入
- 官网生成 Schema，自媒体生成 PlatformPublishGuide
- 小红书不是 AI 引用主阵地，而是用户触达和社交搜索平台
- 高质量原文不等于原样保留，仍需补齐摘要、平台适配、来源缺口、发布建议

### 1.3 `score-and-diagnose.md`

新增规则：
- 评分说明必须量化，避免"较低/一般"等模糊词
- 官网平台评估 Schema 就绪度
- 公众号 / 小红书 / 知乎不因未生成 Schema 而扣分
- 自媒体平台"Schema / 结构化适配"维度改为评估 PlatformPublishGuide 是否完整
- after 某维度低于 before 时必须解释原因
- overall≥80 时诊断重点从"内容缺陷"转为"交付包就绪度"
- hard_blockers 与 source_gaps 分离

> 暂未启用 quality-check LLM 调用（按需求要求）。

---

## 2. 新增了哪些文档

### 2.1 `docs/output-contract.md`（新建）

定义所有 Rewrite Output 的交付规范（非 Prompt 草稿），共 11 节：

1. 通用字段（title / final_article / faq_content / schema_suggestions / score_before / score_after / optimization_strategy / missing_sources / missing_facts / comparison_summary / review_status）
2. final_article 纯净性规则（白名单 + 黑名单）
3. Schema / PlatformPublishGuide 二选一判断规则
4. 官网文章 Package 结构
5. 公众号 Package 结构
6. 小红书 Package 结构
7. 知乎 Package 结构
8. 多平台任务创建规则（复用现有 `POST /api/projects/{project_id}/tasks`，每平台一个 task）
9. 平台与 need_schema 默认映射
10. comparison_summary 结构化要求
11. missing_sources 具体化要求

---

## 3. 前端修改了哪些页面和组件

### 3.1 新增组件

| 文件 | 作用 |
| --- | --- |
| `frontend/src/components/rewrite/PlatformPublishGuideView.tsx` | 渲染 PlatformPublishGuide 为卡片（非黑底 JSON），按 platform 分支：WeChatGuide / XHSGuide / ZhihuGuide / FallbackGuide |
| `frontend/src/pages/MultiPlatformResultPage.tsx` | 纯前端多平台任务结果页，路由 `/multi-platform-result?taskIds=id1,id2,id3`，每个任务卡片显示平台 / 状态 / 评分 / 错误 / 查看结果 / 导出按钮，复用 `useTaskDetail` + `useTaskStatus` 轮询 |

### 3.2 修改组件 / 页面

| 文件 | 改动 |
| --- | --- |
| `frontend/src/components/rewrite/RewriteConfigPanel.tsx` | `platform: Platform` 改为 `platforms: Platform[]`；单选按钮改为多选 toggle；新增"已选 N 个"计数 + 成本提示"将为每个平台分别生成独立发稿包，预计消耗 N 次生成额度"；Schema 开关描述改为"仅官网文章生效；自媒体平台始终输出平台发布建议" |
| `frontend/src/pages/NewRewritePage.tsx` | 新增 `resolveNeedSchema(platform)`（官网→config.needSchema，自媒体→false）和 `buildPayload(platform)` 辅助函数；重写 `handleSubmit`：单平台用 `createMut`，多平台循环 `rewriteTaskApi.create` 后跳转 `/multi-platform-result?taskIds=...`；提交按钮文案动态："生成发稿包" / "生成 N 个平台发稿包"；多选时显示成本提示 banner |
| `frontend/src/pages/RewriteResultPage.tsx` | 新增 `POLLUTION_PATTERNS` + `detectArticlePollution` 检测正文污染；新增 `isPlatformGuide` + `getSchemaTabLabel`（小红书→"图文脚本"，其他自媒体→"发布建议"，官网→"Schema"）；Schema Tab 标签动态化；guideMode 下用 `PlatformPublishGuideView` 卡片渲染 + 原始 JSON 折叠；正文污染时顶部显示警告 banner（不自动删除） |
| `frontend/src/components/common/MarkdownRenderer.tsx` | 最小增强：h2 顶部边框分隔、blockquote 核心结论卡片样式（左主色边框 + 浅底）、table 边框 + 表头底色 + 斑马纹、code block 保持可读 |
| `frontend/src/App.tsx` | 新增 `/multi-platform-result` 路由 |
| `frontend/src/pages/index.ts` | 导出 `MultiPlatformResultPage` |
| `frontend/src/components/rewrite/index.ts` | 导出 `PlatformPublishGuideView` |

### 3.3 后端导出服务

| 文件 | 改动 |
| --- | --- |
| `backend/app/services/export_service.py` | 重排 Markdown 章节顺序为：基本信息 → 交付摘要 → 可发布正文 → FAQ → Schema建议/平台发布建议 → 评分诊断 → 优化策略 → 来源缺口 → 待补充事实；标题改为 `# GEO Rewrite Package`；新增 `_schema_section_title()` 动态返回"小红书图文脚本" / "平台发布建议" / "Schema 建议"；新增 `_platform_guide_block()` 将 PlatformPublishGuide 渲染为可读 Markdown 字段（16 个字符串字段 + 9 个列表字段 + image_card_script + image_text_transcript），不再以黑底 JSON 形式导出 |

---

## 4. 是否改了后端 API

**未改后端 API。**

- 所有路由路径保持原样（`/api/projects`、`/api/projects/{project_id}/tasks`、`/api/tasks/{task_id}`、`/api/outputs/{id}/export` 等）
- 所有请求 / 响应字段保持原样
- 统一响应格式 `{ code, message, data }` 不变
- Export API 仍直接返回文件流
- 多平台能力通过前端循环调用现有 `POST /api/projects/{project_id}/tasks` 实现，每个平台一个独立 task

OpenAPI 验证：15 个业务路径全部正常注册（`GET/POST /api/projects`、`GET/PUT/DELETE /api/projects/{project_id}`、`/brand-facts`、`/tasks`、`/outputs`、`/export` 等）。

---

## 5. 是否改了数据库

**未改数据库。**

- 6 张表结构不变：projects / brand_facts / rewrite_tasks / rewrite_outputs / content_scores / llm_call_logs
- 无新增字段
- 无新增表
- 无 Alembic migration

平台差异化通过复用现有 JSON 字段实现：
- `rewrite_tasks.publish_platform`（已存在）携带平台标识
- `rewrite_outputs.schema_suggestions`（已存在 JSON 字段）通过 `type` 字段区分 `"Article + FAQPage"` 等 Schema 类型与 `"PlatformPublishGuide"`，后者 `json_ld` 内嵌平台特定字段（recommended_title / cover_copy / image_card_script / question_title 等）

---

## 6. 多平台任务如何创建

### 6.1 流程

```
用户在 NewRewritePage 选择多个平台（官网 + 公众号 + 小红书）
  ↓
前端为每个平台分别调用 POST /api/projects/{project_id}/tasks
  ↓ 每次请求 body 仅 publish_platform 不同
后端为每个平台创建独立 RewriteTask（status=pending）
  ↓
后端 LLMService 按各平台 Prompt 分支独立执行改写
  ↓
每个平台生成独立 RewriteOutput + ContentScore（before/after）
  ↓
前端跳转 /multi-platform-result?taskIds=id1,id2,id3
  ↓
MultiPlatformResultPage 轮询每个 task 状态，completed 后展示评分 + 导出按钮
```

### 6.2 关键约束

- **不用一个超长 Prompt 同时生成所有平台**：每个平台一个独立 task、独立 LLM 调用、独立 output
- **need_schema 平台规则优先**：`resolveNeedSchema(platform)` 在前端强制：官网→用户配置，自媒体→false（即使 UI 开关打开也不生效）
- **成本提示**：多选时显示"本次将生成 N 个平台发稿包，预计消耗 N 次生成额度"（仅提示，不做真实扣费）

### 6.3 单平台回退

只选 1 个平台时保持原逻辑（`createMut` 单次调用 + 跳转 `/tasks/{id}/result`），不强制走多平台页。

---

## 7. 官网文章测试结果

### 7.1 静态验证（已通过）

- Prompt 中官网分支 A 已定义：生成 Schema（Article + FAQPage 等）+ 结构化正文（内容摘要 / 核心结论 / 背景说明 / 关键问题 / 分析过程 / 结论 / 法律依据 / 风险指引）
- `need_schema=true` 默认规则已生效
- 导出 Markdown 中 `_schema_section_title` 对官网返回 "Schema 建议"
- RewriteResultPage Schema Tab 对官网显示 "Schema" + JSON-LD

### 7.2 端到端验收（待用户运行时执行）

需用户配置 `LLM_API_KEY` 后在 UI 选择"官网文章"单平台提交，验收：
- 只创建 1 个 task
- `schema_suggestions.type` 不是 PlatformPublishGuide
- 正常生成 Schema JSON-LD
- final_article 以"内容摘要"或"核心结论"开头
- final_article 不包含 FAQ / 律师简介 / 免责声明 / Schema
- faq_content 独立存在
- 导出 Markdown 分区清楚

---

## 8. 公众号测试结果

### 8.1 静态验证（已通过）

- Prompt 中公众号分支 B 已定义：`schema_suggestions.type = PlatformPublishGuide`，json_ld 包含 recommended_title / subtitle / cover_summary / opening_hook / section_titles / paragraph_style / cover_suggestion / quote_cards / comment_prompt / risk_notes / reusable_summary
- final_article 结构：内容摘要 / 开篇 / 正文主体（3-5 小标题）/ 操作建议 / 收尾
- `need_schema=false` 强制生效
- 导出 Markdown 章节标题为"平台发布建议"
- RewriteResultPage Schema Tab 标签为"发布建议"
- PlatformPublishGuideView 的 WeChatGuide 渲染所有字段为卡片

### 8.2 端到端验收（待用户运行时执行）

需用户在 UI 选择"公众号"单平台提交，验收字段完整性 + final_article 纯净性。

---

## 9. 小红书测试结果

### 9.1 静态验证（已通过）

- Prompt 中小红书分支 C 已定义：`schema_suggestions.type = PlatformPublishGuide`，package_type = "XHS Visual Publish Brief"，json_ld 包含 cover_copy / cover_subcopy / cover_suggestion / visual_style / image_card_script（6-8 张）/ image_text_transcript / caption / tags / topics / comment_prompt / risk_notes / reusable_summary / canonical_content_suggestion
- final_article 是 Caption（非长文章）
- **不生成真实图片**（P0 边界）
- **不导出 PNG**（P0 边界）
- 导出 Markdown 章节标题为"小红书图文脚本"
- RewriteResultPage Schema Tab 标签为"图文脚本"
- PlatformPublishGuideView 的 XHSGuide 渲染图文卡片脚本为编号卡片

### 9.2 端到端验收（待用户运行时执行）

需用户在 UI 选择"小红书"单平台提交。

---

## 10. 知乎问答测试结果

### 10.1 静态验证（已通过）

- Prompt 中知乎分支 D 已定义：`schema_suggestions.type = PlatformPublishGuide`，package_type = "Zhihu Answer Publish Guide"，json_ld 包含 question_title / one_sentence_answer / answer_outline / evidence_points / misconceptions / related_questions / publishing_notes / risk_notes / reusable_summary
- final_article 结构：一句话结论 / 为什么是这个结论 / 关键事实依据 / 常见误区 / 操作建议
- 导出 Markdown 章节标题为"平台发布建议"
- RewriteResultPage Schema Tab 标签为"发布建议"
- PlatformPublishGuideView 的 ZhihuGuide 渲染所有字段为卡片

### 10.2 端到端验收（待用户运行时执行）

需用户在 UI 选择"知乎问答"单平台提交。

---

## 11. 多平台同时生成测试结果

### 11.1 静态验证（已通过）

- NewRewritePage 多选逻辑已实现：选 N 个平台 → 循环 N 次 `rewriteTaskApi.create` → 跳转 `/multi-platform-result?taskIds=...`
- 提交按钮动态文案："生成 N 个平台发稿包"
- 成本提示 banner："本次将生成 N 个平台发稿包，预计消耗 N 次生成额度"
- MultiPlatformResultPage 渲染 N 个 PlatformTaskCard，每个卡片独立轮询 + 独立评分 + 独立导出
- 每个任务可点"查看结果"进入 `/tasks/{id}/result` 独立结果页

### 11.2 端到端验收（待用户运行时执行）

需用户在 UI 同时选择"官网文章 + 公众号 + 小红书"提交，验收：
- 创建 3 个独立 task
- 每个 task 的 publish_platform 正确
- 官网 task 生成 Schema
- 公众号 task 生成 PlatformPublishGuide
- 小红书 task 生成 XHS Visual Publish Brief
- 页面提示本次将消耗 3 次生成额度
- multi-platform-result 页面能看到 3 个任务
- 每个任务都可以进入独立结果页
- 每个任务都可以单独导出 Markdown

---

## 12. 当前仍存在的问题

### 12.1 未做端到端 LLM 验收

本轮验证止于静态构建层（前端 build / tsc / 后端 /docs / OpenAPI 路径）。5 个验收测试场景需要用户配置 `LLM_API_KEY` 后在 UI 真实提交任务才能验证：
- LLM 是否严格按 Prompt 分支输出正确 schema_suggestions.type
- final_article 是否真的不混入 FAQ / 免责声明
- faq_content 是否包含 6-8 个问题且覆盖对比型 / 参数型 / 场景型
- missing_sources 是否具体到原文位置
- comparison_summary 是否四段式

### 12.2 final_article 污染检测可能误报

`detectArticlePollution` 用字符串包含匹配 `Q1` / `Q2` / `Q3`，若正文 legitimately 出现 "Q1 财报" / "Q2 季度" 等会误报。当前仅显示警告不自动删除，影响可控，但可考虑改为更精确的 `^## FAQ` / `^Q1[.、]` 正则。

### 12.3 前端 chunk 体积警告

`npm run build` 提示主 chunk 985KB（gzip 301KB）超过 500KB 推荐值。功能不受影响，但可考虑：
- `manualChunks` 拆分 react / react-router / tanstack-query
- 路由级 lazy load（MultiPlatformResultPage / RewriteResultPage）

### 12.4 多平台任务原子性

前端循环创建 N 个 task，若中途网络失败会留下部分 task 已创建、部分未创建的状态。当前无事务回滚。可考虑：
- 前端提示"已创建 X/N 个，是否重试剩余"
- 或后端新增批量创建端点（但 P0 禁止改 API，故未做）

### 12.5 LLM 调用成本

多平台 = N 次独立 LLM 调用，对高并发或 token 限制账户可能触发限流。前端仅做了文案提示，未做真实额度管控。

---

## 13. 下一步建议

| 优先级 | 建议 | 说明 |
| --- | --- | --- |
| P1 | 端到端验收测试 | 用户配置 LLM_API_KEY 后按第 7-11 节验收清单逐项验证 |
| P1 | Prompt 调优 | 根据真实 LLM 输出微调平台分支措辞，尤其是 final_article 纯净性、FAQ 题型覆盖、missing_sources 具体化 |
| P2 | 真实图片生成 | 小红书 P0 只生成图文卡片脚本，P1 可接入图片生成模型产出真实图片（明确超出 P0 边界） |
| P2 | 自动发布 | 公众号 / 小红书 / 知乎 API 接入与发布队列（明确超出 P0 边界） |
| P2 | 额度管控 | 真实扣费 / 额度检查 / 多平台任务原子性 |
| P3 | chunk 拆分 | manualChunks + 路由 lazy load 优化前端体积 |
| P3 | 污染检测精确化 | `Q1` 等模式改为正则，减少误报 |
| P3 | quality-check LLM | 启用第三轮质量校验调用（本轮按需求禁用） |

---

## 14. P0 边界确认

明确说明 P0 **没有做** 以下事项（符合用户强制边界）：

- ❌ 未接公众号 API
- ❌ 未接小红书 API
- ❌ 未接知乎 API
- ❌ 未做自动发布
- ❌ 未做发布队列
- ❌ 未做账号授权
- ❌ 未做图片生成（小红书仅生成图文卡片脚本）
- ❌ 未导出 PNG
- ❌ 未做模板编辑器
- ❌ 未做 Canva / Figma 类排版工具
- ❌ 未做品牌向量库
- ❌ 未做 MCP
- ❌ 未做复杂 Dashboard
- ❌ 未改登录权限
- ❌ 未新增数据库表
- ❌ 未新增数据库字段
- ❌ 未改现有 API 路径
- ❌ 未改 Hooks 的整体架构
- ❌ 未重构 AppShell / TopBar / Layout
- ❌ 未重新做 UI
- ❌ 未启用 quality-check LLM 调用

P0 实现方式：**通过修改 Prompt + 新增 output-contract 文档 + 前端多选 + 复用现有单平台任务 API 循环创建 + 动态 Schema Tab + 平台发布建议卡片组件 + 导出 Markdown 分区**，把单平台 Rewrite 升级为可用的多平台发稿包生成。

---

## 附：构建验证结果

| 验证项 | 命令 | 结果 |
| --- | --- | --- |
| 前端构建 | `npm run build` | ✅ exit 0，dist 生成（index.html 0.46KB / css 38.58KB / js 985.54KB） |
| TypeScript 检查 | `npx tsc --noEmit` | ✅ exit 0，无类型错误 |
| 后端模块导入 | `python -c "from app.main import app"` | ✅ 28 路由全部注册 |
| 后端 /docs | `curl http://127.0.0.1:8002/docs` | ✅ HTTP 200 |
| 后端 /api/projects | `curl http://127.0.0.1:8002/api/projects` | ✅ 返回真实数据（含历史 project "灏思瑞"） |
| 后端 OpenAPI | `/openapi.json` | ✅ 15 个业务路径全部注册 |
| 后端单元测试 | — | 项目无自有测试文件，跳过 |

构建过程中修复的 3 个 TypeScript 错误：
1. `PlatformPublishGuideView.tsx` Badge variant `"secondary"` 不存在 → 改为 `"default"`
2. `PlatformPublishGuideView.tsx` 图文卡片 Badge variant `"secondary"` → 改为 `"muted"`
3. `MultiPlatformResultPage.tsx` `useTaskDetail` 从错误模块导入 → 改为从 `@/hooks` 统一入口导入
