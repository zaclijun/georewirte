# Project Workspace Navigation 改造报告

本轮目标：把产品从「先选项目才能解锁菜单」的传统后台，改造为 Project Workspace 风格——项目不是普通页面，而是整个 Workspace 的上下文。

## 一、修改文件清单

### 新增
| 文件 | 用途 |
| --- | --- |
| `frontend/src/pages/ProjectOverviewPage.tsx` | 项目概览页（Workspace 首页） |
| `frontend/src/lib/projectContext.ts` | projectId 上下文工具（URL 解析 + localStorage 记忆） |
| `project-workspace-navigation-report.md` | 本报告 |

### 修改
| 文件 | 改动要点 |
| --- | --- |
| `frontend/src/App.tsx` | 新增 `/projects/:projectId` 路由；`/` 改为 `LandingRedirect`（按 lastActiveProjectId 智能跳转） |
| `frontend/src/pages/index.ts` | 导出 `ProjectOverviewPage` |
| `frontend/src/components/layout/Sidebar.tsx` | 重写为 Workspace 风格：当前项目上下文卡片 + 三段分组；移除 disabled 灰显逻辑，统一改为引导跳转 |
| `frontend/src/components/layout/AppShell.tsx` | 在顶层调用 `useCurrentProjectId()`，自动同步 URL projectId → localStorage |
| `frontend/src/components/projects/ProjectCard.tsx` | 「进入项目」CTA 跳 `/projects/:projectId`（不再直接跳 facts） |
| `frontend/src/pages/ProjectListPage.tsx` | 空状态升级为 EmptyState；新增 `?reason=no_project` 引导提示横幅 |
| `frontend/src/pages/BrandFactsPage.tsx` | 面包屑跳项目概览页（不再跳 /projects） |
| `frontend/src/pages/NewRewritePage.tsx` | 面包屑跳项目概览页（不再跳 facts） |

## 二、新增页面

### ProjectOverviewPage（`/projects/:projectId`）
- **顶部标题区**：品牌名 eyebrow + 项目名 + 描述 + 最近更新时间
- **快捷入口卡片**（3 列）：
  - 品牌事实库 → `/projects/:projectId/facts`
  - 新建改写 → `/projects/:projectId/rewrite/new`
  - 历史任务 → `/history`
- **最近任务区**：取 `useRewriteTasks(projectId)` 前 5 条；空状态文案「还没有生成记录，先创建一篇多平台发稿包。」
- **异常态**：项目不存在时显示 EmptyState + 返回项目列表 CTA

## 三、Sidebar 逻辑变化

### 视觉结构
```
Brand 区（GEO 工作台）
─────
当前项目上下文卡片
  - 有 projectId：当前项目 / 项目名 + 切换
  - 无 projectId：未选择项目 / 请选择一个项目开始
─────
工作台
  - 项目（永远可用，跳 /projects）
当前项目
  - 项目概览 → /projects/:projectId
  - 品牌事实库 → /projects/:projectId/facts
  - 新建改写 → /projects/:projectId/rewrite/new
全局
  - 历史任务 → /history
─────
Enterprise 卡片
```

### 子菜单点击逻辑（关键变化）
- **有 projectId**：跳对应项目子路径
- **无 projectId**：跳 `/projects?reason=no_project`，由 ProjectListPage 顶部显示引导横幅「请先选择或创建一个项目，再使用品牌事实库与新建改写。」（方案一）

### 移除的能力
- 移除原 disabled 灰显（cursor-not-allowed）逻辑——用户行为更明确，不再有「菜单为什么点不动」的困惑
- 移除 title="请先选择项目" 提示，改为可见的引导横幅

## 四、项目点击后跳转逻辑变化

| 入口 | 旧行为 | 新行为 |
| --- | --- | --- |
| ProjectCard「进入项目」 | `/projects/:id/facts`（直接进事实库） | `/projects/:id`（项目概览页） |
| BrandFactsPage 面包屑 | ← 项目 → `/projects` | ← {项目名} → `/projects/:projectId` |
| NewRewritePage 面包屑 | ← {项目名} → `/projects/:projectId/facts` | ← {项目名} → `/projects/:projectId` |
| 应用根路径 `/` | 重定向到 `/projects` | LandingRedirect：有 lastActiveProjectId → `/projects/:lastId`，否则 `/projects` |

## 五、lastActiveProjectId 记忆机制

