# Release Report — Release Blocker 修复

**修复范围**：仅 QA 报告中标记为 Release Blocker 的 7 项问题。
**未触碰**：P0/P1/P2/P3 其余问题全部未改，无优化、无重构、无新增功能/页面/动画。

---

## 修复清单

### 1. 新建项目按钮（QA #1）
- **问题**：「新建项目」按钮无 `onClick`，点击无反应，主流程第一步断裂。
- **修复**：在 [ProjectListPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/ProjectListPage.tsx) 新增 `ProjectFormDialog` 弹窗组件，按钮绑定 `onClick` 打开弹窗，表单包含项目名称、品牌名称、描述、默认视角、默认平台，提交时调用已有的 `useCreateProject` hook，成功后关闭弹窗并自动刷新列表。
- **附带类型修正**：`ProjectCreateInput.description` / `brand_name` 改为可选（`?`），与后端 `ProjectBase` 的 `Optional[str]` 对齐，使弹窗可选字段能正常提交。

### 2. Task Failed 页面（QA #13 / #28）
- **问题**：任务 `failed` 且无 output 时，结果页走到 `TaskRunningView` 分支，显示「任务排队中」，客户无限等待；`error_message` 未渲染，无重试入口。
- **修复**：在 [RewriteResultPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/RewriteResultPage.tsx) 的进行中态判断之前，新增 `task.status === 'failed'` 分支，渲染 `TaskFailedView`：红色 `AlertCircle` 图标 + 「任务改写失败」标题 + `task.error_message` 错误原因卡片 + 「重试」按钮（调用已有的 `useRetryTask`）+「返回历史」。

### 3. 首页假数据（QA #4）
- **问题**：`pendingSources = 7` 硬编码，无论有无项目都显示「待补充来源 7」，误导客户。
- **修复**：[ProjectListPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/ProjectListPage.tsx) 将 `pendingSources` 改为 `0`。当前无对应后端接口，置 0 避免误导；待后端补充聚合接口后再接入真实值。

### 4. 平均评分字段（QA #5）
- **问题**：前端依赖 `project.avg_geo_score` / `last_task_at`，但后端 `ProjectOut` 不返回这两个字段，真实数据永远 `undefined`，首页和项目卡片始终显示 0 / 「—」。
- **修复（后端）**：
  - [schemas/project.py](file:///Users/zachary/Downloads/geo-rewrite-skill/backend/app/schemas/project.py) `ProjectOut` 新增 `avg_geo_score: Optional[int]` 与 `last_task_at: Optional[datetime]`。
  - [api/projects.py](file:///Users/zachary/Downloads/geo-rewrite-skill/backend/app/api/projects.py) `_to_out` 中：`avg_geo_score` 取该项目所有 output 的 `score_type='after'` 评分均值；`last_task_at` 取该项目最近一条任务的 `created_at`。无数据时返回 `None`。
- **修复（前端）**：[useProjects.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/hooks/useProjects.ts) 新增 `normalizeProjectList`，与 `useRewriteTasks` 一致地处理后端返回的分页对象 `{items, total, page, page_size}`，使项目列表数据能正确流入首页统计卡片与项目卡片。`api.ts` 中 `projectApi.list` 返回类型同步改为 `Project[] | Paginated<Project>`。

### 5. History 失败原因（QA #14）
- **问题**：HistoryPage 表格失败任务只显示红色「失败」徽章，不展示错误原因，客户无法自助排查。
- **修复**：[HistoryPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/HistoryPage.tsx) 表格标题列下方，当 `t.status === 'failed' && t.error_message` 时，追加一行红色截断文本显示 `error_message`，并带 `title` 属性提供完整内容的 tooltip。

### 6. Running 禁止 Retry（QA #22 / #30）
- **问题**：running 任务的「重新改写」按钮未禁用，点击会被后端拒绝，体验粗糙。
- **修复**：[HistoryPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/HistoryPage.tsx) 给「重新改写」按钮加 `disabled={t.status === 'running'}`。

### 7. History Tooltip（QA #20 / #36）
- **问题**：HistoryPage 表格中导出按钮只有图标，无文字无 tooltip，客户不知道按钮用途。
- **修复**：[ExportButton.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/common/ExportButton.tsx) 新增 `title` prop 并透传给底层 `Button`；[HistoryPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/HistoryPage.tsx) 中导出按钮传入 `title="导出 Markdown"`。

---

## 变更文件汇总

| 文件 | 关联 Blocker |
|---|---|
| `frontend/src/pages/ProjectListPage.tsx` | #1 #3 |
| `frontend/src/hooks/useProjects.ts` | #4 |
| `frontend/src/services/api.ts` | #1 #4 |
| `frontend/src/pages/RewriteResultPage.tsx` | #2 |
| `frontend/src/pages/HistoryPage.tsx` | #5 #6 #7 |
| `frontend/src/components/common/ExportButton.tsx` | #7 |
| `backend/app/schemas/project.py` | #4 |
| `backend/app/api/projects.py` | #4 |

共 8 个文件，7 个 Release Blocker。

---

## 验证

- **前端 TypeScript**：`npx tsc -b --noEmit` 通过，0 错误。
- **后端导入**：`ProjectOut` 字段确认包含 `avg_geo_score`、`last_task_at`。
- **后端 smoke**：`_to_out` 对空项目返回 `task_count=0 / avg_geo_score=None / last_task_at=None`，字段完整。

---

## 未改动项（确认）

以下 QA 问题**未触碰**，不在本次 Release Window 范围内：

- 空状态文案指向死按钮（QA #2）— 现在按钮已可用，文案自动成立
- Onboarding 引导（QA #3）
- 默认视角前后端不一致（QA #9）
- 平台选项前后端不一致（QA #10）
- 「取消」按钮 navigate(-1)（QA #11）
- 任务排队文案（QA #16）
- Enterprise Banner / 销售元素（QA #24）
- 「高级参数」P0/P1 术语（QA #25）
- 「证据等级」含「传闻」（QA #26）
- 质量状态语义不直观（QA #31）
- API 失败静默 fallback mock（QA #23）
- 导出静默改 review_status（QA #19）
- HistoryPage 重新改写按钮 onClick（QA #21）— 仅禁用 running，未接 onClick
- HistoryPage running 删除按钮禁用（QA #22 删除部分）
- HistoryPage 不轮询 running 任务（QA #32 衍生）
- Schema Tab 复制正文语义错位（QA #17 / #24）
- 复制 JSON 成功无反馈（QA #38）
- 其余 P2/P3 打磨项
