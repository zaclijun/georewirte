# Premium HTML Report Template Polish 报告

> 本轮优化 HTML 导出模板，使其从「卡片堆叠的开发版 HTML」升级为「客户可交付的精美可视化报告」。

---

## 一、修改了哪些文件

| # | 文件 | 操作 | 改动说明 |
|---|------|------|----------|
| 1 | `frontend/src/lib/exportHtml.ts` | 重写 | 全新封面 Hero / KPI 概览 / 左右对比 / Markdown 渲染 / 评分条 / 发布建议卡片化 / 打印优化；移除未使用的常量 |

**未修改的文件：**
- `frontend/src/lib/cleanArticle.ts` — 未改动，复制正文逻辑完全保留
- `frontend/src/pages/RewriteResultPage.tsx` — 未改动
- `frontend/src/pages/MultiPlatformResultPage.tsx` — 未改动
- `frontend/src/components/common/ExportButton.tsx` — 未改动（`format='html'` 接口不变）
- 后端全部文件 — 未改动

---

## 二、HTML 报告整体结构如何调整

### 旧结构（问题）
- 纯白 body + 普通 card 堆叠，信息层级弱
- 9 个独立 section 纵向排列，视觉单调
- 正文用 `white-space: pre-wrap` 原样展示 Markdown，符号暴露
- 发布建议输出大段 JSON `<pre>`
- 维度评分用拥挤长表格

### 新结构（客户可交付）

```
┌─────────────────────────────────────────────┐
│  封面 Hero（渐变背景 + 大标题 + meta pills）  │
│  GEO Content Optimization Report             │
│  内容优化报告 / 文章标题                       │
│  [工作区] [资产类型] [模型] [生成时间]         │
├─────────────────────────────────────────────┤
│  核心概览 KPI（3×2 网格）                      │
│  原文评分 │ 优化后评分 │ 分数变化              │
│  质量状态 │ 字数变化 │ 阅读时长                │
├──────────────────┬──────────────────────────┤
│  原文（左，淡）    │  优化后正文（右，强）       │
│  Markdown 渲染    │  Markdown 渲染            │
├──────────────────┴──────────────────────────┤
│  维度评分（评分条卡片，非表格）                 │
│  事实密度  70 → 85  [███████---]              │
├─────────────────────────────────────────────┤
│  优化建议（优先级 badge 区分颜色）              │
├─────────────────────────────────────────────┤
│  来源缺口（风险提示卡片样式）                   │
├─────────────────────────────────────────────┤
│  待补充事实                                    │
├─────────────────────────────────────────────┤
│  改写摘要 / FAQ / 发布建议（卡片化，非 JSON）   │
├─────────────────────────────────────────────┤
│  免责声明                                     │
└─────────────────────────────────────────────┘
```

### 视觉升级要点

| 维度 | 旧 | 新 |
|------|----|----|
| body 背景 | 纯白 `#fff` | 浅灰 `#f3f4f6`（卡片浮起感） |
| 最大宽度 | 960px | 1120px（更舒展） |
| 卡片圆角 | 12px | 20px（更现代） |
| 卡片阴影 | 无 | `0 8px 30px rgba(15,23,42,0.04)` |
| 封面 | 标题 + 分割线 | 渐变背景 + 大阴影 + meta pills |
| 评分 | 横向 score-row | 6 个 KPI 卡片网格 |
| 正文 | pre-wrap 原样 | Markdown 渲染（标题/引用/加粗/列表） |
| 维度评分 | 长表格 | 评分条卡片（带进度条） |
| 发布建议 | JSON `<pre>` | 字段卡片网格 + 图文卡片 |

---

## 三、封面区如何实现

```html
<header class="report-cover">
  <div class="eyebrow">GEO Content Optimization Report</div>
  <h1>内容优化报告</h1>
  <p class="report-subtitle">{文章标题}</p>
  <div class="meta-pills">
    <span class="meta-pill"><span class="pill-label">工作区</span>{name}</span>
    <span class="meta-pill"><span class="pill-label">资产类型</span>{type}</span>
    <span class="meta-pill"><span class="pill-label">模型</span>{model}</span>
    <span class="meta-pill"><span class="pill-label">生成时间</span>{time}</span>
  </div>
</header>
```

