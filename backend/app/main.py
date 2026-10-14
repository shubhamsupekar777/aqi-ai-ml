import sys
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

# Ensure backend root is on sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
root_dir = os.path.dirname(backend_dir)
for p in [root_dir, backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.app.core.config import settings
from backend.app.core.logging import setup_logging, logger
from backend.app.core.database import engine, Base
from backend.app.api.router import api_router
from backend.app.api.v1.health import router as root_health_router
import backend.app.models  # Register all models on Base.metadata

setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} in '{settings.APP_ENV}' environment...")
    logger.info(f"Prediction engine mode: '{settings.PREDICTION_MODE}'")
    # Initialize tables if SQLite development fallback or auto-create in dev
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database schemas verified.")
    except Exception as e:
        logger.warning(f"Could not automatically create tables: {e}")
    yield
    logger.info(f"Shutting down {settings.APP_NAME}...")

app = FastAPI(
    title="AQI AI — Environmental Intelligence API",
    description="REST API for air quality regression, multi-standard classification, trajectory trend modeling, and health risk assessment.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware
origins = settings.CORS_ORIGINS
if isinstance(origins, str):
    origins = [origins]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root unversioned health routes (e.g. GET /health, GET /health/database)
app.include_router(root_health_router)

# Versioned API routes (e.g. /api/v1/overview, /api/v1/aqi/predict, etc.)
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "docs": "/docs",
        "api_v1": settings.API_V1_PREFIX,
        "mode": settings.PREDICTION_MODE
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
