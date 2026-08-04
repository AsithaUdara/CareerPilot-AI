from __future__ import annotations

import json
from pathlib import Path

from sqlalchemy.orm import Session

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
    role_key = target_role.lower()
    rows = (
        session.query(JobListingModel)
        .filter(JobListingModel.role_key == role_key)
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
            "label": f"{row.title} @ {row.company} - {row.required_skills_csv.replace(',', ' + ')}",
        }
        for row in rows
    ]


def query_required_skills(session: Session, target_role: str) -> list[dict]:
    role_key = target_role.lower()
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
    role_key = target_role.lower()
    rows = (
        session.query(KnowledgeDocModel)
        .filter(KnowledgeDocModel.role_key == role_key)
        .order_by(KnowledgeDocModel.id.asc())
        .all()
    )
    return [row.content for row in rows]
