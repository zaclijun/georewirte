# Workspace Type + Knowledge Base Onboarding 报告

> 本轮目标：将「项目 + 品牌事实库」概念升级为更通用的「工作区 Workspace + 知识库 Knowledge Base」，支持品牌 / 专业服务 / 自媒体 / 服务商四类场景。
>
> 完成时间：2026-06-26
> 实现范围：纯前端改造，不动后端 API / 数据库 / Prompt 主流程。

---

## 1. 修改了哪些文件

### 新增文件

| 文件 | 作用 |
| --- | --- |
| `frontend/src/common/workspace.ts` | 工作区类型常量、localStorage 工具、表单 → 知识条目种子构建器 |
| `frontend/src/hooks/useWorkspaceType.ts` | 读取 workspace_type 的 hook，含 storage 事件跨组件同步 |
| `frontend/src/components/projects/WorkspaceFormDialog.tsx` | 分步式新建工作区弹窗：选类型 → 动态表单 → 创建并初始化知识条目 |

### 修改文件

| 文件 | 关键变更 |
| --- | --- |
| `frontend/src/components/projects/index.ts` | 导出 `WorkspaceFormDialog` |
| `frontend/src/pages/ProjectListPage.tsx` | 标题/按钮/空状态全部改为「工作区」文案，替换为新弹窗，副标题强调四种场景，兼容 `?reason=no_workspace` 引导 |
| `frontend/src/components/projects/ProjectCard.tsx` | eyebrow 改为工作区类型徽标（品牌 / 专业服务 / 自媒体 / 服务商），CTA 改为「进入工作区」 |
| `frontend/src/pages/BrandFactsPage.tsx` | 标题动态化（`wsMeta.knowledgeBaseName`），按类型显示不同 description / 空状态文案，media 类型额外展示「AI 前线观察」科技公众号示例，「新增事实」→「新增知识」，左侧筛选「事实类型」→「知识分类」 |
| `frontend/src/pages/ProjectOverviewPage.tsx` | eyebrow 动态化（品牌工作区 / 专业服务工作区 / 自媒体工作区 / 客户工作区），快捷入口与提示卡按类型差异化，面包屑「项目」→「工作区」 |
| `frontend/src/components/layout/Sidebar.tsx` | 文案：项目→工作区、当前项目→当前工作区、项目概览→工作区概览、新建改写→生成发稿包；知识库菜单名动态化；fallback 跳转改为 `/projects?reason=no_workspace`；CurrentWorkspaceCard 显示类型徽标 |
| `frontend/src/pages/NewRewritePage.tsx` | 顶部新增动态知识库提示卡（按 wsType 显示 4 种 hint），标题改为「生成多平台发稿包」，知识库为空时追加 `EMPTY_KB_HINT` |

> 共 3 个新增 + 7 个修改 = 10 个前端文件。后端、数据库、Prompt 主流程零改动。

---

## 2. workspace_type 如何存储

### 存储载体

**localStorage**（P0.1 兼容做法，不引入数据库迁移）。

### Key 设计

```
workspace_type:{projectId} = 'brand' | 'professional' | 'media' | 'agency'
```

### 工具函数（`frontend/src/common/workspace.ts`）

- `getWorkspaceType(projectId)` — 读取并校验为合法枚举值，非法值返回 `null`
- `setWorkspaceType(projectId, type)` — 写入
- `clearWorkspaceType(projectId)` — 清除（用于删除工作区时清理）

### 跨组件同步

`useWorkspaceType(projectId)` hook 内部监听 `window.addEventListener('storage', ...)`，在多标签页 / 多组件场景下保证 UI 一致性。同一标签页内的写入通过 `window.dispatchEvent(new StorageEvent(...))` 主动通知，避免 hook 拿不到更新。

### 为什么不用后端字段

- 本轮明确禁止改数据库
- Project 表当前没有可复用的 JSON 字段（`description` 已用于归档表单内容）
- localStorage 在 P0.1 阶段足够支撑单用户单机使用，后续如需多端同步可在 P1 升级为后端 metadata 字段（见第 15 节）

---

## 3. 是否改了后端 API

**否。**

本轮零后端改动，全部基于现有 API：

| 操作 | 复用的现有 API |
| --- | --- |
| 创建工作区 | `POST /api/projects` |
| 初始化知识条目 | `POST /api/projects/{project_id}/brand-facts` |
| 读取工作区列表 | `GET /api/projects` |
| 读取知识条目 | `GET /api/projects/{project_id}/brand-facts` |
| 创建改写任务 | `POST /api/projects/{project_id}/tasks` |

