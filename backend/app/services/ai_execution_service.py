"""
AI Chat Execution Service
Handles real AI chat execution with streaming support for multiple providers
"""

import logging
import json
import asyncio
from typing import Dict, Any, Optional, AsyncGenerator
from datetime import datetime
from enum import Enum

from app.core.config import settings
from app.services.settings_service import settings_service
from app.services.hf_utils import get_hf_url_with_fallback

logger = logging.getLogger(__name__)


class AIProvider(str, Enum):
    AZURE_OPENAI = "azure-openai"
    HUGGINGFACE = "huggingface"
    OPENAI = "openai"
    CLAUDE = "claude"
    GEMINI = "gemini"
    LOCAL = "local"


class AIStatus(str, Enum):
    THINKING = "thinking"
    GENERATING = "generating"
    COMPLETED = "completed"
    ERROR = "error"


class AIExecutionService:
    """Service for AI chat execution with streaming support"""
    
    def __init__(self):
        self.provider = settings.AI_PROVIDER
        self.active_chats = {}
    
    async def execute_chat(
        self,
        message: str,
        agent_type: str,
        user_id: str,
        conversation_context: Optional[Dict[str, Any]] = None,
        tenant_context: Optional[Dict[str, Any]] = None,
        azure_credentials: Optional[Dict[str, str]] = None,
        provider_override: Optional[AIProvider] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Execute AI chat with streaming responses
        
        Args:
            message: User message
            agent_type: Type of agent
            user_id: User identifier
            conversation_context: Previous conversation history
            tenant_context: Azure tenant context for system prompt
            azure_credentials: Per-request Azure OpenAI credentials override
            
        Yields:
            Dict with streaming updates
        """
        chat_id = f"{user_id}_{agent_type}_{datetime.utcnow().timestamp()}"
        
        try:
            # Initialize chat status
            yield {
                "type": "status",
                "status": AIStatus.THINKING,
                "message": "Analyzing your request...",
                "chat_id": chat_id
            }
            
            # Build system prompt with tenant context
            system_prompt = await self._build_system_prompt(agent_type, tenant_context)
            
            # Data integrity guard: inject exact real numbers so AI never fabricates
            if tenant_context:
                rs = tenant_context.get('resource_summary', {})
                cd = tenant_context.get('cost_data', {})
                res_count = tenant_context.get('total_resources', 0)
                vm_count = rs.get('virtual_machines', 0)
                monthly_cost = cd.get('month_to_date', 0)
                currency = cd.get('currency', 'USD')
                system_prompt += f"""
[DATA INTEGRITY]
Reference these exact numbers. Do not round or estimate.
Total Resources: {res_count} | VM Count: {vm_count} | Monthly Cost: {currency}{monthly_cost} | Currency: {currency}

If ALL numbers are 0, say: "Your Azure tenant is empty. No resources found."
If only some are 0, report them as-is.
Plain text only. No markdown. No emojis. Under 100 words.
"""
            else:
                system_prompt += """
[DATA INTEGRITY]
No Azure tenant data is available.
If asked about tenant resources, costs, or inventory, say:
"Your Azure tenant is not connected or has not been synced. Please complete onboarding first."
Answer general Azure/InfraLift questions only. Never invent tenant-specific numbers.
Plain text only. No markdown. No emojis.
"""
            
            # Determine provider: use override, per-request credentials, or settings default
            provider = provider_override or self.provider
            if azure_credentials and azure_credentials.get("azure_endpoint") and azure_credentials.get("azure_key"):
                provider = AIProvider.AZURE_OPENAI
            
            # 3-tier fallback chain: Azure OpenAI -> HuggingFace -> Local LLM
            if provider == AIProvider.AZURE_OPENAI:
                succeeded = False
                async for chunk in self._execute_azure_openai(
                    message, system_prompt, conversation_context, azure_credentials
                ):
                    if chunk.get("type") == "error":
                        logger.warning("Azure OpenAI failed: %s", chunk.get("message", ""))
                        yield {"type": "status", "status": AIStatus.THINKING, "message": "Azure OpenAI unavailable, falling back to Gemma..."}
                        break
                    succeeded = True
                    yield chunk
                if not succeeded:
                    async for chunk in self._execute_huggingface(message, system_prompt, conversation_context):
                        if chunk.get("type") == "error":
                            logger.warning("HuggingFace failed: %s", chunk.get("message", ""))
                            yield {"type": "status", "status": AIStatus.THINKING, "message": "HuggingFace unavailable, falling back to local LLM..."}
                            break
                        succeeded = True
                        yield chunk
                if not succeeded:
                    async for chunk in self._execute_local(message, system_prompt, conversation_context):
                        if chunk.get("type") == "error":
                            yield {"type": "error", "status": AIStatus.ERROR, "message": "AI providers unavailable — configure Azure OpenAI, HuggingFace, or a local LLM."}
                            break
                        succeeded = True
                        yield chunk
            elif provider == AIProvider.HUGGINGFACE:
                async for chunk in self._execute_huggingface(
                    message, system_prompt, conversation_context
                ):
                    yield chunk
            elif provider == AIProvider.OPENAI:
                async for chunk in self._execute_openai(
                    message, system_prompt, conversation_context
                ):
                    yield chunk
            elif provider == AIProvider.CLAUDE:
                async for chunk in self._execute_claude(
                    message, system_prompt, conversation_context
                ):
                    yield chunk
            elif provider == AIProvider.GEMINI:
                async for chunk in self._execute_gemini(
                    message, system_prompt, conversation_context
                ):
                    yield chunk
            else:
                async for chunk in self._execute_local(
                    message, system_prompt, conversation_context
                ):
                    yield chunk
            
            # Final completion status
            yield {
                "type": "status",
                "status": AIStatus.COMPLETED,
                "message": "Response completed",
                "chat_id": chat_id
            }
            
        except Exception as e:
            logger.error(f"AI execution failed: {str(e)}")
            yield {
                "type": "error",
                "status": AIStatus.ERROR,
                "message": f"An error occurred: {str(e)}",
                "chat_id": chat_id
            }
    
    async def _build_system_prompt(
        self,
        agent_type: str,
        tenant_context: Optional[Dict[str, Any]]
    ) -> str:
        """Build system prompt with tenant context and agent-specific instructions"""
        
        # Base system prompt
        base_prompt = """You are InfraMini, an Azure infrastructure assistant.

RULES:
- NEVER fabricate tenant data. Use ONLY the Tenant Context below.
- If total_resources = 0, say: "No data available — tenant has no resources."
- Use the exact currency symbol from Tenant Context.
- Report 0 as 0. Never say "limited" or "minimal".
- Keep responses under 100 words. No essays.

FORMATTING:
- Write in plain text only. No markdown, no **bold**, no headings like ####, no bullet symbols.
- Use line breaks for sections, not markers.
- Never use emojis or warning icons.
- Write conversationally, like a professional chat message.

EXAMPLE:
Your tenant has 3 resource groups and 12 resources. No VMs found. Monthly spend is $0. No recommendations.

Your role: help with Azure operations using ONLY the real data below."""
        
        # Agent-specific instructions
        agent_prompts = {
            "assistant": """
InfraMini (assistant). Answer questions conversationally about the user's Azure tenant. 
Use only the Tenant Context data below. If asked specific questions like "how many VMs" or "what is my spend", 
reference the exact numbers. If data is 0 or unavailable, state that clearly.
No markdown. No emojis. Plain text only. Keep responses short and professional.
""",
            "provisioning": """
Provisioning Agent. Detect resource type from user intent, collect missing fields, generate deployment plan.
Valid types: Resource Group, Virtual Machine, Storage Account, Virtual Network, AKS Cluster, SQL Database, App Service, Subnet, NSG, Public IP, Key Vault, Load Balancer, Recovery Vault.
Return JSON for detect/plan intents. NEVER default to any type. If unsure, return {"resourceType": ""} and missing fields.
If the user intent is unclear or not about provisioning, return {"resourceType": "", "explanation": "I could not determine what you want to deploy."}.
CRITICAL: Only return "Resource Group" if the user explicitly asks for a resource group. NEVER assume.
""",
            "assessment": """
Assessment Agent. Only evaluate resources in Tenant Context. If VM Count = 0, say: "No VMs — assessment N/A."
No fabricated findings.
""",
            "migration": """
Migration Agent. Guide users through Azure migration for 6 types: SQL, VM, App, Storage, Database, Hybrid.
Collect missing details (source config, target region, resource group, credentials). Generate a migration plan.
Never fabricate readiness scores. If no tenant data, ask user to connect and sync their Azure tenant first.
Supported types with required fields:
- sql: source_server, source_database, target_server_name, target_region, admin_user, admin_password
- vm: source_name, source_os, source_cpu, source_ram, target_name, target_region, target_vm_size, resource_group
- app: app_name, runtime_stack, target_region, resource_group, sku
- storage: storage_name, target_region, resource_group, redundancy
- database: source_db_type, source_db_name, target_server_name, target_region, admin_user, admin_password
- hybrid: vnet_name, vnet_cidr, gateway_subnet_cidr, target_region, resource_group, on_prem_cidr
Return a plan with: migration_type, required_fields, target_details.
Be concise. Ask clear questions to collect missing details one at a time.
""",
            "observability": """
Observability Agent. Only reference metrics from Tenant Context. If none, state that.
""",
            "optimization": """
Optimization Agent. Use ONLY real cost data from Tenant Context. If monthly spend = 0, say: "Current spend: {currency}0. Potential savings: {currency}0."
Never fabricate savings.
""",
            "troubleshoot": """
Troubleshoot Agent. Analyze only issues the user describes. No invented problems.
""",
            "itsm": """
ITSM Agent. Create tickets only from actual user-provided information.
""",
            "compliance": """
Compliance Agent. Only report compliance data from Tenant Context. No fake 100% scores.
If no data: "No compliance assessment available."
"""
        }
        
        # Add agent-specific instructions
        agent_instruction = agent_prompts.get(agent_type, "")
        
        # Add tenant context if available
        context_info = ""
        if tenant_context:
            rs = tenant_context.get('resource_summary', {})
            cd = tenant_context.get('cost_data', {})
            sf = tenant_context.get('security_findings', {})
            res_count = tenant_context.get('total_resources', 0)
            vm_count = rs.get('virtual_machines', 0)
            monthly_cost = cd.get('month_to_date', 0)
            currency = cd.get('currency', 'USD')
            rg_count = rs.get('resource_groups', 0)
            context_info = f"""
TENANT CONTEXT (exact real data only):
Subscriptions: 1  |  Resource Groups: {rg_count}  |  Total Resources: {res_count}  |  VMs: {vm_count}  |  Monthly Spend: {currency}{monthly_cost}
- Resource Summary: {rs}
- Currency: {currency}
"""
        else:
            context_info = """
TENANT CONTEXT: None. No tenant is connected.
"""
        
        return f"{base_prompt}\n{agent_instruction}\n{context_info}"
    
    async def _execute_azure_openai(
        self,
        message: str,
        system_prompt: str,
        conversation_context: Optional[Dict[str, Any]],
        azure_credentials: Optional[Dict[str, str]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Execute chat using Azure OpenAI with streaming"""
        try:
            from openai import AsyncAzureOpenAI
            
            # Use per-request credentials if provided, otherwise fall back to env vars
            api_key = azure_credentials.get("azure_key") if azure_credentials else settings.AZURE_OPENAI_KEY
            api_version = azure_credentials.get("azure_api_version") if azure_credentials else settings.AZURE_OPENAI_API_VERSION
            azure_endpoint = azure_credentials.get("azure_endpoint") if azure_credentials else settings.AZURE_OPENAI_ENDPOINT
            deployment = azure_credentials.get("azure_deployment") if azure_credentials else settings.AZURE_OPENAI_DEPLOYMENT
            
            if not api_key or not azure_endpoint:
                yield {"type": "error", "status": AIStatus.ERROR, "message": "Azure OpenAI credentials not configured. Go to Settings > Agents to configure."}
                return
            
            client = AsyncAzureOpenAI(
                api_key=api_key,
                api_version=api_version or "2024-02-15-preview",
                azure_endpoint=azure_endpoint
            )
            
            # Build messages
            messages = [{"role": "system", "content": system_prompt}]
            
            # Add conversation history
            if conversation_context and "history" in conversation_context:
                messages.extend(conversation_context["history"])
            
            # Add current message
            messages.append({"role": "user", "content": message})
            
            yield {
                "type": "status",
                "status": AIStatus.GENERATING,
                "message": "Generating response..."
            }
            
            # Stream response
            stream = await client.chat.completions.create(
                model=deployment or settings.AZURE_OPENAI_DEPLOYMENT,
                messages=messages,
                stream=True,
                temperature=0.7,
                max_tokens=2000
            )
            
            full_response = ""
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_response += content
                    yield {
                        "type": "content",
                        "content": content,
                        "full_response": full_response
                    }
            
        except ImportError:
            logger.error("OpenAI package not installed")
            yield {
                "type": "error",
                "status": AIStatus.ERROR,
                "message": "OpenAI package not installed"
            }
        except Exception as e:
            logger.error(f"Azure OpenAI execution failed: {str(e)}")
            yield {
                "type": "error",
                "status": AIStatus.ERROR,
                "message": f"Azure OpenAI execution failed: {str(e)}"
            }
    
    async def _execute_huggingface(
        self,
        message: str,
        system_prompt: str,
        conversation_context: Optional[Dict[str, Any]]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Execute chat using Hugging Face Inference API with Gemma 3"""
        try:
            import httpx
            import asyncio

            api_key = await settings_service.get_effective_hf_api_key()
            model = await settings_service.get_effective_hf_model()
            endpoint = await settings_service.get_effective_hf_endpoint()

            if not api_key and not endpoint:
                yield {
                    "type": "content",
                    "content": "⚠️ **AI provider not configured.**\n\nTo enable AI features, configure one of:\n• **Azure OpenAI** — Go to Settings → AI Provider\n• **HuggingFace** — Set `HF_API_KEY` in your environment\n\nOnce configured, I can help with provisioning, assessments, compliance, and more.",
                    "full_response": "⚠️ **AI provider not configured.**\n\nTo enable AI features, configure one of:\n• **Azure OpenAI** — Go to Settings → AI Provider\n• **HuggingFace** — Set `HF_API_KEY` in your environment\n\nOnce configured, I can help with provisioning, assessments, compliance, and more.",
                }
                return

            yield {
                "type": "status",
                "status": AIStatus.GENERATING,
                "message": f"Generating response with {model.split('/')[-1]}..."
            }

            # Build messages payload
            messages = [{"role": "system", "content": system_prompt}]
            if conversation_context and "history" in conversation_context:
                messages.extend(conversation_context["history"])
            messages.append({"role": "user", "content": message})

            # Resolve a working URL with fallback
            url = await get_hf_url_with_fallback(api_key, model, endpoint)
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
            payload = {
                "model": model,
                "messages": messages,
                "max_tokens": 2000,
                "temperature": 0.7,
                "stream": True,
            }

            full_response = ""
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream("POST", url, json=payload, headers=headers) as resp:
                    if resp.status_code != 200:
                        error_body = await resp.aread()
                        yield {
                            "type": "error",
                            "status": AIStatus.ERROR,
                            "message": f"Hugging Face API error ({resp.status_code}): {error_body.decode()[:300]}"
                        }
                        return
                    async for line in resp.aiter_lines():
                        if line.startswith("data: "):
                            data_str = line[6:].strip()
                            if data_str and data_str != "[DONE]":
                                try:
                                    import json as _json
                                    chunk = _json.loads(data_str)
                                    delta = chunk.get("choices", [{}])[0].get("delta", {})
                                    content = delta.get("content", "")
                                    if content:
                                        full_response += content
                                        yield {"type": "content", "content": content, "full_response": full_response}
                                except Exception:
                                    pass

            if not full_response:
                yield {"type": "error", "status": AIStatus.ERROR, "message": "Hugging Face returned empty response"}

        except ImportError:
            yield {"type": "error", "status": AIStatus.ERROR, "message": "httpx package not installed. Run: pip install httpx"}
        except Exception as e:
            logger.error(f"Hugging Face execution failed: {str(e)}")
            yield {"type": "error", "status": AIStatus.ERROR, "message": f"Hugging Face execution failed: {str(e)}"}

    async def _execute_openai(
        self,
        message: str,
        system_prompt: str,
        conversation_context: Optional[Dict[str, Any]]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Execute chat using OpenAI with streaming"""
        try:
            from openai import AsyncOpenAI
            
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            
            messages = [{"role": "system", "content": system_prompt}]
            
            if conversation_context and "history" in conversation_context:
                messages.extend(conversation_context["history"])
            
            messages.append({"role": "user", "content": message})
            
            yield {
                "type": "status",
                "status": AIStatus.GENERATING,
                "message": "Generating response..."
            }
            
            stream = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=messages,
                stream=True,
                temperature=0.7,
                max_tokens=2000
            )
            
            full_response = ""
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_response += content
                    yield {
                        "type": "content",
                        "content": content,
                        "full_response": full_response
                    }
            
        except Exception as e:
            logger.error(f"OpenAI execution failed: {str(e)}")
            yield {
                "type": "error",
                "status": AIStatus.ERROR,
                "message": f"OpenAI execution failed: {str(e)}"
            }
    
    async def _execute_claude(
        self,
        message: str,
        system_prompt: str,
        conversation_context: Optional[Dict[str, Any]]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Execute chat using Claude with streaming"""
        try:
            import anthropic
            
            client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            
            messages = []
            
            if conversation_context and "history" in conversation_context:
                messages.extend(conversation_context["history"])
            
            messages.append({"role": "user", "content": message})
            
            yield {
                "type": "status",
                "status": AIStatus.GENERATING,
                "message": "Generating response..."
            }
            
            stream = await client.messages.create(
                model=settings.ANTHROPIC_MODEL,
                max_tokens=2000,
                system=system_prompt,
                messages=messages,
                stream=True
            )
            
            full_response = ""
            async for chunk in stream:
                if chunk.type == "content_block_delta":
                    content = chunk.delta.text
                    full_response += content
                    yield {
                        "type": "content",
                        "content": content,
                        "full_response": full_response
                    }
            
        except Exception as e:
            logger.error(f"Claude execution failed: {str(e)}")
            yield {
                "type": "error",
                "status": AIStatus.ERROR,
                "message": f"Claude execution failed: {str(e)}"
            }
    
    async def _execute_gemini(
        self,
        message: str,
        system_prompt: str,
        conversation_context: Optional[Dict[str, Any]]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Execute chat using Gemini with streaming"""
        try:
            import google.generativeai as genai
            
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(settings.GEMINI_MODEL, system_instruction=system_prompt)
            
            yield {
                "type": "status",
                "status": AIStatus.GENERATING,
                "message": "Generating response..."
            }
            
            chat = model.start_chat(history=conversation_context.get("history", []) if conversation_context else [])
            response = chat.send_message(message, stream=True)
            
            full_response = ""
            for chunk in response:
                content = chunk.text
                full_response += content
                yield {
                    "type": "content",
                    "content": content,
                    "full_response": full_response
                }
            
        except Exception as e:
            logger.error(f"Gemini execution failed: {str(e)}")
            yield {
                "type": "error",
                "status": AIStatus.ERROR,
                "message": f"Gemini execution failed: {str(e)}"
            }
    
    async def _execute_local(
        self,
        message: str,
        system_prompt: str,
        conversation_context: Optional[Dict[str, Any]]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Execute chat using local LLM (Ollama / LM Studio / any OpenAI-compatible endpoint)"""
        endpoint = settings.LOCAL_LLM_ENDPOINT
        model = settings.LOCAL_LLM_MODEL
        if not endpoint:
            yield {"type": "error", "status": AIStatus.ERROR, "message": "Local LLM endpoint not configured. Set LOCAL_LLM_ENDPOINT in .env"}
            return

        try:
            import httpx

            url = f"{endpoint.rstrip('/')}/v1/chat/completions"
            messages = [{"role": "system", "content": system_prompt}]
            if conversation_context and "history" in conversation_context:
                messages.extend(conversation_context["history"])
            messages.append({"role": "user", "content": message})

            yield {"type": "status", "status": AIStatus.GENERATING, "message": f"Generating response with local model {model}..."}

            payload = {
                "model": model,
                "messages": messages,
                "max_tokens": 2000,
                "temperature": 0.7,
                "stream": True,
            }

            full_response = ""
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream("POST", url, json=payload) as resp:
                    if resp.status_code != 200:
                        error_body = await resp.aread()
                        yield {"type": "error", "status": AIStatus.ERROR, "message": f"Local LLM error ({resp.status_code}): {error_body.decode()[:300]}"}
                        return
                    async for line in resp.aiter_lines():
                        if line.startswith("data: "):
                            data_str = line[6:].strip()
                            if data_str and data_str != "[DONE]":
                                try:
                                    import json as _json
                                    chunk = _json.loads(data_str)
                                    delta = chunk.get("choices", [{}])[0].get("delta", {})
                                    content = delta.get("content", "")
                                    if content:
                                        full_response += content
                                        yield {"type": "content", "content": content, "full_response": full_response}
                                except Exception:
                                    pass

            if not full_response:
                yield {"type": "error", "status": AIStatus.ERROR, "message": "Local LLM returned empty response"}

        except ImportError:
            yield {"type": "error", "status": AIStatus.ERROR, "message": "httpx package not installed. Run: pip install httpx"}
        except Exception as e:
            logger.error(f"Local LLM execution failed: {str(e)}")
            yield {"type": "error", "status": AIStatus.ERROR, "message": f"Local LLM execution failed: {str(e)}"}
    
    async def save_chat_to_redis(
        self,
        chat_id: str,
        user_id: str,
        agent_type: str,
        message: str,
        response: str,
        redis_client
    ):
        """Save chat conversation to Redis"""
        try:
            chat_key = f"chat:{user_id}:{agent_type}"
            chat_data = {
                "chat_id": chat_id,
                "user_id": user_id,
                "agent_type": agent_type,
                "message": message,
                "response": response,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Add to chat history list
            await redis_client.lpush(chat_key, json.dumps(chat_data))
            # Keep only last 50 messages
            await redis_client.ltrim(chat_key, 0, 49)
            # Set expiry to 7 days
            await redis_client.expire(chat_key, 604800)
            
        except Exception as e:
            logger.error(f"Failed to save chat to Redis: {str(e)}")
    
    async def get_chat_history(
        self,
        user_id: str,
        agent_type: str,
        redis_client
    ) -> list:
        """Retrieve chat history from Redis"""
        try:
            chat_key = f"chat:{user_id}:{agent_type}"
            chats = await redis_client.lrange(chat_key, 0, -1)
            return [json.loads(chat) for chat in chats]
        except Exception as e:
            logger.error(f"Failed to get chat history: {str(e)}")
            return []


ai_execution_service = AIExecutionService()