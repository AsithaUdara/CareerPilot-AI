# CareerPilot MVP Architecture

Modular monolith with a LangGraph multi-agent orchestration layer powered by Google Gemini.

## Modules

- `backend/app/main.py`: FastAPI entrypoint and APIs.
- `backend/app/pipeline/orchestrator.py`: LangGraph orchestrator coordinating six specialized agents.
- `backend/app/services/agents.py`: Gemini-backed agent implementations (structured JSON outputs).
- `backend/app/services/llm.py`: Shared Gemini chat + embedding factories (LangChain).
- `backend/app/services/rag.py`: Persistent Qdrant RAG with Gemini embeddings.
- `backend/app/services/tools.py`: Adzuna live job search + curated real JD fallback.
- `backend/app/services/memory.py`: Prior-report memory for re-analysis.
- `frontend/src/`: React readiness workflow (Upload → Dashboard → Gaps → Plan → Reports).

## API Endpoints

- `GET /health` — includes `gemini_configured` / `adzuna_configured`
- `POST /resume/upload` — returns structured `profile`
- `GET /candidates/{id}/profile`
- `POST /analyze` — requires Gemini (or explicit stub mode for tests)
- `GET /jobs/{id}`
- `GET /reports/{id}` — includes `matched_jobs`, `readiness_score`, evidence
- `GET /candidates/{id}/reports`

## Data Strategy

- PostgreSQL for profiles, analysis jobs, reports, curated jobs/skills/docs
- Persistent local Qdrant (`QDRANT_PATH`) for RAG
- Live Adzuna listings when keys are set; curated real JDs otherwise
