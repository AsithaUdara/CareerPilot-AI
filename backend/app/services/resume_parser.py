from __future__ import annotations

import json
import re
from pathlib import Path
from typing import List, Tuple

from docx import Document
from pypdf import PdfReader

from app.config import get_settings
from app.schemas import CandidateProfile, ExtractedProfile
from app.services.llm import invoke_structured

_EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)
_PHONE_RE = re.compile(
    r"(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}"
)
_URL_CV_RE = re.compile(r"(linkedin\.com/\w+|github\.com/[\w.-]+)", re.I)

_CV_SECTION_RE = re.compile(
    r"(?m)^\s*(curriculum vitae|résumé|resume|\bcv\b|"
    r"work experience|professional experience|employment history|"
    r"education|skills|projects|certifications|internships?|"
    r"work history|professional summary|objective|references)\b",
    re.I,
)

_NON_CV_RE = re.compile(
    r"\b(table of contents|bibliography|works cited|references cited|"
    r"abstract|assignment|lecture notes?|worksheet|case study|"
    r"chapter\s+\d+|regional economic|trade blocs?|member states|"
    r"customs union|main objectives|learning outcomes)\b",
    re.I,
)

_NON_CV_FILENAME_RE = re.compile(
    r"(topic|assignment|lecture|chapter|worksheet|essay|notes?|homework)",
    re.I,
)
_CV_FILENAME_RE = re.compile(r"(resume|cv|curriculum)", re.I)


def assess_resume_document(raw_text: str, filename: str = "") -> Tuple[bool, str]:
    """
    Decide whether extracted text looks like a resume/CV before profile extraction.
    Returns (is_resume, reason). reason is user-facing when is_resume is False.
    """
    text = (raw_text or "").strip()
    if len(text) < 80:
        return (
            False,
            "This file has little readable text. Upload a text-based resume (PDF, DOCX, or TXT).",
        )

    score = 0
    if _EMAIL_RE.search(text):
        score += 2
    if _PHONE_RE.search(text):
        score += 1
    if _URL_CV_RE.search(text):
        score += 2

    sections = {m.group(1).lower() for m in _CV_SECTION_RE.finditer(text)}
    score += min(len(sections), 4)

    name = Path(filename or "").stem
    if _CV_FILENAME_RE.search(name):
        score += 1
    if _NON_CV_FILENAME_RE.search(name):
        score -= 2

    non_cv_hits = len(_NON_CV_RE.findall(text))
    if non_cv_hits:
        score -= min(non_cv_hits, 4)

    # Long prose with almost no CV structure → academic/notes, not a resume.
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    long_lines = sum(1 for ln in lines if len(ln) > 120)
    if long_lines >= 8 and len(sections) == 0 and not _EMAIL_RE.search(text):
        score -= 2

    if score >= 2:
        return True, "ok"

    return (
        False,
        "This file does not look like a resume or CV. "
        "Upload a document that includes your experience, education, and skills.",
    )


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


def parse_resume(
    candidate_id: str,
    filename: str,
    raw_text: str,
    *,
    github_url: str = "",
    linkedin_url: str = "",
) -> CandidateProfile:
    extracted = enrich_profile_with_llm(raw_text)
    summary = extracted.summary.strip() or (raw_text.strip()[:300] or "No resume text extracted yet.")
    return CandidateProfile(
        candidate_id=candidate_id,
        summary=summary,
        skills=extracted.skills,
        education=extracted.education,
        projects=extracted.projects,
        experience=extracted.experience,
        github_url=github_url.strip(),
        linkedin_url=linkedin_url.strip(),
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
