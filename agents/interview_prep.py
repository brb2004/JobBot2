from typing import Callable

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from server.config import settings
from server.db.models import Evaluation, Resume
from engine.llm_client import LLMClient

# Convert async URL to sync URL
sync_url = settings.database_url.replace(
    "postgresql+asyncpg://", "postgresql+psycopg2://"
)
sync_engine = create_engine(sync_url)


def run(user_id: str, eval_id: str, progress_cb: Callable = None) -> dict:
    """
    Generates interview questions and talking points based on Evaluation and Resume.
    Returns dict with keys: questions, talking_points
    """
    with Session(sync_engine) as session:
        resume = session.scalar(select(Resume).where(Resume.user_id == user_id))
        evaluation = session.scalar(select(Evaluation).where(Evaluation.id == eval_id))

        if not resume or not evaluation:
            raise ValueError("Resume or Evaluation not found")

        llm = LLMClient()

        if progress_cb:
            progress_cb("Analyzing resume and job evaluation for interview prep...")

        prompt = f"""
        You are an expert interview coach. Generate a comprehensive interview preparation guide for a candidate.
        
        Candidate Resume:
        {resume.content_md}
        
        Job Evaluation:
        {evaluation.raw_eval}
        
        Instructions:
        1. Generate 5-10 challenging interview questions tailored to the gaps and strengths identified in the evaluation.
        2. For each question, provide 'Talking Points' that leverage the candidate's specific experience from their resume.
        3. Include a section on 'High-Impact Questions' the candidate should ask the interviewer.
        
        Return the result as a JSON object with keys: 'questions' (a list of objects with 'question' and 'talking_points') and 'interviewer_questions' (a list of strings).
        """

        # Using structured to get a clean response
        # Defining a simple structure for the response
        from pydantic import BaseModel, Field

        class PrepResponse(BaseModel):
            questions: list[dict[str, str]]
            interviewer_questions: list[str]

        result = llm.structured(prompt, PrepResponse)

        return {
            "questions": result.questions,
            "talking_points": result.interviewer_questions,
        }
