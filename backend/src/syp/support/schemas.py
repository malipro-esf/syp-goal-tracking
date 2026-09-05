import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

SupportCategory = Literal["account", "plans", "coaching", "technical", "feedback", "other"]
SupportStatus = Literal["open", "in_progress", "resolved", "closed"]


class SupportRequestCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    category: SupportCategory
    subject: str = Field(min_length=3, max_length=160)
    message: str = Field(min_length=10, max_length=5000)

    @field_validator("name", "subject", "message")
    @classmethod
    def normalize_text(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 2:
            raise ValueError("Text must not be blank.")
        return normalized


class SupportRequestResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    category: str
    subject: str
    message: str
    status: str
    admin_note: str | None
    viewed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class SupportRequestPage(BaseModel):
    items: list[SupportRequestResponse]
    total: int
    page: int
    page_size: int


class SupportRequestUpdate(BaseModel):
    status: SupportStatus
    admin_note: str | None = Field(default=None, max_length=5000)


class UnreadSupportRequestCount(BaseModel):
    unread: int
