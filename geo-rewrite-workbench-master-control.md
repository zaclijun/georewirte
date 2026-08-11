# GEO 内容改写工作台 — 总控文档

> **文档版本**：v1.1 (P0)
> **生成日期**：2026-06-26
> **最后更新**：2026-06-26（新增 GEOFlow 参考吸收原则 + 字段补充）
> **角色**：总控窗口（Master Control）
> **状态**：待启动
> **基线文档**：
> - [rewrite-skill-capability-audit.md](file:///Users/zachary/Downloads/geo-rewrite-skill/rewrite-skill-capability-audit.md)
> - [geo-rewrite-workbench-implementation-plan.md](file:///Users/zachary/Downloads/geo-rewrite-skill/geo-rewrite-workbench-implementation-plan.md)

---

## 1. 产品定位

**产品名称**：GEO 内容改写工作台（GEO Rewrite Workbench）

**一句话定义**：把现有 GEO Rewrite Skill 产品化为一个轻量 Web 工作台，让内容团队可以管理品牌事实、提交改写任务、查看 GEO 评分与优化结果、导出 Markdown 包。

**核心价值**：
- 将 Skill 的对话式交互升级为可视化工作台
- 品牌事实持久化，确保实体一致性
- 任务历史可追溯，版本可对比
- 评分可视化，GEO 提升效果可量化

**用户画像**：内容运营、品牌市场、SEO/GEO 负责人、内容 agency

---

## 2. P0 范围

### 2.1 P0 必做清单

| 模块 | 功能点 | 验收标准 |
|------|--------|----------|
| **项目管理** | 项目 CRUD | 可创建/编辑/删除/查看项目列表 |
| **品牌事实库** | 事实 CRUD + 类型筛选 | 可增删改查品牌事实，按类型（brand/product/case/data/certification/other）筛选，支持标签 |
| **新建改写任务** | 表单 + 原文输入 | 可填写标题、粘贴原文、选择视角、选择平台（4 个）、来源策略、输出长度，关联品牌事实 |
| **GEO Rewrite 核心** | 2-3 次 LLM 调用完成改写 | 输出改写正文 + FAQ + Schema 建议 + 待补充来源 |
| **原文评分** | 6 维 GEO Scorecard | 事实密度/结构清晰度/实体一致性/来源权威性/AI 触发覆盖/Schema 就绪度，0-100 分 |
| **改后评分** | 6 维 GEO Scorecard | 同原文评分维度，可对比 |
| **FAQ 生成** | 5-8 个 FAQ | 基于改写正文生成，Markdown 格式 |
| **Schema 建议** | JSON-LD 格式 | Article/FAQPage 等基础 Schema |
| **待补充来源** | 缺失证据列表 | 列出所有需要补充的数据/案例/认证来源 |
| **历史记录** | 任务列表 + 版本记录 | 可查看历史任务、任务状态、每个任务的多个版本 |
| **Markdown 导出** | 一键下载完整 Rewrite Package | 导出包含：标题 + 改前改后评分 + 改写正文 + FAQ + Schema 建议 + 优化策略 + 待补充来源 + 前后对比摘要的完整 Markdown 文件 |
| **统一 LLMService** | 封装 LLM 调用 | 统一接口、可切换 Provider、记录 token 用量、错误重试 |
| **Prompt 文件化** | 5 个 Prompt 文件 | system-role / score-and-diagnose / rewrite-package / quality-check / output-json |

### 2.2 P0 开放平台（4 个）

| 平台 | 是否开放 | 说明 |
|------|----------|------|
| 官网文章 | ✅ | 默认 |
| 公众号 | ✅ | |
| 知乎问答 | ✅ | 原"知乎专栏"调整为"知乎问答"，更精准 |
| 小红书 | ✅ | |
| 微博 | ❌ P1 | |
| 抖音 | ❌ P2 | |
| LinkedIn | ❌ P2 | |
| X/Twitter | ❌ P2 | |
| YouTube | ❌ P2 | |
| 行业媒体 | ❌ P2 | |
| 新闻稿 | ❌ P2 | |

### 2.3 P0 开放视角（9 个全保留，但 UI 只展示常用 5 个）

UI 展示前 5 个：品牌方、第三方、用户/客户、媒体/新闻、内部/员工
其余 4 个折叠在"更多视角"中

---

## 3. 明确不做范围（P0 红线）

> ⚠️ 以下功能 P0 绝对不做。任何窗口发现自己在做以下内容，立即停止并报告总控。

| 功能 | 为什么不做 | 后续版本 |
|------|-----------|----------|
| **自动发稿** / CMS 集成 | 产品定位是「改写工作台」，不是「发布平台」 | P3+ 评估 |
| **MCP 服务端** | 与工作台目标无关 | 独立项目 |
| **完整 DIGLLM Monitor** | 调用监控做基础日志即可，不做平台 | 用专业工具 |
| **复杂权限 / RBAC** | P0 单用户/小团队，项目级隔离足够 | P3 |
| **向量数据库** | 品牌事实量不大，关键词 + 标签检索够用 | P2 评估 |
| **Prompt 管理后台** | P0 Prompt 放文件，改文件比做后台快 | P2 |
| **11 个平台全量开放** | 先跑通 4 个核心平台，验证价值 | P1/P2 |
| **多账号矩阵** | P0 不做用户体系 | P3 |
| **协作编辑** | 非核心需求 | P3+ |
| **发布日历** | 与改写无关 | 不做 |
| **Word / PDF 导出** | Markdown 导出够用，Word/PDF 依赖重 | P2 |
| **复杂数据看板** | P0 只有简单用量统计 | P3 |
| **A/B 测试** | Prompt 迭代先靠人工 | P3 |
| **实时协作 / SSE 流式输出** | P0 用轮询，降低复杂度 | P1 评估 |
| **图片 / 多模态 GEO** | 纯文本先跑通 | P3+ |

---

## 3.5 GEOFlow 参考吸收原则

> 本项目参考 GEOFlow 的内容工程化思路，但**不复制其 CMS 与多站点分发架构**。GEOFlow 仅作为参考项目，不作为需求来源。

### 3.5.1 可吸收的工程化思路

| 思路 | 说明 | 如何融入 P0 |
|------|------|------------|
| **知识库优先** | 内容生产以事实库为基础，不凭空生成 | ✅ 品牌事实库就是 P0 核心，改写必须基于事实 |
| **任务化内容生产** | 以任务为单位组织内容生产流程 | ✅ rewrite_tasks 表就是任务化设计 |
| **草稿 / 审核 / 可发布状态** | 内容有明确的质量状态流转 | ✅ review_status 字段：ready / review / needs_material / exported |
| **SEO / LLM 友好输出** | 输出格式优先考虑搜索引擎和大模型可读性 | ✅ GEO 改写的核心目标就是 AI 友好 |
| **LLM 调用日志** | 完整记录每次大模型调用，便于追溯和成本核算 | ✅ llm_call_logs 表，P0 必做 |
| **Docker 部署意识** | 架构设计考虑容器化部署的便利性 | ✅ 技术选型上保持无状态，P2+ 可加 Dockerfile |
| **不制造低质量信息噪音** | 产品原则：宁可不生成，也不生成垃圾内容 | ✅ 防幻觉规则 + 质量检查 + 高质量保护模式 |

### 3.5.2 不吸收的能力（明确排除）

| 能力 | 为什么不吸收 | 备注 |
|------|-------------|------|
| **多站点分发** | 工作台只做改写，不做发布管理 | 与产品定位不符 |
| **WordPress REST 发布** | 不做自动发稿 | P0 红线 |
| **目标站点 Agent** | 不做站点级别的自动化 agent | 与工作台目标无关 |
| **远端静态页面生成** | 不做页面生成和托管 | 超出范围 |
| **sitemap / llms.txt 自动站点生成** | 不做 SEO 站点工具 | 独立产品方向 |
| **发布队列** | 不做发布调度 | 不做发稿 |
| **前台 CMS 主题系统** | 没有前台展示层 | 纯后台工具 |
| **复杂数据分析大盘** | P0 只做简单用量统计 | P3 再考虑 |
| **自动发稿** | 绝对不做 | P0 红线第一条 |
| **多账号矩阵** | P0 不做用户体系 | P3 再评估 |

### 3.5.3 P0 核心闭环重申

**P0 只做 GEO 内容改写工作台，核心闭环是：**

```
项目 → 品牌事实库 → 改写任务 → GEO Rewrite Package → 评分 → 历史记录 → Markdown 导出
```

> 任何偏离这个闭环的功能（尤其是 GEOFlow 中的 CMS、发布、多站点相关能力），都不属于 P0 范围。如需引入，必须提交总控审批。

---

## 4. 技术栈判断

### 4.1 现状

当前目录只有 Skill 文件（Markdown/YAML），**无任何现有前后端代码**。

### 4.2 技术选型

| 层级 | 选型 | 理由 |
|------|------|------|
| **前端** | React + Vite + TypeScript + TailwindCSS + shadcn/ui | 用户提到 React 优先；生态成熟，组件丰富 |
| **后端** | Python + FastAPI + SQLAlchemy 2.x | 用户明确提到「如果有 React + FastAPI 优先沿用」，暗示 FastAPI 偏好；Python 生态 AI 相关库丰富 |
| **ORM** | SQLAlchemy + Alembic | FastAPI 标配，迁移方便 |
| **数据库** | SQLite (P0) | 零运维，表结构按 PostgreSQL 兼容设计，P2 可平滑迁移 |
| **LLM** | OpenAI SDK（兼容 OpenAI API 格式） | 统一接口，支持 DeepSeek/通义/豆包等兼容 Provider |
| **Markdown 渲染** | react-markdown + remark-gfm | 前端渲染改写结果 |
| **HTTP 客户端** | axios | 前端 API 调用 |
| **状态管理** | React Query (TanStack Query) | 服务端状态管理 + 缓存 + 轮询 |

### 4.3 为什么不用 Node.js 后端

用户明确指示："如果当前项目已有 React + FastAPI，优先沿用 React + FastAPI；不要新开 Node.js 后端，除非当前项目本身就是 Node 技术栈"。当前虽无既有项目，但 FastAPI 是用户偏好方向，且 Python 与 AI 生态契合度更高。

---

## 5. 推荐目录结构

```
geo-rewrite-workbench/
├── frontend/                          # React 前端
│   ├── src/
│   │   ├── pages/
│   │   │   ├── ProjectListPage.tsx        # 项目首页
│   │   │   ├── BrandFactsPage.tsx         # 品牌事实库
│   │   │   ├── NewRewritePage.tsx         # 新建改写任务
│   │   │   ├── RewriteResultPage.tsx      # 改写结果页
│   │   │   └── HistoryPage.tsx            # 历史任务页
│   │   ├── components/
│   │   │   ├── ScoreRadarChart.tsx        # 评分雷达图
│   │   │   ├── MarkdownRenderer.tsx       # Markdown 渲染
│   │   │   ├── FactSelector.tsx           # 品牌事实选择器
│   │   │   └── StatusBadge.tsx            # 状态标签
│   │   ├── services/
│   │   │   ├── api.ts                     # API 封装
│   │   │   ├── projectService.ts
│   │   │   ├── brandFactService.ts
│   │   │   └── rewriteService.ts
│   │   ├── types/                         # TypeScript 类型
│   │   ├── hooks/                         # 自定义 hooks
│   │   └── App.tsx
│   └── package.json
│
├── backend/                           # FastAPI 后端
│   ├── app/
│   │   ├── main.py                        # 入口
│   │   ├── config.py                      # 配置
│   │   ├── database.py                    # 数据库连接
│   │   ├── models/                        # SQLAlchemy 模型
│   │   │   ├── project.py
│   │   │   ├── brand_fact.py
│   │   │   ├── rewrite_task.py
│   │   │   ├── rewrite_output.py
│   │   │   ├── content_score.py
│   │   │   └── llm_call_log.py
│   │   ├── schemas/                       # Pydantic schema（请求/响应）
│   │   │   ├── project.py
│   │   │   ├── brand_fact.py
│   │   │   ├── rewrite_task.py
│   │   │   ├── rewrite_output.py
│   │   │   └── common.py
│   │   ├── api/                           # API 路由
│   │   │   ├── projects.py
│   │   │   ├── brand_facts.py
│   │   │   ├── rewrite_tasks.py
│   │   │   ├── outputs.py
│   │   │   └── export.py
│   │   ├── services/                      # 业务逻辑
│   │   │   ├── rewrite_service.py         # 改写编排
│   │   │   ├── scoring_service.py         # 评分（封装 LLM 调用）
│   │   │   ├── llm_service.py             # 统一 LLM 调用
│   │   │   ├── prompt_service.py          # Prompt 加载 + 插值
│   │   │   ├── export_service.py          # 导出服务
│   │   │   └── brand_fact_service.py      # 品牌事实服务
│   │   └── prompts/                       # Prompt 模板文件
│   │       ├── system-role.md
│   │       ├── score-and-diagnose.md
│   │       ├── rewrite-package.md
│   │       ├── quality-check.md
│   │       ├── output-json.md
│   │       └── references/                # 参考资料（从原 Skill 复制）
│   │           ├── perspectives.md
│   │           └── platforms.md
│   ├── alembic/                           # 数据库迁移
│   ├── requirements.txt
│   └── .env.example
│
└── README.md
```

---

## 6. 多窗口分工方案

### 6.1 窗口列表

| 窗口 | 代号 | 职责 | 产出 |
|------|------|------|------|
| **总控窗口** | MC | 维护边界、拆分任务、审查结果、更新文档 | 总控文档、任务包、验收报告 |
| **后端窗口** | BE | 数据库模型、API、Service 层、LLM 封装 | 可运行的后端服务 + API 文档 |
| **前端窗口** | FE | 5 个页面、组件、API 对接、状态管理 | 可运行的前端应用 |
| **Prompt 窗口** | PR | 拆分 SKILL.md、生成 5 个 Prompt 文件 | 可直接使用的 Prompt 模板 |
| **QA 窗口** | QA | 边界检查、接口一致性、闭环验证 | QA 报告 + Bug 清单 |

### 6.2 协作流程

```
总控(MC) ── 任务包 ──→ 后端(BE) ── 交付物 ──→ QA 审查
              │                                        │
              ├── 任务包 ──→ 前端(FE) ── 交付物 ──→ QA 审查
              │                                        │
              └── 任务包 ──→ Prompt(PR) ── 交付物 ──→ QA 审查
                                                         │
                                                         ▼
                                                QA 报告 → 总控复核 → 验收 / 打回
```

### 6.3 每个窗口的输入/输出

| 窗口 | 输入 | 输出 | 依赖 |
|------|------|------|------|
| **后端(BE)** | 总控任务包、数据表草案、接口契约草案、Prompt 文件 | 后端服务（可启动）、API 文档（FastAPI auto docs） | Prompt 窗口先交付 5 个 Prompt 文件 |
| **前端(FE)** | 总控任务包、接口契约草案、设计参考 | 前端应用（可启动）、页面完整跑通 | 后端 API 接口定义（可先用 mock） |
| **Prompt(PR)** | 总控任务包、原 SKILL.md、references/ 目录 | 5 个 Prompt 文件 + 说明文档 | 无（最早启动） |
| **QA(QA)** | 各窗口交付物、总控文档、P0 范围定义 | QA 报告、边界越界检查、功能完整性检查 | 各窗口交付完成 |

### 6.4 启动顺序

1. **第 0 天**：总控输出本文档 + 4 个任务包
2. **第 1 天**：Prompt 窗口启动（最快，不依赖其他）
3. **第 1 天**：后端窗口启动（依赖 Prompt 文件，但可先搭框架）
4. **第 2 天**：前端窗口启动（依赖接口契约，可先用 mock 数据）
5. **第 4-5 天**：各窗口交付 → QA 审查 → 总控复核
6. **第 5-6 天**：修复问题 → 最终验收

---

## 7. 后端任务包（BE Window Task）

> 可直接复制给后端执行窗口

```markdown
# 后端窗口任务包（P0）

## 目标
搭建 FastAPI 后端，实现 P0 所有 API 和业务逻辑，支撑前端 5 个页面的完整闭环。

## 技术栈
- Python 3.10+
- FastAPI
- SQLAlchemy 2.x + Alembic
- SQLite
- OpenAI SDK（兼容 OpenAI API 格式）

## 任务清单

### 1. 项目脚手架
- [ ] 初始化 FastAPI 项目结构
- [ ] 配置文件（.env、config.py）
- [ ] 数据库连接（SQLite + SQLAlchemy）
- [ ] Alembic 迁移配置
- [ ] CORS 配置
- [ ] 统一响应格式 + 异常处理

### 2. 数据模型（6 张表）
按「第 12 节 数据表草案」实现 SQLAlchemy 模型：
- [ ] projects（项目表）
- [ ] brand_facts（品牌事实表）
- [ ] rewrite_tasks（改写任务表）
- [ ] rewrite_outputs（改写结果表）
- [ ] content_scores（内容评分表）
- [ ] llm_call_logs（LLM 调用日志表）

### 3. Service 层
- [ ] **LLMService**：统一 LLM 调用封装
  - 支持 OpenAI 兼容接口
  - 可配置 model / api_key / base_url
  - 支持 JSON Mode / Function Calling
  - 自动重试（最多 2 次）
  - 记录 token 用量到 llm_call_logs
  - 超时处理（30s）

- [ ] **PromptService**：Prompt 加载与插值
  - 从文件加载 Prompt 模板
  - 支持 {{variable}} 变量替换
  - 加载 perspectives.md 和 platforms.md 对应规则

- [ ] **ScoringService**：评分相关逻辑
  - 调用 score-and-diagnose Prompt
  - 解析评分 JSON 结果
  - 保存到 content_scores 表

- [ ] **RewriteService**：核心改写编排
  - 流程：Call 1（评分+诊断+策略）→ Call 2（改写+FAQ+Schema+改后评分）→ Call 3（质量检查，可选）
  - P0 先做 2 次调用，Call 3 质量检查作为可选（默认关闭）
  - 管理任务状态（pending/running/completed/failed）
  - 保存输出到 rewrite_outputs 表
  - 保存改前改后评分到 content_scores 表

- [ ] **ExportService**：导出服务
  - Markdown 导出：整合标题 + 正文 + FAQ + Schema + 评分 + 待补充来源
  - 返回 .md 文件下载

- [ ] **BrandFactService**：品牌事实服务
  - CRUD
  - 按类型/标签/关键词筛选
  - 分页

### 4. API 接口
按「第 11 节 接口契约草案」实现：
- [ ] Project API（5 个端点）
- [ ] BrandFact API（7 个端点）
- [ ] RewriteTask API（7 个端点）
- [ ] Output API（5 个端点）
- [ ] Export API（2 个端点，P0 只做 markdown + json）

### 5. 其他
- [ ] 启动脚本
- [ ] requirements.txt
- [ ] README（启动说明）
- [ ] .env.example

## 验收标准
1. `uvicorn app.main:app --reload` 可以正常启动
2. 访问 /docs 可以看到所有 API 文档
3. 所有 API 可以用 curl / Swagger 正常调用
4. 提交一个改写任务，能正常完成并返回结果
5. llm_call_logs 表有调用记录
6. 所有数据库表正常创建
7. Markdown 导出接口返回可下载的 .md 文件

## 注意事项
- P0 不做用户认证、不做权限
- P0 不做 SSE / 流式，用轮询查状态
- LLM 调用出错要捕获并记录，任务状态设为 failed + error_message
- Prompt 文件放在 app/prompts/ 目录下
- 表结构按 PostgreSQL 兼容设计，避免 SQLite 特有语法
```

---

## 8. 前端任务包（FE Window Task）

> 可直接复制给前端执行窗口

```markdown
# 前端窗口任务包（P0）

## 目标
实现 5 个页面的 React 前端应用，完整跑通「项目 → 事实库 → 新建任务 → 结果页 → 历史记录」闭环。

## 技术栈
- React 18 + TypeScript
- Vite
- TailwindCSS
- shadcn/ui 组件库
- TanStack Query（React Query）
- axios
- react-markdown + remark-gfm
- recharts（雷达图）

## 页面清单

### 1. 项目首页（ProjectListPage）
- [ ] 项目卡片列表展示
- [ ] 新建项目按钮 + 弹窗表单
- [ ] 项目搜索（按名称）
- [ ] 点击项目进入（默认进入品牌事实库）
- [ ] 每个项目卡片显示：名称、描述、任务数、创建时间

### 2. 品牌事实库（BrandFactsPage）
- [ ] 事实列表（表格形式）
- [ ] 新建事实按钮 + 弹窗表单（标题、类型、内容、来源链接、标签）
- [ ] 编辑事实（弹窗）
- [ ] 删除事实（确认弹窗）
- [ ] 按类型筛选（下拉选择：全部/品牌/产品/案例/数据/认证/其他）
- [ ] 搜索框（按标题/内容关键词）
- [ ] 分页

### 3. 新建改写任务（NewRewritePage）
- [ ] 任务标题输入框
- [ ] 原文编辑器（textarea 或简易 Markdown 编辑器）
- [ ] 参数配置区：
  - [ ] 视角选择（下拉：品牌方/第三方/用户/客户/媒体/新闻 + 更多）
  - [ ] 平台选择（下拉：官网文章/公众号/知乎问答/小红书）
    > ⚠️ P0 只开放这 4 个平台，UI 上只显示这 4 个，不要有「更多平台」或隐藏选项
  - [ ] 文章类型（文本输入，可选）
  - [ ] 来源策略（下拉：仅使用提供的/允许外部/标记缺失来源）
  - [ ] 输出长度（下拉：短/标准/长）
  - [ ] 生成 Schema 开关（默认开）
- [ ] 品牌事实关联：
  - [ ] 可搜索并选择要关联的品牌事实
  - [ ] 显示已选事实列表
- [ ] 提交按钮（"开始改写"）
- [ ] 提交后跳转到结果页

### 4. 改写结果页（RewriteResultPage）
- [ ] 顶部状态栏：任务标题、状态标签、版本切换器
- [ ] 评分卡片：
  - [ ] 改前总分 / 改后总分（大字展示）
  - [ ] 6 维雷达图对比（改前 vs 改后）
  - [ ] 各维度分数字段列表
- [ ] Tab 切换区：
  - [ ] Tab 1: 改写正文（Markdown 渲染）
  - [ ] Tab 2: FAQ（Markdown 渲染）
  - [ ] Tab 3: Schema 建议（代码块展示 JSON-LD）
  - [ ] Tab 4: 优化策略（列表展示）
  - [ ] Tab 5: 待补充来源（列表展示，数据/案例的来源链接）
  - [ ] Tab 6: 待补充事实（列表展示，建议加入品牌事实库的内容，支持一键添加）
- [ ] 双栏对比视图切换（原文 vs 改写）
- [ ] 底部操作栏：
  - [ ] 一键复制正文
  - [ ] 导出 Rewrite Package（Markdown 完整包下载）
  - [ ] 重新改写（回到新建页，预填原参数）
- [ ] 质量状态标签（可发布/建议检查/需补充材料）

### 5. 历史任务页（HistoryPage）
- [ ] 任务列表（表格形式）
- [ ] 状态筛选（全部/进行中/已完成/失败）
- [ ] 搜索框（按标题）
- [ ] 分页
- [ ] 每行显示：标题、平台、视角、状态、创建时间、操作（查看/删除）
- [ ] 点击"查看"跳转到结果页
- [ ] 删除任务（确认弹窗）

## 通用组件
- [ ] ScoreRadarChart（评分雷达图）
- [ ] MarkdownRenderer（Markdown 渲染）
- [ ] StatusBadge（状态标签：pending/running/completed/failed）
- [ ] FactSelector（品牌事实选择器，弹窗形式）
- [ ] ConfirmDialog（确认弹窗）

## API 对接
- 使用 axios 封装 API 层
- 使用 TanStack Query 管理服务端状态
- 轮询任务状态（每 3s 查一次，直到 completed/failed）
- 错误处理：弹窗提示错误信息

## 验收标准
1. `npm run dev` 可以正常启动
2. 5 个页面都能正常访问
3. 项目 CRUD 完整跑通
4. 品牌事实 CRUD 完整跑通
5. 可以创建改写任务并跳转到结果页
6. 结果页展示完整的评分、正文、FAQ、Schema
7. 历史任务列表正常展示
8. Rewrite Package 导出可以下载完整 Markdown 文件
9. 一键复制功能正常

## 注意事项
- P0 不做登录、不做用户体系
- P0 不做实时协作、不做 SSE
- 后端没好的时候可以用 mock 数据先开发
- 响应式优先桌面端，移动端能用就行
- 风格简洁专业，参考 Notion / Linear 类产品
```

---

## 9. Prompt 任务包（Prompt Window Task）

> 可直接复制给 Prompt 执行窗口

```markdown
# Prompt 窗口任务包（P0）

## 目标
将现有 SKILL.md 拆分为 5 个 Prompt 模板文件，每个文件职责单一，支持 {{variable}} 变量插值，可直接被后端 LLMService 使用。

## 源文件
- SKILL.md（主规则）
- references/perspectives.md（视角规则）
- references/platforms.md（平台规则）
- references/output-schema.md（输出 Schema）

## 输出文件（5 个）

### 1. system-role.md
**用途**：系统角色定义，作为每次调用的 system prompt。

**输入变量**：无（固定内容）

**内容要点**：
- GEO 内容架构师角色定义
- DSS+E 核心模型（Depth/Support/Sources/Entity）简述
- 基本行为准则：
  - 不编造事实、数据、案例、奖项、认证、日期、价格、客户名称、链接、法律声明
  - 保持客观专业，避免夸张营销
  - 优先使用定义句、对比句、因果句、证据句、总结句
  - 保留用户提供的事实，除非有证据矛盾
- AI Trigger Pattern 说明

**注意**：不要包含具体的评分标准或改写步骤，这些放各自的 Prompt 里。

---

### 2. score-and-diagnose.md
**用途**：Call 1 —— 对原文进行评分 + 问题诊断 + 优化策略生成。

**输入变量**：
- `{{article}}` — 原文内容
- `{{perspective}}` — 视角名称
- `{{perspective_rules}}` — 对应视角的规则文本（从 perspectives.md 提取）
- `{{platform}}` — 平台名称
- `{{platform_rules}}` — 对应平台的规则文本（从 platforms.md 提取）
- `{{brand_facts}}` — 关联的品牌事实列表（JSON 字符串）
- `{{source_policy}}` — 来源策略

**输出要求**：严格 JSON 格式
```json
{
  "score_before": {
    "overall": 75,
    "dimensions": [
      { "name": "事实密度", "score": 70, "comment": "..." },
      { "name": "结构清晰度", "score": 80, "comment": "..." },
      { "name": "实体一致性", "score": 75, "comment": "..." },
      { "name": "来源权威性", "score": 65, "comment": "..." },
      { "name": "AI 触发覆盖", "score": 72, "comment": "..." },
      { "name": "Schema 就绪度", "score": 68, "comment": "..." }
    ]
  },
  "diagnosis": {
    "hard_blockers": ["硬阻断问题1", "硬阻断问题2"],
    "issues": [
      { "type": "factual", "severity": "high", "description": "..." }
    ],
    "source_gaps": ["缺失的数据来源", "缺失的案例引用"]
  },
  "is_high_quality": false,
  "optimization_strategy": [
    {
      "issue": "问题描述",
      "action": "优化动作",
      "priority": "high",
      "evidence": "依据或参考"
    }
  ]
}
```

**内容要点**：
- 6 维评分标准严格参考 SKILL.md 的 Scorecard 定义
- 硬阻断定义：编造声明、缺证据的具体数据/认证/价格/客户案例、法律合规风险、事实矛盾
- 优化策略要具体、可执行
- 如果评分 ≥ 80 且无硬阻断，is_high_quality = true（触发高质量保护模式）

---

### 3. rewrite-package.md
**用途**：Call 2 —— 核心改写，一次性输出正文 + FAQ + Schema + 改后评分。

**输入变量**：
- `{{article}}` — 原文
- `{{brand_facts}}` — 品牌事实列表（JSON 字符串）
- `{{perspective}}` — 视角
- `{{perspective_rules}}` — 视角规则
- `{{platform}}` — 平台
- `{{platform_rules}}` — 平台规则
- `{{source_policy}}` — 来源策略
- `{{output_length}}` — 输出长度（short/standard/long）
- `{{is_high_quality}}` — 是否高质量（true/false）
- `{{optimization_strategy}}` — 优化策略（JSON 字符串）
- `{{need_schema}}` — 是否生成 Schema（true/false）

**输出要求**：严格 JSON 格式
```json
{
  "title": "改写后的标题",
  "final_article": "改写后的正文 Markdown，只含正文，不含评分/策略/FAQ/Schema",
  "faq_content": "## FAQ\n\n### 问题1？\n\n答案1\n\n### 问题2？\n\n答案2",
  "schema_suggestions": {
    "type": "Article/FAQPage",
    "json_ld": { ... }
  },
  "score_after": {
    "overall": 90,
    "dimensions": [
      { "name": "事实密度", "score": 92, "comment": "..." }
    ]
  },
  "comparison_summary": "前后对比摘要：保留了...，增强了...，补充了...，处理了...风险",
  "missing_sources": ["待补充来源1", "待补充来源2"],
  "missing_facts": [
    { "title": "建议补充的事实标题", "fact_type": "data", "content": "事实内容描述", "reason": "为什么建议加入品牌事实库" }
  ]
}
```

**内容要点**：
- 核心改写基于 DSS+E 模型
- 如果 is_high_quality = true，采用轻量增强模式（保留原文结构和核心内容，只做 GEO 优化）
- FAQ 数量 5-8 个，基于正文内容
- Schema 建议至少包含 Article 类型，如果有 FAQ 则包含 FAQPage
- 改后评分要客观，不能虚高
- missing_sources 列出所有需要补充但没有的证据来源
- missing_facts 列出建议加入品牌事实库的内容（有价值的、可复用的事实）
- final_article 是纯净的可发布 Markdown，不能包含过程性文字

---

### 4. quality-check.md
**用途**：Call 3（可选，P0 默认关闭）—— 最终质量检查。

**输入变量**：
- `{{original_article}}` — 原文
- `{{rewritten_article}}` — 改写后正文
- `{{brand_facts}}` — 品牌事实
- `{{source_policy}}` — 来源策略
- `{{hard_blockers}}` — 之前识别的硬阻断（JSON 数组）

**输出要求**：严格 JSON 格式
```json
{
  "passed": true,
  "quality_status": "ready",
  "publish_label": "可发布",
  "reasons": ["事实准确", "实体一致", "无编造内容"],
  "highlights": ["事实密度提升 20%", "结构更清晰"],
  "warnings": ["部分数据建议补充来源"],
  "missing_sources": ["补充来源列表"]
}
```

**内容要点**：
- 检查是否有编造事实
- 检查实体名称是否一致
- 检查是否有夸张营销或绝对化表达
- 检查来源策略是否被遵守
- quality_status: ready / review / needs_material

---

### 5. output-json.md
**用途**：将所有结果整合成标准输出格式（后端代码直接组装也行，这个 Prompt 可选，P0 后端可以直接用代码组装，不用这个 Prompt）。

**输入变量**：所有结果字段

**输出要求**：完整 JSON（参考 output-schema.md）

**P0 说明**：P0 后端可以直接用代码组装最终输出，不一定需要这个 Prompt。先做出来备用。

---

## 视角 & 平台规则处理
- perspectives.md 和 platforms.md 原样复制到 backend/app/prompts/references/ 目录
- PromptService 根据传入的 perspective / platform 参数，读取对应规则并注入到 Prompt 变量中
- 不需要把 9 个视角和 11 个平台的规则都写进每个 Prompt 文件

## 验收标准
1. 5 个文件都存在且格式正确（Markdown）
2. 每个文件都有明确的输入变量列表和输出格式定义
3. 保留了 DSS+E、6 维 Scorecard、source_policy、防幻觉规则的核心内容
4. score-and-diagnose.md 的输出 JSON 可以被后端解析
5. rewrite-package.md 的输出 JSON 可以被后端解析
6. P0 只需要 4 个平台的规则（官网文章/公众号/知乎问答/小红书），其余平台规则保留但 P0 不启用
7. 视角规则 9 个全部保留

## 注意事项
- 所有 Prompt 用中文写（因为产品面向中文用户）
- 输出格式必须是严格的 JSON，不能有多余文字（方便后端解析）
- 不要在 Prompt 里写"好的"、"我来分析一下"之类的过程性文字
- 温度建议：评分 0.1，改写 0.3，质量检查 0.1
```

---

## 10. QA 任务包（QA Review Window Task）

> 可直接复制给 QA 执行窗口

```markdown
# QA 窗口任务包（P0）

## 目标
审查各窗口交付物，确保 P0 范围不越界、接口一致、闭环可跑通、没有做不该做的功能。

## 审查清单

### 1. 边界检查（最重要）
- [ ] ❌ 是否做了自动发稿 / CMS 集成？
- [ ] ❌ 是否做了 MCP 相关功能？
- [ ] ❌ 是否做了完整的 DIGLLM Monitor（调用链、告警、复杂看板）？
- [ ] ❌ 是否做了 RBAC / 复杂权限 / 用户登录体系？
- [ ] ❌ 是否引入了向量数据库？
- [ ] ❌ 是否做了 Prompt 管理后台？
- [ ] ❌ 是否开放了超过 4 个平台？
- [ ] ❌ 是否做了 Word / PDF 导出？
- [ ] ❌ 是否做了协作编辑 / 实时多人？
- [ ] ❌ 是否做了发布日历？

### 2. 后端审查
- [ ] 数据库表是否与「数据表草案」一致？
- [ ] API 接口是否与「接口契约草案」一致？
- [ ] LLMService 是否统一封装？是否所有 LLM 调用都走 LLMService？
- [ ] 是否记录了 llm_call_logs？
- [ ] 错误处理是否完善？（任务失败有 error_message）
- [ ] Markdown 导出接口是否正常工作？
- [ ] Prompt 是否从文件加载？
- [ ] 改写流程是 2-3 次调用，不是 8-9 次？
- [ ] 有没有 .env.example？有没有泄露真实 API Key？

### 3. 前端审查
- [ ] 5 个页面是否都有？
- [ ] 评分雷达图是否正常展示 6 个维度？
- [ ] 改前改后评分是否都有？
- [ ] FAQ / Schema / 优化策略 / 待补充来源是否都展示了？
- [ ] 历史任务列表是否正常？
- [ ] Markdown 导出按钮是否工作？
- [ ] 一键复制是否工作？
- [ ] 平台选择器是不是只有 4 个选项？
- [ ] 有没有做登录 / 注册页？（P0 不应该有）
- [ ] 有没有做 Prompt 管理页？（P0 不应该有）

### 4. 接口一致性
- [ ] 前端调用的 API 路径与后端定义是否一致？
- [ ] 请求/响应的数据结构是否一致？
- [ ] 状态字段枚举是否一致？（pending/running/completed/failed）
- [ ] 评分维度名称是否一致？
- [ ] 来源策略枚举是否一致？

### 5. 闭环测试
- [ ] 从创建项目 → 录入品牌事实 → 新建改写任务 → 查看结果 → 导出 Markdown，完整走一遍
- [ ] 查看历史任务列表，刚创建的任务是否在列表中
- [ ] 任务失败时，是否有错误提示？
- [ ] 重新改写是否生成新版本？

### 6. Prompt 审查
- [ ] 5 个 Prompt 文件是否都存在？
- [ ] 核心规则是否都保留了？（DSS+E / Scorecard / source_policy / 防幻觉）
- [ ] 输出格式是否是严格 JSON？
- [ ] 有没有泄露敏感信息？

### 7. 文档审查
- [ ] 前后端都有 README 吗？
- [ ] 启动说明是否清晰？
- [ ] 环境变量示例是否齐全？
- [ ] 有没有真实的 API Key 或密钥提交到代码里？

## QA 输出
1. QA 报告（Markdown 格式）
2. Bug 清单（按严重程度：Critical / Major / Minor）
3. 边界越界问题清单（如果有）
4. 验收结论：通过 / 有条件通过 / 不通过

## 注意事项
- QA 不负责修复，只负责发现问题
- 边界越界问题是最高优先级，发现一个报一个
- 如果发现功能膨胀，立即报告总控
- 闭环测试要真的跑一遍，不能只看代码
```

---

## 11. 接口契约草案

> 前后端都按这个来，保持一致。如果有分歧，找总控裁决。

### 11.1 通用响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

- `code = 0` 表示成功，非 0 表示失败
- `message` 失败时是错误信息
- `data` 响应数据

### 11.2 分页参数

请求：
```
?page=1&page_size=20
```

响应 data：
```json
{
  "items": [],
  "total": 100,
  "page": 1,
  "page_size": 20
}
```

### 11.3 Project API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/projects` | 项目列表 |
| POST | `/api/projects` | 创建项目 |
| GET | `/api/projects/:id` | 项目详情 |
| PUT | `/api/projects/:id` | 更新项目 |
| DELETE | `/api/projects/:id` | 删除项目 |

**Project 对象**：
```json
{
  "id": "uuid",
  "name": "项目名称",
  "description": "项目描述",
  "brand_name": "品牌名",
  "default_perspective": "第三方",
  "default_platform": "官网文章",
  "created_at": "2026-06-26T00:00:00Z",
  "updated_at": "2026-06-26T00:00:00Z"
}
```

### 11.4 BrandFact API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/projects/:projectId/brand-facts` | 事实列表（支持 fact_type / keyword 筛选 + 分页） |
| POST | `/api/projects/:projectId/brand-facts` | 新增事实 |
| GET | `/api/brand-facts/:id` | 事实详情 |
| PUT | `/api/brand-facts/:id` | 更新事实 |
| DELETE | `/api/brand-facts/:id` | 删除事实 |

**BrandFact 对象**：
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "fact_type": "brand",
  "title": "事实标题",
  "content": "事实详细内容",
  "source_type": "official",
  "source_url": "https://...",
  "evidence_level": "strong",
  "tags": ["标签1", "标签2"],
  "is_active": true,
  "created_at": "...",
  "updated_at": "..."
}
```

fact_type 枚举：`brand` / `product` / `case` / `certification` / `data` / `other`

source_type 枚举：`official` / `third_party_report` / `user_review` / `internal_data` / `public_data` / `unspecified`

evidence_level 枚举：`conclusive` / `strong` / `moderate` / `weak` / `anecdotal`

### 11.5 RewriteTask API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/projects/:projectId/tasks` | 任务列表（支持 status / keyword 筛选 + 分页） |
| POST | `/api/projects/:projectId/tasks` | 创建任务（触发改写） |
| GET | `/api/tasks/:id` | 任务详情 |
| PUT | `/api/tasks/:id` | 更新任务参数（重新改写） |
| DELETE | `/api/tasks/:id` | 删除任务 |
| POST | `/api/tasks/:id/retry` | 重试失败任务 |
| GET | `/api/tasks/:id/status` | 查询任务状态 |

**创建任务请求体**：
```json
{
  "title": "任务标题",
  "original_content": "原文 Markdown",
  "article_type": "行业分析",
  "perspective": "第三方",
  "publish_platform": "官网文章",
  "target_audience": "目标受众",
  "source_policy": "mark_missing_sources",
  "output_length": "standard",
  "need_schema": true,
  "brand_fact_ids": ["uuid1", "uuid2"]
}
```

**RewriteTask 对象**：
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "title": "任务标题",
  "perspective": "第三方",
  "publish_platform": "官网文章",
  "status": "pending",
  "error_message": null,
  "created_at": "...",
  "updated_at": "..."
}
```

status 枚举：`pending` / `running` / `completed` / `failed`

source_policy 枚举：`use_provided_only` / `allow_external_sources` / `mark_missing_sources`

output_length 枚举：`short` / `standard` / `long`

### 11.6 Output API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tasks/:taskId/outputs` | 版本列表 |
| GET | `/api/outputs/:id` | 版本详情（完整数据） |
| GET | `/api/outputs/:id/scores` | 评分详情（改前+改后） |
| POST | `/api/outputs/:id/regenerate` | 基于该版本重新改写 |

