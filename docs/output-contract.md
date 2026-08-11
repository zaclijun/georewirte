# GEO Rewrite Package Output Contract

> 本文档定义所有 Rewrite Output 的交付规范，是 Prompt 与前后端共用的契约，不是 Prompt 草稿。
> 范围：单平台与多平台发稿包生成。P0 只做发稿包生成，不做自动发布。

---

## 1. 通用字段

每个 Rewrite Output 包含以下独立模块（对应 `rewrite_outputs` 表字段，不新增字段）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 语义完整标题，包含核心观点 |
| `final_article` | string | 可发布正文（纯净 Markdown） |
| `faq_content` | string | FAQ（独立于正文） |
| `schema_suggestions` | JSON / null | Schema JSON-LD 或 平台发布建议（二选一） |
| `score_before` | ContentScore | 改前评分（6 维 GEO Scorecard） |
| `score_after` | ContentScore | 改后评分（6 维 GEO Scorecard） |
| `optimization_strategy` | array | 优化策略（high/medium/low） |
| `missing_sources` | string[] | 来源缺口（具体到原文位置 + 来源类型） |
| `missing_facts` | array | 待补充事实（可空） |
| `comparison_summary` | string | 前后对比摘要（四段式 + 附：发布附属信息） |
| `review_status` | enum | ready / review / needs_material / exported |

---

## 2. final_article 纯净性规则

`final_article` 只允许包含：

- 内容摘要（`## 内容摘要` 或 `> **核心结论**：...`）
- 正文主体（按平台规则组织）
- 法律依据 / 证据支持 / 操作建议，如适用
- 平台适配正文，如公众号、小红书、知乎

`final_article` 严禁包含：

- FAQ
- Schema
- JSON-LD
- 律师简介
- 律所简介
- 品牌简介
- 免责声明
- 评分
- 优化策略
- 来源缺口
- 平台发布建议
- Q1 / Q2 / Q3
- "以下是"
- "我来分析"
- 任何过程性文字

**规则**：
- FAQ 只能进入 `faq_content`。
- Schema 或平台发布建议只能进入 `schema_suggestions`。
- 律师简介 / 律所简介 / 品牌简介 / 免责声明只能进入 `comparison_summary` 末尾「附：发布附属信息」。
- `final_article` 必须以 `## 内容摘要` 或 `> **核心结论**：` 开头。

---

## 3. Schema / PlatformPublishGuide 二选一

判断规则：

```
如果 need_schema = false：
    输出 PlatformPublishGuide（不输出 Schema）

否则（need_schema = true）：
    如果 publish_platform 是 官网文章 / 官网服务页：
        输出 Schema JSON-LD
    否则（公众号 / 知乎问答 / 小红书）：
        输出 PlatformPublishGuide（即使 need_schema=true，也不输出 Schema）
```

`schema_suggestions` 字段复用，通过 `type` 区分：

- Schema：`type = "Article + FAQPage"` / `"Service"` / `"LegalService"` 等
- 平台发布建议：`type = "PlatformPublishGuide"`

如果平台是自媒体且未生成 Schema，`comparison_summary` 必须包含一句说明：「该平台不支持 JSON-LD 结构化数据，已将 Schema 区块替换为平台发布建议。」

---

## 4. 官网文章 Package

### final_article 结构

```markdown
## 内容摘要

3-5 句话概括核心结论、适用边界、主要依据。

## 核心结论

结论先行。

## 背景说明 / 案件事实
...

## 关键问题 / 争议焦点
...

## 分析过程 / 机制说明
...

## 结论 / 裁判结果 / 解决方案
...

## 法律依据 / 证据支持 / 操作建议
...

## 风险指引
...
```

### Schema

`schema_suggestions.type = "Article + FAQPage"`（或 Service / LegalService 等，按内容选择）。

实体属性增强要求：
- `author` 必须含 `jobTitle`、`knowsAbout`
- `publisher` 必须含 `areaServed`、`description`
- `articleBody` 不得是压缩文本，改为分段结构或省略
- 法律类内容考虑 `citation` 字段引用法条编号

### 默认

`need_schema = true`

---

## 5. 公众号 Package

### schema_suggestions

```json
{
  "type": "PlatformPublishGuide",
  "json_ld": {
    "platform": "公众号",
    "package_type": "WeChat Article Publish Guide",
    "recommended_title": "推荐主标题，控制在 20-32 字左右",
    "subtitle": "副标题 / 导语，用于正文标题下方，不是后台独立字段，控制在 20-50 字",
    "cover_summary": "封面摘要，控制在 50-100 字",
    "opening_hook": "开头钩子，3 句话内",
    "section_titles": ["小标题1", "小标题2", "小标题3"],
    "paragraph_style": "段落排版建议",
    "cover_suggestion": "封面建议：画面主体、主视觉文案、配色方向",
    "quote_cards": ["金句卡片句子1", "金句卡片句子2"],
    "comment_prompt": "评论区引导话术",
    "risk_notes": ["平台表达风险或合规提示1"],
    "reusable_summary": "80-120 字可复用摘要"
  }
}
```

### final_article 结构

公众号可发布正文（不是官网长文）：

```markdown
## 内容摘要

3 句话内说明核心结论、适用场景和读者收益。

## 开篇

用真实问题、常见误区或结论句打开文章。

## 正文主体

3-5 个清晰小标题，每个小标题只承载一个主题。

## 操作建议 / 风险提示

清单式总结。

## 收尾

互动引导或简短提醒。
```

