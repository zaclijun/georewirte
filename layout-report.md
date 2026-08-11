# Layout Window 重构报告（Workspace 层）

> 本次不修补 className，而是从 Workspace 层重新组织页面布局。
> 范围：Layout / 信息层级 / 视觉节奏；不涉及业务功能、API、Hooks、业务逻辑。
> 目标：Apple Workspace 风格的统一阅读路径与信息层级。

---

## 0. 重构总览

| 维度 | 旧方案 | 新方案 |
|------|--------|--------|
| 容器节奏 | 5 页面各自 `mx-auto max-w-6xl px-8 py-X`，4 种间距 | AppShell 内建 Workspace token，3 种 variant（standard/wide/full） |
| 信息层级 | TopBar 塞满 标题+评分+按钮，无层级 | TopBar L0/L1/L2/L3 四段 + 正文 L3' Hero Band + L4 正文 |
| Result 比例 | `1fr_360px`（≈69/31） | `65fr_35fr`（精确 65/35） |
| History 宽度 | `max-w-6xl` (1152px) | `wide` variant (1600px) |
| Sidebar | 4 项扁平 | 3 组分组（工作台/当前项目/全局）+ eyebrow |
| sticky 偏移 | `top-[72px]` 散落 | `.workspace-sticky` 统一 `--workspace-sticky-top: 80px` |
| 模块间距 | `mt-4`/`mt-6`/`mb-8` 混用 | `.workspace-stack` 统一 `gap-6` |
| Polling | ✅ 已正确 | 未触碰（符合约束） |

**构建验证**：`tsc --noEmit` + `vite build` 均通过。

---

## 1. Workspace 设计 Token（信息架构基线）

在 [index.css](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/index.css) 建立 3 类语义 token：

### 1.1 容器节奏 token
```css
--workspace-maxw: 1200px;        /* 标准内容区 */
--workspace-maxw-wide: 1600px;   /* 宽幅内容区（History） */
--workspace-px: 32px;            /* 左右内边距 */
--workspace-pt: 24px;            /* 距 Header 顶部 */
--workspace-pb: 40px;            /* 底部留白 */
--workspace-gap: 24px;           /* 模块间垂直节奏 */
--workspace-gap-sm: 16px;        /* 卡内元素节奏 */
```

### 1.2 信息层级 token（Apple 风格五层阅读路径）
```css
--tier-breadcrumb: 11px;   /* L0 面包屑：轻、低饱和 */
--tier-title: 17px;        /* L1 标题：semibold */
--tier-status: 12px;       /* L2 状态徽章 */
--tier-hero: 32px;         /* L3 关键成果数字 */
--tier-body: 15px;         /* L4 正文 */
```

### 1.3 TopBar 几何 token
```css
--topbar-h: 56px;                  /* TopBar 高度 */
--workspace-sticky-top: 80px;      /* sticky 元素统一偏移（topbar + pt） */
```

### 1.4 配套工具类
- `.workspace` / `.workspace--wide` / `.workspace--full` — 三种内容区 variant
- `.workspace-stack` / `.workspace-stack-sm` — 模块间节奏（替代散落的 mt-*）
- `.workspace-sticky` — sticky 元素统一偏移与最大高度

---

## 2. AppShell 重构

**文件**：[AppShell.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/layout/AppShell.tsx)

**核心变化**：AppShell 不再是"裸 main + 各页自行决定容器"，而是内建 Workspace 容器节奏。

```tsx
variant?: 'standard' | 'wide' | 'full' | 'bare'
```

| variant | 用途 | max-width | 适用页面 |
|---------|------|-----------|---------|
| standard | 标准内容区 | 1200px | Project / New Rewrite / Result |
| wide | 宽幅数据密度页 | 1600px | History |
| full | 双栏布局撑满 | 100% | Brand Facts |
| bare | 不套容器（加载/失败态） | — | Result 加载/失败/进行中态 |

**意义**：各页面不再写 `mx-auto max-w-6xl px-8 py-X`，节奏由 AppShell 统一承载。

---

## 3. TopBar 重构 — 信息层级建立

**文件**：[TopBar.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/layout/TopBar.tsx)

**核心变化**：从"传什么渲染什么"的 dumb component，变为承载 L0-L3 四层阅读路径的结构化 API。

