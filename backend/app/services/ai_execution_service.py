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

logger = logging.getLogger(__name__)


class AIProvider(str, Enum):
    AZURE_OPENAI = "azure-openai"
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
        tenant_context: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Execute AI chat with streaming responses
        
        Args:
            message: User message
            agent_type: Type of agent (provisioning, assessment, etc.)
            user_id: User identifier
            conversation_context: Previous conversation history
            tenant_context: Azure tenant context for system prompt
            
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
            
            # Execute based on provider
            if self.provider == AIProvider.AZURE_OPENAI:
                async for chunk in self._execute_azure_openai(
                    message, system_prompt, conversation_context
                ):
                    yield chunk
            elif self.provider == AIProvider.OPENAI:
                async for chunk in self._execute_openai(
                    message, system_prompt, conversation_context
                ):
                    yield chunk
            elif self.provider == AIProvider.CLAUDE:
                async for chunk in self._execute_claude(
                    message, system_prompt, conversation_context
                ):
                    yield chunk
            elif self.provider == AIProvider.GEMINI:
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
        base_prompt = """You are Infralift AI, an enterprise Azure infrastructure automation and operations assistant.

Your role is to help users:
* provision infrastructure
* optimize cloud costs
* troubleshoot Azure resources
* assess security posture
* monitor observability metrics
* manage compliance
* automate infrastructure operations

You operate ONLY within the authenticated Azure tenant context.

Always:
* ask cross questions if information missing
* validate Azure best practices
* prioritize secure architecture
* generate Terraform for all infrastructure operations
* explain deployment impacts
* provide cost-aware recommendations
* maintain enterprise-grade operational standards

When deploying resources:
1. gather missing details
2. validate architecture
3. generate Terraform
4. summarize deployment
5. deploy only after confirmation

Always structure responses professionally.

If performing long-running actions:
stream progress updates continuously.

All Terraform artifacts must be saved to configured Azure Storage Account.

Every deployment must generate a unique Request ID."""
        
        # Agent-specific instructions
        agent_prompts = {
            "provisioning": """
You are the Provisioning Agent. Your specialty is:
* Creating Azure infrastructure resources
* Designing secure architectures
* Implementing best practices for resource deployment
* Generating production-ready Terraform configurations

Always ask for:
* region
* resource naming conventions
* environment (dev/staging/prod)
* security requirements
* high availability needs
* cost optimization preferences
""",
            "assessment": """
You are the Assessment Agent. Your specialty is:
* Analyzing existing Azure infrastructure
* Detecting security vulnerabilities
* Assessing compliance posture
* Identifying optimization opportunities
* Generating comprehensive audit reports

Focus on:
* security gaps
* cost inefficiencies
* architecture risks
* compliance violations
* performance bottlenecks
""",
            "migration": """
You are the Migration Agent. Your specialty is:
* Assessing migration readiness
* Creating migration strategies
* Estimating downtime and risks
* Planning phased migrations
* Generating migration playbooks

Consider:
* data transfer strategies
* application dependencies
* rollback plans
* testing procedures
* cut-over strategies
""",
            "observability": """
You are the Observability Agent. Your specialty is:
* Analyzing monitoring data
* Detecting anomalies and patterns
* Explaining incidents and root causes
* Suggesting alert configurations
* Optimizing monitoring strategies

Focus on:
* metrics analysis
* log interpretation
* alert correlation
* performance tuning
* capacity planning
""",
            "optimization": """
You are the Optimization Agent. Your specialty is:
* Analyzing Azure costs
* Identifying idle resources
* Suggesting rightsizing opportunities
* Calculating potential savings
* Recommending reserved instances

Provide:
* cost breakdowns
* savings calculations
* optimization recommendations
* ROI analysis
* implementation priorities
""",
            "troubleshoot": """
You are the Troubleshoot Agent. Your specialty is:
* Diagnosing Azure resource issues
* Analyzing error logs
* Identifying root causes
* Providing remediation steps
* Preventing recurrence

Method:
* systematic diagnosis
* log analysis
* dependency mapping
* impact assessment
* resolution verification
""",
            "itsm": """
You are the ITSM Agent. Your specialty is:
* Creating incident tickets
* Managing change requests
* Tracking SLA compliance
* Escalating critical issues
* Generating service reports

Ensure:
* proper categorization
* priority assignment
* SLA tracking
* stakeholder communication
* documentation completeness
""",
            "compliance": """
You are the Compliance Agent. Your specialty is:
* Scanning for policy violations
* Generating compliance reports
* Assessing regulatory adherence
* Identifying security gaps
* Recommending remediation

Cover:
* GDPR
* HIPAA
* SOC2
* ISO 27001
* Azure Policy compliance
"""
        }
        
        # Add agent-specific instructions
        agent_instruction = agent_prompts.get(agent_type, "")
        
        # Add tenant context if available
        context_info = ""
        if tenant_context:
            context_info = f"""
Tenant Context:
- Subscription ID: {tenant_context.get('subscription_id', 'N/A')}
- Tenant ID: {tenant_context.get('tenant_id', 'N/A')}
- Environment: {tenant_context.get('environment_name', 'N/A')}
- Total Resources: {tenant_context.get('total_resources', 0)}
"""
        
        return f"{base_prompt}\n{agent_instruction}\n{context_info}"
    
    async def _execute_azure_openai(
        self,
        message: str,
        system_prompt: str,
        conversation_context: Optional[Dict[str, Any]]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Execute chat using Azure OpenAI with streaming"""
        try:
            from openai import AsyncAzureOpenAI
            
            client = AsyncAzureOpenAI(
                api_key=settings.AZURE_OPENAI_KEY,
                api_version=settings.AZURE_OPENAI_API_VERSION,
                azure_endpoint=settings.AZURE_OPENAI_ENDPOINT
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
                model=settings.AZURE_OPENAI_DEPLOYMENT,
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
        """Execute chat using local LLM (placeholder for now)"""
        yield {
            "type": "status",
            "status": AIStatus.ERROR,
            "message": "Local LLM execution not yet implemented"
        }
    
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