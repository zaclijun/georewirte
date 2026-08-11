# 前端 UI 组件审计报告

> 文档版本：v1.0
> 生成日期：2026-06-26
> 范围：P0 五个页面对 `ui-reference/apple-style-components/` 的可复用性审计
> 原则：组件库仅作为视觉风格、组件结构、交互质感、设计 token 参考，**不作为产品需求来源**。不因组件库有额外页面/功能而扩大 P0 范围。

---

## 0. 审计结论（先看这个）

- 组件库定位是 **Apple 风格的电商/品牌官网系统（Pinguo）**，含 6 个基础组件 + 1 个完整 website kit + 38 个 SVG 图标。
- 整体视觉调性（白底、浅灰、细边框、大圆角、柔和阴影、克制蓝色强调）**与本项目「轻量内容工作台」方向高度一致**，可作为设计 token 与基础原语的来源。
- 但组件库**不包含工作台类应用所需的：Sidebar、Tab、Drawer/Sheet、Pagination、表格、状态 Badge、雷达图、Markdown 容器、表单选择器/Switch**。这些需要基于 shadcn/ui 补齐，仅复用 Apple 风格的视觉 token。
- 颜色存在轻微不一致：`README.md` 写 `#0066cc`，`colors_and_type.css` 用 `#007aff`（Apple System Blue），website kit 用 `#0071e3`。**以 `colors_and_type.css` 为 token 真源**。
- 字体方面，组件库 token 用 DM Sans + JetBrains Mono，website kit 实际用 SF Pro Display/Text。**P0 采用 SF Pro / `-apple-system` 系统字体栈**，更贴近 Apple 原生质感，且零依赖。

---

## 1. 组件文件夹目录结构

```
ui-reference/apple-style-components/
├── README.md                      # Pinguo 品牌叙事 + 实现简报
├── SKILL.md                       # Pinguo Design Skill manifest
├── colors_and_type.css            # 设计 token（颜色/字体/圆角/阴影/间距）— 真源
├── css.json                       # 程序化 token 导出
├── components.css                 # 各组件 CSS 聚合（自动生成，勿手改）
├── library-consumption.json       # 消费清单：core=button/input/card/navigation，support=product-grid/comparison-table
├── components/
│   ├── index.json                 # 组件索引（6 个组件）
│   ├── button.json                # 胶囊按钮变体
│   ├── card.json                  # 静音容器规则
│   ├── input.json                 # 圆角输入框
│   ├── navigation.json            # Apple 风导航
│   ├── product-grid.json          # 4 列商品网格
│   └── comparison-table.json      # 模型对比表
├── preview/
│   ├── component-button.html
│   ├── component-card.html
│   ├── component-comparison-table.html
│   ├── component-input.html
│   ├── component-navigation.html
│   └── component-product-grid.html
├── ui_kits/
│   └── website/
│       ├── index.html             # 完整 Apple-store 风格 website 参考（含 bento / feature-stripe / quick-links / promo-strip 等布局）
│       └── quality-report.json
└── assets/
    └── icons/                     # 38 个 lucide 风格 SVG 图标
```

**核心组件（library-consumption.json 标注）**：button / input / card / navigation
**支持组件**：product-grid / comparison-table

---

## 2. 可复用组件清单

| 组件 | 来源文件 | 变体数 | 关键结构 | 可复用度 |
|------|---------|--------|----------|----------|
| **Button** | `components/button.json` + `preview/component-button.html` | 6（primary/secondary/text × 40/48/56px × light/dark） | `container + label`，胶囊形，`border-radius: calc(var(--radius)*2)` | ⭐⭐⭐⭐⭐ 直接复用 |
| **Card** | `components/card.json` + `preview/component-card.html` | 5（standard info + media card × light/dark + disabled） | `eyebrow → title → body → cta`；1px 边框 + `shadow-md`；hover 抬升 2px | ⭐⭐⭐⭐ 结构复用，需扩展字段 |
| **Input** | `components/input.json` + `preview/component-input.html` | 4（size 40/44 × state default/focus/disabled × theme） | `leading-icon + input + clear-action`；focus 用 ring（`0 0 0 1px var(--ring)`） | ⭐⭐⭐⭐ 搜索框直接复用 |
| **Navigation（Webbar）** | `components/navigation.json` + `preview/component-navigation.html` | 5（global web / mobile tabbar × light/dark × disabled） | 44px 高，`brand + menu-items + utility-icons`；hover 用 `background: var(--secondary)` | ⭐⭐⭐ 仅参考 TopBar |
| **Product Grid** | `components/product-grid.json` + `preview/component-product-grid.html` | 4（4-up product / 4-up story / 2-up story × light/dark） | `media → eyebrow → title → price → cta`；网格 gap 8px | ⭐⭐ 仅参考网格间距 |
| **Comparison Table** | `components/comparison-table.json` + `preview/component-comparison-table.html` | 3（3 列 default / 4 列 compact × light/dark） | grid 布局 `96px + repeat(3,1fr)`；`m=metric label, h=header, v=value, n=muted, x=disabled` | ⭐⭐⭐ 改造为评分对比 |

