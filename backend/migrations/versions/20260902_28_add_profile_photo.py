"""Add profile photos to users.

Revision ID: 20260902_28
Revises: 20260902_27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260902_28"
down_revision: str | None = "20260902_27"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("profile_photo", sa.LargeBinary(), nullable=True))
    op.add_column(
        "users", sa.Column("profile_photo_content_type", sa.String(length=30), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("users", "profile_photo_content_type")
    op.drop_column("users", "profile_photo")
