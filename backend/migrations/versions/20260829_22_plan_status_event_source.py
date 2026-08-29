"""Record whether a plan status transition was manual or automatic.

Revision ID: 20260829_22
Revises: 20260826_21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260829_22"
down_revision: str | None = "20260826_21"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("ck_users_preferred_language", "users", type_="check")
    op.create_check_constraint(
        "ck_users_preferred_language",
        "users",
        "preferred_language IN "
        "('en', 'fa', 'tr', 'ar', 'da', 'de', 'el', 'ja', 'zh-CN', 'es', 'sv', "
        "'fr', 'pt-BR', 'hi', 'ko', 'fi', 'nb', 'it')",
    )
    op.add_column(
        "plan_status_events",
        sa.Column("source", sa.String(20), server_default="manual", nullable=False),
    )
    op.create_check_constraint(
        "ck_plan_status_events_source",
        "plan_status_events",
        "source IN ('manual', 'automatic')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_plan_status_events_source", "plan_status_events", type_="check")
    op.drop_column("plan_status_events", "source")
    op.execute(
        "UPDATE users SET preferred_language = 'en' "
        "WHERE preferred_language IN ('da', 'el', 'sv', 'nb', 'it')"
    )
    op.drop_constraint("ck_users_preferred_language", "users", type_="check")
    op.create_check_constraint(
        "ck_users_preferred_language",
        "users",
        "preferred_language IN "
        "('en', 'fa', 'tr', 'ar', 'de', 'ja', 'zh-CN', 'es', 'fr', 'pt-BR', 'hi', 'ko', 'fi')",
    )
