import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status

from syp.api.dependencies import CurrentUser, DatabaseSession
from syp.plans.domain import PlanStatus
from syp.plans.schemas import PlanCreate, PlanResponse, PlanUpdate
from syp.plans.service import (
    create_personal_plan,
    get_personal_plan,
    list_personal_plans,
    transition_personal_plan,
    update_personal_plan,
)

router = APIRouter(prefix="/plans", tags=["plans"])


@router.post("", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
def create_plan(
    payload: PlanCreate, session: DatabaseSession, current_user: CurrentUser
) -> PlanResponse:
    return PlanResponse.model_validate(create_personal_plan(session, current_user.id, payload))


@router.get("", response_model=list[PlanResponse])
def list_plans(
    session: DatabaseSession,
    current_user: CurrentUser,
    plan_status: Annotated[PlanStatus | None, Query(alias="status")] = None,
) -> list[PlanResponse]:
    plans = list_personal_plans(session, current_user.id, plan_status)
    return [PlanResponse.model_validate(plan) for plan in plans]


@router.get("/{plan_id}", response_model=PlanResponse)
def get_plan(
    plan_id: uuid.UUID, session: DatabaseSession, current_user: CurrentUser
) -> PlanResponse:
    return PlanResponse.model_validate(get_personal_plan(session, current_user.id, plan_id))


@router.patch("/{plan_id}", response_model=PlanResponse)
def update_plan(
    plan_id: uuid.UUID,
    payload: PlanUpdate,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> PlanResponse:
    return PlanResponse.model_validate(
        update_personal_plan(session, current_user.id, plan_id, payload)
    )


def _transition(
    plan_id: uuid.UUID,
    target: PlanStatus,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> PlanResponse:
    plan = transition_personal_plan(session, current_user.id, plan_id, target)
    return PlanResponse.model_validate(plan)


@router.post("/{plan_id}/activate", response_model=PlanResponse)
def activate_plan(
    plan_id: uuid.UUID, session: DatabaseSession, current_user: CurrentUser
) -> PlanResponse:
    return _transition(plan_id, PlanStatus.ACTIVE, session, current_user)


@router.post("/{plan_id}/pause", response_model=PlanResponse)
def pause_plan(
    plan_id: uuid.UUID, session: DatabaseSession, current_user: CurrentUser
) -> PlanResponse:
    return _transition(plan_id, PlanStatus.PAUSED, session, current_user)


@router.post("/{plan_id}/complete", response_model=PlanResponse)
def complete_plan(
    plan_id: uuid.UUID, session: DatabaseSession, current_user: CurrentUser
) -> PlanResponse:
    return _transition(plan_id, PlanStatus.COMPLETED, session, current_user)


@router.post("/{plan_id}/archive", response_model=PlanResponse)
def archive_plan(
    plan_id: uuid.UUID, session: DatabaseSession, current_user: CurrentUser
) -> PlanResponse:
    return _transition(plan_id, PlanStatus.ARCHIVED, session, current_user)
