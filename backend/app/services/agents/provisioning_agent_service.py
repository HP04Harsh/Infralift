"""
Provisioning Agent Service
Orchestrates AI-driven resource deployment with Azure SDK
"""

import logging
from typing import Dict, Any, Optional, AsyncGenerator
from datetime import datetime, timezone
from app.services.agents.base_agent_service import BaseAgentService
from app.services.azure_deployment_service import azure_deployment_service
from app.services.terraform_service import terraform_service
from app.services.resource_state_service import resource_state_service
from app.services.audit_service import audit_service

logger = logging.getLogger(__name__)


class ProvisioningAgentService(BaseAgentService):
    """Orchestrates AI-driven provisioning with full lifecycle management"""

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

    async def execute_deployment(
        self,
        plan: Dict[str, Any],
        credentials: Any,
        subscription_id: str,
        user_id: str,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Execute a deployment plan end-to-end"""
        request_id = self.generate_request_id()
        plan["deploymentId"] = request_id
        resource_name = plan.get("resourceName", "resource")
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d")
        deployment_path = f"deployments/{timestamp}-{resource_name}/"

        # Phase 1: Pre-deployment validation
        yield {"type": "activity", "icon": "Search", "title": "Validating request", "status": "in_progress"}
        if not plan.get("region") or not plan.get("resourceType"):
            yield {"type": "activity", "icon": "XCircle", "title": "Missing required parameters", "status": "error", "message": "Region and resource type are required"}
            return
        yield {"type": "activity", "icon": "CheckCircle", "title": "Request validated", "status": "completed"}

        # Phase 2: Deploy via Azure SDK
        yield {"type": "activity", "icon": "Cloud", "title": "Connecting to Azure", "status": "in_progress"}
        async for event in azure_deployment_service.deploy(credentials, subscription_id, plan):
            if event["type"] == "progress":
                step_title = event.get("step", "")
                icon_map = {"resource_group": "Layers", "network": "Network", "deploy": "Box"}
                yield {
                    "type": "activity",
                    "icon": icon_map.get(step_title, "Zap"),
                    "title": event.get("message", f"Executing {step_title}..."),
                    "status": event.get("status", "in_progress"),
                }
            elif event["type"] == "error":
                yield {"type": "activity", "icon": "AlertTriangle", "title": event.get("message", "Deployment failed"), "status": "error"}
                return
            elif event["type"] == "result":
                yield {"type": "activity", "icon": "CheckCircle", "title": "Resource deployed in Azure", "status": "completed", "data": event}

        deployed = event  # last event is result

        # Phase 3: Generate Terraform
        yield {"type": "activity", "icon": "FileText", "title": "Generating Terraform configuration", "status": "in_progress"}
        try:
            tf_resources = self._generate_tf_resources(plan)
            variables = self._generate_variables(plan)
            outputs = self._generate_outputs(plan)
            tfvars = self._generate_tfvars(plan)

            files = {
                "main.tf": terraform_service.generate_main_tf({**plan, "resources": tf_resources, "deploymentId": request_id}),
                "variables.tf": terraform_service.generate_variables_tf(variables),
                "outputs.tf": terraform_service.generate_outputs_tf(outputs),
                "terraform.tfvars": terraform_service.generate_tfvars(tfvars),
            }

            self._wire_redis_services()
            saved = await terraform_service.save_artifacts(plan, files)
            yield {"type": "activity", "icon": "FileText", "title": "Terraform files saved to storage", "status": "completed"}
        except Exception as e:
            logger.error(f"Terraform generation failed: {e}")
            yield {"type": "activity", "icon": "AlertTriangle", "title": f"Terraform generation failed: {e}", "status": "error"}
            saved = {}

        # Phase 4: Save resource state
        yield {"type": "activity", "icon": "Database", "title": "Saving resource state", "status": "in_progress"}
        try:
            resource_record = {
                "resourceId": f"{subscription_id}/{plan.get('resourceGroup', 'rg-default')}/{resource_name}",
                "resourceType": plan.get("resourceType", "unknown"),
                "resourceName": resource_name,
                "subscriptionId": subscription_id,
                "resourceGroup": plan.get("resourceGroup", "rg-default"),
                "deploymentId": request_id,
                "region": plan.get("region", ""),
                "terraformLocation": deployment_path,
                "tags": plan.get("tags", {}),
                "createdAt": datetime.now(timezone.utc).isoformat(),
            }
            await resource_state_service.save_resource(resource_record)
            yield {"type": "activity", "icon": "Database", "title": "Resource state saved", "status": "completed"}
        except Exception as e:
            logger.error(f"State save failed: {e}")
            yield {"type": "activity", "icon": "AlertTriangle", "title": f"State save failed: {e}", "status": "error"}

        # Phase 5: Audit trail
        yield {"type": "activity", "icon": "ClipboardList", "title": "Recording audit trail", "status": "in_progress"}
        try:
            await audit_service.record_action({
                "user": user_id,
                "agentType": "provisioning",
                "prompt": plan.get("originalPrompt", ""),
                "aiPlan": plan.get("summary", ""),
                "resourcesModified": [resource_record.get("resourceId")],
                "terraformFiles": saved,
                "deploymentId": request_id,
                "deploymentStatus": "completed",
            })
            yield {"type": "activity", "icon": "ClipboardList", "title": "Audit trail recorded", "status": "completed"}
        except Exception as e:
            logger.error(f"Audit failed: {e}")

        # Final result
        yield {
            "type": "result",
            "deployment_id": request_id,
            "resource_name": resource_name,
            "resource_group": plan.get("resourceGroup"),
            "region": plan.get("region"),
            "terraform_path": deployment_path,
            "status": "completed",
            "message": f"Deployment completed successfully. Resource {resource_name} created in {plan.get('region')}.",
        }

    def _generate_tf_resources(self, plan: Dict[str, Any]) -> str:
        rt = plan.get("resourceType", "").lower()
        rg = plan.get("resourceGroup", "rg-default")
        loc = plan.get("region", "eastus")
        name = plan.get("resourceName", "resource")

        if rt in ("virtualmachine", "vm"):
            size = plan.get("size", "Standard_B2s")
            return f"""resource "azurerm_resource_group" "main" {{
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
}}

resource "azurerm_linux_virtual_machine" "main" {{
  name                = "{name}"
  resource_group_name = azurerm_resource_group.main.name
  location            = "{loc}"
  size                = "{size}"
  admin_username      = "{plan.get("adminUsername", "azureuser")}"
  admin_password      = "{plan.get("adminPassword", "P@ssw0rd1234!")}"
  disable_password_authentication = false
  network_interface_ids = [azurerm_network_interface.main.id]

  os_disk {{
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }}

  source_image_reference {{
    publisher = "Canonical"
    offer     = "ubuntu-24_04-lts"
    sku       = "server"
    version   = "latest"
  }}
}}"""
        elif rt in ("storageaccount", "storage"):
            sku = plan.get("sku", "Standard_GRS")
            return f"""resource "azurerm_resource_group" "main" {{
  name     = "{rg}"
  location = "{loc}"
}}

resource "azurerm_storage_account" "main" {{
  name                     = "{name.lower().replace('-', '')[:24]}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = "{loc}"
  account_tier             = "{sku.split('_')[0]}"
  account_replication_type = "{sku.split('_')[1] if '_' in sku else 'LRS'}"
  account_kind             = "{plan.get("kind", "StorageV2")}"
  enable_https_traffic_only = true
  min_tls_version          = "1.2"
}}"""
        elif rt == "resourcegroup":
            return f"""resource "azurerm_resource_group" "main" {{
  name     = "{rg}"
  location = "{loc}"
}}"""
        return f"""# Terraform resources for {rt} - {name}
resource "azurerm_resource_group" "main" {{
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
