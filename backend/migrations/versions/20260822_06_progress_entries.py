"""Add user timezones and progress entries.

Revision ID: 20260822_06
Revises: 20260822_05
Create Date: 2026-08-22
"""

import sqlalchemy as sa
from alembic import op

revision: str = "20260822_06"
down_revision: str | None = "20260822_05"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "timezone",
            sa.String(100),
            server_default="UTC",
            nullable=False,
        ),
    )
    op.create_table(
        "progress_entries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("activity_id", sa.Uuid(), nullable=False),
        sa.Column("participant_user_id", sa.Uuid(), nullable=False),
        sa.Column("quantity", sa.Numeric(18, 4), nullable=False),
        sa.Column("performed_on", sa.Date(), nullable=False),
        sa.Column("note", sa.Text()),
        sa.Column("source", sa.String(20), nullable=False),
        sa.Column(
            "recorded_at",
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
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint("quantity > 0", name="ck_progress_entries_positive"),
        sa.CheckConstraint("source IN ('user')", name="ck_progress_entries_source"),
        sa.ForeignKeyConstraint(["activity_id"], ["enrollment_activities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["participant_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_progress_entries_participant_date",
        "progress_entries",
        ["participant_user_id", "performed_on"],
    )
    op.create_index(
        "ix_progress_entries_activity_date",
        "progress_entries",
        ["activity_id", "performed_on"],
    )


def downgrade() -> None:
    op.drop_table("progress_entries")
    op.drop_column("users", "timezone")
