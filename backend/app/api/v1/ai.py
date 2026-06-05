from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from app.services.ai_execution_service import AIExecutionService, AIProvider
from app.services.onboarding_service import onboarding_service
from app.services.resource_state_service import resource_state_service
from app.services.audit_service import audit_service
from app.core.config import settings
from app.core.redis import session_manager
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
ai_service = AIExecutionService()


class ValidateOpenAIRequest(BaseModel):
    endpoint: str
    api_key: str
    deployment: str
    api_version: str


class ValidateOpenAIResponse(BaseModel):
    success: bool
    message: str
    connected: bool


class AnalyzeTenantRequest(BaseModel):
    question: str
    context: Optional[Dict[str, Any]] = None
    user_id: Optional[str] = None


class AnalyzeTenantResponse(BaseModel):
    success: bool
    analysis: str
    data_summary: Optional[Dict[str, Any]] = None


class ChatRequest(BaseModel):
    message: str
    agent_type: str
    user_id: Optional[str] = None
    conversation_context: Optional[Dict[str, Any]] = None
    azure_endpoint: Optional[str] = None
    azure_key: Optional[str] = None
    azure_deployment: Optional[str] = None
    azure_api_version: Optional[str] = None


class ActivityEvent(BaseModel):
    type: str  # "activity" | "content" | "status" | "error" | "result"
    icon: Optional[str] = None
    title: Optional[str] = None
    status: Optional[str] = None  # "in_progress" | "completed" | "error"
    content: Optional[str] = None
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    success: bool
    events: List[ActivityEvent]
    full_response: Optional[str] = None


@router.post("/validate", response_model=ValidateOpenAIResponse)
async def validate_azure_openai(request: ValidateOpenAIRequest):
    """Validate Azure OpenAI connectivity by testing the endpoint"""
    if not request.endpoint or not request.api_key or not request.deployment:
        return ValidateOpenAIResponse(success=False, message="Missing required fields", connected=False)

    try:
        from openai import AsyncAzureOpenAI
        client = AsyncAzureOpenAI(
            api_key=request.api_key,
            api_version=request.api_version or "2024-02-15-preview",
            azure_endpoint=request.endpoint,
        )
        response = await client.chat.completions.create(
            model=request.deployment,
            messages=[{"role": "user", "content": "Respond with only the word: connected"}],
            max_tokens=10,
            temperature=0,
        )
        if response and response.choices and response.choices[0].message.content:
            return ValidateOpenAIResponse(
                success=True,
                message="Azure OpenAI Connected",
                connected=True,
            )
    except Exception as e:
        logger.error(f"Azure OpenAI validation failed: {e}")
        return ValidateOpenAIResponse(
            success=False,
            message=f"Connection Failed: {str(e)[:200]}",
            connected=False,
        )

    return ValidateOpenAIResponse(success=False, message="Connection Failed: Unexpected response", connected=False)


