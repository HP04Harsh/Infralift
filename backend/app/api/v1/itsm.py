"""ITSM API router - ServiceNow-style ticket management backed by Redis"""

import json
import os
import logging
import random
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query

from app.core.redis import session_manager
from app.schemas.itsm import (
    IncidentCreate,
    ServiceRequestCreate,
    ChangeRequestCreate,
    ProblemCreate,
    TicketUpdate,
    TicketResponse,
    TicketListResponse,
    TicketType,
    TicketStatus,
)

logger = logging.getLogger(__name__)

router = APIRouter()

TICKET_TTL = 90 * 24 * 60 * 60  # 90 days in seconds
TICKET_KEY_PREFIX = "itsm:ticket:"
TICKET_SET_KEY = "itsm:tickets"
USER_KEY_PREFIX = "itsm:user:"

TICKET_PREFIXES = {
    TicketType.INCIDENT: "INC",
    TicketType.SERVICE_REQUEST: "SR",
    TicketType.CHANGE_REQUEST: "CRQ",
    TicketType.PROBLEM: "PRB",
}


def _generate_ticket_id(ticket_type: TicketType) -> str:
    prefix = TICKET_PREFIXES[ticket_type]
    date_part = datetime.now(timezone.utc).strftime("%Y%m")
    rand_part = f"{random.randint(0, 9999):04d}"
    return f"{prefix}-{date_part}-{rand_part}"


async def _redis():
    if session_manager.redis is None:
        await session_manager.connect()
    return session_manager.redis


async def _ensure_user_lookup(user_key: str) -> dict | None:
    """Look up user data in Redis under itsm:user:<username>."""
    r = await _redis()
    raw = await r.get(f"{USER_KEY_PREFIX}{user_key}")
    if raw:
        try:
            return json.loads(raw) if isinstance(raw, str) else raw
        except (json.JSONDecodeError, TypeError):
            return None
    return None


async def _send_ticket_email(
    ticket_id: str,
    title: str,
    ticket_type: TicketType,
    assigned_to: str | None,
    description: str,
    recipient_email: str | None = None,
):
    """Send email notification for ticket creation. Gracefully degrades."""
    smtp_host = os.getenv("SMTP_HOST", "")
    if not smtp_host:
        logger.info("SMTP_HOST not set, skipping email for %s", ticket_id)
        return

    if recipient_email:
        to_addr = recipient_email
    elif assigned_to:
        user_data = await _ensure_user_lookup(assigned_to)
        to_addr = user_data.get("email") if user_data else assigned_to
    else:
        logger.info("No recipient for ticket %s, skipping email", ticket_id)
        return

    try:
        import smtplib
        from email.message import EmailMessage

        msg = EmailMessage()
        msg.set_content(
            f"New {ticket_type.value.upper()} Ticket Created\n\n"
            f"Ticket ID: {ticket_id}\n"
            f"Title: {title}\n"
            f"Description: {description}\n"
            f"Assigned To: {assigned_to or 'Unassigned'}\n\n"
            f"Please investigate and resolve at the earliest."
        )
        msg["Subject"] = f"[InfraLift] New {ticket_type.value.title()} Ticket: {title}"
        msg["From"] = os.getenv("SMTP_FROM", "noreply@infralift.com")
        msg["To"] = to_addr

        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER", "")
        smtp_pass = os.getenv("SMTP_PASS", "")

        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.starttls()
            if smtp_user:
                server.login(smtp_user, smtp_pass)
            server.send_message(msg)

        logger.info("Email sent for ticket %s to %s", ticket_id, to_addr)
    except Exception as e:
        logger.warning("Email sending failed for ticket %s: %s", ticket_id, e)


def _build_ticket_data(
    ticket_id: str,
    ticket_type: TicketType,
    req_data: dict,
    extra: dict | None = None,
) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    ticket = {
        "ticket_id": ticket_id,
        "ticket_type": ticket_type.value,
        "status": TicketStatus.OPEN.value,
        "title": req_data.get("title"),
        "description": req_data.get("description"),
        "priority": req_data.get("priority", "medium"),
        "assigned_to": req_data.get("assigned_to"),
        "submitted_by": req_data.get("submitted_by"),
        "created_at": now,
        "updated_at": now,
    }
    if extra:
        ticket.update(extra)
    return ticket


async def _store_ticket(ticket_id: str, ticket_data: dict):
    r = await _redis()
    await r.setex(
        f"{TICKET_KEY_PREFIX}{ticket_id}",
        TICKET_TTL,
        json.dumps(ticket_data),
    )
    await r.sadd(TICKET_SET_KEY, ticket_id)
    await r.expire(TICKET_SET_KEY, TICKET_TTL)


