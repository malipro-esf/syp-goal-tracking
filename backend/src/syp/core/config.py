from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

UNSAFE_AUTH_SECRETS = {
    "local-development-secret-key-change-before-production",
    "replace-this-with-at-least-32-random-characters",
}


class Settings(BaseSettings):
    """Validated application configuration loaded from the environment."""

    model_config = SettingsConfigDict(
        env_prefix="SYP_",
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "SYP API"
    environment: Literal["development", "test", "staging", "production"] = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = Field(
        default="postgresql+psycopg://syp:local-development-only@localhost:55432/syp",
        repr=False,
    )
    auth_secret_key: str = Field(
        default="local-development-secret-key-change-before-production",
        min_length=32,
        repr=False,
    )
    access_token_minutes: int = Field(default=10, ge=1, le=60)
    refresh_token_days: int = Field(default=30, ge=1, le=90)
    auth_issuer: str = "syp-api"
    auth_audience: str = "syp-web"
    refresh_cookie_name: str = "syp_refresh_token"
    openai_api_key: str | None = Field(default=None, repr=False)
    ai_coach_enabled: bool = False
    ai_coach_model: str = "gpt-5-mini"
    ai_coach_daily_run_limit: int = Field(default=20, ge=1, le=100)
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    automatic_plan_completion_enabled: bool = True
    automatic_plan_completion_interval_seconds: int = Field(default=300, ge=30, le=86400)

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        if self.environment == "production" and self.auth_secret_key in UNSAFE_AUTH_SECRETS:
            raise ValueError("Production requires a private SYP_AUTH_SECRET_KEY.")
        return self

    @property
    def secure_cookies(self) -> bool:
        return self.environment in {"staging", "production"}


@lru_cache
def get_settings() -> Settings:
    """Build settings once per process so every request sees the same configuration."""

    return Settings()
