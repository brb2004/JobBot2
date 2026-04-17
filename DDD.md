# Developer Design Document: JobBot

**Version:** 1.0  
**Date:** 2026-04-10  
**Status:** Draft  
**Derived from:** ARD v1.2

---

## 1. Purpose

This document provides implementation-level specifications for each module in JobBot. It translates the ARD into actionable developer guidance: function signatures, class contracts, data flows, error handling patterns, and implementation notes. Developers should be able to write code from this document without needing to reverse-engineer intent from the PRD.

---

## 2. Module Implementation Map

```
server/
  auth/           → §4
  routers/        → §5
  db/             → §6
  schemas/        → §7
  queue/          → §8

engine/           → §9
agents/           → §10
system/           → §11
client/           → §12
```

---

## 3. Cross-Cutting Concerns

### 3.1 Error Handling

All FastAPI route handlers follow this convention:

```python
# Standard HTTP error shape
{
  "detail": "Human-readable message"
}
```

Agent-level failures are caught in Celery tasks and published to SSE as `job:failed` events — they do **not** raise HTTP errors after the job is enqueued.

| Layer | Strategy |
|---|---|
| Route handlers | Raise `HTTPException(status_code=...)` for sync errors |
| Celery tasks | `try/except Exception as e` → publish `job:failed` SSE; re-raise to mark task FAILED |
| LLM client | `tenacity` retry (3x, exponential backoff); on final failure raise `LLMError` |
| DB operations | Let SQLAlchemy exceptions propagate to route handler; catch `IntegrityError` for unique violations |
| Validation | Pydantic raises `ValidationError`; FastAPI converts to 422 automatically |

### 3.2 Dependency Injection (FastAPI)

```python
# Standard dependency chain for authenticated routes
async def route(
    payload: SomeSchema,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ...
```

- `get_db` yields an `AsyncSession` and commits/rolls back on exit
- `get_current_user` raises 401 if token missing, expired, or blocklisted

### 3.3 User-Scoping Convention

Every database query that touches user data **must** include a `user_id` filter derived from `get_current_user`. Never accept `user_id` from the request body for data access — only from the resolved JWT.

```python
# CORRECT
result = await db.execute(select(Evaluation).where(
    Evaluation.user_id == user.id,
    Evaluation.id == eval_id
))

# WRONG — user_id from client body
result = await db.execute(select(Evaluation).where(
    Evaluation.id == payload.eval_id  # attacker could supply another user's eval_id
))
```

### 3.4 Async / Sync Boundary

- All FastAPI route handlers are `async def`
- All SQLAlchemy DB calls use `await`
- Celery tasks are **sync** functions (Celery does not natively support async tasks without extra config)
- Agent code called from Celery tasks uses `asyncio.run()` if it needs async internals

```python
@celery.task(bind=True, queue="eval", name="tasks.run_eval")
def run_eval(self, user_id: str, url: str):
    result = asyncio.run(_run_eval_async(user_id, url, progress_cb))
    ...
```

### 3.5 Config via Pydantic Settings

```python
# server/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    redis_url: str
    secret_key: str
    anthropic_api_key: str
    pdf_storage_path: str = "./data/pdfs"
    environment: str = "development"

    model_config = {"env_file": ".env"}

settings = Settings()
```

---

## 4. Auth Module (`server/auth/`)

### 4.1 `jwt.py`

```python
import uuid
import jwt
from datetime import datetime, timedelta, timezone
from server.config import settings

TOKEN_EXPIRY_DAYS = 7

def create_token(user_id: str) -> tuple[str, str]:
    """Returns (encoded_token, jti)."""
    jti = str(uuid.uuid4())
    payload = {
        "sub": user_id,
        "jti": jti,
        "exp": datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRY_DAYS),
    }
    token = jwt.encode(payload, settings.secret_key, algorithm="HS256")
    return token, jti

def decode_token(token: str) -> dict:
    """Raises jwt.PyJWTError on invalid/expired token."""
    return jwt.decode(token, settings.secret_key, algorithms=["HS256"])

def blocklist_token(jti: str, expires_in_seconds: int) -> None:
    """Stores JTI in Redis with TTL."""
    redis_client.setex(f"blocklist:{jti}", expires_in_seconds, "1")

def is_blocklisted(jti: str) -> bool:
    return redis_client.exists(f"blocklist:{jti}") == 1
```

