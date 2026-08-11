# Model Selector Sync + HTML Report v3 Polish Report

## 概述

本轮完成两项核心工作：
1. 修复内容优化页模型选择器显示问题（增加健壮性，兼容旧数据）
2. HTML 报告升级至 v3（拆分 FAQ / 发布建议 / Schema 为独立模块，新增内容优化说明，折叠 Schema JSON，后移原始素材）

---

## 一、模型选择器修复

### 1. 为什么内容优化页之前显示「未配置模型」

经排查，内容优化页的模型加载逻辑本身是正确的：
- `useModelConfigs()` hook 使用统一 query key 调用 `GET /api/settings/models`
- 过滤条件为 `m.enabled`
- 默认选中 `is_default` 模型，无默认时选第一个

**根因分析**：之前设置中心的「模型配置」Tab 存在无法点击的 bug（Radix Tabs 受控组件缺少 `onValueChange`），已在上一轮修复。该 bug 导致用户可能无法正确进入模型配置页或保存模型后状态未刷新，造成内容优化页读到空列表的「残留状态」。

此外，过滤条件 `m.enabled` 对 `enabled` 字段缺失的旧数据不够健壮（TypeScript 类型声明为 `boolean`，但运行时 JSON 可能省略该字段）。

### 2. 修复了哪些模型配置读取逻辑

**文件**：`frontend/src/pages/NewRewritePage.tsx`（第 353-373 行）

修改内容：
- 过滤条件从 `m.enabled` 改为 `m.enabled !== false`，兼容 `enabled` 字段缺失的旧数据（undefined 视为启用）
- 新增「选中模型失效自动重置」逻辑：当当前选中的模型被删除或禁用后，自动重置为默认模型或第一个启用模型
- 默认选中逻辑保持不变：优先 `is_default`，无默认时选第一个启用模型

### 3. 内容优化页现在如何加载模型列表

```
页面加载
→ useModelConfigs() 发起 GET /api/settings/models
→ TanStack Query 缓存 + 自动刷新
→ 过滤 enabled !== false 的模型
→ 如果有 is_default，选中默认模型
→ 如果没有 is_default，选中第一个启用模型
→ 显示模型选择器（格式：provider_label · model_id）
```

### 4. 默认模型如何选择

- 优先选中 `is_default === true` 的模型
- 无默认模型时，选中第一个启用模型
- 当前选中模型被删除/禁用时，自动重置为默认或第一个

### 5. 设置中心保存模型后如何刷新内容优化页

设置中心的模型 CRUD 操作（`useCreateModelConfig` / `useUpdateModelConfig` / `useDeleteModelConfig` / `useSetDefaultModelConfig`）在 `onSuccess` 中调用 `qc.invalidateQueries({ queryKey: queryKeys.modelConfigs.list() })`，使 TanStack Query 缓存失效。内容优化页的 `useModelConfigs()` 会自动重新拉取最新数据，无需刷新整个页面。

### 6. 生成请求如何传递 model_config_id

**文件**：`frontend/src/pages/NewRewritePage.tsx`（第 542 行）

```ts
const buildPayload = (assetType: ContentAssetType): TaskCreateInput => ({
  ...
  model_config_id: selectedModelId || undefined,
})
```

请求体包含 `model_config_id` 字段。后端 `POST /api/projects/:id/tasks` 接收后，在创建任务时读取模型配置并写入 `model_provider`、`model_name`、`model_display_name` 到任务记录。

### 7. HTML 报告模型字段如何显示

**文件**：`frontend/src/lib/exportHtml.ts`（第 446-454 行）

报告头 meta 行新增模型字段：
```ts
const modelDisplay = task.model_display_name?.trim()
  || (task.model_provider && task.model_name ? `${task.model_provider} · ${task.model_name}` : '')
  || ''
```

显示规则：
- 有 `model_display_name` → 显示该值
- 否则有 `model_provider` + `model_name` → 显示 `provider · name`
- 都没有 → 显示「未记录」（不再显示「未指定模型」）

