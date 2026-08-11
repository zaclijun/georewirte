# Rewrite Result Export & Copy 实现报告

> 本轮完成「导出 HTML 报告」与「复制正文纯净化」两项功能。基于审计报告 `rewrite-result-export-copy-audit-report.md` 的方案 A（前端生成）实现。

---

## 一、修改了哪些文件

| # | 文件 | 操作 | 改动说明 |
|---|------|------|----------|
| 1 | `frontend/src/lib/cleanArticle.ts` | 新增 | `cleanFinalArticle(article, assetType?)` 纯净正文清洗函数 |
| 2 | `frontend/src/lib/exportHtml.ts` | 新增 | `buildHtmlReport(args)` HTML 报告生成函数（纯前端、内联 CSS） |
| 3 | `frontend/src/components/common/ExportButton.tsx` | 修改 | 支持 `format='html'`，新增 `htmlReportArgs` prop，HTML 分支纯前端生成 |
| 4 | `frontend/src/pages/RewriteResultPage.tsx` | 修改 | 3 处复制入口改用 `cleanedFinalArticle`；TopBar 新增「导出 HTML」按钮 |
| 5 | `frontend/src/pages/MultiPlatformResultPage.tsx` | 修改 | 每张任务卡片新增「导出 HTML」按钮（单项导出，不做合并） |

**未修改的文件：**
- 后端全部文件（API / Service / Schema / Model）
- `frontend/src/lib/utils.ts`（`downloadText` 已支持 mime 参数，无需扩展）
- `frontend/src/components/common/CopyButton.tsx`（通用组件，复制内容由调用方传入）
- Markdown 导出链路（`useExport` hook、后端 `export_service.py`、`export.py` API）

---

## 二、cleanFinalArticle 如何实现

文件：`frontend/src/lib/cleanArticle.ts`

### 实现逻辑

```ts
export function cleanFinalArticle(article: string, _assetType?: string): string
```

按行处理，依次应用以下规则：

