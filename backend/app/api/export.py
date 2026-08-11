"""Export API：完整 Rewrite Package 导出（Markdown / JSON）。"""
from __future__ import annotations

from urllib.parse import quote

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import APIException
from app.database import get_db
from app.models.rewrite_output import RewriteOutput
from app.services.export_service import export_service

router = APIRouter(tags=["export"])


@router.get("/api/outputs/{output_id}/export")
def export_output(
    output_id: str,
    format: str = Query("markdown", description="markdown / json"),
    db: Session = Depends(get_db),
):
    output = db.get(RewriteOutput, output_id)
    if not output:
        raise APIException("改写结果不存在", status_code=404)

    fmt = (format or "markdown").lower()
    if fmt == "json":
        filename, content = export_service.build_json(db, output)
        media_type = "application/json; charset=utf-8"
    else:
        filename, content = export_service.build_markdown(db, output)
        media_type = "text/markdown; charset=utf-8"

    # 导出是用户动作，不应改变内容质量状态（review_status）。
    # 原本的 output.review_status = "exported" 副作用会让"建议检查/需复核"标签消失，
    # 已移除。如需记录导出行为，后续可单独建表，本轮不做。

    # RFC 5987 编码文件名，兼容中文
    encoded = quote(filename)
    ascii_fallback = filename.encode("ascii", "ignore").decode("ascii") or "rewrite"
    headers = {
        "Content-Disposition": (
            f"attachment; filename=\"{ascii_fallback}\"; filename*=UTF-8''{encoded}"
        )
    }
    return Response(content=content.encode("utf-8"), media_type=media_type, headers=headers)
