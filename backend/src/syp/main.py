import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from syp.api.errors import register_exception_handlers
from syp.api.middleware import request_logging_middleware
from syp.api.v1.router import api_router
from syp.core.config import get_settings
from syp.core.database import SessionLocal
from syp.core.logging import configure_logging
from syp.notifications.reminders import run_reminder_scheduler
from syp.plans.expiration import run_plan_completion_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    schedulers: list[asyncio.Task[None]] = []
    if settings.automatic_plan_completion_enabled:
        schedulers.append(
            asyncio.create_task(
                run_plan_completion_scheduler(
                    SessionLocal,
                    settings.automatic_plan_completion_interval_seconds,
                )
            )
        )
    if settings.automated_reminders_enabled:
        schedulers.append(
            asyncio.create_task(
                run_reminder_scheduler(
                    SessionLocal,
                    settings.automated_reminders_interval_seconds,
                    plan_ending_days=settings.plan_ending_reminder_days,
                    stale_invitation_days=settings.stale_invitation_reminder_days,
                )
            )
        )
    yield
    for scheduler in schedulers:
        await stop_scheduler(scheduler)


def create_app() -> FastAPI:
    """Application factory used by the server and automated tests."""

    settings = get_settings()
    configure_logging(settings.log_level)
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        docs_url=f"{settings.api_v1_prefix}/docs",
        openapi_url=f"{settings.api_v1_prefix}/openapi.json",
        lifespan=lifespan,
    )
    register_exception_handlers(app)
    app.middleware("http")(request_logging_middleware)
    app.include_router(api_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
