# 工作台命名与 CTA 清理 报告

> **报告版本**：v1.0
> **执行日期**：2026-06-27
> **范围**：`/projects` 工作台启动台的命名、信息层级、CTA 重复、卡片类型展示
> **基线**：不改后端 / 数据库 / LLMService / RewriteService / Prompt / 多平台任务逻辑

---

## 1. 修改了哪些文件

本轮共修改 **5 个前端文件**，零后端改动：

| 文件 | 修改性质 | 说明 |
|------|----------|------|
| [frontend/src/pages/ProjectListPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/ProjectListPage.tsx) | 文案 + 结构 | TopBar 标题/CTA、H1、副标题、搜索占位、列表标题、计数、删除重复大按钮 |
| [frontend/src/components/layout/Sidebar.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/layout/Sidebar.tsx) | 文案 | 主入口「工作区」→「工作台」；切换弹窗「全部工作区」→「全部」、「新建工作区」→「创建工作区」 |
| [frontend/src/components/projects/ProjectCard.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/projects/ProjectCard.tsx) | 文案 | 卡片 CTA「进入工作区」→「进入」；aria-label 同步精简；注释兜底类型更新 |
| [frontend/src/common/workspace.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/common/workspace.ts) | 文案 | `getWorkspaceMeta` 兜底 `shortLabel`/`label`/`eyebrow`：`工作区` → `通用` |
| [frontend/src/components/projects/WorkspaceFormDialog.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/projects/WorkspaceFormDialog.tsx) | 文案 | 弹窗标题「新建工作区」→「创建工作区」；组件 JSDoc 同步 |
| [frontend/src/App.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/App.tsx) | 注释 | LandingRedirect 与路由表注释「工作区启动台」→「工作台」（非用户可见，保持文档一致） |

---

## 2. 哪些重复文案被删除

本轮清理前，`/projects` 页面同一视野内出现 **7 处「工作区」字样**，造成信息层级混乱：

| # | 位置 | 清理前 | 清理后 | 状态 |
|---|------|--------|--------|------|
| 1 | Sidebar 菜单入口 | 工作区 | 工作台 | 已改 |
| 2 | TopBar 标题 | 工作区 | 工作台 | 已改 |
| 3 | 页面 H1 | 工作区启动台 | 选择工作区 | 已改 |
| 4 | 页面副标题 | 选择已有工作区，或创建一个新的内容知识库。为品牌、专业机构、自媒体账号或客户创建独立知识库，并生成多平台发稿包。 | 选择已有工作区，或创建一个新的内容知识库。 | 已精简（删除冗余后半句） |
| 5 | 列表标题 | 全部工作区 / {类型} 工作区 | 全部 / {类型} | 已改 |
| 6 | 计数文案 | N 个工作区 | 共 N 个 | 已改 |
| 7 | 卡片徽标（未知类型） | 工作区 | 通用 | 已改（兜底 meta） |
| 8 | 卡片 CTA | 进入工作区 | 进入 | 已改 |
| 9 | 创建弹窗标题 | 新建工作区 | 创建工作区 | 已改 |
| 10 | Sidebar 切换弹窗列表标题 | 全部工作区 | 全部 | 已改 |
| 11 | Sidebar 切换弹窗底部按钮 | 新建工作区 | 创建工作区 | 已改 |

---

## 3. CTA 重复问题如何解决

### 3.1 清理前的重复

`/projects` 页面**同时存在两个「新建工作区」按钮**：

1. **TopBar 右上角**：`<Button size="sm">新建工作区</Button>`（始终可见）
2. **页面主体右侧**：`<Button size="lg">新建工作区</Button>`（`hidden sm:inline-flex`，桌面端可见）

两处按钮文案完全相同、触发同一个 `openCreate`，造成主 CTA 不聚焦。

### 3.2 解决方案

采用规范建议的「TopBar 渲染按钮，页面主体不渲染」方案：