### 4.2 `router.py`

```
POST /auth/register
  Body: RegisterRequest { email, password, name }
  - Validate email uniqueness (catch IntegrityError → 409)
  - Hash password with bcrypt
  - Create User row
  - Create default Profile row (empty arrays, default weights)
  - Return 201 UserResponse { id, email, name }

POST /auth/login
  Body: LoginRequest { email, password }
  - Look up user by email → 401 if not found
  - bcrypt.checkpw → 401 if mismatch
  - create_token(user.id)
  - Set httpOnly cookie: access_token=<token>; SameSite=Lax; HttpOnly; Secure (prod only)
  - Return 200 UserResponse

POST /auth/logout
  - Decode token from cookie → skip if missing (idempotent)
  - blocklist_token(jti, remaining_seconds)
  - Delete cookie
  - Return 204

GET /auth/me
  - Requires get_current_user
  - Return 200 UserResponse
```

**Default dimension weights on registration:**

```python
DEFAULT_WEIGHTS = {
    "role_match": 0.15,
    "skills_alignment": 0.15,
    "seniority": 0.12,
    "compensation": 0.12,
    "interview_likelihood": 0.10,
    "company_stage": 0.08,
    "product_market_fit": 0.08,
    "geographic_feasibility": 0.08,
    "growth_trajectory": 0.07,
    "hiring_timeline": 0.05,
}
# Sum = 1.00
```

### 4.3 `dependencies.py`

```python
async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> User:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = decode_token(token)
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    if is_blocklisted(payload["jti"]):
        raise HTTPException(401, "Token revoked")
    user = await db.get(User, uuid.UUID(payload["sub"]))
    if not user:
        raise HTTPException(401, "User not found")
    return user
```

---

## 5. Routers (`server/routers/`)

### 5.1 `agents.py`

```
POST /api/agents/{mode}
  Path param: mode (validated against AGENT_MODES set)
  Body: AgentRequest { url: str, ...mode_specific_fields }
  - Validate mode → 400 if unknown
  - Dedup check: query dedup_log(user_id, url) → 409 { "detail": "already_evaluated" } if exists
  - Enqueue task via celery dispatcher (see §8.2)
  - Return 202 { "job_id": str }
```

Valid modes:
```python
AGENT_MODES = {
    "auto-pipeline", "eval", "pdf", "scan", "batch",
    "pipeline", "apply", "compare", "deep", "patterns",
    "outreach", "interview-prep", "build", "negotiation", "training"
}
```

**Mode-to-task mapping:**
```python
TASK_MAP = {
    "auto-pipeline": tasks.run_auto_pipeline,
    "eval": tasks.run_eval,
    "pdf": tasks.run_pdf,
    # ... etc
}
```

### 5.2 `tracker.py`

```
GET /api/tracker
  Query: status?, grade?, sort? (created_at|score|grade), order? (asc|desc), page? (default 1), per_page? (default 25)
  - Build SQLAlchemy query with filters on (user_id, status, grade)
  - Apply sort; paginate with OFFSET/LIMIT
  - Return 200 { items: EvaluationSummary[], total: int, page: int }

PATCH /api/tracker/{eval_id}
  Body: TrackerUpdate { status?, notes? }
  - Fetch evaluation by (user_id, eval_id) → 404 if missing
  - Apply partial update
  - Commit
  - Return 200 EvaluationSummary

DELETE /api/tracker/{eval_id}
  - Fetch evaluation by (user_id, eval_id) → 404 if missing
  - Delete row (dedup_log entry preserved — deletion does not allow re-evaluation)
  - Return 204
```

### 5.3 `evaluations.py`

```
GET /api/evaluations/{eval_id}
  - Fetch by (user_id, eval_id) → 404 if missing
  - Return 200 EvaluationDetail (includes raw_eval JSONB)
```

### 5.4 `profile.py`

```
GET /api/profile
  - Return 200 ProfileResponse

PUT /api/profile
  Body: ProfileUpdate (all optional fields)
  - Validate dimension_weights if provided: must be dict, all 10 keys present, sum to 1.0 ± 0.001
  - Upsert profile row
  - Return 200 ProfileResponse
```

### 5.5 `resume.py`

