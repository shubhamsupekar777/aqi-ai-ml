from typing import Generic, TypeVar, Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

T = TypeVar("T")

class ApiResponseMetadata(BaseModel):
    data_source: str = Field(default="demo", description="Origin of data: 'demo', 'database', 'ml_model', or 'sensor_api'")
    model_status: str = Field(default="not_trained", description="Status of ML model: 'not_trained', 'ready', or 'degraded'")
    model_name: Optional[str] = Field(default=None, description="Name of the model if an ML model produced the prediction")
    prediction_type: Optional[str] = Field(default="demo", description="Inference type: 'demo', 'regression_rf', etc.")
    is_demo: bool = Field(default=True, description="True if output is synthetic/demo, False if real model or measurement")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat(), description="ISO timestamp")

class StandardResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T
    metadata: ApiResponseMetadata
    message: Optional[str] = None

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int
    metadata: ApiResponseMetadata
