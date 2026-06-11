"""
Troubleshoot Agent Service
Analyzes issues and executes remediation via Azure SDK
"""

import logging
import json
import uuid
from typing import Dict, Any, Optional, List
from datetime import datetime

from azure.identity import ClientSecretCredential
from azure.mgmt.compute import ComputeManagementClient
from azure.mgmt.network import NetworkManagementClient
from azure.mgmt.monitor import MonitorManagementClient
from azure.mgmt.resource import ResourceManagementClient

from app.services.agents.base_agent_service import BaseAgentService
from app.services.ai_execution_service import AIExecutionService

logger = logging.getLogger(__name__)


class TroubleshootAgentService(BaseAgentService):
    """Service for analyzing and remediating Azure issues via SDK"""

    REMEDIATION_OPERATIONS = {
        "restart_vm": {"display": "Restart Virtual Machine", "service": "compute"},
        "start_vm": {"display": "Start Virtual Machine", "service": "compute"},
        "stop_vm": {"display": "Stop Virtual Machine", "service": "compute"},
        "check_nsg": {"display": "Check NSG Rules", "service": "network", "advisory": True},
        "check_connectivity": {"display": "Verify Connectivity", "service": "network", "advisory": True},
        "check_health": {"display": "Check Resource Health", "service": "monitor", "advisory": True},
        "get_metrics": {"display": "Get Resource Metrics", "service": "monitor", "advisory": True},
    }

    def __init__(self, redis_client=None, azure_credentials=None):
        super().__init__(redis_client, azure_credentials)
        self.ai_service = AIExecutionService()
        self.active_plans = {}

    async def _get_clients(self, subscription_id: str):
        creds = self.azure_credentials
        if not creds:
            raise ValueError("Azure credentials not available")
        credential = ClientSecretCredential(
            tenant_id=creds.get("tenant_id"),
            client_id=creds.get("client_id"),
            client_secret=creds.get("client_secret"),
        )
        return {
            "compute": ComputeManagementClient(credential, subscription_id),
            "network": NetworkManagementClient(credential, subscription_id),
            "monitor": MonitorManagementClient(credential, subscription_id),
            "resource": ResourceManagementClient(credential, subscription_id),
        }, credential

    async def analyze_issue(
        self,
        issue_title: str,
        issue_resource: str,
        issue_source: str,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        plan_id = f"plan-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}"
        self.active_plans[plan_id] = {"status": "analyzing", "steps": [], "progress": 0}

        try:
            prompt = (
                f"You are an Azure Support Engineer troubleshooting the following issue:\n\n"
                f"Issue: {issue_title}\nResource: {issue_resource}\nSource: {issue_source}\n\n"
                f"Tenant context:\n"
                f"- Total resources: {context.get('total_resources', 'unknown')}\n"
                f"- Has security alerts: {context.get('has_alerts', False)}\n"
                f"- Has advisor recommendations: {context.get('has_advisor', False)}\n"
                f"- Has compliance data: {context.get('has_compliance', False)}\n\n"
                f"Generate a numbered remediation action plan. Each step must be ONE of:\n"
                f"- restart_vm (if VM is unresponsive)\n"
                f"- start_vm (if VM is stopped)\n"
                f"- stop_vm (if VM needs to be stopped for maintenance)\n"
                f"- check_nsg (if network connectivity is involved)\n"
                f"- check_connectivity (if connectivity needs verification)\n"
                f"- check_health (to verify resource health)\n"
                f"- get_metrics (to analyze performance metrics)\n"
                f"- advisory (for analysis-only steps that don't need Azure SDK)\n\n"
                f"Format your response as:\n"
                f"PLAN_STEP|operation_type|description|resource_name\n"
                f"For advisory steps use: PLAN_STEP|advisory|description|-\n"
                f"End with: PLAN_END\n\n"
                f"Example for a VM connectivity issue:\n"
                f"PLAN_STEP|check_connectivity|Verify VM network connectivity|myVM\n"
                f"PLAN_STEP|check_nsg|Review NSG rules for blocked traffic|myVM-nsg\n"
                f"PLAN_STEP|restart_vm|Restart VM to clear temporary state|myVM\n"
                f"PLAN_STEP|check_health|Verify VM health after restart|myVM\n"
                f"PLAN_END\n\n"
                f"Always end with PLAN_END. Do NOT include any text after PLAN_END."
            )

            response = await self.ai_service.execute_chat(
                prompt=prompt,
                system_message="You are an Azure Support Engineer generating structured remediation plans.",
                agent_type="troubleshoot",
            )

            raw_text = response.get("full_response", "") if isinstance(response, dict) else str(response)
            steps = self._parse_plan(raw_text, issue_resource)

            if not steps:
                steps = [{"step_id": 1, "operation": "advisory", "description": f"Analyze {issue_title}", "resource": issue_resource}]

            plan = {
                "plan_id": plan_id,
                "issue_title": issue_title,
                "issue_resource": issue_resource,
                "issue_source": issue_source,
                "status": "awaiting_approval",
                "steps": steps,
                "created_at": datetime.utcnow().isoformat(),
                "progress": 0,
            }

            await self.save_deployment_state(plan_id, plan)
            self.active_plans[plan_id] = {"status": "awaiting_approval", "steps": steps, "progress": 0}
            return plan

        except Exception as e:
            logger.error(f"Failed to analyze issue: {str(e)}")
            fallback_steps = [
                {"step_id": 1, "operation": "advisory", "description": f"Diagnose {issue_resource} — check recent logs and metrics", "resource": issue_resource},
                {"step_id": 2, "operation": "advisory", "description": "Review Azure Advisor recommendations for the resource", "resource": issue_resource},
                {"step_id": 3, "operation": "advisory", "description": "Verify resource configuration against best practices", "resource": issue_resource},
            ]
            plan = {
                "plan_id": plan_id,
                "issue_title": issue_title,
                "issue_resource": issue_resource,
                "issue_source": issue_source,
                "status": "awaiting_approval",
                "steps": fallback_steps,
                "created_at": datetime.utcnow().isoformat(),
                "progress": 0,
            }
            await self.save_deployment_state(plan_id, plan)
            self.active_plans[plan_id] = {"status": "awaiting_approval", "steps": fallback_steps, "progress": 0}
            return plan

    def _parse_plan(self, raw_text: str, default_resource: str) -> List[Dict[str, Any]]:
        steps = []
        step_id = 1
        for line in raw_text.strip().split("\n"):
            line = line.strip()
            if line.startswith("PLAN_STEP|"):
                parts = line.split("|")
                if len(parts) >= 3:
                    operation = parts[1].strip().lower()
                    description = parts[2].strip()
                    resource = parts[3].strip() if len(parts) >= 4 and parts[3].strip() else default_resource
                    if operation in self.REMEDIATION_OPERATIONS or operation == "advisory":
                        steps.append({
                            "step_id": step_id,
                            "operation": operation,
                            "description": description,
                            "resource": resource,
                            "status": "pending",
                        })
                        step_id += 1
        return steps

    async def execute_step(
        self,
        plan_id: str,
        step: Dict[str, Any],
        subscription_id: str,
    ) -> Dict[str, Any]:
        operation = step.get("operation", "advisory")
        resource = step.get("resource", "")
        description = step.get("description", "")

        if operation == "advisory" or self.REMEDIATION_OPERATIONS.get(operation, {}).get("advisory", False):
            return {"step_id": step["step_id"], "status": "completed", "result": f"Advisory step: {description}", "advisory": True}

        try:
            clients, _ = await self._get_clients(subscription_id)
            result = await self._execute_azure_operation(operation, resource, clients)
            return {"step_id": step["step_id"], "status": "completed" if result.get("success") else "failed", "result": result.get("message", ""), "advisory": False}
        except Exception as e:
            logger.error(f"Step {step['step_id']} execution failed: {str(e)}")
            return {"step_id": step["step_id"], "status": "failed", "result": str(e), "advisory": False}

    async def _execute_azure_operation(self, operation: str, resource: str, clients: Dict) -> Dict[str, Any]:
        resource_parts = resource.split("/")
        vm_name = resource_parts[-1] if len(resource_parts) > 1 else resource
        rg_name = resource_parts[-3] if len(resource_parts) > 2 else resource_parts[-2] if len(resource_parts) > 1 else resource

        if operation == "restart_vm":
            try:
                async_op = clients["compute"].virtual_machines.begin_restart(rg_name, vm_name)
                async_op.result()
                return {"success": True, "message": f"VM {vm_name} restarted successfully"}
            except Exception as e:
                return {"success": False, "message": f"Failed to restart VM {vm_name}: {str(e)}"}

        if operation == "start_vm":
            try:
                async_op = clients["compute"].virtual_machines.begin_start(rg_name, vm_name)
                async_op.result()
                return {"success": True, "message": f"VM {vm_name} started successfully"}
            except Exception as e:
                return {"success": False, "message": f"Failed to start VM {vm_name}: {str(e)}"}

        if operation == "stop_vm":
            try:
                async_op = clients["compute"].virtual_machines.begin_power_off(rg_name, vm_name)
                async_op.result()
                return {"success": True, "message": f"VM {vm_name} stopped successfully"}
            except Exception as e:
                return {"success": False, "message": f"Failed to stop VM {vm_name}: {str(e)}"}

        return {"success": False, "message": f"Unknown operation: {operation}"}

    async def execute_plan(
        self,
        plan_id: str,
        subscription_id: str,
    ) -> Dict[str, Any]:
        plan = await self.get_deployment_state(plan_id)
        if not plan:
            plan = self.active_plans.get(plan_id)
        if not plan:
            return {"plan_id": plan_id, "status": "not_found", "error": "Plan not found"}

        plan["status"] = "executing"
        plan["progress"] = 0
        await self.save_deployment_state(plan_id, plan)
        self.active_plans[plan_id] = plan

        steps = plan.get("steps", [])
        total = len(steps)
        results = []

        for i, step in enumerate(steps):
            step["status"] = "in_progress"
            result = await self.execute_step(plan_id, step, subscription_id)
            step["status"] = result.get("status", "failed")
            step["result"] = result.get("result", "")
            results.append(result)
            plan["progress"] = round(((i + 1) / total) * 100)
            await self.save_deployment_state(plan_id, plan)
            self.active_plans[plan_id] = plan

        all_success = all(r.get("status") == "completed" for r in results)
        plan["status"] = "completed" if all_success else "completed_with_errors"
        plan["results"] = results
        plan["progress"] = 100
        await self.save_deployment_state(plan_id, plan)
        self.active_plans[plan_id] = plan

        return plan

    async def get_plan_status(self, plan_id: str) -> Optional[Dict[str, Any]]:
        plan = await self.get_deployment_state(plan_id)
        if plan:
            return plan
        return self.active_plans.get(plan_id)
