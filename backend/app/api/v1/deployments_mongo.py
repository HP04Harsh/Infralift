"""
MongoDB-backed Deployment State API Routes
CRUD for persistent deployment state (additive — does not replace Redis-based endpoints)
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from app.services.mongodb_service import mongodb_service

router = APIRouter()


class MongoDeploymentSave(BaseModel):
    deploymentId: Optional[str] = None
    resourceId: str
    resourceType: str
    resourceName: str
    resourceGroup: str
    region: str
    terraformStoragePath: Optional[str] = ""
    deploymentStatus: str = "Succeeded"
    createdBy: Optional[str] = None
    subscriptionId: Optional[str] = None
    tags: Optional[Dict[str, str]] = None
    metadata: Optional[Dict[str, Any]] = None


class MongoDeploymentUpdate(BaseModel):
    deploymentStatus: Optional[str] = None
    terraformStoragePath: Optional[str] = None
    tags: Optional[Dict[str, str]] = None
    metadata: Optional[Dict[str, Any]] = None


@router.post("/mongo/resources")
async def mongo_list_resources(
    limit: int = Query(100, le=500),
    skip: int = Query(0, ge=0),
):
    """List deployment states from MongoDB (additive, does not replace Redis list)"""
    try:
        results = await mongodb_service.list_all_deployments(limit=limit, skip=skip)
        total = await mongodb_service.count_deployments()
        return {"resources": results, "total": total, "limit": limit, "skip": skip}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MongoDB query failed: {e}")


@router.post("/mongo/resource")
async def mongo_find_resource(
    field: str = Query(...),
    value: str = Query(...),
):
    """Find deployments by field (resourceType, resourceGroup, etc.)"""
    try:
        results = await mongodb_service.find_deployments(field, value)
        return {"resources": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MongoDB search failed: {e}")


@router.post("/mongo/resource/{deployment_id}")
async def mongo_get_resource(deployment_id: str):
    """Get a single deployment state by deploymentId"""
    result = await mongodb_service.get_deployment(deployment_id)
    if not result:
        raise HTTPException(status_code=404, detail="Deployment not found in MongoDB")
    return {"resource": result}


@router.post("/mongo/save")
async def mongo_save_deployment(data: MongoDeploymentSave):
    """Save a deployment state to MongoDB"""
    try:
        saved = await mongodb_service.save_deployment(data.model_dump(exclude_none=True))
        return {"success": True, "resource": saved}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MongoDB save failed: {e}")


@router.post("/mongo/update/{deployment_id}")
async def mongo_update_deployment(deployment_id: str, data: MongoDeploymentUpdate):
    """Update an existing deployment state in MongoDB"""
    updated = await mongodb_service.update_deployment(
        deployment_id,
        data.model_dump(exclude_none=True),
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Deployment not found")
    return {"success": True, "resource": updated}


@router.post("/mongo/delete/{deployment_id}")
async def mongo_delete_deployment(deployment_id: str):
    """Delete a deployment state from MongoDB"""
    deleted = await mongodb_service.delete_deployment(deployment_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Deployment not found")
    return {"success": True, "deleted": deployment_id}


@router.post("/mongo/stats")
async def mongo_deployment_stats():
    """Get deployment statistics from MongoDB"""
    try:
        if not mongodb_service._connected:
            return {"total": 0, "succeeded": 0, "failed": 0, "in_progress": 0}
        total = await mongodb_service.count_deployments()
        succeeded = await mongodb_service.count_deployments("Succeeded")
        failed = await mongodb_service.count_deployments("Failed")
        in_progress = await mongodb_service.count_deployments("InProgress")
        return {
            "total": total,
            "succeeded": succeeded,
            "failed": failed,
            "in_progress": in_progress,
        }
    except Exception as e:
        logger = __import__("logging").getLogger(__name__)
        logger.warning("MongoDB stats failed (non-fatal): %s", e)
        return {"total": 0, "succeeded": 0, "failed": 0, "in_progress": 0}
