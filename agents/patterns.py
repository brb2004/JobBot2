from typing import Callable

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from server.config import settings
from server.db.models import Evaluation
from engine.llm_client import LLMClient

# Convert async URL to sync URL
sync_url = settings.database_url.replace(
    "postgresql+asyncpg://", "postgresql+psycopg2://"
)
sync_engine = create_engine(sync_url)


def run(user_id: str, progress_cb: Callable = None) -> dict:
    """
    Identifies patterns across multiple evaluations to suggest long-term skill gaps.
    Returns dict with keys: patterns, skill_gaps
    """
    with Session(sync_engine) as session:
        # Fetch all evaluations for the user
        evals = session.scalars(
            select(Evaluation).where(Evaluation.user_id == user_id)
        ).all()

        if not evals:
            raise ValueError("No evaluations found for this user")

        llm = LLMClient()

        if progress_cb:
            progress_cb("Analyzing patterns across all evaluations...")

        # Consolidate evaluations for the LLM
        eval_summaries = []
        for ev in evals:
            eval_summaries.append(
                f"Role: {ev.role}, Company: {ev.company}, Score: {ev.score}, Raw Eval: {ev.raw_eval}"
            )

        consolidated_evals = "\\n---\\n".join(eval_summaries)

        prompt = f"""
        You are a career coach and skills analyst. Analyze these multiple job evaluations for a single candidate to identify recurring patterns.
        
        Evaluations:
        {consolidated_evals}
        
        Instructions:
        1. Identify recurring 'gaps' or 'weaknesses' that appear across multiple evaluations.
        2. Identify strengths that are consistently recognized.
        3. Suggest a long-term skill development roadmap to address the most critical gaps.
        
        Return as a JSON object with keys: 'patterns' (a detailed analysis string) and 'skill_gaps' (a list of strings).
        """

        from pydantic import BaseModel

        class PatternResponse(BaseModel):
            patterns: str
            skill_gaps: list[str]

        result = llm.structured(prompt, PatternResponse)

        return {"patterns": result.patterns, "skill_gaps": result.skill_gaps}
