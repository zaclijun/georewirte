# Workspace Launcher & Workspace Mode UX Refactor 报告

> 本轮目标：重新规划工作区选择与工作区内交互。未选择工作区时只显示 Workspace Launcher；进入某个工作区后才显示 Workspace Mode 的完整导航。
>
> 完成时间：2026-06-26
> 实现范围：纯前端改造，不动后端 API / 数据库 / Prompt 主流程 / 多平台发稿包核心逻辑。

---

## 1. 修改了哪些文件

### 新增文件

| 文件 | 作用 |
| --- | --- |
| `frontend/src/pages/InboxPage.tsx` | 素材箱占位页：未来能力说明 + 当前限制提示 + 单篇生成 CTA |

### 修改文件

| 文件 | 关键变更 |
| --- | --- |
| `frontend/src/App.tsx` | 注册新路由 `/projects/:projectId/inbox`；更新路由表注释为 Workspace Launcher + Workspace Mode |
| `frontend/src/pages/index.ts` | 导出 `InboxPage` |
| `frontend/src/components/layout/Sidebar.tsx` | 重构为双模式：Global Mode（无 projectId 时只显工作区+历史任务）vs Workspace Mode（含素材箱+切换工作区）。新增 `WorkspaceSwitcherDialog`（搜索/最近/全部/新建） |
| `frontend/src/pages/ProjectListPage.tsx` | 改造为 Workspace Launcher：移除 KPI 卡片 / EnterpriseBanner / 蓝色错误提示 / 当前工作区分组；新增搜索框 + 类型筛选 + 主 CTA |
| `frontend/src/pages/ProjectOverviewPage.tsx` | 改造为 Workspace Home：动态 eyebrow + 描述 + 三张行动卡（完善知识库/导入素材/生成发稿包，带状态）+ 新手 Checklist + 最近任务 |
| `frontend/src/components/projects/ProjectCard.tsx` | 简化为启动台卡片：去掉 GEO 分，聚焦任务数+最近更新，整张卡片可点击 |
| `frontend/src/components/layout/EnterpriseCard.tsx` | 弱化样式：低饱和边框、小字号、克制文案，不抢主流程注意力 |

> 共 1 个新增 + 6 个修改 = 7 个前端文件。后端、数据库、Prompt 主流程、多平台任务创建逻辑零改动。

---

## 2. `/projects` 页面如何变化

### 改造前（Dashboard 风格）

- 顶部蓝色错误式「请选择工作区」Banner
- 4 个 KPI 卡片（工作区数 / 任务数 / 平均改后评分 / 待补充来源）
- EnterpriseBanner 大横幅
- Hero 标题「内容治理工作台」
- 工作区卡片网格

### 改造后（Workspace Launcher 风格）

```
[TopBar] 工作区                                    [新建工作区]

工作区启动台
选择已有工作区，或创建一个新的内容知识库。为品牌、专业机构、
自媒体账号或客户创建独立知识库，并生成多平台发稿包。
                                       [新建工作区] (大号 CTA)

[搜索框] 搜索工作区名称 / 品牌 / 账号 / 客户名
[类型筛选 Pills] 全部 / 品牌 / 专业服务 / 自媒体 / 服务商

全部工作区                                    N 个工作区
[工作区卡片网格]
- 类型徽标 + brand_name
- 工作区名 + 一句描述
- 任务数 + 最近更新
- [进入工作区]
```

### 关键差异

| 项目 | 改造前 | 改造后 |
| --- | --- | --- |
| KPI 卡片 | 4 个统计卡 | **移除** |
| Enterprise 大横幅 | 顶部突出展示 | **移除** |
| 蓝色错误提示 | 「请选择工作区」Alert | **移除** |
| 主 CTA | 仅右上角小按钮 | Hero 区右侧 + 右上角双 CTA |
| 搜索 | 无 | 名称/品牌/账号/客户名模糊搜索 |
| 类型筛选 | 无 | 全部/品牌/专业服务/自媒体/服务商 Pills |
| 空状态 | 单一文案 | 区分「完全无工作区」与「筛选无结果」 |
| 工作区卡片 GEO 分 | 显示 | **移除**，聚焦任务数与最近更新 |

---

## 3. 未选择工作区时 Sidebar 如何变化

### 改造前

无论是否选择工作区，Sidebar 始终显示：
- 当前工作区分组
- 工作区概览 / 知识库 / 生成发稿包
- 全局 → 历史任务

未选择工作区时，子菜单跳 `/projects?reason=no_workspace` 触发蓝色 Banner。

### 改造后（Global Mode）

