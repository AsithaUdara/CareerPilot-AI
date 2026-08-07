from __future__ import annotations

import hashlib
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

import jwt
from fastapi import Header, HTTPException
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_session
from app.models import UserModel

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class AuthUser:
    def __init__(
        self,
        *,
        id: str,
        email: str,
        name: str,
        picture_url: str = "",
        google_sub: str = "",
    ) -> None:
        self.id = id
        self.email = email
        self.name = name
        self.picture_url = picture_url
        self.google_sub = google_sub


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored: str | None) -> bool:
    if not stored or "$" not in stored:
        return False
    salt, digest = stored.split("$", 1)
    check = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000).hex()
    return secrets.compare_digest(check, digest)


def normalize_email(email: str) -> str:
    return email.strip().lower()


def validate_email(email: str) -> str:
    normalized = normalize_email(email)
    if not _EMAIL_RE.match(normalized):
        raise HTTPException(status_code=400, detail="Enter a valid email address.")
    return normalized


def create_access_token(user_id: str, email: str) -> str:
    settings = get_settings()
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expire_hours),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_access_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired session. Sign in again.") from exc


def verify_google_id_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    if not settings.google_oauth_client_id:
        raise HTTPException(
            status_code=503,
            detail="Google Sign-In is not configured (GOOGLE_OAUTH_CLIENT_ID missing).",
        )
    try:
        return id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            settings.google_oauth_client_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid Google ID token.") from exc


def upsert_google_user(session: Session, claims: dict[str, Any]) -> UserModel:
    google_sub = str(claims.get("sub") or "")
    email = validate_email(str(claims.get("email") or ""))
    if not google_sub:
        raise HTTPException(status_code=400, detail="Google token missing subject.")

    existing = session.query(UserModel).filter(UserModel.google_sub == google_sub).one_or_none()
    if existing:
        existing.email = email
        existing.name = str(claims.get("name") or existing.name or email)
        existing.picture_url = str(claims.get("picture") or existing.picture_url or "")
        session.flush()
        return existing

    by_email = session.query(UserModel).filter(UserModel.email == email).one_or_none()
    if by_email:
        by_email.google_sub = google_sub
        by_email.name = str(claims.get("name") or by_email.name or email)
        by_email.picture_url = str(claims.get("picture") or by_email.picture_url or "")
        session.flush()
        return by_email

    user = UserModel(
        id=str(uuid4()),
        google_sub=google_sub,
        email=email,
        name=str(claims.get("name") or email),
        picture_url=str(claims.get("picture") or ""),
        password_hash=None,
    )
    session.add(user)
    session.flush()
    return user


def register_email_user(session: Session, *, email: str, password: str, name: str) -> UserModel:
    email_norm = validate_email(email)
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    existing = session.query(UserModel).filter(UserModel.email == email_norm).one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists. Sign in instead.")
    display = (name or "").strip() or email_norm.split("@")[0]
    user = UserModel(
        id=str(uuid4()),
        google_sub=None,
        email=email_norm,
        name=display,
        picture_url="",
        password_hash=hash_password(password),
    )
    session.add(user)
    session.flush()
    return user


def authenticate_email_user(session: Session, *, email: str, password: str) -> UserModel:
    email_norm = validate_email(email)
    user = session.query(UserModel).filter(UserModel.email == email_norm).one_or_none()
    if not user or not verify_password(password, getattr(user, "password_hash", None)):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return user


def _bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1].strip() or None


def get_user_from_token(session: Session, token: str) -> AuthUser:
    payload = decode_access_token(token)
    user_id = str(payload.get("sub") or "")
    user = session.get(UserModel, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found. Sign in again.")
    return AuthUser(
        id=user.id,
        email=user.email,
        name=user.name,
        picture_url=user.picture_url or "",
        google_sub=user.google_sub or "",
    )


def get_optional_user(
    authorization: str | None = Header(default=None),
) -> AuthUser | None:
    token = _bearer_token(authorization)
    if not token:
        return None
    with get_session() as session:
        return get_user_from_token(session, token)


def require_user(
    authorization: str | None = Header(default=None),
) -> AuthUser | None:
    """Require JWT when AUTH_DISABLED is false; otherwise return optional user."""
    settings = get_settings()
    token = _bearer_token(authorization)
    if settings.auth_required and not token:
        raise HTTPException(status_code=401, detail="Sign in to continue.")
    if not token:
        return None
    with get_session() as session:
        return get_user_from_token(session, token)


def assert_candidate_access(
    session: Session,
    candidate_id: str,
    user: AuthUser | None,
) -> None:
    """Enforce ownership when auth is on and the profile is owned."""
    from app.models import CandidateProfileModel

    settings = get_settings()
    model = session.get(CandidateProfileModel, candidate_id)
    if not model:
        raise HTTPException(status_code=404, detail="Candidate profile not found.")
    if not settings.auth_required:
        return
    owner = getattr(model, "user_id", None)
    if owner and (not user or owner != user.id):
        raise HTTPException(status_code=403, detail="This candidate profile is not yours.")
    if not owner and user:
        model.user_id = user.id
        session.flush()


def user_to_response(user: UserModel) -> dict[str, str]:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "picture_url": user.picture_url or "",
    }
