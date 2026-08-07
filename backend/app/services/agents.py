from __future__ import annotations

import json

from app.constants import normalize_seniority
from app.schemas import (
    AgentLLMResult,
    AgentOutput,
    CandidateProfile,
    InterviewCoachResult,
    MatchedJob,
    SevenDayPlanResult,
)
from app.services.llm import invoke_structured

HIRING_SPRINT_TEMPLATE = """
Day 1: Refine resume + LinkedIn headline for the target IT role and seniority.
Day 2: Close the #1 skill gap with focused study (one high-impact competency).
Day 3: Ship a mini portfolio artifact (GitHub commit, repo, or deployable demo).
Day 4: Update resume bullets with metrics, stack tags, and project evidence.
Day 5: Technical/coding interview drills aligned to role and gaps.
Day 6: System design or practical interview prep (role-specific where applicable).
Day 7: Apply to top matched jobs and review progress for next sprint.
"""


def _profile_blob(profile: CandidateProfile) -> str:
    return json.dumps(profile.model_dump(), indent=2)


def _jobs_blob(jobs: list[MatchedJob]) -> str:
    return json.dumps([j.model_dump() for j in jobs[:8]], indent=2)


def _role_context(target_role: str, seniority_level: str) -> str:
    seniority = normalize_seniority(seniority_level)
    expectations = {
        "intern": "internship screening: fundamentals, learning agility, small shipped artifacts, GitHub activity.",
        "junior": "junior hire bar: production-ready basics, testing, collaboration, portfolio projects with impact.",
        "mid": "mid-level bar: ownership, system thinking, mentoring signals, measurable delivery outcomes.",
    }
    return (
        f"Target role: {target_role}\n"
        f"Seniority: {seniority.title()}\n"
        f"Expectations: {expectations.get(seniority, expectations['junior'])}"
    )


def _stack_context(stack_emphasis: list[str] | None) -> str:
    stack = [s.strip() for s in (stack_emphasis or []) if s.strip()]
    if not stack:
        return "Stack emphasis: none provided"
    return "Stack emphasis: " + ", ".join(stack)


def _portfolio_context(profile: CandidateProfile) -> str:
    parts = []
    if profile.github_url:
        parts.append(f"GitHub: {profile.github_url}")
    if profile.linkedin_url:
        parts.append(f"LinkedIn: {profile.linkedin_url}")
    if not parts:
        return "Portfolio links: none provided — recommend adding GitHub for IT credibility."
    return "Portfolio links:\n" + "\n".join(parts)


def resume_analysis_agent(
    profile: CandidateProfile,
    target_role: str,
    prior_memory: str = "",
    seniority_level: str = "Junior",
    stack_emphasis: list[str] | None = None,
) -> AgentOutput:
    def stub() -> AgentLLMResult:
        portfolio_note = (
            "GitHub provided — review repo quality and README."
            if profile.github_url
            else "No GitHub URL — add a public repo for IT hiring credibility."
        )
        return AgentLLMResult(
            strengths=profile.skills[:4] or ["Transferable foundation from resume content"],
            gaps=[] if profile.projects else ["Limited project evidence on resume"],
            recommendations=[
                "Clarify impact metrics for each project bullet.",
                f"Align professional summary with {target_role} outcomes at {seniority_level} level.",
                portfolio_note,
            ],
            evidence=[
                f"Summary excerpt: {profile.summary[:180]}",
                f"Skills extracted: {', '.join(profile.skills[:8]) or 'none'}",
            ],
        )

    result = invoke_structured(
        system=(
            "You are ResumeAnalysisAgent in CareerPilot for IT professionals. Critique and "
            "strengthen the candidate profile for the target role and seniority. Consider GitHub/"
            "LinkedIn when provided. Cite concrete resume evidence. Do not invent employers or skills."
        ),
        user=(
            f"{_role_context(target_role, seniority_level)}\n"
            f"{_stack_context(stack_emphasis)}\n"
            f"{_portfolio_context(profile)}\n"
            f"Prior memory:\n{prior_memory or 'None'}\n"
            f"Candidate profile JSON:\n{_profile_blob(profile)}"
        ),
        schema=AgentLLMResult,
        stub_factory=stub,
    )
    return AgentOutput(name="ResumeAnalysisAgent", **result.model_dump())


