"""ScoringService：Call 1 评分诊断 + 评分结果映射。"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.brand_fact import BrandFact
from app.models.content_score import ContentScore
from app.models.model_config import ModelConfig
from app.models.rewrite_task import RewriteTask
from app.services.llm_service import llm_service
from app.services.prompt_service import prompt_service


# 中文维度名 → content_scores 列名
DIMENSION_MAP: Dict[str, str] = {
    "事实密度": "factual_density",
    "结构清晰度": "structural_clarity",
    "实体一致性": "entity_consistency",
    "来源权威性": "source_authority",
    "AI 触发覆盖": "ai_trigger_coverage",
    "Schema 就绪度": "schema_readiness",
}

DIMENSION_NAMES = list(DIMENSION_MAP.keys())


def serialize_brand_facts(facts: List[BrandFact]) -> List[Dict[str, Any]]:
    """把 BrandFact ORM 对象转为可注入 Prompt 的精简字典列表。"""
    result: List[Dict[str, Any]] = []
    for f in facts:
        result.append(
            {
                "fact_type": f.fact_type,
                "title": f.title,
                "content": f.content,
                "source_type": f.source_type,
                "source_url": f.source_url,
                "evidence_level": f.evidence_level,
                "tags": f.tags or [],
            }
        )
    return result


class ScoringService:
    def score_and_diagnose(
        self,
        db: Session,
        task: RewriteTask,
        facts: List[BrandFact],
        model_config: Optional[ModelConfig] = None,
    ) -> Dict[str, Any]:
        """Call 1：原文评分 + 诊断 + 优化策略。返回解析后的 JSON dict。"""
        system_prompt = prompt_service.load("system-role.md")
        template = prompt_service.load("score-and-diagnose.md")

        perspective_rules = prompt_service.get_perspective_rules(task.perspective)
        platform_rules = prompt_service.get_platform_rules(task.publish_platform)
        brand_facts_json = json.dumps(
            serialize_brand_facts(facts), ensure_ascii=False
        )

        user_prompt = prompt_service.interpolate(
            template,
            {
                "article": task.original_content,
                "perspective": task.perspective,
                "perspective_rules": perspective_rules or "（无特殊视角规则）",
                "platform": task.publish_platform,
                "platform_rules": platform_rules or "（无特殊平台规则）",
                "brand_facts": brand_facts_json,
                "source_policy": task.source_policy,
            },
        )

        result = llm_service.chat_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            prompt_type="score",
            temperature=0.1,
            task_id=task.id,
            model_config=model_config,
        )
        return result

    # ---- 评分结果映射 ----
    def build_content_score(
        self,
        score_obj: Dict[str, Any],
        score_type: str,
        output_id: str,
    ) -> ContentScore:
        """将 LLM 返回的 score_before/score_after 对象映射为 ContentScore 实例（未提交）。"""
        overall = int(score_obj.get("overall", 0))
        dimensions = score_obj.get("dimensions", []) or []
        field_values: Dict[str, int] = {col: 0 for col in DIMENSION_MAP.values()}
        comments: List[Dict[str, Any]] = []
        for dim in dimensions:
            name = str(dim.get("name", "")).strip()
            score = int(dim.get("score", 0))
            comment = dim.get("comment")
            comments.append(
                {"name": name, "score": score, "comment": comment}
            )
            col = DIMENSION_MAP.get(name)
            if col:
                field_values[col] = score

        return ContentScore(
            output_id=output_id,
            score_type=score_type,
            overall=overall,
            factual_density=field_values["factual_density"],
            structural_clarity=field_values["structural_clarity"],
            entity_consistency=field_values["entity_consistency"],
            source_authority=field_values["source_authority"],
            ai_trigger_coverage=field_values["ai_trigger_coverage"],
            schema_readiness=field_values["schema_readiness"],
            dimension_comments=comments,
            raw_markdown=json.dumps(score_obj, ensure_ascii=False),
        )

    @staticmethod
    def score_summary_from_score(score: ContentScore) -> Dict[str, Any]:
        """从 ContentScore ORM 重建 ScoreSummary 结构（用于响应）。

        优先从 dimension_comments 重建 dimensions，这是唯一承载全量平台化维度
        （公众号 / 小红书 / 知乎的标题吸引力、首屏导语等）的地方。

        固定 6 列（factual_density 等）只承载官网文章或历史数据，当且仅当
        dimension_comments 为空时作为 fallback。
        """
        comments = score.dimension_comments or []

        # 优先：从 dimension_comments 重建（承载平台化维度）
        if comments:
            dimensions: List[Dict[str, Any]] = []
            for item in comments:
                if not isinstance(item, dict):
                    continue
                name = str(item.get("name", "")).strip()
                if not name:
                    continue
                raw_score = item.get("score", 0)
                try:
                    score_val = int(raw_score)
                except (TypeError, ValueError):
                    score_val = 0
                dimensions.append(
                    {
                        "name": name,
                        "score": score_val,
                        "comment": item.get("comment"),
                    }
                )
            if dimensions:
                return {"overall": score.overall, "dimensions": dimensions}

        # Fallback：从 6 个固定列重建（官网文章或历史数据，dimension_comments 为空）
        dimensions = []
        for cn_name, col in DIMENSION_MAP.items():
            dimensions.append(
                {
                    "name": cn_name,
                    "score": getattr(score, col, 0),
                    "comment": None,
                }
            )
        return {"overall": score.overall, "dimensions": dimensions}


scoring_service = ScoringService()
