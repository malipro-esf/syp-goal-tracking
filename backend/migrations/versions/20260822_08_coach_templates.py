"""Add coach templates and assignments.

Revision ID: 20260822_08
Revises: 20260822_07
Create Date: 2026-08-22
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260822_08"
down_revision: str | None = "20260822_07"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "plan_templates",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("description", sa.Text()),
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
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_plan_templates_created_by_user_id", "plan_templates", ["created_by_user_id"]
    )
    op.create_table(
        "plan_template_activities",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("template_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("unit_code", sa.String(30), nullable=False),
        sa.Column("custom_unit_label", sa.String(40)),
        sa.Column("target_quantity", sa.Numeric(18, 4), nullable=False),
        sa.Column("schedule_type", sa.String(20), nullable=False),
        sa.Column("weekdays", postgresql.ARRAY(sa.SmallInteger())),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.CheckConstraint("target_quantity > 0", name="ck_template_activity_target_positive"),
        sa.CheckConstraint(
            "schedule_type IN ('daily', 'weekly', 'selected_days')",
            name="ck_template_activity_schedule",
        ),
        sa.CheckConstraint(
            "unit_code IN ('minute','hour','page','repetition','number',"
            "'meter','kilometer','custom')",
            name="ck_template_activity_unit",
        ),
        sa.ForeignKeyConstraint(["template_id"], ["plan_templates.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_plan_template_activities_template_id", "plan_template_activities", ["template_id"]
    )
    op.create_table(
        "plan_assignments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("template_id", sa.Uuid(), nullable=False),
        sa.Column("participant_user_id", sa.Uuid(), nullable=False),
        sa.Column("assigned_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("responded_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('pending','accepted','rejected')", name="ck_plan_assignment_status"
        ),
        sa.ForeignKeyConstraint(["template_id"], ["plan_templates.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["participant_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["assigned_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_plan_assignments_template_id", "plan_assignments", ["template_id"])
    op.create_index(
        "ix_plan_assignments_participant_user_id", "plan_assignments", ["participant_user_id"]
    )
    op.create_index(
        "ix_plan_assignments_assigned_by_user_id", "plan_assignments", ["assigned_by_user_id"]
    )
    op.add_column("plan_enrollments", sa.Column("coach_user_id", sa.Uuid()))
    op.add_column("plan_enrollments", sa.Column("source_template_id", sa.Uuid()))
    op.add_column("plan_enrollments", sa.Column("source_assignment_id", sa.Uuid()))
    op.create_foreign_key(
        "fk_enrollment_coach",
        "plan_enrollments",
        "users",
        ["coach_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_enrollment_template",
        "plan_enrollments",
        "plan_templates",
        ["source_template_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_enrollment_assignment",
        "plan_enrollments",
        "plan_assignments",
        ["source_assignment_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_unique_constraint(
        "uq_enrollment_source_assignment", "plan_enrollments", ["source_assignment_id"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_enrollment_source_assignment", "plan_enrollments", type_="unique")
    op.drop_constraint("fk_enrollment_assignment", "plan_enrollments", type_="foreignkey")
    op.drop_constraint("fk_enrollment_template", "plan_enrollments", type_="foreignkey")
    op.drop_constraint("fk_enrollment_coach", "plan_enrollments", type_="foreignkey")
    op.drop_column("plan_enrollments", "source_assignment_id")
    op.drop_column("plan_enrollments", "source_template_id")
    op.drop_column("plan_enrollments", "coach_user_id")
    op.drop_table("plan_assignments")
    op.drop_table("plan_template_activities")
    op.drop_table("plan_templates")
