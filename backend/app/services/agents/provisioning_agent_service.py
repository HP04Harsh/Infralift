"""
Provisioning Agent Service
Terraform-first: generate HCL, validate, plan, approve, apply, store, notify
"""

import logging
import os
import json
import re as _re
from typing import Dict, Any, Optional, AsyncGenerator, List, Tuple
from datetime import datetime, timezone
from app.services.agents.base_agent_service import BaseAgentService
from app.services.terraform_service import terraform_service
from app.services.terraform_validator_service import terraform_validator
from app.services.resource_state_service import resource_state_service
from app.services.audit_service import audit_service
from app.services.event_bus import event_bus

logger = logging.getLogger(__name__)


class ProvisioningAgentService(BaseAgentService):
    """Terraform-first provisioning with full lifecycle: collect, generate, validate, plan, approve, apply, store, notify"""

    def __init__(self):
        from app.core.redis import session_manager
        self._session_manager = session_manager
        super().__init__()
        self._services_wired = False

    def _wire_redis_services(self):
        if self._services_wired:
            return
        redis_client = self._session_manager.redis
        if not redis_client:
            return
        self.redis_client = redis_client
        terraform_service.redis_client = redis_client
        resource_state_service.redis_client = redis_client
        audit_service.redis_client = redis_client
        self._services_wired = True

    async def get_credentials(self, user_id: str) -> Tuple[Any, str, str]:
        """Load Azure credentials from Redis session"""
        redis = await self._session_manager.redis
        session_key = f"session:{user_id}"
        session_data = await redis.get(session_key) if redis else None
        session = json.loads(session_data) if session_data else {}

        tenant_id = session.get("tenant_id", "")
        client_id = session.get("client_id", "")
        client_secret = session.get("client_secret", "")
        subscription_id = session.get("subscription_id", "")

        credentials = None
        if tenant_id and client_id and client_secret:
            from azure.identity import ClientSecretCredential
            credentials = ClientSecretCredential(
                tenant_id=tenant_id, client_id=client_id, client_secret=client_secret
            )

        return credentials, subscription_id, session.get("user_id", user_id)

    async def execute_plan(
        self,
        plan: Dict[str, Any],
        credentials: Any,
        subscription_id: str,
        user_id: str,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Full Terraform-first provisioning flow:
        1. Generate Terraform HCL via AI templates
        2. Store under REQ-{requestId}
        3. Validate (tflint + trivy)
        4. terraform init + plan
        5. Yield deployment card (resources, region, cost, security)
        6. Wait for approval (resumed via continue_deployment)
        7. terraform apply
        8. Store all artifacts (plan, logs, tfstate)
        9. ServiceNow (if configured)
        """
        request_id = plan.get("deploymentId", self.generate_request_id())
        plan["requestId"] = request_id
        resource_name = plan.get("resourceName", "resource")
        req_path = terraform_service.get_storage_path(request_id)

        # Phase 1: Generate Terraform
        yield {"type": "activity", "icon": "FileText", "title": "Generating Terraform configuration", "status": "in_progress", "phase": "generate"}
        try:
            tf_resources = self._generate_tf_resources(plan)
            variables = self._generate_variables(plan)
            outputs = self._generate_outputs(plan)
            tfvars = self._generate_tfvars(plan)

            files = {
                "main.tf": terraform_service.generate_main_tf({**plan, "resources": tf_resources, "requestId": request_id}),
                "variables.tf": terraform_service.generate_variables_tf(variables),
                "outputs.tf": terraform_service.generate_outputs_tf(outputs),
                "terraform.tfvars": terraform_service.generate_tfvars(tfvars),
            }
            self._wire_redis_services()
            saved = await terraform_service.save_artifacts(plan, files)
            yield {"type": "activity", "icon": "FileText", "title": f"Terraform files saved to REQ-{request_id}", "status": "completed", "phase": "generate", "data": {"path": req_path, "files": list(files.keys())}}
        except Exception as e:
            logger.error("Terraform generation failed: %s", e)
            yield {"type": "activity", "icon": "AlertTriangle", "title": f"Terraform generation failed: {e}", "status": "error", "phase": "generate"}
            return

        # Phase 2: Validate Terraform (tflint + trivy)
        yield {"type": "activity", "icon": "Shield", "title": "Validating Terraform (tflint)", "status": "in_progress", "phase": "validate"}
        work_dir = terraform_service.get_work_dir(request_id)
        validation = await terraform_validator.validate(work_dir)
        tflint_ok = validation["tflint"]["passed"]
        trivy_ok = validation["trivy"]["passed"]

        tflint_issues = validation["tflint"]["issues"]
        trivy_issues = validation["trivy"]["issues"]

        if tflint_ok:
            yield {"type": "activity", "icon": "CheckCircle", "title": "tflint passed", "status": "completed", "phase": "validate"}
        else:
            yield {"type": "activity", "icon": "AlertTriangle", "title": f"tflint: {len(tflint_issues)} issues", "status": "warning", "phase": "validate", "data": {"issues": tflint_issues}}

        if trivy_ok:
            yield {"type": "activity", "icon": "CheckCircle", "title": "trivy security scan passed", "status": "completed", "phase": "validate"}
        else:
            yield {"type": "activity", "icon": "AlertTriangle", "title": f"trivy: {len(trivy_issues)} security issues", "status": "warning", "phase": "validate", "data": {"issues": trivy_issues}}

        if not validation["passed"] and not (tflint_ok and trivy_ok):
            yield {"type": "activity", "icon": "XCircle", "title": "Validation failed – review issues and retry", "status": "error", "phase": "validate", "data": validation}
            return

        # Phase 3a: Pre-flight connectivity check
        yield {"type": "activity", "icon": "Zap", "title": "Running pre-flight connectivity check", "status": "in_progress", "phase": "preflight"}
        preflight = await terraform_service.preflight_check()
        if preflight["passed"]:
            yield {"type": "activity", "icon": "CheckCircle", "title": "Pre-flight checks passed", "status": "completed", "phase": "preflight"}
        else:
            failed_check = next((c for c in preflight["checks"] if not c["passed"]), {})
            error_msg = failed_check.get("error", "Pre-flight check failed")
            yield {"type": "activity", "icon": "AlertTriangle", "title": error_msg, "status": "error", "phase": "preflight", "data": preflight}
            return

        # Phase 3b: Terraform init (with retry + error classification)
        yield {"type": "activity", "icon": "Zap", "title": "Running terraform init", "status": "in_progress", "phase": "plan"}
        init_result = await terraform_service.terraform_init(work_dir)
        if init_result["success"]:
            yield {"type": "activity", "icon": "CheckCircle", "title": "terraform init completed", "status": "completed", "phase": "plan"}
        else:
            classified_error = init_result.get("classified_error") or init_result.get("error", "terraform init failed")
            yield {"type": "activity", "icon": "AlertTriangle", "title": classified_error, "status": "error", "phase": "plan", "data": init_result}
            return

        yield {"type": "activity", "icon": "Layers", "title": "Running terraform plan", "status": "in_progress", "phase": "plan"}
        plan_result = await terraform_service.terraform_plan(work_dir)
        if plan_result["success"]:
            yield {"type": "activity", "icon": "CheckCircle", "title": "terraform plan completed", "status": "completed", "phase": "plan"}
        else:
            yield {"type": "activity", "icon": "AlertTriangle", "title": "terraform plan failed", "status": "error", "phase": "plan", "data": plan_result}
            return

        # Read plan output for summary
        plan_output = plan_result.get("output", "")
        plan_summary = self._extract_plan_summary(plan_output)

        # Phase 4: Deployment card
        cost_estimate = self._estimate_cost(plan)
        security_recs = self._generate_security_recs(plan)

        resources = self._list_planned_resources_from_tf(tf_resources)

        card = {
            "request_id": request_id,
            "resource_name": resource_name,
            "resource_type": plan.get("resourceType", ""),
            "region": plan.get("region", ""),
            "resource_group": plan.get("resourceGroup", "rg-default"),
            "resources": resources,
            "plan_summary": plan_summary,
            "cost_estimate": cost_estimate,
            "security_recommendations": security_recs,
            "terraform_path": req_path,
            "validation": {"tflint": {"passed": tflint_ok, "issues": tflint_issues}, "trivy": {"passed": trivy_ok, "issues": trivy_issues}},
            "plan_output": plan_output[:2000] if len(plan_output) > 2000 else plan_output,
            "phase": "approval",
        }

        yield {
            "type": "deployment_card",
            "phase": "approval",
            "title": "Deployment Ready for Approval",
            "data": card,
        }

        yield {
            "type": "status",
            "phase": "approval",
            "message": "Review the plan above. Reply 'yes' to proceed with terraform apply, or 'no' to cancel.",
        }

        # Store card in Redis for approval flow
        self._wire_redis_services()
        if self.redis_client:
            await self.redis_client.setex(
                f"deployment:pending:{request_id}", 3600,
                json.dumps({
                    "plan": {k: v for k, v in plan.items() if k != "adminPassword"},
                    "card": card,
                    "credentials": "stored_in_session",
                    "subscription_id": subscription_id,
                    "user_id": user_id,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                })
            )

    async def continue_deployment(
        self, request_id: str, approved: bool
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Continue a paused deployment after user approval"""
        self._wire_redis_services()
        if not self.redis_client:
            yield {"type": "error", "message": "Redis unavailable"}
            return

        key = f"deployment:pending:{request_id}"
        data = await self.redis_client.get(key)
        if not data:
            yield {"type": "error", "message": f"No pending deployment found for {request_id}"}
            return

        pending = json.loads(data)
        if not approved:
            await self.redis_client.delete(key)
            yield {"type": "status", "phase": "cancelled", "message": "Deployment cancelled by user"}
            return

        plan = pending["plan"]
        user_id = pending["user_id"]
        subscription_id = pending["subscription_id"]
        request_id = plan.get("requestId", request_id)
        resource_name = plan.get("resourceName", "resource")
        work_dir = terraform_service.get_work_dir(request_id)

        credentials, _, _ = await self.get_credentials(user_id)

        # Phase 5: terraform apply
        yield {"type": "activity", "icon": "Cloud", "title": "Running terraform apply", "status": "in_progress", "phase": "apply"}
        apply_result = await terraform_service.terraform_apply(work_dir)
        if apply_result["success"]:
            yield {"type": "activity", "icon": "CheckCircle", "title": "terraform apply completed", "status": "completed", "phase": "apply"}
        else:
            yield {"type": "activity", "icon": "AlertTriangle", "title": "terraform apply failed", "status": "error", "phase": "apply", "data": apply_result}
            await self._fail_deployment(request_id, plan, user_id, subscription_id, apply_result.get("error", ""))
            return

        # Phase 6: Store all artifacts
        yield {"type": "activity", "icon": "Database", "title": "Storing deployment artifacts", "status": "in_progress", "phase": "store"}
        artifacts = await self._store_artifacts(request_id, work_dir, plan, apply_result)
        yield {"type": "activity", "icon": "Database", "title": "Deployment artifacts stored", "status": "completed", "phase": "store"}

        # Phase 7: Save resource state
        yield {"type": "activity", "icon": "Database", "title": "Saving resource state", "status": "in_progress", "phase": "store"}
        resource_record = {
            "resourceId": f"{subscription_id}/{plan.get('resourceGroup', 'rg-default')}/{resource_name}",
            "resourceType": plan.get("resourceType", "unknown"),
            "resourceName": resource_name,
            "subscriptionId": subscription_id,
            "resourceGroup": plan.get("resourceGroup", "rg-default"),
            "deploymentId": request_id,
            "region": plan.get("region", ""),
            "terraformLocation": f"REQ-{request_id}/",
            "tags": plan.get("tags", {}),
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "deploymentStatus": "Succeeded",
        }
        try:
            await resource_state_service.save_resource(resource_record)
            yield {"type": "activity", "icon": "Database", "title": "Redis state saved", "status": "completed", "phase": "store"}
        except Exception as e:
            logger.error("Redis state save failed: %s", e)

        try:
            from app.services.mongodb_service import mongodb_service
            await mongodb_service.save_deployment({
                **resource_record,
                "createdBy": user_id,
                "applyOutput": apply_result.get("output", "")[:2000],
            })
            yield {"type": "activity", "icon": "Database", "title": "MongoDB state saved", "status": "completed", "phase": "store"}
        except Exception as e:
            logger.warning("MongoDB save skipped: %s", e)

        # Phase 8: Audit trail
        yield {"type": "activity", "icon": "ClipboardList", "title": "Recording audit trail", "status": "in_progress", "phase": "audit"}
        try:
            await audit_service.record_action({
                "user": user_id,
                "agentType": "provisioning",
                "prompt": plan.get("originalPrompt", ""),
                "aiPlan": plan.get("summary", ""),
                "resourcesModified": [resource_record.get("resourceId")],
                "terraformFiles": artifacts.get("files", {}),
                "deploymentId": request_id,
                "deploymentStatus": "completed",
            })
            yield {"type": "activity", "icon": "ClipboardList", "title": "Audit trail recorded", "status": "completed", "phase": "audit"}
        except Exception as e:
            logger.error("Audit failed: %s", e)

        # Phase 9: ServiceNow
        yield {"type": "activity", "icon": "ClipboardList", "title": "ServiceNow ticket", "status": "in_progress", "phase": "servicenow"}
        try:
            from app.services.servicenow_service import servicenow_service
            sn_config = await servicenow_service.get_config()
            sn_configured = bool(sn_config and sn_config.get("instance_url") and sn_config.get("username") and sn_config.get("password"))
            if sn_configured:
                ticket = await servicenow_service.create_ticket(
                    deployment_id=request_id,
                    resource_name=resource_name,
                    resource_type=plan.get("resourceType", "unknown"),
                    resource_group=plan.get("resourceGroup", "rg-default"),
                    region=plan.get("region", ""),
                    user_id=user_id,
                    action_label=plan.get("summary", f"Deploy {resource_name}"),
                    status="completed",
                    details=apply_result.get("output", "")[:1000],
                )
                if ticket.get("ticket_id"):
                    yield {"type": "activity", "icon": "CheckCircle", "title": f"ServiceNow ticket {ticket['ticket_id']} created", "status": "completed", "phase": "servicenow"}
                else:
                    yield {"type": "activity", "icon": "AlertTriangle", "title": "ServiceNow ticket skipped", "status": "warning", "phase": "servicenow"}
            else:
                yield {"type": "activity", "icon": "AlertTriangle", "title": "ServiceNow not configured – deploy completed without ticket", "status": "completed", "phase": "servicenow"}
        except Exception as e:
            logger.warning("ServiceNow ticket creation failed: %s", e)
            yield {"type": "activity", "icon": "AlertTriangle", "title": f"ServiceNow ticket failed: {e}", "status": "warning", "phase": "servicenow"}

        await self.redis_client.delete(key)

        # Phase 10: Result
        yield {
            "type": "result",
            "deployment_id": request_id,
            "resource_name": resource_name,
            "resource_group": plan.get("resourceGroup"),
            "region": plan.get("region"),
            "terraform_path": f"REQ-{request_id}/",
            "artifacts": artifacts,
            "status": "completed",
            "message": f"Deployment completed successfully. Resource {resource_name} created in {plan.get('region')} via Terraform.",
        }

        await event_bus.publish("deployment.completed", {
            "deployment_id": request_id,
            "resource_name": resource_name,
            "resource_type": plan.get("resourceType", "unknown"),
            "resource_group": plan.get("resourceGroup", "rg-default"),
            "region": plan.get("region", ""),
            "user_id": user_id,
            "subscription_id": subscription_id,
            "terraform_path": f"REQ-{request_id}/",
            "action_label": plan.get("summary", f"Deploy {resource_name}"),
        })

    async def execute_modification(
        self,
        request: Dict[str, Any],
        credentials: Any,
        subscription_id: str,
        user_id: str,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Resource modification flow:
        1. Find existing Terraform for resource
        2. Generate updated Terraform
        3. Save new version
        4. Validate (tflint + trivy)
        5. terraform init + plan
        6. Approval
        7. terraform apply
        """
        resource_name = request.get("resourceName", "")
        resource_type = request.get("resourceType", "")
        resource_group = request.get("resourceGroup", "")
        changes = request.get("changes", {})

        # Find existing deployment
        existing = await self._find_existing_deployment(resource_name, resource_group)
        if not existing:
            yield {"type": "error", "message": f"No existing Terraform found for {resource_name} in {resource_group}"}
            return

        request_id = existing.get("deploymentId", self.generate_request_id())
        old_plan = existing.get("plan", {})

        yield {"type": "activity", "icon": "Search", "title": f"Found existing Terraform for {resource_name}", "status": "completed", "phase": "find"}

        # Merge changes into plan
        updated_plan = {**old_plan, **changes}
        updated_plan["requestId"] = request_id
        updated_plan["deploymentId"] = request_id
        updated_plan["resourceName"] = resource_name
        updated_plan["resourceType"] = resource_type
        updated_plan["resourceGroup"] = resource_group

        # Generate updated Terraform
        yield {"type": "activity", "icon": "FileText", "title": "Generating updated Terraform configuration", "status": "in_progress", "phase": "generate"}
        try:
            tf_resources = self._generate_tf_resources(updated_plan)
            variables = self._generate_variables(updated_plan)
            outputs = self._generate_outputs(updated_plan)
            tfvars = self._generate_tfvars(updated_plan)

            files = {
                "main.tf": terraform_service.generate_main_tf({**updated_plan, "resources": tf_resources, "requestId": request_id}),
                "variables.tf": terraform_service.generate_variables_tf(variables),
                "outputs.tf": terraform_service.generate_outputs_tf(outputs),
                "terraform.tfvars": terraform_service.generate_tfvars(tfvars),
            }
            self._wire_redis_services()
            await terraform_service.save_artifacts(updated_plan, files)
            yield {"type": "activity", "icon": "FileText", "title": f"Updated Terraform saved to REQ-{request_id}", "status": "completed", "phase": "generate"}
        except Exception as e:
            yield {"type": "activity", "icon": "AlertTriangle", "title": f"Terraform update failed: {e}", "status": "error", "phase": "generate"}
            return

        # Validate
        yield {"type": "activity", "icon": "Shield", "title": "Validating updated Terraform", "status": "in_progress", "phase": "validate"}
        work_dir = terraform_service.get_work_dir(request_id)
        validation = await terraform_validator.validate(work_dir)
        if not validation["passed"]:
            yield {"type": "activity", "icon": "AlertTriangle", "title": "Validation issues found", "status": "warning", "phase": "validate", "data": validation}

        # Plan
        yield {"type": "activity", "icon": "Zap", "title": "Running terraform init", "status": "in_progress", "phase": "plan"}
        await terraform_service.terraform_init(work_dir)

        yield {"type": "activity", "icon": "Layers", "title": "Running terraform plan", "status": "in_progress", "phase": "plan"}
        plan_result = await terraform_service.terraform_plan(work_dir)
        if not plan_result["success"]:
            yield {"type": "activity", "icon": "AlertTriangle", "title": "terraform plan failed", "status": "error", "phase": "plan", "data": plan_result}
            return

        yield {"type": "activity", "icon": "CheckCircle", "title": "terraform plan completed", "status": "completed", "phase": "plan"}

        card = {
            "request_id": request_id,
            "resource_name": resource_name,
            "resource_type": resource_type,
            "region": updated_plan.get("region", ""),
            "resource_group": resource_group,
            "changes": changes,
            "plan_summary": self._extract_plan_summary(plan_result.get("output", "")),
            "cost_estimate": self._estimate_cost(updated_plan),
            "security_recommendations": self._generate_security_recs(updated_plan),
            "terraform_path": f"REQ-{request_id}/",
            "phase": "approval",
        }

        yield {
            "type": "deployment_card",
            "phase": "approval",
            "title": "Modification Ready for Approval",
            "data": card,
        }

        yield {
            "type": "status",
            "phase": "approval",
            "message": "Review the modification plan above. Reply 'yes' to apply or 'no' to cancel.",
        }

        self._wire_redis_services()
        if self.redis_client:
            await self.redis_client.setex(
                f"deployment:pending:{request_id}", 3600,
                json.dumps({
                    "plan": updated_plan,
                    "card": card,
                    "credentials": "stored_in_session",
                    "subscription_id": subscription_id,
                    "user_id": user_id,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                })
            )

    async def _find_existing_deployment(self, resource_name: str, resource_group: str) -> Optional[Dict[str, Any]]:
        """Search Redis for existing deployment by resource name and group"""
        self._wire_redis_services()
        if not self.redis_client:
            return None
        try:
            resources = await resource_state_service.find_resources("resourceName", resource_name)
            for r in resources:
                if r.get("resourceGroup", "").lower() == resource_group.lower():
                    dep_id = r.get("deploymentId", "")
                    if dep_id:
                        tf_data = await self.redis_client.get(f"terraform:{dep_id}")
                        if tf_data:
                            parsed = json.loads(tf_data)
                            return {"deploymentId": dep_id, "plan": parsed.get("plan", {}), "resource": r}
            return None
        except Exception as e:
            logger.error("Error finding deployment: %s", e)
            return None

    async def _store_artifacts(self, request_id: str, work_dir: str, plan: Dict[str, Any], apply_result: Dict[str, Any]) -> Dict[str, Any]:
        """Store Terraform plan, logs, and metadata"""
        artifacts = {"files": {}, "plan_content": "", "logs": ""}
        try:
            plan_content = await terraform_service.terraform_show(work_dir)
            artifacts["plan_content"] = plan_content
            artifacts["logs"] = apply_result.get("output", "")

            plan_file_path = os.path.join(work_dir, "tfplan")
            if os.path.exists(plan_file_path):
                import base64
                with open(plan_file_path, "rb") as f:
                    artifacts["plan_binary"] = base64.b64encode(f.read()).decode()

            conn_str = os.getenv("STORAGE_CONNECTION_STRING", "")
            if conn_str:
                from azure.storage.blob import BlobServiceClient
                container = os.getenv("STORAGE_CONTAINER_NAME", "terraform-artifacts")
                blob_service = BlobServiceClient.from_connection_string(conn_str)
                container_client = blob_service.get_container_client(container)
                storage_path = terraform_service.get_storage_path(request_id)

                log_blob = container_client.get_blob_client(f"{storage_path}apply.log")
                log_blob.upload_blob(apply_result.get("output", "No output"), overwrite=True)
                artifacts["files"]["apply.log"] = f"https://{blob_service.account_name}.blob.core.windows.net/{container}/{storage_path}apply.log"

                if plan_content:
                    plan_txt = container_client.get_blob_client(f"{storage_path}plan.txt")
                    plan_txt.upload_blob(plan_content, overwrite=True)
                    artifacts["files"]["plan.txt"] = f"https://{blob_service.account_name}.blob.core.windows.net/{container}/{storage_path}plan.txt"

                if artifacts.get("plan_binary"):
                    plan_bin = container_client.get_blob_client(f"{storage_path}tfplan")
                    plan_bin.upload_blob(artifacts["plan_binary"], overwrite=True)
                    artifacts["files"]["tfplan"] = f"https://{blob_service.account_name}.blob.core.windows.net/{container}/{storage_path}tfplan"
        except Exception as e:
            logger.warning("Artifact storage failed: %s", e)

        if self.redis_client:
            await self.redis_client.setex(
                f"terraform:{request_id}", 86400 * 30,
                json.dumps({
                    "requestId": request_id,
                    "files": artifacts["files"],
                    "savedAt": datetime.now(timezone.utc).isoformat(),
                    "status": "applied",
                })
            )
        return artifacts

    async def _fail_deployment(self, request_id: str, plan: Dict[str, Any], user_id: str, subscription_id: str, error_message: str):
        """Record failed deployment"""
        await event_bus.publish("deployment.failed", {
            "deployment_id": request_id,
            "resource_name": plan.get("resourceName", "unknown"),
            "resource_type": plan.get("resourceType", "unknown"),
            "resource_group": plan.get("resourceGroup", "rg-default"),
            "region": plan.get("region", ""),
            "user_id": user_id,
            "subscription_id": subscription_id,
            "action_label": plan.get("summary", "Deployment"),
            "error_message": error_message,
        })

    def _extract_plan_summary(self, plan_output: str) -> str:
        """Extract the resource change summary from terraform plan output"""
        lines = plan_output.split("\n")
        summary_lines = []
        capture = False
        for line in lines:
            if "Terraform will perform the following actions" in line:
                capture = True
            if capture:
                summary_lines.append(line)
                if len(summary_lines) > 40:
                    break
        result = "\n".join(summary_lines) if summary_lines else plan_output[:1000]
        return result.strip()

    def _estimate_cost(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        """Generate cost estimate based on resource type"""
        rt = plan.get("resourceType", "").lower()
        region = plan.get("region", "eastus")
        estimates = {"currency": "USD", "monthly": 0, "hourly": 0, "details": []}

        if rt in ("virtualmachine", "vm"):
            size = plan.get("size", "Standard_B2s")
            estimates["details"] = [
                {"item": f"VM ({size})", "monthly": 70, "hourly": 0.096},
                {"item": "Managed OS Disk (128GB)", "monthly": 5, "hourly": 0.007},
                {"item": "Public IP", "monthly": 3, "hourly": 0.004},
            ]
        elif rt in ("storageaccount", "storage"):
            sku = plan.get("sku", "Standard_GRS")
            estimates["details"] = [
                {"item": f"Storage Account ({sku})", "monthly": 25, "hourly": 0.034},
            ]
        elif rt == "resourcegroup":
            estimates["details"] = [
                {"item": "Resource Group", "monthly": 0, "hourly": 0},
            ]
        else:
            estimates["details"] = [
                {"item": f"{plan.get('resourceType', 'Resource')} in {region}", "monthly": 50, "hourly": 0.068},
            ]

        for d in estimates["details"]:
            estimates["monthly"] += d["monthly"]
            estimates["hourly"] += d["hourly"]
        return estimates

    def _generate_security_recs(self, plan: Dict[str, Any]) -> List[Dict[str, str]]:
        """Generate security recommendations based on resource type"""
        rt = plan.get("resourceType", "").lower()
        recs = []
        if rt in ("virtualmachine", "vm"):
            recs.append({"title": "Enable Azure Defender for Servers", "priority": "high"})
            recs.append({"title": "Restrict inbound NSG rules to minimum required ports", "priority": "high"})
            recs.append({"title": "Enable boot diagnostics with managed storage", "priority": "medium"})
            recs.append({"title": "Use managed identities instead of service principals", "priority": "medium"})
        elif rt in ("storageaccount", "storage"):
            recs.append({"title": "Enable Azure Defender for Storage", "priority": "high"})
            recs.append({"title": "Restrict network access using firewall and service endpoints", "priority": "high"})
            recs.append({"title": "Enable soft delete for blobs", "priority": "medium"})
        elif rt == "resourcegroup":
            recs.append({"title": "Apply Azure Policy for resource tagging", "priority": "medium"})
        else:
            recs.append({"title": "Review Azure Security Center recommendations post-deployment", "priority": "medium"})
        return recs

    def _list_planned_resources_from_tf(self, tf_resources: str) -> List[Dict[str, str]]:
        """Parse Terraform HCL to extract resource type/name pairs"""
        resources = []
        for match in _re.finditer(r'resource\s+"([^"]+)"\s+"([^"]+)"', tf_resources):
            resources.append({"type": match.group(1), "name": match.group(2)})
        return resources

    def _generate_tf_resources(self, plan: Dict[str, Any]) -> str:
        rt = plan.get("resourceType", "").lower()
        rg = plan.get("resourceGroup", "rg-default")
        loc = plan.get("region", "eastus")
        name = plan.get("resourceName", "resource")

        if rt in ("virtualmachine", "vm"):
            size = plan.get("size", "Standard_B2s")
            admin_user = plan.get("adminUsername", "azureuser")
            admin_pass = plan.get("adminPassword", "")
            os_type = plan.get("osType", "linux").lower()
            image_publisher = "Canonical" if os_type == "linux" else "MicrosoftWindowsServer"
            image_offer = "ubuntu-24_04-lts" if os_type == "linux" else "WindowsServer"
            image_sku = "server" if os_type == "linux" else "2022-Datacenter"
            source = f"""resource "azurerm_resource_group" "main" {{
  name     = "{rg}"
  location = "{loc}"
}}

resource "azurerm_virtual_network" "main" {{
  name                = "{name}-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = "{loc}"
  resource_group_name = azurerm_resource_group.main.name
}}

resource "azurerm_subnet" "main" {{
  name                 = "{name}-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}}

resource "azurerm_public_ip" "main" {{
  name                = "{name}-pip"
  location            = "{loc}"
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
  sku                 = "Standard"
}}

resource "azurerm_network_interface" "main" {{
  name                = "{name}-nic"
  location            = "{loc}"
  resource_group_name = azurerm_resource_group.main.name
  ip_configuration {{
    name                          = "internal"
    subnet_id                     = azurerm_subnet.main.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.main.id
  }}
}}"""
            linux_auth = (f'admin_password = "{admin_pass}"\n  disable_password_authentication = false') if admin_pass else "  disable_password_authentication = true"
            windows_auth = f'admin_password = "{admin_pass}"' if admin_pass else "  admin_password = random_password.password.result"
            if os_type == "linux":
                source += f"""
resource "azurerm_linux_virtual_machine" "main" {{
  name                  = "{name}"
  resource_group_name   = azurerm_resource_group.main.name
  location              = "{loc}"
  size                  = "{size}"
  admin_username        = "{admin_user}"
  network_interface_ids = [azurerm_network_interface.main.id]
  {linux_auth}

  os_disk {{
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }}

  source_image_reference {{
    publisher = "{image_publisher}"
    offer     = "{image_offer}"
    sku       = "{image_sku}"
    version   = "latest"
  }}
}}"""
            else:
                source += f"""
resource "azurerm_windows_virtual_machine" "main" {{
  name                  = "{name}"
  resource_group_name   = azurerm_resource_group.main.name
  location              = "{loc}"
  size                  = "{size}"
  admin_username        = "{admin_user}"
  {windows_auth}
  network_interface_ids = [azurerm_network_interface.main.id]

  os_disk {{
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }}

  source_image_reference {{
    publisher = "{image_publisher}"
    offer     = "{image_offer}"
    sku       = "{image_sku}"
    version   = "latest"
  }}
}}"""
                if not admin_pass:
                    source = 'resource "random_password" "password" {\n  length  = 16\n  special = true\n}\n\n' + source
            return source

        elif rt in ("storageaccount", "storage"):
            sku = plan.get("sku", "Standard_GRS")
            tier = sku.split("_")[0] if "_" in sku else "Standard"
            repl = sku.split("_")[1] if "_" in sku else "LRS"
            kind = plan.get("kind", "StorageV2")
            return f"""resource "azurerm_resource_group" "main" {{
  name     = "{rg}"
  location = "{loc}"
}}

resource "azurerm_storage_account" "main" {{
  name                     = "{name.lower().replace('-', '')[:24]}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = "{loc}"
  account_tier             = "{tier}"
  account_replication_type = "{repl}"
  account_kind             = "{kind}"
  enable_https_traffic_only = true
  min_tls_version          = "1.2"
}}"""

        elif rt == "resourcegroup":
            return f"""resource "azurerm_resource_group" "main" {{
  name     = "{rg}"
  location = "{loc}"
}}"""

        elif rt in ("aks", "aks cluster"):
            return f"""resource "azurerm_resource_group" "main" {{
  name     = "{rg}"
  location = "{loc}"
}}

resource "azurerm_kubernetes_cluster" "main" {{
  name                = "{name}"
  location            = "{loc}"
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "{name}"

  default_node_pool {{
    name       = "default"
    node_count = {plan.get("nodeCount", "3")}
    vm_size    = "{plan.get("size", "Standard_D2s_v3")}"
  }}

  identity {{
    type = "SystemAssigned"
  }}
}}"""

        elif rt in ("appservice", "app service"):
            return f"""resource "azurerm_resource_group" "main" {{
  name     = "{rg}"
  location = "{loc}"
}}

resource "azurerm_service_plan" "main" {{
  name                = "{name}-plan"
  location            = "{loc}"
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "{plan.get("osType", "Linux")}"
  sku_name            = "{plan.get("sku", "S1")}"
}}

resource "azurerm_linux_web_app" "main" {{
  name                = "{name}"
  location            = "{loc}"
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id

  site_config {{
    application_stack {{
      {plan.get("runtime", 'python_version = "3.9"')}
    }}
  }}
}}"""

        elif rt in ("sqldatabase", "sql database", "sql"):
            return f"""resource "azurerm_resource_group" "main" {{
  name     = "{rg}"
  location = "{loc}"
}}

resource "azurerm_mssql_server" "main" {{
  name                         = "{name}-server"
  location                     = "{loc}"
  resource_group_name          = azurerm_resource_group.main.name
  version                      = "12.0"
  administrator_login          = "{plan.get("adminUsername", "sqladmin")}"
  administrator_login_password = "{plan.get("adminPassword", "P@ssw0rd1234!")}"
}}

resource "azurerm_mssql_database" "main" {{
  name                = "{name}"
  server_id           = azurerm_mssql_server.main.id
  sku_name            = "{plan.get("sku", "S2")}"
  max_size_gb         = {plan.get("storageGB", "50")}
}}"""

        elif rt in ("virtualnetwork", "vnet"):
            return f"""resource "azurerm_resource_group" "main" {{
  name     = "{rg}"
  location = "{loc}"
}}

resource "azurerm_virtual_network" "main" {{
  name                = "{name}"
  location            = "{loc}"
  resource_group_name = azurerm_resource_group.main.name
  address_space       = ["{plan.get("addressSpace", "10.0.0.0/16")}"]
}}

resource "azurerm_subnet" "main" {{
  name                 = "{name}-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["{plan.get("subnetPrefix", "10.0.1.0/24")}"]
}}"""

        return f"""resource "azurerm_resource_group" "main" {{
  name     = "{rg}"
  location = "{loc}"
}}
"""

    def _generate_variables(self, plan: Dict[str, Any]) -> list:
        return [
            {"name": "resource_group_name", "type": "string", "description": "Azure resource group name", "default": plan.get("resourceGroup", "rg-default")},
            {"name": "location", "type": "string", "description": "Azure region", "default": plan.get("region", "eastus")},
            {"name": "resource_name", "type": "string", "description": "Name of the resource", "default": plan.get("resourceName", "resource")},
            {"name": "environment", "type": "string", "description": "Deployment environment", "default": plan.get("environment", "production")},
        ]

    def _generate_outputs(self, plan: Dict[str, Any]) -> list:
        return [
            {"name": "resource_group_name", "value": "azurerm_resource_group.main.name", "description": "Resource group name"},
            {"name": "resource_id", "value": "azurerm_resource_group.main.id", "description": "Resource ID"},
            {"name": "location", "value": "azurerm_resource_group.main.location", "description": "Deployment region"},
        ]

    def _generate_tfvars(self, plan: Dict[str, Any]) -> dict:
        return {
            "resource_group_name": plan.get("resourceGroup", "rg-default"),
            "location": plan.get("region", "eastus"),
            "resource_name": plan.get("resourceName", "resource"),
            "environment": plan.get("environment", "production"),
        }


provisioning_agent_service = ProvisioningAgentService()
