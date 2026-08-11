"""content_scores 模型。"""
from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import UUIDPkMixin
from app.database import Base


class ContentScore(Base, UUIDPkMixin):
    __tablename__ = "content_scores"
    __table_args__ = (
        Index("ix_content_scores_output_id", "output_id"),
        Index("ix_content_scores_score_type", "score_type"),
    )

    output_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("rewrite_outputs.id", ondelete="CASCADE"), nullable=False
    )
    score_type: Mapped[str] = mapped_column(String(10), nullable=False)  # before / after
    overall: Mapped[int] = mapped_column(Integer, nullable=False)
    factual_density: Mapped[int] = mapped_column(Integer, nullable=False)
    structural_clarity: Mapped[int] = mapped_column(Integer, nullable=False)
    entity_consistency: Mapped[int] = mapped_column(Integer, nullable=False)
    source_authority: Mapped[int] = mapped_column(Integer, nullable=False)
    ai_trigger_coverage: Mapped[int] = mapped_column(Integer, nullable=False)
    schema_readiness: Mapped[int] = mapped_column(Integer, nullable=False)
    dimension_comments: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    raw_markdown: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    output = relationship("RewriteOutput", back_populates="scores")
