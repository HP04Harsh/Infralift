"""
AI Orchestrator Service
Routes requests to the best available AI provider
"""

import logging
from typing import Dict, Any, Optional, AsyncGenerator
from enum import Enum

from app.core.config import settings
from app.services.settings_service import settings_service
from app.services.ai_execution_service import ai_execution_service, AIProvider, AIStatus

logger = logging.getLogger(__name__)


class AgentType(str, Enum):
    PROVISIONING = "provisioning"
    ASSESSMENT = "assessment"
    MIGRATION = "migration"
    OBSERVABILITY = "observability"
    OPTIMIZATION = "optimization"
    TROUBLESHOOT = "troubleshoot"
    ITSM = "itsm"
    COMPLIANCE = "compliance"
    ASSISTANT = "assistant"


class AIOrchestratorService:
    """Routes AI requests to the best available provider based on priority"""

    async def _check_azure_openai(self) -> bool:
        has_endpoint = bool(settings.AZURE_OPENAI_ENDPOINT and settings.AZURE_OPENAI_KEY)
        return has_endpoint

    async def _check_huggingface(self) -> bool:
        if settings.HF_API_KEY:
            return True
        try:
            from app.services.settings_service import settings_service
            cfg = await settings_service.get_huggingface_config()
            if cfg and cfg.get("api_key"):
                return True
        except Exception:
            pass
        return False

    async def select_provider(self, per_request_azure_creds: Optional[Dict[str, str]] = None) -> AIProvider:
        """
        Priority: 1. Azure OpenAI  2. Hugging Face (always tried as fallback)
        Never returns LOCAL — always attempt HuggingFace Gemma if Azure OpenAI unavailable.
        """
        if per_request_azure_creds or await self._check_azure_openai():
            return AIProvider.AZURE_OPENAI
        # Always try HuggingFace as automatic fallback
        return AIProvider.HUGGINGFACE

    async def execute(
        self,
        message: str,
        agent_type: str,
        user_id: str,
        conversation_context: Optional[Dict[str, Any]] = None,
        tenant_context: Optional[Dict[str, Any]] = None,
        azure_credentials: Optional[Dict[str, str]] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        provider = await self.select_provider(azure_credentials)
        provider_name = provider.value

        yield {
            "type": "status",
            "status": AIStatus.THINKING,
            "message": f"Using {provider_name}",
            "provider": provider_name,
        }

        async for chunk in ai_execution_service.execute_chat(
            message=message,
            agent_type=agent_type,
            user_id=user_id,
            conversation_context=conversation_context,
            tenant_context=tenant_context,
            azure_credentials=azure_credentials,
            provider_override=provider,
        ):
            chunk["provider"] = provider_name
            yield chunk

    async def get_provider_summary(self) -> Dict[str, Any]:
        hf_config = await settings_service.get_huggingface_config()
        return {
            "azure_openai": {
                "available": await self._check_azure_openai(),
                "configured": bool(settings.AZURE_OPENAI_ENDPOINT),
            },
            "huggingface": {
                "available": await self._check_huggingface(),
                "model": hf_config.get("model", settings.HF_MODEL) if hf_config else settings.HF_MODEL,
                "configured": await self._check_huggingface(),
                "source": hf_config.get("source", "env") if hf_config else "env",
            },
            "active_provider": (await self.select_provider()).value,
        }


ai_orchestrator = AIOrchestratorService()
