"""RewriteTask API。"""
from __future__ import annotations

from typing import Dict, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.api.deps import APIException, get_page_params, ok, paginate
from app.database import get_db
from app.models.content_score import ContentScore
from app.models.model_config import ModelConfig
from app.models.project import Project
from app.models.rewrite_output import RewriteOutput
from app.models.rewrite_task import RewriteTask
from app.schemas.rewrite_task import (
    RewriteTaskCreate,
    RewriteTaskOut,
    RewriteTaskUpdate,
)
from app.services.rewrite_service import rewrite_service

router = APIRouter(tags=["rewrite-tasks"])


@router.get("/api/projects/{project_id}/tasks")
def list_tasks(
    project_id: str,
    status: Optional[str] = Query(None, description="状态筛选"),
    keyword: Optional[str] = Query(None, description="按标题搜索"),
    page: Optional[int] = Query(1),
    page_size: Optional[int] = Query(20),
    db: Session = Depends(get_db),
):
    if not db.get(Project, project_id):
        raise APIException("项目不存在", status_code=404)
    p, ps = get_page_params(page, page_size)
    q = db.query(RewriteTask).filter(RewriteTask.project_id == project_id)
    if status:
        q = q.filter(RewriteTask.status == status)
    if keyword:
        q = q.filter(RewriteTask.title.ilike(f"%{keyword}%"))
    total = q.count()
    items = (
        q.order_by(desc(RewriteTask.created_at))
        .offset((p - 1) * ps)
        .limit(ps)
        .all()
    )

    task_ids = [t.id for t in items]

    # 批量查找每个 task 的最新 output_id
    output_id_map: Dict[str, str] = {}
    if task_ids:
        outputs = (
            db.query(RewriteOutput.task_id, RewriteOutput.id)
            .filter(RewriteOutput.task_id.in_(task_ids))
            .order_by(RewriteOutput.task_id, RewriteOutput.version.desc())
            .all()
        )
        for o_task_id, o_id in outputs:
            if o_task_id not in output_id_map:
                output_id_map[o_task_id] = o_id

    # 批量查找评分（每个 output 最多两条：before + after）
    score_map: Dict[str, Dict[str, int]] = {}
    if output_id_map:
        oids = list(output_id_map.values())
        scores = (
            db.query(
                ContentScore.output_id,
                ContentScore.score_type,
                ContentScore.overall,
            )
            .filter(ContentScore.output_id.in_(oids))
            .all()
        )
        for s_oid, s_type, s_overall in scores:
            entry = score_map.setdefault(s_oid, {})
            entry[s_type] = s_overall

    result = []
    for task in items:
        item = RewriteTaskOut.model_validate(task).model_dump(mode="json")
        oid = output_id_map.get(task.id)
        item["output_id"] = oid
        if oid and oid in score_map:
            item["score_before"] = score_map[oid].get("before")
            item["score_after"] = score_map[oid].get("after")
        result.append(item)

    data = paginate(result, total, p, ps)
    return ok(data)


@router.post("/api/projects/{project_id}/tasks", status_code=201)
def create_task(
    project_id: str, payload: RewriteTaskCreate, db: Session = Depends(get_db)
):
    project = db.get(Project, project_id)
    if not project:
        raise APIException("项目不存在", status_code=404)
    if not payload.original_content.strip():
        raise APIException("原文内容不能为空")

    # 若指定了 model_config_id，校验并冗余写入 4 个字段
    model_config_id = payload.model_config_id
    model_provider = None
    model_name = None
    model_display_name = None
    if model_config_id:
        mc = db.get(ModelConfig, model_config_id)
        if not mc:
            raise APIException("指定的模型配置不存在", status_code=400)
        if not mc.enabled:
            raise APIException("指定的模型配置未启用", status_code=400)
        model_provider = mc.provider
        model_name = mc.model_id
        model_display_name = mc.display_name

    task = RewriteTask(
        project_id=project_id,
        title=payload.title,
        original_content=payload.original_content,
        article_type=payload.article_type,
        perspective=payload.perspective,
        publish_platform=payload.publish_platform,
        target_audience=payload.target_audience,
        source_policy=payload.source_policy,
        output_length=payload.output_length,
        need_schema=payload.need_schema,
        brand_fact_ids=payload.brand_fact_ids,
        model_config_id=model_config_id,
        model_provider=model_provider,
        model_name=model_name,
        model_display_name=model_display_name,
        status="pending",
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # 启动后台改写（非阻塞）
    rewrite_service.kickoff(task.id)

    return ok(RewriteTaskOut.model_validate(task).model_dump(), message="任务已创建，开始改写")


@router.get("/api/tasks/{task_id}")
def get_task(task_id: str, db: Session = Depends(get_db)):
    task = db.get(RewriteTask, task_id)
    if not task:
        raise APIException("任务不存在", status_code=404)
    return ok(RewriteTaskOut.model_validate(task).model_dump())


@router.get("/api/tasks/{task_id}/status")
def get_task_status(task_id: str, db: Session = Depends(get_db)):
    task = db.get(RewriteTask, task_id)
    if not task:
        raise APIException("任务不存在", status_code=404)
    return ok(
        {
            "id": task.id,
            "status": task.status,
            "error_message": task.error_message,
        }
    )


@router.put("/api/tasks/{task_id}")
def update_task(
    task_id: str, payload: RewriteTaskUpdate, db: Session = Depends(get_db)
):
    task = db.get(RewriteTask, task_id)
    if not task:
        raise APIException("任务不存在", status_code=404)
    if task.status == "running":
        raise APIException("任务正在执行中，无法修改")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(task, key, value)
    task.status = "pending"
    task.error_message = None
    db.commit()
    db.refresh(task)

    # 更新参数后重新改写（新版本）
    rewrite_service.kickoff(task.id)

    return ok(RewriteTaskOut.model_validate(task).model_dump(), message="参数已更新，开始重新改写")


@router.delete("/api/tasks/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db)):
    task = db.get(RewriteTask, task_id)
    if not task:
        raise APIException("任务不存在", status_code=404)
    if task.status == "running":
        raise APIException("任务正在执行中，无法删除")
    db.delete(task)
    db.commit()
    return ok(None, message="删除成功")


@router.post("/api/tasks/{task_id}/retry")
def retry_task(task_id: str, db: Session = Depends(get_db)):
    task = db.get(RewriteTask, task_id)
    if not task:
        raise APIException("任务不存在", status_code=404)
    if task.status == "running":
        raise APIException("任务正在执行中，请勿重复提交")
    if task.status == "completed":
        raise APIException("任务已完成，如需重新生成请使用「重新改写」")

    task.status = "pending"
    task.error_message = None
    db.commit()
    db.refresh(task)

    rewrite_service.kickoff(task.id)
    return ok(RewriteTaskOut.model_validate(task).model_dump(), message="已重新开始改写")
