"""
Resource State Management Service
Persistent state for deployed resources with Cosmos DB-ready schema
Uses Redis as immediate store, designed for migration to Cosmos DB
"""

import json
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class ResourceStateService:
    """Persistent resource state management"""

    def __init__(self, redis_client=None):
        self.redis_client = redis_client

    def _make_key(self, resource_id: str) -> str:
        return f"resource_state:{resource_id}"

    def _make_index_key(self, field: str, value: str) -> str:
        return f"resource_idx:{field}:{value}"

    async def save_resource(self, resource: Dict[str, Any]) -> Dict[str, Any]:
        """Save or update a resource's persistent state"""
        now = datetime.now(timezone.utc).isoformat()
        if "createdAt" not in resource:
            resource["createdAt"] = now
        resource["modifiedAt"] = now

        key = self._make_key(resource["resourceId"])
        await self.redis_client.setex(key, 86400 * 30, json.dumps(resource))

        for idx_field in ["resourceType", "resourceGroup", "deploymentId", "subscriptionId"]:
            if resource.get(idx_field):
                idx_key = self._make_index_key(idx_field, resource[idx_field])
                await self.redis_client.sadd(idx_key, resource["resourceId"])
                await self.redis_client.expire(idx_key, 86400 * 30)

        return resource

    async def get_resource(self, resource_id: str) -> Optional[Dict[str, Any]]:
        """Get a resource by its ID"""
        data = await self.redis_client.get(self._make_key(resource_id))
        return json.loads(data) if data else None

    async def find_resources(self, field: str, value: str) -> List[Dict[str, Any]]:
        """Find resources by indexed field (resourceType, resourceGroup, etc.)"""
        idx_key = self._make_index_key(field, value)
        ids = await self.redis_client.smembers(idx_key) or []
        resources = []
        for rid in ids:
            res = await self.get_resource(rid)
            if res:
                resources.append(res)
        return resources

    async def list_all(self) -> List[Dict[str, Any]]:
        """List all persisted resources"""
        cursor = b"0"
        resources = []
        pattern = "resource_state:*"
        while cursor:
            cursor, keys = await self.redis_client.scan(cursor=cursor, match=pattern, count=100)
            for key in keys:
                data = await self.redis_client.get(key)
                if data:
                    resources.append(json.loads(data))
        return resources

    async def delete_resource(self, resource_id: str) -> bool:
        """Remove a resource from state store"""
        existing = await self.get_resource(resource_id)
        if existing:
            for idx_field in ["resourceType", "resourceGroup", "deploymentId", "subscriptionId"]:
                if existing.get(idx_field):
                    idx_key = self._make_index_key(idx_field, existing[idx_field])
                    await self.redis_client.srem(idx_key, resource_id)
            await self.redis_client.delete(self._make_key(resource_id))
            return True
        return False

    async def update_resource(self, resource_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Partially update a resource"""
        existing = await self.get_resource(resource_id)
        if existing:
            existing.update(updates)
            return await self.save_resource(existing)
        return None


resource_state_service = ResourceStateService()