```
GET /api/resume
  - Fetch resume by user_id → 404 if none exists yet
  - Return 200 { content_md: str, updated_at: datetime }

PUT /api/resume
  Body: { content_md: str }
  - Validate content_md non-empty
  - Upsert resume row (update updated_at)
  - Return 200 { content_md: str, updated_at: datetime }
```

### 5.6 `pdf.py`

```
GET /api/pdf/{eval_id}
  - Fetch evaluation by (user_id, eval_id) → 404 if not found
  - Check pdf_path not null → 404 "PDF not yet generated"
  - Verify file exists on disk → 500 if missing (log error)
  - Return FileResponse(pdf_path, media_type="application/pdf",
      headers={"Content-Disposition": f"attachment; filename={eval_id}.pdf"})
```

### 5.7 `stream.py`

```
GET /api/stream
  - Subscribe to Redis Pub/Sub channel: jobbot:sse:{user.id}
  - Stream EventSourceResponse
  - On disconnect: unsubscribe and close Redis connection
```

---

## 6. Database Layer (`server/db/`)

### 6.1 `base.py`

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from server.config import settings

engine = create_async_engine(settings.database_url, echo=False, pool_size=10, max_overflow=5)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

### 6.2 Models

See ARD §5 for full SQLAlchemy model definitions. Key implementation notes:

- `Evaluation.status` enum values: `new`, `applied`, `interviewing`, `rejected`, `offer`
- `Profile.dimension_weights` JSONB must always contain all 10 dimension keys
- `DedupLog` composite PK `(user_id, url)` is the deduplication check — `INSERT OR IGNORE` pattern via `INSERT ... ON CONFLICT DO NOTHING`

### 6.3 Alembic Setup

```
server/db/alembic/
  env.py        — import Base from db.models; set target_metadata = Base.metadata
  versions/
    0001_initial_schema.py
```

Migration `0001` creates all tables and adds indexes:
```python
op.create_index("ix_evals_user_status", "evaluations", ["user_id", "status"])
op.create_index("ix_evals_user_grade", "evaluations", ["user_id", "grade"])
op.create_index("ix_evals_user_created", "evaluations", ["user_id", "created_at"])
```

---

## 7. Schemas (`server/schemas/`)

### 7.1 `auth.py`
```python
class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=1)

class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: UUID
    email: str
    name: str
```

### 7.2 `agent.py`
```python
class AgentRequest(BaseModel):
    model_config = ConfigDict(extra="allow")  # mode-specific fields pass through
    url: str = Field(pattern=r"^https?://")
```

### 7.3 `tracker.py`
```python
VALID_STATUSES = {"new", "applied", "interviewing", "rejected", "offer"}

class TrackerUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: str | None = Field(None)
    notes: str | None = None

    @field_validator("status")
    def validate_status(cls, v):
        if v is not None and v not in VALID_STATUSES:
            raise ValueError(f"status must be one of {VALID_STATUSES}")
        return v

class EvaluationSummary(BaseModel):
    id: UUID
    url: str
    company: str | None
    role: str | None
    score: float | None
    grade: str | None
    status: str
    created_at: datetime
    applied_at: datetime | None

class EvaluationDetail(EvaluationSummary):
    notes: str | None
    raw_eval: dict | None
    pdf_path: str | None
```

### 7.4 `profile.py`
```python
DIMENSION_KEYS = {
    "role_match", "skills_alignment", "seniority", "compensation",
    "interview_likelihood", "company_stage", "product_market_fit",
    "geographic_feasibility", "growth_trajectory", "hiring_timeline"
}

class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    target_roles: list[str] | None = None
    target_archetypes: list[str] | None = None
    comp_min: int | None = None
    comp_ideal: int | None = None
    comp_currency: str | None = Field(None, pattern=r"^[A-Z]{3}$")
    remote_only: bool | None = None
    timezones_acceptable: list[str] | None = None
    dimension_weights: dict[str, float] | None = None
    scan_cadence: str | None = None
    build_auto_trigger_grade: str | None = Field(None, pattern=r"^[A-F]$")

    @field_validator("dimension_weights")
    def validate_weights(cls, v):
        if v is None:
            return v
        if set(v.keys()) != DIMENSION_KEYS:
            raise ValueError("dimension_weights must contain all 10 dimension keys")
        total = sum(v.values())
        if abs(total - 1.0) > 0.001:
            raise ValueError(f"dimension_weights must sum to 1.0 (got {total:.4f})")
        return v
```