```tsx
<TopBar
  breadcrumb={...}  // L0 面包屑：← 历史 / ← 项目
  title={...}       // L1 标题 + L2 状态徽章
  actions={...}     // L3 操作区
/>
```

**信息层级**：
- **L0 breadcrumb** — 知道在哪（11px、低饱和、muted）
- **L1 title** — 知道是什么（17px、semibold）
- **L2 status** — 知道当前状态（与 title 同段，徽章形式）
- **L3 actions** — 知道能做什么（按钮组，右对齐）

**几何**：高度用 `style={{ height: 'var(--topbar-h)' }}`，padding 改为 `px-8`（与正文对齐）。

---

## 4. Sidebar 重构 — 信息架构分组

**文件**：[Sidebar.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/layout/Sidebar.tsx)

**核心变化**：从 4 项扁平列表，改为 3 组分组结构。

```
工作台            （首组无 eyebrow，避免顶部下沉）
  └ 项目          /projects

当前项目          （依赖 projectId，未选则灰显）
  └ 品牌事实库    /projects/:id/facts
  └ 新建改写      /projects/:id/rewrite/new

全局
  └ 历史任务      /history

─────────────────
Enterprise Card（底部，与分组脱钩）
```

**实现**：`NavGroup[]` 数据结构，每组可选 `label`（eyebrow），首组省略 label 避免顶部下沉。`disabled` 逻辑保留，仅视觉分组。

---

## 5. Result Page 重构 — 首屏信息层级（核心）

**文件**：[RewriteResultPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/RewriteResultPage.tsx)

### 5.1 旧方案问题
- TopBar 同时塞：返回 / 标题 / 平台 Badge / 状态 Badge / **评分对比(compact)** / 复制 / 导出 / 重新改写
- 评分对比被压成一行小字 `改前 72 → 改后 89 +17`，核心成果数据信息密度过低
- 标题、状态、操作、成果指标全挤在 56px TopBar，无视觉层级

### 5.2 新方案 — 五层阅读路径

```
L0  TopBar 面包屑      ← 历史       (11px muted)
L1  TopBar 标题        ← 任务标题    (17px semibold)
L2  TopBar 状态        ← 平台 + 状态 Badge
L3  TopBar 操作区      ← 复制 / 导出 / 重新改写
─────────────────────────────────────
L3' 成果摘要带(正文顶)  ← 改前→改后评分(32px大字) + 质量状态 + 元信息
L4  正文 65% / Inspector 35%
```

### 5.3 ResultHeroBand（新增的内联组件）

正文顶部新增"成果摘要带"，把评分从 TopBar 移出，用 `--tier-hero: 32px` 大字呈现：

```
┌─────────────────────────────────────────────────────┐
│ 改前  72 → 改后  89  [+17]  │ 质量状态  review   │ Acme · v3 │
└─────────────────────────────────────────────────────┘
```

- 评分用 32px 大字（`--tier-hero`），首屏可见，不再是 TopBar 的小字
- 用 `ChevronRight` 替代 `ArrowRight`，更符合 Apple 静音风格
- 质量状态、项目版本作为右侧元信息

### 5.4 正文 / Inspector 比例

```diff
- lg:grid-cols-[1fr_360px]
+ lg:grid-cols-[65fr_35fr]
```

在 1200px 容器下：左 ≈ 758px、右 ≈ 408px，精确 65/35。Inspector 随容器伸缩，不再固定 360px。

### 5.5 加载/失败/进行中态

用 `variant="bare"` + 内部 `.workspace` 容器，`pt-24` 让提示卡出现在首屏上 1/3（Apple 加载态习惯），不再 `py-20` 下沉。

### 5.6 ResultInspector 精简

**文件**：[ResultInspector.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/rewrite/ResultInspector.tsx)

- 移除顶部「质量状态」卡（已在 Hero Band 展示，避免重复）
- 移除「评分对比」卡（已在 Hero Band 展示）
- 本面板聚焦"诊断细节"：雷达图 / 优化策略 / 来源缺口 / 待补充事实
- sticky 偏移改用 `.workspace-sticky`（统一 `--workspace-sticky-top`）

---

## 6. History Page 重构 — 表格为主信息载体

**文件**：[HistoryPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/HistoryPage.tsx)

