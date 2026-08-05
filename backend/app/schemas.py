from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class ResumeUploadResponse(BaseModel):
    candidate_id: str
    filename: str
    message: str
    profile: Optional["CandidateProfile"] = None


class AnalyzeRequest(BaseModel):
    candidate_id: str
    target_role: str


class CandidateProfile(BaseModel):
    candidate_id: str
    summary: str
    skills: List[str] = Field(default_factory=list)
    education: List[str] = Field(default_factory=list)
    projects: List[str] = Field(default_factory=list)
    experience: List[str] = Field(default_factory=list)


class AgentOutput(BaseModel):
    name: str
    strengths: List[str] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    evidence: List[str] = Field(default_factory=list)


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


class SevenDayPlanResult(BaseModel):
    days: List[str] = Field(default_factory=list)
    decision_note: str = ""
    readiness_score: int = 50


class SkillExtractionResult(BaseModel):
    required_skills: List[str] = Field(default_factory=list)