**RewriteOutput 对象（详情）**：
```json
{
  "id": "uuid",
  "task_id": "uuid",
  "version": 1,
  "parent_version_id": null,
  "title": "改写后标题",
  "final_article": "正文 Markdown",
  "faq_content": "FAQ Markdown",
  "schema_suggestions": { "type": "Article", "json_ld": {} },
  "optimization_strategy": [
    { "issue": "...", "action": "...", "priority": "high", "evidence": "..." }
  ],
  "comparison_summary": "对比摘要",
  "missing_sources": ["来源1", "来源2"],
  "missing_facts": [
    { "title": "建议补充的事实标题", "fact_type": "data", "content": "事实内容描述", "reason": "为什么需要补充这个事实" }
  ],
  "review_status": "ready",
  "score_before": { "overall": 75, "dimensions": [...] },
  "score_after": { "overall": 90, "dimensions": [...] },
  "created_at": "..."
}
```

review_status 枚举：`ready` / `review` / `needs_material` / `exported`

### 11.7 Export API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/outputs/:id/export?format=markdown` | 导出完整 Rewrite Package（Markdown） |
| GET | `/api/outputs/:id/export?format=json` | 导出完整 Rewrite Package（JSON） |

**Markdown 导出内容（完整 Rewrite Package）**：
- 标题 + 基本信息（视角、平台、版本、生成时间）
- 改前 GEO 评分总览
- 改后 GEO 评分总览
- 改写正文
- FAQ
- Schema 建议
- 优化策略
- 待补充来源
- 待补充事实建议
- 前后对比摘要

