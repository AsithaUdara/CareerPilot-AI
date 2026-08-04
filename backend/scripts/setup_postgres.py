"""Create the CareerPilot database (if missing) and apply Alembic migrations."""

from __future__ import annotations

import os
import sys
from pathlib import Path
from urllib.parse import urlparse, urlunparse

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))
load_dotenv(BACKEND_ROOT / ".env")


def _admin_url(database_url: str) -> str:
    """Point DATABASE_URL at the default `postgres` maintenance DB."""
    parsed = urlparse(database_url)
    return urlunparse(parsed._replace(path="/postgres"))


def _target_db_name(database_url: str) -> str:
    parsed = urlparse(database_url)
    name = parsed.path.lstrip("/")
    if not name:
        raise SystemExit("DATABASE_URL must include a database name, e.g. .../careerpilot")
    return name


def build_database_url() -> str:
    explicit = os.getenv("DATABASE_URL")
    if explicit and "CHANGE_ME" not in explicit:
        return explicit

    from urllib.parse import quote_plus

    user = os.getenv("POSTGRES_USER", "postgres")
    password = quote_plus(os.getenv("POSTGRES_PASSWORD", ""))
    host = os.getenv("POSTGRES_HOST", "127.0.0.1")
    port = os.getenv("POSTGRES_PORT", "5432")
    db = os.getenv("POSTGRES_DB", "careerpilot")
    if not password or password == "CHANGE_ME":
        raise SystemExit(
            "Set POSTGRES_PASSWORD (and preferably DATABASE_URL) in backend/.env, then re-run."
        )
    return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{db}"


def ensure_database(database_url: str) -> None:
    if database_url.startswith("sqlite"):
        print("SQLite URL detected — skipping Postgres database creation.")
        return

    db_name = _target_db_name(database_url)
    admin_engine = create_engine(_admin_url(database_url), isolation_level="AUTOCOMMIT", future=True)
    with admin_engine.connect() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :name"),
            {"name": db_name},
        ).scalar()
        if exists:
            print(f"Database '{db_name}' already exists.")
        else:
            conn.execute(text(f'CREATE DATABASE "{db_name}"'))
            print(f"Created database '{db_name}'.")
    admin_engine.dispose()


def run_migrations(database_url: str) -> None:
    from alembic import command
    from alembic.config import Config

    # Ensure Alembic env sees the resolved URL.
    os.environ["DATABASE_URL"] = database_url
    cfg = Config(str(BACKEND_ROOT / "alembic.ini"))
    command.upgrade(cfg, "head")
    print("Alembic migrations applied (head).")


def verify_connection(database_url: str) -> None:
    verify_engine = create_engine(database_url, future=True, pool_pre_ping=True)
    with verify_engine.connect() as conn:
        one = conn.execute(text("SELECT 1")).scalar()
        tables = conn.execute(
            text(
                "SELECT tablename FROM pg_tables "
                "WHERE schemaname = 'public' ORDER BY tablename"
            )
        ).fetchall()
    verify_engine.dispose()
    print(f"Connection OK (SELECT 1 => {one}).")
    print("Public tables: " + (", ".join(t[0] for t in tables) if tables else "(none)"))


def seed_knowledge() -> None:
    from app.db import get_session
    from app.repositories.knowledge_repository import seed_knowledge_base

    with get_session() as session:
        result = seed_knowledge_base(session)
    print(
        "Knowledge seed: "
        f"jobs={result['jobs']} skills={result['skills']} "
        f"docs={result['knowledge_docs']} seeded={result['seeded']}"
    )


def main() -> None:
    database_url = build_database_url()
    if "CHANGE_ME" in database_url:
        raise SystemExit(
            "Replace CHANGE_ME in backend/.env with your local PostgreSQL password, then re-run."
        )

    print("Using DATABASE_URL from backend/.env ...")
    ensure_database(database_url)
    run_migrations(database_url)
    # Ensure app.db picks up the resolved URL for seeding.
    os.environ["DATABASE_URL"] = database_url
    seed_knowledge()
    verify_connection(database_url)
    print("Postgres setup complete.")


if __name__ == "__main__":
    main()
