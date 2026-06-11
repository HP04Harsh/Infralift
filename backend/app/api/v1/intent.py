"""
Intent Detection Route
AI-only intent detection with no keyword/pattern fallback
"""

from fastapi import APIRouter
from pydantic import BaseModel
from app.services.ai_orchestrator import orchestrator

router = APIRouter()


class DetectIntentRequest(BaseModel):
    text: str
    user_id: str | None = None


class DetectIntentResponse(BaseModel):
    detected: bool
    intent: str = ""
    resource_type: str | None = None
    explanation: str = ""
    confidence: float = 0.0


@router.post("/detect", response_model=DetectIntentResponse)
async def detect_intent(request: DetectIntentRequest):
    """Detect provisioning intent from user text using AI."""
    result = await orchestrator.detect_resource_type(
        request.text,
        user_id=request.user_id or "default",
    )
    detected = bool(result.get("detected") and result.get("resource_type"))
    return DetectIntentResponse(
        detected=detected,
        intent=result.get("resource_type", ""),
        resource_type=result.get("resource_type"),
        explanation=result.get("explanation", ""),
        confidence=0.0,
    )
