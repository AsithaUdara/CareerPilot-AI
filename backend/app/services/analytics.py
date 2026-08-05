from __future__ import annotations

from collections import Counter

from sqlalchemy.orm import Session

from app.models import AnalysisReportModel, CandidateProfileModel
from app.schemas import (
    CareerAnalyticsResponse,
    CareerReadinessReport,
    ReadinessPoint,
    RoleCount,
    WorkspaceInsightsResponse,
)


def _parse_report(row: AnalysisReportModel) -> CareerReadinessReport | None:
    try:
        return CareerReadinessReport.model_validate_json(row.report_json)
    except Exception:
        return None


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

    for index, row in enumerate(rows):
        report = _parse_report(row)
        if not report:
            continue
        score = report.readiness_score if report.readiness_score is not None else 0
        gaps = next((a.gaps for a in report.agent_outputs if a.name == "SkillGapAgent"), [])
        timeline.append(
            ReadinessPoint(
                report_id=row.report_id,
                target_role=row.target_role,
                readiness_score=score,
                created_at=row.created_at.isoformat() if row.created_at else None,
                top_gaps=gaps[:5],
            )
        )
        gap_counter.update(gaps)
        role_counter[row.target_role] += 1
        if index == 0:
            first_score = score
            first_gaps = set(gaps)
        last_score = score
        last_gaps = set(gaps)

    score_delta = None
    if first_score is not None and last_score is not None and len(timeline) >= 2:
        score_delta = last_score - first_score

    return CareerAnalyticsResponse(
        candidate_id=candidate_id,
        report_count=len(timeline),
        timeline=timeline,
        recurring_gaps=[skill for skill, _ in gap_counter.most_common(8)],
        roles_analyzed=[RoleCount(role=role, count=count) for role, count in role_counter.most_common()],
        score_delta=score_delta,
        closed_gaps=sorted(first_gaps - last_gaps) if len(timeline) >= 2 else [],
        new_gaps=sorted(last_gaps - first_gaps) if len(timeline) >= 2 else [],
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
            gaps = next((a.gaps for a in report.agent_outputs if a.name == "SkillGapAgent"), [])
            recent.append(
                ReadinessPoint(
                    report_id=row.report_id,
                    target_role=row.target_role,
                    readiness_score=score,
                    created_at=row.created_at.isoformat() if row.created_at else None,
                    top_gaps=gaps[:3],
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
