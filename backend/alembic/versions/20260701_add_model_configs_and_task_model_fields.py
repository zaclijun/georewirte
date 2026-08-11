"""add model_configs table and rewrite_tasks model fields

Revision ID: 0002_model_configs
Revises: 0001_workspace_type
Create Date: 2026-07-01

新增 model_configs 表用于存储用户配置的 LLM 模型（API Key 加密存储）。
同时给 rewrite_tasks 表新增 4 个 nullable 字段，用于关联任务与具体模型配置，
不破坏旧任务读取（旧任务这些字段为 NULL，回退到全局 LLM 配置）。

注意：本项目 init_db() 使用 Base.metadata.create_all() 创建新表，
因此 model_configs 可能已存在；本迁移对表/列做幂等检查，避免冲突。
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0002_model_configs"
down_revision: Union[str, Sequence[str], None] = "0001_workspace_type"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # 1. 创建 model_configs 表（若不存在）
    if not inspector.has_table("model_configs"):
        op.create_table(
            "model_configs",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("provider", sa.String(length=50), nullable=False),
            sa.Column("provider_label", sa.String(length=100), nullable=False),
            sa.Column("display_name", sa.String(length=100), nullable=False),
            sa.Column("api_key_encrypted", sa.String(length=500), nullable=False),
            sa.Column("base_url", sa.String(length=300), nullable=False),
            sa.Column("model_id", sa.String(length=100), nullable=False),
            sa.Column(
                "enabled",
                sa.Boolean(),
                nullable=False,
                server_default="1",
            ),
            sa.Column(
                "is_default",
                sa.Boolean(),
                nullable=False,
                server_default="0",
            ),
            sa.Column("temperature", sa.Float(), nullable=True),
            sa.Column("max_tokens", sa.Integer(), nullable=True),
            sa.Column(
                "supports_streaming",
                sa.Boolean(),
                nullable=False,
                server_default="0",
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.current_timestamp(),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.current_timestamp(),
            ),
            sa.PrimaryKeyConstraint("id"),
        )

    # 2. 给 rewrite_tasks 表增加 4 个 nullable 字段（仅添加不存在的列）
    # SQLite 不支持 ALTER COLUMN，使用 batch_alter_table
    existing_columns = {
        col["name"] for col in inspector.get_columns("rewrite_tasks")
    }
    new_columns = [
        ("model_config_id", sa.Column("model_config_id", sa.String(length=36), nullable=True)),
        ("model_provider", sa.Column("model_provider", sa.String(length=50), nullable=True)),
        ("model_name", sa.Column("model_name", sa.String(length=100), nullable=True)),
        (
            "model_display_name",
            sa.Column("model_display_name", sa.String(length=100), nullable=True),
        ),
    ]
    pending = [
        (name, col) for name, col in new_columns if name not in existing_columns
    ]
    if pending:
        with op.batch_alter_table("rewrite_tasks", schema=None) as batch_op:
            for _, col in pending:
                batch_op.add_column(col)


def downgrade() -> None:
    with op.batch_alter_table("rewrite_tasks", schema=None) as batch_op:
        batch_op.drop_column("model_display_name")
        batch_op.drop_column("model_name")
        batch_op.drop_column("model_provider")
        batch_op.drop_column("model_config_id")

    op.drop_table("model_configs")
