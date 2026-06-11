"""
Settings routes for ServiceNow configuration
"""
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from app.services.servicenow_service import servicenow_service
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


class ServiceNowConfigRequest(BaseModel):
    instance_url: str
    username: str
    password: str = Field(default="")
    api_token: str = Field(default="")
    assignment_group: str = Field(default="")


@router.get("/servicenow")
async def get_servicenow_config():
    """Get ServiceNow config. Returns Redis settings if set, otherwise env vars."""
    config = await servicenow_service.get_config()
    configured = await servicenow_service.is_configured()
    if config:
        return {
            "configured": configured,
            "instance_url": config.get("instance_url", ""),
            "username": config.get("username", ""),
            "has_password": bool(config.get("password") or config.get("api_token")),
            "assignment_group": config.get("assignment_group", ""),
            "source": "redis",
        }
    return {
        "configured": configured,
        "instance_url": settings.SERVICENOW_INSTANCE_URL or "",
        "username": settings.SERVICENOW_USERNAME or "",
        "has_password": bool(settings.SERVICENOW_PASSWORD or settings.SERVICENOW_API_TOKEN),
        "assignment_group": settings.SERVICENOW_ASSIGNMENT_GROUP or "",
        "source": "env",
    }


@router.put("/servicenow")
async def save_servicenow_config(request: ServiceNowConfigRequest):
    """Save ServiceNow config to Redis."""
    success = await servicenow_service.save_config({
        "instance_url": request.instance_url,
        "username": request.username,
        "password": request.password,
        "api_token": request.api_token,
        "assignment_group": request.assignment_group,
    })
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save ServiceNow configuration")
    return {"success": True, "message": "ServiceNow configuration saved and activated"}


@router.delete("/servicenow")
async def clear_servicenow_config():
    """Clear ServiceNow config from Redis (reverts to env vars)."""
    success = await servicenow_service.clear_config()
    if not success:
        raise HTTPException(status_code=500, detail="Failed to clear ServiceNow configuration")
    return {"success": True, "message": "ServiceNow configuration cleared, using env vars"}


@router.post("/servicenow/test")
async def test_servicenow_connection(request: ServiceNowConfigRequest):
    """Test ServiceNow connection with provided credentials."""
    result = await servicenow_service.test_connection(
        instance_url=request.instance_url,
        username=request.username,
        password=request.password or request.api_token,
    )
    return result
