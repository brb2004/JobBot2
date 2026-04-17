import uuid
import jwt
import redis as redis_lib
from datetime import datetime, timedelta, timezone
from server.config import settings

TOKEN_EXPIRY_DAYS = 7

redis_client = redis_lib.from_url(settings.redis_url)

def create_token(user_id: str) -> tuple[str, str]:
    """Returns (encoded_token, jti)."""
    jti = str(uuid.uuid4())
    payload = {
        "sub": user_id,
        "jti": jti,
        "exp": datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRY_DAYS),
    }
    token = jwt.encode(payload, settings.secret_key, algorithm="HS256")
    return token, jti

def decode_token(token: str) -> dict:
    """Raises jwt.PyJWTError on invalid/expired token."""
    return jwt.decode(token, settings.secret_key, algorithms=["HS256"])

def blocklist_token(jti: str, expires_in_seconds: int) -> None:
    """Stores JTI in Redis with TTL."""
    redis_client.setex(f"blocklist:{jti}", expires_in_seconds, "1")

def is_blocklisted(jti: str) -> bool:
    return redis_client.exists(f"blocklist:{jti}") == 1
