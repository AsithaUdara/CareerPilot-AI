from __future__ import annotations

import re
from typing import Any
from uuid import uuid4

import httpx
from sqlalchemy.orm import Session

from app.config import get_settings
from app.repositories.knowledge_repository import query_jobs_for_role
from app.schemas import MatchedJob, SkillExtractionResult
from app.services.llm import invoke_structured


def _normalize_skills_from_text(text: str) -> list[str]:
    lexicon = [
        "Python",
        "Java",
        "JavaScript",
        "TypeScript",
        "React",
        "Node.js",
        "FastAPI",
        "Django",
        "Flask",
        "SQL",
        "PostgreSQL",
        "MySQL",
        "MongoDB",
        "Docker",
        "Kubernetes",
        "AWS",
        "Azure",
        "GCP",
        "Git",
        "CI/CD",
        "REST",
        "GraphQL",
        "Linux",
        "Redis",
        "Kafka",
        "Excel",
        "Power BI",
        "Tableau",
        "Pandas",
        "NumPy",
        "Machine Learning",
        "Testing",
        "pytest",
        "HTML",
        "CSS",
        "Tailwind",
        "Next.js",
        "ASP.NET",
        "C#",
    ]
    found: list[str] = []
    lower = text.lower()
    for skill in lexicon:
        if skill.lower() in lower:
            found.append(skill)
    return found[:12]


def _extract_skills_llm(description: str) -> list[str]:
    settings = get_settings()
    snippet = description[:4000]

    def stub() -> SkillExtractionResult:
        return SkillExtractionResult(required_skills=_normalize_skills_from_text(snippet))

    if not settings.gemini_configured:
        return stub().required_skills

    try:
        result = invoke_structured(
            system=(
                "Extract the key required technical and professional skills from a job description. "
                "Return concise skill names only."
            ),
            user=f"Job description:\n{snippet}",
            schema=SkillExtractionResult,
            stub_factory=stub,
        )
        return result.required_skills[:12] or stub().required_skills
    except Exception:
        return stub().required_skills


def _strip_html(value: str) -> str:
    text = re.sub(r"<[^>]+>", " ", value or "")
    return re.sub(r"\s+", " ", text).strip()


def _curated_jobs(session: Session, target_role: str) -> list[MatchedJob]:
    rows = query_jobs_for_role(session, target_role)
    jobs: list[MatchedJob] = []
    for idx, row in enumerate(rows):
        jobs.append(
            MatchedJob(
                id=f"curated-{idx}-{row.get('title', 'job')}",
                label=row.get("label") or f"{row.get('title', 'Role')} @ {row.get('company', '')}",
                company=row.get("company", ""),
                url=row.get("url", ""),
                required_skills=row.get("required_skills", []),
                description_snippet=(row.get("description") or "")[:400],
                source="curated",
            )
        )
    return jobs


def _adzuna_search(target_role: str, skills: list[str] | None = None) -> list[MatchedJob]:
    settings = get_settings()
    if not settings.adzuna_configured:
        return []

    what = target_role
    if skills:
        what = f"{target_role} {' '.join(skills[:4])}"

    url = (
        f"https://api.adzuna.com/v1/api/jobs/{settings.adzuna_country}/search/1"
    )
    params = {
        "app_id": settings.adzuna_app_id,
        "app_key": settings.adzuna_app_key,
        "results_per_page": settings.adzuna_results_per_page,
        "what": what,
        "content-type": "application/json",
    }

    try:
        with httpx.Client(timeout=20.0) as client:
            response = client.get(url, params=params)
            response.raise_for_status()
            payload: dict[str, Any] = response.json()
    except Exception:
        return []

    results = payload.get("results") or []
    jobs: list[MatchedJob] = []
    for item in results:
        description = _strip_html(str(item.get("description") or ""))
        title = str(item.get("title") or "Untitled role")
        company = ""
        company_obj = item.get("company") or {}
        if isinstance(company_obj, dict):
            company = str(company_obj.get("display_name") or "")
        redirect = str(item.get("redirect_url") or "")
        skills = _normalize_skills_from_text(f"{title} {description}")
        if len(skills) < 3 and description:
            skills = _extract_skills_llm(description) or skills
        job_id = str(item.get("id") or uuid4())
        jobs.append(
            MatchedJob(
                id=f"adzuna-{job_id}",
                label=f"{title} @ {company}" if company else title,
                company=company,
                url=redirect,
                required_skills=skills,
                description_snippet=description[:400],
                source="live",
            )
        )
    return jobs


def search_jobs(
    session: Session,
    target_role: str,
    skills: list[str] | None = None,
) -> tuple[list[MatchedJob], str]:
    """
    Primary: Adzuna live listings.
    Fallback: curated real job descriptions in Postgres.
    Returns (jobs, source) where source is 'live', 'curated', or 'live+curated'.
    """
    live = _adzuna_search(target_role, skills=skills)
    curated = _curated_jobs(session, target_role)

    if live and curated:
        # Prefer live, top up with curated if thin.
        merged = live[:]
        existing = {j.label.lower() for j in merged}
        for job in curated:
            if job.label.lower() not in existing and len(merged) < 10:
                merged.append(job)
        source = "live" if len(live) >= 3 else "live+curated"
        return merged, source

    if live:
        return live, "live"

    return curated, "curated"


def query_jobs(session: Session, target_role: str) -> list[dict]:
    """Backward-compatible tool wrapper returning dict jobs."""
    jobs, _source = search_jobs(session, target_role)
    return [
        {
            "id": job.id,
            "title": job.label.split(" @ ")[0] if " @ " in job.label else job.label,
            "company": job.company,
            "required_skills": job.required_skills,
            "description": job.description_snippet,
            "url": job.url,
            "label": job.label,
            "source": job.source,
        }
        for job in jobs
    ]
