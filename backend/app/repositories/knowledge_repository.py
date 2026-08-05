from __future__ import annotations

import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.constants import normalize_role_key
from app.models import JobListingModel, KnowledgeDocModel, SkillRequirementModel

SEED_PATH = Path(__file__).resolve().parent.parent / "data" / "knowledge_seed.json"


def _to_csv(items: list[str]) -> str:
    return ",".join(items)


def seed_knowledge_base(session: Session, *, force: bool = False) -> dict[str, int]:
    payload = json.loads(SEED_PATH.read_text(encoding="utf-8"))

    existing_jobs = session.query(JobListingModel).count()
    if existing_jobs and not force:
        return {
            "jobs": existing_jobs,
            "skills": session.query(SkillRequirementModel).count(),
            "knowledge_docs": session.query(KnowledgeDocModel).count(),
            "seeded": 0,
        }

    if force:
        session.query(JobListingModel).delete()
        session.query(SkillRequirementModel).delete()
        session.query(KnowledgeDocModel).delete()

    for job in payload.get("jobs", []):
        session.add(
            JobListingModel(
                role_key=job["role_key"].lower(),
                title=job["title"],
                company=job.get("company", ""),
                required_skills_csv=_to_csv(job.get("required_skills", [])),
                description=job.get("description", ""),
                seniority=job.get("seniority", "junior"),
                source_url=job.get("url", "") or job.get("source_url", ""),
            )
        )

    for skill in payload.get("skills", []):
        session.add(
            SkillRequirementModel(
                role_key=skill["role_key"].lower(),
                skill=skill["skill"],
                priority=float(skill.get("priority", 1.0)),
                guidance=skill.get("guidance", ""),
            )
        )

    for doc in payload.get("knowledge_docs", []):
        session.add(
            KnowledgeDocModel(
                role_key=doc["role_key"].lower(),
                category=doc.get("category", "guidance"),
                content=doc["content"],
            )
        )

    session.flush()
    return {
        "jobs": session.query(JobListingModel).count(),
        "skills": session.query(SkillRequirementModel).count(),
        "knowledge_docs": session.query(KnowledgeDocModel).count(),
        "seeded": 1,
    }


def query_jobs_for_role(session: Session, target_role: str) -> list[dict]:
    role_key = normalize_role_key(target_role)
    rows = (
        session.query(JobListingModel)
        .filter(JobListingModel.role_key == role_key)
        .order_by(JobListingModel.id.asc())
        .all()
    )
    if not rows:
        # Fuzzy: match partial role key (e.g. "backend" in "backend developer")
        token = role_key.split()[0] if role_key else ""
        if token:
            rows = (
                session.query(JobListingModel)
                .filter(JobListingModel.role_key.contains(token))
                .order_by(JobListingModel.id.asc())
                .all()
            )
    return [
        {
            "title": row.title,
            "company": row.company,
            "required_skills": [s for s in row.required_skills_csv.split(",") if s],
            "description": row.description,
            "seniority": row.seniority,
            "url": getattr(row, "source_url", "") or "",
            "label": f"{row.title} @ {row.company}",
        }
        for row in rows
    ]


def query_required_skills(session: Session, target_role: str) -> list[dict]:
    role_key = normalize_role_key(target_role)
    rows = (
        session.query(SkillRequirementModel)
        .filter(SkillRequirementModel.role_key == role_key)
        .order_by(SkillRequirementModel.priority.desc())
        .all()
    )
    return [
        {
            "skill": row.skill,
            "priority": row.priority,
            "guidance": row.guidance,
        }
        for row in rows
    ]


def query_knowledge_docs(session: Session, target_role: str) -> list[str]:
    return [doc["content"] for doc in query_knowledge_docs_detailed(session, target_role)]


def query_knowledge_docs_detailed(session: Session, target_role: str) -> list[dict]:
    role_key = normalize_role_key(target_role)
    rows = (
        session.query(KnowledgeDocModel)
        .filter(KnowledgeDocModel.role_key == role_key)
        .order_by(KnowledgeDocModel.id.asc())
        .all()
    )
    if not rows:
        token = role_key.split()[0] if role_key else ""
        if token:
            rows = (
                session.query(KnowledgeDocModel)
                .filter(KnowledgeDocModel.role_key.contains(token))
                .order_by(KnowledgeDocModel.id.asc())
                .all()
            )
    return [
        {
            "id": row.id,
            "category": row.category,
            "content": row.content,
            "title": f"{row.category}:{row.id}",
        }
        for row in rows
    ]
