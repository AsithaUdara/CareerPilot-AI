# CareerPilot AI (Invictus)

Functional multi-agent **Career Readiness Operating System** aligned with the Invictus Open Category proposal.

- **Backend:** FastAPI + LangGraph orchestrator + six Gemini agents + Celery
- **Intelligence:** Google Gemini via LangChain, persistent Qdrant RAG, Adzuna live jobs + curated real JD fallback
- **Frontend:** React (Vite) end-to-end readiness workflow
- **Persistence:** PostgreSQL (profiles, jobs, reports, knowledge)

**Start here:** [docs/QUICK_START.md](docs/QUICK_START.md) · **Demo script:** [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)

## What it does

After uploading a resume, CareerPilot:

1. Extracts a structured candidate profile (skills, education, projects, experience)
2. Matches against live and/or curated real job listings
3. Explains strengths and priority skill gaps with evidence
4. Builds a learning roadmap grounded in RAG knowledge
5. Recommends resume optimizations and interview practice
6. Composes an explainable readiness report and 7-day action plan
7. Remembers prior analyses for the same candidate on re-run

## Project structure

- `backend/` — API, LangGraph orchestrator, agents, RAG, tools, workers
- `frontend/` — React UI (Upload, Dashboard, Readiness, Gaps, Plan, Reports)
- `docs/` — architecture, quick start, demo script
- `docker-compose.yml` — Postgres, Redis, API, worker, frontend

## Configure

1. Copy `backend/.env.example` → `backend/.env`
2. Set `POSTGRES_PASSWORD` / `DATABASE_URL`
3. Set `GOOGLE_API_KEY` (required for real analysis)
4. Optional: `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` for live jobs
5. Optional Google Sign-In: set `GOOGLE_OAUTH_CLIENT_ID` + matching `VITE_GOOGLE_CLIENT_ID`, set `AUTH_DISABLED=0`, and `JWT_SECRET`
6. Run:

```powershell
cd backend
.\.venv\Scripts\python scripts\setup_postgres.py
.\.venv\Scripts\python scripts\seed_knowledge.py --force
```

## Run backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Optional Celery worker:

```powershell
.\.venv\Scripts\celery -A app.workers.celery_app.celery_app worker --loglevel=INFO --pool=solo
```

API: http://127.0.0.1:8000

## Run frontend

```powershell
cd frontend
npm install
npm run dev
```

UI: http://127.0.0.1:5173

## Architecture

LangGraph pipeline stages:

`Resume Analysis → Job Matching → Skill Gaps → Learning Roadmap → Resume Optimization → Interview Coach → Report Composition`

Tools: resume parse, Adzuna search, curated JD query, Gemini embeddings RAG.

See `docs/architecture-event-driven.md`.

## Tests

```powershell
cd backend
.\.venv\Scripts\python -m pytest -q
```

Tests force SQLite + `CAREERPILOT_USE_STUB_LLM=1` (no live Gemini/Adzuna required).

## Prototype notes

- Resume parsing: `.txt`, `.pdf`, `.docx` + Gemini structured extraction
- Job matching: Adzuna primary, curated real JDs fallback (never invented toy companies)
- RAG: persistent local Qdrant with Gemini embeddings
- Reports include `matched_jobs`, `readiness_score`, evidence, and memory notes
