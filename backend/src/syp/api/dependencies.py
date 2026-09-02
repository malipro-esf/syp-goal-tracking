from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from syp.core.config import Settings, get_settings
from syp.core.database import get_db_session
from syp.core.exceptions import ApplicationError
from syp.identity.models import Role, User, UserRole
from syp.identity.security import decode_access_token

DatabaseSession = Annotated[Session, Depends(get_db_session)]
AppSettings = Annotated[Settings, Depends(get_settings)]
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    session: DatabaseSession,
    settings: AppSettings,
) -> User:
    user_id = (
        decode_access_token(credentials.credentials, settings)
        if credentials is not None and credentials.scheme.lower() == "bearer"
        else None
    )
    user = session.get(User, user_id) if user_id is not None else None
    if user is None or user.status != "active":
        raise ApplicationError(
            code="authentication_required",
            message="A valid access token is required.",
            status_code=401,
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_current_admin(current_user: CurrentUser, session: DatabaseSession) -> User:
    is_admin = session.scalar(
        select(UserRole.user_id)
        .join(Role)
        .where(UserRole.user_id == current_user.id, Role.code == "admin")
    )
    if is_admin is None:
        raise ApplicationError(
            code="admin_required", message="Administrator access is required.", status_code=403
        )
    return current_user


CurrentAdmin = Annotated[User, Depends(get_current_admin)]