响应：文件下载（Content-Disposition: attachment）

---

## 12. 数据表草案

> 后端按这个建表。用 SQLAlchemy，P0 SQLite，但字段按 PostgreSQL 兼容设计。

### 12.1 projects

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String (UUID) | PK | 主键 |
| name | String(100) | NOT NULL | 项目名称 |
| description | Text | | 项目描述 |
| brand_name | String(100) | | 品牌名称（默认） |
| default_perspective | String(50) | DEFAULT '第三方' | 默认视角 |
| default_platform | String(50) | DEFAULT '官网文章' | 默认平台 |
| created_at | DateTime | NOT NULL DEFAULT now() | 创建时间 |
| updated_at | DateTime | NOT NULL DEFAULT now() | 更新时间 |

### 12.2 brand_facts

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String (UUID) | PK | 主键 |
| project_id | String (UUID) | FK → projects.id, NOT NULL | 所属项目 |
| fact_type | String(20) | NOT NULL | 类型：brand/product/case/certification/data/other |
| title | String(200) | NOT NULL | 事实标题 |
| content | Text | NOT NULL | 事实内容 |
| source_type | String(20) | | 来源类型：official/third_party_report/user_review/internal_data/public_data/unspecified |
| source_url | String(500) | | 来源链接 |
| evidence_level | String(20) | | 证据等级：conclusive/strong/moderate/weak/anecdotal |
| tags | String (JSON array) | | 标签数组（SQLite 用 TEXT 存 JSON 字符串，PostgreSQL 用 ARRAY） |
| is_active | Boolean | NOT NULL DEFAULT true | 是否启用 |
| created_at | DateTime | NOT NULL DEFAULT now() | |
| updated_at | DateTime | NOT NULL DEFAULT now() | |

