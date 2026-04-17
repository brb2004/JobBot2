import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from server.db.models import Profile, User
from server.schemas.profile import ProfileUpdate


class ProfileService:
    async def get_profile(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> Optional[Profile]:
        result = await db.execute(select(Profile).where(Profile.user_id == user_id))
        return result.scalar_one_or_none()

    async def update_profile(
        self, db: AsyncSession, user_id: uuid.UUID, updates: ProfileUpdate
    ) -> Profile:
        # 1. Update User identity if provided
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if user:
            if updates.name is not None:
                user.name = updates.name
            if updates.email is not None:
                user.email = updates.email

        # 2. Update Profile preferences
        result = await db.execute(select(Profile).where(Profile.user_id == user_id))
        profile = result.scalar_one_or_none()

        update_data = updates.model_dump(exclude_unset=True)
        # Remove User fields from Profile update data
        update_data.pop("name", None)
        update_data.pop("email", None)

        if profile is None:
            profile = Profile(user_id=user_id, **update_data)
            db.add(profile)
        else:
            for field, value in update_data.items():
                setattr(profile, field, value)

        await db.commit()
        await db.refresh(profile)
        return profile
