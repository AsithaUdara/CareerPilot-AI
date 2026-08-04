from __future__ import annotations

import os
import threading
from uuid import uuid4

from app.db import get_session
from app.repositories.job_repository import create_job
from app.workers.tasks import run_analysis_pipeline


def enqueue_analysis_job(candidate_id: str, target_role: str) -> str:
    """Dispatch analysis as a non-blocking event (Celery queue or thread worker)."""
    job_id = str(uuid4())
    with get_session() as session:
        create_job(session, job_id, candidate_id, target_role)

    # Prefer Celery worker when available. Thread fallback keeps HTTP non-blocking
    # during local Windows bootstrap when no worker process is attached yet.
    use_thread = os.getenv("CELERY_USE_THREAD_FALLBACK", "1") == "1"
    eager = os.getenv("CELERY_TASK_ALWAYS_EAGER", "0") == "1"

    if eager:
        run_analysis_pipeline.delay(job_id, candidate_id, target_role)
    elif use_thread:
        threading.Thread(
            target=run_analysis_pipeline.run,
            args=(job_id, candidate_id, target_role),
            daemon=True,
            name=f"careerpilot-job-{job_id[:8]}",
        ).start()
    else:
        run_analysis_pipeline.delay(job_id, candidate_id, target_role)

    return job_id
