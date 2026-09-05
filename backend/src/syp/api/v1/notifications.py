import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Query, Response

from syp.api.dependencies import CurrentUser, DatabaseSession
from syp.notifications.schemas import (
    NotificationPage,
    NotificationPreferences,
    UnreadNotificationCount,
)
from syp.notifications.service import (
    delete_all_notifications,
    delete_notification,
    get_preferences,
    list_notifications,
    mark_all_read,
    mark_read,
    update_preferences,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationPage)
def notifications(
    session: DatabaseSession,
    current_user: CurrentUser,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 25,
    unread_only: bool = False,
    category: Literal["invitations", "reminders"] | None = None,
) -> NotificationPage:
    return list_notifications(
        session,
        current_user.id,
        page=page,
        page_size=page_size,
        unread_only=unread_only,
        category=category,
    )


@router.get("/unread-count", response_model=UnreadNotificationCount)
def unread_count(session: DatabaseSession, current_user: CurrentUser) -> UnreadNotificationCount:
    page = list_notifications(session, current_user.id, page=1, page_size=1, unread_only=True)
    return UnreadNotificationCount(unread=page.unread)


@router.post("/read-all", status_code=204)
def read_all(session: DatabaseSession, current_user: CurrentUser) -> Response:
    mark_all_read(session, current_user.id)
    return Response(status_code=204)


@router.delete("", status_code=204)
def delete_all(session: DatabaseSession, current_user: CurrentUser) -> Response:
    delete_all_notifications(session, current_user.id)
    return Response(status_code=204)


@router.get("/preferences", response_model=NotificationPreferences)
def preferences(session: DatabaseSession, current_user: CurrentUser) -> NotificationPreferences:
    return get_preferences(session, current_user.id)


@router.put("/preferences", response_model=NotificationPreferences)
def put_preferences(
    payload: NotificationPreferences,
    session: DatabaseSession,
    current_user: CurrentUser,
) -> NotificationPreferences:
    return update_preferences(session, current_user.id, payload)


@router.post("/{notification_id}/read", status_code=204)
def read_one(
    notification_id: uuid.UUID, session: DatabaseSession, current_user: CurrentUser
) -> Response:
    mark_read(session, current_user.id, notification_id)
    return Response(status_code=204)


@router.delete("/{notification_id}", status_code=204)
def delete_one(
    notification_id: uuid.UUID, session: DatabaseSession, current_user: CurrentUser
) -> Response:
    delete_notification(session, current_user.id, notification_id)
    return Response(status_code=204)
