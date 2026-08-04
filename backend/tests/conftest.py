import os

# Force isolated SQLite for tests before app modules load.
os.environ["DATABASE_URL"] = "sqlite:///./test_careerpilot.db"
os.environ["CELERY_TASK_ALWAYS_EAGER"] = "1"

from app.db import Base, engine  # noqa: E402
from app import models  # noqa: F401, E402
from app.workers.celery_app import celery_app  # noqa: E402

celery_app.conf.task_always_eager = True
celery_app.conf.task_eager_propagates = True

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