**website kit 中的复合布局模式**（非独立组件，但可提取）：

| 布局模式 | 来源 | 结构 | 可复用度 |
|----------|------|------|----------|
| **Bento Grid** | `ui_kits/website/index.html` `.bento` | 2 列网格，`bento-card.span-2`，gray/white/dark 三种表面 | ⭐⭐⭐ 首页统计区可参考 |
| **Feature Stripe** | `.feature-stripe` | 3 列 grid，无内边框只外边框，cell 间用 1px 分隔 | ⭐⭐⭐⭐ 适合 MetricCard 横排 |
| **Quick Links** | `.quick-links` | 4 列小卡片网格（icon + title + subtitle），hover 抬升 | ⭐⭐⭐⭐ 首页快捷入口 |
| **Promo Strip** | `.promo-strip` | 3 列较大卡片（icon + title + body） | ⭐⭐⭐ 项目卡片可参考 |
| **Global Nav** | `.globalnav` | 44px sticky + `backdrop-filter: blur(20px)` 半透明 | ⭐⭐⭐⭐ TopBar 直接参考 |
| **Section + Container** | `.section` + `.container` | 80px 上下 padding，980/1440 max-width | ⭐⭐⭐⭐ 页面容器规范 |

---

## 3. 可复用样式 / Design Token 清单

来源：`colors_and_type.css`（真源） + `css.json`（程序化导出）

### 3.1 颜色（语义 token，组件库只消费语义层）

| Token | Light | Dark | 用途 |
|-------|-------|------|------|
| `--background` | `#ffffff` | `#000000` | 页面底 |
| `--foreground` | `#1d1d1f` | `#f5f5f7` | 主文字 |
| `--card` | `#ffffff` | `#1c1c1e` | 卡片底 |
| `--card-foreground` | `#1d1d1f` | `#f5f5f7` | 卡片文字 |
| `--popover` | `#ffffff` | `#3a3a3c` | 抽屉/弹层 |
| `--primary` | `#007aff` | `#2e8dff` | 主行动色（Apple System Blue） |
| `--primary-foreground` | `#ffffff` | `#000000` | 主行动色上的文字 |
| `--secondary` | `#f2f2f7` | `#1c1c1e` | 次级表面 |
| `--muted` | `#f2f2f7` | `#1c1c1e` | 静音表面 |
| `--muted-foreground` | `#8e8e93` | `#8e8e93` | 次要文字 / placeholder |
| `--accent` | `#f7f7fa` | `#3a3a3c` | 强调表面 |
| `--destructive` | `#ff3b30` | `#ff453a` | 危险/失败 |
| `--success` | `#34c759` | `#30d158` | 成功/ready |
| `--border` | `#e5e5ea` | `#3a3a3c` | 1px 边框 |
| `--input` | `#d1d1d6` | `#3a3a3c` | 输入框边 |
| `--ring` | `#007aff` | `#2e8dff` | focus ring |
| `--sidebar` | `#f2f2f7` | `#1c1c1e` | 侧栏底 |
| `--sidebar-foreground` | `#1d1d1f` | `#f5f5f7` | 侧栏文字 |
| `--sidebar-primary` | `#007aff` | `#2e8dff` | 侧栏激活态 |

**Chart token**（雷达图复用）：
- `--chart-1: #34c759`（success green）
- `--chart-2: #007aff`（brand blue）
- `--chart-3: #ff9500`（orange）
- `--chart-4: #5856d6`（indigo — 与用户「靛蓝强调」一致）
- `--chart-5: #af52de`（purple）

