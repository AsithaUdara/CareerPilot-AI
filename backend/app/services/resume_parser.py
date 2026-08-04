from pathlib import Path
from typing import List

from docx import Document
from pypdf import PdfReader

from app.schemas import CandidateProfile


def extract_skills(raw_text: str) -> List[str]:
    known_skills = [
        "python",
        "fastapi",
        "react",
        "sql",
        "docker",
        "testing",
        "aws",
        "git",
    ]
    lowered = raw_text.lower()
    return [skill.upper() for skill in known_skills if skill in lowered]


def parse_resume(candidate_id: str, filename: str, raw_text: str) -> CandidateProfile:
    text = raw_text.strip()
    summary = text[:300] if text else "No resume text extracted yet."
    return CandidateProfile(
        candidate_id=candidate_id,
        summary=summary,
        skills=extract_skills(text),
        education=[],
        projects=[],
        experience=[],
    )


def read_plaintext_resume(file_path: Path) -> str:
    # MVP fallback parser for txt-like files.
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
