from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, asc, desc
from typing import Optional, List, Tuple
import uuid
from server.db.models import Evaluation


class TrackerService:
    VALID_SORT_COLS = {"created_at", "score", "grade"}

    async def list_evaluations(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        status: Optional[str] = None,
        grade: Optional[str] = None,
        sort: str = "created_at",
        order: str = "desc",
        page: int = 1,
        per_page: int = 25,
    ) -> Tuple[List[Evaluation], int]:
        if sort not in self.VALID_SORT_COLS:
            raise ValueError(f"sort must be one of {self.VALID_SORT_COLS}")
        if order not in {"asc", "desc"}:
            raise ValueError("order must be 'asc' or 'desc'")

        query = select(Evaluation).where(Evaluation.user_id == user_id)

        if status is not None:
            query = query.where(Evaluation.status == status)
        if grade is not None:
            query = query.where(Evaluation.grade == grade)

        sort_col = getattr(Evaluation, sort)
        direction = asc if order == "asc" else desc
        query = query.order_by(direction(sort_col))

        count_query = select(func.count()).select_from(query.subquery())
        total = await db.scalar(count_query)

        offset = (page - 1) * per_page
        query = query.offset(offset).limit(per_page)
        result = await db.execute(query)
        evaluations = result.scalars().all()

        return list(evaluations), total

    async def get_evaluation(
        self, db: AsyncSession, user_id: uuid.UUID, eval_id: uuid.UUID
    ) -> Optional[Evaluation]:
        result = await db.execute(
            select(Evaluation).where(
                Evaluation.user_id == user_id,
                Evaluation.id == eval_id,
            )
        )
        return result.scalar_one_or_none()

    async def update_evaluation(
        self, db: AsyncSession, user_id: uuid.UUID, eval_id: uuid.UUID, updates: dict
    ) -> Optional[Evaluation]:
        result = await db.execute(
            select(Evaluation).where(
                Evaluation.user_id == user_id,
                Evaluation.id == eval_id,
            )
        )
        evaluation = result.scalar_one_or_none()
        if evaluation is None:
            return None

        for field, value in updates.items():
            setattr(evaluation, field, value)

        await db.commit()
        await db.refresh(evaluation)
        return evaluation

    async def delete_evaluation(
        self, db: AsyncSession, user_id: uuid.UUID, eval_id: uuid.UUID
    ) -> bool:
        result = await db.execute(
            select(Evaluation).where(
                Evaluation.user_id == user_id,
                Evaluation.id == eval_id,
            )
        )
        evaluation = result.scalar_one_or_none()
        if evaluation is None:
            return False

        await db.delete(evaluation)
        await db.commit()
        return True