**适配本项目质量状态色**（review_status）：
- `ready` → `--success` `#34c759` 绿
- `review` → `#ff9500` 琥珀（用 `--chart-3`，组件库未提供语义琥珀色，需补一个 `--warning` token）
- `needs_material` → `--destructive` `#ff3b30` 红
- `exported` → `#5856d6` 靛蓝（用 `--chart-4`，或新增 `--info` token）

### 3.2 字体

```css
--font-sans: DM Sans, ui-sans-serif, sans-serif, system-ui;
--font-mono: JetBrains Mono, monospace;
--tracking-normal: 0em;
```

**P0 调整建议**：将 `--font-sans` 改为 SF Pro / 系统字体栈，更贴 Apple 原生：
```css
--font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display",
             "PingFang SC", "Helvetica Neue", Arial, sans-serif;
--font-mono: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
```
零依赖、无需引入 DM Sans webfont。

### 3.3 圆角 / 阴影 / 间距

| Token | 值 | 用途 |
|-------|----|----|
| `--radius` | `1.2rem`（约 19.2px） | 全局圆角；卡片/容器 |
| `--radius` × 2 | `2.4rem` | 按钮全胶囊 |
| `--radius` - 4px | `~15px` | 媒体/小元素内圆角 |
| `--spacing` | `0.24rem`（约 3.84px） | 间距基数 |
| 实用刻度 | `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128` | Tailwind 对齐 |
| `--shadow-2xs` | `0 1px 2px -1px rgba(0,0,0,0.04)` | hairline |
| `--shadow-xs` | `0 1px 2px 0 rgba(0,0,0,0.04)` | subtle（输入框） |
| `--shadow-sm` | `0 1px 2px 0 rgba(0,0,0,0.05), 0 1px 3px -1px rgba(0,0,0,0.05)` | card resting |
| `--shadow-md` | `0 4px 8px -2px rgba(0,0,0,0.06), 0 2px 4px -2px rgba(0,0,0,0.05)` | card hover |
| `--shadow-lg` | `0 8px 24px -8px rgba(0,0,0,0.08), 0 4px 8px -4px rgba(0,0,0,0.05)` | float/drawer |
| `--shadow-xl` | `0 16px 40px -10px rgba(0,0,0,0.10), ...` | overlay |
| `--shadow-2xl` | `0 24px 64px -12px rgba(0,0,0,0.12)` | modal |

**设计哲学**：先 1px 边框，再弱阴影，hover/overlay 才用更强阴影。

### 3.4 图标（38 个，lucide 风格）

`assets/icons/` 下 SVG 文件，本项目直接可用：
- **导航类**：`house`（首页）、`folder`/`folder-open`（事实库）、`pen-line`（新建）、`file`（历史/结果）、`box`（项目）
- **操作类**：`check`、`circle-plus`、`circle-check`、`circle-minus`、`trash-2`、`external-link`、`send-horizontal`、`arrow-right`/`arrow-left`/`arrow-up`/`arrow-down`
- **状态类**：`circle-alert`、`triangle-alert`、`circle-pause`、`circle-play`、`circle-question-mark`
- **元数据类**：`tag`、`star`、`heart`、`thumbs-up`/`thumbs-down`、`mail`、`map-pin`、`user`、`message-circle-more`
- **折叠类**：`chevron-up`/`down`/`left`/`right`、`chevrons-up-down`/`down-up`
- **工具类**：`funnel`（筛选）、`grip`（拖拽）、`mouse-pointer-click`

**建议**：P0 不直接复制 SVG 文件，改用 `lucide-react`（与 shadcn/ui 默认对齐，命名一致，体积可控）。

---

## 4. 可复用布局模式

| 模式 | 来源 | 关键 CSS | P0 应用 |
|------|------|----------|---------|
| **页面容器** | website kit `.section` + `.container` | `padding: 80px 22px` + `max-width: 980px/1440px` + `margin: 0 auto` | 5 个页面的统一外层 |
| **顶部 Bar** | website kit `.globalnav` | 44px sticky + `backdrop-filter: blur(20px)` + 半透明底 | `TopBar` 组件 |
| **统计横排** | website kit `.feature-stripe` | 3 列 grid + 1px cell 间分隔 + 外边框圆角 | 首页 4 个统计卡片（改 4 列） |
| **小卡网格** | website kit `.quick-links` | 4 列 grid + gap 12px + 小卡 22px padding + hover 抬升 2px | 首页项目卡片网格 |
| **Bento 网格** | website kit `.bento` | 2 列 grid + `span-2` + gray/white/dark 表面 | 首页可选 |
| **左右分栏** | 组件 kit 未直接提供，参考 `surface` + `field` 组合 | flex / grid `1fr 320px` | 新建任务页（左输入右配置）、结果页（左主区右 Inspector） |
| **对比表** | `comparison-table` `.t` | `grid-template-columns: 96px repeat(3,1fr)` + `m/h/v/n` cell 类型 | 改造为 ScoreCompareCard（label + before + after + delta） |
| **列表项** | `product-grid` `.card` 紧凑版 | `gap: 8px` + `padding: 10px` + 1px border | 历史任务表格行、事实列表项 |

