"""
Auto Fix Engine
Monitors system health and automatically retries failed operations.
"""

import logging
import asyncio
import json
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from app.core.redis import session_manager
from app.core.config import settings
from app.services.event_bus import event_bus

logger = logging.getLogger(__name__)


class AutoFixEngine:
    """Automatically detects and fixes common system issues with approval gate."""

    def __init__(self):
        self._pending_approvals: List[Dict[str, Any]] = []
        self._background_task: Optional[asyncio.Task] = None

    # ── Persistence ──

    async def _load_approvals(self):
        try:
            redis = session_manager.redis
            if redis:
                data = await redis.get("auto_fix:approvals")
                if data:
                    self._pending_approvals = json.loads(data)
        except Exception as e:
            logger.warning("Failed to load approvals from Redis: %s", e)

    async def _save_approvals(self):
        try:
            redis = session_manager.redis
            if redis:
                await redis.set("auto_fix:approvals", json.dumps(self._pending_approvals))
        except Exception as e:
            logger.warning("Failed to save approvals to Redis: %s", e)

    # ── Health checks ──

    async def check_portal_services(self) -> List[Dict[str, Any]]:
        issues = []
        try:
            from app.core.redis import session_manager as sm
            if not sm.redis:
                await sm.connect()
            await sm.redis.ping()
        except Exception as e:
            issues.append({
                "service": "redis",
                "status": "unhealthy",
                "error": str(e),
                "fix": "restart_redis",
            })
        try:
            import httpx
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get("http://localhost:8000/health")
                if resp.status_code != 200:
                    issues.append({
                        "service": "backend_api",
                        "status": "unhealthy",
                        "error": f"HTTP {resp.status_code}",
                        "fix": "restart_backend",
                    })
        except Exception as e:
            issues.append({
                "service": "backend_api",
                "status": "unhealthy",
                "error": str(e),
                "fix": "restart_backend",
            })
        return issues

    async def check_ai_providers(self) -> List[Dict[str, Any]]:
        issues = []
        # Check Azure OpenAI
        if settings.AZURE_OPENAI_ENDPOINT and settings.AZURE_OPENAI_KEY:
            try:
                import httpx
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(
                        f"{settings.AZURE_OPENAI_ENDPOINT}/openai/deployments/{settings.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version={settings.AZURE_OPENAI_API_VERSION}",
                        headers={"api-key": settings.AZURE_OPENAI_KEY, "Content-Type": "application/json"},
                        json={"messages": [{"role": "user", "content": "ping"}], "max_tokens": 5},
                    )
                    if resp.status_code not in (200, 201):
                        issues.append({
                            "service": "azure_openai",
                            "status": "unhealthy",
                            "error": f"HTTP {resp.status_code}",
                            "fix": "check_azure_openai_config",
                        })
            except Exception as e:
                issues.append({
                    "service": "azure_openai",
                    "status": "unhealthy",
                    "error": str(e),
                    "fix": "check_azure_openai_config",
                })

        # Check HuggingFace
        hf_key = settings.HF_API_KEY
        if not hf_key:
            issues.append({
                "service": "huggingface",
                "status": "not_configured",
                "error": "HF_API_KEY not set",
                "fix": "configure_huggingface",
            })
        else:
            try:
                import httpx
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(
                        f"https://api-inference.huggingface.co/models/{settings.HF_MODEL}",
                        headers={"Authorization": f"Bearer {hf_key}"},
                        json={"inputs": "ping", "parameters": {"max_new_tokens": 5}},
                    )
                    if resp.status_code not in (200, 201):
                        issues.append({
                            "service": "huggingface",
                            "status": "unhealthy",
                            "error": f"HTTP {resp.status_code}",
                            "fix": "check_huggingface_config",
                        })
            except Exception as e:
                issues.append({
                    "service": "huggingface",
                    "status": "unhealthy",
                    "error": str(e),
                    "fix": "check_huggingface_config",
                })

        return issues

    async def check_failed_syncs(self) -> List[Dict[str, Any]]:
        issues = []
        try:
            keys = await session_manager.redis.keys("session:*")
            for key in keys:
                data = await session_manager.redis.get(key)
                if not data:
                    continue
                session = json.loads(data)
                rs = session.get("resource_sync", {})
                if rs.get("status") == "failed":
                    issues.append({
                        "session_key": key,
                        "service": "resource_sync",
                        "status": "failed",
                        "error": rs.get("error", rs.get("message", "Unknown")),
                        "fix": "retry_sync",
                    })
        except Exception as e:
            logger.error("Failed to check sync statuses: %s", e)
        return issues

    async def check_failed_tickets(self) -> List[Dict[str, Any]]:
        issues = []
        try:
            from app.services.mongodb_service import mongodb_service
            if mongodb_service.db is not None:
                failed = await mongodb_service.list_servicenow_tickets(
                    sync_status="failed", limit=20
                )
                for ticket in failed:
                    issues.append({
                        "deployment_id": ticket.get("deployment_id"),
                        "ticket_id": ticket.get("ticket_id"),
                        "service": "servicenow",
                        "status": "failed",
                        "error": ticket.get("error", ticket.get("sync_error", "Unknown")),
                        "fix": "retry_servicenow",
                    })
        except Exception as e:
            logger.error("Failed to check ServiceNow tickets: %s", e)
        return issues

    # ── Auto-fix actions ──

    async def retry_sync(self, session_key: str) -> Dict[str, Any]:
        try:
            from app.services.onboarding_service import onboarding_service
            user_id = session_key.replace("session:", "")
            result = await onboarding_service.start_resource_sync(user_id)
            return {"success": True, "message": f"Sync retry initiated for {user_id}", "result": str(result)}
        except Exception as e:
            logger.error("Auto-fix retry_sync failed: %s", e)
            return {"success": False, "error": str(e)}

    async def retry_servicenow(self, deployment_id: str) -> Dict[str, Any]:
        try:
            from app.services.servicenow_service import servicenow_service
            from app.services.mongodb_service import mongodb_service
            ticket_record = await mongodb_service.find_servicenow_ticket(deployment_id)
            if not ticket_record:
                return {"success": False, "error": f"No ticket record for deployment {deployment_id}"}
            result = await servicenow_service.retry_ticket(ticket_record)
            return {"success": True, "message": f"ServiceNow retry initiated for {deployment_id}", "ticket_id": result.get("ticket_id")}
        except Exception as e:
            logger.error("Auto-fix retry_servicenow failed: %s", e)
            return {"success": False, "error": str(e)}

    async def retry_failed_hf(self) -> Dict[str, Any]:
        try:
            from app.services.settings_service import settings_service
            cfg = await settings_service.get_huggingface_config()
            if cfg and cfg.get("api_key"):
                import httpx
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(
                        f"https://api-inference.huggingface.co/models/{settings.HF_MODEL}",
                        headers={"Authorization": f"Bearer {cfg['api_key']}"},
                        json={"inputs": "ping", "parameters": {"max_new_tokens": 5}},
                    )
                    if resp.status_code == 200:
                        return {"success": True, "message": "HuggingFace reconnected"}
            return {"success": False, "error": "HuggingFace not configured"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # ── Event bus handler ──

    async def on_sync_failed(self, event_type: str, data: Dict[str, Any]):
        logger.info("Auto-fix triggered by event '%s': %s", event_type, data)
        session_key = data.get("session_key")
        if session_key:
            result = await self.retry_sync(session_key)
            logger.info("Auto-fix retry_sync result: %s", result)

    # ── Approval gate ──

    async def request_approval(self, action: str, params: Dict[str, Any], description: str) -> str:
        approval_id = f"fix_{datetime.now(timezone.utc).timestamp()}"
        self._pending_approvals.append({
            "id": approval_id,
            "action": action,
            "params": params,
            "description": description,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        await self._save_approvals()
        return approval_id

    async def approve(self, approval_id: str) -> bool:
        for item in self._pending_approvals:
            if item["id"] == approval_id and item["status"] == "pending":
                item["status"] = "approved"
                await self._save_approvals()
                return True
        return False

    async def reject(self, approval_id: str) -> bool:
        for item in self._pending_approvals:
            if item["id"] == approval_id and item["status"] == "pending":
                item["status"] = "rejected"
                await self._save_approvals()
                return True
        return False

    def get_pending_approvals(self) -> List[Dict[str, Any]]:
        return [a for a in self._pending_approvals if a["status"] == "pending"]

    # ── Scan & fix ──

    async def run_auto_fix(self, services: Optional[List[str]] = None) -> Dict[str, Any]:
        results = {"scanned": [], "fixed": [], "pending_approval": [], "errors": []}

        checks = []
        if not services or "portal" in services:
            checks.append(("portal_services", self.check_portal_services()))
        if not services or "ai" in services:
            checks.append(("ai_providers", self.check_ai_providers()))
        if not services or "sync" in services:
            checks.append(("failed_syncs", self.check_failed_syncs()))
        if not services or "servicenow" in services:
            checks.append(("failed_tickets", self.check_failed_tickets()))

        for name, check_coro in checks:
            try:
                issues = await check_coro
                results["scanned"].append({"service": name, "issues": len(issues)})
                for issue in issues:
                    fix = issue.get("fix")
                    if fix == "retry_sync":
                        r = await self.retry_sync(issue["session_key"])
                        if r.get("success"):
                            results["fixed"].append({"service": name, "fix": fix, "status": "fixed"})
                        else:
                            results["errors"].append({"service": name, "fix": fix, "error": r.get("error")})
                    elif fix == "retry_servicenow":
                        r = await self.retry_servicenow(issue["deployment_id"])
                        if r.get("success"):
                            results["fixed"].append({"service": name, "fix": fix, "status": "fixed"})
                        else:
                            results["errors"].append({"service": name, "fix": fix, "error": r.get("error")})
                    elif fix in ("restart_redis", "restart_backend", "check_azure_openai_config", "check_huggingface_config", "configure_huggingface"):
                        aid = await self.request_approval(fix, issue, issue.get("error", ""))
                        results["pending_approval"].append({"service": name, "fix": fix, "approval_id": aid})
                    else:
                        results["fixed"].append({"service": name, "fix": fix, "status": "identified"})
            except Exception as e:
                results["errors"].append({"service": name, "error": str(e)})

        return results

    # ── Background periodic scan ──

    async def start_background_scanner(self, interval_seconds: int = 300):
        await self._load_approvals()
        event_bus.subscribe("sync.failed", self.on_sync_failed)
        logger.info("Auto-fix background scanner started (interval=%ds)", interval_seconds)

        async def _loop():
            while True:
                try:
                    await asyncio.sleep(interval_seconds)
                    await self.run_auto_fix(services=["sync", "servicenow", "ai"])
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error("Auto-fix scan error: %s", e)

        self._background_task = asyncio.create_task(_loop())

    async def stop_background_scanner(self):
        if self._background_task:
            self._background_task.cancel()
            try:
                await self._background_task
            except asyncio.CancelledError:
                pass
            self._background_task = None


auto_fix_engine = AutoFixEngine()
