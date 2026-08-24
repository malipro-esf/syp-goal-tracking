"""Add user profile and language preferences.

Revision ID: 20260824_11
Revises: 20260822_10
Create Date: 2026-08-24
"""

import sqlalchemy as sa
from alembic import op

revision: str = "20260824_11"
down_revision: str | None = "20260822_10"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("bio", sa.String(500), nullable=True))
    op.add_column(
        "users",
        sa.Column("preferred_language", sa.String(5), server_default="en", nullable=False),
    )
    op.create_check_constraint(
        "ck_users_preferred_language",
        "users",
        "preferred_language IN ('en', 'fa', 'tr', 'ar')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_users_preferred_language", "users", type_="check")
    op.drop_column("users", "preferred_language")
    op.drop_column("users", "bio")
