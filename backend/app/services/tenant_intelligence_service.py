"""
Tenant Intelligence Service
Aggregates normalized tenant context from multiple sources for AI consumption
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone

from app.core.redis import session_manager
from app.services.resource_state_service import resource_state_service
from app.services.onboarding_service import onboarding_service
from app.services.mongodb_service import mongodb_service

logger = logging.getLogger(__name__)


class TenantIntelligenceService:
    """Builds normalized tenant snapshots for AI context"""

    async def get_tenant_snapshot(self, user_id: str) -> Dict[str, Any]:
        """Build a comprehensive tenant snapshot from all available sources"""
        snapshot: Dict[str, Any] = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "sources": [],
        }

        redis = await session_manager.redis

        # Source 1: Onboarding session (tenant + subscription info)
        try:
            session = await onboarding_service.get_or_create_session(user_id)
            if session:
                snapshot["tenant_id"] = session.get("tenant_id", "N/A")
                snapshot["subscription_id"] = session.get("subscription_id", "N/A")
                snapshot["environment"] = session.get("environment_name", "N/A")
                snapshot["tenant_name"] = session.get("tenant_name", "")
                snapshot["sources"].append("session")
        except Exception as e:
            logger.warning(f"Failed to load session context: {e}")

        # Source 2: Tenant sync cache (resource counts, costs, security)
        try:
            if session and session.get("tenant_id") and session.get("subscription_id"):
                sync_service = onboarding_service.azure_sync_service
                if sync_service:
                    sync_id = f"{session['tenant_id']}_{session['subscription_id']}"
                    cached = await sync_service.get_cached_summary(sync_id)
                    if cached:
                        snapshot["resource_count"] = cached.get("total_resources", 0)
                        snapshot["resource_summary"] = cached.get("resource_summary", {})
                        snapshot["costs"] = {
                            "month_to_date": cached.get("costs", {}).get("month_to_date", 0),
                            "forecast": cached.get("costs", {}).get("forecast", 0),
                            "currency": cached.get("costs", {}).get("currency", "USD"),
                        }
                        snapshot["security"] = {
                            "secure_score": cached.get("security", {}).get("secure_score", 0),
                            "alerts": cached.get("security", {}).get("total_alerts", 0),
                        }
                        snapshot["advisor"] = {
                            "recommendations": cached.get("advisor", {}).get("count", 0),
                        }
                        snapshot["sources"].append("sync_cache")
        except Exception as e:
            logger.warning(f"Failed to load sync cache: {e}")

        # Source 3: Deployed resource state from Redis
        try:
            if redis:
                resource_state_service.redis_client = redis
                deployed = await resource_state_service.list_all()
                if deployed:
                    snapshot["deployed_resources"] = {
                        "total": len(deployed),
                        "recent": [
                            {
                                "type": r.get("resourceType"),
                                "name": r.get("resourceName"),
                                "group": r.get("resourceGroup"),
                                "region": r.get("region"),
                                "status": r.get("deploymentStatus", "unknown"),
                                "created": r.get("createdAt", ""),
                            }
                            for r in deployed[-10:]
                        ],
                    }
                    snapshot["sources"].append("redis_state")
        except Exception as e:
            logger.warning(f"Failed to load Redis state: {e}")

        # Source 4: MongoDB deployment records
        try:
            mongo_stats = await mongodb_service.count_deployments()
            if mongo_stats:
                snapshot["mongo_deployments"] = {
                    "total": mongo_stats,
                }
                snapshot["sources"].append("mongodb")
        except Exception as e:
            logger.warning(f"Failed to load MongoDB stats: {e}")

        return snapshot

    async def get_tenant_context(self, user_id: str, include_details: bool = False) -> Dict[str, Any]:
        """Get a lightweight tenant context for AI system prompts"""
        snapshot = await self.get_tenant_snapshot(user_id)

        context = {
            "subscription_id": snapshot.get("subscription_id", "N/A"),
            "tenant_id": snapshot.get("tenant_id", "N/A"),
            "environment": snapshot.get("environment", "N/A"),
            "total_resources": snapshot.get("resource_count", 0),
            "monthly_cost": snapshot.get("costs", {}).get("month_to_date", 0),
            "currency": snapshot.get("costs", {}).get("currency", "USD"),
            "security_alerts": snapshot.get("security", {}).get("alerts", 0),
            "advisor_recommendations": snapshot.get("advisor", {}).get("recommendations", 0),
        }

        if include_details:
            context["resource_summary"] = snapshot.get("resource_summary", {})
            context["deployed_resources"] = snapshot.get("deployed_resources", {})
            context["costs"] = snapshot.get("costs", {})

        return context


tenant_intelligence = TenantIntelligenceService()
