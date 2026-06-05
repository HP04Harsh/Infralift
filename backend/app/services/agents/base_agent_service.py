"""
Base Agent Service
Provides common functionality for all agent services
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
import logging
import uuid

logger = logging.getLogger(__name__)


class BaseAgentService:
    """Base service for all agent operations"""
    
    def __init__(self, redis_client=None, azure_credentials=None):
        self.redis_client = redis_client
        self.azure_credentials = azure_credentials
        self.active_deployments = {}
    
    def generate_request_id(self) -> str:
        """Generate unique request ID for tracking"""
        return f"REQ-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
    
    async def save_deployment_state(
        self,
        request_id: str,
        state: Dict[str, Any]
    ):
        """Save deployment state to Redis"""
        try:
            key = f"deployment:{request_id}"
            await self.redis_client.setex(key, 86400, str(state))  # 24 hour TTL
        except Exception as e:
            logger.error(f"Failed to save deployment state: {str(e)}")
    
    async def get_deployment_state(self, request_id: str) -> Optional[Dict[str, Any]]:
        """Get deployment state from Redis"""
        try:
            key = f"deployment:{request_id}"
            state = await self.redis_client.get(key)
            if state:
                return eval(state)
        except Exception as e:
            logger.error(f"Failed to get deployment state: {str(e)}")
        return None
    
    async def update_deployment_progress(
        self,
        request_id: str,
        progress: float,
        current_step: str,
        status: str
    ):
        """Update deployment progress"""
        try:
            state = await self.get_deployment_state(request_id) or {}
            state.update({
                "progress": progress,
                "current_step": current_step,
                "status": status,
                "updated_at": datetime.utcnow().isoformat()
            })
            await self.save_deployment_state(request_id, state)
        except Exception as e:
            logger.error(f"Failed to update deployment progress: {str(e)}")
    
    async def create_deployment_card(
        self,
        request_id: str,
        deployment_type: str,
        resource_name: str,
        region: str,
        created_by: str,
        status: str,
        estimated_cost: Optional[float] = None
    ) -> Dict[str, Any]:
        """Create deployment result card"""
        return {
            "request_id": request_id,
            "resource_name": resource_name,
            "deployment_type": deployment_type,
            "region": region,
            "created_by": created_by,
            "timestamp": datetime.utcnow().isoformat(),
            "deployment_status": status,
            "terraform_saved": True,
            "estimated_cost": estimated_cost,
            "status_color": self._get_status_color(status)
        }
    
    def _get_status_color(self, status: str) -> str:
        """Get color based on deployment status"""
        status_colors = {
            "success": "green",
            "completed": "green",
            "failed": "red",
            "error": "red",
            "in_progress": "yellow",
            "pending": "yellow",
            "deploying": "yellow"
        }
        return status_colors.get(status.lower(), "gray")
    
    async def get_tenant_context(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get tenant context from Redis"""
        try:
            session_key = f"session:{user_id}"
            session_data = await self.redis_client.get(session_key)
            if session_data:
                session = eval(session_data)
                return {
                    "tenant_id": session.get("tenant_id"),
                    "subscription_id": session.get("subscription_id"),
                    "environment_name": session.get("environment_name"),
                    "total_resources": session.get("resource_sync", {}).get("total_resources", 0)
                }
        except Exception as e:
            logger.error(f"Failed to get tenant context: {str(e)}")
        return None