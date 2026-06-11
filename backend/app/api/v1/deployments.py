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
from app.services.event_bus import event_bus
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


def _get_credentials(redis, user_id: str):
    session_key = f"session:{user_id}"
    session_data = redis.get(session_key) if redis else None
    session = json.loads(session_data) if session_data else {}
    tenant_id = session.get("tenant_id") or ""
    client_id = session.get("client_id") or ""
    client_secret = session.get("client_secret") or ""
    subscription_id = session.get("subscription_id", "")

    credentials = None
    if tenant_id and client_id and client_secret:
        from azure.identity import ClientSecretCredential
        credentials = ClientSecretCredential(tenant_id=tenant_id, client_id=client_id, client_secret=client_secret)

    return credentials, subscription_id, session


@router.post("/deploy")
async def deploy_resource(plan: DeploymentPlan):
    """Execute a deployment plan using Terraform-first flow (generate, validate, plan, approval, apply)"""
    redis = await session_manager.redis
    sub_id = plan.subscriptionId or "00000000-0000-0000-0000-000000000000"
    user_id = plan.userId or "default"

    credentials, subscription_id, _ = _get_credentials(redis, user_id)
    sub_id = sub_id or subscription_id

    if credentials is None:
        raise HTTPException(status_code=400, detail="Azure credentials not configured. Complete onboarding first.")

    events = []
    async for event in provisioning_agent_service.execute_plan(plan.model_dump(), credentials, sub_id, user_id):
        events.append(event)

    return {"events": events, "plan": plan.model_dump()}


class ContinueDeployRequest(BaseModel):
    requestId: str
    approved: bool = True
    userId: Optional[str] = None


@router.post("/deploy/continue")
async def continue_deployment(req: ContinueDeployRequest):
    """Continue a paused deployment after user approval or cancellation"""
    events = []
    async for event in provisioning_agent_service.continue_deployment(req.requestId, req.approved):
        events.append(event)
    return {"events": events}


@router.post("/deploy/plan")
async def deploy_plan_only(plan: DeploymentPlan):
    """Run Terraform-first flow up to the approval card (generate, validate, plan) without applying"""
    redis = await session_manager.redis
    sub_id = plan.subscriptionId or "00000000-0000-0000-0000-000000000000"
    user_id = plan.userId or "default"

    credentials, subscription_id, _ = _get_credentials(redis, user_id)
    sub_id = sub_id or subscription_id

    if credentials is None:
        raise HTTPException(status_code=400, detail="Azure credentials not configured. Complete onboarding first.")

    events = []
    async for event in provisioning_agent_service.execute_plan(plan.model_dump(), credentials, sub_id, user_id):
        events.append(event)
        # Stop at approval card - don't continue to apply
        if event.get("phase") == "approval":
            break

    return {"events": events, "plan": plan.model_dump()}


class ModifyTerraformRequest(BaseModel):
    resourceName: str
    resourceType: str
    resourceGroup: str
    changes: Dict[str, Any]
    userId: Optional[str] = None


@router.post("/modify/terraform")
async def modify_resource_terraform(req: ModifyTerraformRequest):
    """Modify an existing resource by updating its Terraform configuration"""
    redis = await session_manager.redis
    user_id = req.userId or "default"

    credentials, subscription_id, _ = _get_credentials(redis, user_id)

    if credentials is None:
        raise HTTPException(status_code=400, detail="Azure credentials not configured. Complete onboarding first.")

    events = []
    async for event in provisioning_agent_service.execute_modification(
        req.model_dump(), credentials, subscription_id, user_id
    ):
        events.append(event)

    return {"events": events}


@router.get("/deploy/pending")
async def list_pending_deployments():
    """List all deployments awaiting approval"""
    redis = await session_manager.redis
    if not redis:
        raise HTTPException(status_code=503, detail="Redis not available")

    cursor = 0
    pending = []
    while True:
        cursor, keys = await redis.scan(cursor=cursor, match="deployment:pending:*", count=50)
        for key in keys:
            data = await redis.get(key)
            if data:
                parsed = json.loads(data)
                request_id = key.split(":")[-1]
                pending.append({
                    "requestId": request_id,
                    "createdAt": parsed.get("created_at", ""),
                    "card": parsed.get("card", {}),
                })
        if cursor == 0:
            break
    return {"pending": pending}


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
    connectionString: Optional[str] = None
    accountName: Optional[str] = None
    accountKey: Optional[str] = None
    containerName: Optional[str] = None
    storageType: str = "azure_blob"
    tenantId: Optional[str] = None
    clientId: Optional[str] = None
    clientSecret: Optional[str] = None


