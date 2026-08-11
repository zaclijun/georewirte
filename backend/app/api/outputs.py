"""Output API：改写结果版本与评分。"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.api.deps import APIException, ok
from app.database import get_db
from app.models.content_score import ContentScore
from app.models.rewrite_output import RewriteOutput
from app.models.rewrite_task import RewriteTask
from app.schemas.rewrite_output import (
    RewriteOutputListItem,
    RewriteOutputOut,
    ScoreOut,
)
from app.services.rewrite_service import rewrite_service
from app.services.scoring_service import scoring_service

router = APIRouter(tags=["outputs"])


def _load_scores(db: Session, output_id: str):
    rows = (
        db.query(ContentScore)
        .filter(ContentScore.output_id == output_id)
        .all()
    )
    before = next((r for r in rows if r.score_type == "before"), None)
    after = next((r for r in rows if r.score_type == "after"), None)
    return before, after


def _to_detail(db: Session, output: RewriteOutput) -> dict:
    before, after = _load_scores(db, output.id)
    data = RewriteOutputOut.model_validate(output).model_dump(mode="json")
    data["score_before"] = (
        scoring_service.score_summary_from_score(before) if before else None
    )
    data["score_after"] = (
        scoring_service.score_summary_from_score(after) if after else None
    )
    return data


@router.get("/api/tasks/{task_id}/outputs")
def list_outputs(task_id: str, db: Session = Depends(get_db)):
    task = db.get(RewriteTask, task_id)
    if not task:
        raise APIException("任务不存在", status_code=404)
    items = (
        db.query(RewriteOutput)
        .filter(RewriteOutput.task_id == task_id)
        .order_by(desc(RewriteOutput.version))
        .all()
    )
    return ok([RewriteOutputListItem.model_validate(o).model_dump(mode="json") for o in items])


@router.get("/api/outputs/{output_id}")
def get_output(output_id: str, db: Session = Depends(get_db)):
    output = db.get(RewriteOutput, output_id)
    if not output:
        raise APIException("改写结果不存在", status_code=404)
    return ok(_to_detail(db, output))


@router.get("/api/outputs/{output_id}/scores")
def get_output_scores(output_id: str, db: Session = Depends(get_db)):
    output = db.get(RewriteOutput, output_id)
    if not output:
        raise APIException("改写结果不存在", status_code=404)
    before, after = _load_scores(db, output_id)
    data = {
        "score_before": (
            ScoreOut.model_validate(before).model_dump(mode="json") if before else None
        ),
        "score_after": (
            ScoreOut.model_validate(after).model_dump(mode="json") if after else None
        ),
    }
    return ok(data)


@router.post("/api/outputs/{output_id}/regenerate")
def regenerate_output(output_id: str, db: Session = Depends(get_db)):
    """基于该版本重新改写，生成新版本（parent 指向当前版本）。"""
    output = db.get(RewriteOutput, output_id)
    if not output:
        raise APIException("改写结果不存在", status_code=404)
    task = db.get(RewriteTask, output.task_id)
    if not task:
        raise APIException("关联任务不存在", status_code=404)
    if task.status == "running":
        raise APIException("任务正在执行中，请勿重复提交")

    task.status = "pending"
    task.error_message = None
    db.commit()

    rewrite_service.kickoff(task.id, parent_version_id=output.id)
    return ok(
        RewriteOutputListItem.model_validate(output).model_dump(mode="json"),
        message="已基于该版本开始重新改写",
    )
