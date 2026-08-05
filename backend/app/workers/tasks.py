from __future__ import annotations

from app.db import get_session
from app.pipeline.orchestrator import AgentOrchestrator
from app.pipeline.stages import PipelineStage, stage_progress
from app.repositories.job_repository import mark_job_failed, update_job_progress
from app.repositories.profile_repository import get_profile
from app.repositories.report_repository import save_report
from app.workers.celery_app import celery_app


@celery_app.task(name="careerpilot.run_analysis_pipeline", bind=True)
def run_analysis_pipeline(
    self,
    job_id: str,
    candidate_id: str,
    target_role: str,
    seniority_level: str = "Junior",
    stack_emphasis: list[str] | None = None,
) -> dict:
    """Event-driven pipeline entrypoint executed by Celery worker."""
    orchestrator = AgentOrchestrator()

    try:
        with get_session() as session:
            profile = get_profile(session, candidate_id)
            if not profile:
                mark_job_failed(session, job_id, "Candidate profile not found.")
                return {"job_id": job_id, "status": "failed"}

            def on_progress(stage: PipelineStage, message: str) -> None:
                update_job_progress(
                    session,
                    job_id,
                    status="running",
                    stage=stage.value,
                    progress=stage_progress(stage),
                    message=message,
                )
                # Keep SQLAlchemy session changes visible to polling API.
                session.commit()
                self.update_state(
                    state="PROGRESS",
                    meta={
                        "job_id": job_id,
                        "stage": stage.value,
                        "progress": stage_progress(stage),
                        "message": message,
                    },
                )

            update_job_progress(
                session,
                job_id,
                status="running",
                stage=PipelineStage.RESUME_ANALYSIS.value,
                progress=stage_progress(PipelineStage.RESUME_ANALYSIS),
                message="Pipeline dequeued by Celery worker.",
            )
            session.commit()

            report = orchestrator.run(
                session,
                profile,
                target_role,
                seniority_level=seniority_level,
                stack_emphasis=stack_emphasis or [],
                on_progress=on_progress,
            )
            assert report.report_id
            save_report(session, report.report_id, report)
            update_job_progress(
                session,
                job_id,
                status="completed",
                stage=PipelineStage.COMPLETED.value,
                progress=100,
                message="Analysis report persisted.",
                report_id=report.report_id,
            )
            session.commit()
            return {
                "job_id": job_id,
                "status": "completed",
                "report_id": report.report_id,
            }
    except Exception as exc:  # pragma: no cover - surfaced via job status
        with get_session() as session:
            mark_job_failed(session, job_id, str(exc))
        raise
