from typing import List

from sqlalchemy.orm import Session

from app.repositories.knowledge_repository import query_jobs_for_role


def query_jobs(session: Session, target_role: str) -> List[dict]:
    """Tool-calling style job lookup against the seeded Postgres knowledge base."""
    return query_jobs_for_role(session, target_role)
