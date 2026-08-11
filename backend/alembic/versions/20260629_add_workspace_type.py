"""add workspace_type column to projects

Revision ID: 0001_workspace_type
Revises:
Create Date: 2026-06-29

为 projects 表新增 workspace_type 列（String(20), NOT NULL, DEFAULT 'brand'）。
把原本仅存 localStorage 的工作区类型持久化到后端。
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001_workspace_type"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLite 需要 batch 模式（env.py 已配置 render_as_batch），支持 ALTER TABLE
    with op.batch_alter_table("projects", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "workspace_type",
                sa.String(length=20),
                nullable=False,
                server_default="brand",
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("projects", schema=None) as batch_op:
        batch_op.drop_column("workspace_type")
