# CareerPilot Quick Start

One-page guide to run the monorepo locally and prepare for deploy.

## Prerequisites

- Python 3.11+ (3.12 works)
- Node.js 18+
- PostgreSQL running locally (or Docker Compose)
- Google AI Studio API key (`GOOGLE_API_KEY`) for Gemini agents
- Optional: [Adzuna developer](https://developer.adzuna.com/) keys for live job listings
- Git

## 1) Backend setup (first time)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Edit `backend/.env`:

- set `POSTGRES_PASSWORD` and matching `DATABASE_URL`
- set `GOOGLE_API_KEY` (required for real analysis)
- optionally set `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` (live jobs; curated real JDs used as fallback)
- keep `CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173` for local UI

Then initialize DB:

```powershell
python scripts\setup_postgres.py
python scripts\seed_knowledge.py --force
```

## 2) Start backend

```powershell
cd backend
.\.venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API: http://127.0.0.1:8000
- Docs: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health (`gemini_configured`, `adzuna_configured`)

Notes:

- Analysis is async: `POST /analyze` returns `job_id`
- Poll progress: `GET /jobs/{job_id}`
- Fetch report: `GET /reports/{report_id}`
- With `CELERY_USE_THREAD_FALLBACK=1`, you do **not** need a Celery worker for local MVP
- Without `GOOGLE_API_KEY`, `/analyze` returns HTTP 503 (no silent stub in production)

Optional Celery worker (only if `CELERY_USE_THREAD_FALLBACK=0`):

```powershell
cd backend
.\.venv\Scripts\activate
$env:CELERY_USE_THREAD_FALLBACK="0"
celery -A app.workers.celery_app.celery_app worker --loglevel=INFO --pool=solo
```

## 3) Frontend setup (first time)

```powershell
cd frontend
npm install
copy .env.example .env
```

`frontend/.env` should contain:

```env
VITE_API_BASE=http://127.0.0.1:8000
```

## 4) Start frontend

```powershell
cd frontend
npm run dev
```

- UI: http://127.0.0.1:5173

Flow: **Upload Resume → review extracted profile → Run Multi-Agent Analysis → Dashboard / Gaps / Plan / Reports**

## 5) Docker Compose (optional)

From repo root (with `GOOGLE_API_KEY` in the environment or a root `.env`):

```powershell
docker compose up --build
```

Services: Postgres, Redis, API, Celery worker, frontend (nginx).

## 6) Useful checks

Backend tests (uses `CAREERPILOT_USE_STUB_LLM=1` automatically):

```powershell
cd backend
.\.venv\Scripts\python -m pytest -q
```

Frontend production build:

```powershell
cd frontend
npm run build
```

Demo recording guide: [DEMO_SCRIPT.md](DEMO_SCRIPT.md)

## Licensing notes

- Google Gemini: follow Google AI / Gemini API terms for your API key usage.
- Adzuna: use only with a registered developer app; respect rate limits and attribution.
- Curated seed JDs are pattern-based summaries referencing public career pages — replace/expand with your own licensed corpus for production.

## Interview one-liner

> We use a LangGraph Orchestrator-driven Multi-Agent Pipeline with Gemini, tool calling (live jobs + RAG), candidate memory, and event-driven Celery processing on FastAPI.
