# Event-Driven Multi-Agent Architecture

CareerPilot backend uses an **Orchestrator-driven Multi-Agent Pipeline with event-driven async processing, built on FastAPI**.

## Patterns

| Pattern | Implementation |
|---|---|
| Orchestrator-Agent | `app/pipeline/orchestrator.py` coordinates specialized agents |
| Pipeline | Resume → Analysis → Matching → Gaps → Roadmap → Optimization → Interview → Report |
| Event-Driven | `POST /analyze` enqueues a job and returns `job_id` immediately |
| RAG | Agents retrieve role knowledge from Qdrant before generation |

## Flow

```text
Client
  -> POST /analyze (FastAPI)
  -> Persist analysis_jobs row (queued)
  -> Dispatch event (Celery worker OR background thread fallback)
  -> Stage progress written to analysis_jobs
  -> Client polls GET /jobs/{job_id}
  -> GET /reports/{report_id}
```

## Local runtime notes (Windows)

- Default Celery broker/result backend: SQLite files (`celery_broker.sqlite`, `celery_results.sqlite`)
- `CELERY_USE_THREAD_FALLBACK=1` keeps HTTP non-blocking even if no Celery worker is attached
- For true Celery worker mode:

```powershell
cd backend
.\.venv\Scripts\activate
$env:CELERY_USE_THREAD_FALLBACK="0"
celery -A app.workers.celery_app.celery_app worker --loglevel=INFO --pool=solo
```

## Interview answer

> We use an Orchestrator-driven Multi-Agent Pipeline with event-driven async processing, built on FastAPI.