- **保留**：TopBar `actions` 内的「创建工作区」按钮（`size="sm"`，始终可见，移动端也能触达）
- **删除**：页面 Hero 区右侧的 `<Button size="lg">` 整块（含其外层 `flex items-start justify-between` 容器简化为单列）
- **统一文案**：两处原本都叫「新建工作区」，现统一为「创建工作区」（与创建弹窗标题、Sidebar 切换弹窗按钮、空状态 CTA「创建第一个工作区」用词一致）

### 3.3 清理后

`/projects` 页面**只有一个主 CTA**：TopBar 右上角「创建工作区」。

页面主体 Hero 区回归「标题 + 副标题」纯信息结构，不再承担动作入口，信息层级清晰：

```
TopBar
  工作台                                      [创建工作区]   ← 唯一主 CTA

Main
  选择工作区                                                 ← H1
  选择已有工作区，或创建一个新的内容知识库。                  ← 副标题
```

### 3.4 其他 CTA 入口（非 `/projects` 页面，保持一致）

| 入口 | 文案 | 触发 | 位置 |
|------|------|------|------|
| Sidebar 切换弹窗底部 | 创建工作区 | `handleOpenCreate` → 打开 `WorkspaceFormDialog` | 工作区 Mode 下 Sidebar 顶部卡片「切换」 |
| 空状态 CTA | 创建第一个工作区 | `openCreate` | `/projects` 无工作区时 |
| 创建弹窗第二步底部 | 创建工作区 | `handleCreate` | 弹窗内 |

所有 CTA 用词统一为「创建工作区」，不再出现「新建」与「创建」混用。

---

## 4. Sidebar 文案如何调整

### 4.1 主入口（导航菜单项）

| 状态 | 清理前 | 清理后 |
|------|--------|--------|
| Workspace Mode（已选工作区） | 工作区 | 工作台 |
| Global Mode（未选工作区） | 工作区 | 工作台 |

图标 `Boxes` 保持不变。点击仍跳转 `/projects`。

「工作台」表达「回到启动台」语义，不再与页面 H1「选择工作区」、TopBar「工作台」重复表达「工作区」概念。

### 4.2 切换工作区弹窗（WorkspaceSwitcherDialog）

| 元素 | 清理前 | 清理后 |
|------|--------|--------|
| 列表标题（无搜索时） | 全部工作区 | 全部 |
| 底部创建按钮 | 新建工作区 | 创建工作区 |
| JSDoc 注释 | 全部工作区 / 新建工作区 | 全部 / 创建工作区 |

### 4.3 未选择工作区状态

Sidebar 顶部卡片「选择工作区」提示文案保留不变（已符合规范）：

```
选择工作区
进入一个工作区后，可维护知识库、导入素材并生成发稿包。
```

未选择工作区时，Sidebar 不显示「工作区概览 / 知识库 / 素材箱 / 生成发稿包」四项能力入口——此行为在上一阶段已实现，本轮保持不变。

---

## 5. 工作区卡片徽标如何调整

### 5.1 调整前

`ProjectCard` 顶部 Badge 显示 `meta.shortLabel`，由 `useWorkspaceType` hook 解析 `workspace_type`（localStorage）得到。

已知类型显示正确（品牌 / 专业服务 / 自媒体 / 服务商），但**未知类型**（localStorage 丢失 / 旧数据未写入）走 `getWorkspaceMeta(null)` 兜底，原兜底 `shortLabel: '工作区'`，导致徽标显示「工作区」——这没有信息价值，且与页面其他「工作区」字样叠加重复。

### 5.2 调整后

修改 [common/workspace.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/common/workspace.ts) 的 `getWorkspaceMeta` 兜底返回值：

| 字段 | 调整前 | 调整后 |
|------|--------|--------|
| `label` | 工作区 | 通用 |
| `shortLabel` | 工作区 | 通用 |
| `eyebrow` | 工作区 | 通用 |

### 5.3 最终类型徽标映射

| `workspace_type` | 徽标显示 |
|------------------|----------|
| `brand` | 品牌 |
| `professional` | 专业服务 |
| `media` | 自媒体 |
| `agency` | 服务商 |
| 未知 / null / localStorage 丢失 | 通用 |

