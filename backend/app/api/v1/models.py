from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.schemas.model import ModelPerformanceResponse
from backend.app.services.model_service import ModelService

router = APIRouter(prefix="/models", tags=["Model Registry & Benchmarks"])

@router.get("", response_model=ModelPerformanceResponse)
def get_models(db: Session = Depends(get_db)):
    service = ModelService(db)
    return service.get_performance()

@router.get("/status")
def get_model_status(db: Session = Depends(get_db)):
    service = ModelService(db)
    perf = service.get_performance()
    return {
        "models": perf.models,
        "evaluationRecordsAvailable": perf.evaluationRecordsAvailable,
        "metadata": perf.metadata
    }

@router.get("/metrics")
def get_model_metrics(db: Session = Depends(get_db)):
    service = ModelService(db)
    perf = service.get_performance()
    return {
        "metrics": perf.metrics,
        "comparisonPoints": perf.comparisonPoints,
        "evaluationRecordsAvailable": perf.evaluationRecordsAvailable,
        "metadata": perf.metadata
    }
