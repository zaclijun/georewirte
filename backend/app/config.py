"""应用配置：从环境变量读取，兼容 .env 文件。"""
from __future__ import annotations

from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parent.parent
PROMPTS_DIR = BACKEND_DIR / "app" / "prompts"


class Settings(BaseSettings):
    """全局配置项。"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ---- 数据库 ----
    database_url: str = "sqlite:///./geo_rewrite.db"

    # ---- LLM ----
    llm_api_key: str = ""
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"
    llm_provider: str = "openai"
    llm_timeout: int = 120
    enable_quality_check: bool = False

    # ---- 模型配置加密密钥（用于加密用户配置的 API Key）----
    model_config_secret_key: str = ""

    # ---- 跨域 ----
    cors_origins: str = "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3000"

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")


settings = Settings()