索引：`project_id`、`fact_type`、`title`（模糊搜索）

### 12.3 rewrite_tasks

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String (UUID) | PK | 主键 |
| project_id | String (UUID) | FK → projects.id, NOT NULL | 所属项目 |
| title | String(200) | NOT NULL | 任务标题 |
| original_content | Text | NOT NULL | 原文（Markdown） |
| article_type | String(50) | | 文章类型 |
| perspective | String(20) | NOT NULL DEFAULT '第三方' | 视角 |
| publish_platform | String(20) | NOT NULL DEFAULT '官网文章' | 发布平台 |
| target_audience | String(200) | | 目标受众 |
| source_policy | String(30) | NOT NULL DEFAULT 'mark_missing_sources' | 来源策略 |
| output_length | String(20) | NOT NULL DEFAULT 'standard' | 输出长度 |
| need_schema | Boolean | NOT NULL DEFAULT true | 是否生成 Schema |
| brand_fact_ids | String (JSON array) | | 关联的品牌事实 ID 列表 |
| status | String(20) | NOT NULL DEFAULT 'pending' | 状态：pending/running/completed/failed |
| error_message | Text | | 错误信息 |
| created_at | DateTime | NOT NULL DEFAULT now() | |
| updated_at | DateTime | NOT NULL DEFAULT now() | |

