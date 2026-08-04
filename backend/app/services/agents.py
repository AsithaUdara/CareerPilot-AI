from app.schemas import AgentOutput, CandidateProfile


def _normalize(skill: str) -> str:
    return skill.strip().upper().replace("_", " ")


def resume_analysis_agent(profile: CandidateProfile) -> AgentOutput:
    return AgentOutput(
        name="ResumeAnalysisAgent",
        strengths=profile.skills[:4],
        recommendations=[
            "Clarify impact metrics for each project bullet.",
            "Align summary with target role outcomes.",
        ],
        evidence=["Extracted directly from uploaded resume content."],
    )


def job_matching_agent(
    profile: CandidateProfile,
    target_role: str,
    jobs: list[dict],
) -> AgentOutput:
    candidate_skills = {_normalize(skill) for skill in profile.skills}
    scored: list[tuple[float, dict]] = []
    for job in jobs:
        required = {_normalize(skill) for skill in job.get("required_skills", [])}
        if not required:
            overlap = 0.0
        else:
            overlap = len(candidate_skills & required) / len(required)
        scored.append((overlap, job))
    scored.sort(key=lambda item: item[0], reverse=True)

    if not scored:
        return AgentOutput(
            name="JobMatchingAgent",
            strengths=[],
            gaps=["No seeded jobs found for this role yet."],
            recommendations=["Add job listings for this target role in the knowledge base."],
            evidence=[],
        )

    best_score, best_job = scored[0]
    if best_score >= 0.7:
        score_hint = "High"
    elif best_score >= 0.4:
        score_hint = "Moderate"
    else:
        score_hint = "Low"

    evidence = [
        f"{job['label']} (match {int(score * 100)}%)"
        for score, job in scored[:3]
    ]
    return AgentOutput(
        name="JobMatchingAgent",
        strengths=[f"{score_hint} match potential for {target_role}"],
        gaps=[] if best_score >= 0.7 else ["Need stronger ATS keyword coverage from job descriptions."],
        recommendations=[f"Prioritize roles close to: {best_job['label']}"],
        evidence=evidence,
    )


def skill_gap_agent(
    profile: CandidateProfile,
    target_role: str,
    required_skills: list[dict],
) -> AgentOutput:
    candidate_skills = {_normalize(skill) for skill in profile.skills}
    missing: list[str] = []
    evidence: list[str] = []
    for item in required_skills:
        skill = item["skill"]
        if _normalize(skill) not in candidate_skills:
            missing.append(skill)
            if item.get("guidance"):
                evidence.append(f"{skill}: {item['guidance']}")
        if len(missing) >= 4:
            break

    return AgentOutput(
        name="SkillGapAgent",
        gaps=missing,
        recommendations=[f"Close top {len(missing)} role-critical gaps for {target_role}."]
        if missing
        else [f"Core skill coverage looks solid for {target_role}."],
        evidence=evidence or ["Mapped candidate skills against seeded role requirements."],
    )


def learning_planner_agent(gaps: list[str]) -> AgentOutput:
    recs = [f"Complete one guided module on {gap} and build mini project." for gap in gaps] or [
        "Advance with one portfolio-quality project tied to target role."
    ]
    return AgentOutput(
        name="LearningPlannerAgent",
        recommendations=recs,
        evidence=["Roadmap generated from ranked skill gaps."],
    )


def resume_optimization_agent(gaps: list[str]) -> AgentOutput:
    return AgentOutput(
        name="ResumeOptimizationAgent",
        recommendations=[
            "Add a targeted skills section reflecting role keywords.",
            "Rewrite project bullets with action + metric + stack pattern.",
            *[f"Include evidence of {gap} in projects/experience." for gap in gaps],
        ],
        evidence=["Optimization ties directly to role-alignment gaps."],
    )


def interview_coach_agent(target_role: str) -> AgentOutput:
    return AgentOutput(
        name="InterviewCoachAgent",
        recommendations=[
            f"Practice 5 {target_role} technical questions with timed answers.",
            "Prepare one STAR response for teamwork and challenge handling.",
            "Record one mock interview and review communication clarity.",
        ],
        evidence=["Questions derived from role context and common interview patterns."],
    )
