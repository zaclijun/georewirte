# Rewrite Result Export & Copy 审计报告

> 本轮只做审计，不改代码。报告基于对结果页、导出链路、复制链路的真实代码阅读。

---

## 一、当前结果页字段审计

### 1.1 单任务结果页 `RewriteResultPage.tsx` 可用字段

| 来源 | 字段 | 类型 | 用途 |
|------|------|------|------|
| `task` (RewriteTask) | `title` | str | 报告标题 / 文件名 |
| `task` | `original_content` | str | 原文正文 |
| `task` | `publish_platform` | str | 内容资产类型（旧值经 `mapPlatformToAssetType` 映射） |
| `task` | `perspective` | str | 视角 |
| `task` | `source_policy` | str | 来源策略 |
| `task` | `output_length` | str | 输出长度 |
| `task` | `status` | str | 任务状态 |
| `task` | `model_config_id` / `model_provider` / `model_name` | str | 使用模型 |
| `task` | `created_at` / `updated_at` | datetime | 创建 / 更新时间 |
| `task` | `error_message` | str | 失败原因 |
| `project` (Project) | `name` | str | 工作区名称 |
| `output` (RewriteOutput) | `title` | str? | 优化后标题 |
| `output` | `final_article` | str | **优化后正文（核心字段）** |
| `output` | `faq_content` | str? | FAQ 内容 |
| `output` | `schema_suggestions` | JSON? | Schema / 平台发布建议 |
| `output` | `optimization_strategy` | List? | 优化策略 |
| `output` | `comparison_summary` | str? | 改写摘要 |
| `output` | `missing_sources` | List[str]? | 来源缺口 |
| `output` | `missing_facts` | List? | 待补充事实 |
| `output` | `review_status` | str? | 审核状态 |
| `output` | `version` | int | 版本号 |
| `output` | `created_at` | datetime | 生成时间 |
| `output` | `score_before` / `score_after` | ScoreSummary? | 评分（含 overall + dimensions） |
| 前端计算 | `beforeMetrics` / `afterMetrics` | ContentMetrics | 字数 / 段落 / 标题 / 阅读时长 |
| 前端计算 | `charDeltaPercent` | number? | 字数变化百分比 |
| 前端计算 | Quality Gate | enum | 发布就绪度（ready/review/degraded/...） |

### 1.2 评分、优化建议、来源缺口字段来源

| 模块 | 前端展示位置 | 字段来源 |
|------|------------|----------|
| 原文评分 | `ResultHeroBand` | `output.score_before.overall` + `.dimensions` |
| 改后评分 | `ResultHeroBand` | `output.score_after.overall` + `.dimensions` |
| 分数变化 | `ResultHeroBand` Badge | `after - before` |
| 维度评分 | `PlatformScorecard`（右侧 Inspector） | `output.score_after.dimensions[].name/score/comment` |
| 优化建议 | `StrategyList`（右侧 Inspector） | `output.optimization_strategy[].issue/action/priority/evidence` |
| 来源缺口 | `SourceGapList`（右侧 Inspector） | `output.missing_sources[]` |
| 待补充事实 | Inspector Card | `output.missing_facts[].title/fact_type/content/reason` |
| 质量门禁 | `ResultHeroBand` Badge | 前端 `getQualityGateFromOutput()` 计算（非后端字段） |
| 降分解释 | `ScoreDeclineExplainer` | `getScoreDelta()` + `getTopDeclinedDimensions()` |

### 1.3 旧任务兼容性

- `score_before` / `score_after` 可能为 `null`（旧任务或评分失败），`ResultHeroBand` 已 fallback 为 0
- `optimization_strategy` / `missing_sources` / `missing_facts` 可能为 `null`，Inspector 已做空判断
- `schema_suggestions.type` 为 `PlatformPublishGuide` 时走卡片视图，否则走 JSON-LD
- `publish_platform` 旧值（官网文章/公众号/知乎问答/小红书）通过 `mapPlatformToAssetType` 映射展示，小红书标记 `isDeprecatedPlatform`

**结论：HTML 导出需对所有可空字段做 null fallback，旧任务可兼容。**

---

## 二、当前复制正文逻辑

### 2.1 复制按钮位置与实现

结果页共有 **3 处复制正文入口**，全部复制同一字段 `output.final_article`：

