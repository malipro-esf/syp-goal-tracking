import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from syp.core.exceptions import ApplicationError
from syp.notifications.models import Notification
from syp.notifications.schemas import NotificationPage, NotificationResponse


def create_notification(
    session: Session,
    *,
    user_id: uuid.UUID,
    kind: str,
    title: str,
    message: str,
    action_url: str | None = None,
    dedupe_key: str | None = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        kind=kind,
        title=title,
        message=message,
        action_url=action_url,
        dedupe_key=dedupe_key,
    )
    session.add(notification)
    return notification


def list_notifications(
    session: Session, user_id: uuid.UUID, *, page: int, page_size: int, unread_only: bool
) -> NotificationPage:
    filters = [Notification.user_id == user_id]
    if unread_only:
        filters.append(Notification.read_at.is_(None))
    total = session.scalar(select(func.count()).select_from(Notification).where(*filters)) or 0
    unread = (
        session.scalar(
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user_id, Notification.read_at.is_(None))
        )
        or 0
    )
    items = session.scalars(
        select(Notification)
        .where(*filters)
        .order_by(Notification.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return NotificationPage(
        items=[NotificationResponse.model_validate(item.__dict__) for item in items],
        total=total,
        unread=unread,
        page=page,
        page_size=page_size,
    )


def mark_read(session: Session, user_id: uuid.UUID, notification_id: uuid.UUID) -> None:
    notification = session.scalar(
        select(Notification).where(
            Notification.id == notification_id, Notification.user_id == user_id
        )
    )
    if notification is None:
        raise ApplicationError(
            code="notification_not_found", message="Notification was not found.", status_code=404
        )
    if notification.read_at is None:
        notification.read_at = datetime.now(UTC)
        session.commit()


def mark_all_read(session: Session, user_id: uuid.UUID) -> None:
    session.execute(
        update(Notification)
        .where(Notification.user_id == user_id, Notification.read_at.is_(None))
        .values(read_at=datetime.now(UTC))
    )
    session.commit()
