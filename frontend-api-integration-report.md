# Frontend API Integration Report（Phase 3）

> 阶段：API Contract Alignment + TanStack Query 接入
> 范围：将 Mock UI 与后端真实接口对齐，封装 axios service、6 个 hooks，替换 5 个页面的 Mock 数据流，接入任务状态轮询与 Markdown 导出。
> 验收：`tsc -b` 0 错误 · dev server 7 条路由全部 200 · 全部页面保留 mock fallback

---

## 一、已接入的 API

全部 22 个端点已在 [services/api.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/services/api.ts) 中封装，路径严格对齐后端契约。

### Project API（5）

| Method | Path | service 方法 |
| --- | --- | --- |
| GET | `/projects` | `projectApi.list()` |
| POST | `/projects` | `projectApi.create(payload)` |
| GET | `/projects/:id` | `projectApi.get(id)` |
| PUT | `/projects/:id` | `projectApi.update(id, payload)` |
| DELETE | `/projects/:id` | `projectApi.remove(id)` |

### BrandFact API（5）

| Method | Path | service 方法 |
| --- | --- | --- |
| GET | `/projects/:projectId/brand-facts` | `brandFactApi.list(projectId)` |
| POST | `/projects/:projectId/brand-facts` | `brandFactApi.create(projectId, payload)` |
| GET | `/brand-facts/:id` | `brandFactApi.get(id)` |
| PUT | `/brand-facts/:id` | `brandFactApi.update(id, payload)` |
| DELETE | `/brand-facts/:id` | `brandFactApi.remove(id)` |

> 已确认使用 `/brand-facts/:id`，未使用 `/facts/:factId`。

### RewriteTask API（7）

| Method | Path | service 方法 |
| --- | --- | --- |
| GET | `/projects/:projectId/tasks` | `rewriteTaskApi.list(projectId, params)` |
| POST | `/projects/:projectId/tasks` | `rewriteTaskApi.create(projectId, payload)` |
| GET | `/tasks/:id` | `rewriteTaskApi.get(id)` |
| PUT | `/tasks/:id` | `rewriteTaskApi.update(id, payload)` |
| DELETE | `/tasks/:id` | `rewriteTaskApi.remove(id)` |
| POST | `/tasks/:id/retry` | `rewriteTaskApi.retry(id)` |
| GET | `/tasks/:id/status` | `rewriteTaskApi.getStatus(id)` |

> 任务列表挂在 project 下，未使用全局 `/tasks` 列表。

### Output API（4）

| Method | Path | service 方法 |
| --- | --- | --- |
| GET | `/tasks/:taskId/outputs` | `outputApi.listByTask(taskId)` |
| GET | `/outputs/:id` | `outputApi.get(outputId)` |
| GET | `/outputs/:id/scores` | `outputApi.getScores(outputId)` |
| POST | `/outputs/:id/regenerate` | `outputApi.regenerate(outputId)` |

> 使用 `/tasks/:taskId/outputs` 复数路径，未使用 `/tasks/:taskId/output` 单数。

### Export API（1）

| Method | Path | service 方法 |
| --- | --- | --- |
| GET | `/outputs/:id/export?format=markdown\|json` | `exportApi.export(outputId, format)` |

> 使用 `GET /outputs/:id/export`，未使用 `POST /tasks/:taskId/export`。

---

## 二、修改过的文件

### 新增文件

| 文件 | 用途 |
| --- | --- |
| [frontend/src/services/api.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/services/api.ts) | axios 实例 + 5 个 API 命名空间 + `ApiError` + `unwrap` |
| [frontend/src/hooks/queryKeys.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/hooks/queryKeys.ts) | TanStack Query key 工厂（projects/brandFacts/tasks/outputs） |
| [frontend/src/hooks/useProjects.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/hooks/useProjects.ts) | 项目 CRUD hooks |
| [frontend/src/hooks/useBrandFacts.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/hooks/useBrandFacts.ts) | 品牌事实 CRUD + toggle hooks |
| [frontend/src/hooks/useRewriteTasks.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/hooks/useRewriteTasks.ts) | 任务 CRUD + retry + list 归一化 |
| [frontend/src/hooks/useTaskStatus.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/hooks/useTaskStatus.ts) | 任务状态 3s 轮询（v5 用 useEffect 替代 onSuccess） |
| [frontend/src/hooks/useRewriteOutput.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/hooks/useRewriteOutput.ts) | outputs 列表 / detail / scores / regenerate + `pickLatestOutput` |
| [frontend/src/hooks/useExport.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/hooks/useExport.ts) | 导出 mutation + 失败 fallback 本地下载 |
| [frontend/src/hooks/index.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/hooks/index.ts) | hooks 统一出口 |
| [frontend/.env.local](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/.env.local) | `VITE_API_BASE_URL=http://localhost:8000/api` |

