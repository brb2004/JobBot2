from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from server.db.base import get_db
from server.db.models import User
from server.auth.dependencies import get_current_user
from server.schemas.tracker import EvaluationDetail
from server.services.tracker import TrackerService

router = APIRouter()
tracker_service = TrackerService()


@router.get("/api/evaluations/{eval_id}", response_model=EvaluationDetail)
async def get_evaluation(
    eval_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    evaluation = await tracker_service.get_evaluation(db, user.id, eval_id)
    if evaluation is None:
        raise HTTPException(404, "Evaluation not found")

    return EvaluationDetail.model_validate(evaluation, from_attributes=True)
