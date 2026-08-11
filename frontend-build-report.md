# 前端构建报告（Build Report）

> 文档版本：v1.0
> 生成日期：2026-06-26
> 阶段：第二阶段 - 前端脚手架 + 静态 Mock UI
> 范围：P0 五个页面 + Enterprise 静态销售页
> 注意：本报告是 **build report**，不是最终 delivery report。前端尚未接入真实 API。

---

## 1. 已创建的前端目录结构

```
frontend/
├── index.html                          # 入口 HTML，lang=zh-CN，title=GEO 内容改写工作台
├── package.json                        # 依赖清单（React 18 + Vite 5 + TS 5.6）
├── postcss.config.js                   # Tailwind + autoprefixer
├── tailwind.config.js                  # Apple design token 映射 + shadcn/ui 语义色
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── vite.config.ts                      # @ 路径别名 + 5173 端口
├── src/
│   ├── main.tsx                        # 入口：QueryClientProvider + BrowserRouter
│   ├── App.tsx                         # 路由表（6 条路由 + 通配重定向）
│   ├── index.css                       # Apple design token（HSL）+ .prose-apple 排版
│   ├── vite-env.d.ts                   # Vite 环境变量类型
│   ├── lib/
│   │   └── utils.ts                    # cn / formatDateTime / copyToClipboard / downloadText
│   ├── types/
│   │   └── index.ts                    # 全部数据模型（Project/BrandFact/RewriteTask/Output/Score）
│   ├── common/
│   │   └── constants.ts                # 平台/视角/来源策略/事实类型/状态 meta/评分维度
│   ├── services/
│   │   └── api.ts                      # axios 实例 + 接口契约占位（P0 未接入）
│   ├── mock/
│   │   └── data.ts                     # Mock 数据：4 项目 / 8 事实 / 6 任务 / 1 完整 output
│   ├── components/
│   │   ├── ui/                         # shadcn/ui 原语（12 个）
│   │   │   ├── button.tsx              # Apple 胶囊按钮（6 variant × 6 size）
│   │   │   ├── card.tsx                # 静音容器（1px border + soft-md shadow）
│   │   │   ├── input.tsx / textarea.tsx
│   │   │   ├── badge.tsx               # 8 variant（含 success/warning/info/destructive）
│   │   │   ├── tabs.tsx                # 圆角 pill 风格 Tab
│   │   │   ├── switch.tsx / select.tsx / dialog.tsx / label.tsx / separator.tsx
│   │   │   └── empty-state.tsx
│   │   ├── layout/                     # 应用骨架
│   │   │   ├── AppShell.tsx            # 三段式外壳
│   │   │   ├── Sidebar.tsx             # 左侧导航 + 项目感知
│   │   │   ├── TopBar.tsx              # 顶部 sticky + blur
│   │   │   ├── EnterpriseCard.tsx      # Sidebar 底部销售卡片
│   │   │   ├── EnterpriseBanner.tsx    # 项目首页 Banner
│   │   │   └── EnterpriseUpgradeButton.tsx  # 事实库页升级按钮
│   │   ├── common/                     # 跨页面复用组件（8 个）
│   │   │   ├── RewriteStatusBadge.tsx  # 任务状态（pending/running/completed/failed）
│   │   │   ├── ReviewStatusBadge.tsx   # 质量状态（ready/review/needs_material/exported）
│   │   │   ├── ScoreCompareCard.tsx    # 改前→改后评分对比（含 compact 模式）
│   │   │   ├── ScoreRadarChart.tsx     # 6 维雷达图（recharts）
│   │   │   ├── MarkdownRenderer.tsx    # react-markdown + remark-gfm
│   │   │   ├── ExportButton.tsx        # 导出 Markdown（前端下载）
│   │   │   ├── SourceGapList.tsx       # 待补充来源
│   │   │   └── StrategyList.tsx        # 优化策略（含 priority badge）
│   │   ├── projects/                   # 项目首页组件
│   │   │   ├── ProjectCard.tsx
│   │   │   └── MetricCard.tsx
│   │   ├── facts/                      # 事实库组件
│   │   │   └── BrandFactCard.tsx
│   │   └── rewrite/                    # 改写相关组件
│   │       ├── FactSelector.tsx        # 事实选择器（搜索 + 多选 chip）
│   │       ├── RewriteConfigPanel.tsx  # 右侧 Inspector 配置面板
│   │       └── ResultInspector.tsx     # 结果页右侧信息面板 ⭐
│   └── pages/                          # 6 个页面
│       ├── ProjectListPage.tsx         # /projects
│       ├── BrandFactsPage.tsx          # /projects/:projectId/facts
│       ├── NewRewritePage.tsx          # /projects/:projectId/rewrite/new
│       ├── RewriteResultPage.tsx       # /tasks/:taskId/result ⭐
│       ├── HistoryPage.tsx             # /history
│       └── EnterprisePage.tsx          # /enterprise
```

