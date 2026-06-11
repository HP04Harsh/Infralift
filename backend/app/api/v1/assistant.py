"""
InfraMini Assistant API Routes
Floating assistant with provider-agnostic AI and user validation
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
import logging
import re

from app.schemas.assistant import (
    InfraMiniChatRequest,
    InfraMiniChatResponse,
    UserValidationRequest,
    UserValidationResponse,
    OrchestratorStatusResponse,
    ProviderStatus,
    TenantSnapshotResponse,
    RecommendationRequest,
    RecommendationResponse,
    CreditsResponse,
)
from app.services.ai_orchestrator_service import ai_orchestrator
from app.services.tenant_intelligence_service import tenant_intelligence
from app.services.recommendation_engine import recommendation_engine
from app.core.redis import session_manager

logger = logging.getLogger(__name__)

router = APIRouter()


def _sanitize_response(text: str) -> str:
    """Strip markdown artifacts from AI responses for clean chat display."""
    if not text:
        return text
    # Remove markdown bold/italic markers
    text = re.sub(r'\*{1,3}([^*]+)\*{1,3}', r'\1', text)
    # Remove markdown heading markers (###, ####, etc.)
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    # Remove common emoji/warning icons
    text = re.sub(r'[\u2000-\u206F\u20A0-\u20CF\u2100-\u214F\u2190-\u21FF\u2300-\u23FF\u2700-\u27BF\u2B00-\u2BFF\uFE00-\uFE0F]', '', text)
    text = re.sub(r'[\u2600-\u26FF\u2700-\u27BF]', '', text)
    # Remove leading bullet markers (-, *, •) at line starts
    text = re.sub(r'^[\s]*[-*•]\s+', '', text, flags=re.MULTILINE)
    # Collapse multiple blank lines into two
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


@router.post("/orchestrator/chat", response_model=InfraMiniChatResponse)
async def assistant_chat(request: InfraMiniChatRequest):
    """InfraMini chat routed through the AI Orchestrator with auto provider selection"""
    try:
        user_id = request.user_id or "default"

        # Save frontend-provided context as last-resort fallback
        frontend_context = dict(request.conversation_context or {})

        # Always try fetching enriched data from backend session + sync cache
        tenant_context = {}
        try:
            from app.services.onboarding_service import onboarding_service
            session = await onboarding_service.get_or_create_session(user_id)
            if session and session.get("tenant_id") and session.get("subscription_id"):
                sync_service = onboarding_service.azure_sync_service
                if sync_service:
                    sync_id = f"{session['tenant_id']}_{session['subscription_id']}"
                    cached = await sync_service.get_cached_summary(sync_id)
                    if cached:
                        tenant_context = cached
        except Exception:
            pass

        # If sync cache is empty, attempt snapshot from tenant intelligence
        if not tenant_context:
            try:
                snapshot = await tenant_intelligence.get_tenant_context(user_id, include_details=True)
                if snapshot and snapshot.get("subscription_id") != "N/A":
                    tenant_context = snapshot
            except Exception:
                pass

        # Last resort: use frontend context (raw IDs only, but better than nothing)
        if not tenant_context and frontend_context:
            tenant_context = frontend_context

        full_response = ""
        async for chunk in ai_orchestrator.execute(
            message=request.message,
            agent_type="assistant",
            user_id=user_id,
            conversation_context={"history": [{"role": "user", "content": request.message}]},
            tenant_context=tenant_context or None,
        ):
            if chunk.get("type") == "content":
                full_response += chunk.get("content", "")
            elif chunk.get("type") == "error":
                return InfraMiniChatResponse(
                    success=False,
                    response=chunk.get("message", "AI provider unavailable"),
                    credits_used=0,
                )

        if not full_response:
            full_response = "I'm having trouble connecting to the AI provider right now. Please check your AI configuration."

        full_response = _sanitize_response(full_response)
        return InfraMiniChatResponse(success=True, response=full_response, credits_used=1)

    except Exception as e:
        logger.error(f"Assistant chat failed: {e}")
        return InfraMiniChatResponse(
            success=False,
            response="An error occurred while processing your request.",
            credits_used=0,
        )


@router.post("/orchestrator/validate-user", response_model=UserValidationResponse)
async def validate_user(request: UserValidationRequest):
    """Validate user by name against local user store"""
    try:
        from app.core.redis import session_manager as sm
        redis = await sm.redis
        user_key = f"user:{request.name.lower()}"
        user_data = None
        if redis:
            raw = await redis.get(user_key)
            if raw:
                import json
                user_data = json.loads(raw)
        if user_data:
            return UserValidationResponse(
                valid=True,
                user_id=user_data.get("id", request.name.lower()),
                message=f"Welcome back, {request.name}!",
                limited_access=False,
            )
        return UserValidationResponse(
            valid=True,
            user_id=request.name.lower(),
            message=f"Welcome, {request.name}!",
            limited_access=True,
        )
    except Exception as e:
        logger.error(f"User validation failed: {e}")
        return UserValidationResponse(
            valid=False,
            message="Validation service unavailable.",
            limited_access=True,
        )


@router.get("/orchestrator/status", response_model=OrchestratorStatusResponse)
async def orchestrator_status():
    """Get AI orchestrator status and available providers"""
    summary = await ai_orchestrator.get_provider_summary()
    return OrchestratorStatusResponse(
        active_provider=summary["active_provider"],
        providers=[
            ProviderStatus(
                name="Azure OpenAI",
                available=summary["azure_openai"]["available"],
                configured=summary["azure_openai"]["configured"],
            ),
            ProviderStatus(
                name="Hugging Face",
                available=summary["huggingface"]["available"],
                configured=summary["huggingface"]["configured"],
                model=summary["huggingface"]["model"],
            ),
        ],
    )


@router.post("/orchestrator/tenant-snapshot", response_model=TenantSnapshotResponse)
async def get_tenant_snapshot(user_id: str = "default"):
    """Get a comprehensive tenant snapshot for AI context"""
    try:
        snapshot = await tenant_intelligence.get_tenant_snapshot(user_id)
        return TenantSnapshotResponse(success=True, snapshot=snapshot)
    except Exception as e:
        logger.error(f"Tenant snapshot failed: {e}")
        return TenantSnapshotResponse(success=False, snapshot={"error": str(e)})


@router.post("/orchestrator/recommendations", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    """Get ranked recommendations for a tenant"""
    try:
        result = await recommendation_engine.get_recommendations(
            user_id="default",
            limit=request.limit,
            category=request.category,
        )
        return RecommendationResponse(
            success=True,
            recommendations=result["recommendations"],
            total=result["total"],
            tenant_summary=result["tenant_summary"],
        )
    except Exception as e:
        logger.error(f"Recommendations failed: {e}")
        return RecommendationResponse(success=False, recommendations=[], total=0, tenant_summary={})


@router.get("/orchestrator/credits", response_model=CreditsResponse)
async def get_credits(user_id: str = "default"):
    """Get remaining credits for a user"""
    try:
        redis = await session_manager.redis
        remaining = 5
        if redis:
            used_key = f"credits:{user_id}:used"
            used_raw = await redis.get(used_key)
            used = int(used_raw) if used_raw else 0
            remaining = max(0, 5 - used)
        return CreditsResponse(remaining=remaining, used=5 - remaining, total=5)
    except Exception as e:
        logger.error(f"Credits query failed: {e}")
        return CreditsResponse(remaining=0, used=0, total=5)


@router.post("/orchestrator/deduct-credit")
async def deduct_credit(user_id: str = "default"):
    """Deduct one credit for an AI request"""
    try:
        redis = await session_manager.redis
        if redis:
            used_key = f"credits:{user_id}:used"
            await redis.incr(used_key)
            await redis.expire(used_key, 86400)
        return {"success": True, "credits_deducted": 1}
    except Exception as e:
        logger.error(f"Credit deduction failed: {e}")
        return {"success": False, "error": str(e)}
