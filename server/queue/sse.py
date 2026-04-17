import json
import redis
from server.config import settings

_redis = redis.from_url(settings.redis_url)

def publish_sse(user_id: str, event: str, payload: dict) -> None:
    channel = f"jobbot:sse:{user_id}"
    message = json.dumps({"event": event, **payload})
    _redis.publish(channel, message)