**响应式**：website kit 给出 `@media (max-width: 734px)` 断点 — bento → 1fr、feature-stripe → 1fr、quick-links → 2 列、globalnav 横向滚动。P0 直接采用此断点策略。

---

## 5. 可复用交互动效

| 动效 | CSS | 来源 | 应用 |
|------|-----|------|------|
| **卡片 hover 抬升** | `transform: translateY(-2px)` + `box-shadow: var(--shadow-lg)` | `component-card.html` `.card:hover` | 项目卡、事实卡 |
| **卡片 hover 边色** | `border-color: var(--primary)` + `transform: translateY(-1px)` | `component-product-grid.html` `.card:hover` | 小卡网格 |
| **按钮 hover** | `filter: brightness(0.96)`（primary） / `background: var(--muted)`（secondary） / `color: var(--primary)`（text） | `component-button.html` | 所有按钮 |
| **输入框 focus** | `border-color: var(--ring)` + `box-shadow: 0 0 0 1px var(--ring)` | `component-input.html` `.field:focus-within` | 所有 input |
| **链接 hover** | `background: var(--secondary)` 圆角 999px | `component-navigation.html` `.link:hover` | Sidebar / TopBar 导航项 |
| **过渡时长** | `180ms / 200ms ease` | 各组件 | 统一用 `180ms ease` |
| **导航半透明** | `backdrop-filter: saturate(180%) blur(20px)` | website kit `.globalnav` | TopBar |

**SKILL.md 提到的 motion 规范**：`cubic-bezier(0.32, 0.72, 0, 1)` + `150ms / 250ms / 350ms` 三档。P0 可统一用 `transition: all 180ms cubic-bezier(0.32, 0.72, 0, 1)`。

---

## 6. 可直接用于本项目的组件

| 组件库组件 | 对应 P0 组件 | 复用方式 |
|-----------|-------------|----------|
| Button（primary/secondary/text） | `ExportButton`、`开始改写`、`复制正文`、`新建项目`、`新建事实` | 直接复用三档变体 + 三档尺寸；shadcn/ui 的 Button 也能用，**视觉按 Apple 胶囊形调校** |
| Input（search field） | 首页/事实库/历史页搜索框 | 直接复用 `leading-icon + input + clear-action` 结构 |
| Card（standard info） | `ProjectCard`、`BrandFactCard`、`MetricCard`、`ResultInspector` 容器 | 复用 `1px border + shadow-md + radius` 表面规则 + `eyebrow/title/body` 结构 |
| Navigation（global nav） | `TopBar` | 复用 44px 高 + sticky + blur + 圆角链接 hover 模式 |
| Comparison Table（structure） | `ScoreCompareCard` 改造 | 复用 grid 布局 + cell 类型语义（label/value/muted） |
| Feature Stripe（layout） | 首页 4 统计卡横排 | 复用外框 + cell 间 1px 分隔 + 圆角容器 |
| Quick Links（layout） | 首页项目卡网格 | 复用 4 列 grid + 小卡 + hover 抬升 |
| Icons（38 个） | 全局 | 通过 `lucide-react` 等价替换，不直接搬 SVG |
| 全套 design token | 全局 `index.css` | 直接迁移到 TailwindCSS + shadcn/ui 的 CSS 变量层 |

---

## 7. 需要改造的组件

