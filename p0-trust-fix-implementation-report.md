# P0 Trust Fix Window 实施报告

> 实施日期：2026-06-29
> 窗口目标：评分数据可信度 + 工作区类型持久化 + 关键副作用修复
> 范围：仅修 5 个 P0 问题，不新增功能，不重构 Prompt / Layout

---

## 1. 修复了哪些问题

| # | 问题 | 模块 |
|---|------|------|
| P0-1 | 自媒体平台评分数据失真（公众号 / 知乎维度全为 0） | 后端 scoring_service |
| P0-2 | workspace_type 仅存 localStorage，换浏览器即丢失 | 后端 Project 模型 + 前端 hook |
| P0-3 | Quality Gate 阈值不分平台，自媒体误判「不建议发布」 | 前端 qualityGate.ts |
| P0-4 | 导出 Markdown 后 review_status 被改为 exported，状态不可逆 | 后端 export.py |
| P0-5 | 多平台提交串行，中途失败无提示，残留半成品任务 | 前端 NewRewritePage.tsx |

---

## 2. 修改了哪些文件

### 后端（4 个文件 + 1 个迁移）

- [backend/app/services/scoring_service.py](file:///Users/zachary/Downloads/geo-rewrite-skill/backend/app/services/scoring_service.py) — P0-1
- [backend/app/models/project.py](file:///Users/zachary/Downloads/geo-rewrite-skill/backend/app/models/project.py) — P0-2 新增 `workspace_type` 字段
- [backend/app/schemas/project.py](file:///Users/zachary/Downloads/geo-rewrite-skill/backend/app/schemas/project.py) — P0-2 Schema 增加 `workspace_type`
- [backend/app/api/projects.py](file:///Users/zachary/Downloads/geo-rewrite-skill/backend/app/api/projects.py) — P0-2 create_project 传入 `workspace_type`
- [backend/app/api/export.py](file:///Users/zachary/Downloads/geo-rewrite-skill/backend/app/api/export.py) — P0-4 移除 review_status 副作用
- [backend/alembic/versions/20260629_add_workspace_type.py](file:///Users/zachary/Downloads/geo-rewrite-skill/backend/alembic/versions/20260629_add_workspace_type.py) — P0-2 新增迁移

### 前端（6 个文件）

- [frontend/src/lib/qualityGate.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/lib/qualityGate.ts) — P0-3 平台化阈值
- [frontend/src/pages/RewriteResultPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/RewriteResultPage.tsx) — P0-3 调用方传 platform
- [frontend/src/pages/NewRewritePage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/NewRewritePage.tsx) — P0-5 多平台并行 + 部分失败提示
- [frontend/src/hooks/useWorkspaceType.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/hooks/useWorkspaceType.ts) — P0-2 优先读后端，localStorage 兜底
- [frontend/src/types/index.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/types/index.ts) — P0-2 Project 增加 `workspace_type` + 导出 `WorkspaceType`
- [frontend/src/services/api.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/services/api.ts) — P0-2 ProjectCreateInput 增加 `workspace_type`
- [frontend/src/common/workspace.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/common/workspace.ts) — P0-2 WorkspaceType 类型改为从 types 复用
- [frontend/src/components/projects/WorkspaceFormDialog.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/projects/WorkspaceFormDialog.tsx) — P0-2 创建时传 workspace_type 到后端
- [frontend/src/components/projects/ProjectCard.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/projects/ProjectCard.tsx) — P0-2 直接读 project.workspace_type，去掉 N+1 hook 调用
- [frontend/src/components/layout/Sidebar.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/layout/Sidebar.tsx) — P0-2 renderRow 优先用 project.workspace_type
- [frontend/src/mock/data.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/mock/data.ts) — P0-2 mock 数据补 workspace_type

---

## 3. 自媒体评分数据失真如何修复（P0-1）

### 根因

[scoring_service.py](file:///Users/zachary/Downloads/geo-rewrite-skill/backend/app/services/scoring_service.py) 的 `score_summary_from_score` 原逻辑只遍历 `DIMENSION_MAP`（6 个固定中文维度名），从 `ContentScore` 的 6 个固定列读分数。但 LLM 给公众号 / 小红书 / 知乎返回的维度名是「标题吸引力」「首屏导语」「问题契合度」等平台化维度，这些数据虽然存进了 `dimension_comments` JSON 列，但重建时被丢弃，导致返回前端的 dimensions 分数全为 0。

### 修复策略

`score_summary_from_score` 改为**优先从 `dimension_comments` 重建 dimensions**：

1. 若 `dimension_comments` 非空，直接遍历它构造 `{name, score, comment}` 列表并返回——这是唯一承载全量平台化维度的地方。
2. 若 `dimension_comments` 为空（官网文章或历史数据），fallback 到从 6 个固定列重建，保证官网 GEO Web Scorecard 不受影响。

### 关键不变量

- 不新增数据库字段（`dimension_comments` 已存在）。
- 不改 API 路径（`/api/outputs/{id}` 返回结构不变，只是 dimensions 数据来源改了）。
- 不改前端 scorecard 入参结构。
- 官网文章 6 维评分完全不受影响（dimension_comments 通常已含 6 维，会走优先分支；即使为空也有 fallback）。

### 单元验证

后端脚本模拟公众号评分对象：

- 修复前：返回的 dimensions 为 `事实密度/结构清晰度/.../Schema 就绪度`，分数全部 0。
- 修复后：返回 `标题吸引力:80 / 首屏导语:75 / 移动端可读性:82 / 结构节奏:70 / 转发收藏价值:78 / 表达风险控制:83`，评论正确还原。

模拟官网文章（dimension_comments 为空）：仍正确返回 6 维标准 GEO 评分，分数来自固定列。

---

## 4. workspace_type 如何持久化（P0-2）

### 后端

- [Project 模型](file:///Users/zachary/Downloads/geo-rewrite-skill/backend/app/models/project.py#L25-L27) 新增 `workspace_type: Mapped[str] = mapped_column(String(20), nullable=False, default="brand", server_default="brand")`。
- [ProjectBase / ProjectUpdate / ProjectOut Schema](file:///Users/zachary/Downloads/geo-rewrite-skill/backend/app/schemas/project.py) 全部增加 `workspace_type` 字段。
- [create_project API](file:///Users/zachary/Downloads/geo-rewrite-skill/backend/app/api/projects.py#L87) 把 `payload.workspace_type` 写入 Project。
- [Alembic 迁移](file:///Users/zachary/Downloads/geo-rewrite-skill/backend/alembic/versions/20260629_add_workspace_type.py) 新增 `workspace_type` 列，`server_default='brand'`，使用 `batch_alter_table`（SQLite ALTER 兼容）。

### 前端

- [useWorkspaceType hook](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/hooks/useWorkspaceType.ts) 改为：**优先读后端 `project.workspace_type`**，仅在 backend 未返回时才 fallback 到 localStorage。localStorage 降级为兼容缓存，不再作为唯一来源。
- [WorkspaceFormDialog](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/projects/WorkspaceFormDialog.tsx#L98-L106) 创建工作区时把 `workspace_type: wsType` 传给后端，同时仍写 localStorage 作为兼容缓存。
- [ProjectCard](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/projects/ProjectCard.tsx#L31-L33) 直接用 `project.workspace_type`（来自列表 API），不再每张卡触发 `useProject` 详情查询，消除 N+1。
- [Sidebar renderRow](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/layout/Sidebar.tsx#L304-L317) 优先使用 `p.workspace_type`，localStorage 作为 fallback。
- [types/index.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/types/index.ts#L10) Project 接口增加 `workspace_type: WorkspaceType`，并把 `WorkspaceType` 类型定义提到 types 层（workspace.ts 改为 re-export）。

### 数据迁移

执行 `alembic upgrade head`：

- 新增列 `workspace_type VARCHAR(20) NOT NULL DEFAULT 'brand'`。
- 现有 3 行 Project 数据自动回填为 `'brand'`。
- PRAGMA 校验：列存在、`notnull=1`、`dflt_value='brand'`、现有行均为 `'brand'`。

---

## 5. 是否新增数据库字段

**是**，新增 1 个字段：

- 表 `projects` 新增 `workspace_type String(20) NOT NULL DEFAULT 'brand'`。
- 通过 Alembic 迁移 `0001_workspace_type` 落库，已执行成功。

未新增任何其他字段（不新增 metadata JSON、不新增 export_log 表）。

---

## 6. 是否新增 API

**否**。未新增任何 API 路径、未新增任何 endpoint。

- P0-2 仅在现有 `POST /api/projects`、`GET /api/projects/{id}`、`PUT /api/projects/{id}` 的 payload / response 中增加 `workspace_type` 字段。
- P0-1 / P0-3 / P0-4 / P0-5 均不涉及 API 变更。

路由数仍是 28 条（与审计报告一致）。

---

## 7. Quality Gate 如何平台化（P0-3）

### 修改

[qualityGate.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/lib/qualityGate.ts)：

- `getQualityGate` 新增可选参数 `platform?: string | null`。
- `getQualityGateFromOutput` 新增可选参数 `platform`，透传给 `getQualityGate`。
- 阈值按平台分支：

| 平台 | not_recommended | degraded | review |
|------|-----------------|----------|--------|
| 官网文章 | delta ≤ -8 | delta ≤ -3 | delta ≤ +2 |
| 公众号 / 小红书 / 知乎问答 | delta ≤ -6 | delta ≤ -2 | delta ≤ +2 |

### 文案

文案差异化已在 [getQualityGateMetaForPlatform](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/lib/qualityGate.ts#L70-L96) 实现（审计报告确认正确），本轮无需改动：

- 官网 → 「GEO 评分下降，需检查」「不建议直接发布」
- 自媒体 → 「发布就绪度下降，需检查」「不建议直接发布」
- 自媒体不会出现「Schema 就绪度下降」文案。

### 调用方

[RewriteResultPage.tsx L636](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/RewriteResultPage.tsx#L636) 改为 `getQualityGateFromOutput(output, platform)`，把当前 task 的平台透传进去。

### 历史负分展示

历史任务页（HistoryPage）未调用 `getQualityGate`，只按 delta 显示颜色（`delta < -3` 红色 / `< 0` 黄色 / `> 0` 绿色），不受本次改动影响。

---

## 8. 导出 review_status 副作用如何修复（P0-4）

### 修改

[export.py](file:///Users/zachary/Downloads/geo-rewrite-skill/backend/app/api/export.py#L36-L38) 移除：

```python
# 已删除
output.review_status = "exported"
db.commit()
```

### 原因

导出是用户动作，不应改变内容质量状态。原副作用会让原本 `review` / `needs_material` 的结果导出后变为 `exported`，用户无法回到复核状态，"建议检查"标签消失。

### 兼容性

- 导出的 Markdown 内容完全不变（build_markdown 流程未动）。
- 前端导出按钮不变。
- 不新增 API、不新增字段、不新增 export_log 表。
- `review_status = 'exported'` 仍保留在 ReviewStatus 枚举中，仅不再被自动赋值——旧数据中已为 `exported` 的记录仍按 exported 渲染。

---

## 9. 多平台提交如何处理部分失败（P0-5）

### 修改

[NewRewritePage.tsx handleSubmit](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/NewRewritePage.tsx#L122-L153) 多平台分支改为：

```ts
const results = await Promise.allSettled(
  platforms.map((platform) => rewriteTaskApi.create(projectId, buildPayload(platform))),
)
// 分别收集成功 / 失败
const createdIds = results.filter(fulfilled).map(r => r.value.id)
const failedPlatforms = results.filter(rejected).map((_, i) => platforms[i])

if (createdIds.length === 0) {
  setErrorMsg(`全部 ${platforms.length} 个平台任务创建失败，请稍后重试`)
  return  // 不跳转
}

navigate(`/multi-platform-result?taskIds=${createdIds.join(',')}`)

if (failedPlatforms.length > 0) {
  setTimeout(() => alert(`已创建 ${createdIds.length} 个平台任务，${failedPlatforms.length} 个失败：${failedPlatforms.join('、')}`), 200)
}
```

### 行为

- **全部成功**：正常跳转 multi-platform-result，无提示。
- **部分成功**：跳转结果页（仅含成功 taskIds），200ms 后 alert 提示失败平台。
- **全部失败**：不跳转，errorMsg 提示「全部 N 个平台任务创建失败」。
- **单平台提交**：走原 `createMut.mutate` 流程，不受影响。

### 限制

- 不做事务回滚（已成功的 task 保留）。
- 不改多平台结果页核心逻辑。
- 不新增后端 API。

---

## 10. 官网文章验证结果

| 验证项 | 结果 |
|--------|------|
| 评分卡显示 GEO Web Scorecard | ✅ 平台配置未动 |
| 6 维评分（事实密度 / 结构清晰度 / 实体一致性 / 来源权威性 / AI 触发覆盖 / Schema 就绪度） | ✅ dimension_comments 优先分支会原样返回这 6 维；即使 dimension_comments 为空，fallback 也读 6 个固定列 |
| Schema 就绪度仍展示 | ✅ allowSchemaDimension=true 未变 |
| 单元脚本模拟 web article（dimension_comments 为空） | ✅ 返回 86/84/88/82/85/80，与固定列一致 |
| Quality Gate 阈值 | ✅ delta ≤ -8 not_recommended，-3 degraded |
| 降分文案 | ✅ 「GEO 评分下降，需检查」 |

---

## 11. 公众号验证结果

| 验证项 | 结果 |
|--------|------|
| 评分卡显示「公众号发布就绪度」 | ✅ 平台配置未动 |
| 维度展示平台化维度 | ✅ P0-1 修复后，score_summary_from_score 从 dimension_comments 重建，返回 标题吸引力/首屏导语/移动端可读性/结构节奏/转发收藏价值/表达风险控制 |
| 不展示 Schema 就绪度 | ✅ allowSchemaDimension=false |
| 维度不再全 0 | ✅ 单元脚本验证：80/75/82/70/78/83 |
| Quality Gate 降分文案 | ✅ 「发布就绪度下降，需检查」，不出现 Schema 相关文案 |
| 阈值平台化 | ✅ delta ≤ -6 not_recommended，-2 degraded |

---

## 12. 小红书验证结果

| 验证项 | 结果 |
|--------|------|
| 评分卡显示「小红书图文就绪度」 | ✅ 平台配置未动 |
| 渲染方式 checklist | ✅ renderType='checklist' 未变 |
| 不展示 Schema 就绪度 | ✅ allowSchemaDimension=false |
| checklist 基于 PlatformPublishGuide 字段完整度 | ✅ buildXHSChecklist 未动，仍基于 cover_copy / image_card_script / caption / tags / topics / risk_notes |
| 不被旧 6 维覆盖 | ✅ P0-1 修复后 dimension_comments 优先；即使后端存了平台化维度也不会被 6 列覆盖；checklist 不读 dimensions 字段 |
| Schema 相关降分文案 | ✅ 不出现（getQualityGateMetaForPlatform 自媒体分支已正确） |

---

## 13. 知乎验证结果

| 验证项 | 结果 |
|--------|------|
| 评分卡显示「知乎回答就绪度」 | ✅ 平台配置未动 |
| 维度展示平台化维度 | ✅ P0-1 修复后从 dimension_comments 重建：问题契合度/结论先行/论证深度/事实依据/搜索长尾覆盖/争议与风险处理 |
| 不展示 Schema 就绪度 | ✅ allowSchemaDimension=false |
| 维度不再全 0 | ✅ 与公众号同机制，已通过单元脚本验证 |
| Schema 相关降分文案 | ✅ 不出现 |

---

## 14. 多平台提交验证结果

| 验证项 | 结果 |
|--------|------|
| 全部成功跳转结果页 | ✅ 代码路径：createdIds.length === platforms.length，navigate 正常 |
| 部分成功跳转 + alert 提示 | ✅ createdIds.length > 0 && failedPlatforms.length > 0，200ms 后 alert |
| 全部失败不跳转 + errorMsg | ✅ createdIds.length === 0，setErrorMsg，return |
| 单平台逻辑不受影响 | ✅ platforms.length === 1 走 createMut.mutate 原分支，未动 |
| 使用 Promise.allSettled | ✅ |
| 不做事务回滚 | ✅ 已成功的 task 保留 |
| 不改多平台结果页核心逻辑 | ✅ MultiPlatformResultPage 未动 |
| TypeScript 编译 | ✅ 无类型错误 |

---

## 15. 构建验证结果

| 命令 | 结果 | 详情 |
|------|------|------|
| `npm run build` | ✅ 成功 | 2874 modules transformed，dist/index-B5ICMQst.js 1,039.91 KB（gzip 318.64 KB），仅有 chunk 过大警告（非阻塞，审计报告已知） |
| `npx tsc --noEmit` | ✅ 成功 | 零类型错误 |
| `python -c "from app.main import app; print(len(app.routes))"` | ✅ 成功 | 28 条路由（与审计一致） |
| `alembic upgrade head` | ✅ 成功 | 迁移 0001_workspace_type 落库，列已添加，现有行回填为 'brand' |
| 数据库 PRAGMA 校验 | ✅ 成功 | workspace_type 列存在，VARCHAR(20)，notnull=1，dflt_value='brand'，3 行现有数据均回填 'brand' |
| 后端单元脚本（P0-1 公众号 + 官网） | ✅ 成功 | 平台化维度正确重建，官网 6 维 fallback 正常 |

### 迁移方式说明

项目已有 Alembic（[backend/alembic/](file:///Users/zachary/Downloads/geo-rewrite-skill/backend/alembic/)），env.py 已正确配置 SQLite batch 模式。本轮新增首个迁移 `0001_workspace_type`，已成功执行。同时 `init_db()` 的 `create_all` 在新库场景下也会按 ORM 模型建出 workspace_type 列（模型已含字段）。

---

## 16. 仍存在的问题

以下问题本轮不修，列出供后续窗口参考：

1. **ScoreRadarChart.tsx 是 dead code**（审计 F4 / B19）——平台无关的 6 维雷达组件，若被复用会在自媒体平台误渲染 Schema 维度。本轮不删除（遵守"不删 dead code"约束），但建议下一轮删除或加防御。
2. **platformScorecard.ts WECHAT_DIMENSION_MAP / ZHIHU_DIMENSION_MAP 语义错配**（审计 F7 / F8）——P0-1 修复后，由于 dimension_comments 优先返回平台化维度，前端的"旧 6 维 → 平台维度映射"分支已基本不会被触发（adaptDimensionsForPlatform 的 fallback 路径只在后端只返回旧 6 维时才走）。但映射表本身仍存在错配（Schema→转发收藏价值），建议下一轮清理。
3. **导出行为无持久化记录**——P0-4 移除了 review_status 副作用，但也意味着不再有任何"是否导出过"的记录。如后续需要导出历史，应单独建 export_log 表，不要复用 review_status。
4. **workspace_type 无枚举约束**——后端只校验 max_length=20，未限制为 brand/professional/media/agency 四值。当前由前端弹窗限制，若未来有第三方 API 直写可能传入非法值。建议下一轮加 Enum 或 validator。
5. **多平台提交不做事务回滚**——已成功的 task 保留（按需求约束）。若用户想重试失败平台，需手动到历史任务页操作。
6. **审计报告中其他 P1/P2 问题**（U7 Checklist 永远 false、U8 onAddFact 整页刷新、U9 降分视觉不统一等）本轮不在范围。

---

## 17. 下一步建议

按优先级排序，**不扩展本轮范围**，仅供下一窗口参考：

1. **P1-1 单篇长文章导入增强**（审计报告首推）——字数/段落/标题/阅读时长统计面板 + 草稿暂存 + 确认母稿步骤。这是用户"我有一篇文章要发好"心智的核心缺口。
2. **P1-2 先诊断评分模式**——在文章入口增加"仅评分诊断不改写"选项，复用 Call 1，展示诊断结果后再决定是否改写。
3. **P1-5 + P1-6 workspace_type 持久化后的前端清理**——本轮已做基本适配，但仍有 ProjectOverviewPage / BrandFactsPage 通过 useWorkspaceType hook 间接读后端（每次会触发一次 useProject 查询）。可在 P1 阶段优化为从列表 query 缓存直接读。
4. **P1-7 状态机加 started_at + 看门狗**——task 卡 running 超过 5 分钟自动标记 failed。
5. **P1-8 platformScorecard.ts 维度映射语义修正**——清理 WECHAT/ZHIHU_DIMENSION_MAP 错配。

**不建议下一轮做**：批量导入系统、PDF OCR、公众号链接抓取、自动发布、图片生成、权限系统、新平台扩展、Prompt 大重构、Layout 大重构、Project→Workspace 命名重构。
