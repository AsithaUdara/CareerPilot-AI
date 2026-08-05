from __future__ import annotations

import json

from app.schemas import CareerReadinessReport, MentorChatMessage, MentorChatResponse
from app.services.llm import invoke_text


def _report_context(report: CareerReadinessReport | None) -> str:
    if not report:
        return "No readiness report loaded yet."
    gaps = next((a.gaps for a in report.agent_outputs if a.name == "SkillGapAgent"), [])
    plan = report.seven_day_plan[:4]
    return json.dumps(
        {
            "target_role": report.target_role,
            "seniority_level": report.seniority_level,
            "readiness_score": report.readiness_score,
            "top_gaps": gaps[:5],
            "hiring_sprint_preview": plan,
            "decision_note": report.explainability.get("decision_note", ""),
            "portfolio_project": report.explainability.get("portfolio_project_suggestion", ""),
            "stack_emphasis": report.stack_emphasis,
            "github_url": report.profile.github_url,
        },
        indent=2,
    )


def mentor_reply(
    *,
    message: str,
    history: list[MentorChatMessage],
    report: CareerReadinessReport | None,
) -> MentorChatResponse:
    history_blob = "\n".join(f"{m.role}: {m.content}" for m in history[-8:])
    system = (
        "You are CareerPilot Mentor, an AI career coach for IT professionals. "
        "Be concise, actionable, and evidence-based. Prefer concrete next steps "
        "(resume bullets, GitHub artifacts, interview drills, applications). "
        "Do not invent employers, certifications, or skills not supported by context. "
        "If no report exists, ask the user to run an analysis first while still giving "
        "general IT hiring advice."
    )
    user = (
        f"Candidate report context:\n{_report_context(report)}\n\n"
        f"Recent chat:\n{history_blob or 'None'}\n\n"
        f"Latest user message:\n{message}"
    )

    reply = invoke_text(
        system=system,
        user=user,
        stub_reply=(
            "Based on your current readiness report, prioritize closing your top skill gap "
            "with a small GitHub artifact this week, then run Day 5 interview drills from "
            "your hiring sprint before applying to your best-matched roles."
        ),
    )
    suggestions = [
        "How should I rewrite my resume summary?",
        "What GitHub project should I ship this week?",
        "Give me 3 interview drills for my role.",
    ]
    if report and report.seven_day_plan:
        suggestions[0] = "Walk me through Day 1 of my hiring sprint."
    return MentorChatResponse(reply=reply, suggestions=suggestions)
