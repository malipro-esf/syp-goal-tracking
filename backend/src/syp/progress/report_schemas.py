from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class ActivityProgressResponse(BaseModel):
    activity_id: str
    name: str
    unit: str
    expected: Decimal
    actual: Decimal
    attainment_percent: Decimal
    adherence_percent: Decimal
    completed_occurrences: int
    partial_occurrences: int
    missed_occurrences: int
    upcoming_occurrences: int


class ProgressReportResponse(BaseModel):
    start_date: date
    end_date: date
    expected_activity_count: int
    overall_adherence_percent: Decimal
    skipped_days: list[date]
    activities: list[ActivityProgressResponse]
