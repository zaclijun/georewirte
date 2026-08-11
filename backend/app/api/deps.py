"""API 层公共依赖与响应辅助。"""
from __future__ import annotations

from typing import Any, List, Optional

from fastapi import HTTPException


class APIException(HTTPException):
    """业务异常，统一转换为 {code, message, data: null} 响应。"""

    def __init__(
        self,
        message: str,
        *,
        code: int = 1,
        status_code: int = 400,
    ) -> None:
        self.code = code
        self.message = message
        super().__init__(status_code=status_code, detail=message)


def ok(data: Any = None, message: str = "success") -> dict:
    return {"code": 0, "message": message, "data": data}


def paginate(items: List[Any], total: int, page: int, page_size: int) -> dict:
    return {"items": items, "total": total, "page": page, "page_size": page_size}


def get_page_params(page: Optional[int], page_size: Optional[int]) -> tuple[int, int]:
    p = max(int(page or 1), 1)
    ps = min(max(int(page_size or 20), 1), 100)
    return p, ps
