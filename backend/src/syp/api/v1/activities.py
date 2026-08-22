import uuid

from fastapi import APIRouter, status

from syp.activities.schemas import (
    ActivityCreate,
    ActivityResponse,
    ActivityUpdate,
    ExpectationInput,
)
from syp.activities.service import (
    create_activity,
    get_activity,
    list_activities,
    revise_expectation,
    update_activity,
)
from syp.api.dependencies import CurrentUser, DatabaseSession

router = APIRouter(prefix="/plans/{plan_id}/activities", tags=["activities"])


@router.post("", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
def create_plan_activity(
    plan_id: uuid.UUID,
    payload: ActivityCreate,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> ActivityResponse:
    return create_activity(session, current_user.id, plan_id, payload)


@router.get("", response_model=list[ActivityResponse])
def list_plan_activities(
    plan_id: uuid.UUID, session: DatabaseSession, current_user: CurrentUser
) -> list[ActivityResponse]:
    return list_activities(session, current_user.id, plan_id)


@router.get("/{activity_id}", response_model=ActivityResponse)
def get_plan_activity(
    plan_id: uuid.UUID,
    activity_id: uuid.UUID,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> ActivityResponse:
    return get_activity(session, current_user.id, plan_id, activity_id)


@router.patch("/{activity_id}", response_model=ActivityResponse)
def update_plan_activity(
    plan_id: uuid.UUID,
    activity_id: uuid.UUID,
    payload: ActivityUpdate,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> ActivityResponse:
    return update_activity(session, current_user.id, plan_id, activity_id, payload)


@router.post("/{activity_id}/expectations", response_model=ActivityResponse)
def revise_activity_expectation(
    plan_id: uuid.UUID,
    activity_id: uuid.UUID,
    payload: ExpectationInput,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> ActivityResponse:
    return revise_expectation(session, current_user.id, plan_id, activity_id, payload)