---

## 8. Job Queue (`server/queue/`)

### 8.1 `celery_app.py`

```python
from celery import Celery
from server.config import settings

celery = Celery("jobbot", broker=settings.redis_url, backend=settings.redis_url)
celery.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    worker_send_task_events=True,
    task_routes={
        "tasks.run_eval": {"queue": "eval"},
        "tasks.run_pdf": {"queue": "pdf"},
        "tasks.run_batch": {"queue": "batch"},
        "tasks.run_scan": {"queue": "scan"},
        "tasks.run_build": {"queue": "build"},
        "tasks.run_apply": {"queue": "apply"},
        "tasks.*": {"queue": "general"},
    }
)
```

### 8.2 `tasks.py` — Task Shape

All tasks follow this pattern:

```python
import asyncio
from server.queue.celery_app import celery
from server.queue.sse import publish_sse

@celery.task(bind=True, name="tasks.run_eval")
def run_eval(self, user_id: str, url: str) -> dict:
    def progress(pct: int, message: str):
        self.update_state(state="PROGRESS", meta={"progress": pct, "message": message})
        publish_sse(user_id, "job:progress", {
            "job_id": self.request.id,
            "mode": "eval",
            "progress": pct,
            "message": message,
        })

    try:
        result = asyncio.run(eval_agent.run(user_id=user_id, url=url, progress_cb=progress))
        publish_sse(user_id, "job:complete", {"job_id": self.request.id, **result})
        return result
    except Exception as e:
        publish_sse(user_id, "job:failed", {"job_id": self.request.id, "error": str(e)})
        raise
```

**Task signatures by mode:**

| Task | Parameters | Notes |
|---|---|---|
| `run_auto_pipeline` | `user_id, url` | Calls eval → pdf → tracker write internally |
| `run_eval` | `user_id, url` | Standalone eval |
| `run_pdf` | `user_id, eval_id` | Re-render PDF for existing eval |
| `run_scan` | `user_id` | Polls portals; enqueues new URLs to pipeline_queue |
| `run_batch` | `user_id, urls: list[str]` | Fans out via Anthropic Batch API |
| `run_pipeline` | `user_id` | Drains pipeline_queue for user |
| `run_apply` | `user_id, eval_id` | Playwright form-fill |
| `run_build` | `user_id, eval_id` | Gap analysis + project suggestions |
| `run_interview_prep` | `user_id, eval_id` | STAR+R story generation |
| `run_compare` | `user_id, eval_ids: list[str]` | Multi-offer comparison |
| `run_deep` | `user_id, url` | Company research |
| `run_outreach` | `user_id, eval_id` | Network map + message drafts |
| `run_negotiation` | `user_id, eval_id` | Comp strategy |
| `run_patterns` | `user_id` | Rejection analysis across tracker |
| `run_training` | `user_id` | Skill gap vs. North Star roles |

### 8.3 SSE Publisher (`server/queue/sse.py`)

```python
import json
import redis
from server.config import settings

_redis = redis.from_url(settings.redis_url)

def publish_sse(user_id: str, event: str, payload: dict) -> None:
    channel = f"jobbot:sse:{user_id}"
    message = json.dumps({"event": event, **payload})
    _redis.publish(channel, message)
```

---

## 9. Engine Layer (`engine/`)

### 9.1 `llm_client.py`

```python
class LLMClient:
    MODEL = "claude-sonnet-4-6"

    def __init__(self):
        self.client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8))
    def structured(self, prompt: str, schema: type[BaseModel]) -> BaseModel:
        """Synchronous. Call from Celery worker context."""
        response = self.client.messages.create(
            model=self.MODEL,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text
        # Strip markdown fences if present
        raw = raw.strip().removeprefix("```json").removesuffix("```").strip()
        return schema.model_validate_json(raw)

    def batch_create(self, requests: list[dict]) -> str:
        """Submit a batch; return batch_id."""
        result = self.client.beta.messages.batches.create(requests=requests)
        return result.id

    def batch_poll(self, batch_id: str) -> list[dict]:
        """Poll until complete; return results."""
        while True:
            batch = self.client.beta.messages.batches.retrieve(batch_id)
            if batch.processing_status == "ended":
                return list(self.client.beta.messages.batches.results(batch_id))
            time.sleep(5)

    def _log_usage(self, response) -> None:
        entry = {
            "ts": datetime.utcnow().isoformat(),
            "model": self.MODEL,
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
        }
        with open("/data/llm-usage.jsonl", "a") as f:
            f.write(json.dumps(entry) + "\n")
```

