"""
ServiceNow Auto-Created Tickets API Routes
Listing, retry, and deployment correlation for auto-generated ServiceNow records
"""
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from app.services.mongodb_service import mongodb_service
from app.services.servicenow_service import servicenow_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/tickets")
async def list_servicenow_tickets(
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    sync_status: Optional[str] = Query(None, description="Filter by sync status: created, failed, skipped"),
):
    """List ServiceNow tickets auto-created by InfraLift deployments."""
    try:
        results = await mongodb_service.list_servicenow_tickets(limit=limit, skip=skip, sync_status=sync_status)
        total = await mongodb_service.count_servicenow_tickets()
        return {"tickets": results, "total": total, "limit": limit, "skip": skip}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list ServiceNow tickets: {e}")


@router.get("/tickets/stats")
async def servicenow_ticket_stats():
    """Get ServiceNow ticket sync statistics."""
    try:
        total = await mongodb_service.count_servicenow_tickets()
        created = await mongodb_service.count_servicenow_tickets("created")
        failed = await mongodb_service.count_servicenow_tickets("failed")
        skipped = await mongodb_service.count_servicenow_tickets("skipped")
        return {"total": total, "created": created, "failed": failed, "skipped": skipped}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {e}")


@router.post("/tickets/{deployment_id}/retry")
async def retry_servicenow_ticket(deployment_id: str):
    """Retry creation of a failed ServiceNow ticket for a deployment."""
    record = await mongodb_service.get_servicenow_ticket(deployment_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"No ServiceNow record found for deployment {deployment_id}")

    if record.get("serviceNowSyncStatus") == "created":
        raise HTTPException(status_code=400, detail=f"Ticket already created for deployment {deployment_id}")

    result = await servicenow_service.create_ticket(
        action=record.get("action_label", "Infrastructure Change"),
        resource_name=record.get("resourceName", ""),
        resource_type=record.get("resourceType", ""),
        resource_group="",
        region="",
        user_name=record.get("createdBy", "unknown"),
        deployment_id=deployment_id,
        status=record.get("deploymentStatus", "Succeeded"),
        resource_id="",
    )

    updates = {
        "serviceNowTicketId": result.get("ticket_id", ""),
        "serviceNowTicketType": result.get("ticket_type", ""),
        "serviceNowSyncStatus": result.get("status", "failed"),
        "serviceNowErrorMessage": result.get("reason", ""),
        "retriedAt": datetime.now(timezone.utc).isoformat(),
    }
    await mongodb_service.update_servicenow_ticket(deployment_id, updates)

    return {"success": result.get("status") == "created", "ticket_id": result.get("ticket_id", ""), "message": result.get("reason", "")}
