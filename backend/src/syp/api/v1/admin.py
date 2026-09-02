from typing import Annotated

from fastapi import APIRouter, Query

from syp.admin.schemas import AdminMetricsResponse, AdminUserPage
from syp.admin.service import dashboard_metrics, list_users
from syp.api.dependencies import CurrentAdmin, DatabaseSession

router = APIRouter(prefix="/admin", tags=["admin"])


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
