# PostgreSQL Setup

## Local service

Detected on this machine: PostgreSQL 17 (`postgresql-x64-17`).

## One-time wiring

1. Edit `backend/.env` and set your password in both:
   - `POSTGRES_PASSWORD`
   - `DATABASE_URL`
2. Run:

```powershell
cd backend
.\.venv\Scripts\python scripts\setup_postgres.py
```

## What the setup script does

1. Connects to the `postgres` maintenance database.
2. Creates `careerpilot` if it does not exist.
3. Runs Alembic `upgrade head` to create `candidate_profiles`.

## Verify

```powershell
curl.exe http://127.0.0.1:8000/health
```

Expected shape:

```json
{"status":"ok","database":"ok","database_driver":"postgresql+psycopg2"}
```