索引：`project_id`、`status`、`created_at`

### 12.4 rewrite_outputs

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String (UUID) | PK | 主键 |
| task_id | String (UUID) | FK → rewrite_tasks.id, NOT NULL | 任务 ID |
| version | Integer | NOT NULL DEFAULT 1 | 版本号 |
| parent_version_id | String (UUID) | FK → rewrite_outputs.id | 父版本 ID |
| title | String(200) | | 改写后标题 |
| final_article | Text | NOT NULL | 改写后正文 |
| faq_content | Text | | FAQ 内容 |
| schema_suggestions | Text (JSON) | | Schema 建议（JSON 字符串） |
| optimization_strategy | Text (JSON) | | 优化策略（JSON 数组字符串） |
| comparison_summary | Text | | 前后对比摘要 |
| missing_sources | Text (JSON array) | | 待补充来源（JSON 数组字符串） |
| missing_facts | Text (JSON array) | | 待补充事实建议（JSON 数组字符串，每项含 title/fact_type/content/reason） |
| review_status | String(20) | | 审核状态：ready/review/needs_material/exported |
| raw_response | Text | | LLM 原始响应（调试用） |
| created_at | DateTime | NOT NULL DEFAULT now() | |

索引：`task_id`、`version`

唯一约束：`(task_id, version)`