**CSS 特性：**
- `background: linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)` — 微妙渐变
- `border-radius: 24px` — 大圆角
- `box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08)` — 浮起阴影
- `eyebrow` — 蓝色小字标签，提升专业感
- `meta-pills` — 胶囊式信息标签，圆角 999px

**旧任务处理：** 已下线平台（小红书）的资产类型显示为「历史内容资产」（非「已下线平台历史内容」），并在封面下方加柔和黄色提示框「该结果来自旧版本平台任务，仅用于历史查看」，不在首屏强调。

---

## 四、KPI 概览如何实现

```html
<div class="kpi-grid">  <!-- 3列网格 -->
  <div class="kpi-card">
    <div class="kpi-label">原文评分</div>
    <div class="kpi-value muted">72</div>
  </div>
  <div class="kpi-card accent">  <!-- 蓝色渐变背景 -->
    <div class="kpi-label">优化后评分</div>
    <div class="kpi-value accent">86</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">分数变化</div>
    <div class="kpi-value kpi-delta-up">+14</div>
    <div class="kpi-sub">提升</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">质量状态</div>
    <span class="gate-badge gate-ready">建议发布</span>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">字数变化</div>
    <div class="kpi-value">201 → 949</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">阅读时长</div>
    <div class="kpi-value">1 分钟 → 2 分钟</div>
  </div>
</div>
```

**视觉特性：**
- 6 个 KPI 卡片，3 列 2 行
- 优化后评分卡片用蓝色渐变背景 `accent` 突出
- 分数变化用绿色（提升）/ 红色（下降）/ 灰色（持平）区分
- 质量门禁用柔和颜色 badge（绿/黄/红）
- 无评分时显示「—」并附「暂无评分数据」提示

---

## 五、原文 / 优化后正文对比如何实现

```html
<div class="article-compare-grid">  <!-- 2列网格 -->
  <div class="article-col before">  <!-- 左：原文，淡灰背景 -->
    <div class="article-col-head">
      <span class="article-col-title">原文</span>
      <span class="article-col-metrics">{title} · {chars} 字</span>
    </div>
    <div class="article-body">{renderMarkdownLikeHtml(content)}</div>
  </div>
  <div class="article-col">  <!-- 右：优化后，白底强权重 -->
    ...
  </div>
</div>
```

**对比设计：**
- 桌面端左右两栏（`grid-template-columns: 1fr 1fr`），≤860px 自动转上下排列
- 原文栏 `background: #fafafa` + 文字 `color: #6b7280`（淡，弱化）
- 优化后栏白底 + 文字 `color: #1f2937`（强，突出）
- 两栏宽度一致，标题栏显示字数
- 正文用 `renderMarkdownLikeHtml` 渲染，行高 1.85
- 不强制裁切高度，完整展示

---

## 六、Markdown 渲染如何实现

新增 `renderMarkdownLikeHtml(text)` 函数，**不引入 markdown 库**，轻量转换：

| Markdown | HTML 输出 |
|----------|-----------|
| `# 标题` | `<h1>标题</h1>` |
| `## 标题` | `<h2>标题</h2>` |
| `### 标题` | `<h3>标题</h3>` |
| `#### 标题` | `<h4>标题</h4>` |
| `> 引用` | `<blockquote><p>引用</p></blockquote>` |
| `**加粗**` | `<strong>加粗</strong>` |
| `- 列表` / `* 列表` / `• 列表` | `<ul><li>列表</li></ul>` |
| `1. 列表` | `<ol><li>列表</li></ol>` |
| 普通段落 | `<p>段落</p>` |
| 空行 | 段落分隔 |

