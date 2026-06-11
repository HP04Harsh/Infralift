"""
Azure Resource Sync Service
Handles real-time sync of Azure resources, metrics, costs, and security
"""

from typing import Optional, Dict, Any
from azure.identity import ClientSecretCredential
from azure.mgmt.resource import ResourceManagementClient
from azure.mgmt.compute import ComputeManagementClient
from azure.mgmt.network import NetworkManagementClient
from azure.mgmt.storage import StorageManagementClient
from azure.mgmt.sql import SqlManagementClient
from azure.mgmt.monitor import MonitorManagementClient
from azure.mgmt.advisor import AdvisorManagementClient
from azure.mgmt.security import SecurityCenter
from azure.mgmt.costmanagement import CostManagementClient
from azure.mgmt.costmanagement.models import QueryDefinition, TimeframeType, GranularityType
from azure.mgmt.resourcegraph import ResourceGraphClient
from azure.mgmt.resourcegraph.models import QueryRequest
from azure.core.exceptions import HttpResponseError
import logging
from typing import Dict, Any, List, Callable, TypeVar
from datetime import datetime, timedelta
import json
import asyncio
import httpx
import random

from app.core.config import settings

T = TypeVar("T")

logger = logging.getLogger(__name__)


class AzureSyncService:
    """Service for syncing Azure resources and metrics"""

    def __init__(self, redis_client):
        self.redis_client = redis_client
        self.sync_status = {}

    async def _retry_with_backoff(self, step_name: str, fn: Callable[[], T], max_retries: int = 3) -> T:
        """Execute a function with exponential backoff retry."""
        for attempt in range(max_retries + 1):
            try:
                return await fn()
            except Exception as e:
                if attempt < max_retries:
                    wait = (2 ** attempt) + random.uniform(0, 1)
                    logger.warning("%s attempt %d/%d failed: %s. Retrying in %.1fs...", step_name, attempt + 1, max_retries, e, wait)
                    await asyncio.sleep(wait)
                else:
                    logger.error("%s failed after %d attempts: %s", step_name, max_retries + 1, e)
                    raise
        raise RuntimeError(f"{step_name}: unreachable")

    async def sync_tenant_resources(
        self,
        credentials: ClientSecretCredential,
        subscription_id: str,
        tenant_id: str
    ) -> Dict[str, Any]:
        """
        Sync all resources from Azure tenant

        Args:
            credentials: Azure credentials
            subscription_id: Azure subscription ID
            tenant_id: Azure tenant ID

        Returns:
            Dict with sync results and cached resource data
        """
        sync_id = f"{tenant_id}_{subscription_id}"
        self.sync_status[sync_id] = {
            "status": "syncing",
            "progress": 0,
            "current_step": "Initializing",
            "started_at": datetime.utcnow().isoformat()
        }

        errors = {}
        resource_groups = []
        virtual_machines = []
        network_resources = []
        storage_accounts = []
        sql_databases = []
        key_vaults = []
        web_apps = []
        container_instances = []
        monitoring_metrics = {"virtual_machines": [], "storage_accounts": [], "sql_databases": []}
        cost_data = self._empty_cost_data()
        security_findings = {"secure_score": 0, "secure_score_percentage": 0, "alerts": []}
        advisor_recommendations = {"recommendations": [], "count": 0}

        try:
            # Step 0: Azure Resource Graph — authoritative resource count
            self.sync_status[sync_id]["current_step"] = "Querying Azure Resource Graph"
            self.sync_status[sync_id]["progress"] = 2
            rg_summary = await self._retry_with_backoff(
                "resource_graph", lambda: self._fetch_resource_graph_summary(credentials, subscription_id)
            )
            logger.info(
                "Resource Graph: %d total resources, %d VMs, %d resource groups (error=%s)",
                rg_summary.get("resources", 0),
                rg_summary.get("virtual_machines", 0),
                rg_summary.get("resource_groups", 0),
                rg_summary.get("error", "none")
            )

            # Step 1: Resource Groups
            self.sync_status[sync_id]["current_step"] = "Fetching Resource Groups"
            self.sync_status[sync_id]["progress"] = 5
            try:
                resource_groups = await self._retry_with_backoff(
                    "resource_groups", lambda: self._fetch_resource_groups(credentials, subscription_id)
                )
            except Exception as e:
                errors["resource_groups"] = str(e)
                resource_groups = []

            # Step 2: Virtual Machines
            self.sync_status[sync_id]["current_step"] = "Fetching Virtual Machines"
            self.sync_status[sync_id]["progress"] = 15
            try:
                virtual_machines = await self._retry_with_backoff(
                    "virtual_machines", lambda: self._fetch_virtual_machines(credentials, subscription_id)
                )
            except Exception as e:
                errors["virtual_machines"] = str(e)
                virtual_machines = []

            # Step 3: Network Resources
            self.sync_status[sync_id]["current_step"] = "Fetching Network Resources"
            self.sync_status[sync_id]["progress"] = 25
            try:
                network_resources = await self._retry_with_backoff(
                    "network_resources", lambda: self._fetch_network_resources(credentials, subscription_id)
                )
            except Exception as e:
                errors["network_resources"] = str(e)
                network_resources = []

            # Step 4: Storage Accounts
            self.sync_status[sync_id]["current_step"] = "Fetching Storage Accounts"
            self.sync_status[sync_id]["progress"] = 35
            try:
                storage_accounts = await self._retry_with_backoff(
                    "storage_accounts", lambda: self._fetch_storage_accounts(credentials, subscription_id)
                )
            except Exception as e:
                errors["storage_accounts"] = str(e)
                storage_accounts = []

            # Step 5: SQL Databases
            self.sync_status[sync_id]["current_step"] = "Fetching SQL Databases"
            self.sync_status[sync_id]["progress"] = 45
            try:
                sql_databases = await self._retry_with_backoff(
                    "sql_databases", lambda: self._fetch_sql_databases(credentials, subscription_id)
                )
            except Exception as e:
                errors["sql_databases"] = str(e)
                sql_databases = []

            # Step 6: Key Vaults
            self.sync_status[sync_id]["current_step"] = "Fetching Key Vaults"
            self.sync_status[sync_id]["progress"] = 50
            try:
                key_vaults = await self._retry_with_backoff(
                    "key_vaults", lambda: self._fetch_key_vaults(credentials, subscription_id)
                )
            except Exception as e:
                errors["key_vaults"] = str(e)
                key_vaults = []

            # Step 7: Web Apps
            self.sync_status[sync_id]["current_step"] = "Fetching App Services"
            self.sync_status[sync_id]["progress"] = 55
            try:
                web_apps = await self._retry_with_backoff(
                    "web_apps", lambda: self._fetch_web_apps(credentials, subscription_id)
                )
            except Exception as e:
                errors["web_apps"] = str(e)
                web_apps = []

            # Step 8: Container Instances
            self.sync_status[sync_id]["current_step"] = "Fetching Container Instances"
            self.sync_status[sync_id]["progress"] = 60
            try:
                container_instances = await self._retry_with_backoff(
                    "container_instances", lambda: self._fetch_container_instances(credentials, subscription_id)
                )
            except Exception as e:
                errors["container_instances"] = str(e)
                container_instances = []

            # Step 9: Monitoring Metrics (runs in thread for sync SDK)
            self.sync_status[sync_id]["current_step"] = "Collecting Monitoring Metrics"
            self.sync_status[sync_id]["progress"] = 70
            vm_ids = [vm["id"] for vm in virtual_machines]
            storage_ids = [s["id"] for s in storage_accounts]
            sql_ids = [db["id"] for db in sql_databases]
            try:
                monitoring_metrics = await self._retry_with_backoff(
                    "monitoring_metrics",
                    lambda: self._fetch_monitoring_metrics(credentials, subscription_id, vm_ids, storage_ids, sql_ids)
                )
            except Exception as e:
                errors["monitoring_metrics"] = str(e)
                monitoring_metrics = {"virtual_machines": [], "storage_accounts": [], "sql_databases": []}

            # Step 10: Cost Data
            self.sync_status[sync_id]["current_step"] = "Fetching Cost Data"
            self.sync_status[sync_id]["progress"] = 80
            try:
                cost_data = await self._retry_with_backoff(
                    "cost_data", lambda: self._fetch_cost_data(credentials, subscription_id)
                )
            except Exception as e:
                errors["cost_data"] = str(e)
                cost_data = self._empty_cost_data()

            # Step 11: Security Findings
            self.sync_status[sync_id]["current_step"] = "Fetching Security Findings"
            self.sync_status[sync_id]["progress"] = 87
            try:
                security_findings = await self._retry_with_backoff(
                    "security_findings", lambda: self._fetch_security_findings(credentials, subscription_id)
                )
            except Exception as e:
                errors["security_findings"] = str(e)
                security_findings = {"secure_score": 0, "secure_score_percentage": 0, "alerts": []}

            # Step 12: Azure Policy Compliance
            self.sync_status[sync_id]["current_step"] = "Fetching Policy Compliance"
            self.sync_status[sync_id]["progress"] = 92
            try:
                compliance_data = await self._retry_with_backoff(
                    "compliance", lambda: self._fetch_compliance_data(credentials, subscription_id)
                )
            except Exception as e:
                errors["compliance"] = str(e)
                compliance_data = {}

            # Step 13: Advisor Recommendations
            self.sync_status[sync_id]["current_step"] = "Fetching Advisor Recommendations"
            self.sync_status[sync_id]["progress"] = 95
            try:
                advisor_recommendations = await self._retry_with_backoff(
                    "advisor_recommendations", lambda: self._fetch_advisor_recommendations(credentials, subscription_id)
                )
            except Exception as e:
                errors["advisor_recommendations"] = str(e)
                advisor_recommendations = {"recommendations": [], "count": 0}

            # Use Resource Graph count as authoritative (more accurate than summing individual API calls)
            rg_total = rg_summary.get("resources", 0)
            total_resources = rg_total if rg_total > 0 else (
                len(resource_groups) + len(virtual_machines) + len(network_resources) +
                len(storage_accounts) + len(sql_databases) + len(key_vaults) +
                len(web_apps) + len(container_instances)
            )

            # Cache all data in Redis
            resource_inventory = {
                "resource_groups": resource_groups,
                "virtual_machines": virtual_machines,
                "network_resources": network_resources,
                "storage_accounts": storage_accounts,
                "sql_databases": sql_databases,
                "key_vaults": key_vaults,
                "web_apps": web_apps,
                "container_instances": container_instances,
                "monitoring_metrics": monitoring_metrics,
                "cost_data": cost_data,
                "security_findings": security_findings,
                "compliance_data": compliance_data,
                "advisor_recommendations": advisor_recommendations,
                "synced_at": datetime.utcnow().isoformat(),
                "total_resources": total_resources
            }

            await self._cache_resource_data(sync_id, resource_inventory)

            sync_status = "completed_with_errors" if errors else "completed"
            self.sync_status[sync_id] = {
                "status": sync_status,
                "progress": 100,
                "current_step": "Completed" if not errors else f"Completed with {len(errors)} error(s)",
                "completed_at": datetime.utcnow().isoformat(),
                "total_resources": total_resources,
                "errors": errors if errors else None,
            }

            result = {
                "success": not errors,
                "sync_id": sync_id,
                "total_resources": total_resources,
                "errors": errors if errors else None,
                "resource_summary": {
                    "resource_groups": len(resource_groups),
                    "virtual_machines": len(virtual_machines),
                    "network_resources": len(network_resources),
                    "storage_accounts": len(storage_accounts),
                    "sql_databases": len(sql_databases),
                    "key_vaults": len(key_vaults),
                    "web_apps": len(web_apps),
                    "container_instances": len(container_instances)
                }
            }
            return result

        except Exception as e:
            logger.error(f"Resource sync failed: {str(e)}")
            errors["sync_fatal"] = str(e)
            # Still report partial results if any data was collected
            status = "failed" if not errors else ("completed_with_errors" if errors else "completed")
            self.sync_status[sync_id] = {
                "status": status,
                "progress": 0 if "sync_fatal" in errors and not resource_groups else 50,
                "error": str(e) if "sync_fatal" in errors else None,
                "errors": errors,
                "failed_at": datetime.utcnow().isoformat()
            }
            return {
                "success": status != "failed",
                "error": "SYNC_FAILED" if "sync_fatal" in errors else None,
                "errors": errors,
                "message": str(e) if "sync_fatal" in errors else "Partial sync completed with errors"
            }

    def _empty_cost_data(self) -> Dict[str, Any]:
        return {
            "month_to_date": 0,
            "forecast": 0,
            "cost_by_resource_group": {},
            "cost_by_service": {},
            "currency": ""
        }

    async def _fetch_resource_graph_summary(
        self,
        credentials: ClientSecretCredential,
        subscription_id: str
    ) -> Dict[str, Any]:
        """Use Azure Resource Graph to get accurate resource counts across all types"""
        result = {
            "resource_groups": 0,
            "virtual_machines": 0,
            "resources": 0,
            "error": None
        }
        try:
            loop = asyncio.get_event_loop()
            def _sync():
                client = ResourceGraphClient(credentials)
                query = """
                resources
                | where subscriptionId == '""" + subscription_id + """'
                | summarize count() by type
                | project type, count_
                """
                request = QueryRequest(query=query, subscriptions=[subscription_id])
                response = client.resources(request)
                counts = {}
                total = 0
                for row in response.data:
                    if hasattr(row, 'count_'):
                        total += row.count_
                        counts[row.type] = row.count_
                return {"counts": counts, "total": total}
            summary = await loop.run_in_executor(None, _sync)
            result["resources"] = summary["total"]
            result["virtual_machines"] = summary["counts"].get("microsoft.compute/virtualmachines", 0)
            result["resource_groups"] = summary["counts"].get("microsoft.resources/subscriptions/resourcegroups", 0)
            return result
        except ImportError:
            logger.warning("azure-mgmt-resourcegraph not installed — falling back to individual SDK calls")
            result["error"] = "ResourceGraph SDK not available"
            return result
        except Exception as e:
            logger.error(f"Azure Resource Graph query failed: {str(e)}")
            result["error"] = str(e)
            return result

    async def _fetch_resource_groups(
        self,
        credentials: ClientSecretCredential,
        subscription_id: str
    ) -> List[Dict[str, Any]]:
        try:
            loop = asyncio.get_event_loop()
            def _sync():
                client = ResourceManagementClient(credentials, subscription_id)
                result = []
                for rg in client.resource_groups.list():
                    result.append({
                        "id": rg.id,
                        "name": rg.name,
                        "location": rg.location,
                        "tags": rg.tags or {},
                        "provisioning_state": rg.provisioning_state
                    })
                return result
            return await loop.run_in_executor(None, _sync)
        except Exception as e:
            logger.error(f"Failed to fetch resource groups: {str(e)}")
            return []

    async def _fetch_virtual_machines(
        self,
        credentials: ClientSecretCredential,
        subscription_id: str
    ) -> List[Dict[str, Any]]:
        try:
            loop = asyncio.get_event_loop()
            def _sync():
                client = ComputeManagementClient(credentials, subscription_id)
                result = []
                for vm in client.virtual_machines.list_all():
                    vm_size = vm.hardware_profile.vm_size if vm.hardware_profile else None
                    os_type = vm.storage_profile.os_disk.os_type if vm.storage_profile and vm.storage_profile.os_disk else None

                    # Get power state via instance view
                    power_state = "Unknown"
                    try:
                        rg_name = vm.id.split("/resourceGroups/")[1].split("/")[0] if vm.id else None
                        if rg_name:
                            instance_view = client.virtual_machines.instance_view(rg_name, vm.name)
                            for status in instance_view.statuses:
                                if status.code and "PowerState" in status.code:
                                    power_state = status.code.split("/")[-1] if "/" in status.code else status.code
                                    break
                    except Exception:
                        pass

                    result.append({
                        "id": vm.id,
                        "name": vm.name,
                        "location": vm.location,
                        "vm_size": vm_size,
                        "os_type": os_type,
                        "provisioning_state": vm.provisioning_state,
                        "power_state": power_state,
                        "resource_group": vm.id.split("/resourceGroups/")[1].split("/")[0] if vm.id else None
                    })
                return result
            return await loop.run_in_executor(None, _sync)
        except Exception as e:
            logger.error(f"Failed to fetch virtual machines: {str(e)}")
            return []

    async def _fetch_network_resources(
        self,
        credentials: ClientSecretCredential,
        subscription_id: str
    ) -> List[Dict[str, Any]]:
        try:
            loop = asyncio.get_event_loop()
            def _sync():
                client = NetworkManagementClient(credentials, subscription_id)
                result = []

                for vnet in client.virtual_networks.list_all():
                    result.append({
                        "type": "virtual_network",
                        "id": vnet.id,
                        "name": vnet.name,
                        "location": vnet.location,
                        "address_space": vnet.address_space.address_prefixes if vnet.address_space else [],
                        "resource_group": vnet.id.split("/resourceGroups/")[1].split("/")[0] if vnet.id else None
                    })

                for nsg in client.network_security_groups.list_all():
                    result.append({
                        "type": "network_security_group",
                        "id": nsg.id,
                        "name": nsg.name,
                        "location": nsg.location,
                        "provisioning_state": nsg.provisioning_state,
                        "resource_group": nsg.id.split("/resourceGroups/")[1].split("/")[0] if nsg.id else None
                    })

                for lb in client.load_balancers.list_all():
                    result.append({
                        "type": "load_balancer",
                        "id": lb.id,
                        "name": lb.name,
                        "location": lb.location,
                        "provisioning_state": lb.provisioning_state,
                        "sku": lb.sku.name if lb.sku else None,
                        "resource_group": lb.id.split("/resourceGroups/")[1].split("/")[0] if lb.id else None
                    })

                for pip in client.public_ip_addresses.list_all():
                    result.append({
                        "type": "public_ip",
                        "id": pip.id,
                        "name": pip.name,
                        "location": pip.location,
                        "ip_address": pip.ip_address,
                        "sku": pip.sku.name if pip.sku else None,
                        "resource_group": pip.id.split("/resourceGroups/")[1].split("/")[0] if pip.id else None
                    })

                return result
            return await loop.run_in_executor(None, _sync)
        except Exception as e:
            logger.error(f"Failed to fetch network resources: {str(e)}")
            return []

    async def _fetch_storage_accounts(
        self,
        credentials: ClientSecretCredential,
        subscription_id: str
    ) -> List[Dict[str, Any]]:
        try:
            loop = asyncio.get_event_loop()
            def _sync():
                client = StorageManagementClient(credentials, subscription_id)
                result = []
                for storage in client.storage_accounts.list():
                    result.append({
                        "id": storage.id,
                        "name": storage.name,
                        "location": storage.location,
                        "sku": storage.sku.name if storage.sku else None,
                        "kind": storage.kind,
                        "provisioning_state": storage.provisioning_state,
                        "resource_group": storage.id.split("/resourceGroups/")[1].split("/")[0] if storage.id else None
                    })
                return result
            return await loop.run_in_executor(None, _sync)
        except Exception as e:
            logger.error(f"Failed to fetch storage accounts: {str(e)}")
            return []

    async def _fetch_sql_databases(
        self,
        credentials: ClientSecretCredential,
        subscription_id: str
    ) -> List[Dict[str, Any]]:
        try:
            loop = asyncio.get_event_loop()
            def _sync():
                client = SqlManagementClient(credentials, subscription_id)
                result = []
                for server in client.servers.list():
                    rg_name = server.id.split("/resourceGroups/")[1].split("/")[0] if server.id else None
                    if not rg_name:
                        continue
                    for db in client.databases.list_by_server(rg_name, server.name):
                        result.append({
                            "id": db.id,
                            "name": db.name,
                            "location": server.location,
                            "server_name": server.name,
                            "resource_group": rg_name,
                            "status": db.status,
                            "sku": str(db.sku) if db.sku else None
                        })
                return result
            return await loop.run_in_executor(None, _sync)
        except Exception as e:
            logger.error(f"Failed to fetch SQL databases: {str(e)}")
            return []

    async def _fetch_key_vaults(
        self,
        credentials: ClientSecretCredential,
        subscription_id: str
    ) -> List[Dict[str, Any]]:
        try:
            loop = asyncio.get_event_loop()
            def _sync():
                from azure.mgmt.keyvault import KeyVaultManagementClient
                client = KeyVaultManagementClient(credentials, subscription_id)
                result = []
                for vault in client.vaults.list_by_subscription():
                    result.append({
                        "id": vault.id,
                        "name": vault.name,
                        "location": vault.location,
                        "sku": vault.properties.sku.name if vault.properties and vault.properties.sku else None,
                        "tenant_id": str(vault.properties.tenant_id) if vault.properties and vault.properties.tenant_id else None,
                        "resource_group": vault.id.split("/resourceGroups/")[1].split("/")[0] if vault.id else None
                    })
                return result
            return await loop.run_in_executor(None, _sync)
        except Exception as e:
            logger.error(f"Failed to fetch key vaults: {str(e)}")
            return []

    async def _fetch_web_apps(
        self,
        credentials: ClientSecretCredential,
        subscription_id: str
    ) -> List[Dict[str, Any]]:
        try:
            loop = asyncio.get_event_loop()
            def _sync():
                from azure.mgmt.web import WebSiteManagementClient
                client = WebSiteManagementClient(credentials, subscription_id)
                result = []
                for app in client.web_apps.list():
                    result.append({
                        "id": app.id,
                        "name": app.name,
                        "location": app.location,
                        "kind": app.kind,
                        "state": app.state,
                        "resource_group": app.id.split("/resourceGroups/")[1].split("/")[0] if app.id else None
                    })
                return result
            return await loop.run_in_executor(None, _sync)
        except Exception as e:
            logger.error(f"Failed to fetch web apps: {str(e)}")
            return []

    async def _fetch_container_instances(
        self,
        credentials: ClientSecretCredential,
        subscription_id: str
    ) -> List[Dict[str, Any]]:
        try:
            loop = asyncio.get_event_loop()
            def _sync():
                from azure.mgmt.containerinstance import ContainerInstanceManagementClient
                client = ContainerInstanceManagementClient(credentials, subscription_id)
                result = []
                for cg in client.container_groups.list():
                    result.append({
                        "id": cg.id,
                        "name": cg.name,
                        "location": cg.location,
                        "provisioning_state": cg.provisioning_state,
                        "restart_policy": str(cg.restart_policy) if cg.restart_policy else None,
                        "os_type": str(cg.os_type) if cg.os_type else None,
                        "resource_group": cg.id.split("/resourceGroups/")[1].split("/")[0] if cg.id else None
                    })
                return result
            return await loop.run_in_executor(None, _sync)
        except Exception as e:
            logger.error(f"Failed to fetch container instances: {str(e)}")
            return []

    async def _fetch_monitoring_metrics(
        self,
        credentials: ClientSecretCredential,
        subscription_id: str,
        vm_ids: List[str],
        storage_ids: List[str],
        sql_ids: List[str]
    ) -> Dict[str, Any]:
        try:
            loop = asyncio.get_event_loop()
            def _sync():
                client = MonitorManagementClient(credentials, subscription_id)
                now = datetime.utcnow()
                timespan = f"{ (now - timedelta(hours=24)).isoformat() }/{ now.isoformat() }"

                vm_metrics = []
                for vm_id in vm_ids[:20]:  # Limit to first 20 VMs for performance
                    try:
                        metrics = client.metrics.list(
                            resource_uri=vm_id,
                            timespan=timespan,
                            interval="PT1H",
                            metricnames="Percentage CPU,Available Memory,Disk Read Bytes/sec,Disk Write Bytes/sec,Network In,Network Out",
                            aggregation="Average,Maximum"
                        )
                        vm_data = {"resource_id": vm_id, "metrics": {}}
                        for metric in metrics.value:
                            vm_data["metrics"][metric.name.value] = {
                                "unit": metric.unit,
                                "timeseries": [
                                    {
                                        "timestamp": str(point.timestamp),
                                        "average": point.average,
                                        "maximum": point.maximum
                                    }
                                    for ts in metric.timeseries
                                    for point in ts.data if point.average is not None
                                ][-24:]  # Last 24 data points
                            }
                        vm_metrics.append(vm_data)
                    except Exception:
                        pass

                storage_metrics = []
                for s_id in storage_ids[:10]:
                    try:
                        metrics = client.metrics.list(
                            resource_uri=s_id,
                            timespan=timespan,
                            interval="PT1H",
                            metricnames="UsedCapacity,Transactions,Ingress,Egress",
                            aggregation="Average,Total"
                        )
                        s_data = {"resource_id": s_id, "metrics": {}}
                        for metric in metrics.value:
                            s_data["metrics"][metric.name.value] = {
                                "unit": metric.unit,
                                "timeseries": [
                                    {
                                        "timestamp": str(point.timestamp),
                                        "average": point.average,
                                        "total": point.total
                                    }
                                    for ts in metric.timeseries
                                    for point in ts.data if point.average is not None
                                ][-24:]
                            }
                        storage_metrics.append(s_data)
                    except Exception:
                        pass

                sql_metrics = []
                for db_id in sql_ids[:10]:
                    try:
                        metrics = client.metrics.list(
                            resource_uri=db_id,
                            timespan=timespan,
                            interval="PT1H",
                            metricnames="dtu_consumption_percent,storage,connection_successful,sessions_percent",
                            aggregation="Average,Maximum"
                        )
                        db_data = {"resource_id": db_id, "metrics": {}}
                        for metric in metrics.value:
                            db_data["metrics"][metric.name.value] = {
                                "unit": metric.unit,
                                "timeseries": [
                                    {
                                        "timestamp": str(point.timestamp),
                                        "average": point.average,
                                        "maximum": point.maximum
                                    }
                                    for ts in metric.timeseries
                                    for point in ts.data if point.average is not None
                                ][-24:]
                            }
                        sql_metrics.append(db_data)
                    except Exception:
                        pass

                return {
                    "virtual_machines": vm_metrics,
                    "storage_accounts": storage_metrics,
                    "sql_databases": sql_metrics,
                    "timespan": timespan,
                    "interval": "PT1H"
                }
            return await loop.run_in_executor(None, _sync)
        except Exception as e:
            logger.error(f"Failed to fetch monitoring metrics: {str(e)}")
            return {"virtual_machines": [], "storage_accounts": [], "sql_databases": [], "error": str(e)}

    async def _fetch_billing_currency(
        self,
        credentials: ClientSecretCredential,
        subscription_id: str
    ) -> str:
        """Fetch the tenant's actual billing currency from Azure APIs"""
        token = credentials.get_token("https://management.azure.com/.default")
        headers = {"Authorization": f"Bearer {token.token}"}

        # Try Consumption Usage Details API (works for all subscription types)
        try:
            usage_url = f"https://management.azure.com/subscriptions/{subscription_id}/providers/Microsoft.Consumption/usageDetails"
            params = {"api-version": "2023-11-01", "$top": "1"}
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(usage_url, params=params, headers=headers)
                if resp.status_code == 200:
                    values = resp.json().get("value", [])
                    if values:
                        currency = values[0].get("properties", {}).get("billingCurrency")
                        if currency:
                            logger.info(f"Detected billing currency from Consumption API: {currency}")
                            return currency
        except Exception as e:
            logger.warning(f"Consumption API currency fetch failed: {e}")

        # Fallback: Try Billing Account API
        try:
            billing_url = "https://management.azure.com/providers/Microsoft.Billing/billingAccounts"
            params = {"api-version": "2024-03-01-preview"}
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(billing_url, params=params, headers=headers)
                if resp.status_code == 200:
                    accounts = resp.json().get("value", [])
                    if accounts:
                        props = accounts[0].get("properties", {})
                        currency = (
                            (props.get("enrollmentDetails") or {}).get("currency")
                            or props.get("billingCurrencyCode")
                        )
                        if currency:
                            logger.info(f"Detected billing currency from Billing API: {currency}")
                            return currency
        except Exception as e:
            logger.warning(f"Billing API currency fetch failed: {e}")

        # Fallback: Try subscription display name / location to infer currency
        try:
            from azure.mgmt.resource import SubscriptionClient
            sub_client = SubscriptionClient(credentials)
            subscription = sub_client.subscriptions.get(subscription_id)
            if subscription:
                region_map = {
                    "india": "INR", "europe": "EUR", "uk": "GBP", "japan": "JPY",
                    "korea": "KRW", "brazil": "BRL", "australia": "AUD", "canada": "CAD",
                    "uae": "AED", "singapore": "SGD", "hong kong": "HKD", "switzerland": "CHF",
                }
                display = (subscription.display_name or "").lower()
                for key, cur in region_map.items():
                    if key in display:
                        logger.info(f"Detected currency from subscription name: {cur}")
                        return cur
        except Exception as e:
            logger.warning(f"Subscription-based currency detection failed: {e}")

        # Use env override if set
        if settings.DEFAULT_BILLING_CURRENCY:
            logger.info(f"Using DEFAULT_BILLING_CURRENCY env override: {settings.DEFAULT_BILLING_CURRENCY}")
            return settings.DEFAULT_BILLING_CURRENCY

        logger.info("Could not detect billing currency")
        return ""

    async def _fetch_cost_data(
        self,
        credentials: ClientSecretCredential,
        subscription_id: str
    ) -> Dict[str, Any]:
        # Fetch actual billing currency first (set default before try for except block)
        billing_currency = await self._fetch_billing_currency(credentials, subscription_id)
        try:
            loop = asyncio.get_event_loop()
            def _sync():
                client = CostManagementClient(credentials)
                scope = f"/subscriptions/{subscription_id}"

                # Monthly actual cost by resource group
                monthly_query = QueryDefinition(
                    type="ActualCost",
                    timeframe=TimeframeType.MONTH_TO_DATE,
                    dataset={
                        "granularity": GranularityType.DAILY,
                        "aggregation": {
                            "totalCost": {
                                "name": "PreTaxCost",
                                "function": "Sum"
                            }
                        },
                        "grouping": [
                            {
                                "type": "Dimension",
                                "name": "ResourceGroupName"
                            }
                        ]
                    }
                )

                monthly_result = client.query.usage(scope=scope, parameters=monthly_query)
                monthly_cost = 0.0
                cost_by_resource_group = {}
                daily_costs = []

                if monthly_result.rows:
                    for row in monthly_result.rows:
                        if len(row) >= 2:
                            cost_by_resource_group[row[1]] = cost_by_resource_group.get(row[1], 0.0) + float(row[0])
                            monthly_cost += float(row[0])

                # Cost by service (for per-service breakdown)
                service_query = QueryDefinition(
                    type="ActualCost",
                    timeframe=TimeframeType.MONTH_TO_DATE,
                    dataset={
                        "granularity": GranularityType.DAILY,
                        "aggregation": {
                            "totalCost": {
                                "name": "PreTaxCost",
                                "function": "Sum"
                            }
                        },
                        "grouping": [
                            {
                                "type": "Dimension",
                                "name": "ServiceName"
                            }
                        ]
                    }
                )

                service_result = client.query.usage(scope=scope, parameters=service_query)
                cost_by_service = {}
                if service_result.rows:
                    for row in service_result.rows:
                        if len(row) >= 2:
                            cost_by_service[row[1]] = round(float(row[0]), 2)

                # Forecast
                forecast_query = QueryDefinition(
                    type="ActualCost",
                    timeframe=TimeframeType.MONTH_TO_DATE,
                    dataset={
                        "granularity": GranularityType.DAILY,
                        "aggregation": {
                            "totalCost": {
                                "name": "PreTaxCost",
                                "function": "Sum"
                            }
                        }
                    }
                )

                try:
                    forecast_result = client.query.usage(scope=scope, parameters=forecast_query)
                    forecast_cost = 0.0
                    if forecast_result.rows:
                        for row in forecast_result.rows:
                            if row:
                                forecast_cost += float(row[0])
                except Exception:
                    forecast_cost = monthly_cost * 1.1

                return {
                    "month_to_date": round(monthly_cost, 2),
                    "forecast": round(forecast_cost, 2),
                    "cost_by_resource_group": {k: round(v, 2) for k, v in cost_by_resource_group.items()},
                    "cost_by_service": cost_by_service,
                    "currency": billing_currency,
                    "last_updated": datetime.utcnow().isoformat()
                }
            return await loop.run_in_executor(None, _sync)
        except Exception as e:
            logger.error(f"Failed to fetch cost data: {str(e)}")
            return {
                "month_to_date": 0,
                "forecast": 0,
                "cost_by_resource_group": {},
                "cost_by_service": {},
                "currency": billing_currency,
                "error": str(e)
            }

    async def _fetch_compliance_data(
        self,
        credentials: ClientSecretCredential,
        subscription_id: str
    ) -> Dict[str, Any]:
        """Fetch Azure Policy compliance states and regulatory compliance data"""
        result = {
            "policy_violations": [],
            "regulatory_standards": {},
            "compliant_resources": 0,
            "non_compliant_resources": 0,
            "total_resources_evaluated": 0,
        }
        try:
            token = credentials.get_token("https://management.azure.com/.default")
            headers = {"Authorization": f"Bearer {token.token}"}

            # Azure Policy compliance states
            async with httpx.AsyncClient(timeout=30) as client:
                url = f"https://management.azure.com/subscriptions/{subscription_id}/providers/Microsoft.PolicyInsights/policyStates/latest/queryResults"
                params = {"api-version": "2019-10-01", "$top": 100, "$filter": "complianceState eq 'NonCompliant'"}
                resp = await client.post(url, params=params, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    violations = []
                    for row in data.get("value", []):
                        violations.append({
                            "resource_id": row.get("resourceId", ""),
                            "policy_name": row.get("policyDefinitionName", ""),
                            "policy_display_name": row.get("policyDefinitionDisplayName", ""),
                            "policy_set_name": row.get("policySetDefinitionName", ""),
                            "compliance_state": row.get("complianceState", ""),
                            "severity": row.get("policyDefinitionReferenceId", "medium"),
                        })
                    result["policy_violations"] = violations
                    # Count by compliance state from the summary
                    summary = data.get("@odata.context", "")
                    # Try summary endpoint for counts
                    try:
                        summary_url = f"https://management.azure.com/subscriptions/{subscription_id}/providers/Microsoft.PolicyInsights/policyStates/latest/summarize"
                        summary_resp = await client.post(summary_url, params={"api-version": "2019-10-01"}, headers=headers)
                        if summary_resp.status_code == 200:
                            sdata = summary_resp.json()
                            for item in sdata.get("value", []):
                                for state in item.get("policyAssignments", []):
                                    for s in state.get("results", {}).get("resourceDetails", []):
                                        if s.get("complianceState") == "Compliant":
                                            result["compliant_resources"] += 1
                                        else:
                                            result["non_compliant_resources"] += 1
                                        result["total_resources_evaluated"] += 1
                    except Exception:
                        pass

            # Regulatory compliance standards (via Security Center)
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    reg_url = f"https://management.azure.com/subscriptions/{subscription_id}/providers/Microsoft.Security/regulatoryComplianceStandards"
                    reg_params = {"api-version": "2024-01-01"}
                    reg_resp = await client.get(reg_url, params=reg_params, headers=headers)
                    if reg_resp.status_code == 200:
                        for std in reg_resp.json().get("value", []):
                            std_name = std.get("name", "")
                            props = std.get("properties", {})
                            result["regulatory_standards"][std_name] = {
                                "state": props.get("state", ""),
                                "passed_controls": props.get("passedControls", 0),
                                "failed_controls": props.get("failedControls", 0),
                                "skipped_controls": props.get("skippedControls", 0),
                                "unsupported_controls": props.get("unsupportedControls", 0),
                            }
            except Exception:
                pass

        except Exception as e:
            logger.warning(f"Compliance data fetch failed: {e}")
        return result

    async def _fetch_security_findings(
        self,
        credentials: ClientSecretCredential,
        subscription_id: str
    ) -> Dict[str, Any]:
        try:
            loop = asyncio.get_event_loop()
            def _sync():
                client = SecurityCenter(credentials, subscription_id)

                result = {
                    "secure_score": 0,
                    "secure_score_percentage": 0,
                    "alerts": [],
                    "recommendations": [],
                    "compliance_results": [],
                    "by_severity": {"high": 0, "medium": 0, "low": 0}
                }

                # Secure score
                try:
                    for score in client.secure_scores.list():
                        result["secure_score"] = score.score.current if score.score else 0
                        result["secure_score_percentage"] = score.score.percentage if score.score else 0
                        break
                except Exception:
                    pass

                # Alerts
                try:
                    alerts = []
                    for alert in client.alerts.list():
                        alerts.append({
                            "id": alert.id,
                            "name": alert.name,
                            "severity": alert.severity,
                            "status": alert.status,
                            "description": alert.description,
                            "resource_identifiers": [str(r) for r in (alert.resource_identifiers or [])]
                        })
                        severity = alert.severity.lower() if alert.severity else "low"
                        if severity in result["by_severity"]:
                            result["by_severity"][severity] += 1
                    result["alerts"] = alerts
                except Exception:
                    pass

                return result
            return await loop.run_in_executor(None, _sync)
        except Exception as e:
            logger.error(f"Failed to fetch security findings: {str(e)}")
            return {
                "secure_score": 0,
                "secure_score_percentage": 0,
                "alerts": [],
                "recommendations": [],
                "by_severity": {"high": 0, "medium": 0, "low": 0},
                "error": str(e)
            }

    async def _fetch_advisor_recommendations(
        self,
        credentials: ClientSecretCredential,
        subscription_id: str
    ) -> List[Dict[str, Any]]:
        try:
            loop = asyncio.get_event_loop()
            def _sync():
                client = AdvisorManagementClient(credentials, subscription_id)
                result = []
                for recommendation in client.recommendations.list():
                    potentialSavings = 0
                    resource = ""
                    if recommendation.extended_properties:
                        try:
                            raw = recommendation.extended_properties.get("estimatedMonthlySavings", "0")
                            potentialSavings = float(raw) if raw else 0
                        except (ValueError, TypeError):
                            potentialSavings = 0
                        resource = recommendation.extended_properties.get("resource", "") or ""
                    result.append({
                        "id": recommendation.id,
                        "category": recommendation.category,
                        "impact": recommendation.impact,
                        "problem": recommendation.problem,
                        "solution": recommendation.solution,
                        "recommendation_type": recommendation.recommendation_type,
                        "potentialSavings": potentialSavings,
                        "resource": resource or recommendation.impacted_value or ""
                    })
                return result
            return await loop.run_in_executor(None, _sync)
        except Exception as e:
            logger.error(f"Failed to fetch advisor recommendations: {str(e)}")
            return []

    async def _cache_resource_data(self, sync_id: str, data: Dict[str, Any]):
        """Cache resource data in Redis with per-type TTLs"""
        try:
            # Full inventory: 24-hour expiry
            await self.redis_client.setex(
                f"azure_resources:{sync_id}",
                86400,
                json.dumps(data)
            )

            # Summary without metrics/costs for quick access
            summary = {
                "total_resources": data["total_resources"],
                "resource_summary": {
                    "resource_groups": len(data.get("resource_groups", [])),
                    "virtual_machines": len(data.get("virtual_machines", [])),
                    "network_resources": len(data.get("network_resources", [])),
                    "storage_accounts": len(data.get("storage_accounts", [])),
                    "sql_databases": len(data.get("sql_databases", [])),
                    "key_vaults": len(data.get("key_vaults", [])),
                    "web_apps": len(data.get("web_apps", [])),
                    "container_instances": len(data.get("container_instances", []))
                },
                "synced_at": data["synced_at"],
                "cost_data": data.get("cost_data", {}),
                "security_findings": data.get("security_findings", {}),
                "compliance_data": data.get("compliance_data", {})
            }
            await self.redis_client.setex(
                f"azure_summary:{sync_id}",
                86400,
                json.dumps(summary)
            )

            # Metrics: shorter TTL (5 minutes for near real-time)
            metrics = data.get("monitoring_metrics", {})
            await self.redis_client.setex(
                f"azure_metrics:{sync_id}",
                300,
                json.dumps(metrics)
            )

        except Exception as e:
            logger.error(f"Failed to cache resource data: {str(e)}")

    async def get_sync_status(self, sync_id: str) -> Dict[str, Any]:
        return self.sync_status.get(sync_id, {"status": "not_started"})

    async def get_cached_resources(self, sync_id: str) -> Optional[Dict[str, Any]]:
        try:
            data = await self.redis_client.get(f"azure_resources:{sync_id}")
            if data:
                return json.loads(data)
        except Exception as e:
            logger.error(f"Failed to get cached resources: {str(e)}")
        return None

    async def get_cached_metrics(self, sync_id: str) -> Optional[Dict[str, Any]]:
        try:
            data = await self.redis_client.get(f"azure_metrics:{sync_id}")
            if data:
                return json.loads(data)
        except Exception as e:
            logger.error(f"Failed to get cached metrics: {str(e)}")
        return None

    async def get_cached_summary(self, sync_id: str) -> Optional[Dict[str, Any]]:
        try:
            data = await self.redis_client.get(f"azure_summary:{sync_id}")
            if data:
                return json.loads(data)
        except Exception as e:
            logger.error(f"Failed to get cached summary: {str(e)}")
        return None
