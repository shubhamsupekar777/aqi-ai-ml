"""Response schemas for OpenAQ latest pollutant observations."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class LivePollutantObservationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    country: str
    state: Optional[str] = None
    city: str
    station: str
    station_id: str
    last_update: str
    observed_at: Optional[datetime] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    pollutant_id: str
    unit: Optional[str] = None
    value: Optional[float] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    avg_value: Optional[float] = None
    sample_count: Optional[int] = None
    aggregation: str
    source: str
    fetched_at: datetime


class LiveRefreshResponse(BaseModel):
    success: bool
    source: str
    city_filter: str
    state_filter: Optional[str] = None
    pollutant_filter: str
    latitude: float
    longitude: float
    radius_meters: int
    requested_limit: int
    locations_checked: int
    received: int
    inserted: int
    updated: int
    skipped: int
    latest_observation_at: Optional[datetime] = None
    refreshed_at: datetime
    message: str
    records: List[LivePollutantObservationOut]


class LiveObservationListResponse(BaseModel):
    source: str
    city_filter: Optional[str] = None
    pollutant_filter: Optional[str] = None
    total: int
    limit: int
    offset: int
    retrieved_at: datetime
    records: List[LivePollutantObservationOut]
