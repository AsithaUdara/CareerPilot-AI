# CareerPilot AI

**Multi-agent Career Readiness Operating System** 

CareerPilot turns a real resume into an **explainable hiring decision**: readiness score, evidence-backed skill gaps, live/curated job matches, a 7-day hiring sprint, interview drills, and mentor coaching — powered by a **LangGraph multi-agent pipeline**, not a single-prompt chatbot.

<p align="center">
  <img src="docs/images/careerpilot-pipeline.png" alt="CareerPilot AI Pipeline — User Input, FastAPI/Celery/LangGraph, six Gemini agents, RAG, Adzuna jobs → Explainable Readiness Report" width="920" />
</p>

**Quick links:** [Setup](#setup) · [Agent workflow](#ai-agent-workflow) · [Features](#core-features) · [Architecture docs](docs/architecture-event-driven.md) · [Quick start](docs/QUICK_START.md)

---

## Problem

Students and early-career engineers get generic advice. They need a system that answers:

1. **Where do I stand** for a target IT role?
2. **What is blocking** interviews or offers?
3. **What should I do this week** to close the gap?

CareerPilot answers those with a real multi-step agent pipeline, tools, and memory across analyses.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React + Vite + TypeScript + SCSS |
| API | FastAPI |
| Orchestration | LangGraph multi-agent graph |
| Async jobs | Celery (thread fallback for local MVP) |
| LLM | Google Gemini (`langchain-google-genai`) |
| RAG | Qdrant + Gemini embeddings over career knowledge |
| Jobs | Adzuna live API + curated real JD fallback |
| Database | PostgreSQL |
| Auth | Email/password + optional Google Sign-In (JWT) |

---

## AI agent workflow

Six specialized Gemini agents run under a **LangGraph orchestrator**:

```text
Resume Analysis
  → Job Matching (Adzuna + curated JDs + RAG)
  → Skill Gap ranking
  → Learning Planner (RAG-grounded roadmap)
  → Resume Optimization
  → Interview Coach
  → Report Composition (explainable readiness report)
```

| Agent | Responsibility |
| --- | --- |
| **Resume Analysis** | Structure skills, education, projects, experience |
| **Job Matching** | Score live Adzuna listings; fall back to curated real JDs |
| **Skill Gap** | Rank missing competencies by hiring impact with evidence |
| **Learning Planner** | Build a prioritized roadmap from RAG knowledge |
| **Resume Optimization** | Role-targeted CV edits and talking points |
| **Interview Coach** | Practice prompts aligned to gaps and target role |

**Tools used by agents:** resume parse/guard, Adzuna search, curated JD query, Gemini embeddings RAG, report compose + PDF export.

**Memory:** re-analysis loads prior context; Analytics tracks score/gap trends over time.

> note: agent logic is **real and running** (Gemini + LangGraph). `CAREERPILOT_USE_STUB_LLM=1` is for automated tests only — demos must keep stub mode off.

---

## Core features

- **Upload & verify** — PDF / DOCX / TXT with resume-vs-document guard and profile verification before analysis
- **Multi-agent analysis** — live stage progress for the six-agent pipeline
- **Analysis workspace**
  - Overview — score, gaps, matched jobs, next actions
  - Readiness — explainability and agent insights
  - Skill Gaps — impact-ranked gaps + learning roadmap
  - Hiring Sprint — 7-day plan, interview drills, resume tips
  - AI Mentor — report-grounded coaching chat
  - Reports — history, compare, branded PDF export
  - Analytics — score timeline, recurring gaps, progress insights
- **Live jobs** — Adzuna primary; curated real company JDs if live search is unavailable
- **Auth** — optional Google Sign-In / email auth with candidate ownership

---

## Project structure

```text
careerpilot/
├── backend/          # FastAPI, LangGraph, agents, RAG, Celery, Alembic
├── frontend/         # React (Vite) Analysis workspace UI
├── docs/             # Architecture, quick start, pipeline diagram
└── docker-compose.yml
```

---

## Setup

### Prerequisites

- Python 3.11+ (3.12 OK)
- Node.js 18+
- PostgreSQL
- [Google AI Studio](https://aistudio.google.com/apikey) API key
- Optional: [Adzuna](https://developer.adzuna.com/) `APP_ID` + `APP_KEY`

### 1) Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Edit `backend/.env`:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` / Postgres vars | Yes | Match your local Postgres password |
| `GOOGLE_API_KEY` | Yes | Real Gemini agents |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | Optional | Live jobs; curated fallback otherwise |
| `ADZUNA_COUNTRY` | Optional | Default `gb` (API needs a country code, not “Europe”) |
| `CAREERPILOT_USE_STUB_LLM` | Keep `0` | Tests set stub mode themselves |
| `SSL_VERIFY` | Optional | Set `0` on Windows if HTTPS cert verify fails locally |
| `AUTH_DISABLED` | Dev default `1` | Set `0` when OAuth/email auth is configured |

```powershell
python scripts\setup_postgres.py
python scripts\seed_knowledge.py --force
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API: http://127.0.0.1:8000  
- Docs: http://127.0.0.1:8000/docs  
- Health: http://127.0.0.1:8000/health → expect `gemini_configured: true`, `stub_llm: false`

Optional Celery worker (only if `CELERY_USE_THREAD_FALLBACK=0`):

```powershell
celery -A app.workers.celery_app.celery_app worker --loglevel=INFO --pool=solo
```

### 2) Frontend

```powershell
cd frontend
npm install
copy .env.example .env
```

`frontend/.env`:

```env
VITE_API_BASE=http://127.0.0.1:8000
```

```powershell
npm run dev
```

UI: http://127.0.0.1:5173

More detail: [docs/QUICK_START.md](docs/QUICK_START.md)

---

## Verify the prototype

1. Open `/health` — `gemini_configured: true`, `stub_llm: false` (and `adzuna_configured: true` if keys are set)
2. Upload a real CV → verify profile → **Analyse**
3. Watch named agent stages complete
4. Explore Analysis: Overview → Gaps → Hiring Sprint → Mentor → Reports → Analytics
5. Confirm matched jobs show `live` / `live+curated` when Adzuna works, or `curated` fallback

---

## Tests

```powershell
cd backend
.\.venv\Scripts\python -m pytest -q
```

CI uses SQLite + stub LLM so live Gemini/Adzuna keys are not required for tests.

```powershell
cd frontend
npm run build
```

---

## Licensing / third-party services

- Google Gemini API — [Google AI Studio](https://aistudio.google.com/)
- Adzuna Jobs API — [developer.adzuna.com](https://developer.adzuna.com/)
- Frameworks: FastAPI, LangGraph/LangChain, Celery, React, Qdrant, PostgreSQL

Ensure your competition submission complies with each provider’s terms. Do **not** commit `backend/.env` (API keys).

---

## Future plans (next phase)

- Broader live job coverage and multi-country Adzuna search
- Stronger institutional / mentor dashboards
- Deeper mentoring evaluation loops and progress coaching
- Production hardening (deploy, monitoring, auth-by-default)
- Richer RAG corpus (courses, role playbooks, company patterns)

---

## Team / competition

Built for **Idealize 2026 — Open Category** (AIESEC in University of Moratuwa): a functioning multi-agent system with real reasoning, tool use, and multi-step workflows aligned to the original Career Readiness OS proposal.
