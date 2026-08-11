"""rewrite_outputs 模型。"""
from __future__ import annotations

from typing import Any, List, Optional

from sqlalchemy import ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampMixin, UUIDPkMixin
from app.database import Base


class RewriteOutput(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "rewrite_outputs"
    __table_args__ = (
        UniqueConstraint("task_id", "version", name="uq_rewrite_outputs_task_version"),
        Index("ix_rewrite_outputs_task_id", "task_id"),
        Index("ix_rewrite_outputs_version", "version"),
    )

    task_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("rewrite_tasks.id", ondelete="CASCADE"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    parent_version_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("rewrite_outputs.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    final_article: Mapped[str] = mapped_column(Text, nullable=False, default="")
    faq_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    schema_suggestions: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    optimization_strategy: Mapped[Optional[List[Any]]] = mapped_column(
        JSON, nullable=True
    )
    comparison_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    missing_sources: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    missing_facts: Mapped[Optional[List[Any]]] = mapped_column(JSON, nullable=True)
    review_status: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    raw_response: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    task = relationship("RewriteTask", back_populates="outputs")
    scores = relationship(
        "ContentScore",
        back_populates="output",
        cascade="all, delete-orphan",
    )
    llm_call_logs = relationship(
        "LLMCallLog",
        back_populates="output",
        foreign_keys="LLMCallLog.output_id",
        cascade="all, delete-orphan",
    )
