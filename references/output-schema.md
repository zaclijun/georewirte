# Structured Output Schema

Use this JSON shape when the caller asks for machine-readable output or product integration.

```json
{
  "title": "文章标题",
  "draft_article_markdown": "原文或初稿 Markdown，可为空",
  "score_before": {
    "overall": 0,
    "dimensions": [
      { "name": "事实密度", "score": 0, "comment": "诊断说明" },
      { "name": "结构清晰度", "score": 0, "comment": "诊断说明" },
      { "name": "实体一致性", "score": 0, "comment": "诊断说明" },
      { "name": "来源权威性", "score": 0, "comment": "诊断说明" },
      { "name": "AI 触发覆盖", "score": 0, "comment": "诊断说明" },
      { "name": "Schema 就绪度", "score": 0, "comment": "诊断说明" }
    ],
    "raw_markdown": "优化前评分 Markdown"
  },
  "optimization_strategy": [
    {
      "issue": "问题",
      "action": "优化动作",
      "priority": "高/中/低",
      "evidence": "依据或需补充来源"
    }
  ],
  "final_article_markdown": "只包含可发布终稿正文和 FAQ，不包含评分、策略、Schema、前后对比或执行说明",
  "score_after": {
    "overall": 0,
    "dimensions": [
      { "name": "事实密度", "score": 0, "comment": "诊断说明" }
    ],
    "raw_markdown": "优化后评分 Markdown"
  },
  "schema_suggestions": {
    "raw": "JSON-LD 或 Markdown 形式的 Schema 建议"
  },
  "comparison": "前后对比摘要，说明保留、增强、删减和风险处理",
  "missing_sources": [
    "所有待补证据，不要写进可发布终稿正文"
  ],
  "review": {
    "quality_status": "ready/review/needs_material",
    "publish_label": "可发布/建议检查/需补充材料",
    "reasons": ["判断理由"],
    "highlights": ["主要提升点"]
  }
}
```

Rules:

- Output valid JSON only when structured output is requested.
- Do not wrap JSON in Markdown code fences.
- Put all source gaps in `missing_sources`.
- Keep `final_article_markdown` publishable and free of process text.
- If the original article is already high quality, keep `draft_article_markdown` close to the original and make `comparison` explain the light-touch enhancement.
