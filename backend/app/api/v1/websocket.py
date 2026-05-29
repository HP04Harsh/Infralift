"""
WebSocket API for real-time AI streaming
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.services.ai_execution_service import ai_execution_service
from app.core.redis import redis_client
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    """Manage WebSocket connections for AI streaming"""
    
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, chat_id: str):
        await websocket.accept()
        self.active_connections[chat_id] = websocket
        logger.info(f"WebSocket connected: {chat_id}")
    
    def disconnect(self, chat_id: str):
        if chat_id in self.active_connections:
            del self.active_connections[chat_id]
            logger.info(f"WebSocket disconnected: {chat_id}")
    
    async def send_message(self, chat_id: str, message: dict):
        if chat_id in self.active_connections:
            await self.active_connections[chat_id].send_json(message)


manager = ConnectionManager()


@router.websocket("/ws/chat/{chat_id}")
async def websocket_chat(websocket: WebSocket, chat_id: str):
    """WebSocket endpoint for AI chat streaming"""
    await manager.connect(websocket, chat_id)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            
            message = data.get("message", "")
            agent_type = data.get("agent_type", "provisioning")
            user_id = data.get("user_id", "unknown")
            conversation_context = data.get("conversation_context")
            tenant_context = data.get("tenant_context")
            
            # Execute AI chat with streaming
            async for chunk in ai_execution_service.execute_chat(
                message=message,
                agent_type=agent_type,
                user_id=user_id,
                conversation_context=conversation_context,
                tenant_context=tenant_context
            ):
                await manager.send_message(chat_id, chunk)
            
            # Save chat to Redis
            full_response = ""
            async for chunk in ai_execution_service.execute_chat(
                message=message,
                agent_type=agent_type,
                user_id=user_id,
                conversation_context=conversation_context,
                tenant_context=tenant_context
            ):
                if chunk.get("type") == "content":
                    full_response += chunk.get("content", "")
            
            await ai_execution_service.save_chat_to_redis(
                chat_id=chat_id,
                user_id=user_id,
                agent_type=agent_type,
                message=message,
                response=full_response,
                redis_client=redis_client
            )
            
    except WebSocketDisconnect:
        manager.disconnect(chat_id)
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        await manager.send_message(chat_id, {
            "type": "error",
            "message": str(e)
        })
        manager.disconnect(chat_id)