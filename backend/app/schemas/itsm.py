"""ITSM Schemas for ServiceNow-style ticket management"""

from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class TicketType(str, Enum):
    INCIDENT = "incident"
    SERVICE_REQUEST = "service_request"
    CHANGE_REQUEST = "change_request"
    PROBLEM = "problem"


class TicketStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class TicketBase(BaseModel):
    title: str
    description: str
    priority: str = Field(default="medium", pattern=r"^(low|medium|high|critical)$")
    assigned_to: Optional[str] = None
    submitted_by: Optional[str] = None


class IncidentCreate(TicketBase):
    urgency: str = Field(default="medium", pattern=r"^(low|medium|high)$")
    impact: str = Field(default="medium", pattern=r"^(low|medium|high)$")


class ServiceRequestCreate(TicketBase):
    service_type: str = Field(default="general")
    desired_completion_date: Optional[str] = None


class ChangeRequestCreate(TicketBase):
    change_type: str = Field(default="standard", pattern=r"^(standard|emergency|normal)$")
    risk_level: str = Field(default="low", pattern=r"^(low|medium|high)$")
    implementation_plan: Optional[str] = None
    rollback_plan: Optional[str] = None


class ProblemCreate(TicketBase):
    category: str = Field(default="software")
    root_cause: Optional[str] = None


class TicketUpdate(BaseModel):
    status: Optional[TicketStatus] = None
    assigned_to: Optional[str] = None
    priority: Optional[str] = Field(default=None, pattern=r"^(low|medium|high|critical)$")


class TicketResponse(BaseModel):
    ticket_id: str
    ticket_type: TicketType
    status: TicketStatus
    title: str
    description: str
    priority: str
    assigned_to: Optional[str] = None
    submitted_by: Optional[str] = None
    created_at: str
    updated_at: str
    urgency: Optional[str] = None
    impact: Optional[str] = None
    service_type: Optional[str] = None
    desired_completion_date: Optional[str] = None
    change_type: Optional[str] = None
    risk_level: Optional[str] = None
    implementation_plan: Optional[str] = None
    rollback_plan: Optional[str] = None
    category: Optional[str] = None
    root_cause: Optional[str] = None


class TicketListResponse(BaseModel):
    tickets: list[TicketResponse]
    total: int