**统计**：
- 源码文件 38 个（不含 node_modules / dist）
- shadcn/ui 原语 12 个
- 业务组件 17 个（layout 6 + common 8 + projects 2 + facts 1 + rewrite 3，减去 index.ts 聚合）
- 页面 6 个

---

## 2. 已完成页面

| # | 页面 | 路由 | 完成度 | 关键能力 |
|---|------|------|--------|----------|
| 1 | 项目首页 | `/projects` | ✅ 100% | Hero + Enterprise Banner + 4 统计卡（feature-stripe）+ 项目卡片网格 |
| 2 | 品牌事实库 | `/projects/:projectId/facts` | ✅ 100% | 左侧类型筛选 + 搜索 + 事实卡片网格 + 新增/编辑右侧抽屉（含表单） |
| 3 | 新建改写任务 | `/projects/:projectId/rewrite/new` | ✅ 100% | 左输入（标题+大文本区）+ 右 Inspector 配置（平台/视角/策略/长度/Schema/事实选择器）+ 高级折叠 |
| 4 | 改写结果页 | `/tasks/:taskId/result` | ✅ 100% | TopBar 状态栏 + 4 Tab（正文/对比/FAQ/Schema）+ 右侧 ResultInspector（评分对比+雷达+策略+来源缺口+待补充事实+质量状态）|
| 5 | 历史任务页 | `/history` | ✅ 100% | 搜索+状态/平台筛选 + 轻量表格（9 列）+ 操作（查看/重写/导出/删除）+ 分页 |
| 6 | Enterprise 销售页 | `/enterprise` | ✅ 100% | Hero + 4 功能特性 + 2 套餐（Team/Enterprise）+ 静态说明 |

**验收项对照**（任务包第八节）：
1. ✅ 前端能启动（`npm run dev`，端口 5173）
2. ✅ 5 个页面都能访问（curl 测试 7 条路由全部 200）
3. ✅ 页面风格统一（Apple 风格轻量工作台，白底/浅灰/细边框/大圆角/柔和阴影）
4. ✅ 只开放 4 个平台（`PLATFORMS` 常量严格 4 项：官网文章/公众号/知乎问答/小红书）
5. ✅ 结果页展示正文、FAQ、Schema、评分、优化策略、待补充来源
6. ✅ 评分雷达图正常展示（recharts RadarChart，6 维，改前/改后双图层）
7. ✅ 任务状态标签正常（RewriteStatusBadge 4 态 + ReviewStatusBadge 4 态）
8. ✅ Markdown 导出按钮存在（ExportButton，前端下载，未调后端导出接口）
9. ✅ 没有做 P0 之外的功能（无登录/发稿/MCP/数据大屏/Word 导出/CMS 等）
10. ✅ 没有把 UI 参考组件的额外业务功能带进项目（电商页面/商品对比/营销 hero 均未引入）

---

## 3. 已完成组件

### 3.1 关键组件（任务包第六节清单，13/13 完成）

