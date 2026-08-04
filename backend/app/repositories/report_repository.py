from sqlalchemy.orm import Session

from app.models import AnalysisReportModel
from app.schemas import CareerReadinessReport


def save_report(session: Session, report_id: str, report: CareerReadinessReport) -> None:
    model = AnalysisReportModel(
        report_id=report_id,
        candidate_id=report.candidate_id,
        target_role=report.target_role,
        report_json=report.model_dump_json(),
    )
    session.merge(model)


def get_report(session: Session, report_id: str) -> CareerReadinessReport | None:
    model = session.get(AnalysisReportModel, report_id)
    if not model:
        return None
    return CareerReadinessReport.model_validate_json(model.report_json)


def list_reports_for_candidate(session: Session, candidate_id: str) -> list[dict]:
    rows = (
        session.query(AnalysisReportModel)
        .filter(AnalysisReportModel.candidate_id == candidate_id)
        .order_by(AnalysisReportModel.created_at.desc())
        .all()
    )
    return [
        {
            "report_id": row.report_id,
            "candidate_id": row.candidate_id,
            "target_role": row.target_role,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]