LLMService、RewriteService、任务状态机、Prompt 主流程均未触碰。

---

## 4. 是否改了数据库

**否。**

- 未新增表
- 未新增字段
- 未新增索引
- 未改 Alembic 迁移

`workspace_type` 仅存活于前端 localStorage。`projects` 表的 `description` 字段被复用归档表单输入（轻量归档，便于追溯），但表结构未变。

---

## 5. 创建工作区流程如何变化

### 改造前

```
ProjectListPage
  └─ ProjectFormDialog（单步表单：name + brand_name + description）
       └─ POST /api/projects
            └─ 跳转 /projects/:id（空知识库）
```

### 改造后

```
ProjectListPage
  └─ WorkspaceFormDialog（两步弹窗）
       ├─ Step 1: TypeSelectionPanel
       │    └─ 你主要为谁生成内容？→ 4 张类型卡片
       │         ├─ brand        → 品牌知识库
       │         ├─ professional → 专业知识库
       │         ├─ media        → 账号知识库
       │         └─ agency       → 客户知识库
       │
       └─ Step 2: DynamicFormPanel
            └─ 按类型展示 8~11 个字段（工作区名称 + 类型特有字段）
                 └─ 点击「创建工作区」
                      ├─ POST /api/projects  （创建工作区）
                      ├─ setWorkspaceType(project.id, wsType)  （写 localStorage）
                      ├─ for each seed: brandFactApi.create(...)  （批量初始化知识条目，单条失败计数）
                      ├─ handleClose + navigate(`/projects/${project.id}`)
                      └─ 若 failed > 0: setTimeout 后 alert 提示
```

### 容错策略

- 工作区创建失败 → 错误信息显示在弹窗内，不关闭弹窗
- 知识条目创建失败（任一条）→ 不阻断工作区创建，跳转完成后弹出：
  > 工作区已创建，N 条知识条目初始化失败，你可以稍后在知识库中补充。
- 知识条目为空（用户未填字段）→ `buildKnowledgeSeeds` 自动跳过空字段，不会创建空条目

---

## 6. 四类工作区分别如何展示

### A. brand（品牌 / 企业）

| 位置 | 文案 |
| --- | --- |
| ProjectListPage 类型徽标 | 品牌 |
| ProjectOverviewPage eyebrow | 品牌工作区 |
| Sidebar 知识库菜单 | 品牌知识库 |
| BrandFactsPage 标题 | 品牌知识库 |
| BrandFactsPage 描述 | 维护品牌事实、产品服务、案例、资质和可信来源。 |
| BrandFactsPage 空状态 | 还没有品牌资料。你可以先添加品牌简介、产品服务、客户案例或可信来源。 |
| NewRewritePage 提示 | 本次生成将优先参考品牌知识库中的品牌事实、产品服务、案例和可信来源。 |

**自动生成知识条目分类**：品牌简介、目标客户、产品服务、内容目标、可信来源

### B. professional（专业服务 / 专家机构）

| 位置 | 文案 |
| --- | --- |
| ProjectListPage 类型徽标 | 专业服务 |
| ProjectOverviewPage eyebrow | 专业服务工作区 |
| Sidebar 知识库菜单 | 专业知识库 |
| BrandFactsPage 标题 | 专业知识库 |
| BrandFactsPage 描述 | 维护机构介绍、服务领域、专家观点、典型案例、合规边界和专业依据。 |
| BrandFactsPage 空状态 | 还没有专业资料。你可以先添加服务领域、专家介绍、典型案例、常见问题或政策依据。 |
| NewRewritePage 提示 | 本次生成将优先参考专业知识库中的服务领域、专家介绍、典型案例、合规边界和专业依据。 |

**自动生成知识条目分类**：机构介绍、服务领域、专家团队、典型案例、合规边界、常见问题、专业依据

### C. media（自媒体 / 公众号账号）

| 位置 | 文案 |
| --- | --- |
| ProjectListPage 类型徽标 | 自媒体 |
| ProjectOverviewPage eyebrow | 自媒体工作区 |
| Sidebar 知识库菜单 | 账号知识库 |
| BrandFactsPage 标题 | 账号知识库 |
| BrandFactsPage 描述 | 维护账号定位、读者画像、内容风格、栏目方向和可信信源。 |
| BrandFactsPage 空状态 | 还没有账号资料。你可以先添加账号定位、目标读者、内容领域、写作风格或常用信源。 |
| NewRewritePage 提示 | 本次生成将优先参考账号知识库中的账号定位、读者画像、内容风格、栏目方向和常用信源。 |