| 组件 | 文件 | 复用来源 | 说明 |
|------|------|---------|------|
| AppShell | `components/layout/AppShell.tsx` | website kit `.section+.container` | 三段式外壳 |
| Sidebar | `components/layout/Sidebar.tsx` | Navigation `.link` hover 模式 | 项目感知，未选项目时子项 disabled |
| TopBar | `components/layout/TopBar.tsx` | website kit `.globalnav` | sticky + backdrop-blur |
| ProjectCard | `components/projects/ProjectCard.tsx` | Card (standard info) | hover 抬升 2px |
| MetricCard | `components/projects/MetricCard.tsx` | feature-stripe cell | label + 大数字 + delta |
| BrandFactCard | `components/facts/BrandFactCard.tsx` | Card 改造 | header+body+meta+tags+footer(toggle+edit) |
| FactSelector | `components/rewrite/FactSelector.tsx` | Input search + 自建列表 | 搜索 + 多选 chip |
| RewriteConfigPanel | `components/rewrite/RewriteConfigPanel.tsx` | Card 作容器 | sticky Inspector + 高级折叠 |
| ScoreCompareCard ⭐ | `components/common/ScoreCompareCard.tsx` | Comparison Table grid | compact/full 双模式 |
| ScoreRadarChart ⭐ | `components/common/ScoreRadarChart.tsx` | chart token + recharts | 6 维双图层 |
| ResultInspector ⭐ | `components/rewrite/ResultInspector.tsx` | Card 多子段 | sticky + 6 子段 |
| MarkdownRenderer ⭐ | `components/common/MarkdownRenderer.tsx` | Card + .prose-apple | react-markdown + remark-gfm |
| RewriteStatusBadge | `components/common/RewriteStatusBadge.tsx` | 自建 | 4 态 + icon + 旋转 spinner |
| ReviewStatusBadge | `components/common/ReviewStatusBadge.tsx` | 自建 | 4 态（ready 绿/review 琥珀/needs_material 红/exported 靛蓝）|
| SourceGapList | `components/common/SourceGapList.tsx` | Card + 列表 | AlertCircle 图标 |
| StrategyList | `components/common/StrategyList.tsx` | Card + 列表 | priority badge（高/中/低） |
| ExportButton | `components/common/ExportButton.tsx` | Button btn-secondary | 前端下载 + 完成态反馈 |

⭐ = 任务包标注的「最重要」组件，5 个全部完成。

### 3.2 shadcn/ui 原语（12 个）

button / card / input / textarea / badge / tabs / switch / select / dialog / label / separator / empty-state

全部基于 Radix UI，视觉 token 对齐 Apple 风格。

---

## 4. 已落地的 Apple design token

来源：`ui-reference/apple-style-components/colors_and_type.css`（真源）

落地位置：`frontend/src/index.css` + `frontend/tailwind.config.js`

### 4.1 颜色（HSL，兼容 shadcn/ui）

| Token | HSL | Hex | 用途 |
|-------|-----|-----|------|
| `--background` | `0 0% 100%` | `#ffffff` | 页面底 |
| `--foreground` | `240 4% 11%` | `#1d1d1f` | 主文字 |
| `--card` | `0 0% 100%` | `#ffffff` | 卡片底 |
| `--primary` | `211 100% 50%` | `#007aff` | Apple System Blue |
| `--secondary` | `240 12% 95%` | `#f2f2f7` | 次级表面 |
| `--muted` | `240 12% 95%` | `#f2f2f7` | 静音表面 |
| `--muted-foreground` | `240 5% 55%` | `#8e8e93` | 次要文字 |
| `--accent` | `240 25% 98%` | `#f7f7fa` | 强调表面 |
| `--destructive` | `6 100% 60%` | `#ff3b30` | 危险 |
| `--success` | `142 64% 45%` | `#34c759` | 成功（Apple System Green） |
| `--warning` | `36 100% 50%` | `#ff9500` | 琥珀（组件库未提供，补充） |
| `--info` | `243 75% 59%` | `#5856d6` | 靛蓝强调（与用户「少量靛蓝」一致） |
| `--border` | `240 9% 90%` | `#e5e5ea` | 1px 边框 |
| `--input` | `240 9% 83%` | `#d1d1d6` | 输入框边 |
| `--ring` | `211 100% 50%` | `#007aff` | focus ring |
| `--sidebar` | `240 12% 95%` | `#f2f2f7` | 侧栏底 |
| `--chart-1` | `142 64% 45%` | `#34c759` | 雷达图改前 |
| `--chart-2` | `211 100% 50%` | `#007aff` | 雷达图改后 |
| `--chart-3` | `36 100% 50%` | `#ff9500` | 中等优先级 |
| `--chart-4` | `243 75% 59%` | `#5856d6` | exported 状态 |
| `--chart-5` | `285 73% 58%` | `#af52de` | 备用 |

### 4.2 字体

```css
--font-sans: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display',
             'PingFang SC', 'Helvetica Neue', Arial, sans-serif;
--font-mono: 'SF Mono', 'JetBrains Mono', ui-monospace, monospace;
```

