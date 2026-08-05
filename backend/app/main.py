from pathlib import Path
from uuid import uuid4
from contextlib import asynccontextmanager
import os

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app import models  # noqa: F401
from app.config import get_settings
from app.constants import IT_TARGET_ROLES, SENIORITY_LEVELS
from app.db import DATABASE_URL, engine, get_session
from app.repositories.job_repository import get_job
from app.repositories.knowledge_repository import seed_knowledge_base
from app.repositories.profile_repository import (
    get_profile,
    list_profiles_for_user,
    save_profile,
)
from app.repositories.report_repository import get_report, list_reports_for_candidate
from app.schemas import (
    AnalysisJobStatus,
    AnalyzeJobAccepted,
    AnalyzeRequest,
    AuthTokenResponse,
    AuthUserResponse,
    CandidateSummary,
    CareerAnalyticsResponse,
    CareerReadinessReport,
    GoogleAuthRequest,
    MentorChatRequest,
    MentorChatResponse,
    ReportSummary,
    ResumeUploadResponse,
    WorkspaceInsightsResponse,
)
from app.services.analytics import candidate_career_analytics, workspace_insights
from app.services.auth import (
    AuthUser,
    assert_candidate_access,
    create_access_token,
    require_user,
    upsert_google_user,
    verify_google_id_token,
)
from app.services.dispatcher import enqueue_analysis_job
from app.services.mentor import mentor_reply
from app.services.resume_parser import parse_resume, read_resume_text

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


def _cors_origins() -> list[str]:
    raw = os.getenv(
        "CORS_ORIGINS",
        "http://127.0.0.1:5173,http://localhost:5173",
    )
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


@asynccontextmanager
async def lifespan(_: FastAPI):
    from app.db import Base

    Base.metadata.create_all(bind=engine)
    with get_session() as session:
        seed_knowledge_base(session)
    yield


app = FastAPI(
    title="CareerPilot AI",
    description=(
        "LangGraph Orchestrator-driven Multi-Agent Pipeline with Gemini, "
        "RAG, live job tools, and event-driven Celery processing."
    ),
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/meta/it-roles")
def list_it_roles() -> list[str]:
    return list(IT_TARGET_ROLES)


@app.get("/meta/seniority-levels")
def list_seniority_levels() -> list[str]:
    return list(SENIORITY_LEVELS)


@app.get("/health")
def health() -> dict:
    settings = get_settings()
    db_status = "ok"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:  # pragma: no cover
        db_status = f"error: {exc.__class__.__name__}"
    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "database": db_status,
        "database_driver": DATABASE_URL.split(":", 1)[0],
        "architecture": "langgraph-multi-agent-pipeline-event-driven",
        "gemini_configured": settings.gemini_configured,
        "adzuna_configured": settings.adzuna_configured,
        "stub_llm": settings.use_stub_llm,
        "auth_required": settings.auth_required,
    }


@app.post("/auth/google", response_model=AuthTokenResponse)
def auth_google(payload: GoogleAuthRequest) -> AuthTokenResponse:
    claims = verify_google_id_token(payload.id_token)
    with get_session() as session:
        user = upsert_google_user(session, claims)
        token = create_access_token(user.id, user.email)
        return AuthTokenResponse(
            access_token=token,
            user=AuthUserResponse(
                id=user.id,
                email=user.email,
                name=user.name,
                picture_url=user.picture_url or "",
            ),
        )


@app.get("/auth/me", response_model=AuthUserResponse)
def auth_me(user: AuthUser | None = Depends(require_user)) -> AuthUserResponse:
    if not user:
        raise HTTPException(status_code=401, detail="Sign in with Google to continue.")
    return AuthUserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        picture_url=user.picture_url or "",
    )


@app.get("/me/candidates", response_model=list[CandidateSummary])
def my_candidates(user: AuthUser | None = Depends(require_user)) -> list[CandidateSummary]:
    if not user:
        raise HTTPException(status_code=401, detail="Sign in with Google to continue.")
    with get_session() as session:
        rows = list_profiles_for_user(session, user.id)
        return [
            CandidateSummary(
                candidate_id=row.candidate_id,
                filename=row.filename,
                summary=(row.summary or "")[:280],
                created_at=row.created_at.isoformat() if row.created_at else None,
            )
            for row in rows
        ]


@app.get("/me/reports", response_model=list[ReportSummary])
def my_reports(user: AuthUser | None = Depends(require_user)) -> list[ReportSummary]:
    if not user:
        raise HTTPException(status_code=401, detail="Sign in with Google to continue.")
    with get_session() as session:
        profiles = list_profiles_for_user(session, user.id)
        summaries: list[ReportSummary] = []
        for profile in profiles:
            for row in list_reports_for_candidate(session, profile.candidate_id):
                summaries.append(ReportSummary(**row))
        summaries.sort(key=lambda item: item.created_at or "", reverse=True)
        return summaries


