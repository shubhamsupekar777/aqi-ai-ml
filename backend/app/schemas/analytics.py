from typing import List
from pydantic import BaseModel
from backend.app.schemas.common import ApiResponseMetadata

class SummaryStats(BaseModel):
    meanAqi: float
    medianAqi: float
    minAqi: float
    maxAqi: float
    stdAqi: float
    totalRecords: int
    cleanAirDays: int
    hazardDays: int

class SeasonalPattern(BaseModel):
    season: str
    averageAqi: float
    avgPm25: float
    avgTemp: float
    dominantPollutant: str

class DiurnalPoint(BaseModel):
    hour: str
    delhi: float
    mumbai: float
    bengaluru: float
    pune: float

class CorrelationCell(BaseModel):
    x: str
    y: str
    value: float

class CitySummary(BaseModel):
    city: str
    avgAqi: float
    maxAqi: float
    minAqi: float
    dominantPollutant: str
    status: str

class AnalyticsResponse(BaseModel):
    summary: SummaryStats
    seasonalPatterns: List[SeasonalPattern]
    diurnalProfile: List[DiurnalPoint]
    correlationMatrix: List[CorrelationCell]
    citySummaries: List[CitySummary]
    metadata: ApiResponseMetadata