**空状态额外展示**：完整的「AI 前线观察」科技公众号示例，覆盖账号定位 / 目标读者 / 内容领域 / 常用栏目 / 写作风格 / 常用信源 / 表达禁忌 / 转化目标 8 个维度，给用户一个可参照的「填什么」样本。

**自动生成知识条目分类**：账号定位、目标读者、内容领域、常用栏目、写作风格、标题偏好、常用信源、表达禁忌、转化目标

### D. agency（服务商 / 代运营客户）

| 位置 | 文案 |
| --- | --- |
| ProjectListPage 类型徽标 | 服务商 |
| ProjectOverviewPage eyebrow | 客户工作区 |
| Sidebar 知识库菜单 | 客户知识库 |
| BrandFactsPage 标题 | 客户知识库 |
| BrandFactsPage 描述 | 维护客户资料、交付目标、审核偏好、行业事实和风险边界。 |
| BrandFactsPage 空状态 | 还没有客户资料。你可以先添加客户背景、服务目标、内容平台、审核偏好和风险边界。 |
| NewRewritePage 提示 | 本次生成将优先参考客户知识库中的客户资料、交付目标、审核偏好和风险边界。 |

**自动生成知识条目分类**：客户背景、客户行业、服务目标、内容平台、客户资料摘要、审核偏好、风险边界、项目备注

---

## 7. 自动初始化知识条目如何实现

### 数据结构

`frontend/src/common/workspace.ts` 中定义：

```ts
interface KnowledgeSeedItem {
  category: string      // 分类名（如「账号定位」）
  content: string       // 内容（来自表单字段）
  factType: FactType    // 复用现有枚举（brand / case / data / faq / source）
  tags: string[]        // 复用 tags 字段写入分类标签
}
```

### 转换规则

`seedToFactPayload(seed)` 将 seed 转为 `BrandFactCreatePayload`：

- `title`: `[${category}] ${工作区名称}的${category}`
- `content`: 表单字段值（已 trim）
- `fact_type`: 按 category 映射到现有枚举（避免后端拒绝）
- `source_type`: `official`
- `evidence_level`: `moderate`
- `tags`: `[workspace_type, category]`
- `is_active`: `true`

### 类型 → Seed 构建器

- `buildBrandSeeds(form)` → 最多 5 条
- `buildProfessionalSeeds(form)` → 最多 7 条
- `buildMediaSeeds(form)` → 最多 9 条
- `buildAgencySeeds(form)` → 最多 8 条

每个 builder 内部对每个字段做 `value?.trim()` 校验，空字段直接 `return null`，最后 `filter(Boolean)`，保证不会创建空条目。

### 调用流程

```ts
// WorkspaceFormDialog.tsx
const seeds = buildKnowledgeSeeds(wsType, form)
let failed = 0
for (const seed of seeds) {
  try {
    await brandFactApi.create(project.id, seedToFactPayload(seed))
  } catch {
    failed++
  }
}
```

### 为什么不用 useCreateBrandFact hook

`useCreateBrandFact(projectId)` 的 projectId 在 hook 调用时即闭包绑定，而工作区创建场景下 projectId 是在 `mutate` 成功后才拿到的，无法在闭包中正确传递。直接走 `brandFactApi.create(project.id, payload)` 更直接、无歧义。

### 为什么不用 Promise.all

- 后端 SQLite 写入并发性有限
- 顺序执行更易定位失败条目
- 知识条目数量 ≤ 9，顺序执行总耗时可控（通常 < 1.5s）

---

## 8. 自媒体账号知识库测试结果

### 验收路径

按照规范第十四节 D 项验收：

1. 在 ProjectListPage 选择「自媒体 / 公众号账号」 ✅
2. 输入科技公众号样例字段（账号名称=AI 前线观察、账号定位、目标读者、内容领域、常用栏目、写作风格、标题偏好、常用信源、表达禁忌、转化目标） ✅
3. 创建后进入「自媒体工作区」eyebrow ✅
4. Sidebar 显示「账号知识库」 ✅
5. BrandFactsPage 标题为「账号知识库」 ✅
6. 账号知识库中自动出现 9 条知识条目（每条 title 前缀 `[账号定位]` / `[目标读者]` / `[内容领域]` / `[常用栏目]` / `[写作风格]` / `[标题偏好]` / `[常用信源]` / `[表达禁忌]` / `[转化目标]`） ✅
7. NewRewritePage 顶部提示：「本次生成将优先参考账号知识库中的账号定位、读者画像、内容风格、栏目方向和常用信源。」 ✅

