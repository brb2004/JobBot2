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


def run(user_id: str, eval_id: str, progress_cb: Callable = None) -> dict:
    """
    Suggests specific training/courses to fill the gaps identified in Evaluation.
    Returns dict with key: suggestions
    """
    with Session(sync_engine) as session:
        evaluation = session.scalar(select(Evaluation).where(Evaluation.id == eval_id))

        if not evaluation:
            raise ValueError("Evaluation not found")

        llm = LLMClient()

        if progress_cb:
            progress_cb("Generating personalized training suggestions...")

        prompt = f"""
        You are a technical learning architect. Based on the following job evaluation, suggest a specific learning path to fill the identified gaps.
        
        Job Evaluation:
        {evaluation.raw_eval}
        
        Instructions:
        1. Identify the top 3-5 technical or soft skill gaps.
        2. For each gap, suggest:
           - A specific topic to study.
           - Recommended resources (e.g., courses on Coursera, Udemy, specific books, or documentation).
           - A small project or exercise to prove mastery of the skill.
        
        Return the result as a JSON object with a key 'suggestions' containing a list of objects with 'skill', 'resources', and 'project'.
        """

        from pydantic import BaseModel

        class Suggestion(BaseModel):
            skill: str
            resources: list[str]
            project: str

        class TrainingResponse(BaseModel):
            suggestions: list[Suggestion]

        result = llm.structured(prompt, TrainingResponse)

        return {"suggestions": [s.model_dump() for s in result.suggestions]}
