# CareerPilot Quick Start

One-page guide to run the monorepo locally and prepare for deploy.

## Prerequisites

- Python 3.11+ (3.12 works)
- Node.js 18+
- PostgreSQL running locally
- Git

## 1) Backend setup (first time)

```powershell
cd C:\Users\ASUS\Desktop\Invictus\backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Edit `backend/.env`:
- set `POSTGRES_PASSWORD`
- set matching `DATABASE_URL`
- keep `CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173` for local UI

Then initialize DB:

```powershell
python scripts\setup_postgres.py
```

## 2) Start backend

```powershell
cd C:\Users\ASUS\Desktop\Invictus\backend
.\.venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API: http://127.0.0.1:8000
- Docs: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health

Notes:
- Analysis is async: `POST /analyze` returns `job_id`
- Poll progress: `GET /jobs/{job_id}`
- Fetch report: `GET /reports/{report_id}`
- With `CELERY_USE_THREAD_FALLBACK=1`, you do **not** need a Celery worker for local MVP

Optional Celery worker (only if `CELERY_USE_THREAD_FALLBACK=0`):

```powershell
cd C:\Users\ASUS\Desktop\Invictus\backend
.\.venv\Scripts\activate
celery -A app.workers.celery_app.celery_app worker --loglevel=INFO --pool=solo
```

## 3) Frontend setup (first time)

```powershell
cd C:\Users\ASUS\Desktop\Invictus\frontend
npm install
copy .env.example .env
```

`frontend/.env` should contain:

```env
VITE_API_BASE=http://127.0.0.1:8000
```

## 4) Start frontend

```powershell
cd C:\Users\ASUS\Desktop\Invictus\frontend
npm run dev
```

- UI: http://127.0.0.1:5173

Flow: **Upload Resume → Run Async Analysis → Dashboard**

## 5) Useful checks

Backend tests:

```powershell
cd C:\Users\ASUS\Desktop\Invictus\backend
.\.venv\Scripts\python -m pytest -q
```

Frontend production build:

```powershell
cd C:\Users\ASUS\Desktop\Invictus\frontend
npm run build
```

## Deploy notes (monorepo = OK)

Deploy as **two services** from one repo:

1. **Backend service**
   - Root directory: `backend`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
   - Env:
     - `DATABASE_URL=...`
     - `CORS_ORIGINS=https://your-frontend-domain`
     - `CELERY_USE_THREAD_FALLBACK=1` (MVP)

2. **Frontend service**
   - Root directory: `frontend`
   - Build: `npm run build`
   - Output: `dist`
   - Env at build time:
     - `VITE_API_BASE=https://your-backend-domain`

Never commit real `.env` files. Commit only `.env.example`.

## Interview one-liner

> We use an Orchestrator-driven Multi-Agent Pipeline with event-driven async processing, built on FastAPI.