### 9.2 `eval_engine.py`

**Pydantic models for structured LLM output:**

```python
class JDFields(BaseModel):
    title: str
    company: str
    required_skills: list[str]
    preferred_skills: list[str]
    seniority_level: str          # "IC3" | "IC4" | "IC5" | "IC6" | "manager" | ...
    comp_range_min: int | None
    comp_range_max: int | None
    comp_currency: str | None
    remote_policy: str            # "remote" | "hybrid" | "onsite"
    location: str | None
    language: str                 # ISO 639-1
    region: str                   # "US" | "EU" | ...
    archetype: str                # e.g. "ai-platform-engineer"
    keywords: list[str]           # top 15-20 keywords
    hiring_urgency: str           # "urgent" | "normal" | "slow"

class DimensionScore(BaseModel):
    raw: float = Field(ge=1.0, le=5.0)
    rationale: str

class EvalResult(BaseModel):
    disqualified: bool = False
    disqualification_reason: str | None = None
    score: float                  # weighted sum, 1.0–5.0
    grade: str                    # A|B|C|D|F
    dimensions: dict[str, DimensionScore]
    company: str
    role: str
    keywords: list[str]
    archetype: str
    raw_jd: str
    jd_language: str
    jd_region: str
```

**Grade thresholds:**
```python
def score_to_grade(score: float) -> str:
    if score >= 4.5: return "A"
    if score >= 3.5: return "B"
    if score >= 2.5: return "C"
    if score >= 1.5: return "D"
    return "F"
```

**EvalEngine flow:**
1. Fetch JD text via `httpx.get(url)` (follow redirects; strip HTML with `markdownify` or `BeautifulSoup`)
2. `progress_cb(10, "Fetching job description")`
3. `llm.structured(EXTRACT_JD_PROMPT.format(jd=jd_text), JDFields)` → `jd_fields`
4. `progress_cb(30, "Extracted job fields")`
5. Gate-pass: if `role_match.raw < 2 or skills_alignment.raw < 2` → `EvalResult(disqualified=True, grade="F", score=1.0)`
6. Score remaining 8 dimensions (batched in one LLM call to save tokens)
7. `progress_cb(80, "Scoring dimensions")`
8. Compute weighted sum using `profile.dimension_weights`
9. `grade = score_to_grade(weighted_sum)`
10. `progress_cb(90, "Scoring complete")`
11. Return `EvalResult`

**Prompts location:** `system/prompts/eval_extract_jd.txt`, `system/prompts/eval_score_dimensions.txt`

### 9.3 `resume_engine.py`

**ResumeEngine flow:**
1. `parse_resume_md(content_md)` → sections dict: `{ "summary": str, "experience": list[Role], "skills": list[str], ... }`
2. `inject_keywords(sections, eval_result.keywords)` — regex + semantic matching; inject into summary first, then bullets, then skills
3. `adapt_archetype(sections, load_archetype(eval_result.archetype))` — swap narrative framing per archetype config
4. `reorder_bullets(sections, eval_result.raw_jd, llm)` — LLM scores each bullet 1–5 for JD relevance; sort descending within each role
5. `detect_locale(eval_result.jd_language, eval_result.jd_region)` → `(lang, paper_format)`
6. `render_template("resume.html.j2", ...)` → HTML string

```python
class ResumeEngine:
    def __init__(self, llm: LLMClient):
        self.llm = llm

    def build(self, resume_md: str, eval_result: EvalResult) -> str:
        """Returns rendered HTML string."""
        ...
```

### 9.4 `pdf_renderer.py`

```python
from weasyprint import HTML
from pathlib import Path

def render_pdf(html: str, output_path: str) -> str:
    """Render HTML to PDF, write to output_path, return path."""
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    HTML(string=html).write_pdf(output_path)
    return output_path
```

PDF path convention: `/data/pdfs/{user_id}/{eval_id}.pdf`

---

## 10. Agent Implementations (`agents/`)

