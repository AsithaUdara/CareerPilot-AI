from typing import Dict, List, Optional

from pydantic import BaseModel, Field, field_validator

from app.constants import IT_TARGET_ROLES, SENIORITY_LEVELS


class ResumeUploadResponse(BaseModel):
    candidate_id: str
    filename: str
    message: str
    profile: Optional["CandidateProfile"] = None


class AnalyzeRequest(BaseModel):
    candidate_id: str
    target_role: str
    seniority_level: str = "Junior"
    stack_emphasis: List[str] = Field(default_factory=list)

    @field_validator("target_role")
    @classmethod
    def validate_target_role(cls, value: str) -> str:
        if value not in IT_TARGET_ROLES:
            allowed = ", ".join(IT_TARGET_ROLES)
            raise ValueError(f"target_role must be one of: {allowed}")
        return value

    @field_validator("seniority_level")
    @classmethod
    def validate_seniority(cls, value: str) -> str:
        normalized = value.strip().title()
        if normalized not in SENIORITY_LEVELS:
            allowed = ", ".join(SENIORITY_LEVELS)
            raise ValueError(f"seniority_level must be one of: {allowed}")
        return normalized

    @field_validator("stack_emphasis")
    @classmethod
    def validate_stack_emphasis(cls, value: List[str]) -> List[str]:
        cleaned: List[str] = []
        seen: set[str] = set()
        for item in value:
            token = item.strip()
            if not token:
                continue
            key = token.lower()
            if key in seen:
                continue
            seen.add(key)
            cleaned.append(token)
        return cleaned[:5]


class CandidateProfile(BaseModel):
    candidate_id: str
    summary: str
    skills: List[str] = Field(default_factory=list)
    education: List[str] = Field(default_factory=list)
    projects: List[str] = Field(default_factory=list)
    experience: List[str] = Field(default_factory=list)
    github_url: str = ""
    linkedin_url: str = ""


class AgentOutput(BaseModel):
    name: str
    strengths: List[str] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    evidence: List[str] = Field(default_factory=list)
    interview_tags: Dict[str, List[str]] = Field(default_factory=dict)


class MatchedJob(BaseModel):
    id: str
    label: str
    company: str = ""
    url: str = ""
    required_skills: List[str] = Field(default_factory=list)
    description_snippet: str = ""
    match_score: Optional[float] = None
    source: str = "curated"


class CareerReadinessReport(BaseModel):
    report_id: Optional[str] = None
    candidate_id: str
    target_role: str
    seniority_level: str = "Junior"
    stack_emphasis: List[str] = Field(default_factory=list)
    profile: CandidateProfile
    agent_outputs: List[AgentOutput]
    seven_day_plan: List[str]
    explainability: Dict[str, str]
    matched_jobs: List[MatchedJob] = Field(default_factory=list)
    readiness_score: Optional[int] = None
    job_source: str = "curated"


class ReportSummary(BaseModel):
    report_id: str
    candidate_id: str
    target_role: str
    created_at: Optional[str] = None


class AnalyzeJobAccepted(BaseModel):
    job_id: str
    status: str
    message: str


class AnalysisJobStatus(BaseModel):
    job_id: str
    candidate_id: str
    target_role: str
    seniority_level: str = "Junior"
    status: str
    stage: str
    progress: int
    message: str
    report_id: Optional[str] = None
    error: Optional[str] = None


class ExtractedProfile(BaseModel):
    """LLM structured extraction from resume text (without candidate_id)."""

    summary: str = ""
    skills: List[str] = Field(default_factory=list)
    education: List[str] = Field(default_factory=list)
    projects: List[str] = Field(default_factory=list)
    experience: List[str] = Field(default_factory=list)


class AgentLLMResult(BaseModel):
    strengths: List[str] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    evidence: List[str] = Field(default_factory=list)


class InterviewCoachResult(BaseModel):
    coding: List[str] = Field(default_factory=list)
    system_design: List[str] = Field(default_factory=list)
    behavioral: List[str] = Field(default_factory=list)
    take_home: List[str] = Field(default_factory=list)
    evidence: List[str] = Field(default_factory=list)


class SevenDayPlanResult(BaseModel):
    days: List[str] = Field(default_factory=list)
    decision_note: str = ""
    readiness_score: int = 50


class SkillExtractionResult(BaseModel):
    required_skills: List[str] = Field(default_factory=list)
