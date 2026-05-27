from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.redis import session_manager
from app.api.v1 import onboarding, auth, resources


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Azure Infrastructure Automation Platform API",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(
    onboarding.router,
    prefix=f"{settings.API_V1_PREFIX}/onboarding",
    tags=["onboarding"]
)

app.include_router(
    auth.router,
    prefix=f"{settings.API_V1_PREFIX}/auth",
    tags=["auth"]
)

app.include_router(
    resources.router,
    prefix=f"{settings.API_V1_PREFIX}/resources",
    tags=["resources"]
)


@app.on_event("startup")
async def startup_event():
    """Initialize Redis connection on startup"""
    await session_manager.connect()


@app.on_event("shutdown")
async def shutdown_event():
    """Close Redis connection on shutdown"""
    await session_manager.disconnect()


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Infralift API",
        "version": settings.VERSION,
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": settings.VERSION
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