| 位置 | 代码 | 复制内容 |
|------|------|----------|
| TopBar 顶部按钮 | `handleCopy` → `copyToClipboard(output.final_article)` | `final_article` 原始字符串 |
| 改写正文 Tab 卡片头 | `<CopyButton text={output.final_article} />` | `final_article` 原始字符串 |
| 原文对比 Tab 改写后栏 | `<CopyButton text={output.final_article} />` | `final_article` 原始字符串 |

### 2.2 `copyToClipboard` 实现（`lib/utils.ts`）

```ts
export async function copyToClipboard(text: string): Promise<boolean> {
  // navigator.clipboard.writeText(text) → 直接写入原始字符串
  // fallback: textarea.value = text → execCommand('copy')
}
```

**关键结论：复制的是 `output.final_article` 的原始字符串，未经任何渲染、未取 DOM、未做清洗。**

### 2.3 当前复制正文是否纯净

| 检查项 | 结果 |
|--------|------|
| 只复制 `final_article`？ | ✅ 是 |
| 复制 MarkdownRenderer 渲染后文本？ | ❌ 否，复制原始字符串 |
| 复制整个页面 DOM？ | ❌ 否 |
| 包含原文？ | ❌ 否 |
| 包含评分？ | ❌ 否 |
| 包含优化建议？ | ❌ 否 |
| 包含报告型标题（## 内容摘要 / ## 正文）？ | ⚠️ **取决于 `final_article` 本身内容** |
| 包含 `#` / `##` / `###`？ | ⚠️ **取决于 `final_article` 本身内容** |
| 包含 HTML 标签？ | ❌ 否（除非 LLM 输出了 HTML） |
| 包含话题标签 `#话题`？ | ⚠️ **取决于 `final_article` 本身内容** |

### 2.4 当前复制正文真实输出样例

由于本轮不执行代码，以下基于 `final_article` 字段的典型 LLM 输出形态推断：

**样例 A（官网文章，正常情况）：**
```
# 智能客服平台：2026 年企业降本增效的关键选择

## 摘要
截至 2026 年，超过 63% 的企业已将生成式 AI 纳入核心业务流程……

## 核心能力
- 7×24 小时多轮对话
- 工单自动分流

## 结论
智能客服平台已成为企业数字化转型的标配。
```

**样例 B（自媒体稿，可能含话题标签）：**
```
## 开头钩子
还在为客服响应慢发愁？

## 正文
……

## 互动引导
你用过哪些智能客服？评论区聊聊👇
#智能客服 #AI客服 #企业服务
```

### 2.5 `#` 符号来源判断

| 可能来源 | 判断 |
|----------|------|
| 复制逻辑没有清洗？ | ❌ 不是主因（复制逻辑本身是直传） |
| Prompt 输出问题？ | ⚠️ **是根因**——`final_article` 是 LLM 按 Prompt 输出的 Markdown，标题用 `#`/`##` 是 Markdown 规范 |
| Markdown 内容本身就是最终稿？ | ✅ **是**——`final_article` 设计为可发布 Markdown，`#` 是合法结构 |

**结论：`#` 符号是 `final_article` 的合法 Markdown 结构，不是 bug。但「复制正文」若要直接粘贴到公众号/官网/文档，`#` 符号确实需要清洗。当前复制逻辑未做清洗，属于功能缺失而非 bug。**

---

## 三、当前复制正文是否纯净

**判定：部分纯净。**

- ✅ 纯净部分：不包含原文、评分、优化建议、页面说明、报告元信息（这些在 `final_article` 字段之外）
- ⚠️ 不纯净部分：`final_article` 本身含 Markdown 标题符号 `#`/`##`/`###`、可能含报告型章节标题（## 摘要 / ## 正文 / ## 互动引导）、可能含话题标签 `#话题`

**直接粘贴到公众号编辑器的问题：**
1. 公众号编辑器不识别 Markdown，`## 摘要` 会原样显示为文本
2. `#智能客服` 会被当作普通文本而非话题
3. 列表 `- item` 的 `-` 会保留

**结论：当前「复制正文」不满足「可直接粘贴到公众号/官网/文档」的要求，需要增加清洗层。**

---

## 四、当前 Markdown 导出逻辑

### 4.1 导出链路

