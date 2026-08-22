import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from syp.core.exceptions import ApplicationError
from syp.identity.models import User
from syp.plans.domain import PlanStatus, ensure_transition_allowed
from syp.plans.models import PlanEnrollment, PlanStatusEvent
from syp.plans.schemas import PlanCreate, PlanUpdate


def create_personal_plan(
    session: Session, participant_id: uuid.UUID, payload: PlanCreate
) -> PlanEnrollment:
    plan = PlanEnrollment(
        participant_user_id=participant_id,
        created_by_user_id=participant_id,
        **payload.model_dump(),
    )
    session.add(plan)
    session.flush()
    user = session.get(User, participant_id)
    timezone = user.timezone if user else "UTC"
    session.add(
        PlanStatusEvent(
            plan_id=plan.id,
            status=PlanStatus.DRAFT.value,
            effective_on=datetime.now(ZoneInfo(timezone)).date(),
        )
    )
    session.commit()
    session.refresh(plan)
    return plan


def list_personal_plans(
    session: Session, participant_id: uuid.UUID, status: PlanStatus | None = None
) -> list[PlanEnrollment]:
    query = select(PlanEnrollment).where(PlanEnrollment.participant_user_id == participant_id)
    if status is not None:
        query = query.where(PlanEnrollment.status == status.value)
    return list(session.scalars(query.order_by(PlanEnrollment.created_at.desc())))


def get_personal_plan(
    session: Session, participant_id: uuid.UUID, plan_id: uuid.UUID
) -> PlanEnrollment:
    plan = session.scalar(
        select(PlanEnrollment).where(
            PlanEnrollment.id == plan_id,
            PlanEnrollment.participant_user_id == participant_id,
        )
    )
    if plan is None:
        raise ApplicationError(
            code="plan_not_found",
            message="The requested plan was not found.",
            status_code=404,
        )
    return plan


def update_personal_plan(
    session: Session,
    participant_id: uuid.UUID,
    plan_id: uuid.UUID,
    payload: PlanUpdate,
) -> PlanEnrollment:
    plan = get_personal_plan(session, participant_id, plan_id)
    if PlanStatus(plan.status) == PlanStatus.ARCHIVED:
        raise ApplicationError(
            code="archived_plan_read_only",
            message="An archived plan cannot be edited.",
            status_code=409,
        )
    changes = payload.model_dump(exclude_unset=True)
    if "title" in changes:
        title = (changes["title"] or "").strip()
        if not title:
            raise ApplicationError(
                code="invalid_plan_title",
                message="Plan title cannot be blank.",
                status_code=422,
            )
        changes["title"] = title
    if "description" in changes and changes["description"] is not None:
        changes["description"] = changes["description"].strip() or None
    start_date = changes.get("start_date", plan.start_date)
    end_date = changes.get("end_date", plan.end_date)
    if start_date and end_date and end_date < start_date:
        raise ApplicationError(
            code="invalid_plan_dates",
            message="End date must be on or after start date.",
            status_code=422,
        )
    for field, value in changes.items():
        setattr(plan, field, value)
    session.commit()
    session.refresh(plan)
    return plan


def transition_personal_plan(
    session: Session,
    participant_id: uuid.UUID,
    plan_id: uuid.UUID,
    target: PlanStatus,
) -> PlanEnrollment:
    plan = get_personal_plan(session, participant_id, plan_id)
    ensure_transition_allowed(PlanStatus(plan.status), target)
    plan.status = target.value
    user = session.get(User, participant_id)
    timezone = user.timezone if user else "UTC"
    session.add(
        PlanStatusEvent(
            plan_id=plan.id,
            status=target.value,
            effective_on=datetime.now(ZoneInfo(timezone)).date(),
        )
    )
    session.commit()
    session.refresh(plan)
    return plan