```
GEO 工作台

[选择工作区]
进入一个工作区后，可维护知识库、导入素材并生成发稿包。

工作区
- 工作区

全局
- 历史任务

[Enterprise] (弱化)
```

**关键变化**：
- 不再显示「当前工作区」分组
- 不再显示「工作区概览 / 知识库 / 生成发稿包」入口（无上下文）
- 顶部卡片改为「选择工作区」+ 引导文案，点击进入 `/projects`
- 蓝色 Banner 提示彻底移除，改为自然的启动页引导

---

## 4. 已选择工作区时 Sidebar 如何变化

### 改造后（Workspace Mode）

```
GEO 工作台

┌─────────────────────────────┐
│ 当前工作区                   │
│ {工作区名称}                 │
│ {工作区类型徽标}             │
│ [切换工作区]                 │
└─────────────────────────────┘

工作区
- 工作区

当前工作区
- 工作区概览
- 品牌知识库 / 专业知识库 / 账号知识库 / 客户知识库（动态）
- 素材箱                      ← 新增
- 生成发稿包

全局
- 历史任务

[Enterprise] (弱化)
```

**关键变化**：
- 顶部卡片改为「当前工作区」+ 工作区名 + 类型徽标 + **切换工作区** 按钮
- 子菜单新增「素材箱」入口，路由 `/projects/:projectId/inbox`
- 知识库名称按 workspace_type 动态（品牌/专业/账号/客户知识库）

### 切换工作区 Popover

点击「切换工作区」打开 Dialog：

```
切换工作区
选择一个工作区进入，或新建一个工作区。

[搜索框] 搜索工作区名称 / 品牌 / 账号 / 客户名

最近使用
- 工作区 A (上次使用)    [品牌]
- 工作区 B              [自媒体]
- 工作区 C              [服务商]

全部工作区
- 工作区 A              [品牌]
- 工作区 B              [自媒体]
- ...

+ 新建工作区
```

- 搜索：按 name / brand_name / description 模糊匹配
- 最近使用：基于 `lastActiveProjectId` 推断，置顶 + 其余前 2 个
- 点击工作区跳转 `/projects/:id` 并关闭弹窗
- 「+ 新建工作区」打开 WorkspaceFormDialog

---

## 5. Workspace Home 如何变化

### 改造前

- 标题区：eyebrow + 工作区名 + 描述 + 最近更新
- 三张快捷入口卡片（知识库 / 生成多平台发稿包 / 历史任务）
- 蓝色信息提示条（类型相关 tip）
- 最近任务列表

### 改造后

```
[TopBar] ← 工作区    {工作区名}

{eyebrow}  [类型徽标]
{工作区名}
{动态描述}
最近更新：xxx

下一步行动
┌──────────────┬──────────────┬──────────────┐
│ 第1步        │ 第2步        │ 第3步        │
│ 完善知识库   │ 导入素材     │ 生成发稿包   │
│ 已有N条知识  │ 即将支持批量 │ 已生成N个任务│
│ [进入知识库] │ [打开素材箱] │ [开始生成]   │
└──────────────┴──────────────┴──────────────┘

开始使用                              N / 4
✓ 已创建工作区
□ 完善知识库                     →
□ 导入第一篇素材                →
□ 生成第一个发稿包              →

最近任务                              查看全部
[任务列表 / 空状态]
```

### 关键变化

| 项目 | 改造前 | 改造后 |
| --- | --- | --- |
| 行动卡片 | 3 张静态快捷入口 | 3 张带状态的工作流卡片（第N步 + 已完成/即将支持徽标 + 动态状态） |
| 行动卡状态 | 无 | 知识库（已有 N 条知识）、素材箱（即将支持）、发稿包（已生成 N 个任务） |
| 新手引导 | 无 | 4 步 Checklist（已创建工作区/完善知识库/导入素材/生成发稿包），完成后自动隐藏 |
| 类型提示 | 蓝色信息条 | 移除（融入描述文案） |
| 最近任务空状态 | 「先创建一篇多平台发稿包」 | 「你可以先上传或粘贴一篇母稿」+ 「开始生成」CTA |
| 动态描述 | 通用 tip | 按 workspace_type 显示不同描述（品牌/专业/自媒体/客户） |

### 行动卡状态机

| 卡片 | 状态来源 | done 条件 | disabled |
| --- | --- | --- | --- |
| 完善知识库 | `useBrandFacts(projectId).length` | facts.length > 0 | 否 |
| 导入素材 | 静态 | 永远 false | 是（P0 占位） |
| 生成发稿包 | `useRewriteTasks(projectId).length` | recentTasks.length > 0 | 否 |

---

