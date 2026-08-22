"""Add activities, target revisions, and schedules.

Revision ID: 20260822_04
Revises: 20260822_03
Create Date: 2026-08-22
"""

import sqlalchemy as sa
from alembic import op

revision: str = "20260822_04"
down_revision: str | None = "20260822_03"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "enrollment_activities",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("enrollment_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("measurement_dimension", sa.String(20), nullable=False),
        sa.Column("unit_code", sa.String(30), nullable=False),
        sa.Column("custom_unit_label", sa.String(40)),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("status IN ('active', 'inactive')", name="ck_activities_status"),
        sa.CheckConstraint("display_order >= 0", name="ck_activities_display_order"),
        sa.CheckConstraint(
            "(unit_code = 'custom' AND custom_unit_label IS NOT NULL) OR "
            "(unit_code <> 'custom' AND custom_unit_label IS NULL)",
            name="ck_activities_custom_unit",
        ),
        sa.ForeignKeyConstraint(
            ["enrollment_id"], ["plan_enrollments.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_activities_enrollment_order",
        "enrollment_activities",
        ["enrollment_id", "display_order"],
    )
    op.create_table(
        "activity_target_revisions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("activity_id", sa.Uuid(), nullable=False),
        sa.Column("target_quantity", sa.Numeric(18, 4), nullable=False),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("effective_until", sa.Date()),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("reason", sa.String(300)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("target_quantity > 0", name="ck_target_revisions_positive"),
        sa.CheckConstraint(
            "effective_until IS NULL OR effective_until >= effective_from",
            name="ck_target_revisions_dates",
        ),
        sa.ForeignKeyConstraint(
            ["activity_id"], ["enrollment_activities.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"], ["users.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "activity_id", "effective_from", name="uq_target_revision_start"
        ),
    )
    op.create_index(
        "ix_activity_target_revisions_activity_id",
        "activity_target_revisions",
        ["activity_id"],
    )
    op.create_table(
        "activity_schedules",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("activity_id", sa.Uuid(), nullable=False),
        sa.Column("schedule_type", sa.String(20), nullable=False),
        sa.Column("weekdays", sa.ARRAY(sa.SmallInteger())),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("effective_until", sa.Date()),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "schedule_type IN ('daily', 'weekly', 'selected_days')",
            name="ck_activity_schedules_type",
        ),
        sa.CheckConstraint(
            "(schedule_type = 'selected_days' AND weekdays IS NOT NULL) OR "
            "(schedule_type <> 'selected_days' AND weekdays IS NULL)",
            name="ck_activity_schedules_weekdays",
        ),
        sa.CheckConstraint(
            "effective_until IS NULL OR effective_until >= effective_from",
            name="ck_activity_schedules_dates",
        ),
        sa.ForeignKeyConstraint(
            ["activity_id"], ["enrollment_activities.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"], ["users.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "activity_id", "effective_from", name="uq_activity_schedule_start"
        ),
    )
    op.create_index(
        "ix_activity_schedules_activity_id", "activity_schedules", ["activity_id"]
    )


def downgrade() -> None:
    op.drop_table("activity_schedules")
    op.drop_table("activity_target_revisions")
    op.drop_table("enrollment_activities")
