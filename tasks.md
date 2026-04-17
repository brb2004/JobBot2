# JobBot Implementation Tasks

Derived from DDD §14 implementation order. Each task maps to one or more DDD sections.

---

## Phase 1: Infrastructure

- [x] **T01** — Create `docker-compose.yml` with Postgres (5432) and Redis (6379) services
- [x] **T02** — Create `.env.example` with `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, `ANTHROPIC_API_KEY`, `PDF_STORAGE_PATH`
- [x] **T03** — Create `server/config.py` — Pydantic `Settings` class reading from `.env` (DDD §3.5)

---

## Phase 2: Database

- [x] **T04** — Create `server/db/models.py` — SQLAlchemy models: `User`, `Profile`, `Evaluation`, `Resume`, `DedupLog`, `PipelineQueue` (DDD §6.2)
- [x] **T05** — Create `server/db/base.py` — async engine, `AsyncSessionLocal`, `get_db` dependency (DDD §6.1)
- [x] **T06** — Set up Alembic: `server/db/alembic/env.py` + `versions/0001_initial_schema.py` with indexes (DDD §6.3)

---

## Phase 3: Engine Core

- [x] **T07** — Create `engine/llm_client.py` — `LLMClient` with `structured()`, `batch_create()`, `batch_poll()`, `_log_usage()` (DDD §9.1)
- [x] **T08** — Create `system/prompts/eval_extract_jd.txt` and `system/prompts/eval_score_dimensions.txt`
- [x] **T09** — Create `engine/eval_engine.py` — `JDFields`, `DimensionScore`, `EvalResult` models + `EvalEngine` with full 11-step flow (DDD §9.2)

---

## Phase 4: Auth

- [x] **T10** — Create `server/schemas/auth.py` — `RegisterRequest`, `LoginRequest`, `UserResponse` (DDD §7.1)
- [x] **T11** — Create `server/auth/jwt.py` — `create_token()`, `decode_token()`, `blocklist_token()`, `is_blocklisted()` (DDD §4.1)
- [x] **T12** — Create `server/auth/dependencies.py` — `get_current_user` dependency (DDD §4.3)
- [x] **T13** — Create `server/auth/router.py` — `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` with `DEFAULT_WEIGHTS` on registration (DDD §4.2)
- [x] **T14** — Create `server/main.py` — FastAPI app factory, CORS config, mount auth router

---

## Phase 5: Eval Agent + Queue

- [x] **T15** — Create `agents/eval.py` — `run(user_id, url, progress_cb)` using `EvalEngine`, writing to DB (DDD §10.1)
- [x] **T16** — Create `server/queue/celery_app.py` — Celery app with task routes (DDD §8.1)
- [x] **T17** — Create `server/queue/tasks.py` — `run_eval` task following the standard task shape (DDD §8.2)
- [x] **T18** — Create `server/queue/sse.py` — `publish_sse()` via Redis Pub/Sub (DDD §8.3)

---

## Phase 6: Streaming + Eval API

- [x] **T19** — Create `server/routers/stream.py` — `GET /api/stream` SSE endpoint (DDD §5.7)
- [x] **T20** — Create `server/schemas/agent.py` — `AgentRequest` with `AGENT_MODES` and `TASK_MAP` (DDD §7.2, §5.1)
- [x] **T21** — Create `server/routers/agents.py` — `POST /api/agents/{mode}` with dedup check + task dispatch (DDD §5.1)

---

## Phase 7: Tracker, Profile, Resume APIs

- [x] **T22** — Create `server/schemas/tracker.py` — `TrackerUpdate`, `EvaluationSummary`, `EvaluationDetail` (DDD §7.3)
- [x] **T23** — Create `server/routers/tracker.py` — `GET`, `PATCH`, `DELETE /api/tracker` (DDD §5.2)
- [x] **T24** — Create `server/routers/evaluations.py` — `GET /api/evaluations/{eval_id}` (DDD §5.3)
- [x] **T25** — Create `server/schemas/profile.py` — `ProfileUpdate` with weight validator (DDD §7.4)
- [x] **T26** — Create `server/routers/profile.py` — `GET/PUT /api/profile` (DDD §5.4)
- [x] **T27** — Create `server/routers/resume.py` — `GET/PUT /api/resume` (DDD §5.5)

---

## Phase 8: PDF Pipeline

- [x] **T28** — Create `system/archetypes/` — 8 JSON archetype config files (DDD §11.1)
- [x] **T29** — Create remaining prompt files: `resume_reorder_bullets.txt`, `build_gap_analysis.txt`, `build_project_gen.txt`, `interview_prep.txt`, `outreach_map.txt` (DDD §11.2)
- [x] **T30** — Create `engine/resume_engine.py` — `ResumeEngine.build()` with keyword injection, archetype adaptation, bullet reordering, locale detection, Jinja2 render (DDD §9.3)
- [x] **T31** — Create `system/templates/resume.html.j2` — HTML resume template
- [x] **T32** — Create `engine/pdf_renderer.py` — `render_pdf()` with WeasyPrint (DDD §9.4)
- [x] **T33** — Create `agents/pdf.py` — `run(user_id, eval_id, progress_cb)` (DDD §10.2)
- [x] **T34** — Create `agents/auto_pipeline.py` — `run()` orchestrating eval → pdf → optional build trigger (DDD §10.3)
- [x] **T35** — Add `run_pdf` and `run_auto_pipeline` tasks to `server/queue/tasks.py` (DDD §8.2)
- [x] **T36** — Create `server/routers/pdf.py` — `GET /api/pdf/{eval_id}` FileResponse (DDD §5.6)

---

## Phase 9: Additional Agents + Tasks

- [x] **T37** — Create `agents/batch.py` — batch eval via Anthropic Batch API (DDD §10.4)
- [x] **T38** — Create `agents/scan.py` — portal scraping + pipeline_queue insertion (DDD §10.5)
- [x] **T39** — Create remaining agents: `build.py`, `interview_prep.py`, `compare.py`, `deep.py`, `outreach.py`, `negotiation.py`, `patterns.py`, `training.py`
- [x] **T40** — Add all remaining tasks to `server/queue/tasks.py` (DDD §8.2 full table)

---

## Phase 10: Frontend

- [x] **T41** — Scaffold `client/` — Vite + React + TypeScript, install TanStack Query + Zustand
- [x] **T42** — Configure `vite.config.ts` proxy: `/api` and `/auth` → `http://localhost:3001` (DDD §13)
- [x] **T43** — Create `src/lib/api.ts` — `apiFetch` with cookie credentials + `ApiError` (DDD §12.1)
- [x] **T44** — Create `src/hooks/useJobStream.ts` — SSE hook with `job:progress/complete/failed` events (DDD §12.2)
- [x] **T45** — Set up Zustand store — active job cards, SSE status, onboarding step (DDD §12.4)
- [x] **T46** — Build `/onboarding` page — `StepWizard`, `ResumeInput`, `WeightSliders` (DDD §12.3)
- [x] **T47** — Build `/` Dashboard — `UrlInput`, `JobProgressCard`, `RecentEvals` (DDD §12.3)
- [x] **T48** — Build `/tracker` page — `EvalTable`, `FilterBar`, `StatusBadge` with optimistic status updates (DDD §12.3–12.4)
- [x] **T49** — Build `/eval/:id` page — `DimensionBreakdown`, `BuildSuggestions`, `PdfDownload` (DDD §12.3)
- [x] **T50** — Build `/settings` page — `ProfileForm`, `WeightSliders`, `ResumeEditor` (DDD §12.3)