## 6. 素材箱占位页是否新增

**是，已新增。**

### 路由

`/projects/:projectId/inbox`

### 文件

`frontend/src/pages/InboxPage.tsx`

### 页面结构

```
[TopBar] ← 工作区    素材箱

素材箱
批量导入即将支持
把 Word、PDF、HTML、网页链接或公众号文章整理成可生成的内容素材。

┌──────────────────────────────────────────┐
│ [Inbox Icon]  未来你可以在这里            │
│                                            │
│ • 上传 Word / PDF / HTML / Markdown / TXT │
│ • 粘贴普通网页链接                         │
│ • 粘贴公众号文章链接                       │
│ • 粘贴多篇正文，批量管理                   │
│                                            │
│ 并将素材批量生成官网、公众号、小红书、知乎发稿包。│
└──────────────────────────────────────────┘

⚠ 当前版本暂未开放批量导入与解析能力。
公众号链接可能受访问、授权和版权限制影响。
若无法解析，可改用粘贴正文或上传文件。

┌──────────────────────────────────────────┐
│ 现在就生成内容？                           │
│ 素材箱的批量导入功能正在路上。              │
│ 如果你已有母稿，可直接进入单篇生成页面。    │
│                                            │
│ [先生成单篇发稿包]                         │
└──────────────────────────────────────────┘
```

### Sidebar 高亮

`/projects/:projectId/inbox` 路径下，Sidebar 中「素材箱」菜单项通过 NavLink 自动高亮。

### 本轮未实现（按规范要求）

- 文件上传
- PDF / Word / HTML 解析
- URL 抓取
- 公众号抓取
- 批量任务
- 批量结果矩阵

---

## 7. 是否改了后端 API

**否。**

本轮零后端改动，全部基于现有 API：

| 操作 | 复用的现有 API |
| --- | --- |
| 工作区列表 | `GET /api/projects` |
| 工作区详情 | `GET /api/projects/{id}` |
| 知识库列表 | `GET /api/projects/{id}/brand-facts` |
| 任务列表 | `GET /api/projects/{id}/tasks` |
| 创建工作区 | `POST /api/projects`（WorkspaceFormDialog 复用） |
| 初始化知识条目 | `POST /api/projects/{id}/brand-facts`（WorkspaceFormDialog 复用） |

LLMService、RewriteService、任务状态机、Prompt 主流程均未触碰。

---

## 8. 是否改了数据库

**否。**

- 未新增表
- 未新增字段
- 未新增索引
- 未改 Alembic 迁移

`workspace_type` 仍仅存活于前端 localStorage。本轮所有改造都是 UI 层信息架构与文案调整。

---

## 9. 是否影响多平台发稿包

**否，完全不受影响。**

### 未触碰的代码

- `frontend/src/pages/NewRewritePage.tsx` 中的 `handleSubmit` 多平台分支
- `frontend/src/pages/MultiPlatformResultPage.tsx`
- `frontend/src/components/rewrite/PlatformPublishGuideView.tsx`
- `frontend/src/components/rewrite/RewriteConfigPanel.tsx`
- 后端 RewriteService / LLMService / Prompt 主流程

### 回归保证

- `npm run build` 通过，2869 个模块全部成功转换
- `npx tsc --noEmit` 通过，类型无回归
- 本轮改造仅涉及：Sidebar 导航结构、ProjectListPage 展示层、ProjectOverviewPage 展示层、新增 InboxPage 占位页
- 多平台发稿包链路上的 `rewriteTaskApi.create` / `buildPayload` / `resolveNeedSchema` 等核心逻辑零改动

---

## 10. 验收结果

### A. `/projects` 工作区启动台

| 验收项 | 状态 | 说明 |
| --- | --- | --- |
| 不再显示 KPI 卡片 | ✅ | 4 个 MetricCard 已移除 |
| 不再显示 Enterprise 大横幅 | ✅ | EnterpriseBanner 引用已删除 |
| 不再显示蓝色错误式提示 | ✅ | `?reason=no_workspace` 引导逻辑已移除 |
| 主任务是选择或创建工作区 | ✅ | Hero + 搜索 + 类型筛选 + 卡片网格 |
| 新建工作区按钮明显 | ✅ | Hero 区右侧大号 CTA + 右上角小按钮 |
| 工作区卡片点击进入 /projects/:projectId | ✅ | 整张卡片 + 底部 CTA 双入口 |

### B. 未选择工作区时 Sidebar

