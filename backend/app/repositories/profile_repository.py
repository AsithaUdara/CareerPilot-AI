from sqlalchemy.orm import Session

from app.models import CandidateProfileModel
from app.schemas import CandidateProfile


def _to_csv(items: list[str]) -> str:
    return ",".join(items)


def _from_csv(value: str) -> list[str]:
    if not value:
        return []
    return [item for item in value.split(",") if item]


def save_profile(session: Session, filename: str, profile: CandidateProfile) -> None:
    model = CandidateProfileModel(
        candidate_id=profile.candidate_id,
        filename=filename,
        summary=profile.summary,
        skills_csv=_to_csv(profile.skills),
        education_csv=_to_csv(profile.education),
        projects_csv=_to_csv(profile.projects),
        experience_csv=_to_csv(profile.experience),
    )
    session.merge(model)


def get_profile(session: Session, candidate_id: str) -> CandidateProfile | None:
    model = session.get(CandidateProfileModel, candidate_id)
    if not model:
        return None
    return CandidateProfile(
        candidate_id=model.candidate_id,
        summary=model.summary,
        skills=_from_csv(model.skills_csv),
        education=_from_csv(model.education_csv),
        projects=_from_csv(model.projects_csv),
        experience=_from_csv(model.experience_csv),
    )
