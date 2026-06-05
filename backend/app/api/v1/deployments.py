"""
Deployment API Routes
Provisioning, state management, and deployment orchestration
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from app.services.agents.provisioning_agent_service import provisioning_agent_service
from app.services.resource_state_service import resource_state_service
from app.services.terraform_service import terraform_service
from app.services.audit_service import audit_service
from app.core.redis import session_manager
import json

router = APIRouter()


class DeploymentPlan(BaseModel):
    resourceType: str
    resourceName: str
    region: str
    resourceGroup: Optional[str] = None
    size: Optional[str] = None
    osType: Optional[str] = None
    adminUsername: Optional[str] = None
    adminPassword: Optional[str] = None
    sku: Optional[str] = None
    kind: Optional[str] = None
    environment: Optional[str] = "production"
    tags: Optional[Dict[str, str]] = None
    armTemplate: Optional[Dict[str, Any]] = None
    originalPrompt: Optional[str] = None
    summary: Optional[str] = None
    subscriptionId: Optional[str] = None
    userId: Optional[str] = None


@router.post("/deploy")
async def deploy_resource(plan: DeploymentPlan):
    """Execute a deployment plan using Azure SDK"""
    redis = await session_manager.redis
    sub_id = plan.subscriptionId or "00000000-0000-0000-0000-000000000000"
    user_id = plan.userId or "default"

    session_key = f"session:{user_id}"
    session_data = await redis.get(session_key) if redis else None
    session = json.loads(session_data) if session_data else {}

    tenant_id = session.get("tenant_id") or ""
    client_id = session.get("client_id") or ""
    client_secret = session.get("client_secret") or ""

    credentials = None
    if tenant_id and client_id and client_secret:
        try:
            from azure.identity import ClientSecretCredential
            credentials = ClientSecretCredential(tenant_id=tenant_id, client_id=client_id, client_secret=client_secret)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Azure auth failed: {e}")

    events = []
    async for event in provisioning_agent_service.execute_deployment(plan.model_dump(), credentials, sub_id, user_id):
        events.append(event)

    return {"events": events, "plan": plan.model_dump()}


@router.get("/resources")
async def list_resources_state():
    """List all persisted resources"""
    redis = await session_manager.redis
    resource_state_service.redis_client = redis
    resources = await resource_state_service.list_all()
    return {"resources": resources}


@router.get("/resources/{resource_id}")
async def get_resource_state(resource_id: str):
    """Get a single resource state by ID"""
    redis = await session_manager.redis
    resource_state_service.redis_client = redis
    resource = await resource_state_service.get_resource(resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    return {"resource": resource}


@router.get("/resources/query")
async def find_resource(resource_type: str, resource_name: str):
    """Find a resource by type and name"""
    redis = await session_manager.redis
    resource_state_service.redis_client = redis
    resources = await resource_state_service.find_resources("resourceType", resource_type)
    matches = [r for r in resources if r.get("resourceName", "").lower() == resource_name.lower()]
    if not matches:
        raise HTTPException(status_code=404, detail=f"Resource {resource_name} of type {resource_type} not found")
    return {"resource": matches[0]}


@router.get("/terraform/{deployment_id}")
async def get_terraform_artifacts(deployment_id: str):
    """Get Terraform metadata for a deployment"""
    redis = await session_manager.redis
    if not redis:
        raise HTTPException(status_code=503, detail="Redis not available")
    data = await redis.get(f"terraform:{deployment_id}")
    if not data:
        raise HTTPException(status_code=404, detail="Terraform artifacts not found")
    return json.loads(data)


@router.get("/audit")
async def list_audits(user: Optional[str] = None, limit: int = 50):
    """List audit records"""
    redis = await session_manager.redis
    audit_service.redis_client = redis
    records = await audit_service.list_audits(user=user, limit=limit)
    return {"audits": records}


class StorageValidateRequest(BaseModel):
    connectionString: str
    containerName: str


@router.post("/storage/validate")
async def validate_storage_connection(req: StorageValidateRequest):
    """Validate Azure Blob Storage connection string and container access"""
    try:
        from azure.storage.blob import BlobServiceClient
        client = BlobServiceClient.from_connection_string(req.connectionString)
        # Try listing containers to verify connectivity
        list(client.list_containers(max_results=1))
        # Try to create container if it doesn't exist (no-op if exists)
        try:
            container_client = client.get_container_client(req.containerName)
            container_client.get_container_properties()
        except Exception:
            client.create_container(req.containerName)
        return {"success": True, "message": "Storage connection validated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Storage connection failed: {e}")


class ModifyRequest(BaseModel):
    resourceId: str
    resourceGroup: str
    resourceName: str
    resourceType: str
    changes: Dict[str, Any]
    userId: Optional[str] = None


@router.post("/modify")
async def modify_resource(req: ModifyRequest):
    """Modify an existing Azure resource (e.g., resize VM)"""
    redis = await session_manager.redis
    user_id = req.userId or "default"
    session_key = f"session:{user_id}"
    session_data = await redis.get(session_key) if redis else None
    session = json.loads(session_data) if session_data else {}

    tenant_id = session.get("tenant_id") or ""
    client_id = session.get("client_id") or ""
    client_secret = session.get("client_secret") or ""

    if not (tenant_id and client_id and client_secret):
        raise HTTPException(status_code=400, detail="Azure credentials not configured. Complete onboarding first.")

    try:
        from azure.identity import ClientSecretCredential
        credentials = ClientSecretCredential(tenant_id=tenant_id, client_id=client_id, client_secret=client_secret)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Azure auth failed: {e}")

    subscription_id = session.get("subscription_id", "")
    rg = req.resourceGroup
    name = req.resourceName
    changes = req.changes

    events = []

    if req.resourceType.lower() in ("virtualmachine", "vm"):
        new_size = changes.get("newSize")
        if new_size:
            events.append({"type": "progress", "step": "find", "message": f"Finding VM {name} in {rg}...", "status": "in_progress"})
            vm = await azure_deployment_service.get_vm(credentials, subscription_id, rg, name)
            if not vm:
                raise HTTPException(status_code=404, detail=f"VM {name} not found in {rg}")
            events.append({"type": "progress", "step": "find", "message": f"VM {name} found (current size: {vm.get('size', 'unknown')})", "status": "completed"})

            events.append({"type": "progress", "step": "resize", "message": f"Resizing VM to {new_size}...", "status": "in_progress"})
            success = await azure_deployment_service.update_vm_size(credentials, subscription_id, rg, name, new_size)
            if not success:
                raise HTTPException(status_code=500, detail="Failed to resize VM")
            events.append({"type": "progress", "step": "resize", "message": f"VM resized to {new_size}", "status": "completed"})

            events.append({"type": "progress", "step": "restart", "message": "Restarting VM...", "status": "in_progress"})
            from azure.mgmt.compute import ComputeManagementClient
            client = ComputeManagementClient(credentials, subscription_id)
            client.virtual_machines.begin_restart(rg, name).result()
            events.append({"type": "progress", "step": "restart", "message": "VM restarted successfully", "status": "completed"})

            events.append({"type": "result", "message": f"VM {name} resized to {new_size} and restarted", "status": "completed"})

            # Update resource state in Redis
            resource_state_service.redis_client = redis
            existing = await resource_state_service.get_resource(req.resourceId) if redis else None
            if existing:
                existing["size"] = new_size
                existing["modified"] = datetime.now(timezone.utc).isoformat()
                await resource_state_service.save_resource(existing, subscription_id)

            # Record audit
            audit_service.redis_client = redis
            await audit_service.record_action(
                user_id=user_id,
                action="modify",
                resource_type=req.resourceType,
                resource_name=name,
                details=f"Resized VM {name} in {rg} to {new_size}",
                subscription_id=subscription_id,
            )

            return {"events": events, "success": True}

    raise HTTPException(status_code=400, detail=f"Modification not supported for resource type: {req.resourceType}")
