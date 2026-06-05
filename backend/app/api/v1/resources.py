from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.services.onboarding_service import onboarding_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


async def _get_cached_data(user_id: Optional[str] = None):
    """Get cached resource data from Redis via sync service"""
    sync_service = onboarding_service.azure_sync_service
    if not sync_service:
        try:
            from app.core.redis import session_manager as sm
            redis_c = sm.redis if sm.redis else await sm.connect()
            from app.services.azure_sync_service import AzureSyncService
            onboarding_service.azure_sync_service = AzureSyncService(redis_c)
            sync_service = onboarding_service.azure_sync_service
        except Exception as e:
            logger.warning(f"Auto-init sync service failed: {e}")
            raise HTTPException(status_code=503, detail="Sync service not initialized")

    # If user_id provided, find their sync_id from session
    sync_id = None
    if user_id:
        session = await onboarding_service.get_or_create_session(user_id)
        if session and session.get("tenant_id") and session.get("subscription_id"):
            sync_id = f"{session['tenant_id']}_{session['subscription_id']}"

    if not sync_id:
        # Try to get any cached data by scanning Redis keys
        try:
            redis = onboarding_service.azure_sync_service.redis_client
            keys = await redis.keys("azure_resources:*")
            if keys:
                sync_id = keys[0].split(":", 1)[1]
        except Exception:
            pass

    if not sync_id:
        raise HTTPException(status_code=404, detail="No synced data found. Please connect a tenant first.")

    data = await sync_service.get_cached_resources(sync_id)
    if not data:
        raise HTTPException(status_code=404, detail="No cached resources found. Sync may be in progress.")
    return data, sync_id


