"""
Recommendation Engine
Generates ranked recommendations from tenant data
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.core.redis import session_manager
from app.services.onboarding_service import onboarding_service
from app.services.tenant_intelligence_service import tenant_intelligence

logger = logging.getLogger(__name__)


RECOMMENDATION_TEMPLATES: List[Dict[str, Any]] = [
    {
        "id": "stop_unused_vm",
        "title": "Stop Unused Virtual Machines",
        "category": "cost",
        "description": "Identify and stop VMs that have been idle for more than 30 days.",
        "potential_savings_pct": 30,
        "effort": "low",
        "impact": "high",
    },
    {
        "id": "enable_backup",
        "title": "Enable Azure Backup on Resources",
        "category": "security",
        "description": "Enable Azure Backup for all production VMs and databases.",
        "potential_savings_pct": 0,
        "effort": "medium",
        "impact": "high",
    },
    {
        "id": "enable_defender",
        "title": "Enable Microsoft Defender for Cloud",
        "category": "security",
        "description": "Enable Defender for Cloud on all subscriptions for enhanced threat protection.",
        "potential_savings_pct": 0,
        "effort": "low",
        "impact": "high",
    },
    {
        "id": "delete_orphan_disks",
        "title": "Delete Orphaned Managed Disks",
        "category": "cost",
        "description": "Remove unattached managed disks that continue to incur storage costs.",
        "potential_savings_pct": 10,
        "effort": "low",
        "impact": "medium",
    },
    {
        "id": "reserved_instances",
        "title": "Purchase Reserved Instances",
        "category": "cost",
        "description": "Reserve compute capacity for steady-state workloads to save up to 40%.",
        "potential_savings_pct": 40,
        "effort": "medium",
        "impact": "high",
    },
    {
        "id": "rightsize_vms",
        "title": "Rightsize Over-provisioned VMs",
        "category": "cost",
        "description": "Downsize VMs that are consistently under-utilized (CPU < 20%).",
        "potential_savings_pct": 20,
        "effort": "medium",
        "impact": "high",
    },
    {
        "id": "enable_monitoring",
        "title": "Enable Azure Monitor for All Resources",
        "category": "observability",
        "description": "Enable diagnostic settings and monitoring for all Azure resources.",
        "potential_savings_pct": 0,
        "effort": "medium",
        "impact": "medium",
    },
    {
        "id": "review_public_endpoints",
        "title": "Review Public Endpoint Exposure",
        "category": "security",
        "description": "Audit and restrict public access to storage accounts and databases.",
        "potential_savings_pct": 0,
        "effort": "high",
        "impact": "high",
    },
]


class RecommendationEngine:
    """Generates and ranks recommendations based on tenant data"""

    async def get_recommendations(
        self,
        user_id: str,
        limit: int = 10,
        category: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate ranked recommendations for a tenant"""
        snapshot = await tenant_intelligence.get_tenant_snapshot(user_id)
        recommendations: List[Dict[str, Any]] = []

        for tmpl in RECOMMENDATION_TEMPLATES:
            if category and tmpl["category"] != category:
                continue

            rec = {**tmpl}
            rec["generated_at"] = datetime.now(timezone.utc).isoformat()

            monthly_cost = snapshot.get("costs", {}).get("month_to_date", 0)
            if rec["potential_savings_pct"] > 0 and monthly_cost > 0:
                rec["estimated_savings"] = round(monthly_cost * rec["potential_savings_pct"] / 100, 2)
            else:
                rec["estimated_savings"] = 0

            recommendations.append(rec)

        recommendations.sort(key=lambda r: r.get("estimated_savings", 0), reverse=True)

        return {
            "recommendations": recommendations[:limit],
            "total": len(recommendations),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "tenant_summary": {
                "monthly_cost": snapshot.get("costs", {}).get("month_to_date", 0),
                "currency": snapshot.get("costs", {}).get("currency", "USD"),
                "resource_count": snapshot.get("resource_count", 0),
            },
        }


recommendation_engine = RecommendationEngine()
