import uuid
from typing import Literal, Self
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class RegistrationRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=2, max_length=100)
    timezone: str = Field(default="UTC", min_length=1, max_length=100)
    preferred_language: Literal[
        "en",
        "fa",
        "tr",
        "ar",
        "da",
        "de",
        "el",
        "ja",
        "zh-CN",
        "es",
        "sv",
        "fr",
        "pt-BR",
        "hi",
        "ko",
        "fi",
        "nb",
        "it",
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
        "en",
        "fa",
        "tr",
        "ar",
        "da",
        "de",
        "el",
        "ja",
        "zh-CN",
        "es",
        "sv",
        "fr",
        "pt-BR",
        "hi",
        "ko",
        "fi",
        "nb",
        "it",
    ]
    country_code: str | None
    gender: Literal["man", "woman"] | None
    gender_theme_enabled: bool
    roles: list[str]


class ProfileUpdate(BaseModel):
    display_name: str = Field(min_length=2, max_length=100)
    bio: str | None = Field(default=None, max_length=500)
    timezone: str = Field(min_length=1, max_length=100)
    preferred_language: Literal[
        "en",
        "fa",
        "tr",
        "ar",
        "da",
        "de",
        "el",
        "ja",
        "zh-CN",
        "es",
        "sv",
        "fr",
        "pt-BR",
        "hi",
        "ko",
        "fi",
        "nb",
        "it",
    ]
    country_code: str | None = Field(default=None, min_length=2, max_length=2)
    gender: Literal["man", "woman"] | None = None
    gender_theme_enabled: bool = False

    @model_validator(mode="after")
    def validate_gender_theme(self) -> Self:
        if self.gender_theme_enabled and self.gender is None:
            raise ValueError("A gender selection is required to enable gender-based colors.")
        return self

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

    @field_validator("country_code")
    @classmethod
    def normalize_country_code(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().upper()
        if not normalized.isalpha() or len(normalized) != 2:
            raise ValueError("Country must use a two-letter ISO country code.")
        return normalized


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
