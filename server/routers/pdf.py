from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
import os

from server.db.base import get_db
from server.db.models import User
from server.auth.dependencies import get_current_user
from server.services.tracker import TrackerService

router = APIRouter()
tracker_service = TrackerService()


@router.get("/api/pdf/{eval_id}")
async def get_evaluation_pdf(
    eval_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    evaluation = await tracker_service.get_evaluation(db, user.id, eval_id)
    if evaluation is None:
        raise HTTPException(404, "Evaluation not found")

    if not evaluation.pdf_path:
        raise HTTPException(404, "PDF not found for this evaluation")

    if not os.path.exists(evaluation.pdf_path):
        raise HTTPException(404, "PDF file not found on disk")

    return FileResponse(evaluation.pdf_path)
