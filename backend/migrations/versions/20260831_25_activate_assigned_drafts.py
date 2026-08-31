"""Activate legacy coach-assigned plans left in draft.

Revision ID: 20260831_25
Revises: 20260831_24
Create Date: 2026-08-31
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260831_25"
down_revision: str | None = "20260831_24"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO plan_status_events (id, plan_id, status, effective_on, source)
        SELECT
            gen_random_uuid(),
            id,
            'active',
            COALESCE(start_date, CURRENT_DATE),
            'automatic'
        FROM plan_enrollments
        WHERE source_assignment_id IS NOT NULL
          AND status = 'draft'
        """
    )
    op.execute(
        """
        UPDATE plan_enrollments
        SET status = 'active', updated_at = now()
        WHERE source_assignment_id IS NOT NULL
          AND status = 'draft'
        """
    )


def downgrade() -> None:
    # Reverting these plans to draft could overwrite legitimate lifecycle
    # changes made after this corrective migration ran.
    pass
