"""Add plan lifecycle history.

Revision ID: 20260822_07
Revises: 20260822_06
Create Date: 2026-08-22
"""

import sqlalchemy as sa
from alembic import op

revision: str = "20260822_07"
down_revision: str | None = "20260822_06"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "plan_status_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("plan_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("effective_on", sa.Date(), nullable=False),
        sa.Column(
            "recorded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('draft', 'active', 'paused', 'completed', 'archived')",
            name="ck_plan_status_events_status",
        ),
        sa.ForeignKeyConstraint(["plan_id"], ["plan_enrollments.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_plan_status_events_plan_date",
        "plan_status_events",
        ["plan_id", "effective_on"],
    )
    op.execute(
        "INSERT INTO plan_status_events (id, plan_id, status, effective_on) "
        "SELECT gen_random_uuid(), id, status, created_at::date FROM plan_enrollments"
    )


def downgrade() -> None:
    op.drop_table("plan_status_events")
