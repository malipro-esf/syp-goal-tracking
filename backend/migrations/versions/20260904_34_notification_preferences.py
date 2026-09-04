"""add notification preferences

Revision ID: 20260904_34
Revises: 20260903_33
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260904_34"
down_revision: str | None = "20260903_33"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "notification_preferences",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column(
            "invitation_updates_enabled", sa.Boolean(), nullable=False, server_default=sa.true()
        ),
        sa.Column(
            "automated_reminders_enabled", sa.Boolean(), nullable=False, server_default=sa.true()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )


def downgrade() -> None:
    op.drop_table("notification_preferences")
