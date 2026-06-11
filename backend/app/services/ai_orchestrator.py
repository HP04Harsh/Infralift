"""
Central AI Orchestrator — single entry point for all agent AI operations.

Provider priority: Azure OpenAI → HuggingFace → Deterministic Mode
Intent detection is AI-only; keyword fallback removed.
"""
import json
import logging
from typing import Dict, Any, Optional, AsyncGenerator, List, Tuple

from app.core.config import settings
from app.core.redis import session_manager
from app.services.ai_execution_service import AIExecutionService, AIProvider, AIStatus
from app.services.event_bus import event_bus
from app.services.audit_service import audit_service

logger = logging.getLogger(__name__)


class IntentResult:
    detected: bool
    intent: str
    explanation: str
    confidence: float  # 0.0 - 1.0

    def __init__(self, detected: bool = False, intent: str = "", explanation: str = "", confidence: float = 0.0):
        self.detected = detected
        self.intent = intent
        self.explanation = explanation
        self.confidence = confidence


class AIOrchestrator:
    """Central orchestrator for all agent AI operations."""

    def __init__(self):
        self.executor = AIExecutionService()
        self.active_sessions: Dict[str, Dict[str, Any]] = {}

    async def detect_intent(
        self,
        user_input: str,
        agent_type: str = "assistant",
        user_id: str = "default",
        azure_credentials: Optional[Dict[str, str]] = None,
    ) -> IntentResult:
        """
        Detect user intent using AI only. No keyword/pattern fallback.
        Returns structured intent or 'unclear' with explanation.
        """
        detect_prompt = f"""Classify the following user request into ONE of these intents:

Intents:
- provisioning: User wants to create, deploy, provision, or set up Azure resources
- assessment: User wants to analyze, assess, audit, or evaluate their Azure environment
- migration: User wants to migrate resources to Azure or between environments
- troubleshooting: User reports an issue, error, or problem to diagnose
- optimization: User wants to reduce costs, improve performance, or optimize resources
- compliance: User asks about policies, regulations, or compliance posture
- itsm: User wants to create or manage a service/IT ticket
- general: General conversation, greetings, questions about the platform
- unclear: Cannot determine intent with confidence

User request: "{user_input}"

Respond with ONLY a JSON object, no other text:
{{"intent": "<intent>", "confidence": <0.0-1.0>, "explanation": "<why this classification>"}}
If confidence < 0.6, set intent to "unclear".
"""

        try:
            response_text = ""
            async for chunk in self.executor.execute_chat(
                message=detect_prompt,
                agent_type="assistant",
                user_id=user_id,
                azure_credentials=azure_credentials,
            ):
                if chunk.get("type") == "content":
                    response_text += chunk.get("content", "")

            if response_text:
                result = self._extract_json(response_text)
                if result and "intent" in result:
                    conf = float(result.get("confidence", 0.5))
                    intent = result["intent"]
                    if conf < 0.6:
                        return IntentResult(detected=False, intent="unclear", explanation=result.get("explanation", "Low confidence"), confidence=conf)
                    return IntentResult(detected=True, intent=intent, explanation=result.get("explanation", ""), confidence=conf)
        except Exception as e:
            logger.error("AI intent detection failed: %s", e)

        return IntentResult(detected=False, intent="unclear", explanation="AI intent detection failed", confidence=0.0)

    async def detect_resource_type(
        self,
        user_input: str,
        user_id: str = "default",
        azure_credentials: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Detect Azure resource type from user input. AI-only.
        Returns: {"detected": bool, "resource_type": str or "", "explanation": str}
        """
        detect_prompt = f"""What Azure resource type does this user want to provision?

Valid resource types:
Resource Group, Virtual Machine, Storage Account, Virtual Network, Subnet, NSG, Public IP,
SQL Database, App Service, AKS Cluster, Key Vault, Load Balancer, Recovery Vault

User request: "{user_input}"

If the request maps to one of these types, respond with the exact type string.
If unsure or the request is not about provisioning, respond with empty string.

Respond with ONLY a JSON object:
{{"detected": true/false, "resource_type": "<type or ''>", "explanation": "<brief explanation>"}}
"""

        try:
            response_text = ""
            async for chunk in self.executor.execute_chat(
                message=detect_prompt,
                agent_type="provisioning",
                user_id=user_id,
                azure_credentials=azure_credentials,
            ):
                if chunk.get("type") == "content":
                    response_text += chunk.get("content", "")

            if response_text:
                result = self._extract_json(response_text)
                if result:
                    return result
        except Exception:
            pass

        return {"detected": False, "resource_type": "", "explanation": "AI intent detection failed"}

    async def generate_structured_response(
        self,
        prompt: str,
        agent_type: str,
        user_id: str = "default",
        conversation_context: Optional[Dict[str, Any]] = None,
        tenant_context: Optional[Dict[str, Any]] = None,
        azure_credentials: Optional[Dict[str, str]] = None,
        output_schema: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Generate a structured (JSON) response from the AI.
        Used for provisioning plans, assessment results, migration plans, etc.
        """
        schema_instruction = ""
        if output_schema:
            schema_instruction = f"\nRespond ONLY with a valid JSON object conforming to this schema:\n{json.dumps(output_schema, indent=2)}\n"

        full_prompt = prompt + schema_instruction

        response_text = ""
        async for chunk in self.executor.execute_chat(
            message=full_prompt,
            agent_type=agent_type,
            user_id=user_id,
            conversation_context=conversation_context,
            tenant_context=tenant_context,
            azure_credentials=azure_credentials,
        ):
            if chunk.get("type") == "content":
                response_text += chunk.get("content", "")

        result = self._extract_json(response_text) if response_text else None

        return {
            "success": bool(result),
            "raw_response": response_text,
            "structured": result or {},
        }

    async def generate_text_response(
        self,
        prompt: str,
        agent_type: str,
        user_id: str = "default",
        conversation_context: Optional[Dict[str, Any]] = None,
        tenant_context: Optional[Dict[str, Any]] = None,
        azure_credentials: Optional[Dict[str, str]] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Generate a text (chat) response, streaming chunks."""
        async for chunk in self.executor.execute_chat(
            message=prompt,
            agent_type=agent_type,
            user_id=user_id,
            conversation_context=conversation_context,
            tenant_context=tenant_context,
            azure_credentials=azure_credentials,
        ):
            yield chunk

    async def run_with_events(
        self,
        message: str,
        agent_type: str,
        user_id: str = "default",
        conversation_context: Optional[Dict[str, Any]] = None,
        tenant_context: Optional[Dict[str, Any]] = None,
        azure_credentials: Optional[Dict[str, str]] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Run AI operation and emit activity events to event bus."""
        yield {"type": "status", "status": "thinking", "message": "Processing your request..."}

        full_response = ""
        async for chunk in self.executor.execute_chat(
            message=message,
            agent_type=agent_type,
            user_id=user_id,
            conversation_context=conversation_context,
            tenant_context=tenant_context,
            azure_credentials=azure_credentials,
        ):
            if chunk.get("type") == "content":
                full_response += chunk.get("content", "")
                yield chunk
            elif chunk.get("type") == "status":
                yield chunk

        # Emit assessment/deplyoment events based on agent type
        if agent_type in ("assessment", "provisioning", "migration") and user_id != "default":
            try:
                await event_bus.publish(f"{agent_type}.completed", {
                    "user_id": user_id,
                    "agent_type": agent_type,
                    "response_length": len(full_response),
                })
            except Exception as e:
                logger.error("Event emission failed: %s", e)

        yield {"type": "result", "data": {"response_length": len(full_response)}}

    async def record_audit(self, user_id: str, agent_type: str, prompt: str, response: str):
        """Record AI operation in the audit log."""
        try:
            redis = await session_manager.redis
            if redis:
                audit_service.redis_client = redis
                await audit_service.record_action({
                    "user": user_id,
                    "agentType": agent_type,
                    "prompt": prompt[:500],
                    "aiPlan": response[:500],
                    "deploymentStatus": "completed",
                    "metadata": {"response_length": len(response)},
                })
        except Exception as e:
            logger.error("Audit record failed: %s", e)

    def _extract_json(self, text: str) -> Optional[Dict[str, Any]]:
        """Extract JSON object from AI response text."""
        try:
            # Try direct parse
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        try:
            # Try extracting from code fence
            if "```json" in text:
                start = text.index("```json") + 7
                end = text.index("```", start) if "```" in text[start:] else len(text)
                return json.loads(text[start:end].strip())
            if "```" in text:
                start = text.index("```") + 3
                end = text.index("```", start) if "```" in text[start:] else len(text)
                return json.loads(text[start:end].strip())
        except (json.JSONDecodeError, ValueError):
            pass
        try:
            # Try finding first { ... }
            start = text.index("{")
            depth = 0
            for i in range(start, len(text)):
                if text[i] == "{":
                    depth += 1
                elif text[i] == "}":
                    depth -= 1
                    if depth == 0:
                        return json.loads(text[start:i + 1])
        except (json.JSONDecodeError, ValueError, IndexError):
            pass
        return None


orchestrator = AIOrchestrator()
