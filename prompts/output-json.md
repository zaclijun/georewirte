# Output JSON Prompt（输出整合 · 可选）

## 任务说明

将各步骤的输出整合为标准 JSON 格式，供 API/产品集成使用。

**P0 说明**：后端可以直接用代码组装最终输出，不一定需要调用此 Prompt。此文件作为备用参考，便于后续扩展。

输出必须是严格的 JSON 格式，不包含任何额外文字。

---

## 输入变量

| 变量 | 说明 |
|------|------|
| `{{title}}` | 改写后标题 |
| `{{original_article}}` | 原文内容 |
| `{{score_before_json}}` | 改前评分 JSON（来自 score-and-diagnose） |
| `{{optimization_strategy_json}}` | 优化策略 JSON 数组（来自 score-and-diagnose） |
| `{{final_article}}` | 改写后正文（Markdown） |
| `{{faq_content}}` | FAQ 内容（Markdown） |
| `{{schema_suggestions_json}}` | Schema 建议 JSON（来自 rewrite-package） |
| `{{score_after_json}}` | 改后评分 JSON（来自 rewrite-package） |
| `{{comparison_summary}}` | 前后对比摘要 |
| `{{missing_sources_json}}` | 待补充来源 JSON 数组 |
| `{{quality_check_json}}` | 质量检查结果 JSON（可选，来自 quality-check） |
| `{{perspective}}` | 写作视角 |
| `{{platform}}` | 发布平台 |
| `{{source_policy}}` | 来源策略 |

---

## 输出 Schema 规范

参考 `references/output-schema.md`，输出完整的结构化 JSON：

```json
{
  "title": "文章标题",
  "draft_article_markdown": "原文或初稿 Markdown",
  "perspective": "第三方",
  "publish_platform": "官网文章",
  "source_policy": "mark_missing_sources",
  "score_before": {
    "overall": 75,
    "dimensions": [
      { "name": "事实密度", "score": 70, "comment": "诊断说明" },
      { "name": "结构清晰度", "score": 80, "comment": "诊断说明" },
      { "name": "实体一致性", "score": 75, "comment": "诊断说明" },
      { "name": "来源权威性", "score": 65, "comment": "诊断说明" },
      { "name": "AI 触发覆盖", "score": 72, "comment": "诊断说明" },
      { "name": "Schema 就绪度", "score": 68, "comment": "诊断说明" }
    ]
  },
  "optimization_strategy": [
    {
      "issue": "问题描述",
      "action": "优化动作",
      "priority": "high",
      "evidence": "依据或需补充来源"
    }
  ],
  "final_article_markdown": "只包含可发布终稿正文和 FAQ，不包含评分、策略、Schema、前后对比或执行说明",
  "score_after": {
    "overall": 88,
    "dimensions": [
      { "name": "事实密度", "score": 90, "comment": "诊断说明" },
      { "name": "结构清晰度", "score": 92, "comment": "诊断说明" },
      { "name": "实体一致性", "score": 90, "comment": "诊断说明" },
      { "name": "来源权威性", "score": 82, "comment": "诊断说明" },
      { "name": "AI 触发覆盖", "score": 88, "comment": "诊断说明" },
      { "name": "Schema 就绪度", "score": 86, "comment": "诊断说明" }
    ]
  },
  "schema_suggestions": {
    "type": "Article + FAQPage",
    "json_ld": {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "文章标题"
    }
  },
  "comparison": "前后对比摘要，说明保留、增强、删减和风险处理",
  "missing_sources": [
    "所有待补证据"
  ],
  "review": {
    "quality_status": "ready",
    "publish_label": "可发布",
    "reasons": ["判断理由"],
    "highlights": ["主要提升点"]
  }
}
```

---

## 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 改写后的文章标题 |
| `draft_article_markdown` | string | 原文 Markdown |
| `perspective` | string | 写作视角 |
| `publish_platform` | string | 发布平台 |
| `source_policy` | string | 来源策略 |
| `score_before` | object | 改前评分 |
| `score_before.overall` | number | 总分（0-100） |
| `score_before.dimensions` | array | 6 维度评分数组 |
| `optimization_strategy` | array | 优化策略列表 |
| `final_article_markdown` | string | 可发布终稿（正文 + FAQ） |
| `score_after` | object | 改后评分（结构同 score_before） |
| `schema_suggestions` | object | Schema 建议 |
| `comparison` | string | 前后对比摘要 |
| `missing_sources` | array | 待补充来源列表 |
| `review` | object | 质量审核 |
| `review.quality_status` | string | ready / review / needs_material |
| `review.publish_label` | string | 可发布 / 建议检查 / 需补充材料 |
| `review.reasons` | array | 判断理由列表 |
| `review.highlights` | array | 主要提升点列表 |

---

## 注意事项

1. **final_article_markdown 必须纯净**：只包含正文 + FAQ 的可发布 Markdown，不要有任何过程性文字、评分、策略等。
2. **字段完整**：确保所有字段都有值，空值用 `null` 或空数组/空字符串表示。
3. **严格 JSON 格式**：只输出 JSON 对象，不要有任何其他文字，不要包裹在 Markdown 代码块中。
4. **数据类型正确**：数字类型不要用字符串表示，布尔值用 true/false。
5. **中文输出**：所有描述性字段均使用中文。
6. **review 字段默认值**：如果没有调用 quality-check，review 字段可以基于 score_after 和 missing_sources 自动推断生成。