def job_matching_agent(
    profile: CandidateProfile,
    target_role: str,
    jobs: list[MatchedJob],
    rag_hits: list[str],
    seniority_level: str = "Junior",
    stack_emphasis: list[str] | None = None,
) -> AgentOutput:
    def stub() -> AgentLLMResult:
        if not jobs:
            return AgentLLMResult(
                gaps=["No jobs available from live API or curated corpus."],
                recommendations=["Retry with Adzuna credentials or expand curated role seed."],
                evidence=["Job search returned zero listings."],
            )
        candidate = {s.strip().lower() for s in profile.skills}
        scored: list[tuple[float, MatchedJob]] = []
        for job in jobs:
            required = {s.strip().lower() for s in job.required_skills}
            overlap = (len(candidate & required) / len(required)) if required else 0.0
            scored.append((overlap, job))
        scored.sort(key=lambda item: item[0], reverse=True)
        best = scored[0]
        hint = "High" if best[0] >= 0.7 else "Moderate" if best[0] >= 0.4 else "Low"
        return AgentLLMResult(
            strengths=[f"{hint} match potential for {target_role} ({seniority_level})", best[1].label],
            gaps=[] if best[0] >= 0.7 else ["Strengthen ATS keyword coverage from top JDs."],
            recommendations=[f"Prioritize applications near: {best[1].label}"],
            evidence=[
                f"{job.label} (overlap {int(score * 100)}%, source={job.source})"
                for score, job in scored[:3]
            ]
            + rag_hits[:2],
        )

    result = invoke_structured(
        system=(
            "You are JobMatchingAgent for IT hiring. Rank fit against real job listings for the "
            "given seniority (intern/junior/mid). Use required skills and JD snippets as evidence."
        ),
        user=(
            f"{_role_context(target_role, seniority_level)}\n"
            f"{_stack_context(stack_emphasis)}\n"
            f"{_portfolio_context(profile)}\n"
            f"Profile:\n{_profile_blob(profile)}\n"
            f"Jobs:\n{_jobs_blob(jobs)}\n"
            f"RAG context:\n" + "\n".join(rag_hits[:4])
        ),
        schema=AgentLLMResult,
        stub_factory=stub,
    )
    return AgentOutput(name="JobMatchingAgent", **result.model_dump())


def skill_gap_agent(
    profile: CandidateProfile,
    target_role: str,
    required_skills: list[dict],
    jobs: list[MatchedJob],
    rag_hits: list[str],
    seniority_level: str = "Junior",
    stack_emphasis: list[str] | None = None,
) -> AgentOutput:
    def stub() -> AgentLLMResult:
        candidate = {s.strip().lower() for s in profile.skills}
        missing: list[str] = []
        evidence: list[str] = []
        for item in required_skills:
            skill = item["skill"]
            if skill.strip().lower() not in candidate:
                missing.append(skill)
                if item.get("guidance"):
                    evidence.append(f"{skill}: {item['guidance']}")
            if len(missing) >= 5:
                break
        if not missing:
            for job in jobs:
                for skill in job.required_skills:
                    if skill.strip().lower() not in candidate and skill not in missing:
                        missing.append(skill)
                        evidence.append(f"{skill} required by {job.label}")
                    if len(missing) >= 5:
                        break
                if len(missing) >= 5:
                    break
        return AgentLLMResult(
            gaps=missing,
            recommendations=[
                f"Close top {len(missing)} role-critical gaps for {target_role} at {seniority_level} level."
            ]
            if missing
            else [f"Core skill coverage looks solid for {target_role}."],
            evidence=evidence[:6] or rag_hits[:3] or ["Compared profile skills to role requirements."],
        )

    result = invoke_structured(
        system=(
            "You are SkillGapAgent for IT professionals. Identify highest-impact missing "
            "competencies for the seniority level. Rank gaps by hiring impact. Cite JD and RAG evidence."
        ),
        user=(
            f"{_role_context(target_role, seniority_level)}\n"
            f"{_stack_context(stack_emphasis)}\n"
            f"Profile skills: {profile.skills}\n"
            f"Seeded required skills: {json.dumps(required_skills[:12])}\n"
            f"Jobs: {_jobs_blob(jobs)}\n"
            f"RAG:\n" + "\n".join(rag_hits[:4])
        ),
        schema=AgentLLMResult,
        stub_factory=stub,
    )
    return AgentOutput(name="SkillGapAgent", **result.model_dump())


