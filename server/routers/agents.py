from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from server.db.base import get_db
from server.db.models import User, DedupLog
from server.auth.dependencies import get_current_user
from server.schemas.agent import AgentRequest, AGENT_MODES, TASK_MAP
from server.queue.celery_app import celery

router = APIRouter()

@router.post("/api/agents/{mode}", status_code=202)
async def dispatch_agent(
    mode: str,
    payload: AgentRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if mode not in AGENT_MODES:
        raise HTTPException(400, f"Unknown mode: {mode}")

    exists = await db.scalar(select(DedupLog).where(
        DedupLog.user_id == user.id,
        DedupLog.url == payload.url
    ))
    if exists:
        raise HTTPException(409, "already_evaluated")

    task = celery.send_task(TASK_MAP[mode], kwargs={"user_id": str(user.id), "url": payload.url})
    return {"job_id": task.id}
