import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from server.db.models import Resume
from server.schemas.resume import ResumeUpdate


class ResumeService:
    async def get_resume(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> Optional[Resume]:
        result = await db.execute(select(Resume).where(Resume.user_id == user_id))
        return result.scalar_one_or_none()

    async def update_resume(
        self, db: AsyncSession, user_id: uuid.UUID, updates: ResumeUpdate
    ) -> Resume:
        result = await db.execute(select(Resume).where(Resume.user_id == user_id))
        resume = result.scalar_one_or_none()

        update_data = updates.model_dump(exclude_unset=True)

        if resume is None:
            resume = Resume(user_id=user_id, **update_data)
            db.add(resume)
        else:
            for field, value in update_data.items():
                setattr(resume, field, value)

        await db.commit()
        await db.refresh(resume)
        return resume
