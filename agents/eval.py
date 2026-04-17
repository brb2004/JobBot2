from typing import Callable

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert

from server.config import settings
from server.db.models import Profile, Evaluation, DedupLog
from engine.llm_client import LLMClient
from engine.eval_engine import EvalEngine

# Convert async URL to sync URL
sync_url = settings.database_url.replace(
    "postgresql+asyncpg://", "postgresql+psycopg2://"
)
sync_engine = create_engine(sync_url)


def run(user_id: str, url: str, progress_cb: Callable) -> dict:
    """Returns dict with keys: eval_id, grade, score, company, role"""

    with Session(sync_engine) as session:
        # Fetch Profile by user_id from DB
        profile = session.scalar(
            select(Profile).where(Profile.user_id == user_id)
        )

        # Instantiate LLMClient and EvalEngine
        llm = LLMClient()
        eval_engine = EvalEngine(llm, profile)

        # Score the job posting
        eval_result = eval_engine.score(url, progress_cb)

        # If disqualified, return early without persisting
        if eval_result.disqualified:
            return {
                "eval_id": None,
                "grade": "F",
                "score": eval_result.score,
                "company": eval_result.company,
                "role": eval_result.role,
            }

        # Insert Evaluation row
        evaluation = Evaluation(
            user_id=user_id,
            url=url,
            company=eval_result.company,
            role=eval_result.role,
            score=eval_result.score,
            grade=eval_result.grade,
            status="new",
            raw_eval=eval_result.model_dump(),
        )
        session.add(evaluation)
        session.flush()  # populate evaluation.id before dedup insert

        # Insert DedupLog (ON CONFLICT DO NOTHING)
        stmt = (
            pg_insert(DedupLog)
            .values(user_id=user_id, url=url)
            .on_conflict_do_nothing()
        )
        session.execute(stmt)

        session.commit()

        return {
            "eval_id": str(evaluation.id),
            "grade": eval_result.grade,
            "score": eval_result.score,
            "company": eval_result.company,
            "role": eval_result.role,
        }
