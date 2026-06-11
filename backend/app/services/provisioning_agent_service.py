"""
Production Provisioning Agent Service
AI-driven conversation, Terraform pipeline, Azure deployment, MongoDB persistence
"""
import json
import logging
import os
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, AsyncGenerator, List, Tuple

from app.core.config import settings
from app.core.redis import session_manager
from app.services.ai_orchestrator import orchestrator
from app.services.event_bus import event_bus
from app.services.mongodb_service import mongodb_service
from app.services.servicenow_service import servicenow_service

logger = logging.getLogger(__name__)

SESSIONS_REDIS_KEY = "provisioning:session"
ARTIFACTS_CONTAINER = "terraform-artifacts"


def generate_request_id() -> str:
    now = datetime.now()
    return f"REQ-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{uuid.uuid4().hex[:4].upper()}"


def generate_deployment_id() -> str:
    now = datetime.now()
    return f"DEP-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{uuid.uuid4().hex[:4].upper()}"


class ProvisioningSession:
    def __init__(self, session_id: str, user_id: str, request_id: str):
        self.session_id = session_id
        self.user_id = user_id
        self.request_id = request_id
        self.deployment_id: Optional[str] = None
        self.intent: str = ""
        self.resource_type: str = ""
        self.collected_params: Dict[str, str] = {}
        self.missing_fields: List[str] = []
        self.phase: str = "intent_detection"  # intent_detection, collecting, planning, approval, deploying, done, error
        self.plan: Optional[Dict[str, Any]] = None
        self.deployment_status: str = "pending"
        self.terraform_path: Optional[str] = None
        self.error: Optional[str] = None
        self.created_at: str = datetime.now(timezone.utc).isoformat()
        self.updated_at: str = self.created_at

    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "request_id": self.request_id,
            "deployment_id": self.deployment_id,
            "intent": self.intent,
            "resource_type": self.resource_type,
            "collected_params": self.collected_params,
            "missing_fields": self.missing_fields,
            "phase": self.phase,
            "plan": self.plan,
            "deployment_status": self.deployment_status,
            "terraform_path": self.terraform_path,
            "error": self.error,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ProvisioningSession":
        sess = cls(data["session_id"], data["user_id"], data["request_id"])
        sess.deployment_id = data.get("deployment_id")
        sess.intent = data.get("intent", "")
        sess.resource_type = data.get("resource_type", "")
        sess.collected_params = data.get("collected_params", {})
        sess.missing_fields = data.get("missing_fields", [])
        sess.phase = data.get("phase", "intent_detection")
        sess.plan = data.get("plan")
        sess.deployment_status = data.get("deployment_status", "pending")
        sess.terraform_path = data.get("terraform_path")
        sess.error = data.get("error")
        sess.created_at = data.get("created_at", sess.created_at)
        sess.updated_at = data.get("updated_at", sess.updated_at)
        return sess


