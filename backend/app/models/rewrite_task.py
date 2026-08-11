"""rewrite_tasks 模型。"""
from __future__ import annotations

from typing import List, Optional

from sqlalchemy import Boolean, ForeignKey, Index, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampMixin, UUIDPkMixin
from app.database import Base


class RewriteTask(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "rewrite_tasks"
    __table_args__ = (
        Index("ix_rewrite_tasks_project_id", "project_id"),
        Index("ix_rewrite_tasks_status", "status"),
        Index("ix_rewrite_tasks_created_at", "created_at"),
    )

    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    original_content: Mapped[str] = mapped_column(Text, nullable=False)
    article_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    perspective: Mapped[str] = mapped_column(
        String(20), nullable=False, default="第三方", server_default="第三方"
    )
    publish_platform: Mapped[str] = mapped_column(
        String(20), nullable=False, default="官网文章", server_default="官网文章"
    )
    target_audience: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    source_policy: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="mark_missing_sources",
        server_default="mark_missing_sources",
    )
    output_length: Mapped[str] = mapped_column(
        String(20), nullable=False, default="standard", server_default="standard"
    )
    need_schema: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="1"
    )
    brand_fact_ids: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", server_default="pending"
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # ---- 关联用户配置的模型（可选，为空则走全局 LLM 配置）----
    model_config_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    model_provider: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    model_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    model_display_name: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )

    project = relationship("Project", back_populates="rewrite_tasks")
    outputs = relationship(
        "RewriteOutput",
        back_populates="task",
        cascade="all, delete-orphan",
        order_by="RewriteOutput.version",
    )
    llm_call_logs = relationship(
        "LLMCallLog",
        back_populates="task",
        cascade="all, delete-orphan",
        order_by="LLMCallLog.created_at",
    )
