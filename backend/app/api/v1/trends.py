
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.schemas.trend import TrendResponse, TrendForecastRequest
from backend.app.services.trend_service import TrendService

router = APIRouter(prefix="/aqi/trends", tags=["Core Feature 3 — Trends"])


@router.get("", response_model=TrendResponse)
def get_trends(
    city: str = Query("Delhi", description="City name"),
    horizon_days: int = Query(3, ge=3, le=3, description="Fixed 3-day smoothed trend classification horizon"),
    db: Session = Depends(get_db),
):
    service = TrendService(db)
    return service.get_trends(city=city, horizon_days=horizon_days)


@router.post("/forecast", response_model=TrendResponse, status_code=status.HTTP_200_OK)
def forecast_trends(
    request: TrendForecastRequest,
    db: Session = Depends(get_db),
):
    service = TrendService(db)
    return service.get_trends(city=request.city, horizon_days=request.horizonDays or 3)

# from fastapi import APIRouter, Depends, Query, status
# from sqlalchemy.orm import Session
# from backend.app.core.database import get_db
# from backend.app.schemas.trend import TrendResponse, TrendForecastRequest
# from backend.app.services.trend_service import TrendService

# router = APIRouter(prefix="/aqi/trends", tags=["Core Feature 3 — Trends"])

# @router.get("", response_model=TrendResponse)
# def get_trends(
#     city: str = Query("Delhi", description="City name"),
#     horizon_days: int = Query(7, ge=1, le=30, description="Forecast window in days"),
#     db: Session = Depends(get_db)
# ):
#     service = TrendService(db)
#     return service.get_trends(city=city, horizon_days=horizon_days)

# @router.post("/forecast", response_model=TrendResponse, status_code=status.HTTP_200_OK)
# def forecast_trends(
#     request: TrendForecastRequest,
#     db: Session = Depends(get_db)
# ):
#     service = TrendService(db)
#     return service.get_trends(city=request.city, horizon_days=request.horizonDays or 7)