| 组件库组件 | P0 需求 | 改造点 |
|-----------|---------|--------|
| **Card（standard）** → `ProjectCard` | 显示品牌名/描述/任务数/平均 GEO 分/最近任务时间/进入按钮 | 增加 `footer` 区（统计 + CTA 横排），保留 eyebrow + title + body 主结构 |
| **Card（standard）** → `BrandFactCard` | 显示标题/类型标签/证据等级/来源类型/链接/摘要/标签/启用开关/编辑 | 改造为 header（title + type tag + evidence badge）+ body（摘要）+ footer（tags + toggle + edit） |
| **Card（standard）** → `MetricCard` | 显示统计标签 + 大数字 + 副标 | 简化为 `label + value + delta` 三层，去掉 cta |
| **Card（standard）** → `ResultInspector` | 右侧 sticky 信息面板 | 改为 `position: sticky; top: <TopBar height>` + 内部多个 `Card` 子段（Scorecard / 雷达 / 策略 / 来源缺口） |
| **Comparison Table** → `ScoreCompareCard` | 6 维评分对比 + 改前/改后/提升 | 列改为 `维度 + 改前 + 改后 + Δ`；保留 `m/h/v/n` cell 语义；表头不再用商品名 |
| **Input（search）** | 事实库/历史页搜索 | 直接复用；增加 `onKeyDown` Enter 触发搜索 |
| **Navigation（webbar）** → `TopBar` | 顶部状态栏含标题/平台/状态/操作 | 拆为左侧（back + title + 平台 + status badge）+ 右侧（操作按钮组），不用 menu-items 结构 |

---

## 8. 不适合使用的组件

| 组件库组件 | 不适合原因 |
|-----------|-----------|
| **Product Grid（media-first 4-up）** | 本项目无产品图，强 media-first 节奏不适用；项目卡片应文字优先 |
| **Comparison Table（商品对比语义）** | 商品价格/规格对比的语义不匹配；只复用 grid 结构，不复用商品化文案与样式 |
| **Mobile TabBar** | 本项目是桌面工作台，不做移动端 tab bar |
| **Bento Card（dark + radial-gradient product-art）** | dark + radial-gradient 与「白底浅灰」方向冲突；只复用 gray/white 表面 |
| **Promo Strip（marketing tone）** | 营销卡片语气与工作台不符 |
| **website kit 的 hero / promo / footer** | 电商首页组件，不属于工作台范围 |
| **DM Sans 字体** | P0 改用 SF Pro / 系统字体栈，不引入额外 webfont |

> 重要：组件库里出现的 Apple Store 电商页面、商品对比、营销 hero、移动端 tab bar 等**都不是 P0 需求来源**。即使参考了它们的视觉，也不在本项目内实现这些功能。

---

## 9. 与 P0 五个页面的映射关系

### 9.1 项目首页（ProjectListPage）

**页面容器**：website kit `.section` + `.container`（白底，上下 80px padding，max-width 980/1440）

**顶部**：
- 页面标题：`display-3` 字号（40px / 600 / -0.015em）
- `新建项目` 按钮：Button `btn-primary btn-lg`（56px 胶囊）

**统计卡片（4 个）**：复用 **Feature Stripe** 布局
- 4 列 grid，外框 1px border + `var(--radius)` 圆角 + `shadow-sm`
- 每个 cell：`MetricCard`（label 11px uppercase muted + 大数字 28-32px tabular-nums + 副标 12px muted）
- 4 项指标：项目数 / 任务数 / 平均改后评分 / 待补充来源数

**项目卡片网格**：复用 **Quick Links** 布局（4 列 → 桌面 3 列）
- 每个 `ProjectCard`：复用 **Card（standard info）** 结构
  - `eyebrow`：品牌名（或留空）
  - `title`：项目名
  - `body`：项目描述（2 行截断）
  - `footer`：`任务数 · 平均 GEO 分 · 最近任务时间` + 进入按钮（btn-text `进入 ›`）
- hover：`translateY(-2px)` + `shadow-lg`

**进入按钮**：Button `btn-text`（48px 文字按钮 + trailing `›`）

### 9.2 品牌事实库（BrandFactsPage）

**页面容器**：同首页

**左侧筛选**：自建（组件库无 Sidebar）—— 复用 Navigation `.link` 的圆角 hover 模式
- 类型列表：`全部 / 品牌 / 产品 / 案例 / 数据 / 认证 / 其他`
- 每项 32px 高 + `padding: 0 10px` + hover `background: var(--secondary)` + 圆角 999px
- 激活态：`background: var(--accent)` + `color: var(--primary)`

**顶部**：
- 搜索框：复用 **Input（search field）** —— `leading-icon ⌕ + input + clear-action ×`，44px 高
- `新增事实` 按钮：Button `btn-primary`（40px）

