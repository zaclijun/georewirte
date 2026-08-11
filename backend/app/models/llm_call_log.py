"""llm_call_logs 模型。"""
from __future__ import annotations

from typing import Optional

from sqlalchemy import Boolean, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampMixin, UUIDPkMixin
from app.database import Base


class LLMCallLog(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "llm_call_logs"
    __table_args__ = (
        Index("ix_llm_call_logs_task_id", "task_id"),
        Index("ix_llm_call_logs_provider", "provider"),
        Index("ix_llm_call_logs_created_at", "created_at"),
    )

    task_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("rewrite_tasks.id", ondelete="CASCADE"), nullable=True
    )
    output_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("rewrite_outputs.id", ondelete="CASCADE"), nullable=True
    )
    model_name: Mapped[str] = mapped_column(String(50), nullable=False)
    provider: Mapped[str] = mapped_column(String(20), nullable=False)
    prompt_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # score / rewrite / quality
    prompt_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cost_usd: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    latency_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    success: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="1"
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    task = relationship("RewriteTask", back_populates="llm_call_logs")
    output = relationship(
        "RewriteOutput",
        back_populates="llm_call_logs",
        foreign_keys=[output_id],
    )
