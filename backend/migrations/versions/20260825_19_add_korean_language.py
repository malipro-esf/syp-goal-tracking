"""add Korean preferred language

Revision ID: 20260825_19
Revises: 20260825_18
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260825_19"
down_revision: str | None = "20260825_18"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("ck_users_preferred_language", "users", type_="check")
    op.create_check_constraint(
        "ck_users_preferred_language",
        "users",
        "preferred_language IN "
        "('en', 'fa', 'tr', 'ar', 'de', 'ja', 'zh-CN', 'es', 'fr', 'pt-BR', 'hi', 'ko')",
    )


def downgrade() -> None:
    op.execute("UPDATE users SET preferred_language = 'en' WHERE preferred_language = 'ko'")
    op.drop_constraint("ck_users_preferred_language", "users", type_="check")
    op.create_check_constraint(
        "ck_users_preferred_language",
        "users",
        "preferred_language IN "
        "('en', 'fa', 'tr', 'ar', 'de', 'ja', 'zh-CN', 'es', 'fr', 'pt-BR', 'hi')",
    )
