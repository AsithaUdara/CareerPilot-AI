# CareerPilot MVP Architecture

This prototype uses a modular monolith with an internal multi-agent orchestration layer.

## Modules

- `backend/app/main.py`: FastAPI entrypoint and APIs.
- `backend/app/services/orchestrator.py`: Orchestrator combining six specialized agents.
- `backend/app/services/agents.py`: Agent implementations (MVP stubs).
- `backend/app/services/rag.py`: RAG context retrieval store (seeded role knowledge).
- `backend/app/services/tools.py`: Tool-calling layer for mock jobs/course connectors.
- `frontend/src/App.jsx`: Four-screen MVP flow.

## API Endpoints

- `GET /health`
- `POST /resume/upload`
- `POST /analyze`

## Data Strategy

- Current state is in-memory for prototype speed.
- Next step is PostgreSQL + vector store (`pgvector` or `qdrant`) without changing API contracts.
