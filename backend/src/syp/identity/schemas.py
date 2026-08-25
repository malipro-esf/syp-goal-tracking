import uuid
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegistrationRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=2, max_length=100)
    timezone: str = Field(default="UTC", min_length=1, max_length=100)
    preferred_language: Literal[
        "en", "fa", "tr", "ar", "de", "ja", "zh-CN", "es", "fr", "pt-BR", "hi", "ko"
    ] = "en"
    account_type: Literal["participant", "coach"] = "participant"

    @field_validator("display_name")
    @classmethod
    def normalize_display_name(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if len(normalized) < 2:
            raise ValueError("Display name must contain at least two characters.")
        return normalized

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exception:
            raise ValueError("Timezone must be a valid IANA timezone name.") from exception
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    display_name: str
    bio: str | None
    timezone: str
    preferred_language: Literal[
        "en", "fa", "tr", "ar", "de", "ja", "zh-CN", "es", "fr", "pt-BR", "hi", "ko"
    ]
    roles: list[str]


class ProfileUpdate(BaseModel):
    display_name: str = Field(min_length=2, max_length=100)
    bio: str | None = Field(default=None, max_length=500)
    timezone: str = Field(min_length=1, max_length=100)
    preferred_language: Literal[
        "en", "fa", "tr", "ar", "de", "ja", "zh-CN", "es", "fr", "pt-BR", "hi", "ko"
    ]

    @field_validator("display_name")
    @classmethod
    def normalize_profile_display_name(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if len(normalized) < 2:
            raise ValueError("Display name must contain at least two characters.")
        return normalized

    @field_validator("timezone")
    @classmethod
    def validate_profile_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exception:
            raise ValueError("Timezone must be a valid IANA timezone name.") from exception
        return value

    @field_validator("bio")
    @classmethod
    def normalize_bio(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
