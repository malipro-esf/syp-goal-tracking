from fastapi import FastAPI

from syp.api.errors import register_exception_handlers
from syp.api.v1.router import api_router
from syp.core.config import get_settings


def create_app() -> FastAPI:
    """Application factory used by the server and automated tests."""

    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        docs_url=f"{settings.api_v1_prefix}/docs",
        openapi_url=f"{settings.api_v1_prefix}/openapi.json",
    )
    register_exception_handlers(app)
    app.include_router(api_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
