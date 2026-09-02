"""Add an optional country to user profiles.

Revision ID: 20260902_27
Revises: 20260902_26
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260902_27"
down_revision: str | None = "20260902_26"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("country_code", sa.String(length=2), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "country_code")
