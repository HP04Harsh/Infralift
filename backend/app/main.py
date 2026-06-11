from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.redis import session_manager
from app.services.mongodb_service import mongodb_service
from app.services.event_bus import event_bus
from app.services.servicenow_service import servicenow_service
from app.api.v1 import onboarding, auth, resources, ai, itsm, deployments, deployments_mongo, assistant, settings_ai, settings_servicenow, servicenow_tickets, auto_fix, health, intent, migration, troubleshoot, events, provisioning_agent
from app.services.auto_fix_engine import auto_fix_engine


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

app.include_router(
    ai.router,
    prefix=f"{settings.API_V1_PREFIX}/ai",
    tags=["ai"]
)

app.include_router(
    itsm.router,
    prefix=f"{settings.API_V1_PREFIX}/itsm",
    tags=["itsm"]
)

app.include_router(
    deployments.router,
    prefix=f"{settings.API_V1_PREFIX}/deployments",
    tags=["deployments"]
)

app.include_router(
    deployments_mongo.router,
    prefix=f"{settings.API_V1_PREFIX}/deployments",
    tags=["deployments-mongo"]
)

app.include_router(
    assistant.router,
    prefix=f"{settings.API_V1_PREFIX}/ai",
    tags=["assistant"]
)

app.include_router(
    settings_ai.router,
    prefix=f"{settings.API_V1_PREFIX}/settings/ai",
    tags=["settings-ai"]
)

app.include_router(
    settings_servicenow.router,
    prefix=f"{settings.API_V1_PREFIX}/settings/servicenow",
    tags=["settings-servicenow"]
)

app.include_router(
    servicenow_tickets.router,
    prefix=f"{settings.API_V1_PREFIX}/servicenow",
    tags=["servicenow-tickets"]
)

app.include_router(
    auto_fix.router,
    tags=["auto-fix"]
)

app.include_router(
    health.router,
    tags=["health"]
)

app.include_router(
    intent.router,
    prefix=f"{settings.API_V1_PREFIX}/ai",
    tags=["ai-intent"]
)

app.include_router(
    migration.router,
    prefix=f"{settings.API_V1_PREFIX}/migration",
    tags=["migration"]
)

app.include_router(
    troubleshoot.router,
    prefix=f"{settings.API_V1_PREFIX}/troubleshoot",
    tags=["troubleshoot"]
)

app.include_router(
    events.router,
    prefix=f"{settings.API_V1_PREFIX}/events",
    tags=["events"]
)

app.include_router(
    provisioning_agent.router,
    prefix=f"{settings.API_V1_PREFIX}/provisioning/agent",
    tags=["provisioning-agent"]
)


@app.on_event("startup")
async def startup_event():
    """Initialize Redis, MongoDB, and event bus subscriptions"""
    await session_manager.connect()
    try:
        await mongodb_service.connect()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"MongoDB connection failed (non-fatal): {e}")

    # Subscribe ServiceNow event handler for auto-ticket creation
    event_bus.subscribe("deployment.succeeded", servicenow_service.on_deployment_event)
    event_bus.subscribe("deployment.failed", servicenow_service.on_deployment_event)

    # Start Redis pub/sub listener for cross-process event distribution
    await event_bus.start_redis_listener()

    # Start auto-fix background scanner (every 5 minutes)
    await auto_fix_engine.start_background_scanner(interval_seconds=300)


@app.on_event("shutdown")
async def shutdown_event():
    """Close Redis and MongoDB connections on shutdown"""
    await event_bus.stop_redis_listener()
    await session_manager.disconnect()
    await mongodb_service.disconnect()


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
