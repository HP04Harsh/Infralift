from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""
    
    # API Settings
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Infralift"
    VERSION: str = "1.8.0"
    DEBUG: bool = False
    
    # Redis Settings
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None
    REDIS_SESSION_TTL: int = 86400  # 24 hours in seconds
    
    # CORS Settings
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001"]
    
    # Azure Authentication Settings
    AZURE_CLIENT_ID: Optional[str] = None
    AZURE_CLIENT_SECRET: Optional[str] = None
    AZURE_TENANT_ID: Optional[str] = None
    AZURE_SUBSCRIPTION_ID: Optional[str] = None
    
    # Azure OpenAI Settings
    AZURE_OPENAI_ENDPOINT: Optional[str] = None
    AZURE_OPENAI_KEY: Optional[str] = None
    AZURE_OPENAI_DEPLOYMENT: Optional[str] = None
    AZURE_OPENAI_API_VERSION: str = "2024-02-15-preview"
    
    # Azure Storage Settings
    STORAGE_CONNECTION_STRING: Optional[str] = None
    STORAGE_CONTAINER_NAME: str = "terraform-artifacts"
    
    # AI Provider Settings
    AI_PROVIDER: str = "azure-openai"  # azure-openai, openai, claude, gemini, local, huggingface
    
    # Hugging Face Settings
    HF_API_KEY: Optional[str] = None
    HF_MODEL: str = "google/gemma-3-12b-it"
    HF_ENDPOINT: Optional[str] = None
    
    # OpenAI Settings (if using direct OpenAI)
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4"
    
    # Anthropic Settings (if using Claude)
    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_MODEL: str = "claude-3-opus-20240229"
    
    # Gemini Settings (if using Google)
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-pro"
    
    # Local LLM Settings (if using local)
    LOCAL_LLM_ENDPOINT: Optional[str] = None
    LOCAL_LLM_MODEL: str = "llama2"
    
    # Terraform Settings
    TERRAFORM_VERSION: str = "1.5.0"
    TERRAFORM_STATE_BACKEND: str = "azurerm"
    
    # MongoDB Settings
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "infralift"

    # ServiceNow Settings
    SERVICENOW_INSTANCE_URL: Optional[str] = None
    SERVICENOW_USERNAME: Optional[str] = None
    SERVICENOW_PASSWORD: Optional[str] = None
    SERVICENOW_API_TOKEN: Optional[str] = None
    SERVICENOW_ASSIGNMENT_GROUP: Optional[str] = None

    # WebSocket Settings
    WS_HEARTBEAT_INTERVAL: int = 30

    # Default billing currency (overrides automatic detection when set)
    DEFAULT_BILLING_CURRENCY: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