**安全机制：**
1. **先 escape 全部文本**（`escapeHtml` 处理 `& < > " '`）
2. 再做安全转换（仅插入受控标签 `<h1>`/`<blockquote>`/`<strong>` 等）
3. 块级元素（ul/ol/blockquote）自动开闭，避免标签嵌套错误

**应用场景：** 原文、优化后正文、改写摘要、FAQ、待补充事实内容、发布建议字段值

**效果：** HTML 报告不再出现 `> **核心结论**`、`**加粗**`、`## 标题` 等原始 Markdown 符号。

---

## 七、发布建议 JSON 如何转成可读模块

新增 `renderPublishGuide(guide)` 函数，将 `schema_suggestions.json_ld`（PlatformPublishGuide）转为字段卡片网格：

### 渲染逻辑

```
guide.recommended_title → guideField('推荐标题', ...)
guide.cover_copy        → guideField('封面主文案', ...)
guide.tags              → guideTagsField('标签', [...])  // tag pills
guide.risk_notes        → guideListField('风险提示', [...])  // ul
guide.image_card_script → guideImageCards([...])  // 图文卡片网格
```

### 展示字段（P0）

| 类别 | 字段 |
|------|------|
| 文本字段 | recommended_title / question_title / one_sentence_answer / cover_copy / cover_subcopy / cover_summary / cover_suggestion / visual_style / opening_hook / subtitle / paragraph_style / caption / comment_prompt / publishing_notes / reusable_summary |
| 列表字段 | section_titles / answer_outline / evidence_points / misconceptions / related_questions / quote_cards / risk_notes |
| 标签字段 | tags / topics（渲染为 tag pills） |
| 图文卡片 | image_card_script（渲染为卡片网格，每张含编号/标题/正文/版式提示） |
| 文字稿 | image_text_transcript（渲染为列表） |

**不展示：** 完整 JSON、`package_type`、`canonical_content_suggestion` 原始字段名

**图文卡片渲染示例：**
```
┌─────────────────────┐
│ 第 1 张  卡片标题     │
│ 卡片正文内容…         │
│ 版式：左图右文         │
└─────────────────────┘
```

**非 PlatformPublishGuide 类型**（普通 Schema）：仍保留 `<pre>` JSON 展示，但加圆角边框美化。

---

## 八、FAQ 如何渲染

```ts
// 剥离开头重复的 ## FAQ 标题（模块本身已叫 FAQ）
const faqNormalized = faqContent.replace(/^\s*#{1,6}\s*FAQ\s*\n?/i, '').trim()
```

- FAQ 内容通过 `renderMarkdownLikeHtml` 渲染
- `## FAQ` / `### 问题` 等 Markdown 符号被转为真正标题
- 不再显示 `## FAQ` 原始符号
- 开头重复的 `## FAQ` 标题被剥离（避免与模块标题重复）

---

## 九、维度评分如何优化

### 旧：拥挤长表格
```
| 维度名称 | 改前分数 | 改后分数 | 说明（长文本）|
```

### 新：评分条卡片

```html
<div class="dimension-item">
  <div class="dimension-head">
    <span class="dimension-name">事实密度</span>
    <span>
      <span class="dimension-score before">70</span> →
      <span class="dimension-score">85</span>
    </span>
  </div>
  <div class="score-bar">
    <div class="score-bar-fill" style="width:85%"></div>  <!-- 渐变进度条 -->
  </div>
  <div class="dimension-comment">说明文字…</div>
</div>
```

**视觉特性：**
- 每个维度独立卡片，带分隔线
- 改前 → 改后分数对比（改前灰色小字，改后蓝色大字）
- 蓝色渐变进度条 `linear-gradient(90deg, #60a5fa, #2563eb)`
- 说明文字灰色小字，阅读压力低

---

## 十、旧任务如何兼容