@router.post("/chat", response_model=ChatResponse)
async def ai_chat(request: ChatRequest):
    """Execute AI chat with activity timeline and full context"""
    try:
        events = []
        full_response = ""

        # Phase 1: Activity - Understanding request
        events.append(ActivityEvent(type="activity", icon="MessageSquare", title="Request Understood", status="in_progress"))
        events.append(ActivityEvent(type="activity", icon="MessageSquare", title="Request Understood", status="completed"))

        # Phase 2: Activity - Resource Analysis
        events.append(ActivityEvent(type="activity", icon="Search", title="Resource Analysis", status="in_progress"))

        redis = await session_manager.redis
        resource_context = {}
        if redis:
            resource_state_service.redis_client = redis
            try:
                persisted = await resource_state_service.list_all()
                if persisted:
                    resource_context["known_resources"] = persisted[:20]
            except Exception:
                pass

        # Load tenant context
        tenant_context = {}
        if request.user_id:
            try:
                session = await onboarding_service.get_or_create_session(request.user_id)
                if session and session.get("tenant_id") and session.get("subscription_id"):
                    sync_service = onboarding_service.azure_sync_service
                    if sync_service:
                        sync_id = f"{session['tenant_id']}_{session['subscription_id']}"
                        cached = await sync_service.get_cached_summary(sync_id)
                        if cached:
                            tenant_context = cached
            except Exception:
                pass

        events.append(ActivityEvent(type="activity", icon="Search", title="Resource Analysis", status="completed"))

        # Phase 3: Activity - Generating response
        events.append(ActivityEvent(type="activity", icon="Zap", title="Generating Response", status="in_progress"))

        context = request.conversation_context or {}
        if resource_context:
            context["known_resources"] = resource_context
        if tenant_context:
            context["tenant_summary"] = tenant_context

        # Build per-request Azure OpenAI credentials from request body
        azure_creds = None
        if request.azure_endpoint and request.azure_key:
            azure_creds = {
                "azure_endpoint": request.azure_endpoint,
                "azure_key": request.azure_key,
                "azure_deployment": request.azure_deployment or settings.AZURE_OPENAI_DEPLOYMENT,
                "azure_api_version": request.azure_api_version or settings.AZURE_OPENAI_API_VERSION,
            }

        async for chunk in ai_service.execute_chat(
            message=request.message,
            agent_type=request.agent_type,
            user_id=request.user_id or "default",
            conversation_context=context,
            tenant_context=tenant_context,
            azure_credentials=azure_creds,
        ):
            if chunk.get("type") == "content":
                full_response += chunk.get("content", "")
                events.append(ActivityEvent(type="content", content=chunk.get("content", ""), title=chunk.get("full_response", "")))
            elif chunk.get("type") == "status":
                if chunk.get("status") == "generating":
                    events.append(ActivityEvent(type="activity", icon="Zap", title="Generating Response", status="in_progress"))
                elif chunk.get("status") == "completed":
                    events.append(ActivityEvent(type="activity", icon="CheckCircle", title="Response Ready", status="completed"))

        # Phase 4: Audit
        events.append(ActivityEvent(type="activity", icon="ClipboardList", title="Recording Audit Trail", status="in_progress"))
        if redis:
            audit_service.redis_client = redis
            try:
                await audit_service.record_action({
                    "user": request.user_id or "default",
                    "agentType": request.agent_type,
                    "prompt": request.message,
                    "aiPlan": full_response[:500],
                    "deploymentStatus": "completed",
                    "metadata": {"response_length": len(full_response)},
                })
            except Exception as e:
                logger.error(f"Audit record failed: {e}")
        events.append(ActivityEvent(type="activity", icon="ClipboardList", title="Audit Recorded", status="completed"))

        # Final
        events.append(ActivityEvent(type="result", icon="CheckCircle", title="Final Answer", status="completed", data={"response_length": len(full_response)}))

        return ChatResponse(success=True, events=events, full_response=full_response)

    except Exception as e:
        logger.error(f"AI chat failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-tenant", response_model=AnalyzeTenantResponse)
async def analyze_tenant_data(request: AnalyzeTenantRequest):
    """Analyze tenant data using AI with live context"""
    try:
        tenant_context = request.context or {}
        if request.user_id:
            sync_service = onboarding_service.azure_sync_service
            if sync_service:
                session = await onboarding_service.get_or_create_session(request.user_id)
                if session and session.get("tenant_id") and session.get("subscription_id"):
                    sync_id = f"{session['tenant_id']}_{session['subscription_id']}"
                    cached = await sync_service.get_cached_summary(sync_id)
                    if cached:
                        tenant_context["tenant_summary"] = cached

        system_prompt = (
            "You are an Azure infrastructure expert assistant. "
            "Analyze the provided tenant data and answer the user's question with specific, actionable insights. "
            "Include relevant metrics, costs, and recommendations where applicable. "
            "Be concise and data-driven."
        )

        response_text = ""
        async for chunk in ai_service._execute_azure_openai(
            message=request.question,
            system_prompt=system_prompt,
            conversation_context={"tenant_data": tenant_context}
        ):
            if chunk.get("type") == "content":
                response_text += chunk.get("content", "")

        if not response_text:
            response_text = (
                "Tenant data analysis requires Azure OpenAI to be configured. "
                "Please set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_KEY in your environment."
            )

        return AnalyzeTenantResponse(
            success=True,
            analysis=response_text,
            data_summary={
                "has_tenant_data": bool(tenant_context),
                "data_fields": list(tenant_context.keys()) if tenant_context else []
            }
        )

    except Exception as e:
        logger.error(f"AI tenant analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
