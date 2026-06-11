"""
Redis-backed pub/sub event bus for cross-process event-driven workflows
"""
import asyncio
import json
import logging
from typing import Callable, Dict, List, Any, Coroutine, Optional

from app.core.redis import session_manager

logger = logging.getLogger(__name__)

EventType = str
EventData = Dict[str, Any]
EventHandler = Callable[[EventType, EventData], Coroutine[Any, Any, None]]

ALLOWED_EVENTS = [
    "deployment.succeeded",
    "deployment.failed",
    "sync.completed",
    "sync.failed",
    "assessment.completed",
    "ticket.created",
    "policy.remediated",
    "resource.modified",
]


class EventBus:
    """Hybrid event bus: in-process + Redis pub/sub for cross-process events."""

    def __init__(self):
        self._handlers: Dict[EventType, List[EventHandler]] = {}
        self._redis_pubsub = None
        self._listener_task: Optional[asyncio.Task] = None

    # --- In-process subscriptions ---

    def subscribe(self, event_type: str, handler: EventHandler):
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)

    def unsubscribe(self, event_type: str, handler: EventHandler):
        if event_type in self._handlers:
            self._handlers[event_type] = [h for h in self._handlers[event_type] if h != handler]

    async def publish(self, event_type: str, data: EventData):
        """Publish an event to in-process handlers, Redis pub/sub, and persisted storage."""
        if event_type not in ALLOWED_EVENTS:
            logger.debug("Ignoring non-standard event '%s' (not in ALLOWED_EVENTS)", event_type)
            return

        # Dispatch to in-process handlers
        handlers = self._handlers.get(event_type, [])
        for handler in handlers:
            asyncio.create_task(self._safe_dispatch(handler, event_type, data))

        # Publish to Redis so other processes / dashboards can listen
        try:
            redis = await session_manager.redis
            if redis:
                payload = json.dumps({"event_type": event_type, "data": data, "source": "backend", "timestamp": __import__("time").time()})
                await redis.publish("infralift:events", payload)
        except Exception as e:
            logger.error("Redis pub/sub publish failed: %s", e)

        # Persist in Redis list for dashboard activity feed
        try:
            from app.api.v1.events import store_activity_event
            asyncio.create_task(store_activity_event(event_type, data))
        except Exception:
            pass

    async def publish_and_wait(self, event_type: str, data: EventData):
        """Publish and wait for all in-process handlers to complete."""
        handlers = self._handlers.get(event_type, [])
        for handler in handlers:
            try:
                await handler(event_type, data)
            except Exception as e:
                logger.error("Handler for '%s' failed: %s", event_type, e)
        try:
            redis = await session_manager.redis
            if redis:
                payload = json.dumps({"event_type": event_type, "data": data, "source": "backend", "timestamp": __import__("time").time()})
                await redis.publish("infralift:events", payload)
        except Exception as e:
            logger.error("Redis pub/sub publish failed: %s", e)
        try:
            from app.api.v1.events import store_activity_event
            await store_activity_event(event_type, data)
        except Exception:
            pass

    async def _safe_dispatch(self, handler: EventHandler, event_type: str, data: EventData):
        try:
            await handler(event_type, data)
        except Exception as e:
            logger.error("Event handler for '%s' raised: %s", event_type, e)

    # --- Redis listener ---

    async def start_redis_listener(self):
        """Start background listener for Redis pub/sub events (cross-process)."""
        if self._listener_task and not self._listener_task.done():
            return
        self._listener_task = asyncio.create_task(self._redis_listen())

    async def _redis_listen(self):
        try:
            redis = await session_manager.redis
            if not redis:
                return
            pubsub = redis.pubsub()
            await pubsub.subscribe("infralift:events")
            logger.info("Redis event bus listener started on channel 'infralift:events'")
            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue
                try:
                    payload = json.loads(message["data"])
                    event_type = payload.get("event_type")
                    data = payload.get("data", {})
                    # Dispatch to local handlers for this event type
                    handlers = self._handlers.get(event_type, [])
                    for handler in handlers:
                        asyncio.create_task(self._safe_dispatch(handler, event_type, data))
                except Exception as e:
                    logger.error("Redis event bus message error: %s", e)
        except Exception as e:
            logger.error("Redis event bus listener error: %s", e)

    async def stop_redis_listener(self):
        if self._listener_task and not self._listener_task.done():
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass


event_bus = EventBus()
