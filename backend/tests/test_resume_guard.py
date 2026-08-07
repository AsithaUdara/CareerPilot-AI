from pathlib import Path

from app.services.resume_parser import assess_resume_document, read_resume_text


def test_accepts_typical_resume_text() -> None:
    text = """
Jane Student
jane@example.com | +94 77 123 4567
linkedin.com/in/janestudent

Education
BSc Computer Science, University of Moratuwa

Experience
Intern Software Engineer at Campus Lab — built REST APIs

Projects
Career Tracker — FastAPI + React

Skills
Python, FastAPI, SQL, Git, React
""".strip()
    ok, reason = assess_resume_document(text, "Jane-Student-CV.pdf")
    assert ok is True
    assert reason == "ok"


def test_rejects_economics_assignment_pdf() -> None:
    path = (
        Path(__file__).resolve().parents[2]
        / "docs"
        / "Topic1_Regional_Economic_Integrations.pdf"
    )
    assert path.exists(), "fixture PDF should live under docs/"
    text = read_resume_text(path)
    ok, reason = assess_resume_document(text, path.name)
    assert ok is False
    assert "resume" in reason.lower() or "cv" in reason.lower()


def test_rejects_empty_text() -> None:
    ok, reason = assess_resume_document("hi", "notes.txt")
    assert ok is False
    assert "readable text" in reason.lower()