- `lib/projectContext.ts` 提供：
  - `parseProjectIdFromPath(pathname)`：从 URL 解析 projectId
  - `getLastActiveProjectId()` / `setLastActiveProjectId(id)` / `clearLastActiveProjectId()`：localStorage 读写
  - `useCurrentProjectId()`：React Hook，URL 含 projectId 时自动同步到 localStorage
- `AppShell` 顶层调用 `useCurrentProjectId()`，所有使用 AppShell 的页面都自动同步
- `App.tsx` 的 `LandingRedirect` 读取 localStorage 决定首跳目标
- 仅前端 localStorage，**未新增任何后端字段、API**

## 六、ProjectListPage 空状态

旧：
```
还没有项目，点击右上角「新建项目」开始
```

新（EmptyState 组件）：
- 标题：还没有项目
- 描述：创建一个项目后，你可以维护品牌事实库，并生成官网、公众号、小红书、知乎多平台发稿包。
- 按钮：创建第一个项目

## 七、合规检查

| 项 | 是否改动 |
| --- | --- |
| 后端 API | ❌ 未改 |
| 数据库 | ❌ 未改 |
| Prompt | ❌ 未改 |
| LLMService | ❌ 未改 |
| RewriteService | ❌ 未改 |
| 多平台任务创建逻辑 | ❌ 未改 |
| MultiPlatformResultPage 核心逻辑 | ❌ 未改 |
| Export 逻辑 | ❌ 未改 |
| AppShell 大结构 | ❌ 未改（仅新增一行 hook 调用） |
| TopBar 大结构 | ❌ 未改 |
| Layout token | ❌ 未改 |

## 八、验收结果

| # | 验收项 | 结果 |
| --- | --- | --- |
| 1 | 打开 `/projects` 能看到项目列表 | ✅ |
| 2 | 点击一个项目，进入 `/projects/:projectId` 项目概览页 | ✅ |
| 3 | 在项目概览页点击「品牌事实库」，进入 `/projects/:projectId/facts` | ✅ |
| 4 | 在项目概览页点击「新建改写」，进入 `/projects/:projectId/rewrite/new` | ✅ |
| 5 | 在 `/facts` 页面，Sidebar 仍显示当前项目名称 | ✅（Sidebar 内 useProject 拉详情） |
| 6 | 在 `/rewrite/new` 页面，Sidebar 仍显示当前项目名称 | ✅ |
| 7 | 当前无 projectId 时，点击 Sidebar 项目内入口引导用户选择项目 | ✅（跳 `/projects?reason=no_project` 显示横幅） |
| 8 | localStorage 记住 lastActiveProjectId | ✅（AppShell 同步 + LandingRedirect 读取） |
| 9 | `npm run build` 通过 | ✅（exit 0，构建产物 ~995KB） |
| 10 | `npx tsc --noEmit` 通过 | ✅（exit 0） |

## 九、仍存在的问题

1. **Sidebar `useProject` 在 /projects 列表页会发起一次空查询**
   `useProject(projectId)` 在 projectId 为 undefined 时不会启用（`enabled: !!projectId`），无网络请求。但当用户在 /projects 页面且 localStorage 有 lastActiveProjectId 时，Sidebar 顶部仍显示「未选择项目」——因为 Sidebar props.projectId 为空。这是预期行为（用户主动进入项目列表，不应被自动绑回 lastActive），如需改进可在 ProjectListPage 中读取 lastActiveProjectId 并传给 AppShell。

2. **`?reason=no_project` 引导横幅需用户手动关闭**
   未引入 toast 系统（P0 不引入新依赖），改用页面内横幅 + 关闭按钮，符合「无新依赖、不重构 Layout」约束。

3. **项目概览页最近任务列表依赖现有 `useRewriteTasks`**
   后端任务列表默认按 `created_at` 降序时取前 5 条；若后端排序变化，最近任务顺序可能与预期不符。未新增 API，仅复用现有接口。

4. **多平台结果页 `MultiPlatformResultPage` 与 `RewriteResultPage` 未传 projectId 给 AppShell**
   这两个页面使用 `hideSidebar`（结果页满屏场景），不影响本次 Workspace 体验。后续如需在结果页显示 Sidebar，可再补 projectId 参数。

5. **LandingRedirect 跳 lastActive 时不校验项目是否存在**
   若 lastActiveProjectId 已被删除，会跳到 `/projects/:id` 后由 ProjectOverviewPage 显示「项目不存在」空状态，用户可返回列表。未做主动校验以避免额外 API 调用。