def learning_planner_agent(
    gaps: list[str],
    target_role: str,
    rag_hits: list[str],
    seniority_level: str = "Junior",
    stack_emphasis: list[str] | None = None,
) -> AgentOutput:
    def stub() -> AgentLLMResult:
        stack_note = ", ".join(stack_emphasis or [])
        recs = [
            f"Complete a hands-on module on {gap} and push evidence to GitHub."
            for gap in gaps[:4]
        ] or [f"Advance with one portfolio project scoped to {target_role}."]
        if stack_note:
            recs.insert(0, f"Portfolio project suggestion: build one artifact focused on {stack_note}.")
        return AgentLLMResult(
            recommendations=recs,
            evidence=rag_hits[:4] or ["Roadmap derived from ranked skill gaps."],
        )

    result = invoke_structured(
        system=(
            "You are LearningPlannerAgent for IT upskilling. Produce a prioritized learning roadmap "
            "with hands-on projects (not passive courses). Cite RAG materials in evidence."
        ),
        user=(
            f"{_role_context(target_role, seniority_level)}\n"
            f"{_stack_context(stack_emphasis)}\n"
            f"Gaps: {gaps}\n"
            f"RAG learning/guidance:\n" + "\n".join(rag_hits[:6])
        ),
        schema=AgentLLMResult,
        stub_factory=stub,
    )
    return AgentOutput(name="LearningPlannerAgent", **result.model_dump())


def resume_optimization_agent(
    profile: CandidateProfile,
    gaps: list[str],
    target_role: str,
    seniority_level: str = "Junior",
    stack_emphasis: list[str] | None = None,
) -> AgentOutput:
    def stub() -> AgentLLMResult:
        return AgentLLMResult(
            recommendations=[
                f"Rewrite the summary for {target_role} ({seniority_level}) in 3 lines with stack keywords.",
                "Add a targeted skills section reflecting role keywords from matched JDs.",
                "Rewrite project bullets as action + metric + stack.",
                *(
                    [f"Add GitHub link near projects showing {profile.github_url}"]
                    if profile.github_url
                    else ["Add a GitHub URL showcasing your best project."]
                ),
                *[f"Add concrete evidence of {gap} in projects or experience." for gap in gaps[:2]],
            ],
            evidence=[
                f"Current summary: {profile.summary[:160]}",
                f"Projects on file: {len(profile.projects)}",
                _portfolio_context(profile),
            ],
        )

    result = invoke_structured(
        system=(
            "You are ResumeOptimizationAgent for IT resumes. Propose role-specific edits tied to "
            "gaps and seniority. Reference GitHub/LinkedIn when provided."
        ),
        user=(
            f"{_role_context(target_role, seniority_level)}\n"
            f"{_stack_context(stack_emphasis)}\n"
            f"Gaps: {gaps}\nProfile:\n{_profile_blob(profile)}"
        ),
        schema=AgentLLMResult,
        stub_factory=stub,
    )
    return AgentOutput(name="ResumeOptimizationAgent", **result.model_dump())


