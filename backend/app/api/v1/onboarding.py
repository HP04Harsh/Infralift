from fastapi import APIRouter, HTTPException, Depends
from app.schemas.onboarding import (
    VerificationRequest,
    VerificationResponse,
    ConnectTenantRequest,
    ConnectTenantResponse,
    ResourceSync,
    CompleteStepRequest,
    SessionResponse,
)
from app.services.onboarding_service import onboarding_service

router = APIRouter()


@router.post("/verify", response_model=VerificationResponse)
async def verify_assignment(request: VerificationRequest):
    """Verify Azure CLI command execution"""
    try:
        response = await onboarding_service.verify_assignment(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/connect-tenant", response_model=ConnectTenantResponse)
async def connect_tenant(request: ConnectTenantRequest):
    """Connect to Azure tenant"""
    try:
        response = await onboarding_service.connect_tenant(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sync-status/{user_id}", response_model=ResourceSync)
async def get_sync_status(user_id: str):
    """Get resource sync status"""
    try:
        status = await onboarding_service.get_sync_status(user_id)
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/start-sync/{user_id}", response_model=ResourceSync)
async def start_sync(user_id: str):
    """Start resource sync"""
    try:
        sync = await onboarding_service.start_resource_sync(user_id)
        return sync
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/complete-step")
async def complete_step(request: CompleteStepRequest):
    """Mark a step as completed"""
    try:
        success = await onboarding_service.complete_step(request.step, request.user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/session/{user_id}", response_model=SessionResponse)
async def get_session(user_id: str):
    """Get or create user session"""
    try:
        session_data = await onboarding_service.get_or_create_session(user_id)
        requirements = await onboarding_service.get_requirements()
        
        return SessionResponse(
            session=session_data,
            requirements=requirements
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
