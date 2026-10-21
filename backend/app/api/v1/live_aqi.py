# from datetime import date
# from typing import Literal, Optional

# from fastapi import APIRouter, Depends, Query
# from sqlalchemy.orm import Session

# from backend.app.core.database import get_db
# from backend.app.schemas.live_aqi import LiveObservationListResponse, LiveRefreshResponse
# from backend.app.services.live_aqi_service import LiveAQIService

# router = APIRouter(prefix="/live-aqi", tags=["XKDR Air Quality Observations"])


# @router.post("/refresh", response_model=LiveRefreshResponse)
# def refresh_live_observations(
#     limit: int = Query(10, ge=1, le=1000, description="Maximum rows requested from XKDR; start with 10 while validating"),
#     city: str = Query("Delhi", min_length=1, description="City filter, exact match (for example Delhi or Mumbai)"),
#     state: Optional[str] = Query(None, description="Optional state filter"),
#     station: Optional[str] = Query(None, description="Optional station_id filter, e.g. site_103"),
#     parameter: str = Query("PM2.5", min_length=1, description="Pollutant parameter such as PM2.5, PM10, NO2, SO2, CO, Ozone"),
#     start: Optional[date] = Query(None, description="Start date inclusive (YYYY-MM-DD); omit start and end to use the latest published month"),
#     end: Optional[date] = Query(None, description="End date inclusive (YYYY-MM-DD); omit start and end to use the latest published month"),
#     aggregation: Literal["raw", "hourly", "daily", "monthly"] = Query("raw", alias="agg", description="raw for individual readings, or hourly/daily/monthly aggregation"),
#     db: Session = Depends(get_db),
# ):
#     """Fetch XKDR pollutant measurements and idempotently store them.

#     If no dates are supplied, the service queries the latest month reported by
#     the provider's metadata. This source is a published archive, not guaranteed
#     up-to-the-minute data.
#     """
#     return LiveAQIService(db).refresh(
#         limit=limit,
#         city=city,
#         state=state,
#         station=station,
#         parameter=parameter,
#         start=start,
#         end=end,
#         aggregation=aggregation,
#     )


# @router.get("/observations", response_model=LiveObservationListResponse)
# def get_live_observations(
#     city: Optional[str] = Query(None, description="Optional exact city filter"),
#     pollutant_id: Optional[str] = Query(None, description="Optional pollutant code, e.g. PM2.5 or PM10"),
#     start: Optional[date] = Query(None, description="Optional observation start date, inclusive"),
#     end: Optional[date] = Query(None, description="Optional observation end date, inclusive"),
#     limit: int = Query(20, ge=1, le=1000),
#     offset: int = Query(0, ge=0, description="Offset for paging through stored observations"),
#     db: Session = Depends(get_db),
# ):
#     """Read previously fetched XKDR measurements from the database."""
#     return LiveAQIService(db).list_observations(
#         city=city,
#         pollutant_id=pollutant_id,
#         start=start,
#         end=end,
#         limit=limit,
#         offset=offset,
#     )

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.schemas.live_aqi import LiveObservationListResponse, LiveRefreshResponse
from backend.app.services.live_aqi_service import LiveAQIService

router = APIRouter(prefix="/live-aqi", tags=["OpenAQ latest pollutant observations"])


@router.post("/refresh", response_model=LiveRefreshResponse)
def refresh_live_observations(
    limit: int = Query(10, ge=1, le=100, description="Maximum stored latest measurements to fetch"),
    city: str = Query("Delhi", min_length=1, description="City name, e.g. Pune or Delhi"),
    state: Optional[str] = Query(None, description="Optional state label stored with these observations"),
    parameter: str = Query("PM2.5", min_length=1, description="Pollutant name, e.g. PM2.5, PM10, NO2, SO2, CO, O3"),
    latitude: Optional[float] = Query(None, ge=-90, le=90, description="Optional city latitude; if omitted, backend city coordinates are used"),
    longitude: Optional[float] = Query(None, ge=-180, le=180, description="Optional city longitude; if omitted, backend city coordinates are used"),
    radius_meters: int = Query(25000, ge=1, le=25000, description="Search radius around the city coordinates; OpenAQ maximum is 25 km"),
    db: Session = Depends(get_db),
):
    """Fetch latest source-series measurements from nearby OpenAQ monitoring locations."""
    return LiveAQIService(db).refresh(
        limit=limit,
        city=city,
        state=state,
        parameter=parameter,
        latitude=latitude,
        longitude=longitude,
        radius_meters=radius_meters,
    )


@router.get("/observations", response_model=LiveObservationListResponse)
def get_live_observations(
    city: Optional[str] = Query(None, description="Optional exact city label filter"),
    pollutant_id: Optional[str] = Query(None, description="Optional pollutant code, e.g. PM2.5 or PM10"),
    start: Optional[date] = Query(None, description="Optional observed date start, inclusive (YYYY-MM-DD)"),
    end: Optional[date] = Query(None, description="Optional observed date end, inclusive (YYYY-MM-DD)"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Read OpenAQ latest measurements already stored in the database."""
    return LiveAQIService(db).list_observations(
        city=city,
        pollutant_id=pollutant_id,
        start=start,
        end=end,
        limit=limit,
        offset=offset,
    )

