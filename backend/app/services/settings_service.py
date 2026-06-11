"""
Settings Service
Manages dynamic AI provider settings stored in Redis (overrides env vars at runtime)
"""
import json
import logging
from typing import Optional, Dict, Any

from app.core.redis import session_manager
from app.core.config import settings

logger = logging.getLogger(__name__)

HF_CONFIG_KEY = "ai:huggingface:config"


class SettingsService:

    async def get_huggingface_config(self) -> Optional[Dict[str, Any]]:
        """Get HuggingFace config from Redis. Returns None if not set."""
        try:
            return await session_manager.get_session(HF_CONFIG_KEY)
        except Exception as e:
            logger.error(f"Error reading HF config from Redis: {e}")
            return None

    async def save_huggingface_config(self, config: Dict[str, Any]) -> bool:
        """Save HuggingFace config to Redis (persistent, no expiry)."""
        try:
            if not session_manager.redis:
                await session_manager.connect()
            await session_manager.redis.set(HF_CONFIG_KEY, json.dumps(config))
            return True
        except Exception as e:
            logger.error(f"Error saving HF config: {e}")
            return False

    async def clear_huggingface_config(self) -> bool:
        """Remove HuggingFace config from Redis."""
        try:
            if not session_manager.redis:
                await session_manager.connect()
            await session_manager.redis.delete(HF_CONFIG_KEY)
            return True
        except Exception as e:
            logger.error(f"Error clearing HF config: {e}")
            return False

    async def is_huggingface_configured(self) -> bool:
        """Check if HuggingFace is configured (Redis or env)."""
        config = await self.get_huggingface_config()
        if config and config.get("api_key"):
            return True
        return bool(settings.HF_API_KEY)

    async def get_effective_hf_api_key(self) -> Optional[str]:
        config = await self.get_huggingface_config()
        if config and config.get("api_key"):
            return config["api_key"]
        return settings.HF_API_KEY

    async def get_effective_hf_model(self) -> str:
        config = await self.get_huggingface_config()
        if config and config.get("model"):
            return config["model"]
        return settings.HF_MODEL

    async def get_effective_hf_endpoint(self) -> Optional[str]:
        config = await self.get_huggingface_config()
        if config and config.get("endpoint"):
            return config["endpoint"]
        return settings.HF_ENDPOINT


settings_service = SettingsService()