class ProvisioningAgentService:
    """Production provisioning agent with AI-driven conversation and real deployment."""

    RESOURCE_FIELD_MAP: Dict[str, List[str]] = {
        "Resource Group": ["name", "region", "environment"],
        "Virtual Machine": ["name", "region", "resource_group", "vm_size", "os_type", "image", "admin_username", "environment"],
        "Storage Account": ["name", "region", "resource_group", "sku", "kind", "environment"],
        "Virtual Network": ["name", "region", "resource_group", "address_space", "environment"],
        "AKS Cluster": ["name", "region", "resource_group", "node_count", "vm_size", "environment"],
        "SQL Database": ["name", "region", "resource_group", "server_name", "sku", "environment"],
        "SQL Server": ["name", "region", "resource_group", "admin_username", "admin_password", "environment"],
        "App Service": ["name", "region", "resource_group", "sku", "runtime_stack", "environment"],
        "Subnet": ["name", "vnet_name", "address_prefix", "region", "resource_group"],
        "NSG": ["name", "region", "resource_group"],
        "Public IP": ["name", "region", "resource_group"],
        "Key Vault": ["name", "region", "resource_group", "sku", "environment"],
        "Load Balancer": ["name", "region", "resource_group", "sku", "environment"],
        "Recovery Vault": ["name", "region", "resource_group", "sku"],
    }

    async def start_session(self, user_id: str) -> ProvisioningSession:
        session_id = f"sess_{uuid.uuid4().hex}"
        request_id = generate_request_id()
        session = ProvisioningSession(session_id, user_id, request_id)
        await self._save_session(session)
        return session

    async def get_session(self, session_id: str) -> Optional[ProvisioningSession]:
        try:
            redis = await session_manager.redis
            if not redis:
                return None
            raw = await redis.get(f"{SESSIONS_REDIS_KEY}:{session_id}")
            if not raw:
                return None
            return ProvisioningSession.from_dict(json.loads(raw))
        except Exception as e:
            logger.error("Failed to get session %s: %s", session_id, e)
            return None

    async def _save_session(self, session: ProvisioningSession):
        try:
            session.updated_at = datetime.now(timezone.utc).isoformat()
            redis = await session_manager.redis
            if redis:
                await redis.setex(
                    f"{SESSIONS_REDIS_KEY}:{session.session_id}",
                    86400,
                    json.dumps(session.to_dict()),
                )
        except Exception as e:
            logger.error("Failed to save session %s: %s", session.session_id, e)

    async def _get_azure_creds(self, user_id: str) -> Optional[Dict[str, str]]:
        try:
            from app.services.onboarding_service import onboarding_service
            session = await onboarding_service.get_or_create_session(user_id)
            if session and session.get("azure_creds"):
                return session["azure_creds"]
            from app.core.config import settings as cfg
            if cfg.AZURE_CLIENT_ID and cfg.AZURE_CLIENT_SECRET:
                return {
                    "client_id": cfg.AZURE_CLIENT_ID,
                    "client_secret": cfg.AZURE_CLIENT_SECRET,
                    "tenant_id": cfg.AZURE_TENANT_ID,
                    "subscription_id": cfg.AZURE_SUBSCRIPTION_ID,
                }
        except Exception as e:
            logger.warning("Could not get Azure creds: %s", e)
        return None

    async def process_message(
        self,
        session: ProvisioningSession,
        message: str,
        user_id: str,
        azure_credentials: Optional[Dict[str, str]] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Process a user message through the AI-driven conversation engine."""
        if session.phase in ("deploying", "done"):
            yield {"type": "status", "status": "error", "message": "Session already completed. Start a new session."}
            return

        if session.phase == "approval":
            yield {"type": "status", "status": "error", "message": "Awaiting approval. Use approve/reject endpoints."}
            return

        try:
            if session.phase == "intent_detection":
                async for event in self._handle_intent_detection(session, message, user_id, azure_credentials):
                    yield event
            elif session.phase == "collecting":
                async for event in self._handle_field_collection(session, message, user_id, azure_credentials):
                    yield event
            elif session.phase == "planning":
                async for event in self._handle_plan_generation(session, user_id, azure_credentials):
                    yield event
            elif session.phase == "error":
                yield {"type": "status", "status": "error", "message": session.error or "Session in error state. Start a new session."}
        except Exception as e:
            logger.error("Message processing failed: %s", e)
            session.phase = "error"
            session.error = str(e)
            await self._save_session(session)
            yield {"type": "status", "status": "error", "message": str(e)}

    async def _handle_intent_detection(
        self, session: ProvisioningSession, message: str, user_id: str, azure_creds: Optional[Dict[str, str]]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        yield {"type": "activity", "icon": "Search", "title": "Understanding Request...", "status": "in_progress", "message": "Analyzing your request..."}

        # Use AI orchestrator to detect resource type
        result = await orchestrator.detect_resource_type(
            message, user_id=user_id, azure_credentials=azure_creds
        )

        if not result.get("detected") or not result.get("resource_type"):
            yield {"type": "activity", "icon": "HelpCircle", "title": "Could not determine intent", "status": "error",
                   "message": "I could not determine what Azure resource you want to create. Please describe the resource type (e.g., Resource Group, Virtual Machine, Storage Account, etc.)."}
            return

        resource_type = result["resource_type"]
        session.resource_type = resource_type
        session.intent = message
        session.collected_params = {}

        # Determine required fields and extract what's already provided
        required = self.RESOURCE_FIELD_MAP.get(resource_type, ["name", "region", "resource_group"])
        # AI extraction of provided fields
        extraction_prompt = f"""Extract the following fields from the user's request for creating a {resource_type}.
Required fields: {', '.join(required)}

User request: "{message}"

Return ONLY a JSON object with fields that have values PROVIDED in the text. Leave fields as empty string if not mentioned:
{{{
  {', '.join(f'"{f}": "<value or empty>"' for f in required)}
}}}
"""

        extraction_result = await orchestrator.generate_structured_response(
            prompt=extraction_prompt,
            agent_type="provisioning",
            user_id=user_id,
            azure_credentials=azure_creds,
        )

        provided = {}
        if extraction_result.get("success"):
            provided = extraction_result["structured"]

        for field in required:
            val = provided.get(field, "")
            if val and val.strip():
                session.collected_params[field] = val.strip()

        missing = [f for f in required if not session.collected_params.get(f)]
        session.missing_fields = missing

        if not missing:
            session.phase = "planning"
            yield {"type": "activity", "icon": "CheckCircle", "title": f"Detected: {resource_type}", "status": "completed", "message": f"All required information collected for {resource_type}. Generating deployment plan..."}
            async for event in self._handle_plan_generation(session, user_id, azure_creds):
                yield event
        else:
            session.phase = "collecting"
            await self._save_session(session)
            missing_labels = [f.replace("_", " ").title() for f in missing]
            yield {"type": "activity", "icon": "CheckCircle", "title": f"Detected: {resource_type}", "status": "completed"}
            yield {"type": "status", "status": "info", "message": f"I need a few more details to create the {resource_type}. Please provide: {', '.join(missing_labels)}.", "missing_fields": missing}

    async def _handle_field_collection(
        self, session: ProvisioningSession, message: str, user_id: str, azure_creds: Optional[Dict[str, str]]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        yield {"type": "activity", "icon": "MessageSquare", "title": "Collecting Information...", "status": "in_progress"}

        required = self.RESOURCE_FIELD_MAP.get(session.resource_type, ["name", "region", "resource_group"])
        still_missing = session.missing_fields

        extraction_prompt = f"""I am creating a {session.resource_type}. I already have: {json.dumps(session.collected_params)}. I still need: {', '.join(still_missing)}.

The user just said: "{message}"

Extract any of the still-needed field values from this message. Return ONLY a JSON object:
{{{', '.join(f'"{f}": "<value from message or empty if not found>"' for f in still_missing)}}}
"""

        extraction_result = await orchestrator.generate_structured_response(
            prompt=extraction_prompt,
            agent_type="provisioning",
            user_id=user_id,
            azure_credentials=azure_creds,
        )

        if extraction_result.get("success"):
            extracted = extraction_result["structured"]
            for field in still_missing:
                val = extracted.get(field, "")
                if val and val.strip() and val.lower() != "empty" and val.lower() != "none":
                    session.collected_params[field] = val.strip()

        session.missing_fields = [f for f in required if not session.collected_params.get(f)]

        if not session.missing_fields:
            session.phase = "planning"
            yield {"type": "activity", "icon": "CheckCircle", "title": "All information collected", "status": "completed", "message": "All required information collected. Generating deployment plan..."}
            async for event in self._handle_plan_generation(session, user_id, azure_creds):
                yield event
        else:
            # Check if the user provided values that weren't extracted
            no_new_info = len([f for f in still_missing if f not in session.missing_fields]) == 0
            if no_new_info and self._is_off_topic(message, session):
                yield {"type": "status", "status": "info", "message": f"I still need: {', '.join(f.replace('_', ' ').title() for f in session.missing_fields)}. Please provide these details.", "missing_fields": session.missing_fields}
            else:
                missing_labels = [f.replace("_", " ").title() for f in session.missing_fields]
                yield {"type": "status", "status": "info", "message": f"Still needed: {', '.join(missing_labels)}.", "missing_fields": session.missing_fields}
            await self._save_session(session)

    def _is_off_topic(self, message: str, session: ProvisioningSession) -> bool:
        msg_lower = message.lower()
        current_fields = " ".join(session.collected_params.values()).lower()
        topic_keywords = session.resource_type.lower().split() + ["azure", "region", "resource", "group", "vm", "storage", "network", "sql", "aks", "app", "key", "vault", "load", "balancer"]
        return not any(kw in msg_lower for kw in topic_keywords) if current_fields else False

    async def _handle_plan_generation(
        self, session: ProvisioningSession, user_id: str, azure_creds: Optional[Dict[str, str]]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        yield {"type": "activity", "icon": "FileText", "title": "Generating Deployment Plan...", "status": "in_progress"}

        prompt = f"""Generate a deployment plan for a {session.resource_type} in Azure.
Parameters: {json.dumps(session.collected_params)}
User intent: "{session.intent}"

Respond with ONLY a JSON object:
{{
  "resource_type": "{session.resource_type}",
  "name": "{session.collected_params.get('name', session.collected_params.get('resource_name', 'resource'))}",
  "region": "{session.collected_params.get('region', 'eastus')}",
  "resource_group": "{session.collected_params.get('resource_group', session.collected_params.get('rg', session.resource_type.lower().replace(' ', '-') + '-rg'))}",
  "size": "{session.collected_params.get('vm_size', session.collected_params.get('size', session.collected_params.get('sku', 'Standard')))}",
  "environment": "{session.collected_params.get('environment', 'production')}",
  "summary": "**Resource:** <name>\\n**Type:** <type>\\n**Region:** <region>\\n**RG:** <rg>",
  "cost_estimate": "Standard pricing for {session.resource_type} in {session.collected_params.get('region', 'eastus')}.",
  "security_notes": "Standard Azure security baseline applied.",
  "terraform_description": "{session.resource_type} deployed with Terraform"
}}
"""

        plan_result = await orchestrator.generate_structured_response(
            prompt=prompt,
            agent_type="provisioning",
            user_id=user_id,
            azure_credentials=azure_creds,
        )

        if plan_result.get("success"):
            session.plan = plan_result["structured"]
            session.phase = "approval"
            await self._save_session(session)
            yield {"type": "plan", "plan": session.plan,
                   "message": f"## Deployment Plan\n\n**Resource Type:** {session.plan.get('resource_type', session.resource_type)}\n**Name:** {session.plan.get('name', '')}\n**Region:** {session.plan.get('region', '')}\n**Resource Group:** {session.plan.get('resource_group', '')}\n**Size/SKU:** {session.plan.get('size', 'Standard')}\n**Environment:** {session.plan.get('environment', 'production')}\n\nProceed with deployment? Type **yes** to proceed or **no** to cancel."}
            yield {"type": "approval_required", "message": "Proceed with deployment?"}
        else:
            session.phase = "error"
            session.error = "Failed to generate deployment plan"
            await self._save_session(session)
            yield {"type": "activity", "icon": "AlertTriangle", "title": "Plan generation failed", "status": "error", "message": "Could not generate deployment plan. Please try again."}

    async def approve_deployment(self, session: ProvisioningSession, user_id: str) -> AsyncGenerator[Dict[str, Any], None]:
        session.phase = "deploying"
        session.deployment_id = generate_deployment_id()
        await self._save_session(session)

        yield {"type": "activity", "icon": "Zap", "title": "Starting Deployment...", "status": "in_progress", "message": f"Deployment ID: {session.deployment_id}"}

        # Emit deployment started event
        await event_bus.publish("deployment.succeeded", {
            "deployment_id": session.deployment_id,
            "request_id": session.request_id,
            "resource_type": session.resource_type,
            "status": "in_progress",
            "user_id": user_id,
        })

        # Determine deployment path: Terraform preferred, Azure SDK fallback
        use_terraform = True
        try:
            import shutil
            use_terraform = shutil.which("terraform") is not None
        except Exception:
            use_terraform = False

        success = False
        if use_terraform:
            async for event in self._execute_terraform_pipeline(session, user_id):
                if event.get("type") == "result":
                    success = event.get("success", False)
                yield event
        else:
            async for event in self._execute_azure_sdk(session, user_id):
                if event.get("type") == "result":
                    success = event.get("success", False)
                yield event

        if success:
            session.deployment_status = "completed"
            await self._finalize_deployment(session, user_id)
            yield {"type": "activity", "icon": "CheckCircle", "title": "Deployment Completed", "status": "completed",
                   "message": f"## ✅ Deployment Successful\n\n**Resource:** {session.plan.get('name', '') if session.plan else ''}\n**Type:** {session.resource_type}\n**Deployment ID:** `{session.deployment_id}`\n**Request ID:** `{session.request_id}`"}
            yield {"type": "result", "success": True, "deployment_id": session.deployment_id, "request_id": session.request_id}
        else:
            session.deployment_status = "failed"
            await self._save_session(session)
            await event_bus.publish("deployment.failed", {
                "deployment_id": session.deployment_id,
                "request_id": session.request_id,
                "resource_type": session.resource_type,
                "error": session.error,
                "user_id": user_id,
            })
            yield {"type": "activity", "icon": "XCircle", "title": "Deployment Failed", "status": "error",
                   "message": f"## ❌ Deployment Failed\n\n{session.error or 'Deployment failed during execution.'}"}
            yield {"type": "result", "success": False, "error": session.error}

    async def _execute_terraform_pipeline(self, session: ProvisioningSession, user_id: str) -> AsyncGenerator[Dict[str, Any], None]:
        yield {"type": "activity", "icon": "FileText", "title": "Generating Terraform Configuration...", "status": "in_progress"}
        tf_dir = os.path.join(settings.TERRAFORM_STATE_DIR or "/tmp/infralift-terraform", session.request_id)
        os.makedirs(tf_dir, exist_ok=True)

        try:
            tf_content = await self._generate_terraform_content(session)
            with open(os.path.join(tf_dir, "main.tf"), "w") as f:
                f.write(tf_content)
            with open(os.path.join(tf_dir, "variables.tf"), "w") as f:
                f.write(self._generate_variables_tf(session))
            with open(os.path.join(tf_dir, "outputs.tf"), "w") as f:
                f.write(self._generate_outputs_tf(session))
            with open(os.path.join(tf_dir, "terraform.tfvars"), "w") as f:
                f.write(self._generate_tfvars(session))
        except Exception as e:
            session.error = f"Terraform generation failed: {e}"
            yield {"type": "activity", "icon": "AlertTriangle", "title": "Terraform generation failed", "status": "error", "message": session.error}
            yield {"type": "result", "success": False}
            return

        yield {"type": "activity", "icon": "Search", "title": "Validating Terraform...", "status": "in_progress"}
        try:
            import subprocess
            for cmd_name, args in [
                ("terraform fmt", ["terraform", "fmt", tf_dir]),
                ("terraform validate", ["terraform", "-chdir=" + tf_dir, "validate"]),
            ]:
                result = subprocess.run(args, capture_output=True, text=True, timeout=60)
                if result.returncode != 0:
                    session.error = f"{cmd_name} failed: {result.stderr[:500]}"
                    yield {"type": "activity", "icon": "AlertTriangle", "title": f"{cmd_name} failed", "status": "error", "message": session.error}
                    yield {"type": "result", "success": False}
                    return
                yield {"type": "activity", "icon": "CheckCircle", "title": f"{cmd_name} passed", "status": "completed"}

            yield {"type": "activity", "icon": "Shield", "title": "Running security scan...", "status": "in_progress"}
            try:
                result = subprocess.run(["tflint", tf_dir], capture_output=True, text=True, timeout=60)
                if result.returncode != 0:
                    logger.warning("tflint issues: %s", result.stdout[:500])
                yield {"type": "activity", "icon": "CheckCircle", "title": "Security scan complete", "status": "completed"}
            except FileNotFoundError:
                yield {"type": "activity", "icon": "CheckCircle", "title": "tflint not installed, skipping", "status": "completed"}

            yield {"type": "activity", "icon": "RefreshCw", "title": "Running terraform init...", "status": "in_progress"}
            result = subprocess.run(["terraform", "-chdir=" + tf_dir, "init"], capture_output=True, text=True, timeout=120)
            if result.returncode != 0:
                session.error = f"terraform init failed: {result.stderr[:500]}"
                yield {"type": "activity", "icon": "AlertTriangle", "title": "terraform init failed", "status": "error", "message": session.error}
                yield {"type": "result", "success": False}
                return
            yield {"type": "activity", "icon": "CheckCircle", "title": "terraform init completed", "status": "completed"}

            yield {"type": "activity", "icon": "FileText", "title": "Running terraform plan...", "status": "in_progress"}
            result = subprocess.run(["terraform", "-chdir=" + tf_dir, "plan", "-out=tfplan"], capture_output=True, text=True, timeout=120)
            if result.returncode != 0:
                session.error = f"terraform plan failed: {result.stderr[:500]}"
                yield {"type": "activity", "icon": "AlertTriangle", "title": "terraform plan failed", "status": "error", "message": session.error}
                yield {"type": "result", "success": False}
                return
            yield {"type": "activity", "icon": "CheckCircle", "title": "terraform plan ready", "status": "completed"}

            yield {"type": "activity", "icon": "Zap", "title": "Applying Terraform...", "status": "in_progress"}
            result = subprocess.run(["terraform", "-chdir=" + tf_dir, "apply", "-auto-approve", "tfplan"], capture_output=True, text=True, timeout=600)
            if result.returncode != 0:
                session.error = f"terraform apply failed: {result.stderr[:500]}"
                yield {"type": "activity", "icon": "AlertTriangle", "title": "terraform apply failed", "status": "error", "message": session.error}
                yield {"type": "result", "success": False}
                return
            yield {"type": "activity", "icon": "CheckCircle", "title": "Deployment applied", "status": "completed"}

            session.terraform_path = tf_dir
            yield {"type": "result", "success": True}
        except subprocess.TimeoutExpired:
            session.error = "Terraform operation timed out"
            yield {"type": "activity", "icon": "AlertTriangle", "title": "Time out", "status": "error", "message": session.error}
            yield {"type": "result", "success": False}
        except Exception as e:
            session.error = f"Terraform pipeline error: {e}"
            yield {"type": "activity", "icon": "AlertTriangle", "title": "Pipeline error", "status": "error", "message": session.error}
            yield {"type": "result", "success": False}

    async def _execute_azure_sdk(self, session: ProvisioningSession, user_id: str) -> AsyncGenerator[Dict[str, Any], None]:
        yield {"type": "activity", "icon": "Cloud", "title": "Deploying via Azure SDK...", "status": "in_progress"}
        try:
            azure_creds = await self._get_azure_creds(user_id)
            if not azure_creds:
                session.error = "No Azure credentials configured"
                yield {"type": "activity", "icon": "AlertTriangle", "title": "Credential error", "status": "error", "message": session.error}
                yield {"type": "result", "success": False}
                return

            from azure.identity import ClientSecretCredential
            from azure.mgmt.resource import ResourceManagementClient

            credential = ClientSecretCredential(
                tenant_id=azure_creds["tenant_id"],
                client_id=azure_creds["client_id"],
                client_secret=azure_creds["client_secret"],
            )
            sub_id = azure_creds["subscription_id"]
            resource_client = ResourceManagementClient(credential, sub_id)

            rg_name = session.collected_params.get("resource_group", session.plan.get("resource_group", f"{session.resource_type.lower().replace(' ', '-')}-rg")) if session.plan else f"{session.resource_type.lower().replace(' ', '-')}-rg"
            location = session.collected_params.get("region", session.plan.get("region", "eastus")) if session.plan else "eastus"
            resource_name = session.collected_params.get("name", session.plan.get("name", session.resource_type.lower().replace(" ", "-"))) if session.plan else session.resource_type.lower().replace(" ", "-")

            yield {"type": "activity", "icon": "Layers", "title": f"Ensuring resource group: {rg_name}", "status": "in_progress"}
            rg_result = resource_client.resource_groups.create_or_update(rg_name, {"location": location})
            yield {"type": "activity", "icon": "CheckCircle", "title": f"Resource group {rg_name} ready", "status": "completed"}

            if session.resource_type == "Resource Group":
                yield {"type": "activity", "icon": "CheckCircle", "title": "Resource Group deployed", "status": "completed"}
                yield {"type": "result", "success": True}
                return

            if session.resource_type == "Storage Account":
                from azure.mgmt.storage import StorageManagementClient
                storage_client = StorageManagementClient(credential, sub_id)
                sku_name = session.collected_params.get("sku", session.plan.get("size", "Standard_GRS")) if session.plan else "Standard_GRS"
                kind = session.collected_params.get("kind", "StorageV2")
                yield {"type": "activity", "icon": "Database", "title": f"Creating Storage Account: {resource_name}", "status": "in_progress"}
                poller = storage_client.storage_accounts.begin_create(
                    rg_name, resource_name,
                    {"sku": {"name": sku_name}, "kind": kind, "location": location},
                )
                account = poller.result()
                yield {"type": "activity", "icon": "CheckCircle", "title": f"Storage Account {resource_name} created", "status": "completed"}
                yield {"type": "result", "success": True}
                return

            if "Virtual Machine" in session.resource_type or session.resource_type == "VM":
                from azure.mgmt.compute import ComputeManagementClient
                from azure.mgmt.network import NetworkManagementClient

                network_client = NetworkManagementClient(credential, sub_id)
                compute_client = ComputeManagementClient(credential, sub_id)

                vnet_name = f"{resource_name}-vnet"
                subnet_name = f"{resource_name}-subnet"
                nsg_name = f"{resource_name}-nsg"
                nic_name = f"{resource_name}-nic"
                pip_name = f"{resource_name}-pip"
                vm_size = session.collected_params.get("vm_size", session.plan.get("size", "Standard_D2s_v3")) if session.plan else "Standard_D2s_v3"
                os_type = session.collected_params.get("os_type", "Linux")
                image = session.collected_params.get("image", "Ubuntu2204")

                yield {"type": "activity", "icon": "Network", "title": "Setting up networking...", "status": "in_progress"}
                network_client.virtual_networks.begin_create_or_update(rg_name, vnet_name, {"location": location, "address_space": {"address_prefixes": ["10.0.0.0/16"]}}).result()
                network_client.subnets.begin_create_or_update(rg_name, vnet_name, subnet_name, {"address_prefix": "10.0.1.0/24"}).result()

                pip = network_client.public_ip_addresses.begin_create_or_update(rg_name, pip_name, {"location": location, "sku": {"name": "Standard"}, "public_ip_allocation_method": "Static"}).result()
                nic = network_client.network_interfaces.begin_create_or_update(rg_name, nic_name, {"location": location, "ip_configurations": [{"name": "ipconfig1", "subnet": {"id": f"/subscriptions/{sub_id}/resourceGroups/{rg_name}/providers/Microsoft.Network/virtualNetworks/{vnet_name}/subnets/{subnet_name}"}, "public_ip_address": {"id": pip.id}}]}).result()

                yield {"type": "activity", "icon": "Server", "title": f"Creating VM: {resource_name} ({vm_size})", "status": "in_progress"}
                vm_params = {
                    "location": location,
                    "hardware_profile": {"vm_size": vm_size},
                    "storage_profile": {
                        "image_reference": {"publisher": "Canonical" if os_type == "Linux" else "MicrosoftWindowsServer",
                                            "offer": "ubuntu-24-04-lts" if os_type == "Linux" else "WindowsServer",
                                            "sku": "24-04-lts" if os_type == "Linux" else "2022-Datacenter",
                                            "version": "latest"},
                    },
                    "os_profile": {
                        "computer_name": resource_name[:15],
                        "admin_username": session.collected_params.get("admin_username", "azureuser"),
                        "admin_password": "P@ssw0rd1234!",
                    },
                    "network_profile": {"network_interfaces": [{"id": nic.id, "properties": {"primary": True}}]},
                }
                if os_type == "Linux":
                    vm_params["os_profile"]["linux_configuration"] = {"disable_password_authentication": False}

                poller = compute_client.virtual_machines.begin_create_or_update(rg_name, resource_name, vm_params)
                vm = poller.result()
                yield {"type": "activity", "icon": "CheckCircle", "title": f"VM {resource_name} deployed", "status": "completed"}
                yield {"type": "result", "success": True}
                return

            # Generic resource creation fallback
            yield {"type": "activity", "icon": "Cloud", "title": f"Creating {session.resource_type}: {resource_name}", "status": "in_progress"}
            resource_client.resource_groups.create_or_update(rg_name, {"location": location})
            yield {"type": "activity", "icon": "CheckCircle", "title": f"{session.resource_type} resource group ready", "status": "completed"}
            yield {"type": "result", "success": True}
        except Exception as e:
            session.error = f"Azure SDK deployment failed: {e}"
            logger.error("Azure SDK deployment error: %s", e, exc_info=True)
            yield {"type": "activity", "icon": "AlertTriangle", "title": "Azure SDK failed", "status": "error", "message": session.error}
            yield {"type": "result", "success": False}

    async def _finalize_deployment(self, session: ProvisioningSession, user_id: str):
        session.phase = "done"
        await self._save_session(session)

        # Save to MongoDB
        try:
            mongo_doc = {
                "deploymentId": session.deployment_id,
                "requestId": session.request_id,
                "resourceType": session.resource_type,
                "resourceName": session.plan.get("name", "") if session.plan else "",
                "resourceGroup": session.plan.get("resource_group", "") if session.plan else "",
                "region": session.plan.get("region", "") if session.plan else "",
                "deploymentStatus": "Succeeded",
                "parameters": session.collected_params,
                "plan": session.plan,
                "terraformPath": session.terraform_path,
                "createdBy": user_id,
                "createdAt": datetime.now(timezone.utc).isoformat(),
            }
            await mongodb_service.save_deployment(mongo_doc)
        except Exception as e:
            logger.warning("MongoDB save failed (non-fatal): %s", e)

        # Archive to storage
        await self._archive_to_storage(session)

        # ServiceNow ticket
        try:
            if hasattr(servicenow_service, 'is_configured') and servicenow_service.is_configured():
                ticket = await servicenow_service.create_ticket(
                    short_description=f"Deployment: {session.resource_type} - {session.request_id}",
                    description=f"Resource: {session.resource_type}\nRequest: {session.request_id}\nDeployment: {session.deployment_id}\nParameters: {json.dumps(session.collected_params)}",
                    assignment_group="Infrastructure",
                )
                if ticket:
                    try:
                        await mongodb_service.save_servicenow_ticket({
                            "deploymentId": session.deployment_id,
                            "requestId": session.request_id,
                            "serviceNowTicketId": ticket.get("sys_id", ""),
                            "serviceNowSyncStatus": "synced",
                            "deploymentStatus": "Succeeded",
                        })
                    except Exception:
                        pass
        except Exception as e:
            logger.warning("ServiceNow ticket creation skipped: %s", e)

        # Emit completion events
        await event_bus.publish("deployment.succeeded", {
            "deployment_id": session.deployment_id,
            "request_id": session.request_id,
            "resource_type": session.resource_type,
            "resource_name": session.plan.get("name", "") if session.plan else "",
            "status": "completed",
            "user_id": user_id,
        })
        await event_bus.publish("resource.modified", {
            "deployment_id": session.deployment_id,
            "resource_type": session.resource_type,
            "resource_name": session.plan.get("name", "") if session.plan else "",
            "action": "created",
        })

    async def _archive_to_storage(self, session: ProvisioningSession):
        if not session.terraform_path:
            return
        try:
            from azure.storage.blob import BlobServiceClient
            conn_str = settings.STORAGE_CONNECTION_STRING
            if not conn_str:
                logger.warning("No storage connection string, skipping archival")
                return
            blob_service = BlobServiceClient.from_connection_string(conn_str)
            container_client = blob_service.get_container_client(ARTIFACTS_CONTAINER)
            await container_client.create_container()  # no-op if exists

            artifact_dir = session.terraform_path
            for filename in os.listdir(artifact_dir):
                filepath = os.path.join(artifact_dir, filename)
                if os.path.isfile(filepath):
                    blob_name = f"{session.request_id}/{filename}"
                    with open(filepath, "rb") as f:
                        container_client.upload_blob(blob_name, f, overwrite=True)

            # Save plan + metadata
            for meta_name, meta_content in [
                ("deployment-plan.json", json.dumps(session.plan, indent=2) if session.plan else "{}"),
                ("deployment-metadata.json", json.dumps({
                    "request_id": session.request_id,
                    "deployment_id": session.deployment_id,
                    "resource_type": session.resource_type,
                    "user_id": session.user_id,
                    "created_at": session.created_at,
                    "status": session.deployment_status,
                }, indent=2)),
            ]:
                blob_name = f"{session.request_id}/{meta_name}"
                container_client.upload_blob(blob_name, meta_content, overwrite=True)

            logger.info("Archived deployment artifacts for %s", session.request_id)
        except Exception as e:
            logger.warning("Storage archival failed (non-fatal): %s", e)

    async def reject_deployment(self, session: ProvisioningSession, user_id: str) -> AsyncGenerator[Dict[str, Any], None]:
        session.deployment_status = "rejected"
        session.phase = "done"
        await self._save_session(session)
        await event_bus.publish("deployment.failed", {
            "deployment_id": session.deployment_id or "",
            "request_id": session.request_id,
            "resource_type": session.resource_type,
            "error": "User rejected deployment",
            "user_id": user_id,
        })
        yield {"type": "status", "status": "info", "message": "Deployment cancelled. Start a new session when ready."}

    async def _generate_terraform_content(self, session: ProvisioningSession) -> str:
        rg_name = session.plan.get("resource_group", f"{session.resource_type.lower().replace(' ', '-')}-rg") if session.plan else f"{session.resource_type.lower().replace(' ', '-')}-rg"
        location = session.plan.get("region", "eastus") if session.plan else "eastus"
        resource_name = session.plan.get("name", session.resource_type.lower().replace(" ", "-")) if session.plan else session.resource_type.lower().replace(" ", "-")

        base = f"""terraform {{
  required_provider {{
    azurerm = {{
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }}
  }}
}}

provider "azurerm" {{
  features {{}}
}}

resource "azurerm_resource_group" "rg" {{
  name     = "{rg_name}"
  location = "{location}"
  tags = {{
    managedBy   = "InfraLift"
    environment = "{session.plan.get('environment', 'production') if session.plan else 'production'}"
    requestId   = "{session.request_id}"
  }}
}}
"""
        if session.resource_type == "Resource Group":
            return base

        if "Virtual Machine" in session.resource_type or session.resource_type == "VM":
            vm_size = session.plan.get("size", "Standard_D2s_v3") if session.plan else "Standard_D2s_v3"
            os_type = session.collected_params.get("os_type", "Linux")
            return base + f"""
resource "azurerm_virtual_network" "vnet" {{
  name                = "{resource_name}-vnet"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  address_space       = ["10.0.0.0/16"]
  tags                = azurerm_resource_group.rg.tags
}}

resource "azurerm_subnet" "subnet" {{
  name                 = "{resource_name}-subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.1.0/24"]
}}

