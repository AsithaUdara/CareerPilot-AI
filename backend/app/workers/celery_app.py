from __future__ import annotations

import os
from pathlib import Path

from celery import Celery
from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_ROOT / ".env")

# Prefer local SQLite broker by default for reliable Windows worker startup.
# Override later with Redis: CELERY_BROKER_URL=redis://127.0.0.1:6379/0
BROKER_URL = os.getenv("CELERY_BROKER_URL") or "sqla+sqlite:///./celery_broker.sqlite"
RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND") or "db+sqlite:///./celery_results.sqlite"

celery_app = Celery(
    "careerpilot",
    broker=BROKER_URL,
    backend=RESULT_BACKEND,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    broker_connection_retry_on_startup=True,
    task_always_eager=os.getenv("CELERY_TASK_ALWAYS_EAGER", "0") == "1",
    task_eager_propagates=True,
)
