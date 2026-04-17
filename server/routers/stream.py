from fastapi import APIRouter, Depends
from sse_starlette.sse import EventSourceResponse
import redis.asyncio as aioredis
import json
import asyncio
from server.config import settings
from server.auth.dependencies import get_current_user
from server.db.models import User

router = APIRouter()

@router.get("/api/stream")
async def stream(user: User = Depends(get_current_user)):
    async def event_generator():
        r = aioredis.from_url(settings.redis_url)
        pubsub = r.pubsub()
        channel = f"jobbot:sse:{user.id}"
        await pubsub.subscribe(channel)
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    data = message["data"]
                    if isinstance(data, bytes):
                        data = data.decode()
                    payload = json.loads(data)
                    event = payload.pop("event", "message")
                    yield {"event": event, "data": json.dumps(payload)}
        except asyncio.CancelledError:
            pass
        finally:
            await pubsub.unsubscribe(channel)
            await r.aclose()

    return EventSourceResponse(event_generator())