All agents expose a `run()` function callable from their Celery task:

```python
# agents/eval.py
def run(user_id: str, url: str, progress_cb: Callable) -> dict:
    """Returns dict with keys: eval_id, grade, score, company, role"""
```

### 10.1 `agents/eval.py`

```
1. Instantiate LLMClient, fetch Profile from DB (sync SQLAlchemy or pre-loaded)
2. EvalEngine.score(url, progress_cb) → EvalResult
3. If not disqualified:
   a. Insert/update Evaluation row in DB
   b. Insert DedupLog entry (ON CONFLICT DO NOTHING)
4. Return { eval_id, grade, score, company, role }
```

### 10.2 `agents/pdf.py`

```
1. Fetch Evaluation by eval_id (verify user_id ownership)
2. Fetch Resume content_md from DB
3. EvalResult = deserialized from evaluation.raw_eval
4. ResumeEngine.build(content_md, eval_result) → html
5. render_pdf(html, f"/data/pdfs/{user_id}/{eval_id}.pdf")
6. Update Evaluation.pdf_path in DB
7. Return { eval_id, pdf_path }
```

### 10.3 `agents/auto_pipeline.py`

```
1. run eval (reuse eval agent logic)
2. If eval passed gate-pass (grade != "F"):
   a. run pdf agent
   b. If grade >= build_auto_trigger_grade from profile:
      - Enqueue build task (do NOT block; fire and forget)
3. Return { eval_id, grade, score, pdf_path }
```

### 10.4 `agents/batch.py`

```
1. Deduplicate URLs against dedup_log
2. Build Anthropic batch requests (extract JD + score in one prompt per URL)
3. Submit via llm.batch_create()
4. Poll via llm.batch_poll() with progress updates
5. For each result: parse EvalResult, write to DB
6. Return { processed: int, skipped: int, results: list[{url, eval_id, grade}] }
```

### 10.5 `agents/scan.py`

```
1. Load list of portal URLs for user's target archetypes
2. For each portal: fetch listing URLs (Playwright if JS-rendered, else httpx)
3. Dedup against dedup_log
4. Insert new URLs into pipeline_queue (status=pending)
5. Optionally trigger pipeline task for immediate processing
6. Return { new_urls: int, skipped: int }
```

---

## 11. System Layer (`system/`)

### 11.1 `system/archetypes/*.json`

Each archetype config file defines narrative framing for the resume engine:

```json
{
  "id": "ai-platform-engineer",
  "labels": ["AI Platform", "ML Platform", "ML Infrastructure"],
  "summary_framing": "Focus on infrastructure scale, model deployment, and platform reliability.",
  "prioritized_skills": ["Python", "Kubernetes", "MLflow", "Ray", "CUDA"],
  "bullet_emphasis": ["scale", "latency", "throughput", "deployed", "production"],
  "de_emphasize": ["front-end", "UI", "design"]
}
```

8 archetypes for v1:
- `ai-platform-engineer`
- `staff-software-engineer`
- `technical-product-manager`
- `engineering-manager`
- `ml-engineer`
- `backend-engineer`
- `data-engineer`
- `devops-platform-engineer`

### 11.2 `system/prompts/`

Prompt files are plain text with `{variable}` placeholders for Python `.format()`.

| File | Variables | Used by |
|---|---|---|
| `eval_extract_jd.txt` | `{jd}` | `eval_engine.py` |
| `eval_score_dimensions.txt` | `{jd_fields_json}`, `{resume_summary}` | `eval_engine.py` |
| `resume_reorder_bullets.txt` | `{bullets_json}`, `{jd_summary}` | `resume_engine.py` |
| `build_gap_analysis.txt` | `{jd_fields_json}`, `{resume_md}` | `agents/build.py` |
| `build_project_gen.txt` | `{gap}`, `{seniority}`, `{jd_keywords}` | `agents/build.py` |
| `interview_prep.txt` | `{jd_fields_json}`, `{resume_md}`, `{archetype}` | `agents/interview_prep.py` |
| `outreach_map.txt` | `{company}`, `{role}`, `{user_summary}` | `agents/outreach.py` |

---

## 12. Frontend (`client/`)

### 12.1 API Client (`src/lib/api.ts`)

```typescript
const BASE = "/api";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",  // send httpOnly cookie
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail ?? "Request failed");
  }
  return res.json();
}
```