```
ExportButton → useExport → GET /api/outputs/:id/export?format=markdown
                            → backend export_service.build_markdown()
                            → 失败时 fallback 前端 downloadText(fallbackContent)
```

`fallbackContent` 在 `RewriteResultPage` 传入的是 `output.final_article`（仅正文，非完整报告）。

### 4.2 后端 `build_markdown` 包含的模块

| 模块 | 包含 | 字段来源 |
|------|------|----------|
| 报告标题 `# GEO Rewrite Package` | ✅ | 固定 |
| 标题行 `**{title}**` | ✅ | `output.title` / `task.title` |
| 基本信息表（版本/视角/资产类型/来源策略/输出长度/生成时间/质量状态） | ✅ | task + output |
| 交付摘要 `## 交付摘要` | ✅ | `output.comparison_summary` |
| 可发布正文 `## 可发布正文` | ✅ | `output.final_article` |
| FAQ `## FAQ` | ✅ | `output.faq_content`（剥离开头 `## FAQ`） |
| Schema / 平台发布建议（动态标题） | ✅ | `output.schema_suggestions` |
| 评分诊断 `## 评分诊断`（改前 + 改后表格） | ✅ | ContentScore before/after |
| 优化策略 `## 优化策略` | ✅ | `output.optimization_strategy` |
| 来源缺口 `## 来源缺口` | ✅ | `output.missing_sources` |
| 待补充事实 `## 待补充事实` | ✅ | `output.missing_facts` |

### 4.3 Markdown 导出特性

| 检查项 | 结果 |
|--------|------|
| 只导出优化后正文？ | ❌ 否，导出完整报告 |
| 包含原文？ | ❌ 否（**原文不在导出中**） |
| 包含评分？ | ✅ 是 |
| 包含优化建议？ | ✅ 是 |
| 包含来源缺口？ | ✅ 是 |
| 包含内容资产类型？ | ✅ 是（基本信息表） |
| 包含任务信息？ | ✅ 是（版本/视角/策略/长度/时间/状态） |
| 改变任务状态？ | ❌ 否（`export.py` 注释明确：已移除 `review_status="exported"` 副作用） |
| 存在其他副作用？ | ❌ 否（纯只读 GET） |

### 4.4 Markdown 导出与 HTML 导出定位区分

| 功能 | 定位 | 当前状态 |
|------|------|----------|
| 复制正文 | 纯净发布正文 | ⚠️ 未清洗，含 `#` |
| 导出 Markdown | 可编辑交付文档（完整报告） | ✅ 已实现，完整 |
| 导出 HTML | 完整可视化报告 | ❌ 未实现 |

**建议：保留 Markdown 导出，新增 HTML 导出作为独立功能。两者文案已天然区分（「导出 Markdown」vs「导出 HTML」）。**

---

## 五、当前是否已有 HTML 导出基础

### 5.1 后端

- `export_service.py` 只有 `build_markdown` 和 `build_json`，**无 `build_html`**
- `export.py` API 只接受 `format=markdown` 和 `format=json`，**无 html 分支**
- 数据装配逻辑（`_load_scores` / `_score_table` / `_strategy_block` / `_platform_guide_block`）可复用

### 5.2 前端

- `ExportButton` 只支持 `format: 'markdown' | 'json'`
- `downloadText` 工具函数支持任意 mime，可复用
- `MarkdownRenderer` 基于 `react-markdown`，可在前端将 Markdown 渲染为 HTML

**结论：无现成 HTML 导出，但后端数据装配逻辑成熟，前端渲染能力具备。**

---

## 六、HTML 导出推荐方案

### 方案对比

| 维度 | 方案 A：前端生成 | 方案 B：后端生成 |
|------|------------------|------------------|
| 开发速度 | 快（复用页面数据 + 模板字符串） | 中（需新增 build_html + API 分支） |
| 数据一致性 | 高（直接用前端已加载的 output/task） | 高（复用 export_service） |
| 样式控制 | 手写内联 CSS / 抽取 Tailwind | 需独立 HTML 模板 |
| 后端改动 | 无 | 新增 build_html + API format=html |
| 服务端导出能力 | 无 | 有（未来可扩展 PDF） |
| 适合 P0 | ✅ | ⚠️ |

