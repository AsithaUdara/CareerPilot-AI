from __future__ import annotations

import json

from sqlalchemy.orm import Session

from app.repositories.report_repository import list_reports_for_candidate, get_report
from app.schemas import AgentOutput, CareerReadinessReport


def load_prior_memory(session: Session, candidate_id: str, target_role: str) -> str:
    """
    Build a compact memory string from the candidate's most recent prior report(s).
    Used by the orchestrator so re-analysis is context-aware.
    """
    summaries = list_reports_for_candidate(session, candidate_id)
    if not summaries:
        return ""

    memories: list[str] = []
    for item in summaries[:3]:
        report = get_report(session, item["report_id"])
        if not report:
            continue
        gap_agent = _find_agent(report, "SkillGapAgent")
        plan = report.seven_day_plan[:3]
        memories.append(
            json.dumps(
                {
                    "report_id": report.report_id,
                    "target_role": report.target_role,
                    "readiness_score": report.readiness_score,
                    "gaps": (gap_agent.gaps if gap_agent else [])[:5],
                    "plan_head": plan,
                    "same_role": report.target_role.lower() == target_role.lower(),
                }
            )
        )
    if not memories:
        return ""
    return "Prior analyses for this candidate:\n" + "\n".join(memories)


def memory_delta_note(prior_memory: str, current: CareerReadinessReport) -> str:
    if not prior_memory:
        return "First analysis for this candidate — no prior memory."
    gap_agent = _find_agent(current, "SkillGapAgent")
    gaps = ", ".join((gap_agent.gaps if gap_agent else [])[:4]) or "none listed"
    return (
        f"Memory-aware run: compared against prior reports. "
        f"Current priority gaps: {gaps}. "
        f"Readiness score now {current.readiness_score}."
    )


def _find_agent(report: CareerReadinessReport, name: str) -> AgentOutput | None:
    for agent in report.agent_outputs:
        if agent.name == name:
            return agent
    return None
