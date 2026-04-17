from typing import Callable, Optional

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


def run(
    user_id: str,
    eval_id_1: Optional[str] = None,
    eval_id_2: Optional[str] = None,
    resume_id_1: Optional[str] = None,
    resume_id_2: Optional[str] = None,
    progress_cb: Callable = None,
) -> dict:
    """
    Compares two different resume versions or two evaluations.
    Returns dict with key: comparison
    """
    with Session(sync_engine) as session:
        llm = LLMClient()

        if eval_id_1 and eval_id_2:
            if progress_cb:
                progress_cb("Comparing two job evaluations...")
            ev1 = session.scalar(select(Evaluation).where(Evaluation.id == eval_id_1))
            ev2 = session.scalar(select(Evaluation).where(Evaluation.id == eval_id_2))
            if not ev1 or not ev2:
                raise ValueError("One or both evaluations not found")

            prompt = f"""
            Compare these two job evaluations for the same candidate. 
            Identify which role is a better fit and why, highlighting the differences in scoring and alignment.
            
            Evaluation 1:
            {ev1.raw_eval}
            
            Evaluation 2:
            {ev2.raw_eval}
            
            Provide a detailed comparison and a final recommendation.
            """
            comparison = llm.prompt(prompt)

        elif resume_id_1 and resume_id_2:
            if progress_cb:
                progress_cb("Comparing two resume versions...")
            r1 = session.scalar(select(Resume).where(Resume.id == resume_id_1))
            r2 = session.scalar(select(Resume).where(Resume.id == resume_id_2))
            if not r1 or not r2:
                raise ValueError("One or both resumes not found")

            prompt = f"""
            Compare these two versions of a candidate's resume. 
            Identify the key changes, improvements, and potential drawbacks of the newer version.
            
            Resume 1:
            {r1.content_md}
            
            Resume 2:
            {r2.content_md}
            
            Provide a detailed analysis of the differences.
            """
            comparison = llm.prompt(prompt)
        else:
            raise ValueError("Must provide either two eval_ids or two resume_ids")

        return {"comparison": comparison}
