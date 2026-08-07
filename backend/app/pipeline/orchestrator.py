from __future__ import annotations

import time
from typing import Annotated, Callable, TypedDict
from uuid import uuid4

from langgraph.graph import END, START, StateGraph
from sqlalchemy.orm import Session

from app.config import get_settings
from app.pipeline.stages import PipelineStage
from app.repositories.knowledge_repository import query_required_skills
from app.schemas import AgentOutput, CandidateProfile, CareerReadinessReport, MatchedJob
from app.services import agents as agent_fns
from app.services.memory import load_prior_memory, memory_delta_note
from app.services.rag import RAGStore
from app.services.tools import search_jobs

ProgressCallback = Callable[[PipelineStage, str], None]


def _merge_outputs(
    existing: list[AgentOutput] | None,
    new: list[AgentOutput] | None,
) -> list[AgentOutput]:
    merged = list(existing or [])
    for item in new or []:
        merged = [m for m in merged if m.name != item.name]
        merged.append(item)
    return merged


class GraphState(TypedDict, total=False):
    profile: CandidateProfile
    target_role: str
    seniority_level: str
    stack_emphasis: list[str]
    prior_memory: str
    agent_outputs: Annotated[list[AgentOutput], _merge_outputs]
    seven_day_plan: list[str]
    explainability: dict[str, str]
    readiness_score: int
    report_id: str


