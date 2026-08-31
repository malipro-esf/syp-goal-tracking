"""Add an optional end date to coach plan assignments.

Revision ID: 20260831_23
Revises: 20260829_22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260831_23"
down_revision: str | None = "20260829_22"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("plan_assignments", sa.Column("end_date", sa.Date(), nullable=True))
    op.create_check_constraint(
        "ck_plan_assignment_dates",
        "plan_assignments",
        "end_date IS NULL OR end_date >= start_date",
    )


def downgrade() -> None:
    op.drop_constraint("ck_plan_assignment_dates", "plan_assignments", type_="check")
    op.drop_column("plan_assignments", "end_date")