### 推荐方案：**P0 用方案 A（前端生成）**

**理由：**

1. 当前项目是单机开源工具，无服务端批量导出需求
2. 前端结果页已持有全部所需数据（task + output + score + metrics），无需新增 API
3. 后端 `export_service` 的 Markdown 装配逻辑已能满足「可编辑交付文档」，HTML 是「可视化报告」，定位不同
4. 方案 A 不改后端、不改数据库，符合最小改动原则
5. 后端 `build_json` 已返回完整结构化数据，前端可直接消费

**实现要点（供下一轮开发参考，本轮不实现）：**
- 新增 `frontend/src/lib/exportHtml.ts`，接收 task + output + project，返回 HTML 字符串
- HTML 内联 CSS（不依赖外部样式表），保证离线可看
- 用 `downloadText(filename, html, 'text/html;charset=utf-8')` 触发下载
- `ExportButton` 增加 `format: 'html'` 分支，或在结果页新增独立「导出 HTML」按钮

---

## 七、HTML 报告应包含哪些模块

基于当前结果页真实字段，建议 HTML 报告结构：

| # | 模块 | 字段来源 | 是否具备 |
|---|------|----------|----------|
| 1 | 报告标题 | `output.title` / `task.title` | ✅ |
| 2 | 基本信息（工作区/资产类型/使用模型/生成时间/任务状态/版本/视角） | project + task + output | ✅ |
| 3 | 原文（标题/正文/字数/段落数/阅读时长） | `task.original_content` + 前端 metrics | ✅ |
| 4 | 优化后正文（标题/正文/字数/段落数/阅读时长） | `output.final_article` + 前端 metrics | ✅ |
| 5 | 评分概览（原文评分/优化后评分/分数变化/质量门禁状态） | `score_before` / `score_after` / Quality Gate | ✅ |
| 6 | 维度评分（各维度名称/分数/说明） | `score_after.dimensions[].name/score/comment` | ✅ |
| 7 | 优化建议（已优化点/仍需补充/来源缺口/风险提示） | `optimization_strategy` + `missing_sources` + `missing_facts` | ✅ |
| 8 | FAQ | `output.faq_content` | ✅ |
| 9 | 发布/使用建议（按内容资产类型） | `output.schema_suggestions`（PlatformPublishGuide / JSON-LD） | ✅ |
| 10 | 改写摘要 | `output.comparison_summary` | ✅ |
| 11 | 免责声明 | 固定文案 | ✅ |

**结论：当前字段完全能支撑 HTML 报告的全部模块，无字段缺失。**

---

## 八、字段缺失评估

| 字段 | 状态 | 影响 |
|------|------|------|
| `task.original_content` | ✅ 必填 | HTML 原文模块 |
| `output.final_article` | ✅ 必填 | HTML 正文模块 |
| `output.title` | ⚠️ 可空 | fallback 到 `task.title` |
| `output.score_before` / `score_after` | ⚠️ 可空 | null 时评分模块显示「无评分数据」 |
| `output.optimization_strategy` | ⚠️ 可空 | null 时显示「无优化策略」 |
| `output.missing_sources` | ⚠️ 可空 | null 时显示「无」 |
| `output.missing_facts` | ⚠️ 可空 | null 时显示「无」 |
| `output.faq_content` | ⚠️ 可空 | null 时 FAQ 模块隐藏 |
| `output.schema_suggestions` | ⚠️ 可空 | null 时发布建议模块隐藏 |
| `output.comparison_summary` | ⚠️ 可空 | null 时摘要模块隐藏 |
| `task.model_provider` / `model_name` | ⚠️ 可空 | null 时显示「未指定模型」 |
| `project.name` | ⚠️ 可能加载失败 | fallback 到 project_id |

**结论：无必填字段缺失。可空字段在 HTML 中 fallback 显示即可，旧任务兼容。**

---

## 九、多类型内容资产结果页如何处理

### 9.1 当前 `MultiPlatformResultPage` 实现

- 通过 `?taskIds=id1,id2,id3` 携带多个任务
- 每个任务渲染为 `PlatformTaskCard`（卡片网格）
- 每张卡片有独立「查看结果」按钮（跳转单任务结果页）+ 独立「导出 Markdown」按钮
- **无全局合并导出能力**

### 9.2 P0 建议

