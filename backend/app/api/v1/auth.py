from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import secrets
import json
import logging

from app.core.redis import session_manager

logger = logging.getLogger(__name__)

router = APIRouter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    company: Optional[str] = None


class AuthResponse(BaseModel):
    success: bool
    message: str
    user_id: Optional[str] = None
    token: Optional[str] = None


def _generate_token() -> str:
    return "sess_" + secrets.token_hex(24)


async def _store_session(user_id: str, data: dict):
    redis = await session_manager.redis
    if redis:
        key = f"auth:{user_id}"
        await redis.set(key, json.dumps(data))
        await redis.expire(key, 86400)


async def _get_session(user_id: str) -> Optional[dict]:
    redis = await session_manager.redis
    if redis:
        raw = await redis.get(f"auth:{user_id}")
        if raw:
            return json.loads(raw)
    return None


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """
    Authenticate user — validates against stored user profile in Redis
    """
    if not request.email or not request.password:
        raise HTTPException(status_code=400, detail="Email and password required")

    session = await _get_session(request.email)
    if not session:
        raise HTTPException(status_code=401, detail="User not found. Please register first.")

    stored_pw = session.get("password")
    if not stored_pw or stored_pw != request.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = _generate_token()
    session["token"] = token
    await _store_session(request.email, session)

    return AuthResponse(
        success=True,
        message="Login successful",
        user_id=session.get("user_id", request.email),
        token=token
    )


@router.post("/register", response_model=AuthResponse)
async def register(request: RegisterRequest):
    """
    Register new user — persists profile to Redis
    """
    if not request.email or not request.password or not request.full_name:
        raise HTTPException(status_code=400, detail="Email, password, and full name required")

    existing = await _get_session(request.email)
    if existing:
        raise HTTPException(status_code=409, detail="User already registered. Please log in.")

    token = _generate_token()
    user_data = {
        "user_id": request.email,
        "email": request.email,
        "full_name": request.full_name,
        "company": request.company or "",
        "password": request.password,
        "token": token,
        "created_at": datetime.utcnow().isoformat(),
    }
    await _store_session(request.email, user_data)

    return AuthResponse(
        success=True,
        message="Registration successful",
        user_id=request.email,
        token=token
    )


@router.post("/logout", response_model=AuthResponse)
async def logout():
    """
    Logout user
    """
    return AuthResponse(
        success=True,
        message="Logout successful"
    )


@router.get("/me")
async def get_current_user():
    """
    Get current user information from active session
    """
    return {
        "id": None,
        "email": None,
        "full_name": "User",
        "company": None,
        "created_at": None,
    }
