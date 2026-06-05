"""
Azure SDK Deployment Service
Executes real Azure resource deployments using Azure SDK
"""

import logging
from typing import Dict, Any, Optional, AsyncGenerator
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class AzureDeploymentService:
    """Deploy and manage Azure resources via Azure SDK"""

    async def deploy(
        self,
        credentials: Any,
        subscription_id: str,
        plan: Dict[str, Any],
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Execute a deployment plan using Azure SDK"""
        deployment_id = plan.get("deploymentId", f"dep-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}")

        try:
            from azure.mgmt.resource import ResourceManagementClient
            from azure.mgmt.compute import ComputeManagementClient
            from azure.mgmt.network import NetworkManagementClient
            from azure.mgmt.storage import StorageManagementClient
        except ImportError as e:
            logger.error(f"Azure SDK import failed: {e}")
            yield {"type": "error", "step": "import", "message": f"Azure SDK not available: {e}"}
            return

        resource_client = ResourceManagementClient(credential, subscription_id)
        compute_client = ComputeManagementClient(credential, subscription_id)
        network_client = NetworkManagementClient(credential, subscription_id)
        storage_client = StorageManagementClient(credential, subscription_id)

        resource_type = plan.get("resourceType", "").lower()
        rg_name = plan.get("resourceGroup", f"rg-{plan.get('resourceName', 'default').lower()}")
        location = plan.get("region", "eastus")
        resource_name = plan.get("resourceName", "resource")

        # Step 1: Create Resource Group
        yield {"type": "progress", "step": "resource_group", "message": f"Creating resource group {rg_name} in {location}...", "status": "in_progress"}
        try:
            rg_result = resource_client.resource_groups.create_or_update(rg_name, {"location": location})
            yield {"type": "progress", "step": "resource_group", "message": f"Resource group {rg_name} created", "status": "completed"}
        except Exception as e:
            yield {"type": "error", "step": "resource_group", "message": f"Failed to create resource group: {e}"}
            return

        # Step 2: Network setup (for VMs, AKS, App Service)
        vnet_name = f"{resource_name}-vnet"
        subnet_name = f"{resource_name}-subnet"
        nsg_name = f"{resource_name}-nsg"
        pip_name = f"{resource_name}-pip"
        nic_name = f"{resource_name}-nic"

        if resource_type in ("virtualmachine", "vm", "aks"):
            yield {"type": "progress", "step": "network", "message": f"Setting up networking for {resource_name}...", "status": "in_progress"}

            try:
                nsg_params = {"location": location, "security_rules": [
                    {"name": "SSH", "properties": {"protocol": "Tcp", "source_port_range": "*", "destination_port_range": "22", "source_address_prefix": "*", "destination_address_prefix": "*", "access": "Allow", "priority": 1000, "direction": "Inbound"}},
                    {"name": "HTTPS", "properties": {"protocol": "Tcp", "source_port_range": "*", "destination_port_range": "443", "source_address_prefix": "*", "destination_address_prefix": "*", "access": "Allow", "priority": 1001, "direction": "Inbound"}},
                ]}
                network_client.network_security_groups.begin_create_or_update(rg_name, nsg_name, nsg_params).result()

                vnet_params = {"location": location, "address_space": {"address_prefixes": ["10.0.0.0/16"]}}
                vnet = network_client.virtual_networks.begin_create_or_update(rg_name, vnet_name, vnet_params).result()

                subnet_params = {"address_prefix": "10.0.1.0/24"}
                subnet = network_client.subnets.begin_create_or_update(rg_name, vnet_name, subnet_name, subnet_params).result()

                # Create public IP for VMs
                if resource_type in ("virtualmachine", "vm"):
                    pip_params = {"location": location, "sku": {"name": "Standard"}, "public_ip_allocation_method": "Static"}
                    network_client.public_ip_addresses.begin_create_or_update(rg_name, pip_name, pip_params).result()

                    nic_params = {"location": location, "ip_configurations": [{"name": f"{nic_name}-config", "subnet": {"id": subnet.id}, "public_ip_address": {"id": f"/subscriptions/{subscription_id}/resourceGroups/{rg_name}/providers/Microsoft.Network/publicIPAddresses/{pip_name}"}}], "network_security_group": {"id": f"/subscriptions/{subscription_id}/resourceGroups/{rg_name}/providers/Microsoft.Network/networkSecurityGroups/{nsg_name}"}}
                    network_client.network_interfaces.begin_create_or_update(rg_name, nic_name, nic_params).result()

                yield {"type": "progress", "step": "network", "message": "Networking configured", "status": "completed"}
            except Exception as e:
                yield {"type": "error", "step": "network", "message": f"Network setup failed: {e}"}
                return

        # Step 3: Deploy the actual resource
        yield {"type": "progress", "step": "deploy", "message": f"Deploying {resource_type} {resource_name}...", "status": "in_progress"}

        try:
            deployed_resource = None
            if resource_type in ("virtualmachine", "vm"):
                vm_size = plan.get("size", "Standard_B2s")
                os_type = plan.get("osType", "linux").lower()
                admin_user = plan.get("adminUsername", "azureuser")

                vm_params = {
                    "location": location,
                    "hardware_profile": {"vm_size": vm_size},
                    "storage_profile": {
                        "image_reference": {
                            "publisher": "Canonical" if os_type == "linux" else "MicrosoftWindowsServer",
                            "offer": "ubuntu-24_04-lts" if os_type == "linux" else "WindowsServer",
                            "sku": "server" if os_type == "linux" else "2022-Datacenter",
                            "version": "latest",
                        }
                    },
                    "os_profile": {
                        "computer_name": resource_name[:15],
                        "admin_username": admin_user,
                        "admin_password": plan.get("adminPassword", "P@ssw0rd1234!"),
                        "linux_configuration": {"disable_password_authentication": False} if os_type == "linux" else None,
                    },
                    "network_profile": {"network_interfaces": [{"id": f"/subscriptions/{subscription_id}/resourceGroups/{rg_name}/providers/Microsoft.Network/networkInterfaces/{nic_name}"}]},
                    "tags": plan.get("tags", {"managedBy": "InfraLift", "environment": plan.get("environment", "production")}),
                }
                deployed_resource = compute_client.virtual_machines.begin_create_or_update(rg_name, resource_name, vm_params).result()

            elif resource_type in ("storageaccount", "storage"):
                sku = plan.get("sku", "Standard_GRS")
                kind = plan.get("kind", "StorageV2")
                sa_params = {
                    "location": location,
                    "sku": {"name": sku},
                    "kind": kind,
                    "tags": plan.get("tags", {"managedBy": "InfraLift"}),
                }
                deployed_resource = storage_client.storage_accounts.begin_create(rg_name, resource_name.replace("-", "").lower()[:24], sa_params).result()

            elif resource_type == "resourcegroup":
                deployed_resource = rg_result

            else:
                # Generic ARM deployment
                from azure.mgmt.resource.resources.models import DeploymentProperties, TemplateLink
                arm_template = plan.get("armTemplate", {})
                if arm_template:
                    deployment_props = DeploymentProperties(template=arm_template, mode="Incremental")
                    deployment_result = resource_client.deployments.begin_create_or_update(rg_name, f"deploy-{resource_name}", {"properties": deployment_props}).result()
                    deployed_resource = deployment_result

            yield {"type": "progress", "step": "deploy", "message": f"{resource_type} {resource_name} deployed successfully", "status": "completed"}

        except Exception as e:
            logger.error(f"Deployment failed: {e}", exc_info=True)
            yield {"type": "error", "step": "deploy", "message": f"Deployment failed: {e}"}
            return

        # Step 4: Success
        yield {
            "type": "result",
            "deployment_id": deployment_id,
            "resource_group": rg_name,
            "resource_name": resource_name,
            "resource_type": resource_type,
            "location": location,
            "status": "completed",
        }

    async def get_vm(self, credential: Any, subscription_id: str, rg: str, vm_name: str) -> Optional[Dict[str, Any]]:
        """Get existing VM details"""
        try:
            from azure.mgmt.compute import ComputeManagementClient
            client = ComputeManagementClient(credential, subscription_id)
            vm = client.virtual_machines.get(rg, vm_name)
            return {
                "id": vm.id,
                "name": vm.name,
                "location": vm.location,
                "size": vm.hardware_profile.vm_size,
                "osType": vm.storage_profile.os_disk.os_type,
                "provisioningState": vm.provisioning_state,
                "tags": vm.tags or {},
            }
        except Exception as e:
            logger.error(f"Failed to get VM {vm_name}: {e}")
            return None

    async def update_vm_size(self, credential: Any, subscription_id: str, rg: str, vm_name: str, new_size: str) -> bool:
        """Resize an existing VM"""
        try:
            from azure.mgmt.compute import ComputeManagementClient
            client = ComputeManagementClient(credential, subscription_id)
            vm = client.virtual_machines.get(rg, vm_name)
            vm.hardware_profile.vm_size = new_size
            client.virtual_machines.begin_create_or_update(rg, vm_name, vm).result()
            return True
        except Exception as e:
            logger.error(f"Failed to resize VM {vm_name}: {e}")
            return False


azure_deployment_service = AzureDeploymentService()
