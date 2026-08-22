from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import text

from syp.api.dependencies import DatabaseSession
from syp.core.config import get_settings

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    environment: str


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Report that the API process is alive and able to serve requests."""

    settings = get_settings()
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        environment=settings.environment,
    )


@router.get("/ready", response_model=HealthResponse)
def get_readiness(session: DatabaseSession) -> HealthResponse:
    """Report readiness only after PostgreSQL accepts a simple query."""

    session.execute(text("SELECT 1"))
    settings = get_settings()
    return HealthResponse(status="ok", service=settings.app_name, environment=settings.environment)
