from pydantic import BaseModel, ConfigDict, Field, field_validator
from uuid import UUID
from datetime import datetime

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
