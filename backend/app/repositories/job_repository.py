from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import AnalysisJobModel
from app.pipeline.stages import PipelineStage, stage_progress


def create_job(session: Session, job_id: str, candidate_id: str, target_role: str) -> AnalysisJobModel:
    job = AnalysisJobModel(
        job_id=job_id,
        candidate_id=candidate_id,
        target_role=target_role,
        status="queued",
        stage=PipelineStage.QUEUED.value,
        progress=stage_progress(PipelineStage.QUEUED),
        message="Job accepted and queued for Celery worker.",
    )
    session.merge(job)
    return job


def get_job(session: Session, job_id: str) -> AnalysisJobModel | None:
    return session.get(AnalysisJobModel, job_id)


def update_job_progress(
    session: Session,
    job_id: str,
    *,
    status: str,
    stage: str,
    progress: int,
    message: str,
    report_id: str | None = None,
) -> None:
    job = session.get(AnalysisJobModel, job_id)
    if not job:
        return
    job.status = status
    job.stage = stage
    job.progress = progress
    job.message = message
    job.updated_at = datetime.now(timezone.utc)
    if report_id:
        job.report_id = report_id
    session.add(job)


def mark_job_failed(session: Session, job_id: str, error: str) -> None:
    update_job_progress(
        session,
        job_id,
        status="failed",
        stage=PipelineStage.FAILED.value,
        progress=100,
        message="Pipeline failed.",
    )
    job = session.get(AnalysisJobModel, job_id)
    if job:
        job.error = error
        job.updated_at = datetime.now(timezone.utc)
        session.add(job)