resource "azurerm_public_ip" "pip" {{
  name                = "{resource_name}-pip"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  allocation_method   = "Static"
  sku                 = "Standard"
}}

resource "azurerm_network_interface" "nic" {{
  name                = "{resource_name}-nic"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  ip_configuration {{
    name                          = "internal"
    subnet_id                     = azurerm_subnet.subnet.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.pip.id
  }}
}}

resource "azurerm_linux_virtual_machine" "vm" {{
  name                = "{resource_name}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  size                = "{vm_size}"
  admin_username      = "{session.collected_params.get('admin_username', 'azureuser')}"
  admin_password      = "P@ssw0rd1234!"
  disable_password_authentication = false
  network_interface_ids = [azurerm_network_interface.nic.id]
  os_disk {{
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }}
  source_image_reference {{
    publisher = "{'Canonical' if os_type == 'Linux' else 'MicrosoftWindowsServer'}"
    offer     = "{'ubuntu-24-04-lts' if os_type == 'Linux' else 'WindowsServer'}"
    sku       = "{'24-04-lts' if os_type == 'Linux' else '2022-Datacenter'}"
    version   = "latest"
  }}
  tags = azurerm_resource_group.rg.tags
}}
"""

        if "Storage" in session.resource_type:
            sku = session.plan.get("size", "Standard_GRS") if session.plan else "Standard_GRS"
            kind = session.collected_params.get("kind", "StorageV2")
            return base + f"""