| 能力 | P0 | P1 |
|------|----|----|
| 单任务结果页导出 HTML | ✅ 支持 | - |
| 多类型结果页每项单独导出 HTML | ✅ 支持（每张卡片加「导出 HTML」按钮） | - |
| 多类型合并导出一个 HTML（每资产一个 section） | ❌ 暂缓 | ✅ |

**理由：** 合并导出需要处理多任务数据聚合、分页、目录索引，成本中等。P0 先支持单任务导出，覆盖 80% 场景。合并导出可在 P1 用单个 HTML 文件内嵌多个 `<section>` 实现，技术上可行。

---

## 十、复制正文清洗规则建议

### 10.1 建议清洗函数

```ts
复制正文 = cleanFinalArticle(output.final_article)
```

### 10.2 清洗规则适配性评估

| 规则 | 是否适合当前内容资产类型 | 说明 |
|------|--------------------------|------|
| 去掉 `#`/`##`/`###` 标题符号，保留标题文本 | ✅ 适合全部 6 类 | Markdown 标题在公众号/官网编辑器不识别 |
| 去掉代码围栏 ```` ``` ```` | ✅ 适合 | 正文不应含代码块 |
| 去掉报告型标题（内容摘要/开头钩子/正文/收藏评论引导/优化建议/评分/来源缺口） | ⚠️ 需谨慎 | 需按资产类型定制黑名单；`final_article` 正常不应含这些（它们在单独字段），若出现说明 LLM 越界，应剥离 |
| 保留正常正文段落 | ✅ 适合 | - |
| 保留列表内容但去多余 Markdown 符号 | ⚠️ 需决策 | `- item` → `• item` 还是 `item`？建议保留 `•` 提升可读性 |
| 保留必要标题文本但不保留 `#` | ✅ 适合 | 标题文本本身有价值 |
| 不处理为 HTML | ✅ 适合 | 纯文本最通用 |
| 不额外添加系统说明 | ✅ 适合 | - |

### 10.3 话题标签处理建议

- `#智能客服` 这类话题标签：**保留**（自媒体稿发布时需要）
- `## 摘要` 这类 Markdown 标题：**剥离 `##`，保留「摘要」文本**

**区分逻辑：** 行首 `#{1,6}\s+` 为 Markdown 标题（剥离 `#`）；行内或行尾 `#xxx` 为话题标签（保留）。

### 10.4 清洗函数建议签名

```ts
function cleanFinalArticle(article: string, assetType?: ContentAssetType): string
```

- 对全部资产类型应用通用规则（去 `#` 标题符号、去代码围栏）
- 对自媒体类资产保留话题标签
- 对官网文章类资产可更激进地剥离报告型章节标题

---

## 十一、按钮和文案建议

### 11.1 当前结果页 TopBar 按钮区

```
[复制正文] [导出 Markdown] [重新改写]
```

### 11.2 建议最终按钮区

```
[复制正文] [导出 Markdown] [导出 HTML] [重新改写]
```

| 按钮 | 功能 | 文案 |
|------|------|------|
| 复制正文 | 纯净正文 → 剪贴板 | 「复制正文」 |
| 导出 Markdown | 可编辑文档 → .md 文件 | 「导出 Markdown」 |
| 导出 HTML | 完整可视化报告 → .html 文件 | 「导出 HTML」 |
| 重新改写 | 重新生成 | 「重新改写」 |

### 11.3 拥挤度判断

- 4 个按钮在桌面端 TopBar 可容纳（每个按钮约 100px，共 400px）
- 移动端可考虑将「导出 Markdown」「导出 HTML」收入「更多」下拉
- **P0 建议：桌面端直接平铺，不做「更多」菜单**（降低实现复杂度）

---

## 十二、P0 最小开发方案

### 12.1 范围

1. **新增「导出 HTML」功能**（前端生成）
2. **修复「复制正文」纯净度**（增加清洗层）

### 12.2 改动文件预估

| 文件 | 改动 |
|------|------|
| `frontend/src/lib/exportHtml.ts` | 新增：HTML 报告模板生成函数 |
| `frontend/src/lib/cleanArticle.ts` | 新增：`final_article` 清洗函数 |
| `frontend/src/components/common/ExportButton.tsx` | 增加 `format: 'html'` 分支 |
| `frontend/src/pages/RewriteResultPage.tsx` | `handleCopy` 改用 `cleanFinalArticle`；TopBar 新增「导出 HTML」按钮 |
| `frontend/src/pages/MultiPlatformResultPage.tsx` | `PlatformTaskCard` 的 `ExportButton` 支持 html |

