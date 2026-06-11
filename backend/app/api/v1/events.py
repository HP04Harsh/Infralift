"""
Events API — serves activity events emitted via the Redis pub/sub event bus
"""
import json
import logging
from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.core.redis import session_manager
from app.services.event_bus import ALLOWED_EVENTS

logger = logging.getLogger(__name__)

router = APIRouter()

EVENTS_REDIS_KEY = "infralift:stored_events"
MAX_STORED_EVENTS = 200


class ActivityEventResponse(BaseModel):
    event_type: str
    data: dict
    source: str
    timestamp: float


class EventsListResponse(BaseModel):
    success: bool
    events: list[ActivityEventResponse]


@router.get("/activities", response_model=EventsListResponse)
async def get_activities(
    limit: int = Query(50, ge=1, le=200),
    event_type: Optional[str] = Query(None),
):
    """Get recent activity events. Optionally filter by event_type."""
    try:
        redis = await session_manager.redis
        if not redis:
            return EventsListResponse(success=True, events=[])

        if event_type:
            events_raw = await redis.lrange(f"{EVENTS_REDIS_KEY}:{event_type}", 0, limit - 1)
        else:
            events_raw = await redis.lrange(EVENTS_REDIS_KEY, 0, limit - 1)

        events = []
        for raw in events_raw:
            try:
                ev = json.loads(raw)
                events.append(ActivityEventResponse(
                    event_type=ev.get("event_type", "unknown"),
                    data=ev.get("data", {}),
                    source=ev.get("source", "unknown"),
                    timestamp=ev.get("timestamp", 0.0),
                ))
            except Exception:
                continue

        return EventsListResponse(success=True, events=events)
    except Exception as e:
        logger.error("Failed to get activities: %s", e)
        return EventsListResponse(success=True, events=[])


@router.get("/activities/types")
async def get_activity_types():
    """Get available event types."""
    return {"types": ALLOWED_EVENTS}


async def store_activity_event(event_type: str, data: dict):
    """Store an activity event in Redis list for dashboard consumption."""
    try:
        redis = await session_manager.redis
        if not redis:
            return
        entry = json.dumps({
            "event_type": event_type,
            "data": data,
            "source": "backend",
            "timestamp": __import__("time").time(),
        })
        pipe = redis.pipeline()
        pipe.lpush(EVENTS_REDIS_KEY, entry)
        pipe.ltrim(EVENTS_REDIS_KEY, 0, MAX_STORED_EVENTS - 1)
        await pipe.execute()
    except Exception as e:
        logger.error("Failed to store activity event: %s", e)