### 修改文件

| 文件 | 改动摘要 |
| --- | --- |
| [src/pages/ProjectListPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/ProjectListPage.tsx) | 替换 `mockProjects` → `useProjects()`；加 loading skeleton、空态、`isError` fallback |
| [src/pages/BrandFactsPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/BrandFactsPage.tsx) | 接入 `useBrandFacts` / `useProject` / `useCreateBrandFact` / `useUpdateBrandFact` / `useToggleBrandFact`；`FactFormDialog` 通过 props 接收 mutation |
| [src/pages/HistoryPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/HistoryPage.tsx) | 拆分为 `AggregatedTaskTable` → `PerProjectTaskTable` → `TaskTableView`；逐项目拉 `useRewriteTasks`；删除走 `useDeleteTask`；失败 fallback `mockTasks` |
| [src/pages/NewRewritePage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/NewRewritePage.tsx) | 接入 `useProject` / `useBrandFacts` / `useCreateTask`；提交成功跳 `/tasks/:id/result`；错误条 |
| [src/pages/RewriteResultPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/RewriteResultPage.tsx) | 接入 `useTaskDetail` + `useTaskStatus` + `useRewriteOutputs` + `pickLatestOutput` + `useProject` + `useRegenerateOutput`；三态视图（loading / running / result） |
| [src/components/common/ExportButton.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/common/ExportButton.tsx) | 新增 `outputId` / `fallbackContent` / `format` props；优先调 `useExport` → `GET /outputs/:id/export`，失败 fallback 本地下载 |
| [src/vite-env.d.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/vite-env.d.ts) | 声明 `ImportMetaEnv.VITE_API_BASE_URL` |

### 未修改（保持 Phase 2 不变）

- 全部 `src/components/ui/*`（shadcn 原子组件）
- `src/components/layout/*`（AppShell / Sidebar / TopBar）
- `src/components/rewrite/*`（RewriteConfigPanel / ResultInspector / FactSelector）
- `src/components/common/*` 除 ExportButton 外的组件
- `src/types/index.ts` / `src/common/constants.ts` / `src/mock/data.ts` / `src/lib/utils.ts`
- `src/App.tsx` / `src/main.tsx`（`QueryClientProvider` 已在 Phase 2 配置）

---

## 三、hooks 清单