| 验收项 | 状态 | 说明 |
| --- | --- | --- |
| 不显示「当前工作区」分组 | ✅ | Global Mode 仅显工作区+历史任务 |
| 不显示「工作区概览 / 知识库 / 生成发稿包」 | ✅ | 子菜单仅在 Workspace Mode 出现 |
| 只显示「工作区」和「历史任务」 | ✅ | groups 数组按 hasProject 切换 |
| 顶部卡片文案是「选择工作区」 | ✅ | 点击进入 `/projects` |

### C. 已选择工作区时 Sidebar

| 验收项 | 状态 | 说明 |
| --- | --- | --- |
| 显示当前工作区名称 | ✅ | CurrentWorkspaceCard 展示 project.name |
| 显示工作区类型徽标 | ✅ | wsMeta.shortLabel |
| 显示工作区概览 | ✅ | `/projects/:id` |
| 显示动态知识库名称 | ✅ | wsMeta.knowledgeBaseName |
| 显示素材箱 | ✅ | `/projects/:id/inbox` 新增 |
| 显示生成发稿包 | ✅ | `/projects/:id/rewrite/new` |
| 显示历史任务 | ✅ | `/history` |
| 「切换工作区」可用 | ✅ | 打开 WorkspaceSwitcherDialog |

### D. Workspace Home

| 验收项 | 状态 | 说明 |
| --- | --- | --- |
| 显示动态工作区类型文案 | ✅ | eyebrow + 描述按 wsType 动态 |
| 显示三张行动卡 | ✅ | 完善知识库 / 导入素材 / 生成发稿包 |
| 点击「完善知识库」进入 /facts | ✅ | ActionCard step=1 |
| 点击「导入素材」进入 /inbox | ✅ | ActionCard step=2 |
| 点击「生成发稿包」进入 /rewrite/new | ✅ | ActionCard step=3 |
| 最近任务仍正常展示 | ✅ | RecentTaskList 复用原逻辑 |

### E. 素材箱占位页

| 验收项 | 状态 | 说明 |
| --- | --- | --- |
| `/projects/:projectId/inbox` 可打开 | ✅ | 路由已注册 |
| 说明未来支持 Word/PDF/HTML/网页/公众号 | ✅ | 4 项列表 |
| 明确当前不做真实解析 | ✅ | 警告卡 + "暂未开放批量导入与解析能力" |
| CTA 可跳转单篇生成页 | ✅ | "先生成单篇发稿包" → /rewrite/new |
| Sidebar 中「素材箱」高亮正确 | ✅ | NavLink 自动 active |

### F. 兼容性

| 验收项 | 状态 | 说明 |
| --- | --- | --- |
| brand 工作区显示品牌知识库 | ✅ | wsMeta.knowledgeBaseName 动态 |
| professional 显示专业知识库 | ✅ | 同上 |
| media 显示账号知识库 | ✅ | 同上 |
| agency 显示客户知识库 | ✅ | 同上 |
| 多平台发稿包生成不受影响 | ✅ | 零核心逻辑改动 |
| npm run build 通过 | ✅ | 3.24s，零错误 |
| npx tsc --noEmit 通过 | ✅ | 零类型错误 |

---

## 11. 仍存在的问题

### 1. WorkspaceSwitcherDialog 类型徽标读取非响应式

Sidebar 内的 `renderRow` 直接 `localStorage.getItem` 读取 workspace_type，未通过 hook 订阅。如果用户在弹窗打开期间通过其他途径修改了 workspace_type，弹窗内的徽标不会实时刷新。

**影响**：极小。用户在切换工作区弹窗中不会修改 workspace_type。

### 2. 素材箱占位页未做真实数据接口

`/projects/:projectId/inbox` 是纯静态页，未读取任何后端数据。未来真实实现时需新增 inbox 素材接口（不属于本轮范围）。

### 3. ProjectListPage 类型筛选依赖 localStorage

`workspaceTypeOf(id)` 直接读 localStorage，未通过 useWorkspaceType hook（因为列表页要遍历所有工作区，hook 不适合循环调用）。这意味着如果 workspace_type 未写入 localStorage（如旧工作区），会被归到「全部」但不属于任何具体类型筛选。

**影响**：旧工作区在「品牌/专业/自媒体/服务商」筛选下不可见，只在「全部」可见。可通过在工作区内重新触发类型写入缓解。

### 4. 新手 Checklist 「导入第一篇素材」永远 false

由于素材箱是占位页，Checklist 中「导入第一篇素材」永远显示为未完成。Checklist 整体永远不会消失（因为 `showChecklist = checklistDoneCount < checklist.length`）。

**缓解**：当素材箱真实功能上线后，此条会自然变为可完成。当前用户可点击跳转到素材箱占位页查看说明。

### 5. Header 右侧「切换工作区」未在各子页面 TopBar 出现

