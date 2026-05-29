"""
Azure Resource Sync Service
Handles real-time sync of Azure resources and metrics
"""

from azure.identity import ClientSecretCredential
from azure.mgmt.resource import ResourceManagementClient
from azure.mgmt.compute import ComputeManagementClient
from azure.mgmt.network import NetworkManagementClient
from azure.mgmt.storage import StorageManagementClient
from azure.mgmt.sql import SqlManagementClient
from azure.mgmt.monitor import MonitorManagementClient
from azure.mgmt.advisor import AdvisorManagementClient
from azure.mgmt.security import SecurityCenter
from azure.core.exceptions import HttpResponseError
import logging
from typing import Dict, Any, List
from datetime import datetime, timedelta
import json
import asyncio

logger = logging.getLogger(__name__)


class AzureSyncService:
    """Service for syncing Azure resources and metrics"""
    
    def __init__(self, redis_client):
        self.redis_client = redis_client
        self.sync_status = {}
    
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
        
        try:
            # Step 1: Resource Groups
            self.sync_status[sync_id]["current_step"] = "Fetching Resource Groups"
            self.sync_status[sync_id]["progress"] = 10
            resource_groups = await self._fetch_resource_groups(credentials, subscription_id)
            
            # Step 2: Virtual Machines
            self.sync_status[sync_id]["current_step"] = "Fetching Virtual Machines"
            self.sync_status[sync_id]["progress"] = 25
            virtual_machines = await self._fetch_virtual_machines(credentials, subscription_id)
            
            # Step 3: Network Resources
            self.sync_status[sync_id]["current_step"] = "Fetching Network Resources"
            self.sync_status[sync_id]["progress"] = 40
            network_resources = await self._fetch_network_resources(credentials, subscription_id)
            
            # Step 4: Storage Accounts
            self.sync_status[sync_id]["current_step"] = "Fetching Storage Accounts"
            self.sync_status[sync_id]["progress"] = 55
            storage_accounts = await self._fetch_storage_accounts(credentials, subscription_id)
            
            # Step 5: SQL Databases
            self.sync_status[sync_id]["current_step"] = "Fetching SQL Databases"
            self.sync_status[sync_id]["progress"] = 70
            sql_databases = await self._fetch_sql_databases(credentials, subscription_id)
            
            # Step 6: Monitoring Metrics
            self.sync_status[sync_id]["current_step"] = "Collecting Monitoring Metrics"
            self.sync_status[sync_id]["progress"] = 85
            monitoring_metrics = await self._fetch_monitoring_metrics(credentials, subscription_id)
            
            # Step 7: Advisor Recommendations
            self.sync_status[sync_id]["current_step"] = "Fetching Advisor Recommendations"
            self.sync_status[sync_id]["progress"] = 95
            advisor_recommendations = await self._fetch_advisor_recommendations(credentials, subscription_id)
            
            # Cache all data in Redis
            resource_inventory = {
                "resource_groups": resource_groups,
                "virtual_machines": virtual_machines,
                "network_resources": network_resources,
                "storage_accounts": storage_accounts,
                "sql_databases": sql_databases,
                "monitoring_metrics": monitoring_metrics,
                "advisor_recommendations": advisor_recommendations,
                "synced_at": datetime.utcnow().isoformat(),
                "total_resources": len(resource_groups) + len(virtual_machines) + len(network_resources) + len(storage_accounts)
            }
            
            # Store in Redis with 24-hour expiry
            await self._cache_resource_data(sync_id, resource_inventory)
            
            self.sync_status[sync_id] = {
                "status": "completed",
                "progress": 100,
                "current_step": "Completed",
                "completed_at": datetime.utcnow().isoformat(),
                "total_resources": resource_inventory["total_resources"]
            }
            
            return {
                "success": True,
                "sync_id": sync_id,
                "total_resources": resource_inventory["total_resources"],
                "resource_summary": {
                    "resource_groups": len(resource_groups),
                    "virtual_machines": len(virtual_machines),
                    "network_resources": len(network_resources),
                    "storage_accounts": len(storage_accounts),
                    "sql_databases": len(sql_databases)
                }
            }
            
        except Exception as e:
            logger.error(f"Resource sync failed: {str(e)}")
            self.sync_status[sync_id] = {
                "status": "failed",
                "progress": 0,
                "error": str(e),
                "failed_at": datetime.utcnow().isoformat()
            }
            return {
                "success": False,
                "error": "SYNC_FAILED",
                "message": str(e)
            }
    
    async def _fetch_resource_groups(
        self,
        credentials: ClientSecretCredential,
        subscription_id: str
    ) -> List[Dict[str, Any]]:
        """Fetch all resource groups"""
        try:
            resource_client = ResourceManagementClient(credentials, subscription_id)
            resource_groups = []
            
            async for rg in resource_client.resource_groups.list():
                resource_groups.append({
                    "id": rg.id,
                    "name": rg.name,
                    "location": rg.location,
                    "tags": rg.tags or {},
                    "provisioning_state": rg.provisioning_state
                })
            
            return resource_groups
        except Exception as e:
            logger.error(f"Failed to fetch resource groups: {str(e)}")
            return []
    
    async def _fetch_virtual_machines(
        self,
        credentials: ClientSecretCredential,
        subscription_id: str
    ) -> List[Dict[str, Any]]:
        """Fetch all virtual machines"""
        try:
            compute_client = ComputeManagementClient(credentials, subscription_id)
            virtual_machines = []
            
            async for vm in compute_client.virtual_machines.list_all():
                virtual_machines.append({
                    "id": vm.id,
                    "name": vm.name,
                    "location": vm.location,
                    "vm_size": vm.hardware_profile.vm_size if vm.hardware_profile else None,
                    "os_type": vm.storage_profile.os_disk.os_type if vm.storage_profile and vm.storage_profile.os_disk else None,
                    "provisioning_state": vm.provisioning_state,
                    "power_state": "Unknown"  # Would need instance view
                })
            
            return virtual_machines
        except Exception as e:
            logger.error(f"Failed to fetch virtual machines: {str(e)}")
            return []
    
    async def _fetch_network_resources(
        self,
        credentials: ClientSecretCredential,
        subscription_id: str
    ) -> List[Dict[str, Any]]:
        """Fetch network resources (VNets, NSGs, Load Balancers, Public IPs)"""
        try:
            network_client = NetworkManagementClient(credentials, subscription_id)
            network_resources = []
            
            # Fetch VNets
            async for vnet in network_client.virtual_networks.list_all():
                network_resources.append({
                    "type": "virtual_network",
                    "id": vnet.id,
                    "name": vnet.name,
                    "location": vnet.location,
                    "address_space": vnet.address_space.address_prefixes if vnet.address_space else []
                })
            
            # Fetch NSGs
            async for nsg in network_client.network_security_groups.list_all():
                network_resources.append({
                    "type": "network_security_group",
                    "id": nsg.id,
                    "name": nsg.name,
                    "location": nsg.location,
                    "provisioning_state": nsg.provisioning_state
                })
            
            return network_resources
        except Exception as e:
            logger.error(f"Failed to fetch network resources: {str(e)}")
            return []
    
    async def _fetch_storage_accounts(
        self,
        credentials: ClientSecretCredential,
        subscription_id: str
    ) -> List[Dict[str, Any]]:
        """Fetch storage accounts"""
        try:
            storage_client = StorageManagementClient(credentials, subscription_id)
            storage_accounts = []
            
            async for storage in storage_client.storage_accounts.list():
                storage_accounts.append({
                    "id": storage.id,
                    "name": storage.name,
                    "location": storage.location,
                    "sku": storage.sku.name if storage.sku else None,
                    "kind": storage.kind,
                    "provisioning_state": storage.provisioning_state
                })
            
            return storage_accounts
        except Exception as e:
            logger.error(f"Failed to fetch storage accounts: {str(e)}")
            return []
    
    async def _fetch_sql_databases(
        self,
        credentials: ClientSecretCredential,
        subscription_id: str
    ) -> List[Dict[str, Any]]:
        """Fetch SQL databases"""
        try:
            sql_client = SqlManagementClient(credentials, subscription_id)
            sql_databases = []
            
            async for server in sql_client.servers.list():
                async for db in sql_client.databases.list_by_server(server.resource_group_name, server.name):
                    sql_databases.append({
                        "id": db.id,
                        "name": db.name,
                        "location": server.location,
                        "server_name": server.name,
                        "resource_group": server.resource_group_name,
                        "status": db.status
                    })
            
            return sql_databases
        except Exception as e:
            logger.error(f"Failed to fetch SQL databases: {str(e)}")
            return []
    
    async def _fetch_monitoring_metrics(
        self,
        credentials: ClientSecretCredential,
        subscription_id: str
    ) -> Dict[str, Any]:
        """Fetch monitoring metrics"""
        try:
            monitor_client = MonitorManagementClient(credentials, subscription_id)
            
            # This would fetch actual metrics - simplified for now
            return {
                "cpu_usage": [],
                "memory_usage": [],
                "disk_metrics": [],
                "network_io": [],
                "alerts": [],
                "activity_logs": []
            }
        except Exception as e:
            logger.error(f"Failed to fetch monitoring metrics: {str(e)}")
            return {}
    
    async def _fetch_advisor_recommendations(
        self,
        credentials: ClientSecretCredential,
        subscription_id: str
    ) -> List[Dict[str, Any]]:
        """Fetch Azure Advisor recommendations"""
        try:
            advisor_client = AdvisorManagementClient(credentials, subscription_id)
            recommendations = []
            
            async for recommendation in advisor_client.recommendations.list():
                recommendations.append({
                    "id": recommendation.id,
                    "category": recommendation.category,
                    "impact": recommendation.impact,
                    "problem": recommendation.problem,
                    "solution": recommendation.solution,
                    "recommendation_type": recommendation.recommendation_type
                })
            
            return recommendations
        except Exception as e:
            logger.error(f"Failed to fetch advisor recommendations: {str(e)}")
            return []
    
    async def _cache_resource_data(self, sync_id: str, data: Dict[str, Any]):
        """Cache resource data in Redis"""
        try:
            # Cache with 24-hour expiry
            await self.redis_client.setex(
                f"azure_resources:{sync_id}",
                86400,  # 24 hours
                json.dumps(data)
            )
            
            # Also cache individual resource types for quick access
            await self.redis_client.setex(
                f"azure_summary:{sync_id}",
                86400,
                json.dumps({
                    "total_resources": data["total_resources"],
                    "resource_summary": data["resource_summary"],
                    "synced_at": data["synced_at"]
                })
            )
            
        except Exception as e:
            logger.error(f"Failed to cache resource data: {str(e)}")
    
    async def get_sync_status(self, sync_id: str) -> Dict[str, Any]:
        """Get current sync status"""
        return self.sync_status.get(sync_id, {"status": "not_started"})
    
    async def get_cached_resources(self, sync_id: str) -> Optional[Dict[str, Any]]:
        """Get cached resources from Redis"""
        try:
            data = await self.redis_client.get(f"azure_resources:{sync_id}")
            if data:
                return json.loads(data)
        except Exception as e:
            logger.error(f"Failed to get cached resources: {str(e)}")
        return None