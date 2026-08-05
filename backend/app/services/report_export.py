from __future__ import annotations

from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from app.schemas import CareerReadinessReport


def _line_items(report: CareerReadinessReport) -> list[str]:
    lines: list[str] = [
        "CareerPilot AI - Career Readiness Report",
        "",
        f"Candidate: {report.candidate_id}",
        f"Target role: {report.target_role}",
        f"Seniority: {report.seniority_level}",
        f"Readiness score: {report.readiness_score if report.readiness_score is not None else 'n/a'}",
        f"Job source: {report.job_source}",
        "",
        "Top Skills:",
    ]
    lines.extend([f"- {s}" for s in report.profile.skills[:10]] or ["- None"])
    lines.extend(["", "Top Gaps:"])
    gap_agent = next((a for a in report.agent_outputs if a.name == "SkillGapAgent"), None)
    lines.extend([f"- {g}" for g in (gap_agent.gaps[:8] if gap_agent else [])] or ["- None"])
    lines.extend(["", "7-Day Hiring Sprint:"])
    lines.extend([f"- {d}" for d in report.seven_day_plan])
    lines.extend(["", "Decision Note:"])
    lines.append(report.explainability.get("decision_note", ""))
    return lines


def render_report_pdf(report: CareerReadinessReport) -> bytes:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    x = 40
    y = height - 40
    c.setFont("Helvetica", 11)

    for line in _line_items(report):
        if y < 40:
            c.showPage()
            c.setFont("Helvetica", 11)
            y = height - 40
        c.drawString(x, y, line[:140])
        y -= 16

    c.save()
    return buffer.getvalue()
