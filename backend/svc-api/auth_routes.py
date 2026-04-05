from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from jose import jwt
from sqlalchemy import text

from shared.config import settings
from shared.services.database import async_session
from shared.models.seed import verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    role: str
    username: str


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    async with async_session() as session:
        result = await session.execute(
            text("SELECT username, password_hash, role FROM users WHERE username = :u"),
            {"u": req.username},
        )
        user = result.mappings().first()

    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")

    payload = {
        "sub": user["username"],
        "role": user["role"],
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expiration_minutes),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    return LoginResponse(token=token, role=user["role"], username=user["username"])