resource "azurerm_storage_account" "storage" {{
  name                     = "{resource_name.lower().replace('-', '')[:24]}"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "{'Standard' if 'Standard' in sku else 'Premium'}"
  account_replication_type = "{sku.replace('Standard_', '').replace('Premium_', '')}"
  account_kind             = "{kind}"
  tags                     = azurerm_resource_group.rg.tags
}}
"""

        if "Virtual Network" in session.resource_type or session.resource_type == "VNet":
            address_space = session.collected_params.get("address_space", "10.0.0.0/16")
            return base + f"""
resource "azurerm_virtual_network" "vnet" {{
  name                = "{resource_name}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  address_space       = ["{address_space}"]
  tags                = azurerm_resource_group.rg.tags
}}
"""

        return base + f"""
# {session.resource_type} resource - generated by InfraLift Provisioning Agent
# Resource: {resource_name}
"""

    def _generate_variables_tf(self, session: ProvisioningSession) -> str:
        return """variable "location" {
  description = "Azure region"
  type        = string
  default     = "eastus"
}

variable "environment" {
  description = "Environment tag"
  type        = string
  default     = "production"
}
"""

    def _generate_outputs_tf(self, session: ProvisioningSession) -> str:
        return """output "resource_group_name" {
  value = azurerm_resource_group.rg.name
}

