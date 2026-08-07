from __future__ import annotations

import json
import re
from typing import Any, TypeVar

from pydantic import BaseModel

from app.config import get_settings

T = TypeVar("T", bound=BaseModel)


def get_chat_model():
    """Return a LangChain Gemini chat model (or raise if not configured)."""
    settings = get_settings()
    settings.require_gemini()
    if settings.use_stub_llm:
        return None

    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.google_api_key,
        temperature=0.2,
    )


def get_embeddings():
    """Return a LangChain Gemini embeddings model (or None in stub mode)."""
    settings = get_settings()
    settings.require_gemini()
    if settings.use_stub_llm:
        return None

    from langchain_google_genai import GoogleGenerativeAIEmbeddings

    return GoogleGenerativeAIEmbeddings(
        model=settings.gemini_embedding_model,
        google_api_key=settings.google_api_key,
    )


def stub_embed(text: str, dims: int = 3072) -> list[float]:
    """Deterministic bag-of-words embedding used only when CAREERPILOT_USE_STUB_LLM=1."""
    vec = [0.0] * dims
    for token in re.findall(r"[a-z0-9]+", text.lower()):
        vec[hash(token) % dims] += 1.0
    norm = sum(v * v for v in vec) ** 0.5
    if norm == 0:
        return vec
    return [v / norm for v in vec]


def embed_texts(texts: list[str]) -> list[list[float]]:
    settings = get_settings()
    settings.require_gemini()
    if settings.use_stub_llm:
        return [stub_embed(t) for t in texts]
    embeddings = get_embeddings()
    assert embeddings is not None
    return embeddings.embed_documents(texts)


def embed_query(text: str) -> list[float]:
    settings = get_settings()
    settings.require_gemini()
    if settings.use_stub_llm:
        return stub_embed(text)
    embeddings = get_embeddings()
    assert embeddings is not None
    return embeddings.embed_query(text)


def _extract_json_object(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        raise ValueError(f"Model did not return JSON object: {raw[:400]}")
    data = json.loads(match.group(0))
    if not isinstance(data, dict):
        raise ValueError("Model JSON was not an object")
    return data


def invoke_text(
    *,
    system: str,
    user: str,
    stub_reply: str | None = None,
) -> str:
    """Invoke Gemini for a plain-text reply. Uses stub_reply in stub mode."""
    settings = get_settings()
    settings.require_gemini()

    if settings.use_stub_llm:
        return stub_reply or (
            "Focus on your top skill gap this week, ship one GitHub artifact, "
            "then practice two interview drills from your hiring sprint."
        )

    model = get_chat_model()
    assert model is not None
    prompt = f"{system}\n\nUser request:\n{user}"
    response = model.invoke(prompt)
    content = response.content if hasattr(response, "content") else str(response)
    if isinstance(content, list):
        content = "".join(
            part.get("text", "") if isinstance(part, dict) else str(part) for part in content
        )
    return str(content).strip()


def invoke_structured(
    *,
    system: str,
    user: str,
    schema: type[T],
    stub_factory: Any | None = None,
) -> T:
    """Invoke Gemini and parse into a Pydantic schema. Uses stub_factory in stub mode."""
    settings = get_settings()
    settings.require_gemini()

    if settings.use_stub_llm:
        if stub_factory is None:
            raise RuntimeError("stub_factory required when CAREERPILOT_USE_STUB_LLM=1")
        payload = stub_factory()
        if isinstance(payload, schema):
            return payload
        return schema.model_validate(payload)

    model = get_chat_model()
    assert model is not None

    schema_json = json.dumps(schema.model_json_schema(), indent=2)
    prompt = (
        f"{system}\n\n"
        "Respond with a single JSON object only (no markdown) that matches this schema:\n"
        f"{schema_json}\n\n"
        f"User request:\n{user}"
    )
    response = model.invoke(prompt)
    content = response.content if hasattr(response, "content") else str(response)
    if isinstance(content, list):
        content = "".join(
            part.get("text", "") if isinstance(part, dict) else str(part) for part in content
        )
    data = _extract_json_object(str(content))
    return schema.model_validate(data)
