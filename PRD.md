# Product Requirements Document: JobBot

**Version:** 1.2  
**Date:** 2026-04-10  
**Status:** Draft

---

## 1. Overview

JobBot is a modular, multi-agent web application for high-signal job searching. It automates the full application lifecycle — from discovery and scoring to resume generation, tracking, and interview prep — through a set of specialized agents triggered from a browser-based UI backed by a persistent server.

### Problem Statement

Job searching is high-effort, low-signal. Applicants manually evaluate listings, tailor resumes, track applications across spreadsheets, and prep for interviews without tooling. The result is wasted time on bad-fit roles and missed opportunities on good ones.

### Goal

Reduce time-per-qualified-application by 80% while increasing match quality through automated evaluation, dynamic resume generation, and pipeline management.

---

## 2. Users

**Primary user:** A senior individual contributor (engineer, PM, or similar) conducting a focused job search. Comfortable with web tools; no CLI or technical setup required.

**Assumptions:**
- Has an existing CV/resume in text or LinkedIn format
- Is targeting 2–5 specific role archetypes
- Knows their compensation target and constraints
- Runs job searches in recurring sprints (weekly or daily)

---

## 3. System Architecture

JobBot consists of five subsystems:

| Subsystem | Purpose |
|---|---|
| Web Frontend | Browser UI for triggering agents, viewing results, and managing the pipeline |
| API Server | REST backend exposing agent actions as endpoints; manages auth and job queuing |
| Agent Layer | 15 agent types, each owning a specific task; executed as background jobs |
| Evaluation Engine | 10-dimension scoring with A–F grade and 1–5 score |
| Resume Engine | Just-in-time PDF generation with dynamic personalization |
| Data Layer | PostgreSQL for user accounts, evaluations, tracker state; file storage for PDFs and cv.md |

---

## 4. Features

### 4.1 Agent Modes (15 Agents)

Each agent is triggered from the web UI or via a background scheduler. The user initiates actions through forms, URL inputs, and dashboard controls — not a terminal.

#### Core Pipeline

| Mode | Description | Priority |
|---|---|---|
| `auto-pipeline` | Primary orchestrator: extracts JD → scores → generates PDF → logs to tracker | P0 |
| `pdf` | Renders ATS-optimized, dynamically tailored resume PDF; downloadable from dashboard | P0 |
| `tracker` | Web dashboard for browsing, filtering, and managing the application pipeline | P0 |
| `scan` | Background agent monitoring 45+ career portals (Greenhouse, Ashby, Lever); auto-deduplicates | P1 |
| `pipeline` | Processes a queue of URLs submitted via the UI's bulk-input panel | P1 |
| `batch` | Parallel orchestrator evaluating up to 122 URLs simultaneously | P1 |

#### Evaluation & Research

| Mode | Description | Priority |
|---|---|---|
| `eval` | Standalone evaluation of a single job listing | P0 |
| `compare` | Comparative analysis between multiple offers | P1 |
| `deep` | Company culture, financials, news research | P2 |
| `patterns` | Rejection analysis to identify strategy pivots | P2 |

#### Action & Outreach

| Mode | Description | Priority |
|---|---|---|
| `apply` | Browser automation (Playwright) to pre-fill application forms | P1 |
| `outreach` | Network mapping + personalized outreach/LinkedIn message drafting | P2 |

#### Career Development

| Mode | Description | Priority |
|---|---|---|
| `interview-prep` | Generates round-by-round process intel + STAR+R stories per role | P1 |
| `build` | Suggests portfolio projects to close skill gaps identified in a job posting | P1 |
| `negotiation` | Compensation strategy, anchoring scripts, competing-offer leverage | P2 |
| `training` | Skill gap analysis against "North Star" roles; suggests certifications | P3 |

---

### 4.2 10-Dimension Evaluation Framework

Every job evaluation produces an **A–F grade** and a **1–5 numeric score** across:

| Category | Dimension | Description |
|---|---|---|
| Gate-Pass | Role Match | Structural title/level alignment |
| Gate-Pass | Skills Alignment | Tech stack / tool overlap |
| Priority | Seniority | Responsibility and scope level |
| Priority | Compensation | Market rate vs. user target |
| Priority | Interview Likelihood | Estimated callback probability |
| Cultural/Structural | Company Stage | Startup vs. Enterprise fit |
| Cultural/Structural | Product-Market Fit | Business health and traction |
| Cultural/Structural | Geographic Feasibility | Remote/Hybrid/Timezone compatibility |
| Secondary | Growth Trajectory | Career ladder visibility |
| Secondary | Hiring Timeline | Role urgency / hiring speed |

