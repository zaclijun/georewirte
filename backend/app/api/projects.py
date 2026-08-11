"""Project API。"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from app.api.deps import APIException, get_page_params, ok, paginate
from app.database import get_db
from app.models.content_score import ContentScore
from app.models.project import Project
from app.models.rewrite_output import RewriteOutput
from app.models.rewrite_task import RewriteTask
from app.schemas.project import ProjectCreate, ProjectOut, ProjectUpdate

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _to_out(db: Session, project: Project) -> dict:
    task_count = (
        db.query(RewriteTask)
        .filter(RewriteTask.project_id == project.id)
        .count()
    )
    # 最近任务时间
    last_task = (
        db.query(RewriteTask.created_at)
        .filter(RewriteTask.project_id == project.id)
        .order_by(desc(RewriteTask.created_at))
        .first()
    )
    last_task_at = last_task[0] if last_task else None
    # 平均改后评分（取该项目所有 completed 任务的 after 评分均值）
    after_scores = (
        db.query(ContentScore.overall)
        .join(RewriteOutput, ContentScore.output_id == RewriteOutput.id)
        .join(RewriteTask, RewriteOutput.task_id == RewriteTask.id)
        .filter(RewriteTask.project_id == project.id)
        .filter(ContentScore.score_type == "after")
        .all()
    )
    avg_geo_score = (
        round(sum(s[0] for s in after_scores) / len(after_scores))
        if after_scores
        else None
    )
    return ProjectOut.model_validate(project).model_dump() | {
        "task_count": task_count,
        "avg_geo_score": avg_geo_score,
        "last_task_at": last_task_at,
    }


@router.get("")
def list_projects(
    keyword: Optional[str] = Query(None, description="按名称/描述搜索"),
    page: Optional[int] = Query(1),
    page_size: Optional[int] = Query(20),
    db: Session = Depends(get_db),
):
    p, ps = get_page_params(page, page_size)
    q = db.query(Project)
    if keyword:
        kw = f"%{keyword}%"
        q = q.filter(or_(Project.name.ilike(kw), Project.description.ilike(kw)))
    total = q.count()
    items = (
        q.order_by(desc(Project.created_at))
        .offset((p - 1) * ps)
        .limit(ps)
        .all()
    )
    data = paginate([_to_out(db, proj) for proj in items], total, p, ps)
    return ok(data)


@router.post("", status_code=201)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(
        name=payload.name,
        description=payload.description,
        brand_name=payload.brand_name,
        default_perspective=payload.default_perspective,
        default_platform=payload.default_platform,
        workspace_type=payload.workspace_type,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return ok(_to_out(db, project), message="创建成功")


@router.get("/{project_id}")
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise APIException("项目不存在", status_code=404)
    return ok(_to_out(db, project))


@router.put("/{project_id}")
def update_project(
    project_id: str, payload: ProjectUpdate, db: Session = Depends(get_db)
):
    project = db.get(Project, project_id)
    if not project:
        raise APIException("项目不存在", status_code=404)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, key, value)
    db.commit()
    db.refresh(project)
    return ok(_to_out(db, project), message="更新成功")


@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise APIException("项目不存在", status_code=404)
    db.delete(project)
    db.commit()
    return ok(None, message="删除成功")
