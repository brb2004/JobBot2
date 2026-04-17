from typing import Callable

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from server.config import settings
from server.db.models import Profile, Evaluation, Resume
from engine.llm_client import LLMClient
from engine.resume_engine import ResumeEngine
from engine.eval_engine import EvalResult

# Convert async URL to sync URL
sync_url = settings.database_url.replace(
    "postgresql+asyncpg://", "postgresql+psycopg2://"
)
sync_engine = create_engine(sync_url)


def run(
    user_id: str, eval_id: str, feedback: str = None, progress_cb: Callable = None
) -> dict:
    """
    Builds a tailored resume based on an evaluation and optional feedback.
    Returns dict with keys: html_content, resume_id
    """
    with Session(sync_engine) as session:
        # 1. Fetch Profile, Resume, and Evaluation
        profile = session.scalar(select(Profile).where(Profile.user_id == user_id))
        resume = session.scalar(select(Resume).where(Resume.user_id == user_id))
        evaluation = session.scalar(select(Evaluation).where(Evaluation.id == eval_id))

        if not resume or not evaluation:
            raise ValueError("Resume or Evaluation not found")

        # 2. Initialize LLM and Engines
        llm = LLMClient()
        resume_engine = ResumeEngine(llm)

        # 3. Convert raw_eval (dict) to EvalResult object
        eval_result = EvalResult(**evaluation.raw_eval)

        # 4. Incorporate feedback if provided
        resume_md = resume.content_md
        if feedback:
            if progress_cb:
                progress_cb("Incorporating user feedback into resume...")

            prompt = f"""
            You are a resume expert. The user has provided feedback on their resume. 
            Update the resume markdown to reflect this feedback while maintaining a professional tone.
            
            Feedback: {feedback}
            
            Current Resume (Markdown):
            {resume_md}
            
            Return ONLY the updated markdown.
            """
            resume_md = llm.prompt(prompt)

        # 5. Build the tailored resume
        if progress_cb:
            progress_cb("Generating tailored resume...")

        html_content = resume_engine.build(resume_md, eval_result)

        return {"html_content": html_content, "resume_id": str(resume.id)}
