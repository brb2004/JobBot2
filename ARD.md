# Architecture Requirements Document: JobBot

**Version:** 1.2  
**Date:** 2026-04-10  
**Status:** Draft  
**Derived from:** PRD v1.2

---

## 1. Architecture Overview

JobBot is a web application: a React frontend, a Python/FastAPI API server, a PostgreSQL database, a Celery + Redis job queue for long-running agent work, and a file store for generated PDFs.

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (React SPA)                   │
│   Dashboard │ Tracker │ Onboarding │ Agent Panels        │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS (REST + SSE)
┌──────────────────────▼──────────────────────────────────┐
│                 API Server (FastAPI)                     │
│   Auth │ Agent dispatch │ User data │ File serving       │
└──────┬──────────────┬───────────────────────────────────┘
       │              │
  ┌────▼────┐   ┌─────▼──────────────────────────────┐
  │Postgres │   │     Job Queue (Celery + Redis)      │
  │         │   │  eval │ pdf │ scan │ batch │ build  │
  └─────────┘   └─────────────┬──────────────────────┘
                               │
                    ┌──────────▼─────────────┐
                    │     Celery Worker(s)    │
                    │  Agent + Engine Layer   │
                    │  LLM │ Playwright │ etc │
                    └────────────────────────┘
```

---

## 2. Technology Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **Routing:** React Router v6
- **State management:** TanStack Query (server state) + Zustand (local UI state)
- **UI components:** shadcn/ui (Radix primitives + Tailwind)
- **Build tool:** Vite
- **Real-time updates:** EventSource (SSE) for job progress streaming

### Backend
- **Language:** Python 3.12
- **Framework:** FastAPI
- **ASGI server:** Uvicorn (dev); Gunicorn + Uvicorn workers (prod)
- **Package manager:** uv
- **Validation:** Pydantic v2 (FastAPI's native model layer)
- **Auth:** JWT via PyJWT; tokens stored in httpOnly cookies; Redis for token blocklist
- **Job queue:** Celery 5 + Redis (broker and result backend)
- **ORM:** SQLAlchemy 2.0 (async, declarative) + Alembic migrations
- **LLM:** Anthropic Python SDK (`anthropic`)
- **PDF:** WeasyPrint (HTML/CSS → PDF, Python-native; no browser process needed)
- **Browser automation:** Playwright Python (optional dep, `apply` and `scan` workers only)
- **Structured output validation:** Pydantic models validate all LLM JSON responses

### Databases & Storage
- **Primary DB:** PostgreSQL 16
- **Cache / Queue broker / Result backend:** Redis 7
- **SSE fan-out:** Redis Pub/Sub (worker publishes progress; API server subscribes and streams to browser)
- **PDF storage:** Local filesystem (`/data/pdfs/<user_id>/`) in v1; abstracted behind a `storage.py` interface for future S3 swap

---

## 3. Repository Structure

```
JobBot1/
├── client/                          # React SPA (unchanged)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Onboarding.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Tracker.tsx
│   │   │   ├── EvalDetail.tsx
│   │   │   └── Settings.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   │   └── useJobStream.ts      # SSE hook
│   │   ├── lib/
│   │   │   └── api.ts               # typed fetch wrappers
│   │   └── main.tsx
│   ├── index.html
│   └── vite.config.ts
│
├── server/                          # Python backend
│   ├── pyproject.toml               # uv project config + dependencies
│   ├── main.py                      # FastAPI app factory
│   ├── config.py                    # Settings via pydantic-settings
│   │
│   ├── auth/
│   │   ├── router.py                # POST /auth/register, /auth/login, /auth/logout
│   │   ├── dependencies.py          # get_current_user dependency
│   │   └── jwt.py                   # token encode/decode, blocklist
│   │
│   ├── routers/
│   │   ├── agents.py                # POST /api/agents/{mode}
│   │   ├── tracker.py               # GET/PATCH/DELETE /api/tracker
│   │   ├── evaluations.py           # GET /api/evaluations/{id}
│   │   ├── profile.py               # GET/PUT /api/profile
│   │   ├── resume.py                # GET/PUT /api/resume
│   │   ├── pdf.py                   # GET /api/pdf/{eval_id}
│   │   └── stream.py                # GET /api/stream (SSE)
│   │
│   ├── db/
│   │   ├── base.py                  # SQLAlchemy async engine + session factory
│   │   ├── models.py                # ORM model definitions
│   │   └── alembic/                 # Migration environment
│   │       ├── env.py
│   │       └── versions/
│   │
│   ├── schemas/                     # Pydantic request/response schemas
│   │   ├── auth.py
│   │   ├── agent.py
│   │   ├── tracker.py
│   │   ├── evaluation.py
│   │   ├── profile.py
│   │   └── resume.py
│   │
│   ├── queue/
│   │   ├── celery_app.py            # Celery app + queue definitions
│   │   └── tasks.py                 # Task entry points (thin wrappers → agent code)
│   │
│   └── lib/
│       └── storage.py               # PDF file abstraction
│
├── agents/                          # Agent implementations (run inside Celery workers)
│   ├── auto_pipeline.py
│   ├── eval.py
│   ├── pdf.py
│   ├── scan.py
│   ├── batch.py
│   ├── pipeline.py
│   ├── apply.py
│   ├── compare.py
│   ├── deep.py
│   ├── patterns.py
│   ├── outreach.py
│   ├── interview_prep.py
│   ├── build.py
│   ├── negotiation.py
│   └── training.py
│
├── engine/
│   ├── eval_engine.py
│   ├── resume_engine.py
│   ├── pdf_renderer.py              # WeasyPrint wrapper
│   └── llm_client.py               # Anthropic SDK wrapper
│
├── system/
│   ├── archetypes/                  # JSON archetype configs
│   ├── templates/                   # Jinja2 HTML resume templates
│   └── prompts/                     # LLM prompt templates (.txt or .py constants)
│
├── docker-compose.yml               # Postgres + Redis
└── .env.example
```

---

## 4. API Design

### Authentication

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create account (email + password) |
| POST | `/auth/login` | Issue JWT in httpOnly cookie |
| POST | `/auth/logout` | Add token to Redis blocklist |
| GET | `/auth/me` | Return current user |

All `/api/*` routes use a `get_current_user` FastAPI dependency that decodes the JWT cookie and checks the Redis blocklist. Unauthenticated → 401.

### Agent Dispatch

```
POST /api/agents/{mode}
Content-Type: application/json
{ "url": "...", ...mode_specific_args }
```

Response:
```json
{ "job_id": "uuid" }
```

The route enqueues a Celery task and returns immediately. The client subscribes to SSE to track progress.

**Supported modes:** `auto-pipeline`, `eval`, `pdf`, `scan`, `batch`, `pipeline`, `apply`, `compare`, `deep`, `patterns`, `outreach`, `interview-prep`, `build`, `negotiation`, `training`

### Tracker

| Method | Path | Description |
|---|---|---|
| GET | `/api/tracker` | List evaluations (`?status=&grade=&sort=&page=`) |
| PATCH | `/api/tracker/{eval_id}` | Update status or notes |
| DELETE | `/api/tracker/{eval_id}` | Remove an evaluation |

### Profile & Resume

| Method | Path | Description |
|---|---|---|
| GET | `/api/profile` | Get user profile/preferences |
| PUT | `/api/profile` | Update preferences and dimension weights |
| GET | `/api/resume` | Get resume Markdown source |
| PUT | `/api/resume` | Update resume content |

### PDF

| Method | Path | Description |
|---|---|---|
| GET | `/api/pdf/{eval_id}` | Stream PDF; `Content-Disposition: attachment` |

### Real-Time Stream (SSE)

```
GET /api/stream
Accept: text/event-stream
```

FastAPI streams an `EventSourceResponse` (via `sse-starlette`). The handler subscribes to a Redis Pub/Sub channel keyed to the user (`jobbot:sse:<user_id>`) and yields messages as they arrive.

Events:
```
event: job:progress
data: {"job_id": "...", "mode": "eval", "progress": 40, "message": "Scoring dimensions..."}

event: job:complete
data: {"job_id": "...", "eval_id": "...", "grade": "B", "score": 3.8}

event: job:failed
data: {"job_id": "...", "error": "..."}
```

Celery workers publish to `jobbot:sse:<user_id>` via Redis; the SSE handler relays to the browser.

---

## 5. Database Schema (SQLAlchemy 2.0)

```python
# server/db/models.py

import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, Numeric, Text, DateTime, ForeignKey, UniqueConstraint, PrimaryKeyConstraint
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id:            Mapped[uuid.UUID]  = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email:         Mapped[str]        = mapped_column(String, nullable=False, unique=True)
    password_hash: Mapped[str]        = mapped_column(String, nullable=False)
    name:          Mapped[str]        = mapped_column(String, nullable=False)
    created_at:    Mapped[datetime]   = mapped_column(DateTime, default=datetime.utcnow)

class Profile(Base):
    __tablename__ = "profiles"

    user_id:                  Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    target_roles:             Mapped[list]      = mapped_column(ARRAY(String))
    target_archetypes:        Mapped[list]      = mapped_column(ARRAY(String))
    comp_min:                 Mapped[int]       = mapped_column(Integer, nullable=True)
    comp_ideal:               Mapped[int]       = mapped_column(Integer, nullable=True)
    comp_currency:            Mapped[str]       = mapped_column(String(3), nullable=True)
    remote_only:              Mapped[bool]      = mapped_column(Boolean, default=False)
    timezones_acceptable:     Mapped[list]      = mapped_column(ARRAY(String))
    dimension_weights:        Mapped[dict]      = mapped_column(JSONB)
    scan_cadence:             Mapped[str]       = mapped_column(String, nullable=True)
    build_auto_trigger_grade: Mapped[str]       = mapped_column(String(1), default="B")

class Resume(Base):
    __tablename__ = "resumes"

    id:         Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id:    Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content_md: Mapped[str]       = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime]  = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Evaluation(Base):
    __tablename__ = "evaluations"
    __table_args__ = (UniqueConstraint("user_id", "url"),)

    id:         Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id:    Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    url:        Mapped[str]       = mapped_column(Text, nullable=False)
    company:    Mapped[str]       = mapped_column(String, nullable=True)
    role:       Mapped[str]       = mapped_column(String, nullable=True)
    score:      Mapped[float]     = mapped_column(Numeric(3, 2), nullable=True)
    grade:      Mapped[str]       = mapped_column(String(1), nullable=True)
    status:     Mapped[str]       = mapped_column(String, default="new")   # new|applied|interviewing|rejected|offer
    pdf_path:   Mapped[str]       = mapped_column(Text, nullable=True)
    applied_at: Mapped[datetime]  = mapped_column(DateTime, nullable=True)
    notes:      Mapped[str]       = mapped_column(Text, nullable=True)
    raw_eval:   Mapped[dict]      = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime]  = mapped_column(DateTime, default=datetime.utcnow)

class DedupLog(Base):
    __tablename__ = "dedup_log"
    __table_args__ = (PrimaryKeyConstraint("user_id", "url"),)

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    url:     Mapped[str]       = mapped_column(Text)
    seen_at: Mapped[datetime]  = mapped_column(DateTime, default=datetime.utcnow)

class PipelineQueue(Base):
    __tablename__ = "pipeline_queue"

    id:        Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id:   Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    url:       Mapped[str]       = mapped_column(Text, nullable=False)
    queued_at: Mapped[datetime]  = mapped_column(DateTime, default=datetime.utcnow)
    status:    Mapped[str]       = mapped_column(String, default="pending")  # pending|processing|done|failed

class BuildSuggestion(Base):
    __tablename__ = "build_suggestions"

    id:            Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id:       Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    evaluation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("evaluations.id", ondelete="CASCADE"))
    content_md:    Mapped[str]       = mapped_column(Text, nullable=False)
    created_at:    Mapped[datetime]  = mapped_column(DateTime, default=datetime.utcnow)
```

**Indexes (Alembic migrations):**
- `evaluations(user_id, status)`
- `evaluations(user_id, grade)`
- `evaluations(user_id, created_at DESC)`

---

## 6. Celery Job Queue

### App Configuration

```python
# server/queue/celery_app.py
from celery import Celery
from server.config import settings

celery = Celery(
    "jobbot",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    worker_send_task_events=True,
)
```

### Queue Layout

| Queue | Concurrency | Notes |
|---|---|---|
| `eval` | 5 | LLM-bound; rate limited in `llm_client.py` |
| `pdf` | 3 | CPU-bound (WeasyPrint) |
| `batch` | 1 | Fans out using Anthropic Message Batches API |
| `scan` | 1 | Network-bound; Playwright optional |
| `build` | 3 | LLM-bound |
| `apply` | 1 | Playwright; single browser session |
| `general` | 5 | All other agents |

### Task Shape

```python
# server/queue/tasks.py
from server.queue.celery_app import celery
from agents import eval as eval_agent

@celery.task(bind=True, queue="eval", name="tasks.run_eval")
def run_eval(self, user_id: str, url: str):
    def progress(pct: int, message: str):
        self.update_state(state="PROGRESS", meta={"progress": pct, "message": message})
        publish_sse(user_id, "job:progress", {"job_id": self.request.id, "progress": pct, "message": message})

    result = eval_agent.run(user_id=user_id, url=url, progress=progress)
    publish_sse(user_id, "job:complete", {"job_id": self.request.id, **result})
    return result
```

### SSE Fan-Out via Redis Pub/Sub

```python
# server/routers/stream.py
from sse_starlette.sse import EventSourceResponse
import redis.asyncio as aioredis

async def stream(request: Request, user: User = Depends(get_current_user)):
    redis = aioredis.from_url(settings.redis_url)
    pubsub = redis.pubsub()
    await pubsub.subscribe(f"jobbot:sse:{user.id}")

    async def generator():
        async for message in pubsub.listen():
            if request.is_disconnected:
                break
            if message["type"] == "message":
                data = message["data"]
                yield {"data": data}

    return EventSourceResponse(generator())
```

Workers publish via:
```python
def publish_sse(user_id: str, event: str, payload: dict):
    redis_client.publish(f"jobbot:sse:{user_id}", json.dumps({"event": event, **payload}))
```

---

## 7. Authentication & JWT Design

- **Tokens:** JWT (PyJWT), signed with `HS256` using `SECRET_KEY` from env
- **Delivery:** httpOnly cookie (`access_token`); `SameSite=Lax`, `Secure=True` in production
- **Expiry:** 7 days
- **Logout / blocklist:** On logout, token JTI stored in Redis with TTL matching remaining token lifetime
- **`get_current_user` dependency:**

```python
# server/auth/dependencies.py
async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401)
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401)
    if redis_client.get(f"blocklist:{payload['jti']}"):
        raise HTTPException(status_code=401)
    user = await db.get(User, payload["sub"])
    if not user:
        raise HTTPException(status_code=401)
    return user
```

All agent dispatch routes extract `user.id` from the resolved dependency — workers never trust client-supplied user IDs.

---

## 8. Evaluation Engine

```python
# engine/eval_engine.py

class EvalEngine:
    def __init__(self, llm: LLMClient, profile: Profile):
        self.llm = llm
        self.weights = profile.dimension_weights

    async def score(self, url: str, progress_cb=None) -> EvalResult:
        jd_text = await fetch_jd(url)
        if progress_cb: progress_cb(10, "Fetching job description")

        jd_fields = await self.llm.structured(
            prompt=EXTRACT_JD_PROMPT.format(jd=jd_text),
            schema=JDFields,
        )
        if progress_cb: progress_cb(30, "Extracted job fields")

        dimension_scores = {}
        for dim in DIMENSIONS:
            raw = await self._score_dimension(dim, jd_fields)
            dimension_scores[dim] = {"raw": raw, "weighted": raw * self.weights[dim]}

        # Gate-pass check
        if dimension_scores["role_match"]["raw"] < 2 or dimension_scores["skills_alignment"]["raw"] < 2:
            return EvalResult(disqualified=True, grade="F", score=1.0, ...)

        weighted_sum = sum(d["weighted"] for d in dimension_scores.values())
        grade = score_to_grade(weighted_sum)

        if progress_cb: progress_cb(90, "Scoring complete")
        return EvalResult(score=weighted_sum, grade=grade, dimensions=dimension_scores, ...)
```

**EvalResult** is a Pydantic model; stored as JSONB in `evaluations.raw_eval`.

---

## 9. Resume Engine & PDF

Resume source fetched from the `resumes` table. PDF rendered with WeasyPrint.

```python
# engine/resume_engine.py

class ResumeEngine:
    async def build(self, resume_md: str, eval_result: EvalResult) -> str:
        # 1. Parse resume Markdown into section AST
        sections = parse_resume_md(resume_md)

        # 2. Keyword injection
        keywords = eval_result.keywords  # extracted by eval-engine
        sections = inject_keywords(sections, keywords)

        # 3. Archetype adaptation
        archetype_cfg = load_archetype(eval_result.archetype)
        sections = adapt_archetype(sections, archetype_cfg)

        # 4. Relevance reordering (LLM scores bullets)
        sections = await reorder_bullets(sections, eval_result.raw_jd, self.llm)

        # 5. Localization
        lang, paper = detect_locale(eval_result.jd_language, eval_result.jd_region)

        # 6. Render Jinja2 template → HTML
        return render_template("resume.html.j2", sections=sections, lang=lang, paper=paper)

# engine/pdf_renderer.py
from weasyprint import HTML

def render_pdf(html: str) -> bytes:
    return HTML(string=html).write_pdf()
```

**PDF Download:** `GET /api/pdf/{eval_id}` verifies the requesting user owns the evaluation, then returns `FileResponse` from the stored path.

---

## 10. LLM Client

```python
# engine/llm_client.py
import anthropic
from tenacity import retry, stop_after_attempt, wait_exponential
from pydantic import BaseModel

class LLMClient:
    def __init__(self):
        self.client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from env

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8))
    async def structured(self, prompt: str, schema: type[BaseModel]) -> BaseModel:
        response = self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text
        return schema.model_validate_json(raw)
```

- **Retry:** tenacity, 3 attempts, exponential backoff (1s → 2s → 4s)
- **Structured output:** all prompts request JSON; responses validated via Pydantic
- **Batch mode:** `batch` agent uses `anthropic.Anthropic().beta.messages.batches.create()` directly
- **Token logging:** append-only JSONL at `/data/llm-usage.jsonl`

---

## 11. Frontend Pages

Unchanged from ARD v1.1 — React frontend is unaffected by the backend language change.

### Onboarding (`/onboarding`)
Multi-step form: account creation → resume input → preferences → dimension weight sliders.

### Dashboard (`/`)
URL input → triggers `auto-pipeline`; SSE-driven job progress cards; recent evaluations strip.

### Tracker (`/tracker`)
Paginated table with server-side filter (status, grade, date) and sort; PDF download; status update.

### Eval Detail (`/eval/:id`)
Full 10-dimension breakdown; PDF download; build suggestions; interview prep; status update.

### Settings (`/settings`)
Profile preferences; dimension weight editor; resume Markdown editor with preview; scan config.

---

## 12. Non-Functional Architecture Decisions

| Requirement | Target | Decision |
|---|---|---|
| `batch` throughput | 122 URLs < 10 min | Celery `batch` queue + Anthropic Message Batches API |
| PDF generation | < 30s | WeasyPrint in Celery worker; no browser process overhead |
| `build` generation | < 60s | Single structured LLM call with all gaps in one prompt |
| Dedup lookup | < 100ms | PostgreSQL PK lookup on `dedup_log(user_id, url)` |
| Tracker dashboard load | < 500ms | Server-side paginated query with indexed filters |
| Tracker filter/sort | < 200ms | Indexed columns; no full table scans |
| Job status updates | < 1s | Celery → Redis Pub/Sub → SSE; no polling |
| API p95 latency | < 200ms | Applies to non-agent endpoints only |

---

## 13. Security

- **Auth:** JWT in httpOnly cookie; Redis blocklist for logout
- **Authorization:** every DB query filters by `user_id` from the resolved JWT dependency
- **LLM API key:** `ANTHROPIC_API_KEY` via environment variable; never logged or returned to client
- **PDF access:** ownership check on every `/api/pdf/{eval_id}` request
- **Input validation:** Pydantic models on all request bodies; extra fields forbidden (`model_config = ConfigDict(extra="forbid")`)
- **SQL injection:** SQLAlchemy ORM parameterizes all queries
- **File paths:** PDF paths constructed server-side (`/data/pdfs/<user_id>/<eval_id>.pdf`); no user-supplied path components
- **Rate limiting:** `slowapi` (Starlette-compatible) on auth endpoints (10 req/15 min per IP) and agent dispatch (30 req/min per user)
- **CORS:** FastAPI `CORSMiddleware` restricted to the frontend origin

---

## 14. Local Development Setup

```bash
# Start Postgres + Redis
docker-compose up -d

# Backend
cd server
uv sync                        # install dependencies from pyproject.toml
uv run alembic upgrade head    # run migrations
uv run uvicorn main:app --reload --port 3001

# Celery worker (separate terminal)
cd server
uv run celery -A queue.celery_app worker --loglevel=info -Q eval,pdf,batch,scan,build,apply,general

# Frontend
cd client
npm install
npm run dev                    # Vite on :5173, proxies /api → :3001
```

### Environment Variables (`.env`)

```
DATABASE_URL=postgresql+asyncpg://jobbot:jobbot@localhost:5432/jobbot
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=<random 64-char string>
ANTHROPIC_API_KEY=<key>
PDF_STORAGE_PATH=./data/pdfs
ENVIRONMENT=development
```

### `pyproject.toml` Core Dependencies

```toml
[project]
name = "jobbot-server"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.30",
    "sqlalchemy[asyncio]>=2.0",
    "asyncpg>=0.29",
    "alembic>=1.13",
    "pydantic>=2.7",
    "pydantic-settings>=2.3",
    "celery[redis]>=5.4",
    "redis>=5.0",
    "sse-starlette>=2.1",
    "anthropic>=0.28",
    "pyjwt>=2.8",
    "bcrypt>=4.1",
    "weasyprint>=62.3",
    "jinja2>=3.1",
    "tenacity>=8.3",
    "slowapi>=0.1",
    "httpx>=0.27",
    "mistune>=3.0",        # Markdown parsing for resume engine
]
```

---

## 15. Open Architecture Decisions (maps to PRD §9)

| PRD Question | Decision | Rationale |
|---|---|---|
| LLM provider | `claude-sonnet-4-6` | Best structured output quality; batch API available |
| Tracker storage | PostgreSQL | Required for multi-user web app; handles filtering/sorting at scale |
| PDF rendering | WeasyPrint | Python-native; no browser process in workers; sufficient for ATS-safe output |
| `scan` cadence | cron string in user profile; Celery Beat for scheduling | User-configurable per account |
| Archetype registry | JSON files in `system/archetypes/` | 8 archetypes v1; extensible without DB change |
| STAR+R bank format | `interview_stories` table in PostgreSQL | Queryable by competency/archetype tag; per-user |
| `build` top-N gaps | Top 3 gaps, max 9 projects; configurable in profile | Keeps output actionable |

---

## 16. Phase 1 Build Checklist (P0)

**Infrastructure**
- [ ] `docker-compose.yml` — Postgres + Redis
- [ ] `server/db/models.py` — SQLAlchemy models
- [ ] Alembic initial migration
- [ ] `server/queue/celery_app.py` + `tasks.py` — Celery setup
- [ ] `server/lib/storage.py` — PDF file abstraction

**Auth**
- [ ] `POST /auth/register`, `/auth/login`, `/auth/logout`
- [ ] `get_current_user` dependency + JWT + Redis blocklist

**Core API**
- [ ] `POST /api/agents/auto-pipeline`
- [ ] `POST /api/agents/eval`
- [ ] `POST /api/agents/pdf`
- [ ] `GET /api/stream` — SSE + Redis Pub/Sub
- [ ] `GET /api/tracker` + `PATCH /api/tracker/{id}`
- [ ] `GET/PUT /api/profile`
- [ ] `GET/PUT /api/resume`
- [ ] `GET /api/pdf/{eval_id}`

**Engine**
- [ ] `engine/llm_client.py` — Anthropic SDK, tenacity retry, Pydantic validation
- [ ] `engine/eval_engine.py` — 10-dimension scoring
- [ ] `engine/resume_engine.py` — keyword injection, archetype adaptation, reordering
- [ ] `engine/pdf_renderer.py` — WeasyPrint wrapper
- [ ] `system/templates/resume.html.j2` — base resume template
- [ ] `system/archetypes/*.json` — 8 archetype configs

**Agents**
- [ ] `agents/eval.py`
- [ ] `agents/pdf.py`
- [ ] `agents/auto_pipeline.py`

**Frontend**
- [ ] Vite + React + Tailwind + shadcn/ui scaffold
- [ ] `useJobStream` SSE hook
- [ ] Onboarding flow (4 steps)
- [ ] Dashboard page
- [ ] Tracker page with filter/sort
- [ ] Eval detail page
- [ ] Settings page
