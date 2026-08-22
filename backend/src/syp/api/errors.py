from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from syp.core.exceptions import ApplicationError


def register_exception_handlers(app: FastAPI) -> None:
    """Make expected API failures follow SYP's stable error envelope."""

    @app.exception_handler(ApplicationError)
    async def handle_application_error(
        _request: Request,
        exception: ApplicationError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exception.status_code,
            content={
                "error": {
                    "code": exception.code,
                    "message": exception.message,
                    "details": None,
                }
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_error(
        _request: Request,
        exception: StarletteHTTPException,
    ) -> JSONResponse:
        message = exception.detail if isinstance(exception.detail, str) else "Request failed."
        return JSONResponse(
            status_code=exception.status_code,
            content={
                "error": {
                    "code": "http_error",
                    "message": message,
                    "details": None,
                }
            },
            headers=exception.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        _request: Request,
        exception: RequestValidationError,
    ) -> JSONResponse:
        details: list[dict[str, Any]] = []
        for error in exception.errors():
            detail = dict(error)
            if context := detail.get("ctx"):
                detail["ctx"] = {key: str(value) for key, value in context.items()}
            details.append(detail)
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "The request contains invalid data.",
                    "details": details,
                }
            },
        )