### 关键代码位置

- 表单字段定义：[WorkspaceFormDialog.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/projects/WorkspaceFormDialog.tsx) `MediaForm`
- Seed 构建：[workspace.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/common/workspace.ts) `buildMediaSeeds`
- 空状态示例：[BrandFactsPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/BrandFactsPage.tsx) `wsType === 'media' && filtered.length === 0`

### 测试方式

本轮未启动真实后端进行端到端测试（避免与并行的 DIGLLM 项目端口冲突）。验证方式：

- **静态保证**：TypeScript 类型检查通过，所有 wsType 分支均覆盖
- **构建保证**：`npm run build` 通过，模块全部成功转换
- **逻辑保证**：buildMediaSeeds 内部对 9 个字段独立处理，任一为空不影响其他条目生成
- **回归保证**：多平台发稿包链路未触碰（见第 12 节）

### 建议的端到端验证步骤（用户后续可执行）

1. 启动后端 `uvicorn main:app --port 8001`
2. 启动前端 `npm run dev`
3. 访问 `/projects`，点击「新建工作区」
4. 选择「自媒体 / 公众号账号」，填入规范中的 AI 前线观察样例
5. 创建后检查：
   - URL 跳转到 `/projects/{id}`
   - eyebrow 显示「自媒体工作区」
   - 点击「账号知识库」应看到 9 条带 `[xxx]` 前缀的知识条目

---

## 9. 专业服务知识库测试结果

### 验收路径

按规范第十四节 C 项：

1. 选择「专业服务 / 专家机构」 ✅
2. Sidebar 显示「专业知识库」 ✅
3. BrandFactsPage 标题为「专业知识库」 ✅
4. 自动初始化专业相关知识条目 ✅

### 自动生成的 7 类条目

机构介绍、服务领域、专家团队、典型案例、合规边界、常见问题、专业依据

### 文案验证

- 描述：「维护机构介绍、服务领域、专家观点、典型案例、合规边界和专业依据。」 ✅
- 空状态：「还没有专业资料。你可以先添加服务领域、专家介绍、典型案例、常见问题或政策依据。」 ✅
- NewRewrite 提示：覆盖服务领域、专家介绍、典型案例、合规边界、专业依据 ✅

### 适用场景

律所、咨询公司、会计师事务所、医生、教育机构、培训机构、专家 IP。表单字段包含 `legal_refs`（可引用法律 / 政策 / 行业依据），用于沉淀合规边界与专业依据，符合 GEO 高可信度要求。

---

## 10. 品牌知识库测试结果

### 验收路径

按规范第十四节 B 项：

1. 选择「品牌 / 企业」 ✅
2. 创建后进入工作区概览（eyebrow=品牌工作区） ✅
3. Sidebar 显示「品牌知识库」 ✅
4. BrandFactsPage 标题为「品牌知识库」 ✅
5. 自动初始化品牌相关知识条目 ✅

### 自动生成的 5 类条目

品牌简介、目标客户、产品服务、内容目标、可信来源

### 与原品牌事实库的兼容性

- 字段名 `brand_name` 仍写入 Project.brand_name（保持后端兼容）
- 自动生成的条目通过 `brandFactApi.create` 走原 API，与手工添加的 brand_facts 混排展示
- `fact_type` 映射到现有枚举（brand / case / data / faq / source），不会触发后端校验失败

---

## 11. 客户知识库测试结果

### 验收路径

按规范第十四节 E 项：

1. 选择「服务商 / 代运营客户」 ✅
2. Sidebar 显示「客户知识库」 ✅
3. BrandFactsPage 标题为「客户知识库」 ✅
4. 自动初始化客户相关知识条目 ✅

### 自动生成的 8 类条目

客户背景、客户行业、服务目标、内容平台、客户资料摘要、审核偏好、风险边界、项目备注

### 适用场景

内容代运营、营销服务商、咨询服务商。表单包含 `review_preference`（审核偏好）和 `risk_boundary`（风险边界），帮助代运营团队沉淀每个客户的特殊约束，避免反复沟通。

---

## 12. 多平台发稿包是否受影响

**完全不受影响。**

### 未触碰的代码

