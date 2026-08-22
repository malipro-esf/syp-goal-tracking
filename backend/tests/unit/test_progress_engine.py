from datetime import date
from decimal import Decimal

from syp.activities.domain import ScheduleType
from syp.progress.engine import (
    ActivityProgressInput,
    ActualRecord,
    ScheduleWindow,
    StatusEventInput,
    TargetWindow,
    calculate_progress,
)


def activity(
    *,
    activity_id: str = "a1",
    unit: str = "minute",
    target: str = "30",
    schedule: ScheduleType = ScheduleType.DAILY,
    weekdays: tuple[int, ...] = (),
    entries: tuple[ActualRecord, ...] = (),
) -> ActivityProgressInput:
    return ActivityProgressInput(
        activity_id=activity_id,
        name=activity_id,
        unit=unit,
        targets=(TargetWindow(Decimal(target), date(2026, 8, 1), None),),
        schedules=(ScheduleWindow(schedule, weekdays, date(2026, 8, 1), None),),
        entries=entries,
    )


def test_daily_partial_missed_and_upcoming_occurrences() -> None:
    report = calculate_progress(
        start_date=date(2026, 8, 20),
        end_date=date(2026, 8, 22),
        today=date(2026, 8, 22),
        status_events=(StatusEventInput("active", date(2026, 8, 1), 0),),
        activities=(activity(entries=(ActualRecord(Decimal("18"), date(2026, 8, 20)),)),),
    )
    result = report.activities[0]
    assert result.expected == Decimal("90")
    assert result.actual == Decimal("18")
    assert result.attainment_percent == Decimal("20.00")
    assert result.partial_occurrences == 1
    assert result.missed_occurrences == 1
    assert result.upcoming_occurrences == 1


def test_above_target_attainment_does_not_overweight_mixed_units() -> None:
    report = calculate_progress(
        start_date=date(2026, 8, 20),
        end_date=date(2026, 8, 20),
        today=date(2026, 8, 21),
        status_events=(StatusEventInput("active", date(2026, 8, 1), 0),),
        activities=(
            activity(entries=(ActualRecord(Decimal("60"), date(2026, 8, 20)),)),
            activity(
                activity_id="pages",
                unit="page",
                target="20",
                entries=(),
            ),
        ),
    )
    assert report.activities[0].attainment_percent == Decimal("200.00")
    assert report.activities[0].adherence_percent == Decimal("100.00")
    assert report.overall_adherence_percent == Decimal("50.00")


def test_selected_days_and_paused_dates_generate_correct_expectations() -> None:
    report = calculate_progress(
        start_date=date(2026, 8, 17),
        end_date=date(2026, 8, 23),
        today=date(2026, 8, 24),
        status_events=(
            StatusEventInput("active", date(2026, 8, 17), 0),
            StatusEventInput("paused", date(2026, 8, 19), 1),
            StatusEventInput("active", date(2026, 8, 21), 2),
        ),
        activities=(
            activity(
                target="10",
                schedule=ScheduleType.SELECTED_DAYS,
                weekdays=(0, 2, 4),
            ),
        ),
    )
    assert report.activities[0].expected == Decimal("20")
    assert report.activities[0].missed_occurrences == 2


def test_weekly_quota_is_not_missed_until_week_ends() -> None:
    report = calculate_progress(
        start_date=date(2026, 8, 17),
        end_date=date(2026, 8, 23),
        today=date(2026, 8, 20),
        status_events=(StatusEventInput("active", date(2026, 8, 1), 0),),
        activities=(activity(target="3", schedule=ScheduleType.WEEKLY),),
    )
    result = report.activities[0]
    assert result.expected == Decimal("3")
    assert result.missed_occurrences == 0
    assert result.upcoming_occurrences == 1


def test_target_revision_applies_only_from_its_effective_date() -> None:
    base = activity()
    revised = ActivityProgressInput(
        **{
            **base.__dict__,
            "targets": (
                TargetWindow(Decimal("30"), date(2026, 8, 1), date(2026, 8, 20)),
                TargetWindow(Decimal("40"), date(2026, 8, 21), None),
            ),
        }
    )
    report = calculate_progress(
        start_date=date(2026, 8, 20),
        end_date=date(2026, 8, 21),
        today=date(2026, 8, 22),
        status_events=(StatusEventInput("active", date(2026, 8, 1), 0),),
        activities=(revised,),
    )
    assert report.activities[0].expected == Decimal("70")
