from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.services.agents.migration_agent_service import migration_agent_service
from app.services.onboarding_service import onboarding_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class MigrationExecuteRequest(BaseModel):
    migration_type: str
    details: Dict[str, Any]
    user_id: Optional[str] = None
    target_region: Optional[str] = None
    resource_group: Optional[str] = None


class MigrationStatusResponse(BaseModel):
    success: bool
    status: str
    migration_id: Optional[str] = None
    progress: Optional[int] = None
    summary: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@router.post("/execute")
async def execute_migration(request: MigrationExecuteRequest):
    """Execute a migration of the specified type"""
    try:
        migration_type = request.migration_type
        if migration_type not in migration_agent_service.MIGRATION_TYPES:
            raise HTTPException(status_code=400, detail=f"Unsupported migration type: {migration_type}. Supported: {list(migration_agent_service.MIGRATION_TYPES.keys())}")

        details = request.details
        if request.target_region:
            details["target_region"] = request.target_region
        if request.resource_group:
            details["resource_group"] = request.resource_group

        user_id = request.user_id or "default"
        sync_service = onboarding_service.azure_sync_service
        subscription_id = None
        azure_creds = None

        if sync_service:
            session = await onboarding_service.get_or_create_session(user_id)
            if session:
                subscription_id = session.get("subscription_id")
                tenant_id = session.get("tenant_id")
                if tenant_id and subscription_id:
                    sync_id = f"{tenant_id}_{subscription_id}"
                    sync_data = await sync_service.get_cached_resources(sync_id)
                    if sync_data and "credentials" in sync_data:
                        azure_creds = sync_data["credentials"]

        if not subscription_id:
            raise HTTPException(status_code=400, detail="No Azure subscription connected. Complete onboarding first.")

        migration_agent_service.azure_credentials = azure_creds
        migration_agent_service.redis_client = onboarding_service.azure_sync_service.redis_client if sync_service else None

        events = []
        async for event in migration_agent_service.execute_migration(migration_type, details, user_id, subscription_id):
            events.append(event)

        result_event = events[-1] if events else {}
        if result_event.get("type") == "error":
            return MigrationStatusResponse(success=False, status="failed", error=result_event.get("message", "Migration failed"))

        data = result_event.get("data", {})
        return MigrationStatusResponse(
            success=True,
            status="completed",
            migration_id=data.get("migration_id"),
            progress=100,
            summary=data,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Migration execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{migration_id}", response_model=MigrationStatusResponse)
async def get_migration_status(migration_id: str):
    """Get the status of a migration job"""
    try:
        status = await migration_agent_service.get_migration_status(migration_id)
        if status.get("status") == "not_found":
            return MigrationStatusResponse(success=False, status="not_found", error=f"Migration {migration_id} not found")

        summary = status.get("summary")
        return MigrationStatusResponse(
            success=status.get("status") != "failed",
            status=status.get("status", "unknown"),
            migration_id=migration_id,
            progress=status.get("progress", 0),
            summary=summary,
            error=status.get("error"),
        )
    except Exception as e:
        logger.error(f"Failed to get migration status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/types")
async def list_migration_types():
    """List all supported migration types"""
    try:
        types = await migration_agent_service.list_migration_types()
        return {"success": True, "types": types}
    except Exception as e:
        logger.error(f"Failed to list migration types: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
