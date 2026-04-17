from typing import Callable

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from server.config import settings
from server.db.models import Profile, Evaluation, Resume
from engine.llm_client import LLMClient

# Convert async URL to sync URL
sync_url = settings.database_url.replace(
    "postgresql+asyncpg://", "postgresql+psycopg2://"
)
sync_engine = create_engine(sync_url)


def run(user_id: str, eval_id: str, progress_cb: Callable = None) -> dict:
    """
    Provides negotiation strategies based on the job's value and the candidate's strengths.
    Returns dict with key: strategies
    """
    with Session(sync_engine) as session:
        profile = session.scalar(select(Profile).where(Profile.user_id == user_id))
        resume = session.scalar(select(Resume).where(Resume.user_id == user_id))
        evaluation = session.scalar(select(Evaluation).where(Evaluation.id == eval_id))

        if not resume or not evaluation:
            raise ValueError("Resume or Evaluation not found")

        llm = LLMClient()

        if progress_cb:
            progress_cb(
                "Analyzing compensation and strengths for negotiation strategies..."
            )

        prompt = f"""
        You are an expert salary negotiator. Provide a strategic negotiation plan for the candidate.
        
        Candidate Profile:
        - Target Comp Min: {getattr(profile, "comp_min", "Not specified")}
        - Target Comp Ideal: {getattr(profile, "comp_ideal", "Not specified")}
        - Currency: {getattr(profile, "comp_currency", "USD")}
        
        Candidate Resume:
        {resume.content_md}
        
        Job Evaluation:
        {evaluation.raw_eval}
        
        Instructions:
        1. Analyze the 'leverage' the candidate has based on the Evaluation score and their specific skills.
        2. Suggest a target salary range and a 'walk-away' number.
        3. Provide 3-5 specific talking points/scripts for the negotiation call.
        4. Suggest non-monetary benefits to negotiate for if salary is fixed.
        
        Provide a comprehensive and tactical guide.
        """

        strategies = llm.prompt(prompt)

        return {"strategies": strategies}