async def _get_ticket(ticket_id: str) -> dict | None:
    r = await _redis()
    raw = await r.get(f"{TICKET_KEY_PREFIX}{ticket_id}")
    if raw is None:
        return None
    return json.loads(raw) if isinstance(raw, str) else raw


async def _create_ticket(
    ticket_type: TicketType,
    req_data: dict,
    extra: dict | None = None,
) -> TicketResponse:
    ticket_id = _generate_ticket_id(ticket_type)
    ticket_data = _build_ticket_data(ticket_id, ticket_type, req_data, extra)
    await _store_ticket(ticket_id, ticket_data)

    assigned_to = req_data.get("assigned_to")
    if assigned_to:
        user_data = await _ensure_user_lookup(assigned_to)
        recipient_email = user_data.get("email") if user_data else None
    else:
        recipient_email = None

    await _send_ticket_email(
        ticket_id=ticket_id,
        title=req_data["title"],
        ticket_type=ticket_type,
        assigned_to=assigned_to,
        description=req_data.get("description", ""),
        recipient_email=recipient_email,
    )

    return TicketResponse(**ticket_data)


# ─── Endpoints ────────────────────────────────────────────────────────


@router.post("/incident", response_model=TicketResponse, status_code=201)
async def create_incident(payload: IncidentCreate):
    return await _create_ticket(
        TicketType.INCIDENT,
        payload.model_dump(),
        extra={"urgency": payload.urgency, "impact": payload.impact},
    )


@router.post("/service-request", response_model=TicketResponse, status_code=201)
async def create_service_request(payload: ServiceRequestCreate):
    return await _create_ticket(
        TicketType.SERVICE_REQUEST,
        payload.model_dump(),
        extra={
            "service_type": payload.service_type,
            "desired_completion_date": payload.desired_completion_date,
        },
    )


@router.post("/change-request", response_model=TicketResponse, status_code=201)
async def create_change_request(payload: ChangeRequestCreate):
    return await _create_ticket(
        TicketType.CHANGE_REQUEST,
        payload.model_dump(),
        extra={
            "change_type": payload.change_type,
            "risk_level": payload.risk_level,
            "implementation_plan": payload.implementation_plan,
            "rollback_plan": payload.rollback_plan,
        },
    )


@router.post("/problem", response_model=TicketResponse, status_code=201)
async def create_problem(payload: ProblemCreate):
    return await _create_ticket(
        TicketType.PROBLEM,
        payload.model_dump(),
        extra={"category": payload.category, "root_cause": payload.root_cause},
    )


@router.get("/tickets", response_model=TicketListResponse)
async def list_tickets(
    status: TicketStatus | None = Query(None, description="Filter by status"),
    ticket_type: TicketType | None = Query(None, description="Filter by ticket type"),
    assigned_to: str | None = Query(None, description="Filter by assignee"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    r = await _redis()
    ticket_ids = await r.smembers(TICKET_SET_KEY)

    tickets: list[TicketResponse] = []
    for tid in sorted(ticket_ids, reverse=True):
        raw = await r.get(f"{TICKET_KEY_PREFIX}{tid}")
        if raw is None:
            continue
        data = json.loads(raw) if isinstance(raw, str) else raw

        if status and data.get("status") != status.value:
            continue
        if ticket_type and data.get("ticket_type") != ticket_type.value:
            continue
        if assigned_to and data.get("assigned_to") != assigned_to:
            continue

        tickets.append(TicketResponse(**data))

    total = len(tickets)
    return TicketListResponse(
        tickets=tickets[offset : offset + limit],
        total=total,
    )


@router.get("/tickets/{ticket_id}", response_model=TicketResponse)
async def get_ticket(ticket_id: str):
    data = await _get_ticket(ticket_id)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")
    return TicketResponse(**data)


@router.patch("/tickets/{ticket_id}", response_model=TicketResponse)
async def update_ticket(ticket_id: str, payload: TicketUpdate):
    data = await _get_ticket(ticket_id)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")

    updated = False
    if payload.status is not None:
        data["status"] = payload.status.value
        updated = True
    if payload.assigned_to is not None:
        data["assigned_to"] = payload.assigned_to
        updated = True
    if payload.priority is not None:
        data["priority"] = payload.priority
        updated = True

    if not updated:
        raise HTTPException(status_code=400, detail="No fields to update")

    data["updated_at"] = datetime.now(timezone.utc).isoformat()

    r = await _redis()
    await r.setex(
        f"{TICKET_KEY_PREFIX}{ticket_id}",
        TICKET_TTL,
        json.dumps(data),
    )

    return TicketResponse(**data)
