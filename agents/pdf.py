from typing import Callable
from pathlib import Path
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from server.config import settings
from server.db.models import Resume, Evaluation
from engine.llm_client import LLMClient
from engine.resume_engine import ResumeEngine
from engine.pdf_renderer import PDFRenderer
from engine.eval_engine import EvalResult

# Convert async URL to sync URL for agent execution
sync_url = settings.database_url.replace(
    "postgresql+asyncpg://", "postgresql+psycopg2://"
)
sync_engine = create_engine(sync_url)


def run(user_id: str, eval_id: str, progress_cb: Callable[[int, str], None]) -> str:
    """
    Orchestrates the PDF generation process for a specific evaluation.
    Returns the relative path to the generated PDF.
    """
    with Session(sync_engine) as session:
        # 1. Fetch the Evaluation and verify ownership
        evaluation = session.get(Evaluation, eval_id)
        if not evaluation or evaluation.user_id != user_id:
            raise ValueError("Evaluation not found or does not belong to the user")

        progress_cb(10, "Fetching evaluation data")

        # 2. Fetch the User's Resume
        resume = session.scalar(select(Resume).where(Resume.user_id == user_id))
        if not resume or not resume.content_md:
            raise ValueError("User resume content not found")

        # 3. Build adapted resume content (HTML)
        progress_cb(30, "Generating adapted resume content")
        llm = LLMClient()
        resume_engine = ResumeEngine(llm)

        # Reconstruct EvalResult from stored JSON
        eval_result = EvalResult.model_validate(evaluation.raw_eval)

        html_content = resume_engine.build(resume.content_md, eval_result)

        # 4. Render HTML to PDF
        progress_cb(60, "Rendering PDF")
        pdf_renderer = PDFRenderer()

        # Ensure storage directory exists
        storage_dir = Path(settings.pdf_storage_path)
        storage_dir.mkdir(parents=True, exist_ok=True)

        pdf_filename = f"{eval_id}.pdf"
        output_path = storage_dir / pdf_filename

        render_result = pdf_renderer.render_pdf(
            html_content=html_content, output_path=str(output_path)
        )

        if not render_result.success:
            raise RuntimeError(f"PDF rendering failed: {render_result.error}")

        # 5. Update Evaluation record with pdf_path
        # Store relative path from the project root
        relative_pdf_path = f"{settings.pdf_storage_path}/{pdf_filename}".lstrip("./")
        evaluation.pdf_path = relative_pdf_path

        session.commit()
        progress_cb(100, "PDF generated and saved")

        return relative_pdf_path
