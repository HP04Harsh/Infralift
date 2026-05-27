from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

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


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """
    Authenticate user
    In production, this would validate credentials against a database
    """
    # Mock authentication
    if request.email and request.password:
        return AuthResponse(
            success=True,
            message="Login successful",
            user_id="user-123",
            token="mock-jwt-token"
        )
    
    raise HTTPException(status_code=401, detail="Invalid credentials")


@router.post("/register", response_model=AuthResponse)
async def register(request: RegisterRequest):
    """
    Register new user
    In production, this would create user in database
    """
    # Mock registration
    return AuthResponse(
        success=True,
        message="Registration successful",
        user_id="user-123",
        token="mock-jwt-token"
    )


@router.post("/logout", response_model=AuthResponse)
async def logout():
    """
    Logout user
    In production, this would invalidate the token
    """
    return AuthResponse(
        success=True,
        message="Logout successful"
    )


@router.get("/me")
async def get_current_user():
    """
    Get current user information
    In production, this would validate JWT token and return user data
    """
    return {
        "id": "user-123",
        "email": "harsh@infralift.com",
        "full_name": "Harsh Bhardwaj",
        "company": "Infralift",
        "created_at": datetime.utcnow()
    }
