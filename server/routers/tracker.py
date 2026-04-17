from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import uuid
from server.db.base import get_db
from server.db.models import User
from server.auth.dependencies import get_current_user
from server.schemas.tracker import TrackerUpdate, EvaluationSummary
from server.services.tracker import TrackerService

router = APIRouter()
tracker_service = TrackerService()


@router.get("/api/tracker")
async def list_tracker(
    status: Optional[str] = None,
    grade: Optional[str] = None,
    sort: Optional[str] = "created_at",
    order: Optional[str] = "desc",
    page: int = 1,
    per_page: int = 25,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        evaluations, total = await tracker_service.list_evaluations(
            db, user.id, status, grade, sort, order, page, per_page
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    items = [
        EvaluationSummary.model_validate(e, from_attributes=True) for e in evaluations
    ]

    return {"items": items, "total": total, "page": page}


@router.patch("/api/tracker/{eval_id}")
async def update_tracker(
    eval_id: uuid.UUID,
    body: TrackerUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    evaluation = await tracker_service.update_evaluation(
        db, user.id, eval_id, body.model_dump(exclude_none=True)
    )
    if evaluation is None:
        raise HTTPException(404, "Evaluation not found")

    return EvaluationSummary.model_validate(evaluation, from_attributes=True)


@router.delete("/api/tracker/{eval_id}", status_code=204)
async def delete_tracker(
    eval_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    success = await tracker_service.delete_evaluation(db, user.id, eval_id)
    if not success:
        raise HTTPException(404, "Evaluation not found")
