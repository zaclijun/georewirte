"""model_configs 模型：用户配置的 LLM 模型。"""
from __future__ import annotations

from typing import Optional

from sqlalchemy import Boolean, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import TimestampMixin, UUIDPkMixin
from app.database import Base


class ModelConfig(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "model_configs"

    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    provider_label: Mapped[str] = mapped_column(String(100), nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    api_key_encrypted: Mapped[str] = mapped_column(String(500), nullable=False)
    base_url: Mapped[str] = mapped_column(String(300), nullable=False)
    model_id: Mapped[str] = mapped_column(String(100), nullable=False)
    enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="1"
    )
    is_default: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0"
    )
    temperature: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    supports_streaming: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0"
    )
