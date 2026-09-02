import uuid
from datetime import datetime

from pydantic import BaseModel


class AdminMetricsResponse(BaseModel):
    users: int
    participants: int
    coaches: int
    active_plans: int
    pending_invitations: int


class AdminUserSummary(BaseModel):
    id: uuid.UUID
    email: str
    display_name: str
    country_code: str | None
    status: str
    roles: list[str]
    created_at: datetime


class AdminUserPage(BaseModel):
    items: list[AdminUserSummary]
    total: int
    page: int
    page_size: int
