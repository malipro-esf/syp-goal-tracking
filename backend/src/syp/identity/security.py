import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta

import jwt
from jwt import InvalidTokenError
from pwdlib import PasswordHash

from syp.core.config import Settings

password_hash = PasswordHash.recommended()
DUMMY_PASSWORD_HASH = password_hash.hash("constant-dummy-password-value")


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, encoded_hash: str) -> bool:
    return password_hash.verify(password, encoded_hash)


def create_access_token(user_id: uuid.UUID, settings: Settings) -> str:
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": str(user_id),
            "type": "access",
            "iat": now,
            "exp": now + timedelta(minutes=settings.access_token_minutes),
            "iss": settings.auth_issuer,
            "aud": settings.auth_audience,
            "jti": str(uuid.uuid4()),
        },
        settings.auth_secret_key,
        algorithm="HS256",
    )


def decode_access_token(token: str, settings: Settings) -> uuid.UUID | None:
    try:
        payload = jwt.decode(
            token,
            settings.auth_secret_key,
            algorithms=["HS256"],
            audience=settings.auth_audience,
            issuer=settings.auth_issuer,
            options={"require": ["sub", "type", "iat", "exp", "iss", "aud", "jti"]},
        )
        if payload["type"] != "access":
            return None
        return uuid.UUID(payload["sub"])
    except (InvalidTokenError, ValueError, KeyError):
        return None


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
