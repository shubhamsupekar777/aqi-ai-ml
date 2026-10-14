from typing import Optional, List
from pydantic import BaseModel, Field
from backend.app.schemas.common import ApiResponseMetadata

class RiskAssessmentRequest(BaseModel):
    city: Optional[str] = "Delhi"
    aqi: Optional[float] = Field(None, ge=0, le=1000)
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    no2: Optional[float] = None
    o3: Optional[float] = None

class DemographicGuideline(BaseModel):
    group: str
    exposureRisk: str
    recommendation: str

class RiskDistributionItem(BaseModel):
    level: str
    count: int
    percentage: float
    color: str

class CityRiskComparisonItem(BaseModel):
    city: str
    aqi: float
    risk: str
    color: str

class RiskAssessmentResponse(BaseModel):
    city: str
    referenceAqi: float
    category: str
    riskClassification: str
    ruleIdentifier: str
    warningTitle: str
    summary: str
    explanation: str
    generalPrecautions: List[str]
    demographicGuidelines: List[DemographicGuideline]
    riskDistribution: List[RiskDistributionItem]
    cityRiskComparison: List[CityRiskComparisonItem]
    metadata: ApiResponseMetadata
