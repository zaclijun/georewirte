"""RewriteOutput 相关 Schema（含评分子结构）。"""
from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---- 评分子结构 ----
class ScoreDimension(BaseModel):
    name: str
    score: int
    comment: Optional[str] = None


class ScoreSummary(BaseModel):
    overall: int
    dimensions: List[ScoreDimension] = Field(default_factory=list)


class OptimizationStrategyItem(BaseModel):
    issue: str
    action: str
    priority: Optional[str] = None
    evidence: Optional[str] = None


class MissingFactItem(BaseModel):
    title: str
    fact_type: Optional[str] = None
    content: Optional[str] = None
    reason: Optional[str] = None


class SchemaSuggestion(BaseModel):
    type: Optional[str] = None
    json_ld: Optional[Any] = None


# ---- 输出 ----
class RewriteOutputBase(BaseModel):
    title: Optional[str] = None
    final_article: str
    faq_content: Optional[str] = None
    schema_suggestions: Optional[Any] = None
    optimization_strategy: Optional[List[Any]] = None
    comparison_summary: Optional[str] = None
    missing_sources: Optional[List[str]] = None
    missing_facts: Optional[List[Any]] = None
    review_status: Optional[str] = None


class RewriteOutputListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: str
    version: int
    title: Optional[str] = None
    review_status: Optional[str] = None
    created_at: datetime


class RewriteOutputOut(RewriteOutputBase):
    """输出详情（含改前改后评分）。"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: str
    version: int
    parent_version_id: Optional[str] = None
    score_before: Optional[ScoreSummary] = None
    score_after: Optional[ScoreSummary] = None
    created_at: datetime


class ScoreOut(BaseModel):
    """单条评分记录。"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    output_id: str
    score_type: str
    overall: int
    factual_density: int
    structural_clarity: int
    entity_consistency: int
    source_authority: int
    ai_trigger_coverage: int
    schema_readiness: int
    dimension_comments: Optional[Any] = None


class ScorePairOut(BaseModel):
    """改前 + 改后评分对。"""

    score_before: Optional[ScoreOut] = None
    score_after: Optional[ScoreOut] = None
