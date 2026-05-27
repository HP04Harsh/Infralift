from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()


class Resource(BaseModel):
    id: str
    name: str
    type: str
    location: str
    resource_group: str
    status: str
    created_at: datetime


class ResourceFilter(BaseModel):
    resource_type: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    resource_group: Optional[str] = None


@router.get("/", response_model=List[Resource])
async def list_resources(
    skip: int = 0,
    limit: int = 100,
    resource_type: Optional[str] = None,
    location: Optional[str] = None
):
    """
    List all Azure resources
    In production, this would query Azure Management API
    """
    # Mock resources
    mock_resources = [
        Resource(
            id="res-1",
            name="infralift-vm-1",
            type="Microsoft.Compute/virtualMachines",
            location="eastus",
            resource_group="infralift-rg",
            status="running",
            created_at=datetime.utcnow()
        ),
        Resource(
            id="res-2",
            name="infralift-storage",
            type="Microsoft.Storage/storageAccounts",
            location="eastus",
            resource_group="infralift-rg",
            status="available",
            created_at=datetime.utcnow()
        ),
        Resource(
            id="res-3",
            name="infralift-db",
            type="Microsoft.Sql/servers",
            location="eastus",
            resource_group="infralift-rg",
            status="available",
            created_at=datetime.utcnow()
        ),
    ]
    
    # Apply filters
    filtered_resources = mock_resources
    if resource_type:
        filtered_resources = [r for r in filtered_resources if r.type == resource_type]
    if location:
        filtered_resources = [r for r in filtered_resources if r.location == location]
    
    return filtered_resources[skip:skip + limit]


@router.get("/{resource_id}", response_model=Resource)
async def get_resource(resource_id: str):
    """
    Get specific resource details
    """
    # Mock resource lookup
    if resource_id == "res-1":
        return Resource(
            id="res-1",
            name="infralift-vm-1",
            type="Microsoft.Compute/virtualMachines",
            location="eastus",
            resource_group="infralift-rg",
            status="running",
            created_at=datetime.utcnow()
        )
    
    raise HTTPException(status_code=404, detail="Resource not found")


@router.get("/stats/summary")
async def get_resource_stats():
    """
    Get resource statistics summary
    """
    return {
        "total_resources": 150,
        "by_type": {
            "virtual_machines": 45,
            "storage_accounts": 30,
            "databases": 25,
            "network": 50
        },
        "by_location": {
            "eastus": 80,
            "westus": 40,
            "europewest": 30
        },
        "by_status": {
            "running": 120,
            "stopped": 20,
            "failed": 10
        }
    }
