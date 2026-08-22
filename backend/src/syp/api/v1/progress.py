import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query, status

from syp.api.dependencies import CurrentUser, DatabaseSession
from syp.progress.report_schemas import ActivityProgressResponse, ProgressReportResponse
from syp.progress.reporting import build_progress_report
from syp.progress.schemas import (
    ProgressEntryCreate,
    ProgressEntryResponse,
    ProgressEntryUpdate,
)
from syp.progress.service import (
    create_progress_entry,
    delete_progress_entry,
    list_plan_entries,
    update_progress_entry,
)

router = APIRouter(prefix="/plans/{plan_id}", tags=["progress entries"])


@router.get("/progress-report", response_model=ProgressReportResponse)
def get_progress_report(
    plan_id: uuid.UUID,
    start_date: date,
    end_date: date,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> ProgressReportResponse:
    report = build_progress_report(
        session, current_user, plan_id, start_date, end_date
    )
    return ProgressReportResponse(
        start_date=report.start_date,
        end_date=report.end_date,
        expected_activity_count=report.expected_activity_count,
        overall_adherence_percent=report.overall_adherence_percent,
        activities=[
            ActivityProgressResponse(**activity.__dict__)
            for activity in report.activities
        ],
    )


@router.get("/progress-entries", response_model=list[ProgressEntryResponse])
def list_entries(
    plan_id: uuid.UUID,
    session: DatabaseSession,
    current_user: CurrentUser,
    start_date: date | None = None,
    end_date: date | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[ProgressEntryResponse]:
    return [
        ProgressEntryResponse.model_validate(entry)
        for entry in list_plan_entries(
            session,
            current_user.id,
            plan_id,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
        )
    ]


@router.post(
    "/activities/{activity_id}/progress-entries",
    response_model=ProgressEntryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_entry(
    plan_id: uuid.UUID,
    activity_id: uuid.UUID,
    payload: ProgressEntryCreate,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> ProgressEntryResponse:
    entry = create_progress_entry(
        session, current_user, plan_id, activity_id, payload
    )
    return ProgressEntryResponse.model_validate(entry)


@router.patch(
    "/activities/{activity_id}/progress-entries/{entry_id}",
    response_model=ProgressEntryResponse,
)
def update_entry(
    plan_id: uuid.UUID,
    activity_id: uuid.UUID,
    entry_id: uuid.UUID,
    payload: ProgressEntryUpdate,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> ProgressEntryResponse:
    entry = update_progress_entry(
        session, current_user, plan_id, activity_id, entry_id, payload
    )
    return ProgressEntryResponse.model_validate(entry)


@router.delete(
    "/activities/{activity_id}/progress-entries/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_entry(
    plan_id: uuid.UUID,
    activity_id: uuid.UUID,
    entry_id: uuid.UUID,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> None:
    delete_progress_entry(
        session, current_user.id, plan_id, activity_id, entry_id
    )
