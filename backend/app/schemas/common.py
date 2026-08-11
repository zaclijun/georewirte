"""通用响应与分页 Schema。"""
from __future__ import annotations

from typing import Any, Generic, List, Optional, TypeVar

from pydantic import BaseModel, Field


T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """统一响应格式。"""

    code: int = 0
    message: str = "success"
    data: Optional[T] = None


class PageParams(BaseModel):
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


class PaginatedData(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int


class MessageOut(BaseModel):
    message: str
