import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from syp.core.config import Settings
from syp.core.exceptions import ApplicationError
from syp.identity.models import RefreshSession, Role, User, UserRole
from syp.identity.schemas import LoginRequest, ProfileUpdate, RegistrationRequest, UserResponse
from syp.identity.security import (
    DUMMY_PASSWORD_HASH,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)


@dataclass(frozen=True)
class AuthResult:
    user: UserResponse
    refresh_token: str


def normalize_email(email: str) -> str:
    return email.strip().casefold()


def build_user_response(session: Session, user: User) -> UserResponse:
    roles = session.scalars(
        select(Role.code)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user.id)
        .order_by(Role.code)
    ).all()
    return UserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        bio=user.bio,
        timezone=user.timezone,
        preferred_language=user.preferred_language,
        country_code=user.country_code,
        gender=user.gender,
        gender_theme_enabled=user.gender_theme_enabled,
        roles=list(roles),
    )


def update_profile(session: Session, user: User, request: ProfileUpdate) -> UserResponse:
    user.display_name = request.display_name
    user.bio = request.bio
    user.timezone = request.timezone
    user.preferred_language = request.preferred_language
    user.country_code = request.country_code
    user.gender = request.gender
    user.gender_theme_enabled = request.gender_theme_enabled
    session.commit()
    session.refresh(user)
    return build_user_response(session, user)


def _new_refresh_session(
    session: Session,
    *,
    user_id: uuid.UUID,
    settings: Settings,
    family_id: uuid.UUID | None = None,
) -> tuple[RefreshSession, str]:
    token = generate_refresh_token()
    refresh_session = RefreshSession(
        user_id=user_id,
        family_id=family_id or uuid.uuid4(),
        token_hash=hash_refresh_token(token),
        expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_days),
    )
    session.add(refresh_session)
    session.flush()
    return refresh_session, token


def register_user(session: Session, request: RegistrationRequest, settings: Settings) -> AuthResult:
    normalized_email = normalize_email(str(request.email))
    if session.scalar(select(User.id).where(User.normalized_email == normalized_email)):
        raise ApplicationError(
            code="email_already_registered",
            message="An account with this email already exists.",
            status_code=409,
        )
    role = session.scalar(select(Role).where(Role.code == request.account_type))
    if role is None:
        raise RuntimeError(f"Required {request.account_type} role is missing.")
    user = User(
        email=str(request.email).strip(),
        normalized_email=normalized_email,
        display_name=request.display_name,
        timezone=request.timezone,
        preferred_language=request.preferred_language,
        password_hash=hash_password(request.password),
    )
    session.add(user)
    session.flush()
    session.add(UserRole(user_id=user.id, role_id=role.id))
    _, refresh_token = _new_refresh_session(session, user_id=user.id, settings=settings)
    try:
        session.commit()
    except IntegrityError as exception:
        session.rollback()
        raise ApplicationError(
            code="email_already_registered",
            message="An account with this email already exists.",
            status_code=409,
        ) from exception
    return AuthResult(build_user_response(session, user), refresh_token)


def authenticate_user(session: Session, request: LoginRequest, settings: Settings) -> AuthResult:
    user = session.scalar(
        select(User).where(User.normalized_email == normalize_email(str(request.email)))
    )
    encoded_hash = user.password_hash if user else DUMMY_PASSWORD_HASH
    valid_password = verify_password(request.password, encoded_hash)
    if user is None or not valid_password or user.status != "active":
        raise ApplicationError(
            code="invalid_credentials",
            message="The email or password is incorrect.",
            status_code=401,
        )
    _, refresh_token = _new_refresh_session(session, user_id=user.id, settings=settings)
    session.commit()
    return AuthResult(build_user_response(session, user), refresh_token)


def rotate_refresh_token(session: Session, token: str, settings: Settings) -> AuthResult:
    now = datetime.now(UTC)
    existing = session.scalar(
        select(RefreshSession)
        .where(RefreshSession.token_hash == hash_refresh_token(token))
        .with_for_update()
    )
    if existing is None:
        raise _invalid_refresh_token()
    if existing.revoked_at is not None:
        session.execute(
            update(RefreshSession)
            .where(RefreshSession.family_id == existing.family_id)
            .where(RefreshSession.revoked_at.is_(None))
            .values(revoked_at=now)
        )
        session.commit()
        raise _invalid_refresh_token()
    if existing.expires_at <= now:
        existing.revoked_at = now
        session.commit()
        raise _invalid_refresh_token()
    user = session.get(User, existing.user_id)
    if user is None or user.status != "active":
        existing.revoked_at = now
        session.commit()
        raise _invalid_refresh_token()
    replacement, replacement_token = _new_refresh_session(
        session, user_id=user.id, settings=settings, family_id=existing.family_id
    )
    existing.revoked_at = now
    existing.replaced_by_session_id = replacement.id
    session.commit()
    return AuthResult(build_user_response(session, user), replacement_token)


def revoke_refresh_token(session: Session, token: str) -> None:
    existing = session.scalar(
        select(RefreshSession).where(RefreshSession.token_hash == hash_refresh_token(token))
    )
    if existing is not None and existing.revoked_at is None:
        existing.revoked_at = datetime.now(UTC)
        session.commit()


def _invalid_refresh_token() -> ApplicationError:
    return ApplicationError(
        code="invalid_refresh_token",
        message="The refresh session is invalid or has expired.",
        status_code=401,
    )
