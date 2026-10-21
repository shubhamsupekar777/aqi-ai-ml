from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.schemas.live_aqi import LiveObservationListResponse, LiveRefreshResponse
from backend.app.services.live_aqi_service import LiveAQIService

router = APIRouter(prefix="/live-aqi", tags=["Live AQI observations"])


@router.post("/refresh", response_model=LiveRefreshResponse)
def refresh_live_observations(
    limit: int = Query(10, ge=1, le=10, description="Upstream API test currently limited to 10 records"),
    offset: int = Query(0, ge=0, description="Offset in the data.gov.in resource"),
    db: Session = Depends(get_db),
):
    """Fetch up to 10 source rows and idempotently store their pollutant readings."""
    return LiveAQIService(db).refresh(limit=limit, offset=offset)


@router.get("/observations", response_model=LiveObservationListResponse)
def get_live_observations(
    city: str | None = Query(None, description="Optional exact city name filter"),
    pollutant_id: str | None = Query(None, description="Optional pollutant code, e.g. PM2.5 or PM10"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Read previously fetched live pollutant records from the database."""
    return LiveAQIService(db).list_observations(
        city=city,
        pollutant_id=pollutant_id,
        limit=limit,
        offset=offset,
    )