| hook | 文件 | 类型 | invalidate 策略 |
| --- | --- | --- | --- |
| `useProjects()` | useProjects.ts | query | — |
| `useProject(id)` | useProjects.ts | query | — |
| `useCreateProject()` | useProjects.ts | mutation | `projects.list` |
| `useUpdateProject()` | useProjects.ts | mutation | `projects.list` + `projects.detail` |
| `useDeleteProject()` | useProjects.ts | mutation | `projects.all` |
| `useBrandFacts(projectId)` | useBrandFacts.ts | query | — |
| `useCreateBrandFact(projectId)` | useBrandFacts.ts | mutation | `brandFacts.list(projectId)` |
| `useUpdateBrandFact(projectId)` | useBrandFacts.ts | mutation | `brandFacts.list` + `brandFacts.detail` |
| `useToggleBrandFact(projectId)` | useBrandFacts.ts | mutation | `brandFacts.list(projectId)` |
| `useDeleteBrandFact(projectId)` | useBrandFacts.ts | mutation | `brandFacts.list(projectId)` |
| `useRewriteTasks(projectId, params?)` | useRewriteTasks.ts | query | 归一化 `RewriteTask[] \| Paginated<RewriteTask>` → `RewriteTask[]` |
| `useTaskDetail(taskId)` | useRewriteTasks.ts | query | — |
| `useCreateTask(projectId)` | useRewriteTasks.ts | mutation | `tasks.list(projectId)` |
| `useUpdateTask(projectId)` | useRewriteTasks.ts | mutation | `tasks.list` + `tasks.detail` |
| `useRetryTask(projectId)` | useRewriteTasks.ts | mutation | `tasks.list` + `tasks.detail` |
| `useDeleteTask(projectId)` | useRewriteTasks.ts | mutation | `tasks.list(projectId)` |
| `useTaskStatus(taskId, currentStatus)` | useTaskStatus.ts | query | pending/running 每 3s 轮询；进入终态后 invalidate `tasks.detail` + `tasks.all` + `outputs.listByTask` |
| `useRewriteOutputs(taskId, enabled)` | useRewriteOutput.ts | query | — |
| `pickLatestOutput(outputs)` | useRewriteOutput.ts | helper | 按 `version` 降序取最新 |
| `useOutputDetail(outputId)` | useRewriteOutput.ts | query | — |
| `useOutputScores(outputId)` | useRewriteOutput.ts | query | — |
| `useRegenerateOutput(taskId)` | useRewriteOutput.ts | mutation | `outputs.listByTask(taskId)` |
| `useExport({ fallbackContent, fallbackFilename })` | useExport.ts | mutation | 失败时自动用 `fallbackContent` 本地下载 |

**查询键工厂**：[queryKeys.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/hooks/queryKeys.ts) 集中管理 `projects / brandFacts / tasks / outputs` 四组 key，所有 mutation 通过 `qc.invalidateQueries({ queryKey: queryKeys.xxx.all })` 精准失效。

---

## 四、哪些页面已从 mock 切换到真实 API

| 页面 | 路由 | 主数据源 | 写操作 |
| --- | --- | --- | --- |
| [ProjectListPage](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/ProjectListPage.tsx) | `/projects` | `useProjects()` | — |
| [BrandFactsPage](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/BrandFactsPage.tsx) | `/projects/:projectId/facts` | `useProject` + `useBrandFacts` | `useCreateBrandFact` / `useUpdateBrandFact` / `useToggleBrandFact` |
| [NewRewritePage](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/NewRewritePage.tsx) | `/projects/:projectId/rewrite/new` | `useProject` + `useBrandFacts` | `useCreateTask` → 跳 `/tasks/:id/result` |
| [RewriteResultPage](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/RewriteResultPage.tsx) | `/tasks/:taskId/result` | `useTaskDetail` + `useRewriteOutputs` + `useProject` + `useTaskStatus` | `useRegenerateOutput` |
| [HistoryPage](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/HistoryPage.tsx) | `/history` | `useProjects` + 逐项目 `useRewriteTasks` | `useDeleteTask` |

EnterprisePage 仍为静态销售入口，未接 API（Phase 3 范围之外）。

---

## 五、哪些地方仍使用 mock fallback

所有页面统一采用 `data ?? (isError ? mockXxx : [])` 模式，保证后端未启动时 P0 演示可继续：

| 页面 | fallback 来源 | 触发条件 |
| --- | --- | --- |
| ProjectListPage | `mockProjects` | `useProjects` `isError` |
| BrandFactsPage | `mockProjects` / `mockBrandFacts`（按 `project_id` 过滤） | `useProject` / `useBrandFacts` `isError` |
| NewRewritePage | `mockProjects` / `mockBrandFacts`（活跃事实） | `useProject` / `useBrandFacts` `isError` |
| RewriteResultPage | `mockTasks.find(id)` / `mockOutput` | `useTaskDetail` / `useRewriteOutputs` `isError` |
| HistoryPage | `mockProjects` / `mockTasks` | `useProjects` / `useRewriteTasks` `isError` |
| ExportButton | `fallbackContent` 本地下载 | `useExport` mutation `onError` |

> Mock 数据保留在 [src/mock/data.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/mock/data.ts)，作为开发备用与离线兜底，不影响默认走 API。

---

## 六、任务状态轮询是否完成

**已完成。** 实现位于 [useTaskStatus.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/hooks/useTaskStatus.ts)：

