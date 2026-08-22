"""Tighten activity unit and weekday constraints.

Revision ID: 20260822_05
Revises: 20260822_04
Create Date: 2026-08-22
"""

from alembic import op

revision: str = "20260822_05"
down_revision: str | None = "20260822_04"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_activities_dimension",
        "enrollment_activities",
        "measurement_dimension IN ('duration', 'count', 'distance', 'custom')",
    )
    op.create_check_constraint(
        "ck_activities_unit_code",
        "enrollment_activities",
        "unit_code IN ('minute', 'hour', 'page', 'repetition', 'number', "
        "'meter', 'kilometer', 'custom')",
    )
    op.create_check_constraint(
        "ck_activity_schedules_weekday_values",
        "activity_schedules",
        "schedule_type <> 'selected_days' OR "
        "(cardinality(weekdays) > 0 AND "
        "weekdays <@ ARRAY[0,1,2,3,4,5,6]::smallint[])",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_activity_schedules_weekday_values",
        "activity_schedules",
        type_="check",
    )
    op.drop_constraint(
        "ck_activities_unit_code", "enrollment_activities", type_="check"
    )
    op.drop_constraint(
        "ck_activities_dimension", "enrollment_activities", type_="check"
    )
