"""Project 相关 Schema。"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ProjectBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    brand_name: Optional[str] = Field(None, max_length=100)
    default_perspective: str = Field("第三方", max_length=50)
    default_platform: str = Field("官网文章", max_length=50)
    workspace_type: str = Field("brand", max_length=20)


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    brand_name: Optional[str] = Field(None, max_length=100)
    default_perspective: Optional[str] = Field(None, max_length=50)
    default_platform: Optional[str] = Field(None, max_length=50)
    workspace_type: Optional[str] = Field(None, max_length=20)


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: Optional[str] = None
    brand_name: Optional[str] = None
    default_perspective: str
    default_platform: str
    workspace_type: str
    task_count: int = 0
    avg_geo_score: Optional[int] = None
    last_task_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