✅ 使用 SF Pro / 系统字体栈，**未引入 DM Sans**（按要求）。

### 4.3 圆角 / 阴影 / 间距

- `--radius: 1.2rem`（与组件库对齐）
- 阴影：`soft-sm` / `soft-md` / `soft-lg` / `soft-xl`（自定义，对应组件库 shadow-xs/md/lg/xl）
- 过渡曲线：`cubic-bezier(0.32, 0.72, 0, 1)`（apple timing function）
- 动效时长：200ms 默认

### 4.4 排版

- `.prose-apple`：Markdown 渲染容器，含 h1-h4 / p / ul / ol / code / pre / blockquote / table / hr 全套样式
- `.text-eyebrow`：11px uppercase 0.08em letter-spacing（复用 component-card eyebrow）
- `.nums`：tabular-nums 数字（复用 product-grid price 样式）

---

## 5. Mock 数据位置

**唯一入口**：`frontend/src/mock/data.ts`

| 导出 | 类型 | 数量 | 用途 |
|------|------|------|------|
| `mockProjects` | `Project[]` | 4 | 项目首页卡片、其他页 project lookup |
| `mockBrandFacts` | `BrandFact[]` | 8（全部 proj-001） | 事实库列表、FactSelector |
| `mockTasks` | `RewriteTask[]` | 6（5 proj-001 + 1 proj-002） | 历史任务表格、结果页 task lookup |
| `mockOutput` | `RewriteOutput` | 1（对齐 task-001） | 结果页完整渲染（正文/FAQ/Schema/评分/策略/来源/事实） |

**Mock 数据特征**：
- 字段严格对齐 `src/types/index.ts` 与接口契约草案
- 包含完整的 6 维 score_before / score_after（用于雷达图）
- 包含 5 条优化策略、3 条待补充来源、2 条待补充事实
- review_status = `review`（展示琥珀色状态）
- 任务状态覆盖 pending/running/completed/failed 四态

**未接入真实 API**：所有页面直接 `import { mockXxx } from '@/mock/data'`，未走 axios / TanStack Query。

---

## 6. 路由列表

定义于 `frontend/src/App.tsx`：

| 路径 | 页面组件 | 说明 |
|------|---------|------|
| `/` | `<Navigate to="/projects">` | 根路径重定向 |
| `/projects` | `ProjectListPage` | 项目首页 |
| `/projects/:projectId/facts` | `BrandFactsPage` | 品牌事实库 |
| `/projects/:projectId/rewrite/new` | `NewRewritePage` | 新建改写任务 |
| `/tasks/:taskId/result` | `RewriteResultPage` | 改写结果页 |
| `/history` | `HistoryPage` | 历史任务页 |
| `/enterprise` | `EnterprisePage` | Enterprise 静态销售页 |
| `*` | `<Navigate to="/projects">` | 通配重定向 |

**验证结果**（python3 urllib 测试，dev server 运行中）：
```
200 /
200 /projects
200 /history
200 /enterprise
200 /projects/proj-001/facts
200 /projects/proj-001/rewrite/new
200 /tasks/task-001/result
```
全部 7 条路由返回 200。

---

## 7. 启动方式

### 7.1 开发模式

```bash
cd frontend
npm install        # 首次需要
npm run dev        # 启动 Vite dev server
```

访问 `http://localhost:5173/`，自动重定向到 `/projects`。

### 7.2 生产构建

```bash
cd frontend
npm run build      # tsc -b && vite build
npm run preview    # 预览生产包
```

构建产物：`frontend/dist/`
- `dist/index.html`：0.46 kB
- `dist/assets/index-*.css`：35.65 kB（gzip 6.85 kB）
- `dist/assets/index-*.js`：900.52 kB（gzip 273.94 kB）

### 7.3 环境变量（可选）

