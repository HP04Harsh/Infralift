"""
InfraMini Assistant Schemas
"""

from pydantic import BaseModel
from typing import Optional, Dict, Any, List


class InfraMiniChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = None
    conversation_context: Optional[Dict[str, Any]] = None


class InfraMiniChatResponse(BaseModel):
    success: bool
    response: str
    credits_used: int = 1


class UserValidationRequest(BaseModel):
    name: str


class UserValidationResponse(BaseModel):
    valid: bool
    user_id: Optional[str] = None
    message: str
    limited_access: bool = False


class ProviderStatus(BaseModel):
    name: str
    available: bool
    configured: bool
    model: Optional[str] = None


class OrchestratorStatusResponse(BaseModel):
    active_provider: str
    providers: List[ProviderStatus]


class TenantSnapshotResponse(BaseModel):
    success: bool
    snapshot: Dict[str, Any]


class RecommendationRequest(BaseModel):
    category: Optional[str] = None
    limit: int = 10


class RecommendationResponse(BaseModel):
    success: bool
    recommendations: List[Dict[str, Any]]
    total: int
    tenant_summary: Dict[str, Any]


class CreditsResponse(BaseModel):
    remaining: int
    used: int
    total: int