### 12.5 content_scores

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String (UUID) | PK | 主键 |
| output_id | String (UUID) | FK → rewrite_outputs.id, NOT NULL | 结果 ID |
| score_type | String(10) | NOT NULL | 类型：before/after |
| overall | Integer | NOT NULL | 总分 0-100 |
| factual_density | Integer | NOT NULL | 事实密度 |
| structural_clarity | Integer | NOT NULL | 结构清晰度 |
| entity_consistency | Integer | NOT NULL | 实体一致性 |
| source_authority | Integer | NOT NULL | 来源权威性 |
| ai_trigger_coverage | Integer | NOT NULL | AI 触发覆盖 |
| schema_readiness | Integer | NOT NULL | Schema 就绪度 |
| dimension_comments | Text (JSON) | | 各维度诊断说明（JSON） |
| raw_markdown | Text | | 评分 Markdown 原文 |
| created_at | DateTime | NOT NULL DEFAULT now() | |

索引：`output_id`、`score_type`

### 12.6 llm_call_logs

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String (UUID) | PK | 主键 |
| task_id | String (UUID) | FK → rewrite_tasks.id | 关联任务 |
| output_id | String (UUID) | FK → rewrite_outputs.id | 关联结果 |
| model_name | String(50) | NOT NULL | 模型名称 |
| provider | String(20) | NOT NULL | Provider: openai/deepseek/qwen/doubao |
| prompt_type | String(20) | NOT NULL | 调用类型：score/rewrite/faq/schema/quality |
| prompt_tokens | Integer | NOT NULL DEFAULT 0 | 输入 token |
| completion_tokens | Integer | NOT NULL DEFAULT 0 | 输出 token |
| total_tokens | Integer | NOT NULL DEFAULT 0 | 总 token |
| cost_usd | Float | | 预估成本（美元） |
| latency_ms | Integer | | 耗时（毫秒） |
| success | Boolean | NOT NULL DEFAULT true | 是否成功 |
| error_message | Text | | 错误信息 |
| created_at | DateTime | NOT NULL DEFAULT now() | |

