import json
from collections.abc import Callable
from pathlib import Path

from curl_cffi import requests as curl_requests
from bs4 import BeautifulSoup
from pydantic import BaseModel, Field

from engine.llm_client import LLMClient

# ---------------------------------------------------------------------------
# Prompt paths
# ---------------------------------------------------------------------------

_PROMPTS_DIR = Path(__file__).parent.parent / "system" / "prompts"

EXTRACT_JD_PROMPT: str = (_PROMPTS_DIR / "eval_extract_jd.txt").read_text()
SCORE_DIMENSIONS_PROMPT: str = (_PROMPTS_DIR / "eval_score_dimensions.txt").read_text()

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class JDFields(BaseModel):
    title: str
    company: str
    required_skills: list[str]
    preferred_skills: list[str]
    seniority_level: str
    comp_range_min: int | None
    comp_range_max: int | None
    comp_currency: str | None
    remote_policy: str
    location: str | None
    language: str
    region: str
    archetype: str
    keywords: list[str]
    hiring_urgency: str


class DimensionScore(BaseModel):
    raw: float = Field(ge=1.0, le=5.0)
    rationale: str


class EvalResult(BaseModel):
    disqualified: bool = False
    disqualification_reason: str | None = None
    score: float
    grade: str
    dimensions: dict[str, DimensionScore]
    company: str
    role: str
    keywords: list[str]
    archetype: str
    raw_jd: str
    jd_language: str
    jd_region: str


# ---------------------------------------------------------------------------
# Internal model used to parse the scoring LLM response
# ---------------------------------------------------------------------------


class _DimensionsResponse(BaseModel):
    role_match: DimensionScore
    skills_alignment: DimensionScore
    seniority: DimensionScore
    compensation: DimensionScore
    interview_likelihood: DimensionScore
    company_stage: DimensionScore
    product_market_fit: DimensionScore
    geographic_feasibility: DimensionScore
    growth_trajectory: DimensionScore
    hiring_timeline: DimensionScore


# ---------------------------------------------------------------------------
# Grade helper
# ---------------------------------------------------------------------------


def score_to_grade(score: float) -> str:
    """Convert a weighted score (1.0–5.0) to a letter grade."""
    if score >= 4.5:
        return "A"
    if score >= 3.5:
        return "B"
    if score >= 2.5:
        return "C"
    if score >= 1.5:
        return "D"
    return "F"


# ---------------------------------------------------------------------------
# EvalEngine
# ---------------------------------------------------------------------------

