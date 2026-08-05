# Demo video script — CareerPilot AI (Invictus Open Category)

Record ~3–5 minutes covering a **working multi-agent system** (not a UI mock).

## Setup before recording

1. Set `GOOGLE_API_KEY` in `backend/.env`.
2. Optionally set `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` for live listings.
3. Start backend + frontend (see docs/QUICK_START.md).
4. Have a real PDF/DOCX student resume ready.

## Script

1. **Problem (15s)**  
   “Students have fragmented tools. CareerPilot is a Career Readiness OS that tells you what to do next.”

2. **Upload (30s)**  
   Upload resume → show extracted profile (skills, education, projects, experience) — not empty stubs.

3. **Multi-agent pipeline (45s)**  
   Click Run Multi-Agent Analysis. Narrate live stages: Resume Analysis → Job Matching → Skill Gaps → Learning → Resume Opt → Interview → Report.

4. **Explainable dashboard (45s)**  
   Show readiness score from orchestrator, matched jobs with companies/links/source (live or curated), evidence quotes.

5. **Gaps + plan (40s)**  
   Priority gaps with evidence; RAG-grounded learning roadmap; generated 7-day plan; interview questions.

6. **Memory (30s)**  
   Re-run analysis for the same candidate. Point to memory note showing prior-report awareness.

7. **Close (20s)**  
   “Six specialized agents, LangGraph orchestration, Gemini, RAG, live job tools — aligned to our Invictus proposal.”

## Shot list checklist

- [ ] GitHub repo URL on screen briefly
- [ ] `/health` showing `gemini_configured: true`
- [ ] Agent evidence fields visible
- [ ] Job cards with real titles (not “Acme Corp” toys)
- [ ] Re-analyze memory note