@router.post("/storage/validate")
async def validate_storage_connection(req: StorageValidateRequest):
    """Validate Azure storage connection per type (Blob, Files, Data Lake)"""
    try:
        if req.storageType == "azure_blob":
            from azure.storage.blob import BlobServiceClient
            if req.connectionString:
                client = BlobServiceClient.from_connection_string(req.connectionString)
            elif req.accountName and req.accountKey:
                client = BlobServiceClient(
                    account_url=f"https://{req.accountName}.blob.core.windows.net",
                    credential=req.accountKey
                )
            else:
                raise HTTPException(status_code=400, detail="Provide connectionString or accountName + accountKey")
            list(client.list_containers(max_results=1))
            if req.containerName:
                try:
                    cc = client.get_container_client(req.containerName)
                    cc.get_container_properties()
                except Exception:
                    client.create_container(req.containerName)
            return {"success": True, "message": "Blob Storage connection verified"}

        elif req.storageType == "azure_files":
            from azure.storage.fileshare import ShareServiceClient
            if req.connectionString:
                client = ShareServiceClient.from_connection_string(req.connectionString)
            elif req.accountName and req.accountKey:
                client = ShareServiceClient(
                    account_url=f"https://{req.accountName}.file.core.windows.net",
                    credential=req.accountKey
                )
            else:
                raise HTTPException(status_code=400, detail="Provide connectionString or accountName + accountKey")
            list(client.list_shares(max_results=1))
            if req.containerName:
                try:
                    share = client.get_share_client(req.containerName)
                    share.get_share_properties()
                except Exception:
                    client.create_share(req.containerName)
            return {"success": True, "message": "Azure Files connection verified"}

        elif req.storageType == "azure_data_lake":
            from azure.storage.filedatalake import DataLakeServiceClient
            if req.accountName and req.accountKey:
                client = DataLakeServiceClient(
                    account_url=f"https://{req.accountName}.dfs.core.windows.net",
                    credential=req.accountKey
                )
            elif req.tenantId and req.clientId and req.clientSecret:
                from azure.identity import ClientSecretCredential
                cred = ClientSecretCredential(req.tenantId, req.clientId, req.clientSecret)
                client = DataLakeServiceClient(
                    account_url=f"https://{req.accountName}.dfs.core.windows.net",
                    credential=cred
                )
            else:
                raise HTTPException(status_code=400, detail="Provide accountKey or tenantId+clientId+clientSecret")
            list(client.list_file_systems(max_results=1))
            if req.containerName:
                try:
                    fs = client.get_file_system_client(req.containerName)
                    fs.get_file_system_properties()
                except Exception:
                    client.create_file_system(req.containerName)
            return {"success": True, "message": "Data Lake connection verified"}

        else:
            raise HTTPException(status_code=400, detail=f"Unsupported storage type: {req.storageType}")

    except HTTPException:
        raise
    except Exception as e:
        err = str(e)
        if "Invalid" in err and ("key" in err.lower() or "secret" in err.lower()):
            detail = "Invalid Access Key or Secret"
        elif "NotFound" in err or "not found" in err.lower():
            detail = "Storage Account or Container Not Found"
        elif "AuthenticationFailed" in err or "authorization" in err.lower():
            detail = "Authentication Failed — check credentials"
        elif "Network" in err and ("restrict" in err.lower() or "access" in err.lower()):
            detail = "Network Access Restricted"
        else:
            detail = f"Storage connection failed: {err[:200]}"
        raise HTTPException(status_code=400, detail=detail)


class ModifyRequest(BaseModel):
    resourceId: str
    resourceGroup: str
    resourceName: str
    resourceType: str
    action: str = "resize"
    changes: Optional[Dict[str, Any]] = None
    userId: Optional[str] = None


