from typing import Optional, List, Dict
from pydantic import BaseModel, Field
from backend.app.schemas.common import ApiResponseMetadata

class AdvancedFeaturesInput(BaseModel):
    pm25: Optional[float] = Field(None, ge=0, le=1000, description="PM2.5 concentration in µg/m³")
    pm10: Optional[float] = Field(None, ge=0, le=1500, description="PM10 concentration in µg/m³")
    no2: Optional[float] = Field(None, ge=0, le=500, description="NO2 concentration in µg/m³")
    so2: Optional[float] = Field(None, ge=0, le=500, description="SO2 concentration in µg/m³")
    co: Optional[float] = Field(None, ge=0, le=100, description="CO concentration in mg/m³")
    o3: Optional[float] = Field(None, ge=0, le=500, description="O3 concentration in µg/m³")
    temperature: Optional[float] = Field(None, ge=-20, le=60, description="Ambient temperature in °C")
    humidity: Optional[float] = Field(None, ge=0, le=100, description="Relative humidity in %")
    wind_speed: Optional[float] = Field(None, ge=0, le=150, description="Wind speed in km/h")
    rainfall: Optional[float] = Field(None, ge=0, le=500, description="Rainfall in mm")

class PredictionRequest(BaseModel):
    city: str = Field(..., description="Target metropolitan or sensor region name")
    horizon: str = Field(default="next_day", description="'next_day', 'next_3_days', or 'next_7_days'")
    mode: str = Field(default="automatic", description="'automatic' or 'advanced'")
    features: Optional[AdvancedFeaturesInput] = None

class ConfidenceInterval(BaseModel):
    lower: float
    upper: float

class FeatureDriver(BaseModel):
    feature: str
    weight: float
    impact: str = "positive"

class ForecastSeriesPoint(BaseModel):
    date: str
    predictedAqi: float
    category: str
    confidenceLower: Optional[float] = None
    confidenceUpper: Optional[float] = None
    isForecast: bool = True

class PredictionResponse(BaseModel):
    city: str
    referenceAqi: float
    predictedAqi: float
    category: str
    trend: str
    riskLevel: str
    horizon: str
    predictionTimestamp: str
    confidenceInterval: Optional[ConfidenceInterval] = None
    featureDrivers: Optional[List[FeatureDriver]] = None
    forecastSeries: List[ForecastSeriesPoint]
    explanation: str
    metadata: ApiResponseMetadata
