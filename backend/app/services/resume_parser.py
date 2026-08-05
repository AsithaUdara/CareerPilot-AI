from __future__ import annotations

import json
from pathlib import Path
from typing import List

from docx import Document
from pypdf import PdfReader

from app.config import get_settings
from app.schemas import CandidateProfile, ExtractedProfile
from app.services.llm import invoke_structured


def extract_skills_heuristic(raw_text: str) -> List[str]:
    known_skills = [
        "python",
        "fastapi",
        "django",
        "flask",
        "react",
        "typescript",
        "javascript",
        "node",
        "sql",
        "postgresql",
        "mongodb",
        "docker",
        "kubernetes",
        "aws",
        "azure",
        "gcp",
        "git",
        "testing",
        "pytest",
        "ci/cd",
        "rest",
        "graphql",
        "excel",
        "power bi",
        "tableau",
        "statistics",
        "machine learning",
        "pandas",
        "numpy",
        "java",
        "c#",
        "asp.net",
        "html",
        "css",
        "tailwind",
        "redis",
        "linux",
    ]
    lowered = raw_text.lower()
    found: list[str] = []
    for skill in known_skills:
        if skill in lowered:
            found.append(skill.upper() if len(skill) <= 3 else skill.title())
    return found


def _heuristic_extract(raw_text: str) -> ExtractedProfile:
    text = raw_text.strip()
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    education: list[str] = []
    projects: list[str] = []
    experience: list[str] = []
    section = ""
    for line in lines:
        lower = line.lower()
        if lower.startswith("education") or "university" in lower or "bachelor" in lower:
            section = "education"
            if not lower.startswith("education"):
                education.append(line)
            continue
        if lower.startswith("project"):
            section = "projects"
            continue
        if lower.startswith("experience") or lower.startswith("work"):
            section = "experience"
            continue
        if lower.startswith("skill"):
            section = "skills"
            continue
        if section == "education" and len(education) < 6:
            education.append(line)
        elif section == "projects" and len(projects) < 8:
            projects.append(line)
        elif section == "experience" and len(experience) < 8:
            experience.append(line)
    return ExtractedProfile(
        summary=text[:400] if text else "No resume text extracted yet.",
        skills=extract_skills_heuristic(text),
        education=education,
        projects=projects,
        experience=experience,
    )


def enrich_profile_with_llm(raw_text: str) -> ExtractedProfile:
    settings = get_settings()
    truncated = raw_text[:12000]

    def stub() -> ExtractedProfile:
        return _heuristic_extract(truncated)

    if not settings.gemini_configured:
        return stub()

    try:
        return invoke_structured(
            system=(
                "You are a resume analysis specialist. Extract a structured candidate profile "
                "from the resume text. Use concise bullet-style strings. Skills should be "
                "normalized technology/competency names. Do not invent employers or degrees "
                "that are not supported by the text."
            ),
            user=f"Resume text:\n{truncated}",
            schema=ExtractedProfile,
            stub_factory=stub,
        )
    except Exception:
        # Keep upload usable if Gemini is rate-limited; analyze still uses the LLM.
        return stub()


def parse_resume(candidate_id: str, filename: str, raw_text: str) -> CandidateProfile:
    extracted = enrich_profile_with_llm(raw_text)
    summary = extracted.summary.strip() or (raw_text.strip()[:300] or "No resume text extracted yet.")
    return CandidateProfile(
        candidate_id=candidate_id,
        summary=summary,
        skills=extracted.skills,
        education=extracted.education,
        projects=extracted.projects,
        experience=extracted.experience,
    )


def read_plaintext_resume(file_path: Path) -> str:
    return file_path.read_text(encoding="utf-8", errors="ignore")


def read_pdf_resume(file_path: Path) -> str:
    reader = PdfReader(str(file_path))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages)


def read_docx_resume(file_path: Path) -> str:
    document = Document(str(file_path))
    return "\n".join([paragraph.text for paragraph in document.paragraphs if paragraph.text.strip()])


def read_resume_text(file_path: Path) -> str:
    suffix = file_path.suffix.lower()
    if suffix == ".pdf":
        return read_pdf_resume(file_path)
    if suffix == ".docx":
        return read_docx_resume(file_path)
    return read_plaintext_resume(file_path)


def dump_profile_lists(profile: CandidateProfile) -> dict[str, str]:
    """Serialize list fields as JSON for durable Postgres storage."""
    return {
        "skills": json.dumps(profile.skills),
        "education": json.dumps(profile.education),
        "projects": json.dumps(profile.projects),
        "experience": json.dumps(profile.experience),
    }


def load_profile_list(raw: str) -> list[str]:
    if not raw:
        return []
    raw = raw.strip()
    if raw.startswith("["):
        try:
            data = json.loads(raw)
            if isinstance(data, list):
                return [str(item) for item in data if item]
        except json.JSONDecodeError:
            pass
    return [item for item in raw.split(",") if item]
