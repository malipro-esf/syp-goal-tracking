"""Add coach feedback.

Revision ID: 20260822_09
Revises: 20260822_08
Create Date: 2026-08-22
"""

import sqlalchemy as sa
from alembic import op

revision: str = "20260822_09"
down_revision: str | None = "20260822_08"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "coach_feedback",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("enrollment_id", sa.Uuid(), nullable=False),
        sa.Column("coach_user_id", sa.Uuid(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["enrollment_id"], ["plan_enrollments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["coach_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_coach_feedback_enrollment_id", "coach_feedback", ["enrollment_id"])
    op.create_index("ix_coach_feedback_coach_user_id", "coach_feedback", ["coach_user_id"])


def downgrade() -> None:
    op.drop_table("coach_feedback")
