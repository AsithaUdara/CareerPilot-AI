from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class ResumeUploadResponse(BaseModel):
    candidate_id: str
    filename: str
    message: str


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


class CareerReadinessReport(BaseModel):
    report_id: Optional[str] = None
    candidate_id: str
    target_role: str
    profile: CandidateProfile
    agent_outputs: List[AgentOutput]
    seven_day_plan: List[str]
    explainability: Dict[str, str]


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