class AgentOrchestrator:
    """LangGraph orchestrator coordinating six specialized Gemini-backed agents."""

    def __init__(self) -> None:
        self.rag = RAGStore()
        self._graph = self._build_graph()
        self._session: Session | None = None
        self._jobs: list[MatchedJob] = []
        self._job_source: str = "curated"
        self._rag_hits: list[str] = []
        self._required_skills: list[dict] = []
        self._emit: ProgressCallback | None = None

    def _build_graph(self):
        graph = StateGraph(GraphState)
        graph.add_node("resume_analysis", self._node_resume_analysis)
        graph.add_node("job_matching", self._node_job_matching)
        graph.add_node("skill_gaps", self._node_skill_gaps)
        graph.add_node("learning_roadmap", self._node_learning)
        graph.add_node("resume_optimization", self._node_resume_opt)
        graph.add_node("interview_coach", self._node_interview)
        graph.add_node("compose_report", self._node_compose)

        graph.add_edge(START, "resume_analysis")
        graph.add_edge("resume_analysis", "job_matching")
        graph.add_edge("job_matching", "skill_gaps")
        graph.add_edge("skill_gaps", "learning_roadmap")
        graph.add_edge("learning_roadmap", "resume_optimization")
        graph.add_edge("resume_optimization", "interview_coach")
        graph.add_edge("interview_coach", "compose_report")
        graph.add_edge("compose_report", END)
        return graph.compile()

    def _progress(self, stage: PipelineStage, message: str) -> None:
        if self._emit:
            self._emit(stage, message)
        time.sleep(0.15)

    def run(
        self,
        session: Session,
        profile: CandidateProfile,
        target_role: str,
        seniority_level: str = "Junior",
        stack_emphasis: list[str] | None = None,
        on_progress: ProgressCallback | None = None,
    ) -> CareerReadinessReport:
        settings = get_settings()
        settings.require_gemini()

        self._emit = on_progress
        self._session = session
        self._jobs = []
        self._job_source = "curated"
        self._rag_hits = []
        self._required_skills = []

        prior_memory = load_prior_memory(session, profile.candidate_id, target_role)
        initial: GraphState = {
            "profile": profile,
            "target_role": target_role,
            "seniority_level": seniority_level,
            "stack_emphasis": stack_emphasis or [],
            "prior_memory": prior_memory,
            "agent_outputs": [],
            "seven_day_plan": [],
            "explainability": {},
            "readiness_score": 50,
            "report_id": str(uuid4()),
        }
        final_state = self._graph.invoke(initial)

        report = CareerReadinessReport(
            report_id=final_state["report_id"],
            candidate_id=profile.candidate_id,
            target_role=target_role,
            seniority_level=seniority_level,
            stack_emphasis=stack_emphasis or [],
            profile=profile,
            agent_outputs=final_state.get("agent_outputs") or [],
            seven_day_plan=final_state.get("seven_day_plan") or [],
            explainability=final_state.get("explainability") or {},
            matched_jobs=list(self._jobs),
            readiness_score=final_state.get("readiness_score"),
            job_source=self._job_source,
        )
        report.explainability["memory_note"] = memory_delta_note(
            prior_memory,
            report,
        )
        report.explainability["job_source"] = self._job_source
        report.explainability["architecture"] = (
            "LangGraph Orchestrator-driven Multi-Agent Pipeline with Gemini + event-driven Celery."
        )
        self._progress(PipelineStage.COMPLETED, "Pipeline completed successfully.")
        return report

    def _node_resume_analysis(self, state: GraphState) -> GraphState:
        self._progress(
            PipelineStage.RESUME_ANALYSIS,
            "Resume Analysis Agent extracting structured profile signals with Gemini.",
        )
        output = agent_fns.resume_analysis_agent(
            state["profile"],
            state["target_role"],
            prior_memory=state.get("prior_memory") or "",
            seniority_level=state.get("seniority_level") or "Junior",
            stack_emphasis=state.get("stack_emphasis") or [],
        )
        return {"agent_outputs": [output]}

    def _node_job_matching(self, state: GraphState) -> GraphState:
        assert self._session is not None
        self._progress(
            PipelineStage.JOB_MATCHING,
            "Job Matching Agent scoring live Adzuna listings with curated fallback + RAG.",
        )
        jobs, source = search_jobs(
            self._session,
            state["target_role"],
            skills=state["profile"].skills,
        )
        self.rag.ensure_role_docs(self._session, state["target_role"])
        rag_hits = self.rag.retrieve(
            f"{state['target_role']} job readiness skills hiring",
            role=state["target_role"],
            k=4,
        )
        candidate = {s.strip().lower() for s in state["profile"].skills}
        for job in jobs:
            required = {s.strip().lower() for s in job.required_skills}
            job.match_score = (
                round(len(candidate & required) / len(required), 3) if required else 0.0
            )
        jobs.sort(key=lambda j: j.match_score or 0.0, reverse=True)
        self._jobs = jobs
        self._job_source = source
        self._rag_hits = rag_hits
        output = agent_fns.job_matching_agent(
            state["profile"],
            state["target_role"],
            jobs,
            rag_hits,
            seniority_level=state.get("seniority_level") or "Junior",
            stack_emphasis=state.get("stack_emphasis") or [],
        )
        return {"agent_outputs": [output]}

    def _node_skill_gaps(self, state: GraphState) -> GraphState:
        assert self._session is not None
        self._progress(
            PipelineStage.SKILL_GAPS,
            "Skill Gap Agent ranking missing competencies by hiring impact.",
        )
        required = query_required_skills(self._session, state["target_role"])
        self._required_skills = required
        rag_hits = self._rag_hits or self.rag.retrieve(
            f"{state['target_role']} skill gaps",
            role=state["target_role"],
        )
        self._rag_hits = rag_hits
        output = agent_fns.skill_gap_agent(
            state["profile"],
            state["target_role"],
            required,
            self._jobs,
            rag_hits,
            seniority_level=state.get("seniority_level") or "Junior",
            stack_emphasis=state.get("stack_emphasis") or [],
        )
        return {"agent_outputs": [output]}

    def _node_learning(self, state: GraphState) -> GraphState:
        self._progress(
            PipelineStage.LEARNING_ROADMAP,
            "Learning Planner Agent building prioritized roadmap from RAG materials.",
        )
        gaps = _latest_gaps(state.get("agent_outputs") or [])
        learning_hits = self.rag.retrieve(
            f"{state['target_role']} learning roadmap {' '.join(gaps[:4])}",
            role=state["target_role"],
            k=5,
        )
        self._rag_hits = list(dict.fromkeys(self._rag_hits + learning_hits))
        output = agent_fns.learning_planner_agent(
            gaps,
            state["target_role"],
            learning_hits,
            seniority_level=state.get("seniority_level") or "Junior",
            stack_emphasis=state.get("stack_emphasis") or [],
        )
        return {"agent_outputs": [output]}

    def _node_resume_opt(self, state: GraphState) -> GraphState:
        self._progress(
            PipelineStage.RESUME_OPTIMIZATION,
            "Resume Optimization Agent generating role-targeted edits.",
        )
        gaps = _latest_gaps(state.get("agent_outputs") or [])
        output = agent_fns.resume_optimization_agent(
            state["profile"],
            gaps,
            state["target_role"],
            seniority_level=state.get("seniority_level") or "Junior",
            stack_emphasis=state.get("stack_emphasis") or [],
        )
        return {"agent_outputs": [output]}

    def _node_interview(self, state: GraphState) -> GraphState:
        self._progress(
            PipelineStage.INTERVIEW_COACH,
            "Interview Coach Agent preparing practice prompts from role corpus.",
        )
        gaps = _latest_gaps(state.get("agent_outputs") or [])
        interview_hits = self.rag.retrieve(
            f"{state['target_role']} interview questions {' '.join(gaps[:3])}",
            role=state["target_role"],
            k=4,
        )
        self._rag_hits = list(dict.fromkeys(self._rag_hits + interview_hits))
        output = agent_fns.interview_coach_agent(
            state["target_role"],
            gaps,
            interview_hits,
            seniority_level=state.get("seniority_level") or "Junior",
            stack_emphasis=state.get("stack_emphasis") or [],
        )
        return {"agent_outputs": [output]}

    def _node_compose(self, state: GraphState) -> GraphState:
        self._progress(
            PipelineStage.REPORT_COMPOSITION,
            "Orchestrator composing explainable readiness report and 7-day plan.",
        )
        composed = agent_fns.compose_final_plan(
            state["profile"],
            state["target_role"],
            state.get("agent_outputs") or [],
            self._jobs,
            self._rag_hits,
            state.get("prior_memory") or "",
            seniority_level=state.get("seniority_level") or "Junior",
            stack_emphasis=state.get("stack_emphasis") or [],
        )
        jobs = self._jobs
        required = self._required_skills
        explainability = {
            "job_evidence": "; ".join(j.label for j in jobs[:3]) if jobs else "No jobs loaded.",
            "rag_evidence": " | ".join(self._rag_hits[:3]),
            "decision_note": composed.decision_note,
            "required_skills": ", ".join(item["skill"] for item in required[:10])
            or ", ".join(sorted({s for j in jobs for s in j.required_skills}))[:300],
            "job_source": self._job_source,
            "stack_emphasis": ", ".join(state.get("stack_emphasis") or []),
        }
        learning = next(
            (a for a in (state.get("agent_outputs") or []) if a.name == "LearningPlannerAgent"),
            None,
        )
        if learning and learning.recommendations:
            project_hint = next(
                (r for r in learning.recommendations if "portfolio project suggestion" in r.lower()),
                learning.recommendations[0],
            )
            explainability["portfolio_project_suggestion"] = project_hint
        return {
            "seven_day_plan": composed.days,
            "readiness_score": composed.readiness_score,
            "explainability": explainability,
        }


def _latest_gaps(outputs: list[AgentOutput]) -> list[str]:
    for agent in reversed(outputs):
        if agent.name == "SkillGapAgent":
            return agent.gaps
    return []