def interview_coach_agent(
    target_role: str,
    gaps: list[str],
    rag_hits: list[str],
    seniority_level: str = "Junior",
    stack_emphasis: list[str] | None = None,
) -> AgentOutput:
    def stub() -> InterviewCoachResult:
        return InterviewCoachResult(
            coding=[
                f"Explain how you would implement a core {target_role} feature under time pressure.",
                *[f"Deep-dive: explain {gap} with a code or architecture example." for gap in gaps[:2]],
            ],
            system_design=[
                f"Design a scalable service relevant to {target_role} (API, data store, deployment).",
            ],
            behavioral=[
                "STAR story: conflict on a team project and how you resolved it.",
                "Describe a production bug or failed deployment you fixed.",
            ],
            take_home=[
                f"Prepare a 2–4 hour take-home scope: small {target_role} feature with tests and README.",
            ],
            evidence=rag_hits[:4] or ["Interview themes derived from IT role corpus."],
        )

    result = invoke_structured(
        system=(
            "You are InterviewCoachAgent for IT hiring. Return categorized practice prompts: "
            "coding (technical), system_design (architecture/practical for backend/devops/cloud), "
            "behavioral (STAR), take_home (timed project scopes). Tailor to seniority and gaps. "
            "Include evidence from RAG."
        ),
        user=(
            f"{_role_context(target_role, seniority_level)}\n"
            f"{_stack_context(stack_emphasis)}\n"
            f"Gaps: {gaps}\nRAG:\n" + "\n".join(rag_hits[:6])
        ),
        schema=InterviewCoachResult,
        stub_factory=stub,
    )
    tags = {
        "coding": result.coding,
        "system_design": result.system_design,
        "behavioral": result.behavioral,
        "take_home": result.take_home,
    }
    recommendations = [
        *result.coding[:3],
        *result.system_design[:2],
        *result.behavioral[:2],
        *result.take_home[:1],
    ]
    return AgentOutput(
        name="InterviewCoachAgent",
        recommendations=recommendations,
        evidence=result.evidence,
        interview_tags=tags,
    )


def compose_final_plan(
    profile: CandidateProfile,
    target_role: str,
    agent_outputs: list[AgentOutput],
    jobs: list[MatchedJob],
    rag_hits: list[str],
    prior_memory: str,
    seniority_level: str = "Junior",
    stack_emphasis: list[str] | None = None,
) -> SevenDayPlanResult:
    def stub() -> SevenDayPlanResult:
        gaps = next((a.gaps for a in agent_outputs if a.name == "SkillGapAgent"), [])
        top_gap = gaps[0] if gaps else "role fundamentals"
        score = max(28, min(92, 48 + len(profile.skills) * 6 - len(gaps) * 7))
        days = [
            f"Day 1: Refine resume and LinkedIn headline for {target_role} ({seniority_level}).",
            f"Day 2: Study {top_gap} using retrieved learning guidance.",
            f"Day 3: Ship a GitHub artifact proving {top_gap}.",
            "Day 4: Update resume bullets with metrics, stack tags, and project evidence.",
            f"Day 5: Run technical/coding interview drills for {target_role}.",
            f"Day 6: System design or practical interview prep"
            + (" + apply to matched roles" if jobs else "."),
            f"Day 7: Apply to top matched roles"
            + (f" (start with {jobs[0].label})" if jobs else " and review sprint progress."),
        ]
        note = (
            "7-Day Hiring Sprint ranked by role relevance and missing-skill impact, "
            "grounded in job listings and RAG evidence."
        )
        if prior_memory:
            note += " Adjusted using prior analysis memory for this candidate."
        return SevenDayPlanResult(days=days, decision_note=note, readiness_score=score)

    result = invoke_structured(
        system=(
            "You are the CareerPilot Orchestrator composer for IT professionals. Produce an "
            "explainable 7-Day Hiring Sprint (exactly 7 day strings starting with 'Day N:'), "
            "a readiness_score 0-100, and a decision_note. Follow this IT sprint cadence:\n"
            f"{HIRING_SPRINT_TEMPLATE}\n"
            "Ground the plan in agent outputs, jobs, seniority, and RAG. If prior memory exists, "
            "note what changed since the last analysis."
        ),
        user=(
            f"{_role_context(target_role, seniority_level)}\n"
            f"{_stack_context(stack_emphasis)}\n"
            f"{_portfolio_context(profile)}\n"
            f"Profile:\n{_profile_blob(profile)}\n"
            f"Agent outputs:\n{json.dumps([a.model_dump() for a in agent_outputs], indent=2)}\n"
            f"Jobs:\n{_jobs_blob(jobs)}\n"
            f"RAG:\n" + "\n".join(rag_hits[:4]) + "\n"
            f"Prior memory:\n{prior_memory or 'None'}"
        ),
        schema=SevenDayPlanResult,
        stub_factory=stub,
    )
    days = list(result.days)[:7]
    while len(days) < 7:
        days.append(f"Day {len(days) + 1}: Review sprint progress and iterate on remaining gaps.")
    result.days = days
    result.readiness_score = max(0, min(100, int(result.readiness_score)))
    return result
