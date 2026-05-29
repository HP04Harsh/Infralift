from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from app.schemas.onboarding import (
    VerificationRequest,
    VerificationResponse,
    ConnectTenantRequest,
    ConnectTenantResponse,
    ResourceSync,
    SyncStatus,
    Requirement,
    RequirementStatus,
)
from app.core.redis import session_manager
from app.services.azure_auth_service import AzureAuthService
from app.services.azure_sync_service import AzureSyncService
from app.core.config import settings
import random
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
        Verify Azure CLI command execution
        In production, this would call Azure APIs to verify
        """
        # Simulate verification delay
        import asyncio
        await asyncio.sleep(1)
        
        # Mock verification - in production, verify with Azure
        # For demo, random success
        success = random.random() > 0.2  # 80% success rate
        
        if success:
            # Update session with verification status
            session_id = f"session:{request.user_id}"
            await session_manager.update_session(
                session_id,
                {
                    f"verified_cards.{request.card_id}": True,
                    "last_updated": datetime.utcnow().isoformat()
                }
            )
            
            return VerificationResponse(
                success=True,
                message="Assignment verified successfully",
                timestamp=datetime.utcnow()
            )
        else:
            return VerificationResponse(
                success=False,
                message="Verification failed. Please ensure command was executed correctly.",
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
        
        # Perform real Azure validation
        validation_result = await self.azure_auth_service.validate_tenant_connection(
            client_id=request.client_id,
            client_secret=request.client_secret,
            tenant_id=request.tenant_id,
            subscription_id=request.subscription_id
        )
        
        if not validation_result["success"]:
            # Map Azure errors to user-friendly messages
            error_messages = {
                "AUTHENTICATION_FAILED": "Invalid Azure credentials. Please check your Client ID and Secret.",
                "SUBSCRIPTION_NOT_ACCESSIBLE": "The subscription is not accessible with provided credentials.",
                "API_REQUEST_FAILED": "Azure API request failed. Please check your network connection.",
                "VALIDATION_ERROR": "An unexpected error occurred during validation."
            }
            
            error_code = validation_result.get("error", "VALIDATION_ERROR")
            message = error_messages.get(error_code, validation_result.get("message", "Connection failed"))
            
            return ConnectTenantResponse(
                success=False,
                message=message
            )
        
        # Update session with connection info
        session_id = f"session:{request.user_id}"
        await session_manager.update_session(
            session_id,
            {
                "client_id": request.client_id,
                "tenant_id": request.tenant_id,
                "subscription_id": request.subscription_id,
                "environment_name": request.environment_name,
                "connection_details": validation_result,
                "current_step": 3,
                "completed_steps": [1, 2],
                "last_updated": datetime.utcnow().isoformat()
            }
        )
        
        return ConnectTenantResponse(
            success=True,
            message="Tenant connected successfully",
            connection={
                "tenant_id": request.tenant_id,
                "subscription_id": request.subscription_id,
                "display_name": validation_result["subscription"]["display_name"],
                "state": validation_result["subscription"]["state"],
                "providers": validation_result["providers"]
            }
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
                # Initialize sync service if not already done
                from app.core.redis import redis_client
                self.azure_sync_service = AzureSyncService(redis_client)
            
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
                # Sync failed
                failed_sync_state = {
                    "total_resources": 0,
                    "synced_resources": 0,
                    "failed_resources": 0,
                    "progress": 0.0,
                    "status": SyncStatus.FAILED,
                    "current_step": "Failed",
                    "error": sync_result.get("error", "Unknown error"),
                    "message": sync_result.get("message", "Sync failed")
                }
                
                await session_manager.update_session(
                    session_id,
                    {"resource_sync": failed_sync_state}
                )
                
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
