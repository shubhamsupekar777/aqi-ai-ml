
from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from backend.app.schemas.common import ApiResponseMetadata


class AdvancedFeaturesInput(BaseModel):
    """
    Optional feature overrides from Advanced Mode.

    Missing fields must be supplied by database-derived feature building
    in PredictionService. Do not substitute arbitrary defaults silently.
    """

    # Current AQI and pollutant observations
    aqi: Optional[float] = Field(default=None, ge=0, le=2049)

    pm25: Optional[float] = Field(default=None, ge=0, le=1000)
    pm10: Optional[float] = Field(default=None, ge=0, le=1500)
    no: Optional[float] = Field(default=None, ge=0, le=1000)
    no2: Optional[float] = Field(default=None, ge=0, le=500)
    nox: Optional[float] = Field(default=None, ge=0, le=1000)
    nh3: Optional[float] = Field(default=None, ge=0, le=500)
    co: Optional[float] = Field(default=None, ge=0, le=100)
    so2: Optional[float] = Field(default=None, ge=0, le=500)
    o3: Optional[float] = Field(default=None, ge=0, le=500)
    benzene: Optional[float] = Field(default=None, ge=0)
    toluene: Optional[float] = Field(default=None, ge=0)
    xylene: Optional[float] = Field(default=None, ge=0)

    # Weather observations
    temperature: Optional[float] = Field(default=None, ge=-20, le=60)
    humidity: Optional[float] = Field(default=None, ge=0, le=100)
    wind_speed: Optional[float] = Field(default=None, ge=0, le=150)
    wind_direction: Optional[float] = Field(default=None, ge=0, le=360)
    rainfall: Optional[float] = Field(default=None, ge=0, le=500)
    surface_pressure: Optional[float] = Field(default=None, ge=800, le=1100)

    # Historical AQI features
    aqi_lag_1d: Optional[float] = Field(default=None, ge=0)
    aqi_lag_3d: Optional[float] = Field(default=None, ge=0)
    aqi_lag_7d: Optional[float] = Field(default=None, ge=0)
    aqi_rolling_mean_7d: Optional[float] = Field(default=None, ge=0)

    # Location and calendar features
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    day_of_week: Optional[int] = Field(default=None, ge=0, le=6)
    month: Optional[int] = Field(default=None, ge=1, le=12)
    season: Optional[str] = None


class PredictionRequest(BaseModel):
    city: str = Field(
        ...,
        min_length=1,
        description="City name matching a city in the database",
    )

    horizon: Literal[
        "next_day",
        "next_3_days",
        "next_7_days",
    ] = "next_day"

    mode: Literal["automatic", "advanced"] = "automatic"

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


# from typing import Optional, List, Dict
# from pydantic import BaseModel, Field
# from backend.app.schemas.common import ApiResponseMetadata

# # class AdvancedFeaturesInput(BaseModel):
# #     pm25: Optional[float] = Field(None, ge=0, le=1000, description="PM2.5 concentration in µg/m³")
# #     pm10: Optional[float] = Field(None, ge=0, le=1500, description="PM10 concentration in µg/m³")
# #     no2: Optional[float] = Field(None, ge=0, le=500, description="NO2 concentration in µg/m³")
# #     so2: Optional[float] = Field(None, ge=0, le=500, description="SO2 concentration in µg/m³")
# #     co: Optional[float] = Field(None, ge=0, le=100, description="CO concentration in mg/m³")
# #     o3: Optional[float] = Field(None, ge=0, le=500, description="O3 concentration in µg/m³")
# #     temperature: Optional[float] = Field(None, ge=-20, le=60, description="Ambient temperature in °C")
# #     humidity: Optional[float] = Field(None, ge=0, le=100, description="Relative humidity in %")
# #     wind_speed: Optional[float] = Field(None, ge=0, le=150, description="Wind speed in km/h")
# #     rainfall: Optional[float] = Field(None, ge=0, le=500, description="Rainfall in mm")


# class AdvancedFeaturesInput(BaseModel):
#     # Current AQI and pollutant measurements
#     aqi: float = Field(..., ge=0, le=2049)
#     pm25: float = Field(..., ge=0, le=1000)
#     pm10: float = Field(..., ge=0, le=1500)
#     no: float = Field(..., ge=0, le=1000)
#     no2: float = Field(..., ge=0, le=500)
#     nox: float = Field(..., ge=0, le=1000)
#     nh3: float = Field(..., ge=0, le=500)
#     co: float = Field(..., ge=0, le=100)
#     so2: float = Field(..., ge=0, le=500)
#     o3: float = Field(..., ge=0, le=500)
#     benzene: float = Field(..., ge=0)
#     toluene: float = Field(..., ge=0)
#     xylene: float = Field(..., ge=0)

#     # Weather observations
#     temperature: float = Field(..., ge=-20, le=60)
#     humidity: float = Field(..., ge=0, le=100)
#     wind_speed: float = Field(..., ge=0, le=150)
#     wind_direction: float = Field(..., ge=0, le=360)
#     rainfall: float = Field(..., ge=0, le=500)
#     surface_pressure: float = Field(..., ge=800, le=1100)

#     # Historical features
#     aqi_lag_1d: float = Field(..., ge=0)
#     aqi_lag_3d: float = Field(..., ge=0)
#     aqi_lag_7d: float = Field(..., ge=0)
#     aqi_rolling_mean_7d: float = Field(..., ge=0)

#     # Calendar and location features
#     latitude: float = Field(..., ge=-90, le=90)
#     longitude: float = Field(..., ge=-180, le=180)
#     day_of_week: int = Field(..., ge=0, le=6)
#     month: int = Field(..., ge=1, le=12)
#     season: str


# class PredictionRequest(BaseModel):
#     city: str = Field(..., description="Target metropolitan or sensor region name")
#     horizon: str = Field(default="next_day", description="'next_day', 'next_3_days', or 'next_7_days'")
#     mode: str = Field(default="automatic", description="'automatic' or 'advanced'")
#     features: Optional[AdvancedFeaturesInput] = None

# class ConfidenceInterval(BaseModel):
#     lower: float
#     upper: float

# class FeatureDriver(BaseModel):
#     feature: str
#     weight: float
#     impact: str = "positive"

# class ForecastSeriesPoint(BaseModel):
#     date: str
#     predictedAqi: float
#     category: str
#     confidenceLower: Optional[float] = None
#     confidenceUpper: Optional[float] = None
#     isForecast: bool = True

# class PredictionResponse(BaseModel):
#     city: str
#     referenceAqi: float
#     predictedAqi: float
#     category: str
#     trend: str
#     riskLevel: str
#     horizon: str
#     predictionTimestamp: str
#     confidenceInterval: Optional[ConfidenceInterval] = None
#     featureDrivers: Optional[List[FeatureDriver]] = None
#     forecastSeries: List[ForecastSeriesPoint]
#     explanation: str
#     metadata: ApiResponseMetadata
