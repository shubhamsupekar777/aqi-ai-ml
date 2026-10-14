from typing import Optional, List
from pydantic import BaseModel, Field
from backend.app.schemas.common import ApiResponseMetadata

class TrendDataPoint(BaseModel):
    date: str
    aqi: float
    category: Optional[str] = None
    isForecast: bool = False
    lowerBound: Optional[float] = None
    upperBound: Optional[float] = None

class TrendForecastRequest(BaseModel):
    city: str
    horizonDays: Optional[int] = Field(default=7, ge=1, le=30)

class TrendResponse(BaseModel):
    city: str
    referenceAqi: float
    currentCategory: str
    trendDirection: str
    delta: float
    percentageChange: float
    horizonDays: int
    calculationMethod: str
    explanation: str
    historicalSeries: List[TrendDataPoint]
    forecastSeries: List[TrendDataPoint]
    combinedSeries: List[TrendDataPoint]
    metadata: ApiResponseMetadata
