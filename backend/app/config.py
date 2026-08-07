from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_ROOT / ".env")


@lru_cache
def get_settings() -> "Settings":
    return Settings()


class Settings:
    """Runtime configuration for CareerPilot AI."""

    def __init__(self) -> None:
        self.google_api_key: str = (os.getenv("GOOGLE_API_KEY") or "").strip()
        self.gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-flash-latest").strip()
        self.gemini_embedding_model: str = os.getenv(
            "GEMINI_EMBEDDING_MODEL",
            "models/gemini-embedding-001",
        ).strip()
        self.adzuna_app_id: str = (os.getenv("ADZUNA_APP_ID") or "").strip()
        self.adzuna_app_key: str = (os.getenv("ADZUNA_APP_KEY") or "").strip()
        self.adzuna_country: str = (os.getenv("ADZUNA_COUNTRY") or "gb").strip().lower()
        self.adzuna_results_per_page: int = int(os.getenv("ADZUNA_RESULTS_PER_PAGE", "8"))
        qdrant_path = (os.getenv("QDRANT_PATH") or str(BACKEND_ROOT / "qdrant_data")).strip()
        self.qdrant_path: Path = Path(qdrant_path)
        # Explicit stub mode for tests only — never silent production fallback.
        self.use_stub_llm: bool = os.getenv("CAREERPILOT_USE_STUB_LLM", "0").strip() == "1"

        self.google_oauth_client_id: str = (os.getenv("GOOGLE_OAUTH_CLIENT_ID") or "").strip()
        self.jwt_secret: str = (os.getenv("JWT_SECRET") or "careerpilot-dev-secret-change-me").strip()
        self.jwt_expire_hours: int = int(os.getenv("JWT_EXPIRE_HOURS", "168"))
        # When true (tests / local without OAuth), candidate routes stay open.
        self.auth_disabled: bool = os.getenv("AUTH_DISABLED", "0").strip() == "1"

    @property
    def gemini_configured(self) -> bool:
        return bool(self.google_api_key) or self.use_stub_llm

    @property
    def adzuna_configured(self) -> bool:
        return bool(self.adzuna_app_id and self.adzuna_app_key)

    @property
    def auth_required(self) -> bool:
        return not self.auth_disabled

    def require_gemini(self) -> None:
        if not self.gemini_configured:
            raise RuntimeError(
                "GOOGLE_API_KEY is not configured. Set it in backend/.env "
                "(or enable CAREERPILOT_USE_STUB_LLM=1 for tests only)."
            )
