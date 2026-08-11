"""BrandFactService：品牌事实库 CRUD + 筛选 + 分页。"""
from __future__ import annotations

from typing import List, Optional, Tuple

from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from app.models.brand_fact import BrandFact
from app.schemas.brand_fact import BrandFactCreate, BrandFactUpdate


class BrandFactService:
    def list_facts(
        self,
        db: Session,
        project_id: str,
        *,
        fact_type: Optional[str] = None,
        keyword: Optional[str] = None,
        is_active: Optional[bool] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[BrandFact], int]:
        q = db.query(BrandFact).filter(BrandFact.project_id == project_id)
        if fact_type:
            q = q.filter(BrandFact.fact_type == fact_type)
        if is_active is not None:
            q = q.filter(BrandFact.is_active == is_active)
        if keyword:
            kw = f"%{keyword}%"
            q = q.filter(
                or_(
                    BrandFact.title.ilike(kw),
                    BrandFact.content.ilike(kw),
                )
            )
        total = q.count()
        items = (
            q.order_by(desc(BrandFact.created_at))
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return items, total

    def get(self, db: Session, fact_id: str) -> Optional[BrandFact]:
        return db.get(BrandFact, fact_id)

    def get_many(self, db: Session, fact_ids: List[str]) -> List[BrandFact]:
        if not fact_ids:
            return []
        return (
            db.query(BrandFact)
            .filter(BrandFact.id.in_(fact_ids))
            .filter(BrandFact.is_active.is_(True))
            .all()
        )

    def create(
        self, db: Session, project_id: str, payload: BrandFactCreate
    ) -> BrandFact:
        fact = BrandFact(
            project_id=project_id,
            fact_type=payload.fact_type,
            title=payload.title,
            content=payload.content,
            source_type=payload.source_type,
            source_url=payload.source_url,
            evidence_level=payload.evidence_level,
            tags=payload.tags,
            is_active=payload.is_active,
        )
        db.add(fact)
        db.commit()
        db.refresh(fact)
        return fact

    def update(
        self, db: Session, fact: BrandFact, payload: BrandFactUpdate
    ) -> BrandFact:
        data = payload.model_dump(exclude_unset=True)
        for key, value in data.items():
            setattr(fact, key, value)
        db.commit()
        db.refresh(fact)
        return fact

    def delete(self, db: Session, fact: BrandFact) -> None:
        db.delete(fact)
        db.commit()


brand_fact_service = BrandFactService()
