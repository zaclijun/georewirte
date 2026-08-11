"""BrandFact 相关 Schema。"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class BrandFactBase(BaseModel):
    fact_type: str = Field(..., max_length=20)
    title: str = Field(..., max_length=200)
    content: str
    source_type: Optional[str] = Field(None, max_length=20)
    source_url: Optional[str] = Field(None, max_length=500)
    evidence_level: Optional[str] = Field(None, max_length=20)
    tags: Optional[List[str]] = None
    is_active: bool = True


class BrandFactCreate(BrandFactBase):
    pass


class BrandFactUpdate(BaseModel):
    fact_type: Optional[str] = Field(None, max_length=20)
    title: Optional[str] = Field(None, max_length=200)
    content: Optional[str] = None
    source_type: Optional[str] = Field(None, max_length=20)
    source_url: Optional[str] = Field(None, max_length=500)
    evidence_level: Optional[str] = Field(None, max_length=20)
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None


class BrandFactOut(BrandFactBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    created_at: datetime
    updated_at: datetime