- **触发条件**：`taskId` 与 `currentStatus` 都存在，且 `currentStatus ∈ ['pending', 'running']`
- **轮询频率**：`refetchInterval: 3000`（3 秒）
- **停止条件**：`currentStatus ∈ ['completed', 'failed']` 时 `enabled=false` + `refetchInterval=false`
- **终态刷新**：TanStack Query v5 已移除 `useQuery.onSuccess`，改用 `useEffect` 监听 `query.data?.status`，进入终态后 invalidate `tasks.detail(taskId)` + `tasks.all` + `outputs.listByTask(taskId)`，触发结果页自动刷新出 score_before/after、output 正文
- **页面接入**：[RewriteResultPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/RewriteResultPage.tsx#L45) 调用 `useTaskStatus(task?.id, task?.status)`，运行态视图显示「通常需要 30-90 秒。页面会每 3 秒自动刷新」

---

## 七、Markdown 导出是否接入

**已完成。** 分两层实现：

### Hook 层：[useExport.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/hooks/useExport.ts)

```ts
useExport({ fallbackContent, fallbackFilename })
  .mutate({ outputId, format })
```

- 成功：调用 `GET /outputs/:id/export?format=markdown`，拿到 `{ content, filename, mime }`，前端 `downloadText(filename, content, mime)` 下载
- 失败：`onError` 中用 `fallbackContent` 本地下载，文件名取 `fallbackFilename.{md|json}`

### 组件层：[ExportButton.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/common/ExportButton.tsx)

新增 props：

- `outputId?: UUID` — 有则走后端导出
- `fallbackContent?: string` — 后端失败时的兜底正文
- `format?: 'markdown' | 'json'` — 默认 `markdown`

按钮三态：`已导出`（成功 1.8s）→ `导出中…`（loading + 禁用）→ `导出 Markdown`。

### 接入位置

- [RewriteResultPage](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/RewriteResultPage.tsx#L134-L139)：`outputId={output.id} fallbackContent={output.final_article}`
- [HistoryPage](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/HistoryPage.tsx#L310-L319)：`outputId={t.output_id}`（仅 `completed` 且有 `output_id` 时显示）

---

## 八、当前依赖的后端字段

### Project

`id` · `name` · `description` · `brand_name` · `default_perspective` · `default_platform` · `created_at` · `updated_at`
（可选扩展：`task_count` · `avg_geo_score` · `last_task_at`，前端用于卡片展示，缺失时降级展示）

### BrandFact

`id` · `project_id` · `fact_type` · `title` · `content` · `source_type` · `source_url` · `evidence_level` · `tags` · `is_active` · `created_at` · `updated_at`

### RewriteTask

`id` · `project_id` · `title` · `original_content` · `article_type?` · `perspective` · `publish_platform` · `target_audience?` · `source_policy` · `output_length` · `need_schema` · `brand_fact_ids` · `status` · `error_message?` · `created_at` · `updated_at`
（可选扩展：`score_before?` · `score_after?` · `output_id?`，用于历史列表展示分数差与跳转）

### RewriteOutput

`id` · `task_id` · `version` · `parent_version_id?` · `title` · `final_article` · `faq_content` · `schema_suggestions: { type, json_ld }` · `optimization_strategy: [{ issue, action, priority, evidence? }]` · `comparison_summary` · `missing_sources: string[]` · `missing_facts: [{ title, fact_type, content, reason }]` · `review_status` · `score_before: ContentScore` · `score_after: ContentScore` · `created_at`

### ContentScore

`id` · `output_id` · `score_type: 'before' | 'after'` · `overall` · `dimensions: [{ name, score, comment? }]` · `created_at`

### TaskStatusResponse（`GET /tasks/:id/status`）

`id` · `status: 'pending' | 'running' | 'completed' | 'failed'` · `error_message?`

### ExportResult（`GET /outputs/:id/export`）

`content` · `filename` · `mime`

### 统一响应外壳

```json
{ "code": 0, "message": "success", "data": {} }
```

axios interceptor 自动解包 `data`，页面组件不感知外壳。`code === 0 || code === 200` 视为成功。

---

## 九、发现的接口不一致问题

| # | 问题 | 前端处理 |
| --- | --- | --- |
| 1 | 任务列表契约要求挂在 `/projects/:projectId/tasks` 下，但 HistoryPage 概念上要展示「所有项目的任务」 | 前端先 `useProjects()` 拿全部项目，再用子组件 `PerProjectTaskTable` 逐项目调 `useRewriteTasks(projectId)`，避免违反 hooks 规则；任务汇总在前端聚合。**建议后端后续增加 `GET /tasks?status=&platform=` 全局列表**，否则项目数过多时前端会发起 N 次请求 |
| 2 | `useRewriteTasks` 返回类型可能是 `RewriteTask[]` 或 `Paginated<RewriteTask>` | 在 hook 内 `normalizeTaskList` 归一化为 `RewriteTask[]`，对页面透明 |
| 3 | Project 列表是否分页未在契约中明确 | `projectApi.list` 直接返回 `Project[]`；若后端改为分页，需同步调整 |
| 4 | `TaskListParams` 的 `page` / `page_size` 当前未在 UI 暴露 | service 已支持，UI 暂未传，后续做分页时直接接入 |
| 5 | `ExportResult.mime` 后端是否真实返回 content-type 未明确 | 前端 `downloadText` 用 `mime` 触发浏览器下载，若后端不返回则降级为 `text/markdown;charset=utf-8` |
| 6 | TanStack Query v5 移除了 `useQuery.onSuccess` | 改用 `useEffect` 监听 `data` 变化做副作用，详见 `useTaskStatus.ts` |

---

## 十、启动和测试方式

### 1. 环境变量

[frontend/.env.local](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/.env.local)：

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

> service 内路径不再额外写 `/api` 前缀；统一通过 `VITE_API_BASE_URL` 注入。

### 2. 启动前端

```bash
cd frontend
npm install        # 首次
npm run dev        # http://localhost:5173
```

### 3. 启动后端（可选，未启动时自动走 mock）

```bash
cd /Users/zachary/Downloads/geo-rewrite-skill
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### 4. 类型检查

```bash
cd frontend
npx tsc -b         # 当前 0 错误
```

### 5. 路由冒烟（dev server 启动后）

```bash
python3 -c "
import urllib.request
for r in ['/', '/projects', '/projects/proj-001/facts', '/projects/proj-001/rewrite/new', '/tasks/task-001/result', '/history', '/enterprise']:
    print(urllib.request.urlopen('http://localhost:5173'+r, timeout=5).status, r)
"
```

实测结果：

```
200  /
200  /projects
200  /projects/proj-001/facts
200  /projects/proj-001/rewrite/new
200  /tasks/task-001/result
200  /history
200  /enterprise
```

### 6. 联调验证清单

- [ ] 后端启动后，访问 `/projects` 应显示真实项目（无「离线 mock」角标）
- [ ] `/projects/:id/facts` 新增 / 编辑 / 启停事实应即时刷新列表
- [ ] `/projects/:id/rewrite/new` 提交后应跳到 `/tasks/:newId/result`
- [ ] 结果页在 `pending` / `running` 态显示轮询视图，3s 自动刷新；进入 `completed` 后自动展示正文与评分
- [ ] 点击「导出 Markdown」应触发 `GET /outputs/:id/export?format=markdown`，浏览器下载 `.md` 文件
- [ ] 点击「重新改写」应调 `POST /outputs/:id/regenerate`，成功后 outputs 列表刷新
- [ ] `/history` 删除任务应有 `confirm` 弹窗，确认后列表即时更新

---

## 阶段结论

Phase 3 API Contract Alignment + TanStack Query 接入已全部完成：

- 22 个后端端点已封装为 5 个 API 命名空间
- 6 类 hooks（共 22 个 hook + 1 个 helper + 1 个 queryKeys 工厂）已就绪
- 5 个 P0 页面已从 Mock 切换到真实 API（含 mock fallback）
- 任务状态 3 秒轮询 + 终态自动刷新已实现
- Markdown 导出已接入后端接口 + 失败本地兜底
- `tsc -b` 0 错误，dev server 7 路由 200

可进入下一阶段（如真实联调测试、UI 打磨、或 P1 功能扩展）。
