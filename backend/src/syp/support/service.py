import uuid
from datetime import UTC, datetime

from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session

from syp.core.exceptions import ApplicationError
from syp.support.models import SupportRequest
from syp.support.schemas import (
    SupportRequestCreate,
    SupportRequestPage,
    SupportRequestResponse,
    SupportRequestUpdate,
)


def create_support_request(
    session: Session, payload: SupportRequestCreate
) -> SupportRequestResponse:
    request = SupportRequest(**payload.model_dump(mode="json"))
    session.add(request)
    session.commit()
    session.refresh(request)
    return SupportRequestResponse.model_validate(request.__dict__)


def list_support_requests(
    session: Session,
    *,
    page: int,
    page_size: int,
    search: str | None,
    status: str | None,
    category: str | None,
) -> SupportRequestPage:
    filters = []
    if status:
        filters.append(SupportRequest.status == status)
    if category:
        filters.append(SupportRequest.category == category)
    if search:
        term = f"%{search.strip()}%"
        filters.append(
            or_(
                SupportRequest.name.ilike(term),
                SupportRequest.email.ilike(term),
                SupportRequest.subject.ilike(term),
            )
        )
    total = session.scalar(select(func.count()).select_from(SupportRequest).where(*filters)) or 0
    items = session.scalars(
        select(SupportRequest)
        .where(*filters)
        .order_by(SupportRequest.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return SupportRequestPage(
        items=[SupportRequestResponse.model_validate(item.__dict__) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


def update_support_request(
    session: Session, request_id: uuid.UUID, payload: SupportRequestUpdate
) -> SupportRequestResponse:
    request = session.get(SupportRequest, request_id)
    if request is None:
        raise ApplicationError(
            code="support_request_not_found",
            message="Support request was not found.",
            status_code=404,
        )
    request.status = payload.status
    request.admin_note = payload.admin_note.strip() if payload.admin_note else None
    session.commit()
    session.refresh(request)
    return SupportRequestResponse.model_validate(request.__dict__)


def unread_support_request_count(session: Session) -> int:
    return (
        session.scalar(
            select(func.count())
            .select_from(SupportRequest)
            .where(SupportRequest.viewed_at.is_(None))
        )
        or 0
    )


def mark_support_requests_viewed(session: Session) -> None:
    session.execute(
        update(SupportRequest)
        .where(SupportRequest.viewed_at.is_(None))
        .values(viewed_at=datetime.now(UTC))
    )
    session.commit()
