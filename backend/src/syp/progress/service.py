import uuid
from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from syp.activities.models import EnrollmentActivity
from syp.core.exceptions import ApplicationError
from syp.identity.models import User
from syp.plans.domain import PlanStatus
from syp.plans.models import PlanEnrollment
from syp.progress.models import ProgressEntry
from syp.progress.schemas import ProgressEntryCreate, ProgressEntryUpdate


def _owned_activity_and_plan(
    session: Session,
    participant_id: uuid.UUID,
    plan_id: uuid.UUID,
    activity_id: uuid.UUID,
) -> tuple[EnrollmentActivity, PlanEnrollment]:
    row = session.execute(
        select(EnrollmentActivity, PlanEnrollment)
        .join(PlanEnrollment, PlanEnrollment.id == EnrollmentActivity.enrollment_id)
        .where(
            EnrollmentActivity.id == activity_id,
            EnrollmentActivity.enrollment_id == plan_id,
            PlanEnrollment.participant_user_id == participant_id,
        )
    ).one_or_none()
    if row is None:
        raise ApplicationError(
            code="activity_not_found",
            message="The requested activity was not found.",
            status_code=404,
        )
    return row[0], row[1]


def _validate_performed_date(user: User, plan: PlanEnrollment, performed_on: date) -> None:
    today = datetime.now(ZoneInfo(user.timezone)).date()
    if performed_on > today:
        raise ApplicationError(
            code="future_progress_not_allowed",
            message="Progress cannot be recorded for a future date.",
            status_code=422,
        )
    if plan.start_date and performed_on < plan.start_date:
        raise ApplicationError(
            code="progress_before_plan_start",
            message="Progress cannot be recorded before the plan start date.",
            status_code=422,
        )
    if plan.end_date and performed_on > plan.end_date:
        raise ApplicationError(
            code="progress_after_plan_end",
            message="Progress cannot be recorded after the plan end date.",
            status_code=422,
        )


def create_progress_entry(
    session: Session,
    user: User,
    plan_id: uuid.UUID,
    activity_id: uuid.UUID,
    payload: ProgressEntryCreate,
) -> ProgressEntry:
    activity, plan = _owned_activity_and_plan(session, user.id, plan_id, activity_id)
    if PlanStatus(plan.status) not in {PlanStatus.ACTIVE, PlanStatus.PAUSED}:
        raise ApplicationError(
            code="plan_not_recordable",
            message="Progress can be recorded only for an active or paused plan.",
            status_code=409,
        )
    _validate_performed_date(user, plan, payload.performed_on)
    entry = ProgressEntry(
        activity_id=activity.id,
        participant_user_id=user.id,
        quantity=payload.quantity,
        performed_on=payload.performed_on,
        note=payload.note,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


def list_plan_entries(
    session: Session,
    participant_id: uuid.UUID,
    plan_id: uuid.UUID,
    *,
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = 50,
) -> list[ProgressEntry]:
    ownership = session.scalar(
        select(PlanEnrollment.id).where(
            PlanEnrollment.id == plan_id,
            PlanEnrollment.participant_user_id == participant_id,
        )
    )
    if ownership is None:
        raise ApplicationError(
            code="plan_not_found",
            message="The requested plan was not found.",
            status_code=404,
        )
    query = (
        select(ProgressEntry)
        .join(EnrollmentActivity, EnrollmentActivity.id == ProgressEntry.activity_id)
        .where(
            EnrollmentActivity.enrollment_id == plan_id,
            ProgressEntry.participant_user_id == participant_id,
            ProgressEntry.deleted_at.is_(None),
        )
    )
    if start_date:
        query = query.where(ProgressEntry.performed_on >= start_date)
    if end_date:
        query = query.where(ProgressEntry.performed_on <= end_date)
    query = query.order_by(
        ProgressEntry.performed_on.desc(), ProgressEntry.recorded_at.desc()
    ).limit(limit)
    return list(session.scalars(query))


def _owned_entry(
    session: Session,
    participant_id: uuid.UUID,
    plan_id: uuid.UUID,
    activity_id: uuid.UUID,
    entry_id: uuid.UUID,
) -> tuple[ProgressEntry, PlanEnrollment]:
    row = session.execute(
        select(ProgressEntry, PlanEnrollment)
        .join(EnrollmentActivity, EnrollmentActivity.id == ProgressEntry.activity_id)
        .join(PlanEnrollment, PlanEnrollment.id == EnrollmentActivity.enrollment_id)
        .where(
            ProgressEntry.id == entry_id,
            ProgressEntry.activity_id == activity_id,
            ProgressEntry.participant_user_id == participant_id,
            ProgressEntry.deleted_at.is_(None),
            EnrollmentActivity.enrollment_id == plan_id,
            PlanEnrollment.participant_user_id == participant_id,
        )
    ).one_or_none()
    if row is None:
        raise ApplicationError(
            code="progress_entry_not_found",
            message="The requested progress entry was not found.",
            status_code=404,
        )
    return row[0], row[1]


def update_progress_entry(
    session: Session,
    user: User,
    plan_id: uuid.UUID,
    activity_id: uuid.UUID,
    entry_id: uuid.UUID,
    payload: ProgressEntryUpdate,
) -> ProgressEntry:
    entry, plan = _owned_entry(session, user.id, plan_id, activity_id, entry_id)
    if PlanStatus(plan.status) == PlanStatus.ARCHIVED:
        raise ApplicationError(
            code="archived_plan_read_only",
            message="Progress in an archived plan cannot be changed.",
            status_code=409,
        )
    changes = payload.model_dump(exclude_unset=True)
    performed_on = changes.get("performed_on", entry.performed_on)
    if performed_on is None:
        raise ApplicationError(
            code="invalid_performed_date",
            message="Performed date cannot be empty.",
            status_code=422,
        )
    _validate_performed_date(user, plan, performed_on)
    if "note" in changes and changes["note"] is not None:
        changes["note"] = changes["note"].strip() or None
    for field, value in changes.items():
        setattr(entry, field, value)
    session.commit()
    session.refresh(entry)
    return entry


def delete_progress_entry(
    session: Session,
    participant_id: uuid.UUID,
    plan_id: uuid.UUID,
    activity_id: uuid.UUID,
    entry_id: uuid.UUID,
) -> None:
    entry, plan = _owned_entry(
        session, participant_id, plan_id, activity_id, entry_id
    )
    if PlanStatus(plan.status) == PlanStatus.ARCHIVED:
        raise ApplicationError(
            code="archived_plan_read_only",
            message="Progress in an archived plan cannot be changed.",
            status_code=409,
        )
    entry.deleted_at = datetime.now(UTC)
    session.commit()