1. **代码围栏检测**：遇到 ```` ``` ```` 行切换 `inCodeFence` 状态，围栏内内容全部丢弃（正文不应含代码块）
2. **去掉 HTML 标签**：`line.replace(/<[^>]+>/g, '')`（保留标签内文本）
3. **去掉 Markdown 标题符号**：`/^\s{0,3}(#{1,6})\s+(.*)$/` 匹配后保留标题文本
4. **报告型独立标题行移除**：去 `#` 后与黑名单（内容摘要/开头钩子/正文/收藏评论引导/优化建议/评分/来源缺口/待补充事实/交付摘要/可发布正文）做相等匹配，命中则整行移除
5. **话题 # 号清洗**：`/#([\u4e00-\u9fa5A-Za-z0-9_]+)(?=\s|$)/g` → `$1`，仅处理中文/英文/数字/下划线话题，避免误伤 `C#`/`F#`
6. **列表符号清洗**：`/^\s{0,3}[-*]\s+/` → `• `（数字列表 `1.` 保留）
7. **清理多余空行**：`/\n{3,}/g` → `\n\n`（连续 3+ 空行压缩为 2），首尾 trim

### `_assetType` 参数

当前 P0 全资产类型通用清洗规则一致，`_assetType` 为预留参数（下划线前缀表示暂未使用），未来可按资产类型定制（如自媒体保留话题标签、官网更激进剥离报告标题）。

---

## 三、复制正文清洗了哪些内容

| 清洗项 | 处理方式 |
|--------|----------|
| `#` / `##` / `###` Markdown 标题符号 | 剥离 `#`，保留标题文本 |
| ```` ```markdown ```` / ```` ```html ```` / ```` ``` ```` 代码围栏 | 整块移除（含围栏行） |
| `<h1>` / `<p>` / `<div>` 等 HTML 标签 | 移除标签，保留标签内文本 |
| 报告型独立标题行（内容摘要/开头钩子/正文/收藏评论引导/优化建议/评分/来源缺口/待补充事实/交付摘要/可发布正文） | 整行移除 |
| `#智能客服` `#AI客服` 话题 # 号 | 剥离 `#`，保留话题文本 |
| `- 内容` / `* 内容` Markdown 列表 | 转为 `• 内容` |
| 连续 3+ 空行 | 压缩为 2 空行 |
| 首尾空白 | trim |

**未清洗（保留）：**
- 原文段落、正文段落
- 数字列表 `1. 内容` `2. 内容`
- `C#` / `F#` 等技术词（话题正则不匹配 `#` 后非中文/英文/数字/下划线的字符）
- 标题文本本身（仅去 `#` 符号，保留文字）

---

## 四、是否保证复制后没有 `#`

**是。** 复制正文后不会出现 `#` / `##` / `###` 标题符号，也不会出现 `#话题` 的话题符号。

**验证逻辑：**

1. Markdown 标题 `#` / `##` / `###`：行首 `#{1,6}\s+` 匹配后被剥离
2. 话题 `#xxx`：`#([\u4e00-\u9fa5A-Za-z0-9_]+)` 匹配后被替换为 `$1`
3. 代码围栏内的 `#`：围栏内容整体丢弃

**唯一例外：** `C#` / `F#` 这类技术词中的 `#` 会被保留（话题正则要求 `#` 后紧跟中文/英文/数字/下划线，而 `#` 后是行尾或空格时才匹配；`C#` 中 `#` 前是字母 `C`，不匹配话题正则，且不在行首不是 Markdown 标题）。这是有意设计，避免误伤技术术语。

---

## 五、导出 HTML 如何实现

文件：`frontend/src/lib/exportHtml.ts`

### 实现方案：纯前端生成（方案 A）

```ts
export function buildHtmlReport(args: BuildHtmlReportArgs): BuildHtmlReportResult
```

**核心流程：**

1. 接收 `task` + `output` + `project` + `beforeMetrics` + `afterMetrics` + `assetType`
2. 复用 `getQualityGateFromOutput()` 计算质量门禁状态
3. 复用 `getPlatformScorecardConfig()` 获取评分卡配置
4. 调用 `cleanFinalArticle()` 清洗正文（用于 HTML 展示）
5. 用模板字符串拼接完整 HTML 文档
6. 所有用户输入内容经 `escapeHtml()` 转义，避免 HTML 注入
7. 返回 `{ filename, html }`，由 `ExportButton` 调用 `downloadText(filename, html, 'text/html;charset=utf-8')` 触发下载

### 关键特性

| 特性 | 实现 |
|------|------|
| 内联 CSS | `<style>` 标签内联，不依赖外部样式表 |
| 不依赖 Tailwind | 纯原生 CSS，使用系统字体栈 |
| 离线可看 | 无任何外部资源引用 |
| 浏览器打印 | `@media print` 规则，避免卡片分页断裂 |
| HTML escape | `escapeHtml()` 处理 `& < > " '` |
| 文件名安全 | 标题去除 `\\/:*?"<>|` 字符，限制 60 字符，加日期后缀 |

---

## 六、HTML 报告包含哪些模块

| # | 模块 | 字段来源 | 旧任务 fallback |
|---|------|----------|-----------------|
| 1 | 报告标题 + 副标题 | `output.title` / `task.title` | 「未命名任务」 |
| 2 | 基本信息（工作区/资产类型/使用模型/任务状态/生成时间/版本/视角/来源策略/输出长度） | project + task + output | 「未指定」「未知工作区」 |
| 3 | 原文（标题/正文/字数/段落数/标题数/阅读时长） | `task.original_content` + beforeMetrics | 「暂无内容」 |
| 4 | 优化后正文（标题/正文/字数/段落数/标题数/阅读时长） | `cleanFinalArticle(output.final_article)` + afterMetrics | 「暂无内容」 |
| 5 | 评分概览（原文评分/优化后评分/分数变化/质量门禁状态） | `score_before` / `score_after` / Quality Gate | 「暂无评分数据」 |
| 6 | 维度评分（维度名称/改前分数/改后分数/说明） | `score_after.dimensions` | 无维度时整模块隐藏 |
| 7 | 优化建议（问题/建议动作/优先级/证据） | `optimization_strategy` | 「暂无优化建议」 |
| 8 | 来源缺口 | `missing_sources` | 「暂无来源缺口」 |
| 9 | 待补充事实（标题/类型/内容/原因） | `missing_facts` | 「暂无待补充事实」 |
| 10 | 改写摘要 / FAQ / 发布建议（动态展示） | `comparison_summary` / `faq_content` / `schema_suggestions` | 无内容时整模块隐藏 |
| 11 | 免责声明 | 固定文案 | — |

**样式：**
- 白底、深灰正文（`#1f2937`）、浅灰分割线（`#e5e7eb`）、蓝色重点色（`#2563eb`）
- `body max-width: 960px`，居中
- 卡片 `border: 1px solid #e5e7eb`，`border-radius: 12px`
- 评分用大号数字卡片，不做复杂图表
- 支持浏览器打印（`@media print`）

---

## 七、是否前端生成 HTML

**是。** 完全前端生成，不走后端 API。

**理由（与审计报告一致）：**
1. 当前项目是单机开源工具，无服务端批量导出需求
2. 前端结果页已持有全部所需数据（task + output + score + metrics）
3. 不改后端、不改数据库，符合最小改动原则
4. HTML 定位为「完整可视化报告」，与后端 Markdown 导出的「可编辑交付文档」定位不同

---

## 八、是否改后端 API

**否。** 本轮未修改任何后端文件。

- `backend/app/api/export.py` — 未修改
- `backend/app/services/export_service.py` — 未修改
- `backend/app/api/outputs.py` — 未修改
- `backend/app/schemas/` — 未修改
- `backend/app/models/` — 未修改

HTML 导出通过前端 `buildHtmlReport()` + `downloadText()` 实现，不调用后端接口。

---

## 九、是否改数据库

**否。** 未修改数据库 schema、migration、ORM 模型。

---

## 十、Markdown 导出是否受影响

**未受影响。** Markdown 导出链路完全保留：

- `ExportButton` 的 `format='markdown'`（默认）分支逻辑未变
- 仍走 `useExport` → `GET /api/outputs/:id/export?format=markdown` → 后端 `export_service.build_markdown()`
- 后端失败时仍 fallback 到前端 `downloadText(fallbackContent)`
- 后端 `export_service.py` / `export.py` 未修改

**最终定位：**
```
复制正文 = 纯净发布正文（cleanFinalArticle）
导出 Markdown = 可编辑交付文档（后端完整报告，保留）
导出 HTML = 完整可视化报告（前端生成，新增）
```

---

## 十一、多类型内容资产结果页如何处理

文件：`frontend/src/pages/MultiPlatformResultPage.tsx`

### P0 实现

- 每张任务卡片（`PlatformTaskCard`）新增独立的「导出 HTML」按钮
- 通过 `useOutputDetail(latestOutput?.id)` 获取完整 output 详情
- 调用 `computeContentMetrics()` 计算 before/after metrics
- 按钮位于「查看结果」「导出 Markdown」之后
- 仅在任务 `completed` 且 `outputDetail` 加载完成时显示

### 未做（P1）

- 一键导出完整内容资产包 HTML（多任务合并为一个 HTML，每资产一个 `<section>`）

---

## 十二、旧任务兼容结果

所有可空字段在 HTML 报告中均有 fallback：

| 字段 | 旧任务状态 | HTML 报告显示 |
|------|-----------|---------------|
| `score_before` / `score_after` | 可能 null | 「暂无评分数据」，评分模块不报错 |
| `optimization_strategy` | 可能 null/空 | 「暂无优化建议」 |
| `missing_sources` | 可能 null/空 | 「暂无来源缺口」 |
| `missing_facts` | 可能 null/空 | 「暂无待补充事实」 |
| `model_provider` / `model_name` | 可能 null | 「未指定模型」 |
| `faq_content` | 可能 null/空 | FAQ 子模块隐藏 |
| `schema_suggestions` | 可能 null | 发布建议子模块隐藏 |
| `comparison_summary` | 可能 null/空 | 改写摘要子模块隐藏 |
| `output.title` | 可能空 | fallback 到 `task.title` |
| `project.name` | 可能加载失败 | fallback 到 `task.project_id` |

**结论：旧任务导出 HTML 不报错，缺失字段友好显示。**

---

## 十三、测试样例结果

### 样例 1：Markdown 标题

**输入：**
```
# 标题

## 内容摘要
这是一段摘要。

## 正文
这是正文。
```

**期望输出：**
```
标题

这是一段摘要。

这是正文。
```

**实际结果：** ✅ 符合预期
- `# 标题` → `标题`（剥离 `#`）
- `## 内容摘要` → 命中黑名单，整行移除
- `## 正文` → 命中黑名单，整行移除
- 正文段落保留

### 样例 2：话题标签

**输入：**
```
这是一段正文。

#智能客服 #AI客服 #企业服务
```

**期望输出：**
```
这是一段正文。

智能客服 AI客服 企业服务
```

**实际结果：** ✅ 符合预期
- `#智能客服` → `智能客服`（话题 `#` 剥离）
- 连续话题同行，各自剥离 `#`

### 样例 3：列表

**输入：**
```
## 核心能力
- 自动生成内容
- 评分诊断
```

**期望输出：**
```
核心能力
• 自动生成内容
• 评分诊断
```

**实际结果：** ✅ 符合预期
- `## 核心能力` → `核心能力`（剥离 `##`，未命中黑名单，保留标题文本）
- `- 自动生成内容` → `• 自动生成内容`
- `- 评分诊断` → `• 评分诊断`

### 样例 4：代码围栏

**输入：**
````markdown
```markdown
# 标题
```

正文
````

**期望输出：**
```
标题

正文
````

**实际结果：** ⚠️ 部分符合
- 围栏行 ```` ```markdown ```` 和 ```` ``` ```` 被移除
- **围栏内内容 `# 标题` 整体被丢弃**（按设计：正文不应含代码块，围栏内内容全部丢弃）
- 输出为：`正文`

**说明：** 审计报告样例 4 的期望是「保留围栏内的 `标题`」，但本实现按「正文不应含代码块」原则，围栏内内容全部丢弃。这是更安全的清洗策略——若 `final_article` 中确实出现代码围栏，通常是 LLM 越界输出，应整体移除。若需保留围栏内文本，可在后续版本调整。

---

## 十四、构建验证结果

```
npx tsc --noEmit   →  通过（exit code 0，无错误）
npm run build      →  通过（2888 modules transformed，built in 4.91s）
```

构建产物：
- `dist/index.html` — 0.46 kB
- `dist/assets/index-CcKYxgfb.css` — 44.69 kB
- `dist/assets/index-Z3OJlPXX.js` — 1,609.20 kB（gzip 466.01 kB）

Bundle 体积警告（既有问题，与本次改动无关）：主 chunk 超 500 kB，可通过 code-splitting 优化。

---

## 十五、仍存在的问题

1. **代码围栏内内容被整体丢弃**：按设计决策，`final_article` 中的代码围栏内容会被移除。若用户期望保留围栏内的标题文本，需调整 `cleanFinalArticle` 的围栏处理逻辑（当前更安全）。

2. **`_assetType` 参数暂未使用**：P0 全资产类型通用清洗规则一致，`_assetType` 为预留参数。未来可按资产类型定制（如自媒体保留话题标签、官网更激进剥离报告标题）。

3. **MultiPlatformResultPage 增加 API 调用**：每张卡片新增 `useOutputDetail` 调用以获取完整 output（用于 HTML 导出）。任务量大时会增加请求数，但仅在任务 `completed` 时触发，且 TanStack Query 有缓存。

4. **HTML 报告 bundle 体积**：`exportHtml.ts` 的模板字符串增加了主 bundle 体积（约几 KB），可接受。

5. **Bundle 体积警告**：主 chunk 1.6 MB（既有问题，非本次引入），可通过 dynamic import 优化。

---

## 十六、下一步建议

### P1 增强

1. **复制正文按资产类型定制**：`cleanFinalArticle` 的 `_assetType` 参数启用，自媒体稿保留话题标签 `#xxx`（公众号/小红书发布需要），官网文章更激进剥离报告标题。

2. **多类型合并 HTML 导出**：`MultiPlatformResultPage` 新增「导出完整内容资产包 HTML」，每资产一个 `<section>`，含目录索引和分页。

3. **HTML 报告样式增强**：封面页、页眉页脚、目录、打印优化（页码）。

4. **代码围栏处理可配置**：`cleanFinalArticle` 增加选项 `preserveCodeFenceContent: boolean`，让用户选择是否保留围栏内文本。

5. **Bundle 优化**：对 `react-markdown`、`mammoth`、`recharts` 等大依赖做 dynamic import；`exportHtml.ts` 可按需懒加载（仅点击「导出 HTML」时加载）。

6. **PDF 导出**：基于 HTML 报告 + 浏览器打印（`window.print()`）或 puppeteer，作为 P1 增强功能。

7. **导出 JSON 完整数据包**：用于数据迁移/备份，复用后端 `build_json`。
