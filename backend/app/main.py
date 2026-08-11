"""FastAPI 应用入口。"""
from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import brand_facts, export, outputs, projects, rewrite_tasks, settings_models
from app.config import settings
from app.database import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(
        title="GEO 内容改写工作台 API",
        description="GEO Rewrite Workbench 后端服务（P0）",
        version="1.0.0",
    )

    # ---- CORS ----
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ---- 路由 ----
    app.include_router(projects.router)
    app.include_router(brand_facts.router)
    app.include_router(rewrite_tasks.router)
    app.include_router(outputs.router)
    app.include_router(export.router)
    app.include_router(settings_models.router)

    # ---- 统一异常处理 ----
    @app.exception_handler(HTTPException)
    async def http_exc_handler(request: Request, exc: HTTPException):
        code = getattr(exc, "code", 1)
        message = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
        return JSONResponse(
            status_code=exc.status_code,
            content={"code": code, "message": message, "data": None},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exc_handler(request: Request, exc: RequestValidationError):
        messages = []
        for err in exc.errors():
            loc = ".".join(str(p) for p in err.get("loc", []) if p != "body")
            messages.append(f"{loc}: {err.get('msg', '')}")
        message = "参数校验失败：" + "; ".join(messages) if messages else "参数校验失败"
        return JSONResponse(
            status_code=422,
            content={"code": 1, "message": message, "data": None},
        )

    @app.exception_handler(Exception)
    async def unhandled_exc_handler(request: Request, exc: Exception):
        logger.exception("未处理异常: %s", exc)
        return JSONResponse(
            status_code=500,
            content={"code": 1, "message": f"服务器内部错误：{exc}", "data": None},
        )

    # ---- 健康检查 ----
    @app.get("/health", tags=["system"])
    def health():
        return {"code": 0, "message": "success", "data": {"status": "ok"}}

    @app.get("/", tags=["system"])
    def root():
        return {"code": 0, "message": "success", "data": {"service": "GEO Rewrite Workbench API", "docs": "/docs"}}

    @app.on_event("startup")
    def on_startup():
        init_db()
        logger.info("数据库已初始化（建表完成）")
        if not settings.llm_api_key:
            logger.warning("未配置 LLM_API_KEY，改写任务将失败；请在 .env 中配置")
        if not settings.model_config_secret_key or settings.model_config_secret_key == "change-me":
            logger.warning("未配置 MODEL_CONFIG_SECRET_KEY，模型配置 API Key 将无法加密存储")
        logger.info(
            "LLM Provider=%s Model=%s QualityCheck=%s",
            settings.llm_provider,
            settings.llm_model,
            settings.enable_quality_check,
        )

    return app


app = create_app()