### 12.3 不做

- 不改后端 API
- 不改数据库
- 不改 Prompt
- 不改评分逻辑
- 不新增 PDF 导出
- 不做自动发布
- 不做多类型合并导出（P1）

### 12.4 验收标准

1. 点击「复制正文」后，粘贴到公众号编辑器无 `#`/`##` 符号
2. 点击「导出 HTML」下载 `.html` 文件，浏览器打开可见完整报告
3. HTML 报告包含：原文、优化后正文、评分、评分变化、优化建议、来源缺口、质量检查、内容资产类型、使用模型、生成时间
4. HTML 报告内联 CSS，离线可看
5. 旧任务（无评分）导出 HTML 不报错，评分模块显示「无评分数据」
6. `npm run build` 通过
7. `npx tsc --noEmit` 通过

---

## 十三、P1 后续增强方案

1. **多类型合并 HTML 导出**：`MultiPlatformResultPage` 新增「导出完整内容资产包 HTML」，每资产一个 `<section>`，含目录索引
2. **HTML 报告样式增强**：封面页、页眉页脚、打印优化（`@media print`）
3. **复制正文按资产类型定制**：官网文章去报告标题；自媒体保留话题标签；问答型保留 Q&A 结构
4. **导出历史记录**：记录导出行为（单独建表，不污染 review_status）
5. **PDF 导出**：基于 HTML 报告 + 浏览器打印或 puppeteer
6. **导出 JSON 完整数据包**：用于数据迁移/备份

---

## 十四、是否建议马上开发

**建议：可以马上开发，优先级高。**

**理由：**

1. 「复制正文」当前含 `#` 符号，直接影响用户发布体验，属于体验缺陷
2. 「导出 HTML」是结果页核心交付能力，当前只有 Markdown 导出，可视化报告缺失
3. 全部字段已具备，无需后端改动，开发成本低（预估前端 2 个文件新增 + 2 个文件改动）
4. 不涉及 Prompt、评分、数据库等高风险区域

---

## 十五、下一轮开发窗口建议

### 开发窗口：Rewrite Result Export & Copy Implementation Window

**任务清单：**

1. 新增 `frontend/src/lib/cleanArticle.ts`
   - 实现 `cleanFinalArticle(article, assetType?)` 清洗函数
   - 规则：去 `#`/`##`/`###` 标题符号（保留标题文本）、去代码围栏、按资产类型保留/剥离话题标签
   - 单元测试覆盖：官网文章、自媒体稿、问答型、含代码块、含话题标签

2. 新增 `frontend/src/lib/exportHtml.ts`
   - 实现 `buildHtmlReport({ task, output, project, beforeMetrics, afterMetrics })` 函数
   - HTML 内联 CSS，结构按本报告第七节
   - 所有可空字段 fallback 显示
   - 返回 `{ filename, html }`

3. 修改 `frontend/src/components/common/ExportButton.tsx`
   - `format` 类型增加 `'html'`
   - html 分支调用前端 `buildHtmlReport` + `downloadText`（不走后端 API）

4. 修改 `frontend/src/pages/RewriteResultPage.tsx`
   - `handleCopy` 改为 `copyToClipboard(cleanFinalArticle(output.final_article, assetType))`
   - 3 处 `CopyButton` 的 `text` 改为清洗后内容
   - TopBar 新增「导出 HTML」按钮（调用 `ExportButton format="html"`）

5. 修改 `frontend/src/pages/MultiPlatformResultPage.tsx`
   - `PlatformTaskCard` 的 `ExportButton` 允许 `format="html"`

6. 验证
   - `npx tsc --noEmit` 通过
   - `npm run build` 通过
   - 手动验证：复制正文粘贴到记事本无 `#`；导出 HTML 浏览器打开完整渲染

**禁止事项（同本轮）：**
- 不改后端 API
- 不改数据库
- 不改 Prompt
- 不改评分逻辑
- 不新增 PDF
- 不做自动发布
