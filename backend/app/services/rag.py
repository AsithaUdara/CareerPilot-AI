from __future__ import annotations

from typing import List

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams
from sqlalchemy.orm import Session

from app.repositories.knowledge_repository import query_knowledge_docs


class RAGStore:
    def __init__(self) -> None:
        self.collection = "career_knowledge"
        self.vector_size = 16
        self.client = QdrantClient(":memory:")
        if not self.client.collection_exists(self.collection):
            self.client.create_collection(
                collection_name=self.collection,
                vectors_config=VectorParams(size=self.vector_size, distance=Distance.COSINE),
            )
        self._seeded_roles: set[str] = set()

    def _embed(self, text: str) -> list[float]:
        vec = [0.0] * self.vector_size
        for token in text.lower().split():
            vec[hash(token) % self.vector_size] += 1.0
        norm = sum(v * v for v in vec) ** 0.5
        if norm == 0:
            return vec
        return [v / norm for v in vec]

    def ensure_role_docs(self, session: Session, target_role: str) -> None:
        role_key = target_role.lower()
        if role_key in self._seeded_roles:
            return
        docs = query_knowledge_docs(session, target_role)
        if not docs:
            docs = ["No role-specific corpus found yet. Fall back to general career guidance."]
        points = [
            PointStruct(
                id=abs(hash(f"{role_key}:{idx}")) % (10**9),
                vector=self._embed(content),
                payload={"role": role_key, "content": content},
            )
            for idx, content in enumerate(docs, start=1)
        ]
        self.client.upsert(collection_name=self.collection, points=points)
        self._seeded_roles.add(role_key)

    def retrieve(self, target_role: str) -> List[str]:
        query = self._embed(target_role)
        result = self.client.query_points(
            collection_name=self.collection,
            query=query,
            limit=3,
        )
        hits = result.points
        filtered = [
            str(hit.payload.get("content", ""))
            for hit in hits
            if hit.payload and str(hit.payload.get("role", "")).lower() == target_role.lower()
        ]
        if filtered:
            return filtered
        generic = [str(hit.payload.get("content", "")) for hit in hits if hit.payload]
        return generic or ["No role-specific corpus found yet. Fall back to general career guidance."]
