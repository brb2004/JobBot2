from typing import Callable
import logging

from agents import eval as eval_agent
from agents import pdf as pdf_agent

logger = logging.getLogger(__name__)


def run(user_id: str, url: str, progress_cb: Callable[[int, str], None]) -> dict:
    """
    Orchestrates the auto-pipeline flow: Evaluation -> PDF Generation -> Optional Build.
    """
    try:
        # 1. Evaluation
        progress_cb(0, "Stage 1/3: Evaluating job posting...")
        eval_result = eval_agent.run(user_id, url, progress_cb)

        eval_id = eval_result.get("eval_id")
        score = eval_result.get("score", 0)

        if not eval_id:
            progress_cb(
                100, "Pipeline stopped: Candidate disqualified based on evaluation."
            )
            return {
                "success": False,
                "stage": "evaluation",
                "reason": "disqualified",
                "eval_result": eval_result,
            }

        # 2. PDF Generation
        progress_cb(30, "Stage 2/3: Generating adapted resume PDF...")
        pdf_path = pdf_agent.run(user_id, eval_id, progress_cb)

        # 3. Optional Build Trigger (T39)
        # Placeholder for T39 build process.
        # Triggered if score is below 70 or a build flag is present.
        if score < 70:
            progress_cb(
                70, "Stage 3/3: Low score detected. Resume build recommended (T39)."
            )
            # Once agents/build.py is implemented, call it here.
            # build_agent.run(user_id, eval_id, progress_cb)
        else:
            progress_cb(70, "Stage 3/3: Score is sufficient, skipping resume build.")

        progress_cb(100, "Auto-pipeline completed successfully.")

        return {
            "success": True,
            "eval_id": eval_id,
            "pdf_path": pdf_path,
            "score": score,
            "eval_result": eval_result,
        }

    except Exception as e:
        logger.exception("Auto-pipeline failed")
        progress_cb(0, f"Pipeline failed: {str(e)}")
        return {"success": False, "error": str(e)}