注意：「副标题」不是公众号后台独立字段，产品文案统一叫「副标题 / 导语」。

---

## 6. 小红书 Package

### schema_suggestions

```json
{
  "type": "PlatformPublishGuide",
  "json_ld": {
    "platform": "小红书",
    "package_type": "XHS Visual Publish Brief",
    "recommended_title": "小红书标题，口语化、场景化、强点击",
    "cover_copy": "封面主文案，建议 8-16 字",
    "cover_subcopy": "封面副文案，补充利益点或场景",
    "cover_suggestion": "封面画面建议：主体、构图、颜色、情绪",
    "visual_style": "视觉风格建议",
    "image_card_script": [
      {
        "card_no": 1,
        "card_title": "第 1 张图标题",
        "card_text": "第 1 张图正文，控制在 30-80 字",
        "layout_hint": "排版建议"
      }
    ],
    "image_text_transcript": ["第 1 张图完整文字稿", "第 2 张图完整文字稿"],
    "caption": "小红书正文 Caption，控制在 300-800 字",
    "tags": ["标签1", "标签2", "标签3"],
    "topics": ["#话题1", "#话题2"],
    "comment_prompt": "评论区引导话术",
    "risk_notes": ["避免绝对化承诺", "避免夸大结果"],
    "reusable_summary": "80-120 字可复用摘要",
    "canonical_content_suggestion": "建议同步发布官网文章版本"
  }
}
```

### final_article 结构

小红书 Caption（不是长文章）：

```markdown
## 内容摘要

一句话说明这篇笔记解决什么问题。

## 开头钩子

真实场景、常见误区或结论句。

## 正文

短段落 + 清单式表达 + 口语化解释。

## 收藏 / 评论引导

引导收藏、评论或咨询。
```

### 平台定位

小红书不是 GEO / AI 引用主阵地。产品解释文案（写入 comparison_summary）：

> 小红书平台以图文阅读和站内搜索为主，本发稿包优先优化真人阅读、收藏和互动；若需要提升 AI 可引用性，建议同步生成官网文章版本作为权威信源。

P0 只生成图文卡片脚本，不生成真实图片，不导出 PNG。

---

## 7. 知乎 Package

### schema_suggestions

```json
{
  "type": "PlatformPublishGuide",
  "json_ld": {
    "platform": "知乎问答",
    "package_type": "Zhihu Answer Publish Guide",
    "question_title": "问题式标题",
    "one_sentence_answer": "一句话结论",
    "answer_outline": ["论点1", "论点2", "论点3"],
    "evidence_points": ["可用事实依据1", "可用事实依据2"],
    "misconceptions": ["常见误区1", "常见误区2"],
    "related_questions": ["相关问题1", "相关问题2"],
    "publishing_notes": "知乎发布建议",
    "risk_notes": ["风险提示1", "风险提示2"],
    "reusable_summary": "80-120 字可复用摘要"
  }
}
```

### final_article 结构

知乎回答正文：

```markdown
## 一句话结论

先回答问题。

## 为什么是这个结论

展开论证。

## 关键事实依据

列出事实和证据。

## 常见误区

解释容易误解的地方。

## 操作建议

给出谨慎建议。
```

---

## 8. FAQ 规则（所有平台通用）

- FAQ 只能进入 `faq_content`，严禁进入 `final_article`。
- FAQ 需要 6-8 个问题。
- 必须包含：
  - 至少 1 个对比型问题（A 与 B 如何区分）
  - 至少 1 个参数型问题（需要哪些具体凭证 / 条件）
  - 至少 1 个场景型问题（在 XX 场景下如何处理）
- 答案必须基于原文和品牌事实，不得编造。
- 答案必须引用法律条款编号或正文段落，禁止纯复述。

---

## 9. comparison_summary 规则

必须结构化，采用四段式：

```
保留项：
...

增强项：
...

删减项：
...

风险处理：
...
```

额外规则：
- 如果平台是自媒体，必须包含一句说明：「该平台不支持 JSON-LD 结构化数据，已将 Schema 区块替换为平台发布建议。」
- 如果原文包含律师简介、律所简介、免责声明，放入 comparison_summary 末尾：

```
附：发布附属信息

- 律师简介：...
- 律所简介：...
- 免责声明：...
```

---

## 10. missing_sources 规则

每条 missing_source 必须具体到原文位置 + 建议来源类型：

- ❌ 错误："需要补充数据来源"
- ✅ 正确："[具体声明]（原文位置）— 建议补充 [来源类型]"
- ✅ 示例：「曹小姐休养诊疗八个月」（原文第 4 段）— 建议补充医院诊断记录或病历摘要

---

## 11. 多平台发稿包生成规则

P0 不新增 MultiPlatformBundle 表。多平台生成通过现有单平台任务能力实现：

1. 用户选择多个平台
2. 前端为每个平台分别调用 `POST /api/projects/{project_id}/tasks`
3. 每次请求传入不同 `publish_platform`
4. 每个平台单独调用现有后端改写流程
5. 每个平台生成一个独立 Rewrite Output
6. 每个平台独立评分、查看、导出

平台与 need_schema 默认规则：

| 平台 | need_schema 默认 |
|------|------------------|
| 官网文章 | true |
| 公众号 | false |
| 小红书 | false |
| 知乎问答 | false |

如果表单已有 need_schema 开关：保留，但平台规则优先。自媒体平台即使 need_schema=true，也不生成 Schema，而是生成 PlatformPublishGuide。
