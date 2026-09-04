import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Annotated, Literal

from fastapi import APIRouter, Query, Response

from syp.admin.schemas import (
    AdminAnalyticsReport,
    AdminAssignmentPage,
    AdminAssignmentSummary,
    AdminAuditPage,
    AdminMetricsResponse,
    AdminOperationalAlerts,
    AdminPlanDetail,
    AdminPlanPage,
    AdminPlanStatusUpdate,
    AdminRolesUpdate,
    AdminStatusUpdate,
    AdminSystemSettings,
    AdminUserPage,
    AdminUserSummary,
)
from syp.admin.service import (
    analytics_report,
    cancel_assignment,
    change_plan_status,
    change_user_roles,
    change_user_status,
    dashboard_metrics,
    export_admin_dataset,
    get_admin_plan,
    get_admin_user,
    list_admin_assignments,
    list_admin_plans,
    list_audit_log,
    list_users,
    operational_alerts,
    system_settings,
    update_system_settings,
)
from syp.api.dependencies import CurrentAdmin, DatabaseSession
from syp.core.exceptions import ApplicationError
from syp.plans.domain import PlanStatus

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/reports", response_model=AdminAnalyticsReport)
def get_report(
    _: CurrentAdmin,
    session: DatabaseSession,
    start_date: date | None = None,
    end_date: date | None = None,
) -> AdminAnalyticsReport:
    report_end = end_date or datetime.now(UTC).date()
    report_start = start_date or report_end - timedelta(days=29)
    if report_start > report_end or (report_end - report_start).days > 365:
        raise ApplicationError(
            code="invalid_report_range",
            message="Report range must be ordered and no longer than 366 days.",
            status_code=422,
        )
    return analytics_report(session, start_date=report_start, end_date=report_end)


@router.get("/reports/export")
def export_report(
    dataset: Literal["users", "plans", "assignments"],
    _: CurrentAdmin,
    session: DatabaseSession,
    start_date: date | None = None,
    end_date: date | None = None,
) -> Response:
    report_end = end_date or datetime.now(UTC).date()
    report_start = start_date or report_end - timedelta(days=29)
    if report_start > report_end or (report_end - report_start).days > 365:
        raise ApplicationError(
            code="invalid_report_range",
            message="Report range must be ordered and no longer than 366 days.",
            status_code=422,
        )
    return Response(
        content="\ufeff"
        + export_admin_dataset(session, dataset, start_date=report_start, end_date=report_end),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="syp-{dataset}.csv"'},
    )


@router.get("/settings", response_model=AdminSystemSettings)
def get_settings(_: CurrentAdmin, session: DatabaseSession) -> AdminSystemSettings:
    return system_settings(session)


@router.put("/settings", response_model=AdminSystemSettings)
def put_settings(
    payload: AdminSystemSettings, admin: CurrentAdmin, session: DatabaseSession
) -> AdminSystemSettings:
    return update_system_settings(session, admin, payload)


@router.post("/assignments/{assignment_id}/cancel", response_model=AdminAssignmentSummary)
def cancel_invitation(
    assignment_id: uuid.UUID, admin: CurrentAdmin, session: DatabaseSession
) -> AdminAssignmentSummary:
    return cancel_assignment(session, admin, assignment_id)


@router.get("/alerts", response_model=AdminOperationalAlerts)
def get_alerts(_: CurrentAdmin, session: DatabaseSession) -> AdminOperationalAlerts:
    return operational_alerts(session, stale_days=system_settings(session).stale_invitation_days)


@router.get("/assignments", response_model=AdminAssignmentPage)
def get_assignments(
    _: CurrentAdmin,
    session: DatabaseSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 25,
    search: Annotated[str | None, Query(max_length=100)] = None,
    status: Annotated[
        Literal["pending", "accepted", "rejected", "cancelled"] | None, Query()
    ] = None,
    stale_only: bool = False,
) -> AdminAssignmentPage:
    return list_admin_assignments(
        session,
        page=page,
        page_size=page_size,
        search=search,
        status=status,
        stale_only=stale_only,
        stale_days=system_settings(session).stale_invitation_days,
    )


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
    status: Annotated[Literal["active", "disabled"] | None, Query()] = None,
    role: Annotated[Literal["participant", "coach", "admin"] | None, Query()] = None,
) -> AdminUserPage:
    return list_users(
        session, page=page, page_size=page_size, search=search, status=status, role=role
    )


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
