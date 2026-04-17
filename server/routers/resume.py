from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from server.db.base import get_db
from server.db.models import User
from server.auth.dependencies import get_current_user
from server.schemas.resume import ResumeRead, ResumeUpdate
from server.services.resume import ResumeService

router = APIRouter()
resume_service = ResumeService()


@router.get("/api/resume", response_model=ResumeRead)
async def get_resume(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    resume = await resume_service.get_resume(db, user.id)
    if resume is None:
        raise HTTPException(404, "Resume not found")
    return resume


@router.put("/api/resume", response_model=ResumeRead)
async def update_resume(
    body: ResumeUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    resume = await resume_service.update_resume(db, user.id, body)
    return resume
