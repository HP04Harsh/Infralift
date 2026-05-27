from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""
    
    # API Settings
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Infralift"
    VERSION: str = "1.1.0"
    DEBUG: bool = False
    
    # Redis Settings
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None
    REDIS_SESSION_TTL: int = 86400  # 24 hours in seconds
    
    # CORS Settings
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001"]
    
    # Azure Settings (for future use)
    AZURE_CLIENT_ID: Optional[str] = None
    AZURE_CLIENT_SECRET: Optional[str] = None
    AZURE_TENANT_ID: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