**Requirements:**
- Gate-pass dimensions can disqualify a listing before scoring continues
- Weights must be user-configurable in `profile.yml`
- Score output must be parseable for tracker ingestion and batch ranking

---

### 4.3 Dynamic Resume & Content Personalization

The resume engine builds a unique PDF per listing at evaluation time.

#### Keyword Injection
- Extract 15–20 keywords from job description
- Inject into: summary, professional experience bullets, skills section
- Prioritize exact-match phrasing where resume content supports it

#### Archetype Adaptation
- Detect role archetype from JD (e.g., AI Platform Engineer, Technical PM, Staff SWE)
- Shift narrative framing and project selection to match archetype
- Maintain an archetype config registry in the system layer

#### Relevance Reordering
- Score each experience bullet against the JD
- Reorder bullets within each role to front-load most-relevant achievements

#### Localization
- Detect JD language and target region
- Auto-select PDF language and paper format (US Letter vs. A4)

---

### 4.4 `build` Mode — Portfolio Project Suggestions

The `build` mode bridges the gap between a user's current experience and a target role's requirements by generating concrete, buildable project ideas that directly address skill gaps.

#### Inputs
- Job description URL or text (same as `eval`)
- User's `cv.md` (existing experience and skills)

#### Process
1. **Gap Analysis** — diff the JD's required/preferred skills against skills demonstrated in `cv.md`
2. **Gap Prioritization** — rank gaps by: (a) whether the skill is required vs. preferred, (b) how commonly it appears across the user's saved target roles in the tracker
3. **Project Generation** — for each top-N gap, generate 1–3 project ideas that would plausibly demonstrate the missing skill at an appropriate seniority level

#### Output — Per Suggested Project
| Field | Description |
|---|---|
| Title | Short project name (e.g., "Kubernetes-Orchestrated Microservice Deploy") |
| Gap Addressed | The specific skill or requirement it closes |
| Description | 2–3 sentence summary of what to build |
| Tech Stack | Exact tools/versions to use (sourced from JD language) |
| Key Deliverables | 3–5 bullet points: what to build, what to demo, what to document |
| Resume Bullet | Pre-written resume bullet the user can add once the project is complete |
| Estimated Effort | T-shirt size: S (1–2 days), M (3–7 days), L (1–2 weeks) |
| Priority | High / Medium / Low based on gap rank |

#### Behavior
- Suggestions are scoped to be realistic portfolio projects, not full products
- Tech stack wording mirrors the JD exactly (e.g., if JD says "k8s", output uses "k8s")
- Pre-written resume bullets follow the same format as existing bullets in `cv.md`
- Output saved to `data/build-suggestions/<jd-slug>.md` for reference and iteration

#### Integration
- `auto-pipeline` can optionally invoke `build` when a job scores B or higher but has flagged skill gaps
- `training` mode consumes `build` output to de-duplicate gap coverage (certifications vs. projects)

---

### 4.5 System Infrastructure

#### Onboarding Wizard
- 5-minute setup flow presented as a multi-step web form
- Accepts: LinkedIn URL, paste of existing resume text, or structured form input
- Outputs: stored resume record and user preferences saved to the user's account in the database

#### Auto-Deduplication
- Maintain a per-user URL history in the database (target capacity: 680+ entries)
- Block re-evaluation of any URL already in the user's history
- Apply across all agents: `auto-pipeline`, `scan`, `batch`, `pipeline`

#### User Data Isolation
- All user data (resume, preferences, evaluations, tracker) is scoped to an authenticated account
- System logic (archetype configs, scoring defaults, prompt templates) is shared and never user-editable directly
- Account deletion cascades and removes all associated user data

#### Integrity Checks
- Server-side validation on all tracker writes: status enum, score range, URL uniqueness per user
- Admin health endpoint exposing data layer integrity metrics

#### STAR+R Story Bank
- Accumulating repository of interview stories
- Schema: Situation, Task, Action, Result, **Reflection** (signals seniority)
- Stories tagged by competency and role archetype for reuse in `interview-prep`

---

## 5. Data Model

All data is stored server-side in PostgreSQL, scoped to a user account.

### `users`
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| email | text | unique |
| password_hash | text | bcrypt |
| name | text | |
| created_at | timestamp | |

