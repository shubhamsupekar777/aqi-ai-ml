from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.schemas.history import HistoricalFilterParams, PaginatedHistoryResponse
from backend.app.services.history_service import HistoryService
from backend.app.services.overview_service import OverviewService

router = APIRouter(tags=["AQI Data"])

@router.get("/aqi/history", response_model=PaginatedHistoryResponse)
def get_aqi_history(
    city: Optional[str] = Query(None, description="City name"),
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    min_aqi: Optional[float] = Query(None, description="Minimum AQI threshold"),
    max_aqi: Optional[float] = Query(None, description="Maximum AQI threshold"),
    search: Optional[str] = Query(None, description="Search query string"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db)
):
    params = HistoricalFilterParams(
        city=city,
        start_date=start_date,
        end_date=end_date,
        min_aqi=min_aqi,
        max_aqi=max_aqi,
        search=search,
        page=page,
        page_size=page_size
    )
    service = HistoryService(db)
    return service.get_historical_records(params)

@router.get("/aqi/latest")
def get_latest_aqi(
    city: str = Query("Delhi", description="City name"),
    db: Session = Depends(get_db)
):
    service = OverviewService(db)
    overview = service.get_overview(city=city)
    return {
        "city": city,
        "latestAqi": overview["kpis"]["currentAqi"],
        "category": overview["kpis"]["currentCategory"],
        "trend": overview["kpis"]["trend"],
        "timestamp": overview["metadata"]["timestamp"]
    }

@router.get("/pollutants/history")
def get_pollutants_history(
    city: str = Query("Delhi", description="City name"),
    db: Session = Depends(get_db)
):
    service = OverviewService(db)
    overview = service.get_overview(city=city)
    return {
        "city": city,
        "pollutants": overview["pollutantBreakdown"],
        "timestamp": overview["metadata"]["timestamp"]
    }
