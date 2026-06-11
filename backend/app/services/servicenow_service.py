"""
ServiceNow Integration Service
Redis-backed config, REST API client, and event-driven ticket creation
"""
import json
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone

from app.core.redis import session_manager
from app.core.config import settings

logger = logging.getLogger(__name__)

SN_CONFIG_KEY = "itsm:servicenow:config"

TICKET_TYPE_MAP = {
    "creation": {"type": "change_request", "category": "Infrastructure Provisioning", "short_description": "{action} via InfraLift"},
    "modification": {"type": "change_request", "category": "Infrastructure Modification", "short_description": "{action} via InfraLift"},
    "deletion": {"type": "change_request", "category": "Infrastructure Decommissioning", "short_description": "{action} via InfraLift"},
    "failure": {"type": "incident", "category": "Deployment Failure", "short_description": "Deployment Failed: {action}"},
    "compliance": {"type": "change_request", "category": "Compliance Remediation", "short_description": "Compliance Fix: {action}"},
    "optimization": {"type": "change_request", "category": "Cost Optimization", "short_description": "Optimization: {action}"},
}


class ServiceNowService:

    # ── Config Management (Redis-backed) ──────────────────────────────

    async def get_config(self) -> Optional[Dict[str, Any]]:
        try:
            return await session_manager.get_session(SN_CONFIG_KEY)
        except Exception as e:
            logger.error("Error reading ServiceNow config from Redis: %s", e)
            return None

    async def save_config(self, config: Dict[str, Any]) -> bool:
        try:
            if not session_manager.redis:
                await session_manager.connect()
            await session_manager.redis.set(SN_CONFIG_KEY, json.dumps(config))
            return True
        except Exception as e:
            logger.error("Error saving ServiceNow config: %s", e)
            return False

    async def clear_config(self) -> bool:
        try:
            if not session_manager.redis:
                await session_manager.connect()
            await session_manager.redis.delete(SN_CONFIG_KEY)
            return True
        except Exception as e:
            logger.error("Error clearing ServiceNow config: %s", e)
            return False

    async def is_configured(self) -> bool:
        config = await self.get_config()
        if config and config.get("instance_url") and config.get("username") and (config.get("password") or config.get("api_token")):
            return True
        return bool(settings.SERVICENOW_INSTANCE_URL and settings.SERVICENOW_USERNAME)

    async def get_effective_config(self) -> Dict[str, Any]:
        config = await self.get_config()
        if config:
            return config
        return {
            "instance_url": settings.SERVICENOW_INSTANCE_URL or "",
            "username": settings.SERVICENOW_USERNAME or "",
            "password": settings.SERVICENOW_PASSWORD or "",
            "api_token": settings.SERVICENOW_API_TOKEN or "",
            "assignment_group": settings.SERVICENOW_ASSIGNMENT_GROUP or "",
        }

    # ── Connection Test ───────────────────────────────────────────────

    async def test_connection(self, instance_url: str, username: str, password: str) -> Dict[str, Any]:
        import httpx
        try:
            auth = (username, password)
            async with httpx.AsyncClient(timeout=15.0) as client:
                test_url = f"{instance_url.rstrip('/')}/api/now/table/sys_user?sysparm_limit=1"
                resp = await client.get(test_url, auth=auth, headers={"Accept": "application/json"})
                if resp.status_code in (200, 201):
                    return {"connected": True, "message": "Connected to ServiceNow"}
                return {"connected": False, "message": f"ServiceNow API error ({resp.status_code})"}
        except ImportError:
            return {"connected": False, "message": "httpx package not installed"}
        except Exception as e:
            err = str(e)
            if "Name or service not known" in err:
                return {"connected": False, "message": f"Cannot resolve host '{instance_url}'. Check the instance URL."}
            if "Connection refused" in err:
                return {"connected": False, "message": "Connection refused. Verify the instance URL and network."}
            if "401" in err or "Unauthorized" in err:
                return {"connected": False, "message": "Authentication failed. Check username and password."}
            return {"connected": False, "message": err}

    # ── Ticket Creation ───────────────────────────────────────────────

    async def create_ticket(
        self,
        action: str,
        resource_name: str,
        resource_type: str,
        resource_group: str,
        region: str,
        user_name: str,
        deployment_id: str,
        status: str = "Succeeded",
        resource_id: str = "",
        terraform_path: str = "",
        subscription_id: str = "",
        error_message: str = "",
    ) -> Dict[str, Any]:
        """Create a ServiceNow ticket based on deployment outcome. Returns dict with ticket info or error."""
        config = await self.get_effective_config()
        instance_url = config.get("instance_url", "")
        username = config.get("username", "")
        password = config.get("password", "") or config.get("api_token", "")
        assignment_group = config.get("assignment_group", "")

        if not instance_url or not username or not password:
            return {"enabled": False, "ticket_id": "", "status": "skipped", "reason": "ServiceNow not configured"}

        # Determine ticket type
        action_lower = action.lower()
        if status.lower() == "failed":
            mapping_key = "failure"
        elif "delete" in action_lower:
            mapping_key = "deletion"
        elif "modif" in action_lower or "resize" in action_lower or "update" in action_lower:
            mapping_key = "modification"
        elif "complian" in action_lower or "remediat" in action_lower:
            mapping_key = "compliance"
        elif "optim" in action_lower:
            mapping_key = "optimization"
        else:
            mapping_key = "creation"

        mapping = TICKET_TYPE_MAP.get(mapping_key, TICKET_TYPE_MAP["creation"])
        sn_table = mapping["type"]
        short_desc = mapping["short_description"].format(action=action)
        description = (
            f"User: {user_name}\n"
            f"Action: {action}\n"
            f"Resource Name: {resource_name}\n"
            f"Resource Type: {resource_type}\n"
            f"Resource Group: {resource_group}\n"
            f"Region: {region}\n"
            f"Requested Through: InfraLift AI Provisioning Agent\n"
            f"Deployment ID: {deployment_id}\n"
            f"Terraform Location: {terraform_path}\n"
            f"Azure Resource ID: {resource_id}\n"
            f"Status: {status}\n"
            f"Priority: Normal\n"
            f"Assignment Group: {assignment_group}\n"
            f"Requested By: {user_name}\n"
        )
        if error_message:
            description += f"Error Details: {error_message}\n"

        sn_payload = {
            "short_description": short_desc[:160],
            "description": description,
            "category": mapping["category"],
            "assignment_group": assignment_group,
            "requested_by": user_name,
            "cmdb_ci": resource_name,
        }

        if sn_table == "change_request":
            sn_payload.update({
                "impact": "3",
                "urgency": "3",
                "risk": "3",
                "change_type": "normal",
            })
        elif sn_table == "incident":
            sn_payload.update({
                "impact": "2" if status.lower() == "failed" else "3",
                "urgency": "2" if status.lower() == "failed" else "3",
                "caller_id": user_name,
            })

        # Call ServiceNow REST API
        import httpx
        try:
            api_url = f"{instance_url.rstrip('/')}/api/now/table/{sn_table}"
            auth = (username, password)
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(api_url, json=sn_payload, auth=auth, headers={"Accept": "application/json", "Content-Type": "application/json"})
                if resp.status_code in (200, 201):
                    result = resp.json().get("result", {})
                    ticket_id = result.get("number", result.get("sys_id", ""))
                    logger.info("ServiceNow ticket %s created for deployment %s", ticket_id, deployment_id)
                    return {
                        "enabled": True,
                        "ticket_id": ticket_id,
                        "ticket_type": sn_table,
                        "sys_id": result.get("sys_id", ""),
                        "status": "created",
                        "short_description": short_desc,
                    }
                error_body = resp.text[:500]
                logger.warning("ServiceNow API error (%s): %s", resp.status_code, error_body)
                return {"enabled": True, "ticket_id": "", "status": "failed", "reason": f"API error ({resp.status_code}): {error_body}"}
        except ImportError:
            return {"enabled": True, "ticket_id": "", "status": "failed", "reason": "httpx not installed"}
        except Exception as e:
            logger.error("ServiceNow ticket creation failed: %s", e)
            return {"enabled": True, "ticket_id": "", "status": "failed", "reason": str(e)}

    # ── Event Handler ─────────────────────────────────────────────────

    async def retry_ticket(self, ticket_record: Dict[str, Any]) -> Dict[str, Any]:
        """Retry a failed ServiceNow ticket using stored deployment data."""
        result = await self.create_ticket(
            action=ticket_record.get("action_label", ticket_record.get("deploymentStatus", "Infrastructure Change")),
            resource_name=ticket_record.get("resourceName", ""),
            resource_type=ticket_record.get("resourceType", ""),
            resource_group=ticket_record.get("resourceGroup", ""),
            region=ticket_record.get("region", ""),
            user_name=ticket_record.get("createdBy", "unknown"),
            deployment_id=ticket_record.get("deploymentId", ""),
            status=ticket_record.get("deploymentStatus", "Succeeded"),
            resource_id=ticket_record.get("resourceId", ""),
            terraform_path=ticket_record.get("terraformPath", ""),
            subscription_id=ticket_record.get("subscriptionId", ""),
            error_message=ticket_record.get("errorMessage", ""),
        )
        # Update MongoDB record with new result
        try:
            from app.services.mongodb_service import mongodb_service
            await mongodb_service.update_servicenow_ticket(
                ticket_record.get("deploymentId", ""),
                {
                    "serviceNowTicketId": result.get("ticket_id", ""),
                    "serviceNowSyncStatus": result.get("status", "failed"),
                    "serviceNowErrorMessage": result.get("reason", ""),
                    "retryCount": ticket_record.get("retryCount", 0) + 1,
                    "lastRetryAt": datetime.now(timezone.utc).isoformat(),
                }
            )
        except Exception as e:
            logger.warning("MongoDB retry record update skipped: %s", e)
        return result

    async def on_deployment_event(self, event_type: str, data: Dict[str, Any]):
        """Handle deployment events from the event bus."""
        if event_type not in ("deployment.completed", "deployment.failed"):
            return

        action_label = data.get("action_label", "Infrastructure Change")
        is_failure = event_type == "deployment.failed"
        status = "Failed" if is_failure else "Succeeded"

        result = await self.create_ticket(
            action=action_label,
            resource_name=data.get("resource_name", ""),
            resource_type=data.get("resource_type", ""),
            resource_group=data.get("resource_group", ""),
            region=data.get("region", ""),
            user_name=data.get("user_id", "unknown"),
            deployment_id=data.get("deployment_id", ""),
            status=status,
            resource_id=data.get("resource_id", ""),
            terraform_path=data.get("terraform_path", ""),
            subscription_id=data.get("subscription_id", ""),
            error_message=data.get("error_message", ""),
        )

        # Update MongoDB with ServiceNow linkage
        try:
            from app.services.mongodb_service import mongodb_service
            mongo_record = {
                "deploymentId": data.get("deployment_id", ""),
                "resourceName": data.get("resource_name", ""),
                "resourceType": data.get("resource_type", ""),
                "deploymentStatus": status,
                "serviceNowEnabled": result.get("enabled", False),
                "serviceNowTicketId": result.get("ticket_id", ""),
                "serviceNowTicketType": result.get("ticket_type", ""),
                "serviceNowSyncStatus": result.get("status", "skipped"),
                "serviceNowErrorMessage": result.get("reason", ""),
                "createdBy": data.get("user_id", "unknown"),
                "createdAt": datetime.now(timezone.utc).isoformat(),
            }
            await mongodb_service.save_servicenow_ticket(mongo_record)
        except Exception as e:
            logger.warning("MongoDB ServiceNow record save skipped: %s", e)


servicenow_service = ServiceNowService()