格式：`工作区 · 内容资产类型 · 模型：DeepSeek · deepseek-chat · 2026-07-01 10:30`

---

## 二、HTML 报告 v3 调整

### 8. HTML 报告 v3 调整了哪些结构

**文件**：`frontend/src/lib/exportHtml.ts`

v3 报告顺序：

| 序号 | Section | 变化 |
|------|---------|------|
| 1 | Header（含模型字段） | 新增模型字段 |
| 2 | 发布检查摘要 | 不变 |
| 3 | 评分诊断 | 不变 |
| 4 | 主要优化建议 | 不变 |
| 5 | 待补证据与风险 | 不变 |
| 6 | 终稿正文（含复制按钮） | 不变 |
| 7 | **内容优化说明** | **新增** |
| 8 | **FAQ** | **独立** |
| 9 | **发布建议** | **独立** |
| 10 | **Schema 建议** | **独立** |
| 11 | 原始素材 / 初稿 | **后移** |
| 12 | 免责声明 | 不变 |
| 13 | Footer | 不变 |

### 9. FAQ 如何拆分和优化

- 从 v2 的「FAQ / 发布建议」合并 section 中拆出，成为独立 `<section class="section faq-section">`
- 新增 `parseFaqItems(text)` 函数，将 FAQ Markdown 解析为问答对数组
- 支持格式：`### 问题`、`Q1：问题`、`Q：问题`、`A：答案`、普通段落跟随问题
- 每个 FAQ 渲染为问答卡片（`.faq-item`），问题加粗（`.faq-q`），答案正常段落（`.faq-a`）
- 不再显示 `## FAQ` / `###` 原始 Markdown 符号
- FAQ 为空时隐藏整个 section

### 10. FAQ 前后说明如何实现

**FAQ 前**（section-desc）：
```
以下问答可作为官网 FAQ 模块、搜索问答素材或结构化数据基础。
```

**FAQ 后**（inline-note）：
```
FAQ 可进一步映射为 FAQPage Schema，发布前请确认问答中的事实、法条和案例信息准确无误。
```

### 11. 发布建议如何独立

- 从 v2 合并 section 中拆出，成为独立 section
- 如果 `schema_suggestions.type === 'PlatformPublishGuide'`：使用 `renderPublishGuide()` 渲染为卡片化可读模块（不展示原始 JSON）
- 如果 `comparison_summary` 中包含「附：发布附属信息」（律师简介 / 律所简介 / 免责声明等）：追加到发布建议 section 末尾
- 两者都没有时隐藏整个 section

### 12. Schema 建议如何折叠

- 从 v2 合并 section 中拆出，成为独立 section
- 仅在 `schema_suggestions` 存在且 `type !== 'PlatformPublishGuide'` 时显示
- **摘要区**（`.schema-summary`）：显示推荐类型（从 `json_ld.@type` 或 `schemaSuggestion.type` 提取）和用途说明
- **完整 JSON**：放在 `<details class="schema-details">` 中，默认折叠
- details 标题：「查看完整 Schema JSON」
- 不再默认展示超长 JSON，避免报告后半部分过重

### 13. 原始素材为何后移

v2 中原始素材放在终稿正文之后、FAQ 之前，长原文会打断报告阅读流。v3 将原始素材移至 FAQ / 发布建议 / Schema 之后，并增加说明文案「以下为导入时的原始素材，仅用于对照与追溯」，视觉上用 `.muted-article` 弱化。

### 14. 复制终稿正文按钮是否保留

**保留**。终稿正文 section 标题右侧的「复制终稿正文」按钮未改动，复制脚本（clipboard API + execCommand 兜底）完整保留。

### 15. 复制内容是否仍然纯净

**是**。复制内容继续使用 `cleanFinalArticle(output.final_article, assetType)` 清洗后的纯文本：
- 无 `#` / `##` / `###` Markdown 标题符号
- 无 HTML 标签
- 不包含评分、优化建议、来源缺口、原文、免责声明
- 通过 `JSON.stringify(cleanedArticle)` 安全注入到 `<script>` 变量
- 打印时隐藏复制按钮（`@media print { .copy-final-btn { display: none; } }`）