索引：`task_id`、`provider`、`created_at`

---

## 13. 验收标准

### 13.1 P0 整体验收

**通过标准**：
1. ✅ 项目 CRUD 完整
2. ✅ 品牌事实库 CRUD + 筛选 + 搜索
3. ✅ 可以创建改写任务
4. ✅ 任务能正常完成（调用 LLM 并返回结果）
5. ✅ 结果页展示：正文 + FAQ + Schema + 评分（改前改后）+ 优化策略 + 待补充来源
6. ✅ 6 维 Scorecard 雷达图可视化
7. ✅ 历史任务列表可查看
8. ✅ Markdown 导出功能正常
9. ✅ 所有 LLM 调用走统一 LLMService
10. ✅ Prompt 文件化（5 个文件）
11. ✅ 只开放 4 个平台
12. ✅ 没有做「不做范围」里的任何功能
13. ✅ 没有泄露 API Key / Token

### 13.2 各窗口验收

| 窗口 | 交付物 | 验收人 |
|------|--------|--------|
| 后端 | 可运行的 FastAPI 服务 + API 文档 | QA + 总控 |
| 前端 | 可运行的 React 应用 + 5 个页面 | QA + 总控 |
| Prompt | 5 个 Prompt 文件 + references | QA + 总控 |
| QA | QA 报告 + Bug 清单 | 总控 |