# Default dimension weights used when the profile has none configured.
_DEFAULT_WEIGHTS: dict[str, float] = {
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


class EvalEngine:
    def __init__(self, llm: LLMClient, profile) -> None:
        self.llm = llm
        self.profile = profile  # Profile ORM object with dimension_weights dict

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------

    def score(self, url: str, progress_cb: Callable[[int, str], None]) -> EvalResult:
        """Run the full 11-step eval pipeline and return an EvalResult."""

        # Step 1: Fetch and strip JD text
        jd_text = self._fetch_jd(url)

        # Step 2: Progress callback after fetch
        progress_cb(10, "Fetching job description")

        # Step 3: Extract structured JD fields via LLM
        jd_fields: JDFields = self.llm.structured(
            EXTRACT_JD_PROMPT.format(jd=jd_text),
            JDFields,
        )

        # Step 4: Progress callback after extraction
        progress_cb(30, "Extracted job fields")

        # Step 5 & 6: Score all 10 dimensions in a single LLM call
        resume_summary = self._build_resume_summary()
        jd_fields_json = jd_fields.model_dump_json(indent=2)

        dims_response: _DimensionsResponse = self.llm.structured(
            SCORE_DIMENSIONS_PROMPT.format(
                jd_fields_json=jd_fields_json,
                resume_summary=resume_summary,
            ),
            _DimensionsResponse,
        )

        # Step 7: Progress callback after scoring
        progress_cb(80, "Scoring dimensions")

        # Build the dimensions dict
        dimensions: dict[str, DimensionScore] = {
            "role_match": dims_response.role_match,
            "skills_alignment": dims_response.skills_alignment,
            "seniority": dims_response.seniority,
            "compensation": dims_response.compensation,
            "interview_likelihood": dims_response.interview_likelihood,
            "company_stage": dims_response.company_stage,
            "product_market_fit": dims_response.product_market_fit,
            "geographic_feasibility": dims_response.geographic_feasibility,
            "growth_trajectory": dims_response.growth_trajectory,
            "hiring_timeline": dims_response.hiring_timeline,
        }

        # Step 8: Gate-pass check
        if (
            dims_response.role_match.raw < 2
            or dims_response.skills_alignment.raw < 2
        ):
            return EvalResult(
                disqualified=True,
                disqualification_reason=(
                    "Disqualified: role_match or skills_alignment score below threshold (raw < 2)."
                ),
                score=1.0,
                grade="F",
                dimensions=dimensions,
                company=jd_fields.company,
                role=jd_fields.title,
                keywords=jd_fields.keywords,
                archetype=jd_fields.archetype,
                raw_jd=jd_text,
                jd_language=jd_fields.language,
                jd_region=jd_fields.region,
            )

        # Step 9: Compute weighted sum
        weights: dict[str, float] = (
            self.profile.dimension_weights
            if self.profile is not None
            and getattr(self.profile, "dimension_weights", None)
            else _DEFAULT_WEIGHTS
        )

        weighted_sum = sum(
            dimensions[dim].raw * weights.get(dim, 0.0)
            for dim in dimensions
        )

        # Step 10: Compute grade
        grade = score_to_grade(weighted_sum)

        # Step 11: Progress callback before return
        progress_cb(90, "Scoring complete")

        return EvalResult(
            disqualified=False,
            disqualification_reason=None,
            score=weighted_sum,
            grade=grade,
            dimensions=dimensions,
            company=jd_fields.company,
            role=jd_fields.title,
            keywords=jd_fields.keywords,
            archetype=jd_fields.archetype,
            raw_jd=jd_text,
            jd_language=jd_fields.language,
            jd_region=jd_fields.region,
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _fetch_jd(self, url: str) -> str:
        """Fetch the page at *url* and return plain text (HTML stripped)."""
        response = curl_requests.get(url, impersonate="chrome", timeout=30)
        response.raise_for_status()

        content_type = response.headers.get("content-type", "")
        if "html" in content_type or response.text.lstrip().startswith("<"):
            soup = BeautifulSoup(response.text, "html.parser")
            # Remove script/style noise
            for tag in soup(["script", "style", "noscript", "header", "footer", "nav"]):
                tag.decompose()
            text = soup.get_text(separator="\n")
            # Collapse excessive blank lines
            lines = [line.strip() for line in text.splitlines()]
            text = "\n".join(line for line in lines if line)
            return text

        return response.text

    def _build_resume_summary(self) -> str:
        """
        Derive a resume summary from the profile.

        Uses target_roles when available; falls back to a generic placeholder
        so the scoring prompt always receives a non-empty string.
        """
        if self.profile is None:
            return "Candidate profile not available."

        parts: list[str] = []

        target_roles = getattr(self.profile, "target_roles", None)
        if target_roles:
            parts.append(f"Target roles: {', '.join(target_roles)}.")

        target_archetypes = getattr(self.profile, "target_archetypes", None)
        if target_archetypes:
            parts.append(f"Target archetypes: {', '.join(target_archetypes)}.")

        comp_min = getattr(self.profile, "comp_min", None)
        comp_ideal = getattr(self.profile, "comp_ideal", None)
        comp_currency = getattr(self.profile, "comp_currency", "USD")
        if comp_min is not None or comp_ideal is not None:
            comp_parts = []
            if comp_min is not None:
                comp_parts.append(f"minimum {comp_min:,.0f}")
            if comp_ideal is not None:
                comp_parts.append(f"ideal {comp_ideal:,.0f}")
            parts.append(
                f"Compensation expectations ({comp_currency}): {', '.join(comp_parts)}."
            )

        remote_only = getattr(self.profile, "remote_only", None)
        if remote_only:
            parts.append("Candidate requires fully remote work.")

        timezones = getattr(self.profile, "timezones_acceptable", None)
        if timezones:
            parts.append(f"Acceptable timezones: {', '.join(timezones)}.")

        # If the user's resume content is linked via the ORM relationship, include it
        resume = getattr(self.profile, "user", None)
        if resume is not None:
            resume_obj = getattr(resume, "resume", None)
            if resume_obj is not None:
                content_md = getattr(resume_obj, "content_md", None)
                if content_md:
                    parts.append(f"\nResume:\n{content_md}")

        if not parts:
            return "Candidate profile not available."

        return "\n".join(parts)
