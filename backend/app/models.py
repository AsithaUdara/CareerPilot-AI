from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    google_sub: Mapped[str | None] = mapped_column(String(128), unique=True, index=True, nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    picture_url: Mapped[str] = mapped_column(String(512), default="")
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)


class CandidateProfileModel(Base):
    __tablename__ = "candidate_profiles"

    candidate_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("users.id"), nullable=True, index=True
    )
    filename: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str] = mapped_column(Text)
    skills_csv: Mapped[str] = mapped_column(Text, default="")
    education_csv: Mapped[str] = mapped_column(Text, default="")
    projects_csv: Mapped[str] = mapped_column(Text, default="")
    experience_csv: Mapped[str] = mapped_column(Text, default="")
    github_url: Mapped[str] = mapped_column(String(512), default="")
    linkedin_url: Mapped[str] = mapped_column(String(512), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)


class AnalysisReportModel(Base):
    __tablename__ = "analysis_reports"

    report_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    candidate_id: Mapped[str] = mapped_column(String(64), index=True)
    target_role: Mapped[str] = mapped_column(String(128))
    report_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)


class AnalysisJobModel(Base):
    __tablename__ = "analysis_jobs"

    job_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    candidate_id: Mapped[str] = mapped_column(String(64), index=True)
    target_role: Mapped[str] = mapped_column(String(128))
    seniority_level: Mapped[str] = mapped_column(String(32), default="junior")
    status: Mapped[str] = mapped_column(String(32), default="queued")
    stage: Mapped[str] = mapped_column(String(64), default="queued")
    progress: Mapped[int] = mapped_column(Integer, default=0)
    message: Mapped[str] = mapped_column(Text, default="")
    report_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)


class JobListingModel(Base):
    __tablename__ = "job_listings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    role_key: Mapped[str] = mapped_column(String(128), index=True)
    title: Mapped[str] = mapped_column(String(255))
    company: Mapped[str] = mapped_column(String(255), default="")
    required_skills_csv: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str] = mapped_column(Text, default="")
    seniority: Mapped[str] = mapped_column(String(64), default="junior")
    source_url: Mapped[str] = mapped_column(String(512), default="")


class SkillRequirementModel(Base):
    __tablename__ = "skill_requirements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    role_key: Mapped[str] = mapped_column(String(128), index=True)
    skill: Mapped[str] = mapped_column(String(128))
    priority: Mapped[float] = mapped_column(Float, default=1.0)
    guidance: Mapped[str] = mapped_column(Text, default="")


class KnowledgeDocModel(Base):
    __tablename__ = "knowledge_docs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    role_key: Mapped[str] = mapped_column(String(128), index=True)
    category: Mapped[str] = mapped_column(String(64), default="guidance")
    content: Mapped[str] = mapped_column(Text)
