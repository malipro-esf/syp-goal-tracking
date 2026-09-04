import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from syp.core.exceptions import ApplicationError
from syp.notifications.models import Notification, NotificationPreference
from syp.notifications.schemas import (
    NotificationPage,
    NotificationPreferences,
    NotificationResponse,
)

INVITATION_KINDS = {"invitation_received", "invitation_accepted", "invitation_rejected"}
REMINDER_KINDS = {"plan_ending", "stale_invitation"}


def create_notification(
    session: Session,
    *,
    user_id: uuid.UUID,
    kind: str,
    title: str,
    message: str,
    action_url: str | None = None,
    dedupe_key: str | None = None,
) -> Notification | None:
    preferences = session.get(NotificationPreference, user_id)
    if preferences is not None:
        if kind in INVITATION_KINDS and not preferences.invitation_updates_enabled:
            return None
        if kind in REMINDER_KINDS and not preferences.automated_reminders_enabled:
            return None
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


def get_preferences(session: Session, user_id: uuid.UUID) -> NotificationPreferences:
    stored = session.get(NotificationPreference, user_id)
    if stored is None:
        return NotificationPreferences()
    return NotificationPreferences.model_validate(stored.__dict__)


def update_preferences(
    session: Session, user_id: uuid.UUID, payload: NotificationPreferences
) -> NotificationPreferences:
    stored = session.get(NotificationPreference, user_id)
    if stored is None:
        stored = NotificationPreference(user_id=user_id)
        session.add(stored)
    stored.invitation_updates_enabled = payload.invitation_updates_enabled
    stored.automated_reminders_enabled = payload.automated_reminders_enabled
    session.commit()
    return get_preferences(session, user_id)


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
