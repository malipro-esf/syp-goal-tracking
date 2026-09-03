"""support deduplicated automated reminders

Revision ID: 20260903_33
Revises: 20260903_32
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260903_33"
down_revision: str | None = "20260903_32"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("ck_notifications_kind", "notifications", type_="check")
    op.add_column("notifications", sa.Column("dedupe_key", sa.String(200), nullable=True))
    op.create_unique_constraint(
        "uq_notifications_user_dedupe_key", "notifications", ["user_id", "dedupe_key"]
    )
    op.create_check_constraint(
        "ck_notifications_kind",
        "notifications",
        "kind IN ('invitation_received','invitation_accepted','invitation_rejected',"
        "'plan_ending','stale_invitation')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_notifications_kind", "notifications", type_="check")
    op.drop_constraint("uq_notifications_user_dedupe_key", "notifications", type_="unique")
    op.drop_column("notifications", "dedupe_key")
    op.create_check_constraint(
        "ck_notifications_kind",
        "notifications",
        "kind IN ('invitation_received','invitation_accepted','invitation_rejected')",
    )
