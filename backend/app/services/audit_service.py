"""
Audit & Governance Service
Records every AI action with full traceability
"""

import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class AuditService:
    """Full audit trail for every AI action"""

    def __init__(self, redis_client=None):
        self.redis_client = redis_client

    async def record_action(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """Record an AI action with full context"""
        now = datetime.now(timezone.utc).isoformat()
        record = {
            "auditId": f"aud-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{hash(str(action)) % 100000:05d}",
            "timestamp": now,
            "user": action.get("user", "unknown"),
            "agentType": action.get("agentType", "unknown"),
            "prompt": action.get("prompt", ""),
            "aiPlan": action.get("aiPlan", ""),
            "resourcesModified": action.get("resourcesModified", []),
            "terraformFiles": action.get("terraformFiles", {}),
            "deploymentId": action.get("deploymentId", ""),
            "deploymentStatus": action.get("deploymentStatus", "pending"),
            "metadata": action.get("metadata", {}),
        }

        if self.redis_client:
            key = f"audit:{record['auditId']}"
            await self.redis_client.setex(key, 86400 * 90, json.dumps(record))

            list_key = f"audit_log:{action.get('user', 'unknown')}"
            await self.redis_client.lpush(list_key, record["auditId"])
            await self.redis_client.ltrim(list_key, 0, 999)
            await self.redis_client.expire(list_key, 86400 * 90)

        return record

    async def get_audit(self, audit_id: str) -> Optional[Dict[str, Any]]:
        if not self.redis_client:
            return None
        data = await self.redis_client.get(f"audit:{audit_id}")
        return json.loads(data) if data else None

    async def list_audits(self, user: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        if not self.redis_client:
            return []
        if user:
            list_key = f"audit_log:{user}"
            ids = await self.redis_client.lrange(list_key, 0, limit - 1) or []
        else:
            cursor = b"0"
            ids = []
            while cursor and len(ids) < limit:
                cursor, keys = await self.redis_client.scan(cursor=cursor, match="audit:*", count=100)
                ids.extend([k.decode() if isinstance(k, bytes) else k for k in keys if not (k.decode() if isinstance(k, bytes) else k).startswith("audit_log:")])
        records = []
        for aid in ids[:limit]:
            rec = await self.get_audit(aid.replace("audit:", ""))
            if rec:
                records.append(rec)
        return sorted(records, key=lambda x: x.get("timestamp", ""), reverse=True)[:limit]


audit_service = AuditService()
