from fastapi import APIRouter, Request, Response, status

from syp.api.dependencies import AppSettings, DatabaseSession
from syp.core.exceptions import ApplicationError
from syp.identity.schemas import AuthResponse, LoginRequest, RegistrationRequest
from syp.identity.security import create_access_token
from syp.identity.service import (
    AuthResult,
    authenticate_user,
    register_user,
    revoke_refresh_token,
    rotate_refresh_token,
)

router = APIRouter(prefix="/auth", tags=["authentication"])


def _auth_response(result: AuthResult, settings: AppSettings) -> AuthResponse:
    return AuthResponse(
        access_token=create_access_token(result.user.id, settings),
        expires_in=settings.access_token_minutes * 60,
        user=result.user,
    )


def _set_refresh_cookie(response: Response, token: str, settings: AppSettings) -> None:
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=token,
        max_age=settings.refresh_token_days * 86400,
        httponly=True,
        secure=settings.secure_cookies,
        samesite="lax",
        path="/api/v1/auth",
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegistrationRequest,
    response: Response,
    session: DatabaseSession,
    settings: AppSettings,
) -> AuthResponse:
    result = register_user(session, payload, settings)
    _set_refresh_cookie(response, result.refresh_token, settings)
    return _auth_response(result, settings)


@router.post("/login", response_model=AuthResponse)
def login(
    payload: LoginRequest,
    response: Response,
    session: DatabaseSession,
    settings: AppSettings,
) -> AuthResponse:
    result = authenticate_user(session, payload, settings)
    _set_refresh_cookie(response, result.refresh_token, settings)
    return _auth_response(result, settings)


@router.post("/refresh", response_model=AuthResponse)
def refresh(
    request: Request,
    response: Response,
    session: DatabaseSession,
    settings: AppSettings,
) -> AuthResponse:
    token = request.cookies.get(settings.refresh_cookie_name)
    if token is None:
        raise ApplicationError(
            code="refresh_token_required",
            message="A refresh session is required.",
            status_code=401,
        )
    result = rotate_refresh_token(session, token, settings)
    _set_refresh_cookie(response, result.refresh_token, settings)
    return _auth_response(result, settings)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    request: Request,
    response: Response,
    session: DatabaseSession,
    settings: AppSettings,
) -> None:
    token = request.cookies.get(settings.refresh_cookie_name)
    if token is not None:
        revoke_refresh_token(session, token)
    response.delete_cookie(
        key=settings.refresh_cookie_name,
        httponly=True,
        secure=settings.secure_cookies,
        samesite="lax",
        path="/api/v1/auth",
    )
