from __future__ import annotations

import json

from app.schemas import (
    AgentLLMResult,
    AgentOutput,
    CandidateProfile,
    MatchedJob,
    SevenDayPlanResult,
)
from app.services.llm import invoke_structured


def _profile_blob(profile: CandidateProfile) -> str:
    return json.dumps(profile.model_dump(), indent=2)


def _jobs_blob(jobs: list[MatchedJob]) -> str:
    return json.dumps([j.model_dump() for j in jobs[:8]], indent=2)


def resume_analysis_agent(
    profile: CandidateProfile,
    target_role: str,
    prior_memory: str = "",
) -> AgentOutput:
    def stub() -> AgentLLMResult:
        return AgentLLMResult(
            strengths=profile.skills[:4] or ["Transferable foundation from resume content"],
            gaps=[] if profile.projects else ["Limited project evidence on resume"],
            recommendations=[
                "Clarify impact metrics for each project bullet.",
                f"Align professional summary with {target_role} outcomes.",
            ],
            evidence=[
                f"Summary excerpt: {profile.summary[:180]}",
                f"Skills extracted: {', '.join(profile.skills[:8]) or 'none'}",
            ],
        )

    result = invoke_structured(
        system=(
            "You are ResumeAnalysisAgent in CareerPilot. Critique and strengthen the "
            "candidate profile for the target role. Cite concrete resume evidence. "
            "Do not invent employers or skills not present in the profile."
        ),
        user=(
            f"Target role: {target_role}\n"
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
            strengths=[f"{hint} match potential for {target_role}", best[1].label],
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
            "You are JobMatchingAgent. Rank fit against the provided real job listings. "
            "Use required skills and JD snippets as evidence. Mention source live vs curated. "
            "Never invent companies not in the job list."
        ),
        user=(
            f"Target role: {target_role}\n"
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
            # Derive from jobs
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
                f"Close top {len(missing)} role-critical gaps for {target_role}."
            ]
            if missing
            else [f"Core skill coverage looks solid for {target_role}."],
            evidence=evidence[:6] or rag_hits[:3] or ["Compared profile skills to role requirements."],
        )

    result = invoke_structured(
        system=(
            "You are SkillGapAgent. Identify the highest-impact missing competencies for hiring. "
            "Rank gaps by impact. Cite JD requirements and RAG guidance as evidence."
        ),
        user=(
            f"Target role: {target_role}\n"
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
) -> AgentOutput:
    def stub() -> AgentLLMResult:
        recs = [
            f"Complete a guided module on {gap} and ship a mini project proving it."
            for gap in gaps[:4]
        ] or [f"Advance with one portfolio project tightly scoped to {target_role}."]
        return AgentLLMResult(
            recommendations=recs,
            evidence=rag_hits[:4] or ["Roadmap derived from ranked skill gaps."],
        )

    result = invoke_structured(
        system=(
            "You are LearningPlannerAgent. Produce a prioritized learning roadmap grounded in "
            "retrieved learning materials. Cite source titles from RAG in evidence. "
            "Do not invent course brand names unless they appear in the RAG context."
        ),
        user=(
            f"Target role: {target_role}\n"
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
) -> AgentOutput:
    def stub() -> AgentLLMResult:
        return AgentLLMResult(
            recommendations=[
                f"Rewrite the summary to target {target_role} outcomes in 3 lines.",
                "Add a targeted skills section reflecting role keywords from matched JDs.",
                "Rewrite project bullets as action + metric + stack.",
                *[f"Add concrete evidence of {gap} in projects or experience." for gap in gaps[:3]],
            ],
            evidence=[
                f"Current summary: {profile.summary[:160]}",
                f"Projects on file: {len(profile.projects)}",
            ],
        )

    result = invoke_structured(
        system=(
            "You are ResumeOptimizationAgent. Propose role-specific resume edits tied to gaps. "
            "Be concrete and actionable. Reference existing projects/experience when possible."
        ),
        user=(
            f"Target role: {target_role}\nGaps: {gaps}\nProfile:\n{_profile_blob(profile)}"
        ),
        schema=AgentLLMResult,
        stub_factory=stub,
    )
    return AgentOutput(name="ResumeOptimizationAgent", **result.model_dump())


def interview_coach_agent(
    target_role: str,
    gaps: list[str],
    rag_hits: list[str],
) -> AgentOutput:
    def stub() -> AgentLLMResult:
        return AgentLLMResult(
            recommendations=[
                f"Practice 5 {target_role} technical questions with timed answers.",
                "Prepare one STAR story covering teamwork and a hard trade-off.",
                *[f"Drill a deep-dive question on {gap}." for gap in gaps[:3]],
                "Record one mock interview and review clarity under time pressure.",
            ],
            evidence=rag_hits[:4] or ["Interview themes derived from role corpus."],
        )

    result = invoke_structured(
        system=(
            "You are InterviewCoachAgent. Create personalized practice prompts aligned to the "
            "target role and skill gaps. Cite interview RAG materials in evidence."
        ),
        user=(
            f"Target role: {target_role}\nGaps: {gaps}\nRAG:\n" + "\n".join(rag_hits[:6])
        ),
        schema=AgentLLMResult,
        stub_factory=stub,
    )
    return AgentOutput(name="InterviewCoachAgent", **result.model_dump())


def compose_final_plan(
    profile: CandidateProfile,
    target_role: str,
    agent_outputs: list[AgentOutput],
    jobs: list[MatchedJob],
    rag_hits: list[str],
    prior_memory: str,
) -> SevenDayPlanResult:
    def stub() -> SevenDayPlanResult:
        gaps = next((a.gaps for a in agent_outputs if a.name == "SkillGapAgent"), [])
        top_gap = gaps[0] if gaps else "role fundamentals"
        score = max(28, min(92, 48 + len(profile.skills) * 6 - len(gaps) * 7))
        days = [
            f"Day 1: Refine resume summary and keywords for {target_role}.",
            f"Day 2: Study {top_gap} using retrieved learning guidance.",
            f"Day 3: Build a mini project artifact proving {top_gap}.",
            "Day 4: Add project evidence and metrics to the resume.",
            f"Day 5: Practice {target_role} interview prompts from the coach agent.",
            f"Day 6: Apply to 3 high-alignment roles"
            + (f" starting with {jobs[0].label}." if jobs else "."),
            "Day 7: Review progress, update gaps, and set next-week goals.",
        ]
        note = (
            "Recommendations ranked by role relevance and missing-skill impact, "
            "grounded in job listings and RAG evidence."
        )
        if prior_memory:
            note += " Adjusted using prior analysis memory for this candidate."
        return SevenDayPlanResult(days=days, decision_note=note, readiness_score=score)

    result = invoke_structured(
        system=(
            "You are the CareerPilot Orchestrator composer. Produce an explainable 7-day action "
            "plan (exactly 7 day strings), a readiness_score 0-100, and a decision_note. "
            "Ground the plan in agent outputs, jobs, and RAG. If prior memory exists, mention "
            "what should change next versus previous guidance."
        ),
        user=(
            f"Target role: {target_role}\n"
            f"Profile:\n{_profile_blob(profile)}\n"
            f"Agent outputs:\n{json.dumps([a.model_dump() for a in agent_outputs], indent=2)}\n"
            f"Jobs:\n{_jobs_blob(jobs)}\n"
            f"RAG:\n" + "\n".join(rag_hits[:4]) + "\n"
            f"Prior memory:\n{prior_memory or 'None'}"
        ),
        schema=SevenDayPlanResult,
        stub_factory=stub,
    )
    # Ensure exactly 7 days for UI contract.
    days = list(result.days)[:7]
    while len(days) < 7:
        days.append(f"Day {len(days) + 1}: Review progress and iterate on remaining gaps.")
    result.days = days
    result.readiness_score = max(0, min(100, int(result.readiness_score)))
    return result
