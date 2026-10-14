from typing import Optional, List
from pydantic import BaseModel
from backend.app.schemas.common import ApiResponseMetadata

class ModelRegistrySchema(BaseModel):
    id: str
    name: str
    version: str
    taskType: str
    algorithm: str
    framework: str
    status: str
    isTrained: bool
    artifactPath: Optional[str] = None
    description: str
    lastTrained: Optional[str] = None

class ModelMetricSchema(BaseModel):
    modelName: str
    algorithm: str
    taskType: str
    mae: Optional[float] = None
    rmse: Optional[float] = None
    r2: Optional[float] = None
    accuracy: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1: Optional[float] = None
    evaluationRecordsAvailable: bool
    isDemoEstimate: bool

class ModelComparisonPoint(BaseModel):
    date: str
    actual: float
    rfPred: float
    xgbPred: float
    lgbmPred: float
    ensemblePred: float

class ModelPerformanceResponse(BaseModel):
    models: List[ModelRegistrySchema]
    metrics: List[ModelMetricSchema]
    comparisonPoints: List[ModelComparisonPoint]
    evaluationRecordsAvailable: bool
    metadata: ApiResponseMetadata
