"""模型公共基类与 Mixin。"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _new_uuid() -> str:
    return str(uuid.uuid4())


class UUIDPkMixin:
    """统一使用字符串 UUID 作为主键（PG/SQLite 兼容）。"""

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_new_uuid
    )


class TimestampMixin:
    """created_at / updated_at 自动维护。"""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.current_timestamp(),
        default=_utcnow,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.current_timestamp(),
        default=_utcnow,
        onupdate=_utcnow,
    )