@app.post("/resume/upload", response_model=ResumeUploadResponse)
async def upload_resume(
    file: UploadFile = File(...),
    github_url: str = Form(""),
    linkedin_url: str = Form(""),
    user: AuthUser | None = Depends(require_user),
) -> ResumeUploadResponse:
    candidate_id = str(uuid4())
    target = UPLOAD_DIR / f"{candidate_id}_{file.filename}"

    content = await file.read()
    target.write_bytes(content)
    raw_text = read_resume_text(target)
    profile = parse_resume(
        candidate_id,
        file.filename or "resume",
        raw_text,
        github_url=github_url,
        linkedin_url=linkedin_url,
    )
    with get_session() as session:
        save_profile(
            session,
            file.filename or "resume",
            profile,
            user_id=user.id if user else None,
        )

    return ResumeUploadResponse(
        candidate_id=candidate_id,
        filename=file.filename or "resume",
        message="Resume uploaded and parsed with structured profile extraction.",
        profile=profile,
    )


@app.get("/candidates/{candidate_id}/profile")
def fetch_profile(
    candidate_id: str,
    user: AuthUser | None = Depends(require_user),
):
    with get_session() as session:
        assert_candidate_access(session, candidate_id, user)
        profile = get_profile(session, candidate_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Candidate profile not found.")
    return profile


@app.post("/analyze", response_model=AnalyzeJobAccepted)
def analyze(
    payload: AnalyzeRequest,
    user: AuthUser | None = Depends(require_user),
) -> AnalyzeJobAccepted:
    """Enqueue analysis job (non-blocking). Poll GET /jobs/{job_id} for progress."""
    settings = get_settings()
    try:
        settings.require_gemini()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    with get_session() as session:
        assert_candidate_access(session, payload.candidate_id, user)
        profile = get_profile(session, payload.candidate_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Candidate profile not found.")

    job_id = enqueue_analysis_job(
        payload.candidate_id,
        payload.target_role,
        payload.seniority_level,
        payload.stack_emphasis,
    )
    return AnalyzeJobAccepted(
        job_id=job_id,
        status="queued",
        message="Analysis job queued on Celery worker.",
    )


@app.get("/jobs/{job_id}", response_model=AnalysisJobStatus)
def fetch_job(
    job_id: str,
    user: AuthUser | None = Depends(require_user),
) -> AnalysisJobStatus:
    with get_session() as session:
        job = get_job(session, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found.")
        assert_candidate_access(session, job.candidate_id, user)
        return AnalysisJobStatus(
            job_id=job.job_id,
            candidate_id=job.candidate_id,
            target_role=job.target_role,
            seniority_level=(getattr(job, "seniority_level", "junior") or "junior").title(),
            status=job.status,
            stage=job.stage,
            progress=job.progress,
            message=job.message,
            report_id=job.report_id,
            error=job.error,
        )


@app.get("/reports/{report_id}", response_model=CareerReadinessReport)
def fetch_report(
    report_id: str,
    user: AuthUser | None = Depends(require_user),
) -> CareerReadinessReport:
    with get_session() as session:
        report = get_report(session, report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found.")
        assert_candidate_access(session, report.candidate_id, user)
    return report


@app.get("/reports/{report_id}/export.pdf")
def export_report_pdf(
    report_id: str,
    user: AuthUser | None = Depends(require_user),
):
    with get_session() as session:
        report = get_report(session, report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found.")
        assert_candidate_access(session, report.candidate_id, user)
    from app.services.report_export import render_report_pdf

    pdf_bytes = render_report_pdf(report)
    from fastapi.responses import Response

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="careerpilot-{report_id[:8]}.pdf"'},
    )


@app.get("/candidates/{candidate_id}/reports", response_model=list[ReportSummary])
def fetch_candidate_reports(
    candidate_id: str,
    user: AuthUser | None = Depends(require_user),
) -> list[ReportSummary]:
    with get_session() as session:
        assert_candidate_access(session, candidate_id, user)
        rows = list_reports_for_candidate(session, candidate_id)
    return [ReportSummary(**row) for row in rows]


@app.post("/mentor/chat", response_model=MentorChatResponse)
def mentor_chat(
    payload: MentorChatRequest,
    user: AuthUser | None = Depends(require_user),
) -> MentorChatResponse:
    settings = get_settings()
    try:
        settings.require_gemini()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    with get_session() as session:
        assert_candidate_access(session, payload.candidate_id, user)
        profile = get_profile(session, payload.candidate_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Candidate profile not found.")
        report = None
        if payload.report_id:
            report = get_report(session, payload.report_id)
        else:
            summaries = list_reports_for_candidate(session, payload.candidate_id)
            if summaries:
                report = get_report(session, summaries[0]["report_id"])

    return mentor_reply(
        message=payload.message.strip(),
        history=payload.history,
        report=report,
    )


@app.get("/candidates/{candidate_id}/analytics", response_model=CareerAnalyticsResponse)
def fetch_candidate_analytics(
    candidate_id: str,
    user: AuthUser | None = Depends(require_user),
) -> CareerAnalyticsResponse:
    with get_session() as session:
        assert_candidate_access(session, candidate_id, user)
        profile = get_profile(session, candidate_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Candidate profile not found.")
        return candidate_career_analytics(session, candidate_id)


@app.get("/workspace/insights", response_model=WorkspaceInsightsResponse)
def fetch_workspace_insights(
    user: AuthUser | None = Depends(require_user),
) -> WorkspaceInsightsResponse:
    _ = user
    with get_session() as session:
        return workspace_insights(session)
