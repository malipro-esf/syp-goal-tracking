"""Add persistent system configuration and cancelled assignments.

Revision ID: 20260903_31
Revises: 20260903_30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260903_31"
down_revision: str | None = "20260903_30"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("ck_plan_assignment_status", "plan_assignments", type_="check")
    op.create_check_constraint(
        "ck_plan_assignment_status",
        "plan_assignments",
        "status IN ('pending','accepted','rejected','cancelled')",
    )
    op.create_table(
        "system_configuration",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("registration_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("stale_invitation_days", sa.Integer(), nullable=False, server_default="7"),
        sa.Column("profile_photo_max_mb", sa.Integer(), nullable=False, server_default="2"),
        sa.Column(
            "automatic_plan_completion_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint("id = 1", name="ck_system_configuration_singleton"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.execute("INSERT INTO system_configuration (id) VALUES (1)")


def downgrade() -> None:
    op.drop_table("system_configuration")
    op.execute("UPDATE plan_assignments SET status = 'rejected' WHERE status = 'cancelled'")
    op.drop_constraint("ck_plan_assignment_status", "plan_assignments", type_="check")
    op.create_check_constraint(
        "ck_plan_assignment_status",
        "plan_assignments",
        "status IN ('pending','accepted','rejected')",
    )