| 场景 | 处理 |
|------|------|
| 无评分（score_before/after 为 null） | KPI 显示「—」，附「暂无评分数据」提示 |
| 无优化建议 | 「暂无优化建议」 |
| 无来源缺口 | 「暂无来源缺口」 |
| 无待补充事实 | 「暂无待补充事实」 |
| 无 FAQ / 改写摘要 / 发布建议 | 整模块隐藏 |
| 无模型信息 | 「未指定模型」 |
| 已下线平台（小红书） | 资产类型显示「历史内容资产」，封面下方加黄色提示框，不在首屏强调 |
| 评分维度 comment 含「小红书」字样 | P0 不强行改数据（不修改 score comment），但首屏已用「历史内容资产」替代，不强调 |

---

## 十一、是否影响复制正文

**否。** 复制正文功能完全不受影响。

- `cleanFinalArticle` 未改动，仍是纯净文本输出
- `RewriteResultPage` 的 3 处复制入口仍使用 `cleanedFinalArticle`（`cleanFinalArticle` 结果）
- HTML 报告用的 `renderMarkdownLikeHtml` 是独立函数，仅用于 HTML 生成，不反向影响复制正文
- 复制正文仍是无 `#` / 无 Markdown 符号 / 无 HTML 标签的纯净文本

---

## 十二、是否影响 Markdown 导出

**否。** Markdown 导出功能完全不受影响。

- `ExportButton` 的 `format='markdown'` 分支逻辑未变
- 后端 `export_service.build_markdown()` 未修改
- 后端 `export.py` API 未修改
- Markdown 导出仍走 `GET /api/outputs/:id/export?format=markdown`

---

## 十三、是否改后端 API

**否。** 本轮未修改任何后端文件。HTML 报告纯前端生成。

---

## 十四、是否改数据库

**否。** 未修改数据库 schema、migration、ORM 模型。

---

## 十五、构建验证结果

```
npx tsc --noEmit   →  通过（exit code 0，无错误）
npm run build      →  通过（2888 modules transformed，built in 4.39s）
```

构建产物：
- `dist/index.html` — 0.46 kB
- `dist/assets/index-CdgZumq7.css` — 44.77 kB（gzip 8.54 kB）
- `dist/assets/index-yekIQUVK.js` — 1,621.01 kB（gzip 468.81 kB）

Bundle 体积较上轮略增（+12 KB），主要来自 `exportHtml.ts` 的模板字符串和 `renderMarkdownLikeHtml` 函数。可接受。

---

## 十六、仍存在的问题

1. **轻量 Markdown 渲染不支持表格 / 链接 / 图片**：P0 仅支持标题/引用/加粗/列表/段落。若 `final_article` 含 GFM 表格或图片链接，会作为普通段落展示。可后续增强。

2. **非 PlatformPublishGuide 的 Schema 仍展示 JSON**：普通 JSON-LD Schema 仍用 `<pre>` 展示（已美化圆角边框），因为结构不固定无法卡片化。

3. **已下线平台 score comment 中的「小红书」字样**：P0 不改数据，仅在首屏用「历史内容资产」替代。若需彻底隐藏，需在渲染时过滤 comment 文本（P1）。

4. **图文卡片网格在小屏转单列**：≤860px 时图文卡片网格转单列，长报告会变长。可接受。

5. **Bundle 体积**：`exportHtml.ts` 增加约 12 KB，主 chunk 1.62 MB（既有问题），可通过 dynamic import 优化。

---

## 十七、下一步建议

### P1 增强

1. **Markdown 渲染增强**：支持 GFM 表格、链接（`<a target="_blank">`）、图片（`<img>`），可引入轻量 `marked` 库或继续手写扩展。

2. **已下线平台文案过滤**：在 HTML 渲染时过滤 score comment 中的「小红书」字样，替换为「该平台」。

3. **报告目录 / 锚点导航**：长报告增加顶部目录，点击跳转到对应 section。

4. **打印分页控制**：`@media print` 增加 `page-break-before` 控制，让封面、KPI、对比各自独占一页。

5. **Bundle 优化**：`exportHtml.ts` 通过 `dynamic import()` 懒加载，仅点击「导出 HTML」时加载，降低首屏体积。

6. **主题切换**：HTML 报告支持深色 / 浅色切换（当前固定白底，适合打印和客户交付）。
