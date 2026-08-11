"""RewriteTask 相关 Schema。"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


SOURCE_POLICY_VALUES = [
    "use_provided_only",
    "allow_external_sources",
    "mark_missing_sources",
]
OUTPUT_LENGTH_VALUES = ["short", "standard", "long"]
TASK_STATUS_VALUES = ["pending", "running", "completed", "failed"]


class RewriteTaskCreate(BaseModel):
    title: str = Field(..., max_length=200)
    original_content: str
    article_type: Optional[str] = Field(None, max_length=50)
    perspective: str = Field("第三方", max_length=20)
    publish_platform: str = Field("官网文章", max_length=20)
    target_audience: Optional[str] = Field(None, max_length=200)
    source_policy: str = Field("mark_missing_sources", max_length=30)
    output_length: str = Field("standard", max_length=20)
    need_schema: bool = True
    brand_fact_ids: Optional[List[str]] = None
    model_config_id: Optional[str] = None


class RewriteTaskUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    original_content: Optional[str] = None
    article_type: Optional[str] = Field(None, max_length=50)
    perspective: Optional[str] = Field(None, max_length=20)
    publish_platform: Optional[str] = Field(None, max_length=20)
    target_audience: Optional[str] = Field(None, max_length=200)
    source_policy: Optional[str] = Field(None, max_length=30)
    output_length: Optional[str] = Field(None, max_length=20)
    need_schema: Optional[bool] = None
    brand_fact_ids: Optional[List[str]] = None


class RewriteTaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    title: str
    original_content: str
    article_type: Optional[str] = None
    perspective: str
    publish_platform: str
    target_audience: Optional[str] = None
    source_policy: str
    output_length: str
    need_schema: bool
    brand_fact_ids: Optional[List[str]] = None
    status: str
    error_message: Optional[str] = None
    score_before: Optional[int] = None
    score_after: Optional[int] = None
    output_id: Optional[str] = None
    model_config_id: Optional[str] = None
    model_provider: Optional[str] = None
    model_name: Optional[str] = None
    model_display_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class RewriteTaskListItem(BaseModel):
    """任务列表项（不含原文正文，减少传输量）。"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    title: str
    perspective: str
    publish_platform: str
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class RewriteTaskStatus(BaseModel):
    id: str
    status: str
    error_message: Optional[str] = None
