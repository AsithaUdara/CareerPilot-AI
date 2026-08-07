from sqlalchemy.orm import Session

from app.models import CandidateProfileModel
from app.schemas import CandidateProfile
from app.services.resume_parser import dump_profile_lists, load_profile_list


def save_profile(
    session: Session,
    filename: str,
    profile: CandidateProfile,
    user_id: str | None = None,
) -> None:
    lists = dump_profile_lists(profile)
    model = CandidateProfileModel(
        candidate_id=profile.candidate_id,
        user_id=user_id,
        filename=filename,
        summary=profile.summary,
        skills_csv=lists["skills"],
        education_csv=lists["education"],
        projects_csv=lists["projects"],
        experience_csv=lists["experience"],
        github_url=profile.github_url or "",
        linkedin_url=profile.linkedin_url or "",
    )
    session.merge(model)


def list_profiles_for_user(session: Session, user_id: str) -> list[CandidateProfileModel]:
    return (
        session.query(CandidateProfileModel)
        .filter(CandidateProfileModel.user_id == user_id)
        .order_by(CandidateProfileModel.created_at.desc())
        .all()
    )


def get_profile(session: Session, candidate_id: str) -> CandidateProfile | None:
    model = session.get(CandidateProfileModel, candidate_id)
    if not model:
        return None
    return CandidateProfile(
        candidate_id=model.candidate_id,
        summary=model.summary,
        skills=load_profile_list(model.skills_csv),
        education=load_profile_list(model.education_csv),
        projects=load_profile_list(model.projects_csv),
        experience=load_profile_list(model.experience_csv),
        github_url=getattr(model, "github_url", "") or "",
        linkedin_url=getattr(model, "linkedin_url", "") or "",
    )
