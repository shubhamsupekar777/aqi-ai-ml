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


class TrendClassScore(BaseModel):
    direction: str
    score: float


class TrendForecastRequest(BaseModel):
    city: str
    horizonDays: Optional[int] = Field(default=3, ge=3, le=3, description="Trend classifier supports the fixed 3-day smoothed target only")


class TrendResponse(BaseModel):
    city: str
    observationDate: Optional[str] = None
    referenceAqi: float
    currentCategory: str
    trendDirection: str
    # These are null because the classifier predicts direction, not numeric AQI delta.
    delta: Optional[float] = None
    percentageChange: Optional[float] = None
    horizonDays: int
    calculationMethod: str
    explanation: str
    classScores: Optional[List[TrendClassScore]] = None
    historicalSeries: List[TrendDataPoint]
    forecastSeries: List[TrendDataPoint]
    combinedSeries: List[TrendDataPoint]
    metadata: ApiResponseMetadata



# from typing import Optional, List
# from pydantic import BaseModel, Field
# from backend.app.schemas.common import ApiResponseMetadata

# class TrendDataPoint(BaseModel):
#     date: str
#     aqi: float
#     category: Optional[str] = None
#     isForecast: bool = False
#     lowerBound: Optional[float] = None
#     upperBound: Optional[float] = None

# class TrendForecastRequest(BaseModel):
#     city: str
#     horizonDays: Optional[int] = Field(default=7, ge=1, le=30)

# class TrendResponse(BaseModel):
#     city: str
#     referenceAqi: float
#     currentCategory: str
#     trendDirection: str
#     delta: float
#     percentageChange: float
#     horizonDays: int
#     calculationMethod: str
#     explanation: str
#     historicalSeries: List[TrendDataPoint]
#     forecastSeries: List[TrendDataPoint]
#     combinedSeries: List[TrendDataPoint]
#     metadata: ApiResponseMetadata
