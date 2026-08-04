"""Seed job/skill/knowledge tables from knowledge_seed.json."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))
load_dotenv(BACKEND_ROOT / ".env")

from app.db import get_session  # noqa: E402
from app.repositories.knowledge_repository import seed_knowledge_base  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed CareerPilot knowledge base")
    parser.add_argument("--force", action="store_true", help="Clear and re-seed all knowledge tables")
    args = parser.parse_args()

    with get_session() as session:
        result = seed_knowledge_base(session, force=args.force)
    print(
        "Knowledge seed complete: "
        f"jobs={result['jobs']} skills={result['skills']} "
        f"docs={result['knowledge_docs']} seeded={result['seeded']}"
    )


if __name__ == "__main__":
    main()
