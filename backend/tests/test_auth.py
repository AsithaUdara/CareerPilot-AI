from uuid import uuid4
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.config import get_settings
from app.db import get_session
from app.models import UserModel
from app.services.auth import create_access_token


def _make_user_token(email: str = "demo@careerpilot.test") -> tuple[str, str]:
    user_id = str(uuid4())
    with get_session() as session:
        session.add(
            UserModel(
                id=user_id,
                google_sub=f"google-{user_id}",
                email=email,
                name="Demo User",
                picture_url="",
            )
        )
    token = create_access_token(user_id, email)
    return user_id, token


def test_auth_google_upsert_and_me(client: TestClient) -> None:
    fake_claims = {
        "sub": "google-sub-123",
        "email": "asitha@example.com",
        "name": "Asitha",
        "picture": "https://example.com/a.png",
    }
    with patch("app.main.verify_google_id_token", return_value=fake_claims):
        response = client.post("/auth/google", json={"id_token": "fake-token"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["access_token"]
    assert payload["user"]["email"] == "asitha@example.com"

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {payload['access_token']}"})
    assert me.status_code == 200
    assert me.json()["name"] == "Asitha"


def test_me_candidates_ownership(client: TestClient, tmp_path) -> None:
    user_id, token = _make_user_token()
    headers = {"Authorization": f"Bearer {token}"}

    resume = tmp_path / "resume.txt"
    resume.write_text("Skills\nPython, FastAPI\nEducation\nUOM", encoding="utf-8")
    with resume.open("rb") as resume_file:
        upload = client.post(
            "/resume/upload",
            files={"file": ("resume.txt", resume_file, "text/plain")},
            headers=headers,
        )
    assert upload.status_code == 200
    candidate_id = upload.json()["candidate_id"]

    mine = client.get("/me/candidates", headers=headers)
    assert mine.status_code == 200
    rows = mine.json()
    assert any(row["candidate_id"] == candidate_id for row in rows)
    assert rows[0]["summary"]

    # Another user cannot read this profile when auth is required
    get_settings.cache_clear()
    import os

    os.environ["AUTH_DISABLED"] = "0"
    get_settings.cache_clear()
    try:
        other_id, other_token = _make_user_token("other@example.com")
        denied = client.get(
            f"/candidates/{candidate_id}/profile",
            headers={"Authorization": f"Bearer {other_token}"},
        )
        assert denied.status_code == 403
        assert other_id
    finally:
        os.environ["AUTH_DISABLED"] = "1"
        get_settings.cache_clear()


def test_analyze_requires_existing_profile(client: TestClient) -> None:
    response = client.post(
        "/analyze",
        json={
            "candidate_id": "missing-candidate",
            "target_role": "Backend Developer",
            "seniority_level": "Junior",
        },
    )
    assert response.status_code == 404
