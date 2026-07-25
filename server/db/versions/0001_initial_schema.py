"""Initial schema: create all tables and indexes

Revision ID: 0001
Revises:
Create Date: 2026-04-10 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- users ---
    op.create_table(
        "users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column("email", sa.String(), unique=True, nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    # --- profiles ---
    op.create_table(
        "profiles",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            unique=True,
            nullable=False,
        ),
        sa.Column(
            "target_roles",
            postgresql.ARRAY(sa.String()),
            nullable=True,
        ),
        sa.Column(
            "target_archetypes",
            postgresql.ARRAY(sa.String()),
            nullable=True,
        ),
        sa.Column("comp_min", sa.Float(), nullable=True),
        sa.Column("comp_ideal", sa.Float(), nullable=True),
        sa.Column("comp_currency", sa.String(length=10), nullable=True),
        sa.Column("remote_only", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "timezones_acceptable",
            postgresql.ARRAY(sa.String()),
            nullable=True,
        ),
        sa.Column("dimension_weights", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("scan_cadence", sa.String(), nullable=True),
        sa.Column("build_auto_trigger_grade", sa.String(length=2), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(op.f("ix_profiles_user_id"), "profiles", ["user_id"], unique=False)

    # --- evaluations ---
    op.create_table(
        "evaluations",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("company", sa.String(), nullable=True),
        sa.Column("role", sa.String(), nullable=True),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("grade", sa.String(length=2), nullable=True),
        sa.Column(
            "status",
            sa.String(),
            nullable=False,
            server_default=sa.text("'new'"),
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("raw_eval", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("pdf_path", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("applied_at", sa.TIMESTAMP(), nullable=True),
    )
    # Composite indexes on evaluations as specified in DDD §6.3
    op.create_index("ix_evals_user_status", "evaluations", ["user_id", "status"])
    op.create_index("ix_evals_user_grade", "evaluations", ["user_id", "grade"])
    op.create_index("ix_evals_user_created", "evaluations", ["user_id", "created_at"])

    # --- resumes ---
    op.create_table(
        "resumes",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            unique=True,
            nullable=False,
        ),
        sa.Column("content_md", sa.Text(), nullable=True),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(op.f("ix_resumes_user_id"), "resumes", ["user_id"], unique=True)

    # --- dedup_logs ---
    op.create_table(
        "dedup_logs",
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            primary_key=True,
            nullable=False,
        ),
        sa.Column("url", sa.Text(), primary_key=True, nullable=False),
    )

    # --- pipeline_queue ---
    op.create_table(
        "pipeline_queue",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column(
            "status",
            sa.String(),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        op.f("ix_pipeline_queue_user_id"), "pipeline_queue", ["user_id"], unique=False
    )


def downgrade() -> None:
    # Drop in reverse dependency order

    # pipeline_queue
    op.drop_index(op.f("ix_pipeline_queue_user_id"), table_name="pipeline_queue")
    op.drop_table("pipeline_queue")

    # dedup_logs
    op.drop_table("dedup_logs")

    # resumes
    op.drop_index(op.f("ix_resumes_user_id"), table_name="resumes")
    op.drop_table("resumes")

    # evaluations (composite indexes first)
    op.drop_index("ix_evals_user_created", table_name="evaluations")
    op.drop_index("ix_evals_user_grade", table_name="evaluations")
    op.drop_index("ix_evals_user_status", table_name="evaluations")
    op.drop_table("evaluations")

    # profiles
    op.drop_index(op.f("ix_profiles_user_id"), table_name="profiles")
    op.drop_table("profiles")

    # users
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
