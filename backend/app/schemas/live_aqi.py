from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class LivePollutantObservationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    country: str
    state: Optional[str] = None
    city: str
    station: str
    last_update: str
    observed_at: Optional[datetime] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    pollutant_id: str
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    avg_value: Optional[float] = None
    source: str
    fetched_at: datetime


class LiveRefreshResponse(BaseModel):
    success: bool
    source: str
    requested_limit: int
    offset: int
    received: int
    inserted: int
    updated: int
    skipped: int
    total_available: Optional[int] = None
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
