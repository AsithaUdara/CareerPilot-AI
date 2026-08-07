"""Fix local Windows SSL issues before outbound HTTPS (Gemini, Adzuna, etc.).

Many Windows setups fail with CERTIFICATE_VERIFY_FAILED even when certifi is
installed (corporate proxy / antivirus MITM). Set SSL_VERIFY=0 in backend/.env
for local development only.
"""

from __future__ import annotations

import os
import ssl
from pathlib import Path


def configure_ssl() -> None:
    try:
        from dotenv import load_dotenv

        load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    except Exception:
        pass

    try:
        import certifi

        ca = certifi.where()
        os.environ.setdefault("SSL_CERT_FILE", ca)
        os.environ.setdefault("REQUESTS_CA_BUNDLE", ca)
        os.environ.setdefault("CURL_CA_BUNDLE", ca)
    except Exception:
        pass

    verify = (os.getenv("SSL_VERIFY") or "1").strip().lower()
    if verify not in {"0", "false", "no", "off"}:
        return

    # Local-dev escape hatch when the system trust store is broken.
    os.environ["SSL_CERT_FILE"] = ""
    os.environ["REQUESTS_CA_BUNDLE"] = ""
    os.environ["CURL_CA_BUNDLE"] = ""
    os.environ["PYTHONHTTPSVERIFY"] = "0"
    ssl._create_default_https_context = ssl._create_unverified_context  # noqa: S323

    try:
        import httpx

        _orig_client_init = httpx.Client.__init__
        _orig_async_init = httpx.AsyncClient.__init__

        def _client_init(self, *args, **kwargs):  # type: ignore[no-untyped-def]
            kwargs.setdefault("verify", False)
            return _orig_client_init(self, *args, **kwargs)

        def _async_init(self, *args, **kwargs):  # type: ignore[no-untyped-def]
            kwargs.setdefault("verify", False)
            return _orig_async_init(self, *args, **kwargs)

        httpx.Client.__init__ = _client_init  # type: ignore[method-assign]
        httpx.AsyncClient.__init__ = _async_init  # type: ignore[method-assign]
    except Exception:
        pass