```bash
# .env.local
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

P0 阶段未使用，留待下一阶段接入真实 API。

### 7.4 技术栈版本

| 依赖 | 版本 | 说明 |
|------|------|------|
| React | 18.3.1 | 按要求（非 19） |
| TypeScript | 5.6.3 | |
| Vite | 5.4.11 | 按要求（非 8） |
| TailwindCSS | 3.4.17 | |
| @radix-ui/* | latest | shadcn/ui 底层 |
| @tanstack/react-query | 5.62.7 | 已注入 Provider，P0 未使用 |
| axios | 1.7.9 | 已配置实例，P0 未调用 |
| react-markdown | 9.0.1 | + remark-gfm 4.0.0 |
| recharts | 2.15.0 | 雷达图 |
| lucide-react | 0.469.0 | 图标 |
| react-router-dom | 6.28.0 | |

---

## 8. 当前未接入的真实 API

**全部接口均未接入**，P0 仅使用 Mock 数据。`frontend/src/services/api.ts` 已预置 axios 实例与接口契约占位，下一阶段可直接接入。

| 接口 | 方法 | 路径 | 当前状态 |
|------|------|------|---------|
| 项目列表 | GET | `/projects` | ❌ 未接入（用 mockProjects） |
| 事实列表 | GET | `/projects/:projectId/facts` | ❌ 未接入（用 mockBrandFacts） |
| 新增事实 | POST | `/projects/:projectId/facts` | ❌ 未接入（弹窗仅 console.info） |
| 编辑事实 | PATCH | `/facts/:factId` | ❌ 未接入 |
| 切换事实启用 | PATCH | `/facts/:factId` | ❌ 未接入（仅 console.info） |
| 任务列表 | GET | `/tasks` | ❌ 未接入（用 mockTasks） |
| 创建任务 | POST | `/tasks` | ❌ 未接入（提交后直接跳转结果页） |
| 任务详情 | GET | `/tasks/:taskId` | ❌ 未接入（用 mockTasks.find） |
| 改写结果 | GET | `/tasks/:taskId/output` | ❌ 未接入（用 mockOutput） |
| 导出 Markdown | POST | `/tasks/:taskId/export` | ❌ 未接入（ExportButton 走前端下载） |
| 任务状态轮询 | GET | `/tasks/:taskId` | ❌ 未接入（无 polling） |

**TanStack Query**：已在 `main.tsx` 注入 `QueryClientProvider`，但 P0 未定义任何 `useQuery` hook。下一阶段可在 `src/hooks/` 下补充。

---

## 9. 已知问题

### 9.1 功能性

| # | 问题 | 影响 | 优先级 | 建议 |
|---|------|------|--------|------|
| 1 | 事实新增/编辑表单保存仅 `console.info`，不实际写入 mock | 用户操作后列表无变化 | 中 | 下一阶段接入 POST/PATCH 接口 |
| 2 | 事实启用/停用 toggle 仅 `console.info` | UI 状态不持久 | 中 | 同上 |
| 3 | 新建改写任务提交后直接跳转 `task-001` 结果页 | 无法看到真实新建任务的结果 | 高 | 接入 POST /tasks + 轮询 |
| 4 | 历史任务页删除按钮无确认弹窗 | 误操作风险 | 中 | 加 ConfirmDialog |
| 5 | 历史任务页 ExportButton content 为空字符串 | 导出空文件 | 中 | 应从 output 获取 final_article |
| 6 | 任务状态轮询未实现 | running 状态不会自动更新 | 高 | 下一阶段 TanStack Query refetchInterval |
| 7 | 结果页 `重新改写` 按钮仅 1s 动画，无实际调用 | 演示性质 | 中 | 接入 POST /tasks（基于现有 task） |

### 9.2 视觉/交互

| # | 问题 | 影响 | 优先级 |
|---|------|------|--------|
| 8 | 生产包 900kB（recharts + react-markdown 较大） | 首屏加载稍慢 | 低（P0 可接受） |
| 9 | 未做代码分割（route-level code splitting） | 同上 | 低 |
| 10 | 表格在窄屏下列会挤压（9 列 grid 固定宽度） | <1280px 体验下降 | 中（可加横向滚动） |
| 11 | dark 模式未实现 | 当前仅 light | 低（P0 不要求） |

### 9.3 架构

| # | 问题 | 影响 | 优先级 |
|---|------|------|--------|
| 12 | `services/api.ts` 的 `extract` 辅助函数类型推断较弱 | 类型不严格 | 中（接入真实 API 时重构） |
| 13 | `BrandFactCard` 的 `Badge variant` 用了 `as never` 绕过类型 | 类型安全略弱 | 低 |
| 14 | Mock 数据集中在单文件，无分模块 | 数据量增大后难维护 | 低（P0 数据量小） |

---

## 10. 下一步建议

### 10.1 立即推进（第三阶段：接入真实 API）

1. **接入接口契约草案**
   - 在 `src/hooks/` 下创建 `useProjects` / `useFacts` / `useTasks` / `useOutput` 等 TanStack Query hooks
   - 替换页面中的 `import { mockXxx }` 为 `useQuery`
   - 配置 `.env.local` 的 `VITE_API_BASE_URL`

2. **任务状态轮询**
   - `useTask(taskId)` 配置 `refetchInterval: 3000`，当 `status === 'running'` 时持续轮询
   - 完成后自动跳转结果页

3. **真实导出接口**
   - `ExportButton` 调用 `POST /tasks/:taskId/export`，获取下载 URL
   - 失败时回退到前端下载（用 `final_article`）

4. **删除确认**
   - 为历史任务页删除按钮加 `ConfirmDialog`（可用现有 Dialog 组件）

### 10.2 中期优化

5. **代码分割**
   - 用 `React.lazy` + `Suspense` 按路由分割
   - recharts 改为动态 import（结果页才需要）

6. **响应式适配**
   - 表格加横向滚动容器
   - Sidebar 在 <1024px 折叠为 hamburger 菜单

7. **类型强化**
   - 重构 `services/api.ts` 的响应拦截器类型
   - 移除 `as never` 类型绕过

### 10.3 P1 候选（不在 P0 范围）

- 登录注册
- 多品牌工作空间切换
- 任务版本对比（v1 vs v2 diff）
- 事实库批量导入（CSV/JSON）
- Schema 可视化编辑器
- 真实 Enterprise 销售流程（CRM 对接）

---

## 11. 验收清单（任务包第八节）

| # | 验收项 | 状态 | 证据 |
|---|--------|------|------|
| 1 | 前端能启动 | ✅ | `npm run dev` 成功，端口 5173 |
| 2 | 5 个页面都能访问 | ✅ | 7 条路由 curl 全部 200 |
| 3 | 页面风格统一 | ✅ | Apple token 全局落地，所有组件走 shadcn/ui + Apple 视觉 |
| 4 | 只开放 4 个平台 | ✅ | `PLATFORMS` 常量严格 4 项，UI 仅渲染这 4 项 |
| 5 | 结果页展示正文/FAQ/Schema/评分/策略/来源 | ✅ | 4 Tab + ResultInspector 6 子段 |
| 6 | 评分雷达图正常 | ✅ | recharts RadarChart 6 维双图层 |
| 7 | 任务状态标签正常 | ✅ | RewriteStatusBadge 4 态 + ReviewStatusBadge 4 态 |
| 8 | Markdown 导出按钮存在 | ✅ | ExportButton 前端下载（未调后端，符合 P0） |
| 9 | 没有做 P0 之外的功能 | ✅ | 无登录/发稿/MCP/数据大屏/Word/CMS 等 |
| 10 | 没有把 UI 参考组件的额外业务功能带进项目 | ✅ | 电商页面/商品对比/营销 hero 均未引入 |

---

## 12. 文件清单（关键文件）

| 类别 | 文件路径 |
|------|---------|
| 入口 | `frontend/src/main.tsx` / `App.tsx` / `index.css` |
| 配置 | `frontend/package.json` / `tailwind.config.js` / `vite.config.ts` / `tsconfig.app.json` |
| 类型 | `frontend/src/types/index.ts` |
| 常量 | `frontend/src/common/constants.ts` |
| Mock | `frontend/src/mock/data.ts` |
| API 占位 | `frontend/src/services/api.ts` |
| 工具 | `frontend/src/lib/utils.ts` |
| 布局 | `frontend/src/components/layout/{AppShell,Sidebar,TopBar,EnterpriseCard,EnterpriseBanner,EnterpriseUpgradeButton}.tsx` |
| UI 原语 | `frontend/src/components/ui/*.tsx`（12 个） |
| 通用组件 | `frontend/src/components/common/*.tsx`（8 个） |
| 业务组件 | `frontend/src/components/{projects,facts,rewrite}/*.tsx`（6 个） |
| 页面 | `frontend/src/pages/*.tsx`（6 个） |

---

**报告结束。下一阶段：接入真实 API + TanStack Query + 任务状态轮询。**