**右侧事实卡片**：复用 **Card（standard info）** 改造
- `BrandFactCard` 结构：
  - header：`title` + `type tag`（小胶囊 `padding: 2px 8px` + 圆角 999px + `background: var(--accent)`） + `evidence badge`（按等级配色：conclusive/strong 用 success，moderate 用 chart-3 琥珀，weak/anecdotal 用 muted-foreground）
  - body：内容摘要（3 行截断，`color: var(--muted-foreground)`）
  - meta：来源类型 + 来源链接（`external-link` 图标）
  - footer：`tags`（多个小胶囊） + `启用/停用` Switch + `编辑` btn-text
- 卡片网格 2 列，gap 12px

**新增/编辑抽屉**：组件库**未提供**，用 shadcn/ui `Sheet`（右侧抽屉）+ 表单字段（Input / Select / Textarea / Tag input）

### 9.3 新建改写任务（NewRewritePage）

**页面容器**：同首页，但内层为左右分栏 `grid-template-columns: 1fr 360px`

**左侧（输入区）**：
- 任务标题：复用 **Input**（无 icon 版，44px）
- 原文 Markdown 输入区：组件库**未提供**，自建 `<textarea>` + 字数统计
  - 样式：`min-height: 480px` + 1px border + `var(--radius)` 圆角 + `padding: 16px`
  - focus：`border-color: var(--ring)` + `box-shadow: 0 0 0 1px var(--ring)`
  - 字体：`var(--font-mono)`（编辑态用等宽，更专业）

**右侧（配置面板 = Inspector）**：复用 **Card** 作为 sticky 容器
- `position: sticky; top: 80px`
- 内部分段：`平台 / 视角 / 来源策略 / 输出长度 / Schema 开关 / 品牌事实选择器`
- 每段：小标题（`eyebrow` 样式 11px uppercase）+ 控件
- 平台选择：4 个 chip（官网文章 / 公众号 / 知乎问答 / 小红书），单选
  - chip 样式：`padding: 8px 12px` + 1px border + 圆角 999px + 选中 `background: var(--primary); color: var(--primary-foreground)`
- 视角 / 来源策略 / 输出长度：Select 下拉（shadcn/ui Select）
- Schema 开关：Switch（shadcn/ui Switch）
- 品牌事实选择器：`FactSelector` 自建
  - 顶部搜索框（复用 Input search）
  - 列表：每项 `checkbox + 标题 + 类型标签`，最多选 20 条
  - 已选区：chip 列表 + 移除按钮
- `开始改写` 按钮：Button `btn-primary btn-lg`（56px，固定底部）

**高级参数折叠**：组件库**未提供** Accordion，用 shadcn/ui `Collapsible` 或自建 `details/summary`

### 9.4 改写结果页（RewriteResultPage）— 核心页面

**页面容器**：去掉 `.section` 上下大 padding，改为 `padding: 24px 32px`（信息密度更高）

**顶部状态栏**（自建，参考 Navigation webbar 但改造）：
- 44-56px 高，1px bottom border，`background: var(--background)` + 轻 blur
- 左：`返回` btn-text + `任务标题`（18px 600）+ `平台` chip + `RewriteStatusBadge`
- 中：`ScoreCompareCard` 迷你版（`改前 75 → 改后 90  +15`，箭头 + 提升 badge）
- 右：操作组 —— `复制正文` btn-secondary、`导出 Markdown` btn-secondary、`重新改写` btn-primary

**主体布局**：`grid-template-columns: 1fr 360px` + gap 24px

**左侧主内容区**：Tab 切换（组件库**未提供**，用 shadcn/ui `Tabs`）
- Tab 样式参考 Navigation `.link`：32px 高 + 圆角 999px + hover `var(--secondary)` + 激活 `var(--accent)`
- **Tab 1 改写正文**：`MarkdownRenderer` 容器
  - 外层 Card：1px border + radius + `padding: 32px 40px` + `shadow-sm`
  - 内文：`var(--font-sans)` + `line-height: 1.7` + 标题/列表/代码块样式（用 react-markdown + remark-gfm）
- **Tab 2 原文对比**：左右双栏，各一个 MarkdownRenderer，中间 1px 分隔
- **Tab 3 FAQ**：MarkdownRenderer，FAQ 用 `<details>` 折叠样式
- **Tab 4 Schema**：代码块容器
  - `background: var(--background-800)`（dark surface） + `color: var(--text-50)` + `var(--font-mono)` + `padding: 20px` + 圆角 + 横向滚动
  - 右上角：`复制 JSON` btn-text