---

## 14. 风险清单

| 风险 | 等级 | 影响 | 应对策略 |
|------|------|------|----------|
| **LLM JSON 输出不稳定** | 高 | 解析失败导致任务失败 | 1. 使用 JSON Mode / Function Calling；2. 增加输出校验 + 重试；3. 失败有明确错误信息 |
| **改写耗时长，用户体验差** | 中 | 等待焦虑 | 1. P0 轮询 + loading 状态；2. 2 次调用比 8 次快很多；3. 显示进度（第 1 步/第 2 步） |
| **Prompt 效果不如原 Skill** | 中 | 改写质量下降 | 1. 拆分时保持核心规则完整；2. 充分测试对比；3. 预留 Prompt 快速调整能力（改文件就行） |
| **前后端进度不同步** | 中 | 联调困难 | 1. 先定接口契约（本文档第 11 节）；2. 前端可以用 mock 先开发；3. 每天同步进度 |
| **功能膨胀** | 高 | P0 做不完 | 1. 每个窗口严格对照「不做范围」；2. QA 重点检查边界；3. 任何新增需求找总控审批 |
| **SQLite → PostgreSQL 迁移坑** | 低 | 后期迁移麻烦 | 1. 一开始就按 PG 兼容写；2. 用 Alembic 管理迁移；3. 避免 SQLite 特有语法 |
| **品牌事实注入超限** | 中 | Context 太长 | 1. P0 限制单次关联事实数量（如最多 20 条）；2. 按标签相关性排序选最相关的；3. 后期上向量检索 |
| **API Key 泄露** | 高 | 安全事故 | 1. .env.example 不写真实 key；2. 后端从环境变量读；3. .gitignore 排除 .env |

---

## 附录：状态追踪

| 任务 | 负责人 | 状态 | 备注 |
|------|--------|------|------|
| 总控文档输出 | MC | ✅ 完成 | 本文档 |
| Prompt 窗口启动 | PR | ⏳ 待启动 | |
| 后端窗口启动 | BE | ⏳ 待启动 | |
| 前端窗口启动 | FE | ⏳ 待启动 | |
| QA 审查 | QA | ⏳ 待启动 | |

---

> 本文档为 P0 总控基线。任何范围变更必须经过总控审批并更新本文档。