规范第九节建议 `/projects/:projectId` 及子页面 TopBar 右侧显示「切换工作区」。当前各页面 TopBar 右侧已被页面级 actions 占用（如「新增知识」「新建工作区」），未再加「切换工作区」按钮。

**替代方案**：用户可通过 Sidebar 顶部卡片的「切换工作区」按钮随时切换。规范也允许「如果右侧过挤，只保留切换工作区」——但当前选择保留页面级 actions，切换工作区走 Sidebar。

### 6. 切换工作区 Dialog 在工作区数量很多时未做虚拟滚动

当前 `useProjects` 一次性返回全部工作区，前端直接 `map` 渲染。如未来工作区数量超过 100+，可能出现性能问题。

**影响**：P0 阶段单用户工作区数量通常 < 10，无实际影响。

---

## 12. 下一步建议

### P1：素材箱真实功能实现

**优先级：高**

按规范本轮已搭建信息架构与导航位置。P1 阶段可实现：

- 文件上传（Word / PDF / HTML / Markdown / TXT）
- URL 抓取（普通网页）
- 公众号文章链接抓取（受访问/授权限制，需降级策略）
- 粘贴多篇正文批量管理
- 素材 → 多平台发稿包批量生成

需新增后端接口：素材 CRUD、批量任务创建、批量结果矩阵。

### P2：workspace_type 持久化到后端

**优先级：高**

当前 localStorage 方案导致 ProjectListPage 类型筛选、Sidebar 类型徽标在跨设备场景下不准确。建议在 Project 表新增 metadata 字段存储 workspace_type（见上一轮报告 P1 建议）。

### P3：Header 右侧切换工作区快捷入口

**优先级：中**

可在各工作区子页面 TopBar 右侧增加一个轻量「切换工作区」图标按钮（与页面级 actions 并列），让用户不必回到 Sidebar 即可切换。

### P4：新手 Checklist 状态持久化

**优先级：中**

当前 Checklist 状态完全派生自数据（facts.length、tasks.length），不持久化。如果用户完成了所有步骤但希望再次查看引导，无重新打开入口。可考虑：

- 工作区 metadata 增加 `onboarding_dismissed` 字段
- Checklist 卡片增加「关闭」按钮
- 工作区概览页增加「查看新手引导」入口

### P5：WorkspaceSwitcher 性能优化

**优先级：低**

当工作区数量 > 50 时，引入虚拟滚动（如 `@tanstack/react-virtual`）。

### P6：工作区列表分页

**优先级：远期**

`GET /api/projects` 当前返回全量数据。未来如工作区数量增长，需支持分页与按类型服务端筛选。

---

## 附录：本轮关键文件清单

```
frontend/src/pages/InboxPage.tsx                            [新增]
frontend/src/App.tsx                                        [修改]
frontend/src/pages/index.ts                                 [修改]
frontend/src/components/layout/Sidebar.tsx                  [修改]
frontend/src/pages/ProjectListPage.tsx                      [修改]
frontend/src/pages/ProjectOverviewPage.tsx                  [修改]
frontend/src/components/projects/ProjectCard.tsx            [修改]
frontend/src/components/layout/EnterpriseCard.tsx           [修改]
```

**总计**：1 新增 + 7 修改 = 8 个前端文件。零后端改动。零数据库改动。零多平台发稿包逻辑改动。

---

## 验收清单对照

| 验收项 | 状态 | 说明 |
| --- | --- | --- |
| A. /projects 工作区启动台 | ✅ | 去 KPI/Enterprise/蓝色提示，加搜索+类型筛选+主 CTA |
| B. 未选择工作区时 Sidebar | ✅ | Global Mode 仅显工作区+历史任务 |
| C. 已选择工作区时 Sidebar | ✅ | Workspace Mode 含素材箱+切换工作区 |
| D. Workspace Home | ✅ | 三行动卡 + Checklist + 最近任务 |
| E. 素材箱占位页 | ✅ | /projects/:id/inbox 可访问，Sidebar 高亮正确 |
| F.1 brand 工作区兼容 | ✅ | 品牌知识库 |
| F.2 professional 工作区兼容 | ✅ | 专业知识库 |
| F.3 media 工作区兼容 | ✅ | 账号知识库 |
| F.4 agency 工作区兼容 | ✅ | 客户知识库 |
| F.5 多平台发稿包不受影响 | ✅ | 核心逻辑零改动 |
| F.6 npm run build 通过 | ✅ | 3.24s，零错误 |
| F.7 npx tsc --noEmit 通过 | ✅ | 零类型错误 |

**本轮交付完成。**