**右侧 Inspector**（`ResultInspector` 组件）：复用 **Card** 作为多个子段容器
- `position: sticky; top: 80px` + `display: flex; flex-direction: column; gap: 12px`
- **子段 1：GEO Scorecard**
  - Card 内：`ScoreCompareCard` —— 复用 **Comparison Table** grid 结构改造
  - 列：`维度 + 改前 + 改后 + Δ`
  - 6 行：事实密度 / 结构清晰度 / 实体一致性 / 来源权威性 / AI 触发覆盖 / Schema 就绪度
  - 表头：`m` cell 样式（10px uppercase mono）
  - 改后分：`b .k` 样式（`color: var(--chart-2)` 强调）
  - Δ：`+N` 用 success 色，`-N` 用 destructive 色
- **子段 2：6 维雷达图**
  - `ScoreRadarChart`：用 recharts `<RadarChart>`，只复用 chart token（`--chart-1` 改前 / `--chart-2` 改后）
  - 容器：Card + `padding: 16px` + 居中
- **子段 3：优化策略**
  - `StrategyList`：列表项 = `priority badge` + `issue` + `action` + `evidence`
  - priority 配色：high → destructive、medium → chart-3 琥珀、low → muted-foreground
- **子段 4：待补充来源**
  - `SourceGapList`：每项 `circle-alert` 图标 + 文本，`color: var(--muted-foreground)`
- **子段 5：待补充事实**
  - 列表 + 每项右侧 `一键加入事实库` btn-text
- **子段 6：质量状态**
  - `ReviewStatusBadge`：大号 badge + 颜色 + 文案
  - ready → success 绿 / review → chart-3 琥珀 / needs_material → destructive 红 / exported → chart-4 靛蓝

**状态标签**：
- `RewriteStatusBadge`（任务状态）：pending → muted 灰 + `circle-pause` 图标；running → chart-3 琥珀 + spinner；completed → success 绿 + `circle-check`；failed → destructive 红 + `circle-alert`
- `ReviewStatusBadge`（质量状态）：见上

### 9.5 历史任务页（HistoryPage）

**页面容器**：同首页

**顶部**：
- 搜索框：复用 **Input（search field）**
- 状态筛选：Select（shadcn/ui）—— 全部/进行中/已完成/失败
- 平台筛选：Select —— 全部/官网文章/公众号/知乎问答/小红书（**严格 4 个 + 全部，不出现其他平台**）

**主体表格**：参考 **Comparison Table** 的 grid 思路，但改造为真正的表格
- 容器：1px border + `var(--radius)` 圆角 + `shadow-sm` + overflow hidden
- 表头：`m` cell 样式（10px uppercase mono + `background: var(--background)`）
- 行：`padding: 12px 16px` + 行间 1px `var(--border)` 分隔 + hover `background: var(--accent)`
- 字段列宽（grid）：`标题 1fr | 平台 100px | 视角 80px | 状态 100px | 改前 60px | 改后 60px | 提升 70px | 创建时间 140px | 操作 160px`
- 提升 badge：小型胶囊 `+15`（success 色）/ `-5`（destructive 色）
- 状态标签：`RewriteStatusBadge` 小号
- 操作：`查看` btn-text + `重新改写` btn-text + `导出` btn-text + `删除` btn-text（destructive 色）
- 表格要「轻」：不要传统后台厚重边框，只用 1px hairline + 大量留白

**分页**：组件库**未提供**，用 shadcn/ui `Pagination` 或自建
- 样式：圆角 999px 按钮 + hover `var(--secondary)` + 当前页 `background: var(--primary); color: var(--primary-foreground)`

**空状态**：自建 —— 居中 `folder-open` 图标（48px muted） + `暂无任务` 文案 + `新建改写任务` btn-primary

---

## 10. 关键组件复用优先级（对应任务包第六节）