@router.get("/")
async def list_resources(
    user_id: Optional[str] = Query(None),
    resource_type: Optional[str] = None,
    location: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    """List all Azure resources from synced cache"""
    data, _ = await _get_cached_data(user_id)

    resources = []

    for rg in data.get("resource_groups", []):
        resources.append({
            "id": rg["id"],
            "name": rg["name"],
            "type": "Microsoft.Resources/resourceGroups",
            "location": rg["location"],
            "resource_group": rg["name"],
            "status": rg["provisioning_state"],
            "tags": rg.get("tags", {})
        })

    for vm in data.get("virtual_machines", []):
        resources.append({
            "id": vm["id"],
            "name": vm["name"],
            "type": "Microsoft.Compute/virtualMachines",
            "location": vm["location"],
            "resource_group": vm.get("resource_group", ""),
            "status": vm.get("power_state", vm.get("provisioning_state", "Unknown")),
            "vm_size": vm.get("vm_size"),
            "os_type": vm.get("os_type")
        })

    for net in data.get("network_resources", []):
        resources.append({
            "id": net["id"],
            "name": net["name"],
            "type": f"Microsoft.Network/{net['type']}",
            "location": net["location"],
            "resource_group": net.get("resource_group", ""),
            "status": net.get("provisioning_state", "Available")
        })

    for storage in data.get("storage_accounts", []):
        resources.append({
            "id": storage["id"],
            "name": storage["name"],
            "type": "Microsoft.Storage/storageAccounts",
            "location": storage["location"],
            "resource_group": storage.get("resource_group", ""),
            "status": storage.get("provisioning_state", "Available"),
            "sku": storage.get("sku"),
            "kind": storage.get("kind")
        })

    for db in data.get("sql_databases", []):
        resources.append({
            "id": db["id"],
            "name": db["name"],
            "type": "Microsoft.Sql/servers/databases",
            "location": db["location"],
            "resource_group": db.get("resource_group", ""),
            "status": db.get("status", "Unknown"),
            "server_name": db.get("server_name")
        })

    for vault in data.get("key_vaults", []):
        resources.append({
            "id": vault["id"],
            "name": vault["name"],
            "type": "Microsoft.KeyVault/vaults",
            "location": vault["location"],
            "resource_group": vault.get("resource_group", ""),
            "status": "Active"
        })

    for app in data.get("web_apps", []):
        resources.append({
            "id": app["id"],
            "name": app["name"],
            "type": "Microsoft.Web/sites",
            "location": app["location"],
            "resource_group": app.get("resource_group", ""),
            "status": app.get("state", "Unknown")
        })

    for ci in data.get("container_instances", []):
        resources.append({
            "id": ci["id"],
            "name": ci["name"],
            "type": "Microsoft.ContainerInstance/containerGroups",
            "location": ci["location"],
            "resource_group": ci.get("resource_group", ""),
            "status": ci.get("provisioning_state", "Unknown")
        })

    if resource_type:
        resources = [r for r in resources if r["type"] == resource_type]
    if location:
        resources = [r for r in resources if r["location"] == location]

    return resources[skip:skip + limit]


@router.get("/{resource_id}")
async def get_resource(resource_id: str, user_id: Optional[str] = Query(None)):
    """Get specific resource details from cache"""
    data, _ = await _get_cached_data(user_id)

    for category in ["virtual_machines", "storage_accounts", "sql_databases",
                     "network_resources", "key_vaults", "web_apps", "container_instances"]:
        for resource in data.get(category, []):
            if resource["id"] == resource_id:
                return {
                    "resource": resource,
                    "category": category,
                    "synced_at": data.get("synced_at")
                }

    raise HTTPException(status_code=404, detail=f"Resource {resource_id} not found")


@router.get("/stats/summary")
async def get_resource_stats(user_id: Optional[str] = Query(None)):
    """Get resource statistics summary from real data"""
    data, _ = await _get_cached_data(user_id)

    by_type = {}
    by_location = {}
    by_status = {}

    for category, type_name in [
        ("resource_groups", "Microsoft.Resources/resourceGroups"),
        ("virtual_machines", "Microsoft.Compute/virtualMachines"),
        ("storage_accounts", "Microsoft.Storage/storageAccounts"),
        ("sql_databases", "Microsoft.Sql/servers/databases"),
        ("network_resources", "Microsoft.Network/"),
        ("key_vaults", "Microsoft.KeyVault/vaults"),
        ("web_apps", "Microsoft.Web/sites"),
        ("container_instances", "Microsoft.ContainerInstance/containerGroups")
    ]:
        items = data.get(category, [])
        by_type[type_name] = len(items)
        for item in items:
            loc = item.get("location", "unknown")
            by_location[loc] = by_location.get(loc, 0) + 1

    # Count statuses across all resource types
    for category in ["virtual_machines", "storage_accounts", "sql_databases",
                     "network_resources", "key_vaults", "web_apps", "container_instances"]:
        for item in data.get(category, []):
            status = item.get("power_state") or item.get("provisioning_state") or item.get("status") or "Unknown"
            by_status[status] = by_status.get(status, 0) + 1

    cost_data = data.get("cost_data", {})
    security = data.get("security_findings", {})

    return {
        "total_resources": data.get("total_resources", 0),
        "by_type": by_type,
        "by_location": by_location,
        "by_status": by_status,
        "costs": {
            "month_to_date": cost_data.get("month_to_date", 0),
            "forecast": cost_data.get("forecast", 0),
            "currency": cost_data.get("currency", "USD")
        },
        "security": {
            "secure_score": security.get("secure_score", 0),
            "secure_score_percentage": security.get("secure_score_percentage", 0),
            "total_alerts": len(security.get("alerts", []))
        },
        "synced_at": data.get("synced_at")
    }


@router.get("/stats/metrics")
async def get_resource_metrics(user_id: Optional[str] = Query(None)):
    """Get monitoring metrics from cached data"""
    data, sync_id = await _get_cached_data(user_id)
    sync_service = onboarding_service.azure_sync_service

    # Try to get fresh metrics (5-min cache)
    metrics = await sync_service.get_cached_metrics(sync_id)
    if not metrics:
        metrics = data.get("monitoring_metrics", {})

    return {
        "metrics": metrics,
        "synced_at": data.get("synced_at")
    }


@router.get("/stats/costs")
async def get_resource_costs(user_id: Optional[str] = Query(None)):
    """Get cost data from cached sync"""
    data, _ = await _get_cached_data(user_id)
    cost_data = data.get("cost_data", {})

    return {
        "costs": cost_data,
        "synced_at": data.get("synced_at")
    }


@router.get("/stats/security")
async def get_security_findings(user_id: Optional[str] = Query(None)):
    """Get security findings from cached sync"""
    data, _ = await _get_cached_data(user_id)
    security = data.get("security_findings", {})

    return {
        "security": security,
        "synced_at": data.get("synced_at")
    }


@router.get("/stats/advisor")
async def get_advisor_recommendations(user_id: Optional[str] = Query(None)):
    """Get Advisor recommendations from cached sync"""
    data, _ = await _get_cached_data(user_id)
    recommendations = data.get("advisor_recommendations", [])

    return {
        "recommendations": recommendations,
        "count": len(recommendations),
        "synced_at": data.get("synced_at")
    }
