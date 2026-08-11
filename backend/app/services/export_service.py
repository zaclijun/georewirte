"""ExportService：完整 Rewrite Package 导出（Markdown / JSON）。"""
from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.content_score import ContentScore
from app.models.rewrite_output import RewriteOutput
from app.models.rewrite_task import RewriteTask
from app.services.scoring_service import scoring_service


_PUBLISH_LABEL = {
    "ready": "可发布",
    "review": "建议检查",
    "needs_material": "需补充材料",
    "exported": "已导出",
}

_DIMENSIONS = [
    ("事实密度", "factual_density"),
    ("结构清晰度", "structural_clarity"),
    ("实体一致性", "entity_consistency"),
    ("来源权威性", "source_authority"),
    ("AI 触发覆盖", "ai_trigger_coverage"),
    ("Schema 就绪度", "schema_readiness"),
]


class ExportService:
    def build_markdown(self, db: Session, output: RewriteOutput) -> Tuple[str, str]:
        """返回 (filename, markdown_content)。"""
        task = db.get(RewriteTask, output.task_id)
        before, after = self._load_scores(db, output.id)

        lines: List[str] = []
        title = output.title or (task.title if task else "未命名改写")
        lines.append("# GEO Rewrite Package")
        lines.append("")
        lines.append(f"**{title}**")
        lines.append("")

        # 基本信息
        lines.append("## 基本信息")
        lines.append("")
        info_rows = [
            ("版本", f"v{output.version}"),
            ("视角", task.perspective if task else "-"),
            ("内容资产类型", task.publish_platform if task else "-"),
            ("来源策略", task.source_policy if task else "-"),
            ("输出长度", task.output_length if task else "-"),
            ("生成时间", _fmt_dt(output.created_at)),
            ("质量状态", _PUBLISH_LABEL.get(output.review_status or "", "-")),
        ]
        lines.append("| 项目 | 内容 |")
        lines.append("| --- | --- |")
        for k, v in info_rows:
            lines.append(f"| {k} | {v} |")
        lines.append("")

        # 交付摘要
        lines.append("## 交付摘要")
        lines.append("")
        lines.append(output.comparison_summary or "（无对比摘要）")
        lines.append("")

        # 可发布正文
        lines.append("## 可发布正文")
        lines.append("")
        lines.append(output.final_article or "（无正文）")
        lines.append("")

        # FAQ（剥离 LLM 可能误加的重复 `## FAQ` 标题，避免与章节标题重复）
        lines.append("## FAQ")
        lines.append("")
        lines.append(self._strip_faq_header(output.faq_content or "（未生成 FAQ）"))
        lines.append("")

        # Schema 建议 / 平台发布建议（动态标题）
        schema_section_title = self._schema_section_title(output.schema_suggestions, task)
        lines.append(f"## {schema_section_title}")
        lines.append("")
        lines.append(self._schema_block(output.schema_suggestions))
        lines.append("")

        # 评分诊断
        lines.append("## 评分诊断")
        lines.append("")
        lines.append("### 改前评分")
        lines.append("")
        lines.append(self._score_table(before))
        lines.append("")
        lines.append("### 改后评分")
        lines.append("")
        lines.append(self._score_table(after))
        lines.append("")

        # 优化策略
        lines.append("## 优化策略")
        lines.append("")
        lines.append(self._strategy_block(output.optimization_strategy))
        lines.append("")

        # 来源缺口
        lines.append("## 来源缺口")
        lines.append("")
        lines.append(self._list_block(output.missing_sources))
        lines.append("")

        # 待补充事实
        lines.append("## 待补充事实")
        lines.append("")
        lines.append(self._missing_facts_block(output.missing_facts))
        lines.append("")

        markdown = "\n".join(lines)
        filename = self._filename(title, output.version, "md")
        return filename, markdown

    def _schema_section_title(self, schema: Any, task: Optional[RewriteTask]) -> str:
        """根据 schema_suggestions.type 与内容资产类型动态决定导出章节标题。"""
        if not schema:
            return "Schema 建议"
        try:
            stype = schema.get("type", "") if isinstance(schema, dict) else ""
        except Exception:
            stype = ""
        if stype == "PlatformPublishGuide":
            platform = task.publish_platform if task else ""
            if platform == "小红书":
                return "小红书图文脚本"
            return "发布建议"
        return "Schema 建议"

    def build_json(self, db: Session, output: RewriteOutput) -> Tuple[str, str]:
        """返回 (filename, json_content)。"""
        task = db.get(RewriteTask, output.task_id)
        before, after = self._load_scores(db, output.id)
        payload = {
            "id": output.id,
            "task_id": output.task_id,
            "version": output.version,
            "parent_version_id": output.parent_version_id,
            "title": output.title,
            "perspective": task.perspective if task else None,
            "publish_platform": task.publish_platform if task else None,
            "source_policy": task.source_policy if task else None,
            "output_length": task.output_length if task else None,
            "review_status": output.review_status,
            "publish_label": _PUBLISH_LABEL.get(output.review_status or ""),
            "created_at": _fmt_dt(output.created_at),
            "score_before": (
                scoring_service.score_summary_from_score(before) if before else None
            ),
            "score_after": (
                scoring_service.score_summary_from_score(after) if after else None
            ),
            "final_article": output.final_article,
            "faq_content": output.faq_content,
            "schema_suggestions": output.schema_suggestions,
            "optimization_strategy": output.optimization_strategy,
            "comparison_summary": output.comparison_summary,
            "missing_sources": output.missing_sources,
            "missing_facts": output.missing_facts,
        }
        content = json.dumps(payload, ensure_ascii=False, indent=2)
        title = output.title or (task.title if task else "未命名改写")
        filename = self._filename(title, output.version, "json")
        return filename, content

    # ---- 辅助 ----
    def _strip_faq_header(self, faq: str) -> str:
        """剥离 faq_content 开头可能被 LLM 误加的 `## FAQ` / `# FAQ` 标题行。

        LLM 输出 faq_content 时偶尔会在开头带 `## FAQ`，与导出章节标题 `## FAQ` 重复。
        此方法只剥离开头第一个 `# FAQ` / `## FAQ` 标题行，保留正文与所有问题。
        """
        if not faq:
            return faq
        stripped = faq.lstrip()
        for prefix in ("## FAQ", "# FAQ"):
            if stripped.startswith(prefix):
                # 跳过该行及其后的空行
                rest = stripped[len(prefix):]
                return rest.lstrip("\n").lstrip()
        return faq

    def _load_scores(
        self, db: Session, output_id: str
    ) -> Tuple[Optional[ContentScore], Optional[ContentScore]]:
        rows = (
            db.query(ContentScore)
            .filter(ContentScore.output_id == output_id)
            .all()
        )
        before = next((r for r in rows if r.score_type == "before"), None)
        after = next((r for r in rows if r.score_type == "after"), None)
        return before, after

    def _score_table(self, score: Optional[ContentScore]) -> str:
        if score is None:
            return "（无评分数据）"
        comments = score.dimension_comments or []
        comment_map: Dict[str, str] = {}
        for item in comments:
            if isinstance(item, dict) and item.get("name"):
                comment_map[item["name"]] = item.get("comment") or ""

        lines = [
            f"**总分：{score.overall} / 100**",
            "",
            "| 维度 | 分数 | 诊断说明 |",
            "| --- | --- | --- |",
        ]
        for cn_name, col in _DIMENSIONS:
            value = getattr(score, col)
            comment = comment_map.get(cn_name, "")
            lines.append(f"| {cn_name} | {value} | {comment} |")
        return "\n".join(lines)

    def _schema_block(self, schema: Any) -> str:
        if not schema:
            return "（未生成 Schema）"
        try:
            stype = schema.get("type", "") if isinstance(schema, dict) else ""
            json_ld = schema.get("json_ld", {}) if isinstance(schema, dict) else {}
        except Exception:
            return f"```json\n{json.dumps(schema, ensure_ascii=False, indent=2)}\n```"

        # PlatformPublishGuide：结构化字段渲染
        if stype == "PlatformPublishGuide":
            return self._platform_guide_block(json_ld)
        # Schema JSON-LD：原样输出
        return (
            f"类型：{stype or '-'}\n\n"
            "```json\n"
            f"{json.dumps(json_ld, ensure_ascii=False, indent=2)}"
            "\n```"
        )

    def _platform_guide_block(self, guide: Dict[str, Any]) -> str:
        """渲染平台发布建议为可读 Markdown 字段（非黑底 JSON）。"""
        if not isinstance(guide, dict) or not guide:
            return "（平台发布建议为空）"
        lines: List[str] = []
        platform = guide.get("platform", "")
        package_type = guide.get("package_type", "")
        if platform:
            lines.append(f"- **平台**：{platform}")
        if package_type:
            lines.append(f"- **包类型**：{package_type}")

        # 通用字符串字段
        str_fields = [
            ("recommended_title", "推荐标题"),
            ("question_title", "问题式标题"),
            ("subtitle", "副标题 / 导语"),
            ("cover_summary", "封面摘要"),
            ("cover_copy", "封面主文案"),
            ("cover_subcopy", "封面副文案"),
            ("opening_hook", "开头钩子"),
            ("cover_suggestion", "封面建议"),
            ("visual_style", "视觉风格"),
            ("paragraph_style", "段落排版建议"),
            ("one_sentence_answer", "一句话结论"),
            ("caption", "Caption 正文"),
            ("comment_prompt", "评论区引导"),
            ("publishing_notes", "发布建议"),
            ("reusable_summary", "可复用摘要"),
            ("canonical_content_suggestion", "建议关联官网原文"),
            # 内容资产类型专属字段（P0 6 类）
            ("lead", "导语"),
            ("media_publish_notes", "媒体发布注意事项"),
            ("industry_angle", "行业切入角度"),
            ("publish_advice", "发布建议"),
            ("answer_summary", "直接回答 / 一句话结论"),
            ("case_structure", "案例结构说明"),
            ("cta", "互动引导 / CTA"),
        ]
        for key, label in str_fields:
            val = guide.get(key)
            if val:
                lines.append(f"- **{label}**：{val}")

        # 列表字段
        list_fields = [
            ("section_titles", "正文小标题"),
            ("quote_cards", "金句卡片建议"),
            ("answer_outline", "回答结构"),
            ("evidence_points", "事实依据"),
            ("misconceptions", "常见误区"),
            ("related_questions", "相关问题"),
            ("tags", "标签"),
            ("topics", "话题"),
            ("risk_notes", "风险提示"),
            # 内容资产类型专属字段（P0 6 类）
            ("headline_options", "标题候选"),
            ("key_facts", "关键事实"),
            ("key_points", "核心观点"),
            ("source_gaps", "待补充来源"),
            ("follow_up_questions", "常见追问"),
            ("missing_case_facts", "待补充案例事实"),
        ]
        for key, label in list_fields:
            val = guide.get(key)
            if isinstance(val, list) and val:
                lines.append(f"- **{label}**：")
                for item in val:
                    lines.append(f"  - {item}")

        # 图文卡片脚本（小红书）
        cards = guide.get("image_card_script")
        if isinstance(cards, list) and cards:
            lines.append("- **图文卡片脚本**：")
            for c in cards:
                if isinstance(c, dict):
                    lines.append(
                        f"  - 第 {c.get('card_no', '?')} 张：{c.get('card_title', '')}"
                    )
                    if c.get("card_text"):
                        lines.append(f"    - 正文：{c.get('card_text')}")
                    if c.get("layout_hint"):
                        lines.append(f"    - 排版：{c.get('layout_hint')}")
                else:
                    lines.append(f"  - {c}")

        transcripts = guide.get("image_text_transcript")
        if isinstance(transcripts, list) and transcripts:
            lines.append("- **图片文字稿合集**：")
            for t in transcripts:
                lines.append(f"  - {t}")

        return "\n".join(lines) if lines else "（平台发布建议为空）"

    def _strategy_block(self, strategy: Any) -> str:
        if not strategy:
            return "（无优化策略）"
        if isinstance(strategy, str):
            return strategy
        lines: List[str] = []
        for idx, item in enumerate(strategy, 1):
            if not isinstance(item, dict):
                lines.append(f"{idx}. {item}")
                continue
            issue = item.get("issue", "")
            action = item.get("action", "")
            priority = item.get("priority", "")
            evidence = item.get("evidence", "")
            lines.append(f"### {idx}. {issue}")
            lines.append("")
            lines.append(f"- **优化动作**：{action}")
            if priority:
                lines.append(f"- **优先级**：{priority}")
            if evidence:
                lines.append(f"- **依据**：{evidence}")
            lines.append("")
        return "\n".join(lines)

    def _list_block(self, items: Any) -> str:
        if not items:
            return "（无）"
        if isinstance(items, str):
            return items
        return "\n".join(f"- {item}" for item in items)

    def _missing_facts_block(self, facts: Any) -> str:
        if not facts:
            return "（无）"
        if isinstance(facts, str):
            return facts
        lines: List[str] = []
        for item in facts:
            if isinstance(item, dict):
                title = item.get("title", "未命名事实")
                ftype = item.get("fact_type", "")
                content = item.get("content", "")
                reason = item.get("reason", "")
                lines.append(f"### {title}")
                if ftype:
                    lines.append(f"- **类型**：{ftype}")
                if content:
                    lines.append(f"- **内容**：{content}")
                if reason:
                    lines.append(f"- **建议理由**：{reason}")
                lines.append("")
            else:
                lines.append(f"- {item}")
        return "\n".join(lines)

    def _filename(self, title: str, version: int, ext: str) -> str:
        safe = re.sub(r"[\\/:*?\"<>|\s]+", "_", title).strip("_")
        safe = safe[:60] or "rewrite"
        return f"GEO_Rewrite_{safe}_v{version}.{ext}"


def _fmt_dt(dt: Any) -> str:
    if dt is None:
        return "-"
    try:
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return str(dt)


export_service = ExportService()
