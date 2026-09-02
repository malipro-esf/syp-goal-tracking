import uuid
from datetime import datetime
from typing import Literal

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


class AdminStatusUpdate(BaseModel):
    status: Literal["active", "disabled"]


class AdminRolesUpdate(BaseModel):
    roles: set[Literal["participant", "coach", "admin"]]


class AdminAuditEntry(BaseModel):
    id: uuid.UUID
    admin_user_id: uuid.UUID
    admin_name: str
    target_user_id: uuid.UUID | None
    target_name: str | None
    action: str
    changes: dict
    created_at: datetime


class AdminAuditPage(BaseModel):
    items: list[AdminAuditEntry]
    total: int
    page: int
    page_size: int