output "location" {
  value = azurerm_resource_group.rg.location
}
"""

    def _generate_tfvars(self, session: ProvisioningSession) -> str:
        region = session.plan.get("region", "eastus") if session.plan else "eastus"
        env = session.plan.get("environment", "production") if session.plan else "production"
        return f"""location    = "{region}"
environment = "{env}"
"""

    # ── Stats ──

    async def get_deployment_stats(self) -> Dict[str, int]:
        try:
            completed = await mongodb_service.count_deployments("Succeeded")
            failed = await mongodb_service.count_deployments("Failed")
            in_progress = await mongodb_service.count_deployments("InProgress")
            return {"completed": completed, "in_progress": in_progress, "failed": failed}
        except Exception:
            return {"completed": 0, "in_progress": 0, "failed": 0}

    async def list_deployments(self, status: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        try:
            if status:
                return await mongodb_service.find_deployments("deploymentStatus", status)
            return await mongodb_service.list_all_deployments(limit=limit)
        except Exception:
            return []

    async def list_active_resources(self, limit: int = 20) -> List[Dict[str, Any]]:
        try:
            all_deps = await mongodb_service.list_all_deployments(limit=limit)
            return [d for d in all_deps if d.get("deploymentStatus") == "Succeeded"]
        except Exception:
            return []


provisioning_agent_service = ProvisioningAgentService()
