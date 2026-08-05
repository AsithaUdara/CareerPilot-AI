from __future__ import annotations

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
    email = str(claims.get("email") or "")
    if not google_sub or not email:
        raise HTTPException(status_code=400, detail="Google token missing subject or email.")

    existing = session.query(UserModel).filter(UserModel.google_sub == google_sub).one_or_none()
    if existing:
        existing.email = email
        existing.name = str(claims.get("name") or existing.name or email)
        existing.picture_url = str(claims.get("picture") or existing.picture_url or "")
        session.flush()
        return existing

    user = UserModel(
        id=str(uuid4()),
        google_sub=google_sub,
        email=email,
        name=str(claims.get("name") or email),
        picture_url=str(claims.get("picture") or ""),
    )
    session.add(user)
    session.flush()
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
        google_sub=user.google_sub,
    )


def get_optional_user(
    authorization: str | None = Header(default=None),
) -> AuthUser | None:
    settings = get_settings()
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
        raise HTTPException(status_code=401, detail="Sign in with Google to continue.")
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
        # Unowned legacy row: claim for the signed-in user on first access.
        model.user_id = user.id
        session.flush()
