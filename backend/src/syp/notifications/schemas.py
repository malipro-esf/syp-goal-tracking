import uuid
from datetime import datetime

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: uuid.UUID
    kind: str
    title: str
    message: str
    action_url: str | None
    read_at: datetime | None
    created_at: datetime


class NotificationPage(BaseModel):
    items: list[NotificationResponse]
    total: int
    unread: int
    page: int
    page_size: int


class UnreadNotificationCount(BaseModel):
    unread: int
