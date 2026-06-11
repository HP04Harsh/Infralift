"""
Settings routes for AI provider configuration
"""
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from app.services.settings_service import settings_service
from app.core.config import settings
from app.services.hf_utils import test_hf_connection

logger = logging.getLogger(__name__)

router = APIRouter()


class HuggingFaceConfigRequest(BaseModel):
    api_key: str
    model: str = Field(default="google/gemma-3-12b-it")
    endpoint: Optional[str] = None
    provider: str = Field(default="huggingface")


@router.get("/huggingface")
async def get_huggingface_config():
    config = await settings_service.get_huggingface_config()
    if config:
        return {
            "configured": True,
            "model": config.get("model", "google/gemma-3-12b-it"),
            "endpoint": config.get("endpoint"),
            "has_api_key": bool(config.get("api_key")),
            "provider": config.get("provider", "huggingface"),
            "source": "redis",
        }
    return {
        "configured": bool(settings.HF_API_KEY),
        "model": settings.HF_MODEL,
        "endpoint": settings.HF_ENDPOINT,
        "has_api_key": bool(settings.HF_API_KEY),
        "provider": "huggingface",
        "source": "env",
    }


@router.put("/huggingface")
async def save_huggingface_config(request: HuggingFaceConfigRequest):
    success = await settings_service.save_huggingface_config({
        "api_key": request.api_key,
        "model": request.model,
        "endpoint": request.endpoint,
        "provider": request.provider,
    })
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save configuration")
    return {"success": True, "message": "HuggingFace configuration saved and activated"}


@router.delete("/huggingface")
async def clear_huggingface_config():
    success = await settings_service.clear_huggingface_config()
    if not success:
        raise HTTPException(status_code=500, detail="Failed to clear configuration")
    return {"success": True, "message": "HuggingFace configuration cleared, using env vars"}


@router.post("/huggingface/test")
async def test_huggingface_connection():
    api_key = await settings_service.get_effective_hf_api_key()
    model = await settings_service.get_effective_hf_model()
    endpoint = await settings_service.get_effective_hf_endpoint()

    if not api_key and not endpoint:
        raise HTTPException(status_code=400, detail="HuggingFace API key not configured")

    result = await test_hf_connection(api_key, model, endpoint)
    return result
