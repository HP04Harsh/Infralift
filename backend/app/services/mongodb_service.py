"""
MongoDB Resource State Service
Durable deployment state storage with Azure Cosmos DB-compatible schema
"""

import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING
from app.core.config import settings

logger = logging.getLogger(__name__)


class MongoDBService:
    """MongoDB-based persistent deployment state management"""

    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db = None
        self._connected = False

    async def connect(self):
        if self._connected:
            return
        try:
            self.client = AsyncIOMotorClient(
                settings.MONGO_URI,
                serverSelectionTimeoutMS=5000,
            )
            self.db = self.client[settings.MONGO_DB_NAME]
            await self.client.admin.command("ping")
            self._connected = True
            logger.info("Connected to MongoDB at %s", settings.MONGO_URI)

            await self._ensure_indexes()
        except Exception as e:
            logger.error("MongoDB connection failed: %s", e)
            raise

    async def disconnect(self):
        if self.client:
            self.client.close()
            self._connected = False
            logger.info("MongoDB connection closed")

    async def _ensure_indexes(self):
        deployments = self.db.deployments
        await deployments.create_index("deploymentId", unique=True)
        await deployments.create_index("resourceType")
        await deployments.create_index("resourceGroup")
        await deployments.create_index("deploymentStatus")
        await deployments.create_index("createdAt", DESCENDING)

        sn_tickets = self.db.servicenow_tickets
        await sn_tickets.create_index("deploymentId", unique=True)
        await sn_tickets.create_index("serviceNowTicketId")
        await sn_tickets.create_index("deploymentStatus")
        await sn_tickets.create_index("serviceNowSyncStatus")
        await sn_tickets.create_index("createdAt", DESCENDING)

    @property
    def deployments(self):
        return self.db.deployments if self.db else None

    @property
    def servicenow_tickets(self):
        return self.db.servicenow_tickets if self.db else None

    async def save_deployment(self, deployment: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        if "createdAt" not in deployment:
            deployment["createdAt"] = now
        deployment["updatedAt"] = now

        doc_id = deployment.get("deploymentId")
        if not doc_id:
            import uuid
            doc_id = str(uuid.uuid4())
            deployment["deploymentId"] = doc_id

        await self.deployments.replace_one(
            {"deploymentId": doc_id},
            deployment,
            upsert=True,
        )
        logger.info("Deployment state saved to MongoDB: %s", doc_id)
        return deployment

    async def get_deployment(self, deployment_id: str) -> Optional[Dict[str, Any]]:
        doc = await self.deployments.find_one({"deploymentId": deployment_id})
        if doc:
            doc.pop("_id", None)
        return doc

    async def find_deployments(
        self,
        field: str,
        value: str,
    ) -> List[Dict[str, Any]]:
        cursor = self.deployments.find({field: value}).sort("createdAt", DESCENDING).limit(100)
        results = []
        async for doc in cursor:
            doc.pop("_id", None)
            results.append(doc)
        return results

    async def list_all_deployments(self, limit: int = 100, skip: int = 0) -> List[Dict[str, Any]]:
        cursor = self.deployments.find().sort("createdAt", DESCENDING).skip(skip).limit(limit)
        results = []
        async for doc in cursor:
            doc.pop("_id", None)
            results.append(doc)
        return results

    async def update_deployment(
        self,
        deployment_id: str,
        updates: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        updates["updatedAt"] = datetime.now(timezone.utc).isoformat()
        result = await self.deployments.update_one(
            {"deploymentId": deployment_id},
            {"$set": updates},
        )
        if result.modified_count:
            return await self.get_deployment(deployment_id)
        return None

    async def delete_deployment(self, deployment_id: str) -> bool:
        result = await self.deployments.delete_one({"deploymentId": deployment_id})
        return result.deleted_count > 0

    async def count_deployments(self, status: Optional[str] = None) -> int:
        if not self._connected or not self.db:
            return 0
        query = {}
        if status:
            query["deploymentStatus"] = status
        return await self.deployments.count_documents(query)

    # ── ServiceNow Ticket Records ─────────────────────────────────────

    async def save_servicenow_ticket(self, record: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        if "createdAt" not in record:
            record["createdAt"] = now
        record["updatedAt"] = now

        dep_id = record.get("deploymentId")
        if not dep_id:
            return record

        await self.servicenow_tickets.replace_one(
            {"deploymentId": dep_id},
            record,
            upsert=True,
        )
        logger.info("ServiceNow ticket record saved for deployment %s", dep_id)
        return record

    async def get_servicenow_ticket(self, deployment_id: str) -> Optional[Dict[str, Any]]:
        doc = await self.servicenow_tickets.find_one({"deploymentId": deployment_id})
        if doc:
            doc.pop("_id", None)
        return doc

    async def list_servicenow_tickets(
        self,
        limit: int = 100,
        skip: int = 0,
        sync_status: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        query = {}
        if sync_status:
            query["serviceNowSyncStatus"] = sync_status
        cursor = self.servicenow_tickets.find(query).sort("createdAt", DESCENDING).skip(skip).limit(limit)
        results = []
        async for doc in cursor:
            doc.pop("_id", None)
            results.append(doc)
        return results

    async def update_servicenow_ticket(self, deployment_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        updates["updatedAt"] = datetime.now(timezone.utc).isoformat()
        result = await self.servicenow_tickets.update_one(
            {"deploymentId": deployment_id},
            {"$set": updates},
        )
        if result.modified_count:
            return await self.find_servicenow_ticket(deployment_id)
        return None

    async def find_servicenow_ticket(self, deployment_id: str) -> Optional[Dict[str, Any]]:
        return await self.servicenow_tickets.find_one({"deploymentId": deployment_id})

    async def count_servicenow_tickets(self, sync_status: Optional[str] = None) -> int:
        query = {}
        if sync_status:
            query["serviceNowSyncStatus"] = sync_status
        return await self.servicenow_tickets.count_documents(query)


mongodb_service = MongoDBService()
