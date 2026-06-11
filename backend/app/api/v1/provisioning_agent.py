"""
Provisioning Agent API — AI-driven deployment with real Terraform/Azure SDK execution
"""
import json
import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.provisioning_agent_service import provisioning_agent_service

logger = logging.getLogger(__name__)

router = APIRouter()


class ProvisioningChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    user_id: str = "default"


class ProvisioningChatResponse(BaseModel):
    success: bool
    session_id: str
    events: List[Dict[str, Any]]
    phase: str
    message: Optional[str] = None
    plan: Optional[Dict[str, Any]] = None
    deployment_id: Optional[str] = None
    request_id: Optional[str] = None


class ProvisioningApproveRequest(BaseModel):
    session_id: str
    user_id: str = "default"


class ProvisioningRejectRequest(BaseModel):
    session_id: str
    user_id: str = "default"


class ProvisioningDeployment(BaseModel):
    deployment_id: str
    request_id: str
    resource_type: str
    resource_name: str
    resource_group: str
    region: str
    status: str
    created_at: str
    parameters: Optional[Dict[str, Any]] = None


class ProvisioningStatsResponse(BaseModel):
    success: bool
    completed: int
    in_progress: int
    failed: int


class ActiveResourceResponse(BaseModel):
    deployment_id: str
    resource_type: str
    resource_name: str
    resource_group: str
    region: str
    created_at: str
    status: str


@router.post("/chat", response_model=ProvisioningChatResponse)
async def provisioning_chat(request: ProvisioningChatRequest):
    """Process a provisioning chat message. Creates session if no session_id."""
    try:
        if request.session_id:
            session = await provisioning_agent_service.get_session(request.session_id)
            if not session:
                return ProvisioningChatResponse(
                    success=False,
                    session_id="",
                    events=[{"type": "status", "status": "error", "message": "Session not found or expired. Please start a new request."}],
                    phase="error",
                )
        else:
            session = await provisioning_agent_service.start_session(request.user_id)

        events = []
        async for event in provisioning_agent_service.process_message(
            session, request.message, request.user_id
        ):
            events.append(event)

        return ProvisioningChatResponse(
            success=True,
            session_id=session.session_id,
            events=events,
            phase=session.phase,
            message=session.error,
            plan=session.plan,
            deployment_id=session.deployment_id,
            request_id=session.request_id,
        )
    except Exception as e:
        logger.error("Provisioning chat failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/approve", response_model=ProvisioningChatResponse)
async def provisioning_approve(request: ProvisioningApproveRequest):
    """Approve a deployment plan and execute deployment."""
    try:
        session = await provisioning_agent_service.get_session(request.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        events = []
        async for event in provisioning_agent_service.approve_deployment(session, request.user_id):
            events.append(event)

        return ProvisioningChatResponse(
            success=True,
            session_id=session.session_id,
            events=events,
            phase=session.phase,
            message=session.error,
            plan=session.plan,
            deployment_id=session.deployment_id,
            request_id=session.request_id,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Provisioning approve failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reject", response_model=ProvisioningChatResponse)
async def provisioning_reject(request: ProvisioningRejectRequest):
    """Reject a deployment plan."""
    try:
        session = await provisioning_agent_service.get_session(request.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        events = []
        async for event in provisioning_agent_service.reject_deployment(session, request.user_id):
            events.append(event)

        return ProvisioningChatResponse(
            success=True,
            session_id=session.session_id,
            events=events,
            phase=session.phase,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Provisioning reject failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/session/{session_id}")
async def provisioning_get_session(session_id: str):
    """Get current session state."""
    session = await provisioning_agent_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"success": True, "session": session.to_dict()}


@router.get("/deployments", response_model=List[ProvisioningDeployment])
async def provisioning_list_deployments(
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
):
    """List deployments from MongoDB."""
    deps = await provisioning_agent_service.list_deployments(status=status, limit=limit)
    return [
        ProvisioningDeployment(
            deployment_id=d.get("deploymentId", ""),
            request_id=d.get("requestId", ""),
            resource_type=d.get("resourceType", ""),
            resource_name=d.get("resourceName", ""),
            resource_group=d.get("resourceGroup", ""),
            region=d.get("region", ""),
            status=d.get("deploymentStatus", "Unknown"),
            created_at=d.get("createdAt", ""),
            parameters=d.get("parameters"),
        )
        for d in deps
    ]


@router.get("/deployments/stats", response_model=ProvisioningStatsResponse)
async def provisioning_deployment_stats():
    """Get deployment statistics."""
    stats = await provisioning_agent_service.get_deployment_stats()
    return ProvisioningStatsResponse(success=True, **stats)


@router.get("/resources", response_model=List[ActiveResourceResponse])
async def provisioning_active_resources(limit: int = Query(20, le=100)):
    """Get active (successfully deployed) resources."""
    resources = await provisioning_agent_service.list_active_resources(limit=limit)
    return [
        ActiveResourceResponse(
            deployment_id=r.get("deploymentId", ""),
            resource_type=r.get("resourceType", ""),
            resource_name=r.get("resourceName", ""),
            resource_group=r.get("resourceGroup", ""),
            region=r.get("region", ""),
            created_at=r.get("createdAt", ""),
            status=r.get("deploymentStatus", "Succeeded"),
        )
        for r in resources
    ]
