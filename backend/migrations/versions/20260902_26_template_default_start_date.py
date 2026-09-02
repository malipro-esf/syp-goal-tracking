"""Add a default start date to coach plan templates.

Revision ID: 20260902_26
Revises: 20260831_25
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260902_26"
down_revision: str | None = "20260831_25"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("plan_templates", sa.Column("default_start_date", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("plan_templates", "default_start_date")
