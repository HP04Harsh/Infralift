from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from app.schemas.onboarding import (
    VerificationRequest,
    VerificationResponse,
    ConnectTenantRequest,
    ConnectTenantResponse,
    TenantConnection,
    ResourceSync,
    SyncStatus,
    Requirement,
    RequirementStatus,
)
from app.core.redis import session_manager
from app.services.azure_auth_service import AzureAuthService
from app.services.azure_sync_service import AzureSyncService
from app.services.event_bus import event_bus
from app.core.config import settings
import asyncio
import logging

logger = logging.getLogger(__name__)


class OnboardingService:
    """Service for onboarding business logic"""
    
    def __init__(self):
        self.azure_auth_service = AzureAuthService()
        # Azure sync service will be initialized with redis client
        self.azure_sync_service = None
    
    def set_azure_sync_service(self, redis_client):
        """Initialize Azure sync service with Redis client"""
        self.azure_sync_service = AzureSyncService(redis_client)
    
    async def verify_assignment(self, request: VerificationRequest) -> VerificationResponse:
        """
        Verify Azure CLI command execution by checking actual Azure resource state
        """
        session_id = f"session:{request.user_id}"
        session_data = await session_manager.get_session(session_id)

        cached_creds = None
        if session_data:
            cached_creds = self.azure_auth_service.get_cached_credentials(
                session_data.get("tenant_id", ""),
                session_data.get("subscription_id", "")
            )

        if cached_creds and cached_creds.get("credentials"):
            try:
                from azure.mgmt.resource import ResourceManagementClient
                client = ResourceManagementClient(
                    credential=cached_creds["credentials"],
                    subscription_id=cached_creds["subscription_id"]
                )
                rgs = list(client.resource_groups.list())
                has_resources = len(rgs) > 0
                if has_resources:
                    await session_manager.update_session(
                        session_id,
                        {
                            f"verified_cards.{request.card_id}": True,
                            "last_updated": datetime.utcnow().isoformat()
                        }
                    )
                    return VerificationResponse(
                        success=True,
                        message="Assignment verified — Azure resources detected.",
                        timestamp=datetime.utcnow()
                    )
            except Exception as e:
                logger.warning(f"Azure verification failed: {e}")

        return VerificationResponse(
            success=False,
            message="Verification failed. Azure credentials are needed, or no resources found. Please ensure you completed the assignment correctly and resync.",
            timestamp=datetime.utcnow()
        )
    
    async def connect_tenant(self, request: ConnectTenantRequest) -> ConnectTenantResponse:
        """
        Connect to Azure tenant with real credential validation
        """
        # Validate required fields
        if not all([request.client_id, request.client_secret, request.tenant_id, request.subscription_id]):
            return ConnectTenantResponse(
                success=False,
                message="All fields (Client ID, Client Secret, Tenant ID, Subscription ID) are required"
            )
        
        # Save session data FIRST so it persists even if Azure validation is unavailable
        session_id = f"session:{request.user_id}"
        await self.get_or_create_session(request.user_id)
        await session_manager.update_session(
            session_id,
            {
                "client_id": request.client_id,
                "tenant_id": request.tenant_id,
                "subscription_id": request.subscription_id,
                "environment_name": request.environment_name,
                "current_step": 3,
                "completed_steps": [1, 2],
                "last_updated": datetime.utcnow().isoformat()
            }
        )

        # Build credentials even if validation fails, so sync can use them later
        try:
            from azure.identity import ClientSecretCredential
            creds = ClientSecretCredential(
                tenant_id=request.tenant_id,
                client_id=request.client_id,
                client_secret=request.client_secret
            )
            self.azure_auth_service.credentials_cache[f"{request.tenant_id}_{request.subscription_id}"] = {
                "credentials": creds,
                "tenant_id": request.tenant_id,
                "subscription_id": request.subscription_id
            }
        except Exception:
            pass

        # Perform real Azure validation (optional — session is already saved)
        validation_result = await self.azure_auth_service.validate_tenant_connection(
            client_id=request.client_id,
            client_secret=request.client_secret,
            tenant_id=request.tenant_id,
            subscription_id=request.subscription_id
        )
        
        if not validation_result["success"]:
            # Session data is already saved, so return a partial success
            return ConnectTenantResponse(
                success=True,
                message="Tenant credentials saved. Azure validation could not be completed — you may still sync resources.",
                connection=TenantConnection(
                    tenant_id=request.tenant_id,
                    subscription_id=request.subscription_id,
                    environment_name=request.environment_name,
                    validated=False
                )
            )

        # Update session with validation details
        await session_manager.update_session(
            session_id,
            {"connection_details": validation_result}
        )
        
        return ConnectTenantResponse(
            success=True,
            message="Tenant connected successfully. Credentials saved — you can sync resources now.",
            connection=TenantConnection(
                tenant_id=request.tenant_id,
                subscription_id=request.subscription_id,
                environment_name=request.environment_name,
                validated=True
            )
        )
    
    async def get_sync_status(self, user_id: str) -> ResourceSync:
        """Get resource sync status"""
        session_id = f"session:{user_id}"
        session_data = await session_manager.get_session(session_id)
        
        if session_data and "resource_sync" in session_data:
            return ResourceSync(**session_data["resource_sync"])
        
        return ResourceSync()
    
    async def start_resource_sync(self, user_id: str) -> ResourceSync:
        """Start real Azure resource sync process"""
        session_id = f"session:{user_id}"
        session_data = await session_manager.get_session(session_id)
        
        if not session_data:
            return ResourceSync(
                status=SyncStatus.FAILED,
                message="Session not found"
            )
        
        # Get Azure credentials from session
        cached_creds = self.azure_auth_service.get_cached_credentials(
            session_data["tenant_id"],
            session_data["subscription_id"]
        )
        
        if not cached_creds:
            return ResourceSync(
                status=SyncStatus.FAILED,
                message="Azure credentials not found. Please reconnect tenant."
            )
        
        # Initialize sync state
        sync_state = {
            "total_resources": 0,
            "synced_resources": 0,
            "failed_resources": 0,
            "progress": 0.0,
            "status": SyncStatus.SYNCING,
            "current_step": "Initializing",
            "resources": []
        }
        
        await session_manager.update_session(
            session_id,
            {"resource_sync": sync_state}
        )
        
        # Start real Azure sync in background
        asyncio.create_task(self._perform_azure_sync(user_id, cached_creds))
        
        return ResourceSync(**sync_state)
    
    async def _perform_azure_sync(self, user_id: str, cached_creds: Dict[str, Any]):
        """Perform actual Azure resource sync in background"""
        try:
            session_id = f"session:{user_id}"
            session_data = await session_manager.get_session(session_id)
            
            if not self.azure_sync_service:
                from app.core.redis import session_manager as sm
                redis_c = sm.redis if sm.redis else await sm.connect()
                self.azure_sync_service = AzureSyncService(redis_c)
            
            # Perform real Azure sync
            sync_result = await self.azure_sync_service.sync_tenant_resources(
                credentials=cached_creds["credentials"],
                subscription_id=cached_creds["subscription_id"],
                tenant_id=cached_creds["tenant_id"]
            )
            
            if sync_result["success"]:
                # Update session with sync results
                final_sync_state = {
                    "total_resources": sync_result["total_resources"],
                    "synced_resources": sync_result["total_resources"],
                    "failed_resources": 0,
                    "progress": 100.0,
                    "status": SyncStatus.COMPLETED,
                    "current_step": "Completed",
                    "resource_summary": sync_result["resource_summary"],
                    "synced_at": datetime.utcnow().isoformat()
                }
                
                await session_manager.update_session(
                    session_id,
                    {
                        "resource_sync": final_sync_state,
                        "completed_steps": [1, 2, 3],
                        "current_step": 4,
                        "progress": 75.0,
                        "last_updated": datetime.utcnow().isoformat()
                    }
                )
            else:
                sync_errors = sync_result.get("errors", {}) or {}
                error_msgs = [f"{k}: {v}" for k, v in sync_errors.items()]
                error_detail = sync_result.get("error") or sync_result.get("message") or "; ".join(error_msgs) or "Sync failed"
                failed_sync_state = {
                    "total_resources": sync_result.get("total_resources", 0),
                    "synced_resources": sync_result.get("total_resources", 0),
                    "failed_resources": 0,
                    "progress": 100.0 if sync_result.get("total_resources", 0) > 0 else 0.0,
                    "status": SyncStatus.COMPLETED if sync_result.get("total_resources", 0) > 0 else SyncStatus.FAILED,
                    "current_step": "Completed with errors" if sync_errors else "Failed",
                    "error": error_detail,
                    "resource_summary": sync_result.get("resource_summary"),
                    "synced_at": datetime.utcnow().isoformat()
                }
                
                await session_manager.update_session(
                    session_id,
                    {"resource_sync": failed_sync_state}
                )
                await event_bus.publish("sync.failed", {"session_key": session_id, "error": error_detail})
                
        except Exception as e:
            logger.error(f"Background Azure sync failed: {str(e)}")
            session_id = f"session:{user_id}"
            failed_sync_state = {
                "total_resources": 0,
                "synced_resources": 0,
                "failed_resources": 0,
                "progress": 0.0,
                "status": SyncStatus.FAILED,
                "current_step": "Failed",
                "error": str(e)
            }
            await session_manager.update_session(
                session_id,
                {"resource_sync": failed_sync_state}
            )
            await event_bus.publish("sync.failed", {"session_key": session_id, "error": str(e)})
    
    async def complete_step(self, step: int, user_id: str) -> bool:
        """Mark a step as completed"""
        session_id = f"session:{user_id}"
        
        session_data = await session_manager.get_session(session_id)
        if not session_data:
            return False
        
        completed_steps = session_data.get("completed_steps", [])
        if step not in completed_steps:
            completed_steps.append(step)
        
        # Calculate progress
        progress = (len(completed_steps) / 4) * 100
        
        await session_manager.update_session(
            session_id,
            {
                "completed_steps": completed_steps,
                "current_step": step + 1,
                "progress": progress,
                "last_updated": datetime.utcnow().isoformat()
            }
        )
        
        return True
    
    async def get_requirements(self) -> list[Requirement]:
        """Get system requirements"""
        return [
            Requirement(
                id="req-1",
                name="Azure CLI installed",
                status=RequirementStatus.COMPLETED,
                description="Azure CLI must be installed on your machine"
            ),
            Requirement(
                id="req-2",
                name="Global Admin permissions",
                status=RequirementStatus.WARNING,
                description="Global Admin permissions required for initial setup"
            ),
            Requirement(
                id="req-3",
                name="App registration access",
                status=RequirementStatus.PENDING,
                description="Ability to register applications in Azure AD"
            ),
            Requirement(
                id="req-4",
                name="Management group permissions",
                status=RequirementStatus.WARNING,
                description="Management group access for resource management"
            )
        ]
    
    async def get_or_create_session(self, user_id: str) -> Dict[str, Any]:
        """Get existing session or create new one"""
        session_id = f"session:{user_id}"
        
        session_data = await session_manager.get_session(session_id)
        
        if not session_data:
            # Create new session
            new_session = {
                "user_id": user_id,
                "current_step": 1,
                "completed_steps": [],
                "completed_cards": {},
                "verified_cards": {},
                "progress": 0.0,
                "created_at": datetime.utcnow().isoformat(),
                "expires_at": (datetime.utcnow() + timedelta(hours=24)).isoformat()
            }
            await session_manager.set_session(session_id, new_session)
            return new_session
        
        return session_data


onboarding_service = OnboardingService()
