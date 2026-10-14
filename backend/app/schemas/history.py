from typing import Optional, List
from pydantic import BaseModel, Field
from backend.app.schemas.common import ApiResponseMetadata

class HistoricalFilterParams(BaseModel):
    city: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    min_aqi: Optional[float] = None
    max_aqi: Optional[float] = None
    search: Optional[str] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=10, ge=1, le=100)

class HistoricalRecordSchema(BaseModel):
    id: str
    city: str
    date: str
    aqi: float
    category: str
    originalCategory: Optional[str] = None
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    no2: Optional[float] = None
    so2: Optional[float] = None
    co: Optional[float] = None
    o3: Optional[float] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    windSpeed: Optional[float] = None
    dataSource: Optional[str] = None

class PaginatedHistoryResponse(BaseModel):
    items: List[HistoricalRecordSchema]
    total: int
    page: int
    pageSize: int
    totalPages: int
    metadata: ApiResponseMetadata