### `profiles`
User preferences and evaluation weights. One row per user.
| Field | Type | Notes |
|---|---|---|
| user_id | UUID | FK → users |
| target_roles | text[] | |
| target_archetypes | text[] | |
| comp_min | int | |
| comp_ideal | int | |
| comp_currency | char(3) | ISO 4217 |
| remote_only | bool | |
| timezones_acceptable | text[] | |
| dimension_weights | jsonb | must sum to 1.0 |
| scan_cadence | text | cron expression |
| build_auto_trigger_grade | char(1) | default 'B' |

### `resumes`
Stores the parsed resume source per user (replaces `cv.md`).
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users |
| content_md | text | Markdown resume source |
| updated_at | timestamp | |

### `evaluations`
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users |
| url | text | unique per user |
| company | text | |
| role | text | |
| score | numeric(3,2) | 1.00–5.00 |
| grade | char(1) | A–F |
| status | text | new \| applied \| interviewing \| rejected \| offer |
| pdf_path | text | server file path or object storage key |
| applied_at | timestamp | |
| notes | text | |
| raw_eval | jsonb | full 10-dimension breakdown |
| created_at | timestamp | |

### `dedup_log`
| Field | Type | Notes |
|---|---|---|
| user_id | UUID | FK → users |
| url | text | |
| seen_at | timestamp | |
| PRIMARY KEY | (user_id, url) | |

### `pipeline_queue`
URLs submitted via the bulk-input UI panel, pending evaluation.
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users |
| url | text | |
| queued_at | timestamp | |
| status | text | pending \| processing \| done \| failed |

### `build_suggestions`
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users |
| evaluation_id | UUID | FK → evaluations |
| content_md | text | rendered suggestion Markdown |
| created_at | timestamp | |

---

## 6. Non-Functional Requirements

| Requirement | Target |
|---|---|
| `batch` throughput | 122 URLs evaluated in < 10 minutes |
| PDF generation latency | < 30 seconds per resume |
| `build` suggestion generation | < 60 seconds per JD |
| Dedup lookup | < 100ms |
| Tracker dashboard load | < 500ms initial page load; < 200ms for filter/sort |
| Onboarding wizard completion | < 5 minutes end-to-end |
| API response (non-agent endpoints) | < 200ms p95 |
| Real-time job status updates | Streamed via Server-Sent Events within 1s of state change |

---

## 7. Out of Scope (v1)

- Mobile native app (responsive web is in scope)
- Automated job board login / OAuth flows
- Email integration for response tracking
- ATS submission APIs (beyond Playwright form-filling)
- Multi-user / team features
- Social login (Google, LinkedIn OAuth) — email/password only in v1

---

## 8. Build Phases

### Phase 1 — Core Pipeline (P0)
1. Onboarding wizard → `cv.md` + `profile.yml`
2. `eval` mode — single JD evaluation with 10-dimension scoring
3. `pdf` mode — dynamic resume generation from `cv.md` + JD
4. `auto-pipeline` orchestrator — wraps eval + pdf + tracker write
5. `tracker` TUI — browse and filter evaluations

### Phase 2 — Scale & Automation (P1)
6. `scan` mode — multi-portal monitoring with deduplication
7. `pipeline` mode — batch URL queue processor
8. `batch` mode — parallel evaluation orchestrator
9. `apply` mode — Playwright form-filling
10. `interview-prep` mode + STAR+R story bank
11. `build` mode — portfolio project suggestions
12. `compare` mode — multi-offer comparison

### Phase 3 — Intelligence & Outreach (P2)
13. `deep` mode — company research
14. `outreach` mode — network mapping + outreach drafting
15. `negotiation` mode — compensation strategy
16. `patterns` mode — rejection analysis

### Phase 4 — Long-Term Growth (P3)
17. `training` mode — skill gap analysis (integrates with `build` output)
18. Integrity check scripts (`doctor.mjs`, `verify-pipeline.mjs`)

---

## 9. Open Questions

1. **LLM provider:** Which model/API for JD parsing, scoring, and content generation? (Cost and latency tradeoffs for batch mode)
2. **Tracker storage:** CSV (portable, simple) vs. SQLite (query-friendly for TUI filters)?
3. **PDF rendering:** Puppeteer/Playwright HTML→PDF vs. a LaTeX pipeline for ATS compatibility?
4. **scan cadence:** How often should portal polling run — cron interval or daemon?
5. **Archetype registry:** How many archetypes to ship v1? Who maintains the config?
6. **STAR+R bank format:** Markdown flat file vs. structured JSON/YAML for query/tagging?
7. **`build` top-N gaps:** How many gaps should `build` generate projects for per JD — fixed number or threshold-based?