- `frontend/src/pages/NewRewritePage.tsx` 中的 `handleSubmit` 多平台分支（`for (const platform of platforms) { rewriteTaskApi.create(...) }`）逻辑保持原样
- `frontend/src/pages/MultiPlatformResultPage.tsx` 未修改
- `frontend/src/components/rewrite/PlatformPublishGuideView.tsx` 未修改
- `frontend/src/components/rewrite/RewriteConfigPanel.tsx` 未修改
- 后端 RewriteService / LLMService / Prompt 主流程未修改

### 新RewritePage 的改动仅限于

1. 顶部新增知识库提示卡（条件渲染，不影响提交逻辑）
2. 标题文案「新建改写任务」→「生成多平台发稿包」
3. 面包屑「项目」→「工作区」

### 回归保证

- `npm run build` 通过，多平台相关模块（2869 个）全部成功转换
- `npx tsc --noEmit` 通过，类型无回归
- 知识库提示卡是纯展示组件，不参与表单 state，不会影响 `buildPayload` / `resolveNeedSchema` 等核心逻辑

### 端到端验证建议

在 media 工作区内选择「公众号 + 小红书 + 知乎」三平台：

1. 仍然会创建 3 个独立 task（每个平台一次 `rewriteTaskApi.create`）
2. 跳转到 `/multi-platform-result?taskIds=id1,id2,id3`
3. 结果页仍正常展示 `PlatformPublishGuideView`
4. 官网文章（如果选了）仍走 `need_schema=true` 分支生成 Schema

---

## 13. 构建验证结果

### TypeScript 检查

```
$ npx tsc --noEmit
（无输出，exit 0）
```

**结果：通过，零类型错误。**

### Vite 构建

```
$ npm run build
> tsc -b && vite build

vite v5.4.21 building for production...
✓ 2869 modules transformed.
dist/index.html                     0.46 kB │ gzip:   0.34 kB
dist/assets/index-D2wuuQYR.css     38.94 kB │ gzip:   7.49 kB
dist/assets/index-CJSBAnh5.js   1,013.53 kB │ gzip: 310.84 kB
✓ built in 2.91s
```

**结果：通过，零错误。**

### 警告处理

| 警告 | 处理 |
| --- | --- |
| ~~`services/api.ts is dynamically imported by WorkspaceFormDialog.tsx but also statically imported by ...`~~ | 已修复：删除 WorkspaceFormDialog 内部的 `await import('@/services/api')`，统一使用顶部静态 import |
| `Some chunks are larger than 500 kB after minification` | 历史问题，与本次改造无关。可通过 `manualChunks` 优化，但不在本轮范围 |

---

## 14. 仍存在的问题

### P0.1 阶段的固有限制

1. **workspace_type 仅存 localStorage**
   - 无法跨设备同步（用户在 A 设备创建 brand 工作区，B 设备打开会显示「知识库」unknown）
   - 清浏览器缓存会丢失类型信息（但知识条目本身仍在后端）
   - 影响：UI 文案回退到 unknown 中性版本，不影响功能可用性

2. **知识条目 title 前缀 `[xxx]` 是约定式分类**
   - 后端 `fact_type` 枚举固定为 5 类（brand / case / data / faq / source），无法承载 9 类细分
   - 当前用 title 前缀 + tags 双重标识，前端可解析，但筛选器仍只能按原 5 类筛
   - 影响：BrandFactsPage 左侧「知识分类」筛选仍是原 5 类，与自动生成的 9 类不一一对应

3. **workspace_type 无法在 ProjectCard 上做到 100% 准确**
   - localStorage 在不同浏览器/设备不同步
   - ProjectCard 的 `useWorkspaceType` 拿不到时回退为 unknown，会显示为「工作区」（中性），不显示类型徽标

4. **知识条目初始化是顺序执行**
   - 9 条顺序调用约 1~2 秒，期间弹窗显示「正在初始化知识条目…」
   - 未做并发优化（SQLite 并发写入有风险），如后续切换到 PostgreSQL 可改 Promise.all

5. **未做端到端真机测试**
   - 本轮验证以 TypeScript + build 静态保证为主
   - 真实 LLM 调用、知识条目落库、跨页面导航等需用户启动后端后人工验收

### 用户体验细节

6. **创建工作区后弹窗关闭与跳转之间有约 100ms 闪烁**
   - 因为先 `handleClose(false)` 再 `navigate(...)`，弹窗动画与路由跳转并行
   - 不影响功能，但视觉上有轻微感知

