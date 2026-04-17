import uuid

import jwt
from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from server.db.base import get_db
from server.db.models import User
from server.auth.jwt import decode_token, is_blocklisted


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> User:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = decode_token(token)
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    if is_blocklisted(payload["jti"]):
        raise HTTPException(401, "Token revoked")
    user = await db.get(User, uuid.UUID(payload["sub"]))
    if not user:
        raise HTTPException(401, "User not found")
    return user
