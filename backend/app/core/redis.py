import redis.asyncio as redis
from typing import Optional, Dict, Any
import json
from datetime import timedelta
from app.core.config import settings


class RedisSessionManager:
    """Redis session manager for onboarding sessions"""
    
    def __init__(self):
        self.redis: Optional[redis.Redis] = None
    
    async def connect(self):
        """Connect to Redis"""
        self.redis = await redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            password=settings.REDIS_PASSWORD,
            decode_responses=True,
        )
        return self.redis
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self.redis:
            await self.redis.close()
    
    async def set_session(self, session_id: str, data: Dict[str, Any]) -> bool:
        """Store session data in Redis"""
        try:
            if not self.redis:
                await self.connect()
            
            serialized_data = json.dumps(data)
            await self.redis.setex(
                session_id,
                timedelta(seconds=settings.REDIS_SESSION_TTL),
                serialized_data
            )
            return True
        except Exception as e:
            print(f"Error setting session: {e}")
            return False
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve session data from Redis"""
        try:
            if not self.redis:
                await self.connect()
            
            data = await self.redis.get(session_id)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            print(f"Error getting session: {e}")
            return None
    
    async def delete_session(self, session_id: str) -> bool:
        """Delete session from Redis"""
        try:
            if not self.redis:
                await self.connect()
            
            await self.redis.delete(session_id)
            return True
        except Exception as e:
            print(f"Error deleting session: {e}")
            return False
    
    async def update_session(self, session_id: str, updates: Dict[str, Any]) -> bool:
        """Update session data in Redis"""
        try:
            existing_data = await self.get_session(session_id)
            if existing_data:
                existing_data.update(updates)
                return await self.set_session(session_id, existing_data)
            return False
        except Exception as e:
            print(f"Error updating session: {e}")
            return False
    
    async def check_session(self, session_id: str) -> bool:
        """Check if session exists"""
        try:
            if not self.redis:
                await self.connect()
            
            return await self.redis.exists(session_id) > 0
        except Exception as e:
            print(f"Error checking session: {e}")
            return False


# Global instance
session_manager = RedisSessionManager()