### 12.2 SSE Hook (`src/hooks/useJobStream.ts`)

```typescript
type JobEvent =
  | { type: "job:progress"; job_id: string; mode: string; progress: number; message: string }
  | { type: "job:complete"; job_id: string; eval_id: string; grade: string; score: number }
  | { type: "job:failed"; job_id: string; error: string };

export function useJobStream(onEvent: (e: JobEvent) => void) {
  useEffect(() => {
    const es = new EventSource("/api/stream", { withCredentials: true });
    es.addEventListener("job:progress", (e) => onEvent({ type: "job:progress", ...JSON.parse(e.data) }));
    es.addEventListener("job:complete", (e) => onEvent({ type: "job:complete", ...JSON.parse(e.data) }));
    es.addEventListener("job:failed", (e) => onEvent({ type: "job:failed", ...JSON.parse(e.data) }));
    es.onerror = () => es.close();
    return () => es.close();
  }, [onEvent]);
}
```

### 12.3 Page → Component → API Mapping

| Page | Key Components | API Calls |
|---|---|---|
| `/onboarding` | `StepWizard`, `ResumeInput`, `WeightSliders` | `POST /auth/register`, `PUT /api/resume`, `PUT /api/profile` |
| `/` (Dashboard) | `UrlInput`, `JobProgressCard`, `RecentEvals` | `POST /api/agents/auto-pipeline`, `GET /api/tracker?per_page=5` |
| `/tracker` | `EvalTable`, `FilterBar`, `StatusBadge` | `GET /api/tracker`, `PATCH /api/tracker/:id` |
| `/eval/:id` | `DimensionBreakdown`, `BuildSuggestions`, `PdfDownload` | `GET /api/evaluations/:id`, `GET /api/pdf/:id` |
| `/settings` | `ProfileForm`, `WeightSliders`, `ResumeEditor` | `GET/PUT /api/profile`, `GET/PUT /api/resume` |

### 12.4 State Management

- **Server state:** TanStack Query. All API data goes through `useQuery`/`useMutation`. Query keys follow `["resource", id?]` convention.
- **Local UI state:** Zustand store for: active job progress cards, SSE connection status, onboarding step.
- **Optimistic updates:** `PATCH /api/tracker/:id` (status changes) should use `useMutation` with `onMutate` optimistic update + `onError` rollback.

---

## 13. Local Dev Startup Sequence

```bash
# 1. Infrastructure
docker-compose up -d              # starts postgres:5432, redis:6379

# 2. Backend
cd server
uv sync
cp ../.env.example .env           # fill in ANTHROPIC_API_KEY, SECRET_KEY
uv run alembic upgrade head
uv run uvicorn main:app --reload --port 3001

# 3. Celery worker (new terminal)
cd server
uv run celery -A queue.celery_app worker \
  --loglevel=info \
  -Q eval,pdf,batch,scan,build,apply,general \
  --concurrency=4

# 4. Frontend (new terminal)
cd client
npm install
npm run dev                        # Vite on :5173; /api proxied to :3001
```

**Vite proxy config (`vite.config.ts`):**
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
      "/auth": "http://localhost:3001",
    }
  }
});
```

---

## 14. Implementation Order (Phase 1)

Follow this order to enable incremental testing at each step:

1. `docker-compose.yml` — Postgres + Redis
2. `server/config.py` + `.env`
3. `server/db/models.py` + Alembic migration
4. `server/db/base.py` (engine + `get_db`)
5. `engine/llm_client.py`
6. `server/auth/` (jwt, router, dependencies)
7. `server/main.py` (app factory, CORS, auth router mount)
8. `engine/eval_engine.py` + prompts
9. `agents/eval.py`
10. `server/queue/celery_app.py` + `tasks.py` (eval task only)
11. `server/queue/sse.py` + `server/routers/stream.py`
12. `server/routers/agents.py` (eval mode only)
13. `server/routers/tracker.py`
14. `server/routers/profile.py` + `resume.py`
15. `engine/resume_engine.py` + `pdf_renderer.py`
16. `agents/pdf.py` + `agents/auto_pipeline.py`
17. `server/routers/pdf.py`
18. `client/` scaffold + `useJobStream` + Onboarding + Dashboard + Tracker + Eval Detail + Settings
