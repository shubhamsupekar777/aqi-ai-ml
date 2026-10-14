from typing import Optional, List, Dict
from pydantic import BaseModel, Field
from backend.app.schemas.common import ApiResponseMetadata

class ClassificationRequest(BaseModel):
    aqi: float = Field(..., ge=0, le=1000, description="Numerical AQI value to classify")
    city: Optional[str] = Field(default=None, description="Optional target city name")
    scheme: Optional[str] = Field(default="US_EPA", description="'US_EPA' or 'INDIA_CPCB'")

class CategoryProbability(BaseModel):
    category: str
    probability: float

class CategoryDistributionItem(BaseModel):
    category: str
    count: int
    percentage: float
    color: str

class ClassificationHistoryItem(BaseModel):
    id: str
    timestamp: str
    aqi: float
    category: str
    city: str

class ClassificationResponse(BaseModel):
    aqi: float
    category: str
    schemeIdentifier: str
    explanation: str
    healthStatement: str
    cautionaryStatement: str
    color: str
    probabilities: Optional[List[CategoryProbability]] = None
    history: Optional[List[ClassificationHistoryItem]] = None
    categoryDistribution: List[CategoryDistributionItem]
    metadata: ApiResponseMetadata