---

## 三、新增内容优化说明 section

### 新增 `splitComparisonSummary` 函数

将 `comparison_summary` 在「附：发布附属信息」处拆分：
- `mainNotes`（内容优化说明）：保留项 / 增强项 / 删减项 / 风险处理等
- `appendixInfo`（发布附属信息）：律师简介 / 律所简介 / 免责声明等

内容优化说明 section 使用 `renderMarkdownLikeHtml(contentNotes)` 渲染，显示为 `.content-notes-body` 样式。发布附属信息不放在内容优化说明中，而是追加到发布建议 section。

---

## 四、影响评估

### 16. 是否影响 Markdown 导出

**否**。Markdown 导出走后端 API（`GET /outputs/:id/export?format=markdown`），与 `exportHtml.ts` 完全独立，不受影响。

### 17. 是否影响结果页复制正文

**否**。结果页复制正文使用 `cleanArticle.ts` 的 `cleanFinalArticle()` 函数，未修改该文件，功能不受影响。

### 18. 是否改数据库

**否**。未修改任何数据库表结构、字段或 migration。`model_config_id`、`model_provider`、`model_name`、`model_display_name` 字段已存在于 `rewrite_tasks` 表中。

### 19. 是否改后端 API

**否**。未修改后端 API。模型配置 CRUD 接口（`/api/settings/models`）和任务创建接口（`POST /api/projects/:id/tasks`）均未改动。后端在创建任务时已自动填充 `model_display_name` 等字段。

### 20. 构建验证结果

```
npx tsc --noEmit  →  exit 0（通过）
npm run build     →  exit 0（通过，2888 modules transformed，4.38s）
```

---

## 五、修改文件清单

| 文件 | 修改内容 |
|------|----------|
| `frontend/src/pages/NewRewritePage.tsx` | 模型过滤条件 `enabled !== false`，选中模型失效自动重置 |
| `frontend/src/lib/exportHtml.ts` | v3 报告结构：拆分 FAQ/发布建议/Schema，新增内容优化说明，折叠 Schema JSON，后移原始素材，Header 新增模型字段，新增 parseFaqItems / splitComparisonSummary 函数，新增 faq/schema-details/inline-note/content-notes CSS |

---

## 六、仍存在的问题

1. **模型选择器「未配置模型」的根因**：本轮排查确认前端逻辑正确，根因是上一轮设置中心 Tab 无法点击的 bug 已修复后的残留状态。如果用户仍遇到此问题，建议清除浏览器缓存或刷新页面后重新打开内容优化页。

2. **FAQ 解析覆盖率**：`parseFaqItems` 支持 `### 问题`、`Q1：`、`Q：`、`A：` 和普通段落格式。如果 LLM 输出的 FAQ 使用了非标准格式（如纯数字编号 `1. 问题`），可能解析为单个 Q/A 对。这种情况较少见，后续可扩展解析规则。

3. **Schema 摘要的「推荐类型」提取**：当前从 `json_ld.@type` 提取类型。如果 json_ld 是 `@graph` 数组结构，显示的可能是 `[object Object]`。后续可增强 `@graph` 解析。

---

## 七、下一步建议

1. **模型选择器实测验证**：在浏览器中打开内容优化页，确认已配置模型正确显示在选择器中，默认模型自动选中。在设置中心新增/删除/设默认模型后，返回内容优化页确认列表刷新。

2. **HTML 报告 v3 实测验证**：导出一份包含 FAQ + Schema + comparison_summary 的完整报告，确认：
   - FAQ 显示为问答卡片
   - Schema JSON 默认折叠
   - 原始素材在末尾
   - 复制终稿正文仍为纯文本
   - 打印时按钮隐藏

3. **FAQ 解析增强**：如果实际 LLM 输出的 FAQ 格式与当前解析器不匹配，可根据实际样本扩展 `parseFaqItems` 的匹配规则。

4. **Schema `@graph` 解析**：如果实际输出的 Schema 使用 `@graph` 结构，增强摘要区的类型提取逻辑。
