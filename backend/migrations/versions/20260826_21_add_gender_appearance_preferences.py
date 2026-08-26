"""Add optional gender and appearance preferences.

Revision ID: 20260826_21
Revises: 20260825_20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260826_21"
down_revision: str | None = "20260825_20"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("gender", sa.String(10), nullable=True))
    op.add_column(
        "users",
        sa.Column("gender_theme_enabled", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.create_check_constraint(
        "ck_users_gender", "users", "gender IS NULL OR gender IN ('man', 'woman')"
    )


def downgrade() -> None:
    op.drop_constraint("ck_users_gender", "users", type_="check")
    op.drop_column("users", "gender_theme_enabled")
    op.drop_column("users", "gender")
