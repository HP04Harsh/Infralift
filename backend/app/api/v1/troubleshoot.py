"""
Troubleshoot API Routes
Analyze issues and execute remediation plans
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from app.core.redis import session_manager
from app.services.agents.troubleshoot_agent_service import TroubleshootAgentService
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class AnalyzeIssueRequest(BaseModel):
    issue_title: str
    issue_resource: str
    issue_source: str = "alert"
    context: Optional[Dict[str, Any]] = None
    user_id: Optional[str] = None


class AnalyzeIssueResponse(BaseModel):
    success: bool
    plan: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class ExecutePlanRequest(BaseModel):
    plan_id: str
    user_id: Optional[str] = None


class ExecutePlanResponse(BaseModel):
    success: bool
    plan: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class PlanStatusResponse(BaseModel):
    success: bool
    plan: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


async def _get_agent_service() -> TroubleshootAgentService:
    redis = await session_manager.get_redis()
    return TroubleshootAgentService(redis_client=redis)


@router.post("/analyze", response_model=AnalyzeIssueResponse)
async def analyze_issue(request: AnalyzeIssueRequest):
    """Analyze an issue and generate a remediation action plan"""
    try:
        service = await _get_agent_service()
        context = request.context or {}

        if request.user_id:
            try:
                session_key = f"session:{request.user_id}"
                redis = await session_manager.get_redis()
                session_data = await redis.get(session_key)
                if session_data:
                    session = eval(session_data)
                    creds = {
                        "tenant_id": session.get("tenant_id", ""),
                        "client_id": session.get("client_id", ""),
                        "client_secret": session.get("client_secret", ""),
                        "subscription_id": session.get("subscription_id", ""),
                    }
                    service.azure_credentials = creds
                    context["total_resources"] = session.get("resource_sync", {}).get("total_resources", 0)
                    context["subscription_id"] = session.get("subscription_id", "")
            except Exception as e:
                logger.warning(f"Could not load session for user {request.user_id}: {e}")

        plan = await service.analyze_issue(
            issue_title=request.issue_title,
            issue_resource=request.issue_resource,
            issue_source=request.issue_source,
            context=context,
        )

        return AnalyzeIssueResponse(success=True, plan=plan)
    except Exception as e:
        logger.error(f"Failed to analyze issue: {str(e)}")
        return AnalyzeIssueResponse(success=False, error=str(e))


@router.post("/execute", response_model=ExecutePlanResponse)
async def execute_plan(request: ExecutePlanRequest):
    """Execute an approved remediation plan"""
    try:
        service = await _get_agent_service()
        subscription_id = ""

        if request.user_id:
            try:
                session_key = f"session:{request.user_id}"
                redis = await session_manager.get_redis()
                session_data = await redis.get(session_key)
                if session_data:
                    session = eval(session_data)
                    creds = {
                        "tenant_id": session.get("tenant_id", ""),
                        "client_id": session.get("client_id", ""),
                        "client_secret": session.get("client_secret", ""),
                    }
                    service.azure_credentials = creds
                    subscription_id = session.get("subscription_id", "")
            except Exception as e:
                logger.warning(f"Could not load session for user {request.user_id}: {e}")

        plan = await service.execute_plan(
            plan_id=request.plan_id,
            subscription_id=subscription_id,
        )

        return ExecutePlanResponse(success=plan.get("status") != "not_found", plan=plan)
    except Exception as e:
        logger.error(f"Failed to execute plan: {str(e)}")
        return ExecutePlanResponse(success=False, error=str(e))


@router.get("/plan/{plan_id}", response_model=PlanStatusResponse)
async def get_plan_status(plan_id: str):
    """Get the status of a remediation plan"""
    try:
        service = await _get_agent_service()
        plan = await service.get_plan_status(plan_id)
        if plan:
            return PlanStatusResponse(success=True, plan=plan)
        return PlanStatusResponse(success=False, error="Plan not found")
    except Exception as e:
        logger.error(f"Failed to get plan status: {str(e)}")
        return PlanStatusResponse(success=False, error=str(e))
