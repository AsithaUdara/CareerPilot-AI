# Step-by-Step Prototype Build Breakdown

## Step 1: Backend Foundation

1. Create FastAPI app and health check endpoint.
2. Add upload endpoint for resume files.
3. Parse and normalize candidate profile.

## Step 2: Agent Pipeline

1. Implement each specialized agent as an independent function.
2. Implement orchestrator that executes agents and merges outputs.
3. Add explainability fields and evidence traces in final report.

## Step 3: RAG + Tool Layer (MVP stubs)

1. Add role-based retrieval store for grounded recommendations.
2. Add mock job dataset connector for role matching.
3. Thread retrieved evidence into orchestrator decisions.

## Step 4: Frontend Workflow

1. Build upload + target role screen.
2. Trigger backend analysis flow.
3. Render readiness dashboard, skill gaps, recommendations, and 7-day plan.

## Step 5: Validation

1. Test with sample resumes (txt format for current prototype).
2. Verify report returns all six agent outputs.
3. Verify UI handles no-data and loading states.

## Step 6: Next Iteration (Post-MVP)

1. Replace in-memory store with PostgreSQL models.
2. Replace RAG seed store with vector DB.
3. Add production resume parser and auth.
4. Add job-source and learning-source APIs.
