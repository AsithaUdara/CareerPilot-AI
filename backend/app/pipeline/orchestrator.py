from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Callable
from uuid import uuid4

from sqlalchemy.orm import Session

from app.pipeline.stages import PipelineStage
from app.repositories.knowledge_repository import query_required_skills
from app.schemas import AgentOutput, CandidateProfile, CareerReadinessReport
from app.services.agents import (
    interview_coach_agent,
    job_matching_agent,
    learning_planner_agent,
    resume_analysis_agent,
    resume_optimization_agent,
    skill_gap_agent,
)
from app.services.rag import RAGStore
from app.services.tools import query_jobs

ProgressCallback = Callable[[PipelineStage, str], None]


@dataclass
class PipelineContext:
    profile: CandidateProfile
    target_role: str
    jobs: list[dict]
    required_skills: list[dict]
    role_context: list[str]
    agent_outputs: list[AgentOutput]


class AgentOrchestrator:
    """Central orchestrator that drives the multi-agent readiness pipeline."""

    def __init__(self) -> None:
        self.rag = RAGStore()

    def run(
        self,
        session: Session,
        profile: CandidateProfile,
        target_role: str,
        on_progress: ProgressCallback | None = None,
    ) -> CareerReadinessReport:
        def emit(stage: PipelineStage, message: str) -> None:
            if on_progress:
                on_progress(stage, message)
            # Small pause so polling clients can observe stage transitions.
            time.sleep(0.25)

        emit(PipelineStage.RESUME_ANALYSIS, "Resume Analysis Agent extracting structured profile signals.")
        resume_output = resume_analysis_agent(profile)

        emit(PipelineStage.JOB_MATCHING, "Job Matching Agent scoring seeded opportunities with RAG context.")
        jobs = query_jobs(session, target_role)
        self.rag.ensure_role_docs(session, target_role)
        role_context = self.rag.retrieve(target_role)
        match_output = job_matching_agent(profile, target_role, jobs)

        emit(PipelineStage.SKILL_GAPS, "Skill Gap Agent ranking missing competencies by hiring impact.")
        required_skills = query_required_skills(session, target_role)
        gap_output = skill_gap_agent(profile, target_role, required_skills)

        emit(PipelineStage.LEARNING_ROADMAP, "Learning Planner Agent building prioritized roadmap.")
        planner_output = learning_planner_agent(gap_output.gaps)

        emit(PipelineStage.RESUME_OPTIMIZATION, "Resume Optimization Agent generating role-targeted edits.")
        resume_opt_output = resume_optimization_agent(gap_output.gaps)

        emit(PipelineStage.INTERVIEW_COACH, "Interview Coach Agent preparing practice prompts.")
        interview_output = interview_coach_agent(target_role)

        emit(PipelineStage.REPORT_COMPOSITION, "Orchestrator composing explainable readiness report.")
        seven_day_plan = [
            "Day 1: Refine resume summary and role-specific keywords.",
            "Day 2: Study top skill gap topic.",
            "Day 3: Build a mini project artifact proving new skill.",
            "Day 4: Add project evidence to resume.",
            "Day 5: Practice role-specific interview questions.",
            "Day 6: Apply to 3 high-alignment opportunities.",
            "Day 7: Review progress and update next-week goals.",
        ]

        report = CareerReadinessReport(
            report_id=str(uuid4()),
            candidate_id=profile.candidate_id,
            target_role=target_role,
            profile=profile,
            agent_outputs=[
                resume_output,
                match_output,
                gap_output,
                planner_output,
                resume_opt_output,
                interview_output,
            ],
            seven_day_plan=seven_day_plan,
            explainability={
                "job_evidence": "; ".join(job["label"] for job in jobs[:3]) if jobs else "No jobs loaded.",
                "rag_evidence": " | ".join(role_context),
                "decision_note": "Recommendations are ranked by role relevance and missing-skill impact.",
                "required_skills": ", ".join(item["skill"] for item in required_skills[:8]) or "None seeded.",
                "architecture": "Orchestrator-driven Multi-Agent Pipeline with event-driven async processing.",
            },
        )
        emit(PipelineStage.COMPLETED, "Pipeline completed successfully.")
        return report
