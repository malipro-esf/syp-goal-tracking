import uuid
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from syp.activities.domain import UNIT_DIMENSIONS, UnitCode
from syp.activities.models import (
    ActivitySchedule,
    ActivityTargetRevision,
    EnrollmentActivity,
)
from syp.activities.schemas import (
    ActivityCreate,
    ActivityResponse,
    ActivityUpdate,
    ExpectationInput,
    ScheduleResponse,
    TargetRevisionResponse,
)
from syp.core.exceptions import ApplicationError
from syp.plans.domain import PlanStatus
from syp.plans.models import PlanEnrollment
from syp.plans.service import get_personal_plan


def _ensure_plan_editable(plan: PlanEnrollment) -> None:
    if plan.source_assignment_id is not None:
        raise ApplicationError(
            code="coach_managed_plan_read_only",
            message="Only the coach can change activities in an assigned plan.",
            status_code=403,
        )
    if PlanStatus(plan.status) in {PlanStatus.COMPLETED, PlanStatus.ARCHIVED}:
        raise ApplicationError(
            code="plan_activities_read_only",
            message="Activities cannot be changed after a plan is completed or archived.",
            status_code=409,
        )


def _latest_target(session: Session, activity_id: uuid.UUID) -> ActivityTargetRevision:
    target = session.scalar(
        select(ActivityTargetRevision)
        .where(ActivityTargetRevision.activity_id == activity_id)
        .order_by(ActivityTargetRevision.effective_from.desc())
    )
    if target is None:
        raise RuntimeError("Activity target revision is missing.")
    return target


def _latest_schedule(session: Session, activity_id: uuid.UUID) -> ActivitySchedule:
    schedule = session.scalar(
        select(ActivitySchedule)
        .where(ActivitySchedule.activity_id == activity_id)
        .order_by(ActivitySchedule.effective_from.desc())
    )
    if schedule is None:
        raise RuntimeError("Activity schedule is missing.")
    return schedule


def _response(session: Session, activity: EnrollmentActivity) -> ActivityResponse:
    return ActivityResponse(
        id=activity.id,
        enrollment_id=activity.enrollment_id,
        name=activity.name,
        description=activity.description,
        measurement_dimension=activity.measurement_dimension,
        unit_code=UnitCode(activity.unit_code),
        custom_unit_label=activity.custom_unit_label,
        display_order=activity.display_order,
        status=activity.status,
        current_target=TargetRevisionResponse.model_validate(_latest_target(session, activity.id)),
        current_schedule=ScheduleResponse.model_validate(_latest_schedule(session, activity.id)),
        created_at=activity.created_at,
        updated_at=activity.updated_at,
    )


def _owned_activity(
    session: Session,
    participant_id: uuid.UUID,
    plan_id: uuid.UUID,
    activity_id: uuid.UUID,
) -> EnrollmentActivity:
    activity = session.scalar(
        select(EnrollmentActivity)
        .join(PlanEnrollment, PlanEnrollment.id == EnrollmentActivity.enrollment_id)
        .where(
            EnrollmentActivity.id == activity_id,
            EnrollmentActivity.enrollment_id == plan_id,
            PlanEnrollment.participant_user_id == participant_id,
        )
    )
    if activity is None:
        raise ApplicationError(
            code="activity_not_found",
            message="The requested activity was not found.",
            status_code=404,
        )
    return activity


def create_activity(
    session: Session,
    participant_id: uuid.UUID,
    plan_id: uuid.UUID,
    payload: ActivityCreate,
) -> ActivityResponse:
    plan = get_personal_plan(session, participant_id, plan_id)
    _ensure_plan_editable(plan)
    activity = EnrollmentActivity(
        enrollment_id=plan.id,
        name=payload.name,
        description=payload.description,
        measurement_dimension=UNIT_DIMENSIONS[payload.unit_code].value,
        unit_code=payload.unit_code.value,
        custom_unit_label=payload.custom_unit_label,
        display_order=payload.display_order,
    )
    session.add(activity)
    session.flush()
    session.add(
        ActivityTargetRevision(
            activity_id=activity.id,
            target_quantity=payload.target_quantity,
            effective_from=payload.effective_from,
            created_by_user_id=participant_id,
            reason=payload.reason,
        )
    )
    session.add(
        ActivitySchedule(
            activity_id=activity.id,
            schedule_type=payload.schedule_type.value,
            weekdays=payload.weekdays,
            effective_from=payload.effective_from,
            created_by_user_id=participant_id,
        )
    )
    session.commit()
    session.refresh(activity)
    return _response(session, activity)


def list_activities(
    session: Session, participant_id: uuid.UUID, plan_id: uuid.UUID
) -> list[ActivityResponse]:
    get_personal_plan(session, participant_id, plan_id)
    activities = session.scalars(
        select(EnrollmentActivity)
        .where(EnrollmentActivity.enrollment_id == plan_id)
        .order_by(EnrollmentActivity.display_order, EnrollmentActivity.created_at)
    ).all()
    return [_response(session, activity) for activity in activities]


def get_activity(
    session: Session,
    participant_id: uuid.UUID,
    plan_id: uuid.UUID,
    activity_id: uuid.UUID,
) -> ActivityResponse:
    return _response(session, _owned_activity(session, participant_id, plan_id, activity_id))


def update_activity(
    session: Session,
    participant_id: uuid.UUID,
    plan_id: uuid.UUID,
    activity_id: uuid.UUID,
    payload: ActivityUpdate,
) -> ActivityResponse:
    plan = get_personal_plan(session, participant_id, plan_id)
    _ensure_plan_editable(plan)
    activity = _owned_activity(session, participant_id, plan_id, activity_id)
    changes = payload.model_dump(exclude_unset=True)
    if "name" in changes:
        name = (changes["name"] or "").strip()
        if not name:
            raise ApplicationError(
                code="invalid_activity_name",
                message="Activity name cannot be blank.",
                status_code=422,
            )
        changes["name"] = name
    if "description" in changes and changes["description"] is not None:
        changes["description"] = changes["description"].strip() or None
    for field, value in changes.items():
        setattr(activity, field, value)
    session.commit()
    session.refresh(activity)
    return _response(session, activity)


def revise_expectation(
    session: Session,
    participant_id: uuid.UUID,
    plan_id: uuid.UUID,
    activity_id: uuid.UUID,
    payload: ExpectationInput,
) -> ActivityResponse:
    plan = get_personal_plan(session, participant_id, plan_id)
    _ensure_plan_editable(plan)
    activity = _owned_activity(session, participant_id, plan_id, activity_id)
    target = _latest_target(session, activity.id)
    schedule = _latest_schedule(session, activity.id)
    if payload.effective_from <= target.effective_from:
        raise ApplicationError(
            code="invalid_revision_date",
            message="A revision must begin after the latest expectation start date.",
            status_code=409,
        )
    previous_day = payload.effective_from - timedelta(days=1)
    target.effective_until = previous_day
    schedule.effective_until = previous_day
    session.add(
        ActivityTargetRevision(
            activity_id=activity.id,
            target_quantity=payload.target_quantity,
            effective_from=payload.effective_from,
            created_by_user_id=participant_id,
            reason=payload.reason,
        )
    )
    session.add(
        ActivitySchedule(
            activity_id=activity.id,
            schedule_type=payload.schedule_type.value,
            weekdays=payload.weekdays,
            effective_from=payload.effective_from,
            created_by_user_id=participant_id,
        )
    )
    session.commit()
    session.refresh(activity)
    return _response(session, activity)
