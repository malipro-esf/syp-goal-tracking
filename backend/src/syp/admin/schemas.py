import uuid
from datetime import date, datetime
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


class AdminPlanSummary(BaseModel):
    id: uuid.UUID
    title: str
    status: str
    participant_name: str
    participant_email: str
    coach_name: str | None
    created_by_name: str
    start_date: date | None
    end_date: date | None
    activity_count: int
    created_at: datetime


class AdminPlanPage(BaseModel):
    items: list[AdminPlanSummary]
    total: int
    page: int
    page_size: int


class AdminPlanActivity(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    unit: str
    status: str


class AdminPlanDetail(AdminPlanSummary):
    description: str | None
    participant_user_id: uuid.UUID
    coach_user_id: uuid.UUID | None
    created_by_user_id: uuid.UUID
    activities: list[AdminPlanActivity]


class AdminPlanStatusUpdate(BaseModel):
    status: Literal["active", "paused", "completed", "archived"]