| P0 组件 | 复用来源 | 改造量 | 优先级 |
|---------|---------|--------|--------|
| `AppShell` | website kit `.section + .container` + 自建侧栏布局 | 中 | 高 |
| `Sidebar` | 组件库无，参考 Navigation `.link` hover 模式自建 | 中 | 高 |
| `TopBar` | 直接复用 Navigation `.webbar` + website kit `.globalnav` blur | 小 | 高 |
| `ProjectCard` | 复用 Card（standard info）+ 扩展 footer | 中 | 高 |
| `MetricCard` | 复用 Card 简化 + feature-stripe cell | 小 | 高 |
| `BrandFactCard` | 复用 Card + 改造 header/footer | 中 | 高 |
| `FactSelector` | 复用 Input search + 自建列表 | 大 | 中 |
| `RewriteConfigPanel` | 复用 Card 作容器 + 自建表单控件 | 大 | 高 |
| `ScoreCompareCard` ⭐ | 复用 Comparison Table grid 改造 | 中 | **最高** |
| `ScoreRadarChart` ⭐ | 仅复用 chart token，用 recharts 实现 | 中（全新） | **最高** |
| `ResultInspector` ⭐ | 复用 Card 多子段容器 + sticky | 中 | **最高** |
| `MarkdownRenderer` ⭐ | 复用 Card 容器 + react-markdown 实现 | 中（全新） | **最高** |
| `RewriteStatusBadge` | 自建，配色用 semantic token | 小 | 高 |
| `ReviewStatusBadge` | 自建，配色见 §3.1 | 小 | 高 |
| `SourceGapList` | 复用 Card + 列表项 | 小 | 中 |
| `StrategyList` | 复用 Card + 列表项 + priority badge | 小 | 中 |
| `ExportButton` | 直接复用 Button `btn-secondary` | 极小 | 高 |

⭐ = 任务包标注的「最重要」组件。

---

## 11. 与 shadcn/ui 的协同策略

| 场景 | 用 Apple 风格组件库 | 用 shadcn/ui | 冲突仲裁 |
|------|---------------------|-------------|----------|
| Button / Input / Card | 视觉风格、token、hover/focus 行为 | 组件实现（含 a11y、Variant API） | **shadcn/ui 实现 + Apple token 覆盖** |
| Sidebar / Tabs / Sheet / Dialog / Select / Switch / Pagination / Tooltip | 无 | 全部用 shadcn/ui | **直接用 shadcn/ui，token 对齐 Apple** |
| 雷达图 | chart token 颜色 | recharts（非 shadcn） | **recharts + Apple chart token** |
| Markdown 渲染 | Card 容器 | react-markdown + remark-gfm | **容器用 Apple Card，渲染用 react-markdown** |
| 图标 | 38 个 lucide 风格 SVG | lucide-react | **统一用 lucide-react**（命名一致、tree-shake） |

**统一原则**（任务包第二节要求）：
1. shadcn/ui 提供组件**实现**，Apple 组件库提供**视觉 token 与质感**。
2. 在 `tailwind.config.js` + `index.css` 中将 shadcn/ui 默认 token **映射到 Apple 语义 token**（`--primary` → `#007aff` 等）。
3. 不引入 DM Sans、不引入 Apple 组件库的 CSS 文件、不复制 preview HTML。
4. 项目稳定性优先：若 Apple 风格与 shadcn/ui 默认行为冲突，**以 shadcn/ui 为准**，仅微调视觉变量。

---

## 12. P0 范围护栏（重要）

审计过程中确认以下**不属于 P0**，即使组件库或 website kit 提供了相关模式，也不在本项目实现：

- ❌ 商品/电商页面（Product Grid 的 media-first 商品卡、价格、Compare models）
- ❌ 营销 hero / promo strip / 大幅 banner
- ❌ 移动端 tab bar
- ❌ dark 主题切换（P0 仅 light）
- ❌ Apple Store 全局导航的菜单结构
- ❌ 商品对比表的「商品」语义（只复用 grid 结构）
- ❌ radial-gradient / 大面积渐变
- ❌ 任何登录/注册/MCP/发布/Prompt 管理/数据大屏相关 UI

---

## 13. 后续动作

1. ✅ 本审计文档完成
2. ⏭ 下一步：搭建前端 AppShell + Sidebar + TopBar（基于 shadcn/ui + Apple token）
3. ⏭ 在 `frontend/src/styles/globals.css` 中落地 Apple design token
4. ⏭ 制作 mock 数据（5 个页面的静态数据）
5. ⏭ 实现 5 个页面静态 UI
6. ⏭ 接入 API service + TanStack Query
7. ⏭ 任务状态轮询（每 3s）
8. ⏭ Markdown 渲染 / 复制 / 导出入口
9. ⏭ UI 自查 → 输出 `frontend-ui-review.md`
