from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from server.db.base import get_db
from server.db.models import User
from server.auth.dependencies import get_current_user
from server.schemas.profile import ProfileRead, ProfileUpdate
from server.services.profile import ProfileService

router = APIRouter()
profile_service = ProfileService()


@router.get("/api/profile")
async def get_profile(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await profile_service.get_profile(db, user.id)
    if profile is None:
        raise HTTPException(404, "Profile not found")
    return ProfileRead.model_validate(profile)


@router.put("/api/profile")
async def update_profile(
    body: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await profile_service.update_profile(db, user.id, body)
    return ProfileRead.model_validate(profile)
