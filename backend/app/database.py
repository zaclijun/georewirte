"""数据库连接与 Session 管理。"""
from __future__ import annotations

from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


# SQLite 需要 check_same_thread=False（FastAPI 多线程 + 后台任务线程共用引擎）
connect_args = {"check_same_thread": False} if settings.is_sqlite else {}
engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=Session,
    future=True,
)


class Base(DeclarativeBase):
    """所有 ORM 模型的基类。"""


def get_db() -> Generator[Session, None, None]:
    """FastAPI 依赖：每个请求获取独立 Session，请求结束自动关闭。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """P0 启动时按模型建表（幂等）。Alembic 用于后续迁移。"""
    # 必须在 metadata 之前完成所有模型导入
    from app.models import all_models  # noqa: F401  确保模型注册

    Base.metadata.create_all(bind=engine)
