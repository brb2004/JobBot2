from datetime import datetime, timezone

import bcrypt
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from server.db.base import get_db
from server.db.models import User, Profile
from server.schemas.auth import RegisterRequest, LoginRequest, UserResponse
from server.auth.jwt import create_token, decode_token, blocklist_token, is_blocklisted
from server.auth.dependencies import get_current_user
from server.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

DEFAULT_WEIGHTS = {
    "role_match": 0.15,
    "skills_alignment": 0.15,
    "seniority": 0.12,
    "compensation": 0.12,
    "interview_likelihood": 0.10,
    "company_stage": 0.08,
    "product_market_fit": 0.08,
    "geographic_feasibility": 0.08,
    "growth_trajectory": 0.07,
    "hiring_timeline": 0.05,
}


@router.post("/register", status_code=201, response_model=UserResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    password_hash = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    user = User(
        id=uuid.uuid4(),
        email=body.email,
        password_hash=password_hash,
        name=body.name,
    )
    db.add(user)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Email already registered")

    profile = Profile(
        id=uuid.uuid4(),
        user_id=user.id,
        target_roles=[],
        target_archetypes=[],
        timezones_acceptable=[],
        dimension_weights=DEFAULT_WEIGHTS,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(user)

    return UserResponse(id=user.id, email=user.email, name=user.name)


@router.post("/login", status_code=200, response_model=UserResponse)
async def login(body: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not bcrypt.checkpw(body.password.encode(), user.password_hash.encode()):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token, _jti = create_token(str(user.id))

    cookie_kwargs = dict(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
    )
    if settings.environment == "production":
        cookie_kwargs["secure"] = True

    response.set_cookie(**cookie_kwargs)

    return UserResponse(id=user.id, email=user.email, name=user.name)


@router.post("/logout", status_code=204)
async def logout(request: Request, response: Response):
    token = request.cookies.get("access_token")
    if token:
        try:
            payload = decode_token(token)
            jti = payload.get("jti")
            exp = payload.get("exp")
            if jti and exp:
                remaining = int(exp - datetime.now(timezone.utc).timestamp())
                if remaining > 0:
                    blocklist_token(jti, remaining)
        except Exception:
            pass  # Invalid or expired token — still clear the cookie

    response.delete_cookie(
        key="access_token",
        httponly=True,
        samesite="lax",
        secure=(settings.environment == "production"),
    )
    return


@router.get("/me", status_code=200, response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return UserResponse(id=current_user.id, email=current_user.email, name=current_user.name)
