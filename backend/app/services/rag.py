from __future__ import annotations

from typing import List

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams
from sqlalchemy.orm import Session

from app.config import get_settings
from app.repositories.knowledge_repository import query_knowledge_docs_detailed
from app.services.llm import embed_query, embed_texts

_CLIENTS: dict[str, QdrantClient] = {}


def _get_client(path_key: str, *, memory: bool) -> QdrantClient:
    if path_key not in _CLIENTS:
        if memory:
            _CLIENTS[path_key] = QdrantClient(":memory:")
        else:
            settings = get_settings()
            settings.qdrant_path.mkdir(parents=True, exist_ok=True)
            _CLIENTS[path_key] = QdrantClient(path=str(settings.qdrant_path))
    return _CLIENTS[path_key]


class RAGStore:
    """Persistent Qdrant RAG store backed by Gemini embeddings (or stub vectors in tests)."""

    def __init__(self) -> None:
        settings = get_settings()
        self.collection = "career_knowledge"
        self.vector_size = 3072
        memory = settings.use_stub_llm
        key = ":memory:" if memory else str(settings.qdrant_path.resolve())
        self.client = _get_client(key, memory=memory)
        self._ensure_collection()
        self._indexed_roles: set[str] = set()

    def _ensure_collection(self) -> None:
        if self.client.collection_exists(self.collection):
            info = self.client.get_collection(self.collection)
            existing = getattr(getattr(info, "config", None), "params", None)
            size = None
            try:
                size = info.config.params.vectors.size  # type: ignore[attr-defined]
            except Exception:
                size = None
            if size and size != self.vector_size:
                self.client.delete_collection(self.collection)
        if not self.client.collection_exists(self.collection):
            self.client.create_collection(
                collection_name=self.collection,
                vectors_config=VectorParams(size=self.vector_size, distance=Distance.COSINE),
            )

    def ensure_role_docs(self, session: Session, target_role: str) -> None:
        role_key = target_role.lower()
        if role_key in self._indexed_roles:
            return

        docs = query_knowledge_docs_detailed(session, target_role)
        if not docs:
            docs = [
                {
                    "id": 0,
                    "category": "guidance",
                    "content": (
                        f"General career guidance for {target_role}: emphasize transferable skills, "
                        "portfolio evidence, and interview preparation grounded in job descriptions."
                    ),
                    "title": "General guidance",
                }
            ]

        contents = [str(doc["content"]) for doc in docs]
        vectors = embed_texts(contents)
        points = []
        for doc, vector in zip(docs, vectors):
            # Ensure vector length matches collection
            if len(vector) != self.vector_size:
                if len(vector) > self.vector_size:
                    vector = vector[: self.vector_size]
                else:
                    vector = vector + [0.0] * (self.vector_size - len(vector))
            point_id = abs(hash(f"{role_key}:{doc.get('id')}:{doc.get('content', '')[:40]}")) % (10**9)
            points.append(
                PointStruct(
                    id=point_id,
                    vector=vector,
                    payload={
                        "role": role_key,
                        "content": doc["content"],
                        "category": doc.get("category", "guidance"),
                        "title": doc.get("title") or doc.get("category", "knowledge"),
                    },
                )
            )
        if points:
            self.client.upsert(collection_name=self.collection, points=points)
        self._indexed_roles.add(role_key)

    def retrieve(self, query: str, role: str | None = None, k: int = 4) -> List[str]:
        vector = embed_query(query)
        if len(vector) != self.vector_size:
            if len(vector) > self.vector_size:
                vector = vector[: self.vector_size]
            else:
                vector = vector + [0.0] * (self.vector_size - len(vector))
        result = self.client.query_points(
            collection_name=self.collection,
            query=vector,
            limit=max(k * 3, 6),
        )
        hits = result.points
        role_key = (role or "").lower()
        filtered: list[str] = []
        for hit in hits:
            if not hit.payload:
                continue
            content = str(hit.payload.get("content", "")).strip()
            title = str(hit.payload.get("title") or hit.payload.get("category") or "source")
            hit_role = str(hit.payload.get("role", "")).lower()
            if not content:
                continue
            if role_key and hit_role not in {role_key, "general"} and role_key.split()[0] not in hit_role:
                continue
            filtered.append(f"[{title}] {content}")
            if len(filtered) >= k:
                break

        if filtered:
            return filtered

        generic: list[str] = []
        for hit in hits:
            if not hit.payload:
                continue
            content = str(hit.payload.get("content", "")).strip()
            title = str(hit.payload.get("title") or hit.payload.get("category") or "source")
            if content:
                generic.append(f"[{title}] {content}")
            if len(generic) >= k:
                break
        return generic or ["No role-specific corpus found yet. Fall back to general career guidance."]

    def reindex_all(self, session: Session, roles: list[str]) -> None:
        self._indexed_roles.clear()
        for role in roles:
            self.ensure_role_docs(session, role)
