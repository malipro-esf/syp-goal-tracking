"""Add the administrator role.

Revision ID: 20260902_29
Revises: 20260902_28
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260902_29"
down_revision: str | None = "20260902_28"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "INSERT INTO roles (id, code, name) VALUES (3, 'admin', 'Administrator') "
        "ON CONFLICT (code) DO NOTHING"
    )


def downgrade() -> None:
    op.execute("DELETE FROM roles WHERE code = 'admin'")
