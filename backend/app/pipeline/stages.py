from enum import Enum


class PipelineStage(str, Enum):
    QUEUED = "queued"
    RESUME_ANALYSIS = "resume_analysis"
    JOB_MATCHING = "job_matching"
    SKILL_GAPS = "skill_gaps"
    LEARNING_ROADMAP = "learning_roadmap"
    RESUME_OPTIMIZATION = "resume_optimization"
    INTERVIEW_COACH = "interview_coach"
    REPORT_COMPOSITION = "report_composition"
    COMPLETED = "completed"
    FAILED = "failed"


PIPELINE_ORDER = [
    PipelineStage.RESUME_ANALYSIS,
    PipelineStage.JOB_MATCHING,
    PipelineStage.SKILL_GAPS,
    PipelineStage.LEARNING_ROADMAP,
    PipelineStage.RESUME_OPTIMIZATION,
    PipelineStage.INTERVIEW_COACH,
    PipelineStage.REPORT_COMPOSITION,
    PipelineStage.COMPLETED,
]


def stage_progress(stage: PipelineStage) -> int:
    mapping = {
        PipelineStage.QUEUED: 5,
        PipelineStage.RESUME_ANALYSIS: 15,
        PipelineStage.JOB_MATCHING: 30,
        PipelineStage.SKILL_GAPS: 45,
        PipelineStage.LEARNING_ROADMAP: 60,
        PipelineStage.RESUME_OPTIMIZATION: 75,
        PipelineStage.INTERVIEW_COACH: 85,
        PipelineStage.REPORT_COMPOSITION: 95,
        PipelineStage.COMPLETED: 100,
        PipelineStage.FAILED: 100,
    }
    return mapping[stage]
