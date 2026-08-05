import os

# Force isolated SQLite + stub LLM for tests before app modules load.
os.environ["DATABASE_URL"] = "sqlite:///./test_careerpilot.db"
os.environ["CELERY_TASK_ALWAYS_EAGER"] = "1"
os.environ["CAREERPILOT_USE_STUB_LLM"] = "1"
os.environ["GOOGLE_API_KEY"] = ""
os.environ["ADZUNA_APP_ID"] = ""
os.environ["ADZUNA_APP_KEY"] = ""
os.environ["QDRANT_PATH"] = "./test_qdrant_data"
os.environ["AUTH_DISABLED"] = "1"
os.environ["JWT_SECRET"] = "test-jwt-secret-at-least-32-bytes-long"

from app.config import get_settings  # noqa: E402

get_settings.cache_clear()

from app.db import Base, engine, get_session  # noqa: E402
from app import models  # noqa: F401, E402
from app.repositories.knowledge_repository import seed_knowledge_base  # noqa: E402
from app.workers.celery_app import celery_app  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
import pytest  # noqa: E402

celery_app.conf.task_always_eager = True
celery_app.conf.task_eager_propagates = True

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

with get_session() as session:
    seed_knowledge_base(session, force=True)


@pytest.fixture()
def client():
    from app.main import app

    with TestClient(app) as test_client:
        yield test_client
