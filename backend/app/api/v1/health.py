from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.app.core.database import get_db
from backend.app.core.config import settings

router = APIRouter(tags=["Health"])

@router.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "prediction_mode": settings.PREDICTION_MODE,
        "database_connected": True
    }

@router.get("/health/database", status_code=status.HTTP_200_OK)
def database_health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "connected",
            "dialect": db.bind.dialect.name if db.bind else "unknown"
        }
    except Exception as e:
        return {
            "status": "degraded",
            "database": "disconnected",
            "error": str(e)
        }
