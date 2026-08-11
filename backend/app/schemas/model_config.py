"""ModelConfig schemas。"""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ModelConfigBase(BaseModel):
    provider: str
    provider_label: str
    display_name: str
    base_url: str
    model_id: str
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    supports_streaming: bool = False


class ModelConfigCreate(ModelConfigBase):
    api_key: str = Field(..., min_length=1)


class ModelConfigUpdate(BaseModel):
    provider: Optional[str] = None
    provider_label: Optional[str] = None
    display_name: Optional[str] = None
    api_key: Optional[str] = None  # 不传则不修改
    base_url: Optional[str] = None
    model_id: Optional[str] = None
    enabled: Optional[bool] = None
    is_default: Optional[bool] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    supports_streaming: Optional[bool] = None


class ModelConfigOut(ModelConfigBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    enabled: bool
    is_default: bool
    masked_api_key: str


class ModelConfigTestResult(BaseModel):
    success: bool
    message: str


# ---- 模型发现 ----
class ModelDiscoverRequest(BaseModel):
    provider: str
    api_key: str
    base_url: str


class ModelDiscoverItem(BaseModel):
    id: str
    owned_by: str = ""


class ModelDiscoverResponse(BaseModel):
    success: bool
    message: str = ""
    models: list[ModelDiscoverItem] = []
