from __future__ import annotations

from collections import Counter

from sqlalchemy.orm import Session

from app.models import AnalysisReportModel, CandidateProfileModel
from app.schemas import (
    CareerAnalyticsResponse,
    CareerReadinessReport,
    GapFrequency,
    ReadinessPoint,
    RoleCount,
    WorkspaceInsightsResponse,
)


def _parse_report(row: AnalysisReportModel) -> CareerReadinessReport | None:
    try:
        return CareerReadinessReport.model_validate_json(row.report_json)
    except Exception:
        return None


def _short_gap(gap: str, limit: int = 72) -> str:
    text = " ".join((gap or "").split())
    if len(text) <= limit:
        return text
    return f"{text[: limit - 1].rstrip()}…"


def _build_insight(
    *,
    report_count: int,
    latest_score: int | None,
    latest_role: str,
    score_delta: int | None,
    closed_gaps: list[str],
    next_focus: list[str],
) -> str:
    if report_count == 0:
        return "No analyses yet. Run your first report to start tracking readiness over time."
    if report_count == 1:
        focus = next_focus[0] if next_focus else "your top skill gap"
        return (
            f"Baseline set at {latest_score if latest_score is not None else 'n/a'} "
            f"for {latest_role or 'your target role'}. "
            f"Close “{_short_gap(focus, 48)}”, then re-analyse to measure progress."
        )
    if score_delta is not None and score_delta > 0:
        closed = f" Closed {len(closed_gaps)} gap{'s' if len(closed_gaps) != 1 else ''}." if closed_gaps else ""
        return f"Readiness improved by +{score_delta} since your first analysis.{closed}"
    if score_delta is not None and score_delta < 0:
        return (
            f"Readiness dropped by {score_delta} vs your first analysis. "
            "Focus on recurring gaps before the next run."
        )
    return (
        f"Score is steady across {report_count} analyses. "
        "Keep closing persistent gaps to push readiness higher."
    )


def candidate_career_analytics(session: Session, candidate_id: str) -> CareerAnalyticsResponse:
    rows = (
        session.query(AnalysisReportModel)
        .filter(AnalysisReportModel.candidate_id == candidate_id)
        .order_by(AnalysisReportModel.created_at.asc())
        .all()
    )
    timeline: list[ReadinessPoint] = []
    gap_counter: Counter[str] = Counter()
    role_counter: Counter[str] = Counter()
    first_score: int | None = None
    last_score: int | None = None
    first_gaps: set[str] = set()
    last_gaps: set[str] = set()
    scores: list[int] = []
    latest_role = ""
    skills_tracked = 0
    matched_jobs = 0
    next_focus: list[str] = []

    for index, row in enumerate(rows):
        report = _parse_report(row)
        if not report:
            continue
        score = report.readiness_score if report.readiness_score is not None else 0
        gaps = next((a.gaps for a in report.agent_outputs if a.name == "SkillGapAgent"), []) or []
        timeline.append(
            ReadinessPoint(
                report_id=row.report_id,
                target_role=row.target_role,
                readiness_score=score,
                created_at=row.created_at.isoformat() if row.created_at else None,
                top_gaps=[_short_gap(g, 64) for g in gaps[:4]],
            )
        )
        gap_counter.update(gaps)
        role_counter[row.target_role] += 1
        scores.append(score)
        if index == 0:
            first_score = score
            first_gaps = set(gaps)
        last_score = score
        last_gaps = set(gaps)
        latest_role = row.target_role or report.target_role
        skills_tracked = len(report.profile.skills or [])
        matched_jobs = len(report.matched_jobs or [])
        next_focus = gaps[:3]

    score_delta = None
    if first_score is not None and last_score is not None and len(timeline) >= 2:
        score_delta = last_score - first_score

    closed = sorted(first_gaps - last_gaps) if len(timeline) >= 2 else []
    new = sorted(last_gaps - first_gaps) if len(timeline) >= 2 else []

    gap_frequency: list[GapFrequency] = []
    for gap, count in gap_counter.most_common(8):
        if len(timeline) < 2:
            status = "current"
        elif gap in first_gaps and gap in last_gaps:
            status = "persistent"
        elif gap in last_gaps and gap not in first_gaps:
            status = "new"
        elif gap in first_gaps and gap not in last_gaps:
            status = "improving"
        else:
            status = "current"
        gap_frequency.append(
            GapFrequency(gap=_short_gap(gap, 80), count=count, status=status)
        )

    average = round(sum(scores) / len(scores), 1) if scores else None
    best = max(scores) if scores else None

    return CareerAnalyticsResponse(
        candidate_id=candidate_id,
        report_count=len(timeline),
        timeline=timeline,
        recurring_gaps=[item.gap for item in gap_frequency],
        roles_analyzed=[RoleCount(role=role, count=count) for role, count in role_counter.most_common()],
        score_delta=score_delta,
        closed_gaps=[_short_gap(g, 80) for g in closed],
        new_gaps=[_short_gap(g, 80) for g in new],
        latest_score=last_score,
        best_score=best,
        average_score=average,
        latest_role=latest_role,
        skills_tracked=skills_tracked,
        matched_jobs=matched_jobs,
        gap_frequency=gap_frequency,
        next_focus=[_short_gap(g, 80) for g in next_focus],
        insight=_build_insight(
            report_count=len(timeline),
            latest_score=last_score,
            latest_role=latest_role,
            score_delta=score_delta,
            closed_gaps=closed,
            next_focus=next_focus,
        ),
    )


def workspace_insights(session: Session) -> WorkspaceInsightsResponse:
    candidates = session.query(CandidateProfileModel).count()
    reports = session.query(AnalysisReportModel).order_by(AnalysisReportModel.created_at.desc()).all()
    role_counter: Counter[str] = Counter()
    scores: list[int] = []
    recent: list[ReadinessPoint] = []

    for row in reports:
        role_counter[row.target_role] += 1
        report = _parse_report(row)
        if not report:
            continue
        score = report.readiness_score if report.readiness_score is not None else 0
        scores.append(score)
        if len(recent) < 8:
            gaps = next((a.gaps for a in report.agent_outputs if a.name == "SkillGapAgent"), []) or []
            recent.append(
                ReadinessPoint(
                    report_id=row.report_id,
                    target_role=row.target_role,
                    readiness_score=score,
                    created_at=row.created_at.isoformat() if row.created_at else None,
                    top_gaps=[_short_gap(g, 48) for g in gaps[:3]],
                )
            )

    avg = round(sum(scores) / len(scores), 1) if scores else None
    return WorkspaceInsightsResponse(
        candidate_count=candidates,
        report_count=len(reports),
        average_readiness=avg,
        role_distribution=[RoleCount(role=r, count=c) for r, c in role_counter.most_common()],
        recent_reports=recent,
    )
