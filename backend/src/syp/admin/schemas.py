import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


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


class AdminOperationalAlerts(BaseModel):
    expired_active_plans: int
    disabled_users_with_active_plans: int
    stale_pending_invitations: int
    stale_after_days: int


class AdminAssignmentSummary(BaseModel):
    id: uuid.UUID
    template_title: str
    participant_name: str
    participant_email: str
    coach_name: str
    coach_email: str
    status: str
    start_date: date
    end_date: date | None
    created_at: datetime
    responded_at: datetime | None
    pending_days: int | None
    is_stale: bool


class AdminAssignmentPage(BaseModel):
    items: list[AdminAssignmentSummary]
    total: int
    page: int
    page_size: int
    stale_after_days: int


class AdminSystemSettings(BaseModel):
    registration_enabled: bool
    stale_invitation_days: int = Field(ge=1, le=365)
    profile_photo_max_mb: int = Field(ge=1, le=10)
    automatic_plan_completion_enabled: bool


class AdminReportTotals(BaseModel):
    new_users: int
    new_plans: int
    activity_entries: int
    active_participants: int
    completed_plans: int
    accepted_invitations: int


class AdminReportTrendPoint(BaseModel):
    date: date
    users: int
    plans: int
    entries: int


class AdminReportBreakdown(BaseModel):
    label: str
    count: int


class AdminCoachPerformance(BaseModel):
    coach_id: uuid.UUID
    coach_name: str
    coach_email: str
    participants: int
    plans: int
    activity_entries: int


class AdminAnalyticsReport(BaseModel):
    start_date: date
    end_date: date
    totals: AdminReportTotals
    trend: list[AdminReportTrendPoint]
    countries: list[AdminReportBreakdown]
    roles: list[AdminReportBreakdown]
    coaches: list[AdminCoachPerformance]
