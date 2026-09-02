from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

from syp.activities.domain import ScheduleType


@dataclass(frozen=True)
class TargetWindow:
    quantity: Decimal
    effective_from: date
    effective_until: date | None


@dataclass(frozen=True)
class ScheduleWindow:
    schedule_type: ScheduleType
    weekdays: tuple[int, ...]
    effective_from: date
    effective_until: date | None


@dataclass(frozen=True)
class ActualRecord:
    quantity: Decimal
    performed_on: date


@dataclass(frozen=True)
class ActivityProgressInput:
    activity_id: str
    name: str
    unit: str
    targets: tuple[TargetWindow, ...]
    schedules: tuple[ScheduleWindow, ...]
    entries: tuple[ActualRecord, ...]


@dataclass(frozen=True)
class StatusEventInput:
    status: str
    effective_on: date
    sequence: int


@dataclass(frozen=True)
class ActivityProgressResult:
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


@dataclass(frozen=True)
class ProgressReportResult:
    start_date: date
    end_date: date
    expected_activity_count: int
    overall_adherence_percent: Decimal
    skipped_days: tuple[date, ...]
    activities: tuple[ActivityProgressResult, ...]


def _covers(start: date, end: date | None, day: date) -> bool:
    return start <= day and (end is None or day <= end)


def _active_on(events: tuple[StatusEventInput, ...], day: date) -> bool:
    applicable = [event for event in events if event.effective_on <= day]
    if not applicable:
        return False
    latest = max(applicable, key=lambda event: (event.effective_on, event.sequence))
    return latest.status == "active"


def _percent(numerator: Decimal, denominator: Decimal) -> Decimal:
    if denominator == 0:
        return Decimal("0.00")
    return (numerator / denominator * Decimal(100)).quantize(Decimal("0.01"))


def calculate_progress(
    *,
    start_date: date,
    end_date: date,
    today: date,
    status_events: tuple[StatusEventInput, ...],
    activities: tuple[ActivityProgressInput, ...],
) -> ProgressReportResult:
    results: list[ActivityProgressResult] = []
    scheduled_days: set[date] = set()
    recorded_days = {
        entry.performed_on
        for activity in activities
        for entry in activity.entries
        if start_date <= entry.performed_on <= end_date
    }
    for activity in activities:
        buckets: dict[date, Decimal] = {}
        bucket_due_dates: dict[date, date] = {}
        day = start_date
        while day <= end_date:
            if _active_on(status_events, day):
                target = next(
                    (
                        item
                        for item in reversed(activity.targets)
                        if _covers(item.effective_from, item.effective_until, day)
                    ),
                    None,
                )
                schedule = next(
                    (
                        item
                        for item in reversed(activity.schedules)
                        if _covers(item.effective_from, item.effective_until, day)
                    ),
                    None,
                )
                if target and schedule:
                    if schedule.schedule_type == ScheduleType.DAILY or (
                        schedule.schedule_type == ScheduleType.SELECTED_DAYS
                        and day.weekday() in schedule.weekdays
                    ):
                        buckets[day] = buckets.get(day, Decimal(0)) + target.quantity
                        bucket_due_dates[day] = day
                        if day < today:
                            scheduled_days.add(day)
                    elif schedule.schedule_type == ScheduleType.WEEKLY:
                        week_start = day - timedelta(days=day.weekday())
                        key = max(week_start, schedule.effective_from, start_date)
                        if key not in buckets:
                            buckets[key] = target.quantity
                            bucket_due_dates[key] = min(week_start + timedelta(days=6), end_date)
            day += timedelta(days=1)

        actual_by_bucket = {key: Decimal(0) for key in buckets}
        unplanned_actual = Decimal(0)
        for entry in activity.entries:
            if not (start_date <= entry.performed_on <= end_date):
                continue
            matching = entry.performed_on
            weekly_key = next(
                (
                    key
                    for key, due in bucket_due_dates.items()
                    if key <= entry.performed_on <= due and due > key
                ),
                None,
            )
            key = matching if matching in buckets else weekly_key
            if key is None:
                unplanned_actual += entry.quantity
            else:
                actual_by_bucket[key] += entry.quantity

        completed = partial = missed = upcoming = 0
        for key, expected in buckets.items():
            actual = actual_by_bucket[key]
            if actual >= expected:
                completed += 1
            elif actual > 0:
                partial += 1
            elif bucket_due_dates[key] < today:
                missed += 1
            else:
                upcoming += 1
        expected_total = sum(buckets.values(), Decimal(0))
        actual_total = sum(
            (
                entry.quantity
                for entry in activity.entries
                if start_date <= entry.performed_on <= end_date
            ),
            Decimal(0),
        )
        attainment = _percent(actual_total, expected_total)
        results.append(
            ActivityProgressResult(
                activity_id=activity.activity_id,
                name=activity.name,
                unit=activity.unit,
                expected=expected_total,
                actual=actual_total,
                attainment_percent=attainment,
                adherence_percent=min(attainment, Decimal("100.00")),
                completed_occurrences=completed,
                partial_occurrences=partial,
                missed_occurrences=missed,
                upcoming_occurrences=upcoming,
            )
        )
    scored = [result.adherence_percent for result in results if result.expected > 0]
    overall = (
        (sum(scored, Decimal(0)) / Decimal(len(scored))).quantize(Decimal("0.01"))
        if scored
        else Decimal("0.00")
    )
    return ProgressReportResult(
        start_date=start_date,
        end_date=end_date,
        expected_activity_count=len(scored),
        overall_adherence_percent=overall,
        skipped_days=tuple(sorted(scheduled_days - recorded_days)),
        activities=tuple(results),
    )
