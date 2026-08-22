import uuid
from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from syp.activities.domain import ScheduleType
from syp.activities.models import EnrollmentActivity
from syp.core.exceptions import ApplicationError
from syp.identity.models import User
from syp.plans.models import PlanEnrollment, PlanStatusEvent
from syp.progress.engine import (
    ActivityProgressInput,
    ActualRecord,
    ProgressReportResult,
    ScheduleWindow,
    StatusEventInput,
    TargetWindow,
    calculate_progress,
)
from syp.progress.models import ProgressEntry


def build_progress_report(
    session: Session,
    user: User,
    plan_id: uuid.UUID,
    start_date: date,
    end_date: date,
) -> ProgressReportResult:
    if end_date < start_date:
        raise ApplicationError(
            code="invalid_report_range",
            message="Report end date must be on or after its start date.",
            status_code=422,
        )
    if (end_date - start_date).days > 92:
        raise ApplicationError(
            code="report_range_too_large",
            message="Progress reports are limited to 93 days.",
            status_code=422,
        )
    plan = session.scalar(
        select(PlanEnrollment).where(
            PlanEnrollment.id == plan_id,
            PlanEnrollment.participant_user_id == user.id,
        )
    )
    if plan is None:
        raise ApplicationError(
            code="plan_not_found",
            message="The requested plan was not found.",
            status_code=404,
        )
    activities = session.scalars(
        select(EnrollmentActivity)
        .options(
            selectinload(EnrollmentActivity.target_revisions),
            selectinload(EnrollmentActivity.schedules),
        )
        .where(EnrollmentActivity.enrollment_id == plan_id)
        .order_by(EnrollmentActivity.display_order, EnrollmentActivity.created_at)
    ).all()
    entries = session.scalars(
        select(ProgressEntry)
        .join(EnrollmentActivity, EnrollmentActivity.id == ProgressEntry.activity_id)
        .where(
            EnrollmentActivity.enrollment_id == plan_id,
            ProgressEntry.participant_user_id == user.id,
            ProgressEntry.deleted_at.is_(None),
            ProgressEntry.performed_on >= start_date,
            ProgressEntry.performed_on <= end_date,
        )
    ).all()
    entries_by_activity: dict[uuid.UUID, list[ProgressEntry]] = {}
    for entry in entries:
        entries_by_activity.setdefault(entry.activity_id, []).append(entry)
    events = session.scalars(
        select(PlanStatusEvent)
        .where(PlanStatusEvent.plan_id == plan_id)
        .order_by(PlanStatusEvent.effective_on, PlanStatusEvent.recorded_at)
    ).all()
    status_inputs = tuple(
        StatusEventInput(event.status, event.effective_on, sequence)
        for sequence, event in enumerate(events)
    )
    activity_inputs = tuple(
        ActivityProgressInput(
            activity_id=str(activity.id),
            name=activity.name,
            unit=activity.custom_unit_label or activity.unit_code,
            targets=tuple(
                TargetWindow(item.target_quantity, item.effective_from, item.effective_until)
                for item in sorted(
                    activity.target_revisions, key=lambda revision: revision.effective_from
                )
            ),
            schedules=tuple(
                ScheduleWindow(
                    ScheduleType(item.schedule_type),
                    tuple(item.weekdays or []),
                    item.effective_from,
                    item.effective_until,
                )
                for item in sorted(
                    activity.schedules, key=lambda schedule: schedule.effective_from
                )
            ),
            entries=tuple(
                ActualRecord(entry.quantity, entry.performed_on)
                for entry in entries_by_activity.get(activity.id, [])
            ),
        )
        for activity in activities
    )
    today = datetime.now(ZoneInfo(user.timezone)).date()
    return calculate_progress(
        start_date=start_date,
        end_date=end_date,
        today=today,
        status_events=status_inputs,
        activities=activity_inputs,
    )
