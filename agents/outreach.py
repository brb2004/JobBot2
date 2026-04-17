from typing import Callable
from pathlib import Path

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
    Generates tailored outreach emails/messages based on the outreach_map.txt prompt.
    Returns dict with key: messages
    """
    with Session(sync_engine) as session:
        resume = session.scalar(select(Resume).where(Resume.user_id == user_id))
        evaluation = session.scalar(select(Evaluation).where(Evaluation.id == eval_id))

        if not resume or not evaluation:
            raise ValueError("Resume or Evaluation not found")

        # Load the outreach map prompt
        prompt_path = (
            Path(__file__).parent.parent / "system" / "prompts" / "outreach_map.txt"
        )
        if not prompt_path.exists():
            raise FileNotFoundError("outreach_map.txt not found in system/prompts/")
        outreach_map_prompt = prompt_path.read_text()

        llm = LLMClient()

        if progress_cb:
            progress_cb("Generating tailored outreach messages...")

        prompt = f"""
        {outreach_map_prompt}
        
        Candidate Resume:
        {resume.content_md}
        
        Job Evaluation:
        {evaluation.raw_eval}
        
        Return a list of 3 different outreach options (e.g., LinkedIn DM, Formal Email, Casual Email).
        Each option should include the 'Subject Line' (if applicable) and the 'Body'.
        
        Return as a JSON object with a key 'messages' containing a list of objects with 'type', 'subject', and 'body'.
        """

        from pydantic import BaseModel

        class Message(BaseModel):
            type: str
            subject: str | None
            body: str

        class OutreachResponse(BaseModel):
            messages: list[Message]

        result = llm.structured(prompt, OutreachResponse)

        return {"messages": [m.model_dump() for m in result.messages]}
