"""brand_facts 模型。"""
from __future__ import annotations

from typing import List, Optional

from sqlalchemy import Boolean, ForeignKey, Index, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampMixin, UUIDPkMixin
from app.database import Base


class BrandFact(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "brand_facts"
    __table_args__ = (
        Index("ix_brand_facts_project_id", "project_id"),
        Index("ix_brand_facts_fact_type", "fact_type"),
        Index("ix_brand_facts_title", "title"),
    )

    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    fact_type: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    source_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    source_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    evidence_level: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    tags: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="1"
    )

    project = relationship("Project", back_populates="brand_facts")
