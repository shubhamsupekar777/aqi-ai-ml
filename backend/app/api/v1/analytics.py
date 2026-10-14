from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.schemas.analytics import AnalyticsResponse
from backend.app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/summary", response_model=AnalyticsResponse)
def get_analytics_summary(
    city: Optional[str] = Query(None, description="City name filter"),
    db: Session = Depends(get_db)
):
    service = AnalyticsService(db)
    return service.get_analytics(city=city)

@router.get("/category-distribution")
def get_category_distribution(
    city: Optional[str] = Query(None, description="City name filter"),
    db: Session = Depends(get_db)
):
    service = AnalyticsService(db)
    res = service.get_analytics(city=city)
    return {
        "summary": res.summary,
        "metadata": res.metadata
    }

@router.get("/pollutant-correlations")
def get_pollutant_correlations(
    city: Optional[str] = Query(None, description="City name filter"),
    db: Session = Depends(get_db)
):
    service = AnalyticsService(db)
    res = service.get_analytics(city=city)
    return {
        "correlationMatrix": res.correlationMatrix,
        "metadata": res.metadata
    }

@router.get("/seasonal-patterns")
def get_seasonal_patterns(
    city: Optional[str] = Query(None, description="City name filter"),
    db: Session = Depends(get_db)
):
    service = AnalyticsService(db)
    res = service.get_analytics(city=city)
    return {
        "seasonalPatterns": res.seasonalPatterns,
        "diurnalProfile": res.diurnalProfile,
        "metadata": res.metadata
    }
