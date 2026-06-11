from pydantic import BaseModel, Field
from typing import Any, Optional, Dict, List
from datetime import datetime
from enum import Enum


class VerificationStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class RequirementStatus(str, Enum):
    COMPLETED = "completed"
    WARNING = "warning"
    PENDING = "pending"


class SyncStatus(str, Enum):
    PENDING = "pending"
    SYNCING = "syncing"
    COMPLETED = "completed"
    FAILED = "failed"


class VerificationRequest(BaseModel):
    step_id: str = Field(..., description="Step identifier")
    card_id: str = Field(..., description="Card identifier")
    command: str = Field(..., description="Azure CLI command")
    user_id: str = Field(..., description="User identifier")


class VerificationResponse(BaseModel):
    success: bool
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class TenantConnection(BaseModel):
    tenant_id: str
    subscription_id: str
    display_name: str = ""
    state: str = ""
    environment_name: str = ""
    validated: bool = False
    providers: Optional[Dict[str, Any]] = None


class Resource(BaseModel):
    id: str
    name: str
    type: str
    location: str
    status: str


class ResourceSync(BaseModel):
    total_resources: int = 0
    synced_resources: int = 0
    failed_resources: int = 0
    progress: float = 0.0
    status: SyncStatus = SyncStatus.PENDING
    resources: List[Resource] = []
    current_step: Optional[str] = None
    resource_summary: Optional[Dict[str, int]] = None
    message: Optional[str] = None
    error: Optional[str] = None
    synced_at: Optional[str] = None


class Requirement(BaseModel):
    id: str
    name: str
    status: RequirementStatus
    description: str


class OnboardingSession(BaseModel):
    user_id: str
    current_step: int = 1
    completed_steps: List[int] = []
    completed_cards: Dict[str, bool] = {}
    verified_cards: Dict[str, bool] = {}
    progress: float = 0.0
    tenant_id: Optional[str] = None
    subscription_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class CompleteStepRequest(BaseModel):
    step: int
    user_id: str


class ConnectTenantRequest(BaseModel):
    client_id: str
    client_secret: str
    tenant_id: str
    subscription_id: str
    environment_name: str
    user_id: str


class ConnectTenantResponse(BaseModel):
    success: bool
    message: str
    connection: Optional[TenantConnection] = None


class SessionResponse(BaseModel):
    session: OnboardingSession
    requirements: List[Requirement]
