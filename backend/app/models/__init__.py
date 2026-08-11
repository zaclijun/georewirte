"""聚合所有 ORM 模型，确保注册到 Base.metadata。"""
from app.models.base import TimestampMixin, UUIDPkMixin  # noqa: F401
from app.models.project import Project
from app.models.brand_fact import BrandFact
from app.models.rewrite_task import RewriteTask
from app.models.rewrite_output import RewriteOutput
from app.models.content_score import ContentScore
from app.models.llm_call_log import LLMCallLog
from app.models.model_config import ModelConfig


all_models = [
    Project,
    BrandFact,
    RewriteTask,
    RewriteOutput,
    ContentScore,
    LLMCallLog,
    ModelConfig,
]

__all__ = [
    "Project",
    "BrandFact",
    "RewriteTask",
    "RewriteOutput",
    "ContentScore",
    "LLMCallLog",
    "ModelConfig",
    "all_models",
]