```diff
- <AppShell topBar={<div>...历史任务...</div>}>
-   <div className="mx-auto max-w-6xl px-8 py-8">
+ <AppShell variant="wide" topBar={<TopBar title={...} actions={...} />}>
+   <div className="workspace-stack">
```

- 用 `wide` variant（1600px），9 列表格在 1440px/1920px 屏幕不再两侧大留白
- TopBar 用新结构（title + actions）
- 模块间用 `.workspace-stack`（gap-6），替代 `mb-6`

---

## 7. Project / Brand Facts / New Rewrite 节奏对齐

### 7.1 ProjectListPage
- TopBar 改为新结构（title + actions=新建项目按钮）
- 内容用 `.workspace-stack`（gap-6），移除 `mb-8` 散落间距
- Hero / Banner / 统计卡 / 项目网格 四段，垂直节奏统一

### 7.2 BrandFactsPage
- `variant="full"`（双栏布局撑满）
- TopBar 用新结构：breadcrumb(← 项目) + title(项目名 + 事实数 Badge) + actions(新增事实)
- 左侧筛选栏改用 `.workspace-sticky`，与正文顶部对齐
- 左右栏从同一 workspace 容器出发，顶部对齐
- 移除原有的 `border-r` 分割（用 `gap-6` 替代，更 Apple 静音风格）

### 7.3 NewRewritePage
- TopBar 用新结构：breadcrumb(← 项目) + title(新建改写任务)
- 正文/配置 改 `65fr_35fr`，与 Result Page 一致
- 配置面板用 `.workspace-sticky`，sticky 偏移统一

---

## 8. Polling 检查（未触碰）

经核查 [useTaskStatus.ts](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/hooks/useTaskStatus.ts) 完全正确：

| task.status | isActive | refetchInterval | 行为 |
|-------------|----------|-----------------|------|
| pending | true | 3000 | 每 3s 轮询 ✅ |
| running | true | 3000 | 每 3s 轮询 ✅ |
| completed | false | false | 停止 ✅ |
| failed | false | false | 停止 ✅ |

**本次重构未修改任何 hooks**，符合"不修改 Hooks"约束。

---

## 9. 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| [index.css](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/index.css) | 新增 token | Workspace 节奏 + 信息层级 + TopBar 几何 + 工具类 |
| [AppShell.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/layout/AppShell.tsx) | 重构 | 内建 Workspace 容器节奏，4 种 variant |
| [TopBar.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/layout/TopBar.tsx) | 重构 | L0/L1/L2/L3 四段结构化 API |
| [Sidebar.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/layout/Sidebar.tsx) | 重构 | 3 组分组 + eyebrow |
| [RewriteResultPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/RewriteResultPage.tsx) | 重构 | 评分移出 TopBar，新增 Hero Band，65/35 比例 |
| [ResultInspector.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/components/rewrite/ResultInspector.tsx) | 精简 | 移除重复的质量状态/评分对比，用 .workspace-sticky |
| [HistoryPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/HistoryPage.tsx) | 重构 | wide variant + TopBar 新结构 |
| [ProjectListPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/ProjectListPage.tsx) | 重构 | TopBar 新结构 + workspace-stack |
| [BrandFactsPage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/BrandFactsPage.tsx) | 重构 | full variant + TopBar 新结构 + sticky 左栏 |
| [NewRewritePage.tsx](file:///Users/zachary/Downloads/geo-rewrite-skill/frontend/src/pages/NewRewritePage.tsx) | 重构 | TopBar 新结构 + 65/35 + .workspace-sticky |

---

## 10. 不在本次范围（明确排除）

- ❌ 不开发新功能
- ❌ 不修改 API（services/api.ts 及后端）
- ❌ 不修改 Hooks（useTaskStatus / useRewriteTasks / useRewriteOutput 等数据层）
- ❌ 不修改业务逻辑（mutation / 状态机 / 路由守卫）
- ✅ 仅重构 Layout / 信息层级 / 视觉节奏

---

## 11. 构建验证

```
$ npx tsc --noEmit -p tsconfig.app.json    # ✅ 通过
$ npm run build                             # ✅ 通过，2862 modules，3.04s
```

无 TypeScript 错误，无构建错误，所有页面路由可正常渲染。
