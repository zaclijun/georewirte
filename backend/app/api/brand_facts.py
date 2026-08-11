"""BrandFact API。"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import APIException, get_page_params, ok, paginate
from app.database import get_db
from app.models.project import Project
from app.schemas.brand_fact import BrandFactCreate, BrandFactOut, BrandFactUpdate
from app.services.brand_fact_service import brand_fact_service

router = APIRouter(tags=["brand-facts"])


@router.get("/api/projects/{project_id}/brand-facts")
def list_brand_facts(
    project_id: str,
    fact_type: Optional[str] = Query(None, description="类型筛选"),
    keyword: Optional[str] = Query(None, description="按标题/内容搜索"),
    is_active: Optional[bool] = Query(None),
    page: Optional[int] = Query(1),
    page_size: Optional[int] = Query(20),
    db: Session = Depends(get_db),
):
    if not db.get(Project, project_id):
        raise APIException("项目不存在", status_code=404)
    p, ps = get_page_params(page, page_size)
    items, total = brand_fact_service.list_facts(
        db,
        project_id,
        fact_type=fact_type,
        keyword=keyword,
        is_active=is_active,
        page=p,
        page_size=ps,
    )
    data = paginate(
        [BrandFactOut.model_validate(f).model_dump() for f in items], total, p, ps
    )
    return ok(data)


@router.post("/api/projects/{project_id}/brand-facts", status_code=201)
def create_brand_fact(
    project_id: str, payload: BrandFactCreate, db: Session = Depends(get_db)
):
    if not db.get(Project, project_id):
        raise APIException("项目不存在", status_code=404)
    fact = brand_fact_service.create(db, project_id, payload)
    return ok(BrandFactOut.model_validate(fact).model_dump(), message="创建成功")


@router.get("/api/brand-facts/{fact_id}")
def get_brand_fact(fact_id: str, db: Session = Depends(get_db)):
    fact = brand_fact_service.get(db, fact_id)
    if not fact:
        raise APIException("品牌事实不存在", status_code=404)
    return ok(BrandFactOut.model_validate(fact).model_dump())


@router.put("/api/brand-facts/{fact_id}")
def update_brand_fact(
    fact_id: str, payload: BrandFactUpdate, db: Session = Depends(get_db)
):
    fact = brand_fact_service.get(db, fact_id)
    if not fact:
        raise APIException("品牌事实不存在", status_code=404)
    fact = brand_fact_service.update(db, fact, payload)
    return ok(BrandFactOut.model_validate(fact).model_dump(), message="更新成功")


@router.delete("/api/brand-facts/{fact_id}")
def delete_brand_fact(fact_id: str, db: Session = Depends(get_db)):
    fact = brand_fact_service.get(db, fact_id)
    if not fact:
        raise APIException("品牌事实不存在", status_code=404)
    brand_fact_service.delete(db, fact)
    return ok(None, message="删除成功")
