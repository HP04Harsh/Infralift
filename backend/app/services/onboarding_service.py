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
import random


class OnboardingService:
    """Service for onboarding business logic"""
    
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
        Connect to Azure tenant
        In production, this would validate credentials and establish connection
        """
        import asyncio
        await asyncio.sleep(2)  # Simulate connection delay
        
        # Mock tenant validation
        if not request.tenant_id or not request.subscription_id:
            return ConnectTenantResponse(
                success=False,
                message="Tenant ID and Subscription ID are required"
            )
        
        # Update session with connection info
        session_id = f"session:{request.user_id}"
        await session_manager.update_session(
            session_id,
            {
                "tenant_id": request.tenant_id,
                "subscription_id": request.subscription_id,
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
                "display_name": "Azure Subscription",
                "state": "Connected"
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
        """Start resource sync process"""
        session_id = f"session:{user_id}"
        
        # Initialize sync state
        sync_state = {
            "total_resources": 150,
            "synced_resources": 0,
            "failed_resources": 0,
            "progress": 0.0,
            "status": SyncStatus.SYNCING,
            "resources": []
        }
        
        await session_manager.update_session(
            session_id,
            {"resource_sync": sync_state}
        )
        
        return ResourceSync(**sync_state)
    
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