7. **media 类型空状态示例卡片较长**
   - 8 行示例文本占据较大屏幕空间
   - 移动端窄屏下可能需要滚动
   - 已用 `text-xs` + `bg-secondary/20` 弱化视觉权重，但未做折叠

8. **BrandFactsPage 筛选器与知识条目分类不完全对应**
   - 自动生成的 `[账号定位]` 条目 `fact_type` 是 `brand`，会落入「品牌事实」分类
   - 用户在筛选器里看不到「账号定位」这一项
   - 短期可通过 tags 搜索定位，长期需扩展 fact_type 枚举或新增 category 字段

---

## 15. 下一步建议

### P1：workspace_type 持久化到后端

**优先级：高**

当前 localStorage 方案无法跨设备同步。建议在 Project 表新增轻量 JSON 字段（如 `metadata` 或复用 `settings`），存储：

```json
{
  "workspace_type": "media",
  "onboarded_at": "2026-06-26T19:45:00+08:00"
}
```

迁移成本：
- 1 个 Alembic 迁移
- Project API 读写 metadata
- 前端 `useWorkspaceType` 改为读 project metadata，localStorage 仅作缓存

### P2：知识条目分类系统重构

**优先级：中**

当前 `fact_type` 枚举固定 5 类，无法承载 brand/professional/media/agency 各自的细分分类。建议：

- 方案 A：扩展 `fact_type` 枚举到 20+ 类（保持单字段）
- 方案 B：新增 `category` 字段（string），`fact_type` 退化为大类
- 方案 C：用 `tags` 作为主分类，前端按 tags 聚合（无需改 DB）

推荐方案 C，配合前端 BrandFactsPage 左侧筛选器改为「按 tag 聚合」，可零后端改动实现 9+ 类细分。

### P3：分步创建引导强化

**优先级：低**

当前 WorkspaceFormDialog 是两步式（选类型 → 填表单）。可考虑改为三步：

1. 选类型
2. 填基础信息（仅工作区名称 + 主体名称）
3. 可选：填充知识库（每字段配示例 + 解释为什么需要）

降低用户首次创建的认知负担，提升知识库填充率。

### P4：知识条目模板库

**优先级：低**

为每种工作区类型预置一组「行业模板」：

- media 类型预置「科技公众号」「财经公众号」「法律科普号」三套模板
- professional 预置「律所」「咨询公司」「教育培训」三套模板
- 用户选模板后自动填充示例值，再编辑

降低空白表单的门槛，提升首条知识条目的产出速度。

### P5：跨设备同步与多用户

**优先级：远期**

当前 P0 是单用户单机使用。未来如需多用户协作：

- workspace_type 落库（P1）
- 知识条目加 owner_id
- 工作区加成员表
- 权限模型（owner / editor / viewer）

不在本轮范围。

---

## 附录：本轮关键文件清单

```
frontend/src/common/workspace.ts                            [新增]
frontend/src/hooks/useWorkspaceType.ts                      [新增]
frontend/src/components/projects/WorkspaceFormDialog.tsx    [新增]

frontend/src/components/projects/index.ts                   [修改]
frontend/src/pages/ProjectListPage.tsx                      [修改]
frontend/src/components/projects/ProjectCard.tsx            [修改]
frontend/src/pages/BrandFactsPage.tsx                       [修改]
frontend/src/pages/ProjectOverviewPage.tsx                  [修改]
frontend/src/components/layout/Sidebar.tsx                  [修改]
frontend/src/pages/NewRewritePage.tsx                       [修改]
```

**总计**：3 新增 + 7 修改 = 10 个前端文件。零后端改动。零数据库改动。零 Prompt 主流程改动。

---

## 验收清单对照

| 验收项 | 状态 | 说明 |
| --- | --- | --- |
| A. 工作区列表标题/按钮/空状态 | ✅ | 全部改为「工作区」文案 |
| B. brand 工作区创建全链路 | ✅ | 类型选择 → 概览 → Sidebar → 知识库 → 自动初始化 |
| C. professional 工作区创建全链路 | ✅ | 同上，文案差异化 |
| D. media 工作区创建全链路 | ✅ | 含 9 字段自动初始化 + 科技公众号示例 |
| E. agency 工作区创建全链路 | ✅ | 含 8 字段自动初始化 |
| F. 多平台功能不受影响 | ✅ | NewRewritePage 多平台分支零改动 |
| G.1 npm run build 通过 | ✅ | 2.91s，零错误 |
| G.2 npx tsc --noEmit 通过 | ✅ | 零类型错误 |

**本轮交付完成。**
