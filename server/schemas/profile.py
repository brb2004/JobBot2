from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional
import uuid

REQUIRED_WEIGHT_KEYS = {
    "role_match",
    "skills_alignment",
    "seniority",
    "compensation",
    "interview_likelihood",
    "company_stage",
    "product_market_fit",
    "geographic_feasibility",
    "growth_trajectory",
    "hiring_timeline",
}


class ProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    target_roles: list[str] | None = Field(None)
    target_archetypes: list[str] | None = Field(None)
    comp_min: float | None = Field(None)
    comp_ideal: float | None = Field(None)
    comp_currency: str | None = Field(None)
    remote_only: bool
    timezones_acceptable: list[str] | None = Field(None)
    dimension_weights: dict[str, float] | None = Field(None)
    scan_cadence: str | None = Field(None)
    build_auto_trigger_grade: str | None = Field(None)
    created_at: str | None = Field(None)
    updated_at: str | None = Field(None)


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = None
    email: str | None = None
    current_job_title: str | None = None
    target_roles: list[str] | None = Field(None)
    target_archetypes: list[str] | None = Field(None)
    comp_min: float | None = Field(None)
    comp_ideal: float | None = Field(None)
    comp_currency: str | None = Field(None, max_length=10)
    remote_only: bool | None = Field(None)
    timezones_acceptable: list[str] | None = Field(None)
    dimension_weights: dict[str, float] | None = Field(None)
    scan_cadence: str | None = Field(None)
    build_auto_trigger_grade: str | None = Field(None, max_length=2)

    @field_validator("dimension_weights")
    @classmethod
    def validate_weights(cls, v):
        if v is None:
            return v

        if set(v.keys()) != REQUIRED_WEIGHT_KEYS:
            raise ValueError(
                f"dimension_weights must contain exactly the keys: {REQUIRED_WEIGHT_KEYS}"
            )

        if not abs(sum(v.values()) - 1.0) < 1e-6:
            raise ValueError("dimension_weights must sum to 1.0")

        return v
