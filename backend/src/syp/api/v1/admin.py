import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Query

from syp.admin.schemas import (
    AdminAuditPage,
    AdminMetricsResponse,
    AdminPlanDetail,
    AdminPlanPage,
    AdminPlanStatusUpdate,
    AdminRolesUpdate,
    AdminStatusUpdate,
    AdminUserPage,
    AdminUserSummary,
)
from syp.admin.service import (
    change_plan_status,
    change_user_roles,
    change_user_status,
    dashboard_metrics,
    get_admin_plan,
    get_admin_user,
    list_admin_plans,
    list_audit_log,
    list_users,
)
from syp.api.dependencies import CurrentAdmin, DatabaseSession
from syp.plans.domain import PlanStatus

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/plans", response_model=AdminPlanPage)
def get_plans(
    _: CurrentAdmin,
    session: DatabaseSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 25,
    search: Annotated[str | None, Query(max_length=100)] = None,
    status: Annotated[
        Literal["draft", "active", "paused", "completed", "archived"] | None, Query()
    ] = None,
) -> AdminPlanPage:
    return list_admin_plans(session, page=page, page_size=page_size, search=search, status=status)


@router.get("/plans/{plan_id}", response_model=AdminPlanDetail)
def get_plan(plan_id: uuid.UUID, _: CurrentAdmin, session: DatabaseSession) -> AdminPlanDetail:
    return get_admin_plan(session, plan_id)


@router.patch("/plans/{plan_id}/status", response_model=AdminPlanDetail)
def patch_plan_status(
    plan_id: uuid.UUID,
    payload: AdminPlanStatusUpdate,
    admin: CurrentAdmin,
    session: DatabaseSession,
) -> AdminPlanDetail:
    return change_plan_status(session, admin, plan_id, PlanStatus(payload.status))


@router.get("/metrics", response_model=AdminMetricsResponse)
def get_metrics(_: CurrentAdmin, session: DatabaseSession) -> AdminMetricsResponse:
    return dashboard_metrics(session)


@router.get("/users", response_model=AdminUserPage)
def get_users(
    _: CurrentAdmin,
    session: DatabaseSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 25,
    search: Annotated[str | None, Query(max_length=100)] = None,
) -> AdminUserPage:
    return list_users(session, page=page, page_size=page_size, search=search)


@router.get("/users/{user_id}", response_model=AdminUserSummary)
def get_user(user_id: uuid.UUID, _: CurrentAdmin, session: DatabaseSession) -> AdminUserSummary:
    return get_admin_user(session, user_id)


@router.patch("/users/{user_id}/status", response_model=AdminUserSummary)
def patch_user_status(
    user_id: uuid.UUID, payload: AdminStatusUpdate, admin: CurrentAdmin, session: DatabaseSession
) -> AdminUserSummary:
    return change_user_status(session, admin, user_id, payload.status)


@router.put("/users/{user_id}/roles", response_model=AdminUserSummary)
def put_user_roles(
    user_id: uuid.UUID, payload: AdminRolesUpdate, admin: CurrentAdmin, session: DatabaseSession
) -> AdminUserSummary:
    return change_user_roles(session, admin, user_id, set(payload.roles))


@router.get("/audit-log", response_model=AdminAuditPage)
def get_audit_log(
    _: CurrentAdmin,
    session: DatabaseSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 25,
) -> AdminAuditPage:
    return list_audit_log(session, page=page, page_size=page_size)
