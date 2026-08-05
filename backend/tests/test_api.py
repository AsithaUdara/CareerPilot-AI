from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] in {"ok", "degraded"}
    assert "database" in payload
    assert "architecture" in payload
    assert payload["gemini_configured"] is True  # stub mode
    assert "adzuna_configured" in payload


def test_upload_analyze_async_pipeline(client: TestClient, tmp_path: Path) -> None:
    resume = tmp_path / "resume.txt"
    resume.write_text(
        """
Jane Student
Education
BSc Computer Science, University of Moratuwa
Experience
Intern Software Engineer at Campus Lab — built REST APIs
Projects
Career Tracker — FastAPI + React job application tracker with Docker
Skills
Python, FastAPI, SQL, Git, React, testing
        """.strip(),
        encoding="utf-8",
    )
    with resume.open("rb") as resume_file:
        upload_response = client.post(
            "/resume/upload",
            files={"file": ("resume.txt", resume_file, "text/plain")},
        )
    assert upload_response.status_code == 200
    upload_payload = upload_response.json()
    candidate_id = upload_payload["candidate_id"]
    assert upload_payload["profile"]["skills"]
    assert upload_payload["profile"]["summary"]

    profile_response = client.get(f"/candidates/{candidate_id}/profile")
    assert profile_response.status_code == 200
    assert profile_response.json()["candidate_id"] == candidate_id

    analyze_response = client.post(
        "/analyze",
        json={"candidate_id": candidate_id, "target_role": "Backend Developer"},
    )
    assert analyze_response.status_code == 200
    job_id = analyze_response.json()["job_id"]
    assert analyze_response.json()["status"] == "queued"

    job_response = client.get(f"/jobs/{job_id}")
    assert job_response.status_code == 200
    job = job_response.json()
    assert job["status"] == "completed"
    assert job["progress"] == 100
    assert job["report_id"]

    report_response = client.get(f"/reports/{job['report_id']}")
    assert report_response.status_code == 200
    payload = report_response.json()
    assert payload["target_role"] == "Backend Developer"
    assert len(payload["agent_outputs"]) == 6
    assert len(payload["seven_day_plan"]) == 7
    assert payload["matched_jobs"], "expected curated real jobs in stub mode"
    assert payload["job_source"] in {"curated", "live", "live+curated"}
    assert payload["readiness_score"] is not None
    assert all(agent.get("evidence") for agent in payload["agent_outputs"])
    assert "memory_note" in payload["explainability"]

    # Re-analyze to exercise memory injection
    analyze_again = client.post(
        "/analyze",
        json={"candidate_id": candidate_id, "target_role": "Backend Developer"},
    )
    assert analyze_again.status_code == 200
    job2 = client.get(f"/jobs/{analyze_again.json()['job_id']}").json()
    assert job2["status"] == "completed"
    report2 = client.get(f"/reports/{job2['report_id']}").json()
    assert "Memory-aware" in report2["explainability"]["memory_note"] or "prior" in report2[
        "explainability"
    ]["memory_note"].lower()

    list_response = client.get(f"/candidates/{candidate_id}/reports")
    assert list_response.status_code == 200
    assert len(list_response.json()) >= 2