徽标不再出现「工作区」字样。

### 5.4 卡片 CTA

| 调整前 | 调整后 |
|--------|--------|
| 进入工作区 | 进入 |

- 视觉 CTA：`进入` + `→` 箭头（`ArrowRight` 图标保留，hover 时 `translate-x-0.5` 微动效不变）
- `aria-label`：`进入工作区 ${project.name}` → `进入 ${project.name}`（无障碍标签同步精简）
- 整卡可点击进入 `/projects/:projectId` 的行为不变

---

## 6. 是否改了后端 API

**否。**

本轮零后端改动。未触碰：
- `backend/app/api/` 任何路由
- `backend/app/services/` 任何服务
- `backend/app/models/` 任何模型
- `backend/app/prompts/` 任何 Prompt

所有修改集中在前端 `frontend/src/` 下的 5 个文件（+ 1 个注释文件 App.tsx）。

---

## 7. 是否改了数据库

**否。**

未触碰 6 张核心数据表（`projects` / `brand_facts` / `rewrite_tasks` / `rewrite_outputs` / `content_scores` / `llm_call_logs`）。

`workspace_type` 仍存 localStorage，存储方式不变。`getWorkspaceMeta` 兜底文案调整是纯前端常量变更，不影响任何持久化数据。

---

## 8. 是否影响工作区创建

**否。**

工作区创建链路完全不变：

- 入口：TopBar「创建工作区」按钮 → `setDialogOpen(true)` → 打开 `WorkspaceFormDialog`
- 弹窗第一步：选择类型（`你主要为谁生成内容？`）—— 文案与卡片保持不变
- 弹窗第二步：动态表单 —— 字段、校验、`useCreateProject` 调用不变
- 创建成功后：`setWorkspaceType` 写 localStorage + `brandFactApi.create` 批量初始化知识条目 + 跳转 `/projects/:id` —— 全部不变

唯一变更：弹窗标题「新建工作区」→「创建工作区」（纯文案，不影响逻辑）。

---

## 9. 是否影响多平台发稿包

**否。**

多平台发稿包链路完全不变：

- `NewRewritePage.tsx` 未修改
- `MultiPlatformResultPage.tsx` 未修改
- `rewriteTaskApi.create` 调用方式不变
- `RewriteService` / `LLMService` / `ScoringService` 未触碰
- 多平台任务生成逻辑（官网 Schema / 自媒体 PlatformPublishGuide / 小红书图文脚本）不变

`RewriteResultPage.tsx` 中的「进入工作区」按钮（History Result Mode 下返回工作区的导航按钮）**保持不变**——它不在 `/projects` 启动台页面范围内，是结果页的上下文按钮，本轮不处理。

---

## 10. 验收结果

### 10.1 功能验收（对照规范第 10 节）

| # | 验收项 | 结果 |
|---|--------|------|
| 1 | `/projects` 页面不再同时出现两个「新建工作区 / 创建工作区」按钮 | ✅ 通过（删除页面主体大按钮，仅保留 TopBar 按钮） |
| 2 | 页面 H1 显示「选择工作区」，不是「工作区启动台」 | ✅ 通过 |
| 3 | TopBar 不再和 H1 重复表达「工作区启动台」 | ✅ 通过（TopBar「工作台」+ H1「选择工作区」，语义分层） |
| 4 | Sidebar 主入口显示「工作台」，不再叫「工作区」 | ✅ 通过（Workspace Mode 与 Global Mode 均已改） |
| 5 | 卡片徽标显示类型（品牌/专业服务/自媒体/服务商/通用），不再显示「工作区」 | ✅ 通过（含兜底 `通用`） |
| 6 | 卡片 CTA 改为「进入 →」，不是「进入工作区」 | ✅ 通过 |
| 7 | 列表标题改为「全部」，不再叫「全部工作区」 | ✅ 通过（筛选时显示类型名，如「品牌」） |
| 8 | 数量文案显示「共 N 个」，不重复「工作区」 | ✅ 通过 |
| 9 | 创建弹窗标题统一为「创建工作区」，不出现「新建项目」 | ✅ 通过 |
| 10 | 未选择工作区时 Sidebar 不显示当前工作区能力入口 | ✅ 通过（上一阶段已实现，本轮保持） |
| 11 | 进入工作区后 Workspace Mode 仍正常显示四项能力入口 | ✅ 通过（Sidebar groups 结构未改） |
| 12 | 多平台发稿包功能不受影响 | ✅ 通过（相关文件未触碰） |

