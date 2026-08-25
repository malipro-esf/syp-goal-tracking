"""add Finnish preferred language

Revision ID: 20260825_20
Revises: 20260825_19
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260825_20"
down_revision: str | None = "20260825_19"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("ck_users_preferred_language", "users", type_="check")
    op.create_check_constraint(
        "ck_users_preferred_language",
        "users",
        "preferred_language IN "
        "('en', 'fa', 'tr', 'ar', 'de', 'ja', 'zh-CN', 'es', 'fr', 'pt-BR', 'hi', 'ko', 'fi')",
    )


def downgrade() -> None:
    op.execute("UPDATE users SET preferred_language = 'en' WHERE preferred_language = 'fi'")
    op.drop_constraint("ck_users_preferred_language", "users", type_="check")
    op.create_check_constraint(
        "ck_users_preferred_language",
        "users",
        "preferred_language IN "
        "('en', 'fa', 'tr', 'ar', 'de', 'ja', 'zh-CN', 'es', 'fr', 'pt-BR', 'hi', 'ko')",
    )
