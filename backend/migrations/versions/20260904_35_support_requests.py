"""add support requests

Revision ID: 20260904_35
Revises: 20260904_34
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260904_35"
down_revision: str | None = "20260904_34"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "support_requests",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("category", sa.String(length=30), nullable=False),
        sa.Column("subject", sa.String(length=160), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="open"),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint(
            "category IN ('account','plans','coaching','technical','feedback','other')",
            name="ck_support_requests_category",
        ),
        sa.CheckConstraint(
            "status IN ('open','in_progress','resolved','closed')",
            name="ck_support_requests_status",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_support_requests_email", "support_requests", ["email"])
    op.create_index(
        "ix_support_requests_status_created", "support_requests", ["status", "created_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_support_requests_status_created", table_name="support_requests")
    op.drop_index("ix_support_requests_email", table_name="support_requests")
    op.drop_table("support_requests")
