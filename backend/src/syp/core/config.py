from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


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

    @property
    def secure_cookies(self) -> bool:
        return self.environment in {"staging", "production"}


@lru_cache
def get_settings() -> Settings:
    """Build settings once per process so every request sees the same configuration."""

    return Settings()
