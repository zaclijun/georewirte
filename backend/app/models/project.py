"""projects 模型。"""
from __future__ import annotations

from typing import Optional

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampMixin, UUIDPkMixin
from app.database import Base


class Project(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "projects"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    brand_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    default_perspective: Mapped[str] = mapped_column(
        String(50), nullable=False, default="第三方", server_default="第三方"
    )
    default_platform: Mapped[str] = mapped_column(
        String(50), nullable=False, default="官网文章", server_default="官网文章"
    )
    workspace_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="brand", server_default="brand"
    )

    brand_facts = relationship(
        "BrandFact", back_populates="project", cascade="all, delete-orphan"
    )
    rewrite_tasks = relationship(
        "RewriteTask", back_populates="project", cascade="all, delete-orphan"
    )
