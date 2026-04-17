import uuid
from typing import Optional

from sqlalchemy import (
    Boolean,
    Float,
    ForeignKey,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[Optional[str]] = mapped_column(
        server_default=func.now(), nullable=False
    )

    profile: Mapped[Optional["Profile"]] = relationship(
        "Profile", back_populates="user", uselist=False
    )
    resume: Mapped[Optional["Resume"]] = relationship(
        "Resume", back_populates="user", uselist=False
    )
    evaluations: Mapped[list["Evaluation"]] = relationship(
        "Evaluation", back_populates="user"
    )
    dedup_logs: Mapped[list["DedupLog"]] = relationship(
        "DedupLog", back_populates="user"
    )
    pipeline_queue: Mapped[list["PipelineQueue"]] = relationship(
        "PipelineQueue", back_populates="user"
    )


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    target_roles: Mapped[Optional[list]] = mapped_column(ARRAY(String), nullable=True)
    target_archetypes: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), nullable=True
    )
    comp_min: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    comp_ideal: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    comp_currency: Mapped[Optional[str]] = mapped_column(
        String(10), nullable=True, default="USD"
    )
    remote_only: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    timezones_acceptable: Mapped[Optional[list]] = mapped_column(
        ARRAY(String), nullable=True
    )
    current_job_title: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    # JSONB must always contain all 10 dimension keys — enforced at the application layer
    dimension_weights: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    scan_cadence: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    build_auto_trigger_grade: Mapped[Optional[str]] = mapped_column(
        String(2), nullable=True
    )
    created_at: Mapped[Optional[str]] = mapped_column(
        server_default=func.now(), nullable=False
    )
    updated_at: Mapped[Optional[str]] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="profile")


class Evaluation(Base):
    __tablename__ = "evaluations"

    __table_args__ = (
        Index("ix_evals_user_status", "user_id", "status"),
        Index("ix_evals_user_grade", "user_id", "grade"),
        Index("ix_evals_user_created", "user_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    url: Mapped[str] = mapped_column(Text, nullable=False)
    company: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    role: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    grade: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    # Enum values: new, applied, interviewing, rejected, offer
    status: Mapped[str] = mapped_column(String, nullable=False, default="new")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    raw_eval: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    pdf_path: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[Optional[str]] = mapped_column(
        server_default=func.now(), nullable=False
    )
    applied_at: Mapped[Optional[str]] = mapped_column(nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="evaluations")


class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        unique=True,
        index=True,
    )
    content_md: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_at: Mapped[Optional[str]] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="resume")


class DedupLog(Base):
    __tablename__ = "dedup_logs"

    # Composite PK (user_id, url) — the deduplication check
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True
    )
    url: Mapped[str] = mapped_column(Text, primary_key=True)

    user: Mapped["User"] = relationship("User", back_populates="dedup_logs")


class PipelineQueue(Base):
    __tablename__ = "pipeline_queue"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    url: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    created_at: Mapped[Optional[str]] = mapped_column(
        server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="pipeline_queue")
