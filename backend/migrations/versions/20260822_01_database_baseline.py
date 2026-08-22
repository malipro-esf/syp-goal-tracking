"""Establish the database migration baseline.

Revision ID: 20260822_01
Revises:
Create Date: 2026-08-22
"""

revision: str = "20260822_01"
down_revision: str | None = None
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    """No domain tables are introduced in Milestone 2."""


def downgrade() -> None:
    """The empty baseline has no domain objects to remove."""
