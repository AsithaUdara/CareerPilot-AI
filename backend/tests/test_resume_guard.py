from app.services.resume_parser import assess_resume_document


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


def test_rejects_economics_assignment_text() -> None:
    # Inline fixture — avoid depending on a large untracked PDF in CI.
    text = """
Topic 1: Regional Economic Integrations
Assignment submission — Department of Economics

Abstract
This paper examines the formation of regional economic integrations and their impact
on trade creation versus trade diversion across developing economies. Using secondary
data from WTO and regional blocs, we discuss ASEAN, SAARC, and the European Union.

Literature review
Balassa (1961) defines stages of economic integration from free trade areas to
political unions. Subsequent empirical work evaluates tariff schedules and gravity
models of bilateral trade.

Methodology
We synthesise published macroeconomic indicators and compare tariff liberalisation
outcomes. No personal employment history or technical skills inventory is included.

Conclusion
Regional economic integrations remain contested instruments of development policy.
""".strip()
    ok, reason = assess_resume_document(text, "Topic1_Regional_Economic_Integrations.pdf")
    assert ok is False
    assert "resume" in reason.lower() or "cv" in reason.lower()


def test_rejects_empty_text() -> None:
    ok, reason = assess_resume_document("hi", "notes.txt")
    assert ok is False
    assert "readable text" in reason.lower()
