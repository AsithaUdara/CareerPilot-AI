from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] in {"ok", "degraded"}
    assert "database" in payload
    assert "architecture" in payload


def test_upload_analyze_async_pipeline(tmp_path: Path) -> None:
    resume = tmp_path / "resume.txt"
    resume.write_text(
        "Python FastAPI SQL Git React internship project testing",
        encoding="utf-8",
    )
    with resume.open("rb") as resume_file:
        upload_response = client.post(
            "/resume/upload",
            files={"file": ("resume.txt", resume_file, "text/plain")},
        )
    assert upload_response.status_code == 200
    candidate_id = upload_response.json()["candidate_id"]

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

    list_response = client.get(f"/candidates/{candidate_id}/reports")
    assert list_response.status_code == 200
    assert any(item["report_id"] == job["report_id"] for item in list_response.json())
