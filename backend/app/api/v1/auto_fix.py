"""
Auto Fix Engine API Routes
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.auto_fix_engine import auto_fix_engine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auto-fix", tags=["auto-fix"])


class AutoFixRequest(BaseModel):
    services: Optional[List[str]] = None


class ApprovalRequest(BaseModel):
    approval_id: str
    action: str  # "approve" or "reject"


@router.post("/scan")
async def scan_and_fix(req: AutoFixRequest):
    """Scan system health and apply auto-fixes."""
    try:
        results = await auto_fix_engine.run_auto_fix(services=req.services)
        return {"success": True, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending")
async def get_pending_approvals():
    """Get all pending auto-fix approvals."""
    return {"approvals": auto_fix_engine.get_pending_approvals()}


@router.post("/approve")
async def approve_action(req: ApprovalRequest):
    """Approve or reject a pending auto-fix action."""
    if req.action == "approve":
        ok = await auto_fix_engine.approve(req.approval_id)
    elif req.action == "reject":
        ok = await auto_fix_engine.reject(req.approval_id)
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'approve' or 'reject'.")
    if not ok:
        raise HTTPException(status_code=404, detail=f"Approval {req.approval_id} not found or already processed")
    return {"success": True, "approval_id": req.approval_id, "action": req.action}


@router.post("/retry-sync")
async def retry_sync(session_key: str):
    """Retry a failed resource sync."""
    result = await auto_fix_engine.retry_sync(session_key)
    return result


@router.post("/retry-servicenow")
async def retry_servicenow(deployment_id: str):
    """Retry a failed ServiceNow ticket."""
    result = await auto_fix_engine.retry_servicenow(deployment_id)
    return result