### 10.2 工程验收

| # | 验收项 | 结果 |
|---|--------|------|
| 13 | `npm run build` 通过 | ✅ 通过（`✓ built in 3.09s`，exit 0） |
| 14 | `npx tsc --noEmit` 通过 | ✅ 通过（exit 0，无类型错误） |

### 10.3 边界验收

| # | 验收项 | 结果 |
|---|--------|------|
| B1 | 未新增/修改后端 `.py` 文件 | ✅ |
| B2 | 未修改数据库表 schema | ✅ |
| B3 | 未修改 `rewrite_service.py` / `llm_service.py` | ✅ |
| B4 | 未修改 `NewRewritePage.tsx` / `MultiPlatformResultPage.tsx` | ✅ |
| B5 | 未修改 `RewriteResultPage.tsx`（其「进入工作区」按钮属结果页上下文，不在本轮范围） | ✅ |
| B6 | 未新增 npm 依赖 | ✅ |

---

## 11. 仍存在的问题

### 11.1 已知但本轮不处理（超出范围）

| 编号 | 问题 | 说明 | 建议 |
|------|------|------|------|
| P1 | `RewriteResultPage.tsx` History Result Mode 仍有「进入工作区」按钮 | 该按钮用于从全局历史结果页返回所属工作区，是结果页上下文动作，不在 `/projects` 启动台范围。规范未要求修改此处。 | 后续若做结果页命名统一，可改为「返回工作区」或保持现状。 |
| P2 | `App.tsx` 路由注释仍含英文 `Workspace Launcher` | 注释非用户可见，保留英文便于开发者对照架构文档。 | 无需处理。 |
| P3 | Sidebar 切换弹窗「暂无工作区」「未找到匹配的工作区」等空状态文案含「工作区」 | 这些是上下文描述性文案（描述搜索/列表状态），并非页面标题重复，保留有助于语义清晰。 | 无需处理。 |
| P4 | 工作区概览页（`/projects/:id`）的 eyebrow 可能仍显示「品牌工作区」「专业服务工作区」等 | 概览页不在本轮范围（本轮仅 `/projects` 启动台）。`eyebrow` 字段来自 `WORKSPACE_TYPES` 配置，未修改。 | 若后续要做全局命名统一，可单独评估概览页 eyebrow。 |

### 11.2 无遗留阻塞问题

本轮所有验收项（功能 12 项 + 工程 2 项 + 边界 6 项）全部通过，无阻塞问题。

---

## 12. 改动摘要（Diff 视角）

```
frontend/src/
├── App.tsx                                          [注释] 工作区启动台 → 工作台（2 处）
├── common/
│   └── workspace.ts                                 [文案] 兜底 meta：工作区 → 通用（3 字段）
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx                              [文案] 主入口 + 切换弹窗（4 处文案 + 2 处注释）
│   └── projects/
│       ├── ProjectCard.tsx                          [文案] CTA + aria-label + 注释（3 处）
│       └── WorkspaceFormDialog.tsx                  [文案] 弹窗标题 + JSDoc（2 处）
└── pages/
    └── ProjectListPage.tsx                          [文案+结构] TopBar/H1/副标题/搜索/列表/计数 + 删除重复大按钮

后端：零改动
数据库：零改动
```

---

> 本轮清理完成。`/projects` 启动台现在只有一个主 CTA、一个清晰 H1、一套类型化徽标，信息层级与命名重复问题已收敛。