@router.post("/modify")
async def modify_resource(req: ModifyRequest):
    """Modify an existing Azure resource (start/stop/restart/resize VM, delete resource)"""
    redis = await session_manager.redis
    user_id = req.userId or "default"

    credentials, subscription_id, session = _get_credentials(redis, user_id)

    if credentials is None:
        raise HTTPException(status_code=400, detail="Azure credentials not configured. Complete onboarding first.")

    rg = req.resourceGroup
    name = req.resourceName
    changes = req.changes or {}
    action = req.action.lower()
    events = []

    if req.resourceType.lower() in ("virtualmachine", "vm"):
        from app.services.azure_deployment_service import azure_deployment_service
        from azure.mgmt.compute import ComputeManagementClient

        events.append({"type": "progress", "step": "find", "message": f"Finding VM {name} in {rg}...", "status": "in_progress"})
        vm = await azure_deployment_service.get_vm(credentials, subscription_id, rg, name)
        if not vm:
            raise HTTPException(status_code=404, detail=f"VM {name} not found in {rg}")
        vm_size = vm.get("size", "unknown")
        events[-1] = {"type": "progress", "step": "find", "message": f"VM {name} found ({vm_size})", "status": "completed"}

        compute_client = ComputeManagementClient(credentials, subscription_id)

        if action == "start":
            events.append({"type": "progress", "step": "start", "message": f"Starting VM {name}...", "status": "in_progress"})
            compute_client.virtual_machines.begin_start(rg, name).result()
            events.append({"type": "progress", "step": "start", "message": f"VM {name} started", "status": "completed"})
            events.append({"type": "result", "message": f"VM {name} started", "status": "completed"})

        elif action == "stop":
            events.append({"type": "progress", "step": "stop", "message": f"Stopping VM {name}...", "status": "in_progress"})
            compute_client.virtual_machines.begin_power_off(rg, name).result()
            events.append({"type": "progress", "step": "stop", "message": f"VM {name} stopped", "status": "completed"})
            events.append({"type": "result", "message": f"VM {name} stopped", "status": "completed"})

        elif action == "restart":
            events.append({"type": "progress", "step": "restart", "message": f"Restarting VM {name}...", "status": "in_progress"})
            compute_client.virtual_machines.begin_restart(rg, name).result()
            events.append({"type": "progress", "step": "restart", "message": f"VM {name} restarted", "status": "completed"})
            events.append({"type": "result", "message": f"VM {name} restarted", "status": "completed"})

        elif action == "resize":
            new_size = changes.get("newSize")
            if not new_size:
                raise HTTPException(status_code=400, detail="'newSize' required in changes for resize action")
            events.append({"type": "progress", "step": "resize", "message": f"Resizing VM to {new_size}...", "status": "in_progress"})
            success = await azure_deployment_service.update_vm_size(credentials, subscription_id, rg, name, new_size)
            if not success:
                raise HTTPException(status_code=500, detail="Failed to resize VM")
            events.append({"type": "progress", "step": "resize", "message": f"VM resized to {new_size}", "status": "completed"})
            events.append({"type": "progress", "step": "restart", "message": "Restarting VM...", "status": "in_progress"})
            compute_client.virtual_machines.begin_restart(rg, name).result()
            events.append({"type": "progress", "step": "restart", "message": "VM restarted", "status": "completed"})
            events.append({"type": "result", "message": f"VM {name} resized to {new_size} and restarted", "status": "completed"})

        else:
            raise HTTPException(status_code=400, detail=f"Unsupported VM action: {action}")

        resource_state_service.redis_client = redis
        existing = await resource_state_service.get_resource(req.resourceId) if redis else None
        if existing:
            existing["power_state"] = action if action in ("start", "stop") else existing.get("power_state")
            if action == "resize":
                existing["size"] = changes.get("newSize")
            existing["modified"] = datetime.now(timezone.utc).isoformat()
            await resource_state_service.save_resource(existing, subscription_id)

        audit_service.redis_client = redis
        await audit_service.record_action(
            user_id=user_id,
            action=action,
            resource_type=req.resourceType,
            resource_name=name,
            details=f"{action.capitalize()} VM {name} in {rg}",
            subscription_id=subscription_id,
        )

        return {"events": events, "success": True}

    if action == "delete":
        events.append({"type": "progress", "step": "delete", "message": f"Deleting {name}...", "status": "in_progress"})
        try:
            from azure.mgmt.resource import ResourceManagementClient
            rm = ResourceManagementClient(credentials, subscription_id)
            rm.resources.begin_delete_by_id(req.resourceId, "2024-03-01").result()
            events.append({"type": "progress", "step": "delete", "message": f"{name} deleted", "status": "completed"})
            events.append({"type": "result", "message": f"Resource {name} deleted", "status": "completed"})
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Delete failed: {e}")
        return {"events": events, "success": True}

    raise HTTPException(status_code=400, detail=f"Modification not supported for {req.resourceType} action {action}")
